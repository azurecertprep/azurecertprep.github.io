---
sidebar_position: 1
title: "Challenge 14: Text Analytics: Key Phrases and Entities"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 14: Text Analytics: Key Phrases and Entities

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Natural Language Processing (15-20%)
:::

## Exam skills covered

- Identify features and uses for key phrase extraction
- Identify features and uses for entity recognition
- Identify Azure AI Language service capabilities

## Overview

Text analytics is the process of extracting meaningful information from unstructured text. Two fundamental capabilities are **key phrase extraction** and **named entity recognition (NER)** — both available through the Azure AI Language service.

**Key phrase extraction** identifies the main talking points in a document. Given a paragraph about a hotel review, it might extract "friendly staff," "clean rooms," and "great location." This helps you quickly understand what a document is about without reading the entire text. Common use cases include document summarization, content tagging, and search indexing.

**Named entity recognition** identifies and categorizes entities in text — people, places, organizations, dates, quantities, and more. For example, in the sentence "Microsoft was founded by Bill Gates in 1975 in Albuquerque," NER would identify "Microsoft" (organization), "Bill Gates" (person), "1975" (date/time), and "Albuquerque" (location). This powers applications like automated data extraction, content classification, and knowledge graph construction.

## Explore

### Task 1: Understand key phrase extraction

Key phrase extraction pulls out the most important talking points from text. Review these examples:

| Input Text | Extracted Key Phrases |
|-----------|----------------------|
| "The food was delicious and the staff were wonderful at the restaurant near the beach." | food, staff, restaurant, beach |
| "Azure AI services provide pre-built machine learning models for common scenarios." | Azure AI services, pre-built machine learning models, common scenarios |
| "The quarterly earnings report showed increased revenue in the European market." | quarterly earnings report, increased revenue, European market |

**Your task**: Think of a paragraph from your work (an email, report, or document). What key phrases would you expect the service to extract?

### Task 2: Explore named entity recognition

Navigate to the Azure AI Language Studio demo: [language.cognitive.azure.com](https://language.cognitive.azure.com/)

1. Select **Classify text** → **Named entity recognition**
2. Try the following sample text:

> "On January 15, 2024, Contoso Ltd. announced a $2.5 billion investment in their Seattle headquarters. CEO Jane Smith said the expansion would create 5,000 new jobs."

Expected entity categories:

| Entity | Category | Subcategory |
|--------|----------|-------------|
| January 15, 2024 | DateTime | Date |
| Contoso Ltd. | Organization | — |
| $2.5 billion | Quantity | Currency |
| Seattle | Location | City |
| Jane Smith | Person | — |
| 5,000 | Quantity | Number |

### Task 3: Compare key phrases vs. entities

These two capabilities serve different purposes:

| Capability | What it extracts | Best for |
|-----------|-----------------|----------|
| Key phrase extraction | Important concepts and topics | Understanding what text is about |
| Entity recognition | Specific named things (people, places, dates) | Extracting structured data from text |

**Your task**: For the sentence "Microsoft CEO Satya Nadella announced new AI features at the Build conference in Seattle on May 21, 2024":
- Key phrases would be: Microsoft CEO, Satya Nadella, new AI features, Build conference, Seattle
- Entities would be: Microsoft (Org), Satya Nadella (Person), Build (Event), Seattle (Location), May 21, 2024 (DateTime)

### Task 4: Explore entity categories

Azure AI Language recognizes many entity categories. Browse the documentation:
[Entity categories in Azure AI Language](https://learn.microsoft.com/en-us/azure/ai-services/language-service/named-entity-recognition/concepts/named-entity-categories)

Key categories include:
- **Person** — People's names
- **Location** — Physical locations, geographic entities
- **Organization** — Companies, institutions, agencies
- **DateTime** — Dates, times, durations
- **Quantity** — Numbers, percentages, currencies
- **Event** — Historical or named events
- **Product** — Physical or digital products
- **Skill** — Capabilities or expertise areas

:::tip Azure CLI Alternative
```bash
# Create an Azure AI Language resource (Free tier)
az cognitiveservices account create \
  --name my-language-resource \
  --resource-group myResourceGroup \
  --kind TextAnalytics \
  --sku F0 \
  --location eastus
```
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Key phrase extraction | Identifies main talking points and important concepts in text |
| Named entity recognition (NER) | Detects and categorizes named entities (people, places, orgs, dates) in text |
| Entity category | The classification type assigned to a detected entity (Person, Location, etc.) |
| Entity linking | Connects recognized entities to known knowledge base entries (e.g., Wikipedia) |
| Azure AI Language | The Azure service that provides text analytics capabilities including NER and key phrases |
| PII detection | A related NER capability that specifically identifies personally identifiable information |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| Key phrases and entities are the same thing | Key phrases capture important concepts/topics; entities identify specific named things with categories |
| NER only works in English | Azure AI Language supports NER in many languages including Spanish, French, German, Chinese, and more |
| You need to train a model for basic NER | Pre-built NER works out of the box; custom NER is only needed for domain-specific entity types |
| Key phrase extraction understands meaning | It uses statistical patterns to identify important phrases — it doesn't truly "understand" context |
| Entity recognition is 100% accurate | Accuracy depends on context, language, and domain; ambiguous text may produce incorrect categorizations |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-14-q1',
      question: 'A company wants to automatically tag customer support tickets with the main topics discussed. Which text analytics capability is most appropriate?',
      options: ['Named entity recognition', 'Key phrase extraction', 'Sentiment analysis', 'Language detection'],
      correctAnswer: 1,
      explanation: 'Key phrase extraction identifies the main talking points and topics in text, making it ideal for automatically tagging documents with their primary subjects.'
    },
    {
      id: 'ai900-14-q2',
      question: 'Which entity category would "Microsoft" be classified as by named entity recognition?',
      options: ['Person', 'Product', 'Organization', 'Skill'],
      correctAnswer: 2,
      explanation: 'Microsoft is a company and would be categorized as an Organization entity. Person is for people\'s names, Product is for goods/services, and Skill is for capabilities.'
    },
    {
      id: 'ai900-14-q3',
      question: 'What is the primary difference between key phrase extraction and named entity recognition?',
      options: ['Key phrases work only in English while NER works in all languages', 'Key phrases identify important topics while NER identifies and categorizes specific named things', 'NER is faster than key phrase extraction', 'Key phrase extraction requires training while NER does not'],
      correctAnswer: 1,
      explanation: 'Key phrase extraction identifies important concepts and topics in text, while NER identifies specific named entities (people, places, organizations, dates) and assigns them categories.'
    },
    {
      id: 'ai900-14-q4',
      question: 'A legal firm wants to automatically extract all person names, dates, and monetary amounts from contracts. Which capability should they use?',
      options: ['Key phrase extraction', 'Text summarization', 'Named entity recognition', 'Language detection'],
      correctAnswer: 2,
      explanation: 'Named entity recognition identifies and categorizes specific entities like Person names, DateTime values, and Quantity/Currency amounts — exactly what the legal firm needs to extract from contracts.'
    },
    {
      id: 'ai900-14-q5',
      question: 'Which Azure service provides both key phrase extraction and named entity recognition as pre-built capabilities?',
      options: ['Azure Machine Learning', 'Azure AI Language', 'Azure AI Vision', 'Azure OpenAI Service'],
      correctAnswer: 1,
      explanation: 'Azure AI Language (formerly Text Analytics) provides pre-built NLP capabilities including key phrase extraction, named entity recognition, sentiment analysis, and language detection.'
    }
  ]}
/>

## Learn More

- [What is Azure AI Language?](https://learn.microsoft.com/en-us/azure/ai-services/language-service/overview)
- [Key phrase extraction overview](https://learn.microsoft.com/en-us/azure/ai-services/language-service/key-phrase-extraction/overview)
- [Named entity recognition overview](https://learn.microsoft.com/en-us/azure/ai-services/language-service/named-entity-recognition/overview)
- [Azure AI Language Studio](https://language.cognitive.azure.com/)
