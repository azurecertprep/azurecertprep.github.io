---
sidebar_label: "AZ-104 Solutions"
sidebar_position: 1
---

# 🎓 AZ-104 Coach's Guide — Complete Solutions

:::danger For Coaches & Facilitators Only
This document contains **complete solutions** for all 16 challenges. Students should attempt each challenge independently before consulting this guide. The learning happens in the struggle — if students jump straight to solutions, they won't retain the knowledge for the exam.

**How to use this guide:**
- Walk through the challenge with students first — let them hit walls
- Use the "Common Mistakes" sections to anticipate where students get stuck
- Share individual hints from the challenge pages before revealing full solutions
- Use the time estimates to pace your workshop sessions
:::

---

## Challenge 01 — Entra ID: Users & Groups

> ⏱️ **Coach time estimate**: 30–45 min (students: 45–60 min) | 🎯 Domain: Identity & Governance

### Complete Solution

```bash
# Step 0 — Get your tenant domain
DOMAIN=$(az rest --method get --url "https://graph.microsoft.com/v1.0/domains" \
  --query "value[?isDefault].id" -o tsv)
echo "Tenant domain: $DOMAIN"
```

**Why**: Every Entra ID tenant has a default `*.onmicrosoft.com` domain. You need this for UPN (User Principal Name) construction. Students who hardcode a domain name will break when switching tenants.

```bash
# Part 1 — Create 3 users
az ad user create \
  --display-name "Alice Johnson" \
  --user-principal-name "alice@$DOMAIN" \
  --password "TempP@ss123!" \
  --force-change-password-next-sign-in true \
  --department "IT" \
  --job-title "Cloud Engineer"

az ad user create \
  --display-name "Bob Smith" \
  --user-principal-name "bob@$DOMAIN" \
  --password "TempP@ss456!" \
  --force-change-password-next-sign-in true \
  --department "Finance" \
  --job-title "Financial Analyst"

az ad user create \
  --display-name "Carol Williams" \
  --user-principal-name "carol@$DOMAIN" \
  --password "TempP@ss789!" \
  --force-change-password-next-sign-in true \
  --department "IT" \
  --job-title "Security Admin"
```

**Why**: `--force-change-password-next-sign-in true` is the secure default — users must set their own password. The exam tests whether you know this flag exists. Passwords must meet complexity requirements (uppercase, lowercase, number, special char, 8+ chars).

```bash
# Part 2 — Create groups and add members
az ad group create --display-name "IT-Team" --mail-nickname "it-team"
az ad group create --display-name "Finance-Team" --mail-nickname "finance-team"
az ad group create --display-name "All-Employees" --mail-nickname "all-employees"

# Get user object IDs (needed for member operations)
ALICE_ID=$(az ad user show --id "alice@$DOMAIN" --query id -o tsv)
BOB_ID=$(az ad user show --id "bob@$DOMAIN" --query id -o tsv)
CAROL_ID=$(az ad user show --id "carol@$DOMAIN" --query id -o tsv)

# Add members
az ad group member add --group "IT-Team" --member-id $ALICE_ID
az ad group member add --group "IT-Team" --member-id $CAROL_ID
az ad group member add --group "Finance-Team" --member-id $BOB_ID
az ad group member add --group "All-Employees" --member-id $ALICE_ID
az ad group member add --group "All-Employees" --member-id $BOB_ID
az ad group member add --group "All-Employees" --member-id $CAROL_ID
```

**Why**: The `--mail-nickname` is required when creating groups via CLI — it's the email-safe alias. Member operations require the object ID (GUID), not the UPN — a common point of confusion.

```bash
# Part 3 — Manage properties
# Set Bob's usage location (required before license assignment)
az ad user update --id "bob@$DOMAIN" --usage-location "US"

# Disable Carol's account
az ad user update --id "carol@$DOMAIN" --account-enabled false

# Update IT-Team group description
IT_GROUP_ID=$(az ad group show --group "IT-Team" --query id -o tsv)
az rest --method patch \
  --url "https://graph.microsoft.com/v1.0/groups/$IT_GROUP_ID" \
  --body '{"description": "IT department security group"}'
```

**Why**: Usage location is a prerequisite for license assignment — Azure won't let you assign licenses without it because licensing varies by country. The group description update requires the Graph API because `az ad group update` has limited property support.

```bash
# Part 4 — Invite external user
az rest --method post \
  --url "https://graph.microsoft.com/v1.0/invitations" \
  --body '{
    "invitedUserEmailAddress": "external@yourpersonalemail.com",
    "inviteRedirectUrl": "https://portal.azure.com",
    "sendInvitationMessage": true
  }'

# Get the guest user's ID and add to All-Employees
GUEST_ID=$(az ad user list --filter "userType eq 'Guest'" --query "[0].id" -o tsv)
az ad group member add --group "All-Employees" --member-id $GUEST_ID
```

**Why**: External users (B2B guests) are invited via the Microsoft Graph Invitations API. They appear as `userType eq 'Guest'` in Entra ID. The exam tests whether you know the difference between Member and Guest user types.

```bash
# Part 5 — SSPR (Portal steps — cannot be fully configured via CLI)
# 1. Azure Portal → Microsoft Entra ID → Password reset
# 2. Set "Self-service password reset enabled" to "Selected"
# 3. Select group: IT-Team
# 4. Authentication methods → Number required: 1
# 5. Check "Email" as allowed method
# 6. Save
```

**Why**: SSPR configuration is primarily a Portal task on the exam. The key settings are: scope (All/Selected/None), authentication methods required (1 or 2), and which methods are allowed. Students often miss that you must select a specific group when choosing "Selected."

### Common Mistakes

1. **Forgetting `--mail-nickname`** when creating groups — CLI throws an error without it
2. **Using UPN instead of Object ID** for `--member-id` — the parameter requires GUIDs
3. **Not setting usage location** before trying to assign licenses — fails silently in Portal, errors in CLI
4. **Setting SSPR to "All"** instead of scoping to IT-Team — the challenge asks for a specific group
5. **Trying to create dynamic groups via CLI** — dynamic membership rules require Graph API or Portal; if students attempt this, guide them to use static membership and explain dynamics as a bonus

---

## Challenge 02 — RBAC & Access Management

> ⏱️ **Coach time estimate**: 30–40 min (students: 45–60 min) | 🎯 Domain: Identity & Governance

### Complete Solution

```bash
# Setup
DOMAIN=$(az rest --method get --url "https://graph.microsoft.com/v1.0/domains" \
  --query "value[?isDefault].id" -o tsv)
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create resource group
az group create --name rg-rbac-challenge --location eastus
```

```bash
# Part 1 — Explore built-in roles
az role definition list \
  --query "[?roleName=='Owner' || roleName=='Contributor' || roleName=='Reader' || roleName=='User Access Administrator'].{Name:roleName, Description:description}" \
  -o table

# Deep-dive into Contributor's NotActions (key exam topic)
az role definition list --name "Contributor" \
  --query "[].permissions[0].notActions" -o json
# Shows: Microsoft.Authorization/*/Delete, Microsoft.Authorization/*/Write, etc.
# This is WHY Contributor can't assign roles — those actions are explicitly excluded.
```

**Why**: The 4 fundamental roles are Owner, Contributor, Reader, and User Access Administrator. The critical exam distinction is that Contributor has `Microsoft.Authorization/*/Write` in NotActions — meaning it cannot assign roles. Owner can do everything including role assignments.

```bash
# Part 2 — Assign roles at different scopes
ALICE_ID=$(az ad user show --id "alice@$DOMAIN" --query id -o tsv)
BOB_ID=$(az ad user show --id "bob@$DOMAIN" --query id -o tsv)
CAROL_ID=$(az ad user show --id "carol@$DOMAIN" --query id -o tsv)
IT_GROUP_ID=$(az ad group show --group "IT-Team" --query id -o tsv)

# Reader for Alice at subscription scope
az role assignment create \
  --assignee $ALICE_ID \
  --role "Reader" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"

# Contributor for IT-Team at resource group scope
az role assignment create \
  --assignee $IT_GROUP_ID \
  --role "Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-rbac-challenge"

# VM Contributor for Bob at resource group scope
az role assignment create \
  --assignee $BOB_ID \
  --role "Virtual Machine Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-rbac-challenge"
```

**Why**: The `--scope` parameter is the key concept. Roles assigned at higher scopes (subscription) are inherited by lower scopes (resource group → resource). Alice gets Reader everywhere; IT-Team gets Contributor only on rg-rbac-challenge. RBAC is **additive** — Alice gets both Reader (from direct assignment) AND Contributor (from IT-Team group membership) on rg-rbac-challenge.

```bash
# Part 3 — Verify and interpret access
az role assignment list --assignee $ALICE_ID -o table
az role assignment list --resource-group rg-rbac-challenge -o table
az role assignment list --all --role "Owner" -o table
```

```bash
# Part 4 — Create a custom role
cat > vm-reader-role.json << EOF
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

# Assign custom role to Carol
az role assignment create \
  --assignee $CAROL_ID \
  --role "VM-Reader" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-rbac-challenge"
```

**Why**: Custom roles fill gaps when built-in roles are too broad or too narrow. The `AssignableScopes` limits WHERE the role can be assigned — not what it can do. Common exam question: "What's the maximum number of custom roles per tenant?" Answer: 5,000.

```bash
# Part 5 — Audit access
az role assignment list --all -o table
az role assignment list --all --role "Owner" \
  --query "[].{Principal:principalName, Scope:scope, Type:principalType}" -o table
```

### Common Mistakes

1. **Using `--assignee` with UPN for groups** — groups need object ID, not a name
2. **Confusing scope hierarchy** — students assign at resource group scope and expect it to apply at subscription level (it doesn't — inheritance goes DOWN, not UP)
3. **Custom role JSON errors** — missing `AssignableScopes` or using wrong subscription ID
4. **Forgetting that RBAC is additive** — students think a Reader assignment at subscription overrides Contributor at resource group (it doesn't — user gets the union of all permissions)
5. **Custom role propagation delay** — can take up to 5 minutes for a new custom role to become assignable

---

## Challenge 03 — Azure Policy & Governance

> ⏱️ **Coach time estimate**: 45–55 min (students: 60–75 min) | 🎯 Domain: Identity & Governance

### Complete Solution

```bash
# Part 1 — Create resource groups with tags
az group create --name rg-policy-prod --location eastus \
  --tags Environment=Production CostCenter=IT-001 Owner=Coach
az group create --name rg-policy-dev --location eastus \
  --tags Environment=Development CostCenter=IT-002 Owner=Coach
```

```bash
# Part 2 — Assign tag policy with Deny effect
# Find the built-in policy: "Require a tag and its value on resources"
az policy definition list \
  --query "[?contains(displayName, 'Require a tag and its value')].{Name:name, DisplayName:displayName}" -o table
# Policy ID: 1e30110a-5ceb-460c-a204-c1c3969c6d62

RG_PROD_ID=$(az group show --name rg-policy-prod --query id -o tsv)

az policy assignment create \
  --name "require-costcenter-tag" \
  --display-name "Require CostCenter tag on resources" \
  --policy "1e30110a-5ceb-460c-a204-c1c3969c6d62" \
  --scope "$RG_PROD_ID" \
  --params '{"tagName":{"value":"CostCenter"},"tagValue":{"value":"IT-001"}}'
```

**Why**: Policy ID `1e30110a-5ceb-460c-a204-c1c3969c6d62` is the built-in "Require a tag and its value on resources" — it uses the Deny effect to block resource creation if the tag/value pair is missing. Policies take 5–15 minutes to become effective.

```bash
# Part 3 — Assign Allowed Locations policy
# Built-in policy: "Allowed locations"
# Policy ID: e56962a6-4747-49cd-b67b-bf8b01975c4c
az policy assignment create \
  --name "allowed-locations" \
  --display-name "Allowed Locations - East US and West US 2" \
  --policy "e56962a6-4747-49cd-b67b-bf8b01975c4c" \
  --scope "$RG_PROD_ID" \
  --params '{"listOfAllowedLocations":{"value":["eastus","westus2"]}}'
```

```bash
# Part 4 — Create a policy initiative
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

cat > initiative.json << 'EOF'
[
  {
    "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/871b6d14-10aa-478d-b466-ef6698f3ef28",
    "parameters": { "tagName": { "value": "CostCenter" } }
  },
  {
    "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/871b6d14-10aa-478d-b466-ef6698f3ef28",
    "parameters": { "tagName": { "value": "Environment" } }
  },
  {
    "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c",
    "parameters": { "listOfAllowedLocations": { "value": ["eastus", "westus2"] } }
  }
]
EOF

az policy set-definition create \
  --name "Contoso-Governance" \
  --display-name "Contoso Governance Initiative" \
  --definitions initiative.json \
  --description "Requires tags and restricts locations"

# Assign the initiative to rg-policy-dev
RG_DEV_ID=$(az group show --name rg-policy-dev --query id -o tsv)
az policy assignment create \
  --name "contoso-governance-assignment" \
  --display-name "Contoso Governance" \
  --policy-set-definition "Contoso-Governance" \
  --scope "$RG_DEV_ID"
```

**Why**: An initiative (policy set) bundles multiple policies into one assignment. This is the recommended approach for governance at scale — assign one initiative instead of 10 individual policies. Policy `871b6d14` is "Require a tag on resources" (Deny effect, checks tag name only — not value).

```bash
# Part 5 — Resource locks
az lock create --name "PreventDeletion" \
  --lock-type CanNotDelete \
  --resource-group rg-policy-prod \
  --notes "Production resources - do not delete"

# Test: try to delete (will fail)
az group delete --name rg-policy-prod --yes 2>&1 || echo "EXPECTED: Lock prevented deletion"

# ReadOnly lock on a specific resource (if a storage account exists)
# az lock create --name "ReadOnlyLock" --lock-type ReadOnly \
#   --resource-group rg-policy-prod --resource-name <name> --resource-type Microsoft.Storage/storageAccounts
```

```bash
# Part 6 — Advisor and budgets
az advisor recommendation list \
  --query "[].{Category:category, Impact:impact, Problem:shortDescription.problem}" -o table
```

### Common Mistakes

1. **Policy not taking effect** — students test immediately after assignment; remind them it takes 5–15 minutes. Use `az policy state trigger-scan` to speed it up
2. **Wrong policy ID** — there are multiple tag-related policies; `1e30110a` requires tag AND value, `871b6d14` requires tag only
3. **Confusing initiative parameters** — students try to pass parameters at assignment time that should be in the definition
4. **ReadOnly lock surprise** — students apply ReadOnly to a resource group and can't create new resources inside it (ReadOnly prevents ALL writes, including creates)
5. **Tags don't inherit** — students assume tagging a resource group tags its resources (it doesn't — need the "Inherit a tag" policy)

---

## Challenge 04 — Storage Accounts & Access

> ⏱️ **Coach time estimate**: 40–50 min (students: 60–75 min) | 🎯 Domain: Storage

### Complete Solution

```bash
# Setup
RG="rg-storage-challenge"
LOCATION="eastus"
STORAGE_NAME="ststoragechallenge$(date +%s | tail -c 8)"

az group create --name $RG --location $LOCATION

# Part 1 — Create storage account
az storage account create \
  --name $STORAGE_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --min-tls-version TLS1_2 \
  --tags Environment=Lab CostCenter=IT-001

# Part 2 — Change redundancy
az storage account update --name $STORAGE_NAME --resource-group $RG --sku Standard_GRS
```

**Why**: Storage names must be globally unique, 3–24 chars, lowercase+numbers only. `$RANDOM` or timestamp ensures uniqueness. LRS→GRS is a supported direct transition; some transitions (LRS→RA-GZRS) require intermediate steps — a key exam topic.

```bash
# Part 3 — Access keys, containers, SAS tokens
CONN_STRING=$(az storage account show-connection-string \
  --name $STORAGE_NAME --resource-group $RG -o tsv)

az storage container create --name testcontainer --connection-string "$CONN_STRING"

echo "Hello from Azure Storage Challenge!" > testfile.txt
az storage blob upload --container-name testcontainer \
  --file testfile.txt --name testfile.txt --connection-string "$CONN_STRING"

# Account SAS (broad — covers all services)
END_DATE=$(date -u -d "+1 day" '+%Y-%m-%dT%H:%MZ' 2>/dev/null || date -u -v+1d '+%Y-%m-%dT%H:%MZ')
az storage account generate-sas \
  --account-name $STORAGE_NAME \
  --services b --resource-types sco \
  --permissions rl --expiry $END_DATE --https-only -o tsv

# Service SAS (scoped to container)
az storage container generate-sas \
  --name testcontainer --account-name $STORAGE_NAME \
  --permissions rl --expiry $END_DATE --https-only \
  --connection-string "$CONN_STRING" -o tsv
```

**Why**: Three SAS types exist — Account (broadest), Service (scoped to one service), and User Delegation (most secure, uses Entra ID). The exam always asks: "Which is most secure?" → User Delegation SAS.

```bash
# Part 4 — Stored access policy
az storage container policy create \
  --container-name testcontainer --name "ReadPolicy" \
  --permissions rl --expiry $END_DATE \
  --connection-string "$CONN_STRING"

# SAS linked to the policy (revocable!)
az storage container generate-sas \
  --name testcontainer --account-name $STORAGE_NAME \
  --policy-name "ReadPolicy" \
  --connection-string "$CONN_STRING" -o tsv

# Part 5 — Storage firewall
MY_IP=$(curl -s https://api.ipify.org)
az storage account update --name $STORAGE_NAME --resource-group $RG --default-action Deny
az storage account network-rule add \
  --account-name $STORAGE_NAME --resource-group $RG --ip-address $MY_IP

# Part 6 — Rotate key
az storage account keys renew --account-name $STORAGE_NAME --resource-group $RG --key key1

# Part 7 — AzCopy
mkdir -p upload-test
for i in 1 2 3 4 5; do echo "Test file $i" > upload-test/file$i.txt; done

SAS_TOKEN=$(az storage account generate-sas \
  --account-name $STORAGE_NAME --services b --resource-types co \
  --permissions rwlac --expiry $END_DATE --https-only -o tsv)
azcopy copy "upload-test/*" "https://$STORAGE_NAME.blob.core.windows.net/testcontainer?$SAS_TOKEN" --recursive
```

### Common Mistakes

1. **Storage name validation failures** — uppercase, hyphens, or >24 chars
2. **Firewall lockout** — students set default-action to Deny and forget to add their own IP; guide them to use Cloud Shell (always allowed as a trusted service)
3. **SAS token confusion** — mixing up Account SAS vs Service SAS vs User Delegation SAS
4. **Date formatting on macOS** — `date -d` is GNU-only; macOS needs `date -v+1d`; the challenge shows both forms
5. **Key rotation breaking everything** — students rotate key1 and then wonder why their connection string stopped working; explain the dual-key rotation pattern

---

## Challenge 05 — Blob Storage & Azure Files

> ⏱️ **Coach time estimate**: 40–50 min (students: 60–75 min) | 🎯 Domain: Storage

### Complete Solution

```bash
# Setup
RG="rg-blob-files-challenge"
STORAGE_NAME="stblobfiles$(date +%s | tail -c 8)"
az group create --name $RG --location eastus

az storage account create --name $STORAGE_NAME --resource-group $RG \
  --location eastus --sku Standard_LRS --kind StorageV2 --access-tier Hot

CONN_STRING=$(az storage account show-connection-string \
  --name $STORAGE_NAME --resource-group $RG -o tsv)

# Part 2 — Containers and tiering
az storage container create --name app-data --connection-string "$CONN_STRING"
az storage container create --name logs --connection-string "$CONN_STRING"
az storage container create --name archive --connection-string "$CONN_STRING"

echo "User profile data for Alice" > profile-alice.txt
echo "User profile data for Bob" > profile-bob.txt
echo "Application log entry 2025-01-15" > app-log-2025-01-15.txt

az storage blob upload --container-name app-data --file profile-alice.txt \
  --name profiles/alice.txt --connection-string "$CONN_STRING"
az storage blob upload --container-name app-data --file profile-bob.txt \
  --name profiles/bob.txt --connection-string "$CONN_STRING"
az storage blob upload --container-name logs --file app-log-2025-01-15.txt \
  --name "2025/01/app-log-2025-01-15.txt" --connection-string "$CONN_STRING"

# Change log blob to Cool tier
az storage blob set-tier --container-name logs \
  --name "2025/01/app-log-2025-01-15.txt" --tier Cool \
  --connection-string "$CONN_STRING"

# Upload directly to Archive tier
echo "Quarterly Report Q3 2024" > q3-report.txt
az storage blob upload --container-name archive --file q3-report.txt \
  --name reports/q3-2024.txt --connection-string "$CONN_STRING" --tier Archive
```

**Why**: Virtual directories (profiles/, 2025/01/) are just naming conventions — blob storage is flat. The `/` in the name creates the folder appearance in Storage Explorer. Tier changes between Hot/Cool/Cold are instant; Archive requires rehydration (hours).

```bash
# Part 3 — Soft delete
az storage account blob-service-properties update \
  --account-name $STORAGE_NAME --resource-group $RG \
  --enable-delete-retention true --delete-retention-days 14

az storage account blob-service-properties update \
  --account-name $STORAGE_NAME --resource-group $RG \
  --enable-container-delete-retention true --container-delete-retention-days 14

# Test: delete and recover
az storage blob delete --container-name app-data --name profiles/alice.txt \
  --connection-string "$CONN_STRING"
az storage blob undelete --container-name app-data --name profiles/alice.txt \
  --connection-string "$CONN_STRING"

# Part 4 — Versioning
az storage account blob-service-properties update \
  --account-name $STORAGE_NAME --resource-group $RG --enable-versioning true

echo "Updated profile data for Alice — version 2" > profile-alice-v2.txt
az storage blob upload --container-name app-data --file profile-alice-v2.txt \
  --name profiles/alice.txt --connection-string "$CONN_STRING" --overwrite

# Part 5 — Snapshots
az storage blob snapshot --container-name app-data --name profiles/bob.txt \
  --connection-string "$CONN_STRING"

# Part 6 — Azure Files
az storage share-rm create --storage-account $STORAGE_NAME --resource-group $RG \
  --name finance-share --quota 50

az storage directory create --share-name finance-share --name "reports" \
  --connection-string "$CONN_STRING"
echo "Budget Report 2025" > budget-2025.txt
az storage file upload --share-name finance-share --source budget-2025.txt \
  --path "reports/budget-2025.txt" --connection-string "$CONN_STRING"

# Part 7 — File share soft delete and snapshots
az storage account file-service-properties update \
  --account-name $STORAGE_NAME --resource-group $RG \
  --enable-delete-retention true --delete-retention-days 14

az storage share snapshot --name finance-share --connection-string "$CONN_STRING"
```

### Common Mistakes

1. **Trying to read an archived blob** — returns `BlobArchived` error; must rehydrate first (up to 15 hours standard, under 1 hour high priority)
2. **Confusing versioning vs snapshots** — versioning is automatic on every write; snapshots are manual point-in-time captures
3. **Port 445 blocked** — Azure Files uses SMB over TCP 445; most ISPs block this. Guide students to test with `Test-NetConnection` and suggest Azure VPN or Cloud Shell as alternatives
4. **Forgetting `--overwrite`** — uploading to an existing blob name without `--overwrite` fails
5. **Not enabling versioning before testing** — versioning only captures changes AFTER it's enabled

---

## Challenge 06 — Storage Security & Lifecycle

> ⏱️ **Coach time estimate**: 40–50 min (students: 60–75 min) | 🎯 Domain: Storage

### Complete Solution

```bash
# Setup — two storage accounts in different regions
RG="rg-lifecycle-challenge"
STORAGE_PRIMARY="stlifecyclepri$(date +%s | tail -c 8)"
STORAGE_SECONDARY="stlifecyclesec$(date +%s | tail -c 8)"

az group create --name $RG --location eastus

az storage account create --name $STORAGE_PRIMARY --resource-group $RG \
  --location eastus --sku Standard_LRS --kind StorageV2 --access-tier Hot

az storage account create --name $STORAGE_SECONDARY --resource-group $RG \
  --location westus2 --sku Standard_LRS --kind StorageV2 --access-tier Hot

# Enable versioning (required for object replication) and change feed on source
az storage account blob-service-properties update \
  --account-name $STORAGE_PRIMARY --resource-group $RG \
  --enable-versioning true --enable-change-feed true

az storage account blob-service-properties update \
  --account-name $STORAGE_SECONDARY --resource-group $RG \
  --enable-versioning true
```

**Why**: Object replication requires versioning on both accounts and change feed on the source. These prerequisites trip up students who skip the setup steps.

```bash
# Lifecycle management policy
az storage account management-policy create \
  --account-name $STORAGE_PRIMARY \
  --resource-group $RG \
  --policy '{
    "rules": [
      {
        "enabled": true,
        "name": "move-logs-to-cool",
        "type": "Lifecycle",
        "definition": {
          "actions": {
            "baseBlob": {
              "tierToCool": { "daysAfterModificationGreaterThan": 30 },
              "tierToArchive": { "daysAfterModificationGreaterThan": 90 },
              "delete": { "daysAfterModificationGreaterThan": 365 }
            }
          },
          "filters": {
            "blobTypes": ["blockBlob"],
            "prefixMatch": ["app-logs/"]
          }
        }
      }
    ]
  }'
```

**Why**: Lifecycle policies automate tier transitions and deletion based on age. The rule above moves logs to Cool after 30 days, Archive after 90, and deletes after 365. Filters scope the rule to specific containers/prefixes. This is heavily tested on the exam.

```bash
# Object replication
CONN_PRIMARY=$(az storage account show-connection-string \
  --name $STORAGE_PRIMARY --resource-group $RG -o tsv)
CONN_SECONDARY=$(az storage account show-connection-string \
  --name $STORAGE_SECONDARY --resource-group $RG -o tsv)

# Create matching containers
az storage container create --name replicated-data --connection-string "$CONN_PRIMARY"
az storage container create --name replicated-data --connection-string "$CONN_SECONDARY"

# Object replication is best configured via Portal:
# Source storage account → Object replication → Create replication rules
# Source: replicated-data container on primary
# Destination: replicated-data container on secondary
```

### Common Mistakes

1. **Missing prerequisites for object replication** — versioning not enabled, or change feed not enabled on source
2. **Lifecycle policy JSON syntax** — students often have malformed JSON; validate with `python -m json.tool`
3. **Early deletion charges** — students forget that moving from Cool before 30 days or Archive before 180 days incurs penalty charges
4. **Object replication is async** — data doesn't appear instantly in the destination; there's a replication lag
5. **Identity-based access for Azure Files** — requires Entra ID DS or on-prem AD DS joined; can't be done in a free lab tenant easily

---

## Challenge 07 — ARM Templates & Bicep

> ⏱️ **Coach time estimate**: 40–50 min (students: 60 min) | 🎯 Domain: Compute (IaC)

### Complete Solution

```bash
az group create --name rg-iac-lab --location eastus

# Task 1 — Save the ARM template (provided in the challenge)
# Task 2 — Add environment tag parameter + tags property to the resource

# Task 3 — Deploy ARM template
az deployment group create \
  --resource-group rg-iac-lab \
  --template-file storage.json \
  --parameters storagePrefix=contoso environment=dev \
  --name deploy-storage-v1

# Task 4 — Export
az group export --name rg-iac-lab --output json > exported-template.json

# Task 5 — Convert ARM to Bicep
az bicep install
az bicep decompile --file storage.json

# Task 6 — Modify Bicep (add blob container — see challenge hints)
# Task 7 — Deploy Bicep
az deployment group create \
  --resource-group rg-iac-lab \
  --template-file storage.bicep \
  --parameters storagePrefix=contoso environment=prod \
  --name deploy-storage-v2

# Task 8 — What-If preview
az deployment group what-if \
  --resource-group rg-iac-lab \
  --template-file storage.bicep \
  --parameters storagePrefix=contoso environment=staging
```

**Why**: What-If is critical for production safety — it shows what would change without actually deploying. The exam tests whether you know the difference between Incremental (default, additive) and Complete (deletes anything not in the template) deployment modes.

### Common Mistakes

1. **Bicep decompile warnings** — output may have `TODO` comments or unsupported constructs; students must clean these up manually
2. **Complete mode data loss** — students accidentally use `--mode Complete` and delete unmanaged resources; always stress that Incremental is the safe default
3. **`uniqueString()` confusion** — students think it's random; it's actually deterministic — same input always produces same output
4. **Forgetting to validate before deploying** — `az deployment group validate` catches errors without deploying
5. **Parameter file vs inline parameters** — exam may test both formats; know that `@params.json` references a file

---

## Challenge 08 — Virtual Machines & Scale Sets

> ⏱️ **Coach time estimate**: 45–55 min (students: 60–75 min) | 🎯 Domain: Compute

### Complete Solution

```bash
az group create --name rg-vm-lab --location eastus

# Task 1 — Create Linux VM
az vm create \
  --resource-group rg-vm-lab --name vm-web-01 \
  --image Ubuntu2204 --size Standard_B1s \
  --admin-username azureuser --generate-ssh-keys \
  --public-ip-sku Standard --output table

# Task 2 — Attach data disk
az vm disk attach --resource-group rg-vm-lab --vm-name vm-web-01 \
  --name disk-data-01 --size-gb 128 --sku Premium_LRS --new
# Then SSH in and: lsblk → parted → mkfs.ext4 → mount → fstab

# Task 3 — Resize
az vm resize --resource-group rg-vm-lab --name vm-web-01 --size Standard_B2s

# Task 4 — Move VM (move ALL dependent resources together)
az group create --name rg-vm-prod --location eastus
RESOURCE_IDS=$(az resource list -g rg-vm-lab --query "[].id" -o tsv | tr '\n' ' ')
az resource move --destination-group rg-vm-prod --ids $RESOURCE_IDS

# Task 5 — Availability set
az vm availability-set create --resource-group rg-vm-lab --name avset-web \
  --platform-fault-domain-count 2 --platform-update-domain-count 5

az vm create --resource-group rg-vm-lab --name vm-web-avset \
  --image Ubuntu2204 --size Standard_B1s \
  --admin-username azureuser --generate-ssh-keys \
  --availability-set avset-web --no-wait

# Task 6 — VMSS with autoscale
az vmss create --resource-group rg-vm-lab --name vmss-web \
  --image Ubuntu2204 --vm-sku Standard_B1s --instance-count 2 \
  --admin-username azureuser --generate-ssh-keys \
  --upgrade-policy-mode automatic --load-balancer lb-vmss-web

az monitor autoscale create --resource-group rg-vm-lab \
  --resource vmss-web --resource-type Microsoft.Compute/virtualMachineScaleSets \
  --name autoscale-vmss-web --min-count 2 --max-count 5 --count 2

az monitor autoscale rule create --resource-group rg-vm-lab \
  --autoscale-name autoscale-vmss-web \
  --condition "Percentage CPU > 75 avg 5m" --scale out 1

az monitor autoscale rule create --resource-group rg-vm-lab \
  --autoscale-name autoscale-vmss-web \
  --condition "Percentage CPU < 25 avg 5m" --scale in 1

# Task 8 — DEALLOCATE to stop charges!
az vm deallocate --resource-group rg-vm-lab --name vm-web-avset --no-wait
az vmss deallocate --resource-group rg-vm-lab --name vmss-web
```

**Why**: The critical distinction is **Stop vs Deallocate**. Stopping from inside the OS keeps compute reserved (you still pay). `az vm deallocate` releases compute (you stop paying for compute, but still pay for disks/IPs). This is a very common exam question.

### Common Mistakes

1. **Forgetting to deallocate** — students leave VMs running and burn through credits
2. **Moving VM without dependent resources** — must move NIC, disk, public IP, NSG together; partial moves fail
3. **Availability Set vs Zone confusion** — Sets = within one datacenter (99.95% SLA); Zones = across datacenters (99.99% SLA)
4. **Cannot add existing VM to availability set** — must be specified at creation time
5. **Disk not visible after attach** — students forget to partition, format, and mount inside the VM; the disk attaches but isn't usable until initialized in the OS

---

## Challenge 09 — Containers in Azure

> ⏱️ **Coach time estimate**: 30–40 min (students: 45–60 min) | 🎯 Domain: Compute

### Complete Solution

```bash
az group create --name rg-containers-lab --location eastus

# Task 1 — ACR
ACR_NAME="contosoreglab$(date +%s | tail -c 8)"
az acr create --resource-group rg-containers-lab --name $ACR_NAME \
  --sku Basic --admin-enabled true

# Task 2 — Build image in the cloud (no local Docker needed!)
mkdir container-app && cd container-app
cat > Dockerfile << 'EOF'
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
EOF
cat > index.html << 'EOF'
<!DOCTYPE html>
<html><body><h1>Contoso Dashboard</h1><p>Running on Azure Containers</p></body></html>
EOF

az acr build --registry $ACR_NAME --image contoso-dashboard:v1 .

# Task 3 — Deploy to ACI
ACR_LOGIN=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

az container create --resource-group rg-containers-lab --name aci-dashboard \
  --image "$ACR_LOGIN/contoso-dashboard:v1" \
  --registry-login-server $ACR_LOGIN --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label contoso-aci-$RANDOM --ports 80 --cpu 0.5 --memory 0.5

# Task 4–5 — Container Apps
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights

az containerapp env create --resource-group rg-containers-lab \
  --name cae-contoso-lab --location eastus

az containerapp create --resource-group rg-containers-lab --name ca-dashboard \
  --environment cae-contoso-lab --image "$ACR_LOGIN/contoso-dashboard:v1" \
  --registry-server $ACR_LOGIN --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --target-port 80 --ingress external --min-replicas 1 --max-replicas 5

# Task 6 — Scaling
az containerapp update --resource-group rg-containers-lab --name ca-dashboard \
  --min-replicas 1 --max-replicas 10 \
  --scale-rule-name http-scaling --scale-rule-type http --scale-rule-http-concurrency 10
```

**Why**: `az acr build` is the key command — it builds Docker images in the cloud without needing Docker installed locally. This is a common exam scenario. The distinction between ACI (simple/short-lived), Container Apps (microservices/APIs), and AKS (full Kubernetes) is heavily tested.

### Common Mistakes

1. **ACR name validation** — 5–50 chars, alphanumeric only (no hyphens!)
2. **Port mismatch** — deploying with `--target-port 8080` when the container listens on 80 → 502 errors
3. **Forgetting registry credentials** — Container Apps without credentials can't pull from private ACR
4. **Provider not registered** — `Microsoft.App` and `Microsoft.OperationalInsights` must be registered before creating Container Apps environments
5. **ACI vs Container Apps choice** — students default to ACI for everything; guide them that Container Apps is preferred for anything needing scaling, HTTPS, or multiple replicas

---

## Challenge 10 — Azure App Service

> ⏱️ **Coach time estimate**: 45–55 min (students: 60–75 min) | 🎯 Domain: Compute

### Complete Solution

```bash
az group create --name rg-appservice-lab --location eastus

# Task 1 — App Service Plan (S1 for slots)
az appservice plan create --resource-group rg-appservice-lab \
  --name plan-contoso-web --sku S1 --is-linux

# Task 2 — Web app
APP_NAME="contoso-web-$(date +%s | tail -c 8)"
az webapp create --resource-group rg-appservice-lab \
  --plan plan-contoso-web --name $APP_NAME --runtime "NODE:18-lts"

# Task 3 — Deploy code (zip deploy)
mkdir webapp && cd webapp
cat > index.js << 'EOF'
const http = require('http');
const port = process.env.PORT || 8080;
const version = process.env.APP_VERSION || 'v1';
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<h1>Contoso Marketing - ${version}</h1><p>Server time: ${new Date()}</p>`);
});
server.listen(port, () => console.log(`Running on port ${port}`));
EOF
cat > package.json << 'EOF'
{"name":"contoso-web","version":"1.0.0","scripts":{"start":"node index.js"},"engines":{"node":">=18.0.0"}}
EOF
zip -r app.zip index.js package.json
az webapp deploy --resource-group rg-appservice-lab --name $APP_NAME \
  --src-path app.zip --type zip

az webapp config appsettings set --resource-group rg-appservice-lab \
  --name $APP_NAME --settings APP_VERSION=v1

# Task 4-6 — Deployment slots and swap
az webapp deployment slot create --resource-group rg-appservice-lab \
  --name $APP_NAME --slot staging

az webapp config appsettings set --resource-group rg-appservice-lab \
  --name $APP_NAME --slot staging --settings APP_VERSION=v2

# Swap staging → production (zero downtime)
az webapp deployment slot swap --resource-group rg-appservice-lab \
  --name $APP_NAME --slot staging --target-slot production

# Task 7 — Autoscale
az monitor autoscale create --resource-group rg-appservice-lab \
  --resource plan-contoso-web --resource-type Microsoft.Web/serverfarms \
  --name autoscale-web --min-count 1 --max-count 5 --count 1

az monitor autoscale rule create --resource-group rg-appservice-lab \
  --autoscale-name autoscale-web \
  --condition "CpuPercentage > 70 avg 5m" --scale out 1

az monitor autoscale rule create --resource-group rg-appservice-lab \
  --autoscale-name autoscale-web \
  --condition "CpuPercentage < 30 avg 10m" --scale in 1
```

**Why**: Deployment slots require Standard (S1) tier or above — this is a common exam gotcha. The swap operation is atomic: Azure warms up the staging slot, then swaps routing. After swap, the old production code is in staging — instant rollback by swapping again. Settings marked as "slot settings" don't swap (they stick to the slot).

### Common Mistakes

1. **Free/Basic tier → no slots** — students try to create slots on F1/B1 plans and get confused by the error
2. **Slot swap direction** — students confuse which slot goes where; staging→production means staging code becomes production
3. **App settings that swap vs don't** — connection strings and app settings swap by default unless marked as "slot setting" (sticky)
4. **Scale-up vs scale-out** — students confuse changing the plan tier (vertical) with adding instances (horizontal)
5. **Forgetting to deploy code to staging** — students create the slot but forget it starts empty

---

## Challenge 11 — Virtual Networks & Subnets

> ⏱️ **Coach time estimate**: 35–45 min (students: 45–60 min) | 🎯 Domain: Networking

### Complete Solution

```bash
az group create --name rg-network-lab --location eastus

# Hub VNet
az network vnet create --resource-group rg-network-lab --name vnet-hub \
  --address-prefix 10.0.0.0/16 --subnet-name snet-frontend --subnet-prefix 10.0.1.0/24
az network vnet subnet create --resource-group rg-network-lab --vnet-name vnet-hub \
  --name snet-backend --address-prefix 10.0.2.0/24

# Spoke VNet
az network vnet create --resource-group rg-network-lab --name vnet-spoke \
  --address-prefix 10.1.0.0/16 --subnet-name snet-workloads --subnet-prefix 10.1.1.0/24

# Bidirectional peering
HUB_ID=$(az network vnet show -g rg-network-lab -n vnet-hub --query id -o tsv)
SPOKE_ID=$(az network vnet show -g rg-network-lab -n vnet-spoke --query id -o tsv)

az network vnet peering create -g rg-network-lab --name hub-to-spoke \
  --vnet-name vnet-hub --remote-vnet $SPOKE_ID \
  --allow-vnet-access true --allow-forwarded-traffic true

az network vnet peering create -g rg-network-lab --name spoke-to-hub \
  --vnet-name vnet-spoke --remote-vnet $HUB_ID \
  --allow-vnet-access true --allow-forwarded-traffic true

# Deploy test VMs
az vm create -g rg-network-lab --name vm-hub --image Ubuntu2204 --size Standard_B1s \
  --vnet-name vnet-hub --subnet snet-frontend --admin-username azureuser \
  --generate-ssh-keys --public-ip-address pip-hub --no-wait

az vm create -g rg-network-lab --name vm-spoke --image Ubuntu2204 --size Standard_B1s \
  --vnet-name vnet-spoke --subnet snet-workloads --admin-username azureuser \
  --generate-ssh-keys --public-ip-address pip-spoke --no-wait

# UDR
az network route-table create -g rg-network-lab --name rt-spoke-to-hub
HUB_PRIVATE_IP=$(az vm show -g rg-network-lab -n vm-hub -d --query privateIps -o tsv)
az network route-table route create -g rg-network-lab --route-table-name rt-spoke-to-hub \
  --name route-via-hub-nva --address-prefix 10.0.1.0/24 \
  --next-hop-type VirtualAppliance --next-hop-ip-address $HUB_PRIVATE_IP
az network vnet subnet update -g rg-network-lab --vnet-name vnet-spoke \
  --name snet-workloads --route-table rt-spoke-to-hub

# Network Watcher
SPOKE_PRIVATE_IP=$(az vm show -g rg-network-lab -n vm-spoke -d --query privateIps -o tsv)
az network watcher test-ip-flow -g rg-network-lab --vm vm-spoke --direction Outbound \
  --protocol TCP --local "$SPOKE_PRIVATE_IP:*" --remote "$HUB_PRIVATE_IP:80"
az network watcher show-next-hop -g rg-network-lab --vm vm-spoke \
  --source-ip $SPOKE_PRIVATE_IP --dest-ip $HUB_PRIVATE_IP
```

**Why**: Peering is NOT transitive — if VNet A peers with B and B peers with C, A cannot talk to C without direct peering or a gateway. UDRs override system routes — priority order is UDR > BGP > System. Network Watcher IP Flow Verify only checks NSGs; use Next Hop for routing issues.

### Common Mistakes

1. **One-way peering** — students create only hub→spoke and forget spoke→hub; peering requires both sides
2. **Overlapping address spaces** — can't peer VNets with overlapping CIDR blocks
3. **ICMP blocked by default NSG** — ping won't work until students add an ICMP allow rule
4. **UDR next hop IP doesn't exist** — traffic black-holes silently; use Network Watcher to diagnose
5. **Peering state "Disconnected"** — happens when one side is deleted; both sides must be recreated

---

## Challenge 12 — Network Security

> ⏱️ **Coach time estimate**: 40–50 min (students: 60 min) | 🎯 Domain: Networking

### Complete Solution

```bash
az group create --name rg-netsec-lab --location eastus

# VNet with subnets
az network vnet create -g rg-netsec-lab --name vnet-secure \
  --address-prefix 10.0.0.0/16 --subnet-name snet-frontend --subnet-prefix 10.0.1.0/24
az network vnet subnet create -g rg-netsec-lab --vnet-name vnet-secure \
  --name snet-backend --address-prefix 10.0.2.0/24

# NSG with rules
az network nsg create -g rg-netsec-lab --name nsg-frontend
az network nsg rule create -g rg-netsec-lab --nsg-name nsg-frontend --name AllowHTTP \
  --priority 100 --direction Inbound --access Allow --protocol Tcp \
  --destination-port-ranges 80
az network nsg rule create -g rg-netsec-lab --nsg-name nsg-frontend --name AllowHTTPS \
  --priority 110 --direction Inbound --access Allow --protocol Tcp \
  --destination-port-ranges 443
az network nsg rule create -g rg-netsec-lab --nsg-name nsg-frontend --name DenyAllInbound \
  --priority 4000 --direction Inbound --access Deny --protocol '*' \
  --destination-port-ranges '*'

az network vnet subnet update -g rg-netsec-lab --vnet-name vnet-secure \
  --name snet-frontend --network-security-group nsg-frontend

# ASGs
az network asg create -g rg-netsec-lab --name asg-webservers
az network asg create -g rg-netsec-lab --name asg-dbservers

# Backend NSG with ASG rules
az network nsg create -g rg-netsec-lab --name nsg-backend
az network nsg rule create -g rg-netsec-lab --nsg-name nsg-backend --name AllowWebToDb \
  --priority 100 --direction Inbound --access Allow --protocol Tcp \
  --source-asgs asg-webservers --destination-asgs asg-dbservers \
  --destination-port-ranges 5432

az network vnet subnet update -g rg-netsec-lab --vnet-name vnet-secure \
  --name snet-backend --network-security-group nsg-backend

# Bastion
az network vnet subnet create -g rg-netsec-lab --vnet-name vnet-secure \
  --name AzureBastionSubnet --address-prefix 10.0.3.0/26
az network public-ip create -g rg-netsec-lab --name pip-bastion \
  --sku Standard --allocation-method Static
az network bastion create -g rg-netsec-lab --name bastion-secure \
  --public-ip-address pip-bastion --vnet-name vnet-secure --sku Basic --no-wait

# Service endpoint
STORAGE_NAME="contosodata$(date +%s | tail -c 8)"
az storage account create -g rg-netsec-lab --name $STORAGE_NAME --sku Standard_LRS
az network vnet subnet update -g rg-netsec-lab --vnet-name vnet-secure \
  --name snet-backend --service-endpoints Microsoft.Storage
SUBNET_ID=$(az network vnet subnet show -g rg-netsec-lab --vnet-name vnet-secure \
  -n snet-backend --query id -o tsv)
az storage account network-rule add -g rg-netsec-lab --account-name $STORAGE_NAME \
  --subnet $SUBNET_ID
az storage account update -g rg-netsec-lab --name $STORAGE_NAME --default-action Deny

# Private endpoint
az network vnet subnet update -g rg-netsec-lab --vnet-name vnet-secure \
  --name snet-backend --private-endpoint-network-policies Disabled
STORAGE_ID=$(az storage account show -g rg-netsec-lab -n $STORAGE_NAME --query id -o tsv)
az network private-endpoint create -g rg-netsec-lab --name pe-storage \
  --vnet-name vnet-secure --subnet snet-backend \
  --private-connection-resource-id $STORAGE_ID --group-id blob \
  --connection-name pe-storage-connection
```

**Why**: NSG priority matters — **lowest number = highest priority = evaluated first**. The first matching rule wins and evaluation stops. ASGs let you write rules using logical groups (webservers, dbservers) instead of IP addresses — much easier to manage at scale. Bastion subnet MUST be named exactly `AzureBastionSubnet` and be at least /26.

### Common Mistakes

1. **Priority order confusion** — lower number = higher priority; students often get this backwards
2. **Bastion subnet naming** — must be exactly `AzureBastionSubnet`, case-sensitive; any other name fails
3. **Double NSG evaluation** — inbound: subnet NSG first, then NIC NSG; both must allow; students forget the NIC-level NSG
4. **Service endpoint vs private endpoint** — service endpoints route over backbone but use public IP; private endpoints create a private IP in your VNet (more secure, works with on-prem)
5. **Bastion hourly charges** — ~$0.19/hour; remind students to delete promptly!

---

## Challenge 13 — DNS & Load Balancing

> ⏱️ **Coach time estimate**: 40–50 min (students: 60 min) | 🎯 Domain: Networking

### Complete Solution

```bash
RG="rg-az104-challenge13"
az group create --name $RG --location eastus

# DNS Zone
az network dns zone create --resource-group $RG --name lab.contoso.com

# DNS Records
az network dns record-set a add-record -g $RG --zone-name lab.contoso.com \
  --record-set-name www --ipv4-address 10.0.0.4
az network dns record-set cname set-record -g $RG --zone-name lab.contoso.com \
  --record-set-name portal --cname www.lab.contoso.com
az network dns record-set txt add-record -g $RG --zone-name lab.contoso.com \
  --record-set-name @ --value "contoso-verification=12345"

# Load Balancer
az network lb create -g $RG --name lb-web --sku Standard \
  --frontend-ip-name lb-frontend --backend-pool-name lb-backend --public-ip-address lb-pip

# VNet and VMs
az network vnet create -g $RG --name vnet-lb --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-backend --subnet-prefix 10.0.1.0/24

for i in 1 2; do
  az vm create -g $RG --name vm-web-$i --image Ubuntu2204 --size Standard_B1s \
    --vnet-name vnet-lb --subnet subnet-backend --nsg "" --public-ip-address "" \
    --admin-username azureuser --generate-ssh-keys
done

# Health probe
az network lb probe create -g $RG --lb-name lb-web --name hp-http \
  --protocol Http --port 80 --path /

# LB Rule
az network lb rule create -g $RG --lb-name lb-web --name rule-http \
  --frontend-ip-name lb-frontend --backend-pool-name lb-backend \
  --probe-name hp-http --protocol Tcp --frontend-port 80 --backend-port 80

# Internal LB (no public IP)
az network lb create -g $RG --name lb-internal --sku Standard \
  --frontend-ip-name lb-internal-frontend --backend-pool-name lb-internal-backend \
  --vnet-name vnet-lb --subnet subnet-backend
```

**Why**: Standard LB requires an NSG on the subnet (unlike Basic). Health probes determine backend health — if a VM fails the probe, the LB stops sending traffic to it. Internal LBs have no public IP — they use a private IP from a VNet subnet for backend-to-backend communication.

### Common Mistakes

1. **Standard vs Basic LB** — Standard requires NSG on subnet, supports availability zones, and has an SLA; Basic doesn't. Students forget the NSG requirement and wonder why traffic doesn't flow
2. **VMs not in backend pool** — creating VMs doesn't automatically add them to the LB backend pool; NICs must be associated
3. **Health probe misconfiguration** — wrong port or path means all backends show unhealthy and LB stops forwarding
4. **DNS zone not resolving** — students forget that without NS delegation from the parent domain, public resolution won't work; but they can still verify records with `az network dns record-set list`
5. **Layer 4 vs Layer 7** — Load Balancer is L4 (TCP/UDP); Application Gateway is L7 (HTTP/HTTPS with URL routing, SSL termination, WAF)

---

## Challenge 14 — Azure Monitor & Alerts

> ⏱️ **Coach time estimate**: 40–50 min (students: 60 min) | 🎯 Domain: Monitor & Maintain

### Complete Solution

```bash
RG="rg-az104-challenge14"
az group create --name $RG --location eastus

# Log Analytics workspace
az monitor log-analytics workspace create -g $RG --workspace-name law-contoso --location eastus

# VM for monitoring
az vm create -g $RG --name vm-monitored --image Ubuntu2204 --size Standard_B2s \
  --admin-username azureuser --generate-ssh-keys

# Enable VM Insights via Portal: VM → Insights → Enable

# Diagnostic settings
WORKSPACE_ID=$(az monitor log-analytics workspace show -g $RG \
  --workspace-name law-contoso --query id -o tsv)
VM_ID=$(az vm show -g $RG --name vm-monitored --query id -o tsv)

az monitor diagnostic-settings create --name diag-to-law --resource $VM_ID \
  --workspace $WORKSPACE_ID --metrics '[{"category":"AllMetrics","enabled":true}]'

# Action group
az monitor action-group create -g $RG --name ag-ops-team --short-name OpsTeam \
  --action email ops-email yourname@contoso.com

# Metric alert (CPU > 80%)
az monitor metrics alert create -g $RG --name alert-high-cpu --scopes $VM_ID \
  --condition "avg Percentage CPU > 80" --window-size 5m --evaluation-frequency 1m \
  --action ag-ops-team --severity 2 \
  --description "CPU usage exceeded 80% for 5 minutes"
```

**Key KQL queries for coaching:**

```kusto
// Top processes by CPU
Perf
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| where InstanceName == "_Total"
| summarize AvgCPU = avg(CounterValue) by Computer
| top 10 by AvgCPU desc

// Heartbeat check — which VMs are reporting?
Heartbeat
| summarize LastHeartbeat = max(TimeGenerated) by Computer
| extend Status = iff(LastHeartbeat < ago(5m), "Offline", "Online")

// Error events in last 24h
Syslog
| where SeverityLevel == "error"
| where TimeGenerated > ago(24h)
| project TimeGenerated, Computer, SyslogMessage
| order by TimeGenerated desc
| take 50
```

**Why**: Metrics are numeric time-series (near real-time); Logs are structured text (queried with KQL). The exam tests essential KQL operators: `where`, `summarize`, `ago()`, `project`, `render`. Alert severity: 0=Critical, 1=Error, 2=Warning, 3=Informational, 4=Verbose.

### Common Mistakes

1. **Empty log results** — data takes 15–30 minutes to appear after enabling diagnostics; this is expected, not broken
2. **Alert without action group** — alert fires but nobody is notified; students forget to attach the action group
3. **KQL syntax errors** — `where` uses `==` for equality (not `=`); pipe `|` separates operators
4. **Metric alert vs log alert** — metric alerts are for numeric thresholds (CPU > 80%); log alerts are for KQL query results (error count > 0)
5. **Alert processing rules** — suppress notifications during maintenance windows; students confuse these with alert rules

---

## Challenge 15 — Backup & Recovery

> ⏱️ **Coach time estimate**: 45–55 min (students: 60–75 min) | 🎯 Domain: Monitor & Maintain

### Complete Solution

```bash
RG="rg-az104-challenge15"
az group create --name $RG --location eastus

# Recovery Services vault
az backup vault create -g $RG --name rsv-contoso --location eastus

# VM to back up
az vm create -g $RG --name vm-backup-test --image Ubuntu2204 --size Standard_B1s \
  --admin-username azureuser --generate-ssh-keys

# Enable backup with default policy
az backup protection enable-for-vm -g $RG --vault-name rsv-contoso \
  --vm vm-backup-test --policy-name DefaultPolicy

# On-demand backup
az backup protection backup-now -g $RG --vault-name rsv-contoso \
  --container-name "IaasVMContainer;iaasvmcontainerv2;$RG;vm-backup-test" \
  --item-name "VM;iaasvmcontainerv2;$RG;vm-backup-test" \
  --retain-until "2025-12-31"

# Azure Backup vault (for blobs)
az dataprotection backup-vault create -g $RG --vault-name bv-contoso \
  --location eastus \
  --storage-setting "[{type:LocallyRedundant,datastore-type:VaultStore}]"

# Site Recovery and blob backup are best configured via Portal (see challenge)
```

**Why**: Two vault types — Recovery Services vault (VMs, SQL, Azure Files, Site Recovery) and Azure Backup vault (Blobs, Disks, PostgreSQL). The vault must be in the same region as the VMs being backed up. First backup takes 30–60 min. RPO = max data loss; RTO = max downtime — these terms are exam favorites.

### Common Mistakes

1. **Container name format** — the long `IaasVMContainer;iaasvmcontainerv2;...` format is confusing; guide students to use `az backup container list` to get the exact name
2. **Vault region mismatch** — can't back up a VM in westus2 with a vault in eastus
3. **Deleting vault with protected items** — must stop protection and delete backup data FIRST, then delete the vault
4. **Site Recovery vs Backup confusion** — Backup = data protection (restore files/VMs); Site Recovery = disaster recovery (replicate entire VMs to another region)
5. **Test failover cleanup** — students forget to clean up test failover resources, which keep running and incurring charges

---

## Challenge 16 — Capstone: Day in the Life of an Azure Admin

> ⏱️ **Coach time estimate**: 60–80 min (students: 90–120 min) | 🎯 Domain: All 5 domains

### Complete Solution

**This challenge is a troubleshooting exercise — the value is in the diagnosis process, not just the fix. Guide students through the diagnostic steps before revealing solutions.**

#### Ticket 1 — Identity Crisis

```bash
# Diagnose: Is the account enabled?
az ad user show --id jordan@contoso.com --query accountEnabled
# Diagnose: Is Jordan in the Developers group?
az ad group member check --group "Developers" \
  --member-id $(az ad user show --id jordan@contoso.com --query id -o tsv)

# Fix
az ad user update --id jordan@contoso.com --account-enabled true
az ad user update --id jordan@contoso.com \
  --password "TempP@ss123!" --force-change-password-next-sign-in true
az ad group member add --group "Developers" \
  --member-id $(az ad user show --id jordan@contoso.com --query id -o tsv)
```

**Coaching tip**: Always check the simplest thing first — is the account enabled? Then password, then group membership. This mirrors the exam's "what should you check FIRST?" question pattern.

#### Ticket 2 — Storage SOS

```bash
# Diagnose: Check firewall rules and SAS expiry
az storage account show --name stcontoso -g rg-az104-capstone-storage \
  --query networkRuleSet.defaultAction
# If "Deny" — check IP allow list
# Check if SAS token has expired (decode the `se` parameter in the token)

# Fix: Generate new SAS or add IP to firewall
END_DATE=$(date -u -d "+7 days" '+%Y-%m-%dT%H:%MZ')
az storage account generate-sas --account-name stcontoso \
  --permissions rwdlacup --resource-types sco --services b --expiry $END_DATE -o tsv
```

**Coaching tip**: AuthorizationFailure has three common causes: expired SAS, rotated keys, or firewall blocking. Teach students to check all three systematically.

#### Ticket 3 — VM Down

```bash
# Diagnose: Who stopped it?
az monitor activity-log list -g rg-az104-capstone-compute \
  --query "[?contains(operationName.value,'deallocate')].{Time:eventTimestamp,Caller:caller}" -o table
# Check auto-shutdown
az vm auto-shutdown show -g rg-az104-capstone-compute --name vm-prod-01

# Fix
az vm start -g rg-az104-capstone-compute --name vm-prod-01
az vm auto-shutdown -g rg-az104-capstone-compute --name vm-prod-01 --off
```

**Coaching tip**: The Activity Log is the first place to look for "who did what" questions. It records all control-plane operations with caller identity and timestamps.

#### Ticket 4 — Network Lockout

```bash
# Diagnose: Check NSG rules
az network nsg rule list -g rg-az104-capstone-network --nsg-name nsg-web -o table
# Use IP Flow Verify
az network watcher test-ip-flow -g rg-az104-capstone-network --vm vm-web-01 \
  --direction Inbound --protocol TCP --local 10.0.0.4:443 --remote 0.0.0.0:*

# Fix: Add Allow rule BEFORE the Deny rule (lower priority number)
az network nsg rule create -g rg-az104-capstone-network --nsg-name nsg-web \
  --name Allow-HTTPS --priority 100 --direction Inbound --access Allow \
  --protocol Tcp --destination-port-ranges 443
```

**Coaching tip**: NSG rules are evaluated lowest-number-first. A Deny at priority 200 blocks everything — you need an Allow at a lower number (e.g., 100) to let specific traffic through.

#### Ticket 5 — Where Are My Alerts?

```bash
# Diagnose: Check action group and alert rule
az monitor action-group show -g rg-az104-capstone-monitor --name ag-ops-team
# Look for typos in email addresses!
az monitor metrics alert show -g rg-az104-capstone-monitor \
  --name alert-vm-availability --query isEnabled

# Fix
az monitor action-group update -g rg-az104-capstone-monitor --name ag-ops-team \
  --add-action email ops-email correctemail@contoso.com
az monitor metrics alert update -g rg-az104-capstone-monitor \
  --name alert-vm-availability --enabled true
```

**Coaching tip**: Three things to check when alerts "don't work": (1) Is the alert rule enabled? (2) Is an action group attached? (3) Is the action group configured correctly (email typos are common)?

### Common Mistakes

1. **Jumping to fix without diagnosing** — students want to fix immediately; force them to diagnose first — the exam rewards systematic troubleshooting
2. **Not checking Activity Log** — this is the answer to every "who/when/why" question
3. **NSG priority confusion under pressure** — in timed scenarios, students add rules at wrong priorities
4. **Forgetting to clean up all 5 resource groups** — each ticket has its own RG
5. **Over-engineering the fix** — students want to redesign everything; the capstone rewards targeted, minimal fixes

---

## Workshop Facilitation Timeline

| Block | Duration | Challenges | Focus |
|-------|----------|------------|-------|
| **Day 1 Morning** | 3 hours | 01–03 | Identity & Governance |
| **Day 1 Afternoon** | 3 hours | 04–06 | Storage |
| **Day 2 Morning** | 3 hours | 07–10 | Compute |
| **Day 2 Afternoon** | 2.5 hours | 11–13 | Networking |
| **Day 3 Morning** | 2 hours | 14–15 | Monitor & Maintain |
| **Day 3 Afternoon** | 2 hours | 16 | Capstone |

**Total workshop time**: ~15.5 hours (3 days)

### Tips for Coaches

1. **Let students struggle** — the learning happens when they debug their own mistakes
2. **Use break & fix scenarios** — these simulate real exam questions better than the happy path
3. **Time-box each challenge** — if a student is stuck for >15 min on one task, give a targeted hint
4. **Encourage CLI over Portal** — the exam is scenario-based and CLI knowledge demonstrates deeper understanding
5. **Review cleanup** — students who don't clean up burn through credits; make cleanup a habit after every challenge
6. **Track common blockers** — if >50% of students hit the same issue, pause and address it for everyone
