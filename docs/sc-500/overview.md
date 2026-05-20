---
sidebar_position: 1
title: "SC-500: Cloud and AI Security Engineer"
---

# SC-500: Cloud and AI Security Engineer

:::info Exam details

**Exam version**: Skills measured as of July 2025 | **Passing score**: 700/1000 | **Duration**: ~120 minutes

:::

## Who is this for?

As a cloud and AI security engineer, you're responsible for protecting cloud, hybrid, and AI systems across their entire lifecycle. You implement and manage security controls, threat protection, and security posture management across Azure, Microsoft 365, and hybrid environments.

Your responsibilities include:

- Securing identity and access for cloud workloads
- Protecting storage, databases, and network infrastructure
- Hardening compute resources including VMs, containers, and AI workloads
- Monitoring security posture and responding to threats using Microsoft Defender and Sentinel
- Securing AI workloads, including data overexposure remediation and AI model protection

You work on cross-functional teams that include:

- Cloud administrators
- Network engineers
- Identity engineers
- Data engineers
- AI/ML engineers
- Compliance officers

**Prerequisite certifications**: [AZ-104: Azure Administrator Associate](https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/) (recommended). Practical Azure admin experience is assumed.

:::warning Replacing AZ-500

SC-500 replaces the AZ-500 (Azure Security Engineer) exam, which retires **August 31, 2026**. SC-500 expands coverage to include **AI security, Purview data security posture management, and Microsoft 365 Copilot readiness** — topics not covered by AZ-500.

:::

## Skills at a glance

| Domain | Weight | Challenges |
|--------|--------|------------|
| Manage identity, access, and governance | 20–25% | 01–12 |
| Secure storage, databases, and networking | 25–30% | 13–25 |
| Secure compute | 20–25% | 26–38 |
| Manage and monitor security posture | 20–25% | 39–51 |
| Cross-domain capstone | All | 52 |

:::tip Challenge structure

Domain 2 (Storage, databases, and networking) carries the highest weight at 25-30%. Domain 3 (Secure compute) includes **AI security** challenges (26-30) covering Purview DSPM, AI workload hardening, and Copilot security — these are brand-new topics not tested on AZ-500.

:::

## How this exam differs from AZ-500 and SC-100

| Aspect | AZ-500 (retiring) | SC-100 (Architect) | SC-500 (this exam) |
|--------|--------------------|--------------------|---------------------|
| Focus | Azure security controls | Security architecture design | Hands-on security implementation |
| Scope | Azure only | Multi-cloud strategy | Azure + M365 + AI |
| Question style | "How do you configure X?" | "Which solution design meets requirements?" | "Implement and secure this workload" |
| AI coverage | None | Conceptual AI governance | Hands-on AI security (Purview DSPM, Copilot) |
| Level | Associate | Expert | Associate |

## What makes this certification unique

SC-500 is the first Azure security certification that tests **AI security** alongside traditional cloud security:

- **Purview DSPM for AI** — Assess data overexposure before deploying Copilot
- **AI workload hardening** — Secure Azure OpenAI, prompt injection defense
- **Defender for Cloud AI** — Monitor and protect AI model deployments
- **Sensitivity labels** — Prevent AI from surfacing restricted content

## How this site works

Each challenge follows a security-focused format:

| Section | Purpose |
|---------|---------|
| Exam skills mapped | Official skills this challenge covers |
| Scenario | Real-world security situation requiring action |
| Prerequisites | Required licenses, roles, and tools |
| Tasks | Step-by-step with working CLI/portal examples |
| Break & Fix | Troubleshoot a deliberately misconfigured security control |
| Knowledge check | Exam-style questions |
| Cleanup | Remove resources, reset configurations |

## Learning paths

| Path | Link |
|------|------|
| SC-500 study guide | [Microsoft Learn study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/sc-500) |
| SC-500 on Microsoft Learn | [Self-paced modules](https://learn.microsoft.com/en-us/credentials/certifications/cloud-ai-security-engineer/) |
| Microsoft Defender for Cloud docs | [learn.microsoft.com/defender-for-cloud](https://learn.microsoft.com/en-us/azure/defender-for-cloud/) |
| Microsoft Sentinel docs | [learn.microsoft.com/sentinel](https://learn.microsoft.com/en-us/azure/sentinel/) |
| Microsoft Purview docs | [learn.microsoft.com/purview](https://learn.microsoft.com/en-us/purview/) |
| Exam sandbox | [Try the exam interface](https://aka.ms/examdemo) |

## Estimated cost

| Domain | Azure cost | Notes |
|--------|-----------|-------|
| 1. Identity & governance | $0–5 | Entra ID P2 trial free for 30 days |
| 2. Storage, databases & networking | $5–10 | Storage accounts, Key Vault, VNets |
| 3. Secure compute | $0–5 | VMs (B1s), containers, Defender plans |
| 4. Security posture & monitoring | $0–5 | Sentinel free tier (10 GB/day first 31 days) |

**Total estimated: $10–15** (with aggressive cleanup after each challenge)
