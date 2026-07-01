---
sidebar_position: 10
title: "Challenge 19: Optimize Generative AI Solutions"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 19: Optimize Generative AI Solutions

:::info Estimated Time
**45-60 min** | **Cost**: ~$5.00 (estimated, fine-tuning) | **Domain**: Generative AI & Agentic Solutions (35-40%)
:::

## Exam skills covered
- Configure parameters to optimize generative AI output
- Implement monitoring and observability for generative AI solutions
- Optimize scalability and performance
- Implement tracing with Application Insights and OpenTelemetry
- Prepare and submit fine-tuning jobs

## Overview

Optimizing generative AI solutions requires attention to latency, cost, quality, and observability. **Streaming** responses improve perceived latency by delivering tokens incrementally rather than waiting for complete generation. **Token optimization** using libraries like `tiktoken` enables precise cost estimation and prompt compression. Together, these techniques reduce both actual and perceived response times.

**Observability** is critical for production AI systems. Azure OpenAI integrates with Application Insights through OpenTelemetry, providing end-to-end tracing of requests, token usage, latency distributions, and error rates. Custom spans and attributes enable tracking business-specific metrics like prompt template usage and response quality scores.

**Fine-tuning** allows customization of base models with domain-specific data. The workflow involves preparing training data in JSONL format (with system/user/assistant message pairs), uploading files, creating a fine-tuning job, and deploying the resulting custom model. Fine-tuned models can achieve better task-specific performance with shorter prompts, reducing both latency and per-request cost.

## Architecture

This challenge implements streaming responses, configures OpenTelemetry tracing, optimizes token usage, and prepares a fine-tuning workflow.

![Challenge 19 topology](/img/AI-103/challenge-19-topology.svg)

## Prerequisites
- Azure OpenAI resource with GPT-4o deployed
- Application Insights resource (connection string)
- Python 3.9+ with `openai`, `tiktoken`, `azure-monitor-opentelemetry` packages
- .NET 8 SDK with `Azure.AI.OpenAI`, `Azure.Monitor.OpenTelemetry.AspNetCore` NuGet packages
- Training data in JSONL format (for fine-tuning task)

## Implementation

### Task 1: Implement Streaming Responses

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

# Non-streaming: wait for complete response
start = time.time()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Explain 5 Azure AI services in detail."}],
    max_tokens=500
)
non_stream_time = time.time() - start
print(f"Non-streaming: {non_stream_time:.2f}s total wait")
print(f"Response length: {len(response.choices[0].message.content)} chars\n")

# Streaming: receive tokens incrementally
start = time.time()
first_token_time = None
full_response = ""

stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Explain 5 Azure AI services in detail."}],
    max_tokens=500,
    stream=True
)

for chunk in stream:
    if chunk.choices and chunk.choices[0].delta.content:
        if first_token_time is None:
            first_token_time = time.time() - start
        content = chunk.choices[0].delta.content
        full_response += content
        print(content, end="", flush=True)

total_stream_time = time.time() - start

print(f"\n\nStreaming: first token in {first_token_time:.2f}s, "
      f"total {total_stream_time:.2f}s")
print(f"Response length: {len(full_response)} chars")
print(f"Time to first token improvement: {non_stream_time - first_token_time:.2f}s faster")
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

ChatClient chatClient = azureClient.GetChatClient("gpt-4o");

var messages = new ChatMessage[]
{
    new UserChatMessage("Explain 5 Azure AI services in detail.")
};

// Non-streaming
var sw = Stopwatch.StartNew();
ChatCompletion completion = await chatClient.CompleteChatAsync(
    messages,
    new ChatCompletionOptions { MaxOutputTokenCount = 500 });
sw.Stop();
Console.WriteLine($"Non-streaming: {sw.Elapsed.TotalSeconds:F2}s total wait");
Console.WriteLine($"Response length: {completion.Content[0].Text.Length} chars\n");

// Streaming: receive tokens incrementally
sw.Restart();
double? firstTokenTime = null;
var fullResponse = new System.Text.StringBuilder();

AsyncCollectionResult<StreamingChatCompletionUpdate> updates =
    chatClient.CompleteChatStreamingAsync(
        messages,
        new ChatCompletionOptions { MaxOutputTokenCount = 500 });

await foreach (StreamingChatCompletionUpdate update in updates)
{
    foreach (ChatMessageContentPart part in update.ContentUpdate)
    {
        if (firstTokenTime == null)
            firstTokenTime = sw.Elapsed.TotalSeconds;
        Console.Write(part.Text);
        fullResponse.Append(part.Text);
    }
}
sw.Stop();

Console.WriteLine($"\n\nStreaming: first token in {firstTokenTime:F2}s, "
    + $"total {sw.Elapsed.TotalSeconds:F2}s");
Console.WriteLine($"Response length: {fullResponse.Length} chars");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Non-streaming request
time curl -s -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{"role": "user", "content": "Explain 5 Azure AI services in detail."}],
    "max_tokens": 500,
    "stream": false
  }' | jq '.choices[0].message.content' | wc -c

# Streaming request (Server-Sent Events)
curl -N -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{"role": "user", "content": "Explain 5 Azure AI services in detail."}],
    "max_tokens": 500,
    "stream": true
  }'

# Streaming returns Server-Sent Events (SSE):
# data: {"choices":[{"delta":{"content":"Azure"},...}]}
# data: {"choices":[{"delta":{"content":" AI"},...}]}
# ...
# data: [DONE]
```

</TabItem>
</Tabs>

### Task 2: Configure OpenTelemetry Tracing

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry import trace

# Configure Application Insights export
configure_azure_monitor(
    connection_string=os.environ["APPLICATIONINSIGHTS_CONNECTION_STRING"]
)

tracer = trace.get_tracer(__name__)

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

@tracer.start_as_current_span("chat_completion")
def get_completion(user_message: str, template_name: str = "default") -> str:
    """Traced chat completion with custom attributes."""
    span = trace.get_current_span()
    span.set_attribute("ai.prompt_template", template_name)
    span.set_attribute("ai.model", "gpt-4o")
    span.set_attribute("ai.user_message_length", len(user_message))

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": user_message}
        ],
        max_tokens=200
    )

    # Record usage metrics as span attributes
    span.set_attribute("ai.prompt_tokens", response.usage.prompt_tokens)
    span.set_attribute("ai.completion_tokens", response.usage.completion_tokens)
    span.set_attribute("ai.total_tokens", response.usage.total_tokens)
    span.set_attribute("ai.finish_reason", response.choices[0].finish_reason)

    return response.choices[0].message.content

# Execute traced requests
with tracer.start_as_current_span("user_interaction") as parent_span:
    parent_span.set_attribute("user.session_id", "session-12345")

    result1 = get_completion("What is Azure OpenAI?", "knowledge_qa")
    result2 = get_completion("Summarize in one sentence.", "summarization")

    parent_span.set_attribute("interaction.total_requests", 2)

print("Traces exported to Application Insights")
print(f"Result 1: {result1[:100]}...")
print(f"Result 2: {result2[:100]}...")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using OpenAI.Chat;
using System.Diagnostics;

// Configure OpenTelemetry with Application Insights
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenTelemetry().UseAzureMonitor(options =>
{
    options.ConnectionString = Environment.GetEnvironmentVariable(
        "APPLICATIONINSIGHTS_CONNECTION_STRING");
});

var app = builder.Build();
var activitySource = new ActivitySource("AzureOpenAI.Challenge19");

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

ChatClient chatClient = azureClient.GetChatClient("gpt-4o");

app.MapGet("/chat", async (string message) =>
{
    using var activity = activitySource.StartActivity("ChatCompletion");
    activity?.SetTag("ai.model", "gpt-4o");
    activity?.SetTag("ai.user_message_length", message.Length);

    var result = await chatClient.CompleteChatAsync(
        new ChatMessage[] { new UserChatMessage(message) },
        new ChatCompletionOptions { MaxOutputTokenCount = 200 });

    activity?.SetTag("ai.prompt_tokens", result.Value.Usage.InputTokenCount);
    activity?.SetTag("ai.completion_tokens", result.Value.Usage.OutputTokenCount);
    activity?.SetTag("ai.total_tokens", result.Value.Usage.TotalTokenCount);

    return Results.Ok(new { response = result.Value.Content[0].Text });
});

app.Run();
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Application Insights tracks REST calls via HTTP pipeline
# Use custom dimensions in your application logging

# Example: Log token usage to Application Insights via REST
RESPONSE=$(curl -s -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{"role": "user", "content": "What is Azure OpenAI?"}],
    "max_tokens": 200
  }')

# Extract usage metrics for monitoring
PROMPT_TOKENS=$(echo $RESPONSE | jq '.usage.prompt_tokens')
COMPLETION_TOKENS=$(echo $RESPONSE | jq '.usage.completion_tokens')
TOTAL_TOKENS=$(echo $RESPONSE | jq '.usage.total_tokens')

echo "Prompt tokens: $PROMPT_TOKENS"
echo "Completion tokens: $COMPLETION_TOKENS"
echo "Total tokens: $TOTAL_TOKENS"

# KQL query for Application Insights:
# dependencies
# | where type == "HTTP" and target contains "openai.azure.com"
# | summarize avg(duration), sum(customDimensions.total_tokens)
#   by bin(timestamp, 1h)
```

</TabItem>
</Tabs>

### Task 3: Count and Optimize Tokens

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import tiktoken
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

# Get the tokenizer for GPT-4o (uses o200k_base encoding)
encoding = tiktoken.encoding_for_model("gpt-4o")

def count_message_tokens(messages: list, model: str = "gpt-4o") -> int:
    """Count tokens for a list of chat messages."""
    enc = tiktoken.encoding_for_model(model)
    tokens_per_message = 3  # Every message has <|start|>role/name\n content<|end|>\n
    tokens_per_name = 1

    num_tokens = 0
    for message in messages:
        num_tokens += tokens_per_message
        for key, value in message.items():
            num_tokens += len(enc.encode(value))
            if key == "name":
                num_tokens += tokens_per_name
    num_tokens += 3  # Every reply is primed with <|start|>assistant<|message|>
    return num_tokens

# Example: Compare verbose vs. optimized prompts
verbose_messages = [
    {"role": "system", "content": "You are a very helpful and knowledgeable assistant who always provides detailed, comprehensive, and thorough answers to any questions that users might ask about Azure cloud computing services and their various features and capabilities."},
    {"role": "user", "content": "Could you please explain to me what Azure Cognitive Services is and what it does and how it works?"}
]

optimized_messages = [
    {"role": "system", "content": "Azure technical assistant. Be concise."},
    {"role": "user", "content": "What is Azure Cognitive Services?"}
]

verbose_tokens = count_message_tokens(verbose_messages)
optimized_tokens = count_message_tokens(optimized_messages)

print(f"Verbose prompt: {verbose_tokens} tokens")
print(f"Optimized prompt: {optimized_tokens} tokens")
print(f"Token savings: {verbose_tokens - optimized_tokens} tokens "
      f"({(1 - optimized_tokens/verbose_tokens)*100:.0f}% reduction)")

# Verify with actual API call
response = client.chat.completions.create(
    model="gpt-4o",
    messages=optimized_messages,
    max_tokens=100
)
print(f"\nActual prompt tokens (API): {response.usage.prompt_tokens}")
print(f"Local estimate: {optimized_tokens}")

# Truncation strategy for long contexts
def truncate_to_token_limit(text: str, max_tokens: int = 4000) -> str:
    """Truncate text to fit within token limit."""
    tokens = encoding.encode(text)
    if len(tokens) <= max_tokens:
        return text
    truncated_tokens = tokens[:max_tokens]
    return encoding.decode(truncated_tokens)

long_text = "Azure provides many services. " * 500  # Simulate long input
truncated = truncate_to_token_limit(long_text, max_tokens=100)
print(f"\nOriginal: {len(encoding.encode(long_text))} tokens")
print(f"Truncated: {len(encoding.encode(truncated))} tokens")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;
using Microsoft.ML.Tokenizers;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

ChatClient chatClient = azureClient.GetChatClient("gpt-4o");

// Use Microsoft.ML.Tokenizers for token counting
Tokenizer tokenizer = TiktokenTokenizer.CreateForModel("gpt-4o");

string verboseSystem = "You are a very helpful and knowledgeable assistant who always "
    + "provides detailed, comprehensive, and thorough answers.";
string optimizedSystem = "Azure technical assistant. Be concise.";

string verboseUser = "Could you please explain to me what Azure Cognitive Services is?";
string optimizedUser = "What is Azure Cognitive Services?";

int verboseTokens = tokenizer.CountTokens(verboseSystem)
    + tokenizer.CountTokens(verboseUser) + 9; // overhead
int optimizedTokens = tokenizer.CountTokens(optimizedSystem)
    + tokenizer.CountTokens(optimizedUser) + 9;

Console.WriteLine($"Verbose prompt: ~{verboseTokens} tokens");
Console.WriteLine($"Optimized prompt: ~{optimizedTokens} tokens");
Console.WriteLine($"Savings: {verboseTokens - optimizedTokens} tokens "
    + $"({(1.0 - (double)optimizedTokens / verboseTokens) * 100:F0}% reduction)");

// Verify with API
var result = await chatClient.CompleteChatAsync(
    new ChatMessage[]
    {
        new SystemChatMessage(optimizedSystem),
        new UserChatMessage(optimizedUser)
    },
    new ChatCompletionOptions { MaxOutputTokenCount = 100 });

Console.WriteLine($"\nActual prompt tokens (API): {result.Value.Usage.InputTokenCount}");

// Truncation helper
string TruncateToTokenLimit(string text, int maxTokens)
{
    var tokens = tokenizer.EncodeToTokens(text, out _);
    if (tokens.Count <= maxTokens) return text;
    return tokenizer.Decode(tokens.Take(maxTokens).Select(t => t.Id).ToArray());
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Token counting is typically done client-side before API calls
# The API response includes actual token usage

# Verbose prompt
curl -s -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a very helpful and knowledgeable assistant who always provides detailed comprehensive answers."},
      {"role": "user", "content": "Could you please explain Azure Cognitive Services?"}
    ],
    "max_tokens": 100
  }' | jq '.usage'

# Optimized prompt (same result, fewer input tokens)
curl -s -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "Azure technical assistant. Be concise."},
      {"role": "user", "content": "What is Azure Cognitive Services?"}
    ],
    "max_tokens": 100
  }' | jq '.usage'

# Compare the prompt_tokens field between the two responses
```

</TabItem>
</Tabs>

### Task 4: Prepare Fine-Tuning Data and Submit Job

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import json
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

# Step 1: Prepare training data in JSONL format
training_data = [
    {
        "messages": [
            {"role": "system", "content": "You are an Azure billing assistant."},
            {"role": "user", "content": "What is a Reserved Instance?"},
            {"role": "assistant", "content": "A Reserved Instance (RI) is a billing discount applied when you commit to a 1-year or 3-year term for specific Azure resources like VMs or SQL databases. RIs can save up to 72% compared to pay-as-you-go pricing."}
        ]
    },
    {
        "messages": [
            {"role": "system", "content": "You are an Azure billing assistant."},
            {"role": "user", "content": "How do I view my Azure spending?"},
            {"role": "assistant", "content": "Navigate to Cost Management + Billing in the Azure portal. Use Cost Analysis for detailed breakdowns by resource, service, or time period. Set up budgets and alerts to monitor spending proactively."}
        ]
    },
    {
        "messages": [
            {"role": "system", "content": "You are an Azure billing assistant."},
            {"role": "user", "content": "What's the difference between PAYG and EA?"},
            {"role": "assistant", "content": "Pay-As-You-Go (PAYG) charges per-usage with no commitment. Enterprise Agreement (EA) is a volume licensing contract with upfront monetary commitment, offering lower rates and centralized billing for organizations."}
        ]
    }
]

# Write training file (minimum 10 examples required for fine-tuning)
with open("training_data.jsonl", "w") as f:
    for entry in training_data:
        f.write(json.dumps(entry) + "\n")

# Step 2: Upload training file
with open("training_data.jsonl", "rb") as f:
    training_file = client.files.create(
        file=f,
        purpose="fine-tune"
    )
print(f"Uploaded file ID: {training_file.id}")
print(f"Status: {training_file.status}")

# Step 3: Create fine-tuning job
fine_tuning_job = client.fine_tuning.jobs.create(
    training_file=training_file.id,
    model="gpt-4o-mini-2024-07-18",  # Base model to fine-tune
    hyperparameters={
        "n_epochs": 3,
        "batch_size": 1,
        "learning_rate_multiplier": 1.0
    },
    suffix="azure-billing"  # Custom model name suffix
)

print(f"\nFine-tuning job created: {fine_tuning_job.id}")
print(f"Status: {fine_tuning_job.status}")

# Step 4: Monitor fine-tuning progress
import time
while fine_tuning_job.status not in ("succeeded", "failed", "cancelled"):
    time.sleep(30)
    fine_tuning_job = client.fine_tuning.jobs.retrieve(fine_tuning_job.id)
    print(f"Status: {fine_tuning_job.status}")

if fine_tuning_job.status == "succeeded":
    print(f"Fine-tuned model: {fine_tuning_job.fine_tuned_model}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Files;
using OpenAI.FineTuning;
using System.Text.Json;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

// Step 1: Prepare training data
var trainingData = new[]
{
    new {
        messages = new[] {
            new { role = "system", content = "You are an Azure billing assistant." },
            new { role = "user", content = "What is a Reserved Instance?" },
            new { role = "assistant", content = "A Reserved Instance (RI) is a billing discount for 1-year or 3-year commitment to Azure resources, saving up to 72%." }
        }
    },
    new {
        messages = new[] {
            new { role = "system", content = "You are an Azure billing assistant." },
            new { role = "user", content = "How do I view my Azure spending?" },
            new { role = "assistant", content = "Use Cost Management + Billing in Azure portal. Cost Analysis provides breakdowns by resource and time period." }
        }
    }
};

// Write JSONL file
await using (var writer = new StreamWriter("training_data.jsonl"))
{
    foreach (var entry in trainingData)
        await writer.WriteLineAsync(JsonSerializer.Serialize(entry));
}

// Step 2: Upload training file
FileClient fileClient = azureClient.GetFileClient();
OpenAIFile uploadedFile = await fileClient.UploadFileAsync(
    "training_data.jsonl",
    FileUploadPurpose.FineTune);

Console.WriteLine($"Uploaded file ID: {uploadedFile.Id}");

// Step 3: Create fine-tuning job
FineTuningClient ftClient = azureClient.GetFineTuningClient();
FineTuningJob job = await ftClient.CreateJobAsync(
    model: "gpt-4o-mini-2024-07-18",
    trainingFile: uploadedFile.Id,
    options: new FineTuningOptions
    {
        Hyperparameters = new()
        {
            EpochCount = 3
        },
        Suffix = "azure-billing"
    });

Console.WriteLine($"Job ID: {job.Id} | Status: {job.Status}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Step 1: Create training data file (JSONL format)
cat > training_data.jsonl << 'EOF'
{"messages": [{"role": "system", "content": "You are an Azure billing assistant."}, {"role": "user", "content": "What is a Reserved Instance?"}, {"role": "assistant", "content": "A Reserved Instance (RI) provides up to 72% savings with a 1-year or 3-year commitment."}]}
{"messages": [{"role": "system", "content": "You are an Azure billing assistant."}, {"role": "user", "content": "How do I view spending?"}, {"role": "assistant", "content": "Use Cost Management + Billing in the Azure portal for detailed cost breakdowns."}]}
EOF

# Step 2: Upload training file
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/files?api-version=2024-10-21" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -F "purpose=fine-tune" \
  -F "file=@training_data.jsonl"

# Step 3: Create fine-tuning job (use file ID from upload response)
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/fine_tuning/jobs?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "model": "gpt-4o-mini-2024-07-18",
    "training_file": "file-abc123",
    "hyperparameters": {
      "n_epochs": 3,
      "batch_size": 1
    },
    "suffix": "azure-billing"
  }'

# Step 4: Check fine-tuning job status
curl -X GET "https://${AZURE_OPENAI_ENDPOINT}/openai/fine_tuning/jobs/{job-id}?api-version=2024-10-21" \
  -H "api-key: ${AZURE_OPENAI_KEY}"

# Step 5: Deploy fine-tuned model
az cognitiveservices account deployment create \
  --name aoai-challenge19 \
  --resource-group rg-ai102-challenge19 \
  --deployment-name billing-assistant \
  --model-name "gpt-4o-mini-2024-07-18.ft-azure-billing" \
  --model-format OpenAI \
  --sku-name "Standard" \
  --sku-capacity 10
```

</TabItem>
</Tabs>

## Expected Output

```text
Non-streaming: 3.45s total wait
Response length: 892 chars

Streaming: first token in 0.42s, total 3.51s
Response length: 892 chars
Time to first token improvement: 3.03s faster

Traces exported to Application Insights

Verbose prompt: 68 tokens
Optimized prompt: 21 tokens
Token savings: 47 tokens (69% reduction)

Actual prompt tokens (API): 21
Local estimate: 21

Uploaded file ID: file-abc123def456
Fine-tuning job created: ftjob-xyz789
Status: running
Status: succeeded
Fine-tuned model: ft:gpt-4o-mini-2024-07-18:azure-billing:abc123
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|-----------|-----|
| Streaming returns empty chunks | No content in delta | Normal—some chunks contain only role/metadata | Filter chunks where `delta.content` is not None/null |
| Token count mismatch | Local count differs from API | Tokenizer version mismatch or message overhead | Use `tiktoken` with correct model; account for 3-token message overhead |
| Fine-tuning job fails | Status: `failed` | Training data format invalid or fewer than 10 examples | Validate JSONL format; ensure minimum 10 training examples |
| Traces not appearing | No data in Application Insights | Connection string misconfigured or ingestion delay | Verify connection string; wait 2-5 minutes for ingestion |
| Fine-tuned model high latency | Slower than base model | Custom model not optimized for deployment | Increase SKU capacity; consider if fine-tuning is necessary vs. few-shot |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ch19-q1",
    question: "What is the primary benefit of streaming responses in Azure OpenAI?",
    options: [
      "Reduces time-to-first-token, improving perceived latency",
      "Reduces total token consumption",
      "Improves response quality and accuracy",
      "Enables longer maximum token limits"
    ],
    correctAnswer: 0,
    explanation: "Streaming delivers tokens incrementally via Server-Sent Events (SSE), reducing time-to-first-token from seconds to typically under 500ms. Total generation time remains similar, but users perceive faster responses because content appears immediately."
  },
  {
    id: "ch19-q2",
    question: "What is the minimum number of training examples required for fine-tuning in Azure OpenAI?",
    options: [
      "3 examples",
      "10 examples",
      "50 examples",
      "100 examples"
    ],
    correctAnswer: 1,
    explanation: "Azure OpenAI requires a minimum of 10 training examples for fine-tuning. However, Microsoft recommends 50-100 well-crafted examples for meaningful improvement. The training data must be in JSONL format with system/user/assistant message arrays."
  },
  {
    id: "ch19-q3",
    question: "Which library is used to count tokens locally for GPT-4o before making API calls?",
    options: [
      "transformers",
      "sentencepiece",
      "tokenizers",
      "tiktoken"
    ],
    correctAnswer: 3,
    explanation: "tiktoken is OpenAI's official tokenizer library for Python. GPT-4o uses the o200k_base encoding. Local token counting with tiktoken enables cost estimation, prompt optimization, and context window management before making API calls."
  },
  {
    id: "ch19-q4",
    question: "When configuring OpenTelemetry tracing for Azure OpenAI, which metric is most important for cost monitoring?",
    options: [
      "Request latency (ms)",
      "HTTP status codes",
      "Token usage (prompt_tokens + completion_tokens)",
      "Connection pool size"
    ],
    correctAnswer: 2,
    explanation: "Token usage directly determines cost since Azure OpenAI charges per token. Tracking prompt_tokens and completion_tokens per request enables cost attribution, budget monitoring, and optimization. Latency and status codes are important for reliability but don't directly correlate with cost."
  },
  {
    id: "ch19-q5",
    question: "What format must training data use for Azure OpenAI fine-tuning?",
    options: [
      "CSV with columns for input and output",
      "JSON array of prompt-completion pairs",
      "JSONL with messages arrays containing system/user/assistant roles",
      "Plain text with prompt and completion separated by ###"
    ],
    correctAnswer: 2,
    explanation: "Fine-tuning for chat models requires JSONL format (one JSON object per line) where each object contains a 'messages' array with role-based entries (system, user, assistant). This matches the chat completions API format, ensuring the fine-tuned model works with the same interface."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-challenge19 --yes --no-wait

# Delete fine-tuning artifacts
# curl -X DELETE "https://${AZURE_OPENAI_ENDPOINT}/openai/files/{file-id}?api-version=2024-10-21" \
#   -H "api-key: ${AZURE_OPENAI_KEY}"
```

## Learn More
- [Streaming with Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/how-to/streaming)
- [Fine-tuning Azure OpenAI models](https://learn.microsoft.com/azure/ai-services/openai/how-to/fine-tuning)
- [Token counting with tiktoken](https://github.com/openai/tiktoken)
- [Azure Monitor OpenTelemetry](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-enable)
- [OpenTelemetry for generative AI](https://learn.microsoft.com/azure/ai-services/openai/how-to/monitor-openai)
