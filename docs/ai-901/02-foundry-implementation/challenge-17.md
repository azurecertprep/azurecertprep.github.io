---
sidebar_position: 4
title: "Challenge 17: Language Translation"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 17: Language Translation

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Implement AI with Azure Foundry (55-60%)
:::

## Exam skills covered

- Identify features and uses for translation
- Identify Azure AI Language service capabilities

## Overview

**Azure AI Translator** is a cloud-based service that translates text between 100+ languages in real time. It powers scenarios from simple text translation to complex document translation while preserving the original formatting. The service uses neural machine translation (NMT), which produces more fluent and natural-sounding translations than older statistical methods.

Translation in Azure comes in several forms. **Text translation** handles individual strings or batches of text via API calls. **Document translation** processes entire documents (PDF, Word, PowerPoint, etc.) while maintaining their original layout, styles, and formatting. **Custom Translator** lets organizations build domain-specific translation models trained on their own terminology — essential for industries like legal, medical, or manufacturing where generic translation may not handle specialized vocabulary correctly.

Azure also provides **speech translation**, part of the Azure AI Speech service, which translates spoken audio from one language to another in real time. This enables scenarios like live multilingual meetings and real-time conversation translation between people speaking different languages.

## Explore

### Task 1: Understand translation capabilities

Azure provides multiple translation approaches for different scenarios:

| Capability | Service | Use Case |
|-----------|---------|----------|
| Text translation | Azure AI Translator | Translate UI strings, chat messages, short text |
| Document translation | Azure AI Translator | Translate PDFs, Word docs while keeping formatting |
| Custom Translator | Azure AI Translator | Domain-specific translation (legal, medical terms) |
| Speech translation | Azure AI Speech | Real-time spoken language translation |

### Task 2: Explore supported languages

Navigate to: [learn.microsoft.com/azure/ai-services/translator/language-support](https://learn.microsoft.com/en-us/azure/ai-services/translator/language-support)

1. Notice the 100+ supported languages
2. Observe that not all features support all languages:
   - Text translation: broadest language support
   - Document translation: slightly fewer languages
   - Transliteration: converts script (e.g., Japanese Kanji → Latin characters)
3. Some languages support translation in both directions; others may be one-way only

**Key language features**:

| Feature | Description | Example |
|---------|-------------|---------|
| Translation | Convert text from one language to another | English → Spanish |
| Transliteration | Convert text from one script to another | Hindi (Devanagari → Latin) |
| Language detection | Identify source language automatically | Auto-detect before translating |
| Dictionary lookup | Get alternative translations for a word | "bank" → "banco" (financial) or "orilla" (riverside) |

### Task 3: Try the Translator demo

Navigate to: [azure.microsoft.com/products/ai-services/ai-translator](https://azure.microsoft.com/en-us/products/ai-services/ai-translator/)

Or try the Azure AI Translator demo in the portal to see:
1. Real-time text translation between languages
2. Auto-detection of source language
3. Multiple target languages from a single source

**Sample translation flow**:
```text
Input:  "Cloud computing delivers IT resources over the internet."
Source: English (auto-detected)
Target: Spanish → "La computación en la nube ofrece recursos de TI a través de internet."
Target: French  → "L'informatique en nuage fournit des ressources informatiques via Internet."
Target: Japanese → "クラウドコンピューティングは、インターネットを通じてITリソースを提供します。"
```

### Task 4: Understand Custom Translator

Custom Translator is used when generic translation isn't good enough for specialized domains:

| Scenario | Why custom translation helps |
|---------|---------------------------|
| Medical records | Standard translation may not handle drug names, procedures, or anatomical terms correctly |
| Legal contracts | Legal terminology has precise meanings that generic translation might miss |
| Manufacturing manuals | Product-specific terms and technical jargon need consistent translation |
| Gaming localization | Brand names, character names, and fantasy terms need preservation |

**How Custom Translator works**:
1. Upload parallel documents (same content in source and target language)
2. The service trains a customized model using your terminology
3. Deploy the custom model and call it like standard translation
4. Minimum requirement: 10,000 parallel sentences for best quality

**Your task**: Think of a domain you work in. What specialized terms might a generic translator get wrong?

:::tip Azure CLI Alternative
```bash
# Create a Translator resource (Free tier - 2M characters/month)
az cognitiveservices account create \
  --name my-translator-resource \
  --resource-group myResourceGroup \
  --kind TextTranslation \
  --sku F0 \
  --location global
```
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Neural machine translation | AI-based translation that produces natural, fluent translations using deep learning |
| Text translation | Translating individual text strings or batches between languages via API |
| Document translation | Translating entire documents while preserving formatting and layout |
| Custom Translator | Building domain-specific translation models trained on your own parallel data |
| Transliteration | Converting text from one script to another (e.g., Cyrillic to Latin) |
| Speech translation | Real-time translation of spoken audio from one language to another |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| Machine translation is always perfect | Translation quality varies by language pair and domain; specialized content may need custom models |
| You must specify the source language | Azure AI Translator can auto-detect the source language — you only need to specify the target |
| Document translation loses all formatting | Document translation specifically preserves the original layout, styles, and formatting |
| Custom Translator requires millions of examples | It can produce useful results with as few as 10,000 parallel sentences, though more data improves quality |
| Translation and transliteration are the same | Translation changes meaning between languages; transliteration changes script while keeping the same language |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-17-q1',
      question: 'A company needs to translate 500 PDF contracts from English to German while keeping the original formatting intact. Which capability should they use?',
      options: ['Text translation API', 'Document translation', 'Custom Translator', 'Speech translation'],
      correctAnswer: 1,
      explanation: 'Document translation processes entire documents (PDF, Word, etc.) while preserving their original layout, styles, and formatting — exactly what is needed for translating formatted contracts.'
    },
    {
      id: 'ai900-17-q2',
      question: 'What is the purpose of transliteration in Azure AI Translator?',
      options: ['Translating text between languages', 'Improving translation quality with custom models', 'Detecting the language of text', 'Converting text from one script to another within the same language'],
      correctAnswer: 3,
      explanation: 'Transliteration converts text from one writing script to another (e.g., Japanese Kanji to Latin characters, or Hindi Devanagari to Latin script) without changing the language itself.'
    },
    {
      id: 'ai900-17-q3',
      question: 'A pharmaceutical company finds that standard translation mishandles drug names and medical procedures. What should they implement?',
      options: ['More API calls to improve accuracy', 'Custom Translator trained on their medical terminology', 'Switch to speech translation instead', 'Use language detection before translation'],
      correctAnswer: 1,
      explanation: 'Custom Translator lets organizations build domain-specific translation models trained on parallel documents containing their specialized terminology, ensuring drug names and procedures are translated correctly.'
    },
    {
      id: 'ai900-17-q4',
      question: 'Which Azure service provides real-time spoken language translation during a multilingual meeting?',
      options: ['Azure AI Speech (speech translation)', 'Azure AI Language', 'Azure AI Translator (text)', 'Azure AI Vision'],
      correctAnswer: 0,
      explanation: 'Speech translation, part of the Azure AI Speech service, translates spoken audio from one language to another in real time — ideal for live multilingual meetings and conversations.'
    },
    {
      id: 'ai900-17-q5',
      question: 'When using Azure AI Translator for text translation, what happens if you do not specify the source language?',
      options: ['The API returns an error', 'It defaults to English', 'It automatically detects the source language', 'It translates from all supported languages simultaneously'],
      correctAnswer: 2,
      explanation: 'Azure AI Translator includes automatic language detection. If you do not specify the source language, the service auto-detects it before performing the translation.'
    }
  ]}
/>

## Learn More

- [What is Azure AI Translator?](https://learn.microsoft.com/en-us/azure/ai-services/translator/translator-overview)
- [Translator language support](https://learn.microsoft.com/en-us/azure/ai-services/translator/language-support)
- [Document translation overview](https://learn.microsoft.com/en-us/azure/ai-services/translator/document-translation/overview)
- [Custom Translator overview](https://learn.microsoft.com/en-us/azure/ai-services/translator/custom-translator/overview)
