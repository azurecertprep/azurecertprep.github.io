---
sidebar_position: 1
title: "Challenge 25: Design Recovery Objectives & Strategy"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Challenge 25: design Recovery objectives & strategy

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $0-5 | **Exam Weight: 15-20%**

:::

## Introduction

Mercy Regional Health System operates a network of hospitals and clinics serving 500,000 patients across three states. Their IT infrastructure supports everything from life-critical patient monitoring systems to routine administrative functions. After a recent ransomware incident at a neighboring health system caused a 72-hour outage of patient records, the board has mandated a comprehensive disaster recovery strategy.

The CIO has categorized all workloads into three tiers based on business impact analysis: Tier 1 (critical) includes the Electronic Health Records (EHR) system and patient monitoring - these must recover within 1 minute with zero data loss. Tier 2 (important) includes the appointment scheduling system, pharmacy management, and lab results portal - these can tolerate up to 1 hour of downtime and 15 minutes of data loss. Tier 3 (standard) includes HR/payroll, training portals, and internal communications - these can tolerate up to 24 hours of downtime and 4 hours of data loss.

The challenge is significant: Mercy has a DR budget of only $5,000/month to protect all three tiers. You must design a recovery strategy that appropriately allocates budget across tiers, selecting the right recovery pattern (hot/warm/cold standby) for each workload class while proving that the composite SLA meets availability requirements.

## Exam skills covered

- Recommend a recovery solution for Azure and hybrid workloads that meets recovery objectives

## Design tasks

### Part 1: Business impact analysis and Recovery objectives

1. For each workload tier, formally define the following recovery parameters:
   - Recovery Time Objective (RTO)
   - Recovery Point Objective (RPO)
   - Recovery Level Objective (RLO) - what level of functionality is acceptable during recovery
   - Maximum Tolerable Downtime (MTD) - the absolute maximum before business viability is threatened

2. Calculate the required uptime percentage for each tier:
   - Tier 1: RTO of 1 minute implies what SLA percentage?
   - Tier 2: RTO of 1 hour implies what SLA percentage?
   - Tier 3: RTO of 24 hours implies what SLA percentage?

3. Document the business impact of exceeding RTO for each tier (financial loss per hour, patient safety risk, regulatory penalties).

### Part 2: Recovery strategy selection

4. Map each workload tier to the appropriate recovery pattern:
   - **Hot standby**: Active-active or active-passive with real-time replication
   - **Warm standby**: Scaled-down replica that can be scaled up during failover
   - **Cold standby**: Infrastructure defined as code, deployed on-demand during disaster
   - **Backup only**: Regular backups with restore-from-scratch recovery

5. Complete this decision matrix for each tier:

<DecisionMatrix
  title="DR Strategy by Workload Tier"
  headers={["Tier 1 (Critical)", "Tier 2 (Important)", "Tier 3 (Standard)"]}
  rows={[
    {criteria: "Recovery pattern", values: ["Hot standby (active-active or active-passive with synchronous replication)", "Warm standby (scaled-down replica with asynchronous replication)", "Cold standby (IaC templates + backup restore)"]},
    {criteria: "Monthly DR cost", values: ["$3,000-4,000 (80-100% of production cost for secondary region)", "$800-1,500 (30-50% of production for scaled-down replicas)", "$200-500 (5-10% for storage of backups + IaC definitions)"]},
    {criteria: "Data replication method", values: ["Synchronous geo-replication (SQL Always On, ZRS/GZRS), real-time data sync", "Asynchronous geo-replication (SQL geo-replication, GRS), 5-15 min lag acceptable", "Daily/hourly backups to GRS storage, restore from backup during disaster"]},
    {criteria: "Failover automation", values: ["Fully automated - Traffic Manager/Front Door health probes trigger instant failover", "Semi-automated - runbook triggered by alert, requires validation before cutover", "Manual - ops team deploys from IaC templates and restores data from backups"]},
    {criteria: "Testing frequency", values: ["Monthly failover drills (automated), quarterly full DR tests", "Quarterly failover tests with documented runbook validation", "Semi-annual restore tests to verify backup integrity"]}
  ]}
  storageKey="az305-challenge-25"
/>

6. Justify why hot standby is required for Tier 1 but would be wasteful for Tier 3.

### Part 3: SLA composition and budget allocation

7. Calculate the composite SLA for a Tier 1 workload that depends on:
   - Azure Virtual Machines (99.99% with Availability Zones)
   - Azure SQL Database Business Critical (99.995%)
   - Azure Load Balancer (99.99%)
   - Azure ExpressRoute (99.95%)

   Use the formula: Composite SLA = SLA1 x SLA2 x SLA3 x SLA4

8. Determine if the composite SLA meets the Tier 1 requirement. If not, design compensating measures (multi-region, redundant paths) to achieve the target.

9. Allocate the $5,000/month DR budget across tiers. Consider that hot standby costs roughly 80-100% of production costs, warm standby costs 30-50%, and cold standby costs 5-10%.

### Part 4: Recovery strategy documentation

10. Create a recovery strategy document that maps Azure services to each tier:
    - Tier 1: Which Azure services provide sub-minute RTO?
    - Tier 2: Which services provide 1-hour RTO at moderate cost?
    - Tier 3: Which services enable 24-hour recovery at minimal cost?

11. Define the DR testing schedule and validation criteria for each tier.

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-25"
  items={[
    "RTO, RPO, RLO, and MTD defined for all three workload tiers with business justification",
    "Appropriate recovery pattern (hot/warm/cold) selected for each tier with cost analysis",
    "Composite SLA calculated correctly using multiplication formula",
    "Budget allocation across tiers documented with cost-per-tier breakdown totaling $5K/month",
    "Recovery strategy maps specific Azure services to each tier's requirements",
    "DR testing schedule defined with appropriate frequency per tier"
  ]}
/>

## Hints

<details>
<summary>Hint 1: SLA Composition Formula</summary>

When services are chained in series (each depends on the previous), multiply their SLAs:

Composite SLA = 0.9999 x 0.99995 x 0.9999 x 0.9995 = 0.99925 (approximately 99.925%)

This means roughly 6.5 hours of downtime per year. To improve this, add redundancy (parallel paths) where:

Availability with redundancy = 1 - (1 - SLA_A) x (1 - SLA_B)

For example, dual ExpressRoute circuits: 1 - (1 - 0.9995)^2 = 0.99999975

</details>

<details>
<summary>Hint 2: Recovery Pattern Cost Estimates</summary>

Approximate monthly costs for a typical 3-tier application (web + app + DB):
- **Hot standby** (active-active): $3,000-4,000/month (full replica running)
- **Warm standby** (scaled-down replica): $800-1,500/month (minimal SKUs, can scale up)
- **Cold standby** (IaC + backups): $100-300/month (only storage for backups/templates)
- **Backup only**: $50-150/month (just backup vault storage)

Budget allocation suggestion: Tier 1 gets 60-70%, Tier 2 gets 20-30%, Tier 3 gets 5-10%.

</details>

<details>
<summary>Hint 3: Azure Services by Recovery Speed</summary>

**Sub-minute RTO (Tier 1)**:
- Azure SQL Database with failover groups (automatic failover)
- Availability Zones for VMs (zone-redundant)
- Azure Front Door / Traffic Manager (DNS-based failover)
- Cosmos DB with multi-region writes

**1-hour RTO (Tier 2)**:
- Azure Site Recovery (15-minute RPO, minutes to failover)
- Azure SQL geo-restore
- VM redeployment from managed images

**24-hour RTO (Tier 3)**:
- Azure Backup with restore
- Redeploy from ARM/Bicep templates
- Cold storage backups with manual restore

</details>

<details>
<summary>Hint 4: Uptime Percentage Calculation</summary>

To convert RTO to minimum uptime percentage:
- Minutes in a year: 525,600
- RTO 1 min: (525,600 - 1) / 525,600 = 99.99981% (but this assumes only ONE outage per year)
- More realistically, consider monthly SLA targets:
  - 99.99% = 4.32 min downtime/month
  - 99.95% = 21.6 min downtime/month
  - 99.9% = 43.2 min downtime/month
  - 99% = 7.2 hours downtime/month

</details>

## Learning resources

- [Business continuity and disaster recovery - Cloud Adoption Framework](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/design-area/management-business-continuity-disaster-recovery)
- [Azure Well-Architected Framework - Reliability pillar](https://learn.microsoft.com/en-us/azure/well-architected/reliability/)
- [Backup and disaster recovery for Azure applications](https://learn.microsoft.com/en-us/azure/architecture/framework/resiliency/backup-and-recovery)
- [SLA summary for Azure services](https://www.microsoft.com/licensing/docs/view/Service-Level-Agreements-SLA-for-Online-Services)
- [Composite SLA calculation](https://learn.microsoft.com/en-us/azure/architecture/framework/resiliency/business-metrics#composite-slas)

## Knowledge check

<details>
<summary>1. A workload has a composite SLA of 99.9% but requires 99.99% availability. What architectural change most effectively closes this gap?</summary>

**Add multi-region redundancy with automatic failover.** When a single-region deployment cannot achieve the target SLA through component multiplication alone, deploying to a second region and using a global load balancer (Azure Front Door or Traffic Manager) creates parallel availability paths. The formula becomes: 1 - (1 - 0.999)^2 = 0.999999 (99.9999%), which exceeds the requirement. The trade-off is increased cost and complexity of data synchronization.

</details>

<details>
<summary>2. Why would you choose warm standby over hot standby for a Tier 2 workload with 1-hour RTO?</summary>

**Warm standby costs 30-50% of production versus 80-100% for hot standby, and the 1-hour RTO provides sufficient time to scale up resources.** Hot standby maintains a full-capacity replica running at all times, which is unnecessary when you have 60 minutes to detect failure, trigger failover, and scale up a minimal replica. Warm standby keeps a scaled-down version running (e.g., smaller VM SKUs, lower DTU databases) that can be scaled to production capacity within the RTO window.

</details>

<details>
<summary>3. A hospital's EHR system depends on four Azure services, each with 99.99% SLA. What is the composite SLA, and does it meet a 99.99% target?</summary>

**The composite SLA is 0.9999^4 = 99.96%, which does NOT meet the 99.99% target.** When multiple services are chained in series, the composite SLA is always lower than the weakest individual SLA. Each additional dependency reduces the overall availability. To meet 99.99% with four dependencies, you need either higher individual SLAs (e.g., Business Critical tier at 99.995%) or redundancy at one or more layers to compensate for the multiplicative effect.

</details>

<details>
<summary>4. What is the key difference between RTO and MTD (Maximum Tolerable Downtime)?</summary>

**RTO is the target recovery time for IT systems; MTD is the absolute maximum time before the business itself is threatened.** RTO should always be shorter than MTD to provide a safety margin. For example, a hospital's EHR system might have an RTO of 1 minute (target to restore service) but an MTD of 15 minutes (beyond which patient safety is at risk and regulatory violations occur). The gap between RTO and MTD is your safety buffer for unexpected recovery complications.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge25 --location eastus
```

2. Deploy two VMs in different availability zones to observe SLA composition:

```bash
az vm create \
  --resource-group rg-az305-challenge25 \
  --name vm-zone1 \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --zone 1 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --no-wait

az vm create \
  --resource-group rg-az305-challenge25 \
  --name vm-zone2 \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --zone 2 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --no-wait
```

3. Verify zone placement for each VM:

```bash
az vm show \
  --resource-group rg-az305-challenge25 \
  --name vm-zone1 \
  --query "{name:name, zone:zones[0]}" -o table

az vm show \
  --resource-group rg-az305-challenge25 \
  --name vm-zone2 \
  --query "{name:name, zone:zones[0]}" -o table
```

4. Confirm the SLA tier by listing availability zone assignments:

```bash
az vm list \
  --resource-group rg-az305-challenge25 \
  --query "[].{Name:name, Zone:zones[0]}" -o table
```

5. Verify both VMs are running in separate zones (this configuration qualifies for 99.99% SLA):

```bash
az vm list \
  --resource-group rg-az305-challenge25 \
  --query "[].zones[0]" -o tsv | sort -u
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az group delete --name rg-az305-challenge25 --yes --no-wait
```

---

**Next**: [Challenge 26: Design Backup & Recovery for Compute](/docs/az-305/business-continuity/challenge-26)
