---
sidebar_position: 1
title: "Challenge 19: Azure Cost Management & Pricing Calculator"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 19: Azure Cost Management & Pricing Calculator

:::info Estimated Time
**25-35 min** | **Cost**: Free | **Domain**: Management & Governance (30-35%)
:::

## Exam skills covered

- Describe factors that can affect costs in Azure
- Compare the Pricing Calculator and the Total Cost of Ownership (TCO) Calculator
- Describe Cost Management capabilities (cost alerts, budgets, recommendations)
- Describe the purpose of tags

## Overview

Understanding Azure costs is critical for any organization. Costs are affected by resource type, usage, region, and data transfer. Azure provides tools to estimate, monitor, and optimize spending: the **Pricing Calculator** (estimate future costs), **TCO Calculator** (compare on-premises vs. cloud), and **Cost Management** (monitor and control current spending).

## Explore

### Task 1: Understand cost factors

| Factor | Impact on cost | Example |
|--------|---------------|---------|
| **Resource type** | Different services have different pricing | VMs cost more than storage |
| **Region** | Prices vary by region | East US may differ from West Europe |
| **Usage/consumption** | More usage = higher cost | Running a VM 24/7 vs. 8 hours/day |
| **Data transfer** | Inbound free, outbound costs money | Downloading data FROM Azure |
| **Tier/SKU** | Higher tiers cost more | Premium SSD vs. Standard HDD |
| **Reserved capacity** | Commitment = discount | 1-year or 3-year reservation |

### Task 2: Use the Pricing Calculator

1. Open [azure.microsoft.com/pricing/calculator](https://azure.microsoft.com/pricing/calculator/)
2. Add a **Virtual Machine**:
   - Region: East US, Linux, D2s v3
   - Note the monthly cost
3. Add a **Storage Account**:
   - LRS, Hot tier, 100 GB
   - Note the cost (much cheaper than VMs!)
4. Add an **App Service**:
   - Basic tier B1
   - Note the monthly cost
5. Compare total — observe that VMs are usually the largest cost

### Task 3: Explore Cost Management

1. In Azure Portal, search for **Cost Management**
2. Explore these sections:
   - **Cost analysis**: View spending by service, resource group, location
   - **Budgets**: Set spending limits with alerts
   - **Advisor recommendations**: Cost-saving suggestions
   - **Alerts**: Get notified when spending exceeds thresholds
3. If your account is new, data may be minimal — that's OK

### Task 4: Understand tags for cost tracking

Tags are name-value pairs you attach to resources for organization:

| Tag key | Tag value | Purpose |
|---------|-----------|---------|
| `Environment` | `Production` | Identify production resources |
| `CostCenter` | `IT-1234` | Track costs by department |
| `Owner` | `alice@contoso.com` | Know who owns the resource |
| `Project` | `WebApp-v2` | Associate costs with projects |

**Tag rules:**
- Tags are NOT inherited (parent RG tags don't automatically apply to resources)
- You can have up to 50 tags per resource
- Tags enable cost filtering in Cost Management
- Azure Policy can enforce tag requirements

### Task 5: Ways to reduce costs

| Strategy | Description | Savings |
|----------|-------------|---------|
| **Reserved Instances** | Commit to 1 or 3 years | Up to 72% off |
| **Azure Hybrid Benefit** | Use existing Windows/SQL licenses | Up to 40% off |
| **Spot VMs** | Use unused capacity (can be evicted) | Up to 90% off |
| **Right-sizing** | Match VM size to actual usage | Varies |
| **Auto-shutdown** | Stop dev/test VMs at night | Up to 70% off |
| **Azure Advisor** | Follow cost recommendations | Varies |

:::tip Azure CLI Alternative
```bash
# List tags on a resource group
az group show --name rg-az900-learning --query tags --output table 2>/dev/null || echo "No tags set"

# Add a tag to a resource group
az group update --name rg-az900-learning --tags Environment=Learning CostCenter=Training 2>/dev/null || echo "Create the RG first in Challenge 08"
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Pricing Calculator** | Estimate costs for new Azure deployments |
| **TCO Calculator** | Compare on-premises costs with Azure costs over time |
| **Cost Management** | Monitor, allocate, and optimize Azure spending |
| **Budget** | Set spending limits with automatic alerts |
| **Tags** | Key-value pairs for organizing and tracking resource costs |
| **Reserved Instance** | Pre-commit to 1-3 year term for significant discount |
| **Azure Advisor** | Personalized recommendations including cost savings |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-19-q1',
      question: 'Which Azure tool should you use to estimate the monthly cost of a new deployment before creating any resources?',
      options: ['Azure Cost Management', 'Azure Pricing Calculator', 'TCO Calculator', 'Azure Advisor'],
      correctAnswer: 1,
      explanation: 'The Azure Pricing Calculator lets you estimate costs by configuring services and seeing projected monthly charges before deploying anything.'
    },
    {
      id: 'az900-19-q2',
      question: 'Data transfer INTO Azure (ingress) is:',
      options: ['Always free', 'Always charged', 'Free for the first 5 GB', 'Charged at premium rates'],
      correctAnswer: 0,
      explanation: 'Inbound data transfer (ingress) to Azure is free. You are charged for outbound data transfer (egress) when data leaves Azure datacenters.'
    },
    {
      id: 'az900-19-q3',
      question: 'What is the purpose of resource tags in Azure?',
      options: ['To encrypt resources', 'To organize resources and track costs by metadata', 'To restrict access to resources', 'To replicate resources across regions'],
      correctAnswer: 1,
      explanation: 'Tags are key-value pairs attached to resources for organization and cost tracking. They allow you to filter and group resources in cost reports by department, project, environment, etc.'
    },
    {
      id: 'az900-19-q4',
      question: 'A company wants to reduce VM costs by committing to a specific VM size for 3 years. What pricing option provides the best discount?',
      options: ['Pay-as-you-go', 'Spot VMs', 'Reserved Instances', 'Azure Hybrid Benefit'],
      correctAnswer: 2,
      explanation: 'Reserved Instances provide up to 72% savings compared to pay-as-you-go pricing when you commit to 1 or 3 year terms for specific VM sizes and regions.'
    },
    {
      id: 'az900-19-q5',
      question: 'Are resource tags automatically inherited from a resource group to its resources?',
      options: ['Yes, always', 'No, tags are NOT inherited by default', 'Only cost-related tags are inherited', 'Only if the resource is in the same region'],
      correctAnswer: 1,
      explanation: 'Tags are NOT inherited by default. Tags applied to a resource group do not automatically flow down to the resources within it. You can use Azure Policy to enforce tag inheritance if needed.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe cost management in Azure](https://learn.microsoft.com/en-us/training/modules/describe-cost-management-azure/)
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)
- [Azure Cost Management documentation](https://learn.microsoft.com/en-us/azure/cost-management-billing/)
