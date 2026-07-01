---
sidebar_position: 1
title: "Challenge 49: End-to-End Enterprise AI Solution"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 49: End-to-End Enterprise AI Solution

:::info Estimated Time
**3-4 hours** | **Cost**: ~$5-10 (multiple AI services) | **Capstone**: All 6 AI-103 Domains
:::

:::caution Cost Warning
This capstone deploys multiple Azure AI services. Monitor costs carefully and clean up resources when done. The challenge uses Basic/S0 tiers where needed.
:::

## Exam skills covered (All Domains)

| Domain | Skills |
|--------|--------|
| 1. Plan & Manage | Resource deployment, networking, RBAC, monitoring, responsible AI |
| 2. Content Moderation | Azure AI Content Safety, text/image moderation, custom categories |
| 3. Computer Vision | Image analysis, OCR, custom vision, spatial analysis |
| 4. NLP | Text analytics, language understanding, translation, speech services |
| 5. Generative AI | Azure OpenAI chat/completions, RAG, embeddings, prompt engineering |
| 6. Knowledge Mining | AI Search, Document Intelligence, skillsets, vector search |

## Overview

You are building an **Enterprise Document Intelligence Platform** for a global financial services company. The platform:

1. **Ingests** documents (contracts, reports, correspondence) in multiple languages
2. **Extracts** text, tables, and entities using Document Intelligence & Computer Vision
3. **Translates** content to English using Translator
4. **Enriches** with NLP (sentiment, key phrases, PII detection, custom entities)
5. **Moderates** content through AI Content Safety
6. **Indexes** everything in Azure AI Search with vector embeddings
7. **Serves** a conversational RAG interface using Azure OpenAI

![Challenge 49 - Capstone Architecture](/img/AI-103/challenge-49-topology.svg)


## Prerequisites

- Azure subscription with Contributor role
- Access to Azure OpenAI (approved)
- Python 3.9+ with packages:
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
- .NET 8 with packages:
  ```text
  Azure.Search.Documents
  Azure.AI.DocumentIntelligence
  Azure.AI.TextAnalytics
  Azure.AI.Vision.ImageAnalysis
  Azure.AI.ContentSafety
  Azure.AI.OpenAI
  Microsoft.CognitiveServices.Speech
  ```

## Implementation

### Task 1: Deploy all Azure AI resources (Domain 1 — Plan & Manage)

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

az storage container create --name "documents" --account-name "stcapstone${UNIQUE_ID}" --auth-mode login
az storage container create --name "images" --account-name "stcapstone${UNIQUE_ID}" --auth-mode login

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

### Task 2: Configure RBAC and monitoring (Domain 1 — Plan & Manage)

```bash
# Enable diagnostic logging on AI Search
LAW_ID=$(az monitor log-analytics workspace create --resource-group $RG --workspace-name "law-capstone-${UNIQUE_ID}" --query id -o tsv)

az monitor diagnostic-settings create \
  --name "search-diagnostics" \
  --resource "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Search/searchServices/search-${UNIQUE_ID}" \
  --logs '[{"category": "OperationLogs", "enabled": true}]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]' \
  --workspace "$LAW_ID"

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

### Task 3: Extract content with Document Intelligence (Domain 6)

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

### Task 4: Translate non-English content (Domain 4 — NLP)

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
    print("Content already in English — no translation needed")
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

### Task 5: Apply NLP enrichment (Domain 4 — NLP)

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

### Task 6: Analyze images with Computer Vision (Domain 3)

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

### Task 7: Content moderation check (Domain 2)

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
    print("⚠️  Content flagged for review — will not be indexed automatically")
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

### Task 8: Create vector search index and index documents (Domain 6)

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

### Task 9: Build RAG chat interface with Azure OpenAI (Domain 5)

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

### Task 10: Speech integration — voice queries (Domain 4 — Speech)

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

## Expected Output

```text
=== Enterprise Document Intelligence Platform ===

[Task 3] Extracted 1 pages, 2456 chars, 1 tables
         Detected language: en

[Task 4] Content already in English — no translation needed

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

## Break & fix

| # | Scenario | Symptom | Root Cause | Fix |
|---|----------|---------|------------|-----|
| 1 | OpenAI deployment quota exceeded | HTTP 429 "Rate limit exceeded" | Too many concurrent requests or token consumption exceeded TPM quota | Implement retry with exponential backoff; increase deployment capacity; batch smaller requests |
| 2 | Search index returns 0 results | Queries return empty despite indexed documents | Vector dimensions mismatch between embedding model and index field definition | Ensure index `vectorSearchDimensions` matches the embedding model output (1536 for text-embedding-3-small) |
| 3 | PII detection misses sensitive data | Known PII (SSNs, credit card numbers) not detected | Text Analytics language parameter incorrect or content exceeds single-request limit | Set correct language hint; chunk documents under 5,120 characters per API call |
| 4 | Translator returns garbled output | Translation quality is very poor for certain documents | Source document contains OCR errors that confuse translation | Pre-process OCR output to fix common errors; use Document Intelligence with higher resolution settings |
| 5 | Content Safety blocks legitimate content | Business documents flagged as unsafe | Safety threshold too aggressive (severity 0-1 is normal language variance) | Adjust severity threshold from 2 to 4; create allowlist for known-safe document categories |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ai102-49-q1",
    question: "You're designing an enterprise AI pipeline that processes documents in 12 languages. Where in the pipeline should translation occur?",
    options: [
      "Before extraction (translate the raw file first)",
      "After extraction (Document Intelligence) but before NLP enrichment",
      "After indexing (translate search results on demand)",
      "Translation is not needed — AI services handle multilingual natively"
    ],
    correctIndex: 1,
    explanation: "Translation should occur after Document Intelligence extracts text (which handles multilingual OCR) but before NLP enrichment services like Text Analytics that work best with a target language. This ensures accurate extraction of the original document followed by consistent NLP processing in a standard language."
  },
  {
    id: "ai102-49-q2",
    question: "Your RAG system returns hallucinated answers that aren't in the source documents. What is the MOST effective mitigation?",
    options: [
      "Switch to a larger model (GPT-4o to GPT-4-turbo)",
      "Increase the number of search results in the context",
      "Add content moderation on the output",
      "Use a system prompt that instructs the model to only answer from context, lower temperature, and include source citations"
    ],
    correctIndex: 3,
    explanation: "The most effective approach combines: (1) explicit system prompt constraining answers to provided context, (2) low temperature (0.1-0.3) to reduce creative responses, and (3) requiring source citations so you can verify grounding. More context or larger models don't inherently solve grounding issues."
  },
  {
    id: "ai102-49-q3",
    question: "Which Azure AI service would you use to ensure uploaded content doesn't contain hate speech or violent content before indexing?",
    options: [
      "Azure AI Content Safety",
      "Azure AI Text Analytics (sentiment analysis)",
      "Azure OpenAI with content filtering",
      "Azure AI Search's built-in content moderation skill"
    ],
    correctIndex: 0,
    explanation: "Azure AI Content Safety is the dedicated service for content moderation, providing severity scores across categories (hate, violence, self-harm, sexual). Text Analytics provides sentiment (not safety), OpenAI content filtering only works within OpenAI calls, and AI Search has no built-in moderation skill."
  },
  {
    id: "ai102-49-q4",
    question: "You need to handle a document that contains both printed text AND handwritten notes. Which extraction approach handles both?",
    options: [
      "Computer Vision OCR API only",
      "Document Intelligence prebuilt-layout model (print only)",
      "Document Intelligence prebuilt-read model (supports both print and handwriting)",
      "Content Understanding document analyzer"
    ],
    correctIndex: 2,
    explanation: "Document Intelligence's prebuilt-read model supports both printed and handwritten text recognition. It uses advanced OCR that handles mixed content (machine-printed + handwritten) in a single analysis pass."
  },
  {
    id: "ai102-49-q5",
    question: "For RBAC best practices, which identity approach should you use in production for service-to-service communication?",
    options: [
      "API keys stored in environment variables",
      "Managed identity with RBAC role assignments",
      "Service principal with client secret in Key Vault",
      "Shared access signatures (SAS tokens)"
    ],
    correctIndex: 1,
    explanation: "Managed identity is the recommended approach for Azure service-to-service authentication. It eliminates credential management entirely — no secrets to rotate, no keys to store. Combined with RBAC roles (e.g., Cognitive Services User), it provides least-privilege access without credential exposure."
  },
  {
    id: "ai102-49-q6",
    question: "Your search index has 1 million documents. Hybrid search (keyword + vector) returns results in 2 seconds. How can you improve latency?",
    options: [
      "Remove the vector search component entirely",
      "Increase the HNSW ef_search parameter to maximum",
      "Switch to exhaustive KNN instead of HNSW",
      "Add semantic ranking only on the top-N pre-filtered results (reranking, not full semantic search)"
    ],
    correctIndex: 3,
    explanation: "Semantic ranking as a reranker on pre-filtered results (e.g., top 50) adds quality without significant latency. Removing vector search loses relevance, increasing ef_search adds latency, and exhaustive KNN is O(n) which is far slower than HNSW at scale."
  },
  {
    id: "ai102-49-q7",
    question: "A document processed through your pipeline contains personally identifiable information (PII). What should the pipeline do?",
    options: [
      "Store both the original and a redacted version — use redacted for search display and original for authorized access",
      "Delete the document immediately",
      "Replace PII in the original document permanently",
      "Encrypt the PII fields in the search index"
    ],
    correctIndex: 0,
    explanation: "Best practice is to store both versions: the redacted version (from Text Analytics PII detection) in the search index for general queries and display, while the original is stored in a separate secured location for authorized access. This balances privacy with data preservation."
  },
  {
    id: "ai102-49-q8",
    question: "You want to enable voice-based queries against your document search system. What is the correct service chain?",
    options: [
      "Speech-to-Text → Direct OpenAI chat → Text-to-Speech",
      "LUIS → Search query → Text-to-Speech",
      "Speech-to-Text → Search query → RAG response → Text-to-Speech",
      "Custom Speech model → Search → Audio file generation"
    ],
    correctIndex: 2,
    explanation: "The correct chain for voice-enabled RAG: (1) Azure Speech-to-Text converts spoken query to text, (2) text drives a hybrid search query, (3) search results feed into RAG with Azure OpenAI for a grounded answer, (4) Azure Text-to-Speech converts the answer to audio. This leverages real-time speech with grounded AI responses."
  }
]} />

## Cleanup

:::danger Important
This capstone creates multiple billable resources. Always clean up when done.
:::

```bash
# Delete the entire resource group and all resources
az group delete --name rg-ai102-capstone --yes --no-wait

echo "All capstone resources scheduled for deletion"
```

## Learn More

- [AI-103 exam skills outline](https://learn.microsoft.com/credentials/certifications/azure-ai-engineer/)
- [Azure AI Services documentation](https://learn.microsoft.com/azure/ai-services/)
- [RAG with Azure AI Search](https://learn.microsoft.com/azure/search/retrieval-augmented-generation-overview)
- [Azure OpenAI Service](https://learn.microsoft.com/azure/ai-services/openai/)
- [Responsible AI principles](https://www.microsoft.com/ai/responsible-ai)
- [Azure AI architecture patterns](https://learn.microsoft.com/azure/architecture/ai-ml/)
