---
sidebar_position: 11
title: "Desafio 20: OrquestraÃ§Ã£o Multi-Modelo"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 20: OrquestraÃ§Ã£o Multi-Modelo

:::info Tempo Estimado
**45-60 min** | **Custo**: ~$3.00 (estimado) | **DomÃ­nio**: SoluÃ§Ãµes de IA Generativa (15-20%)
:::

## Habilidades do exame cobertas
- Implementar orquestraÃ§Ã£o de mÃºltiplos modelos de IA generativa
- Implantar modelos em contÃªineres para cenÃ¡rios de borda
- Implementar function calling para uso de ferramentas

## VisÃ£o Geral

Sistemas de IA em produÃ§Ã£o raramente dependem de um Ãºnico modelo. **OrquestraÃ§Ã£o multi-modelo** roteia requisiÃ§Ãµes para diferentes modelos com base na complexidade da tarefa, restriÃ§Ãµes de custo ou requisitos de capacidade. Por exemplo, um roteador pode enviar tarefas simples de classificaÃ§Ã£o para o GPT-4o-mini (rÃ¡pido, barato) enquanto direciona raciocÃ­nio complexo para o GPT-4o (mais lento, mais capaz). Esse padrÃ£o otimiza o tradeoff custo-qualidade em um portfÃ³lio de aplicaÃ§Ãµes.

**Semantic Kernel** Ã© o SDK de orquestraÃ§Ã£o open-source da Microsoft que fornece abstraÃ§Ãµes para serviÃ§os de IA, plugins (funÃ§Ãµes que o modelo pode chamar) e planejadores que decompÃµem tarefas complexas em etapas. Ele suporta tanto Python quanto C#, integrando-se nativamente com o Azure OpenAI. Function calling (uso de ferramentas) permite que modelos invoquem ferramentas externas â€” APIs, bancos de dados ou cÃ³digo customizado â€” descrevendo as funÃ§Ãµes disponÃ­veis e deixando o modelo decidir quando e como chamÃ¡-las.

Para cenÃ¡rios de implantaÃ§Ã£o na borda, os contÃªineres Azure AI empacotam modelos para operaÃ§Ã£o offline ou de baixa latÃªncia. Modelos em contÃªineres operam independentemente de conectividade com a nuvem, sendo adequados para chÃ£os de fÃ¡brica, veÃ­culos ou redes restritas onde o acesso Ã  nuvem Ã© limitado ou proibido.

## Arquitetura

Este desafio implementa um roteador de modelos, configura function calling com ferramentas, constrÃ³i um pipeline de orquestraÃ§Ã£o multi-etapas e implanta um endpoint de modelo em contÃªiner.

![Challenge 20 topology](/img/ai-102/challenge-20-topology.svg)

## PrÃ©-requisitos
- Recurso Azure OpenAI com GPT-4o e GPT-4o-mini implantados
- Python 3.9+ com pacotes `openai`, `semantic-kernel`
- .NET 8 SDK com pacotes NuGet `Azure.AI.OpenAI`, `Microsoft.SemanticKernel`
- Docker Desktop (para a tarefa de implantaÃ§Ã£o em contÃªiner)
- Azure Container Registry (opcional, para push)

## ImplementaÃ§Ã£o

### Tarefa 1: Implementar Roteador de Modelos (Baseado em Complexidade)

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

class ModelRouter:
    """Route requests to appropriate models based on complexity."""

    COMPLEX_MODEL = "gpt-4o"       # For complex reasoning tasks
    SIMPLE_MODEL = "gpt-4o-mini"   # For simple, fast tasks

    COMPLEXITY_INDICATORS = [
        "analyze", "compare", "evaluate", "synthesize",
        "design", "architect", "debug", "explain why",
        "multi-step", "trade-offs", "implications"
    ]

    def classify_complexity(self, message: str) -> str:
        """Determine if a request is simple or complex."""
        message_lower = message.lower()
        complexity_score = sum(
            1 for indicator in self.COMPLEXITY_INDICATORS
            if indicator in message_lower
        )
        # Also consider message length as a heuristic
        if len(message) > 500 or complexity_score >= 2:
            return "complex"
        return "simple"

    def route(self, messages: list, **kwargs) -> dict:
        """Route request to appropriate model."""
        user_message = next(
            (m["content"] for m in reversed(messages) if m["role"] == "user"), ""
        )
        complexity = self.classify_complexity(user_message)
        model = self.COMPLEX_MODEL if complexity == "complex" else self.SIMPLE_MODEL

        start = time.time()
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs
        )
        latency = time.time() - start

        return {
            "response": response,
            "model_used": model,
            "complexity": complexity,
            "latency_ms": latency * 1000
        }

# Test the router
router = ModelRouter()

# Simple request â†’ routes to GPT-4o-mini
result1 = router.route(
    [{"role": "user", "content": "What is Azure?"}],
    max_tokens=100
)
print(f"Simple: model={result1['model_used']}, "
      f"latency={result1['latency_ms']:.0f}ms")
print(f"  Response: {result1['response'].choices[0].message.content[:80]}...\n")

# Complex request â†’ routes to GPT-4o
result2 = router.route(
    [{"role": "user", "content": "Analyze the trade-offs between using Azure Functions Consumption plan vs Premium plan. Compare cost implications, cold start behavior, and scaling characteristics for a multi-step data processing pipeline."}],
    max_tokens=300
)
print(f"Complex: model={result2['model_used']}, "
      f"latency={result2['latency_ms']:.0f}ms")
print(f"  Response: {result2['response'].choices[0].message.content[:80]}...")
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

class ModelRouter
{
    private readonly AzureOpenAIClient _client;
    private const string ComplexModel = "gpt-4o";
    private const string SimpleModel = "gpt-4o-mini";
    private static readonly string[] ComplexityIndicators =
        ["analyze", "compare", "evaluate", "synthesize", "design", "architect", "debug", "trade-offs"];

    public ModelRouter(AzureOpenAIClient client) => _client = client;

    public string ClassifyComplexity(string message)
    {
        string lower = message.ToLowerInvariant();
        int score = ComplexityIndicators.Count(i => lower.Contains(i));
        return (message.Length > 500 || score >= 2) ? "complex" : "simple";
    }

    public async Task<(ChatCompletion Result, string Model, string Complexity, double LatencyMs)>
        RouteAsync(ChatMessage[] messages, ChatCompletionOptions options)
    {
        string userMessage = messages.OfType<UserChatMessage>().LastOrDefault()?.Content?
            .FirstOrDefault()?.Text ?? "";
        string complexity = ClassifyComplexity(userMessage);
        string model = complexity == "complex" ? ComplexModel : SimpleModel;

        ChatClient chatClient = _client.GetChatClient(model);
        var sw = Stopwatch.StartNew();
        ChatCompletion result = await chatClient.CompleteChatAsync(messages, options);
        sw.Stop();

        return (result, model, complexity, sw.Elapsed.TotalMilliseconds);
    }
}

var router = new ModelRouter(azureClient);

// Simple request
var (result1, model1, complexity1, latency1) = await router.RouteAsync(
    new ChatMessage[] { new UserChatMessage("What is Azure?") },
    new ChatCompletionOptions { MaxOutputTokenCount = 100 });

Console.WriteLine($"Simple: model={model1}, latency={latency1:F0}ms");
Console.WriteLine($"  Response: {result1.Content[0].Text[..Math.Min(80, result1.Content[0].Text.Length)]}...\n");

// Complex request
var (result2, model2, complexity2, latency2) = await router.RouteAsync(
    new ChatMessage[] { new UserChatMessage("Analyze the trade-offs between Azure Functions Consumption vs Premium plan. Compare cost, cold start, and scaling.") },
    new ChatCompletionOptions { MaxOutputTokenCount = 300 });

Console.WriteLine($"Complex: model={model2}, latency={latency2:F0}ms");
Console.WriteLine($"  Response: {result2.Content[0].Text[..Math.Min(80, result2.Content[0].Text.Length)]}...");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Simple request â†’ route to gpt-4o-mini
echo "=== Simple Request (gpt-4o-mini) ==="
time curl -s -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{"role": "user", "content": "What is Azure?"}],
    "max_tokens": 100
  }' | jq -r '.choices[0].message.content'

# Complex request â†’ route to gpt-4o
echo ""
echo "=== Complex Request (gpt-4o) ==="
time curl -s -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{"role": "user", "content": "Analyze the trade-offs between Azure Functions Consumption vs Premium plan for a multi-step data processing pipeline."}],
    "max_tokens": 300
  }' | jq -r '.choices[0].message.content'
```

</TabItem>
</Tabs>

### Tarefa 2: Implementar Function Calling (Uso de Ferramentas)

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

# Define available tools (functions the model can call)
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name, e.g., 'Seattle, WA'"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "Temperature unit"
                    }
                },
                "required": ["location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_documents",
            "description": "Search internal knowledge base for relevant documents",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    },
                    "top_k": {
                        "type": "integer",
                        "description": "Number of results to return",
                        "default": 3
                    }
                },
                "required": ["query"]
            }
        }
    }
]

# Simulated tool implementations
def get_weather(location: str, unit: str = "celsius") -> str:
    # In production, call a real weather API
    return json.dumps({"location": location, "temperature": 18, "unit": unit, "condition": "partly cloudy"})

def search_documents(query: str, top_k: int = 3) -> str:
    # In production, call Azure AI Search
    return json.dumps({"results": [{"title": f"Doc about {query}", "snippet": f"Information about {query}..."}]})

# Function dispatch table
available_functions = {
    "get_weather": get_weather,
    "search_documents": search_documents
}

# Send request with tools
messages = [
    {"role": "system", "content": "You help users by calling tools when needed."},
    {"role": "user", "content": "What's the weather in Seattle and find docs about Azure Functions?"}
]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools,
    tool_choice="auto"  # Let model decide when to call tools
)

# Process tool calls
response_message = response.choices[0].message
if response_message.tool_calls:
    messages.append(response_message)  # Add assistant's tool call message

    for tool_call in response_message.tool_calls:
        function_name = tool_call.function.name
        function_args = json.loads(tool_call.function.arguments)

        print(f"Calling: {function_name}({function_args})")
        function_response = available_functions[function_name](**function_args)

        # Add tool response to messages
        messages.append({
            "tool_call_id": tool_call.id,
            "role": "tool",
            "name": function_name,
            "content": function_response
        })

    # Get final response with tool results
    final_response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages
    )
    print(f"\nFinal answer: {final_response.choices[0].message.content}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;
using System.Text.Json;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

ChatClient chatClient = azureClient.GetChatClient("gpt-4o");

// Define tools
ChatTool weatherTool = ChatTool.CreateFunctionTool(
    functionName: "get_weather",
    functionDescription: "Get current weather for a location",
    functionParameters: BinaryData.FromString("""
    {
        "type": "object",
        "properties": {
            "location": { "type": "string", "description": "City name" },
            "unit": { "type": "string", "enum": ["celsius", "fahrenheit"] }
        },
        "required": ["location"]
    }
    """));

ChatTool searchTool = ChatTool.CreateFunctionTool(
    functionName: "search_documents",
    functionDescription: "Search internal knowledge base",
    functionParameters: BinaryData.FromString("""
    {
        "type": "object",
        "properties": {
            "query": { "type": "string", "description": "Search query" },
            "top_k": { "type": "integer", "default": 3 }
        },
        "required": ["query"]
    }
    """));

var options = new ChatCompletionOptions();
options.Tools.Add(weatherTool);
options.Tools.Add(searchTool);

var messages = new List<ChatMessage>
{
    new SystemChatMessage("You help users by calling tools when needed."),
    new UserChatMessage("What's the weather in Seattle and find docs about Azure Functions?")
};

// First call - model decides to use tools
ChatCompletion completion = await chatClient.CompleteChatAsync(messages, options);

if (completion.FinishReason == ChatFinishReason.ToolCalls)
{
    messages.Add(new AssistantChatMessage(completion));

    foreach (ChatToolCall toolCall in completion.ToolCalls)
    {
        string result = toolCall.FunctionName switch
        {
            "get_weather" => """{"location":"Seattle","temperature":18,"condition":"cloudy"}""",
            "search_documents" => """{"results":[{"title":"Azure Functions Guide"}]}""",
            _ => """{"error":"Unknown function"}"""
        };

        Console.WriteLine($"Calling: {toolCall.FunctionName}({toolCall.FunctionArguments})");
        messages.Add(new ToolChatMessage(toolCall.Id, result));
    }

    // Second call with tool results
    ChatCompletion finalResult = await chatClient.CompleteChatAsync(messages, options);
    Console.WriteLine($"\nFinal answer: {finalResult.Content[0].Text}");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Function calling with tools
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "You help users by calling tools when needed."},
      {"role": "user", "content": "What is the weather in Seattle?"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get current weather for a location",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {"type": "string", "description": "City name"},
              "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
            },
            "required": ["location"]
          }
        }
      }
    ],
    "tool_choice": "auto"
  }'

# Response will include tool_calls instead of content:
# "choices": [{"message": {"tool_calls": [{"id": "call_abc", "function": {"name": "get_weather", "arguments": "{\"location\":\"Seattle\"}"}}]}}]

# Follow up with tool result
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "You help users by calling tools when needed."},
      {"role": "user", "content": "What is the weather in Seattle?"},
      {"role": "assistant", "tool_calls": [{"id": "call_abc", "type": "function", "function": {"name": "get_weather", "arguments": "{\"location\":\"Seattle\"}"}}]},
      {"role": "tool", "tool_call_id": "call_abc", "content": "{\"temperature\": 18, \"condition\": \"cloudy\"}"}
    ]
  }'
```

</TabItem>
</Tabs>

### Tarefa 3: Construir Pipeline Multi-Etapas com Semantic Kernel

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import asyncio
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion
from semantic_kernel.functions import kernel_function
from semantic_kernel.connectors.ai.open_ai import AzureChatPromptExecutionSettings

# Initialize Semantic Kernel
kernel = Kernel()

# Add Azure OpenAI service
kernel.add_service(
    AzureChatCompletion(
        deployment_name="gpt-4o",
        endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_key=os.environ["AZURE_OPENAI_KEY"],
    )
)

# Define plugins (native functions)
class TextAnalysisPlugin:
    """Plugin for text analysis tasks."""

    @kernel_function(description="Summarize text into key points")
    async def summarize(self, input: str) -> str:
        settings = AzureChatPromptExecutionSettings(max_tokens=200, temperature=0)
        result = await kernel.invoke_prompt(
            f"Summarize the following text into 3 bullet points:\n\n{input}",
            settings=settings
        )
        return str(result)

    @kernel_function(description="Extract action items from text")
    async def extract_actions(self, input: str) -> str:
        settings = AzureChatPromptExecutionSettings(max_tokens=200, temperature=0)
        result = await kernel.invoke_prompt(
            f"Extract action items from this text as a numbered list:\n\n{input}",
            settings=settings
        )
        return str(result)

    @kernel_function(description="Determine sentiment of text")
    async def analyze_sentiment(self, input: str) -> str:
        settings = AzureChatPromptExecutionSettings(max_tokens=50, temperature=0)
        result = await kernel.invoke_prompt(
            f"What is the sentiment of this text? Reply with: positive, negative, or neutral.\n\n{input}",
            settings=settings
        )
        return str(result)

# Register plugin
kernel.add_plugin(TextAnalysisPlugin(), plugin_name="TextAnalysis")

async def multi_step_pipeline(document: str):
    """Execute a multi-step analysis pipeline."""
    print("=== Multi-Step Analysis Pipeline ===\n")

    # Step 1: Summarize
    print("Step 1: Summarizing...")
    summary_fn = kernel.get_function("TextAnalysis", "summarize")
    summary = await kernel.invoke(summary_fn, input=document)
    print(f"Summary:\n{summary}\n")

    # Step 2: Extract actions
    print("Step 2: Extracting action items...")
    actions_fn = kernel.get_function("TextAnalysis", "extract_actions")
    actions = await kernel.invoke(actions_fn, input=document)
    print(f"Actions:\n{actions}\n")

    # Step 3: Sentiment analysis
    print("Step 3: Analyzing sentiment...")
    sentiment_fn = kernel.get_function("TextAnalysis", "analyze_sentiment")
    sentiment = await kernel.invoke(sentiment_fn, input=document)
    print(f"Sentiment: {sentiment}")

    return {"summary": str(summary), "actions": str(actions), "sentiment": str(sentiment)}

# Run the pipeline
document = """
Meeting notes from Q4 planning:
The team agreed to migrate the data pipeline to Azure Data Factory by end of January.
Performance has been excellent this quarter with 99.9% uptime. However, we need to
address the rising costs in the compute cluster. Sarah will investigate spot instances.
Mike will prepare the migration plan document by next Friday.
"""

asyncio.run(multi_step_pipeline(document))
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.AzureOpenAI;
using System.ComponentModel;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

// Initialize Semantic Kernel
var builder = Kernel.CreateBuilder();
builder.AddAzureOpenAIChatCompletion(
    deploymentName: "gpt-4o",
    endpoint: endpoint,
    apiKey: apiKey);

Kernel kernel = builder.Build();

// Define plugin class
public class TextAnalysisPlugin
{
    private readonly Kernel _kernel;
    public TextAnalysisPlugin(Kernel kernel) => _kernel = kernel;

    [KernelFunction("Summarize"), Description("Summarize text into key points")]
    public async Task<string> SummarizeAsync(string input)
    {
        var result = await _kernel.InvokePromptAsync(
            $"Summarize into 3 bullet points:\n\n{input}",
            new KernelArguments(new AzureOpenAIPromptExecutionSettings
            { MaxTokens = 200, Temperature = 0 }));
        return result.ToString();
    }

    [KernelFunction("ExtractActions"), Description("Extract action items from text")]
    public async Task<string> ExtractActionsAsync(string input)
    {
        var result = await _kernel.InvokePromptAsync(
            $"Extract action items as a numbered list:\n\n{input}",
            new KernelArguments(new AzureOpenAIPromptExecutionSettings
            { MaxTokens = 200, Temperature = 0 }));
        return result.ToString();
    }

    [KernelFunction("AnalyzeSentiment"), Description("Analyze text sentiment")]
    public async Task<string> AnalyzeSentimentAsync(string input)
    {
        var result = await _kernel.InvokePromptAsync(
            $"Sentiment (positive/negative/neutral):\n\n{input}",
            new KernelArguments(new AzureOpenAIPromptExecutionSettings
            { MaxTokens = 50, Temperature = 0 }));
        return result.ToString();
    }
}

// Register and execute pipeline
kernel.Plugins.AddFromObject(new TextAnalysisPlugin(kernel), "TextAnalysis");

string document = """
    Meeting notes: Migrate data pipeline to Azure Data Factory by January.
    99.9% uptime achieved. Rising compute costs need attention.
    Sarah investigates spot instances. Mike prepares migration plan by Friday.
    """;

Console.WriteLine("=== Multi-Step Pipeline ===\n");

var summary = await kernel.InvokeAsync("TextAnalysis", "Summarize",
    new KernelArguments { ["input"] = document });
Console.WriteLine($"Summary:\n{summary}\n");

var actions = await kernel.InvokeAsync("TextAnalysis", "ExtractActions",
    new KernelArguments { ["input"] = document });
Console.WriteLine($"Actions:\n{actions}\n");

var sentiment = await kernel.InvokeAsync("TextAnalysis", "AnalyzeSentiment",
    new KernelArguments { ["input"] = document });
Console.WriteLine($"Sentiment: {sentiment}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Multi-step pipeline via sequential REST calls

# Step 1: Summarize
echo "=== Step 1: Summarize ==="
SUMMARY=$(curl -s -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "Summarize into 3 bullet points."},
      {"role": "user", "content": "Meeting notes: Migrate pipeline to ADF by January. 99.9% uptime. Rising compute costs. Sarah investigates spot instances. Mike prepares migration plan by Friday."}
    ],
    "temperature": 0,
    "max_tokens": 200
  }' | jq -r '.choices[0].message.content')
echo "$SUMMARY"

# Step 2: Extract actions from the summary
echo ""
echo "=== Step 2: Extract Actions ==="
curl -s -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d "{
    \"messages\": [
      {\"role\": \"system\", \"content\": \"Extract action items as a numbered list.\"},
      {\"role\": \"user\", \"content\": \"$SUMMARY\"}
    ],
    \"temperature\": 0,
    \"max_tokens\": 200
  }" | jq -r '.choices[0].message.content'

# Step 3: Sentiment
echo ""
echo "=== Step 3: Sentiment ==="
curl -s -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d "{
    \"messages\": [
      {\"role\": \"user\", \"content\": \"Sentiment (positive/negative/neutral): $SUMMARY\"}
    ],
    \"temperature\": 0,
    \"max_tokens\": 10
  }" | jq -r '.choices[0].message.content'
```

</TabItem>
</Tabs>

### Tarefa 4: Implantar Endpoint de Modelo em ContÃªiner

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import subprocess
import requests

# Deploy a containerized Azure AI model for edge/offline scenarios
# This example uses Azure AI containers for text analytics

# Step 1: Pull the container image
# docker pull mcr.microsoft.com/azure-cognitive-services/textanalytics/sentiment:latest

# Step 2: Run locally with configuration
container_config = {
    "image": "mcr.microsoft.com/azure-cognitive-services/textanalytics/sentiment:latest",
    "ports": {"5000/tcp": 5000},
    "environment": {
        "Eula": "accept",
        "Billing": os.environ["AZURE_AI_ENDPOINT"],
        "ApiKey": os.environ["AZURE_AI_KEY"]
    }
}

# Start container (equivalent Docker command shown)
print("Starting container...")
print(f"docker run -d -p 5000:5000 \\")
print(f"  -e Eula=accept \\")
print(f"  -e Billing={os.environ.get('AZURE_AI_ENDPOINT', '<endpoint>')} \\")
print(f"  -e ApiKey={os.environ.get('AZURE_AI_KEY', '<key>')} \\")
print(f"  mcr.microsoft.com/azure-cognitive-services/textanalytics/sentiment:latest")

# Step 3: Call the containerized endpoint
def analyze_sentiment_local(text: str, port: int = 5000) -> dict:
    """Call the local container endpoint."""
    response = requests.post(
        f"http://localhost:{port}/text/analytics/v3.1/sentiment",
        json={
            "documents": [
                {"id": "1", "language": "en", "text": text}
            ]
        }
    )
    return response.json()

# Test the container
# result = analyze_sentiment_local("Azure AI services are excellent and easy to use!")
# print(f"Sentiment: {result['documents'][0]['sentiment']}")

# Step 4: For Azure OpenAI proxy pattern (APIM or custom gateway)
from openai import AzureOpenAI

# Custom base URL pointing to local container or edge gateway
edge_client = AzureOpenAI(
    azure_endpoint="http://localhost:8080",  # Local proxy
    api_key="local-key",
    api_version="2024-10-21"
)

print("\nEdge deployment pattern configured")
print("Container runs independently of cloud connectivity")
print("Billing endpoint required for meter reporting only")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.TextAnalytics;
using System.Net.Http;
using System.Text.Json;

// Connect to containerized Azure AI service (local endpoint)
string containerEndpoint = "http://localhost:5000";
string billingKey = Environment.GetEnvironmentVariable("AZURE_AI_KEY")!;

// TextAnalyticsClient works with containerized endpoints
var client = new TextAnalyticsClient(
    new Uri(containerEndpoint),
    new AzureKeyCredential(billingKey));

// Analyze sentiment via local container
DocumentSentiment sentiment = await client.AnalyzeSentimentAsync(
    "Azure AI containers enable edge deployment scenarios.");

Console.WriteLine($"Sentiment: {sentiment.Sentiment}");
Console.WriteLine($"Positive: {sentiment.ConfidenceScores.Positive:F2}");
Console.WriteLine($"Neutral: {sentiment.ConfidenceScores.Neutral:F2}");
Console.WriteLine($"Negative: {sentiment.ConfidenceScores.Negative:F2}");

// Health check for container
using var httpClient = new HttpClient();
var healthResponse = await httpClient.GetAsync($"{containerEndpoint}/status");
Console.WriteLine($"\nContainer health: {healthResponse.StatusCode}");

// Docker Compose for multi-container deployment
string dockerCompose = """
    version: '3.8'
    services:
      sentiment:
        image: mcr.microsoft.com/azure-cognitive-services/textanalytics/sentiment:latest
        ports:
          - "5000:5000"
        environment:
          - Eula=accept
          - Billing=${AZURE_AI_ENDPOINT}
          - ApiKey=${AZURE_AI_KEY}
      language:
        image: mcr.microsoft.com/azure-cognitive-services/textanalytics/language:latest
        ports:
          - "5001:5000"
        environment:
          - Eula=accept
          - Billing=${AZURE_AI_ENDPOINT}
          - ApiKey=${AZURE_AI_KEY}
    """;

Console.WriteLine($"\nDocker Compose configuration:\n{dockerCompose}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Deploy Azure AI container for edge scenarios

# Step 1: Pull container image
docker pull mcr.microsoft.com/azure-cognitive-services/textanalytics/sentiment:latest

# Step 2: Run container locally
docker run -d --name ai-sentiment \
  -p 5000:5000 \
  -e Eula=accept \
  -e Billing="${AZURE_AI_ENDPOINT}" \
  -e ApiKey="${AZURE_AI_KEY}" \
  mcr.microsoft.com/azure-cognitive-services/textanalytics/sentiment:latest

# Step 3: Wait for container to be ready
echo "Waiting for container..."
until curl -s http://localhost:5000/status | grep -q "ready"; do
  sleep 2
done
echo "Container ready!"

# Step 4: Call local container endpoint
curl -X POST "http://localhost:5000/text/analytics/v3.1/sentiment" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {"id": "1", "language": "en", "text": "Azure AI containers enable offline deployment."}
    ]
  }'

# Step 5: Push to Azure Container Registry for deployment
az acr create --name acrai102challenge20 \
  --resource-group rg-ai102-challenge20 \
  --sku Basic

# Tag and push custom orchestration container
docker tag my-ai-orchestrator:latest acrai102challenge20.azurecr.io/ai-orchestrator:v1
docker push acrai102challenge20.azurecr.io/ai-orchestrator:v1

# Deploy to Azure Container Instances
az container create \
  --resource-group rg-ai102-challenge20 \
  --name ai-orchestrator \
  --image acrai102challenge20.azurecr.io/ai-orchestrator:v1 \
  --cpu 2 --memory 4 \
  --ports 8080 \
  --environment-variables \
    AZURE_OPENAI_ENDPOINT="${AZURE_OPENAI_ENDPOINT}" \
    AZURE_OPENAI_KEY="${AZURE_OPENAI_KEY}"
```

</TabItem>
</Tabs>

## SaÃ­da Esperada

```yaml
Simple: model=gpt-4o-mini, latency=285ms
  Response: Azure is Microsoft's cloud computing platform that provides a wide range of...

Complex: model=gpt-4o, latency=1250ms
  Response: When comparing Azure Functions Consumption and Premium plans, several key trade...

Calling: get_weather({"location": "Seattle", "unit": "celsius"})
Calling: search_documents({"query": "Azure Functions"})

Final answer: The weather in Seattle is currently 18Â°C and partly cloudy. I also found
documentation about Azure Functions in our knowledge base...

=== Multi-Step Analysis Pipeline ===
Step 1: Summarizing...
Summary:
â€¢ Migration to Azure Data Factory planned for end of January
â€¢ Excellent Q4 performance with 99.9% uptime
â€¢ Rising compute costs need investigation (spot instances)

Step 2: Extracting actions...
Actions:
1. Sarah: Investigate spot instances for compute cluster
2. Mike: Prepare migration plan document by next Friday

Step 3: Analyzing sentiment...
Sentiment: positive
```

## Quebra & conserta

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| FunÃ§Ã£o nÃ£o chamada | Modelo responde diretamente sem tool call | DescriÃ§Ã£o da funÃ§Ã£o confusa ou irrelevante | Melhorar descriÃ§Ãµes das funÃ§Ãµes; usar `tool_choice: "required"` |
| Loop infinito de ferramentas | Modelo continua chamando a mesma funÃ§Ã£o | Sem condiÃ§Ã£o de terminaÃ§Ã£o | Limitar rodadas de tool call; adicionar lÃ³gica de "done" |
| Erro no plugin do Semantic Kernel | ExceÃ§Ã£o `FunctionNotFound` | Plugin nÃ£o registrado ou nome de funÃ§Ã£o incorreto | Verificar chamada `add_plugin()` e se o nome da funÃ§Ã£o corresponde |
| ContÃªiner falha ao iniciar | Erro `Eula=accept` ausente | EULA nÃ£o aceito | Definir variÃ¡vel de ambiente `Eula=accept` |
| Erro de billing no contÃªiner | ContÃªiner para apÃ³s 10-15 min | Endpoint de billing inacessÃ­vel | Garantir que a URL de `Billing` estÃ¡ acessÃ­vel; verificar rede |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ch20-q1",
    question: "No function calling do Azure OpenAI, o que o modelo retorna quando decide usar uma ferramenta?",
    options: [
      "O resultado real da funÃ§Ã£o",
      "Um array tool_calls com o nome da funÃ§Ã£o e argumentos a executar",
      "Uma URL de redirecionamento para o endpoint da funÃ§Ã£o",
      "Um erro indicando que execuÃ§Ã£o manual Ã© necessÃ¡ria"
    ],
    correctAnswer: 1,
    explanation: "Quando o modelo decide usar uma ferramenta, ele retorna uma mensagem com finish_reason='tool_calls' contendo um array tool_calls. Cada entrada inclui o nome da funÃ§Ã£o e argumentos serializados. A aplicaÃ§Ã£o deve executar a funÃ§Ã£o e enviar os resultados de volta em uma requisiÃ§Ã£o subsequente."
  },
  {
    id: "ch20-q2",
    question: "Qual Ã© a principal vantagem de usar um roteador de modelos em arquiteturas multi-modelo?",
    options: [
      "Otimiza tradeoffs de custo-qualidade combinando complexidade da tarefa com capacidade do modelo",
      "Aumenta a precisÃ£o de todas as respostas",
      "Elimina a necessidade de rate limiting",
      "Fornece failover automÃ¡tico entre regiÃµes"
    ],
    correctAnswer: 0,
    explanation: "Um roteador de modelos direciona requisiÃ§Ãµes simples para modelos mais baratos e rÃ¡pidos (como GPT-4o-mini) e requisiÃ§Ãµes complexas para modelos mais capazes (como GPT-4o). Isso otimiza custos sem sacrificar qualidade onde ela importa, jÃ¡ que tarefas simples nÃ£o se beneficiam de modelos caros."
  },
  {
    id: "ch20-q3",
    question: "Qual variÃ¡vel de ambiente Ã© necessÃ¡ria para que os contÃªineres Azure AI funcionem corretamente?",
    options: [
      "Apenas AZURE_OPENAI_ENDPOINT",
      "ConnectionString e ContainerName",
      "Eula=accept, Billing (URL do endpoint) e ApiKey",
      "AZURE_TENANT_ID e AZURE_CLIENT_ID"
    ],
    correctAnswer: 2,
    explanation: "Os contÃªineres Azure AI requerem trÃªs variÃ¡veis de ambiente: Eula=accept (acordo legal), Billing (a URL do endpoint Azure AI para mediÃ§Ã£o de uso) e ApiKey (autenticaÃ§Ã£o). O contÃªiner envia dados de uso para o endpoint de billing, mas processa requisiÃ§Ãµes localmente."
  },
  {
    id: "ch20-q4",
    question: "No Semantic Kernel, o que Ã© um 'plugin'?",
    options: [
      "Um checkpoint de modelo prÃ©-treinado",
      "Um componente de middleware de logging",
      "Uma configuraÃ§Ã£o de conexÃ£o com banco de dados",
      "Uma coleÃ§Ã£o de funÃ§Ãµes (nativas ou baseadas em prompt) que estendem as capacidades do kernel"
    ],
    correctAnswer: 3,
    explanation: "No Semantic Kernel, um plugin Ã© uma coleÃ§Ã£o de funÃ§Ãµes do kernel (seja funÃ§Ãµes de cÃ³digo nativo ou funÃ§Ãµes semÃ¢nticas baseadas em prompt) que estendem o que a IA pode fazer. Plugins sÃ£o registrados no kernel e podem ser invocados pelo modelo via function calling ou diretamente pelo cÃ³digo da aplicaÃ§Ã£o."
  },
  {
    id: "ch20-q5",
    question: "Ao implementar function calling, o que acontece depois que a aplicaÃ§Ã£o executa a funÃ§Ã£o e retorna os resultados?",
    options: [
      "O resultado da funÃ§Ã£o Ã© adicionado como mensagem de tool e uma nova requisiÃ§Ã£o de completion Ã© feita",
      "A conversa termina e o resultado Ã© retornado diretamente ao usuÃ¡rio",
      "O modelo automaticamente retreina com os novos dados",
      "O resultado da funÃ§Ã£o Ã© armazenado em cache apenas para chamadas futuras"
    ],
    correctAnswer: 0,
    explanation: "ApÃ³s executar a funÃ§Ã£o, a aplicaÃ§Ã£o adiciona o resultado como uma mensagem 'tool' (com tool_call_id correspondente) e faz outra requisiÃ§Ã£o de chat completion. O modelo entÃ£o gera uma resposta em linguagem natural incorporando os resultados da ferramenta, que pode incluir chamadas adicionais de ferramentas se necessÃ¡rio."
  }
]} />

## Limpeza

```bash
# Stop and remove containers
docker stop ai-sentiment && docker rm ai-sentiment

# Delete Azure resources
az group delete --name rg-ai102-challenge20 --yes --no-wait
```

## Saiba Mais
- [Function calling com Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/how-to/function-calling)
- [DocumentaÃ§Ã£o do Semantic Kernel](https://learn.microsoft.com/semantic-kernel/overview/)
- [ContÃªineres Azure AI](https://learn.microsoft.com/azure/ai-services/cognitive-services-container-support)
- [PadrÃµes de orquestraÃ§Ã£o multi-modelo](https://learn.microsoft.com/azure/ai-services/openai/concepts/models)
- [Plugins do Semantic Kernel](https://learn.microsoft.com/semantic-kernel/concepts/plugins/)
