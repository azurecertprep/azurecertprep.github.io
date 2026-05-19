---
sidebar_position: 2
title: "Challenge 15: Design Database Tiers and Compute"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 15: design database tiers and compute

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $5-12 | **Exam Weight: 20-25%**

:::

## Introduction

CloudTenant is a B2B SaaS platform that provides project management tools to 300 enterprise customers. Their application uses Azure SQL Database as its backend, and the engineering team is struggling with both cost and performance. During weekdays between 9 AM and 6 PM, the system handles an average of 5,000 concurrent connections with consistent query throughput. However, between 7 PM and 7 AM (and on weekends), usage drops to fewer than 50 connections, with only automated health checks and a handful of overseas users active.

CloudTenant has three distinct workload tiers. The "Standard" tier (250 customers) requires general-purpose performance with 99.99% SLA and can tolerate brief failover delays. The "Premium" tier (45 customers) requires sub-5ms read/write latency for real-time collaboration features and uses In-Memory OLTP for caching session state. The "Enterprise" tier (5 customers) each has databases exceeding 4TB and growing rapidly, with unpredictable query patterns that occasionally scan terabytes of data.

The finance team reports that the current database spend is $18,000/month and wants it reduced by at least 30% without degrading the customer experience. The VP of Engineering wants to understand the trade-offs between the DTU and vCore purchasing models and whether serverless compute could help with the off-hours cost problem.

## Exam skills covered

- Recommend a database service tier and compute tier

## Design tasks

### Part 1: purchasing model selection

1. Compare the DTU and vCore purchasing models for CloudTenant's workloads. Document the advantages and disadvantages of each model for their specific usage patterns.
2. Recommend which purchasing model to use for each customer tier (Standard, Premium, Enterprise) and justify your choice.
3. Determine whether the Standard tier databases would benefit from the DTU model's simplicity or the vCore model's flexibility in independently scaling compute and storage.

### Part 2: Service tier assignment

4. For the Standard tier (250 databases), recommend the appropriate service tier (General Purpose, Business Critical, or Hyperscale). Consider the 99.99% SLA requirement and cost constraints.
5. For the Premium tier (45 databases), evaluate whether Business Critical tier is required for sub-5ms latency and In-Memory OLTP support. Identify any alternative approaches.
6. For the Enterprise tier (5 databases exceeding 4TB), explain why Hyperscale is the appropriate tier and describe its architecture (multi-tiered caching, snapshot-based backups, named replicas).
7. Document the maximum database size, read replicas, and availability SLA for each service tier.

### Part 3: compute tier optimization

8. Evaluate serverless compute for the Standard tier databases. Calculate the potential savings given the usage pattern (active 9 hours weekdays, minimal usage otherwise). Consider auto-pause delay and cold-start latency implications.
9. Determine whether provisioned compute with reserved capacity (1-year or 3-year terms) would be more cost-effective than serverless for any of the workload tiers.
10. Design an auto-scaling strategy for the Enterprise tier using Hyperscale named replicas to handle unpredictable read workloads without over-provisioning the primary.
11. Calculate the projected monthly cost after optimization and verify it achieves the 30% reduction target.

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-15"
  items={[
    "Clearly articulated DTU vs vCore trade-offs with a recommendation for each workload tier",
    "Assigned appropriate service tiers (General Purpose, Business Critical, Hyperscale) with documented justification",
    "Evaluated serverless compute for off-hours cost savings with cold-start trade-off analysis",
    "Designed Hyperscale architecture for the Enterprise tier including named replicas",
    "Projected monthly cost demonstrates at least 30% reduction from current $18,000/month spend"
  ]}
/>

## Hints

<details>
<summary>Hint 1: DTU vs vCore Model</summary>

The DTU (Database Transaction Unit) model bundles compute, storage, and I/O into a single unit. It is simpler to understand but less flexible. The vCore model lets you independently choose compute (vCores, memory) and storage, and supports serverless compute. The vCore model also allows Azure Hybrid Benefit (using existing SQL Server licenses) for up to 55% savings. If the team already owns SQL Server licenses, vCore is almost always more cost-effective.

</details>

<details>
<summary>Hint 2: Service Tier Capabilities</summary>

General Purpose: Remote storage, 99.99% SLA, up to 128 vCores, max 4TB (single database) or 16TB (Managed Instance). Business Critical: Local SSD storage, sub-5ms latency, In-Memory OLTP, built-in read replica, 99.995% SLA with zone redundancy. Hyperscale: Distributed storage architecture, up to 100TB, near-instant backups regardless of size, up to 30 named replicas, rapid scale-up/down.

</details>

<details>
<summary>Hint 3: Serverless Compute</summary>

Serverless is available only in the vCore model under the General Purpose tier (and Hyperscale). It automatically scales compute based on workload demand and can auto-pause the database after a configurable period of inactivity (minimum 1 hour). When paused, you pay only for storage. Cold start (resuming from pause) takes approximately 1-2 minutes. Serverless is ideal for intermittent, unpredictable workloads. It is NOT suitable for workloads requiring constant low latency.

</details>

<details>
<summary>Hint 4: Hyperscale Named Replicas</summary>

Hyperscale named replicas are independent read-scale compute nodes with their own service-level objective. Unlike regular read replicas, they can be scaled independently of the primary and can serve as connection endpoints for specific workloads (like reporting or analytics). You can have up to 30 named replicas per primary database. Named replicas are also available in serverless compute tier.

</details>

<details>
<summary>Hint 5: Reserved Capacity</summary>

Azure SQL Database reserved capacity provides 30-65% discount compared to pay-as-you-go pricing for 1-year or 3-year commitments. Reservations apply to vCore compute costs only (not storage or I/O). For workloads with predictable baseline usage, combining reserved capacity for the baseline with serverless or provisioned auto-scale for peaks can optimize costs significantly.

</details>

## Learning resources

- [Azure SQL Database purchasing models](https://learn.microsoft.com/en-us/azure/azure-sql/database/purchasing-models)
- [Azure SQL Database service tiers](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tiers-general-purpose-business-critical)
- [Serverless compute tier for Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-overview)
- [Hyperscale service tier](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-hyperscale)
- [Hyperscale named replicas](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-hyperscale-replicas)
- [Azure SQL Database reserved capacity](https://learn.microsoft.com/en-us/azure/azure-sql/database/reserved-capacity-overview)
- [DTU-based resource limits](https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-dtu-single-databases)
- [vCore-based resource limits](https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-vcore-single-databases)

## Knowledge check

<details>
<summary>1. A database is heavily used during business hours but has near-zero activity at night and on weekends. The application can tolerate a 1-2 minute cold start delay for the first connection after inactivity. Which compute tier minimizes cost?</summary>

**Serverless compute tier (General Purpose, vCore model).** Serverless automatically pauses the database after a configurable inactivity period and resumes on the next connection. When paused, you pay only for storage. This is ideal for intermittent workloads where cold-start latency is acceptable.

</details>

<details>
<summary>2. Which service tier is required for In-Memory OLTP and sub-5ms read/write latency?</summary>

**Business Critical.** This tier uses local SSD storage (rather than remote Azure Premium Storage used by General Purpose) and provides In-Memory OLTP capabilities. The local storage architecture eliminates network latency for I/O operations, enabling consistent sub-5ms latency for both reads and writes. It also includes a built-in high-availability read replica at no extra cost.

</details>

<details>
<summary>3. A database has grown to 8TB and requires near-instant point-in-time restore regardless of database size. Which service tier should you recommend?</summary>

**Hyperscale.** It supports databases up to 100TB and uses a snapshot-based backup architecture that provides near-instant backups and restores regardless of database size. General Purpose is limited to 4TB per database, and Business Critical has similar size limitations. Hyperscale's distributed storage architecture (page servers + log service) enables this scalability.

</details>

<details>
<summary>4. An organization has existing SQL Server Enterprise licenses with Software Assurance. How can they reduce Azure SQL Database costs?</summary>

**Azure Hybrid Benefit.** With the vCore purchasing model, customers with active Software Assurance on SQL Server Enterprise or Standard licenses can exchange them for discounted rates on Azure SQL Database (up to 55% savings). This benefit applies to provisioned and serverless compute in the vCore model but is NOT available with the DTU model.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge15 --location eastus
```

2. Deploy an Azure SQL Server and an elastic pool:

```bash
az sql server create --name sql-cloudtenant-lab --resource-group rg-az305-challenge15 \
  --location eastus --admin-user sqladmin --admin-password "P@ssw0rd2025!"

az sql elastic-pool create --name pool-standard --resource-group rg-az305-challenge15 \
  --server sql-cloudtenant-lab --edition GeneralPurpose --capacity 2 --family Gen5
```

3. Create two databases inside the elastic pool:

```bash
az sql db create --name db-tenant-001 --resource-group rg-az305-challenge15 \
  --server sql-cloudtenant-lab --elastic-pool pool-standard

az sql db create --name db-tenant-002 --resource-group rg-az305-challenge15 \
  --server sql-cloudtenant-lab --elastic-pool pool-standard
```

4. Verify pool utilization and database placement:

```bash
az sql elastic-pool show --name pool-standard --resource-group rg-az305-challenge15 \
  --server sql-cloudtenant-lab --query "{sku:sku,perDbSettings:perDatabaseSettings}"

az sql db list --resource-group rg-az305-challenge15 --server sql-cloudtenant-lab \
  --query "[].{name:name,elasticPool:elasticPoolName}" --output table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
# Delete resource groups for each tier
az group delete --name rg-cloudtenant-standard --yes --no-wait
az group delete --name rg-cloudtenant-premium --yes --no-wait
az group delete --name rg-cloudtenant-enterprise --yes --no-wait

# Cancel any reserved capacity purchases (if testing in a lab, use a short-term reservation)
# Note: reserved capacity cancellations may incur early termination fees
```

---

**Next**: [Challenge 16: Design Database Scalability](/docs/az-305/data-storage/challenge-16)
