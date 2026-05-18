---
sidebar_position: 2
title: "Challenge 35: Design a VM-Based Solution"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 35: Design a VM-Based Solution

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $5-15 | **Exam Weight: 30-35%**

:::

## Introduction

Meridian Capital Partners is a financial services firm that runs Monte Carlo simulations to price complex derivatives and assess portfolio risk. These simulations are embarrassingly parallel (each simulation is independent) and require massive compute capacity during market hours (6 AM to 8 PM EST, Monday through Friday) but zero capacity overnight and on weekends. During peak hours, the firm needs 100+ VMs running simultaneously to meet their 30-minute SLA for risk calculations.

The firm operates under strict regulatory requirements. Certain workloads process Personally Identifiable Information (PII) and must run on hardware that is not shared with other Azure tenants. Additionally, the simulation cache layer requires sub-millisecond disk latency to avoid becoming a bottleneck during parallel writes from hundreds of simulation threads. The firm has experienced inter-VM communication latency issues in the past that caused simulation synchronization failures.

Your task is to design a VM-based solution that addresses scale-to-zero economics, data sovereignty through dedicated hardware, ultra-low-latency storage, and network proximity for inter-VM communication, while keeping costs manageable by only paying for resources during the 14-hour active window.

## Exam Skills Covered

- Recommend a virtual machine-based solution

## Design Tasks

### Part 1: Scale Set Orchestration Design

1. Evaluate VMSS orchestration modes for the Monte Carlo workload:
   - **Flexible orchestration**: Supports mixed VM sizes, availability zones, can add existing VMs
   - **Uniform orchestration**: All VMs are identical, supports Service Fabric and AKS, platform-managed updates

2. Determine which orchestration mode is appropriate for embarrassingly parallel workloads where all VMs run identical simulation code. Document the trade-offs between Flexible and Uniform for this use case.

3. Design the auto-scaling strategy:
   - Scale from 0 to 100+ VMs at 6 AM EST (scheduled scale-out)
   - Maintain 100+ VMs during market hours
   - Scale to 0 VMs at 8 PM EST (scheduled scale-in)
   - Handle mid-day burst to 150+ VMs if risk calculations backlog grows
   - Calculate the monthly cost savings of scale-to-zero versus running 24/7

### Part 2: Dedicated Hardware and Confidential Computing

4. For PII-processing workloads that cannot share hardware with other tenants, evaluate:
   - **Azure Dedicated Hosts**: Physical server dedicated to your organization
   - **Confidential Computing (DCsv2/DCsv3 VMs)**: Hardware-based TEE (Trusted Execution Environments) with Intel SGX enclaves

5. Determine which isolation approach meets regulatory requirements:
   - If the requirement is "no other tenant on the same physical server" → which solution?
   - If the requirement is "data must be encrypted even during processing" → which solution?
   - Can both be combined? What are the cost implications?

6. Design the Dedicated Host group configuration:
   - How many hosts are needed for 20 PII-processing VMs?
   - What host SKU accommodates your selected VM size?
   - How does host-level maintenance control work?

### Part 3: Ultra-Low-Latency Storage Design

7. Compare Azure disk types for the simulation cache requirement (sub-millisecond latency):

| Disk Type | Max IOPS | Max Throughput | Latency | Use Case |
|-----------|----------|----------------|---------|----------|
| Standard HDD | 2,000 | 500 MBps | 10+ ms | Backup/archive |
| Standard SSD | 6,000 | 750 MBps | 1-10 ms | Dev/test |
| Premium SSD | 20,000 | 900 MBps | Sub-1 ms | Production |
| Premium SSD v2 | 80,000 | 1,200 MBps | Sub-1 ms | Latency-sensitive |
| Ultra Disk | 400,000 | 4,000 MBps | Sub-0.5 ms | Sub-ms critical |

8. Justify why Ultra Disk is required for this workload. Document the IOPS and throughput requirements for 100+ VMs performing parallel simulation writes.

9. Design the disk configuration: Should each VM have its own Ultra Disk, or should you use a shared disk architecture? What are the sizing considerations?

### Part 4: Network Proximity and Performance

10. Design the network architecture to minimize inter-VM latency:
    - Deploy a proximity placement group to co-locate VMs on the same network spine
    - Enable Accelerated Networking on all simulation VMs
    - Evaluate whether all 100+ VMs can fit in a single proximity placement group

11. Document the constraints of proximity placement groups:
    - What happens if the data center runs out of capacity for your placement group?
    - How do proximity placement groups interact with availability zones?
    - Can you combine proximity placement groups with VMSS?

12. Design the network topology for simulation VMs that need to exchange intermediate results with sub-1ms latency between each other.

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-35"
  items={[
    "VMSS orchestration mode selected with justification for Monte Carlo parallel workload",
    "Auto-scaling strategy designed for 6 AM to 8 PM schedule with scale-to-zero economics",
    "Dedicated Hosts vs Confidential Computing evaluated and correct isolation method chosen for PII requirements",
    "Ultra Disk selected for sub-millisecond latency with appropriate sizing per VM",
    "Proximity placement group and Accelerated Networking configured for inter-VM communication",
    "Cost analysis comparing active-hours-only versus 24/7 deployment"
  ]}
/>

## Hints

<details>
<summary>Hint 1: VMSS Orchestration Mode Selection</summary>

For embarrassingly parallel Monte Carlo simulations where all VMs run identical code:
- **Uniform orchestration** is the better fit because all instances use the same VM model and configuration, and you benefit from platform-optimized scaling (over-provisioning for faster scale-out).
- **Flexible orchestration** adds value when you need mixed VM sizes or want to add standalone VMs to the group, which is not needed for identical simulation workers.

Key difference: Uniform treats instances as interchangeable; Flexible treats them as individually manageable VMs.

</details>

<details>
<summary>Hint 2: Dedicated Host Sizing</summary>

Azure Dedicated Hosts are physical servers. A single host of type DSv4 can accommodate:
- 16x Standard_D4s_v4 (4 vCPU each), or
- 8x Standard_D8s_v4 (8 vCPU each), or
- 4x Standard_D16s_v4, etc.

For 20 PII-processing VMs, calculate how many fit per host based on your chosen VM size. Add a spare host for maintenance operations (host-level live migration requires available capacity on another host in the group). Enable automatic placement so Azure optimally distributes VMs across hosts.

</details>

<details>
<summary>Hint 3: Ultra Disk Configuration</summary>

Ultra Disk allows you to independently configure IOPS and throughput without resizing the disk:
- Size: 4 GiB to 64 TiB
- Max IOPS per disk: 400,000
- Max throughput per disk: 4,000 MBps
- Latency: sub-millisecond (typically 0.1-0.5 ms)

For simulation cache, consider:
- Each VM might need 10,000-50,000 IOPS for parallel writes
- Ultra Disk IOPS and throughput can be adjusted dynamically without downtime
- Only supported on specific VM sizes (Es_v5, Dsv5, M-series) and regions
- Cannot be used as OS disk

</details>

<details>
<summary>Hint 4: Scale-to-Zero Cost Savings</summary>

Calculate cost savings for 100x Standard_D16s_v4 VMs:
- Pay-as-you-go: ~$0.77/hour per VM
- 100 VMs x 14 hours/day x 22 business days = 30,800 VM-hours/month
- Cost: 30,800 x $0.77 = ~$23,716/month

Versus 24/7: 100 VMs x 730 hours = 73,000 VM-hours x $0.77 = ~$56,210/month

Savings from scale-to-zero: ~$32,494/month (58% reduction). Scheduled scaling with VMSS autoscale rules makes this automatic.

</details>

<details>
<summary>Hint 5: Proximity Placement Group Limits</summary>

Proximity placement groups (PPGs) ensure VMs are co-located on the same network spine for low latency:
- No hard limit on VM count, but capacity constraints may prevent all VMs from being placed
- PPGs pin to a specific data center on first deployment
- Cannot span availability zones (use single zone + PPG)
- Trade-off: low latency vs. reduced availability (single zone = no zone redundancy)

For 100+ VMs in a PPG, use intent-based placement: specify VM sizes upfront so Azure can reserve appropriate rack capacity.

</details>

## Learning Resources

- [Virtual Machine Scale Sets orchestration modes](https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-orchestration-modes)
- [Azure Dedicated Hosts](https://learn.microsoft.com/en-us/azure/virtual-machines/dedicated-hosts)
- [Azure managed disk types](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types)
- [Proximity placement groups](https://learn.microsoft.com/en-us/azure/virtual-machines/co-location)
- [Accelerated Networking overview](https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview)

## Knowledge Check

<details>
<summary>1. A VMSS with 100 identical VMs needs to scale from 0 to 100 as fast as possible at a scheduled time. Which orchestration mode and which setting optimizes deployment speed?</summary>

**Uniform orchestration with overprovisioning enabled.** Uniform mode is optimized for large-scale identical deployments and supports overprovisioning, which creates extra VMs during scale-out (e.g., 120 VMs) and then deletes the extras once 100 are confirmed healthy. This compensates for individual VM provisioning failures and reduces time-to-target. Flexible orchestration does not support overprovisioning. Additionally, set the scale-out policy to use "newest VMs" for scale-in to retain the longest-running instances.

</details>

<details>
<summary>2. When should you choose Azure Dedicated Hosts over Confidential Computing VMs?</summary>

**When the regulatory requirement is physical hardware isolation (no co-tenancy) rather than data-in-use encryption.** Dedicated Hosts give you an entire physical server where no other tenant's VMs can run. Confidential Computing (DCsv2/DCsv3) provides hardware-encrypted enclaves that protect data while it is being processed, even from the hypervisor. If your regulation says "must not share physical infrastructure with other tenants," Dedicated Hosts are the answer. If it says "data must remain encrypted during computation," Confidential Computing is required. For maximum isolation, you can run Confidential VMs on Dedicated Hosts.

</details>

<details>
<summary>3. Why can't you use Premium SSD instead of Ultra Disk for a workload requiring 200,000 IOPS with sub-millisecond latency?</summary>

**Premium SSD maxes out at 20,000 IOPS per disk (80,000 with v2), while Ultra Disk supports up to 400,000 IOPS per disk.** Even with Premium SSD v2 (80,000 IOPS maximum), you cannot reach 200,000 IOPS on a single disk. You would need multiple Premium SSD v2 disks striped together, adding management complexity. Ultra Disk provides configurable IOPS up to 400,000 and guaranteed sub-millisecond latency, making it the only single-disk solution for extreme IOPS requirements. Ultra Disk also allows independent IOPS/throughput adjustment without downtime.

</details>

## Cleanup

```bash
# If you deployed any resources for validation:
az group delete --name rg-vmss-finance --yes --no-wait
```

---

**Next**: [Challenge 36: Design a Container-Based Solution](/docs/az-305/infrastructure/challenge-36)
