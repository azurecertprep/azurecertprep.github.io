---
sidebar_position: 13
title: "Challenge 13: DDoS Protection & Network Security Recommendations"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 13: DDoS Protection & network security recommendations

:::info Estimated time and cost

**60-90 minutes** | **~$0.50-1/hour** (DDoS IP Protection on a single public IP) | **Exam weight: 10-15%**

:::

:::danger Cost warning

DDoS Network Protection costs **$2,944/month** (flat rate per plan). Do NOT deploy a DDoS Protection plan in a lab subscription. This challenge uses **DDoS IP Protection** ($199/resource/month) as the affordable alternative and shows Network Protection commands for reference only.

:::

## Scenario

Contoso's public-facing web applications have been targeted by volumetric DDoS attacks that saturated bandwidth and exhausted application resources. The security team needs to evaluate DDoS protection options, configure appropriate protection for public-facing IPs, set up monitoring and alerting for attack detection, and use Microsoft Defender for Cloud to identify additional network security gaps across the environment.

**Architecture:**

```
Internet
    |
[Public IP: pip-web-frontend]  ←  DDoS IP Protection enabled
    |
[Application Gateway / Load Balancer]
    |
  VNet (10.0.0.0/16)
    ├── snet-frontend (10.0.1.0/24)
    └── snet-backend  (10.0.2.0/24)
```

## Learning objectives

After completing this challenge you will be able to:

- Compare DDoS Infrastructure, IP Protection, and Network Protection tiers
- Create a DDoS Protection plan (Network Protection) and associate it with a VNet
- Enable DDoS IP Protection on a specific public IP address
- Configure diagnostic logs and metric alerts for DDoS attack detection
- Review network security recommendations in Defender for Cloud Secure Score
- Use Azure Resource Graph to query security assessments for network resources

## Prerequisites

- An Azure subscription with Contributor access
- Azure CLI installed and authenticated (`az login`)
- A Standard SKU public IP address (required for DDoS protection features)
- Microsoft Defender for Cloud enabled (free tier is sufficient for assessments)

## Key concepts for AZ-700

| Concept | Detail |
|---------|--------|
| DDoS Infrastructure Protection | Free, always-on, basic L3/L4 protection for all Azure public IPs |
| DDoS IP Protection | $199/resource/month, per-IP, includes metrics, alerts, mitigation reports |
| DDoS Network Protection | $2,944/month flat, per-VNet plan, adds cost protection, DDoS Rapid Response team, WAF discount |
| Key metrics | IfUnderDDoSAttack (0 or 1), PacketsDroppedDDoS, BytesDroppedDDoS |
| Metric namespace | Microsoft.Network/publicIPAddresses |
| Diagnostic log categories | DDoSProtectionNotifications, DDoSMitigationFlowLogs, DDoSMitigationReports |
| Mitigation trigger | Automatic; thresholds are learned from normal traffic patterns |
| Standard SKU requirement | DDoS IP Protection requires Standard SKU public IPs (Basic SKU is not supported) |

---

## Task 1: Understand DDoS protection tiers

Before deploying any protection, understand the three tiers available in Azure.

| Feature | Infrastructure Protection | IP Protection | Network Protection |
|---------|--------------------------|---------------|-------------------|
| Cost | Free | $199/resource/month | $2,944/month (flat) |
| Scope | All Azure resources | Per public IP | Per VNet (all IPs in VNet) |
| L3/L4 mitigation | Yes | Yes | Yes |
| DDoS metrics and alerts | No | Yes | Yes |
| Mitigation flow logs | No | Yes | Yes |
| Mitigation reports | No | Yes | Yes |
| Adaptive tuning policies | No | Yes | Yes |
| Cost protection (overage credits) | No | No | Yes |
| DDoS Rapid Response (DRR) team | No | No | Yes |
| WAF discount | No | No | Yes |
| Protection for up to 100 public IPs | No | No (per-IP billing) | Yes (included) |

:::tip Exam note

The exam tests whether you can identify which tier provides a specific feature. Key differentiators: only Network Protection includes cost protection guarantees and access to the DDoS Rapid Response team. IP Protection is ideal for small deployments (fewer than 15 public IPs where the per-IP cost is less than the flat Network Protection fee).

:::

---

## Task 2: Create a DDoS Protection plan (Network Protection reference)

:::danger Do NOT run this in a lab subscription

The following commands create a DDoS Network Protection plan that costs $2,944/month immediately upon creation. These commands are provided for exam preparation reference only.

:::

### Step 1: Create a DDoS Protection plan (reference only)

```bash
# REFERENCE ONLY — costs $2,944/month
az network ddos-protection create \
    --resource-group rg-ddos-lab \
    --name ddos-plan-contoso \
    --location eastus
```

### Step 2: Associate the plan with a VNet (reference only)

```bash
# REFERENCE ONLY — associates the paid plan with a VNet
az network vnet update \
    --resource-group rg-ddos-lab \
    --name vnet-contoso \
    --ddos-protection-plan ddos-plan-contoso \
    --ddos-protection true
```

### Step 3: Verify protection status (reference only)

```bash
az network vnet show \
    --resource-group rg-ddos-lab \
    --name vnet-contoso \
    --query "{ddosPlan:ddosProtectionPlan.id, enabled:enableDdosProtection}" \
    --output table
```

### Step 4: Disable DDoS Network Protection on a VNet (reference only)

```bash
# Disassociate to stop billing
az network vnet update \
    --resource-group rg-ddos-lab \
    --name vnet-contoso \
    --ddos-protection false
```

---

## Task 3: Enable DDoS IP Protection (lab-friendly)

DDoS IP Protection is the cost-effective option for labs. It provides the same metrics, alerts, and mitigation features as Network Protection but billed per public IP at $199/month.

### Step 1: Create the resource group and VNet

```bash
az group create \
    --name rg-ddos-lab \
    --location eastus

az network vnet create \
    --resource-group rg-ddos-lab \
    --name vnet-contoso \
    --location eastus \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name snet-frontend \
    --subnet-prefixes 10.0.1.0/24
```

### Step 2: Create a Standard SKU public IP with DDoS IP Protection enabled

```bash
az network public-ip create \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --location eastus \
    --allocation-method Static \
    --sku Standard \
    --ddos-protection-mode Enabled
```

:::note

The `--ddos-protection-mode` parameter accepts three values:
- **Enabled** — DDoS IP Protection is active on this public IP ($199/month)
- **Disabled** — only free Infrastructure Protection (default for new IPs)
- **VirtualNetworkInherited** — inherits protection from a DDoS Network Protection plan on the VNet

:::

### Step 3: Enable DDoS IP Protection on an existing public IP

If you already have a public IP without DDoS protection:

```bash
az network public-ip update \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --ddos-protection-mode Enabled
```

### Step 4: Verify the DDoS protection status

```bash
az network public-ip show \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --query "{name:name, ddosSettings:ddosSettings}" \
    --output json
```

Expected output should show `"protectionMode": "Enabled"` under `ddosSettings`.

### Step 5: Disable DDoS IP Protection (to stop billing)

```bash
az network public-ip update \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --ddos-protection-mode Disabled
```

---

## Task 4: Configure diagnostic logs and metric alerts

DDoS protection exposes telemetry through Azure Monitor. You need diagnostic settings to capture attack logs, and metric alerts to notify your team when an attack is detected.

### Step 1: Create a Log Analytics workspace

```bash
az monitor log-analytics workspace create \
    --resource-group rg-ddos-lab \
    --workspace-name law-ddos-contoso \
    --location eastus
```

### Step 2: Get the public IP resource ID

```bash
PIP_ID=$(az network public-ip show \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --query "id" \
    --output tsv)
```

### Step 3: Create diagnostic settings for DDoS logs

```bash
WORKSPACE_ID=$(az monitor log-analytics workspace show \
    --resource-group rg-ddos-lab \
    --workspace-name law-ddos-contoso \
    --query "id" \
    --output tsv)

az monitor diagnostic-settings create \
    --name diag-ddos-logs \
    --resource "$PIP_ID" \
    --workspace "$WORKSPACE_ID" \
    --logs '[
      {"category": "DDoSProtectionNotifications", "enabled": true},
      {"category": "DDoSMitigationFlowLogs", "enabled": true},
      {"category": "DDoSMitigationReports", "enabled": true}
    ]' \
    --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

:::note Log categories explained

- **DDoSProtectionNotifications** — alerts when mitigation starts and stops (attack detected/resolved)
- **DDoSMitigationFlowLogs** — per-flow details of dropped and forwarded packets during active mitigation
- **DDoSMitigationReports** — post-attack summary reports with aggregated statistics

:::

### Step 4: Verify diagnostic settings

```bash
az monitor diagnostic-settings list \
    --resource "$PIP_ID" \
    --output table
```

### Step 5: Create a metric alert for DDoS attack detection

The `IfUnderDDoSAttack` metric is 1 when an attack is active and 0 otherwise. This is the primary metric for alerting.

```bash
az monitor metrics alert create \
    --name alert-ddos-attack-detected \
    --resource-group rg-ddos-lab \
    --scopes "$PIP_ID" \
    --condition "max IfUnderDDoSAttack >= 1" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --severity 1 \
    --description "DDoS attack detected on pip-web-frontend"
```

### Step 6: Create an alert for dropped packets exceeding a threshold

```bash
az monitor metrics alert create \
    --name alert-ddos-packets-dropped \
    --resource-group rg-ddos-lab \
    --scopes "$PIP_ID" \
    --condition "max PacketsDroppedDDoS > 1000" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --severity 2 \
    --description "High volume of packets dropped by DDoS mitigation"
```

:::tip Exam note

DDoS metrics are exposed on the **public IP address** resource (namespace `Microsoft.Network/publicIPAddresses`), not on the VNet or DDoS plan resource. This is a common mistake in alert configuration. The metric names include `IfUnderDDoSAttack`, `PacketsDroppedDDoS`, `BytesDroppedDDoS`, `PacketsForwardedDDoS`, and protocol-specific variants (TCP, UDP).

:::

---

## Task 5: Review network security recommendations in Defender for Cloud

Microsoft Defender for Cloud continuously evaluates your environment against security best practices and produces recommendations that affect your Secure Score.

### Step 1: List security assessments via Azure Resource Graph

The most effective way to query Defender for Cloud recommendations programmatically is via Azure Resource Graph, which queries the `SecurityResources` table:

```bash
az graph query -q "
  SecurityResources
  | where type == 'microsoft.security/assessments'
  | where properties.status.code == 'Unhealthy'
  | where properties.metadata.categories contains 'Networking'
  | project
      recommendationName=properties.displayName,
      severity=properties.metadata.severity,
      status=properties.status.code,
      resourceId=properties.resourceDetails.Id
  | order by severity asc
  | take 20
"
```

:::note

The `az graph` command requires the `resource-graph` extension. Install it with:

```bash
az extension add --name resource-graph
```

:::

### Step 2: Filter for DDoS-related recommendations

```bash
az graph query -q "
  SecurityResources
  | where type == 'microsoft.security/assessments'
  | where properties.status.code == 'Unhealthy'
  | where properties.displayName contains 'DDoS'
  | project
      recommendationName=properties.displayName,
      severity=properties.metadata.severity,
      description=properties.metadata.description,
      resourceId=properties.resourceDetails.Id
"
```

Common DDoS-related recommendations include:
- "Virtual networks should be protected by Azure DDoS Protection"
- "Public IP addresses should have DDoS protection enabled"

### Step 3: Query Secure Score for the networking category

```bash
az graph query -q "
  SecurityResources
  | where type == 'microsoft.security/securescores'
  | project
      subscriptionId,
      score=properties.score.current,
      maxScore=properties.score.max,
      percentage=properties.score.percentage
"
```

### Step 4: Identify unhealthy network assessments with remediation guidance

```bash
az graph query -q "
  SecurityResources
  | where type == 'microsoft.security/assessments'
  | where properties.status.code == 'Unhealthy'
  | where properties.metadata.categories contains 'Networking'
  | project
      recommendationName=properties.displayName,
      severity=properties.metadata.severity,
      remediation=properties.metadata.remediationDescription,
      implementationEffort=properties.metadata.implementationEffort
  | order by severity asc
  | take 10
"
```

:::tip Exam note

Defender for Cloud **attack paths** show chains of vulnerabilities an attacker could exploit to reach sensitive resources. For example: Internet-exposed VM with open NSG rule, running unpatched software, with access to a storage account containing sensitive data. Attack paths are visualized in the portal under Defender for Cloud > Attack path analysis. The CLI access is limited; this is primarily a portal-based feature tested conceptually on the exam.

:::

---

## Task 6: Use Security Explorer to identify network resources at risk

Security Explorer (Cloud Security Explorer) in Defender for Cloud lets you build graph-based queries to find resources matching specific conditions. While the full Security Explorer is portal-based, you can replicate common queries using Azure Resource Graph.

### Step 1: Find public IPs without DDoS protection

```bash
az graph query -q "
  Resources
  | where type == 'microsoft.network/publicipaddresses'
  | where properties.ddosSettings.protectionMode != 'Enabled'
      and properties.ddosSettings.protectionMode != 'VirtualNetworkInherited'
  | project name, resourceGroup, location,
      sku=properties.sku.name,
      protectionMode=properties.ddosSettings.protectionMode
"
```

### Step 2: Find NSGs with overly permissive inbound rules (any source)

```bash
az graph query -q "
  Resources
  | where type == 'microsoft.network/networksecuritygroups'
  | mv-expand rules = properties.securityRules
  | where rules.properties.direction == 'Inbound'
      and rules.properties.access == 'Allow'
      and (rules.properties.sourceAddressPrefix == '*'
           or rules.properties.sourceAddressPrefix == 'Internet')
  | project nsgName=name, resourceGroup,
      ruleName=rules.properties.name,
      destinationPort=rules.properties.destinationPortRange,
      priority=rules.properties.priority
  | order by nsgName asc
"
```

### Step 3: Find VNets without DDoS Network Protection

```bash
az graph query -q "
  Resources
  | where type == 'microsoft.network/virtualnetworks'
  | where properties.enableDdosProtection == false
      or isnull(properties.enableDdosProtection)
  | project name, resourceGroup, location
"
```

### Step 4: Correlate public IPs with their attached resources

```bash
az graph query -q "
  Resources
  | where type == 'microsoft.network/publicipaddresses'
  | project name, resourceGroup,
      ipAddress=properties.ipAddress,
      attachedTo=properties.ipConfiguration.id,
      ddosMode=properties.ddosSettings.protectionMode
  | where isnotempty(attachedTo)
"
```

:::tip Exam note

**Cloud Security Explorer** in Defender for Cloud uses a graph model where you can query relationships like "Public IP is exposed to the internet AND is attached to a VM AND the VM has high-severity vulnerabilities." This is different from Azure Resource Graph, which queries resource metadata. The exam may ask about Security Explorer query scenarios conceptually, not about specific query syntax.

:::

---

## Break and fix scenarios

### Scenario 1: Public IP has no DDoS protection

**Symptom:** During a DDoS attack simulation review, the team discovers that the critical frontend public IP has no DDoS metrics available and no protection telemetry.

**Diagnosis:**

```bash
az network public-ip show \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --query "ddosSettings"
```

If `protectionMode` is `null` or `Disabled`, only free Infrastructure Protection is active. No metrics or logs are generated.

**Fix:**

```bash
az network public-ip update \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --ddos-protection-mode Enabled
```

### Scenario 2: Alert rule uses wrong metric namespace

**Symptom:** The DDoS alert never fires even during confirmed attack traffic. The alert rule was created but shows "No data" in the portal.

**Root cause:** The alert scope targets the VNet or DDoS plan resource instead of the public IP address. DDoS metrics are emitted by the public IP resource, not the VNet.

**Diagnosis:**

```bash
az monitor metrics alert show \
    --name alert-ddos-attack-detected \
    --resource-group rg-ddos-lab \
    --query "scopes"
```

If the scope contains `/providers/Microsoft.Network/virtualNetworks/` or `/providers/Microsoft.Network/ddosProtectionPlans/`, the alert is targeting the wrong resource.

**Fix:** Delete and recreate the alert with the correct scope (the public IP resource ID):

```bash
az monitor metrics alert delete \
    --name alert-ddos-attack-detected \
    --resource-group rg-ddos-lab

PIP_ID=$(az network public-ip show \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --query "id" --output tsv)

az monitor metrics alert create \
    --name alert-ddos-attack-detected \
    --resource-group rg-ddos-lab \
    --scopes "$PIP_ID" \
    --condition "max IfUnderDDoSAttack >= 1" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --severity 1 \
    --description "DDoS attack detected on pip-web-frontend"
```

### Scenario 3: DDoS diagnostic logs not appearing in Log Analytics

**Symptom:** After enabling DDoS IP Protection, the team configured diagnostic settings but no logs appear in the workspace even after a simulated attack.

**Root cause:** The diagnostic setting uses incorrect log category names (typos or outdated category names).

**Diagnosis:**

```bash
az monitor diagnostic-settings show \
    --name diag-ddos-logs \
    --resource "$PIP_ID" \
    --query "logs[].{category:category, enabled:enabled}"
```

Verify the categories match exactly: `DDoSProtectionNotifications`, `DDoSMitigationFlowLogs`, `DDoSMitigationReports`. Common mistakes include using `DDOSProtectionNotifications` (wrong capitalization) or `DDoSFlowLogs` (wrong name).

**Fix:** Delete and recreate with the correct category names:

```bash
az monitor diagnostic-settings delete \
    --name diag-ddos-logs \
    --resource "$PIP_ID"

az monitor diagnostic-settings create \
    --name diag-ddos-logs \
    --resource "$PIP_ID" \
    --workspace "$WORKSPACE_ID" \
    --logs '[
      {"category": "DDoSProtectionNotifications", "enabled": true},
      {"category": "DDoSMitigationFlowLogs", "enabled": true},
      {"category": "DDoSMitigationReports", "enabled": true}
    ]' \
    --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

---

## Cleanup

Remove all resources created in this challenge:

```bash
az group delete \
    --name rg-ddos-lab \
    --yes \
    --no-wait
```

:::warning

If you enabled DDoS IP Protection and do not delete the public IP, you will continue to be billed $199/month for that resource. Verify deletion completed:

```bash
az group show --name rg-ddos-lab 2>/dev/null || echo "Resource group deleted"
```

:::

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-13-q1",
    question: "Your organization has 5 public IP addresses that need DDoS protection with metrics and alerting. Which DDoS protection tier is most cost-effective?",
    options: [
      "DDoS Infrastructure Protection (free tier)",
      "DDoS IP Protection at $199/resource/month",
      "DDoS Network Protection at $2,944/month",
      "Azure Firewall Premium with DDoS built-in"
    ],
    correctIndex: 1,
    explanation: "DDoS IP Protection at $199/resource/month for 5 IPs costs $995/month. DDoS Network Protection costs $2,944/month flat regardless of the number of IPs. Since 5 x $199 = $995 < $2,944, IP Protection is more cost-effective. The break-even point is approximately 15 public IPs ($199 x 15 = $2,985)."
  },
  {
    id: "az700-13-q2",
    question: "Which metric should you alert on to detect an active DDoS attack against a public IP address?",
    options: [
      "BytesInDDoS on the VNet resource",
      "IfUnderDDoSAttack on the public IP resource",
      "DDoSAttackActive on the DDoS Protection plan",
      "NetworkSecurityGroupEvent on the NSG"
    ],
    correctIndex: 1,
    explanation: "The IfUnderDDoSAttack metric is emitted by the public IP address resource (namespace Microsoft.Network/publicIPAddresses). It returns 1 when an attack is actively being mitigated and 0 otherwise. DDoS metrics are not available on VNet or DDoS plan resources."
  },
  {
    id: "az700-13-q3",
    question: "You configured DDoS diagnostic settings on a public IP, but DDoSMitigationFlowLogs never appear in your Log Analytics workspace. The public IP has DDoS IP Protection enabled. What is the most likely reason?",
    options: [
      "The diagnostic setting category name has a typo",
      "Mitigation flow logs are only generated during an active DDoS attack",
      "DDoS IP Protection does not support flow logs",
      "Log Analytics cannot ingest DDoS logs directly"
    ],
    correctIndex: 1,
    explanation: "DDoSMitigationFlowLogs are only generated when DDoS mitigation is actively occurring (during an attack). If no attack has occurred since enabling diagnostic settings, no flow logs will be generated. DDoSProtectionNotifications also only appear when mitigation starts or stops. This is expected behavior, not a misconfiguration."
  },
  {
    id: "az700-13-q4",
    question: "Which DDoS protection tier provides access to the DDoS Rapid Response (DRR) team and cost protection guarantees?",
    options: [
      "DDoS Infrastructure Protection",
      "DDoS IP Protection",
      "DDoS Network Protection",
      "Both IP Protection and Network Protection"
    ],
    correctIndex: 2,
    explanation: "Only DDoS Network Protection ($2,944/month) includes access to the DDoS Rapid Response team for expert assistance during attacks and cost protection (credits for resource scale-out costs incurred during a DDoS attack). DDoS IP Protection provides metrics, alerts, and mitigation reports but not DRR or cost protection."
  },
  {
    id: "az700-13-q5",
    question: "You want to enable DDoS protection on an existing public IP address using Azure CLI. Which command is correct?",
    options: [
      "az network public-ip update --name pip-web --resource-group rg --ddos-protection true",
      "az network public-ip update --name pip-web --resource-group rg --ddos-protection-mode Enabled",
      "az network ddos-protection associate --public-ip pip-web --resource-group rg",
      "az network vnet update --name vnet --resource-group rg --ddos-protection-plan myPlan"
    ],
    correctIndex: 1,
    explanation: "The correct command uses --ddos-protection-mode Enabled on az network public-ip update to enable DDoS IP Protection on an existing public IP. The --ddos-protection flag (without -mode) is used on az network vnet update for Network Protection plans. There is no az network ddos-protection associate command."
  },
  {
    id: "az700-13-q6",
    question: "In Microsoft Defender for Cloud, what does an 'attack path' represent?",
    options: [
      "The network route packets take from source to destination",
      "A chain of security weaknesses an attacker could exploit to reach a sensitive resource",
      "The historical timeline of a detected DDoS attack",
      "The list of firewall rules traffic traverses"
    ],
    correctIndex: 1,
    explanation: "An attack path in Defender for Cloud represents a chain of exploitable vulnerabilities and misconfigurations that an attacker could use to move from an entry point (such as an internet-exposed VM) to a high-value target (such as a database or storage account with sensitive data). Attack paths help prioritize remediation by showing which combinations of issues create the highest risk."
  }
]} />

---

## Additional resources

- [Azure DDoS Protection overview](https://learn.microsoft.com/azure/ddos-protection/ddos-protection-overview)
- [Manage DDoS IP Protection - CLI](https://learn.microsoft.com/azure/ddos-protection/manage-ddos-ip-protection-cli)
- [Manage DDoS Network Protection - CLI](https://learn.microsoft.com/azure/ddos-protection/manage-ddos-protection-cli)
- [Azure DDoS Protection monitoring data reference](https://learn.microsoft.com/azure/ddos-protection/monitor-ddos-protection-reference)
- [Configure DDoS diagnostic logs](https://learn.microsoft.com/azure/ddos-protection/diagnostic-logging)
- [Defender for Cloud Secure Score](https://learn.microsoft.com/azure/defender-for-cloud/secure-score-security-controls)
- [Cloud Security Explorer](https://learn.microsoft.com/azure/defender-for-cloud/how-to-manage-cloud-security-explorer)
