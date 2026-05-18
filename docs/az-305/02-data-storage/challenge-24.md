---
sidebar_position: 11
title: "Challenge 24: Design an End-to-End Data Platform"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 24: Design an End-to-End Data Platform

:::info Estimated Time and Cost

**90-120 min** | **Estimated cost**: $10-20 | **Exam Weight: 20-25%**

:::

## Introduction

TechMart is an e-commerce marketplace connecting 5,000 sellers with 2 million active buyers. The platform processes 50,000 orders per day with seasonal peaks reaching 200,000 orders during holiday sales. The engineering team has been operating with disconnected data systems - a legacy SQL Server for orders, MongoDB for the product catalog, Azure Blob Storage for media files, and a third-party analytics tool - resulting in data silos, inconsistent reporting, and missed opportunities for personalization.

The VP of Engineering has secured a $25,000/month budget to build a unified data platform that serves the following needs: a transactional database for order processing (sub-10ms latency, ACID compliance), a flexible store for the product catalog and customer reviews (variable schema, global distribution), object storage for product images and videos (10TB and growing), a real-time recommendation engine that suggests products based on browsing behavior, a nightly reporting pipeline for finance and operations, and a 7-year immutable archive for financial transaction records (regulatory compliance).

This is the Domain 2 capstone challenge. You will synthesize design decisions from Challenges 14-23 to architect TechMart's complete data platform, justifying each technology choice against alternatives and demonstrating how the components integrate into a cohesive whole.

## Exam Skills Covered

- Recommend a solution for storing relational data
- Recommend a database service tier and compute tier
- Recommend a solution for storing semi-structured data
- Recommend a solution for storing unstructured data
- Recommend a data storage solution to balance features, performance, and costs
- Recommend a data solution for protection and durability
- Recommend a solution for data integration
- Recommend a solution for data analysis

## Design Tasks

### Part 1: Transactional Data Layer (Orders and Payments)

1. Select the relational database service for order processing. Create a decision matrix comparing:
   - Azure SQL Database (single database vs elastic pool)
   - Azure SQL Managed Instance
   - Azure Database for PostgreSQL Flexible Server
   - Azure Cosmos DB for PostgreSQL

   Evaluate on: transaction throughput (50K-200K orders/day), read/write latency requirements, ACID guarantees, scaling strategy for seasonal peaks (4x normal load), and cost at steady-state vs peak.

2. Design the scaling strategy for holiday peaks:
   - If using Azure SQL Database: auto-scaling DTU/vCore tiers, read replicas for reporting offload
   - Connection pooling strategy for the application tier
   - Read/write split: primary for writes, replicas for real-time inventory checks

3. Design data protection for the orders database:
   - Automated backups with point-in-time restore (retention period)
   - Long-term backup retention for compliance (7-year LTR policy)
   - Geo-replication for disaster recovery (active geo-replication vs failover groups)

### Part 2: Semi-Structured Data Layer (Product Catalog and Reviews)

4. Design the product catalog store using Azure Cosmos DB:
   - Select the appropriate API (NoSQL, MongoDB, PostgreSQL) with rationale
   - Design the partition key strategy for products (consider: queries by category, seller, and product ID)
   - Configure throughput: autoscale RU/s with a maximum that handles peak browsing
   - Design the data model for products with variable attributes (electronics vs clothing vs food)

5. Design the customer reviews system:
   - Evaluate whether reviews belong in the same Cosmos DB container or a separate store
   - Design for high read throughput (product pages show reviews) and moderate write (new reviews)
   - Implement a change feed to trigger review moderation and update aggregate ratings

6. Design global distribution for international expansion:
   - Configure multi-region writes for the product catalog (sellers updating from different regions)
   - Select the appropriate consistency level (evaluate Strong vs Bounded Staleness vs Session vs Eventual for an e-commerce catalog)
   - Calculate the cost of multi-region replication vs single-region at current scale

### Part 3: Unstructured Data Layer (Media Storage)

7. Design the media storage architecture for product images and videos (10TB, growing 2TB/month):
   - Storage account type and performance tier selection
   - Access tier strategy: new uploads in Hot, transition to Cool after 30 days (most views happen in first month)
   - CDN integration for global content delivery (Azure CDN or Azure Front Door)

8. Design the upload and processing pipeline:
   - Blob triggered processing: image resizing, thumbnail generation, video transcoding
   - Event Grid integration for triggering Azure Functions on blob creation
   - Design storage naming conventions and folder structure for efficient access patterns

### Part 4: Real-Time Recommendations Engine

9. Design the real-time recommendation system:
   - Ingestion: capture browsing events (product views, cart additions, purchases) via Event Hubs
   - Processing: Stream Analytics or Azure Functions to update user behavior profiles
   - Serving layer: Azure Cache for Redis storing pre-computed recommendations per user
   - Model training: nightly batch update of recommendation model using historical data

10. Design the data flow from transaction events to recommendations:
    - Order completion event updates the user's purchase history
    - Cosmos DB change feed triggers recommendation recalculation for related products
    - Redis cache is refreshed with new recommendations (TTL-based expiration for stale data)

### Part 5: Reporting Pipeline and Compliance Archive

11. Design the nightly reporting pipeline using Azure Data Factory or Synapse Pipelines:
    - Extract from: Azure SQL Database (orders), Cosmos DB (products/reviews), Storage (media metadata)
    - Transform: calculate daily revenue, seller performance, inventory levels, customer cohort metrics
    - Load: Synapse Analytics (serverless or dedicated) for Power BI dashboards
    - Schedule: complete by 6:00 AM daily, with retry logic and failure alerts

12. Design the 7-year compliance archive for financial transaction records:
    - Storage tier selection (Cool or Archive for cost optimization)
    - Immutability policy with locked time-based retention (7-year/2,555-day period)
    - Redundancy: RA-GZRS for regulatory requirements (geo-redundant with read access)
    - Lifecycle management: automatic transition from Cool to Archive after 1 year

### Part 6: Unified Architecture and Budget

13. Create a comprehensive architecture diagram showing all components and their data flows:
    - Transactional tier (Azure SQL Database)
    - Semi-structured tier (Cosmos DB)
    - Media tier (Blob Storage + CDN)
    - Real-time tier (Event Hubs + Stream Analytics/Functions + Redis)
    - Analytics tier (Data Factory + Synapse/Data Lake)
    - Compliance tier (Immutable Storage + GZRS)

14. Create a monthly cost estimate for the complete platform broken down by component, validating it fits within the $25,000/month budget:
    - Azure SQL Database: compute + storage + geo-replica
    - Cosmos DB: RU/s + storage + multi-region replication
    - Blob Storage: capacity (by tier) + operations + CDN egress
    - Event Hubs + Stream Analytics: throughput units + streaming units
    - Redis Cache: tier and size selection
    - Data Factory + Synapse: pipeline runs + compute
    - Total must not exceed $25,000/month

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-24"
  items={[
    "Relational database selected with scaling strategy handling 4x peak load without downtime",
    "Cosmos DB configured with appropriate API, partition key strategy, and consistency level justified",
    "Media storage architecture includes lifecycle management and CDN for global delivery",
    "Real-time recommendations design shows complete data flow from event ingestion to cache serving",
    "Reporting pipeline design covers extraction from 3+ sources with nightly schedule and error handling",
    "Compliance archive uses immutable storage with locked retention policy and geo-redundancy"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Cosmos DB Partition Key Design</summary>

For an e-commerce product catalog, the partition key choice significantly impacts performance and cost. Using `categoryId` groups related products for browse queries but may create hot partitions for popular categories. Using `productId` provides even distribution but makes category queries cross-partition. A common pattern is using a synthetic partition key like `categoryId-subcategoryId` that balances distribution with query locality. For reviews, partition by `productId` since reviews are always read in the context of a specific product page.

</details>

<details>
<summary>Hint 2: Azure SQL Database Scaling for Peaks</summary>

For seasonal peaks (4x normal load), consider: (1) Hyperscale tier with auto-scale compute (0-30 seconds to scale up, no data movement), (2) vCore model with read scale-out for reporting queries, or (3) Serverless compute tier if peak periods are predictable but intermittent. Elastic pools are better for multi-tenant SaaS with many small databases rather than a single high-throughput database. For TechMart's single large order database, Hyperscale or Business Critical with read replicas is more appropriate.

</details>

<details>
<summary>Hint 3: Real-Time Recommendations Architecture</summary>

The recommendations system does not need to compute recommendations in real-time for every request. A hybrid approach works best: batch-train the ML model nightly (collaborative filtering, matrix factorization) and store pre-computed recommendations in Redis. Real-time signals (current session browsing) adjust the pre-computed list using simple rules (boost recently viewed categories, demote already purchased items). This keeps serving latency under 10ms while still being personalized.

</details>

<details>
<summary>Hint 4: Cost Budget Allocation</summary>

For a $25K/month e-commerce data platform, a typical allocation might be: Database (SQL + Cosmos DB): 40-50% ($10-12K), Storage + CDN: 10-15% ($2.5-3.5K), Analytics (Synapse + Data Factory): 15-20% ($3.5-5K), Real-time (Event Hubs + Stream Analytics + Redis): 15-20% ($3.5-5K), Compliance archive: 5% ($1.2K). Use the Azure Pricing Calculator to validate your estimates against actual service pricing in your target region.

</details>

<details>
<summary>Hint 5: Integration Patterns Across Tiers</summary>

Use events and change feeds to keep tiers synchronized without tight coupling: (1) Azure SQL triggers or Change Data Capture (CDC) publishes order events to Event Hubs, (2) Cosmos DB change feed pushes product/review updates to the analytics pipeline, (3) Event Grid notifies downstream systems of new blob uploads, (4) Data Factory orchestrates the nightly batch that reads from all sources. Avoid direct cross-service queries in production paths - each tier should have its own optimized data store for its access pattern.

</details>

## Learning Resources

- [Azure SQL Database overview](https://learn.microsoft.com/en-us/azure/azure-sql/database/sql-database-paas-overview)
- [Azure Cosmos DB for NoSQL](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/)
- [Azure Cosmos DB partitioning](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview)
- [Azure Blob Storage access tiers](https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview)
- [Immutable storage for Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview)
- [Azure Event Hubs and Stream Analytics](https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-introduction)
- [Azure Cache for Redis](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview)
- [Azure Data Factory overview](https://learn.microsoft.com/en-us/azure/data-factory/introduction)
- [Azure Architecture Center - E-commerce reference](https://learn.microsoft.com/en-us/azure/architecture/industries/retail)

## Knowledge Check

<details>
<summary>1. TechMart needs the product catalog to handle 50,000 reads/second during flash sales with global buyers. The catalog has 500,000 products across 200 categories. Which Cosmos DB configuration is most appropriate?</summary>

**Cosmos DB for NoSQL with autoscale throughput (max 50,000 RU/s), partitioned by category with a synthetic key, and multi-region read replicas.** Autoscale handles the flash sale burst without over-provisioning during normal traffic (scales down to 10% of max). Partitioning by a synthetic key (e.g., `categoryId-subcategoryId`) distributes load while keeping browse-by-category queries efficient. Multi-region reads place data close to global buyers, reducing latency. Session consistency ensures each buyer sees their own writes (cart, reviews) while not paying the cost of Strong consistency across regions.

</details>

<details>
<summary>2. The compliance team requires that financial transaction records stored for 7 years cannot be modified or deleted by anyone, including administrators. Which combination of Azure Storage features satisfies this requirement?</summary>

**Immutable blob storage with a locked time-based retention policy (2,555 days) on a storage account with RA-GZRS redundancy.** The locked policy is critical - an unlocked policy can be deleted by admins, defeating the compliance purpose. Once locked, even the storage account owner and Microsoft support cannot delete the data before expiration. RA-GZRS ensures the data survives a complete regional disaster with read access from the secondary region. Additional protections: enable resource locks on the storage account to prevent accidental account deletion, and use Azure Policy to enforce immutability on new containers.

</details>

<details>
<summary>3. TechMart's recommendation engine needs to serve personalized product suggestions in under 10ms per request during peak traffic (100,000 concurrent users). What serving architecture achieves this?</summary>

**Azure Cache for Redis (Premium or Enterprise tier) storing pre-computed recommendation lists per user.** Redis provides sub-millisecond read latency for key-value lookups. Pre-compute recommendations in batch (nightly model training writes top-N product IDs per user to Redis) and serve directly from cache. The Premium tier supports clustering for horizontal scaling across nodes. For 100K concurrent users with ~1KB recommendation payload each, a clustered Redis with 2-3 shards provides sufficient memory and throughput. The application simply performs a `GET user:{userId}:recommendations` operation - no real-time ML inference needed in the hot path.

</details>

<details>
<summary>4. During the nightly reporting pipeline, Data Factory needs to extract changed orders from Azure SQL Database (only orders modified since the last run). What is the most efficient extraction pattern?</summary>

**Incremental extraction using a watermark column (e.g., `lastModifiedDate`).** Data Factory's Copy activity supports a watermark pattern: store the last successful extraction timestamp, then query `WHERE lastModifiedDate > @lastWatermark`. This is more efficient than full extraction (which reads all 50K+ daily orders plus historical data) and more reliable than CDC for a simple nightly batch. The watermark value is stored in a control table or Data Factory variable. For more complex change tracking (deletes, schema changes), Azure SQL Database's built-in Change Data Capture (CDC) can be used, but it adds overhead to the transaction database.

</details>

## Cleanup

```bash
# Delete all resources created in this challenge
az group delete --name rg-az305-challenge24 --yes --no-wait

# If you created additional resource groups for specific services:
# az group delete --name rg-az305-challenge24-analytics --yes --no-wait
```

---

**Next**: [Challenge 25: Design Backup and Recovery for Azure Workloads](/docs/az-305/business-continuity/challenge-25)
