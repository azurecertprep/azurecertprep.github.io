---
sidebar_position: 5
title: "Challenge 38: Design a Messaging Architecture"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 38: Design a Messaging Architecture

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $3-10 | **Exam Weight: 30-35%**

:::

## Introduction

MegaMart is an online marketplace processing 500,000 orders per day across 10,000 sellers. The order processing pipeline is the backbone of the business, and any failure in message delivery means lost revenue and damaged seller relationships. The current system has three critical problems: (1) duplicate orders are occasionally processed when retries occur during network timeouts, costing the company $200K/year in duplicate refunds; (2) premium customers (paying $99/year for priority processing) see their orders processed at the same speed as free-tier customers, violating the premium SLA; (3) complex orders requiring multi-step orchestration (payment verification, inventory reservation, shipping label generation) sometimes get stuck in an inconsistent state when a downstream service fails.

The architecture team needs to design a messaging solution that guarantees exactly-once processing, supports priority-based message routing, handles multi-step transactions reliably, and maintains delivery guarantees even when downstream services experience extended outages (up to 4 hours).

## Exam Skills Covered

- Recommend a messaging architecture

## Design Tasks

### Part 1: Messaging Service Selection

1. Compare Azure messaging services for the order processing pipeline:

| Feature | Azure Service Bus | Azure Storage Queues | Azure Event Grid |
|---------|-------------------|---------------------|------------------|
| Max message size | 256 KB (Standard) / 100 MB (Premium) | 64 KB | 1 MB |
| Message ordering | Sessions (FIFO) | No guarantee | No guarantee |
| Duplicate detection | Built-in (time window) | None | Built-in (24-hour) |
| Dead-letter queue | Yes | No | Yes |
| Transactions | Yes | No | No |
| Max queue size | 1-80 GB | 500 TB | N/A (push delivery) |
| Delivery guarantee | At-least-once / At-most-once | At-least-once | At-least-once |

2. Justify why Azure Service Bus is required over Storage Queues for this scenario. Identify which specific features (sessions, duplicate detection, dead-letter, transactions) map to which business problems.

3. Determine whether Service Bus Standard or Premium tier is needed. Consider:
   - Message volume: 500,000 orders/day = ~350/minute average, 2,000/minute peak
   - Feature requirements: duplicate detection, sessions, transactions
   - Network isolation: Does the system need private endpoints?

### Part 2: Exactly-Once Processing Design

4. Design the duplicate detection strategy:
   - Service Bus provides duplicate detection within a configurable time window (up to 7 days)
   - What should the `MessageId` be set to for order messages? (Order ID? Transaction ID?)
   - What is the duplicate detection time window appropriate for order retries?
   - How does this interact with client-side retry logic?

5. Implement the exactly-once processing pattern at the consumer side:
   - Service Bus guarantees at-least-once delivery; how do you achieve exactly-once semantics?
   - Design idempotent message processing: check-then-process with a deduplication store
   - What happens if the consumer crashes after processing but before completing the message?
   - How does PeekLock mode prevent duplicate processing vs. ReceiveAndDelete mode?

6. Document the message lifecycle for an order:
   - Producer sends message with MessageId = OrderId
   - Duplicate detection rejects retransmissions within the detection window
   - Consumer receives message in PeekLock mode
   - Consumer processes order and writes to database in a transaction
   - Consumer completes (acknowledges) the message
   - If processing fails, message returns to queue after lock expires

### Part 3: Priority Queue Design

7. Design the priority routing architecture for premium vs standard orders:
   - **Option A**: Separate queues (premium-orders, standard-orders) with different consumer allocation
   - **Option B**: Single queue with message properties and consumer-side filtering
   - **Option C**: Service Bus Topics with subscriptions filtered by customer tier

8. Evaluate each option:
   - Option A: How do you ensure premium queue is always serviced first?
   - Option B: Does consumer-side filtering create head-of-line blocking?
   - Option C: How do topic subscriptions with SQL filters route messages by priority?

9. Design the consumer allocation strategy:
   - If using separate queues: allocate 70% of consumers to premium, 30% to standard
   - Implement the competing consumers pattern for horizontal scaling
   - How do you prevent starvation of standard orders during premium traffic spikes?

### Part 4: Multi-Step Transaction Orchestration

10. Design the order fulfillment saga using Service Bus:
    - Step 1: Verify payment (call Payment Service via queue)
    - Step 2: Reserve inventory (call Inventory Service via queue)
    - Step 3: Generate shipping label (call Shipping Service via queue)
    - Each step must either complete or trigger compensation for previous steps

11. Implement reliable messaging for the orchestration:
    - Use Service Bus sessions to maintain order of operations per order (session ID = Order ID)
    - Use transactions to atomically receive a message and send the next step's message
    - Use dead-letter queues for messages that fail after maximum retry attempts

12. Design the dead-letter queue processing strategy:
    - What conditions should send a message to the dead-letter queue?
    - How should dead-lettered messages be monitored and alerted on?
    - Design the manual review process for dead-lettered orders
    - What is the retention policy for dead-letter messages?

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-38"
  items={[
    "Service Bus selected over Storage Queues with feature-based justification",
    "Duplicate detection configured with appropriate MessageId strategy and time window",
    "Exactly-once processing pattern designed using PeekLock and idempotent consumers",
    "Priority routing architecture chosen (separate queues or topic subscriptions) with consumer allocation",
    "Multi-step saga orchestration uses sessions and transactions for consistency",
    "Dead-letter queue strategy includes monitoring, alerting, and manual review process"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Duplicate Detection Configuration</summary>

Service Bus duplicate detection works by maintaining a hash table of MessageIds for a configurable window:
- Set `MessageId` to a business-meaningful identifier (e.g., `OrderId` or `OrderId-AttemptTimestamp`)
- Configure `DuplicateDetectionHistoryTimeWindow` to cover your retry window (e.g., 10 minutes for API retries)
- Messages with the same MessageId within the window are silently dropped
- The sender receives success (does not know the message was deduplicated)

Important: This only prevents duplicate sends. To prevent duplicate processing, you still need idempotent consumers (using PeekLock + deduplication store in the database).

</details>

<details>
<summary>Hint 2: Priority Queue with Topics</summary>

The recommended pattern for priority messaging uses Service Bus Topics with SQL filter subscriptions:

```
Topic: orders
├── Subscription: premium-orders
│   └── SQL Filter: CustomerTier = 'Premium'
│   └── 8 competing consumers
├── Subscription: standard-orders
│   └── SQL Filter: CustomerTier = 'Standard'
│   └── 4 competing consumers
```

Benefits over separate queues:
- Single publisher (does not need routing logic)
- Filters are evaluated server-side (no client-side filtering)
- Easy to add new priority levels without changing producers
- Each subscription has its own dead-letter queue

Prevent starvation by ensuring at least 2 consumers always process the standard subscription.

</details>

<details>
<summary>Hint 3: Service Bus Transactions</summary>

Service Bus supports transactions for atomic operations within a single entity or across entities in the same namespace (using the "via" or "transfer" pattern):

```csharp
using (var ts = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
{
    // Receive message from step-1 queue
    var msg = await receiver.ReceiveMessageAsync();
    
    // Send next step message to step-2 queue
    await sender.SendMessageAsync(new ServiceBusMessage("step2-payload"));
    
    // Complete the original message
    await receiver.CompleteMessageAsync(msg);
    
    ts.Complete(); // All three operations commit atomically
}
```

If any operation fails, all are rolled back. This ensures no message is lost or duplicated between saga steps.

</details>

<details>
<summary>Hint 4: Dead-Letter Queue Best Practices</summary>

Messages are dead-lettered when:
- MaxDeliveryCount is exceeded (default: 10 attempts)
- Message TTL expires
- Subscription filter evaluation fails
- Consumer explicitly dead-letters the message (e.g., poison message detected)

Design your DLQ strategy:
1. Monitor DLQ depth with Azure Monitor alerts (alert if depth > 0)
2. Set up a DLQ processor Function that logs details to Application Insights
3. Create an admin dashboard for manual review and resubmission
4. Retain dead-lettered messages for 14 days (configurable TTL)
5. Categorize DLQ reasons: transient (resubmit after fix) vs permanent (requires manual intervention)

</details>

## Learning Resources

- [Azure Service Bus overview](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview)
- [Service Bus message sessions (FIFO)](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions)
- [Service Bus duplicate detection](https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection)
- [Service Bus dead-letter queues](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues)
- [Competing Consumers pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/competing-consumers)

## Knowledge Check

<details>
<summary>1. A consumer processes an order message and writes to the database, but crashes before calling Complete() on the Service Bus message. What happens?</summary>

**The message lock expires and the message becomes available for reprocessing.** In PeekLock mode, the message is locked for a configurable duration (default 30 seconds, max 5 minutes). If the consumer does not call Complete() before the lock expires (due to crash or timeout), Service Bus makes the message visible to other consumers. The delivery count increments. To prevent double-processing, the consumer must check the database for an existing processed order before re-executing business logic (idempotent processing). After MaxDeliveryCount is reached, the message is dead-lettered.

</details>

<details>
<summary>2. Why are Azure Storage Queues insufficient for an order processing system that requires exactly-once delivery semantics?</summary>

**Storage Queues lack duplicate detection, transactions, dead-letter queues, and message sessions.** Without built-in duplicate detection, the application must implement its own deduplication logic entirely. Without transactions, you cannot atomically receive a message and send a follow-up message. Without dead-letter queues, poison messages must be handled manually. Without sessions, FIFO ordering per customer is impossible. Storage Queues are designed for simple, high-volume scenarios where at-least-once delivery is acceptable and the application handles all advanced semantics itself.

</details>

<details>
<summary>3. An order requires payment, then inventory reservation, then shipping label generation. If inventory reservation fails, how should the system compensate?</summary>

**Issue a compensating transaction to reverse the payment, then notify the customer.** This is the Saga pattern: each step has a corresponding compensation action. Using Service Bus sessions (session ID = Order ID), the orchestrator tracks which steps completed. When Step 2 (inventory) fails, the orchestrator sends a "reverse payment" message to the Payment Service queue. Service Bus transactions ensure the "compensation message send" and "original message complete" are atomic. The dead-letter queue captures orders that fail compensation, requiring manual review.

</details>

<details>
<summary>4. How does the competing consumers pattern improve throughput for order processing?</summary>

**Multiple consumer instances read from the same queue concurrently, distributing the processing load.** With a single consumer processing 500,000 orders/day at 1 second per order, throughput is limited to 86,400/day. With 10 competing consumers, throughput increases to 864,000/day. Service Bus ensures each message is locked to one consumer at a time (PeekLock), preventing double-processing. Auto-scaling consumers based on queue depth ensures the system handles peak load without over-provisioning during quiet periods. The pattern works with both queues and topic subscriptions.

</details>

## Cleanup

```bash
# If you created Service Bus resources for testing:
az group delete --name rg-messaging-design --yes --no-wait
```

---

**Next**: [Challenge 39: Design an Event-Driven Architecture](/docs/az-305/infrastructure/challenge-39)
