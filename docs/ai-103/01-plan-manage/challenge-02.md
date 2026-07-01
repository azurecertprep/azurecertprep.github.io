---
sidebar_position: 3
title: "Challenge 02: Create and Configure Azure AI Resources"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 02: Create and Configure Azure AI Resources

:::info Estimated Time
**45 min** | **Cost**: ~$0.50 | **Domain**: Plan & Manage AI Solutions (15-20%)
:::

## Exam skills covered
- Create an Azure AI resource
- Choose appropriate AI models
- Determine the default endpoint for a service
- Configure network access for Azure AI resources
- Manage keys and secure access to resources

## Overview

Creating and configuring Azure AI resources correctly is foundational to every AI-103 scenario. This challenge goes beyond clicking "Create" in the portal—you'll provision resources programmatically, configure network restrictions, retrieve and rotate keys, and validate endpoint connectivity.

Understanding the relationship between resource kinds, SKUs, endpoints, and keys is critical. A multi-service resource exposes a single endpoint like `https://<region>.api.cognitive.microsoft.com/` while single-service resources may have service-specific endpoint patterns. You need to know which endpoint format each service uses and how to configure virtual network rules and private endpoints for production workloads.

This challenge also covers the configuration of diagnostic settings, custom subdomain names (required for Microsoft Entra authentication), and the difference between regional and custom endpoints.

## Architecture

You'll create resources with custom subdomains, configure network rules, validate connectivity, and set up diagnostic logging—simulating a production-ready AI services deployment.

![Challenge 02 topology](/img/ai-103/challenge-02-topology.svg)

## Prerequisites
- Azure subscription with Contributor role
- Azure CLI 2.50+ installed
- Python 3.9+ with `pip` or .NET 8 SDK
- `azure-identity`, `azure-mgmt-cognitiveservices` Python packages

## Implementation

### Task 1: Create a Resource with Custom Subdomain

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient
from azure.mgmt.cognitiveservices.models import (
    Account, Sku, AccountProperties, NetworkRuleSet, NetworkRuleAction
)

credential = DefaultAzureCredential()
subscription_id = "YOUR_SUBSCRIPTION_ID"
client = CognitiveServicesManagementClient(credential, subscription_id)

# Create with custom subdomain (required for Entra ID auth)
account = client.accounts.begin_create(
    resource_group_name="rg-ai102-challenge02",
    account_name="ai102-mycompany-ai",
    account=Account(
        sku=Sku(name="S0"),
        kind="AIServices",
        location="eastus",
        properties=AccountProperties(
            custom_sub_domain_name="ai102-mycompany-ai",
            public_network_access="Enabled"
        )
    )
).result()

print(f"Resource: {account.name}")
print(f"Endpoint: {account.properties.endpoint}")
print(f"Custom domain: https://{account.properties.custom_sub_domain_name}.cognitiveservices.azure.com/")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.CognitiveServices;
using Azure.ResourceManager.CognitiveServices.Models;

var credential = new DefaultAzureCredential();
var client = new ArmClient(credential);

var subscription = await client.GetDefaultSubscriptionAsync();
var resourceGroup = await subscription
    .GetResourceGroupAsync("rg-ai102-challenge02");

var collection = resourceGroup.Value.GetCognitiveServicesAccounts();

// Custom subdomain enables Entra ID authentication
var data = new CognitiveServicesAccountData(Azure.Core.AzureLocation.EastUS)
{
    Kind = "CognitiveServices",
    Sku = new CognitiveServicesSku("S0"),
    Properties = new CognitiveServicesAccountProperties
    {
        CustomSubDomainName = "ai102-mycompany-ai",
        PublicNetworkAccess = ServiceAccountPublicNetworkAccess.Enabled
    }
};

var result = await collection.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "ai102-mycompany-ai", data);

Console.WriteLine($"Resource: {result.Value.Data.Name}");
Console.WriteLine($"Endpoint: {result.Value.Data.Properties.Endpoint}");
Console.WriteLine($"Custom: https://{result.Value.Data.Properties.CustomSubDomainName}.cognitiveservices.azure.com/");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create resource group
az group create --name rg-ai102-challenge02 --location eastus

# Create multi-service resource with custom subdomain
az cognitiveservices account create \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --kind AIServices \
  --sku S0 \
  --location eastus \
  --custom-domain ai102-mycompany-ai \
  --yes

# Verify the endpoint
az cognitiveservices account show \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --query "{endpoint: properties.endpoint, customDomain: properties.customSubDomainName}" \
  -o json
```

</TabItem>
</Tabs>

### Task 2: Retrieve and Manage Keys

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Retrieve access keys
keys = client.accounts.list_keys(
    resource_group_name="rg-ai102-challenge02",
    account_name="ai102-mycompany-ai"
)
print(f"Key 1: {keys.key1[:8]}...")
print(f"Key 2: {keys.key2[:8]}...")

# Regenerate key 1 (rotate without downtime using key 2)
from azure.mgmt.cognitiveservices.models import RegenerateKeyParameters, KeyName

new_keys = client.accounts.regenerate_key(
    resource_group_name="rg-ai102-challenge02",
    account_name="ai102-mycompany-ai",
    parameters=RegenerateKeyParameters(key_name=KeyName.KEY1)
)
print(f"New Key 1: {new_keys.key1[:8]}...")
print("Key 2 unchanged—zero-downtime rotation complete")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
var account = await collection.GetAsync("ai102-mycompany-ai");
var resource = account.Value;

// Get current keys
var keys = await resource.GetKeysAsync();
Console.WriteLine($"Key 1: {keys.Value.Key1[..8]}...");
Console.WriteLine($"Key 2: {keys.Value.Key2[..8]}...");

// Regenerate key 1
var regenerated = await resource.RegenerateKeyAsync(
    new RegenerateKeyContent(CognitiveServicesKeyName.Key1));
Console.WriteLine($"New Key 1: {regenerated.Value.Key1[..8]}...");
Console.WriteLine("Key 2 unchanged—zero-downtime rotation complete");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# List keys
az cognitiveservices account keys list \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  -o json

# Regenerate key1 (use key2 during rotation)
az cognitiveservices account keys regenerate \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --key-name key1

# Verify connectivity with the new key
ENDPOINT=$(az cognitiveservices account show \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --query "properties.endpoint" -o tsv)

KEY=$(az cognitiveservices account keys list \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --query "key1" -o tsv)

curl -s "${ENDPOINT}language/:analyze-text?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"kind":"LanguageDetection","parameters":{"modelVersion":"latest"},"analysisInput":{"documents":[{"id":"1","text":"Hello world"}]}}'
```

</TabItem>
</Tabs>

### Task 3: Configure Network Access

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.mgmt.cognitiveservices.models import (
    NetworkRuleSet, NetworkRuleAction, IpRule, VirtualNetworkRule
)

# Update resource with network restrictions
account = client.accounts.begin_create(
    resource_group_name="rg-ai102-challenge02",
    account_name="ai102-mycompany-ai",
    account=Account(
        sku=Sku(name="S0"),
        kind="AIServices",
        location="eastus",
        properties=AccountProperties(
            custom_sub_domain_name="ai102-mycompany-ai",
            public_network_access="Enabled",
            network_acls=NetworkRuleSet(
                default_action=NetworkRuleAction.DENY,
                ip_rules=[
                    IpRule(value="203.0.113.0/24"),  # Corporate IP range
                    IpRule(value="198.51.100.42")     # Developer IP
                ]
            )
        )
    )
).result()

print(f"Network rules applied: default action = Deny")
print(f"Allowed IPs: 203.0.113.0/24, 198.51.100.42")
print(f"Public access: {account.properties.public_network_access}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// Update with network restrictions
var updateData = new CognitiveServicesAccountData(Azure.Core.AzureLocation.EastUS)
{
    Kind = "CognitiveServices",
    Sku = new CognitiveServicesSku("S0"),
    Properties = new CognitiveServicesAccountProperties
    {
        CustomSubDomainName = "ai102-mycompany-ai",
        PublicNetworkAccess = ServiceAccountPublicNetworkAccess.Enabled,
        NetworkAcls = new CognitiveServicesNetworkRuleSet
        {
            DefaultAction = CognitiveServicesNetworkRuleAction.Deny
        }
    }
};

// Add IP rules
updateData.Properties.NetworkAcls.IPRules.Add(
    new CognitiveServicesIPRule("203.0.113.0/24"));
updateData.Properties.NetworkAcls.IPRules.Add(
    new CognitiveServicesIPRule("198.51.100.42"));

var updated = await collection.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "ai102-mycompany-ai", updateData);

Console.WriteLine("Network rules applied: default action = Deny");
Console.WriteLine($"IP rules count: {updated.Value.Data.Properties.NetworkAcls.IPRules.Count}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Configure network rules - deny all except specific IPs
az cognitiveservices account network-rule add \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --ip-address 203.0.113.0/24

az cognitiveservices account network-rule add \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --ip-address 198.51.100.42

# Set default action to deny
az cognitiveservices account update \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --default-action Deny

# Verify network rules
az cognitiveservices account network-rule list \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  -o table

# To completely disable public access (private endpoint only)
az cognitiveservices account update \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --public-network-access Disabled
```

</TabItem>
</Tabs>

## Expected Output

```text
Resource: ai102-mycompany-ai
Endpoint: https://ai102-mycompany-ai.cognitiveservices.azure.com/
Custom domain: https://ai102-mycompany-ai.cognitiveservices.azure.com/

Key 1: a3f8b2c1...
Key 2: 7d9e4f6a...
New Key 1: x1y2z3w4...
Key 2 unchanged—zero-downtime rotation complete

Network rules applied: default action = Deny
Allowed IPs: 203.0.113.0/24, 198.51.100.42
Public access: Enabled
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Custom domain conflict | `SubdomainAlreadyInUse` error | Another resource uses same subdomain globally | Choose a unique subdomain name |
| Network blocked | `403 Forbidden` after applying rules | Client IP not in allow list | Add client IP to network rules or use private endpoint |
| Key rotation breaks app | `401 Unauthorized` after regeneration | App still using old key | Update to new key, or use Key 2 during rotation of Key 1 |
| Entra auth fails | `401` with bearer token | Resource missing custom subdomain | Custom subdomain is required for Microsoft Entra auth; recreate with `--custom-domain` |
| Endpoint format wrong | `404 Not Found` | Using regional endpoint format with custom subdomain resource | Use `https://<subdomain>.cognitiveservices.azure.com/` format |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "Why is a custom subdomain name required when using Microsoft Entra ID (Azure AD) authentication with Azure AI services?",
    options: [
      "Custom subdomains provide faster response times through CDN caching",
      "Custom subdomains are required for CORS configuration",
      "Microsoft Entra tokens can only be validated against custom domain endpoints",
      "Regional endpoints do not support HTTPS for token-based auth"
    ],
    correctAnswer: 2,
    explanation: "Microsoft Entra ID authentication requires a custom subdomain because token validation is tied to the unique endpoint URL. Regional shared endpoints (like eastus.api.cognitive.microsoft.com) only support key-based authentication."
  },
  {
    question: "You need to rotate API keys for a production Azure AI resource without any downtime. What is the correct procedure?",
    options: [
      "Regenerate both keys simultaneously, then update all applications",
      "Use managed identity instead—key rotation always causes downtime",
      "Create a new resource, migrate traffic, then delete the old resource",
      "Update all apps to use Key 2, regenerate Key 1, update apps to Key 1, regenerate Key 2"
    ],
    correctAnswer: 3,
    explanation: "The zero-downtime key rotation pattern is: switch apps to Key 2, regenerate Key 1, switch apps back to Key 1, then regenerate Key 2. This ensures at least one valid key is always in use."
  },
  {
    question: "What is the default endpoint format for a multi-service Azure AI resource created WITHOUT a custom subdomain?",
    options: [
      "https://<resource-name>.cognitiveservices.azure.com/",
      "https://<region>.api.cognitive.microsoft.com/",
      "https://<resource-name>.openai.azure.com/",
      "https://api.cognitive.microsoft.com/<resource-name>/"
    ],
    correctAnswer: 1,
    explanation: "Without a custom subdomain, multi-service resources use the regional shared endpoint format: https://<region>.api.cognitive.microsoft.com/. The resource-specific endpoint format requires a custom subdomain to be configured."
  },
  {
    question: "You configure network rules on your Azure AI resource with default action set to 'Deny'. Which traffic is still allowed?",
    options: [
      "Only traffic from configured IP rules, VNet rules, and private endpoints",
      "All traffic from within the same Azure region",
      "All Azure service traffic plus configured rules",
      "Only traffic from the Azure portal and configured rules"
    ],
    correctAnswer: 0,
    explanation: "When the default action is Deny, only traffic matching explicitly configured IP rules, virtual network rules, or private endpoints is allowed. Azure portal access also requires the user's IP to be in the allow list."
  },
  {
    question: "Which SKU should you choose for a development/testing Azure AI multi-service resource to minimize costs while accessing all service APIs?",
    options: [
      "F0 (Free tier) for zero-cost development",
      "S1 for higher rate limits during testing",
      "S0 (Standard tier) for multi-service resources",
      "P1 (Premium) for all API access"
    ],
    correctAnswer: 2,
    explanation: "Multi-service resources (kind: AIServices) use the S0 SKU. There is no F0 free tier for multi-service resources—free tiers are only available for individual single-service resources. S0 is the standard and only available SKU for multi-service."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-challenge02 --yes --no-wait
```

## Learn More
- [Create a multi-service resource](https://learn.microsoft.com/azure/ai-services/multi-service-resource)
- [Configure virtual networks](https://learn.microsoft.com/azure/ai-services/cognitive-services-virtual-networks)
- [Custom subdomain names](https://learn.microsoft.com/azure/ai-services/authentication#custom-subdomain-names)
- [Diagnostic logging](https://learn.microsoft.com/azure/ai-services/diagnostic-logging)
