---
sidebar_position: 3
title: "Challenge 07: Clustering in Machine Learning"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 07: Clustering in Machine Learning

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Machine Learning on Azure (15-20%)
:::

## Exam skills covered

- Identify clustering machine learning scenarios
- Describe how clustering differs from classification
- Understand unsupervised learning concepts
- Identify appropriate use cases for clustering

## Overview

Clustering is the machine learning technique used to **group similar items together** when you don't have predefined categories. Unlike classification (where you know the categories in advance — spam/not-spam), clustering discovers natural groupings in data on its own.

Think of clustering like organizing a messy drawer. You dump out 100 items and start grouping things that seem similar: pens go together, batteries go together, cables go together. Nobody told you these categories in advance — you discovered them by looking at similarities. That's clustering.

The critical distinction: classification is **supervised learning** (you provide labeled examples), while clustering is **unsupervised learning** (no labels needed). Clustering finds patterns and groupings that you might not have known existed.

## Explore

### Task 1: Classification vs Clustering

Understanding the difference is one of the most-tested concepts:

| Aspect | Classification | Clustering |
|--------|---------------|------------|
| **Learning type** | Supervised | Unsupervised |
| **Labels needed?** | Yes — training data has known categories | No — no labels required |
| **Categories** | Predefined (you specify them) | Discovered (the algorithm finds them) |
| **Goal** | Assign items to KNOWN groups | Discover UNKNOWN groups |
| **Example** | "This email is spam" (label known) | "These customers behave similarly" (groups discovered) |

### Task 2: Identify clustering scenarios

| Scenario | Why it's clustering |
|----------|-------------------|
| **Customer segmentation** | Group customers by purchasing behavior to discover segments you didn't know existed |
| **Document grouping** | Organize articles into topic groups without predefined categories |
| **Anomaly detection** | Items that don't fit any cluster may be outliers |
| **Gene expression analysis** | Group genes with similar expression patterns |
| **Image compression** | Group similar colors together to reduce the number of unique colors |

**NOT clustering** (these are classification):
- Sorting emails into spam/not-spam (labels are known)
- Diagnosing a disease as Type A, B, or C (categories predefined by doctors)
- Grading student essays as A/B/C/D/F (grades are predetermined)

### Task 3: Understand K-Means clustering

K-Means is the most common clustering algorithm and the one referenced in the exam:

1. **Choose K** — decide how many clusters you want (e.g., K=3 for 3 groups)
2. **Initialize** — place K random center points (centroids)
3. **Assign** — each data point joins the nearest centroid's cluster
4. **Update** — move each centroid to the center of its assigned points
5. **Repeat** — keep assigning and updating until clusters stabilize

**Key decisions**:
- **How many clusters (K)?** — There's no perfect answer. You try different values and evaluate which makes most business sense
- **What features to use?** — The features you include determine what "similar" means

### Task 4: Clustering in Azure Machine Learning

In Azure ML, you can build clustering models using:

1. **Azure ML Designer** — drag-and-drop clustering pipeline
   - Use the "K-Means Clustering" module
   - Connect to a dataset (no label column needed!)
   - Configure the number of clusters
   - Evaluate results with metrics like silhouette score

2. **Key metrics for clustering**:
   - **Silhouette score**: Measures how similar items are to their own cluster vs. other clusters (-1 to 1, higher is better)
   - **Inertia**: Sum of distances from points to their cluster center (lower is better)

:::tip Exam strategy
The exam trigger for clustering: **"No labels"** or **"discover groups"** or **"segment customers"**. If the scenario says "we don't know the categories yet" or "find natural groupings" → clustering. If categories are already known → classification.
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Clustering | Unsupervised ML technique that groups similar data points together |
| Unsupervised learning | ML approach that finds patterns without labeled training data |
| Supervised learning | ML approach that uses labeled training data (classification, regression) |
| K-Means | Popular clustering algorithm that divides data into K groups based on distance to centroids |
| Centroid | The center point of a cluster |
| K (number of clusters) | A parameter you choose — how many groups the algorithm should create |
| Silhouette score | Metric measuring how well-separated clusters are (-1 to 1) |
| Customer segmentation | Common use case: grouping customers by behavior to discover market segments |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| "Clustering and classification are the same thing" | Classification assigns items to KNOWN categories using labeled data. Clustering DISCOVERS unknown groups without labels. The presence or absence of predefined labels is the key difference |
| "Clustering tells you what each group means" | Clustering finds groups of similar items, but interpreting what each group represents is a human task. The algorithm says "these items are similar" — you decide the meaning |
| "You must know the number of clusters beforehand" | While K-Means requires you to specify K, you typically try multiple values and use metrics (silhouette score) or business logic to pick the best number |
| "Clustering requires large datasets" | Clustering can work with smaller datasets, though the quality of discovered groups improves with more data. Even a few hundred points can form meaningful clusters |
| "Unsupervised means no human involvement" | Unsupervised means no labels in the data. Humans still choose features, set parameters (like K), interpret results, and validate that clusters are meaningful |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-07-q1',
      question: 'A marketing team wants to group their customers into segments based on purchasing behavior, but they do not have predefined customer categories. Which ML technique should they use?',
      options: ['Regression', 'Classification', 'Clustering', 'Anomaly detection'],
      correctAnswer: 2,
      explanation: 'Clustering groups similar items without predefined categories. Since the marketing team wants to DISCOVER customer segments (not assign to known ones), clustering is the correct approach.'
    },
    {
      id: 'ai900-07-q2',
      question: 'What is the KEY difference between clustering and classification?',
      options: ['Clustering is faster than classification', 'Classification requires labeled training data; clustering does not', 'Clustering is more accurate than classification', 'Classification only works with text data'],
      correctAnswer: 1,
      explanation: 'Classification is supervised learning — it requires labeled training data with known categories. Clustering is unsupervised — it discovers natural groupings without needing labels. This is the fundamental distinction.'
    },
    {
      id: 'ai900-07-q3',
      question: 'In K-Means clustering, what does "K" represent?',
      options: ['The number of features in the dataset', 'The number of data points', 'The number of clusters to create', 'The accuracy threshold'],
      correctAnswer: 2,
      explanation: 'K represents the number of clusters the algorithm will create. You specify K as a parameter, and the algorithm divides the data into exactly K groups based on similarity.'
    },
    {
      id: 'ai900-07-q4',
      question: 'Which of the following is NOT a clustering scenario?',
      options: ['Grouping similar news articles by topic', 'Segmenting customers by shopping behavior', 'Predicting whether an email is spam or not spam', 'Discovering groups of similar genes'],
      correctAnswer: 2,
      explanation: 'Predicting spam/not-spam is classification — the categories (spam, not-spam) are predefined, and you train with labeled examples. All other options discover unknown groupings without predefined labels.'
    },
    {
      id: 'ai900-07-q5',
      question: 'A clustering algorithm groups data based on similarity. Who determines what the discovered groups MEAN or represent?',
      options: ['The algorithm automatically names each group', 'Azure AI assigns business labels', 'Humans interpret and assign meaning to the clusters', 'The training data provides the group names'],
      correctAnswer: 2,
      explanation: 'Clustering algorithms find groups of similar items but do not interpret their meaning. Humans must analyze the characteristics of each cluster and assign business meaning (e.g., "these are budget shoppers" or "these are premium customers").'
    }
  ]}
/>

## Learn More

- [Microsoft Learn: Create a clustering model with Azure ML Designer](https://learn.microsoft.com/en-us/training/modules/create-clustering-model-azure-machine-learning-designer/)
- [K-Means clustering in Azure ML](https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/k-means-clustering)
- [Supervised vs unsupervised learning](https://learn.microsoft.com/en-us/azure/machine-learning/concept-what-is-machine-learning)
