---
sidebar_position: 8
title: "Challenge 32: Design High Availability for Non-Relational Data"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Challenge 32: design high availability for Non-Relational Data

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $15-30 | **Exam Weight: 15-20%**

:::

## Introduction

BattleForge Games is a global mobile gaming company with 25 million daily active players across North America, Europe, and Asia-Pacific. Their flagship game stores player profiles, inventory, progression data, and real-time match state in Azure Cosmos DB (NoSQL API) with multi-region writes. Game assets (textures, audio, 3D models totaling 5 TB) are served from Azure Blob Storage through Azure CDN for fast loading.

The gaming industry demands extreme availability: if players cannot access their profiles or game assets, they switch to a competitor within minutes. BattleForge requires that player profiles be writable from any region with less than 100ms latency, game assets must be available even if an entire Azure region goes down, and match state updates must be consistent across all players in a match (regardless of their geographic location).

The primary technical challenge is balancing consistency vs. availability in Cosmos DB. Multi-region writes provide the lowest latency but introduce conflict resolution complexity. The storage layer must provide continuous access to 5 TB of game assets even during regional failures, without requiring players to experience loading delays. BattleForge has a budget of $8,000/month for their data tier (excluding compute).

## Exam skills covered

- Recommend a high availability solution for semi-structured and unstructured data

## Design tasks

### Part 1: Cosmos DB Multi-Region write configuration

1. Design the Cosmos DB deployment for player profiles:
   - Account deployed to 3 regions: East US, West Europe, Japan East
   - Multi-region writes enabled (players write to nearest region)
   - Document the conflict resolution policy options:
     - Last Writer Wins (LWW) - automatic, uses timestamp
     - Custom conflict resolution - stored procedure
     - Which is appropriate for player profiles?

2. Evaluate the five Cosmos DB consistency levels and select the appropriate one for each workload:

<DecisionMatrix
  title="Cosmos DB Consistency Levels"
  headers={["Player Profiles", "Match State", "Leaderboards"]}
  rows={[
    {criteria: "Strong", values: ["Not available with multi-region writes; unnecessary latency overhead for profile data", "Ideal for correctness but NOT available with multi-region writes; requires single-write-region configuration", "Not recommended - excessive cost and latency for data that tolerates seconds of staleness"]},
    {criteria: "Bounded Staleness", values: ["Higher latency than needed; staleness guarantees add overhead without meaningful profile benefit", "Best alternative when multi-region writes enabled; configure tight K/T bounds for near-real-time consistency", "Good fit - ensures rankings are no more than T seconds behind actual state with predictable lag"]},
    {criteria: "Session", values: ["Recommended - player sees their own writes immediately while others see updates with minimal delay", "Insufficient - different players in the same match may see different game state causing desync issues", "Acceptable - each player sees their own ranking changes consistently within their session"]},
    {criteria: "Consistent Prefix", values: ["Acceptable - guarantees write order preserved but no read-your-own-write guarantee without session token", "Insufficient - guarantees ordering but not recency so players may see stale match state", "Good fit - rank changes always appear in correct order without the cost overhead of bounded staleness"]},
    {criteria: "Eventual", values: ["Not recommended - player may not see their own recent profile changes creating confusing UX", "Not suitable - players would see inconsistent and potentially out-of-order match state updates", "Acceptable for non-competitive or social leaderboards where slight staleness is tolerable"]}
  ]}
  storageKey="az305-challenge-32"
/>

3. Justify your consistency choice considering:
   - Session consistency for player profiles: player sees their own writes immediately, others see eventually
   - Strong consistency for match state: all players must see the same game state
   - Limitation: Strong consistency is NOT available with multi-region writes
   - What alternative achieves match consistency without strong consistency?

4. Configure the Cosmos DB account with multi-region writes:

```bash
# Create Cosmos DB account with multi-region writes
az cosmosdb create \
  --resource-group rg-battleforge \
  --name cosmos-battleforge \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=true \
  --locations regionName=westeurope failoverPriority=1 isZoneRedundant=true \
  --locations regionName=japaneast failoverPriority=2 isZoneRedundant=true \
  --enable-multiple-write-locations true \
  --default-consistency-level Session
```

### Part 2: Cosmos DB availability and failover

5. Analyze the availability characteristics of the multi-region write configuration:
   - What SLA does multi-region write Cosmos DB provide? (99.999% read and write)
   - What happens when one region fails? (Other regions continue serving reads AND writes)
   - How does zone redundancy within each region add further protection?

6. Compare single-region write vs. multi-region write for the match state use case:

| Aspect | Single-Region Write | Multi-Region Write |
|--------|--------------------|--------------------|
| Write latency from remote regions | High (cross-region round-trip) | Low (local write) |
| Conflict resolution | No conflicts | Must handle conflicts |
| Consistency options | All 5 levels including Strong | Strong NOT available |
| Write availability during region failure | Failover required (seconds) | Automatic (other regions continue) |
| Cost | Lower (no write replication fee) | Higher (multi-master RU charges) |

7. Design the match state architecture considering the strong consistency limitation:
   - Option A: Single-region write with bounded staleness (low conflict, predictable lag)
   - Option B: Multi-region writes with custom conflict resolution (complex but fastest)
   - Option C: Use a different service for match state (e.g., Azure SignalR for real-time sync)
   - Recommend and justify your choice

### Part 3: Storage account redundancy for game assets

8. Design the storage redundancy for 5 TB of game assets across these options:

| Redundancy | Copies | Regions | Read During Outage | Cost Multiplier |
|------------|--------|---------|-------------------|----------------|
| LRS | 3 in 1 zone | 1 | No | 1x |
| ZRS | 3 across zones | 1 | Zone failure: Yes | ~1.25x |
| GRS | 6 (3+3) | 2 | No (write failover needed) | ~2x |
| GZRS | 6 (3 ZRS + 3 LRS) | 2 | Zone failure: Yes | ~2.25x |
| RA-GRS | 6 (3+3) | 2 | Yes (secondary read-only) | ~2x + read ops |
| RA-GZRS | 6 (3 ZRS + 3 LRS) | 2 | Yes (zone + region) | ~2.5x |

9. Select the appropriate redundancy for game assets considering:
   - Assets must be available even if a full region fails
   - Read access is needed immediately (cannot wait for failover)
   - RA-GZRS provides the highest availability but at highest cost
   - Is RA-GRS sufficient given CDN caching covers most read scenarios?

10. Configure the storage account with the selected redundancy and the CDN for global distribution:

```bash
# Create storage account with RA-GRS (cdn handles zone-level caching)
az storage account create \
  --resource-group rg-battleforge \
  --name stbattleforgeassets \
  --location eastus \
  --sku Standard_RAGRS \
  --kind StorageV2 \
  --access-tier Hot
```

### Part 4: CDN and edge availability

11. Design the CDN architecture for game asset delivery:
    - Azure CDN (or Azure Front Door with caching) as the primary delivery mechanism
    - Configure cache rules: game assets are immutable (versioned URLs), cache for 30 days
    - Origin failover: if primary storage is unavailable, CDN serves from cache or secondary origin
    - Calculate: with 30-day cache TTL and 5 TB of assets, what percentage is typically cached at edge?

12. Design the fallback strategy when CDN cache misses during a primary region outage:
    - Configure CDN origin group with primary (East US) and secondary (RA-GRS secondary endpoint)
    - Health probe on origin to detect failure
    - Automatic origin failover within CDN configuration

13. Calculate the total monthly cost for the data tier:
    - Cosmos DB: 3 regions, multi-region write, estimated RU consumption
    - Storage: 5 TB with RA-GRS redundancy
    - CDN: bandwidth costs for global delivery
    - Verify total fits within $8,000/month budget

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-32"
  items={[
    "Cosmos DB configured with multi-region writes and zone redundancy in each region",
    "Consistency level selected and justified for each workload (profiles, match state, leaderboards)",
    "Conflict resolution strategy designed for multi-region writes",
    "Storage account redundancy selected (RA-GRS or RA-GZRS) with justification",
    "CDN configured with origin failover for continuous asset delivery",
    "Total data tier cost estimated and validated against $8K/month budget"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Cosmos DB Consistency and Multi-Region Writes</summary>

Critical limitation: **Strong consistency is NOT available when multi-region writes are enabled.** This is because strong consistency requires synchronous replication to all replicas before acknowledging a write, which is impractical across geographically distant regions (latency would be hundreds of milliseconds).

For multi-region write accounts, the highest available consistency is Bounded Staleness:
- Bounded Staleness: guarantees reads are no more than K versions or T seconds behind writes
- Session: guarantees a single client session sees its own writes (most popular choice)
- Consistent Prefix: guarantees reads never see out-of-order writes
- Eventual: no ordering guarantees, lowest latency

For player profiles: Session consistency is ideal (players see their own changes immediately).
For match state: Consider a single-write-region approach with Strong consistency for the match database, or use an external coordination mechanism.

</details>

<details>
<summary>Hint 2: Cosmos DB Multi-Region Write Conflict Resolution</summary>

When two regions write to the same document simultaneously, a conflict occurs. Resolution options:

**Last Writer Wins (LWW)**:
- Default policy, automatic
- Uses `_ts` (timestamp) or a custom path to determine winner
- Simpler but may lose data (losing write is discarded)
- Good for: player profiles where latest state is what matters

**Custom conflict resolution (stored procedure)**:
- Your code decides how to merge conflicting writes
- Can implement custom merge logic (e.g., combine inventory changes)
- More complex but preserves both writes
- Good for: game inventory where both additions should be kept

**Conflict feed (manual resolution)**:
- Conflicts are written to a conflict feed for application-level resolution
- Application reads and resolves conflicts asynchronously
- Most flexible but highest latency for resolution

For BattleForge player profiles: LWW with `_ts` is appropriate. If player updates their profile from two devices simultaneously, the latest update wins. For inventory, custom merge (combine both inventory changes) prevents item loss.

</details>

<details>
<summary>Hint 3: RA-GRS vs CDN for Asset Availability</summary>

Both provide read availability during outages, but serve different purposes:

**RA-GRS (Read-Access Geo-Redundant Storage)**:
- Secondary endpoint always available for reads: `stbattleforgeassets-secondary.blob.core.windows.net`
- RPO: up to 15 minutes (async replication lag)
- No caching - every read goes to storage
- Full 5 TB available from secondary at all times
- Use as CDN origin failover, not as direct player endpoint

**Azure CDN**:
- Cached at global edge locations (150+ PoPs worldwide)
- Sub-50ms latency to most players globally
- Serves from cache even if origin is completely down (until TTL expires)
- With 30-day TTL and versioned URLs: 95%+ cache hit rate for game assets
- Missing assets (cache miss) need a healthy origin - this is where RA-GRS secondary helps

Recommended: CDN as primary delivery with RA-GRS secondary as failover origin.

</details>

<details>
<summary>Hint 4: Cosmos DB Pricing for Multi-Region</summary>

Cosmos DB multi-region write cost considerations:
- Write RU cost: billed per region that participates in writes (effectively multiplied by region count)
- Example: 10,000 RU/s provisioned, 3 write regions = 30,000 RU/s billed
- Read RUs: billed per region where reads occur
- Alternative: Use autoscale to avoid over-provisioning (max RU/s, pay for actual usage)

Cost estimate for BattleForge:
- Player profile operations: ~5,000 RU/s average (peaks to 15,000 during events)
- 3 write regions: 15,000 RU/s base provisioned
- At $0.008 per 100 RU/s/hour: 15,000/100 x $0.008 x 730 hours = ~$876/month
- With autoscale (max 50,000 RU/s): billed at 10% of max when idle = $292/month base

Storage: $0.25/GB/month for data, replicated to 3 regions = $0.75/GB/month effective

</details>

<details>
<summary>Hint 5: Cosmos DB 99.999% SLA Requirements</summary>

To achieve the 99.999% SLA (5 nines, ~26 seconds downtime/year), ALL of the following must be configured:
1. Multi-region writes enabled (distributes writes, no single point of failure)
2. At least 2 regions configured (minimum for geo-redundancy)
3. Zone redundancy enabled in each region (isZoneRedundant=true)

Without multi-region writes: SLA is 99.99% for reads, 99.99% for writes (with zone redundancy)
With multi-region writes: SLA is 99.999% for both reads and writes

This is the highest SLA of any Azure database service. Compare:
- Azure SQL Business Critical zone-redundant: 99.995%
- Azure SQL General Purpose zone-redundant: 99.99%
- Cosmos DB single-region zone-redundant: 99.99%
- Cosmos DB multi-region multi-write: 99.999%

</details>

## Learning resources

- [Distribute data globally with Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/distribute-data-globally)
- [Consistency levels in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels)
- [Conflict resolution in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/conflict-resolution-policies)
- [Azure Storage redundancy](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy)
- [Azure CDN overview](https://learn.microsoft.com/en-us/azure/cdn/cdn-overview)
- [High availability for Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/high-availability)

## Knowledge check

<details>
<summary>1. BattleForge needs all players in a multiplayer match to see the same game state. Why can't they use Strong consistency with multi-region writes, and what is the recommended alternative?</summary>

**Strong consistency is not available when multi-region writes are enabled in Cosmos DB.** Strong consistency requires synchronous acknowledgment from all replicas before completing a write, which creates unacceptable latency across geographically distant regions. The recommended alternative for match state is to use a single-write-region with Strong consistency for the match database specifically (match sessions are typically regional), or use Bounded Staleness with a tight staleness window (e.g., 5 seconds, 10 operations). Alternatively, use Azure SignalR Service for real-time state synchronization, with Cosmos DB only for persistence.

</details>

<details>
<summary>2. A Cosmos DB account with multi-region writes and zone redundancy provides 99.999% SLA. What does this mean in practical downtime terms, and what scenario could still cause unavailability?</summary>

**99.999% availability means maximum 26 seconds of downtime per year (or ~2.6 seconds per month).** This is achieved because writes can succeed in any of the configured regions - a full region failure simply means writes land in other regions. Scenarios that could still cause unavailability include: (1) Multiple regions failing simultaneously (extremely unlikely), (2) Azure-wide platform issues affecting the Cosmos DB control plane globally, (3) Client-side network issues (not covered by SLA), (4) Exceeding provisioned throughput causing 429 throttling errors (not a true availability failure but impacts users similarly). Proper RU capacity planning and autoscale mitigate scenario 4.

</details>

<details>
<summary>3. BattleForge uses RA-GRS for their 5 TB game asset storage. During a primary region outage, what is the maximum staleness of data players might read from the secondary?</summary>

**Up to 15 minutes (but typically much less).** RA-GRS replicates data asynchronously to the secondary region. Microsoft targets an RPO of 15 minutes (no SLA guarantee on exact lag). In practice, replication is usually seconds behind. For game assets that are written once and read many times (immutable, versioned files), this staleness is irrelevant - assets uploaded 15+ minutes ago are fully replicated. The only risk is very recently uploaded assets (new game update) not yet replicated. Mitigation: upload new assets at least 30 minutes before making them referenced by game clients, or use CDN cache warming.

</details>

<details>
<summary>4. Two players in different regions simultaneously purchase the same limited-edition item in BattleForge (only 1 available). With Last Writer Wins conflict resolution, what happens?</summary>

**Both writes initially succeed locally (each player sees the purchase confirmed), but LWW conflict resolution will keep only the later timestamp, effectively "canceling" the other player's purchase after replication.** This creates a poor user experience - one player thinks they bought the item but it later disappears. For inventory with limited quantities, LWW is inappropriate. Better options: (1) Use a single-write region for the inventory service (Strong consistency, serializable transactions prevent overselling), (2) Use custom conflict resolution with a stored procedure that checks quantity before resolving, (3) Use an external coordination mechanism (distributed lock via Redis) for limited-quantity operations.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge32 --location eastus
```

2. Deploy a Cosmos DB account with multi-region writes enabled:

```bash
az cosmosdb create \
  --resource-group rg-az305-challenge32 \
  --name cosmos-challenge32-$RANDOM \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=false \
  --locations regionName=westus failoverPriority=1 isZoneRedundant=false \
  --enable-multiple-write-locations true \
  --default-consistency-level Session
```

3. Create a database and container with a partition key:

```bash
COSMOS_NAME=$(az cosmosdb list --resource-group rg-az305-challenge32 --query "[0].name" -o tsv)

az cosmosdb sql database create \
  --resource-group rg-az305-challenge32 \
  --account-name $COSMOS_NAME \
  --name gamedb

az cosmosdb sql container create \
  --resource-group rg-az305-challenge32 \
  --account-name $COSMOS_NAME \
  --database-name gamedb \
  --name profiles \
  --partition-key-path "/userId" \
  --throughput 400
```

4. Verify multi-region write is enabled and regions are active:

```bash
az cosmosdb show \
  --resource-group rg-az305-challenge32 \
  --name $COSMOS_NAME \
  --query "{MultiRegionWrites:enableMultipleWriteLocations, Regions:writeLocations[].locationName}" -o table
```

5. Confirm the account exposes write endpoints in both regions:

```bash
az cosmosdb show \
  --resource-group rg-az305-challenge32 \
  --name $COSMOS_NAME \
  --query "writeLocations[].[locationName, documentEndpoint]" -o table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az group delete --name rg-az305-challenge32 --yes --no-wait
```

---

**Next**: [Challenge 33: Design a Highly Available Multi-Region Application](/docs/az-305/business-continuity/challenge-33)
