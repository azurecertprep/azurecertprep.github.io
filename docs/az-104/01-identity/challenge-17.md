---
sidebar_position: 17
title: "Challenge 17: Management Groups & Subscriptions"
---

# Challenge 17: Management Groups & Subscriptions

:::info Estimated Time and Cost

**60-75 minutes** | **Estimated cost**: Free (management plane operations) | **Exam Weight: 20-25%**


:::
## Scenario

Contoso Ltd. is growing fast. What started as a single Azure subscription has ballooned into six subscriptions across three departments (IT, Finance, and Engineering). The CTO wants a governance hierarchy that enforces policies consistently across all subscriptions without duplicating effort. Your job is to design and implement a management group structure that mirrors the company's organizational chart and apply governance at the right levels.

## Exam Skills Covered

| Skill | Weight |
|-------|--------|
| Configure management groups | High |
| Manage subscriptions and governance | High |
| Move subscriptions between management groups | Medium |
| Implement resource locks across subscriptions | Medium |
| Apply RBAC at management group scope | High |

## Sysadmin ↔ Azure Reference

| On-Prem / Sysadmin | Azure Equivalent | Notes |
|---------------------|------------------|-------|
| Active Directory OUs | Management groups | Hierarchical governance containers |
| Group Policy linked to OU | Azure Policy at MG scope | Inherited by all child subscriptions |
| Domain admin over OU tree | RBAC at MG scope | Cascades to subscriptions and resources |
| Moving computers between OUs | Moving subscriptions between MGs | Governance policies change immediately |
| Delegated OU administration | Subscription-level RBAC | Scoped admin access |
| Forest root domain | Tenant Root Group | Top of the hierarchy, cannot be moved |

## Tasks

### Task 1: Create a Management Group Hierarchy

Design and create the following management group structure:

```
Tenant Root Group
└── mg-contoso (Contoso Ltd.)
    ├── mg-production (Production)
    │   ├── mg-prod-it (IT Production)
    │   └── mg-prod-finance (Finance Production)
    └── mg-nonproduction (Non-Production)
        ├── mg-dev (Development)
        └── mg-sandbox (Sandbox)
```

```bash
# Create the top-level management group
az account management-group create \
  --name "mg-contoso" \
  --display-name "Contoso Ltd."

# Create production hierarchy
az account management-group create \
  --name "mg-production" \
  --display-name "Production" \
  --parent "mg-contoso"

az account management-group create \
  --name "mg-prod-it" \
  --display-name "IT Production" \
  --parent "mg-production"

az account management-group create \
  --name "mg-prod-finance" \
  --display-name "Finance Production" \
  --parent "mg-production"

# Create non-production hierarchy
az account management-group create \
  --name "mg-nonproduction" \
  --display-name "Non-Production" \
  --parent "mg-contoso"

az account management-group create \
  --name "mg-dev" \
  --display-name "Development" \
  --parent "mg-nonproduction"

az account management-group create \
  --name "mg-sandbox" \
  --display-name "Sandbox" \
  --parent "mg-nonproduction"
```

:::tip Portal Alternative

Navigate to **Azure Portal** > **Management groups**. Click **+ Create** and specify parent group, ID, and display name for each group.


:::
### Task 2: Move a Subscription into a Management Group

Move your current subscription into the `mg-dev` management group:

```bash
# Get your subscription ID
SUB_ID=$(az account show --query id -o tsv)

# Move subscription to mg-dev
az account management-group subscription add \
  --name "mg-dev" \
  --subscription $SUB_ID

# Verify the move
az account management-group show \
  --name "mg-dev" \
  --expand \
  --recurse
```

### Task 3: Assign Azure Policy at Management Group Scope

Apply the built-in policy "Require a tag and its value on resources" at the `mg-production` scope:

```bash
# Get the policy definition ID
POLICY_DEF=$(az policy definition list \
  --query "[?displayName=='Require a tag and its value on resources'].id" -o tsv)

# Assign the policy at management group scope
az policy assignment create \
  --name "require-env-tag-prod" \
  --display-name "Require Environment Tag (Production)" \
  --policy "$POLICY_DEF" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-production" \
  --params '{"tagName": {"value": "Environment"}, "tagValue": {"value": "Production"}}'
```

### Task 4: Apply RBAC at Management Group Level

Grant a user the "Reader" role at the `mg-contoso` management group scope (cascading to all subscriptions):

```bash
# Get user object ID (replace with your test user)
USER_ID=$(az ad user show --id "alice@yourtenant.onmicrosoft.com" --query id -o tsv)

# Assign Reader role at management group scope
az role assignment create \
  --assignee "$USER_ID" \
  --role "Reader" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso"

# Verify the assignment
az role assignment list \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso" \
  --query "[?principalId=='$USER_ID']" -o table
```

### Task 5: Move a Subscription Between Management Groups

Simulate a department reorganization by moving the subscription from `mg-dev` to `mg-sandbox`:

```bash
# Remove subscription from current MG
az account management-group subscription remove \
  --name "mg-dev" \
  --subscription $SUB_ID

# Add subscription to new MG
az account management-group subscription add \
  --name "mg-sandbox" \
  --subscription $SUB_ID

# Verify new location
az account management-group show \
  --name "mg-sandbox" \
  --expand \
  --recurse
```

### Task 6: Query the Management Group Hierarchy

```bash
# View the full hierarchy
az account management-group list --query "[].{Name:name, DisplayName:displayName}" -o table

# Show hierarchy tree
az account management-group show \
  --name "mg-contoso" \
  --expand \
  --recurse \
  --query "{Name:name, Children:children[].{Name:name, Children:children[].name}}"
```

## Success Criteria

- [ ] Management group hierarchy matches the specified structure (5 groups under mg-contoso)
- [ ] At least one subscription is placed under a management group
- [ ] Azure Policy is assigned at the `mg-production` scope
- [ ] RBAC role assignment exists at the `mg-contoso` scope
- [ ] Subscription was successfully moved between management groups
- [ ] You can query and display the full hierarchy

## Hints

<details>
<summary>Hint 1: Management group permissions</summary>

You need specific permissions to create management groups. By default, any user in the tenant can create management groups. This can be restricted via the tenant-level setting "Require permissions to create new management groups" in the Azure portal under Management Groups > Settings.

</details>

<details>
<summary>Hint 2: Policy inheritance</summary>

Policies assigned at a management group scope are inherited by all child management groups and subscriptions. You cannot override or exclude a child from an inherited policy | you can only add exemptions for specific resources.

</details>

<details>
<summary>Hint 3: Maximum hierarchy depth</summary>

Management groups support up to 6 levels of depth (not counting the Tenant Root Group). Plan your hierarchy to stay within this limit.

</details>

<details>
<summary>Hint 4: Moving subscriptions</summary>

Moving a subscription between management groups changes which policies and RBAC assignments apply. The change takes effect immediately but may take up to 30 minutes to be fully reflected in policy compliance evaluations.

</details>

## Break and Fix

### Scenario A: Policy Conflict

Assign two conflicting policies at different levels: one requiring tag "Environment=Production" at mg-production and another requiring "Environment=Development" at mg-dev. Try to deploy a resource in a subscription under mg-dev. What happens when contradictory policies exist at different levels?

### Scenario B: Orphaned Subscription

Remove your subscription from all custom management groups. Where does it appear? (Answer: It returns to the Tenant Root Group.) How do you find subscriptions that are not in any custom management group?

### Scenario C: Locked Out

Assign a Deny RBAC assignment at a management group scope. What happens to users who previously had access through subscription-level assignments? How do deny assignments interact with allow assignments?

## Knowledge Check

<details>
<summary>1. How many levels deep can management groups be nested?</summary>

Management groups support **6 levels of depth** below the Tenant Root Group. The Tenant Root Group itself is level 0, so the total hierarchy can be 7 levels (root + 6).

</details>

<details>
<summary>2. What happens to policies when you move a subscription between management groups?</summary>

When a subscription is moved, it **immediately loses** policies from the old management group and **inherits** policies from the new management group hierarchy. Existing non-compliant resources are not automatically remediated but will be flagged in the next compliance evaluation.

</details>

<details>
<summary>3. Can you move the Tenant Root Group or rename it?</summary>

The **Tenant Root Group cannot be moved or deleted**. It can be renamed (display name only) by a user with Owner or User Access Administrator role at that scope. Its ID is always the tenant ID.

</details>

<details>
<summary>4. Who can create management groups by default?</summary>

By default, **any user** in the Entra ID tenant can create management groups. This can be restricted so that only users with Owner, Contributor, or Management Group Contributor role at the parent scope can create them. This setting is configured at the Tenant Root Group level.

</details>

## Cleanup

```bash
# Remove subscription from custom MG (returns to Tenant Root Group)
SUB_ID=$(az account show --query id -o tsv)
az account management-group subscription remove \
  --name "mg-sandbox" \
  --subscription $SUB_ID 2>/dev/null

# Remove policy assignment
az policy assignment delete \
  --name "require-env-tag-prod" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-production" 2>/dev/null

# Remove RBAC assignment (replace USER_ID)
# az role assignment delete --assignee "$USER_ID" --scope "/providers/Microsoft.Management/managementGroups/mg-contoso"

# Delete management groups (bottom-up order required)
az account management-group delete --name "mg-sandbox" 2>/dev/null
az account management-group delete --name "mg-dev" 2>/dev/null
az account management-group delete --name "mg-nonproduction" 2>/dev/null
az account management-group delete --name "mg-prod-it" 2>/dev/null
az account management-group delete --name "mg-prod-finance" 2>/dev/null
az account management-group delete --name "mg-production" 2>/dev/null
az account management-group delete --name "mg-contoso" 2>/dev/null

echo "Cleanup complete."
```

## Learning Resources

- [Organize resources with management groups](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)
- [Create management groups](https://learn.microsoft.com/en-us/azure/governance/management-groups/create-management-group-portal)
- [Azure Policy overview](https://learn.microsoft.com/en-us/azure/governance/policy/overview)
- [Organize subscriptions into management groups](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-setup-guide/organize-resources)
- [Move subscriptions between management groups](https://learn.microsoft.com/en-us/azure/governance/management-groups/manage)
