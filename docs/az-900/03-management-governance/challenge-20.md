---
sidebar_position: 2
title: "Challenge 20: Governance — Azure Policy, Purview & Resource Locks"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 20: Governance — Azure Policy, Purview & Resource Locks

:::info Estimated Time
**25-35 min** | **Cost**: Free | **Domain**: Management & Governance (30-35%)
:::

## Exam skills covered

- Describe the purpose of Microsoft Purview
- Describe the purpose of Azure Policy
- Describe the purpose of resource locks

## Overview

Governance ensures your Azure environment stays compliant, organized, and protected. **Azure Policy** enforces rules about what can be created and how. **Resource locks** prevent accidental deletion or modification. **Microsoft Purview** provides data governance across your entire estate.

## Explore

### Task 1: Understand Azure Policy

Azure Policy enforces organizational standards. Policies evaluate resources and mark non-compliant ones.

| Policy type | What it does | Example |
|------------|-------------|---------|
| **Deny** | Prevent non-compliant resource creation | "VMs must be in allowed regions only" |
| **Audit** | Flag existing non-compliant resources | "Storage accounts without encryption" |
| **Append** | Add required fields automatically | "Auto-add required tags" |
| **Modify** | Change resource properties | "Enable diagnostic logging" |

### Task 2: Explore Azure Policy in the Portal

1. In Azure Portal, search for **Policy**
2. Explore:
   - **Overview**: Compliance status across your environment
   - **Definitions**: Browse built-in policies
   - **Assignments**: See what's assigned
3. Click **Definitions** and browse categories:
   - Compute, Storage, Network, Security Center, Tags
4. Try searching for: "Allowed locations" — this popular policy restricts where resources can be created

**Policy vs RBAC:**
| | Azure Policy | Azure RBAC |
|--|-------------|-----------|
| Question answered | "What can be created?" | "Who can do what?" |
| Focus | Resource compliance | User permissions |
| Example | "Only Standard_D2s VMs allowed" | "Alice can create VMs" |

### Task 3: Understand resource locks

Resource locks prevent accidental changes or deletion:

| Lock type | Can read? | Can modify? | Can delete? |
|-----------|----------|------------|-------------|
| **No lock** | ✅ | ✅ | ✅ |
| **ReadOnly** | ✅ | ❌ | ❌ |
| **CanNotDelete** | ✅ | ✅ | ❌ |

**Key facts:**
- Locks are inherited (lock on RG applies to all resources)
- Even Owners cannot delete a locked resource without removing the lock first
- Locks override RBAC permissions

### Task 4: Explore resource locks in the Portal

1. Navigate to your `rg-az900-learning` resource group (or any RG)
2. Click **Locks** in the left menu
3. Click **+ Add** to see lock options:
   - Lock name, Lock type (Read-only or Delete)
   - Notes explaining why the lock exists
4. Optionally add a **CanNotDelete** lock to your resource group
5. Try to delete the RG — you'll be blocked!

### Task 5: Understand Microsoft Purview

Microsoft Purview provides unified data governance:

| Feature | Description |
|---------|-------------|
| **Data Map** | Automated discovery and classification of data across Azure, on-prem, and multi-cloud |
| **Data Catalog** | Search and discover data assets |
| **Data Estate Insights** | Analytics on data distribution and sensitivity |
| **Data sharing** | Securely share data across organizations |

**When to use Purview:**
- You need to know WHERE your sensitive data is
- You need to classify data (PII, financial, health)
- You need compliance reporting across multiple data stores
- You need a unified view of your data landscape

:::tip Azure CLI Alternative
```bash
# List Azure Policy definitions (first 5)
az policy definition list --query "[0:5].{Name:displayName, Category:metadata.category}" --output table

# List policy assignments
az policy assignment list --output table

# Add a resource lock
az lock create --name DoNotDelete --resource-group rg-az900-learning --lock-type CanNotDelete 2>/dev/null || echo "Create the RG first"

# List locks
az lock list --resource-group rg-az900-learning --output table 2>/dev/null || echo "No RG found"
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Azure Policy** | Enforce rules about resource creation and compliance |
| **Policy initiative** | Group of related policies applied together |
| **Resource lock** | Prevent accidental deletion or modification |
| **CanNotDelete lock** | Resources can be modified but not deleted |
| **ReadOnly lock** | Resources can only be read — no changes allowed |
| **Microsoft Purview** | Unified data governance, discovery, and classification |
| **Compliance** | Percentage of resources meeting policy requirements |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-20-q1',
      question: 'A company wants to ensure that all Azure resources are created only in specific regions. Which service should they use?',
      options: ['Azure RBAC', 'Azure Policy', 'Resource locks', 'Microsoft Purview'],
      correctAnswer: 1,
      explanation: 'Azure Policy can enforce an "Allowed locations" policy that prevents resource creation in non-approved regions. This applies to all users regardless of their RBAC role.'
    },
    {
      id: 'az900-20-q2',
      question: 'A production database must be protected from accidental deletion. What should be applied?',
      options: ['Azure Policy deny rule', 'CanNotDelete resource lock', 'ReadOnly resource lock', 'Remove Owner permissions'],
      correctAnswer: 1,
      explanation: 'A CanNotDelete lock prevents the resource from being deleted while still allowing modifications. This protects production resources from accidental deletion.'
    },
    {
      id: 'az900-20-q3',
      question: 'What is the purpose of Microsoft Purview?',
      options: ['To manage VM deployments', 'To provide unified data governance and classification', 'To monitor network traffic', 'To create storage accounts'],
      correctAnswer: 1,
      explanation: 'Microsoft Purview provides unified data governance across your data estate. It discovers, classifies, and maps sensitive data across Azure, on-premises, and multi-cloud environments.'
    },
    {
      id: 'az900-20-q4',
      question: 'An Owner of a resource group tries to delete it but receives an error. What is the most likely cause?',
      options: ['They do not have sufficient permissions', 'A resource lock is preventing deletion', 'The resource group is empty', 'Azure Policy is blocking it'],
      correctAnswer: 1,
      explanation: 'Resource locks override RBAC permissions. Even an Owner cannot delete a resource with a CanNotDelete lock applied. The lock must be removed first.'
    },
    {
      id: 'az900-20-q5',
      question: 'What is the difference between Azure Policy and Azure RBAC?',
      options: ['Policy controls WHO can access; RBAC controls WHAT can be created', 'Policy controls WHAT can be created; RBAC controls WHO can do it', 'They are the same thing', 'Policy is for compute; RBAC is for storage'],
      correctAnswer: 1,
      explanation: 'Azure Policy focuses on resource properties and compliance (what can be created/configured). RBAC focuses on user permissions (who can perform actions). They complement each other.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe features and tools for governance](https://learn.microsoft.com/en-us/training/modules/describe-features-tools-azure-for-governance-compliance/)
- [Azure Policy documentation](https://learn.microsoft.com/en-us/azure/governance/policy/)
- [Microsoft Purview documentation](https://learn.microsoft.com/en-us/purview/)
