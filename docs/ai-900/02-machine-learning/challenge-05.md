---
sidebar_position: 1
title: "Challenge 05: Regression in Machine Learning"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 05: Regression in Machine Learning

:::info Estimated Time
**25-35 min** | **Cost**: Free | **Domain**: Machine Learning on Azure (15-20%)
:::

## Exam skills covered

- Identify regression machine learning scenarios
- Describe how training data is used in regression
- Identify features and labels in a dataset
- Understand model evaluation metrics for regression

## Overview

Regression is the machine learning technique used to **predict a numeric value**. Whenever the answer to your question is a number — a price, a temperature, a duration, a quantity — you're looking at a regression problem.

Think of regression like drawing the best-fit line through a scatter plot of data points. If you plot house sizes on one axis and their prices on the other, regression finds the pattern (line or curve) that lets you predict the price of a new house based on its size. The model learns: "for every extra 100 square feet, the price increases by approximately $X."

The key vocabulary: **features** are the input data (square footage, number of rooms, location), and the **label** is what you're predicting (the price). **Training data** is historical examples where both features AND the label are known — the model learns the relationship between them.

## Explore

### Task 1: Understand regression terminology

| Term | Definition | Example (predicting house price) |
|------|-----------|----------------------------------|
| **Features** | Input variables used for prediction | Square footage, bedrooms, zip code, year built |
| **Label** | The value being predicted (output) | Sale price ($) |
| **Training data** | Historical examples with known features AND labels | Past house sales with all details |
| **Model** | The mathematical relationship learned from training data | "Price = $150 × sqft + $20,000 × bedrooms + ..." |
| **Prediction** | The model's output for new, unseen data | Estimated price for a house not yet sold |

### Task 2: Identify regression scenarios

Which of these are regression problems? (Answer: all the ones predicting a NUMBER)

| Scenario | Regression? | Why |
|----------|-------------|-----|
| Predicting tomorrow's high temperature | ✅ Yes | Output is a numeric value (degrees) |
| Predicting a student's exam score | ✅ Yes | Output is a number (0-100) |
| Determining if an email is spam | ❌ No | Output is a category (spam/not-spam) — this is classification |
| Predicting how long a delivery will take | ✅ Yes | Output is a number (minutes/hours) |
| Sorting photos into "cat" or "dog" | ❌ No | Output is a category — classification |
| Estimating a car's fuel efficiency (MPG) | ✅ Yes | Output is a numeric value (miles per gallon) |

### Task 3: Explore Azure ML Designer sample regression

1. Visit [Azure Machine Learning Studio](https://ml.azure.com)
2. If you don't have a workspace, review this sample pipeline conceptually:
   - **Dataset**: Automobile price data (features: make, body-style, engine-size, horsepower, etc.)
   - **Algorithm**: Linear Regression
   - **Goal**: Predict the price of a car based on its features
3. The Designer provides a drag-and-drop experience to build ML pipelines without code
4. Sample pipelines demonstrate regression with real datasets

### Task 4: Understand regression evaluation metrics

After training a regression model, you evaluate how good its predictions are:

| Metric | What it measures | Good value |
|--------|-----------------|------------|
| **MAE** (Mean Absolute Error) | Average difference between predicted and actual values | Lower is better |
| **RMSE** (Root Mean Squared Error) | Average error, penalizing large mistakes more | Lower is better |
| **R² (R-squared)** | How much of the variation the model explains | Closer to 1.0 is better |

**Example**: If a model predicts house prices with MAE of $15,000, it means on average, predictions are off by $15,000 from the actual price.

:::tip Exam strategy
The exam tests whether you can IDENTIFY regression scenarios, not whether you can calculate metrics. The key question: **"Is the output a number?"** If yes → regression. If it's a category → classification.
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Regression | ML technique that predicts a continuous numeric value |
| Features | Input variables (predictors) used by the model |
| Label | The target value being predicted |
| Training data | Historical data with known features and labels used to train the model |
| Linear regression | Simplest regression — finds a straight-line relationship between features and label |
| Mean Absolute Error (MAE) | Average magnitude of errors in predictions |
| R-squared (R²) | Proportion of variance in the label explained by the model (0 to 1) |
| Overfitting | Model memorizes training data instead of learning general patterns |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| "Regression means the data goes down (regresses)" | In ML, regression means predicting a numeric value. The term comes from statistics ("regression to the mean") — it has nothing to do with declining trends |
| "Regression can only predict future values" | Regression predicts any numeric value — past, present, or future. Predicting the age of a fossil or the price of a painting are both regression |
| "More features always make a better model" | Irrelevant features add noise and can worsen predictions. Feature selection — choosing the RIGHT inputs — is crucial |
| "Linear regression can only model straight lines" | Linear regression models straight-line relationships. But Azure ML offers many regression algorithms (decision trees, neural networks) that can model complex curves |
| "A high R² always means the model is good" | A very high R² on training data might indicate overfitting — the model memorized the training data but won't generalize to new data |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-05-q1',
      question: 'A company wants to predict how many units of a product they will sell next month based on historical sales data, advertising spend, and seasonal trends. What type of ML problem is this?',
      options: ['Classification', 'Clustering', 'Regression', 'Anomaly detection'],
      correctAnswer: 2,
      explanation: 'Predicting "how many units" is predicting a numeric value, which is regression. The features (history, ad spend, seasonality) are used to forecast a continuous number (units sold).'
    },
    {
      id: 'ai900-05-q2',
      question: 'In a dataset used to predict house prices, which of the following would be the LABEL?',
      options: ['Number of bedrooms', 'Square footage', 'Sale price', 'Year built'],
      correctAnswer: 2,
      explanation: 'The label is what you are predicting — in this case, the sale price. Number of bedrooms, square footage, and year built are features (inputs) used to predict the price (label/output).'
    },
    {
      id: 'ai900-05-q3',
      question: 'A regression model has an R-squared value of 0.92. What does this tell you?',
      options: ['The model is 92% accurate', 'The model explains 92% of the variation in the predicted values', 'The model has a 92% chance of being correct', 'The model takes 0.92 seconds to run'],
      correctAnswer: 1,
      explanation: 'R-squared (R²) measures the proportion of variance in the label that is explained by the model. A value of 0.92 means the model explains 92% of the variation in the target variable.'
    },
    {
      id: 'ai900-05-q4',
      question: 'Which scenario is NOT a regression problem?',
      options: ['Predicting the temperature at noon tomorrow', 'Estimating the time to complete a project', 'Determining whether a patient has a disease or not', 'Forecasting quarterly revenue'],
      correctAnswer: 2,
      explanation: 'Determining whether a patient has a disease (yes/no) is classification — the output is a category, not a number. All other options predict numeric values (temperature, time, revenue) and are regression problems.'
    },
    {
      id: 'ai900-05-q5',
      question: 'What is the role of training data in a regression model?',
      options: ['To test the model after deployment', 'To provide examples with known features and labels so the model can learn patterns', 'To validate the model during development', 'To generate synthetic data for testing'],
      correctAnswer: 1,
      explanation: 'Training data provides historical examples where both the features (inputs) and the label (output) are known. The model learns the mathematical relationship between features and labels from this data.'
    }
  ]}
/>

## Learn More

- [Microsoft Learn: Create a regression model with Azure ML Designer](https://learn.microsoft.com/en-us/training/modules/create-regression-model-azure-machine-learning-designer/)
- [Azure Machine Learning documentation](https://learn.microsoft.com/en-us/azure/machine-learning/)
- [Regression algorithms in Azure ML](https://learn.microsoft.com/en-us/azure/machine-learning/algorithm-cheat-sheet)
