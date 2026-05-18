---
sidebar_position: 7
title: "Challenge 40: Design API Integration"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 40: Design API Integration

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $5-20 | **Exam Weight: 30-35%**

:::

## Introduction

MedConnect is a healthcare system that provides electronic health records (EHR), appointment scheduling, and prescription management. The platform must expose APIs to three distinct consumer categories with vastly different trust levels, performance requirements, and access patterns. The system processes Protected Health Information (PHI) and must comply with HIPAA regulations for all API traffic regardless of the consumer type.

Consumer Type 1 (Internal mobile app): Used by 5,000 healthcare workers daily. Requires sub-100ms latency for patient lookup. Fully trusted as it is developed in-house and authenticated via managed identity. Needs access to all API endpoints including sensitive patient data. Consumer Type 2 (Partner hospitals): 12 partner organizations exchange patient records for referrals and shared care. Each partner has a unique SLA (99.9% availability, maximum 500ms response time), must be authenticated via OAuth2 client credentials, and can only access patient records with explicit consent tokens. Consumer Type 3 (Third-party developers): A developer ecosystem of 200+ health-tech startups building wellness apps, appointment booking widgets, and research tools. Require self-service API keys, rate limiting (100 requests/minute for free tier, 1,000 for paid tier), usage analytics for billing, and access only to anonymized/aggregated data endpoints.

The architecture must protect backend services from direct exposure, enforce consistent security policies, enable API versioning as the platform evolves, and provide monetization capabilities for the developer program.

## Exam Skills Covered

- Recommend a solution for API integration

## Design Tasks

### Part 1: API Management Tier Selection

1. Evaluate Azure API Management tiers for this healthcare scenario:

| Feature | Consumption | Developer | Basic | Standard | Premium |
|---------|-------------|-----------|-------|----------|---------|
| SLA | No SLA | No SLA | 99.95% | 99.95% | 99.95%+ (multi-region) |
| VNet integration | No | No | No | No | Yes (external/internal) |
| Multi-region | No | No | No | No | Yes |
| Self-hosted gateway | No | No | No | No | Yes |
| Developer portal | Managed only | Yes | Yes | Yes | Yes |
| Capacity (units) | Serverless | 1 | 1 | 1-4 | 1-12+ per region |
| Private endpoint | No | No | No | No | Yes |

2. Determine which tier is required for HIPAA compliance:
   - Does the API gateway need to be inside the VNet (internal mode)?
   - Is private endpoint connectivity to backend services required?
   - What tier provides the network isolation needed for PHI?

3. Justify the selection considering: multi-region availability for partner SLAs, VNet integration for HIPAA, developer portal for third-party onboarding, and capacity for 5,000 internal users.

### Part 2: Consumer-Specific Policy Design

4. Design API Management policies for each consumer type:

**Internal mobile app (Type 1)**:
- Authentication: Validate managed identity tokens (validate-jwt policy)
- Rate limiting: None (trusted, high-volume)
- Caching: Cache patient lookup responses for 30 seconds (cache-lookup/cache-store)
- Backend: Direct pass-through with minimal overhead

**Partner hospitals (Type 2)**:
- Authentication: OAuth2 client credentials flow (validate-jwt with specific audience)
- Rate limiting: 10,000 requests/hour per partner
- Consent validation: Custom policy to verify patient consent token in request header
- Response transformation: Strip internal metadata before returning
- Backend: Route to partner-specific backend pool based on client ID

**Third-party developers (Type 3)**:
- Authentication: Subscription key (API key via Ocp-Apim-Subscription-Key header)
- Rate limiting: 100 requests/minute (free) or 1,000 requests/minute (paid)
- IP filtering: Optional IP allowlist for production apps
- Response transformation: Remove PHI fields, return only anonymized data
- Backend: Route to read-only anonymized data replica

5. Implement the rate limiting policies using `<rate-limit-by-key>`:
   - How do you differentiate rate limits based on subscription tier (free vs paid)?
   - What response does a rate-limited consumer receive (HTTP 429)?
   - How do you communicate remaining quota in response headers?

### Part 3: API Versioning and Lifecycle

6. Design the API versioning strategy:
   - **URL path versioning**: `/api/v1/patients` vs `/api/v2/patients`
   - **Header versioning**: `Api-Version: 2024-01-15`
   - **Query string versioning**: `/api/patients?api-version=2024-01-15`
   - Which approach is most appropriate for each consumer type?

7. Plan the API deprecation lifecycle:
   - Version announcement: How are consumers notified of new versions?
   - Sunset period: How long do deprecated versions remain active?
   - Breaking changes: What constitutes a breaking change requiring a new version?
   - Developer portal documentation: How are version differences communicated?

8. Design the revision strategy within a version:
   - Use API Management revisions for non-breaking changes
   - How do you test a new revision before making it current?
   - What is the rollback process if a new revision introduces bugs?

### Part 4: Security, Compliance, and Monetization

9. Design the HIPAA-compliant API security architecture:
   - All traffic must use TLS 1.2+ (configure in APIM policy)
   - Audit logging: All API calls logged to Azure Monitor with caller identity
   - Data masking: Sensitive fields masked in diagnostic logs
   - Backend protection: Backend services only accessible from APIM (VNet/NSG rules)
   - Certificate authentication for backend service communication (mutual TLS)

10. Design the developer portal experience for Type 3 consumers:
    - Self-service registration with email verification
    - API key provisioning (automatic upon registration)
    - Interactive API documentation (try-it console with sandbox environment)
    - Usage dashboard showing calls made, quota remaining, errors
    - Upgrade flow from free tier to paid tier

11. Design the monetization model:
    - Free tier: 100 requests/minute, anonymized data only, no SLA
    - Basic paid ($49/month): 1,000 requests/minute, aggregated data, 99.5% SLA
    - Enterprise ($499/month): 10,000 requests/minute, detailed data (with consent), 99.9% SLA, priority support
    - How do you track usage per subscription for billing?
    - Integration with Azure API Management monetization features or external billing (Stripe)

12. Design the API analytics pipeline:
    - Which metrics to collect: latency percentiles, error rates, top consumers, endpoint popularity
    - Export API Management logs to Log Analytics workspace
    - Create dashboards for API product managers (usage trends, adoption metrics)
    - Alert on SLA breaches for partner APIs

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-40"
  items={[
    "APIM Premium tier selected with VNet integration justification for HIPAA compliance",
    "Consumer-specific policies designed with appropriate auth, rate limiting, and response transformation",
    "API versioning strategy defined with deprecation lifecycle and revision management",
    "HIPAA security controls implemented (TLS, audit logging, data masking, mutual TLS)",
    "Developer portal and monetization model designed with tiered access and billing",
    "API analytics pipeline exports to Log Analytics with SLA monitoring dashboards"
  ]}
/>

## Hints

<details>
<summary>Hint 1: APIM Premium for Healthcare</summary>

Azure API Management Premium is required for HIPAA-regulated healthcare APIs because:
- **VNet integration (internal mode)**: APIM gateway is deployed inside the VNet with no public IP. Backend services are only reachable from within the VNet. This ensures PHI never traverses the public internet between APIM and backends.
- **Private endpoints**: Consumers can access APIM via Azure Private Link, keeping traffic on the Microsoft backbone.
- **Multi-region**: Deploy APIM in 2+ regions for the 99.9%+ SLA required by partner contracts.
- **Self-hosted gateway**: For partner hospitals that need on-premises API gateway for local compliance.

The cost of Premium (~$2,800/month per unit) is justified by the regulatory and SLA requirements.

</details>

<details>
<summary>Hint 2: Rate Limiting Policy Configuration</summary>

Use `rate-limit-by-key` for per-consumer rate limiting:

```xml
<inbound>
    <choose>
        <when condition="@(context.Subscription.Name.Contains("free"))">
            <rate-limit-by-key calls="100" renewal-period="60"
                counter-key="@(context.Subscription.Id)" />
        </when>
        <when condition="@(context.Subscription.Name.Contains("paid"))">
            <rate-limit-by-key calls="1000" renewal-period="60"
                counter-key="@(context.Subscription.Id)" />
        </when>
    </choose>
</inbound>
```

Add remaining quota headers:
```xml
<outbound>
    <set-header name="X-RateLimit-Remaining" exists-action="override">
        <value>@(context.Variables.GetValueOrDefault("remainingCalls", ""))</value>
    </set-header>
</outbound>
```

</details>

<details>
<summary>Hint 3: Response Transformation for PHI Removal</summary>

For Type 3 (third-party) consumers, strip PHI from responses using APIM outbound policies:

```xml
<outbound>
    <set-body>
        @{
            var response = context.Response.Body.As<JObject>();
            response.Remove("patientSSN");
            response.Remove("dateOfBirth");
            response.Remove("address");
            response["patientId"] = "ANONYMIZED";
            return response.ToString();
        }
    </set-body>
</outbound>
```

For more complex anonymization, route Type 3 requests to a separate backend that only serves pre-anonymized data (defense in depth). Never rely solely on the gateway policy to strip PHI from a backend that returns full records.

</details>

<details>
<summary>Hint 4: API Versioning Best Practice</summary>

For healthcare APIs with multiple consumer types:
- **URL path versioning** (`/v1/`, `/v2/`) is best for third-party developers because it is the most explicit and discoverable in documentation.
- **Header versioning** (`Api-Version: 2024-01-15`) is suitable for internal apps where you control the client and can update headers without changing URLs.
- Azure API Management supports all versioning schemes natively.

Deprecation timeline for healthcare:
- Announce new version: 6 months before sunset
- Support both versions: 12-18 months overlap (healthcare partners have slow update cycles)
- Sunset old version: Only after confirming zero traffic for 30 days
- Breaking changes requiring new version: Removing fields, changing data types, removing endpoints

</details>

<details>
<summary>Hint 5: Monetization with APIM Products</summary>

Azure API Management Products group APIs and apply policies:
- **Product: Free Developer** → includes anonymized APIs, free subscription key, 100 req/min limit
- **Product: Basic** → includes aggregated APIs, requires approval, 1,000 req/min
- **Product: Enterprise** → includes all APIs (with consent), manual approval, 10,000 req/min

Each product can have:
- Different terms of use (accepted during sign-up)
- Different subscription approval workflows (auto-approve for free, manual for enterprise)
- Different policies applied at the product level

For billing integration, export usage data from APIM Built-in Analytics or Log Analytics to your billing system. APIM does not handle payments directly; integrate with Stripe or Azure Marketplace for commercial transactions.

</details>

## Learning Resources

- [Azure API Management overview](https://learn.microsoft.com/en-us/azure/api-management/api-management-key-concepts)
- [API Management policies reference](https://learn.microsoft.com/en-us/azure/api-management/api-management-policies)
- [API Management access restriction policies](https://learn.microsoft.com/en-us/azure/api-management/api-management-access-restriction-policies)
- [API versioning in Azure API Management](https://learn.microsoft.com/en-us/azure/api-management/api-management-versions)
- [Deploy API Management to a virtual network](https://learn.microsoft.com/en-us/azure/api-management/api-management-using-with-vnet)

## Knowledge Check

<details>
<summary>1. A healthcare API must ensure that Protected Health Information never traverses the public internet between the API gateway and backend services. Which APIM deployment mode achieves this?</summary>

**Internal VNet mode (Premium tier).** In internal mode, the API Management gateway is deployed inside a VNet with only a private IP address. Backend services in the same VNet (or peered VNets) are accessed via private IPs. External consumers reach APIM through Azure Application Gateway or private endpoints. This ensures PHI stays on the private network between APIM and backends. External mode places APIM in the VNet but with a public IP, which does not fully isolate backend traffic from the internet path.

</details>

<details>
<summary>2. Why should third-party developers access a separate anonymized backend rather than relying solely on APIM response transformation to strip PHI?</summary>

**Defense in depth: if the APIM policy fails or is misconfigured, PHI would be exposed to untrusted consumers.** A single-layer approach (policy-only stripping) creates a single point of failure for compliance. If a developer accidentally removes the transformation policy during an update, or a new API endpoint is added without the policy, PHI leaks to third parties. A dedicated anonymized backend ensures that even with a misconfigured gateway, the data served to Type 3 consumers never contains PHI at the source. This is the defense-in-depth principle applied to data classification and API security.

</details>

<details>
<summary>3. A partner hospital reports that 5% of their API calls fail with HTTP 429 (Too Many Requests). How do you diagnose and resolve this?</summary>

**Check APIM analytics for the partner's subscription to verify if they are exceeding their rate limit, then either increase their quota or implement request smoothing.** HTTP 429 means the rate-limit policy is triggered. Steps: (1) Query Log Analytics for the partner's subscription ID with 429 responses to identify peak times. (2) Compare actual request rate against their configured limit (10,000/hour). (3) If legitimate traffic exceeds the limit, increase the quota or switch to a higher tier. (4) If traffic is bursty, suggest implementing client-side retry with exponential backoff and the `Retry-After` header value returned by APIM.

</details>

<details>
<summary>4. An API evolves from v1 to v2 with a breaking change (patient ID format changes from integer to GUID). How should you manage this transition for partner hospitals?</summary>

**Publish v2 alongside v1, communicate the change 6+ months in advance, and maintain v1 until all partners have migrated.** Use APIM API versioning with URL path scheme (`/v1/patients/123` vs `/v2/patients/abc-def-123`). Both versions route to appropriate backend versions simultaneously. Provide migration guides in the developer portal, track v1 usage per partner in analytics, and proactively reach out to partners still using v1. Only sunset v1 after confirming zero traffic for 30+ days. For healthcare, allow 12-18 months overlap due to regulatory change management requirements.

</details>

## Cleanup

```bash
# If you deployed APIM resources for testing:
# Note: APIM deletion can take 30+ minutes
az group delete --name rg-api-design --yes --no-wait
```

---

**Congratulations!** You have completed all challenges in Domain 4: Infrastructure Solutions. Review the [AZ-305 Overview](/docs/az-305/overview) for the complete certification preparation path.
