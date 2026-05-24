---
sidebar_position: 9
title: "Challenge 47: Azure Content Understanding — Multimodal Analysis"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 47: Azure Content Understanding — Multimodal Analysis

:::info Estimated Time
**45-60 min** | **Cost**: ~$1.50 (AI Services transactions) | **Domain**: Knowledge Mining & Extraction (15-20%)
:::

:::caution Service Status
Azure Content Understanding is a newer Azure AI capability. Check [documentation](https://learn.microsoft.com/azure/ai-services/content-understanding/) for the latest API versions and availability. This challenge uses REST API patterns aligned with the documented interface.
:::

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Create an Azure Content Understanding analyzer | High |
| Summarize and classify documents | High |
| Extract entities from documents | Medium |
| Extract tables and key-value pairs | Medium |
| Process images and extract structured data | Medium |

## Overview

Azure Content Understanding provides multimodal analysis capabilities that go beyond traditional OCR and Document Intelligence:

| Capability | Description |
|-----------|-------------|
| **Document summarization** | Generate concise summaries of long documents |
| **Document classification** | Classify documents into custom categories |
| **Entity extraction** | Extract custom entities with LLM understanding |
| **Table extraction** | Extract structured tables from documents |
| **Image analysis** | Understand and describe image content |
| **Multi-format support** | PDF, images, Office documents, audio, video |

### Key concepts
- **Analyzer**: A configured pipeline that defines what to extract from content
- **Field**: A specific piece of information to extract (with type and description)
- **Schema**: The expected output structure for the analyzer

## Prerequisites

- Azure subscription with Contributor role
- Azure AI Services resource (multi-service account) in a supported region
- Python 3.9+ with `requests` library (REST-based)
- .NET 8 with `HttpClient`
- Sample documents (PDF, images)

## Implementation

### Task 1: Create an Azure AI Services resource

```bash
RG="rg-ai102-content"
LOCATION="eastus"
AI_SERVICE="ai-content-$(openssl rand -hex 4)"

az group create --name $RG --location $LOCATION

# Create Azure AI Services (multi-service) resource
az cognitiveservices account create \
  --name $AI_SERVICE \
  --resource-group $RG \
  --location $LOCATION \
  --kind AIServices \
  --sku S0 \
  --yes

AI_ENDPOINT=$(az cognitiveservices account show \
  --name $AI_SERVICE --resource-group $RG \
  --query "properties.endpoint" -o tsv)

AI_KEY=$(az cognitiveservices account keys list \
  --name $AI_SERVICE --resource-group $RG \
  --query "key1" -o tsv)
```

### Task 2: Create a document analyzer with custom fields

<Tabs>
<TabItem value="python" label="Python (REST)">

```python
import requests
import json
import time

endpoint = AI_ENDPOINT.rstrip("/")
api_key = AI_KEY
api_version = "2024-12-01-preview"

# Create an analyzer for extracting invoice data
analyzer_definition = {
    "description": "Invoice analyzer with summarization and entity extraction",
    "scenario": "document",
    "fieldSchema": {
        "fields": {
            "Summary": {
                "type": "string",
                "description": "A brief summary of the document content"
            },
            "DocumentType": {
                "type": "string",
                "description": "The type of document (invoice, receipt, contract, etc.)"
            },
            "VendorName": {
                "type": "string",
                "description": "The name of the vendor or sender"
            },
            "TotalAmount": {
                "type": "number",
                "description": "The total monetary amount"
            },
            "Currency": {
                "type": "string",
                "description": "The currency code (USD, EUR, etc.)"
            },
            "KeyEntities": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "category": {"type": "string"}
                    }
                },
                "description": "Key entities mentioned in the document"
            }
        }
    }
}

# Create the analyzer
analyzer_id = "invoice-analyzer"
url = f"{endpoint}/contentunderstanding/analyzers/{analyzer_id}?api-version={api_version}"

response = requests.put(
    url,
    headers={
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "application/json"
    },
    json=analyzer_definition
)

if response.status_code in [200, 201]:
    print(f"Analyzer '{analyzer_id}' created successfully")
    print(json.dumps(response.json(), indent=2))
else:
    print(f"Error: {response.status_code} - {response.text}")
```

</TabItem>
<TabItem value="csharp" label="C# (REST)">

```csharp
using System.Net.Http;
using System.Text;
using System.Text.Json;

var httpClient = new HttpClient();
httpClient.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", aiKey);

var analyzerDefinition = new
{
    description = "Invoice analyzer with summarization and entity extraction",
    scenario = "document",
    fieldSchema = new
    {
        fields = new Dictionary<string, object>
        {
            ["Summary"] = new { type = "string", description = "A brief summary of the document content" },
            ["DocumentType"] = new { type = "string", description = "The type of document" },
            ["VendorName"] = new { type = "string", description = "The name of the vendor" },
            ["TotalAmount"] = new { type = "number", description = "The total monetary amount" },
            ["Currency"] = new { type = "string", description = "The currency code" }
        }
    }
};

var analyzerId = "invoice-analyzer";
var url = $"{aiEndpoint}/contentunderstanding/analyzers/{analyzerId}?api-version=2024-12-01-preview";

var content = new StringContent(JsonSerializer.Serialize(analyzerDefinition), Encoding.UTF8, "application/json");
var response = await httpClient.PutAsync(url, content);

Console.WriteLine($"Status: {response.StatusCode}");
var result = await response.Content.ReadAsStringAsync();
Console.WriteLine(result);
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create an analyzer
ANALYZER_ID="invoice-analyzer"

curl -X PUT "${AI_ENDPOINT}/contentunderstanding/analyzers/${ANALYZER_ID}?api-version=2024-12-01-preview" \
  -H "Ocp-Apim-Subscription-Key: ${AI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Invoice analyzer with summarization and entity extraction",
    "scenario": "document",
    "fieldSchema": {
      "fields": {
        "Summary": {
          "type": "string",
          "description": "A brief summary of the document content"
        },
        "DocumentType": {
          "type": "string",
          "description": "The type of document"
        },
        "VendorName": {
          "type": "string",
          "description": "The name of the vendor"
        },
        "TotalAmount": {
          "type": "number",
          "description": "The total monetary amount"
        },
        "Currency": {
          "type": "string",
          "description": "The currency code"
        }
      }
    }
  }'
```

</TabItem>
</Tabs>

### Task 3: Analyze a document

<Tabs>
<TabItem value="python" label="Python (REST)">

```python
# Submit document for analysis
analyze_url = f"{endpoint}/contentunderstanding/analyzers/{analyzer_id}:analyze?api-version={api_version}"

# Analyze from URL
analyze_request = {
    "url": "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf"
}

response = requests.post(
    analyze_url,
    headers={
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "application/json"
    },
    json=analyze_request
)

if response.status_code == 202:
    operation_url = response.headers["Operation-Location"]
    print(f"Analysis started. Polling: {operation_url}")

    # Poll for results
    while True:
        time.sleep(5)
        poll_response = requests.get(
            operation_url,
            headers={"Ocp-Apim-Subscription-Key": api_key}
        )
        status_data = poll_response.json()
        status = status_data.get("status", "unknown")
        print(f"  Status: {status}")

        if status == "succeeded":
            result = status_data.get("result", {})
            print("\n=== Analysis Results ===")
            contents = result.get("contents", [])
            for content in contents:
                fields = content.get("fields", {})
                for field_name, field_data in fields.items():
                    value = field_data.get("value", "N/A")
                    confidence = field_data.get("confidence", 0)
                    print(f"  {field_name}: {value} (confidence: {confidence:.2%})")
            break
        elif status == "failed":
            print(f"Analysis failed: {status_data}")
            break
else:
    print(f"Error: {response.status_code} - {response.text}")
```

</TabItem>
<TabItem value="csharp" label="C# (REST)">

```csharp
// Submit for analysis
var analyzeUrl = $"{aiEndpoint}/contentunderstanding/analyzers/{analyzerId}:analyze?api-version=2024-12-01-preview";

var analyzeRequest = new
{
    url = "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf"
};

var analyzeContent = new StringContent(JsonSerializer.Serialize(analyzeRequest), Encoding.UTF8, "application/json");
var analyzeResponse = await httpClient.PostAsync(analyzeUrl, analyzeContent);

if (analyzeResponse.StatusCode == System.Net.HttpStatusCode.Accepted)
{
    var operationUrl = analyzeResponse.Headers.GetValues("Operation-Location").First();

    // Poll for results
    while (true)
    {
        await Task.Delay(5000);
        var pollResponse = await httpClient.GetAsync(operationUrl);
        var pollResult = JsonSerializer.Deserialize<JsonElement>(
            await pollResponse.Content.ReadAsStringAsync());

        var status = pollResult.GetProperty("status").GetString();
        Console.WriteLine($"Status: {status}");

        if (status == "succeeded")
        {
            Console.WriteLine(pollResult.GetProperty("result").ToString());
            break;
        }
        if (status == "failed") break;
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Submit analysis
OPERATION_URL=$(curl -s -i -X POST \
  "${AI_ENDPOINT}/contentunderstanding/analyzers/${ANALYZER_ID}:analyze?api-version=2024-12-01-preview" \
  -H "Ocp-Apim-Subscription-Key: ${AI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf"
  }' | grep -i "operation-location" | cut -d' ' -f2 | tr -d '\r')

# Poll for results
sleep 10
curl -s "$OPERATION_URL" \
  -H "Ocp-Apim-Subscription-Key: ${AI_KEY}" | python -m json.tool
```

</TabItem>
</Tabs>

### Task 4: Create an image analyzer

<Tabs>
<TabItem value="python" label="Python (REST)">

```python
# Create analyzer for image content
image_analyzer = {
    "description": "Image content analyzer for product photos",
    "scenario": "image",
    "fieldSchema": {
        "fields": {
            "Description": {
                "type": "string",
                "description": "Detailed description of the image content"
            },
            "ObjectsDetected": {
                "type": "array",
                "items": {"type": "string"},
                "description": "List of objects visible in the image"
            },
            "DominantColors": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Dominant colors in the image"
            },
            "TextContent": {
                "type": "string",
                "description": "Any text visible in the image"
            }
        }
    }
}

img_analyzer_id = "image-analyzer"
url = f"{endpoint}/contentunderstanding/analyzers/{img_analyzer_id}?api-version={api_version}"

response = requests.put(
    url,
    headers={
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "application/json"
    },
    json=image_analyzer
)
print(f"Image analyzer created: {response.status_code}")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create image analyzer
curl -X PUT "${AI_ENDPOINT}/contentunderstanding/analyzers/image-analyzer?api-version=2024-12-01-preview" \
  -H "Ocp-Apim-Subscription-Key: ${AI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Image content analyzer",
    "scenario": "image",
    "fieldSchema": {
      "fields": {
        "Description": {"type": "string", "description": "Image description"},
        "ObjectsDetected": {"type": "array", "items": {"type": "string"}, "description": "Objects in image"},
        "TextContent": {"type": "string", "description": "Text visible in image"}
      }
    }
  }'
```

</TabItem>
</Tabs>

### Task 5: Manage analyzers (list, get, delete)

<Tabs>
<TabItem value="python" label="Python (REST)">

```python
# List all analyzers
list_url = f"{endpoint}/contentunderstanding/analyzers?api-version={api_version}"
response = requests.get(list_url, headers={"Ocp-Apim-Subscription-Key": api_key})
analyzers = response.json().get("value", [])
print("Analyzers:")
for a in analyzers:
    print(f"  - {a['analyzerId']}: {a.get('description', 'N/A')}")

# Get analyzer details
get_url = f"{endpoint}/contentunderstanding/analyzers/{analyzer_id}?api-version={api_version}"
response = requests.get(get_url, headers={"Ocp-Apim-Subscription-Key": api_key})
print(f"\nAnalyzer details: {json.dumps(response.json(), indent=2)}")

# Delete an analyzer
delete_url = f"{endpoint}/contentunderstanding/analyzers/{analyzer_id}?api-version={api_version}"
response = requests.delete(delete_url, headers={"Ocp-Apim-Subscription-Key": api_key})
print(f"Delete status: {response.status_code}")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# List analyzers
curl -s "${AI_ENDPOINT}/contentunderstanding/analyzers?api-version=2024-12-01-preview" \
  -H "Ocp-Apim-Subscription-Key: ${AI_KEY}" | python -m json.tool

# Delete analyzer
curl -X DELETE "${AI_ENDPOINT}/contentunderstanding/analyzers/invoice-analyzer?api-version=2024-12-01-preview" \
  -H "Ocp-Apim-Subscription-Key: ${AI_KEY}"
```

</TabItem>
</Tabs>

## Expected Output

```json
{
  "status": "succeeded",
  "result": {
    "contents": [
      {
        "fields": {
          "Summary": {
            "value": "Invoice #INV-001 from Contoso Ltd for consulting services totaling $3,800.00 USD, due February 15, 2024.",
            "confidence": 0.92
          },
          "DocumentType": {
            "value": "invoice",
            "confidence": 0.98
          },
          "VendorName": {
            "value": "Contoso Ltd",
            "confidence": 0.95
          },
          "TotalAmount": {
            "value": 3800.00,
            "confidence": 0.93
          },
          "Currency": {
            "value": "USD",
            "confidence": 0.97
          }
        }
      }
    ]
  }
}
```

## Break & fix

| # | Scenario | Symptom | Root Cause | Fix |
|---|----------|---------|------------|-----|
| 1 | Analyzer creation fails | HTTP 400 with schema validation error | Field type not valid (e.g., using "int" instead of "number") | Use supported types: string, number, boolean, array, object |
| 2 | Analysis returns low confidence | Fields extracted with < 50% confidence | Field description is too vague for the AI model | Write more specific field descriptions that guide the extraction |
| 3 | "Resource not found" on analysis | HTTP 404 | Analyzer ID misspelled or region doesn't support Content Understanding | Verify analyzer ID and check regional availability |
| 4 | Timeout on large documents | Operation never completes | Document exceeds size limits | Check file size limits; split large documents |
| 5 | Empty results for image | All fields return null | Using "document" scenario for image content | Use "image" scenario for image files |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ai102-47-q1",
    question: "You need to extract custom fields from documents where the schema changes per client. Which Azure service lets you define extraction fields with natural language descriptions?",
    options: [
      "Azure Document Intelligence prebuilt-layout model",
      "Azure Content Understanding with custom field schema",
      "Azure AI Search with built-in cognitive skills",
      "Azure OpenAI with structured output"
    ],
    correctIndex: 1,
    explanation: "Azure Content Understanding lets you define custom field schemas with natural language descriptions. The AI model uses these descriptions to understand what to extract, making it flexible for varying document formats without training."
  },
  {
    id: "ai102-47-q2",
    question: "What is the primary difference between Azure Content Understanding and Azure Document Intelligence for document processing?",
    options: [
      "Content Understanding only works with images; Document Intelligence only works with PDFs",
      "They are the same service with different names",
      "Content Understanding uses LLM-powered extraction with schema descriptions; Document Intelligence uses trained ML models with labeled data",
      "Content Understanding requires training; Document Intelligence does not"
    ],
    correctIndex: 2,
    explanation: "Content Understanding leverages LLM capabilities and natural language field descriptions for extraction (no training needed). Document Intelligence uses purpose-trained ML models, which provide high accuracy for specific document types but require training for custom scenarios."
  },
  {
    id: "ai102-47-q3",
    question: "You create a Content Understanding analyzer with scenario 'document'. A user submits an image file. What happens?",
    options: [
      "The image may be processed but results may be suboptimal — use the 'image' scenario for images",
      "The request fails with an unsupported format error",
      "The image is automatically converted to PDF first",
      "The analyzer ignores the scenario and processes any format identically"
    ],
    correctIndex: 0,
    explanation: "While Content Understanding can handle multiple formats, using the correct scenario (document vs image vs audio vs video) optimizes the analysis pipeline. Using 'document' for images may work but the 'image' scenario provides better results for image-specific content."
  },
  {
    id: "ai102-47-q4",
    question: "How does Content Understanding determine what data to extract from a document?",
    options: [
      "From pre-trained models that understand all document types",
      "From labeled training data provided during model creation",
      "From the file extension and MIME type",
      "From the natural language descriptions in the fieldSchema definition"
    ],
    correctIndex: 3,
    explanation: "Content Understanding uses the field descriptions you provide in the fieldSchema as instructions for the AI model. Clear, specific descriptions improve extraction accuracy. No training data or labeled samples are needed."
  },
  {
    id: "ai102-47-q5",
    question: "What HTTP status code indicates the analysis operation has been accepted and is processing asynchronously?",
    options: [
      "200 OK",
      "202 Accepted",
      "201 Created",
      "204 No Content"
    ],
    correctIndex: 1,
    explanation: "HTTP 202 Accepted indicates the request has been accepted for processing but is not yet complete. The response includes an Operation-Location header with the URL to poll for results. This is the standard async pattern for Azure AI services."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-content --yes --no-wait
```

## Learn More

- [Azure Content Understanding overview](https://learn.microsoft.com/azure/ai-services/content-understanding/overview)
- [Content Understanding quickstart](https://learn.microsoft.com/azure/ai-services/content-understanding/quickstart)
- [Analyzer concepts](https://learn.microsoft.com/azure/ai-services/content-understanding/concepts/analyzers)
- [Supported document formats](https://learn.microsoft.com/azure/ai-services/content-understanding/concepts/supported-formats)
