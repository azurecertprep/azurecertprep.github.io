---
sidebar_position: 4
title: "Challenge 03: Deploy AI Models"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 03: Deploy AI Models

:::info Estimated Time
**60 min** | **Cost**: ~$1.00 | **Domain**: Plan & Manage AI Solutions (15-20%)
:::

## Exam skills covered
- Deploy AI models using appropriate deployment options
- Plan capacity for model deployments (tokens per minute, requests per minute)
- Manage model versions and lifecycle
- Choose between Standard, Global Standard, and Provisioned Throughput deployments

## Overview

Azure OpenAI Service requires explicit model deployment before you can make inference calls. Unlike traditional Azure AI services (where you create a resource and immediately get an endpoint), Azure OpenAI separates the resource creation from model deployment—giving you control over which models are available, their capacity, and their version lifecycle.

This challenge covers the three deployment types that appear on the AI-103 exam: **Standard** (pay-per-token, regional), **Global Standard** (pay-per-token, global routing), and **Provisioned Throughput** (reserved capacity, predictable latency). You'll deploy models programmatically, configure capacity in Tokens Per Minute (TPM), manage model versions, and understand the upgrade policies that control automatic version transitions.

Capacity planning is a key exam topic—you need to understand how TPM translates to real-world throughput, how to monitor utilization, and when to choose provisioned throughput over standard deployments.

## Architecture

You'll create an Azure OpenAI resource, deploy multiple models with different deployment types and capacities, then validate their availability and compare their behaviors.

![Challenge 03 topology](/img/ai-103/challenge-03-topology.svg)

## Prerequisites
- Azure subscription with Azure OpenAI access approved
- Azure CLI 2.50+ with `cognitiveservices` extension
- Python 3.9+ with `pip` or .NET 8 SDK
- `azure-identity`, `azure-mgmt-cognitiveservices`, `openai` Python packages

## Implementation

### Task 1: Create an Azure OpenAI Resource and Deploy a Model

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient
from azure.mgmt.cognitiveservices.models import (
    Account, Sku, AccountProperties, Deployment, DeploymentProperties,
    DeploymentModel
)

credential = DefaultAzureCredential()
subscription_id = "YOUR_SUBSCRIPTION_ID"
client = CognitiveServicesManagementClient(credential, subscription_id)

# Create Azure OpenAI resource
account = client.accounts.begin_create(
    resource_group_name="rg-ai102-challenge03",
    account_name="ai102-openai-03",
    account=Account(
        sku=Sku(name="S0"),
        kind="OpenAI",
        location="eastus2",
        properties=AccountProperties(
            custom_sub_domain_name="ai102-openai-03"
        )
    )
).result()
print(f"OpenAI resource: {account.properties.endpoint}")

# Deploy GPT-4o with Standard deployment type
deployment = client.deployments.begin_create_or_update(
    resource_group_name="rg-ai102-challenge03",
    account_name="ai102-openai-03",
    deployment_name="gpt-4o-standard",
    deployment=Deployment(
        sku=Sku(name="Standard", capacity=30),  # 30K tokens per minute
        properties=DeploymentProperties(
            model=DeploymentModel(
                format="OpenAI",
                name="gpt-4o",
                version="2024-08-06"
            ),
            version_upgrade_option="OnceCurrentVersionExpired"
        )
    )
).result()
print(f"Deployed: {deployment.name}")
print(f"Model: {deployment.properties.model.name} v{deployment.properties.model.version}")
print(f"Capacity: {deployment.sku.capacity}K TPM")
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
var resourceGroup = await subscription.GetResourceGroupAsync("rg-ai102-challenge03");
var accounts = resourceGroup.Value.GetCognitiveServicesAccounts();

// Create Azure OpenAI resource
var accountData = new CognitiveServicesAccountData(Azure.Core.AzureLocation.EastUS2)
{
    Kind = "OpenAI",
    Sku = new CognitiveServicesSku("S0"),
    Properties = new CognitiveServicesAccountProperties
    {
        CustomSubDomainName = "ai102-openai-03"
    }
};

var account = await accounts.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "ai102-openai-03", accountData);

// Deploy GPT-4o
var deployments = account.Value.GetCognitiveServicesAccountDeployments();
var deploymentData = new CognitiveServicesAccountDeploymentData
{
    Properties = new CognitiveServicesAccountDeploymentProperties
    {
        Model = new CognitiveServicesAccountDeploymentModel
        {
            Format = "OpenAI",
            Name = "gpt-4o",
            Version = "2024-08-06"
        },
        VersionUpgradeOption = DeploymentModelVersionUpgradeOption.OnceCurrentVersionExpired
    },
    Sku = new CognitiveServicesSku("Standard") { Capacity = 30 }
};

var deployment = await deployments.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "gpt-4o-standard", deploymentData);

Console.WriteLine($"Deployed: {deployment.Value.Data.Name}");
Console.WriteLine($"Model: {deployment.Value.Data.Properties.Model.Name}");
Console.WriteLine($"Capacity: {deployment.Value.Data.Sku.Capacity}K TPM");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create resource group
az group create --name rg-ai102-challenge03 --location eastus2

# Create Azure OpenAI resource
az cognitiveservices account create \
  --name ai102-openai-03 \
  --resource-group rg-ai102-challenge03 \
  --kind OpenAI \
  --sku S0 \
  --location eastus2 \
  --custom-domain ai102-openai-03 \
  --yes

# Deploy GPT-4o with Standard deployment
az cognitiveservices account deployment create \
  --name ai102-openai-03 \
  --resource-group rg-ai102-challenge03 \
  --deployment-name gpt-4o-standard \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-name "Standard" \
  --sku-capacity 30

# Verify deployment
az cognitiveservices account deployment show \
  --name ai102-openai-03 \
  --resource-group rg-ai102-challenge03 \
  --deployment-name gpt-4o-standard \
  -o json
```

</TabItem>
</Tabs>

### Task 2: Deploy Multiple Models with Different Configurations

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Deploy GPT-4o-mini for cost-effective workloads
mini_deployment = client.deployments.begin_create_or_update(
    resource_group_name="rg-ai102-challenge03",
    account_name="ai102-openai-03",
    deployment_name="gpt-4o-mini-standard",
    deployment=Deployment(
        sku=Sku(name="GlobalStandard", capacity=50),  # 50K TPM with global routing
        properties=DeploymentProperties(
            model=DeploymentModel(
                format="OpenAI",
                name="gpt-4o-mini",
                version="2024-07-18"
            ),
            version_upgrade_option="OnceNewDefaultVersionAvailable"
        )
    )
).result()
print(f"Deployed: {mini_deployment.name} (Global Standard)")

# List all deployments to compare
deployments = client.deployments.list(
    resource_group_name="rg-ai102-challenge03",
    account_name="ai102-openai-03"
)

print("\n--- All Deployments ---")
for d in deployments:
    print(f"  {d.name}:")
    print(f"    Model: {d.properties.model.name} v{d.properties.model.version}")
    print(f"    Type: {d.sku.name}")
    print(f"    Capacity: {d.sku.capacity}K TPM")
    print(f"    Upgrade: {d.properties.version_upgrade_option}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// Deploy GPT-4o-mini with Global Standard
var miniDeploymentData = new CognitiveServicesAccountDeploymentData
{
    Properties = new CognitiveServicesAccountDeploymentProperties
    {
        Model = new CognitiveServicesAccountDeploymentModel
        {
            Format = "OpenAI",
            Name = "gpt-4o-mini",
            Version = "2024-07-18"
        },
        VersionUpgradeOption = DeploymentModelVersionUpgradeOption.OnceNewDefaultVersionAvailable
    },
    Sku = new CognitiveServicesSku("GlobalStandard") { Capacity = 50 }
};

var miniDeployment = await deployments.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "gpt-4o-mini-standard", miniDeploymentData);
Console.WriteLine($"Deployed: {miniDeployment.Value.Data.Name} (Global Standard)");

// List all deployments
Console.WriteLine("\n--- All Deployments ---");
await foreach (var d in deployments.GetAllAsync())
{
    Console.WriteLine($"  {d.Data.Name}:");
    Console.WriteLine($"    Model: {d.Data.Properties.Model.Name} v{d.Data.Properties.Model.Version}");
    Console.WriteLine($"    Type: {d.Data.Sku.Name}");
    Console.WriteLine($"    Capacity: {d.Data.Sku.Capacity}K TPM");
    Console.WriteLine($"    Upgrade: {d.Data.Properties.VersionUpgradeOption}");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Deploy GPT-4o-mini with Global Standard
az cognitiveservices account deployment create \
  --name ai102-openai-03 \
  --resource-group rg-ai102-challenge03 \
  --deployment-name gpt-4o-mini-standard \
  --model-name gpt-4o-mini \
  --model-version "2024-07-18" \
  --model-format OpenAI \
  --sku-name "GlobalStandard" \
  --sku-capacity 50

# List all deployments
az cognitiveservices account deployment list \
  --name ai102-openai-03 \
  --resource-group rg-ai102-challenge03 \
  -o table

# Check available models in the region
az cognitiveservices account list-models \
  --name ai102-openai-03 \
  --resource-group rg-ai102-challenge03 \
  -o table
```

</TabItem>
</Tabs>

### Task 3: Test Deployment and Monitor Capacity

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI

# Test the deployed model
os.environ["AZURE_OPENAI_ENDPOINT"] = "https://ai102-openai-03.openai.azure.com/"
os.environ["AZURE_OPENAI_KEY"] = "YOUR_KEY"

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

# Call the Standard deployment
response = client.chat.completions.create(
    model="gpt-4o-standard",  # deployment name, not model name
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What deployment types does Azure OpenAI support?"}
    ],
    max_tokens=200
)

print(f"Model: {response.model}")
print(f"Tokens used: {response.usage.total_tokens}")
print(f"Response: {response.choices[0].message.content[:200]}...")

# Check remaining capacity via headers (rate limit info)
print(f"\nDeployment: gpt-4o-standard")
print(f"Configured: 30K TPM")
print(f"Tokens this call: {response.usage.total_tokens}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;

var endpoint = new Uri("https://ai102-openai-03.openai.azure.com/");
var key = new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!);
var openAiClient = new AzureOpenAIClient(endpoint, key);

var chatClient = openAiClient.GetChatClient("gpt-4o-standard");

var response = await chatClient.CompleteChatAsync(
    new[]
    {
        new SystemChatMessage("You are a helpful assistant."),
        new UserChatMessage("What deployment types does Azure OpenAI support?")
    },
    new ChatCompletionOptions { MaxOutputTokenCount = 200 }
);

Console.WriteLine($"Model: {response.Value.Model}");
Console.WriteLine($"Tokens: {response.Value.Usage.TotalTokenCount}");
Console.WriteLine($"Response: {response.Value.Content[0].Text[..200]}...");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="https://ai102-openai-03.openai.azure.com"
KEY=$(az cognitiveservices account keys list \
  --name ai102-openai-03 \
  --resource-group rg-ai102-challenge03 \
  --query "key1" -o tsv)

# Test Standard deployment
curl -s "${ENDPOINT}/openai/deployments/gpt-4o-standard/chat/completions?api-version=2024-10-21" \
  -H "api-key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What deployment types does Azure OpenAI support?"}
    ],
    "max_tokens": 200
  }' | python -m json.tool

# Check rate limit headers with verbose curl
curl -v "${ENDPOINT}/openai/deployments/gpt-4o-standard/chat/completions?api-version=2024-10-21" \
  -H "api-key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi"}],"max_tokens":5}' \
  2>&1 | grep -i "x-ratelimit"
```

</TabItem>
</Tabs>

## Expected Output

```text
OpenAI resource: https://ai102-openai-03.openai.azure.com/
Deployed: gpt-4o-standard
Model: gpt-4o v2024-08-06
Capacity: 30K TPM

Deployed: gpt-4o-mini-standard (Global Standard)

--- All Deployments ---
  gpt-4o-standard:
    Model: gpt-4o v2024-08-06
    Type: Standard
    Capacity: 30K TPM
    Upgrade: OnceCurrentVersionExpired
  gpt-4o-mini-standard:
    Model: gpt-4o-mini v2024-07-18
    Type: GlobalStandard
    Capacity: 50K TPM
    Upgrade: OnceNewDefaultVersionAvailable

Model: gpt-4o-2024-08-06
Tokens used: 156
Response: Azure OpenAI supports three deployment types...
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Model not available | `ModelNotFound` error | Model not available in selected region | Check `az cognitiveservices account list-models` for regional availability |
| Capacity exceeded | `InsufficientQuota` | Subscription TPM quota fully allocated | Reduce capacity on other deployments or request quota increase |
| Version invalid | `InvalidModelVersion` | Specified version retired or not yet available | List available versions with the models API |
| 429 Too Many Requests | Rate limiting during inference | Exceeding configured TPM/RPM | Increase deployment capacity or implement retry with exponential backoff |
| Wrong deployment name | `DeploymentNotFound` in SDK calls | Using model name instead of deployment name | The `model` parameter in SDK must be the deployment name you chose, not "gpt-4o" |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What is the key difference between Standard and Global Standard deployments in Azure OpenAI?",
    options: [
      "Standard uses GPT-4o while Global Standard only supports GPT-4o-mini",
      "Global Standard routes traffic across multiple regions for higher availability",
      "Standard deployments are free while Global Standard is pay-per-token",
      "Global Standard requires provisioned throughput units (PTUs)"
    ],
    correctAnswer: 1,
    explanation: "Global Standard deployments route traffic dynamically across Azure's global infrastructure, providing higher availability and throughput. Both are pay-per-token, but Global Standard can leverage capacity across regions."
  },
  {
    question: "You set a deployment capacity to 30K TPM. What happens when your application sends requests that would exceed this limit?",
    options: [
      "Requests are queued and processed when capacity is available",
      "The deployment automatically scales up to handle the load",
      "Excess requests receive HTTP 429 responses and must be retried",
      "Requests are routed to another deployment in the same resource"
    ],
    correctAnswer: 2,
    explanation: "When TPM is exceeded, Azure OpenAI returns HTTP 429 (Too Many Requests) with a Retry-After header. Applications must implement retry logic with exponential backoff. Standard deployments do not auto-scale."
  },
  {
    question: "Which version upgrade option should you choose if you want to control exactly when your model version changes?",
    options: [
      "NoAutoUpgrade",
      "OnceNewDefaultVersionAvailable",
      "OnceCurrentVersionExpired",
      "ManualUpgradeOnly"
    ],
    correctAnswer: 0,
    explanation: "NoAutoUpgrade means the deployment will never automatically upgrade to a newer model version—you must manually update it, giving you complete control over timing. OnceCurrentVersionExpired still auto-upgrades when the version is retired. OnceNewDefaultVersionAvailable upgrades when a new default is designated. ManualUpgradeOnly is not a valid option."
  },
  {
    question: "When making an API call to Azure OpenAI, what value should you pass as the 'model' parameter in the SDK?",
    options: [
      "The base model name (e.g., 'gpt-4o')",
      "The deployment name you specified when creating the deployment",
      "The model version string (e.g., '2024-08-06')",
      "The resource name combined with model name"
    ],
    correctAnswer: 1,
    explanation: "In Azure OpenAI, the 'model' parameter in SDK calls refers to your deployment name, not the underlying model name. This is different from the OpenAI API where you specify the model directly."
  },
  {
    question: "When should you choose Provisioned Throughput (PTU) over Standard deployment?",
    options: [
      "When you need the lowest possible cost per token",
      "When you need predictable latency and guaranteed capacity for production workloads",
      "When you want to use the latest model versions immediately",
      "When you only need occasional, burst-oriented API calls"
    ],
    correctAnswer: 1,
    explanation: "Provisioned Throughput provides reserved capacity with predictable latency, making it ideal for production workloads with consistent traffic patterns. Standard is more cost-effective for variable/low usage, while PTU guarantees throughput regardless of regional demand."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-challenge03 --yes --no-wait
```

## Learn More
- [Azure OpenAI deployment types](https://learn.microsoft.com/azure/ai-services/openai/how-to/deployment-types)
- [Quota and limits](https://learn.microsoft.com/azure/ai-services/openai/quotas-limits)
- [Model versions and lifecycle](https://learn.microsoft.com/azure/ai-services/openai/concepts/model-retirements)
- [Provisioned throughput](https://learn.microsoft.com/azure/ai-services/openai/concepts/provisioned-throughput)
