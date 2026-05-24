---
sidebar_position: 8
title: "Desafio 17: Engenharia de Prompts e Templates"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 17: Engenharia de Prompts e Templates

:::info Tempo Estimado
**45-60 min** | **Custo**: ~$0,50 (estimado) | **DomÃ­nio**: SoluÃ§Ãµes de IA Generativa (15-20%)
:::

## Habilidades do exame cobertas
- Enviar prompts para modelos de IA generativa
- Utilizar templates de prompt
- Aplicar tÃ©cnicas de engenharia de prompt para resultados otimizados

## VisÃ£o Geral

Engenharia de prompt Ã© a prÃ¡tica de projetar e otimizar entradas para modelos de linguagem para obter as saÃ­das desejadas. A API de chat completions do Azure OpenAI usa um formato de mensagem estruturado com trÃªs papÃ©is: **system** (define o comportamento e as restriÃ§Ãµes), **user** (fornece a solicitaÃ§Ã£o) e **assistant** (modela respostas anteriores para contexto). Entender como configurar essas mensagens de forma eficaz Ã© fundamental para construir aplicaÃ§Ãµes de IA confiÃ¡veis.

ParÃ¢metros-chave controlam a geraÃ§Ã£o de resposta: **temperature** (0-2, controla a aleatoriedade), **top_p** (limiar de amostragem por nÃºcleo), **max_tokens** (limite de comprimento da saÃ­da), **frequency_penalty** (-2 a 2, reduz repetiÃ§Ã£o) e **presence_penalty** (-2 a 2, incentiva diversidade de tÃ³picos). Esses parÃ¢metros interagem entre si â€” por exemplo, temperature e top_p ambos afetam a aleatoriedade, entÃ£o a Microsoft recomenda ajustar um de cada vez.

TÃ©cnicas avanÃ§adas incluem **few-shot prompting** (fornecer exemplos no prompt), **chain-of-thought** (solicitar raciocÃ­nio passo a passo) e **structured outputs** (usar modo JSON ou response_format para garantir saÃ­da parseÃ¡vel). Templates de prompt permitem padrÃµes reutilizÃ¡veis com substituiÃ§Ã£o de variÃ¡veis, possibilitando comportamento consistente em diferentes cenÃ¡rios de aplicaÃ§Ã£o.

## Arquitetura

Este desafio explora a construÃ§Ã£o de prompts, ajuste de parÃ¢metros e abordagens baseadas em templates para construir interaÃ§Ãµes de IA generativa consistentes e confiÃ¡veis.

![Topologia do Desafio 17](/img/ai-102/challenge-17-topology.svg)

## PrÃ©-requisitos
- Recurso Azure OpenAI com GPT-4o implantado (do Desafio 16)
- Python 3.9+ com pacote `openai` instalado
- .NET 8 SDK com pacote NuGet `Azure.AI.OpenAI`
- VariÃ¡veis de ambiente `AZURE_OPENAI_ENDPOINT` e `AZURE_OPENAI_KEY` configuradas

## ImplementaÃ§Ã£o

### Tarefa 1: Configurar System Prompts e PapÃ©is de Mensagem

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

# System message defines the assistant's behavior and constraints
messages = [
    {
        "role": "system",
        "content": (
            "You are a technical documentation assistant for Azure services. "
            "Always respond with accurate, concise technical information. "
            "Format responses using markdown. "
            "If you are unsure about something, say so rather than guessing. "
            "Do not provide information about non-Azure cloud services."
        )
    },
    {
        "role": "user",
        "content": "What is the maximum file size for Azure Blob Storage?"
    }
]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    max_tokens=200
)

print(response.choices[0].message.content)

# Multi-turn conversation with assistant role for context
messages.append({"role": "assistant", "content": response.choices[0].message.content})
messages.append({"role": "user", "content": "How does that compare to the block blob limit?"})

response2 = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    max_tokens=200
)

print(f"\nFollow-up: {response2.choices[0].message.content}")
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

// System message defines behavior and constraints
var messages = new List<ChatMessage>
{
    new SystemChatMessage(
        "You are a technical documentation assistant for Azure services. " +
        "Always respond with accurate, concise technical information. " +
        "Format responses using markdown. " +
        "If you are unsure about something, say so rather than guessing. " +
        "Do not provide information about non-Azure cloud services."),
    new UserChatMessage("What is the maximum file size for Azure Blob Storage?")
};

ChatCompletion completion = await chatClient.CompleteChatAsync(
    messages,
    new ChatCompletionOptions { MaxOutputTokenCount = 200 });

Console.WriteLine(completion.Content[0].Text);

// Multi-turn with assistant context
messages.Add(new AssistantChatMessage(completion.Content[0].Text));
messages.Add(new UserChatMessage("How does that compare to the block blob limit?"));

ChatCompletion followUp = await chatClient.CompleteChatAsync(
    messages,
    new ChatCompletionOptions { MaxOutputTokenCount = 200 });

Console.WriteLine($"\nFollow-up: {followUp.Content[0].Text}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Chat completions with system, user, and assistant roles
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are a technical documentation assistant for Azure services. Always respond with accurate, concise technical information. Format responses using markdown."
      },
      {
        "role": "user",
        "content": "What is the maximum file size for Azure Blob Storage?"
      }
    ],
    "max_tokens": 200
  }'

# Multi-turn conversation
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a technical documentation assistant."},
      {"role": "user", "content": "What is the max blob size?"},
      {"role": "assistant", "content": "The maximum size for a single block blob is approximately 190.7 TiB."},
      {"role": "user", "content": "How does that compare to the block blob limit?"}
    ],
    "max_tokens": 200
  }'
```

</TabItem>
</Tabs>

### Tarefa 2: Experimentar com Temperature e ParÃ¢metros de Amostragem

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

prompt = [
    {"role": "system", "content": "You are a creative writing assistant."},
    {"role": "user", "content": "Write a one-sentence description of cloud computing."}
]

# Temperature 0: Deterministic, consistent output
print("=== Temperature 0 (Deterministic) ===")
for i in range(3):
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=prompt,
        temperature=0,
        max_tokens=50
    )
    print(f"  Run {i+1}: {response.choices[0].message.content}")

# Temperature 1.5: High creativity, more variation
print("\n=== Temperature 1.5 (Creative) ===")
for i in range(3):
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=prompt,
        temperature=1.5,
        max_tokens=50
    )
    print(f"  Run {i+1}: {response.choices[0].message.content}")

# Frequency and presence penalties for diversity
print("\n=== With Penalties (Reduce Repetition) ===")
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "List 5 benefits of cloud computing."},
        {"role": "user", "content": "Go."}
    ],
    temperature=0.7,
    frequency_penalty=0.5,   # Reduce word repetition
    presence_penalty=0.5,    # Encourage new topics
    max_tokens=200
)
print(response.choices[0].message.content)
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

var prompt = new ChatMessage[]
{
    new SystemChatMessage("You are a creative writing assistant."),
    new UserChatMessage("Write a one-sentence description of cloud computing.")
};

// Temperature 0: Deterministic output
Console.WriteLine("=== Temperature 0 (Deterministic) ===");
for (int i = 0; i < 3; i++)
{
    var result = await chatClient.CompleteChatAsync(prompt,
        new ChatCompletionOptions { Temperature = 0f, MaxOutputTokenCount = 50 });
    Console.WriteLine($"  Run {i + 1}: {result.Value.Content[0].Text}");
}

// Temperature 1.5: High creativity
Console.WriteLine("\n=== Temperature 1.5 (Creative) ===");
for (int i = 0; i < 3; i++)
{
    var result = await chatClient.CompleteChatAsync(prompt,
        new ChatCompletionOptions { Temperature = 1.5f, MaxOutputTokenCount = 50 });
    Console.WriteLine($"  Run {i + 1}: {result.Value.Content[0].Text}");
}

// With penalties
Console.WriteLine("\n=== With Penalties (Reduce Repetition) ===");
var penaltyResult = await chatClient.CompleteChatAsync(
    new ChatMessage[]
    {
        new SystemChatMessage("List 5 benefits of cloud computing."),
        new UserChatMessage("Go.")
    },
    new ChatCompletionOptions
    {
        Temperature = 0.7f,
        FrequencyPenalty = 0.5f,
        PresencePenalty = 0.5f,
        MaxOutputTokenCount = 200
    });
Console.WriteLine(penaltyResult.Value.Content[0].Text);
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Temperature 0: Deterministic
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a creative writing assistant."},
      {"role": "user", "content": "Write a one-sentence description of cloud computing."}
    ],
    "temperature": 0,
    "max_tokens": 50
  }'

# Temperature 1.5: Creative
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a creative writing assistant."},
      {"role": "user", "content": "Write a one-sentence description of cloud computing."}
    ],
    "temperature": 1.5,
    "max_tokens": 50
  }'

# With frequency and presence penalties
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "List 5 benefits of cloud computing."},
      {"role": "user", "content": "Go."}
    ],
    "temperature": 0.7,
    "frequency_penalty": 0.5,
    "presence_penalty": 0.5,
    "max_tokens": 200
  }'
```

</TabItem>
</Tabs>

### Tarefa 3: Implementar Few-Shot Prompting

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

# Few-shot prompting: provide examples to guide the model
messages = [
    {
        "role": "system",
        "content": "You classify customer support tickets into categories. Respond with only the category name."
    },
    # Example 1
    {"role": "user", "content": "I can't log into my account, it says password is wrong"},
    {"role": "assistant", "content": "Authentication"},
    # Example 2
    {"role": "user", "content": "My monthly bill seems higher than expected"},
    {"role": "assistant", "content": "Billing"},
    # Example 3
    {"role": "user", "content": "The app crashes when I try to upload a file larger than 10MB"},
    {"role": "assistant", "content": "Bug Report"},
    # Actual request
    {"role": "user", "content": "I want to add another user to my team subscription"}
]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    temperature=0,
    max_tokens=10
)

print(f"Classification: {response.choices[0].message.content}")

# Chain-of-thought prompting
cot_messages = [
    {
        "role": "system",
        "content": "You are a math tutor. Show your reasoning step by step before giving the final answer."
    },
    {
        "role": "user",
        "content": "A store has 3 shelves. Each shelf has 4 boxes. Each box contains 6 items. If 15 items are sold, how many remain?"
    }
]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=cot_messages,
    temperature=0,
    max_tokens=300
)

print(f"\nChain-of-thought:\n{response.choices[0].message.content}")
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

// Few-shot prompting with examples
var fewShotMessages = new ChatMessage[]
{
    new SystemChatMessage("You classify customer support tickets into categories. Respond with only the category name."),
    new UserChatMessage("I can't log into my account, it says password is wrong"),
    new AssistantChatMessage("Authentication"),
    new UserChatMessage("My monthly bill seems higher than expected"),
    new AssistantChatMessage("Billing"),
    new UserChatMessage("The app crashes when I try to upload a file larger than 10MB"),
    new AssistantChatMessage("Bug Report"),
    new UserChatMessage("I want to add another user to my team subscription")
};

var result = await chatClient.CompleteChatAsync(fewShotMessages,
    new ChatCompletionOptions { Temperature = 0f, MaxOutputTokenCount = 10 });

Console.WriteLine($"Classification: {result.Value.Content[0].Text}");

// Chain-of-thought prompting
var cotMessages = new ChatMessage[]
{
    new SystemChatMessage("You are a math tutor. Show your reasoning step by step before giving the final answer."),
    new UserChatMessage("A store has 3 shelves. Each shelf has 4 boxes. Each box contains 6 items. If 15 items are sold, how many remain?")
};

var cotResult = await chatClient.CompleteChatAsync(cotMessages,
    new ChatCompletionOptions { Temperature = 0f, MaxOutputTokenCount = 300 });

Console.WriteLine($"\nChain-of-thought:\n{cotResult.Value.Content[0].Text}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Few-shot prompting with examples
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "You classify customer support tickets. Respond with only the category name."},
      {"role": "user", "content": "I cannot log into my account"},
      {"role": "assistant", "content": "Authentication"},
      {"role": "user", "content": "My bill seems too high"},
      {"role": "assistant", "content": "Billing"},
      {"role": "user", "content": "I want to add another user to my team subscription"}
    ],
    "temperature": 0,
    "max_tokens": 10
  }'

# Chain-of-thought prompting
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a math tutor. Show your reasoning step by step."},
      {"role": "user", "content": "A store has 3 shelves with 4 boxes each, 6 items per box. 15 items are sold. How many remain?"}
    ],
    "temperature": 0,
    "max_tokens": 300
  }'
```

</TabItem>
</Tabs>

### Tarefa 4: Usar Modo JSON para SaÃ­da Estruturada

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

# JSON mode: ensures valid JSON output
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "system",
            "content": "You extract structured data from text. Always respond with valid JSON."
        },
        {
            "role": "user",
            "content": "Extract entities: 'John Smith from Microsoft called on March 15, 2024 about Azure OpenAI pricing for their Seattle office.'"
        }
    ],
    response_format={"type": "json_object"},
    temperature=0,
    max_tokens=300
)

result = json.loads(response.choices[0].message.content)
print(json.dumps(result, indent=2))

# Prompt template with variable substitution
def create_analysis_prompt(product_name: str, review_text: str) -> list:
    """Reusable prompt template for product review analysis."""
    return [
        {
            "role": "system",
            "content": (
                "You are a product review analyst. Analyze the review and return JSON with: "
                "sentiment (positive/negative/neutral), key_points (array), "
                "rating_estimate (1-5), and summary (one sentence)."
            )
        },
        {
            "role": "user",
            "content": f"Product: {product_name}\nReview: {review_text}"
        }
    ]

# Use the template
review = "The new Azure AI Studio is fantastic! Easy to use and very powerful."
messages = create_analysis_prompt("Azure AI Studio", review)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    response_format={"type": "json_object"},
    temperature=0,
    max_tokens=200
)

analysis = json.loads(response.choices[0].message.content)
print(f"\nSentiment: {analysis.get('sentiment')}")
print(f"Rating: {analysis.get('rating_estimate')}/5")
print(f"Summary: {analysis.get('summary')}")
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

// JSON mode for structured output
var jsonResult = await chatClient.CompleteChatAsync(
    new ChatMessage[]
    {
        new SystemChatMessage("You extract structured data from text. Always respond with valid JSON."),
        new UserChatMessage("Extract entities: 'John Smith from Microsoft called on March 15, 2024 about Azure OpenAI pricing for their Seattle office.'")
    },
    new ChatCompletionOptions
    {
        ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat(),
        Temperature = 0f,
        MaxOutputTokenCount = 300
    });

var jsonDoc = JsonDocument.Parse(jsonResult.Value.Content[0].Text);
Console.WriteLine(JsonSerializer.Serialize(jsonDoc, new JsonSerializerOptions { WriteIndented = true }));

// Prompt template method
ChatMessage[] CreateAnalysisPrompt(string productName, string reviewText) =>
    new ChatMessage[]
    {
        new SystemChatMessage(
            "You are a product review analyst. Analyze the review and return JSON with: " +
            "sentiment (positive/negative/neutral), key_points (array), " +
            "rating_estimate (1-5), and summary (one sentence)."),
        new UserChatMessage($"Product: {productName}\nReview: {reviewText}")
    };

// Use the template
var analysisResult = await chatClient.CompleteChatAsync(
    CreateAnalysisPrompt("Azure AI Studio",
        "The new Azure AI Studio is fantastic! Easy to use and very powerful."),
    new ChatCompletionOptions
    {
        ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat(),
        Temperature = 0f,
        MaxOutputTokenCount = 200
    });

var analysis = JsonDocument.Parse(analysisResult.Value.Content[0].Text);
Console.WriteLine($"\nAnalysis: {JsonSerializer.Serialize(analysis, new JsonSerializerOptions { WriteIndented = true })}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# JSON mode for structured output
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "You extract structured data from text. Always respond with valid JSON."},
      {"role": "user", "content": "Extract entities: John Smith from Microsoft called on March 15, 2024 about Azure OpenAI pricing for their Seattle office."}
    ],
    "response_format": {"type": "json_object"},
    "temperature": 0,
    "max_tokens": 300
  }'

# Prompt template pattern (variables replaced in the request)
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "Analyze the product review and return JSON with: sentiment, key_points, rating_estimate (1-5), summary."},
      {"role": "user", "content": "Product: Azure AI Studio\nReview: The new Azure AI Studio is fantastic! Easy to use and very powerful."}
    ],
    "response_format": {"type": "json_object"},
    "temperature": 0,
    "max_tokens": 200
  }'
```

</TabItem>
</Tabs>

## SaÃ­da Esperada

```python
Classification: Account Management

Chain-of-thought:
Step 1: Calculate total items
- 3 shelves Ã— 4 boxes = 12 boxes
- 12 boxes Ã— 6 items = 72 items total

Step 2: Subtract sold items
- 72 items - 15 sold = 57 items remaining

**Answer: 57 items remain**

{
  "person": "John Smith",
  "company": "Microsoft",
  "date": "March 15, 2024",
  "topic": "Azure OpenAI pricing",
  "location": "Seattle"
}

Sentiment: positive
Rating: 5/5
Summary: The reviewer finds Azure AI Studio excellent for its ease of use and power.
```

## Quebra & conserta

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| Modo JSON retorna erro | `response_format is not supported` | Modelo ou versÃ£o da API nÃ£o suporta modo JSON | Use GPT-4o com versÃ£o da API 2024-10-21+ |
| SaÃ­da JSON Ã© invÃ¡lida | JSON parcial ou truncado | `max_tokens` muito baixo para a resposta | Aumente `max_tokens` ou simplifique o schema solicitado |
| Few-shot nÃ£o funciona | Modelo ignora exemplos | Exemplos inconsistentes ou muito poucos | Garanta 3+ exemplos diversos com formato consistente |
| Temperature 0 varia | SaÃ­das ligeiramente diferentes com temp=0 | Comportamento esperado devido a ponto flutuante | Use o parÃ¢metro `seed` para reprodutibilidade |
| System prompt ignorado | Modelo nÃ£o segue as restriÃ§Ãµes | Mensagem do usuÃ¡rio sobrescreve mensagem de sistema | Reforce as restriÃ§Ãµes no system message; use instruÃ§Ãµes mais explÃ­citas |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ch17-q1",
    question: "Qual Ã© a abordagem recomendada quando vocÃª quer baixa aleatoriedade e alta qualidade nas respostas do Azure OpenAI?",
    options: [
      "Definir temperature=0 e top_p=0 simultaneamente",
      "Definir top_p=0.1 e temperature=2",
      "Definir temperature=0 e deixar top_p no valor padrÃ£o (1)",
      "Definir frequency_penalty=2 e presence_penalty=2"
    ],
    correctAnswer: 2,
    explanation: "A Microsoft recomenda ajustar temperature OU top_p, nÃ£o ambos. Definir temperature=0 dÃ¡ resultados determinÃ­sticos. Definir top_p=0 impediria qualquer seleÃ§Ã£o de token. A abordagem recomendada Ã© temperature=0 com top_p no valor padrÃ£o de 1."
  },
  {
    id: "ch17-q2",
    question: "Na API de chat completions, qual Ã© o propÃ³sito de incluir mensagens assistant no array de mensagens?",
    options: [
      "Fornecer histÃ³rico de conversa e exemplos para few-shot prompting",
      "Definir as restriÃ§Ãµes de comportamento do sistema",
      "Configurar o formato de saÃ­da para JSON",
      "Aumentar o rate limit da requisiÃ§Ã£o"
    ],
    correctAnswer: 0,
    explanation: "Mensagens assistant representam respostas anteriores do modelo. Elas servem dois propÃ³sitos: fornecer histÃ³rico de conversa para chat multi-turno e fornecer respostas de exemplo em padrÃµes de few-shot prompting onde pares user/assistant demonstram o comportamento desejado."
  },
  {
    id: "ch17-q3",
    question: "O que deve ser verdade ao usar response_format: {type: 'json_object'} com o Azure OpenAI?",
    options: [
      "O modelo deve ser GPT-3.5 ou posterior",
      "A mensagem system ou user deve conter a palavra 'JSON'",
      "A temperature deve ser definida como 0",
      "O max_tokens deve ser pelo menos 1000"
    ],
    correctAnswer: 1,
    explanation: "Ao usar o modo JSON, a mensagem system ou user deve mencionar explicitamente que a resposta deve estar em formato JSON. A API retornarÃ¡ um erro se o modo JSON estiver habilitado mas 'JSON' nÃ£o for mencionado nas mensagens. Isso garante o uso intencional do recurso."
  },
  {
    id: "ch17-q4",
    question: "Qual parÃ¢metro reduz a probabilidade do modelo repetir as mesmas palavras ou frases que jÃ¡ usou?",
    options: [
      "presence_penalty",
      "top_p",
      "temperature",
      "frequency_penalty"
    ],
    correctAnswer: 3,
    explanation: "frequency_penalty (intervalo de -2 a 2) reduz a repetiÃ§Ã£o proporcionalmente Ã  frequÃªncia com que um token apareceu. Quanto mais uma palavra Ã© repetida, mais ela Ã© penalizada. presence_penalty penaliza tokens que apareceram de qualquer forma (independente da frequÃªncia), incentivando novos tÃ³picos."
  },
  {
    id: "ch17-q5",
    question: "Qual Ã© a diferenÃ§a principal entre zero-shot e few-shot prompting?",
    options: [
      "Zero-shot nÃ£o fornece exemplos; few-shot inclui pares de entrada/saÃ­da de exemplo no prompt",
      "Zero-shot usa temperature=0; few-shot usa temperature>0",
      "Zero-shot funciona apenas com GPT-3.5; few-shot requer GPT-4",
      "Zero-shot Ã© sÃ­ncrono; few-shot Ã© assÃ­ncrono"
    ],
    correctAnswer: 0,
    explanation: "Zero-shot prompting dÃ¡ ao modelo uma tarefa sem exemplos, confiando no seu treinamento. Few-shot prompting inclui pares de entrada/saÃ­da de exemplo no prompt (como pares de mensagens user/assistant) para demonstrar o formato e comportamento desejados, melhorando a consistÃªncia."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-challenge17 --yes --no-wait
```

## Saiba Mais
- [TÃ©cnicas de engenharia de prompt](https://learn.microsoft.com/azure/ai-services/openai/concepts/prompt-engineering)
- [ReferÃªncia da API de chat completions](https://learn.microsoft.com/azure/ai-services/openai/reference#chat-completions)
- [Modo JSON e saÃ­das estruturadas](https://learn.microsoft.com/azure/ai-services/openai/how-to/structured-outputs)
- [Framework de mensagem de sistema](https://learn.microsoft.com/azure/ai-services/openai/concepts/system-message)
- [Aprendizado few-shot com Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/concepts/advanced-prompt-engineering)
