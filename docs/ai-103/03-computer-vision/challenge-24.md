---
sidebar_position: 2
title: "Challenge 24: Azure AI Vision - Image Analysis"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 24: Azure AI Vision - Image Analysis

:::info Estimated Time
**45 min** | **Cost**: $1-2 (estimated) | **Domain**: Computer Vision Solutions (10-15%)
:::

## Exam skills covered
- Select visual features to meet requirements
- Detect objects and generate tags in images
- Include or exclude visual features in analysis request
- Interpret image analysis responses including confidence scores

## Overview

Azure AI Vision Image Analysis 4.0 provides a unified API for extracting visual information. Available features:

| Feature | Description |
|---------|-------------|
| `caption` | Natural language description of the image |
| `denseCaptions` | Captions for multiple regions |
| `tags` | Content tags with confidence scores |
| `objects` | Object detection with bounding boxes |
| `people` | People detection with bounding boxes |
| `read` | OCR text extraction |
| `smartCrops` | Optimal crop regions for thumbnails |

The API returns structured JSON with confidence scores (0.0–1.0) for each detected element.

## Prerequisites
- Azure subscription
- Azure AI Services multi-service resource or Computer Vision resource
- Python 3.9+ or .NET 8
- Package: `azure-ai-vision-imageanalysis` (v1.0+)

## Implementation

### Task 1: Create Azure AI Vision Resource

```bash
az group create --name rg-ai102-vision --location eastus2

az cognitiveservices account create \
  --name ai-vision-ai102 \
  --resource-group rg-ai102-vision \
  --kind AIServices \
  --sku S0 \
  --location eastus2

# Get endpoint and key
ENDPOINT=$(az cognitiveservices account show --name ai-vision-ai102 --resource-group rg-ai102-vision --query properties.endpoint -o tsv)
KEY=$(az cognitiveservices account keys list --name ai-vision-ai102 --resource-group rg-ai102-vision --query key1 -o tsv)

echo "AZURE_AI_ENDPOINT=$ENDPOINT"
echo "AZURE_AI_KEY=$KEY"
```

### Task 2: Analyze Image with Multiple Features

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

# Analyze an image URL with multiple features
image_url = "https://learn.microsoft.com/azure/ai-services/computer-vision/media/quickstarts/presentation.png"

result = client.analyze_from_url(
    image_url=image_url,
    visual_features=[
        VisualFeatures.CAPTION,
        VisualFeatures.TAGS,
        VisualFeatures.OBJECTS,
        VisualFeatures.PEOPLE,
        VisualFeatures.READ
    ],
    language="en",
    gender_neutral_caption=True
)

# Process caption
if result.caption:
    print(f"Caption: '{result.caption.text}' (confidence: {result.caption.confidence:.4f})")

# Process tags
if result.tags:
    print(f"\nTags ({len(result.tags.list)} found):")
    for tag in result.tags.list:
        print(f"  - {tag.name}: {tag.confidence:.4f}")

# Process objects
if result.objects:
    print(f"\nObjects ({len(result.objects.list)} detected):")
    for obj in result.objects.list:
        bbox = obj.bounding_box
        print(f"  - {obj.tags[0].name} ({obj.tags[0].confidence:.4f})")
        print(f"    Bounding box: x={bbox.x}, y={bbox.y}, w={bbox.width}, h={bbox.height}")

# Process people
if result.people:
    print(f"\nPeople ({len(result.people.list)} detected):")
    for person in result.people.list:
        bbox = person.bounding_box
        print(f"  - Confidence: {person.confidence:.4f}")
        print(f"    Bounding box: x={bbox.x}, y={bbox.y}, w={bbox.width}, h={bbox.height}")

# Process OCR text
if result.read:
    print(f"\nText (OCR):")
    for block in result.read.blocks:
        for line in block.lines:
            print(f"  '{line.text}'")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.Vision.ImageAnalysis;

var endpoint = Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT");
var key = Environment.GetEnvironmentVariable("AZURE_AI_KEY");

var client = new ImageAnalysisClient(
    new Uri(endpoint),
    new AzureKeyCredential(key));

var imageUrl = new Uri("https://learn.microsoft.com/azure/ai-services/computer-vision/media/quickstarts/presentation.png");

var result = client.Analyze(
    imageUrl,
    VisualFeatures.Caption | VisualFeatures.Tags | VisualFeatures.Objects | VisualFeatures.People | VisualFeatures.Read,
    new ImageAnalysisOptions { Language = "en", GenderNeutralCaption = true });

// Caption
Console.WriteLine($"Caption: '{result.Value.Caption.Text}' ({result.Value.Caption.Confidence:F4})");

// Tags
Console.WriteLine($"\nTags ({result.Value.Tags.Values.Count}):");
foreach (var tag in result.Value.Tags.Values)
    Console.WriteLine($"  - {tag.Name}: {tag.Confidence:F4}");

// Objects
Console.WriteLine($"\nObjects ({result.Value.Objects.Values.Count}):");
foreach (var obj in result.Value.Objects.Values)
{
    var box = obj.BoundingBox;
    Console.WriteLine($"  - {obj.Tags[0].Name} ({obj.Tags[0].Confidence:F4})");
    Console.WriteLine($"    Box: x={box.X}, y={box.Y}, w={box.Width}, h={box.Height}");
}

// People
Console.WriteLine($"\nPeople ({result.Value.People.Values.Count}):");
foreach (var person in result.Value.People.Values)
    Console.WriteLine($"  - Confidence: {person.Confidence:F4}, Box: ({person.BoundingBox.X},{person.BoundingBox.Y})");

// OCR
Console.WriteLine("\nText:");
foreach (var block in result.Value.Read.Blocks)
    foreach (var line in block.Lines)
        Console.WriteLine($"  '{line.Text}'");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="https://<resource>.cognitiveservices.azure.com"
KEY="<your-key>"

curl -s "${ENDPOINT}/computervision/imageanalysis:analyze?features=caption,tags,objects,people,read&language=en&gender-neutral-caption=true&api-version=2024-02-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://learn.microsoft.com/azure/ai-services/computer-vision/media/quickstarts/presentation.png"
  }' | jq .
```

</TabItem>
</Tabs>

### Task 3: Analyze Local Image with Smart Crops

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Analyze a local image file
with open("sample-image.jpg", "rb") as image_file:
    image_data = image_file.read()

result = client.analyze(
    image_data=image_data,
    visual_features=[VisualFeatures.SMART_CROPS, VisualFeatures.DENSE_CAPTIONS],
    smart_crops_aspect_ratios=[0.9, 1.33, 1.78]  # Square-ish, 4:3, 16:9
)

# Smart crops for thumbnails
if result.smart_crops:
    print("Smart crop regions:")
    for crop in result.smart_crops.list:
        bbox = crop.bounding_box
        print(f"  Aspect ratio {crop.aspect_ratio}: x={bbox.x}, y={bbox.y}, w={bbox.width}, h={bbox.height}")

# Dense captions - multiple region descriptions
if result.dense_captions:
    print(f"\nDense captions ({len(result.dense_captions.list)}):")
    for cap in result.dense_captions.list:
        bbox = cap.bounding_box
        print(f"  '{cap.text}' (conf: {cap.confidence:.3f}) at ({bbox.x},{bbox.y})")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Analyze local file with smart crops
curl -s "${ENDPOINT}/computervision/imageanalysis:analyze?features=smartCrops,denseCaptions&smartCrops-aspect-ratios=0.9,1.33,1.78&api-version=2024-02-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @sample-image.jpg | jq .
```

</TabItem>
</Tabs>

## Expected Output

```text
Caption: 'a person standing in front of a whiteboard giving a presentation' (confidence: 0.8523)

Tags (8 found):
  - person: 0.9891
  - indoor: 0.9754
  - whiteboard: 0.9612
  - presentation: 0.8934
  - clothing: 0.8721
  - standing: 0.8456
  - wall: 0.7823
  - text: 0.7234

Objects (2 detected):
  - person (0.9234)
    Bounding box: x=120, y=45, w=280, h=510
  - whiteboard (0.8567)
    Bounding box: x=420, y=30, w=350, h=400

People (1 detected):
  - Confidence: 0.9456
    Bounding box: x=118, y=42, w=285, h=515

Text (OCR):
  'Azure AI Services'
  'Computer Vision'
  'Image Analysis'
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| 415 Unsupported Media Type | Error on local file | Wrong Content-Type header | Use `application/octet-stream` for binary, `application/json` for URL |
| Empty tags/objects | No results returned | Image too small or blurry | Minimum 50x50 pixels; max 20MB |
| `InvalidImageUrl` error | 400 Bad Request | URL not publicly accessible | Ensure image URL is publicly reachable; use local file upload instead |
| Low confidence scores | Results unreliable | Image quality or ambiguity | Filter results by confidence threshold (e.g., > 0.7) |
| Feature not available | `FeatureNotSupported` | Region doesn't support feature | Use supported regions (East US, West Europe, etc.) |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "Which visual feature provides natural language descriptions for multiple regions within an image?",
    options: [
      "caption",
      "tags",
      "denseCaptions",
      "objects"
    ],
    correctAnswer: 2,
    explanation: "denseCaptions generates captions for multiple regions within an image, while caption provides a single description for the entire image."
  },
  {
    question: "What does the smartCrops feature return?",
    options: [
      "Bounding box coordinates for optimal crop regions at specified aspect ratios",
      "Cropped image files at specified resolutions",
      "A list of objects that should be excluded from cropping",
      "Automatically resized versions of the image"
    ],
    correctAnswer: 0,
    explanation: "smartCrops returns bounding box coordinates for the optimal crop regions at your specified aspect ratios, ensuring important content is preserved in thumbnails."
  },
  {
    question: "How are confidence scores expressed in Image Analysis 4.0 responses?",
    options: [
      "As percentages from 0% to 100%",
      "As integer values from 1 to 10",
      "As categorical labels (low, medium, high)",
      "As floating-point values from 0.0 to 1.0"
    ],
    correctAnswer: 3,
    explanation: "Confidence scores are floating-point values between 0.0 and 1.0, where higher values indicate greater confidence in the detection or classification."
  },
  {
    question: "What is the correct API endpoint format for Image Analysis 4.0?",
    options: [
      "POST /vision/v3.2/analyze",
      "POST /computervision/imageanalysis:analyze?api-version=2024-02-01",
      "POST /imageanalysis/v4.0/analyze",
      "GET /computervision/analyze?features=caption"
    ],
    correctAnswer: 1,
    explanation: "Image Analysis 4.0 uses the endpoint format: POST /computervision/imageanalysis:analyze with features and api-version as query parameters."
  },
  {
    question: "Which parameter specifies what information to extract from the image?",
    options: [
      "capabilities",
      "analysis_type",
      "extract_mode",
      "visual_features (SDK) / features (REST query parameter)"
    ],
    correctAnswer: 3,
    explanation: "In the Python/C# SDK you pass visual_features (a list of VisualFeatures enum values); in REST you pass the 'features' query parameter with comma-separated feature names."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-vision --yes --no-wait
```

## Learn More

- [Image Analysis overview](https://learn.microsoft.com/azure/ai-services/computer-vision/overview-image-analysis)
- [Image Analysis SDK quickstart](https://learn.microsoft.com/azure/ai-services/computer-vision/quickstarts-sdk/image-analysis-client-library-40)
- [Visual features reference](https://learn.microsoft.com/azure/ai-services/computer-vision/concept-tag-images-40)
