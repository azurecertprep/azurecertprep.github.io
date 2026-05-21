---
sidebar_position: 5
title: "Challenge 18: Design a Semi-Structured Data Solution"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 18: design a Semi-Structured Data solution

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $10-25 | **Exam Weight: 20-25%**

:::

## Introduction

SensorGrid is an industrial IoT platform that monitors 50,000 devices deployed across manufacturing facilities in North America, Europe, and Asia-Pacific. Each device transmits telemetry events (temperature, vibration, pressure, humidity) every 5 seconds, resulting in approximately 1 million events per second at peak. Events are JSON documents with a variable schema: different device types include different sensor readings, firmware versions add new fields over time, and some events include nested arrays of sub-readings.

The platform has two primary access patterns. First, operators need real-time dashboards showing the latest state of any device with sub-10ms read latency (point reads by device ID). Second, engineers run historical analytics queries spanning days or weeks of data for a specific facility or device type, where response times of 2-5 seconds are acceptable. The current data volume is 2TB and grows by 500GB per month.

SensorGrid's budget for the data layer is $3,000/month. The CTO wants to minimize operational overhead (no managing clusters or shards manually) and requires multi-region availability with automatic failover. The engineering team has experience with MongoDB query syntax from a previous project but is open to other APIs if the trade-offs justify it. Data retention policy requires hot data for 90 days, after which it should be archived or moved to cold storage to control costs.

## Exam skills covered

- Recommend a solution for storing semi-structured data

## Design tasks

### Part 1: Service and API selection

1. Evaluate Azure Cosmos DB as the primary data store for SensorGrid's requirements. Compare it against alternatives (Azure Table Storage, MongoDB Atlas on Azure) and justify your recommendation.
2. Select the most appropriate Cosmos DB API for this workload. Compare NoSQL (native), MongoDB, PostgreSQL, Cassandra, and Gremlin APIs. Consider the team's MongoDB experience, the query patterns required, and long-term flexibility.
3. If you recommend the NoSQL API, explain how SQL-like queries and the change feed provide advantages over the MongoDB API for this IoT scenario. If you recommend MongoDB API, explain how wire protocol compatibility reduces migration effort.
4. Evaluate whether Azure Table Storage could handle any portion of this workload at lower cost (for simpler key-value lookups of device state).

### Part 2: Data modeling and partitioning

5. Design the partition key strategy for the telemetry events container. Evaluate candidates: device ID, facility ID, device type, timestamp, or a synthetic key combining multiple fields. Consider the access patterns (point reads by device, range queries by time, queries by facility).
6. Calculate the expected RU (Request Unit) consumption for the two primary access patterns: (a) point read of latest device state, (b) query returning 1 hour of history for a single device. Estimate the provisioned throughput needed.
7. Design the document structure for telemetry events. Decide whether to store each reading as an individual document or batch multiple readings into a single document (bucketing pattern). Analyze the trade-offs in RU cost, query flexibility, and write throughput.
8. Design a TTL (time-to-live) strategy to automatically expire data after 90 days, reducing storage costs without manual cleanup jobs.

### Part 3: consistency and global distribution

9. Select the appropriate consistency level for each access pattern: (a) real-time dashboard reads (latest device state), (b) historical analytics queries. Evaluate strong, bounded staleness, session, consistent prefix, and eventual consistency. Document the RU cost implications of each level.
10. Design the multi-region deployment topology. Determine which regions should have write capability (single-write vs multi-write) and how many read regions to deploy given the device distribution.
11. Evaluate multi-region writes for scenarios where devices in each region write to the nearest Cosmos DB instance. Address conflict resolution strategy (Last Writer Wins vs custom merge procedures).
12. Design a cost optimization strategy including autoscale throughput, serverless tier for development environments, and hierarchical partition keys for improved data distribution.

## Success criteria

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

## Learning resources

- [Azure Cosmos DB overview](https://learn.microsoft.com/en-us/azure/cosmos-db/introduction)
- [Choose an API in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/choose-api)
- [Partitioning and horizontal scaling in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview)
- [Consistency levels in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels)
- [Request Units in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/request-units)
- [Azure Cosmos DB autoscale provisioned throughput](https://learn.microsoft.com/en-us/azure/cosmos-db/provision-throughput-autoscale)
- [Distribute data globally with Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/distribute-data-globally)
- [Time to Live (TTL) in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/time-to-live)

## Knowledge check

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

## Validation lab

This lab demonstrates that Cosmos DB architectural decisions -- partition key choice, consistency levels, and TTL -- produce measurable behavioral differences you can observe directly. You will not just create resources; you will see how design choices manifest as RU cost, query performance, and automatic data lifecycle management.

### Step 1: create the Cosmos DB account and container

```bash
az group create \
  --name rg-az305-challenge18 \
  --location eastus
```

```bash
COSMOS_ACCOUNT="cosmos-ch18-${RANDOM}"
```

```bash
az cosmosdb create \
  --name "$COSMOS_ACCOUNT" \
  --resource-group rg-az305-challenge18 \
  --locations regionName=eastus failoverPriority=0 \
  --capabilities EnableServerless \
  --default-consistency-level Session
```

```bash
az cosmosdb sql database create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group rg-az305-challenge18 \
  --name SensorData
```

```bash
az cosmosdb sql container create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group rg-az305-challenge18 \
  --database-name SensorData \
  --name Telemetry \
  --partition-key-path "/deviceId" \
  --ttl -1
```

Setting `--ttl -1` enables TTL at the container level but requires each document to specify its own TTL value. This gives per-document control over expiration.

### Step 2: insert documents with different partition keys

Retrieve the account endpoint and key:

```bash
COSMOS_KEY=$(az cosmosdb keys list \
  --name "$COSMOS_ACCOUNT" \
  --resource-group rg-az305-challenge18 \
  --query primaryMasterKey -o tsv)
```

```bash
COSMOS_ENDPOINT=$(az cosmosdb show \
  --name "$COSMOS_ACCOUNT" \
  --resource-group rg-az305-challenge18 \
  --query documentEndpoint -o tsv)
```

Insert telemetry documents across multiple partitions:

```bash
az cosmosdb sql container create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group rg-az305-challenge18 \
  --database-name SensorData \
  --name TelemetryTest \
  --partition-key-path "/deviceId" \
  --ttl -1
```

Use the REST API or Data Explorer in the portal to insert these documents. Alternatively, use a short script:

```bash
pip install azure-cosmos --quiet
```

```bash
python3 -c "
from azure.cosmos import CosmosClient, PartitionKey
import os, time

client = CosmosClient(os.environ.get('COSMOS_ENDPOINT', '${COSMOS_ENDPOINT}'),
                      os.environ.get('COSMOS_KEY', '${COSMOS_KEY}'))
db = client.get_database_client('SensorData')
container = db.get_container_client('Telemetry')

# Insert documents across 3 different partitions
docs = [
    {'id': 'reading-001', 'deviceId': 'device-A', 'temp': 72.1, 'facility': 'us-east'},
    {'id': 'reading-002', 'deviceId': 'device-A', 'temp': 72.4, 'facility': 'us-east'},
    {'id': 'reading-003', 'deviceId': 'device-A', 'temp': 71.9, 'facility': 'us-east'},
    {'id': 'reading-004', 'deviceId': 'device-B', 'temp': 68.2, 'facility': 'eu-west'},
    {'id': 'reading-005', 'deviceId': 'device-B', 'temp': 68.5, 'facility': 'eu-west'},
    {'id': 'reading-006', 'deviceId': 'device-C', 'temp': 80.0, 'facility': 'ap-south'},
]

for doc in docs:
    result = container.create_item(body=doc)
    print(f'Inserted {doc[\"id\"]} into partition {doc[\"deviceId\"]}')
    # Show the RU charge for each write (returned in response headers)
    print(f'  Write cost: {result.get(\"_ts\", \"N/A\")} - check Azure Portal Metrics for RU details')
"
```

### Step 3: compare single-partition vs cross-partition query cost

```bash
python3 -c "
from azure.cosmos import CosmosClient
import os

client = CosmosClient('${COSMOS_ENDPOINT}', '${COSMOS_KEY}')
db = client.get_database_client('SensorData')
container = db.get_container_client('Telemetry')

# Single-partition query (targets device-A only)
print('=== Single-Partition Query (deviceId = device-A) ===')
items = container.query_items(
    query='SELECT * FROM c WHERE c.deviceId = \"device-A\"',
    partition_key='device-A',
    populate_query_metrics=True
)
item_list = []
for item in items:
    item_list.append(item)
# Access request charge from the query iterable's response headers
print(f'Results: {len(item_list)} documents')
print(f'RU cost: {items.get_response_headers()[\"x-ms-request-charge\"]} RUs')
print()

# Cross-partition query (scans ALL partitions)
print('=== Cross-Partition Query (all devices, filter by facility) ===')
items2 = container.query_items(
    query='SELECT * FROM c WHERE c.facility = \"us-east\"',
    enable_cross_partition_query=True,
    populate_query_metrics=True
)
item_list2 = []
for item in items2:
    item_list2.append(item)
print(f'Results: {len(item_list2)} documents')
print(f'RU cost: {items2.get_response_headers()[\"x-ms-request-charge\"]} RUs')
"
```

:::note[Architect Insight]
Observe that the cross-partition query costs significantly more RUs than the single-partition query, even when returning fewer or equal results. This is because Cosmos DB must fan out the query to every physical partition. On the AZ-305 exam, questions about "minimizing RU consumption" almost always hinge on whether the query is single-partition or cross-partition. Your partition key choice determines this at design time, not at query time.
:::

### Step 4: change consistency level and observe RU impact

Lower the account default consistency from Session to Eventual:

```bash
az cosmosdb update \
  --name "$COSMOS_ACCOUNT" \
  --resource-group rg-az305-challenge18 \
  --default-consistency-level Eventual
```

Re-run the same single-partition query:

```bash
python3 -c "
from azure.cosmos import CosmosClient
import os

client = CosmosClient('${COSMOS_ENDPOINT}', '${COSMOS_KEY}')
db = client.get_database_client('SensorData')
container = db.get_container_client('Telemetry')

print('=== Query with Eventual Consistency ===')
items = list(container.query_items(
    query='SELECT * FROM c WHERE c.deviceId = \"device-A\"',
    partition_key='device-A'
))
print(f'Results: {len(items)} documents')
print(f'RU cost: {container.client_connection.last_response_headers[\"x-ms-request-charge\"]} RUs')
print()
print('Compare this RU cost to the Session consistency query above.')
print('Eventual consistency can reduce read costs because replicas do not')
print('need to confirm they have the latest write before responding.')
"
```

:::note[Architect Insight]
Consistency levels are a performance lever, not just a correctness knob. Strong consistency costs 2x RUs for reads because it requires quorum confirmation. Session consistency (the default) costs 1x and guarantees read-your-own-writes. Eventual consistency may cost less in multi-region scenarios. On the exam, the correct answer depends on whether the scenario tolerates stale reads -- IoT dashboards often can, financial transactions cannot.
:::

### Step 5: test TTL -- automatic document expiration

Insert a document with a short TTL (30 seconds):

```bash
python3 -c "
from azure.cosmos import CosmosClient
import os, time

client = CosmosClient('${COSMOS_ENDPOINT}', '${COSMOS_KEY}')
db = client.get_database_client('SensorData')
container = db.get_container_client('Telemetry')

# Insert with 30-second TTL
doc = {
    'id': 'ephemeral-reading',
    'deviceId': 'device-A',
    'temp': 99.9,
    'ttl': 30
}
container.create_item(body=doc)
print('Inserted document with TTL=30 seconds')

# Confirm it exists
result = container.read_item(item='ephemeral-reading', partition_key='device-A')
print(f'Document exists: {result[\"id\"]} (temp={result[\"temp\"]})')

print('Waiting 40 seconds for TTL expiration...')
time.sleep(40)

# Try to read it again
try:
    result = container.read_item(item='ephemeral-reading', partition_key='device-A')
    print(f'Document still exists (TTL has not fired yet -- may take up to 60s)')
except Exception as e:
    print(f'Document GONE -- TTL expired it automatically')
    print(f'Error: {e}')
"
```

:::note[Architect Insight]
TTL eliminates the need for manual cleanup jobs, scheduled functions, or batch deletion scripts. For IoT telemetry with a 90-day retention policy, setting TTL to 7776000 seconds means data automatically disappears without any application logic. This reduces operational complexity AND cost (no compute resources running cleanup). The exam tests whether you know that TTL is the correct tool for "automatically expire data after N days" requirements.
:::

:::tip[Design Validation]
This lab proved three Cosmos DB architectural principles: (1) Partition key choice directly determines query cost -- single-partition queries are dramatically cheaper than cross-partition queries. (2) Consistency levels are a performance lever -- weaker consistency reduces RU consumption when the application tolerates stale reads. (3) TTL automates data lifecycle without application code -- documents disappear on schedule with zero operational overhead.
:::

## Cleanup

```bash
az cosmosdb delete \
  --name "$COSMOS_ACCOUNT" \
  --resource-group rg-az305-challenge18 \
  --yes
```

```bash
az group delete \
  --name rg-az305-challenge18 \
  --yes --no-wait
```

---

**Next**: [Challenge 19: Design an Unstructured Data Solution](/docs/az-305/data-storage/challenge-19)
