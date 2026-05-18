---
sidebar_position: 2
title: "Challenge 15: Backup & Recovery"
---

# Challenge 15: Backup & Recovery

| | |
|---|---|
| **Estimated Time** | 60–75 minutes |
| **Cost Estimate** | ~$0.30 |
| **Exam Weight** | 10–15% |

## Scenario

Disaster struck at Contoso | a developer accidentally deleted production data. Management is demanding answers: *"Why wasn't there a backup?"* Your job is to implement Azure Backup and Azure Site Recovery so this never happens again.

## Exam Skills Covered

- Create a Recovery Services vault
- Create an Azure Backup vault
- Create and configure backup policy
- Perform backup and restore operations
- Configure Azure Site Recovery for VMs
- Perform failover to a secondary region
- Configure and interpret reports and alerts for backups

## Sysadmin ↔ Azure Reference

| On-Prem / Traditional | Azure Equivalent |
|---|---|
| Veeam / SCDPM | Azure Backup |
| Tape backup rotation (GFS) | Backup policies (daily/weekly/monthly/yearly) |
| DR site (hot / cold / warm) | Azure Site Recovery |
| Backup reports | Backup center |

## Setup

```bash
# Variables
RG="rg-az104-challenge15"
LOCATION="eastus"
DR_LOCATION="westus2"

# Create resource group
az group create --name $RG --location $LOCATION
```

## Tasks

### Task 1: Create a Recovery Services Vault

```bash
az backup vault create \
  --resource-group $RG \
  --name rsv-contoso \
  --location $LOCATION
```

:::tip

Recovery Services vaults are used for VM backup and Azure Site Recovery. The vault must be in the **same region** as the VMs you want to back up.

:::
### Task 2: Create a Backup Policy

Create a custom backup policy: daily backups at 2:00 AM, 30-day retention.

<details>
<summary>Hint</summary>

The easiest way is via the Azure Portal:

1. Go to your Recovery Services vault
2. **Backup policies → Add**
3. Policy type: Azure Virtual Machine
4. Schedule: Daily at 2:00 AM
5. Retention: 30 days

Or via CLI (using a policy JSON):

```bash
az backup policy set \
  --resource-group $RG \
  --vault-name rsv-contoso \
  --policy '{"name":"policy-daily-30","properties":{"backupManagementType":"AzureIaasVM","schedulePolicy":{"schedulePolicyType":"SimpleSchedulePolicy","scheduleRunFrequency":"Daily","scheduleRunTimes":["2024-01-01T02:00:00Z"]},"retentionPolicy":{"retentionPolicyType":"LongTermRetentionPolicy","dailySchedule":{"retentionTimes":["2024-01-01T02:00:00Z"],"retentionDuration":{"count":30,"durationType":"Days"}}}}}'
```

</details>

### Task 3: Enable Backup for a VM

Deploy a VM and enable backup:

```bash
# Create a VM
az vm create \
  --resource-group $RG \
  --name vm-backup-test \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys

# Enable backup
az backup protection enable-for-vm \
  --resource-group $RG \
  --vault-name rsv-contoso \
  --vm vm-backup-test \
  --policy-name DefaultPolicy
```

### Task 4: Trigger an On-Demand Backup

```bash
az backup protection backup-now \
  --resource-group $RG \
  --vault-name rsv-contoso \
  --container-name "IaasVMContainer;iaasvmcontainerv2;$RG;vm-backup-test" \
  --item-name "VM;iaasvmcontainerv2;$RG;vm-backup-test" \
  --retain-until "31-12-2027"
```

:::note

The first backup can take **30–60 minutes** depending on the VM size. You can check progress in the vault's **Backup Jobs** blade.

:::
### Task 5: Restore a VM from Backup

Once the backup completes, restore it to a new VM:

1. Go to **Recovery Services vault → Backup items → Azure Virtual Machine**
2. Select the VM → **Restore VM**
3. Choose **Create new** → Give it a new name like `vm-backup-restored`
4. Select the restore point and target VNet/subnet

<details>
<summary>CLI Hint</summary>

```bash
# List recovery points
az backup recoverypoint list \
  --resource-group $RG \
  --vault-name rsv-contoso \
  --container-name "IaasVMContainer;iaasvmcontainerv2;$RG;vm-backup-test" \
  --item-name "VM;iaasvmcontainerv2;$RG;vm-backup-test"

# Restore (Portal is easier for this task)
```

</details>

### Task 6: Create an Azure Backup Vault

Azure Backup vaults are used for newer workloads like blob backup and Azure Database for PostgreSQL.

```bash
az dataprotection backup-vault create \
  --resource-group $RG \
  --vault-name bv-contoso \
  --location $LOCATION \
  --storage-setting "[{type:LocallyRedundant,datastore-type:VaultStore}]"
```

### Task 7: Configure Blob Backup (Operational Tier)

1. Create a storage account
2. Configure operational backup for blobs (point-in-time restore)

<details>
<summary>Hint</summary>

Via the Azure Portal:
1. Go to your Backup vault → **+ Backup**
2. Datasource type: **Azure Blobs (Azure Storage)**
3. Select the storage account
4. Configure the backup policy (default: 30-day operational retention)

This enables point-in-time restore for blobs | no backup copies are created; it uses change tracking on the storage account.

</details>

### Task 8: Configure Azure Site Recovery

Enable replication for a VM to a secondary region:

1. Go to **Recovery Services vault → Site Recovery → Replicated items**
2. Click **+ Replicate → Azure virtual machines**
3. Source region: `eastus`
4. Target region: `westus2`
5. Select your VM
6. Review replication settings and enable

:::tip

Site Recovery replicates VM disks asynchronously to the target region. Initial replication can take 30–60 minutes depending on disk size.

:::
### Task 9: Run a Test Failover

After initial replication completes:

1. Go to the replicated item
2. Click **Test Failover**
3. Select the recovery point and target VNet
4. Verify the test VM in the target region
5. **Clean up test failover** when done

:::warning

Always clean up test failover resources | they continue to incur charges until removed.

:::
### Task 10: Configure Backup Reports

1. Go to **Backup center → Backup reports**
2. Configure the Log Analytics workspace as the data source
3. Explore: backup item health, backup job trends, storage consumption

### Task 11: Set Up Backup Alerts

Configure alerts for failed backup jobs:

1. Go to **Recovery Services vault → Alerts**
2. Create an alert rule for **Backup failure**
3. Attach an action group for email notification

## Break & Fix

### Break It
1. **Delete a vault with protected items** | Try to delete the Recovery Services vault while it still has backup items. Observe the error: *"Vault cannot be deleted as there are existing resources within the vault."*
2. **Region mismatch** | Try to back up a VM in `westus2` using the vault in `eastus`. What happens?

### Fix It
- To delete a vault: first stop backup protection, delete backup data, then delete the vault
- Move or recreate the vault in the same region as the VM

## Knowledge Check

1. **Recovery Services vault vs Azure Backup vault?**
   - Recovery Services vault: VMs, SQL in Azure VM, Azure Files, Azure Site Recovery
   - Azure Backup vault: Blobs, Azure Disks, Azure Database for PostgreSQL

2. **RPO vs RTO?**
   - RPO (Recovery Point Objective) = Maximum acceptable data loss (time between last backup and disaster)
   - RTO (Recovery Time Objective) = Maximum acceptable downtime (time to restore service)

3. **What are the backup types?**
   - Full | complete copy of all data
   - Incremental | only changes since last backup (Azure default for VMs)
   - Differential | changes since last full backup

4. **Site Recovery: failover vs test failover?**
   - Test failover | validates replication without affecting production; creates test resources
   - Failover | actual disaster recovery; shifts production to secondary region

## Cleanup

```bash
# IMPORTANT: Must stop protection before deleting vault
# 1. Stop backup and delete backup data for each protected item
# 2. Disable Site Recovery replication
# 3. Then delete the resource group

az group delete --name $RG --yes --no-wait
```

:::warning

If vault deletion fails, follow this order:
1. Stop backup protection with "Delete backup data" for all items
2. Remove Site Recovery replicated items
3. Delete the vault
4. Delete the resource group

:::
## Success Criteria

- [ ] Recovery Services vault created
- [ ] Custom backup policy configured (daily, 30-day retention)
- [ ] VM backup enabled and on-demand backup triggered
- [ ] VM restored from backup to a new VM
- [ ] Azure Backup vault created for blob backup
- [ ] Blob operational backup configured
- [ ] Azure Site Recovery enabled (VM replication to secondary region)
- [ ] Test failover executed and cleaned up
- [ ] Backup reports configured in Backup center
- [ ] Backup failure alerts configured
- [ ] Break & Fix scenarios completed
- [ ] Resources cleaned up (in correct order!)
