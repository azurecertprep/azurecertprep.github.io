---
sidebar_position: 2
title: "Challenge 02: Benefits of Cloud Services"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 02: Benefits of Cloud Services

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Cloud Concepts (25-30%)
:::

## Exam skills covered

- Describe the benefits of high availability
- Describe the benefits of scalability
- Describe the benefits of elasticity
- Describe the benefits of reliability
- Describe the benefits of predictability
- Describe the benefits of security and governance in the cloud
- Describe the benefits of manageability in the cloud

## Overview

Why do organizations move to the cloud? It's not just about saving money — it's about gaining capabilities that are difficult or impossible to achieve with on-premises infrastructure.

Azure provides Service Level Agreements (SLAs) that guarantee uptime. Services are designed to survive failures through redundancy. Resources can scale automatically based on demand. And everything can be managed through code, APIs, and automation.

## Explore

### Task 1: Understand high availability and SLAs

1. Go to [azure.microsoft.com/support/legal/sla](https://azure.microsoft.com/support/legal/sla/)
2. Search for **Virtual Machines** — note the SLA percentage
3. Search for **App Service** — compare the SLA
4. Search for **Azure SQL Database** — note the higher SLA

**SLA reference:**

| SLA % | Downtime per month | Downtime per year |
|-------|-------------------|-------------------|
| 99% | 7.2 hours | 3.65 days |
| 99.9% | 43.8 minutes | 8.76 hours |
| 99.95% | 21.9 minutes | 4.38 hours |
| 99.99% | 4.38 minutes | 52.56 minutes |

### Task 2: Understand scalability types

| Type | Description | Example |
|------|-------------|---------|
| **Vertical scaling (scale up/down)** | Increase/decrease the power of an existing resource | Change a VM from 2 CPU to 8 CPU |
| **Horizontal scaling (scale out/in)** | Add/remove instances of a resource | Go from 1 web server to 5 web servers |

**Your task**: For each scenario, identify the scaling type:
- A website gets 10x traffic during Black Friday → *Scale out*
- A database needs more RAM for complex queries → *Scale up*
- Traffic returns to normal after the holiday → *Scale in*

### Task 3: Explore reliability concepts

1. In the Azure Portal, search for **Service Health**
2. Click on **Service Health** in the results
3. Explore the **Service issues** tab — see current Azure incidents
4. Click **Health history** — see past issues and how Azure recovered
5. This demonstrates Azure's transparency about reliability

### Task 4: Explore governance and manageability

1. In the Azure Portal, search for **Policy**
2. Click **Azure Policy**
3. Browse the **Definitions** tab
4. Notice categories like "Compute", "Storage", "Network"
5. These built-in policies help enforce governance automatically

:::tip Azure CLI Alternative
```bash
# List available Azure Policy definitions (first 10)
az policy definition list --query "[0:10].{Name:displayName, Category:metadata.category}" --output table

# Check service health
az monitor activity-log list --resource-provider "Microsoft.ResourceHealth" --output table
```
:::

## Key Concepts

| Benefit | Description |
|---------|-------------|
| **High availability** | Systems remain operational with minimal downtime (measured by SLA) |
| **Scalability** | Ability to handle increased demand by adding resources |
| **Elasticity** | Automatic scaling — resources expand and contract with demand |
| **Reliability** | Ability to recover from failures and continue functioning |
| **Predictability** | Confidence in consistent performance and cost forecasting |
| **Security** | Cloud providers invest billions in security infrastructure |
| **Governance** | Policies and standards can be enforced automatically |
| **Manageability** | Resources managed via portal, CLI, APIs, templates |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-02-q1',
      question: 'An Azure service has an SLA of 99.9%. What is the maximum acceptable downtime per month?',
      options: ['4.38 minutes', '43.8 minutes', '7.2 hours', '8.76 hours'],
      correctAnswer: 1,
      explanation: '99.9% SLA means 0.1% of the month can be downtime. A month has ~43,800 minutes, so 0.1% = ~43.8 minutes of acceptable downtime per month.'
    },
    {
      id: 'az900-02-q2',
      question: 'A company needs to add more web server instances during peak hours and remove them during off-hours. Which cloud benefit does this describe?',
      options: ['High availability', 'Elasticity', 'Reliability', 'Governance'],
      correctAnswer: 1,
      explanation: 'Elasticity is the ability to automatically scale resources up or down based on demand. Adding instances during peak and removing during off-peak is elastic scaling.'
    },
    {
      id: 'az900-02-q3',
      question: 'What is the difference between vertical scaling and horizontal scaling?',
      options: ['Vertical adds more instances; horizontal increases instance size', 'Vertical increases instance size; horizontal adds more instances', 'They are the same thing', 'Vertical is for storage; horizontal is for compute'],
      correctAnswer: 1,
      explanation: 'Vertical scaling (scale up) increases the size/power of an existing resource. Horizontal scaling (scale out) adds more instances of a resource.'
    },
    {
      id: 'az900-02-q4',
      question: 'Which benefit of cloud computing allows you to forecast future costs based on current usage patterns?',
      options: ['Scalability', 'Reliability', 'Predictability', 'Elasticity'],
      correctAnswer: 2,
      explanation: 'Predictability in the cloud covers both performance predictability (consistent experience) and cost predictability (forecasting spend based on usage patterns).'
    },
    {
      id: 'az900-02-q5',
      question: 'A company deploys applications across multiple Azure regions so that if one region fails, another can take over. Which cloud benefit does this demonstrate?',
      options: ['Scalability', 'Elasticity', 'Reliability', 'Governance'],
      correctAnswer: 2,
      explanation: 'Reliability is the ability of a system to recover from failures and continue to function. Deploying across multiple regions ensures the application survives regional outages.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe benefits of cloud services](https://learn.microsoft.com/en-us/training/modules/describe-benefits-use-cloud-services/)
- [Azure SLA summary](https://azure.microsoft.com/support/legal/sla/summary/)
