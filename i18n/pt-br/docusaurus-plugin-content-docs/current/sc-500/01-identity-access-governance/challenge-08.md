---
sidebar_position: 8
title: "Desafio 08: Gerenciamento de Segredos, Chaves e Certificados do Key Vault"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 08: Gerenciamento de Segredos, Chaves e Certificados do Key Vault

## Habilidades do exame cobertas

- Gerenciar ciclo de vida de segredos (criação, rotação, expiração)
- Configurar e gerenciar chaves criptográficas (RSA, EC, simétricas)
- Gerenciar certificados TLS/SSL e auto-renovação
- Implementar políticas de rotação de chaves
- Configurar versionamento de segredos e chaves
- Integrar Key Vault com serviços do Azure para criptografia

## Cenário

A Contoso Ltd precisa centralizar o gerenciamento de segredos de aplicativos, chaves de criptografia e certificados TLS. A empresa atualmente tem mais de 200 segredos espalhados por vários aplicativos sem política de rotação consistente, chaves de criptografia que nunca foram rotacionadas e certificados TLS que expiraram em produção causando indisponibilidades. A equipe de segurança deve implementar rotação automatizada, aplicar políticas de expiração e configurar o gerenciamento do ciclo de vida de certificados com auto-renovação a partir de uma CA integrada.

---

## Pré-requisitos

- Assinatura do Azure com acesso de Contributor
- Azure Key Vault (SKU Premium recomendado) já implantado
- Azure CLI instalado e autenticado
- Função de Key Vault Administrator ou Key Vault Secrets Officer
- Um nome de domínio para operações de certificado (opcional)

---

## Tarefa 1: Gerenciar segredos com versionamento e expiração

Crie segredos com metadados, datas de expiração e entenda o comportamento de versionamento.

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

## Tarefa 2: Criar e gerenciar chaves criptográficas

Gere chaves RSA e EC com propriedades específicas para diferentes casos de uso de criptografia.

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

## Tarefa 3: Configurar política de rotação de chaves

Configure políticas de rotação automática de chaves para garantir que as chaves sejam rotacionadas regularmente.

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

## Tarefa 4: Criar e gerenciar certificados TLS

Gere certificados auto-assinados e configure políticas de certificado para renovação automatizada.

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

## Tarefa 5: Importar certificados existentes e configurar alertas

Importe certificados gerados externamente e configure notificações de proximidade de expiração.

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

## Tarefa 6: Configurar Key Vault para criptografia de serviços do Azure (CMK)

Configure Customer-Managed Keys (CMK) para criptografar o Azure Storage com chaves do Key Vault.

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

### Cenário 1: Renovação de certificado falhou - "Issuer not found"

Um certificado de auto-renovação mostra status "Failed" com erro "The issuer 'DigiCert' is not found in the vault." O certificado original foi importado manualmente.

<details>
<summary>Mostrar solução</summary>

```bash
# Check the certificate policy
az keyvault certificate show --vault-name $KV_NAME --name "contoso-api-cert" \
  --query "policy.issuerParameters"

# The issue: The certificate policy references an issuer that doesn't exist
# For imported certificates, the issuer is typically set to "Unknown"

# Fix: Update the certificate policy to use Self-signed for auto-renewal
az keyvault certificate set-attributes \
  --vault-name $KV_NAME \
  --name "contoso-api-cert" \
  --policy '{
    "issuerParameters": {
      "name": "Self"
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

# Alternative: If using a CA, configure the issuer first
# az keyvault certificate issuer create \
#   --vault-name $KV_NAME \
#   --issuer-name "DigiCert" \
#   --provider-name "DigiCert" \
#   --account-id "YOUR_ACCOUNT" \
#   --password "YOUR_API_KEY"

# For production CA-signed certs, change the policy to use EmailContacts
# which sends notification for manual renewal:
# az keyvault certificate set-attributes --vault-name $KV_NAME \
#   --name "contoso-api-cert" \
#   --policy '{"lifetimeActions":[{"trigger":{"daysBeforeExpiry":30},"action":{"actionType":"EmailContacts"}}]}'

# Verify pending certificate operations
az keyvault certificate pending show \
  --vault-name $KV_NAME \
  --name "contoso-api-cert" 2>/dev/null || echo "No pending operation"
```

</details>

### Cenário 2: Storage account criptografado com CMK retorna 403 após rotação de chave

Após rotacionar a chave CMK, o storage account retorna erros de acesso negado. Os dados parecem inacessíveis.

<details>
<summary>Mostrar solução</summary>

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

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso tem uma chave do Key Vault usada para criptografar um Azure SQL Database (TDE). Eles querem que a chave seja rotacionada automaticamente a cada 90 dias. Qual recurso eles devem configurar?",
    options: [
      "Um Logic App que cria uma nova versão da chave a cada 90 dias",
      "Política de rotação de chave do Key Vault com ação de auto-rotação",
      "Runbook do Azure Automation com criação de chave agendada",
      "Azure Policy para impor limites de idade de chave"
    ],
    correctIndex: 1,
    explanation: "A política de rotação integrada do Key Vault suporta rotação automática de chaves baseada em gatilhos de tempo. Configurar uma política de rotação com uma ação 'Rotate' disparada 'P90D' após a criação garante que a chave seja automaticamente rotacionada a cada 90 dias, criando uma nova versão enquanto mantém versões anteriores disponíveis para descriptografia."
  },
  {
    question: "Um aplicativo usa referências do Key Vault no App Service. Após um segredo ser rotacionado (nova versão criada), o que acontece com o aplicativo?",
    options: [
      "O aplicativo usa imediatamente a nova versão do segredo",
      "O aplicativo continua usando a versão antiga até ser reiniciado",
      "O aplicativo obtém a nova versão dentro de 24 horas sem reiniciar",
      "A referência quebra e precisa ser atualizada com o novo ID de versão"
    ],
    correctIndex: 2,
    explanation: "Referências do Key Vault no App Service fazem polling por novas versões de segredos periodicamente (aproximadamente a cada 24 horas). A referência resolve para a versão mais recente automaticamente sem necessidade de reiniciar ou alterar a configuração. Para obter imediatamente, você pode disparar uma reinicialização ou usar um URI de segredo sem versão."
  },
  {
    question: "Qual operação de chave é necessária para uma Managed Identity usar uma chave do Key Vault para criptografia do Azure Storage (CMK)?",
    options: [
      "encrypt e decrypt",
      "sign e verify",
      "wrapKey e unwrapKey",
      "import e export"
    ],
    correctIndex: 2,
    explanation: "O CMK do Azure Storage usa criptografia envelope: a chave de criptografia do storage (DEK) é wrapped (criptografada) pela chave do Key Vault (KEK). A Managed Identity precisa da permissão wrapKey para proteger novos DEKs e unwrapKey para acessar dados criptografados existentes. A função 'Key Vault Crypto Service Encryption User' fornece exatamente essas permissões."
  },
  {
    question: "Um certificado do Key Vault está configurado com uma ação de ciclo de vida 'AutoRenew' disparada em 80% do tempo de vida. O certificado é válido por 12 meses. Quando a auto-renovação será disparada?",
    options: [
      "30 dias antes da expiração",
      "Após aproximadamente 9,6 meses (80% de 12 meses)",
      "60 dias antes da expiração",
      "No ponto médio de 6 meses"
    ],
    correctIndex: 1,
    explanation: "Ao usar 'lifetimePercentage' como gatilho, a ação é disparada quando essa porcentagem do período de validade do certificado tiver decorrido. Para um certificado de 12 meses em 80%, a renovação é disparada em aproximadamente 9,6 meses (288 dias), dando cerca de 2,4 meses para o novo certificado ser emitido e implantado."
  }
]} />

## Limpeza

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
