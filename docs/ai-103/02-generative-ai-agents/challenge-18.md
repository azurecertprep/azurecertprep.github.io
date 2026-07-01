---
sidebar_position: 9
title: "Challenge 18: DALL-E and Multimodal Models"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 18: DALL-E and Multimodal Models

:::info Estimated Time
**45-60 min** | **Cost**: ~$2.00 (estimated, image generation) | **Domain**: Generative AI & Agentic Solutions (35-40%)
:::

## Exam skills covered
- Use DALL-E to generate images
- Use large multimodal models (GPT-4o vision capabilities)

## Overview

Azure OpenAI provides access to multimodal AI capabilities through two primary features: **DALL-E 3** for image generation and **GPT-4o** for vision understanding. DALL-E 3 generates images from text descriptions, supporting sizes of 1024×1024, 1024×1792, and 1792×1024 with configurable quality settings (standard or HD). Each generation request produces a unique image with a temporary URL valid for 24 hours.

GPT-4o's vision capabilities allow the model to analyze images provided either as URLs or base64-encoded data. The model can describe image content, extract text (OCR), interpret charts and diagrams, compare multiple images, and answer questions about visual content. Images are processed as special content parts within the chat completions API, maintaining the familiar message structure.

When working with multimodal inputs, understanding token costs is important: image analysis costs vary by resolution. The `detail` parameter controls processing: `low` uses a fixed 85 tokens regardless of size, while `high` processes the image at full resolution with costs proportional to the number of 512×512 tiles needed to cover the image.

## Architecture

This challenge generates images with DALL-E 3, analyzes images with GPT-4o vision, and explores OCR and chart understanding capabilities.

![Challenge 18 topology](/img/ai-103/challenge-18-topology.svg)

## Prerequisites
- Azure OpenAI resource with DALL-E 3 model deployed (deployment name: `dall-e-3`)
- Azure OpenAI resource with GPT-4o model deployed (deployment name: `gpt-4o`)
- Python 3.9+ with `openai` package installed
- .NET 8 SDK with `Azure.AI.OpenAI` NuGet package
- Sample images for vision analysis (URLs or local files)

## Implementation

### Task 1: Generate Images with DALL-E 3

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

# Generate an image with DALL-E 3
result = client.images.generate(
    model="dall-e-3",  # deployment name
    prompt="A modern cloud data center with glowing blue network connections, "
           "isometric 3D illustration style, clean white background",
    size="1024x1024",       # Options: 1024x1024, 1024x1792, 1792x1024
    quality="standard",     # Options: standard, hd
    style="vivid",          # Options: vivid, natural
    n=1                     # DALL-E 3 only supports n=1
)

image_url = result.data[0].url
revised_prompt = result.data[0].revised_prompt

print(f"Image URL: {image_url}")
print(f"Revised prompt: {revised_prompt}")

# Generate HD quality portrait image
result_hd = client.images.generate(
    model="dall-e-3",
    prompt="Professional headshot photo of a friendly AI robot assistant, "
           "soft studio lighting, shallow depth of field",
    size="1024x1792",   # Portrait orientation
    quality="hd",       # Higher detail
    style="natural",    # More photorealistic
    n=1
)

print(f"\nHD Image URL: {result_hd.data[0].url}")
print(f"Revised prompt: {result_hd.data[0].revised_prompt}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Images;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

ImageClient imageClient = azureClient.GetImageClient("dall-e-3");

// Generate an image with DALL-E 3
GeneratedImage image = await imageClient.GenerateImageAsync(
    "A modern cloud data center with glowing blue network connections, "
    + "isometric 3D illustration style, clean white background",
    new ImageGenerationOptions
    {
        Size = GeneratedImageSize.W1024xH1024,
        Quality = GeneratedImageQuality.Standard,
        Style = GeneratedImageStyle.Vivid
    });

Console.WriteLine($"Image URL: {image.ImageUri}");
Console.WriteLine($"Revised prompt: {image.RevisedPrompt}");

// Generate HD quality portrait image
GeneratedImage imageHd = await imageClient.GenerateImageAsync(
    "Professional headshot photo of a friendly AI robot assistant, "
    + "soft studio lighting, shallow depth of field",
    new ImageGenerationOptions
    {
        Size = GeneratedImageSize.W1024xH1792,
        Quality = GeneratedImageQuality.High,
        Style = GeneratedImageStyle.Natural
    });

Console.WriteLine($"\nHD Image URL: {imageHd.ImageUri}");
Console.WriteLine($"Revised prompt: {imageHd.RevisedPrompt}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Generate image with DALL-E 3
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/dall-e-3/images/generations?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "prompt": "A modern cloud data center with glowing blue network connections, isometric 3D illustration style, clean white background",
    "size": "1024x1024",
    "quality": "standard",
    "style": "vivid",
    "n": 1
  }'

# Generate HD portrait image
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/dall-e-3/images/generations?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "prompt": "Professional headshot photo of a friendly AI robot assistant, soft studio lighting, shallow depth of field",
    "size": "1024x1792",
    "quality": "hd",
    "style": "natural",
    "n": 1
  }'

# Response includes:
# - data[0].url: Temporary URL (valid 24 hours)
# - data[0].revised_prompt: DALL-E 3's enhanced version of your prompt
```

</TabItem>
</Tabs>

### Task 2: Analyze Images with GPT-4o Vision (URL Input)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

# Analyze an image using a URL
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "system",
            "content": "You are an image analysis assistant. Describe images accurately and concisely."
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Describe this image in detail. What architecture components do you see?"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://learn.microsoft.com/en-us/azure/architecture/guide/images/a]]rchitecture-styles/web-queue-worker-logical.svg",
                        "detail": "high"  # Options: low, high, auto
                    }
                }
            ]
        }
    ],
    max_tokens=500
)

print(f"Analysis: {response.choices[0].message.content}")
print(f"Tokens used: {response.usage.total_tokens}")

# Compare multiple images
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Compare these two architecture diagrams. What are the key differences?"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://example.com/architecture-v1.png",
                        "detail": "high"
                    }
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://example.com/architecture-v2.png",
                        "detail": "high"
                    }
                }
            ]
        }
    ],
    max_tokens=500
)

print(f"\nComparison: {response.choices[0].message.content}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

ChatClient chatClient = azureClient.GetChatClient("gpt-4o");

// Analyze an image using a URL
var messages = new ChatMessage[]
{
    new SystemChatMessage("You are an image analysis assistant. Describe images accurately and concisely."),
    new UserChatMessage(
        ChatMessageContentPart.CreateTextPart("Describe this image in detail. What architecture components do you see?"),
        ChatMessageContentPart.CreateImagePart(
            new Uri("https://learn.microsoft.com/en-us/azure/architecture/guide/images/architecture-styles/web-queue-worker-logical.svg"),
            ImageChatMessageContentPartDetail.High))
};

ChatCompletion result = await chatClient.CompleteChatAsync(
    messages,
    new ChatCompletionOptions { MaxOutputTokenCount = 500 });

Console.WriteLine($"Analysis: {result.Content[0].Text}");
Console.WriteLine($"Tokens used: {result.Usage.TotalTokenCount}");

// Compare multiple images
var compareMessages = new ChatMessage[]
{
    new UserChatMessage(
        ChatMessageContentPart.CreateTextPart("Compare these two architecture diagrams. What are the key differences?"),
        ChatMessageContentPart.CreateImagePart(
            new Uri("https://example.com/architecture-v1.png"),
            ImageChatMessageContentPartDetail.High),
        ChatMessageContentPart.CreateImagePart(
            new Uri("https://example.com/architecture-v2.png"),
            ImageChatMessageContentPartDetail.High))
};

ChatCompletion compareResult = await chatClient.CompleteChatAsync(
    compareMessages,
    new ChatCompletionOptions { MaxOutputTokenCount = 500 });

Console.WriteLine($"\nComparison: {compareResult.Content[0].Text}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Analyze image with GPT-4o vision (URL input)
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are an image analysis assistant."
      },
      {
        "role": "user",
        "content": [
          {"type": "text", "text": "Describe this architecture diagram in detail."},
          {
            "type": "image_url",
            "image_url": {
              "url": "https://learn.microsoft.com/en-us/azure/architecture/guide/images/architecture-styles/web-queue-worker-logical.svg",
              "detail": "high"
            }
          }
        ]
      }
    ],
    "max_tokens": 500
  }'

# Compare multiple images
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": [
          {"type": "text", "text": "Compare these two images."},
          {"type": "image_url", "image_url": {"url": "https://example.com/img1.png", "detail": "high"}},
          {"type": "image_url", "image_url": {"url": "https://example.com/img2.png", "detail": "high"}}
        ]
      }
    ],
    "max_tokens": 500
  }'
```

</TabItem>
</Tabs>

### Task 3: Extract Text from Images (OCR with Vision)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import base64
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

def encode_image_to_base64(image_path: str) -> str:
    """Encode a local image file to base64."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")

# Option 1: Base64-encoded local image
image_base64 = encode_image_to_base64("sample-document.png")

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "system",
            "content": "You are an OCR assistant. Extract all visible text from the image exactly as written. Preserve formatting where possible."
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Extract all text from this document image."},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{image_base64}",
                        "detail": "high"
                    }
                }
            ]
        }
    ],
    max_tokens=1000
)

print("Extracted text:")
print(response.choices[0].message.content)

# Option 2: Chart/diagram understanding
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Analyze this chart. What trends do you see? Provide the data points if visible."
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://example.com/sales-chart-q4.png",
                        "detail": "high"
                    }
                }
            ]
        }
    ],
    max_tokens=500
)

print(f"\nChart analysis: {response.choices[0].message.content}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

ChatClient chatClient = azureClient.GetChatClient("gpt-4o");

// Base64-encoded local image for OCR
byte[] imageBytes = await File.ReadAllBytesAsync("sample-document.png");
BinaryData imageData = BinaryData.FromBytes(imageBytes);

var ocrMessages = new ChatMessage[]
{
    new SystemChatMessage("You are an OCR assistant. Extract all visible text exactly as written."),
    new UserChatMessage(
        ChatMessageContentPart.CreateTextPart("Extract all text from this document image."),
        ChatMessageContentPart.CreateImagePart(imageData, "image/png",
            ImageChatMessageContentPartDetail.High))
};

ChatCompletion ocrResult = await chatClient.CompleteChatAsync(
    ocrMessages,
    new ChatCompletionOptions { MaxOutputTokenCount = 1000 });

Console.WriteLine("Extracted text:");
Console.WriteLine(ocrResult.Content[0].Text);

// Chart understanding
var chartMessages = new ChatMessage[]
{
    new UserChatMessage(
        ChatMessageContentPart.CreateTextPart("Analyze this chart. What trends do you see?"),
        ChatMessageContentPart.CreateImagePart(
            new Uri("https://example.com/sales-chart-q4.png"),
            ImageChatMessageContentPartDetail.High))
};

ChatCompletion chartResult = await chatClient.CompleteChatAsync(
    chartMessages,
    new ChatCompletionOptions { MaxOutputTokenCount = 500 });

Console.WriteLine($"\nChart analysis: {chartResult.Content[0].Text}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Base64 image input for OCR
# First, encode image to base64
IMAGE_BASE64=$(base64 -w 0 sample-document.png)

curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d "{
    \"messages\": [
      {\"role\": \"system\", \"content\": \"You are an OCR assistant. Extract all visible text.\"},
      {
        \"role\": \"user\",
        \"content\": [
          {\"type\": \"text\", \"text\": \"Extract all text from this document.\"},
          {
            \"type\": \"image_url\",
            \"image_url\": {
              \"url\": \"data:image/png;base64,${IMAGE_BASE64}\",
              \"detail\": \"high\"
            }
          }
        ]
      }
    ],
    \"max_tokens\": 1000
  }"

# Chart analysis with URL
curl -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": [
          {"type": "text", "text": "Analyze this chart and describe the trends."},
          {"type": "image_url", "image_url": {"url": "https://example.com/chart.png", "detail": "high"}}
        ]
      }
    ],
    "max_tokens": 500
  }'
```

</TabItem>
</Tabs>

### Task 4: Compare Image Analysis Approaches

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import time
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

image_url = "https://example.com/sample-architecture.png"

# Low detail: Fixed cost (85 tokens), faster, less accurate
start = time.time()
response_low = client.chat.completions.create(
    model="gpt-4o",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Describe this image."},
            {"type": "image_url", "image_url": {"url": image_url, "detail": "low"}}
        ]
    }],
    max_tokens=300
)
time_low = time.time() - start

# High detail: Variable cost (based on image size), slower, more accurate
start = time.time()
response_high = client.chat.completions.create(
    model="gpt-4o",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Describe this image."},
            {"type": "image_url", "image_url": {"url": image_url, "detail": "high"}}
        ]
    }],
    max_tokens=300
)
time_high = time.time() - start

print("=== Low Detail ===")
print(f"Time: {time_low:.2f}s | Tokens: {response_low.usage.total_tokens}")
print(f"Response: {response_low.choices[0].message.content[:200]}...")

print("\n=== High Detail ===")
print(f"Time: {time_high:.2f}s | Tokens: {response_high.usage.total_tokens}")
print(f"Response: {response_high.choices[0].message.content[:200]}...")

print("\n=== Cost Comparison ===")
print(f"Low detail always uses 85 image tokens (fixed)")
print(f"High detail uses {response_high.usage.prompt_tokens - response_low.usage.prompt_tokens} additional image tokens")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;
using System.Diagnostics;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

ChatClient chatClient = azureClient.GetChatClient("gpt-4o");

var imageUri = new Uri("https://example.com/sample-architecture.png");

// Low detail comparison
var sw = Stopwatch.StartNew();
var lowResult = await chatClient.CompleteChatAsync(
    new ChatMessage[] {
        new UserChatMessage(
            ChatMessageContentPart.CreateTextPart("Describe this image."),
            ChatMessageContentPart.CreateImagePart(imageUri, ImageChatMessageContentPartDetail.Low))
    },
    new ChatCompletionOptions { MaxOutputTokenCount = 300 });
sw.Stop();
var timeLow = sw.Elapsed;

// High detail comparison
sw.Restart();
var highResult = await chatClient.CompleteChatAsync(
    new ChatMessage[] {
        new UserChatMessage(
            ChatMessageContentPart.CreateTextPart("Describe this image."),
            ChatMessageContentPart.CreateImagePart(imageUri, ImageChatMessageContentPartDetail.High))
    },
    new ChatCompletionOptions { MaxOutputTokenCount = 300 });
sw.Stop();
var timeHigh = sw.Elapsed;

Console.WriteLine($"Low Detail: {timeLow.TotalSeconds:F2}s | Tokens: {lowResult.Value.Usage.TotalTokenCount}");
Console.WriteLine($"High Detail: {timeHigh.TotalSeconds:F2}s | Tokens: {highResult.Value.Usage.TotalTokenCount}");
Console.WriteLine($"\nLow detail always uses 85 image tokens (fixed cost)");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Low detail (85 tokens, fast)
echo "=== Low Detail ==="
time curl -s -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "Describe this image."},
        {"type": "image_url", "image_url": {"url": "https://example.com/architecture.png", "detail": "low"}}
      ]
    }],
    "max_tokens": 300
  }' | jq '.usage'

# High detail (variable tokens, more accurate)
echo "=== High Detail ==="
time curl -s -X POST "https://${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "Describe this image."},
        {"type": "image_url", "image_url": {"url": "https://example.com/architecture.png", "detail": "high"}}
      ]
    }],
    "max_tokens": 300
  }' | jq '.usage'
```

</TabItem>
</Tabs>

## Expected Output

```text
Image URL: https://dalleproduse.blob.core.windows.net/...
Revised prompt: A highly detailed modern cloud data center rendered in isometric 3D...

HD Image URL: https://dalleproduse.blob.core.windows.net/...
Revised prompt: A professional studio headshot photograph of a friendly humanoid robot...

Analysis: The image shows a web-queue-worker architecture pattern with a web frontend
connected to a message queue, which feeds into a background worker process...

Extracted text:
INVOICE #12345
Date: 2024-03-15
Customer: Contoso Ltd.
...

=== Low Detail ===
Time: 1.2s | Tokens: 198
=== High Detail ===
Time: 2.8s | Tokens: 1542
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|-----------|-----|
| DALL-E returns content filter error | `ContentFilterError` | Prompt triggered safety filters | Rephrase prompt; avoid potentially sensitive content |
| Image URL returns 400 | `Invalid image URL` | URL is not publicly accessible | Use base64 encoding for private images |
| Vision returns blurry analysis | Inaccurate descriptions | Using `detail: "low"` on complex images | Switch to `detail: "high"` for detailed analysis |
| Token count unexpectedly high | Large bill for vision requests | High-res images with `detail: "high"` | Use `detail: "low"` when full resolution isn't needed |
| DALL-E n>1 fails | `InvalidRequestError` | DALL-E 3 only supports n=1 | Set n=1; make multiple requests for multiple images |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ch18-q1",
    question: "What image sizes does DALL-E 3 support in Azure OpenAI?",
    options: [
      "256x256, 512x512, 1024x1024",
      "1024x1024, 1024x1792, 1792x1024",
      "512x512, 1024x1024, 2048x2048",
      "Any custom resolution up to 4096x4096"
    ],
    correctAnswer: 1,
    explanation: "DALL-E 3 supports three fixed sizes: 1024x1024 (square), 1024x1792 (portrait), and 1792x1024 (landscape). The older DALL-E 2 supported 256x256 and 512x512, but these are not available in DALL-E 3."
  },
  {
    id: "ch18-q2",
    question: "How are images provided to GPT-4o for vision analysis?",
    options: [
      "As content parts within the chat completions messages array",
      "As a separate API call to a vision-specific endpoint",
      "By uploading to Azure Blob Storage and providing a SAS token",
      "Through the Azure AI Vision API only"
    ],
    correctAnswer: 0,
    explanation: "GPT-4o vision uses the standard chat completions API. Images are included as content parts (type: 'image_url') within user messages, alongside text parts. The image can be provided as a URL or base64-encoded data URI."
  },
  {
    id: "ch18-q3",
    question: "What does the 'detail' parameter control when sending images to GPT-4o?",
    options: [
      "The output quality of generated images",
      "Whether the model returns structured or unstructured analysis",
      "The resolution at which the model processes the image, affecting token cost and accuracy",
      "The compression level applied before transmission"
    ],
    correctAnswer: 2,
    explanation: "The 'detail' parameter (low/high/auto) controls image processing resolution. 'low' uses a fixed 85 tokens regardless of size. 'high' processes at full resolution, with token costs proportional to the number of 512x512 tiles needed, providing more accurate analysis."
  },
  {
    id: "ch18-q4",
    question: "What is the 'revised_prompt' field in a DALL-E 3 response?",
    options: [
      "A suggested improvement for next time",
      "The original prompt with spelling corrections",
      "DALL-E 3's automatically enhanced version of your prompt used for generation",
      "A moderation-filtered version with flagged content removed"
    ],
    correctAnswer: 2,
    explanation: "DALL-E 3 automatically rewrites prompts to add detail and improve generation quality. The 'revised_prompt' field shows the enhanced prompt that was actually used to generate the image. This is a built-in feature and cannot be disabled."
  },
  {
    id: "ch18-q5",
    question: "How long are DALL-E 3 generated image URLs valid before they expire?",
    options: [
      "1 hour",
      "7 days",
      "They never expire",
      "24 hours"
    ],
    correctAnswer: 3,
    explanation: "DALL-E 3 image URLs are temporary and expire after 24 hours. Applications that need to persist images should download them immediately after generation and store them in their own storage (e.g., Azure Blob Storage)."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-challenge18 --yes --no-wait
```

## Learn More
- [DALL-E API reference](https://learn.microsoft.com/azure/ai-services/openai/reference#image-generation)
- [GPT-4o vision capabilities](https://learn.microsoft.com/azure/ai-services/openai/how-to/gpt-with-vision)
- [Image token calculation](https://learn.microsoft.com/azure/ai-services/openai/overview#image-tokens-gpt-4o)
- [Content filtering for DALL-E](https://learn.microsoft.com/azure/ai-services/openai/concepts/content-filter)
- [Multimodal models overview](https://learn.microsoft.com/azure/ai-services/openai/concepts/models#gpt-4o-and-gpt-4-turbo)
