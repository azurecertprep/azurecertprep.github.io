---
sidebar_position: 22
title: "Challenge 22: VM Disks & Encryption"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 22: VM disks & encryption

:::info Estimated Time and Cost

**60-75 minutes** | **Estimated cost**: ~$3.00 (VMs + managed disks) | **Exam Weight: 15-20%**


:::
## Scenario

Contoso Ltd. is standardizing disk management across their VM fleet. The security team requires all disks to be encrypted, the operations team needs a reliable snapshot and imaging strategy for disaster recovery, and the development team wants faster disk performance for their database workloads. You are tasked with implementing a comprehensive disk management strategy that covers disk types, encryption, snapshots, and custom images.

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Create and configure managed disks | High |
| Manage VM disks (attach, detach, resize) | High |
| Configure Azure Disk Encryption (ADE) | High |
| Configure encryption at host | Medium |
| Create disk snapshots | High |
| Create custom VM images from generalized VMs | High |
| Configure disk caching and performance | Medium |

## Sysadmin ↔ Azure reference

| On-Prem / Sysadmin | Azure Equivalent | Notes |
|---------------------|------------------|-------|
| SAN/NAS LUNs | Managed disks | Azure handles underlying storage |
| RAID 0 (striping for speed) | Premium SSD / Ultra Disk | Performance tiers, no manual RAID |
| BitLocker / dm-crypt | Azure Disk Encryption (ADE) | Uses Key Vault for key storage |
| Hardware encryption (SED) | Encryption at host | Encrypted before reaching storage |
| VMware snapshot | Azure disk snapshot | Point-in-time copy of disk |
| Ghost / Clonezilla image | Custom VM image (generalized) | Template for new VM deployments |
| Hot swap disk in server | Attach/detach managed disk | Online attach without reboot (data disks) |
| Disk performance monitoring | Disk metrics (IOPS, throughput) | Azure Monitor integration |

## Tasks

### Task 1: create the lab environment

```bash
# Create resource group
az group create --name rg-az104-challenge22 --location eastus

# Create a Linux VM with a Premium OS disk
az vm create \
  --name vm-disk-lab \
  --resource-group rg-az104-challenge22 \
  --image Ubuntu2404 \
  --size Standard_D2s_v3 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --os-disk-size-gb 64 \
  --os-disk-caching ReadWrite \
  --storage-sku Premium_LRS \
  --tags Environment=Development Purpose=DiskLab

# Create a Key Vault for disk encryption
az keyvault create \
  --name kv-disk-enc-$RANDOM \
  --resource-group rg-az104-challenge22 \
  --location eastus \
  --enabled-for-disk-encryption true \
  --enable-purge-protection true

KV_NAME=$(az keyvault list -g rg-az104-challenge22 --query "[0].name" -o tsv)
```

### Task 2: create and attach managed disks

Create disks of different performance tiers and attach them:

```bash
# Create a Standard HDD data disk (cost-effective, low iops)
az disk create \
  --name disk-data-standard \
  --resource-group rg-az104-challenge22 \
  --location eastus \
  --size-gb 128 \
  --sku Standard_LRS \
  --tags Purpose=Archives Tier=Standard

# Create a Premium SSD data disk (high IOPS for databases)
az disk create \
  --name disk-data-premium \
  --resource-group rg-az104-challenge22 \
  --location eastus \
  --size-gb 256 \
  --sku Premium_LRS \
  --tags Purpose=Database Tier=Premium

# Attach the Standard disk to the VM (lun 0)
az vm disk attach \
  --resource-group rg-az104-challenge22 \
  --vm-name vm-disk-lab \
  --name disk-data-standard \
  --lun 0 \
  --caching None

# Attach the Premium disk to the VM (lun 1)
az vm disk attach \
  --resource-group rg-az104-challenge22 \
  --vm-name vm-disk-lab \
  --name disk-data-premium \
  --lun 1 \
  --caching ReadOnly

# Verify attached disks
az vm show \
  --resource-group rg-az104-challenge22 \
  --name vm-disk-lab \
  --query "storageProfile.dataDisks[].{Name:name, SizeGB:diskSizeGb, Lun:lun, Caching:caching}" -o table
```

### Task 3: initialize and mount disks inside the VM

```bash
# Use run command to partition and mount the disks
az vm run-command invoke \
  --resource-group rg-az104-challenge22 \
  --name vm-disk-lab \
  --command-id RunShellScript \
  --scripts '
    # Partition and format the Standard disk (LUN 0 = /dev/sdc)
    parted /dev/sdc --script mklabel gpt mkpart primary ext4 0% 100%
    mkfs.ext4 /dev/sdc1
    mkdir -p /mnt/archives
    mount /dev/sdc1 /mnt/archives
    echo "/dev/sdc1 /mnt/archives ext4 defaults,nofail 0 2" >> /etc/fstab
    
    # Partition and format the Premium disk (LUN 1 = /dev/sdd)
    parted /dev/sdd --script mklabel gpt mkpart primary ext4 0% 100%
    mkfs.ext4 /dev/sdd1
    mkdir -p /mnt/database
    mount /dev/sdd1 /mnt/database
    echo "/dev/sdd1 /mnt/database ext4 defaults,nofail 0 2" >> /etc/fstab
    
    # Verify mounts
    df -h /mnt/archives /mnt/database
    
    # Write test data
    echo "Archive data stored here" > /mnt/archives/test.txt
    echo "Database files stored here" > /mnt/database/test.txt
  '
```

### Task 4: configure Azure disk encryption (ade)

Enable Azure Disk Encryption using Key Vault:

```bash
# Enable Azure disk encryption on the VM
az vm encryption enable \
  --resource-group rg-az104-challenge22 \
  --name vm-disk-lab \
  --disk-encryption-keyvault $KV_NAME \
  --volume-type All

# Check encryption status (may take several minutes)
az vm encryption show \
  --resource-group rg-az104-challenge22 \
  --name vm-disk-lab \
  --query "{OsDiskEncryption:osDisk, DataDiskEncryption:dataDisk, Status:status}" -o json

# Wait and re-check until encryption is complete
az vm encryption show \
  --resource-group rg-az104-challenge22 \
  --name vm-disk-lab \
  --query "status" -o tsv
```

:::tip Encryption Takes Time

Azure Disk Encryption can take 15-30 minutes to complete, depending on disk size. The VM remains operational during encryption. Monitor progress with `az vm encryption show`.


:::
### Task 5: create disk snapshots

Create point-in-time snapshots for backup purposes:

```bash
# Get the OS disk resource ID
OS_DISK_ID=$(az vm show \
  --resource-group rg-az104-challenge22 \
  --name vm-disk-lab \
  --query "storageProfile.osDisk.managedDisk.id" -o tsv)

# Create a snapshot of the OS disk
az snapshot create \
  --name snap-os-disk-$(date +%Y%m%d) \
  --resource-group rg-az104-challenge22 \
  --source $OS_DISK_ID \
  --tags Purpose=Backup Date=$(date +%Y-%m-%d)

# Create a snapshot of the Premium data disk
PREMIUM_DISK_ID=$(az disk show \
  --name disk-data-premium \
  --resource-group rg-az104-challenge22 \
  --query id -o tsv)

az snapshot create \
  --name snap-premium-disk-$(date +%Y%m%d) \
  --resource-group rg-az104-challenge22 \
  --source $PREMIUM_DISK_ID \
  --tags Purpose=Backup Date=$(date +%Y-%m-%d)

# List all snapshots
az snapshot list \
  --resource-group rg-az104-challenge22 \
  --query "[].{Name:name, SizeGB:diskSizeGb, Source:creationData.sourceResourceId}" -o table
```

### Task 6: create a disk from a snapshot

```bash
# Create a new managed disk from the snapshot
SNAP_ID=$(az snapshot show \
  --name snap-premium-disk-$(date +%Y%m%d) \
  --resource-group rg-az104-challenge22 \
  --query id -o tsv)

az disk create \
  --name disk-restored-from-snap \
  --resource-group rg-az104-challenge22 \
  --source $SNAP_ID \
  --sku Premium_LRS \
  --size-gb 256

# Verify the restored disk
az disk show \
  --name disk-restored-from-snap \
  --resource-group rg-az104-challenge22 \
  --query "{Name:name, SizeGB:diskSizeGb, Sku:sku.name, ProvisioningState:provisioningState}" -o table
```

### Task 7: create a custom VM image (Generalized)

Create a reusable image from the VM for rapid deployment:

```bash
# First, generalize the VM (warning: VM cannot be used after this)
# Run the deprovisioning command inside the VM
az vm run-command invoke \
  --resource-group rg-az104-challenge22 \
  --name vm-disk-lab \
  --command-id RunShellScript \
  --scripts "waagent -deprovision+user -force"

# Deallocate the VM
az vm deallocate \
  --resource-group rg-az104-challenge22 \
  --name vm-disk-lab

# Mark the VM as generalized
az vm generalize \
  --resource-group rg-az104-challenge22 \
  --name vm-disk-lab

# Create a custom image from the generalized VM
az image create \
  --name img-contoso-base-linux \
  --resource-group rg-az104-challenge22 \
  --source vm-disk-lab \
  --tags Version=1.0 OS=Ubuntu2404 Purpose=BaseImage

# Verify the image
az image show \
  --name img-contoso-base-linux \
  --resource-group rg-az104-challenge22 \
  --query "{Name:name, State:provisioningState, Source:sourceVirtualMachine.id}" -o table
```

### Task 8: deploy a new VM from the custom image

```bash
# Create a new VM from the custom image
az vm create \
  --name vm-from-image \
  --resource-group rg-az104-challenge22 \
  --image img-contoso-base-linux \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --tags CreatedFrom=CustomImage

# Verify the new VM is running with the pre-configured software
az vm run-command invoke \
  --resource-group rg-az104-challenge22 \
  --name vm-from-image \
  --command-id RunShellScript \
  --scripts "cat /opt/contoso/logs/setup.log 2>/dev/null || echo 'No pre-config found (expected if image was from fresh VM)'"
```

### Task 9: resize a managed disk

```bash
# Deallocate the new VM to resize its OS disk
az vm deallocate \
  --resource-group rg-az104-challenge22 \
  --name vm-from-image

# Resize the OS disk from default to 128 GB
az disk update \
  --resource-group rg-az104-challenge22 \
  --name $(az vm show -g rg-az104-challenge22 -n vm-from-image --query "storageProfile.osDisk.name" -o tsv) \
  --size-gb 128

# Restart the VM
az vm start \
  --resource-group rg-az104-challenge22 \
  --name vm-from-image

# Expand the filesystem inside the VM
az vm run-command invoke \
  --resource-group rg-az104-challenge22 \
  --name vm-from-image \
  --command-id RunShellScript \
  --scripts "growpart /dev/sda 1 && resize2fs /dev/sda1 && df -h /"
```

### Task 10: compare disk performance tiers

```bash
# View disk performance characteristics
az disk list \
  --resource-group rg-az104-challenge22 \
  --query "[].{Name:name, SKU:sku.name, SizeGB:diskSizeGb, IOPS:diskIOPSReadWrite, Throughput:diskMBpsReadWrite}" -o table
```

:::tip Disk Performance Quick Reference

| Disk Type | Max IOPS | Max Throughput | Use Case |
|-----------|----------|----------------|----------|
| Standard HDD (Standard_LRS) | 2,000 | 500 MB/s | Backups, dev/test, infrequent access |
| Standard SSD (StandardSSD_LRS) | 6,000 | 750 MB/s | Web servers, light databases |
| Premium SSD (Premium_LRS) | 20,000 | 900 MB/s | Production databases, I/O intensive |
| Ultra Disk (UltraSSD_LRS) | 160,000 | 4,000 MB/s | SAP HANA, top-tier databases |


:::
## Success criteria

<SuccessChecklist
  storageKey="az104-challenge-22"
  items={[
    "VM has an OS disk and at least two data disks (different SKUs) attached",
    "Data disks are formatted, mounted, and persist across reboots (fstab)",
    "Azure Disk Encryption is enabled on all volumes",
    "At least two snapshots exist (OS disk and data disk)",
    "A new disk was created from a snapshot",
    "A custom VM image exists from a generalized VM",
    "A new VM was successfully deployed from the custom image",
    "A managed disk was resized and the filesystem expanded"
  ]}
/>
## Hints

<details>
<summary>Hint 1: Disk caching options</summary>

- **None**: No caching. Best for write-heavy workloads (database logs).
- **ReadOnly**: Caches reads in memory. Best for read-heavy workloads (OS disks, read-heavy databases).
- **ReadWrite**: Caches both reads and writes. Only recommended for OS disks. Risk of data loss on host failure.

Premium SSDs support all three modes. Standard HDDs support None and ReadOnly.

</details>

<details>
<summary>Hint 2: Generalized vs Specialized images</summary>

- **Generalized**: VM has been deprovisioned (sysprep on Windows, waagent -deprovision on Linux). Machine-specific info is removed. New VMs from this image require new hostname, admin credentials, etc.
- **Specialized**: Exact copy of the VM including all configuration, installed software, and user accounts. New VMs from this image boot as clones.

The exam frequently tests when to use each type.

</details>

<details>
<summary>Hint 3: ADE prerequisites</summary>

Azure Disk Encryption requires:
1. Key Vault with "Enabled for disk encryption" access policy
2. Key Vault and VM must be in the same region and subscription
3. VM size must support encryption (most do, except basic A-series)
4. Key Vault must have purge protection enabled (recommended)

</details>

<details>
<summary>Hint 4: Disk resize is one-directional</summary>

You can only increase the size of a managed disk, never decrease it. If you need a smaller disk, create a new smaller disk, copy the data, and swap. Always deallocate the VM before resizing the OS disk (data disks can sometimes be resized online).

</details>

## Break and fix

### Scenario a: disk encryption failure

Try enabling ADE on a VM when the Key Vault does not have "Enabled for disk encryption" set. Observe the error message and remediate:

```bash
# Check Key Vault policies
az keyvault show --name $KV_NAME \
  --query "{EnabledForDiskEncryption:properties.enabledForDiskEncryption}" -o table
```

### Scenario b: snapshot from running VM

Create a snapshot while the VM is running and data is being written. Is the snapshot crash-consistent or application-consistent? What are the implications for databases?

### Scenario c: detach disk while mounted

Attempt to detach a data disk that is currently mounted inside the VM without unmounting first. What happens? (Answer: The detach operation at the Azure level may succeed, but the VM will experience I/O errors on that mount point.)

```bash
# First, attach the restored snapshot disk to the VM
az vm disk attach \
  --resource-group rg-az104-challenge22 \
  --vm-name vm-from-image \
  --name disk-restored-from-snap

# Force detach the disk without unmounting inside the VM (dangerous)
az vm disk detach \
  --resource-group rg-az104-challenge22 \
  --vm-name vm-from-image \
  --name disk-restored-from-snap
```

## Knowledge check

<details>
<summary>1. What is the difference between Azure Disk Encryption (ADE) and Encryption at Host?</summary>

**Azure Disk Encryption (ADE)**: Encrypts data using dm-crypt (Linux) or BitLocker (Windows) inside the VM. The VM guest OS handles encryption/decryption. Keys are stored in Key Vault.

**Encryption at Host**: Encrypts data at the compute host level before it reaches Azure Storage. The data is encrypted in transit between host and storage, and at rest. Does not require Key Vault and has no VM performance impact since encryption happens on the host hardware.

Both can be used together for defense in depth.

</details>

<details>
<summary>2. Can you resize a managed disk to a smaller size?</summary>

**No.** Managed disks can only be increased in size, never decreased. This is a fundamental limitation. If you need a smaller disk, you must create a new disk with the desired size, copy the data using tools like dd or AzCopy, then swap the disks on the VM.

</details>

<details>
<summary>3. What happens to a VM if you delete the Key Vault key used for ADE?</summary>

If the encryption key is lost or permanently deleted, the encrypted disks become **permanently inaccessible**. The VM will fail to boot (for OS disk encryption) or lose access to data disks. This is why purge protection on Key Vault is critical for ADE scenarios.

</details>

<details>
<summary>4. What is the difference between a snapshot and a custom image?</summary>

**Snapshot**: A point-in-time copy of a single managed disk. Used for backup and creating new disks. Does not include VM configuration (size, network, extensions).

**Custom Image**: Includes the OS disk (and optionally data disks) plus VM configuration metadata. Created from a generalized or specialized VM. Used as a template for deploying new VMs with identical configuration.

</details>

## Cleanup

```bash
# Delete the entire resource group and all resources (VMs, disks, snapshots, images, Key vault)
az group delete --name rg-az104-challenge22 --yes --no-wait

echo "Cleanup complete. Key Vault will remain in soft-delete state."
```

## Learning resources

- [Managed disks overview](https://learn.microsoft.com/en-us/azure/virtual-machines/managed-disks-overview)
- [Disk types and performance](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types)
- [Azure Disk Encryption for Linux](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/disk-encryption-overview)
- [Create a snapshot of a managed disk](https://learn.microsoft.com/en-us/azure/virtual-machines/snapshot-copy-managed-disk)
- [Create a VM from a custom image](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/tutorial-custom-images)
- [Encryption at host](https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption#encryption-at-host)
- [Resize managed disks](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/expand-disks)
