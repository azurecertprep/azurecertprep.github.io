---
sidebar_position: 6
title: "Challenge 44: Semantic and Vector Search"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 44: Semantic and Vector Search

:::info Estimated Time
**60-75 min** | **Cost**: ~$1.50 (Basic tier Search + OpenAI embeddings) | **Domain**: Knowledge Mining & Extraction (15-20%)
:::

:::warning Tier Requirement
Semantic ranking requires **Basic tier or higher** for Azure AI Search. Vector search requires **Basic tier or higher**. The Free tier does not support these features.
:::

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Configure semantic ranking on an index | High |
| Implement vector search with embeddings | High |
| Execute hybrid search queries (keyword + vector) | High |
| Generate embeddings with Azure OpenAI | High |
| Configure vector search profiles and algorithms | Medium |

## Overview

### Semantic ranking
Semantic ranking re-ranks initial keyword search results using deep learning models that understand the meaning and context of queries and documents. It doesn't change which documents match — it re-orders the top results for better relevance.

### Vector search
Vector search finds documents based on mathematical similarity between vector embeddings (dense numerical representations). Unlike keyword search, it finds semantically similar content even without shared terms.

### Hybrid search
Combines keyword (BM25) scoring with vector similarity, producing the best of both approaches. A **Reciprocal Rank Fusion (RRF)** algorithm merges the ranked lists.

| Approach | Finds "car" when query is "automobile" | Exact phrase matching | Best for |
|----------|--------|--------|---------|
| Keyword only | ❌ | ✅ | Known-item lookup |
| Vector only | ✅ | ❌ | Semantic similarity |
| Hybrid | ✅ | ✅ | Production RAG scenarios |

## Prerequisites

- Azure AI Search (Basic tier or higher)
- Azure OpenAI with `text-embedding-ada-002` or `text-embedding-3-small` deployed
- Python 3.9+ with `azure-search-documents>=11.4.0`, `openai>=1.0.0`
- .NET 8 with `Azure.Search.Documents`, `Azure.AI.OpenAI`

## Implementation

### Task 1: Deploy an embedding model

```bash
# Create Azure OpenAI resource (if not already done)
AOAI_NAME="aoai-ai102-$(openssl rand -hex 4)"
az cognitiveservices account create \
  --name $AOAI_NAME \
  --resource-group $RG \
  --location eastus \
  --kind OpenAI \
  --sku S0 \
  --yes

# Deploy text-embedding-3-small model
az cognitiveservices account deployment create \
  --name $AOAI_NAME \
  --resource-group $RG \
  --deployment-name "text-embedding-3-small" \
  --model-name "text-embedding-3-small" \
  --model-version "1" \
  --model-format OpenAI \
  --sku-capacity 120 \
  --sku-name Standard

AOAI_ENDPOINT=$(az cognitiveservices account show \
  --name $AOAI_NAME --resource-group $RG \
  --query "properties.endpoint" -o tsv)

AOAI_KEY=$(az cognitiveservices account keys list \
  --name $AOAI_NAME --resource-group $RG \
  --query "key1" -o tsv)
```

### Task 2: Create a vector-enabled index

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SearchField,
    SearchFieldDataType,
    SimpleField,
    SearchableField,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
    SemanticConfiguration,
    SemanticSearch,
    SemanticPrioritizedFields,
    SemanticField,
)

index_client = SearchIndexClient(endpoint=endpoint, credential=credential)

# Define fields including a vector field
fields = [
    SimpleField(name="id", type=SearchFieldDataType.String, key=True, filterable=True),
    SearchableField(name="title", type=SearchFieldDataType.String, filterable=True, sortable=True),
    SearchableField(name="content", type=SearchFieldDataType.String),
    SimpleField(name="category", type=SearchFieldDataType.String, filterable=True, facetable=True),
    SearchField(
        name="contentVector",
        type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
        searchable=True,
        vector_search_dimensions=1536,
        vector_search_profile_name="vector-profile"
    ),
]

# Configure vector search
vector_search = VectorSearch(
    algorithms=[
        HnswAlgorithmConfiguration(name="hnsw-config"),
    ],
    profiles=[
        VectorSearchProfile(
            name="vector-profile",
            algorithm_configuration_name="hnsw-config",
        )
    ]
)

# Configure semantic search
semantic_config = SemanticConfiguration(
    name="semantic-config",
    prioritized_fields=SemanticPrioritizedFields(
        title_field=SemanticField(field_name="title"),
        content_fields=[SemanticField(field_name="content")]
    )
)

semantic_search = SemanticSearch(configurations=[semantic_config])

# Create the index
index = SearchIndex(
    name="vector-index",
    fields=fields,
    vector_search=vector_search,
    semantic_search=semantic_search
)

result = index_client.create_or_update_index(index)
print(f"Index '{result.name}' created with vector and semantic search")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Search.Documents.Indexes;
using Azure.Search.Documents.Indexes.Models;

var indexClient = new SearchIndexClient(endpoint, credential);

var fields = new FieldBuilder().Build(typeof(VectorDocument));
// Or define manually:
var manualFields = new List<SearchField>
{
    new SimpleField("id", SearchFieldDataType.String) { IsKey = true, IsFilterable = true },
    new SearchableField("title") { IsFilterable = true, IsSortable = true },
    new SearchableField("content"),
    new SimpleField("category", SearchFieldDataType.String) { IsFilterable = true, IsFacetable = true },
    new SearchField("contentVector", SearchFieldDataType.Collection(SearchFieldDataType.Single))
    {
        IsSearchable = true,
        VectorSearchDimensions = 1536,
        VectorSearchProfileName = "vector-profile"
    }
};

var vectorSearch = new VectorSearch();
vectorSearch.Algorithms.Add(new HnswAlgorithmConfiguration("hnsw-config"));
vectorSearch.Profiles.Add(new VectorSearchProfile("vector-profile", "hnsw-config"));

var semanticConfig = new SemanticConfiguration("semantic-config",
    new SemanticPrioritizedFields
    {
        TitleField = new SemanticField("title"),
        ContentFields = { new SemanticField("content") }
    });

var semanticSearch = new SemanticSearch();
semanticSearch.Configurations.Add(semanticConfig);

var index = new SearchIndex("vector-index", manualFields)
{
    VectorSearch = vectorSearch,
    SemanticSearch = semanticSearch
};

await indexClient.CreateOrUpdateIndexAsync(index);
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
curl -X PUT "https://${SEARCH_SERVICE}.search.windows.net/indexes/vector-index?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "name": "vector-index",
    "fields": [
      {"name": "id", "type": "Edm.String", "key": true, "filterable": true},
      {"name": "title", "type": "Edm.String", "searchable": true, "filterable": true, "sortable": true},
      {"name": "content", "type": "Edm.String", "searchable": true},
      {"name": "category", "type": "Edm.String", "filterable": true, "facetable": true},
      {
        "name": "contentVector",
        "type": "Collection(Edm.Single)",
        "searchable": true,
        "dimensions": 1536,
        "vectorSearchProfile": "vector-profile"
      }
    ],
    "vectorSearch": {
      "algorithms": [{"name": "hnsw-config", "kind": "hnsw"}],
      "profiles": [{"name": "vector-profile", "algorithm": "hnsw-config"}]
    },
    "semantic": {
      "configurations": [{
        "name": "semantic-config",
        "prioritizedFields": {
          "titleField": {"fieldName": "title"},
          "contentFields": [{"fieldName": "content"}]
        }
      }]
    }
  }'
```

</TabItem>
</Tabs>

### Task 3: Generate embeddings and upload documents

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from openai import AzureOpenAI
from azure.search.documents import SearchClient

# Initialize OpenAI client for embeddings
aoai_client = AzureOpenAI(
    api_key=AOAI_KEY,
    api_version="2024-06-01",
    azure_endpoint=AOAI_ENDPOINT
)

def get_embedding(text: str) -> list[float]:
    """Generate embedding vector for text."""
    response = aoai_client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

# Sample documents
documents = [
    {"id": "1", "title": "Azure AI Search Overview", "content": "Azure AI Search is a cloud search service with built-in AI capabilities for indexing and querying.", "category": "search"},
    {"id": "2", "title": "Vector Databases Explained", "content": "Vector databases store data as high-dimensional vectors enabling similarity search using mathematical distance.", "category": "database"},
    {"id": "3", "title": "RAG Pattern Architecture", "content": "Retrieval Augmented Generation combines search retrieval with large language model generation for accurate responses.", "category": "ai"},
    {"id": "4", "title": "Natural Language Processing", "content": "NLP enables computers to understand human language through tokenization, embeddings, and transformer models.", "category": "ai"},
]

# Generate embeddings for each document
for doc in documents:
    doc["contentVector"] = get_embedding(doc["content"])

# Upload to index
search_client = SearchClient(endpoint=endpoint, index_name="vector-index", credential=credential)
result = search_client.upload_documents(documents)
print(f"Uploaded {len(result)} documents")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.AI.OpenAI;
using Azure.Search.Documents;
using Azure.Search.Documents.Models;

var aoaiClient = new AzureOpenAIClient(
    new Uri(aoaiEndpoint),
    new AzureKeyCredential(aoaiKey));
var embeddingClient = aoaiClient.GetEmbeddingClient("text-embedding-3-small");

async Task<ReadOnlyMemory<float>> GetEmbeddingAsync(string text)
{
    var result = await embeddingClient.GenerateEmbeddingAsync(text);
    return result.Value.ToFloats();
}

var documents = new List<SearchDocument>();
var doc1 = new SearchDocument
{
    ["id"] = "1",
    ["title"] = "Azure AI Search Overview",
    ["content"] = "Azure AI Search is a cloud search service with built-in AI capabilities.",
    ["category"] = "search",
    ["contentVector"] = (await GetEmbeddingAsync("Azure AI Search is a cloud search service with built-in AI capabilities.")).ToArray()
};
documents.Add(doc1);

var searchClient = new SearchClient(endpoint, "vector-index", credential);
var uploadResult = await searchClient.UploadDocumentsAsync(documents);
Console.WriteLine($"Uploaded {uploadResult.Value.Results.Count} documents");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Generate embedding via Azure OpenAI
EMBEDDING=$(curl -s "${AOAI_ENDPOINT}/openai/deployments/text-embedding-3-small/embeddings?api-version=2024-06-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AOAI_KEY}" \
  -d '{"input": "Azure AI Search is a cloud search service."}' \
  | python -c "import sys,json; print(json.dumps(json.load(sys.stdin)['data'][0]['embedding']))")

# Upload document with vector
curl -X POST "https://${SEARCH_SERVICE}.search.windows.net/indexes/vector-index/docs/index?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "value": [
      {
        "@search.action": "upload",
        "id": "1",
        "title": "Azure AI Search Overview",
        "content": "Azure AI Search is a cloud search service.",
        "category": "search",
        "contentVector": '"${EMBEDDING}"'
      }
    ]
  }'
```

</TabItem>
</Tabs>

### Task 4: Execute vector, semantic, and hybrid queries

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.search.documents.models import VectorizedQuery

# Pure vector search
query_embedding = get_embedding("How do I find similar documents?")
vector_query = VectorizedQuery(
    vector=query_embedding,
    k_nearest_neighbors=5,
    fields="contentVector"
)

results = search_client.search(
    search_text=None,
    vector_queries=[vector_query],
    select=["id", "title", "category"]
)
print("=== Vector Search Results ===")
for result in results:
    print(f"  Score: {result['@search.score']:.4f} | {result['title']}")

# Hybrid search (keyword + vector)
results = search_client.search(
    search_text="search service cloud AI",
    vector_queries=[vector_query],
    select=["id", "title", "category"],
    top=5
)
print("\n=== Hybrid Search Results ===")
for result in results:
    print(f"  Score: {result['@search.score']:.4f} | {result['title']}")

# Hybrid + Semantic ranking
results = search_client.search(
    search_text="How does retrieval augmented generation work?",
    vector_queries=[vector_query],
    query_type="semantic",
    semantic_configuration_name="semantic-config",
    query_caption="extractive",
    select=["id", "title", "content"],
    top=5
)
print("\n=== Hybrid + Semantic Results ===")
for result in results:
    print(f"  Score: {result['@search.score']:.4f} | Reranker: {result.get('@search.reranker_score', 'N/A')} | {result['title']}")
    if result.get("@search.captions"):
        print(f"    Caption: {result['@search.captions'][0].text}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Search.Documents.Models;

var queryEmbedding = await GetEmbeddingAsync("How do I find similar documents?");

// Pure vector search
var vectorOptions = new SearchOptions
{
    VectorSearch = new()
    {
        Queries = { new VectorizedQuery(queryEmbedding) { KNearestNeighborsCount = 5, Fields = { "contentVector" } } }
    },
    Size = 5
};
vectorOptions.Select.Add("id");
vectorOptions.Select.Add("title");

var vectorResults = await searchClient.SearchAsync<SearchDocument>(null, vectorOptions);

// Hybrid + Semantic
var hybridOptions = new SearchOptions
{
    VectorSearch = new()
    {
        Queries = { new VectorizedQuery(queryEmbedding) { KNearestNeighborsCount = 5, Fields = { "contentVector" } } }
    },
    QueryType = SearchQueryType.Semantic,
    SemanticSearch = new() { SemanticConfigurationName = "semantic-config" },
    Size = 5
};
hybridOptions.Select.Add("id");
hybridOptions.Select.Add("title");
hybridOptions.Select.Add("content");

var hybridResults = await searchClient.SearchAsync<SearchDocument>(
    "How does retrieval augmented generation work?", hybridOptions);
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Hybrid search (keyword + vector + semantic)
curl -s -X POST "https://${SEARCH_SERVICE}.search.windows.net/indexes/vector-index/docs/search?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "search": "How does retrieval augmented generation work?",
    "vectorQueries": [{
      "kind": "vector",
      "vector": '"${EMBEDDING}"',
      "fields": "contentVector",
      "k": 5
    }],
    "queryType": "semantic",
    "semanticConfiguration": "semantic-config",
    "captions": "extractive",
    "select": "id,title,content",
    "top": 5
  }'
```

</TabItem>
</Tabs>

## Expected Output

```text
=== Hybrid + Semantic Results ===
  Score: 0.0322 | Reranker: 3.42 | RAG Pattern Architecture
    Caption: Retrieval Augmented Generation combines search retrieval with LLM generation...
  Score: 0.0298 | Reranker: 2.87 | Azure AI Search Overview
  Score: 0.0241 | Reranker: 1.95 | Vector Databases Explained
  Score: 0.0189 | Reranker: 1.12 | Natural Language Processing
```

## Break & fix

| # | Scenario | Symptom | Root Cause | Fix |
|---|----------|---------|------------|-----|
| 1 | Vector field dimension mismatch | Upload fails: "Vector field dimension mismatch" | Document vector has 768 dimensions but index expects 1536 | Use the same model for indexing and querying; match `dimensions` in index to model output (ada-002=1536, 3-small default=1536) |
| 2 | Semantic ranker returns no captions | Results lack `@search.captions` | `queryAnswer` or `queryCaption` not requested | Add `query_caption="extractive"` to search options |
| 3 | Hybrid search ignores vector | Results identical to keyword-only | `vectorQueries` array is empty or `fields` property doesn't match index field name | Ensure `fields` matches the vector field name in index (`contentVector`) |
| 4 | "Semantic search not available" error | HTTP 400 mentioning semantic configuration | Search service is Free tier — semantic requires Basic+ | Upgrade to Basic tier or higher |
| 5 | Poor vector search relevance | Irrelevant results returned | Query text is embedded with different model than documents | Use the same embedding model for both indexing and querying |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ai102-44-q1",
    question: "You implement hybrid search combining keyword and vector queries. How are the two result sets merged into a single ranked list?",
    options: [
      "Simple score addition",
      "Maximum score selection",
      "Reciprocal Rank Fusion (RRF)",
      "Weighted average of BM25 and cosine similarity"
    ],
    correctIndex: 2,
    explanation: "Azure AI Search uses Reciprocal Rank Fusion (RRF) to merge keyword (BM25) and vector similarity results. RRF combines rankings rather than raw scores, making it robust to score scale differences between the two approaches."
  },
  {
    id: "ai102-44-q2",
    question: "You configure a vector field with dimensions: 1536 and vectorSearchProfile: 'my-profile'. The profile uses HNSW algorithm. What does HNSW stand for and what does it optimize?",
    options: [
      "Hierarchical Navigable Small World — optimizes approximate nearest neighbor search speed",
      "High-dimensional Nearest Scalar Weighted — optimizes exact distance calculation",
      "Hybrid Neural Search Weight — optimizes semantic relevance scoring",
      "Hierarchical Normalized Similarity Weighting — optimizes cosine distance precision"
    ],
    correctIndex: 0,
    explanation: "HNSW (Hierarchical Navigable Small World) is a graph-based algorithm for approximate nearest neighbor (ANN) search. It builds a multi-layer graph enabling fast vector similarity lookups with O(log n) complexity, trading a small amount of recall for significant speed improvement."
  },
  {
    id: "ai102-44-q3",
    question: "What is the key difference between semantic ranking and vector search?",
    options: [
      "Semantic ranking uses embeddings; vector search uses keywords",
      "Semantic ranking re-ranks existing keyword results; vector search retrieves documents based on embedding similarity",
      "Semantic ranking creates new content; vector search only retrieves",
      "They are the same feature with different names"
    ],
    correctIndex: 1,
    explanation: "Semantic ranking is a RERANKER — it takes the initial keyword results and re-orders them using language understanding. Vector search is a RETRIEVER — it finds documents based on embedding distance. They can be combined: vector search retrieves candidates, then semantic ranking re-orders them."
  },
  {
    id: "ai102-44-q4",
    question: "You need to generate embeddings for a vector search index. Which Azure OpenAI model is purpose-built for this?",
    options: [
      "gpt-4o",
      "dall-e-3",
      "whisper",
      "text-embedding-3-small"
    ],
    correctIndex: 3,
    explanation: "text-embedding-3-small (and text-embedding-3-large, text-embedding-ada-002) are purpose-built embedding models that convert text to dense vectors. GPT models are for generation, DALL-E for images, and Whisper for speech. Only embedding models produce the vector format needed for search."
  },
  {
    id: "ai102-44-q5",
    question: "You execute a vector query with k=5 and also set top=3 in search options. How many results are returned?",
    options: [
      "5 (k overrides top)",
      "8 (k + top combined)",
      "3 (top limits the final response)",
      "Error — k and top cannot be used together"
    ],
    correctIndex: 2,
    explanation: "The 'k' parameter controls how many nearest neighbors the vector search retrieves internally, while 'top' limits the final number of results returned to the client. With k=5 and top=3, vector search retrieves 5 candidates but only the top 3 (after scoring/ranking) are returned."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-search --yes --no-wait
```

## Learn More

- [Vector search overview](https://learn.microsoft.com/azure/search/vector-search-overview)
- [Semantic ranking](https://learn.microsoft.com/azure/search/semantic-search-overview)
- [Hybrid search](https://learn.microsoft.com/azure/search/hybrid-search-overview)
- [HNSW algorithm in AI Search](https://learn.microsoft.com/azure/search/vector-search-ranking)
- [Generate embeddings with Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/how-to/embeddings)
