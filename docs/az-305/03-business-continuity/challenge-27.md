---
sidebar_position: 3
title: "Challenge 27: Design Backup & Recovery for Databases"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Challenge 27: Design Backup & Recovery for Databases

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $10-25 | **Exam Weight: 15-20%**

:::

## Introduction

Apex Trading International runs a high-frequency trading platform on Azure that processes 50,000 transactions per second during market hours. Their primary database is an Azure SQL Database (Business Critical tier, 80 vCores) that records every trade with microsecond timestamps. Regulatory compliance (SEC Rule 17a-4 and MiFID II) requires that every single transaction be recoverable to the exact second it occurred, with a 10-year mandatory retention period for all trading data. The trading database has an RPO of effectively zero - even 5 seconds of lost trades during market hours could mean millions in unreconciled positions.

In addition to the trading database, Apex operates an analytics data warehouse (Azure SQL Database, General Purpose tier, 32 vCores) that aggregates trading data for risk analysis and regulatory reporting. This database can tolerate up to 1 hour of data loss since it is rebuilt from the trading database nightly. However, it must be restorable within 4 hours for compliance reporting deadlines.

Apex also runs a Cosmos DB instance for real-time market data feeds and a PostgreSQL Flexible Server for their back-office operations. Each has different backup and recovery requirements that must be addressed in the overall database continuity strategy.

## Exam Skills Covered

- Recommend a backup and recovery solution for databases

## Design Tasks

### Part 1: Azure SQL Database Backup Strategy

1. Design the backup configuration for the trading database (near-zero RPO):
   - What is the default backup frequency for Azure SQL Database? (Full, differential, transaction log)
   - Can you customize the transaction log backup frequency? What is the minimum interval?
   - How does the Business Critical tier's architecture (Always On replicas) contribute to RPO?

2. Configure point-in-time restore (PITR) for both databases:
   - Trading DB: What retention period ensures fast recovery for operational issues?
   - Analytics DB: What is the minimum PITR retention that meets the 1-hour RPO requirement?
   - What is the maximum PITR retention available?

3. Design long-term retention (LTR) to meet the 10-year compliance requirement:
   - Configure weekly, monthly, and yearly backup retention
   - Calculate the storage cost for 10 years of weekly backups for an 80-vCore database
   - Determine if LTR backups are stored in the same region or can be geo-redundant

```bash
# Configure LTR policy for trading database
az sql db ltr-policy set \
  --resource-group rg-trading \
  --server sql-apex-trading \
  --database TradingDB \
  --weekly-retention P4W \
  --monthly-retention P12M \
  --yearly-retention P10Y \
  --week-of-year 1
```

### Part 2: Geo-Restore and Cross-Region Recovery

4. Evaluate the three recovery options for Azure SQL Database and map to each workload:

<DecisionMatrix
  title="Azure SQL Database Recovery Options"
  headers={["RPO", "RTO", "Cost Impact", "Automation", "Best For"]}
  rows={[
    {criteria: "Point-in-Time Restore (PITR)", values: ["5-10 minutes (transaction log backup interval)", "Minutes to hours depending on database size", "Included in service tier pricing (no extra cost)", "On-demand restore to a new database", "Operational recovery from accidental deletion or corruption within 1-35 days"]},
    {criteria: "Long-Term Retention (LTR)", values: ["Weekly, monthly, or yearly per policy schedule", "Hours (full database restore from backup copy)", "Storage cost for retained backups in RA-GRS blob storage", "Scheduled automatically via configured retention policy", "Regulatory compliance requiring multi-year data retention (up to 10 years)"]},
    {criteria: "Geo-Restore", values: ["Up to 1 hour (GRS replication lag)", "Up to 12 hours (restore from geo-replicated backup)", "Included with geo-redundant backup storage setting", "On-demand restore to any Azure region from geo-backup", "Budget-friendly DR for non-critical databases with relaxed RTO requirements"]},
    {criteria: "Active Geo-Replication", values: ["~5 seconds (asynchronous continuous replication)", "Seconds to minutes (manual failover promotion)", "Full secondary database cost (same tier and size)", "Manual failover; supports up to 4 readable secondaries in any region", "Multi-region read scale-out with flexible topology and manual DR control"]},
    {criteria: "Failover Groups", values: ["~5 seconds (asynchronous continuous replication)", "~30 seconds (automatic failover with stable DNS)", "Full secondary database cost (same tier and size)", "Automatic failover after grace period with stable read-write endpoint", "Mission-critical databases needing transparent automatic failover without app changes"]}
  ]}
  storageKey="az305-challenge-27"
/>

5. For the trading database, justify why failover groups are the only option that meets the near-zero RPO requirement. Configure an auto-failover group:

```bash
az sql failover-group create \
  --resource-group rg-trading \
  --server sql-apex-trading \
  --partner-server sql-apex-trading-dr \
  --name fg-apex-trading \
  --failover-policy Automatic \
  --grace-period 1
```

6. For the analytics database, determine whether geo-restore or a failover group is more cost-effective given the 1-hour RPO and 4-hour RTO requirements.

### Part 3: Cosmos DB Continuous Backup

7. Design the backup strategy for the Cosmos DB market data instance:
   - Compare periodic backup mode vs. continuous backup mode
   - For continuous backup, what are the two retention tiers (7-day vs. 30-day)?
   - Can you restore to a specific timestamp? What is the granularity?

8. Determine the appropriate Cosmos DB backup configuration:
   - Market data requires point-in-time restore to within 1 second (trades reference market prices by timestamp)
   - Data older than 30 days can be archived and does not need instant recovery
   - What consistency level impacts are there when restoring?

9. Document the self-service restore process for Cosmos DB continuous backup:
   - What is the restore target? (New account, same account, different region)
   - Can you restore a single container or must you restore the entire account?
   - What is the approximate restore time for a 100 GB database?

### Part 4: PostgreSQL and Cross-Database Recovery Orchestration

10. Design the backup approach for the PostgreSQL Flexible Server:
    - Configure automated backups with geo-redundant storage
    - Set appropriate retention (7-35 days for PITR)
    - Document geo-restore capabilities and limitations

11. Create a unified recovery runbook that sequences database recovery across all four database systems in priority order:
    - Which database must recover first? (Dependencies matter)
    - How do you handle the trading DB's references to Cosmos DB market data?
    - What validation queries confirm each database is recovered correctly?

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-27"
  items={[
    "Azure SQL PITR and LTR configured to meet both operational and 10-year compliance retention",
    "Failover group configured for trading database with automatic failover and grace period justified",
    "Geo-restore vs failover group cost-benefit analysis completed for analytics database",
    "Cosmos DB continuous backup configured with appropriate retention tier selected",
    "PostgreSQL backup configured with geo-redundant storage",
    "Recovery orchestration runbook documents sequencing and dependency order"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Azure SQL Backup Frequency</summary>

Azure SQL Database automated backups follow a fixed schedule:
- **Full backups**: Weekly
- **Differential backups**: Every 12-24 hours
- **Transaction log backups**: Every 5-10 minutes (approximately)

You cannot change these frequencies. The transaction log backup frequency means PITR has an RPO of approximately 5-10 minutes in the worst case. For near-zero RPO, you MUST use failover groups with synchronous replication (available in Business Critical tier), which replicates every committed transaction to secondary replicas.

PITR retention is configurable from 1-35 days (default: 7 days for DTU Basic, 35 days for vCore).

</details>

<details>
<summary>Hint 2: Long-Term Retention Storage Costs</summary>

LTR backups are stored as full database backups in RA-GRS blob storage. Cost estimate:
- Storage rate: approximately $0.05/GB/month for RA-GRS
- An 80-vCore Business Critical database might be 500 GB - 2 TB in size
- 10 years of weekly backups = 520 backup copies (but older ones can use yearly retention only)

Optimized retention strategy:
- Weekly: 4 weeks (W=P4W) - 4 copies
- Monthly: 12 months (M=P12M) - 12 copies
- Yearly: 10 years (Y=P10Y) - 10 copies
Total unique copies: ~26 (not 520) with this tiered approach

Estimated cost for 1 TB database with 26 copies: 26 TB x $0.05/GB x 1024 = ~$1,330/month

</details>

<details>
<summary>Hint 3: Failover Groups vs Active Geo-Replication</summary>

Both provide geo-replication but with key differences:
- **Failover groups**: Automatic failover with grace period, readable secondary, single connection endpoint that follows the primary. Best for applications needing transparent failover.
- **Active geo-replication**: Manual failover, up to 4 secondaries in any region, more granular control. Best when you need read-replicas or complex topologies.

For the trading database with near-zero RPO:
- Use **failover groups** with grace period of 1 hour (minimum)
- The grace period defines how long to wait before automatic failover after detecting primary failure
- During synchronous replication in Business Critical tier, RPO is effectively 0 for zone-local failures; for cross-region, RPO is ~5 seconds due to async replication.

</details>

<details>
<summary>Hint 4: Cosmos DB Continuous Backup Details</summary>

Cosmos DB continuous backup mode:
- **Tier 1 (7-day retention)**: Included at no extra cost. Restore to any point in last 7 days.
- **Tier 2 (30-day retention)**: Additional cost per GB/month. Restore to any point in last 30 days.
- **Restore granularity**: 1 second (you can specify exact timestamp)
- **Restore target**: Always a NEW account (cannot restore in-place)
- **Restore scope**: Entire account, single database, or single container
- **Approximate restore time**: 1-2 hours for 100 GB (varies by data distribution)

Important: Continuous backup mode cannot be changed back to periodic once enabled. It supports all consistency levels, and the restored account inherits the original consistency configuration.

</details>

## Learning Resources

- [Automated backups in Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/automated-backups-overview)
- [Long-term retention - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/long-term-retention-overview)
- [Failover groups overview - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-sql-db)
- [Continuous backup with point-in-time restore in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/continuous-backup-restore-introduction)
- [Backup and restore in Azure Database for PostgreSQL - Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-backup-restore)
- [Geo-restore - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/recovery-using-backups#geo-restore)

## Knowledge Check

<details>
<summary>1. A financial application requires zero data loss (RPO = 0) during a zone failure but can tolerate 5 seconds of data loss during a full region failure. Which Azure SQL configuration achieves this?</summary>

**Azure SQL Database Business Critical tier with zone redundancy and a failover group to a secondary region.** Business Critical tier uses Always On Availability Groups internally with synchronous replication across availability zones, providing RPO = 0 for zone failures. The failover group to a secondary region uses asynchronous replication (synchronous is not possible across regions due to latency), providing RPO of approximately 5 seconds for region-level failures. This configuration precisely matches the requirement.

</details>

<details>
<summary>2. Why can't you use PITR (point-in-time restore) alone to achieve near-zero RPO for a critical trading database?</summary>

**PITR is based on transaction log backups that occur every 5-10 minutes.** If the primary database fails between log backups, any transactions committed after the last log backup are lost. For a trading platform processing 50,000 transactions per second, a 5-minute gap could mean up to 15 million lost transactions. PITR is designed for operational recovery (accidental deletions, corruption) not for zero-RPO disaster recovery. For near-zero RPO, you need continuous replication via failover groups or active geo-replication.

</details>

<details>
<summary>3. A company needs 10-year retention for compliance but only needs to query this data during annual audits. What is the most cost-effective Azure SQL retention strategy?</summary>

**Use Long-Term Retention (LTR) with yearly backup retention set to 10 years (Y=P10Y).** LTR stores full database backups in RA-GRS storage at a fraction of the cost of keeping PITR data active. Since audits are annual, configure yearly retention (keeping one backup per year) rather than weekly retention (which would store 520 copies over 10 years). This reduces storage from hundreds of copies to just 10 yearly snapshots. Combine with monthly retention for the current year if more granular recovery might be needed for recent data.

</details>

<details>
<summary>4. When restoring a Cosmos DB account from continuous backup, what is a critical limitation that impacts recovery planning?</summary>

**Cosmos DB continuous backup always restores to a NEW account - you cannot restore in-place to the same account.** This means your application connection strings must be updated post-restore, or you must use DNS-level redirection. Additionally, restore time scales with data size (approximately 1-2 hours for 100 GB), which impacts your RTO calculations. The restored account inherits the original consistency level and region configuration but must be manually configured for any additional settings (networking, RBAC) applied after creation.

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge27 --location eastus
```

2. Deploy an Azure SQL Server and database:

```bash
SUFFIX=$RANDOM

az sql server create \
  --resource-group rg-az305-challenge27 \
  --name sql-challenge27-$SUFFIX \
  --location eastus \
  --admin-user sqladmin \
  --admin-password "P@ss$(date +%s | tail -c 6)w0rd!"

SQL_SERVER=$(az sql server list --resource-group rg-az305-challenge27 --query "[0].name" -o tsv)

az sql db create \
  --resource-group rg-az305-challenge27 \
  --server $SQL_SERVER \
  --name tradingdb \
  --edition GeneralPurpose \
  --compute-model Serverless \
  --family Gen5 \
  --capacity 1
```

3. Configure long-term retention policy on the database:

```bash
az sql db ltr-policy set \
  --resource-group rg-az305-challenge27 \
  --server $SQL_SERVER \
  --database tradingdb \
  --weekly-retention P4W \
  --monthly-retention P12M \
  --yearly-retention P1Y \
  --week-of-year 1
```

4. Verify the LTR policy is applied:

```bash
az sql db ltr-policy show \
  --resource-group rg-az305-challenge27 \
  --server $SQL_SERVER \
  --database tradingdb \
  --query "{Weekly:weeklyRetention, Monthly:monthlyRetention, Yearly:yearlyRetention}" -o table
```

5. Confirm the database is operational and check backup settings:

```bash
az sql db show \
  --resource-group rg-az305-challenge27 \
  --server $SQL_SERVER \
  --name tradingdb \
  --query "{Name:name, Status:status, Edition:edition}" -o table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
# Delete trading database resources
az group delete --name rg-az305-challenge27 --yes --no-wait
az group delete --name rg-trading --yes --no-wait
az group delete --name rg-trading-dr --yes --no-wait

# Delete Cosmos DB test resources
az group delete --name rg-cosmosdb-trading --yes --no-wait

# Delete PostgreSQL resources
az group delete --name rg-postgresql-backoffice --yes --no-wait
```

---

**Next**: [Challenge 28: Design Backup & Recovery for Unstructured Data](/docs/az-305/business-continuity/challenge-28)
