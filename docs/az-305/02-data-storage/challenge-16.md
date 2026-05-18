---
sidebar_position: 3
title: "Challenge 16: Design Database Scalability"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 16: Design Database Scalability

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $8-20 | **Exam Weight: 20-25%**

:::

## Introduction

GlobalNews Network (GNN) is an international news platform with 10 million daily active readers and only 100 content editors. The editorial team is based exclusively in the US East region and writes articles, uploads media metadata, and manages content scheduling. Readers are distributed globally: 40% in North America, 30% in Europe, 20% in Asia-Pacific, and 10% in other regions. The platform experiences dramatic traffic spikes during breaking news events, where read traffic can surge to 10x normal within minutes and sustain that level for hours.

The current architecture uses a single Azure SQL Database (Business Critical, 8 vCores) in US East. During normal operations, the database handles approximately 50,000 read queries per second and 500 write operations per second. During breaking news spikes, read queries jump to 500,000 per second while writes remain stable at 500/second. The current single database cannot handle these spikes, resulting in timeout errors and degraded user experience during the most critical moments.

GNN's requirements are: (1) Writers must always have consistent, low-latency access to the database in US East; (2) Readers worldwide should experience sub-100ms query latency for article retrieval; (3) The system must handle 10x read traffic spikes without manual intervention; (4) Data consistency between regions can tolerate up to 5 seconds of replication lag for read queries; (5) The solution must be cost-effective, scaling down when traffic normalizes.

## Exam Skills Covered

- Recommend a solution for database scalability

## Design Tasks

### Part 1: Read Scale-Out Architecture

1. Design a read scale-out strategy that separates the read and write workloads. Determine how to route content editors to the primary (read-write) instance and readers to read-only replicas.
2. Evaluate the following options for providing read replicas and recommend the best combination for GNN's requirements:
   - Built-in read replicas (Business Critical tier)
   - Active geo-replication
   - Hyperscale named replicas
   - Auto-failover groups with read-intent routing
3. Determine the optimal number and placement of read replicas to serve readers in North America, Europe, and Asia-Pacific with sub-100ms latency.
4. Design the connection string strategy for applications to route read traffic to replicas (ApplicationIntent=ReadOnly, or direct connection to geo-replicas).

### Part 2: Handling Traffic Spikes

5. Design an auto-scaling approach for read replicas during breaking news events. Consider Hyperscale named replicas that can be independently scaled and created on-demand.
6. Evaluate whether elastic pools could help manage a fleet of read-replica databases during spike periods.
7. Design a caching layer (Azure Cache for Redis or application-level caching) to reduce database load during spikes. Determine which queries benefit most from caching and appropriate TTL values.
8. Calculate the required read replica capacity during a 10x spike (500,000 queries/second) and design a scaling plan that achieves this without over-provisioning during normal periods.

### Part 3: Write Scalability and Data Distribution

9. Evaluate whether the write workload (500 operations/second) requires scaling beyond a single primary. Discuss scenarios where sharding or write partitioning might be necessary in the future.
10. Design a geo-replication topology that provides both disaster recovery and read scale-out. Determine the appropriate replication mode (synchronous vs asynchronous) and acceptable replication lag.
11. Propose a monitoring and alerting strategy to detect when read replicas fall behind the primary and when traffic approaches capacity limits. Identify key metrics to track (replication lag, DTU/vCore utilization, connection count).

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-16"
  items={[
    "Designed read/write separation with clear routing strategy for editors vs readers",
    "Selected appropriate replica technology with justification (geo-replication, named replicas, or both)",
    "Placed read replicas in regions matching reader distribution for sub-100ms latency",
    "Designed auto-scaling strategy for 10x traffic spikes without manual intervention",
    "Included caching layer to reduce direct database load during spikes",
    "Documented monitoring strategy with key metrics and alerting thresholds"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Read Replica Options</summary>

Azure SQL Database offers multiple read-replica mechanisms: (1) Business Critical tier includes one free built-in read replica (same region); (2) Active geo-replication supports up to 4 readable secondaries in any region; (3) Hyperscale tier supports up to 30 named replicas with independent compute scaling; (4) Auto-failover groups provide a single read-write and read-only listener endpoint with automatic failover. For GNN's global readers, geo-replication or Hyperscale named replicas in multiple regions are needed.

</details>

<details>
<summary>Hint 2: Hyperscale for Elastic Read Scale</summary>

Hyperscale named replicas are ideal for scenarios requiring elastic read scale-out. Unlike regular geo-replicas, named replicas can be: (1) scaled independently (different vCore count than primary), (2) created and deleted dynamically (for burst scenarios), (3) targeted directly via their own connection endpoint, (4) placed in the same region as the primary. For spike handling, you could create additional named replicas on demand and route overflow traffic to them.

</details>

<details>
<summary>Hint 3: Connection Routing</summary>

For read-intent routing, applications connect with `ApplicationIntent=ReadOnly` in the connection string to be routed to a read replica. With auto-failover groups, you get two listener endpoints: `<fog-name>.database.windows.net` (read-write) and `<fog-name>.secondary.database.windows.net` (read-only). For geo-replicas without failover groups, connect directly to each replica's endpoint.

</details>

<details>
<summary>Hint 4: Caching Strategy</summary>

Azure Cache for Redis can offload repetitive read queries from the database. For a news platform, consider caching: article content (TTL: 60 seconds), article lists/feeds (TTL: 30 seconds), trending/popular articles (TTL: 15 seconds). During breaking news, short TTLs ensure freshness while dramatically reducing database load. A well-designed cache can absorb 80-90% of read traffic during spikes.

</details>

<details>
<summary>Hint 5: Geo-Replication Lag</summary>

Active geo-replication in Azure SQL Database uses asynchronous replication. Typical replication lag is under 5 seconds but can increase during high write throughput or large transactions. You can monitor lag using the `sys.dm_geo_replication_link_status` DMV, which reports `replication_lag_sec`. For GNN's 5-second tolerance, async geo-replication is appropriate. Synchronous commit is only available within the same region (Business Critical zone-redundant HA).

</details>

## Learning Resources

- [Read scale-out in Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/read-scale-out)
- [Active geo-replication](https://learn.microsoft.com/en-us/azure/azure-sql/database/active-geo-replication-overview)
- [Hyperscale named replicas](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-hyperscale-replicas)
- [Auto-failover groups overview](https://learn.microsoft.com/en-us/azure/azure-sql/database/auto-failover-group-overview)
- [Azure Cache for Redis overview](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview)
- [Elastic pools for Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-pool-overview)

## Knowledge Check

<details>
<summary>1. A global application needs read replicas in 3 regions with the ability to independently scale each replica's compute. Which Azure SQL Database feature should you use?</summary>

**Hyperscale named replicas or active geo-replication.** For independent compute scaling, Hyperscale named replicas are ideal (up to 30 replicas, each with independent vCore allocation). Active geo-replication also supports readable secondaries in up to 4 regions but with less granular scaling control. If independent scaling per replica is the priority, Hyperscale named replicas are the best choice.

</details>

<details>
<summary>2. How does ApplicationIntent=ReadOnly work in an Azure SQL Database connection string?</summary>

**It routes the connection to a read-only replica instead of the primary.** When a Business Critical or Hyperscale database has read replicas enabled, connections with `ApplicationIntent=ReadOnly` are automatically directed to a read-only replica. This offloads reporting and analytics queries from the primary without requiring separate connection endpoints. The replica serves read-committed snapshot data with minimal lag.

</details>

<details>
<summary>3. During a sudden 10x traffic spike, what is the fastest way to add read capacity to an Azure SQL Hyperscale database?</summary>

**Create additional Hyperscale named replicas.** Named replicas can be provisioned in minutes and immediately serve read traffic from the shared Hyperscale storage layer (page servers). They do not require a full data copy because they use the same underlying page server infrastructure. They can also be deleted after the spike subsides to reduce costs.

</details>

<details>
<summary>4. What is the typical replication lag for active geo-replication in Azure SQL Database?</summary>

**Less than 5 seconds under normal conditions.** Active geo-replication uses asynchronous replication to secondary databases. While typical lag is under 5 seconds, it can increase during periods of high transaction throughput, long-running transactions, or when the secondary is under heavy read load. Monitor lag with `sys.dm_geo_replication_link_status`. Synchronous replication is only available within the same region for high-availability (zone-redundant Business Critical).

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge16 --location eastus
```

2. Deploy an Azure SQL Database:

```bash
az sql server create --name sql-gnn-lab --resource-group rg-az305-challenge16 \
  --location eastus --admin-user sqladmin --admin-password "P@ssw0rd2025!"

az sql db create --name db-gnn-articles --resource-group rg-az305-challenge16 \
  --server sql-gnn-lab --edition GeneralPurpose --compute-model Serverless \
  --family Gen5 --capacity 2
```

3. Deploy an Azure Cache for Redis instance:

```bash
az redis create --name redis-gnn-lab --resource-group rg-az305-challenge16 \
  --location eastus --sku Basic --vm-size c0
```

4. Verify connectivity between the resources:

```bash
az sql db show --name db-gnn-articles --resource-group rg-az305-challenge16 \
  --server sql-gnn-lab --query "{status:status,location:location}" --output table

az redis show --name redis-gnn-lab --resource-group rg-az305-challenge16 \
  --query "{hostName:hostName,port:port,provisioningState:provisioningState}" --output table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
# Delete the resource group containing all GNN database resources
az group delete --name rg-gnn-databases --yes --no-wait

# Delete the Redis cache resource group (if created separately)
az group delete --name rg-gnn-cache --yes --no-wait
```

---

**Next**: [Challenge 17: Design Database Protection](/docs/az-305/data-storage/challenge-17)
