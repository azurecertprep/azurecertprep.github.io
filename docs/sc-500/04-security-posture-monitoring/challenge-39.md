---
sidebar_position: 39
title: "Challenge 39: Defender CSPM – Risk Identification and Attack Paths"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 39: Defender CSPM – Risk Identification and Attack Paths

## Exam skills covered

- Configure environment settings in Microsoft Defender for Cloud
- Evaluate security posture by using CSPM
- Identify and remediate risks by using attack path analysis
- Configure and manage Cloud Security Posture Management (CSPM)

## Scenario

Contoso Ltd has deployed multiple workloads across Azure including virtual machines, storage accounts, and databases. The CISO has raised concerns about unknown exposure paths that could allow an attacker to reach sensitive data. You have been asked to enable Defender CSPM, evaluate the organization's security posture through Secure Score, and identify attack paths that expose critical assets to internet-facing threats.

---

## Prerequisites

- Azure subscription with Owner or Security Admin role
- Azure CLI installed and authenticated (`az login`)
- At least one running VM and one storage account in the subscription

---

## Task 1: Enable Defender CSPM plan

Enable the Defender CSPM plan on your subscription to activate attack path analysis and cloud security graph features.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Enable Defender CSPM plan
az security pricing create \
  --name CloudPosture \
  --tier Standard

# Verify the plan is enabled
az security pricing show \
  --name CloudPosture \
  --query "{Name:name, Tier:pricingTier, SubPlan:subPlan}" -o table
```

## Task 2: Configure CSPM extensions

Enable agentless scanning and sensitive data discovery to power attack path analysis.

```bash
# Enable agentless scanning extension via REST API
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/pricings/CloudPosture?api-version=2024-01-01" \
  --body '{
    "properties": {
      "pricingTier": "Standard",
      "extensions": [
        {"name": "AgentlessVmScanning", "isEnabled": "True"},
        {"name": "AgentlessDiscoveryForKubernetes", "isEnabled": "True"},
        {"name": "SensitiveDataDiscovery", "isEnabled": "True"},
        {"name": "ContainerRegistriesVulnerabilityAssessments", "isEnabled": "True"}
      ]
    }
  }'

# Verify extensions are active
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/pricings/CloudPosture?api-version=2024-01-01" \
  --query "properties.extensions[].{Name:name, Enabled:isEnabled}" -o table
```

## Task 3: Review Secure Score and recommendations

Query the current Secure Score and list top security recommendations.

```bash
# Get current Secure Score
az security secure-scores list \
  --query "[].{Name:name, Current:score.current, Max:score.max, Percentage:score.percentage}" -o table

# List active security recommendations
az security assessment list \
  --query "[?properties.status.code=='Unhealthy'].{Resource:properties.resourceDetails.id, Recommendation:properties.displayName, Severity:properties.metadata.severity}" -o table \
  | head -30

# Get recommendations by severity
az security assessment list \
  --query "[?properties.status.code=='Unhealthy' && properties.metadata.severity=='High'].{Recommendation:properties.displayName, Resource:properties.resourceDetails.id}" -o table
```

## Task 4: Identify attack paths

Use the cloud security graph to query attack paths that reach sensitive data.

```bash
# List attack paths via REST API
az rest --method POST \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/attackPaths?api-version=2024-01-01" \
  --body '{}' \
  --query "value[].{DisplayName:properties.displayName, Description:properties.description, RiskLevel:properties.riskLevel}" -o table

# Query attack paths targeting internet-exposed VMs
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/attackPaths?api-version=2024-01-01" \
  --query "value[?contains(properties.displayName, 'internet')].{Path:properties.displayName, Risk:properties.riskLevel, EntryPoint:properties.entryPointEntityInformation.entityName}" -o table
```

## Task 5: Query the Cloud Security Graph

Use the security graph to find VMs with public IP and high-severity vulnerabilities.

```bash
# Cloud Security Graph query - find internet-exposed VMs with vulnerabilities
az rest --method POST \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/securityGraph?api-version=2024-01-01" \
  --body '{
    "query": {
      "queryType": "securityGraph",
      "query": "where type == \"microsoft.compute/virtualmachines\" | where properties.networkProfile.publicIpAddresses != null | project name, resourceGroup, vulnerabilityCount = properties.vulnerabilitySummary.highSeverityCount"
    }
  }'
```

## Task 6: Remediate a high-risk recommendation

Apply a governance rule to auto-assign recommendations and remediate a finding.

```bash
# Create a governance rule to assign high-severity findings
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/governanceRules/HighSeverityRule?api-version=2022-01-01-preview" \
  --body '{
    "properties": {
      "displayName": "Auto-assign high severity findings",
      "description": "Assign high severity recommendations to security team",
      "rulePriority": 100,
      "isDisabled": false,
      "ruleType": "Integrated",
      "sourceResourceType": "Assessments",
      "conditionSets": [
        {
          "conditions": [
            {"property": "properties.metadata.severity", "value": ["High"], "operator": "In"}
          ]
        }
      ],
      "ownerSource": {
        "type": "ByTag",
        "value": "SecurityOwner"
      },
      "governanceEmailNotification": {
        "disableManagerEmailNotification": false,
        "disableOwnerEmailNotification": false
      },
      "remediationTimeframe": "7.00:00:00"
    }
  }'

echo "Governance rule created - high severity findings will be auto-assigned"
```

---

## Break & Fix

### Scenario 1: Attack paths not appearing after enabling CSPM

You enabled Defender CSPM 30 minutes ago but no attack paths appear in the portal. The extensions show as enabled.

<details>
<summary>Show solution</summary>

```bash
# Attack paths require agentless scanning to complete its first scan (up to 24 hours)
# Verify extensions are properly enabled
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/pricings/CloudPosture?api-version=2024-01-01" \
  --query "properties.extensions[?name=='AgentlessVmScanning'].isEnabled" -o tsv

# Check if there are resources to scan
az vm list --query "[].{Name:name, RG:resourceGroup, PowerState:powerState}" -o table

# Attack path analysis requires:
# 1. AgentlessVmScanning enabled (wait up to 24h for first scan)
# 2. At least one VM or resource with a discoverable vulnerability
# 3. A network path from an entry point to a target
# Force a rescan if needed by disabling/re-enabling the extension
```

</details>

### Scenario 2: Secure Score shows 0% despite having resources

The subscription has multiple resources but Secure Score displays 0%.

<details>
<summary>Show solution</summary>

```bash
# Check if Defender plans are enabled (Secure Score requires at least one plan)
az security pricing list \
  --query "[?pricingTier=='Standard'].name" -o tsv

# If no plans show Standard, enable at minimum the free tier assessments
az security pricing create --name VirtualMachines --tier Standard

# Also verify the subscription is registered with Security provider
az provider show --namespace Microsoft.Security --query "registrationState" -o tsv

# If not registered:
az provider register --namespace Microsoft.Security

# Secure Score takes 4-8 hours to populate after initial enablement
# Verify assessments are being generated
az security assessment list --query "length(@)"
```

</details>

### Scenario 3: Governance rule not triggering email notifications

You created a governance rule but team members are not receiving assignment emails.

<details>
<summary>Show solution</summary>

```bash
# Verify the governance rule configuration
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/governanceRules?api-version=2022-01-01-preview" \
  --query "value[].{Name:properties.displayName, Disabled:properties.isDisabled, EmailOwner:properties.governanceEmailNotification.disableOwnerEmailNotification}" -o table

# Common issues:
# 1. ownerSource is ByTag but resources don't have the specified tag
# Check resources for the SecurityOwner tag
az resource list --query "[?tags.SecurityOwner != null].{Name:name, Owner:tags.SecurityOwner}" -o table

# 2. Fix: Tag a resource with the security owner
az resource tag --ids <resource-id> --tags SecurityOwner=security-team@contoso.com

# 3. Verify email notification is not disabled
# disableOwnerEmailNotification should be false
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is required for Defender CSPM to generate attack path analysis?",
    options: [
      "Only the Free tier of Defender for Cloud",
      "Defender CSPM Standard plan with agentless scanning enabled",
      "Log Analytics agent installed on all VMs",
      "Azure Monitor agent with DCR configured"
    ],
    correctIndex: 1,
    explanation: "Attack path analysis requires the Defender CSPM Standard plan with the AgentlessVmScanning extension enabled. It uses agentless scanning to discover vulnerabilities without requiring agents on VMs."
  },
  {
    question: "How long does it typically take for attack paths to appear after enabling Defender CSPM?",
    options: [
      "Immediately (within minutes)",
      "1-2 hours",
      "Up to 24 hours for the first scan cycle",
      "7 days"
    ],
    correctIndex: 2,
    explanation: "After enabling Defender CSPM, the first agentless scan cycle can take up to 24 hours to complete. Attack paths are generated after scan data is processed through the cloud security graph."
  },
  {
    question: "Which component in Defender CSPM maps relationships between resources to identify lateral movement risks?",
    options: [
      "Azure Policy engine",
      "Cloud Security Graph",
      "Azure Resource Graph",
      "Microsoft Sentinel UEBA"
    ],
    correctIndex: 1,
    explanation: "The Cloud Security Graph maps relationships between cloud resources (network connectivity, permissions, vulnerabilities) to identify potential attack paths that an adversary could use for lateral movement."
  },
  {
    question: "A governance rule in Defender for Cloud can automatically assign recommendations based on which criteria?",
    options: [
      "Only resource type",
      "Only severity level",
      "Severity, resource type, or custom conditions with tag-based owner assignment",
      "Only the subscription scope"
    ],
    correctIndex: 2,
    explanation: "Governance rules support flexible condition sets including severity, resource type, and custom conditions. They assign ownership via tags, specific users, or managers, and set remediation timeframes."
  }
]} />

## Cleanup

```bash
# Disable Defender CSPM (stops billing)
az security pricing create --name CloudPosture --tier Free

# Remove governance rule
az rest --method DELETE \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/governanceRules/HighSeverityRule?api-version=2022-01-01-preview"

echo "Cleanup complete - Defender CSPM disabled"
```
