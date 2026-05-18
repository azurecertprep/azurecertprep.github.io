---
sidebar_position: 1
title: "Challenge 04: Storage Accounts & Access"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 04: Storage Accounts & Access

> **Estimated time**: 60-75 min | 💰 **Estimated cost**: ~$0.50 | 🎯 **Exam weight**: 15-20%

## Introduction

Contoso's application team needs a centralized storage solution. The legacy file server is running out of space, and the dev team keeps emailing ZIP files back and forth. You've been asked to set up Azure Storage with proper security controls — access keys, SAS tokens, firewalls, and encryption. This is the Azure equivalent of setting up a file server, but with cloud-scale security.

Storage accounts are one of the most tested topics on the AZ-104 exam. You'll need to know every access method, every redundancy option, and every security control inside and out.

## Exam Skills Covered

- ✅ Create and configure storage accounts
- ✅ Configure Azure Storage redundancy
- ✅ Configure storage account encryption (Microsoft-managed and customer-managed keys)
- ✅ Configure storage account firewalls and virtual networks
- ✅ Generate shared access signatures (SAS)
- ✅ Configure stored access policies
- ✅ Manage access keys
- ✅ Upload and manage data with AzCopy
- ✅ Configure Azure Storage Explorer

## Sysadmin ↔ Azure Reference

| On-Prem / Sysadmin | Azure Equivalent | Notes |
|---------------------|------------------|-------|
| File server (CIFS/SMB) | Azure Storage account | Cloud-native storage |
| RAID 1 (mirroring) | LRS (Local Redundant Storage) | 3 copies in one datacenter |
| RAID across sites | GRS (Geo-Redundant Storage) | 6 copies across 2 regions |
| Share permissions (Everyone: Read) | SAS tokens | Time-limited, scope-limited access |
| Admin password for file share | Storage account access keys | Full access — protect like a password |
| Robocopy / xcopy | AzCopy | High-performance data transfer |
| Windows Explorer for shares | Azure Storage Explorer | GUI tool for storage management |
| BitLocker / disk encryption | Storage Service Encryption (SSE) | Automatic, always-on encryption |
| Firewall rules for file server | Storage firewall & VNet rules | Network-level access control |

## Description

### Part 1: Create a Storage Account

1. Create a resource group and storage account:

```bash
RG="rg-storage-challenge"
LOCATION="eastus"
# Storage account names must be globally unique, 3-24 chars, lowercase + numbers only
STORAGE_NAME="ststoragechallenge$RANDOM"

az group create --name $RG --location $LOCATION

az storage account create \
  --name $STORAGE_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --min-tls-version TLS1_2 \
  --tags Environment=Lab CostCenter=IT-001
```

2. Verify the storage account settings:

```bash
az storage account show --name $STORAGE_NAME --resource-group $RG \
  --query "{Name:name, SKU:sku.name, Kind:kind, AccessTier:accessTier, TLS:minimumTlsVersion}" -o table
```

### Part 2: Configure Redundancy

3. View the current redundancy setting (should be LRS)
4. Change the redundancy from LRS to GRS:

```bash
az storage account update --name $STORAGE_NAME --resource-group $RG --sku Standard_GRS
```

5. Verify the change and understand what each redundancy option provides

### Part 3: Access Keys & SAS Tokens

6. Retrieve the storage account access keys:

```bash
az storage account keys list --account-name $STORAGE_NAME --resource-group $RG -o table
```

:::warning

Access keys grant **full control** over the storage account. Treat them like passwords — never commit them to source control or share them in plain text.
:::

7. Create a blob container and upload a test file:

```bash
# Get the connection string
CONN_STRING=$(az storage account show-connection-string --name $STORAGE_NAME --resource-group $RG -o tsv)

# Create a container
az storage container create --name testcontainer --connection-string "$CONN_STRING"

# Create a test file and upload it
echo "Hello from Azure Storage Challenge!" > testfile.txt
az storage blob upload --container-name testcontainer --file testfile.txt --name testfile.txt --connection-string "$CONN_STRING"
```

8. Generate an **Account SAS** token (broad access):

```bash
END_DATE=$(date -u -d "+1 day" '+%Y-%m-%dT%H:%MZ' 2>/dev/null || date -u -v+1d '+%Y-%m-%dT%H:%MZ')

az storage account generate-sas \
  --account-name $STORAGE_NAME \
  --services b \
  --resource-types sco \
  --permissions rl \
  --expiry $END_DATE \
  --https-only \
  -o tsv
```

9. Generate a **Service SAS** token (scoped to a specific container):

```bash
az storage container generate-sas \
  --name testcontainer \
  --account-name $STORAGE_NAME \
  --permissions rl \
  --expiry $END_DATE \
  --https-only \
  --connection-string "$CONN_STRING" \
  -o tsv
```

### Part 4: Stored Access Policies

10. Create a stored access policy on the container:

```bash
az storage container policy create \
  --container-name testcontainer \
  --name "ReadPolicy" \
  --permissions rl \
  --expiry $END_DATE \
  --connection-string "$CONN_STRING"
```

11. Generate a SAS token linked to the stored access policy:

```bash
az storage container generate-sas \
  --name testcontainer \
  --account-name $STORAGE_NAME \
  --policy-name "ReadPolicy" \
  --connection-string "$CONN_STRING" \
  -o tsv
```

:::tip

**Why use stored access policies?** If you need to revoke a SAS token, you can't invalidate a standalone SAS without rotating the access key. But if the SAS references a stored access policy, you can modify or delete the policy to revoke access instantly.
:::

### Part 5: Storage Firewall

12. Configure the storage account firewall to allow access only from your IP:

<Tabs>
<TabItem value="cli" label="Azure CLI">

```bash
# Get your public IP
MY_IP=$(curl -s https://api.ipify.org)

# Set default action to Deny
az storage account update --name $STORAGE_NAME --resource-group $RG --default-action Deny

# Add your IP to the allow list
az storage account network-rule add --account-name $STORAGE_NAME --resource-group $RG --ip-address $MY_IP
```

</TabItem>
<TabItem value="portal" label="Portal">

1. Go to your **Storage account** → **Networking**
2. Change **Public network access** to **Enabled from selected virtual networks and IP addresses**
3. Under **Firewall**, add your client IP address
4. Click **Save**

</TabItem>
</Tabs>

13. Verify that you can still access the storage account from your IP

### Part 6: Rotate Access Keys

14. Regenerate one of the storage account access keys:

```bash
az storage account keys renew --account-name $STORAGE_NAME --resource-group $RG --key key1
```

:::warning

After rotating a key, any application or SAS token using that key will **immediately stop working**. Always update your applications before rotating keys in production.
:::

### Part 7: AzCopy

15. Use AzCopy to upload multiple files:

```bash
# Create some test files
mkdir -p upload-test
for i in 1 2 3 4 5; do echo "Test file $i" > upload-test/file$i.txt; done

# Generate a SAS token for AzCopy
SAS_TOKEN=$(az storage account generate-sas \
  --account-name $STORAGE_NAME \
  --services b --resource-types co \
  --permissions rwlac --expiry $END_DATE \
  --https-only -o tsv)

# Upload with AzCopy
azcopy copy "upload-test/*" "https://$STORAGE_NAME.blob.core.windows.net/testcontainer?$SAS_TOKEN" --recursive
```

## Success Criteria

- [ ] Storage account exists with StorageV2 kind, Hot access tier, TLS 1.2
- [ ] Redundancy has been changed from LRS to GRS
- [ ] Blob container `testcontainer` exists with an uploaded file
- [ ] Account SAS and Service SAS tokens have been generated
- [ ] Stored access policy `ReadPolicy` exists on the container
- [ ] Storage firewall is configured with default Deny and your IP allowed
- [ ] Access key has been rotated (key1 regenerated)
- [ ] AzCopy has been used to upload files

## Hints

<details>
<summary>Hint 1: Understanding storage account naming rules</summary>

Storage account names must be:
- **Globally unique** (across all of Azure)
- **3-24 characters** long
- **Lowercase letters and numbers only** (no hyphens, underscores, or uppercase)

Use `$RANDOM` or a timestamp to ensure uniqueness:
```bash
STORAGE_NAME="stchallenge$(date +%s | tail -c 8)"
```

</details>

<details>
<summary>Hint 2: Redundancy options explained</summary>

| Option | Copies | Regions | Durability | Use Case |
|--------|--------|---------|------------|----------|
| LRS | 3 | 1 datacenter | 11 nines | Dev/test, easily recreated data |
| ZRS | 3 | 3 zones in 1 region | 12 nines | Production, high availability |
| GRS | 6 | 2 regions (primary + secondary) | 16 nines | Business-critical, disaster recovery |
| RA-GRS | 6 | 2 regions (readable secondary) | 16 nines | Read-heavy workloads needing DR |
| GZRS | 6 | 3 zones + secondary region | 16 nines | Maximum protection |
| RA-GZRS | 6 | 3 zones + readable secondary | 16 nines | Maximum protection + read access |

</details>

<details>
<summary>Hint 3: Difference between SAS token types</summary>

| SAS Type | Scope | Created With | Can Revoke? |
|----------|-------|--------------|-------------|
| **Account SAS** | Entire storage account (blobs, files, queues, tables) | Access keys | Only by rotating the key |
| **Service SAS** | Specific service (e.g., one container) | Access keys | Via stored access policy |
| **User Delegation SAS** | Specific blob/container | Entra ID credentials | By revoking the delegation key |

**User Delegation SAS** is the most secure — it uses Entra ID instead of access keys.

</details>

<details>
<summary>Hint 4: Troubleshooting firewall lockout</summary>

If you configure the firewall and lock yourself out:

```bash
# Option 1: Allow your current IP
MY_IP=$(curl -s https://api.ipify.org)
az storage account network-rule add --account-name $STORAGE_NAME --resource-group $RG --ip-address $MY_IP

# Option 2: Reset to allow all networks (temporary!)
az storage account update --name $STORAGE_NAME --resource-group $RG --default-action Allow

# Option 3: Use Azure Cloud Shell (always allowed via "trusted services")
```

:::info

Azure Cloud Shell and trusted Azure services can always access storage accounts regardless of firewall rules, as long as the **"Allow trusted Microsoft services"** checkbox is enabled.
:::

</details>

<details>
<summary>Hint 5: Using AzCopy with Entra ID authentication</summary>

```bash
# Login to AzCopy with Entra ID (no SAS needed)
azcopy login

# Upload using Entra ID auth (requires Storage Blob Data Contributor role)
azcopy copy "upload-test/*" "https://$STORAGE_NAME.blob.core.windows.net/testcontainer" --recursive
```

</details>

## Learning Resources

- [Storage account overview](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview)
- [Azure Storage redundancy](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy)
- [Grant limited access with SAS](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview)
- [Configure storage firewalls](https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security)
- [Get started with AzCopy](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10)
- [Manage storage account keys](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-keys-manage)

## Break & Fix 🔧

After completing the challenge, try these troubleshooting scenarios:

1. **Firewall lockout**: Set the default action to Deny and remove your IP from the allow list. Try to access the storage account. How do you recover? (Use Azure Cloud Shell, which is a trusted service, to re-add your IP.)

2. **Expired SAS token**: Generate a SAS token with a 1-minute expiry. Wait 2 minutes, then try to use it. What error message do you get? How is this different from a revoked stored access policy?

3. **Key rotation disaster**: Upload a file using a connection string based on key1. Rotate key1. Try to download the file using the old connection string. What happens? How would you handle this gracefully in production?

4. **Wrong redundancy**: Create a storage account with LRS, then try to change it directly to RA-GZRS. Does it work? (Some redundancy changes require intermediate steps or data migration.)

## Knowledge Check

<details>
<summary>1. What are the three types of SAS tokens and when would you use each?</summary>

1. **Account SAS**: Grants access to resources across one or more storage services (blobs, files, queues, tables). Use when an application needs broad access to a storage account.

2. **Service SAS**: Grants access to resources in a single storage service (e.g., just blob storage). Use when you want to scope access to a specific container or blob.

3. **User Delegation SAS**: Signed with Entra ID credentials instead of access keys. This is the **most secure** option and is **recommended by Microsoft**. Only works with Blob Storage and Data Lake Storage Gen2.

**Exam tip**: If a question asks for the "most secure" SAS option, the answer is always **User Delegation SAS**.

</details>

<details>
<summary>2. What happens when you regenerate an access key?</summary>

When you regenerate a storage account access key:
- Any application using that key **immediately loses access**
- Any SAS token generated with that key **becomes invalid**
- The other key (key2 if you rotated key1) continues to work

**Best practice for key rotation**:
1. Update all applications to use key2
2. Regenerate key1
3. Update all applications to use the new key1
4. Regenerate key2

</details>

<details>
<summary>3. What is the default encryption for Azure Storage?</summary>

All Azure Storage data is encrypted at rest using **256-bit AES encryption** (Storage Service Encryption / SSE). This is:
- **Always on** — cannot be disabled
- **Transparent** — no performance impact
- **Free** — no additional cost

You can choose between:
- **Microsoft-managed keys** (default) — Azure manages the encryption keys
- **Customer-managed keys (CMK)** — You manage the keys in Azure Key Vault

</details>

<details>
<summary>4. Can you change a storage account's redundancy after creation?</summary>

**Yes**, with some limitations:
- **LRS ↔ GRS/RA-GRS**: Supported (may take time for initial replication)
- **LRS ↔ ZRS**: Supported via live migration (request from Microsoft) or manual migration
- **ZRS ↔ GZRS/RA-GZRS**: Supported
- **LRS → RA-GZRS directly**: Not supported — you must go through intermediate steps (LRS → GRS → GZRS → RA-GZRS, or LRS → ZRS → GZRS → RA-GZRS)

The exam may test which transitions are supported and which require intermediate steps.

</details>

## Cleanup

```bash
# Delete the resource group (removes storage account and all data)
az group delete --name rg-storage-challenge --yes --no-wait

# Clean up local files
rm -f testfile.txt
rm -rf upload-test
```

---

**Next**: [Challenge 05 — Blob Storage & Azure Files](/docs/az-104/storage/challenge-05)
