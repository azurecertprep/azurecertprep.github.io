---
sidebar_position: 44
title: "Challenge 44: Microsoft Sentinel – Workspace, Roles, and Content Hub"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 44: Microsoft Sentinel – Workspace, Roles, and Content Hub

## Exam skills covered

- Design and configure a Microsoft Sentinel workspace
- Configure Microsoft Sentinel roles and permissions
- Install and manage Content Hub solutions
- Manage Sentinel workspace retention and archiving

## Scenario

Contoso Ltd is deploying Microsoft Sentinel as their cloud-native SIEM. You must design the workspace architecture to support the SOC team, configure appropriate RBAC roles for analysts and engineers, install Content Hub solutions for their technology stack, and set up proper data retention policies to balance cost with compliance requirements.

---

## Prerequisites

- Azure subscription with Owner or Contributor role
- Azure CLI installed and authenticated
- Understanding of Log Analytics workspace concepts

---

## Task 1: Create a Log Analytics workspace and enable Sentinel

Deploy the foundational workspace and onboard Microsoft Sentinel.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-sentinel"
LOCATION="eastus"
WORKSPACE_NAME="law-contoso-sentinel"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Create Log Analytics workspace with appropriate settings
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --retention-time 90 \
  --sku PerGB2018

# Get workspace resource ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Enable Microsoft Sentinel on the workspace
az sentinel onboarding-state create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default" \
  --customer-managed-key false

# Verify Sentinel is enabled
az sentinel onboarding-state show \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default" \
  --query "{State:provisioningState}" -o table
```

## Task 2: Configure workspace table retention and archiving

Set up tiered retention to optimize costs while meeting compliance.

```bash
# Set default workspace retention to 90 days
az monitor log-analytics workspace update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --retention-time 90

# Configure extended retention for SecurityEvent table (1 year for compliance)
az monitor log-analytics workspace table update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "SecurityEvent" \
  --retention-time 365 \
  --total-retention-time 730

# Configure retention for SigninLogs (required for audit)
az monitor log-analytics workspace table update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "SigninLogs" \
  --retention-time 180 \
  --total-retention-time 365

# List table retention settings
az monitor log-analytics workspace table list \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query "[?retentionInDays > 90].{Table:name, Retention:retentionInDays, TotalRetention:totalRetentionInDays}" -o table
```

## Task 3: Configure Sentinel RBAC roles

Assign appropriate roles for SOC analysts, engineers, and responders.

```bash
# Get workspace scope for role assignments
WORKSPACE_SCOPE="${WORKSPACE_ID}"

# Sentinel-specific built-in roles:
# - Microsoft Sentinel Reader: View data, incidents, workbooks
# - Microsoft Sentinel Responder: Reader + manage incidents
# - Microsoft Sentinel Contributor: Responder + create/edit analytics rules, workbooks
# - Microsoft Sentinel Playbook Operator: Run playbooks manually

# Assign Sentinel Responder to SOC Tier 1 Analyst group
# Replace with actual group Object ID
SOC_T1_GROUP="00000000-0000-0000-0000-000000000001"

az role assignment create \
  --assignee $SOC_T1_GROUP \
  --role "Microsoft Sentinel Responder" \
  --scope $WORKSPACE_SCOPE 2>/dev/null || echo "Note: Replace group ID with actual Azure AD group"

# Assign Sentinel Contributor to SOC Engineers
SOC_ENGINEERS_GROUP="00000000-0000-0000-0000-000000000002"

az role assignment create \
  --assignee $SOC_ENGINEERS_GROUP \
  --role "Microsoft Sentinel Contributor" \
  --scope $WORKSPACE_SCOPE 2>/dev/null || echo "Note: Replace group ID with actual Azure AD group"

# Assign Playbook Operator for automation access
az role assignment create \
  --assignee $SOC_T1_GROUP \
  --role "Microsoft Sentinel Playbook Operator" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}" 2>/dev/null || echo "Note: Replace group ID with actual Azure AD group"

# List current role assignments on the workspace
az role assignment list \
  --scope $WORKSPACE_SCOPE \
  --query "[].{Principal:principalName, Role:roleDefinitionName}" -o table
```

## Task 4: Configure resource-context and table-level RBAC

Set up granular access control for specific data tables.

```bash
# Enable resource-context access (allows resource owners to see their logs)
az monitor log-analytics workspace update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --set features.enableLogAccessUsingOnlyResourcePermissions=true

# Create a custom role for limited table access (HR team sees only specific tables)
az role definition create --role-definition '{
  "Name": "Sentinel SignIn Logs Reader",
  "Description": "Can read only SigninLogs and AADNonInteractiveUserSignInLogs tables",
  "Actions": [
    "Microsoft.OperationalInsights/workspaces/read",
    "Microsoft.OperationalInsights/workspaces/query/SigninLogs/read",
    "Microsoft.OperationalInsights/workspaces/query/AADNonInteractiveUserSignInLogs/read"
  ],
  "NotActions": [],
  "AssignableScopes": ["/subscriptions/'"${SUBSCRIPTION_ID}"'"]
}' 2>/dev/null || echo "Custom role created (or already exists)"

echo "Resource-context RBAC enabled - resource owners can query their own resource logs"
```

## Task 5: Install Content Hub solutions

Install pre-built solutions for Contoso's technology stack.

```bash
# List available Content Hub solutions
az sentinel content list \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --query "[].{Name:name, ContentKind:properties.contentKind}" -o table \
  | head -20

# Install Microsoft Entra ID solution
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.OperationalInsights/workspaces/${WORKSPACE_NAME}/providers/Microsoft.SecurityInsights/contentPackages/azuresentinel.azure-sentinel-solution-azureactivedirectory?api-version=2024-03-01" \
  --body '{
    "properties": {
      "contentId": "azuresentinel.azure-sentinel-solution-azureactivedirectory",
      "contentProductId": "azuresentinel.azure-sentinel-solution-azureactivedirectory",
      "displayName": "Microsoft Entra ID",
      "contentKind": "Solution",
      "version": "3.0.0",
      "isNew": true,
      "isPreview": false
    }
  }'

# Install Microsoft Defender for Cloud solution
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.OperationalInsights/workspaces/${WORKSPACE_NAME}/providers/Microsoft.SecurityInsights/contentPackages/azuresentinel.azure-sentinel-solution-microsoftdefenderforcloud?api-version=2024-03-01" \
  --body '{
    "properties": {
      "contentId": "azuresentinel.azure-sentinel-solution-microsoftdefenderforcloud",
      "contentProductId": "azuresentinel.azure-sentinel-solution-microsoftdefenderforcloud",
      "displayName": "Microsoft Defender for Cloud",
      "contentKind": "Solution",
      "version": "3.0.0",
      "isNew": true,
      "isPreview": false
    }
  }'

# Install Azure Activity solution
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.OperationalInsights/workspaces/${WORKSPACE_NAME}/providers/Microsoft.SecurityInsights/contentPackages/azuresentinel.azure-sentinel-solution-azureactivity?api-version=2024-03-01" \
  --body '{
    "properties": {
      "contentId": "azuresentinel.azure-sentinel-solution-azureactivity",
      "contentProductId": "azuresentinel.azure-sentinel-solution-azureactivity",
      "displayName": "Azure Activity",
      "contentKind": "Solution",
      "version": "2.0.0",
      "isNew": true,
      "isPreview": false
    }
  }'

echo "Content Hub solutions installed: Entra ID, Defender for Cloud, Azure Activity"
```

## Task 6: Configure workspace health monitoring

Enable health diagnostics for the Sentinel workspace.

```bash
# Enable Sentinel health diagnostics
az monitor diagnostic-settings create \
  --name "sentinel-health" \
  --resource "${WORKSPACE_ID}/providers/Microsoft.SecurityInsights" \
  --workspace $WORKSPACE_ID \
  --logs '[
    {"category": "DataConnectors", "enabled": true},
    {"category": "Analytics", "enabled": true},
    {"category": "Automation", "enabled": true}
  ]' 2>/dev/null || echo "Note: Sentinel diagnostic settings require specific API version"

# Alternative: Enable via REST API
az rest --method PUT \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/diagnosticSettings/sentinel-health?api-version=2021-05-01-preview" \
  --body "{
    \"properties\": {
      \"workspaceId\": \"${WORKSPACE_ID}\",
      \"logs\": [
        {\"category\": \"DataConnectors\", \"enabled\": true},
        {\"category\": \"Analytics\", \"enabled\": true}
      ]
    }
  }" 2>/dev/null || echo "Health monitoring configured"

echo "Workspace health monitoring enabled - check SentinelHealth table for connector status"
```

---

## Break & Fix

### Scenario 1: Analyst cannot view incidents despite having Log Analytics Reader role

A SOC analyst has Log Analytics Reader on the workspace but cannot see Sentinel incidents.

<details>
<summary>Show solution</summary>

```bash
# Log Analytics Reader does NOT grant Sentinel incident access
# The analyst needs a Sentinel-specific role

# Check current role assignments for the user
az role assignment list \
  --assignee "analyst@contoso.com" \
  --scope $WORKSPACE_SCOPE \
  --query "[].roleDefinitionName" -o tsv

# Solution: Assign Microsoft Sentinel Responder (minimum for incident management)
az role assignment create \
  --assignee "analyst@contoso.com" \
  --role "Microsoft Sentinel Responder" \
  --scope $WORKSPACE_SCOPE

# Role hierarchy:
# - Log Analytics Reader: Can query data but NOT see Sentinel-specific resources
# - Sentinel Reader: Can view incidents, analytics rules, workbooks (read-only)
# - Sentinel Responder: Can manage incidents (assign, change severity, close)
# - Sentinel Contributor: Can create/edit analytics rules, workbooks, hunting queries
```

</details>

### Scenario 2: Content Hub solution installation fails with permission error

A security engineer tries to install a Content Hub solution but gets a 403 Forbidden error.

<details>
<summary>Show solution</summary>

```bash
# Content Hub solution installation requires:
# 1. Microsoft Sentinel Contributor role on the workspace
# 2. AND Template Spec Reader on the subscription (for solution templates)

# Check the engineer's roles
az role assignment list \
  --assignee "engineer@contoso.com" \
  --all \
  --query "[?contains(scope, '${RG_NAME}')].roleDefinitionName" -o tsv

# Solution: Ensure both roles are assigned
az role assignment create \
  --assignee "engineer@contoso.com" \
  --role "Microsoft Sentinel Contributor" \
  --scope $WORKSPACE_SCOPE

# Template Spec Reader at subscription level for solution templates
az role assignment create \
  --assignee "engineer@contoso.com" \
  --role "Template Spec Reader" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}"
```

</details>

### Scenario 3: Workspace approaching data cap with unexpected ingestion volume

The workspace is ingesting 3x expected volume, driving up costs unexpectedly.

<details>
<summary>Show solution</summary>

```bash
# Identify which tables are consuming the most data
az monitor log-analytics workspace table list \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query "sort_by([].{Table:name, Plan:plan, RetentionDays:retentionInDays}, &Table)" -o table

# Use a KQL query to find top data sources (run in portal or via API)
# Query: Usage | where TimeGenerated > ago(7d) | summarize GB=sum(Quantity)/1024 by DataType | top 10 by GB

# Set a daily cap to prevent runaway costs (use with caution!)
az monitor log-analytics workspace update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --set features.dailyQuotaGb=5

# Better approach: Move noisy tables to Basic tier
az monitor log-analytics workspace table update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "ContainerLog" \
  --plan Basic

echo "Daily cap set to 5 GB. Consider Basic tier for high-volume, low-query tables."
echo "WARNING: Daily cap stops ALL ingestion when reached - use sparingly!"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the minimum Sentinel role required for a SOC analyst to assign incidents to team members and change incident severity?",
    options: [
      "Microsoft Sentinel Reader",
      "Microsoft Sentinel Responder",
      "Microsoft Sentinel Contributor",
      "Log Analytics Contributor"
    ],
    correctIndex: 1,
    explanation: "Microsoft Sentinel Responder is the minimum role that allows managing incidents (assign, change severity, close, add comments). Reader can only view, and Contributor adds the ability to create analytics rules and workbooks."
  },
  {
    question: "What is the difference between 'interactive retention' and 'total retention' for a Log Analytics table?",
    options: [
      "Interactive retention is free; total retention costs extra",
      "Interactive retention supports full KQL queries; total retention (archive) supports limited search/restore only",
      "Interactive retention is for hot data; total retention is for cold storage in a separate account",
      "There is no difference; they are the same setting"
    ],
    correctIndex: 1,
    explanation: "Interactive retention keeps data in the hot store supporting full KQL queries and alerts. After interactive retention expires, data moves to archive (part of total retention) where only limited search jobs and restore operations are supported, at a lower cost."
  },
  {
    question: "What does a Content Hub solution in Microsoft Sentinel typically include?",
    options: [
      "Only data connectors",
      "Only analytics rules",
      "A package of data connectors, analytics rules, workbooks, hunting queries, and playbooks for a specific scenario",
      "Only workbook templates"
    ],
    correctIndex: 2,
    explanation: "Content Hub solutions are comprehensive packages that bundle multiple content types—data connectors, analytics rules, workbooks, hunting queries, playbooks, and parsers—all designed to work together for a specific product, service, or threat scenario."
  }
]} />

## Cleanup

```bash
# Remove Sentinel from workspace
az sentinel onboarding-state delete \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default" --yes

# Delete workspace
az monitor log-analytics workspace delete \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --yes

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait

echo "Cleanup complete - Sentinel workspace deleted"
echo "Note: Workspace soft-delete retains data for 14 days by default"
```
