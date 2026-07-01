---
sidebar_position: 2
title: "Desafio 21: Fundamentos e Arquitetura de Agentes"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 21: Fundamentos e Arquitetura de Agentes

:::info Tempo Estimado
**45-60 min** | **Custo**: $2-5 (estimado) | **Domínio**: IA Generativa e Soluções Agênticas (35-40%)
:::

## Habilidades do exame cobertas
- Entender o papel e casos de uso de um agente de IA
- Configurar recursos necessários para soluções de agentes
- Implementar function calling com Azure OpenAI

## Visão Geral

Agentes de IA vão além de chatbots simples ao combinar raciocínio de LLM com a capacidade de **tomar ações**. Enquanto um chatbot responde perguntas a partir de seus dados de treinamento, um agente pode chamar ferramentas externas, executar código, consultar bancos de dados e orquestrar workflows de múltiplas etapas de forma autônoma.

Conceitos-chave:
- **Tool/Function calling**: O modelo decide quais funções invocar com base na intenção do usuário
- **Planejamento**: Dividir tarefas complexas em etapas sequenciais
- **Memória**: Manter contexto de conversação e estado entre interações
- **Grounding**: Conectar o modelo a fontes de dados em tempo real

Este desafio implementa function calling com Azure OpenAI — a base de todas as arquiteturas de agentes.

## Arquitetura

```text
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

## Pré-requisitos
- Assinatura Azure com acesso ao Azure OpenAI
- Recurso Azure OpenAI com GPT-4o implantado
- Python 3.9+ ou .NET 8
- Pacotes: `openai>=1.0.0` (Python) ou `Azure.AI.OpenAI` (C#)

## Implementação

### Tarefa 1: Implantar Recurso e Modelo Azure OpenAI

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

### Tarefa 2: Implementar Function Calling

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

### Tarefa 3: Implementar Function Calling Paralelo

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

## Saída Esperada

```text
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

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| `tool_call_id` ausente na resposta | `400 Bad Request` | Mensagem de resposta da ferramenta deve incluir o `tool_call_id` correspondente | Garanta que cada resposta de ferramenta referencia o `tool_call.id` correto |
| Função retorna não-string | `TypeError` | O `content` da mensagem de ferramenta deve ser uma string JSON | Sempre use `json.dumps()` no valor de retorno da função |
| Loop infinito | Agente continua chamando ferramentas | Sem condição de saída ou ferramenta retorna erro | Adicione contagem máxima de iterações; valide respostas das ferramentas |
| `tool_choice: "required"` | Modelo sempre chama uma ferramenta mesmo quando desnecessário | Forçando uso de ferramenta | Use `"auto"` para deixar o modelo decidir; use `"required"` apenas para uso garantido de ferramenta |
| Incompatibilidade de schema | Modelo gera tipos de argumento errados | Schema de parâmetros da função muito vago | Adicione descriptions, enums e exemplos ao schema de parâmetros |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a principal diferença entre um agente de IA e um chatbot?",
    options: [
      "Agentes usam GPT-4 enquanto chatbots usam GPT-3.5",
      "Agentes podem tomar ações chamando ferramentas externas; chatbots apenas geram respostas de texto",
      "Agentes requerem Azure OpenAI enquanto chatbots funcionam com qualquer LLM",
      "Agentes mantêm histórico de conversação enquanto chatbots são stateless"
    ],
    correctAnswer: 1,
    explanation: "A característica definidora de um agente de IA é sua capacidade de tomar ações através de tool/function calling, executar código e interagir com sistemas externos — não apenas gerar respostas de texto."
  },
  {
    question: "No function calling do Azure OpenAI, o que acontece quando tool_choice é definido como 'auto'?",
    options: [
      "O modelo sempre chama pelo menos uma função",
      "O modelo seleciona aleatoriamente uma função para chamar",
      "O modelo decide se deve chamar uma função ou responder diretamente com base na mensagem do usuário",
      "O modelo chama todas as funções definidas em paralelo"
    ],
    correctAnswer: 2,
    explanation: "Com tool_choice='auto', o modelo analisa a intenção do usuário e decide se uma chamada de ferramenta é necessária ou se pode responder diretamente a partir de seus dados de treinamento."
  },
  {
    question: "Quando o modelo retorna tool_calls na resposta, o que você deve incluir na mensagem de ferramenta subsequente?",
    options: [
      "O tool_call_id e o resultado da função como uma string JSON",
      "O nome da função e um novo system prompt",
      "Apenas o resultado da função — o modelo rastreia a chamada internamente",
      "A mensagem original do usuário e o resultado da função"
    ],
    correctAnswer: 0,
    explanation: "Cada mensagem de resposta de ferramenta deve incluir o tool_call_id (correspondendo à chamada específica) e o resultado da função serializado como uma string JSON no campo content."
  },
  {
    question: "Como o Azure OpenAI lida com múltiplas chamadas de ferramenta em uma única resposta?",
    options: [
      "Não é suportado — apenas uma ferramenta pode ser chamada por turno",
      "Você deve habilitar parallel_tool_calls=true na requisição",
      "Múltiplas ferramentas são chamadas sequencialmente com respostas intermediárias",
      "O modelo retorna múltiplos tool_calls na mesma resposta; você executa todos e retorna todos os resultados antes da próxima completion"
    ],
    correctAnswer: 3,
    explanation: "O modelo pode retornar múltiplos tool_calls em uma única resposta (function calling paralelo). Você executa todos eles e retorna todos os resultados em mensagens de ferramenta separadas antes de solicitar a próxima completion."
  },
  {
    question: "Qual é o formato correto para definir parâmetros de função no array de tools?",
    options: [
      "Uma definição de interface TypeScript",
      "Um objeto JSON Schema com campos type, properties e required",
      "Uma string de type hints Python",
      "Um fragmento de especificação OpenAPI"
    ],
    correctAnswer: 1,
    explanation: "Parâmetros de função são definidos usando o formato JSON Schema com 'type': 'object', 'properties' definindo cada parâmetro, e 'required' listando parâmetros obrigatórios."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-agents --yes --no-wait
```

## Saiba Mais

- [Function calling do Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/how-to/function-calling)
- [Visão geral de agentes de IA](https://learn.microsoft.com/azure/ai-services/agents/overview)
- [Referência da API de Chat Completions](https://learn.microsoft.com/azure/ai-services/openai/reference)
