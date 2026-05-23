---
sidebar_position: 7
title: "Challenge 45: Azure Document Intelligence — Prebuilt Models"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 45: Azure Document Intelligence — Prebuilt Models

:::info Estimated Time
**45-60 min** | **Cost**: ~$1.00 (Document Intelligence S0 tier + transactions) | **Domain**: Knowledge Mining & Extraction (15-20%)
:::

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Provision Azure AI Document Intelligence | High |
| Use prebuilt models to extract data from documents | High |
| Select the appropriate prebuilt model for a scenario | High |
| Handle confidence scores and extracted fields | Medium |
| Use the layout model for structure extraction | Medium |

## Overview

Azure AI Document Intelligence (formerly Form Recognizer) uses machine learning to extract structured data from documents. Prebuilt models are pre-trained for common document types:

| Model | Use case | Key fields extracted |
|-------|----------|-------------------|
| `prebuilt-invoice` | Invoices | VendorName, InvoiceTotal, DueDate, LineItems |
| `prebuilt-receipt` | Receipts | MerchantName, Total, TransactionDate, Items |
| `prebuilt-idDocument` | IDs/Passports | FirstName, LastName, DateOfBirth, DocumentNumber |
| `prebuilt-businessCard` | Business cards | ContactNames, Emails, PhoneNumbers |
| `prebuilt-tax.us.w2` | US W-2 forms | Employee, Employer, WagesTips, FederalIncomeTax |
| `prebuilt-layout` | Any document | Pages, Tables, Paragraphs, SelectionMarks |
| `prebuilt-read` | Any document | Text lines, words, languages |

## Prerequisites

- Azure subscription with Contributor role
- Azure CLI 2.60+
- Python 3.9+ with `azure-ai-documentintelligence>=1.0.0`
- .NET 8 with `Azure.AI.DocumentIntelligence`
- Sample documents (invoice PDF, receipt image)

## Implementation

### Task 1: Provision Azure Document Intelligence

```bash
RG="rg-ai102-docintell"
LOCATION="eastus"
DOC_INTEL="docintell-ai102-$(openssl rand -hex 4)"

az group create --name $RG --location $LOCATION

# Create Document Intelligence resource
az cognitiveservices account create \
  --name $DOC_INTEL \
  --resource-group $RG \
  --location $LOCATION \
  --kind FormRecognizer \
  --sku S0 \
  --yes

# Get endpoint and key
DOC_ENDPOINT=$(az cognitiveservices account show \
  --name $DOC_INTEL --resource-group $RG \
  --query "properties.endpoint" -o tsv)

DOC_KEY=$(az cognitiveservices account keys list \
  --name $DOC_INTEL --resource-group $RG \
  --query "key1" -o tsv)

echo "Endpoint: $DOC_ENDPOINT"
```

### Task 2: Analyze an invoice with prebuilt model

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest

credential = AzureKeyCredential(DOC_KEY)
client = DocumentIntelligenceClient(endpoint=DOC_ENDPOINT, credential=credential)

# Analyze invoice from URL
invoice_url = "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf"

poller = client.begin_analyze_document(
    "prebuilt-invoice",
    AnalyzeDocumentRequest(url_source=invoice_url)
)
result = poller.result()

# Extract invoice fields
for document in result.documents:
    print(f"Document type: {document.doc_type}")
    print(f"Confidence: {document.confidence:.2%}")

    fields = document.fields
    if fields.get("VendorName"):
        print(f"  Vendor: {fields['VendorName'].value_string} (confidence: {fields['VendorName'].confidence:.2%})")
    if fields.get("InvoiceTotal"):
        total = fields["InvoiceTotal"]
        print(f"  Total: {total.value_currency.amount} {total.value_currency.currency_code} (confidence: {total.confidence:.2%})")
    if fields.get("InvoiceDate"):
        print(f"  Date: {fields['InvoiceDate'].value_date} (confidence: {fields['InvoiceDate'].confidence:.2%})")
    if fields.get("DueDate"):
        print(f"  Due: {fields['DueDate'].value_date}")

    # Line items
    if fields.get("Items"):
        print(f"\n  Line Items ({len(fields['Items'].value_list)} items):")
        for i, item in enumerate(fields["Items"].value_list):
            item_fields = item.value_object
            desc = item_fields.get("Description", {})
            amount = item_fields.get("Amount", {})
            print(f"    {i+1}. {desc.value_string if desc else 'N/A'} — ${amount.value_currency.amount if amount else 'N/A'}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.DocumentIntelligence;

var client = new DocumentIntelligenceClient(
    new Uri(docEndpoint),
    new AzureKeyCredential(docKey));

var invoiceUrl = new Uri("https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf");

var operation = await client.AnalyzeDocumentAsync(
    WaitUntil.Completed,
    "prebuilt-invoice",
    new AnalyzeDocumentContent() { UrlSource = invoiceUrl });

var result = operation.Value;

foreach (var document in result.Documents)
{
    Console.WriteLine($"Document type: {document.DocType}");
    Console.WriteLine($"Confidence: {document.Confidence:P2}");

    if (document.Fields.TryGetValue("VendorName", out var vendor))
        Console.WriteLine($"  Vendor: {vendor.ValueString} ({vendor.Confidence:P2})");

    if (document.Fields.TryGetValue("InvoiceTotal", out var total))
        Console.WriteLine($"  Total: {total.ValueCurrency.Amount} {total.ValueCurrency.CurrencyCode}");

    if (document.Fields.TryGetValue("Items", out var items))
    {
        Console.WriteLine($"\n  Line Items ({items.ValueList.Count}):");
        foreach (var item in items.ValueList)
        {
            var desc = item.ValueObject.GetValueOrDefault("Description")?.ValueString ?? "N/A";
            var amount = item.ValueObject.GetValueOrDefault("Amount")?.ValueCurrency?.Amount;
            Console.WriteLine($"    - {desc}: ${amount}");
        }
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Submit invoice for analysis
OPERATION_URL=$(curl -s -i -X POST \
  "${DOC_ENDPOINT}/documentintelligence/documentModels/prebuilt-invoice:analyze?api-version=2024-11-30" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" \
  -d '{"urlSource": "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf"}' \
  | grep -i "operation-location" | cut -d' ' -f2 | tr -d '\r')

echo "Operation URL: $OPERATION_URL"

# Poll for results (wait a few seconds)
sleep 10
curl -s "$OPERATION_URL" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" | python -m json.tool
```

</TabItem>
</Tabs>

### Task 3: Extract ID document information

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Analyze ID document (driver's license, passport, etc.)
id_url = "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/id_documents/license.jpg"

poller = client.begin_analyze_document(
    "prebuilt-idDocument",
    AnalyzeDocumentRequest(url_source=id_url)
)
result = poller.result()

for document in result.documents:
    fields = document.fields
    print(f"Document type: {document.doc_type}")  # e.g., "idDocument.driverLicense"

    if fields.get("FirstName"):
        print(f"  First Name: {fields['FirstName'].value_string}")
    if fields.get("LastName"):
        print(f"  Last Name: {fields['LastName'].value_string}")
    if fields.get("DateOfBirth"):
        print(f"  DOB: {fields['DateOfBirth'].value_date}")
    if fields.get("DocumentNumber"):
        print(f"  Document #: {fields['DocumentNumber'].value_string}")
    if fields.get("DateOfExpiration"):
        print(f"  Expires: {fields['DateOfExpiration'].value_date}")
    if fields.get("Address"):
        print(f"  Address: {fields['Address'].value_address}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
var idUrl = new Uri("https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/id_documents/license.jpg");

var idOp = await client.AnalyzeDocumentAsync(
    WaitUntil.Completed,
    "prebuilt-idDocument",
    new AnalyzeDocumentContent() { UrlSource = idUrl });

var idResult = idOp.Value;
foreach (var doc in idResult.Documents)
{
    Console.WriteLine($"Type: {doc.DocType}");
    if (doc.Fields.TryGetValue("FirstName", out var first))
        Console.WriteLine($"  First Name: {first.ValueString}");
    if (doc.Fields.TryGetValue("LastName", out var last))
        Console.WriteLine($"  Last Name: {last.ValueString}");
    if (doc.Fields.TryGetValue("DateOfBirth", out var dob))
        Console.WriteLine($"  DOB: {dob.ValueDate}");
    if (doc.Fields.TryGetValue("DocumentNumber", out var docNum))
        Console.WriteLine($"  Document #: {docNum.ValueString}");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Analyze ID document
OPERATION_URL=$(curl -s -i -X POST \
  "${DOC_ENDPOINT}/documentintelligence/documentModels/prebuilt-idDocument:analyze?api-version=2024-11-30" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" \
  -d '{"urlSource": "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/id_documents/license.jpg"}' \
  | grep -i "operation-location" | cut -d' ' -f2 | tr -d '\r')

sleep 10
curl -s "$OPERATION_URL" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" | python -m json.tool
```

</TabItem>
</Tabs>

### Task 4: Use the Layout model for tables and structure

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Layout model extracts structure: pages, tables, paragraphs, selection marks
layout_url = "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf"

poller = client.begin_analyze_document(
    "prebuilt-layout",
    AnalyzeDocumentRequest(url_source=layout_url)
)
result = poller.result()

# Extract page information
for page in result.pages:
    print(f"Page {page.page_number}: {page.width}x{page.height} ({page.unit})")
    print(f"  Lines: {len(page.lines)}")
    print(f"  Words: {len(page.words)}")

# Extract tables
if result.tables:
    for table_idx, table in enumerate(result.tables):
        print(f"\nTable {table_idx + 1}: {table.row_count} rows x {table.column_count} cols")
        for cell in table.cells:
            print(f"  [{cell.row_index},{cell.column_index}] = {cell.content}")

# Extract paragraphs
if result.paragraphs:
    print(f"\nParagraphs: {len(result.paragraphs)}")
    for para in result.paragraphs[:5]:
        print(f"  Role: {para.role or 'body'} | {para.content[:60]}...")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
var layoutOp = await client.AnalyzeDocumentAsync(
    WaitUntil.Completed,
    "prebuilt-layout",
    new AnalyzeDocumentContent() { UrlSource = new Uri(layoutUrl) });

var layoutResult = layoutOp.Value;

// Pages
foreach (var page in layoutResult.Pages)
{
    Console.WriteLine($"Page {page.PageNumber}: {page.Width}x{page.Height} ({page.Unit})");
    Console.WriteLine($"  Lines: {page.Lines.Count}, Words: {page.Words.Count}");
}

// Tables
foreach (var table in layoutResult.Tables)
{
    Console.WriteLine($"\nTable: {table.RowCount} rows x {table.ColumnCount} cols");
    foreach (var cell in table.Cells)
    {
        Console.WriteLine($"  [{cell.RowIndex},{cell.ColumnIndex}] = {cell.Content}");
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Layout analysis
OPERATION_URL=$(curl -s -i -X POST \
  "${DOC_ENDPOINT}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" \
  -d '{"urlSource": "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf"}' \
  | grep -i "operation-location" | cut -d' ' -f2 | tr -d '\r')

sleep 10
curl -s "$OPERATION_URL" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" | python -m json.tool
```

</TabItem>
</Tabs>

## Expected Output

```
Document type: invoice
Confidence: 95.20%
  Vendor: CONTOSO LTD. (confidence: 97.80%)
  Total: 3800.00 USD (confidence: 96.50%)
  Date: 2024-01-15 (confidence: 98.10%)
  Due: 2024-02-15

  Line Items (4 items):
    1. Consulting Services — $1500.00
    2. Software License — $1200.00
    3. Support Plan — $800.00
    4. Training — $300.00
```

## Break and Fix

| # | Scenario | Symptom | Root Cause | Fix |
|---|----------|---------|------------|-----|
| 1 | Model returns empty results | `documents` array is empty | Wrong model for document type (e.g., using `prebuilt-receipt` for an invoice) | Select the correct prebuilt model matching your document type |
| 2 | Low confidence scores | Fields extracted with < 50% confidence | Document is poor quality (blurry scan, handwritten) | Use higher resolution scans; consider custom model for handwritten docs |
| 3 | "Resource not found" error | HTTP 404 on analyze endpoint | Using old Form Recognizer endpoint format instead of Document Intelligence | Use endpoint format: `{endpoint}/documentintelligence/documentModels/{model}:analyze?api-version=2024-11-30` |
| 4 | Timeout on large documents | Long-running operation never completes | Document exceeds page limit (2000 pages for layout) or is very large | Split large documents; use `pages` parameter to process specific pages |
| 5 | Missing line items | Invoice total extracted but items array is empty | Document layout is non-standard; model can't identify table structure | Try `prebuilt-layout` to see raw table extraction; consider custom model |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ai102-45-q1",
    question: "You need to extract the vendor name, invoice total, and line items from scanned invoices. Which model should you use?",
    options: [
      "prebuilt-layout",
      "prebuilt-invoice",
      "prebuilt-read",
      "prebuilt-document"
    ],
    correctIndex: 1,
    explanation: "The prebuilt-invoice model is specifically trained to extract invoice-specific fields like VendorName, InvoiceTotal, DueDate, and LineItems. While prebuilt-layout can extract tables, it doesn't understand invoice semantics."
  },
  {
    id: "ai102-45-q2",
    question: "The Document Intelligence analyze operation returns immediately with an Operation-Location header. What does this indicate?",
    options: [
      "The operation is asynchronous — you must poll the Operation-Location URL for results",
      "The document was too large and was rejected",
      "The analysis is complete and results are in the header",
      "The request was redirected to another endpoint"
    ],
    correctIndex: 0,
    explanation: "Document Intelligence uses an asynchronous pattern. The initial POST returns HTTP 202 with an Operation-Location header. You poll that URL until the operation status becomes 'succeeded', then retrieve the results from the response body."
  },
  {
    id: "ai102-45-q3",
    question: "A field is extracted with confidence 0.45 (45%). What should your application do?",
    options: [
      "Reject the entire document",
      "Re-submit the document with higher resolution settings",
      "Flag the field for human review based on a confidence threshold",
      "Accept the value since any extraction is better than manual entry"
    ],
    correctIndex: 2,
    explanation: "Best practice is to set a confidence threshold (typically 0.8 or 80%) and flag fields below it for human review. A 45% confidence suggests the model is uncertain. Don't reject the whole document — other fields may have high confidence."
  },
  {
    id: "ai102-45-q4",
    question: "Which prebuilt model extracts tables, paragraphs, and selection marks from ANY document type without needing to know the document format?",
    options: [
      "prebuilt-read",
      "prebuilt-document",
      "prebuilt-invoice",
      "prebuilt-layout"
    ],
    correctIndex: 3,
    explanation: "prebuilt-layout is the general-purpose structure extraction model. It identifies pages, tables, paragraphs, selection marks (checkboxes), and barcodes from any document. prebuilt-read only extracts text. Prebuilt-invoice/receipt are format-specific."
  },
  {
    id: "ai102-45-q5",
    question: "What is the correct API endpoint format for analyzing a document with Document Intelligence (2024-11-30 API)?",
    options: [
      "{endpoint}/formrecognizer/v2.1/prebuilt/{modelId}/analyze",
      "{endpoint}/documentintelligence/documentModels/{modelId}:analyze?api-version=2024-11-30",
      "{endpoint}/vision/documentanalysis:analyze?api-version=2024-11-30",
      "{endpoint}/documentintelligence/analyze/{modelId}?api-version=2024-11-30"
    ],
    correctIndex: 1,
    explanation: "The current Document Intelligence API (v4.0, 2024-11-30) uses the endpoint format: {endpoint}/documentintelligence/documentModels/{modelId}:analyze. The old formrecognizer path is deprecated."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-docintell --yes --no-wait
```

## Learn More

- [Document Intelligence overview](https://learn.microsoft.com/azure/ai-services/document-intelligence/overview)
- [Prebuilt models](https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-model-overview)
- [Invoice model](https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-invoice)
- [Layout model](https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-layout)
- [SDK quickstart (Python)](https://learn.microsoft.com/azure/ai-services/document-intelligence/quickstarts/get-started-sdks-rest-api)
