---
sidebar_position: 3
title: "Challenge 06: Storage Security & Lifecycle"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 06: Storage security & lifecycle

:::info Estimated Time and Cost

**60-75 min** | **Estimated cost**: ~$1.00 (two storage accounts) | **Exam Weight: 15-20%**

:::

## Introduction

Contoso's Azure storage bill tripled last quarter. The culprit: nobody is cleaning up old data. Log files from 2023 are sitting in Hot storage alongside current production data, and there's no automated policy to move aging data to cheaper tiers. On top of that, the security team wants identity-based access for Azure Files instead of shared keys, and the compliance team needs data replicated to a second region.

Your mission: implement lifecycle management policies to control costs, configure identity-based access, and set up cross-region object replication for business continuity.

## Exam skills covered

- Configure identity-based access for Azure Files
- Create and configure stored access policies
- Configure lifecycle management policies
- Configure object replication between storage accounts

## Sysadmin ↔ Azure reference

| On-Prem / Sysadmin | Azure Equivalent | Notes |
|---------------------|------------------|-------|
| File server quota & archival policies | Lifecycle management | Automate tier transitions & deletion |
| DFS Replication | Object replication | Async cross-region blob replication |
| NTFS ACLs on file shares | Identity-based access (Entra ID) | Per-user/group file share permissions |
| Data retention policies | Lifecycle management rules | Automated data cleanup by age |
| Archive to tape | Tier to Archive after N days | Cold storage, hours to retrieve |
| Backup to DR site | GRS + Object replication | Geographic redundancy |

## Description

### Part 1: set up the environment

1. Create two storage accounts in different regions (needed for object replication):

```bash
RG="rg-lifecycle-challenge"
LOCATION_PRIMARY="eastus"
LOCATION_SECONDARY="westus2"
STORAGE_PRIMARY="stlifecyclepri$RANDOM"
STORAGE_SECONDARY="stlifecyclesec$RANDOM"

az group create --name $RG --location $LOCATION_PRIMARY

# Primary storage account
az storage account create \
  --name $STORAGE_PRIMARY \
  --resource-group $RG \
  --location $LOCATION_PRIMARY \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

# Secondary storage account (different region)
az storage account create \
  --name $STORAGE_SECONDARY \
  --resource-group $RG \
  --location $LOCATION_SECONDARY \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot
```

2. Enable blob versioning on both accounts (required for object replication) and enable change feed on the source:

```bash
# Enable versioning on both accounts
az storage account blob-service-properties update \
  --account-name $STORAGE_PRIMARY --resource-group $RG \
  --enable-versioning true --enable-change-feed true

az storage account blob-service-properties update \
  --account-name $STORAGE_SECONDARY --resource-group $RG \
  --enable-versioning true
```

3. Create containers and upload test data:

```bash
CONN_PRIMARY=$(az storage account show-connection-string --name $STORAGE_PRIMARY --resource-group $RG -o tsv)
CONN_SECONDARY=$(az storage account show-connection-string --name $STORAGE_SECONDARY --resource-group $RG -o tsv)

# Create containers on primary
az storage container create --name app-logs --connection-string "$CONN_PRIMARY"
az storage container create --name documents --connection-string "$CONN_PRIMARY"
az storage container create --name replicated-data --connection-string "$CONN_PRIMARY"

# Create matching container on secondary for replication
az storage container create --name replicated-data --connection-string "$CONN_SECONDARY"

# Upload test data
for i in $(seq 1 10); do
  echo "Log entry $i | $(date -u +%Y-%m-%dT%H:%M:%SZ)" > log-$i.txt
  az storage blob upload --container-name app-logs --file log-$i.txt --name "2025/01/log-$i.txt" --connection-string "$CONN_PRIMARY" --overwrite 2>/dev/null
done

echo "Important document for replication test" > repl-test.txt
az storage blob upload --container-name replicated-data --file repl-test.txt --name repl-test.txt --connection-string "$CONN_PRIMARY"
```

### Part 2: lifecycle Management Policies

4. Create a lifecycle management policy with the following rules:

:::info

**Lifecycle management** automatically transitions blobs between tiers and deletes them based on age. This is the primary tool for controlling storage costs at scale.

:::
<Tabs>
<TabItem value="cli" label="Azure CLI">

```bash
cat <<'EOF' > lifecycle-policy.json
{
  "rules": [
    {
      "enabled": true,
      "name": "MoveToCoolAfter30Days",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "tierToCool": {
              "daysAfterModificationGreaterThan": 30
            }
          }
        },
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["app-logs/"]
        }
      }
    },
    {
      "enabled": true,
      "name": "MoveToArchiveAfter90Days",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "tierToArchive": {
              "daysAfterModificationGreaterThan": 90
            }
          }
        },
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["app-logs/"]
        }
      }
    },
    {
      "enabled": true,
      "name": "DeleteAfter365Days",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "delete": {
              "daysAfterModificationGreaterThan": 365
            }
          }
        },
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["app-logs/"]
        }
      }
    },
    {
      "enabled": true,
      "name": "CleanupSnapshots",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "snapshot": {
            "delete": {
              "daysAfterCreationGreaterThan": 90
            }
          },
          "version": {
            "delete": {
              "daysAfterCreationGreaterThan": 90
            }
          }
        },
        "filters": {
          "blobTypes": ["blockBlob"]
        }
      }
    }
  ]
}
EOF

az storage account management-policy create \
  --account-name $STORAGE_PRIMARY \
  --resource-group $RG \
  --policy @lifecycle-policy.json
```

</TabItem>
<TabItem value="portal" label="Portal">

1. Go to your **Storage account** → **Data management** → **Lifecycle management**
2. Click **+ Add a rule**
3. **Rule 1**: Name: `MoveToCoolAfter30Days`
   - Scope: Limit blobs with filters → Prefix: `app-logs/`
   - Base blobs: Move to Cool storage → 30 days after last modification
4. **Rule 2**: Name: `MoveToArchiveAfter90Days`
   - Same filter → Move to Archive storage → 90 days after last modification
5. **Rule 3**: Name: `DeleteAfter365Days`
   - Same filter → Delete the blob → 365 days after last modification
6. **Rule 4**: Name: `CleanupSnapshots`
   - No prefix filter → Delete snapshots → 90 days after creation
   - Delete versions → 90 days after creation

</TabItem>
</Tabs>

5. Verify the lifecycle policy:

```bash
az storage account management-policy show \
  --account-name $STORAGE_PRIMARY \
  --resource-group $RG \
  --query "policy.rules[].{Name:name, Enabled:enabled}" -o table
```

### Part 3: Identity-Based access for Azure Files

:::tip

Identity-based access lets users authenticate to Azure File shares using their Entra ID credentials instead of storage account keys. This is more secure and allows per-user/group NTFS-like permissions.

:::
6. Create a file share for identity-based access:

```bash
az storage share-rm create \
  --storage-account $STORAGE_PRIMARY \
  --resource-group $RG \
  --name secure-share \
  --quota 50
```

7. Enable Entra ID Domain Services authentication for the storage account:

<Tabs>
<TabItem value="cli" label="Azure CLI">

```bash
# Enable Entra ID kerberos authentication
az storage account update \
  --name $STORAGE_PRIMARY \
  --resource-group $RG \
  --enable-files-aadkerb true
```

:::note

Full Entra ID Kerberos authentication for Azure Files requires additional setup including configuring the Kerberos ticket-granting-ticket and setting up share-level and directory/file-level permissions. For this challenge, enabling the feature flag is sufficient.

:::
</TabItem>
<TabItem value="portal" label="Portal">

1. Go to your **Storage account** → **File shares** → **Active Directory**
2. Under **Identity-based access**, click **Set up** next to **Microsoft Entra Kerberos**
3. Follow the wizard to enable Entra ID authentication

</TabItem>
</Tabs>

8. Assign share-level RBAC permissions:

```bash
# Assign "Storage file Data SMB share contributor" role to a user or group
# This allows read/write access to the file share via SMB
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
STORAGE_ID=$(az storage account show --name $STORAGE_PRIMARY --resource-group $RG --query id -o tsv)

# Replace with your actual user or group object ID
# USER_ID=$(az ad user show --id "alice@YOUR_TENANT.onmicrosoft.com" --query id -o tsv)
# az role assignment create \
# --assignee $user_id \
# --role "Storage file Data SMB share contributor" \
# --scope "$STORAGE_ID/fileServices/default/fileshares/secure-share"
```

:::info

Azure Files identity-based access uses a **two-layer permission model**:
1. **Share-level permissions**: Assigned via RBAC (Storage File Data SMB Share Reader/Contributor/Elevated Contributor)
2. **Directory/file-level permissions**: Configured using Windows NTFS ACLs after mounting the share

The effective permission is the **intersection** of both layers | a user needs both share-level and directory-level access.

:::
### Part 4: object Replication

9. Set up object replication from the primary account to the secondary account:

<Tabs>
<TabItem value="cli" label="Azure CLI">

```bash
# Create a replication policy
cat <<EOF > replication-policy.json
{
  "sourceAccount": "$STORAGE_PRIMARY",
  "destinationAccount": "$STORAGE_SECONDARY",
  "rules": [
    {
      "sourceContainer": "replicated-data",
      "destinationContainer": "replicated-data",
      "filters": {
        "minCreationTime": "2024-01-01T00:00:00Z"
      }
    }
  ]
}
EOF

az storage account or-policy create \
  --account-name $STORAGE_SECONDARY \
  --resource-group $RG \
  --source-account $STORAGE_PRIMARY \
  --destination-account $STORAGE_SECONDARY \
  --rules @replication-policy.json
```

</TabItem>
<TabItem value="portal" label="Portal">

1. Go to the **destination** storage account → **Data management** → **Object replication**
2. Click **Set up replication rules**
3. Select the **source** storage account
4. Pair the containers: `replicated-data` (source) → `replicated-data` (destination)
5. Optionally filter by creation time or prefix
6. Click **Save**

</TabItem>
</Tabs>

10. Verify replication is configured:

```bash
# Check replication policies on the destination account
az storage account or-policy list --account-name $STORAGE_SECONDARY --resource-group $RG -o table
```

11. Upload a new blob to the source and verify it replicates:

```bash
echo "New data to replicate | $(date -u)" > new-repl-data.txt
az storage blob upload --container-name replicated-data --file new-repl-data.txt --name new-repl-data.txt --connection-string "$CONN_PRIMARY" --overwrite

# Wait a few minutes, then check the destination
sleep 60
az storage blob list --container-name replicated-data --connection-string "$CONN_SECONDARY" \
  --query "[].{Name:name, LastModified:properties.lastModified}" -o table
```

:::warning

Object replication is **asynchronous**. It may take several minutes for blobs to appear in the destination account. There is no SLA on replication time for standard accounts.

:::
### Part 5: stored access Policies (Revisited)

12. Create stored access policies for fine-grained control:

```bash
END_DATE=$(date -u -d "+7 days" '+%Y-%m-%dT%H:%MZ' 2>/dev/null || date -u -v+7d '+%Y-%m-%dT%H:%MZ')

# Read-only policy for app-logs
az storage container policy create \
  --container-name app-logs \
  --name "LogReadersPolicy" \
  --permissions rl \
  --expiry "$END_DATE" \
  --connection-string "$CONN_PRIMARY"

# Read-write policy for documents
az storage container policy create \
  --container-name documents \
  --name "DocEditorsPolicy" \
  --permissions rwdl \
  --expiry "$END_DATE" \
  --connection-string "$CONN_PRIMARY"
```

13. Generate SAS tokens from the stored access policies:

```bash
# SAS from the LogReadersPolicy
LOG_SAS=$(az storage container generate-sas \
  --name app-logs \
  --policy-name "LogReadersPolicy" \
  --connection-string "$CONN_PRIMARY" \
  -o tsv)

echo "Log Reader SAS: $LOG_SAS"

# Test the SAS by listing blobs
az storage blob list --container-name app-logs \
  --account-name $STORAGE_PRIMARY \
  --sas-token "$LOG_SAS" \
  --query "[].name" -o tsv
```

14. Revoke access by deleting the stored access policy:

```bash
# This immediately invalidates all SAS tokens linked to this policy
az storage container policy delete \
  --container-name app-logs \
  --name "LogReadersPolicy" \
  --connection-string "$CONN_PRIMARY"
```

## Success criteria

<SuccessChecklist
  storageKey="az104-challenge-06"
  items={[
    "Two storage accounts exist in different regions with versioning enabled",
    "Lifecycle management policy has 4 rules: Cool after 30d, Archive after 90d, Delete after 365d, Cleanup snapshots after 90d",
    "Lifecycle policy targets the app-logs/ prefix",
    "File share secure-share exists with Entra ID Kerberos enabled",
    "Object replication is configured from primary to secondary for replicated-data container",
    "Replication can be verified (blob appears in destination)",
    "Stored access policies created and tested",
    "SAS revocation via policy deletion demonstrated"
  ]}
/>
## Hints

<details>
<summary>Hint 1: Lifecycle policy rule conditions</summary>

Lifecycle rules support these conditions:

| Condition | Description | Example |
|-----------|-------------|---------|
| `daysAfterModificationGreaterThan` | Days since the blob was last modified | Move to Cool after 30 days idle |
| `daysAfterCreationGreaterThan` | Days since the blob was created | Delete temporary files after 7 days |
| `daysAfterLastAccessTimeGreaterThan` | Days since last read (requires access tracking) | Archive unread data after 60 days |
| `daysAfterLastTierChangeGreaterThan` | Days since tier was last changed | Prevent rapid tier changes |

:::tip

To use `daysAfterLastAccessTimeGreaterThan`, you must enable **last access time tracking** on the storage account:
```bash
az storage account blob-service-properties update \
  --account-name $STORAGE_PRIMARY --resource-group $RG \
  --enable-last-access-tracking true
```

:::
</details>

<details>
<summary>Hint 2: Object replication prerequisites</summary>

Object replication requires:
1. **Blob versioning** enabled on both source and destination accounts
2. **Change feed** enabled on the source account
3. Both accounts must be **StorageV2** (General Purpose v2) or **BlobStorage**
4. Accounts can be in **different regions** (cross-region replication)
5. Accounts can be in **different subscriptions** (cross-subscription replication)
6. Accounts must **not** have an immutability policy on the destination container

Object replication does **not** support:
- Blob snapshots (only the current version is replicated)
- Blobs in the Archive tier
- Blobs encrypted with customer-provided keys

</details>

<details>
<summary>Hint 3: Identity-based access role reference</summary>

| RBAC Role | Permission Level |
|-----------|-----------------|
| Storage File Data SMB Share Reader | Read access to files and directories |
| Storage File Data SMB Share Contributor | Read, write, delete access to files and directories |
| Storage File Data SMB Share Elevated Contributor | Read, write, delete, modify NTFS ACLs |

Assign these roles at the **file share scope** (not the storage account scope):
```
/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/{account}/fileServices/default/fileshares/{share}
```

</details>

<details>
<summary>Hint 4: Lifecycle policy limits</summary>

- Maximum **100 rules** per policy
- Each rule can have multiple actions (tier transitions, deletion)
- Actions are processed once per day (not in real-time)
- Prefix filters match from the beginning of the blob name
- You can combine prefix filters with blob index tag filters

</details>

<details>
<summary>Hint 5: Troubleshooting object replication</summary>

```bash
# Check replication status on a specific blob
az storage blob show \
  --container-name replicated-data \
  --name repl-test.txt \
  --account-name $STORAGE_PRIMARY \
  --query "properties.objectReplicationSourceProperties" \
  --connection-string "$CONN_PRIMARY"

# List all replication policies
az storage account or-policy list --account-name $STORAGE_SECONDARY --resource-group $RG

# Check rules within a policy
POLICY_ID=$(az storage account or-policy list --account-name $STORAGE_SECONDARY --resource-group $RG --query "[0].policyId" -o tsv)
az storage account or-policy rule list --account-name $STORAGE_SECONDARY --resource-group $RG --policy-id $POLICY_ID -o table
```

</details>

## Learning resources

- [Lifecycle management overview](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)
- [Configure lifecycle management policy](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)
- [Object replication overview](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview)
- [Identity-based access for Azure Files](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-active-directory-overview)
- [Stored access policies](https://learn.microsoft.com/en-us/rest/api/storageservices/define-stored-access-policy)
- [Configure Microsoft Entra Kerberos for Azure Files](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-identity-auth-azure-active-directory-enable)

## Break & fix

After completing the challenge, try these troubleshooting scenarios:

1. **Lifecycle policy conflict**: Create a rule that moves blobs to Archive after 30 days AND another rule that moves blobs to Cool after 60 days. What happens? (The Archive rule wins because it acts first. Lifecycle applies the most aggressive action for a given age.)

2. **Replication not working**: Object replication is configured but blobs aren't appearing in the destination. Check:
   - Is versioning enabled on **both** accounts?
   - Is change feed enabled on the **source** account?
   - Is the blob in the Archive tier? (Archived blobs are not replicated.)
   - Has enough time passed? (Replication is async, can take minutes.)

3. **SAS token still works after policy deletion**: You deleted a stored access policy, but the SAS token from that policy should stop working. Test this. If it still works, check whether the SAS was generated with an explicit expiry (standalone SAS) or was truly policy-linked.

4. **Identity-based access denied**: A user has `Storage File Data SMB Share Contributor` at the share level but gets "Access Denied" when opening a folder. What's wrong? (Directory-level NTFS ACLs may be restricting access | remember the two-layer model.)

## Knowledge check

<details>
<summary>1. What are the conditions you can use in lifecycle management rules?</summary>

**Base blob conditions**:
- `daysAfterModificationGreaterThan` | days since last modification
- `daysAfterCreationGreaterThan` | days since creation
- `daysAfterLastAccessTimeGreaterThan` | days since last read (requires access tracking)
- `daysAfterLastTierChangeGreaterThan` | days since tier was last changed

**Snapshot/version conditions**:
- `daysAfterCreationGreaterThan` | days since the snapshot/version was created

**Filter options**:
- `blobTypes` | filter by block blob, append blob
- `prefixMatch` | filter by blob name prefix (e.g., `logs/`)
- `blobIndexMatch` | filter by blob index tags

**Exam tip**: Know the difference between `daysAfterModification` and `daysAfterCreation`. Modification resets whenever the blob is written to; creation is set once.

</details>

<details>
<summary>2. What are the prerequisites for object replication?</summary>

1. **Blob versioning** must be enabled on both the source and destination accounts
2. **Change feed** must be enabled on the source account
3. Both accounts must be **General Purpose v2** (StorageV2) or BlobStorage
4. Source and destination can be in **different regions** and **different subscriptions**
5. Destination container must **not** have a blob immutability policy
6. Blobs in the **Archive** tier are **not** replicated
7. Blobs encrypted with **customer-provided keys** are not replicated
8. The source account's `AllowCrossTenantReplication` must be true for cross-tenant scenarios

</details>

<details>
<summary>3. What is the two-layer permission model for Azure Files identity-based access?</summary>

**Layer 1: Share-level permissions** (RBAC)
- Assigned using Azure RBAC roles at the file share scope
- Roles: Reader, Contributor, Elevated Contributor
- Controls who can access the share at all

**Layer 2: Directory/file-level permissions** (NTFS ACLs)
- Configured using Windows ACL tools (icacls, Windows Explorer properties)
- Requires mounting the share first
- Controls granular access within the share

**Effective permission = intersection of both layers**

A user must have both share-level AND directory-level access. If RBAC grants Contributor but NTFS ACLs deny read on a folder, the user cannot read that folder.

</details>

<details>
<summary>4. How often does lifecycle management run?</summary>

Lifecycle management runs **once per day**. The exact timing is not guaranteed | Azure processes lifecycle rules at least once every 24 hours, but there is no SLA on the exact execution time.

For a newly created or modified policy, the first run may take up to **24 hours** to start. After that, it runs daily.

**Important**: This means lifecycle management is **not** suitable for real-time data management. If you need immediate tier changes, use `az storage blob set-tier` or the REST API directly.

</details>

<details>
<summary>5. Can you replicate blobs between storage accounts in different subscriptions?</summary>

**Yes!** Object replication supports:
- **Same region** replication
- **Cross-region** replication
- **Cross-subscription** replication
- **Cross-tenant** replication (if `AllowCrossTenantReplication` is enabled)

The destination account creates the replication policy and specifies the source account. Both accounts must meet the prerequisites (versioning, change feed, etc.).

</details>

## Cleanup

```bash
# Delete the resource group (removes both storage accounts and all data)
az group delete --name rg-lifecycle-challenge --yes --no-wait

# Clean up local files
rm -f lifecycle-policy.json replication-policy.json
rm -f log-*.txt repl-test.txt new-repl-data.txt
```

---

**Next**: [Challenge 07 | ARM Templates & Bicep](/docs/az-104/compute/challenge-07)
