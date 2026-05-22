---
sidebar_position: 2
title: "Challenge 21: Agent Fundamentals and Architecture"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 21: Agent Fundamentals and Architecture

:::info Estimated Time
**45-60 min** | **Cost**: $2-5 (estimated) | **Domain**: Implement Agentic Solutions (5-10%)
:::

## Exam skills covered
- Understand role and use cases of an AI agent
- Configure necessary resources for agent solutions
- Implement function calling with Azure OpenAI

## Overview

AI agents extend beyond simple chatbots by combining LLM reasoning with the ability to **take actions**. While a chatbot answers questions from its training data, an agent can call external tools, execute code, query databases, and orchestrate multi-step workflows autonomously.

Key concepts:
- **Tool/Function calling**: The model decides which functions to invoke based on user intent
- **Planning**: Breaking complex tasks into sequential steps
- **Memory**: Maintaining conversation context and state across interactions
- **Grounding**: Connecting the model to real-time data sources

This challenge implements function calling with Azure OpenAI — the foundation of all agent architectures.

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   User       │────▶│  Azure OpenAI    │────▶│  Tool Execution  │
│   Prompt     │◀────│  (GPT-4o)        │◀────│  (Functions)     │
└──────────────┘     └──────────────────┘     └──────────────────┘
                           │                         │
                           │  1. Analyze intent       │
                           │  2. Select tool          │
                           │  3. Generate arguments   │
                           │                         │
                           │         4. Execute ──────┘
                           │         5. Return result
                           │  6. Synthesize response
```

## Prerequisites
- Azure subscription with Azure OpenAI access
- Azure OpenAI resource with GPT-4o deployed
- Python 3.9+ or .NET 8
- Packages: `openai>=1.0.0` (Python) or `Azure.AI.OpenAI` (C#)

## Implementation

### Task 1: Deploy Azure OpenAI Resource and Model

```bash
# Create resource group
az group create --name rg-ai102-agents --location eastus2

# Create Azure OpenAI resource
az cognitiveservices account create \
  --name aoai-ai102-agents \
  --resource-group rg-ai102-agents \
  --kind OpenAI \
  --sku S0 \
  --location eastus2

# Deploy GPT-4o model
az cognitiveservices account deployment create \
  --name aoai-ai102-agents \
  --resource-group rg-ai102-agents \
  --deployment-name gpt-4o \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard

# Get endpoint and key
az cognitiveservices account show \
  --name aoai-ai102-agents \
  --resource-group rg-ai102-agents \
  --query properties.endpoint -o tsv

az cognitiveservices account keys list \
  --name aoai-ai102-agents \
  --resource-group rg-ai102-agents \
  --query key1 -o tsv
```

### Task 2: Implement Function Calling

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

# Define tools the agent can use
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather for a given location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name, e.g. 'Seattle, WA'"
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
            "name": "search_products",
            "description": "Search for products in the catalog by name or category",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query for products"
                    },
                    "category": {
                        "type": "string",
                        "enum": ["electronics", "clothing", "home", "sports"],
                        "description": "Product category filter"
                    },
                    "max_price": {
                        "type": "number",
                        "description": "Maximum price filter"
                    }
                },
                "required": ["query"]
            }
        }
    }
]

# Simulated tool implementations
def get_weather(location: str, unit: str = "celsius") -> dict:
    """Simulated weather API call"""
    return {
        "location": location,
        "temperature": 22 if unit == "celsius" else 72,
        "unit": unit,
        "condition": "Partly cloudy",
        "humidity": 65
    }

def search_products(query: str, category: str = None, max_price: float = None) -> dict:
    """Simulated product search"""
    results = [
        {"name": f"{query} Pro", "price": 299.99, "category": category or "electronics"},
        {"name": f"{query} Basic", "price": 149.99, "category": category or "electronics"}
    ]
    if max_price:
        results = [r for r in results if r["price"] <= max_price]
    return {"results": results, "total": len(results)}

# Map function names to implementations
available_functions = {
    "get_weather": get_weather,
    "search_products": search_products
}

def run_agent(user_message: str):
    """Run the agent loop with function calling"""
    messages = [
        {"role": "system", "content": "You are a helpful assistant with access to weather and product search tools."},
        {"role": "user", "content": user_message}
    ]

    # First call - model decides whether to use tools
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=tools,
        tool_choice="auto"
    )

    response_message = response.choices[0].message

    # Check if the model wants to call functions
    if response_message.tool_calls:
        messages.append(response_message)

        # Execute each tool call
        for tool_call in response_message.tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)

            print(f"  [Agent] Calling: {function_name}({function_args})")

            # Execute the function
            function_response = available_functions[function_name](**function_args)

            # Add the function result to messages
            messages.append({
                "tool_call_id": tool_call.id,
                "role": "tool",
                "name": function_name,
                "content": json.dumps(function_response)
            })

        # Second call - model synthesizes final response
        final_response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages
        )
        return final_response.choices[0].message.content
    else:
        return response_message.content

# Test the agent
print("=" * 60)
print("Test 1: Weather query (should trigger get_weather)")
print("=" * 60)
result = run_agent("What's the weather like in Seattle?")
print(f"Agent: {result}\n")

print("=" * 60)
print("Test 2: Product search (should trigger search_products)")
print("=" * 60)
result = run_agent("Find me headphones under $200")
print(f"Agent: {result}\n")

print("=" * 60)
print("Test 3: No tool needed (general knowledge)")
print("=" * 60)
result = run_agent("What is the capital of France?")
print(f"Agent: {result}\n")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using System;
using System.Collections.Generic;
using System.Text.Json;
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;

var endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT");
var key = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY");

var client = new AzureOpenAIClient(
    new Uri(endpoint),
    new AzureKeyCredential(key));

var chatClient = client.GetChatClient("gpt-4o");

// Define tools
ChatTool getWeatherTool = ChatTool.CreateFunctionTool(
    functionName: "get_weather",
    functionDescription: "Get the current weather for a given location",
    functionParameters: BinaryData.FromString("""
    {
        "type": "object",
        "properties": {
            "location": { "type": "string", "description": "City name, e.g. 'Seattle, WA'" },
            "unit": { "type": "string", "enum": ["celsius", "fahrenheit"] }
        },
        "required": ["location"]
    }
    """)
);

ChatTool searchProductsTool = ChatTool.CreateFunctionTool(
    functionName: "search_products",
    functionDescription: "Search for products in the catalog",
    functionParameters: BinaryData.FromString("""
    {
        "type": "object",
        "properties": {
            "query": { "type": "string", "description": "Search query" },
            "category": { "type": "string", "enum": ["electronics", "clothing", "home", "sports"] },
            "max_price": { "type": "number", "description": "Max price filter" }
        },
        "required": ["query"]
    }
    """)
);

// Simulated function implementations
string ExecuteFunction(string name, string arguments)
{
    var args = JsonDocument.Parse(arguments).RootElement;

    return name switch
    {
        "get_weather" => JsonSerializer.Serialize(new
        {
            location = args.GetProperty("location").GetString(),
            temperature = 22,
            unit = "celsius",
            condition = "Partly cloudy"
        }),
        "search_products" => JsonSerializer.Serialize(new
        {
            results = new[] {
                new { name = $"{args.GetProperty("query").GetString()} Pro", price = 299.99 },
                new { name = $"{args.GetProperty("query").GetString()} Basic", price = 149.99 }
            }
        }),
        _ => "{\"error\": \"Unknown function\"}"
    };
}

// Run agent
var messages = new List<ChatMessage>
{
    new SystemChatMessage("You are a helpful assistant with weather and product search tools."),
    new UserChatMessage("What's the weather in Seattle and find me headphones under $200?")
};

var options = new ChatCompletionOptions
{
    Tools = { getWeatherTool, searchProductsTool }
};

// Agent loop
bool requiresAction = true;
while (requiresAction)
{
    ChatCompletion completion = chatClient.CompleteChat(messages, options);

    if (completion.FinishReason == ChatFinishReason.ToolCalls)
    {
        messages.Add(new AssistantChatMessage(completion));

        foreach (var toolCall in completion.ToolCalls)
        {
            Console.WriteLine($"  [Agent] Calling: {toolCall.FunctionName}({toolCall.FunctionArguments})");
            string result = ExecuteFunction(toolCall.FunctionName, toolCall.FunctionArguments.ToString());
            messages.Add(new ToolChatMessage(toolCall.Id, result));
        }
    }
    else
    {
        Console.WriteLine($"Agent: {completion.Content[0].Text}");
        requiresAction = false;
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="https://<your-resource>.openai.azure.com"
API_KEY="<your-key>"
DEPLOYMENT="gpt-4o"

# Step 1: Send message with tools defined
curl -s "${ENDPOINT}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${API_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
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
  }' | jq .

# Response will contain tool_calls if model decides to use the function
# Then send the function result back:

curl -s "${ENDPOINT}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${API_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is the weather in Seattle?"},
      {"role": "assistant", "content": null, "tool_calls": [{"id": "call_abc123", "type": "function", "function": {"name": "get_weather", "arguments": "{\"location\": \"Seattle, WA\", \"unit\": \"celsius\"}"}}]},
      {"role": "tool", "tool_call_id": "call_abc123", "content": "{\"location\": \"Seattle, WA\", \"temperature\": 22, \"unit\": \"celsius\", \"condition\": \"Partly cloudy\"}"}
    ]
  }' | jq .choices[0].message.content
```

</TabItem>
</Tabs>

### Task 3: Implement Parallel Function Calling

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# The model can call multiple tools in parallel when appropriate
# Test with a query that requires both tools

result = run_agent(
    "I'm planning a trip to Miami. What's the weather there? "
    "Also, find me some sunglasses under $100."
)
print(f"Agent (parallel calls): {result}")

# Verify parallel execution by checking tool_calls count
messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What's the weather in NYC and LA simultaneously?"}
]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)

if response.choices[0].message.tool_calls:
    num_calls = len(response.choices[0].message.tool_calls)
    print(f"\nParallel tool calls made: {num_calls}")
    for tc in response.choices[0].message.tool_calls:
        print(f"  - {tc.function.name}({tc.function.arguments})")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// Test parallel function calling
var parallelMessages = new List<ChatMessage>
{
    new SystemChatMessage("You are a helpful assistant."),
    new UserChatMessage("What's the weather in NYC and LA at the same time?")
};

ChatCompletion parallelCompletion = chatClient.CompleteChat(parallelMessages, options);

if (parallelCompletion.FinishReason == ChatFinishReason.ToolCalls)
{
    Console.WriteLine($"Parallel tool calls: {parallelCompletion.ToolCalls.Count}");
    foreach (var toolCall in parallelCompletion.ToolCalls)
    {
        Console.WriteLine($"  - {toolCall.FunctionName}({toolCall.FunctionArguments})");
    }
}
```

</TabItem>
</Tabs>

## Expected Output

```
============================================================
Test 1: Weather query (should trigger get_weather)
============================================================
  [Agent] Calling: get_weather({"location": "Seattle, WA", "unit": "celsius"})
Agent: The current weather in Seattle is 22°C and partly cloudy with 65% humidity.

============================================================
Test 2: Product search (should trigger search_products)
============================================================
  [Agent] Calling: search_products({"query": "headphones", "max_price": 200})
Agent: I found 2 headphones under $200:
  - Headphones Basic: $149.99

============================================================
Test 3: No tool needed (general knowledge)
============================================================
Agent: The capital of France is Paris.

Parallel tool calls made: 2
  - get_weather({"location": "New York, NY"})
  - get_weather({"location": "Los Angeles, CA"})
```

## Break and Fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Missing `tool_call_id` in response | `400 Bad Request` | Tool response message must include the matching `tool_call_id` | Ensure each tool response references the correct `tool_call.id` |
| Function returns non-string | `TypeError` | Tool message `content` must be a JSON string | Always `json.dumps()` the function return value |
| Infinite loop | Agent keeps calling tools | No exit condition or tool returns error | Add max iteration count; validate tool responses |
| `tool_choice: "required"` | Model always calls a tool even when unnecessary | Forcing tool usage | Use `"auto"` to let model decide; use `"required"` only for guaranteed tool use |
| Schema mismatch | Model generates wrong argument types | Function parameters schema is too vague | Add descriptions, enums, and examples to parameter schema |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What is the primary difference between an AI agent and a chatbot?",
    options: [
      "Agents use GPT-4 while chatbots use GPT-3.5",
      "Agents can take actions by calling external tools; chatbots only generate text responses",
      "Agents require Azure OpenAI while chatbots work with any LLM",
      "Agents maintain conversation history while chatbots are stateless"
    ],
    correctAnswer: 1,
    explanation: "The defining feature of an AI agent is its ability to take actions through tool/function calling, execute code, and interact with external systems — not just generate text responses."
  },
  {
    question: "In Azure OpenAI function calling, what happens when tool_choice is set to 'auto'?",
    options: [
      "The model always calls at least one function",
      "The model randomly selects a function to call",
      "The model decides whether to call a function or respond directly based on the user's message",
      "The model calls all defined functions in parallel"
    ],
    correctAnswer: 2,
    explanation: "With tool_choice='auto', the model analyzes the user's intent and decides whether a tool call is needed or if it can respond directly from its training data."
  },
  {
    question: "When the model returns tool_calls in the response, what must you include in the follow-up tool message?",
    options: [
      "The function name and a new system prompt",
      "The tool_call_id and the function result as a JSON string",
      "Only the function result — the model tracks the call internally",
      "The original user message and the function result"
    ],
    correctAnswer: 1,
    explanation: "Each tool response message must include the tool_call_id (matching the specific call) and the function result serialized as a JSON string in the content field."
  },
  {
    question: "How does Azure OpenAI handle multiple tool calls in a single response?",
    options: [
      "It is not supported — only one tool can be called per turn",
      "The model returns multiple tool_calls in the same response; you execute all and return all results before the next completion",
      "You must enable parallel_tool_calls=true in the request",
      "Multiple tools are called sequentially with intermediate responses"
    ],
    correctAnswer: 1,
    explanation: "The model can return multiple tool_calls in a single response (parallel function calling). You execute all of them and return all results in separate tool messages before requesting the next completion."
  },
  {
    question: "What is the correct format for defining function parameters in the tools array?",
    options: [
      "A TypeScript interface definition",
      "A JSON Schema object with type, properties, and required fields",
      "A Python type hint string",
      "An OpenAPI specification fragment"
    ],
    correctAnswer: 1,
    explanation: "Function parameters are defined using JSON Schema format with 'type': 'object', 'properties' defining each parameter, and 'required' listing mandatory parameters."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-agents --yes --no-wait
```

## Learn More

- [Azure OpenAI function calling](https://learn.microsoft.com/azure/ai-services/openai/how-to/function-calling)
- [AI agents overview](https://learn.microsoft.com/azure/ai-services/agents/overview)
- [Chat completions API reference](https://learn.microsoft.com/azure/ai-services/openai/reference)
