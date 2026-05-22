---
sidebar_position: 3
title: "Challenge 32: PII Detection and Redaction"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 32: PII Detection and Redaction

:::info Estimated Time
**40 min** | **Cost**: $1-2 (estimated) | **Domain**: Implement NLP Solutions (15-20%)
:::

## Exam skills covered
- Detect PII (Personally Identifiable Information) in text
- Redact sensitive data from documents
- Configure PII categories for targeted detection

## Overview

PII Detection identifies and optionally redacts sensitive information in text. Categories include:

| Category | Examples |
|----------|----------|
| `Person` | Names |
| `Email` | email@domain.com |
| `PhoneNumber` | +1-555-123-4567 |
| `Address` | Street addresses |
| `SSN` | Social Security Numbers (US) |
| `CreditCardNumber` | Credit card numbers |
| `IPAddress` | IP addresses |
| `Organization` | Company names (when PII) |
| `DateTime` | Dates of birth |

The API returns both detected entities and a **redacted text** version with PII replaced by entity category labels.

## Prerequisites
- Azure subscription
- Azure AI Language resource
- Python 3.9+ or .NET 8
- Package: `azure-ai-textanalytics` (v5.3+)

## Implementation

### Task 1: Detect PII in Text

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.ai.textanalytics import TextAnalyticsClient, PiiEntityCategory
from azure.core.credentials import AzureKeyCredential

client = TextAnalyticsClient(
    endpoint=os.environ["AZURE_AI_ENDPOINT"],
    credential=AzureKeyCredential(os.environ["AZURE_AI_KEY"])
)

documents = [
    "My name is John Smith and my email is john.smith@contoso.com. "
    "My SSN is 123-45-6789 and I live at 123 Main Street, Seattle, WA 98101. "
    "You can reach me at 555-123-4567.",
    
    "Patient Jane Doe (DOB: 03/15/1985) was seen at the clinic. "
    "Insurance ID: ABC-123456789. Credit card ending in 4532."
]

# Detect all PII
results = client.recognize_pii_entities(documents, language="en")

for idx, result in enumerate(results):
    if result.is_error:
        print(f"Error: {result.error.message}")
        continue
    
    print(f"Document {idx}:")
    print(f"  Redacted: {result.redacted_text}")
    print(f"  Entities found: {len(result.entities)}")
    
    for entity in result.entities:
        print(f"    [{entity.category}] '{entity.text}' "
              f"(confidence: {entity.confidence_score:.3f}, "
              f"offset: {entity.offset}, length: {entity.length})")
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

string document = "My name is John Smith, email: john@contoso.com, SSN: 123-45-6789.";

var response = client.RecognizePiiEntities(document, "en");

Console.WriteLine($"Redacted: {response.Value.RedactedText}");
foreach (var entity in response.Value)
{
    Console.WriteLine($"  [{entity.Category}] '{entity.Text}' (confidence: {entity.ConfidenceScore:F3})");
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
    "kind": "PiiEntityRecognition",
    "parameters": {"domain": "none"},
    "analysisInput": {
      "documents": [
        {"id": "1", "language": "en", "text": "John Smith SSN 123-45-6789, email john@contoso.com"}
      ]
    }
  }' | jq '.results.documents[0] | {redactedText, entities: [.entities[] | {text, category, confidenceScore}]}'
```

</TabItem>
</Tabs>

### Task 2: Filter by Specific PII Categories

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Detect only specific PII categories
results = client.recognize_pii_entities(
    documents,
    language="en",
    categories_filter=[
        PiiEntityCategory.US_SOCIAL_SECURITY_NUMBER,
        PiiEntityCategory.CREDIT_CARD_NUMBER,
        PiiEntityCategory.EMAIL,
        PiiEntityCategory.PHONE_NUMBER
    ]
)

print("=== FILTERED PII (SSN, CC, Email, Phone only) ===")
for idx, result in enumerate(results):
    if not result.is_error:
        print(f"Doc {idx} redacted: {result.redacted_text}")
        for entity in result.entities:
            print(f"  [{entity.category}] '{entity.text}'")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Filter specific categories
curl -s "${ENDPOINT}/language/:analyze-text?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "PiiEntityRecognition",
    "parameters": {
      "piiCategories": ["USSocialSecurityNumber", "CreditCardNumber", "Email", "PhoneNumber"]
    },
    "analysisInput": {
      "documents": [{"id": "1", "language": "en", "text": "John Smith SSN 123-45-6789 email john@contoso.com phone 555-123-4567"}]
    }
  }' | jq '.results.documents[0].redactedText'
```

</TabItem>
</Tabs>

### Task 3: Domain-Specific PII (PHI for Healthcare)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Use healthcare domain for PHI (Protected Health Information)
healthcare_docs = [
    "Patient John Doe, MRN: 12345, was diagnosed with diabetes on 01/15/2024. "
    "Prescribed metformin 500mg. Next appointment: 02/15/2024 with Dr. Smith."
]

results = client.recognize_pii_entities(
    healthcare_docs,
    language="en",
    domain_filter="phi"  # Protected Health Information domain
)

print("=== PHI DETECTION (Healthcare Domain) ===")
for result in results:
    if not result.is_error:
        print(f"Redacted: {result.redacted_text}\n")
        for entity in result.entities:
            print(f"  [{entity.category}] '{entity.text}' ({entity.confidence_score:.3f})")
```

</TabItem>
</Tabs>

## Expected Output

```
Document 0:
  Redacted: My name is ********* and my email is ********************.
  My SSN is *********** and I live at *********************************.
  You can reach me at ************.
  Entities found: 5
    [Person] 'John Smith' (confidence: 0.950, offset: 11, length: 10)
    [Email] 'john.smith@contoso.com' (confidence: 0.990, offset: 38, length: 22)
    [USSocialSecurityNumber] '123-45-6789' (confidence: 0.980, offset: 72, length: 11)
    [Address] '123 Main Street, Seattle, WA 98101' (confidence: 0.920, offset: 98, length: 35)
    [PhoneNumber] '555-123-4567' (confidence: 0.970, offset: 152, length: 12)

=== FILTERED PII (SSN, CC, Email, Phone only) ===
Doc 0 redacted: My name is John Smith and my email is *********************.
  My SSN is *********** and I live at 123 Main Street, Seattle, WA 98101.
  You can reach me at ************.

=== PHI DETECTION (Healthcare Domain) ===
Redacted: Patient ********, MRN: *****, was diagnosed with diabetes on **********...
  [Person] 'John Doe' (0.980)
  [MedicalRecordNumber] '12345' (0.920)
  [DateTime] '01/15/2024' (0.990)
```

## Break and Fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| PII not detected | Entity missed | Unusual format or low confidence | Lower threshold; check supported formats |
| Over-redaction | Non-PII text removed | Broad category detection | Use `categories_filter` to target specific PII types |
| Wrong category | Email detected as URL | Ambiguous patterns | Categories overlap; check confidence and use filtering |
| Redaction format wrong | Stars instead of labels | Default redaction uses `*` characters | Redacted text replaces PII with asterisks by default |
| PHI not detected | Healthcare entities missed | Using default domain | Set `domain_filter="phi"` for healthcare-specific detection |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What does the redacted_text property contain?",
    options: [
      "The original text with PII entities highlighted",
      "The original text with detected PII replaced by asterisk characters matching the entity length",
      "A summary of the text without any sensitive information",
      "The text translated to a different language"
    ],
    correctAnswer: 1,
    explanation: "redacted_text contains the original text with all detected PII entities replaced by asterisk (*) characters matching the length of the original PII text."
  },
  {
    question: "How do you limit PII detection to only specific categories like SSN and email?",
    options: [
      "Use a different API endpoint for each category",
      "Pass a categories_filter parameter with the desired PiiEntityCategory values",
      "Create a custom model trained on those categories only",
      "PII detection always returns all categories — filter client-side"
    ],
    correctAnswer: 1,
    explanation: "The categories_filter parameter (SDK) or piiCategories (REST) limits detection to only the specified categories, reducing noise from unwanted detections."
  },
  {
    question: "What is the 'phi' domain filter used for?",
    options: [
      "Detecting philosophical content",
      "Detecting Protected Health Information in healthcare/medical text",
      "Detecting phishing attempts",
      "Detecting physical addresses only"
    ],
    correctAnswer: 1,
    explanation: "The 'phi' (Protected Health Information) domain activates healthcare-specific PII detection including medical record numbers, diagnosis dates, and other HIPAA-relevant entities."
  },
  {
    question: "What information does each detected PII entity include?",
    options: [
      "Only the text and category",
      "Text, category, subcategory, confidence score, offset, and length",
      "Only the redacted position",
      "Text, category, and a unique entity ID"
    ],
    correctAnswer: 1,
    explanation: "Each PII entity includes: the matched text, category, optional subcategory, confidence score (0.0-1.0), character offset in the document, and length."
  },
  {
    question: "Can PII detection process multiple documents in a single request?",
    options: [
      "No — only one document per request",
      "Yes — batch operations support up to 25 documents per request",
      "Yes — unlimited documents per request",
      "Only if documents are in the same language"
    ],
    correctAnswer: 1,
    explanation: "PII detection supports batch operations with up to 25 documents (or 125,000 total characters) per request. Each document can be in a different language."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-nlp --yes --no-wait
```

## Learn More

- [PII detection overview](https://learn.microsoft.com/azure/ai-services/language-service/personally-identifiable-information/overview)
- [Supported PII categories](https://learn.microsoft.com/azure/ai-services/language-service/personally-identifiable-information/concepts/entity-categories)
- [Text Analytics client library](https://learn.microsoft.com/python/api/overview/azure/ai-textanalytics-readme)
