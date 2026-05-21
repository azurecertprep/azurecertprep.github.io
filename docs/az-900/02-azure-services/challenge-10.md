---
sidebar_position: 4
title: "Challenge 10: Containers & App Hosting"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 10: Containers & App Hosting

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Azure Architecture & Services (35-40%)
:::

## Exam skills covered

- Compare compute types (containers, VMs, functions)
- Describe application hosting options (web apps, containers, VMs)
- Describe Azure Functions

## Overview

Beyond VMs, Azure offers lighter-weight compute options. **Containers** package your application with its dependencies into a portable unit. **Azure App Service** hosts web apps without managing VMs. **Azure Functions** run individual pieces of code on-demand (serverless).

Each option trades control for simplicity: VMs give maximum control, containers provide portability, App Service simplifies web hosting, and Functions are the simplest — just write code.

## Explore

### Task 1: Compare compute options

| Service | What you manage | Scale unit | Start-up time | Best for |
|---------|----------------|-----------|---------------|----------|
| Azure VMs | OS + Apps | Full VM | Minutes | Legacy apps, full control |
| Azure Container Instances | Container image | Container | Seconds | Simple container tasks |
| Azure Container Apps | Container image + scaling rules | Container | Seconds | Microservices |
| Azure App Service | Application code | App instance | Seconds | Web apps and APIs |
| Azure Functions | Function code | Single function | Milliseconds | Event-driven tasks |

### Task 2: Explore Azure App Service

1. In Azure Portal, search for **App Services**
2. Click **+ Create** → **Web App**
3. Explore the creation form:
   - **Runtime stack**: .NET, Java, Node.js, Python, PHP, Ruby
   - **Operating System**: Linux or Windows
   - **App Service Plan**: Pricing tier (Free F1 available!)
4. Notice: no VM size, no OS patches, no networking config
5. Click **Cancel**

**Free tier (F1):**
- 60 CPU minutes/day
- 1 GB RAM
- No custom domain (uses azurewebsites.net)
- Perfect for learning!

### Task 3: Explore Azure Functions

1. In Azure Portal, search for **Function App**
2. Click **+ Create**
3. Explore:
   - **Runtime**: .NET, Java, Node.js, Python, PowerShell
   - **Hosting plan**: Consumption (pay per execution), Premium, or Dedicated
4. Consumption plan = true serverless:
   - First **1 million executions/month = FREE**
   - Auto-scales from 0 to thousands of instances
5. Click **Cancel**

**Function triggers** (what causes the code to run):
| Trigger | Example |
|---------|---------|
| HTTP | REST API endpoint |
| Timer | Run every 5 minutes |
| Blob Storage | File uploaded |
| Queue | Message received |
| Event Grid | Event occurred |

### Task 4: Understand containers

Containers are lightweight, portable packages that include:
- Your application code
- Runtime and libraries
- Configuration files
- Everything needed to run — regardless of the host

| Concept | VM | Container |
|---------|------|-----------|
| Includes | Full OS + Apps | App + dependencies only |
| Size | Gigabytes | Megabytes |
| Start time | Minutes | Seconds |
| Isolation | Hardware-level | Process-level |
| Density | Few per host | Hundreds per host |

**Azure container services:**
- **Azure Container Instances (ACI)**: Run a container without managing VMs
- **Azure Container Apps**: Managed microservices platform
- **Azure Kubernetes Service (AKS)**: Full container orchestration

### Task 5: When to use what

| Scenario | Best choice | Why |
|----------|------------|-----|
| Host a WordPress blog | App Service | PaaS web hosting, easy setup |
| Process images when uploaded | Azure Functions | Event-driven, pay per execution |
| Run a containerized microservice | Container Apps | Managed container hosting |
| Migrate an on-prem server | Azure VM | Lift-and-shift, full control |
| Run a batch job for 10 minutes | ACI | Simple container, no long-running cost |

:::tip Azure CLI Alternative
```bash
# List available App Service runtimes
az webapp list-runtimes --output table

# List available Function App runtimes
az functionapp list-runtimes --os linux --output table
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Azure App Service** | PaaS for web apps, APIs, mobile backends |
| **Azure Functions** | Serverless compute — run code on-demand, pay per execution |
| **Container** | Lightweight package with app + dependencies (portable) |
| **ACI** | Run a container without managing infrastructure |
| **Container Apps** | Managed platform for microservice containers |
| **AKS** | Managed Kubernetes for complex container orchestration |
| **Serverless** | No server management, automatic scaling, per-execution billing |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-10-q1',
      question: 'Which Azure service allows you to run code that responds to events without managing any infrastructure?',
      options: ['Azure Virtual Machines', 'Azure App Service', 'Azure Functions', 'Azure Container Instances'],
      correctAnswer: 2,
      explanation: 'Azure Functions is a serverless compute service that runs code in response to events (HTTP requests, timers, messages). You write the code; Azure manages everything else.'
    },
    {
      id: 'az900-10-q2',
      question: 'What is a key advantage of containers compared to virtual machines?',
      options: ['Containers include a full operating system', 'Containers start faster and use fewer resources', 'Containers provide hardware-level isolation', 'Containers cannot be scaled'],
      correctAnswer: 1,
      explanation: 'Containers are lightweight — they share the host OS kernel, start in seconds, and are measured in megabytes rather than gigabytes. This makes them faster to start and more resource-efficient than VMs.'
    },
    {
      id: 'az900-10-q3',
      question: 'A developer wants to host a web application with automatic scaling and no server management. The app is written in Python. Which service is most appropriate?',
      options: ['Azure Virtual Machine', 'Azure App Service', 'Azure Virtual Desktop', 'Azure Blob Storage'],
      correctAnswer: 1,
      explanation: 'Azure App Service supports Python and provides automatic scaling, built-in load balancing, and zero server management. It is the PaaS web hosting service.'
    },
    {
      id: 'az900-10-q4',
      question: 'On the Azure Functions Consumption plan, when do you pay?',
      options: ['A fixed monthly fee', 'Only when your code executes', '24/7 for reserved capacity', 'Per GB of storage used'],
      correctAnswer: 1,
      explanation: 'The Consumption plan charges only when your function executes — based on the number of executions and the execution time. When your code is not running, you are not charged.'
    },
    {
      id: 'az900-10-q5',
      question: 'Which Azure service provides managed Kubernetes container orchestration?',
      options: ['Azure Container Instances', 'Azure Container Apps', 'Azure Kubernetes Service (AKS)', 'Azure App Service'],
      correctAnswer: 2,
      explanation: 'Azure Kubernetes Service (AKS) provides fully managed Kubernetes orchestration for complex containerized applications requiring advanced deployment, scaling, and management capabilities.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe Azure compute and networking](https://learn.microsoft.com/en-us/training/modules/describe-azure-compute-networking-services/)
- [Azure App Service documentation](https://learn.microsoft.com/en-us/azure/app-service/)
- [Azure Functions documentation](https://learn.microsoft.com/en-us/azure/azure-functions/)
