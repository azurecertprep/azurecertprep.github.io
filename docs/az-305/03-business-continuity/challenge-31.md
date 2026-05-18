---
sidebar_position: 7
title: "Challenge 31: Design High Availability for Relational Data"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 31: Design High Availability for Relational Data

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $15-30 | **Exam Weight: 15-20%**

:::

## Introduction

GlobalPay Corporation processes payroll for 100,000 employees across 15 countries spanning North America, Europe, and Asia-Pacific. Payroll runs are time-critical batch processes that must complete by midnight in each country's local time zone, with results available for bank transfers by 6:00 AM. If a payroll run fails or data is lost mid-processing, the re-run window is extremely tight, and missed payroll triggers immediate regulatory penalties in multiple jurisdictions.

The primary payroll database is an Azure SQL Database (Business Critical tier, 32 vCores) in East US, with read replicas in West Europe and Southeast Asia for regional reporting. The system processes payroll in rolling waves: Asia-Pacific runs first (starting at 15:00 UTC), Europe runs next (starting at 21:00 UTC), and North America last (starting at 05:00 UTC). During each run, the database handles intensive write operations (salary calculations, tax withholdings, deductions) followed by heavy reads (generating pay stubs, tax forms, bank files).

GlobalPay cannot afford ANY data loss during a failover. A mid-processing failover that loses even one transaction could mean incorrect tax calculations for thousands of employees, requiring expensive corrections and regulatory filings. The database must also be available 24/7 because the rolling payroll schedule means some region is always processing.

## Exam Skills Covered

- Recommend a high availability solution for relational data

## Design Tasks

### Part 1: Azure SQL Database HA Architecture

1. Evaluate the HA capabilities built into each Azure SQL Database service tier:

| Feature | General Purpose | Business Critical | Hyperscale |
|---------|----------------|-------------------|------------|
| Zone redundancy | Optional (extra cost) | Included | Optional |
| Read replicas (in-region) | 0 | 1-3 (included) | 0-4 |
| Failover time | 30+ seconds | < 30 seconds | Varies |
| RPO (zone failure) | 0 (sync replication) | 0 (sync replication) | 0 |
| Named replicas | No | No | Yes |
| SLA (zone-redundant) | 99.995% | 99.995% | 99.99% |

2. Justify why Business Critical tier is required for GlobalPay's payroll workload:
   - Zero data loss requirement (synchronous replication to secondary replicas)
   - Sub-30-second failover (payroll batch cannot tolerate long reconnection delays)
   - Built-in read replicas (reporting queries offloaded from processing)
   - Local SSD storage (high IOPS for batch processing)

3. Document how the Business Critical tier achieves zero-RPO zone failure recovery internally (Always On Availability Group architecture with synchronous replicas).

### Part 2: Failover Groups for Cross-Region HA

4. Design the failover group topology for GlobalPay's multi-region requirement:
   - Primary: East US (Business Critical, 32 vCores)
   - Secondary 1: West Europe (same tier, used for European reporting)
   - Secondary 2: Southeast Asia (same tier, used for APAC reporting)
   - Limitation: Failover groups support only ONE secondary. How do you handle three regions?

5. Evaluate the options for multi-region read access:

| Approach | Regions | Auto-failover | Read Access | Limitation |
|----------|---------|---------------|-------------|------------|
| Failover group (single secondary) | 2 | Yes | Secondary readable | Only 1 secondary |
| Active geo-replication | Up to 5 | Manual only | All secondaries readable | No auto-failover |
| Failover group + geo-replication | 3+ | Partial | Mixed | Complex topology |

6. Design the recommended topology:
   - Failover group between East US and West Europe (auto-failover for primary DR)
   - Active geo-replication from East US to Southeast Asia (read-only, manual failover)
   - Document the RPO and RTO for each secondary

### Part 3: Failover Behavior and Application Impact

7. Analyze what happens during an automatic failover event:
   - How does the application connection string change? (It doesn't - failover group endpoint is stable)
   - What happens to in-flight transactions? (Rolled back on old primary)
   - How long is the database unavailable during failover?
   - What is the grace period, and what are the trade-offs of setting it shorter vs. longer?

8. Design the application-level retry logic for failover scenarios:
   - Transient error codes to retry: 40613, 40197, 40501, 49918
   - Retry strategy: Exponential backoff with max 5 retries
   - Circuit breaker: Stop retrying after 60 seconds and alert operations
   - Connection string must use failover group endpoint, not individual server name

9. Address the "split-brain" risk scenario:
   - What happens if the primary becomes isolated (cannot reach secondary) but is still accepting writes?
   - How does the grace period prevent premature failover?
   - What is the maximum data loss exposure during the grace period?

### Part 4: SQL Managed Instance Business Critical

10. GlobalPay is considering migrating to Azure SQL Managed Instance for features like cross-database queries and SQL Agent. Compare HA capabilities:

| Feature | SQL Database BC | SQL MI BC |
|---------|----------------|-----------|
| Zone redundancy | Yes | Yes |
| Failover groups | Yes | Yes (instance-level) |
| Cross-database queries | No | Yes |
| SQL Agent | No | Yes |
| Failover unit | Single database | Entire instance |
| Failover group scope | Selected databases | All databases on instance |

11. Design the HA architecture if GlobalPay uses SQL Managed Instance:
    - BC tier with zone redundancy (4-node Always On AG)
    - Failover group to secondary region (entire instance fails over together)
    - Impact on failover: all databases move together (advantage for related payroll DBs)

12. Create a monitoring and alerting strategy:
    - Monitor replication lag to secondaries (should be < 5 seconds)
    - Alert on failover events (automated notification to DBA team)
    - Monitor DTU/vCore utilization during payroll runs
    - Track successful connections to failover group endpoint

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-31"
  items={[
    "Business Critical tier selected with justification for zero-RPO and sub-30s failover",
    "Failover group configured with appropriate grace period for automatic failover",
    "Multi-region read access topology designed (failover group + active geo-replication)",
    "Application retry logic designed for transient failover errors",
    "Split-brain scenario analyzed with grace period trade-offs documented",
    "Monitoring and alerting configured for replication lag and failover events"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Business Critical Internal Architecture</summary>

Azure SQL Database Business Critical tier uses an architecture based on Always On Availability Groups:
- 1 primary replica + 3 secondary replicas (all synchronous)
- Data is stored on local SSD (not remote storage like General Purpose)
- Every transaction is committed to all replicas before acknowledging to the client
- Failover promotes one secondary to primary in < 30 seconds
- One secondary is available as read-only endpoint (no extra cost)

Zone-redundant configuration:
- Replicas are spread across availability zones
- Survives full zone failure with zero data loss
- SLA increases from 99.99% to 99.995%

This architecture guarantees RPO = 0 for any zone failure because all replicas have committed the transaction before it's acknowledged.

</details>

<details>
<summary>Hint 2: Failover Group Grace Period</summary>

The grace period (GracePeriodWithDataLossHours) controls how long automatic failover waits after detecting primary unavailability:
- **Minimum**: 1 hour
- **Recommended**: 1 hour for most workloads
- **Trade-off**: Shorter grace period = faster failover but higher risk of false positives

During the grace period:
- Primary is unreachable (confirmed by Azure monitoring)
- No writes are possible (database is effectively read-only via secondary)
- After grace period expires: automatic failover triggers, promoting secondary to primary
- Any transactions committed to old primary but not yet replicated to secondary are LOST

For GlobalPay: Set grace period to 1 hour. During this time, payroll processing halts, but no data is lost. If the primary recovers within 1 hour, no failover occurs. The 1-hour pause is acceptable given the payroll processing window is 6+ hours.

</details>

<details>
<summary>Hint 3: Failover Group Connection Strings</summary>

Failover group provides stable endpoints that automatically redirect:
- **Read-write**: `<failover-group-name>.database.windows.net` (always points to current primary)
- **Read-only**: `<failover-group-name>.secondary.database.windows.net` (always points to secondary)

Application benefits:
- No connection string changes needed during failover
- DNS TTL for failover group endpoints is 30 seconds
- After failover, new connections route to new primary within ~30 seconds
- Existing connections are dropped and must reconnect (retry logic handles this)

```bash
# Create failover group
az sql failover-group create \
  --resource-group rg-globalpay \
  --server sql-globalpay-eastus \
  --partner-server sql-globalpay-westeurope \
  --name fg-globalpay \
  --failover-policy Automatic \
  --grace-period 1 \
  --add-db PayrollDB
```

</details>

<details>
<summary>Hint 4: Active Geo-Replication for Multi-Region Reads</summary>

Since failover groups support only one secondary, use active geo-replication for additional read replicas:

```bash
# Create geo-replica in Southeast Asia (in addition to failover group secondary in West Europe)
az sql db replica create \
  --resource-group rg-globalpay \
  --server sql-globalpay-eastus \
  --name PayrollDB \
  --partner-server sql-globalpay-southeastasia \
  --partner-resource-group rg-globalpay-apac
```

Key differences from failover groups:
- No automatic failover (must manually promote)
- No stable DNS endpoint (must handle in application)
- Can have up to 4 geo-replicas (vs 1 failover group secondary)
- Useful for read-offload in additional regions

For GlobalPay: APAC region uses geo-replica for reporting reads, with manual failover procedure documented as a runbook (not expected to be primary DR target).

</details>

## Learning Resources

- [High availability for Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/high-availability-sla-local-zone-redundancy)
- [Business Critical service tier - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-business-critical)
- [Failover groups overview - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-sql-db)
- [Active geo-replication - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/active-geo-replication-overview)
- [Business continuity overview - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/business-continuity-high-availability-disaster-recover-hadr-overview)
- [Azure SQL Managed Instance - High availability](https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/high-availability-sla-local-zone-redundancy)

## Knowledge Check

<details>
<summary>1. GlobalPay requires zero data loss during failover. Which Azure SQL tier and feature combination guarantees RPO = 0 for zone failures?</summary>

**Business Critical tier with zone redundancy enabled.** Business Critical uses synchronous replication to 3 secondary replicas (Always On AG). With zone redundancy, these replicas are distributed across availability zones. Every transaction must be committed to ALL replicas before the client receives acknowledgment, guaranteeing zero data loss for any single-zone failure. General Purpose tier also supports zone redundancy but stores data on remote storage with different HA characteristics. For cross-region failover, RPO is approximately 5 seconds (asynchronous) because synchronous replication across regions is not possible due to latency.

</details>

<details>
<summary>2. Why can't you use a failover group to provide automatic failover to both West Europe AND Southeast Asia simultaneously?</summary>

**Failover groups support exactly one secondary server.** A failover group establishes a 1:1 relationship between a primary server and a partner server, with automatic failover, stable DNS endpoints, and coordinated database movement. For additional regions, you must use active geo-replication, which provides readable secondaries but requires manual failover (no automatic promotion, no stable DNS endpoint). The recommended pattern is: failover group to your primary DR region (automatic failover) + active geo-replication to additional regions (manual failover, read-offload only).

</details>

<details>
<summary>3. During a failover group automatic failover, what happens to a payroll batch process that has an in-flight transaction inserting 10,000 salary records?</summary>

**The in-flight transaction is rolled back on the old primary, and the application must detect the disconnect and retry.** When failover occurs, the old primary becomes read-only (or unavailable), and any uncommitted transactions are rolled back. The new primary has all previously committed transactions (those replicated before failure). The application receives a connection error (SQL error 40613 or similar transient error), and retry logic must: reconnect to the failover group endpoint (which now resolves to the new primary), detect which records were already committed, and resume the batch from the last committed point. This requires idempotent batch design with checkpointing.

</details>

<details>
<summary>4. A company sets the failover group grace period to 0 (if possible) for fastest automatic failover. Why does Azure enforce a minimum of 1 hour?</summary>

**The 1-hour minimum prevents data loss from premature failover during transient network issues.** If the grace period were 0, a brief network partition between the primary and secondary would trigger immediate failover to the secondary, which may not have received the most recent transactions (replication lag of up to 5 seconds). The 1-hour grace period ensures that transient outages (network blips, brief maintenance) resolve themselves without triggering failover. Only sustained outages (> 1 hour) trigger automatic failover, at which point the risk of data loss (up to 5 seconds of transactions) is accepted as the cost of restoring availability.

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create resource groups for primary and secondary regions:

```bash
az group create --name rg-az305-challenge31 --location eastus
az group create --name rg-az305-challenge31-dr --location westus
```

2. Deploy SQL Servers in both regions:

```bash
SUFFIX=$RANDOM

az sql server create \
  --resource-group rg-az305-challenge31 \
  --name sql-challenge31-pri-$SUFFIX \
  --location eastus \
  --admin-user sqladmin \
  --admin-password "P@ss${SUFFIX}w0rd!"

az sql server create \
  --resource-group rg-az305-challenge31-dr \
  --name sql-challenge31-sec-$SUFFIX \
  --location westus \
  --admin-user sqladmin \
  --admin-password "P@ss${SUFFIX}w0rd!"
```

3. Create a database on the primary server:

```bash
PRIMARY_SERVER="sql-challenge31-pri-$SUFFIX"
SECONDARY_SERVER="sql-challenge31-sec-$SUFFIX"

az sql db create \
  --resource-group rg-az305-challenge31 \
  --server $PRIMARY_SERVER \
  --name payrolldb \
  --edition GeneralPurpose \
  --compute-model Serverless \
  --family Gen5 \
  --capacity 1
```

4. Create a failover group linking both servers:

```bash
az sql failover-group create \
  --resource-group rg-az305-challenge31 \
  --server $PRIMARY_SERVER \
  --partner-server $SECONDARY_SERVER \
  --partner-resource-group rg-az305-challenge31-dr \
  --name fg-challenge31-$SUFFIX \
  --failover-policy Automatic \
  --grace-period 1 \
  --add-db payrolldb
```

5. Verify the failover group status and replication:

```bash
az sql failover-group show \
  --resource-group rg-az305-challenge31 \
  --server $PRIMARY_SERVER \
  --name fg-challenge31-$SUFFIX \
  --query "{Name:name, Role:replicationRole, Partner:partnerServers[0].replicationRole}" -o table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
# Delete resources in reverse dependency order
az group delete --name rg-az305-challenge31 --yes --no-wait
az group delete --name rg-az305-challenge31-dr --yes --no-wait
az sql failover-group delete \
  --resource-group rg-globalpay \
  --server sql-globalpay-eastus \
  --name fg-globalpay

az group delete --name rg-globalpay --yes --no-wait
az group delete --name rg-globalpay-europe --yes --no-wait
az group delete --name rg-globalpay-apac --yes --no-wait
```

---

**Next**: [Challenge 32: Design High Availability for Non-Relational Data](/docs/az-305/business-continuity/challenge-32)
