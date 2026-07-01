---
sidebar_position: 5
title: "Challenge 43: Knowledge Store Projections"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 43: Knowledge Store Projections

:::info Estimated Time
**45-60 min** | **Cost**: ~$0.30 (Search + Storage transactions) | **Domain**: Information Extraction Solutions (15-20%)
:::

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Define a knowledge store in a skillset | High |
| Create table projections for structured data | High |
| Create object projections for JSON documents | Medium |
| Create file projections for normalized images | Medium |
| Query knowledge store data from Azure Storage | Medium |

## Overview

A **Knowledge Store** is a persistent storage destination for enriched content created by an AI Search skillset. While the search index serves queries, the knowledge store preserves enrichment output in Azure Storage for downstream analytics (Power BI, data science, custom apps).

### Three projection types:

| Type | Storage destination | Format | Use case |
|------|-------------------|--------|----------|
| **Table** | Azure Table Storage | Rows/columns | Power BI, tabular analytics |
| **Object** | Blob Storage | JSON documents | Custom apps, further processing |
| **File** | Blob Storage | Binary (images) | Normalized images from OCR pipeline |

### Shaper skill

The **Shaper skill** creates custom JSON shapes from enrichment outputs. It's commonly used to prepare data for projections with clean, well-structured output.

## Prerequisites

- Completed Challenge 40 (AI Search with skillset)
- Azure Storage Account (from Challenge 40 or create new)
- Python 3.9+ with `azure-search-documents>=11.4.0`
- .NET 8 with `Azure.Search.Documents`

## Implementation

### Task 1: Add a Shaper skill to prepare projection data

The Shaper skill consolidates enrichments into a structured shape suitable for projections.

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.search.documents.indexes.models import (
    ShaperSkill,
    InputFieldMappingEntry,
    OutputFieldMappingEntry,
)

shaper_skill = ShaperSkill(
    name="shaper-skill",
    description="Shape enriched data for knowledge store projections",
    context="/document",
    inputs=[
        InputFieldMappingEntry(name="fileName", source="/document/metadata_storage_name"),
        InputFieldMappingEntry(name="content", source="/document/content"),
        InputFieldMappingEntry(name="keyphrases", source="/document/keyphrases"),
        InputFieldMappingEntry(name="organizations", source="/document/organizations"),
        InputFieldMappingEntry(name="language", source="/document/language"),
    ],
    outputs=[
        OutputFieldMappingEntry(name="output", target_name="documentShape")
    ]
)
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Search.Documents.Indexes.Models;

var shaperSkill = new ShaperSkill(
    inputs: new[]
    {
        new InputFieldMappingEntry("fileName") { Source = "/document/metadata_storage_name" },
        new InputFieldMappingEntry("content") { Source = "/document/content" },
        new InputFieldMappingEntry("keyphrases") { Source = "/document/keyphrases" },
        new InputFieldMappingEntry("organizations") { Source = "/document/organizations" },
        new InputFieldMappingEntry("language") { Source = "/document/language" },
    },
    outputs: new[]
    {
        new OutputFieldMappingEntry("output") { TargetName = "documentShape" }
    })
{
    Name = "shaper-skill",
    Description = "Shape enriched data for knowledge store projections",
    Context = "/document"
};
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Shaper skill JSON definition (part of the skillset)
{
  "@odata.type": "#Microsoft.Skills.Util.ShaperSkill",
  "name": "shaper-skill",
  "context": "/document",
  "inputs": [
    {"name": "fileName", "source": "/document/metadata_storage_name"},
    {"name": "content", "source": "/document/content"},
    {"name": "keyphrases", "source": "/document/keyphrases"},
    {"name": "organizations", "source": "/document/organizations"},
    {"name": "language", "source": "/document/language"}
  ],
  "outputs": [
    {"name": "output", "targetName": "documentShape"}
  ]
}
```

</TabItem>
</Tabs>

### Task 2: Define the knowledge store with table projections

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.search.documents.indexes.models import (
    SearchIndexerSkillset,
    SearchIndexerKnowledgeStore,
    SearchIndexerKnowledgeStoreProjection,
    SearchIndexerKnowledgeStoreTableProjectionSelector,
    SearchIndexerKnowledgeStoreObjectProjectionSelector,
    SearchIndexerKnowledgeStoreFileProjectionSelector,
    CognitiveServicesAccountKey,
)

# Define knowledge store with table + object projections
knowledge_store = SearchIndexerKnowledgeStore(
    storage_connection_string=STORAGE_CONN,
    projections=[
        SearchIndexerKnowledgeStoreProjection(
            tables=[
                SearchIndexerKnowledgeStoreTableProjectionSelector(
                    table_name="documentsTable",
                    generated_key_name="documentId",
                    source="/document/documentShape"
                ),
                SearchIndexerKnowledgeStoreTableProjectionSelector(
                    table_name="keyphrasesTable",
                    generated_key_name="keyphraseId",
                    source="/document/documentShape/keyphrases/*"
                ),
            ],
            objects=[
                SearchIndexerKnowledgeStoreObjectProjectionSelector(
                    storage_container="knowledge-objects",
                    generated_key_name="objectId",
                    source="/document/documentShape"
                )
            ],
            files=[]
        )
    ]
)

# Update the skillset with knowledge store
skillset = SearchIndexerSkillset(
    name="document-skillset",
    description="Enrichment with knowledge store projections",
    skills=[key_phrase_skill, entity_skill, language_skill, shaper_skill],
    knowledge_store=knowledge_store,
    cognitive_services_account=CognitiveServicesAccountKey(key=AI_KEY)
)

indexer_client.create_or_update_skillset(skillset)
print("Skillset updated with knowledge store projections")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
var knowledgeStore = new KnowledgeStore(storageConnectionString)
{
    Projections =
    {
        new KnowledgeStoreProjection
        {
            Tables =
            {
                new KnowledgeStoreTableProjectionSelector("documentsTable")
                {
                    GeneratedKeyName = "documentId",
                    Source = "/document/documentShape"
                },
                new KnowledgeStoreTableProjectionSelector("keyphrasesTable")
                {
                    GeneratedKeyName = "keyphraseId",
                    Source = "/document/documentShape/keyphrases/*"
                }
            },
            Objects =
            {
                new KnowledgeStoreObjectProjectionSelector("knowledge-objects")
                {
                    GeneratedKeyName = "objectId",
                    Source = "/document/documentShape"
                }
            }
        }
    }
};

var skillset = new SearchIndexerSkillset("document-skillset", skills)
{
    KnowledgeStore = knowledgeStore,
    CognitiveServicesAccount = new CognitiveServicesAccountKey(aiKey)
};

await indexerClient.CreateOrUpdateSkillsetAsync(skillset);
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
curl -X PUT "https://${SEARCH_SERVICE}.search.windows.net/skillsets/document-skillset?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "name": "document-skillset",
    "skills": [
      {
        "@odata.type": "#Microsoft.Skills.Text.KeyPhraseExtractionSkill",
        "name": "keyphrases-skill",
        "context": "/document",
        "inputs": [{"name": "text", "source": "/document/content"}],
        "outputs": [{"name": "keyPhrases", "targetName": "keyphrases"}]
      },
      {
        "@odata.type": "#Microsoft.Skills.Util.ShaperSkill",
        "name": "shaper-skill",
        "context": "/document",
        "inputs": [
          {"name": "fileName", "source": "/document/metadata_storage_name"},
          {"name": "content", "source": "/document/content"},
          {"name": "keyphrases", "source": "/document/keyphrases"},
          {"name": "language", "source": "/document/language"}
        ],
        "outputs": [{"name": "output", "targetName": "documentShape"}]
      }
    ],
    "knowledgeStore": {
      "storageConnectionString": "'"${STORAGE_CONN}"'",
      "projections": [
        {
          "tables": [
            {
              "tableName": "documentsTable",
              "generatedKeyName": "documentId",
              "source": "/document/documentShape"
            },
            {
              "tableName": "keyphrasesTable",
              "generatedKeyName": "keyphraseId",
              "source": "/document/documentShape/keyphrases/*"
            }
          ],
          "objects": [
            {
              "storageContainer": "knowledge-objects",
              "generatedKeyName": "objectId",
              "source": "/document/documentShape"
            }
          ]
        }
      ]
    }
  }'
```

</TabItem>
</Tabs>

### Task 3: Add file projections for images

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# File projections store binary content (normalized images from OCR)
# First, add an image extraction configuration to the indexer

from azure.search.documents.indexes.models import (
    SearchIndexer,
    IndexingParameters,
    IndexingParametersConfiguration,
)

# Update indexer to extract images
indexer = SearchIndexer(
    name="document-indexer",
    data_source_name="blob-datasource",
    target_index_name="documents-index",
    skillset_name="document-skillset",
    parameters=IndexingParameters(
        configuration=IndexingParametersConfiguration(
            image_action="generateNormalizedImages"
        )
    )
)
indexer_client.create_or_update_indexer(indexer)

# For file projections, update the knowledge store:
file_projection = SearchIndexerKnowledgeStoreProjection(
    tables=[],
    objects=[],
    files=[
        SearchIndexerKnowledgeStoreFileProjectionSelector(
            storage_container="knowledge-images",
            generated_key_name="imageId",
            source="/document/normalized_images/*"
        )
    ]
)
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// File projections for normalized images
var fileProjection = new KnowledgeStoreProjection
{
    Files =
    {
        new KnowledgeStoreFileProjectionSelector("knowledge-images")
        {
            GeneratedKeyName = "imageId",
            Source = "/document/normalized_images/*"
        }
    }
};

// Update indexer for image extraction
var indexer = new SearchIndexer("document-indexer", "blob-datasource", "documents-index")
{
    SkillsetName = "document-skillset",
    Parameters = new IndexingParameters
    {
        Configuration = new IndexingParametersConfiguration
        {
            { "imageAction", "generateNormalizedImages" }
        }
    }
};
await indexerClient.CreateOrUpdateIndexerAsync(indexer);
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# File projection definition
{
  "files": [
    {
      "storageContainer": "knowledge-images",
      "generatedKeyName": "imageId",
      "source": "/document/normalized_images/*"
    }
  ]
}

# Indexer with image extraction enabled
curl -X PUT "https://${SEARCH_SERVICE}.search.windows.net/indexers/document-indexer?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "name": "document-indexer",
    "dataSourceName": "blob-datasource",
    "targetIndexName": "documents-index",
    "skillsetName": "document-skillset",
    "parameters": {
      "configuration": {
        "imageAction": "generateNormalizedImages"
      }
    }
  }'
```

</TabItem>
</Tabs>

### Task 4: Query the Knowledge Store

After running the indexer, verify projected data in Azure Storage:

```bash
# List tables in storage account
az storage table list --account-name $STORAGE_ACCOUNT --query "[].name" -o tsv

# Query the documents table
az storage entity query \
  --table-name "documentsTable" \
  --account-name $STORAGE_ACCOUNT \
  --query-filter "" \
  --select "fileName,language" \
  --top 10

# List blobs in knowledge-objects container
az storage blob list \
  --container-name "knowledge-objects" \
  --account-name $STORAGE_ACCOUNT \
  --query "[].name" -o tsv

# Download and inspect a projected JSON object
az storage blob download \
  --container-name "knowledge-objects" \
  --account-name $STORAGE_ACCOUNT \
  --name "<blob-name>" \
  --file projected-doc.json

cat projected-doc.json | python -m json.tool
```

## Expected Output

**Table projection (documentsTable):**

| documentId | fileName | language | content (truncated) |
|---|---|---|---|
| abc123 | sample-doc.txt | en | Azure AI services provide... |
| def456 | report.pdf | en | Quarterly report showing... |

**Object projection (JSON blob):**
```json
{
  "fileName": "sample-doc.txt",
  "content": "Azure AI services provide cloud-based AI capabilities...",
  "keyphrases": ["cloud-based AI capabilities", "cognitive services"],
  "organizations": ["Microsoft"],
  "language": "en"
}
```

## Break & fix

| # | Scenario | Symptom | Root Cause | Fix |
|---|----------|---------|------------|-----|
| 1 | Knowledge store tables not created | No tables appear in storage after indexer runs | Storage connection string in skillset is incorrect or missing | Verify `storageConnectionString` in the knowledge store definition |
| 2 | Projection source path invalid | Indexer warning: "Could not project to knowledge store" | Source path doesn't match any enrichment node (e.g., missing Shaper skill) | Add a Shaper skill or correct the source path to match an existing enrichment output |
| 3 | Related tables not linked | Table projections exist but can't join documentsTable to keyphrasesTable in Power BI | Projections in different `projections` groups don't share keys | Put related tables in the SAME projection group — they share a `generatedKeyName` for relationships |
| 4 | Images not projected | File projections container is empty | Indexer not configured with `imageAction: generateNormalizedImages` | Set indexer parameter `configuration.imageAction` to `generateNormalizedImages` |
| 5 | Storage container doesn't exist | Error: "Container not found" | Knowledge store doesn't auto-create containers for object/file projections | The container IS auto-created. Check storage connection string and permissions |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ai102-43-q1",
    question: "You want to analyze enriched documents in Power BI with rows and columns. Which knowledge store projection type should you use?",
    options: [
      "Table projections",
      "Object projections",
      "File projections",
      "Index projections"
    ],
    correctIndex: 0,
    explanation: "Table projections store data in Azure Table Storage in a structured row/column format, which is ideal for Power BI and tabular analytics. Object projections store full JSON documents; file projections store binary images."
  },
  {
    id: "ai102-43-q2",
    question: "Two table projections (documentsTable and keyphrasesTable) need a foreign key relationship. How do you ensure they can be joined?",
    options: [
      "Use the same tableName for both",
      "Set referenceKeyName on the child table",
      "Define both tables in the same projection group",
      "Define them in separate projection groups with identical source paths"
    ],
    correctIndex: 2,
    explanation: "Tables defined in the SAME projection group share a generated key that serves as a foreign key. Tables in different projection groups are independent and cannot be joined. The system auto-generates the relationship key."
  },
  {
    id: "ai102-43-q3",
    question: "What is the purpose of the Shaper skill in a knowledge store pipeline?",
    options: [
      "To split large documents into smaller chunks",
      "To consolidate enrichment outputs into a custom JSON structure suitable for projections",
      "To convert enrichment outputs into the search index schema",
      "To validate the skill output format before projection"
    ],
    correctIndex: 1,
    explanation: "The Shaper skill creates custom JSON shapes by combining multiple enrichment outputs into a single structured object. This is useful for projections because you can design the exact shape of data you want to store."
  },
  {
    id: "ai102-43-q4",
    question: "What indexer parameter must be set for file projections to store images extracted from documents?",
    options: [
      "imageAction: extractImages",
      "imageProcessing: enabled",
      "fileProjections: includeImages",
      "imageAction: generateNormalizedImages"
    ],
    correctIndex: 3,
    explanation: "Setting 'imageAction' to 'generateNormalizedImages' in the indexer configuration tells the indexer to extract and normalize images from documents. This creates '/document/normalized_images/*' nodes that file projections can reference."
  },
  {
    id: "ai102-43-q5",
    question: "Where does an object projection physically store its data?",
    options: [
      "Azure Table Storage as entities",
      "Azure Cosmos DB as documents",
      "Azure Blob Storage as JSON files",
      "Within the AI Search index as stored fields"
    ],
    correctIndex: 2,
    explanation: "Object projections store each enriched document as a JSON blob in Azure Blob Storage. The container is specified in the projection definition. Each document becomes a separate JSON file in the container."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-search --yes --no-wait
```

## Learn More

- [Knowledge store concepts](https://learn.microsoft.com/azure/search/knowledge-store-concept-intro)
- [Define projections](https://learn.microsoft.com/azure/search/knowledge-store-projections-examples)
- [Shaper skill](https://learn.microsoft.com/azure/search/cognitive-search-skill-shaper)
- [Connect Power BI to knowledge store](https://learn.microsoft.com/azure/search/knowledge-store-connect-power-bi)
