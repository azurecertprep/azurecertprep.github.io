---
sidebar_position: 13
title: "Challenge 13: Storage Account Security"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 13: Storage Account Security

## Exam skills covered

- Plan and implement security for storage accounts
- Configure storage account encryption (Microsoft-managed and customer-managed keys)
- Configure storage account network access (firewalls and virtual network rules)
- Configure shared access signatures (SAS) and stored access policies
- Manage storage account access keys and key rotation
- Configure Azure Storage lifecycle management for security

## Scenario

Contoso Ltd's data engineering team has deployed multiple Azure Storage accounts containing sensitive financial data and customer PII. The security team has identified that several accounts are publicly accessible, use only Microsoft-managed encryption keys, and have no network restrictions. As the cloud security engineer, you must harden these storage accounts by implementing encryption with customer-managed keys, restricting network access, and establishing secure access patterns using SAS tokens and stored access policies.

---

## Prerequisites

- Azure subscription with Owner or Contributor role
- Azure CLI installed and authenticated (`az login`)
- An Azure Key Vault with a RSA key (or willingness to create one)
- Basic understanding of Azure Storage services

---

## Task 1: Create a secured storage account with infrastructure encryption

Create a storage account with enhanced security settings including infrastructure encryption (double encryption) and mandatory HTTPS.

```bash
# Set variables
RG="rg-sc500-storage-security"
LOCATION="eastus"
STORAGE_ACCOUNT="stsc500contoso$(openssl rand -hex 4)"

# Create resource group
az group create --name $RG --location $LOCATION

# Create storage account with security hardening
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --https-only true \
  --require-infrastructure-encryption true \
  --allow-shared-key-access false

# Verify security settings
az storage account show \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --query "{Name:name, MinTLS:minimumTlsVersion, HttpsOnly:enableHttpsTrafficOnly, PublicAccess:allowBlobPublicAccess, InfraEncryption:encryption.requireInfrastructureEncryption, SharedKeyAccess:allowSharedKeyAccess}"
```

---

## Task 2: Configure customer-managed keys (CMK) with Azure Key Vault

Set up encryption using customer-managed keys stored in Azure Key Vault with a system-assigned managed identity.

```bash
# Create Key Vault
KV_NAME="kv-sc500-cmk-$(openssl rand -hex 4)"
az keyvault create \
  --name $KV_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --enable-purge-protection true \
  --retention-days 90

# Enable system-assigned managed identity on storage account
az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --assign-identity

# Get the managed identity principal ID
IDENTITY_PRINCIPAL=$(az storage account show \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --query "identity.principalId" -o tsv)

# Grant Key Vault permissions to the storage account identity
az keyvault set-policy \
  --name $KV_NAME \
  --object-id $IDENTITY_PRINCIPAL \
  --key-permissions get unwrapKey wrapKey

# Create an RSA key in Key Vault
az keyvault key create \
  --vault-name $KV_NAME \
  --name "contoso-storage-cmk" \
  --kty RSA \
  --size 2048

# Get Key Vault URI and key name
KV_URI=$(az keyvault show --name $KV_NAME --query "properties.vaultUri" -o tsv)

# Configure CMK encryption on storage account
az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --encryption-key-source Microsoft.Keyvault \
  --encryption-key-vault $KV_URI \
  --encryption-key-name "contoso-storage-cmk"

# Verify encryption configuration
az storage account show \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --query "encryption.{KeySource:keySource, KeyVault:keyVaultProperties.keyVaultUri, KeyName:keyVaultProperties.keyName}"
```

---

## Task 3: Configure storage account firewall and virtual network rules

Restrict storage account access to specific virtual networks and IP addresses.

```bash
# Create a virtual network and subnet with service endpoint
az network vnet create \
  --name vnet-contoso-data \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16 \
  --subnet-name snet-data \
  --subnet-prefix 10.0.1.0/24

# Enable Microsoft.Storage service endpoint on the subnet
az network vnet subnet update \
  --name snet-data \
  --vnet-name vnet-contoso-data \
  --resource-group $RG \
  --service-endpoints Microsoft.Storage

# Set default action to Deny (block all public access)
az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --default-action Deny

# Add virtual network rule
az storage account network-rule add \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --vnet-name vnet-contoso-data \
  --subnet snet-data

# Add IP rule for corporate office (example IP)
az storage account network-rule add \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --ip-address 203.0.113.0/24

# Verify network rules
az storage account network-rule list \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RG

# Enable trusted Azure services bypass
az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --bypass AzureServices Logging Metrics
```

---

## Task 4: Configure stored access policies and SAS tokens

Create stored access policies for controlled access and generate constrained SAS tokens.

```bash
# Re-enable shared key access temporarily for SAS operations
az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --allow-shared-key-access true

# Get storage account key
STORAGE_KEY=$(az storage account keys list \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --query "[0].value" -o tsv)

# Create a container
az storage container create \
  --name financial-reports \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY

# Create a stored access policy with read-only permissions and expiry
# Note: date -u -d syntax requires GNU date (Linux/Cloud Shell)
az storage container policy create \
  --container-name financial-reports \
  --name readonly-policy \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --permissions rl \
  --expiry $(date -u -d "+30 days" '+%Y-%m-%dT%H:%MZ')

# Generate SAS token using the stored access policy
SAS_TOKEN=$(az storage container generate-sas \
  --name financial-reports \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --policy-name readonly-policy \
  -o tsv)

echo "SAS Token (first 20 chars): ${SAS_TOKEN:0:20}..."

# Create a more restrictive SAS for a specific blob
# Note: date -u -d syntax requires GNU date (Linux/Cloud Shell)
az storage blob generate-sas \
  --container-name financial-reports \
  --name "report-2024.pdf" \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --permissions r \
  --expiry $(date -u -d "+1 hour" '+%Y-%m-%dT%H:%MZ') \
  --ip 203.0.113.0-203.0.113.255 \
  --https-only
```

---

## Task 5: Configure key rotation and monitoring

Set up automatic key rotation and configure diagnostic logging for storage security events.

```bash
# Rotate storage account keys
az storage account keys renew \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --key key1

# Configure automatic key rotation for CMK in Key Vault
az keyvault key rotation-policy update \
  --vault-name $KV_NAME \
  --name "contoso-storage-cmk" \
  --value '{
    "lifetimeActions": [
      {
        "trigger": {"timeBeforeExpiry": "P30D"},
        "action": {"type": "Notify"}
      },
      {
        "trigger": {"timeAfterCreate": "P90D"},
        "action": {"type": "Rotate"}
      }
    ],
    "attributes": {"expiryTime": "P1Y"}
  }'

# Enable storage analytics logging
az storage logging update \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --log rwd \
  --services b \
  --retention 90

# Disable shared key access again (enforce Entra ID auth)
az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --allow-shared-key-access false

# Verify final security posture
az storage account show \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --query "{Name:name, Encryption:encryption.keySource, DefaultAction:networkRuleSet.defaultAction, VNetRules:networkRuleSet.virtualNetworkRules[].id, SharedKeyDisabled:allowSharedKeyAccess}"
```

---

## Break & Fix

### Scenario 1: Storage account accessible despite firewall rules

A security scan shows that the storage account is still accessible from the internet even though network rules were configured. The `defaultAction` is set to `Allow`.

<details>
<summary>Show solution</summary>

```bash
# Check current default action
az storage account show \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --query "networkRuleSet.defaultAction"

# The default action must be set to Deny
az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --default-action Deny

# Verify network rules are still in place
az storage account network-rule list \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RG
```

</details>

### Scenario 2: CMK encryption failing — Key Vault access denied

After rotating the managed identity, the storage account can no longer access the Key Vault for encryption operations. Blob uploads fail with an encryption error.

<details>
<summary>Show solution</summary>

```bash
# Get current identity principal ID (it changed after rotation)
NEW_PRINCIPAL=$(az storage account show \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --query "identity.principalId" -o tsv)

# Re-grant Key Vault permissions to the new identity
az keyvault set-policy \
  --name $KV_NAME \
  --object-id $NEW_PRINCIPAL \
  --key-permissions get unwrapKey wrapKey

# Verify the key is accessible
az keyvault key show \
  --vault-name $KV_NAME \
  --name "contoso-storage-cmk" \
  --query "{Name:name, Enabled:attributes.enabled}"
```

</details>

### Scenario 3: SAS token works after stored access policy was revoked

An employee's access was revoked by deleting the stored access policy, but they report they can still access blobs using a previously generated SAS token.

<details>
<summary>Show solution</summary>

```bash
# The SAS was likely generated with inline permissions, not referencing the policy.
# Verify by checking if the policy still exists
az storage container policy list \
  --container-name financial-reports \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY

# If the SAS was generated with inline permissions (not policy-based),
# the only way to revoke it is to rotate the storage account key
az storage account keys renew \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --key key1

# This invalidates ALL SAS tokens generated with that key
# Regenerate any legitimate SAS tokens with the new key
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the effect of setting 'requireInfrastructureEncryption' to true on a storage account?",
    options: [
      "It enables encryption at rest using Microsoft-managed keys only",
      "It provides double encryption with two different encryption algorithms at the infrastructure layer",
      "It encrypts data in transit using TLS 1.3",
      "It enables client-side encryption before data reaches Azure"
    ],
    correctIndex: 1,
    explanation: "Infrastructure encryption (double encryption) adds a second layer of encryption at the Azure Storage infrastructure level using a different algorithm, providing defense against compromise of any single encryption algorithm."
  },
  {
    question: "How can you immediately revoke a SAS token that was generated with inline permissions (not linked to a stored access policy)?",
    options: [
      "Delete the SAS token from Azure Portal",
      "Update the stored access policy to expired",
      "Rotate the storage account access key used to sign the SAS",
      "Set the storage account firewall to deny the client IP"
    ],
    correctIndex: 2,
    explanation: "SAS tokens with inline permissions cannot be revoked individually. The only way to immediately invalidate them is to rotate the storage account access key that was used to sign the token. Using stored access policies allows revocation without key rotation."
  },
  {
    question: "When configuring customer-managed keys (CMK) for Azure Storage encryption, which Key Vault permission is NOT required for the storage account's managed identity?",
    options: [
      "Get",
      "Wrap Key",
      "Unwrap Key",
      "Delete"
    ],
    correctIndex: 3,
    explanation: "The storage account's managed identity only needs Get, Wrap Key, and Unwrap Key permissions on the Key Vault. Delete permission is not required and would violate the principle of least privilege."
  },
  {
    question: "What does setting 'allowSharedKeyAccess' to false on a storage account enforce?",
    options: [
      "All SAS tokens are immediately invalidated",
      "Only Azure AD (Microsoft Entra ID) authentication is permitted for data plane operations",
      "The storage account keys are deleted",
      "Only private endpoint connections are allowed"
    ],
    correctIndex: 1,
    explanation: "Disabling shared key access forces all data plane requests to authenticate using Microsoft Entra ID (Azure AD). Storage account keys still exist but cannot be used for authentication. SAS tokens signed with account keys are also blocked."
  }
]} />

## Cleanup

```bash
# Delete the resource group and all resources
az group delete --name $RG --yes --no-wait

# Purge the Key Vault (if soft-delete is enabled)
az keyvault purge --name $KV_NAME --no-wait
```
