---
sidebar_position: 1
title: "Desafio 49: SoluÃ§Ã£o Empresarial de IA de Ponta a Ponta"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 49: SoluÃ§Ã£o Empresarial de IA de Ponta a Ponta

:::info Tempo Estimado
**3-4 horas** | **Custo**: ~$5-10 (mÃºltiplos serviÃ§os de IA) | **Capstone**: Todos os 6 DomÃ­nios do AI-102
:::

:::caution Aviso de Custo
Este capstone implanta mÃºltiplos serviÃ§os Azure AI. Monitore os custos cuidadosamente e limpe os recursos quando terminar. O desafio usa camadas Basic/S0 onde necessÃ¡rio.
:::

## Habilidades do exame cobertas (Todos os DomÃ­nios)

| DomÃ­nio | Habilidades |
|---------|-------------|
| 1. Planejar e Gerenciar | ImplantaÃ§Ã£o de recursos, rede, RBAC, monitoramento, IA responsÃ¡vel |
| 2. ModeraÃ§Ã£o de ConteÃºdo | Azure AI Content Safety, moderaÃ§Ã£o de texto/imagem, categorias personalizadas |
| 3. VisÃ£o Computacional | AnÃ¡lise de imagem, OCR, custom vision, anÃ¡lise espacial |
| 4. NLP | AnÃ¡lise de texto, compreensÃ£o de linguagem, traduÃ§Ã£o, serviÃ§os de fala |
| 5. IA Generativa | Azure OpenAI chat/completions, RAG, embeddings, engenharia de prompt |
| 6. MineraÃ§Ã£o de Conhecimento | AI Search, Document Intelligence, skillsets, pesquisa vetorial |

## VisÃ£o Geral

VocÃª estÃ¡ construindo uma **Plataforma Empresarial de InteligÃªncia Documental** para uma empresa global de serviÃ§os financeiros. A plataforma:

1. **Ingere** documentos (contratos, relatÃ³rios, correspondÃªncias) em mÃºltiplos idiomas
2. **Extrai** texto, tabelas e entidades usando Document Intelligence e VisÃ£o Computacional
3. **Traduz** conteÃºdo para inglÃªs usando o Translator
4. **Enriquece** com NLP (sentimento, frases-chave, detecÃ§Ã£o de PII, entidades personalizadas)
5. **Modera** conteÃºdo atravÃ©s do AI Content Safety
6. **Indexa** tudo no Azure AI Search com embeddings vetoriais
7. **Serve** uma interface de chat RAG conversacional usando Azure OpenAI

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                     Enterprise Document Intelligence Platform                           â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                                        â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”‚
â”‚  â”‚  Blob   â”‚â”€â”€â”€â”€â–¶â”‚  Doc Intel   â”‚â”€â”€â”€â”€â–¶â”‚  Translation  â”‚â”€â”€â”€â”€â–¶â”‚  NLP Enrichment â”‚      â”‚
â”‚  â”‚ Storage â”‚     â”‚  + OCR       â”‚     â”‚  (Translator) â”‚     â”‚  (Text Analyticsâ”‚      â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â”‚  + Custom NER)  â”‚      â”‚
â”‚       â”‚                                                       â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â”‚
â”‚       â”‚                                                                â”‚               â”‚
â”‚       â”‚          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”               â”‚               â”‚
â”‚       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚  Vision API  â”‚     â”‚ Content Safetyâ”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤               â”‚
â”‚                  â”‚  (Images)    â”‚     â”‚  (Moderation) â”‚               â”‚               â”‚
â”‚                  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜               â”‚               â”‚
â”‚                         â”‚                                              â”‚               â”‚
â”‚                         â–¼                                              â–¼               â”‚
â”‚                  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”              â”‚
â”‚                  â”‚              Azure AI Search                          â”‚              â”‚
â”‚                  â”‚  (Full-text + Vector + Semantic + Knowledge Store)   â”‚              â”‚
â”‚                  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜              â”‚
â”‚                                             â”‚                                          â”‚
â”‚                                             â–¼                                          â”‚
â”‚                  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”              â”‚
â”‚                  â”‚              Azure OpenAI (GPT-4o)                    â”‚              â”‚
â”‚                  â”‚  RAG Chat Interface with grounded responses          â”‚              â”‚
â”‚                  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜              â”‚
â”‚                                                                                        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## PrÃ©-requisitos

- Assinatura Azure com funÃ§Ã£o de Contributor
- Acesso ao Azure OpenAI (aprovado)
- Python 3.9+ com pacotes:
  ```text
  azure-search-documents>=11.4.0
  azure-ai-documentintelligence>=1.0.0
  azure-ai-textanalytics>=5.3.0
  azure-ai-vision-imageanalysis>=1.0.0
  azure-cognitiveservices-speech>=1.37.0
  azure-ai-contentsafety>=1.0.0
  openai>=1.0.0
  azure-storage-blob>=12.0.0
  azure-identity>=1.15.0
  ```
- .NET 8 com pacotes:
  ```text
  Azure.Search.Documents
  Azure.AI.DocumentIntelligence
  Azure.AI.TextAnalytics
  Azure.AI.Vision.ImageAnalysis
  Azure.AI.ContentSafety
  Azure.AI.OpenAI
  Microsoft.CognitiveServices.Speech
  ```

## ImplementaÃ§Ã£o

### Tarefa 1: Implantar todos os recursos Azure AI (DomÃ­nio 1 â€” Planejar e Gerenciar)

```bash
RG="rg-ai102-capstone"
LOCATION="eastus"
UNIQUE_ID=$(openssl rand -hex 4)

az group create --name $RG --location $LOCATION

# 1. Azure AI Services (multi-service for Vision, Text Analytics, Content Safety)
az cognitiveservices account create \
  --name "ai-services-${UNIQUE_ID}" \
  --resource-group $RG \
  --location $LOCATION \
  --kind AIServices \
  --sku S0 --yes

# 2. Azure OpenAI
az cognitiveservices account create \
  --name "aoai-${UNIQUE_ID}" \
  --resource-group $RG \
  --location $LOCATION \
  --kind OpenAI \
  --sku S0 --yes

# Deploy GPT-4o and embeddings
az cognitiveservices account deployment create \
  --name "aoai-${UNIQUE_ID}" \
  --resource-group $RG \
  --deployment-name "gpt-4o" \
  --model-name "gpt-4o" \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-capacity 30 \
  --sku-name "Standard"

az cognitiveservices account deployment create \
  --name "aoai-${UNIQUE_ID}" \
  --resource-group $RG \
  --deployment-name "text-embedding-3-small" \
  --model-name "text-embedding-3-small" \
  --model-version "1" \
  --model-format OpenAI \
  --sku-capacity 30 \
  --sku-name "Standard"

# 3. Document Intelligence
az cognitiveservices account create \
  --name "docintell-${UNIQUE_ID}" \
  --resource-group $RG \
  --location $LOCATION \
  --kind FormRecognizer \
  --sku S0 --yes

# 4. Azure AI Search (Basic for vector + semantic)
az search service create \
  --name "search-${UNIQUE_ID}" \
  --resource-group $RG \
  --location $LOCATION \
  --sku basic

# 5. Translator
az cognitiveservices account create \
  --name "translator-${UNIQUE_ID}" \
  --resource-group $RG \
  --location $LOCATION \
  --kind TextTranslation \
  --sku S1 --yes

# 6. Speech Service
az cognitiveservices account create \
  --name "speech-${UNIQUE_ID}" \
  --resource-group $RG \
  --location $LOCATION \
  --kind SpeechServices \
  --sku S0 --yes

# 7. Storage Account
az storage account create \
  --name "stcapstone${UNIQUE_ID}" \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS

az storage container create --name "documents" --account-name "stcapstone${UNIQUE_ID}"
az storage container create --name "images" --account-name "stcapstone${UNIQUE_ID}"

# Get all connection info
SEARCH_ENDPOINT="https://search-${UNIQUE_ID}.search.windows.net"
SEARCH_KEY=$(az search admin-key show --resource-group $RG --service-name "search-${UNIQUE_ID}" --query "primaryKey" -o tsv)
AOAI_ENDPOINT=$(az cognitiveservices account show --name "aoai-${UNIQUE_ID}" --resource-group $RG --query "properties.endpoint" -o tsv)
AOAI_KEY=$(az cognitiveservices account keys list --name "aoai-${UNIQUE_ID}" --resource-group $RG --query "key1" -o tsv)
AI_ENDPOINT=$(az cognitiveservices account show --name "ai-services-${UNIQUE_ID}" --resource-group $RG --query "properties.endpoint" -o tsv)
AI_KEY=$(az cognitiveservices account keys list --name "ai-services-${UNIQUE_ID}" --resource-group $RG --query "key1" -o tsv)
DOC_ENDPOINT=$(az cognitiveservices account show --name "docintell-${UNIQUE_ID}" --resource-group $RG --query "properties.endpoint" -o tsv)
DOC_KEY=$(az cognitiveservices account keys list --name "docintell-${UNIQUE_ID}" --resource-group $RG --query "key1" -o tsv)
TRANSLATOR_KEY=$(az cognitiveservices account keys list --name "translator-${UNIQUE_ID}" --resource-group $RG --query "key1" -o tsv)
SPEECH_KEY=$(az cognitiveservices account keys list --name "speech-${UNIQUE_ID}" --resource-group $RG --query "key1" -o tsv)
STORAGE_CONN=$(az storage account show-connection-string --name "stcapstone${UNIQUE_ID}" --resource-group $RG --query "connectionString" -o tsv)

echo "All resources deployed successfully"
```

### Tarefa 2: Configurar RBAC e monitoramento (DomÃ­nio 1 â€” Planejar e Gerenciar)

```bash
# Enable diagnostic logging on AI Search
az monitor diagnostic-settings create \
  --name "search-diagnostics" \
  --resource "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Search/searchServices/search-${UNIQUE_ID}" \
  --logs '[{"category": "OperationLogs", "enabled": true}]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]' \
  --workspace "$(az monitor log-analytics workspace create --resource-group $RG --workspace-name "law-capstone-${UNIQUE_ID}" --query id -o tsv)"

# Create RBAC role assignments for managed identity scenario
# (In production, use managed identity instead of API keys)
PRINCIPAL_ID=$(az ad signed-in-user show --query id -o tsv)

# Cognitive Services User (for AI services)
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Cognitive Services User" \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG"

# Search Index Data Contributor
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Search Index Data Contributor" \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Search/searchServices/search-${UNIQUE_ID}"
```

### Tarefa 3: Extrair conteÃºdo com Document Intelligence (DomÃ­nio 6)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
import os

doc_client = DocumentIntelligenceClient(
    endpoint=DOC_ENDPOINT,
    credential=AzureKeyCredential(DOC_KEY)
)

def extract_document(url: str) -> dict:
    """Extract text, tables, and structure from document."""
    poller = doc_client.begin_analyze_document(
        "prebuilt-layout",
        AnalyzeDocumentRequest(url_source=url)
    )
    result = poller.result()

    # Extract content
    content_parts = []
    for page in result.pages:
        for line in page.lines:
            content_parts.append(line.content)

    # Extract tables as structured data
    tables = []
    if result.tables:
        for table in result.tables:
            table_data = {"rows": [], "row_count": table.row_count, "col_count": table.column_count}
            row_dict = {}
            for cell in table.cells:
                if cell.row_index not in row_dict:
                    row_dict[cell.row_index] = {}
                row_dict[cell.row_index][cell.column_index] = cell.content
            table_data["rows"] = [row_dict[r] for r in sorted(row_dict.keys())]
            tables.append(table_data)

    return {
        "content": " ".join(content_parts),
        "pages": len(result.pages),
        "tables": tables,
        "language": result.languages[0] if result.languages else "unknown"
    }

# Process sample document
doc_data = extract_document(
    "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf"
)
print(f"Extracted {doc_data['pages']} pages, {len(doc_data['content'])} chars, {len(doc_data['tables'])} tables")
print(f"Detected language: {doc_data['language']}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.AI.DocumentIntelligence;

var docClient = new DocumentIntelligenceClient(
    new Uri(docEndpoint), new AzureKeyCredential(docKey));

async Task<(string content, int pages, string language)> ExtractDocumentAsync(string url)
{
    var operation = await docClient.AnalyzeDocumentAsync(
        WaitUntil.Completed, "prebuilt-layout",
        new AnalyzeDocumentContent() { UrlSource = new Uri(url) });
    var result = operation.Value;

    var content = string.Join(" ", result.Pages.SelectMany(p => p.Lines).Select(l => l.Content));
    var language = result.Languages?.FirstOrDefault()?.Locale ?? "unknown";
    return (content, result.Pages.Count, language);
}

var (content, pages, lang) = await ExtractDocumentAsync(sampleUrl);
Console.WriteLine($"Extracted {pages} pages, {content.Length} chars, language: {lang}");
```

</TabItem>
</Tabs>

### Tarefa 4: Traduzir conteÃºdo nÃ£o-inglÃªs (DomÃ­nio 4 â€” NLP)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import requests
import uuid

TRANSLATOR_ENDPOINT = "https://api.cognitive.microsofttranslator.com"

def translate_text(text: str, target_language: str = "en") -> dict:
    """Translate text to target language."""
    url = f"{TRANSLATOR_ENDPOINT}/translate?api-version=3.0&to={target_language}"

    headers = {
        "Ocp-Apim-Subscription-Key": TRANSLATOR_KEY,
        "Ocp-Apim-Subscription-Region": LOCATION,
        "Content-Type": "application/json",
        "X-ClientTraceId": str(uuid.uuid4())
    }

    body = [{"text": text[:50000]}]  # Max 50K chars per request
    response = requests.post(url, headers=headers, json=body)
    result = response.json()

    return {
        "translated_text": result[0]["translations"][0]["text"],
        "detected_language": result[0].get("detectedLanguage", {}).get("language", "unknown"),
        "confidence": result[0].get("detectedLanguage", {}).get("score", 0)
    }

# Translate if document is not in English
if doc_data["language"] != "en":
    translation = translate_text(doc_data["content"])
    doc_data["content"] = translation["translated_text"]
    doc_data["original_language"] = translation["detected_language"]
    print(f"Translated from {translation['detected_language']} (confidence: {translation['confidence']:.2%})")
else:
    doc_data["original_language"] = "en"
    print("Content already in English â€” no translation needed")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using System.Net.Http;
using System.Text.Json;

async Task<string> TranslateAsync(string text, string targetLang = "en")
{
    var client = new HttpClient();
    client.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", translatorKey);
    client.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Region", location);

    var body = JsonSerializer.Serialize(new[] { new { text = text[..Math.Min(text.Length, 50000)] } });
    var content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");

    var response = await client.PostAsync(
        $"https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to={targetLang}",
        content);

    var result = JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());
    return result[0].GetProperty("translations")[0].GetProperty("text").GetString()!;
}
```

</TabItem>
</Tabs>

### Tarefa 5: Aplicar enriquecimento NLP (DomÃ­nio 4 â€” NLP)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.ai.textanalytics import TextAnalyticsClient

text_client = TextAnalyticsClient(
    endpoint=AI_ENDPOINT,
    credential=AzureKeyCredential(AI_KEY)
)

def enrich_with_nlp(text: str) -> dict:
    """Apply NLP enrichment: sentiment, key phrases, entities, PII."""
    # Chunk text if too long (5120 char limit per doc)
    chunks = [text[i:i+5000] for i in range(0, len(text), 5000)]
    first_chunk = [chunks[0]]  # Use first chunk for analysis

    # Sentiment Analysis
    sentiment_result = text_client.analyze_sentiment(first_chunk)[0]

    # Key Phrases
    keyphrases_result = text_client.extract_key_phrases(first_chunk)[0]

    # Named Entity Recognition
    entities_result = text_client.recognize_entities(first_chunk)[0]

    # PII Detection
    pii_result = text_client.recognize_pii_entities(first_chunk)[0]

    return {
        "sentiment": sentiment_result.sentiment,
        "confidence_scores": {
            "positive": sentiment_result.confidence_scores.positive,
            "neutral": sentiment_result.confidence_scores.neutral,
            "negative": sentiment_result.confidence_scores.negative
        },
        "key_phrases": keyphrases_result.key_phrases[:20],
        "entities": [
            {"text": e.text, "category": e.category, "confidence": e.confidence_score}
            for e in entities_result.entities[:20]
        ],
        "pii_entities": [
            {"text": e.text, "category": e.category}
            for e in pii_result.entities
        ],
        "redacted_text": pii_result.redacted_text
    }

# Enrich the document
nlp_data = enrich_with_nlp(doc_data["content"])
print(f"Sentiment: {nlp_data['sentiment']}")
print(f"Key phrases: {nlp_data['key_phrases'][:5]}")
print(f"Entities found: {len(nlp_data['entities'])}")
print(f"PII entities found: {len(nlp_data['pii_entities'])}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.AI.TextAnalytics;

var textClient = new TextAnalyticsClient(new Uri(aiEndpoint), new AzureKeyCredential(aiKey));

// Sentiment
var sentiment = await textClient.AnalyzeSentimentAsync(content[..Math.Min(content.Length, 5000)]);
Console.WriteLine($"Sentiment: {sentiment.Value.Sentiment}");

// Key Phrases
var phrases = await textClient.ExtractKeyPhrasesAsync(content[..Math.Min(content.Length, 5000)]);
Console.WriteLine($"Key phrases: {string.Join(", ", phrases.Value.Take(5))}");

// Entities
var entities = await textClient.RecognizeEntitiesAsync(content[..Math.Min(content.Length, 5000)]);
Console.WriteLine($"Entities: {entities.Value.Count}");

// PII
var pii = await textClient.RecognizePiiEntitiesAsync(content[..Math.Min(content.Length, 5000)]);
Console.WriteLine($"PII entities: {pii.Value.Count}");
```

</TabItem>
</Tabs>

### Tarefa 6: Analisar imagens com VisÃ£o Computacional (DomÃ­nio 3)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.ai.vision.imageanalysis.models import VisualFeatures

vision_client = ImageAnalysisClient(
    endpoint=AI_ENDPOINT,
    credential=AzureKeyCredential(AI_KEY)
)

def analyze_image(image_url: str) -> dict:
    """Analyze image with Computer Vision."""
    result = vision_client.analyze_from_url(
        image_url=image_url,
        visual_features=[
            VisualFeatures.CAPTION,
            VisualFeatures.TAGS,
            VisualFeatures.OBJECTS,
            VisualFeatures.READ,
            VisualFeatures.DENSE_CAPTIONS,
        ]
    )

    return {
        "caption": result.caption.text if result.caption else "",
        "caption_confidence": result.caption.confidence if result.caption else 0,
        "tags": [{"name": t.name, "confidence": t.confidence} for t in (result.tags.list if result.tags else [])],
        "objects": [{"name": o.tags[0].name, "confidence": o.tags[0].confidence} for o in (result.objects.list if result.objects else [])],
        "text_content": " ".join([line.text for block in (result.read.blocks if result.read else []) for line in block.lines]),
        "dense_captions": [dc.text for dc in (result.dense_captions.list if result.dense_captions else [])]
    }

# Analyze an image
image_data = analyze_image("https://learn.microsoft.com/azure/ai-services/computer-vision/media/quickstarts/presentation.png")
print(f"Caption: {image_data['caption']}")
print(f"Tags: {[t['name'] for t in image_data['tags'][:5]]}")
print(f"OCR text: {image_data['text_content'][:200]}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.AI.Vision.ImageAnalysis;

var visionClient = new ImageAnalysisClient(new Uri(aiEndpoint), new AzureKeyCredential(aiKey));

var imageResult = await visionClient.AnalyzeAsync(
    new Uri(imageUrl),
    VisualFeatures.Caption | VisualFeatures.Tags | VisualFeatures.Objects | VisualFeatures.Read);

Console.WriteLine($"Caption: {imageResult.Value.Caption.Text}");
Console.WriteLine($"Tags: {string.Join(", ", imageResult.Value.Tags.Values.Select(t => t.Name).Take(5))}");
Console.WriteLine($"OCR: {string.Join(" ", imageResult.Value.Read.Blocks.SelectMany(b => b.Lines).Select(l => l.Text))}");
```

</TabItem>
</Tabs>

### Tarefa 7: VerificaÃ§Ã£o de moderaÃ§Ã£o de conteÃºdo (DomÃ­nio 2)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.ai.contentsafety import ContentSafetyClient
from azure.ai.contentsafety.models import AnalyzeTextOptions

safety_client = ContentSafetyClient(
    endpoint=AI_ENDPOINT,
    credential=AzureKeyCredential(AI_KEY)
)

def moderate_content(text: str) -> dict:
    """Check content for safety before indexing."""
    # Analyze text for harmful content
    request = AnalyzeTextOptions(text=text[:10000])
    response = safety_client.analyze_text(request)

    categories = {}
    is_safe = True
    for category_result in response.categories_analysis:
        categories[category_result.category] = category_result.severity
        if category_result.severity > 2:  # Severity 0-6, threshold at 2
            is_safe = False

    return {
        "is_safe": is_safe,
        "categories": categories,
        "action": "index" if is_safe else "review"
    }

# Moderate before indexing
moderation = moderate_content(doc_data["content"])
print(f"Content safe: {moderation['is_safe']}")
print(f"Categories: {moderation['categories']}")
print(f"Action: {moderation['action']}")

if not moderation["is_safe"]:
    print("âš ï¸  Content flagged for review â€” will not be indexed automatically")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.AI.ContentSafety;

var safetyClient = new ContentSafetyClient(new Uri(aiEndpoint), new AzureKeyCredential(aiKey));

var analysisResult = await safetyClient.AnalyzeTextAsync(new AnalyzeTextOptions(content[..Math.Min(content.Length, 10000)]));

var isSafe = true;
foreach (var category in analysisResult.Value.CategoriesAnalysis)
{
    Console.WriteLine($"  {category.Category}: severity {category.Severity}");
    if (category.Severity > 2) isSafe = false;
}
Console.WriteLine($"Safe to index: {isSafe}");
```

</TabItem>
</Tabs>

### Tarefa 8: Criar Ã­ndice de pesquisa vetorial e indexar documentos (DomÃ­nio 6)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex, SearchField, SearchFieldDataType,
    SimpleField, SearchableField,
    VectorSearch, HnswAlgorithmConfiguration, VectorSearchProfile,
    SemanticConfiguration, SemanticSearch, SemanticPrioritizedFields, SemanticField,
)
from azure.search.documents import SearchClient
from openai import AzureOpenAI
import hashlib
from datetime import datetime, timezone

# Initialize clients
index_client = SearchIndexClient(endpoint=SEARCH_ENDPOINT, credential=AzureKeyCredential(SEARCH_KEY))
aoai_client = AzureOpenAI(api_key=AOAI_KEY, api_version="2024-06-01", azure_endpoint=AOAI_ENDPOINT)

def get_embedding(text: str) -> list:
    response = aoai_client.embeddings.create(input=text[:8000], model="text-embedding-3-small")
    return response.data[0].embedding

# Create comprehensive index
fields = [
    SimpleField(name="id", type=SearchFieldDataType.String, key=True, filterable=True),
    SearchableField(name="title", type=SearchFieldDataType.String, filterable=True, sortable=True),
    SearchableField(name="content", type=SearchFieldDataType.String),
    SearchableField(name="content_redacted", type=SearchFieldDataType.String),
    SimpleField(name="source_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
    SimpleField(name="original_language", type=SearchFieldDataType.String, filterable=True, facetable=True),
    SimpleField(name="sentiment", type=SearchFieldDataType.String, filterable=True, facetable=True),
    SearchableField(name="key_phrases", type=SearchFieldDataType.Collection(SearchFieldDataType.String), filterable=True, facetable=True),
    SearchableField(name="entities", type=SearchFieldDataType.Collection(SearchFieldDataType.String), filterable=True, facetable=True),
    SimpleField(name="is_safe", type=SearchFieldDataType.Boolean, filterable=True),
    SimpleField(name="processed_date", type=SearchFieldDataType.DateTimeOffset, sortable=True),
    SimpleField(name="page_count", type=SearchFieldDataType.Int32, filterable=True),
    SearchField(
        name="content_vector",
        type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
        searchable=True,
        vector_search_dimensions=1536,
        vector_search_profile_name="vector-profile"
    ),
]

index = SearchIndex(
    name="enterprise-documents",
    fields=fields,
    vector_search=VectorSearch(
        algorithms=[HnswAlgorithmConfiguration(name="hnsw-config")],
        profiles=[VectorSearchProfile(name="vector-profile", algorithm_configuration_name="hnsw-config")]
    ),
    semantic_search=SemanticSearch(configurations=[
        SemanticConfiguration(name="semantic-config", prioritized_fields=SemanticPrioritizedFields(
            title_field=SemanticField(field_name="title"),
            content_fields=[SemanticField(field_name="content")]
        ))
    ])
)

index_client.create_or_update_index(index)
print("Enterprise documents index created")

# Index the processed document
search_client = SearchClient(endpoint=SEARCH_ENDPOINT, index_name="enterprise-documents", credential=AzureKeyCredential(SEARCH_KEY))

document = {
    "id": hashlib.md5(b"invoice_1").hexdigest(),
    "title": "Invoice_1.pdf",
    "content": doc_data["content"],
    "content_redacted": nlp_data["redacted_text"],
    "source_type": "pdf",
    "original_language": doc_data.get("original_language", "en"),
    "sentiment": nlp_data["sentiment"],
    "key_phrases": nlp_data["key_phrases"],
    "entities": [e["text"] for e in nlp_data["entities"]],
    "is_safe": moderation["is_safe"],
    "processed_date": datetime.now(timezone.utc).isoformat(),
    "page_count": doc_data["pages"],
    "content_vector": get_embedding(doc_data["content"]),
}

search_client.upload_documents([document])
print(f"Document indexed: {document['title']}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Search.Documents;
using Azure.Search.Documents.Indexes;
using Azure.Search.Documents.Indexes.Models;

// Create index (see Python for full field definition)
var indexClient = new SearchIndexClient(new Uri(searchEndpoint), new AzureKeyCredential(searchKey));
// ... (same index creation pattern)

// Upload document
var searchClient = new SearchClient(new Uri(searchEndpoint), "enterprise-documents", new AzureKeyCredential(searchKey));
var searchDoc = new SearchDocument(new Dictionary<string, object>
{
    ["id"] = docId,
    ["title"] = "Invoice_1.pdf",
    ["content"] = content,
    ["sentiment"] = sentiment.Value.Sentiment.ToString(),
    ["key_phrases"] = phrases.Value.ToList(),
    ["is_safe"] = isSafe,
    ["content_vector"] = embedding
});
await searchClient.UploadDocumentsAsync(new[] { searchDoc });
```

</TabItem>
</Tabs>

### Tarefa 9: Construir interface de chat RAG com Azure OpenAI (DomÃ­nio 5)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.search.documents.models import VectorizedQuery

def rag_chat(user_question: str, conversation_history: list = None) -> str:
    """RAG chat using Azure AI Search + Azure OpenAI."""
    if conversation_history is None:
        conversation_history = []

    # Step 1: Hybrid search (keyword + vector + semantic)
    query_vector = get_embedding(user_question)
    search_results = search_client.search(
        search_text=user_question,
        vector_queries=[
            VectorizedQuery(vector=query_vector, k_nearest_neighbors=5, fields="content_vector")
        ],
        query_type="semantic",
        semantic_configuration_name="semantic-config",
        filter="is_safe eq true",
        select=["title", "content", "source_type", "sentiment", "key_phrases"],
        top=5
    )

    # Step 2: Build context from search results
    context_parts = []
    sources = []
    for result in search_results:
        context_parts.append(f"[Source: {result['title']}]\n{result['content'][:1000]}")
        sources.append(result['title'])

    context = "\n\n---\n\n".join(context_parts)

    # Step 3: Generate response with Azure OpenAI
    system_message = """You are an enterprise document assistant. Answer questions based ONLY on the provided context.
If the context doesn't contain enough information to answer, say so.
Always cite the source document title in your answer.
Never make up information not present in the context."""

    messages = [
        {"role": "system", "content": system_message},
        *conversation_history,
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {user_question}"}
    ]

    response = aoai_client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.3,
        max_tokens=1000
    )

    answer = response.choices[0].message.content
    print(f"\nðŸ¤– Assistant: {answer}")
    print(f"\nðŸ“š Sources: {', '.join(sources)}")
    return answer

# Test the RAG interface
rag_chat("What invoices mention consulting services and what are the amounts?")
rag_chat("Summarize the key entities found across all documents")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.AI.OpenAI;
using OpenAI.Chat;

async Task<string> RagChatAsync(string question)
{
    // Search
    var queryVector = await GetEmbeddingAsync(question);
    var searchOptions = new SearchOptions
    {
        Filter = "is_safe eq true",
        Size = 5,
        QueryType = SearchQueryType.Semantic,
        SemanticSearch = new SemanticSearchOptions { SemanticConfigurationName = "semantic-config" }
    };
    searchOptions.VectorSearch = new()
    {
        Queries = { new VectorizedQuery(queryVector) { KNearestNeighborsCount = 5, Fields = { "content_vector" } } }
    };

    var results = await searchClient.SearchAsync<SearchDocument>(question, searchOptions);
    var context = string.Join("\n---\n", results.Value.GetResults().Select(r => r.Document["content"].ToString()));

    // Generate
    var chatClient = new AzureOpenAIClient(new Uri(aoaiEndpoint), new AzureKeyCredential(aoaiKey))
        .GetChatClient("gpt-4o");
    var messages = new ChatMessage[]
    {
        new SystemChatMessage("Answer based on the context provided. Cite sources."),
        new UserChatMessage($"Context:\n{context}\n\nQuestion: {question}")
    };

    var response = await chatClient.CompleteChatAsync(messages);
    return response.Value.Content[0].Text;
}
```

</TabItem>
</Tabs>

### Tarefa 10: IntegraÃ§Ã£o de fala â€” consultas por voz (DomÃ­nio 4 â€” Fala)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import azure.cognitiveservices.speech as speechsdk

def speech_to_text_query() -> str:
    """Convert spoken question to text, then query RAG."""
    speech_config = speechsdk.SpeechConfig(subscription=SPEECH_KEY, region=LOCATION)
    speech_config.speech_recognition_language = "en-US"
    audio_config = speechsdk.AudioConfig(use_default_microphone=True)

    recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

    print("ðŸŽ¤ Speak your question...")
    result = recognizer.recognize_once_async().get()

    if result.reason == speechsdk.ResultReason.RecognizedSpeech:
        print(f"Recognized: {result.text}")
        # Feed into RAG pipeline
        answer = rag_chat(result.text)
        return answer
    elif result.reason == speechsdk.ResultReason.NoMatch:
        print("No speech recognized")
    elif result.reason == speechsdk.ResultReason.Canceled:
        print(f"Speech recognition canceled: {result.cancellation_details.reason}")
    return ""

def text_to_speech_response(text: str):
    """Convert RAG response to speech output."""
    speech_config = speechsdk.SpeechConfig(subscription=SPEECH_KEY, region=LOCATION)
    speech_config.speech_synthesis_voice_name = "en-US-JennyNeural"
    audio_config = speechsdk.AudioConfig(use_default_speaker=True)

    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

    result = synthesizer.speak_text_async(text).get()
    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        print("ðŸ”Š Audio response delivered")
    else:
        print(f"Speech synthesis failed: {result.reason}")

# Demo: Voice-enabled RAG
# question = speech_to_text_query()
# Simulate with text input for automation
answer = rag_chat("What are the total amounts across all invoices?")
text_to_speech_response(answer[:500])  # TTS the answer
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Microsoft.CognitiveServices.Speech;

var speechConfig = SpeechConfig.FromSubscription(speechKey, location);
speechConfig.SpeechRecognitionLanguage = "en-US";

// Speech-to-text
using var recognizer = new SpeechRecognizer(speechConfig);
Console.WriteLine("Speak your question...");
var speechResult = await recognizer.RecognizeOnceAsync();
if (speechResult.Reason == ResultReason.RecognizedSpeech)
{
    Console.WriteLine($"Recognized: {speechResult.Text}");
    var answer = await RagChatAsync(speechResult.Text);

    // Text-to-speech response
    speechConfig.SpeechSynthesisVoiceName = "en-US-JennyNeural";
    using var synthesizer = new SpeechSynthesizer(speechConfig);
    await synthesizer.SpeakTextAsync(answer[..Math.Min(answer.Length, 500)]);
}
```

</TabItem>
</Tabs>

## SaÃ­da Esperada

```text
=== Enterprise Document Intelligence Platform ===

[Task 3] Extracted 1 pages, 2456 chars, 1 tables
         Detected language: en

[Task 4] Content already in English â€” no translation needed

[Task 5] Sentiment: neutral
         Key phrases: ['consulting services', 'total amount', 'payment terms']
         Entities found: 8
         PII entities found: 2

[Task 6] Caption: a presentation slide with text
         Tags: ['text', 'presentation', 'slide']
         OCR text: Azure AI Services overview...

[Task 7] Content safe: True
         Categories: {Hate: 0, Violence: 0, SelfHarm: 0, Sexual: 0}
         Action: index

[Task 8] Enterprise documents index created
         Document indexed: Invoice_1.pdf

[Task 9] ðŸ¤– Assistant: Based on the context, Invoice_1.pdf from Contoso Ltd mentions
         consulting services with a total amount of $3,800.00 USD.
         ðŸ“š Sources: Invoice_1.pdf

[Task 10] ðŸ”Š Audio response delivered
```

## Quebra & conserta

| # | CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---|---------|---------|------------|----------|
| 1 | Cota de implantaÃ§Ã£o do OpenAI excedida | HTTP 429 "Rate limit exceeded" | Muitas requisiÃ§Ãµes concorrentes ou consumo de tokens excedeu a cota de TPM | Implementar retry com backoff exponencial; aumentar a capacidade de implantaÃ§Ã£o; enviar requisiÃ§Ãµes menores em lotes |
| 2 | Ãndice de pesquisa retorna 0 resultados | Consultas retornam vazio apesar de documentos indexados | Incompatibilidade de dimensÃµes vetoriais entre o modelo de embedding e a definiÃ§Ã£o do campo no Ã­ndice | Garantir que `vectorSearchDimensions` do Ã­ndice corresponda Ã  saÃ­da do modelo de embedding (1536 para text-embedding-3-small) |
| 3 | DetecÃ§Ã£o de PII nÃ£o encontra dados sensÃ­veis | PII conhecido (SSNs, nÃºmeros de cartÃ£o de crÃ©dito) nÃ£o detectado | ParÃ¢metro de idioma do Text Analytics incorreto ou conteÃºdo excede o limite por requisiÃ§Ã£o | Definir dica de idioma correta; dividir documentos em menos de 5.120 caracteres por chamada de API |
| 4 | Translator retorna saÃ­da ilegÃ­vel | Qualidade da traduÃ§Ã£o muito ruim para certos documentos | Documento fonte contÃ©m erros de OCR que confundem a traduÃ§Ã£o | PrÃ©-processar saÃ­da do OCR para corrigir erros comuns; usar Document Intelligence com configuraÃ§Ãµes de resoluÃ§Ã£o mais alta |
| 5 | Content Safety bloqueia conteÃºdo legÃ­timo | Documentos empresariais marcados como inseguros | Limiar de seguranÃ§a muito agressivo (severidade 0-1 Ã© variaÃ§Ã£o normal de linguagem) | Ajustar limiar de severidade de 2 para 4; criar lista de permissÃµes para categorias de documentos sabidamente seguros |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ai102-49-q1",
    question: "VocÃª estÃ¡ projetando um pipeline de IA empresarial que processa documentos em 12 idiomas. Em que ponto do pipeline a traduÃ§Ã£o deve ocorrer?",
    options: [
      "Antes da extraÃ§Ã£o (traduzir o arquivo bruto primeiro)",
      "ApÃ³s a extraÃ§Ã£o (Document Intelligence) mas antes do enriquecimento NLP",
      "ApÃ³s a indexaÃ§Ã£o (traduzir resultados de pesquisa sob demanda)",
      "TraduÃ§Ã£o nÃ£o Ã© necessÃ¡ria â€” os serviÃ§os de IA lidam com multilÃ­ngue nativamente"
    ],
    correctIndex: 1,
    explanation: "A traduÃ§Ã£o deve ocorrer apÃ³s o Document Intelligence extrair o texto (que lida com OCR multilÃ­ngue) mas antes dos serviÃ§os de enriquecimento NLP como Text Analytics que funcionam melhor com um idioma-alvo. Isso garante extraÃ§Ã£o precisa do documento original seguida por processamento NLP consistente em um idioma padrÃ£o."
  },
  {
    id: "ai102-49-q2",
    question: "Seu sistema RAG retorna respostas alucinadas que nÃ£o estÃ£o nos documentos fonte. Qual Ã© a mitigaÃ§Ã£o MAIS eficaz?",
    options: [
      "Mudar para um modelo maior (GPT-4o para GPT-4-turbo)",
      "Aumentar o nÃºmero de resultados de pesquisa no contexto",
      "Adicionar moderaÃ§Ã£o de conteÃºdo na saÃ­da",
      "Usar um prompt de sistema que instrua o modelo a responder apenas com base no contexto, diminuir a temperatura e incluir citaÃ§Ãµes de fontes"
    ],
    correctIndex: 3,
    explanation: "A abordagem mais eficaz combina: (1) prompt de sistema explÃ­cito restringindo respostas ao contexto fornecido, (2) temperatura baixa (0.1-0.3) para reduzir respostas criativas, e (3) exigir citaÃ§Ãµes de fontes para que vocÃª possa verificar o embasamento. Mais contexto ou modelos maiores nÃ£o resolvem inerentemente problemas de embasamento."
  },
  {
    id: "ai102-49-q3",
    question: "Qual serviÃ§o Azure AI vocÃª usaria para garantir que conteÃºdo enviado nÃ£o contenha discurso de Ã³dio ou conteÃºdo violento antes da indexaÃ§Ã£o?",
    options: [
      "Azure AI Content Safety",
      "Azure AI Text Analytics (anÃ¡lise de sentimento)",
      "Azure OpenAI com filtragem de conteÃºdo",
      "Skill de moderaÃ§Ã£o de conteÃºdo integrada do Azure AI Search"
    ],
    correctIndex: 0,
    explanation: "Azure AI Content Safety Ã© o serviÃ§o dedicado para moderaÃ§Ã£o de conteÃºdo, fornecendo pontuaÃ§Ãµes de severidade em categorias (Ã³dio, violÃªncia, autolesÃ£o, sexual). Text Analytics fornece sentimento (nÃ£o seguranÃ§a), a filtragem de conteÃºdo do OpenAI sÃ³ funciona dentro de chamadas OpenAI, e o AI Search nÃ£o tem skill de moderaÃ§Ã£o integrada."
  },
  {
    id: "ai102-49-q4",
    question: "VocÃª precisa processar um documento que contÃ©m tanto texto impresso QUANTO notas manuscritas. Qual abordagem de extraÃ§Ã£o lida com ambos?",
    options: [
      "API de OCR do Computer Vision apenas",
      "Modelo prebuilt-layout do Document Intelligence (apenas impresso)",
      "Modelo prebuilt-read do Document Intelligence (suporta tanto impresso quanto manuscrito)",
      "Analisador de documentos do Content Understanding"
    ],
    correctIndex: 2,
    explanation: "O modelo prebuilt-read do Document Intelligence suporta reconhecimento de texto tanto impresso quanto manuscrito. Ele usa OCR avanÃ§ado que lida com conteÃºdo misto (impresso por mÃ¡quina + manuscrito) em uma Ãºnica passagem de anÃ¡lise."
  },
  {
    id: "ai102-49-q5",
    question: "Para melhores prÃ¡ticas de RBAC, qual abordagem de identidade vocÃª deve usar em produÃ§Ã£o para comunicaÃ§Ã£o serviÃ§o-a-serviÃ§o?",
    options: [
      "Chaves de API armazenadas em variÃ¡veis de ambiente",
      "Identidade gerenciada com atribuiÃ§Ãµes de funÃ§Ã£o RBAC",
      "Service principal com segredo do cliente no Key Vault",
      "Assinaturas de acesso compartilhado (tokens SAS)"
    ],
    correctIndex: 1,
    explanation: "Identidade gerenciada Ã© a abordagem recomendada para autenticaÃ§Ã£o serviÃ§o-a-serviÃ§o no Azure. Ela elimina completamente o gerenciamento de credenciais â€” sem segredos para rotacionar, sem chaves para armazenar. Combinada com funÃ§Ãµes RBAC (ex.: Cognitive Services User), fornece acesso de menor privilÃ©gio sem exposiÃ§Ã£o de credenciais."
  },
  {
    id: "ai102-49-q6",
    question: "Seu Ã­ndice de pesquisa tem 1 milhÃ£o de documentos. A pesquisa hÃ­brida (keyword + vetor) retorna resultados em 2 segundos. Como vocÃª pode melhorar a latÃªncia?",
    options: [
      "Remover o componente de pesquisa vetorial completamente",
      "Aumentar o parÃ¢metro ef_search do HNSW ao mÃ¡ximo",
      "Mudar para KNN exaustivo em vez de HNSW",
      "Adicionar ranking semÃ¢ntico apenas nos top-N resultados prÃ©-filtrados (reranking, nÃ£o pesquisa semÃ¢ntica completa)"
    ],
    correctIndex: 3,
    explanation: "Ranking semÃ¢ntico como um reranker em resultados prÃ©-filtrados (ex.: top 50) adiciona qualidade sem latÃªncia significativa. Remover pesquisa vetorial perde relevÃ¢ncia, aumentar ef_search adiciona latÃªncia, e KNN exaustivo Ã© O(n) que Ã© muito mais lento que HNSW em escala."
  },
  {
    id: "ai102-49-q7",
    question: "Um documento processado pelo seu pipeline contÃ©m informaÃ§Ãµes de identificaÃ§Ã£o pessoal (PII). O que o pipeline deve fazer?",
    options: [
      "Armazenar tanto a versÃ£o original quanto uma versÃ£o redigida â€” usar a redigida para exibiÃ§Ã£o na pesquisa e a original para acesso autorizado",
      "Excluir o documento imediatamente",
      "Substituir PII no documento original permanentemente",
      "Criptografar os campos de PII no Ã­ndice de pesquisa"
    ],
    correctIndex: 0,
    explanation: "A melhor prÃ¡tica Ã© armazenar ambas as versÃµes: a versÃ£o redigida (da detecÃ§Ã£o de PII do Text Analytics) no Ã­ndice de pesquisa para consultas gerais e exibiÃ§Ã£o, enquanto o original Ã© armazenado em um local seguro separado para acesso autorizado. Isso equilibra privacidade com preservaÃ§Ã£o de dados."
  },
  {
    id: "ai102-49-q8",
    question: "VocÃª deseja habilitar consultas por voz contra seu sistema de pesquisa de documentos. Qual Ã© a cadeia de serviÃ§os correta?",
    options: [
      "Speech-to-Text â†’ Chat direto com OpenAI â†’ Text-to-Speech",
      "LUIS â†’ Consulta de pesquisa â†’ Text-to-Speech",
      "Speech-to-Text â†’ Consulta de pesquisa â†’ Resposta RAG â†’ Text-to-Speech",
      "Modelo de Custom Speech â†’ Pesquisa â†’ GeraÃ§Ã£o de arquivo de Ã¡udio"
    ],
    correctIndex: 2,
    explanation: "A cadeia correta para RAG habilitado por voz: (1) Azure Speech-to-Text converte a consulta falada em texto, (2) o texto direciona uma consulta de pesquisa hÃ­brida, (3) os resultados da pesquisa alimentam o RAG com Azure OpenAI para uma resposta fundamentada, (4) Azure Text-to-Speech converte a resposta em Ã¡udio. Isso aproveita fala em tempo real com respostas de IA fundamentadas."
  }
]} />

## Limpeza

:::danger Importante
Este capstone cria mÃºltiplos recursos faturÃ¡veis. Sempre faÃ§a a limpeza quando terminar.
:::

```bash
# Delete the entire resource group and all resources
az group delete --name rg-ai102-capstone --yes --no-wait

echo "All capstone resources scheduled for deletion"
```

## Saiba Mais

- [Resumo de habilidades do exame AI-102](https://learn.microsoft.com/credentials/certifications/azure-ai-engineer/)
- [DocumentaÃ§Ã£o do Azure AI Services](https://learn.microsoft.com/azure/ai-services/)
- [RAG com Azure AI Search](https://learn.microsoft.com/azure/search/retrieval-augmented-generation-overview)
- [Azure OpenAI Service](https://learn.microsoft.com/azure/ai-services/openai/)
- [PrincÃ­pios de IA ResponsÃ¡vel](https://www.microsoft.com/ai/responsible-ai)
- [PadrÃµes de arquitetura Azure AI](https://learn.microsoft.com/azure/architecture/ai-ml/)
