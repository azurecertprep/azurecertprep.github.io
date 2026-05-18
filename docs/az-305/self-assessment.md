---
sidebar_position: 2
title: "Am I Ready?"
---

import SelfAssessment from '@site/src/components/SelfAssessment';

# Am I Ready for the AZ-305?

The AZ-305 is an **expert-level** exam. Unlike AZ-104, which tests implementation skills, AZ-305 tests your ability to **design solutions** that meet business and technical requirements. You should already have strong Azure administration experience before attempting this exam.

## Self-Assessment Checklist

Click each row to cycle through: ✅ Comfortable | ⚠️ Need Review | ❌ New to Me

### Azure Administration (Prerequisite)

<SelfAssessment
  storageKey="az305-admin-prereq"
  skills={[
    "I have passed AZ-104 or have equivalent Azure administration experience",
    "I can deploy and manage VMs, App Services, and container workloads",
    "I can configure VNets, NSGs, load balancers, and DNS",
    "I can manage storage accounts, RBAC, and Azure Policy",
    "I can set up monitoring, alerts, and diagnostic settings",
    "I have managed production Azure environments (not just lab/dev)",
  ]}
/>

### Architecture & Design Skills

<SelfAssessment
  storageKey="az305-architecture"
  skills={[
    "I can evaluate trade-offs between cost, performance, and availability",
    "I understand SLA composition (calculating composite SLAs)",
    "I can explain the difference between RTO and RPO",
    "I know when to use IaaS vs PaaS vs serverless for a given workload",
    "I can design multi-tier applications (web, API, database, cache)",
    "I understand the Azure Well-Architected Framework pillars",
    "I can design hybrid solutions (on-prem + Azure connectivity)",
  ]}
/>

### Identity & Governance

<SelfAssessment
  storageKey="az305-identity"
  skills={[
    "I understand Entra ID B2B vs B2C vs workforce tenants",
    "I know when to use Conditional Access, PIM, and Access Reviews",
    "I can design a management group hierarchy for a multi-team org",
    "I understand Azure Policy initiatives and compliance enforcement",
    "I know the difference between Key Vault access policies and RBAC",
  ]}
/>

### Data & Storage

<SelfAssessment
  storageKey="az305-data"
  skills={[
    "I can choose between Azure SQL DB, SQL MI, PostgreSQL, and Cosmos DB",
    "I understand DTU vs vCore pricing models",
    "I know Cosmos DB consistency levels and partition key design",
    "I can design storage redundancy (LRS, ZRS, GRS, GZRS and their RA variants)",
    "I understand Data Factory pipelines and Synapse Analytics",
  ]}
/>

### Business Continuity

<SelfAssessment
  storageKey="az305-bcdr"
  skills={[
    "I can design backup strategies for VMs, databases, and blobs",
    "I understand Azure Site Recovery for DR scenarios",
    "I can calculate composite SLAs and design for 99.99% availability",
    "I know the HA options for SQL (failover groups, Business Critical tier)",
    "I understand Cosmos DB multi-region writes and consistency trade-offs",
  ]}
/>

### Infrastructure & Networking

<SelfAssessment
  storageKey="az305-infra"
  skills={[
    "I can choose between VPN Gateway, ExpressRoute, and Virtual WAN",
    "I understand the load balancer decision tree (LB vs App GW vs Front Door vs Traffic Manager)",
    "I can design hub-spoke network topologies",
    "I know when to use Azure Firewall vs NSGs vs WAF",
    "I understand Private Link and Private Endpoints",
    "I can design IaC deployment strategies (Bicep vs Terraform, CI/CD)",
  ]}
/>

## How to Interpret Your Results

### Mostly ✅: You're ready!
Jump to [Challenge 01](/docs/az-305/identity-governance-monitoring/challenge-01) and start designing.

### Mix of ✅ and ⚠️: You're almost ready
Focus on the domains where you marked ⚠️. Use the **Learning Resources** in each challenge to fill gaps. Consider reviewing the [Microsoft Learn path for AZ-305](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-305#two-ways-to-prepare).

### Mostly ⚠️ or ❌: Build your foundation first
The AZ-305 builds on AZ-104 knowledge. If you haven't already, complete the [AZ-104 challenges](/docs/az-104/overview) first, or gain 6-12 months of hands-on Azure experience before attempting this exam.

## Key Differences from AZ-104

| Aspect | AZ-104 | AZ-305 |
|--------|--------|--------|
| Question style | "How do you do X?" | "Which solution meets these requirements?" |
| Knowledge depth | Know one correct way | Know all options and trade-offs |
| Scenario complexity | Single service | Multi-service architecture |
| Decision criteria | N/A | Cost, performance, security, compliance |
| Framework knowledge | Not required | Well-Architected Framework, CAF |

---

**Ready to start?** Begin with [Challenge 01: Design a Centralized Logging Solution](/docs/az-305/identity-governance-monitoring/challenge-01).
