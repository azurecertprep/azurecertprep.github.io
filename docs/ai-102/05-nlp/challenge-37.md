---
sidebar_position: 8
title: "Challenge 37: Conversational Language Understanding (CLU)"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 37: Conversational Language Understanding (CLU)

:::info Estimated Time
**60 min** | **Cost**: $2-5 (estimated) | **Domain**: Implement NLP Solutions (15-20%)
:::

## Exam skills covered
- Create intents and entities for conversational language understanding
- Add utterances to train the model
- Train, evaluate, and deploy a CLU model
- Query a deployed CLU model

## Overview

Conversational Language Understanding (CLU) is the replacement for LUIS (Language Understanding). It classifies user utterances into **intents** and extracts **entities**:

| Concept | Description |
|---------|-------------|
| **Intent** | The user's goal (e.g., "BookFlight", "GetWeather") |
| **Entity** | Key information extracted (e.g., destination, date) |
| **Utterance** | Sample text mapped to intents/entities for training |

Entity types:
- **Learned** â€” Machine-learned from labeled examples
- **List** â€” Defined set of values with synonyms
- **Prebuilt** â€” Pre-trained types (datetime, number, temperature, etc.)

CLU uses the Language service endpoint at: `https://{endpoint}.cognitiveservices.azure.com/language/`

## Prerequisites
- Azure subscription
- Azure AI Language resource
- Python 3.9+ with `requests` and `azure-ai-language-conversations`
- Training data (utterances with intent/entity labels)

## Implementation

### Task 1: Create CLU Project via REST

<Tabs>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="https://<resource>.cognitiveservices.azure.com"
KEY="<your-key>"
PROJECT_NAME="travel-assistant"
API_VERSION="2023-04-01"

# Create project
curl -s "${ENDPOINT}/language/authoring/analyze-conversations/projects/${PROJECT_NAME}?api-version=${API_VERSION}" \
  -X PATCH \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "projectKind": "Conversation",
    "projectName": "travel-assistant",
    "language": "en",
    "description": "Travel booking assistant for AI-102 lab",
    "multilingual": false
  }' | jq .
```

</TabItem>
<TabItem value="python" label="Python SDK">

```python
import os
import requests
import time

endpoint = os.environ["AZURE_AI_ENDPOINT"]
key = os.environ["AZURE_AI_KEY"]
project_name = "travel-assistant"
api_version = "2023-04-01"

headers = {
    "Ocp-Apim-Subscription-Key": key,
    "Content-Type": "application/json"
}

# Create project
url = f"{endpoint}/language/authoring/analyze-conversations/projects/{project_name}?api-version={api_version}"

project_body = {
    "projectKind": "Conversation",
    "projectName": project_name,
    "language": "en",
    "description": "Travel booking assistant",
    "multilingual": False
}

response = requests.patch(url, headers=headers, json=project_body)
print(f"Project created: {response.status_code}")
```

</TabItem>
</Tabs>

### Task 2: Define Intents, Entities, and Utterances

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Import training data as a batch (assets)
import_url = f"{endpoint}/language/authoring/analyze-conversations/projects/{project_name}/:import?api-version={api_version}"

training_data = {
    "projectFileVersion": "2022-10-01-preview",
    "stringIndexType": "Utf16CodeUnit",
    "metadata": {
        "projectKind": "Conversation",
        "projectName": project_name,
        "multilingual": False,
        "language": "en"
    },
    "assets": {
        "projectKind": "Conversation",
        "intents": [
            {"category": "BookFlight"},
            {"category": "GetWeather"},
            {"category": "Cancel"},
            {"category": "None"}
        ],
        "entities": [
            {
                "category": "Destination",
                "compositionSetting": "combineComponents",
                "list": None,
                "prebuilts": None
            },
            {
                "category": "DepartureDate",
                "compositionSetting": "combineComponents",
                "list": None,
                "prebuilts": [{"category": "DateTime"}]
            },
            {
                "category": "TravelClass",
                "compositionSetting": "combineComponents",
                "list": {
                    "sublists": [
                        {"listKey": "economy", "synonyms": [{"language": "en", "values": ["economy", "coach", "standard"]}]},
                        {"listKey": "business", "synonyms": [{"language": "en", "values": ["business", "business class", "premium"]}]},
                        {"listKey": "first", "synonyms": [{"language": "en", "values": ["first", "first class", "luxury"]}]}
                    ]
                }
            }
        ],
        "utterances": [
            {
                "text": "Book a flight to London next Friday",
                "intent": "BookFlight",
                "language": "en",
                "entities": [
                    {"category": "Destination", "offset": 17, "length": 6},
                    {"category": "DepartureDate", "offset": 24, "length": 11}
                ]
            },
            {
                "text": "I need a business class ticket to Tokyo",
                "intent": "BookFlight",
                "language": "en",
                "entities": [
                    {"category": "TravelClass", "offset": 9, "length": 14},
                    {"category": "Destination", "offset": 34, "length": 5}
                ]
            },
            {
                "text": "What is the weather like in Paris tomorrow",
                "intent": "GetWeather",
                "language": "en",
                "entities": [
                    {"category": "Destination", "offset": 28, "length": 5},
                    {"category": "DepartureDate", "offset": 34, "length": 8}
                ]
            },
            {
                "text": "Cancel my booking",
                "intent": "Cancel",
                "language": "en",
                "entities": []
            },
            {
                "text": "Never mind, cancel that",
                "intent": "Cancel",
                "language": "en",
                "entities": []
            },
            {
                "text": "Hello there",
                "intent": "None",
                "language": "en",
                "entities": []
            }
        ]
    }
}

response = requests.post(import_url, headers=headers, json=training_data)
operation_url = response.headers.get("operation-location")
print(f"Import started: {response.status_code}")

# Poll until import completes
while True:
    status_response = requests.get(operation_url, headers=headers)
    status = status_response.json()["status"]
    print(f"  Import status: {status}")
    if status in ["succeeded", "failed"]:
        break
    time.sleep(2)
```

</TabItem>
</Tabs>

### Task 3: Train and Deploy Model

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Train the model
train_url = f"{endpoint}/language/authoring/analyze-conversations/projects/{project_name}/:train?api-version={api_version}"

train_body = {
    "modelLabel": "model-v1",
    "trainingMode": "standard",
    "trainingConfigVersion": "2022-09-01",
    "evaluationOptions": {
        "kind": "percentage",
        "testingSplitPercentage": 20,
        "trainingSplitPercentage": 80
    }
}

response = requests.post(train_url, headers=headers, json=train_body)
operation_url = response.headers.get("operation-location")
print(f"Training started: {response.status_code}")

# Poll training status
while True:
    status_response = requests.get(operation_url, headers=headers)
    result = status_response.json()
    print(f"  Training status: {result['status']}")
    if result["status"] in ["succeeded", "failed"]:
        break
    time.sleep(10)

# Deploy the model
deploy_url = f"{endpoint}/language/authoring/analyze-conversations/projects/{project_name}/deployments/production?api-version={api_version}"

deploy_body = {"trainedModelLabel": "model-v1"}

response = requests.put(deploy_url, headers=headers, json=deploy_body)
operation_url = response.headers.get("operation-location")
print(f"Deployment started: {response.status_code}")

while True:
    status_response = requests.get(operation_url, headers=headers)
    result = status_response.json()
    print(f"  Deploy status: {result['status']}")
    if result["status"] in ["succeeded", "failed"]:
        break
    time.sleep(5)

print("Model deployed to 'production' slot!")
```

</TabItem>
</Tabs>

### Task 4: Query the Deployed Model

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.ai.language.conversations import ConversationAnalysisClient
from azure.core.credentials import AzureKeyCredential

# Query using the SDK
client = ConversationAnalysisClient(
    endpoint=os.environ["AZURE_AI_ENDPOINT"],
    credential=AzureKeyCredential(os.environ["AZURE_AI_KEY"])
)

# Test queries
test_queries = [
    "I want to fly to New York next Monday in first class",
    "What's the weather forecast for Seattle?",
    "Cancel my reservation please"
]

for query in test_queries:
    result = client.analyze_conversation(
        task={
            "kind": "Conversation",
            "analysisInput": {
                "conversationItem": {
                    "id": "1",
                    "participantId": "user1",
                    "text": query
                }
            },
            "parameters": {
                "projectName": project_name,
                "deploymentName": "production"
            }
        }
    )

    prediction = result["result"]["prediction"]
    top_intent = prediction["topIntent"]
    confidence = prediction["intents"][0]["confidenceScore"]

    print(f"\nQuery: '{query}'")
    print(f"  Intent: {top_intent} (confidence: {confidence:.4f})")
    print(f"  Entities:")
    for entity in prediction.get("entities", []):
        print(f"    [{entity['category']}] '{entity['text']}' "
              f"(confidence: {entity['confidenceScore']:.3f})")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Query deployed model
curl -s "${ENDPOINT}/language/:analyze-conversations?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "Conversation",
    "analysisInput": {
      "conversationItem": {
        "id": "1",
        "participantId": "user1",
        "text": "Book a first class flight to Tokyo next Friday"
      }
    },
    "parameters": {
      "projectName": "travel-assistant",
      "deploymentName": "production"
    }
  }' | jq '.result.prediction | {topIntent, entities: [.entities[] | {category, text, confidenceScore}]}'
```

</TabItem>
</Tabs>

## Expected Output

```text
Project created: 201
Import started: 202
  Import status: running
  Import status: succeeded
Training started: 202
  Training status: running
  Training status: succeeded
Deployment started: 202
  Deploy status: running
  Deploy status: succeeded
Model deployed to 'production' slot!

Query: 'I want to fly to New York next Monday in first class'
  Intent: BookFlight (confidence: 0.9723)
  Entities:
    [Destination] 'New York' (confidence: 0.945)
    [DepartureDate] 'next Monday' (confidence: 0.988)
    [TravelClass] 'first class' (confidence: 0.992)

Query: 'What's the weather forecast for Seattle?'
  Intent: GetWeather (confidence: 0.9456)
  Entities:
    [Destination] 'Seattle' (confidence: 0.967)

Query: 'Cancel my reservation please'
  Intent: Cancel (confidence: 0.9812)
  Entities:
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Low intent confidence | Wrong intent predicted | Too few training utterances per intent | Add 10-15+ diverse utterances per intent |
| Entity not extracted | Missing entities in response | Entity offset/length incorrect in training | Verify character offsets match exact text positions |
| Training fails | Validation errors | Duplicate utterances or invalid entity spans | Check training data for overlapping entities and duplicates |
| Deploy fails | 409 Conflict | Deployment name already exists with different model | Delete existing deployment or use different name |
| None intent matches everything | Over-triggering | None intent has examples too similar to other intents | Make None intent examples clearly unrelated to all other intents |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What is the relationship between intents and utterances in CLU?",
    options: [
      "Each intent can have only one utterance",
      "Intents are extracted from utterances automatically",
      "Utterances are example texts labeled with an intent, teaching the model to recognize user goals",
      "Utterances and intents are the same concept"
    ],
    correctAnswer: 2,
    explanation: "Utterances are labeled training examples mapped to intents. Multiple diverse utterances per intent teach the model to recognize the same goal expressed differently."
  },
  {
    question: "What are the three entity types in CLU?",
    options: [
      "String, Number, Boolean",
      "Learned (ML-based), List (defined values with synonyms), and Prebuilt (pre-trained types)",
      "Simple, Composite, Regex",
      "Required, Optional, Dynamic"
    ],
    correctAnswer: 1,
    explanation: "CLU supports: Learned entities (trained from labeled examples), List entities (defined value sets with synonyms), and Prebuilt entities (DateTime, Number, etc.)."
  },
  {
    question: "What replaced LUIS (Language Understanding) in Azure AI?",
    options: [
      "Azure Bot Service",
      "Azure OpenAI function calling",
      "Custom Text Classification",
      "Conversational Language Understanding (CLU) in Azure AI Language"
    ],
    correctAnswer: 3,
    explanation: "CLU is the successor to LUIS, providing the same intent/entity recognition with improved accuracy, integrated in the Azure AI Language service."
  },
  {
    question: "What is the purpose of the 'None' intent?",
    options: [
      "It captures utterances that don't match any defined intent (out-of-scope queries)",
      "It handles errors in the model",
      "It is automatically assigned to untrained utterances",
      "It disables intent recognition"
    ],
    correctAnswer: 0,
    explanation: "The 'None' intent captures out-of-scope utterances that don't belong to any defined intent. It should have diverse examples of irrelevant queries."
  },
  {
    question: "How do you specify character positions for entity labels in training utterances?",
    options: [
      "By word index (first word = 0, second = 1)",
      "By start and end word positions",
      "By percentage position in the text",
      "By character offset and length within the utterance text"
    ],
    correctAnswer: 3,
    explanation: "Entities are labeled using character offset (starting position) and length (number of characters) within the utterance text, using UTF-16 code unit indexing."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-nlp --yes --no-wait
```

## Learn More

- [CLU overview](https://learn.microsoft.com/azure/ai-services/language-service/conversational-language-understanding/overview)
- [Quickstart: Build a CLU project](https://learn.microsoft.com/azure/ai-services/language-service/conversational-language-understanding/quickstart)
- [Entity types](https://learn.microsoft.com/azure/ai-services/language-service/conversational-language-understanding/concepts/entity-components)
- [Migration from LUIS](https://learn.microsoft.com/azure/ai-services/language-service/conversational-language-understanding/how-to/migrate-from-luis)
