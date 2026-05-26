---
sidebar_position: 5
title: "Challenge 04: SDKs, REST APIs, and Authentication"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 04: SDKs, REST APIs, and Authentication

:::info Estimated Time
**45 min** | **Cost**: ~$0.25 | **Domain**: Plan & Manage AI Solutions (20-25%)
:::

## Exam skills covered
- Install SDKs and APIs for Azure AI services
- Determine the default endpoint for a service
- Manage authentication using keys and Microsoft Entra ID
- Implement DefaultAzureCredential for production workloads
- Understand API versioning and SDK compatibility

## Overview

Azure AI services can be consumed via language-specific SDKs or direct REST API calls. The AI-102 exam tests your ability to choose the right authentication method, understand endpoint construction, and handle API versioning correctly.

There are two primary authentication patterns: **key-based** (using `AzureKeyCredential` or the `Ocp-Apim-Subscription-Key` header) and **Microsoft Entra ID** (using `DefaultAzureCredential` with OAuth2 bearer tokens). Key-based auth is simpler but less secure—keys can be leaked and don't provide identity-based audit trails. Entra ID auth requires a custom subdomain and proper RBAC role assignments but provides managed identity support, conditional access, and fine-grained auditing.

This challenge walks you through both authentication methods using the Azure AI Text Analytics SDK, demonstrates REST API calls with proper headers, and shows how `DefaultAzureCredential` cascades through multiple credential types for seamless local-to-cloud development.

## Architecture

You'll authenticate to Azure AI Language using both key-based and Entra ID methods, make the same API call with each, and compare the request patterns.

![Challenge 04 topology](/img/ai-102/challenge-04-topology.svg)

## Prerequisites
- Azure subscription with an Azure AI Language resource (with custom subdomain)
- Azure CLI 2.50+ installed and logged in
- Python 3.9+ with `pip` or .NET 8 SDK
- Role assignment: "Cognitive Services User" on the resource for Entra ID auth

## Implementation

### Task 1: Key-Based Authentication with Azure AI Text Analytics

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.core.credentials import AzureKeyCredential
from azure.ai.textanalytics import TextAnalyticsClient

# Key-based authentication
endpoint = os.environ["AZURE_AI_ENDPOINT"]  # https://<name>.cognitiveservices.azure.com/
key = os.environ["AZURE_AI_KEY"]

credential = AzureKeyCredential(key)
client = TextAnalyticsClient(endpoint=endpoint, credential=credential)

# Detect language
documents = [
    "This is a document written in English.",
    "Este es un documento escrito en español.",
    "Dies ist ein auf Deutsch verfasstes Dokument."
]

result = client.detect_language(documents=documents)

for doc in result:
    if not doc.is_error:
        print(f"'{doc.primary_language.name}' (confidence: {doc.primary_language.confidence_score:.2f})")
    else:
        print(f"Error: {doc.error.code} - {doc.error.message}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.TextAnalytics;

// Key-based authentication
var endpoint = new Uri(Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")!);
var key = new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_AI_KEY")!);

var client = new TextAnalyticsClient(endpoint, key);

// Detect language
var documents = new[]
{
    "This is a document written in English.",
    "Este es un documento escrito en español.",
    "Dies ist ein auf Deutsch verfasstes Dokument."
};

var response = await client.DetectLanguageBatchAsync(documents);

foreach (var result in response.Value)
{
    if (!result.HasError)
    {
        Console.WriteLine($"'{result.PrimaryLanguage.Name}' " +
            $"(confidence: {result.PrimaryLanguage.ConfidenceScore:F2})");
    }
    else
    {
        Console.WriteLine($"Error: {result.Error.ErrorCode} - {result.Error.Message}");
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="${AZURE_AI_ENDPOINT}"
KEY="${AZURE_AI_KEY}"

# Language detection via REST with key-based auth
curl -s "${ENDPOINT}language/:analyze-text?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "LanguageDetection",
    "parameters": { "modelVersion": "latest" },
    "analysisInput": {
      "documents": [
        {"id": "1", "text": "This is a document written in English."},
        {"id": "2", "text": "Este es un documento escrito en español."},
        {"id": "3", "text": "Dies ist ein auf Deutsch verfasstes Dokument."}
      ]
    }
  }' | python -m json.tool
```

</TabItem>
</Tabs>

### Task 2: Microsoft Entra ID Authentication with DefaultAzureCredential

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.identity import DefaultAzureCredential
from azure.ai.textanalytics import TextAnalyticsClient

# Entra ID authentication (requires custom subdomain on resource)
endpoint = os.environ["AZURE_AI_ENDPOINT"]  # Must be custom: https://<name>.cognitiveservices.azure.com/

# DefaultAzureCredential tries: Environment → Managed Identity → Azure CLI → etc.
credential = DefaultAzureCredential()
client = TextAnalyticsClient(endpoint=endpoint, credential=credential)

# Same API call, different auth method
documents = ["Azure AI services support multiple authentication methods."]

# Sentiment analysis
result = client.analyze_sentiment(documents=documents)

for doc in result:
    if not doc.is_error:
        print(f"Sentiment: {doc.sentiment}")
        print(f"  Positive: {doc.confidence_scores.positive:.2f}")
        print(f"  Neutral:  {doc.confidence_scores.neutral:.2f}")
        print(f"  Negative: {doc.confidence_scores.negative:.2f}")

# Key phrase extraction
keyphrases = client.extract_key_phrases(documents=documents)
for doc in keyphrases:
    if not doc.is_error:
        print(f"Key phrases: {', '.join(doc.key_phrases)}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.AI.TextAnalytics;

// Entra ID authentication with DefaultAzureCredential
var endpoint = new Uri(Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")!);
var credential = new DefaultAzureCredential();

var client = new TextAnalyticsClient(endpoint, credential);

// Sentiment analysis
var documents = new[] { "Azure AI services support multiple authentication methods." };

var sentimentResults = await client.AnalyzeSentimentBatchAsync(documents);

foreach (var result in sentimentResults.Value)
{
    if (!result.HasError)
    {
        Console.WriteLine($"Sentiment: {result.DocumentSentiment.Sentiment}");
        Console.WriteLine($"  Positive: {result.DocumentSentiment.ConfidenceScores.Positive:F2}");
        Console.WriteLine($"  Neutral:  {result.DocumentSentiment.ConfidenceScores.Neutral:F2}");
        Console.WriteLine($"  Negative: {result.DocumentSentiment.ConfidenceScores.Negative:F2}");
    }
}

// Key phrase extraction
var keyPhraseResults = await client.ExtractKeyPhrasesBatchAsync(documents);
foreach (var result in keyPhraseResults.Value)
{
    if (!result.HasError)
    {
        Console.WriteLine($"Key phrases: {string.Join(", ", result.KeyPhrases)}");
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="${AZURE_AI_ENDPOINT}"

# Get bearer token using Azure CLI (simulates DefaultAzureCredential)
TOKEN=$(az account get-access-token \
  --resource "https://cognitiveservices.azure.com" \
  --query "accessToken" -o tsv)

# Sentiment analysis with Entra ID bearer token
curl -s "${ENDPOINT}language/:analyze-text?api-version=2023-04-01" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "SentimentAnalysis",
    "parameters": { "modelVersion": "latest" },
    "analysisInput": {
      "documents": [
        {"id": "1", "text": "Azure AI services support multiple authentication methods."}
      ]
    }
  }' | python -m json.tool

# Note: No Ocp-Apim-Subscription-Key header needed with bearer token
# The token scope is https://cognitiveservices.azure.com/.default
```

</TabItem>
</Tabs>

### Task 3: Assign RBAC Role and Understand Credential Chain

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential, ChainedTokenCredential
from azure.identity import AzureCliCredential, ManagedIdentityCredential

# DefaultAzureCredential tries credentials in this order:
# 1. EnvironmentCredential (AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET)
# 2. WorkloadIdentityCredential (Kubernetes)
# 3. ManagedIdentityCredential (Azure VMs, App Service, Functions)
# 4. AzureCliCredential (local dev with 'az login')
# 5. AzurePowerShellCredential
# 6. AzureDeveloperCliCredential

# For production: use managed identity explicitly
production_credential = ManagedIdentityCredential()

# For local development: use Azure CLI
dev_credential = AzureCliCredential()

# Custom chain for specific needs
custom_credential = ChainedTokenCredential(
    ManagedIdentityCredential(),
    AzureCliCredential()
)

# Verify which credential is being used
from azure.identity import DefaultAzureCredential
import logging

logging.basicConfig(level=logging.DEBUG)
logging.getLogger("azure.identity").setLevel(logging.DEBUG)

credential = DefaultAzureCredential()
# Logs will show which credential in the chain succeeded

# Required RBAC role: "Cognitive Services User"
# az role assignment create \
#   --assignee <principal-id> \
#   --role "Cognitive Services User" \
#   --scope /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<name>
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.AI.TextAnalytics;

// DefaultAzureCredential tries multiple sources automatically
// Order: Environment → Workload Identity → Managed Identity → Azure CLI → etc.

// For production with managed identity
var productionCredential = new ManagedIdentityCredential();

// For local development
var devCredential = new AzureCliCredential();

// Custom chain with specific order
var customCredential = new ChainedTokenCredential(
    new ManagedIdentityCredential(),
    new AzureCliCredential()
);

// DefaultAzureCredential with options
var options = new DefaultAzureCredentialOptions
{
    ExcludeEnvironmentCredential = false,
    ExcludeManagedIdentityCredential = false,
    ExcludeAzureCliCredential = false,
    // Exclude credentials you don't use for faster auth
    ExcludeVisualStudioCredential = true,
    ExcludeVisualStudioCodeCredential = true,
    ExcludeSharedTokenCacheCredential = true
};

var credential = new DefaultAzureCredential(options);
var client = new TextAnalyticsClient(
    new Uri(Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")!),
    credential);

// Test authentication
var result = await client.DetectLanguageAsync("Test connectivity");
Console.WriteLine($"Auth successful! Detected: {result.Value.Name}");

// Required RBAC: "Cognitive Services User" role
// az role assignment create --assignee <principal-id> \
//   --role "Cognitive Services User" --scope <resource-id>
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Assign "Cognitive Services User" role for Entra ID auth
RESOURCE_ID=$(az cognitiveservices account show \
  --name ai102-language-04 \
  --resource-group rg-ai102-challenge04 \
  --query "id" -o tsv)

USER_PRINCIPAL=$(az ad signed-in-user show --query "id" -o tsv)

az role assignment create \
  --assignee "${USER_PRINCIPAL}" \
  --role "Cognitive Services User" \
  --scope "${RESOURCE_ID}"

# Verify role assignment
az role assignment list \
  --scope "${RESOURCE_ID}" \
  --assignee "${USER_PRINCIPAL}" \
  -o table

# Compare auth methods - both produce same results:
# Method 1: Key-based
curl -s "${ENDPOINT}language/:analyze-text?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"kind":"LanguageDetection","parameters":{"modelVersion":"latest"},"analysisInput":{"documents":[{"id":"1","text":"Hello"}]}}'

# Method 2: Bearer token
TOKEN=$(az account get-access-token \
  --resource "https://cognitiveservices.azure.com" \
  --query "accessToken" -o tsv)

curl -s "${ENDPOINT}language/:analyze-text?api-version=2023-04-01" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"kind":"LanguageDetection","parameters":{"modelVersion":"latest"},"analysisInput":{"documents":[{"id":"1","text":"Hello"}]}}'
```

</TabItem>
</Tabs>

## Expected Output

```text
'English' (confidence: 1.00)
'Spanish' (confidence: 1.00)
'German' (confidence: 1.00)

Sentiment: neutral
  Positive: 0.10
  Neutral:  0.88
  Negative: 0.02
Key phrases: Azure AI services, multiple authentication methods

Auth successful! Detected: English
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Entra auth 401 | `AuthenticationFailed` | Missing RBAC role assignment | Assign "Cognitive Services User" role to the identity |
| Custom domain missing | `InvalidAuthentication` with bearer token | Resource uses regional endpoint (no custom subdomain) | Recreate resource with `--custom-domain` parameter |
| Wrong token audience | `401 Unauthorized` | Token requested for wrong resource | Use `https://cognitiveservices.azure.com` as the resource/scope |
| SDK version mismatch | `ApiVersionNotSupported` | SDK version expects newer API version | Pin API version or upgrade SDK package |
| Key in wrong header | `401` with REST call | Using `api-key` instead of `Ocp-Apim-Subscription-Key` | Azure AI services use `Ocp-Apim-Subscription-Key`; Azure OpenAI uses `api-key` |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "Which RBAC role is the minimum required for an application to make inference calls to Azure AI services using Microsoft Entra authentication?",
    options: [
      "Contributor",
      "Cognitive Services Contributor",
      "Cognitive Services User",
      "Reader"
    ],
    correctAnswer: 2,
    explanation: "Cognitive Services User is the minimum RBAC role needed for inference (reading/calling APIs). Cognitive Services Contributor allows managing the resource itself. Contributor is too broad, and Reader cannot make API calls."
  },
  {
    question: "Your application runs on Azure App Service and needs to authenticate to Azure AI Language without storing credentials. What should you use?",
    options: [
      "Store the API key in App Service application settings",
      "Use a system-assigned managed identity with DefaultAzureCredential",
      "Store the API key in Azure Key Vault and retrieve it at startup",
      "Use a certificate stored in the App Service certificate store"
    ],
    correctAnswer: 1,
    explanation: "A system-assigned managed identity with DefaultAzureCredential eliminates credential management entirely. The identity is automatically provisioned, rotated, and cleaned up by Azure. No secrets to store or manage."
  },
  {
    question: "What is the correct HTTP header name for API key authentication when calling Azure AI services (non-OpenAI) via REST?",
    options: [
      "api-key",
      "Authorization: Bearer <key>",
      "Ocp-Apim-Subscription-Key",
      "x-api-key"
    ],
    correctAnswer: 2,
    explanation: "Azure AI services (Language, Vision, Speech, etc.) use the 'Ocp-Apim-Subscription-Key' header for key-based auth. Note: Azure OpenAI uses 'api-key' instead—they have different header conventions."
  },
  {
    question: "DefaultAzureCredential fails locally with 'No credential in this chain provided a token'. What is the most likely fix?",
    options: [
      "Install the azure-identity package again",
      "Run 'az login' to authenticate the Azure CLI",
      "Set the AZURE_AI_KEY environment variable",
      "Restart the application with administrator privileges"
    ],
    correctAnswer: 1,
    explanation: "DefaultAzureCredential attempts multiple credential sources in order. Locally, it typically relies on AzureCliCredential—if you haven't run 'az login' or your session expired, no credential in the chain can provide a token."
  },
  {
    question: "You need to call Azure AI Language with API version '2023-04-01' but the latest SDK defaults to '2024-04-01'. How should you handle this?",
    options: [
      "Downgrade the SDK package to an older version",
      "Use REST API calls instead of the SDK",
      "Set the api_version parameter when constructing the client if supported",
      "API versions are always backward compatible, so no action needed"
    ],
    correctAnswer: 2,
    explanation: "Most Azure AI SDKs allow specifying the API version via a parameter or client options. This lets you pin to a specific version without downgrading the entire package, which is the recommended approach for version control."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-challenge04 --yes --no-wait
```

## Learn More
- [Authenticate with Microsoft Entra ID](https://learn.microsoft.com/azure/ai-services/authentication)
- [DefaultAzureCredential overview](https://learn.microsoft.com/python/api/azure-identity/azure.identity.defaultazurecredential)
- [Azure AI services SDKs](https://learn.microsoft.com/azure/ai-services/reference/sdk-package-resources)
- [REST API reference](https://learn.microsoft.com/rest/api/cognitiveservices/)
