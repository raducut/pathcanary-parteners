# PathCanary Partner Program

Welcome to the PathCanary Partner Program! This repository contains all the resources you need to integrate feature flag rollback capabilities with PathCanary.

## 🚀 What is PathCanary?

PathCanary is a 24/7 revenue funnel monitoring platform that uses synthetic browser journeys to detect critical issues. When incidents occur, PathCanary can automatically roll back changes by:

- **Reverting GitHub/GitLab PRs** - Auto-creates revert pull requests
- **Toggling Feature Flags** - Instantly disables problematic flags
- **Custom Webhooks** - Triggers your rollback mechanisms

## 🤝 Why Partner with Us?

### Benefits
- **20% revenue share** in Year 1, 10% on renewals
- **Co-marketing opportunities** - Joint case studies, webinars, blog posts
- **Technical support** - Dedicated integration assistance
- **Early access** - Beta access to new features

### Partnership Models

#### 1. Technology Partner
- We build and maintain a native integration using your SDK
- Listed as "Official Partner" on our platform
- Zero maintenance required from you
- **Timeline**: 2-4 weeks to production

#### 2. Strategic Partner
- You implement a webhook endpoint following our specification
- Full control over implementation
- Custom branding and co-marketing
- **Timeline**: 3-6 weeks to production

## 📚 Resources

### Documentation
- [Integration Guide](./docs/INTEGRATION_GUIDE.md) - Complete technical documentation
- [Webhook API Specification](./docs/API_SPECIFICATION.md) - OpenAPI 3.0 spec
- [Onboarding Process](./docs/ONBOARDING.md) - Step-by-step partner onboarding

### Code Examples
- [Node.js/Express Example](./examples/nodejs-express/) - Production-ready implementation
- [Python/Flask Example](./examples/python-flask/) - Flask webhook server
- [Go Example](./examples/go/) - Go HTTP server
- [Ruby/Rails Example](./examples/ruby-rails/) - Rails controller

### Testing
- [Partner SDK](./sdk/) - TypeScript SDK for testing your integration
- [SDK Installation Guide](./sdk/INSTALLATION.md) - Install SDK from GitHub
- [Test Suite](./tests/) - Automated integration tests
- [Testing Guide](./docs/TESTING_GUIDE.md) - Complete testing documentation

## 🎯 Quick Start

### 1. Review the Integration Guide
Start by reading the [Integration Guide](./docs/INTEGRATION_GUIDE.md) to understand the technical requirements.

### 2. Choose Your Implementation
Select the example that matches your technology stack:
- **Node.js**: `examples/nodejs-express/`
- **Python**: `examples/python-flask/`
- **Go**: `examples/go/`
- **Ruby**: `examples/ruby-rails/`

### 3. Implement the Webhook
Your webhook must:
- Accept POST requests at `/webhook/pathcanary`
- Validate Bearer token authentication
- Toggle feature flags based on PathCanary requests
- Return success/failure status
- Respond within 2 seconds

### 4. Test Your Integration
Use our Partner SDK to validate your implementation:

\`\`\`bash
# Install SDK from GitHub
npm install raducut/pathcanary-parteners#main

# Create test file (see SDK Installation Guide)
npx ts-node test.ts
\`\`\`

📖 **[Complete SDK Installation Guide](./sdk/INSTALLATION.md)** - Step-by-step instructions with examples

### 5. Go Live
Once testing is complete:
1. Security review by PathCanary team
2. Beta testing with 2-3 customers
3. Production deployment
4. Co-marketing announcement

## 🔐 Security Requirements

- **HTTPS only** (TLS 1.2+)
- **Bearer token authentication** on all requests
- **Rate limiting** (recommended: 100 req/min per customer)
- **Audit logging** for all flag toggles
- **Idempotency** - handle duplicate requests gracefully

## 📊 Success Criteria

Your integration must meet these requirements:

| Metric | Target | Acceptable |
|--------|--------|------------|
| Response Time | < 500ms | < 2000ms |
| Success Rate | > 99.5% | > 99% |
| Availability | 99.9% | 99.5% |

## 🏢 Current Partners

- **LaunchDarkly** - Integration in progress
- **Your Platform?** - [Contact us](mailto:partners@pathcanary.com)

## 💬 Get In Touch

- **Email**: partners@pathcanary.com
- **Partnership Questions**: partners@pathcanary.com
- **Technical Support**: dev@pathcanary.com
- **Website**: https://pathcanary.com/partners

## 📄 License

This documentation and example code are provided under the MIT License.

---

**Ready to partner?** Email us at partners@pathcanary.com to schedule a technical kickoff call.
