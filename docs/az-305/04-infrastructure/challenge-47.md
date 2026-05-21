---
sidebar_position: 14
title: "Challenge 47: Design Unstructured Data Migration"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 47: design unstructured Data migration

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $0-3 | **Exam Weight: 30-35%**

:::

## Introduction

MediaVault Productions is a media company with 2PB (petabytes) of video content stored across on-premises NAS (Network Attached Storage) arrays in their Los Angeles production facility. The content includes raw 4K/8K video footage, edited productions, promotional materials, and a digital archive of content dating back 20 years. The company has decided to migrate all content to Azure to reduce storage costs, enable global access for distributed editing teams, and improve disaster recovery.

The challenge: their internet connection is 100Mbps dedicated. A simple calculation reveals that transferring 2PB at 100Mbps would take approximately 6.2 years of continuous transfer at line speed. This is clearly not feasible for a migration with a 12-month target completion date.

Additional constraints: content must remain accessible to editors in Los Angeles during the entire migration period (no freeze on production). New content is generated at a rate of 5TB per week. Some content has specific retention requirements (contractual obligations to retain raw footage for 7 years). The archive (1.2PB) is rarely accessed (less than once per quarter) while active productions (800TB) are accessed daily.

## Exam skills covered

- Recommend a solution for migrating unstructured data

## Design tasks

### Part 1: Network bandwidth analysis and tool selection

1. Calculate the transfer time for 2PB of data using each available method:
   - Online transfer at 100Mbps (theoretical vs. realistic with protocol overhead)
   - Azure Data Box (80TB usable per device, ordering and shipping time)
   - Azure Data Box Heavy (770TB usable, shipping logistics)
   - Upgraded internet connection (1Gbps or 10Gbps ExpressRoute)
2. Design a hybrid migration strategy that combines offline (bulk) and online (incremental) transfer methods:
   - Bulk transfer for existing 2PB archive and active content
   - Online sync for new content generated during the migration period
   - Document the overlap period where both methods run simultaneously
3. Compare the available tools for online data transfer:
   - AzCopy: parallel transfer, resume capability, bandwidth throttling
   - Azure Storage Mover: managed migration service with job scheduling
   - Azure File Sync: continuous sync with cloud tiering
   - Document when to use each tool and their limitations

### Part 2: Azure Data box planning

4. Calculate the number of Azure Data Box devices needed to transfer 2PB:
   - Standard Data Box: 80TB usable capacity per device
   - Data Box Heavy: 770TB usable capacity per device
   - Account for ordering lead time, data copy time, shipping time, and ingestion time
5. Design the Data Box ordering and logistics plan:
   - How many devices can be used in parallel?
   - What is the total end-to-end time from order to data available in Azure?
   - How do you handle the 800TB of active content that changes while Data Box is in transit?
6. Design data validation procedures for Data Box transfers:
   - Pre-copy: manifest file with checksums for all files
   - Post-ingestion: verify file count, total size, and spot-check checksums
   - Handle failed or corrupt transfers (re-copy specific folders)

### Part 3: ongoing synchronization during migration

7. Design the ongoing sync architecture for the 5TB/week of new content generated during migration:
   - Azure File Sync agent on the NAS gateway server for continuous replication
   - Cloud tiering policy to keep hot files local while syncing everything to Azure
   - Conflict resolution for files modified both locally and in Azure
8. Design the access architecture during the transition period:
   - Los Angeles editors continue working against local NAS (no performance impact)
   - Remote teams in London and Tokyo access content from Azure Blob Storage or Azure Files
   - Design CDN or Azure Front Door integration for global content distribution
9. Plan the cutover sequence:
   - Verify all Data Box content is ingested and validated
   - Ensure Azure File Sync delta is minimal (< 100GB pending)
   - Redirect all local editors to Azure Files or a local cache
   - Decommission on-premises NAS arrays

### Part 4: Storage tier optimization

10. Design the Azure storage tier strategy for the migrated content:
    - Active productions (800TB, accessed daily): Hot tier or Premium file shares
    - Recent archive (400TB, accessed monthly): Cool tier
    - Deep archive (1.2PB, accessed quarterly or less): Archive tier with rehydration procedures
11. Design lifecycle management policies that automatically tier content based on access patterns post-migration.
12. Calculate the total Azure storage cost for 2PB across tiers and compare to the current on-premises NAS total cost of ownership (hardware, power, cooling, floor space, IT labor, disaster recovery).

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-47"
  items={[
    "Transfer time calculated for each method (online, Data Box, Data Box Heavy) with realistic throughput estimates",
    "Hybrid migration strategy combines offline bulk transfer with online incremental sync during migration window",
    "Data Box logistics plan specifies device count, ordering timeline, parallel operations, and total migration duration",
    "Ongoing sync architecture maintains editor access on-premises while replicating new content to Azure",
    "Storage tier strategy optimizes cost across Hot, Cool, and Archive tiers for different content access patterns",
    "Total cost comparison demonstrates Azure storage TCO against on-premises NAS"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Data Box Transfer Times</summary>

End-to-end Data Box timeline: order processing (1-2 days), shipping to customer (3-5 days regional), data copy to device (varies by data volume and source speed, typically 1-3 days for 80TB from high-speed NAS), shipping to Azure datacenter (3-5 days), ingestion to storage account (1-2 days for standard, faster for large accounts). Total: approximately 10-15 days per device cycle. For 2PB, you need 3 Data Box Heavy units (770TB each) or 25 standard Data Box units (80TB each).

</details>

<details>
<summary>Hint 2: AzCopy Performance Optimization</summary>

AzCopy v10 supports parallel transfer with configurable concurrency (AZCOPY_CONCURRENCY_VALUE environment variable). For large-scale migrations: use `--cap-mbps` to limit bandwidth during business hours, `--log-level` for troubleshooting, and `--include-after` for incremental sync of files modified after a specific date. AzCopy uses the storage account's endpoint, so performance is bounded by the network link speed and storage account ingress limits (default 25Gbps for standard accounts).

</details>

<details>
<summary>Hint 3: Azure Storage Mover vs. AzCopy</summary>

Azure Storage Mover is a managed migration service designed for large-scale migrations. Unlike AzCopy (a command-line tool), Storage Mover provides: a centralized management interface, agent-based architecture (deploy agents near source data), job scheduling and sequencing, built-in progress tracking and reporting, and automatic retry on failures. Use Storage Mover when you have multiple source shares, need scheduled migration jobs, or want a managed experience. Use AzCopy for simpler ad-hoc copies or scripted automation.

</details>

<details>
<summary>Hint 4: Azure File Sync Cloud Tiering</summary>

Cloud tiering is a feature of Azure File Sync that caches frequently accessed files on the local server while tiering infrequently accessed files to Azure Files. The local server maintains a full namespace (all file/folder metadata) but only keeps the content of hot files locally. When a tiered file is accessed, it is transparently recalled from Azure. Configure the volume free space policy (e.g., keep 20% of volume free) and the date policy (tier files not accessed within N days) to control tiering behavior.

</details>

<details>
<summary>Hint 5: Archive Tier Rehydration Planning</summary>

Files in Azure Blob Storage Archive tier are offline and cannot be read directly. Rehydration options: Standard priority (up to 15 hours) and High priority (under 1 hour for blobs under 10GB). For media workflows where editors occasionally need archived content, design a self-service rehydration workflow: user requests content, automation triggers rehydration to Hot tier, user is notified when content is available. Set a lifecycle policy to automatically re-archive content after 7 days if not accessed again.

</details>

## Learning resources

- [Azure Data Box overview](https://learn.microsoft.com/en-us/azure/databox/data-box-overview)
- [Azure Data Box Heavy overview](https://learn.microsoft.com/en-us/azure/databox/data-box-heavy-overview)
- [Get started with AzCopy](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10)
- [Azure Storage Mover overview](https://learn.microsoft.com/en-us/azure/storage-mover/overview)
- [Azure File Sync overview](https://learn.microsoft.com/en-us/azure/storage/file-sync/file-sync-introduction)
- [Choose an Azure solution for data transfer](https://learn.microsoft.com/en-us/azure/storage/common/storage-choose-data-transfer-solution)

## Knowledge check

<details>
<summary>1. A company has 2PB of data and a 100Mbps internet connection. They order 3 Data Box Heavy devices. During the 15-day shipping/ingestion cycle, 5TB of new data is generated. How do you handle the delta?</summary>

**Use AzCopy or Azure File Sync for incremental delta transfer while Data Box is in transit.** The 5TB generated during the 15-day cycle can be transferred online: at 100Mbps with 80% efficiency, 5TB takes approximately 5.8 days. Strategy: (1) Copy existing data to Data Box Heavy devices, (2) Record the cutoff timestamp when copy completes, (3) While Data Box is in transit, begin online sync of all files created/modified after the cutoff, (4) After Data Box ingestion completes, run a final AzCopy sync with `--include-after` flag to catch any remaining delta. This ensures zero data loss without waiting for another Data Box cycle.

</details>

<details>
<summary>2. The Azure Data Box documentation states 80TB usable capacity, but the company's NAS shows 85TB of data in one share. What are the options?</summary>

**Split the data across two Data Box devices, use Data Box Heavy (770TB), or reduce data size before copy.** Options: (1) Order two Data Box units and split the share (files A-M on device 1, N-Z on device 2), (2) Use Data Box Heavy which has 770TB usable and can handle the full share in one device, (3) Clean up the source share before migration (remove duplicates, compress, delete unneeded files). Note: Data Box Disk (8TB per disk, up to 5 disks per order = 40TB) is too small. Also consider that Data Box reports 80TB usable after filesystem overhead; actual raw capacity is slightly higher.

</details>

<details>
<summary>3. Editors in Los Angeles report that after enabling Azure File Sync with cloud tiering, opening archived video files takes 30-60 seconds. How do you maintain editor productivity during migration?</summary>

**Increase the cloud tiering date policy or volume free space threshold to keep more content local.** Solutions: (1) Set the date policy so files accessed within the last 60-90 days stay local (covers active production content), (2) Increase the volume free space policy to only tier when absolutely necessary, (3) Pre-warm content by running a script that touches all files in active project folders, (4) For critical projects, exclude specific folders from cloud tiering using DFS Namespaces to separate active from archive paths. The goal is to tier only the 1.2PB archive while keeping the 800TB active content fully local until cutover.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge47 --location eastus
```

2. Create a storage account with public access disabled:

```bash
az storage account create --resource-group rg-az305-challenge47 \
  --name stlab47$RANDOM --sku Standard_LRS \
  --kind StorageV2 --public-network-access Disabled
```

3. Create a VNet and subnet for the private endpoint:

```bash
az network vnet create --resource-group rg-az305-challenge47 \
  --name vnet-lab47 --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-pe --subnet-prefix 10.0.1.0/24

az network vnet subnet update --resource-group rg-az305-challenge47 \
  --vnet-name vnet-lab47 --name subnet-pe \
  --private-endpoint-network-policies Disabled
```

4. Create a private endpoint and Private DNS Zone for blob storage:

```bash
STORAGE_ID=$(az storage account list --resource-group rg-az305-challenge47 \
  --query "[0].id" -o tsv)

az network private-endpoint create --resource-group rg-az305-challenge47 \
  --name pe-storage47 --vnet-name vnet-lab47 --subnet subnet-pe \
  --private-connection-resource-id $STORAGE_ID \
  --group-id blob --connection-name conn-blob

az network private-dns zone create --resource-group rg-az305-challenge47 \
  --name privatelink.blob.core.windows.net
```

5. Verify the private endpoint connection state:

```bash
az network private-endpoint show --resource-group rg-az305-challenge47 \
  --name pe-storage47 --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status" -o tsv
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
# This challenge is primarily design-focused
# If you deployed any Azure resources for exploration:
az group delete --name rg-az305-challenge47 --yes --no-wait
```

---

**Next**: [Challenge 48: Design Network Connectivity](/docs/az-305/infrastructure/challenge-48)
