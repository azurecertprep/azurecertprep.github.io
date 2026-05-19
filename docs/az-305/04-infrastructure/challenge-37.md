---
sidebar_position: 4
title: "Challenge 37: Design a Serverless Solution"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 37: design a serverless solution

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $2-10 | **Exam Weight: 30-35%**

:::

## Introduction

TicketBlitz is an event ticketing platform that experiences extreme traffic variability. When a popular concert or sporting event goes on sale, the platform receives 0 to 100,000 requests per second within seconds. Between these sale events (which happen 2-3 times per week), traffic drops to near-zero. The current fixed-infrastructure approach wastes significant budget: servers sit idle 95% of the time but must be over-provisioned to handle the 5% peak load.

In addition to the real-time ticket sales API, TicketBlitz has several background processing requirements: (1) Generate personalized PDF tickets with QR codes after each purchase (latency-tolerant, 10-30 seconds acceptable). (2) Send confirmation emails and SMS notifications after ticket generation. (3) Process a nightly batch of 50,000 refund records from a partner payment processor, applying business rules and updating the database. (4) Orchestrate a multi-step workflow for VIP ticket packages that includes seat selection, add-on services, payment processing, and confirmation, all of which must complete atomically.

The engineering team wants to minimize infrastructure management and pay only for actual execution time. They need a design that handles both the extreme burst traffic and the background batch processing with appropriate cost optimization for each pattern.

## Exam skills covered

- Recommend a serverless-based solution
- Recommend a compute solution for batch processing

## Design tasks

### Part 1: Azure Functions plan selection

1. Evaluate Azure Functions hosting plans for the ticket sales API (0 to 100K requests/second burst):

| Plan | Scale Limit | Cold Start | VNet Integration | Cost Model |
|------|-------------|------------|------------------|------------|
| Consumption | 200 instances | Yes (seconds) | No | Per-execution |
| Flex Consumption | 1000 instances | Reduced | Yes | Per-execution + always-ready |
| Premium (EP1-EP3) | 100 instances | None (pre-warmed) | Yes | Per-second + min instances |
| Dedicated (ASP) | 10-30 instances | None | Yes | Fixed monthly |

2. Determine which plan is appropriate for the ticket sales API. Consider:
   - 100,000 requests/second requires how many instances at ~100 requests/second per instance?
   - Cold start during a ticket sale event would cause failed purchases. How critical is elimination of cold starts?
   - Is the Consumption plan's 200-instance limit sufficient?

3. Evaluate whether the Flex Consumption plan with always-ready instances provides the best balance of burst capacity and cold-start mitigation for this workload.

### Part 2: background processing design

4. Design the PDF ticket generation pipeline:
   - Trigger: Queue message after successful purchase
   - Processing: Generate PDF with QR code (CPU-intensive, 2-5 seconds per ticket)
   - Output: Store PDF in blob storage, trigger notification step
   - Which Functions plan is appropriate (can tolerate cold start, cost-sensitive)?

5. Design the email/SMS notification service:
   - Should this be Azure Functions or Logic Apps?
   - Compare: Functions (code-first, full control) vs Logic Apps (connector-based, visual designer)
   - For sending emails via SendGrid and SMS via Twilio, which approach minimizes development effort?

6. Design the nightly refund batch processing:
   - 50,000 records processed nightly at 2 AM
   - Each record requires: validate, calculate refund amount, call payment API, update database
   - Evaluate: Azure Functions with queue-based fan-out vs. Azure Batch for this volume
   - What is the expected execution time and cost for 50K records?

### Part 3: Durable Functions orchestration

7. Design the VIP ticket package workflow using Durable Functions:
   - Step 1: Reserve selected seats (call Seats API)
   - Step 2: Process add-on services (food, parking, merch) - can run in parallel
   - Step 3: Charge payment (call Payment API)
   - Step 4: Generate confirmation (only if payment succeeds)
   - Step 5: Release seat reservation (only if payment fails - compensation)

8. Identify the Durable Functions patterns needed:
   - **Function chaining**: Sequential steps (reserve → pay → confirm)
   - **Fan-out/fan-in**: Parallel add-on processing
   - **Human interaction**: Timeout if user does not complete within 15 minutes
   - **Monitor**: Poll payment status until confirmed or failed

9. Design error handling for the orchestration:
   - What happens if the payment step fails after seats are reserved?
   - How do you implement the Saga pattern (compensating transactions)?
   - What is the retry policy for transient failures vs permanent failures?

### Part 4: cold start mitigation and cost optimization

10. Compare cold start mitigation strategies:
    - Pre-warmed instances (Premium plan): Always running, no cold start, higher base cost
    - Always-ready instances (Flex Consumption): Configurable minimum, per-second billing for ready instances
    - Schedule-based pre-warming: Scale up 5 minutes before known sale events

11. Calculate the monthly cost comparison:
    - Ticket sales API: 3 events/week, each lasting 30 minutes of peak traffic
    - Background processing: ~5,000 PDF generations/day, 50K refunds nightly
    - VIP orchestrations: ~500/week
    - Compare total cost across Consumption, Flex Consumption, and Premium plans

12. Design the architecture diagram showing how all components connect:
    - HTTP trigger (ticket sales) → Queue → PDF generation → Blob → Notification
    - Timer trigger (batch) → Refund processing → Payment API
    - HTTP trigger (VIP) → Durable orchestration → multiple backend APIs

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-37"
  items={[
    "Correct Functions plan selected for ticket sales API with cold-start justification",
    "Background processing designed with appropriate triggers (queue, timer, blob)",
    "Durable Functions orchestration designed for VIP workflow with error handling and Saga pattern",
    "Azure Batch vs Functions comparison documented for the 50K nightly batch workload",
    "Cost comparison completed across plan types for all workload patterns",
    "Cold start mitigation strategy addresses the critical ticket-sale burst scenario"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Functions Plan for Extreme Burst</summary>

For 100,000 requests/second:
- At ~100 requests/second per instance, you need ~1,000 concurrent instances
- **Consumption plan** maxes out at 200 instances → insufficient
- **Flex Consumption plan** supports up to 1,000 instances with faster scaling and always-ready instances
- **Premium plan** maxes out at 100 instances by default (can request increase) → likely insufficient

The Flex Consumption plan is the best fit: it supports the scale required, offers always-ready instances to eliminate cold starts for the first N instances, and provides per-execution billing for the burst instances beyond the always-ready minimum.

</details>

<details>
<summary>Hint 2: Logic Apps vs Functions Decision</summary>

Choose **Logic Apps** when:
- The workflow primarily connects existing services via connectors (400+ pre-built connectors)
- Non-developers need to build or modify workflows
- You need visual monitoring of workflow runs
- Integration patterns: B2B, EDI, SAP, Salesforce

Choose **Azure Functions** when:
- Custom business logic is required (complex calculations, data transformation)
- You need sub-second latency
- The team prefers code-first development
- Fine-grained control over retries, concurrency, and batching

For sending emails/SMS after PDF generation: Logic Apps if using standard connectors and wanting visual workflow tracking. Functions if you need custom templating logic or unified codebase.

</details>

<details>
<summary>Hint 3: Durable Functions Saga Pattern</summary>

The Saga pattern in Durable Functions uses compensating transactions:

```
try:
    seat_reservation = await reserve_seats(seats)
    addons = await process_addons_parallel(addon_list)
    payment = await charge_payment(total_amount)
    confirmation = await generate_confirmation(order)
except PaymentFailedException:
    await release_seat_reservation(seat_reservation)
    await cancel_addons(addons)
    await notify_customer_failure(customer)
```

Key design decisions:
- Each step must be idempotent (safe to retry)
- Compensating actions undo the effects of successful steps
- The orchestrator function maintains state automatically (durable state)
- Set `maxNumberOfAttempts` and `backoffCoefficient` in retry policies

</details>

<details>
<summary>Hint 4: Batch Processing at Scale</summary>

For 50,000 nightly refund records:
- **Azure Functions with queue fan-out**: Put each record on a queue, Functions processes in parallel. At ~100 messages/second with 5-second processing time, 50K records complete in ~8 minutes. Cost: ~$0.10-0.50 for execution.
- **Azure Batch**: Better for long-running compute tasks (hours), heavy-weight VMs, and when you need specific VM sizes. Overkill for 50K lightweight records.

Functions is preferred because: per-execution pricing is cheaper for short tasks, no VM management, auto-scales based on queue depth, and integrates naturally with the rest of the serverless architecture.

</details>

## Learning resources

- [Azure Functions hosting options](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale)
- [Azure Functions Flex Consumption plan](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan)
- [Durable Functions patterns](https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview)
- [Choose between Azure Functions and Logic Apps](https://learn.microsoft.com/en-us/azure/azure-functions/functions-compare-logic-apps-ms-flow-webjobs)
- [Azure Batch overview](https://learn.microsoft.com/en-us/azure/batch/batch-technical-overview)

## Knowledge check

<details>
<summary>1. A function app on the Consumption plan experiences 3-5 second cold starts during a flash sale. The business requires sub-200ms response time for the first request. Which plan change solves this?</summary>

**Move to Flex Consumption plan with always-ready instances configured.** Always-ready instances are pre-provisioned and kept warm, eliminating cold start for requests handled by those instances. Configure enough always-ready instances to handle the initial burst while the platform scales out additional instances. Alternatively, the Premium plan with minimum instances set to 1+ eliminates cold starts entirely, but at higher base cost. The Flex Consumption plan offers a middle ground: always-ready instances for baseline with per-execution scaling beyond.

</details>

<details>
<summary>2. A workflow needs to send an email via SendGrid, wait for user confirmation (up to 24 hours), then process the order. Why is Durable Functions better than a standard Function with a timer?</summary>

**Durable Functions natively supports the "wait for external event" pattern with state persistence across days.** A standard Function with a timer would need to poll a database for confirmation status, wasting executions and adding latency. Durable Functions' `WaitForExternalEvent` suspends the orchestration without consuming resources until the event arrives or the timeout expires. The orchestrator state is persisted in Azure Storage, so even if the infrastructure scales to zero during the wait period, the workflow resumes exactly where it left off when the event arrives.

</details>

<details>
<summary>3. A nightly batch processes 50,000 records with 5 seconds of compute per record. Should you use Azure Batch or Azure Functions with queue-based fan-out?</summary>

**Azure Functions with queue-based fan-out.** Azure Batch is designed for long-running, compute-intensive parallel workloads (rendering, simulations, genomics) where individual tasks take minutes to hours. For 50K lightweight records at 5 seconds each, Functions provides: automatic scaling based on queue depth, per-execution pricing (cheaper for short tasks), no VM provisioning delay, and seamless integration with the existing serverless architecture. The total compute is approximately 69 hours of single-threaded work, but with 100+ concurrent Function instances, it completes in under 10 minutes.

</details>

<details>
<summary>4. Why is the Consumption plan insufficient for a workload that needs to burst to 100,000 requests per second?</summary>

**The Consumption plan has a maximum scale limit of 200 instances.** At approximately 100 requests/second per instance, 200 instances can handle only 20,000 requests/second, which is 5x below the 100,000 requests/second requirement. Additionally, the Consumption plan scales reactively (adding instances based on observed load), which introduces delay during sudden bursts. The Flex Consumption plan supports up to 1,000 instances and includes always-ready instances that are pre-provisioned before the burst arrives, making it suitable for extreme-scale scenarios.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge37 --location eastus
```

2. Create a storage account (required by Functions runtime):

```bash
az storage account create --resource-group rg-az305-challenge37 \
  --name stfunc37$RANDOM --sku Standard_LRS
```

3. Create a Function App on the Consumption plan with an HTTP trigger:

```bash
az functionapp create --resource-group rg-az305-challenge37 \
  --name func-challenge37-$RANDOM --consumption-plan-location eastus \
  --runtime node --runtime-version 20 --functions-version 4 \
  --storage-account $(az storage account list --resource-group rg-az305-challenge37 --query "[0].name" -o tsv)
```

4. Verify the Function App is running:

```bash
az functionapp show --resource-group rg-az305-challenge37 \
  --name $(az functionapp list --resource-group rg-az305-challenge37 --query "[0].name" -o tsv) \
  --query "{State:state, HostName:defaultHostName, Plan:sku.tier}" --output table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az group delete --name rg-az305-challenge37 --yes --no-wait
```

---

**Next**: [Challenge 38: Design a Messaging Architecture](/docs/az-305/infrastructure/challenge-38)
