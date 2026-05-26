---
sidebar_position: 3
title: "Challenge 12: Optical Character Recognition (OCR)"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 12: Optical Character Recognition (OCR)

:::info Estimated Time
**25-35 min** | **Cost**: Free | **Domain**: Computer Vision on Azure (15-20%)
:::

## Exam skills covered

- Identify features of optical character recognition (OCR) solutions
- Understand the difference between OCR and document intelligence
- Identify Azure services for reading text from images
- Describe capabilities of the Read API

## Overview

Optical Character Recognition (OCR) is the technology that **extracts text from images and documents**. Any time you photograph a document, scan a receipt, or point your phone at a sign and it "reads" the text — that's OCR in action.

Think of OCR like teaching a computer to read. When you look at a photo of a restaurant menu, you instantly recognize letters and words. OCR does the same thing — it identifies the shapes of characters in an image and converts them into machine-readable text that applications can process, search, and store.

Azure provides OCR through two main services: **Azure AI Vision** (Read API) for general text extraction from images, and **Azure AI Document Intelligence** for structured document processing. The Read API handles printed and handwritten text from any image. Document Intelligence goes further — it understands document structure (fields, tables, key-value pairs) from specific document types like invoices, receipts, and forms.

## Explore

### Task 1: OCR vs Document Intelligence

| Feature | Azure AI Vision (Read API) | Azure AI Document Intelligence |
|---------|---------------------------|-------------------------------|
| **What it extracts** | Raw text from images | Structured fields, tables, and key-value pairs |
| **Input** | Any image with text | Documents (invoices, receipts, forms, IDs) |
| **Output** | Lines and words with positions | Named fields (e.g., "InvoiceTotal: $1,234.56") |
| **Use case** | Read a sign, extract text from a screenshot | Process 10,000 invoices and extract totals, dates, vendors |
| **Analogy** | Reading text out loud | Filling in a spreadsheet from a form |

**Key distinction**: OCR reads text character by character. Document Intelligence UNDERSTANDS document structure — it knows which number is the "total" and which is the "date."

### Task 2: Try the Azure AI Vision OCR demo

1. Visit [Azure AI Vision demo](https://portal.vision.cognitive.azure.com/demo/extract-text-from-images)
2. Select the **"Extract text from images"** option
3. Try with a sample image or upload your own (photo of a sign, document, or handwriting)
4. Observe the results:
   - Text is extracted line by line
   - Each word has position coordinates (bounding polygon)
   - Both printed and handwritten text can be detected
   - The text is returned in reading order

### Task 3: Understand the Read API response structure

The Read API returns a hierarchical structure:

![Challenge 12 - OCR Read Result Structure](/img/ai-900/challenge-12-topology.svg)

**Key features of the Read API**:
- Handles **printed** and **handwritten** text
- Supports **multiple languages** (120+ languages)
- Works with **rotated** and **skewed** text
- Processes **multi-page documents** (PDF, TIFF)
- Returns **confidence scores** for each word

### Task 4: Document Intelligence prebuilt models

Azure AI Document Intelligence offers prebuilt models for common document types:

| Prebuilt model | What it extracts |
|----------------|-----------------|
| **Invoice** | Vendor name, invoice total, due date, line items |
| **Receipt** | Merchant, date, total, tax, items purchased |
| **ID Document** | Name, date of birth, document number, expiration |
| **Business Card** | Name, company, email, phone number |
| **W-2 Tax form** | Employee info, wages, taxes withheld |
| **Health Insurance Card** | Member info, plan details, group number |

**Custom models**: If your documents don't match prebuilt models, you can train Document Intelligence with your own document samples.

:::tip Azure CLI Alternative
```bash
# Analyze an image with the Read API
az cognitiveservices account show \
  --name my-ai-services \
  --resource-group my-rg \
  --query "properties.endpoint"

# Document Intelligence is accessed via REST API:
# POST {endpoint}/documentintelligence/documentModels/prebuilt-invoice:analyze?api-version=2024-02-29
```
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| OCR (Optical Character Recognition) | Technology that extracts text from images and scanned documents |
| Read API | Azure AI Vision capability that extracts printed and handwritten text |
| Azure AI Document Intelligence | Service that extracts structured data (fields, tables) from documents |
| Bounding box/polygon | Coordinates indicating where each word/line appears in the image |
| Printed text | Machine-generated text (fonts) — higher accuracy |
| Handwritten text | Human-written text — more challenging, lower accuracy |
| Prebuilt model | Pre-trained Document Intelligence model for specific document types |
| Custom model | User-trained Document Intelligence model for unique document formats |
| Confidence score | Reliability measure (0-1) for each extracted word |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| "OCR and Document Intelligence are the same thing" | OCR extracts raw text (characters and words). Document Intelligence understands document STRUCTURE — it knows which text is a date, which is a total, and which is a vendor name |
| "OCR only works with printed text" | Azure's Read API handles both printed and handwritten text. Printed text typically has higher accuracy, but handwriting recognition has improved dramatically |
| "OCR requires perfectly clear, straight images" | Modern OCR handles rotated, skewed, and even partially obscured text. The Read API compensates for imperfect image quality |
| "Document Intelligence requires custom training for every document type" | Prebuilt models work immediately for common documents (invoices, receipts, IDs). Custom training is only needed for unique/proprietary document formats |
| "OCR gives you structured data directly" | OCR gives you raw text in reading order. For structured data (key-value pairs, tables), you need Document Intelligence, which builds on OCR but adds document understanding |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-12-q1',
      question: 'A company receives thousands of paper invoices and needs to automatically extract the vendor name, invoice date, and total amount into their accounting system. Which Azure service is most appropriate?',
      options: ['Azure AI Vision (Read API)', 'Azure AI Document Intelligence', 'Azure AI Language', 'Azure Custom Vision'],
      correctAnswer: 1,
      explanation: 'Azure AI Document Intelligence specializes in extracting structured fields (vendor name, date, total) from documents like invoices. The Read API would extract all text but wouldn\'t understand which text is the vendor vs. the total.'
    },
    {
      id: 'ai900-12-q2',
      question: 'A developer needs to extract all text from photographs of street signs in multiple languages. Which Azure capability should they use?',
      options: ['Azure AI Document Intelligence', 'Azure AI Translator', 'Azure AI Vision Read API', 'Azure Custom Vision'],
      correctAnswer: 2,
      explanation: 'The Azure AI Vision Read API extracts text from any image (including photographs of signs) and supports 120+ languages. Document Intelligence is for structured documents, not general photographs.'
    },
    {
      id: 'ai900-12-q3',
      question: 'What does the Read API return in addition to the extracted text?',
      options: ['Only the raw text string', 'A summary of the document content', 'The language of the text only', 'Text with position coordinates (bounding polygons) and confidence scores for each word'],
      correctAnswer: 3,
      explanation: 'The Read API returns extracted text organized by pages and lines, with each word including its position coordinates (bounding polygon) and a confidence score indicating reliability.'
    },
    {
      id: 'ai900-12-q4',
      question: 'Which of the following can the Azure AI Vision Read API handle?',
      options: ['Only clearly printed text in English', 'Only digital PDFs, not scanned images', 'Both printed and handwritten text in multiple languages', 'Only single-page documents'],
      correctAnswer: 2,
      explanation: 'The Read API handles printed AND handwritten text, supports 120+ languages, works with both scanned images and digital PDFs, and can process multi-page documents.'
    },
    {
      id: 'ai900-12-q5',
      question: 'What is the key difference between OCR (Read API) and Document Intelligence?',
      options: ['OCR extracts raw text; Document Intelligence extracts structured fields and understands document layout', 'OCR is faster; Document Intelligence is slower', 'Document Intelligence only works with PDFs', 'OCR requires more training data'],
      correctAnswer: 0,
      explanation: 'OCR (Read API) extracts text as-is from images. Document Intelligence goes further — it understands document structure and extracts named, structured fields (like "InvoiceTotal" or "VendorName") from specific document types.'
    }
  ]}
/>

## Learn More

- [Microsoft Learn: Read text from images and documents](https://learn.microsoft.com/en-us/training/modules/read-text-images-documents-with-computer-vision-service/)
- [Azure AI Vision Read API documentation](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/overview-ocr)
- [Azure AI Document Intelligence overview](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/overview)
- [Azure AI Vision OCR demo](https://portal.vision.cognitive.azure.com/demo/extract-text-from-images)
