---
sidebar_position: 2
title: "Desafio 40: Azure AI Search â€” Ãndice e Skillset"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 40: Azure AI Search â€” Ãndice e Skillset

:::info Tempo Estimado
**60-75 min** | **Custo**: ~$0.50 (Tier gratuito Search + Storage) | **DomÃ­nio**: Knowledge Mining & Extraction (15-20%)
:::

## Habilidades do exame cobertas

| Habilidade | Peso |
|-------|--------|
| Provisionar um recurso Azure AI Search | Alto |
| Criar uma fonte de dados | Alto |
| Criar um Ã­ndice | Alto |
| Criar e executar um indexador | Alto |
| Criar um skillset com skills integradas | Alto |
| Mapear campos enriquecidos para um Ã­ndice | MÃ©dio |

## VisÃ£o Geral

Azure AI Search Ã© um serviÃ§o de busca em nuvem que fornece capacidades de indexaÃ§Ã£o e consulta sobre conteÃºdo heterogÃªneo. O pipeline de enriquecimento segue esta arquitetura:

**Data Source** â†’ **Indexer** â†’ **Skillset** (enriquecimento com IA) â†’ **Index** (armazenamento pesquisÃ¡vel)

Conceitos-chave:
- **Data source**: ConexÃ£o com o conteÃºdo (Blob Storage, SQL Database, Cosmos DB, Table Storage)
- **Index**: Schema que define campos pesquisÃ¡veis com tipos e atributos (searchable, filterable, sortable, facetable)
- **Skillset**: ColeÃ§Ã£o de skills de IA que enriquecem o conteÃºdo durante a indexaÃ§Ã£o (reconhecimento de entidades, extraÃ§Ã£o de frases-chave, detecÃ§Ã£o de idioma, OCR, anÃ¡lise de imagem)
- **Indexer**: Orquestrador que puxa dados da fonte, executa o skillset e popula o Ã­ndice

## Arquitetura

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Blob Storageâ”‚â”€â”€â”€â”€â–¶â”‚ Indexer  â”‚â”€â”€â”€â”€â–¶â”‚  Skillset  â”‚â”€â”€â”€â”€â–¶â”‚  Index  â”‚
â”‚ (PDFs, imgs)â”‚     â”‚          â”‚     â”‚ (AI Skills)â”‚     â”‚(search) â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                           â”‚
                                     â”Œâ”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”
                                     â”‚ AI Servicesâ”‚
                                     â”‚ (multi)    â”‚
                                     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## PrÃ©-requisitos

- Assinatura Azure com funÃ§Ã£o de Contributor
- Azure CLI 2.60+
- Python 3.9+ com `azure-search-documents>=11.4.0` e `azure-identity`
- .NET 8 SDK com pacote NuGet `Azure.Search.Documents`
- Uma conta de armazenamento com documentos PDF/texto de exemplo carregados em um container

## ImplementaÃ§Ã£o

### Tarefa 1: Provisionar Azure AI Search e carregar dados de exemplo

```bash
# Variables
RG="rg-ai102-search"
LOCATION="eastus"
SEARCH_SERVICE="search-ai102-$(openssl rand -hex 4)"
STORAGE_ACCOUNT="stai102search$(openssl rand -hex 4)"
CONTAINER="documents"
AI_SERVICE="ai-services-ai102"

# Create resource group
az group create --name $RG --location $LOCATION

# Create Azure AI Search (Free tier for lab)
az search service create \
  --name $SEARCH_SERVICE \
  --resource-group $RG \
  --location $LOCATION \
  --sku free

# Create storage account and container
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS

az storage container create \
  --name $CONTAINER \
  --account-name $STORAGE_ACCOUNT

# Upload sample documents (create a sample text file)
echo "Azure AI services provide cloud-based AI capabilities. Microsoft Azure offers cognitive services for vision, speech, language, and decision." > sample-doc.txt
az storage blob upload \
  --account-name $STORAGE_ACCOUNT \
  --container-name $CONTAINER \
  --name "sample-doc.txt" \
  --file "sample-doc.txt"

# Create Azure AI Services (multi-service) for skillset
az cognitiveservices account create \
  --name $AI_SERVICE \
  --resource-group $RG \
  --location $LOCATION \
  --kind AIServices \
  --sku S0 \
  --yes

# Get keys
SEARCH_KEY=$(az search admin-key show \
  --resource-group $RG \
  --service-name $SEARCH_SERVICE \
  --query "primaryKey" -o tsv)

STORAGE_CONN=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --query "connectionString" -o tsv)

AI_KEY=$(az cognitiveservices account keys list \
  --name $AI_SERVICE \
  --resource-group $RG \
  --query "key1" -o tsv)
```

### Tarefa 2: Criar o Ã­ndice de busca

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
)

# Configuration
endpoint = f"https://{SEARCH_SERVICE}.search.windows.net"
credential = AzureKeyCredential(SEARCH_KEY)

index_client = SearchIndexClient(endpoint=endpoint, credential=credential)

# Define the index schema
fields = [
    SimpleField(name="id", type=SearchFieldDataType.String, key=True, filterable=True),
    SearchableField(name="content", type=SearchFieldDataType.String, analyzer_name="en.microsoft"),
    SearchableField(name="metadata_storage_name", type=SearchFieldDataType.String, filterable=True, sortable=True),
    SimpleField(name="metadata_storage_path", type=SearchFieldDataType.String, filterable=True),
    SearchableField(name="keyphrases", type=SearchFieldDataType.Collection(SearchFieldDataType.String), filterable=True, facetable=True),
    SearchableField(name="organizations", type=SearchFieldDataType.Collection(SearchFieldDataType.String), filterable=True, facetable=True),
    SimpleField(name="language", type=SearchFieldDataType.String, filterable=True, facetable=True),
]

index = SearchIndex(name="documents-index", fields=fields)
result = index_client.create_or_update_index(index)
print(f"Index '{result.name}' created successfully")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.Search.Documents.Indexes;
using Azure.Search.Documents.Indexes.Models;

var endpoint = new Uri($"https://{searchService}.search.windows.net");
var credential = new AzureKeyCredential(searchKey);
var indexClient = new SearchIndexClient(endpoint, credential);

var fields = new List<SearchField>
{
    new SimpleField("id", SearchFieldDataType.String) { IsKey = true, IsFilterable = true },
    new SearchableField("content") { AnalyzerName = LexicalAnalyzerName.EnMicrosoft },
    new SearchableField("metadata_storage_name") { IsFilterable = true, IsSortable = true },
    new SimpleField("metadata_storage_path", SearchFieldDataType.String) { IsFilterable = true },
    new SearchableField("keyphrases", collection: true) { IsFilterable = true, IsFacetable = true },
    new SearchableField("organizations", collection: true) { IsFilterable = true, IsFacetable = true },
    new SimpleField("language", SearchFieldDataType.String) { IsFilterable = true, IsFacetable = true },
};

var index = new SearchIndex("documents-index", fields);
var result = await indexClient.CreateOrUpdateIndexAsync(index);
Console.WriteLine($"Index '{result.Value.Name}' created successfully");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
curl -X PUT "https://${SEARCH_SERVICE}.search.windows.net/indexes/documents-index?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "name": "documents-index",
    "fields": [
      {"name": "id", "type": "Edm.String", "key": true, "filterable": true},
      {"name": "content", "type": "Edm.String", "searchable": true, "analyzer": "en.microsoft"},
      {"name": "metadata_storage_name", "type": "Edm.String", "searchable": true, "filterable": true, "sortable": true},
      {"name": "metadata_storage_path", "type": "Edm.String", "filterable": true},
      {"name": "keyphrases", "type": "Collection(Edm.String)", "searchable": true, "filterable": true, "facetable": true},
      {"name": "organizations", "type": "Collection(Edm.String)", "searchable": true, "filterable": true, "facetable": true},
      {"name": "language", "type": "Edm.String", "filterable": true, "facetable": true}
    ]
  }'
```

</TabItem>
</Tabs>

### Tarefa 3: Criar a conexÃ£o com a fonte de dados

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.search.documents.indexes import SearchIndexerClient
from azure.search.documents.indexes.models import SearchIndexerDataSourceConnection, SearchIndexerDataContainer

indexer_client = SearchIndexerClient(endpoint=endpoint, credential=credential)

data_source = SearchIndexerDataSourceConnection(
    name="blob-datasource",
    type="azureblob",
    connection_string=STORAGE_CONN,
    container=SearchIndexerDataContainer(name="documents")
)

result = indexer_client.create_or_update_data_source_connection(data_source)
print(f"Data source '{result.name}' created")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Search.Documents.Indexes.Models;

var indexerClient = new SearchIndexerClient(endpoint, credential);

var dataSource = new SearchIndexerDataSourceConnection(
    name: "blob-datasource",
    type: SearchIndexerDataSourceType.AzureBlob,
    connectionString: storageConnectionString,
    container: new SearchIndexerDataContainer("documents"));

await indexerClient.CreateOrUpdateDataSourceConnectionAsync(dataSource);
Console.WriteLine("Data source 'blob-datasource' created");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
curl -X PUT "https://${SEARCH_SERVICE}.search.windows.net/datasources/blob-datasource?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "name": "blob-datasource",
    "type": "azureblob",
    "credentials": { "connectionString": "'"${STORAGE_CONN}"'" },
    "container": { "name": "documents" }
  }'
```

</TabItem>
</Tabs>

### Tarefa 4: Criar um skillset com skills integradas

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.search.documents.indexes.models import (
    SearchIndexerSkillset,
    EntityRecognitionSkill,
    KeyPhraseExtractionSkill,
    LanguageDetectionSkill,
    InputFieldMappingEntry,
    OutputFieldMappingEntry,
    CognitiveServicesAccountKey,
)

# Define built-in skills
key_phrase_skill = KeyPhraseExtractionSkill(
    name="keyphrases-skill",
    description="Extract key phrases from content",
    context="/document",
    inputs=[InputFieldMappingEntry(name="text", source="/document/content")],
    outputs=[OutputFieldMappingEntry(name="keyPhrases", target_name="keyphrases")]
)

entity_skill = EntityRecognitionSkill(
    name="entity-skill",
    description="Recognize organizations",
    context="/document",
    categories=["Organization"],
    inputs=[InputFieldMappingEntry(name="text", source="/document/content")],
    outputs=[OutputFieldMappingEntry(name="organizations", target_name="organizations")]
)

language_skill = LanguageDetectionSkill(
    name="language-skill",
    description="Detect document language",
    context="/document",
    inputs=[InputFieldMappingEntry(name="text", source="/document/content")],
    outputs=[OutputFieldMappingEntry(name="languageCode", target_name="language")]
)

# Create skillset
skillset = SearchIndexerSkillset(
    name="document-skillset",
    description="Enrichment pipeline with key phrases, entities, and language",
    skills=[key_phrase_skill, entity_skill, language_skill],
    cognitive_services_account=CognitiveServicesAccountKey(key=AI_KEY)
)

result = indexer_client.create_or_update_skillset(skillset)
print(f"Skillset '{result.name}' created with {len(result.skills)} skills")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Search.Documents.Indexes.Models;

var skills = new List<SearchIndexerSkill>
{
    new KeyPhraseExtractionSkill(
        inputs: new[] { new InputFieldMappingEntry("text") { Source = "/document/content" } },
        outputs: new[] { new OutputFieldMappingEntry("keyPhrases") { TargetName = "keyphrases" } })
    {
        Name = "keyphrases-skill",
        Context = "/document"
    },
    new EntityRecognitionSkill(
        inputs: new[] { new InputFieldMappingEntry("text") { Source = "/document/content" } },
        outputs: new[] { new OutputFieldMappingEntry("organizations") { TargetName = "organizations" } })
    {
        Name = "entity-skill",
        Context = "/document",
        Categories = { EntityCategory.Organization }
    },
    new LanguageDetectionSkill(
        inputs: new[] { new InputFieldMappingEntry("text") { Source = "/document/content" } },
        outputs: new[] { new OutputFieldMappingEntry("languageCode") { TargetName = "language" } })
    {
        Name = "language-skill",
        Context = "/document"
    }
};

var skillset = new SearchIndexerSkillset("document-skillset", skills)
{
    Description = "Enrichment pipeline with key phrases, entities, and language",
    CognitiveServicesAccount = new CognitiveServicesAccountKey(aiKey)
};

await indexerClient.CreateOrUpdateSkillsetAsync(skillset);
Console.WriteLine("Skillset 'document-skillset' created");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
curl -X PUT "https://${SEARCH_SERVICE}.search.windows.net/skillsets/document-skillset?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "name": "document-skillset",
    "description": "Enrichment pipeline with key phrases, entities, and language",
    "skills": [
      {
        "@odata.type": "#Microsoft.Skills.Text.KeyPhraseExtractionSkill",
        "name": "keyphrases-skill",
        "context": "/document",
        "inputs": [{"name": "text", "source": "/document/content"}],
        "outputs": [{"name": "keyPhrases", "targetName": "keyphrases"}]
      },
      {
        "@odata.type": "#Microsoft.Skills.Text.V3.EntityRecognitionSkill",
        "name": "entity-skill",
        "context": "/document",
        "categories": ["Organization"],
        "inputs": [{"name": "text", "source": "/document/content"}],
        "outputs": [{"name": "organizations", "targetName": "organizations"}]
      },
      {
        "@odata.type": "#Microsoft.Skills.Text.LanguageDetectionSkill",
        "name": "language-skill",
        "context": "/document",
        "inputs": [{"name": "text", "source": "/document/content"}],
        "outputs": [{"name": "languageCode", "targetName": "language"}]
      }
    ],
    "cognitiveServices": {
      "@odata.type": "#Microsoft.Azure.Search.CognitiveServicesByKey",
      "key": "'"${AI_KEY}"'"
    }
  }'
```

</TabItem>
</Tabs>

### Tarefa 5: Criar e executar o indexador

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.search.documents.indexes.models import (
    SearchIndexer,
    FieldMapping,
)

indexer = SearchIndexer(
    name="document-indexer",
    data_source_name="blob-datasource",
    target_index_name="documents-index",
    skillset_name="document-skillset",
    field_mappings=[
        FieldMapping(source_field_name="metadata_storage_path", target_field_name="id"),
        FieldMapping(source_field_name="metadata_storage_name", target_field_name="metadata_storage_name"),
    ],
    output_field_mappings=[
        FieldMapping(source_field_name="/document/keyphrases", target_field_name="keyphrases"),
        FieldMapping(source_field_name="/document/organizations", target_field_name="organizations"),
        FieldMapping(source_field_name="/document/language", target_field_name="language"),
    ]
)

result = indexer_client.create_or_update_indexer(indexer)
print(f"Indexer '{result.name}' created")

# Run the indexer
indexer_client.run_indexer(indexer.name)
print("Indexer running...")

# Check status
import time
time.sleep(10)
status = indexer_client.get_indexer_status(indexer.name)
print(f"Status: {status.last_result.status if status.last_result else 'running'}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
var indexer = new SearchIndexer("document-indexer", "blob-datasource", "documents-index")
{
    SkillsetName = "document-skillset",
    FieldMappings =
    {
        new FieldMapping("metadata_storage_path") { TargetFieldName = "id" },
        new FieldMapping("metadata_storage_name") { TargetFieldName = "metadata_storage_name" },
    },
    OutputFieldMappings =
    {
        new FieldMapping("/document/keyphrases") { TargetFieldName = "keyphrases" },
        new FieldMapping("/document/organizations") { TargetFieldName = "organizations" },
        new FieldMapping("/document/language") { TargetFieldName = "language" },
    }
};

await indexerClient.CreateOrUpdateIndexerAsync(indexer);
Console.WriteLine("Indexer 'document-indexer' created");

// Run the indexer
await indexerClient.RunIndexerAsync("document-indexer");
Console.WriteLine("Indexer running...");

// Check status
await Task.Delay(10000);
var status = await indexerClient.GetIndexerStatusAsync("document-indexer");
Console.WriteLine($"Status: {status.Value.LastResult?.Status}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create indexer
curl -X PUT "https://${SEARCH_SERVICE}.search.windows.net/indexers/document-indexer?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "name": "document-indexer",
    "dataSourceName": "blob-datasource",
    "targetIndexName": "documents-index",
    "skillsetName": "document-skillset",
    "fieldMappings": [
      {"sourceFieldName": "metadata_storage_path", "targetFieldName": "id"},
      {"sourceFieldName": "metadata_storage_name", "targetFieldName": "metadata_storage_name"}
    ],
    "outputFieldMappings": [
      {"sourceFieldName": "/document/keyphrases", "targetFieldName": "keyphrases"},
      {"sourceFieldName": "/document/organizations", "targetFieldName": "organizations"},
      {"sourceFieldName": "/document/language", "targetFieldName": "language"}
    ]
  }'

# Run the indexer
curl -X POST "https://${SEARCH_SERVICE}.search.windows.net/indexers/document-indexer/run?api-version=2024-07-01" \
  -H "api-key: ${SEARCH_KEY}"

# Check indexer status
curl -s "https://${SEARCH_SERVICE}.search.windows.net/indexers/document-indexer/status?api-version=2024-07-01" \
  -H "api-key: ${SEARCH_KEY}" | python -m json.tool
```

</TabItem>
</Tabs>

## SaÃ­da Esperada

ApÃ³s a conclusÃ£o do indexador, consultar o Ã­ndice deve retornar documentos enriquecidos:

```json
{
  "value": [
    {
      "id": "aHR0cHM6Ly9...",
      "content": "Azure AI services provide cloud-based AI capabilities...",
      "metadata_storage_name": "sample-doc.txt",
      "keyphrases": ["cloud-based AI capabilities", "cognitive services", "Azure AI services"],
      "organizations": ["Microsoft"],
      "language": "en"
    }
  ]
}
```

## Quebra & conserta

| # | CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---|----------|---------|------------|-----|
| 1 | Indexador falha com "Could not execute skill" | Status do indexador mostra `transientFailure` | A chave do AI Services Ã© invÃ¡lida ou o recurso estÃ¡ em uma regiÃ£o diferente do serviÃ§o de busca | Certifique-se de que o AI Services estÃ¡ na mesma regiÃ£o; atualize a chave no skillset |
| 2 | Campos enriquecidos estÃ£o nulos no Ã­ndice | Documentos sÃ£o indexados mas `keyphrases` e `organizations` estÃ£o vazios | Os mapeamentos de campos de saÃ­da usam caminhos de origem incorretos (ex.: prefixo `/document/` ausente) | Corrija os caminhos de origem em `outputFieldMappings` para corresponder ao `targetName` da saÃ­da do skillset com o prefixo `/document/` |
| 3 | Indexador nÃ£o consegue conectar ao Blob Storage | `StorageException: Access denied` | A connection string do armazenamento Ã© invÃ¡lida ou o container nÃ£o existe | Verifique a connection string e o nome do container na definiÃ§Ã£o da fonte de dados |
| 4 | CriaÃ§Ã£o do Ã­ndice falha com "analyzer not found" | HTTP 400 na criaÃ§Ã£o do Ã­ndice | Nome do analyzer digitado incorretamente (ex.: `en.Microsoft` em vez de `en.microsoft`) | Use o nome correto do analyzer â€” eles sÃ£o case-sensitive |
| 5 | Documentos duplicados no Ã­ndice apÃ³s re-execuÃ§Ã£o | Contagem de documentos dobra a cada execuÃ§Ã£o | Mapeamento de chave do documento ausente ou incorreto â€” `metadata_storage_path` precisa de codificaÃ§Ã£o Base64 | Use `metadata_storage_path` com a funÃ§Ã£o de mapeamento `base64Encode` como chave |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ai102-40-q1",
    question: "VocÃª precisa enriquecer documentos com frases-chave e reconhecimento de entidades durante a indexaÃ§Ã£o. Qual componente do Azure AI Search orquestra esse enriquecimento?",
    options: [
      "Skillset",
      "Index",
      "Data source",
      "Indexer"
    ],
    correctIndex: 3,
    explanation: "O indexer orquestra todo o pipeline: ele puxa dados da fonte de dados, invoca o skillset para enriquecimento e grava os resultados no Ã­ndice. O skillset define O QUE enriquecer, mas o indexer Ã© o componente que executa e orquestra o processo."
  },
  {
    id: "ai102-40-q2",
    question: "VocÃª define um KeyPhraseExtractionSkill no seu skillset. A saÃ­da da skill Ã© 'keyPhrases' com targetName 'keyphrases'. Qual caminho vocÃª usa em outputFieldMappings para mapear isso para o Ã­ndice?",
    options: [
      "/document/keyPhrases",
      "keyphrases",
      "/document/keyphrases",
      "/document/content/keyphrases"
    ],
    correctIndex: 2,
    explanation: "O caminho de origem em outputFieldMappings usa o formato '/document/{targetName}'. Como a saÃ­da da skill tem targetName='keyphrases', o caminho correto no outputFieldMappings do indexer Ã© '/document/keyphrases'."
  },
  {
    id: "ai102-40-q3",
    question: "Qual skill integrada vocÃª usaria para extrair texto de documentos PDF digitalizados contendo imagens?",
    options: [
      "ImageAnalysisSkill",
      "OcrSkill",
      "EntityRecognitionSkill",
      "TextTranslationSkill"
    ],
    correctIndex: 1,
    explanation: "O OcrSkill (Optical Character Recognition) extrai texto de imagens dentro de documentos. Para PDFs digitalizados onde o conteÃºdo estÃ¡ incorporado em imagens em vez de texto selecionÃ¡vel, o OCR Ã© necessÃ¡rio. O ImageAnalysisSkill gera descriÃ§Ãµes/tags mas nÃ£o extrai texto."
  },
  {
    id: "ai102-40-q4",
    question: "VocÃª cria um campo de Ã­ndice com os atributos: searchable=true, filterable=true, facetable=true. Para qual tipo de campo essa configuraÃ§Ã£o Ã© INVÃLIDA?",
    options: [
      "Edm.GeographyPoint",
      "Edm.String",
      "Collection(Edm.String)",
      "Edm.Int32"
    ],
    correctIndex: 0,
    explanation: "Campos Edm.GeographyPoint nÃ£o podem ser searchable ou facetable. Eles sÃ³ podem ser filterable e sortable. Campos String e collection podem ser searchable, filterable e facetable. Campos numÃ©ricos (Int32) podem ser filterable, sortable e facetable, mas nÃ£o searchable."
  },
  {
    id: "ai102-40-q5",
    question: "Seu indexador precisa de um recurso Azure AI Services para executar skills cognitivas integradas. O que acontece se vocÃª nÃ£o anexar um?",
    options: [
      "O indexador falha imediatamente sem processar nenhum documento",
      "As skills sÃ£o ignoradas completamente e apenas o conteÃºdo bruto Ã© indexado",
      "As skills sÃ£o executadas mas limitadas a 20 enriquecimentos gratuitos por indexador por dia",
      "O Azure AI Search usa seu prÃ³prio processamento integrado sem nenhum limite"
    ],
    correctIndex: 2,
    explanation: "Sem um recurso Azure AI Services anexado, o skillset ainda funciona mas Ã© limitado a 20 enriquecimentos gratuitos por indexador por dia. Isso Ã© Ãºtil para testes mas insuficiente para produÃ§Ã£o. Anexar um recurso AI Services faturÃ¡vel remove esse limite."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-search --yes --no-wait
```

## Saiba Mais

- [DocumentaÃ§Ã£o do Azure AI Search](https://learn.microsoft.com/azure/search/)
- [ReferÃªncia de skills integradas](https://learn.microsoft.com/azure/search/cognitive-search-predefined-skills)
- [Criar um indexador](https://learn.microsoft.com/azure/search/search-howto-create-indexers)
- [Conceitos de skillset](https://learn.microsoft.com/azure/search/cognitive-search-working-with-skillsets)
- [Mapeamentos de campos e mapeamentos de campos de saÃ­da](https://learn.microsoft.com/azure/search/search-indexer-field-mappings)
