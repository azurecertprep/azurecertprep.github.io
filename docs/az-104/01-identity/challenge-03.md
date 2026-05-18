---
sidebar_position: 3
title: "Challenge 03: Azure Policy & Governance"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 03: Azure Policy & Governance

> **Estimated time**: 60-75 min | **Estimated cost**: Free (policy evaluation) | **Exam weight**: 15-20%

## Introduction

The CTO of Contoso Ltd. just came back from a cloud security conference and is worried. "I heard a company accidentally deployed production workloads in the wrong region and got hit with data sovereignty violations. Can that happen to us?" Your job: set up guardrails so nobody can deploy resources without proper tags, outside approved regions, or without following company standards.

Azure Policy is your enforcement engine. Think of it as Group Policy for the cloud | but instead of controlling desktop settings, you're controlling what resources can be created and how they must be configured.

## Exam Skills Covered

- ✅ Create and manage Azure Policy assignments
- ✅ Create and manage policy definitions and initiatives
- ✅ Manage resource locks
- ✅ Manage resource tags
- ✅ Manage resource groups
- ✅ Manage subscriptions and management groups
- ✅ Configure and manage Azure Advisor recommendations
- ✅ Configure and manage budgets and cost alerts

## Sysadmin ↔ Azure Reference

| On-Prem / Sysadmin | Azure Equivalent | Notes |
|---------------------|------------------|-------|
| Group Policy Objects (GPO) | Azure Policy | Enforce rules on resources |
| GPO "Deny" settings | Policy with Deny effect | Block non-compliant deployments |
| GPO auditing | Policy with Audit effect | Report non-compliance without blocking |
| Mandatory file metadata | Resource tags | Key-value pairs on resources |
| WSUS / SCCM compliance | Azure Advisor | Recommendations for best practices |
| Read-only file system | ReadOnly resource lock | Prevent modifications |
| "Cannot delete" protection | CanNotDelete resource lock | Prevent accidental deletion |
| OU hierarchy in AD | Management groups | Hierarchical organization of subscriptions |
| Budget tracking spreadsheet | Azure Budgets | Automated cost alerts |

## Description

### Part 1: Resource Groups & Tags

1. Create two resource groups for this challenge:

```bash
az group create --name rg-policy-prod --location eastus --tags Environment=Production CostCenter=IT-001
az group create --name rg-policy-dev --location eastus --tags Environment=Development CostCenter=IT-002
```

2. Add tags to both resource groups:
   - `Environment` = Production or Development
   - `CostCenter` = IT-001 or IT-002
   - `Owner` = your name

3. Practice bulk tag operations | list all resources with a specific tag:

```bash
az resource list --tag Environment=Production -o table
```

### Part 2: Azure Policy | Require Tags

4. Assign the built-in policy **"Require a tag and its value on resources"** to `rg-policy-prod`:
   - Tag name: `CostCenter`
   - Effect: **Deny**

5. Test the policy by trying to create a storage account **without** the `CostCenter` tag in `rg-policy-prod`:

```bash
# This should FAIL after policy takes effect
az storage account create \
  --name stpolicytest$RANDOM \
  --resource-group rg-policy-prod \
  --location eastus \
  --sku Standard_LRS
```

6. Now create the storage account **with** the required tag:

```bash
# This should SUCCEED
az storage account create \
  --name stpolicytest$RANDOM \
  --resource-group rg-policy-prod \
  --location eastus \
  --sku Standard_LRS \
  --tags CostCenter=IT-001
```

### Part 3: Azure Policy | Allowed Locations

7. Assign the built-in policy **"Allowed locations"** to `rg-policy-prod`:
   - Allowed locations: East US, West US 2

8. Test by trying to create a resource in `rg-policy-prod` using a disallowed location (e.g., West Europe)

### Part 4: Policy Initiative

9. Create a policy initiative (policy set) called `Contoso-Governance` that includes:
   - Require `CostCenter` tag on resources
   - Require `Environment` tag on resources
   - Allowed locations (East US, West US 2)

10. Assign the initiative to `rg-policy-dev`

### Part 5: Resource Locks

11. Create a **CanNotDelete** lock on `rg-policy-prod`:

```bash
az lock create --name "PreventDeletion" \
  --lock-type CanNotDelete \
  --resource-group rg-policy-prod \
  --notes "Production resources - do not delete"
```

12. Try to delete the resource group (it should fail)
13. Create a **ReadOnly** lock on a specific resource within the group

### Part 6: Azure Advisor & Budgets

14. Check Azure Advisor recommendations for your subscription:

```bash
az advisor recommendation list --query "[].{Category:category, Impact:impact, Description:shortDescription.problem}" -o table
```

15. Create a budget alert on your subscription:

<Tabs>
<TabItem value="cli" label="Azure CLI">

```bash
# Create a monthly budget of $50 with an alert at 80%
az consumption budget create \
  --budget-name "LabBudget" \
  --amount 50 \
  --time-grain Monthly \
  --start-date "2025-01-01" \
  --end-date "2025-12-31" \
  --category Cost
```

:::note

Budget alerts via CLI require additional configuration for notification thresholds. It's easier to set these up in the Portal under **Cost Management + Billing** → **Budgets**.

:::
</TabItem>
<TabItem value="portal" label="Portal">

1. Go to **Cost Management + Billing** → **Budgets**
2. Click **+ Add**
3. Set **Amount** to $50, **Time grain** to Monthly
4. Add an alert condition at **80%** of the budget
5. Add your email for notifications

</TabItem>
</Tabs>

## Success Criteria

- [ ] Two resource groups exist with proper tags (Environment, CostCenter, Owner)
- [ ] Policy "Require CostCenter tag" is assigned to `rg-policy-prod` with Deny effect
- [ ] Deploying a resource without the tag fails in `rg-policy-prod`
- [ ] Deploying a resource with the tag succeeds
- [ ] Allowed locations policy restricts deployments to East US and West US 2
- [ ] Policy initiative `Contoso-Governance` is created with 3 policies and assigned to `rg-policy-dev`
- [ ] CanNotDelete lock exists on `rg-policy-prod`
- [ ] Attempting to delete the locked resource group fails
- [ ] Azure Advisor recommendations have been reviewed

## Hints

<details>
<summary>Hint 1: Finding built-in policy definitions</summary>

```bash
# Search for tag-related policies
az policy definition list --query "[?contains(displayName, 'tag')].{Name:displayName, ID:name}" -o table

# Search for location policies
az policy definition list --query "[?contains(displayName, 'location')].{Name:displayName, ID:name}" -o table

# Get details of a specific policy
az policy definition show --name "1e30110a-5ceb-460c-a204-c1c3969c6d62"
```

</details>

<details>
<summary>Hint 2: Assigning a policy with parameters</summary>

```bash
# Assign "Require a tag and its value on resources"
# Built-in policy ID: 1e30110a-5ceb-460c-a204-c1c3969c6d62
RG_ID=$(az group show --name rg-policy-prod --query id -o tsv)

az policy assignment create \
  --name "require-costcenter-tag" \
  --display-name "Require CostCenter tag" \
  --policy "1e30110a-5ceb-460c-a204-c1c3969c6d62" \
  --scope "$RG_ID" \
  --params '{"tagName":{"value":"CostCenter"},"tagValue":{"value":"*"}}'
```

:::tip

Policy assignments can take **5-15 minutes** to take effect. Be patient when testing!

:::
</details>

<details>
<summary>Hint 3: Creating a policy initiative</summary>

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

cat <<'EOF' > initiative.json
[
  {
    "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/871b6d14-10aa-478d-b466-ef6698f3ef28",
    "parameters": {
      "tagName": { "value": "CostCenter" }
    }
  },
  {
    "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/871b6d14-10aa-478d-b466-ef6698f3ef28",
    "parameters": {
      "tagName": { "value": "Environment" }
    }
  },
  {
    "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c",
    "parameters": {
      "listOfAllowedLocations": { "value": ["eastus", "westus2"] }
    }
  }
]
EOF

az policy set-definition create \
  --name "Contoso-Governance" \
  --display-name "Contoso Governance Initiative" \
  --definitions initiative.json \
  --description "Requires tags and restricts locations"
```

</details>

<details>
<summary>Hint 4: Working with resource locks</summary>

```bash
# List locks on a resource group
az lock list --resource-group rg-policy-prod -o table

# Try to delete (will fail with CanNotDelete lock)
az group delete --name rg-policy-prod --yes
# Error: resource group is locked

# To delete, you must first remove the lock
az lock delete --name "PreventDeletion" --resource-group rg-policy-prod
```

</details>

<details>
<summary>Hint 5: Checking policy compliance</summary>

```bash
# View compliance state for a policy assignment
az policy state list \
  --resource-group rg-policy-prod \
  --query "[].{Resource:resourceId, Compliance:complianceState, Policy:policyAssignmentName}" \
  -o table

# Trigger an on-demand policy evaluation
az policy state trigger-scan --resource-group rg-policy-prod --no-wait
```

</details>

## Learning Resources

- [Azure Policy overview](https://learn.microsoft.com/en-us/azure/governance/policy/overview)
- [Azure Policy built-in definitions](https://learn.microsoft.com/en-us/azure/governance/policy/samples/built-in-policies)
- [Resource locks](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources)
- [Use tags to organize resources](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-resources)
- [Management groups](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)
- [Azure Advisor](https://learn.microsoft.com/en-us/azure/advisor/advisor-overview)

## Break & Fix

After completing the challenge, try these troubleshooting scenarios:

1. **Lock vs. Policy showdown**: You have a CanNotDelete lock on a resource group and a Policy with Deny effect on tag requirements. You try to create a resource without tags. Which one blocks you first? (Answer: Policy evaluates during deployment; locks apply to delete/modify operations.)

2. **Can't delete anything**: Apply a **ReadOnly** lock to a resource group, then try to add a new resource inside it. What happens? (The ReadOnly lock prevents any changes, including creating new resources inside the group.)

3. **Policy not working**: You assigned a Deny policy 2 minutes ago and it's not blocking anything yet. Why? (Policy evaluation can take up to 15 minutes for new assignments. Trigger an on-demand scan with `az policy state trigger-scan`.)

4. **Inherited tag confusion**: You tagged a resource group with `Environment=Production`, but resources inside it don't have the tag. Is this expected? (Yes | tags are NOT inherited from resource groups to resources by default. Use the `Inherit a tag from the resource group` policy to enable this.)

## Knowledge Check

<details>
<summary>1. What is the difference between Deny, Audit, and Append policy effects?</summary>

- **Deny**: Blocks the resource creation or modification if it doesn't comply. Hard enforcement.
- **Audit**: Allows the resource but creates a compliance entry. Soft enforcement | you see violations but don't block them.
- **Append**: Automatically adds fields to the resource during creation. For example, adding a tag that's missing.

Other effects include: **AuditIfNotExists**, **DeployIfNotExists** (auto-remediate), **Disabled**, and **Modify**.

**Exam tip**: Know when to use Deny vs. Audit vs. DeployIfNotExists.

</details>

<details>
<summary>2. What is the difference between a policy definition and a policy initiative?</summary>

A **policy definition** is a single rule (e.g., "require CostCenter tag").

A **policy initiative** (also called a **policy set**) is a collection of policy definitions grouped together. This makes it easier to assign and manage multiple related policies as a single unit.

**Example**: A "Governance" initiative might include: require tags + allowed locations + allowed VM SKUs.

</details>

<details>
<summary>3. How does the management group hierarchy work?</summary>

```
Root Management Group (Tenant Root)
├── MG-Production
│   ├── Sub-Prod-01
│   └── Sub-Prod-02
├── MG-Development
│   └── Sub-Dev-01
└── MG-Sandbox
    └── Sub-Sandbox-01
```

- Every subscription belongs to **exactly one** management group
- Policies and RBAC assigned at a management group are **inherited** by all child management groups and subscriptions
- Maximum depth: **6 levels** (not counting the root)
- The root management group cannot be moved or deleted

</details>

<details>
<summary>4. Can you apply a resource lock to a specific resource (not just a resource group)?</summary>

**Yes!** Resource locks can be applied at three levels:
- **Subscription** level (affects all resource groups and resources)
- **Resource group** level (affects all resources in the group)
- **Individual resource** level (affects only that resource)

Locks are inherited | a lock at the resource group level applies to all resources within it. To delete a locked resource, you must first remove the lock.

</details>

<details>
<summary>5. Do tags inherit from resource groups to resources?</summary>

**No!** Tags on a resource group are **NOT** automatically inherited by the resources inside it. This is a very common exam question.

To enforce tag inheritance, use the built-in policy **"Inherit a tag from the resource group"** with the **Modify** effect. This policy will automatically copy tags from the resource group to new resources created within it.

</details>

## Cleanup

```bash
# Remove the resource lock first (required before deletion)
az lock delete --name "PreventDeletion" --resource-group rg-policy-prod 2>/dev/null

# Remove policy assignments
az policy assignment delete --name "require-costcenter-tag" --scope $(az group show --name rg-policy-prod --query id -o tsv) 2>/dev/null
az policy assignment delete --name "allowed-locations" --scope $(az group show --name rg-policy-prod --query id -o tsv) 2>/dev/null

# Remove initiative assignment and definition
az policy assignment delete --name "contoso-governance-assignment" --scope $(az group show --name rg-policy-dev --query id -o tsv) 2>/dev/null
az policy set-definition delete --name "Contoso-Governance" 2>/dev/null

# Delete resource groups
az group delete --name rg-policy-prod --yes --no-wait
az group delete --name rg-policy-dev --yes --no-wait

# Clean up temp files
rm -f initiative.json
```

---

**Next**: [Challenge 04 | Storage Accounts & Access](/docs/az-104/storage/challenge-04)
