---
sidebar_position: 16
title: "Challenge 49: Design Network Security and Load Balancing"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 49: Design Network Security and Load Balancing

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $10-25 | **Exam Weight: 30-35%**

:::

## Introduction

CloudTenant SaaS is a multi-tenant B2B platform serving 500 enterprise customers. The platform exposes REST APIs and web dashboards to the internet, processes sensitive financial data, and must meet SOC 2 Type II compliance requirements. The architecture consists of a web tier (frontend), API tier, background processing tier, and shared data tier deployed across 2 Azure regions (East US and West Europe) for global availability.

The security and reliability requirements are: (1) DDoS protection for all internet-facing endpoints, (2) Web Application Firewall protecting against OWASP Top 10 vulnerabilities, (3) Private connectivity for all backend-to-backend communication (no backend service exposed to internet), (4) Global load balancing with automatic failover between regions (< 60 seconds failover time), (5) Micro-segmentation between tenants to prevent lateral movement if one tenant's workload is compromised, (6) TLS 1.3 enforcement with centralized certificate management, and (7) Network logging and threat detection for security audit compliance.

The platform team needs to select the right combination of Azure networking and security services from a crowded landscape: Azure Firewall, WAF, NSG, ASG, Private Link, DDoS Protection, Front Door, Traffic Manager, Application Gateway, and Load Balancer.

## Exam Skills Covered

- Recommend a solution to optimize network security
- Recommend a load-balancing and routing solution

## Design Tasks

### Part 1: Load Balancing Decision Tree

1. Apply the Azure load balancing decision tree to select the appropriate service for each traffic pattern:
   - Internet-facing HTTP/HTTPS traffic (global): evaluate Azure Front Door vs. Traffic Manager + Application Gateway
   - Internet-facing non-HTTP traffic (e.g., custom TCP protocols): evaluate Traffic Manager + Load Balancer
   - Internal HTTP traffic between microservices: evaluate Internal Application Gateway vs. Internal Load Balancer
   - Internal TCP/UDP traffic: evaluate Internal Load Balancer
2. Design the global load balancing architecture:
   - Azure Front Door as the global entry point (anycast, SSL offload, WAF integration)
   - Regional Application Gateways or Container App ingress as backends
   - Health probes and failover configuration (active-active or active-passive)
3. Compare the load balancing options side by side:
   - Front Door: Layer 7, global, anycast, built-in WAF, caching, URL-based routing
   - Traffic Manager: DNS-based, global, any protocol, no inline processing
   - Application Gateway: Layer 7, regional, WAF (v2), URL routing, SSL termination
   - Load Balancer: Layer 4, regional, TCP/UDP, ultra-low latency, HA ports

### Part 2: Web Application Firewall Design

4. Design the WAF deployment strategy:
   - WAF on Azure Front Door (global, applied at the edge before traffic reaches the region)
   - vs. WAF on Application Gateway (regional, applied at the VNet perimeter)
   - vs. Both (defense in depth: Front Door WAF for volumetric/bot attacks, App Gateway WAF for application-specific rules)
5. Configure WAF policies:
   - OWASP Core Rule Set (CRS) version selection and mode (Detection vs. Prevention)
   - Custom rules for tenant-specific rate limiting (e.g., 1000 requests/minute per tenant API key)
   - Exclusions for known false positives (specific request headers, body fields)
   - Bot protection rule set for distinguishing legitimate bots from malicious crawlers
6. Design the WAF logging and alerting strategy:
   - Log all blocked requests to Log Analytics for security audit
   - Alert on unusual patterns (sudden spike in blocked requests, new attack vectors)
   - Monthly WAF report for SOC 2 compliance evidence

### Part 3: Network Segmentation and Security

7. Design the network segmentation strategy:
   - NSG rules: control traffic at subnet level (web tier can reach API tier, API tier can reach data tier, no direct web-to-data)
   - ASG (Application Security Groups): group VMs/NICs by role for simplified rule management
   - Design NSG flow to enforce: internet -> Front Door -> web tier -> API tier -> data tier (no skipping tiers)
8. Design Private Link/Private Endpoint strategy for backend services:
   - Azure SQL, Cosmos DB, Storage: private endpoints only (disable public access entirely)
   - Inter-service communication: private endpoints for PaaS, VNet integration for App Service/Container Apps
   - Service Endpoint policies where Private Link is not required
9. Design micro-segmentation for tenant isolation:
   - Network-level isolation (dedicated subnets per tenant tier: basic vs. premium customers)
   - vs. Application-level isolation (shared infrastructure with data-level tenant separation)
   - Document the trade-offs: cost of dedicated subnets vs. security of full network isolation

### Part 4: DDoS Protection and Threat Detection

10. Design the DDoS protection strategy:
    - Azure DDoS Network Protection (per VNet, includes cost protection guarantee, WAF integration, telemetry)
    - vs. Default Azure infrastructure DDoS (Layer 3/4 only, no custom policies)
    - Evaluate DDoS IP Protection (per public IP, lower cost alternative)
11. Design the TLS strategy:
    - TLS 1.3 enforcement at Front Door (minimum TLS version configuration)
    - Certificate management: Azure Key Vault managed certificates vs. Front Door managed certificates
    - End-to-end encryption: re-encrypt traffic between Front Door and origin servers
12. Design network security monitoring:
    - Azure Firewall (Premium with IDPS for east-west traffic inspection)
    - NSG flow logs for network traffic analysis
    - Microsoft Defender for Cloud network security recommendations
    - Network Watcher for troubleshooting and packet capture

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-49"
  items={[
    "Load balancing decision tree applied with justified selection for each traffic pattern (global HTTP, regional HTTP, internal TCP)",
    "WAF deployment strategy selects Front Door WAF vs Application Gateway WAF with defense-in-depth justification",
    "Network segmentation enforces tier-based access (web -> API -> data) with NSG and ASG rules",
    "Private Endpoint strategy ensures no backend service has public internet exposure",
    "DDoS protection tier selected with cost justification (Network Protection vs IP Protection vs default)",
    "TLS 1.3 enforced end-to-end with centralized certificate management in Key Vault"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Azure Front Door vs. Application Gateway WAF</summary>

Front Door WAF operates at the edge (Microsoft's global network of POPs) and can block attacks before they reach your Azure region. It excels at volumetric attacks, bot protection, and geo-filtering. Application Gateway WAF operates within your VNet and has access to more application context (VNet-level inspection, tighter integration with backend services). For internet-facing applications, use Front Door WAF as the first line of defense. Add Application Gateway WAF only if you need VNet-level WAF inspection that Front Door cannot provide.

</details>

<details>
<summary>Hint 2: Azure Firewall Tiers</summary>

Azure Firewall comes in three SKUs: **Basic** (small/medium workloads, limited throughput, no TLS inspection), **Standard** (threat intelligence-based filtering, FQDN filtering, network/application rules), and **Premium** (adds TLS inspection, IDPS/IPS with signature-based detection, URL filtering, web categories). For SOC 2 compliance with east-west traffic inspection, Premium is typically required to inspect encrypted traffic between tiers. Standard suffices if you only need outbound filtering and FQDN-based rules.

</details>

<details>
<summary>Hint 3: NSG vs. ASG Simplification</summary>

Without ASGs, you need NSG rules referencing IP ranges (brittle, break when VMs change IPs). ASGs let you assign a logical tag (e.g., "WebServers", "ApiServers") to NICs, then write NSG rules using ASG names as source/destination. Example: Allow ASG:WebServers -> ASG:ApiServers on port 443. This is dynamic (new VMs automatically get the right rules when assigned to the ASG), easier to audit, and does not require IP management. Use ASGs for all intra-VNet segmentation rules.

</details>

<details>
<summary>Hint 4: DDoS Protection Cost Model</summary>

Azure DDoS Network Protection has a fixed monthly fee (approximately $2,944/month) plus per-GB overage charges, covering up to 100 public IPs across all VNets in the subscription. DDoS IP Protection is per-IP pricing (approximately $199/month per IP) without the fixed fee. For workloads with fewer than 15 public IPs, IP Protection is more cost-effective. Both include DDoS rapid response support, cost protection (credit for scale-out costs during attacks), and WAF integration. The default infrastructure protection provides only basic Layer 3/4 protection with no metrics or alerting.

</details>

<details>
<summary>Hint 5: Private Link vs. Service Endpoints</summary>

Private Endpoints bring the PaaS service into your VNet with a private IP (accessible from on-premises via VPN/ExpressRoute, works with NSGs). Service Endpoints extend the VNet identity to the PaaS service (traffic stays on Azure backbone, but the service still has a public IP). For SOC 2 compliance where "no public endpoints for backend" is required, Private Endpoints are necessary because they allow you to completely disable public access to the PaaS service. Service Endpoints cannot guarantee no internet access.

</details>

## Learning Resources

- [Azure load balancing decision tree](https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/load-balancing-overview)
- [Azure Front Door overview](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-overview)
- [Azure Web Application Firewall overview](https://learn.microsoft.com/en-us/azure/web-application-firewall/overview)
- [Azure Firewall overview](https://learn.microsoft.com/en-us/azure/firewall/overview)
- [Azure DDoS Protection overview](https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview)
- [Azure Private Link overview](https://learn.microsoft.com/en-us/azure/private-link/private-link-overview)

## Knowledge Check

<details>
<summary>1. A multi-region SaaS application needs global HTTP load balancing with sub-second failover. Why is Azure Front Door preferred over Traffic Manager for this scenario?</summary>

**Front Door provides instant failover via anycast; Traffic Manager relies on DNS TTL.** Azure Front Door uses anycast routing where all edge nodes share the same IP address. When a backend becomes unhealthy, Front Door immediately routes requests to the next healthy backend at the network layer (< 30 seconds failover). Traffic Manager is DNS-based: failover speed depends on DNS TTL (minimum 0 seconds configured, but clients cache DNS responses). Real-world Traffic Manager failover can take 30-120 seconds due to DNS caching. For HTTP workloads requiring sub-minute failover, Front Door is the correct choice.

</details>

<details>
<summary>2. Your WAF on Front Door is blocking legitimate API requests from a partner integration. The requests contain JSON payloads that trigger SQL injection rules. How do you resolve this without reducing security?</summary>

**Create a WAF exclusion rule for the specific request body field from the specific source.** Steps: (1) Review WAF logs to identify the specific rule being triggered (e.g., rule 942430 - SQL character anomaly detection), (2) Create an exclusion that disables that specific rule only for the partner's requests (match on IP, header, or URI path), (3) Alternatively, create a custom rule with higher priority that explicitly allows the partner's requests before managed rules evaluate them, (4) Do not disable the rule globally as it protects other request paths. Always prefer targeted exclusions over disabling rules entirely.

</details>

<details>
<summary>3. Your architecture uses NSGs to restrict API tier access to only the web tier subnet. A new requirement needs a third-party monitoring tool deployed in a management subnet to health-check API endpoints. What is the most maintainable approach?</summary>

**Use Application Security Groups (ASGs).** Assign the monitoring tool's NIC to an ASG called "MonitoringAgents." Add an NSG rule allowing ASG:MonitoringAgents to reach ASG:ApiServers on the health check port (e.g., 443). This is more maintainable than adding the management subnet CIDR to the existing rule because: (1) If monitoring tools move subnets, the ASG membership follows the NIC, (2) You can add new monitoring instances without modifying NSG rules, (3) The rules read as intent (monitoring can reach API) rather than implementation (10.0.3.0/24 can reach 10.0.2.0/24).

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge49 --location eastus
```

2. Create an Azure Migrate project:

```bash
az extension add --name resource-mover --only-show-errors 2>/dev/null
az resource create --resource-group rg-az305-challenge49 \
  --resource-type Microsoft.Migrate/migrateProjects \
  --name migrate-lab49 --location eastus \
  --properties "{}"
```

3. Verify the Azure Migrate project was created:

```bash
az resource show --resource-group rg-az305-challenge49 \
  --resource-type Microsoft.Migrate/migrateProjects \
  --name migrate-lab49 --query "name" -o tsv
```

4. List the resource to confirm it appears in the resource group:

```bash
az resource list --resource-group rg-az305-challenge49 -o table
```

5. Check the project properties:

```bash
az resource show --resource-group rg-az305-challenge49 \
  --resource-type Microsoft.Migrate/migrateProjects \
  --name migrate-lab49 --query "properties" -o json
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
# Delete all resources created in this challenge
# WARNING: DDoS Protection plan has monthly cost - verify deletion
az group delete --name rg-az305-challenge49 --yes --no-wait
```

---

**Next**: [Challenge 50: Design a Complete Azure Solution (Cross-Domain Capstone)](/docs/az-305/infrastructure/challenge-50)
