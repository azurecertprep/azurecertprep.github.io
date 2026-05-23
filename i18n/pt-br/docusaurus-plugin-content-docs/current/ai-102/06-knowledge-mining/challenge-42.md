---
sidebar_position: 4
title: "Desafio 42: Consultas de Pesquisa — Sintaxe e Filtros"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 42: Consultas de Pesquisa — Sintaxe e Filtros

:::info Tempo Estimado
**45-60 min** | **Custo**: ~$0.10 (consultas em índice existente) | **Domínio**: Knowledge Mining & Extraction (15-20%)
:::

## Habilidades do exame cobertas

| Habilidade | Peso |
|-------|--------|
| Consultar um índice usando sintaxe simples | Alto |
| Consultar um índice usando sintaxe Lucene completa | Alto |
| Aplicar filtros com expressões OData | Alto |
| Implementar ordenação, paginação e seleção de campos | Médio |
| Implementar navegação facetada | Médio |
| Usar wildcards e pesquisa fuzzy | Médio |

## Visão Geral

O Azure AI Search suporta dois analisadores de consulta:

| Analisador | Sintaxe | Caso de uso |
|--------|--------|----------|
| **Simple** (padrão) | `+term -term "phrase" *suffix` | Caixas de pesquisa para usuários |
| **Full Lucene** | `field:term~2 /regex/ term^boost` | Consultas avançadas para desenvolvedores |

Parâmetros de consulta principais:
- `search`: O texto de pesquisa (sintaxe simples ou Lucene)
- `$filter`: Expressão de filtro OData para correspondência exata
- `$orderby`: Ordenar resultados
- `$select`: Escolher quais campos retornar
- `$top` / `$skip`: Paginação
- `$count`: Incluir contagem total na resposta
- `facets`: Agregar valores de campo para navegação

## Pré-requisitos

- Desafio 40 concluído (índice com documentos enriquecidos)
- Python 3.9+ com `azure-search-documents>=11.4.0`
- .NET 8 com `Azure.Search.Documents`
- Pelo menos 10+ documentos indexados para resultados significativos

## Implementação

### Tarefa 1: Sintaxe de consulta simples

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient

endpoint = f"https://{SEARCH_SERVICE}.search.windows.net"
credential = AzureKeyCredential(SEARCH_KEY)
search_client = SearchClient(endpoint=endpoint, index_name="documents-index", credential=credential)

# Simple search — finds documents containing "Azure" AND "cognitive"
results = search_client.search(
    search_text="Azure cognitive",
    include_total_count=True,
    top=5
)

print(f"Total matching documents: {results.get_count()}")
for result in results:
    print(f"  Score: {result['@search.score']:.4f} | {result['metadata_storage_name']}")

# Phrase search — exact phrase match
results = search_client.search(search_text='"Azure AI services"')
for result in results:
    print(f"  Phrase match: {result['metadata_storage_name']}")

# Boolean operators in simple syntax (+ required, - excluded, | OR)
results = search_client.search(search_text="+Azure -deprecated | cognitive")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Search.Documents;
using Azure.Search.Documents.Models;

var searchClient = new SearchClient(
    new Uri($"https://{searchService}.search.windows.net"),
    "documents-index",
    new AzureKeyCredential(searchKey));

// Simple search
var options = new SearchOptions
{
    IncludeTotalCount = true,
    Size = 5
};

var results = await searchClient.SearchAsync<SearchDocument>("Azure cognitive", options);
Console.WriteLine($"Total: {results.Value.TotalCount}");
await foreach (var result in results.Value.GetResultsAsync())
{
    Console.WriteLine($"  Score: {result.Score:F4} | {result.Document["metadata_storage_name"]}");
}

// Phrase search
var phraseResults = await searchClient.SearchAsync<SearchDocument>("\"Azure AI services\"");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Simple search
curl -s "https://${SEARCH_SERVICE}.search.windows.net/indexes/documents-index/docs?api-version=2024-07-01&search=Azure+cognitive&\$count=true&\$top=5" \
  -H "api-key: ${SEARCH_KEY}" | python -m json.tool

# Phrase search
curl -s "https://${SEARCH_SERVICE}.search.windows.net/indexes/documents-index/docs?api-version=2024-07-01&search=%22Azure+AI+services%22&\$count=true" \
  -H "api-key: ${SEARCH_KEY}" | python -m json.tool
```

</TabItem>
</Tabs>

### Tarefa 2: Sintaxe Lucene completa

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.search.documents.models import QueryType

# Fuzzy search — finds "cognitive" even if user types "cogntive" (edit distance 1)
results = search_client.search(
    search_text="cogntive~1",
    query_type=QueryType.FULL
)
for result in results:
    print(f"  Fuzzy match: {result['metadata_storage_name']}")

# Wildcard search — prefix matching
results = search_client.search(
    search_text="micro*",
    query_type=QueryType.FULL
)

# Proximity search — "Azure" and "services" within 3 words of each other
results = search_client.search(
    search_text='"Azure services"~3',
    query_type=QueryType.FULL
)

# Boosted terms — "AI" is 4x more important than "cloud"
results = search_client.search(
    search_text="AI^4 cloud",
    query_type=QueryType.FULL
)

# Field-scoped search — search only in keyphrases field
results = search_client.search(
    search_text="keyphrases:machine learning",
    query_type=QueryType.FULL
)
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// Fuzzy search
var fuzzyOptions = new SearchOptions { QueryType = SearchQueryType.Full };
var fuzzyResults = await searchClient.SearchAsync<SearchDocument>("cogntive~1", fuzzyOptions);

// Wildcard search
var wildcardResults = await searchClient.SearchAsync<SearchDocument>("micro*", fuzzyOptions);

// Proximity search
var proximityResults = await searchClient.SearchAsync<SearchDocument>(
    "\"Azure services\"~3", fuzzyOptions);

// Boosted terms
var boostedResults = await searchClient.SearchAsync<SearchDocument>("AI^4 cloud", fuzzyOptions);

// Field-scoped search
var fieldResults = await searchClient.SearchAsync<SearchDocument>(
    "keyphrases:\"machine learning\"", fuzzyOptions);
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Fuzzy search (queryType=full enables Lucene syntax)
curl -s -X POST "https://${SEARCH_SERVICE}.search.windows.net/indexes/documents-index/docs/search?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "search": "cogntive~1",
    "queryType": "full",
    "count": true
  }'

# Wildcard and boosted search
curl -s -X POST "https://${SEARCH_SERVICE}.search.windows.net/indexes/documents-index/docs/search?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "search": "AI^4 cloud",
    "queryType": "full",
    "count": true
  }'
```

</TabItem>
</Tabs>

### Tarefa 3: Filtros OData

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Filter by language
results = search_client.search(
    search_text="*",
    filter="language eq 'en'",
    include_total_count=True
)
print(f"English documents: {results.get_count()}")

# Filter with collection — any keyphrase matches
results = search_client.search(
    search_text="*",
    filter="keyphrases/any(k: k eq 'machine learning')"
)

# Combine search + filter
results = search_client.search(
    search_text="Azure",
    filter="language eq 'en' and wordCount gt 100",
    order_by=["wordCount desc"],
    select=["metadata_storage_name", "language", "wordCount"]
)

for result in results:
    print(f"  {result['metadata_storage_name']} | Words: {result.get('wordCount', 'N/A')}")

# Comparison operators: eq, ne, gt, ge, lt, le
# Logical operators: and, or, not
# Collection operators: any(), all()
# Functions: search.in(), geo.distance(), geo.intersects()
results = search_client.search(
    search_text="*",
    filter="search.in(language, 'en,fr,de', ',')"
)
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// Filter by language
var filterOptions = new SearchOptions
{
    Filter = "language eq 'en'",
    IncludeTotalCount = true
};
var filtered = await searchClient.SearchAsync<SearchDocument>("*", filterOptions);
Console.WriteLine($"English documents: {filtered.Value.TotalCount}");

// Collection filter
var collectionOptions = new SearchOptions
{
    Filter = "keyphrases/any(k: k eq 'machine learning')"
};
var collResults = await searchClient.SearchAsync<SearchDocument>("*", collectionOptions);

// Combined search + filter + sort + select
var combinedOptions = new SearchOptions
{
    Filter = "language eq 'en' and wordCount gt 100",
    IncludeTotalCount = true
};
combinedOptions.OrderBy.Add("wordCount desc");
combinedOptions.Select.Add("metadata_storage_name");
combinedOptions.Select.Add("language");
combinedOptions.Select.Add("wordCount");

var combined = await searchClient.SearchAsync<SearchDocument>("Azure", combinedOptions);
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Filter with search
curl -s -X POST "https://${SEARCH_SERVICE}.search.windows.net/indexes/documents-index/docs/search?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "search": "Azure",
    "filter": "language eq '\''en'\'' and wordCount gt 100",
    "orderby": "wordCount desc",
    "select": "metadata_storage_name,language,wordCount",
    "count": true
  }'

# Collection filter
curl -s -X POST "https://${SEARCH_SERVICE}.search.windows.net/indexes/documents-index/docs/search?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "search": "*",
    "filter": "keyphrases/any(k: k eq '\''machine learning'\'')",
    "count": true
  }'
```

</TabItem>
</Tabs>

### Tarefa 4: Paginação e seleção de campos

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Paginated results — page 1 (items 1-10)
page1 = search_client.search(
    search_text="*",
    top=10,
    skip=0,
    include_total_count=True,
    select=["metadata_storage_name", "language", "keyphrases"]
)
print(f"Total: {page1.get_count()}")
for doc in page1:
    print(f"  {doc['metadata_storage_name']}")

# Page 2 (items 11-20)
page2 = search_client.search(
    search_text="*",
    top=10,
    skip=10,
    select=["metadata_storage_name", "language", "keyphrases"]
)

# Sorting by multiple fields
results = search_client.search(
    search_text="*",
    order_by=["language asc", "metadata_storage_name asc"],
    top=20
)
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// Paginated results
var pageOptions = new SearchOptions
{
    Size = 10,
    Skip = 0,
    IncludeTotalCount = true
};
pageOptions.Select.Add("metadata_storage_name");
pageOptions.Select.Add("language");
pageOptions.Select.Add("keyphrases");

var page1 = await searchClient.SearchAsync<SearchDocument>("*", pageOptions);
Console.WriteLine($"Total: {page1.Value.TotalCount}");

// Page 2
pageOptions.Skip = 10;
var page2 = await searchClient.SearchAsync<SearchDocument>("*", pageOptions);

// Multi-field sort
var sortOptions = new SearchOptions { Size = 20 };
sortOptions.OrderBy.Add("language asc");
sortOptions.OrderBy.Add("metadata_storage_name asc");
var sorted = await searchClient.SearchAsync<SearchDocument>("*", sortOptions);
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Paginated query
curl -s -X POST "https://${SEARCH_SERVICE}.search.windows.net/indexes/documents-index/docs/search?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "search": "*",
    "top": 10,
    "skip": 0,
    "count": true,
    "select": "metadata_storage_name,language,keyphrases",
    "orderby": "language asc, metadata_storage_name asc"
  }'
```

</TabItem>
</Tabs>

### Tarefa 5: Navegação facetada

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Facets — aggregate values for building filter UI
results = search_client.search(
    search_text="*",
    facets=["language,count:10", "keyphrases,count:20"],
    include_total_count=True
)

print(f"Total results: {results.get_count()}")
print("\nLanguage facets:")
for facet in results.get_facets().get("language", []):
    print(f"  {facet['value']}: {facet['count']} documents")

print("\nTop keyphrases:")
for facet in results.get_facets().get("keyphrases", []):
    print(f"  {facet['value']}: {facet['count']} documents")

# Combine facets with a filter (drill-down)
results = search_client.search(
    search_text="*",
    filter="language eq 'en'",
    facets=["keyphrases,count:10"],
)
print("\nTop keyphrases (English only):")
for facet in results.get_facets().get("keyphrases", []):
    print(f"  {facet['value']}: {facet['count']}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
var facetOptions = new SearchOptions
{
    IncludeTotalCount = true
};
facetOptions.Facets.Add("language,count:10");
facetOptions.Facets.Add("keyphrases,count:20");

var facetResults = await searchClient.SearchAsync<SearchDocument>("*", facetOptions);
Console.WriteLine($"Total: {facetResults.Value.TotalCount}");

foreach (var facet in facetResults.Value.Facets["language"])
{
    Console.WriteLine($"  {facet.Value}: {facet.Count}");
}

// Drill-down with filter
var drillOptions = new SearchOptions { Filter = "language eq 'en'" };
drillOptions.Facets.Add("keyphrases,count:10");
var drillResults = await searchClient.SearchAsync<SearchDocument>("*", drillOptions);
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Faceted search
curl -s -X POST "https://${SEARCH_SERVICE}.search.windows.net/indexes/documents-index/docs/search?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "search": "*",
    "facets": ["language,count:10", "keyphrases,count:20"],
    "count": true
  }'
```

</TabItem>
</Tabs>

## Saída Esperada

```json
{
  "@odata.count": 42,
  "@search.facets": {
    "language": [
      {"value": "en", "count": 35},
      {"value": "fr", "count": 4},
      {"value": "de", "count": 3}
    ],
    "keyphrases": [
      {"value": "machine learning", "count": 12},
      {"value": "Azure AI", "count": 10},
      {"value": "cognitive services", "count": 8}
    ]
  },
  "value": [...]
}
```

## Quebra e Correção

| # | Cenário | Sintoma | Causa Raiz | Correção |
|---|----------|---------|------------|-----|
| 1 | Filtro em campo não filtrável | HTTP 400: "Field 'content' is not filterable" | O campo `content` foi definido com `filterable: false` | Atualize o esquema do índice para adicionar `filterable: true` ou filtre em um campo que seja filtrável |
| 2 | Faceta em campo não facetável | HTTP 400: "Field is not facetable" | O campo não possui o atributo `facetable` na definição do índice | Atualize o índice para tornar o campo facetável (requer re-indexação se mudar o tipo) |
| 3 | Sintaxe Lucene completa não funciona | Wildcards/fuzzy tratados como texto literal | `queryType=full` ausente — o padrão é `simple` | Defina `query_type=QueryType.FULL` (Python) ou `QueryType = SearchQueryType.Full` (C#) |
| 4 | $orderby falha | "Cannot sort on field 'keyphrases'" | Campos de coleção (`Collection(Edm.String)`) não podem ser ordenados | Ordene apenas por campos escalares; use perfis de pontuação para ajuste de relevância |
| 5 | Paginação retorna duplicatas | Mesmos documentos aparecem em páginas diferentes | O índice foi modificado entre as requisições de página; use tokens de continuação para consistência | Use `search_after` para paginação profunda ou aceite consistência eventual |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ai102-42-q1",
    question: "Você quer que os usuários pesquisem 'programing' e ainda encontrem documentos contendo 'programming'. Qual sintaxe de consulta suporta isso?",
    options: [
      "Sintaxe simples: +programing",
      "Lucene completo com fuzzy: programing~1",
      "Filtro OData: content eq 'programing'",
      "Sintaxe simples: programing*"
    ],
    correctIndex: 1,
    explanation: "A pesquisa fuzzy (term~N) na sintaxe Lucene completa encontra termos dentro de uma distância de edição de N. 'programing~1' corresponde a 'programming' porque diferem por um caractere (um 'm' faltando). Wildcards só correspondem prefixos, não erros de digitação."
  },
  {
    id: "ai102-42-q2",
    question: "Você precisa filtrar documentos onde QUALQUER keyphrase seja igual a 'machine learning'. Qual filtro OData está correto?",
    options: [
      "keyphrases eq 'machine learning'",
      "keyphrases/contains('machine learning')",
      "keyphrases/any(k: k eq 'machine learning')",
      "search.in(keyphrases, 'machine learning')"
    ],
    correctIndex: 2,
    explanation: "Para campos de Collection, você deve usar expressões lambda (any/all) para filtrar. A sintaxe 'collection/any(variável: expressão)' testa se algum elemento corresponde. A comparação direta com eq não funciona em coleções."
  },
  {
    id: "ai102-42-q3",
    question: "Qual é o valor máximo permitido para $skip no Azure AI Search?",
    options: [
      "Sem limite",
      "10.000",
      "1.000.000",
      "100.000"
    ],
    correctIndex: 3,
    explanation: "O Azure AI Search limita o $skip a 100.000. Para paginação mais profunda além desse limite, use o padrão orderby + filter com um campo ordenável único, ou a abordagem de token de continuação para percorrer grandes conjuntos de resultados."
  },
  {
    id: "ai102-42-q4",
    question: "Um campo é definido como 'searchable: true, filterable: false, facetable: true'. Qual operação irá FALHAR?",
    options: [
      "$filter=field eq 'value'",
      "Pesquisa full-text no campo",
      "Solicitar facetas para o campo",
      "Incluir o campo no $select"
    ],
    correctIndex: 0,
    explanation: "Um campo com filterable=false não pode ser usado em expressões $filter. searchable=true permite pesquisa full-text, facetable=true permite agregação de facetas, e qualquer campo pode ser incluído no $select independentemente de outros atributos."
  },
  {
    id: "ai102-42-q5",
    question: "Você configura facets=['language,count:5']. O que o parâmetro 'count:5' controla?",
    options: [
      "A contagem mínima de documentos para um valor de faceta aparecer",
      "O número total de documentos a escanear para facetas",
      "O número máximo de buckets de faceta retornados para aquele campo",
      "O número de caracteres a incluir nos valores de faceta"
    ],
    correctIndex: 2,
    explanation: "O parâmetro 'count:N' limita o número de valores de faceta (buckets) retornados. Se um campo tem 100 valores únicos, count:5 retorna apenas os 5 valores mais comuns. O padrão é 10 valores de faceta por campo."
  }
]} />

## Limpeza

Nenhum recurso adicional foi criado neste desafio (usa o índice existente do Desafio 40).

```bash
# If you want to clean up everything:
az group delete --name rg-ai102-search --yes --no-wait
```

## Saiba Mais

- [Simple query syntax](https://learn.microsoft.com/azure/search/query-simple-syntax)
- [Full Lucene query syntax](https://learn.microsoft.com/azure/search/query-lucene-syntax)
- [OData filter syntax](https://learn.microsoft.com/azure/search/search-query-odata-filter)
- [Faceted navigation](https://learn.microsoft.com/azure/search/search-faceted-navigation)
- [Pagination and $skip limits](https://learn.microsoft.com/azure/search/search-pagination-page-layout)
