---
sidebar_position: 10
title: "Challenge 09: Secure Azure AI Resources"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 09: Secure Azure AI Resources

:::info Estimated Time
**45-60 min** | **Cost**: ~$1.00 (Key Vault, Private Endpoint) | **Domain**: Plan & Manage AI Solutions (20-25%)
:::

## Exam skills covered
- Manage and protect account keys
- Manage authentication for Azure AI services
- Configure network security for Azure AI resources
- Implement managed identity for secure access

## Overview

Securing Azure AI resources involves multiple layers: protecting access keys, implementing network isolation, using managed identities for keyless authentication, and enforcing role-based access control. A compromise of AI service keys can lead to unauthorized usage, data exfiltration, and significant financial impact.

In this challenge, you'll implement a comprehensive security posture for Azure AI services. You'll store keys in Azure Key Vault, implement zero-downtime key rotation, configure network rules with private endpoints, and transition from key-based authentication to managed identity â€” the recommended approach for production workloads.

The defense-in-depth approach combines identity (managed identity + RBAC), network (private endpoints + IP rules), and secrets management (Key Vault + rotation) to create a robust security boundary around your AI services.

## Architecture

The secure architecture uses Key Vault for secrets management, managed identity for authentication, and private endpoints for network isolation.

![Challenge 09 topology](/img/ai-102/challenge-09-topology.svg)

## Prerequisites

- Azure subscription with Contributor role
- Azure CLI installed
- An Azure AI services resource (or will create one)
- Permissions to create Key Vault and Private Endpoints
- A virtual network (or will create one)

## Implementation

### Task 1: Store AI Service Key in Azure Key Vault

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

### Task 2: Implement Zero-Downtime Key Rotation

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

### Task 3: Configure Network Security and Private Endpoint

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

### Task 4: Assign RBAC Roles and Configure Managed Identity

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

## Expected Output

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

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Key Vault access denied | 403 Forbidden when reading secrets | Missing Key Vault RBAC role or access policy | Assign `Key Vault Secrets User` role to the calling identity |
| Private endpoint not resolving | DNS resolution returns public IP | Missing Private DNS Zone or VNet link | Create `privatelink.cognitiveservices.azure.com` DNS zone and link to VNet |
| Managed identity auth fails | 401 "InvalidAuthenticationToken" | RBAC role assignment not propagated (up to 5 min) | Wait 5 minutes for role assignment propagation; verify correct principalId |
| Key rotation causes downtime | Requests fail with 401 during rotation | Application caches keys and doesn't refresh | Implement key caching with TTL; rotate inactive key first (two-key strategy) |
| Network rule blocks legitimate traffic | 403 from allowed IP address | IP is behind NAT/proxy with different egress IP | Add the actual egress IP to the allowlist; use `curl ifconfig.me` to find it |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "Which Azure RBAC role allows an identity to call Azure AI service APIs without requiring an API key?",
    options: [
      "Reader",
      "Contributor",
      "Cognitive Services User",
      "Key Vault Secrets User"
    ],
    correctAnswer: 2,
    explanation: "The 'Cognitive Services User' role (a97b65f3-24c7-4388-baec-2e87135dc908) grants permission to call Azure AI service APIs using Azure AD token-based authentication, eliminating the need for API keys."
  },
  {
    question: "During zero-downtime key rotation, which key should you regenerate FIRST?",
    options: [
      "The key currently being used by applications (active key)",
      "The key NOT currently in use by applications (inactive key)",
      "Both keys simultaneously",
      "It doesn't matter â€” either key can be regenerated first"
    ],
    correctAnswer: 1,
    explanation: "Always regenerate the inactive key first. This ensures applications continue working with the active key while the inactive key is safely regenerated. After updating applications to use the new key, you can then regenerate the old active key."
  },
  {
    question: "What DNS zone name is required for private endpoint resolution of Azure Cognitive Services?",
    options: [
      "privatelink.azure.com",
      "privatelink.cognitiveservices.azure.com",
      "private.cognitiveservices.microsoft.com",
      "internal.ai.azure.com"
    ],
    correctAnswer: 1,
    explanation: "Azure Cognitive Services private endpoints require the DNS zone 'privatelink.cognitiveservices.azure.com' for proper name resolution. This zone must be linked to the VNet where the private endpoint resides."
  },
  {
    question: "What is the recommended authentication method for production Azure AI workloads running in Azure?",
    options: [
      "Embedding API keys in application configuration files",
      "Using environment variables for API keys on each server",
      "Managed identity with Azure RBAC roles",
      "Shared access signatures (SAS tokens)"
    ],
    correctAnswer: 2,
    explanation: "Managed identity with RBAC is the recommended approach for production workloads in Azure. It eliminates the need to manage, rotate, or risk exposure of API keys. The identity is automatically managed by Azure and tokens are obtained transparently."
  },
  {
    question: "When you set 'publicNetworkAccess' to 'Disabled' on an Azure AI resource, what happens to existing API key-based requests from the internet?",
    options: [
      "They continue to work because the key is still valid",
      "They are blocked â€” only private endpoint traffic is allowed",
      "They are throttled to 1 request per minute",
      "They are redirected to the private endpoint automatically"
    ],
    correctAnswer: 1,
    explanation: "Disabling public network access blocks ALL traffic from the public internet, regardless of whether valid API keys are presented. Only traffic through configured private endpoints or approved IP ranges (if any rules exist) is allowed."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-challenge09 --yes --no-wait
```

## Learn More

- [Authenticate with Azure AI services](https://learn.microsoft.com/en-us/azure/ai-services/authentication)
- [Configure virtual networks for Azure AI services](https://learn.microsoft.com/en-us/azure/ai-services/cognitive-services-virtual-networks)
- [Use managed identities with Azure AI services](https://learn.microsoft.com/en-us/azure/ai-services/managed-identity)
- [Azure Key Vault best practices](https://learn.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [Private endpoint for Azure AI services](https://learn.microsoft.com/en-us/azure/ai-services/cognitive-services-virtual-networks?tabs=portal#use-private-endpoints)
