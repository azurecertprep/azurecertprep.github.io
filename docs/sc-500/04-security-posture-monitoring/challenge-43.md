---
sidebar_position: 43
title: "Challenge 43: Defender Vulnerability Management and EASM"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 43: Defender Vulnerability Management and EASM

## Exam skills covered

- Configure Microsoft Defender Vulnerability Management (DVM)
- Plan and configure External Attack Surface Management (EASM)
- Identify and prioritize vulnerabilities across the environment
- Integrate vulnerability data with Defender for Cloud recommendations

## Scenario

Contoso Ltd's security team has been tasked with gaining visibility into both internal vulnerabilities across their server fleet and their external attack surface visible to adversaries on the internet. You must configure Defender Vulnerability Management to identify and prioritize software vulnerabilities, and set up External Attack Surface Management (EASM) to discover internet-facing assets that could be exploited.

---

## Prerequisites

- Azure subscription with Owner or Security Admin role
- Azure CLI installed and authenticated
- Defender for Servers Plan 2 enabled (for DVM integration)
- At least one VM with known software installed

---

## Task 1: Verify Defender Vulnerability Management integration

Confirm DVM is active as part of Defender for Servers and review discovered vulnerabilities.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-vuln-lab"
LOCATION="eastus"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Verify Defender for Servers P2 is enabled (includes DVM)
az security pricing show --name VirtualMachines \
  --query "{Plan:name, Tier:pricingTier, SubPlan:subPlan}" -o table

# List vulnerability assessment findings via Sub-Assessments
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/subAssessments?api-version=2019-01-01-preview" \
  --query "value[?properties.status.code=='Unhealthy'].{CVE:properties.id, Severity:properties.status.severity, Description:properties.displayName}" -o table \
  | head -20

# Get vulnerability summary per resource
az graph query -q "
  securityresources
  | where type == 'microsoft.security/assessments/subassessments'
  | where properties.status.code == 'Unhealthy'
  | extend severity = tostring(properties.additionalData.severity)
  | summarize VulnCount=count() by severity
  | order by VulnCount desc
" -o table
```

## Task 2: Query software inventory

Use the security API to list discovered software and identify outdated versions.

```bash
# Query software inventory across VMs using Resource Graph
az graph query -q "
  securityresources
  | where type == 'microsoft.security/assessments/subassessments'
  | where properties.category == 'Software'
  | extend software = tostring(properties.displayName),
           version = tostring(properties.additionalData.version),
           cve = tostring(properties.id)
  | project software, version, cve
  | take 30
" -o table

# Find VMs with critical vulnerabilities
az graph query -q "
  securityresources
  | where type == 'microsoft.security/assessments/subassessments'
  | where properties.status.code == 'Unhealthy'
  | where properties.additionalData.severity == 'Critical'
  | extend resourceId = tostring(properties.resourceDetails.id)
  | summarize CriticalVulns=count() by resourceId
  | order by CriticalVulns desc
  | take 10
" -o table
```

## Task 3: Create a vulnerability assessment baseline

Configure exceptions for accepted risks to reduce alert noise.

```bash
# Create a vulnerability assessment rule to suppress a known accepted risk
# This marks a specific CVE as "Not Applicable" for a resource
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Compute/virtualMachines/vm-contoso-prod01/providers/Microsoft.Security/assessments/vulnerabilityAssessment/rules/CVE-2023-0001?api-version=2019-01-01-preview" \
  --body '{
    "properties": {
      "status": {
        "code": "NotApplicable",
        "cause": "AcceptedRisk",
        "description": "Compensating control in place - network segmentation prevents exploitation"
      },
      "expiresOn": "2025-12-31T00:00:00Z"
    }
  }' 2>/dev/null || echo "Note: Replace CVE-2023-0001 with an actual CVE from your environment"

echo "Baseline rule created - CVE will be suppressed in findings"
```

## Task 4: Deploy External Attack Surface Management (EASM)

Create an EASM workspace to discover Contoso's internet-facing assets.

```bash
# Register the EASM resource provider
az provider register --namespace Microsoft.Easm --wait

# Create an EASM workspace
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Easm/workspaces/easm-contoso?api-version=2024-03-01-preview" \
  --body "{
    \"location\": \"${LOCATION}\",
    \"properties\": {}
  }"

# Verify EASM workspace creation
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Easm/workspaces/easm-contoso?api-version=2024-03-01-preview" \
  --query "{Name:name, Location:location, State:properties.provisioningState}" -o table
```

## Task 5: Configure EASM discovery seeds

Add discovery seeds (domains, IP ranges) to start external surface mapping.

```bash
# Get the EASM workspace endpoint
EASM_ENDPOINT=$(az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Easm/workspaces/easm-contoso?api-version=2024-03-01-preview" \
  --query "properties.dataPlaneEndpoint" -o tsv)

echo "EASM Data Plane Endpoint: ${EASM_ENDPOINT}"

# Create a discovery group with seed assets
# Note: Uses the EASM data plane API
az rest --method PUT \
  --uri "${EASM_ENDPOINT}/discoGroups/contoso-discovery?api-version=2024-03-01-preview" \
  --body '{
    "description": "Contoso external discovery",
    "seeds": [
      {"kind": "domain", "name": "contoso.com"},
      {"kind": "domain", "name": "contoso.io"},
      {"kind": "ipBlock", "name": "203.0.113.0/24"}
    ],
    "frequencyMilliseconds": 604800000
  }' \
  --headers "Content-Type=application/json" 2>/dev/null || echo "Note: Replace domains with actual Contoso domains"

# Run the discovery
az rest --method POST \
  --uri "${EASM_ENDPOINT}/discoGroups/contoso-discovery:run?api-version=2024-03-01-preview" \
  --body '{}' 2>/dev/null || echo "Discovery initiated"
```

## Task 6: Review EASM discovered assets

Query discovered assets and their risk scores.

```bash
# List discovered assets (after discovery completes)
az rest --method GET \
  --uri "${EASM_ENDPOINT}/assets?api-version=2024-03-01-preview&filter=state='confirmed'" \
  --query "value[].{Name:name, Kind:kind, Priority:priority, CreatedDate:createdDate}" -o table 2>/dev/null || echo "Note: Results appear after discovery scan completes (may take hours)"

# Query high-priority assets
az rest --method GET \
  --uri "${EASM_ENDPOINT}/assets?api-version=2024-03-01-preview&filter=priority='high'" \
  --query "value[].{Name:name, Kind:kind, Reason:reason}" -o table 2>/dev/null || echo "Query high-priority external assets"

# Get summary of attack surface
az rest --method GET \
  --uri "${EASM_ENDPOINT}/reports/assets:getSummary?api-version=2024-03-01-preview" 2>/dev/null || echo "Attack surface summary will be available after first discovery"

echo ""
echo "EASM discoveries include:"
echo "  - Domains and subdomains"
echo "  - IP addresses and CIDR ranges"
echo "  - SSL certificates (expiry, weak algorithms)"
echo "  - Open ports and services"
echo "  - Web applications and technologies"
echo "  - Associated organizations"
```

---

## Break & Fix

### Scenario 1: Vulnerability assessment shows no results for a VM

A VM has been running for a week with Defender for Servers P2 enabled but shows zero vulnerabilities.

<details>
<summary>Show solution</summary>

```bash
# Check if the VM has been scanned
az graph query -q "
  securityresources
  | where type == 'microsoft.security/assessments'
  | where properties.displayName contains 'vulnerability'
  | where properties.resourceDetails.Id contains 'vm-contoso'
  | project Status=properties.status.code, LastScanned=properties.status.statusChangeDate
" -o table

# Common causes:
# 1. Agentless scanning hasn't completed first cycle (up to 24h)
# 2. VM is powered off (agentless scanning requires running VM snapshot)
# 3. VM OS is not supported for agentless scanning

# Check VM power state
az vm get-instance-view --resource-group $RG_NAME --name "vm-contoso-prod01" \
  --query "instanceView.statuses[?starts_with(code,'PowerState')].displayStatus" -o tsv

# Verify agentless scanning extension is enabled
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/pricings/VirtualMachines?api-version=2024-01-01" \
  --query "properties.extensions[?name=='AgentlessVmScanning'].isEnabled" -o tsv

# If agent-based is preferred, install the Qualys extension
az vm extension set \
  --resource-group $RG_NAME \
  --vm-name "vm-contoso-prod01" \
  --name QualysAgent \
  --publisher Qualys
```

</details>

### Scenario 2: EASM discovery returns no assets

The discovery group was created and run but no assets are being discovered.

<details>
<summary>Show solution</summary>

```bash
# Check discovery group status
az rest --method GET \
  --uri "${EASM_ENDPOINT}/discoGroups/contoso-discovery?api-version=2024-03-01-preview" 2>/dev/null

# Common causes:
# 1. Discovery is still running (can take 24-48 hours for full scan)
# 2. Seed domains don't resolve or are parked domains
# 3. IP ranges don't have reverse DNS or hosted services

# Check discovery run status
az rest --method GET \
  --uri "${EASM_ENDPOINT}/discoGroups/contoso-discovery/runs?api-version=2024-03-01-preview" \
  --query "value[0].{State:state, Started:startedDate, Completed:completedDate}" -o table 2>/dev/null

# Verify seeds are reachable
nslookup contoso.com
curl -s -o /dev/null -w "%{http_code}" https://contoso.com

# Try adding more specific seeds (subdomains, known IPs)
# Assets in 'candidate' state need manual confirmation
az rest --method GET \
  --uri "${EASM_ENDPOINT}/assets?api-version=2024-03-01-preview&filter=state='candidate'" 2>/dev/null
```

</details>

### Scenario 3: Vulnerability baseline exception expired but CVE still suppressed

A vulnerability exception was set to expire but findings remain suppressed past the expiry date.

<details>
<summary>Show solution</summary>

```bash
# Check the rule's current status and expiry
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Compute/virtualMachines/vm-contoso-prod01/providers/Microsoft.Security/assessments/vulnerabilityAssessment/rules?api-version=2019-01-01-preview" \
  --query "value[].{CVE:name, Status:properties.status.code, Expires:properties.expiresOn}"

# The issue is that rule expiry evaluation is not real-time
# It processes during the next assessment scan cycle

# Force a fresh assessment by triggering a new scan
# For agentless: wait for next scan cycle (every 12-24 hours)
# For agent-based: restart the assessment agent

# To immediately remove the suppression:
az rest --method DELETE \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Compute/virtualMachines/vm-contoso-prod01/providers/Microsoft.Security/assessments/vulnerabilityAssessment/rules/CVE-2023-0001?api-version=2019-01-01-preview"

echo "Rule deleted - CVE will appear in next scan results"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the primary difference between Defender Vulnerability Management (DVM) and External Attack Surface Management (EASM)?",
    options: [
      "DVM scans internal resources for vulnerabilities; EASM discovers internet-facing assets visible to external attackers",
      "DVM is for Azure only; EASM is for multicloud",
      "DVM is free; EASM requires a separate license",
      "DVM replaces EASM; they cannot be used together"
    ],
    correctIndex: 0,
    explanation: "DVM focuses on discovering and prioritizing software vulnerabilities on internal/managed resources (VMs, containers). EASM takes an attacker's perspective, discovering all internet-facing assets associated with an organization that could be targeted externally."
  },
  {
    question: "How does EASM discover assets associated with an organization?",
    options: [
      "By scanning internal network segments",
      "By starting from seed assets (domains, IPs) and recursively discovering related infrastructure through DNS, WHOIS, certificates, and web crawling",
      "By reading Azure resource inventories",
      "By integrating with the organization's CMDB"
    ],
    correctIndex: 1,
    explanation: "EASM starts from seed assets (domains, IP blocks, known hosts) and recursively discovers related infrastructure by following relationships through DNS records, WHOIS data, SSL certificate SANs, web page links, and other OSINT techniques."
  },
  {
    question: "Which Defender for Servers plan includes Microsoft Defender Vulnerability Management as a built-in capability?",
    options: [
      "Free tier only",
      "Plan 1 (P1)",
      "Plan 2 (P2)",
      "It requires a separate standalone license regardless of plan"
    ],
    correctIndex: 2,
    explanation: "Defender for Servers Plan 2 includes Defender Vulnerability Management as a built-in capability. P1 provides basic vulnerability assessment, but P2 adds the full DVM feature set including software inventory, browser extensions, certificates, and security baselines."
  },
  {
    question: "What happens when an EASM discovery finds an asset in 'candidate' state?",
    options: [
      "It is automatically added to the confirmed inventory",
      "It requires manual review and confirmation before appearing in the attack surface inventory",
      "It is immediately flagged as a security risk",
      "It is deleted after 30 days if not confirmed"
    ],
    correctIndex: 1,
    explanation: "Assets in 'candidate' state have been discovered through relationship mapping but require human review to confirm they belong to the organization. This prevents false positives from shared infrastructure, CDNs, or third-party services appearing in the attack surface."
  }
]} />

## Cleanup

```bash
# Delete EASM workspace
az rest --method DELETE \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Easm/workspaces/easm-contoso?api-version=2024-03-01-preview"

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait

echo "Cleanup complete - EASM workspace and resources deleted"
```
