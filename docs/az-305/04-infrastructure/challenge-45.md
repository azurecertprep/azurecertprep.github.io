---
sidebar_position: 12
title: "Challenge 45: Design Server and Application Migration"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 45: Design Server and Application Migration

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $2-5 | **Exam Weight: 30-35%**

:::

## Introduction

Following the Cloud Adoption Framework strategy developed for Precision Manufacturing (Challenge 44), the migration team has completed a 30-day discovery using Azure Migrate appliances in both data centers. The assessment reveals 200 servers with the following breakdown:

**Windows VMs (80):** 35 IIS web applications (.NET Framework 4.5-4.8), 15 file servers (50TB total shared storage), 10 Active Directory domain controllers and supporting infrastructure (ADFS, ADCS, NPS), 12 application servers running custom Windows services, 8 Remote Desktop Session Hosts.

**Linux VMs (50):** 20 web servers (12 Apache with PHP, 8 Nginx with Node.js), 15 application servers (Python Flask/Django), 10 utility servers (monitoring, logging, scheduling), 5 containerized applications already running Docker.

**Legacy applications (40):** 8 applications with hard-coded IP addresses in configuration, 12 applications with dependencies on specific OS versions (Windows Server 2012 R2), 10 applications with local file system dependencies, 10 applications with undocumented third-party integrations.

The migration team needs to categorize each workload group, select the appropriate Azure target (IaaS vs PaaS), recommend specific migration tools, and design a validation strategy.

## Exam Skills Covered

- Evaluate on-premises servers, data, and applications for migration
- Recommend a solution for migrating workloads to infrastructure as a service (IaaS) and platform as a service (PaaS)

## Design Tasks

### Part 1: Assessment and Discovery Analysis

1. Review the Azure Migrate assessment output and create a workload categorization matrix with columns for: workload name, current platform, dependencies discovered, Azure readiness status (ready, conditionally ready, not ready), recommended target, and migration tool.
2. For each workload group, document the assessment criteria that determine IaaS vs. PaaS target:
   - Can it run on PaaS without code changes? (framework version, OS dependencies, local storage usage)
   - Does it benefit from PaaS features? (auto-scaling, managed patching, built-in HA)
   - Are there blocking dependencies? (specific OS version, kernel modules, local services)
3. Identify the "blockers" for each conditionally-ready workload and document the remediation steps needed before migration (e.g., upgrade .NET Framework version, remove hard-coded IPs, externalize session state).

### Part 2: IaaS Migration Strategy

4. Design the IaaS migration approach for workloads that cannot move to PaaS:
   - AD domain controllers: migrate using Azure Migrate Server Migration with pre-staged Entra Connect
   - Windows Server 2012 R2 workloads: address end-of-support with Extended Security Updates on Azure
   - Custom Windows services with local dependencies: Azure VM with appropriate VM sizing
5. Select the appropriate Azure Migrate replication method for each workload type:
   - Agentless replication (VMware VMs): benefits and limitations
   - Agent-based replication (physical servers, Hyper-V): when required
   - Document the replication bandwidth requirements for migrating 200 servers within the timeline
6. Design the VM sizing strategy: compare "as-on-premises" sizing (match current specs) vs. "performance-based" sizing (right-size based on actual utilization data from the 30-day assessment).

### Part 3: PaaS Migration Strategy

7. Design the PaaS migration path for eligible web applications:
   - .NET Framework IIS apps: evaluate Azure App Service (Windows) compatibility using App Service Migration Assistant
   - Node.js/Python apps: evaluate Azure App Service (Linux) or Azure Container Apps
   - Containerized applications: Azure Container Apps or Azure Kubernetes Service
8. Design the migration path for file servers:
   - Evaluate Azure Files vs. Azure NetApp Files based on protocol requirements (SMB, NFS), performance tiers, and size
   - Design Azure File Sync for hybrid scenarios during the migration transition period
9. Design the migration path for the 5 already-containerized applications:
   - Push container images to Azure Container Registry
   - Deploy to Container Apps with environment configuration mapped from on-premises Docker Compose

### Part 4: Testing and Validation

10. Design a pre-migration testing checklist for each workload type:
    - Network connectivity validation (DNS resolution, port accessibility, latency to dependencies)
    - Application functionality (smoke tests, synthetic transactions)
    - Performance benchmarking (compare Azure VM performance to on-premises baseline)
    - Data integrity (file hash comparison, database consistency checks)
11. Design a parallel-run strategy for critical workloads where both on-premises and Azure run simultaneously, with traffic gradually shifted to Azure using Azure Traffic Manager or DNS-based cutover.
12. Define rollback criteria and procedures: at what point is a migration considered failed, and how do you revert (re-enable on-premises VM, update DNS, restore from replication)?

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-45"
  items={[
    "Workload categorization matrix covers all 200 servers with justified IaaS vs PaaS target selection",
    "Migration tool recommendation specified for each workload type (Azure Migrate, App Service Migration Assistant, Azure File Sync)",
    "VM sizing strategy justifies performance-based vs as-on-premises sizing with cost comparison",
    "PaaS migration path documented for web applications with compatibility assessment findings",
    "Testing and validation checklist covers network, application, performance, and data integrity checks",
    "Rollback criteria and procedures defined with specific thresholds triggering reversion to on-premises"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Azure Migrate Readiness Categories</summary>

Azure Migrate classifies servers as: **Ready for Azure** (can be migrated as-is), **Conditionally ready** (may have minor issues like unsupported boot type or OS version), **Not ready** (has blocking issues like unsupported OS or incompatible features), **Readiness unknown** (insufficient data collected). For each conditionally-ready server, the assessment report lists specific issues and remediation steps. Address these before including the server in a migration wave.

</details>

<details>
<summary>Hint 2: Performance-Based Sizing</summary>

Performance-based sizing uses actual CPU, memory, disk IOPS, and network utilization collected over the assessment period (30 days recommended). It typically recommends smaller (cheaper) VM sizes than as-on-premises sizing because most servers are over-provisioned. Use a comfort factor (default 1.3x) to add headroom. Set the percentile utilization (e.g., 95th percentile) to avoid sizing based on rare spikes while still accommodating normal peaks.

</details>

<details>
<summary>Hint 3: App Service Migration Assistant</summary>

The Azure App Service Migration Assistant scans IIS web applications and produces a readiness report. It checks for: .NET Framework version compatibility, authentication methods, virtual directories, URL rewrite rules, HTTPS bindings, and installed IIS modules. Some blockers can be resolved (e.g., switching from Windows Authentication to Entra ID), while others require staying on IaaS (e.g., COM components, Windows registry dependencies, GAC assemblies not available on App Service).

</details>

<details>
<summary>Hint 4: Extended Security Updates on Azure</summary>

Windows Server 2012/2012 R2 reached end of support, but VMs running on Azure receive free Extended Security Updates (ESU) automatically. This makes Azure a compelling target for legacy workloads that cannot be upgraded immediately. The ESU benefit applies to Azure VMs, Azure Stack HCI, and Azure VMware Solution. This removes the "upgrade before migrate" dependency and allows rehosting followed by modernization at a later date.

</details>

<details>
<summary>Hint 5: Azure File Sync Architecture</summary>

Azure File Sync allows on-premises Windows file servers to remain operational while syncing to Azure Files. It supports cloud tiering (hot files remain local, cold files are tiered to Azure with a local pointer). During migration, you can set up Azure File Sync to replicate all data to Azure, validate accessibility, then cut over by pointing clients directly to Azure Files or keeping the on-premises server as a cache. This enables gradual migration without a hard cutover.

</details>

## Learning Resources

- [Azure Migrate overview](https://learn.microsoft.com/en-us/azure/migrate/migrate-services-overview)
- [Azure Migrate server assessment](https://learn.microsoft.com/en-us/azure/migrate/concepts-assessment-calculation)
- [Azure App Service Migration Assistant](https://learn.microsoft.com/en-us/azure/app-service/app-service-migration-assistant)
- [Azure File Sync overview](https://learn.microsoft.com/en-us/azure/storage/file-sync/file-sync-introduction)
- [Extended Security Updates for Windows Server](https://learn.microsoft.com/en-us/windows-server/get-started/extended-security-updates-overview)
- [Migrate servers to Azure using Azure Migrate](https://learn.microsoft.com/en-us/azure/migrate/tutorial-migrate-vmware)

## Knowledge Check

<details>
<summary>1. An IIS application uses Windows Authentication and accesses a local file share at D:\AppData. Azure App Service Migration Assistant reports it as "conditionally ready." What are the blocking factors and remediation options?</summary>

**Two blockers: Windows Authentication and local file system dependency.** Remediation options: (1) For Windows Authentication: switch to Entra ID authentication (code change), or use App Service with hybrid connections/VNet integration to reach on-premises AD (architecture change), or keep on IaaS. (2) For local file system: migrate files to Azure Blob Storage with application code changes, or use Azure Files mounted as a drive in App Service (limited to Premium tier), or keep on IaaS. If either remediation is too costly, rehost on a Windows VM.

</details>

<details>
<summary>2. Azure Migrate performance-based assessment recommends a B2s VM for a server currently running on a 4-vCPU, 16GB RAM physical server. The current CPU utilization averages 8% with peaks at 25%. Is the recommendation safe?</summary>

**Likely safe, but validate the peak timing and duration.** The B2s has 2 vCPUs and 4GB RAM with burstable CPU. If the server only peaks at 25% of 4 vCPUs (equivalent to 1 vCPU), the B2s can handle it using burst credits. However, check: (1) How long do peaks last? B-series bursting is limited by credits, (2) What is memory utilization? Dropping from 16GB to 4GB may cause issues if the application is memory-intensive, (3) Is the assessment period representative? A 30-day window in a quiet period may miss quarterly peaks. Consider the comfort factor and seasonal patterns before accepting aggressive downsizing.

</details>

<details>
<summary>3. Five containerized applications run Docker on Linux VMs. Should they migrate to Azure Container Apps, AKS, or VMs running Docker?</summary>

**Azure Container Apps is the recommended target for most small-to-medium containerized applications.** Container Apps provides managed Kubernetes infrastructure without cluster management overhead, built-in autoscaling (including scale to zero), integrated Dapr support, and revision-based deployments. Choose AKS if: the applications need custom Kubernetes configurations, specific networking requirements, or the team already manages Kubernetes. Choose VMs with Docker only if: the applications require specific Linux kernel features, custom Docker configurations, or have hard dependencies on Docker Compose orchestration that cannot be easily mapped to Container Apps or AKS.

</details>

<details>
<summary>4. During migration testing, a web application works correctly in Azure but responds 3x slower than on-premises. The VM is correctly sized based on assessment. What should you investigate?</summary>

**Network latency to dependent services still on-premises.** The most common cause of post-migration performance degradation is increased network latency between the migrated application and its dependencies that have not yet migrated (databases, APIs, file shares). Check: (1) Round-trip latency to on-premises databases via VPN/ExpressRoute, (2) Whether the application makes many sequential calls that amplify latency, (3) Disk I/O performance (Standard HDD vs. Premium SSD), (4) DNS resolution time if still pointing to on-premises DNS. Solution: either migrate dependent services in the same wave, or implement caching to reduce cross-network calls.

</details>

## Cleanup

```bash
# Delete all resources created in this challenge
az group delete --name rg-az305-challenge45 --yes --no-wait
```

---

**Next**: [Challenge 46: Design Database Migration](/docs/az-305/infrastructure/challenge-46)
