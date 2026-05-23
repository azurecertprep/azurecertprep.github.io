---
sidebar_position: 5
title: "Challenge 27: OCR - Extract Text from Images"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 27: OCR - Extract Text from Images

:::info Estimated Time
**45 min** | **Cost**: $1-3 (estimated) | **Domain**: Implement Computer Vision Solutions (10-15%)
:::

## Exam skills covered
- Extract text from images using Azure AI Vision Read feature
- Convert handwritten text to digital text
- Process multi-page documents

## Overview

Azure AI Vision's **Read** feature (part of Image Analysis 4.0) extracts printed and handwritten text from images and documents. The text hierarchy:

```
Image → Blocks → Lines → Words (with bounding polygons and confidence)
```

Key characteristics:
- Supports 164+ languages for print, 9 languages for handwriting
- Handles rotated, skewed, and noisy text
- Returns bounding polygons for each text element
- Synchronous API for single images

For multi-page PDFs, use the Azure AI Document Intelligence Read model instead.

## Prerequisites
- Azure subscription
- Azure AI Services resource
- Python 3.9+ or .NET 8
- Package: `azure-ai-vision-imageanalysis` (v1.0+)

## Implementation

### Task 1: Extract Printed Text from Images

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.ai.vision.imageanalysis.models import VisualFeatures
from azure.core.credentials import AzureKeyCredential

client = ImageAnalysisClient(
    endpoint=os.environ["AZURE_AI_ENDPOINT"],
    credential=AzureKeyCredential(os.environ["AZURE_AI_KEY"])
)

# Extract text from an image URL
image_url = "https://learn.microsoft.com/azure/ai-services/computer-vision/media/quickstarts/presentation.png"

result = client.analyze_from_url(
    image_url=image_url,
    visual_features=[VisualFeatures.READ]
)

if result.read:
    print("Extracted Text:")
    print("-" * 40)
    for block in result.read.blocks:
        for line in block.lines:
            print(f"  Line: '{line.text}'")
            print(f"    Bounding polygon: {line.bounding_polygon}")
            
            # Access individual words with confidence
            for word in line.words:
                print(f"      Word: '{word.text}' (confidence: {word.confidence:.4f})")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.Vision.ImageAnalysis;

var client = new ImageAnalysisClient(
    new Uri(Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")),
    new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_AI_KEY")));

var imageUrl = new Uri("https://learn.microsoft.com/azure/ai-services/computer-vision/media/quickstarts/presentation.png");

var result = client.Analyze(imageUrl, VisualFeatures.Read);

Console.WriteLine("Extracted Text:");
foreach (var block in result.Value.Read.Blocks)
{
    foreach (var line in block.Lines)
    {
        Console.WriteLine($"  Line: '{line.Text}'");
        foreach (var word in line.Words)
        {
            Console.WriteLine($"    Word: '{word.Text}' (confidence: {word.Confidence:F4})");
        }
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="https://<resource>.cognitiveservices.azure.com"
KEY="<your-key>"

curl -s "${ENDPOINT}/computervision/imageanalysis:analyze?features=read&api-version=2024-02-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://learn.microsoft.com/azure/ai-services/computer-vision/media/quickstarts/presentation.png"}' \
  | jq '.readResult.blocks[].lines[] | {text: .text, confidence: .words[0].confidence}'
```

</TabItem>
</Tabs>

### Task 2: Extract Handwritten Text

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Read handwritten text from a local image
with open("handwritten-note.jpg", "rb") as f:
    image_data = f.read()

result = client.analyze(
    image_data=image_data,
    visual_features=[VisualFeatures.READ]
)

if result.read:
    print("Handwritten Text Extracted:")
    for block in result.read.blocks:
        for line in block.lines:
            # Check confidence - handwriting often has lower confidence
            avg_confidence = sum(w.confidence for w in line.words) / len(line.words)
            confidence_indicator = "✓" if avg_confidence > 0.8 else "?"
            print(f"  [{confidence_indicator}] '{line.text}' (avg conf: {avg_confidence:.3f})")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Send local image for OCR
curl -s "${ENDPOINT}/computervision/imageanalysis:analyze?features=read&api-version=2024-02-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @handwritten-note.jpg | jq '.readResult'
```

</TabItem>
</Tabs>

### Task 3: Process Multi-Page Document with Document Intelligence

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
from azure.core.credentials import AzureKeyCredential

# For multi-page documents, use Document Intelligence Read model
doc_client = DocumentIntelligenceClient(
    endpoint=os.environ["AZURE_AI_ENDPOINT"],
    credential=AzureKeyCredential(os.environ["AZURE_AI_KEY"])
)

# Analyze a multi-page PDF
with open("multi-page-document.pdf", "rb") as f:
    poller = doc_client.begin_analyze_document(
        "prebuilt-read",
        body=f,
        content_type="application/pdf"
    )

result = poller.result()

print(f"Document contains {len(result.pages)} pages")
for page in result.pages:
    print(f"\n--- Page {page.page_number} ({page.width}x{page.height} {page.unit}) ---")
    for line in page.lines:
        print(f"  '{line.content}'")

# Access full content as continuous text
print(f"\nFull content:\n{result.content[:500]}")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Document Intelligence Read API (async operation)
DOC_ENDPOINT="https://<resource>.cognitiveservices.azure.com"
KEY="<your-key>"

# Submit document for analysis
OPERATION_URL=$(curl -si "${DOC_ENDPOINT}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/pdf" \
  --data-binary @document.pdf | grep -i "operation-location" | tr -d '\r' | awk '{print $2}')

# Poll for results
sleep 5
curl -s "${OPERATION_URL}" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" | jq '.analyzeResult.pages[].lines[].content'
```

</TabItem>
</Tabs>

## Expected Output

```
Extracted Text:
----------------------------------------
  Line: 'Azure AI Services'
    Bounding polygon: [{'x': 54, 'y': 28}, {'x': 403, 'y': 26}, ...]
      Word: 'Azure' (confidence: 0.9980)
      Word: 'AI' (confidence: 0.9950)
      Word: 'Services' (confidence: 0.9970)
  Line: 'Computer Vision'
      Word: 'Computer' (confidence: 0.9920)
      Word: 'Vision' (confidence: 0.9910)

Handwritten Text Extracted:
  [✓] 'Meeting notes - January 2024' (avg conf: 0.892)
  [?] 'discuss quarterly goals' (avg conf: 0.734)
  [✓] 'Action items below' (avg conf: 0.856)

Document contains 3 pages
--- Page 1 (8.5x11.0 inch) ---
  'Annual Report 2024'
  'Executive Summary'
```

## Break and Fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| No text detected | Empty results | Image too small or low quality | Min 50x50 px; ensure adequate resolution (300 DPI for print) |
| Wrong language detected | Garbled text | Auto-detection failed for rare scripts | Specify `language` parameter in request |
| Low word confidence | Uncertain results | Handwriting quality or unusual fonts | Accept lower thresholds for handwriting; preprocess image |
| 413 Request Entity Too Large | File rejected | Image exceeds 20MB limit | Compress or resize image before submission |
| Bounding polygons incorrect | Misaligned boxes | Image rotation not detected | Use auto-rotation or preprocess to correct skew |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What is the text hierarchy returned by the Azure AI Vision Read feature?",
    options: [
      "Document → Paragraphs → Sentences → Words",
      "Pages → Columns → Rows → Characters",
      "Blocks → Lines → Words (each with bounding polygons and confidence)",
      "Regions → Paragraphs → Lines → Characters"
    ],
    correctAnswer: 2,
    explanation: "The Read feature returns: Blocks (text regions) → Lines (text lines) → Words (individual words with bounding polygons and confidence scores)."
  },
  {
    question: "What is the maximum image size supported by the Image Analysis Read feature?",
    options: [
      "20MB with minimum 50x50 pixels",
      "5MB",
      "100MB",
      "10MB with minimum 100x100 pixels"
    ],
    correctAnswer: 0,
    explanation: "Image Analysis supports images up to 20MB with a minimum dimension of 50x50 pixels."
  },
  {
    question: "For multi-page PDF documents, which Azure service should you use for text extraction?",
    options: [
      "Azure AI Vision Image Analysis Read feature",
      "Azure AI Document Intelligence with the prebuilt-read model",
      "Azure Cognitive Search OCR skill",
      "Azure AI Vision OCR v3.2 API"
    ],
    correctAnswer: 1,
    explanation: "Document Intelligence's prebuilt-read model handles multi-page PDFs with page-level results. Image Analysis Read is for single images."
  },
  {
    question: "How does the API indicate uncertainty in handwritten text recognition?",
    options: [
      "It marks words with an 'uncertain' flag",
      "It returns alternative text suggestions",
      "It highlights uncertain regions in red",
      "Each word has a confidence score (0.0-1.0); handwriting typically scores lower than print"
    ],
    correctAnswer: 3,
    explanation: "Each word includes a confidence score from 0.0 to 1.0. Handwritten text typically returns lower confidence scores than printed text due to variability."
  },
  {
    question: "What Content-Type header should you use when sending a local image file for OCR?",
    options: [
      "application/octet-stream with raw binary data",
      "application/json with base64 encoded image",
      "multipart/form-data with file attachment",
      "image/jpeg or image/png matching the file format"
    ],
    correctAnswer: 0,
    explanation: "When sending binary image data directly, use Content-Type: application/octet-stream. When sending an image URL, use application/json."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-vision --yes --no-wait
```

## Learn More

- [Read text from images](https://learn.microsoft.com/azure/ai-services/computer-vision/concept-ocr)
- [Image Analysis quickstart](https://learn.microsoft.com/azure/ai-services/computer-vision/quickstarts-sdk/image-analysis-client-library-40)
- [Document Intelligence Read model](https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-read)
