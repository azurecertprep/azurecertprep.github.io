---
sidebar_position: 1
title: "Challenge 10: Image Classification"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 10: Image Classification

:::info Estimated Time
**25-35 min** | **Cost**: Free | **Domain**: Computer Vision on Azure (15-20%)
:::

## Exam skills covered

- Identify features of image classification solutions
- Describe single-label and multi-label image classification
- Understand confidence scores in classification results
- Identify Azure services for image classification

## Overview

Image classification is a computer vision technique that answers the question: **"What is in this image?"** Given an image, the model assigns one or more category labels with confidence scores. It's like showing a photo to someone and asking "what is this?" — except the AI responds with probabilities.

Think of image classification like a nature guide identifying birds. You show them a photo, and they say "I'm 95% sure that's a cardinal, 3% blue jay, 2% robin." They've learned to recognize hundreds of species from thousands of examples. Similarly, an image classification model learns from labeled training images to categorize new images it has never seen.

There are two types: **single-label classification** assigns exactly one category (this is EITHER a cat OR a dog), while **multi-label classification** can assign multiple categories (this image contains BOTH a beach AND a sunset AND people).

## Explore

### Task 1: Understand image classification types

| Type | Output | Example |
|------|--------|---------|
| **Single-label** | One category per image | "This is a cat" (not a dog, not a bird) |
| **Multi-label** | Multiple categories per image | "This contains: outdoor, beach, people, sunset" |

**Confidence scores**: Every prediction comes with a probability (0.0 to 1.0):
- 0.95 = 95% confident → very reliable
- 0.60 = 60% confident → uncertain, might need human review
- Threshold: Applications typically only accept predictions above a certain confidence (e.g., > 0.7)

### Task 2: Try Azure AI Vision image analysis

1. Visit [Azure AI Vision demo](https://portal.vision.cognitive.azure.com/demo/generic-image-tagging)
2. Select or upload a sample image
3. Observe the results:
   - **Tags** — categories/labels assigned to the image
   - **Confidence scores** — how certain the model is for each tag
   - Notice that multiple tags can be returned (multi-label)
4. Try different types of images (landscapes, animals, food, objects) and observe how tags change

### Task 3: Custom Vision vs pre-built Vision

Azure offers two approaches to image classification:

| Approach | When to use | How it works |
|----------|-------------|-------------|
| **Azure AI Vision (pre-built)** | General image understanding | Pre-trained on millions of images; works immediately for common objects/scenes |
| **Custom Vision** | Domain-specific classification | You train with YOUR images and YOUR categories (e.g., "defective" vs "good" products on your assembly line) |

**Custom Vision workflow**:
1. Upload labeled training images (at least 15 per category recommended)
2. Train the model (Custom Vision handles the ML)
3. Test with new images
4. Deploy and use via API

### Task 4: Image classification in the real world

| Industry | Use case | Classification type |
|----------|----------|-------------------|
| Manufacturing | Defect detection (good/defective parts) | Single-label binary |
| Retail | Product categorization from photos | Multi-class single-label |
| Healthcare | Skin lesion classification (benign/malignant) | Single-label binary |
| Agriculture | Crop disease identification | Multi-class single-label |
| Social media | Content moderation (appropriate/inappropriate) | Single-label binary |
| Photography | Auto-tagging photos (beach, people, sunset...) | Multi-label |

:::tip Exam insight
The exam distinguishes between:
- **Image classification**: "What is this?" → assigns label(s) to the whole image
- **Object detection**: "What and WHERE?" → finds objects with bounding boxes
- **OCR**: "What text is here?" → extracts text from images

Know which is which!
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Image classification | Assigning category labels to an entire image |
| Single-label classification | Each image gets exactly one category (mutually exclusive classes) |
| Multi-label classification | Each image can get multiple categories (non-exclusive tags) |
| Confidence score | Probability (0-1) indicating how certain the model is about a prediction |
| Training images | Labeled examples used to teach the model what each category looks like |
| Custom Vision | Azure service for training custom image classification models with your own data |
| Azure AI Vision | Pre-built service for general image analysis (tagging, description, categorization) |
| Threshold | Minimum confidence score required to accept a prediction |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| "Image classification tells you WHERE objects are in the image" | Classification only tells you WHAT is in the image (the whole image). Object detection tells you WHERE (with bounding boxes). These are different tasks |
| "You need thousands of images to train a custom classifier" | Azure Custom Vision can work with as few as 15 images per category for basic classification. More images improve accuracy, but you can start small |
| "A 90% confidence score means the model is 90% accurate" | Confidence is per-prediction — it means the model is 90% sure about THIS specific image. Overall model accuracy is measured separately across many test images |
| "Pre-built Azure AI Vision can classify anything" | Pre-built models handle common objects and scenes. For domain-specific categories (your product types, specific defects), you need Custom Vision with your own training data |
| "Multi-label means the model is uncertain" | Multi-label means the image legitimately contains multiple things. An image with a dog on a beach correctly gets both "dog" and "beach" tags — this isn't uncertainty |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-10-q1',
      question: 'A photo-sharing app needs to automatically tag uploaded photos with relevant labels like "outdoor", "food", "people", and "sunset" — an image can have multiple tags. What type of classification is this?',
      options: ['Single-label classification', 'Multi-label classification', 'Object detection', 'Binary classification'],
      correctAnswer: 1,
      explanation: 'Multi-label classification assigns multiple non-exclusive categories to a single image. A photo can be tagged as both "outdoor" AND "food" AND "people" simultaneously.'
    },
    {
      id: 'ai900-10-q2',
      question: 'An image classification model returns a confidence score of 0.45 for "cat" and 0.42 for "dog". What should the application do?',
      options: ['Always accept the highest score (cat)', 'Average the two scores', 'Return both labels', 'Reject the prediction because confidence is below a typical threshold'],
      correctAnswer: 3,
      explanation: 'Low confidence scores (below typical thresholds like 0.7) indicate the model is uncertain. Applications should typically reject predictions below their confidence threshold and potentially flag for human review.'
    },
    {
      id: 'ai900-10-q3',
      question: 'A manufacturing company needs to classify products on their assembly line as "pass" or "fail" based on photos. The categories are specific to their products. Which Azure service is most appropriate?',
      options: ['Custom Vision', 'Azure AI Vision (pre-built)', 'Azure AI Language', 'Azure OpenAI'],
      correctAnswer: 0,
      explanation: 'Custom Vision is designed for domain-specific classification where you train with your own images and categories. A manufacturing pass/fail classifier needs training on that company\'s specific products — pre-built models won\'t know what "defective" looks like for their products.'
    },
    {
      id: 'ai900-10-q4',
      question: 'What is the minimum number of training images recommended per category when using Azure Custom Vision?',
      options: ['At least 1 image per category', 'At least 1,000 images per category', 'At least 15 images per category', 'At least 10,000 images per category'],
      correctAnswer: 2,
      explanation: 'Azure Custom Vision recommends at least 15 images per category as a minimum starting point. While more images generally improve accuracy, Custom Vision is designed to work with relatively small datasets.'
    },
    {
      id: 'ai900-10-q5',
      question: 'What is the key difference between image classification and object detection?',
      options: ['Classification is more accurate', 'Classification labels the whole image; object detection locates specific objects with bounding boxes', 'Object detection only works with videos', 'Classification requires more training data'],
      correctAnswer: 1,
      explanation: 'Image classification answers "What is in this image?" for the entire image. Object detection answers "What objects are here and WHERE are they?" by identifying individual objects and drawing bounding boxes around each one.'
    }
  ]}
/>

## Learn More

- [Microsoft Learn: Analyze images with Azure AI Vision](https://learn.microsoft.com/en-us/training/modules/analyze-images-computer-vision/)
- [Azure AI Vision documentation](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/)
- [Custom Vision documentation](https://learn.microsoft.com/en-us/azure/ai-services/custom-vision-service/)
- [Azure AI Vision demo portal](https://portal.vision.cognitive.azure.com/)
