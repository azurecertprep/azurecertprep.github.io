---
sidebar_position: 2
title: "Challenge 40: Azure AI Search — Index and Skillset"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 40: Azure AI Search — Index and Skillset

:::info Estimated Time
**60-75 min** | **Cost**: ~$0.50 (Free tier Search + Storage) | **Domain**: Knowledge Mining & Extraction (15-20%)
:::

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Provision an Azure AI Search resource | High |
| Create a data source | High |
| Create an index | High |
| Create and run an indexer | High |
| Create a skillset with built-in skills | High |
| Map enriched fields to an index | Medium |

## Overview

Azure AI Search is a cloud search service that provides indexing and querying capabilities over heterogeneous content. The enrichment pipeline follows this architecture:

**Data Source** → **Indexer** → **Skillset** (AI enrichment) → **Index** (searchable store)

Key concepts:
- **Data source**: Connection to content (Blob Storage, SQL Database, Cosmos DB, Table Storage)
- **Index**: Schema defining searchable fields with types, attributes (searchable, filterable, sortable, facetable)
- **Skillset**: Collection of AI skills that enrich content during indexing (entity recognition, key phrase extraction, language detection, OCR, image analysis)
- **Indexer**: Orchestrator that pulls data from the source, runs the skillset, and populates the index

## Architecture

```
┌─────────────┐     ┌──────────┐     ┌────────────┐     ┌─────────┐
│ Blob Storage│────▶│ Indexer  │────▶│  Skillset  │────▶│  Index  │
│ (PDFs, imgs)│     │          │     │ (AI Skills)│     │(search) │
└─────────────┘     └──────────┘     └────────────┘     └─────────┘
                                           │
                                     ┌─────┴─────┐
                                     │ AI Services│
                                     │ (multi)    │
                                     └───────────┘
```

## Prerequisites

- Azure subscription with Contributor role
- Azure CLI 2.60+
- Python 3.9+ with `azure-search-documents>=11.4.0` and `azure-identity`
- .NET 8 SDK with `Azure.Search.Documents` NuGet package
- A storage account with sample PDF/text documents uploaded to a container

## Implementation

### Task 1: Provision Azure AI Search and upload sample data

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
  --kind CognitiveServices \
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

### Task 2: Create the search index

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

### Task 3: Create the data source connection

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

### Task 4: Create a skillset with built-in skills

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

### Task 5: Create and run the indexer

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

## Expected Output

After the indexer completes, querying the index should return enriched documents:

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

## Break and Fix

| # | Scenario | Symptom | Root Cause | Fix |
|---|----------|---------|------------|-----|
| 1 | Indexer fails with "Could not execute skill" | Indexer status shows `transientFailure` | AI Services key is invalid or the resource is in a different region than the search service | Ensure AI Services is in the same region; update the key in the skillset |
| 2 | Enriched fields are null in the index | Documents index but `keyphrases` and `organizations` are empty | Output field mappings use incorrect source paths (e.g., missing `/document/` prefix) | Fix `outputFieldMappings` source paths to match skillset output `targetName` with `/document/` prefix |
| 3 | Indexer cannot connect to Blob Storage | `StorageException: Access denied` | Storage connection string is invalid or container doesn't exist | Verify connection string and container name in data source definition |
| 4 | Index creation fails with "analyzer not found" | HTTP 400 on index creation | Analyzer name misspelled (e.g., `en.Microsoft` instead of `en.microsoft`) | Use correct analyzer name — they are case-sensitive |
| 5 | Duplicate documents in index after re-run | Document count doubles on each run | Missing or incorrect document key mapping — `metadata_storage_path` needs Base64 encoding | Use `metadata_storage_path` with `base64Encode` mapping function as the key |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ai102-40-q1",
    question: "You need to enrich documents with key phrases and entity recognition during indexing. Which component of Azure AI Search orchestrates this enrichment?",
    options: [
      "Skillset",
      "Index",
      "Data source",
      "Indexer"
    ],
    correctIndex: 3,
    explanation: "The indexer orchestrates the entire pipeline: it pulls data from the data source, invokes the skillset for enrichment, and writes results to the index. The skillset defines WHAT enrichment to do, but the indexer is the component that executes and orchestrates the process."
  },
  {
    id: "ai102-40-q2",
    question: "You define a KeyPhraseExtractionSkill in your skillset. The skill output is 'keyPhrases' with targetName 'keyphrases'. What path do you use in outputFieldMappings to map this to the index?",
    options: [
      "/document/keyphrases",
      "/document/keyPhrases",
      "keyphrases",
      "/document/content/keyphrases"
    ],
    correctIndex: 0,
    explanation: "The outputFieldMappings source path uses the format '/document/{targetName}'. Since the skill output has targetName='keyphrases', the correct source path in the indexer's outputFieldMappings is '/document/keyphrases'."
  },
  {
    id: "ai102-40-q3",
    question: "Which built-in skill would you use to extract text from scanned PDF documents containing images?",
    options: [
      "OcrSkill",
      "ImageAnalysisSkill",
      "EntityRecognitionSkill",
      "TextTranslationSkill"
    ],
    correctIndex: 0,
    explanation: "The OcrSkill (Optical Character Recognition) extracts text from images within documents. For scanned PDFs where content is embedded in images rather than as selectable text, OCR is required. ImageAnalysisSkill generates descriptions/tags but doesn't extract text."
  },
  {
    id: "ai102-40-q4",
    question: "You create an index field with attributes: searchable=true, filterable=true, facetable=true. Which field type is this configuration INVALID for?",
    options: [
      "Edm.GeographyPoint",
      "Edm.String",
      "Collection(Edm.String)",
      "Edm.Int32"
    ],
    correctIndex: 0,
    explanation: "Edm.GeographyPoint fields cannot be searchable or facetable. They can only be filterable and sortable. String and collection fields can be searchable, filterable, and facetable. Numeric fields (Int32) can be filterable, sortable, and facetable but not searchable."
  },
  {
    id: "ai102-40-q5",
    question: "Your indexer needs an Azure AI Services resource to run built-in cognitive skills. What happens if you don't attach one?",
    options: [
      "Skills execute but are limited to 20 free enrichments per indexer per day",
      "The indexer fails immediately without processing any documents",
      "Skills are skipped entirely and only raw content is indexed",
      "Azure AI Search uses its own built-in processing without any limits"
    ],
    correctIndex: 0,
    explanation: "Without an attached Azure AI Services resource, the skillset still works but is limited to 20 free enrichments per indexer per day. This is useful for testing but insufficient for production. Attaching a billable AI Services resource removes this limit."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-search --yes --no-wait
```

## Learn More

- [Azure AI Search documentation](https://learn.microsoft.com/azure/search/)
- [Built-in skills reference](https://learn.microsoft.com/azure/search/cognitive-search-predefined-skills)
- [Create an indexer](https://learn.microsoft.com/azure/search/search-howto-create-indexers)
- [Skillset concepts](https://learn.microsoft.com/azure/search/cognitive-search-working-with-skillsets)
- [Field mappings and output field mappings](https://learn.microsoft.com/azure/search/search-indexer-field-mappings)
