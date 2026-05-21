---
sidebar_position: 7
title: "Challenge 31: Design High Availability for Relational Data"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 31: design high availability for relational Data

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $15-30 | **Exam Weight: 15-20%**

:::

## Introduction

GlobalPay Corporation processes payroll for 100,000 employees across 15 countries spanning North America, Europe, and Asia-Pacific. Payroll runs are time-critical batch processes that must complete by midnight in each country's local time zone, with results available for bank transfers by 6:00 AM. If a payroll run fails or data is lost mid-processing, the re-run window is extremely tight, and missed payroll triggers immediate regulatory penalties in multiple jurisdictions.

The primary payroll database is an Azure SQL Database (Business Critical tier, 32 vCores) in East US, with read replicas in West Europe and Southeast Asia for regional reporting. The system processes payroll in rolling waves: Asia-Pacific runs first (starting at 15:00 UTC), Europe runs next (starting at 21:00 UTC), and North America last (starting at 05:00 UTC). During each run, the database handles intensive write operations (salary calculations, tax withholdings, deductions) followed by heavy reads (generating pay stubs, tax forms, bank files).

GlobalPay cannot afford ANY data loss during a failover. A mid-processing failover that loses even one transaction could mean incorrect tax calculations for thousands of employees, requiring expensive corrections and regulatory filings. The database must also be available 24/7 because the rolling payroll schedule means some region is always processing.

## Exam skills covered

- Recommend a high availability solution for relational data

## Design tasks

### Part 1: Azure SQL database HA architecture

1. Evaluate the HA capabilities built into each Azure SQL Database service tier:

| Feature | General Purpose | Business Critical | Hyperscale |
|---------|----------------|-------------------|------------|
| Zone redundancy | Optional (extra cost) | Included | Optional |
| Read replicas (in-region) | 0 | 1-3 (included) | 0-4 |
| Failover time | 30+ seconds | < 30 seconds | Varies |
| RPO (zone failure) | 0 (sync replication) | 0 (sync replication) | 0 |
| Named replicas | No | No | Yes |
| SLA (zone-redundant) | 99.99% | 99.995% | 99.99% |

2. Justify why Business Critical tier is required for GlobalPay's payroll workload:
   - Zero data loss requirement (synchronous replication to secondary replicas)
   - Sub-30-second failover (payroll batch cannot tolerate long reconnection delays)
   - Built-in read replicas (reporting queries offloaded from processing)
   - Local SSD storage (high IOPS for batch processing)

3. Document how the Business Critical tier achieves zero-RPO zone failure recovery internally (Always On Availability Group architecture with synchronous replicas).

### Part 2: failover Groups for Cross-Region HA

4. Design the failover group topology for GlobalPay's multi-region requirement:
   - Primary: East US (Business Critical, 32 vCores)
   - Secondary 1: West Europe (same tier, used for European reporting)
   - Secondary 2: Southeast Asia (same tier, used for APAC reporting)
   - Limitation: Failover groups support only ONE secondary. How do you handle three regions?

5. Evaluate the options for multi-region read access:

| Approach | Regions | Auto-failover | Read Access | Limitation |
|----------|---------|---------------|-------------|------------|
| Failover group (single secondary) | 2 | Yes | Secondary readable | Only 1 secondary |
| Active geo-replication | Up to 4 | Manual only | All secondaries readable | No auto-failover |
| Failover group + geo-replication | 3+ | Partial | Mixed | Complex topology |

6. Design the recommended topology:
   - Failover group between East US and West Europe (auto-failover for primary DR)
   - Active geo-replication from East US to Southeast Asia (read-only, manual failover)
   - Document the RPO and RTO for each secondary

### Part 3: failover behavior and Application impact

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

### Part 4: SQL managed instance Business Critical

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
    - BC tier with zone redundancy (3-replica Always On AG: primary + 2 secondary, distributed across availability zones)
    - Failover group to secondary region (entire instance fails over together)
    - Impact on failover: all databases move together (advantage for related payroll DBs)

12. Create a monitoring and alerting strategy:
    - Monitor replication lag to secondaries (typically under 5 seconds but varies with load)
    - Alert on failover events (automated notification to DBA team)
    - Monitor DTU/vCore utilization during payroll runs
    - Track successful connections to failover group endpoint

## Success criteria

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
# Create geo-replica in southeast asia (in addition to failover group secondary in west europe)
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

## Learning resources

- [High availability for Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/high-availability-sla-local-zone-redundancy)
- [Business Critical service tier - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-business-critical)
- [Failover groups overview - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-sql-db)
- [Active geo-replication - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/active-geo-replication-overview)
- [Business continuity overview - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/business-continuity-high-availability-disaster-recover-hadr-overview)
- [Azure SQL Managed Instance - High availability](https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/high-availability-sla-local-zone-redundancy)

## Knowledge check

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

## Validation lab

This lab proves that Azure SQL failover groups provide automatic DNS redirection during region failover, and that geo-replicated data survives a region switch without application connection string changes.

### Step 1: create resource groups and SQL servers in two regions

```bash
az group create --name rg-az305-challenge31 --location eastus
```

```bash
az group create --name rg-az305-challenge31-dr --location westeurope
```

```bash
SUFFIX=$RANDOM
PRIMARY_SERVER="sql-ch31-pri-$SUFFIX"
SECONDARY_SERVER="sql-ch31-sec-$SUFFIX"
FG_NAME="fg-ch31-$SUFFIX"
ADMIN_PASS="P@ss${SUFFIX}w0rd!"

echo "Primary server: $PRIMARY_SERVER"
echo "Secondary server: $SECONDARY_SERVER"
echo "Failover group: $FG_NAME"
```

```bash
az sql server create \
  --resource-group rg-az305-challenge31 \
  --name $PRIMARY_SERVER \
  --location eastus \
  --admin-user sqladmin \
  --admin-password "$ADMIN_PASS"
```

```bash
az sql server create \
  --resource-group rg-az305-challenge31-dr \
  --name $SECONDARY_SERVER \
  --location westeurope \
  --admin-user sqladmin \
  --admin-password "$ADMIN_PASS"
```

### Step 2: create a database on the primary server

Using General Purpose with 2 vCores to keep lab costs low. The failover behavior is identical regardless of tier.

```bash
az sql db create \
  --resource-group rg-az305-challenge31 \
  --server $PRIMARY_SERVER \
  --name payrolldb \
  --edition GeneralPurpose \
  --family Gen5 \
  --capacity 2
```

### Step 3: configure the failover group

```bash
az sql failover-group create \
  --resource-group rg-az305-challenge31 \
  --server $PRIMARY_SERVER \
  --partner-server $SECONDARY_SERVER \
  --partner-resource-group rg-az305-challenge31-dr \
  --name $FG_NAME \
  --failover-policy Automatic \
  --grace-period 1 \
  --add-db payrolldb
```

### Step 4: verify both servers and their roles

```bash
az sql failover-group show \
  --resource-group rg-az305-challenge31 \
  --server $PRIMARY_SERVER \
  --name $FG_NAME \
  --query "{Name:name, PrimaryRole:replicationRole, PartnerRole:partnerServers[0].replicationRole, PartnerServer:partnerServers[0].id}" \
  -o table
```

The primary should show "Primary" role and the partner should show "Secondary" role.

:::note[Architect Insight]
The failover group provides two stable DNS endpoints: `<fg-name>.database.windows.net` (read-write, always points to current primary) and `<fg-name>.secondary.database.windows.net` (read-only, always points to secondary). Applications connect to these endpoints instead of individual server names. During failover, DNS updates automatically -- no connection string changes in your application code.
:::

### Step 5: allow Azure services and insert test data

```bash
az sql server firewall-rule create \
  --resource-group rg-az305-challenge31 \
  --server $PRIMARY_SERVER \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

```bash
az sql server firewall-rule create \
  --resource-group rg-az305-challenge31-dr \
  --server $SECONDARY_SERVER \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

```bash
sqlcmd -S "$PRIMARY_SERVER.database.windows.net" -U sqladmin -P "$SQL_PASSWORD" -d payrolldb -Q "CREATE TABLE EmployeePayroll (Id INT PRIMARY KEY, Name NVARCHAR(100), Salary DECIMAL(10,2)); INSERT INTO EmployeePayroll VALUES (1, 'Alice', 85000.00), (2, 'Bob', 92000.00), (3, 'Carol', 78000.00);"
```

### Step 6: verify data replicated to secondary

Wait a few seconds for async geo-replication, then query the secondary:

```bash
echo "Waiting 10 seconds for geo-replication..."
sleep 10
```

```bash
sqlcmd -S "$SECONDARY_SERVER.database.windows.net" -U sqladmin -P "$SQL_PASSWORD" -d payrolldb -Q "SELECT * FROM EmployeePayroll;"
```

You should see all 3 rows replicated to the secondary region.

:::note[Architect Insight]
Cross-region geo-replication is asynchronous, meaning RPO is greater than zero (typically less than 5 seconds). This is a fundamental constraint -- synchronous replication across regions would add unacceptable latency. For the AZ-305 exam, understand that zone-redundant replication within a region is synchronous (RPO = 0), while cross-region replication is always asynchronous (RPO > 0). This distinction drives tier selection for zero-data-loss requirements.
:::

### Step 7: initiate manual failover to secondary region

```bash
echo "Initiating failover to West Europe..."
az sql failover-group set-primary \
  --resource-group rg-az305-challenge31-dr \
  --server $SECONDARY_SERVER \
  --name $FG_NAME
```

### Step 8: verify roles have swapped

```bash
az sql failover-group show \
  --resource-group rg-az305-challenge31-dr \
  --server $SECONDARY_SERVER \
  --name $FG_NAME \
  --query "{Name:name, Role:replicationRole, PartnerRole:partnerServers[0].replicationRole}" \
  -o table
```

The old secondary (West Europe) should now show "Primary" and the old primary (East US) should show "Secondary".

### Step 9: confirm the failover group listener DNS now points to new primary

```bash
echo "Failover group read-write endpoint:"
echo "${FG_NAME}.database.windows.net"
echo ""
echo "This DNS name now resolves to the West Europe server."
echo "Applications using this endpoint required ZERO connection string changes."
```

```bash
# Verify data on the new primary using sqlcmd
sqlcmd -S "$SECONDARY_SERVER.database.windows.net" -d payrolldb \
  -U $ADMIN_USER -P $ADMIN_PASSWORD \
  -Q "SELECT * FROM EmployeePayroll;"
```

All data is intact on the new primary.

### Step 10: fail back to original region

```bash
echo "Failing back to East US..."
az sql failover-group set-primary \
  --resource-group rg-az305-challenge31 \
  --server $PRIMARY_SERVER \
  --name $FG_NAME
```

```bash
az sql failover-group show \
  --resource-group rg-az305-challenge31 \
  --server $PRIMARY_SERVER \
  --name $FG_NAME \
  --query "{Name:name, Role:replicationRole, PartnerRole:partnerServers[0].replicationRole}" \
  -o table
```

Roles should be back to original: East US as Primary, West Europe as Secondary.

:::note[Architect Insight]
Failover groups support only one secondary server. If you need readable replicas in more than two regions, combine a failover group (for automatic failover to your DR region) with active geo-replication (for additional read-only replicas in other regions). Manual failover testing like this should be part of every DR drill -- it validates that your application handles the DNS redirection and that replication lag does not cause data inconsistency.
:::

:::tip[Design Validation]
This lab proved three critical properties of Azure SQL failover groups: (1) The failover group DNS endpoint abstracts region failover completely -- applications never change connection strings. (2) Manual failover verifies your DR readiness and completes in under a minute. (3) Geo-replication is asynchronous across regions, so RPO is always greater than zero for cross-region scenarios; plan for up to 5 seconds of potential data loss during unplanned failover.
:::

## Cleanup

```bash
az group delete --name rg-az305-challenge31 --yes --no-wait
az group delete --name rg-az305-challenge31-dr --yes --no-wait
```

---

**Next**: [Challenge 32: Design High Availability for Non-Relational Data](/docs/az-305/business-continuity/challenge-32)
