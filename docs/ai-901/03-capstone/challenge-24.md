---
sidebar_position: 1
title: "Challenge 24: End-to-End: Azure AI Portfolio Challenge"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 24: End-to-End: Azure AI Portfolio Challenge

:::info Estimated Time
**45-60 min** | **Cost**: Free | **Domain**: Capstone
:::

## Exam skills covered

- Describe AI workloads and considerations (Domain 1)
- Describe fundamental principles of machine learning (Domain 2)
- Describe features of computer vision workloads (Domain 3)
- Describe features of NLP workloads (Domain 4)
- Describe features of generative AI workloads (Domain 5)

## Overview

This capstone challenge brings together everything you've learned across all five AI-901 domains. You'll analyze a realistic business scenario — a retail company called **Contoso Retail** that wants to implement AI across multiple departments — and map their requirements to appropriate Azure AI services.

In the real exam, you'll encounter scenario-based questions that require you to understand not just individual services, but how they fit together to solve business problems. This challenge exercises that skill: given a business need, which Azure AI service is the right fit? What are the responsible AI considerations? How do the pieces connect?

This is your opportunity to think like a solutions architect — understanding the full landscape of Azure AI capabilities and when to apply each one. The challenge covers all five exam domains and prepares you for the cross-domain questions that frequently appear on the AI-901 exam.

## Explore

### Task 1: Scenario — Customer Support (NLP)

**Business requirement**: Contoso Retail receives 10,000 customer support emails daily in 15 languages. They want to:
- Understand what customers are complaining about
- Detect angry customers for priority handling
- Route emails to appropriate teams automatically
- Support customers in their native language

**Map to Azure AI services**:

| Requirement | Azure AI Service | Capability |
|------------|-----------------|-----------|
| Understand complaints | Azure AI Language | Key phrase extraction |
| Detect angry customers | Azure AI Language | Sentiment analysis |
| Route to correct team | Azure AI Language | Custom text classification or CLU |
| Detect email language | Azure AI Language | Language detection |
| Respond in customer's language | Azure AI Translator | Text translation |

**Architecture flow**:
```text
Customer email → Language Detection → Sentiment Analysis → Key Phrase Extraction
                                           ↓
                                   High negative sentiment?
                                   YES → Priority queue
                                   NO → Standard queue
                                           ↓
                              Custom Classification → Route to team
                                           ↓
                              Reply in customer's language (Translator)
```

**Your task**: What would happen if you skipped the language detection step? (Answer: Sentiment analysis might be less accurate because it works best when it knows the language of the input.)

### Task 2: Scenario — Inventory Management (Computer Vision)

**Business requirement**: Contoso Retail has 200 warehouses. They want to:
- Count products on shelves automatically using cameras
- Read product labels and expiration dates
- Detect damaged packaging
- Monitor for safety compliance (blocked exits, missing safety equipment)

**Map to Azure AI services**:

| Requirement | Azure AI Service | Capability |
|------------|-----------------|-----------|
| Count products on shelves | Azure AI Vision | Object detection (custom model) |
| Read product labels | Azure AI Vision | OCR (Read API) |
| Read expiration dates | Azure AI Vision | OCR (Read API) |
| Detect damaged packaging | Azure AI Vision | Custom image classification |
| Safety compliance monitoring | Azure AI Vision | Object detection |

**Key decisions**:
- **Pre-built vs. Custom**: Product counting and damage detection need custom models (trained on their specific products). OCR uses the pre-built Read API.
- **Real-time vs. Batch**: Safety monitoring needs real-time video analysis. Inventory counting can be batch-processed from periodic photos.

**Your task**: Should Contoso use image classification or object detection for counting products? (Answer: Object detection — because they need to locate AND count multiple individual items in a single image, not just classify the entire image.)

### Task 3: Scenario — Sales Forecasting (Machine Learning)

**Business requirement**: Contoso Retail wants to predict:
- Which products will sell well next quarter
- How many units to stock per store
- Which customers are likely to stop shopping (churn)

**Map to Azure AI services**:

| Requirement | ML Type | Why |
|------------|---------|-----|
| Predict product sales (units) | Regression | Predicting a continuous number (quantity) |
| Forecast demand per store | Regression / Time series | Predicting future numeric values based on trends |
| Predict customer churn | Classification | Predicting a category (will churn / won't churn) |

**Azure Machine Learning approach**:
1. Collect historical data (sales, customer behavior)
2. Use **Automated ML (AutoML)** to train models
3. Evaluate with appropriate metrics:
   - Regression: R², MAE, RMSE
   - Classification: Accuracy, Precision, Recall, F1, AUC
4. Deploy as endpoints for the retail application to consume

**Your task**: If Contoso wanted to group customers into segments (budget, mid-range, premium) based on purchasing patterns without pre-defining the groups, which ML type would that be? (Answer: Clustering — unsupervised learning that finds natural groupings in data.)

### Task 4: Scenario — Content Creation (Generative AI)

**Business requirement**: Contoso Retail's marketing team wants to:
- Generate product descriptions for 50,000 items
- Create social media posts in multiple languages
- Answer employee questions from internal policies
- Generate email responses to common customer inquiries

**Map to Azure AI services**:

| Requirement | Azure AI Service | Approach |
|------------|-----------------|----------|
| Product descriptions | Azure OpenAI (GPT-4o) | Prompt with product specs → generate description |
| Social media posts | Azure OpenAI + Translator | Generate in English, translate to other languages |
| Employee Q&A from policies | Azure OpenAI + AI Search (RAG) | Ground responses in policy documents |
| Customer email responses | Azure OpenAI + AI Language | Detect intent, generate grounded response |

**Key prompt engineering decisions**:
- **Temperature 0.7-0.8** for marketing content (creative)
- **Temperature 0.1-0.3** for policy Q&A (factual accuracy)
- **Grounding (RAG)** for any answers that must be factually accurate
- **Few-shot examples** to maintain brand voice consistency

### Task 5: Architecture Decision — Mapping services to scenarios

Complete the mapping for Contoso's full AI portfolio:

| Department | Primary AI Domain | Primary Azure Service(s) |
|-----------|------------------|-------------------------|
| Customer Support | NLP | Azure AI Language, Translator |
| Warehouse Operations | Computer Vision | Azure AI Vision (Custom Vision) |
| Sales & Marketing | Machine Learning | Azure Machine Learning |
| Content & Marketing | Generative AI | Azure OpenAI Service |
| All departments | Responsible AI | Content filtering, data governance |

**Integration points** (where services work together):
- Customer Support chatbot: Azure AI Language (intent) + Azure OpenAI (response generation) + Translator (multilingual)
- Product listings: Azure AI Vision (extract product details from images) + Azure OpenAI (generate descriptions)
- Demand forecasting: Azure Machine Learning (predictions) + Azure OpenAI (explain predictions in natural language)

### Task 6: Responsible AI Review

For each scenario, identify the responsible AI considerations:

| Scenario | Key Responsible AI Concerns |
|---------|---------------------------|
| Customer sentiment routing | **Fairness**: Ensure sentiment detection doesn't discriminate by language or dialect. **Transparency**: Inform customers their messages are AI-analyzed. |
| Warehouse safety monitoring | **Reliability/Safety**: System must not miss genuine safety hazards. **Human oversight**: Human security team reviews alerts. |
| Sales churn prediction | **Fairness**: Model shouldn't discriminate based on demographics. **Privacy**: Use only consented data for prediction. |
| AI-generated content | **Transparency**: Disclose AI-generated content. **Accountability**: Human review before publication. **Harm prevention**: Content filtering for generated text. |
| Employee policy Q&A | **Grounding**: Must answer from policy documents only (no hallucinations). **Privacy**: Don't expose data across departments. |

**Microsoft's 6 Responsible AI Principles** (applied to Contoso):
1. **Fairness** — AI doesn't discriminate across customer demographics
2. **Reliability & Safety** — Safety monitoring never has dangerous false negatives
3. **Privacy & Security** — Customer data protected, models don't leak information
4. **Inclusiveness** — Support in 15 languages, accessible to all customers
5. **Transparency** — Customers know when AI is involved
6. **Accountability** — Human oversight for all critical decisions

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Solution architecture | Combining multiple AI services to solve complex business problems |
| Service selection | Choosing the right Azure AI service based on the specific requirement |
| Pre-built vs. Custom | Deciding when standard models suffice vs. when custom training is needed |
| Grounding (RAG) | Using retrieval-augmented generation to ensure AI accuracy |
| Multi-service integration | Connecting Azure AI Language, Vision, ML, and OpenAI for end-to-end solutions |
| Responsible AI governance | Applying fairness, transparency, and safety across all AI deployments |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| One AI service can solve all problems | Different problem types require different services — vision for images, language for text, ML for predictions |
| Generative AI replaces all other AI services | Traditional AI (classification, detection, prediction) is still better for structured, well-defined tasks |
| You only need responsible AI for customer-facing systems | Responsible AI applies equally to internal systems (employee tools, operational AI) |
| More AI is always better | Sometimes a simple rule-based system is more appropriate than AI — use AI where it adds genuine value |
| Azure AI services work in isolation | The most powerful solutions combine multiple services — e.g., Vision + Language + OpenAI |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-24-q1',
      question: 'A retail company wants to automatically count products on warehouse shelves using cameras. Which Azure AI capability is most appropriate?',
      options: ['Image classification', 'Object detection', 'OCR (Read API)', 'Facial recognition'],
      correctAnswer: 1,
      explanation: 'Object detection identifies and locates multiple objects within an image, providing bounding boxes and counts. Image classification only categorizes the entire image into one label. For counting individual products on shelves, object detection is needed.'
    },
    {
      id: 'ai900-24-q2',
      question: 'A company wants to predict how many units of a product will sell next month. Which type of machine learning is this?',
      options: ['Classification', 'Clustering', 'Regression', 'Anomaly detection'],
      correctAnswer: 2,
      explanation: 'Predicting a continuous numeric value (number of units) is a regression task. Classification predicts categories, clustering groups data without labels, and anomaly detection identifies outliers.'
    },
    {
      id: 'ai900-24-q3',
      question: 'A customer support system needs to detect the language of incoming emails, analyze sentiment, and translate responses. In what order should these capabilities be applied?',
      options: ['Sentiment → Translation → Language detection', 'Language detection → Sentiment analysis → Translation', 'Translation → Language detection → Sentiment', 'Sentiment → Language detection → Translation'],
      correctAnswer: 1,
      explanation: 'Language detection should come first (you need to know the language before analyzing it), then sentiment analysis (to prioritize), then translation (to respond in the customer\'s language). Each step builds on the previous one.'
    },
    {
      id: 'ai900-24-q4',
      question: 'An AI chatbot answers employee questions about company policies. Which technique ensures responses are accurate and based on actual policy documents?',
      options: ['Grounding with Retrieval-Augmented Generation (RAG)', 'Using a larger language model', 'Increasing the temperature parameter', 'Fine-tuning the model on all internet data'],
      correctAnswer: 0,
      explanation: 'RAG (Retrieval-Augmented Generation) retrieves relevant policy documents and includes them in the prompt, grounding the AI\'s answers in actual source material. This dramatically reduces hallucinations and ensures accuracy for factual Q&A.'
    },
    {
      id: 'ai900-24-q5',
      question: 'Which responsible AI principle requires that an AI-powered customer service bot clearly informs users they are chatting with AI, not a human?',
      options: ['Fairness', 'Reliability', 'Privacy', 'Transparency'],
      correctAnswer: 3,
      explanation: 'Transparency requires that users are informed about how AI systems work and when they are interacting with AI. Disclosing that a chatbot is AI-powered (not human) is a core transparency requirement.'
    },
    {
      id: 'ai900-24-q6',
      question: 'A marketing team wants to generate creative product descriptions. They also need accurate answers to customer FAQs. What temperature settings should they use?',
      options: ['High temperature for both tasks', 'Low temperature for both tasks', 'High temperature for descriptions, low temperature for FAQs', 'Temperature does not affect output quality'],
      correctAnswer: 2,
      explanation: 'Creative content (product descriptions) benefits from higher temperature (0.7-1.0) for varied, creative output. Factual Q&A (FAQs) needs low temperature (0-0.3) for consistent, accurate responses. Different tasks require different settings.'
    },
    {
      id: 'ai900-24-q7',
      question: 'A company deploys AI for warehouse safety monitoring (detecting blocked fire exits). Which responsible AI principle is MOST critical for this scenario?',
      options: ['Reliability and Safety', 'Transparency', 'Inclusiveness', 'Fairness'],
      correctAnswer: 0,
      explanation: 'For safety-critical applications like detecting blocked fire exits, Reliability and Safety is the most important principle. The system must not miss genuine hazards (dangerous false negatives) — a missed detection could endanger lives.'
    },
    {
      id: 'ai900-24-q8',
      question: 'Which combination of Azure AI services would you use to build a multilingual customer support chatbot that understands user intent, generates helpful responses, and communicates in the customer\'s language?',
      options: ['Azure AI Vision + Azure Machine Learning', 'Azure Machine Learning + Azure AI Translator only', 'Azure AI Speech + Azure AI Vision', 'Azure AI Language (CLU) + Azure OpenAI + Azure AI Translator'],
      correctAnswer: 3,
      explanation: 'A multilingual chatbot needs: Azure AI Language (CLU) to understand user intent, Azure OpenAI to generate natural responses, and Azure AI Translator to communicate in the customer\'s language. This combines NLP understanding, generation, and translation.'
    }
  ]}
/>

## Learn More

- [Azure AI services overview](https://learn.microsoft.com/en-us/azure/ai-services/what-are-ai-services)
- [Choose an Azure AI service](https://learn.microsoft.com/en-us/azure/ai-services/ai-services-and-ecosystem)
- [Microsoft Responsible AI principles](https://www.microsoft.com/ai/responsible-ai)
- [Azure AI reference architectures](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/)
- [AI-901 exam study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/AI-901)
