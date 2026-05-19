---
sidebar_position: 6
title: "Challenge 39: Design an Event-Driven Architecture"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 39: Design an Event-Driven Architecture

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $5-15 | **Exam Weight: 30-35%**

:::

## Introduction

SmartSpace Technologies operates a smart building platform that monitors 10,000 IoT sensors deployed across 50 commercial buildings. Sensors report temperature, humidity, occupancy, and energy consumption data every 5 seconds, generating approximately 120,000 events per minute (2,000 events per second sustained, with spikes to 5,000/second during building opening hours). The platform must handle four distinct event processing scenarios with different latency and durability requirements.

Scenario 1 (Real-time alerts): When a temperature sensor exceeds 35C or occupancy exceeds fire safety limits, an alert must reach building management within 2 seconds. Scenario 2 (Near-real-time dashboards): Building operations dashboards must update within 10-15 seconds to show current conditions across all floors. Scenario 3 (Event archive): All sensor events must be archived for 7 years to support ML model training and regulatory compliance audits. Scenario 4 (Automated responses): When specific conditions are met (e.g., occupancy drops to zero AND energy consumption exceeds threshold), the platform must trigger automated actions (adjust HVAC setpoints, dim lights, send maintenance notifications).

The challenge is designing an event-driven architecture that routes events to the appropriate processing pipeline based on the latency and durability requirements of each scenario.

## Exam Skills Covered

- Recommend an event-driven architecture

## Design Tasks

### Part 1: Event Ingestion Service Selection

1. Compare Azure event ingestion services for 2,000-5,000 events/second:

| Feature | Event Hubs | Event Grid | IoT Hub |
|---------|-----------|-----------|---------|
| Throughput | Millions/second | 10M events/second | Hundreds of thousands/second |
| Protocol | AMQP, Kafka, HTTPS | HTTP, MQTT (for IoT) | MQTT, AMQP, HTTPS |
| Consumer model | Pull (consumer groups) | Push (subscriptions) | Pull (consumer groups) + routing |
| Message retention | 1-7 days (Standard), up to 90 days (Premium/Dedicated) | 24 hours (retry) | 1-7 days |
| Ordering | Per-partition | No guarantee | Per-device |
| Device management | No | No | Yes (device twin, C2D) |
| Cost model | Per throughput unit | Per event | Per message + per device |

2. Determine the primary ingestion service:
   - Should IoT sensors connect directly to Event Hubs, or should IoT Hub be the entry point?
   - If IoT Hub: How does message routing direct events to downstream services?
   - What role does Event Grid play in this architecture (event distribution vs event ingestion)?

3. Design the Event Hubs configuration:
   - How many partitions are needed for 5,000 events/second peak throughput?
   - How many throughput units (Standard) or processing units (Premium)?
   - What is the partition key strategy? (Building ID? Sensor type? Floor?)

### Part 2: Real-Time Alert Processing (Scenario 1)

4. Design the real-time alert pipeline (2-second latency requirement):
   - Event source: Event Hubs (or IoT Hub route)
   - Processing: Evaluate threshold rules in-stream
   - Output: Push notification to building management

5. Evaluate processing options for threshold detection:
   - **Azure Stream Analytics**: SQL-like queries, windowed aggregations, reference data joins
   - **Azure Functions (Event Hub trigger)**: Custom code, per-event processing
   - **Spark Structured Streaming (Databricks)**: Complex analytics, ML inference

6. For the 2-second SLA, which processing option provides the lowest latency? Design the alert rule logic (e.g., temperature > 35C for 3 consecutive readings within 30 seconds, to avoid false positives from sensor noise).

### Part 3: Event Distribution with Event Grid (Scenario 4)

7. Design the automated response system using Event Grid:
   - Define custom events for building conditions (OccupancyZero, EnergyAnomaly, TemperatureExceedance)
   - Create Event Grid topics for each building or a single topic with subject filtering
   - Design subscriptions that trigger different Azure Functions based on event type

8. Configure Event Grid filtering:
   - Subject prefix filter: `/buildings/building-42/floors/3/`
   - Advanced filter: `data.temperature > 35 AND data.sensorType == 'ambient'`
   - Determine which filtering level (subject vs advanced) is appropriate for each scenario

9. Design the fan-out pattern:
   - One event (e.g., OccupancyZero) must trigger multiple actions simultaneously:
     - Adjust HVAC setpoints (call Building Management API)
     - Dim lights (call Lighting Control API)
     - Log to audit trail (write to Cosmos DB)
   - How does Event Grid guarantee delivery to all subscribers?
   - What happens if one subscriber is temporarily unavailable?

### Part 4: Event Archive and Long-Term Storage (Scenario 3)

10. Design the event archival strategy for 7-year retention:
    - **Event Hubs Capture**: Automatically writes events to Azure Storage or Data Lake in Avro format
    - Configure capture window: time-based (every 5 minutes) vs size-based (every 256 MB)
    - Design the folder structure: `{Namespace}/{EventHub}/{PartitionId}/{Year}/{Month}/{Day}/{Hour}/{Minute}`

11. Calculate storage requirements:
    - 120,000 events/minute x 60 x 24 x 365 x 7 years
    - Average event size: 500 bytes
    - Total raw storage: estimate and identify the appropriate storage tier
    - When should data move from Hot to Cool to Archive tier?

12. Design the data lake structure for ML model training:
    - Raw events in Avro (immutable, append-only)
    - Curated datasets in Parquet (aggregated, optimized for analytics)
    - How does the ML team query 7 years of sensor data efficiently?

### Part 5: Consumer Group Strategy

13. Design the consumer group allocation for Event Hubs:
    - Consumer Group 1: Real-time alert processor (Stream Analytics)
    - Consumer Group 2: Dashboard update service (Functions)
    - Consumer Group 3: Event Hubs Capture (archival)
    - Consumer Group 4: ML feature pipeline (Databricks)

14. Explain why each consumer needs its own consumer group and what happens if two different applications share a consumer group.

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-39"
  items={[
    "Correct ingestion service selected (IoT Hub or Event Hubs) with device management rationale",
    "Real-time alert pipeline meets 2-second latency SLA with false-positive mitigation",
    "Event Grid configured for automated responses with filtering and fan-out patterns",
    "Event Hubs Capture configured for 7-year archival with storage tier lifecycle policy",
    "Consumer group strategy allocates independent readers for each processing scenario",
    "Architecture clearly separates concerns: ingestion, processing, distribution, and storage"
  ]}
/>

## Hints

<details>
<summary>Hint 1: IoT Hub vs Event Hubs as Entry Point</summary>

Use **IoT Hub** when you need:
- Per-device identity and authentication (X.509 certificates, SAS tokens per device)
- Device twin management (desired/reported properties)
- Cloud-to-device (C2D) commands (e.g., telling a sensor to recalibrate)
- Message routing rules that direct events to different endpoints based on message properties

Use **Event Hubs** directly when:
- Devices are managed by another system (e.g., a gateway that aggregates sensor data)
- You only need high-throughput event ingestion without device management
- The Kafka protocol compatibility is needed

For 10,000 IoT sensors, IoT Hub is recommended because you need per-device identity, firmware updates, and the ability to send commands back to sensors. IoT Hub has a built-in Event Hub-compatible endpoint for downstream processing.

</details>

<details>
<summary>Hint 2: Event Hubs Partition Strategy</summary>

Partitions determine parallelism:
- Each partition supports up to 1 MB/second ingress (Standard) or 20 MB/second (Premium)
- 5,000 events/second at 500 bytes each = 2.5 MB/second ingress
- Standard tier: Need at least 3 partitions (1 MB/s each)
- Recommended: 8-16 partitions for headroom and parallel consumers

Partition key strategy:
- **Building ID**: All events from one building go to the same partition (good for per-building processing order)
- **Sensor ID**: Even distribution but no building-level ordering
- **Random (null key)**: Best throughput distribution, no ordering guarantees

For this scenario, Building ID as partition key ensures all events from a building are processed in order by the alert system, enabling multi-sensor correlation within a building.

</details>

<details>
<summary>Hint 3: Event Grid Delivery Guarantees</summary>

Event Grid provides at-least-once delivery with retry:
- Default retry policy: 30 attempts over 24 hours with exponential backoff
- If a subscriber fails all retries, events go to a dead-letter container (must be configured)
- Each subscription delivers independently (fan-out is parallel)
- Subscriber unavailability does not block delivery to other subscribers

Configure dead-letter destination (Azure Blob Storage) for each subscription to capture undeliverable events. Set up Azure Monitor alerts on dead-letter count > 0.

Event Grid also supports batching (up to 5,000 events per delivery) and output schema customization (Event Grid schema, CloudEvents schema, or custom input schema).

</details>

<details>
<summary>Hint 4: Storage Calculation for 7-Year Archive</summary>

Calculation:
- 120,000 events/minute x 60 minutes x 24 hours x 365 days = ~63 billion events/year
- 63B events x 500 bytes = ~31.5 TB/year raw
- 7 years = ~220 TB raw (before compression)
- Avro with compression: ~50-70% reduction = ~66-110 TB actual storage

Storage tier strategy:
- Last 30 days: Hot tier ($0.018/GB/month) for active dashboards
- 30 days to 1 year: Cool tier ($0.01/GB/month) for ad-hoc analysis
- 1-7 years: Archive tier ($0.002/GB/month) for compliance retention

Lifecycle management policy automates tier transitions. Total estimated cost: approximately $300-500/month for the full 7-year archive.

</details>

## Learning Resources

- [Azure Event Hubs overview](https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-about)
- [Azure Event Grid overview](https://learn.microsoft.com/en-us/azure/event-grid/overview)
- [Event Hubs Capture](https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-capture-overview)
- [IoT Hub message routing](https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-messages-d2c)
- [Choose between Azure messaging services](https://learn.microsoft.com/en-us/azure/service-bus-messaging/compare-messaging-services)

## Knowledge Check

<details>
<summary>1. Two applications read from the same Event Hub using the same consumer group. What problem occurs?</summary>

**The applications compete for partitions and each receives only a subset of events.** Within a consumer group, each partition is assigned to at most one consumer instance. If Application A and Application B share a consumer group across 8 partitions, they split ownership (e.g., A gets partitions 0-3, B gets partitions 4-7). Neither application sees all events. To allow both applications to independently read all events, they must use separate consumer groups. Each consumer group maintains its own read position (offset) per partition.

</details>

<details>
<summary>2. Why is Event Grid better than Event Hubs for the automated response scenario (fan-out to multiple subscribers)?</summary>

**Event Grid uses push-based delivery to multiple subscribers simultaneously, while Event Hubs requires each subscriber to pull and maintain its own offset.** For automated responses where one event must trigger 3-5 different actions (HVAC, lighting, audit), Event Grid natively supports multiple subscriptions per topic, each receiving the event independently with its own retry policy and dead-letter configuration. With Event Hubs, you would need each action handler to poll the hub, maintain checkpoints, and process all events even when only a subset are relevant. Event Grid's server-side filtering reduces unnecessary processing.

</details>

<details>
<summary>3. Event Hubs Capture writes events to Blob Storage every 5 minutes or every 256 MB, whichever comes first. Why not capture every 1 second for lower archival latency?</summary>

**Frequent capture creates excessive small files that degrade downstream query performance and increase storage transactions costs.** Each capture window creates a separate Avro file. Capturing every second would produce 86,400 files per partition per day. Analytic engines (Spark, Synapse) perform poorly scanning millions of tiny files versus fewer larger files. The 5-minute window balances archival latency (maximum 5-minute delay) against file size optimization. If near-real-time archival is needed, use a dedicated consumer group writing to Data Lake via a custom process with file compaction.

</details>

<details>
<summary>4. A temperature alert fires when a single sensor reading exceeds 35C. The building manager reports too many false alarms from brief sensor spikes. How do you reduce false positives?</summary>

**Use a tumbling or hopping window in Stream Analytics to require multiple consecutive readings above threshold before firing an alert.** Instead of alerting on a single reading, configure the rule to require 3 consecutive readings above 35C within a 30-second window (temporal pattern matching). Stream Analytics supports `LAG()` functions and windowed aggregations for this purpose. Alternatively, use a sliding window average: alert only when the 60-second moving average exceeds 34C. This filters transient sensor noise while still detecting genuine temperature excursions within the 2-second delivery SLA.

</details>

## Validation Lab

This lab validates Event Grid's reactive architecture by observing events flow from resource changes to a storage queue in near-real-time. You will prove that events are pushed without polling, that subscription filters reduce noise, and that event-driven decoupling works at the platform level.

### Part A - Deploy Event Grid Infrastructure

1. Create the resource group:

```bash
az group create \
  --name rg-az305-challenge39 \
  --location eastus
```

2. Create a Storage Account with a queue to act as the event handler:

```bash
az storage account create \
  --resource-group rg-az305-challenge39 \
  --name stgevents39$RANDOM \
  --sku Standard_LRS \
  --location eastus
```

```bash
ST_NAME=$(az storage account list \
  --resource-group rg-az305-challenge39 \
  --query "[0].name" -o tsv)

echo "Storage account: $ST_NAME"
```

```bash
az storage queue create \
  --name event-sink \
  --account-name $ST_NAME
```

3. Create an Event Grid system topic on the resource group to monitor resource-level events:

```bash
RG_ID=$(az group show \
  --name rg-az305-challenge39 \
  --query "id" -o tsv)

az eventgrid system-topic create \
  --resource-group rg-az305-challenge39 \
  --name systopic-rg-events \
  --topic-type Microsoft.Resources.ResourceGroups \
  --source "$RG_ID" \
  --location eastus
```

### Part B - Subscribe to Resource Creation Events

4. Create an event subscription that routes resource write (creation) events to the storage queue:

```bash
ST_ID=$(az storage account show \
  --resource-group rg-az305-challenge39 \
  --name $ST_NAME \
  --query "id" -o tsv)

az eventgrid system-topic event-subscription create \
  --resource-group rg-az305-challenge39 \
  --system-topic-name systopic-rg-events \
  --name sub-all-writes \
  --endpoint-type storagequeue \
  --endpoint "$ST_ID/queueservices/default/queues/event-sink" \
  --included-event-types Microsoft.Resources.ResourceWriteSuccess
```

:::note[Architect Insight]
Event Grid enables reactive architectures without polling. The storage queue receives events pushed by the platform within seconds of the resource change occurring. No consumer needs to poll Azure Resource Manager asking "did anything change?" -- the platform notifies subscribers proactively. This reduces latency and eliminates wasted API calls.
:::

### Part C - Trigger an Event and Verify Delivery

5. Trigger an event by creating a simple resource (a second storage account) in the resource group:

```bash
az storage account create \
  --resource-group rg-az305-challenge39 \
  --name sttrigger39$RANDOM \
  --sku Standard_LRS \
  --location eastus
```

6. Wait 15-30 seconds for Event Grid to deliver the event, then check the storage queue:

```bash
az storage message peek \
  --queue-name event-sink \
  --account-name $ST_NAME \
  --num-messages 5
```

You should see one or more messages in the queue. Each message contains the Event Grid event payload.

7. Examine the event structure. The payload includes:

- `eventType`: "Microsoft.Resources.ResourceWriteSuccess"
- `subject`: the resource ID of the created storage account
- `data`: contains resource group, resource provider, and operation details
- `eventTime`: timestamp proving near-real-time delivery

:::note[Architect Insight]
Filtering at the subscription level reduces unnecessary processing. By specifying `--included-event-types`, only resource write events reach the queue. Without filtering, delete events, action events, and other noise would also arrive, forcing the consumer to discard irrelevant messages. This filtering happens at the Event Grid platform level -- the messages never even reach the queue endpoint.
:::

### Part D - Filtered Subscription (Selective Routing)

8. Create a second queue and a filtered subscription that only captures storage account events:

```bash
az storage queue create \
  --name storage-events-only \
  --account-name $ST_NAME
```

```bash
az eventgrid system-topic event-subscription create \
  --resource-group rg-az305-challenge39 \
  --system-topic-name systopic-rg-events \
  --name sub-storage-only \
  --endpoint-type storagequeue \
  --endpoint "$ST_ID/queueservices/default/queues/storage-events-only" \
  --included-event-types Microsoft.Resources.ResourceWriteSuccess \
  --subject-begins-with "/subscriptions" \
  --advanced-filter data.resourceProvider StringContains Microsoft.Storage
```

9. Now trigger a non-storage event by creating a different resource type (a network security group):

```bash
az network nsg create \
  --resource-group rg-az305-challenge39 \
  --name nsg-filter-test
```

10. Wait 15-30 seconds, then verify the filtered subscription did NOT receive the NSG event:

```bash
az storage message peek \
  --queue-name storage-events-only \
  --account-name $ST_NAME \
  --num-messages 5
```

The `storage-events-only` queue should have no new messages from the NSG creation (or only messages from the storage account created earlier). The unfiltered `event-sink` queue will have received the NSG event:

```bash
az storage message peek \
  --queue-name event-sink \
  --account-name $ST_NAME \
  --num-messages 10
```

:::note[Architect Insight]
At-least-once delivery means consumers must be idempotent. Event Grid guarantees delivery but may deliver the same event more than once (during retries or infrastructure recovery). Consumers must handle duplicate events gracefully -- typically by checking whether the action was already performed before executing it again. This is a fundamental design principle for any event-driven architecture on the AZ-305 exam.
:::

:::tip[Design Validation]
This lab validated three architectural principles: (1) Event Grid pushes events in near-real-time without any consumer polling -- the storage queue received the event within seconds. (2) Subscription filters reduce noise at the platform level -- the filtered subscription rejected non-storage events before they reached the endpoint. (3) Event-driven architectures decouple producers from consumers -- the resource creation had no knowledge of the event subscriptions, yet the events were delivered automatically.
:::

## Cleanup

```bash
az eventgrid system-topic delete \
  --resource-group rg-az305-challenge39 \
  --name systopic-rg-events \
  --yes

az group delete --name rg-az305-challenge39 --yes --no-wait
```

---

**Next**: [Challenge 40: Design API Integration](/docs/az-305/infrastructure/challenge-40)
