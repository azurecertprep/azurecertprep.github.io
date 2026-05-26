---
sidebar_position: 2
title: "Challenge 20: Azure OpenAI Service"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 20: Azure OpenAI Service

:::info Estimated Time
**25-30 min** | **Cost**: Free | **Domain**: Generative AI (15-20%)
:::

## Exam skills covered

- Identify features and capabilities of Azure OpenAI Service
- Describe Azure OpenAI models (GPT-4, GPT-3.5, DALL-E, Whisper)
- Identify Azure OpenAI endpoints and deployments

## Overview

**Azure OpenAI Service** provides access to OpenAI's powerful language models (GPT-4, GPT-4o, GPT-3.5-Turbo), image generation (DALL-E), and audio transcription (Whisper) through Azure's enterprise-grade cloud platform. It combines OpenAI's cutting-edge AI capabilities with Azure's security, compliance, networking, and responsible AI features.

Unlike using OpenAI directly, Azure OpenAI provides enterprise benefits: your data remains within Azure's compliance boundary, you get Azure Active Directory (Microsoft Entra ID) authentication, private network connectivity, content filtering built in, and regional availability with SLA guarantees. This makes it suitable for production workloads in regulated industries.

To use Azure OpenAI, you first create an Azure OpenAI resource, then **deploy** specific models within it. Each deployment gets its own endpoint that applications call. You can have multiple deployments (different models or same model with different settings) within a single resource. The **Azure OpenAI Studio** (now part of Azure AI Foundry) provides a playground for testing prompts before integrating them into applications.

## Explore

### Task 1: Understand Azure OpenAI models

Azure OpenAI offers several model families for different use cases:

| Model | Capabilities | Best For |
|-------|-------------|----------|
| **GPT-4o** | Text + vision, fastest GPT-4 class model | General-purpose chat, multimodal (text + image) |
| **GPT-4** | Advanced reasoning, complex tasks | Complex analysis, creative writing, long-form content |
| **GPT-4 Turbo** | Large context window (128K tokens) | Processing long documents, detailed instructions |
| **GPT-3.5-Turbo** | Fast, cost-effective text generation | Simple chat, content generation, classification |
| **DALL-E** | Image generation from text descriptions | Creating illustrations, concept art, design mockups |
| **Whisper** | Audio transcription (speech-to-text) | Meeting transcription, subtitle generation |
| **Text Embedding models** | Convert text to vector representations | Semantic search, document similarity |

### Task 2: Explore the Azure OpenAI Studio Playground

The **Azure OpenAI Studio Playground** (accessible at [oai.azure.com](https://oai.azure.com)) lets you interact with deployed models. Here's what you'd see:

**Chat Playground interface**:
![Challenge 20 - Chat Completion Structure](/img/ai-900/challenge-20-topology.svg)

**Key playground components**:
- **System message** — Instructions that define the AI's behavior and persona
- **Temperature** — Controls randomness (0-2, default ~0.7)
- **Max tokens** — Maximum length of the response
- **Top-p** — Alternative randomness control (0-1)
- **Deployment** — Which deployed model to use

### Task 3: Understand deployments and endpoints

Azure OpenAI uses a deployment model to manage access:

![Challenge 20 - Azure OpenAI Resource Structure](/img/ai-900/challenge-20-resources.svg)

**Key concepts**:
- **Resource** — The Azure resource that holds your deployments
- **Deployment** — A specific model instance with its own name and endpoint
- **Endpoint** — The URL applications call to access the model
- **API key / Microsoft Entra auth** — Authentication methods for accessing deployments

**Endpoint structure**:
```text
https://{resource-name}.openai.azure.com/openai/deployments/{deployment-name}/chat/completions?api-version=2024-02-01
```

### Task 4: Compare Chat Completions vs. Completions

Azure OpenAI provides different API patterns:

| API | Format | Use Case |
|-----|--------|----------|
| **Chat Completions** | Messages array (system, user, assistant roles) | Conversational AI, most modern use cases |
| **Completions** (legacy) | Single prompt text | Simple text completion |
| **Embeddings** | Input text → vector array | Search, similarity, clustering |
| **Images** (DALL-E) | Text description → image | Image generation |
| **Audio** (Whisper) | Audio file → text | Transcription |

**Chat Completions message format** (the most common pattern):
```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is Azure?"},
    {"role": "assistant", "content": "Azure is Microsoft's cloud..."},
    {"role": "user", "content": "Tell me about pricing."}
  ]
}
```

The **roles** are:
- `system` — Sets the AI's behavior/persona (hidden from user)
- `user` — The human's messages
- `assistant` — The AI's previous responses (for multi-turn context)

:::tip Azure CLI Alternative
```bash
# Create an Azure OpenAI resource
az cognitiveservices account create \
  --name my-openai-resource \
  --resource-group myResourceGroup \
  --kind OpenAI \
  --sku S0 \
  --location eastus2

# List available models for deployment
az cognitiveservices account list-models \
  --name my-openai-resource \
  --resource-group myResourceGroup \
  --output table
```
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Azure OpenAI Service | Azure-hosted access to OpenAI models with enterprise security and compliance |
| Deployment | A specific model instance within an Azure OpenAI resource with its own endpoint |
| System message | Instructions that define the AI assistant's behavior, persona, and constraints |
| Token | The basic unit of text processing (~¾ of a word); determines cost and context limits |
| Chat Completions API | The message-based API format using system/user/assistant roles |
| Content filtering | Built-in Azure OpenAI feature that blocks harmful content in inputs and outputs |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| Azure OpenAI and OpenAI's API are identical | Azure OpenAI adds enterprise features (compliance, networking, content filters, Entra ID auth) not available in OpenAI's direct API |
| You can use any model immediately without deployment | You must deploy a model before you can use it — deployments create the endpoint your application calls |
| GPT-4 is always better than GPT-3.5 for every task | GPT-3.5 is faster and cheaper; for simple tasks (classification, extraction) it may be sufficient and more cost-effective |
| Azure OpenAI stores and trains on your data | By default, Azure OpenAI does NOT use your data to retrain models; your data stays within your compliance boundary |
| DALL-E and GPT use the same model architecture | DALL-E uses diffusion models for image generation; GPT uses transformer models for text — they are different architectures |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-20-q1',
      question: 'What must you create before applications can access an Azure OpenAI model?',
      options: ['A virtual machine', 'A model deployment within the Azure OpenAI resource', 'A custom training dataset', 'A separate Azure subscription for AI'],
      correctAnswer: 1,
      explanation: 'Before applications can call an Azure OpenAI model, you must create a deployment. A deployment is a specific model instance with its own name and endpoint URL that applications use to send requests.'
    },
    {
      id: 'ai900-20-q2',
      question: 'Which Azure OpenAI model would you use to generate images from text descriptions?',
      options: ['GPT-4o', 'GPT-3.5-Turbo', 'DALL-E', 'Whisper'],
      correctAnswer: 2,
      explanation: 'DALL-E is the image generation model in Azure OpenAI. It creates images from text descriptions (prompts). GPT models generate text, and Whisper transcribes audio.'
    },
    {
      id: 'ai900-20-q3',
      question: 'What is the purpose of the "system message" in Azure OpenAI Chat Completions?',
      options: ['To authenticate the API request', 'To set the billing account for the request', 'To specify the deployment name', 'To define the AI assistant\'s behavior, persona, and constraints'],
      correctAnswer: 3,
      explanation: 'The system message sets the AI\'s behavior and persona — for example, "You are a helpful customer service agent that only discusses our products." It provides context and constraints for how the model should respond.'
    },
    {
      id: 'ai900-20-q4',
      question: 'What is a key benefit of using Azure OpenAI Service instead of OpenAI\'s direct API?',
      options: ['Azure OpenAI provides enterprise security, compliance, and content filtering', 'Azure OpenAI is always free', 'Azure OpenAI offers more models than OpenAI', 'Azure OpenAI generates faster responses'],
      correctAnswer: 0,
      explanation: 'Azure OpenAI provides enterprise features including Azure compliance certifications, Microsoft Entra ID authentication, private networking, built-in content filtering, and regional data residency — making it suitable for regulated industries.'
    },
    {
      id: 'ai900-20-q5',
      question: 'Which Azure OpenAI model is best suited for transcribing a recorded meeting into text?',
      options: ['GPT-4', 'DALL-E', 'Whisper', 'Text Embedding'],
      correctAnswer: 2,
      explanation: 'Whisper is the audio transcription model in Azure OpenAI. It converts speech audio into text (speech-to-text), making it ideal for transcribing meetings, interviews, and other recordings.'
    }
  ]}
/>

## Learn More

- [What is Azure OpenAI Service?](https://learn.microsoft.com/en-us/azure/ai-services/openai/overview)
- [Azure OpenAI models](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models)
- [Azure OpenAI quotas and limits](https://learn.microsoft.com/en-us/azure/ai-services/openai/quotas-limits)
- [Azure OpenAI Studio](https://oai.azure.com)
- [Chat Completions API reference](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference)
