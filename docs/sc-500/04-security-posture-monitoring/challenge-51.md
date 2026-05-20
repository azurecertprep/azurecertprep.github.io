---
sidebar_position: 51
title: "Challenge 51: Security Monitoring Architecture – End-to-End Detection Scenario"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 51: Security Monitoring Architecture – End-to-End Detection Scenario

## Exam skills covered

- Design complete security monitoring architectures for enterprise environments
- Define log sources and configure data connectors
- Create analytics rules (scheduled, NRT, fusion)
- Build automation playbooks with Logic Apps
- Design security workbooks and dashboards
- Write KQL queries for common threat detections
- Implement data retention and cost optimization strategies

## Scenario

Contoso Ltd is a financial services company with 5,000 employees undergoing cloud transformation. They have a hybrid infrastructure with on-premises Active Directory, Azure workloads, Microsoft 365, and a growing SaaS footprint. The CISO has tasked you with designing and implementing a comprehensive security monitoring architecture using Microsoft Sentinel.

Your design must detect the following threat categories:
- **Brute-force attacks** against user accounts
- **Impossible travel** sign-ins indicating credential theft
- **Privilege escalation** via unauthorized role assignments
- **Data exfiltration** from SharePoint/OneDrive
- **Malware/ransomware** indicators on endpoints
- **Cloud resource abuse** (cryptomining, unauthorized deployments)

---

## Prerequisites

- Azure subscription with Owner or Contributor role
- Microsoft 365 E5 or equivalent security licensing
- Azure CLI with `sentinel` and `monitor` extensions
- Microsoft Sentinel Contributor role
- Logic Apps Contributor role (for playbooks)
- Understanding of KQL and MITRE ATT&CK framework

---

## Task 1: Design the monitoring architecture and deploy the workspace

Define Contoso's security monitoring architecture with appropriate workspace design.

```bash
# Architecture design variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-soc-architecture"
LOCATION="eastus"
WORKSPACE_NAME="law-contoso-soc"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Create Log Analytics workspace with appropriate retention
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --retention-time 90 \
  --sku PerGB2018

# Enable Sentinel
az sentinel onboarding-state create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default"

# Get workspace ID for later use
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Configure data retention tiers
# Hot tier: 90 days (default interactive queries)
# Archive tier: 2 years (compliance requirement for financial services)
az monitor log-analytics workspace table update \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "SecurityEvent" \
  --retention-time 90 \
  --total-retention-time 730

az monitor log-analytics workspace table update \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "SigninLogs" \
  --retention-time 90 \
  --total-retention-time 730

az monitor log-analytics workspace table update \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "AuditLogs" \
  --retention-time 90 \
  --total-retention-time 730
```

**Architecture overview:**

| Component | Purpose | Data Volume (est.) |
|-----------|---------|-------------------|
| Entra ID Sign-in/Audit logs | Identity threat detection | ~2 GB/day |
| Microsoft 365 activity | Email/SharePoint/Teams threats | ~5 GB/day |
| Azure Activity logs | Cloud resource abuse | ~500 MB/day |
| Defender for Endpoint | Endpoint malware/EDR | ~3 GB/day |
| Defender for Cloud | Cloud posture alerts | ~200 MB/day |
| Azure Key Vault diagnostics | Credential access monitoring | ~100 MB/day |
| Azure Firewall logs | Network-level threats | ~1 GB/day |
| On-premises AD (via AMA) | Hybrid identity monitoring | ~1 GB/day |
| **Total estimated ingestion** | | **~13 GB/day** |

---

## Task 2: Configure data connectors for all log sources

Enable the data connectors that feed Contoso's monitoring architecture.

```bash
# Microsoft Entra ID connector (Sign-in and Audit logs)
az sentinel data-connector create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --data-connector-id "AzureActiveDirectory" \
  --aad \
  --tenant-id $(az account show --query tenantId -o tsv) \
  --data-types-alerts-state "Enabled" \
  --data-types-sign-in-logs-state "Enabled" \
  --data-types-audit-logs-state "Enabled"

# Microsoft Defender XDR connector
az sentinel data-connector create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --data-connector-id "MicrosoftThreatProtection" \
  --microsoft-threat-protection \
  --tenant-id $(az account show --query tenantId -o tsv) \
  --data-types-incidents-state "Enabled" \
  --data-types-alerts-state "Enabled"

# Microsoft Defender for Cloud connector
az sentinel data-connector create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --data-connector-id "AzureSecurityCenter" \
  --asc \
  --subscription-id $SUBSCRIPTION_ID \
  --data-types-alerts-state "Enabled"

# Azure Activity connector
az sentinel data-connector create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --data-connector-id "AzureActivity" \
  --azure-activity \
  --subscription-id $SUBSCRIPTION_ID \
  --data-types-azure-activity-state "Enabled"

# Microsoft 365 connector (Exchange, SharePoint, Teams)
az sentinel data-connector create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --data-connector-id "Office365" \
  --office365 \
  --tenant-id $(az account show --query tenantId -o tsv) \
  --data-types-exchange-state "Enabled" \
  --data-types-share-point-state "Enabled" \
  --data-types-teams-state "Enabled"

# Configure diagnostic settings for Key Vault
az monitor diagnostic-settings create \
  --name "send-to-sentinel" \
  --resource "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG_NAME/providers/Microsoft.KeyVault/vaults/kv-contoso-prod" \
  --workspace $WORKSPACE_ID \
  --logs '[{"category":"AuditEvent","enabled":true},{"category":"AllMetrics","enabled":false}]' \
  2>/dev/null || echo "Key Vault diagnostic settings - configure after KV is created"

# Configure diagnostic settings for Azure Firewall
az monitor diagnostic-settings create \
  --name "send-to-sentinel" \
  --resource "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG_NAME/providers/Microsoft.Network/azureFirewalls/fw-contoso-hub" \
  --workspace $WORKSPACE_ID \
  --logs '[{"category":"AzureFirewallApplicationRule","enabled":true},{"category":"AzureFirewallNetworkRule","enabled":true},{"category":"AzureFirewallDnsProxy","enabled":true}]' \
  2>/dev/null || echo "Firewall diagnostic settings - configure after FW is created"
```

**Verify connector status:**

```bash
# List all configured data connectors
az sentinel data-connector list \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --query "[].{Name:name, Kind:kind}" -o table
```

---

## Task 3: Create analytics rules for threat detection

Implement detection rules for each threat category in Contoso's requirements.

### Detection 1: Brute-force attack detection

```bash
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "detect-brute-force" \
  --scheduled \
  --name "Brute Force Attack Detected" \
  --description "Detects multiple failed sign-in attempts followed by a success from the same IP" \
  --severity "High" \
  --enabled true \
  --query "let failureThreshold = 10;
let timeWindow = 15m;
let successWindow = 1h;
// Find IPs with many failures
let bruteForceAttempts = SigninLogs
| where TimeGenerated > ago(successWindow)
| where ResultType != 0
| summarize 
    FailureCount = count(),
    FailedAccounts = make_set(UserPrincipalName, 20),
    FirstFailure = min(TimeGenerated),
    LastFailure = max(TimeGenerated)
    by IPAddress
| where FailureCount >= failureThreshold;
// Check if any succeeded after failures
let successfulLogins = SigninLogs
| where TimeGenerated > ago(successWindow)
| where ResultType == 0
| project SuccessTime=TimeGenerated, UserPrincipalName, IPAddress, 
          AppDisplayName, DeviceDetail, Location=LocationDetails;
bruteForceAttempts
| join kind=inner (successfulLogins) on IPAddress
| where SuccessTime > LastFailure
| project IPAddress, FailureCount, FailedAccounts, 
          CompromisedUser=UserPrincipalName, SuccessTime, 
          AppDisplayName, FirstFailure, LastFailure" \
  --query-frequency "PT10M" \
  --query-period "PT1H" \
  --trigger-operator "GreaterThan" \
  --trigger-threshold 0 \
  --tactics "CredentialAccess" \
  --techniques "T1110"
```

### Detection 2: Impossible travel

```bash
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "detect-impossible-travel" \
  --scheduled \
  --name "Impossible Travel Detected" \
  --description "Detects sign-ins from geographically distant locations within an impossible timeframe" \
  --severity "Medium" \
  --enabled true \
  --query "let maxTimeDiffMinutes = 60;
let maxDistanceKm = 500;
SigninLogs
| where TimeGenerated > ago(1h)
| where ResultType == 0
| extend City = tostring(LocationDetails.city),
         State = tostring(LocationDetails.state),
         Country = tostring(LocationDetails.countryOrRegion),
         Latitude = toreal(LocationDetails.geoCoordinates.latitude),
         Longitude = toreal(LocationDetails.geoCoordinates.longitude)
| where isnotempty(Latitude) and isnotempty(Longitude)
| sort by UserPrincipalName, TimeGenerated asc
| serialize
| extend PrevTime = prev(TimeGenerated, 1),
         PrevLatitude = prev(Latitude, 1),
         PrevLongitude = prev(Longitude, 1),
         PrevCity = prev(City, 1),
         PrevCountry = prev(Country, 1),
         PrevUser = prev(UserPrincipalName, 1)
| where UserPrincipalName == PrevUser
| extend TimeDiffMinutes = datetime_diff('minute', TimeGenerated, PrevTime)
| where TimeDiffMinutes <= maxTimeDiffMinutes and TimeDiffMinutes > 0
// Haversine distance approximation
| extend DistanceKm = 6371 * acos(
    sin(radians(Latitude)) * sin(radians(PrevLatitude)) +
    cos(radians(Latitude)) * cos(radians(PrevLatitude)) * 
    cos(radians(PrevLongitude - Longitude)))
| where DistanceKm > maxDistanceKm
| project TimeGenerated, UserPrincipalName, 
          CurrentLocation=strcat(City, ', ', Country),
          PreviousLocation=strcat(PrevCity, ', ', PrevCountry),
          TimeDiffMinutes, DistanceKm, IPAddress" \
  --query-frequency "PT15M" \
  --query-period "PT2H" \
  --trigger-operator "GreaterThan" \
  --trigger-threshold 0 \
  --tactics "InitialAccess" \
  --techniques "T1078"
```

### Detection 3: Privilege escalation via unauthorized role assignment

```bash
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "detect-privilege-escalation" \
  --nrt \
  --name "Unauthorized Privileged Role Assignment (NRT)" \
  --description "Near real-time detection of privileged role assignments outside PIM or approved processes" \
  --severity "High" \
  --enabled true \
  --query "let privilegedRoles = dynamic([
  'Global Administrator', 'Privileged Role Administrator',
  'Security Administrator', 'Exchange Administrator',
  'SharePoint Administrator', 'User Administrator',
  'Application Administrator', 'Cloud Application Administrator']);
AuditLogs
| where TimeGenerated > ago(5m)
| where OperationName == 'Add member to role'
| extend TargetRole = tostring(TargetResources[0].displayName)
| where TargetRole in (privilegedRoles)
// Exclude PIM-activated assignments
| where OperationName != 'Add eligible member to role in PIM'
| extend InitiatedBy = tostring(InitiatedBy.user.userPrincipalName),
         TargetUser = tostring(TargetResources[0].userPrincipalName),
         InitiatedByIP = tostring(InitiatedBy.user.ipAddress)
// Exclude approved service accounts
| where InitiatedBy !in ('pim-service@contoso.com', 'identity-governance@contoso.com')
| project TimeGenerated, InitiatedBy, InitiatedByIP, 
          TargetUser, TargetRole, OperationName,
          AdditionalDetails" \
  --tactics "PrivilegeEscalation" "Persistence" \
  --techniques "T1078.004" "T1098"
```

### Detection 4: Data exfiltration from SharePoint/OneDrive

```bash
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "detect-data-exfiltration" \
  --scheduled \
  --name "Anomalous Data Download from SharePoint/OneDrive" \
  --description "Detects unusually large file downloads that may indicate data exfiltration" \
  --severity "Medium" \
  --enabled true \
  --query "let lookback = 14d;
let threshold_multiplier = 3;
// Calculate baseline download volume per user
let baseline = OfficeActivity
| where TimeGenerated > ago(lookback) and TimeGenerated < ago(1d)
| where Operation in ('FileDownloaded', 'FileSyncDownloadedFull')
| where OfficeWorkload in ('SharePoint', 'OneDrive')
| summarize 
    AvgDailyDownloads = count() / 14.0,
    AvgDailyBytes = sum(toint(OfficeObjectId)) / 14.0
    by UserId;
// Today's activity
let today_activity = OfficeActivity
| where TimeGenerated > ago(1d)
| where Operation in ('FileDownloaded', 'FileSyncDownloadedFull')
| where OfficeWorkload in ('SharePoint', 'OneDrive')
| summarize 
    TodayDownloads = count(),
    UniqueFiles = dcount(OfficeObjectId),
    Sites = make_set(Site_Url, 10)
    by UserId;
today_activity
| join kind=inner (baseline) on UserId
| where TodayDownloads > AvgDailyDownloads * threshold_multiplier
| where TodayDownloads > 50
| project UserId, TodayDownloads, AvgDailyDownloads, 
          AnomalyRatio = round(TodayDownloads / AvgDailyDownloads, 1),
          UniqueFiles, Sites" \
  --query-frequency "PT1H" \
  --query-period "PT14D" \
  --trigger-operator "GreaterThan" \
  --trigger-threshold 0 \
  --tactics "Exfiltration" \
  --techniques "T1567"
```

### Detection 5: Cloud resource abuse (cryptomining indicators)

```bash
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "detect-cryptomining" \
  --scheduled \
  --name "Potential Cryptomining - Unusual VM Deployments" \
  --description "Detects bulk VM creation or GPU VM deployments that may indicate cryptomining" \
  --severity "High" \
  --enabled true \
  --query "let cryptoVmSizes = dynamic(['Standard_NC', 'Standard_ND', 'Standard_NV', 
  'Standard_HB', 'Standard_HC', 'Standard_F72s']);
// Detect bulk VM creation
let bulkDeployment = AzureActivity
| where TimeGenerated > ago(1h)
| where OperationNameValue == 'Microsoft.Compute/virtualMachines/write'
| where ActivityStatusValue == 'Success'
| summarize 
    VMCount = count(),
    ResourceGroups = make_set(ResourceGroup, 5),
    VMNames = make_set(Resource, 10)
    by Caller, bin(TimeGenerated, 15m)
| where VMCount > 5;
// Detect GPU VM creation
let gpuDeployment = AzureActivity
| where TimeGenerated > ago(1h)
| where OperationNameValue == 'Microsoft.Compute/virtualMachines/write'
| where ActivityStatusValue == 'Success'
| where Properties_d has_any (cryptoVmSizes)
| project TimeGenerated, Caller, ResourceGroup, Resource,
          VMSize = tostring(parse_json(tostring(Properties_d)).responseBody);
union 
  (bulkDeployment | extend DetectionType = 'BulkVMDeployment'),
  (gpuDeployment | extend DetectionType = 'GPUVMDeployment')" \
  --query-frequency "PT15M" \
  --query-period "PT1H" \
  --trigger-operator "GreaterThan" \
  --trigger-threshold 0 \
  --tactics "Impact" \
  --techniques "T1496"
```

---

## Task 4: Build automation playbooks with Logic Apps

Create a Logic App playbook that enriches and responds to brute-force incidents.

```bash
# Create Logic App for brute-force response
az logic workflow create \
  --resource-group $RG_NAME \
  --name "playbook-brute-force-response" \
  --location $LOCATION \
  --definition '{
    "definition": {
      "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      "contentVersion": "1.0.0.0",
      "triggers": {
        "Microsoft_Sentinel_incident": {
          "type": "ApiConnectionWebhook",
          "inputs": {
            "body": {
              "callback_url": "@{listCallbackUrl()}"
            },
            "host": {
              "connection": {
                "name": "@parameters($connections)['azuresentinel']['connectionId']"
              }
            },
            "path": "/incident-creation"
          }
        }
      },
      "actions": {
        "Get_incident_entities": {
          "type": "ApiConnection",
          "inputs": {
            "host": {
              "connection": {
                "name": "@parameters($connections)['azuresentinel']['connectionId']"
              }
            },
            "method": "post",
            "path": "/entities/@{triggerBody()?['object']?['properties']?['relatedAnalyticRuleIds']}"
          },
          "runAfter": {}
        },
        "Block_IP_in_named_location": {
          "type": "Http",
          "inputs": {
            "method": "POST",
            "uri": "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations",
            "body": {
              "@odata.type": "#microsoft.graph.ipNamedLocation",
              "displayName": "Auto-blocked: Brute force source",
              "isTrusted": false,
              "ipRanges": [
                {
                  "@odata.type": "#microsoft.graph.iPv4CidrRange",
                  "cidrAddress": "@{body('Get_incident_entities')?['IPs']?[0]}/32"
                }
              ]
            }
          },
          "runAfter": {"Get_incident_entities": ["Succeeded"]}
        },
        "Send_Teams_notification": {
          "type": "ApiConnection",
          "inputs": {
            "host": {
              "connection": {
                "name": "@parameters($connections)['teams']['connectionId']"
              }
            },
            "method": "post",
            "path": "/v1.0/teams/SOC-Alerts/channels/General/messages",
            "body": {
              "content": "🚨 Brute Force Alert: @{triggerBody()?['object']?['properties']?['title']} - Severity: @{triggerBody()?['object']?['properties']?['severity']}"
            }
          },
          "runAfter": {"Block_IP_in_named_location": ["Succeeded"]}
        },
        "Add_comment_to_incident": {
          "type": "ApiConnection",
          "inputs": {
            "host": {
              "connection": {
                "name": "@parameters($connections)['azuresentinel']['connectionId']"
              }
            },
            "method": "post",
            "path": "/comment",
            "body": {
              "incidentArmId": "@triggerBody()?['object']?['id']",
              "message": "Automated response: Source IP blocked in Conditional Access. Teams notification sent to SOC channel."
            }
          },
          "runAfter": {"Send_Teams_notification": ["Succeeded"]}
        }
      }
    }
  }'
```

**Link the playbook to an automation rule:**

```bash
PLAYBOOK_ID=$(az logic workflow show \
  --resource-group $RG_NAME \
  --name "playbook-brute-force-response" \
  --query id -o tsv)

az sentinel automation-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --automation-rule-id "auto-brute-force-response" \
  --name "Auto-Respond to Brute Force" \
  --order 1 \
  --triggering-logic \
    is-enabled=true \
    triggers-on="Incidents" \
    triggers-when="Created" \
    conditions='[{
      "conditionType": "Property",
      "conditionProperties": {
        "propertyName": "IncidentRelatedAnalyticRuleIds",
        "operator": "Contains",
        "propertyValues": ["detect-brute-force"]
      }
    }]' \
  --actions '[{
    "actionType": "RunPlaybook",
    "order": 1,
    "actionConfiguration": {
      "logicAppResourceId": "'$PLAYBOOK_ID'",
      "tenantId": "'$(az account show --query tenantId -o tsv)'"
    }
  }]'
```

---

## Task 5: Design workbooks and dashboards

Create a security operations workbook for the SOC team.

**Portal Steps (workbooks are best created in the portal):**

1. Navigate to **Microsoft Sentinel** → **Workbooks** → **+ Add workbook**
2. Click **Edit** to enter edit mode
3. Add the following components:

### SOC Operations Dashboard - KQL Queries

**Component 1: Incident Summary (last 24h)**

```kql
SecurityIncident
| where TimeGenerated > ago(24h)
| summarize 
    Total = count(),
    Critical = countif(Severity == "High"),
    Medium = countif(Severity == "Medium"),
    Low = countif(Severity == "Low"),
    Open = countif(Status == "New" or Status == "Active"),
    Closed = countif(Status == "Closed")
| project Total, Critical, Medium, Low, Open, Closed
```

**Component 2: Alert trend (7 days)**

```kql
SecurityAlert
| where TimeGenerated > ago(7d)
| summarize AlertCount = count() by bin(TimeGenerated, 1h), AlertSeverity
| render timechart
```

**Component 3: Top targeted users**

```kql
SigninLogs
| where TimeGenerated > ago(24h)
| where ResultType != 0
| summarize FailedAttempts = count(), 
            UniqueIPs = dcount(IPAddress),
            LastAttempt = max(TimeGenerated)
    by UserPrincipalName
| top 10 by FailedAttempts desc
| project UserPrincipalName, FailedAttempts, UniqueIPs, LastAttempt
```

**Component 4: Geographic threat map**

```kql
SigninLogs
| where TimeGenerated > ago(24h)
| where RiskLevelDuringSignIn in ('high', 'medium')
| extend Latitude = toreal(LocationDetails.geoCoordinates.latitude),
         Longitude = toreal(LocationDetails.geoCoordinates.longitude),
         Country = tostring(LocationDetails.countryOrRegion)
| where isnotempty(Latitude)
| summarize RiskySignIns = count() by Country, Latitude, Longitude
| top 20 by RiskySignIns desc
```

**Component 5: MITRE ATT&CK coverage**

```kql
SecurityAlert
| where TimeGenerated > ago(30d)
| extend Tactics = parse_json(ExtendedProperties).Tactics
| mv-expand Tactic = Tactics
| summarize AlertCount = count() by tostring(Tactic)
| sort by AlertCount desc
| render barchart
```

**Component 6: Mean Time to Respond (MTTR)**

```kql
SecurityIncident
| where TimeGenerated > ago(30d)
| where Status == "Closed"
| extend CreatedTime = CreatedTime,
         ClosedTime = ClosedTime
| extend MTTR_hours = datetime_diff('hour', ClosedTime, CreatedTime)
| summarize 
    AvgMTTR = avg(MTTR_hours),
    MedianMTTR = percentile(MTTR_hours, 50),
    P95_MTTR = percentile(MTTR_hours, 95)
    by bin(TimeGenerated, 1d)
| render timechart
```

4. Save the workbook as **"Contoso SOC Operations Dashboard"**
5. Pin to the Sentinel overview page

---

## Task 6: Implement cost optimization and data management

Configure data collection rules and cost optimization for sustainable operations.

```bash
# Create a Data Collection Rule (DCR) to filter noisy logs
az monitor data-collection rule create \
  --resource-group $RG_NAME \
  --name "dcr-contoso-filtering" \
  --location $LOCATION \
  --data-flows '[{
    "streams": ["Microsoft-SecurityEvent"],
    "destinations": ["law-contoso-soc"],
    "transformKql": "source | where EventID in (4624, 4625, 4648, 4672, 4720, 4722, 4723, 4724, 4725, 4726, 4732, 4733, 4740, 4756, 4757, 4767, 4769, 4771, 4776, 5136, 5145)"
  }]' \
  --destinations '{
    "logAnalytics": [{
      "workspaceResourceId": "'$WORKSPACE_ID'",
      "name": "law-contoso-soc"
    }]
  }'

# Configure Basic Logs tier for high-volume, low-priority tables
az monitor log-analytics workspace table update \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "ContainerLog" \
  --plan "Basic"

az monitor log-analytics workspace table update \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "AppTraces" \
  --plan "Basic"

# Set up daily cap as cost safeguard (10x normal to catch anomalies only)
az monitor log-analytics workspace update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --set properties.workspaceCapping.dailyQuotaGb=130
```

**Cost optimization summary:**

| Strategy | Implementation | Savings |
|----------|---------------|---------|
| DCR filtering | Only ingest security-relevant EventIDs | ~40% on SecurityEvent |
| Basic Logs tier | Low-priority tables at reduced cost | ~60% on container/app logs |
| Archive tier | Compliance data after 90 days | ~80% vs. interactive retention |
| Daily cap | Safety net at 10x normal ingestion | Prevents bill shock |
| Commitment tier | 100 GB/day commitment | ~20% discount |

---

## Break & Fix

### Scenario 1: Analytics rule generates too many false positives

The impossible travel rule triggers 50+ alerts daily, mostly from VPN users who appear to connect from the VPN gateway and their home location simultaneously.

<details>
<summary>Show solution</summary>

**Root cause:** VPN connections create sign-in events from both the user's actual location and the VPN gateway location.

**Fix:** Add VPN gateway IPs to an exclusion list in the KQL query:

```kql
// Add this filter before the distance calculation
let vpnGatewayIPs = dynamic(["203.0.113.0/24", "198.51.100.0/24"]);
let trustedLocations = dynamic(["Contoso HQ", "Contoso DC"]);
SigninLogs
| where TimeGenerated > ago(1h)
| where ResultType == 0
// Exclude VPN and trusted locations
| where not(ipv4_is_in_any_range(IPAddress, vpnGatewayIPs))
| where not(tostring(LocationDetails.city) in (trustedLocations))
// ... rest of the impossible travel query
```

Also consider increasing the `maxTimeDiffMinutes` from 60 to 90 to account for session overlap.

</details>

### Scenario 2: Playbook fails with "Forbidden" error

The brute-force response playbook triggers but fails at the "Block IP" step with a 403 Forbidden error.

<details>
<summary>Show solution</summary>

**Root cause:** The Logic App's managed identity doesn't have Graph API permissions to create named locations.

**Fix:**
1. Enable system-assigned managed identity on the Logic App:
   ```bash
   az logic workflow identity assign \
     --resource-group $RG_NAME \
     --name "playbook-brute-force-response" \
     --system-assigned
   ```
2. Grant the managed identity the `Policy.ReadWrite.ConditionalAccess` permission:
   ```bash
   LOGIC_APP_OBJECT_ID=$(az logic workflow show \
     --resource-group $RG_NAME \
     --name "playbook-brute-force-response" \
     --query identity.principalId -o tsv)
   
   # Grant Graph API permission (requires admin consent)
   az ad app permission grant \
     --id $LOGIC_APP_OBJECT_ID \
     --api 00000003-0000-0000-c000-000000000000 \
     --scope "Policy.ReadWrite.ConditionalAccess"
   ```
3. Alternatively, use an API connection with a service account that has Conditional Access Administrator role

</details>

### Scenario 3: Data ingestion costs spike unexpectedly

Monthly costs jump from $3,000 to $12,000 due to a sudden increase in log ingestion volume.

<details>
<summary>Show solution</summary>

**Root cause:** A misconfigured diagnostic setting is sending verbose debug logs from all resources.

**Fix:**
1. Identify the source of increased ingestion:
   ```kql
   Usage
   | where TimeGenerated > ago(7d)
   | summarize IngestionGB = sum(Quantity) / 1000.0 by DataType, bin(TimeGenerated, 1d)
   | where IngestionGB > 1
   | sort by IngestionGB desc
   ```
2. Find the specific resource flooding logs:
   ```kql
   AzureDiagnostics
   | where TimeGenerated > ago(1d)
   | summarize Count = count(), SizeGB = sum(_BilledSize) / (1024*1024*1024) by ResourceProvider, ResourceType
   | sort by SizeGB desc
   ```
3. Remove or fix the misconfigured diagnostic setting
4. Set a daily cap as immediate protection:
   ```bash
   az monitor log-analytics workspace update \
     --workspace-name $WORKSPACE_NAME \
     --resource-group $RG_NAME \
     --set properties.workspaceCapping.dailyQuotaGb=20
   ```
5. Implement DCR filtering for the noisy resource

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Which type of Sentinel analytics rule is most appropriate for detecting privilege escalation that requires immediate alerting within 1-2 minutes?",
    options: [
      "Scheduled rule with 5-minute frequency",
      "Near Real-Time (NRT) rule",
      "Fusion rule",
      "Machine Learning behavior analytics rule"
    ],
    correctIndex: 1,
    explanation: "NRT rules run approximately every 1 minute, providing the fastest detection time. For privilege escalation—a high-severity, time-sensitive event—NRT rules ensure SOC analysts are alerted within minutes rather than waiting for a scheduled query interval."
  },
  {
    question: "What KQL function is used to calculate geographic distance between two sign-in locations for impossible travel detection?",
    options: [
      "geo_distance_2points()",
      "The Haversine formula using acos(), sin(), cos(), and radians()",
      "distance(lat1, lon1, lat2, lon2)",
      "calculate_travel_distance()"
    ],
    correctIndex: 1,
    explanation: "KQL does not have a built-in geo distance function in standard Log Analytics. The Haversine formula using acos(), sin(), cos(), and radians() functions calculates the great-circle distance between two points on Earth, which is the standard approach for impossible travel detection in Sentinel."
  },
  {
    question: "To reduce ingestion costs for high-volume but rarely queried tables, which Log Analytics plan should you use?",
    options: [
      "Analytics plan with reduced retention",
      "Basic Logs plan",
      "Archive tier",
      "Free tier"
    ],
    correctIndex: 1,
    explanation: "The Basic Logs plan provides reduced ingestion cost (~60% less) for tables that are infrequently queried. Basic Logs have limited query capabilities (8 days interactive retention, no alerts) but are ideal for compliance or troubleshooting data. Archive tier is for data beyond the interactive retention period."
  },
  {
    question: "A Logic App playbook needs to block an IP address in Conditional Access. What permission must the managed identity have?",
    options: [
      "Security Reader",
      "Conditional Access Administrator role",
      "Policy.ReadWrite.ConditionalAccess Graph API permission",
      "Network Contributor Azure RBAC role"
    ],
    correctIndex: 2,
    explanation: "To create or modify named locations in Conditional Access via the Graph API, the managed identity needs the Policy.ReadWrite.ConditionalAccess Graph API application permission. The Conditional Access Administrator Entra role works for interactive users, but API-based automation requires Graph API permissions on the identity."
  },
  {
    question: "In a Data Collection Rule (DCR), what is the purpose of the transformKql property?",
    options: [
      "It encrypts the data before ingestion",
      "It filters and transforms data before it reaches the workspace, reducing ingestion volume",
      "It creates analytics rules automatically from the data",
      "It routes data to multiple workspaces simultaneously"
    ],
    correctIndex: 1,
    explanation: "The transformKql property in a DCR applies a KQL transformation to data before it's ingested into the workspace. This allows filtering out unnecessary records (e.g., only keeping specific EventIDs) and transforming data to reduce volume and cost at ingestion time."
  }
]} />

---

## Cleanup

```bash
# Delete automation rules
az sentinel automation-rule delete \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --automation-rule-id "auto-brute-force-response" --yes

# Delete analytics rules
for RULE_ID in "detect-brute-force" "detect-impossible-travel" "detect-privilege-escalation" "detect-data-exfiltration" "detect-cryptomining"; do
  az sentinel alert-rule delete \
    --resource-group $RG_NAME \
    --workspace-name $WORKSPACE_NAME \
    --rule-id $RULE_ID --yes
done

# Delete Logic App playbook
az logic workflow delete \
  --resource-group $RG_NAME \
  --name "playbook-brute-force-response" --yes

# Delete the resource group (removes everything)
az group delete --name $RG_NAME --yes --no-wait
```
