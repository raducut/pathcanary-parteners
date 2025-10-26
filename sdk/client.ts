/**
 * PathCanary Partner SDK
 * For Feature Flag providers integrating with PathCanary Assisted Rollback
 *
 * @version 1.0.0
 * @license MIT
 */

export interface PathCanaryRollbackRequest {
  flag_key: string
  enabled: boolean
  incident_id: string
  incident_message: string
  source: 'pathcanary'
  metadata?: {
    organization_id?: string
    funnel_id?: string
    severity?: 'critical' | 'high' | 'medium' | 'low'
    timestamp?: string
  }
}

export interface PathCanaryRollbackResponse {
  success: boolean
  flag_key: string
  previous_state: boolean
  new_state: boolean
  error?: string
  provider_metadata?: Record<string, any>
}

export interface PartnerSDKConfig {
  webhookUrl: string
  apiKey: string
  timeout?: number
  retryAttempts?: number
  debug?: boolean
}

/**
 * PathCanary Partner SDK Client
 * Use this to test and validate your integration with PathCanary
 */
export class PathCanaryPartnerClient {
  private config: Required<PartnerSDKConfig>

  constructor(config: PartnerSDKConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      debug: false,
      ...config
    }
  }

  /**
   * Test feature flag toggle endpoint
   * This simulates what PathCanary will send when a rollback is triggered
   */
  async testToggleFlag(request: PathCanaryRollbackRequest): Promise<PathCanaryRollbackResponse> {
    const startTime = Date.now()

    try {
      if (this.config.debug) {
        console.log('[PathCanary SDK] Sending request:', JSON.stringify(request, null, 2))
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'PathCanary-Partner-SDK/1.0.0',
          'X-PathCanary-Request-ID': this.generateRequestId()
        },
        body: JSON.stringify(request),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data: PathCanaryRollbackResponse = await response.json()

      // Validate response structure
      this.validateResponse(data)

      if (this.config.debug) {
        console.log(`[PathCanary SDK] Response received (${responseTime}ms):`, JSON.stringify(data, null, 2))
      }

      return data

    } catch (error: any) {
      if (this.config.debug) {
        console.error('[PathCanary SDK] Error:', error.message)
      }

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`)
      }

      throw error
    }
  }

  /**
   * Test feature flag toggle with automatic retry
   */
  async testToggleFlagWithRetry(request: PathCanaryRollbackRequest): Promise<PathCanaryRollbackResponse> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        if (this.config.debug && attempt > 1) {
          console.log(`[PathCanary SDK] Retry attempt ${attempt}/${this.config.retryAttempts}`)
        }

        return await this.testToggleFlag(request)
      } catch (error: any) {
        lastError = error

        if (attempt < this.config.retryAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Exponential backoff
          if (this.config.debug) {
            console.log(`[PathCanary SDK] Waiting ${delay}ms before retry...`)
          }
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw new Error(`Failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`)
  }

  /**
   * Validate that your endpoint returns the correct response format
   */
  validateResponse(response: any): void {
    const required = ['success', 'flag_key', 'previous_state', 'new_state']
    const missing = required.filter(field => !(field in response))

    if (missing.length > 0) {
      throw new Error(`Invalid response: missing required fields: ${missing.join(', ')}`)
    }

    if (typeof response.success !== 'boolean') {
      throw new Error('Invalid response: "success" must be a boolean')
    }

    if (typeof response.flag_key !== 'string') {
      throw new Error('Invalid response: "flag_key" must be a string')
    }

    if (typeof response.previous_state !== 'boolean') {
      throw new Error('Invalid response: "previous_state" must be a boolean')
    }

    if (typeof response.new_state !== 'boolean') {
      throw new Error('Invalid response: "new_state" must be a boolean')
    }

    if (response.error && typeof response.error !== 'string') {
      throw new Error('Invalid response: "error" must be a string')
    }
  }

  /**
   * Generate unique request ID for tracing
   */
  private generateRequestId(): string {
    return `pc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Run a comprehensive integration test
   */
  async runIntegrationTest(flagKey: string): Promise<{
    success: boolean
    results: Array<{
      test: string
      passed: boolean
      duration: number
      error?: string
    }>
  }> {
    const results: Array<{ test: string; passed: boolean; duration: number; error?: string }> = []

    // Test 1: Toggle flag OFF (typical rollback scenario)
    await this.runTest(results, 'Toggle flag OFF', async () => {
      const response = await this.testToggleFlag({
        flag_key: flagKey,
        enabled: false,
        incident_id: 'test-incident-123',
        incident_message: 'Integration test - disable flag',
        source: 'pathcanary'
      })

      if (response.new_state !== false) {
        throw new Error(`Expected new_state to be false, got ${response.new_state}`)
      }
    })

    // Test 2: Verify error handling
    await this.runTest(results, 'Error handling for invalid flag', async () => {
      try {
        await this.testToggleFlag({
          flag_key: 'invalid-flag-that-does-not-exist-xyz',
          enabled: false,
          incident_id: 'test-incident-456',
          incident_message: 'Integration test - error case',
          source: 'pathcanary'
        })
        throw new Error('Should have thrown an error for invalid flag')
      } catch (error: any) {
        // Expected error
        if (error.message.includes('Should have thrown')) {
          throw error
        }
        // Good - error was handled
      }
    })

    // Test 3: Response time check
    await this.runTest(results, 'Response time < 5 seconds', async () => {
      const start = Date.now()
      await this.testToggleFlag({
        flag_key: flagKey,
        enabled: false,
        incident_id: 'test-incident-789',
        incident_message: 'Integration test - performance',
        source: 'pathcanary'
      })
      const duration = Date.now() - start

      if (duration > 5000) {
        throw new Error(`Response time ${duration}ms exceeds 5000ms threshold`)
      }
    })

    const allPassed = results.every(r => r.passed)

    return {
      success: allPassed,
      results
    }
  }

  private async runTest(
    results: Array<{ test: string; passed: boolean; duration: number; error?: string }>,
    name: string,
    testFn: () => Promise<void>
  ): Promise<void> {
    const start = Date.now()

    try {
      await testFn()
      results.push({
        test: name,
        passed: true,
        duration: Date.now() - start
      })
    } catch (error: any) {
      results.push({
        test: name,
        passed: false,
        duration: Date.now() - start,
        error: error.message
      })
    }
  }
}

/**
 * Helper function to create a test client quickly
 */
export function createTestClient(webhookUrl: string, apiKey: string, debug = false): PathCanaryPartnerClient {
  return new PathCanaryPartnerClient({
    webhookUrl,
    apiKey,
    debug
  })
}
