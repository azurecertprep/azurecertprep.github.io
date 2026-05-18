---
sidebar_position: 3
title: "Exam Tips & Strategy"
---

# Exam Tips & Strategy

The AZ-305 tests your ability to make design decisions. Unlike AZ-104, there's rarely a single "correct" CLI command. Instead, you'll evaluate scenarios and choose the best solution from several valid options.

## Exam Format

| Detail | Value |
|--------|-------|
| **Number of questions** | ~40-60 questions |
| **Duration** | 100-120 minutes |
| **Passing score** | 700 out of 1000 |
| **Question types** | Multiple choice, multiple answer, drag-and-drop, case study |
| **Penalty for wrong answers** | None, always answer every question |
| **Can you go back?** | Yes, within a section. No, between sections. |
| **Labs?** | No active labs (unlike AZ-104). Pure scenario-based questions. |

## Question Types You'll See

### Scenario-Based Multiple Choice
The most common type. A 2-3 paragraph business scenario followed by "which solution meets the requirements?" Read the requirements carefully. Often one word (like "minimize cost" vs "minimize downtime") changes the correct answer.

### Multiple Answer ("Select TWO/THREE")
Pick exactly the number specified. Common for questions like "which TWO services should you include in your design?"

### Case Study
A multi-page scenario (company profile, existing architecture, requirements) with 4-7 questions. You cannot return to the case study after moving to the next section.

:::warning Case Study Strategy

Read the **requirements** tab first, then the **existing environment**. Most questions only test a specific requirement. Don't waste time memorizing the entire scenario.

:::

### Drag-and-Drop / Ordering
Match services to requirements, or order deployment steps. Common for migration planning and architecture layering.

## How AZ-305 Differs from AZ-104

The mental model is completely different:

| AZ-104 Thinking | AZ-305 Thinking |
|-----------------|-----------------|
| "How do I create a VNet?" | "Should I use hub-spoke or Virtual WAN?" |
| "Which CLI command deploys an App Service?" | "Should this be App Service, Container Apps, or Functions?" |
| "How do I configure NSG rules?" | "Should I use NSG, Azure Firewall, or WAF here?" |

**The exam tests WHY, not HOW.**

## Study Strategy

### Weeks 1-2: Infrastructure Solutions (30-35%)
This is the largest domain. Focus on compute selection (VM vs container vs serverless), networking (VPN vs ExpressRoute, load balancing decision tree), and application architecture (messaging, events, caching).

### Weeks 3-4: Identity, Governance & Monitoring (25-30%)
Know authentication/authorization patterns, Key Vault design, management group hierarchies, and Azure Policy. Monitoring (Log Analytics, App Insights) connects to every other domain.

### Week 5: Data Storage + Business Continuity (35-45% combined)
Relational vs non-relational selection, tier/compute decisions, redundancy options, backup/DR strategies, HA patterns. These two domains overlap heavily.

### Week 6: Review + Practice
- Take the [Free Practice Assessment](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-305/practice/assessment?assessment-type=practice&assessmentId=15)
- Review the [Coverage Matrix](/docs/az-305/coverage-matrix) for any gaps
- Redo the capstone challenges (13, 24, 33, 50)

## Common Exam Gotchas

:::warning Things that catch people off guard

1. **Cosmos DB consistency levels**: Strong consistency gives you reads-after-writes but costs 2x RUs and limits multi-region writes. Eventual is cheap but stale. Know the 5 levels and trade-offs.
2. **SQL Database tiers**: Business Critical includes built-in HA (read replicas), General Purpose doesn't. Hyperscale is for databases larger than 4TB.
3. **SLA composition**: Two services at 99.9% each give you 99.8% composite (0.999 x 0.999). Adding redundancy INCREASES the composite SLA.
4. **ExpressRoute vs VPN Gateway**: ExpressRoute doesn't go over the public internet. But it requires a connectivity provider. Know when each is appropriate.
5. **Event Grid vs Event Hubs vs Service Bus**: Event Grid = reactive (events happened), Event Hubs = streaming (high throughput telemetry), Service Bus = enterprise messaging (guaranteed delivery, ordering).
6. **Azure Front Door vs Traffic Manager**: Front Door operates at Layer 7 (HTTP), Traffic Manager at DNS level. Front Door is preferred for web workloads.
7. **Private Endpoints vs Service Endpoints**: Private Endpoints give you a private IP in your VNet. Service Endpoints route over the Microsoft backbone but the service still has a public IP.
8. **Managed Identity vs Service Principal**: Always prefer managed identity when the source is an Azure resource. Service principals are for non-Azure sources.
9. **Premium SSD v2 vs Ultra Disk**: Premium SSD v2 lets you independently scale IOPS/throughput without changing disk size. Ultra Disk is for extreme sub-ms workloads.
10. **Azure Batch vs Functions with queues**: Batch is for massive parallel compute (thousands of nodes). Functions with queue triggers are for message-driven processing at moderate scale.

:::

## Decision Frameworks to Memorize

### Compute Decision Tree
- Need full OS control? VM
- Containerized workloads with orchestration? AKS
- Simple containerized HTTP services? Container Apps
- Event-driven, short-running? Functions
- Workflow orchestration? Logic Apps or Durable Functions
- Batch processing (thousands of cores)? Azure Batch

### Load Balancing Decision Tree
- Global HTTP/HTTPS? Azure Front Door
- Global non-HTTP (DNS-based)? Traffic Manager
- Regional HTTP with WAF? Application Gateway
- Regional non-HTTP (Layer 4)? Azure Load Balancer

### Storage Decision Tree
- Relational + high compatibility? SQL Managed Instance
- Relational + cost-optimized PaaS? Azure SQL Database
- NoSQL document + global distribution? Cosmos DB for NoSQL
- Key-value simple lookups? Table Storage or Cosmos DB for Table
- Unstructured blobs? Blob Storage
- Big data analytics? Data Lake Storage Gen2
- SMB file shares? Azure Files

## Useful Links

| Resource | Link |
|----------|------|
| **Try the exam interface** | [Exam Sandbox](https://aka.ms/examdemo) |
| **Free practice questions** | [Practice Assessment](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-305/practice/assessment?assessment-type=practice&assessmentId=15) |
| **Schedule the exam** | [Pearson VUE](https://learn.microsoft.com/en-us/credentials/certifications/azure-solutions-architect/) |
| **Azure Architecture Center** | [Reference Architectures](https://learn.microsoft.com/en-us/azure/architecture/) |
| **Well-Architected Framework** | [WAF Documentation](https://learn.microsoft.com/en-us/azure/well-architected/) |
| **Certification renewal** | [Renew for free](https://learn.microsoft.com/en-us/credentials/certifications/renew-your-microsoft-certification) |

## After You Pass

- Your certification appears on your [Microsoft Learn profile](https://learn.microsoft.com/en-us/users/) within 24 hours
- You earn the **Microsoft Certified: Azure Solutions Architect Expert** title
- You get a digital badge via Credly to share on LinkedIn
- The certification is valid for 1 year (renew for free via online assessment)
- Consider your next step: [AZ-400](https://learn.microsoft.com/en-us/credentials/certifications/devops-engineer/) (DevOps) or [AZ-500](https://learn.microsoft.com/en-us/credentials/certifications/azure-security-engineer/) (Security)

---

**Ready to start?** Head to [Challenge 01: Design a Centralized Logging Solution](/docs/az-305/identity-governance-monitoring/challenge-01).
