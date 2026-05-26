---
sidebar_position: 10
title: "Challenge 16: Microsoft Entra ID & Authentication"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 16: Microsoft Entra ID & Authentication

:::info Estimated Time
**25-35 min** | **Cost**: Free | **Domain**: Azure Architecture & Services (35-40%)
:::

## Exam skills covered

- Describe directory services (Microsoft Entra ID, Entra Domain Services)
- Describe authentication methods (SSO, MFA, passwordless)

## Overview

**Microsoft Entra ID** (formerly Azure Active Directory) is Azure's cloud-based identity and access management service. It handles authentication (proving who you are) and authorization (what you're allowed to do).

Unlike traditional Active Directory (which runs on Windows Server), Entra ID is cloud-native and designed for internet-scale authentication, including web apps, mobile apps, and SaaS services.

## Explore

### Task 1: Understand Entra ID vs Active Directory

| Feature | Active Directory (on-prem) | Microsoft Entra ID (cloud) |
|---------|---------------------------|---------------------------|
| Protocol | Kerberos, LDAP | OAuth 2.0, SAML, OpenID Connect |
| Scope | Internal network only | Internet-wide |
| Structure | OUs, forests, domains | Flat tenant |
| Device management | Group Policy | Intune + Conditional Access |
| Authentication | Username/password | MFA, passwordless, SSO |

### Task 2: Explore Entra ID in the Portal

1. In Azure Portal, search for **Microsoft Entra ID**
2. Click on it to open the Entra ID blade
3. Explore:
   - **Overview**: Tenant name, ID, license level
   - **Users**: All users in your tenant
   - **Groups**: Security groups and Microsoft 365 groups
   - **Enterprise applications**: Integrated SaaS apps
4. This is read-only exploration — no cost

### Task 3: Understand authentication methods

| Method | Security | User experience | Example |
|--------|----------|----------------|---------|
| **Password only** | Low | Easy | Traditional login |
| **MFA (Multi-Factor)** | High | Moderate | Password + phone approval |
| **Passwordless** | Very high | Excellent | Windows Hello, FIDO2 key |
| **SSO (Single Sign-On)** | Varies | Best | One login for all apps |

**Multi-Factor Authentication (MFA)** uses 2+ of:
- Something you **know** (password, PIN)
- Something you **have** (phone, security key)
- Something you **are** (fingerprint, face)

### Task 4: Understand SSO

**Single Sign-On (SSO)** means one login gives access to multiple applications:

```text
User logs in ONCE to Entra ID
    → Access Microsoft 365 ✓
    → Access Salesforce ✓
    → Access GitHub ✓
    → Access custom apps ✓
```

Benefits:
- Users remember one password (fewer help desk calls)
- Centralized access control
- Easier to disable access when employee leaves

### Task 5: Entra Domain Services

**Microsoft Entra Domain Services** provides managed domain services:
- Domain join, group policy, LDAP, Kerberos/NTLM
- No need to manage domain controllers
- Integrates with your Entra ID tenant
- Use case: Legacy apps that need traditional AD protocols

| Scenario | Use |
|----------|-----|
| Modern web app needs authentication | Entra ID |
| Legacy app needs LDAP/Kerberos | Entra Domain Services |
| On-prem servers need Group Policy | Traditional AD (on-prem) |

:::tip Azure CLI Alternative
```bash
# List users in your Entra ID tenant (first 5)
az ad user list --query "[0:5].{Name:displayName, UPN:userPrincipalName}" --output table

# Show your tenant info
az account show --query "{TenantId:tenantId, Name:name}" --output table
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Microsoft Entra ID** | Cloud-based identity and access management (formerly Azure AD) |
| **Tenant** | A dedicated instance of Entra ID for your organization |
| **Authentication** | Proving identity (who are you?) |
| **Authorization** | Checking permissions (what can you do?) |
| **MFA** | Requires 2+ verification methods for login |
| **SSO** | One login provides access to multiple applications |
| **Passwordless** | Login without a password (biometrics, security keys) |
| **Entra Domain Services** | Managed domain services (LDAP, Kerberos) without domain controllers |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-16-q1',
      question: 'What is Microsoft Entra ID?',
      options: ['A virtual machine management tool', 'A cloud-based identity and access management service', 'A file storage service', 'A networking service'],
      correctAnswer: 1,
      explanation: 'Microsoft Entra ID (formerly Azure Active Directory) is a cloud-based identity and access management service that helps users sign in and access resources.'
    },
    {
      id: 'az900-16-q2',
      question: 'Multi-Factor Authentication (MFA) requires at least how many verification methods?',
      options: ['1', '2', '3', '4'],
      correctAnswer: 1,
      explanation: 'MFA requires at least 2 different verification methods from different categories: something you know, something you have, or something you are.'
    },
    {
      id: 'az900-16-q3',
      question: 'A company wants employees to log in once and access all their business applications without signing in again. What feature provides this?',
      options: ['Multi-Factor Authentication', 'Single Sign-On (SSO)', 'Conditional Access', 'Passwordless authentication'],
      correctAnswer: 1,
      explanation: 'Single Sign-On (SSO) allows users to authenticate once and then access multiple applications without being prompted to sign in again for each one.'
    },
    {
      id: 'az900-16-q4',
      question: 'An organization has a legacy application that requires LDAP and Kerberos authentication. They want to run it in Azure without managing domain controllers. What should they use?',
      options: ['Microsoft Entra ID', 'Microsoft Entra Domain Services', 'Azure Virtual Machines with AD', 'Azure Functions'],
      correctAnswer: 1,
      explanation: 'Microsoft Entra Domain Services provides managed domain services (LDAP, Kerberos, NTLM, Group Policy) without deploying or managing domain controllers. It is designed for legacy apps in Azure.'
    },
    {
      id: 'az900-16-q5',
      question: 'Which authentication method is considered the most secure and provides the best user experience?',
      options: ['Password only', 'Password + SMS code', 'Passwordless (Windows Hello, FIDO2)', 'Security questions'],
      correctAnswer: 2,
      explanation: 'Passwordless authentication (Windows Hello, FIDO2 security keys) is the most secure because there is no password to steal or phish. It also provides excellent user experience with biometric or key-based login.'
    }
  ]}
/>

## Learn More

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe Azure identity, access, and security](https://learn.microsoft.com/en-us/training/modules/describe-azure-identity-access-security/)
- [Microsoft Entra ID documentation](https://learn.microsoft.com/en-us/entra/fundamentals/)
