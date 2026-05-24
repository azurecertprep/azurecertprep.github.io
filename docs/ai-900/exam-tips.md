---
sidebar_position: 4
title: "Exam Tips & Strategy"
---

# Exam Tips & Strategy

## Exam format

| Detail | Value |
|---|---|
| **Duration** | 45 minutes |
| **Questions** | ~40–60 questions |
| **Passing score** | 700 / 1000 |
| **Cost** | $99 USD |
| **Format** | Multiple choice, multiple select, drag-and-drop, case studies |
| **Prerequisites** | None |
| **Renewal** | Required annually (free online assessment) |

## Key strategies

### 1. Focus on the highest-weight domain

**Domain 2: Fundamental principles of ML on Azure (20–25%)** carries the most weight. Make sure you can:
- Distinguish regression, classification, and clustering
- Explain the ML lifecycle (data → train → validate → deploy → inference)
- Identify when to use Azure Machine Learning vs. pre-built AI services

### 2. Master the "Which AI service?" pattern

Many questions follow this format: *"A company wants to [do X]. Which Azure service should they use?"*

Build a mental decision tree:
- **Extract text from images** → Azure AI Vision (OCR)
- **Analyze sentiment in reviews** → Azure AI Language
- **Convert speech to text** → Azure AI Speech
- **Build a chatbot** → Azure AI Language (CLU) + Azure Bot Service
- **Generate text or code** → Azure OpenAI Service
- **Detect anomalies in data** → Azure AI Anomaly Detector (now part of AI services)

### 3. Know the 6 Responsible AI principles

These appear frequently. Memorize all six:
1. **Fairness** — AI should treat all people equitably
2. **Reliability & Safety** — AI should perform reliably and safely
3. **Privacy & Security** — AI should be secure and respect privacy
4. **Inclusiveness** — AI should empower everyone and engage people
5. **Transparency** — AI should be understandable
6. **Accountability** — People should be accountable for AI systems

### 4. Know ML types cold

| Type | What it does | Example |
|---|---|---|
| **Supervised – Regression** | Predicts a continuous number | Predict house price |
| **Supervised – Classification** | Predicts a category/label | Spam or not spam |
| **Unsupervised – Clustering** | Groups similar items (no labels) | Customer segmentation |
| **Reinforcement learning** | Learns through reward/penalty | Game-playing AI |

## Common traps

| Trap | Reality |
|---|---|
| "Azure Cognitive Services" in an answer | **Renamed** to **Azure AI services** — but may still appear in older question wording |
| "Form Recognizer" in an answer | **Renamed** to **Azure AI Document Intelligence** |
| "LUIS" (Language Understanding) | **Replaced** by **CLU (Conversational Language Understanding)** in Azure AI Language |
| Confusing regression and classification | Regression = numbers, Classification = categories |
| Confusing classification and clustering | Classification = labeled data (supervised), Clustering = unlabeled data (unsupervised) |
| "Responsible AI" vs. specific principles | Know which principle applies to a scenario (e.g., "ensuring a loan model doesn't discriminate" = Fairness) |

## Day-of checklist

- [ ] Valid government-issued photo ID
- [ ] Stable internet connection (for online proctored) or arrive 15 min early (test center)
- [ ] Clear workspace — no papers, phones, or additional monitors (online proctored)
- [ ] System test completed at [https://www.pearsonvue.com/microsoft](https://www.pearsonvue.com/microsoft)
- [ ] Know your Microsoft Learn profile login credentials
- [ ] Water bottle and restroom break taken beforehand (no breaks during exam)

## Time management

With ~45 minutes for ~40–60 questions, you have roughly **45–60 seconds per question**.

- **First pass (30 min):** Answer everything you know immediately. Flag anything uncertain.
- **Second pass (15 min):** Return to flagged questions. Eliminate obviously wrong answers first.
- **Never leave blanks:** There's no penalty for guessing. Eliminate 1–2 options and pick your best guess.
- **Case studies:** Read the scenario once carefully, then answer all related questions. Don't re-read for each sub-question.

:::tip
If a question mentions a technology you've never heard of, it's likely a distractor. Azure AI exams rarely test obscure third-party tools.
:::
