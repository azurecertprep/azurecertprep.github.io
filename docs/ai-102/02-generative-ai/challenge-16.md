---
sidebar_position: 7
title: "Challenge 16: Azure OpenAI: Provisioning and Configuration"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 16: Azure OpenAI: Provisioning and Configuration

:::info Estimated Time
**45-60 min** | **Cost**: ~$1.00 (estimated) | **Domain**: Generative AI Solutions (15-20%)
:::

## Exam skills covered
- Provision an Azure OpenAI resource
- Select and deploy an Azure OpenAI model
- Configure rate limits and manage deployment types

## Overview

Azure OpenAI Service provides REST API access to OpenAI's powerful language models including GPT-4o, GPT-4o-mini, and embedding models. Provisioning requires selecting the appropriate SKU (S0 for standard consumption) and understanding the deployment options available: **Standard** (shared infrastructure, pay-per-token), **Global Standard** (optimized routing across regions), and **Provisioned Throughput Units (PTU)** for guaranteed capacity.

Each deployment is subject to rate limits measured in Tokens Per Minute (TPM) and Requests Per Minute (RPM). When limits are exceeded, the service returns HTTP 429 responses with `Retry-After` headers. Production applications must implement retry strategies with exponential backoff to handle throttling gracefully.

API versions follow the format `YYYY-MM-DD` with preview suffixes for pre-GA features. Applications should target stable API versions (e.g., `2024-10-21`) and plan for version retirement, which is announced at least 90 days in advance.

## Architecture

This challenge provisions an Azure OpenAI resource, deploys models with specific capacity configurations, and tests rate-limiting behavior and retry strategies.

![Challenge 16 topology](/img/ai-102/challenge-16-topology.svg)

## Prerequisites
- Azure subscription with Azure OpenAI access approved
- Azure CLI 2.60+ installed
- Python 3.9+ with `openai` and `azure-identity` packages
- .NET 8 SDK with `Azure.AI.OpenAI` NuGet package

## Implementation

### Task 1: Provision Azure OpenAI Resource

Create an Azure OpenAI resource with the S0 SKU in a supported region.

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Provisioning is done via Azure CLI or ARM—use the resource with Python SDK
import os
from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

# Option 1: API Key authentication
client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

# Option 2: Microsoft Entra ID authentication (recommended)
token_provider = get_bearer_token_provider(
    DefaultAzureCredential(),
    "https://cognitiveservices.azure.com/.default"
)

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    azure_ad_token_provider=token_provider,
    api_version="2024-10-21"
)

# Verify connectivity
response = client.chat.completions.create(
    model="gpt-4o",  # This is the deployment name
    messages=[{"role": "user", "content": "Hello, confirm connection."}],
    max_tokens=10
)
print(f"Connected successfully: {response.choices[0].message.content}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using Azure.Identity;
using OpenAI.Chat;

// Option 1: API Key authentication
string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

// Option 2: Microsoft Entra ID authentication (recommended)
AzureOpenAIClient azureClientEntra = new(
    new Uri(endpoint),
    new DefaultAzureCredential());

// Get a ChatClient for a specific deployment
ChatClient chatClient = azureClient.GetChatClient("gpt-4o");

// Verify connectivity
ChatCompletion completion = await chatClient.CompleteChatAsync(
    new ChatMessage[] { new UserChatMessage("Hello, confirm connection.") },
    new ChatCompletionOptions { MaxOutputTokenCount = 10 });

Console.WriteLine($"Connected successfully: {completion.Content[0].Text}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create resource group
az group create --name rg-ai102-challenge16 --location eastus2

# Create Azure OpenAI resource (S0 SKU)
az cognitiveservices account create \
  --name aoai-challenge16 \
  --resource-group rg-ai102-challenge16 \
  --location eastus2 \
  --kind OpenAI \
  --sku S0 \
  --custom-domain aoai-challenge16

# Get the endpoint and keys
az cognitiveservices account show \
  --name aoai-challenge16 \
  --resource-group rg-ai102-challenge16 \
  --query properties.endpoint -o tsv

az cognitiveservices account keys list \
  --name aoai-challenge16 \
  --resource-group rg-ai102-challenge16

# Verify with a direct REST call
curl -X POST "https://aoai-challenge16.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{"role": "user", "content": "Hello, confirm connection."}],
    "max_tokens": 10
  }'
```

</TabItem>
</Tabs>

### Task 2: Deploy GPT-4o with Specific Capacity

Deploy a GPT-4o model with Standard deployment type and configure TPM capacity.

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Model deployment is managed via Azure CLI or REST management API
# After deployment, test with the Python SDK
import os
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

# Test the deployed model
response = client.chat.completions.create(
    model="gpt-4o",  # deployment name
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain Azure OpenAI deployment types in one sentence."}
    ],
    max_tokens=100
)

print(f"Response: {response.choices[0].message.content}")
print(f"Tokens used - Prompt: {response.usage.prompt_tokens}, "
      f"Completion: {response.usage.completion_tokens}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

ChatClient chatClient = azureClient.GetChatClient("gpt-4o");

ChatCompletion completion = await chatClient.CompleteChatAsync(
    new ChatMessage[]
    {
        new SystemChatMessage("You are a helpful assistant."),
        new UserChatMessage("Explain Azure OpenAI deployment types in one sentence.")
    },
    new ChatCompletionOptions { MaxOutputTokenCount = 100 });

Console.WriteLine($"Response: {completion.Content[0].Text}");
Console.WriteLine($"Tokens used - Prompt: {completion.Usage.InputTokenCount}, "
    + $"Completion: {completion.Usage.OutputTokenCount}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Deploy GPT-4o with Standard deployment type and 30K TPM capacity
az cognitiveservices account deployment create \
  --name aoai-challenge16 \
  --resource-group rg-ai102-challenge16 \
  --deployment-name gpt-4o \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-name "Standard" \
  --sku-capacity 30

# Deploy GPT-4o-mini for cost-efficient workloads
az cognitiveservices account deployment create \
  --name aoai-challenge16 \
  --resource-group rg-ai102-challenge16 \
  --deployment-name gpt-4o-mini \
  --model-name gpt-4o-mini \
  --model-version "2024-07-18" \
  --model-format OpenAI \
  --sku-name "GlobalStandard" \
  --sku-capacity 50

# List deployments to verify
az cognitiveservices account deployment list \
  --name aoai-challenge16 \
  --resource-group rg-ai102-challenge16 \
  -o table
```

</TabItem>
</Tabs>

### Task 3: Test Rate Limits and Implement Exponential Backoff

Send requests to observe rate limiting behavior and implement proper retry logic.

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import time
from openai import AzureOpenAI, RateLimitError

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

def call_with_exponential_backoff(messages, max_retries=5, base_delay=1.0):
    """Implement exponential backoff for rate-limited requests."""
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=50
            )
            return response
        except RateLimitError as e:
            if attempt == max_retries - 1:
                raise
            # Use Retry-After header if available, otherwise exponential backoff
            retry_after = getattr(e, "retry_after", None)
            delay = retry_after if retry_after else base_delay * (2 ** attempt)
            print(f"Rate limited. Retrying in {delay:.1f}s (attempt {attempt + 1})")
            time.sleep(delay)

# Simulate high-volume requests to trigger rate limiting
results = []
for i in range(20):
    try:
        response = call_with_exponential_backoff(
            [{"role": "user", "content": f"Say the number {i}"}]
        )
        results.append(response.choices[0].message.content)
        print(f"Request {i}: Success")
    except RateLimitError:
        print(f"Request {i}: Exhausted retries")

print(f"\nCompleted {len(results)}/20 requests")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;
using System.ClientModel;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

ChatClient chatClient = azureClient.GetChatClient("gpt-4o");

async Task<ChatCompletion?> CallWithExponentialBackoff(
    ChatMessage[] messages, int maxRetries = 5, double baseDelay = 1.0)
{
    for (int attempt = 0; attempt < maxRetries; attempt++)
    {
        try
        {
            return await chatClient.CompleteChatAsync(
                messages,
                new ChatCompletionOptions { MaxOutputTokenCount = 50 });
        }
        catch (ClientResultException ex) when (ex.Status == 429)
        {
            if (attempt == maxRetries - 1) throw;
            double delay = baseDelay * Math.Pow(2, attempt);
            Console.WriteLine(
                $"Rate limited. Retrying in {delay:F1}s (attempt {attempt + 1})");
            await Task.Delay(TimeSpan.FromSeconds(delay));
        }
    }
    return null;
}

// Simulate high-volume requests
int successCount = 0;
for (int i = 0; i < 20; i++)
{
    try
    {
        var result = await CallWithExponentialBackoff(
            new ChatMessage[] { new UserChatMessage($"Say the number {i}") });
        if (result != null)
        {
            successCount++;
            Console.WriteLine($"Request {i}: Success");
        }
    }
    catch (ClientResultException)
    {
        Console.WriteLine($"Request {i}: Exhausted retries");
    }
}

Console.WriteLine($"\nCompleted {successCount}/20 requests");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Send rapid requests to observe rate limiting (429 responses)
for i in $(seq 1 20); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "https://aoai-challenge16.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
    -H "Content-Type: application/json" \
    -H "api-key: ${AZURE_OPENAI_KEY}" \
    -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Say ${i}\"}], \"max_tokens\": 10}")
  echo "Request $i: HTTP $HTTP_CODE"
done

# Check rate limit headers in response
curl -i -X POST "https://aoai-challenge16.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }' 2>/dev/null | grep -i "x-ratelimit\|retry-after"

# Headers to observe:
# x-ratelimit-remaining-tokens
# x-ratelimit-remaining-requests
# Retry-After (when 429)
```

</TabItem>
</Tabs>

### Task 4: Compare Standard vs Global Standard Deployments

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import time
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

def measure_latency(deployment_name, num_requests=5):
    """Measure average latency for a deployment."""
    latencies = []
    for _ in range(num_requests):
        start = time.time()
        response = client.chat.completions.create(
            model=deployment_name,
            messages=[{"role": "user", "content": "Respond with OK."}],
            max_tokens=5
        )
        latencies.append(time.time() - start)
    return {
        "deployment": deployment_name,
        "avg_latency_ms": sum(latencies) / len(latencies) * 1000,
        "min_latency_ms": min(latencies) * 1000,
        "max_latency_ms": max(latencies) * 1000
    }

# Compare Standard vs Global Standard deployments
standard_results = measure_latency("gpt-4o")          # Standard deployment
global_results = measure_latency("gpt-4o-mini")       # Global Standard deployment

print("Standard Deployment:")
print(f"  Avg: {standard_results['avg_latency_ms']:.0f}ms | "
      f"Min: {standard_results['min_latency_ms']:.0f}ms | "
      f"Max: {standard_results['max_latency_ms']:.0f}ms")

print("\nGlobal Standard Deployment:")
print(f"  Avg: {global_results['avg_latency_ms']:.0f}ms | "
      f"Min: {global_results['min_latency_ms']:.0f}ms | "
      f"Max: {global_results['max_latency_ms']:.0f}ms")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;
using System.Diagnostics;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

async Task<(double avg, double min, double max)> MeasureLatency(
    string deploymentName, int numRequests = 5)
{
    ChatClient chatClient = azureClient.GetChatClient(deploymentName);
    var latencies = new List<double>();

    for (int i = 0; i < numRequests; i++)
    {
        var sw = Stopwatch.StartNew();
        await chatClient.CompleteChatAsync(
            new ChatMessage[] { new UserChatMessage("Respond with OK.") },
            new ChatCompletionOptions { MaxOutputTokenCount = 5 });
        sw.Stop();
        latencies.Add(sw.Elapsed.TotalMilliseconds);
    }

    return (latencies.Average(), latencies.Min(), latencies.Max());
}

var standard = await MeasureLatency("gpt-4o");
var global = await MeasureLatency("gpt-4o-mini");

Console.WriteLine($"Standard: Avg={standard.avg:F0}ms Min={standard.min:F0}ms Max={standard.max:F0}ms");
Console.WriteLine($"Global Standard: Avg={global.avg:F0}ms Min={global.min:F0}ms Max={global.max:F0}ms");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Compare latencies between deployment types
echo "=== Standard Deployment (gpt-4o) ==="
for i in $(seq 1 5); do
  START=$(date +%s%N)
  curl -s -o /dev/null \
    -X POST "https://aoai-challenge16.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
    -H "Content-Type: application/json" \
    -H "api-key: ${AZURE_OPENAI_KEY}" \
    -d '{"messages": [{"role": "user", "content": "OK"}], "max_tokens": 5}'
  END=$(date +%s%N)
  echo "Request $i: $(( (END - START) / 1000000 ))ms"
done

echo ""
echo "=== Global Standard Deployment (gpt-4o-mini) ==="
for i in $(seq 1 5); do
  START=$(date +%s%N)
  curl -s -o /dev/null \
    -X POST "https://aoai-challenge16.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-21" \
    -H "Content-Type: application/json" \
    -H "api-key: ${AZURE_OPENAI_KEY}" \
    -d '{"messages": [{"role": "user", "content": "OK"}], "max_tokens": 5}'
  END=$(date +%s%N)
  echo "Request $i: $(( (END - START) / 1000000 ))ms"
done
```

</TabItem>
</Tabs>

## Expected Output

```
Connected successfully: Hello! Connection confirmed.
Response: Standard uses shared compute with pay-per-token, Global Standard optimizes
routing across regions, and Provisioned (PTU) guarantees dedicated throughput capacity.
Tokens used - Prompt: 22, Completion: 31

Rate limited. Retrying in 1.0s (attempt 1)
Request 0: Success
...
Completed 18/20 requests

Standard Deployment:
  Avg: 450ms | Min: 320ms | Max: 680ms
Global Standard Deployment:
  Avg: 380ms | Min: 280ms | Max: 520ms
```

## Break and Fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|-----------|-----|
| Resource creation fails | `InvalidApiProperties` error | Region doesn't support Azure OpenAI | Use supported region (eastus, eastus2, westus, etc.) |
| Deployment fails | `ModelNotAvailable` | Model not available in selected region | Check model availability matrix or change region |
| API returns 401 | `Access denied due to invalid subscription key` | Wrong key or endpoint mismatch | Verify key matches resource; check endpoint URL |
| API returns 429 | `Rate limit is exceeded` | Exceeded TPM or RPM limit | Implement exponential backoff; increase capacity |
| API returns 404 | `Resource not found` | Wrong deployment name in request | Verify deployment name matches exactly |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "Which SKU is required when creating an Azure OpenAI resource via Azure CLI?",
    options: [
      "F0 (Free tier)",
      "S0 (Standard tier)",
      "P1 (Premium tier)",
      "B1 (Basic tier)"
    ],
    correctAnswer: 1,
    explanation: "Azure OpenAI Service uses the S0 SKU. There is no free tier for Azure OpenAI. The --sku parameter must be set to S0 when using az cognitiveservices account create --kind OpenAI."
  },
  {
    question: "What deployment type provides guaranteed throughput capacity with a fixed monthly cost?",
    options: [
      "Standard",
      "Global Standard",
      "Provisioned Throughput Units (PTU)",
      "Data Zone Standard"
    ],
    correctAnswer: 2,
    explanation: "Provisioned Throughput Units (PTU) provide dedicated compute capacity with guaranteed throughput and predictable monthly costs, ideal for production workloads with consistent traffic patterns."
  },
  {
    question: "When Azure OpenAI returns HTTP 429, which header indicates how long to wait before retrying?",
    options: [
      "x-ratelimit-remaining-tokens",
      "Retry-After",
      "x-ms-throttle-duration",
      "Rate-Limit-Reset"
    ],
    correctAnswer: 1,
    explanation: "The Retry-After header specifies the number of seconds to wait before making another request. The x-ratelimit-remaining-tokens header shows remaining quota but does not indicate retry timing."
  },
  {
    question: "What is the capacity unit for Standard deployments when configuring rate limits?",
    options: [
      "Requests Per Second (RPS)",
      "Tokens Per Minute (TPM) in thousands",
      "Concurrent connections",
      "GPU compute units"
    ],
    correctAnswer: 1,
    explanation: "Standard deployments are configured with capacity measured in thousands of Tokens Per Minute (TPM). For example, --sku-capacity 30 means 30,000 TPM. RPM limits are derived from TPM."
  },
  {
    question: "Which API version format does Azure OpenAI use, and what happens when a version is retired?",
    options: [
      "Semantic versioning (v1.2.3); retired versions return 410 Gone",
      "Date-based (YYYY-MM-DD); retired versions return 404 Not Found",
      "Date-based (YYYY-MM-DD); retired versions are upgraded automatically to the latest stable version",
      "Integer versioning (v1, v2); retired versions continue working indefinitely"
    ],
    correctAnswer: 2,
    explanation: "Azure OpenAI uses date-based API versions (e.g., 2024-10-21). When a version is retired (with 90 days notice), requests using that version are automatically routed to the latest stable GA version."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-challenge16 --yes --no-wait
```

## Learn More
- [Azure OpenAI Service documentation](https://learn.microsoft.com/azure/ai-services/openai/)
- [Model deployment types](https://learn.microsoft.com/azure/ai-services/openai/how-to/deployment-types)
- [Rate limits and quotas](https://learn.microsoft.com/azure/ai-services/openai/quotas-limits)
- [API version lifecycle](https://learn.microsoft.com/azure/ai-services/openai/api-version-deprecation)
- [Azure OpenAI Python SDK](https://github.com/openai/openai-python)
