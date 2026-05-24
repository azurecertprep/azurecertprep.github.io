---
sidebar_position: 10
title: "Desafio 19: Otimizar Soluções de IA Generativa"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 19: Otimizar Soluções de IA Generativa

:::info Tempo Estimado
**45-60 min** | **Custo**: ~$5.00 (estimado, fine-tuning) | **Domínio**: Soluções de IA Generativa (15-20%)
:::

## Habilidades do exame cobertas
- Configurar parâmetros para otimizar a saída de IA generativa
- Implementar monitoramento e observabilidade para soluções de IA generativa
- Otimizar escalabilidade e desempenho
- Implementar rastreamento com Application Insights e OpenTelemetry
- Preparar e enviar jobs de fine-tuning

## Visão Geral

Otimizar soluções de IA generativa requer atenção Ã  latência, custo, qualidade e observabilidade. Respostas com **streaming** melhoram a latência percebida entregando tokens de forma incremental em vez de esperar pela geração completa. **Otimização de tokens** usando bibliotecas como `tiktoken` permite estimativa precisa de custos e compressão de prompts. Juntas, essas técnicas reduzem tanto o tempo de resposta real quanto o percebido.

**Observabilidade** é crítica para sistemas de IA em produção. O Azure OpenAI integra-se com o Application Insights através do OpenTelemetry, fornecendo rastreamento de ponta a ponta de requisições, uso de tokens, distribuições de latência e taxas de erro. Spans e atributos customizados permitem rastrear métricas específicas do negócio, como uso de templates de prompt e scores de qualidade de resposta.

**Fine-tuning** permite a personalização de modelos base com dados específicos do domínio. O fluxo de trabalho envolve preparar dados de treinamento em formato JSONL (com pares de mensagens system/user/assistant), fazer upload dos arquivos, criar um job de fine-tuning e implantar o modelo customizado resultante. Modelos com fine-tuning podem alcançar melhor desempenho em tarefas específicas com prompts mais curtos, reduzindo tanto a latência quanto o custo por requisição.

## Arquitetura

Este desafio implementa respostas com streaming, configura rastreamento OpenTelemetry, otimiza o uso de tokens e prepara um fluxo de trabalho de fine-tuning.

![Challenge 19 topology](/img/ai-102/challenge-19-topology.svg)

## Pré-requisitos
- Recurso Azure OpenAI com GPT-4o implantado
- Recurso Application Insights (connection string)
- Python 3.9+ com pacotes `openai`, `tiktoken`, `azure-monitor-opentelemetry`
- .NET 8 SDK com pacotes NuGet `Azure.AI.OpenAI`, `Azure.Monitor.OpenTelemetry.AspNetCore`
- Dados de treinamento em formato JSONL (para a tarefa de fine-tuning)

## Implementação

### Tarefa 1: Implementar Respostas com Streaming

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

### Tarefa 2: Configurar Rastreamento OpenTelemetry

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

### Tarefa 3: Contar e Otimizar Tokens

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

### Tarefa 4: Preparar Dados de Fine-Tuning e Enviar Job

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

## Saída Esperada

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

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Streaming retorna chunks vazios | Sem conteúdo no delta | Normal â€” alguns chunks contêm apenas role/metadata | Filtrar chunks onde `delta.content` não é None/null |
| Contagem de tokens divergente | Contagem local difere da API | Versão do tokenizer incompatível ou overhead de mensagem | Usar `tiktoken` com o modelo correto; considerar overhead de 3 tokens por mensagem |
| Job de fine-tuning falha | Status: `failed` | Formato de dados de treinamento inválido ou menos de 10 exemplos | Validar formato JSONL; garantir mínimo de 10 exemplos de treinamento |
| Traces não aparecem | Sem dados no Application Insights | Connection string mal configurada ou atraso na ingestão | Verificar connection string; aguardar 2-5 minutos para ingestão |
| Modelo com fine-tuning com alta latência | Mais lento que o modelo base | Modelo customizado não otimizado para deployment | Aumentar capacidade do SKU; considerar se fine-tuning é necessário vs. few-shot |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ch19-q1",
    question: "Qual é o principal benefício de respostas com streaming no Azure OpenAI?",
    options: [
      "Reduz o time-to-first-token, melhorando a latência percebida",
      "Reduz o consumo total de tokens",
      "Melhora a qualidade e precisão da resposta",
      "Permite limites maiores de tokens máximos"
    ],
    correctAnswer: 0,
    explanation: "O streaming entrega tokens de forma incremental via Server-Sent Events (SSE), reduzindo o time-to-first-token de segundos para tipicamente menos de 500ms. O tempo total de geração permanece similar, mas os usuários percebem respostas mais rápidas porque o conteúdo aparece imediatamente."
  },
  {
    id: "ch19-q2",
    question: "Qual é o número mínimo de exemplos de treinamento necessários para fine-tuning no Azure OpenAI?",
    options: [
      "3 exemplos",
      "10 exemplos",
      "50 exemplos",
      "100 exemplos"
    ],
    correctAnswer: 1,
    explanation: "O Azure OpenAI requer um mínimo de 10 exemplos de treinamento para fine-tuning. No entanto, a Microsoft recomenda 50-100 exemplos bem elaborados para melhorias significativas. Os dados de treinamento devem estar em formato JSONL com arrays de mensagens system/user/assistant."
  },
  {
    id: "ch19-q3",
    question: "Qual biblioteca é usada para contar tokens localmente para GPT-4o antes de fazer chamadas Ã  API?",
    options: [
      "transformers",
      "sentencepiece",
      "tokenizers",
      "tiktoken"
    ],
    correctAnswer: 3,
    explanation: "tiktoken é a biblioteca oficial de tokenização da OpenAI para Python. O GPT-4o usa o encoding o200k_base. A contagem local de tokens com tiktoken permite estimativa de custos, otimização de prompts e gerenciamento da janela de contexto antes de fazer chamadas Ã  API."
  },
  {
    id: "ch19-q4",
    question: "Ao configurar rastreamento OpenTelemetry para Azure OpenAI, qual métrica é mais importante para monitoramento de custos?",
    options: [
      "Latência da requisição (ms)",
      "Códigos de status HTTP",
      "Uso de tokens (prompt_tokens + completion_tokens)",
      "Tamanho do pool de conexões"
    ],
    correctAnswer: 2,
    explanation: "O uso de tokens determina diretamente o custo, já que o Azure OpenAI cobra por token. Rastrear prompt_tokens e completion_tokens por requisição permite atribuição de custos, monitoramento de orçamento e otimização. Latência e códigos de status são importantes para confiabilidade, mas não se correlacionam diretamente com custo."
  },
  {
    id: "ch19-q5",
    question: "Qual formato os dados de treinamento devem usar para fine-tuning no Azure OpenAI?",
    options: [
      "CSV com colunas para entrada e saída",
      "Array JSON de pares prompt-completion",
      "JSONL com arrays de messages contendo roles system/user/assistant",
      "Texto plano com prompt e completion separados por ###"
    ],
    correctAnswer: 2,
    explanation: "O fine-tuning para modelos de chat requer formato JSONL (um objeto JSON por linha) onde cada objeto contém um array 'messages' com entradas baseadas em roles (system, user, assistant). Isso corresponde ao formato da API de chat completions, garantindo que o modelo com fine-tuning funcione com a mesma interface."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-challenge19 --yes --no-wait

# Delete fine-tuning artifacts
# curl -X DELETE "https://${AZURE_OPENAI_ENDPOINT}/openai/files/{file-id}?api-version=2024-10-21" \
#   -H "api-key: ${AZURE_OPENAI_KEY}"
```

## Saiba Mais
- [Streaming com Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/how-to/streaming)
- [Fine-tuning de modelos Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/how-to/fine-tuning)
- [Contagem de tokens com tiktoken](https://github.com/openai/tiktoken)
- [Azure Monitor OpenTelemetry](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-enable)
- [OpenTelemetry para IA generativa](https://learn.microsoft.com/azure/ai-services/openai/how-to/monitor-openai)
