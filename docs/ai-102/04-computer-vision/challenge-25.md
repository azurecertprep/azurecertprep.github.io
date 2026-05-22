---
sidebar_position: 3
title: "Challenge 25: Custom Vision - Image Classification"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 25: Custom Vision - Image Classification

:::info Estimated Time
**60 min** | **Cost**: $2-5 (estimated) | **Domain**: Implement Computer Vision Solutions (10-15%)
:::

## Exam skills covered
- Choose between image classification and object detection
- Label images for training custom models
- Train a custom image model
- Evaluate model metrics (precision, recall, AP)
- Publish and consume custom model iterations

## Overview

Custom Vision enables training domain-specific image classification models without ML expertise. Two project types:

| Type | Use Case | Output |
|------|----------|--------|
| **Classification - Multiclass** | Image belongs to ONE category | Single tag per image |
| **Classification - Multilabel** | Image can have MULTIPLE categories | Multiple tags per image |
| **Object Detection** | Locate objects with bounding boxes | Tags + coordinates |

Training produces iterations with metrics: **Precision** (of predicted positives, how many are correct), **Recall** (of actual positives, how many were found), and **AP** (Average Precision — area under precision-recall curve).

## Prerequisites
- Azure subscription
- Custom Vision Training + Prediction resources
- Python 3.9+
- Packages: `azure-cognitiveservices-vision-customvision` (training + prediction)

## Implementation

### Task 1: Create Custom Vision Resources

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

### Task 2: Create Project, Upload and Tag Images, Train

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

### Task 3: Publish and Make Predictions

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

## Expected Output

```
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

## Break and Fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Training fails | `BadRequestImageCount` | Less than 5 images per tag | Add at least 5 images per category |
| Low precision | Many false positives | Training images too similar across tags | Add diverse negative examples; use more distinct images |
| Publish fails | Resource ID error | Wrong prediction resource ID format | Use full ARM resource ID path |
| Prediction returns 404 | Iteration not found | Model not published or wrong publish name | Verify `publish_iteration` succeeded; use correct name |
| Image upload fails | `ImageUrl not reachable` | URL not accessible from Azure | Use publicly accessible URLs or upload file directly |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What is the difference between Multiclass and Multilabel classification?",
    options: [
      "Multiclass uses more training images than Multilabel",
      "Multiclass assigns exactly one tag per image; Multilabel can assign multiple tags",
      "Multilabel is more accurate than Multiclass",
      "Multiclass only works with 2 categories"
    ],
    correctAnswer: 1,
    explanation: "Multiclass: each image gets exactly one tag (mutually exclusive categories). Multilabel: each image can have zero or more tags simultaneously."
  },
  {
    question: "What does Average Precision (AP) measure in Custom Vision?",
    options: [
      "The average confidence score of predictions",
      "The area under the precision-recall curve, summarizing model performance across thresholds",
      "The average number of correct predictions per batch",
      "The time taken to make predictions on average"
    ],
    correctAnswer: 1,
    explanation: "AP is the area under the precision-recall curve. It provides a single metric summarizing the trade-off between precision and recall across all confidence thresholds."
  },
  {
    question: "What is required before making predictions with a trained Custom Vision model?",
    options: [
      "Export the model to a container",
      "Publish the iteration to a prediction resource with a publish name",
      "Convert the model to ONNX format",
      "Deploy the model to an Azure Function"
    ],
    correctAnswer: 1,
    explanation: "You must publish a trained iteration to a prediction resource endpoint with a named version before it can serve predictions via the prediction API."
  },
  {
    question: "What is the minimum number of training images recommended per tag?",
    options: [
      "1 image per tag",
      "At least 5 images per tag (15+ recommended for production)",
      "Exactly 100 images per tag",
      "50 images total across all tags"
    ],
    correctAnswer: 1,
    explanation: "Custom Vision requires at least 5 images per tag to train. For production quality, 15-50+ diverse images per tag are recommended."
  },
  {
    question: "How do you consume a published Custom Vision model for predictions?",
    options: [
      "Use the Training client with the iteration ID",
      "Use the Prediction client with project ID and publish name",
      "Call the model directly via its iteration endpoint",
      "Export and run locally only"
    ],
    correctAnswer: 1,
    explanation: "Predictions use the CustomVisionPredictionClient with the project ID and the publish name assigned during iteration publishing."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-customvision --yes --no-wait
```

## Learn More

- [Custom Vision overview](https://learn.microsoft.com/azure/ai-services/custom-vision-service/overview)
- [Quickstart: Build a classifier](https://learn.microsoft.com/azure/ai-services/custom-vision-service/getting-started-build-a-classifier)
- [Evaluate and improve model](https://learn.microsoft.com/azure/ai-services/custom-vision-service/getting-started-improving-your-classifier)
