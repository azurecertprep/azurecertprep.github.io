---
sidebar_position: 10
title: "Challenge 23: Design a Data Analytics Solution"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 23: Design a Data Analytics Solution

:::info Estimated Time and Cost

**75-90 min** | **Estimated cost**: $8-15 | **Exam Weight: 20-25%**

:::

## Introduction

TransGlobal Logistics operates a fleet of 10,000 trucks across North America, generating GPS telemetry events every 5 seconds (2 million events per second at peak). The company has three distinct analytics requirements that vary dramatically in latency, volume, and user profile:

First, the operations center needs real-time fleet tracking with sub-minute latency to detect route deviations, predict delays, and trigger alerts when trucks enter restricted zones. Second, regional managers need daily operational dashboards showing delivery performance, fuel efficiency, and driver hours - refreshed every morning by 7:00 AM with data from the previous day. Third, the data science team retrains ML models monthly using 6 months of historical route data to optimize delivery routes and predict maintenance needs.

Each workload has different cost tolerance: the real-time system justifies premium pricing for speed, the dashboards need predictable costs, and the ML training should minimize cost even if it takes longer to process. Your challenge is to design an analytics architecture that serves all three needs efficiently without over-provisioning any single workload.

## Exam Skills Covered

- Recommend a solution for data analysis

## Design Tasks

### Part 1: Design Real-Time Analytics (Fleet Tracking)

1. Design the ingestion layer for 2 million events/second of GPS telemetry:
   - Compare Azure Event Hubs (Standard vs Premium vs Dedicated) for this throughput
   - Calculate the required number of throughput units or processing units
   - Document partition strategy for ordering guarantees per truck (partition by truck ID)

2. Design the stream processing layer:
   - Compare Azure Stream Analytics vs Apache Spark Structured Streaming (on Databricks or Synapse Spark)
   - For Stream Analytics: design windowing functions (tumbling, hopping, sliding) for route deviation detection
   - Define the output sinks: real-time dashboard (Power BI streaming dataset), alert system (Azure Functions), and warm storage (Cosmos DB for recent positions)

3. Design the alerting logic:
   - Geofence violation detection (truck enters restricted zone)
   - Speed anomaly detection (sudden deceleration events)
   - Late delivery prediction (current position + remaining distance vs scheduled time)

### Part 2: Design Batch Analytics (Operational Dashboards)

4. Design the data warehouse layer for daily dashboards:
   - Compare dedicated SQL pool vs serverless SQL pool in Synapse Analytics:
     - Dedicated: provisioned DWU, predictable performance, best for concurrent queries
     - Serverless: pay-per-query, auto-scales, best for ad-hoc exploration
   - Select the appropriate option for 50 managers querying dashboards simultaneously each morning
   - Design the star schema with fact tables (deliveries, fuel events, driver shifts) and dimensions (trucks, routes, drivers, time)

5. Design the Power BI integration:
   - Compare DirectQuery (live queries against Synapse) vs Import mode (scheduled refresh)
   - Design the semantic model with appropriate aggregation tables for fast dashboard rendering
   - Document the refresh schedule and data freshness requirements

6. Design the data transformation layer that prepares raw telemetry for dashboard consumption:
   - Aggregate GPS events into trip summaries (start, end, distance, duration, stops)
   - Calculate KPIs: on-time delivery rate, fuel efficiency (miles per gallon), driver hours compliance
   - Schedule transformations to complete by 6:00 AM for 7:00 AM dashboard availability

### Part 3: Design Advanced Analytics (ML Model Training)

7. Design the historical data lake for ML training:
   - Storage format comparison: Parquet vs Delta Lake vs CSV for 6 months of route data (~50TB)
   - Partitioning strategy: by date and region for efficient range scans
   - Design the medallion architecture (Bronze/Silver/Gold) for progressive data refinement

8. Design the compute layer for monthly model training:
   - Compare Azure Databricks vs Synapse Spark pools for large-scale ML workloads
   - Evaluate cluster sizing: auto-scaling spot instances to minimize cost
   - Document the trade-offs: Databricks (MLflow integration, collaborative notebooks, Unity Catalog) vs Synapse Spark (integrated with Synapse workspace, simpler governance)

9. Design cost optimization for the ML workload:
   - Use spot instances / low-priority nodes for fault-tolerant training jobs
   - Schedule training during off-peak hours for potential cost savings
   - Implement cluster auto-termination after idle period
   - Calculate monthly compute cost for a 72-hour training run on a 20-node cluster

### Part 4: Unified Architecture

10. Design how the three analytics workloads share infrastructure:
    - Shared Data Lake Storage Gen2 as the central storage layer (Bronze/Silver/Gold zones)
    - Event Hubs as the single ingestion point, with Stream Analytics consuming real-time and Data Factory capturing to the lake for batch
    - Define data flow from real-time ingestion through batch processing to ML consumption

11. Create a cost model for the complete analytics architecture:
    - Real-time: Event Hubs + Stream Analytics + Cosmos DB hot store
    - Batch: Synapse dedicated SQL pool (paused outside business hours) + Power BI
    - ML: Databricks/Synapse Spark (monthly burst) + ADLS Gen2 storage
    - Identify which components can be paused/scaled down when not in use

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-23"
  items={[
    "Real-time ingestion architecture sized for 2M events/second with partition strategy documented",
    "Stream processing solution selected with windowing design for route deviation detection",
    "Dedicated vs serverless SQL pool comparison with selection rationale for dashboard workload",
    "ML compute platform selected with cost optimization strategy (spot instances, auto-termination)",
    "Unified architecture diagram showing data flow from ingestion through all three analytics tiers",
    "Monthly cost model for complete architecture with identification of pause/scale opportunities"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Event Hubs Throughput Sizing</summary>

Event Hubs Standard tier provides 1 MB/s ingress and 2 MB/s egress per throughput unit (TU), with a maximum of 40 TUs per namespace (auto-inflate). For 2M events/second at ~200 bytes each, that is approximately 400 MB/s ingress - well beyond Standard tier capacity. Event Hubs Premium uses Processing Units (PU) with higher limits, or Event Hubs Dedicated provides reserved capacity. Calculate: (events/second * event size) to determine required throughput, then select the tier that supports it.

</details>

<details>
<summary>Hint 2: Stream Analytics vs Spark Streaming</summary>

Azure Stream Analytics is a fully managed service with SQL-like query language, built-in windowing functions, and no cluster management. It is ideal when the team has SQL skills and needs sub-second processing with guaranteed ordering. Spark Structured Streaming (Databricks/Synapse) offers more flexibility (Python/Scala), complex ML-in-stream scenarios, and exactly-once semantics, but requires cluster management and has higher latency (micro-batch, typically 1-10 seconds). For straightforward geofence detection and aggregation, Stream Analytics is simpler and cheaper.

</details>

<details>
<summary>Hint 3: Dedicated vs Serverless SQL Pool</summary>

Dedicated SQL pool (formerly SQL DW) is provisioned in Data Warehouse Units (DWU) and billed per hour whether queries run or not. It excels at predictable, concurrent query workloads (like 50 managers hitting dashboards simultaneously). Serverless SQL pool is pay-per-query (per TB of data processed) with no provisioning - ideal for ad-hoc exploration or infrequent queries. For the dashboard scenario with high concurrency every morning, dedicated is more predictable. Tip: pause the dedicated pool outside business hours (evenings/weekends) to save up to 60% on compute costs.

</details>

<details>
<summary>Hint 4: Delta Lake for ML Workloads</summary>

Delta Lake adds ACID transactions, schema enforcement, and time travel to Parquet files on the data lake. For ML training, Delta Lake's benefits include: ability to read a consistent snapshot while new data is being written, schema evolution as telemetry format changes, and efficient upserts for the Silver layer. The slight overhead versus raw Parquet is negligible for ML training reads and the reliability benefits are significant for a production data platform.

</details>

<details>
<summary>Hint 5: Medallion Architecture Zones</summary>

Bronze zone: raw data as-is from sources (JSON, CSV, raw Parquet). Silver zone: cleaned, deduplicated, standardized data (validated schema, null handling, type conversions). Gold zone: business-level aggregates and feature tables ready for consumption (trip summaries, daily KPIs, ML feature vectors). Each zone is a folder structure in ADLS Gen2, typically partitioned by date. The ML team reads from Silver/Gold; dashboards read from Gold; real-time writes to Bronze.

</details>

## Learning Resources

- [Azure Event Hubs overview](https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-about)
- [Azure Stream Analytics overview](https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-introduction)
- [Synapse Analytics dedicated SQL pool](https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/sql-data-warehouse-overview-what-is)
- [Serverless SQL pool in Azure Synapse](https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/on-demand-workspace-overview)
- [Azure Databricks overview](https://learn.microsoft.com/en-us/azure/databricks/introduction/)
- [Delta Lake on Azure](https://learn.microsoft.com/en-us/azure/databricks/delta/)
- [Power BI integration with Synapse](https://learn.microsoft.com/en-us/azure/synapse-analytics/get-started-visualize-power-bi)

## Knowledge Check

<details>
<summary>1. TransGlobal needs to detect when a truck deviates from its planned route within 30 seconds of the deviation occurring. Which Azure service is most appropriate for this, and why?</summary>

**Azure Stream Analytics with a geospatial reference dataset.** Stream Analytics supports built-in geospatial functions (ST_WITHIN, ST_DISTANCE) that can compare incoming GPS coordinates against geofence polygons stored as reference data. With temporal windows as small as 1 second, it can detect deviations within the 30-second requirement. The SQL-like query language makes it accessible to the team, and the fully managed nature eliminates cluster operations. Spark Streaming could also work but introduces unnecessary complexity and higher latency for this straightforward pattern-matching scenario.

</details>

<details>
<summary>2. The daily dashboards are queried by 50 managers simultaneously between 7:00 AM and 9:00 AM. Outside those hours, no one queries the warehouse. Which SQL pool option minimizes cost while ensuring consistent performance during peak hours?</summary>

**Dedicated SQL pool with auto-pause or manual pause scheduling.** During the 7-9 AM peak, dedicated SQL pool provides guaranteed DWU compute for consistent query performance across 50 concurrent users. Outside those hours, the pool can be paused (zero compute cost, only storage charges). Serverless SQL pool would scale per-query but performance may vary with 50 concurrent complex dashboard queries, and cost becomes unpredictable. The pattern of predictable peak hours with zero off-peak usage makes dedicated pool with pause/resume the most cost-effective choice.

</details>

<details>
<summary>3. The data science team needs to process 50TB of historical GPS data for monthly ML training. They want to minimize cost and can tolerate the job taking up to 72 hours. What compute strategy should they use?</summary>

**Azure Databricks with auto-scaling spot instances (or Synapse Spark with low-priority nodes).** Spot instances provide up to 60-90% discount over on-demand pricing. Since ML training is fault-tolerant (checkpointing allows restart from the last checkpoint if a spot instance is reclaimed), this is an ideal use case for spot compute. Auto-scaling ensures the cluster grows when data processing is active and shrinks during I/O waits. Combined with auto-termination after 15-30 minutes of inactivity, this minimizes wasted compute. Scheduling jobs during off-peak hours (nights/weekends) may further reduce spot instance reclamation risk.

</details>

<details>
<summary>4. What is the advantage of using the medallion architecture (Bronze/Silver/Gold) instead of loading raw data directly into the data warehouse?</summary>

**Separation of concerns, reprocessability, and multi-consumer support.** Bronze preserves raw data exactly as received (audit trail, reprocessing capability). Silver provides a clean, validated layer that multiple consumers can use (dashboards, ML, ad-hoc queries) without each reimplementing data quality logic. Gold provides optimized views for specific use cases. If transformation logic changes, you reprocess from Bronze without re-ingesting from source systems. This decouples ingestion reliability from transformation correctness and allows each analytics workload to consume data at the appropriate quality level.

</details>

## Cleanup

```bash
# Delete all resources created in this challenge
az group delete --name rg-az305-challenge23 --yes --no-wait

# If using Databricks, also delete the workspace
# az databricks workspace delete --name dbw-transglobal --resource-group rg-az305-challenge23
```

---

**Next**: [Challenge 24: Design an End-to-End Data Platform](/docs/az-305/data-storage/challenge-24)
