---
sidebar_position: 9
title: "Challenge 08: Cost Management for AI Services"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 08: Cost Management for AI Services

:::info Estimated Time
**45-60 min** | **Cost**: ~$0 (analysis only) | **Domain**: Plan & Manage AI Solutions (15-20%)
:::

## Exam skills covered
- Manage costs for Microsoft Foundry Services
- Plan capacity using pricing models (pay-per-call vs provisioned throughput)
- Implement cost optimization strategies for AI workloads

## Overview

Managing costs for Azure AI services requires understanding multiple pricing models: pay-per-call for standard deployments, token-based billing for language models, and Provisioned Throughput Units (PTU) for guaranteed capacity. Without careful planning, AI workloads can generate unexpected costs, especially with high-volume generative AI applications.

In this challenge, you'll learn to estimate token costs using the `tiktoken` library, query Azure Cost Management for AI spending analysis, create budget alerts to prevent overspending, and implement caching strategies to reduce redundant API calls. These skills are critical for operating AI solutions at scale within budget constraints.

Understanding the trade-offs between pay-as-you-go and PTU pricing helps architects choose the right model — PTU provides predictable costs and guaranteed throughput for sustained workloads, while pay-per-call is more economical for bursty or low-volume scenarios.

## Architecture

Cost management combines Azure Cost Management APIs, budget alerts, and application-level caching to optimize AI spending.

![Challenge 08 topology](/img/AI-103/challenge-08-topology.svg)

## Prerequisites

- Azure subscription with Cost Management access (Reader role minimum)
- An Azure OpenAI resource with a deployed model (for token estimation)
- Python with `tiktoken` package installed
- Azure CLI installed

## Implementation

### Task 1: Estimate Token Costs with tiktoken

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import tiktoken

# Initialize encoder for the model you're using
# cl100k_base: GPT-4, GPT-3.5-turbo, text-embedding-ada-002
# o200k_base: GPT-4o, GPT-4o-mini
encoder = tiktoken.get_encoding("o200k_base")

# Pricing per 1K tokens (example: GPT-4o as of 2024)
PRICING = {
    "gpt-4o": {"prompt": 0.005, "completion": 0.015},       # per 1K tokens
    "gpt-4o-mini": {"prompt": 0.00015, "completion": 0.0006},
    "gpt-35-turbo": {"prompt": 0.0005, "completion": 0.0015},
}

def count_tokens(text: str, model_encoding: str = "o200k_base") -> int:
    """Count tokens in a text string."""
    enc = tiktoken.get_encoding(model_encoding)
    return len(enc.encode(text))

def estimate_chat_cost(messages: list[dict], model: str = "gpt-4o",
                       expected_completion_tokens: int = 500) -> dict:
    """Estimate cost for a chat completion request."""
    # Count prompt tokens (simplified - actual includes message formatting overhead)
    prompt_text = ""
    for msg in messages:
        prompt_text += msg["role"] + msg["content"]
    
    prompt_tokens = count_tokens(prompt_text)
    # Add ~4 tokens per message for formatting overhead
    prompt_tokens += len(messages) * 4
    
    pricing = PRICING[model]
    prompt_cost = (prompt_tokens / 1000) * pricing["prompt"]
    completion_cost = (expected_completion_tokens / 1000) * pricing["completion"]
    
    return {
        "model": model,
        "prompt_tokens": prompt_tokens,
        "estimated_completion_tokens": expected_completion_tokens,
        "total_tokens": prompt_tokens + expected_completion_tokens,
        "prompt_cost": prompt_cost,
        "completion_cost": completion_cost,
        "total_cost": prompt_cost + completion_cost
    }

# Example: Estimate costs for a batch of requests
messages = [
    {"role": "system", "content": "You are a helpful assistant that summarizes documents."},
    {"role": "user", "content": "Summarize the following quarterly report in 3 bullet points: " + "x" * 2000}
]

estimate = estimate_chat_cost(messages, model="gpt-4o", expected_completion_tokens=200)
print(f"=== Single Request Estimate ===")
print(f"  Prompt tokens: {estimate['prompt_tokens']}")
print(f"  Completion tokens: {estimate['estimated_completion_tokens']}")
print(f"  Cost: ${estimate['total_cost']:.6f}")

# Batch estimation
daily_requests = 10000
daily_cost = daily_requests * estimate["total_cost"]
monthly_cost = daily_cost * 30
print(f"\n=== Monthly Projection ===")
print(f"  Daily requests: {daily_requests:,}")
print(f"  Daily cost: ${daily_cost:.2f}")
print(f"  Monthly cost: ${monthly_cost:.2f}")

# Compare PTU vs pay-as-you-go
PTU_MONTHLY_COST = 2000  # Example: 1 PTU at ~$2000/month
PTU_TOKENS_PER_MINUTE = 100000  # Approximate tokens/min per PTU
print(f"\n=== PTU Comparison ===")
print(f"  Pay-as-you-go monthly: ${monthly_cost:.2f}")
print(f"  1 PTU monthly: ${PTU_MONTHLY_COST:.2f}")
print(f"  PTU is cheaper: {monthly_cost > PTU_MONTHLY_COST}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Microsoft.ML.Tokenizers;

// Use Microsoft.ML.Tokenizers for token counting in .NET
// Install: dotnet add package Microsoft.ML.Tokenizers

// Pricing per 1K tokens
var pricing = new Dictionary<string, (double Prompt, double Completion)>
{
    ["gpt-4o"] = (0.005, 0.015),
    ["gpt-4o-mini"] = (0.00015, 0.0006),
    ["gpt-35-turbo"] = (0.0005, 0.0015)
};

// Load tokenizer for the model
var tokenizer = TiktokenTokenizer.CreateForModel("gpt-4o");

string systemMessage = "You are a helpful assistant that summarizes documents.";
string userMessage = "Summarize the following quarterly report in 3 bullet points: " +
    new string('x', 2000);

// Count tokens
int systemTokens = tokenizer.CountTokens(systemMessage);
int userTokens = tokenizer.CountTokens(userMessage);
int promptTokens = systemTokens + userTokens + 8; // overhead for message formatting
int estimatedCompletionTokens = 200;

// Calculate cost
string model = "gpt-4o";
var (promptRate, completionRate) = pricing[model];
double promptCost = (promptTokens / 1000.0) * promptRate;
double completionCost = (estimatedCompletionTokens / 1000.0) * completionRate;
double totalCost = promptCost + completionCost;

Console.WriteLine("=== Single Request Estimate ===");
Console.WriteLine($"  Prompt tokens: {promptTokens}");
Console.WriteLine($"  Completion tokens: {estimatedCompletionTokens}");
Console.WriteLine($"  Cost: ${totalCost:F6}");

// Monthly projection
int dailyRequests = 10000;
double dailyCost = dailyRequests * totalCost;
double monthlyCost = dailyCost * 30;
Console.WriteLine($"\n=== Monthly Projection ===");
Console.WriteLine($"  Daily requests: {dailyRequests:N0}");
Console.WriteLine($"  Daily cost: ${dailyCost:F2}");
Console.WriteLine($"  Monthly cost: ${monthlyCost:F2}");

// PTU comparison
double ptuMonthlyCost = 2000;
Console.WriteLine($"\n=== PTU Comparison ===");
Console.WriteLine($"  Pay-as-you-go monthly: ${monthlyCost:F2}");
Console.WriteLine($"  1 PTU monthly: ${ptuMonthlyCost:F2}");
Console.WriteLine($"  PTU is cheaper: {monthlyCost > ptuMonthlyCost}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Install tiktoken for token counting
pip install tiktoken

# Quick token count using Python one-liner
python3 -c "
import tiktoken
enc = tiktoken.get_encoding('o200k_base')
text = 'Your sample text here for token estimation'
print(f'Tokens: {len(enc.encode(text))}')
print(f'Est. cost at GPT-4o rates: \${len(enc.encode(text)) / 1000 * 0.005:.6f} (prompt)')
"

# Azure OpenAI pricing reference (check current prices)
echo "=== Current Pricing Models ==="
echo "Pay-per-call: Billed per 1K tokens consumed"
echo "  GPT-4o: \$0.005/1K prompt, \$0.015/1K completion"
echo "  GPT-4o-mini: \$0.00015/1K prompt, \$0.0006/1K completion"
echo ""
echo "Provisioned Throughput (PTU):"
echo "  Reserved capacity billed monthly"
echo "  Guaranteed tokens-per-minute throughput"
echo "  Best for sustained, predictable workloads"
```

</TabItem>
</Tabs>

### Task 2: Query Azure Cost Management for AI Spending

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.costmanagement import CostManagementClient
from azure.mgmt.costmanagement.models import (
    QueryDefinition,
    QueryTimePeriod,
    QueryDataset,
    QueryAggregation,
    QueryGrouping,
    ExportType,
    TimeframeType
)
from datetime import datetime, timedelta

credential = DefaultAzureCredential()
cost_client = CostManagementClient(credential)

subscription_id = "<your-subscription-id>"
scope = f"/subscriptions/{subscription_id}"

# Query AI services costs for the last 30 days
end_date = datetime.utcnow()
start_date = end_date - timedelta(days=30)

query = QueryDefinition(
    type=ExportType.ACTUAL_COST,
    timeframe=TimeframeType.CUSTOM,
    time_period=QueryTimePeriod(
        from_property=start_date,
        to=end_date
    ),
    dataset=QueryDataset(
        granularity="Daily",
        aggregation={
            "totalCost": QueryAggregation(name="Cost", function="Sum"),
            "totalQuantity": QueryAggregation(name="UsageQuantity", function="Sum")
        },
        grouping=[
            QueryGrouping(type="Dimension", name="ServiceName"),
            QueryGrouping(type="Dimension", name="MeterCategory")
        ],
        filter={
            "dimensions": {
                "name": "ServiceName",
                "operator": "In",
                "values": [
                    "Cognitive Services",
                    "Azure OpenAI Service",
                    "Azure AI Search"
                ]
            }
        }
    )
)

result = cost_client.query.usage(scope=scope, parameters=query)

print("=== AI Services Cost Breakdown (Last 30 Days) ===")
total_cost = 0
for row in result.rows:
    cost = row[0]
    quantity = row[1]
    service = row[2]
    meter = row[3]
    total_cost += cost
    if cost > 0:
        print(f"  {service} ({meter}): ${cost:.2f} ({quantity:.0f} units)")

print(f"\n  Total AI spending: ${total_cost:.2f}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.CostManagement;
using Azure.ResourceManager.CostManagement.Models;

var credential = new DefaultAzureCredential();
var armClient = new ArmClient(credential);

var subscription = await armClient.GetDefaultSubscriptionAsync();
string scope = $"/subscriptions/{subscription.Data.SubscriptionId}";

// Query AI services costs for the last 30 days
var queryDefinition = new QueryDefinition(
    ExportType.ActualCost,
    TimeframeType.MonthToDate,
    new QueryDataset
    {
        Granularity = new GranularityType("Daily"),
        Aggregation =
        {
            ["totalCost"] = new QueryAggregation("Cost", FunctionType.Sum)
        },
        Grouping =
        {
            new QueryGrouping(QueryColumnType.Dimension, "ServiceName"),
            new QueryGrouping(QueryColumnType.Dimension, "MeterCategory")
        }
    });

// Execute cost query
var scopeResource = armClient.GetTenantResource(new Azure.Core.ResourceIdentifier(scope));
// Note: Use the CostManagement extension methods for your scope
Console.WriteLine("=== AI Services Cost Query ===");
Console.WriteLine("Query submitted for Cognitive Services, Azure OpenAI, Azure AI Search");
Console.WriteLine("Results filtered to AI-related service categories");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Query AI costs using Azure CLI Cost Management
# Get cost breakdown by service for AI workloads
az cost management query \
  --type ActualCost \
  --timeframe MonthToDate \
  --dataset-aggregation '{"totalCost": {"name": "Cost", "function": "Sum"}}' \
  --dataset-grouping name=ServiceName type=Dimension \
  --scope "/subscriptions/$(az account show --query id -o tsv)" \
  --output table

# Alternative: Use REST API directly
TOKEN=$(az account get-access-token --query accessToken -o tsv)
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

curl -s -X POST \
  "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/providers/Microsoft.CostManagement/query?api-version=2023-11-01" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ActualCost",
    "timeframe": "MonthToDate",
    "dataset": {
      "granularity": "None",
      "aggregation": {
        "totalCost": {"name": "Cost", "function": "Sum"}
      },
      "grouping": [
        {"type": "Dimension", "name": "ServiceName"},
        {"type": "Dimension", "name": "MeterSubCategory"}
      ],
      "filter": {
        "dimensions": {
          "name": "ServiceName",
          "operator": "In",
          "values": ["Cognitive Services", "Azure OpenAI Service", "Azure AI Search"]
        }
      }
    }
  }' | jq '.properties.rows[] | {service: .[1], meter: .[2], cost: .[0]}'
```

</TabItem>
</Tabs>

### Task 3: Create Budget Alert for AI Spending

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.consumption import ConsumptionManagementClient
from azure.mgmt.consumption.models import Budget, BudgetFilter, BudgetTimePeriod, Notification
from datetime import datetime

credential = DefaultAzureCredential()
subscription_id = "<your-subscription-id>"
consumption_client = ConsumptionManagementClient(credential, subscription_id)

scope = f"/subscriptions/{subscription_id}"

# Create a monthly budget for AI services
budget = Budget(
    category="Cost",
    amount=500,  # $500 monthly budget for AI services
    time_grain="Monthly",
    time_period=BudgetTimePeriod(
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2025, 12, 31)
    ),
    filter=BudgetFilter(
        dimensions={
            "name": "ServiceName",
            "operator": "In",
            "values": ["Cognitive Services", "Azure OpenAI Service"]
        }
    ),
    notifications={
        "warning_at_80_percent": Notification(
            enabled=True,
            operator="GreaterThanOrEqualTo",
            threshold=80,
            contact_emails=["ai-team@contoso.com"],
            threshold_type="Actual"
        ),
        "critical_at_100_percent": Notification(
            enabled=True,
            operator="GreaterThanOrEqualTo",
            threshold=100,
            contact_emails=["ai-team@contoso.com", "finance@contoso.com"],
            threshold_type="Actual"
        ),
        "forecast_at_120_percent": Notification(
            enabled=True,
            operator="GreaterThanOrEqualTo",
            threshold=120,
            contact_emails=["ai-team@contoso.com", "finance@contoso.com"],
            threshold_type="Forecasted"
        )
    }
)

result = consumption_client.budgets.create_or_update(
    scope=scope,
    budget_name="ai-services-monthly-budget",
    parameters=budget
)
print(f"Budget created: {result.name}")
print(f"  Amount: ${result.amount}/month")
print(f"  Alerts: 80% actual, 100% actual, 120% forecasted")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.Consumption;
using Azure.ResourceManager.Consumption.Models;

var credential = new DefaultAzureCredential();
var armClient = new ArmClient(credential);

var subscription = await armClient.GetDefaultSubscriptionAsync();

// Create budget using ARM REST call (simplified example)
Console.WriteLine("=== Creating AI Services Budget ===");
Console.WriteLine("Budget: $500/month");
Console.WriteLine("Scope: Cognitive Services + Azure OpenAI Service");
Console.WriteLine("Alerts:");
Console.WriteLine("  - 80% actual spend → ai-team@contoso.com");
Console.WriteLine("  - 100% actual spend → ai-team + finance");
Console.WriteLine("  - 120% forecasted → ai-team + finance");

// Note: For full implementation, use Azure.ResourceManager.Consumption
// or direct REST API call as shown in the REST tab
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create budget for AI services ($500/month)
az consumption budget create \
  --budget-name "ai-services-monthly-budget" \
  --amount 500 \
  --category Cost \
  --time-grain Monthly \
  --start-date "2024-01-01" \
  --end-date "2025-12-31" \
  --resource-filter "{\"dimensions\": {\"name\": \"ServiceName\", \"operator\": \"In\", \"values\": [\"Cognitive Services\", \"Azure OpenAI Service\"]}}"

# Note: Budget notifications must be configured via REST API or portal
TOKEN=$(az account get-access-token --query accessToken -o tsv)

curl -s -X PUT \
  "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/providers/Microsoft.Consumption/budgets/ai-services-monthly-budget?api-version=2023-11-01" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "category": "Cost",
      "amount": 500,
      "timeGrain": "Monthly",
      "timePeriod": {
        "startDate": "2024-01-01T00:00:00Z",
        "endDate": "2025-12-31T00:00:00Z"
      },
      "filter": {
        "dimensions": {
          "name": "ServiceName",
          "operator": "In",
          "values": ["Cognitive Services", "Azure OpenAI Service"]
        }
      },
      "notifications": {
        "warning80": {
          "enabled": true,
          "operator": "GreaterThanOrEqualTo",
          "threshold": 80,
          "contactEmails": ["ai-team@contoso.com"],
          "thresholdType": "Actual"
        },
        "critical100": {
          "enabled": true,
          "operator": "GreaterThanOrEqualTo",
          "threshold": 100,
          "contactEmails": ["ai-team@contoso.com", "finance@contoso.com"],
          "thresholdType": "Actual"
        }
      }
    }
  }'

echo "Budget created with notification thresholds at 80% and 100%"
```

</TabItem>
</Tabs>

### Task 4: Implement Response Caching to Reduce API Calls

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import hashlib
import json
import time
from functools import lru_cache
from azure.identity import DefaultAzureCredential
import os
import redis

# Strategy 1: In-memory LRU cache for identical requests
@lru_cache(maxsize=1000)
def cached_completion(prompt_hash: str, model: str, temperature: float):
    """Cache completions by prompt hash. Only works for deterministic (temp=0) requests."""
    # This would call the actual API
    pass

def get_prompt_hash(messages: list[dict]) -> str:
    """Generate deterministic hash for a set of messages."""
    content = json.dumps(messages, sort_keys=True)
    return hashlib.sha256(content.encode()).hexdigest()

# Strategy 2: Redis cache for distributed applications
class AIResponseCache:
    def __init__(self, redis_url: str, default_ttl: int = 3600):
        self.redis = redis.from_url(redis_url)
        self.default_ttl = default_ttl
        self.hits = 0
        self.misses = 0

    def get_cached_response(self, messages: list[dict], model: str) -> dict | None:
        """Check cache for existing response."""
        cache_key = self._make_key(messages, model)
        cached = self.redis.get(cache_key)
        if cached:
            self.hits += 1
            return json.loads(cached)
        self.misses += 1
        return None

    def cache_response(self, messages: list[dict], model: str,
                       response: dict, ttl: int | None = None):
        """Store response in cache."""
        cache_key = self._make_key(messages, model)
        self.redis.setex(
            cache_key,
            ttl or self.default_ttl,
            json.dumps(response)
        )

    def _make_key(self, messages: list[dict], model: str) -> str:
        content = json.dumps({"messages": messages, "model": model}, sort_keys=True)
        return f"ai:completion:{hashlib.sha256(content.encode()).hexdigest()}"

    def get_stats(self) -> dict:
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        return {
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": f"{hit_rate:.1f}%",
            "estimated_savings": f"${self.hits * 0.01:.2f}"  # Rough estimate
        }

# Usage example
cache = AIResponseCache("redis://localhost:6379")

messages = [{"role": "user", "content": "What is the capital of France?"}]
model = "gpt-4o"

# Check cache first
cached = cache.get_cached_response(messages, model)
if cached:
    print(f"Cache HIT: {cached}")
else:
    # Call API (simulated)
    response = {"content": "The capital of France is Paris.", "tokens": 15}
    cache.cache_response(messages, model, response)
    print(f"Cache MISS - stored response")

print(f"\nCache stats: {cache.get_stats()}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;

// Strategy 1: In-memory cache with IMemoryCache
public class AIResponseMemoryCache
{
    private readonly IMemoryCache _cache;
    private int _hits = 0;
    private int _misses = 0;

    public AIResponseMemoryCache(IMemoryCache cache) => _cache = cache;

    public string? GetCachedResponse(List<Dictionary<string, string>> messages, string model)
    {
        string key = MakeCacheKey(messages, model);
        if (_cache.TryGetValue(key, out string? response))
        {
            Interlocked.Increment(ref _hits);
            return response;
        }
        Interlocked.Increment(ref _misses);
        return null;
    }

    public void CacheResponse(List<Dictionary<string, string>> messages,
                              string model, string response, TimeSpan? ttl = null)
    {
        string key = MakeCacheKey(messages, model);
        var options = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = ttl ?? TimeSpan.FromHours(1),
            SlidingExpiration = TimeSpan.FromMinutes(30)
        };
        _cache.Set(key, response, options);
    }

    private string MakeCacheKey(List<Dictionary<string, string>> messages, string model)
    {
        var content = JsonSerializer.Serialize(new { messages, model });
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(content));
        return $"ai:completion:{Convert.ToHexString(hash).ToLower()}";
    }

    public (int Hits, int Misses, double HitRate) GetStats()
    {
        int total = _hits + _misses;
        double hitRate = total > 0 ? (double)_hits / total * 100 : 0;
        return (_hits, _misses, hitRate);
    }
}

// Strategy 2: Distributed cache with Redis (IDistributedCache)
public class AIResponseDistributedCache
{
    private readonly IDistributedCache _cache;

    public AIResponseDistributedCache(IDistributedCache cache) => _cache = cache;

    public async Task<string?> GetCachedResponseAsync(
        List<Dictionary<string, string>> messages, string model)
    {
        string key = MakeCacheKey(messages, model);
        return await _cache.GetStringAsync(key);
    }

    public async Task CacheResponseAsync(
        List<Dictionary<string, string>> messages, string model,
        string response, TimeSpan? ttl = null)
    {
        string key = MakeCacheKey(messages, model);
        await _cache.SetStringAsync(key, response, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = ttl ?? TimeSpan.FromHours(1)
        });
    }

    private string MakeCacheKey(List<Dictionary<string, string>> messages, string model)
    {
        var content = JsonSerializer.Serialize(new { messages, model });
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(content));
        return $"ai:completion:{Convert.ToHexString(hash).ToLower()}";
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Azure API Management can provide built-in caching for AI APIs
# This example shows configuring APIM semantic caching policy

# Strategy: Use Azure API Management as a gateway with caching
# This caches identical requests and avoids redundant API calls

# Example APIM policy for AI response caching (XML inbound policy):
cat << 'EOF'
<!-- Add to APIM inbound policy -->
<cache-lookup vary-by-developer="false"
              vary-by-developer-groups="false"
              downstream-caching-type="none">
    <vary-by-header>Authorization</vary-by-header>
    <vary-by-query-parameter>model</vary-by-query-parameter>
</cache-lookup>

<!-- Add to APIM outbound policy -->
<cache-store duration="3600" />
EOF

# Alternative: Use Azure Redis Cache for application-level caching
# Create Redis cache instance
az redis create \
  --name ai-response-cache \
  --resource-group rg-ai102-challenge08 \
  --location eastus \
  --sku Basic \
  --vm-size c0

# Get Redis connection string
REDIS_CONN=$(az redis list-keys \
  --name ai-response-cache \
  --resource-group rg-ai102-challenge08 \
  --query primaryKey -o tsv)

echo "Redis cache created for AI response caching"
echo "Expected cost savings: 30-60% reduction in API calls for repeated queries"

# Cost optimization summary
echo ""
echo "=== Cost Optimization Strategies ==="
echo "1. Response caching: Reduce redundant API calls (30-60% savings)"
echo "2. Prompt optimization: Shorter prompts = fewer tokens"
echo "3. Model selection: Use GPT-4o-mini for simple tasks (97% cheaper)"
echo "4. Batch processing: Group requests for efficiency"
echo "5. PTU for sustained workloads: Predictable pricing at scale"
```

</TabItem>
</Tabs>

## Expected Output

```text
=== Single Request Estimate ===
  Prompt tokens: 587
  Completion tokens: 200
  Cost: $0.005935

=== Monthly Projection ===
  Daily requests: 10,000
  Daily cost: $59.35
  Monthly cost: $1,780.50

=== PTU Comparison ===
  Pay-as-you-go monthly: $1,780.50
  1 PTU monthly: $2,000.00
  PTU is cheaper: False

=== AI Services Cost Breakdown (Last 30 Days) ===
  Azure OpenAI Service (GPT-4o): $1,245.67 (2,491,340 units)
  Cognitive Services (Text Analytics): $89.50 (179,000 units)
  Azure AI Search (Standard): $250.00 (1 units)

  Total AI spending: $1,585.17

Budget created: ai-services-monthly-budget
  Amount: $500/month
  Alerts: 80% actual, 100% actual, 120% forecasted
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Token count mismatch vs actual billing | Estimated tokens differ from usage report | Using wrong tiktoken encoding for the model | Use `o200k_base` for GPT-4o, `cl100k_base` for GPT-4/3.5 |
| Budget alert not firing | No email when threshold exceeded | Budget filter not matching service name exactly | Verify service names match Cost Management dimension values exactly |
| Cache hit rate too low | Most requests bypass cache | Temperature > 0 produces different outputs for same prompt | Set temperature=0 for cacheable requests, or cache only embeddings |
| Cost query returns no results | Empty response from Cost Management | Data not available yet (up to 24h delay) | Cost data has 8-24h ingestion delay; query previous day's data |
| PTU underutilized | Paying for PTU capacity but low usage | Workload is bursty, not sustained | Switch to pay-as-you-go for bursty workloads; PTU suits steady throughput |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "When should you choose Provisioned Throughput Units (PTU) over pay-per-call pricing for Azure OpenAI?",
    options: [
      "For development and testing environments with minimal usage",
      "For sustained, predictable workloads requiring guaranteed throughput",
      "For batch processing jobs that run once per week",
      "For applications with fewer than 100 requests per day"
    ],
    correctAnswer: 1,
    explanation: "PTU pricing is optimal for sustained, predictable workloads that need guaranteed throughput. PTU provides reserved capacity at a fixed monthly cost, making it more economical than pay-per-call when utilization is consistently high. Low-volume or bursty workloads are better served by pay-per-call."
  },
  {
    question: "Which Python library is used to count tokens for Azure OpenAI models before sending requests?",
    options: [
      "openai-tokens",
      "tiktoken",
      "tokenizers",
      "azure-ai-tokenizer"
    ],
    correctAnswer: 1,
    explanation: "The tiktoken library (developed by OpenAI) is the standard tool for counting tokens for GPT models. It supports multiple encodings: o200k_base for GPT-4o models and cl100k_base for GPT-4 and GPT-3.5-turbo."
  },
  {
    question: "What is the primary benefit of implementing response caching for Azure OpenAI API calls?",
    options: [
      "It improves the quality of AI-generated responses",
      "It eliminates the need for API authentication",
      "It reduces costs by avoiding redundant API calls for identical prompts",
      "It increases the token limit for each request"
    ],
    correctAnswer: 2,
    explanation: "Response caching stores previous API responses and returns them for identical requests, avoiding redundant API calls. This reduces both costs (fewer billed tokens) and latency. Caching works best with deterministic settings (temperature=0) where identical prompts produce identical outputs."
  },
  {
    question: "How long is the typical delay before Azure Cost Management data is available for querying?",
    options: [
      "Real-time (< 1 minute)",
      "1-4 hours",
      "8-24 hours",
      "48-72 hours"
    ],
    correctAnswer: 2,
    explanation: "Azure Cost Management data typically has an 8-24 hour ingestion delay. Usage data from Azure AI services is collected, processed, and made available for querying within this timeframe. For near-real-time monitoring, use Azure Monitor metrics instead."
  },
  {
    question: "Which budget notification threshold type alerts you BEFORE you actually exceed your budget?",
    options: [
      "Actual",
      "Forecasted",
      "Projected",
      "Estimated"
    ],
    correctAnswer: 1,
    explanation: "The 'Forecasted' threshold type uses Azure's spending prediction to alert you when your projected end-of-period spend is expected to exceed the threshold. This provides early warning before you actually reach the limit, unlike 'Actual' which only fires after the threshold is breached."
  }
]} />

## Cleanup

```bash
# No Azure resources created (analysis only)
# If you created a Redis cache for testing:
az group delete --name rg-ai102-challenge08 --yes --no-wait
```

## Learn More

- [Azure OpenAI pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/)
- [Provisioned Throughput Units (PTU)](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/provisioned-throughput)
- [Azure Cost Management best practices](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/cost-mgt-best-practices)
- [tiktoken library](https://github.com/openai/tiktoken)
- [Create and manage budgets](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets)
