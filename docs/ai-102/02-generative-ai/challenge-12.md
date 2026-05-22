---
sidebar_position: 3
title: "Challenge 12: Deploy Generative AI Models"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 12: Deploy Generative AI Models

:::info Estimated Time
**45-60 min** | **Cost**: ~$1.00 (estimated) | **Domain**: Generative AI Solutions (15-20%)
:::

## Exam skills covered

- Deploy appropriate generative AI models for specific use cases
- Configure model deployment parameters including quotas and rate limits
- Compare deployment types (Standard, Global Standard, Provisioned)

## Overview

Azure OpenAI Service provides access to a variety of generative AI models through a managed deployment model. Choosing the right model and deployment type is a critical skill for the AI-102 exam. The **model catalog** includes GPT-4o (multimodal, high capability), GPT-4o-mini (cost-efficient for simpler tasks), and open-source models like Phi-4, Mistral, and Llama available through Models as a Service (MaaS).

**Deployment types** determine how your model is hosted and billed. **Standard** deployments use shared compute with pay-per-token billing and are subject to Tokens-Per-Minute (TPM) and Requests-Per-Minute (RPM) quotas. **Global Standard** deployments route traffic globally for higher availability and throughput. **Provisioned (PTU)** deployments reserve dedicated compute capacity, providing guaranteed throughput for production workloads with predictable costs.

Understanding quotas is essential—each subscription has TPM limits per model per region. When you deploy a model, you allocate a portion of your available quota. Rate limiting (HTTP 429) occurs when requests exceed the allocated TPM/RPM. Monitoring quota usage and planning capacity across deployments is a key operational skill.

## Architecture

The deployment architecture connects your application to Azure OpenAI endpoints through model deployments configured with specific SKUs and quota allocations.

![Challenge 12 topology](/img/ai-102/challenge-12-topology.svg)

## Prerequisites

- Azure subscription with Azure OpenAI access approved
- Azure CLI with `cognitiveservices` extension
- An existing Azure OpenAI resource (or permissions to create one)
- Sufficient quota in target region for GPT-4o and GPT-4o-mini

## Implementation

### Task 1: List Available Models and Deploy GPT-4o

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient

credential = DefaultAzureCredential()
subscription_id = "YOUR_SUBSCRIPTION_ID"
resource_group = "rg-ai102-challenge12"
account_name = "aoai-ai102-challenge12"

client = CognitiveServicesManagementClient(credential, subscription_id)

# List available models for the account
models = client.accounts.list_models(
    resource_group_name=resource_group,
    account_name=account_name
)
print("Available models:")
for model in models:
    print(f"  {model.model.name} ({model.model.version}) - {model.model.format}")

# Create GPT-4o deployment (Standard)
from azure.mgmt.cognitiveservices.models import Deployment, DeploymentModel, Sku

deployment = Deployment(
    sku=Sku(name="Standard", capacity=30),  # 30K TPM
    properties={
        "model": DeploymentModel(
            format="OpenAI",
            name="gpt-4o",
            version="2024-08-06"
        )
    }
)

poller = client.deployments.begin_create_or_update(
    resource_group_name=resource_group,
    account_name=account_name,
    deployment_name="gpt-4o-standard",
    deployment=deployment
)
result = poller.result()
print(f"\nDeployed: {result.name}")
print(f"  Model: {result.properties.model.name} v{result.properties.model.version}")
print(f"  SKU: {result.sku.name} ({result.sku.capacity}K TPM)")
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

string subscriptionId = "YOUR_SUBSCRIPTION_ID";
string resourceGroup = "rg-ai102-challenge12";
string accountName = "aoai-ai102-challenge12";

var accountId = CognitiveServicesAccountResource.CreateResourceIdentifier(
    subscriptionId, resourceGroup, accountName);
var account = client.GetCognitiveServicesAccountResource(accountId);

// List available models
var models = account.GetModelsAsync();
await foreach (var model in models)
{
    Console.WriteLine($"  {model.Model.Name} ({model.Model.Version})");
}

// Create GPT-4o deployment
var deployments = account.GetCognitiveServicesAccountDeployments();
var deploymentData = new CognitiveServicesAccountDeploymentData
{
    Sku = new CognitiveServicesSku("Standard") { Capacity = 30 },
    Properties = new CognitiveServicesAccountDeploymentProperties
    {
        Model = new CognitiveServicesAccountDeploymentModel
        {
            Format = "OpenAI",
            Name = "gpt-4o",
            Version = "2024-08-06"
        }
    }
};

var operation = await deployments.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "gpt-4o-standard", deploymentData);

Console.WriteLine($"Deployed: {operation.Value.Data.Name}");
Console.WriteLine($"  Capacity: {operation.Value.Data.Sku.Capacity}K TPM");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
SUBSCRIPTION_ID="YOUR_SUBSCRIPTION_ID"
RESOURCE_GROUP="rg-ai102-challenge12"
ACCOUNT_NAME="aoai-ai102-challenge12"
LOCATION="eastus2"

# Create resource group and OpenAI account
az group create --name $RESOURCE_GROUP --location $LOCATION

az cognitiveservices account create \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --kind OpenAI \
  --sku S0

# List available models
az cognitiveservices account list-models \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --output table

# Deploy GPT-4o (Standard, 30K TPM)
az cognitiveservices account deployment create \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --deployment-name "gpt-4o-standard" \
  --model-name "gpt-4o" \
  --model-version "2024-08-06" \
  --model-format "OpenAI" \
  --sku-name "Standard" \
  --sku-capacity 30
```

</TabItem>
</Tabs>

### Task 2: Deploy GPT-4o-mini for Cost Comparison

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient
from azure.mgmt.cognitiveservices.models import Deployment, DeploymentModel, Sku

credential = DefaultAzureCredential()
subscription_id = "YOUR_SUBSCRIPTION_ID"
resource_group = "rg-ai102-challenge12"
account_name = "aoai-ai102-challenge12"

client = CognitiveServicesManagementClient(credential, subscription_id)

# Deploy GPT-4o-mini (Global Standard for higher throughput)
deployment_mini = Deployment(
    sku=Sku(name="GlobalStandard", capacity=50),  # 50K TPM
    properties={
        "model": DeploymentModel(
            format="OpenAI",
            name="gpt-4o-mini",
            version="2024-07-18"
        )
    }
)

poller = client.deployments.begin_create_or_update(
    resource_group_name=resource_group,
    account_name=account_name,
    deployment_name="gpt-4o-mini-global",
    deployment=deployment_mini
)
result = poller.result()
print(f"Deployed: {result.name}")
print(f"  Model: {result.properties.model.name}")
print(f"  SKU: {result.sku.name} ({result.sku.capacity}K TPM)")

# Compare deployments
deployments = client.deployments.list(
    resource_group_name=resource_group,
    account_name=account_name
)
print("\n--- Deployment Comparison ---")
print(f"{'Name':<25} {'Model':<15} {'SKU':<18} {'TPM':<8}")
print("-" * 70)
for d in deployments:
    print(f"{d.name:<25} {d.properties.model.name:<15} {d.sku.name:<18} {d.sku.capacity}K")
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

string subscriptionId = "YOUR_SUBSCRIPTION_ID";
string resourceGroup = "rg-ai102-challenge12";
string accountName = "aoai-ai102-challenge12";

var accountId = CognitiveServicesAccountResource.CreateResourceIdentifier(
    subscriptionId, resourceGroup, accountName);
var account = client.GetCognitiveServicesAccountResource(accountId);
var deployments = account.GetCognitiveServicesAccountDeployments();

// Deploy GPT-4o-mini with Global Standard SKU
var miniDeployment = new CognitiveServicesAccountDeploymentData
{
    Sku = new CognitiveServicesSku("GlobalStandard") { Capacity = 50 },
    Properties = new CognitiveServicesAccountDeploymentProperties
    {
        Model = new CognitiveServicesAccountDeploymentModel
        {
            Format = "OpenAI",
            Name = "gpt-4o-mini",
            Version = "2024-07-18"
        }
    }
};

var operation = await deployments.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "gpt-4o-mini-global", miniDeployment);
Console.WriteLine($"Deployed: {operation.Value.Data.Name}");

// List all deployments for comparison
Console.WriteLine("\n--- Deployment Comparison ---");
await foreach (var d in deployments.GetAllAsync())
{
    Console.WriteLine($"{d.Data.Name,-25} {d.Data.Properties.Model.Name,-15} " +
        $"{d.Data.Sku.Name,-18} {d.Data.Sku.Capacity}K TPM");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Deploy GPT-4o-mini with Global Standard
az cognitiveservices account deployment create \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --deployment-name "gpt-4o-mini-global" \
  --model-name "gpt-4o-mini" \
  --model-version "2024-07-18" \
  --model-format "OpenAI" \
  --sku-name "GlobalStandard" \
  --sku-capacity 50

# List all deployments
az cognitiveservices account deployment list \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --output table
```

</TabItem>
</Tabs>

### Task 3: Check Quota Usage

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient

credential = DefaultAzureCredential()
subscription_id = "YOUR_SUBSCRIPTION_ID"
resource_group = "rg-ai102-challenge12"
account_name = "aoai-ai102-challenge12"
location = "eastus2"

client = CognitiveServicesManagementClient(credential, subscription_id)

# Check model quota/usage for the subscription in this region
usages = client.usages.list(location=location)
print(f"Quota usage for {location}:")
print(f"{'Model':<30} {'Used':<10} {'Limit':<10} {'Unit':<10}")
print("-" * 60)
for usage in usages:
    if usage.current_value > 0 or "OpenAI" in (usage.name.value or ""):
        print(f"{usage.name.localized_value:<30} "
              f"{usage.current_value:<10} "
              f"{usage.limit:<10} "
              f"{usage.unit:<10}")

# Check deployment-level rate limits
deployments = client.deployments.list(
    resource_group_name=resource_group,
    account_name=account_name
)
print("\n--- Rate Limits per Deployment ---")
for d in deployments:
    tpm = d.sku.capacity
    # RPM is typically 6x TPM in thousands for standard
    estimated_rpm = tpm * 6
    print(f"{d.name}: {tpm}K TPM, ~{estimated_rpm} RPM")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.CognitiveServices;

var credential = new DefaultAzureCredential();
var client = new ArmClient(credential);

string subscriptionId = "YOUR_SUBSCRIPTION_ID";
string resourceGroup = "rg-ai102-challenge12";
string accountName = "aoai-ai102-challenge12";

var subscription = await client.GetDefaultSubscriptionAsync();

// Check usages for the account
var accountId = CognitiveServicesAccountResource.CreateResourceIdentifier(
    subscriptionId, resourceGroup, accountName);
var account = client.GetCognitiveServicesAccountResource(accountId);

var usages = account.GetUsagesAsync();
Console.WriteLine("Account Usage:");
await foreach (var usage in usages)
{
    Console.WriteLine($"  {usage.Name?.LocalizedValue}: " +
        $"{usage.CurrentValue}/{usage.Limit} ({usage.Unit})");
}

// List deployments with capacity info
var deployments = account.GetCognitiveServicesAccountDeployments();
Console.WriteLine("\n--- Rate Limits per Deployment ---");
await foreach (var d in deployments.GetAllAsync())
{
    var tpm = d.Data.Sku.Capacity;
    Console.WriteLine($"  {d.Data.Name}: {tpm}K TPM");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Check quota usage for a specific model in your region
az cognitiveservices usage list \
  --location $LOCATION \
  --output table

# Show deployment details including capacity
az cognitiveservices account deployment show \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --deployment-name "gpt-4o-standard" \
  --query "{name:name, model:properties.model.name, sku:sku.name, capacity:sku.capacity}"

# REST API - check quota
TOKEN=$(az account get-access-token --query accessToken -o tsv)

curl -s \
  "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.CognitiveServices/locations/${LOCATION}/usages?api-version=2024-04-01-preview" \
  -H "Authorization: Bearer $TOKEN" | jq '.value[] | select(.currentValue > 0)'
```

</TabItem>
</Tabs>

### Task 4: Test Deployments

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI

endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
api_key = os.environ["AZURE_OPENAI_KEY"]

client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=api_key,
    api_version="2024-10-21"
)

test_prompt = "Explain the difference between GPT-4o and GPT-4o-mini in 2 sentences."

# Test GPT-4o
response_4o = client.chat.completions.create(
    model="gpt-4o-standard",
    messages=[{"role": "user", "content": test_prompt}],
    max_tokens=150
)
print(f"GPT-4o response:")
print(f"  {response_4o.choices[0].message.content}")
print(f"  Tokens: {response_4o.usage.total_tokens}")

# Test GPT-4o-mini
response_mini = client.chat.completions.create(
    model="gpt-4o-mini-global",
    messages=[{"role": "user", "content": test_prompt}],
    max_tokens=150
)
print(f"\nGPT-4o-mini response:")
print(f"  {response_mini.choices[0].message.content}")
print(f"  Tokens: {response_mini.usage.total_tokens}")

# Cost comparison (approximate pricing)
print("\n--- Cost Comparison (approximate) ---")
print(f"GPT-4o:      Input ${5.00}/1M tokens, Output ${15.00}/1M tokens")
print(f"GPT-4o-mini: Input ${0.15}/1M tokens, Output ${0.60}/1M tokens")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

var client = new AzureOpenAIClient(
    new Uri(endpoint), new AzureKeyCredential(apiKey));

string testPrompt = "Explain the difference between GPT-4o and GPT-4o-mini in 2 sentences.";

// Test GPT-4o
var chatClient4o = client.GetChatClient("gpt-4o-standard");
var response4o = await chatClient4o.CompleteChatAsync(
    new[] { new Azure.AI.OpenAI.Chat.UserChatMessage(testPrompt) });

Console.WriteLine("GPT-4o response:");
Console.WriteLine($"  {response4o.Value.Content[0].Text}");
Console.WriteLine($"  Tokens: {response4o.Value.Usage.TotalTokenCount}");

// Test GPT-4o-mini
var chatClientMini = client.GetChatClient("gpt-4o-mini-global");
var responseMini = await chatClientMini.CompleteChatAsync(
    new[] { new Azure.AI.OpenAI.Chat.UserChatMessage(testPrompt) });

Console.WriteLine("\nGPT-4o-mini response:");
Console.WriteLine($"  {responseMini.Value.Content[0].Text}");
Console.WriteLine($"  Tokens: {responseMini.Value.Usage.TotalTokenCount}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
AZURE_OPENAI_ENDPOINT="https://aoai-ai102-challenge12.openai.azure.com"
AZURE_OPENAI_KEY="YOUR_KEY"

# Test GPT-4o deployment
curl -s "${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o-standard/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{"role": "user", "content": "Explain GPT-4o vs GPT-4o-mini in 2 sentences."}],
    "max_tokens": 150
  }' | jq '{content: .choices[0].message.content, tokens: .usage.total_tokens}'

# Test GPT-4o-mini deployment
curl -s "${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o-mini-global/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{"role": "user", "content": "Explain GPT-4o vs GPT-4o-mini in 2 sentences."}],
    "max_tokens": 150
  }' | jq '{content: .choices[0].message.content, tokens: .usage.total_tokens}'
```

</TabItem>
</Tabs>

## Expected Output

After completing all tasks, you should have:

1. **Azure OpenAI resource** `aoai-ai102-challenge12` with two deployments:
   - `gpt-4o-standard` — Standard SKU, 30K TPM, model version 2024-08-06
   - `gpt-4o-mini-global` — GlobalStandard SKU, 50K TPM, model version 2024-07-18
2. **Quota consumed**: 30K TPM from GPT-4o quota, 50K TPM from GPT-4o-mini quota
3. **Successful test responses** from both deployments showing different response styles

## Break and Fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Deployment fails | `QuotaExceeded` error | Insufficient TPM quota in region | Reduce capacity or request quota increase via Azure Portal |
| Model not found | `ModelNotFound` or empty model list | Model not available in selected region | Check regional availability; try `eastus2` or `swedencentral` |
| 429 Too Many Requests | Rate limit errors during testing | Requests exceed allocated TPM/RPM | Implement exponential backoff; increase deployment capacity |
| Wrong model version | `InvalidModelVersion` | Specified version retired or not yet available | Use `az cognitiveservices account list-models` to find valid versions |
| Global Standard unavailable | SKU not supported | Not all models support Global Standard | Use Standard SKU or check model-SKU compatibility docs |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ch12-q1",
    question: "What is the primary difference between Standard and Provisioned deployment types?",
    options: [
      "Standard uses shared compute with pay-per-token billing; Provisioned reserves dedicated capacity with guaranteed throughput",
      "Standard supports more models than Provisioned",
      "Provisioned is only available for GPT-4o; Standard works with all models",
      "Standard has higher throughput limits than Provisioned"
    ],
    correctAnswer: 0,
    explanation: "Standard deployments use shared compute billed per token consumed and are subject to TPM/RPM rate limits. Provisioned deployments reserve dedicated compute capacity (measured in PTUs) providing guaranteed throughput for production workloads."
  },
  {
    id: "ch12-q2",
    question: "When deploying a model, what does the 'capacity' parameter in the SKU represent?",
    options: [
      "The number of concurrent users allowed",
      "The storage allocated for the model",
      "Thousands of Tokens Per Minute (TPM) allocated to the deployment",
      "The number of GPUs reserved"
    ],
    correctAnswer: 2,
    explanation: "The capacity parameter represents the Tokens Per Minute (TPM) allocation in thousands. For example, capacity=30 means 30,000 TPM. This is drawn from your subscription's available quota for that model in that region."
  },
  {
    id: "ch12-q3",
    question: "Which model would be most cost-effective for a high-volume classification task that doesn't require advanced reasoning?",
    options: [
      "GPT-4o with Provisioned deployment",
      "GPT-4o with Standard deployment",
      "GPT-4o-mini with Global Standard deployment",
      "GPT-4o-mini with Provisioned deployment"
    ],
    correctAnswer: 2,
    explanation: "GPT-4o-mini is significantly cheaper per token than GPT-4o and performs well for straightforward tasks like classification. Global Standard provides higher throughput across global regions, making it ideal for high-volume workloads that don't need GPT-4o's advanced capabilities."
  },
  {
    id: "ch12-q4",
    question: "What happens when a deployment's rate limit (TPM/RPM) is exceeded?",
    options: [
      "The request is queued and processed later",
      "The deployment automatically scales up",
      "The API returns HTTP 429 (Too Many Requests) with a Retry-After header",
      "The request is routed to another deployment"
    ],
    correctAnswer: 3,
    explanation: "When rate limits are exceeded, Azure OpenAI returns HTTP 429 (Too Many Requests) with a Retry-After header indicating how long to wait before retrying. Applications should implement exponential backoff to handle rate limiting gracefully."
  },
  {
    id: "ch12-q5",
    question: "What Azure CLI command deploys a GPT-4o model to an Azure OpenAI resource?",
    options: [
      "az openai deployment create --model gpt-4o",
      "az ml model deploy --name gpt-4o",
      "az cognitiveservices account deployment create --model-name gpt-4o --model-format OpenAI",
      "az ai model deploy --type openai --model gpt-4o"
    ],
    correctAnswer: 2,
    explanation: "The correct command is 'az cognitiveservices account deployment create' with --model-name, --model-format OpenAI, --model-version, and SKU parameters. Azure OpenAI is managed under the Cognitive Services resource provider."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-challenge12 --yes --no-wait
```

## Learn More

- [Azure OpenAI model deployment](https://learn.microsoft.com/azure/ai-services/openai/how-to/create-resource)
- [Model catalog and availability](https://learn.microsoft.com/azure/ai-services/openai/concepts/models)
- [Deployment types (Standard, Global, Provisioned)](https://learn.microsoft.com/azure/ai-services/openai/how-to/deployment-types)
- [Quotas and limits](https://learn.microsoft.com/azure/ai-services/openai/quotas-limits)
- [Pricing](https://azure.microsoft.com/pricing/details/cognitive-services/openai-service/)
