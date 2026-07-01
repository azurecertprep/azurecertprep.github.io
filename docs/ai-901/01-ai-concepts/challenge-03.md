---
sidebar_position: 3
title: "Challenge 03: Common AI Patterns and Use Cases"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 03: Common AI Patterns and Use Cases

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: AI Concepts & Capabilities (40-45%)
:::

## Exam skills covered

- Identify common AI patterns: anomaly detection, prediction, classification, knowledge mining
- Map AI patterns to appropriate use cases
- Understand how AI patterns relate to Azure AI services

## Overview

AI isn't magic — it follows recognizable **patterns** to solve problems. Once you learn to identify these patterns, you can match any business scenario to the right AI approach. The four most common patterns are: anomaly detection (finding the unusual), prediction (forecasting the future), classification (sorting into categories), and knowledge mining (extracting insights from data).

Think of these patterns like tools in a toolbox. A hammer (classification) sorts nails by type. A thermometer (prediction) forecasts tomorrow's temperature from today's data. A smoke detector (anomaly detection) alerts you when something unusual happens. A magnifying glass (knowledge mining) finds hidden clues in large piles of documents.

The exam tests whether you can recognize which pattern applies to a given business scenario. The data type and desired outcome will always point you to the correct answer.

## Explore

### Task 1: Understand the four common AI patterns

| Pattern | What it does | Input → Output | Azure Services |
|---------|-------------|----------------|----------------|
| **Anomaly Detection** | Identifies unusual data points that don't fit normal patterns | Time-series data → Alerts on outliers | Azure AI services (Anomaly Detection) / Azure Machine Learning |
| **Prediction (Regression)** | Forecasts numeric values based on historical data | Historical data → Future values | Azure Machine Learning |
| **Classification** | Assigns categories/labels to data | Data → Category label | Azure Machine Learning, Azure AI Language |
| **Knowledge Mining** | Extracts insights from large volumes of unstructured content | Documents/images → Structured insights | Azure AI Search (Cognitive Search) |

### Task 2: Match scenarios to patterns

Practice identifying which pattern each scenario uses:

| Scenario | Pattern | Why |
|----------|---------|-----|
| A bank flags unusual credit card transactions | Anomaly Detection | Identifying transactions that deviate from normal spending patterns |
| An e-commerce site predicts next quarter's revenue | Prediction | Forecasting a numeric value (revenue) from historical data |
| An email system marks messages as spam or not spam | Classification | Sorting emails into two categories (spam/not-spam) |
| A law firm searches thousands of contracts for specific clauses | Knowledge Mining | Extracting structured information from unstructured documents |
| A factory sensor detects unusual vibration in machinery | Anomaly Detection | Detecting deviations from normal machine behavior |
| A hospital predicts patient readmission likelihood | Prediction | Forecasting a probability (numeric value) based on patient data |

### Task 3: Explore Azure AI Search (Knowledge Mining)

1. Visit [Azure AI Search documentation](https://learn.microsoft.com/en-us/azure/search/search-what-is-azure-search)
2. Understand the knowledge mining pipeline:
   - **Ingest** → Pull in documents, images, and unstructured data
   - **Enrich** → Apply AI skills (OCR, entity recognition, key phrase extraction)
   - **Explore** → Search and analyze the enriched, structured data
3. This is how organizations turn thousands of PDFs into searchable, structured knowledge

### Task 4: Explore Azure AI Anomaly Detector concepts

1. Review the [Anomaly Detector documentation](https://learn.microsoft.com/en-us/azure/ai-services/anomaly-detector/overview)
2. Key concepts:
   - Works on **time-series data** (values over time)
   - Detects spikes, dips, and trend changes
   - Use cases: IoT sensor monitoring, financial fraud, website traffic anomalies
3. Note: The standalone Anomaly Detector service was retired in 2023. Multivariate anomaly detection remains available through Azure AI services, and the concept is still tested on the exam as a pattern

:::tip Exam strategy
When the exam gives you a scenario, ask:
- "Is this about finding something **unusual**?" → Anomaly Detection
- "Is this about **predicting a number**?" → Prediction/Regression
- "Is this about **sorting into groups**?" → Classification
- "Is this about **finding information** in large data?" → Knowledge Mining
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Anomaly Detection | Identifying data points that deviate significantly from expected patterns |
| Prediction (Regression) | Using historical data to forecast future numeric values |
| Classification | Assigning predefined category labels to data items |
| Knowledge Mining | Using AI to extract structured information from large volumes of unstructured content |
| Time-series data | Data points collected over time (e.g., temperature readings every hour) |
| AI enrichment | Adding AI-generated metadata to content (e.g., extracting entities from text) |
| Cognitive skills | Pre-built AI capabilities used in Azure AI Search to enrich content |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| "Anomaly detection tells you WHY something is unusual" | Anomaly detection only flags that something IS unusual. Determining the cause requires further investigation or additional AI |
| "Classification and prediction are the same" | Classification assigns a category (spam/not-spam). Prediction forecasts a numeric value ($500, 73%). The output type is the key difference |
| "Knowledge mining requires structured data" | Knowledge mining is specifically designed for UNstructured data — PDFs, images, emails. It transforms unstructured content into structured, searchable information |
| "Anomaly detection requires labeled training data" | Many anomaly detection approaches are unsupervised — they learn what "normal" looks like and flag deviations without needing labeled examples of anomalies |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-03-q1',
      question: 'A manufacturing company monitors equipment sensors and wants to be alerted when machine vibrations fall outside normal operating ranges. Which AI pattern should they use?',
      options: ['Classification', 'Prediction', 'Anomaly Detection', 'Knowledge Mining'],
      correctAnswer: 2,
      explanation: 'Anomaly Detection identifies data points that deviate from normal patterns. Detecting unusual vibrations in time-series sensor data is a classic anomaly detection scenario.'
    },
    {
      id: 'ai900-03-q2',
      question: 'A real estate company wants to estimate the selling price of houses based on features like square footage, location, and number of bedrooms. Which AI pattern applies?',
      options: ['Classification', 'Prediction (Regression)', 'Anomaly Detection', 'Knowledge Mining'],
      correctAnswer: 1,
      explanation: 'Predicting a numeric value (house price) based on input features is a prediction/regression pattern. The output is a continuous number, not a category.'
    },
    {
      id: 'ai900-03-q3',
      question: 'A law firm has 50,000 contracts and needs to search across them to find all mentions of specific liability clauses, extract party names, and identify dates. Which pattern is most appropriate?',
      options: ['Classification', 'Anomaly Detection', 'Prediction', 'Knowledge Mining'],
      correctAnswer: 3,
      explanation: 'Knowledge Mining extracts structured insights from large volumes of unstructured content. Searching documents, extracting entities (names, dates), and making content searchable is exactly what knowledge mining does.'
    },
    {
      id: 'ai900-03-q4',
      question: 'An online store wants to automatically categorize customer support tickets as "billing", "technical", or "general inquiry". Which AI pattern is this?',
      options: ['Classification', 'Knowledge Mining', 'Anomaly Detection', 'Prediction'],
      correctAnswer: 0,
      explanation: 'Assigning predefined category labels (billing, technical, general) to data items (support tickets) is classification. The AI sorts each ticket into one of the defined categories.'
    },
    {
      id: 'ai900-03-q5',
      question: 'Which AI pattern works with time-series data to identify unusual spikes or drops?',
      options: ['Classification', 'Knowledge Mining', 'Anomaly Detection', 'Prediction'],
      correctAnswer: 2,
      explanation: 'Anomaly Detection specializes in time-series data analysis — identifying data points that deviate from expected patterns, including unexpected spikes, dips, or trend changes.'
    }
  ]}
/>

## Learn More

- [Microsoft Learn: AI fundamentals — Explore anomaly detection](https://learn.microsoft.com/en-us/training/modules/get-started-ai-fundamentals/)
- [Azure AI Search documentation](https://learn.microsoft.com/en-us/azure/search/search-what-is-azure-search)
- [Knowledge mining solution accelerator](https://learn.microsoft.com/en-us/azure/search/cognitive-search-concept-intro)
- [Azure Machine Learning scenarios](https://learn.microsoft.com/en-us/azure/machine-learning/concept-what-is-machine-learning)
