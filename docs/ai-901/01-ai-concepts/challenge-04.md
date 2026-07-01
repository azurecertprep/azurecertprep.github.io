---
sidebar_position: 4
title: "Challenge 04: Azure AI Services Overview"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 04: Azure AI Services Overview

:::info Estimated Time
**25-35 min** | **Cost**: Free | **Domain**: AI Concepts & Capabilities (40-45%)
:::

## Exam skills covered

- Map use cases to Azure AI services (Vision, Language, Speech, Decision, OpenAI)
- Describe the difference between multi-service and single-service resources
- Identify Azure AI services pricing tiers and endpoints
- Understand keys, endpoints, and authentication for Azure AI services

## Overview

Azure AI services are cloud-based APIs that let developers add AI capabilities to applications without building machine learning models from scratch. They are pre-trained, ready to use, and accessed via REST APIs or SDKs. You don't need to be a data scientist — just call the API and get intelligent results back.

Think of Azure AI services like a restaurant kitchen. You don't need to know how to cook (build ML models) — you just order from the menu (call the API) and get a finished dish (AI-powered result). The kitchen (Microsoft's infrastructure) handles all the complexity behind the scenes.

Azure offers two ways to provision these services: a **multi-service resource** (one resource for Vision, Language, Speech, etc. with a single key/endpoint) or **single-service resources** (separate resources for each service). The multi-service approach is simpler for getting started, while single-service resources allow granular billing and access control.

## Explore

### Task 1: Understand the Azure AI services taxonomy

| Service category | Services included | Example use cases |
|-----------------|-------------------|-------------------|
| **Azure AI Vision** | Image Analysis, Custom Vision, Face | Describe images, detect objects, read text in images |
| **Azure AI Language** | Text Analytics, QnA, CLU, Translator | Sentiment analysis, entity recognition, translation |
| **Azure AI Speech** | Speech-to-Text, Text-to-Speech, Translation | Transcription, voice assistants, real-time translation |
| **Azure AI Document Intelligence** | Prebuilt models, Custom models | Invoice processing, receipt scanning, ID extraction |
| **Azure OpenAI Service** | GPT-4, DALL-E, Whisper, Embeddings | Content generation, summarization, code assistance |
| **Azure AI Search** | Full-text search, Vector search, AI enrichment | Knowledge mining, RAG patterns, enterprise search |

### Task 2: Create a multi-service resource (Free tier)

1. Open [portal.azure.com](https://portal.azure.com)
2. Click **+ Create a resource**
3. Search for **"Azure AI services"**
4. Select **Azure AI services** (the multi-service option)
5. Configure:
   - **Subscription**: Your subscription
   - **Resource group**: Create new → `rg-ai900-lab`
   - **Region**: Choose one near you
   - **Name**: `ai900-demo-[yourinitials]`
   - **Pricing tier**: **Free F0**
6. Review the Responsible AI notice — you must acknowledge it
7. Click **Review + create** → **Create**

### Task 3: Explore keys and endpoint

After deployment:

1. Go to your new Azure AI services resource
2. Click **Keys and Endpoint** in the left menu
3. Notice:
   - **Key 1** and **Key 2** — used for authentication (two keys for rotation without downtime)
   - **Endpoint** — the URL your applications call (e.g., `https://eastus.api.cognitive.microsoft.com/`)
   - **Location/Region** — where your resource is hosted
4. These three pieces of information (key + endpoint + region) are what applications need to use the service

### Task 4: Multi-service vs single-service resources

| Feature | Multi-service resource | Single-service resource |
|---------|----------------------|------------------------|
| Billing | Single bill for all services | Separate bill per service |
| Keys | One key accesses all services | Unique key per service |
| Endpoint | Single endpoint | Separate endpoints |
| Access control | Same permissions for all | Granular RBAC per service |
| Best for | Getting started, prototyping | Production with strict access control |

:::tip Azure CLI Alternative
```bash
# Create a multi-service Azure AI resource (Free tier)
az cognitiveservices account create \
  --name ai900-demo \
  --resource-group rg-ai900-lab \
  --kind AIServices \
  --sku F0 \
  --location eastus

# List keys
az cognitiveservices account keys list \
  --name ai900-demo \
  --resource-group rg-ai900-lab

# Show endpoint
az cognitiveservices account show \
  --name ai900-demo \
  --resource-group rg-ai900-lab \
  --query "properties.endpoint"
```
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Azure AI services | Pre-built AI models accessible via REST APIs — no ML expertise needed |
| Multi-service resource | Single Azure resource that provides access to multiple AI services with one key/endpoint |
| Single-service resource | Dedicated Azure resource for one specific AI service (e.g., Vision only) |
| API key | Secret string used to authenticate requests to Azure AI services |
| Endpoint | URL that applications call to access the AI service |
| Free tier (F0) | No-cost pricing tier with limited transactions per month — ideal for learning |
| Standard tier (S0) | Pay-per-use pricing with higher limits for production workloads |
| Region | Azure datacenter location where the AI service is hosted and processes data |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| "You need machine learning expertise to use Azure AI services" | Azure AI services are pre-trained APIs. You call them with data and get results — no ML knowledge needed |
| "Multi-service and single-service resources have different capabilities" | The AI capabilities are identical. The difference is only in billing, access control, and resource management |
| "Azure OpenAI is the same as OpenAI's public API" | Azure OpenAI runs OpenAI models on Azure infrastructure with enterprise security, compliance, and regional data residency. It requires separate approval to access |
| "The free tier is limited to a short trial period" | The F0 (Free) tier is not time-limited. It has transaction limits per month but doesn't expire |
| "You need two keys because one might stop working" | Two keys exist to enable key rotation without downtime. While you regenerate Key 1, apps use Key 2, and vice versa |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-04-q1',
      question: 'A developer wants a single Azure resource that provides access to Vision, Language, and Speech AI services with one set of credentials. What should they create?',
      options: ['Three separate Azure AI resources', 'An Azure Machine Learning workspace', 'An Azure OpenAI resource', 'An Azure AI services multi-service resource'],
      correctAnswer: 3,
      explanation: 'A multi-service Azure AI services resource provides access to multiple AI capabilities (Vision, Language, Speech, etc.) through a single key and endpoint, simplifying management.'
    },
    {
      id: 'ai900-04-q2',
      question: 'What are the minimum pieces of information an application needs to call an Azure AI service?',
      options: ['Subscription ID and resource group name', 'Endpoint URL and API key', 'Username and password', 'Connection string only'],
      correctAnswer: 1,
      explanation: 'To call an Azure AI service, an application needs the endpoint URL (where to send requests) and an API key (for authentication). These are found in the "Keys and Endpoint" section of the resource.'
    },
    {
      id: 'ai900-04-q3',
      question: 'Why does Azure provide TWO keys for each AI services resource?',
      options: ['To enable key rotation without service interruption', 'One key is for reading and one is for writing', 'The second key is a backup in case the first is lost', 'Each key has different permission levels'],
      correctAnswer: 0,
      explanation: 'Two keys enable seamless key rotation. You can regenerate Key 1 while applications use Key 2, then switch applications to the new Key 1. This avoids any downtime during security rotation.'
    },
    {
      id: 'ai900-04-q4',
      question: 'A company needs to process receipts and extract purchase amounts, dates, and merchant names automatically. Which Azure AI service should they use?',
      options: ['Azure AI Vision', 'Azure AI Language', 'Azure AI Document Intelligence', 'Azure AI Speech'],
      correctAnswer: 2,
      explanation: 'Azure AI Document Intelligence (formerly Form Recognizer) specializes in extracting structured data — specific fields like amounts, dates, and merchant names — from documents such as receipts and invoices.'
    },
    {
      id: 'ai900-04-q5',
      question: 'What is the primary advantage of using single-service resources instead of a multi-service resource?',
      options: ['Better AI model performance', 'Lower cost per transaction', 'Granular access control and billing per service', 'Access to more AI features'],
      correctAnswer: 2,
      explanation: 'Single-service resources allow granular billing (track costs per service) and access control (different permissions for Vision vs Language). The AI capabilities themselves are identical regardless of resource type.'
    }
  ]}
/>

## Learn More

- [Microsoft Learn: Azure AI services](https://learn.microsoft.com/en-us/azure/ai-services/what-are-ai-services)
- [Create a multi-service resource](https://learn.microsoft.com/en-us/azure/ai-services/multi-service-resource)
- [Azure AI services pricing](https://azure.microsoft.com/pricing/details/cognitive-services/)
- [Azure OpenAI Service overview](https://learn.microsoft.com/en-us/azure/ai-services/openai/overview)
