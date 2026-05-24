---
sidebar_position: 2
title: "Challenge 02: RBAC & Access Management"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 02: RBAC & access Management

:::info Estimated Time and Cost

**45-60 min** | **Estimated cost**: Free | **Exam Weight: 20-25%**

:::

## Introduction

Now that Contoso Ltd. has users and groups in Entra ID, you need to control **who can do what** in Azure. The VP of Engineering just asked: "Why can the intern see our production subscription?" Time to lock things down with Role-Based Access Control.

RBAC is the gatekeeper of Azure. Every action | creating a VM, reading a storage account, deleting a resource group | is controlled by roles assigned to identities at specific scopes. Get this wrong, and you'll either block your team or expose your environment.

## Exam skills covered

- Manage built-in Azure roles
- Assign roles at different scopes (management group, subscription, resource group, resource)
- Interpret access assignments
- Create and assign custom roles
- Manage Microsoft Entra role assignments

## Sysadmin â†” Azure reference

| On-Prem / Sysadmin | Azure Equivalent | Notes |
|---------------------|------------------|-------|
| NTFS permissions (Full Control) | Owner role | Full access + can assign roles |
| NTFS permissions (Modify) | Contributor role | Full access but cannot assign roles |
| NTFS permissions (Read) | Reader role | View everything, change nothing |
| Domain Admins group | Owner at subscription scope | Broad administrative access |
| Delegated folder permissions | RBAC at resource group scope | Scoped access control |
| icacls / cacls | az role assignment | CLI-based permission management |
| "Deny" ACE in NTFS | Deny assignments | Explicit deny (rare, usually via Blueprints) |
| Custom delegation in AD | Custom RBAC roles | Granular permission definitions |

## Description

### Part 1: explore built-in roles

1. List the 4 fundamental built-in roles and understand what each one allows:
   - **Owner** | Full access to all resources + can assign roles to others
   - **Contributor** | Full access to all resources but cannot assign roles
   - **Reader** | View all resources but cannot make changes
   - **User Access Administrator** | Manage user access to Azure resources

2. Explore additional built-in roles relevant to the exam:
   - Virtual Machine Contributor
   - Storage Blob Data Reader
   - Network Contributor

### Part 2: assign roles at different scopes

:::warning

For these tasks, you'll need a resource group. Create one called `rg-az104-challenge02` in your subscription first.

:::
3. Create a resource group for this challenge:

```bash
az group create --name rg-az104-challenge02 --location eastus
```

4. Assign the **Reader** role to Alice at the **subscription** scope
5. Assign the **Contributor** role to the `IT-Team` group at the **resource group** scope (`rg-az104-challenge02`)
6. Assign the **Virtual Machine Contributor** role to Bob at the **resource group** scope

### Part 3: verify & interpret access

7. List all role assignments for Alice | she should have Reader at subscription level and (inherited via IT-Team) Contributor at resource group level
8. Check the effective access for Bob on the resource group
9. List all role assignments at the resource group scope

### Part 4: create a custom role

10. Create a custom role called `VM-Reader` with the following permissions:
    - **Allowed actions**: `Microsoft.Compute/virtualMachines/read`, `Microsoft.Compute/virtualMachines/instanceView/read`, `Microsoft.Network/networkInterfaces/read`
    - **Scope**: Your subscription
    - This role should only allow reading VM information, not modifying anything

11. Assign the `VM-Reader` custom role to Carol at the resource group scope

### Part 5: audit access

12. Generate a report of all role assignments in your subscription
13. Find all users with **Owner** role at any scope

## Success criteria

<SuccessChecklist
  storageKey="az104-challenge-02"
  items={[
    "Can explain the difference between the 4 fundamental built-in roles",
    "Alice has Reader role at subscription scope",
    "IT-Team group has Contributor role at resource group scope",
    "Bob has Virtual Machine Contributor role at resource group scope",
    "Custom role VM-Reader exists with read-only VM permissions",
    "Carol has the VM-Reader custom role assigned",
    "Can list and interpret role assignments using CLI or Portal"
  ]}
/>
## Hints

<details>
<summary>Hint 1: Listing built-in roles</summary>

<Tabs>
<TabItem value="cli" label="Azure CLI">

```bash
# List fundamental roles
az role definition list \
  --query "[?roleName=='Owner' || roleName=='Contributor' || roleName=='Reader' || roleName=='User Access Administrator'].{Name:roleName, Description:description}" \
  -o table

# See all actions for a specific role
az role definition list --name "Contributor" --query "[].{actions:permissions[0].actions, notActions:permissions[0].notActions}"
```

</TabItem>
<TabItem value="powershell" label="PowerShell">

```powershell
# List fundamental roles
Get-AzRoleDefinition | Where-Object {
  $_.Name -in @('Owner','Contributor','Reader','User Access Administrator')
} | Select-Object Name, Description | Format-Table

# See details for contributor
Get-AzRoleDefinition -Name "Contributor" | Select-Object -ExpandProperty Actions
```

</TabItem>
<TabItem value="portal" label="Portal">

1. Go to your **Subscription** â†’ **Access control (IAM)**
2. Click the **Roles** tab
3. Search for "Owner", "Contributor", "Reader"
4. Click any role â†’ **View** to see its permissions

</TabItem>
</Tabs>

</details>

<details>
<summary>Hint 2: Assigning roles at different scopes</summary>

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
ALICE_ID=$(az ad user show --id "alice@YOUR_TENANT.onmicrosoft.com" --query id -o tsv)

# Assign reader to alice at subscription scope
az role assignment create \
  --assignee $ALICE_ID \
  --role "Reader" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"

# Assign contributor to IT-Team at resource group scope
IT_GROUP_ID=$(az ad group show --group "IT-Team" --query id -o tsv)
az role assignment create \
  --assignee $IT_GROUP_ID \
  --role "Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-az104-challenge02"
```

</details>

<details>
<summary>Hint 3: Checking effective access</summary>

```bash
# List all role assignments for a specific user
az role assignment list --assignee "alice@YOUR_TENANT.onmicrosoft.com" -o table

# List all role assignments at a resource group
az role assignment list --resource-group rg-az104-challenge02 -o table

# List all role assignments in the subscription
az role assignment list --all -o table
```

</details>

<details>
<summary>Hint 4: Creating a custom role</summary>

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create a JSON definition for the custom role
cat <<EOF > vm-reader-role.json
{
  "Name": "VM-Reader",
  "Description": "Can view virtual machines and their instance details only",
  "Actions": [
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Compute/virtualMachines/instanceView/read",
    "Microsoft.Network/networkInterfaces/read"
  ],
  "NotActions": [],
  "AssignableScopes": [
    "/subscriptions/$SUBSCRIPTION_ID"
  ]
}
EOF

az role definition create --role-definition vm-reader-role.json
```

</details>

<details>
<summary>Hint 5: Finding all Owners in the subscription</summary>

```bash
# Find all owner assignments
az role assignment list --all --role "Owner" -o table

# More detailed output
az role assignment list --all --role "Owner" \
  --query "[].{Principal:principalName, Scope:scope, Type:principalType}" -o table
```

</details>

## Learning resources

- [Azure built-in roles](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles)
- [Assign Azure roles using Azure CLI](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli)
- [Create custom roles](https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles-cli)
- [Understand role definitions](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-definitions)
- [Understand scope for Azure RBAC](https://learn.microsoft.com/en-us/azure/role-based-access-control/scope-overview)

## Break & fix

After completing the challenge, try these troubleshooting scenarios:

1. **Permission escalation blocked**: Log in as Bob (who has VM Contributor) and try to assign the Reader role to another user on the resource group. What happens? What role does Bob need to assign roles?

2. **Conflicting permissions**: Assign Alice both **Reader** at the subscription scope and **Contributor** at the resource group scope. What is her effective access on the resource group? (RBAC is additive | she gets Contributor on that RG.)

3. **Mystery access denial**: Carol has the custom `VM-Reader` role but claims she can't see VMs in the Portal. Check:
   - Is the role assigned at the correct scope?
   - Does the role include `Microsoft.Resources/subscriptions/resourceGroups/read`?
   - Did you forget `Microsoft.Compute/virtualMachines/*/read` for sub-resources?

4. **Orphaned assignments**: Delete Alice's user account, then list role assignments. You'll see an assignment with an "Unknown" or "Identity not found" principal. How do you clean these up?

## Knowledge check

<details>
<summary>1. What is the key difference between Owner and Contributor?</summary>

The **Owner** role can do everything the **Contributor** can, plus it can **manage role assignments** (assign/remove roles for other users). The Contributor role explicitly has `Microsoft.Authorization/*/Write` and `Microsoft.Authorization/*/Delete` in its `NotActions`.

**Exam tip**: If a question asks "who can grant access to others?", the answer is **Owner** or **User Access Administrator**.

</details>

<details>
<summary>2. What is a deny assignment, and how is it different from NotActions?</summary>

**Deny assignments** are explicit blocks that prevent users from performing specific actions, even if a role grants them access. They take precedence over role assignments. Deny assignments can only be created by **Azure Blueprints** or **managed apps** | you cannot create them directly.

**NotActions** simply subtract permissions from the `Actions` list within a role definition. They don't explicitly deny anything | if another role grants the permission, the user still has it.

**Precedence order**: Explicit Deny â†’ NotActions â†’ Allow

</details>

<details>
<summary>3. How does role inheritance work across scopes?</summary>

RBAC uses a **hierarchy of scopes**:

```text
Management Group â†’ Subscription â†’ Resource Group â†’ Resource
```

A role assigned at a **higher scope** is inherited by all **lower scopes**. For example:
- Reader at the subscription level = Reader on every resource group and resource in that subscription
- Contributor at a resource group = Contributor on every resource in that group

**Permissions are additive** | if you have Reader at subscription and Contributor at a resource group, your effective access on that RG is Contributor (the most permissive combination).

</details>

<details>
<summary>4. How many custom roles can you create per tenant?</summary>

Each Microsoft Entra ID tenant can have up to **5,000 custom roles**. Custom roles can be scoped to one or more subscriptions or management groups within the tenant.

Custom roles work with all principal types (users, groups, service principals, and managed identities) without requiring any additional Entra ID licensing.

</details>

<details>
<summary>5. Can you assign RBAC roles to service principals and managed identities?</summary>

**Yes!** RBAC roles can be assigned to:
- **Users** (Entra ID members and guests)
- **Groups** (security groups and Microsoft 365 groups)
- **Service principals** (application registrations)
- **Managed identities** (system-assigned and user-assigned)

This is a common exam scenario: "Assign the Storage Blob Data Contributor role to a managed identity so an app can access blob storage without storing credentials."

</details>

## Cleanup

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
ALICE_ID=$(az ad user show --id "alice@YOUR_TENANT.onmicrosoft.com" --query id -o tsv 2>/dev/null)
BOB_ID=$(az ad user show --id "bob@YOUR_TENANT.onmicrosoft.com" --query id -o tsv 2>/dev/null)
CAROL_ID=$(az ad user show --id "carol@YOUR_TENANT.onmicrosoft.com" --query id -o tsv 2>/dev/null)
IT_GROUP_ID=$(az ad group show --group "IT-Team" --query id -o tsv 2>/dev/null)

# Remove role assignments
az role assignment delete --assignee $ALICE_ID --role "Reader" --scope "/subscriptions/$SUBSCRIPTION_ID" 2>/dev/null
az role assignment delete --assignee $IT_GROUP_ID --role "Contributor" --resource-group rg-az104-challenge02 2>/dev/null
az role assignment delete --assignee $BOB_ID --role "Virtual Machine Contributor" --resource-group rg-az104-challenge02 2>/dev/null
az role assignment delete --assignee $CAROL_ID --role "VM-Reader" --resource-group rg-az104-challenge02 2>/dev/null

# Delete the custom role
az role definition delete --name "VM-Reader" 2>/dev/null

# Delete the resource group
az group delete --name rg-az104-challenge02 --yes --no-wait

# Clean up temp files
rm -f vm-reader-role.json
```

---

**Next**: [Challenge 03 | Azure Policy & Governance](/docs/az-104/identity/challenge-03)
