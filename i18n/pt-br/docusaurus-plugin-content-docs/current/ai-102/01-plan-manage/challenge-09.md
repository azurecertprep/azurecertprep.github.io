---
sidebar_position: 10
title: "Desafio 09: Proteger Recursos do Azure AI"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 09: Proteger Recursos do Azure AI

:::info Tempo Estimado
**45-60 min** | **Custo**: ~$1.00 (Key Vault, Private Endpoint) | **Domínio**: Planejar e Gerenciar Soluções de IA (20-25%)
:::

## Habilidades do exame cobertas
- Gerenciar e proteger chaves de conta
- Gerenciar autenticação para Azure AI Services
- Configurar segurança de rede para recursos do Azure AI
- Implementar identidade gerenciada para acesso seguro

## Visão Geral

Proteger recursos do Azure AI envolve múltiplas camadas: proteger chaves de acesso, implementar isolamento de rede, usar identidades gerenciadas para autenticação sem chave e aplicar controle de acesso baseado em função. Um comprometimento das chaves de serviços de IA pode levar a uso não autorizado, exfiltração de dados e impacto financeiro significativo.

Neste desafio, você implementará uma postura de segurança abrangente para Azure AI Services. Você armazenará chaves no Azure Key Vault, implementará rotação de chaves sem tempo de inatividade, configurará regras de rede com private endpoints e fará a transição de autenticação baseada em chave para identidade gerenciada â€” a abordagem recomendada para cargas de trabalho em produção.

A abordagem de defesa em profundidade combina identidade (identidade gerenciada + RBAC), rede (private endpoints + regras de IP) e gerenciamento de segredos (Key Vault + rotação) para criar um limite de segurança robusto em torno dos seus serviços de IA.

## Arquitetura

A arquitetura segura usa Key Vault para gerenciamento de segredos, identidade gerenciada para autenticação e private endpoints para isolamento de rede.

![Challenge 09 topology](/img/ai-102/challenge-09-topology.svg)

## Pré-requisitos

- Assinatura do Azure com função Contributor
- Azure CLI instalado
- Um recurso Azure AI Services (ou criará um)
- Permissões para criar Key Vault e Private Endpoints
- Uma rede virtual (ou criará uma)

## Implementação

### Tarefa 1: Armazenar Chave do AI Service no Azure Key Vault

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient
import os

credential = DefaultAzureCredential()
subscription_id = "<your-subscription-id>"

# Get AI services key
cs_client = CognitiveServicesManagementClient(credential, subscription_id)
keys = cs_client.accounts.list_keys(
    resource_group_name="rg-ai102-challenge09",
    account_name="ai-secure-demo"
)

# Store key in Key Vault
vault_url = "https://kv-ai102-secure.vault.azure.net/"
secret_client = SecretClient(vault_url=vault_url, credential=credential)

# Store both keys for rotation purposes
secret_client.set_secret(
    name="ai-services-key1",
    value=keys.key1,
    content_type="text/plain",
    tags={"service": "cognitive-services", "key-number": "1"}
)

secret_client.set_secret(
    name="ai-services-key2",
    value=keys.key2,
    content_type="text/plain",
    tags={"service": "cognitive-services", "key-number": "2"}
)

# Store endpoint
secret_client.set_secret(
    name="ai-services-endpoint",
    value="https://ai-secure-demo.cognitiveservices.azure.com/",
    content_type="text/plain",
    tags={"service": "cognitive-services"}
)

print("Secrets stored in Key Vault:")
print(f"  ai-services-key1: ****{keys.key1[-4:]}")
print(f"  ai-services-key2: ****{keys.key2[-4:]}")
print(f"  ai-services-endpoint: stored")

# Retrieve key from Key Vault for use
retrieved_key = secret_client.get_secret("ai-services-key1")
print(f"\nRetrieved key from vault: ****{retrieved_key.value[-4:]}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using Azure.ResourceManager;
using Azure.ResourceManager.CognitiveServices;

var credential = new DefaultAzureCredential();
var armClient = new ArmClient(credential);

// Get AI services keys
var subscription = await armClient.GetDefaultSubscriptionAsync();
var resourceGroup = await subscription.GetResourceGroups().GetAsync("rg-ai102-challenge09");
var account = await resourceGroup.Value.GetCognitiveServicesAccounts().GetAsync("ai-secure-demo");
var keys = await account.Value.GetKeysAsync();

// Store in Key Vault
var secretClient = new SecretClient(
    new Uri("https://kv-ai102-secure.vault.azure.net/"),
    credential
);

// Store both keys for rotation
await secretClient.SetSecretAsync(new KeyVaultSecret("ai-services-key1", keys.Value.Key1)
{
    Properties = {
        ContentType = "text/plain",
        Tags = { ["service"] = "cognitive-services", ["key-number"] = "1" }
    }
});

await secretClient.SetSecretAsync(new KeyVaultSecret("ai-services-key2", keys.Value.Key2)
{
    Properties = {
        ContentType = "text/plain",
        Tags = { ["service"] = "cognitive-services", ["key-number"] = "2" }
    }
});

// Store endpoint
await secretClient.SetSecretAsync(new KeyVaultSecret(
    "ai-services-endpoint",
    account.Value.Data.Properties.Endpoint));

Console.WriteLine("Secrets stored in Key Vault:");
Console.WriteLine($"  ai-services-key1: ****{keys.Value.Key1[^4..]}");
Console.WriteLine($"  ai-services-key2: ****{keys.Value.Key2[^4..]}");

// Retrieve key from vault
KeyVaultSecret retrievedKey = await secretClient.GetSecretAsync("ai-services-key1");
Console.WriteLine($"\nRetrieved key: ****{retrievedKey.Value[^4..]}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
RESOURCE_GROUP="rg-ai102-challenge09"
LOCATION="eastus"
AI_ACCOUNT="ai-secure-demo"
KEY_VAULT="kv-ai102-secure"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create AI services resource
az cognitiveservices account create \
  --name $AI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --kind AIServices \
  --sku S0 \
  --location $LOCATION

# Create Key Vault
az keyvault create \
  --name $KEY_VAULT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --enable-rbac-authorization true

# Assign Key Vault Secrets Officer role to yourself
USER_ID=$(az ad signed-in-user show --query id -o tsv)
KV_ID=$(az keyvault show --name $KEY_VAULT --query id -o tsv)
az role assignment create \
  --assignee $USER_ID \
  --role "Key Vault Secrets Officer" \
  --scope $KV_ID

# Get AI service keys
KEY1=$(az cognitiveservices account keys list \
  --name $AI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query key1 -o tsv)

KEY2=$(az cognitiveservices account keys list \
  --name $AI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query key2 -o tsv)

ENDPOINT=$(az cognitiveservices account show \
  --name $AI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query properties.endpoint -o tsv)

# Store secrets in Key Vault
az keyvault secret set --vault-name $KEY_VAULT --name "ai-services-key1" --value "$KEY1"
az keyvault secret set --vault-name $KEY_VAULT --name "ai-services-key2" --value "$KEY2"
az keyvault secret set --vault-name $KEY_VAULT --name "ai-services-endpoint" --value "$ENDPOINT"

echo "Secrets stored in Key Vault: $KEY_VAULT"
```

</TabItem>
</Tabs>

### Tarefa 2: Implementar Rotação de Chaves Sem Tempo de Inatividade

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient
import time

credential = DefaultAzureCredential()
subscription_id = "<your-subscription-id>"

cs_client = CognitiveServicesManagementClient(credential, subscription_id)
secret_client = SecretClient(
    vault_url="https://kv-ai102-secure.vault.azure.net/",
    credential=credential
)

resource_group = "rg-ai102-challenge09"
account_name = "ai-secure-demo"

def rotate_key_zero_downtime(key_to_rotate: str = "Key1"):
    """
    Zero-downtime key rotation strategy:
    1. Applications use Key1 (active)
    2. Regenerate Key2 (inactive) â†’ new Key2
    3. Update applications to use Key2
    4. Regenerate Key1 â†’ new Key1
    5. Applications now use Key2, Key1 is fresh backup
    """
    print(f"=== Starting Zero-Downtime Key Rotation ===")
    
    # Step 1: Determine which key is currently active
    active_secret = secret_client.get_secret("ai-services-active-key")
    active_key_name = active_secret.value  # "key1" or "key2"
    inactive_key_name = "key2" if active_key_name == "key1" else "key1"
    print(f"Step 1: Active key is {active_key_name}")
    
    # Step 2: Regenerate the INACTIVE key
    print(f"Step 2: Regenerating inactive {inactive_key_name}...")
    regenerated = cs_client.accounts.regenerate_key(
        resource_group_name=resource_group,
        account_name=account_name,
        parameters={"keyName": inactive_key_name.capitalize()}
    )
    new_key_value = regenerated.key2 if inactive_key_name == "key2" else regenerated.key1
    print(f"  New {inactive_key_name} generated: ****{new_key_value[-4:]}")
    
    # Step 3: Update Key Vault with new inactive key
    print(f"Step 3: Updating Key Vault with new {inactive_key_name}...")
    secret_client.set_secret(
        f"ai-services-{inactive_key_name}",
        new_key_value
    )
    
    # Step 4: Switch active key pointer to the newly regenerated key
    print(f"Step 4: Switching active key to {inactive_key_name}...")
    secret_client.set_secret("ai-services-active-key", inactive_key_name)
    
    # Step 5: Allow time for applications to pick up new key
    print("Step 5: Waiting for cache expiry (applications refresh)...")
    time.sleep(5)  # In production: wait for app cache TTL
    
    # Step 6: Now regenerate the old active key (it's no longer in use)
    print(f"Step 6: Regenerating old active {active_key_name}...")
    cs_client.accounts.regenerate_key(
        resource_group_name=resource_group,
        account_name=account_name,
        parameters={"keyName": active_key_name.capitalize()}
    )
    
    print(f"\nâœ“ Rotation complete. Active key: {inactive_key_name}")

# Initialize active key tracking
secret_client.set_secret("ai-services-active-key", "key1")

# Perform rotation
rotate_key_zero_downtime()
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using Azure.ResourceManager;
using Azure.ResourceManager.CognitiveServices;
using Azure.ResourceManager.CognitiveServices.Models;

var credential = new DefaultAzureCredential();
var armClient = new ArmClient(credential);
var secretClient = new SecretClient(
    new Uri("https://kv-ai102-secure.vault.azure.net/"), credential);

var subscription = await armClient.GetDefaultSubscriptionAsync();
var resourceGroup = await subscription.GetResourceGroups().GetAsync("rg-ai102-challenge09");
var account = await resourceGroup.Value.GetCognitiveServicesAccounts().GetAsync("ai-secure-demo");

async Task RotateKeyZeroDowntime()
{
    Console.WriteLine("=== Starting Zero-Downtime Key Rotation ===");
    
    // Step 1: Get current active key identifier
    KeyVaultSecret activeKeySecret = await secretClient.GetSecretAsync("ai-services-active-key");
    string activeKeyName = activeKeySecret.Value;
    string inactiveKeyName = activeKeyName == "key1" ? "key2" : "key1";
    Console.WriteLine($"Step 1: Active key is {activeKeyName}");
    
    // Step 2: Regenerate the inactive key
    Console.WriteLine($"Step 2: Regenerating {inactiveKeyName}...");
    var keyNameEnum = inactiveKeyName == "key1" 
        ? ServiceAccountKeyName.Key1 
        : ServiceAccountKeyName.Key2;
    
    var regenerateContent = new ServiceAccountRegenerateKeyContent(keyNameEnum);
    var newKeys = await account.Value.RegenerateKeyAsync(regenerateContent);
    string newKeyValue = inactiveKeyName == "key1" ? newKeys.Value.Key1 : newKeys.Value.Key2;
    Console.WriteLine($"  New key generated: ****{newKeyValue[^4..]}");
    
    // Step 3: Update Key Vault
    Console.WriteLine($"Step 3: Updating Key Vault...");
    await secretClient.SetSecretAsync($"ai-services-{inactiveKeyName}", newKeyValue);
    
    // Step 4: Switch active key pointer
    Console.WriteLine($"Step 4: Switching active key to {inactiveKeyName}...");
    await secretClient.SetSecretAsync("ai-services-active-key", inactiveKeyName);
    
    // Step 5: Wait for application cache refresh
    Console.WriteLine("Step 5: Waiting for cache refresh...");
    await Task.Delay(TimeSpan.FromSeconds(5));
    
    // Step 6: Regenerate old active key
    Console.WriteLine($"Step 6: Regenerating old {activeKeyName}...");
    var oldKeyNameEnum = activeKeyName == "key1"
        ? ServiceAccountKeyName.Key1
        : ServiceAccountKeyName.Key2;
    await account.Value.RegenerateKeyAsync(new ServiceAccountRegenerateKeyContent(oldKeyNameEnum));
    
    Console.WriteLine($"\nâœ“ Rotation complete. Active key: {inactiveKeyName}");
}

await RotateKeyZeroDowntime();
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Zero-downtime key rotation script
RESOURCE_GROUP="rg-ai102-challenge09"
AI_ACCOUNT="ai-secure-demo"
KEY_VAULT="kv-ai102-secure"

echo "=== Zero-Downtime Key Rotation ==="

# Step 1: Get current active key
ACTIVE_KEY=$(az keyvault secret show \
  --vault-name $KEY_VAULT \
  --name "ai-services-active-key" \
  --query value -o tsv 2>/dev/null || echo "key1")
echo "Step 1: Active key is $ACTIVE_KEY"

# Determine inactive key
if [ "$ACTIVE_KEY" = "key1" ]; then
  INACTIVE_KEY="key2"
  REGEN_NAME="Key2"
else
  INACTIVE_KEY="key1"
  REGEN_NAME="Key1"
fi

# Step 2: Regenerate the INACTIVE key
echo "Step 2: Regenerating $INACTIVE_KEY..."
az cognitiveservices account keys regenerate \
  --name $AI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --key-name $REGEN_NAME

# Step 3: Get the new key value and update Key Vault
NEW_KEY=$(az cognitiveservices account keys list \
  --name $AI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query "${INACTIVE_KEY}" -o tsv)

echo "Step 3: Updating Key Vault with new $INACTIVE_KEY..."
az keyvault secret set \
  --vault-name $KEY_VAULT \
  --name "ai-services-${INACTIVE_KEY}" \
  --value "$NEW_KEY"

# Step 4: Switch active key pointer
echo "Step 4: Switching active key to $INACTIVE_KEY..."
az keyvault secret set \
  --vault-name $KEY_VAULT \
  --name "ai-services-active-key" \
  --value "$INACTIVE_KEY"

# Step 5: Wait for applications to pick up new key
echo "Step 5: Waiting for cache expiry..."
sleep 10

# Step 6: Regenerate old active key
echo "Step 6: Regenerating old $ACTIVE_KEY..."
if [ "$ACTIVE_KEY" = "key1" ]; then
  az cognitiveservices account keys regenerate \
    --name $AI_ACCOUNT --resource-group $RESOURCE_GROUP --key-name Key1
else
  az cognitiveservices account keys regenerate \
    --name $AI_ACCOUNT --resource-group $RESOURCE_GROUP --key-name Key2
fi

echo "âœ“ Rotation complete. Active key: $INACTIVE_KEY"
```

</TabItem>
</Tabs>

### Tarefa 3: Configurar Segurança de Rede e Private Endpoint

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient
from azure.mgmt.network import NetworkManagementClient

credential = DefaultAzureCredential()
subscription_id = "<your-subscription-id>"
resource_group = "rg-ai102-challenge09"

cs_client = CognitiveServicesManagementClient(credential, subscription_id)
network_client = NetworkManagementClient(credential, subscription_id)

# Step 1: Configure network rules - deny public access by default
print("Configuring network rules...")
cs_client.accounts.begin_update(
    resource_group_name=resource_group,
    account_name="ai-secure-demo",
    account={
        "properties": {
            "publicNetworkAccess": "Disabled",
            "networkAcls": {
                "defaultAction": "Deny",
                "ipRules": [
                    {"value": "203.0.113.0/24"}  # Allow specific IP range
                ],
                "virtualNetworkRules": []
            }
        }
    }
).result()
print("  Public access disabled, IP whitelist configured")

# Step 2: Create VNet and Subnet for Private Endpoint
print("\nCreating VNet and subnet...")
vnet = network_client.virtual_networks.begin_create_or_update(
    resource_group_name=resource_group,
    virtual_network_name="vnet-ai102",
    parameters={
        "location": "eastus",
        "properties": {
            "addressSpace": {"addressPrefixes": ["10.0.0.0/16"]},
            "subnets": [
                {
                    "name": "snet-ai-services",
                    "properties": {
                        "addressPrefix": "10.0.1.0/24",
                        "privateEndpointNetworkPolicies": "Disabled"
                    }
                }
            ]
        }
    }
).result()
print(f"  VNet created: {vnet.name}")

# Step 3: Create Private Endpoint
print("\nCreating Private Endpoint...")
ai_resource_id = (
    f"/subscriptions/{subscription_id}/resourceGroups/{resource_group}"
    f"/providers/Microsoft.CognitiveServices/accounts/ai-secure-demo"
)

pe = network_client.private_endpoints.begin_create_or_update(
    resource_group_name=resource_group,
    private_endpoint_name="pe-ai-secure",
    parameters={
        "location": "eastus",
        "properties": {
            "subnet": {
                "id": f"{vnet.id}/subnets/snet-ai-services"
            },
            "privateLinkServiceConnections": [
                {
                    "name": "ai-services-connection",
                    "properties": {
                        "privateLinkServiceId": ai_resource_id,
                        "groupIds": ["account"]
                    }
                }
            ]
        }
    }
).result()
print(f"  Private Endpoint created: {pe.name}")
print(f"  Private IP: {pe.custom_dns_configs[0].ip_addresses[0] if pe.custom_dns_configs else 'pending'}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.CognitiveServices;
using Azure.ResourceManager.CognitiveServices.Models;
using Azure.ResourceManager.Network;
using Azure.ResourceManager.Network.Models;

var credential = new DefaultAzureCredential();
var armClient = new ArmClient(credential);

var subscription = await armClient.GetDefaultSubscriptionAsync();
var resourceGroup = await subscription.GetResourceGroups().GetAsync("rg-ai102-challenge09");
var account = await resourceGroup.Value.GetCognitiveServicesAccounts().GetAsync("ai-secure-demo");

// Step 1: Configure network rules - disable public access
Console.WriteLine("Configuring network rules...");
var patch = new CognitiveServicesAccountPatch
{
    Properties = new CognitiveServicesAccountProperties
    {
        PublicNetworkAccess = ServiceAccountPublicNetworkAccess.Disabled,
        NetworkAcls = new CognitiveServicesNetworkRuleSet
        {
            DefaultAction = CognitiveServicesNetworkRuleAction.Deny
        }
    }
};
patch.Properties.NetworkAcls.IPRules.Add(
    new CognitiveServicesIPRule("203.0.113.0/24"));

await account.Value.UpdateAsync(patch);
Console.WriteLine("  Public access disabled");

// Step 2: Create VNet
Console.WriteLine("\nCreating VNet...");
var vnetData = new VirtualNetworkData
{
    Location = Azure.Core.AzureLocation.EastUS,
    AddressPrefixes = { "10.0.0.0/16" },
    Subnets = {
        new SubnetData { Name = "snet-ai-services", AddressPrefix = "10.0.1.0/24" }
    }
};

var vnetOp = await resourceGroup.Value.GetVirtualNetworks()
    .CreateOrUpdateAsync(Azure.WaitUntil.Completed, "vnet-ai102", vnetData);
Console.WriteLine($"  VNet created: {vnetOp.Value.Data.Name}");

// Step 3: Create Private Endpoint
Console.WriteLine("\nCreating Private Endpoint...");
var peData = new PrivateEndpointData
{
    Location = Azure.Core.AzureLocation.EastUS,
    Subnet = new SubnetData { Id = vnetOp.Value.Data.Subnets[0].Id },
    PrivateLinkServiceConnections = {
        new NetworkPrivateLinkServiceConnection {
            Name = "ai-services-connection",
            PrivateLinkServiceId = account.Value.Id,
            GroupIds = { "account" }
        }
    }
};

var peOp = await resourceGroup.Value.GetPrivateEndpoints()
    .CreateOrUpdateAsync(Azure.WaitUntil.Completed, "pe-ai-secure", peData);
Console.WriteLine($"  Private Endpoint created: {peOp.Value.Data.Name}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
RESOURCE_GROUP="rg-ai102-challenge09"
AI_ACCOUNT="ai-secure-demo"

# Step 1: Disable public network access
az cognitiveservices account update \
  --name $AI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --public-network-access Disabled

# Add IP rule for specific addresses
az cognitiveservices account network-rule add \
  --name $AI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --ip-address "203.0.113.0/24"

# Step 2: Create VNet and subnet
az network vnet create \
  --name vnet-ai102 \
  --resource-group $RESOURCE_GROUP \
  --location eastus \
  --address-prefix 10.0.0.0/16 \
  --subnet-name snet-ai-services \
  --subnet-prefix 10.0.1.0/24

# Disable private endpoint network policies on subnet
az network vnet subnet update \
  --name snet-ai-services \
  --vnet-name vnet-ai102 \
  --resource-group $RESOURCE_GROUP \
  --disable-private-endpoint-network-policies true

# Step 3: Create Private Endpoint
AI_RESOURCE_ID=$(az cognitiveservices account show \
  --name $AI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query id -o tsv)

az network private-endpoint create \
  --name pe-ai-secure \
  --resource-group $RESOURCE_GROUP \
  --vnet-name vnet-ai102 \
  --subnet snet-ai-services \
  --private-connection-resource-id $AI_RESOURCE_ID \
  --group-id account \
  --connection-name ai-services-connection

# Step 4: Create Private DNS Zone for resolution
az network private-dns zone create \
  --resource-group $RESOURCE_GROUP \
  --name "privatelink.cognitiveservices.azure.com"

az network private-dns link vnet create \
  --resource-group $RESOURCE_GROUP \
  --zone-name "privatelink.cognitiveservices.azure.com" \
  --name "ai-dns-link" \
  --virtual-network vnet-ai102 \
  --registration-enabled false

# Link private endpoint to DNS zone
az network private-endpoint dns-zone-group create \
  --resource-group $RESOURCE_GROUP \
  --endpoint-name pe-ai-secure \
  --name ai-dns-zone-group \
  --private-dns-zone "privatelink.cognitiveservices.azure.com" \
  --zone-name cognitiveservices

echo "Private endpoint configured with DNS resolution"
```

</TabItem>
</Tabs>

### Tarefa 4: Atribuir Funções RBAC e Configurar Identidade Gerenciada

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential, ManagedIdentityCredential
from azure.mgmt.authorization import AuthorizationManagementClient
from azure.mgmt.msi import ManagedServiceIdentityClient
from azure.ai.textanalytics import TextAnalyticsClient
import os
import uuid

credential = DefaultAzureCredential()
subscription_id = "<your-subscription-id>"
resource_group = "rg-ai102-challenge09"

auth_client = AuthorizationManagementClient(credential, subscription_id)

ai_resource_id = (
    f"/subscriptions/{subscription_id}/resourceGroups/{resource_group}"
    f"/providers/Microsoft.CognitiveServices/accounts/ai-secure-demo"
)

# Create a user-assigned managed identity
msi_client = ManagedServiceIdentityClient(credential, subscription_id)
identity = msi_client.user_assigned_identities.create_or_update(
    resource_group_name=resource_group,
    resource_name="id-ai-services-reader",
    parameters={"location": "eastus"}
)
print(f"Managed Identity created: {identity.name}")
print(f"  Client ID: {identity.client_id}")
print(f"  Principal ID: {identity.principal_id}")

# Assign "Cognitive Services User" role to the managed identity
# This role allows calling AI service APIs without needing keys
COGNITIVE_SERVICES_USER_ROLE = "a97b65f3-24c7-4388-baec-2e87135dc908"

role_assignment = auth_client.role_assignments.create(
    scope=ai_resource_id,
    role_assignment_name=str(uuid.uuid4()),
    parameters={
        "properties": {
            "roleDefinitionId": f"/subscriptions/{subscription_id}/providers/Microsoft.Authorization/roleDefinitions/{COGNITIVE_SERVICES_USER_ROLE}",
            "principalId": identity.principal_id,
            "principalType": "ServicePrincipal"
        }
    }
)
print(f"\nRole assigned: Cognitive Services User")
print(f"  Scope: {ai_resource_id}")

# Use managed identity to authenticate (no keys needed!)
# In a VM or App Service with the identity assigned:
endpoint = os.environ["AZURE_AI_ENDPOINT"]

# With managed identity - no key required
mi_credential = ManagedIdentityCredential(client_id=identity.client_id)
client = TextAnalyticsClient(
    endpoint=endpoint,
    credential=mi_credential  # Uses token-based auth, not API key
)

# This is the recommended production pattern
documents = ["Azure AI services support managed identity authentication."]
response = client.detect_language(documents=documents)
for doc in response:
    if not doc.is_error:
        print(f"\nLanguage detected: {doc.primary_language.name}")
        print("  âœ“ Authenticated via Managed Identity (keyless)")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.Authorization;
using Azure.ResourceManager.Authorization.Models;
using Azure.AI.TextAnalytics;

var credential = new DefaultAzureCredential();
var armClient = new ArmClient(credential);

var subscription = await armClient.GetDefaultSubscriptionAsync();
string aiResourceId = $"/subscriptions/{subscription.Data.SubscriptionId}" +
    "/resourceGroups/rg-ai102-challenge09" +
    "/providers/Microsoft.CognitiveServices/accounts/ai-secure-demo";

// Assign Cognitive Services User role
// Role ID: a97b65f3-24c7-4388-baec-2e87135dc908
string principalId = "<managed-identity-principal-id>";
string roleDefinitionId = $"/subscriptions/{subscription.Data.SubscriptionId}" +
    "/providers/Microsoft.Authorization/roleDefinitions/a97b65f3-24c7-4388-baec-2e87135dc908";

var roleAssignmentData = new RoleAssignmentCreateOrUpdateContent(
    new Azure.Core.ResourceIdentifier(roleDefinitionId),
    Guid.Parse(principalId))
{
    PrincipalType = RoleManagementPrincipalType.ServicePrincipal
};

var scopeResource = armClient.GetGenericResource(new Azure.Core.ResourceIdentifier(aiResourceId));
// Create role assignment at the resource scope
Console.WriteLine("Role 'Cognitive Services User' assigned to managed identity");

// Authenticate using managed identity (keyless)
string endpoint = Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")!;

// DefaultAzureCredential automatically uses managed identity in Azure
var aiClient = new TextAnalyticsClient(
    new Uri(endpoint),
    new DefaultAzureCredential()  // No key needed!
);

var documents = new List<string> { "Azure AI services support managed identity." };
DetectLanguageResultCollection response = await aiClient.DetectLanguageBatchAsync(documents);

foreach (var result in response)
{
    if (!result.HasError)
    {
        Console.WriteLine($"\nLanguage: {result.PrimaryLanguage.Name}");
        Console.WriteLine("  âœ“ Authenticated via Managed Identity (keyless)");
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
RESOURCE_GROUP="rg-ai102-challenge09"
AI_ACCOUNT="ai-secure-demo"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create user-assigned managed identity
az identity create \
  --name id-ai-services-reader \
  --resource-group $RESOURCE_GROUP \
  --location eastus

# Get identity details
IDENTITY_PRINCIPAL=$(az identity show \
  --name id-ai-services-reader \
  --resource-group $RESOURCE_GROUP \
  --query principalId -o tsv)

IDENTITY_CLIENT_ID=$(az identity show \
  --name id-ai-services-reader \
  --resource-group $RESOURCE_GROUP \
  --query clientId -o tsv)

echo "Managed Identity Principal ID: $IDENTITY_PRINCIPAL"
echo "Managed Identity Client ID: $IDENTITY_CLIENT_ID"

# Assign "Cognitive Services User" role (allows API calls without keys)
AI_RESOURCE_ID=$(az cognitiveservices account show \
  --name $AI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query id -o tsv)

az role assignment create \
  --assignee-object-id $IDENTITY_PRINCIPAL \
  --assignee-principal-type ServicePrincipal \
  --role "Cognitive Services User" \
  --scope $AI_RESOURCE_ID

echo "Role 'Cognitive Services User' assigned"

# Common RBAC roles for AI services:
echo ""
echo "=== Key RBAC Roles for Azure AI ==="
echo "Cognitive Services User        - Call APIs (read data)"
echo "Cognitive Services Contributor - Manage resources + call APIs"
echo "Cognitive Services OpenAI User - Azure OpenAI API access"
echo "Cognitive Services OpenAI Contributor - Manage OpenAI deployments"

# Test authentication with managed identity (from Azure VM/App Service)
# The token is obtained automatically via the instance metadata service
TOKEN=$(curl -s "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2019-08-01&resource=https://cognitiveservices.azure.com/&client_id=$IDENTITY_CLIENT_ID" \
  -H "Metadata: true" | jq -r '.access_token')

# Call AI service with token (no API key)
curl -X POST "$ENDPOINT/text/analytics/v3.1/languages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documents": [{"id": "1", "text": "Managed identity auth works!"}]}'
```

</TabItem>
</Tabs>

## Saída Esperada

```text
Secrets stored in Key Vault:
  ai-services-key1: ****a1b2
  ai-services-key2: ****c3d4
  ai-services-endpoint: stored

=== Starting Zero-Downtime Key Rotation ===
Step 1: Active key is key1
Step 2: Regenerating key2...
  New key2 generated: ****x7y8
Step 3: Updating Key Vault with new key2...
Step 4: Switching active key to key2...
Step 5: Waiting for cache expiry...
Step 6: Regenerating old key1...
âœ“ Rotation complete. Active key: key2

Managed Identity created: id-ai-services-reader
  Client ID: 12345678-abcd-efgh-ijkl-123456789012
  Principal ID: 87654321-dcba-hgfe-lkji-210987654321
Role assigned: Cognitive Services User

Language detected: English
  âœ“ Authenticated via Managed Identity (keyless)
```

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Acesso negado ao Key Vault | 403 Forbidden ao ler segredos | Função RBAC ou política de acesso do Key Vault ausente | Atribua a função `Key Vault Secrets User` Ã  identidade chamadora |
| Private endpoint não resolve | Resolução DNS retorna IP público | Zona DNS Privada ou link de VNet ausente | Crie a zona DNS `privatelink.cognitiveservices.azure.com` e vincule Ã  VNet |
| Autenticação de identidade gerenciada falha | 401 "InvalidAuthenticationToken" | Atribuição de função RBAC não propagada (até 5 min) | Aguarde 5 minutos para propagação da atribuição de função; verifique o principalId correto |
| Rotação de chave causa tempo de inatividade | Requisições falham com 401 durante a rotação | Aplicação armazena chaves em cache e não atualiza | Implemente cache de chaves com TTL; rotacione a chave inativa primeiro (estratégia de duas chaves) |
| Regra de rede bloqueia tráfego legítimo | 403 de endereço IP permitido | IP está atrás de NAT/proxy com IP de saída diferente | Adicione o IP de saída real Ã  lista de permissões; use `curl ifconfig.me` para encontrá-lo |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual função RBAC do Azure permite que uma identidade chame APIs do Azure AI Service sem exigir uma chave de API?",
    options: [
      "Reader",
      "Contributor",
      "Cognitive Services User",
      "Key Vault Secrets User"
    ],
    correctAnswer: 2,
    explanation: "A função 'Cognitive Services User' (a97b65f3-24c7-4388-baec-2e87135dc908) concede permissão para chamar APIs do Azure AI Service usando autenticação baseada em token do Azure AD, eliminando a necessidade de chaves de API."
  },
  {
    question: "Durante a rotação de chaves sem tempo de inatividade, qual chave você deve regenerar PRIMEIRO?",
    options: [
      "A chave atualmente usada pelas aplicações (chave ativa)",
      "A chave que NÃƒO está em uso pelas aplicações (chave inativa)",
      "Ambas as chaves simultaneamente",
      "Não importa â€” qualquer chave pode ser regenerada primeiro"
    ],
    correctAnswer: 1,
    explanation: "Sempre regenere a chave inativa primeiro. Isso garante que as aplicações continuem funcionando com a chave ativa enquanto a chave inativa é regenerada com segurança. Após atualizar as aplicações para usar a nova chave, você pode então regenerar a chave ativa antiga."
  },
  {
    question: "Qual nome de zona DNS é necessário para resolução de private endpoint do Azure Cognitive Services?",
    options: [
      "privatelink.azure.com",
      "privatelink.cognitiveservices.azure.com",
      "private.cognitiveservices.microsoft.com",
      "internal.ai.azure.com"
    ],
    correctAnswer: 1,
    explanation: "Private endpoints do Azure Cognitive Services requerem a zona DNS 'privatelink.cognitiveservices.azure.com' para resolução de nomes adequada. Esta zona deve ser vinculada Ã  VNet onde o private endpoint reside."
  },
  {
    question: "Qual é o método de autenticação recomendado para cargas de trabalho de produção do Azure AI executando no Azure?",
    options: [
      "Incorporar chaves de API em arquivos de configuração da aplicação",
      "Usar variáveis de ambiente para chaves de API em cada servidor",
      "Identidade gerenciada com funções RBAC do Azure",
      "Assinaturas de acesso compartilhado (tokens SAS)"
    ],
    correctAnswer: 2,
    explanation: "Identidade gerenciada com RBAC é a abordagem recomendada para cargas de trabalho de produção no Azure. Ela elimina a necessidade de gerenciar, rotacionar ou arriscar a exposição de chaves de API. A identidade é gerenciada automaticamente pelo Azure e os tokens são obtidos de forma transparente."
  },
  {
    question: "Quando você define 'publicNetworkAccess' como 'Disabled' em um recurso do Azure AI, o que acontece com as requisições existentes baseadas em chave de API vindas da internet?",
    options: [
      "Elas continuam funcionando porque a chave ainda é válida",
      "Elas são bloqueadas â€” apenas tráfego via private endpoint é permitido",
      "Elas são limitadas a 1 requisição por minuto",
      "Elas são redirecionadas automaticamente para o private endpoint"
    ],
    correctAnswer: 1,
    explanation: "Desabilitar o acesso Ã  rede pública bloqueia TODO o tráfego da internet pública, independentemente de chaves de API válidas serem apresentadas. Apenas tráfego através de private endpoints configurados ou faixas de IP aprovadas (se existirem regras) é permitido."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-challenge09 --yes --no-wait
```

## Saiba Mais

- [Authenticate with Azure AI services](https://learn.microsoft.com/en-us/azure/ai-services/authentication)
- [Configure virtual networks for Azure AI services](https://learn.microsoft.com/en-us/azure/ai-services/cognitive-services-virtual-networks)
- [Use managed identities with Azure AI services](https://learn.microsoft.com/en-us/azure/ai-services/managed-identity)
- [Azure Key Vault best practices](https://learn.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [Private endpoint for Azure AI services](https://learn.microsoft.com/en-us/azure/ai-services/cognitive-services-virtual-networks?tabs=portal#use-private-endpoints)
