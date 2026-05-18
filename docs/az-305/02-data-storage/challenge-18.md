---
sidebar_position: 5
title: "Challenge 18: Design a Semi-Structured Data Solution"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 18: Design a Semi-Structured Data Solution

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $10-25 | **Exam Weight: 20-25%**

:::

## Introduction

SensorGrid is an industrial IoT platform that monitors 50,000 devices deployed across manufacturing facilities in North America, Europe, and Asia-Pacific. Each device transmits telemetry events (temperature, vibration, pressure, humidity) every 5 seconds, resulting in approximately 1 million events per second at peak. Events are JSON documents with a variable schema: different device types include different sensor readings, firmware versions add new fields over time, and some events include nested arrays of sub-readings.

The platform has two primary access patterns. First, operators need real-time dashboards showing the latest state of any device with sub-10ms read latency (point reads by device ID). Second, engineers run historical analytics queries spanning days or weeks of data for a specific facility or device type, where response times of 2-5 seconds are acceptable. The current data volume is 2TB and grows by 500GB per month.

SensorGrid's budget for the data layer is $3,000/month. The CTO wants to minimize operational overhead (no managing clusters or shards manually) and requires multi-region availability with automatic failover. The engineering team has experience with MongoDB query syntax from a previous project but is open to other APIs if the trade-offs justify it. Data retention policy requires hot data for 90 days, after which it should be archived or moved to cold storage to control costs.

## Exam Skills Covered

- Recommend a solution for storing semi-structured data

## Design Tasks

### Part 1: Service and API Selection

1. Evaluate Azure Cosmos DB as the primary data store for SensorGrid's requirements. Compare it against alternatives (Azure Table Storage, MongoDB Atlas on Azure) and justify your recommendation.
2. Select the most appropriate Cosmos DB API for this workload. Compare NoSQL (native), MongoDB, PostgreSQL, Cassandra, and Gremlin APIs. Consider the team's MongoDB experience, the query patterns required, and long-term flexibility.
3. If you recommend the NoSQL API, explain how SQL-like queries and the change feed provide advantages over the MongoDB API for this IoT scenario. If you recommend MongoDB API, explain how wire protocol compatibility reduces migration effort.
4. Evaluate whether Azure Table Storage could handle any portion of this workload at lower cost (for simpler key-value lookups of device state).

### Part 2: Data Modeling and Partitioning

5. Design the partition key strategy for the telemetry events container. Evaluate candidates: device ID, facility ID, device type, timestamp, or a synthetic key combining multiple fields. Consider the access patterns (point reads by device, range queries by time, queries by facility).
6. Calculate the expected RU (Request Unit) consumption for the two primary access patterns: (a) point read of latest device state, (b) query returning 1 hour of history for a single device. Estimate the provisioned throughput needed.
7. Design the document structure for telemetry events. Decide whether to store each reading as an individual document or batch multiple readings into a single document (bucketing pattern). Analyze the trade-offs in RU cost, query flexibility, and write throughput.
8. Design a TTL (time-to-live) strategy to automatically expire data after 90 days, reducing storage costs without manual cleanup jobs.

### Part 3: Consistency and Global Distribution

9. Select the appropriate consistency level for each access pattern: (a) real-time dashboard reads (latest device state), (b) historical analytics queries. Evaluate strong, bounded staleness, session, consistent prefix, and eventual consistency. Document the RU cost implications of each level.
10. Design the multi-region deployment topology. Determine which regions should have write capability (single-write vs multi-write) and how many read regions to deploy given the device distribution.
11. Evaluate multi-region writes for scenarios where devices in each region write to the nearest Cosmos DB instance. Address conflict resolution strategy (Last Writer Wins vs custom merge procedures).
12. Design a cost optimization strategy including autoscale throughput, serverless tier for development environments, and hierarchical partition keys for improved data distribution.

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-18"
  items={[
    "Selected and justified the Cosmos DB API choice with clear comparison against alternatives",
    "Designed partition key strategy that avoids hot partitions and supports both access patterns",
    "Estimated RU consumption and selected appropriate throughput provisioning mode (manual, autoscale, or serverless)",
    "Selected consistency levels appropriate to each access pattern with documented trade-offs",
    "Designed multi-region topology with automatic failover and clear write region strategy",
    "Implemented TTL and data lifecycle strategy to control storage costs within budget"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Cosmos DB API Selection</summary>

The NoSQL API (formerly SQL API) is the native Cosmos DB API with the richest feature set: SQL-like query language, change feed, hierarchical partition keys, full indexing control, and best SDK support. The MongoDB API provides wire-protocol compatibility for teams migrating from MongoDB. For greenfield IoT projects, the NoSQL API typically offers better performance optimization and lower RU costs because it has no wire-protocol translation overhead. Choose MongoDB API only if you have existing MongoDB application code you cannot modify.

</details>

<details>
<summary>Hint 2: Partition Key for IoT Data</summary>

For IoT telemetry, common partition key strategies: (1) Device ID: excellent for point reads of a single device but creates hot partitions if one device generates far more data; (2) Synthetic key like `deviceId_YYYYMMDD`: distributes data evenly and supports time-based queries within a device; (3) Hierarchical partition keys (preview/GA): allow multi-level keys like `/tenantId/deviceId` for both broad and narrow queries. Avoid timestamp alone as a partition key (creates hot partitions at the current time).

</details>

<details>
<summary>Hint 3: Request Unit Estimation</summary>

Cosmos DB cost fundamentals: a point read of a 1KB document costs 1 RU. Writes cost approximately 5-10 RUs per 1KB document. Queries cost varies based on complexity (cross-partition queries cost more). For 1M writes/second at 1KB each, you would need approximately 5-10 million RU/s, which would be extremely expensive. This is why document bucketing (batching 10-60 readings per document) dramatically reduces write RUs by reducing the number of individual write operations.

</details>

<details>
<summary>Hint 4: Consistency Levels and Cost</summary>

Cosmos DB consistency levels from strongest to weakest: Strong, Bounded Staleness, Session, Consistent Prefix, Eventual. Strong consistency costs 2x the RUs of eventual consistency for reads (because it must read from the quorum). Session consistency (default) provides read-your-own-writes within a session at 1x RU cost. For dashboards showing latest device state, Session consistency is often sufficient. For cross-region reads where slight staleness is acceptable, Eventual or Consistent Prefix minimizes cost.

</details>

<details>
<summary>Hint 5: Autoscale vs Provisioned Throughput</summary>

Autoscale throughput automatically scales between 10% and 100% of a configured maximum RU/s. You pay for the highest RU/s the system scales to in each hour. It is ideal for variable or unpredictable workloads. Manual provisioned throughput is cheaper when load is predictable and steady. For IoT with 1M events/second during peaks but lower volume during off-peak, autoscale prevents over-provisioning. You can also set autoscale max at 4x your baseline to handle spikes.

</details>

## Learning Resources

- [Azure Cosmos DB overview](https://learn.microsoft.com/en-us/azure/cosmos-db/introduction)
- [Choose an API in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/choose-api)
- [Partitioning and horizontal scaling in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview)
- [Consistency levels in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels)
- [Request Units in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/request-units)
- [Azure Cosmos DB autoscale provisioned throughput](https://learn.microsoft.com/en-us/azure/cosmos-db/provision-throughput-autoscale)
- [Distribute data globally with Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/distribute-data-globally)
- [Time to Live (TTL) in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/time-to-live)

## Knowledge Check

<details>
<summary>1. An IoT platform ingests 1 million events per second from globally distributed devices. Each event is a 1KB JSON document. Why is document bucketing (batching) critical for cost management in Cosmos DB?</summary>

**Document bucketing reduces the number of write operations and therefore total RU consumption.** A single 1KB write costs approximately 5-10 RUs. At 1M events/second, that would require 5-10M RU/s (costing $25,000-50,000+/month). By batching 60 readings into a single 5KB document (one per device per minute), you reduce write operations to ~16,600/second at approximately 15-20 RUs each, dramatically lowering costs to a manageable level.

</details>

<details>
<summary>2. A Cosmos DB container uses device ID as the partition key. During peak hours, 10% of devices generate 90% of the telemetry. What problem will occur and how do you solve it?</summary>

**Hot partition problem.** The 10% of high-volume devices will overwhelm their logical partitions, causing throttling (HTTP 429 errors) while other partitions remain underutilized. Solutions: (1) Use a synthetic partition key combining device ID with a time component (e.g., `deviceId_YYYYMMDD`) to distribute writes over more logical partitions; (2) Use hierarchical partition keys to add sub-partitioning; (3) Implement a write-behind buffer that batches events before writing.

</details>

<details>
<summary>3. An application reads device state from Cosmos DB. The read must reflect writes made by the same application session, but reads from other regions can be slightly stale. Which consistency level is most cost-effective?</summary>

**Session consistency.** It guarantees read-your-own-writes and monotonic reads within a single client session, costing the same as eventual consistency (1x RU for reads). Strong consistency would cost 2x RUs and is unnecessary since the requirement only mandates session-level consistency. Bounded staleness would also work but is more expensive than session consistency for single-region writes.

</details>

<details>
<summary>4. When should you choose multi-region writes in Cosmos DB versus single-region writes with multi-region reads?</summary>

**Choose multi-region writes when:** write latency from remote regions is unacceptable (devices need to write to the nearest region), or when write availability during a regional outage is required. **Choose single-region writes when:** write volume is manageable from one region, conflict resolution complexity is undesirable, consistency requirements are simpler, or cost is a primary concern (multi-write adds approximately 25% to RU costs). For IoT ingestion from globally distributed devices where low write latency is critical, multi-region writes are often justified despite the added cost and conflict resolution complexity.

</details>

## Cleanup

```bash
# Delete the Cosmos DB account and associated resources
az group delete --name rg-sensorgrid-cosmos --yes --no-wait

# If you created a separate resource group for Table Storage testing
az group delete --name rg-sensorgrid-table --yes --no-wait
```

---

**Next**: [Challenge 19: Design an Unstructured Data Solution](/docs/az-305/data-storage/challenge-19)
