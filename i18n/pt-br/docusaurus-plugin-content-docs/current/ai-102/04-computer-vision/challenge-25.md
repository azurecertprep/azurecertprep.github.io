---
sidebar_position: 3
title: "Desafio 25: Custom Vision - Classificação de Imagens"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 25: Custom Vision - Classificação de Imagens

:::info Tempo Estimado
**60 min** | **Custo**: $2-5 (estimado) | **Domínio**: Implementar Soluções de Visão Computacional (10-15%)
:::

## Habilidades do exame abordadas
- Escolher entre classificação de imagem e detecção de objetos
- Rotular imagens para treinamento de modelos personalizados
- Treinar um modelo de imagem personalizado
- Avaliar métricas do modelo (precision, recall, AP)
- Publicar e consumir iterações do modelo personalizado

## Visão Geral

O Custom Vision permite treinar modelos de classificação de imagens específicos para um domínio sem necessidade de expertise em ML. Dois tipos de projeto:

| Tipo | Caso de Uso | Saída |
|------|-------------|-------|
| **Classificação - Multiclass** | Imagem pertence a UMA categoria | Uma tag por imagem |
| **Classificação - Multilabel** | Imagem pode ter MÚLTIPLAS categorias | Múltiplas tags por imagem |
| **Detecção de Objetos** | Localizar objetos com bounding boxes | Tags + coordenadas |

O treinamento produz iterações com métricas: **Precision** (das predições positivas, quantas estão corretas), **Recall** (dos positivos reais, quantos foram encontrados) e **AP** (Average Precision — área sob a curva precision-recall).

## Pré-requisitos
- Assinatura Azure
- Recursos Custom Vision Training + Prediction
- Python 3.9+
- Pacotes: `azure-cognitiveservices-vision-customvision` (training + prediction)

## Implementação

### Tarefa 1: Criar Recursos Custom Vision

```bash
az group create --name rg-ai102-customvision --location eastus2

# Training resource
az cognitiveservices account create \
  --name cv-training-ai102 \
  --resource-group rg-ai102-customvision \
  --kind CustomVision.Training \
  --sku S0 \
  --location eastus2

# Prediction resource
az cognitiveservices account create \
  --name cv-prediction-ai102 \
  --resource-group rg-ai102-customvision \
  --kind CustomVision.Prediction \
  --sku S0 \
  --location eastus2

# Get keys
TRAINING_KEY=$(az cognitiveservices account keys list --name cv-training-ai102 --resource-group rg-ai102-customvision --query key1 -o tsv)
TRAINING_ENDPOINT=$(az cognitiveservices account show --name cv-training-ai102 --resource-group rg-ai102-customvision --query properties.endpoint -o tsv)
PREDICTION_KEY=$(az cognitiveservices account keys list --name cv-prediction-ai102 --resource-group rg-ai102-customvision --query key1 -o tsv)
PREDICTION_ENDPOINT=$(az cognitiveservices account show --name cv-prediction-ai102 --resource-group rg-ai102-customvision --query properties.endpoint -o tsv)
```

### Tarefa 2: Criar Projeto, Enviar e Rotular Imagens, Treinar

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import time
from azure.cognitiveservices.vision.customvision.training import CustomVisionTrainingClient
from azure.cognitiveservices.vision.customvision.prediction import CustomVisionPredictionClient
from azure.cognitiveservices.vision.customvision.training.models import ImageUrlCreateEntry
from msrest.authentication import ApiKeyCredentials

training_endpoint = os.environ["CUSTOM_VISION_TRAINING_ENDPOINT"]
training_key = os.environ["CUSTOM_VISION_TRAINING_KEY"]
prediction_endpoint = os.environ["CUSTOM_VISION_PREDICTION_ENDPOINT"]
prediction_key = os.environ["CUSTOM_VISION_PREDICTION_KEY"]

# Create training client
training_credentials = ApiKeyCredentials(in_headers={"Training-key": training_key})
trainer = CustomVisionTrainingClient(training_endpoint, training_credentials)

# Create a classification project (Multiclass)
project = trainer.create_project(
    name="Fruit-Classifier",
    classification_type="Multiclass",
    domain_id=None  # Use General domain
)
print(f"Created project: {project.id}")

# Create tags (categories)
apple_tag = trainer.create_tag(project.id, "apple")
banana_tag = trainer.create_tag(project.id, "banana")
orange_tag = trainer.create_tag(project.id, "orange")
print(f"Tags created: apple={apple_tag.id}, banana={banana_tag.id}, orange={orange_tag.id}")

# Upload training images (using URLs)
apple_images = [
    "https://upload.wikimedia.org/wikipedia/commons/1/15/Red_Apple.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/e/ee/Apples.jpg",
]
banana_images = [
    "https://upload.wikimedia.org/wikipedia/commons/8/8a/Banana-Single.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/d/de/Bananacomp.jpg",
]

# Upload apple images
image_entries = [ImageUrlCreateEntry(url=url, tag_ids=[apple_tag.id]) for url in apple_images]
upload_result = trainer.create_images_from_urls(project.id, images=image_entries)
print(f"Apple images uploaded: {upload_result.is_batch_successful}")

# Upload banana images
image_entries = [ImageUrlCreateEntry(url=url, tag_ids=[banana_tag.id]) for url in banana_images]
upload_result = trainer.create_images_from_urls(project.id, images=image_entries)
print(f"Banana images uploaded: {upload_result.is_batch_successful}")

# Train the model (requires minimum 5 images per tag for best results)
print("\nTraining model...")
iteration = trainer.train_project(project.id)

while iteration.status != "Completed":
    iteration = trainer.get_iteration(project.id, iteration.id)
    print(f"  Status: {iteration.status}")
    time.sleep(5)

print(f"Training complete! Iteration: {iteration.id}")

# Get performance metrics
performance = trainer.get_iteration_performance(project.id, iteration.id)
print(f"\nPerformance Metrics:")
print(f"  Precision: {performance.precision:.4f}")
print(f"  Recall: {performance.recall:.4f}")
print(f"  AP (Average Precision): {performance.average_precision:.4f}")

for tag_perf in performance.per_tag_performance:
    print(f"  Tag '{tag_perf.name}': precision={tag_perf.precision:.3f}, recall={tag_perf.recall:.3f}")
```

</TabItem>
</Tabs>

### Tarefa 3: Publicar e Fazer Predições

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Publish the iteration for prediction
prediction_resource_id = f"/subscriptions/<sub-id>/resourceGroups/rg-ai102-customvision/providers/Microsoft.CognitiveServices/accounts/cv-prediction-ai102"
publish_name = "fruit-model-v1"

trainer.publish_iteration(
    project.id,
    iteration.id,
    publish_name,
    prediction_resource_id
)
print(f"Model published as: {publish_name}")

# Create prediction client
prediction_credentials = ApiKeyCredentials(in_headers={"Prediction-key": prediction_key})
predictor = CustomVisionPredictionClient(prediction_endpoint, prediction_credentials)

# Make a prediction with URL
test_url = "https://upload.wikimedia.org/wikipedia/commons/1/15/Red_Apple.jpg"

results = predictor.classify_image_url(
    project.id,
    publish_name,
    url=test_url
)

print(f"\nPrediction results:")
for prediction in results.predictions:
    print(f"  {prediction.tag_name}: {prediction.probability:.4f} ({prediction.probability*100:.1f}%)")

# Prediction with local file
with open("test-fruit.jpg", "rb") as image_file:
    results = predictor.classify_image(project.id, publish_name, image_file)
    for prediction in results.predictions:
        if prediction.probability > 0.5:
            print(f"  Classified as: {prediction.tag_name} ({prediction.probability:.2%})")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
PREDICTION_ENDPOINT="https://<resource>.cognitiveservices.azure.com"
PREDICTION_KEY="<key>"
PROJECT_ID="<project-id>"
PUBLISH_NAME="fruit-model-v1"

# Classify image by URL
curl -s "${PREDICTION_ENDPOINT}/customvision/v3.0/prediction/${PROJECT_ID}/classify/iterations/${PUBLISH_NAME}/url" \
  -H "Prediction-Key: ${PREDICTION_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://upload.wikimedia.org/wikipedia/commons/1/15/Red_Apple.jpg"
  }' | jq '.predictions[] | {tag: .tagName, probability: .probability}'
```

</TabItem>
</Tabs>

## Saída Esperada

```text
Created project: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Tags created: apple=..., banana=..., orange=...
Apple images uploaded: True
Banana images uploaded: True

Training model...
  Status: Training
  Status: Training
  Status: Completed
Training complete! Iteration: iter-12345

Performance Metrics:
  Precision: 0.9200
  Recall: 0.8800
  AP (Average Precision): 0.9450
  Tag 'apple': precision=0.950, recall=0.900
  Tag 'banana': precision=0.890, recall=0.860

Model published as: fruit-model-v1

Prediction results:
  apple: 0.9723 (97.2%)
  banana: 0.0198 (2.0%)
  orange: 0.0079 (0.8%)
```

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Treinamento falha | `BadRequestImageCount` | Menos de 5 imagens por tag | Adicione pelo menos 5 imagens por categoria |
| Precision baixa | Muitos falsos positivos | Imagens de treinamento muito similares entre tags | Adicione exemplos negativos diversos; use imagens mais distintas |
| Publicação falha | Erro de Resource ID | ID do recurso de predição com formato incorreto | Use o caminho completo do ARM resource ID |
| Predição retorna 404 | Iteração não encontrada | Modelo não publicado ou nome de publicação errado | Verifique se `publish_iteration` teve sucesso; use o nome correto |
| Upload de imagem falha | `ImageUrl not reachable` | URL não acessível a partir do Azure | Use URLs acessíveis publicamente ou faça upload direto do arquivo |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a diferença entre classificação Multiclass e Multilabel?",
    options: [
      "Multiclass usa mais imagens de treinamento que Multilabel",
      "Multilabel é mais preciso que Multiclass",
      "Multiclass só funciona com 2 categorias",
      "Multiclass atribui exatamente uma tag por imagem; Multilabel pode atribuir múltiplas tags"
    ],
    correctAnswer: 3,
    explanation: "Multiclass: cada imagem recebe exatamente uma tag (categorias mutuamente exclusivas). Multilabel: cada imagem pode ter zero ou mais tags simultaneamente."
  },
  {
    question: "O que a Average Precision (AP) mede no Custom Vision?",
    options: [
      "O score médio de confiança das predições",
      "O número médio de predições corretas por lote",
      "A área sob a curva precision-recall, resumindo o desempenho do modelo em diferentes limiares",
      "O tempo médio para fazer predições"
    ],
    correctAnswer: 2,
    explanation: "AP é a área sob a curva precision-recall. Fornece uma métrica única que resume o trade-off entre precision e recall em todos os limiares de confiança."
  },
  {
    question: "O que é necessário antes de fazer predições com um modelo Custom Vision treinado?",
    options: [
      "Publicar a iteração em um recurso de predição com um nome de publicação",
      "Exportar o modelo para um contêiner",
      "Converter o modelo para formato ONNX",
      "Implantar o modelo em uma Azure Function"
    ],
    correctAnswer: 0,
    explanation: "Você deve publicar uma iteração treinada em um endpoint de recurso de predição com uma versão nomeada antes que ela possa servir predições via a API de predição."
  },
  {
    question: "Qual é o número mínimo de imagens de treinamento recomendado por tag?",
    options: [
      "1 imagem por tag",
      "Pelo menos 5 imagens por tag (15+ recomendado para produção)",
      "Exatamente 100 imagens por tag",
      "50 imagens no total em todas as tags"
    ],
    correctAnswer: 1,
    explanation: "O Custom Vision requer pelo menos 5 imagens por tag para treinar. Para qualidade de produção, 15-50+ imagens diversas por tag são recomendadas."
  },
  {
    question: "Como você consome um modelo Custom Vision publicado para predições?",
    options: [
      "Usar o cliente de Training com o ID da iteração",
      "Chamar o modelo diretamente via seu endpoint de iteração",
      "Usar o cliente de Prediction com o project ID e o nome de publicação",
      "Exportar e executar localmente apenas"
    ],
    correctAnswer: 2,
    explanation: "Predições usam o CustomVisionPredictionClient com o project ID e o nome de publicação atribuído durante a publicação da iteração."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-customvision --yes --no-wait
```

## Saiba Mais

- [Visão geral do Custom Vision](https://learn.microsoft.com/azure/ai-services/custom-vision-service/overview)
- [Início rápido: Construir um classificador](https://learn.microsoft.com/azure/ai-services/custom-vision-service/getting-started-build-a-classifier)
- [Avaliar e melhorar o modelo](https://learn.microsoft.com/azure/ai-services/custom-vision-service/getting-started-improving-your-classifier)
