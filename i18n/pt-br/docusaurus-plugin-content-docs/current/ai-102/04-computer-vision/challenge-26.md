---
sidebar_position: 4
title: "Desafio 26: Custom Vision - DetecÃ§Ã£o de Objetos"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 26: Custom Vision - DetecÃ§Ã£o de Objetos

:::info Tempo Estimado
**60 min** | **Custo**: $2-5 (estimado) | **DomÃ­nio**: Implementar SoluÃ§Ãµes de VisÃ£o Computacional (10-15%)
:::

## Habilidades do exame abordadas
- Treinar modelo de imagem personalizado para detecÃ§Ã£o de objetos
- Rotular imagens com regiÃµes de bounding box
- Avaliar mÃ©tricas de detecÃ§Ã£o (mAP)
- Publicar e consumir modelo de detecÃ§Ã£o de objetos

## VisÃ£o Geral

A detecÃ§Ã£o de objetos localiza e classifica mÃºltiplos objetos dentro de uma imagem usando bounding boxes. Diferente da classificaÃ§Ã£o (que responde "o que Ã© esta imagem?"), a detecÃ§Ã£o responde "quais objetos estÃ£o aqui e onde?"

Conceitos-chave:
- **Bounding box**: RetÃ¢ngulo definido por (left, top, width, height) como coordenadas normalizadas (0.0â€“1.0)
- **IoU (Intersection over Union)**: Mede a sobreposiÃ§Ã£o entre bounding boxes preditas e reais
- **mAP (mean Average Precision)**: MÃ©trica principal que calcula a mÃ©dia do AP em todas as classes de objetos

## PrÃ©-requisitos
- Assinatura Azure
- Recursos Custom Vision Training + Prediction
- Python 3.9+
- Pacote: `azure-cognitiveservices-vision-customvision`

## ImplementaÃ§Ã£o

### Tarefa 1: Criar Projeto de DetecÃ§Ã£o de Objetos

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import time
from azure.cognitiveservices.vision.customvision.training import CustomVisionTrainingClient
from azure.cognitiveservices.vision.customvision.training.models import (
    ImageUrlCreateEntry, Region
)
from azure.cognitiveservices.vision.customvision.prediction import CustomVisionPredictionClient
from msrest.authentication import ApiKeyCredentials

training_key = os.environ["CUSTOM_VISION_TRAINING_KEY"]
training_endpoint = os.environ["CUSTOM_VISION_TRAINING_ENDPOINT"]

credentials = ApiKeyCredentials(in_headers={"Training-key": training_key})
trainer = CustomVisionTrainingClient(training_endpoint, credentials)

# Find the Object Detection domain
domains = trainer.get_domains()
obj_detection_domain = next(d for d in domains if d.type == "ObjectDetection" and not d.exportable)
print(f"Domain: {obj_detection_domain.name} ({obj_detection_domain.id})")

# Create object detection project
project = trainer.create_project(
    name="Vehicle-Detector",
    domain_id=obj_detection_domain.id
)
print(f"Created project: {project.name} ({project.id})")

# Create tags for objects to detect
car_tag = trainer.create_tag(project.id, "car")
truck_tag = trainer.create_tag(project.id, "truck")
bicycle_tag = trainer.create_tag(project.id, "bicycle")
print(f"Tags: car={car_tag.id}, truck={truck_tag.id}, bicycle={bicycle_tag.id}")
```

</TabItem>
</Tabs>

### Tarefa 2: Enviar Imagens com RegiÃµes de Bounding Box

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Regions use normalized coordinates (0.0 to 1.0 relative to image dimensions)
# Format: Region(tag_id, left, top, width, height)

training_images = [
    {
        "url": "https://example.com/traffic1.jpg",
        "regions": [
            Region(tag_id=car_tag.id, left=0.1, top=0.3, width=0.25, height=0.2),
            Region(tag_id=car_tag.id, left=0.5, top=0.35, width=0.2, height=0.18),
            Region(tag_id=truck_tag.id, left=0.7, top=0.2, width=0.28, height=0.3),
        ]
    },
    {
        "url": "https://example.com/traffic2.jpg",
        "regions": [
            Region(tag_id=bicycle_tag.id, left=0.05, top=0.4, width=0.15, height=0.25),
            Region(tag_id=car_tag.id, left=0.4, top=0.3, width=0.3, height=0.22),
        ]
    }
]

# Upload images with regions
image_entries = []
for img in training_images:
    entry = ImageUrlCreateEntry(
        url=img["url"],
        regions=img["regions"]
    )
    image_entries.append(entry)

upload_result = trainer.create_images_from_urls(
    project.id,
    images=image_entries
)
print(f"Upload success: {upload_result.is_batch_successful}")
for image in upload_result.images:
    print(f"  {image.source_url}: {image.status}")
```

</TabItem>
</Tabs>

### Tarefa 3: Treinar e Avaliar Modelo de DetecÃ§Ã£o de Objetos

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Train the model
print("Training object detection model...")
iteration = trainer.train_project(project.id)

while iteration.status != "Completed":
    iteration = trainer.get_iteration(project.id, iteration.id)
    print(f"  Status: {iteration.status}")
    time.sleep(10)

print(f"Training complete: {iteration.id}")

# Evaluate performance
performance = trainer.get_iteration_performance(project.id, iteration.id)
print(f"\nDetection Metrics:")
print(f"  Precision: {performance.precision:.4f}")
print(f"  Recall: {performance.recall:.4f}")
print(f"  mAP: {performance.average_precision:.4f}")

for tag_perf in performance.per_tag_performance:
    print(f"  '{tag_perf.name}': precision={tag_perf.precision:.3f}, recall={tag_perf.recall:.3f}, AP={tag_perf.average_precision:.3f}")

# Publish
prediction_resource_id = "/subscriptions/<sub-id>/resourceGroups/rg-ai102-customvision/providers/Microsoft.CognitiveServices/accounts/cv-prediction-ai102"
publish_name = "vehicle-detector-v1"

trainer.publish_iteration(project.id, iteration.id, publish_name, prediction_resource_id)
print(f"\nPublished as: {publish_name}")
```

</TabItem>
</Tabs>

### Tarefa 4: Executar PrediÃ§Ãµes de DetecÃ§Ã£o de Objetos

<Tabs>
<TabItem value="python" label="Python SDK">

```python
prediction_key = os.environ["CUSTOM_VISION_PREDICTION_KEY"]
prediction_endpoint = os.environ["CUSTOM_VISION_PREDICTION_ENDPOINT"]

pred_credentials = ApiKeyCredentials(in_headers={"Prediction-key": prediction_key})
predictor = CustomVisionPredictionClient(prediction_endpoint, pred_credentials)

# Detect objects in a new image
test_url = "https://example.com/street-scene.jpg"
results = predictor.detect_image_url(project.id, publish_name, url=test_url)

print(f"\nDetection Results:")
print(f"Objects found: {len(results.predictions)}")

for detection in results.predictions:
    if detection.probability > 0.5:  # Confidence threshold
        bbox = detection.bounding_box
        print(f"  {detection.tag_name} ({detection.probability:.1%})")
        print(f"    Box: left={bbox.left:.3f}, top={bbox.top:.3f}, "
              f"width={bbox.width:.3f}, height={bbox.height:.3f}")

# Convert normalized to pixel coordinates (for a 1920x1080 image)
image_width, image_height = 1920, 1080
for detection in results.predictions:
    if detection.probability > 0.5:
        bbox = detection.bounding_box
        pixel_left = int(bbox.left * image_width)
        pixel_top = int(bbox.top * image_height)
        pixel_width = int(bbox.width * image_width)
        pixel_height = int(bbox.height * image_height)
        print(f"  {detection.tag_name}: ({pixel_left}, {pixel_top}) -> ({pixel_left+pixel_width}, {pixel_top+pixel_height})")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
PREDICTION_ENDPOINT="https://<resource>.cognitiveservices.azure.com"
PREDICTION_KEY="<key>"
PROJECT_ID="<project-id>"

curl -s "${PREDICTION_ENDPOINT}/customvision/v3.0/prediction/${PROJECT_ID}/detect/iterations/vehicle-detector-v1/url" \
  -H "Prediction-Key: ${PREDICTION_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/street-scene.jpg"}' \
  | jq '.predictions[] | select(.probability > 0.5) | {tag: .tagName, probability: .probability, boundingBox}'
```

</TabItem>
</Tabs>

## SaÃ­da Esperada

```text
Domain: General (Object Detection)
Created project: Vehicle-Detector
Tags: car=..., truck=..., bicycle=...
Upload success: True

Training object detection model...
  Status: Training
  Status: Completed
Training complete: iter-67890

Detection Metrics:
  Precision: 0.8850
  Recall: 0.8200
  mAP: 0.8734
  'car': precision=0.920, recall=0.880, AP=0.910
  'truck': precision=0.870, recall=0.790, AP=0.850
  'bicycle': precision=0.865, recall=0.770, AP=0.860

Published as: vehicle-detector-v1

Detection Results:
Objects found: 4
  car (95.2%)
    Box: left=0.102, top=0.298, width=0.245, height=0.198
  car (87.3%)
    Box: left=0.510, top=0.320, width=0.190, height=0.175
  truck (82.1%)
    Box: left=0.720, top=0.180, width=0.260, height=0.310
```

## Quebra & conserta

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| RegiÃµes rejeitadas | Coordenadas de regiÃ£o invÃ¡lidas | Coordenadas fora do intervalo 0.0â€“1.0 | Normalize: left+width â‰¤ 1.0, top+height â‰¤ 1.0 |
| mAP baixo | PrecisÃ£o de detecÃ§Ã£o ruim | Rotulagem inconsistente de bounding boxes | Re-rotule com boxes ajustados e consistentes; mais dados de treinamento |
| DetecÃ§Ãµes sobrepostas | PrediÃ§Ãµes duplicadas | Sem limiar de NMS configurado | Aplique limiar de confianÃ§a; use Non-Maximum Suppression |
| Treinamento falha | `BadRequestImageRegions` | RegiÃµes muito pequenas ou ausentes | Tamanho mÃ­nimo da regiÃ£o ~5% da Ã¡rea da imagem |
| Endpoint errado | 404 na detecÃ§Ã£o | Usando endpoint de classificaÃ§Ã£o para detecÃ§Ã£o | Use `/detect/` e nÃ£o `/classify/` na URL de prediÃ§Ã£o |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Como as coordenadas de bounding box sÃ£o representadas na detecÃ§Ã£o de objetos do Custom Vision?",
    options: [
      "Coordenadas normalizadas de 0.0 a 1.0 relativas Ã s dimensÃµes da imagem (left, top, width, height)",
      "Coordenadas absolutas em pixels (x, y, width, height)",
      "Valores percentuais de 0% a 100%",
      "Ponto central mais raio"
    ],
    correctAnswer: 0,
    explanation: "O Custom Vision usa coordenadas normalizadas (0.0 a 1.0) para bounding boxes: left, top, width, height â€” todos relativos Ã s dimensÃµes da imagem. Isso os torna independentes de resoluÃ§Ã£o."
  },
  {
    question: "O que o mAP (mean Average Precision) mede na detecÃ§Ã£o de objetos?",
    options: [
      "O score mÃ©dio de confianÃ§a em todas as detecÃ§Ãµes",
      "O nÃºmero mÃ¡ximo de objetos detectados por imagem",
      "O tempo mÃ©dio de processamento por imagem",
      "A mÃ©dia do Average Precision calculado independentemente para cada classe de objeto"
    ],
    correctAnswer: 3,
    explanation: "mAP Ã© a mÃ©dia dos valores de AP calculados separadamente para cada classe, fornecendo uma mÃ©trica Ãºnica que resume o desempenho de detecÃ§Ã£o em todas as categorias."
  },
  {
    question: "Qual Ã© a diferenÃ§a principal entre os endpoints de prediÃ§Ã£o classify e detect?",
    options: [
      "Classify Ã© mais rÃ¡pido que detect",
      "Detect requer mais imagens de treinamento",
      "Classify retorna uma Ãºnica tag; detect retorna mÃºltiplas tags com coordenadas de bounding box",
      "Classify funciona com URLs; detect sÃ³ funciona com arquivos locais"
    ],
    correctAnswer: 2,
    explanation: "O endpoint classify retorna tags para a imagem inteira. O endpoint detect retorna mÃºltiplas prediÃ§Ãµes de objetos, cada uma com uma tag E coordenadas de bounding box."
  },
  {
    question: "Para que Ã© usado o IoU (Intersection over Union)?",
    options: [
      "Medir quanto dos dados de treinamento se sobrepÃµe entre classes",
      "Medir a sobreposiÃ§Ã£o entre um bounding box predito e o box real para determinar se uma detecÃ§Ã£o estÃ¡ correta",
      "Calcular a proporÃ§Ã£o de imagens de entrada para saÃ­da",
      "Determinar quantos usuÃ¡rios estÃ£o acessando o modelo simultaneamente"
    ],
    correctAnswer: 1,
    explanation: "IoU mede a sobreposiÃ§Ã£o entre bounding boxes preditos e reais. Uma detecÃ§Ã£o Ã© tipicamente considerada correta se IoU > 0.5 (50% de sobreposiÃ§Ã£o com o objeto real)."
  },
  {
    question: "Ao rotular imagens de treinamento para detecÃ§Ã£o de objetos, quais coordenadas sÃ£o necessÃ¡rias para cada objeto?",
    options: [
      "Apenas o ponto central do objeto",
      "As coordenadas em pixels dos quatro cantos",
      "Um contorno poligonal da forma do objeto",
      "Left, top, width e height do bounding box (normalizado 0.0â€“1.0) mais o tag ID"
    ],
    correctAnswer: 3,
    explanation: "Cada regiÃ£o requer: tag_id (qual classe de objeto), left, top, width, height â€” todos como valores normalizados entre 0.0 e 1.0 relativos Ã s dimensÃµes da imagem."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-customvision --yes --no-wait
```

## Saiba Mais

- [VisÃ£o geral da detecÃ§Ã£o de objetos](https://learn.microsoft.com/azure/ai-services/custom-vision-service/get-started-build-detector)
- [Como rotular imagens](https://learn.microsoft.com/azure/ai-services/custom-vision-service/getting-started-build-a-classifier)
- [ReferÃªncia da API de Prediction](https://learn.microsoft.com/rest/api/customvision/prediction)
