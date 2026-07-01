---
sidebar_position: 8
title: "Challenge 17: Prompt Engineering and Templates"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 17: Prompt Engineering and Templates

:::info Estimated Time
**45-60 min** | **Cost**: ~$0.50 (estimated) | **Domain**: Generative AI & Agentic Solutions (35-40%)
:::

## Exam skills covered
- Submit prompts to generative AI models
- Utilize prompt templates
- Apply prompt engineering techniques for optimal results

## Overview

Prompt engineering is the practice of designing and optimizing inputs to language models to elicit desired outputs. Azure OpenAI's chat completions API uses a structured message format with three roles: **system** (sets behavior and constraints), **user** (provides the request), and **assistant** (models prior responses for context). Understanding how to configure these messages effectively is fundamental to building reliable AI applications.

Key parameters control response generation: **temperature** (0-2, controls randomness), **top_p** (nucleus sampling threshold), **max_tokens** (output length limit), **frequency_penalty** (-2 to 2, reduces repetition), and **presence_penalty** (-2 to 2, encourages topic diversity). These parameters interact—for example, temperature and top_p both affect randomness, so Microsoft recommends adjusting one at a time.

Advanced techniques include **few-shot prompting** (providing examples in the prompt), **chain-of-thought** (requesting step-by-step reasoning), and **structured outputs** (using JSON mode or response_format to ensure parseable output). Prompt templates allow reusable prompt patterns with variable substitution, enabling consistent behavior across application scenarios.

## Architecture

This challenge explores prompt construction, parameter tuning, and template-based approaches for building consistent and reliable generative AI interactions.

![Challenge 17 topology](/img/AI-103/challenge-17-topology.svg)

## Prerequisites
- Azure OpenAI resource with GPT-4o deployed (from Challenge 16)
- Python 3.9+ with `openai` package installed
- .NET 8 SDK with `Azure.AI.OpenAI` NuGet package
- Environment variables `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_KEY` configured

## Implementation

### Task 1: Configure System Prompts and Message Roles

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

### Task 2: Experiment with Temperature and Sampling Parameters

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

### Task 3: Implement Few-Shot Prompting

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

### Task 4: Use JSON Mode for Structured Output

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

## Expected Output

```python
Classification: Account Management

Chain-of-thought:
Step 1: Calculate total items
- 3 shelves × 4 boxes = 12 boxes
- 12 boxes × 6 items = 72 items total

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

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|-----------|-----|
| JSON mode returns error | `response_format is not supported` | Model or API version doesn't support JSON mode | Use GPT-4o with API version 2024-10-21+ |
| JSON output is invalid | Partial JSON or truncated | `max_tokens` too low for response | Increase `max_tokens` or simplify requested schema |
| Few-shot not working | Model ignores examples | Examples not consistent or too few | Ensure 3+ diverse examples with consistent format |
| Temperature 0 varies | Slightly different outputs at temp=0 | Expected behavior due to floating-point | Use `seed` parameter for reproducibility |
| System prompt ignored | Model doesn't follow constraints | User message overrides system message | Reinforce constraints in system message; use more explicit instructions |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ch17-q1",
    question: "What is the recommended approach when you want both low randomness and high quality in Azure OpenAI responses?",
    options: [
      "Set temperature=0 and top_p=0 simultaneously",
      "Set top_p=0.1 and temperature=2",
      "Set temperature=0 and leave top_p at default (1)",
      "Set frequency_penalty=2 and presence_penalty=2"
    ],
    correctAnswer: 2,
    explanation: "Microsoft recommends adjusting either temperature OR top_p, not both. Setting temperature=0 gives deterministic results. Setting top_p=0 would prevent any token selection. The recommended approach is temperature=0 with top_p at its default value of 1."
  },
  {
    id: "ch17-q2",
    question: "In the chat completions API, what is the purpose of including assistant messages in the messages array?",
    options: [
      "To provide conversation history and examples for few-shot prompting",
      "To define the system behavior constraints",
      "To set the output format to JSON",
      "To increase the rate limit for the request"
    ],
    correctAnswer: 0,
    explanation: "Assistant messages represent prior model responses. They serve two purposes: providing conversation history for multi-turn chat, and providing example responses in few-shot prompting patterns where user/assistant pairs demonstrate the desired behavior."
  },
  {
    id: "ch17-q3",
    question: "What must be true when using response_format: {type: 'json_object'} with Azure OpenAI?",
    options: [
      "The model must be GPT-3.5 or later",
      "The system or user message must contain the word 'JSON'",
      "The temperature must be set to 0",
      "The max_tokens must be at least 1000"
    ],
    correctAnswer: 1,
    explanation: "When using JSON mode, the system or user message must explicitly mention that the response should be in JSON format. The API will return an error if JSON mode is enabled but 'JSON' is not mentioned in the messages. This ensures intentional use of the feature."
  },
  {
    id: "ch17-q4",
    question: "Which parameter reduces the likelihood of the model repeating the same words or phrases it has already used?",
    options: [
      "presence_penalty",
      "top_p",
      "temperature",
      "frequency_penalty"
    ],
    correctAnswer: 3,
    explanation: "frequency_penalty (range -2 to 2) reduces repetition proportionally to how often a token has appeared. The more a word is repeated, the more it is penalized. presence_penalty penalizes tokens that have appeared at all (regardless of frequency), encouraging new topics."
  },
  {
    id: "ch17-q5",
    question: "What is the key difference between zero-shot and few-shot prompting?",
    options: [
      "Zero-shot provides no examples; few-shot includes example input/output pairs in the prompt",
      "Zero-shot uses temperature=0; few-shot uses temperature>0",
      "Zero-shot works only with GPT-3.5; few-shot requires GPT-4",
      "Zero-shot is synchronous; few-shot is asynchronous"
    ],
    correctAnswer: 0,
    explanation: "Zero-shot prompting gives the model a task without examples, relying on its training. Few-shot prompting includes example input/output pairs in the prompt (as user/assistant message pairs) to demonstrate the desired format and behavior, improving consistency."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-challenge17 --yes --no-wait
```

## Learn More
- [Prompt engineering techniques](https://learn.microsoft.com/azure/ai-services/openai/concepts/prompt-engineering)
- [Chat completions API reference](https://learn.microsoft.com/azure/ai-services/openai/reference#chat-completions)
- [JSON mode and structured outputs](https://learn.microsoft.com/azure/ai-services/openai/how-to/structured-outputs)
- [System message framework](https://learn.microsoft.com/azure/ai-services/openai/concepts/system-message)
- [Few-shot learning with Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/concepts/advanced-prompt-engineering)
