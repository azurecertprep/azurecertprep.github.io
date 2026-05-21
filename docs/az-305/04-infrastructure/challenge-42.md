---
sidebar_position: 9
title: "Challenge 42: Design Application Configuration Management"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 42: design Application configuration Management

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $2-5 | **Exam Weight: 30-35%**

:::

## Introduction

CloudScale Inc. operates a microservices platform with 30 services deployed across 4 environments (development, testing, staging, production). Each service maintains its own configuration files, leading to configuration drift that has caused 3 production incidents in the past quarter. One incident occurred when a developer changed a connection string in staging that was accidentally promoted to production. Another happened when a feature flag was enabled globally instead of for a targeted 5% rollout.

The platform team needs a centralized configuration management solution that provides: a single source of truth for all service configuration, environment-specific overrides without code changes, feature flags with gradual rollout capabilities (percentage-based, user-targeting, time-windowed), instant kill switches for problematic features, and an audit trail of all configuration changes.

Additionally, sensitive configuration values (database passwords, API keys, certificates) must remain in Azure Key Vault with proper access controls, while non-sensitive settings (feature flags, timeouts, connection pool sizes) should be easily manageable by product owners without engineering intervention.

## Exam skills covered

- Recommend an application configuration management solution

## Design tasks

### Part 1: design centralized configuration architecture

1. Deploy an Azure App Configuration store and design a key naming convention that supports 30 services across 4 environments. Consider using labels for environment differentiation vs. separate stores per environment.
2. Design a configuration hierarchy that supports:
   - Global settings shared by all services (e.g., logging level, telemetry endpoint)
   - Service-specific settings (e.g., connection pool size, timeout values)
   - Environment-specific overrides (e.g., database connection strings per environment)
3. Document the trade-offs between using a single App Configuration store with labels vs. multiple stores (one per environment). Consider cost, access control granularity, and blast radius of misconfigurations.

### Part 2: integrate Key Vault references

4. Design a solution that stores sensitive values in Azure Key Vault while referencing them from App Configuration. Document how Key Vault references work and how applications resolve them at runtime.
5. Define access control boundaries: which teams can manage non-sensitive configuration (product owners) vs. secrets (security team) vs. feature flags (engineering leads).
6. Design a secret rotation strategy that updates Key Vault secrets without requiring application restarts. Document how configuration refresh intervals interact with Key Vault reference resolution.

### Part 3: feature Management and gradual rollout

7. Design a feature flag system using App Configuration feature management that supports:
   - Boolean on/off flags (kill switches)
   - Percentage-based rollout (enable for 5%, then 25%, then 100%)
   - User-targeting filters (enable for specific user IDs or groups)
   - Time-window filters (enable only during business hours or specific dates)
8. Design a rollout strategy for a new payment processing feature: start with internal users, expand to 5% of external users, monitor error rates, then increase to 25%, 50%, and 100%.
9. Document how to implement an instant kill switch that disables a feature across all 30 services within 60 seconds without redeployment.

### Part 4: configuration refresh and monitoring

10. Design a configuration refresh strategy that balances freshness with performance. Compare polling-based refresh (sentinel key pattern) vs. push-based refresh (Event Grid notifications).
11. Design a monitoring and alerting solution that detects:
    - Configuration changes (audit log)
    - Configuration refresh failures in applications
    - Feature flag state changes
12. Document how App Configuration snapshots can be used to create point-in-time configuration sets for deployment consistency and rollback scenarios.

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-42"
  items={[
    "Key naming convention documented with hierarchy supporting 30 services across 4 environments",
    "Key Vault reference integration designed with access control separation between configuration and secrets",
    "Feature flag system supports percentage rollout, user targeting, time windows, and kill switches",
    "Configuration refresh strategy documented with sentinel key pattern or Event Grid push approach",
    "Snapshot strategy defined for deployment consistency and rollback capability",
    "Monitoring covers configuration changes, refresh failures, and feature flag state transitions"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Key Naming Convention</summary>

Azure App Configuration supports hierarchical key names using delimiters (commonly `:` or `/`). A common pattern is `{application}:{component}:{setting}` with labels for environments. For example: key = `OrderService:Database:ConnectionTimeout`, label = `Production`. This allows querying all settings for a service or all settings across services for an environment using key filters and label filters.

</details>

<details>
<summary>Hint 2: Sentinel Key Pattern</summary>

Instead of watching all configuration keys for changes (expensive at scale), use a sentinel key pattern: applications poll a single sentinel key (e.g., `app:settings:version`). When any configuration changes, update the sentinel value. Applications only reload full configuration when the sentinel changes, reducing polling traffic from O(n) keys to O(1) key per refresh interval.

</details>

<details>
<summary>Hint 3: Feature Flag Filters</summary>

Azure App Configuration feature management supports built-in filters: `Microsoft.Targeting` (percentage and user/group targeting), `Microsoft.TimeWindow` (start/end dates), and custom filters. Targeting filters use consistent hashing so the same users always see the same flag state at a given percentage. You can combine multiple filters with AND/OR logic for complex rollout rules.

</details>

<details>
<summary>Hint 4: Configuration Store Tiers</summary>

Azure App Configuration offers Free and Standard tiers. The Free tier is limited to 10MB storage, 1,000 requests/day, and no SLA. The Standard tier provides 1GB storage, higher request throughput per replica (see current Azure documentation for exact limits), 99.9% SLA, private endpoints, managed identity, and geo-replication. For production workloads with 30 services polling configuration, the Standard tier with replicas is essential.

</details>

<details>
<summary>Hint 5: Snapshots for Deployment Safety</summary>

App Configuration snapshots create an immutable, point-in-time copy of key-values. You can take a snapshot before deployment so that if configuration changes cause issues, you can instantly revert all services to the snapshot state. Snapshots can also be used to ensure all services in a deployment use the same configuration version, preventing inconsistency during rolling deployments.

</details>

## Learning resources

- [Azure App Configuration overview](https://learn.microsoft.com/en-us/azure/azure-app-configuration/overview)
- [Use Key Vault references in App Configuration](https://learn.microsoft.com/en-us/azure/azure-app-configuration/use-key-vault-references-dotnet-core)
- [Feature management overview](https://learn.microsoft.com/en-us/azure/azure-app-configuration/concept-feature-management)
- [App Configuration best practices](https://learn.microsoft.com/en-us/azure/azure-app-configuration/howto-best-practices)
- [Azure App Configuration snapshots](https://learn.microsoft.com/en-us/azure/azure-app-configuration/concept-snapshots)
- [Enable dynamic configuration with push refresh](https://learn.microsoft.com/en-us/azure/azure-app-configuration/enable-dynamic-configuration-push-refresh)

## Knowledge check

<details>
<summary>1. A company uses a single App Configuration store with labels to separate environments. A developer accidentally applies the "Production" label to a test configuration value. How could the architecture prevent this?</summary>

**Use Azure RBAC with custom roles or separate stores.** Options include: (1) Use separate App Configuration stores per environment with different RBAC assignments (developers have write access to dev/test stores only), (2) Use custom RBAC roles that restrict label-based writes (e.g., only CI/CD pipelines can write keys with the "Production" label), (3) Implement Azure Policy to audit configuration changes, (4) Use App Configuration's read-only access keys for production consumers while only the deployment pipeline has write access.

</details>

<details>
<summary>2. Thirty microservices each poll App Configuration every 30 seconds. The configuration store starts throttling requests. What design change reduces request volume while maintaining freshness?</summary>

**Implement the sentinel key pattern with Event Grid push notifications.** Instead of 30 services each polling N keys every 30 seconds, each service watches only a single sentinel key. This reduces polling from 30 x N to 30 x 1 requests per interval. Better yet, switch to push-based refresh using Event Grid: App Configuration emits events on key changes, services subscribe via Event Grid, and only refresh when actually notified of changes. This eliminates periodic polling entirely and provides near-instant propagation.

</details>

<details>
<summary>3. A feature flag is configured for 10% rollout using the Targeting filter. A user reports they sometimes see the feature and sometimes do not across sessions. What is wrong?</summary>

**The targeting context is not using a consistent user identifier.** The Targeting filter uses consistent hashing on the user identifier to determine flag state. If the application passes different identifiers (e.g., session ID instead of user ID), the same user will get different results across sessions. The fix is to always pass the authenticated user's stable identifier as the targeting context. If the user is anonymous, use a persistent cookie or device ID for consistency.

</details>

<details>
<summary>4. Your application references a Key Vault secret from App Configuration. The secret is rotated in Key Vault but the application still uses the old value. What is the likely cause?</summary>

**The App Configuration refresh interval has not elapsed, or the Key Vault reference uses a versioned secret URI.** App Configuration caches Key Vault reference resolutions for the duration of the configuration refresh interval. If the reference points to a specific secret version (e.g., `https://vault.vault.azure.net/secrets/db-password/abc123`), it will always resolve to that version. Use a versionless URI (e.g., `https://vault.vault.azure.net/secrets/db-password`) to always resolve to the latest version, and ensure the refresh interval is short enough to pick up rotated secrets within your tolerance window.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge42 --location eastus
```

2. Create an App Configuration store:

```bash
az appconfig create --resource-group rg-az305-challenge42 \
  --name appconfig-challenge42-$RANDOM --location eastus --sku Free
```

3. Add a key-value pair and a feature flag:

```bash
APPCONFIG_NAME=$(az appconfig list --resource-group rg-az305-challenge42 --query "[0].name" -o tsv)
az appconfig kv set --name $APPCONFIG_NAME --key "App:Settings/FontSize" --value "24" --yes
az appconfig feature set --name $APPCONFIG_NAME --feature "Beta" --yes
```

4. Enable the feature flag and verify configuration:

```bash
az appconfig feature enable --name $APPCONFIG_NAME --feature "Beta" --yes
az appconfig kv list --name $APPCONFIG_NAME --output table
```

5. Verify the feature flag state:

```bash
az appconfig feature list --name $APPCONFIG_NAME --output table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az group delete --name rg-az305-challenge42 --yes --no-wait
```

---

**Next**: [Challenge 43: Design Automated Deployment](/docs/az-305/infrastructure/challenge-43)
