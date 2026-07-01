---
sidebar_position: 3
title: "Challenge 21: Azure AI Foundry"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 21: Azure AI Foundry

:::info Estimated Time
**25-30 min** | **Cost**: Free | **Domain**: Implement AI with Azure Foundry (55-60%)
:::

## Exam skills covered

- Identify features and capabilities of Azure AI Foundry
- Describe the model catalog in Azure AI Foundry
- Identify Azure AI Foundry deployment options

## Overview

**Azure AI Foundry** (formerly Azure AI Studio) is Microsoft's unified platform for building, evaluating, and deploying AI applications. Think of it as the "one-stop shop" for generative AI development on Azure. It brings together model access, prompt engineering, evaluation tools, and deployment — all in a single portal at [ai.azure.com](https://ai.azure.com).

The platform is organized around **hubs** and **projects**. A **hub** is a top-level container that manages shared resources like compute, connections, and security settings across your organization. A **project** lives inside a hub and is where individual teams do their AI work — selecting models, testing prompts, building flows, and deploying applications. This hub-project hierarchy enables enterprise governance while giving teams flexibility.

A standout feature is the **model catalog** — a curated collection of AI models from multiple providers. Beyond OpenAI's GPT models, you can access models from Meta (Llama), Mistral, Microsoft (Phi), Cohere, and others. This lets you compare and choose the best model for your specific use case, considering factors like performance, cost, and licensing.

## Explore

### Task 1: Understand the Hub + Project model

Azure AI Foundry uses a hierarchical structure for organization:

![Challenge 21 - Azure AI Foundry Architecture](/img/AI-901/challenge-21-topology.svg)

| Component | Purpose | Analogy |
|----------|---------|---------|
| Hub | Shared infrastructure and governance | An office building |
| Project | Individual team workspace | A team's floor/suite |
| Model deployment | A running model ready to accept requests | A service desk |
| Connection | Link to external resources (storage, APIs) | Network cables |

### Task 2: Explore the model catalog

Navigate to: [ai.azure.com](https://ai.azure.com) → **Model catalog**

The model catalog offers models from multiple providers:

| Provider | Example Models | Strengths |
|---------|---------------|-----------|
| OpenAI | GPT-4o, GPT-4, GPT-3.5-Turbo, DALL-E | General purpose, strong reasoning |
| Meta | Llama 3.1, Llama 3 | Open-source, customizable |
| Mistral | Mistral Large, Mistral Small | Efficient, multilingual |
| Microsoft | Phi-3, Phi-3.5 | Small models, efficient for specific tasks |
| Cohere | Command R+ | Enterprise search, RAG scenarios |

**Model catalog features**:
- **Model cards** — Description, capabilities, limitations for each model
- **Benchmarks** — Performance comparisons across tasks
- **Deployment options** — Serverless API, managed compute, or self-hosted
- **Licensing info** — Open-source vs. proprietary terms
- **Try it** — Test models directly in the catalog before deploying

### Task 3: Understand deployment options

Azure AI Foundry offers different ways to deploy models:

| Deployment Type | Description | When to Use |
|----------------|-------------|-------------|
| **Serverless API (MaaS)** | Pay-per-token, no infrastructure management | Quick start, variable workloads |
| **Managed Compute** | Dedicated compute with model hosted for you | Predictable workloads, custom models |
| **Azure OpenAI deployment** | Via Azure OpenAI Service resource | OpenAI models with enterprise features |

**Serverless API (Models as a Service)** is especially noteworthy:
- No need to provision compute
- Pay only for tokens consumed
- Models from Meta, Mistral, and others available this way
- Fast to set up — get an endpoint in minutes

### Task 4: Explore prompt flow and evaluation

Azure AI Foundry includes tools for building and evaluating AI applications:

**Prompt Flow** — Visual tool for building LLM application workflows:
- Chain multiple LLM calls together
- Add data processing steps between calls
- Include branching logic
- Connect to external data sources
- Test and debug flows visually

**Evaluation** — Measure AI application quality:
- **Groundedness** — Are responses based on provided data?
- **Relevance** — Do responses answer the question?
- **Coherence** — Are responses logically structured?
- **Fluency** — Is the language natural?
- **Safety** — Does the output avoid harmful content?

**Your task**: Consider a customer support chatbot. What evaluation metrics would matter most? (Groundedness and relevance — you want accurate answers based on real documentation, not hallucinated responses.)

:::tip
For the exam, remember that Azure AI Foundry is the platform that brings everything together — model selection, prompt engineering, evaluation, and deployment. It's not a model itself, but the environment where you work with models.
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Azure AI Foundry | Microsoft's unified platform for building, evaluating, and deploying generative AI applications |
| Hub | Top-level container for shared resources, compute, connections, and security governance |
| Project | Team workspace within a hub for building AI solutions |
| Model catalog | Curated collection of AI models from multiple providers (OpenAI, Meta, Mistral, Microsoft, etc.) |
| Prompt flow | Visual tool for building multi-step LLM application workflows |
| Models as a Service (MaaS) | Serverless pay-per-token deployment requiring no infrastructure management |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| Azure AI Foundry only offers OpenAI models | The model catalog includes models from Meta, Mistral, Microsoft, Cohere, and other providers |
| Azure AI Foundry replaces Azure OpenAI Service | They work together — Azure OpenAI Service provides the models; AI Foundry is the development platform |
| You need a hub for every project | Multiple projects share a single hub; the hub provides shared governance and resources |
| All models in the catalog are free to use | Models have different pricing; some are pay-per-token, others require dedicated compute |
| Prompt flow requires coding | Prompt flow provides a visual, low-code interface for building LLM workflows (though code can be added) |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-21-q1',
      question: 'What is the purpose of the model catalog in Azure AI Foundry?',
      options: ['To store your custom-trained models only', 'To provide a curated collection of AI models from multiple providers to compare and deploy', 'To display pricing information for Azure services', 'To manage Azure subscriptions'],
      correctAnswer: 1,
      explanation: 'The model catalog is a curated collection of AI models from multiple providers (OpenAI, Meta, Mistral, Microsoft, Cohere) that you can compare, test, and deploy. It helps you choose the best model for your use case.'
    },
    {
      id: 'ai900-21-q2',
      question: 'In Azure AI Foundry, what is the relationship between a hub and a project?',
      options: ['They are the same thing with different names', 'Hubs are for production, projects are for development only', 'A project contains multiple hubs', 'A hub contains multiple projects and provides shared resources and governance'],
      correctAnswer: 3,
      explanation: 'A hub is the top-level container that manages shared resources (compute, connections, security) across an organization. Projects live inside a hub and are where teams do their individual AI development work.'
    },
    {
      id: 'ai900-21-q3',
      question: 'A company wants to quickly test a Meta Llama model without provisioning any compute infrastructure. Which deployment option should they choose?',
      options: ['Managed Compute', 'Self-hosted deployment', 'Serverless API (Models as a Service)', 'Azure Virtual Machine'],
      correctAnswer: 2,
      explanation: 'Serverless API (Models as a Service) allows you to deploy and use models without provisioning compute infrastructure. You pay per token consumed and can get an endpoint running in minutes — ideal for quick testing and variable workloads.'
    },
    {
      id: 'ai900-21-q4',
      question: 'What does the "groundedness" evaluation metric measure in Azure AI Foundry?',
      options: ['Whether the responses are based on provided source data rather than hallucinated', 'How fast the model responds', 'The grammatical correctness of responses', 'How many tokens the response uses'],
      correctAnswer: 0,
      explanation: 'Groundedness measures whether the AI\'s responses are based on the provided source data/context rather than containing hallucinated or made-up information. This is critical for enterprise applications where accuracy matters.'
    },
    {
      id: 'ai900-21-q5',
      question: 'Which statement about Azure AI Foundry is correct?',
      options: ['It only supports GPT models from OpenAI', 'It is a unified platform for building, evaluating, and deploying AI applications', 'It replaces all other Azure AI services', 'It requires advanced coding skills to use'],
      correctAnswer: 1,
      explanation: 'Azure AI Foundry is Microsoft\'s unified platform that brings together model selection (from multiple providers), prompt engineering, evaluation tools, and deployment capabilities — all in one environment at ai.azure.com.'
    }
  ]}
/>

## Learn More

- [What is Azure AI Foundry?](https://learn.microsoft.com/en-us/azure/ai-studio/what-is-ai-studio)
- [Azure AI Foundry model catalog](https://learn.microsoft.com/en-us/azure/ai-studio/how-to/model-catalog-overview)
- [Prompt flow in Azure AI Foundry](https://learn.microsoft.com/en-us/azure/ai-studio/how-to/prompt-flow)
- [Azure AI Foundry portal](https://ai.azure.com)
- [Evaluate generative AI apps](https://learn.microsoft.com/en-us/azure/ai-studio/concepts/evaluation-approach-gen-ai)
