---
sidebar_position: 6
title: "Desafio 28: Detecção e Análise Facial"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 28: Detecção e Análise Facial

:::info Tempo Estimado
**45 min** | **Custo**: $1-3 (estimado) | **Domínio**: Implementar Soluções de Visão Computacional (10-15%)
:::

:::caution Acesso Limitado
Os recursos de **identificação** e **verificação** facial requerem [aprovação de Acesso Limitado](https://aka.ms/facerecognition). Este desafio foca nos recursos de **detecção** disponíveis sem aprovação.
:::

## Habilidades do exame abordadas
- Implementar soluções de detecção facial
- Detectar rostos e analisar atributos faciais
- Compreender as limitações de IA responsável nos serviços faciais

## Visão Geral

O serviço Azure AI Face fornece detecção facial com análise de atributos. A detecção está disponível sem restrições; identificação/verificação requerem aprovação.

**Atributos de detecção** (disponíveis sem Acesso Limitado):
- Localização do rosto (bounding box)
- Pose da cabeça (pitch, roll, yaw)
- Nível de desfoque (low, medium, high)
- Nível de exposição (underExposure, goodExposure, overExposure)
- Nível de ruído
- Oclusão (testa, olhos, boca ocluídos)
- Acessórios (chapéus, óculos)
- Qualidade para reconhecimento

**Recursos restritos** (requerem aprovação de Acesso Limitado):
- Identificação facial (correspondência 1:N)
- Verificação facial (correspondência 1:1)
- Gerenciamento de PersonGroup

## Pré-requisitos
- Assinatura Azure
- Recurso Azure AI Face
- Python 3.9+ ou .NET 8
- Pacote: `azure-ai-vision-face` (v1.0+)

## Implementação

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
    print(f"  Face {i+1}: quality={quality} {'✓' if quality == 'high' else '⚠'}")
```

</TabItem>
</Tabs>

## Saída Esperada

```
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
  Face 1: quality=high ✓
  Face 2: quality=high ✓
  Face 3: quality=medium ⚠
  Face 4: quality=high ✓
  Face 5: quality=low ⚠
```

## Quebrar e Corrigir

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Nenhum rosto detectado | Array vazio retornado | Rosto muito pequeno (< 36x36 px) ou severamente ocluído | Garanta rostos com pelo menos 36x36 pixels; use maior resolução |
| 403 Forbidden no identify | Acesso negado | Recurso requer aprovação de Acesso Limitado | Solicite em https://aka.ms/facerecognition; use apenas detecção |
| Erro `InvalidImage` | 400 Bad Request | Formato de imagem não suportado ou corrompido | Use JPEG, PNG, GIF ou BMP; máximo 6MB |
| Modelo de detecção errado | Atributos ausentes | Detection_01 não suporta todos os atributos | Use `detection_03` para suporte mais recente de atributos |
| Resultados inconsistentes | Contagens diferentes de rostos | Diferenças entre modelos de detecção | Use um modelo de detecção consistentemente |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Quais recursos do serviço Face requerem aprovação de Acesso Limitado?",
    options: [
      "Detecção facial e análise de atributos",
      "Detecção de bounding box e pose da cabeça",
      "Detecção de desfoque, exposição e ruído",
      "Identificação facial (1:N) e verificação (1:1)"
    ],
    correctAnswer: 3,
    explanation: "Identificação facial (correspondência contra um grupo) e verificação (comparação de dois rostos) requerem aprovação de Acesso Limitado. Detecção e análise de atributos estão disponíveis sem aprovação."
  },
  {
    question: "Qual é o tamanho mínimo detectável de rosto no serviço Azure Face?",
    options: [
      "36x36 pixels",
      "10x10 pixels",
      "100x100 pixels",
      "200x200 pixels"
    ],
    correctAnswer: 0,
    explanation: "O tamanho mínimo de rosto para detecção é 36x36 pixels. Para melhor análise de atributos, regiões faciais maiores (idealmente 200x200+) são recomendadas."
  },
  {
    question: "Qual modelo de detecção você deve usar para o suporte mais completo de atributos?",
    options: [
      "detection_01",
      "detection_02",
      "detection_03",
      "detection_04"
    ],
    correctAnswer: 2,
    explanation: "Detection_03 fornece o melhor suporte a atributos incluindo detecção de máscara, pose da cabeça, desfoque, exposição e qualidade para reconhecimento."
  },
  {
    question: "O que 'qualityForRecognition' indica?",
    options: [
      "A qualidade geral da imagem (resolução, compressão)",
      "Quão adequado o rosto detectado é para tarefas de identificação/verificação (low, medium, high)",
      "O score de confiança da detecção facial em si",
      "Se a imagem atende aos requisitos mínimos de tamanho"
    ],
    correctAnswer: 1,
    explanation: "qualityForRecognition indica se a qualidade da imagem facial é suficiente para reconhecimento (identificação/verificação) — classificada como low, medium ou high baseada em pose, desfoque e oclusão."
  },
  {
    question: "Qual é a diferença entre detecção facial e identificação facial?",
    options: [
      "Detecção é mais rápida; identificação é mais precisa",
      "Detecção funciona em vídeo; identificação funciona em imagens",
      "Não há diferença — são a mesma operação",
      "Detecção localiza rostos e retorna atributos; identificação compara rostos contra um grupo de pessoas conhecido"
    ],
    correctAnswer: 3,
    explanation: "Detecção encontra rostos em uma imagem e retorna localizações + atributos. Identificação pega um rosto detectado e o compara contra um PersonGroup para determinar QUEM é a pessoa."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-face --yes --no-wait
```

## Saiba Mais

- [Visão geral do serviço Face](https://learn.microsoft.com/azure/ai-services/computer-vision/overview-identity)
- [Conceitos de detecção facial](https://learn.microsoft.com/azure/ai-services/computer-vision/concept-face-detection)
- [Uso responsável do Face](https://learn.microsoft.com/azure/ai-services/computer-vision/responsible-use-identity)
- [Política de Acesso Limitado](https://learn.microsoft.com/azure/ai-services/cognitive-services-limited-access)
