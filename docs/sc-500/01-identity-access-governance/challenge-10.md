---
sidebar_position: 10
title: "Challenge 10: Azure Policy for Security"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 10: Azure Policy for Security

## Exam skills covered

- Implement Azure Policy for security governance
- Assign built-in security policy definitions and initiatives
- Create custom policy definitions for security requirements
- Configure Defender for Cloud security standards and recommendations
- Implement policy exemptions and remediation tasks
- Monitor policy compliance and drift

## Scenario

Contoso Ltd's cloud governance team discovered that development teams have been deploying resources without proper security configurations — Key Vaults without soft-delete, storage accounts with public access, VMs without disk encryption, and resources without required tags. The CISO mandates implementing Azure Policy to enforce security baselines at scale, align with Microsoft Cloud Security Benchmark (MCSB), and create custom policies for Contoso-specific security requirements that aren't covered by built-in definitions.

---

## Prerequisites

- Azure subscription with Owner or Resource Policy Contributor role
- Azure CLI installed and authenticated
- Understanding of Azure Resource Manager (ARM) templates
- Defender for Cloud enabled on the subscription

---

## Task 1: Assign the Microsoft Cloud Security Benchmark initiative

Apply the MCSB initiative to establish a comprehensive security baseline.

```bash
# Set variables
SUB_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-policy-lab"
LOCATION="eastus2"

# Create resource group for testing
az group create --name $RG_NAME --location $LOCATION

# List available security initiatives (policy sets)
az policy set-definition list --query "[?contains(displayName,'Microsoft cloud security benchmark') || contains(displayName,'Azure Security Benchmark')].{name:name, displayName:displayName}" -o table

# Assign the Microsoft Cloud Security Benchmark at subscription level
az policy assignment create \
  --name "mcsb-assignment" \
  --display-name "Microsoft Cloud Security Benchmark" \
  --policy-set-definition "1f3afdf9-d0c9-4c3d-847f-89da613e70a8" \
  --scope "/subscriptions/$SUB_ID" \
  --enforcement-mode Default \
  --identity-type SystemAssigned \
  --location $LOCATION

# Verify the assignment
az policy assignment show --name "mcsb-assignment" \
  --query "{name:displayName, enforcement:enforcementMode, scope:scope}" -o json

# Check compliance state (may take 30+ minutes for initial evaluation)
az policy state summarize \
  --policy-assignment "mcsb-assignment" \
  --query "{compliant:results.resourceDetails[?complianceState=='compliant'].count, nonCompliant:results.resourceDetails[?complianceState=='noncompliant'].count}" 2>/dev/null || echo "Compliance evaluation pending"
```

## Task 2: Assign built-in security policies with Deny effect

Enforce critical security configurations that should never be violated.

```bash
# Policy: Deny Key Vaults without soft-delete
az policy assignment create \
  --name "deny-kv-no-softdelete" \
  --display-name "Deny Key Vaults without soft-delete" \
  --policy "1e66c121-a66a-4b1f-9b83-0fd5dd164d6e" \
  --scope "/subscriptions/$SUB_ID" \
  --enforcement-mode Default

# Policy: Deny storage accounts that allow public blob access
az policy assignment create \
  --name "deny-storage-public-access" \
  --display-name "Deny storage accounts with public access" \
  --policy "4fa4b6c0-31ca-4c0d-b10d-24b96f62a751" \
  --scope "/subscriptions/$SUB_ID" \
  --enforcement-mode Default

# Policy: Deny VMs without managed disks
az policy assignment create \
  --name "deny-vm-unmanaged-disks" \
  --display-name "Deny VMs with unmanaged disks" \
  --policy "06a78e20-9358-41c9-923c-fb736d382a4d" \
  --scope "/subscriptions/$SUB_ID" \
  --enforcement-mode Default

# Policy: Require specific tags on resource groups
az policy assignment create \
  --name "require-env-tag" \
  --display-name "Require Environment tag on resource groups" \
  --policy "96670d01-0a4d-4649-9c89-2d3abc0a5025" \
  --scope "/subscriptions/$SUB_ID" \
  --params '{"tagName":{"value":"Environment"}}' \
  --enforcement-mode Default

# Policy: Deny public IP addresses (network isolation)
az policy assignment create \
  --name "deny-public-ip" \
  --display-name "Deny public IP creation in production" \
  --policy "6c112d4e-5bc7-47ae-a041-ea2d9dccd749" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME" \
  --enforcement-mode Default

# List all policy assignments on the subscription
az policy assignment list --scope "/subscriptions/$SUB_ID" \
  --query "[?contains(displayName,'Deny') || contains(displayName,'Require')].{name:displayName, enforcement:enforcementMode}" -o table
```

## Task 3: Create a custom policy definition

Create custom policies for Contoso-specific requirements not covered by built-in definitions.

```bash
# Custom Policy: Deny Key Vaults without RBAC authorization enabled
az policy definition create \
  --name "deny-kv-no-rbac" \
  --display-name "Deny Key Vaults without RBAC authorization" \
  --description "Ensures all Key Vaults use RBAC authorization instead of access policies" \
  --rules '{
    "if": {
      "allOf": [
        {
          "field": "type",
          "equals": "Microsoft.KeyVault/vaults"
        },
        {
          "field": "Microsoft.KeyVault/vaults/enableRbacAuthorization",
          "notEquals": true
        }
      ]
    },
    "then": {
      "effect": "deny"
    }
  }' \
  --mode All

# Custom Policy: Audit resources without approved encryption
az policy definition create \
  --name "audit-missing-encryption-tag" \
  --display-name "Audit resources without encryption classification tag" \
  --description "Identifies resources missing the DataClassification tag required by Contoso security policy" \
  --rules '{
    "if": {
      "allOf": [
        {
          "field": "type",
          "in": [
            "Microsoft.Storage/storageAccounts",
            "Microsoft.Sql/servers/databases",
            "Microsoft.KeyVault/vaults"
          ]
        },
        {
          "field": "tags['\''DataClassification'\'']",
          "exists": false
        }
      ]
    },
    "then": {
      "effect": "audit"
    }
  }' \
  --mode All

# Custom Policy: Deny resources in non-approved regions
az policy definition create \
  --name "deny-non-approved-regions" \
  --display-name "Restrict resources to approved regions" \
  --description "Only allows resource creation in Contoso-approved Azure regions" \
  --rules '{
    "if": {
      "not": {
        "field": "location",
        "in": "[parameters('"'"'allowedLocations'"'"')]"
      }
    },
    "then": {
      "effect": "deny"
    }
  }' \
  --params '{
    "allowedLocations": {
      "type": "Array",
      "metadata": {
        "displayName": "Allowed Locations",
        "description": "List of Azure regions where resources can be deployed"
      },
      "defaultValue": ["eastus2", "centralus", "westeurope", "northeurope"]
    }
  }' \
  --mode All

# Assign the custom Key Vault RBAC policy
az policy assignment create \
  --name "deny-kv-no-rbac" \
  --display-name "Deny Key Vaults without RBAC authorization" \
  --policy "deny-kv-no-rbac" \
  --scope "/subscriptions/$SUB_ID" \
  --enforcement-mode Default
```

## Task 4: Create a custom policy initiative

Bundle multiple security policies into a Contoso-specific security initiative.

```bash
# Create the initiative (policy set) definition
az policy set-definition create \
  --name "contoso-security-baseline" \
  --display-name "Contoso Security Baseline" \
  --description "Contoso-specific security requirements for all Azure resources" \
  --definitions "[
    {
      \"policyDefinitionId\": \"/subscriptions/$SUB_ID/providers/Microsoft.Authorization/policyDefinitions/deny-kv-no-rbac\",
      \"policyDefinitionReferenceId\": \"kvRbacRequired\"
    },
    {
      \"policyDefinitionId\": \"/subscriptions/$SUB_ID/providers/Microsoft.Authorization/policyDefinitions/audit-missing-encryption-tag\",
      \"policyDefinitionReferenceId\": \"encryptionTagRequired\"
    },
    {
      \"policyDefinitionId\": \"/providers/Microsoft.Authorization/policyDefinitions/1e66c121-a66a-4b1f-9b83-0fd5dd164d6e\",
      \"policyDefinitionReferenceId\": \"kvSoftDeleteRequired\"
    },
    {
      \"policyDefinitionId\": \"/providers/Microsoft.Authorization/policyDefinitions/0a914e76-4921-4c19-b460-a2d36003525a\",
      \"policyDefinitionReferenceId\": \"kvDiagnosticsRequired\"
    }
  ]" \
  --metadata '{"category":"Security","version":"1.0.0"}'

# Assign the initiative
az policy assignment create \
  --name "contoso-security-baseline" \
  --display-name "Contoso Security Baseline Initiative" \
  --policy-set-definition "contoso-security-baseline" \
  --scope "/subscriptions/$SUB_ID" \
  --enforcement-mode Default \
  --identity-type SystemAssigned \
  --location $LOCATION
```

## Task 5: Configure Defender for Cloud recommendations and standards

Align Defender for Cloud with custom security standards and manage recommendations.

```bash
# List current security standards applied
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/securityStandards?api-version=2024-08-01" \
  --headers "Content-Type=application/json" \
  --query "value[].{name:properties.displayName, state:properties.state}" 2>/dev/null || \
az security regulatory-compliance-standards list \
  --query "[].{standard:name, state:state}" -o table 2>/dev/null || echo "Check Defender for Cloud portal for standards"

# Get unhealthy recommendations
az security assessment list \
  --query "[?status.code=='Unhealthy'].{recommendation:displayName, severity:metadata.severity, resource:resourceDetails.id}" -o table 2>/dev/null

# Exempt a resource from a specific recommendation (with justification)
az policy exemption create \
  --name "exempt-test-rg-from-tag" \
  --policy-assignment "require-env-tag" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME" \
  --exemption-category "Waiver" \
  --description "Test resource group for policy lab - exempt from tag requirement" \
  --expires-on "2025-12-31T23:59:59Z"

# Configure auto-provisioning for Defender recommendations
az security auto-provisioning-setting update \
  --name "default" \
  --auto-provision "On"

# List all exemptions
az policy exemption list \
  --scope "/subscriptions/$SUB_ID" \
  --query "[].{name:displayName, category:exemptionCategory, expires:expiresOn}" -o table
```

## Task 6: Implement remediation tasks for non-compliant resources

Create remediation tasks to bring existing resources into compliance.

```bash
# Check which policies support remediation (DeployIfNotExists or Modify)
az policy assignment list --scope "/subscriptions/$SUB_ID" \
  --query "[?identity.type=='SystemAssigned'].{name:displayName, identity:identity.principalId}" -o table

# Create a remediation task for Key Vault diagnostics
az policy remediation create \
  --name "remediate-kv-diagnostics" \
  --policy-assignment "contoso-security-baseline" \
  --definition-reference-id "kvDiagnosticsRequired" \
  --scope "/subscriptions/$SUB_ID" \
  --resource-discovery-mode ReEvaluateCompliance

# Check remediation task status
az policy remediation show \
  --name "remediate-kv-diagnostics" \
  --scope "/subscriptions/$SUB_ID" \
  --query "{status:provisioningState, deployed:deploymentStatus.totalDeployments, succeeded:deploymentStatus.successfulDeployments, failed:deploymentStatus.failedDeployments}" -o json

# Trigger on-demand policy evaluation for faster feedback
az policy state trigger-scan \
  --resource-group $RG_NAME \
  --no-wait

# View non-compliant resources
az policy state list \
  --policy-assignment "contoso-security-baseline" \
  --filter "complianceState eq 'NonCompliant'" \
  --query "[].{resource:resourceId, policy:policyDefinitionName}" -o table 2>/dev/null

# Get overall compliance summary
az policy state summarize \
  --query "value[0].results.{total:totalResources, compliant:resourceDetails[?complianceState=='compliant'].count | [0], nonCompliant:resourceDetails[?complianceState=='noncompliant'].count | [0]}" 2>/dev/null || echo "Compliance data still evaluating"
```

---

## Break & Fix

### Scenario 1: Policy blocks legitimate resource deployment

A developer cannot create a Key Vault for their development environment because the custom "deny-kv-no-rbac" policy is blocking it. The developer's ARM template creates the Key Vault with access policies (legacy pattern).

<details>
<summary>Show solution</summary>

```bash
# Option 1: Update the developer's template to include RBAC authorization
# In the ARM template, add: "enableRbacAuthorization": true

# Option 2: Create a policy exemption for the dev resource group
# Note: date -u -d syntax requires GNU date (Linux/Cloud Shell)
az policy exemption create \
  --name "exempt-dev-kv-rbac" \
  --policy-assignment "deny-kv-no-rbac" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/rg-dev-team" \
  --exemption-category "Waiver" \
  --description "Dev team transitioning to RBAC - temporary exemption while updating templates" \
  --expires-on "$(date -u -d '+30 days' +%Y-%m-%dT%H:%M:%SZ)"

# Option 3: Change policy enforcement to audit-only for dev subscriptions
az policy assignment update \
  --name "deny-kv-no-rbac" \
  --enforcement-mode DoNotEnforce \
  --scope "/subscriptions/$SUB_ID/resourceGroups/rg-dev-team" 2>/dev/null || \
az policy assignment create \
  --name "audit-kv-no-rbac-dev" \
  --display-name "Audit Key Vaults without RBAC (dev)" \
  --policy "deny-kv-no-rbac" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/rg-dev-team" \
  --enforcement-mode DoNotEnforce

# Best practice: Use management groups with different policies per environment
# Production MG: Deny effect
# Development MG: Audit effect
echo "Recommended: Apply different enforcement per environment using Management Groups"
```

</details>

### Scenario 2: Policy compliance shows 0% but resources appear configured correctly

A storage account has public access disabled in its settings, but Azure Policy still reports it as non-compliant with the "deny-storage-public-access" policy.

<details>
<summary>Show solution</summary>

```bash
# Check the specific non-compliance reason
az policy state list \
  --resource "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME/providers/Microsoft.Storage/storageAccounts/stcontoso" \
  --query "[].{policy:policyDefinitionName, reason:complianceState, details:policyDefinitionAction}" -o table 2>/dev/null

# Common cause: Policy evaluates a different property than what was configured
# The policy might check "allowBlobPublicAccess" at account level
# while the user disabled public access at the container level

# Fix: Ensure the account-level setting is correct
# az storage account update --name "stcontoso" --resource-group $RG_NAME \
#   --allow-blob-public-access false

# Trigger a re-evaluation (compliance scans are periodic)
az policy state trigger-scan --resource-group $RG_NAME --no-wait

# Another common cause: Evaluation delay
# Standard policy evaluation cycle is every 24 hours
# Use trigger-scan for immediate evaluation

# Check if the policy definition matches the correct property path
az policy definition show --name "4fa4b6c0-31ca-4c0d-b10d-24b96f62a751" \
  --query "policyRule.if" -o json

# Verify: The policy might check "Microsoft.Storage/storageAccounts/allowBlobPublicAccess"
# Ensure the property is set at the RESOURCE level, not just inherited
echo "Ensure 'allowBlobPublicAccess' is explicitly set to false on the storage account"
```

</details>

### Scenario 3: Remediation task fails with "DeploymentFailed"

A remediation task for enabling diagnostic settings on Key Vaults fails. The error mentions "Authorization failed for the template deployment."

<details>
<summary>Show solution</summary>

```bash
# Check the remediation task status and errors
az policy remediation show \
  --name "remediate-kv-diagnostics" \
  --scope "/subscriptions/$SUB_ID" \
  --query "{status:provisioningState, failed:deploymentStatus.failedDeployments}"

# The issue: The policy assignment's managed identity lacks permissions
# DeployIfNotExists policies need a managed identity to make changes

# Get the policy assignment's managed identity
POLICY_IDENTITY=$(az policy assignment show \
  --name "contoso-security-baseline" \
  --query "identity.principalId" -o tsv)

# Grant the necessary role (Contributor for diagnostic settings deployment)
az role assignment create \
  --assignee-object-id $POLICY_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --role "Contributor" \
  --scope "/subscriptions/$SUB_ID"

# For more restrictive access, use specific roles:
az role assignment create \
  --assignee-object-id $POLICY_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --role "Monitoring Contributor" \
  --scope "/subscriptions/$SUB_ID"

# Re-run the remediation task
az policy remediation delete --name "remediate-kv-diagnostics" --scope "/subscriptions/$SUB_ID"
az policy remediation create \
  --name "remediate-kv-diagnostics-v2" \
  --policy-assignment "contoso-security-baseline" \
  --definition-reference-id "kvDiagnosticsRequired" \
  --scope "/subscriptions/$SUB_ID" \
  --resource-discovery-mode ReEvaluateCompliance
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "A policy with 'Deny' effect is assigned at the subscription level. A developer needs to deploy a non-compliant resource for testing. What is the least-privileged approach to allow this?",
    options: [
      "Remove the policy assignment temporarily",
      "Create a policy exemption with 'Waiver' category scoped to the specific resource group",
      "Change the policy effect to 'Audit' subscription-wide",
      "Grant the developer the Policy Contributor role"
    ],
    correctIndex: 1,
    explanation: "A policy exemption with 'Waiver' category allows a specific scope to bypass the policy enforcement without affecting other resources. Exemptions can include expiration dates and require justification, making them the proper governance mechanism for exceptions."
  },
  {
    question: "Which Azure Policy effect should be used to automatically add a missing tag to resources when they are created or updated?",
    options: [
      "Deny",
      "Audit",
      "DeployIfNotExists",
      "Modify"
    ],
    correctIndex: 3,
    explanation: "The 'Modify' effect is designed to add, update, or remove properties or tags on resources during creation or update operations. Unlike 'DeployIfNotExists' which deploys additional resources, 'Modify' directly changes properties on the evaluated resource itself."
  },
  {
    question: "A DeployIfNotExists policy for enabling diagnostic settings fails to remediate existing resources. What is the most likely cause?",
    options: [
      "The policy is in 'DoNotEnforce' mode",
      "The policy assignment's managed identity lacks the required RBAC role to deploy the resource",
      "The policy only applies to new resources, not existing ones",
      "DeployIfNotExists policies cannot be remediated"
    ],
    correctIndex: 1,
    explanation: "DeployIfNotExists policies use a managed identity (system-assigned) to deploy remediation templates. If this identity lacks the RBAC permissions needed to create the deployment (e.g., Monitoring Contributor for diagnostic settings), the remediation task will fail with authorization errors."
  },
  {
    question: "How does Microsoft Defender for Cloud relate to Azure Policy for security standards?",
    options: [
      "Defender for Cloud replaces Azure Policy for security",
      "Defender for Cloud uses Azure Policy initiatives to evaluate security recommendations and compliance with standards like MCSB",
      "Azure Policy must be disabled before Defender for Cloud can be used",
      "Defender for Cloud only monitors; Azure Policy only enforces"
    ],
    correctIndex: 1,
    explanation: "Defender for Cloud leverages Azure Policy initiatives (like Microsoft Cloud Security Benchmark) to continuously evaluate resource configurations and generate security recommendations. The recommendations shown in Defender are the results of policy compliance evaluations. Defender adds threat detection and prioritization on top."
  }
]} />

## Cleanup

```bash
# Remove policy assignments
az policy assignment delete --name "mcsb-assignment"
az policy assignment delete --name "deny-kv-no-softdelete"
az policy assignment delete --name "deny-storage-public-access"
az policy assignment delete --name "deny-vm-unmanaged-disks"
az policy assignment delete --name "require-env-tag"
az policy assignment delete --name "deny-public-ip" --scope "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME"
az policy assignment delete --name "deny-kv-no-rbac"
az policy assignment delete --name "contoso-security-baseline"

# Remove policy exemptions
az policy exemption delete --name "exempt-test-rg-from-tag" --scope "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME"

# Remove custom policy definitions (must delete assignments first)
az policy set-definition delete --name "contoso-security-baseline"
az policy definition delete --name "deny-kv-no-rbac"
az policy definition delete --name "audit-missing-encryption-tag"
az policy definition delete --name "deny-non-approved-regions"

# Remove remediation tasks
az policy remediation delete --name "remediate-kv-diagnostics" --scope "/subscriptions/$SUB_ID" 2>/dev/null
az policy remediation delete --name "remediate-kv-diagnostics-v2" --scope "/subscriptions/$SUB_ID" 2>/dev/null

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait
```
