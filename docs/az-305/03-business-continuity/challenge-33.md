---
sidebar_position: 9
title: "Challenge 33: Design a Highly Available Multi-Region Application"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 33: design a highly available Multi-Region Application

:::info Estimated Time and Cost

**90-120 min** | **Estimated cost**: $20-40 | **Exam Weight: 15-20%**

:::

## Introduction

StreamFlix is a video streaming platform serving 50 million monthly active users across North America, Europe, and Asia-Pacific. The platform streams 4K video content, manages user profiles and watch history, processes real-time recommendations, and handles content licensing metadata. StreamFlix has positioned itself as the "always-on" alternative to competitors, promising users they will never experience a buffering screen or service unavailability.

The executive team has mandated a 99.99% composite SLA with less than 50ms video start time globally and the ability to survive a complete Azure region failure with less than 2 minutes of user-visible impact. The platform must be active in 3 regions simultaneously (East US 2, North Europe, Japan East), not in an active-passive configuration. Every region must serve production traffic at all times, and if any single region fails, the remaining two must absorb its traffic without degradation.

This is the Domain 3 capstone challenge. You will combine all high availability, backup, and disaster recovery concepts from Challenges 25-32 into a complete, production-grade multi-region architecture. You must calculate the composite SLA mathematically, prove it meets the 99.99% target, and demonstrate that every component has appropriate redundancy.

## Exam skills covered

- Recommend a high availability solution for compute
- Recommend a high availability solution for relational data
- Recommend a high availability solution for semi-structured and unstructured data
- Recommend a recovery solution for Azure and hybrid workloads that meets recovery objectives

## Design tasks

### Part 1: global Traffic routing and edge layer

1. Design the global entry point using Azure Front Door:
   - Configure 3 origin groups (East US 2, North Europe, Japan East)
   - Routing method: latency-based (users routed to nearest healthy region)
   - Health probes: HTTP on `/health` endpoint, 10-second interval, 3 failures = unhealthy
   - Calculate failover detection time: probe interval x failure threshold = ?

2. Design the CDN and caching strategy:
   - Video content: serve from Azure CDN (or Front Door caching rules) with 24-hour TTL
   - API responses: cache personalized data? (No - dynamic content bypasses cache)
   - Static assets (UI, thumbnails): 7-day cache with cache-busting versioned URLs
   - Calculate: what percentage of requests hit CDN cache vs. origin?

3. Document the failover behavior when one region fails:
   - Time to detect: health probe interval x threshold
   - Time to reroute: Front Door propagation (near-instant, anycast)
   - User impact: requests in-flight to failed region fail, next request goes to healthy region
   - Total user-visible disruption: approximately 30-60 seconds

### Part 2: compute layer (Per-Region)

4. Design the compute architecture within each region:
   - Web/API tier: Azure Kubernetes Service (AKS) or App Service (zone-redundant)
   - Recommendation engine: Container Apps with autoscale
   - Video transcoding: VMSS with spot instances (batch, not HA-critical)

5. For each region, configure zone redundancy:
   - AKS with 3 availability zones, minimum 3 nodes (1 per zone)
   - Node autoscaler: min 3, max 12 (absorb traffic from a failed region)
   - Pod disruption budgets: minAvailable 66% (survive zone failure)

6. Calculate the per-region compute capacity required to absorb a failed region's traffic:
   - Normal operation: each region handles 33% of global traffic
   - During regional failure: each surviving region handles 50%
   - Autoscaler headroom: each region must be able to scale to 150% of normal capacity within 2 minutes
   - Design the autoscale triggers and pre-warming strategy

### Part 3: Data layer (Multi-Region)

7. Design the data architecture for each data type:

| Data Type | Service | Regions | Consistency | Failover |
|-----------|---------|---------|-------------|----------|
| User profiles & watch history | Cosmos DB (NoSQL) | 3, multi-write | Session | Automatic (99.999%) |
| Content catalog & licensing | Azure SQL Database | 3 (1 primary + 2 read) | Strong | Failover group |
| Video files (4K content) | Blob Storage + CDN | 3 (RA-GRS) | Eventual | CDN cache + secondary read |
| Session tokens | Azure Cache for Redis | 3 (Enterprise, active geo) | Eventual | Cross-region replication |
| Recommendations (ML model cache) | Redis or Cosmos DB | 3 | Eventual | Per-region rebuild |

8. Configure Cosmos DB for the user profile and watch history workload:
   - Multi-region writes (all 3 regions write locally)
   - Session consistency (user sees their own writes immediately)
   - Partition key strategy: `/userId` (ensures user data is co-located)
   - Autoscale: 10,000 - 100,000 RU/s per region (traffic-dependent)

9. Design the SQL Database topology for the content catalog:
   - Primary: East US 2 (Business Critical, zone-redundant, 16 vCores)
   - Failover group secondary: North Europe (automatic failover, 1-hour grace)
   - Active geo-replica: Japan East (read-only, manual failover)
   - Justify why content catalog uses SQL (relational licensing constraints, complex queries) vs. Cosmos DB

10. Configure the video content storage for global delivery:
    - Primary storage: East US 2 (RA-GRS, replicated to paired region)
    - Secondary storage accounts in North Europe and Japan East for region-local content
    - Azure CDN with multiple origin groups for failover
    - Cache warming: pre-populate CDN cache for new releases before launch

### Part 4: composite SLA calculation

11. Calculate the composite SLA for the complete architecture:

**Per-region SLA (serial dependencies):**
- Azure Front Door: 99.99%
- AKS (zone-redundant): 99.95%
- Cosmos DB (multi-region write): 99.999%
- Azure SQL (Business Critical, zone-redundant): 99.995%
- Azure Cache for Redis (Enterprise): 99.99%
- Storage (RA-GRS): 99.99%

Per-region composite = Front Door x AKS x Cosmos DB x SQL x Redis x Storage

**Multi-region SLA (parallel, active-active in 3 regions):**
- Multi-region availability = 1 - (1 - per-region)^3

12. Perform the calculation:
    - Per-region: 0.9999 x 0.9995 x 0.99999 x 0.99995 x 0.9999 x 0.9999 = ?
    - Does this meet 99.99%? If not, what is the bottleneck?
    - Multi-region: 1 - (1 - per-region)^3 = ?
    - Does the multi-region architecture meet or exceed 99.99%?

13. If the single-region composite falls below 99.99%, demonstrate how the active-active multi-region deployment recovers the target:
    - Even if per-region = 99.9%, multi-region = 1 - (0.001)^3 = 99.9999999%
    - The multi-region active-active pattern compensates for lower per-region SLAs
    - Document assumptions: Front Door must correctly detect and route around regional failures

### Part 5: failure testing and operations

14. Design a chaos engineering approach to validate the architecture:
    - **Zone failure test**: Simulate AZ failure, verify traffic redistributes within zone
    - **Region failure test**: Disable one region's origin in Front Door, verify failover < 2 minutes
    - **Data failure test**: Simulate Cosmos DB region unavailability, verify writes continue in other regions
    - **Cascading failure test**: Simulate Redis failure causing increased DB load

15. Create operational runbooks for:
    - Regional failover (automated via Front Door health probes)
    - Data consistency verification after a region recovery
    - Capacity validation (can 2 regions handle 100% of traffic?)
    - Post-incident review template

16. Design the monitoring and observability strategy:
    - Azure Monitor with cross-region dashboard
    - Per-region health score (composite of all services in that region)
    - Alerting: alert when any region drops below healthy threshold
    - SLA tracking: monthly uptime calculation with automated reports

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-33"
  items={[
    "Azure Front Door configured with 3 origin groups and latency-based routing with health probes",
    "Zone-redundant compute deployed in each region with autoscale to absorb regional failure",
    "Cosmos DB multi-region writes configured with appropriate consistency and conflict resolution",
    "SQL Database failover group and geo-replicas configured for content catalog",
    "Composite SLA calculated mathematically and proven to meet 99.99% target",
    "Chaos testing plan documented with specific failure scenarios and expected behavior"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Composite SLA Math</summary>

Step-by-step calculation:

**Per-region (serial):**
0.9999 x 0.9995 x 0.99999 x 0.99995 x 0.9999 x 0.9999 = 0.99914 (approximately 99.914%)

This is BELOW 99.99% for a single region. Single-region deployment cannot meet the requirement.

**Multi-region (parallel, 3 active regions):**
Per-region failure probability = 1 - 0.99914 = 0.00086
All-regions-fail probability = 0.00086^3 = 0.000000000636
Multi-region availability = 1 - 0.000000000636 = 99.9999999% (effectively 9+ nines)

Note: This calculation assumes independent failures across regions, which is a simplification. Correlated failures (e.g., a shared dependency outage) would reduce actual availability. The key insight: even though no single region meets 99.99%, three active regions together far exceed it. This is the fundamental value proposition of active-active multi-region architecture.

However, this assumes Front Door perfectly routes around failures. Front Door's own 99.99% SLA becomes the limiting factor:
Effective SLA = Front Door SLA x Multi-region backend SLA = 0.9999 x ~1.0 = 99.99%

</details>

<details>
<summary>Hint 2: Active-Active vs Active-Passive Multi-Region</summary>

**Active-Active (StreamFlix requirement):**
- All regions serve production traffic simultaneously
- Failover is instant (traffic already flowing to other regions)
- Capacity must be pre-provisioned in all regions (higher cost)
- Data must be writable in all regions (multi-region writes)
- SLA formula: parallel (dramatically higher availability)
- More expensive but meets the < 2 minute recovery requirement

**Active-Passive:**
- One region serves traffic, others are standby
- Failover requires starting/scaling passive region (minutes to hours)
- Standby region costs less (minimal capacity until activated)
- Data only writable in primary region (simpler consistency)
- Cannot meet < 2 minute recovery for full workloads
- Less expensive for lower availability requirements

StreamFlix MUST use active-active to meet the < 2 minute recovery requirement because passive regions cannot scale to handle production traffic in under 2 minutes.

</details>

<details>
<summary>Hint 3: Front Door Failover Timing</summary>

Azure Front Door failover detection and routing:
- Health probe interval: configurable (5-255 seconds, default 30)
- Unhealthy threshold: configurable (typically 3 failures)
- Detection time = interval x threshold = 10s x 3 = 30 seconds (with recommended settings)
- Routing update: near-instant (anycast architecture, no DNS propagation)

Total failover time for StreamFlix:
- Detection: 30 seconds (health probe detects origin failure)
- Routing: < 1 second (Front Door removes unhealthy origin from rotation)
- In-flight requests: may fail (10-30 second timeout on client)
- User retry: next request succeeds via healthy origin
- **Total user-visible impact: approximately 30-60 seconds** (meets < 2 minute requirement)

Optimization: Set probe interval to 5 seconds with threshold of 3 = 15 second detection.

</details>

<details>
<summary>Hint 4: AKS Zone-Redundancy and Capacity Planning</summary>

AKS zone-redundant configuration for StreamFlix:
```bash
az aks create \
  --resource-group rg-streamflix-eastus2 \
  --name aks-streamflix-eastus2 \
  --node-count 6 \
  --zones 1 2 3 \
  --enable-cluster-autoscaler \
  --min-count 6 \
  --max-count 18 \
  --node-vm-size Standard_D8s_v5
```

Capacity planning:
- Normal load per region: 6 nodes handle 33% of traffic (50M users / 3 regions)
- Zone failure: 4 nodes handle 33% (AKS redistributes pods to surviving nodes)
- Region failure: remaining 2 regions scale to 9-12 nodes each to handle 50% of traffic
- Autoscaler trigger: CPU > 60% or memory > 70% -> add nodes
- Scale-up time: ~2-3 minutes for new nodes to be ready (meets < 2 min only if pre-warmed)

Pre-warming strategy: keep min-count at 9 instead of 6 (pays for 50% more baseline capacity but guarantees immediate absorption of regional failure without waiting for autoscaler).

</details>

<details>
<summary>Hint 5: Video Start Time < 50ms Globally</summary>

Achieving < 50ms video start time requires CDN caching to handle the vast majority of video requests:
- Azure CDN PoPs are within 10-30ms of most users globally
- First-byte latency from CDN cache: ~10-50ms (meets requirement)
- First-byte latency from origin (cache miss): 100-500ms (does NOT meet requirement)
- Strategy: ensure > 99% cache hit ratio for video segments

Cache architecture:
- Video content is segmented (HLS/DASH, 2-10 second chunks)
- First segment of popular content pre-cached globally
- Cache TTL: 24 hours minimum (content doesn't change)
- Cache warming: push new content to all CDN PoPs before release
- Origin shield: intermediate cache layer reduces origin load

For the < 50ms requirement to be met globally, the CDN is not optional - it's architecturally critical. Without CDN caching, cross-region latency alone would exceed 50ms for remote users.

</details>

## Learning resources

- [Azure Front Door routing architecture](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-routing-architecture)
- [Multi-region web application - Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/app-service-web-app/multi-region)
- [Distribute data globally with Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/distribute-data-globally)
- [Azure Well-Architected Framework - Reliability](https://learn.microsoft.com/en-us/azure/well-architected/reliability/)
- [Composite SLA calculation](https://learn.microsoft.com/en-us/azure/architecture/framework/resiliency/business-metrics#composite-slas)
- [AKS availability zones](https://learn.microsoft.com/en-us/azure/aks/availability-zones)

## Knowledge check

<details>
<summary>1. StreamFlix's per-region composite SLA is 99.914%. How does deploying active-active across 3 regions achieve 99.99%+ overall, and what component becomes the effective SLA ceiling?</summary>

**With 3 active regions, the probability of ALL regions failing simultaneously is (1 - 0.99914)^3 = negligible, giving effective availability of ~99.9999999%.** However, Azure Front Door's own 99.99% SLA becomes the ceiling because it is a single global service through which all traffic flows - it cannot be made redundant within Azure. The effective composite SLA is: min(Front Door SLA, multi-region backend SLA) = min(99.99%, ~100%) = 99.99%. Front Door is the limiting factor, not the backend infrastructure. To exceed 99.99%, you would need a multi-CDN strategy (Front Door + Cloudflare/Akamai), which adds significant operational complexity.

</details>

<details>
<summary>2. Each StreamFlix region runs at 33% capacity during normal operations. When a region fails, the other two must handle 50% each. Why might autoscaling alone be insufficient to meet the 2-minute recovery target?</summary>

**AKS autoscaler takes 2-3 minutes to provision new nodes, which exceeds the 2-minute recovery budget.** The autoscaler must: detect increased load (30-60 seconds), request new VMs from Azure (30-60 seconds), wait for VMs to join the cluster (30-60 seconds), and schedule pods onto new nodes (10-30 seconds). Total: 2-4 minutes. Solution: over-provision baseline capacity so each region runs at ~50% utilization normally (min-count = 9 instead of 6). This "warm capacity" immediately absorbs the additional load from a failed region without waiting for autoscaler. The trade-off is 50% higher baseline compute cost for guaranteed sub-2-minute failover.

</details>

<details>
<summary>3. StreamFlix uses Cosmos DB multi-region writes for user profiles. If a user updates their profile in East US 2 and immediately reads from Japan East, what do they see under Session consistency?</summary>

**Under Session consistency with multi-region writes, the user sees their own update ONLY if they continue reading from the same region (East US 2) and pass the same session token.** Session consistency guarantees are scoped to a single client session (identified by the session token), not to a region. If the user's next read is routed to Japan East (e.g., because they traveled or Front Door rerouted), they might see stale data until replication catches up (typically milliseconds to a few seconds), unless the application forwards the session token. To guarantee read-your-own-writes globally, the application must pass the session token with each request regardless of region, or use Bounded Staleness with a tight window. In practice, this edge case rarely matters for profile reads.

</details>

<details>
<summary>4. The content catalog uses Azure SQL with a failover group (East US 2 -> North Europe) and a geo-replica (Japan East). If East US 2 fails, what happens in each region?</summary>

**North Europe is automatically promoted to primary (via failover group, ~30 seconds), and Japan East's geo-replica breaks because its source (East US 2) is gone.** After failover: North Europe handles all writes as the new primary. The failover group endpoint DNS updates automatically. Japan East's geo-replica must be re-created with North Europe as the new source. During the gap (minutes to hours), Japan East has stale read-only data from before the failure. Application design must handle this: Japan East can serve reads from its last good state while the geo-replica is re-established, or route writes through the failover group endpoint (higher latency from Japan East to North Europe). This is a known limitation of combining failover groups with additional geo-replicas.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge33 --location eastus
```

2. Deploy a Traffic Manager profile with performance routing:

```bash
az network traffic-manager profile create \
  --resource-group rg-az305-challenge33 \
  --name tm-multiregion-lab \
  --routing-method Performance \
  --unique-dns-name tm-az305-challenge33-$RANDOM \
  --protocol HTTP \
  --port 80 \
  --path "/"
```

3. Add two external endpoints simulating multi-region origins:

```bash
az network traffic-manager endpoint create \
  --resource-group rg-az305-challenge33 \
  --profile-name tm-multiregion-lab \
  --name endpoint-eastus \
  --type externalEndpoints \
  --target "www.microsoft.com" \
  --endpoint-location eastus

az network traffic-manager endpoint create \
  --resource-group rg-az305-challenge33 \
  --profile-name tm-multiregion-lab \
  --name endpoint-westeurope \
  --type externalEndpoints \
  --target "www.microsoft.com" \
  --endpoint-location westeurope
```

4. Verify the profile is active and endpoints are monitored:

```bash
az network traffic-manager profile show \
  --resource-group rg-az305-challenge33 \
  --name tm-multiregion-lab \
  --query "{Status:profileStatus, Routing:trafficRoutingMethod, FQDN:dnsConfig.fqdn}" -o table
```

5. Confirm both endpoints are online and responding to health checks:

```bash
az network traffic-manager endpoint list \
  --resource-group rg-az305-challenge33 \
  --profile-name tm-multiregion-lab \
  --query "[].{Name:name, Status:endpointMonitorStatus, Location:endpointLocation}" -o table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az group delete --name rg-az305-challenge33 --yes --no-wait
```

---

**Next**: [Challenge 34: Design Network Topology](/docs/az-305/infrastructure/challenge-34)
