---
sidebar_position: 2
title: "Challenge 08: Azure Resource Hierarchy"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 08: Azure Resource Hierarchy

:::info Estimated Time
**25-35 min** | **Cost**: Free | **Domain**: Azure Architecture & Services (35-40%)
:::

## Exam skills covered

- Describe Azure resources and resource groups
- Describe subscriptions
- Describe management groups
- Describe the hierarchy of resource groups, subscriptions, and management groups

## Overview

Azure organizes resources in a four-level hierarchy. Understanding this hierarchy is critical because it controls access (RBAC), policy enforcement, and billing.

```text
Management Groups
  â””â”€â”€ Subscriptions
        â””â”€â”€ Resource Groups
              â””â”€â”€ Resources
```

Each level inherits settings from the level above it. Policies applied at a management group flow down to all subscriptions, resource groups, and resources beneath it.

## Explore

### Task 1: Understand the hierarchy

| Level | Purpose | Example |
|-------|---------|---------|
| **Management groups** | Organize subscriptions; apply policies at scale | "Production", "Development" |
| **Subscriptions** | Billing boundary + access control boundary | "Pay-As-You-Go", "Visual Studio Enterprise" |
| **Resource groups** | Logical container for related resources | "rg-webapp-prod", "rg-database-dev" |
| **Resources** | Individual Azure service instances | A specific VM, storage account, or database |

### Task 2: Explore resource groups in the Portal

1. In the Azure Portal, search for **Resource groups**
2. Click **+ Create** to see the creation form:
   - Notice you choose a **Subscription** and a **Region**
   - Resource groups are free â€” they're just containers
3. Create a resource group:
   - Name: `rg-az900-learning`
   - Region: Your nearest region
   - Click **Review + create** â†’ **Create**
4. Open your new resource group â€” notice it's empty (no cost!)

### Task 3: Understand subscriptions

1. In the Azure Portal, search for **Subscriptions**
2. Click on your subscription
3. Explore the menu:
   - **Overview**: See subscription ID, offer type
   - **Cost analysis**: View spending (should be $0)
   - **Access control (IAM)**: Who has access
   - **Resource groups**: All RGs in this subscription

**Key facts:**
- Every Azure resource belongs to exactly ONE resource group
- Every resource group belongs to exactly ONE subscription
- A subscription can have multiple resource groups
- Subscriptions are the primary billing unit

### Task 4: Explore management groups

1. In the Azure Portal, search for **Management groups**
2. You'll see the **Tenant Root Group** (the top of your hierarchy)
3. All subscriptions are nested under management groups

**Hierarchy example for a large organization:**
```text
Tenant Root Group
â”œâ”€â”€ Production
â”‚   â”œâ”€â”€ Subscription: Prod-East
â”‚   â””â”€â”€ Subscription: Prod-West
â”œâ”€â”€ Development
â”‚   â””â”€â”€ Subscription: Dev-Team
â””â”€â”€ Sandbox
    â””â”€â”€ Subscription: Individual-Testing
```

### Task 5: Resource group rules

Important rules to remember:

| Rule | Description |
|------|-------------|
| Resources can only be in ONE group | A VM can't be in two resource groups |
| Resource groups CAN span regions | An RG in "East US" can contain resources in "West Europe" |
| Deleting an RG deletes ALL resources inside | Be careful! |
| RGs cannot be nested | You can't put a resource group inside another |
| Permissions are inherited | RBAC at RG level applies to all resources within |

:::tip Azure CLI Alternative
```bash
# List your subscriptions
az account list --output table

# List resource groups
az group list --output table

# Create a resource group (free!)
az group create --name rg-az900-learning --location eastus

# Show resource group details
az group show --name rg-az900-learning --output table
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Resource** | Any manageable item in Azure (VM, database, VNet) |
| **Resource group** | Container that holds related resources for management |
| **Subscription** | Billing unit and access control boundary |
| **Management group** | Container for managing access/policy across subscriptions |
| **Inheritance** | Policies and access flow DOWN the hierarchy |
| **Tenant** | The top-level Microsoft Entra ID organization |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-08-q1',
      question: 'What happens when you delete a resource group?',
      options: ['Only the group is deleted; resources are moved', 'The subscription is cancelled', 'All resources within the group are also deleted', 'Resources are archived for 30 days'],
      correctAnswer: 2,
      explanation: 'Deleting a resource group deletes ALL resources contained within it. This is a permanent action and is useful for cleaning up entire environments at once.'
    },
    {
      id: 'az900-08-q2',
      question: 'Which level of the Azure hierarchy is the primary billing boundary?',
      options: ['Subscription', 'Management group', 'Resource group', 'Resource'],
      correctAnswer: 0,
      explanation: 'The subscription is the primary billing boundary. All costs for resources within a subscription are billed together. Management groups help organize subscriptions but are not directly billed.'
    },
    {
      id: 'az900-08-q3',
      question: 'Can a resource group contain resources from different Azure regions?',
      options: ['No, all resources must be in the same region as the resource group', 'Only if they are in paired regions', 'Only within the same geography', 'Yes, a resource group can contain resources from any region'],
      correctAnswer: 3,
      explanation: 'A resource group can contain resources from any Azure region. The resource group\'s region only specifies where the group\'s metadata is stored, not where its resources must be deployed.'
    },
    {
      id: 'az900-08-q4',
      question: 'An organization has multiple departments that each need their own Azure billing and access controls. What should they use?',
      options: ['Multiple resource groups in one subscription', 'Multiple subscriptions organized by management groups', 'Multiple regions', 'Multiple tenant accounts'],
      correctAnswer: 1,
      explanation: 'Using multiple subscriptions (one per department) provides separate billing and access boundaries. Management groups can then organize these subscriptions and apply policies across them.'
    },
    {
      id: 'az900-08-q5',
      question: 'A policy is applied at the management group level. Which resources does it affect?',
      options: ['Only resources directly in the management group', 'Only the first subscription in the group', 'All resources in all subscriptions under that management group', 'None â€” policies only work at the subscription level'],
      correctAnswer: 2,
      explanation: 'Policies applied at the management group level are inherited by all subscriptions, resource groups, and resources beneath that management group in the hierarchy.'
    }
  ]}
/>

## Learn More

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) â€” Curated study materials
- [Microsoft Learn: Describe core architectural components](https://learn.microsoft.com/en-us/training/modules/describe-core-architectural-components-of-azure/)
- [Azure Resource Manager overview](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/overview)
