---
sidebar_position: 5
title: "Challenge 09: Azure Machine Learning Workspace"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 09: Azure Machine Learning Workspace

:::info Estimated Time
**25-35 min** | **Cost**: Free | **Domain**: Machine Learning on Azure (15-20%)
:::

## Exam skills covered

- Describe capabilities of Automated Machine Learning
- Describe data and compute services for machine learning
- Describe model management and deployment capabilities in Azure ML

## Overview

Azure Machine Learning (Azure ML) is a cloud platform for building, training, and deploying machine learning models. The **workspace** is the central hub — think of it as your ML laboratory that contains all your experiments, data, models, and compute resources in one organized space.

Think of Azure ML workspace like a professional kitchen. The kitchen (workspace) contains ingredients (datasets), cooking equipment (compute), recipes (notebooks/pipelines), finished dishes (trained models), and a serving counter (endpoints for deployment). Everything you need for the entire ML lifecycle is in one place.

Azure ML supports three main approaches: **Automated ML** (the platform builds models for you), **Designer** (drag-and-drop visual pipelines), and **Notebooks** (write code directly). For the AI-900 exam, focus on understanding what each component does rather than how to code with it.

## Explore

### Task 1: Azure ML workspace components

| Component | Purpose | Analogy |
|-----------|---------|---------|
| **Workspace** | Top-level container for all ML assets | The laboratory |
| **Datastores** | Connections to data storage (Blob, SQL, etc.) | Ingredient pantry |
| **Datasets** | Registered, versioned collections of data | Prepared recipe ingredients |
| **Compute instances** | VMs for development (notebooks) | Your personal workstation |
| **Compute clusters** | Scalable VMs for training jobs | Industrial kitchen ovens |
| **Experiments** | Records of training runs with metrics | Lab notebook with results |
| **Models** | Trained ML models (registered and versioned) | Perfected recipes |
| **Endpoints** | Deployed models serving predictions | Restaurant serving counter |
| **Pipelines** | Automated workflows (data prep → train → deploy) | Assembly line |

### Task 2: Navigate Azure ML Studio

1. Visit [ml.azure.com](https://ml.azure.com) (Azure Machine Learning Studio)
2. If you don't have a workspace, explore the interface conceptually:
   - **Left menu**: Author (Notebooks, Automated ML, Designer) | Assets (Data, Jobs, Models, Endpoints) | Manage (Compute)
3. Key areas to understand for the exam:
   - **Automated ML**: Upload data → choose target column → Azure builds the best model
   - **Designer**: Visual drag-and-drop pipeline builder
   - **Models**: Registry of all trained models with versions
   - **Endpoints**: Where deployed models serve predictions

### Task 3: Understand Automated ML capabilities

Automated ML (AutoML) automates the most time-consuming parts of machine learning:

| Step | What AutoML does automatically |
|------|-------------------------------|
| **Algorithm selection** | Tests multiple algorithms (logistic regression, decision trees, gradient boosting, etc.) |
| **Hyperparameter tuning** | Finds the best settings for each algorithm |
| **Feature engineering** | Creates and selects the most useful features |
| **Model evaluation** | Compares all models using appropriate metrics |
| **Best model selection** | Returns the top-performing model |

**AutoML supports three task types**:
- **Classification** — predict categories
- **Regression** — predict numbers
- **Time-series forecasting** — predict future values over time

### Task 4: Model deployment and endpoints

Once a model is trained, it needs to be deployed so applications can use it:

| Deployment type | Use case | How it works |
|----------------|----------|-------------|
| **Real-time endpoint** | Immediate predictions | Application sends data, gets prediction back instantly (REST API) |
| **Batch endpoint** | Process large datasets | Submit a dataset, get predictions back later (asynchronous) |

**Deployment workflow**:
1. **Register** the model in the Model Registry
2. **Create** an endpoint (real-time or batch)
3. **Deploy** the model to the endpoint
4. **Test** by sending data and receiving predictions
5. **Monitor** performance and data drift over time

:::tip Azure CLI Alternative
```bash
# List Azure ML workspaces in your subscription
az ml workspace list --output table

# List compute instances in a workspace
az ml compute list --workspace-name my-workspace --resource-group my-rg --output table

# List registered models
az ml model list --workspace-name my-workspace --resource-group my-rg --output table
```
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Azure ML workspace | Central hub containing all ML resources: data, compute, models, endpoints |
| Automated ML (AutoML) | Feature that automatically trains and compares multiple models, selecting the best one |
| Compute instance | Single VM for development and testing (notebooks) |
| Compute cluster | Scalable group of VMs that grows/shrinks based on training job demand |
| Model registry | Versioned catalog of trained models for tracking and deployment |
| Real-time endpoint | Deployed model that returns predictions immediately via REST API |
| Batch endpoint | Deployed model that processes large datasets asynchronously |
| ML pipeline | Automated, repeatable workflow for the full ML process |
| Designer | Visual drag-and-drop tool for building ML pipelines without code |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| "You need to know how to code to use Azure ML" | Azure ML Designer provides a drag-and-drop visual experience, and Automated ML builds models with minimal configuration. Code (Python) is optional |
| "Automated ML produces production-ready models every time" | Automated ML gives you a great starting point, but production deployment often requires additional evaluation, testing, and monitoring |
| "A compute instance is required to deploy a model" | Compute instances are for development. Deployed models run on managed endpoints — separate infrastructure optimized for serving predictions |
| "Once deployed, a model never needs updating" | Models degrade over time as real-world data changes (concept drift / data drift). Monitoring and retraining are ongoing needs |
| "Azure ML and Azure AI services are the same thing" | Azure AI services provide pre-built, ready-to-use AI APIs. Azure ML is for building your OWN custom models from your data |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-09-q1',
      question: 'A data scientist wants Azure to automatically try multiple algorithms and select the best-performing model for their dataset. Which Azure ML feature should they use?',
      options: ['Azure ML Designer', 'Automated ML', 'Azure ML Notebooks', 'Azure AI services'],
      correctAnswer: 1,
      explanation: 'Automated ML (AutoML) automatically tests multiple algorithms, tunes hyperparameters, and selects the best model. It automates the most time-consuming parts of the ML model selection process.'
    },
    {
      id: 'ai900-09-q2',
      question: 'What is the purpose of a real-time endpoint in Azure Machine Learning?',
      options: ['To store training data', 'To train the model faster', 'To serve immediate predictions via REST API when applications send data', 'To monitor model performance'],
      correctAnswer: 2,
      explanation: 'A real-time endpoint deploys a trained model as a REST API that applications can call. When data is sent to the endpoint, it returns predictions immediately — enabling real-time inference in applications.'
    },
    {
      id: 'ai900-09-q3',
      question: 'Which Azure ML component provides a visual, drag-and-drop experience for building machine learning pipelines?',
      options: ['Designer', 'Automated ML', 'Notebooks', 'Compute clusters'],
      correctAnswer: 0,
      explanation: 'Azure ML Designer provides a visual canvas where you drag and drop components (data modules, algorithms, evaluation steps) to build ML pipelines without writing code.'
    },
    {
      id: 'ai900-09-q4',
      question: 'What is the difference between a compute instance and a compute cluster in Azure ML?',
      options: ['Compute instances are free; clusters cost money', 'Compute instances are for deployment; clusters are for training', 'There is no difference — they are the same thing', 'Compute instances are for development; clusters scale for training jobs'],
      correctAnswer: 3,
      explanation: 'A compute instance is a single VM for individual development work (running notebooks, exploring data). A compute cluster is a scalable group of VMs that automatically grows and shrinks based on training job demands.'
    },
    {
      id: 'ai900-09-q5',
      question: 'What is the primary difference between Azure Machine Learning and Azure AI services?',
      options: ['Azure ML is free; AI services are paid', 'Azure ML lets you build custom models; AI services provide pre-built, ready-to-use AI APIs', 'AI services are more accurate than Azure ML', 'Azure ML only works with Python; AI services work with any language'],
      correctAnswer: 1,
      explanation: 'Azure ML is a platform for building, training, and deploying your OWN custom models from your data. Azure AI services provide pre-built, ready-to-use AI APIs (Vision, Language, Speech) that work immediately without custom training.'
    }
  ]}
/>

## Learn More

- [Microsoft Learn: Azure Machine Learning fundamentals](https://learn.microsoft.com/en-us/training/modules/use-automated-machine-learning/)
- [Azure ML workspace documentation](https://learn.microsoft.com/en-us/azure/machine-learning/concept-workspace)
- [Automated ML documentation](https://learn.microsoft.com/en-us/azure/machine-learning/concept-automated-ml)
- [Deploy models with Azure ML](https://learn.microsoft.com/en-us/azure/machine-learning/concept-endpoints)
