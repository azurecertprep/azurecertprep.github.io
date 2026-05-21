---
sidebar_position: 1
title: "Challenge 01: What is Cloud Computing?"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 01: What is Cloud Computing?

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Cloud Concepts (25-30%)
:::

## Exam skills covered

- Define cloud computing
- Describe the shared responsibility model
- Define cloud models (public, private, hybrid)
- Identify appropriate use cases for each cloud model

## Overview

Cloud computing is the delivery of computing services — servers, storage, databases, networking, software — over the internet ("the cloud"). Instead of buying and maintaining physical hardware, you rent resources from a cloud provider like Microsoft Azure.

Think of it like electricity: you don't build a power plant to turn on a light. You plug into the grid and pay for what you use. Cloud computing works the same way — you access computing power on demand and pay only for what you consume.

The **shared responsibility model** defines who is responsible for what. The cloud provider always manages the physical infrastructure (hardware, network, datacenter). What YOU manage depends on the service type (IaaS, PaaS, or SaaS).

## Explore

### Task 1: Understand cloud models

There are three cloud deployment models. Review the differences:

| Model | Description | Example |
|-------|-------------|---------|
| **Public cloud** | Resources owned by cloud provider, shared across customers | Azure, AWS, Google Cloud |
| **Private cloud** | Resources dedicated to a single organization | Azure Stack, on-premises datacenter |
| **Hybrid cloud** | Combination of public and private clouds | On-prem AD + Azure Entra ID |

**Your task**: Think about your current or previous organization. Which cloud model would fit best? Why?

### Task 2: Explore the shared responsibility model

Navigate to: [Microsoft's shared responsibility documentation](https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility)

Review this table:

| Responsibility | On-premises | IaaS | PaaS | SaaS |
|---------------|-------------|------|------|------|
| Data & access | You | You | You | You |
| Applications | You | You | Shared | Provider |
| Network controls | You | You | Shared | Provider |
| Operating system | You | You | Provider | Provider |
| Physical infrastructure | You | Provider | Provider | Provider |

**Key insight**: YOU are always responsible for your data, accounts, and access management — regardless of cloud model.

### Task 3: Visit the Azure Portal

1. Open [portal.azure.com](https://portal.azure.com)
2. Look at the top search bar — this is how you find any Azure service
3. Click **All services** in the left menu
4. Browse the categories: Compute, Networking, Storage, Databases, etc.
5. Notice how many services exist — Azure offers 200+ services across these categories

### Task 4: Explore Azure's global presence

1. Visit [azure.microsoft.com/explore/global-infrastructure](https://azure.microsoft.com/explore/global-infrastructure)
2. Notice the number of regions worldwide
3. This is the "cloud" — massive datacenters distributed globally

:::tip Azure CLI Alternative
```bash
# List all Azure regions
az account list-locations --output table

# Show your current subscription
az account show --output table
```
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Cloud computing | On-demand delivery of IT resources via the internet with pay-as-you-go pricing |
| Public cloud | Multi-tenant environment managed by a cloud provider |
| Private cloud | Single-tenant environment, can be on-premises or hosted |
| Hybrid cloud | Combines public and private clouds, allowing data/apps to move between them |
| Shared responsibility | Security/management duties split between provider and customer |
| Multi-cloud | Using services from multiple cloud providers |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-01-q1',
      question: 'Which cloud model makes resources available to multiple organizations over the public internet?',
      options: ['Private cloud', 'Public cloud', 'Hybrid cloud', 'Community cloud'],
      correctAnswer: 1,
      explanation: 'A public cloud is owned by a third-party cloud provider and makes resources available to multiple organizations and users over the public internet.'
    },
    {
      id: 'az900-01-q2',
      question: 'In the shared responsibility model, who is ALWAYS responsible for the data stored in the cloud?',
      options: ['The cloud provider', 'The customer', 'Both equally', 'The network provider'],
      correctAnswer: 1,
      explanation: 'Regardless of the cloud deployment model (IaaS, PaaS, or SaaS), the customer is always responsible for their data, endpoints, accounts, and access management.'
    },
    {
      id: 'az900-01-q3',
      question: 'A company wants to keep sensitive data on-premises but use Azure for additional compute capacity during peak periods. Which cloud model describes this approach?',
      options: ['Public cloud', 'Private cloud', 'Hybrid cloud', 'Multi-cloud'],
      correctAnswer: 2,
      explanation: 'A hybrid cloud combines on-premises (private) infrastructure with public cloud services, allowing data and applications to be shared between them.'
    },
    {
      id: 'az900-01-q4',
      question: 'In a public cloud model, who is responsible for maintaining the physical hardware?',
      options: ['The customer', 'The cloud provider', 'A third-party contractor', 'The customer and provider share this equally'],
      correctAnswer: 1,
      explanation: 'In any cloud model, the cloud provider is always responsible for the physical infrastructure — servers, networking hardware, and the datacenter facility.'
    },
    {
      id: 'az900-01-q5',
      question: 'Which of the following is a characteristic of cloud computing?',
      options: ['Fixed monthly costs regardless of usage', 'Resources are delivered over the internet on demand', 'Requires purchasing physical servers upfront', 'Only available to large enterprises'],
      correctAnswer: 1,
      explanation: 'Cloud computing delivers resources over the internet on demand. You can scale up or down as needed and typically pay only for what you use.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe cloud computing](https://learn.microsoft.com/en-us/training/modules/describe-cloud-compute/)
- [Shared responsibility in the cloud](https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility)
