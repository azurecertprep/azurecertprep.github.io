---
sidebar_position: 47
title: "Challenge 47: Sentinel Automation – Rules, Playbooks, and Data Retention"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 47: Sentinel Automation – Rules, Playbooks, and Data Retention

## Exam skills covered

- Create and manage Sentinel analytics rules (scheduled, NRT, fusion)
- Configure automation rules and playbook execution
- Design incident response automation workflows
- Configure data retention and archiving strategies

## Scenario

Contoso Ltd's SOC team is overwhelmed by alert volume and needs to automate triage and response. You must create analytics rules to detect threats, configure automation rules to enrich incidents, deploy playbooks for automated response actions, and set up data retention policies that balance investigation needs with cost optimization.

---

## Prerequisites

- Azure subscription with Owner or Contributor role
- Microsoft Sentinel workspace with data flowing (from Challenge 44/45)
- Azure CLI with `sentinel` extension
- Permissions to create Logic Apps (for playbooks)

---

## Task 1: Create a scheduled analytics rule

Build a detection rule for brute-force sign-in attempts.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-sentinel-auto"
LOCATION="eastus"
WORKSPACE_NAME="law-contoso-automation"

# Create resource group and workspace
az group create --name $RG_NAME --location $LOCATION

az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query id -o tsv)

az sentinel onboarding-state create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default"

# Create a scheduled analytics rule for brute-force detection
az rest --method PUT \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/brute-force-detection?api-version=2024-03-01" \
  --body '{
    "kind": "Scheduled",
    "properties": {
      "displayName": "Brute Force Sign-In Attempts",
      "description": "Detects multiple failed sign-in attempts from the same IP within 10 minutes",
      "severity": "High",
      "enabled": true,
      "query": "SigninLogs\n| where ResultType != \"0\"\n| summarize FailedAttempts=count(), Accounts=dcount(UserPrincipalName) by IPAddress, bin(TimeGenerated, 10m)\n| where FailedAttempts > 10\n| extend AccountsTargeted = Accounts",
      "queryFrequency": "PT5M",
      "queryPeriod": "PT10M",
      "triggerOperator": "GreaterThan",
      "triggerThreshold": 0,
      "suppressionDuration": "PT1H",
      "suppressionEnabled": true,
      "tactics": ["CredentialAccess", "InitialAccess"],
      "techniques": ["T1110"],
      "incidentConfiguration": {
        "createIncident": true,
        "groupingConfiguration": {
          "enabled": true,
          "reopenClosedIncident": false,
          "lookbackDuration": "PT1H",
          "matchingMethod": "AllEntities",
          "groupByEntities": ["Ip"],
          "groupByAlertDetails": [],
          "groupByCustomDetails": []
        }
      },
      "entityMappings": [
        {
          "entityType": "IP",
          "fieldMappings": [{"identifier": "Address", "columnName": "IPAddress"}]
        }
      ],
      "alertDetailsOverride": {
        "alertDisplayNameFormat": "Brute Force from {{IPAddress}} - {{FailedAttempts}} attempts",
        "alertDescriptionFormat": "IP {{IPAddress}} attempted {{FailedAttempts}} failed logins targeting {{AccountsTargeted}} accounts"
      }
    }
  }'

echo "Scheduled analytics rule created: Brute Force Sign-In Attempts"
```

## Task 2: Create a Near-Real-Time (NRT) analytics rule

Deploy an NRT rule for immediate detection of high-priority threats.

```bash
# Create NRT rule for privileged account compromise
az rest --method PUT \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/nrt-privileged-signin-anomaly?api-version=2024-03-01" \
  --body '{
    "kind": "NRT",
    "properties": {
      "displayName": "NRT: Privileged Account Sign-In from New Location",
      "description": "Near-real-time detection of Global Admin sign-ins from previously unseen locations",
      "severity": "Critical",
      "enabled": true,
      "query": "SigninLogs\n| where UserPrincipalName in (\"admin@contoso.com\", \"globaladmin@contoso.com\")\n| where ResultType == \"0\"\n| where RiskLevelDuringSignIn in (\"high\", \"medium\")\n| extend City = tostring(LocationDetails.city), Country = tostring(LocationDetails.countryOrRegion)\n| project TimeGenerated, UserPrincipalName, IPAddress, City, Country, AppDisplayName, RiskLevelDuringSignIn",
      "suppressionDuration": "PT30M",
      "suppressionEnabled": true,
      "tactics": ["InitialAccess"],
      "techniques": ["T1078.004"],
      "incidentConfiguration": {
        "createIncident": true,
        "groupingConfiguration": {
          "enabled": true,
          "reopenClosedIncident": true,
          "lookbackDuration": "PT4H",
          "matchingMethod": "AllEntities",
          "groupByEntities": ["Account"],
          "groupByAlertDetails": [],
          "groupByCustomDetails": []
        }
      },
      "entityMappings": [
        {
          "entityType": "Account",
          "fieldMappings": [{"identifier": "FullName", "columnName": "UserPrincipalName"}]
        },
        {
          "entityType": "IP",
          "fieldMappings": [{"identifier": "Address", "columnName": "IPAddress"}]
        }
      ]
    }
  }'

echo "NRT rule created - detects privileged sign-ins within ~1 minute of occurrence"
```

## Task 3: Create an automation rule for incident enrichment

Configure an automation rule that auto-assigns incidents and adds tags.

```bash
# Create an automation rule to triage brute-force incidents
az rest --method PUT \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/automationRules/auto-triage-brute-force?api-version=2024-03-01" \
  --body '{
    "properties": {
      "displayName": "Auto-triage Brute Force Incidents",
      "order": 1,
      "triggeringLogic": {
        "isEnabled": true,
        "triggersOn": "Incidents",
        "triggersWhen": "Created",
        "conditions": [
          {
            "conditionType": "Property",
            "conditionProperties": {
              "propertyName": "IncidentTitle",
              "operator": "Contains",
              "propertyValues": ["Brute Force"]
            }
          }
        ]
      },
      "actions": [
        {
          "actionType": "ModifyProperties",
          "order": 1,
          "actionConfiguration": {
            "severity": "High",
            "status": "Active",
            "owner": {
              "assignedTo": "SOC Tier 1"
            },
            "labels": [
              {"labelName": "AutoTriaged", "labelType": "User"},
              {"labelName": "BruteForce", "labelType": "User"}
            ]
          }
        }
      ]
    }
  }'

echo "Automation rule created - brute force incidents auto-assigned to SOC Tier 1"
```

## Task 4: Deploy a playbook (Logic App) for automated response

Create a Logic App playbook that blocks an IP address when triggered.

```bash
# Create a Logic App for the playbook
az logic workflow create \
  --resource-group $RG_NAME \
  --name "playbook-block-ip" \
  --location $LOCATION \
  --definition '{
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "triggers": {
      "Microsoft_Sentinel_incident": {
        "type": "ApiConnectionWebhook",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters('$connections')['azuresentinel']['connectionId']"
            }
          },
          "body": {
            "callback_url": "@listCallbackUrl()"
          },
          "path": "/incident-creation"
        }
      }
    },
    "actions": {
      "Get_Incident_Entities": {
        "type": "ApiConnection",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters('$connections')['azuresentinel']['connectionId']"
            }
          },
          "method": "post",
          "path": "/entities/@{triggerBody()?['object']?['properties']?['incidentNumber']}"
        },
        "runAfter": {}
      },
      "Add_Comment_to_Incident": {
        "type": "ApiConnection",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters('$connections')['azuresentinel']['connectionId']"
            }
          },
          "method": "post",
          "body": {
            "incidentArmId": "@triggerBody()?['object']?['id']",
            "message": "Automated response: IP address has been submitted for blocking via NSG rule."
          },
          "path": "/comment"
        },
        "runAfter": {"Get_Incident_Entities": ["Succeeded"]}
      }
    },
    "parameters": {
      "$connections": {
        "type": "Object"
      }
    }
  }'

# Enable managed identity on the Logic App for Sentinel access
az logic workflow identity assign \
  --resource-group $RG_NAME \
  --name "playbook-block-ip"

PLAYBOOK_IDENTITY=$(az logic workflow show \
  --resource-group $RG_NAME \
  --name "playbook-block-ip" \
  --query "identity.principalId" -o tsv)

# Grant the playbook Sentinel Responder role
az role assignment create \
  --assignee $PLAYBOOK_IDENTITY \
  --role "Microsoft Sentinel Responder" \
  --scope $WORKSPACE_ID

echo "Playbook deployed with managed identity and Sentinel Responder role"
```

## Task 5: Link automation rule to playbook execution

Update the automation rule to trigger the playbook after incident creation.

```bash
# Get the Logic App resource ID
PLAYBOOK_ID=$(az logic workflow show \
  --resource-group $RG_NAME \
  --name "playbook-block-ip" \
  --query id -o tsv)

# Create an automation rule that triggers the playbook for critical incidents
az rest --method PUT \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/automationRules/auto-respond-critical?api-version=2024-03-01" \
  --body "{
    \"properties\": {
      \"displayName\": \"Auto-respond to Critical Incidents\",
      \"order\": 2,
      \"triggeringLogic\": {
        \"isEnabled\": true,
        \"triggersOn\": \"Incidents\",
        \"triggersWhen\": \"Created\",
        \"conditions\": [
          {
            \"conditionType\": \"Property\",
            \"conditionProperties\": {
              \"propertyName\": \"IncidentSeverity\",
              \"operator\": \"Equals\",
              \"propertyValues\": [\"Critical\"]
            }
          }
        ]
      },
      \"actions\": [
        {
          \"actionType\": \"RunPlaybook\",
          \"order\": 1,
          \"actionConfiguration\": {
            \"logicAppResourceId\": \"${PLAYBOOK_ID}\",
            \"tenantId\": \"$(az account show --query tenantId -o tsv)\"
          }
        }
      ]
    }
  }"

echo "Automation rule linked to playbook - Critical incidents trigger auto-response"
```

## Task 6: Configure data retention and archive strategy

Set up tiered retention across security tables.

```bash
# Configure retention tiers for different security data
# Tier 1: High-value data - 365 days interactive, 730 total
az monitor log-analytics workspace table update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "SecurityIncident" \
  --retention-time 365 \
  --total-retention-time 730

# Tier 2: Investigation data - 180 days interactive, 365 total
az monitor log-analytics workspace table update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "SecurityAlert" \
  --retention-time 180 \
  --total-retention-time 365

# Tier 3: Raw telemetry - 90 days interactive, 180 total (cost optimization)
az monitor log-analytics workspace table update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "Syslog" \
  --retention-time 90 \
  --total-retention-time 180

# Verify retention configuration
az monitor log-analytics workspace table list \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query "[?retentionInDays != totalRetentionInDays].{Table:name, Interactive:retentionInDays, Archive:totalRetentionInDays, Plan:plan}" -o table

echo ""
echo "Retention strategy:"
echo "  SecurityIncident: 365d interactive + 365d archive (2 years total)"
echo "  SecurityAlert: 180d interactive + 185d archive (1 year total)"
echo "  Syslog: 90d interactive + 90d archive (180 days total)"
```

---

## Break & Fix

### Scenario 1: Analytics rule fires but no incident is created

The scheduled rule generates alerts (visible in SecurityAlert table) but incidents are not being created.

<details>
<summary>Show solution</summary>

```bash
# Check the incident configuration in the analytics rule
az rest --method GET \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/brute-force-detection?api-version=2024-03-01" \
  --query "properties.incidentConfiguration" -o json

# Common causes:
# 1. incidentConfiguration.createIncident is set to false
# 2. Grouping configuration is merging alerts into existing incidents
# 3. An automation rule is closing incidents immediately

# Fix: Ensure createIncident is true
az rest --method PATCH \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/brute-force-detection?api-version=2024-03-01" \
  --body '{
    "kind": "Scheduled",
    "properties": {
      "incidentConfiguration": {
        "createIncident": true,
        "groupingConfiguration": {
          "enabled": true,
          "reopenClosedIncident": false,
          "lookbackDuration": "PT1H",
          "matchingMethod": "AllEntities",
          "groupByEntities": ["Ip"]
        }
      }
    }
  }'

# Also check for automation rules that might be closing incidents
az rest --method GET \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/automationRules?api-version=2024-03-01" \
  --query "value[].{Name:properties.displayName, Actions:properties.actions[].actionType}" -o table
```

</details>

### Scenario 2: Playbook fails with "Forbidden" when updating incidents

The automation rule triggers the playbook but it fails with a 403 error when trying to add comments to incidents.

<details>
<summary>Show solution</summary>

```bash
# Check the playbook's managed identity role assignments
PLAYBOOK_IDENTITY=$(az logic workflow show \
  --resource-group $RG_NAME \
  --name "playbook-block-ip" \
  --query "identity.principalId" -o tsv)

az role assignment list \
  --assignee $PLAYBOOK_IDENTITY \
  --all \
  --query "[].{Role:roleDefinitionName, Scope:scope}" -o table

# The playbook needs Microsoft Sentinel Responder on the workspace
# AND the automation rule needs "Microsoft Sentinel Automation Contributor" 
# to run playbooks

# Fix: Assign correct roles
az role assignment create \
  --assignee $PLAYBOOK_IDENTITY \
  --role "Microsoft Sentinel Responder" \
  --scope $WORKSPACE_ID

# The user/identity that created the automation rule also needs:
az role assignment create \
  --assignee "$(az account show --query user.name -o tsv)" \
  --role "Microsoft Sentinel Automation Contributor" \
  --scope $WORKSPACE_ID

echo "Roles assigned - playbook should now have permission to update incidents"
```

</details>

### Scenario 3: NRT rule not detecting events that appear in manual query

Running the KQL query manually returns results, but the NRT rule never fires.

<details>
<summary>Show solution</summary>

```bash
# Check if the rule is enabled
az rest --method GET \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/nrt-privileged-signin-anomaly?api-version=2024-03-01" \
  --query "{Enabled:properties.enabled, Suppression:properties.suppressionEnabled, SuppressionDuration:properties.suppressionDuration}"

# Common causes for NRT rules not firing:
# 1. Suppression is enabled and the suppression window hasn't expired
# 2. The query uses time filters (NRT rules automatically scope to recent data)
# 3. Data ingestion delay - NRT processes data as it arrives

# Fix: Remove any time filters from the NRT query
# NRT rules should NOT contain "| where TimeGenerated > ago(...)" 
# The system automatically handles the time window

# Check if suppression is blocking repeated fires
# Reduce suppression or disable temporarily for testing
az rest --method PATCH \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/nrt-privileged-signin-anomaly?api-version=2024-03-01" \
  --body '{
    "kind": "NRT",
    "properties": {
      "suppressionEnabled": false
    }
  }'

echo "Suppression disabled - NRT rule will fire on every matching event"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the maximum detection latency for a Near-Real-Time (NRT) analytics rule in Sentinel?",
    options: [
      "Every 5 minutes",
      "Within approximately 1 minute of data ingestion",
      "Every 15 minutes",
      "Immediately (sub-second)"
    ],
    correctIndex: 1,
    explanation: "NRT analytics rules process data within approximately 1 minute of ingestion. They run continuously without a configured frequency, checking each batch of data as it arrives. This makes them much faster than scheduled rules (minimum 5-minute frequency)."
  },
  {
    question: "What role does a Logic App playbook's managed identity need to update incidents in Sentinel?",
    options: [
      "Logic App Contributor",
      "Microsoft Sentinel Responder (minimum)",
      "Owner on the resource group",
      "Log Analytics Contributor"
    ],
    correctIndex: 1,
    explanation: "A playbook's managed identity needs at minimum Microsoft Sentinel Responder role on the workspace to update incidents (change status, severity, add comments, assign). For running playbooks via automation rules, the rule creator also needs Sentinel Automation Contributor."
  },
  {
    question: "How do automation rules and playbooks differ in Sentinel?",
    options: [
      "They are the same thing with different names",
      "Automation rules define conditions and simple actions (triage); playbooks are Logic Apps that perform complex multi-step responses",
      "Playbooks run faster than automation rules",
      "Automation rules require a premium license; playbooks are free"
    ],
    correctIndex: 1,
    explanation: "Automation rules are lightweight condition-action pairs for incident triage (assign, tag, change severity, close, or trigger playbooks). Playbooks are full Logic Apps that can perform complex orchestration: call external APIs, send emails, block IPs, create tickets, etc."
  },
  {
    question: "What happens to data after the interactive retention period expires but before total retention ends?",
    options: [
      "Data is permanently deleted",
      "Data moves to archive tier where only search jobs and restore operations work",
      "Data is compressed but fully queryable",
      "Data is exported to Blob storage automatically"
    ],
    correctIndex: 1,
    explanation: "After interactive retention expires, data enters the archive tier (remaining portion of total retention). Archived data supports only limited search jobs and restore-to-table operations—not direct KQL queries, alerts, or analytics rules. This provides cost-effective long-term storage for compliance."
  }
]} />

## Cleanup

```bash
# Delete automation rules
az rest --method DELETE \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/automationRules/auto-triage-brute-force?api-version=2024-03-01"

az rest --method DELETE \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/automationRules/auto-respond-critical?api-version=2024-03-01"

# Delete analytics rules
az rest --method DELETE \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/brute-force-detection?api-version=2024-03-01"

az rest --method DELETE \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/nrt-privileged-signin-anomaly?api-version=2024-03-01"

# Delete playbook
az logic workflow delete \
  --resource-group $RG_NAME \
  --name "playbook-block-ip" --yes

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait

echo "Cleanup complete - all automation resources removed"
```
