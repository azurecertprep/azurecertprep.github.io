---
sidebar_position: 4
title: "Challenge 26: Custom Vision - Object Detection"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 26: Custom Vision - Object Detection

:::info Estimated Time
**60 min** | **Cost**: $2-5 (estimated) | **Domain**: Implement Computer Vision Solutions (10-15%)
:::

## Exam skills covered
- Train custom image model for object detection
- Label images with bounding box regions
- Evaluate detection metrics (mAP)
- Publish and consume object detection model

## Overview

Object detection locates and classifies multiple objects within an image using bounding boxes. Unlike classification (which answers "what is this image?"), detection answers "what objects are here and where?"

Key concepts:
- **Bounding box**: Rectangle defined by (left, top, width, height) as normalized coordinates (0.0–1.0)
- **IoU (Intersection over Union)**: Measures overlap between predicted and actual bounding boxes
- **mAP (mean Average Precision)**: Primary metric averaging AP across all object classes

## Prerequisites
- Azure subscription
- Custom Vision Training + Prediction resources
- Python 3.9+
- Package: `azure-cognitiveservices-vision-customvision`

## Implementation

### Task 1: Create Object Detection Project

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

### Task 2: Upload Images with Bounding Box Regions

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

### Task 3: Train and Evaluate Object Detection Model

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

### Task 4: Run Object Detection Predictions

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

## Expected Output

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

## Break and Fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Regions rejected | Invalid region coordinates | Coordinates outside 0.0–1.0 range | Normalize: left+width ≤ 1.0, top+height ≤ 1.0 |
| Low mAP | Poor detection accuracy | Inconsistent bounding box labeling | Re-label with tight, consistent boxes; more training data |
| Overlapping detections | Duplicate predictions | No NMS threshold configured | Apply confidence threshold; use Non-Maximum Suppression |
| Training fails | `BadRequestImageRegions` | Regions too small or missing | Minimum region size ~5% of image area |
| Wrong endpoint | 404 on detection | Using classify endpoint for detection | Use `/detect/` not `/classify/` in prediction URL |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "How are bounding box coordinates represented in Custom Vision object detection?",
    options: [
      "Normalized coordinates from 0.0 to 1.0 relative to image dimensions (left, top, width, height)",
      "Absolute pixel coordinates (x, y, width, height)",
      "Percentage values from 0% to 100%",
      "Center point plus radius"
    ],
    correctAnswer: 0,
    explanation: "Custom Vision uses normalized coordinates (0.0 to 1.0) for bounding boxes: left, top, width, height — all relative to image dimensions. This makes them resolution-independent."
  },
  {
    question: "What does mAP (mean Average Precision) measure in object detection?",
    options: [
      "The average confidence score across all detections",
      "The maximum number of objects detected per image",
      "The average processing time per image",
      "The mean of Average Precision computed independently for each object class"
    ],
    correctAnswer: 3,
    explanation: "mAP is the mean of AP values calculated separately for each class, providing a single metric that summarizes detection performance across all categories."
  },
  {
    question: "What is the key difference between the classify and detect prediction endpoints?",
    options: [
      "Classify is faster than detect",
      "Detect requires more training images",
      "Classify returns a single tag; detect returns multiple tags with bounding box coordinates",
      "Classify works with URLs; detect only works with local files"
    ],
    correctAnswer: 2,
    explanation: "The classify endpoint returns tags for the whole image. The detect endpoint returns multiple object predictions, each with a tag AND bounding box coordinates."
  },
  {
    question: "What is IoU (Intersection over Union) used for?",
    options: [
      "Measuring how much training data overlaps between classes",
      "Measuring the overlap between a predicted bounding box and ground-truth box to determine if a detection is correct",
      "Calculating the ratio of input to output images",
      "Determining how many users are accessing the model simultaneously"
    ],
    correctAnswer: 1,
    explanation: "IoU measures the overlap between predicted and ground-truth bounding boxes. A detection is typically considered correct if IoU > 0.5 (50% overlap with the actual object)."
  },
  {
    question: "When labeling training images for object detection, what coordinates do you need for each object?",
    options: [
      "Only the center point of the object",
      "The pixel coordinates of all four corners",
      "A polygon outline of the object shape",
      "Left, top, width, and height of the bounding box (normalized 0.0–1.0) plus the tag ID"
    ],
    correctAnswer: 3,
    explanation: "Each region requires: tag_id (which object class), left, top, width, height — all as normalized values between 0.0 and 1.0 relative to image dimensions."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-customvision --yes --no-wait
```

## Learn More

- [Object detection overview](https://learn.microsoft.com/azure/ai-services/custom-vision-service/get-started-build-detector)
- [How to label images](https://learn.microsoft.com/azure/ai-services/custom-vision-service/getting-started-build-a-classifier)
- [Prediction API reference](https://learn.microsoft.com/rest/api/customvision/prediction)
