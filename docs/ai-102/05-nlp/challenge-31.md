---
sidebar_position: 2
title: "Challenge 31: Text Analytics - Key Phrases, Entities, Sentiment"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 31: Text Analytics - Key Phrases, Entities, Sentiment

:::info Estimated Time
**45 min** | **Cost**: $1-3 (estimated) | **Domain**: Implement NLP Solutions (15-20%)
:::

## Exam skills covered
- Extract key phrases from text
- Recognize named entities and linked entities
- Determine sentiment with opinion mining
- Detect language

## Overview

Azure AI Language (Text Analytics) provides NLP capabilities:

| Feature | Description |
|---------|-------------|
| **Sentiment Analysis** | Positive/neutral/negative with confidence + opinion mining |
| **Key Phrase Extraction** | Identify main talking points |
| **Named Entity Recognition (NER)** | Detect entities (Person, Location, Organization, DateTime, etc.) |
| **Entity Linking** | Link entities to Wikipedia knowledge base |
| **Language Detection** | Identify language of text |

The client supports **batch operations** â€” send multiple documents in one request for efficiency.

## Prerequisites
- Azure subscription
- Azure AI Language resource (or multi-service)
- Python 3.9+ or .NET 8
- Package: `azure-ai-textanalytics` (v5.3+)

## Implementation

### Task 1: Create Language Resource

```bash
az group create --name rg-ai102-nlp --location eastus2

az cognitiveservices account create \
  --name language-ai102 \
  --resource-group rg-ai102-nlp \
  --kind TextAnalytics \
  --sku S \
  --location eastus2

ENDPOINT=$(az cognitiveservices account show --name language-ai102 --resource-group rg-ai102-nlp --query properties.endpoint -o tsv)
KEY=$(az cognitiveservices account keys list --name language-ai102 --resource-group rg-ai102-nlp --query key1 -o tsv)
```

### Task 2: Analyze Sentiment with Opinion Mining

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.ai.textanalytics import TextAnalyticsClient
from azure.core.credentials import AzureKeyCredential

client = TextAnalyticsClient(
    endpoint=os.environ["AZURE_AI_ENDPOINT"],
    credential=AzureKeyCredential(os.environ["AZURE_AI_KEY"])
)

documents = [
    "The hotel room was clean and spacious, but the service was slow and unfriendly.",
    "I absolutely love this product! Fast delivery and excellent quality.",
    "The meeting was scheduled for 3 PM."
]

# Sentiment analysis with opinion mining
results = client.analyze_sentiment(
    documents,
    show_opinion_mining=True,
    language="en"
)

for idx, result in enumerate(results):
    if result.is_error:
        print(f"Doc {idx}: Error - {result.error.message}")
        continue
    
    print(f"Document {idx}: '{documents[idx][:50]}...'")
    print(f"  Overall: {result.sentiment} "
          f"(pos={result.confidence_scores.positive:.3f}, "
          f"neu={result.confidence_scores.neutral:.3f}, "
          f"neg={result.confidence_scores.negative:.3f})")
    
    for sentence in result.sentences:
        print(f"  Sentence: '{sentence.text[:40]}...' â†’ {sentence.sentiment}")
        
        # Opinion mining - aspect-based sentiment
        for mined_opinion in sentence.mined_opinions:
            target = mined_opinion.target
            print(f"    Target: '{target.text}' ({target.sentiment})")
            for assessment in mined_opinion.assessments:
                print(f"      Assessment: '{assessment.text}' ({assessment.sentiment})")
    print()
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.TextAnalytics;

var client = new TextAnalyticsClient(
    new Uri(Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")),
    new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_AI_KEY")));

var documents = new List<string>
{
    "The hotel room was clean and spacious, but the service was slow.",
    "I absolutely love this product! Fast delivery and excellent quality."
};

var options = new AnalyzeSentimentOptions { IncludeOpinionMining = true };
var results = client.AnalyzeSentimentBatch(documents, "en", options);

foreach (var result in results)
{
    Console.WriteLine($"Sentiment: {result.DocumentSentiment.Sentiment}");
    foreach (var sentence in result.DocumentSentiment.Sentences)
    {
        Console.WriteLine($"  '{sentence.Text}' -> {sentence.Sentiment}");
        foreach (var opinion in sentence.Opinions)
        {
            Console.WriteLine($"    Target: '{opinion.Target.Text}' ({opinion.Target.Sentiment})");
            foreach (var assessment in opinion.Assessments)
                Console.WriteLine($"      '{assessment.Text}' ({assessment.Sentiment})");
        }
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="https://<resource>.cognitiveservices.azure.com"
KEY="<your-key>"

curl -s "${ENDPOINT}/language/:analyze-text?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "SentimentAnalysis",
    "parameters": {"opinionMining": true},
    "analysisInput": {
      "documents": [
        {"id": "1", "language": "en", "text": "The hotel was great but the food was terrible."}
      ]
    }
  }' | jq '.results.documents[0]'
```

</TabItem>
</Tabs>

### Task 3: Extract Key Phrases and Named Entities

<Tabs>
<TabItem value="python" label="Python SDK">

```python
documents = [
    "Microsoft CEO Satya Nadella announced Azure AI updates at the Build 2024 conference in Seattle on May 21.",
    "The quarterly revenue increased by 15% to $62 billion, driven by cloud services growth."
]

# Key phrase extraction
key_phrases_results = client.extract_key_phrases(documents, language="en")
print("=== KEY PHRASES ===")
for idx, result in enumerate(key_phrases_results):
    if not result.is_error:
        print(f"Doc {idx}: {result.key_phrases}")

# Named Entity Recognition
ner_results = client.recognize_entities(documents, language="en")
print("\n=== NAMED ENTITIES ===")
for idx, result in enumerate(ner_results):
    if not result.is_error:
        print(f"Doc {idx}:")
        for entity in result.entities:
            print(f"  '{entity.text}' â†’ {entity.category}"
                  f"{f'/{entity.subcategory}' if entity.subcategory else ''}"
                  f" (confidence: {entity.confidence_score:.3f})")

# Entity Linking (to Wikipedia)
linked_results = client.recognize_linked_entities(documents, language="en")
print("\n=== LINKED ENTITIES ===")
for idx, result in enumerate(linked_results):
    if not result.is_error:
        for entity in result.entities:
            print(f"  '{entity.name}' â†’ {entity.url}")
            print(f"    Data source: {entity.data_source}, ID: {entity.data_source_entity_id}")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Key phrases
curl -s "${ENDPOINT}/language/:analyze-text?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "KeyPhraseExtraction",
    "analysisInput": {
      "documents": [{"id": "1", "language": "en", "text": "Microsoft announced Azure AI updates at Build 2024 in Seattle."}]
    }
  }' | jq '.results.documents[0].keyPhrases'

# Named entities
curl -s "${ENDPOINT}/language/:analyze-text?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "EntityRecognition",
    "analysisInput": {
      "documents": [{"id": "1", "language": "en", "text": "Microsoft CEO Satya Nadella announced Azure AI updates at Build 2024 in Seattle on May 21."}]
    }
  }' | jq '.results.documents[0].entities[] | {text, category, confidenceScore}'
```

</TabItem>
</Tabs>

### Task 4: Language Detection

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Language detection
multilingual_docs = [
    "Hello, how are you today?",
    "Bonjour, comment allez-vous?",
    "ã“ã‚“ã«ã¡ã¯ã€å…ƒæ°—ã§ã™ã‹ï¼Ÿ",
    "Hola, Â¿cÃ³mo estÃ¡s?"
]

lang_results = client.detect_language(multilingual_docs)
print("=== LANGUAGE DETECTION ===")
for idx, result in enumerate(lang_results):
    if not result.is_error:
        lang = result.primary_language
        print(f"  '{multilingual_docs[idx][:30]}...' â†’ {lang.name} ({lang.iso6391_name}) "
              f"confidence: {lang.confidence_score:.3f}")
```

</TabItem>
</Tabs>

## Expected Output

```text
Document 0: 'The hotel room was clean and spacious, but the s...'
  Overall: mixed (pos=0.450, neu=0.100, neg=0.450)
  Sentence: 'The hotel room was clean and sp...' â†’ mixed
    Target: 'room' (positive)
      Assessment: 'clean' (positive)
      Assessment: 'spacious' (positive)
    Target: 'service' (negative)
      Assessment: 'slow' (negative)
      Assessment: 'unfriendly' (negative)

=== KEY PHRASES ===
Doc 0: ['Microsoft CEO Satya Nadella', 'Azure AI updates', 'Build 2024 conference', 'Seattle']

=== NAMED ENTITIES ===
Doc 0:
  'Microsoft' â†’ Organization (confidence: 0.990)
  'Satya Nadella' â†’ Person (confidence: 0.985)
  'Azure AI' â†’ Product (confidence: 0.920)
  'Build 2024' â†’ Event (confidence: 0.880)
  'Seattle' â†’ Location (confidence: 0.995)
  'May 21' â†’ DateTime/Date (confidence: 0.970)

=== LANGUAGE DETECTION ===
  'Hello, how are you today?...' â†’ English (en) confidence: 1.000
  'Bonjour, comment allez-vous?...' â†’ French (fr) confidence: 1.000
  'ã“ã‚“ã«ã¡ã¯ã€å…ƒæ°—ã§ã™ã‹ï¼Ÿ...' â†’ Japanese (ja) confidence: 1.000
  'Hola, Â¿cÃ³mo estÃ¡s?...' â†’ Spanish (es) confidence: 1.000
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Mixed results on clear text | Unexpected `mixed` sentiment | Opinion mining detects opposing opinions | Use sentence-level sentiment for granularity |
| Empty key phrases | No phrases returned | Text too short or generic | Provide substantive text (10+ words recommended) |
| Entity category `Unknown` | Unrecognized entities | Domain-specific terms not in model | Use custom NER model for specialized entities |
| Batch error on one doc | `InvalidDocument` in results | Document exceeds 5,120 characters | Split long documents; check `is_error` per document |
| Wrong language detection | Incorrect language | Mixed-language text confuses detection | Separate text by language; use longer samples |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What does opinion mining add to standard sentiment analysis?",
    options: [
      "It provides more accurate overall sentiment scores",
      "It translates text before analyzing sentiment",
      "It identifies specific targets (aspects) and the assessments (opinions) about them",
      "It detects the language of the text"
    ],
    correctAnswer: 2,
    explanation: "Opinion mining extracts aspect-based sentiment: targets (e.g., 'room', 'service') and assessments (e.g., 'clean', 'slow') with their individual sentiment polarity."
  },
  {
    question: "What is the maximum document size for a single text analytics request?",
    options: [
      "5,120 characters per document (up to 25 documents per batch)",
      "1,000 characters per document",
      "10,000 words per document",
      "No limit"
    ],
    correctAnswer: 0,
    explanation: "Each document can be up to 5,120 characters. A single batch request can contain up to 25 documents (or 125,000 characters total)."
  },
  {
    question: "What is the difference between Named Entity Recognition (NER) and Entity Linking?",
    options: [
      "NER is faster; Entity Linking is more accurate",
      "They are the same feature with different names",
      "NER works only in English; Entity Linking supports all languages",
      "NER categorizes entities (Person, Location, etc.); Entity Linking connects entities to Wikipedia knowledge base entries"
    ],
    correctAnswer: 3,
    explanation: "NER identifies entities and assigns categories (Person, Org, Location, DateTime). Entity Linking goes further by matching entities to Wikipedia entries with URLs and IDs."
  },
  {
    question: "How should you handle errors in batch text analytics results?",
    options: [
      "Catch a single exception for the entire batch",
      "Check the is_error property on each individual document result",
      "Errors are never returned â€” failed documents are silently skipped",
      "Retry the entire batch if any document fails"
    ],
    correctAnswer: 1,
    explanation: "In batch operations, each document result has an is_error property. Some documents may succeed while others fail, so you must check each result individually."
  },
  {
    question: "What confidence score format does language detection return?",
    options: [
      "A percentage from 0% to 100%",
      "An integer from 1 to 10",
      "A float from 0.0 to 1.0 indicating detection confidence",
      "A boolean (detected or not detected)"
    ],
    correctAnswer: 2,
    explanation: "Language detection returns a confidence score from 0.0 to 1.0 for each detected language. A score of 1.0 means maximum confidence."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-nlp --yes --no-wait
```

## Learn More

- [Text Analytics overview](https://learn.microsoft.com/azure/ai-services/language-service/overview)
- [Sentiment analysis](https://learn.microsoft.com/azure/ai-services/language-service/sentiment-opinion-mining/overview)
- [Named entity recognition](https://learn.microsoft.com/azure/ai-services/language-service/named-entity-recognition/overview)
- [Key phrase extraction](https://learn.microsoft.com/azure/ai-services/language-service/key-phrase-extraction/overview)
