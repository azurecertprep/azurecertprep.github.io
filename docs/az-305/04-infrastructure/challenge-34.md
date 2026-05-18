---
sidebar_position: 1
title: "Challenge 34: Design Compute for Workload Requirements"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 34: Design Compute for Workload Requirements

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $0-5 | **Exam Weight: 30-35%**

:::

## Introduction

NeuralForge is an AI startup that has secured Series B funding and needs to migrate three distinct workloads from an on-premises data center to Azure. Each workload has radically different compute characteristics, and the total monthly budget for all compute resources is $8,000. Overspending is not an option as the startup is burning through runway.

The three workloads are: (1) A customer-facing web frontend and API layer that handles 2,000 concurrent users during peak hours. CPU utilization rarely exceeds 30% but the service must maintain 99.9% uptime with auto-scaling. (2) A machine learning model training pipeline that runs batch jobs requiring NVIDIA GPUs. Jobs take 4-8 hours, run 3-4 times per week, and can tolerate interruption as long as checkpointing is enabled. (3) An in-memory data processing engine that performs real-time feature engineering for ML inference. This workload requires a minimum of 256 GB RAM, runs 24/7 under sustained load, and is CPU-bound during data transformation phases.

Your task is to select the optimal VM family/series for each workload, determine the best pricing model (reserved instances, spot, or pay-as-you-go), and right-size each deployment to stay within the $8,000/month budget while meeting all performance requirements.

## Exam Skills Covered

- Specify components of a compute solution based on workload requirements

## Design Tasks

### Part 1: Workload Analysis and VM Family Selection

1. Analyze each workload's compute profile and map it to the appropriate Azure VM family:
   - Web frontend: Low sustained CPU, burstable demand, high availability required
   - ML training: GPU-intensive, batch-oriented, tolerates interruption
   - Data processing: Memory-optimized, sustained high utilization, 256 GB+ RAM

2. For each workload, evaluate these VM families and justify your selection:
   - **B-series** (burstable): Accumulates CPU credits during low usage, bursts when needed
   - **D-series** (general purpose): Balanced CPU-to-memory ratio for production workloads
   - **E-series** (memory optimized): High memory-to-CPU ratio, up to 672 GiB RAM per VM
   - **N-series** (GPU): NVIDIA GPUs for ML training, inference, and visualization

3. Document why the non-selected families are inappropriate for each workload (e.g., why B-series is wrong for sustained ML training, why N-series is wasteful for a web frontend).

### Part 2: Pricing Model Optimization

4. Determine the optimal pricing model for each workload:
   - **Pay-as-you-go**: Full flexibility, highest per-hour cost
   - **Reserved Instances (1-year or 3-year)**: Up to 72% discount, requires commitment
   - **Spot VMs**: Up to 90% discount, can be evicted with 30-second notice
   - **Savings Plans**: Flexible commitment across VM families/regions

5. Calculate the monthly cost for the ML training workload under each pricing model:
   - Spot pricing for interruptible GPU jobs (estimate 4 jobs x 8 hours x 4 weeks = 128 GPU-hours/month)
   - Pay-as-you-go for the same workload
   - What is the cost difference, and what risk does Spot introduce?

6. Determine whether a 1-year or 3-year Reserved Instance makes sense for the data processing engine that runs 24/7. Calculate break-even points.

### Part 3: Right-Sizing and Budget Allocation

7. Propose specific VM SKUs for each workload:
   - Web frontend: Select the appropriate B-series or D-series size based on 2,000 concurrent users
   - ML training: Select the appropriate NC or ND series GPU VM
   - Data processing: Select the appropriate E-series with 256+ GB RAM

8. Create a budget allocation table:

| Workload | VM SKU | Pricing Model | Monthly Cost | % of Budget |
|----------|--------|---------------|--------------|-------------|
| Web frontend | | | | |
| ML training | | | | |
| Data processing | | | | |
| **Total** | | | **$X** | **100%** |

9. Verify the total stays within $8,000/month. If it exceeds the budget, identify optimization strategies (smaller SKUs, fewer hours, different pricing).

### Part 4: Availability and Scaling Considerations

10. Design the availability strategy for each workload:
    - Web frontend: What availability construct provides 99.9% SLA?
    - ML training: How do you handle Spot eviction gracefully?
    - Data processing: Single VM or scale set for the memory-intensive workload?

11. Document the scaling approach for the web frontend: At what CPU threshold should auto-scaling trigger? What is the minimum and maximum instance count?

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-34"
  items={[
    "Correct VM family selected for each workload with documented justification",
    "Pricing model optimized per workload (Spot for GPU batch, Reserved for 24/7 memory workload)",
    "Specific VM SKUs proposed with costs that total within the $8,000/month budget",
    "Right-sizing rationale explains why selected SKUs match workload demands without over-provisioning",
    "Availability strategy defined for each workload (zones, scale sets, eviction handling)",
    "Budget allocation table completed with realistic Azure pricing"
  ]}
/>

## Hints

<details>
<summary>Hint 1: B-series Credit Banking Model</summary>

B-series VMs bank CPU credits when running below baseline (e.g., a B4ms has a 22.5% baseline). When your web app is idle at 5% CPU, credits accumulate. During a traffic spike, the VM can burst to 100% CPU using banked credits. This makes B-series ideal for workloads with variable utilization patterns. However, once credits are exhausted, performance drops to baseline. For sustained high-CPU workloads, D-series is more appropriate because it provides consistent performance without the credit model.

</details>

<details>
<summary>Hint 2: Spot VM Strategy for ML Training</summary>

Azure Spot VMs offer up to 90% discounts but can be evicted when Azure needs capacity back. For ML training, this is acceptable if you:
- Enable checkpointing every 30 minutes so training can resume from the last checkpoint
- Use eviction type "Deallocate" to retain the disk for restart
- Set max price to -1 (pay up to the pay-as-you-go rate) for lower eviction probability
- Consider NC-series (T4 GPUs) for training and ND-series (A100 GPUs) for large models

Typical Spot savings: NC6s_v3 costs approximately $0.90/hour pay-as-you-go vs. $0.18-$0.27/hour Spot.

</details>

<details>
<summary>Hint 3: Memory-Optimized E-series Sizing</summary>

For 256 GB RAM requirements, consider:
- **E32s_v5**: 32 vCPUs, 256 GiB RAM (~$1,460/month pay-as-you-go, ~$900/month 1-year RI)
- **E48s_v5**: 48 vCPUs, 384 GiB RAM (if you need CPU headroom)
- **E64s_v5**: 64 vCPUs, 512 GiB RAM (if workload grows)

A 3-year Reserved Instance on E32s_v5 can bring cost down to approximately $580/month, which is 60% savings. Since this workload runs 24/7, Reserved Instances provide the best economics.

</details>

<details>
<summary>Hint 4: Budget Estimation Approach</summary>

Approximate monthly costs (East US region):
- Web frontend: 2x B4ms Reserved ($67/month each) = ~$134/month
- ML training: NC6s_v3 Spot, 128 hours/month at $0.25/hour = ~$32/month
- Data processing: E32s_v5 3-year RI = ~$580/month
- Total: ~$746/month (well under $8K, allowing for storage, networking, and growth)

If GPU requirements are larger (e.g., NC24s_v3 with 4 GPUs), costs increase significantly. Right-size based on actual model complexity.

</details>

## Learning Resources

- [Sizes for virtual machines in Azure](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview)
- [B-series burstable VM sizes](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/b-family)
- [Azure Spot Virtual Machines](https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms)
- [Azure Reserved VM Instances](https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/save-compute-costs-reservations)
- [GPU optimized VM sizes](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/overview)

## Knowledge Check

<details>
<summary>1. A workload runs at 10% CPU for 22 hours/day then spikes to 95% CPU for 2 hours. Which VM series is most cost-effective?</summary>

**B-series (burstable).** The workload accumulates CPU credits during the 22 hours of low utilization and spends them during the 2-hour spike. This pattern is the ideal use case for burstable VMs. A D-series VM would provide consistent performance but at a higher cost, since you would be paying for sustained compute capacity that sits idle 92% of the time. The key requirement is that the burst period is short enough that accumulated credits are sufficient.

</details>

<details>
<summary>2. Why are Spot VMs inappropriate for the in-memory data processing workload despite the cost savings?</summary>

**The workload runs 24/7 under sustained load and cannot tolerate interruption.** Spot VMs can be evicted with only 30 seconds notice when Azure needs capacity. For an in-memory processing engine, eviction means losing all in-memory state and restarting the job from scratch. The data processing workload has no natural checkpoint boundaries and requires continuous availability. Reserved Instances are the correct choice here: they provide significant discounts (up to 72%) while guaranteeing capacity without eviction risk.

</details>

<details>
<summary>3. A startup needs GPU VMs for ML training that runs 4 hours per week. Should they use Reserved Instances or Spot?</summary>

**Spot VMs.** With only 16 GPU-hours per month of utilization, a Reserved Instance would waste approximately 98% of the committed capacity (a reservation covers all 730 hours in a month). Spot VMs provide up to 90% discount over pay-as-you-go and are ideal for interruptible batch workloads. The training pipeline should implement checkpointing to handle evictions. The break-even point for Reserved Instances on GPU VMs is typically above 40-50% utilization (300+ hours/month).

</details>

<details>
<summary>4. What is the primary risk of selecting a VM size that exactly matches current requirements with no headroom?</summary>

**Performance degradation during usage spikes and no capacity for growth.** Right-sizing should target 60-80% average utilization, leaving 20-40% headroom for traffic spikes, OS overhead, and organic growth. If a workload requiring 256 GB RAM is placed on a VM with exactly 256 GB, the OS and runtime overhead may cause memory pressure. Select the next size up (e.g., 384 GB) or design horizontal scaling for workloads that can be distributed. The cost of slight over-provisioning is lower than the cost of performance incidents.

</details>

## Cleanup

```bash
# This challenge is primarily design-focused
# If you created any VMs for pricing validation:
az group delete --name rg-compute-design --yes --no-wait
```

---

**Next**: [Challenge 35: Design a VM-Based Solution](/docs/az-305/infrastructure/challenge-35)
