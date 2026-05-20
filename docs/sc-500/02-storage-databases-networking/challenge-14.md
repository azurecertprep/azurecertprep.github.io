---
sidebar_position: 14
title: "Challenge 14: Defender for Storage Threat Protection"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 14: Defender for Storage Threat Protection

## Exam skills covered

- Enable and configure Microsoft Defender for Storage
- Configure sensitivity scanning for data discovery
- Configure malware scanning for uploaded content
- Monitor and respond to storage security alerts
- Configure activity monitoring for anomalous access patterns

## Scenario

Contoso Ltd recently experienced an incident where malware was uploaded to an Azure Blob Storage container used by their file-sharing application. Additionally, the security team discovered that sensitive data (credit card numbers and social security numbers) was being stored in containers without proper classification. You must enable Microsoft Defender for Storage to provide threat protection, malware scanning on upload, and sensitive data discovery across Contoso's storage accounts.

---

## Prerequisites

- Azure subscription with Security Admin or Contributor role
- Azure CLI installed and authenticated (`az login`)
- Microsoft Defender for Cloud enabled (free tier minimum)
- An existing storage account or willingness to create one

---

## Task 1: Enable Microsoft Defender for Storage at subscription level

Enable Defender for Storage with the new per-transaction pricing plan that includes malware scanning and sensitivity scanning.

```bash
# Set variables
RG="rg-sc500-defender-storage"
LOCATION="eastus"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create resource group
az group create --name $RG --location $LOCATION

# Enable Defender for Storage at subscription level (new plan)
az security pricing create \
  --name StorageAccounts \
  --tier Standard

# Verify Defender for Storage is enabled
az security pricing show \
  --name StorageAccounts \
  --query "{Name:name, Tier:pricingTier, SubPlan:subPlan}"

# Check available extensions (malware scanning, sensitivity scanning)
az security pricing show \
  --name StorageAccounts \
  --query "extensions"
```

---

## Task 2: Configure per-storage-account Defender settings

Enable Defender for Storage on a specific storage account with malware scanning and sensitivity data discovery.

```bash
# Create a storage account for testing
STORAGE_ACCOUNT="stdefender$(openssl rand -hex 4)"
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Enable Defender for Storage on the specific account using ARM
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/providers/Microsoft.Security/defenderForStorageSettings/current?api-version=2022-12-01-preview" \
  --body '{
    "properties": {
      "isEnabled": true,
      "malwareScanning": {
        "onUpload": {
          "isEnabled": true,
          "capGBPerMonth": 5000
        }
      },
      "sensitiveDataDiscovery": {
        "isEnabled": true
      },
      "overrideSubscriptionLevelSettings": true
    }
  }'

# Verify Defender settings on the storage account
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/providers/Microsoft.Security/defenderForStorageSettings/current?api-version=2022-12-01-preview"
```

---

## Task 3: Configure malware scanning with automated response

Set up malware scanning with Event Grid integration to automatically quarantine malicious files.

```bash
# Create a quarantine container
STORAGE_KEY=$(az storage account keys list \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --query "[0].value" -o tsv)

az storage container create \
  --name uploads \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY

az storage container create \
  --name quarantine \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY

az storage container create \
  --name clean \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY

# Create Event Grid system topic for the storage account
az eventgrid system-topic create \
  --name "evgt-defender-storage" \
  --resource-group $RG \
  --location $LOCATION \
  --source "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT" \
  --topic-type "Microsoft.Storage.StorageAccounts"

# Create an Event Grid subscription to filter malware scanning results
# This would typically trigger an Azure Function or Logic App
az eventgrid system-topic event-subscription create \
  --name "malware-scan-results" \
  --system-topic-name "evgt-defender-storage" \
  --resource-group $RG \
  --included-event-types "Microsoft.Security.MalwareScanningResult" \
  --endpoint-type storagequeue \
  --endpoint "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/queueServices/default/queues/scan-results"

# Create the queue first
az storage queue create \
  --name scan-results \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY
```

---

## Task 4: Configure sensitivity scanning and data classification

Set up sensitive data discovery to identify PII and financial data in storage accounts.

```bash
# Verify sensitivity scanning is enabled (configured in Task 2)
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/providers/Microsoft.Security/defenderForStorageSettings/current?api-version=2022-12-01-preview" \
  --query "properties.sensitiveDataDiscovery"

# Upload sample files to test sensitivity scanning
echo "Customer: John Doe, SSN: 123-45-6789, CC: 4111-1111-1111-1111" > sample-sensitive.txt

az storage blob upload \
  --container-name uploads \
  --name "customer-data/sample-sensitive.txt" \
  --file sample-sensitive.txt \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY

# Upload a non-sensitive file for comparison
echo "Product catalog: Widget A, Widget B, Widget C" > sample-clean.txt

az storage blob upload \
  --container-name uploads \
  --name "catalog/sample-clean.txt" \
  --file sample-clean.txt \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY

# Clean up local files
rm -f sample-sensitive.txt sample-clean.txt

# View security alerts (sensitivity findings appear after scanning)
az security alert list \
  --resource-group $RG \
  --query "[?contains(alertType, 'Storage')].{Type:alertType, Severity:severity, Status:status, Time:timeGeneratedUtc}" \
  -o table
```

---

## Task 5: Monitor and investigate storage security alerts

Review and manage security alerts generated by Defender for Storage.

```bash
# List all storage-related security alerts
az security alert list \
  --query "[?contains(alertType, 'Storage')].{AlertType:alertType, Name:alertDisplayName, Severity:severity, Status:status}" \
  -o table

# Get details of a specific alert type
az security alert list \
  --query "[?alertType=='Storage.Blob_MalwareHashReputation']"

# Simulate suspicious activity - access from Tor exit node (for awareness)
# Note: This would normally trigger "Access from a Tor exit node" alert
# az security alert list --query "[?alertType=='Storage.Blob_TorAnomaly']"

# List alert types that Defender for Storage can detect:
echo "Common Defender for Storage alert types:"
echo "  - Storage.Blob_MalwareHashReputation (Known malware uploaded)"
echo "  - Storage.Blob_MalwareScanMalwareFound (Malware found by scan)"
echo "  - Storage.Blob_TorAnomaly (Access from Tor exit node)"
echo "  - Storage.Blob_AccessInspectionAnomaly (Unusual access pattern)"
echo "  - Storage.Blob_DataExfiltration (Potential data exfiltration)"
echo "  - Storage.Blob_GeoAnomaly (Access from unusual location)"
echo "  - Storage.Blob_AnonymousAccessAnomaly (Anonymous access anomaly)"

# Configure alert suppression rule (suppress known false positives)
az security automation create \
  --name "suppress-known-scanner" \
  --resource-group $RG \
  --location $LOCATION \
  --scopes "[{\"description\":\"Subscription\",\"scopePath\":\"/subscriptions/$SUBSCRIPTION_ID\"}]" \
  --sources "[{\"eventSource\":\"Alerts\",\"ruleSets\":[{\"rules\":[{\"propertyJPath\":\"Severity\",\"propertyType\":\"String\",\"expectedValue\":\"Low\",\"operator\":\"Equals\"}]}]}]" \
  --actions "[{\"actionType\":\"LogicApp\",\"logicAppResourceId\":\"/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Logic/workflows/placeholder\",\"uri\":\"https://placeholder.logic.azure.com\"}]"
```

---

## Task 6: Configure diagnostic settings for storage security auditing

Set up diagnostic logging to capture all security-relevant storage operations.

```bash
# Create Log Analytics workspace for storage diagnostics
WORKSPACE_NAME="law-sc500-storage"
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --location $LOCATION

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --query id -o tsv)

# Enable diagnostic settings for the storage account (blob service)
az monitor diagnostic-settings create \
  --name "storage-security-audit" \
  --resource "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/blobServices/default" \
  --workspace $WORKSPACE_ID \
  --logs '[{"category": "StorageRead", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}}, {"category": "StorageWrite", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}}, {"category": "StorageDelete", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}}]' \
  --metrics '[{"category": "Transaction", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}}]'

# Verify diagnostic settings
az monitor diagnostic-settings list \
  --resource "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/blobServices/default" \
  --query "[].{Name:name, WorkspaceId:workspaceId}" -o table
```

---

## Break & Fix

### Scenario 1: Malware scanning not triggering on file uploads

Users are uploading files to the storage account but malware scanning alerts are not being generated for known test malware files (EICAR test file). The Defender plan shows as enabled.

<details>
<summary>Show solution</summary>

```bash
# Check if malware scanning on-upload is enabled
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/providers/Microsoft.Security/defenderForStorageSettings/current?api-version=2022-12-01-preview" \
  --query "properties.malwareScanning.onUpload"

# If capGBPerMonth is reached, scanning stops. Check usage.
# Re-enable with adequate cap
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/providers/Microsoft.Security/defenderForStorageSettings/current?api-version=2022-12-01-preview" \
  --body '{
    "properties": {
      "isEnabled": true,
      "malwareScanning": {
        "onUpload": {
          "isEnabled": true,
          "capGBPerMonth": 10000
        }
      },
      "sensitiveDataDiscovery": {
        "isEnabled": true
      },
      "overrideSubscriptionLevelSettings": true
    }
  }'

# Also verify the storage account allows the Defender service
# The storage firewall must allow trusted Microsoft services
az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --bypass AzureServices
```

</details>

### Scenario 2: Sensitivity scanning shows no results after 48 hours

Defender for Storage sensitivity scanning was enabled but no sensitive data findings appear despite known PII in the containers.

<details>
<summary>Show solution</summary>

```bash
# Verify sensitivity scanning is enabled
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/providers/Microsoft.Security/defenderForStorageSettings/current?api-version=2022-12-01-preview" \
  --query "properties.sensitiveDataDiscovery.isEnabled"

# Check if the storage account has the required permissions
# Sensitivity scanning requires Microsoft Purview to be connected
# Verify Microsoft Purview integration in Defender for Cloud settings

# Check if the subscription has Microsoft Purview configured
az security pricing show \
  --name StorageAccounts \
  --query "extensions[?name=='SensitiveDataDiscovery']"

# Ensure the storage account is not excluded from scanning
# and that blobs are in supported formats (text, CSV, JSON, Parquet, etc.)

# Re-upload data in supported format
echo "name,ssn,credit_card" > test-data.csv
echo "John Doe,123-45-6789,4111111111111111" >> test-data.csv
az storage blob upload \
  --container-name uploads \
  --name "pii-test/test-data.csv" \
  --file test-data.csv \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --overwrite
rm -f test-data.csv
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What happens when the monthly cap for malware scanning (capGBPerMonth) is reached in Defender for Storage?",
    options: [
      "All storage operations are blocked until the next month",
      "Malware scanning stops for the remainder of the month but uploads continue",
      "The cap automatically increases by 50%",
      "Alerts are still generated but files are not quarantined"
    ],
    correctIndex: 1,
    explanation: "When the monthly scanning cap is reached, Defender for Storage stops scanning new uploads for the remainder of the month. Uploads are not blocked — they simply proceed without being scanned. This is a cost-control mechanism."
  },
  {
    question: "Which Event Grid event type should you subscribe to for receiving malware scanning results from Defender for Storage?",
    options: [
      "Microsoft.Storage.BlobCreated",
      "Microsoft.Security.MalwareScanningResult",
      "Microsoft.Defender.StorageAlert",
      "Microsoft.Storage.BlobThreatDetected"
    ],
    correctIndex: 1,
    explanation: "The 'Microsoft.Security.MalwareScanningResult' event type is published to Event Grid when Defender for Storage completes a malware scan. The event contains the scan verdict (malicious or clean) and can trigger automated responses."
  },
  {
    question: "Which prerequisite is required for Defender for Storage sensitivity scanning to discover PII in blob containers?",
    options: [
      "Azure Information Protection labels must be applied to all blobs",
      "Microsoft Purview must be connected to the Defender for Cloud environment",
      "Customer-managed keys must be configured on the storage account",
      "Azure Policy must be assigned to enforce data classification"
    ],
    correctIndex: 1,
    explanation: "Defender for Storage sensitivity scanning leverages Microsoft Purview's data classification engine. Microsoft Purview must be connected to the Defender for Cloud environment for sensitive data discovery to function."
  },
  {
    question: "To ensure Defender for Storage malware scanning works when the storage account firewall is enabled, what must be configured?",
    options: [
      "Add Microsoft Defender's IP range to the storage firewall allow list",
      "Configure the bypass to allow 'Trusted Microsoft services'",
      "Create a private endpoint for the Defender service",
      "Disable the storage firewall during scanning windows"
    ],
    correctIndex: 1,
    explanation: "When storage account firewalls are enabled, you must configure the 'Trusted Microsoft services' bypass to allow Defender for Storage to access and scan blobs. Defender for Storage is a trusted first-party Microsoft service."
  }
]} />

## Cleanup

```bash
# Delete the resource group and all resources
az group delete --name $RG --yes --no-wait

# Remove the Event Grid system topic if needed
az eventgrid system-topic delete \
  --name "evgt-defender-storage" \
  --resource-group $RG --yes 2>/dev/null
```
