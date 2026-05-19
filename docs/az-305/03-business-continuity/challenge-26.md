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
  --location eastus

az backup vault backup-properties set \
  --resource-group rg-backup-eastus \
  --name rsv-prod-eastus \
  --backup-storage-redundancy GeoRedundant

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

This lab validates the full backup-and-restore lifecycle. You will protect a VM, trigger a backup, simulate disaster by deleting the VM, and restore it from the recovery point. This proves your actual RPO and RTO rather than just confirming resource provisioning.

### Part A - Deploy Infrastructure

1. Create the resource group, Recovery Services vault, and a Linux VM:

```bash
az group create \
  --name rg-az305-challenge26 \
  --location eastus
```

```bash
az backup vault create \
  --resource-group rg-az305-challenge26 \
  --name vault-az305-challenge26 \
  --location eastus
```

```bash
az vm create \
  --resource-group rg-az305-challenge26 \
  --name vm-backup-lab \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys
```

2. Create a backup policy with daily backup and 7-day retention:

```bash
az backup policy create \
  --resource-group rg-az305-challenge26 \
  --vault-name vault-az305-challenge26 \
  --name daily-7day-policy \
  --policy '{
    "eTag": null,
    "properties": {
      "backupManagementType": "AzureIaasVM",
      "schedulePolicy": {
        "schedulePolicyType": "SimpleSchedulePolicy",
        "scheduleRunFrequency": "Daily",
        "scheduleRunTimes": ["2024-01-01T02:00:00Z"]
      },
      "retentionPolicy": {
        "retentionPolicyType": "LongTermRetentionPolicy",
        "dailySchedule": {
          "retentionTimes": ["2024-01-01T02:00:00Z"],
          "retentionDuration": {
            "count": 7,
            "durationType": "Days"
          }
        }
      },
      "instantRpRetentionRangeInDays": 2,
      "timeZone": "UTC"
    }
  }'
```

3. Enable backup on the VM using the custom policy:

```bash
az backup protection enable-for-vm \
  --resource-group rg-az305-challenge26 \
  --vault-name vault-az305-challenge26 \
  --vm vm-backup-lab \
  --policy-name daily-7day-policy
```

:::note[Architect Insight]
RPO depends on backup frequency. A daily schedule means up to 24 hours of data loss in the worst case (disaster strikes just before the next scheduled backup). For workloads that cannot tolerate 24-hour data loss, you need more frequent backups or continuous replication via Azure Site Recovery.
:::

### Part B - Trigger On-Demand Backup and Verify

4. Trigger an immediate on-demand backup (do not wait for the scheduled time):

```bash
az backup protection backup-now \
  --resource-group rg-az305-challenge26 \
  --vault-name vault-az305-challenge26 \
  --container-type AzureIaasVM \
  --item-name vm-backup-lab \
  --retain-until $(date -u -d "+7 days" +%d-%m-%Y) \
  --backup-management-type AzureIaasVM
```

5. The on-demand backup takes 10-20 minutes depending on VM size and disk. Check the backup job status:

```bash
az backup job list \
  --resource-group rg-az305-challenge26 \
  --vault-name vault-az305-challenge26 \
  --query "[?properties.operation=='Backup'].{Name:name, Status:properties.status, StartTime:properties.startTime}" \
  -o table
```

Wait until the status shows "Completed". Re-run the command above every few minutes to check progress.

6. Once complete, list recovery points to confirm the backup exists:

```bash
az backup recoverypoint list \
  --resource-group rg-az305-challenge26 \
  --vault-name vault-az305-challenge26 \
  --container-type AzureIaasVM \
  --item-name vm-backup-lab \
  --backup-management-type AzureIaasVM \
  --query "[].{Name:name, Time:properties.recoveryPointTime, Type:properties.recoveryPointType}" \
  -o table
```

:::note[Architect Insight]
On-demand backup tests the mechanism before a disaster strikes. Many organizations discover their backup configuration is broken only during an actual outage. Testing the full cycle validates that policies, permissions, and network paths are all functional.
:::

### Part C - Simulate Disaster and Restore

7. Record the recovery point name, then simulate disaster by deleting the VM:

```bash
RP_NAME=$(az backup recoverypoint list \
  --resource-group rg-az305-challenge26 \
  --vault-name vault-az305-challenge26 \
  --container-type AzureIaasVM \
  --item-name vm-backup-lab \
  --backup-management-type AzureIaasVM \
  --query "[0].name" -o tsv)

echo "Recovery point: $RP_NAME"
```

```bash
az vm delete \
  --resource-group rg-az305-challenge26 \
  --name vm-backup-lab \
  --yes
```

8. Initiate restore from the recovery point (restore as a new VM to avoid conflicts):

```bash
az backup restore restore-disks \
  --resource-group rg-az305-challenge26 \
  --vault-name vault-az305-challenge26 \
  --container-type AzureIaasVM \
  --item-name vm-backup-lab \
  --backup-management-type AzureIaasVM \
  --rp-name $RP_NAME \
  --storage-account $(az storage account list \
    --resource-group rg-az305-challenge26 \
    --query "[0].name" -o tsv) \
  --target-resource-group rg-az305-challenge26
```

If no storage account exists in the resource group, create one first:

```bash
az storage account create \
  --resource-group rg-az305-challenge26 \
  --name strecovery26$RANDOM \
  --sku Standard_LRS \
  --location eastus
```

9. Monitor the restore job until completion:

```bash
az backup job list \
  --resource-group rg-az305-challenge26 \
  --vault-name vault-az305-challenge26 \
  --query "[?properties.operation=='Restore'].{Name:name, Status:properties.status, StartTime:properties.startTime}" \
  -o table
```

10. After disks are restored, create a new VM from the restored disks (check the storage account for the restored disk URI and ARM template that Azure Backup generates).

:::note[Architect Insight]
RTO depends on VM size and disk volume. Larger VMs with multi-terabyte disks take significantly longer to restore. The "instant restore" feature uses the snapshot tier (retained for 1-5 days) which restores in minutes rather than hours, because it avoids copying data from the vault. After the instant restore retention expires, restore must pull data from the vault, increasing RTO considerably.
:::

### Part D - Verify Restored VM

11. Once the restored VM is created, verify it is running:

```bash
az vm list \
  --resource-group rg-az305-challenge26 \
  --query "[].{Name:name, State:powerState}" \
  -o table
```

:::tip[Design Validation]
This lab validated three architectural decisions: (1) The backup-and-restore cycle proves actual RPO and RTO values rather than theoretical ones. (2) On-demand backup confirms the protection mechanism works before a real disaster forces you to find out. (3) Restoring as a new VM avoids conflicts with existing resources (NICs, disks, IP addresses) and is the recommended restore pattern for production.
:::

## Cleanup

```bash
# Disable backup protection and delete backup data
az backup protection disable \
  --resource-group rg-az305-challenge26 \
  --vault-name vault-az305-challenge26 \
  --container-type AzureIaasVM \
  --item-name vm-backup-lab \
  --backup-management-type AzureIaasVM \
  --delete-backup-data true \
  --yes

# Delete the resource group (includes vault, VMs, storage)
az group delete --name rg-az305-challenge26 --yes --no-wait
```

---

**Next**: [Challenge 27: Design Backup & Recovery for Databases](/docs/az-305/business-continuity/challenge-27)
