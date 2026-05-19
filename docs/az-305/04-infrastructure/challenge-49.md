---
sidebar_position: 16
title: "Challenge 49: Design Network Security and Load Balancing"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 49: design Network security and Load balancing

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $10-25 | **Exam Weight: 30-35%**

:::

## Introduction

CloudTenant SaaS is a multi-tenant B2B platform serving 500 enterprise customers. The platform exposes REST APIs and web dashboards to the internet, processes sensitive financial data, and must meet SOC 2 Type II compliance requirements. The architecture consists of a web tier (frontend), API tier, background processing tier, and shared data tier deployed across 2 Azure regions (East US and West Europe) for global availability.

The security and reliability requirements are: (1) DDoS protection for all internet-facing endpoints, (2) Web Application Firewall protecting against OWASP Top 10 vulnerabilities, (3) Private connectivity for all backend-to-backend communication (no backend service exposed to internet), (4) Global load balancing with automatic failover between regions (< 60 seconds failover time), (5) Micro-segmentation between tenants to prevent lateral movement if one tenant's workload is compromised, (6) TLS 1.3 enforcement with centralized certificate management, and (7) Network logging and threat detection for security audit compliance.

The platform team needs to select the right combination of Azure networking and security services from a crowded landscape: Azure Firewall, WAF, NSG, ASG, Private Link, DDoS Protection, Front Door, Traffic Manager, Application Gateway, and Load Balancer.

## Exam skills covered

- Recommend a solution to optimize network security
- Recommend a load-balancing and routing solution

## Design tasks

### Part 1: Load balancing decision tree

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

### Part 2: web Application Firewall design

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

### Part 3: Network segmentation and security

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

### Part 4: DDoS protection and threat detection

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

## Success criteria

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

## Learning resources

- [Azure load balancing decision tree](https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/load-balancing-overview)
- [Azure Front Door overview](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-overview)
- [Azure Web Application Firewall overview](https://learn.microsoft.com/en-us/azure/web-application-firewall/overview)
- [Azure Firewall overview](https://learn.microsoft.com/en-us/azure/firewall/overview)
- [Azure DDoS Protection overview](https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview)
- [Azure Private Link overview](https://learn.microsoft.com/en-us/azure/private-link/private-link-overview)

## Knowledge check

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

## Validation lab

This lab proves NSG microsegmentation behavior through direct observation. You will deploy two VMs in separate subnets, apply deny rules, watch traffic get blocked, add allow rules, and confirm fine-grained access control -- all in real time with immediate effect.

### Step 1: create the resource group and VNet with two subnets

```bash
az group create \
  --name rg-az305-challenge49 \
  --location eastus
```

```bash
az network vnet create \
  --resource-group rg-az305-challenge49 \
  --name vnet-segmented \
  --address-prefix 10.0.0.0/16 \
  --subnet-name web-subnet \
  --subnet-prefix 10.0.1.0/24
```

```bash
az network vnet subnet create \
  --resource-group rg-az305-challenge49 \
  --vnet-name vnet-segmented \
  --name db-subnet \
  --address-prefix 10.0.2.0/24
```

### Step 2: deploy a VM in each subnet

```bash
az vm create \
  --resource-group rg-az305-challenge49 \
  --name web-vm \
  --vnet-name vnet-segmented \
  --subnet web-subnet \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address "" \
  --no-wait
```

```bash
az vm create \
  --resource-group rg-az305-challenge49 \
  --name db-vm \
  --vnet-name vnet-segmented \
  --subnet db-subnet \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address ""
```

Wait for both VMs:

```bash
az vm wait \
  --resource-group rg-az305-challenge49 \
  --name web-vm \
  --created
```

Get private IPs:

```bash
WEB_IP=$(az vm show \
  --resource-group rg-az305-challenge49 \
  --name web-vm \
  --show-details \
  --query privateIps -o tsv)

DB_IP=$(az vm show \
  --resource-group rg-az305-challenge49 \
  --name db-vm \
  --show-details \
  --query privateIps -o tsv)

echo "Web VM IP: $WEB_IP"
echo "DB VM IP: $DB_IP"
```

:::note[Architect Insight]
By default, VMs within the same VNet can communicate freely across subnets. This is because Azure injects a default "AllowVNetInBound" rule at priority 65000. On the AZ-305 exam, understand that subnets alone do NOT provide isolation -- you need NSGs to enforce segmentation within a VNet.
:::

### Step 3: create an NSG with a DENY rule for SSH from web-subnet to db-subnet

```bash
az network nsg create \
  --resource-group rg-az305-challenge49 \
  --name nsg-db-subnet
```

```bash
az network nsg rule create \
  --resource-group rg-az305-challenge49 \
  --nsg-name nsg-db-subnet \
  --name DenySSHFromWeb \
  --priority 100 \
  --direction Inbound \
  --access Deny \
  --protocol Tcp \
  --source-address-prefixes 10.0.1.0/24 \
  --destination-port-ranges 22 \
  --description "Block SSH from web subnet to db subnet"
```

Associate the NSG with the db-subnet:

```bash
az network vnet subnet update \
  --resource-group rg-az305-challenge49 \
  --vnet-name vnet-segmented \
  --name db-subnet \
  --network-security-group nsg-db-subnet
```

### Step 4: test SSH from web-vm to db-vm (expect failure)

```bash
az vm run-command invoke \
  --resource-group rg-az305-challenge49 \
  --name web-vm \
  --command-id RunShellScript \
  --scripts "nc -z -w 3 $DB_IP 22 && echo 'PORT 22 OPEN' || echo 'PORT 22 BLOCKED'"
```

The output should show "PORT 22 BLOCKED" -- the NSG deny rule is in effect.

:::note[Architect Insight]
NSGs are stateful: if you allow inbound traffic, the return traffic is automatically permitted without needing an explicit outbound rule. This means a single inbound deny rule is sufficient to block a connection -- you do not need matching outbound rules. On the AZ-305 exam, stateful behavior reduces rule complexity significantly compared to stateless firewalls.
:::

### Step 5: add an ALLOW rule for port 3306 (simulating database access)

```bash
az network nsg rule create \
  --resource-group rg-az305-challenge49 \
  --nsg-name nsg-db-subnet \
  --name AllowMySQLFromWeb \
  --priority 110 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes 10.0.1.0/24 \
  --destination-port-ranges 3306 \
  --description "Allow MySQL from web subnet to db subnet"
```

Start a listener on the db-vm to simulate a database service:

```bash
az vm run-command invoke \
  --resource-group rg-az305-challenge49 \
  --name db-vm \
  --command-id RunShellScript \
  --scripts "nohup nc -l -p 3306 &>/dev/null & echo 'Listener started on port 3306'"
```

### Step 6: test connectivity on port 3306 (expect success)

```bash
az vm run-command invoke \
  --resource-group rg-az305-challenge49 \
  --name web-vm \
  --command-id RunShellScript \
  --scripts "nc -z -w 3 $DB_IP 3306 && echo 'PORT 3306 OPEN' || echo 'PORT 3306 BLOCKED'"
```

The output should show "PORT 3306 OPEN" -- the allow rule permits database traffic while SSH remains blocked. This is microsegmentation in action: allowing only the specific protocol needed.

:::note[Architect Insight]
NSG rules are evaluated by priority -- the lowest number wins. In this lab, priority 100 (DenySSH) blocks port 22 while priority 110 (AllowMySQL) permits port 3306. On the AZ-305 exam, always design deny rules with lower priority numbers than allow rules for the same source, and use explicit deny rules (rather than relying on the default deny) for compliance auditing -- auditors want to see intentional security decisions documented in rules.
:::

### Step 7: view effective security rules on the db-vm NIC

```bash
DB_NIC=$(az vm show \
  --resource-group rg-az305-challenge49 \
  --name db-vm \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)

az network nic list-effective-nsg \
  --ids $DB_NIC \
  --output table
```

The effective rules show the merged result of your custom rules plus the platform default rules (AllowVNetInBound at 65000, DenyAllInBound at 65500). Your DenySSHFromWeb rule at priority 100 takes precedence over the default AllowVNetInBound.

:::note[Architect Insight]
Effective security rules combine subnet-level and NIC-level NSGs. If you have an NSG on both the subnet AND the NIC, traffic must pass BOTH -- they are evaluated independently and both must permit the traffic. On the AZ-305 exam, this dual-evaluation model is frequently tested. The effective rules view is how you troubleshoot "why is my traffic being blocked?" in production.
:::

### Step 8: remove the allow rule and verify immediate revocation

```bash
az network nsg rule delete \
  --resource-group rg-az305-challenge49 \
  --nsg-name nsg-db-subnet \
  --name AllowMySQLFromWeb
```

Test port 3306 again:

```bash
az vm run-command invoke \
  --resource-group rg-az305-challenge49 \
  --name web-vm \
  --command-id RunShellScript \
  --scripts "nc -z -w 3 $DB_IP 3306 && echo 'PORT 3306 OPEN' || echo 'PORT 3306 BLOCKED'"
```

The output should show "PORT 3306 BLOCKED" -- rule changes take effect within seconds. No VM restart, no service reload, no propagation delay.

:::note[Architect Insight]
NSG rule changes are nearly instantaneous. This is critical for incident response -- if you detect a compromised workload, you can isolate it immediately by adding a deny rule. On the AZ-305 exam, this property makes NSGs suitable for automated security remediation workflows (e.g., Azure Logic App detects threat, applies NSG rule to quarantine the VM).
:::

:::tip[Design Validation]
This lab proved three critical network security principles: (1) NSGs provide microsegmentation within VNets -- subnets alone do not isolate workloads, you must apply explicit rules, (2) rule changes take effect in seconds with no restart or downtime required -- enabling rapid incident response and automated remediation, and (3) effective security rules show the merged result of all applied NSGs (subnet + NIC level), which is the definitive tool for troubleshooting connectivity issues in production.
:::

## Cleanup

```bash
az group delete \
  --name rg-az305-challenge49 \
  --yes \
  --no-wait
```

---

**Next**: [Challenge 50: Design a Complete Azure Solution (Cross-Domain Capstone)](/docs/az-305/infrastructure/challenge-50)
