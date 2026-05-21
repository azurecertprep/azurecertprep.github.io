---
sidebar_position: 12
title: "Challenge 18: Security — Zero Trust, Defense-in-Depth & Defender"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 18: Security — Zero Trust, Defense-in-Depth & Defender

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Azure Architecture & Services (35-40%)
:::

## Exam skills covered

- Describe the concept of Zero Trust
- Describe the purpose of the defense-in-depth model
- Describe the purpose of Microsoft Defender for Cloud

## Overview

Security in Azure is built on fundamental concepts: **Zero Trust** (never trust, always verify), **defense-in-depth** (multiple layers of security), and **Microsoft Defender for Cloud** (unified security management). These concepts work together to protect your cloud resources.

## Explore

### Task 1: Understand Zero Trust

Zero Trust operates on three principles:

| Principle | Description | Example |
|-----------|-------------|---------|
| **Verify explicitly** | Always authenticate and authorize based on all available data | Check user identity, location, device health |
| **Least privilege access** | Give minimum permissions needed | Use just-in-time and just-enough-access |
| **Assume breach** | Minimize blast radius and verify end-to-end | Segment access, use encryption, verify everything |

**Traditional security**: "Trust everything inside the network"
**Zero Trust**: "Trust nothing, verify everything"

### Task 2: Understand defense-in-depth

Defense-in-depth uses multiple layers of security. If one layer fails, the next layer catches the threat:

```
Layer 1: Physical Security    → Datacenter access controls
Layer 2: Identity & Access    → Entra ID, MFA, Conditional Access
Layer 3: Perimeter           → DDoS protection, firewalls
Layer 4: Network             → NSGs, VNets, segmentation
Layer 5: Compute             → VM security, patching, endpoint protection
Layer 6: Application         → Secure coding, vulnerability scanning
Layer 7: Data                → Encryption at rest and in transit
```

**Key insight**: No single layer provides complete protection. Security requires ALL layers working together.

### Task 3: Explore Microsoft Defender for Cloud

1. In Azure Portal, search for **Microsoft Defender for Cloud**
2. Explore the main sections:
   - **Overview**: Security posture score
   - **Recommendations**: Suggested security improvements
   - **Security alerts**: Detected threats
   - **Regulatory compliance**: Compliance against standards
3. Note the **Secure Score** — a percentage rating of your security posture

**Defender for Cloud provides:**
- Continuous security assessment
- Security recommendations
- Threat protection with alerts
- Compliance tracking (PCI-DSS, SOC, ISO 27001)
- Just-in-time VM access

### Task 4: Defender for Cloud capabilities

| Feature | Description | Cost |
|---------|-------------|------|
| **Secure Score** | Grade your security posture (0-100%) | Free |
| **Recommendations** | Prioritized security fixes | Free |
| **Enhanced protections** | Defender plans for specific services | Paid (per-resource) |
| **Regulatory compliance** | Map controls to compliance standards | Free (basic) |

**Defender plans** (enhanced security for specific services):
- Defender for Servers
- Defender for Storage
- Defender for SQL
- Defender for Containers
- Defender for App Service
- Defender for Key Vault

### Task 5: Zero Trust in practice

How Azure services implement Zero Trust:

| Zero Trust control | Azure service |
|-------------------|---------------|
| Verify identity | Entra ID + MFA |
| Verify device health | Intune + Conditional Access |
| Least privilege | RBAC + PIM (Privileged Identity Management) |
| Micro-segmentation | NSGs + VNets + Private endpoints |
| Encryption | Azure Key Vault + TLS + disk encryption |
| Monitor and respond | Defender for Cloud + Sentinel |

:::tip Azure CLI Alternative
```bash
# Check Defender for Cloud secure score
az security secure-score list --output table 2>/dev/null || echo "Explore Defender for Cloud in the portal"

# List security recommendations
az security assessment list --query "[0:5].{Name:displayName, Status:status.code}" --output table 2>/dev/null || echo "View recommendations in the portal"
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Zero Trust** | Never trust, always verify — regardless of network location |
| **Defense-in-depth** | Multiple layers of security protecting resources |
| **Microsoft Defender for Cloud** | Unified security management and threat protection |
| **Secure Score** | Percentage measure of your security posture |
| **Least privilege** | Grant minimum permissions needed for the task |
| **Assume breach** | Design security expecting attackers are already inside |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-18-q1',
      question: 'Which security principle states that you should "never trust, always verify"?',
      options: ['Defense-in-depth', 'Zero Trust', 'Least privilege', 'Shared responsibility'],
      correctAnswer: 1,
      explanation: 'Zero Trust is the security model that eliminates implicit trust and requires continuous verification of every user, device, and connection, regardless of whether they are inside or outside the network.'
    },
    {
      id: 'az900-18-q2',
      question: 'In the defense-in-depth model, what happens if one security layer is breached?',
      options: ['All data is immediately exposed', 'The next layer provides additional protection', 'The system shuts down automatically', 'The breach is impossible with defense-in-depth'],
      correctAnswer: 1,
      explanation: 'Defense-in-depth uses multiple layers of security. If an attacker penetrates one layer, they must still overcome additional layers to reach sensitive data. No single layer failure exposes everything.'
    },
    {
      id: 'az900-18-q3',
      question: 'What does Microsoft Defender for Cloud Secure Score measure?',
      options: ['Network bandwidth', 'Cost optimization', 'Security posture of your environment', 'Application performance'],
      correctAnswer: 2,
      explanation: 'Secure Score is a percentage (0-100%) that measures your security posture. Higher scores indicate better security practices. Recommendations help improve your score.'
    },
    {
      id: 'az900-18-q4',
      question: 'Which defense-in-depth layer includes firewalls and DDoS protection?',
      options: ['Physical security', 'Identity & access', 'Perimeter', 'Network'],
      correctAnswer: 2,
      explanation: 'The perimeter layer protects against network-level attacks like DDoS and uses firewalls to filter traffic at the edge of your network.'
    },
    {
      id: 'az900-18-q5',
      question: 'A Zero Trust principle states that users should only have the minimum permissions needed to do their job. What is this called?',
      options: ['Assume breach', 'Verify explicitly', 'Least privilege access', 'Defense-in-depth'],
      correctAnswer: 2,
      explanation: 'Least privilege access means giving users and applications only the minimum permissions required to perform their tasks. This limits the blast radius if an account is compromised.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe Azure identity, access, and security](https://learn.microsoft.com/en-us/training/modules/describe-azure-identity-access-security/)
- [Zero Trust documentation](https://learn.microsoft.com/en-us/security/zero-trust/)
- [Microsoft Defender for Cloud](https://learn.microsoft.com/en-us/azure/defender-for-cloud/)
