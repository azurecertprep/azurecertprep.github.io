---
sidebar_position: 3
title: "Challenge 41: Custom Skills in Azure AI Search"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 41: Custom Skills in Azure AI Search

:::info Estimated Time
**60-90 min** | **Cost**: ~$0.50 (Free tier Search + Function App consumption) | **Domain**: Information Extraction Solutions (15-20%)
:::

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Implement a custom skill for Azure AI Search | High |
| Design the custom skill input/output contract | High |
| Integrate a custom skill into a skillset | High |
| Deploy an Azure Function for custom skill processing | Medium |

## Overview

While built-in skills cover common scenarios (entity recognition, key phrases, OCR), custom skills let you add any processing logic to the enrichment pipeline. A custom skill is a Web API endpoint (typically an Azure Function) that conforms to the **custom skill interface contract**.

### Custom Skill Contract

The custom Web API skill expects:
- **Input**: JSON with a `values` array, each containing a `recordId` and `data` object
- **Output**: JSON with a `values` array, each containing `recordId`, `data` (enriched results), `errors`, and `warnings`

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

## Prerequisites

- Completed Challenge 40 (or equivalent AI Search setup)
- Azure Functions Core Tools v4
- Python 3.9+ or .NET 8 SDK
- `azure-search-documents>=11.4.0`

## Implementation

### Task 1: Create the Azure Function (Custom Skill)

The function extracts custom metadata — in this example, word count and reading time.

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

### Task 2: Deploy the Azure Function

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

### Task 3: Test the custom skill endpoint

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

Expected response:
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

### Task 4: Integrate custom skill into the skillset

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

### Task 5: Update the index and re-run the indexer

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

## Expected Output

After re-indexing, documents should contain custom skill enrichments:

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

## Break & fix

| # | Scenario | Symptom | Root Cause | Fix |
|---|----------|---------|------------|-----|
| 1 | Function returns 401 | Indexer shows "Web API skill response was not valid" | Function key in skill URI is incorrect or expired | Regenerate function key and update the skill URI |
| 2 | Skill timeout errors | `WebApiSkillExecutionError` with timeout message | Function cold start exceeds default 30s timeout | Increase `timeout` to `PT230S` (max) or use Premium plan to avoid cold starts |
| 3 | Enrichment output is empty | Custom fields are null in index, but no errors | `targetName` in skill output doesn't match the outputFieldMapping source path | Ensure `/document/{targetName}` in outputFieldMappings matches skill output `targetName` exactly |
| 4 | Batch processing fails | Some records succeed, others show errors | Function doesn't handle the `values` array — processes only first record | Ensure function iterates ALL records in `values` array and returns matching `recordId` for each |
| 5 | CORS/network error | "Unable to connect to custom skill endpoint" | Function App has IP restrictions or network isolation enabled | Add Search service outbound IPs to Function App allowed list, or use Private Endpoint |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ai102-41-q1",
    question: "Your custom Web API skill processes documents but the indexer reports errors for some records. What is the MOST LIKELY cause if the function returns HTTP 200 but certain records show errors?",
    options: [
      "The indexer timeout was exceeded",
      "The function returned HTTP 200 so no records can have errors",
      "The function returned errors in the 'errors' array for those specific records",
      "The function key expired during processing"
    ],
    correctIndex: 2,
    explanation: "A custom skill can return HTTP 200 (success) while still reporting per-record errors in the 'errors' array within each record's response. This allows partial success where some records enrich successfully and others report issues."
  },
  {
    id: "ai102-41-q2",
    question: "What is the maximum timeout value you can set for a custom Web API skill?",
    options: [
      "60 seconds (PT60S)",
      "230 seconds (PT230S)",
      "300 seconds (PT5M)",
      "30 seconds (PT30S)"
    ],
    correctIndex: 1,
    explanation: "The maximum timeout for a custom Web API skill is 230 seconds (PT230S). The default is 30 seconds. If your function requires longer processing, consider optimizing the code or using async patterns."
  },
  {
    id: "ai102-41-q3",
    question: "You want your custom skill to process 25 documents per request for efficiency. Which property controls this behavior?",
    options: [
      "batchSize",
      "degreeOfParallelism",
      "maxBatchCount",
      "documentBatchSize"
    ],
    correctIndex: 0,
    explanation: "The 'batchSize' property on the WebApiSkill controls how many records are sent in each request to your endpoint. The default is 1 and the maximum is 1000. Larger batch sizes reduce HTTP overhead but require more memory."
  },
  {
    id: "ai102-41-q4",
    question: "A custom skill must match each input record with its corresponding output. What field links them together?",
    options: [
      "documentId",
      "correlationId",
      "sourceId",
      "recordId"
    ],
    correctIndex: 3,
    explanation: "The 'recordId' field is the correlation key. Each input record has a recordId, and the custom skill must return the same recordId in its output so the indexer can match enrichment results back to the correct document."
  },
  {
    id: "ai102-41-q5",
    question: "Which @odata.type value identifies a custom Web API skill in the skillset JSON definition?",
    options: [
      "#Microsoft.Skills.Text.CustomSkill",
      "#Microsoft.Skills.Custom.WebApiSkill",
      "#Microsoft.Skills.Custom.AzureFunctionSkill",
      "#Microsoft.Skills.WebApi.CustomSkill"
    ],
    correctIndex: 1,
    explanation: "The correct OData type for a custom Web API skill is '#Microsoft.Skills.Custom.WebApiSkill'. This applies regardless of whether the endpoint is an Azure Function, App Service, or any other HTTP endpoint."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-search --yes --no-wait
```

## Learn More

- [Custom skill interface](https://learn.microsoft.com/azure/search/cognitive-search-custom-skill-interface)
- [Custom Web API skill](https://learn.microsoft.com/azure/search/cognitive-search-custom-skill-web-api)
- [Azure Functions as custom skills](https://learn.microsoft.com/azure/search/cognitive-search-create-custom-skill-example)
- [Debug sessions for skillsets](https://learn.microsoft.com/azure/search/cognitive-search-debug-session)
