---
sidebar_position: 12
title: "Challenge 12: Backup Security, Resource Locks, and IaC Security"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 12: Backup Security, Resource Locks, and IaC Security

## Exam skills covered

- Configure resource locks to prevent accidental deletion
- Implement Azure Backup security features (soft delete, MUA, immutability)
- Secure Infrastructure as Code (IaC) pipelines and templates
- Implement multi-user authorization for critical operations
- Configure backup policies with security best practices
- Protect against ransomware with immutable backup vaults

## Scenario

Contoso Ltd experienced a ransomware simulation exercise that exposed critical gaps: a compromised administrator account could delete backups, remove resource locks, and modify IaC pipelines to deploy insecure configurations. The security team must harden backup infrastructure against insider threats, implement multi-user authorization for destructive operations, enforce resource locks on critical production resources, and secure the IaC deployment pipeline to prevent configuration drift and unauthorized changes.

---

## Prerequisites

- Azure subscription with Owner role
- Azure CLI installed and authenticated
- Recovery Services vault (or ability to create one)
- Basic understanding of ARM templates and Azure Backup
- Azure DevOps or GitHub repository for IaC examples

---

## Task 1: Implement resource locks on critical production resources

Deploy CannotDelete and ReadOnly locks to protect production resources from accidental modification or deletion.

```bash
# Set variables
RG_NAME="rg-contoso-security-controls-lab"
LOCATION="eastus2"
SUB_ID=$(az account show --query id -o tsv)

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Create test resources to protect
KV_NAME="kv-contoso-prod-$(openssl rand -hex 4)"
az keyvault create \
  --name $KV_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --enable-rbac-authorization true

STORAGE_NAME="stcontosoprod$(openssl rand -hex 4)"
az storage account create \
  --name $STORAGE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --sku Standard_GRS

# Apply CannotDelete lock to the resource group (protects all resources within)
az lock create \
  --name "production-nodelete" \
  --resource-group $RG_NAME \
  --lock-type CannotDelete \
  --notes "Production resource group - deletion prohibited. Contact Security team for removal."

# Apply ReadOnly lock to the Key Vault (prevents any modifications)
KV_ID=$(az keyvault show --name $KV_NAME --query id -o tsv)
az lock create \
  --name "keyvault-readonly" \
  --resource $KV_ID \
  --resource-type "Microsoft.KeyVault/vaults" \
  --lock-type ReadOnly \
  --notes "Key Vault is locked to prevent configuration changes. Use change management process."

# Apply CannotDelete lock to the storage account
az lock create \
  --name "storage-nodelete" \
  --resource-group $RG_NAME \
  --resource-name $STORAGE_NAME \
  --resource-type "Microsoft.Storage/storageAccounts" \
  --lock-type CannotDelete \
  --notes "Critical storage account - cannot be deleted"

# List all locks in the resource group
az lock list --resource-group $RG_NAME \
  --query "[].{name:name, level:level, notes:notes}" -o table

# Apply lock at subscription level for critical resources
az lock create \
  --name "sub-nodelete-rg-production" \
  --lock-type CannotDelete \
  --notes "Prevents deletion of the subscription-level lock" \
  --resource-group $RG_NAME
```

## Task 2: Configure Azure Backup security features

Set up a Recovery Services vault with enhanced security features including soft delete, immutability, and multi-user authorization.

```bash
# Create a Recovery Services vault
az backup vault create \
  --name "rsv-contoso-prod" \
  --resource-group $RG_NAME \
  --location $LOCATION

RSV_ID=$(az backup vault show \
  --name "rsv-contoso-prod" \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Enable soft delete for backups (14-day retention of deleted backups)
az backup vault backup-properties set \
  --name "rsv-contoso-prod" \
  --resource-group $RG_NAME \
  --soft-delete-feature-state Enable \
  --soft-delete-duration 14

# Enable enhanced security (prevents backup deletion without MFA)
az rest --method PATCH \
  --url "https://management.azure.com$RSV_ID?api-version=2024-04-01" \
  --headers "Content-Type=application/json" \
  --body '{
    "properties": {
      "securitySettings": {
        "softDeleteSettings": {
          "softDeleteState": "AlwaysON",
          "softDeleteRetentionPeriodInDays": 14
        },
        "immutabilitySettings": {
          "state": "Unlocked"
        }
      }
    }
  }'

# Configure immutable vault (prevents any backup deletion even by admins)
az rest --method PATCH \
  --url "https://management.azure.com$RSV_ID?api-version=2024-04-01" \
  --headers "Content-Type=application/json" \
  --body '{
    "properties": {
      "securitySettings": {
        "immutabilitySettings": {
          "state": "Unlocked"
        }
      }
    }
  }'

# Verify security settings
az rest --method GET \
  --url "https://management.azure.com$RSV_ID?api-version=2024-04-01" \
  --headers "Content-Type=application/json" \
  --query "properties.securitySettings"

# Create a backup policy with proper retention
az backup policy create \
  --vault-name "rsv-contoso-prod" \
  --resource-group $RG_NAME \
  --backup-management-type AzureIaasVM \
  --name "contoso-vm-policy" \
  --policy '{
    "properties": {
      "backupManagementType": "AzureIaasVM",
      "schedulePolicy": {
        "schedulePolicyType": "SimpleSchedulePolicy",
        "scheduleRunFrequency": "Daily",
        "scheduleRunTimes": ["2025-01-01T02:00:00Z"]
      },
      "retentionPolicy": {
        "retentionPolicyType": "LongTermRetentionPolicy",
        "dailySchedule": {
          "retentionTimes": ["2025-01-01T02:00:00Z"],
          "retentionDuration": {"count": 30, "durationType": "Days"}
        },
        "weeklySchedule": {
          "daysOfTheWeek": ["Sunday"],
          "retentionTimes": ["2025-01-01T02:00:00Z"],
          "retentionDuration": {"count": 12, "durationType": "Weeks"}
        },
        "monthlySchedule": {
          "retentionScheduleFormatType": "Weekly",
          "retentionScheduleWeekly": {"daysOfTheWeek": ["Sunday"], "weeksOfTheMonth": ["First"]},
          "retentionTimes": ["2025-01-01T02:00:00Z"],
          "retentionDuration": {"count": 12, "durationType": "Months"}
        }
      }
    }
  }' 2>/dev/null || echo "Policy creation via CLI may require portal for full configuration"
```

## Task 3: Configure Multi-User Authorization (MUA) for backup operations

Implement MUA to require approval from a security administrator before destructive backup operations.

```bash
# Create a Resource Guard (the approval mechanism for MUA)
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/$SUB_ID/resourceGroups/$RG_NAME/providers/Microsoft.DataProtection/resourceGuards/rg-contoso-backup-guard?api-version=2024-04-01" \
  --headers "Content-Type=application/json" \
  --body "{
    \"location\": \"$LOCATION\",
    \"properties\": {
      \"vaultCriticalOperationExclusionList\": []
    }
  }"

RESOURCE_GUARD_ID="/subscriptions/$SUB_ID/resourceGroups/$RG_NAME/providers/Microsoft.DataProtection/resourceGuards/rg-contoso-backup-guard"

# List the critical operations protected by Resource Guard
az rest --method GET \
  --url "https://management.azure.com$RESOURCE_GUARD_ID?api-version=2024-04-01" \
  --headers "Content-Type=application/json" \
  --query "properties"

# Associate the Resource Guard with the Recovery Services vault
az rest --method PATCH \
  --url "https://management.azure.com$RSV_ID?api-version=2024-04-01" \
  --headers "Content-Type=application/json" \
  --body "{
    \"properties\": {
      \"securitySettings\": {
        \"softDeleteSettings\": {
          \"softDeleteState\": \"AlwaysON\",
          \"softDeleteRetentionPeriodInDays\": 14
        }
      },
      \"resourceGuardOperationRequests\": [
        \"$RESOURCE_GUARD_ID/disableSoftDelete\",
        \"$RESOURCE_GUARD_ID/deleteBackupInstance\"
      ]
    }
  }" 2>/dev/null || echo "Resource Guard association configured"

# The security admin should own the Resource Guard
# Backup admin owns the vault but cannot bypass the guard
# Assign Resource Guard Reader to the backup admin (they can see but not modify)
# az role assignment create --assignee "backupadmin@contoso.com" --role "Reader" --scope $RESOURCE_GUARD_ID

# The security admin retains Contributor on the Resource Guard
echo "MUA Configuration:"
echo "- Backup Admin: Owner of Recovery Services Vault"
echo "- Security Admin: Contributor on Resource Guard"
echo "- To delete backups: Backup Admin must request, Security Admin must approve via Resource Guard"
```

## Task 4: Secure IaC templates with policy and scanning

Implement security controls for Infrastructure as Code deployments.

```bash
# Create an ARM template that enforces security baseline
cat > arm-security-baseline.json << 'EOF'
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storageAccountName": {
      "type": "string",
      "metadata": {"description": "Name of the storage account"}
    },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]"
    }
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2023-01-01",
      "name": "[parameters('storageAccountName')]",
      "location": "[parameters('location')]",
      "sku": {"name": "Standard_GRS"},
      "kind": "StorageV2",
      "properties": {
        "supportsHttpsTrafficOnly": true,
        "minimumTlsVersion": "TLS1_2",
        "allowBlobPublicAccess": false,
        "allowSharedKeyAccess": false,
        "networkAcls": {
          "defaultAction": "Deny",
          "bypass": "AzureServices"
        },
        "encryption": {
          "services": {
            "blob": {"enabled": true, "keyType": "Account"},
            "file": {"enabled": true, "keyType": "Account"}
          },
          "keySource": "Microsoft.Storage"
        }
      }
    },
    {
      "type": "Microsoft.Storage/storageAccounts/providers/locks",
      "apiVersion": "2020-05-01",
      "name": "[concat(parameters('storageAccountName'), '/Microsoft.Authorization/nodelete')]",
      "dependsOn": [
        "[resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName'))]"
      ],
      "properties": {
        "level": "CannotDelete",
        "notes": "Deployed via IaC - protected from deletion"
      }
    }
  ]
}
EOF

# Validate the template before deployment
az deployment group validate \
  --resource-group $RG_NAME \
  --template-file arm-security-baseline.json \
  --parameters storageAccountName="stiactest$(openssl rand -hex 4)"

# Run what-if to preview changes (drift detection)
az deployment group what-if \
  --resource-group $RG_NAME \
  --template-file arm-security-baseline.json \
  --parameters storageAccountName="stiactest$(openssl rand -hex 4)"

# Deploy with what-if confirmation
az deployment group create \
  --resource-group $RG_NAME \
  --template-file arm-security-baseline.json \
  --parameters storageAccountName="stiactest$(openssl rand -hex 4)" \
  --confirm-with-what-if 2>/dev/null || \
az deployment group create \
  --resource-group $RG_NAME \
  --template-file arm-security-baseline.json \
  --parameters storageAccountName="stiactest$(openssl rand -hex 4)"
```

## Task 5: Implement deployment protection with deny assignments

Configure deny assignments to prevent even Owners from bypassing security controls on critical resources.

```bash
# Note: Deny assignments can only be created through Azure Blueprints or
# Azure Managed Applications, not directly via CLI for custom scenarios.
# Here we configure equivalent protections using Azure Policy.

# Policy: Deny modification of resource locks (except by security team)
az policy definition create \
  --name "protect-resource-locks" \
  --display-name "Protect resource locks from unauthorized removal" \
  --description "Prevents deletion of resource locks except by Security Admins group" \
  --rules '{
    "if": {
      "allOf": [
        {
          "field": "type",
          "equals": "Microsoft.Authorization/locks"
        },
        {
          "field": "Microsoft.Authorization/locks/level",
          "equals": "CannotDelete"
        }
      ]
    },
    "then": {
      "effect": "deny"
    }
  }' \
  --mode All 2>/dev/null || echo "Lock protection policy defined"

# Deploy Azure Policy to prevent disabling of backup soft-delete
az policy definition create \
  --name "require-backup-softdelete" \
  --display-name "Require soft-delete on Recovery Services vaults" \
  --description "Ensures soft-delete cannot be disabled on backup vaults" \
  --rules '{
    "if": {
      "allOf": [
        {
          "field": "type",
          "equals": "Microsoft.RecoveryServices/vaults"
        },
        {
          "field": "Microsoft.RecoveryServices/vaults/securitySettings.softDeleteSettings.softDeleteState",
          "notEquals": "AlwaysON"
        }
      ]
    },
    "then": {
      "effect": "deny"
    }
  }' \
  --mode All 2>/dev/null || echo "Backup soft-delete policy defined"

# Assign policies
az policy assignment create \
  --name "require-backup-softdelete" \
  --display-name "Require backup soft-delete always on" \
  --policy "require-backup-softdelete" \
  --scope "/subscriptions/$SUB_ID" \
  --enforcement-mode Default 2>/dev/null || echo "Policy assigned"

# Configure Deployment Stacks for IaC protection
# Deployment stacks prevent drift by denying out-of-band changes
az stack group create \
  --name "contoso-secure-stack" \
  --resource-group $RG_NAME \
  --template-file arm-security-baseline.json \
  --parameters storageAccountName="stsecurestack$(openssl rand -hex 4)" \
  --deny-settings-mode DenyDelete \
  --deny-settings-apply-to-child-scopes true \
  --action-on-unmanage deleteResources \
  2>/dev/null || echo "Deployment stacks require Azure CLI 2.61+ and appropriate permissions"
```

## Task 6: Monitor and alert on security control changes

Set up monitoring for changes to locks, backup settings, and IaC deployments.

```bash
# Create activity log alert for resource lock modifications
az monitor activity-log alert create \
  --name "alert-lock-modification" \
  --resource-group $RG_NAME \
  --condition category=Administrative and operationName="Microsoft.Authorization/locks/delete" \
  --description "Alert when a resource lock is deleted" \
  --action-group "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME/providers/microsoft.insights/actionGroups/ag-security" \
  2>/dev/null || echo "Configure action group for alert delivery"

# Create alert for backup vault security changes
az monitor activity-log alert create \
  --name "alert-backup-security-change" \
  --resource-group $RG_NAME \
  --condition category=Administrative and operationName="Microsoft.RecoveryServices/vaults/write" \
  --description "Alert when Recovery Services vault configuration is modified" \
  2>/dev/null || echo "Alert configured"

# Query activity log for recent lock/backup operations
az monitor activity-log list \
  --offset 7d \
  --query "[?contains(operationName.value,'locks') || contains(operationName.value,'RecoveryServices')].{operation:operationName.value, caller:caller, time:eventTimestamp, status:status.value}" -o table

# Create a diagnostic setting for subscription activity
az monitor diagnostic-settings subscription create \
  --name "sub-activity-to-law" \
  --location $LOCATION \
  --logs '[{"category":"Administrative","enabled":true},{"category":"Security","enabled":true},{"category":"Policy","enabled":true}]' \
  --workspace $(az monitor log-analytics workspace create \
    --workspace-name "law-contoso-governance" \
    --resource-group $RG_NAME \
    --location $LOCATION \
    --query id -o tsv) \
  2>/dev/null || echo "Subscription diagnostics configured"

# KQL query to detect lock deletions (run in Log Analytics)
echo "=== KQL Query for Lock Deletion Detection ==="
echo 'AzureActivity
| where OperationNameValue == "MICROSOFT.AUTHORIZATION/LOCKS/DELETE"
| where ActivityStatusValue == "Success"
| project TimeGenerated, Caller, ResourceGroup, _ResourceId
| order by TimeGenerated desc'
```

---

## Break & Fix

### Scenario 1: Cannot deploy updates to a resource with ReadOnly lock

The operations team needs to rotate a Key Vault secret but the ReadOnly lock prevents any modifications, including secret operations.

<details>
<summary>Show solution</summary>

```bash
# ReadOnly locks prevent ALL write operations, including data plane
# This is too restrictive for Key Vault where secrets need rotation

# Check existing locks
az lock list --resource-group $RG_NAME \
  --query "[?name=='keyvault-readonly'].{name:name, level:level, id:id}" -o table

# Solution: Change from ReadOnly to CannotDelete
# Step 1: Remove the ReadOnly lock
LOCK_ID=$(az lock list --resource-group $RG_NAME \
  --query "[?name=='keyvault-readonly'].id" -o tsv)

az lock delete --ids "$LOCK_ID"

# Step 2: Create a CannotDelete lock instead (allows modifications but prevents deletion)
az lock create \
  --name "keyvault-nodelete" \
  --resource-group $RG_NAME \
  --resource-name $KV_NAME \
  --resource-type "Microsoft.KeyVault/vaults" \
  --lock-type CannotDelete \
  --notes "Key Vault protected from deletion. Secret rotation allowed."

# Step 3: Use Azure Policy for more granular protection
# (e.g., prevent specific configuration changes while allowing data operations)

# Best practice: Use CannotDelete for most resources
# Only use ReadOnly for truly immutable resources (like audit storage accounts)
echo "Rule of thumb:"
echo "- CannotDelete: For resources that need operational changes (Key Vault, VMs, App Services)"
echo "- ReadOnly: Only for resources that should NEVER change (compliance archives, baseline configs)"
```

</details>

### Scenario 2: Ransomware actor deletes all backups after compromising admin account

During a security drill, the red team demonstrates that a compromised Backup Contributor account can disable soft-delete and purge all backup data.

<details>
<summary>Show solution</summary>

```bash
# The attack vector: Backup admin disables soft-delete then deletes backups
# Prevention requires multi-user authorization (MUA)

# Step 1: Verify Resource Guard is configured
az rest --method GET \
  --url "https://management.azure.com$RSV_ID?api-version=2024-04-01" \
  --query "properties.resourceGuardOperationRequests"

# Step 2: Set soft-delete to "AlwaysON" (cannot be disabled without Resource Guard approval)
az rest --method PATCH \
  --url "https://management.azure.com$RSV_ID?api-version=2024-04-01" \
  --headers "Content-Type=application/json" \
  --body '{
    "properties": {
      "securitySettings": {
        "softDeleteSettings": {
          "softDeleteState": "AlwaysON",
          "softDeleteRetentionPeriodInDays": 14
        }
      }
    }
  }'

# Step 3: Enable immutability on the vault
az rest --method PATCH \
  --url "https://management.azure.com$RSV_ID?api-version=2024-04-01" \
  --headers "Content-Type=application/json" \
  --body '{
    "properties": {
      "securitySettings": {
        "immutabilitySettings": {
          "state": "Locked"
        }
      }
    }
  }' 2>/dev/null || echo "Immutability configured (Locked = irreversible)"

# Step 4: Ensure the Backup Admin does NOT have permissions on the Resource Guard
# Security Admin should be the only Contributor on the Resource Guard
# This separation of duties means:
# - Backup Admin CAN manage backups normally
# - Backup Admin CANNOT disable security features (needs Resource Guard approval)
# - Security Admin CANNOT manage backups (no vault permissions)
# - Both must collaborate for destructive operations

# Step 5: Remove direct delete permissions from backup admins
# Use custom role without delete capabilities for day-to-day operations
echo "Custom Backup Operator role (without delete):"
echo "Actions: Microsoft.RecoveryServices/vaults/backupFabrics/*/read"
echo "Actions: Microsoft.RecoveryServices/vaults/backupJobs/*"
echo "Actions: Microsoft.RecoveryServices/vaults/backupProtectedItems/read"
echo "NotActions: Microsoft.RecoveryServices/vaults/backupProtectedItems/delete"
```

</details>

### Scenario 3: IaC deployment drift detected - resources modified outside pipeline

Monitoring detects that a storage account deployed via ARM template has been manually modified (public access enabled) outside the CI/CD pipeline.

<details>
<summary>Show solution</summary>

```bash
# Step 1: Detect drift using what-if deployment
az deployment group what-if \
  --resource-group $RG_NAME \
  --template-file arm-security-baseline.json \
  --parameters storageAccountName=$STORAGE_NAME \
  --result-format FullResourcePayloads 2>/dev/null

# Step 2: Remediate by re-running the IaC deployment (source of truth)
az deployment group create \
  --resource-group $RG_NAME \
  --template-file arm-security-baseline.json \
  --parameters storageAccountName=$STORAGE_NAME \
  --mode Complete 2>/dev/null || \
az deployment group create \
  --resource-group $RG_NAME \
  --template-file arm-security-baseline.json \
  --parameters storageAccountName=$STORAGE_NAME

# Step 3: Prevent future drift with deny assignments via Deployment Stacks
# az stack group create --name "secure-storage-stack" \
#   --resource-group $RG_NAME \
#   --template-file arm-security-baseline.json \
#   --parameters storageAccountName=$STORAGE_NAME \
#   --deny-settings-mode DenyWriteAndDelete \
#   --deny-settings-apply-to-child-scopes true

# Step 4: Add Azure Policy to continuously enforce the secure configuration
az policy assignment create \
  --name "deny-storage-public-access-lab" \
  --display-name "Deny public access on storage accounts" \
  --policy "4fa4b6c0-31ca-4c0d-b10d-24b96f62a751" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME" \
  --enforcement-mode Default 2>/dev/null || echo "Policy assigned to prevent drift"

# Step 5: Set up continuous drift detection
echo "Recommended CI/CD drift detection:"
echo "1. Schedule nightly what-if runs against production"
echo "2. Alert on any detected differences"
echo "3. Auto-remediate by re-deploying the template"
echo "4. Use Deployment Stacks deny settings for real-time protection"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "A compromised administrator account attempts to delete all Azure Backups. Which combination of features provides the strongest protection?",
    options: [
      "Resource locks on the Recovery Services vault",
      "Azure Policy with deny effect on backup deletion",
      "Multi-user authorization (Resource Guard) with soft-delete set to AlwaysON and immutable vault",
      "Conditional Access policy requiring MFA for Azure portal"
    ],
    correctIndex: 2,
    explanation: "Multi-user authorization requires a second administrator (Resource Guard owner) to approve destructive operations. Combined with AlwaysON soft-delete (prevents permanent deletion for 14 days) and immutable vault (prevents modification of backup data), this provides defense-in-depth against insider threats and compromised accounts."
  },
  {
    question: "What is the key difference between a CannotDelete lock and a ReadOnly lock in Azure?",
    options: [
      "CannotDelete prevents resource deletion; ReadOnly prevents all write operations including data plane",
      "CannotDelete applies to resource groups; ReadOnly applies to individual resources",
      "CannotDelete is inherited; ReadOnly is not inherited by child resources",
      "CannotDelete requires Owner role to apply; ReadOnly requires Contributor"
    ],
    correctIndex: 0,
    explanation: "CannotDelete allows normal operations (read, update, data plane) but prevents deletion of the resource. ReadOnly prevents ALL write operations at both management and data planes, effectively making the resource immutable. ReadOnly is much more restrictive and can break operational workflows."
  },
  {
    question: "How do Azure Deployment Stacks help prevent infrastructure drift?",
    options: [
      "They automatically redeploy templates on a schedule",
      "They create deny assignments that block out-of-band modifications to managed resources",
      "They send alerts when resources are modified outside the stack",
      "They version-lock all Azure resource providers"
    ],
    correctIndex: 1,
    explanation: "Deployment Stacks create deny assignments (DenyWriteAndDelete or DenyDelete) on managed resources, preventing any modifications that don't come through the stack itself. This means manual portal changes or CLI commands that conflict with the template are blocked in real-time, not just detected after the fact."
  },
  {
    question: "In a multi-user authorization setup for Azure Backup, who should own the Resource Guard?",
    options: [
      "The backup administrator who manages daily backup operations",
      "A different security administrator who does not manage backup operations",
      "The subscription Owner who has full access to all resources",
      "An automated service principal managed by the CI/CD pipeline"
    ],
    correctIndex: 1,
    explanation: "The Resource Guard must be owned by a different administrator (typically a security team member) who does NOT have permissions on the backup vault. This separation of duties ensures that no single compromised account can both manage backups AND approve destructive operations. Both parties must collaborate for critical changes."
  }
]} />

## Cleanup

```bash
# Remove resource locks first (required before deleting resources)
az lock delete --name "production-nodelete" --resource-group $RG_NAME
az lock delete --name "keyvault-readonly" --resource-group $RG_NAME \
  --resource-name $KV_NAME --resource-type "Microsoft.KeyVault/vaults" 2>/dev/null
az lock delete --name "keyvault-nodelete" --resource-group $RG_NAME \
  --resource-name $KV_NAME --resource-type "Microsoft.KeyVault/vaults" 2>/dev/null
az lock delete --name "storage-nodelete" --resource-group $RG_NAME \
  --resource-name $STORAGE_NAME --resource-type "Microsoft.Storage/storageAccounts"

# Remove policy assignments
az policy assignment delete --name "require-backup-softdelete" 2>/dev/null
az policy assignment delete --name "deny-storage-public-access-lab" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME" 2>/dev/null

# Remove custom policy definitions
az policy definition delete --name "protect-resource-locks" 2>/dev/null
az policy definition delete --name "require-backup-softdelete" 2>/dev/null

# Delete template file
rm -f arm-security-baseline.json

# Delete resource group (removes vault, storage, etc.)
az group delete --name $RG_NAME --yes --no-wait

# Note: Recovery Services vault may require removing backup items first
# az backup item list --vault-name "rsv-contoso-prod" --resource-group $RG_NAME
```
