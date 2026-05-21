---
sidebar_position: 11
title: "Challenge 17: RBAC, Conditional Access & External Identities"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 17: RBAC, Conditional Access & External Identities

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Azure Architecture & Services (35-40%)
:::

## Exam skills covered

- Describe external identities and guest access (B2B)
- Describe Conditional Access
- Describe Azure role-based access control (RBAC)

## Overview

Once users are authenticated (proven who they are), Azure needs to control **what they can do**. This is where RBAC (Role-Based Access Control) comes in. **Conditional Access** adds context-aware policies (where, when, how the user is signing in). **External identities** allow collaboration with people outside your organization.

## Explore

### Task 1: Understand Azure RBAC

RBAC answers: "Who can do what, on which resources?"

| RBAC component | Description | Example |
|---------------|-------------|---------|
| **Security principal** | Who | User, group, service principal |
| **Role** | What they can do | Reader, Contributor, Owner |
| **Scope** | Where it applies | Management group, subscription, RG, resource |

**Built-in roles:**

| Role | Permissions |
|------|------------|
| **Owner** | Full access + can assign roles to others |
| **Contributor** | Full access EXCEPT assigning roles |
| **Reader** | View only — cannot change anything |
| **User Access Administrator** | Manage user access only |

### Task 2: Explore RBAC in the Portal

1. In Azure Portal, navigate to your **Subscription**
2. Click **Access control (IAM)** in the left menu
3. Click **Roles** tab — browse available roles
4. Click **Role assignments** tab — see who has access
5. Click **Check access** — see what a specific user can do
6. This is read-only exploration

**RBAC inheritance:**
```
Management Group (Owner) → applies to all below
  └── Subscription (Contributor) → applies to all RGs and resources
        └── Resource Group (Reader) → applies to all resources in this RG
              └── Resource (custom) → applies to this resource only
```

### Task 3: Understand Conditional Access

Conditional Access policies are "if-then" rules:

**IF** (condition) → **THEN** (action)

| Signal (IF) | Action (THEN) |
|------------|---------------|
| User is in risky location | Require MFA |
| Device is not compliant | Block access |
| Accessing sensitive app | Require managed device |
| User is internal employee | Allow with MFA |
| User is guest from unknown location | Block |

**Common policies:**
- Require MFA for all admin accounts
- Block sign-ins from countries you don't operate in
- Require compliant devices for accessing corporate data
- Force password change if sign-in risk is detected

### Task 4: Explore Conditional Access in Portal

1. In Azure Portal, search for **Conditional Access**
2. Or navigate: **Microsoft Entra ID** → **Security** → **Conditional Access**
3. Browse the **Policies** section
4. Click **+ New policy** to see what options exist:
   - **Assignments**: Users, apps, conditions
   - **Access controls**: Grant, Block, Require MFA
5. Click **Cancel** — don't create a policy

### Task 5: Understand external identities

**B2B (Business-to-Business)** allows you to invite external users:
- Partner employees collaborate in your environment
- They use their OWN identity (their company email)
- You control what they can access via RBAC
- They appear as "Guest" users in your directory

| Identity type | Description | Example |
|--------------|-------------|---------|
| **Member** | Internal organization user | employee@contoso.com |
| **Guest (B2B)** | External user invited to collaborate | partner@fabrikam.com |
| **B2C** | Customer identity for public-facing apps | customer@gmail.com |

:::tip Azure CLI Alternative
```bash
# List role assignments on your subscription
az role assignment list --output table --query "[0:5].{Principal:principalName, Role:roleDefinitionName, Scope:scope}"

# List built-in RBAC roles
az role definition list --query "[?roleType=='BuiltInRole'] | [0:10].{Name:roleName, Description:description}" --output table
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **RBAC** | Role-based access control — assign permissions to roles, roles to users |
| **Role assignment** | Combination of security principal + role + scope |
| **Scope** | Where the role applies (management group → subscription → RG → resource) |
| **Conditional Access** | If-then policies that evaluate sign-in context |
| **B2B** | Invite external users to collaborate using their own identity |
| **B2C** | Customer-facing identity management for apps |
| **Least privilege** | Give users only the permissions they need |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-17-q1',
      question: 'A user needs to view Azure resources but should not be able to make any changes. Which RBAC role should be assigned?',
      options: ['Owner', 'Contributor', 'Reader', 'User Access Administrator'],
      correctAnswer: 2,
      explanation: 'The Reader role allows viewing all resources but does not permit creating, updating, or deleting anything. This follows the principle of least privilege.'
    },
    {
      id: 'az900-17-q2',
      question: 'What is the purpose of Conditional Access policies?',
      options: ['To create Azure resources', 'To enforce access rules based on conditions like location and device', 'To manage storage accounts', 'To monitor resource health'],
      correctAnswer: 1,
      explanation: 'Conditional Access policies evaluate signals (user, location, device, application) and enforce decisions (allow, block, require MFA) based on organizational rules.'
    },
    {
      id: 'az900-17-q3',
      question: 'A company wants to collaborate with a partner organization. Partner employees should use their existing company credentials to access shared resources. Which feature enables this?',
      options: ['B2C identities', 'B2B external identities', 'Entra Domain Services', 'VPN Gateway'],
      correctAnswer: 1,
      explanation: 'B2B (Business-to-Business) external identities allow you to invite users from other organizations. They authenticate with their own identity provider and access resources you share with them.'
    },
    {
      id: 'az900-17-q4',
      question: 'If a Contributor role is assigned at the subscription level, what does the user have access to?',
      options: ['Only that subscription settings', 'All resource groups and resources within that subscription', 'Only the first resource group', 'Nothing — Contributor requires resource-level assignment'],
      correctAnswer: 1,
      explanation: 'RBAC permissions are inherited downward. A Contributor role at the subscription level gives full access (except role assignments) to ALL resource groups and resources within that subscription.'
    },
    {
      id: 'az900-17-q5',
      question: 'What is the difference between the Owner and Contributor roles?',
      options: ['Owner can create resources; Contributor cannot', 'Owner can assign roles to others; Contributor cannot', 'Contributor has more permissions than Owner', 'There is no difference'],
      correctAnswer: 1,
      explanation: 'Both Owner and Contributor have full access to manage resources. The key difference is that Owner can also manage role assignments (grant/revoke access to others), while Contributor cannot.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe Azure identity, access, and security](https://learn.microsoft.com/en-us/training/modules/describe-azure-identity-access-security/)
- [Azure RBAC documentation](https://learn.microsoft.com/en-us/azure/role-based-access-control/)
