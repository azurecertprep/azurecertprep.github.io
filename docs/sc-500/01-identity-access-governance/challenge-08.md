---
sidebar_position: 8
title: "Challenge 08: Key Vault Secrets, Keys, and Certificates Management"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 08: Key Vault Secrets, Keys, and Certificates Management

## Exam skills covered

- Manage secrets lifecycle (creation, rotation, expiration)
- Configure and manage cryptographic keys (RSA, EC, symmetric)
- Manage TLS/SSL certificates and auto-renewal
- Implement key rotation policies
- Configure secret and key versioning
- Integrate Key Vault with Azure services for encryption

## Scenario

Contoso Ltd needs to centralize management of application secrets, encryption keys, and TLS certificates. The company currently has 200+ secrets across various applications with no consistent rotation policy, encryption keys that have never been rotated, and TLS certificates that have expired in production causing outages. The security team must implement automated rotation, enforce expiration policies, and set up certificate lifecycle management with auto-renewal from an integrated CA.

---

## Prerequisites

- Azure subscription with Contributor access
- Azure Key Vault (Premium SKU recommended) already deployed
- Azure CLI installed and authenticated
- Key Vault Administrator or Key Vault Secrets Officer role
- A domain name for certificate operations (optional)

---

## Task 1: Manage secrets with versioning and expiration

Create secrets with metadata, expiration dates, and understand versioning behavior.

```bash
# Set variables
RG_NAME="rg-contoso-kv-mgmt-lab"
LOCATION="eastus2"
KV_NAME="kv-contoso-mgmt-$(openssl rand -hex 4)"

# Create resource group and Key Vault
az group create --name $RG_NAME --location $LOCATION
az keyvault create \
  --name $KV_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --sku premium \
  --enable-rbac-authorization true

# Assign yourself Key Vault Administrator
CURRENT_USER_ID=$(az ad signed-in-user show --query id -o tsv)
KV_ID=$(az keyvault show --name $KV_NAME --query id -o tsv)
az role assignment create \
  --assignee-object-id $CURRENT_USER_ID \
  --assignee-principal-type User \
  --role "Key Vault Administrator" \
  --scope $KV_ID

# Create a secret with expiration and content type
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "sql-connection-string" \
  --value "Server=tcp:contoso.database.windows.net;Database=ProductionDB;Authentication=Active Directory Default;" \
  --content-type "text/plain" \
  --expires "2025-12-31T23:59:59Z" \
  --tags purpose=database environment=production app=contoso-api

# Create an API key with 90-day expiration
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "third-party-api-key" \
  --value "sk_live_contoso_$(openssl rand -hex 16)" \
  --content-type "application/x-api-key" \
  --expires "$(date -u -d '+90 days' +%Y-%m-%dT%H:%M:%SZ)" \
  --not-before "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --tags purpose=integration environment=production rotate=quarterly

# Create a new version of an existing secret (rotation)
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "sql-connection-string" \
  --value "Server=tcp:contoso.database.windows.net;Database=ProductionDB;Authentication=Active Directory Default;Connection Timeout=30;" \
  --content-type "text/plain" \
  --expires "2026-06-30T23:59:59Z"

# List all versions of a secret
az keyvault secret list-versions \
  --vault-name $KV_NAME \
  --name "sql-connection-string" \
  --query "[].{id:id, created:attributes.created, expires:attributes.expires, enabled:attributes.enabled}" -o table

# Get the current (latest) version
az keyvault secret show \
  --vault-name $KV_NAME \
  --name "sql-connection-string" \
  --query "{value:value, version:id, expires:attributes.expires}"

# List secrets nearing expiration (within 30 days)
az keyvault secret list --vault-name $KV_NAME \
  --query "[?attributes.expires<='$(date -u -d '+30 days' +%Y-%m-%dT%H:%M:%SZ)'].{name:name, expires:attributes.expires}" -o table
```

## Task 2: Create and manage cryptographic keys

Generate RSA and EC keys with specific properties for different encryption use cases.

```bash
# Create an RSA-HSM key for data encryption (2048-bit)
az keyvault key create \
  --vault-name $KV_NAME \
  --name "data-encryption-key" \
  --kty RSA-HSM \
  --size 2048 \
  --ops encrypt decrypt wrapKey unwrapKey \
  --expires "$(date -u -d '+1 year' +%Y-%m-%dT%H:%M:%SZ)" \
  --tags purpose=encryption environment=production

# Create an EC key for digital signatures (P-256)
az keyvault key create \
  --vault-name $KV_NAME \
  --name "signing-key" \
  --kty EC-HSM \
  --curve P-256 \
  --ops sign verify \
  --tags purpose=signing environment=production

# Create an RSA key for key wrapping (protecting other keys)
az keyvault key create \
  --vault-name $KV_NAME \
  --name "key-wrapping-key" \
  --kty RSA-HSM \
  --size 4096 \
  --ops wrapKey unwrapKey \
  --tags purpose=kek environment=production

# List all keys with their properties
az keyvault key list --vault-name $KV_NAME \
  --query "[].{name:name, keyType:kty, keySize:keySize, curve:curveName, ops:keyOps}" -o table

# Get key details including public key material
az keyvault key show --vault-name $KV_NAME --name "data-encryption-key" \
  --query "{kid:key.kid, kty:key.kty, size:key.n, operations:key.keyOps}"

# Rotate a key (creates new version, old version still works for decrypt)
az keyvault key rotate --vault-name $KV_NAME --name "data-encryption-key"

# List key versions
az keyvault key list-versions --vault-name $KV_NAME --name "data-encryption-key" \
  --query "[].{version:kid, created:attributes.created, enabled:attributes.enabled}" -o table
```

## Task 3: Configure key rotation policy

Set up automatic key rotation policies to ensure keys are regularly rotated.

```bash
# Set rotation policy for the data encryption key
# Rotate every 90 days, notify 30 days before expiry
az keyvault key rotation-policy update \
  --vault-name $KV_NAME \
  --name "data-encryption-key" \
  --value '{
    "lifetimeActions": [
      {
        "trigger": {
          "timeAfterCreate": "P90D"
        },
        "action": {
          "type": "Rotate"
        }
      },
      {
        "trigger": {
          "timeBeforeExpiry": "P30D"
        },
        "action": {
          "type": "Notify"
        }
      }
    ],
    "attributes": {
      "expiryTime": "P1Y"
    }
  }'

# Verify the rotation policy
az keyvault key rotation-policy show \
  --vault-name $KV_NAME \
  --name "data-encryption-key"

# Manually trigger rotation (simulates automated rotation)
az keyvault key rotate --vault-name $KV_NAME --name "data-encryption-key"

# Configure rotation policy for the signing key (180 days)
az keyvault key rotation-policy update \
  --vault-name $KV_NAME \
  --name "signing-key" \
  --value '{
    "lifetimeActions": [
      {
        "trigger": {
          "timeAfterCreate": "P180D"
        },
        "action": {
          "type": "Rotate"
        }
      },
      {
        "trigger": {
          "timeBeforeExpiry": "P60D"
        },
        "action": {
          "type": "Notify"
        }
      }
    ],
    "attributes": {
      "expiryTime": "P2Y"
    }
  }'
```

## Task 4: Create and manage TLS certificates

Generate self-signed certificates and configure certificate policies for automated renewal.

```bash
# Create a self-signed certificate for testing
az keyvault certificate create \
  --vault-name $KV_NAME \
  --name "contoso-api-cert" \
  --policy '{
    "issuerParameters": {
      "name": "Self"
    },
    "keyProperties": {
      "exportable": true,
      "keyType": "RSA",
      "keySize": 2048,
      "reuseKey": false
    },
    "secretProperties": {
      "contentType": "application/x-pkcs12"
    },
    "x509CertificateProperties": {
      "subject": "CN=api.contoso.com",
      "subjectAlternativeNames": {
        "dnsNames": ["api.contoso.com", "*.api.contoso.com"]
      },
      "validityInMonths": 12,
      "keyUsage": ["digitalSignature", "keyEncipherment"],
      "ekus": ["1.3.6.1.5.5.7.3.1"]
    },
    "lifetimeActions": [
      {
        "trigger": {
          "daysBeforeExpiry": 30
        },
        "action": {
          "actionType": "AutoRenew"
        }
      }
    ]
  }'

# Create a certificate with DigiCert integration (requires configured issuer)
# First, set up the certificate issuer
# az keyvault certificate issuer create \
#   --vault-name $KV_NAME \
#   --issuer-name "DigiCertIssuer" \
#   --provider-name "DigiCert" \
#   --account-id "DIGICERT_ACCOUNT_ID" \
#   --password "DIGICERT_API_KEY"

# Create a wildcard certificate
az keyvault certificate create \
  --vault-name $KV_NAME \
  --name "contoso-wildcard-cert" \
  --policy '{
    "issuerParameters": {
      "name": "Self"
    },
    "keyProperties": {
      "exportable": true,
      "keyType": "RSA",
      "keySize": 4096,
      "reuseKey": false
    },
    "secretProperties": {
      "contentType": "application/x-pkcs12"
    },
    "x509CertificateProperties": {
      "subject": "CN=*.contoso.com",
      "validityInMonths": 12
    },
    "lifetimeActions": [
      {
        "trigger": {
          "lifetimePercentage": 80
        },
        "action": {
          "actionType": "AutoRenew"
        }
      }
    ]
  }'

# Check certificate status
az keyvault certificate show --vault-name $KV_NAME --name "contoso-api-cert" \
  --query "{subject:policy.x509CertificateProperties.subject, expires:attributes.expires, thumbprint:x509Thumbprint}" -o json

# List all certificates with expiration
az keyvault certificate list --vault-name $KV_NAME \
  --query "[].{name:name, expires:attributes.expires, enabled:attributes.enabled}" -o table

# Download certificate (PEM format)
az keyvault certificate download \
  --vault-name $KV_NAME \
  --name "contoso-api-cert" \
  --file "contoso-api-cert.pem" \
  --encoding PEM
```

## Task 5: Import existing certificates and configure alerts

Import externally generated certificates and set up near-expiration notifications.

```bash
# Generate a certificate externally (simulating a CA-signed cert)
openssl req -x509 -newkey rsa:2048 \
  -keyout external-key.pem \
  -out external-cert.pem \
  -days 365 -nodes \
  -subj "/CN=external.contoso.com/O=Contoso Ltd/C=US"

# Convert to PFX for import
openssl pkcs12 -export \
  -out external-cert.pfx \
  -inkey external-key.pem \
  -in external-cert.pem \
  -passout pass:TempP@ss123

# Import the certificate into Key Vault
az keyvault certificate import \
  --vault-name $KV_NAME \
  --name "external-contoso-cert" \
  --file "external-cert.pfx" \
  --password "TempP@ss123" \
  --tags source=external issuer=externCA environment=production

# Set up Event Grid subscription for certificate near-expiry notifications
az eventgrid event-subscription create \
  --name "cert-expiry-notification" \
  --source-resource-id $KV_ID \
  --endpoint-type webhook \
  --endpoint "https://contoso-alerts.azurewebsites.net/api/keyvault-events" \
  --included-event-types "Microsoft.KeyVault.CertificateNearExpiry" "Microsoft.KeyVault.CertificateExpired" \
  2>/dev/null || echo "Event Grid subscription requires a valid webhook endpoint"

# Check which certificates are expiring soon
az keyvault certificate list --vault-name $KV_NAME \
  --include-pending true \
  --query "[?attributes.expires<='$(date -u -d '+60 days' +%Y-%m-%dT%H:%M:%SZ)'].{name:name, expires:attributes.expires}" -o table

# Clean up temporary files
rm -f external-key.pem external-cert.pem external-cert.pfx contoso-api-cert.pem
```

## Task 6: Configure Key Vault for Azure service encryption (CMK)

Set up Customer-Managed Keys (CMK) for encrypting Azure Storage with Key Vault keys.

```bash
# Create a storage account for CMK demonstration
CMK_STORAGE="stcontosocmk$(openssl rand -hex 4)"
az storage account create \
  --name $CMK_STORAGE \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --sku Standard_LRS \
  --identity-type SystemAssigned

# Get the storage account's managed identity
STORAGE_IDENTITY=$(az storage account show \
  --name $CMK_STORAGE \
  --resource-group $RG_NAME \
  --query "identity.principalId" -o tsv)

# Grant the storage account access to wrap/unwrap keys
az role assignment create \
  --assignee-object-id $STORAGE_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Crypto Service Encryption User" \
  --scope $KV_ID

# Create a key specifically for CMK encryption
az keyvault key create \
  --vault-name $KV_NAME \
  --name "storage-cmk" \
  --kty RSA-HSM \
  --size 2048 \
  --ops wrapKey unwrapKey

# Get the key URI (versioned)
KEY_URI=$(az keyvault key show \
  --vault-name $KV_NAME \
  --name "storage-cmk" \
  --query "key.kid" -o tsv)

# Configure storage account encryption with CMK
az storage account update \
  --name $CMK_STORAGE \
  --resource-group $RG_NAME \
  --encryption-key-source Microsoft.Keyvault \
  --encryption-key-vault "https://$KV_NAME.vault.azure.net" \
  --encryption-key-name "storage-cmk" \
  --encryption-key-version "" \
  --key-vault-user-identity-id ""

# Verify encryption configuration
az storage account show --name $CMK_STORAGE --resource-group $RG_NAME \
  --query "encryption.{source:keySource, keyVault:keyVaultProperties.keyVaultUri, keyName:keyVaultProperties.keyName}" -o json
```

---

## Break & Fix

### Scenario 1: Certificate renewal failed - "Issuer not found"

An auto-renewal certificate shows status "Failed" with error "The issuer 'DigiCert' is not found in the vault." The original certificate was imported manually.

<details>
<summary>Show solution</summary>

```bash
# Check the certificate policy
az keyvault certificate show --vault-name $KV_NAME --name "contoso-api-cert" \
  --query "policy.issuerParameters"

# The issue: The certificate policy references an issuer that doesn't exist
# For imported certificates, the issuer is typically set to "Unknown"

# Fix: Update the certificate policy to use Self-signed for auto-renewal
az keyvault certificate policy update \
  --vault-name $KV_NAME \
  --name "contoso-api-cert" \
  --issuer-name "Self" \
  --validity-in-months 12 \
  --lifetime-actions '[{"trigger":{"daysBeforeExpiry":30},"action":{"actionType":"AutoRenew"}}]'

# Alternative: If using a CA, configure the issuer first
# az keyvault certificate issuer create \
#   --vault-name $KV_NAME \
#   --issuer-name "DigiCert" \
#   --provider-name "DigiCert" \
#   --account-id "YOUR_ACCOUNT" \
#   --password "YOUR_API_KEY"

# For production CA-signed certs, change the policy to use EmailContacts
# which sends notification for manual renewal:
# az keyvault certificate policy update --vault-name $KV_NAME \
#   --name "contoso-api-cert" \
#   --lifetime-actions '[{"trigger":{"daysBeforeExpiry":30},"action":{"actionType":"EmailContacts"}}]'

# Verify pending certificate operations
az keyvault certificate pending show \
  --vault-name $KV_NAME \
  --name "contoso-api-cert" 2>/dev/null || echo "No pending operation"
```

</details>

### Scenario 2: CMK-encrypted storage account returns 403 after key rotation

After rotating the CMK key, the storage account returns access denied errors. Data appears inaccessible.

<details>
<summary>Show solution</summary>

```bash
# Check the current key version configured on storage
az storage account show --name $CMK_STORAGE --resource-group $RG_NAME \
  --query "encryption.keyVaultProperties.{keyName:keyName, keyVersion:keyVersion, keyVault:keyVaultUri}"

# The issue: Storage is configured with a specific key version that was disabled
# or the key was rotated and the storage still references the old version

# Fix Option 1: Configure storage to use the latest key version (auto-rotate)
az storage account update \
  --name $CMK_STORAGE \
  --resource-group $RG_NAME \
  --encryption-key-source Microsoft.Keyvault \
  --encryption-key-vault "https://$KV_NAME.vault.azure.net" \
  --encryption-key-name "storage-cmk" \
  --encryption-key-version ""

# Fix Option 2: Re-enable the old key version if it was disabled
OLD_VERSION=$(az keyvault key list-versions --vault-name $KV_NAME --name "storage-cmk" \
  --query "[?attributes.enabled==\`false\`].kid" -o tsv | head -1)

if [ -n "$OLD_VERSION" ]; then
  az keyvault key set-attributes \
    --id "$OLD_VERSION" \
    --enabled true
fi

# Verify storage account is accessible again
az storage blob list --account-name $CMK_STORAGE --container-name "\$logs" --auth-mode login 2>/dev/null || echo "Storage accessible"

# Best practice: Always use versionless key URI for auto-rotation support
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Contoso has a Key Vault key used for encrypting an Azure SQL Database (TDE). They want the key to automatically rotate every 90 days. What feature should they configure?",
    options: [
      "A Logic App that creates a new key version every 90 days",
      "Key Vault key rotation policy with auto-rotate action",
      "Azure Automation runbook with scheduled key creation",
      "Azure Policy to enforce key age limits"
    ],
    correctIndex: 1,
    explanation: "Key Vault's built-in rotation policy supports automatic key rotation based on time triggers. Configuring a rotation policy with a 'Rotate' action triggered 'P90D' after creation ensures the key is automatically rotated every 90 days, creating a new version while keeping old versions available for decryption."
  },
  {
    question: "An application uses Key Vault references in App Service. After a secret is rotated (new version created), what happens to the application?",
    options: [
      "The application immediately uses the new secret version",
      "The application continues using the old version until restarted",
      "The application picks up the new version within 24 hours without restart",
      "The reference breaks and must be updated with the new version ID"
    ],
    correctIndex: 2,
    explanation: "Key Vault references in App Service poll for new secret versions periodically (approximately every 24 hours). The reference resolves to the latest version automatically without requiring a restart or configuration change. For immediate pickup, you can trigger a restart or use a versionless secret URI."
  },
  {
    question: "Which key operation is needed for a managed identity to use a Key Vault key for Azure Storage encryption (CMK)?",
    options: [
      "encrypt and decrypt",
      "sign and verify",
      "wrapKey and unwrapKey",
      "import and export"
    ],
    correctIndex: 2,
    explanation: "Azure Storage CMK uses envelope encryption: the storage encryption key (DEK) is wrapped (encrypted) by the Key Vault key (KEK). The managed identity needs wrapKey permission to protect new DEKs and unwrapKey to access existing encrypted data. The 'Key Vault Crypto Service Encryption User' role provides exactly these permissions."
  },
  {
    question: "A Key Vault certificate is configured with a lifetime action of 'AutoRenew' triggered at 80% of lifetime. The certificate is valid for 12 months. When will auto-renewal be triggered?",
    options: [
      "30 days before expiry",
      "After approximately 9.6 months (80% of 12 months)",
      "60 days before expiry",
      "At the 6-month midpoint"
    ],
    correctIndex: 1,
    explanation: "When using 'lifetimePercentage' as the trigger, the action fires when that percentage of the certificate's validity period has elapsed. For a 12-month certificate at 80%, renewal triggers at approximately 9.6 months (288 days), giving about 2.4 months for the new certificate to be issued and deployed."
  }
]} />

## Cleanup

```bash
# Delete certificates
az keyvault certificate delete --vault-name $KV_NAME --name "contoso-api-cert"
az keyvault certificate delete --vault-name $KV_NAME --name "contoso-wildcard-cert"
az keyvault certificate delete --vault-name $KV_NAME --name "external-contoso-cert"

# Delete keys
az keyvault key delete --vault-name $KV_NAME --name "data-encryption-key"
az keyvault key delete --vault-name $KV_NAME --name "signing-key"
az keyvault key delete --vault-name $KV_NAME --name "key-wrapping-key"
az keyvault key delete --vault-name $KV_NAME --name "storage-cmk"

# Delete secrets
az keyvault secret delete --vault-name $KV_NAME --name "sql-connection-string"
az keyvault secret delete --vault-name $KV_NAME --name "third-party-api-key"

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait

# Purge soft-deleted items if needed (only if purge protection is not enabled)
# az keyvault secret purge --vault-name $KV_NAME --name "sql-connection-string"
# az keyvault key purge --vault-name $KV_NAME --name "data-encryption-key"
```
