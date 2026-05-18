---
sidebar_position: 1
title: "Challenge 14: Design a Relational Data Platform"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 14: Design a Relational Data Platform

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $5-15 | **Exam Weight: 20-25%**

:::

## Introduction

ShopWave is a mid-market e-commerce company that currently runs three separate databases on-premises. Their primary transactional database handles 2,000 orders per minute during peak hours and stores product catalog, inventory, and customer data in SQL Server 2019. A second SQL Server instance serves as a reporting database, running complex analytical queries that join across 50+ tables and sometimes take 10-15 minutes to complete. Additionally, ShopWave recently acquired a smaller competitor whose product review system runs on PostgreSQL 14 with 200GB of data and custom extensions (PostGIS for location-based review filtering and pg_trgm for fuzzy text search).

The CTO has set a firm budget of $2,000/month for all database workloads in Azure. The transactional database must maintain sub-20ms write latency during peak hours. The reporting database can tolerate higher latency but needs to handle queries spanning billions of rows. The PostgreSQL database must retain its extensions and minimize code changes during migration. The team has limited DBA resources (one part-time database administrator) and wants managed services wherever possible.

ShopWave also requires that all databases support automated backups with at least 7-day point-in-time restore, and that the transactional database has a 99.99% SLA. The company operates exclusively in the US East region today but plans to expand to Europe within 18 months.

## Exam Skills Covered

- Recommend a solution for storing relational data

## Design Tasks

### Part 1: Service Selection

1. For each of ShopWave's three databases, recommend the most appropriate Azure service (Azure SQL Database, Azure SQL Managed Instance, Azure Database for PostgreSQL Flexible Server, or Azure Database for MySQL Flexible Server). Justify each selection based on compatibility requirements, feature needs, and migration complexity.
2. For the transactional SQL Server database, determine whether a single database or an elastic pool deployment model is more appropriate given the workload characteristics.
3. Evaluate whether Azure SQL Managed Instance would be a better fit than Azure SQL Database for the transactional workload. Document at least three factors in your decision.
4. Identify which features of PostgreSQL Flexible Server (versus Single Server, which is retired) support the acquired company's extension requirements.

### Part 2: Migration Planning

5. Design a migration approach for each database. Specify whether you would use online or offline migration, and which tool (Azure Database Migration Service, native backup/restore, or data replication) is most appropriate.
6. Determine the minimum downtime migration strategy for the transactional database, considering it processes orders 24/7.
7. Identify any schema or application changes required for the PostgreSQL migration to retain PostGIS and pg_trgm functionality.

### Part 3: Cost Optimization

8. Estimate the monthly cost for your proposed architecture and verify it fits within the $2,000/month budget. Consider compute, storage, and backup costs.
9. Identify at least two cost optimization strategies (such as reserved capacity, right-sizing, or workload consolidation) that could reduce the total monthly spend by 20% or more.
10. Design a strategy for the future European expansion that minimizes additional cost while meeting data residency requirements.

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-14"
  items={[
    "Selected appropriate Azure database services for all three workloads with documented justification",
    "Demonstrated understanding of Azure SQL Database vs SQL Managed Instance trade-offs",
    "Designed migration strategy with minimal downtime for the transactional database",
    "Validated PostgreSQL extension compatibility with Azure Database for PostgreSQL Flexible Server",
    "Total estimated monthly cost fits within the $2,000 budget constraint",
    "Documented European expansion strategy with data residency considerations"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Azure SQL Database vs Managed Instance</summary>

Azure SQL Database is a fully managed PaaS database engine. Azure SQL Managed Instance provides near-100% compatibility with on-premises SQL Server, including support for cross-database queries, SQL Server Agent, CLR, and linked servers. If the application uses SQL Server-specific features beyond T-SQL (like Service Broker or Database Mail), Managed Instance may be required. However, SQL Database is typically cheaper for single-database workloads. Check the [feature comparison](https://learn.microsoft.com/en-us/azure/azure-sql/database/features-comparison) for details.

</details>

<details>
<summary>Hint 2: PostgreSQL Extensions on Azure</summary>

Azure Database for PostgreSQL Flexible Server supports many popular extensions including PostGIS, pg_trgm, hstore, and citext. You can list supported extensions in the Azure portal or by running `SELECT * FROM pg_available_extensions;` after deployment. Flexible Server (not the retired Single Server) is the recommended deployment option with full extension support.

</details>

<details>
<summary>Hint 3: Online Migration with DMS</summary>

Azure Database Migration Service (DMS) supports online migration for SQL Server to Azure SQL Database and SQL Server to Azure SQL Managed Instance. Online migration uses change data capture to replicate ongoing changes during migration, reducing downtime to minutes rather than hours. For PostgreSQL, DMS also supports online migration using logical replication.

</details>

<details>
<summary>Hint 4: Cost Estimation</summary>

For cost estimation, consider: Azure SQL Database General Purpose (vCore) starts around $370/month for 2 vCores. PostgreSQL Flexible Server Burstable B2s tier starts around $25/month. Reserved capacity (1-year or 3-year) provides 30-65% savings on compute. Storage costs are separate and typically $0.115/GB/month for General Purpose tier.

</details>

<details>
<summary>Hint 5: Elastic Pools vs Single Databases</summary>

Elastic pools are cost-effective when you have multiple databases with varying and unpredictable usage patterns. If databases have different peak times, they can share resources. For a single high-throughput transactional database with consistent load, a single database with provisioned compute is usually more cost-effective and provides more predictable performance.

</details>

## Learning Resources

- [Features comparison: Azure SQL Database and Azure SQL Managed Instance](https://learn.microsoft.com/en-us/azure/azure-sql/database/features-comparison)
- [Azure SQL Database overview](https://learn.microsoft.com/en-us/azure/azure-sql/database/sql-database-paas-overview)
- [Azure SQL Managed Instance overview](https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/sql-managed-instance-paas-overview)
- [Azure Database for PostgreSQL Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/overview)
- [Azure Database Migration Service](https://learn.microsoft.com/en-us/azure/dms/dms-overview)
- [Choose the right deployment option in Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/azure-sql-iaas-vs-paas-what-is-overview)

## Knowledge Check

<details>
<summary>1. A company needs to migrate a SQL Server database that uses Service Broker, cross-database queries, and SQL Server Agent jobs. Which Azure service should they use?</summary>

**Azure SQL Managed Instance.** It provides near-100% compatibility with on-premises SQL Server, including support for Service Broker, cross-database queries, SQL Server Agent, CLR, and other instance-scoped features that Azure SQL Database does not support.

</details>

<details>
<summary>2. When should you choose an elastic pool over individual Azure SQL databases?</summary>

**When you have multiple databases with unpredictable or complementary usage patterns.** Elastic pools allow databases to share a pool of compute resources (eDTUs or vCores), making them cost-effective when databases have different peak usage times. For a single database with consistent high utilization, a dedicated single database is typically more cost-effective.

</details>

<details>
<summary>3. A PostgreSQL database uses PostGIS and pg_trgm extensions. What is the recommended Azure migration target?</summary>

**Azure Database for PostgreSQL Flexible Server.** It supports both PostGIS and pg_trgm extensions, along with many other community extensions. Single Server is deprecated and should not be used for new deployments. Flexible Server provides high availability, intelligent performance, and full extension support.

</details>

<details>
<summary>4. What is the primary advantage of online migration with Azure Database Migration Service compared to offline migration?</summary>

**Minimal downtime.** Online migration uses change data capture (CDC) or logical replication to continuously sync changes from the source to the target during migration. The actual cutover (switching applications to the new database) requires only minutes of downtime, compared to hours or days for offline migration where the source must be quiesced during the full data copy.

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge14 --location eastus
```

2. Deploy an Azure SQL Database (General Purpose, serverless):

```bash
az sql server create --name sql-shopwave-lab --resource-group rg-az305-challenge14 \
  --location eastus --admin-user sqladmin --admin-password "P@ssw0rd2025!"

az sql db create --name db-shopwave-orders --resource-group rg-az305-challenge14 \
  --server sql-shopwave-lab --edition GeneralPurpose --compute-model Serverless \
  --family Gen5 --capacity 2
```

3. Configure geo-replication to a secondary region:

```bash
az sql db replica create --name db-shopwave-orders --resource-group rg-az305-challenge14 \
  --server sql-shopwave-lab --partner-server sql-shopwave-lab-west \
  --partner-resource-group rg-az305-challenge14

az sql server create --name sql-shopwave-lab-west --resource-group rg-az305-challenge14 \
  --location westus --admin-user sqladmin --admin-password "P@ssw0rd2025!"
```

4. Verify geo-replication status:

```bash
az sql db replica list-links --name db-shopwave-orders \
  --resource-group rg-az305-challenge14 --server sql-shopwave-lab
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
# Delete the resource group containing all database resources
az group delete --name rg-shopwave-data --yes --no-wait

# If you created a Database Migration Service instance
az group delete --name rg-shopwave-dms --yes --no-wait
```

---

**Next**: [Challenge 15: Design Database Tiers and Compute](/docs/az-305/data-storage/challenge-15)
