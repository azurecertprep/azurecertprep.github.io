---
sidebar_position: 9
title: "Challenge 38: Custom Question Answering"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 38: Custom Question Answering

:::info Estimated Time
**50 min** | **Cost**: $2-5 (estimated) | **Domain**: Implement NLP Solutions (15-20%)
:::

## Exam skills covered
- Create a custom question answering project
- Add QA pairs manually and import from sources
- Create multi-turn conversations
- Add alternate phrasings and chit-chat
- Train, test, and publish the knowledge base

## Overview

Custom Question Answering (replacement for QnA Maker) builds knowledge bases that answer questions from your content:

| Feature | Description |
|---------|-------------|
| **QA pairs** | Question-answer pairs (manually added or auto-extracted) |
| **Sources** | Import from URLs, files (PDF, DOCX, TSV), or SharePoint |
| **Multi-turn** | Follow-up prompts creating dialogue trees |
| **Alternate questions** | Multiple phrasings mapping to same answer |
| **Chit-chat** | Pre-built personality responses (professional, friendly, etc.) |
| **Precise answering** | Extract exact answer span from long answers |

The service is part of Azure AI Language: `https://{endpoint}.cognitiveservices.azure.com/language/`

## Prerequisites
- Azure subscription
- Azure AI Language resource with Custom Question Answering enabled
- Azure AI Search resource (required for indexing)
- Python 3.9+ with `azure-ai-language-questionanswering`

## Implementation

### Task 1: Create Resources

```bash
az group create --name rg-ai102-qna --location eastus2

# Create Azure AI Search (required for QA indexing)
az search service create \
  --name search-ai102-qna \
  --resource-group rg-ai102-qna \
  --sku basic \
  --location eastus2

# Create Language resource with custom QA feature
az cognitiveservices account create \
  --name language-ai102-qna \
  --resource-group rg-ai102-qna \
  --kind TextAnalytics \
  --sku S \
  --location eastus2 \
  --custom-domain language-ai102-qna
```

### Task 2: Create QA Project and Add Pairs

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import requests
import time

endpoint = os.environ["AZURE_AI_ENDPOINT"]
key = os.environ["AZURE_AI_KEY"]
project_name = "faq-knowledge-base"

headers = {
    "Ocp-Apim-Subscription-Key": key,
    "Content-Type": "application/json"
}

# Create QA project
create_url = f"{endpoint}/language/authoring/query-knowledgebases/projects/{project_name}?api-version=2023-04-01"

project_body = {
    "description": "Product FAQ knowledge base",
    "language": "en",
    "defaultAnswer": "I'm sorry, I don't have information about that. Please contact support.",
    "multilingualResource": False,
    "settings": {
        "defaultAnswer": "Sorry, I can't find an answer to that question."
    }
}

response = requests.patch(create_url, headers=headers, json=project_body)
print(f"Project created: {response.status_code}")

# Add QA pairs with sources
update_url = f"{endpoint}/language/authoring/query-knowledgebases/projects/{project_name}/sources?api-version=2023-04-01"

# Add manual QA pairs
qna_pairs = [
    {
        "op": "add",
        "value": {
            "id": 1,
            "answer": "Azure AI Services (formerly Cognitive Services) is a collection of cloud-based AI APIs that help developers build intelligent applications without direct AI expertise. It includes Vision, Language, Speech, Decision, and OpenAI services.",
            "source": "manual",
            "questions": [
                "What is Azure AI Services?",
                "What are Cognitive Services?",
                "Tell me about Azure AI",
                "What AI services does Azure offer?"
            ],
            "metadata": {"category": "overview"},
            "dialog": {
                "isContextOnly": False,
                "prompts": [
                    {
                        "displayOrder": 1,
                        "displayText": "What services are included?",
                        "qnaId": 2
                    },
                    {
                        "displayOrder": 2,
                        "displayText": "How much does it cost?",
                        "qnaId": 3
                    }
                ]
            }
        }
    },
    {
        "op": "add",
        "value": {
            "id": 2,
            "answer": "Azure AI Services includes:\n- **Vision**: Image analysis, face detection, OCR\n- **Language**: Text analytics, translation, CLU\n- **Speech**: Speech-to-text, text-to-speech, translation\n- **Decision**: Content moderator, anomaly detector\n- **OpenAI**: GPT-4, DALL-E, embeddings",
            "source": "manual",
            "questions": [
                "What services are included?",
                "List Azure AI services",
                "What are the categories of AI services?"
            ],
            "metadata": {"category": "services"}
        }
    },
    {
        "op": "add",
        "value": {
            "id": 3,
            "answer": "Azure AI Services uses a pay-as-you-go pricing model. Most services offer a free tier:\n- Free tier: Limited transactions/month\n- Standard (S0): Pay per transaction\n- Commitment tiers: Discounted rates for high volume\n\nVisit https://azure.microsoft.com/pricing/details/cognitive-services/ for current prices.",
            "source": "manual",
            "questions": [
                "How much does it cost?",
                "What is the pricing?",
                "Is there a free tier?",
                "Azure AI pricing plans"
            ],
            "metadata": {"category": "pricing"}
        }
    }
]

# Submit QA pairs
update_sources_url = f"{endpoint}/language/authoring/query-knowledgebases/projects/{project_name}/qnas?api-version=2023-04-01"
response = requests.patch(update_sources_url, headers=headers, json=qna_pairs)
operation_url = response.headers.get("operation-location")
print(f"QA pairs submitted: {response.status_code}")

# Wait for completion
while True:
    status_resp = requests.get(operation_url, headers=headers)
    status = status_resp.json().get("status", "unknown")
    print(f"  Status: {status}")
    if status in ["succeeded", "failed"]:
        break
    time.sleep(2)
```

</TabItem>
</Tabs>

### Task 3: Import from URL Source

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Import QA pairs from a web page
sources_url = f"{endpoint}/language/authoring/query-knowledgebases/projects/{project_name}/sources?api-version=2023-04-01"

source_body = [
    {
        "op": "add",
        "value": {
            "displayName": "Azure AI FAQ",
            "sourceUri": "https://learn.microsoft.com/en-us/azure/ai-services/what-are-ai-services",
            "sourceKind": "url"
        }
    }
]

response = requests.patch(sources_url, headers=headers, json=source_body)
print(f"URL source added: {response.status_code}")
# Poll operation-location for completion
```

</TabItem>
</Tabs>

### Task 4: Deploy and Query

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.ai.language.questionanswering import QuestionAnsweringClient
from azure.core.credentials import AzureKeyCredential

# Deploy the project
deploy_url = f"{endpoint}/language/authoring/query-knowledgebases/projects/{project_name}/deployments/production?api-version=2023-04-01"
response = requests.put(deploy_url, headers=headers)
print(f"Deployment started: {response.status_code}")

# Wait for deployment
operation_url = response.headers.get("operation-location")
if operation_url:
    while True:
        status_resp = requests.get(operation_url, headers=headers)
        status = status_resp.json().get("status", "unknown")
        if status in ["succeeded", "failed"]:
            print(f"Deployed: {status}")
            break
        time.sleep(3)

# Query the knowledge base using SDK
qa_client = QuestionAnsweringClient(
    endpoint=endpoint,
    credential=AzureKeyCredential(key)
)

# Ask questions
test_questions = [
    "What is Azure AI?",
    "How much does it cost?",
    "What vision services are available?"
]

for question in test_questions:
    response = qa_client.get_answers(
        question=question,
        project_name=project_name,
        deployment_name="production",
        confidence_threshold=0.3,
        top=3,
        include_unstructured_sources=True
    )
    
    print(f"\nQ: {question}")
    for answer in response.answers:
        print(f"  A: {answer.answer[:100]}...")
        print(f"     Confidence: {answer.confidence:.4f}")
        if answer.dialog and answer.dialog.prompts:
            print(f"     Follow-ups: {[p.display_text for p in answer.dialog.prompts]}")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="https://<resource>.cognitiveservices.azure.com"
KEY="<your-key>"

# Query the deployed knowledge base
curl -s "${ENDPOINT}/language/:query-knowledgebases?projectName=faq-knowledge-base&deploymentName=production&api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is Azure AI?",
    "top": 3,
    "confidenceScoreThreshold": 0.3,
    "includeUnstructuredSources": true
  }' | jq '.answers[] | {answer: .answer[0:100], confidence: .confidenceScore, prompts: [.dialog.prompts[]?.displayText]}'
```

</TabItem>
</Tabs>

## Expected Output

```
Project created: 201
QA pairs submitted: 202
  Status: running
  Status: succeeded
URL source added: 202
Deployment started: 200
Deployed: succeeded

Q: What is Azure AI?
  A: Azure AI Services (formerly Cognitive Services) is a collection of cloud-based AI APIs that hel...
     Confidence: 0.9534
     Follow-ups: ['What services are included?', 'How much does it cost?']

Q: How much does it cost?
  A: Azure AI Services uses a pay-as-you-go pricing model. Most services offer a free tier:
- Free...
     Confidence: 0.9123

Q: What vision services are available?
  A: Azure AI Services includes:
- **Vision**: Image analysis, face detection, OCR...
     Confidence: 0.8234
```

## Break and Fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| No answers returned | Empty or default answer | Confidence below threshold | Lower `confidenceScoreThreshold` or add more alternate phrasings |
| URL import fails | Source shows errors | Page not accessible or poorly structured | Verify URL is public; use well-structured FAQ pages |
| Multi-turn not working | Follow-up prompts missing | Dialog prompts not configured on QA pair | Add `dialog.prompts` with correct `qnaId` references |
| Duplicate answers | Same answer repeated | Similar QA pairs with overlapping questions | Merge duplicate pairs; use alternate questions on single pair |
| Deployment fails | 400 error | No training data or invalid pairs | Ensure at least one QA pair exists; validate all pair IDs |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What Azure resource is required in addition to the Language resource for Custom Question Answering?",
    options: [
      "Azure Cosmos DB",
      "Azure AI Search (for indexing the knowledge base content)",
      "Azure Blob Storage",
      "Azure SQL Database"
    ],
    correctAnswer: 1,
    explanation: "Custom Question Answering requires an Azure AI Search resource to index the knowledge base content and enable semantic matching of questions to answers."
  },
  {
    question: "How do you create multi-turn conversations in Custom QA?",
    options: [
      "Create separate projects for each turn",
      "Add follow-up prompts (dialog.prompts) to QA pairs that reference other QA pair IDs",
      "Write conversation scripts in a separate file",
      "Multi-turn is automatic — no configuration needed"
    ],
    correctAnswer: 1,
    explanation: "Multi-turn is created by adding dialog.prompts to QA pairs. Each prompt has displayText (shown to user) and qnaId (the target answer), creating a dialogue tree."
  },
  {
    question: "What is the purpose of alternate questions on a QA pair?",
    options: [
      "To provide multiple correct answers",
      "To capture different phrasings of the same question so the model matches more variations",
      "To create separate QA pairs automatically",
      "To translate the question into other languages"
    ],
    correctAnswer: 1,
    explanation: "Alternate questions teach the model to recognize different phrasings of the same question (e.g., 'What's the cost?', 'How much?', 'Pricing info?') all mapping to one answer."
  },
  {
    question: "What happens when no answer meets the confidence threshold?",
    options: [
      "The API returns a 404 error",
      "The API returns the configured default answer",
      "The API returns all answers regardless of confidence",
      "The request times out"
    ],
    correctAnswer: 1,
    explanation: "When no answer exceeds the confidence threshold, the API returns the project's configured defaultAnswer, providing a graceful fallback."
  },
  {
    question: "What content sources can Custom Question Answering import from?",
    options: [
      "Only manually typed QA pairs",
      "URLs (web pages), files (PDF, DOCX, TSV, Excel), and SharePoint pages",
      "Only structured JSON files",
      "Only FAQ-formatted web pages"
    ],
    correctAnswer: 1,
    explanation: "Custom QA can auto-extract QA pairs from URLs (web pages, FAQ pages), files (PDF, DOCX, TSV, TXT, Excel), and SharePoint sites in addition to manual entry."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-qna --yes --no-wait
```

## Learn More

- [Custom Question Answering overview](https://learn.microsoft.com/azure/ai-services/language-service/question-answering/overview)
- [Create a knowledge base](https://learn.microsoft.com/azure/ai-services/language-service/question-answering/quickstart/sdk)
- [Multi-turn conversations](https://learn.microsoft.com/azure/ai-services/language-service/question-answering/tutorials/guided-conversations)
- [Migration from QnA Maker](https://learn.microsoft.com/azure/ai-services/language-service/question-answering/how-to/migrate-qnamaker)
