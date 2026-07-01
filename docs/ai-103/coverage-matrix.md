---
sidebar_position: 13
title: "Coverage Matrix"
---

# Coverage Matrix

This matrix maps AI-103 exam skills to the challenge set so you can target weak areas and confirm full coverage before the exam.

:::tip How to use this matrix
Use the matrix as a study checklist: start with the highest-weight domains, jump to the mapped challenges for focused practice, and finish with the capstone to validate end-to-end readiness.
:::

## Domain 1: Plan and Manage an Azure AI Solution (15-20%)

Challenges: 01-10

| Skill | Challenges | Key Topics |
|---|---|---|
| Select the appropriate Azure AI service | [01](./01-plan-manage/challenge-01.md), [02](./01-plan-manage/challenge-02.md) | Service selection, architecture tradeoffs, Azure AI service fit |
| Plan and configure security (keys, RBAC, managed identity, network) | [03](./01-plan-manage/challenge-03.md), [04](./01-plan-manage/challenge-04.md) | Authentication, authorization, identity, private access |
| Create and manage Azure AI service resources | [01](./01-plan-manage/challenge-01.md), [02](./01-plan-manage/challenge-02.md), [05](./01-plan-manage/challenge-05.md) | Provisioning, configuration, lifecycle management |
| Configure diagnostic logging | [06](./01-plan-manage/challenge-06.md) | Diagnostic settings, Log Analytics, audit visibility |
| Manage costs | [07](./01-plan-manage/challenge-07.md) | Pricing tiers, quotas, budgeting, optimization |
| Monitor Azure AI services | [06](./01-plan-manage/challenge-06.md), [08](./01-plan-manage/challenge-08.md) | Metrics, alerts, health monitoring, observability |
| Implement responsible AI practices | [09](./01-plan-manage/challenge-09.md), [10](./01-plan-manage/challenge-10.md) | Fairness, transparency, governance, safety |
| Deploy AI services in containers | [05](./01-plan-manage/challenge-05.md) | Containers, deployment models, disconnected scenarios |
| Manage keys and secure endpoints | [03](./01-plan-manage/challenge-03.md), [04](./01-plan-manage/challenge-04.md) | Key rotation, endpoint protection, secret handling |
| Plan and implement virtual network integration | [04](./01-plan-manage/challenge-04.md) | VNet integration, private endpoints, network isolation |

## Domain 2: Implement Generative AI and Agentic Solutions (35-40%)

Challenges: 11-23

| Skill | Challenges | Key Topics |
|---|---|---|
| Create Azure AI Foundry project | [11](./02-generative-ai-agents/challenge-11.md) | Project setup, hubs, connections, workspace organization |
| Select and deploy Azure OpenAI models | [12](./02-generative-ai-agents/challenge-12.md), [13](./02-generative-ai-agents/challenge-13.md) | Model choice, deployments, capacity, inference options |
| Implement RAG (Retrieval-Augmented Generation) | [14](./02-generative-ai-agents/challenge-14.md), [15](./02-generative-ai-agents/challenge-15.md) | Grounding, chunking, embeddings, retrieval pipeline |
| Implement prompt engineering | [16](./02-generative-ai-agents/challenge-16.md), [17](./02-generative-ai-agents/challenge-17.md) | System prompts, few-shot design, prompt tuning |
| Configure content filtering | [18](./02-generative-ai-agents/challenge-18.md) | Safety filters, abuse monitoring, response controls |
| Generate code and images with Azure OpenAI | [19](./02-generative-ai-agents/challenge-19.md) | Code generation, image generation, multimodal use cases |
| Implement orchestration flows | [20](./02-generative-ai-agents/challenge-20.md) | Flow design, chaining, evaluation loops, process orchestration |
| Manage token usage and rate limits | [12](./02-generative-ai-agents/challenge-12.md), [13](./02-generative-ai-agents/challenge-13.md) | TPM/RPM planning, quotas, cost-aware usage |
| Evaluate generative AI responses | [17](./02-generative-ai-agents/challenge-17.md), [20](./02-generative-ai-agents/challenge-20.md) | Quality metrics, groundedness, safety, output review |
| Design agent architecture | [21](./02-generative-ai-agents/challenge-21.md) | Agent patterns, memory, planning, tool strategy |
| Implement tool use and function calling | [22](./02-generative-ai-agents/challenge-22.md) | Tool schemas, function calling, action execution |
| Implement multi-agent orchestration | [23](./02-generative-ai-agents/challenge-23.md) | Agent collaboration, delegation, workflow coordination |

## Domain 3: Implement Computer Vision Solutions (10-15%)

Challenges: 24-30

| Skill | Challenges | Key Topics |
|---|---|---|
| Analyze images with Azure AI Vision | [24](./03-computer-vision/challenge-24.md) | Image analysis, tagging, captions, detection |
| Implement Custom Vision image classification | [25](./03-computer-vision/challenge-25.md) | Labels, training, evaluation, publishing |
| Implement Custom Vision object detection | [26](./03-computer-vision/challenge-26.md) | Bounding boxes, detection models, scoring |
| Implement OCR with Azure AI Vision | [27](./03-computer-vision/challenge-27.md) | Read API, printed text, handwriting extraction |
| Implement face detection and analysis | [28](./03-computer-vision/challenge-28.md) | Face detection, attributes, analysis constraints |
| Analyze video with Video Indexer | [29](./03-computer-vision/challenge-29.md) | Video insights, transcription, scene and speech analysis |
| Implement spatial analysis | [30](./03-computer-vision/challenge-30.md) | People movement, occupancy, spatial event processing |

## Domain 4: Implement Text Analysis Solutions (15-20%)

Challenges: 31-39

| Skill | Challenges | Key Topics |
|---|---|---|
| Analyze text (sentiment, entities, key phrases) | [31](./04-text-analysis/challenge-31.md), [32](./04-text-analysis/challenge-32.md) | NLP extraction, sentiment, entity recognition |
| Detect and redact PII | [33](./04-text-analysis/challenge-33.md) | PII detection, redaction workflows, compliance handling |
| Translate text and documents | [34](./04-text-analysis/challenge-34.md) | Text translation, document translation, multilingual processing |
| Implement speech-to-text | [35](./04-text-analysis/challenge-35.md) | Recognition, transcription, speech ingestion |
| Implement text-to-speech | [36](./04-text-analysis/challenge-36.md) | Voice synthesis, SSML, audio generation |
| Build CLU models | [37](./04-text-analysis/challenge-37.md) | Intents, entities, training, deployment |
| Create Custom Question Answering | [38](./04-text-analysis/challenge-38.md) | Knowledge sources, answer ranking, conversational responses |
| Implement speech translation | [39](./04-text-analysis/challenge-39.md) | Real-time translation, multilingual speech pipelines |

## Domain 5: Implement Information Extraction Solutions (15-20%)

Challenges: 40-48

| Skill | Challenges | Key Topics |
|---|---|---|
| Create and manage Azure AI Search indexes | [40](./05-information-extraction/challenge-40.md) | Index schema, fields, analyzers, lifecycle |
| Implement scoring profiles | [41](./05-information-extraction/challenge-41.md) | Relevance tuning, weights, boosting |
| Configure indexers and data sources | [42](./05-information-extraction/challenge-42.md) | Connectors, ingestion, scheduled indexing |
| Implement incremental enrichment | [43](./05-information-extraction/challenge-43.md) | Change tracking, enrichment updates, reprocessing strategy |
| Use built-in AI skills | [44](./05-information-extraction/challenge-44.md) | Skillsets, enrichment pipeline, cognitive skills |
| Create custom skills and knowledge stores | [45](./05-information-extraction/challenge-45.md) | Custom enrichment, projections, downstream consumption |
| Implement vector search and hybrid queries | [46](./05-information-extraction/challenge-46.md) | Embeddings, vector fields, hybrid retrieval |
| Implement advanced queries and filters | [47](./05-information-extraction/challenge-47.md) | Filters, facets, query syntax, result shaping |
| Analyze documents with Document Intelligence | [48](./05-information-extraction/challenge-48.md) | Prebuilt models, extraction, forms and layout analysis |

## Capstone

| Skill | Challenges | Key Topics |
|---|---|---|
| Integrate AI-103 skills in an end-to-end scenario | [49](./06-capstone/challenge-49.md) | Solution integration, tradeoffs, production readiness review |
