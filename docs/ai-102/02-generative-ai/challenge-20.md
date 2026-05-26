---
sidebar_position: 11
title: "Challenge 20: Multi-Model Orchestration"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 20: Multi-Model Orchestration

:::info Estimated Time
**45-60 min** | **Cost**: ~$3.00 (estimated) | **Domain**: Generative AI Solutions (15-20%)
:::

## Exam skills covered
- Implement orchestration of multiple generative AI models
- Deploy models in containers for edge scenarios
- Implement function calling for tool use

## Overview

Production AI systems rarely rely on a single model. **Multi-model orchestration** routes requests to different models based on task complexity, cost constraints, or capability requirements. For example, a router might send simple classification tasks to GPT-4o-mini (fast, cheap) while directing complex reasoning to GPT-4o (slower, more capable). This pattern optimizes the cost-quality tradeoff across an application portfolio.

**Semantic Kernel** is Microsoft's open-source orchestration SDK that provides abstractions for AI services, plugins (functions the model can call), and planners that decompose complex tasks into steps. It supports both Python and C#, integrating natively with Azure OpenAI. Function calling (tool use) enables models to invoke external tools—APIs, databases, or custom code—by describing available functions and letting the model decide when and how to call them.

For edge deployment scenarios, Azure AI containers package models for offline or low-latency operation. Containerized models run independently of cloud connectivity, suitable for manufacturing floors, vehicles, or restricted networks where cloud access is limited or prohibited.

## Architecture

This challenge implements a model router, configures function calling with tools, builds a multi-step orchestration pipeline, and deploys a containerized model endpoint.

![Challenge 20 topology](/img/ai-102/challenge-20-topology.svg)

## Prerequisites
- Azure OpenAI resource with both GPT-4o and GPT-4o-mini deployed
- Python 3.9+ with `openai`, `semantic-kernel` packages
- .NET 8 SDK with `Azure.AI.OpenAI`, `Microsoft.SemanticKernel` NuGet packages
- Docker Desktop (for container deployment task)
- Azure Container Registry (optional, for push)

## Implementation

### Task 1: Implement Model Router (Complexity-Based)

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

# Simple request → routes to GPT-4o-mini
result1 = router.route(
    [{"role": "user", "content": "What is Azure?"}],
    max_tokens=100
)
print(f"Simple: model={result1['model_used']}, "
      f"latency={result1['latency_ms']:.0f}ms")
print(f"  Response: {result1['response'].choices[0].message.content[:80]}...\n")

# Complex request → routes to GPT-4o
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
# Simple request → route to gpt-4o-mini
echo "=== Simple Request (gpt-4o-mini) ==="
time curl -s -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{"role": "user", "content": "What is Azure?"}],
    "max_tokens": 100
  }' | jq -r '.choices[0].message.content'

# Complex request → route to gpt-4o
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

### Task 2: Implement Function Calling (Tool Use)

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

### Task 3: Build Multi-Step Pipeline with Semantic Kernel

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

### Task 4: Deploy Containerized Model Endpoint

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

## Expected Output

```yaml
Simple: model=gpt-4o-mini, latency=285ms
  Response: Azure is Microsoft's cloud computing platform that provides a wide range of...

Complex: model=gpt-4o, latency=1250ms
  Response: When comparing Azure Functions Consumption and Premium plans, several key trade...

Calling: get_weather({"location": "Seattle", "unit": "celsius"})
Calling: search_documents({"query": "Azure Functions"})

Final answer: The weather in Seattle is currently 18°C and partly cloudy. I also found
documentation about Azure Functions in our knowledge base...

=== Multi-Step Analysis Pipeline ===
Step 1: Summarizing...
Summary:
• Migration to Azure Data Factory planned for end of January
• Excellent Q4 performance with 99.9% uptime
• Rising compute costs need investigation (spot instances)

Step 2: Extracting actions...
Actions:
1. Sarah: Investigate spot instances for compute cluster
2. Mike: Prepare migration plan document by next Friday

Step 3: Analyzing sentiment...
Sentiment: positive
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|-----------|-----|
| Function not called | Model responds directly without tool call | Function description unclear or not relevant | Improve function descriptions; use `tool_choice: "required"` |
| Infinite tool loop | Model keeps calling same function | No termination condition | Limit tool call rounds; add "done" logic |
| Semantic Kernel plugin error | `FunctionNotFound` exception | Plugin not registered or wrong function name | Verify `add_plugin()` call and function name matches |
| Container fails to start | `Eula=accept` missing error | EULA not accepted | Set `Eula=accept` environment variable |
| Container billing error | Container stops after 10-15 min | Billing endpoint unreachable | Ensure `Billing` URL is accessible; check network |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ch20-q1",
    question: "In Azure OpenAI function calling, what does the model return when it decides to use a tool?",
    options: [
      "The actual function result",
      "A tool_calls array with function name and arguments to execute",
      "A redirect URL to the function endpoint",
      "An error indicating manual execution is required"
    ],
    correctAnswer: 1,
    explanation: "When the model decides to use a tool, it returns a message with finish_reason='tool_calls' containing a tool_calls array. Each entry includes the function name and serialized arguments. The application must execute the function and send results back in a follow-up request."
  },
  {
    id: "ch20-q2",
    question: "What is the primary advantage of using a model router in multi-model architectures?",
    options: [
      "It optimizes cost-quality tradeoffs by matching task complexity to model capability",
      "It increases the accuracy of all responses",
      "It eliminates the need for rate limiting",
      "It provides automatic failover between regions"
    ],
    correctAnswer: 0,
    explanation: "A model router directs simple requests to cheaper, faster models (like GPT-4o-mini) and complex requests to more capable models (like GPT-4o). This optimizes costs without sacrificing quality where it matters, as simple tasks don't benefit from expensive models."
  },
  {
    id: "ch20-q3",
    question: "Which environment variable is required for Azure AI containers to function correctly?",
    options: [
      "AZURE_OPENAI_ENDPOINT only",
      "ConnectionString and ContainerName",
      "Eula=accept, Billing (endpoint URL), and ApiKey",
      "AZURE_TENANT_ID and AZURE_CLIENT_ID"
    ],
    correctAnswer: 2,
    explanation: "Azure AI containers require three environment variables: Eula=accept (legal agreement), Billing (the Azure AI endpoint URL for usage metering), and ApiKey (authentication). The container sends usage data to the billing endpoint but processes requests locally."
  },
  {
    id: "ch20-q4",
    question: "In Semantic Kernel, what is a 'plugin'?",
    options: [
      "A pre-trained model checkpoint",
      "A logging middleware component",
      "A database connection configuration",
      "A collection of functions (native or prompt-based) that extend the kernel's capabilities"
    ],
    correctAnswer: 3,
    explanation: "In Semantic Kernel, a plugin is a collection of kernel functions (either native code functions or prompt-based semantic functions) that extend what the AI can do. Plugins are registered with the kernel and can be invoked by the model via function calling or directly by application code."
  },
  {
    id: "ch20-q5",
    question: "When implementing function calling, what happens after the application executes the function and returns results?",
    options: [
      "The function result is added as a tool message and a new completion request is made",
      "The conversation ends and the result is returned directly to the user",
      "The model automatically retrains with the new data",
      "The function result is cached for future calls only"
    ],
    correctAnswer: 0,
    explanation: "After executing the function, the application adds the result as a 'tool' message (with matching tool_call_id) and makes another chat completion request. The model then generates a natural language response incorporating the tool results, which may include additional tool calls if needed."
  }
]} />

## Cleanup

```bash
# Stop and remove containers
docker stop ai-sentiment && docker rm ai-sentiment

# Delete Azure resources
az group delete --name rg-ai102-challenge20 --yes --no-wait
```

## Learn More
- [Function calling with Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/how-to/function-calling)
- [Semantic Kernel documentation](https://learn.microsoft.com/semantic-kernel/overview/)
- [Azure AI containers](https://learn.microsoft.com/azure/ai-services/cognitive-services-container-support)
- [Multi-model orchestration patterns](https://learn.microsoft.com/azure/ai-services/openai/concepts/models)
- [Semantic Kernel plugins](https://learn.microsoft.com/semantic-kernel/concepts/plugins/)
