---
sidebar_position: 6
title: "Desafio 28: DetecÃ§Ã£o e AnÃ¡lise Facial"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 28: DetecÃ§Ã£o e AnÃ¡lise Facial

:::info Tempo Estimado
**45 min** | **Custo**: $1-3 (estimado) | **DomÃ­nio**: Implementar SoluÃ§Ãµes de VisÃ£o Computacional (10-15%)
:::

:::caution Acesso Limitado
Os recursos de **identificaÃ§Ã£o** e **verificaÃ§Ã£o** facial requerem [aprovaÃ§Ã£o de Acesso Limitado](https://aka.ms/facerecognition). Este desafio foca nos recursos de **detecÃ§Ã£o** disponÃ­veis sem aprovaÃ§Ã£o.
:::

## Habilidades do exame abordadas
- Implementar soluÃ§Ãµes de detecÃ§Ã£o facial
- Detectar rostos e analisar atributos faciais
- Compreender as limitaÃ§Ãµes de IA responsÃ¡vel nos serviÃ§os faciais

## VisÃ£o Geral

O serviÃ§o Azure AI Face fornece detecÃ§Ã£o facial com anÃ¡lise de atributos. A detecÃ§Ã£o estÃ¡ disponÃ­vel sem restriÃ§Ãµes; identificaÃ§Ã£o/verificaÃ§Ã£o requerem aprovaÃ§Ã£o.

**Atributos de detecÃ§Ã£o** (disponÃ­veis sem Acesso Limitado):
- LocalizaÃ§Ã£o do rosto (bounding box)
- Pose da cabeÃ§a (pitch, roll, yaw)
- NÃ­vel de desfoque (low, medium, high)
- NÃ­vel de exposiÃ§Ã£o (underExposure, goodExposure, overExposure)
- NÃ­vel de ruÃ­do
- OclusÃ£o (testa, olhos, boca ocluÃ­dos)
- AcessÃ³rios (chapÃ©us, Ã³culos)
- Qualidade para reconhecimento

**Recursos restritos** (requerem aprovaÃ§Ã£o de Acesso Limitado):
- IdentificaÃ§Ã£o facial (correspondÃªncia 1:N)
- VerificaÃ§Ã£o facial (correspondÃªncia 1:1)
- Gerenciamento de PersonGroup

## PrÃ©-requisitos
- Assinatura Azure
- Recurso Azure AI Face
- Python 3.9+ ou .NET 8
- Pacote: `azure-ai-vision-face` (v1.0+)

## ImplementaÃ§Ã£o

### Tarefa 1: Criar Recurso Face

```bash
az group create --name rg-ai102-face --location eastus2

az cognitiveservices account create \
  --name face-ai102 \
  --resource-group rg-ai102-face \
  --kind Face \
  --sku S0 \
  --location eastus2

FACE_ENDPOINT=$(az cognitiveservices account show --name face-ai102 --resource-group rg-ai102-face --query properties.endpoint -o tsv)
FACE_KEY=$(az cognitiveservices account keys list --name face-ai102 --resource-group rg-ai102-face --query key1 -o tsv)
```

### Tarefa 2: Detectar Rostos e Analisar Atributos

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.ai.vision.face import FaceClient
from azure.ai.vision.face.models import (
    FaceDetectionModel,
    FaceRecognitionModel,
    FaceAttributeTypeDetection03
)
from azure.core.credentials import AzureKeyCredential

client = FaceClient(
    endpoint=os.environ["AZURE_AI_ENDPOINT"],
    credential=AzureKeyCredential(os.environ["AZURE_AI_KEY"])
)

# Detect faces with attributes
image_url = "https://learn.microsoft.com/azure/ai-services/computer-vision/media/face-detection/face-landmarks-annotated.png"

detected_faces = client.detect_from_url(
    url=image_url,
    detection_model=FaceDetectionModel.DETECTION_03,
    recognition_model=FaceRecognitionModel.RECOGNITION_04,
    return_face_id=False,
    return_face_attributes=[
        FaceAttributeTypeDetection03.HEAD_POSE,
        FaceAttributeTypeDetection03.BLUR,
        FaceAttributeTypeDetection03.EXPOSURE,
        FaceAttributeTypeDetection03.NOISE,
        FaceAttributeTypeDetection03.MASK,
        FaceAttributeTypeDetection03.QUALITY_FOR_RECOGNITION
    ]
)

print(f"Detected {len(detected_faces)} face(s):\n")

for i, face in enumerate(detected_faces):
    rect = face.face_rectangle
    print(f"Face {i+1}:")
    print(f"  Bounding box: left={rect.left}, top={rect.top}, "
          f"width={rect.width}, height={rect.height}")
    
    attrs = face.face_attributes
    if attrs:
        # Head pose
        pose = attrs.head_pose
        print(f"  Head pose: pitch={pose.pitch:.1f}, roll={pose.roll:.1f}, yaw={pose.yaw:.1f}")
        
        # Image quality attributes
        print(f"  Blur: {attrs.blur.blur_level} (value: {attrs.blur.value:.3f})")
        print(f"  Exposure: {attrs.exposure.exposure_level} (value: {attrs.exposure.value:.3f})")
        print(f"  Noise: {attrs.noise.noise_level} (value: {attrs.noise.value:.3f})")
        
        # Mask detection
        print(f"  Mask: type={attrs.mask.type}, covers_nose_and_mouth={attrs.mask.nose_and_mouth_covered}")
        
        # Recognition quality
        print(f"  Quality for recognition: {attrs.quality_for_recognition}")
    print()
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.Vision.Face;

var client = new FaceClient(
    new Uri(Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")),
    new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_AI_KEY")));

var imageUrl = new Uri("https://raw.githubusercontent.com/Azure-Samples/cognitive-services-sample-data-files/master/Face/images/detection1.jpg");

var response = client.Detect(
    imageUrl,
    FaceDetectionModel.Detection03,
    FaceRecognitionModel.Recognition04,
    returnFaceId: false,
    returnFaceAttributes: new[]
    {
        FaceAttributeType.HeadPose,
        FaceAttributeType.Blur,
        FaceAttributeType.Exposure,
        FaceAttributeType.Noise,
        FaceAttributeType.Mask,
        FaceAttributeType.QualityForRecognition
    });

foreach (var face in response.Value)
{
    var rect = face.FaceRectangle;
    Console.WriteLine($"Face: left={rect.Left}, top={rect.Top}, width={rect.Width}, height={rect.Height}");
    
    var attrs = face.FaceAttributes;
    Console.WriteLine($"  Head pose: pitch={attrs.HeadPose.Pitch:F1}, roll={attrs.HeadPose.Roll:F1}, yaw={attrs.HeadPose.Yaw:F1}");
    Console.WriteLine($"  Blur: {attrs.Blur.BlurLevel} ({attrs.Blur.Value:F3})");
    Console.WriteLine($"  Quality: {attrs.QualityForRecognition}");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="https://<resource>.cognitiveservices.azure.com"
KEY="<your-key>"

curl -s "${ENDPOINT}/face/v1.0/detect?detectionModel=detection_03&recognitionModel=recognition_04&returnFaceAttributes=headPose,blur,exposure,noise,mask,qualityForRecognition&returnFaceId=false" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://learn.microsoft.com/azure/ai-services/computer-vision/media/face-detection/face-landmarks-annotated.png"}' \
  | jq '.[0] | {faceRectangle, faceAttributes: {headPose: .faceAttributes.headPose, blur: .faceAttributes.blur, quality: .faceAttributes.qualityForRecognition}}'
```

</TabItem>
</Tabs>

### Tarefa 3: Detectar Rostos em Imagem Local

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Detect from local file
with open("group-photo.jpg", "rb") as f:
    image_data = f.read()

faces = client.detect(
    image_content=image_data,
    detection_model=FaceDetectionModel.DETECTION_03,
    recognition_model=FaceRecognitionModel.RECOGNITION_04,
    return_face_id=False,
    return_face_attributes=[
        FaceAttributeTypeDetection03.HEAD_POSE,
        FaceAttributeTypeDetection03.QUALITY_FOR_RECOGNITION
    ]
)

print(f"Found {len(faces)} faces in group photo")
for i, face in enumerate(faces):
    quality = face.face_attributes.quality_for_recognition
    print(f"  Face {i+1}: quality={quality} {'âœ“' if quality == 'high' else 'âš '}")
```

</TabItem>
</Tabs>

## SaÃ­da Esperada

```text
Detected 1 face(s):

Face 1:
  Bounding box: left=194, top=98, width=242, height=325
  Head pose: pitch=-2.3, roll=1.5, yaw=-4.2
  Blur: low (value: 0.042)
  Exposure: goodExposure (value: 0.623)
  Noise: low (value: 0.089)
  Mask: type=noMask, covers_nose_and_mouth=False
  Quality for recognition: high

Found 5 faces in group photo
  Face 1: quality=high âœ“
  Face 2: quality=high âœ“
  Face 3: quality=medium âš 
  Face 4: quality=high âœ“
  Face 5: quality=low âš 
```

## Quebra & conserta

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| Nenhum rosto detectado | Array vazio retornado | Rosto muito pequeno (< 36x36 px) ou severamente ocluÃ­do | Garanta rostos com pelo menos 36x36 pixels; use maior resoluÃ§Ã£o |
| 403 Forbidden no identify | Acesso negado | Recurso requer aprovaÃ§Ã£o de Acesso Limitado | Solicite em https://aka.ms/facerecognition; use apenas detecÃ§Ã£o |
| Erro `InvalidImage` | 400 Bad Request | Formato de imagem nÃ£o suportado ou corrompido | Use JPEG, PNG, GIF ou BMP; mÃ¡ximo 6MB |
| Modelo de detecÃ§Ã£o errado | Atributos ausentes | Detection_01 nÃ£o suporta todos os atributos | Use `detection_03` para suporte mais recente de atributos |
| Resultados inconsistentes | Contagens diferentes de rostos | DiferenÃ§as entre modelos de detecÃ§Ã£o | Use um modelo de detecÃ§Ã£o consistentemente |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Quais recursos do serviÃ§o Face requerem aprovaÃ§Ã£o de Acesso Limitado?",
    options: [
      "DetecÃ§Ã£o facial e anÃ¡lise de atributos",
      "DetecÃ§Ã£o de bounding box e pose da cabeÃ§a",
      "DetecÃ§Ã£o de desfoque, exposiÃ§Ã£o e ruÃ­do",
      "IdentificaÃ§Ã£o facial (1:N) e verificaÃ§Ã£o (1:1)"
    ],
    correctAnswer: 3,
    explanation: "IdentificaÃ§Ã£o facial (correspondÃªncia contra um grupo) e verificaÃ§Ã£o (comparaÃ§Ã£o de dois rostos) requerem aprovaÃ§Ã£o de Acesso Limitado. DetecÃ§Ã£o e anÃ¡lise de atributos estÃ£o disponÃ­veis sem aprovaÃ§Ã£o."
  },
  {
    question: "Qual Ã© o tamanho mÃ­nimo detectÃ¡vel de rosto no serviÃ§o Azure Face?",
    options: [
      "36x36 pixels",
      "10x10 pixels",
      "100x100 pixels",
      "200x200 pixels"
    ],
    correctAnswer: 0,
    explanation: "O tamanho mÃ­nimo de rosto para detecÃ§Ã£o Ã© 36x36 pixels. Para melhor anÃ¡lise de atributos, regiÃµes faciais maiores (idealmente 200x200+) sÃ£o recomendadas."
  },
  {
    question: "Qual modelo de detecÃ§Ã£o vocÃª deve usar para o suporte mais completo de atributos?",
    options: [
      "detection_01",
      "detection_02",
      "detection_03",
      "detection_04"
    ],
    correctAnswer: 2,
    explanation: "Detection_03 fornece o melhor suporte a atributos incluindo detecÃ§Ã£o de mÃ¡scara, pose da cabeÃ§a, desfoque, exposiÃ§Ã£o e qualidade para reconhecimento."
  },
  {
    question: "O que 'qualityForRecognition' indica?",
    options: [
      "A qualidade geral da imagem (resoluÃ§Ã£o, compressÃ£o)",
      "QuÃ£o adequado o rosto detectado Ã© para tarefas de identificaÃ§Ã£o/verificaÃ§Ã£o (low, medium, high)",
      "O score de confianÃ§a da detecÃ§Ã£o facial em si",
      "Se a imagem atende aos requisitos mÃ­nimos de tamanho"
    ],
    correctAnswer: 1,
    explanation: "qualityForRecognition indica se a qualidade da imagem facial Ã© suficiente para reconhecimento (identificaÃ§Ã£o/verificaÃ§Ã£o) â€” classificada como low, medium ou high baseada em pose, desfoque e oclusÃ£o."
  },
  {
    question: "Qual Ã© a diferenÃ§a entre detecÃ§Ã£o facial e identificaÃ§Ã£o facial?",
    options: [
      "DetecÃ§Ã£o Ã© mais rÃ¡pida; identificaÃ§Ã£o Ã© mais precisa",
      "DetecÃ§Ã£o funciona em vÃ­deo; identificaÃ§Ã£o funciona em imagens",
      "NÃ£o hÃ¡ diferenÃ§a â€” sÃ£o a mesma operaÃ§Ã£o",
      "DetecÃ§Ã£o localiza rostos e retorna atributos; identificaÃ§Ã£o compara rostos contra um grupo de pessoas conhecido"
    ],
    correctAnswer: 3,
    explanation: "DetecÃ§Ã£o encontra rostos em uma imagem e retorna localizaÃ§Ãµes + atributos. IdentificaÃ§Ã£o pega um rosto detectado e o compara contra um PersonGroup para determinar QUEM Ã© a pessoa."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-face --yes --no-wait
```

## Saiba Mais

- [VisÃ£o geral do serviÃ§o Face](https://learn.microsoft.com/azure/ai-services/computer-vision/overview-identity)
- [Conceitos de detecÃ§Ã£o facial](https://learn.microsoft.com/azure/ai-services/computer-vision/concept-face-detection)
- [Uso responsÃ¡vel do Face](https://learn.microsoft.com/azure/ai-services/computer-vision/responsible-use-identity)
- [PolÃ­tica de Acesso Limitado](https://learn.microsoft.com/azure/ai-services/cognitive-services-limited-access)
