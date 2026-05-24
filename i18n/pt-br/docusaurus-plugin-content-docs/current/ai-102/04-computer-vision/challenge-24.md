---
sidebar_position: 2
title: "Desafio 24: Azure AI Vision - Análise de Imagens"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 24: Azure AI Vision - Análise de Imagens

:::info Tempo Estimado
**45 min** | **Custo**: $1-2 (estimado) | **Domínio**: Implementar Soluções de Visão Computacional (10-15%)
:::

## Habilidades do exame abordadas
- Selecionar recursos visuais para atender requisitos
- Detectar objetos e gerar tags em imagens
- Incluir ou excluir recursos visuais na requisição de análise
- Interpretar respostas de análise de imagem incluindo scores de confiança

## Visão Geral

O Azure AI Vision Image Analysis 4.0 fornece uma API unificada para extrair informações visuais. Recursos disponíveis:

| Recurso | Descrição |
|---------|-----------|
| `caption` | Descrição em linguagem natural da imagem |
| `denseCaptions` | Legendas para múltiplas regiões |
| `tags` | Tags de conteúdo com scores de confiança |
| `objects` | Detecção de objetos com bounding boxes |
| `people` | Detecção de pessoas com bounding boxes |
| `read` | Extração de texto via OCR |
| `smartCrops` | Regiões de corte ideais para miniaturas |

A API retorna JSON estruturado com scores de confiança (0.0â€“1.0) para cada elemento detectado.

## Pré-requisitos
- Assinatura Azure
- Recurso multi-serviço Azure AI Services ou recurso Computer Vision
- Python 3.9+ ou .NET 8
- Pacote: `azure-ai-vision-imageanalysis` (v1.0+)

## Implementação

### Tarefa 1: Criar Recurso Azure AI Vision

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

### Tarefa 2: Analisar Imagem com Múltiplos Recursos

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

### Tarefa 3: Analisar Imagem Local com Smart Crops

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

## Saída Esperada

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

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| 415 Unsupported Media Type | Erro em arquivo local | Header Content-Type incorreto | Use `application/octet-stream` para binário, `application/json` para URL |
| Tags/objetos vazios | Nenhum resultado retornado | Imagem muito pequena ou desfocada | Mínimo 50x50 pixels; máximo 20MB |
| Erro `InvalidImageUrl` | 400 Bad Request | URL não acessível publicamente | Certifique-se de que a URL da imagem é acessível publicamente; use upload de arquivo local |
| Scores de confiança baixos | Resultados não confiáveis | Qualidade ou ambiguidade da imagem | Filtre resultados por limiar de confiança (ex: > 0.7) |
| Recurso não disponível | `FeatureNotSupported` | Região não suporta o recurso | Use regiões suportadas (East US, West Europe, etc.) |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual recurso visual fornece descrições em linguagem natural para múltiplas regiões dentro de uma imagem?",
    options: [
      "caption",
      "tags",
      "denseCaptions",
      "objects"
    ],
    correctAnswer: 2,
    explanation: "denseCaptions gera legendas para múltiplas regiões dentro de uma imagem, enquanto caption fornece uma única descrição para a imagem inteira."
  },
  {
    question: "O que o recurso smartCrops retorna?",
    options: [
      "Coordenadas de bounding box para regiões de corte ideais nas proporções especificadas",
      "Arquivos de imagem cortados nas resoluções especificadas",
      "Uma lista de objetos que devem ser excluídos do corte",
      "Versões redimensionadas automaticamente da imagem"
    ],
    correctAnswer: 0,
    explanation: "smartCrops retorna coordenadas de bounding box para as regiões de corte ideais nas proporções especificadas, garantindo que conteúdo importante seja preservado nas miniaturas."
  },
  {
    question: "Como os scores de confiança são expressos nas respostas do Image Analysis 4.0?",
    options: [
      "Como porcentagens de 0% a 100%",
      "Como valores inteiros de 1 a 10",
      "Como rótulos categóricos (baixo, médio, alto)",
      "Como valores de ponto flutuante de 0.0 a 1.0"
    ],
    correctAnswer: 3,
    explanation: "Os scores de confiança são valores de ponto flutuante entre 0.0 e 1.0, onde valores mais altos indicam maior confiança na detecção ou classificação."
  },
  {
    question: "Qual é o formato correto do endpoint da API para o Image Analysis 4.0?",
    options: [
      "POST /vision/v3.2/analyze",
      "POST /computervision/imageanalysis:analyze?api-version=2024-02-01",
      "POST /imageanalysis/v4.0/analyze",
      "GET /computervision/analyze?features=caption"
    ],
    correctAnswer: 1,
    explanation: "O Image Analysis 4.0 usa o formato de endpoint: POST /computervision/imageanalysis:analyze com features e api-version como parâmetros de query."
  },
  {
    question: "Qual parâmetro especifica quais informações extrair da imagem?",
    options: [
      "capabilities",
      "analysis_type",
      "extract_mode",
      "visual_features (SDK) / features (parâmetro de query REST)"
    ],
    correctAnswer: 3,
    explanation: "No SDK Python/C# você passa visual_features (uma lista de valores enum VisualFeatures); no REST você passa o parâmetro de query 'features' com nomes de recursos separados por vírgula."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-vision --yes --no-wait
```

## Saiba Mais

- [Visão geral do Image Analysis](https://learn.microsoft.com/azure/ai-services/computer-vision/overview-image-analysis)
- [Início rápido do SDK Image Analysis](https://learn.microsoft.com/azure/ai-services/computer-vision/quickstarts-sdk/image-analysis-client-library-40)
- [Referência de recursos visuais](https://learn.microsoft.com/azure/ai-services/computer-vision/concept-tag-images-40)
