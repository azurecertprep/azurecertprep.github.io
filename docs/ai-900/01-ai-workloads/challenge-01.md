---
sidebar_position: 1
title: "Challenge 01: Identify AI Workloads"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 01: Identify AI Workloads

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: AI Workloads & Responsible AI (15-20%)
:::

## Exam skills covered

- Identify features of computer vision workloads
- Identify features of natural language processing workloads
- Identify features of document intelligence / knowledge mining workloads
- Identify features of generative AI workloads

## Overview

Artificial Intelligence (AI) is software that can perform tasks that normally require human intelligence — seeing, hearing, understanding language, making decisions, and creating content. Azure organizes AI capabilities into distinct **workload categories**, each solving a different type of problem.

Think of AI workloads like different departments in a company. The "eyes" department (Computer Vision) handles anything visual — reading signs, identifying products, or inspecting quality. The "ears and voice" department (Speech) transcribes conversations and reads text aloud. The "language" department (NLP) understands and generates written text. The "creative" department (Generative AI) produces new content from scratch.

Understanding which workload applies to a given scenario is a core exam skill. The key question is always: **"What type of data is the AI processing, and what outcome do we need?"**

## Explore

### Task 1: Map problems to AI workloads

Review the table below and match each real-world scenario to its AI workload category:

| Workload | What it does | Example scenarios |
|----------|-------------|-------------------|
| **Computer Vision** | Analyzes images and video | Detect defects on assembly line, count people in a store, read license plates |
| **Natural Language Processing** | Understands and generates text | Chatbots, sentiment analysis, translation, summarization |
| **Speech** | Converts between speech and text | Voice assistants, call center transcription, real-time captioning |
| **Document Intelligence** | Extracts structured data from documents | Invoice processing, receipt scanning, ID verification |
| **Generative AI** | Creates new content (text, images, code) | ChatGPT-style assistants, image generation, code completion |

### Task 2: Explore Azure AI Services in the portal

1. Open [portal.azure.com](https://portal.azure.com)
2. In the search bar, type **"Azure AI services"**
3. Click **+ Create** (don't actually create — just observe the options)
4. Notice the different service categories available:
   - Azure AI Vision
   - Azure AI Language
   - Azure AI Speech
   - Azure AI Document Intelligence
   - Azure OpenAI Service
5. Each maps to a workload category from the exam

### Task 3: Try Azure AI demos

1. Visit the [Azure AI Vision demo](https://portal.vision.cognitive.azure.com/demo/generic-image-tagging)
2. Upload or select a sample image — see how Vision identifies objects and generates tags
3. Visit the [Azure AI Language demo](https://language.cognitive.azure.com/)
4. Try the sentiment analysis demo with sample text
5. These demos show AI workloads in action without needing to write code

### Task 4: Identify overlapping workloads

Some scenarios involve multiple AI workloads working together:

| Scenario | Workloads involved |
|----------|-------------------|
| A voice assistant that answers questions | Speech (voice→text) + NLP (understand intent) + Speech (text→voice) |
| Processing scanned invoices | Computer Vision (OCR) + Document Intelligence (extract fields) |
| A chatbot that generates images from descriptions | NLP (understand request) + Generative AI (create image) |

**Key insight**: Real solutions often combine multiple AI workloads. The exam tests whether you can identify which individual workload handles each piece.

:::tip Azure CLI Alternative
```bash
# List available Azure AI service kinds
az cognitiveservices account list-kinds --output table
```
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Computer Vision | AI that analyzes images and video to extract information |
| Natural Language Processing (NLP) | AI that reads, understands, and generates human language text |
| Speech | AI that converts between spoken audio and text |
| Document Intelligence | AI that extracts structured data (fields, tables) from documents |
| Generative AI | AI that creates new content — text, images, code, audio |
| Knowledge Mining | Using AI to extract insights from large volumes of unstructured content |
| Multi-modal AI | AI that processes multiple types of input (text + images + audio) |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| "Computer Vision and OCR are the same thing" | OCR (reading text from images) is one capability within Computer Vision. Vision also does object detection, classification, and spatial analysis |
| "NLP and Speech are the same workload" | Speech handles audio↔text conversion. NLP handles understanding and generating written text. They often work together but are distinct |
| "Generative AI replaces all other workloads" | Generative AI creates content, but specialized services (Vision, Speech) are better for specific analytical tasks like object detection or real-time transcription |
| "Document Intelligence is just OCR" | OCR reads text character by character. Document Intelligence understands document structure — it knows a number is a "total" or a "date" based on context |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-01-q1',
      question: 'A retail company wants to automatically count the number of customers entering their stores using security cameras. Which AI workload is this?',
      options: ['Natural Language Processing', 'Computer Vision', 'Generative AI', 'Document Intelligence'],
      correctAnswer: 1,
      explanation: 'Counting people from camera feeds is a Computer Vision workload. It involves analyzing video/images to detect and count objects (people) in the frame.'
    },
    {
      id: 'ai900-01-q2',
      question: 'A company needs to automatically extract invoice numbers, dates, and totals from scanned PDF invoices. Which AI workload best fits?',
      options: ['Computer Vision', 'Natural Language Processing', 'Document Intelligence', 'Generative AI'],
      correctAnswer: 2,
      explanation: 'Document Intelligence (formerly Form Recognizer) specializes in extracting structured data — specific fields, tables, and key-value pairs — from documents like invoices, receipts, and forms.'
    },
    {
      id: 'ai900-01-q3',
      question: 'A customer service team wants to analyze thousands of product reviews to determine if customers are happy or unhappy. Which AI workload applies?',
      options: ['Computer Vision', 'Natural Language Processing', 'Speech', 'Document Intelligence'],
      correctAnswer: 1,
      explanation: 'Analyzing sentiment (positive/negative) in written text is a Natural Language Processing (NLP) workload. NLP understands the meaning and emotion in human language.'
    },
    {
      id: 'ai900-01-q4',
      question: 'A developer uses Azure OpenAI to build an application that writes marketing emails based on product descriptions. Which workload category is this?',
      options: ['Natural Language Processing', 'Document Intelligence', 'Generative AI', 'Knowledge Mining'],
      correctAnswer: 2,
      explanation: 'Creating new content (marketing emails) from input (product descriptions) is a Generative AI workload. The AI generates original text rather than just analyzing existing text.'
    },
    {
      id: 'ai900-01-q5',
      question: 'A call center wants to convert recorded phone calls into text transcripts for quality review. Which AI workload handles this?',
      options: ['Natural Language Processing', 'Speech', 'Generative AI', 'Computer Vision'],
      correctAnswer: 1,
      explanation: 'Converting spoken audio into written text is speech-to-text (transcription), which is a Speech workload. After transcription, NLP could analyze the text — but the audio→text step is Speech.'
    }
  ]}
/>

## Learn More

- [Microsoft Learn: Fundamental AI concepts](https://learn.microsoft.com/en-us/training/modules/get-started-ai-fundamentals/)
- [Azure AI services documentation](https://learn.microsoft.com/en-us/azure/ai-services/what-are-ai-services)
- [Azure AI Vision demo](https://portal.vision.cognitive.azure.com/)
- [Azure AI Language demo](https://language.cognitive.azure.com/)
