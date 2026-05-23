---
sidebar_position: 5
title: "Desafio 43: Projeções do Knowledge Store"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 43: Projeções do Knowledge Store

:::info Tempo Estimado
**45-60 min** | **Custo**: ~$0.30 (transações de Search + Storage) | **Domínio**: Knowledge Mining & Extraction (15-20%)
:::

## Habilidades do exame cobertas

| Habilidade | Peso |
|-------|--------|
| Definir um knowledge store em um skillset | Alto |
| Criar projeções de tabela para dados estruturados | Alto |
| Criar projeções de objeto para documentos JSON | Médio |
| Criar projeções de arquivo para imagens normalizadas | Médio |
| Consultar dados do knowledge store a partir do Azure Storage | Médio |

## Visão Geral

Um **Knowledge Store** é um destino de armazenamento persistente para conteúdo enriquecido criado por um skillset do AI Search. Enquanto o índice de pesquisa atende consultas, o knowledge store preserva a saída de enriquecimento no Azure Storage para análises downstream (Power BI, ciência de dados, apps personalizados).

### Três tipos de projeção:

| Tipo | Destino de armazenamento | Formato | Caso de uso |
|------|-------------------|--------|----------|
| **Tabela** | Azure Table Storage | Linhas/colunas | Power BI, análise tabular |
| **Objeto** | Blob Storage | Documentos JSON | Apps personalizados, processamento adicional |
| **Arquivo** | Blob Storage | Binário (imagens) | Imagens normalizadas do pipeline de OCR |

### Shaper skill

O **Shaper skill** cria formas JSON personalizadas a partir de saídas de enriquecimento. É comumente usado para preparar dados para projeções com saída limpa e bem estruturada.

## Pré-requisitos

- Desafio 40 concluído (AI Search com skillset)
- Azure Storage Account (do Desafio 40 ou criar novo)
- Python 3.9+ com `azure-search-documents>=11.4.0`
- .NET 8 com `Azure.Search.Documents`

## Implementação

### Tarefa 1: Adicionar um Shaper skill para preparar dados de projeção

O Shaper skill consolida enriquecimentos em uma forma estruturada adequada para projeções.

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

### Tarefa 2: Definir o knowledge store com projeções de tabela

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

### Tarefa 3: Adicionar projeções de arquivo para imagens

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

### Tarefa 4: Consultar o Knowledge Store

Após executar o indexer, verifique os dados projetados no Azure Storage:

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

## Saída Esperada

**Projeção de tabela (documentsTable):**

| documentId | fileName | language | content (truncado) |
|---|---|---|---|
| abc123 | sample-doc.txt | en | Azure AI services provide... |
| def456 | report.pdf | en | Quarterly report showing... |

**Projeção de objeto (blob JSON):**
```json
{
  "fileName": "sample-doc.txt",
  "content": "Azure AI services provide cloud-based AI capabilities...",
  "keyphrases": ["cloud-based AI capabilities", "cognitive services"],
  "organizations": ["Microsoft"],
  "language": "en"
}
```

## Quebrar e Corrigir

| # | Cenário | Sintoma | Causa Raiz | Correção |
|---|----------|---------|------------|-----|
| 1 | Tabelas do knowledge store não criadas | Nenhuma tabela aparece no storage após o indexer executar | String de conexão do storage no skillset está incorreta ou ausente | Verifique `storageConnectionString` na definição do knowledge store |
| 2 | Caminho de origem da projeção inválido | Aviso do indexer: "Could not project to knowledge store" | O caminho de origem não corresponde a nenhum nó de enriquecimento (ex.: Shaper skill ausente) | Adicione um Shaper skill ou corrija o caminho de origem para corresponder a uma saída de enriquecimento existente |
| 3 | Tabelas relacionadas não vinculadas | Projeções de tabela existem mas não é possível unir documentsTable a keyphrasesTable no Power BI | Projeções em diferentes grupos `projections` não compartilham chaves | Coloque tabelas relacionadas no MESMO grupo de projeção — elas compartilham um `generatedKeyName` para relacionamentos |
| 4 | Imagens não projetadas | Container de projeções de arquivo está vazio | Indexer não configurado com `imageAction: generateNormalizedImages` | Defina o parâmetro do indexer `configuration.imageAction` como `generateNormalizedImages` |
| 5 | Container de storage não existe | Erro: "Container not found" | Knowledge store não cria containers automaticamente para projeções de objeto/arquivo | O container É criado automaticamente. Verifique a string de conexão do storage e as permissões |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ai102-43-q1",
    question: "Você quer analisar documentos enriquecidos no Power BI com linhas e colunas. Qual tipo de projeção do knowledge store você deve usar?",
    options: [
      "Projeções de tabela",
      "Projeções de objeto",
      "Projeções de arquivo",
      "Projeções de índice"
    ],
    correctIndex: 0,
    explanation: "Projeções de tabela armazenam dados no Azure Table Storage em um formato estruturado de linhas/colunas, que é ideal para Power BI e análise tabular. Projeções de objeto armazenam documentos JSON completos; projeções de arquivo armazenam imagens binárias."
  },
  {
    id: "ai102-43-q2",
    question: "Duas projeções de tabela (documentsTable e keyphrasesTable) precisam de um relacionamento de chave estrangeira. Como você garante que elas possam ser unidas?",
    options: [
      "Usar o mesmo tableName para ambas",
      "Definir referenceKeyName na tabela filha",
      "Definir ambas as tabelas no mesmo grupo de projeção",
      "Defini-las em grupos de projeção separados com caminhos de origem idênticos"
    ],
    correctIndex: 2,
    explanation: "Tabelas definidas no MESMO grupo de projeção compartilham uma chave gerada que serve como chave estrangeira. Tabelas em diferentes grupos de projeção são independentes e não podem ser unidas. O sistema gera automaticamente a chave de relacionamento."
  },
  {
    id: "ai102-43-q3",
    question: "Qual é o propósito do Shaper skill em um pipeline de knowledge store?",
    options: [
      "Dividir documentos grandes em pedaços menores",
      "Consolidar saídas de enriquecimento em uma estrutura JSON personalizada adequada para projeções",
      "Converter saídas de enriquecimento no esquema do índice de pesquisa",
      "Validar o formato de saída do skill antes da projeção"
    ],
    correctIndex: 1,
    explanation: "O Shaper skill cria formas JSON personalizadas combinando múltiplas saídas de enriquecimento em um único objeto estruturado. Isso é útil para projeções porque você pode projetar a forma exata dos dados que deseja armazenar."
  },
  {
    id: "ai102-43-q4",
    question: "Qual parâmetro do indexer deve ser definido para que projeções de arquivo armazenem imagens extraídas de documentos?",
    options: [
      "imageAction: extractImages",
      "imageProcessing: enabled",
      "fileProjections: includeImages",
      "imageAction: generateNormalizedImages"
    ],
    correctIndex: 3,
    explanation: "Definir 'imageAction' como 'generateNormalizedImages' na configuração do indexer instrui o indexer a extrair e normalizar imagens dos documentos. Isso cria nós '/document/normalized_images/*' que as projeções de arquivo podem referenciar."
  },
  {
    id: "ai102-43-q5",
    question: "Onde uma projeção de objeto armazena fisicamente seus dados?",
    options: [
      "Azure Table Storage como entidades",
      "Azure Cosmos DB como documentos",
      "Azure Blob Storage como arquivos JSON",
      "Dentro do índice do AI Search como campos armazenados"
    ],
    correctIndex: 2,
    explanation: "Projeções de objeto armazenam cada documento enriquecido como um blob JSON no Azure Blob Storage. O container é especificado na definição da projeção. Cada documento se torna um arquivo JSON separado no container."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-search --yes --no-wait
```

## Saiba Mais

- [Conceitos de knowledge store](https://learn.microsoft.com/azure/search/knowledge-store-concept-intro)
- [Definir projeções](https://learn.microsoft.com/azure/search/knowledge-store-projections-examples)
- [Shaper skill](https://learn.microsoft.com/azure/search/cognitive-search-skill-shaper)
- [Conectar Power BI ao knowledge store](https://learn.microsoft.com/azure/search/knowledge-store-connect-power-bi)
