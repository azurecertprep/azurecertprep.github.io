---
sidebar_position: 5
title: "Challenge 18: Azure AI Language and Speech Services"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 18: Azure AI Language and Speech Services

:::info Estimated Time
**25-30 min** | **Cost**: Free | **Domain**: Natural Language Processing (15-20%)
:::

## Exam skills covered

- Identify Azure AI Language service capabilities
- Identify Azure AI Speech service capabilities
- Describe features and uses for conversational language understanding (CLU)
- Describe features and uses for question answering

## Overview

Azure provides two primary services for natural language processing: **Azure AI Language** for text-based NLP and **Azure AI Speech** for audio-based processing. Understanding which service handles which capability — and when to combine them — is essential for the AI-900 exam.

**Azure AI Language** is the text analytics powerhouse. Beyond the pre-built capabilities (sentiment, entities, key phrases, language detection), it offers custom capabilities like **Conversational Language Understanding (CLU)** for building intent-recognition models, **custom question answering** for FAQ-style bots, **text summarization**, **PII detection**, and **custom text classification**. Think of it as "everything you can do with written text."

**Azure AI Speech** handles the spoken word. Beyond basic speech-to-text and text-to-speech, it provides **speech translation**, **speaker recognition** (identifying who is speaking), **keyword recognition** (wake words like "Hey Cortana"), and **pronunciation assessment**. Think of it as "everything you can do with audio/voice."

## Explore

### Task 1: Map Azure AI Language capabilities

Azure AI Language provides both pre-built (ready-to-use) and custom (trainable) capabilities:

**Pre-built capabilities** (no training required):

| Capability | What it does |
|-----------|-------------|
| Sentiment analysis | Determines positive/negative/neutral/mixed sentiment |
| Named entity recognition | Identifies people, places, organizations, dates |
| Key phrase extraction | Extracts main talking points from text |
| Language detection | Identifies which language text is written in |
| PII detection | Finds personally identifiable information (SSNs, emails, phone numbers) |
| Text summarization | Generates concise summaries of documents |
| Entity linking | Connects entities to Wikipedia knowledge base entries |

**Custom capabilities** (require training data):

| Capability | What it does |
|-----------|-------------|
| Conversational Language Understanding (CLU) | Recognizes user intents and extracts entities from natural language |
| Custom question answering | Builds FAQ-style knowledge bases for Q&A bots |
| Custom text classification | Classifies text into your own categories |
| Custom named entity recognition | Extracts domain-specific entities you define |

### Task 2: Understand Conversational Language Understanding (CLU)

CLU (formerly LUIS) helps you build applications that understand natural language commands:

**Key concepts**:
- **Utterance** — What the user says: "Book a flight to Paris next Friday"
- **Intent** — What the user wants to do: "BookFlight"
- **Entity** — Important details: "Paris" (destination), "next Friday" (date)

**Example project**:

| Utterance | Intent | Entities |
|-----------|--------|----------|
| "Turn on the living room lights" | TurnOn | Device: lights, Room: living room |
| "Set temperature to 72 degrees" | SetTemperature | Temperature: 72 |
| "What's the weather in Seattle?" | GetWeather | Location: Seattle |
| "Play some jazz music" | PlayMusic | Genre: jazz |

**Training workflow**:
1. Define intents (what users want to do)
2. Define entities (important information to extract)
3. Add example utterances (labeled with intents and entities)
4. Train and test the model
5. Deploy and integrate with your application

### Task 3: Explore custom question answering

Custom question answering (formerly QnA Maker) creates knowledge bases from existing content:

**Sources it can import**:
- FAQ web pages
- PDF documents
- Word documents
- Manual question-answer pairs

**How it works**:
1. Import content (FAQ pages, documents)
2. The service extracts question-answer pairs automatically
3. Add custom Q&A pairs and alternative phrasings
4. Test and refine responses
5. Deploy as a REST endpoint for chatbots

**Example knowledge base**:

| Question | Answer |
|---------|--------|
| What are your business hours? | We're open Monday-Friday, 9 AM to 5 PM EST. |
| How do I reset my password? | Go to the login page, click "Forgot Password," and follow the email instructions. |
| Do you offer free shipping? | Free shipping is available on orders over $50. |

### Task 4: Navigate Language Studio vs Speech Studio

Compare the two studios side by side:

**Azure AI Language Studio** ([language.cognitive.azure.com](https://language.cognitive.azure.com/)):
- Classify text (sentiment, custom classification)
- Extract information (entities, key phrases, PII, summarization)
- Understand questions and conversational language (CLU, Q&A)
- Translate text

**Azure AI Speech Studio** ([speech.microsoft.com](https://speech.microsoft.com/)):
- Speech-to-text (real-time and batch)
- Text-to-speech (voice gallery, custom voices)
- Speech translation
- Speaker recognition
- Pronunciation assessment
- Custom keyword recognition

**Decision guide** — Which service do I need?

| I want to... | Use |
|-------------|-----|
| Analyze text for sentiment | Azure AI Language |
| Transcribe audio recordings | Azure AI Speech |
| Build a chatbot that answers FAQs | Azure AI Language (Question Answering) |
| Create a voice assistant | Azure AI Speech + Azure AI Language |
| Detect PII in documents | Azure AI Language |
| Add a wake word ("Hey Assistant") | Azure AI Speech (Keyword Recognition) |
| Understand user commands in a smart home app | Azure AI Language (CLU) |
| Identify who is speaking in a recording | Azure AI Speech (Speaker Recognition) |

:::tip Azure CLI Alternative
```bash
# List capabilities of your Language resource
az cognitiveservices account show \
  --name my-language-resource \
  --resource-group myResourceGroup \
  --query "{name:name, kind:kind, sku:sku.name, endpoint:properties.endpoint}"
```
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Azure AI Language | Service for text-based NLP: sentiment, NER, CLU, Q&A, summarization, PII detection |
| Azure AI Speech | Service for audio-based processing: STT, TTS, speech translation, speaker recognition |
| Conversational Language Understanding (CLU) | Custom model that recognizes intents and entities in natural language input |
| Intent | What the user wants to accomplish (e.g., BookFlight, GetWeather) |
| Custom question answering | Knowledge base service for building FAQ-style Q&A experiences |
| Speaker recognition | Identifying or verifying a person's identity based on their voice |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| Azure AI Language and Azure AI Speech are the same service | They are separate services — Language handles text, Speech handles audio |
| CLU replaces all NLP capabilities | CLU is specifically for understanding intents and entities in conversational input; other capabilities (sentiment, NER) remain separate |
| Question answering requires programming a chatbot from scratch | You can import existing FAQ content and the service automatically creates Q&A pairs |
| Speaker recognition identifies what someone says | Speaker recognition identifies WHO is speaking, not what they say — that's speech-to-text |
| You need separate Azure resources for each NLP capability | A single Azure AI Language resource provides access to all Language capabilities (sentiment, NER, CLU, etc.) |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-18-q1',
      question: 'A company wants to build a smart home app that understands commands like "turn off the kitchen lights" and "set the thermostat to 70 degrees." Which capability should they use?',
      options: ['Sentiment analysis', 'Key phrase extraction', 'Conversational Language Understanding (CLU)', 'Text summarization'],
      correctAnswer: 2,
      explanation: 'CLU is designed to recognize user intents (TurnOff, SetTemperature) and extract entities (kitchen lights, 70 degrees) from natural language commands — exactly what a smart home app needs.'
    },
    {
      id: 'ai900-18-q2',
      question: 'A company has a 50-page FAQ document and wants to create a chatbot that answers customer questions from it. Which Azure AI capability should they use?',
      options: ['Named entity recognition', 'Custom question answering', 'Speech-to-text', 'Custom text classification'],
      correctAnswer: 1,
      explanation: 'Custom question answering can import FAQ documents, automatically extract Q&A pairs, and provide a REST endpoint that chatbots can query to find answers to customer questions.'
    },
    {
      id: 'ai900-18-q3',
      question: 'Which capability is part of Azure AI Speech (NOT Azure AI Language)?',
      options: ['Sentiment analysis', 'Named entity recognition', 'Speaker recognition', 'Key phrase extraction'],
      correctAnswer: 2,
      explanation: 'Speaker recognition (identifying who is speaking based on voice characteristics) is part of the Azure AI Speech service. Sentiment analysis, NER, and key phrase extraction are all Azure AI Language capabilities.'
    },
    {
      id: 'ai900-18-q4',
      question: 'In Conversational Language Understanding, what is an "intent"?',
      options: ['A specific piece of information extracted from user input', 'What the user wants to accomplish', 'The language the user is speaking', 'The sentiment of the user message'],
      correctAnswer: 1,
      explanation: 'An intent represents what the user wants to do or accomplish (e.g., BookFlight, GetWeather, TurnOnLights). Entities are the specific pieces of information extracted from the utterance.'
    },
    {
      id: 'ai900-18-q5',
      question: 'A company wants to automatically detect and redact Social Security numbers and email addresses from customer documents. Which Azure AI Language capability should they use?',
      options: ['Key phrase extraction', 'Sentiment analysis', 'PII detection', 'Custom text classification'],
      correctAnswer: 2,
      explanation: 'PII (Personally Identifiable Information) detection identifies sensitive information like SSNs, email addresses, phone numbers, and credit card numbers in text — and can optionally redact them.'
    }
  ]}
/>

## Learn More

- [Azure AI Language overview](https://learn.microsoft.com/en-us/azure/ai-services/language-service/overview)
- [Azure AI Speech overview](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/overview)
- [Conversational Language Understanding](https://learn.microsoft.com/en-us/azure/ai-services/language-service/conversational-language-understanding/overview)
- [Custom question answering](https://learn.microsoft.com/en-us/azure/ai-services/language-service/question-answering/overview)
- [Azure AI Language Studio](https://language.cognitive.azure.com/)
- [Azure AI Speech Studio](https://speech.microsoft.com/)
