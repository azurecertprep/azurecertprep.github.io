---
sidebar_position: 9
title: "Desafio 38: Custom Question Answering"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 38: Custom Question Answering

:::info Tempo Estimado
**50 min** | **Custo**: $2-5 (estimado) | **DomÃ­nio**: Implementar SoluÃ§Ãµes de NLP (15-20%)
:::

## Habilidades do exame abordadas
- Criar um projeto de Custom Question Answering
- Adicionar pares de QA manualmente e importar de fontes
- Criar conversas multi-turno
- Adicionar frases alternativas e chit-chat
- Treinar, testar e publicar a base de conhecimento

## VisÃ£o Geral

Custom Question Answering (substituto do QnA Maker) constrÃ³i bases de conhecimento que respondem perguntas a partir do seu conteÃºdo:

| Recurso | DescriÃ§Ã£o |
|---------|-----------|
| **Pares de QA** | Pares pergunta-resposta (adicionados manualmente ou auto-extraÃ­dos) |
| **Fontes** | Importar de URLs, arquivos (PDF, DOCX, TSV) ou SharePoint |
| **Multi-turno** | Prompts de acompanhamento criando Ã¡rvores de diÃ¡logo |
| **Perguntas alternativas** | MÃºltiplas formulaÃ§Ãµes mapeando para a mesma resposta |
| **Chit-chat** | Respostas de personalidade prÃ©-construÃ­das (profissional, amigÃ¡vel, etc.) |
| **Resposta precisa** | Extrair span exato de resposta de respostas longas |

O serviÃ§o faz parte do Azure AI Language: `https://{endpoint}.cognitiveservices.azure.com/language/`

## PrÃ©-requisitos
- Assinatura do Azure
- Recurso Azure AI Language com Custom Question Answering habilitado
- Recurso Azure AI Search (necessÃ¡rio para indexaÃ§Ã£o)
- Python 3.9+ com `azure-ai-language-questionanswering`

## ImplementaÃ§Ã£o

### Tarefa 1: Criar Recursos

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

### Tarefa 2: Criar Projeto de QA e Adicionar Pares

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
    "multilingualResource": False,
    "settings": {
        "defaultAnswer": "I'm sorry, I don't have information about that. Please contact support."
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

### Tarefa 3: Importar de Fonte URL

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

### Tarefa 4: Implantar e Consultar

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

## SaÃ­da Esperada

```text
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

## Quebra & conserta

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| Nenhuma resposta retornada | Resposta vazia ou padrÃ£o | ConfianÃ§a abaixo do threshold | Diminua `confidenceScoreThreshold` ou adicione mais frases alternativas |
| ImportaÃ§Ã£o de URL falha | Fonte mostra erros | PÃ¡gina nÃ£o acessÃ­vel ou mal estruturada | Verifique se a URL Ã© pÃºblica; use pÃ¡ginas FAQ bem estruturadas |
| Multi-turno nÃ£o funciona | Prompts de acompanhamento ausentes | Prompts de diÃ¡logo nÃ£o configurados no par QA | Adicione `dialog.prompts` com referÃªncias `qnaId` corretas |
| Respostas duplicadas | Mesma resposta repetida | Pares QA similares com perguntas sobrepostas | Mescle pares duplicados; use perguntas alternativas em um Ãºnico par |
| Deployment falha | Erro 400 | Sem dados de treinamento ou pares invÃ¡lidos | Certifique-se de que pelo menos um par QA existe; valide todos os IDs de pares |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual recurso Azure Ã© necessÃ¡rio alÃ©m do recurso Language para Custom Question Answering?",
    options: [
      "Azure Cosmos DB",
      "Azure Blob Storage",
      "Azure AI Search (para indexar o conteÃºdo da base de conhecimento)",
      "Azure SQL Database"
    ],
    correctAnswer: 2,
    explanation: "Custom Question Answering requer um recurso Azure AI Search para indexar o conteÃºdo da base de conhecimento e habilitar correspondÃªncia semÃ¢ntica de perguntas a respostas."
  },
  {
    question: "Como vocÃª cria conversas multi-turno no Custom QA?",
    options: [
      "Adicione prompts de acompanhamento (dialog.prompts) a pares QA que referenciam outros IDs de pares QA",
      "Crie projetos separados para cada turno",
      "Escreva scripts de conversa em um arquivo separado",
      "Multi-turno Ã© automÃ¡tico â€” nenhuma configuraÃ§Ã£o necessÃ¡ria"
    ],
    correctAnswer: 0,
    explanation: "Multi-turno Ã© criado adicionando dialog.prompts a pares QA. Cada prompt tem displayText (mostrado ao usuÃ¡rio) e qnaId (a resposta alvo), criando uma Ã¡rvore de diÃ¡logo."
  },
  {
    question: "Qual Ã© o propÃ³sito das perguntas alternativas em um par QA?",
    options: [
      "Fornecer mÃºltiplas respostas corretas",
      "Criar pares QA separados automaticamente",
      "Capturar diferentes formulaÃ§Ãµes da mesma pergunta para que o modelo corresponda mais variaÃ§Ãµes",
      "Traduzir a pergunta para outros idiomas"
    ],
    correctAnswer: 2,
    explanation: "Perguntas alternativas ensinam o modelo a reconhecer diferentes formulaÃ§Ãµes da mesma pergunta (ex.: 'Qual Ã© o custo?', 'Quanto custa?', 'Info de preÃ§o?') todas mapeando para uma resposta."
  },
  {
    question: "O que acontece quando nenhuma resposta atinge o threshold de confianÃ§a?",
    options: [
      "A API retorna um erro 404",
      "A API retorna todas as respostas independente da confianÃ§a",
      "A requisiÃ§Ã£o expira",
      "A API retorna a resposta padrÃ£o configurada"
    ],
    correctAnswer: 3,
    explanation: "Quando nenhuma resposta excede o threshold de confianÃ§a, a API retorna o defaultAnswer configurado do projeto, fornecendo um fallback gracioso."
  },
  {
    question: "De quais fontes de conteÃºdo o Custom Question Answering pode importar?",
    options: [
      "Apenas pares QA digitados manualmente",
      "URLs (pÃ¡ginas web), arquivos (PDF, DOCX, TSV, Excel) e pÃ¡ginas SharePoint",
      "Apenas arquivos JSON estruturados",
      "Apenas pÃ¡ginas web formatadas como FAQ"
    ],
    correctAnswer: 1,
    explanation: "Custom QA pode auto-extrair pares QA de URLs (pÃ¡ginas web, pÃ¡ginas FAQ), arquivos (PDF, DOCX, TSV, TXT, Excel) e sites SharePoint, alÃ©m de entrada manual."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-qna --yes --no-wait
```

## Saiba Mais

- [VisÃ£o geral do Custom Question Answering](https://learn.microsoft.com/azure/ai-services/language-service/question-answering/overview)
- [Criar uma base de conhecimento](https://learn.microsoft.com/azure/ai-services/language-service/question-answering/quickstart/sdk)
- [Conversas multi-turno](https://learn.microsoft.com/azure/ai-services/language-service/question-answering/tutorials/guided-conversations)
- [MigraÃ§Ã£o do QnA Maker](https://learn.microsoft.com/azure/ai-services/language-service/question-answering/how-to/migrate-qnamaker)
