---
sidebar_position: 6
title: "Challenge 15: RAG Pattern: Advanced"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 15: RAG Pattern: Advanced

:::info Estimated Time
**60 min** | **Cost**: ~$5.00 (embeddings + search + OpenAI) | **Domain**: Generative AI & Agentic Solutions (35-40%)
:::

## Exam skills covered

- Implement advanced RAG patterns with vector and hybrid search
- Generate and use vector embeddings for semantic retrieval
- Evaluate model and flow quality using built-in metrics

## Overview

The basic RAG pattern uses keyword (lexical) search, which works well when users use the exact terminology present in documents. However, real-world queries often use synonyms, paraphrases, or conceptual descriptions that keyword search misses. **Vector search** solves this by converting both documents and queries into high-dimensional vectors (embeddings) that capture semantic meaning—allowing retrieval based on conceptual similarity rather than exact word matching.

**Hybrid search** combines the strengths of both approaches: keyword search for exact matches and acronyms, plus vector search for semantic understanding. Azure AI Search supports hybrid queries that execute both searches in parallel and fuse the results using Reciprocal Rank Fusion (RRF). Adding a **semantic ranker** on top further improves results by using a deep learning model to re-rank the fused results by true semantic relevance to the query.

**Chunking strategies** determine how documents are split before embedding. Overlapping chunks (e.g., 512 tokens with 128-token overlap) preserve context across boundaries. The embedding model (text-embedding-3-small or text-embedding-ada-002) converts each chunk into a vector stored in the search index. **Evaluation** closes the loop—metrics like groundedness (is the answer supported by retrieved context?), relevance (does it answer the question?), and coherence (is it well-structured?) quantify RAG quality for systematic improvement.

## Architecture

The advanced RAG pattern adds vector embeddings, hybrid search, and semantic ranking to improve retrieval quality, with evaluation metrics to measure end-to-end quality.

![Challenge 15 topology](/img/ai-103/challenge-15-topology.svg)

## Prerequisites

- Azure subscription with Azure OpenAI access
- Azure AI Search service (Basic tier or above for semantic ranker)
- GPT-4o deployment and text-embedding-3-small deployment
- Python 3.9+ with `openai`, `azure-search-documents`, and `azure-identity` packages
- Documents from Challenge 14 (or new sample data)

## Implementation

### Task 1: Generate Embeddings

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI

endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
api_key = os.environ["AZURE_OPENAI_KEY"]

client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=api_key,
    api_version="2024-10-21"
)

# Sample documents to embed
documents = [
    {
        "id": "1",
        "title": "Azure AI Foundry Overview",
        "content": "Azure AI Foundry is a unified platform for building generative AI applications. It provides a hub-and-project architecture where hubs manage shared infrastructure including Storage, Key Vault, and Container Registry. Projects are workspaces where teams build and deploy AI solutions.",
        "category": "platform"
    },
    {
        "id": "2",
        "title": "Azure OpenAI Model Deployment",
        "content": "Azure OpenAI supports multiple deployment types: Standard uses shared compute with pay-per-token billing. Global Standard routes traffic globally for higher availability. Provisioned reserves dedicated compute capacity with guaranteed throughput measured in PTUs.",
        "category": "models"
    },
    {
        "id": "3",
        "title": "Responsible AI and Content Filtering",
        "content": "Microsoft's Responsible AI principles include fairness, reliability, privacy, inclusiveness, transparency, and accountability. Azure AI services include built-in content filters that detect and block harmful content in categories including hate, sexual, violence, and self-harm.",
        "category": "governance"
    },
    {
        "id": "4",
        "title": "Azure AI Search Capabilities",
        "content": "Azure AI Search provides full-text search, vector search, and hybrid search combining both. Semantic ranking uses deep learning to re-rank results by relevance. Skillsets enable AI enrichment during indexing including OCR, entity recognition, and custom skills.",
        "category": "search"
    },
    {
        "id": "5",
        "title": "Vector Embeddings and Semantic Search",
        "content": "Vector embeddings represent text as high-dimensional numerical arrays capturing semantic meaning. Similar concepts have vectors close together in embedding space. Text-embedding-3-small produces 1536-dimension vectors optimized for search and retrieval tasks.",
        "category": "search"
    }
]

# Generate embeddings for each document
for doc in documents:
    response = client.embeddings.create(
        model="text-embedding-3-small",  # deployment name
        input=doc["content"]
    )
    doc["content_vector"] = response.data[0].embedding
    print(f"Embedded '{doc['title']}': {len(doc['content_vector'])} dimensions")

# Generate embedding for a query
query = "How do I deploy AI models with guaranteed performance?"
query_response = client.embeddings.create(
    model="text-embedding-3-small",
    input=query
)
query_vector = query_response.data[0].embedding
print(f"\nQuery embedded: '{query}' -> {len(query_vector)} dimensions")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Embeddings;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

var client = new AzureOpenAIClient(
    new Uri(endpoint), new AzureKeyCredential(apiKey));
var embeddingClient = client.GetEmbeddingClient("text-embedding-3-small");

// Documents to embed
var documents = new[]
{
    new { Id = "1", Title = "Azure AI Foundry Overview",
        Content = "Azure AI Foundry is a unified platform for building generative AI applications..." },
    new { Id = "2", Title = "Azure OpenAI Model Deployment",
        Content = "Azure OpenAI supports Standard, Global Standard, and Provisioned deployment types..." },
    new { Id = "3", Title = "Responsible AI and Content Filtering",
        Content = "Microsoft's Responsible AI principles include fairness, reliability, privacy..." },
    new { Id = "4", Title = "Azure AI Search Capabilities",
        Content = "Azure AI Search provides full-text, vector, and hybrid search..." },
    new { Id = "5", Title = "Vector Embeddings",
        Content = "Vector embeddings represent text as high-dimensional arrays capturing semantic meaning..." }
};

// Generate embeddings
var embeddingsResults = new Dictionary<string, ReadOnlyMemory<float>>();
foreach (var doc in documents)
{
    var result = await embeddingClient.GenerateEmbeddingAsync(doc.Content);
    embeddingsResults[doc.Id] = result.Value.ToFloats();
    Console.WriteLine($"Embedded '{doc.Title}': {result.Value.ToFloats().Length} dimensions");
}

// Embed a query
string query = "How do I deploy AI models with guaranteed performance?";
var queryResult = await embeddingClient.GenerateEmbeddingAsync(query);
var queryVector = queryResult.Value.ToFloats();
Console.WriteLine($"\nQuery embedded: {queryVector.Length} dimensions");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
AZURE_OPENAI_ENDPOINT="https://aoai-ai102-challenge15.openai.azure.com"
AZURE_OPENAI_KEY="YOUR_KEY"

# Generate embedding for a document
curl -s "${AZURE_OPENAI_ENDPOINT}/openai/deployments/text-embedding-3-small/embeddings?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "input": "Azure AI Foundry is a unified platform for building generative AI applications. It provides a hub-and-project architecture."
  }' | jq '{dimensions: (.data[0].embedding | length), first_5: (.data[0].embedding[:5])}'

# Generate embedding for a query
curl -s "${AZURE_OPENAI_ENDPOINT}/openai/deployments/text-embedding-3-small/embeddings?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "input": "How do I deploy AI models with guaranteed performance?"
  }' | jq '{dimensions: (.data[0].embedding | length), usage: .usage}'
```

</TabItem>
</Tabs>

### Task 2: Create Vector Index with Hybrid Fields

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.identity import DefaultAzureCredential
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SimpleField,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
    SemanticConfiguration,
    SemanticSearch,
    SemanticPrioritizedFields,
    SemanticField,
)

endpoint = os.environ["AZURE_SEARCH_ENDPOINT"]
credential = DefaultAzureCredential()

index_client = SearchIndexClient(endpoint=endpoint, credential=credential)

# Define index with vector field + keyword fields + semantic config
fields = [
    SimpleField(name="id", type=SearchFieldDataType.String, key=True, filterable=True),
    SearchableField(name="title", type=SearchFieldDataType.String, filterable=True),
    SearchableField(name="content", type=SearchFieldDataType.String),
    SimpleField(name="category", type=SearchFieldDataType.String, filterable=True, facetable=True),
    # Vector field for embeddings
    SearchField(
        name="content_vector",
        type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
        searchable=True,
        vector_search_dimensions=1536,
        vector_search_profile_name="my-vector-profile"
    ),
]

# Configure vector search with HNSW algorithm
vector_search = VectorSearch(
    algorithms=[
        HnswAlgorithmConfiguration(
            name="my-hnsw-config",
            parameters={
                "m": 4,
                "efConstruction": 400,
                "efSearch": 500,
                "metric": "cosine"
            }
        )
    ],
    profiles=[
        VectorSearchProfile(
            name="my-vector-profile",
            algorithm_configuration_name="my-hnsw-config"
        )
    ]
)

# Configure semantic ranking
semantic_config = SemanticConfiguration(
    name="my-semantic-config",
    prioritized_fields=SemanticPrioritizedFields(
        title_field=SemanticField(field_name="title"),
        content_fields=[SemanticField(field_name="content")]
    )
)

semantic_search = SemanticSearch(configurations=[semantic_config])

# Create the index
index = SearchIndex(
    name="ai102-vector-index",
    fields=fields,
    vector_search=vector_search,
    semantic_search=semantic_search
)

result = index_client.create_or_update_index(index)
print(f"Vector index created: {result.name}")
print(f"  Vector dimensions: 1536")
print(f"  Algorithm: HNSW (cosine similarity)")
print(f"  Semantic config: my-semantic-config")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.Identity;
using Azure.Search.Documents.Indexes;
using Azure.Search.Documents.Indexes.Models;

string searchEndpoint = Environment.GetEnvironmentVariable("AZURE_SEARCH_ENDPOINT")!;
var credential = new DefaultAzureCredential();

var indexClient = new SearchIndexClient(new Uri(searchEndpoint), credential);

// Define fields including vector field
var fields = new List<SearchField>
{
    new SimpleField("id", SearchFieldDataType.String) { IsKey = true, IsFilterable = true },
    new SearchableField("title") { IsFilterable = true },
    new SearchableField("content"),
    new SimpleField("category", SearchFieldDataType.String) { IsFilterable = true, IsFacetable = true },
    new SearchField("content_vector", SearchFieldDataType.Collection(SearchFieldDataType.Single))
    {
        IsSearchable = true,
        VectorSearchDimensions = 1536,
        VectorSearchProfileName = "my-vector-profile"
    }
};

// Configure vector search
var vectorSearch = new VectorSearch();
vectorSearch.Algorithms.Add(new HnswAlgorithmConfiguration("my-hnsw-config")
{
    Parameters = new HnswParameters
    {
        M = 4,
        EfConstruction = 400,
        EfSearch = 500,
        Metric = VectorSearchAlgorithmMetric.Cosine
    }
});
vectorSearch.Profiles.Add(new VectorSearchProfile("my-vector-profile", "my-hnsw-config"));

// Configure semantic search
var semanticConfig = new SemanticConfiguration("my-semantic-config",
    new SemanticPrioritizedFields
    {
        TitleField = new SemanticField("title"),
        ContentFields = { new SemanticField("content") }
    });

var index = new SearchIndex("ai102-vector-index")
{
    Fields = fields,
    VectorSearch = vectorSearch,
    SemanticSearch = new SemanticSearch { Configurations = { semanticConfig } }
};

var result = await indexClient.CreateOrUpdateIndexAsync(index);
Console.WriteLine($"Vector index created: {result.Value.Name}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
AZURE_SEARCH_ENDPOINT="https://search-ai102-challenge15.search.windows.net"
AZURE_SEARCH_KEY="YOUR_SEARCH_ADMIN_KEY"

# Create vector index with semantic configuration
curl -X PUT \
  "${AZURE_SEARCH_ENDPOINT}/indexes/ai102-vector-index?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_SEARCH_KEY}" \
  -d '{
    "name": "ai102-vector-index",
    "fields": [
      {"name": "id", "type": "Edm.String", "key": true, "filterable": true},
      {"name": "title", "type": "Edm.String", "searchable": true, "filterable": true},
      {"name": "content", "type": "Edm.String", "searchable": true},
      {"name": "category", "type": "Edm.String", "filterable": true, "facetable": true},
      {
        "name": "content_vector",
        "type": "Collection(Edm.Single)",
        "searchable": true,
        "dimensions": 1536,
        "vectorSearchProfile": "my-vector-profile"
      }
    ],
    "vectorSearch": {
      "algorithms": [{
        "name": "my-hnsw-config",
        "kind": "hnsw",
        "hnswParameters": {"m": 4, "efConstruction": 400, "efSearch": 500, "metric": "cosine"}
      }],
      "profiles": [{
        "name": "my-vector-profile",
        "algorithm": "my-hnsw-config"
      }]
    },
    "semantic": {
      "configurations": [{
        "name": "my-semantic-config",
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

### Task 3: Upload Documents with Vectors and Run Hybrid Search

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery

# Initialize clients
openai_endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
openai_key = os.environ["AZURE_OPENAI_KEY"]
search_endpoint = os.environ["AZURE_SEARCH_ENDPOINT"]

openai_client = AzureOpenAI(
    azure_endpoint=openai_endpoint,
    api_key=openai_key,
    api_version="2024-10-21"
)

search_client = SearchClient(
    endpoint=search_endpoint,
    index_name="ai102-vector-index",
    credential=DefaultAzureCredential()
)

# Documents with pre-computed embeddings
documents = [
    {"id": "1", "title": "Azure AI Foundry Overview", "content": "Azure AI Foundry is a unified platform...", "category": "platform"},
    {"id": "2", "title": "Azure OpenAI Deployment Types", "content": "Azure OpenAI supports Standard, Global Standard, and Provisioned deployment types...", "category": "models"},
    {"id": "3", "title": "Responsible AI", "content": "Microsoft's Responsible AI principles include fairness, reliability, privacy...", "category": "governance"},
    {"id": "4", "title": "Azure AI Search", "content": "Azure AI Search provides full-text, vector, and hybrid search...", "category": "search"},
    {"id": "5", "title": "Vector Embeddings", "content": "Vector embeddings represent text as high-dimensional numerical arrays...", "category": "search"},
]

# Generate embeddings and upload
for doc in documents:
    embedding_response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=doc["content"]
    )
    doc["content_vector"] = embedding_response.data[0].embedding

result = search_client.upload_documents(documents=documents)
print(f"Uploaded {len(result)} documents with vectors")

# --- Hybrid Search (keyword + vector) ---
query_text = "How do I get guaranteed model performance?"

# Generate query embedding
query_embedding = openai_client.embeddings.create(
    model="text-embedding-3-small",
    input=query_text
).data[0].embedding

# Execute hybrid search (combines keyword + vector via RRF)
results = search_client.search(
    search_text=query_text,  # Keyword component
    vector_queries=[
        VectorizedQuery(
            vector=query_embedding,
            k_nearest_neighbors=3,
            fields="content_vector"
        )
    ],
    query_type="semantic",  # Enable semantic ranking
    semantic_configuration_name="my-semantic-config",
    top=3
)

print(f"\nHybrid Search Results for: '{query_text}'")
print("-" * 60)
for result in results:
    print(f"  Score: {result['@search.score']:.4f} | "
          f"Reranker: {result.get('@search.reranker_score', 'N/A')} | "
          f"Title: {result['title']}")
    print(f"  Content: {result['content'][:100]}...")
    print()
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.Identity;
using Azure.AI.OpenAI;
using Azure.Search.Documents;
using Azure.Search.Documents.Models;
using OpenAI.Embeddings;

string openaiEndpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string openaiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;
string searchEndpoint = Environment.GetEnvironmentVariable("AZURE_SEARCH_ENDPOINT")!;

var openaiClient = new AzureOpenAIClient(
    new Uri(openaiEndpoint), new AzureKeyCredential(openaiKey));
var embeddingClient = openaiClient.GetEmbeddingClient("text-embedding-3-small");

var searchClient = new SearchClient(
    new Uri(searchEndpoint), "ai102-vector-index", new DefaultAzureCredential());

// Upload documents with vectors
var documents = new List<Dictionary<string, object>>();
var docContents = new[] {
    ("1", "Azure AI Foundry Overview", "Azure AI Foundry is a unified platform...", "platform"),
    ("2", "Deployment Types", "Azure OpenAI supports Standard, Global Standard, and Provisioned...", "models"),
    ("3", "Responsible AI", "Microsoft's Responsible AI principles...", "governance")
};

foreach (var (id, title, content, category) in docContents)
{
    var embedding = await embeddingClient.GenerateEmbeddingAsync(content);
    documents.Add(new Dictionary<string, object>
    {
        ["id"] = id, ["title"] = title,
        ["content"] = content, ["category"] = category,
        ["content_vector"] = embedding.Value.ToFloats().ToArray()
    });
}

await searchClient.IndexDocumentsAsync(IndexDocumentsBatch.Upload(documents));
Console.WriteLine($"Uploaded {documents.Count} documents with vectors");

// Hybrid search
string query = "How do I get guaranteed model performance?";
var queryEmbedding = await embeddingClient.GenerateEmbeddingAsync(query);

var searchOptions = new SearchOptions
{
    QueryType = SearchQueryType.Semantic,
    SemanticSearch = new SemanticSearchOptions
    {
        SemanticConfigurationName = "my-semantic-config"
    },
    Size = 3,
    VectorSearch = new VectorSearchOptions
    {
        Queries =
        {
            new VectorizedQuery(queryEmbedding.Value.ToFloats())
            {
                KNearestNeighborsCount = 3,
                Fields = { "content_vector" }
            }
        }
    }
};

var results = await searchClient.SearchAsync<SearchDocument>(query, searchOptions);
Console.WriteLine($"\nHybrid Search Results for: '{query}'");
await foreach (var result in results.Value.GetResultsAsync())
{
    Console.WriteLine($"  Score: {result.Score:F4} | Title: {result.Document["title"]}");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
AZURE_SEARCH_ENDPOINT="https://search-ai102-challenge15.search.windows.net"
AZURE_SEARCH_KEY="YOUR_SEARCH_KEY"

# First, get query embedding
QUERY_VECTOR=$(curl -s "${AZURE_OPENAI_ENDPOINT}/openai/deployments/text-embedding-3-small/embeddings?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{"input": "How do I get guaranteed model performance?"}' \
  | jq -c '.data[0].embedding')

# Hybrid search (keyword + vector + semantic ranking)
curl -s "${AZURE_SEARCH_ENDPOINT}/indexes/ai102-vector-index/docs/search?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_SEARCH_KEY}" \
  -d '{
    "search": "How do I get guaranteed model performance?",
    "vectorQueries": [{
      "kind": "vector",
      "vector": '"${QUERY_VECTOR}"',
      "k": 3,
      "fields": "content_vector"
    }],
    "queryType": "semantic",
    "semanticConfiguration": "my-semantic-config",
    "top": 3
  }' | jq '.value[] | {score: ."@search.score", rerankerScore: ."@search.rerankerScore", title}'
```

</TabItem>
</Tabs>

### Task 4: RAG with Hybrid Search

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI

endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
api_key = os.environ["AZURE_OPENAI_KEY"]
search_endpoint = os.environ["AZURE_SEARCH_ENDPOINT"]
search_key = os.environ["AZURE_SEARCH_KEY"]

client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=api_key,
    api_version="2024-10-21"
)

# RAG with hybrid search (vector + keyword + semantic ranking)
question = "How can I ensure consistent AI model performance for production workloads?"

response = client.chat.completions.create(
    model="gpt-4o-standard",
    messages=[
        {"role": "system", "content": "You are an Azure AI expert. Answer based on the provided context. Cite your sources."},
        {"role": "user", "content": question}
    ],
    extra_body={
        "data_sources": [
            {
                "type": "azure_search",
                "parameters": {
                    "endpoint": search_endpoint,
                    "index_name": "ai102-vector-index",
                    "authentication": {
                        "type": "api_key",
                        "key": search_key
                    },
                    "query_type": "vector_semantic_hybrid",
                    "embedding_dependency": {
                        "type": "deployment_name",
                        "deployment_name": "text-embedding-3-small"
                    },
                    "semantic_configuration": "my-semantic-config",
                    "top_n_documents": 3,
                    "in_scope": True
                }
            }
        ]
    }
)

print(f"Question: {question}")
print(f"\nAnswer (Hybrid RAG):")
print(response.choices[0].message.content)
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using Azure.AI.OpenAI.Chat;
using OpenAI.Chat;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;
string searchEndpoint = Environment.GetEnvironmentVariable("AZURE_SEARCH_ENDPOINT")!;
string searchKey = Environment.GetEnvironmentVariable("AZURE_SEARCH_KEY")!;

var client = new AzureOpenAIClient(
    new Uri(endpoint), new AzureKeyCredential(apiKey));
var chatClient = client.GetChatClient("gpt-4o-standard");

// Configure hybrid search data source
var dataSource = new AzureSearchChatDataSource
{
    Endpoint = new Uri(searchEndpoint),
    IndexName = "ai102-vector-index",
    Authentication = DataSourceAuthentication.FromApiKey(searchKey),
    QueryType = DataSourceQueryType.VectorSemanticHybrid,
    VectorizationSource = DataSourceVectorizer.FromDeploymentName("text-embedding-3-small"),
    SemanticConfiguration = "my-semantic-config",
    TopNDocuments = 3,
    InScope = true
};

var options = new ChatCompletionOptions();
options.AddDataSource(dataSource);

string question = "How can I ensure consistent AI model performance for production?";
var messages = new ChatMessage[]
{
    new SystemChatMessage("You are an Azure AI expert. Answer based on provided context."),
    new UserChatMessage(question)
};

var response = await chatClient.CompleteChatAsync(messages, options);
Console.WriteLine($"Question: {question}");
Console.WriteLine($"\nAnswer (Hybrid RAG):");
Console.WriteLine(response.Value.Content[0].Text);
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# RAG with hybrid search (vector + semantic + keyword)
curl -s "${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o-standard/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are an Azure AI expert. Answer based on provided context."},
      {"role": "user", "content": "How can I ensure consistent AI model performance for production?"}
    ],
    "data_sources": [{
      "type": "azure_search",
      "parameters": {
        "endpoint": "'${AZURE_SEARCH_ENDPOINT}'",
        "index_name": "ai102-vector-index",
        "authentication": {"type": "api_key", "key": "'${AZURE_SEARCH_KEY}'"},
        "query_type": "vector_semantic_hybrid",
        "embedding_dependency": {
          "type": "deployment_name",
          "deployment_name": "text-embedding-3-small"
        },
        "semantic_configuration": "my-semantic-config",
        "top_n_documents": 3,
        "in_scope": true
      }
    }]
  }' | jq -r '.choices[0].message.content'
```

</TabItem>
</Tabs>

### Task 5: Evaluate RAG Quality

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI

endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
api_key = os.environ["AZURE_OPENAI_KEY"]

client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=api_key,
    api_version="2024-10-21"
)

# Test cases for evaluation
test_cases = [
    {
        "question": "What deployment type guarantees throughput?",
        "context": "Azure OpenAI supports Standard (shared compute), Global Standard (global routing), and Provisioned (dedicated compute with guaranteed throughput measured in PTUs).",
        "answer": "Provisioned deployment type guarantees throughput by reserving dedicated compute capacity measured in Provisioned Throughput Units (PTUs).",
        "ground_truth": "Provisioned deployments reserve dedicated compute capacity with guaranteed throughput."
    },
    {
        "question": "How does hybrid search work?",
        "context": "Azure AI Search provides full-text search, vector search, and hybrid search combining both. Results are fused using Reciprocal Rank Fusion (RRF).",
        "answer": "Hybrid search combines keyword (full-text) search and vector search, fusing results using Reciprocal Rank Fusion (RRF) to leverage both exact matching and semantic similarity.",
        "ground_truth": "Hybrid search combines keyword and vector search using RRF fusion."
    }
]

# Evaluate: Groundedness, Relevance, Coherence
metrics = ["groundedness", "relevance", "coherence"]

evaluation_prompt = """You are an AI quality evaluator. Rate the following on a scale of 1-5:

Metric: {metric}
- Groundedness: Is the answer fully supported by the provided context? (1=fabricated, 5=fully supported)
- Relevance: Does the answer directly address the question? (1=irrelevant, 5=perfectly relevant)
- Coherence: Is the answer well-structured and easy to understand? (1=incoherent, 5=perfectly clear)

Question: {question}
Context: {context}
Answer: {answer}

Return ONLY a single number (1-5)."""

print("=" * 70)
print("RAG QUALITY EVALUATION")
print("=" * 70)

for i, test in enumerate(test_cases):
    print(f"\nTest Case {i+1}: {test['question']}")
    scores = {}

    for metric in metrics:
        response = client.chat.completions.create(
            model="gpt-4o-standard",
            messages=[
                {"role": "user", "content": evaluation_prompt.format(
                    metric=metric,
                    question=test["question"],
                    context=test["context"],
                    answer=test["answer"]
                )}
            ],
            max_tokens=5,
            temperature=0.0
        )
        score = response.choices[0].message.content.strip()
        scores[metric] = score

    print(f"  Groundedness: {scores['groundedness']}/5")
    print(f"  Relevance:    {scores['relevance']}/5")
    print(f"  Coherence:    {scores['coherence']}/5")

print("\n" + "=" * 70)
print("EVALUATION COMPLETE")
print("Target: All metrics >= 4 for production readiness")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

var client = new AzureOpenAIClient(
    new Uri(endpoint), new AzureKeyCredential(apiKey));
var chatClient = client.GetChatClient("gpt-4o-standard");

var testCases = new[]
{
    new {
        Question = "What deployment type guarantees throughput?",
        Context = "Provisioned deployments reserve dedicated compute capacity with guaranteed throughput measured in PTUs.",
        Answer = "Provisioned deployment type guarantees throughput with dedicated compute and PTUs."
    },
    new {
        Question = "How does hybrid search work?",
        Context = "Azure AI Search provides full-text, vector, and hybrid search. Results fused using RRF.",
        Answer = "Hybrid search combines keyword and vector search, fusing results with RRF."
    }
};

string[] metrics = { "groundedness", "relevance", "coherence" };

Console.WriteLine("=== RAG QUALITY EVALUATION ===\n");

foreach (var test in testCases)
{
    Console.WriteLine($"Q: {test.Question}");
    foreach (var metric in metrics)
    {
        string prompt = $@"Rate {metric} (1-5). Return ONLY a number.
Question: {test.Question}
Context: {test.Context}
Answer: {test.Answer}";

        var response = await chatClient.CompleteChatAsync(new[]
        {
            new UserChatMessage(prompt)
        }, new ChatCompletionOptions { MaxOutputTokenCount = 5, Temperature = 0f });

        Console.WriteLine($"  {metric}: {response.Value.Content[0].Text.Trim()}/5");
    }
    Console.WriteLine();
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Evaluate groundedness
curl -s "${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o-standard/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Rate groundedness (1-5). Return ONLY a number.\n\nQuestion: What deployment type guarantees throughput?\nContext: Provisioned deployments reserve dedicated compute capacity with guaranteed throughput measured in PTUs.\nAnswer: Provisioned deployment guarantees throughput with dedicated PTUs.\n\nScore:"
    }],
    "max_tokens": 5,
    "temperature": 0
  }' | jq -r '.choices[0].message.content'

# For production evaluation, use Azure AI Foundry's built-in evaluators:
# pip install azure-ai-evaluation
# from azure.ai.evaluation import GroundednessEvaluator, RelevanceEvaluator
```

</TabItem>
</Tabs>

## Expected Output

After completing all tasks, you should have:

1. **Vector embeddings** generated using text-embedding-3-small (1536 dimensions)
2. **Vector search index** `ai102-vector-index` with:
   - HNSW algorithm configuration (cosine similarity)
   - Semantic ranking configuration
   - Both searchable text fields and vector field
3. **Hybrid search results** combining keyword, vector, and semantic ranking
4. **RAG responses** using `vector_semantic_hybrid` query type
5. **Evaluation scores** for groundedness, relevance, and coherence (target ≥ 4/5)

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Vector dimension mismatch | `InvalidVectorDimensionError` | Index expects 1536 but embedding has different dimensions | Ensure embedding model deployment matches index `dimensions` field |
| Semantic ranker unavailable | `SemanticSearchNotAvailable` | Search service on Free tier | Upgrade to Basic tier or above for semantic ranking |
| Empty vector search results | 0 hits despite relevant documents | Vector field not populated or wrong field name in query | Verify `content_vector` field has data; check `fields` param in query |
| Low evaluation scores | Groundedness < 3 | Retrieved chunks not relevant; chunking too coarse | Reduce chunk size, add overlap, or increase `top_n_documents` |
| Embedding rate limit | 429 on embeddings endpoint | Too many embedding requests in batch | Add delays between batches; deploy with higher TPM |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ch15-q1",
    question: "What advantage does hybrid search provide over pure vector search or pure keyword search?",
    options: [
      "It's faster because it uses less compute",
      "It combines keyword precision for exact matches with vector semantic understanding, using RRF to fuse results",
      "It eliminates the need for embeddings",
      "It only works with the semantic ranker enabled"
    ],
    correctAnswer: 1,
    explanation: "Hybrid search combines keyword search (precise for exact terms, acronyms, IDs) with vector search (semantic understanding of concepts and synonyms). Reciprocal Rank Fusion (RRF) merges both result sets, providing better recall than either approach alone."
  },
  {
    id: "ch15-q2",
    question: "What does the HNSW algorithm in Azure AI Search vector configuration control?",
    options: [
      "How documents are chunked before indexing",
      "The text tokenization strategy for keyword search",
      "The approximate nearest neighbor search algorithm for vector queries",
      "The semantic ranking model selection"
    ],
    correctAnswer: 2,
    explanation: "HNSW (Hierarchical Navigable Small World) is the approximate nearest neighbor (ANN) algorithm used for vector search. It builds a graph structure that enables fast similarity search across high-dimensional vectors, with configurable parameters (m, efConstruction, efSearch) that trade speed for accuracy."
  },
  {
    id: "ch15-q3",
    question: "When configuring 'On Your Data' with query_type 'vector_semantic_hybrid', what three search techniques are combined?",
    options: [
      "Keyword (full-text) search, vector similarity search, and semantic re-ranking",
      "OCR, entity recognition, and sentiment analysis",
      "Document search, image search, and audio search",
      "SQL queries, graph queries, and text queries"
    ],
    correctAnswer: 0,
    explanation: "The 'vector_semantic_hybrid' query type combines: 1) keyword/full-text search for exact matching, 2) vector similarity search for semantic understanding, and 3) semantic re-ranking using a deep learning model to re-order results by true relevance."
  },
  {
    id: "ch15-q4",
    question: "What does the 'groundedness' evaluation metric measure in a RAG system?",
    options: [
      "Whether the system is connected to the ground truth database",
      "Whether the model was fine-tuned on domain data",
      "Whether the vector embeddings are accurate",
      "Whether the generated answer is fully supported by the retrieved context documents"
    ],
    correctAnswer: 3,
    explanation: "Groundedness measures whether the generated answer is supported by the retrieved context. A high groundedness score means the LLM's response is factually based on the provided documents rather than hallucinated from training data. This is a key metric for RAG quality."
  },
  {
    id: "ch15-q5",
    question: "What is the purpose of overlapping chunks in a RAG chunking strategy?",
    options: [
      "To increase the index size for better billing",
      "To make vector search faster",
      "To preserve context that might be split at chunk boundaries",
      "To reduce the number of embedding API calls needed"
    ],
    correctAnswer: 2,
    explanation: "Overlapping chunks (e.g., 512 tokens with 128-token overlap) ensure that information spanning a chunk boundary is captured in at least one chunk. Without overlap, relevant context split between two chunks might not be retrieved for queries about that boundary content."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-challenge15 --yes --no-wait
```

## Learn More

- [Vector search in Azure AI Search](https://learn.microsoft.com/azure/search/vector-search-overview)
- [Hybrid search](https://learn.microsoft.com/azure/search/hybrid-search-overview)
- [Semantic ranking](https://learn.microsoft.com/azure/search/semantic-search-overview)
- [Azure OpenAI embeddings](https://learn.microsoft.com/azure/ai-services/openai/concepts/understand-embeddings)
- [RAG evaluation with Azure AI](https://learn.microsoft.com/azure/ai-studio/how-to/evaluate-generative-ai-app)
- [Chunking strategies](https://learn.microsoft.com/azure/search/vector-search-how-to-chunk-documents)
