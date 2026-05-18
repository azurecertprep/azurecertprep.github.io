---
sidebar_position: 13
title: "Challenge 46: Design Database Migration"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 46: Design Database Migration

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $5-15 | **Exam Weight: 30-35%**

:::

## Introduction

GlobalRetail Corp operates an enterprise data estate of 30 databases supporting their e-commerce platform, supply chain management, and financial reporting systems. The database inventory includes: 15 SQL Server instances (versions 2012 through 2022, ranging from 50GB to 2TB), 8 PostgreSQL databases (versions 11-15, supporting their product catalog and search services), 5 MySQL databases (supporting legacy CMS and marketing platforms), and 2 Oracle databases (supporting their ERP and warehouse management systems).

The migration requirements vary significantly across databases: the e-commerce database (SQL Server 2022, 2TB) serves 50,000 transactions per hour and cannot tolerate more than 5 minutes of downtime. The financial reporting database requires a full parallel-run period for audit compliance. The legacy CMS databases on MySQL are candidates for modernization. The Oracle ERP database has complex stored procedures with Oracle-specific syntax that complicates migration.

The DBA team needs a comprehensive migration strategy that addresses compatibility assessment, target service selection (Azure SQL Database vs. Managed Instance vs. SQL on VM, and equivalent decisions for PostgreSQL and MySQL), migration method (online vs. offline), and post-migration validation for each database.

## Exam Skills Covered

- Recommend a solution for migrating databases

## Design Tasks

### Part 1: Compatibility Assessment

1. Design the assessment approach for each database engine:
   - SQL Server: Use Azure SQL Migration assessment (Data Migration Assistant or Azure Migrate) to identify compatibility issues, blocking features, and recommended target (Azure SQL DB, SQL MI, or SQL on VM)
   - PostgreSQL: Evaluate compatibility with Azure Database for PostgreSQL Flexible Server, identify unsupported extensions or features
   - MySQL: Assess compatibility with Azure Database for MySQL Flexible Server
   - Oracle: Evaluate migration paths (Oracle to Azure SQL MI via SSMA, Oracle to PostgreSQL via Ora2Pg, or Oracle on Azure VM)
2. For the SQL Server databases, document which features force specific targets:
   - Cross-database queries (requires SQL MI or SQL on VM)
   - SQL Server Agent jobs (requires SQL MI or SQL on VM)
   - CLR assemblies (limited support in Azure SQL DB)
   - Linked servers (requires SQL MI or SQL on VM)
   - Database size > 100GB (Azure SQL DB Hyperscale or SQL MI)
3. Create a decision matrix mapping each database to its recommended Azure target with justification.

### Part 2: Online vs. Offline Migration Strategy

4. Categorize each database for online (continuous replication) vs. offline (one-time copy) migration:
   - Online: databases requiring < 5 minutes downtime (e-commerce, real-time services)
   - Offline: databases that can tolerate maintenance windows (reporting, batch processing)
5. Design the online migration architecture using Azure Database Migration Service:
   - SQL Server to Azure SQL MI: continuous data sync with cutover
   - PostgreSQL to Azure Database for PostgreSQL: migration service with online replication
   - MySQL to Azure Database for MySQL: online migration with DMS
6. Calculate the migration timeline for each database based on:
   - Database size and network bandwidth available
   - Initial full backup/restore time
   - Ongoing change data capture (CDC) replication lag
   - Cutover window coordination

### Part 3: Complex Migration Scenarios

7. Design the migration strategy for the 2TB e-commerce SQL Server database with 5-minute downtime requirement:
   - Pre-stage: configure Azure SQL MI with appropriate service tier and sizing
   - Replicate: continuous data sync from on-premises SQL Server to MI
   - Validate: compare record counts, checksums, and application connectivity
   - Cutover: stop writes, allow replication to catch up, redirect applications
8. Design the Oracle ERP migration approach:
   - Option A: Migrate to Azure SQL MI using SQL Server Migration Assistant (SSMA) for schema/data conversion
   - Option B: Migrate to PostgreSQL using Ora2Pg for schema conversion
   - Option C: Rehost Oracle on Azure VM (maintain Oracle licensing on Azure)
   - Document trade-offs of each option including licensing costs, code refactoring effort, and timeline
9. Address the financial database parallel-run requirement:
   - Design a dual-write architecture or read-replica strategy
   - Define validation criteria for declaring the Azure target authoritative
   - Document the compliance sign-off process

### Part 4: Post-Migration Validation and Optimization

10. Design post-migration validation procedures:
    - Data integrity: row count comparison, checksum validation on key tables
    - Performance: query execution time comparison (baseline vs. Azure)
    - Application testing: functional test suites against Azure databases
    - Failover testing: verify HA/DR capabilities in Azure target
11. Design performance optimization steps for post-migration:
    - Azure SQL MI: evaluate and adjust service tier (General Purpose vs. Business Critical)
    - Index recommendations using Azure SQL Database Advisor
    - Query performance insights for identifying regressed queries
12. Document the rollback strategy for each database migration: what triggers a rollback, how long can you maintain rollback capability, and what data reconciliation is needed if Azure was primary for any period.

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-46"
  items={[
    "Compatibility assessment identifies blocking features for each SQL Server database with recommended Azure target",
    "Decision matrix maps all 30 databases to Azure targets (SQL DB, SQL MI, SQL VM, PostgreSQL Flex, MySQL Flex) with justification",
    "Online migration architecture designed for databases requiring less than 5 minutes downtime",
    "Oracle migration strategy evaluates at least 3 options (SQL MI, PostgreSQL, Oracle on VM) with trade-off analysis",
    "Post-migration validation covers data integrity, performance comparison, and application testing procedures",
    "Rollback strategy documented with triggers, timeline, and data reconciliation procedures"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Azure SQL Target Selection</summary>

Choose **Azure SQL Database** for: cloud-born applications, single database workloads, serverless/cost-sensitive scenarios, and applications that do not use cross-database queries or SQL Agent. Choose **Azure SQL Managed Instance** for: lift-and-shift of SQL Server workloads, applications using cross-database queries, linked servers, CLR, or SQL Agent. Choose **SQL Server on Azure VM** for: applications requiring full OS-level access, specific SQL Server versions, or features not available in MI (like FILESTREAM, third-party software installed alongside SQL Server).

</details>

<details>
<summary>Hint 2: Online Migration with DMS</summary>

Azure Database Migration Service (DMS) for online migration to SQL MI uses log shipping and transactional replication to continuously sync data from the source SQL Server. The initial full backup is restored to MI, then transaction log backups are applied continuously. During cutover, the application stops writing to the source, the final log backup is applied to MI, and the application reconnects to MI. Total cutover downtime is typically seconds to minutes depending on the final transaction log size.

</details>

<details>
<summary>Hint 3: Oracle Migration Complexity</summary>

Oracle to Azure migrations are complex due to: PL/SQL stored procedures (no direct equivalent in T-SQL or PL/pgSQL), Oracle-specific data types (NUMBER, VARCHAR2), sequences, synonyms, and package bodies. SSMA can convert approximately 70-80% of Oracle code to T-SQL automatically, but complex PL/SQL requires manual refactoring. Ora2Pg provides similar conversion to PostgreSQL. Always run a schema-only conversion first to assess the manual refactoring effort before committing to a migration path.

</details>

<details>
<summary>Hint 4: PostgreSQL Migration Service</summary>

Azure Database for PostgreSQL has a built-in migration service (separate from DMS) that supports both online and offline migration from on-premises PostgreSQL, AWS RDS, and other cloud sources. For online migration, it uses logical replication (requires PostgreSQL 10+ with logical decoding enabled). Key considerations: all tables must have primary keys for online migration, large objects (LOBs) require special handling, and some extensions may not be available in Azure Database for PostgreSQL Flexible Server.

</details>

<details>
<summary>Hint 5: Database Size and Migration Time</summary>

For a 2TB database over a 1Gbps ExpressRoute connection: theoretical transfer time is approximately 4.5 hours (2TB / 1Gbps). In practice, account for overhead: initial backup/restore may take 6-8 hours, plus ongoing transaction log shipping. The cutover window only needs to cover the final delta (transactions since last log backup), which for a 50,000 tx/hour database might be minutes of replay time. Start replication 1-2 weeks before cutover to ensure the replica is fully caught up.

</details>

## Learning Resources

- [Azure Database Migration Service overview](https://learn.microsoft.com/en-us/azure/dms/dms-overview)
- [Azure SQL migration assessment](https://learn.microsoft.com/en-us/azure/azure-sql/migration-guides/managed-instance/sql-server-to-managed-instance-overview)
- [Migration service in Azure Database for PostgreSQL](https://learn.microsoft.com/en-us/azure/postgresql/migrate/migration-service/overview-migration-service-postgresql)
- [Migrate Oracle to Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/migration-guides/managed-instance/oracle-to-managed-instance-guide)
- [DMS supported migration scenarios](https://learn.microsoft.com/en-us/azure/dms/resource-scenario-status)
- [Azure SQL Managed Instance features](https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/sql-managed-instance-paas-overview)

## Knowledge Check

<details>
<summary>1. A SQL Server 2012 database uses cross-database queries, SQL Agent jobs, and a 500GB database size. Which Azure target is appropriate and why?</summary>

**Azure SQL Managed Instance.** All three requirements point to SQL MI: (1) Cross-database queries are supported within the same MI instance but not in Azure SQL Database, (2) SQL Agent is built into MI with full job scheduling support but not available in Azure SQL Database, (3) 500GB is well within MI limits (up to 16TB) but exceeds Azure SQL Database standard tier limits (requires Hyperscale). Additionally, SQL Server 2012 compatibility level is supported by MI, enabling lift-and-shift without application changes.

</details>

<details>
<summary>2. An e-commerce database handles 50,000 transactions per hour and requires less than 5 minutes of downtime during migration. What migration method and cutover strategy should you use?</summary>

**Online migration with DMS continuous sync and coordinated cutover.** Steps: (1) Set up DMS with online migration mode to continuously replicate from source SQL Server to target SQL MI, (2) Allow initial full sync and continuous log shipping to run for 1-2 weeks until replication lag is minimal (seconds), (3) During a low-traffic period, enable application maintenance mode (stops new transactions), (4) Wait for final replication to complete (seconds to minutes), (5) Redirect application connection strings to MI, (6) Disable maintenance mode. Total downtime: the time from stopping writes to completing the DNS/connection string change, typically 2-5 minutes.

</details>

<details>
<summary>3. An Oracle database has 500 stored procedures with PL/SQL. The team wants to migrate to Azure SQL Managed Instance. What is the primary risk and how do you assess it?</summary>

**Code conversion completeness and functional equivalence.** PL/SQL to T-SQL conversion is not 1:1. Run SSMA against the Oracle schema to generate an assessment report showing: percentage of code that converts automatically, procedures requiring manual refactoring, unsupported constructs (autonomous transactions, nested tables, Oracle-specific built-in packages). The risk is that the 20-30% requiring manual conversion contains critical business logic. Mitigation: budget 3-6 months of DBA/developer effort for refactoring, comprehensive test coverage of all stored procedures, and consider keeping Oracle on Azure VM as a fallback if refactoring effort exceeds budget.

</details>

<details>
<summary>4. After migrating a PostgreSQL database to Azure Database for PostgreSQL Flexible Server, query performance degrades by 40%. The database size and VM tier match the on-premises configuration. What should you investigate?</summary>

**Server parameters, connection pooling, and network latency.** Common causes: (1) PostgreSQL server parameters not tuned for Azure (shared_buffers, work_mem, effective_cache_size default to conservative values), (2) No connection pooling (PgBouncer is built into Flexible Server but may not be enabled), (3) Application-to-database latency increased if the application has not yet migrated to Azure, (4) Missing extensions or custom configurations from the source server, (5) Statistics not updated after migration (run ANALYZE on all tables). Start with comparing `pg_stat_statements` output between source and target to identify specific regressed queries.

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge46 --location eastus
```

2. Create a VNet and subnet for the backend pool:

```bash
az network vnet create --resource-group rg-az305-challenge46 \
  --name vnet-lab46 --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-backend --subnet-prefix 10.0.1.0/24
```

3. Create a public IP and a Standard Load Balancer:

```bash
az network public-ip create --resource-group rg-az305-challenge46 \
  --name pip-lb46 --sku Standard --allocation-method Static

az network lb create --resource-group rg-az305-challenge46 \
  --name lb-lab46 --sku Standard \
  --frontend-ip-name frontend-lb46 --public-ip-address pip-lb46 \
  --backend-pool-name backend-pool46
```

4. Create two NICs and add them to the backend pool:

```bash
az network nic create --resource-group rg-az305-challenge46 \
  --name nic-vm1 --vnet-name vnet-lab46 --subnet subnet-backend \
  --lb-name lb-lab46 --lb-address-pools backend-pool46

az network nic create --resource-group rg-az305-challenge46 \
  --name nic-vm2 --vnet-name vnet-lab46 --subnet subnet-backend \
  --lb-name lb-lab46 --lb-address-pools backend-pool46
```

5. Verify the backend pool members:

```bash
az network lb address-pool show --resource-group rg-az305-challenge46 \
  --lb-name lb-lab46 --name backend-pool46 \
  --query "backendIPConfigurations[].id" -o tsv
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
# Delete all resources created in this challenge
az group delete --name rg-az305-challenge46 --yes --no-wait
```

---

**Next**: [Challenge 47: Design Unstructured Data Migration](/docs/az-305/infrastructure/challenge-47)
