---
sidebar_position: 6
title: "Challenge 06: Design Authorization for Azure Resources"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 06: Design Authorization for Azure Resources

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $0-5 | **Exam Weight: 25-30%**

:::

## Introduction

Fabrikam Inc. is a software company with 200 engineers organized into 5 product teams. They operate a mature Azure environment with the following structure:
- 3 subscriptions: Development, Staging, Production
- 15 resource groups per subscription (3 per product team: compute, data, networking)
- Shared services resource group in each subscription (managed by the platform team)

The current access model is broken: most engineers have Contributor on the entire Development subscription, three team leads have Owner on Production (accumulated over time without review), and there is no way to grant temporary elevated access for incident response. Last month, a junior developer accidentally deleted a production database because they had unnecessary Contributor access granted during an earlier escalation that was never revoked.

The CTO has mandated a zero-trust authorization model: least privilege by default, just-in-time elevation when needed, and no standing production access for any engineer. Your task is to design and partially implement this model.

## Exam Skills Covered

- Recommend a solution for authorizing access to Azure resources
- Recommend an identity management solution
- Recommend a solution for managing compliance

## Design Tasks

### Part 1: RBAC Scope Hierarchy Design

1. Design the RBAC scope hierarchy for Fabrikam:

```
Management Group (Fabrikam Root)
  |-- Subscription: Development
  |     |-- RG: team-alpha-compute-dev
  |     |-- RG: team-alpha-data-dev
  |     |-- RG: shared-services-dev
  |-- Subscription: Staging
  |-- Subscription: Production
        |-- RG: team-alpha-compute-prod
        |-- RG: shared-services-prod
```

2. Determine at which scope each role assignment should be made:
   - Platform team (full infrastructure management across all subscriptions)
   - Product team engineers (read/write within their team's resource groups only)
   - On-call engineers (temporary elevated access to production during incidents)
   - Security auditors (read-only access across all subscriptions)
   - Cost analysts (read-only access to billing and cost data only)

### Part 2: Custom Role Design

3. Design a custom RBAC role for product team engineers that allows:
   - Deploy and manage App Services, Functions, and Container Apps
   - Read and write to their team's Azure SQL databases
   - View (but not modify) networking resources
   - Cannot delete resource groups
   - Cannot modify RBAC assignments
   - Cannot access Key Vault secrets (separate role for that)

4. Design a custom role for "Incident Responder" that provides:
   - Restart any compute resource (VMs, App Services, AKS)
   - View all resource configurations and logs
   - Scale up/out compute resources
   - Cannot modify data or delete resources
   - Cannot change networking or security configurations

### Part 3: Attribute-Based Access Control (ABAC)

5. Design ABAC conditions for storage account access:
   - Engineers can only access blobs in containers tagged with their team name
   - Production data containers can only be accessed by users with a specific attribute (e.g., `department = "platform-engineering"`)
   - All access must be scoped to specific blob index tag matches

6. Implement one ABAC condition using Azure CLI that restricts blob access based on container name or blob index tags.

### Part 4: Just-in-Time Access Design

7. Design the just-in-time (JIT) access workflow for production incidents:
   - Who can request elevated access?
   - What roles are available for elevation?
   - Who approves the request?
   - Maximum duration of elevated access?
   - What audit trail is generated?

8. Integrate PIM for Azure Resources with the RBAC design:
   - Eligible assignments for production Contributor role
   - Activation requirements (MFA, justification, approval)
   - Maximum active duration (4 hours for incidents)
   - Alert configuration when any production role is activated

### Part 5: Deny Assignments and Resource Locks

9. Design deny assignments and resource locks for critical resources:
   - Prevent any user (including Owners) from deleting the production SQL Server
   - Prevent modification of networking security groups in production
   - Allow only the platform team to modify resource locks

10. Implement resource locks and a deny assignment (or document why deny assignments are limited to managed applications).

### Part 6: Implement Proof of Concept

11. Create a custom RBAC role definition for the "Product Team Engineer" role.

12. Create a role assignment at the resource group scope for a test user.

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-06"
  items={[
    "RBAC scope hierarchy documented with appropriate assignment levels for each user category",
    "Custom role definitions created for Product Team Engineer and Incident Responder",
    "ABAC conditions designed for storage account access with team-based restrictions",
    "Just-in-time access workflow documented with PIM integration for production roles",
    "Resource lock strategy designed for critical production resources",
    "At least one custom role deployed and role assignment verified"
  ]}
/>

## Hints

<details>
<summary>Hint 1: RBAC Scope Best Practices</summary>

Assign roles at the narrowest scope that meets the requirement:
- **Management Group**: Organization-wide policies (Security Reader for auditors)
- **Subscription**: Environment-wide access (Platform team Contributor on Dev)
- **Resource Group**: Team-scoped access (Engineers on their team's RGs)
- **Resource**: Single-resource access (rarely needed, hard to manage at scale)

Key principles:
- Roles assigned at parent scopes are inherited by all children
- You cannot override an inherited Allow with a Deny at a lower scope (unless using deny assignments)
- Use groups for role assignments, never individual users
- Name convention for groups: `rbac-{scope}-{role}` (e.g., `rbac-prod-reader`)

</details>

<details>
<summary>Hint 2: Creating Custom Roles</summary>

```bash
# Create custom role definition JSON
cat << 'EOF' > product-team-engineer.json
{
  "Name": "Product Team Engineer",
  "IsCustom": true,
  "Description": "Deploy and manage application resources without infrastructure modification rights",
  "Actions": [
    "Microsoft.Web/sites/*",
    "Microsoft.Web/serverFarms/*",
    "Microsoft.App/containerApps/*",
    "Microsoft.App/managedEnvironments/read",
    "Microsoft.Sql/servers/databases/*",
    "Microsoft.Network/*/read",
    "Microsoft.Resources/subscriptions/resourceGroups/read",
    "Microsoft.Insights/alertRules/*",
    "Microsoft.Insights/metrics/read",
    "Microsoft.Insights/diagnosticSettings/*"
  ],
  "NotActions": [
    "Microsoft.Resources/subscriptions/resourceGroups/delete",
    "Microsoft.Authorization/roleAssignments/*",
    "Microsoft.Authorization/roleDefinitions/*",
    "Microsoft.KeyVault/vaults/secrets/*"
  ],
  "DataActions": [
    "Microsoft.Sql/servers/databases/data/*"
  ],
  "NotDataActions": [],
  "AssignableScopes": [
    "/subscriptions/{dev-subscription-id}",
    "/subscriptions/{staging-subscription-id}"
  ]
}
EOF

# Create the custom role
az role definition create --role-definition product-team-engineer.json

# Assign the role to a group at resource group scope
az role assignment create \
  --assignee-object-id $(az ad group show -g "team-alpha-engineers" --query id -o tsv) \
  --role "Product Team Engineer" \
  --scope "/subscriptions/{sub-id}/resourceGroups/team-alpha-compute-dev"
```

</details>

<details>
<summary>Hint 3: ABAC Conditions for Storage</summary>

Azure ABAC (Attribute-Based Access Control) adds conditions to role assignments. Conditions use `@Resource` and `@Principal` attributes:

```bash
# Assign Storage Blob Data Reader with ABAC condition
# Condition: User can only read blobs in containers matching their team tag
az role assignment create \
  --assignee-object-id "<user-or-group-id>" \
  --role "Storage Blob Data Reader" \
  --scope "/subscriptions/{sub}/resourceGroups/rg-data/providers/Microsoft.Storage/storageAccounts/stfabrikamdata" \
  --condition "((!(ActionMatches{'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read'})) OR (@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringEquals 'team-alpha-data'))" \
  --condition-version "2.0"
```

ABAC conditions can reference:
- Container name: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name]`
- Blob index tags: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers/blobs/tags:Project<$key_case_sensitive$>]`
- Environment attributes (preview): `@Environment[isPrivateLink]`

Conditions support: `StringEquals`, `StringNotEquals`, `StringLike`, `StringStartsWith`, and boolean operators (`AND`, `OR`, `NOT`).

</details>

<details>
<summary>Hint 4: Resource Locks</summary>

Resource locks prevent accidental deletion or modification:

```bash
# Create a CanNotDelete lock on production SQL Server
az lock create \
  --name "protect-prod-sql" \
  --resource-group rg-team-alpha-data-prod \
  --resource-name sql-fabrikam-prod \
  --resource-type Microsoft.Sql/servers \
  --lock-type CanNotDelete \
  --notes "Critical production database - requires platform team approval for removal"

# Create a ReadOnly lock on production NSG
az lock create \
  --name "protect-prod-nsg" \
  --resource-group rg-shared-networking-prod \
  --resource-name nsg-prod-default \
  --resource-type Microsoft.Network/networkSecurityGroups \
  --lock-type ReadOnly \
  --notes "Network security - change requires CAB approval"
```

Important: Lock management permissions:
- Creating/deleting locks requires `Microsoft.Authorization/locks/*` actions
- Only Owner and User Access Administrator have this by default
- You can create a custom role that denies `Microsoft.Authorization/locks/delete` to prevent lock removal

Note: Deny assignments cannot be created directly by users. They are only created by Azure Blueprints and Azure Managed Applications to protect managed resources.

</details>

<details>
<summary>Hint 5: PIM for Azure Resources</summary>

PIM for Azure Resources enables just-in-time access at any RBAC scope:

1. **Make roles eligible (not active):**
   - On-call engineers get "eligible" Contributor on production resource groups
   - They see the role in PIM portal but cannot use it until activated

2. **Activation requirements:**
   - MFA required
   - Justification text (linked to incident ticket)
   - Approval from platform team lead
   - Maximum duration: 4 hours

3. **Monitoring:**
   - Alert fires when any production role is activated
   - Audit log captures who activated, when, justification, and approver
   - Access automatically expires after the configured duration

Configure in Portal: Entra ID > Privileged Identity Management > Azure Resources > Select subscription/RG > Roles > Settings

</details>

## Learning Resources

- [Azure RBAC overview](https://learn.microsoft.com/en-us/azure/role-based-access-control/overview)
- [Custom roles for Azure resources](https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles)
- [Azure ABAC conditions](https://learn.microsoft.com/en-us/azure/role-based-access-control/conditions-overview)
- [Resource locks](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources)
- [PIM for Azure resources](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-resource-roles-assign-roles)
- [Deny assignments in Azure](https://learn.microsoft.com/en-us/azure/role-based-access-control/deny-assignments)
- [Best practices for Azure RBAC](https://learn.microsoft.com/en-us/azure/role-based-access-control/best-practices)

## Knowledge Check

<details>
<summary>1. A junior developer needs to deploy App Services in their team's development resource group but should not be able to delete the resource group or modify networking resources. The built-in Contributor role is too broad. What should you recommend?</summary>

**Create a custom RBAC role** scoped to the development subscription that includes `Microsoft.Web/sites/*` and `Microsoft.Web/serverFarms/*` in Actions, while explicitly excluding `Microsoft.Resources/subscriptions/resourceGroups/delete` and `Microsoft.Network/*/write` in NotActions. Custom roles allow you to craft least-privilege access that matches exactly what the engineer needs. Assign this role at the resource group scope (not subscription) to limit the blast radius.

</details>

<details>
<summary>2. Fabrikam wants to prevent any user, including subscription Owners, from deleting the production SQL Server. What mechanisms achieve this?</summary>

**Use a CanNotDelete resource lock** on the SQL Server resource. Resource locks apply to all users regardless of their RBAC role (even Owners cannot delete a locked resource without first removing the lock). To prevent unauthorized lock removal, restrict `Microsoft.Authorization/locks/delete` permission to only the platform team by ensuring other roles do not include this action. Note: Deny assignments are created only by Azure Blueprints and Managed Applications; they cannot be manually created by administrators.

</details>

<details>
<summary>3. Five product teams each need access to their own storage containers but must not see other teams' data. All containers are in the same storage account. How should you design access control?</summary>

**Use ABAC conditions on role assignments.** Assign the "Storage Blob Data Contributor" role to each team group at the storage account scope, but add a condition restricting access to containers named with their team prefix (e.g., `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringStartsWith 'team-alpha-'`). This avoids creating five separate storage accounts or using complex SAS token management. Each team sees only their containers despite sharing the same account.

</details>

<details>
<summary>4. During a production incident, an on-call engineer needs Contributor access to a production resource group for up to 4 hours. How should this be designed to maintain least privilege?</summary>

**Use PIM for Azure Resources with eligible role assignments.** Configure the production Contributor role as "eligible" (not permanently active) for on-call engineers. When an incident occurs, the engineer activates the role through PIM, providing justification and an incident ticket number. Set maximum activation duration to 4 hours with automatic expiration. Require MFA for activation and optionally require approval from a platform team lead. This provides just-in-time, time-bounded, audited access with no standing privileges.

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge06 --location eastus
```

2. Create a custom RBAC role definition scoped to the resource group:

```bash
SUB_ID=$(az account show --query id -o tsv)
az role definition create --role-definition '{
  "Name": "AZ305 Lab Operator",
  "Description": "Custom role for challenge 06 - read compute and restart VMs only",
  "Actions": [
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Compute/virtualMachines/start/action",
    "Microsoft.Compute/virtualMachines/restart/action",
    "Microsoft.Resources/subscriptions/resourceGroups/read"
  ],
  "NotActions": [],
  "AssignableScopes": [
    "/subscriptions/'"$SUB_ID"'/resourceGroups/rg-az305-challenge06"
  ]
}'
```

3. Verify the custom role was created:

```bash
az role definition list \
  --custom-role-only true \
  --query "[?roleName=='AZ305 Lab Operator'].{name:roleName, id:name}" -o table
```

4. List the permissions assigned to the role:

```bash
az role definition list \
  --name "AZ305 Lab Operator" \
  --query "[0].permissions[0].actions" -o tsv
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az role definition delete --name "AZ305 Lab Operator"
az group delete --name rg-az305-challenge06 --yes --no-wait
```

---

**Next**: [Challenge 07: Design Authorization for On-Premises Resources](/docs/az-305/identity-governance-monitoring/challenge-07)
