---
sidebar_position: 2
title: "Challenge 05: Blob Storage & Azure Files"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 05: Blob Storage & Azure Files

> **Estimated time**: 60-75 min | **Estimated cost**: ~$0.50 | **Exam weight**: 15-20%

## Introduction

Contoso's application team stores user profile images, log files, and reports in Azure. Meanwhile, the finance team needs a shared file system they can mount from their Windows desktops | just like the on-prem file server they're used to. You need to set up both Blob Storage (for app data) and Azure Files (for the finance team's shared drive).

Understanding the difference between Blob Storage and Azure Files | and when to use each | is critical for the AZ-104 exam. This challenge gives you hands-on experience with both.

## Exam Skills Covered

- Create and configure blob containers
- Create and configure file shares
- Configure storage tiers (Hot, Cool, Archive)
- Configure soft delete for blobs and containers
- Configure blob snapshots and versioning
- Configure soft delete for Azure Files
- Configure file share snapshots

## Sysadmin ↔ Azure Reference

| On-Prem / Sysadmin | Azure Equivalent | Notes |
|---------------------|------------------|-------|
| Application data folder | Blob container | Unstructured data (images, logs, backups) |
| SMB file share (\\server\share) | Azure Files share | Mountable via SMB 3.0 on Windows/Linux/macOS |
| Volume Shadow Copy | Blob snapshots / File share snapshots | Point-in-time recovery |
| Recycle Bin | Soft delete | Recoverable deletion (configurable retention) |
| File versioning (DFS) | Blob versioning | Automatic version history |
| Tape archive / offsite storage | Archive tier | Lowest cost, hours to retrieve |
| SAN / direct-attached storage | Premium file shares | SSD-backed, low latency |

## Description

### Part 1: Set Up the Environment

1. Create a resource group and storage account:

```bash
RG="rg-blob-files-challenge"
LOCATION="eastus"
STORAGE_NAME="stblobfiles$RANDOM"

az group create --name $RG --location $LOCATION

az storage account create \
  --name $STORAGE_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

# Save the connection string
CONN_STRING=$(az storage account show-connection-string --name $STORAGE_NAME --resource-group $RG -o tsv)
```

### Part 2: Blob Containers & Access Tiers

2. Create three blob containers with different access levels:

```bash
# Private (default): no anonymous access
az storage container create --name app-data --connection-string "$CONN_STRING"

# Private: for sensitive logs
az storage container create --name logs --connection-string "$CONN_STRING"

# Private: for archived reports
az storage container create --name archive --connection-string "$CONN_STRING"
```

3. Create test files and upload blobs to the `app-data` container:

```bash
echo "User profile data for Alice" > profile-alice.txt
echo "User profile data for Bob" > profile-bob.txt
echo "Application log entry 2025-01-15" > app-log-2025-01-15.txt

az storage blob upload --container-name app-data --file profile-alice.txt --name profiles/alice.txt --connection-string "$CONN_STRING"
az storage blob upload --container-name app-data --file profile-bob.txt --name profiles/bob.txt --connection-string "$CONN_STRING"
az storage blob upload --container-name logs --file app-log-2025-01-15.txt --name 2025/01/app-log-2025-01-15.txt --connection-string "$CONN_STRING"
```

4. Change a blob's access tier from Hot to Cool:

```bash
az storage blob set-tier \
  --container-name logs \
  --name "2025/01/app-log-2025-01-15.txt" \
  --tier Cool \
  --connection-string "$CONN_STRING"
```

5. Upload a file to the `archive` container and set it to Archive tier:

```bash
echo "Quarterly Report Q3 2024" > q3-report.txt
az storage blob upload --container-name archive --file q3-report.txt --name reports/q3-2024.txt --connection-string "$CONN_STRING" --tier Archive
```

6. Verify the access tiers:

```bash
az storage blob list --container-name app-data --connection-string "$CONN_STRING" \
  --query "[].{Name:name, Tier:properties.blobTier}" -o table

az storage blob list --container-name logs --connection-string "$CONN_STRING" \
  --query "[].{Name:name, Tier:properties.blobTier}" -o table

az storage blob list --container-name archive --connection-string "$CONN_STRING" \
  --query "[].{Name:name, Tier:properties.blobTier}" -o table
```

### Part 3: Soft Delete for Blobs & Containers

7. Enable soft delete for blobs with a 14-day retention period:

```bash
az storage account blob-service-properties update \
  --account-name $STORAGE_NAME \
  --resource-group $RG \
  --enable-delete-retention true \
  --delete-retention-days 14
```

8. Enable soft delete for containers:

```bash
az storage account blob-service-properties update \
  --account-name $STORAGE_NAME \
  --resource-group $RG \
  --enable-container-delete-retention true \
  --container-delete-retention-days 14
```

9. Test soft delete | delete a blob and then recover it:

```bash
# Delete the blob
az storage blob delete --container-name app-data --name profiles/alice.txt --connection-string "$CONN_STRING"

# List deleted blobs (include soft-deleted)
az storage blob list --container-name app-data --connection-string "$CONN_STRING" --include d \
  --query "[?deleted].{Name:name, Deleted:deleted}" -o table

# Undelete the blob
az storage blob undelete --container-name app-data --name profiles/alice.txt --connection-string "$CONN_STRING"
```

### Part 4: Blob Versioning

10. Enable blob versioning:

```bash
az storage account blob-service-properties update \
  --account-name $STORAGE_NAME \
  --resource-group $RG \
  --enable-versioning true
```

11. Test versioning by uploading a modified version of the same blob:

```bash
echo "Updated profile data for Alice | version 2" > profile-alice-v2.txt
az storage blob upload --container-name app-data --file profile-alice-v2.txt --name profiles/alice.txt --connection-string "$CONN_STRING" --overwrite

# List versions
az storage blob list --container-name app-data --connection-string "$CONN_STRING" --include v \
  --query "[?name=='profiles/alice.txt'].{Name:name, VersionId:versionId, IsCurrentVersion:isCurrentVersion}" -o table
```

### Part 5: Blob Snapshots

12. Create a snapshot of a blob:

```bash
az storage blob snapshot --container-name app-data --name profiles/bob.txt --connection-string "$CONN_STRING"
```

13. List snapshots:

```bash
az storage blob list --container-name app-data --connection-string "$CONN_STRING" --include s \
  --query "[?snapshot!=null].{Name:name, Snapshot:snapshot}" -o table
```

### Part 6: Azure Files | Create & Configure

14. Create an Azure File share for the finance team:

```bash
az storage share-rm create \
  --storage-account $STORAGE_NAME \
  --resource-group $RG \
  --name finance-share \
  --quota 50
```

15. Create directories and upload files to the file share:

```bash
az storage directory create --share-name finance-share --name "reports" --connection-string "$CONN_STRING"
az storage directory create --share-name finance-share --name "invoices" --connection-string "$CONN_STRING"

echo "Budget Report 2025" > budget-2025.txt
az storage file upload --share-name finance-share --source budget-2025.txt --path "reports/budget-2025.txt" --connection-string "$CONN_STRING"
```

16. Show how to mount the file share on Windows:

<Tabs>
<TabItem value="windows" label="Windows (CMD)">

```cmd
REM Get the storage account key
REM Replace <storage-account-name> and <storage-account-key> with your values

net use Z: \\<storage-account-name>.file.core.windows.net\finance-share /u:AZURE\<storage-account-name> <storage-account-key>
```

</TabItem>
<TabItem value="linux" label="Linux">

```bash
# Install cifs-utils if not installed
sudo apt-get install cifs-utils

# Create mount point
sudo mkdir -p /mnt/finance-share

# Mount the file share
sudo mount -t cifs //$STORAGE_NAME.file.core.windows.net/finance-share /mnt/finance-share \
  -o vers=3.0,username=$STORAGE_NAME,password=<storage-account-key>,dir_mode=0777,file_mode=0777
```

</TabItem>
<TabItem value="portal" label="Portal (Connect Script)">

1. Go to your **Storage account** → **File shares** → **finance-share**
2. Click **Connect**
3. Select your OS (Windows / Linux / macOS)
4. Copy and run the auto-generated mount script

</TabItem>
</Tabs>

### Part 7: File Share Snapshots & Soft Delete

17. Enable soft delete for Azure Files:

```bash
az storage account file-service-properties update \
  --account-name $STORAGE_NAME \
  --resource-group $RG \
  --enable-delete-retention true \
  --delete-retention-days 14
```

18. Create a file share snapshot:

```bash
az storage share snapshot --name finance-share --connection-string "$CONN_STRING"
```

19. List snapshots:

```bash
az storage share list --connection-string "$CONN_STRING" --include-snapshots \
  --query "[?name=='finance-share'].{Name:name, Snapshot:snapshot}" -o table
```

## Success Criteria

- [ ] Three blob containers exist: `app-data`, `logs`, `archive`
- [ ] Blobs uploaded with correct virtual directory structure (profiles/, 2025/01/)
- [ ] Log blob tier changed from Hot to Cool
- [ ] Archive blob uploaded directly to Archive tier
- [ ] Blob soft delete enabled (14-day retention)
- [ ] Container soft delete enabled (14-day retention)
- [ ] Successfully deleted and recovered a blob using soft delete
- [ ] Blob versioning enabled and multiple versions of a blob exist
- [ ] A blob snapshot has been created
- [ ] Azure File share `finance-share` exists with directories and files
- [ ] File share snapshot created
- [ ] Azure Files soft delete enabled

## Hints

<details>
<summary>Hint 1: Understanding access tiers</summary>

| Tier | Storage Cost | Access Cost | Retrieval Time | Min Retention | Use Case |
|------|-------------|-------------|----------------|---------------|----------|
| **Hot** | Highest | Lowest | Instant | None | Frequently accessed data |
| **Cool** | Lower | Higher | Instant | 30 days | Infrequent access (monthly) |
| **Cold** | Even lower | Even higher | Instant | 90 days | Rarely accessed |
| **Archive** | Lowest | Highest | Hours (1-15h) | 180 days | Long-term backup, compliance |

:::info

**Early deletion penalty**: If you delete or move a blob from Cool/Archive before the minimum retention period, you're charged as if you kept it for the full period. For example, deleting a blob from Cool after 10 days = charged for 30 days.

:::
</details>

<details>
<summary>Hint 2: Blob versioning vs. snapshots</summary>

| Feature | Versioning | Snapshots |
|---------|-----------|-----------|
| **Trigger** | Automatic on every write | Manual (you create them) |
| **Scope** | Individual blob | Individual blob |
| **Identification** | VersionId (timestamp-based) | Snapshot timestamp |
| **Mutable** | No (versions are immutable) | No (snapshots are read-only) |
| **Deletable** | Yes (delete specific versions) | Yes (delete specific snapshots) |
| **Use case** | Audit trail, automatic history | Point-in-time backup |

**Exam tip**: Versioning is the modern, recommended approach. Snapshots are legacy but still tested.

</details>

<details>
<summary>Hint 3: Rehydrating an archived blob</summary>

Archived blobs cannot be read directly. You must first **rehydrate** them:

```bash
# Change tier from Archive to Hot (standard priority: up to 15 hours)
az storage blob set-tier \
  --container-name archive \
  --name reports/q3-2024.txt \
  --tier Hot \
  --connection-string "$CONN_STRING"

# High priority rehydration (faster, more expensive: under 1 hour for < 10 GB)
az storage blob set-tier \
  --container-name archive \
  --name reports/q3-2024.txt \
  --tier Hot \
  --rehydrate-priority High \
  --connection-string "$CONN_STRING"
```

</details>

<details>
<summary>Hint 4: Azure Files | SMB port requirements</summary>

Azure Files uses **SMB 3.0** over **TCP port 445**. Many ISPs and corporate firewalls block this port.

To check if port 445 is open:
```powershell
Test-NetConnection -ComputerName <storage-account>.file.core.windows.net -Port 445
```

If port 445 is blocked, alternatives include:
- **Azure VPN Gateway** (connect via VPN)
- **Azure File Sync** (sync to on-prem server)
- **REST API** (programmatic access, no SMB needed)

</details>

<details>
<summary>Hint 5: Blob vs. Azure Files decision guide</summary>

| Scenario | Use |
|----------|-----|
| App stores/reads unstructured data (images, logs) | **Blob Storage** |
| Users need a mapped drive (Z:) | **Azure Files** |
| Streaming media or CDN origin | **Blob Storage** |
| Lift-and-shift of on-prem file server | **Azure Files** |
| Data lake for analytics | **Blob Storage (Data Lake Gen2)** |
| Shared config files across VMs | **Azure Files** |

</details>

## Learning Resources

- [Azure Blob Storage overview](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-overview)
- [Access tiers for blob data](https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview)
- [Soft delete for blobs](https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview)
- [Blob versioning](https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview)
- [Azure Files overview](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-introduction)
- [Azure Files planning guide](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-planning)

## Break & Fix

After completing the challenge, try these troubleshooting scenarios:

1. **Archived blob surprise**: Try to download the blob you set to Archive tier. What error do you get? (`BlobArchived` | you must rehydrate first.) How long does standard rehydration take?

2. **Soft delete confusion**: Delete a blob, then delete the same blob again after recreating it. How many soft-deleted versions exist? Can you recover a specific one?

3. **File share mount failure**: Try to mount the Azure File share from a network where port 445 is blocked. What error do you see? What are the workaround options?

4. **Snapshot vs. versioning overlap**: Enable both versioning and snapshots on the same container. Upload a file, create a snapshot, then overwrite the file. How many copies exist now? (Original version, snapshot of original, and new current version = 3 copies.)

## Knowledge Check

<details>
<summary>1. What is the cost difference between Hot, Cool, and Archive tiers?</summary>

**Storage costs** (per GB/month, approximate for LRS in East US):
- Hot: ~$0.018/GB
- Cool: ~$0.010/GB
- Archive: ~$0.002/GB

**Access costs** (per 10,000 read operations):
- Hot: ~$0.004
- Cool: ~$0.01
- Archive: ~$5.00 (plus rehydration cost)

**Key insight**: Archive is 9x cheaper to store but 1,250x more expensive to read. Only use it for data you rarely need to access.

</details>

<details>
<summary>2. When should you use Blob Storage vs. Azure Files?</summary>

**Use Blob Storage when**:
- Applications access data via REST API or SDKs
- You need scalable storage for unstructured data (images, videos, logs)
- You want to use access tiers (Hot/Cool/Archive)
- You're building a data lake

**Use Azure Files when**:
- Applications use standard file system APIs (SMB/NFS)
- You need a shared file system across multiple VMs
- You're migrating an on-prem file server ("lift and shift")
- You need POSIX-compliant file access

</details>

<details>
<summary>3. What is the maximum size of an Azure File share?</summary>

- **Standard file shares**: Up to **100 TiB** (with large file shares enabled; default is 5 TiB)
- **Premium file shares**: Up to **100 TiB** (provisioned capacity model)
- **Maximum file size**: 4 TiB per individual file
- **Maximum directory depth**: No practical limit, but the full path cannot exceed 2,048 characters

</details>

<details>
<summary>4. Can you change a blob's tier without re-uploading it?</summary>

**Yes!** You can change the tier of an existing blob at any time using:
- Azure Portal (blob properties)
- Azure CLI: `az storage blob set-tier`
- REST API / SDKs

Tier changes from **Archive** require **rehydration**, which can take hours. Changes between **Hot**, **Cool**, and **Cold** tiers are instantaneous.

Note: Changing tier incurs a **write operation charge** at the destination tier's rate, plus an early deletion fee if the blob hasn't met the minimum retention period for its current tier.

</details>

## Cleanup

```bash
# Delete the resource group (removes storage account and all data)
az group delete --name rg-blob-files-challenge --yes --no-wait

# Clean up local files
rm -f profile-alice.txt profile-bob.txt profile-alice-v2.txt app-log-2025-01-15.txt q3-report.txt budget-2025.txt
```

---

**Next**: [Challenge 06 | Storage Security & Lifecycle](/docs/az-104/storage/challenge-06)
