---
sidebar_position: 18
title: "Challenge 18: Cost Management & Azure Advisor"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 18: cost Management & Azure advisor

:::info Estimated Time and Cost

**45-60 minutes** | **Estimated cost**: Free (management plane operations) | **Exam Weight: 10-15%**


:::
## Scenario

Contoso Ltd.'s monthly Azure bill has grown from $5,000 to $45,000 in six months, and the CFO is demanding answers. Nobody knows which department is spending what, there are no alerts when budgets are exceeded, and the CTO suspects there are idle resources burning money. You have been tasked with implementing a comprehensive cost management strategy using Azure Cost Management, budgets, alerts, and Azure Advisor recommendations.

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Manage costs by using alerts, budgets, and Azure Advisor recommendations | High |
| Configure and review Azure cost analysis | Medium |
| Implement and manage Azure resource tags for cost allocation | High |
| Interpret Azure Advisor cost recommendations | Medium |
| Configure action groups for cost alerts | Medium |

## Sysadmin ↔ Azure reference

| On-Prem / Sysadmin | Azure Equivalent | Notes |
|---------------------|------------------|-------|
| Capacity planning spreadsheet | Azure Cost Analysis | Real-time spend visualization |
| Monthly invoice review | Cost Management budgets | Proactive threshold alerts |
| Labeling servers by department | Azure resource tags | Metadata for cost allocation |
| Hardware refresh recommendations | Azure Advisor | Right-sizing, idle resource detection |
| Email from boss when overspending | Budget alerts + Action Groups | Automated notifications at thresholds |
| Chargeback reports | Cost exports + tag filtering | Department-level cost breakdown |
| Monitoring disk utilization | Advisor right-sizing | VM and disk optimization suggestions |

## Tasks

### Task 1: set up Resource tags for cost allocation

Create a consistent tagging strategy and apply tags to existing resources:

```bash
# Create a resource group with cost-tracking tags
az group create \
  --name rg-az104-challenge18 \
  --location eastus \
  --tags Department=Engineering Environment=Development CostCenter=CC-4200 Owner=admin@contoso.com

# Create sample resources with tags
az storage account create \
  --name stcostlab$RANDOM \
  --resource-group rg-az104-challenge18 \
  --location eastus \
  --sku Standard_LRS \
  --tags Department=Engineering Environment=Development CostCenter=CC-4200 Project=WebApp

az vm create \
  --name vm-cost-test \
  --resource-group rg-az104-challenge18 \
  --image Ubuntu2404 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --tags Department=Engineering Environment=Development CostCenter=CC-4200 Project=API
```

### Task 2: create a budget with alerts

Create a monthly budget with multiple alert thresholds:

```bash
# Create a budget for the resource group (monthly, $100 limit)
# Note: Adjust start-date/end-date to your current billing period
az consumption budget create \
  --budget-name "budget-engineering-dev" \
  --amount 100 \
  --category Cost \
  --time-grain Monthly \
  --start-date "2025-01-01" \
  --end-date "2025-12-31" \
  --resource-group rg-az104-challenge18 \
  --notifications '{
    "Actual_GreaterThan_80_Percent": {
      "enabled": true,
      "operator": "GreaterThan",
      "threshold": 80,
      "contactEmails": ["admin@contoso.com"],
      "thresholdType": "Actual"
    },
    "Forecasted_GreaterThan_100_Percent": {
      "enabled": true,
      "operator": "GreaterThan",
      "threshold": 100,
      "contactEmails": ["admin@contoso.com"],
      "thresholdType": "Forecasted"
    }
  }'
```

:::tip Portal Instructions for Budget Alerts

1. Navigate to **Cost Management + Billing** > **Cost Management** > **Budgets**
2. Click **+ Add** to create a new budget
3. Set the scope to your resource group or subscription
4. Configure the budget amount ($100 monthly)
5. Add alert conditions:
   - **50% actual** | notify the team early
   - **75% actual** | escalate to manager
   - **100% actual** | alert all stakeholders
   - **110% forecasted** | proactive forecast warning
6. Configure action group or email recipients for each threshold


:::
### Task 3: configure cost analysis views

Explore cost analysis in the Azure Portal:

1. Navigate to **Cost Management** > **Cost analysis**
2. Create the following saved views:

**View 1: Cost by Department (Tag)**
- Group by: Tag (Department)
- Granularity: Monthly
- Chart type: Column (stacked)

**View 2: Cost by Resource Type**
- Group by: Resource type
- Granularity: Daily
- Date range: Last 30 days

**View 3: Cost by Location**
- Group by: Location
- Granularity: Monthly
- Chart type: Donut

```bash
# Cost query via REST API (no CLI subcommand available)
az rest --method post \
  --url "https://management.azure.com/subscriptions/$(az account show --query id -o tsv)/providers/Microsoft.CostManagement/query?api-version=2023-11-01" \
  --body '{"type":"ActualCost","timeframe":"MonthToDate","dataset":{"granularity":"None","grouping":[{"type":"TagKey","name":"Department"}]}}'
```

### Task 4: configure cost exports

Set up automated cost data export to a storage account:

```bash
# Get the storage account name
STORAGE_NAME=$(az storage account list -g rg-az104-challenge18 --query "[0].name" -o tsv)

# Create a container for cost exports
az storage container create \
  --name cost-exports \
  --account-name $STORAGE_NAME \
  --auth-mode login

# Create a scheduled export (daily)
az costmanagement export create \
  --name "daily-cost-export" \
  --scope "/subscriptions/$(az account show --query id -o tsv)" \
  --type ActualCost \
  --timeframe MonthToDate \
  --storage-account-id $(az storage account show -n $STORAGE_NAME -g rg-az104-challenge18 --query id -o tsv) \
  --storage-container cost-exports \
  --storage-directory "exports" \
  --recurrence Daily \
  --schedule-status Active
```

### Task 5: review Azure advisor recommendations

```bash
# List all advisor recommendations
az advisor recommendation list -o table

# Filter for cost recommendations only
az advisor recommendation list \
  --category Cost \
  --query "[].{Resource:resourceMetadata.resourceId, Problem:shortDescription.problem, Impact:impact}" \
  -o table

# Get detailed recommendation for a specific resource
az advisor recommendation list \
  --category Cost \
  --query "[0]"
```

:::tip Portal Navigation for Advisor

Navigate to **Azure Advisor** > **Cost** tab to see:
- Underutilized VMs (right-size or shut down)
- Unattached managed disks
- Idle load balancers, public IPs, and ExpressRoute circuits
- Reserved Instance purchase recommendations
- Unused App Service plans


:::
### Task 6: implement spending notifications with action Groups

```bash
# Create an action group for cost alerts
az monitor action-group create \
  --name "ag-cost-alerts" \
  --resource-group rg-az104-challenge18 \
  --short-name "CostAlert" \
  --action email finance-team finance@contoso.com

# Verify the action group
az monitor action-group show \
  --name "ag-cost-alerts" \
  --resource-group rg-az104-challenge18 \
  --query "{Name:name, Receivers:emailReceivers[].{Name:name, Email:emailAddress}}" -o json
```

### Task 7: enforce tagging with Azure Policy

Apply a policy that denies resource creation without the required CostCenter tag:

```bash
# Get the built-in policy definition
POLICY_DEF=$(az policy definition list \
  --query "[?displayName=='Require a tag on resources'].id" -o tsv)

# Assign the policy to enforce CostCenter tag
az policy assignment create \
  --name "require-costcenter-tag" \
  --display-name "Require CostCenter Tag" \
  --policy "$POLICY_DEF" \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/rg-az104-challenge18" \
  --params '{"tagName": {"value": "CostCenter"}}'

# Test: try creating a resource without the tag (should fail after policy takes effect)
az storage account create \
  --name stnotagtest$RANDOM \
  --resource-group rg-az104-challenge18 \
  --location eastus \
  --sku Standard_LRS
```

## Success criteria

<SuccessChecklist
  storageKey="az104-challenge-18"
  items={[
    "Resources are tagged with Department, Environment, CostCenter, and Owner tags",
    "A monthly budget exists with at least two alert thresholds (50% and 100%)",
    "Cost analysis views show spend grouped by tag, resource type, and location",
    "An automated cost export is configured to a storage account",
    "Azure Advisor cost recommendations have been reviewed",
    "An action group exists for cost alert notifications",
    "A tagging policy is assigned that requires the CostCenter tag"
  ]}
/>
## Hints

<details>
<summary>Hint 1: Budget scope</summary>

Budgets can be scoped to a subscription, resource group, or management group. For the exam, know that budget alerts are informational by default | they do not stop spending. To automatically shut down resources, you need to combine budget alerts with Azure Automation runbooks or Logic Apps.

</details>

<details>
<summary>Hint 2: Tag inheritance</summary>

Tags do NOT inherit from resource groups to resources. If you tag a resource group with "Department=IT", the resources inside do not automatically get that tag. Use Azure Policy with the "Inherit a tag from the resource group" effect to enforce inheritance.

</details>

<details>
<summary>Hint 3: Advisor recommendation refresh</summary>

Azure Advisor refreshes recommendations every 24 hours. If you just created resources, recommendations may not appear immediately. You can manually trigger a refresh in the portal via Advisor > Overview > Refresh.

</details>

<details>
<summary>Hint 4: Cost analysis access</summary>

To view costs, you need at minimum the **Cost Management Reader** role or **Reader** role at the scope. Billing Account Reader provides access to invoice data but not resource-level cost analysis.

</details>

## Break & fix

### Scenario a: budget not alerting

You created a budget with a $100 threshold, but spending reached $120 and no alert was sent. Investigate: Was an action group configured? Is the email address valid? Check budget alert conditions and ensure "actual" vs "forecasted" is set correctly.

### Scenario b: untagged resources

Run a query to find all resources in a resource group that are missing the CostCenter tag. How do you remediate existing untagged resources? (Answer: Use policy remediation tasks with "Modify" or "DeployIfNotExists" effects.)

```bash
# Find resources missing the CostCenter tag
az resource list --resource-group rg-az104-challenge18 \
  --query "[?tags.CostCenter==null].{Name:name, Type:type}" -o table
```

### Scenario c: cost export failures

Your daily cost export stopped working. Check the export status and common causes: storage account key rotation, deleted container, or network access restrictions on the storage account.

## Knowledge check

<details>
<summary>1. What is the difference between actual and forecasted budget alerts?</summary>

**Actual alerts** fire when cumulative spending reaches the threshold percentage of the budget. **Forecasted alerts** fire when the projected end-of-period spend is expected to exceed the threshold. Forecasted alerts are proactive | they warn you before you overspend based on spending trends.

</details>

<details>
<summary>2. Can Azure budgets automatically stop resource consumption?</summary>

**No.** Budget alerts are informational only | they send notifications but do not stop or delete resources. To automate cost control actions (like shutting down VMs), you must combine budget alerts with **Action Groups** that trigger **Azure Automation runbooks** or **Logic Apps**.

</details>

<details>
<summary>3. What are the five categories of Azure Advisor recommendations?</summary>

1. **Cost** | Right-size or shut down underutilized resources
2. **Security** | Vulnerability and threat detection
3. **Reliability** | High availability and business continuity
4. **Performance** | Speed and responsiveness improvements
5. **Operational Excellence** | Process and workflow best practices

</details>

<details>
<summary>4. What role is required to create budgets?</summary>

To create budgets, you need the **Cost Management Contributor** role (or Contributor/Owner). The **Cost Management Reader** role only allows viewing costs and budgets but not creating them.

</details>

## Cleanup

```bash
# Delete policy assignment
az policy assignment delete \
  --name "require-costcenter-tag" \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/rg-az104-challenge18"

# Delete cost export
az costmanagement export delete \
  --name "daily-cost-export" \
  --scope "/subscriptions/$(az account show --query id -o tsv)"

# Delete action group
az monitor action-group delete \
  --name "ag-cost-alerts" \
  --resource-group rg-az104-challenge18

# Delete the entire resource group and all resources
az group delete --name rg-az104-challenge18 --yes --no-wait

echo "Cleanup complete. Cost data may still appear for 24-48 hours."
```

## Learning resources

- [Azure Cost Management overview](https://learn.microsoft.com/en-us/azure/cost-management-billing/cost-management-billing-overview)
- [Create and manage budgets](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets)
- [Use cost analysis](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/quick-acm-cost-analysis)
- [Azure Advisor cost recommendations](https://learn.microsoft.com/en-us/azure/advisor/advisor-cost-recommendations)
- [Tag resources for cost management](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/cost-mgt-best-practices#tag-shared-resources)
- [Export cost data](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-export-acm-data)
