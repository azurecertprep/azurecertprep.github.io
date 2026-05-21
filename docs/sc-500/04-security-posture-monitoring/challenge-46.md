---
sidebar_position: 46
title: "Challenge 46: Sentinel – Windows Security Events, Custom Logs, and Purview Audit"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 46: Sentinel – Windows Security Events, Custom Logs, and Purview Audit

## Exam skills covered

- Configure Windows Security Events collection via AMA
- Create and manage custom log tables (DCR-based)
- Configure Microsoft Purview Audit log collection
- Design ingestion pipelines for custom data sources

## Scenario

Contoso Ltd's SOC needs to ingest Windows Security events from domain controllers and member servers, collect custom application logs from a proprietary HR system, and stream Microsoft Purview Audit logs to correlate data access with security incidents. You must configure these diverse data sources using modern Azure Monitor Agent pipelines.

---

## Prerequisites

- Azure subscription with Owner or Contributor role
- Microsoft Sentinel workspace enabled
- Azure CLI with `monitor` and `sentinel` extensions
- A Windows VM (or create one for lab purposes)
- Microsoft 365 E5 or equivalent license (for Purview Audit)

---

## Task 1: Set up the workspace and deploy a Windows VM

Prepare the environment for Windows event collection.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-sentinel-events"
LOCATION="eastus"
WORKSPACE_NAME="law-contoso-events"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Create Log Analytics workspace with Sentinel
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --retention-time 90

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Enable Sentinel
az sentinel onboarding-state create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default"

# Create a Windows Server VM
az vm create \
  --resource-group $RG_NAME \
  --name "vm-dc-contoso01" \
  --image Win2022Datacenter \
  --size Standard_B2ms \
  --admin-username azureadmin \
  --admin-password "Contoso!Lab2024#" \
  --nsg-rule RDP

VM_ID=$(az vm show --resource-group $RG_NAME --name "vm-dc-contoso01" --query id -o tsv)
```

## Task 2: Install Azure Monitor Agent and configure Windows Security Events

Deploy AMA and create a DCR for Windows Security event collection.

```bash
# Install Azure Monitor Agent on Windows VM
az vm extension set \
  --resource-group $RG_NAME \
  --vm-name "vm-dc-contoso01" \
  --name AzureMonitorWindowsAgent \
  --publisher Microsoft.Azure.Monitor

# Create DCR for Windows Security Events (Common tier - recommended balance)
az monitor data-collection rule create \
  --name "dcr-windows-security" \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --data-flows '[{
    "streams": ["Microsoft-SecurityEvent"],
    "destinations": ["sentinelWorkspace"]
  }]' \
  --log-analytics "[{
    \"name\": \"sentinelWorkspace\",
    \"workspaceResourceId\": \"${WORKSPACE_ID}\"
  }]" \
  --windows-event-logs "[{
    \"name\": \"securityEvents\",
    \"streams\": [\"Microsoft-SecurityEvent\"],
    \"xPathQueries\": [
      \"Security!*[System[(EventID=4624 or EventID=4625 or EventID=4648 or EventID=4672 or EventID=4688 or EventID=4698 or EventID=4720 or EventID=4726 or EventID=4728 or EventID=4732 or EventID=4756 or EventID=1102)]]\"
    ]
  }]"

# Associate DCR with the Windows VM
DCR_ID=$(az monitor data-collection rule show \
  --name "dcr-windows-security" \
  --resource-group $RG_NAME \
  --query id -o tsv)

az monitor data-collection rule association create \
  --name "windows-security-association" \
  --resource $VM_ID \
  --rule-id $DCR_ID

echo "Windows Security Events configured with custom XPath filter"
echo "Collecting: Logon(4624), Failed Logon(4625), Explicit Creds(4648),"
echo "  Special Privileges(4672), Process Create(4688), Scheduled Task(4698),"
echo "  Account Mgmt(4720,4726), Group Mgmt(4728,4732,4756), Log Cleared(1102)"
```

## Task 3: Create a custom log table for application data

Define a custom table and DCR for ingesting proprietary HR application logs.

```bash
# Create a custom log table in the workspace
az monitor log-analytics workspace table create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "ContosoHRApp_CL" \
  --retention-time 90 \
  --total-retention-time 180 \
  --columns TimeGenerated=datetime EventType=string UserPrincipalName=string Action=string TargetResource=string SourceIP=string Result=string AdditionalDetails=string

# Verify custom table was created
az monitor log-analytics workspace table show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "ContosoHRApp_CL" \
  --query "{Table:name, Retention:retentionInDays, Plan:plan, Columns:schema.columns[].name}" -o json
```

## Task 4: Create a DCR for custom log ingestion

Configure a Data Collection Rule with a transformation to normalize the custom log data.

```bash
# Create Data Collection Endpoint (required for custom logs)
az monitor data-collection endpoint create \
  --name "dce-contoso-custom" \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --public-network-access Enabled

DCE_ID=$(az monitor data-collection endpoint show \
  --name "dce-contoso-custom" \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Create DCR for custom log ingestion with transformation
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Insights/dataCollectionRules/dcr-custom-hrapp?api-version=2022-06-01" \
  --body "{
    \"location\": \"${LOCATION}\",
    \"properties\": {
      \"dataCollectionEndpointId\": \"${DCE_ID}\",
      \"streamDeclarations\": {
        \"Custom-ContosoHRApp_CL\": {
          \"columns\": [
            {\"name\": \"TimeGenerated\", \"type\": \"datetime\"},
            {\"name\": \"EventType\", \"type\": \"string\"},
            {\"name\": \"UserPrincipalName\", \"type\": \"string\"},
            {\"name\": \"Action\", \"type\": \"string\"},
            {\"name\": \"TargetResource\", \"type\": \"string\"},
            {\"name\": \"SourceIP\", \"type\": \"string\"},
            {\"name\": \"Result\", \"type\": \"string\"},
            {\"name\": \"AdditionalDetails\", \"type\": \"string\"}
          ]
        }
      },
      \"destinations\": {
        \"logAnalytics\": [{
          \"workspaceResourceId\": \"${WORKSPACE_ID}\",
          \"name\": \"sentinelWorkspace\"
        }]
      },
      \"dataFlows\": [{
        \"streams\": [\"Custom-ContosoHRApp_CL\"],
        \"destinations\": [\"sentinelWorkspace\"],
        \"transformKql\": \"source | extend TimeGenerated = coalesce(TimeGenerated, now())\",
        \"outputStream\": \"Custom-ContosoHRApp_CL\"
      }]
    }
  }"

echo "Custom log DCR created with transformation pipeline"
```

## Task 5: Ingest test data via the Logs Ingestion API

Send test data to the custom log table using the Data Collection API.

```bash
# Get the DCR immutable ID and DCE endpoint
DCR_IMMUTABLE_ID=$(az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Insights/dataCollectionRules/dcr-custom-hrapp?api-version=2022-06-01" \
  --query "properties.immutableId" -o tsv)

DCE_ENDPOINT=$(az monitor data-collection endpoint show \
  --name "dce-contoso-custom" \
  --resource-group $RG_NAME \
  --query "logsIngestion.endpoint" -o tsv)

echo "DCE Endpoint: ${DCE_ENDPOINT}"
echo "DCR Immutable ID: ${DCR_IMMUTABLE_ID}"

# Get access token for ingestion
TOKEN=$(az account get-access-token --resource "https://monitor.azure.com/" --query accessToken -o tsv)

# Send test data to the custom table
curl -X POST "${DCE_ENDPOINT}/dataCollectionRules/${DCR_IMMUTABLE_ID}/streams/Custom-ContosoHRApp_CL?api-version=2023-01-01" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "TimeGenerated": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
      "EventType": "AccessRequest",
      "UserPrincipalName": "john.doe@contoso.com",
      "Action": "ViewSalaryRecord",
      "TargetResource": "Employee/12345",
      "SourceIP": "10.0.1.50",
      "Result": "Success",
      "AdditionalDetails": "Viewed own salary record"
    },
    {
      "TimeGenerated": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
      "EventType": "AccessRequest",
      "UserPrincipalName": "jane.admin@contoso.com",
      "Action": "ExportAllRecords",
      "TargetResource": "Employee/*",
      "SourceIP": "10.0.2.100",
      "Result": "Denied",
      "AdditionalDetails": "Bulk export attempt blocked by policy"
    }
  ]' 2>/dev/null || echo "Note: Requires valid DCE endpoint and permissions"

echo "Test data sent - check ContosoHRApp_CL table in ~5 minutes"
```

## Task 6: Configure Microsoft Purview Audit log connector

Enable Purview Audit data collection for data governance visibility.

```bash
# Enable Office 365 / Microsoft Purview Audit connector
# This uses the Office 365 Management Activity API
az rest --method PUT \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/dataConnectors/office365-connector?api-version=2024-03-01" \
  --body '{
    "kind": "Office365",
    "properties": {
      "tenantId": "'"$(az account show --query tenantId -o tsv)"'",
      "dataTypes": {
        "exchange": {"state": "Enabled"},
        "sharePoint": {"state": "Enabled"},
        "teams": {"state": "Enabled"}
      }
    }
  }'

echo "Office 365 / Purview Audit connector enabled"
echo "Data flows to: OfficeActivity table"
echo ""
echo "For Purview-specific audit queries, use:"
echo "  OfficeActivity | where OfficeWorkload == 'MicrosoftPurview'"
echo "  OfficeActivity | where Operation contains 'Sensitivity'"
```

---

## Break & Fix

### Scenario 1: Windows Security events show only a subset of expected Event IDs

The DCR is configured but only logon events (4624) appear—no process creation or account management events.

<details>
<summary>Show solution</summary>

```bash
# Check the XPath query in the DCR
az monitor data-collection rule show \
  --name "dcr-windows-security" \
  --resource-group $RG_NAME \
  --query "properties.dataSources.windowsEventLogs[0].xPathQueries" -o tsv

# Common issue: XPath query is too restrictive or has syntax errors
# The XML filter must use proper XPath for Windows Event Log

# Verify events are being generated on the VM
az vm run-command invoke \
  --resource-group $RG_NAME \
  --name "vm-dc-contoso01" \
  --command-id RunPowerShellScript \
  --scripts '
    # Check if audit policies are enabled
    auditpol /get /category:*
    
    # Enable process creation auditing
    auditpol /set /subcategory:"Process Creation" /success:enable /failure:enable
    
    # Enable account management auditing
    auditpol /set /subcategory:"User Account Management" /success:enable /failure:enable
    auditpol /set /subcategory:"Security Group Management" /success:enable /failure:enable
  '

# Fix: Windows audit policy must be enabled for events to be generated
# The DCR can only collect events that Windows actually generates
```

</details>

### Scenario 2: Custom log ingestion returns 403 Forbidden

Sending data to the Logs Ingestion API returns a 403 error.

<details>
<summary>Show solution</summary>

```bash
# The identity sending data needs "Monitoring Metrics Publisher" role on the DCR
# Check current role assignments on the DCR

DCR_RESOURCE_ID="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Insights/dataCollectionRules/dcr-custom-hrapp"

az role assignment list \
  --scope $DCR_RESOURCE_ID \
  --query "[].{Principal:principalName, Role:roleDefinitionName}" -o table

# Assign the required role to the identity/service principal sending data
# For a user:
az role assignment create \
  --assignee "$(az account show --query user.name -o tsv)" \
  --role "Monitoring Metrics Publisher" \
  --scope $DCR_RESOURCE_ID

# For a managed identity or service principal:
# az role assignment create --assignee <app-id> --role "Monitoring Metrics Publisher" --scope $DCR_RESOURCE_ID

echo "Role assigned - retry the ingestion request"
```

</details>

### Scenario 3: Custom table shows "BasicLogs" plan but you need full KQL query support

The ContosoHRApp_CL table was accidentally set to Basic plan but the SOC needs full analytics.

<details>
<summary>Show solution</summary>

```bash
# Check current table plan
az monitor log-analytics workspace table show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "ContosoHRApp_CL" \
  --query "{Table:name, Plan:plan}" -o table

# Change from Basic to Analytics plan
az monitor log-analytics workspace table update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "ContosoHRApp_CL" \
  --plan Analytics

# Note: Changing from Basic to Analytics:
# - Takes effect immediately for new data
# - Historical data ingested under Basic plan remains Basic (limited queries)
# - Analytics plan costs more per GB but supports full KQL, alerts, and Sentinel rules
# - Cannot change back from Analytics to Basic for 30 days

echo "Table plan changed to Analytics - full KQL support enabled"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What Windows audit policy setting is required BEFORE Windows Security events can be collected by a DCR?",
    options: [
      "No audit policy is needed; the DCR handles everything",
      "Windows audit policy must be enabled for the specific event categories you want to collect",
      "Only the Security log size needs to be increased",
      "Windows Defender must be in active mode"
    ],
    correctIndex: 1,
    explanation: "Windows only generates Security events when the corresponding audit policies are enabled (e.g., 'Audit Process Creation' for Event ID 4688). The DCR can only collect events that Windows actually writes to the Security log."
  },
  {
    question: "What components are required to ingest custom application logs into a Sentinel custom table?",
    options: [
      "Only a Log Analytics workspace",
      "A Data Collection Endpoint (DCE), a Data Collection Rule (DCR) with stream declaration, and the custom table definition",
      "An Azure Function and Event Hub",
      "Only the legacy HTTP Data Collector API"
    ],
    correctIndex: 1,
    explanation: "Custom log ingestion requires: (1) a DCE that provides the ingestion endpoint, (2) a DCR that defines the stream schema, transformation, and destination, and (3) the custom table (_CL) in the workspace matching the output schema."
  },
  {
    question: "What is the key difference between the 'Analytics' and 'Basic' table plans in Log Analytics?",
    options: [
      "Analytics is free; Basic costs per GB",
      "Basic supports full KQL queries; Analytics is limited",
      "Analytics supports full KQL, alerts, and Sentinel rules; Basic supports limited queries at lower cost",
      "Basic stores data longer than Analytics"
    ],
    correctIndex: 2,
    explanation: "Analytics plan tables support full KQL queries, scheduled alerts, and Sentinel analytics rules but cost more per GB ingested. Basic plan tables cost ~60% less but only support limited KQL operators, cannot be used in alert rules, and have a fixed 8-day interactive retention."
  }
]} />

## Cleanup

```bash
# Delete data collection rules and associations
az monitor data-collection rule association delete \
  --name "windows-security-association" \
  --resource $VM_ID --yes

az monitor data-collection rule delete \
  --name "dcr-windows-security" \
  --resource-group $RG_NAME --yes

az rest --method DELETE \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Insights/dataCollectionRules/dcr-custom-hrapp?api-version=2022-06-01"

az monitor data-collection endpoint delete \
  --name "dce-contoso-custom" \
  --resource-group $RG_NAME --yes

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait

echo "Cleanup complete - all DCRs, endpoints, and resources deleted"
```
