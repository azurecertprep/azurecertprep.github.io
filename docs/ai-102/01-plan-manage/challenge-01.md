---
sidebar_position: 2
title: "Challenge 01: Select the Right Azure AI Service"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 01: Select the Right Azure AI Service

:::info Estimated Time
**45 min** | **Cost**: ~$0.50 | **Domain**: Plan & Manage AI Solutions (20-25%)
:::

## Exam skills covered
- Select the appropriate Azure AI service for a generative AI solution
- Select the appropriate Azure AI service for a computer vision solution
- Select the appropriate Azure AI service for a natural language processing solution
- Select the appropriate Azure AI service for a speech solution
- Select the appropriate Azure AI service for a document intelligence solution
- Select the appropriate Azure AI service for a knowledge mining solution

## Overview

Azure AI services provide a broad portfolio of cognitive capabilities through pre-built APIs and customizable models. Choosing the right service is critical—using Azure OpenAI for simple text extraction when Document Intelligence exists, or using Computer Vision for tasks better suited to GPT-4o multimodal, leads to unnecessary cost and complexity.

This challenge walks you through the Azure AI service taxonomy, helps you build a mental decision tree, and verifies your ability to programmatically discover and validate available services in a subscription. You'll compare multi-service resources (which provide a single endpoint for multiple capabilities) against single-service resources (which offer service-specific features and isolation).

Understanding the tradeoffs between service types—pricing tiers, regional availability, feature sets, and SLA differences—is essential for the AI-102 exam and real-world architecture decisions.

## Architecture

You'll create both a multi-service Azure AI resource and individual single-service resources, then programmatically enumerate their capabilities and compare their endpoints.

![Challenge 01 topology](/img/ai-102/challenge-01-topology.svg)

## Prerequisites
- Azure subscription with Azure AI services access
- Azure CLI 2.50+ installed
- Python 3.9+ with `pip` or .NET 8 SDK
- `azure-identity` and `azure-mgmt-cognitiveservices` Python packages (or equivalent NuGet)

## Implementation

### Task 1: Create a Multi-Service Azure AI Resource

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient
from azure.mgmt.cognitiveservices.models import Account, Sku, AccountProperties

credential = DefaultAzureCredential()
subscription_id = "YOUR_SUBSCRIPTION_ID"
client = CognitiveServicesManagementClient(credential, subscription_id)

# Create a multi-service resource
account = client.accounts.begin_create(
    resource_group_name="rg-ai102-challenge01",
    account_name="ai-multiservice-01",
    account=Account(
        sku=Sku(name="S0"),
        kind="CognitiveServices",
        location="eastus",
        properties=AccountProperties()
    )
).result()

print(f"Created: {account.name}")
print(f"Endpoint: {account.properties.endpoint}")
print(f"Kind: {account.kind}")
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
    .GetResourceGroupAsync("rg-ai102-challenge01");

var collection = resourceGroup.Value.GetCognitiveServicesAccounts();

var data = new CognitiveServicesAccountData(Azure.Core.AzureLocation.EastUS)
{
    Kind = "CognitiveServices",
    Sku = new CognitiveServicesSku("S0"),
    Properties = new CognitiveServicesAccountProperties()
};

var result = await collection.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "ai-multiservice-01", data);

Console.WriteLine($"Created: {result.Value.Data.Name}");
Console.WriteLine($"Endpoint: {result.Value.Data.Properties.Endpoint}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create multi-service resource
az cognitiveservices account create \
  --name ai-multiservice-01 \
  --resource-group rg-ai102-challenge01 \
  --kind CognitiveServices \
  --sku S0 \
  --location eastus \
  --yes

# Get endpoint and keys
az cognitiveservices account show \
  --name ai-multiservice-01 \
  --resource-group rg-ai102-challenge01 \
  --query "properties.endpoint" -o tsv

az cognitiveservices account keys list \
  --name ai-multiservice-01 \
  --resource-group rg-ai102-challenge01
```

</TabItem>
</Tabs>

### Task 2: List Available AI Service Kinds

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# List all available cognitive service kinds in the subscription
kinds = client.resource_skus.list()
service_kinds = set()
for sku in kinds:
    service_kinds.add(sku.kind)

print("Available Azure AI service kinds:")
for kind in sorted(service_kinds):
    print(f"  - {kind}")

# Key kinds for AI-102:
# CognitiveServices (multi-service), OpenAI, ComputerVision,
# TextAnalytics, SpeechServices, FormRecognizer, ContentSafety
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.CognitiveServices;

var credential = new DefaultAzureCredential();
var client = new ArmClient(credential);
var subscription = await client.GetDefaultSubscriptionAsync();

// List available SKUs to see service kinds
var skus = subscription.GetCognitiveServicesResourceSkusAsync();
var serviceKinds = new HashSet<string>();

await foreach (var sku in skus)
{
    serviceKinds.Add(sku.Kind);
}

Console.WriteLine("Available Azure AI service kinds:");
foreach (var kind in serviceKinds.OrderBy(k => k))
{
    Console.WriteLine($"  - {kind}");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# List all cognitive services accounts in a resource group
az cognitiveservices account list \
  --resource-group rg-ai102-challenge01 \
  -o table

# List available kinds in a region
az cognitiveservices account list-skus \
  --kind CognitiveServices \
  --location eastus \
  -o table

# Check specific service availability
az cognitiveservices account list-skus \
  --kind OpenAI \
  --location eastus \
  -o table
```

</TabItem>
</Tabs>

### Task 3: Create Single-Service Resources and Compare

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Create individual service resources for comparison
services = [
    {"name": "ai-vision-01", "kind": "ComputerVision", "sku": "S1"},
    {"name": "ai-language-01", "kind": "TextAnalytics", "sku": "S"},
    {"name": "ai-speech-01", "kind": "SpeechServices", "sku": "S0"},
]

for svc in services:
    result = client.accounts.begin_create(
        resource_group_name="rg-ai102-challenge01",
        account_name=svc["name"],
        account=Account(
            sku=Sku(name=svc["sku"]),
            kind=svc["kind"],
            location="eastus",
            properties=AccountProperties()
        )
    ).result()
    print(f"Created {svc['kind']}: {result.properties.endpoint}")

# Compare: multi-service has ONE endpoint for all
# Single-service has dedicated endpoints with service-specific features
multi = client.accounts.get("rg-ai102-challenge01", "ai-multiservice-01")
print(f"\nMulti-service endpoint: {multi.properties.endpoint}")
print("Supports: Vision, Language, Speech, Decision (single key)")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
var servicesToCreate = new[]
{
    new { Name = "ai-vision-01", Kind = "ComputerVision", Sku = "S1" },
    new { Name = "ai-language-01", Kind = "TextAnalytics", Sku = "S" },
    new { Name = "ai-speech-01", Kind = "SpeechServices", Sku = "S0" }
};

foreach (var svc in servicesToCreate)
{
    var svcData = new CognitiveServicesAccountData(Azure.Core.AzureLocation.EastUS)
    {
        Kind = svc.Kind,
        Sku = new CognitiveServicesSku(svc.Sku),
        Properties = new CognitiveServicesAccountProperties()
    };

    var result = await collection.CreateOrUpdateAsync(
        Azure.WaitUntil.Completed, svc.Name, svcData);
    Console.WriteLine($"Created {svc.Kind}: {result.Value.Data.Properties.Endpoint}");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create individual services
az cognitiveservices account create \
  --name ai-vision-01 \
  --resource-group rg-ai102-challenge01 \
  --kind ComputerVision --sku S1 --location eastus --yes

az cognitiveservices account create \
  --name ai-language-01 \
  --resource-group rg-ai102-challenge01 \
  --kind TextAnalytics --sku S --location eastus --yes

az cognitiveservices account create \
  --name ai-speech-01 \
  --resource-group rg-ai102-challenge01 \
  --kind SpeechServices --sku S0 --location eastus --yes

# Compare endpoints
echo "Multi-service endpoint:"
az cognitiveservices account show --name ai-multiservice-01 \
  --resource-group rg-ai102-challenge01 --query "properties.endpoint" -o tsv

echo "Vision endpoint:"
az cognitiveservices account show --name ai-vision-01 \
  --resource-group rg-ai102-challenge01 --query "properties.endpoint" -o tsv
```

</TabItem>
</Tabs>

## Expected Output

```
Created: ai-multiservice-01
Endpoint: https://eastus.api.cognitive.microsoft.com/
Kind: CognitiveServices

Available Azure AI service kinds:
  - CognitiveServices
  - ComputerVision
  - ContentSafety
  - FormRecognizer
  - OpenAI
  - SpeechServices
  - TextAnalytics
  ...

Created ComputerVision: https://eastus.api.cognitive.microsoft.com/
Created TextAnalytics: https://eastus.api.cognitive.microsoft.com/
Created SpeechServices: https://eastus.cognitiveservices.azure.com/

Multi-service endpoint: https://eastus.api.cognitive.microsoft.com/
Supports: Vision, Language, Speech, Decision (single key)
```

## Break and Fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Wrong kind specified | `InvalidParameterValue` error | Using deprecated kind name (e.g., "Face" vs "CognitiveServices") | Check `az cognitiveservices account list-skus` for valid kinds |
| Region not available | `LocationNotAvailable` error | Service not available in chosen region | Use `az account list-locations` and check service availability matrix |
| SKU mismatch | `SkuNotAvailable` | Requested SKU not offered for that kind | Match SKU to service kind (e.g., TextAnalytics uses "S" not "S0") |
| Quota exceeded | `QuotaExceeded` | Too many resources of same kind in subscription | Delete unused resources or request quota increase |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "You need to use a single endpoint and key to access Computer Vision, Language, and Speech capabilities. Which resource kind should you create?",
    options: [
      "ComputerVision with S1 SKU",
      "CognitiveServices (multi-service resource)",
      "OpenAI with Standard deployment",
      "AIServices with combined SKU"
    ],
    correctAnswer: 1,
    explanation: "A multi-service resource (kind: CognitiveServices) provides a single endpoint and key for multiple Azure AI services including Vision, Language, and Speech."
  },
  {
    question: "Which Azure AI service should you use to extract structured data from invoices and receipts?",
    options: [
      "Azure AI Language with custom entity recognition",
      "Azure AI Vision with OCR",
      "Azure AI Document Intelligence (Form Recognizer)",
      "Azure OpenAI with GPT-4o"
    ],
    correctAnswer: 2,
    explanation: "Azure AI Document Intelligence (formerly Form Recognizer) is purpose-built for extracting structured data from documents like invoices, receipts, and forms with pre-built and custom models."
  },
  {
    question: "What is a key limitation of multi-service Azure AI resources compared to single-service resources?",
    options: [
      "Multi-service resources cost more per API call",
      "Multi-service resources cannot use managed identity",
      "Some service-specific features require single-service resources",
      "Multi-service resources are limited to one region"
    ],
    correctAnswer: 2,
    explanation: "Some advanced service-specific features (like custom neural voice or certain container deployments) require dedicated single-service resources rather than the multi-service resource."
  },
  {
    question: "You need to implement real-time speech translation for a conference application. Which service should you select?",
    options: [
      "Azure AI Translator with document translation",
      "Azure AI Speech with speech translation API",
      "Azure OpenAI with Whisper model",
      "Azure AI Language with text translation"
    ],
    correctAnswer: 1,
    explanation: "Azure AI Speech service includes a speech translation API that provides real-time speech-to-speech and speech-to-text translation, ideal for conference scenarios."
  },
  {
    question: "Which scenario requires Azure OpenAI Service rather than Azure AI Language?",
    options: [
      "Extracting key phrases from customer reviews",
      "Detecting the language of incoming text",
      "Generating creative marketing copy from product descriptions",
      "Classifying support tickets into predefined categories"
    ],
    correctAnswer: 2,
    explanation: "Generating creative content requires generative AI capabilities provided by Azure OpenAI Service. Azure AI Language handles extraction, detection, and classification tasks but not open-ended text generation."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-challenge01 --yes --no-wait
```

## Learn More
- [Azure AI services documentation](https://learn.microsoft.com/azure/ai-services/)
- [Multi-service vs single-service resources](https://learn.microsoft.com/azure/ai-services/multi-service-resource)
- [Azure AI services pricing](https://azure.microsoft.com/pricing/details/cognitive-services/)
- [Regional availability](https://azure.microsoft.com/global-infrastructure/services/?products=cognitive-services)
