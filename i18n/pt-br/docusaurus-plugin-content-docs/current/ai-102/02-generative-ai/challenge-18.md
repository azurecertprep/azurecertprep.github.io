---
sidebar_position: 9
title: "Desafio 18: DALL-E e Modelos Multimodais"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 18: DALL-E e Modelos Multimodais

:::info Tempo Estimado
**45-60 min** | **Custo**: ~$2,00 (estimado, geração de imagens) | **Domínio**: Soluções de IA Generativa (15-20%)
:::

## Habilidades do exame cobertas
- Usar DALL-E para gerar imagens
- Usar modelos multimodais grandes (capacidades de visão do GPT-4o)

## Visão Geral

O Azure OpenAI fornece acesso a capacidades de IA multimodal através de dois recursos principais: **DALL-E 3** para geração de imagens e **GPT-4o** para compreensão visual. O DALL-E 3 gera imagens a partir de descrições textuais, suportando tamanhos de 1024×1024, 1024×1792 e 1792×1024 com configurações de qualidade ajustáveis (standard ou HD). Cada requisição de geração produz uma imagem única com uma URL temporária válida por 24 horas.

As capacidades de visão do GPT-4o permitem que o modelo analise imagens fornecidas como URLs ou dados codificados em base64. O modelo pode descrever conteúdo de imagens, extrair texto (OCR), interpretar gráficos e diagramas, comparar múltiplas imagens e responder perguntas sobre conteúdo visual. As imagens são processadas como partes de conteúdo especiais dentro da API de chat completions, mantendo a estrutura de mensagens familiar.

Ao trabalhar com entradas multimodais, entender os custos de tokens é importante: os custos de análise de imagens variam por resolução. O parâmetro `detail` controla o processamento: `low` usa 85 tokens fixos independente do tamanho, enquanto `high` processa a imagem em resolução completa com custos proporcionais ao número de blocos 512×512 necessários para cobrir a imagem.

## Arquitetura

Este desafio gera imagens com DALL-E 3, analisa imagens com a visão do GPT-4o e explora capacidades de OCR e compreensão de gráficos.

![Topologia do Desafio 18](/img/ai-102/challenge-18-topology.svg)

## Pré-requisitos
- Recurso Azure OpenAI com modelo DALL-E 3 implantado (nome da implantação: `dall-e-3`)
- Recurso Azure OpenAI com modelo GPT-4o implantado (nome da implantação: `gpt-4o`)
- Python 3.9+ com pacote `openai` instalado
- .NET 8 SDK com pacote NuGet `Azure.AI.OpenAI`
- Imagens de exemplo para análise de visão (URLs ou arquivos locais)

## Implementação

### Tarefa 1: Gerar Imagens com DALL-E 3

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

### Tarefa 2: Analisar Imagens com Visão do GPT-4o (Entrada por URL)

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

### Tarefa 3: Extrair Texto de Imagens (OCR com Visão)

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

### Tarefa 4: Comparar Abordagens de Análise de Imagem

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

## Saída Esperada

```
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

## Quebrar e Corrigir

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| DALL-E retorna erro de filtro de conteúdo | `ContentFilterError` | Prompt acionou filtros de segurança | Reformule o prompt; evite conteúdo potencialmente sensível |
| URL da imagem retorna 400 | `Invalid image URL` | URL não é publicamente acessível | Use codificação base64 para imagens privadas |
| Visão retorna análise imprecisa | Descrições incorretas | Usando `detail: "low"` em imagens complexas | Mude para `detail: "high"` para análise detalhada |
| Contagem de tokens inesperadamente alta | Conta elevada para requisições de visão | Imagens de alta resolução com `detail: "high"` | Use `detail: "low"` quando resolução completa não é necessária |
| DALL-E n>1 falha | `InvalidRequestError` | DALL-E 3 suporta apenas n=1 | Defina n=1; faça múltiplas requisições para múltiplas imagens |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ch18-q1",
    question: "Quais tamanhos de imagem o DALL-E 3 suporta no Azure OpenAI?",
    options: [
      "256x256, 512x512, 1024x1024",
      "1024x1024, 1024x1792, 1792x1024",
      "512x512, 1024x1024, 2048x2048",
      "Qualquer resolução personalizada até 4096x4096"
    ],
    correctAnswer: 1,
    explanation: "O DALL-E 3 suporta três tamanhos fixos: 1024x1024 (quadrado), 1024x1792 (retrato) e 1792x1024 (paisagem). O DALL-E 2 mais antigo suportava 256x256 e 512x512, mas esses não estão disponíveis no DALL-E 3."
  },
  {
    id: "ch18-q2",
    question: "Como as imagens são fornecidas ao GPT-4o para análise de visão?",
    options: [
      "Como partes de conteúdo dentro do array de mensagens da API de chat completions",
      "Como uma chamada de API separada para um endpoint específico de visão",
      "Fazendo upload para Azure Blob Storage e fornecendo um token SAS",
      "Através da API Azure AI Vision apenas"
    ],
    correctAnswer: 0,
    explanation: "A visão do GPT-4o usa a API padrão de chat completions. As imagens são incluídas como partes de conteúdo (type: 'image_url') dentro das mensagens do usuário, junto com partes de texto. A imagem pode ser fornecida como URL ou URI de dados codificados em base64."
  },
  {
    id: "ch18-q3",
    question: "O que o parâmetro 'detail' controla ao enviar imagens para o GPT-4o?",
    options: [
      "A qualidade de saída das imagens geradas",
      "Se o modelo retorna análise estruturada ou não estruturada",
      "A resolução na qual o modelo processa a imagem, afetando o custo de tokens e a precisão",
      "O nível de compressão aplicado antes da transmissão"
    ],
    correctAnswer: 2,
    explanation: "O parâmetro 'detail' (low/high/auto) controla a resolução de processamento da imagem. 'low' usa 85 tokens fixos independente do tamanho. 'high' processa em resolução completa, com custos de tokens proporcionais ao número de blocos 512x512 necessários, fornecendo análise mais precisa."
  },
  {
    id: "ch18-q4",
    question: "O que é o campo 'revised_prompt' em uma resposta do DALL-E 3?",
    options: [
      "Uma sugestão de melhoria para a próxima vez",
      "O prompt original com correções ortográficas",
      "A versão automaticamente aprimorada do seu prompt pelo DALL-E 3 usada para a geração",
      "Uma versão filtrada pela moderação com conteúdo sinalizado removido"
    ],
    correctAnswer: 2,
    explanation: "O DALL-E 3 reescreve automaticamente os prompts para adicionar detalhes e melhorar a qualidade da geração. O campo 'revised_prompt' mostra o prompt aprimorado que foi realmente usado para gerar a imagem. Este é um recurso integrado e não pode ser desativado."
  },
  {
    id: "ch18-q5",
    question: "Por quanto tempo as URLs de imagens geradas pelo DALL-E 3 são válidas antes de expirarem?",
    options: [
      "1 hora",
      "7 dias",
      "Elas nunca expiram",
      "24 horas"
    ],
    correctAnswer: 3,
    explanation: "As URLs de imagens do DALL-E 3 são temporárias e expiram após 24 horas. Aplicações que precisam persistir as imagens devem baixá-las imediatamente após a geração e armazená-las em seu próprio storage (por exemplo, Azure Blob Storage)."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-challenge18 --yes --no-wait
```

## Saiba Mais
- [Referência da API DALL-E](https://learn.microsoft.com/azure/ai-services/openai/reference#image-generation)
- [Capacidades de visão do GPT-4o](https://learn.microsoft.com/azure/ai-services/openai/how-to/gpt-with-vision)
- [Cálculo de tokens de imagem](https://learn.microsoft.com/azure/ai-services/openai/overview#image-tokens-gpt-4o)
- [Filtragem de conteúdo para DALL-E](https://learn.microsoft.com/azure/ai-services/openai/concepts/content-filter)
- [Visão geral de modelos multimodais](https://learn.microsoft.com/azure/ai-services/openai/concepts/models#gpt-4o-and-gpt-4-turbo)
