---
sidebar_position: 2
title: "Challenge 06: Classification in Machine Learning"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 06: Classification in Machine Learning

:::info Estimated Time
**25-35 min** | **Cost**: Free | **Domain**: AI Concepts & Capabilities (40-45%)
:::

## Exam skills covered

- Identify classification machine learning scenarios
- Describe binary classification vs multi-class classification
- Understand training and evaluation of classification models
- Identify appropriate evaluation metrics for classification

## Overview

Classification is the machine learning technique used to **predict a category** (also called a class or label). Whenever the answer to your question is "which group does this belong to?" — you're looking at a classification problem. Spam/not-spam, disease/healthy, cat/dog/bird — these are all classification.

Think of classification like a mail sorter at the post office. Letters arrive, and the sorter puts each one into the correct bin based on features (zip code, size, weight). The sorter learned the rules by seeing thousands of previously sorted letters (training data). Now it can classify new letters it has never seen before.

There are two types: **binary classification** has exactly two possible outcomes (yes/no, true/false, spam/not-spam). **Multi-class classification** has three or more possible outcomes (cat/dog/bird, or categorizing support tickets into billing/technical/shipping/other).

## Explore

### Task 1: Binary vs multi-class classification

| Type | Number of classes | Examples |
|------|------------------|----------|
| **Binary** | Exactly 2 | Spam or not spam, fraud or legitimate, pass or fail, positive or negative sentiment |
| **Multi-class** | 3 or more | Animal species (cat/dog/bird/fish), product category, language detection, disease type |

**Key rule**: If the output is one of TWO possible categories → binary. If THREE or more → multi-class.

### Task 2: Identify classification scenarios

| Scenario | Type | Why |
|----------|------|-----|
| Is this credit card transaction fraudulent? | Binary | Two outcomes: fraud / not fraud |
| What language is this text written in? | Multi-class | Many possible languages |
| Will this customer churn (leave)? | Binary | Two outcomes: yes / no |
| What type of iris flower is this? | Multi-class | Three species: setosa, versicolor, virginica |
| Does this X-ray show pneumonia? | Binary | Two outcomes: pneumonia / normal |
| Which department should handle this ticket? | Multi-class | Multiple departments (billing, tech, shipping...) |

### Task 3: Explore Automated ML for classification

Azure Machine Learning's Automated ML can build classification models with minimal effort:

1. Visit [Azure Machine Learning Studio](https://ml.azure.com)
2. Review the Automated ML concept:
   - You provide a labeled dataset (features + known categories)
   - Automated ML tries multiple algorithms and settings
   - It returns the best-performing model automatically
3. For exam purposes, understand these Automated ML capabilities:
   - **Data guardrails**: Automatically checks for data quality issues
   - **Algorithm selection**: Tests multiple algorithms (logistic regression, decision trees, etc.)
   - **Hyperparameter tuning**: Optimizes model settings automatically
   - **Feature engineering**: Can create new features from existing data

### Task 4: Understand classification evaluation metrics

| Metric | What it measures | Simple explanation |
|--------|-----------------|-------------------|
| **Accuracy** | Overall correctness | "What % of predictions were correct?" |
| **Precision** | Quality of positive predictions | "When it says 'spam', how often is it right?" |
| **Recall** | Completeness of positive detection | "Of all actual spam, what % did it catch?" |
| **F1 Score** | Balance of precision and recall | Harmonic mean — useful when classes are imbalanced |
| **AUC** | Model's ability to distinguish classes | 1.0 = perfect, 0.5 = random guessing |

**Example**: A spam filter with high precision but low recall means: when it flags something as spam, it's usually right — but it misses a lot of actual spam.

:::tip Exam insight
The exam loves questions about when accuracy alone is misleading. If 99% of emails are legitimate and 1% are spam, a model that says "not spam" for everything has 99% accuracy but catches ZERO spam. This is why precision, recall, and AUC matter.
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Classification | ML technique that predicts which category/class an item belongs to |
| Binary classification | Classification with exactly two possible outcomes |
| Multi-class classification | Classification with three or more possible outcomes |
| Logistic regression | Common algorithm for binary classification (despite the name, it classifies) |
| Confusion matrix | Table showing true positives, true negatives, false positives, and false negatives |
| Precision | Of all items predicted as positive, what percentage actually are positive |
| Recall (Sensitivity) | Of all actual positive items, what percentage did the model correctly identify |
| AUC (Area Under Curve) | Measures how well the model separates the classes (0.5 to 1.0) |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| "Classification and regression are interchangeable" | Classification predicts categories (spam/not-spam). Regression predicts numbers ($500, 73 degrees). The output type determines which technique to use |
| "Binary classification can only output 'yes' or 'no'" | Binary means two classes, but they can be anything: spam/ham, malignant/benign, approved/denied. It's always exactly two outcomes |
| "Logistic regression is a regression technique" | Despite its name, logistic regression is used for classification. It outputs a probability (0 to 1) which is then converted to a class label |
| "Higher accuracy always means a better model" | With imbalanced datasets, accuracy is misleading. A model predicting the majority class always can have high accuracy but zero usefulness for detecting the minority class |
| "You need thousands of examples to classify" | While more data generally helps, the required amount depends on the problem complexity. Some problems work well with hundreds of examples per class |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-06-q1',
      question: 'A hospital wants to predict whether a tumor is malignant or benign based on cell measurements. What type of machine learning problem is this?',
      options: ['Regression', 'Binary classification', 'Multi-class classification', 'Clustering'],
      correctAnswer: 1,
      explanation: 'This is binary classification because the prediction has exactly two possible outcomes: malignant or benign. The model assigns one of two category labels based on the input features.'
    },
    {
      id: 'ai900-06-q2',
      question: 'An image recognition system needs to identify whether a photo contains a cat, dog, bird, or fish. What type of classification is this?',
      options: ['Binary classification', 'Clustering', 'Regression', 'Multi-class classification'],
      correctAnswer: 3,
      explanation: 'This is multi-class classification because there are more than two possible categories (cat, dog, bird, fish). Each image is assigned one of multiple class labels.'
    },
    {
      id: 'ai900-06-q3',
      question: 'A spam detection model has high precision but low recall. What does this mean in practice?',
      options: ['When it flags something as spam, it is usually correct, but it misses many actual spam emails', 'It catches all spam but also flags some legitimate emails', 'It is very fast but not very accurate', 'It works well on training data but poorly on new data'],
      correctAnswer: 0,
      explanation: 'High precision means the model is usually correct when it predicts spam (few false positives). Low recall means it misses many actual spam emails (many false negatives). It is conservative — when unsure, it says "not spam."'
    },
    {
      id: 'ai900-06-q4',
      question: 'Which Azure Machine Learning capability automatically tries multiple algorithms and selects the best classification model?',
      options: ['Azure ML Designer', 'Azure ML Notebooks', 'Automated ML (AutoML)', 'Azure AI Language'],
      correctAnswer: 2,
      explanation: 'Automated ML (AutoML) automatically tests multiple algorithms, tunes hyperparameters, and selects the best-performing model for your dataset. It simplifies the model selection process.'
    },
    {
      id: 'ai900-06-q5',
      question: 'What is the key difference between a classification problem and a regression problem?',
      options: ['Classification uses labeled data; regression does not', 'Classification predicts categories; regression predicts numeric values', 'Regression is more accurate than classification', 'Classification only works with images; regression works with numbers'],
      correctAnswer: 1,
      explanation: 'The fundamental difference is the output type. Classification predicts a discrete category (spam/not-spam, cat/dog/bird). Regression predicts a continuous numeric value (price, temperature, duration).'
    }
  ]}
/>

## Learn More

- [Microsoft Learn: Create a classification model with Azure ML Designer](https://learn.microsoft.com/en-us/training/modules/create-classification-model-azure-machine-learning-designer/)
- [Automated ML classification](https://learn.microsoft.com/en-us/azure/machine-learning/how-to-auto-train-classification)
- [Classification algorithms in Azure ML](https://learn.microsoft.com/en-us/azure/machine-learning/algorithm-cheat-sheet)
