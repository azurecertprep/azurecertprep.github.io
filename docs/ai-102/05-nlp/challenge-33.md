---
sidebar_position: 4
title: "Challenge 33: Text and Document Translation"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 33: Text and Document Translation

:::info Estimated Time
**50 min** | **Cost**: $2-5 (estimated) | **Domain**: Implement NLP Solutions (15-20%)
:::

## Exam skills covered
- Translate text using Azure Translator service
- Translate documents preserving formatting
- Implement custom translation models for domain-specific terms

## Overview

Azure Translator provides:

| Feature | Description |
|---------|-------------|
| **Text Translation** | Real-time translation of text (up to 50,000 chars) |
| **Document Translation** | Translate entire documents preserving layout |
| **Custom Translator** | Train models for domain terminology |
| **Transliteration** | Convert scripts (e.g., Japanese kanji → romaji) |
| **Language Detection** | Auto-detect source language |
| **Dictionary** | Lookup alternative translations |

The Text Translator uses a **global endpoint**: `https://api.cognitive.microsofttranslator.com`

## Prerequisites
- Azure subscription
- Azure Translator resource
- Python 3.9+ with `requests` library
- For Document Translation: Azure Blob Storage container

## Implementation

### Task 1: Create Translator Resource

```bash
az group create --name rg-ai102-translator --location eastus2

az cognitiveservices account create \
  --name translator-ai102 \
  --resource-group rg-ai102-translator \
  --kind TextTranslation \
  --sku S1 \
  --location eastus2

TRANSLATOR_KEY=$(az cognitiveservices account keys list --name translator-ai102 --resource-group rg-ai102-translator --query key1 -o tsv)
TRANSLATOR_REGION="eastus2"
```

### Task 2: Translate Text

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import requests
import uuid

key = os.environ["AZURE_TRANSLATOR_KEY"]
region = os.environ["AZURE_TRANSLATOR_REGION"]
endpoint = "https://api.cognitive.microsofttranslator.com"

def translate_text(texts, target_languages, source_language=None):
    """Translate text to one or more target languages"""
    path = "/translate"
    params = {
        "api-version": "3.0",
        "to": target_languages
    }
    if source_language:
        params["from"] = source_language
    
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": region,
        "Content-type": "application/json",
        "X-ClientTraceId": str(uuid.uuid4())
    }
    
    body = [{"text": t} for t in texts]
    
    response = requests.post(
        endpoint + path,
        params=params,
        headers=headers,
        json=body
    )
    response.raise_for_status()
    return response.json()

# Translate to multiple languages simultaneously
texts = [
    "Azure AI services make it easy to build intelligent applications.",
    "The weather in Seattle is rainy today."
]

results = translate_text(texts, target_languages=["es", "fr", "ja"])

for i, result in enumerate(results):
    detected = result.get("detectedLanguage", {})
    print(f"\nSource: '{texts[i]}'")
    if detected:
        print(f"  Detected language: {detected['language']} ({detected['score']:.2f})")
    for translation in result["translations"]:
        print(f"  → [{translation['to']}] {translation['text']}")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
TRANSLATOR_KEY="<your-key>"
REGION="eastus2"

# Translate text to multiple languages
curl -s "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=es&to=fr&to=ja" \
  -H "Ocp-Apim-Subscription-Key: ${TRANSLATOR_KEY}" \
  -H "Ocp-Apim-Subscription-Region: ${REGION}" \
  -H "Content-Type: application/json" \
  -d '[{"text": "Azure AI services make it easy to build intelligent apps."}]' \
  | jq '.[0].translations[] | {language: .to, text}'
```

</TabItem>
</Tabs>

### Task 3: Document Translation (Batch)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import time

# Document Translation requires Azure Blob Storage
# Source container: contains documents to translate
# Target container: receives translated documents

translator_endpoint = os.environ.get("AZURE_TRANSLATOR_DOCUMENT_ENDPOINT",
    "https://translator-ai102.cognitiveservices.azure.com")

def translate_documents(source_url, target_url, target_language):
    """Translate all documents in source container to target container"""
    path = "/translator/document/batches"
    url = translator_endpoint + path
    
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/json"
    }
    
    body = {
        "inputs": [
            {
                "source": {
                    "sourceUrl": source_url,
                    "language": "en"
                },
                "targets": [
                    {
                        "targetUrl": target_url,
                        "language": target_language
                    }
                ]
            }
        ]
    }
    
    response = requests.post(url, headers=headers, json=body, params={"api-version": "2024-05-01"})
    
    if response.status_code == 202:
        operation_url = response.headers["Operation-Location"]
        print(f"Translation started: {operation_url}")
        return operation_url
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return None

def poll_translation_status(operation_url):
    """Poll until translation completes"""
    headers = {"Ocp-Apim-Subscription-Key": key}
    
    while True:
        response = requests.get(operation_url, headers=headers)
        result = response.json()
        status = result["status"]
        print(f"  Status: {status}")
        
        if status in ["Succeeded", "Failed", "Cancelled"]:
            return result
        time.sleep(5)

# Example usage (requires storage SAS URLs)
source_sas = "https://storage.blob.core.windows.net/source-docs?sv=...&sig=..."
target_sas = "https://storage.blob.core.windows.net/translated-es?sv=...&sig=..."

# operation_url = translate_documents(source_sas, target_sas, "es")
# result = poll_translation_status(operation_url)
print("Document translation configured (requires Blob Storage SAS URLs)")
```

</TabItem>
</Tabs>

### Task 4: Transliteration

<Tabs>
<TabItem value="python" label="Python SDK">

```python
def transliterate(texts, language, from_script, to_script):
    """Convert text from one script to another"""
    path = "/transliterate"
    params = {
        "api-version": "3.0",
        "language": language,
        "fromScript": from_script,
        "toScript": to_script
    }
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": region,
        "Content-type": "application/json"
    }
    body = [{"text": t} for t in texts]
    
    response = requests.post(endpoint + path, params=params, headers=headers, json=body)
    return response.json()

# Convert Japanese to Latin script
results = transliterate(["こんにちは世界"], "ja", "Jpan", "Latn")
for r in results:
    print(f"Transliterated: {r['text']}")  # "konnichiwa sekai"

# Convert Hindi Devanagari to Latin
results = transliterate(["नमस्ते दुनिया"], "hi", "Deva", "Latn")
for r in results:
    print(f"Transliterated: {r['text']}")  # "namaste duniya"
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Transliterate Japanese to Latin
curl -s "https://api.cognitive.microsofttranslator.com/transliterate?api-version=3.0&language=ja&fromScript=Jpan&toScript=Latn" \
  -H "Ocp-Apim-Subscription-Key: ${TRANSLATOR_KEY}" \
  -H "Ocp-Apim-Subscription-Region: ${REGION}" \
  -H "Content-Type: application/json" \
  -d '[{"text": "こんにちは世界"}]' | jq '.[0].text'
```

</TabItem>
</Tabs>

## Expected Output

```text
Source: 'Azure AI services make it easy to build intelligent applications.'
  Detected language: en (1.00)
  → [es] Los servicios de Azure AI facilitan la creación de aplicaciones inteligentes.
  → [fr] Les services Azure AI facilitent la création d'applications intelligentes.
  → [ja] Azure AIサービスを使用すると、インテリジェントなアプリケーションを簡単に構築できます。

Source: 'The weather in Seattle is rainy today.'
  Detected language: en (1.00)
  → [es] El clima en Seattle está lluvioso hoy.
  → [fr] Le temps à Seattle est pluvieux aujourd'hui.
  → [ja] 今日のシアトルの天気は雨です。

Transliterated: konnichiwa sekai
Transliterated: namaste duniya
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| 401 Unauthorized | Auth failed | Missing region header | Include `Ocp-Apim-Subscription-Region` header |
| Empty translations | No results | Missing `to` parameter | Specify at least one target language |
| Wrong language detected | Mistranslation | Short text or ambiguous | Specify `from` parameter explicitly for known source |
| Document translation 400 | Bad request | Invalid SAS token or container | Verify SAS has read (source) and write (target) permissions |
| Transliteration error | Script not supported | Invalid script code | Check supported scripts per language via `/languages` endpoint |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What is the global endpoint for the Azure Translator text API?",
    options: [
      "https://<resource>.cognitiveservices.azure.com/translate",
      "https://translator.azure.com/api",
      "https://api.cognitive.microsofttranslator.com",
      "https://<resource>.translator.azure.com"
    ],
    correctAnswer: 2,
    explanation: "The Text Translator uses the global endpoint https://api.cognitive.microsofttranslator.com. It requires the Ocp-Apim-Subscription-Region header for regional routing."
  },
  {
    question: "Which header is required in addition to the subscription key for Translator requests?",
    options: [
      "Ocp-Apim-Subscription-Region (specifying the resource's Azure region)",
      "Content-Length",
      "Accept-Language",
      "X-Forwarded-For"
    ],
    correctAnswer: 0,
    explanation: "The Ocp-Apim-Subscription-Region header is required to route the request to the correct regional endpoint. Without it, requests fail with 401."
  },
  {
    question: "How does Document Translation differ from Text Translation?",
    options: [
      "Document Translation is synchronous; Text Translation is async",
      "Document Translation supports more languages",
      "There is no difference — they use the same endpoint",
      "Document Translation translates entire files (preserving formatting) via Blob Storage; Text Translation handles raw text strings"
    ],
    correctAnswer: 3,
    explanation: "Document Translation is asynchronous — it translates entire files (Word, PDF, etc.) between Blob Storage containers while preserving original formatting and layout."
  },
  {
    question: "What does transliteration do?",
    options: [
      "Translates text from one language to another",
      "Converts text from one writing script to another within the same language (e.g., Japanese kanji to romaji)",
      "Detects the language of input text",
      "Corrects spelling errors in translated text"
    ],
    correctAnswer: 1,
    explanation: "Transliteration converts text between scripts without changing the language — e.g., Japanese kanji → Latin (romaji), Hindi Devanagari → Latin."
  },
  {
    question: "How many target languages can you specify in a single text translation request?",
    options: [
      "Only 1 target language per request",
      "Maximum of 2 target languages",
      "Multiple target languages by repeating the 'to' parameter",
      "Unlimited, but only the first 5 are processed"
    ],
    correctAnswer: 2,
    explanation: "You can translate to multiple languages in one request by specifying the 'to' parameter multiple times (e.g., to=es&to=fr&to=ja). Each translation appears in the response."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-translator --yes --no-wait
```

## Learn More

- [Translator overview](https://learn.microsoft.com/azure/ai-services/translator/translator-overview)
- [Text Translation quickstart](https://learn.microsoft.com/azure/ai-services/translator/quickstart-text-rest-api)
- [Document Translation](https://learn.microsoft.com/azure/ai-services/translator/document-translation/overview)
- [Custom Translator](https://learn.microsoft.com/azure/ai-services/translator/custom-translator/overview)
