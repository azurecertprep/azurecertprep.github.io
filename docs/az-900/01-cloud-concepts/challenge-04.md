---
sidebar_position: 4
title: "Challenge 04: IaaS — Infrastructure as a Service"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 04: IaaS — Infrastructure as a Service

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Cloud Concepts (25-30%)
:::

## Exam skills covered

- Describe Infrastructure as a Service (IaaS)
- Identify appropriate use cases for IaaS
- Describe the shared responsibility model as it relates to IaaS

## Overview

Infrastructure as a Service (IaaS) is the most flexible cloud service category. It gives you maximum control over your computing resources — you rent the hardware (virtual machines, storage, networks) and manage everything else yourself.

Think of IaaS like renting an empty office space: the landlord provides the building, electricity, and plumbing. You bring your own furniture, equipment, and staff. You decide how to use the space.

In Azure, IaaS means you manage the operating system, applications, runtime, and data. Azure manages the physical hardware, networking, and datacenter.

## Explore

### Task 1: Understand IaaS responsibilities

| Layer | Who manages it? |
|-------|----------------|
| Data & access | **You** |
| Applications | **You** |
| Runtime | **You** |
| Operating system | **You** |
| Virtual machine | **You** |
| Network controls | **You** |
| Physical host | **Azure** |
| Physical network | **Azure** |
| Physical datacenter | **Azure** |

### Task 2: Explore Azure IaaS services

1. In the Azure Portal, click **Create a resource**
2. Search for **Virtual Machine** — this is the core IaaS service
3. **Don't create it** — just explore the creation form:
   - Notice you choose the OS (Windows/Linux)
   - You select the VM size (CPU/RAM)
   - You configure networking, disks, management
   - You're responsible for patching and maintaining the OS
4. Click **Cancel** when done exploring

### Task 3: Explore other IaaS services

Navigate to **All services** and find these IaaS offerings:

| Azure Service | What it provides | You manage |
|--------------|-----------------|------------|
| Virtual Machines | Compute instances | OS, apps, patches |
| Virtual Network | Network infrastructure | IP ranges, routing rules |
| Managed Disks | Block storage for VMs | Data, encryption settings |
| Load Balancer | Traffic distribution | Rules, health probes |

### Task 4: When to use IaaS

IaaS is best when you need:
- **Full control** over the OS and software stack
- **Lift-and-shift migration** — move existing on-prem VMs to Azure
- **Custom environments** — specific OS versions, custom drivers
- **Dev/test** — quickly create and destroy environments
- **High-performance computing** — specialized GPU/CPU workloads

**IaaS is NOT ideal when:**
- You just want to run a web app (use PaaS instead)
- You want email service (use SaaS instead)
- You don't have staff to manage OS patches and updates

:::tip Azure CLI Alternative
```bash
# List available VM sizes in a region (does not create anything)
az vm list-sizes --location eastus --output table | head -20

# List available VM images (does not create anything)
az vm image list --output table
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **IaaS** | Cloud provides virtualized hardware; you manage OS and above |
| **Lift-and-shift** | Moving existing workloads to cloud VMs with minimal changes |
| **VM Scale Sets** | Groups of identical VMs that auto-scale based on demand |
| **Maximum control** | IaaS gives the most control but also the most responsibility |
| **Pay-per-use** | Pay by the minute/hour for VMs while they're running |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-04-q1',
      question: 'In the IaaS model, who is responsible for patching the operating system?',
      options: ['The cloud provider', 'The customer', 'Both equally', 'Neither — it is automated'],
      correctAnswer: 1,
      explanation: 'In IaaS, the customer is responsible for managing and patching the operating system. The cloud provider only manages the physical infrastructure beneath the VM.'
    },
    {
      id: 'az900-04-q2',
      question: 'A company wants to migrate their existing on-premises servers to Azure with minimal changes to the applications. Which approach and service model is most appropriate?',
      options: ['Refactor using PaaS', 'Lift-and-shift using IaaS', 'Replace with SaaS', 'Rebuild as serverless'],
      correctAnswer: 1,
      explanation: 'Lift-and-shift migration moves existing workloads to IaaS (Azure VMs) with minimal or no changes to the applications. This is the fastest path to cloud but retains the most management responsibility.'
    },
    {
      id: 'az900-04-q3',
      question: 'Which of the following is an example of IaaS in Azure?',
      options: ['Microsoft 365', 'Azure App Service', 'Azure Virtual Machines', 'Azure Active Directory'],
      correctAnswer: 2,
      explanation: 'Azure Virtual Machines is IaaS — you get a virtualized server and manage the OS, applications, and data. App Service is PaaS, and Microsoft 365 is SaaS.'
    },
    {
      id: 'az900-04-q4',
      question: 'Which cloud service type provides the MOST control to the customer?',
      options: ['SaaS', 'PaaS', 'IaaS', 'Serverless'],
      correctAnswer: 2,
      explanation: 'IaaS provides the most control because you manage the OS, runtime, applications, and data. With PaaS you lose OS control, and with SaaS you only manage data and access.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe cloud service types](https://learn.microsoft.com/en-us/training/modules/describe-cloud-service-types/)
- [What is IaaS?](https://azure.microsoft.com/resources/cloud-computing-dictionary/what-is-iaas/)
