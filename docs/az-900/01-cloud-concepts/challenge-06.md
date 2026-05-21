---
sidebar_position: 6
title: "Challenge 06: SaaS — Software as a Service"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 06: SaaS — Software as a Service

:::info Estimated Time
**15-25 min** | **Cost**: Free | **Domain**: Cloud Concepts (25-30%)
:::

## Exam skills covered

- Describe Software as a Service (SaaS)
- Identify appropriate use cases for SaaS
- Describe the shared responsibility model as it relates to SaaS

## Overview

Software as a Service (SaaS) is the most complete cloud service model. The provider manages everything — infrastructure, platform, and the application itself. You simply use the software through a web browser or app.

Think of SaaS like subscribing to Netflix: you don't manage servers, you don't install software, you don't worry about updates. You just log in and use it. The provider handles everything behind the scenes.

You've probably used SaaS today without realizing it: Gmail, Microsoft 365, Salesforce, Zoom — these are all SaaS.

## Explore

### Task 1: Understand SaaS responsibilities

| Layer | Who manages it? |
|-------|----------------|
| Data & access | **You** (your content and who can see it) |
| Identity & access | **Shared** (you manage users; provider manages auth system) |
| Applications | **Provider** |
| Runtime | **Provider** |
| Operating system | **Provider** |
| Virtual machine | **Provider** |
| Physical infrastructure | **Provider** |

**Key insight**: With SaaS, your only responsibility is your data and controlling access to it.

### Task 2: Identify SaaS examples

| SaaS Product | Category | What you manage |
|-------------|----------|----------------|
| Microsoft 365 (Outlook, Teams, Word) | Productivity | Your documents, email, users |
| Microsoft Dynamics 365 | CRM/ERP | Your business data |
| Power BI | Analytics | Your reports and dashboards |
| GitHub | DevOps | Your code repositories |
| Azure DevOps | DevOps | Your projects and pipelines |

### Task 3: Compare all three models

| Aspect | IaaS | PaaS | SaaS |
|--------|------|------|------|
| You manage | OS + Apps + Data | Apps + Data | Data only |
| Provider manages | Hardware | Hardware + OS + Runtime | Everything |
| Flexibility | Maximum | Moderate | Minimum |
| Management effort | High | Medium | Low |
| Example | Azure VMs | Azure App Service | Microsoft 365 |
| Best for | IT pros | Developers | End users |

### Task 4: Explore a SaaS portal

1. Open [portal.office.com](https://portal.office.com) (if you have a Microsoft account)
2. Or visit [admin.microsoft.com](https://admin.microsoft.com) (if you have admin access)
3. Notice: you manage **users and data**, not infrastructure
4. There are no VMs to patch, no servers to manage
5. This is pure SaaS — the software is fully managed for you

### Task 5: When to use each model — summary exercise

Match each scenario to the best service model:

| Scenario | Best model | Why |
|----------|-----------|-----|
| Host a legacy Windows Server application | IaaS | Needs OS-level control |
| Build a new web API in Python | PaaS | Focus on code, not servers |
| Provide email for 500 employees | SaaS | Use Microsoft 365 |
| Run a custom machine learning model | IaaS/PaaS | Depends on customization needed |
| Give sales team a CRM system | SaaS | Use Dynamics 365 |

:::tip Azure CLI Alternative
```bash
# SaaS is managed entirely by the provider, so there's no CLI to "manage" it
# However, you can check your Microsoft 365 licenses via:
az ad user list --query "[0:5].{Name:displayName, Mail:mail}" --output table
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **SaaS** | Complete application managed by provider; you use it via browser/app |
| **Least responsibility** | You only manage data and access — provider handles everything else |
| **Subscription model** | Typically pay per user per month |
| **Automatic updates** | Provider pushes updates — no action required |
| **Multi-tenant** | Many customers share the same application infrastructure |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-06-q1',
      question: 'Which cloud service model requires the LEAST management effort from the customer?',
      options: ['IaaS', 'PaaS', 'SaaS', 'Hybrid'],
      correctAnswer: 2,
      explanation: 'SaaS requires the least customer management. The provider manages everything — infrastructure, platform, and application. The customer only manages data and access.'
    },
    {
      id: 'az900-06-q2',
      question: 'Microsoft 365 (Outlook, Teams, Word Online) is an example of which cloud service model?',
      options: ['IaaS', 'PaaS', 'SaaS', 'On-premises'],
      correctAnswer: 2,
      explanation: 'Microsoft 365 is SaaS — Microsoft manages the entire application stack. Users simply access the software through a browser or app and manage their own data.'
    },
    {
      id: 'az900-06-q3',
      question: 'In the SaaS model, who is responsible for application updates and patches?',
      options: ['The customer', 'The cloud provider', 'A third-party vendor', 'The customer IT team'],
      correctAnswer: 1,
      explanation: 'In SaaS, the cloud provider manages everything including application updates. The customer does not need to install patches or update the software — it happens automatically.'
    },
    {
      id: 'az900-06-q4',
      question: 'A company needs email, calendar, and document collaboration for 200 employees with minimal IT management. Which approach is best?',
      options: ['Deploy Exchange Server on Azure VMs (IaaS)', 'Build a custom app on App Service (PaaS)', 'Subscribe to Microsoft 365 (SaaS)', 'Install Office on each desktop (on-premises)'],
      correctAnswer: 2,
      explanation: 'Microsoft 365 (SaaS) provides email, calendar, and collaboration out of the box with zero infrastructure management. It is the right choice when you need standard productivity tools without customization.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe cloud service types](https://learn.microsoft.com/en-us/training/modules/describe-cloud-service-types/)
- [What is SaaS?](https://azure.microsoft.com/resources/cloud-computing-dictionary/what-is-saas/)
