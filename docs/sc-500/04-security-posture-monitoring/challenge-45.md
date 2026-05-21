---
sidebar_position: 45
title: "Challenge 45: Sentinel Data Connectors (Azure Resources, Syslog, CEF)"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 45: Sentinel Data Connectors (Azure Resources, Syslog, CEF)

## Exam skills covered

- Configure data connectors for Azure resources
- Configure Syslog and CEF data collection
- Configure threat intelligence connectors
- Validate data connector health and ingestion

## Scenario

Contoso Ltd has enabled Microsoft Sentinel and now needs to connect data sources. The SOC requires visibility into Azure activity logs, Entra ID sign-ins, Defender for Cloud alerts, Linux server syslog events, and network appliance logs via CEF. You must configure these data connectors and validate that data is flowing correctly into the workspace.

---

## Prerequisites

- Azure subscription with Owner or Contributor role
- Microsoft Sentinel workspace (from Challenge 44 or new)
- Azure CLI installed with `sentinel` extension
- A Linux VM for syslog/CEF collection (or create one in this lab)

---

## Task 1: Set up the Sentinel workspace

Create or reference the Sentinel workspace and prepare for data connector configuration.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-sentinel-connectors"
LOCATION="eastus"
WORKSPACE_NAME="law-contoso-soc"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --retention-time 90

# Enable Sentinel
az sentinel onboarding-state create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default"

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query id -o tsv)

echo "Sentinel workspace ready: ${WORKSPACE_ID}"
```

## Task 2: Connect Azure Activity Logs

Configure the Azure Activity data connector to stream subscription-level events.

```bash
# Create diagnostic setting to send Activity Logs to the Sentinel workspace
az monitor diagnostic-settings create \
  --name "send-activity-to-sentinel" \
  --resource "/subscriptions/${SUBSCRIPTION_ID}" \
  --workspace $WORKSPACE_ID \
  --logs '[
    {"category": "Administrative", "enabled": true},
    {"category": "Security", "enabled": true},
    {"category": "Alert", "enabled": true},
    {"category": "Policy", "enabled": true},
    {"category": "Recommendation", "enabled": true}
  ]'

# Verify diagnostic setting
az monitor diagnostic-settings show \
  --name "send-activity-to-sentinel" \
  --resource "/subscriptions/${SUBSCRIPTION_ID}" \
  --query "{Name:name, Workspace:workspaceId, Categories:logs[?enabled].category}" -o json

echo "Azure Activity connector configured - data appears in AzureActivity table"
```

## Task 3: Connect Microsoft Entra ID sign-in and audit logs

Configure the Entra ID data connector for identity visibility.

```bash
# Enable Entra ID diagnostic settings
# Note: Requires Azure AD Premium P1/P2 license for sign-in logs
az monitor diagnostic-settings create \
  --name "entra-to-sentinel" \
  --resource "/providers/Microsoft.aadiam" \
  --workspace $WORKSPACE_ID \
  --logs '[
    {"category": "SignInLogs", "enabled": true},
    {"category": "AuditLogs", "enabled": true},
    {"category": "NonInteractiveUserSignInLogs", "enabled": true},
    {"category": "ServicePrincipalSignInLogs", "enabled": true},
    {"category": "ManagedIdentitySignInLogs", "enabled": true},
    {"category": "RiskyUsers", "enabled": true},
    {"category": "UserRiskEvents", "enabled": true}
  ]' 2>/dev/null || echo "Note: Requires Global Admin or Security Admin for Entra ID diagnostics"

echo "Entra ID logs configured - data flows to SigninLogs and AuditLogs tables"
```

## Task 4: Connect Defender for Cloud alerts

Enable the Defender for Cloud data connector via the Sentinel API.

```bash
# Enable Microsoft Defender for Cloud data connector
az sentinel data-connector create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --data-connector-id "defender-for-cloud-connector" \
  --azure-security-center "{
    \"subscriptionId\": \"${SUBSCRIPTION_ID}\",
    \"dataTypes\": {\"alerts\": {\"state\": \"Enabled\"}}
  }" 2>/dev/null

# Alternative: Use REST API for the connector
az rest --method PUT \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/dataConnectors/defender-cloud-connector?api-version=2024-03-01" \
  --body "{
    \"kind\": \"AzureSecurityCenter\",
    \"properties\": {
      \"subscriptionId\": \"${SUBSCRIPTION_ID}\",
      \"dataTypes\": {
        \"alerts\": {
          \"state\": \"Enabled\"
        }
      }
    }
  }"

echo "Defender for Cloud connector enabled - alerts flow to SecurityAlert table"
```

## Task 5: Configure Syslog collection from Linux VMs

Deploy a Linux VM and configure syslog forwarding to Sentinel via Azure Monitor Agent.

```bash
# Create a Linux VM for syslog collection
az vm create \
  --resource-group $RG_NAME \
  --name "vm-syslog-collector" \
  --image Ubuntu2404 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys

# Install Azure Monitor Agent
az vm extension set \
  --resource-group $RG_NAME \
  --vm-name "vm-syslog-collector" \
  --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor \
  --settings '{}'

# Create a Data Collection Rule for Syslog
az monitor data-collection rule create \
  --name "dcr-syslog-contoso" \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --data-flows '[{
    "streams": ["Microsoft-Syslog"],
    "destinations": ["logAnalyticsWorkspace"]
  }]' \
  --log-analytics "[{
    \"name\": \"logAnalyticsWorkspace\",
    \"workspaceResourceId\": \"${WORKSPACE_ID}\"
  }]" \
  --syslog "[{
    \"name\": \"syslogDataSource\",
    \"streams\": [\"Microsoft-Syslog\"],
    \"facilityNames\": [\"auth\", \"authpriv\", \"daemon\", \"kern\", \"syslog\"],
    \"logLevels\": [\"Warning\", \"Error\", \"Critical\", \"Alert\", \"Emergency\"]
  }]"

# Associate DCR with the VM
DCR_ID=$(az monitor data-collection rule show \
  --name "dcr-syslog-contoso" \
  --resource-group $RG_NAME \
  --query id -o tsv)

VM_ID=$(az vm show --resource-group $RG_NAME --name "vm-syslog-collector" --query id -o tsv)

az monitor data-collection rule association create \
  --name "syslog-association" \
  --resource $VM_ID \
  --rule-id $DCR_ID

echo "Syslog collection configured - auth/kern/daemon logs at Warning+ severity"
```

## Task 6: Configure CEF log collection

Set up Common Event Format (CEF) log collection for network appliances.

```bash
# Create a DCR for CEF log collection
az monitor data-collection rule create \
  --name "dcr-cef-contoso" \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --data-flows '[{
    "streams": ["Microsoft-CommonSecurityLog"],
    "destinations": ["logAnalyticsWorkspace"]
  }]' \
  --log-analytics "[{
    \"name\": \"logAnalyticsWorkspace\",
    \"workspaceResourceId\": \"${WORKSPACE_ID}\"
  }]" \
  --syslog "[{
    \"name\": \"cefDataSource\",
    \"streams\": [\"Microsoft-CommonSecurityLog\"],
    \"facilityNames\": [\"local0\", \"local1\", \"local2\", \"local3\"],
    \"logLevels\": [\"Debug\", \"Info\", \"Notice\", \"Warning\", \"Error\", \"Critical\", \"Alert\", \"Emergency\"]
  }]"

# Associate with the collector VM
CEF_DCR_ID=$(az monitor data-collection rule show \
  --name "dcr-cef-contoso" \
  --resource-group $RG_NAME \
  --query id -o tsv)

az monitor data-collection rule association create \
  --name "cef-association" \
  --resource $VM_ID \
  --rule-id $CEF_DCR_ID

# Configure the VM's rsyslog to receive CEF from network devices
az vm run-command invoke \
  --resource-group $RG_NAME \
  --name "vm-syslog-collector" \
  --command-id RunShellScript \
  --scripts '
    # Enable rsyslog to listen on UDP 514
    sudo sed -i "s/#module(load=\"imudp\")/module(load=\"imudp\")/" /etc/rsyslog.conf
    sudo sed -i "s/#input(type=\"imudp\" port=\"514\")/input(type=\"imudp\" port=\"514\")/" /etc/rsyslog.conf
    
    # Enable TCP 514
    sudo sed -i "s/#module(load=\"imtcp\")/module(load=\"imtcp\")/" /etc/rsyslog.conf
    sudo sed -i "s/#input(type=\"imtcp\" port=\"514\")/input(type=\"imtcp\" port=\"514\")/" /etc/rsyslog.conf
    
    # Restart rsyslog
    sudo systemctl restart rsyslog
    echo "rsyslog configured to receive CEF on TCP/UDP 514"
  '

echo "CEF collection configured - network appliances should forward to this VM on port 514"
echo "CEF data appears in the CommonSecurityLog table"
```

---

## Break & Fix

### Scenario 1: Azure Activity logs not appearing in Sentinel after 1 hour

The diagnostic setting was created but no data appears in the AzureActivity table.

<details>
<summary>Show solution</summary>

```bash
# Verify diagnostic setting targets the correct workspace
az monitor diagnostic-settings show \
  --name "send-activity-to-sentinel" \
  --resource "/subscriptions/${SUBSCRIPTION_ID}" \
  --query "{Workspace:workspaceId, Enabled:logs[?enabled].category}"

# Check if the workspace ID is correct
echo "Expected workspace: ${WORKSPACE_ID}"

# Common issues:
# 1. Diagnostic setting points to wrong workspace
# 2. Activity log categories not enabled
# 3. No activity has occurred since enabling (generate some activity)

# Generate test activity
az group create --name "rg-test-activity" --location eastus
az group delete --name "rg-test-activity" --yes --no-wait

# Verify data ingestion (may take 5-10 minutes)
# In portal: Sentinel > Logs > AzureActivity | take 10

# If wrong workspace, recreate the diagnostic setting
az monitor diagnostic-settings delete \
  --name "send-activity-to-sentinel" \
  --resource "/subscriptions/${SUBSCRIPTION_ID}"

# Then recreate with correct workspace ID
```

</details>

### Scenario 2: Syslog data not flowing from Linux VM

The Azure Monitor Agent is installed and DCR is associated, but no Syslog data appears.

<details>
<summary>Show solution</summary>

```bash
# Check AMA extension status on the VM
az vm extension show \
  --resource-group $RG_NAME \
  --vm-name "vm-syslog-collector" \
  --name AzureMonitorLinuxAgent \
  --query "{Status:provisioningState, Version:typeHandlerVersion}" -o table

# Verify DCR association
az monitor data-collection rule association list \
  --resource $VM_ID \
  --query "[].{Name:name, RuleId:dataCollectionRuleId}" -o table

# Check if agent is picking up the DCR (SSH into VM)
az vm run-command invoke \
  --resource-group $RG_NAME \
  --name "vm-syslog-collector" \
  --command-id RunShellScript \
  --scripts '
    # Check AMA status
    systemctl status azuremonitoragent
    
    # Check if AMA is listening for syslog
    ss -tlnp | grep mdsd
    
    # Generate test syslog event
    logger -p auth.warning "Test authentication warning from Contoso"
    
    # Check AMA logs for errors
    tail -20 /var/opt/microsoft/azuremonitoragent/log/mdsd.err
  '

# Common fixes:
# 1. Restart the AMA service
# 2. Verify DCR has correct facility/severity levels
# 3. Check if rsyslog is forwarding to AMA's socket
```

</details>

### Scenario 3: CEF messages ingested but parsed incorrectly

CEF logs appear in CommonSecurityLog but fields like DeviceVendor, DeviceProduct are empty.

<details>
<summary>Show solution</summary>

```bash
# CEF format requires a specific header format:
# CEF:0|Vendor|Product|Version|SignatureID|Name|Severity|Extension
# If the source is sending invalid CEF, fields will be empty

# Test with a properly formatted CEF message
az vm run-command invoke \
  --resource-group $RG_NAME \
  --name "vm-syslog-collector" \
  --command-id RunShellScript \
  --scripts '
    # Send a valid CEF test message via syslog
    logger -p local0.warning "CEF:0|Contoso|Firewall|1.0|100|Connection Blocked|7|src=192.168.1.100 dst=10.0.0.5 dpt=443 act=Block"
    
    # Common CEF formatting issues:
    # 1. Missing "CEF:0|" prefix
    # 2. Wrong number of pipe-delimited fields in header
    # 3. Incorrect extension key-value formatting
    # 4. Using wrong syslog facility (must match DCR)
    
    echo "Valid CEF test message sent"
  '

# Verify in Sentinel that test message appears correctly:
# CommonSecurityLog | where DeviceVendor == "Contoso" | take 5
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Which table in Microsoft Sentinel stores CEF (Common Event Format) log data?",
    options: [
      "Syslog",
      "CommonSecurityLog",
      "SecurityEvent",
      "CEFLog"
    ],
    correctIndex: 1,
    explanation: "CEF data is stored in the CommonSecurityLog table. While CEF is transported over syslog protocol, it is parsed into the structured CommonSecurityLog table with fields like DeviceVendor, DeviceProduct, and extension fields."
  },
  {
    question: "What is the recommended method for collecting syslog and CEF logs in Sentinel with Azure Monitor Agent?",
    options: [
      "Install the legacy Log Analytics agent on each source device",
      "Configure a Data Collection Rule (DCR) and associate it with VMs running Azure Monitor Agent",
      "Use an Azure Function to pull syslog from devices",
      "Configure each device to send directly to the Log Analytics API"
    ],
    correctIndex: 1,
    explanation: "The recommended method is to use Data Collection Rules (DCRs) with Azure Monitor Agent. DCRs define which facilities and severity levels to collect and which workspace to send data to. The AMA collects and forwards the logs."
  },
  {
    question: "What Azure AD license is required to stream sign-in logs to Microsoft Sentinel?",
    options: [
      "Azure AD Free tier is sufficient",
      "Azure AD Premium P1 or P2",
      "Microsoft 365 E5 only",
      "No license required beyond the Azure subscription"
    ],
    correctIndex: 1,
    explanation: "Streaming sign-in logs (SigninLogs, NonInteractiveUserSignInLogs, etc.) to any destination requires Azure AD Premium P1 or P2. Audit logs are available with any Azure AD edition, but sign-in logs require Premium."
  },
  {
    question: "When configuring the Azure Activity data connector, what mechanism is used to forward logs?",
    options: [
      "An agent installed on the Azure control plane",
      "Azure diagnostic settings at the subscription scope",
      "A Logic App pulling from the Activity Log API",
      "Azure Event Grid subscription"
    ],
    correctIndex: 1,
    explanation: "The Azure Activity data connector uses diagnostic settings configured at the subscription scope. This creates a pipeline that streams Administrative, Security, Alert, Policy, and other activity categories to the Log Analytics workspace."
  }
]} />

## Cleanup

```bash
# Remove diagnostic settings
az monitor diagnostic-settings delete \
  --name "send-activity-to-sentinel" \
  --resource "/subscriptions/${SUBSCRIPTION_ID}"

# Delete data collection rules
az monitor data-collection rule delete \
  --name "dcr-syslog-contoso" \
  --resource-group $RG_NAME --yes

az monitor data-collection rule delete \
  --name "dcr-cef-contoso" \
  --resource-group $RG_NAME --yes

# Delete resource group (includes VM, workspace, Sentinel)
az group delete --name $RG_NAME --yes --no-wait

echo "Cleanup complete - all data connectors and resources removed"
```
