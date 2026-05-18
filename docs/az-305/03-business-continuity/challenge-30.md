---
sidebar_position: 6
title: "Challenge 30: Design High Availability for Compute"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Challenge 30: Design High Availability for Compute

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $10-20 | **Exam Weight: 15-20%**

:::

## Introduction

The Federal Benefits Portal (FedBenefits) is a government-operated web application that allows 10 million citizens to manage their retirement benefits, healthcare enrollment, and tax information. The portal is subject to strict uptime requirements mandated by the Government Accountability Office: 99.99% availability (maximum 52.6 minutes of downtime per year). Any outage longer than 5 minutes triggers a congressional reporting requirement and potential audit.

The current architecture runs on 8 VMs behind an Azure Load Balancer in a single availability set within East US 2. Last month, an unplanned Azure platform maintenance event took down the entire availability set for 12 minutes, breaching the SLA. The infrastructure team has been tasked with redesigning the compute layer to survive a full availability zone failure without any user-visible impact.

Some components of FedBenefits are legacy .NET Framework applications that cannot be easily containerized, while newer microservices run on .NET 8 and could leverage PaaS offerings. The architecture must accommodate both IaaS (VMs for legacy) and PaaS (App Service for modern) workloads while achieving the 99.99% composite SLA target. Budget allows for upgrading to zone-redundant infrastructure but not for a full multi-region active-active deployment.

## Exam Skills Covered

- Recommend a high availability solution for compute

## Design Tasks

### Part 1: Availability Sets vs. Availability Zones

1. Analyze why the current availability set deployment failed to meet the 99.99% target:
   - What SLA does an availability set provide? (99.95%)
   - What scenarios can cause ALL VMs in an availability set to be impacted simultaneously?
   - What is the difference between fault domains and update domains?

2. Design the migration from availability sets to availability zones:

| Aspect | Availability Set | Availability Zones |
|--------|-----------------|-------------------|
| SLA | 99.95% | 99.99% |
| Failure isolation | Rack-level (fault domain) | Datacenter-level (zone) |
| Update domain protection | Yes (staged rollouts) | Yes (zone-sequential updates) |
| Zone failure survival | No | Yes |
| Cost impact | None | Potential cross-zone egress |
| VM SKU requirements | Any | Must support AZ |

3. Determine which Azure regions support availability zones and confirm East US 2 support. Document any VM SKU restrictions for zone deployments.

### Part 2: Zone-Redundant Load Balancing

4. Design the load balancing architecture for zone-redundant VMs:
   - Standard Load Balancer (zone-redundant frontend) distributing across 3 zones
   - Health probe configuration (what endpoint, what interval, what threshold)
   - Backend pool with VMs spread across Zone 1, 2, and 3

5. Deploy zone-redundant VMs with a Standard Load Balancer:

```bash
# Create zone-redundant load balancer
az network lb create \
  --resource-group rg-fedbenefits \
  --name lb-fedbenefits \
  --sku Standard \
  --frontend-ip-name frontend-ip \
  --backend-pool-name backend-pool \
  --location eastus2

# Create VMs across zones (minimum 2 per zone for zone-level redundancy)
for zone in 1 2 3; do
  for i in 1 2; do
    az vm create \
      --resource-group rg-fedbenefits \
      --name vm-web-z${zone}-${i} \
      --image Win2022Datacenter \
      --size Standard_D4s_v5 \
      --zone $zone \
      --nsg "" \
      --public-ip-address "" \
      --no-wait
  done
done
```

6. Configure health probes that detect application-level failures (not just TCP port availability):
   - HTTP health probe to `/health` endpoint
   - Probe interval: 5 seconds
   - Unhealthy threshold: 2 consecutive failures
   - Calculate: How quickly is a failed VM removed from rotation?

### Part 3: Virtual Machine Scale Sets (VMSS)

7. Evaluate whether VMSS would be more appropriate than individual VMs for the web tier:

<DecisionMatrix
  title="VMSS Deployment Comparison"
  headers={["Individual VMs", "VMSS Uniform", "VMSS Flexible"]}
  rows={[
    {criteria: "Auto-scaling", values: ["Manual (add or remove VMs by hand)", "Yes (built-in autoscale rules with metrics)", "Yes (built-in autoscale rules with metrics)"]},
    {criteria: "Zone spreading", values: ["Manual (must specify zone per VM at creation)", "Automatic (even distribution across configured zones)", "Automatic (even distribution across configured zones)"]},
    {criteria: "Rolling updates", values: ["Manual (update each VM individually)", "Automatic (orchestrated rolling upgrades with health monitoring)", "Automatic (orchestrated rolling upgrades with health monitoring)"]},
    {criteria: "Individual VM access", values: ["Full (SSH/RDP to any VM directly)", "Limited (no direct VM management or unique configuration)", "Full (SSH/RDP access, can attach existing VMs)"]},
    {criteria: "Load balancer integration", values: ["Manual (add each VM to backend pool)", "Automatic (instances auto-registered on creation)", "Automatic (instances auto-registered on creation)"]},
    {criteria: "Use case fit for FedBenefits", values: ["Suitable for legacy apps needing full control but lacks autoscaling benefit", "Best for identical stateless workloads; limited troubleshooting access for legacy apps", "Recommended - combines autoscale and zone spreading with individual VM access for legacy .NET Framework apps"]}
  ]}
  storageKey="az305-challenge-30"
/>

8. Design a VMSS Flexible configuration for the legacy .NET Framework web tier:
   - Spreading across 3 availability zones
   - Minimum 6 instances (2 per zone)
   - Maximum 18 instances (6 per zone) for peak periods (open enrollment)
   - Autoscale rules based on CPU and request count

9. Configure the autoscale profile:
   - Scale-out: Add 2 instances when average CPU > 70% for 5 minutes
   - Scale-in: Remove 1 instance when average CPU < 30% for 10 minutes
   - Schedule-based scaling: Pre-scale to 12 instances during open enrollment (January)

### Part 4: PaaS High Availability (App Service)

10. Design the deployment for the .NET 8 microservices using Azure App Service:
    - Which App Service plan tier supports availability zones? (Premium v3 or above)
    - How does zone-redundant App Service work? (minimum 3 instances, spread across zones)
    - What happens if a zone fails? (remaining instances handle traffic)

11. Configure a zone-redundant App Service plan:

```bash
# Zone-redundant App Service requires Premium v3 and minimum 3 instances
az appservice plan create \
  --resource-group rg-fedbenefits \
  --name asp-fedbenefits \
  --location eastus2 \
  --sku P1V3 \
  --number-of-workers 3 \
  --zone-redundant true
```

12. Compare the composite SLA of the two approaches:
    - Legacy tier: Zone-redundant VMs (99.99%) + Standard LB (99.99%) = ?
    - Modern tier: Zone-redundant App Service (99.99%) = ?
    - Combined application SLA (both tiers must be available): ?

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-30"
  items={[
    "Availability Zones selected over Availability Sets with documented justification",
    "Zone-redundant Standard Load Balancer configured with health probes",
    "VMSS Flexible or zone-spread VMs deployed across 3 availability zones",
    "Autoscaling configured with CPU-based and schedule-based rules",
    "Zone-redundant App Service plan deployed for PaaS workloads",
    "Composite SLA calculated and validated against 99.99% target"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Availability Zones SLA Details</summary>

Availability Zone SLA guarantees for VMs:
- **Two or more VMs across 2+ zones**: 99.99% SLA (52.6 min/year downtime)
- **Two or more VMs in an availability set**: 99.95% SLA (4.38 hours/year)
- **Single VM with Premium SSD**: 99.9% SLA (8.76 hours/year)

The 99.99% SLA means Azure guarantees connectivity to at least one VM instance across zones 99.99% of the time. Key requirement: you need at least 2 VMs in at least 2 different zones.

For FedBenefits: Deploy at least 2 VMs per zone (6 minimum total) to maintain service even if one VM in any zone fails AND an entire zone fails simultaneously.

</details>

<details>
<summary>Hint 2: Standard vs Basic Load Balancer</summary>

Only Standard Load Balancer supports availability zones:
- **Standard LB**: Zone-redundant frontend, cross-zone backend pools, 99.99% SLA
- **Basic LB**: No zone support, no SLA, being retired

Standard LB with zone-redundant frontend:
- Frontend IP survives any single zone failure
- Backend pool can contain VMs from any/all zones
- Health probes route traffic only to healthy instances in healthy zones
- No cross-zone data transfer charges within the same region

```bash
# Verify zone-redundant frontend
az network lb frontend-ip show \
  --resource-group rg-fedbenefits \
  --lb-name lb-fedbenefits \
  --name frontend-ip \
  --query zones
```

</details>

<details>
<summary>Hint 3: VMSS Flexible vs Uniform</summary>

For FedBenefits legacy .NET Framework apps:
- **VMSS Uniform**: All VMs are identical, limited individual VM management, no support for attaching existing VMs. Best for truly identical stateless workloads.
- **VMSS Flexible**: Supports mixed VM sizes, individual VM access via SSH/RDP, can attach existing VMs, supports availability zones. Best for legacy workloads migrating from individual VMs.

VMSS Flexible is recommended for FedBenefits because:
1. Legacy apps may need individual VM troubleshooting (RDP access)
2. Mixed VM sizes allow cost optimization (smaller VMs for baseline, larger for burst)
3. Supports the same deployment patterns as individual VMs but adds autoscaling
4. Zone spreading is automatic (balances across configured zones)

</details>

<details>
<summary>Hint 4: Zone-Redundant App Service Requirements</summary>

Zone-redundant App Service requirements:
- Minimum plan tier: Premium v3 (P1v3 or higher) or Isolated v2
- Minimum instance count: 3 (one per zone)
- Must be configured at plan creation time (cannot enable on existing plan)
- Supported regions: Most regions with availability zones
- Zone spreading is automatic and not configurable (Azure distributes evenly)

Cost impact: You pay for minimum 3 instances at all times (no scaling below 3). At P1v3 pricing (~$140/month per instance), minimum cost is ~$420/month for zone redundancy.

If a zone fails, the remaining 2 instances handle all traffic. Ensure your application can handle the load with 2/3 of capacity.

</details>

<details>
<summary>Hint 5: Health Probe Best Practices</summary>

Health probe configuration for maximum availability:
- **Endpoint**: Custom `/health` endpoint that checks database connectivity, cache availability, and disk space (not just TCP port check)
- **Protocol**: HTTP/HTTPS (Layer 7) rather than TCP (Layer 4) for application-aware health
- **Interval**: 5-15 seconds (shorter = faster detection but more overhead)
- **Unhealthy threshold**: 2-3 failures (shorter = faster removal but more false positives)

Time to remove unhealthy VM = interval x threshold = 5s x 2 = 10 seconds

Custom health endpoint example:
```csharp
app.MapGet("/health", async (DbContext db, IConnectionMultiplexer redis) =>
{
    var dbHealthy = await db.Database.CanConnectAsync();
    var redisHealthy = redis.IsConnected;
    return dbHealthy && redisHealthy ? Results.Ok() : Results.StatusCode(503);
});
```

</details>

## Learning Resources

- [Availability zones overview](https://learn.microsoft.com/en-us/azure/reliability/availability-zones-overview)
- [Virtual Machine Scale Sets - Flexible orchestration](https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-orchestration-modes)
- [Standard Load Balancer and Availability Zones](https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-standard-availability-zones)
- [Azure App Service zone redundancy](https://learn.microsoft.com/en-us/azure/app-service/how-to-zone-redundancy)
- [SLA for Virtual Machines](https://www.microsoft.com/licensing/docs/view/Service-Level-Agreements-SLA-for-Online-Services)
- [Autoscale overview for VMSS](https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-autoscale-overview)

## Knowledge Check

<details>
<summary>1. A government portal requires 99.99% uptime. The current deployment uses an availability set with 4 VMs. Why is this insufficient, and what change is needed?</summary>

**Availability sets only provide a 99.95% SLA, which allows up to 4.38 hours of downtime per year - far exceeding the 52.6-minute budget for 99.99%.** Availability sets protect against rack-level failures (fault domains) and platform updates (update domains) but cannot survive a full datacenter/zone failure. The fix is to migrate to availability zones, deploying VMs across at least 2 zones. This provides a 99.99% SLA because Azure guarantees the zones are physically separate datacenters with independent power, cooling, and networking.

</details>

<details>
<summary>2. A VMSS Flexible orchestration is configured across 3 availability zones with autoscale min=6. During a zone failure, how many instances remain, and is the service still available?</summary>

**4 instances remain (6 spread evenly across 3 zones = 2 per zone; losing 1 zone = 4 remaining).** The service remains available because the Standard Load Balancer's health probes detect the failed zone's instances as unhealthy and route all traffic to the 4 healthy instances in the remaining 2 zones. Autoscale may trigger to add instances in the healthy zones if the reduced capacity causes high CPU. For critical workloads, consider min=9 (3 per zone) so a zone failure leaves 6 instances - enough capacity without autoscale intervention.

</details>

<details>
<summary>3. An App Service plan is zone-redundant with 3 instances. Can you scale down to 1 instance during off-peak hours to save cost?</summary>

**No. Zone-redundant App Service plans require a minimum of 3 instances at all times.** This is a hard constraint because Azure needs at least one instance per zone to maintain zone redundancy. If you scale below 3, zone-redundancy is lost. For cost optimization with zone redundancy, use the smallest SKU that can handle your off-peak load with 3 instances (e.g., P1v3 instead of P2v3). Alternatively, if off-peak traffic is very low, consider whether you truly need zone redundancy 24/7 or only during business hours.

</details>

<details>
<summary>4. What is the composite SLA for an application that requires both a zone-redundant VM tier (99.99%) behind a Standard Load Balancer (99.99%) AND a zone-redundant App Service (99.99%)?</summary>

**If both tiers must function for the application to work (serial dependency): 0.9999 x 0.9999 x 0.9999 = 99.97%.** This is below the 99.99% target. To meet 99.99%, you need to either eliminate one dependency (use App Service for everything) or add redundancy. If the tiers are independent (either can serve users), the parallel formula applies: 1 - (0.0001 x 0.0001) = 99.9999%. In practice, most applications have serial dependencies, so minimizing the number of chained services is critical for achieving 99.99%.

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge30 --location eastus
```

2. Deploy a Virtual Machine Scale Set spread across availability zones:

```bash
az vmss create \
  --resource-group rg-az305-challenge30 \
  --name vmss-ha-lab \
  --image Ubuntu2204 \
  --vm-sku Standard_B1s \
  --instance-count 3 \
  --zones 1 2 3 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --load-balancer lb-ha-lab
```

3. Verify instances are distributed across zones:

```bash
az vmss list-instances \
  --resource-group rg-az305-challenge30 \
  --name vmss-ha-lab \
  --query "[].{Instance:instanceId, Zone:zones[0]}" -o table
```

4. Confirm the load balancer is using a zone-redundant frontend:

```bash
az network lb show \
  --resource-group rg-az305-challenge30 \
  --name lb-ha-lab \
  --query "frontendIPConfigurations[0].zones" -o table
```

5. Verify all three zones are in use (validates zone-spreading for 99.99% SLA):

```bash
az vmss list-instances \
  --resource-group rg-az305-challenge30 \
  --name vmss-ha-lab \
  --query "unique([].zones[0])" -o tsv
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az group delete --name rg-az305-challenge30 --yes --no-wait
```

---

**Next**: [Challenge 31: Design High Availability for Relational Data](/docs/az-305/business-continuity/challenge-31)
