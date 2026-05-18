---
sidebar_position: 2
title: "Challenge 26: Design Backup & Recovery for Compute"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Challenge 26: Design Backup & Recovery for Compute

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $5-15 | **Exam Weight: 15-20%**

:::

## Introduction

Consolidated Manufacturing operates 50 production virtual machines spread across three Azure regions (East US, West Europe, Southeast Asia). Their VM fleet includes 5 Active Directory domain controllers, 8 SQL Server VMs (with databases up to 2 TB), 25 IIS web servers running a custom .NET application, and 12 Linux VMs running microservices. Each workload type has different recovery requirements and backup sensitivities.

The domain controllers require crash-consistent backups that capture AD replication state correctly. The SQL Server VMs need application-consistent backups that freeze the SQL write cache before snapshot. The web servers are stateless and can be redeployed from images, but need configuration backup. Recently, a ransomware attack encrypted 3 VMs before detection, and the company discovered their existing backups were also compromised because they lacked immutability protection.

The IT director wants a unified backup strategy managed through Azure Backup Center that provides: different backup frequencies per workload type, cross-region restore capability for disaster recovery, immutable backups to protect against ransomware, and selective disk backup to reduce costs on VMs with large temp/cache disks.

## Exam Skills Covered

- Recommend a backup and recovery solution for compute

## Design Tasks

### Part 1: Backup Policy Design

1. Design differentiated backup policies for each workload type:

<DecisionMatrix
  title="Backup Policy Comparison"
  headers={["RPO", "RTO", "Consistency Type", "Cross-Region Support", "Best For"]}
  rows={[
    {criteria: "Azure VM Backup", values: ["24 hours (daily schedule)", "Minutes to hours depending on disk size", "Application-consistent (VSS) or crash-consistent", "Yes with GRS vault and Cross-Region Restore enabled", "Standard VM protection with centralized management via Backup Center"]},
    {criteria: "Managed Disk Snapshots", values: ["Manual (on-demand only)", "Minutes (create new VM from snapshot)", "Crash-consistent only (no application quiesce)", "Yes by copying snapshot to another region manually", "Quick ad-hoc backup before changes or for dev/test VM cloning"]},
    {criteria: "Azure Site Recovery (ASR)", values: ["30 seconds to 2 minutes (continuous replication)", "Minutes (automated orchestrated failover)", "Crash-consistent continuous plus app-consistent every 1-12 hours", "Yes built-in continuous cross-region replication", "Disaster recovery with near-zero RPO and automated failover orchestration"]}
  ]}
  storageKey="az305-challenge-26"
/>

2. For each workload, determine the appropriate recovery point schedule:
   - Daily recovery points: how many days retained?
   - Weekly recovery points: how many weeks retained?
   - Monthly recovery points: how many months retained?
   - Yearly recovery points: how many years retained?

3. Justify why SQL Server VMs need application-consistent snapshots rather than crash-consistent, and what happens if you use crash-consistent for a running SQL database.

### Part 2: Cross-Region Restore and Vault Architecture

4. Design the Recovery Services vault topology:
   - How many vaults do you need? (Consider regional requirements and management boundaries)
   - Which redundancy setting for each vault: LRS, ZRS, or GRS?
   - Where should cross-region restore be enabled?

5. Configure cross-region restore (CRR) for the SQL Server VMs to enable recovery in a paired region if the primary region fails. Document:
   - Which region pairs apply to your three regions
   - The RPO for cross-region restore (how far behind is the secondary copy)
   - The process to trigger a cross-region restore

6. Create a Recovery Services vault with GRS and CRR enabled:

```bash
az backup vault create \
  --resource-group rg-backup-eastus \
  --name rsv-prod-eastus \
  --location eastus \
  --storage-redundancy GeoRedundant

az backup vault backup-properties set \
  --resource-group rg-backup-eastus \
  --name rsv-prod-eastus \
  --cross-region-restore-flag true
```

### Part 3: Immutable Vault and Ransomware Protection

7. Design a ransomware-resilient backup strategy using:
   - Immutable vaults (cannot be disabled once enabled with lock)
   - Soft delete (14-day recovery window for deleted backups)
   - Multi-user authorization (require multiple approvers to modify backup policies)

8. Implement immutability on the vault and evaluate the trade-offs:
   - What operations are blocked once immutability is enabled?
   - Can you reduce retention periods after enabling immutability?
   - What is the difference between "locked" and "unlocked" immutability?

9. Configure enhanced soft delete with an extended retention period:

```bash
az backup vault backup-properties set \
  --resource-group rg-backup-eastus \
  --name rsv-prod-eastus \
  --soft-delete-feature-state AlwaysOn \
  --soft-delete-duration 30
```

### Part 4: Selective Disk Backup and Cost Optimization

10. Several SQL Server VMs have 4 disks each: OS disk (128 GB), data disk (2 TB), log disk (512 GB), and temp disk (256 GB). Design a selective disk backup strategy that:
    - Always backs up OS and data disks
    - Excludes temp disks to save cost
    - Handles log disks based on whether SQL log backup is separately configured

11. Calculate the estimated monthly backup cost savings from selective disk backup versus full VM backup for the 8 SQL Server VMs.

12. Set up Backup Center to provide a unified view across all three regions and configure backup reports for compliance auditing.

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-26"
  items={[
    "Backup policies designed with appropriate frequency and consistency type per workload",
    "Recovery Services vault topology designed with correct redundancy (GRS for cross-region)",
    "Cross-region restore enabled and tested for at least one VM",
    "Immutable vault configured with soft delete and multi-user authorization explained",
    "Selective disk backup strategy documented with cost savings calculation",
    "Backup Center configured for unified monitoring across regions"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Backup Consistency Types</summary>

Azure Backup supports three consistency levels:
- **Application-consistent**: Uses VSS (Windows) or pre/post scripts (Linux) to quiesce applications before snapshot. Required for SQL Server, Exchange, SharePoint. Guarantees application can start without data repair.
- **File-system consistent**: Captures all files at the same point in time. File system is consistent but applications may need crash recovery on restore.
- **Crash-consistent**: Captures disk state as if power was pulled. May require database repair/recovery on restore. Fastest but riskiest for databases.

For SQL Server VMs, always use application-consistent to avoid transaction log corruption.

</details>

<details>
<summary>Hint 2: Cross-Region Restore RPO</summary>

Cross-region restore uses GRS replication, which has an RPO of up to 12 hours (Azure does not guarantee exact replication lag). Key points:
- CRR data is always at least 12 hours behind production
- CRR is available only when Azure declares a region-wide disaster OR for DR drills
- Paired regions: East US / West US, West Europe / North Europe, Southeast Asia / East Asia
- You can trigger CRR anytime for testing (no need to wait for actual disaster)

To enable: the vault must use GRS redundancy (not LRS or ZRS), and CRR must be explicitly enabled.

</details>

<details>
<summary>Hint 3: Immutable Vault Configuration</summary>

Immutability prevents backup data from being deleted or retention from being reduced:
- **Unlocked state**: Immutability can still be disabled (for testing)
- **Locked state**: Immutability CANNOT be disabled - this is irreversible
- Once locked, you cannot: reduce retention, disable backup, delete backup data before retention expires

Recommendation: Start with unlocked immutability during initial setup, validate everything works, then lock when ready for production. Once locked, even a Global Administrator cannot delete backup data.

```bash
az backup vault update \
  --resource-group rg-backup-eastus \
  --name rsv-prod-eastus \
  --immutability-state Unlocked
```

</details>

<details>
<summary>Hint 4: Selective Disk Backup</summary>

Selective disk backup lets you choose which disks to include in VM backup, reducing cost and backup duration:

```bash
# Get disk LUNs for the VM
az vm show --resource-group rg-sql --name sql-vm-01 --query "storageProfile.dataDisks[].{name:name, lun:lun}"

# Configure backup excluding temp disk (e.g., LUN 2)
az backup protection enable-for-vm \
  --resource-group rg-backup-eastus \
  --vault-name rsv-prod-eastus \
  --vm sql-vm-01 \
  --policy-name sql-daily-policy \
  --disk-list-setting exclude \
  --diskslist 2
```

Excluding a 256 GB temp disk from 8 VMs saves approximately $10-15/month per VM on backup storage.

</details>

<details>
<summary>Hint 5: Backup Policy for Domain Controllers</summary>

Domain Controllers require special backup considerations:
- Must use application-consistent (VSS) to capture AD database correctly
- Backup frequency: at least daily (AD tombstone lifetime is 60-180 days)
- Retain at least 2 daily backups (in case one is corrupted)
- Do NOT restore a DC backup older than the tombstone lifetime
- Consider that restoring a DC requires authoritative/non-authoritative restore procedures

For Azure VMs running as DCs, Azure Backup with application-consistent snapshots handles the VSS writer for Active Directory automatically.

</details>

## Learning Resources

- [Overview of Azure VM backup](https://learn.microsoft.com/en-us/azure/backup/backup-azure-vms-introduction)
- [Back up SQL Server databases in Azure VMs](https://learn.microsoft.com/en-us/azure/backup/backup-azure-sql-database)
- [Cross-region restore using Azure Backup](https://learn.microsoft.com/en-us/azure/backup/backup-create-recovery-services-vault#set-cross-region-restore)
- [Immutable vault for Azure Backup](https://learn.microsoft.com/en-us/azure/backup/backup-azure-immutable-vault-concept)
- [Selective disk backup for Azure VMs](https://learn.microsoft.com/en-us/azure/backup/selective-disk-backup-restore)
- [Backup Center overview](https://learn.microsoft.com/en-us/azure/backup/backup-center-overview)

## Knowledge Check

<details>
<summary>1. A company discovers that ransomware has encrypted their production VMs AND deleted their backup recovery points. What Azure Backup feature would have prevented the backup deletion?</summary>

**Immutable vaults with locked immutability state.** Once immutability is locked, backup data cannot be deleted before the retention period expires, even by administrators or attackers with elevated privileges. Additionally, soft delete provides a 14-day (or configurable up to 180 days) recovery window for accidentally or maliciously deleted backup items. Multi-user authorization adds another layer by requiring multiple identities to approve destructive operations.

</details>

<details>
<summary>2. Why should SQL Server VMs use application-consistent backups rather than crash-consistent?</summary>

**Application-consistent backups use VSS to flush SQL Server's buffer cache and transaction log to disk before taking the snapshot.** This ensures all committed transactions are persisted and the database can start cleanly without running crash recovery. Crash-consistent snapshots capture whatever is on disk at that instant, which may include partially written pages or uncommitted transactions in memory. Restoring from a crash-consistent backup requires SQL Server to run crash recovery (replaying/undoing transactions from the log), which may fail if the log is inconsistent, potentially causing data loss.

</details>

<details>
<summary>3. A VM has four disks: OS (128 GB), Data (2 TB), Logs (512 GB), and Temp (256 GB). Which disks should be excluded from Azure Backup if SQL log backups are configured separately?</summary>

**Exclude both the Temp disk and the Logs disk.** The temp disk contains only temporary/cache data that is recreated on VM restart, so backing it up wastes storage costs. If SQL transaction log backups are separately configured (using Azure Backup's SQL agent or a third-party tool), the log disk is also redundant in the VM-level backup because point-in-time recovery is handled by the log backup chain. This reduces backup storage from 2,896 GB to 2,128 GB per VM (26% savings).

</details>

<details>
<summary>4. Cross-region restore has an RPO of up to 12 hours. For a workload requiring 5-second RPO, what alternative DR approach should you use instead?</summary>

**Use Azure Site Recovery (ASR) for continuous replication with near-synchronous RPO.** ASR replicates VM disk writes continuously to the target region with an RPO typically of 5-15 seconds. Unlike cross-region restore (which relies on GRS backup replication with 12-hour lag), ASR maintains a near-real-time replica. For databases specifically, use SQL Always On availability groups or Azure SQL failover groups, which offer RPO of 0-5 seconds with synchronous or asynchronous replication.

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge26 --location eastus
```

2. Deploy a virtual machine to protect with backup:

```bash
az vm create \
  --resource-group rg-az305-challenge26 \
  --name vm-backup-lab \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys
```

3. Create a Recovery Services vault:

```bash
az backup vault create \
  --resource-group rg-az305-challenge26 \
  --name vault-az305-challenge26 \
  --location eastus
```

4. Enable backup on the VM using the default policy:

```bash
az backup protection enable-for-vm \
  --resource-group rg-az305-challenge26 \
  --vault-name vault-az305-challenge26 \
  --vm vm-backup-lab \
  --policy-name DefaultPolicy
```

5. Verify the VM is registered and protection is active:

```bash
az backup item list \
  --resource-group rg-az305-challenge26 \
  --vault-name vault-az305-challenge26 \
  --query "[].{Name:name, Status:properties.protectionStatus}" -o table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
# Delete resource groups containing backup infrastructure
az group delete --name rg-az305-challenge26 --yes --no-wait
az group delete --name rg-backup-eastus --yes --no-wait
az group delete --name rg-backup-westeurope --yes --no-wait
az group delete --name rg-backup-southeastasia --yes --no-wait

# Note: Soft delete may prevent immediate deletion of backup items
# You may need to disable soft delete first or wait for retention to expire
```

---

**Next**: [Challenge 27: Design Backup & Recovery for Databases](/docs/az-305/business-continuity/challenge-27)
