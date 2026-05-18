---
sidebar_position: 7
title: "Challenge 20: Design Data Storage for Cost & Performance"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 20: Design Data Storage for Cost and Performance

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $2-5 | **Exam Weight: 20-25%**

:::

## Introduction

DataForge Analytics is a fast-growing AI startup that has outgrown its initial storage architecture. Today they manage 100TB of data across Azure, with projections reaching 500TB within 12 months. Their data falls into three distinct usage patterns: ML training datasets accessed hourly by GPU clusters (hot data), user-uploaded files accessed daily through their SaaS platform (warm data), and compliance archives that must be retained for 7 years but are rarely accessed (cold data).

The CFO has raised an urgent concern: the current monthly storage bill is $15,000 and growing linearly with data volume. The target is to reduce costs below $10,000/month without sacrificing read performance on hot data that feeds the ML pipeline. The ML team reports that any latency increase on training data reads directly impacts model training time and GPU utilization efficiency.

Your task is to design a tiered storage strategy that balances cost optimization with performance requirements, leveraging Azure Storage access tiers, reserved capacity pricing, lifecycle management policies, and caching layers where appropriate.

## Exam Skills Covered

- Recommend a data storage solution to balance features, performance, and costs

## Design Tasks

### Part 1: Analyze Current Storage and Define Tier Strategy

1. Create a resource group for this challenge and deploy a Standard general-purpose v2 storage account.
2. Document the current pricing for each access tier (Hot, Cool, Cold, Archive) including per-GB storage costs, read/write operation costs, and data retrieval costs in your chosen region.
3. Design a tiering strategy that maps each data category to the appropriate access tier:
   - ML training datasets (10TB, accessed hourly) - evaluate Hot tier vs Premium block blob storage
   - User uploads (30TB, accessed 1-5 times daily) - evaluate Cool vs Hot tier
   - Compliance archives (60TB, accessed less than once per year) - evaluate Cold vs Archive tier
4. Calculate the projected monthly cost for your proposed tier allocation versus keeping everything in Hot tier.

### Part 2: Implement Lifecycle Management Policies

5. Create a lifecycle management policy that automatically transitions blobs between tiers based on last access time:
   - Move blobs not accessed for 30 days from Hot to Cool
   - Move blobs not accessed for 90 days from Cool to Cold
   - Move blobs not accessed for 180 days from Cold to Archive
6. Enable last access time tracking on the storage account to support access-time-based policies.
7. Create a second policy rule that deletes temporary processing blobs (prefix: `temp/`) after 7 days.

### Part 3: Evaluate Reserved Capacity and Caching

8. Calculate the savings from purchasing 100TB of Azure Storage reserved capacity (1-year commitment) versus pay-as-you-go pricing for the stable baseline storage.
9. Design a caching strategy for the ML training data using Azure Cache for Redis or Azure HPC Cache. Document:
   - Which caching solution is appropriate for large dataset reads
   - Expected cache hit ratio for repeatedly-accessed training datasets
   - Cost of the caching layer versus the performance benefit
10. Create a decision matrix comparing Standard vs Premium storage account performance tiers for the ML workload, considering IOPS, throughput, and latency requirements.

### Part 4: Design for Growth

11. Document how your design scales from 100TB to 500TB while maintaining the $10K/month budget constraint.
12. Design a monitoring solution using Azure Monitor metrics to track:
    - Storage capacity growth per container
    - Access patterns per tier (to validate lifecycle policy effectiveness)
    - Cost alerts when monthly spend approaches budget threshold

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-20"
  items={[
    "Lifecycle management policy deployed with at least 3 tier transition rules based on last access time",
    "Cost analysis document shows projected savings of 30% or more compared to all-Hot storage",
    "Decision matrix compares Standard vs Premium tiers with IOPS, throughput, latency, and cost columns",
    "Reserved capacity calculation demonstrates break-even point for 1-year commitment",
    "Caching strategy documented with solution selection rationale and cost-benefit analysis",
    "Growth plan shows cost remains under $10K/month at 500TB scale"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Understanding Access Tier Pricing</summary>

Azure Blob Storage access tiers have an inverse relationship between storage cost and access cost. Hot tier has higher per-GB storage cost but lower read/write operation costs. Archive tier has the lowest storage cost (roughly 1/20th of Hot) but high retrieval costs and 15-hour rehydration latency. The Cold tier (introduced after Cool) offers pricing between Cool and Archive with lower retrieval costs than Archive.

</details>

<details>
<summary>Hint 2: Lifecycle Management Policy Structure</summary>

Lifecycle management policies use JSON rules with `baseBlob` actions. Enable `enableAutoTierToHotFromCool` if you want Azure to automatically move blobs back to Hot when accessed. Use `daysAfterLastAccessTimeGreaterThan` (requires access tracking enabled) rather than `daysAfterModificationGreaterThan` for access-pattern-based tiering.

</details>

<details>
<summary>Hint 3: Reserved Capacity Considerations</summary>

Azure Storage reserved capacity provides up to 38% discount for 1-year and up to 56% for 3-year commitments on block blob storage capacity. The reservation applies to the total storage amount regardless of tier. It does not cover transaction costs, data transfer, or operations - only the per-GB capacity charge.

</details>

<details>
<summary>Hint 4: Caching for Large Datasets</summary>

For ML training workloads reading large datasets (multi-TB), Azure HPC Cache is designed for high-throughput file-based workloads and can cache data from Azure Blob Storage. Azure Cache for Redis is better suited for smaller, key-value lookups. Consider whether the ML framework supports file-based reads (HPC Cache) or object-based reads (Redis).

</details>

<details>
<summary>Hint 5: Premium Block Blob Storage</summary>

Premium block blob storage accounts use SSDs and are optimized for workloads requiring consistent low latency and high transaction rates. They only support the Hot tier (no lifecycle tiering) and cost significantly more per GB. They are best when you need sub-millisecond latency, not just high throughput.

</details>

## Learning Resources

- [Azure Blob Storage access tiers](https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview)
- [Optimize costs with Azure Storage reserved capacity](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-reserved-capacity)
- [Azure Blob Storage lifecycle management](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)
- [Plan and manage costs for Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/common/storage-plan-manage-costs)
- [Premium block blob storage accounts](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-block-blob-premium)
- [Azure HPC Cache overview](https://learn.microsoft.com/en-us/azure/hpc-cache/hpc-cache-overview)

## Knowledge Check

<details>
<summary>1. A company stores 50TB of log data that is written once and read approximately twice per month for compliance audits. Which access tier minimizes total cost (storage + operations)?</summary>

**Cool tier.** While Archive has the lowest per-GB storage cost, the twice-monthly read pattern would incur significant retrieval costs and 15-hour rehydration delays. Cold tier might also work, but Cool provides a good balance between storage cost savings (roughly 50% less than Hot) and reasonable operation costs for occasional reads. The key insight is that Archive is only cost-effective when data is accessed less than once or twice per year.

</details>

<details>
<summary>2. When does Azure Storage reserved capacity NOT provide cost savings?</summary>

**When storage volume is highly variable or shrinking.** Reserved capacity requires a commitment to a fixed amount of storage (100TB or 1PB increments). If actual usage falls below the reserved amount, you pay for unused capacity. It also does not cover transaction costs, egress, or operations - only the per-GB capacity charge. If your workload is transaction-heavy but storage-light, reserved capacity provides minimal benefit.

</details>

<details>
<summary>3. A lifecycle management policy moves blobs to Archive after 180 days. A user needs to read an archived blob immediately. What happens?</summary>

**The read fails until the blob is rehydrated.** Archived blobs are offline and cannot be read directly. The user must first rehydrate the blob by changing its tier to Hot, Cool, or Cold (standard priority takes up to 15 hours; high priority may complete in under 1 hour for blobs under 10GB). Alternatively, they can copy the blob to a new blob in an online tier. This is a critical design consideration - if any compliance data might need urgent access, Archive tier may not be appropriate without a documented rehydration process.

</details>

<details>
<summary>4. What is the primary difference between a Standard general-purpose v2 storage account and a Premium block blob storage account for read-heavy workloads?</summary>

**Latency consistency and IOPS.** Premium block blob storage uses SSDs and provides consistent single-digit millisecond latency and higher IOPS. Standard accounts use HDDs with variable latency (typically 5-10ms but can spike). Premium is priced per GB (no access tiers) and costs 2-3x more per GB than Standard Hot tier. The design decision depends on whether the workload requires consistent low latency (Premium) or can tolerate variable latency in exchange for tier-based cost optimization (Standard).

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge20 --location eastus
```

2. Deploy a storage account with access tracking enabled:

```bash
az storage account create \
  --name staz305ch20$RANDOM \
  --resource-group rg-az305-challenge20 \
  --sku Standard_LRS \
  --kind StorageV2 \
  --enable-last-access-tracking true
```

3. Apply a lifecycle management policy with tier transitions:

```bash
az storage account management-policy create \
  --account-name <your-account-name> \
  --resource-group rg-az305-challenge20 \
  --policy '{
    "rules": [
      {
        "enabled": true,
        "name": "auto-tier-rule",
        "type": "Lifecycle",
        "definition": {
          "actions": {
            "baseBlob": {
              "tierToCool": {"daysAfterLastAccessTimeGreaterThan": 30},
              "tierToCold": {"daysAfterLastAccessTimeGreaterThan": 90},
              "tierToArchive": {"daysAfterLastAccessTimeGreaterThan": 180}
            }
          },
          "filters": {"blobTypes": ["blockBlob"]}
        }
      }
    ]
  }'
```

4. Verify the policy is applied:

```bash
az storage account management-policy show \
  --account-name <your-account-name> \
  --resource-group rg-az305-challenge20
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az group delete --name rg-az305-challenge20 --yes --no-wait
```

---

**Next**: [Challenge 21: Design Data Durability and Protection](/docs/az-305/data-storage/challenge-21)
