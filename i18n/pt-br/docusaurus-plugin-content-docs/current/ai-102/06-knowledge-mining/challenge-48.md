---
sidebar_position: 10
title: "Desafio 48: Pipeline de Processamento de Documentos Multi-Formato"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 48: Pipeline de Processamento Multi-Formato

:::info Tempo Estimado
**90-120 min** | **Custo**: ~$3.00 (Search Basic + AI Services + Storage) | **Domínio**: Knowledge Mining & Extraction (15-20%)
:::

:::tip Capstone do Domínio 6
Este desafio integra todos os conceitos do Domínio 6: indexação do AI Search, skillsets, Document Intelligence, Content Understanding e knowledge store — em um pipeline completo de processamento de documentos de ponta a ponta.
:::

## Habilidades do exame cobertas

| Habilidade | Peso |
|-------|--------|
| Projetar pipelines de ingestão de documentos de ponta a ponta | Alto |
| Processar múltiplos formatos de documentos (PDF, imagens, áudio) | Alto |
| Combinar AI Search com Document Intelligence | Alto |
| Construir cadeias de enriquecimento com múltiplas skills | Alto |
| Armazenar e consultar resultados processados | Médio |

## Visão Geral

O processamento de documentos empresariais requer o tratamento de diversos tipos de conteúdo por meio de um pipeline unificado:

```
┌─────────────────┐
│  Source Content  │
│  - PDFs         │──┐
│  - Images       │  │    ┌───────────────┐     ┌──────────────┐     ┌─────────────┐
│  - Audio files  │  ├───▶│  Processing   │────▶│  Enrichment  │────▶│   Output    │
│  - Office docs  │  │    │  (Doc Intel)  │     │  (AI Search) │     │  (Index +   │
└─────────────────┘  │    └───────────────┘     └──────────────┘     │  Knowledge  │
                     │                                                │   Store)    │
                     │    ┌───────────────┐                          └─────────────┘
                     └───▶│ Content Under │─────────────────────────────────┘
                          │  standing     │
                          └───────────────┘
```

### Componentes do pipeline:
1. **Ingestão**: Upload de documentos multi-formato para o Blob Storage
2. **Extração**: Document Intelligence extrai a estrutura de PDFs/formulários
3. **Enriquecimento**: Skillset do AI Search adiciona enriquecimento NLP (entidades, keyphrases, idioma)
4. **Processamento personalizado**: Content Understanding lida com imagens e classificação
5. **Armazenamento**: Resultados vão para o índice de pesquisa (consultas) + knowledge store (analytics)

## Pré-requisitos

- Desafios 40-47 concluídos (ou conhecimento equivalente)
- Azure AI Search (tier Basic)
- Azure AI Services (multi-serviço, S0)
- Azure Document Intelligence (S0)
- Azure Storage Account
- Python 3.9+ com:
  - `azure-search-documents>=11.4.0`
  - `azure-ai-documentintelligence>=1.0.0`
  - `azure-storage-blob>=12.0.0`
  - `openai>=1.0.0`

## Implementação

### Tarefa 1: Configurar a infraestrutura

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
az storage container create --name "pdfs" --account-name $STORAGE_ACCOUNT
az storage container create --name "images" --account-name $STORAGE_ACCOUNT
az storage container create --name "processed" --account-name $STORAGE_ACCOUNT

# AI Services (multi-service)
az cognitiveservices account create \
  --name $AI_SERVICE \
  --resource-group $RG \
  --location $LOCATION \
  --kind CognitiveServices \
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

### Tarefa 2: Criar um índice de pesquisa unificado

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

### Tarefa 3: Processar PDFs com Document Intelligence + AI Search

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

### Tarefa 4: Processar imagens com enriquecimento

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

### Tarefa 5: Consultar o índice unificado

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

## Saída Esperada

```
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

## Quebrar e Corrigir

| # | Cenário | Sintoma | Causa Raiz | Correção |
|---|----------|---------|------------|-----|
| 1 | Processamento de PDF falha para documentos digitalizados | Document Intelligence retorna conteúdo vazio | PDF contém apenas imagens, sem texto selecionável | Use `prebuilt-read` com OCR ou defina `imageAction` na configuração do indexer |
| 2 | Incompatibilidade nas dimensões do vetor | Upload falha: "vector dimensions don't match" | Modelo de embedding mudou entre execuções de indexação (ada-002 vs 3-small) | Garanta que todos os documentos usem o mesmo modelo de embedding; reconstrua o índice se o modelo mudar |
| 3 | Pesquisa cross-format retorna resultados enviesados | PDFs sempre ficam melhor ranqueados que imagens | Conteúdo de PDF é mais longo, gerando scores BM25 mais altos | Use ranking semântico para normalizar; considere ajuste de relevância separado por tipo de fonte |
| 4 | Knowledge store com dados faltando | Projeções de tabela vazias para conteúdo de imagem | Imagens não produzem dados estruturados de tabela | Projete projeções por tipo de conteúdo; use projeções condicionais ou skillsets separados |
| 5 | Gargalo de throughput no pipeline | Processar 1000 documentos leva horas | Processamento sequencial; sem paralelismo | Use processamento em lote, operações assíncronas e aumente `maxFailedItems`/`batchSize` do indexer |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ai102-48-q1",
    question: "Você está construindo um pipeline que processa PDFs, imagens e arquivos de áudio em um único índice de pesquisa. Qual é a MELHOR abordagem para lidar com esses diferentes formatos?",
    options: [
      "Converter todos os arquivos para PDF primeiro e depois processar com um único modelo do Document Intelligence",
      "Usar um único indexer do AI Search que lida com todos os formatos nativamente",
      "Usar extratores específicos por formato (Doc Intelligence para PDFs, Content Understanding para imagens) e um índice de pesquisa unificado",
      "Criar índices separados para cada formato e federar consultas entre eles"
    ],
    correctIndex: 2,
    explanation: "A melhor abordagem usa serviços especializados para cada formato (Document Intelligence se destaca em PDFs estruturados, Content Understanding em imagens/multimodal) e armazena todos os resultados em um índice de pesquisa unificado. Isso aproveita os pontos fortes de cada serviço enquanto fornece um único endpoint de consulta."
  },
  {
    id: "ai102-48-q2",
    question: "Seu pipeline gera embeddings para documentos antes da indexação. Um novo modelo de embedding é lançado com melhor desempenho. O que você deve fazer?",
    options: [
      "Gerar novos embeddings apenas para documentos recém-adicionados",
      "Regenerar embeddings para TODOS os documentos existentes e reindexá-los",
      "Atualizar as dimensões do vetor no índice e os vetores existentes se adaptarão",
      "Adicionar um novo campo de vetor para o novo modelo mantendo o antigo"
    ],
    correctIndex: 1,
    explanation: "Modelos de embedding produzem vetores em espaços diferentes. Você não pode misturar vetores de modelos diferentes no mesmo campo — os cálculos de similaridade seriam sem sentido. Você deve regenerar o embedding de todos os documentos existentes com o novo modelo e reindexar. Adicionar um novo campo (opção D) funciona mas desperdiça armazenamento."
  },
  {
    id: "ai102-48-q3",
    question: "Um PDF processado pelo Document Intelligence retorna 50 páginas de conteúdo. Você precisa indexá-lo para busca vetorial. Qual etapa de pré-processamento é recomendada?",
    options: [
      "Dividir o conteúdo em segmentos menores (ex.: 500-1000 tokens cada) e criar entradas separadas no índice por chunk",
      "Indexar todo o conteúdo de 50 páginas como um único vetor",
      "Indexar apenas a primeira página",
      "Comprimir o conteúdo usando sumarização antes do embedding"
    ],
    correctIndex: 0,
    explanation: "Modelos de embedding têm limites de tokens e funcionam melhor com conteúdo focado. Dividir documentos em segmentos menores (tipicamente 500-1000 tokens) com sobreposição garante que cada vetor represente uma parte coerente do conteúdo. Isso melhora drasticamente a relevância de recuperação para cenários de RAG."
  },
  {
    id: "ai102-48-q4",
    question: "Você quer consultar seu índice unificado por 'todas as faturas da Contoso com valor acima de $1000'. Qual combinação de recursos de pesquisa é mais apropriada?",
    options: [
      "Busca vetorial pura com a consulta como embedding",
      "Apenas busca semântica",
      "Sintaxe Lucene completa com correspondência por regex",
      "Busca por palavra-chave para 'Contoso' combinada com um filtro OData em um campo estruturado de valor"
    ],
    correctIndex: 3,
    explanation: "Esta consulta tem dois componentes: uma correspondência de texto ('Contoso') melhor atendida por busca por palavra-chave, e uma condição numérica ('acima de $1000') melhor atendida por filtro OData em um campo estruturado. Combinar search_text com $filter dá resultados precisos. A busca vetorial sozinha não consegue fazer comparações numéricas."
  },
  {
    id: "ai102-48-q5",
    question: "Seu pipeline processa 10.000 documentos diariamente. A etapa de extração do Document Intelligence é o gargalo. Como você escala isso?",
    options: [
      "Usar processamento em lote com chamadas de API concorrentes respeitando os limites de taxa",
      "Implantar múltiplos recursos de Document Intelligence em regiões diferentes",
      "Fazer upgrade para um SKU superior (S0 já está — solicitar aumento de cota)",
      "Todas as alternativas acima são estratégias válidas de escalabilidade"
    ],
    correctIndex: 3,
    explanation: "Todas as três abordagens são válidas. Chamadas de API concorrentes maximizam o throughput dentro dos limites de taxa. Múltiplos recursos regionais fornecem distribuição geográfica e maior throughput agregado. Cotas mais altas removem restrições de limite de taxa. Na prática, combine todas as três para escala empresarial."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-pipeline --yes --no-wait
```

## Saiba Mais

- [Integração AI Search + Document Intelligence](https://learn.microsoft.com/azure/search/cognitive-search-skill-document-intelligence-layout)
- [Estratégias de chunking para busca vetorial](https://learn.microsoft.com/azure/search/vector-search-how-to-chunk-documents)
- [Agendamento de indexers e processamento em lote](https://learn.microsoft.com/azure/search/search-howto-schedule-indexers)
- [Análise multimodal com Content Understanding](https://learn.microsoft.com/azure/ai-services/content-understanding/overview)
