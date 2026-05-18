---
sidebar_position: 19
title: "Challenge 19: AzCopy & Storage Migration"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 19: AzCopy & Storage Migration

:::info Estimated Time and Cost

**60-75 minutes** | **Estimated cost**: ~$0.50 | **Exam Weight: 15-20%**


:::
## Scenario

Contoso Ltd. is consolidating storage after acquiring a smaller company. You need to migrate terabytes of blob data between storage accounts, copy data across regions for disaster recovery, and set up ongoing synchronization for a file share. The operations team has been using the Azure Portal to download and re-upload files manually | which takes days. You will introduce them to AzCopy and Storage Explorer for efficient, high-performance data movement.

## Exam Skills Covered

| Skill | Weight |
|-------|--------|
| Configure and use AzCopy for data transfer | High |
| Manage data by using Azure Storage Explorer | Medium |
| Copy data between storage accounts | High |
| Configure object replication | Medium |
| Use SAS tokens for authentication with AzCopy | High |

## Sysadmin ↔ Azure Reference

| On-Prem / Sysadmin | Azure Equivalent | Notes |
|---------------------|------------------|-------|
| Robocopy /MIR | azcopy sync | Mirror source to destination |
| xcopy /s | azcopy copy --recursive | Recursive copy operations |
| rsync over SSH | azcopy copy (service-to-service) | Direct server-side copy |
| SCP with key auth | AzCopy + SAS token | Token-based authentication |
| Windows Explorer drag-and-drop | Azure Storage Explorer | GUI-based file management |
| Scheduled robocopy task | azcopy sync in cron/Task Scheduler | Ongoing synchronization |
| Performance testing with iperf | azcopy bench | Benchmark transfer throughput |

## Tasks

### Task 1: Set Up the Lab Environment

Create two storage accounts to simulate a migration scenario:

```bash
# Create resource group
az group create --name rg-azcopy-lab --location eastus

# Create source storage account
az storage account create \
  --name stsource$RANDOM \
  --resource-group rg-azcopy-lab \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Create destination storage account (different region for DR scenario)
az storage account create \
  --name stdest$RANDOM \
  --resource-group rg-azcopy-lab \
  --location westus2 \
  --sku Standard_LRS \
  --kind StorageV2

# Store account names for later use
SOURCE_ACCOUNT=$(az storage account list -g rg-azcopy-lab --query "[?contains(name,'source')].name" -o tsv | head -1)
DEST_ACCOUNT=$(az storage account list -g rg-azcopy-lab --query "[?contains(name,'dest')].name" -o tsv | head -1)

# Create containers
az storage container create --name documents --account-name $SOURCE_ACCOUNT --auth-mode login
az storage container create --name backups --account-name $SOURCE_ACCOUNT --auth-mode login
az storage container create --name documents --account-name $DEST_ACCOUNT --auth-mode login
az storage container create --name archives --account-name $DEST_ACCOUNT --auth-mode login

# Upload sample files to source
for i in $(seq 1 10); do
  echo "This is document $i content for migration testing at $(date)" > doc$i.txt
  az storage blob upload \
    --container-name documents \
    --file doc$i.txt \
    --name "folder1/doc$i.txt" \
    --account-name $SOURCE_ACCOUNT \
    --auth-mode login
done

# Create a larger file for performance testing
dd if=/dev/urandom of=largefile.bin bs=1M count=50 2>/dev/null
az storage blob upload \
  --container-name documents \
  --file largefile.bin \
  --name "data/largefile.bin" \
  --account-name $SOURCE_ACCOUNT \
  --auth-mode login

# Cleanup local temp files
rm -f doc*.txt largefile.bin
```

### Task 2: Install and Authenticate AzCopy

```bash
# Check if AzCopy is installed
azcopy --version

# Login with Entra ID (interactive)
azcopy login

# Alternative: Login with tenant ID
azcopy login --tenant-id $(az account show --query tenantId -o tsv)
```

:::tip AzCopy Installation

If AzCopy is not installed:
- **Linux**: `wget https://aka.ms/downloadazcopy-v10-linux && tar -xf downloadazcopy* && sudo mv azcopy_linux*/azcopy /usr/local/bin/`
- **Windows**: Download from https://aka.ms/downloadazcopy-v10-windows
- **macOS**: `brew install azcopy`


:::
### Task 3: Copy Blobs Between Containers (Same Account)

```bash
# Copy all blobs from documents to backups container (same account)
azcopy copy \
  "https://$SOURCE_ACCOUNT.blob.core.windows.net/documents/*" \
  "https://$SOURCE_ACCOUNT.blob.core.windows.net/backups/" \
  --recursive

# List the copied files
az storage blob list \
  --container-name backups \
  --account-name $SOURCE_ACCOUNT \
  --auth-mode login \
  --query "[].name" -o tsv
```

### Task 4: Copy Blobs Between Storage Accounts Using SAS Tokens

Generate SAS tokens and perform cross-account copy:

```bash
# Generate SAS token for source (read + list)
SOURCE_SAS=$(az storage account generate-sas \
  --account-name $SOURCE_ACCOUNT \
  --permissions rl \
  --resource-types co \
  --services b \
  --expiry $(date -u -d "+1 hour" +%Y-%m-%dT%H:%MZ) \
  -o tsv)

# Generate SAS token for destination (write + create + add)
DEST_SAS=$(az storage account generate-sas \
  --account-name $DEST_ACCOUNT \
  --permissions wca \
  --resource-types co \
  --services b \
  --expiry $(date -u -d "+1 hour" +%Y-%m-%dT%H:%MZ) \
  -o tsv)

# Copy between accounts using SAS tokens (server-side copy)
azcopy copy \
  "https://$SOURCE_ACCOUNT.blob.core.windows.net/documents?$SOURCE_SAS" \
  "https://$DEST_ACCOUNT.blob.core.windows.net/documents?$DEST_SAS" \
  --recursive

# Verify the copy
az storage blob list \
  --container-name documents \
  --account-name $DEST_ACCOUNT \
  --auth-mode login \
  --query "[].{Name:name, Size:properties.contentLength}" -o table
```

### Task 5: Sync Operations (Mirror Source to Destination)

```bash
# Add new files to source
echo "New file added after initial copy" > newfile.txt
az storage blob upload \
  --container-name documents \
  --file newfile.txt \
  --name "folder1/newfile.txt" \
  --account-name $SOURCE_ACCOUNT \
  --auth-mode login

# Sync: Only copies new/modified files (does not delete extras at destination)
azcopy sync \
  "https://$SOURCE_ACCOUNT.blob.core.windows.net/documents" \
  "https://$DEST_ACCOUNT.blob.core.windows.net/documents" \
  --recursive

# Sync with delete-destination flag (mirror behavior like robocopy /MIR)
azcopy sync \
  "https://$SOURCE_ACCOUNT.blob.core.windows.net/documents" \
  "https://$DEST_ACCOUNT.blob.core.windows.net/documents" \
  --recursive \
  --delete-destination=true

rm -f newfile.txt
```

### Task 6: Benchmark Transfer Performance

```bash
# Benchmark upload performance to the destination account
azcopy bench \
  "https://$DEST_ACCOUNT.blob.core.windows.net/archives" \
  --file-count 100 \
  --size-per-file 1M

# Benchmark with larger files
azcopy bench \
  "https://$DEST_ACCOUNT.blob.core.windows.net/archives" \
  --file-count 5 \
  --size-per-file 100M
```

### Task 7: Use AzCopy with Include/Exclude Patterns

```bash
# Copy only .txt files
azcopy copy \
  "https://$SOURCE_ACCOUNT.blob.core.windows.net/documents/*" \
  "https://$DEST_ACCOUNT.blob.core.windows.net/archives/" \
  --recursive \
  --include-pattern "*.txt"

# Copy everything except .bin files
azcopy copy \
  "https://$SOURCE_ACCOUNT.blob.core.windows.net/documents/*" \
  "https://$DEST_ACCOUNT.blob.core.windows.net/archives/" \
  --recursive \
  --exclude-pattern "*.bin"
```

### Task 8: View Job History and Logs

```bash
# List recent AzCopy jobs
azcopy jobs list

# Show details of the most recent job
azcopy jobs show <job-id>

# View the log file location
azcopy env
```

## Success Criteria

<SuccessChecklist
  storageKey="az104-challenge-19"
  items={[
    "Two storage accounts exist in different regions",
    "AzCopy is installed and authenticated",
    "Blobs were copied between containers within the same account",
    "Blobs were copied between accounts using SAS tokens",
    "Sync operation detected and copied only new/modified files",
    "Benchmark completed and throughput metrics were observed",
    "Pattern-based filtering (include/exclude) was used successfully",
    "AzCopy job history shows completed transfers"
  ]}
/>
## Hints

<details>
<summary>Hint 1: AzCopy authentication methods</summary>

AzCopy supports three authentication methods:
1. **Entra ID (azcopy login)** | Best for interactive use and RBAC-based access
2. **SAS tokens** | Appended to the URL, time-limited, best for automation
3. **Storage account key** | Set via `ACCOUNT_KEY` environment variable (not recommended)

For the exam, know that service-to-service copy (between accounts) requires SAS tokens on both sides OR Entra ID login with appropriate RBAC roles on both accounts.

</details>

<details>
<summary>Hint 2: Copy vs Sync</summary>

- **azcopy copy** | Always copies all specified files regardless of whether they exist at the destination
- **azcopy sync** | Only copies files that are new or modified (compares last-modified timestamps). Optionally deletes destination files not present in source (--delete-destination)

</details>

<details>
<summary>Hint 3: SAS token permissions for copy</summary>

For cross-account copy:
- **Source** needs: Read (r), List (l) permissions
- **Destination** needs: Write (w), Create (c), Add (a) permissions

If you get 403 errors, check that both SAS tokens have the correct permissions and have not expired.

</details>

<details>
<summary>Hint 4: Increasing transfer speed</summary>

Set the `AZCOPY_CONCURRENCY_VALUE` environment variable to increase parallel connections (default is based on CPU cores). For high-bandwidth networks, try values like 300-500. Also ensure storage account egress limits are not being hit.

</details>

## Break and Fix

### Scenario A: SAS Token Expired

Generate a SAS token with a 1-minute expiry. Wait 2 minutes, then attempt a copy. Observe the error message. How do you diagnose SAS expiration vs permission issues?

### Scenario B: Missing Container at Destination

Attempt to copy to a container that does not exist at the destination. Does AzCopy create it automatically? (Answer: Yes, if the SAS token or RBAC permissions allow container creation.)

### Scenario C: Partial Transfer Failure

During a large copy operation, simulate a failure by revoking the SAS token mid-transfer. Use `azcopy jobs resume` to restart the failed job with a new valid token.

```bash
# Resume a failed job
azcopy jobs resume <job-id> --source-sas="<new-sas>" --destination-sas="<new-sas>"
```

## Knowledge Check

<details>
<summary>1. What is the difference between azcopy copy and azcopy sync?</summary>

**azcopy copy** unconditionally copies all files matching the criteria | it does not check if files already exist at the destination. It is best for one-time transfers.

**azcopy sync** compares source and destination by last-modified time and only transfers changed or new files. It is best for ongoing synchronization. With `--delete-destination=true`, it mirrors the source exactly (deleting extras at destination).

</details>

<details>
<summary>2. Can AzCopy perform server-side copies between storage accounts?</summary>

**Yes.** When copying between Azure storage accounts, AzCopy uses server-side APIs (Put Block From URL / Copy Blob From URL). Data flows directly between Azure datacenters without passing through your local machine. This is called a **service-to-service copy** and is significantly faster than download-then-upload.

</details>

<details>
<summary>3. What happens if an AzCopy transfer is interrupted?</summary>

AzCopy maintains a **job journal** that tracks transfer progress. If interrupted, you can resume the transfer with `azcopy jobs resume <job-id>`. Only files that were not yet transferred will be retried. The journal is stored locally (check `azcopy env` for the path).

</details>

<details>
<summary>4. What RBAC role is needed for AzCopy with Entra ID authentication?</summary>

For blob operations:
- **Read**: Storage Blob Data Reader
- **Write**: Storage Blob Data Contributor
- **Full control**: Storage Blob Data Owner

Note: The classic "Reader" or "Contributor" roles on the storage account are NOT sufficient for data plane operations | you need the data-specific roles.

</details>

## Cleanup

```bash
# Remove the resource group and all storage accounts
az group delete --name rg-azcopy-lab --yes --no-wait

# Clear AzCopy job log (optional)
azcopy jobs clean

# Logout from AzCopy
azcopy logout

echo "Cleanup complete."
```

## Learning Resources

- [Get started with AzCopy](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10)
- [Copy blobs between accounts with AzCopy](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-blobs-copy)
- [Synchronize with AzCopy](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-blobs-synchronize)
- [Authorize AzCopy with Entra ID](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-authorize-azure-active-directory)
- [Azure Storage Explorer](https://learn.microsoft.com/en-us/azure/storage/storage-explorer/vs-azure-tools-storage-manage-with-storage-explorer)
- [AzCopy benchmark](https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-bench)
