---
sidebar_position: 10
title: "Challenge 48: Multi-Format Processing Pipeline"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 48: Multi-Format Processing Pipeline

:::info Estimated Time
**90-120 min** | **Cost**: ~$3.00 (Search Basic + AI Services + Storage) | **Domain**: Information Extraction Solutions (15-20%)
:::

:::tip Domain 6 Capstone
This challenge integrates all Domain 6 concepts: AI Search indexing, skillsets, Document Intelligence, Content Understanding, and knowledge store — into a complete end-to-end document processing pipeline.
:::

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Design end-to-end document ingestion pipelines | High |
| Process multiple document formats (PDF, images, audio) | High |
| Combine AI Search with Document Intelligence | High |
| Build enrichment chains with multiple skills | High |
| Store and query processed results | Medium |

## Overview

Enterprise document processing requires handling diverse content types through a unified pipeline:

![Challenge 48 - Multi-Source Indexing Architecture](/img/ai-103/challenge-48-topology.svg)


### Pipeline components:
1. **Ingestion**: Upload multi-format documents to Blob Storage
2. **Extraction**: Document Intelligence extracts structure from PDFs/forms
3. **Enrichment**: AI Search skillset adds NLP enrichment (entities, keyphrases, language)
4. **Custom processing**: Content Understanding handles images and classification
5. **Storage**: Results go to search index (queries) + knowledge store (analytics)

## Prerequisites

- Completed Challenges 40-47 (or equivalent knowledge)
- Azure AI Search (Basic tier)
- Azure AI Services (multi-service, S0)
- Azure Document Intelligence (S0)
- Azure Storage Account
- Python 3.9+ with:
  - `azure-search-documents>=11.4.0`
  - `azure-ai-documentintelligence>=1.0.0`
  - `azure-storage-blob>=12.0.0`
  - `openai>=1.0.0`

## Implementation

### Task 1: Set up infrastructure

```bash
RG="rg-ai102-pipeline"
LOCATION="eastus"
SEARCH_SERVICE="search-pipeline-$(openssl rand -hex 4)"
STORAGE_ACCOUNT="stpipeline$(openssl rand -hex 4)"
AI_SERVICE="ai-pipeline-$(openssl rand -hex 4)"
DOC_INTEL="docintell-pipeline-$(openssl rand -hex 4)"

az group create --name $RG --location $LOCATION

# Azure AI Search (Basic tier for vector + semantic)
az search service create \
  --name $SEARCH_SERVICE \
  --resource-group $RG \
  --location $LOCATION \
  --sku basic

# Storage Account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS

# Create containers for different content types
az storage container create --name "pdfs" --account-name $STORAGE_ACCOUNT --auth-mode login
az storage container create --name "images" --account-name $STORAGE_ACCOUNT --auth-mode login
az storage container create --name "processed" --account-name $STORAGE_ACCOUNT --auth-mode login

# AI Services (multi-service)
az cognitiveservices account create \
  --name $AI_SERVICE \
  --resource-group $RG \
  --location $LOCATION \
  --kind AIServices \
  --sku S0 --yes

# Document Intelligence
az cognitiveservices account create \
  --name $DOC_INTEL \
  --resource-group $RG \
  --location $LOCATION \
  --kind FormRecognizer \
  --sku S0 --yes

# Get all keys
SEARCH_KEY=$(az search admin-key show --resource-group $RG --service-name $SEARCH_SERVICE --query "primaryKey" -o tsv)
STORAGE_CONN=$(az storage account show-connection-string --name $STORAGE_ACCOUNT --resource-group $RG --query "connectionString" -o tsv)
AI_KEY=$(az cognitiveservices account keys list --name $AI_SERVICE --resource-group $RG --query "key1" -o tsv)
DOC_ENDPOINT=$(az cognitiveservices account show --name $DOC_INTEL --resource-group $RG --query "properties.endpoint" -o tsv)
DOC_KEY=$(az cognitiveservices account keys list --name $DOC_INTEL --resource-group $RG --query "key1" -o tsv)
```

### Task 2: Create a unified search index

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.core.credentials import AzureKeyCredential
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

endpoint = f"https://{SEARCH_SERVICE}.search.windows.net"
credential = AzureKeyCredential(SEARCH_KEY)
index_client = SearchIndexClient(endpoint=endpoint, credential=credential)

# Unified index for all content types
fields = [
    SimpleField(name="id", type=SearchFieldDataType.String, key=True, filterable=True),
    SearchableField(name="title", type=SearchFieldDataType.String, filterable=True, sortable=True),
    SearchableField(name="content", type=SearchFieldDataType.String),
    SimpleField(name="source_type", type=SearchFieldDataType.String, filterable=True, facetable=True),  # pdf, image, audio
    SimpleField(name="source_path", type=SearchFieldDataType.String, filterable=True),
    SimpleField(name="processed_date", type=SearchFieldDataType.DateTimeOffset, filterable=True, sortable=True),
    SearchableField(name="keyphrases", type=SearchFieldDataType.Collection(SearchFieldDataType.String), filterable=True, facetable=True),
    SearchableField(name="entities", type=SearchFieldDataType.Collection(SearchFieldDataType.String), filterable=True, facetable=True),
    SimpleField(name="language", type=SearchFieldDataType.String, filterable=True, facetable=True),
    SimpleField(name="confidence_score", type=SearchFieldDataType.Double, filterable=True, sortable=True),
    SearchField(
        name="content_vector",
        type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
        searchable=True,
        vector_search_dimensions=1536,
        vector_search_profile_name="vector-profile"
    ),
    # Document Intelligence specific fields
    SimpleField(name="doc_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
    SimpleField(name="page_count", type=SearchFieldDataType.Int32, filterable=True),
    SearchableField(name="tables_content", type=SearchFieldDataType.String),
]

vector_search = VectorSearch(
    algorithms=[HnswAlgorithmConfiguration(name="hnsw-config")],
    profiles=[VectorSearchProfile(name="vector-profile", algorithm_configuration_name="hnsw-config")]
)

semantic_search = SemanticSearch(
    configurations=[
        SemanticConfiguration(
            name="semantic-config",
            prioritized_fields=SemanticPrioritizedFields(
                title_field=SemanticField(field_name="title"),
                content_fields=[SemanticField(field_name="content")]
            )
        )
    ]
)

index = SearchIndex(
    name="unified-content-index",
    fields=fields,
    vector_search=vector_search,
    semantic_search=semantic_search
)

index_client.create_or_update_index(index)
print("Unified content index created")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
curl -X PUT "https://${SEARCH_SERVICE}.search.windows.net/indexes/unified-content-index?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "name": "unified-content-index",
    "fields": [
      {"name": "id", "type": "Edm.String", "key": true, "filterable": true},
      {"name": "title", "type": "Edm.String", "searchable": true, "filterable": true},
      {"name": "content", "type": "Edm.String", "searchable": true},
      {"name": "source_type", "type": "Edm.String", "filterable": true, "facetable": true},
      {"name": "keyphrases", "type": "Collection(Edm.String)", "searchable": true, "filterable": true, "facetable": true},
      {"name": "entities", "type": "Collection(Edm.String)", "searchable": true, "filterable": true},
      {"name": "language", "type": "Edm.String", "filterable": true, "facetable": true},
      {"name": "content_vector", "type": "Collection(Edm.Single)", "searchable": true, "dimensions": 1536, "vectorSearchProfile": "vector-profile"}
    ],
    "vectorSearch": {
      "algorithms": [{"name": "hnsw-config", "kind": "hnsw"}],
      "profiles": [{"name": "vector-profile", "algorithm": "hnsw-config"}]
    },
    "semantic": {
      "configurations": [{"name": "semantic-config", "prioritizedFields": {"titleField": {"fieldName": "title"}, "contentFields": [{"fieldName": "content"}]}}]
    }
  }'
```

</TabItem>
</Tabs>

### Task 3: Process PDFs with Document Intelligence + AI Search

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
from azure.search.documents import SearchClient
from openai import AzureOpenAI
from datetime import datetime, timezone
import hashlib

# Initialize clients
doc_client = DocumentIntelligenceClient(endpoint=DOC_ENDPOINT, credential=AzureKeyCredential(DOC_KEY))
search_client = SearchClient(endpoint=endpoint, index_name="unified-content-index", credential=credential)
aoai_client = AzureOpenAI(api_key=AOAI_KEY, api_version="2024-06-01", azure_endpoint=AOAI_ENDPOINT)

def get_embedding(text: str) -> list[float]:
    response = aoai_client.embeddings.create(input=text[:8000], model="text-embedding-3-small")
    return response.data[0].embedding

def process_pdf(pdf_url: str, file_name: str):
    """Process a PDF through Document Intelligence and index results."""

    # Step 1: Extract content with Document Intelligence (layout model)
    poller = doc_client.begin_analyze_document(
        "prebuilt-layout",
        AnalyzeDocumentRequest(url_source=pdf_url)
    )
    result = poller.result()

    # Extract full text content
    content_parts = []
    for page in result.pages:
        for line in page.lines:
            content_parts.append(line.content)
    full_content = " ".join(content_parts)

    # Extract tables
    tables_text = ""
    if result.tables:
        for table in result.tables:
            table_rows = {}
            for cell in table.cells:
                row = cell.row_index
                if row not in table_rows:
                    table_rows[row] = []
                table_rows[row].append(cell.content)
            for row_cells in table_rows.values():
                tables_text += " | ".join(row_cells) + "\n"

    # Step 2: Generate embedding
    content_vector = get_embedding(full_content[:8000])

    # Step 3: Create search document
    doc_id = hashlib.md5(pdf_url.encode()).hexdigest()
    search_doc = {
        "id": doc_id,
        "title": file_name,
        "content": full_content,
        "source_type": "pdf",
        "source_path": pdf_url,
        "processed_date": datetime.now(timezone.utc).isoformat(),
        "page_count": len(result.pages),
        "tables_content": tables_text,
        "content_vector": content_vector,
        "language": "en",
        "confidence_score": 0.95,
    }

    # Step 4: Upload to index
    search_client.upload_documents([search_doc])
    print(f"Indexed PDF: {file_name} ({len(result.pages)} pages, {len(full_content)} chars)")
    return doc_id

# Process sample PDFs
process_pdf(
    "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf",
    "Invoice_1.pdf"
)
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.AI.DocumentIntelligence;
using Azure.AI.OpenAI;
using Azure.Search.Documents;

async Task<string> ProcessPdfAsync(string pdfUrl, string fileName)
{
    // Extract with Document Intelligence
    var docClient = new DocumentIntelligenceClient(new Uri(docEndpoint), new AzureKeyCredential(docKey));
    var operation = await docClient.AnalyzeDocumentAsync(
        WaitUntil.Completed, "prebuilt-layout",
        new AnalyzeDocumentContent() { UrlSource = new Uri(pdfUrl) });

    var result = operation.Value;
    var content = string.Join(" ", result.Pages.SelectMany(p => p.Lines).Select(l => l.Content));

    // Generate embedding
    var embeddingClient = new AzureOpenAIClient(new Uri(aoaiEndpoint), new AzureKeyCredential(aoaiKey))
        .GetEmbeddingClient("text-embedding-3-small");
    var embedding = await embeddingClient.GenerateEmbeddingAsync(content[..Math.Min(content.Length, 8000)]);

    // Index document
    var searchClient = new SearchClient(new Uri(searchEndpoint), "unified-content-index", new AzureKeyCredential(searchKey));
    var docId = Convert.ToHexString(System.Security.Cryptography.MD5.HashData(System.Text.Encoding.UTF8.GetBytes(pdfUrl))).ToLower();

    var searchDoc = new SearchDocument(new Dictionary<string, object>
    {
        ["id"] = docId,
        ["title"] = fileName,
        ["content"] = content,
        ["source_type"] = "pdf",
        ["page_count"] = result.Pages.Count,
        ["content_vector"] = embedding.Value.ToFloats().ToArray()
    });

    await searchClient.UploadDocumentsAsync(new[] { searchDoc });
    Console.WriteLine($"Indexed: {fileName}");
    return docId;
}
```

</TabItem>
</Tabs>

### Task 4: Process images with enrichment

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import requests

def process_image(image_url: str, file_name: str):
    """Process an image using Content Understanding and index results."""

    # Use Content Understanding to analyze image
    api_version = "2024-12-01-preview"
    analyze_url = f"{AI_ENDPOINT.rstrip('/')}/contentunderstanding/analyzers/image-analyzer:analyze?api-version={api_version}"

    response = requests.post(
        analyze_url,
        headers={
            "Ocp-Apim-Subscription-Key": AI_KEY,
            "Content-Type": "application/json"
        },
        json={"url": image_url}
    )

    if response.status_code == 202:
        operation_url = response.headers["Operation-Location"]
        import time
        while True:
            time.sleep(3)
            poll = requests.get(operation_url, headers={"Ocp-Apim-Subscription-Key": AI_KEY})
            data = poll.json()
            if data.get("status") == "succeeded":
                result = data.get("result", {})
                break
            elif data.get("status") == "failed":
                print(f"Image analysis failed: {data}")
                return None
    else:
        print(f"Error: {response.status_code}")
        return None

    # Extract content from analysis results
    contents = result.get("contents", [{}])
    fields = contents[0].get("fields", {}) if contents else {}
    description = fields.get("Description", {}).get("value", file_name)
    text_content = fields.get("TextContent", {}).get("value", "")

    # Combine description and text for full content
    full_content = f"{description}. {text_content}" if text_content else description

    # Generate embedding
    content_vector = get_embedding(full_content)

    # Index
    doc_id = hashlib.md5(image_url.encode()).hexdigest()
    search_doc = {
        "id": doc_id,
        "title": file_name,
        "content": full_content,
        "source_type": "image",
        "source_path": image_url,
        "processed_date": datetime.now(timezone.utc).isoformat(),
        "content_vector": content_vector,
        "confidence_score": fields.get("Description", {}).get("confidence", 0.0),
    }

    search_client.upload_documents([search_doc])
    print(f"Indexed image: {file_name}")
    return doc_id
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Process image through Content Understanding
curl -s -i -X POST \
  "${AI_ENDPOINT}/contentunderstanding/analyzers/image-analyzer:analyze?api-version=2024-12-01-preview" \
  -H "Ocp-Apim-Subscription-Key: ${AI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/sample-image.jpg"}'

# After getting results, upload to search index
curl -X POST "https://${SEARCH_SERVICE}.search.windows.net/indexes/unified-content-index/docs/index?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "value": [
      {
        "@search.action": "upload",
        "id": "img-001",
        "title": "product-photo.jpg",
        "content": "Product packaging showing the new AI-powered widget with blue branding",
        "source_type": "image"
      }
    ]
  }'
```

</TabItem>
</Tabs>

### Task 5: Query the unified index

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.search.documents.models import VectorizedQuery

# Hybrid query across all content types
query_text = "What invoices mention consulting services?"
query_vector = get_embedding(query_text)

results = search_client.search(
    search_text=query_text,
    vector_queries=[
        VectorizedQuery(vector=query_vector, k_nearest_neighbors=5, fields="content_vector")
    ],
    query_type="semantic",
    semantic_configuration_name="semantic-config",
    filter="source_type eq 'pdf'",
    facets=["source_type", "language"],
    include_total_count=True,
    select=["id", "title", "content", "source_type", "confidence_score"],
    top=10
)

print(f"=== Pipeline Query Results ===")
print(f"Total: {results.get_count()}")
print(f"\nFacets:")
for facet_name, facet_values in results.get_facets().items():
    print(f"  {facet_name}:")
    for fv in facet_values:
        print(f"    {fv['value']}: {fv['count']}")

print(f"\nResults:")
for r in results:
    print(f"  [{r['source_type']}] {r['title']} (score: {r['@search.score']:.4f})")
    print(f"    {r['content'][:100]}...")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
curl -s -X POST "https://${SEARCH_SERVICE}.search.windows.net/indexes/unified-content-index/docs/search?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "search": "consulting services invoice",
    "queryType": "semantic",
    "semanticConfiguration": "semantic-config",
    "filter": "source_type eq '\''pdf'\''",
    "facets": ["source_type", "language"],
    "select": "id,title,content,source_type",
    "top": 10,
    "count": true
  }'
```

</TabItem>
</Tabs>

## Expected Output

```text
=== Pipeline Query Results ===
Total: 3

Facets:
  source_type:
    pdf: 2
    image: 1
  language:
    en: 3

Results:
  [pdf] Invoice_1.pdf (score: 0.0341)
    CONTOSO LTD. Invoice #INV-001 consulting services...
  [pdf] Invoice_2.pdf (score: 0.0289)
    Fabrikam Inc. Professional consulting engagement...
  [image] receipt-scan.jpg (score: 0.0142)
    Scanned receipt showing consulting fee payment...
```

## Break & fix

| # | Scenario | Symptom | Root Cause | Fix |
|---|----------|---------|------------|-----|
| 1 | PDF processing fails for scanned docs | Document Intelligence returns empty content | PDF contains only images, no selectable text | Use `prebuilt-read` with OCR or set `imageAction` in indexer configuration |
| 2 | Vector dimensions mismatch | Upload fails: "vector dimensions don't match" | Embedding model changed between indexing runs (ada-002 vs 3-small) | Ensure all documents use the same embedding model; rebuild index if model changes |
| 3 | Cross-format search returns biased results | PDFs always rank higher than images | PDF content is longer, giving higher BM25 scores | Use semantic ranking to normalize; consider separate relevance tuning per source type |
| 4 | Knowledge store missing data | Table projections empty for image content | Images don't produce structured table data | Design projections per content type; use conditional projections or separate skillsets |
| 5 | Pipeline throughput bottleneck | Processing 1000 docs takes hours | Sequential processing; no parallelism | Use batch processing, async operations, and increase indexer `maxFailedItems`/`batchSize` |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ai102-48-q1",
    question: "You're building a pipeline that processes PDFs, images, and audio files into a single search index. What is the BEST approach for handling these different formats?",
    options: [
      "Convert all files to PDF first, then process with a single Document Intelligence model",
      "Use a single AI Search indexer that handles all formats natively",
      "Use format-specific extractors (Doc Intelligence for PDFs, Content Understanding for images) and a unified search index",
      "Create separate indexes for each format and federate queries across them"
    ],
    correctIndex: 2,
    explanation: "The best approach uses specialized services for each format (Document Intelligence excels at structured PDFs, Content Understanding at images/multimodal) and stores all results in a unified search index. This leverages each service's strengths while providing a single query endpoint."
  },
  {
    id: "ai102-48-q2",
    question: "Your pipeline generates embeddings for documents before indexing. A new embedding model is released with better performance. What must you do?",
    options: [
      "Only generate new embeddings for newly added documents",
      "Re-generate embeddings for ALL existing documents and re-index them",
      "Update the index vector dimensions and existing vectors will adapt",
      "Add a new vector field for the new model while keeping the old one"
    ],
    correctIndex: 1,
    explanation: "Embedding models produce vectors in different spaces. You cannot mix vectors from different models in the same field — similarity calculations would be meaningless. You must re-embed all existing documents with the new model and re-index. Adding a new field (option D) works but wastes storage."
  },
  {
    id: "ai102-48-q3",
    question: "A PDF processed by Document Intelligence returns 50 pages of content. You need to index it for vector search. What preprocessing step is recommended?",
    options: [
      "Chunk the content into smaller segments (e.g., 500-1000 tokens each) and create separate index entries per chunk",
      "Index the entire 50-page content as a single vector",
      "Only index the first page",
      "Compress the content using summarization before embedding"
    ],
    correctIndex: 0,
    explanation: "Embedding models have token limits and work best with focused content. Chunking documents into smaller segments (typically 500-1000 tokens) with overlap ensures each vector represents a coherent piece of content. This dramatically improves retrieval relevance for RAG scenarios."
  },
  {
    id: "ai102-48-q4",
    question: "You want to query your unified index for 'all invoices from Contoso with amount over $1000'. Which combination of search features is most appropriate?",
    options: [
      "Pure vector search with the query as embedding",
      "Semantic search only",
      "Full Lucene syntax with regex pattern matching",
      "Keyword search for 'Contoso' combined with an OData filter on a structured amount field"
    ],
    correctIndex: 3,
    explanation: "This query has two components: a text match ('Contoso') best served by keyword search, and a numeric condition ('over $1000') best served by OData filter on a structured field. Combining search_text with $filter gives precise results. Vector search alone can't do numeric comparisons."
  },
  {
    id: "ai102-48-q5",
    question: "Your pipeline processes 10,000 documents daily. The Document Intelligence extraction step is the bottleneck. How do you scale it?",
    options: [
      "Use batch processing with concurrent API calls respecting rate limits",
      "Deploy multiple Document Intelligence resources in different regions",
      "Upgrade to a higher SKU (S0 already — request quota increase)",
      "All of the above are valid scaling strategies"
    ],
    correctIndex: 3,
    explanation: "All three approaches are valid. Concurrent API calls maximize throughput within rate limits. Multiple regional resources provide geographic distribution and higher aggregate throughput. Higher quotas remove rate limit constraints. In practice, combine all three for enterprise scale."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-pipeline --yes --no-wait
```

## Learn More

- [AI Search + Document Intelligence integration](https://learn.microsoft.com/azure/search/cognitive-search-skill-document-intelligence-layout)
- [Vector search chunking strategies](https://learn.microsoft.com/azure/search/vector-search-how-to-chunk-documents)
- [Indexer scheduling and batch processing](https://learn.microsoft.com/azure/search/search-howto-schedule-indexers)
- [Content Understanding multimodal analysis](https://learn.microsoft.com/azure/ai-services/content-understanding/overview)
- [Knowledge store best practices](https://learn.microsoft.com/azure/search/knowledge-store-concept-intro)
