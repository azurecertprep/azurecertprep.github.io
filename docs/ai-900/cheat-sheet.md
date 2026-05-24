---
sidebar_position: 5
title: "Azure AI Services Cheat Sheet"
---

# Azure AI Services Cheat Sheet

## Azure AI services hierarchy

```text
Azure AI services (umbrella)
â”œâ”€â”€ Azure AI Vision
â”œâ”€â”€ Azure AI Language
â”œâ”€â”€ Azure AI Speech
â”œâ”€â”€ Azure AI Document Intelligence
â”œâ”€â”€ Azure AI Translator
â”œâ”€â”€ Azure AI Content Safety
â””â”€â”€ Azure OpenAI Service (separate resource)

Azure Machine Learning (separate platform)
â””â”€â”€ Workspace â†’ Compute â†’ Pipelines â†’ AutoML â†’ Models
```

## Vision services

| Service | What it does | Key features |
|---|---|---|
| **Azure AI Vision** | Analyze images and video | Image Analysis, OCR, spatial analysis, image captioning |
| **Face API** (part of AI Vision) | Detect and recognize faces | Face detection, verification, identification, emotion (limited) |
| **Custom Vision** | Train custom image models | Image classification, object detection with your own data |

**When to use which:**
- Need general image analysis? â†’ **Azure AI Vision**
- Need to train on your own images? â†’ **Custom Vision**
- Need to detect/verify faces? â†’ **Face API**

## Language services

| Service | What it does | Key features |
|---|---|---|
| **Azure AI Language** | Understand and analyze text | Sentiment analysis, key phrase extraction, entity recognition, CLU, summarization, QnA |
| **CLU (Conversational Language Understanding)** | Build intent + entity models | Replaces LUIS; custom NLU for chatbots and apps |
| **Azure AI Translator** | Translate text between languages | 100+ languages, custom models, document translation |
| **QnA (Question Answering)** | Build knowledge bases from FAQs | Part of Azure AI Language; replaces QnA Maker |

## Speech services

| Service | What it does | Key features |
|---|---|---|
| **Speech-to-Text** | Convert audio to text | Real-time and batch transcription, custom models |
| **Text-to-Speech** | Convert text to audio | Neural voices, custom voice, SSML support |
| **Speech Translation** | Translate spoken language in real time | Combines recognition + translation |
| **Speaker Recognition** | Identify/verify who is speaking | Voice profiles, verification, identification |

## Document Intelligence

| Service | What it does | Key features |
|---|---|---|
| **Azure AI Document Intelligence** | Extract structured data from documents | Pre-built models (invoices, receipts, ID), custom models, layout analysis |

> âš ï¸ Formerly called "Form Recognizer" â€” exam may reference either name.

## Azure OpenAI Service

| Feature | Details |
|---|---|
| **GPT models** | Text generation, chat completion, summarization, code generation |
| **DALL-E** | Image generation from text prompts |
| **Embeddings** | Vector representations for semantic search and RAG |
| **Whisper** | Audio transcription model |
| **Access** | Requires application/approval; deployed via Azure OpenAI resource |

## Azure Machine Learning

| Component | Purpose |
|---|---|
| **Workspace** | Central hub for all ML assets (data, models, compute, experiments) |
| **Compute** | Training clusters, compute instances, inference endpoints |
| **Designer** | Drag-and-drop ML pipeline builder (no code) |
| **AutoML** | Automatically trains and tunes models from your data |
| **Pipelines** | Orchestrate multi-step ML workflows |
| **Model Registry** | Version and manage trained models |
| **Endpoints** | Deploy models as REST APIs (real-time or batch) |

## Responsible AI â€” 6 principles

| Principle | Definition | Example |
|---|---|---|
| **Fairness** | AI treats all people equitably | Loan model doesn't discriminate by gender |
| **Reliability & Safety** | AI performs reliably under expected conditions | Self-driving car handles edge cases safely |
| **Privacy & Security** | AI respects privacy and is secure | Training data is anonymized and encrypted |
| **Inclusiveness** | AI empowers everyone | App works for users with disabilities |
| **Transparency** | AI systems are understandable | Users know when they're interacting with AI |
| **Accountability** | People are accountable for AI systems | Human review process for high-stakes decisions |

## Key differences table

| Old name | New name | Notes |
|---|---|---|
| Cognitive Services | Azure AI services | Umbrella rebrand (2023) |
| Form Recognizer | Azure AI Document Intelligence | Same capabilities, new name |
| LUIS | CLU (Azure AI Language) | Conversational Language Understanding |
| QnA Maker | Question Answering (Azure AI Language) | Now part of Language service |
| Metrics Advisor | Azure AI Anomaly Detector | Consolidated |

| Comparison | When to use A | When to use B |
|---|---|---|
| **Custom Vision** vs **Azure AI Vision** | You need to train on your own labeled images | You need general-purpose image analysis (out-of-the-box) |
| **CLU** vs **Prebuilt Language features** | You need custom intents/entities for your domain | Standard tasks (sentiment, key phrases, NER) suffice |
| **Azure ML** vs **Azure AI services** | You need to build/train/deploy custom models | You need a pre-built API for a common AI task |
| **Azure OpenAI** vs **Azure AI Language** | You need generative text, chat, or code | You need analytical NLP (sentiment, extraction) |

## ML concepts quick reference

| Term | Meaning |
|---|---|
| **Feature** | An input variable used for prediction (e.g., age, income) |
| **Label** | The value you're trying to predict (e.g., price, category) |
| **Training** | Feeding data to an algorithm so it learns patterns |
| **Validation** | Testing the model on held-out data to measure accuracy |
| **Inference** | Using a trained model to make predictions on new data |
| **Overfitting** | Model memorizes training data; performs poorly on new data |
| **Underfitting** | Model is too simple; misses patterns in data |
