---
sidebar_position: 10
title: "Challenge 43: Design Automated Deployment"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 43: design automated deployment

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $3-8 | **Exam Weight: 30-35%**

:::

## Introduction

VelocityShip is a fintech company deploying 10 microservices to production 3 times daily. Their current deployment process relies on manual scripts executed by senior engineers, resulting in a 15% deployment failure rate and an average recovery time of 45 minutes per failed deployment. Last month, a botched deployment caused 2 hours of downtime, costing the company $500K in lost transactions.

The CTO has mandated zero-downtime deployments with automatic rollback when health checks fail. The engineering team must implement infrastructure-as-code for all environments (dev, staging, production across 2 regions), container image promotion pipelines that prevent untested images from reaching production, and deployment strategies appropriate for each service type (stateless APIs, stateful workers, database schema changes).

The team is split between using GitHub Actions (already used for CI) and Azure DevOps (used by the platform team for release management). They need a recommendation that accounts for both teams' expertise while standardizing on a deployment approach that scales to 50 services within a year.

## Exam skills covered

- Recommend an automated deployment solution for applications

## Design tasks

### Part 1: infrastructure as code strategy

1. Compare Bicep, Terraform, and ARM templates for managing Azure infrastructure. Document the trade-offs in terms of: learning curve, state management, multi-cloud support, module ecosystem, and Azure-native integration.
2. Design an IaC repository structure that supports 10 microservices across 3 environments (dev, staging, production) and 2 regions. Address: shared infrastructure (VNet, Key Vault, Container Registry) vs. service-specific infrastructure.
3. Design a strategy for managing IaC state. For Terraform, compare remote state backends (Azure Storage, Terraform Cloud). For Bicep, document how idempotent deployments handle state implicitly.
4. Implement drift detection: how do you identify when manual changes have been made to infrastructure outside of IaC?

### Part 2: CI/CD pipeline design

5. Compare GitHub Actions and Azure DevOps Pipelines for this scenario. Consider: integration with existing tools, approval gates, environment protection rules, deployment history, and RBAC for production deployments.
6. Design a container image promotion pipeline:
   - Build and test in CI (run unit tests, SAST scanning)
   - Push to dev registry tag, deploy to dev environment
   - Promote to staging registry tag after integration tests pass
   - Promote to production registry tag after manual approval
7. Design the deployment pipeline to include pre-deployment validation (what-if for IaC, health check endpoints ready), deployment execution, post-deployment verification (smoke tests, synthetic monitoring), and automatic rollback trigger.

### Part 3: deployment strategies

8. Design a blue-green deployment strategy for the stateless API services using Azure Container Apps revisions or App Service deployment slots. Document traffic routing, health validation, and instant rollback procedure.
9. Design a canary deployment strategy for the payment processing service where you route 5% of traffic to the new version, monitor error rates for 10 minutes, then progressively increase to 25%, 50%, and 100%.
10. Design a rolling deployment strategy for the background worker services where you update instances one at a time with health checks between each. Document how you handle in-flight messages during updates.
11. Document your strategy for database schema migrations during zero-downtime deployments (expand-contract pattern, backward-compatible migrations).

### Part 4: rollback and Recovery

12. Define health check criteria that trigger automatic rollback: HTTP response codes, response latency percentiles, error rate thresholds, and custom business metrics.
13. Design a rollback procedure for each deployment strategy (blue-green: swap back, canary: route 100% to old, rolling: stop and revert).
14. Document how you handle the "deployment succeeded but caused performance degradation" scenario that only manifests under production load after 30 minutes.

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-43"
  items={[
    "IaC tool comparison documents trade-offs between Bicep and Terraform with justified recommendation",
    "Container image promotion pipeline prevents untested images from reaching production with gated stages",
    "Blue-green or canary deployment strategy designed with traffic routing and health validation steps",
    "Automatic rollback criteria defined with specific thresholds for error rate, latency, and health checks",
    "Database migration strategy supports zero-downtime deployments using expand-contract pattern",
    "CI/CD platform comparison addresses approval gates, environment protection, and RBAC for production"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Bicep vs. Terraform Decision Factors</summary>

Bicep is Azure-native with no state file (Azure Resource Manager tracks state), has first-day support for new Azure features, and compiles to ARM templates. Terraform uses HashiCorp Configuration Language, requires state management, supports multi-cloud, has a vast provider ecosystem, and uses a plan/apply workflow that shows changes before execution. For Azure-only shops, Bicep has lower operational overhead. For multi-cloud or teams with Terraform expertise, Terraform offers portability.

</details>

<details>
<summary>Hint 2: Container Apps Revision-Based Deployments</summary>

Azure Container Apps supports traffic splitting across revisions natively. Deploy a new revision, route a percentage of traffic to it, and monitor. If healthy, shift 100% traffic. If unhealthy, deactivate the new revision. This is built-in blue-green and canary without external tooling. Revisions are immutable, making rollback instantaneous by redirecting traffic to the previous revision.

</details>

<details>
<summary>Hint 3: App Service Deployment Slots</summary>

App Service deployment slots allow you to deploy to a non-production slot, warm it up, then swap with production. The swap operation redirects traffic instantly at the load balancer level (no cold start). You can configure auto-swap for continuous deployment or use slot-specific app settings to prevent connection strings from being swapped. Slots share the same App Service Plan resources.

</details>

<details>
<summary>Hint 4: GitHub Actions Environment Protection</summary>

GitHub Actions supports environments with protection rules: required reviewers (manual approval before deployment), wait timer (delay deployment by N minutes), and deployment branches (restrict which branches can deploy to production). Combined with OIDC federation for Azure authentication, this eliminates stored credentials and provides auditability for all production deployments.

</details>

<details>
<summary>Hint 5: Expand-Contract Database Migrations</summary>

For zero-downtime database changes: (1) Expand phase: add new columns/tables without removing old ones, deploy application code that writes to both old and new, (2) Migrate data: backfill new columns from old, (3) Contract phase: deploy application code that reads only from new, then remove old columns. Never rename or remove columns in the same deployment that changes application code. Use migration tools like EF Core Migrations or Flyway that support this pattern.

</details>

## Learning resources

- [Azure Container Apps blue-green deployment](https://learn.microsoft.com/en-us/azure/container-apps/blue-green-deployment)
- [Set up staging environments in Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots)
- [Bicep overview](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview)
- [GitHub Actions for Azure](https://learn.microsoft.com/en-us/azure/developer/github/github-actions)
- [Azure DevOps multi-stage pipelines](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/stages)
- [Deployment best practices](https://learn.microsoft.com/en-us/azure/architecture/framework/devops/release-engineering-cd)

## Knowledge check

<details>
<summary>1. A team uses Terraform to manage Azure infrastructure. After a deployment, they discover someone manually scaled a VM through the Azure portal. What happens on the next `terraform apply`?</summary>

**Terraform reverts the manual change.** Terraform compares the desired state (in .tf files) with the actual state (stored in the state file, refreshed from Azure on plan). It detects the drift between the state file and the live resource, then generates a plan to bring the resource back to the declared configuration. The manual scale change will be undone. This is why drift detection and state file management are critical. Teams should use `terraform plan` regularly to detect drift and establish policies against manual changes.

</details>

<details>
<summary>2. During a blue-green deployment, the new (green) environment passes health checks but users report intermittent errors 20 minutes after swap. What design element would have caught this?</summary>

**Extended bake time with production-level traffic monitoring.** Health checks alone verify basic connectivity, not behavior under real load. The deployment strategy should include: (1) A bake period where the new version handles production traffic while being closely monitored (error rates, latency P95/P99, business metrics), (2) Automatic rollback triggers based on these metrics, not just health endpoint status, (3) Canary deployment (gradual traffic shift) rather than immediate 100% swap to limit blast radius during the bake period.

</details>

<details>
<summary>3. A payment service requires exactly-once processing. During a rolling deployment, some messages are processed by old instances and some by new instances. How do you prevent duplicate or lost transactions?</summary>

**Use graceful shutdown with message completion guarantees.** Design the deployment to: (1) Stop routing new messages to the instance being updated (drain), (2) Wait for in-flight messages to complete processing (graceful shutdown timeout), (3) Only then terminate the old instance and start the new one. Use Service Bus PeekLock mode so messages are only completed after processing succeeds. If an instance terminates ungracefully, the lock expires and another instance reprocesses the message. Ensure handlers are idempotent to handle potential reprocessing safely.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge43 --location eastus
```

2. Create a Bicep template inline and deploy it:

```bash
cat <<'EOF' > main.bicep
param location string = resourceGroup().location
param storagePrefix string = 'staz305c43'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: '${storagePrefix}${uniqueString(resourceGroup().id)}'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}

output storageAccountName string = storageAccount.name
EOF
```

3. Deploy the Bicep template:

```bash
az deployment group create --resource-group rg-az305-challenge43 \
  --template-file main.bicep --query "properties.outputs" --output table
```

4. Verify the deployment succeeded and the storage account exists:

```bash
az deployment group list --resource-group rg-az305-challenge43 \
  --query "[].{Name:name, State:properties.provisioningState, Timestamp:properties.timestamp}" --output table
```

5. Confirm the storage account was created:

```bash
az storage account list --resource-group rg-az305-challenge43 \
  --query "[].{Name:name, Kind:kind, SKU:sku.name}" --output table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az group delete --name rg-az305-challenge43 --yes --no-wait
```

---

**Next**: [Challenge 44: Design a Migration Strategy Using CAF](/docs/az-305/infrastructure/challenge-44)
