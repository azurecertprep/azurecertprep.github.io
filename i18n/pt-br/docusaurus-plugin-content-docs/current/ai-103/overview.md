---
sidebar_position: 1
title: "AI-103: Azure AI Apps and Agents Developer"
---

# AI-103: Azure AI Apps and Agents Developer

:::info Exam Details
**Exam version**: Skills measured as of April 2026 | **Passing score**: 700/1000 | **Duration**: ~120 minutes | **Cost**: ~$20-50 for labs
:::

:::note Replaces AI-103
This exam replaced AI-103 (retired June 30, 2026). It shifts focus from traditional Azure AI services to **generative AI, agentic architectures, and Microsoft Foundry**. If you previously studied AI-103, much of the vision/NLP/search knowledge still applies, but the center of gravity is now GenAI + Agents.
:::

## Who is this for?

The AI-103 validates the ability to develop, deploy, and manage AI apps and agents using Azure. This is a **hands-on, code-first** certification focused on modern AI development patterns:

- AI developers building generative AI applications
- Software engineers integrating LLMs and agents into products
- Cloud architects designing agentic AI solutions
- DevOps engineers deploying AI workloads on Azure
- Data scientists transitioning to production AI engineering

## Skills at a glance

| Domain | Weight | Challenges |
|--------|--------|------------|
| Plan and manage an Azure AI solution | 15–20% | 01–10 |
| Implement generative AI and agentic solutions | 35–40% | 11–23 |
| Implement computer vision solutions | 10–15% | 24–30 |
| Implement text analysis solutions | 15–20% | 31–39 |
| Implement information extraction solutions | 15–20% | 40–49 |

:::tip What's New vs AI-103
The **heaviest domain (35-40%)** is now GenAI + Agents — covering RAG pipelines, agent orchestration, multi-tool agents, prompt engineering, and Microsoft Foundry. Traditional NLP and Computer Vision remain but with reduced weight.
:::

## Domain breakdown

### Domain 1: Plan and Manage an Azure AI Solution (15–20%)

| Topic | Key Skills |
|-------|-----------|
| Architecture | Secure, scalable Azure AI solution design |
| Deployment | Planning, provisioning, and monitoring AI workloads |
| Compliance | Responsible AI, governance, and regulatory requirements |
| Security | Identity, access controls, and data protection |
| Monitoring | Performance tracking, cost management, alerting |

### Domain 2: Implement Generative AI and Agentic Solutions (35–40%)

| Topic | Key Skills |
|-------|-----------|
| Azure OpenAI + Foundry | Deploy and manage LLM models |
| RAG pipelines | Retrieval-Augmented Generation with Azure AI Search |
| Agent architecture | Design multi-step, goal-oriented agents |
| Agent orchestration | Multi-tool, task completion, and reasoning chains |
| Prompt engineering | System/user prompts, chaining, context window management |
| Agent monitoring | Tracking behavior, debugging, and optimization |
| Azure AI Agent Service | Building and deploying production agents |

### Domain 3: Implement Computer Vision Solutions (10–15%)

| Topic | Key Skills |
|-------|-----------|
| Azure AI Vision | Image/video analysis, classification, detection |
| Custom Vision | Training custom models for specific use cases |
| OCR | Document text extraction |
| Face API | Facial recognition and analysis |
| Production integration | Deploying vision models in apps |

### Domain 4: Implement Text Analysis Solutions (15–20%)

| Topic | Key Skills |
|-------|-----------|
| NLP tasks | Sentiment, key phrases, language detection |
| Entity extraction | Named entities, PII detection, summarization |
| Content moderation | Safety and compliance filtering |
| Speech services | Speech-to-text, text-to-speech, translation |
| Custom models | CLU (Conversational Language Understanding) |

### Domain 5: Implement Information Extraction Solutions (15–20%)

| Topic | Key Skills |
|-------|-----------|
| Document Intelligence | Structured data from documents and forms |
| Content Understanding | Extracting info from unstructured sources |
| Azure AI Search | Index design, skillsets, vector search |
| Multimodal extraction | Handling text, images, and mixed-content documents |
| Custom extractors | Training models for domain-specific extraction |

## How to use this prep

Each challenge follows a developer-focused format:

| Section | Purpose |
|---------|---------|
| **Exam Skills Covered** | Official skills this challenge addresses |
| **Scenario** | Real-world problem that frames the challenge |
| **Architecture** | Diagram of the solution components |
| **Tasks** | Step-by-step with Python / C# / REST tabs |
| **Validation** | Programmatic checks to verify your solution |
| **Break & Fix** | Deliberate misconfigurations to troubleshoot |
| **Knowledge Check** | Exam-style questions |
| **Cleanup** | Scripts to delete resources and avoid costs |

## Prerequisites

- **Programming experience** — Python (primary) or C# 
- **Azure subscription** — [Azure Free Account](https://azure.microsoft.com/free/) with $200 credit recommended
- **Development environment** — VS Code with Azure extensions, or GitHub Codespaces
- **Azure CLI** — Authenticated and configured
- **AI-901 knowledge** — Understanding of Azure AI Foundry concepts (recommended)

:::warning Lab Costs
Some challenges create billable resources (Azure OpenAI, Azure AI Search, Document Intelligence). Always run cleanup scripts after completing a challenge. Estimated total cost: $20-50 with careful cleanup.
:::

## Study resources

| Resource | Link |
|----------|------|
| Official Study Guide | [AI-103 Study Guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ai-103) |
| Free Practice Assessment | [Practice Questions](https://learn.microsoft.com/en-us/credentials/certifications/exams/ai-103/practice/assessment?assessment-type=practice&assessmentId=61) |
| Exam Sandbox | [Try the exam interface](https://aka.ms/examdemo) |
| Schedule the Exam | [Pearson VUE](https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-apps-and-agents-developer-associate/) |

## Microsoft Learn paths

| Learning Path | Focus |
|---------------|-------|
| [Develop AI solutions with Azure OpenAI](https://learn.microsoft.com/en-us/training/paths/develop-ai-solutions-azure-openai/) | GenAI fundamentals |
| [Build AI agents with Azure AI Agent Service](https://learn.microsoft.com/en-us/training/paths/build-ai-agents/) | Agentic architecture |
| [Implement RAG with Azure AI Search](https://learn.microsoft.com/en-us/training/paths/implement-knowledge-mining-azure-ai-search/) | RAG pipelines |
| [Create computer vision solutions](https://learn.microsoft.com/en-us/training/paths/create-computer-vision-solutions-azure-ai/) | Vision services |
| [Develop NLP solutions](https://learn.microsoft.com/en-us/training/paths/develop-language-solutions-azure-ai/) | Text analysis |

## What changed from AI-103?

| Aspect | AI-103 (retired) | AI-103 (current) |
|--------|-------------------|-------------------|
| Focus | Traditional AI services | GenAI + Agents first |
| Heaviest domain | Evenly distributed | GenAI/Agents (35-40%) |
| Bot Framework | Included | Removed |
| Agent architecture | Not covered | Core skill |
| RAG patterns | Basic coverage | Deep focus |
| Microsoft Foundry | Not covered | Central platform |
| LUIS | Included | Replaced by CLU |
| Duration | 100-120 minutes | ~120 minutes |

---

**Ready?** Start with [Challenge 01](/docs/ai-103/plan-manage/challenge-01) to plan and provision your first Azure AI solution.
