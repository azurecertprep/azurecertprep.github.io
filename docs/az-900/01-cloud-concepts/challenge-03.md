---
sidebar_position: 3
title: "Challenge 03: Cloud Pricing Models"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 03: Cloud Pricing Models

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Cloud Concepts (25-30%)
:::

## Exam skills covered

- Describe the consumption-based model
- Compare cloud pricing models (CapEx vs OpEx)
- Describe serverless

## Overview

One of the biggest shifts when moving to the cloud is how you pay for IT. Traditional on-premises computing requires large upfront investments (buying servers, building datacenters). Cloud computing shifts this to a pay-as-you-go model — like paying for electricity rather than building a power plant.

Understanding the difference between **Capital Expenditure (CapEx)** and **Operational Expenditure (OpEx)** is fundamental to the AZ-900 exam and to understanding cloud economics.

## Explore

### Task 1: CapEx vs OpEx

| Aspect | CapEx (Traditional) | OpEx (Cloud) |
|--------|--------------------:|-------------:|
| Payment timing | Upfront | Monthly/hourly |
| Ownership | You own it | You rent it |
| Depreciation | Depreciates over time | No depreciation |
| Scaling | Buy more hardware | Click a button |
| Risk | Overprovisioning or underprovisioning | Pay for what you use |
| Example | Buying servers for $100K | Azure VM at $0.05/hour |

### Task 2: Use the Azure Pricing Calculator

1. Open [azure.microsoft.com/pricing/calculator](https://azure.microsoft.com/pricing/calculator/)
2. Click **Virtual Machines** from the products list
3. Configure:
   - Region: East US
   - OS: Linux
   - Type: D2s v3 (2 vCPUs, 8 GB RAM)
   - Leave other defaults
4. Observe the monthly cost estimate
5. Now change to **Windows** — see how the cost increases (OS licensing)
6. Change region to **West Europe** — notice price may differ by region

### Task 3: Use the TCO Calculator

1. Open [azure.microsoft.com/pricing/tco/calculator](https://azure.microsoft.com/pricing/tco/calculator/)
2. In **Define your workloads**, add:
   - Servers: 2 servers, Windows, 4 cores, 16 GB RAM
3. Click **Next** (Adjust assumptions)
4. Review the assumptions about electricity, labor, etc.
5. Click **Next** (View report)
6. See the 5-year cost comparison between on-premises and Azure

### Task 4: Understand the consumption-based model

The consumption-based model means:
- **No upfront cost** — start using services immediately
- **No wasted resources** — stop paying when you stop using
- **Pay for what you need** — scale up/down with demand
- **Predictable billing** — usage-based forecasting

**Real-world analogy:**
| Model | Analogy |
|-------|---------|
| CapEx | Buying a car (upfront cost, maintenance, depreciation) |
| OpEx | Uber/taxi (pay per ride, no maintenance, no ownership) |

### Task 5: Understand serverless

Serverless computing is the ultimate consumption-based model:
- You deploy code, not infrastructure
- The platform manages all servers
- You pay only when your code runs (per execution)
- Azure Functions: first 1 million executions/month are **free**

:::tip Azure CLI Alternative
```bash
# List available VM sizes and specs
az vm list-sizes --location eastus --query "[?name=='Standard_D2s_v3']" --output table

# List VM sizes available in the region
az vm list-sizes --location eastus --query "[?name=='Standard_B1s']" --output table
```
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| **CapEx** | Large upfront investment in physical infrastructure; depreciates over time |
| **OpEx** | Ongoing operational spending; pay-as-you-go with no upfront cost |
| **Consumption-based** | Pay only for what you actually use; meters track usage |
| **Serverless** | Maximum abstraction — no server management, pay per execution |
| **Reserved Instances** | Commit to 1-3 year terms for significant discounts (still OpEx) |
| **Spot pricing** | Use unused Azure capacity at deep discounts (can be evicted) |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-03-q1',
      question: 'A company is considering moving to Azure to avoid purchasing new servers. Which financial benefit of cloud computing does this represent?',
      options: ['Moving from OpEx to CapEx', 'Moving from CapEx to OpEx', 'Eliminating all IT costs', 'Reducing CapEx while increasing OpEx proportionally'],
      correctAnswer: 1,
      explanation: 'Moving to cloud shifts spending from CapEx (buying servers) to OpEx (paying monthly for cloud services). You trade large upfront costs for smaller recurring expenses.'
    },
    {
      id: 'az900-03-q2',
      question: 'Which pricing model means you only pay for resources when they are being used?',
      options: ['Reserved pricing', 'Consumption-based pricing', 'Capital expenditure', 'Fixed-rate pricing'],
      correctAnswer: 1,
      explanation: 'The consumption-based model means you pay for resources only while they are being used. When you stop using them, you stop paying. This is the fundamental cloud pricing model.'
    },
    {
      id: 'az900-03-q3',
      question: 'What is a characteristic of serverless computing?',
      options: ['You manage the underlying servers', 'You pay a fixed monthly rate', 'You pay only when your code executes', 'It requires reserved capacity'],
      correctAnswer: 2,
      explanation: 'In serverless computing (like Azure Functions), you are charged based on the number of executions and the time your code runs. When your code is not running, you pay nothing.'
    },
    {
      id: 'az900-03-q4',
      question: 'Which Azure tool helps you estimate the cost savings of migrating on-premises workloads to Azure?',
      options: ['Azure Pricing Calculator', 'Total Cost of Ownership (TCO) Calculator', 'Azure Cost Management', 'Azure Advisor'],
      correctAnswer: 1,
      explanation: 'The TCO Calculator specifically helps estimate cost savings by comparing on-premises infrastructure costs (including hardware, software, electricity, labor) against equivalent Azure services over time.'
    },
    {
      id: 'az900-03-q5',
      question: 'A company deploys an Azure Function that processes 500,000 requests per month. The free grant covers 1 million executions. How much will they pay for the executions?',
      options: ['Half the normal rate', 'Nothing — it is within the free grant', 'A minimum monthly charge applies', 'They must purchase a reserved plan'],
      correctAnswer: 1,
      explanation: 'Azure Functions includes a free grant of 1 million executions per month. Since 500,000 is below this threshold, the execution cost is $0. This is the consumption-based model in action.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe cost management in Azure](https://learn.microsoft.com/en-us/training/modules/describe-cost-management-azure/)
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)
- [TCO Calculator](https://azure.microsoft.com/pricing/tco/calculator/)
