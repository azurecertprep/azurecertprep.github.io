---
sidebar_position: 20
title: "Challenge 20: Storage Encryption & Data Protection"
---

# Challenge 20: Storage Encryption & Data Protection

:::info Estimated Time and Cost

**60-75 minutes** | **Estimated cost**: ~$1.00 (Key Vault + storage) | **Exam Weight: 15-20%**


:::
## Scenario

Contoso Ltd.'s compliance team has flagged a regulatory requirement: all storage containing financial or healthcare data must use customer-managed encryption keys (CMK) for audit trail purposes. Additionally, regulatory data (such as financial records and audit logs) must be stored in immutable (WORM | Write Once, Read Many) containers where data cannot be modified or deleted for a specified retention period. You are tasked with implementing these encryption and data protection controls.

## Exam Skills Covered

| Skill | Weight |
|-------|--------|
| Configure storage account encryption | High |
| Configure customer-managed keys (CMK) | High |
| Configure infrastructure encryption (double encryption) | Medium |
| Configure immutability policies (time-based retention) | High |
| Configure legal hold on blob containers | Medium |
| Configure Azure Key Vault for CMK | Medium |

## Sysadmin ↔ Azure Reference

| On-Prem / Sysadmin | Azure Equivalent | Notes |
|---------------------|------------------|-------|
| BitLocker (disk encryption) | Storage Service Encryption (SSE) | Always enabled, transparent |
| EFS (Encrypting File System) | Client-side encryption | Application handles key management |
| Enterprise key management (HSM) | Azure Key Vault | Centralized key lifecycle |
| Master key owned by IT | Microsoft-managed keys (default) | Zero admin effort |
| Compliance-mandated key control | Customer-managed keys (CMK) | You control rotation and access |
| WORM tape backup | Immutable blob storage | Cannot be modified or deleted |
| Legal hold on documents | Legal hold policy | Indefinite immutability for litigation |
| Tape retention schedules | Time-based retention policy | Auto-expire after N days |

## Tasks

### Task 1: Create the Lab Environment

```bash
# Create resource group
az group create --name rg-encryption-lab --location eastus

# Create an Azure Key Vault for CMK
az keyvault create \
  --name kv-contoso-cmk-$RANDOM \
  --resource-group rg-encryption-lab \
  --location eastus \
  --enable-purge-protection true \
  --retention-days 7

# Store Key Vault name
KV_NAME=$(az keyvault list -g rg-encryption-lab --query "[0].name" -o tsv)
```

### Task 2: Create a Storage Account with Infrastructure Encryption

Infrastructure encryption (double encryption) adds a second layer of encryption at the infrastructure level using a different algorithm:

```bash
# Create storage account with infrastructure encryption enabled
az storage account create \
  --name stencrypt$RANDOM \
  --resource-group rg-encryption-lab \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --require-infrastructure-encryption true

# Store account name
STORAGE_NAME=$(az storage account list -g rg-encryption-lab --query "[?contains(name,'encrypt')].name" -o tsv | head -1)

# Verify infrastructure encryption is enabled
az storage account show \
  --name $STORAGE_NAME \
  --resource-group rg-encryption-lab \
  --query "{Name:name, InfraEncryption:encryption.requireInfrastructureEncryption, KeySource:encryption.keySource}" -o table
```

:::tip Portal Alternative

When creating a storage account in the portal:
1. Go to **Advanced** tab
2. Under **Encryption**, check **Enable infrastructure encryption**
3. Note: This cannot be changed after account creation


:::
### Task 3: Create a Key in Azure Key Vault

```bash
# Create an RSA key for storage encryption
az keyvault key create \
  --vault-name $KV_NAME \
  --name storage-cmk-key \
  --kty RSA \
  --size 2048

# Get the key URI (needed for storage account configuration)
KEY_URI=$(az keyvault key show \
  --vault-name $KV_NAME \
  --name storage-cmk-key \
  --query "key.kid" -o tsv)

echo "Key URI: $KEY_URI"
```

### Task 4: Configure Customer-Managed Keys (CMK) on the Storage Account

```bash
# Assign a system-managed identity to the storage account
az storage account update \
  --name $STORAGE_NAME \
  --resource-group rg-encryption-lab \
  --assign-identity

# Get the managed identity principal ID
IDENTITY_ID=$(az storage account show \
  --name $STORAGE_NAME \
  --resource-group rg-encryption-lab \
  --query "identity.principalId" -o tsv)

# Grant the storage account Key Vault Crypto Service Encryption User role
az role assignment create \
  --assignee $IDENTITY_ID \
  --role "Key Vault Crypto Service Encryption User" \
  --scope $(az keyvault show --name $KV_NAME --query id -o tsv)

# Configure CMK on the storage account
az storage account update \
  --name $STORAGE_NAME \
  --resource-group rg-encryption-lab \
  --encryption-key-source Microsoft.Keyvault \
  --encryption-key-vault $(az keyvault show --name $KV_NAME --query "properties.vaultUri" -o tsv) \
  --encryption-key-name storage-cmk-key

# Verify CMK configuration
az storage account show \
  --name $STORAGE_NAME \
  --resource-group rg-encryption-lab \
  --query "{KeySource:encryption.keySource, KeyVaultUri:encryption.keyVaultProperties.keyVaultUri, KeyName:encryption.keyVaultProperties.keyName}" -o table
```

### Task 5: Configure Immutability Policy (Time-Based Retention)

```bash
# Create a container for regulatory data
az storage container create \
  --name regulatory-data \
  --account-name $STORAGE_NAME \
  --auth-mode login

# Upload test data
echo "Financial audit record - $(date)" > audit-record.txt
az storage blob upload \
  --container-name regulatory-data \
  --file audit-record.txt \
  --name "2024/Q1/audit-record.txt" \
  --account-name $STORAGE_NAME \
  --auth-mode login

# Set a time-based immutability policy (30-day retention)
az storage container immutability-policy create \
  --account-name $STORAGE_NAME \
  --container-name regulatory-data \
  --period 30 \
  --allow-protected-append-writes true

# Verify the policy
az storage container show \
  --name regulatory-data \
  --account-name $STORAGE_NAME \
  --auth-mode login \
  --query "{ImmutabilityPolicy:properties.immutabilityPolicy, HasLegalHold:properties.hasLegalHold}"

rm -f audit-record.txt
```

:::tip Important: Locking the Policy

An immutability policy starts in an **unlocked** state. While unlocked, you can increase or decrease the retention period or delete the policy. Once you **lock** the policy:
- The retention period can only be increased, never decreased
- The policy cannot be deleted
- Blobs cannot be deleted until the retention period expires

Only lock a policy when you are certain about the retention requirements.


:::
### Task 6: Configure Legal Hold

```bash
# Create a container for litigation data
az storage container create \
  --name litigation-docs \
  --account-name $STORAGE_NAME \
  --auth-mode login

# Upload a document
echo "Contract evidence document - $(date)" > evidence.txt
az storage blob upload \
  --container-name litigation-docs \
  --file evidence.txt \
  --name "case-2024-001/evidence.txt" \
  --account-name $STORAGE_NAME \
  --auth-mode login

# Apply a legal hold with tags
az storage container legal-hold set \
  --account-name $STORAGE_NAME \
  --container-name litigation-docs \
  --tags "case-2024-001" "litigation-hold"

# Verify legal hold
az storage container show \
  --name litigation-docs \
  --account-name $STORAGE_NAME \
  --auth-mode login \
  --query "{HasLegalHold:properties.hasLegalHold, LegalHoldTags:properties.legalHold.tags}"

# Try to delete the blob (should fail while legal hold is active)
az storage blob delete \
  --container-name litigation-docs \
  --name "case-2024-001/evidence.txt" \
  --account-name $STORAGE_NAME \
  --auth-mode login

rm -f evidence.txt
```

### Task 7: Verify Encryption Settings

```bash
# Check encryption scope at the account level
az storage account show \
  --name $STORAGE_NAME \
  --resource-group rg-encryption-lab \
  --query "{
    Name:name,
    KeySource:encryption.keySource,
    InfrastructureEncryption:encryption.requireInfrastructureEncryption,
    KeyVaultUri:encryption.keyVaultProperties.keyVaultUri,
    KeyName:encryption.keyVaultProperties.keyName,
    KeyVersion:encryption.keyVaultProperties.keyVersion
  }" -o json

# Check the key status in Key Vault
az keyvault key show \
  --vault-name $KV_NAME \
  --name storage-cmk-key \
  --query "{Name:key.kid, Enabled:attributes.enabled, Created:attributes.created}" -o table
```

### Task 8: Rotate the Customer-Managed Key

```bash
# Create a new version of the key
az keyvault key create \
  --vault-name $KV_NAME \
  --name storage-cmk-key \
  --kty RSA \
  --size 2048

# The storage account auto-detects the new key version (if version is not pinned)
# Verify the key version updated
az storage account show \
  --name $STORAGE_NAME \
  --resource-group rg-encryption-lab \
  --query "encryption.keyVaultProperties.{KeyName:keyName, KeyVersion:keyVersion}" -o table
```

## Success Criteria

- [ ] Storage account has infrastructure encryption (double encryption) enabled
- [ ] Azure Key Vault exists with an RSA key for encryption
- [ ] Storage account uses customer-managed keys (CMK) from Key Vault
- [ ] A time-based immutability policy (30 days) is set on the regulatory-data container
- [ ] Legal hold is applied to the litigation-docs container
- [ ] Blob deletion fails on containers with active legal hold or unexpired retention
- [ ] Key rotation was performed and verified

## Hints

<details>
<summary>Hint 1: Infrastructure encryption cannot be changed after creation</summary>

Infrastructure encryption (double encryption) must be enabled at storage account creation time. You cannot enable or disable it on an existing storage account. If you missed enabling it, you must create a new account and migrate the data.

</details>

<details>
<summary>Hint 2: Key Vault access for CMK</summary>

The storage account's managed identity needs the **Key Vault Crypto Service Encryption User** role (recommended RBAC approach) or the legacy Key Vault access policy with Get, Wrap Key, and Unwrap Key permissions. The RBAC approach is preferred for new deployments.

</details>

<details>
<summary>Hint 3: Immutability vs Legal Hold</summary>

- **Time-based retention**: Blobs cannot be deleted until the retention period expires. The period can be extended but never shortened (once locked).
- **Legal hold**: Blobs cannot be deleted indefinitely until ALL legal hold tags are removed. No time limit | it persists until explicitly cleared.
- Both can be active simultaneously on the same container.

</details>

<details>
<summary>Hint 4: Purge protection on Key Vault</summary>

Purge protection must be enabled on the Key Vault used for CMK. Without it, deleting the Key Vault or key could render your storage account data permanently inaccessible. This is a hard requirement from Azure.

</details>

## Break and Fix

### Scenario A: CMK Key Disabled

Disable the encryption key in Key Vault. What happens to read/write operations on the storage account? (Answer: All data plane operations fail with a 403 error after the cached key expires, typically within a few hours.)

```bash
# Disable the key (CAUTION: affects storage access)
az keyvault key set-attributes \
  --vault-name $KV_NAME \
  --name storage-cmk-key \
  --enabled false

# Attempt to list blobs (will eventually fail)
az storage blob list --container-name regulatory-data --account-name $STORAGE_NAME --auth-mode login

# Re-enable the key to restore access
az keyvault key set-attributes \
  --vault-name $KV_NAME \
  --name storage-cmk-key \
  --enabled true
```

### Scenario B: Locked Immutability Policy

Lock the immutability policy on a test container, then try to delete a blob before the retention period ends. Observe the error. Note: This cannot be undone | only do this on a test container.

### Scenario C: Lost Key Vault Access

Remove the managed identity's role assignment on the Key Vault. How long before storage operations begin failing? How do you diagnose the issue using Azure Monitor?

## Knowledge Check

<details>
<summary>1. What is the difference between Microsoft-managed keys and customer-managed keys?</summary>

**Microsoft-managed keys (default)**: Microsoft handles all key management | generation, storage, rotation, and retirement. Zero admin effort required. Keys are rotated automatically.

**Customer-managed keys (CMK)**: You create and manage the key in Azure Key Vault. You control rotation schedule, access policies, and can revoke access by disabling the key. Required for compliance scenarios where key custody must be demonstrable.

</details>

<details>
<summary>2. Can you switch from Microsoft-managed keys to CMK on an existing storage account?</summary>

**Yes.** You can switch an existing storage account from Microsoft-managed keys to customer-managed keys at any time. The reverse is also possible (CMK back to Microsoft-managed). No data migration is needed | Azure re-wraps the encryption keys transparently.

</details>

<details>
<summary>3. What happens if the Key Vault key is deleted?</summary>

If the key is soft-deleted (Key Vault has soft-delete enabled), the storage account loses access after the cached key expires. You can recover the key from soft-delete to restore access. If the key is permanently purged (no purge protection), the storage account data becomes **permanently inaccessible**. This is why purge protection is mandatory for CMK scenarios.

</details>

<details>
<summary>4. Can you delete a container with an active legal hold?</summary>

**No.** You cannot delete a container or any blobs within it while a legal hold is active. You must first remove all legal hold tags from the container before deletion is allowed. This ensures litigation evidence cannot be destroyed.

</details>

## Cleanup

```bash
# Remove legal hold before deleting containers
STORAGE_NAME=$(az storage account list -g rg-encryption-lab --query "[?contains(name,'encrypt')].name" -o tsv | head -1)

az storage container legal-hold clear \
  --account-name $STORAGE_NAME \
  --container-name litigation-docs \
  --tags "case-2024-001" "litigation-hold" 2>/dev/null

# Delete immutability policy (only if unlocked)
az storage container immutability-policy delete \
  --account-name $STORAGE_NAME \
  --container-name regulatory-data \
  --if-match $(az storage container show --name regulatory-data --account-name $STORAGE_NAME --auth-mode login --query "properties.immutabilityPolicy.etag" -o tsv) 2>/dev/null

# Delete the entire resource group
az group delete --name rg-encryption-lab --yes --no-wait

echo "Cleanup complete. Key Vault will remain in soft-delete state for retention period."
```

## Learning Resources

- [Storage account encryption overview](https://learn.microsoft.com/en-us/azure/storage/common/storage-service-encryption)
- [Configure customer-managed keys](https://learn.microsoft.com/en-us/azure/storage/common/customer-managed-keys-overview)
- [Infrastructure encryption (double encryption)](https://learn.microsoft.com/en-us/azure/storage/common/infrastructure-encryption-enable)
- [Immutable blob storage](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview)
- [Legal hold on containers](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-legal-hold-overview)
- [Azure Key Vault overview](https://learn.microsoft.com/en-us/azure/key-vault/general/overview)
