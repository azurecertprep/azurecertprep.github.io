---
sidebar_position: 10
title: "Challenge 39: Custom Translation Models"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 39: Custom Translation Models

:::info Estimated Time
**60 min** | **Cost**: $5-15 (estimated) | **Domain**: Implement NLP Solutions (15-20%)
:::

## Exam skills covered
- Implement custom text translation models
- Train and evaluate custom translation with parallel data
- Publish and consume custom translation models
- Implement multi-language question answering

## Overview

Custom Translator trains domain-specific translation models using your parallel data (source-target sentence pairs). This improves translation accuracy for specialized terminology:

| Concept | Description |
|---------|-------------|
| **Parallel data** | Aligned sentence pairs in source and target languages |
| **BLEU score** | Translation quality metric (0-100, higher = better) |
| **Category ID** | Identifier used to route requests to your custom model |
| **Baseline** | Microsoft's general translation model (comparison point) |
| **Training** | Fine-tuning the baseline with your parallel data |

Multi-language Question Answering allows a single knowledge base to serve answers in multiple languages.

:::note Portal-Based Operations
Some Custom Translator operations (project creation, file upload) are primarily done via the [Custom Translator portal](https://portal.customtranslator.azure.ai/). This challenge documents the workflow and programmatic consumption of trained models.
:::

## Prerequisites
- Azure subscription
- Azure Translator resource (S1 tier for custom translation)
- Parallel training data (TMX, XLIFF, TSV, or TXT files)
- Custom Translator portal access

## Implementation

### Task 1: Prepare Parallel Training Data

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os

# Custom translation requires parallel data - aligned sentences
# Format: Tab-separated source and target (or separate aligned files)

# Example: Medical domain English-to-Spanish parallel data
training_data_tsv = """The patient presents with acute bronchitis.\tEl paciente presenta bronquitis aguda.
Administer 500mg amoxicillin three times daily.\tAdministrar 500mg de amoxicilina tres veces al día.
Blood pressure reading is 120 over 80.\tLa lectura de presión arterial es 120 sobre 80.
The MRI shows no abnormalities.\tLa resonancia magnética no muestra anomalías.
Schedule a follow-up appointment in two weeks.\tProgramar una cita de seguimiento en dos semanas.
Patient reports chest pain and shortness of breath.\tEl paciente reporta dolor en el pecho y dificultad para respirar.
Prescribe ibuprofen 400mg as needed for pain.\tRecetar ibuprofeno 400mg según sea necesario para el dolor.
The biopsy results are benign.\tLos resultados de la biopsia son benignos.
Apply topical antibiotic ointment twice daily.\tAplicar ungüento antibiótico tópico dos veces al día.
Refer patient to cardiology for further evaluation.\tReferir al paciente a cardiología para evaluación adicional."""

# Save training file
with open("medical-training-en-es.tsv", "w", encoding="utf-8") as f:
    f.write(training_data_tsv)

# Tuning data (separate set for validation)
tuning_data = """Patient exhibits symptoms of type 2 diabetes.\tEl paciente exhibe síntomas de diabetes tipo 2.
Recommend physical therapy twice a week.\tRecomendar fisioterapia dos veces por semana.
Lab results indicate elevated cholesterol.\tLos resultados del laboratorio indican colesterol elevado."""

with open("medical-tuning-en-es.tsv", "w", encoding="utf-8") as f:
    f.write(tuning_data)

# Testing data (for BLEU evaluation)
test_data = """Administer insulin injection before meals.\tAdministrar inyección de insulina antes de las comidas.
The X-ray reveals a hairline fracture.\tLa radiografía revela una fractura capilar."""

with open("medical-test-en-es.tsv", "w", encoding="utf-8") as f:
    f.write(test_data)

print("Training data files created:")
print(f"  medical-training-en-es.tsv ({training_data_tsv.count(chr(10))+1} sentence pairs)")
print(f"  medical-tuning-en-es.tsv (3 sentence pairs)")
print(f"  medical-test-en-es.tsv (2 sentence pairs)")
print("\nNote: Production models need 10,000+ sentence pairs for significant improvement.")
```

</TabItem>
</Tabs>

### Task 2: Custom Translator Workflow (Portal + API)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import requests
import uuid

# Custom Translator portal workflow:
# 1. Create a workspace at https://portal.customtranslator.azure.ai
# 2. Create a project (specify language pair: en → es)
# 3. Upload parallel documents (training, tuning, testing)
# 4. Train the model
# 5. Publish the model (get Category ID)

# After training in the portal, you'll receive a Category ID
# Use this to route translation requests to your custom model

CATEGORY_ID = os.environ.get("CUSTOM_TRANSLATOR_CATEGORY_ID", "your-category-id")

# The BLEU score comparison after training:
print("""
Custom Translation Training Results (example):
================================================
Model: Medical-EN-ES-v1
Language pair: English → Spanish
Training sentences: 10,000
BLEU Score (baseline): 42.5
BLEU Score (custom):   58.3 (+15.8 improvement)
Status: Published
Category ID: {CATEGORY_ID}

Interpretation:
  - BLEU < 30: Low quality (general model may be better for this pair)
  - BLEU 30-40: Reasonable quality
  - BLEU 40-60: Good quality
  - BLEU > 60: Excellent quality
""")
```

</TabItem>
</Tabs>

### Task 3: Consume Custom Translation Model

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import requests
import uuid

key = os.environ["AZURE_TRANSLATOR_KEY"]
region = os.environ["AZURE_TRANSLATOR_REGION"]
endpoint = "https://api.cognitive.microsofttranslator.com"
category_id = os.environ.get("CUSTOM_TRANSLATOR_CATEGORY_ID", "general")

def translate_with_custom_model(texts, source_lang, target_lang, category=None):
    """Translate using custom model by specifying category"""
    path = "/translate"
    params = {
        "api-version": "3.0",
        "from": source_lang,
        "to": target_lang,
    }
    if category:
        params["category"] = category  # Routes to custom model
    
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": region,
        "Content-type": "application/json",
        "X-ClientTraceId": str(uuid.uuid4())
    }
    
    body = [{"text": t} for t in texts]
    response = requests.post(endpoint + path, params=params, headers=headers, json=body)
    response.raise_for_status()
    return response.json()

# Test sentences with medical terminology
medical_texts = [
    "The patient presents with acute myocardial infarction.",
    "Administer epinephrine 0.3mg intramuscularly immediately.",
    "Schedule an echocardiogram to assess ventricular function."
]

# Compare general vs custom model
print("=== General Model (baseline) ===")
general_results = translate_with_custom_model(medical_texts, "en", "es", category="general")
for i, result in enumerate(general_results):
    print(f"  EN: {medical_texts[i]}")
    print(f"  ES: {result['translations'][0]['text']}\n")

print("=== Custom Model (medical domain) ===")
custom_results = translate_with_custom_model(medical_texts, "en", "es", category=category_id)
for i, result in enumerate(custom_results):
    print(f"  EN: {medical_texts[i]}")
    print(f"  ES: {result['translations'][0]['text']}\n")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
TRANSLATOR_KEY="<key>"
REGION="eastus2"
CATEGORY_ID="<your-category-id>"

# Translate with custom model (add category parameter)
curl -s "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=es&category=${CATEGORY_ID}" \
  -H "Ocp-Apim-Subscription-Key: ${TRANSLATOR_KEY}" \
  -H "Ocp-Apim-Subscription-Region: ${REGION}" \
  -H "Content-Type: application/json" \
  -d '[{"text": "The patient presents with acute myocardial infarction."}]' \
  | jq '.[0].translations[0].text'

# Compare with general model (category=general or omit)
curl -s "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=es&category=general" \
  -H "Ocp-Apim-Subscription-Key: ${TRANSLATOR_KEY}" \
  -H "Ocp-Apim-Subscription-Region: ${REGION}" \
  -H "Content-Type: application/json" \
  -d '[{"text": "The patient presents with acute myocardial infarction."}]' \
  | jq '.[0].translations[0].text'
```

</TabItem>
</Tabs>

### Task 4: Multi-Language Question Answering

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.ai.language.questionanswering import QuestionAnsweringClient
from azure.core.credentials import AzureKeyCredential

# Multi-language QA: one knowledge base serving multiple languages
# The project must be created with multilingualResource=True

qa_client = QuestionAnsweringClient(
    endpoint=os.environ["AZURE_AI_ENDPOINT"],
    credential=AzureKeyCredential(os.environ["AZURE_AI_KEY"])
)

# Query in different languages against the same knowledge base
multilingual_queries = [
    ("What is Azure AI?", "en"),
    ("¿Qué es Azure AI?", "es"),
    ("Azure AIとは何ですか？", "ja"),
    ("Qu'est-ce qu'Azure AI?", "fr")
]

print("=== Multi-Language QA ===")
for question, lang in multilingual_queries:
    response = qa_client.get_answers(
        question=question,
        project_name="faq-knowledge-base",
        deployment_name="production",
        language=lang
    )
    
    if response.answers:
        top_answer = response.answers[0]
        print(f"\n[{lang}] Q: {question}")
        print(f"     A: {top_answer.answer[:80]}...")
        print(f"     Confidence: {top_answer.confidence:.3f}")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Query in Spanish against English knowledge base
curl -s "${ENDPOINT}/language/:query-knowledgebases?projectName=faq-knowledge-base&deploymentName=production&api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "¿Qué es Azure AI?",
    "top": 1,
    "language": "es"
  }' | jq '.answers[0] | {answer: .answer[0:100], confidence: .confidenceScore}'
```

</TabItem>
</Tabs>

## Expected Output

```text
Training data files created:
  medical-training-en-es.tsv (10 sentence pairs)
  medical-tuning-en-es.tsv (3 sentence pairs)
  medical-test-en-es.tsv (2 sentence pairs)

Custom Translation Training Results (example):
================================================
Model: Medical-EN-ES-v1
BLEU Score (baseline): 42.5
BLEU Score (custom):   58.3 (+15.8 improvement)

=== General Model (baseline) ===
  EN: The patient presents with acute myocardial infarction.
  ES: El paciente se presenta con infarto agudo de miocardio.

=== Custom Model (medical domain) ===
  EN: The patient presents with acute myocardial infarction.
  ES: El paciente presenta infarto agudo al miocardio.

=== Multi-Language QA ===
[en] Q: What is Azure AI?
     A: Azure AI Services is a collection of cloud-based AI APIs that help developers...
     Confidence: 0.953
[es] Q: ¿Qué es Azure AI?
     A: Azure AI Services is a collection of cloud-based AI APIs...
     Confidence: 0.891
[ja] Q: Azure AIとは何ですか？
     A: Azure AI Services is a collection of cloud-based AI APIs...
     Confidence: 0.845
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Custom model not used | General translations returned | Category ID not specified or incorrect | Verify `category` parameter matches published model's Category ID |
| Low BLEU score | No improvement over baseline | Insufficient training data or poor alignment | Need 10,000+ aligned sentence pairs; verify alignment quality |
| Training fails | Upload rejected | File format incorrect | Use supported formats: TMX, XLIFF, TSV, aligned TXT |
| Category not found | 400 error on translation | Model not published or expired | Publish model in Custom Translator portal; check expiration |
| Multi-language QA poor | Low confidence cross-language | Project not configured as multilingual | Enable `multilingualResource: true` when creating project |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "How do you route a translation request to your custom model?",
    options: [
      "Use a different API endpoint",
      "Include the model name in the request body",
      "Add the 'category' parameter with your model's Category ID to the translate request",
      "Custom models are used automatically once published"
    ],
    correctAnswer: 2,
    explanation: "The category parameter routes requests to your custom model. Without it (or with category='general'), the default Microsoft model is used."
  },
  {
    question: "What is the BLEU score used for in Custom Translator?",
    options: [
      "Evaluating translation quality by comparing custom model output against reference translations (0-100 scale)",
      "Measuring translation speed",
      "Calculating the cost of translation",
      "Measuring the number of supported languages"
    ],
    correctAnswer: 0,
    explanation: "BLEU (Bilingual Evaluation Understudy) measures translation quality against reference translations. Higher scores (0-100) indicate better quality; compare custom vs baseline scores."
  },
  {
    question: "What type of training data does Custom Translator require?",
    options: [
      "Only source language text — the model learns target language automatically",
      "A dictionary of terminology",
      "Example translations from Google Translate",
      "Parallel data: aligned sentence pairs in both source and target languages"
    ],
    correctAnswer: 3,
    explanation: "Custom Translator requires parallel data — sentence-aligned pairs in both languages. The model learns domain patterns from these aligned examples."
  },
  {
    question: "How does multi-language Question Answering work?",
    options: [
      "You must create a separate knowledge base for each language",
      "A single multilingual knowledge base can answer questions in multiple languages using cross-language matching",
      "Questions must be translated to the KB language before querying",
      "Only English knowledge bases support multi-language"
    ],
    correctAnswer: 1,
    explanation: "With multilingualResource=true, a single knowledge base can match questions in any supported language to answers, using cross-language semantic understanding."
  },
  {
    question: "What is the minimum recommended amount of parallel training data for meaningful improvement?",
    options: [
      "10 sentence pairs",
      "100 sentence pairs",
      "1 million sentence pairs",
      "10,000+ sentence pairs for significant domain-specific improvement"
    ],
    correctAnswer: 3,
    explanation: "Microsoft recommends 10,000+ aligned sentence pairs for meaningful improvement. More data (especially diverse, domain-specific content) generally produces better models."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-translator --yes --no-wait
```

## Learn More

- [Custom Translator overview](https://learn.microsoft.com/azure/ai-services/translator/custom-translator/overview)
- [Custom Translator portal](https://portal.customtranslator.azure.ai/)
- [BLEU score explanation](https://learn.microsoft.com/azure/ai-services/translator/custom-translator/concepts/bleu-score)
- [Multi-language QA](https://learn.microsoft.com/azure/ai-services/language-service/question-answering/how-to/multiple-languages)
