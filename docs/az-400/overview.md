---
sidebar_position: 1
title: "AZ-400: DevOps Engineer Expert"
---

# AZ-400: designing and implementing Microsoft DevOps solutions

:::info Exam details

**Exam version**: Skills measured as of April 24, 2026 | **Passing score**: 700/1000 | **Duration**: ~120 minutes

:::

## Who is this for?

As a DevOps engineer, you're a developer or infrastructure administrator who also has subject matter expertise in working with people, processes, and products to enable continuous delivery of value in organizations.

Your responsibilities include delivering Microsoft DevOps solutions that provide continuous security, integration, testing, delivery, deployment, monitoring, and feedback. You design and implement flow of work, collaboration, communication, source control, and automation.

As a DevOps engineer, you work on cross-functional teams that include:

- Developers
- Site reliability engineers
- Azure administrators
- Security engineers

You must have experience both administering and developing in Azure, with strong skills in at least one of these areas. You should also have experience implementing both **GitHub** and **Azure DevOps** solutions.

**Prerequisite certifications**: [AZ-104: Azure Administrator Associate](https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/) or [AZ-204: Azure Developer Associate](https://learn.microsoft.com/en-us/credentials/certifications/azure-developer/) (recommended)

## Skills at a glance

| Domain | Weight | Challenges |
|--------|--------|------------|
| Design and implement processes and communications | 10-15% | 01-06 |
| Design and implement a source control strategy | 10-15% | 07-12 |
| Design and implement build and release pipelines | 50-55% | 13-38 |
| Develop a security and compliance plan | 10-15% | 39-45 |
| Implement an instrumentation strategy | 5-10% | 46-50 |
| Cross-domain capstone | All | 51 |

:::tip Challenge structure

Domain 3 (Build and release pipelines) is subdivided into 6 sections due to its 50-55% weight:
- **3a** Package management | **3b** Testing | **3c** Pipeline fundamentals | **3d** Deployment strategies | **3e** Infrastructure as Code | **3f** Pipeline operations

:::

## How this exam differs from AZ-104 and AZ-305

| Aspect | AZ-104 (Administrator) | AZ-305 (Architect) | AZ-400 (DevOps) |
|--------|------------------------|---------------------|------------------|
| Focus | Resource management | Solution design | Automation and delivery |
| Platforms | Azure Portal + CLI | Azure services | GitHub + Azure DevOps + Azure |
| Question style | "How do you configure X?" | "Which solution best meets requirements?" | "How do you automate/secure this pipeline?" |
| Skills tested | CLI commands, portal steps | Service selection, trade-offs | YAML pipelines, workflows, security scanning |
| Lab approach | Create Azure resources | Design architectures | Build CI/CD pipelines |

## What makes this certification unique

AZ-400 is the only Azure exam that tests **two platforms equally**:

- **GitHub** — Actions, Packages, Advanced Security, Copilot, Projects
- **Azure DevOps** — Pipelines, Repos, Artifacts, Boards, Test Plans

The exam expects you to know when to use each platform and how to integrate them together.

## How this site works

Each challenge follows a DevOps-focused format:

| Section | Purpose |
|---------|---------|
| Exam skills mapped | Official skills this challenge covers |
| Scenario | Real-world DevOps situation requiring action |
| Platform | Marked as [GitHub-first], [ADO-first], or [comparison] |
| Tasks | Step-by-step with working YAML/workflow examples |
| Break & Fix | Troubleshoot a deliberately broken pipeline/config |
| Knowledge check | Exam-style questions |
| Cleanup | Remove resources, reset configurations |

## Learning paths

| Path | Link |
|------|------|
| AZ-400 on Microsoft Learn | [Self-paced modules](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-400#two-ways-to-prepare) |
| Azure DevOps documentation | [docs.microsoft.com/azure/devops](https://learn.microsoft.com/en-us/azure/devops/) |
| GitHub documentation | [docs.github.com](https://docs.github.com) |
| DevOps Resource Center | [learn.microsoft.com/devops](https://learn.microsoft.com/en-us/devops/) |
| Free practice assessment | [Practice questions](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-400/practice/assessment?assessment-type=practice&assessmentId=56) |
| Exam sandbox | [Try the exam interface](https://aka.ms/examdemo) |

## Estimated cost

| Domain | Azure cost | Notes |
|--------|-----------|-------|
| 1. Processes & communications | $0 | GitHub Projects and Azure Boards are free |
| 2. Source control | $0 | Git repos are free |
| 3. Build & release pipelines | $0-10 | GitHub Actions (2000 min/month free), App Service F1 tier |
| 4. Security & compliance | $0 | GHAS is free on public repos |
| 5. Instrumentation | $0-5 | Application Insights (5 GB/month free) |

**Total estimated: $0-15** (most labs run entirely on free tiers)
