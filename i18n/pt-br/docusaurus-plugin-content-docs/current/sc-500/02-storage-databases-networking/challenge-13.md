---
sidebar_position: 13
title: "Desafio 13: Segurança de Storage Account"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 13: Segurança de Storage Account

## Habilidades do exame cobertas

- Planejar e implementar segurança para storage accounts
- Configurar criptografia de storage account (chaves gerenciadas pela Microsoft e chaves gerenciadas pelo cliente)
- Configurar acesso à rede de storage account (firewalls e regras de rede virtual)
- Configurar shared access signatures (SAS) e stored access policies
- Gerenciar chaves de acesso de storage account e rotação de chaves
- Configurar gerenciamento de ciclo de vida do Azure Storage para segurança

## Cenário

A equipe de engenharia de dados da Contoso Ltd implantou múltiplas Azure Storage accounts contendo dados financeiros sensíveis e PII de clientes. A equipe de segurança identificou que várias contas estão publicamente acessíveis, usam apenas chaves de criptografia gerenciadas pela Microsoft e não possuem restrições de rede. Como engenheiro de segurança em nuvem, você deve fortalecer essas storage accounts implementando criptografia com chaves gerenciadas pelo cliente, restringindo o acesso à rede e estabelecendo padrões de acesso seguro usando tokens SAS e stored access policies.

---

## Pré-requisitos

- Assinatura Azure com role de Owner ou Contributor
- Azure CLI instalado e autenticado (`az login`)
- Um Azure Key Vault com uma chave RSA (ou disposição para criar um)
- Entendimento básico dos serviços Azure Storage

---

## Task 1: Criar uma storage account segura com criptografia de infraestrutura

Crie uma storage account com configurações de segurança aprimoradas incluindo criptografia de infraestrutura (criptografia dupla) e HTTPS obrigatório.

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

## Task 2: Configurar chaves gerenciadas pelo cliente (CMK) com Azure Key Vault

Configure a criptografia usando chaves gerenciadas pelo cliente armazenadas no Azure Key Vault com uma identidade gerenciada atribuída pelo sistema.

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

## Task 3: Configurar firewall e regras de rede virtual da storage account

Restrinja o acesso à storage account para redes virtuais e endereços IP específicos.

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

## Task 4: Configurar stored access policies e tokens SAS

Crie stored access policies para acesso controlado e gere tokens SAS restritos.

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

## Task 5: Configurar rotação de chaves e monitoramento

Configure rotação automática de chaves e logging de diagnóstico para eventos de segurança de storage.

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

## Quebra & conserta

### Cenário 1: Storage account acessível apesar das regras de firewall

Uma varredura de segurança mostra que a storage account ainda está acessível pela internet mesmo com regras de rede configuradas. O `defaultAction` está definido como `Allow`.

<details>
<summary>Mostrar solução</summary>

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

### Cenário 2: Criptografia CMK falhando — acesso ao Key Vault negado

Após a rotação da identidade gerenciada, a storage account não consegue mais acessar o Key Vault para operações de criptografia. Uploads de blobs falham com erro de criptografia.

<details>
<summary>Mostrar solução</summary>

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

### Cenário 3: Token SAS funciona após a stored access policy ser revogada

O acesso de um funcionário foi revogado deletando a stored access policy, mas ele relata que ainda consegue acessar blobs usando um token SAS gerado anteriormente.

<details>
<summary>Mostrar solução</summary>

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

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é o efeito de definir 'requireInfrastructureEncryption' como true em uma storage account?",
    options: [
      "Habilita criptografia em repouso usando apenas chaves gerenciadas pela Microsoft",
      "Fornece criptografia dupla com dois algoritmos de criptografia diferentes na camada de infraestrutura",
      "Criptografa dados em trânsito usando TLS 1.3",
      "Habilita criptografia do lado do cliente antes dos dados chegarem ao Azure"
    ],
    correctIndex: 1,
    explanation: "A criptografia de infraestrutura (criptografia dupla) adiciona uma segunda camada de criptografia no nível da infraestrutura do Azure Storage usando um algoritmo diferente, fornecendo defesa contra o comprometimento de qualquer algoritmo de criptografia individual."
  },
  {
    question: "Como você pode revogar imediatamente um token SAS que foi gerado com permissões inline (não vinculado a uma stored access policy)?",
    options: [
      "Deletar o token SAS do Azure Portal",
      "Atualizar a stored access policy para expirada",
      "Rotacionar a chave de acesso da storage account usada para assinar o SAS",
      "Definir o firewall da storage account para negar o IP do cliente"
    ],
    correctIndex: 2,
    explanation: "Tokens SAS com permissões inline não podem ser revogados individualmente. A única forma de invalidá-los imediatamente é rotacionar a chave de acesso da storage account que foi usada para assinar o token. Usar stored access policies permite revogação sem rotação de chave."
  },
  {
    question: "Ao configurar chaves gerenciadas pelo cliente (CMK) para criptografia do Azure Storage, qual permissão do Key Vault NÃO é necessária para a identidade gerenciada da storage account?",
    options: [
      "Get",
      "Wrap Key",
      "Unwrap Key",
      "Delete"
    ],
    correctIndex: 3,
    explanation: "A identidade gerenciada da storage account precisa apenas das permissões Get, Wrap Key e Unwrap Key no Key Vault. A permissão Delete não é necessária e violaria o princípio do menor privilégio."
  },
  {
    question: "O que definir 'allowSharedKeyAccess' como false em uma storage account impõe?",
    options: [
      "Todos os tokens SAS são imediatamente invalidados",
      "Somente autenticação via Azure AD (Microsoft Entra ID) é permitida para operações do plano de dados",
      "As chaves da storage account são deletadas",
      "Somente conexões via private endpoint são permitidas"
    ],
    correctIndex: 1,
    explanation: "Desabilitar o acesso por chave compartilhada força todas as requisições do plano de dados a autenticar usando Microsoft Entra ID (Azure AD). As chaves da storage account ainda existem mas não podem ser usadas para autenticação. Tokens SAS assinados com chaves da conta também são bloqueados."
  }
]} />

## Limpeza

```bash
# Delete the resource group and all resources
az group delete --name $RG --yes --no-wait

# Purge the Key Vault (if soft-delete is enabled)
az keyvault purge --name $KV_NAME --no-wait
```
