---
sidebar_position: 5
title: "Challenge 05: PaaS — Platform as a Service"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 05: PaaS — Platform as a Service

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Cloud Concepts (25-30%)
:::

## Exam skills covered

- Describe Platform as a Service (PaaS)
- Identify appropriate use cases for PaaS
- Describe the shared responsibility model as it relates to PaaS

## Overview

Platform as a Service (PaaS) is a middle ground between IaaS and SaaS. The cloud provider manages the infrastructure AND the platform (OS, runtime, middleware), while you focus only on your application and data.

Think of PaaS like a food truck rental: you get the truck fully equipped with a kitchen (platform), and you just bring your recipes and ingredients (application and data). You don't worry about the engine, tires, or electricity.

PaaS is ideal for developers who want to build applications without worrying about managing servers, patching operating systems, or configuring infrastructure.

## Explore

### Task 1: Understand PaaS responsibilities

| Layer | Who manages it? |
|-------|----------------|
| Data & access | **You** |
| Applications | **You** |
| Runtime | **Azure** |
| Operating system | **Azure** |
| Virtual machine | **Azure** |
| Network controls | **Shared** |
| Physical infrastructure | **Azure** |

Compare this with IaaS — notice how much more Azure manages for you!

### Task 2: Explore Azure PaaS services

1. In the Azure Portal, click **Create a resource**
2. Search for **App Service** (Web App) — the flagship PaaS service
3. Explore the creation form:
   - Notice you choose a **runtime** (Node.js, Python, .NET, Java) — not an OS
   - You don't configure VM size — you choose a **plan** (pricing tier)
   - No disk management, no OS patching
4. Click **Cancel** — don't create anything

### Task 3: Compare popular PaaS services

| Azure PaaS Service | What it does | You manage |
|-------------------|-------------|------------|
| Azure App Service | Host web apps and APIs | Your code + configuration |
| Azure SQL Database | Managed relational database | Queries + data |
| Azure Cosmos DB | Managed NoSQL database | Data + access policies |
| Azure Functions | Run code without servers | Function code only |
| Azure Kubernetes Service | Managed container orchestration | Container images + config |

### Task 4: PaaS vs IaaS comparison

| Aspect | IaaS (VM) | PaaS (App Service) |
|--------|-----------|-------------------|
| OS patches | You apply them | Azure handles it |
| Scaling | You configure scale sets | Built-in auto-scale |
| Deployment | Install software on VM | Deploy your code/container |
| Cost model | Pay for VM uptime | Pay for plan + consumption |
| Time to deploy | Hours (setup OS, install runtime) | Minutes (push code) |
| Control | Full OS access | Application-level only |

### Task 5: When to use PaaS

PaaS is best when:
- Building **new web applications or APIs**
- You want to **focus on code**, not infrastructure
- You need **managed databases** without DBA overhead
- You want **automatic scaling and high availability**
- Rapid development and deployment is critical

PaaS is NOT ideal when:
- You need full OS-level control
- You have legacy apps that require specific OS configurations
- You need to install custom drivers or kernel modules

:::tip Azure CLI Alternative
```bash
# List available App Service plans (does not create anything)
az appservice list-locations --sku F1 --output table

# List available runtimes for App Service
az webapp list-runtimes --os linux --output table
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **PaaS** | Cloud manages infrastructure + platform; you deploy applications |
| **Azure App Service** | PaaS for hosting web apps, APIs, and mobile backends |
| **Managed database** | Database service where Azure handles backups, patching, HA |
| **Focus on code** | PaaS lets developers concentrate on business logic |
| **Less control, less responsibility** | Trade-off: simpler management but less OS-level access |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-05-q1',
      question: 'In the PaaS model, who is responsible for managing the operating system?',
      options: ['The customer', 'A third-party vendor', 'The cloud provider', 'No one — there is no OS'],
      correctAnswer: 2,
      explanation: 'In PaaS, the cloud provider manages the operating system, including patches and updates. The customer only manages their applications and data.'
    },
    {
      id: 'az900-05-q2',
      question: 'A developer wants to deploy a Python web application without managing servers or OS patches. Which service model is most appropriate?',
      options: ['PaaS', 'IaaS', 'SaaS', 'On-premises'],
      correctAnswer: 0,
      explanation: 'PaaS (like Azure App Service) allows developers to deploy applications without managing the underlying infrastructure or OS. They simply deploy their code.'
    },
    {
      id: 'az900-05-q3',
      question: 'Which of the following is an example of PaaS in Azure?',
      options: ['Azure Virtual Machines', 'Microsoft 365', 'Azure Virtual Desktop', 'Azure App Service'],
      correctAnswer: 3,
      explanation: 'Azure App Service is PaaS — it provides a platform for hosting web applications without managing the underlying infrastructure. VMs are IaaS, M365 is SaaS.'
    },
    {
      id: 'az900-05-q4',
      question: 'What is a disadvantage of PaaS compared to IaaS?',
      options: ['Higher cost', 'Less control over the operating system', 'Slower deployment', 'No auto-scaling'],
      correctAnswer: 1,
      explanation: 'The main trade-off with PaaS is reduced control. You cannot access or configure the underlying OS, install custom drivers, or make OS-level changes. In exchange, you get simpler management.'
    },
    {
      id: 'az900-05-q5',
      question: 'Azure SQL Database is an example of which cloud service model?',
      options: ['IaaS', 'Serverless only', 'PaaS', 'SaaS'],
      correctAnswer: 2,
      explanation: 'Azure SQL Database is PaaS — Microsoft manages the SQL Server infrastructure, patching, backups, and high availability. You manage the database schema and data.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe cloud service types](https://learn.microsoft.com/en-us/training/modules/describe-cloud-service-types/)
- [What is PaaS?](https://azure.microsoft.com/resources/cloud-computing-dictionary/what-is-paas/)
