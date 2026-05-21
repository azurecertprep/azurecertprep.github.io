---
sidebar_position: 40
title: "Challenge 40: Compliance Evaluation with Security Frameworks"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 40: Compliance Evaluation with Security Frameworks

## Exam skills covered

- Evaluate compliance against security frameworks (NIST, CIS, PCI-DSS)
- Configure regulatory compliance policies
- Design and manage compliance dashboards
- Assign and remediate compliance recommendations

## Scenario

Contoso Ltd is pursuing PCI-DSS certification for their payment processing workloads and must demonstrate NIST SP 800-53 compliance for government contracts. The compliance team needs you to configure regulatory compliance standards in Defender for Cloud, assign custom initiatives, and generate compliance reports showing the current posture against these frameworks.

---

## Prerequisites

- Azure subscription with Owner or Security Admin role
- Azure CLI installed and authenticated
- Microsoft Defender for Cloud enabled (at least one plan)

---

## Task 1: Add regulatory compliance standards

Assign the PCI-DSS and NIST SP 800-53 compliance standards to your subscription.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-compliance-lab"

# Create resource group for lab resources
az group create --name $RG_NAME --location eastus

# Assign PCI-DSS v4.0 regulatory compliance standard
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/regulatoryComplianceStandards/PCI-DSS-4.0?api-version=2024-01-01" \
  --body '{"properties": {"state": "Enabled"}}'

# Assign NIST SP 800-53 Rev. 5
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/regulatoryComplianceStandards/NIST-SP-800-53-Rev5?api-version=2024-01-01" \
  --body '{"properties": {"state": "Enabled"}}'

# List enabled compliance standards
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/regulatoryComplianceStandards?api-version=2024-01-01" \
  --query "value[?properties.state=='Enabled'].{Standard:name, State:properties.state, PassedControls:properties.passedControls, FailedControls:properties.failedControls}" -o table
```

## Task 2: Review compliance posture per control

Examine compliance controls and identify failed assessments for PCI-DSS.

```bash
# List PCI-DSS controls and their state
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/regulatoryComplianceStandards/PCI-DSS-4.0/regulatoryComplianceControls?api-version=2024-01-01" \
  --query "value[?properties.state=='Failed'].{Control:name, Description:properties.description, PassedAssessments:properties.passedAssessments, FailedAssessments:properties.failedAssessments}" -o table \
  | head -20

# Drill into a specific control's assessments
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/regulatoryComplianceStandards/PCI-DSS-4.0/regulatoryComplianceControls/PCI-DSS-4.0-1.2/regulatoryComplianceAssessments?api-version=2024-01-01" \
  --query "value[].{Assessment:name, State:properties.state, Description:properties.description}" -o table
```

## Task 3: Create a custom security initiative

Create a custom policy initiative for Contoso's additional compliance requirements.

```bash
# Create a custom policy initiative (initiative definition)
az policy set-definition create \
  --name "contoso-data-protection" \
  --display-name "Contoso Data Protection Standard" \
  --description "Custom compliance standard for Contoso data handling requirements" \
  --definitions '[
    {
      "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/0961003e-5a0a-4549-abde-af6a37f2724d",
      "policyDefinitionReferenceId": "storageEncryption"
    },
    {
      "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/17a78e20-9358-41c9-923c-fb736d382a4d",
      "policyDefinitionReferenceId": "sqlAuditing"
    },
    {
      "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/1f314764-cb73-4fc9-b863-8eca98ac36e9",
      "policyDefinitionReferenceId": "diagnosticSettings"
    }
  ]' \
  --metadata '{"category": "Regulatory Compliance", "version": "1.0.0"}'

# Assign the initiative to the subscription
az policy assignment create \
  --name "contoso-data-protection-assignment" \
  --display-name "Contoso Data Protection Standard" \
  --policy-set-definition "contoso-data-protection" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}"
```

## Task 4: Configure compliance exemptions

Create an exemption for a resource that has compensating controls in place.

```bash
# Create a policy exemption for a specific resource with compensating controls
az policy exemption create \
  --name "legacy-storage-exemption" \
  --display-name "Legacy Storage - Compensating Controls" \
  --description "This storage account uses application-layer encryption as a compensating control" \
  --exemption-category Mitigated \
  --policy-assignment "contoso-data-protection-assignment" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}" \
  --expires-on "2025-12-31T00:00:00Z"

# List active exemptions
az policy exemption list \
  --query "[].{Name:name, Category:exemptionCategory, Expires:expiresOn, Scope:scope}" -o table
```

## Task 5: Export compliance data for auditors

Generate a compliance report and export assessment results.

```bash
# Export compliance state via Resource Graph
az graph query -q "
  securityresources
  | where type == 'microsoft.security/regulatorycompliancestandards/regulatorycompliancecontrols/regulatorycomplianceassessments'
  | where properties.regulatoryComplianceStandardName == 'PCI-DSS-4.0'
  | summarize PassedCount=countif(properties.state == 'Passed'),
              FailedCount=countif(properties.state == 'Failed'),
              SkippedCount=countif(properties.state == 'Skipped')
" -o table

# Export all failed assessments for audit trail
az graph query -q "
  securityresources
  | where type == 'microsoft.security/regulatorycompliancestandards/regulatorycompliancecontrols/regulatorycomplianceassessments'
  | where properties.state == 'Failed'
  | project StandardName=properties.regulatoryComplianceStandardName,
            Control=properties.regulatoryComplianceControlName,
            AssessmentName=name,
            Description=properties.description
  | order by StandardName, Control
" --first 50 -o table
```

## Task 6: Set up continuous compliance monitoring

Configure continuous export to stream compliance changes to Log Analytics.

```bash
# Create Log Analytics workspace for compliance data
az monitor log-analytics workspace create \
  --workspace-name "law-contoso-compliance" \
  --resource-group $RG_NAME \
  --location eastus

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name "law-contoso-compliance" \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Configure continuous export for regulatory compliance
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/automations/export-compliance?api-version=2023-12-01-preview" \
  --body "{
    \"location\": \"eastus\",
    \"properties\": {
      \"isEnabled\": true,
      \"scopes\": [{\"scopePath\": \"/subscriptions/${SUBSCRIPTION_ID}\"}],
      \"sources\": [{
        \"eventSource\": \"RegulatoryComplianceAssessment\",
        \"ruleSets\": [{
          \"rules\": [{
            \"propertyJPath\": \"properties.state\",
            \"propertyType\": \"String\",
            \"expectedValue\": \"Failed\",
            \"operator\": \"Equals\"
          }]
        }]
      }],
      \"actions\": [{
        \"actionType\": \"LogAnalytics\",
        \"workspaceResourceId\": \"${WORKSPACE_ID}\"
      }]
    }
  }"

echo "Continuous export configured - compliance failures will stream to Log Analytics"
```

---

## Break & Fix

### Scenario 1: Compliance standard shows "Not assessed" for all controls

You assigned PCI-DSS but all controls show as "Not assessed" with 0 passed and 0 failed.

<details>
<summary>Show solution</summary>

```bash
# "Not assessed" means no resources match the controls' scope
# This happens when:
# 1. The subscription has no resources (deploy something to assess)
# 2. Defender plans are not enabled for the resource types

# Verify Defender plans are enabled
az security pricing list --query "[].{Plan:name, Tier:pricingTier}" -o table

# Deploy a test resource to trigger assessments
az storage account create \
  --name "stcontosocomptest$(date +%s)" \
  --resource-group $RG_NAME \
  --sku Standard_LRS \
  --location eastus

# Assessments take 4-12 hours to populate after resource creation
# Force a reassessment trigger
az security assessment-metadata list --query "length(@)"
```

</details>

### Scenario 2: Custom initiative not appearing in compliance dashboard

You created and assigned a custom initiative but it doesn't appear under Regulatory Compliance.

<details>
<summary>Show solution</summary>

```bash
# Custom initiatives need specific metadata to appear in compliance dashboard
# The metadata must include "ASC": "true" and category "Regulatory Compliance"

# Update the initiative with correct metadata
az policy set-definition update \
  --name "contoso-data-protection" \
  --metadata '{
    "category": "Regulatory Compliance",
    "ASC": "true",
    "version": "1.0.0"
  }'

# Also verify the assignment exists and is not in a failed state
az policy assignment show \
  --name "contoso-data-protection-assignment" \
  --query "{State:provisioningState, EnforcementMode:enforcementMode}" -o table

# If state is failed, check for missing role assignments
# The managed identity needs Reader role for assessment
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Which metadata property is required for a custom policy initiative to appear in the Defender for Cloud Regulatory Compliance dashboard?",
    options: [
      "\"category\": \"Security Center\"",
      "\"ASC\": \"true\" with category \"Regulatory Compliance\"",
      "\"compliance\": \"enabled\"",
      "\"MDC\": \"true\""
    ],
    correctIndex: 1,
    explanation: "For a custom initiative to appear in the Regulatory Compliance dashboard, the metadata must include '\"ASC\": \"true\"' and the category must be set to 'Regulatory Compliance'."
  },
  {
    question: "What is the difference between a policy exemption category of 'Waiver' vs 'Mitigated'?",
    options: [
      "Waiver means permanently excluded; Mitigated means temporarily excluded",
      "Waiver means the requirement is not applicable; Mitigated means compensating controls exist",
      "There is no difference; both categories function identically",
      "Waiver is for production; Mitigated is for dev/test only"
    ],
    correctIndex: 1,
    explanation: "A 'Waiver' exemption indicates the organization accepts the risk and the requirement doesn't apply. 'Mitigated' indicates compensating controls are in place that satisfy the intent of the policy."
  },
  {
    question: "How does Defender for Cloud's continuous export help with compliance auditing?",
    options: [
      "It generates PDF compliance reports automatically",
      "It streams compliance assessment changes to Log Analytics or Event Hub for continuous monitoring",
      "It sends weekly email digests to auditors",
      "It automatically remediates non-compliant resources"
    ],
    correctIndex: 1,
    explanation: "Continuous export streams compliance assessment state changes to a Log Analytics workspace or Event Hub in near real-time, enabling continuous compliance monitoring, alerting, and audit trail generation."
  }
]} />

## Cleanup

```bash
# Remove policy assignment
az policy assignment delete --name "contoso-data-protection-assignment"

# Remove policy exemption
az policy exemption delete --name "legacy-storage-exemption" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}"

# Remove custom initiative
az policy set-definition delete --name "contoso-data-protection"

# Remove compliance automation
az rest --method DELETE \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/automations/export-compliance?api-version=2023-12-01-preview"

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait

echo "Cleanup complete"
```
