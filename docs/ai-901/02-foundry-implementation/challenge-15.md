---
sidebar_position: 2
title: "Challenge 15: Sentiment Analysis and Language Detection"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 15: Sentiment Analysis and Language Detection

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Implement AI with Azure Foundry (55-60%)
:::

## Exam skills covered

- Identify features and uses for sentiment analysis
- Identify features and uses for language modeling
- Identify Azure AI Language service capabilities

## Overview

**Sentiment analysis** determines whether text expresses positive, negative, neutral, or mixed feelings. It works at both the document level (overall sentiment) and the sentence level (individual statement sentiment). For example, a product review saying "The camera quality is amazing but the battery life is terrible" would be classified as "mixed" overall, with the first clause positive and the second negative.

Azure AI Language returns confidence scores for each sentiment (positive, negative, neutral) that add up to 1.0. A sentence like "The hotel was okay" might score 0.1 positive, 0.1 negative, 0.8 neutral — indicating the model is most confident it's neutral. This granularity helps businesses understand not just whether customers are happy, but how strongly they feel.

**Language detection** identifies which language a piece of text is written in and returns a confidence score. It supports 120+ languages and can detect even very short text samples. This capability is essential as a first step in multilingual processing pipelines — you need to know the language before you can analyze sentiment, extract entities, or translate content.

## Explore

### Task 1: Understand sentiment analysis scoring

Sentiment analysis returns scores for three categories. Review these examples:

| Text | Positive | Negative | Neutral | Overall |
|------|----------|----------|---------|---------|
| "I absolutely love this product!" | 0.98 | 0.01 | 0.01 | Positive |
| "The service was terrible and rude." | 0.01 | 0.97 | 0.02 | Negative |
| "The meeting is scheduled for Tuesday." | 0.05 | 0.02 | 0.93 | Neutral |
| "Great food but awful service." | 0.50 | 0.48 | 0.02 | Mixed |

**Key insight**: "Mixed" sentiment occurs when a document contains both positive and negative sentiments at the sentence level.

### Task 2: Try sentiment analysis in Language Studio

Navigate to: [language.cognitive.azure.com](https://language.cognitive.azure.com/)

1. Select **Classify text** → **Analyze sentiment and mine opinions**
2. Try these sample texts one at a time:

**Sample 1** (Positive):
> "The new Azure AI services are incredibly powerful and easy to use. The documentation is clear and the support team is very responsive."

**Sample 2** (Mixed):
> "The hotel room was spacious and clean with a beautiful view. However, the restaurant food was cold and overpriced, and checkout took forever."

**Sample 3** (Neutral):
> "The Azure AI Language service supports over 120 languages for text analysis. It is available in multiple Azure regions."

3. Observe how the service provides:
   - Document-level sentiment (overall)
   - Sentence-level sentiment (each sentence)
   - Confidence scores for each category

### Task 3: Explore opinion mining

Opinion mining is an advanced feature of sentiment analysis that identifies:
- **Targets** — what the opinion is about (e.g., "food," "staff," "battery")
- **Assessments** — the opinion expressed (e.g., "delicious," "friendly," "short")

Example:
> "The pizza was delicious but the delivery was slow."

| Target | Assessment | Sentiment |
|--------|-----------|-----------|
| pizza | delicious | Positive |
| delivery | slow | Negative |

This is valuable for understanding *what specifically* customers like or dislike.

### Task 4: Understand language detection

Language detection identifies the language of input text. Try these examples mentally:

| Input | Detected Language | Confidence | ISO Code |
|-------|------------------|------------|----------|
| "Hello, how are you?" | English | 1.0 | en |
| "Bonjour, comment allez-vous?" | French | 1.0 | fr |
| "こんにちは" | Japanese | 1.0 | ja |
| "asdf" | Unknown | 0.0 | (unknown) |

**Important behaviors**:
- Returns the language with highest confidence
- Returns "unknown" with NaN confidence for ambiguous or nonsensical input
- Works best with at least one sentence of text
- Can detect mixed-language documents (returns predominant language)

:::tip Azure CLI Alternative
```bash
# Call the sentiment analysis endpoint
az cognitiveservices account show \
  --name my-language-resource \
  --resource-group myResourceGroup \
  --query "properties.endpoint"
```
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Sentiment analysis | Determines whether text is positive, negative, neutral, or mixed |
| Document-level sentiment | The overall sentiment of an entire text document |
| Sentence-level sentiment | Individual sentiment classification for each sentence in a document |
| Opinion mining | Identifies specific targets (aspects) and the sentiments expressed about them |
| Confidence score | A value between 0 and 1 indicating how confident the model is in its prediction |
| Language detection | Identifies which human language text is written in |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| Sentiment analysis understands sarcasm perfectly | AI often struggles with sarcasm, irony, and cultural nuances — these may be misclassified |
| Mixed sentiment means the model is uncertain | Mixed means the document contains BOTH positive and negative sentiments; uncertainty shows as similar scores across categories |
| Language detection needs long text | It can work with even a single word, though accuracy improves with more text |
| Sentiment scores are always accurate for all domains | Pre-built models work best on general text; domain-specific language (medical, legal) may need custom models |
| Neutral means the model couldn't determine sentiment | Neutral is a legitimate classification — it means the text doesn't express positive or negative emotion (e.g., factual statements) |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-15-q1',
      question: 'A customer review states: "The camera is excellent but the battery drains too quickly." How would sentiment analysis classify this document?',
      options: ['Positive', 'Negative', 'Neutral', 'Mixed'],
      correctAnswer: 3,
      explanation: 'The review contains both a positive statement ("camera is excellent") and a negative statement ("battery drains too quickly"), so the overall document sentiment would be classified as Mixed.'
    },
    {
      id: 'ai900-15-q2',
      question: 'What does language detection return when it cannot identify the language of the input text?',
      options: ['English as default', 'An error message', 'Unknown with NaN confidence', 'The closest matching language'],
      correctAnswer: 2,
      explanation: 'When language detection cannot identify the language (e.g., nonsensical input), it returns "unknown" with a NaN (Not a Number) confidence score.'
    },
    {
      id: 'ai900-15-q3',
      question: 'A company processes customer feedback from 50 countries. Which capability should be applied FIRST in their NLP pipeline?',
      options: ['Sentiment analysis', 'Key phrase extraction', 'Language detection', 'Named entity recognition'],
      correctAnswer: 2,
      explanation: 'Language detection should be the first step in a multilingual pipeline. You need to know what language the text is in before you can properly analyze sentiment, extract phrases, or recognize entities.'
    },
    {
      id: 'ai900-15-q4',
      question: 'In sentiment analysis, what do confidence scores represent?',
      options: ['The strength of the emotion expressed', 'How confident the model is in each sentiment classification', 'The percentage of positive vs negative words', 'The number of sentiment-bearing sentences'],
      correctAnswer: 1,
      explanation: 'Confidence scores (between 0 and 1) represent how confident the model is that the text belongs to each sentiment category (positive, negative, neutral). They sum to 1.0.'
    },
    {
      id: 'ai900-15-q5',
      question: 'What does opinion mining add beyond basic sentiment analysis?',
      options: ['It detects the language of text', 'It identifies specific targets (aspects) and the sentiments about them', 'It translates negative reviews to positive ones', 'It predicts future customer sentiment trends'],
      correctAnswer: 1,
      explanation: 'Opinion mining goes beyond overall sentiment by identifying specific targets (what the opinion is about, like "food" or "service") and the assessment (the opinion expressed about that target, like "delicious" or "slow").'
    }
  ]}
/>

## Learn More

- [Sentiment analysis overview](https://learn.microsoft.com/en-us/azure/ai-services/language-service/sentiment-opinion-mining/overview)
- [Language detection overview](https://learn.microsoft.com/en-us/azure/ai-services/language-service/language-detection/overview)
- [Supported languages in Azure AI Language](https://learn.microsoft.com/en-us/azure/ai-services/language-service/language-detection/language-support)
- [Azure AI Language Studio](https://language.cognitive.azure.com/)
