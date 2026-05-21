---
sidebar_position: 5
title: "Challenge 23: Azure Advisor & Service Health"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 23: Azure Advisor & Service Health

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Management & Governance (30-35%)
:::

## Exam skills covered

- Describe the purpose of Azure Advisor
- Describe Azure Service Health

## Overview

Azure provides tools to help you optimize your environment and stay informed about Azure platform status. **Azure Advisor** gives personalized best-practice recommendations. **Azure Service Health** keeps you informed about Azure platform issues, planned maintenance, and health advisories that might affect your resources.

## Explore

### Task 1: Explore Azure Advisor

1. In Azure Portal, search for **Advisor**
2. Click on **Azure Advisor**
3. Explore the recommendation categories:

| Category | What it recommends |
|----------|-------------------|
| **Reliability** | Improve availability of your applications |
| **Security** | Detect threats and vulnerabilities |
| **Performance** | Improve speed of your applications |
| **Cost** | Reduce spending and optimize resources |
| **Operational Excellence** | Process efficiency and best practices |

4. Click on each category to see specific recommendations
5. Note: With a new/empty account, you may see few recommendations — that's normal!

### Task 2: Understand Advisor recommendations

Advisor analyzes your resource configuration and usage and then provides:
- **Actionable recommendations** with specific steps
- **Impact level**: High, Medium, Low
- **Direct links** to fix the issue
- **Estimated savings** for cost recommendations

**Example recommendations:**
| Category | Example recommendation |
|----------|----------------------|
| Cost | "Right-size underutilized VMs — save $50/month" |
| Reliability | "Enable availability zones for your SQL database" |
| Security | "Enable MFA for all admin accounts" |
| Performance | "Upgrade to Premium SSD for better IOPS" |

### Task 3: Explore Azure Service Health

1. In Azure Portal, search for **Service Health**
2. Explore the three components:

| Component | What it shows |
|-----------|--------------|
| **Azure Status** | Global Azure service status (all regions, all services) |
| **Service Health** | Issues affecting YOUR specific services and regions |
| **Resource Health** | Health of YOUR individual resources |

3. Click **Service issues** — see current problems (if any)
4. Click **Planned maintenance** — upcoming maintenance windows
5. Click **Health advisories** — feature changes or deprecations
6. Click **Health history** — past issues and RCAs (Root Cause Analysis)

### Task 4: Set up Service Health alerts

1. In Service Health, click **Health alerts**
2. Click **+ Create service health alert**
3. Explore what you can configure:
   - Services to monitor
   - Regions to watch
   - Event types (Service issue, Planned maintenance, Health advisory)
   - Notification method (email, SMS, webhook)
4. Click **Cancel** (unless you want to create a real alert)

### Task 5: Azure Status page

1. Visit [azure.status.microsoft](https://azure.status.microsoft/en-us/status)
2. This public page shows:
   - Global status of all Azure services
   - Status by region
   - Current incidents (if any)
   - Historical uptime data
3. Compare this with Service Health in the portal:
   - azure.status.microsoft = broad, public view
   - Service Health = personalized to YOUR resources

:::tip Azure CLI Alternative
```bash
# View Advisor recommendations
az advisor recommendation list --query "[0:5].{Category:category, Impact:impact, Problem:shortDescription.problem}" --output table 2>/dev/null || echo "Explore Advisor in the portal"

# No CLI for Service Health — use the portal for the best experience
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Azure Advisor** | Personalized cloud consultant recommending best practices |
| **Service Health** | Personalized view of Azure service issues affecting you |
| **Resource Health** | Health status of your specific Azure resources |
| **Azure Status** | Public page showing global Azure service health |
| **Health alerts** | Notifications when Azure issues affect your resources |
| **Planned maintenance** | Advance notice of scheduled Azure maintenance |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-23-q1',
      question: 'Which Azure service provides personalized recommendations to improve cost, security, reliability, and performance?',
      options: ['Azure Monitor', 'Azure Advisor', 'Azure Service Health', 'Azure Policy'],
      correctAnswer: 1,
      explanation: 'Azure Advisor analyzes your Azure configuration and usage telemetry, then provides personalized recommendations across five categories: reliability, security, performance, cost, and operational excellence.'
    },
    {
      id: 'az900-23-q2',
      question: 'What is the difference between Azure Service Health and the public Azure Status page (azure.status.microsoft)?',
      options: ['They show the same information', 'Service Health is personalized to your resources; Azure Status shows global status', 'Azure Status is more detailed', 'Service Health is only for enterprise customers'],
      correctAnswer: 1,
      explanation: 'Azure Service Health is personalized — it only shows issues that affect YOUR specific services and regions. The Azure Status page (azure.status.microsoft) shows a broad, global view of all Azure services.'
    },
    {
      id: 'az900-23-q3',
      question: 'Azure Advisor identifies that several of your VMs are underutilized. Which recommendation category would this fall under?',
      options: ['Reliability', 'Security', 'Cost', 'Performance'],
      correctAnswer: 2,
      explanation: 'Underutilized VMs are a cost optimization issue. Advisor would recommend right-sizing (moving to a smaller VM size) to reduce unnecessary spending.'
    },
    {
      id: 'az900-23-q4',
      question: 'Which Service Health component shows the health of a specific Azure resource you own?',
      options: ['Azure Status', 'Service Health', 'Resource Health', 'Azure Advisor'],
      correctAnswer: 2,
      explanation: 'Resource Health provides information about the health of your individual Azure resources (like a specific VM or database). Service Health shows broader service-level issues.'
    },
    {
      id: 'az900-23-q5',
      question: 'How can you be notified when a planned Azure maintenance event will affect your resources?',
      options: ['Azure automatically emails all users', 'Create a Service Health alert', 'Check the Azure Portal daily', 'Subscribe to the Azure blog'],
      correctAnswer: 1,
      explanation: 'Service Health alerts can be configured to notify you (via email, SMS, or webhook) about service issues, planned maintenance, and health advisories that affect your specific resources and regions.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe monitoring tools in Azure](https://learn.microsoft.com/en-us/training/modules/describe-monitoring-tools-azure/)
- [Azure Advisor documentation](https://learn.microsoft.com/en-us/azure/advisor/)
- [Azure Service Health documentation](https://learn.microsoft.com/en-us/azure/service-health/)
