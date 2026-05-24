---
sidebar_position: 3
title: "Desafio 41: Skills Customizadas no Azure AI Search"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 41: Skills Customizadas no Azure AI Search

:::info Tempo Estimado
**60-90 min** | **Custo**: ~$0.50 (Search na camada gratuita + Function App consumo) | **Domínio**: Knowledge Mining & Extraction (15-20%)
:::

## Habilidades do exame cobertas

| Habilidade | Peso |
|-------|--------|
| Implementar uma skill customizada para o Azure AI Search | Alto |
| Projetar o contrato de entrada/saída da skill customizada | Alto |
| Integrar uma skill customizada em um skillset | Alto |
| Implantar uma Azure Function para processamento de skill customizada | Médio |

## Visão Geral

Enquanto as skills integradas cobrem cenários comuns (reconhecimento de entidades, frases-chave, OCR), as skills customizadas permitem que você adicione qualquer lógica de processamento ao pipeline de enriquecimento. Uma skill customizada é um endpoint de Web API (tipicamente uma Azure Function) que segue o **contrato de interface da skill customizada**.

### Contrato da Skill Customizada

A skill de Web API customizada espera:
- **Entrada**: JSON com um array `values`, cada um contendo um `recordId` e um objeto `data`
- **Saída**: JSON com um array `values`, cada um contendo `recordId`, `data` (resultados enriquecidos), `errors` e `warnings`

```json
// INPUT (from indexer to your function)
{
  "values": [
    {
      "recordId": "1",
      "data": {
        "text": "The contract was signed on January 15, 2024 for $50,000."
      }
    }
  ]
}

// OUTPUT (from your function back to indexer)
{
  "values": [
    {
      "recordId": "1",
      "data": {
        "contractDate": "2024-01-15",
        "contractAmount": 50000.00
      },
      "errors": [],
      "warnings": []
    }
  ]
}
```

## Pré-requisitos

- Desafio 40 concluído (ou configuração equivalente do AI Search)
- Azure Functions Core Tools v4
- Python 3.9+ ou .NET 8 SDK
- `azure-search-documents>=11.4.0`

## Implementação

### Tarefa 1: Criar a Azure Function (Skill Customizada)

A função extrai metadados customizados — neste exemplo, contagem de palavras e tempo de leitura.

<Tabs>
<TabItem value="python" label="Python (Azure Function)">

```python
# function_app.py
import azure.functions as func
import json
import logging

app = func.FunctionApp()

@app.route(route="custom-skill", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def custom_skill(req: func.HttpRequest) -> func.HttpResponse:
    """Custom skill: calculates word count and estimated reading time."""
    logging.info("Custom skill invoked")

    try:
        body = req.get_json()
    except ValueError:
        return func.HttpResponse("Invalid JSON", status_code=400)

    values = body.get("values", [])
    results = []

    for record in values:
        record_id = record["recordId"]
        text = record.get("data", {}).get("text", "")

        try:
            word_count = len(text.split()) if text else 0
            reading_time_minutes = round(word_count / 200, 1)  # avg 200 wpm

            results.append({
                "recordId": record_id,
                "data": {
                    "wordCount": word_count,
                    "readingTimeMinutes": reading_time_minutes
                },
                "errors": [],
                "warnings": []
            })
        except Exception as e:
            results.append({
                "recordId": record_id,
                "data": {},
                "errors": [{"message": str(e)}],
                "warnings": []
            })

    return func.HttpResponse(
        json.dumps({"values": results}),
        mimetype="application/json"
    )
```

```text
# requirements.txt
azure-functions
```

```json
// host.json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": { "isEnabled": true }
    }
  }
}
```

</TabItem>
<TabItem value="csharp" label="C# (Azure Function)">

```csharp
// CustomSkill.cs
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Text.Json;

public class CustomSkill
{
    [Function("custom-skill")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequestData req)
    {
        var body = await JsonSerializer.DeserializeAsync<SkillInput>(req.Body);
        var results = new List<SkillOutputRecord>();

        foreach (var record in body.Values)
        {
            var text = record.Data.Text ?? "";
            var wordCount = string.IsNullOrEmpty(text) ? 0 : text.Split(' ').Length;
            var readingTime = Math.Round(wordCount / 200.0, 1);

            results.Add(new SkillOutputRecord
            {
                RecordId = record.RecordId,
                Data = new OutputData { WordCount = wordCount, ReadingTimeMinutes = readingTime },
                Errors = new List<SkillMessage>(),
                Warnings = new List<SkillMessage>()
            });
        }

        var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new { values = results });
        return response;
    }
}

public record SkillInput(List<SkillInputRecord> Values);
public record SkillInputRecord(string RecordId, InputData Data);
public record InputData(string Text);
public record SkillOutputRecord
{
    public string RecordId { get; init; }
    public OutputData Data { get; init; }
    public List<SkillMessage> Errors { get; init; }
    public List<SkillMessage> Warnings { get; init; }
}
public record OutputData { public int WordCount { get; init; } public double ReadingTimeMinutes { get; init; } }
public record SkillMessage(string Message);
```

</TabItem>
</Tabs>

### Tarefa 2: Implantar a Azure Function

```bash
# Create Function App
FUNC_APP="func-customskill-$(openssl rand -hex 4)"
FUNC_STORAGE="stfunc$(openssl rand -hex 4)"

az storage account create \
  --name $FUNC_STORAGE \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS

az functionapp create \
  --name $FUNC_APP \
  --resource-group $RG \
  --storage-account $FUNC_STORAGE \
  --consumption-plan-location $LOCATION \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --os-type Linux

# Deploy the function (from the function project directory)
func azure functionapp publish $FUNC_APP

# Get the function URL with key
FUNC_URL=$(az functionapp function show \
  --resource-group $RG \
  --name $FUNC_APP \
  --function-name "custom-skill" \
  --query "invokeUrlTemplate" -o tsv)

FUNC_KEY=$(az functionapp function keys list \
  --resource-group $RG \
  --name $FUNC_APP \
  --function-name "custom-skill" \
  --query "default" -o tsv)

SKILL_URI="${FUNC_URL}?code=${FUNC_KEY}"
echo "Custom skill URI: $SKILL_URI"
```

### Tarefa 3: Testar o endpoint da skill customizada

```bash
# Test locally or against deployed function
curl -X POST "$SKILL_URI" \
  -H "Content-Type: application/json" \
  -d '{
    "values": [
      {
        "recordId": "test-1",
        "data": {
          "text": "Azure AI Search provides indexing and querying over content stored in various data sources. It supports AI enrichment through skillsets."
        }
      }
    ]
  }'
```

Resposta esperada:
```json
{
  "values": [
    {
      "recordId": "test-1",
      "data": {
        "wordCount": 23,
        "readingTimeMinutes": 0.1
      },
      "errors": [],
      "warnings": []
    }
  ]
}
```

### Tarefa 4: Integrar a skill customizada no skillset

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.search.documents.indexes.models import (
    SearchIndexerSkillset,
    WebApiSkill,
    InputFieldMappingEntry,
    OutputFieldMappingEntry,
)

custom_skill = WebApiSkill(
    name="word-count-skill",
    description="Calculates word count and reading time",
    context="/document",
    uri=SKILL_URI,
    http_method="POST",
    timeout="PT30S",
    batch_size=10,
    inputs=[
        InputFieldMappingEntry(name="text", source="/document/content")
    ],
    outputs=[
        OutputFieldMappingEntry(name="wordCount", target_name="wordCount"),
        OutputFieldMappingEntry(name="readingTimeMinutes", target_name="readingTime"),
    ]
)

# Add to existing skillset (alongside built-in skills from Challenge 40)
skillset = SearchIndexerSkillset(
    name="document-skillset",
    description="Enrichment with built-in and custom skills",
    skills=[key_phrase_skill, entity_skill, language_skill, custom_skill],
    cognitive_services_account=CognitiveServicesAccountKey(key=AI_KEY)
)

indexer_client.create_or_update_skillset(skillset)
print("Skillset updated with custom skill")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
var customSkill = new WebApiSkill(
    inputs: new[] { new InputFieldMappingEntry("text") { Source = "/document/content" } },
    outputs: new[]
    {
        new OutputFieldMappingEntry("wordCount") { TargetName = "wordCount" },
        new OutputFieldMappingEntry("readingTimeMinutes") { TargetName = "readingTime" }
    },
    uri: skillUri)
{
    Name = "word-count-skill",
    Description = "Calculates word count and reading time",
    Context = "/document",
    HttpMethod = "POST",
    Timeout = TimeSpan.FromSeconds(30),
    BatchSize = 10
};

// Add custom skill to the existing skills list
skills.Add(customSkill);
var skillset = new SearchIndexerSkillset("document-skillset", skills)
{
    CognitiveServicesAccount = new CognitiveServicesAccountKey(aiKey)
};

await indexerClient.CreateOrUpdateSkillsetAsync(skillset);
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Add custom Web API skill to skillset
curl -X PUT "https://${SEARCH_SERVICE}.search.windows.net/skillsets/document-skillset?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${SEARCH_KEY}" \
  -d '{
    "name": "document-skillset",
    "skills": [
      {
        "@odata.type": "#Microsoft.Skills.Custom.WebApiSkill",
        "name": "word-count-skill",
        "description": "Calculates word count and reading time",
        "context": "/document",
        "uri": "'"${SKILL_URI}"'",
        "httpMethod": "POST",
        "timeout": "PT30S",
        "batchSize": 10,
        "inputs": [
          {"name": "text", "source": "/document/content"}
        ],
        "outputs": [
          {"name": "wordCount", "targetName": "wordCount"},
          {"name": "readingTimeMinutes", "targetName": "readingTime"}
        ]
      }
    ]
  }'
```

</TabItem>
</Tabs>

### Tarefa 5: Atualizar o índice e re-executar o indexer

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.search.documents.indexes.models import SimpleField, SearchFieldDataType

# Add new fields to the index for custom skill output
index = index_client.get_index("documents-index")
index.fields.append(
    SimpleField(name="wordCount", type=SearchFieldDataType.Int32, filterable=True, sortable=True)
)
index.fields.append(
    SimpleField(name="readingTime", type=SearchFieldDataType.Double, filterable=True, sortable=True)
)
index_client.create_or_update_index(index)

# Update indexer output field mappings
indexer = indexer_client.get_indexer("document-indexer")
indexer.output_field_mappings.append(
    FieldMapping(source_field_name="/document/wordCount", target_field_name="wordCount")
)
indexer.output_field_mappings.append(
    FieldMapping(source_field_name="/document/readingTime", target_field_name="readingTime")
)
indexer_client.create_or_update_indexer(indexer)

# Reset and re-run
indexer_client.reset_indexer("document-indexer")
indexer_client.run_indexer("document-indexer")
print("Indexer reset and re-running with custom skill")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// Add fields to index
var index = await indexClient.GetIndexAsync("documents-index");
index.Value.Fields.Add(new SimpleField("wordCount", SearchFieldDataType.Int32) { IsFilterable = true, IsSortable = true });
index.Value.Fields.Add(new SimpleField("readingTime", SearchFieldDataType.Double) { IsFilterable = true, IsSortable = true });
await indexClient.CreateOrUpdateIndexAsync(index.Value);

// Update indexer output mappings
var indexer = await indexerClient.GetIndexerAsync("document-indexer");
indexer.Value.OutputFieldMappings.Add(new FieldMapping("/document/wordCount") { TargetFieldName = "wordCount" });
indexer.Value.OutputFieldMappings.Add(new FieldMapping("/document/readingTime") { TargetFieldName = "readingTime" });
await indexerClient.CreateOrUpdateIndexerAsync(indexer.Value);

// Reset and re-run
await indexerClient.ResetIndexerAsync("document-indexer");
await indexerClient.RunIndexerAsync("document-indexer");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Reset the indexer (forces full re-processing)
curl -X POST "https://${SEARCH_SERVICE}.search.windows.net/indexers/document-indexer/reset?api-version=2024-07-01" \
  -H "api-key: ${SEARCH_KEY}"

# Re-run the indexer
curl -X POST "https://${SEARCH_SERVICE}.search.windows.net/indexers/document-indexer/run?api-version=2024-07-01" \
  -H "api-key: ${SEARCH_KEY}"
```

</TabItem>
</Tabs>

## Saída Esperada

Após a re-indexação, os documentos devem conter os enriquecimentos da skill customizada:

```json
{
  "value": [
    {
      "id": "aHR0cHM6Ly9...",
      "content": "Azure AI services provide cloud-based AI capabilities...",
      "wordCount": 23,
      "readingTime": 0.1,
      "keyphrases": ["cloud-based AI capabilities", "cognitive services"]
    }
  ]
}
```

## Quebra & conserta

| # | Cenário | Sintoma | Causa Raiz | Correção |
|---|----------|---------|------------|-----|
| 1 | Function retorna 401 | Indexer mostra "Web API skill response was not valid" | A chave da Function na URI da skill está incorreta ou expirada | Regenere a chave da Function e atualize a URI da skill |
| 2 | Erros de timeout na skill | `WebApiSkillExecutionError` com mensagem de timeout | O cold start da Function excede o timeout padrão de 30s | Aumente o `timeout` para `PT230S` (máximo) ou use o plano Premium para evitar cold starts |
| 3 | Saída de enriquecimento vazia | Campos customizados estão nulos no índice, mas sem erros | O `targetName` na saída da skill não corresponde ao caminho source do outputFieldMapping | Garanta que `/document/{targetName}` nos outputFieldMappings corresponda exatamente ao `targetName` da saída da skill |
| 4 | Processamento em lote falha | Alguns registros funcionam, outros mostram erros | A Function não trata o array `values` — processa apenas o primeiro registro | Garanta que a Function itere TODOS os registros no array `values` e retorne o `recordId` correspondente para cada um |
| 5 | Erro de CORS/rede | "Unable to connect to custom skill endpoint" | O Function App tem restrições de IP ou isolamento de rede habilitado | Adicione os IPs de saída do serviço Search à lista de permissões do Function App, ou use Private Endpoint |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ai102-41-q1",
    question: "Sua skill de Web API customizada processa documentos, mas o indexer reporta erros para alguns registros. Qual é a causa MAIS PROVÁVEL se a função retorna HTTP 200 mas certos registros mostram erros?",
    options: [
      "O timeout do indexer foi excedido",
      "A função retornou HTTP 200, então nenhum registro pode ter erros",
      "A função retornou erros no array 'errors' para aqueles registros específicos",
      "A chave da função expirou durante o processamento"
    ],
    correctIndex: 2,
    explanation: "Uma skill customizada pode retornar HTTP 200 (sucesso) enquanto ainda reporta erros por registro no array 'errors' dentro da resposta de cada registro. Isso permite sucesso parcial onde alguns registros são enriquecidos com sucesso e outros reportam problemas."
  },
  {
    id: "ai102-41-q2",
    question: "Qual é o valor máximo de timeout que você pode definir para uma skill de Web API customizada?",
    options: [
      "60 segundos (PT60S)",
      "230 segundos (PT230S)",
      "300 segundos (PT5M)",
      "30 segundos (PT30S)"
    ],
    correctIndex: 1,
    explanation: "O timeout máximo para uma skill de Web API customizada é 230 segundos (PT230S). O padrão é 30 segundos. Se sua função requer processamento mais longo, considere otimizar o código ou usar padrões assíncronos."
  },
  {
    id: "ai102-41-q3",
    question: "Você quer que sua skill customizada processe 25 documentos por requisição para eficiência. Qual propriedade controla esse comportamento?",
    options: [
      "batchSize",
      "degreeOfParallelism",
      "maxBatchCount",
      "documentBatchSize"
    ],
    correctIndex: 0,
    explanation: "A propriedade 'batchSize' no WebApiSkill controla quantos registros são enviados em cada requisição ao seu endpoint. O padrão é 1 e o máximo é 1000. Tamanhos de lote maiores reduzem o overhead HTTP, mas requerem mais memória."
  },
  {
    id: "ai102-41-q4",
    question: "Uma skill customizada deve associar cada registro de entrada com sua saída correspondente. Qual campo os vincula?",
    options: [
      "documentId",
      "correlationId",
      "sourceId",
      "recordId"
    ],
    correctIndex: 3,
    explanation: "O campo 'recordId' é a chave de correlação. Cada registro de entrada tem um recordId, e a skill customizada deve retornar o mesmo recordId em sua saída para que o indexer possa associar os resultados de enriquecimento de volta ao documento correto."
  },
  {
    id: "ai102-41-q5",
    question: "Qual valor de @odata.type identifica uma skill de Web API customizada na definição JSON do skillset?",
    options: [
      "#Microsoft.Skills.Text.CustomSkill",
      "#Microsoft.Skills.Custom.WebApiSkill",
      "#Microsoft.Skills.Custom.AzureFunctionSkill",
      "#Microsoft.Skills.WebApi.CustomSkill"
    ],
    correctIndex: 1,
    explanation: "O tipo OData correto para uma skill de Web API customizada é '#Microsoft.Skills.Custom.WebApiSkill'. Isso se aplica independentemente de o endpoint ser uma Azure Function, App Service ou qualquer outro endpoint HTTP."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-search --yes --no-wait
```

## Saiba Mais

- [Custom skill interface](https://learn.microsoft.com/azure/search/cognitive-search-custom-skill-interface)
- [Custom Web API skill](https://learn.microsoft.com/azure/search/cognitive-search-custom-skill-web-api)
- [Azure Functions as custom skills](https://learn.microsoft.com/azure/search/cognitive-search-create-custom-skill-example)
- [Debug sessions for skillsets](https://learn.microsoft.com/azure/search/cognitive-search-debug-session)
