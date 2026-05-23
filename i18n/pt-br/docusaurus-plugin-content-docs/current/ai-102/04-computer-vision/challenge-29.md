---
sidebar_position: 7
title: "Desafio 29: Análise de Vídeo com Video Indexer"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 29: Análise de Vídeo com Video Indexer

:::info Tempo Estimado
**60 min** | **Custo**: $5-15 (estimado) | **Domínio**: Implementar Soluções de Visão Computacional (10-15%)
:::

## Habilidades do exame abordadas
- Usar o Azure AI Video Indexer para extrair insights de vídeo
- Extrair transcrições, rostos, tópicos e sentimentos
- Consultar conteúdo de vídeo por palavra-chave e tempo

## Visão Geral

O Azure AI Video Indexer extrai insights ricos de conteúdo de vídeo e áudio:

| Insight | Descrição |
|---------|-----------|
| **Transcript** | Fala-para-texto com identificação de falante |
| **OCR** | Extração de texto exibido na tela |
| **Topics** | Extração de tópicos baseada na Wikipedia |
| **Keywords** | Termos-chave da transcrição |
| **Faces** | Detecção e agrupamento facial (não identificação sem aprovação) |
| **Sentiments** | Análise de sentimento (positivo/negativo/neutro) do texto transcrito |
| **Scenes/Shots** | Segmentação visual de cenas |
| **Labels** | Rótulos de objetos visuais por frame |

A API usa um endpoint diferente: `https://api.videoindexer.ai`

## Pré-requisitos
- Assinatura Azure
- Conta Azure AI Video Indexer
- Python 3.9+ com biblioteca `requests`
- Arquivo de vídeo ou URL

## Implementação

### Tarefa 1: Configurar Conta do Video Indexer

```bash
az group create --name rg-ai102-videoindexer --location eastus2

# Create Video Indexer account (ARM-connected)
az resource create \
  --resource-group rg-ai102-videoindexer \
  --resource-type Microsoft.VideoIndexer/accounts \
  --name vi-ai102 \
  --location eastus2 \
  --properties '{}'
```

### Tarefa 2: Enviar e Indexar Vídeo

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import time
import requests

# Video Indexer configuration
ACCOUNT_ID = os.environ["VIDEO_INDEXER_ACCOUNT_ID"]
LOCATION = "eastus2"
API_KEY = os.environ["VIDEO_INDEXER_API_KEY"]
API_URL = "https://api.videoindexer.ai"

# Get access token
def get_access_token():
    url = f"{API_URL}/Auth/{LOCATION}/Accounts/{ACCOUNT_ID}/AccessToken"
    headers = {"Ocp-Apim-Subscription-Key": API_KEY}
    params = {"allowEdit": "true"}
    response = requests.get(url, headers=headers, params=params)
    return response.json()

token = get_access_token()
print(f"Access token acquired (length: {len(token)})")

# Upload video from URL
def upload_video(video_url, video_name):
    url = f"{API_URL}/{LOCATION}/Accounts/{ACCOUNT_ID}/Videos"
    params = {
        "accessToken": token,
        "name": video_name,
        "videoUrl": video_url,
        "language": "en-US",
        "indexingPreset": "Default"
    }
    response = requests.post(url, params=params)
    result = response.json()
    print(f"Video uploaded: {result['id']} (state: {result['state']})")
    return result["id"]

video_id = upload_video(
    "https://example.com/sample-presentation.mp4",
    "AI-102 Sample Presentation"
)

# Poll for indexing completion
def wait_for_indexing(video_id):
    while True:
        url = f"{API_URL}/{LOCATION}/Accounts/{ACCOUNT_ID}/Videos/{video_id}/Index"
        params = {"accessToken": token}
        response = requests.get(url, params=params)
        result = response.json()
        state = result["state"]
        print(f"  Indexing state: {state}")
        
        if state == "Processed":
            return result
        elif state == "Failed":
            raise Exception(f"Indexing failed: {result.get('failureMessage')}")
        time.sleep(30)

print("\nWaiting for indexing...")
insights = wait_for_indexing(video_id)
print("Indexing complete!")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ACCOUNT_ID="<your-account-id>"
LOCATION="eastus2"
API_KEY="<your-api-key>"

# Get access token
TOKEN=$(curl -s "https://api.videoindexer.ai/Auth/${LOCATION}/Accounts/${ACCOUNT_ID}/AccessToken?allowEdit=true" \
  -H "Ocp-Apim-Subscription-Key: ${API_KEY}" | tr -d '"')

# Upload video from URL
curl -s "https://api.videoindexer.ai/${LOCATION}/Accounts/${ACCOUNT_ID}/Videos?accessToken=${TOKEN}&name=sample-video&videoUrl=https://example.com/video.mp4&language=en-US" \
  -X POST | jq '{id: .id, state: .state}'

# Check indexing status (replace VIDEO_ID)
curl -s "https://api.videoindexer.ai/${LOCATION}/Accounts/${ACCOUNT_ID}/Videos/VIDEO_ID/Index?accessToken=${TOKEN}" \
  | jq '.state'
```

</TabItem>
</Tabs>

### Tarefa 3: Extrair Insights do Vídeo

<Tabs>
<TabItem value="python" label="Python SDK">

```python
def get_video_insights(video_id):
    url = f"{API_URL}/{LOCATION}/Accounts/{ACCOUNT_ID}/Videos/{video_id}/Index"
    params = {"accessToken": token}
    response = requests.get(url, params=params)
    return response.json()

insights = get_video_insights(video_id)
video_insights = insights["videos"][0]["insights"]

# Extract transcript
print("=== TRANSCRIPT ===")
if "transcript" in video_insights:
    for item in video_insights["transcript"][:5]:  # First 5 entries
        print(f"  [{item['instances'][0]['start']} - {item['instances'][0]['end']}]")
        print(f"  Speaker {item.get('speakerId', 'N/A')}: {item['text']}")
        print()

# Extract topics
print("=== TOPICS ===")
if "topics" in video_insights:
    for topic in video_insights["topics"]:
        print(f"  - {topic['name']} (confidence: {topic['confidence']:.3f})")

# Extract keywords
print("\n=== KEYWORDS ===")
if "keywords" in video_insights:
    for kw in video_insights["keywords"][:10]:
        print(f"  - {kw['text']} (appears {len(kw['instances'])} times)")

# Extract OCR text
print("\n=== ON-SCREEN TEXT (OCR) ===")
if "ocr" in video_insights:
    for ocr_item in video_insights["ocr"][:5]:
        print(f"  [{ocr_item['instances'][0]['start']}] '{ocr_item['text']}'")

# Search within video
def search_video(video_id, query):
    url = f"{API_URL}/{LOCATION}/Accounts/{ACCOUNT_ID}/Videos/{video_id}/Index"
    params = {"accessToken": token, "searchText": query}
    response = requests.get(url, params=params)
    result = response.json()
    
    # Find matching segments
    search_results = result.get("searchMatches", [])
    print(f"\nSearch '{query}': {len(search_results)} matches")
    for match in search_results:
        print(f"  [{match['startTime']} - {match['endTime']}] {match['type']}: {match.get('text', '')[:50]}")

search_video(video_id, "Azure AI")
```

</TabItem>
</Tabs>

## Saída Esperada

```
Access token acquired (length: 1247)
Video uploaded: abc123def (state: Uploading)

Waiting for indexing...
  Indexing state: Processing
  Indexing state: Processing
  Indexing state: Processed
Indexing complete!

=== TRANSCRIPT ===
  [0:00:00.000 - 0:00:04.500]
  Speaker 1: Welcome to our presentation on Azure AI Services.

  [0:00:04.500 - 0:00:09.200]
  Speaker 1: Today we'll cover computer vision and natural language processing.

=== TOPICS ===
  - Artificial intelligence (confidence: 0.923)
  - Cloud computing (confidence: 0.856)
  - Computer vision (confidence: 0.834)

=== KEYWORDS ===
  - Azure AI (appears 12 times)
  - computer vision (appears 8 times)
  - machine learning (appears 5 times)

=== ON-SCREEN TEXT (OCR) ===
  [0:00:02.000] 'Azure AI Services Overview'
  [0:01:15.000] 'Computer Vision API'

Search 'Azure AI': 4 matches
  [0:00:00.000 - 0:00:04.500] Transcript: Welcome to our presentation on Azure AI...
  [0:02:30.000 - 0:02:35.000] Ocr: Azure AI Vision
```

## Quebrar e Corrigir

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| 401 Unauthorized | Acesso negado | Token expirado (válido por 1 hora) | Solicite novo token de acesso |
| Indexação travada em Processing | Nunca completa | Vídeo muito longo ou corrompido | Verifique o formato do vídeo; tente um clipe mais curto |
| Transcrição vazia | Nenhuma fala detectada | Faixa de áudio ausente ou muito baixa | Verifique se o áudio existe; confira o parâmetro de idioma |
| Nenhum rosto detectado | Insights de face vazios | Rostos muito pequenos ou obscurecidos | Garanta que rostos ocupem área suficiente no frame |
| Busca não retorna resultados | searchMatches vazio | Vídeo não totalmente indexado | Aguarde state=Processed antes de buscar |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual endpoint de API o Azure AI Video Indexer usa?",
    options: [
      "https://api.videoindexer.ai",
      "https://<resource>.cognitiveservices.azure.com",
      "https://<resource>.videoindexer.azure.com",
      "https://video.cognitive.microsoft.com"
    ],
    correctAnswer: 0,
    explanation: "O Video Indexer usa sua própria API dedicada em https://api.videoindexer.ai, separada do endpoint padrão dos Cognitive Services."
  },
  {
    question: "Qual é o fluxo de trabalho típico para processar um vídeo com o Video Indexer?",
    options: [
      "Upload → Process → Delete",
      "Create index → Add video → Query results",
      "Deploy model → Send video → Get predictions",
      "Obter token de acesso → Enviar vídeo → Aguardar conclusão → Recuperar insights"
    ],
    correctAnswer: 3,
    explanation: "O fluxo de trabalho é: autenticar (obter token) → enviar vídeo → consultar status até 'Processed' → recuperar insights estruturados via endpoint Index."
  },
  {
    question: "Quais insights o Video Indexer extrai da faixa de áudio?",
    options: [
      "Apenas transcrição fala-para-texto",
      "Apenas palavras-chave e tópicos",
      "Transcrição com identificação de falante, detecção de idioma e sentimento",
      "O áudio não é analisado — apenas conteúdo visual"
    ],
    correctAnswer: 2,
    explanation: "O Video Indexer extrai transcrição com diarização de falantes (quem falou quando), detecção de idioma, palavras-chave, tópicos e análise de sentimento baseada em texto do áudio."
  },
  {
    question: "Como você busca conteúdo específico dentro de um vídeo indexado?",
    options: [
      "Baixar o vídeo e buscar localmente",
      "Usar o parâmetro searchText ao consultar o índice do vídeo",
      "Criar um índice de busca separado",
      "Busca não é suportada — você deve ler a transcrição completa"
    ],
    correctAnswer: 1,
    explanation: "O Video Indexer suporta busca por palavras-chave via parâmetro searchText, que encontra correspondências em transcrição, OCR, tópicos e outros insights textuais com timestamps."
  },
  {
    question: "Qual preset de indexação você deve usar para um vídeo com fala e texto na tela?",
    options: [
      "AudioOnly",
      "VideoOnly",
      "Default (inclui análise de áudio e vídeo)",
      "BasicAudio"
    ],
    correctAnswer: 2,
    explanation: "O preset 'Default' analisa tanto áudio (transcrição, falantes) quanto vídeo (OCR, rostos, objetos, cenas). Use AudioOnly ou VideoOnly quando precisar de apenas uma faixa."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-videoindexer --yes --no-wait
```

## Saiba Mais

- [Visão geral do Video Indexer](https://learn.microsoft.com/azure/azure-video-indexer/video-indexer-overview)
- [Referência da API do Video Indexer](https://api-portal.videoindexer.ai/)
- [Enviar e indexar vídeos](https://learn.microsoft.com/azure/azure-video-indexer/upload-index-videos)
