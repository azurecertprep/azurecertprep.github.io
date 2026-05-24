---
sidebar_position: 8
title: "Desafio 37: Conversational Language Understanding (CLU)"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 37: Conversational Language Understanding (CLU)

:::info Tempo Estimado
**60 min** | **Custo**: $2-5 (estimado) | **Domínio**: Implementar Soluções de NLP (15-20%)
:::

## Habilidades do exame abordadas
- Criar intents e entidades para compreensão de linguagem conversacional
- Adicionar utterances para treinar o modelo
- Treinar, avaliar e implantar um modelo CLU
- Consultar um modelo CLU implantado

## Visão Geral

Conversational Language Understanding (CLU) é o substituto do LUIS (Language Understanding). Ele classifica utterances do usuário em **intents** e extrai **entidades**:

| Conceito | Descrição |
|----------|-----------|
| **Intent** | O objetivo do usuário (ex.: "BookFlight", "GetWeather") |
| **Entity** | Informação-chave extraída (ex.: destino, data) |
| **Utterance** | Texto de exemplo mapeado para intents/entidades para treinamento |

Tipos de entidade:
- **Learned** â€” Aprendida por machine learning a partir de exemplos rotulados
- **List** â€” Conjunto definido de valores com sinônimos
- **Prebuilt** â€” Tipos pré-treinados (datetime, number, temperature, etc.)

CLU usa o endpoint do serviço Language em: `https://{endpoint}.cognitiveservices.azure.com/language/`

## Pré-requisitos
- Assinatura do Azure
- Recurso Azure AI Language
- Python 3.9+ com `requests` e `azure-ai-language-conversations`
- Dados de treinamento (utterances com rótulos de intent/entidade)

## Implementação

### Tarefa 1: Criar Projeto CLU via REST

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

### Tarefa 2: Definir Intents, Entidades e Utterances

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

### Tarefa 3: Treinar e Implantar Modelo

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

### Tarefa 4: Consultar o Modelo Implantado

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

## Saída Esperada

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

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Baixa confiança de intent | Intent errado previsto | Poucas utterances de treinamento por intent | Adicione 10-15+ utterances diversas por intent |
| Entidade não extraída | Entidades ausentes na resposta | Offset/length de entidade incorreto no treinamento | Verifique se os offsets de caractere correspondem Ã s posições exatas do texto |
| Treinamento falha | Erros de validação | Utterances duplicadas ou spans de entidade inválidos | Verifique dados de treinamento para entidades sobrepostas e duplicatas |
| Deploy falha | 409 Conflict | Nome de deployment já existe com modelo diferente | Delete o deployment existente ou use nome diferente |
| Intent None corresponde a tudo | Disparo excessivo | Intent None tem exemplos muito similares a outros intents | Faça exemplos do intent None claramente não relacionados a todos os outros intents |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a relação entre intents e utterances no CLU?",
    options: [
      "Cada intent pode ter apenas uma utterance",
      "Intents são extraídos de utterances automaticamente",
      "Utterances são textos de exemplo rotulados com um intent, ensinando o modelo a reconhecer objetivos do usuário",
      "Utterances e intents são o mesmo conceito"
    ],
    correctAnswer: 2,
    explanation: "Utterances são exemplos de treinamento rotulados mapeados para intents. Múltiplas utterances diversas por intent ensinam o modelo a reconhecer o mesmo objetivo expresso de maneiras diferentes."
  },
  {
    question: "Quais são os três tipos de entidade no CLU?",
    options: [
      "String, Number, Boolean",
      "Learned (baseada em ML), List (valores definidos com sinônimos) e Prebuilt (tipos pré-treinados)",
      "Simple, Composite, Regex",
      "Required, Optional, Dynamic"
    ],
    correctAnswer: 1,
    explanation: "CLU suporta: entidades Learned (treinadas a partir de exemplos rotulados), entidades List (conjuntos de valores definidos com sinônimos) e entidades Prebuilt (DateTime, Number, etc.)."
  },
  {
    question: "O que substituiu o LUIS (Language Understanding) no Azure AI?",
    options: [
      "Azure Bot Service",
      "Azure OpenAI function calling",
      "Custom Text Classification",
      "Conversational Language Understanding (CLU) no Azure AI Language"
    ],
    correctAnswer: 3,
    explanation: "CLU é o sucessor do LUIS, fornecendo o mesmo reconhecimento de intent/entidade com precisão aprimorada, integrado ao serviço Azure AI Language."
  },
  {
    question: "Qual é o propósito do intent 'None'?",
    options: [
      "Captura utterances que não correspondem a nenhum intent definido (consultas fora do escopo)",
      "Trata erros no modelo",
      "Ã‰ automaticamente atribuído a utterances não treinadas",
      "Desabilita o reconhecimento de intent"
    ],
    correctAnswer: 0,
    explanation: "O intent 'None' captura utterances fora do escopo que não pertencem a nenhum intent definido. Deve ter exemplos diversos de consultas irrelevantes."
  },
  {
    question: "Como você especifica posições de caractere para rótulos de entidade em utterances de treinamento?",
    options: [
      "Por índice de palavra (primeira palavra = 0, segunda = 1)",
      "Por posições de início e fim de palavras",
      "Por posição percentual no texto",
      "Por offset de caractere e tamanho dentro do texto da utterance"
    ],
    correctAnswer: 3,
    explanation: "Entidades são rotuladas usando offset de caractere (posição inicial) e length (número de caracteres) dentro do texto da utterance, usando indexação de unidades de código UTF-16."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-nlp --yes --no-wait
```

## Saiba Mais

- [Visão geral do CLU](https://learn.microsoft.com/azure/ai-services/language-service/conversational-language-understanding/overview)
- [Início rápido: Construir um projeto CLU](https://learn.microsoft.com/azure/ai-services/language-service/conversational-language-understanding/quickstart)
- [Tipos de entidade](https://learn.microsoft.com/azure/ai-services/language-service/conversational-language-understanding/concepts/entity-components)
- [Migração do LUIS](https://learn.microsoft.com/azure/ai-services/language-service/conversational-language-understanding/how-to/migrate-from-luis)
