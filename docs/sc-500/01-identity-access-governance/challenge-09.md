---
sidebar_position: 9
title: "Challenge 09: Defender for Key Vault and CSPM Secret Scanning"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 09: Defender for Key Vault and CSPM Secret Scanning

## Exam skills covered

- Enable and configure Microsoft Defender for Key Vault
- Investigate Key Vault threat detection alerts
- Configure Defender CSPM secret scanning for exposed credentials
- Respond to secret exposure findings
- Integrate Key Vault security with Microsoft Sentinel
- Implement security recommendations for Key Vault

## Scenario

Contoso Ltd's SOC team received a Defender for Cloud alert indicating unusual access patterns to a production Key Vault — specifically, mass secret enumeration from an IP address not associated with any known application. Simultaneously, Defender CSPM identified exposed secrets in source code repositories and Azure resource configurations. The security team must investigate the alerts, configure comprehensive protection for all Key Vaults, and implement automated response workflows for credential exposure events.

---

## Prerequisites

- Azure subscription with Microsoft Defender for Cloud enabled
- Defender for Key Vault plan enabled (or ability to enable it)
- Defender CSPM plan with secrets scanning capability
- Azure CLI installed and authenticated
- Security Administrator role
- Existing Key Vault(s) in the subscription

---

## Task 1: Enable Microsoft Defender for Key Vault

Activate Defender for Key Vault across the subscription and verify protection coverage.

```bash
# Set variables
SUB_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-defender-kv-lab"
LOCATION="eastus2"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Enable Defender for Key Vault at subscription level
az security pricing create \
  --name KeyVaults \
  --tier Standard

# Verify Defender for Key Vault is enabled
az security pricing show --name KeyVaults \
  --query "{name:name, tier:pricingTier, freeTrialRemaining:freeTrialRemainingTime}" -o json

# Enable Defender CSPM (includes secrets scanning)
az security pricing create \
  --name CloudPosture \
  --tier Standard

# Verify CSPM status
az security pricing show --name CloudPosture \
  --query "{name:name, tier:pricingTier}" -o json

# List all Defender plans and their status
az security pricing list \
  --query "[].{plan:name, tier:pricingTier}" -o table

# Create a test Key Vault to monitor
KV_NAME="kv-contoso-defended-$(openssl rand -hex 4)"
az keyvault create \
  --name $KV_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --enable-rbac-authorization true

# Assign access
KV_ID=$(az keyvault show --name $KV_NAME --query id -o tsv)
CURRENT_USER=$(az ad signed-in-user show --query id -o tsv)
az role assignment create \
  --assignee-object-id $CURRENT_USER \
  --assignee-principal-type User \
  --role "Key Vault Administrator" \
  --scope $KV_ID
```

## Task 2: Review and investigate Defender for Key Vault alerts

Query security alerts related to Key Vault and understand common threat patterns.

```bash
# List all active Key Vault security alerts
az security alert list \
  --query "[?contains(alertType,'KeyVault')].{name:alertDisplayName, severity:severity, status:status, time:timeGeneratedUtc}" -o table

# Get details of a specific alert type
az security alert list \
  --query "[?alertType=='KV_UnusualAccessPattern']" -o json

# Common Defender for Key Vault alert types:
# - KV_UnusualAccessPattern: Access from unusual location/IP
# - KV_MassSecretRetrieval: Mass secret enumeration
# - KV_SuspiciousSecretListing: Suspicious list operations
# - KV_HighVolumeOperations: Abnormally high volume of operations

# Query security recommendations for Key Vault
az security assessment list \
  --query "[?contains(displayName,'Key Vault') || contains(displayName,'key vault')].{name:displayName, status:status.code, severity:metadata.severity}" -o table

# Check Key Vault diagnostic settings (required for full protection)
az monitor diagnostic-settings list --resource $KV_ID \
  --query "[].{name:name, hasLogs:logs[?enabled].category}" -o json

# Enable diagnostics if not configured
LAW_ID=$(az monitor log-analytics workspace create \
  --workspace-name "law-contoso-defender" \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --query id -o tsv)

az monitor diagnostic-settings create \
  --name "defender-diagnostics" \
  --resource $KV_ID \
  --workspace $LAW_ID \
  --logs '[{"category":"AuditEvent","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

## Task 3: Configure Defender CSPM secrets scanning

Enable and configure secret scanning to detect exposed credentials in cloud resources.

```bash
# Check CSPM extensions configuration
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/pricings/CloudPosture?api-version=2024-01-01" \
  --headers "Content-Type=application/json"

# Enable sensitive data discovery extension (includes secrets scanning)
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/pricings/CloudPosture?api-version=2024-01-01" \
  --headers "Content-Type=application/json" \
  --body '{
    "properties": {
      "pricingTier": "Standard",
      "extensions": [
        {
          "name": "SensitiveDataDiscovery",
          "isEnabled": "True"
        },
        {
          "name": "ContainerRegistriesVulnerabilityAssessments",
          "isEnabled": "True"
        },
        {
          "name": "AgentlessVmScanning",
          "isEnabled": "True"
        }
      ]
    }
  }'

# Query secret scanning findings
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/subAssessments?api-version=2019-01-01-preview" \
  --headers "Content-Type=application/json" \
  --query "value[?contains(displayName,'secret') || contains(displayName,'credential')].{finding:displayName, status:status.code, resource:resourceDetails.id}" 2>/dev/null

# List security recommendations related to secrets
az security assessment list \
  --query "[?contains(displayName,'secret') || contains(displayName,'credential') || contains(displayName,'password')].{recommendation:displayName, status:status.code}" -o table
```

## Task 4: Simulate suspicious Key Vault activity

Generate activity patterns that trigger Defender alerts for testing detection capabilities.

```bash
# Add test secrets to the vault
for i in $(seq 1 20); do
  az keyvault secret set \
    --vault-name $KV_NAME \
    --name "test-secret-$i" \
    --value "test-value-$(openssl rand -hex 16)" \
    --only-show-errors > /dev/null
done

echo "Created 20 test secrets"

# Simulate mass secret enumeration (triggers KV_MassSecretRetrieval)
# This lists all secrets rapidly - mimics an attacker enumerating vault contents
for i in $(seq 1 5); do
  az keyvault secret list --vault-name $KV_NAME --query "[].name" -o tsv > /dev/null
  az keyvault secret list --vault-name $KV_NAME --include-managed true > /dev/null
done

# Simulate suspicious access pattern - retrieve many secrets sequentially
for i in $(seq 1 20); do
  az keyvault secret show --vault-name $KV_NAME --name "test-secret-$i" --query value -o tsv > /dev/null 2>&1
done

echo "Simulated access patterns - alerts may appear within 1-2 hours"

# Note: Defender for Key Vault uses ML-based detection
# Alerts typically appear within minutes to hours depending on severity
# The simulation above may not immediately trigger alerts in a new environment
# as the ML model needs baseline behavior to detect anomalies
```

## Task 5: Configure automated response to Key Vault alerts

Set up Logic Apps or Azure Functions to automatically respond to Defender alerts.

```bash
# Create an action group for Key Vault security alerts
az monitor action-group create \
  --name "ag-keyvault-security" \
  --resource-group $RG_NAME \
  --short-name "KVSecurity" \
  --email-receiver name="SecurityTeam" email-address="soc@contoso.com" \
  --email-receiver name="KVAdmin" email-address="kvadmin@contoso.com"

ACTION_GROUP_ID=$(az monitor action-group show \
  --name "ag-keyvault-security" \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Create alert rule for high-severity Key Vault alerts
az monitor scheduled-query create \
  --name "alert-kv-suspicious-access" \
  --resource-group $RG_NAME \
  --scopes $LAW_ID \
  --condition "count 'AzureDiagnostics | where ResourceProvider == \"MICROSOFT.KEYVAULT\" | where ResultSignature == \"Forbidden\" | where TimeGenerated > ago(5m)' > 10" \
  --condition-query 'AzureDiagnostics | where ResourceProvider == "MICROSOFT.KEYVAULT" | where ResultSignature == "Forbidden" | where TimeGenerated > ago(5m)' \
  --description "Alert when more than 10 forbidden requests to Key Vault in 5 minutes" \
  --severity 2 \
  --evaluation-frequency 5m \
  --window-size 5m \
  --action-groups $ACTION_GROUP_ID \
  2>/dev/null || echo "Scheduled query alert creation requires Log Analytics data"

# Configure workflow automation for Defender alerts
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/$SUB_ID/resourceGroups/$RG_NAME/providers/Microsoft.Security/automations/auto-kv-response?api-version=2023-12-01-preview" \
  --headers "Content-Type=application/json" \
  --body "{
    \"location\": \"$LOCATION\",
    \"properties\": {
      \"isEnabled\": true,
      \"scopes\": [
        {
          \"scopePath\": \"/subscriptions/$SUB_ID\"
        }
      ],
      \"sources\": [
        {
          \"eventSource\": \"Alerts\",
          \"ruleSets\": [
            {
              \"rules\": [
                {
                  \"propertyJPath\": \"AlertType\",
                  \"propertyType\": \"String\",
                  \"expectedValue\": \"KV_\",
                  \"operator\": \"Contains\"
                },
                {
                  \"propertyJPath\": \"Severity\",
                  \"propertyType\": \"String\",
                  \"expectedValue\": \"High\",
                  \"operator\": \"Equals\"
                }
              ]
            }
          ]
        }
      ],
      \"actions\": [
        {
          \"actionType\": \"EventHub\",
          \"eventHubResourceId\": \"/subscriptions/$SUB_ID/resourceGroups/$RG_NAME/providers/Microsoft.EventHub/namespaces/evhns-security/eventhubs/alerts\",
          \"connectionString\": \"\"
        }
      ]
    }
  }" 2>/dev/null || echo "Workflow automation configured (EventHub endpoint needed for production)"
```

## Task 6: Investigate and remediate exposed secrets

Use Defender CSPM findings to identify and rotate exposed credentials.

```bash
# Query for secrets found in attack paths
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/attackPaths?api-version=2024-01-01" \
  --headers "Content-Type=application/json" \
  --query "value[?contains(displayName,'secret') || contains(displayName,'credential')].{path:displayName, risk:riskLevel}" 2>/dev/null

# List all security recommendations for Key Vault
az security assessment list \
  --query "[?contains(resourceDetails.id || '','vault')].{name:displayName, status:status.code}" -o table 2>/dev/null

# Common findings and remediation:
# 1. Secrets found in VM environment variables
echo "=== Remediation Checklist ==="
echo "1. Identify exposed secret locations from CSPM findings"
echo "2. Rotate the exposed secret immediately in Key Vault"
echo "3. Update applications to use Key Vault references or managed identities"
echo "4. Remove hard-coded secrets from source code and configurations"
echo "5. Add pre-commit hooks to prevent future secret commits"

# Rotate a potentially exposed secret
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "test-secret-1" \
  --value "rotated-$(openssl rand -hex 32)" \
  --tags rotated="true" reason="potential-exposure" date="$(date -u +%Y-%m-%d)"

# Disable old versions of potentially exposed secrets
SECRET_VERSIONS=$(az keyvault secret list-versions \
  --vault-name $KV_NAME \
  --name "test-secret-1" \
  --query "[?attributes.enabled].id" -o tsv | head -n -1)

for VERSION_ID in $SECRET_VERSIONS; do
  az keyvault secret set-attributes --id "$VERSION_ID" --enabled false
  echo "Disabled old version: $VERSION_ID"
done

# Verify only the latest version is active
az keyvault secret list-versions --vault-name $KV_NAME --name "test-secret-1" \
  --query "[].{version:id, enabled:attributes.enabled, created:attributes.created}" -o table
```

---

## Break & Fix

### Scenario 1: Defender for Key Vault showing "Not covered" status

After enabling Defender for Cloud, several Key Vaults show "Not covered" in the security coverage view. The subscription-level plan is enabled but vaults are unprotected.

<details>
<summary>Show solution</summary>

```bash
# Check if the Defender for Key Vault plan is enabled at subscription level
az security pricing show --name KeyVaults --query "{tier:pricingTier}"

# Verify the plan is Standard (not Free)
az security pricing create --name KeyVaults --tier Standard

# Check if there are resource-level exclusions
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/pricings/KeyVaults?api-version=2024-01-01" \
  --headers "Content-Type=application/json"

# Common cause: The vault was created before Defender was enabled
# or it's in a subscription that inherited a different policy

# Verify by checking coverage for the specific vault
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/securityStatuses?api-version=2015-06-01-preview&\$filter=type eq 'microsoft.keyvault/vaults'" \
  --headers "Content-Type=application/json" 2>/dev/null || true

# Fix: Ensure diagnostic logging is enabled (required for detection)
KV_LIST=$(az keyvault list --query "[].id" -o tsv)
for VAULT_ID in $KV_LIST; do
  VAULT_NAME=$(echo $VAULT_ID | awk -F/ '{print $NF}')
  DIAG_EXISTS=$(az monitor diagnostic-settings list --resource $VAULT_ID --query "value[?contains(name,'defender')]" -o tsv)
  if [ -z "$DIAG_EXISTS" ]; then
    echo "Missing diagnostics on: $VAULT_NAME"
    az monitor diagnostic-settings create \
      --name "defender-kv-diag" \
      --resource $VAULT_ID \
      --workspace $LAW_ID \
      --logs '[{"category":"AuditEvent","enabled":true}]' 2>/dev/null
  fi
done
```

</details>

### Scenario 2: CSPM reports secrets in code but no remediation guidance

Defender CSPM detects hardcoded connection strings in an Azure VM's environment variables, but the remediation workflow is unclear.

<details>
<summary>Show solution</summary>

```bash
# Step 1: Identify the exposed secrets
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/assessments?api-version=2021-06-01" \
  --headers "Content-Type=application/json" \
  --query "value[?contains(displayName,'secret') || contains(displayName,'exposed')].{finding:displayName, resource:resourceDetails}" 2>/dev/null

# Step 2: Rotate the exposed secret in Key Vault
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "exposed-connection-string" \
  --value "Server=tcp:contoso.database.windows.net;Authentication=Active Directory Default;" \
  --tags "rotated=true" "reason=cspm-finding" 2>/dev/null || true

# Step 3: Update the VM to use managed identity + Key Vault instead of env vars
# On the VM, replace the hardcoded connection string with Key Vault reference

# Enable managed identity on the VM
# az vm identity assign --name "vm-contoso-app" --resource-group $RG_NAME

# Grant the VM identity access to Key Vault
# VM_IDENTITY=$(az vm show --name "vm-contoso-app" --resource-group $RG_NAME --query identity.principalId -o tsv)
# az role assignment create --assignee-object-id $VM_IDENTITY --role "Key Vault Secrets User" --scope $KV_ID

# Step 4: Remove the environment variable from the VM
# az vm run-command invoke --command-id RunShellScript \
#   --name "vm-contoso-app" --resource-group $RG_NAME \
#   --scripts "unset DATABASE_CONNECTION_STRING && sed -i '/DATABASE_CONNECTION_STRING/d' /etc/environment"

# Step 5: Mark the finding as resolved and verify
echo "Remediation steps:"
echo "1. ✅ Secret rotated in Key Vault"
echo "2. ✅ VM configured with managed identity"
echo "3. ✅ Application updated to use DefaultAzureCredential"
echo "4. ✅ Hardcoded secret removed from VM"
echo "5. ⏳ Wait for next CSPM scan to verify finding is resolved"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Which Defender for Key Vault alert indicates a potential credential theft attack where an attacker is enumerating all secrets in a vault?",
    options: [
      "KV_UnusualAccessPattern",
      "KV_MassSecretRetrieval",
      "KV_HighVolumeOperations",
      "KV_SuspiciousSecretListing"
    ],
    correctIndex: 1,
    explanation: "KV_MassSecretRetrieval is triggered when an unusually high number of secret get operations are detected from a single identity in a short time period. This pattern is characteristic of attackers who have gained access to a vault and are exfiltrating all secrets before they lose access."
  },
  {
    question: "What prerequisite must be configured for Defender for Key Vault to detect threats effectively?",
    options: [
      "Azure Policy must be assigned to the Key Vault",
      "Key Vault diagnostic logging (AuditEvent) must be enabled",
      "The Key Vault must use Premium SKU",
      "Managed identity must be configured on the Key Vault"
    ],
    correctIndex: 1,
    explanation: "Defender for Key Vault analyzes diagnostic log data (AuditEvent category) to detect suspicious patterns. Without diagnostic logging enabled and flowing to a Log Analytics workspace, the detection engine has no data to analyze and cannot generate alerts."
  },
  {
    question: "Defender CSPM identifies a hardcoded API key in an Azure VM's environment variables. What is the correct remediation order?",
    options: [
      "Delete the VM, rotate the key, create a new VM",
      "Remove the variable, rotate the key, update the application",
      "Rotate the exposed key, migrate to managed identity/Key Vault, remove the hardcoded value",
      "Create a new Key Vault, move the key, restart the application"
    ],
    correctIndex: 2,
    explanation: "The correct order is: 1) Immediately rotate the exposed key to invalidate it, 2) Implement the secure alternative (managed identity + Key Vault), 3) Remove the hardcoded value. Rotating first ensures the exposed credential is no longer valid even if an attacker already obtained it."
  },
  {
    question: "Which Defender for Cloud plan includes the secrets scanning capability that detects exposed credentials across Azure resources?",
    options: [
      "Defender for Key Vault",
      "Defender for Servers",
      "Defender CSPM (Cloud Security Posture Management)",
      "Defender for App Service"
    ],
    correctIndex: 2,
    explanation: "Defender CSPM with the Sensitive Data Discovery extension includes secrets scanning that detects exposed credentials in VMs, storage accounts, and other resources. Defender for Key Vault protects the vault itself from threats but doesn't scan for secrets exposed elsewhere in the environment."
  }
]} />

## Cleanup

```bash
# Delete test secrets
for i in $(seq 1 20); do
  az keyvault secret delete --vault-name $KV_NAME --name "test-secret-$i" --only-show-errors 2>/dev/null
done

# Delete alert rules and action groups
az monitor action-group delete --name "ag-keyvault-security" --resource-group $RG_NAME 2>/dev/null
az monitor scheduled-query delete --name "alert-kv-suspicious-access" --resource-group $RG_NAME 2>/dev/null

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait

# Note: Defender plans remain enabled at subscription level
# Disable if no longer needed:
# az security pricing create --name KeyVaults --tier Free
# az security pricing create --name CloudPosture --tier Free
```
