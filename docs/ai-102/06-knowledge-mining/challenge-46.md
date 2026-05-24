---
sidebar_position: 8
title: "Challenge 46: Custom Document Intelligence Models"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 46: Custom Document Intelligence Models

:::info Estimated Time
**60-90 min** | **Cost**: ~$2.00 (Document Intelligence S0 + custom model training) | **Domain**: Knowledge Mining & Extraction (15-20%)
:::

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Train a custom extraction model | High |
| Label training data for custom models | High |
| Evaluate custom model accuracy | Medium |
| Create a composed model from multiple custom models | High |
| Use custom models for inference | Medium |

## Overview

When prebuilt models don't match your document formats, custom models let you train extraction on YOUR specific documents. Azure Document Intelligence supports two custom model approaches:

| Model type | Training approach | When to use |
|-----------|-----------------|-------------|
| **Custom template** | Fixed layout, labeled fields | Forms with consistent structure (same layout every time) |
| **Custom neural** | Variable layout, machine learning | Documents with varied layouts (different vendor invoice formats) |

### Composed models

A **composed model** routes incoming documents to the correct sub-model automatically. For example, you might compose:
- Invoice Model A (for Vendor X layout)
- Invoice Model B (for Vendor Y layout)
- Invoice Model C (for Vendor Z layout)

The composed model classifies the document and routes to the appropriate sub-model.

### Training workflow
1. **Collect** 5+ sample documents (minimum 5 for template, 10+ for neural)
2. **Label** fields in Document Intelligence Studio
3. **Train** the model
4. **Test** with new documents
5. **Deploy** or compose with other models

## Prerequisites

- Completed Challenge 45 (Document Intelligence resource)
- Azure Storage Account with sample training documents
- Document Intelligence Studio access
- Python 3.9+ with `azure-ai-documentintelligence>=1.0.0`
- .NET 8 with `Azure.AI.DocumentIntelligence`

## Implementation

### Task 1: Prepare training data in Azure Storage

```bash
RG="rg-ai102-docintell"
STORAGE_ACCOUNT="stai102doctrain$(openssl rand -hex 4)"
CONTAINER="training-data"

# Create storage account for training data
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --location eastus \
  --sku Standard_LRS

# Create container
az storage container create \
  --name $CONTAINER \
  --account-name $STORAGE_ACCOUNT

# Enable CORS for Document Intelligence Studio
az storage cors add \
  --services b \
  --methods GET PUT OPTIONS POST \
  --origins "https://documentintelligence.ai.azure.com" \
  --allowed-headers "*" \
  --exposed-headers "*" \
  --max-age 200 \
  --account-name $STORAGE_ACCOUNT

# Upload sample training documents (at least 5)
# In practice, upload your actual business documents here
for i in {1..6}; do
  echo "PurchaseOrder #PO-${i}001
Vendor: Contoso Supplies Inc.
Date: 2024-0${i}-15
Item: Widget Model ${i}
Quantity: ${i}0
Unit Price: \$${i}5.00
Total: \$${i}50.00
Ship To: 123 Main St, Seattle WA 98101" > "po-sample-${i}.txt"
  
  az storage blob upload \
    --account-name $STORAGE_ACCOUNT \
    --container-name $CONTAINER \
    --name "po-sample-${i}.txt" \
    --file "po-sample-${i}.txt"
done

# Get SAS URL for Document Intelligence Studio
EXPIRY=$(date -u -d "1 day" '+%Y-%m-%dT%H:%MZ')
SAS_URL=$(az storage container generate-sas \
  --account-name $STORAGE_ACCOUNT \
  --name $CONTAINER \
  --permissions rl \
  --expiry $EXPIRY \
  --https-only \
  -o tsv)

echo "Training data URL: https://${STORAGE_ACCOUNT}.blob.core.windows.net/${CONTAINER}?${SAS_URL}"
```

### Task 2: Build and train a custom model

:::tip Studio vs API
Training with labeled data is most easily done in [Document Intelligence Studio](https://documentintelligence.ai.azure.com). The Studio provides a visual labeling interface. The API below shows programmatic model building for automation.
:::

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceAdministrationClient
from azure.ai.documentintelligence.models import (
    BuildDocumentModelRequest,
    AzureBlobContentSource,
    DocumentBuildMode,
)

admin_client = DocumentIntelligenceAdministrationClient(
    endpoint=DOC_ENDPOINT,
    credential=AzureKeyCredential(DOC_KEY)
)

# Build custom model from labeled training data
# Note: Labels (.ocr.json and .labels.json) must exist in the container
# These are created by Document Intelligence Studio during labeling
poller = admin_client.begin_build_document_model(
    BuildDocumentModelRequest(
        model_id="purchase-order-model",
        description="Custom model for Contoso purchase orders",
        build_mode=DocumentBuildMode.TEMPLATE,
        azure_blob_source=AzureBlobContentSource(
            container_url=f"https://{STORAGE_ACCOUNT}.blob.core.windows.net/{CONTAINER}?{SAS_URL}"
        )
    )
)

model = poller.result()
print(f"Model ID: {model.model_id}")
print(f"Status: {model.status}")
print(f"Created: {model.created_date_time}")
print(f"Doc types: {list(model.doc_types.keys())}")

# Show field schema
for doc_type, doc_type_info in model.doc_types.items():
    print(f"\nDocument type: {doc_type}")
    for field_name, field_info in doc_type_info.field_schema.items():
        print(f"  {field_name}: {field_info['type']} (confidence: {doc_type_info.field_confidence.get(field_name, 'N/A')})")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.AI.DocumentIntelligence;

var adminClient = new DocumentIntelligenceAdministrationClient(
    new Uri(docEndpoint),
    new AzureKeyCredential(docKey));

// Build custom model
var buildRequest = new BuildDocumentModelContent(
    modelId: "purchase-order-model",
    buildMode: DocumentBuildMode.Template)
{
    Description = "Custom model for Contoso purchase orders",
    AzureBlobSource = new AzureBlobContentSource(
        new Uri($"https://{storageAccount}.blob.core.windows.net/{container}?{sasUrl}"))
};

var operation = await adminClient.BuildDocumentModelAsync(
    WaitUntil.Completed, buildRequest);
var model = operation.Value;

Console.WriteLine($"Model ID: {model.ModelId}");
Console.WriteLine($"Created: {model.CreatedDateTime}");

foreach (var docType in model.DocTypes)
{
    Console.WriteLine($"\nDoc type: {docType.Key}");
    foreach (var field in docType.Value.FieldSchema)
    {
        Console.WriteLine($"  {field.Key}: {field.Value.Type}");
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Build custom model
curl -s -i -X POST \
  "${DOC_ENDPOINT}/documentintelligence/documentModels:build?api-version=2024-11-30" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" \
  -d '{
    "modelId": "purchase-order-model",
    "description": "Custom model for Contoso purchase orders",
    "buildMode": "template",
    "azureBlobSource": {
      "containerUrl": "https://'"${STORAGE_ACCOUNT}"'.blob.core.windows.net/'"${CONTAINER}"'?'"${SAS_URL}"'"
    }
  }'

# Check model status (get operation-location from response header)
# curl -s "$OPERATION_LOCATION" -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}"

# List models
curl -s "${DOC_ENDPOINT}/documentintelligence/documentModels?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" | python -m json.tool
```

</TabItem>
</Tabs>

### Task 3: Test the custom model

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest

client = DocumentIntelligenceClient(
    endpoint=DOC_ENDPOINT,
    credential=AzureKeyCredential(DOC_KEY)
)

# Analyze a new document with the custom model
test_url = f"https://{STORAGE_ACCOUNT}.blob.core.windows.net/{CONTAINER}/po-sample-1.txt?{SAS_URL}"

poller = client.begin_analyze_document(
    "purchase-order-model",
    AnalyzeDocumentRequest(url_source=test_url)
)
result = poller.result()

for document in result.documents:
    print(f"Document type: {document.doc_type}")
    print(f"Confidence: {document.confidence:.2%}")
    for field_name, field in document.fields.items():
        print(f"  {field_name}: {field.content} (confidence: {field.confidence:.2%})")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
var analysisClient = new DocumentIntelligenceClient(
    new Uri(docEndpoint), new AzureKeyCredential(docKey));

var testOp = await analysisClient.AnalyzeDocumentAsync(
    WaitUntil.Completed,
    "purchase-order-model",
    new AnalyzeDocumentContent() { UrlSource = new Uri(testUrl) });

var testResult = testOp.Value;
foreach (var doc in testResult.Documents)
{
    Console.WriteLine($"Type: {doc.DocType} (confidence: {doc.Confidence:P2})");
    foreach (var (name, field) in doc.Fields)
    {
        Console.WriteLine($"  {name}: {field.Content} ({field.Confidence:P2})");
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Test custom model
curl -s -i -X POST \
  "${DOC_ENDPOINT}/documentintelligence/documentModels/purchase-order-model:analyze?api-version=2024-11-30" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" \
  -d '{"urlSource": "'"${TEST_URL}"'"}'
```

</TabItem>
</Tabs>

### Task 4: Create a composed model

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.ai.documentintelligence.models import (
    ComposeDocumentModelRequest,
    DocumentTypeDetails,
)

# Compose multiple custom models into one
# The composed model auto-classifies and routes to the correct sub-model
poller = admin_client.begin_compose_model(
    ComposeDocumentModelRequest(
        model_id="composed-documents-model",
        description="Composed model routing purchase orders and invoices",
        component_models=[
            {"model_id": "purchase-order-model"},
            {"model_id": "invoice-custom-model"},  # assume this exists
        ]
    )
)

composed_model = poller.result()
print(f"Composed model ID: {composed_model.model_id}")
print(f"Component models: {len(composed_model.doc_types)} document types")
for doc_type in composed_model.doc_types:
    print(f"  - {doc_type}")

# Use the composed model â€” it auto-classifies the document
poller = client.begin_analyze_document(
    "composed-documents-model",
    AnalyzeDocumentRequest(url_source=test_url)
)
result = poller.result()
for document in result.documents:
    print(f"Classified as: {document.doc_type} (confidence: {document.confidence:.2%})")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// Compose models
var composeRequest = new ComposeDocumentModelContent(
    modelId: "composed-documents-model",
    componentModels: new[]
    {
        new ComponentDocumentModelDetails("purchase-order-model"),
        new ComponentDocumentModelDetails("invoice-custom-model")
    })
{
    Description = "Composed model for POs and invoices"
};

var composeOp = await adminClient.ComposeModelAsync(WaitUntil.Completed, composeRequest);
var composed = composeOp.Value;
Console.WriteLine($"Composed model: {composed.ModelId}");
Console.WriteLine($"Doc types: {composed.DocTypes.Count}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Compose model
curl -s -i -X POST \
  "${DOC_ENDPOINT}/documentintelligence/documentModels:compose?api-version=2024-11-30" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" \
  -d '{
    "modelId": "composed-documents-model",
    "description": "Composed model for POs and invoices",
    "componentModels": [
      {"modelId": "purchase-order-model"},
      {"modelId": "invoice-custom-model"}
    ]
  }'
```

</TabItem>
</Tabs>

### Task 5: Model management â€” list, get, delete

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# List all models
models = admin_client.list_models()
for model in models:
    print(f"  {model.model_id} | Created: {model.created_date_time} | Status: {model.status}")

# Get model details
model_info = admin_client.get_model("purchase-order-model")
print(f"\nModel: {model_info.model_id}")
print(f"  Description: {model_info.description}")
print(f"  Build mode: {model_info.build_mode}")
print(f"  Training documents: {model_info.training_documents_count if hasattr(model_info, 'training_documents_count') else 'N/A'}")

# Delete a model
admin_client.delete_model("purchase-order-model")
print("Model deleted")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// List models
await foreach (var m in adminClient.GetModelsAsync())
{
    Console.WriteLine($"  {m.ModelId} | {m.CreatedDateTime}");
}

// Get model details
var details = await adminClient.GetModelAsync("purchase-order-model");
Console.WriteLine($"Model: {details.Value.ModelId}");

// Delete model
await adminClient.DeleteModelAsync("purchase-order-model");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# List models
curl -s "${DOC_ENDPOINT}/documentintelligence/documentModels?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" | python -m json.tool

# Delete model
curl -s -X DELETE \
  "${DOC_ENDPOINT}/documentintelligence/documentModels/purchase-order-model?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}"
```

</TabItem>
</Tabs>

## Expected Output

```text
Model ID: purchase-order-model
Status: ready
Created: 2024-03-15T10:30:00Z
Doc types: ['purchase-order-model']

Document type: purchase-order-model
  PurchaseOrderNumber: string (confidence: 0.95)
  VendorName: string (confidence: 0.92)
  OrderDate: date (confidence: 0.90)
  ItemDescription: string (confidence: 0.88)
  Quantity: number (confidence: 0.91)
  UnitPrice: number (confidence: 0.89)
  Total: number (confidence: 0.93)
```

## Break & fix

| # | Scenario | Symptom | Root Cause | Fix |
|---|----------|---------|------------|-----|
| 1 | Training fails with "Not enough documents" | Build operation fails | Template models need 5+ labeled documents; neural needs 10+ | Add more training samples with consistent labeling |
| 2 | Model classification wrong in composed model | Document routed to wrong sub-model | Training data between sub-models is too similar or labels overlap | Ensure distinct document layouts; add more diverse training samples |
| 3 | Custom model returns no fields | Analyze succeeds but `fields` is empty | Test document layout differs significantly from training data | Use neural build mode for variable layouts, or add similar document layouts to training set |
| 4 | CORS error in Document Intelligence Studio | Cannot access training data from Studio | CORS not configured on storage account for Studio domain | Add CORS rule for `https://documentintelligence.ai.azure.com` |
| 5 | SAS token expired | 403 error when building model | SAS URL used for container has expired | Generate a new SAS token with sufficient expiry time |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ai102-46-q1",
    question: "You receive invoices from 5 different vendors, each with a completely different layout. Which custom model build mode is most appropriate?",
    options: [
      "Template (custom template model)",
      "Composed model with 5 template models",
      "Prebuilt invoice model",
      "Neural (custom neural model)"
    ],
    correctIndex: 3,
    explanation: "Custom neural models handle variable layouts and can learn field extraction across different document structures. Template models require fixed layouts. While a composed model with 5 template models would work, neural is simpler and handles cross-layout variation natively."
  },
  {
    id: "ai102-46-q2",
    question: "What is the minimum number of training documents required for a custom template model?",
    options: [
      "1 document",
      "5 documents",
      "10 documents",
      "50 documents"
    ],
    correctIndex: 1,
    explanation: "Custom template models require a minimum of 5 labeled training documents. In practice, more documents (especially representing layout variations) improve accuracy. Neural models need at least 10 documents."
  },
  {
    id: "ai102-46-q3",
    question: "You have separate custom models for purchase orders, invoices, and receipts. You want a single endpoint that auto-classifies and extracts. What should you create?",
    options: [
      "A new neural model trained on all document types",
      "Three separate endpoints with a custom classifier in front",
      "A composed model combining all three custom models",
      "A single template model with all field labels from all types"
    ],
    correctIndex: 2,
    explanation: "A composed model combines multiple custom models into one. It automatically classifies the incoming document and routes it to the correct sub-model for extraction. This provides a single API endpoint for multiple document types."
  },
  {
    id: "ai102-46-q4",
    question: "During custom model training, where do you perform field labeling?",
    options: [
      "Document Intelligence Studio (web interface)",
      "Azure CLI with az cognitiveservices label command",
      "Directly in the JSON manifest file only",
      "Azure Portal Document Intelligence blade"
    ],
    correctIndex: 0,
    explanation: "Document Intelligence Studio (documentintelligence.ai.azure.com) provides a visual labeling interface where you draw bounding boxes and assign field names to regions in your documents. The labels are stored as JSON files alongside your training data."
  },
  {
    id: "ai102-46-q5",
    question: "What is the maximum number of custom models that can be composed into a single composed model?",
    options: [
      "10 models",
      "50 models",
      "500 models",
      "200 models"
    ],
    correctIndex: 3,
    explanation: "A single composed model can contain up to 200 component models. This allows for comprehensive document processing pipelines that route many different document types through a single API call."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-docintell --yes --no-wait
# Also remove local sample files
rm -f po-sample-*.txt
```

## Learn More

- [Custom models overview](https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-custom)
- [Build a custom model](https://learn.microsoft.com/azure/ai-services/document-intelligence/how-to-guides/build-a-custom-model)
- [Composed models](https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-composed-models)
- [Document Intelligence Studio](https://documentintelligence.ai.azure.com)
- [Training data requirements](https://learn.microsoft.com/azure/ai-services/document-intelligence/how-to-guides/build-a-custom-model#training-data-tips)
