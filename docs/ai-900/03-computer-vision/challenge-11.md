---
sidebar_position: 2
title: "Challenge 11: Object Detection"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 11: Object Detection

:::info Estimated Time
**25-35 min** | **Cost**: Free | **Domain**: Computer Vision on Azure (15-20%)
:::

## Exam skills covered

- Identify features of object detection solutions
- Understand bounding boxes and confidence scores
- Differentiate object detection from image classification
- Identify use cases for object detection

## Overview

Object detection goes beyond image classification by not only identifying WHAT objects are in an image but also WHERE they are located. For each detected object, the model returns a **bounding box** (rectangle coordinates) and a **confidence score**. One image can contain multiple objects of different types.

Think of object detection like a wildlife photographer cataloging animals in a photo. Classification says "this photo contains elephants." Object detection says "there are 3 elephants: one in the upper-left, one in the center, and one in the lower-right" — each marked with a rectangle and a confidence level.

The key difference from classification: classification labels the entire image as one thing. Object detection finds multiple individual objects within the image and tells you exactly where each one is. This is critical for applications like autonomous driving (where is each car, pedestrian, and traffic sign?) or retail analytics (how many people are in each aisle?).

## Explore

### Task 1: Understanding bounding boxes

A bounding box defines the location of a detected object using coordinates:

```
┌─────────────────────────────────┐
│                                 │
│    ┌──────────┐                 │
│    │  Dog     │   ┌────────┐   │
│    │  0.94    │   │  Cat   │   │
│    └──────────┘   │  0.87  │   │
│                   └────────┘   │
│                                 │
└─────────────────────────────────┘
```

Each detection includes:
- **Class/label**: What the object is ("dog", "cat")
- **Confidence score**: How certain the model is (0.94 = 94%)
- **Bounding box**: Coordinates defining the rectangle (x, y, width, height)

### Task 2: Object detection vs classification vs segmentation

| Technique | Question answered | Output | Example |
|-----------|------------------|--------|---------|
| **Image Classification** | "What is this image?" | Label(s) for the whole image | "This is a beach scene" |
| **Object Detection** | "What objects are here and WHERE?" | Labels + bounding boxes | "Car at (100,200), person at (400,300)" |
| **Instance Segmentation** | "What shape is each object?" | Labels + pixel-level outlines | Exact outline of each car, person |

**For the exam**: Focus on the classification vs detection distinction. The key differentiator is **bounding boxes/localization**.

### Task 3: Explore object detection demos

1. Visit [Azure AI Vision demo](https://portal.vision.cognitive.azure.com/)
2. Try the **Dense Captioning** or **Object Detection** features
3. Upload an image with multiple objects (e.g., a street scene)
4. Observe:
   - Multiple objects detected in one image
   - Each object has a bounding box drawn around it
   - Confidence scores vary per object
   - The model can detect the SAME type of object multiple times (3 cars, 2 people)

### Task 4: Real-world object detection use cases

| Industry | Use case | What's detected |
|----------|----------|----------------|
| **Retail** | Customer counting and flow analysis | People in store aisles |
| **Autonomous vehicles** | Navigating safely | Cars, pedestrians, signs, lanes |
| **Manufacturing** | Quality inspection | Defects, components, alignment issues |
| **Security** | Surveillance alerts | People, vehicles, weapons |
| **Agriculture** | Crop monitoring | Weeds, pests, ripe fruit |
| **Healthcare** | Medical imaging | Tumors, fractures, anomalies |

**Custom Object Detection** with Azure Custom Vision:
- Train with YOUR images and YOUR object types
- Label objects by drawing bounding boxes on training images
- Need at least 15 tagged images per object type
- The model learns to find YOUR specific objects in new images

:::tip Exam strategy
Look for these keywords in exam scenarios:
- "Locate", "find where", "bounding box", "position" → Object Detection
- "How many of X are in the image" → Object Detection (counting requires locating each instance)
- "What is this image of?" (whole image) → Classification
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Object detection | Identifying and locating multiple objects within an image using bounding boxes |
| Bounding box | Rectangle defined by coordinates (x, y, width, height) that frames a detected object |
| Confidence threshold | Minimum confidence score required to accept a detection as valid |
| IoU (Intersection over Union) | Metric measuring how much a predicted bounding box overlaps with the true location |
| Multiple detections | One image can contain many objects; each gets its own box and label |
| Custom Vision (Object Detection) | Azure service to train custom object detectors with your own labeled images |
| Real-time detection | Processing video frames in real-time to detect objects continuously |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| "Object detection is just image classification with locations" | They are related but distinct. Classification labels the whole image. Object detection finds and locates individual objects — it handles multiple objects, overlapping objects, and objects of different types in one image |
| "Object detection can only find one object at a time" | Object detection finds ALL objects in an image simultaneously. A street scene might return 5 cars, 3 people, 2 traffic lights, all with separate bounding boxes |
| "Bounding boxes are always perfectly aligned with objects" | Bounding boxes are rectangles — they approximate the object's location. For irregular shapes, the box includes some background. Instance segmentation provides pixel-precise outlines |
| "You need video for object detection" | Object detection works on single images. When applied to video, it processes individual frames. Real-time video is just fast image processing |
| "Higher confidence threshold is always better" | Higher thresholds mean fewer false positives but more missed detections. The right threshold depends on the use case — a self-driving car needs to detect ALL pedestrians (lower threshold, higher recall) |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-11-q1',
      question: 'A retail store wants to count how many customers are in each department at any given time using security cameras. Which computer vision technique is most appropriate?',
      options: ['Image classification', 'Object detection', 'OCR', 'Image generation'],
      correctAnswer: 1,
      explanation: 'Object detection is needed because you must locate and count individual people in specific areas of the image. Classification would only tell you "there are people" but not how many or where they are.'
    },
    {
      id: 'ai900-11-q2',
      question: 'What information does a bounding box provide in object detection?',
      options: ['The color of the detected object', 'The name of the person in the image', 'The rectangular coordinates showing where the object is located in the image', 'The distance of the object from the camera'],
      correctAnswer: 2,
      explanation: 'A bounding box provides rectangular coordinates (x, y, width, height) that define where a detected object is located within the image. It frames the object with a rectangle.'
    },
    {
      id: 'ai900-11-q3',
      question: 'An autonomous vehicle system detects a pedestrian with 0.55 confidence and the safety threshold is set to 0.30. What should the system do?',
      options: ['Accept the detection because 0.55 exceeds the 0.30 threshold', 'Ignore the detection because 0.55 is low', 'Ask the driver to confirm', 'Reduce the threshold'],
      correctAnswer: 0,
      explanation: 'Since the confidence score (0.55) exceeds the threshold (0.30), the detection is accepted. Safety-critical systems use lower thresholds to catch more potential hazards, even at the cost of some false positives.'
    },
    {
      id: 'ai900-11-q4',
      question: 'What is the KEY feature that distinguishes object detection from image classification?',
      options: ['Object detection is more accurate', 'Object detection only works with Custom Vision', 'Object detection can only detect one object type', 'Object detection provides the location (bounding box) of each object, not just labels'],
      correctAnswer: 3,
      explanation: 'The defining feature of object detection is localization — it tells you WHERE each object is (bounding box coordinates), not just what the image contains. Classification labels the whole image; detection locates individual objects.'
    },
    {
      id: 'ai900-11-q5',
      question: 'A single image processed by an object detection model shows a street scene. Which result is most likely?',
      options: ['One label: "street scene"', 'One bounding box around the entire image', 'Multiple bounding boxes: 3 cars, 2 people, 1 traffic light, each with separate confidence scores', 'A text description of the image'],
      correctAnswer: 2,
      explanation: 'Object detection returns multiple bounding boxes — one for each detected object. A street scene would have separate detections for each car, person, sign, etc., each with its own label, bounding box, and confidence score.'
    }
  ]}
/>

## Learn More

- [Microsoft Learn: Detect objects in images](https://learn.microsoft.com/en-us/training/modules/detect-objects-images/)
- [Azure AI Vision documentation](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/concept-object-detection-40)
- [Custom Vision object detection](https://learn.microsoft.com/en-us/azure/ai-services/custom-vision-service/get-started-build-detector)
- [Azure AI Vision demo portal](https://portal.vision.cognitive.azure.com/)
