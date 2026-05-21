---
sidebar_position: 4
title: "Exam Tips & Strategy"
---

# AZ-900 Exam Tips & Strategy

## Exam format

| Detail | Value |
|--------|-------|
| Duration | 45 minutes |
| Questions | ~40-60 |
| Passing score | 700/1000 |
| Question types | Multiple choice, drag-and-drop, yes/no scenarios |
| Cost | $99 USD (free for eligible students) |

## Top strategies

### 1. Focus on the highest-weight domain

**Domain 2: Azure architecture and services (35-40%)** carries the most weight. Know your core services:
- Compute: VMs, App Service, Functions, Containers
- Storage: Blob, File, Queue, Table + redundancy options
- Networking: VNet, VPN Gateway, ExpressRoute, DNS
- Identity: Entra ID, RBAC, Conditional Access

### 2. Know the "which service" pattern

Many AZ-900 questions follow this pattern:
> "A company needs to [requirement]. Which Azure service should they use?"

Master the mapping between requirements and services.

### 3. Understand shared responsibility

This is tested heavily. Remember:
- **IaaS**: You manage OS, apps, data. Azure manages hardware, network.
- **PaaS**: You manage apps and data. Azure manages everything else.
- **SaaS**: You manage data and access. Azure manages everything else.

### 4. Know CapEx vs OpEx

- **CapEx** (Capital Expenditure): Upfront cost, depreciates over time (buying servers)
- **OpEx** (Operational Expenditure): Pay-as-you-go, consumption-based (cloud)

### 5. Don't overthink it

AZ-900 is a fundamentals exam. If an answer sounds overly complex or advanced, it's probably wrong. Look for the straightforward answer.

## Common traps

| Trap | Reality |
|------|---------|
| "Azure AD" in answers | Now called **Microsoft Entra ID** — both names may appear |
| "Availability Sets" vs "Availability Zones" | Zones = datacenters, Sets = racks within a datacenter |
| "Scale up" vs "Scale out" | Up = bigger VM, Out = more VMs |
| "Azure Policy" vs "RBAC" | Policy = "what can be created", RBAC = "who can do what" |
| "Management Groups" vs "Resource Groups" | Management Groups = organize subscriptions, Resource Groups = organize resources |

## Day-of checklist

- [ ] Test your exam environment (webcam, microphone, ID) the day before
- [ ] Close all applications except the exam browser
- [ ] Have government-issued ID ready
- [ ] Clear your desk completely (online proctored)
- [ ] Relax — AZ-900 has a very high pass rate with proper preparation

## Time management

With ~45 minutes for ~50 questions, you have less than 1 minute per question:
- Don't spend more than 60 seconds on any question
- Flag difficult questions and return to them
- Trust your first instinct — don't change answers unless you're sure

:::tip Free retake
Microsoft occasionally offers free retakes through promotions. Check [Microsoft Learn](https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/) for current offers.
:::
