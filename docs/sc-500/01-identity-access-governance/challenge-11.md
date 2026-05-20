---
sidebar_position: 11
title: "Challenge 11: RBAC and Governance"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 11: RBAC and Governance

## Exam skills covered

- Design and implement Azure RBAC role assignments
- Create and manage custom RBAC role definitions
- Identify and remediate overprivileged access
- Implement governance with management groups
- Configure deny assignments and resource locks
- Use access reviews and Entra ID Governance for RBAC lifecycle

## Scenario

Contoso Ltd's Azure environment has grown to 50+ subscriptions across 4 business units. A security audit revealed that 40% of role assignments grant more permissions than necessary — users have Owner or Contributor when they only need specific resource access. The governance team must implement a least-privilege RBAC strategy using custom roles, management group hierarchies, and automated access reviews to remediate overprivilege and prevent future drift.

---

## Prerequisites

- Azure subscription with Owner role (for role assignment management)
- User Access Administrator role at management group scope (for custom roles)
- Azure CLI installed and authenticated
- Microsoft Entra ID P2 (for access reviews)

---

## Task 1: Audit existing role assignments for overprivilege

Analyze current RBAC assignments to identify excessive permissions and potential security risks.

```bash
# Set variables
SUB_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-rbac-lab"
LOCATION="eastus2"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# List all Owner and Contributor assignments at subscription level
az role assignment list --scope "/subscriptions/$SUB_ID" \
  --query "[?roleDefinitionName=='Owner' || roleDefinitionName=='Contributor'].{principal:principalName, role:roleDefinitionName, type:principalType, scope:scope}" -o table

# Count role assignments by role type
az role assignment list --all --query "[].roleDefinitionName" -o tsv | sort | uniq -c | sort -rn | head -20

# Find users with multiple high-privilege assignments
az role assignment list --all \
  --query "[?roleDefinitionName=='Owner' || roleDefinitionName=='Contributor' || roleDefinitionName=='User Access Administrator'].{principal:principalName, role:roleDefinitionName, scope:scope}" -o table

# Identify role assignments to individual users (should be groups)
az role assignment list --all \
  --query "[?principalType=='User'].{user:principalName, role:roleDefinitionName, scope:scope}" -o table | head -30

# Find stale assignments (service principals that no longer exist)
az role assignment list --all \
  --query "[?principalType=='ServicePrincipal' && principalName==''].{id:id, role:roleDefinitionName, scope:scope}" -o table

# Check for classic administrators (legacy)
az role assignment list --include-classic-administrators \
  --query "[?contains(roleDefinitionName,'CoAdministrator') || contains(roleDefinitionName,'ServiceAdministrator')].{principal:principalName, role:roleDefinitionName}" -o table
```

## Task 2: Create custom RBAC roles for least privilege

Design custom roles that provide exactly the permissions needed for common job functions.

```bash
# Custom Role: Key Vault Secret Reader (more restrictive than built-in)
az role definition create --role-definition '{
  "Name": "Contoso Key Vault Secret Reader",
  "Description": "Can read secrets from Key Vault but cannot list or manage them",
  "Actions": [],
  "NotActions": [],
  "DataActions": [
    "Microsoft.KeyVault/vaults/secrets/getSecret/action"
  ],
  "NotDataActions": [
    "Microsoft.KeyVault/vaults/secrets/setSecret/action",
    "Microsoft.KeyVault/vaults/secrets/delete"
  ],
  "AssignableScopes": ["/subscriptions/'"$SUB_ID"'"]
}'

# Custom Role: Network Viewer (read network config without management access)
az role definition create --role-definition '{
  "Name": "Contoso Network Viewer",
  "Description": "Can view network configurations including NSGs, route tables, and VNets",
  "Actions": [
    "Microsoft.Network/virtualNetworks/read",
    "Microsoft.Network/networkSecurityGroups/read",
    "Microsoft.Network/networkSecurityGroups/securityRules/read",
    "Microsoft.Network/routeTables/read",
    "Microsoft.Network/routeTables/routes/read",
    "Microsoft.Network/publicIPAddresses/read",
    "Microsoft.Network/networkInterfaces/read",
    "Microsoft.Network/privateEndpoints/read",
    "Microsoft.Network/privateDnsZones/read"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": ["/subscriptions/'"$SUB_ID"'"]
}'

# Custom Role: App Service Deployer (deploy without full Contributor)
az role definition create --role-definition '{
  "Name": "Contoso App Deployer",
  "Description": "Can deploy to App Service and manage application settings without infrastructure changes",
  "Actions": [
    "Microsoft.Web/sites/read",
    "Microsoft.Web/sites/config/read",
    "Microsoft.Web/sites/config/write",
    "Microsoft.Web/sites/config/list/action",
    "Microsoft.Web/sites/publishxml/action",
    "Microsoft.Web/sites/restart/action",
    "Microsoft.Web/sites/slots/read",
    "Microsoft.Web/sites/slots/config/read",
    "Microsoft.Web/sites/slots/config/write",
    "Microsoft.Web/sites/slots/restart/action",
    "Microsoft.Web/sites/slots/slotsswap/action",
    "Microsoft.Web/sites/extensions/write",
    "Microsoft.Web/sites/deployments/read",
    "Microsoft.Web/sites/deployments/write"
  ],
  "NotActions": [
    "Microsoft.Web/sites/delete",
    "Microsoft.Web/sites/write"
  ],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": ["/subscriptions/'"$SUB_ID"'"]
}'

# List custom roles in the subscription
az role definition list --custom-role-only true \
  --query "[].{name:roleName, type:roleType}" -o table
```

## Task 3: Implement role assignments using security groups

Migrate individual user assignments to group-based assignments for better governance.

```bash
# Create security groups for common roles
az ad group create \
  --display-name "Azure-Readers-Production" \
  --mail-nickname "azure-readers-prod" \
  --description "Members get Reader access to production subscription"

az ad group create \
  --display-name "Azure-AppDeployers-Production" \
  --mail-nickname "azure-deployers-prod" \
  --description "Members can deploy to production App Services"

az ad group create \
  --display-name "Azure-NetworkViewers" \
  --mail-nickname "azure-network-viewers" \
  --description "Members can view network configurations"

# Get group IDs
READERS_GROUP_ID=$(az ad group show --group "Azure-Readers-Production" --query id -o tsv)
DEPLOYERS_GROUP_ID=$(az ad group show --group "Azure-AppDeployers-Production" --query id -o tsv)
NETWORK_GROUP_ID=$(az ad group show --group "Azure-NetworkViewers" --query id -o tsv)

# Assign roles to groups instead of individual users
az role assignment create \
  --assignee-object-id $READERS_GROUP_ID \
  --assignee-principal-type Group \
  --role "Reader" \
  --scope "/subscriptions/$SUB_ID"

az role assignment create \
  --assignee-object-id $DEPLOYERS_GROUP_ID \
  --assignee-principal-type Group \
  --role "Contoso App Deployer" \
  --scope "/subscriptions/$SUB_ID"

az role assignment create \
  --assignee-object-id $NETWORK_GROUP_ID \
  --assignee-principal-type Group \
  --role "Contoso Network Viewer" \
  --scope "/subscriptions/$SUB_ID"

# Add users to groups (instead of direct role assignment)
USER_ID=$(az ad user show --id "developer@contoso.com" --query id -o tsv 2>/dev/null || echo "placeholder")
# az ad group member add --group $DEPLOYERS_GROUP_ID --member-id $USER_ID

# Remove old individual assignments (after verifying group membership)
# az role assignment delete --assignee "developer@contoso.com" --role "Contributor" --scope "/subscriptions/$SUB_ID"
```

## Task 4: Remediate overprivileged service principals

Identify and reduce permissions for service principals with excessive access.

```bash
# Find service principals with Owner or Contributor at subscription level
az role assignment list --all \
  --query "[?principalType=='ServicePrincipal' && (roleDefinitionName=='Owner' || roleDefinitionName=='Contributor')].{principal:principalName, role:roleDefinitionName, scope:scope}" -o table

# For each overprivileged SP, analyze what it actually needs
# Example: An automation SP with Contributor that only manages storage
# Step 1: Check the SP's activity in activity logs
# az monitor activity-log list --caller "SP_APP_ID" --offset 30d --query "[].{operation:operationName.value, time:eventTimestamp}" -o table

# Step 2: Replace broad role with specific role
# Remove Contributor
# az role assignment delete --assignee "SP_OBJECT_ID" --role "Contributor" --scope "/subscriptions/$SUB_ID"

# Add specific role
# az role assignment create --assignee-object-id "SP_OBJECT_ID" --assignee-principal-type ServicePrincipal --role "Storage Blob Data Contributor" --scope "/subscriptions/$SUB_ID/resourceGroups/rg-storage"

# Find orphaned role assignments (principal deleted but assignment remains)
ORPHANED=$(az role assignment list --all --query "[?principalName=='' || principalName==null].id" -o tsv)
echo "Found $(echo $ORPHANED | wc -w) orphaned assignments"

# Clean up orphaned assignments
for ASSIGNMENT_ID in $ORPHANED; do
  az role assignment delete --ids "$ASSIGNMENT_ID"
  echo "Removed orphaned assignment: $ASSIGNMENT_ID"
done
```

## Task 5: Implement conditions on role assignments (ABAC)

Use Azure attribute-based access control to add conditions to role assignments for fine-grained control.

```bash
# Create a role assignment with conditions (ABAC)
# Example: Storage Blob Data Reader, but only for blobs with specific tags

# Create a storage account for testing
STORAGE_NAME="stcontosoabac$(openssl rand -hex 4)"
az storage account create \
  --name $STORAGE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --sku Standard_LRS \
  --allow-blob-public-access false

STORAGE_ID=$(az storage account show --name $STORAGE_NAME --resource-group $RG_NAME --query id -o tsv)

# Create a conditional role assignment
# Only allow reading blobs tagged with "Department=Marketing"
USER_OBJ_ID=$(az ad signed-in-user show --query id -o tsv)

az role assignment create \
  --assignee-object-id $USER_OBJ_ID \
  --assignee-principal-type User \
  --role "Storage Blob Data Reader" \
  --scope $STORAGE_ID \
  --condition "((!(ActionMatches{'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read'} AND NOT SubOperationMatches{'Blob.List'})) OR (@Resource[Microsoft.Storage/storageAccounts/blobServices/containers/blobs/tags:Department<\$key_case_sensitive\$>] StringEquals 'Marketing'))" \
  --condition-version "2.0"

# Create a role assignment scoped to a specific resource group only
az role assignment create \
  --assignee-object-id $DEPLOYERS_GROUP_ID \
  --assignee-principal-type Group \
  --role "Contributor" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME"

# Verify conditional assignments
az role assignment list --scope $STORAGE_ID \
  --query "[?condition!=null].{principal:principalName, role:roleDefinitionName, condition:condition}" -o table
```

## Task 6: Configure access reviews for RBAC governance

Set up periodic reviews of role assignments to identify and remove stale access.

```bash
# Create an access review for subscription-level Owner role assignments
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions" \
  --headers "Content-Type=application/json" \
  --body "{
    \"displayName\": \"Azure Subscription Owner Review - Monthly\",
    \"descriptionForAdmins\": \"Monthly review of Owner role assignments on production subscriptions\",
    \"descriptionForReviewers\": \"Confirm these users/groups still need Owner access to Azure subscriptions\",
    \"scope\": {
      \"@odata.type\": \"#microsoft.graph.accessReviewQueryScope\",
      \"query\": \"/roleManagement/azure/roleAssignments?\$filter=roleDefinitionId eq 'Owner'\",
      \"queryType\": \"MicrosoftGraph\"
    },
    \"reviewers\": [
      {
        \"query\": \"./manager\",
        \"queryType\": \"MicrosoftGraph\"
      }
    ],
    \"settings\": {
      \"mailNotificationsEnabled\": true,
      \"reminderNotificationsEnabled\": true,
      \"justificationRequiredOnApproval\": true,
      \"defaultDecisionEnabled\": true,
      \"defaultDecision\": \"Deny\",
      \"instanceDurationInDays\": 14,
      \"autoApplyDecisionsEnabled\": true,
      \"recommendationsEnabled\": true,
      \"recurrence\": {
        \"pattern\": {
          \"type\": \"absoluteMonthly\",
          \"interval\": 1
        },
        \"range\": {
          \"type\": \"noEnd\",
          \"startDate\": \"2025-01-01\"
        }
      }
    }
  }" 2>/dev/null || echo "Access review creation requires Entra ID P2 license"

# List existing access reviews
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions" \
  --headers "Content-Type=application/json" \
  --query "value[].{name:displayName, status:status}" -o table 2>/dev/null

# Check for recommendations on role assignments that should be removed
# (based on sign-in activity and role usage)
echo "=== Overprivilege Remediation Checklist ==="
echo "1. Replace Owner with Contributor where full control is not needed"
echo "2. Replace Contributor with specific roles (e.g., 'Storage Blob Data Contributor')"
echo "3. Move individual assignments to group-based assignments"
echo "4. Use PIM for time-bound elevated access"
echo "5. Remove orphaned assignments from deleted principals"
```

---

## Break & Fix

### Scenario 1: Custom role assignment fails with "Role definition not found"

A team attempts to assign the custom "Contoso App Deployer" role in a different subscription but receives an error that the role definition doesn't exist.

<details>
<summary>Show solution</summary>

```bash
# Check the assignable scopes of the custom role
az role definition list --custom-role-only true \
  --name "Contoso App Deployer" \
  --query "[].assignableScopes"

# The issue: Custom roles are only available in their assignable scopes
# If created at subscription scope, they're only available in that subscription

# Fix: Update the role to include additional subscriptions or use management group scope
az role definition update --role-definition '{
  "Name": "Contoso App Deployer",
  "AssignableScopes": [
    "/subscriptions/'"$SUB_ID"'",
    "/subscriptions/SECOND-SUB-ID"
  ]
}'

# Better fix: Define at management group level for organization-wide availability
# az role definition update --role-definition '{
#   "Name": "Contoso App Deployer",
#   "AssignableScopes": ["/providers/Microsoft.Management/managementGroups/contoso-root"]
# }'

# Verify the role is now visible in the target scope
az role definition list --custom-role-only true \
  --query "[?roleName=='Contoso App Deployer'].{name:roleName, scopes:assignableScopes}" -o json
```

</details>

### Scenario 2: User has the correct role but still gets "AuthorizationFailed"

A user assigned "Contoso Key Vault Secret Reader" receives authorization errors when trying to read secrets, despite the role being correctly assigned.

<details>
<summary>Show solution</summary>

```bash
# Check the role assignment scope vs. the resource scope
az role assignment list --assignee "user@contoso.com" \
  --query "[?contains(roleDefinitionName,'Key Vault')].{role:roleDefinitionName, scope:scope}" -o table

# Common issues:
# 1. Role assigned at wrong scope (subscription but resource is in different sub)
# 2. Key Vault uses access policies instead of RBAC
KV_RBAC=$(az keyvault show --name "target-vault" --query "properties.enableRbacAuthorization" -o tsv 2>/dev/null)
echo "Key Vault RBAC enabled: $KV_RBAC"

# 3. Custom role has wrong DataActions (missing the getSecret action path)
az role definition list --name "Contoso Key Vault Secret Reader" \
  --query "[].{dataActions:permissions[0].dataActions, notDataActions:permissions[0].notDataActions}" -o json

# Fix: The role might need the full action path
az role definition update --role-definition '{
  "Name": "Contoso Key Vault Secret Reader",
  "DataActions": [
    "Microsoft.KeyVault/vaults/secrets/getSecret/action",
    "Microsoft.KeyVault/vaults/secrets/readMetadata/action"
  ],
  "AssignableScopes": ["/subscriptions/'"$SUB_ID"'"]
}'

# 4. There might be a deny assignment blocking access
az role assignment list --assignee "user@contoso.com" --all --include-inherited \
  --query "[?roleDefinitionName==null || contains(roleDefinitionName,'deny')]" -o table

# 5. Propagation delay - RBAC changes can take up to 5 minutes
echo "Wait 5 minutes for RBAC propagation and retry"
```

</details>

### Scenario 3: Cannot remove Owner role - "Cannot delete the last owner"

The team wants to remove the last remaining direct Owner assignment from a subscription (all access should go through PIM), but Azure prevents it.

<details>
<summary>Show solution</summary>

```bash
# Azure requires at least one active Owner on every subscription
# You cannot remove the last Owner assignment

# Solution: Use a break-glass approach
# 1. Create a security group as the emergency Owner
BREAKGLASS_GROUP_ID=$(az ad group create \
  --display-name "Azure-Emergency-Owners" \
  --mail-nickname "azure-emergency-owners" \
  --description "Break-glass Owner access - monitor via access reviews" \
  --query id -o tsv)

# 2. Assign Owner to the group (satisfies the "at least one owner" requirement)
az role assignment create \
  --assignee-object-id $BREAKGLASS_GROUP_ID \
  --assignee-principal-type Group \
  --role "Owner" \
  --scope "/subscriptions/$SUB_ID"

# 3. Now remove the individual Owner assignment
# az role assignment delete --assignee "individual@contoso.com" --role "Owner" --scope "/subscriptions/$SUB_ID"

# 4. Keep the group membership empty (or add only break-glass accounts)
# Access is managed through PIM eligible assignments

# 5. Set up monitoring on this group
echo "Configure:"
echo "- Access review on the Azure-Emergency-Owners group (quarterly)"
echo "- Alert on any group membership changes"
echo "- PIM eligible assignment for Owner through the group"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Contoso wants a custom role that allows deploying code to App Services but prevents deleting or creating new App Service resources. Which permission configuration achieves this?",
    options: [
      "Actions: Microsoft.Web/sites/* with NotActions: Microsoft.Web/sites/delete, Microsoft.Web/sites/write",
      "Actions: Microsoft.Web/sites/read with NotActions: none",
      "Actions: Contributor with NotActions: Microsoft.Web/*",
      "DataActions: Microsoft.Web/sites/deployments/write"
    ],
    correctIndex: 0,
    explanation: "Using Microsoft.Web/sites/* in Actions grants all sub-operations on existing sites, while NotActions for delete and write (create/update the resource itself) prevents infrastructure changes. This allows deployment operations (config write, restart, slot swap) while blocking destructive actions."
  },
  {
    question: "An organization has role assignments to individual users scattered across 50 subscriptions. What is the recommended approach to improve governance?",
    options: [
      "Create Azure Policy to audit individual role assignments",
      "Migrate to group-based role assignments managed through Entra ID groups with access reviews",
      "Remove all individual assignments and use PIM exclusively",
      "Create a management group and assign roles only at that level"
    ],
    correctIndex: 1,
    explanation: "Group-based role assignments centralize access management in Entra ID groups, which can be governed through access reviews, dynamic membership rules, and group lifecycle policies. This reduces the total number of role assignments and makes auditing, onboarding, and offboarding significantly easier."
  },
  {
    question: "What is the maximum number of custom role definitions allowed per Microsoft Entra ID tenant?",
    options: [
      "500",
      "2000",
      "5000",
      "Unlimited"
    ],
    correctIndex: 2,
    explanation: "Each Microsoft Entra ID tenant can have up to 5000 custom role definitions. Custom roles can be scoped to management groups, subscriptions, or resource groups. Planning role definitions carefully and using parameterized approaches helps stay within this limit."
  },
  {
    question: "An Azure RBAC role assignment was created 2 minutes ago, but the user still receives 'AuthorizationFailed'. The assignment is correct. What should be done?",
    options: [
      "Delete and recreate the assignment",
      "Escalate to Microsoft support as RBAC is broken",
      "Wait up to 10 minutes for RBAC propagation and have the user obtain a new token",
      "Assign an additional role to override the cache"
    ],
    correctIndex: 2,
    explanation: "Azure RBAC changes can take up to 10 minutes to propagate due to caching at the Azure Resource Manager layer. The user should also obtain a new token (re-authenticate) since their existing token may not reflect the new assignment. This is expected behavior, not a system failure."
  }
]} />

## Cleanup

```bash
# Delete custom role assignments
az role assignment delete --assignee $READERS_GROUP_ID --role "Reader" --scope "/subscriptions/$SUB_ID" 2>/dev/null
az role assignment delete --assignee $DEPLOYERS_GROUP_ID --role "Contoso App Deployer" --scope "/subscriptions/$SUB_ID" 2>/dev/null
az role assignment delete --assignee $NETWORK_GROUP_ID --role "Contoso Network Viewer" --scope "/subscriptions/$SUB_ID" 2>/dev/null

# Delete custom role definitions
az role definition delete --name "Contoso Key Vault Secret Reader" 2>/dev/null
az role definition delete --name "Contoso Network Viewer" 2>/dev/null
az role definition delete --name "Contoso App Deployer" 2>/dev/null

# Delete security groups
az ad group delete --group "Azure-Readers-Production" 2>/dev/null
az ad group delete --group "Azure-AppDeployers-Production" 2>/dev/null
az ad group delete --group "Azure-NetworkViewers" 2>/dev/null
az ad group delete --group "Azure-Emergency-Owners" 2>/dev/null
az ad group delete --group "KeyVault-CertificateOfficers" 2>/dev/null

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait
```
