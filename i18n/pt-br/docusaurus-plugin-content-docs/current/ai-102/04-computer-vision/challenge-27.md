---
sidebar_position: 5
title: "Desafio 27: OCR - Extrair Texto de Imagens"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 27: OCR - Extrair Texto de Imagens

:::info Tempo Estimado
**45 min** | **Custo**: $1-3 (estimado) | **DomÃ­nio**: Implementar SoluÃ§Ãµes de VisÃ£o Computacional (10-15%)
:::

## Habilidades do exame abordadas
- Extrair texto de imagens usando o recurso Read do Azure AI Vision
- Converter texto manuscrito em texto digital
- Processar documentos de mÃºltiplas pÃ¡ginas

## VisÃ£o Geral

O recurso **Read** do Azure AI Vision (parte do Image Analysis 4.0) extrai texto impresso e manuscrito de imagens e documentos. A hierarquia do texto:

```text
Imagem â†’ Blocks â†’ Lines â†’ Words (com polÃ­gonos delimitadores e confianÃ§a)
```

CaracterÃ­sticas principais:
- Suporta 164+ idiomas para texto impresso, 9 idiomas para manuscrito
- Lida com texto rotacionado, inclinado e com ruÃ­do
- Retorna polÃ­gonos delimitadores para cada elemento de texto
- API sÃ­ncrona para imagens individuais

Para PDFs de mÃºltiplas pÃ¡ginas, use o modelo Read do Azure AI Document Intelligence.

## PrÃ©-requisitos
- Assinatura Azure
- Recurso Azure AI Services
- Python 3.9+ ou .NET 8
- Pacote: `azure-ai-vision-imageanalysis` (v1.0+)

## ImplementaÃ§Ã£o

### Tarefa 1: Extrair Texto Impresso de Imagens

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

### Tarefa 2: Extrair Texto Manuscrito

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
            confidence_indicator = "âœ“" if avg_confidence > 0.8 else "?"
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

### Tarefa 3: Processar Documento de MÃºltiplas PÃ¡ginas com Document Intelligence

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

## SaÃ­da Esperada

```text
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
  [âœ“] 'Meeting notes - January 2024' (avg conf: 0.892)
  [?] 'discuss quarterly goals' (avg conf: 0.734)
  [âœ“] 'Action items below' (avg conf: 0.856)

Document contains 3 pages
--- Page 1 (8.5x11.0 inch) ---
  'Annual Report 2024'
  'Executive Summary'
```

## Quebra & conserta

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| Nenhum texto detectado | Resultados vazios | Imagem muito pequena ou baixa qualidade | MÃ­n 50x50 px; garanta resoluÃ§Ã£o adequada (300 DPI para impressÃ£o) |
| Idioma errado detectado | Texto ilegÃ­vel | AutodetecÃ§Ã£o falhou para scripts raros | Especifique o parÃ¢metro `language` na requisiÃ§Ã£o |
| ConfianÃ§a baixa nas palavras | Resultados incertos | Qualidade da escrita manual ou fontes incomuns | Aceite limiares mais baixos para manuscrito; prÃ©-processe a imagem |
| 413 Request Entity Too Large | Arquivo rejeitado | Imagem excede o limite de 20MB | Comprima ou redimensione a imagem antes do envio |
| PolÃ­gonos delimitadores incorretos | Boxes desalinhados | RotaÃ§Ã£o da imagem nÃ£o detectada | Use auto-rotaÃ§Ã£o ou prÃ©-processe para corrigir inclinaÃ§Ã£o |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual Ã© a hierarquia de texto retornada pelo recurso Read do Azure AI Vision?",
    options: [
      "Document â†’ Paragraphs â†’ Sentences â†’ Words",
      "Pages â†’ Columns â†’ Rows â†’ Characters",
      "Blocks â†’ Lines â†’ Words (cada um com polÃ­gonos delimitadores e confianÃ§a)",
      "Regions â†’ Paragraphs â†’ Lines â†’ Characters"
    ],
    correctAnswer: 2,
    explanation: "O recurso Read retorna: Blocks (regiÃµes de texto) â†’ Lines (linhas de texto) â†’ Words (palavras individuais com polÃ­gonos delimitadores e scores de confianÃ§a)."
  },
  {
    question: "Qual Ã© o tamanho mÃ¡ximo de imagem suportado pelo recurso Read do Image Analysis?",
    options: [
      "20MB com mÃ­nimo de 50x50 pixels",
      "5MB",
      "100MB",
      "10MB com mÃ­nimo de 100x100 pixels"
    ],
    correctAnswer: 0,
    explanation: "O Image Analysis suporta imagens de atÃ© 20MB com dimensÃ£o mÃ­nima de 50x50 pixels."
  },
  {
    question: "Para documentos PDF de mÃºltiplas pÃ¡ginas, qual serviÃ§o Azure vocÃª deve usar para extraÃ§Ã£o de texto?",
    options: [
      "Recurso Read do Azure AI Vision Image Analysis",
      "Azure AI Document Intelligence com o modelo prebuilt-read",
      "Skill de OCR do Azure Cognitive Search",
      "API OCR v3.2 do Azure AI Vision"
    ],
    correctAnswer: 1,
    explanation: "O modelo prebuilt-read do Document Intelligence lida com PDFs de mÃºltiplas pÃ¡ginas com resultados por pÃ¡gina. O Read do Image Analysis Ã© para imagens individuais."
  },
  {
    question: "Como a API indica incerteza no reconhecimento de texto manuscrito?",
    options: [
      "Marca palavras com uma flag 'uncertain'",
      "Retorna sugestÃµes alternativas de texto",
      "Destaca regiÃµes incertas em vermelho",
      "Cada palavra tem um score de confianÃ§a (0.0-1.0); manuscrito tipicamente pontua mais baixo que impresso"
    ],
    correctAnswer: 3,
    explanation: "Cada palavra inclui um score de confianÃ§a de 0.0 a 1.0. Texto manuscrito tipicamente retorna scores de confianÃ§a mais baixos que texto impresso devido Ã  variabilidade."
  },
  {
    question: "Qual header Content-Type vocÃª deve usar ao enviar um arquivo de imagem local para OCR?",
    options: [
      "application/octet-stream com dados binÃ¡rios brutos",
      "application/json com imagem codificada em base64",
      "multipart/form-data com anexo de arquivo",
      "image/jpeg ou image/png correspondente ao formato do arquivo"
    ],
    correctAnswer: 0,
    explanation: "Ao enviar dados binÃ¡rios de imagem diretamente, use Content-Type: application/octet-stream. Ao enviar uma URL de imagem, use application/json."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-vision --yes --no-wait
```

## Saiba Mais

- [Ler texto de imagens](https://learn.microsoft.com/azure/ai-services/computer-vision/concept-ocr)
- [InÃ­cio rÃ¡pido do Image Analysis](https://learn.microsoft.com/azure/ai-services/computer-vision/quickstarts-sdk/image-analysis-client-library-40)
- [Modelo Read do Document Intelligence](https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-read)
