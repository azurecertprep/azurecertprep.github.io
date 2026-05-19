---
sidebar_position: 5
title: "Challenge 29: Design a Disaster Recovery Plan"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Challenge 29: design a disaster Recovery plan

:::info Estimated Time and Cost

**90-120 min** | **Estimated cost**: $15-30 | **Exam Weight: 15-20%**

:::

## Introduction

ShopStream is a mid-market e-commerce platform serving 2 million active customers with $50M in annual revenue. Their platform runs as a classic 3-tier architecture on Azure: a web tier (frontend and CDN), an API tier (order processing, inventory management, payment gateway integration), and a database tier (Azure SQL for transactions, Redis for session state, Azure Storage for product images). The primary deployment is in East US 2.

After a 4-hour outage last Black Friday caused by a storage subsystem failure in their primary region, ShopStream lost approximately $800K in revenue and significant customer trust. The board has mandated a comprehensive disaster recovery plan with the following hard requirements: web tier must recover within 5 minutes (RTO), API tier within 10 minutes (RTO), and the database tier must have no more than 5 seconds of data loss (RPO). The DR budget is $3,000/month for secondary infrastructure in West US 2.

This challenge combines all backup and DR skills from the previous challenges into a complete, end-to-end disaster recovery plan using Azure Site Recovery, geo-replicated databases, and automated failover routing. You will design the replication strategy, create recovery plans with sequenced failover, and validate the design meets all requirements within budget.

## Exam skills covered

- Recommend a recovery solution for Azure and hybrid workloads that meets recovery objectives
- Recommend a backup and recovery solution for compute
- Recommend a backup and recovery solution for databases

## Design tasks

### Part 1: Azure Site Recovery for compute tiers

1. Design the Azure Site Recovery (ASR) configuration for the web and API tiers:
   - Web tier: 4 VMs behind a load balancer (stateless, session stored in Redis)
   - API tier: 6 VMs processing orders (stateless except for in-flight transactions)
   - Determine replication frequency, recovery point retention, and crash-consistent vs. app-consistent snapshots

2. Configure ASR replication for a representative VM:

```bash
# Create ASR resources in the DR region
az group create --name rg-shopstream-dr --location westus2

# Note: ASR configuration typically uses the portal or PowerShell
# Conceptual configuration:
# Source: east US 2, target: west US 2
# Replication policy: 
# - Recovery point retention: 24 hours
# - app-consistent snapshot frequency: 4 hours
# - crash-consistent replication: continuous (rpo ~30 seconds)
```

3. Document the network configuration for the DR site:
   - Virtual network in West US 2 (mirror of production)
   - NSG rules replicated or pre-configured
   - Public IP addresses for load balancers in DR region
   - DNS strategy for cutover (Azure DNS with low TTL or Traffic Manager)

### Part 2: database tier DR strategy

4. Design the database replication strategy for each data store:

<DecisionMatrix
  title="DR Strategy by Data Store"
  headers={["DR Approach", "RPO", "RTO", "Failover Mode"]}
  rows={[
    {criteria: "Azure SQL (transactions)", values: ["Failover group with automatic failover to West US 2", "~5 seconds (asynchronous geo-replication)", "~30 seconds (automatic promotion via failover group)", "Automatic after grace period; stable DNS endpoint redirects connections transparently"]},
    {criteria: "Redis Cache (sessions)", values: ["Accept session loss; deploy warm standby Redis in DR region", "N/A (sessions are ephemeral and can be regenerated)", "Minutes (pre-provisioned Redis in DR region starts serving immediately)", "Manual; users re-authenticate after failover since session state is not replicated"]},
    {criteria: "Azure Storage (images)", values: ["RA-GRS with read-access secondary endpoint as CDN origin failover", "Up to 15 minutes (asynchronous geo-replication to paired region)", "Seconds (secondary read endpoint is always available for reads)", "Automatic for reads via secondary endpoint; full account failover is customer-initiated"]}
  ]}
  storageKey="az305-challenge-29"
/>

5. Configure an Azure SQL failover group for the transaction database:
   - Automatic failover with appropriate grace period
   - Read-only endpoint for the secondary (can serve read traffic during normal operations)
   - Connection string strategy that survives failover without application changes

6. Design the Redis Cache DR strategy:
   - Evaluate geo-replication for Azure Cache for Redis (Premium/Enterprise tier)
   - Consider whether session loss is acceptable (users re-authenticate) vs. session replication cost
   - Document the failover process for Redis

7. Configure geo-redundant storage (RA-GRS) for product images and design the failover:
   - How does RA-GRS failover work (Microsoft-initiated vs. customer-initiated)?
   - What is the RPO for storage geo-replication?
   - How do you redirect reads to the secondary endpoint during an outage?

### Part 3: Recovery plan orchestration

8. Create a sequenced recovery plan that defines failover order:
   - **Group 1**: Database tier (SQL failover group activates first)
   - **Group 2**: API tier (VMs start after database is available)
   - **Group 3**: Web tier (frontend VMs start after API is available)
   - **Group 4**: Traffic routing (DNS/Front Door switches to DR region)

9. Add automation to the recovery plan:
   - Pre-failover script: Verify database replication is current (< 5 seconds behind)
   - Post-failover script: Update application configuration to point to DR database endpoints
   - Post-failover script: Run health checks on each tier before proceeding to next group
   - Post-failover script: Send notification to operations team with failover status

10. Design the traffic routing failover using Azure Front Door or Traffic Manager:
    - Which service provides faster failover detection (health probes)?
    - Configure health probe endpoints for each tier
    - Define failover threshold (how many failed probes before switching?)
    - Calculate total failover time: detection + DNS propagation + VM startup

### Part 4: failback and DR testing

11. Design the failback procedure after the primary region recovers:
    - Re-protect (reverse replication from DR back to primary)
    - Data synchronization strategy during failback
    - Planned failover back to primary (zero data loss)
    - Handling the "split brain" scenario if both regions accept writes

12. Create a DR testing schedule and procedure:
    - Test failover (non-disruptive, uses isolated network in DR)
    - Planned failover (validates actual cutover with minimal downtime)
    - Frequency: How often should each type of test be conducted?
    - Success criteria: What metrics validate a successful DR test?

13. Calculate the monthly cost of the DR infrastructure and verify it fits within $3,000/month:
    - ASR replication cost per VM
    - DR region VMs (only running during failover, but disks pre-provisioned)
    - SQL Database secondary (readable, so useful for read offload)
    - Storage GRS replication cost
    - Total monthly cost vs. $3K budget

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-29"
  items={[
    "ASR configured for web and API tier VMs with appropriate replication policy",
    "SQL failover group configured with automatic failover and validated RPO meets 5-second requirement",
    "Recovery plan created with correct sequencing (DB -> API -> Web -> Traffic)",
    "Traffic routing failover designed with health probes and failover threshold defined",
    "DR cost estimate documented and validated against $3K/month budget",
    "Failback procedure and DR testing schedule documented"
  ]}
/>

## Hints

<details>
<summary>Hint 1: ASR Replication and RPO</summary>

Azure Site Recovery provides:
- **Continuous replication**: Disk writes are continuously replicated to the target region
- **RPO**: Typically 30 seconds to 2 minutes for VMs (depends on data change rate)
- **App-consistent snapshots**: Every 1-12 hours (configurable) - captures application state
- **Crash-consistent snapshots**: Every 5 minutes - captures disk state

For ShopStream's stateless web/API tiers, crash-consistent snapshots are sufficient because:
- Sessions are in Redis (not on the VM)
- In-flight transactions will be retried by the client
- No local database state to protect

ASR cost: approximately $25/month per protected VM + storage for replica disks.

</details>

<details>
<summary>Hint 2: SQL Failover Group Configuration</summary>

Failover group key settings:
- **Grace period**: Minimum 1 hour. This is how long automatic failover waits after detecting primary failure before switching. Shorter = faster failover but higher risk of false positives.
- **Read-write endpoint**: `fg-shopstream.database.windows.net` (always points to primary)
- **Read-only endpoint**: `fg-shopstream.secondary.database.windows.net` (always points to secondary)
- **RPO**: Approximately 5 seconds for asynchronous geo-replication (guaranteed by SLA)

```bash
az sql failover-group create \
  --resource-group rg-shopstream \
  --server sql-shopstream-primary \
  --partner-server sql-shopstream-dr \
  --name fg-shopstream \
  --failover-policy Automatic \
  --grace-period 1
```

Application connection string should use the failover group endpoint, NOT the individual server name.

</details>

<details>
<summary>Hint 3: Recovery Plan Sequencing in ASR</summary>

ASR Recovery Plans allow you to define groups that fail over in sequence:
1. Create a Recovery Plan in the Recovery Services vault
2. Add VMs to numbered groups (Group 1 starts first)
3. Add pre/post actions (scripts, Azure Automation runbooks, manual steps)

Typical sequencing for 3-tier app:
- Group 1: Database failover (run SQL failover-group failover as a pre-action)
- Group 2: API tier VMs (configure to wait for database health check)
- Group 3: Web tier VMs (configure to wait for API health check)
- Post-action: Update Traffic Manager/Front Door to point to DR region

Each group completes before the next starts. Within a group, all VMs start in parallel.

</details>

<details>
<summary>Hint 4: DR Cost Estimation</summary>

Monthly cost breakdown for ShopStream DR ($3,000 budget):
- **ASR replication** (10 VMs): 10 x $25 = $250/month
- **Replica managed disks** (10 VMs, avg 256 GB each): 10 x 256 GB x $0.05 = $128/month
- **SQL Database secondary** (General Purpose, 8 vCores): ~$800/month (but provides read offload value)
- **Redis geo-replication** (Premium P1): ~$450/month (consider if sessions are expendable)
- **Storage GRS delta**: ~$200/month (GRS costs ~2x LRS for 5 TB of images)
- **ASR network egress during replication**: ~$50/month

Estimated total: ~$1,878/month without Redis geo-replication, ~$2,328 with it. Both fit within $3K budget.

If Redis is too expensive, accept session loss during failover (users re-login) and use Premium without geo-replication in DR region, starting fresh on failover.

</details>

<details>
<summary>Hint 5: Front Door vs Traffic Manager for Failover</summary>

**Azure Front Door:**
- Layer 7 (HTTP/HTTPS) load balancer with health probes
- Probe interval: as low as 5 seconds
- Failover detection: ~10-30 seconds (configurable probe frequency x threshold)
- No DNS TTL dependency (uses anycast - instant routing change)
- Additional features: WAF, caching, SSL offload

**Azure Traffic Manager:**
- DNS-based routing (returns IP of healthy backend)
- Probe interval: 10-30 seconds
- Failover detection: 30-90 seconds + DNS TTL propagation (30-300 seconds)
- Total failover time can be 1-5 minutes depending on DNS TTL settings
- Simpler, cheaper, supports non-HTTP protocols

For ShopStream's 5-minute web tier RTO: Front Door is preferred (faster detection, no DNS propagation delay). Traffic Manager works if you set TTL to 30 seconds but adds risk of cached DNS entries.

</details>

## Learning resources

- [About Azure Site Recovery](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview)
- [Set up disaster recovery for Azure VMs](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication)
- [Recovery plans in Azure Site Recovery](https://learn.microsoft.com/en-us/azure/site-recovery/recovery-plan-overview)
- [Azure SQL Database failover groups](https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-sql-db)
- [Azure Front Door traffic routing](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-traffic-acceleration)
- [Geo-replication for Azure Cache for Redis](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-geo-replication)

## Knowledge check

<details>
<summary>1. A 3-tier application has RTO requirements of 5 min (web), 10 min (API), and 30 sec (database). Why must the database tier fail over FIRST in the recovery plan?</summary>

**The API tier depends on the database - if API VMs start before the database is available, they will crash or return errors.** Similarly, the web tier depends on the API tier. Recovery plans must respect dependency order: the lowest tier in the stack (database) must be available before upper tiers start. Even though the database has the strictest RTO (30 sec), starting it first ensures upper tiers can initialize their database connections successfully. ASR recovery plans enforce this through numbered groups that execute sequentially.

</details>

<details>
<summary>2. ShopStream uses Azure Front Door for traffic routing. During a failover, what happens to in-flight user requests that were being served by the primary region?</summary>

**In-flight requests to the failed primary region will timeout and fail.** Azure Front Door health probes detect the backend failure within 10-30 seconds and stop routing NEW requests to the unhealthy origin. However, requests already in transit (received by the failed backend) will fail with timeout or connection errors. The client must retry, and the retry will be routed to the healthy DR origin. For e-commerce, this means some users may see an error page for 10-30 seconds during failover. Stateless API design ensures retried requests succeed without side effects (idempotency is critical).

</details>

<details>
<summary>3. The DR budget is $3,000/month. What is the most significant cost component, and how can it provide value even during normal operations?</summary>

**The SQL Database secondary (failover group) is the largest cost at ~$800/month but provides read-offload capability during normal operations.** The secondary database in a failover group has a readable endpoint that can serve read-heavy queries (reporting, analytics, search) without impacting the primary. This effectively doubles read capacity at no additional cost beyond the DR investment. Similarly, Redis geo-replication secondary can serve reads for geographically distributed users. Converting DR spend into performance improvement justifies the cost to stakeholders.

</details>

<details>
<summary>4. After a successful failover to West US 2, the primary region (East US 2) recovers. What is the correct sequence to fail back without data loss?</summary>

**Re-protect, synchronize, then planned failover.** The sequence is: (1) Re-protect: enable reverse replication from West US 2 (current primary) back to East US 2. (2) Wait for initial synchronization to complete (full copy of changes made during the outage). (3) Verify replication is healthy and lag is minimal. (4) Execute a planned failover from West US 2 back to East US 2 (this briefly stops writes to ensure zero data loss during cutover). (5) Re-protect again to restore the original DR direction. Skipping re-protection risks data loss if East US 2 has stale data.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge29 --location eastus
```

2. Deploy a VM to use as the ASR replication source:

```bash
az vm create \
  --resource-group rg-az305-challenge29 \
  --name vm-asr-source \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --zone 1 \
  --admin-username azureuser \
  --generate-ssh-keys
```

3. Create a Recovery Services vault and set the replication policy:

```bash
az backup vault create \
  --resource-group rg-az305-challenge29 \
  --name vault-az305-challenge29 \
  --location eastus

az backup policy list \
  --resource-group rg-az305-challenge29 \
  --vault-name vault-az305-challenge29 \
  --query "[].name" -o table
```

4. Enable backup on the VM to validate vault integration:

```bash
az backup protection enable-for-vm \
  --resource-group rg-az305-challenge29 \
  --vault-name vault-az305-challenge29 \
  --vm vm-asr-source \
  --policy-name DefaultPolicy
```

5. Verify the VM is registered for protection:

```bash
az backup item list \
  --resource-group rg-az305-challenge29 \
  --vault-name vault-az305-challenge29 \
  --query "[].{Name:name, Status:properties.protectionStatus}" -o table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az group delete --name rg-az305-challenge29 --yes --no-wait
```

---

**Next**: [Challenge 30: Design High Availability for Compute](/docs/az-305/business-continuity/challenge-30)
