---
sidebar_position: 4
title: "Desafio 26: Custom Vision - Detecção de Objetos"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 26: Custom Vision - Detecção de Objetos

:::info Tempo Estimado
**60 min** | **Custo**: $2-5 (estimado) | **Domínio**: Implementar Soluções de Visão Computacional (10-15%)
:::

## Habilidades do exame abordadas
- Treinar modelo de imagem personalizado para detecção de objetos
- Rotular imagens com regiões de bounding box
- Avaliar métricas de detecção (mAP)
- Publicar e consumir modelo de detecção de objetos

## Visão Geral

A detecção de objetos localiza e classifica múltiplos objetos dentro de uma imagem usando bounding boxes. Diferente da classificação (que responde "o que é esta imagem?"), a detecção responde "quais objetos estão aqui e onde?"

Conceitos-chave:
- **Bounding box**: Retângulo definido por (left, top, width, height) como coordenadas normalizadas (0.0–1.0)
- **IoU (Intersection over Union)**: Mede a sobreposição entre bounding boxes preditas e reais
- **mAP (mean Average Precision)**: Métrica principal que calcula a média do AP em todas as classes de objetos

## Pré-requisitos
- Assinatura Azure
- Recursos Custom Vision Training + Prediction
- Python 3.9+
- Pacote: `azure-cognitiveservices-vision-customvision`

## Implementação

### Tarefa 1: Criar Projeto de Detecção de Objetos

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

### Tarefa 2: Enviar Imagens com Regiões de Bounding Box

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

### Tarefa 3: Treinar e Avaliar Modelo de Detecção de Objetos

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

### Tarefa 4: Executar Predições de Detecção de Objetos

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

## Saída Esperada

```
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

## Quebrar e Corrigir

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Regiões rejeitadas | Coordenadas de região inválidas | Coordenadas fora do intervalo 0.0–1.0 | Normalize: left+width ≤ 1.0, top+height ≤ 1.0 |
| mAP baixo | Precisão de detecção ruim | Rotulagem inconsistente de bounding boxes | Re-rotule com boxes ajustados e consistentes; mais dados de treinamento |
| Detecções sobrepostas | Predições duplicadas | Sem limiar de NMS configurado | Aplique limiar de confiança; use Non-Maximum Suppression |
| Treinamento falha | `BadRequestImageRegions` | Regiões muito pequenas ou ausentes | Tamanho mínimo da região ~5% da área da imagem |
| Endpoint errado | 404 na detecção | Usando endpoint de classificação para detecção | Use `/detect/` e não `/classify/` na URL de predição |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Como as coordenadas de bounding box são representadas na detecção de objetos do Custom Vision?",
    options: [
      "Coordenadas normalizadas de 0.0 a 1.0 relativas às dimensões da imagem (left, top, width, height)",
      "Coordenadas absolutas em pixels (x, y, width, height)",
      "Valores percentuais de 0% a 100%",
      "Ponto central mais raio"
    ],
    correctAnswer: 0,
    explanation: "O Custom Vision usa coordenadas normalizadas (0.0 a 1.0) para bounding boxes: left, top, width, height — todos relativos às dimensões da imagem. Isso os torna independentes de resolução."
  },
  {
    question: "O que o mAP (mean Average Precision) mede na detecção de objetos?",
    options: [
      "O score médio de confiança em todas as detecções",
      "O número máximo de objetos detectados por imagem",
      "O tempo médio de processamento por imagem",
      "A média do Average Precision calculado independentemente para cada classe de objeto"
    ],
    correctAnswer: 3,
    explanation: "mAP é a média dos valores de AP calculados separadamente para cada classe, fornecendo uma métrica única que resume o desempenho de detecção em todas as categorias."
  },
  {
    question: "Qual é a diferença principal entre os endpoints de predição classify e detect?",
    options: [
      "Classify é mais rápido que detect",
      "Detect requer mais imagens de treinamento",
      "Classify retorna uma única tag; detect retorna múltiplas tags com coordenadas de bounding box",
      "Classify funciona com URLs; detect só funciona com arquivos locais"
    ],
    correctAnswer: 2,
    explanation: "O endpoint classify retorna tags para a imagem inteira. O endpoint detect retorna múltiplas predições de objetos, cada uma com uma tag E coordenadas de bounding box."
  },
  {
    question: "Para que é usado o IoU (Intersection over Union)?",
    options: [
      "Medir quanto dos dados de treinamento se sobrepõe entre classes",
      "Medir a sobreposição entre um bounding box predito e o box real para determinar se uma detecção está correta",
      "Calcular a proporção de imagens de entrada para saída",
      "Determinar quantos usuários estão acessando o modelo simultaneamente"
    ],
    correctAnswer: 1,
    explanation: "IoU mede a sobreposição entre bounding boxes preditos e reais. Uma detecção é tipicamente considerada correta se IoU > 0.5 (50% de sobreposição com o objeto real)."
  },
  {
    question: "Ao rotular imagens de treinamento para detecção de objetos, quais coordenadas são necessárias para cada objeto?",
    options: [
      "Apenas o ponto central do objeto",
      "As coordenadas em pixels dos quatro cantos",
      "Um contorno poligonal da forma do objeto",
      "Left, top, width e height do bounding box (normalizado 0.0–1.0) mais o tag ID"
    ],
    correctAnswer: 3,
    explanation: "Cada região requer: tag_id (qual classe de objeto), left, top, width, height — todos como valores normalizados entre 0.0 e 1.0 relativos às dimensões da imagem."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-customvision --yes --no-wait
```

## Saiba Mais

- [Visão geral da detecção de objetos](https://learn.microsoft.com/azure/ai-services/custom-vision-service/get-started-build-detector)
- [Como rotular imagens](https://learn.microsoft.com/azure/ai-services/custom-vision-service/getting-started-build-a-classifier)
- [Referência da API de Prediction](https://learn.microsoft.com/rest/api/customvision/prediction)
