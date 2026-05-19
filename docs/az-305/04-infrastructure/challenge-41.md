---
sidebar_position: 8
title: "Challenge 41: Design a Caching Strategy"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 41: design a caching strategy

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $5-15 | **Exam Weight: 30-35%**

:::

## Introduction

SocialPulse is a social media platform with 50 million active users. Their core feature is a personalized feed that aggregates content from 50+ sources including friends' posts, trending topics, sponsored content, and algorithmic recommendations. Currently, the feed takes 2 seconds to load because each request triggers real-time aggregation queries across multiple databases and microservices.

The platform's access pattern is heavily read-biased: feeds are read approximately 1,000 times for every write (new post or interaction). The product team requires feed load time under 200 milliseconds to remain competitive. Additionally, some data is session-specific (user's scroll position, draft replies) while other data is shared across millions of users (trending posts, popular hashtags, public profiles).

The engineering team needs a comprehensive caching strategy that addresses multiple layers: CDN for static assets, application-level caching for computed feeds, and session caching for user state. They must also design cache invalidation logic that ensures users see new posts within 30 seconds of publication without overwhelming the origin services.

## Exam skills covered

- Recommend a caching solution for applications

## Design tasks

### Part 1: evaluate caching tiers and select redis configuration

1. Compare Azure Cache for Redis tier options (Basic, Standard, Premium, Enterprise, Enterprise Flash) and document the feature differences relevant to this scenario (clustering, geo-replication, persistence, data size, availability SLA).
2. Determine which Redis tier and instance size is appropriate for:
   - Session cache: 10 million concurrent sessions, each approximately 2KB
   - Feed cache: 50 million users with average feed size of 50KB, 20% active at peak
   - Shared content cache: 100,000 trending items, average 5KB each
3. Design the key schema and eviction policy for each cache type. Document TTL strategy for session data vs. feed data vs. shared content.

### Part 2: design CDN and edge caching

4. Compare Azure Front Door caching capabilities with Azure CDN profiles for serving static assets (images, videos, CSS/JS bundles). Document when to use each.
5. Design cache rules for different content types:
   - Profile images (change infrequently, publicly accessible)
   - Video thumbnails (immutable once generated)
   - API responses for trending content (changes every 5 minutes)
6. Design a cache purge strategy for when users update their profile photo or delete a post.

### Part 3: implement Application-Level caching patterns

7. Design a cache-aside (lazy loading) pattern for user feed generation. Document the read path (check cache, fallback to origin, populate cache) and the write path (invalidate cache on new post).
8. Evaluate write-through vs. write-behind caching for the notification system where delivery guarantees matter. Document trade-offs of each approach.
9. Design a cache warming strategy for popular feeds that should never experience a cold cache miss (celebrity accounts, brand pages with millions of followers).
10. Design a circuit breaker pattern for when Redis becomes unavailable. What is the fallback? How do you prevent thundering herd when the cache comes back?

### Part 4: cache invalidation and consistency

11. Design an event-driven cache invalidation system using Azure Event Grid or Service Bus that propagates content changes to all cache layers within the 30-second SLA.
12. Document how you handle cache stampede (multiple simultaneous requests for the same expired key) using distributed locking or request coalescing.
13. Create a monitoring plan that tracks cache hit ratio, latency percentiles (p50, p95, p99), memory utilization, and eviction rate.

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-41"
  items={[
    "Redis tier selection justified with feature comparison matrix covering clustering, persistence, geo-replication, and SLA requirements",
    "CDN strategy documented with cache rules for static assets, API responses, and purge mechanisms",
    "Cache-aside pattern designed with TTL strategy, eviction policy, and invalidation triggers for each data type",
    "Cache stampede mitigation documented using distributed locking or request coalescing approach",
    "Monitoring plan covers hit ratio, latency percentiles, memory utilization, and eviction rate alerts",
    "Fallback strategy designed for Redis unavailability with thundering herd prevention"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Redis Tier Selection</summary>

Azure Cache for Redis Enterprise tier supports active geo-replication (multi-region writes), RediSearch, and RedisJSON modules. Premium tier supports clustering (up to 10 shards), geo-replication (active-passive only), VNet injection, and data persistence. Standard tier provides a replicated cache with 99.9% SLA but no clustering. For 20GB+ datasets with high throughput needs, you need Premium or Enterprise.

</details>

<details>
<summary>Hint 2: Cache-Aside vs. Read-Through</summary>

In cache-aside (lazy loading), the application is responsible for reading from and writing to the cache. On a cache miss, the application queries the database, then populates the cache. In read-through, the cache itself fetches from the origin on a miss. Azure Cache for Redis supports cache-aside natively. Read-through requires custom implementation or a framework like Redis Gears.

</details>

<details>
<summary>Hint 3: Preventing Cache Stampede</summary>

When a popular cache key expires, hundreds of requests simultaneously hit the origin. Solutions include: (1) probabilistic early expiration (refresh before TTL expires), (2) distributed mutex (only one request fetches from origin while others wait), (3) request coalescing at the application layer, (4) never-expire with background refresh. Azure Cache for Redis supports distributed locks using SET with NX and PX options.

</details>

<details>
<summary>Hint 4: Azure Front Door Caching</summary>

Azure Front Door caches content at edge POPs globally. It supports cache rules based on query string, request headers, and URL path patterns. Cache duration can be set via origin headers (Cache-Control, Expires) or overridden with Front Door rules. Purge can target specific URLs, wildcard paths, or all content. Front Door also supports compression at the edge.

</details>

<details>
<summary>Hint 5: Memory Sizing for Redis</summary>

Calculate memory needs considering: serialization overhead (JSON is 2-3x larger than binary), Redis metadata per key (approximately 70 bytes), fragmentation ratio (typically 1.2-1.5x), and replication (replica doubles memory usage). For 10M sessions at 2KB each, raw data is 20GB but actual Redis memory needed is approximately 30-40GB with overhead.

</details>

## Learning resources

- [Azure Cache for Redis overview](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview)
- [Azure Cache for Redis service tiers](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview#service-tiers)
- [Caching with Azure Front Door](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-caching)
- [Cache-aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- [Best practices for Azure Cache for Redis](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-best-practices-development)
- [Azure Architecture Center - Caching guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/caching)

## Knowledge check

<details>
<summary>1. A social media platform needs sub-millisecond read latency for session data with 99.99% availability across two regions with active-active writes. Which Azure Cache for Redis tier is required?</summary>

**Enterprise tier.** Only the Enterprise tier supports active geo-replication (multi-region active-active writes) where writes to any region are replicated to all others. Premium tier supports geo-replication but only in active-passive mode (one primary, one read-only replica). The Enterprise tier also provides 99.99% SLA with zone redundancy, compared to 99.9% for Standard and Premium tiers.

</details>

<details>
<summary>2. Your cache stores user feeds that change when any of 50+ source services publishes new content. Cache-aside with a 60-second TTL results in stale data complaints. What pattern better fits this write-heavy invalidation scenario?</summary>

**Event-driven invalidation with write-behind refresh.** Instead of relying solely on TTL expiration, implement an event-driven architecture where content services publish change events to a message bus. A cache invalidation service subscribes to these events and either invalidates or proactively refreshes affected cache entries. This provides near-real-time freshness without the cost of extremely short TTLs (which reduce hit ratio) or polling (which wastes resources).

</details>

<details>
<summary>3. During peak traffic, a celebrity posts and 5 million followers' feed caches are immediately invalidated. What problem does this create and how do you solve it?</summary>

**Cache stampede (thundering herd).** All 5 million followers requesting their feed simultaneously will miss the cache and hit the origin services, potentially causing cascading failure. Solutions: (1) Stagger invalidation over 30 seconds using a queue, (2) Use background pre-computation to warm celebrity followers' caches before invalidating the old entries, (3) Implement request coalescing so only one origin request is made per unique feed while others wait, (4) Use a "stale-while-revalidate" pattern where slightly stale data is served while refresh happens in the background.

</details>

<details>
<summary>4. You need to cache 500GB of feed data across regions. Premium tier supports up to 10 shards at 120GB each (1.2TB total). Enterprise Flash supports up to 4.5TB. What factors beyond raw capacity determine the right choice?</summary>

**Cost, latency, module support, and access patterns.** Enterprise Flash uses a combination of RAM and NVMe SSDs, providing large capacity at lower cost per GB but with slightly higher latency (single-digit ms vs. sub-ms for RAM-only). If your workload tolerates 1-2ms latency and needs large datasets, Enterprise Flash is more cost-effective. If you need sub-millisecond latency for all operations, Premium with clustering keeps everything in RAM. Enterprise (non-Flash) also adds Redis modules (RediSearch, RedisJSON) which enable secondary indexing and native JSON operations that could simplify feed queries.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge41 --location eastus
```

2. Deploy a Redis Cache (Basic C0 tier, smallest available):

```bash
az redis create --resource-group rg-az305-challenge41 --name redis-challenge41-$RANDOM \
  --sku Basic --vm-size c0 --location eastus
```

3. Wait for provisioning and retrieve the access key:

```bash
az redis show --resource-group rg-az305-challenge41 \
  --name $(az redis list --resource-group rg-az305-challenge41 --query "[0].name" -o tsv) \
  --query "{HostName:hostName, Port:sslPort, ProvisioningState:provisioningState}" --output table
```

4. Test a SET and GET operation using redis-cli:

```bash
REDIS_HOST=$(az redis list --resource-group rg-az305-challenge41 --query "[0].hostName" -o tsv)
REDIS_KEY=$(az redis list-keys --resource-group rg-az305-challenge41 --name $(az redis list --resource-group rg-az305-challenge41 --query "[0].name" -o tsv) --query "primaryKey" -o tsv)
redis-cli -h $REDIS_HOST -p 6380 --tls -a $REDIS_KEY SET testkey "hello-az305" && \
redis-cli -h $REDIS_HOST -p 6380 --tls -a $REDIS_KEY GET testkey
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az group delete --name rg-az305-challenge41 --yes --no-wait
```

---

**Next**: [Challenge 42: Design Application Configuration Management](/docs/az-305/infrastructure/challenge-42)
