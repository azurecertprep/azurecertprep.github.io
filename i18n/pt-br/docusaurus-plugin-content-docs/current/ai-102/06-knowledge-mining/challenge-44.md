---
sidebar_position: 6
title: "Desafio 44: Pesquisa SemÃ¢ntica e Vetorial"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 44: Pesquisa SemÃ¢ntica e Vetorial

:::info Tempo Estimado
**60-75 min** | **Custo**: ~$1.50 (Search tier Basic + OpenAI embeddings) | **DomÃ­nio**: Knowledge Mining & Extraction (15-20%)
:::

:::warning Requisito de Tier
O ranking semÃ¢ntico requer **tier Basic ou superior** para o Azure AI Search. A pesquisa vetorial requer **tier Basic ou superior**. O tier Free nÃ£o suporta esses recursos.
:::

## Habilidades do exame cobertas

| Habilidade | Peso |
|-------|--------|
| Configurar ranking semÃ¢ntico em um Ã­ndice | Alto |
| Implementar pesquisa vetorial com embeddings | Alto |
| Executar consultas de pesquisa hÃ­brida (keyword + vetor) | Alto |
| Gerar embeddings com Azure OpenAI | Alto |
| Configurar perfis e algoritmos de pesquisa vetorial | MÃ©dio |

## VisÃ£o Geral

### Ranking semÃ¢ntico
O ranking semÃ¢ntico reclassifica os resultados iniciais de pesquisa por palavras-chave usando modelos de deep learning que entendem o significado e o contexto das consultas e documentos. Ele nÃ£o altera quais documentos correspondem â€” ele reordena os principais resultados para melhor relevÃ¢ncia.

### Pesquisa vetorial
A pesquisa vetorial encontra documentos com base na similaridade matemÃ¡tica entre embeddings vetoriais (representaÃ§Ãµes numÃ©ricas densas). Diferente da pesquisa por palavras-chave, ela encontra conteÃºdo semanticamente similar mesmo sem termos compartilhados.

### Pesquisa hÃ­brida
Combina a pontuaÃ§Ã£o por palavras-chave (BM25) com a similaridade vetorial, produzindo o melhor de ambas as abordagens. Um algoritmo de **Reciprocal Rank Fusion (RRF)** mescla as listas classificadas.

| Abordagem | Encontra "carro" quando a consulta Ã© "automÃ³vel" | CorrespondÃªncia exata de frase | Melhor para |
|----------|--------|--------|---------|
| Somente keyword | âŒ | âœ… | Busca de item conhecido |
| Somente vetor | âœ… | âŒ | Similaridade semÃ¢ntica |
| HÃ­brida | âœ… | âœ… | CenÃ¡rios RAG em produÃ§Ã£o |

## PrÃ©-requisitos

- Azure AI Search (tier Basic ou superior)
- Azure OpenAI com `text-embedding-ada-002` ou `text-embedding-3-small` implantado
- Python 3.9+ com `azure-search-documents>=11.4.0`, `openai>=1.0.0`
- .NET 8 com `Azure.Search.Documents`, `Azure.AI.OpenAI`

## ImplementaÃ§Ã£o

### Tarefa 1: Implantar um embedding model

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

### Tarefa 2: Criar um Ã­ndice habilitado para vetores

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

### Tarefa 3: Gerar embeddings e fazer upload de documentos

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

### Tarefa 4: Executar consultas vetoriais, semÃ¢nticas e hÃ­bridas

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

## SaÃ­da Esperada

```text
=== Hybrid + Semantic Results ===
  Score: 0.0322 | Reranker: 3.42 | RAG Pattern Architecture
    Caption: Retrieval Augmented Generation combines search retrieval with LLM generation...
  Score: 0.0298 | Reranker: 2.87 | Azure AI Search Overview
  Score: 0.0241 | Reranker: 1.95 | Vector Databases Explained
  Score: 0.0189 | Reranker: 1.12 | Natural Language Processing
```

## Quebra & conserta

| # | CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---|----------|---------|------------|-----|
| 1 | Incompatibilidade de dimensÃµes vetoriais | Upload falha: "Vector field dimension mismatch" | O vetor do documento tem 768 dimensÃµes mas o Ã­ndice espera 1536 | Use o mesmo modelo para indexaÃ§Ã£o e consulta; combine `dimensions` no Ã­ndice com a saÃ­da do modelo (ada-002=1536, 3-small padrÃ£o=1536) |
| 2 | Ranking semÃ¢ntico nÃ£o retorna captions | Resultados nÃ£o possuem `@search.captions` | `queryAnswer` ou `queryCaption` nÃ£o foi solicitado | Adicione `query_caption="extractive"` Ã s opÃ§Ãµes de pesquisa |
| 3 | Pesquisa hÃ­brida ignora o vetor | Resultados idÃªnticos Ã  pesquisa somente por keyword | O array `vectorQueries` estÃ¡ vazio ou a propriedade `fields` nÃ£o corresponde ao nome do campo no Ã­ndice | Garanta que `fields` corresponda ao nome do campo vetorial no Ã­ndice (`contentVector`) |
| 4 | Erro "Semantic search not available" | HTTP 400 mencionando configuraÃ§Ã£o semÃ¢ntica | O serviÃ§o de pesquisa Ã© tier Free â€” semÃ¢ntico requer Basic+ | FaÃ§a upgrade para o tier Basic ou superior |
| 5 | RelevÃ¢ncia ruim na pesquisa vetorial | Resultados irrelevantes retornados | O texto da consulta foi embeddado com modelo diferente dos documentos | Use o mesmo embedding model tanto para indexaÃ§Ã£o quanto para consultas |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ai102-44-q1",
    question: "VocÃª implementa pesquisa hÃ­brida combinando consultas por keyword e vetor. Como os dois conjuntos de resultados sÃ£o mesclados em uma Ãºnica lista classificada?",
    options: [
      "Soma simples de pontuaÃ§Ãµes",
      "SeleÃ§Ã£o da pontuaÃ§Ã£o mÃ¡xima",
      "Reciprocal Rank Fusion (RRF)",
      "MÃ©dia ponderada de BM25 e similaridade de cosseno"
    ],
    correctIndex: 2,
    explanation: "O Azure AI Search usa Reciprocal Rank Fusion (RRF) para mesclar resultados de keyword (BM25) e similaridade vetorial. O RRF combina classificaÃ§Ãµes em vez de pontuaÃ§Ãµes brutas, tornando-o robusto a diferenÃ§as de escala de pontuaÃ§Ã£o entre as duas abordagens."
  },
  {
    id: "ai102-44-q2",
    question: "VocÃª configura um campo vetorial com dimensions: 1536 e vectorSearchProfile: 'my-profile'. O perfil usa o algoritmo HNSW. O que significa HNSW e o que ele otimiza?",
    options: [
      "Hierarchical Navigable Small World â€” otimiza a velocidade de busca aproximada de vizinhos mais prÃ³ximos",
      "High-dimensional Nearest Scalar Weighted â€” otimiza o cÃ¡lculo exato de distÃ¢ncia",
      "Hybrid Neural Search Weight â€” otimiza a pontuaÃ§Ã£o de relevÃ¢ncia semÃ¢ntica",
      "Hierarchical Normalized Similarity Weighting â€” otimiza a precisÃ£o da distÃ¢ncia de cosseno"
    ],
    correctIndex: 0,
    explanation: "HNSW (Hierarchical Navigable Small World) Ã© um algoritmo baseado em grafo para busca aproximada de vizinhos mais prÃ³ximos (ANN). Ele constrÃ³i um grafo multicamadas permitindo buscas rÃ¡pidas de similaridade vetorial com complexidade O(log n), trocando uma pequena quantidade de recall por melhoria significativa de velocidade."
  },
  {
    id: "ai102-44-q3",
    question: "Qual Ã© a diferenÃ§a principal entre ranking semÃ¢ntico e pesquisa vetorial?",
    options: [
      "O ranking semÃ¢ntico usa embeddings; a pesquisa vetorial usa keywords",
      "O ranking semÃ¢ntico reclassifica resultados existentes de keyword; a pesquisa vetorial recupera documentos com base na similaridade de embeddings",
      "O ranking semÃ¢ntico cria novo conteÃºdo; a pesquisa vetorial apenas recupera",
      "SÃ£o o mesmo recurso com nomes diferentes"
    ],
    correctIndex: 1,
    explanation: "O ranking semÃ¢ntico Ã© um RERANKER â€” ele pega os resultados iniciais de keyword e os reordena usando compreensÃ£o de linguagem. A pesquisa vetorial Ã© um RETRIEVER â€” ela encontra documentos com base na distÃ¢ncia de embeddings. Eles podem ser combinados: a pesquisa vetorial recupera candidatos, depois o ranking semÃ¢ntico os reordena."
  },
  {
    id: "ai102-44-q4",
    question: "VocÃª precisa gerar embeddings para um Ã­ndice de pesquisa vetorial. Qual modelo do Azure OpenAI Ã© construÃ­do especificamente para isso?",
    options: [
      "gpt-4o",
      "dall-e-3",
      "whisper",
      "text-embedding-3-small"
    ],
    correctIndex: 3,
    explanation: "text-embedding-3-small (e text-embedding-3-large, text-embedding-ada-002) sÃ£o modelos de embedding construÃ­dos especificamente para converter texto em vetores densos. Modelos GPT sÃ£o para geraÃ§Ã£o, DALL-E para imagens e Whisper para fala. Apenas modelos de embedding produzem o formato vetorial necessÃ¡rio para pesquisa."
  },
  {
    id: "ai102-44-q5",
    question: "VocÃª executa uma consulta vetorial com k=5 e tambÃ©m define top=3 nas opÃ§Ãµes de pesquisa. Quantos resultados sÃ£o retornados?",
    options: [
      "5 (k sobrescreve top)",
      "8 (k + top combinados)",
      "3 (top limita a resposta final)",
      "Erro â€” k e top nÃ£o podem ser usados juntos"
    ],
    correctIndex: 2,
    explanation: "O parÃ¢metro 'k' controla quantos vizinhos mais prÃ³ximos a pesquisa vetorial recupera internamente, enquanto 'top' limita o nÃºmero final de resultados retornados ao cliente. Com k=5 e top=3, a pesquisa vetorial recupera 5 candidatos mas apenas os 3 melhores (apÃ³s pontuaÃ§Ã£o/classificaÃ§Ã£o) sÃ£o retornados."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-search --yes --no-wait
```

## Saiba Mais

- [Vector search overview](https://learn.microsoft.com/azure/search/vector-search-overview)
- [Semantic ranking](https://learn.microsoft.com/azure/search/semantic-search-overview)
- [Hybrid search](https://learn.microsoft.com/azure/search/hybrid-search-overview)
- [HNSW algorithm in AI Search](https://learn.microsoft.com/azure/search/vector-search-ranking)
- [Generate embeddings with Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/how-to/embeddings)
