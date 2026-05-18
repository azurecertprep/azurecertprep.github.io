---
sidebar_position: 2
title: "Challenge 08: Virtual Machines & Scale Sets"
---

# Challenge 08: Virtual Machines & Scale Sets

:::info Estimated Time and Cost

**60–75 minutes** | **~$0.50** (deallocate promptly!) | **Exam Weight: 20–25%**

:::
:::danger Cost Warning

Virtual machines incur charges while running. **Deallocate all VMs** as soon as you finish each task. The cleanup script at the bottom deletes everything | run it when done.

:::
## Scenario

Contoso needs to deploy a web server fleet for their customer-facing application. Start with a single Linux VM to validate the configuration, then scale out to a VM Scale Set (VMSS) for the production workload. The infrastructure must handle availability zone failures and scale automatically during traffic spikes.

## Exam Skills Covered

| Skill | Weight |
|-------|--------|
| Create and configure a VM | High |
| Configure VM disks (attach, resize, encrypt) | High |
| Manage VM sizes | Medium |
| Move VMs between resource groups | Medium |
| Deploy VMs to availability zones/sets | High |
| Deploy and configure VM Scale Sets | High |
| Configure VMSS autoscale | High |

## Sysadmin ↔ Azure Reference

| Traditional | Azure Equivalent |
|-------------|-----------------|
| Hyper-V / VMware ESXi | Azure Virtual Machines |
| VM templates / golden images | Azure VM images / Shared Image Gallery |
| SAN / NAS attached storage | Azure Managed Disks |
| Physical rack diversity | Availability Zones (datacenter-level) |
| Cluster of identical servers | VM Scale Sets (VMSS) |
| Load balancer + auto-provisioning | VMSS autoscale rules |

## Tasks

### Task 1: Create a Linux VM with SSH Keys

```bash
# Create a resource group
az group create --name rg-vm-lab --location eastus

# Create an Ubuntu VM with SSH key authentication
az vm create \
  --resource-group rg-vm-lab \
  --name vm-web-01 \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --output table

# Verify the VM is running
az vm show --resource-group rg-vm-lab --name vm-web-01 \
  --query "{Name:name, State:powerState, Size:hardwareProfile.vmSize}" -o table

# SSH into the VM (use the public IP from the create output)
VM_IP=$(az vm show -g rg-vm-lab -n vm-web-01 -d --query publicIps -o tsv)
echo "SSH with: ssh azureuser@$VM_IP"
```

### Task 2: Attach and Mount a Data Disk

```bash
# Attach a 128 GB data disk
az vm disk attach \
  --resource-group rg-vm-lab \
  --vm-name vm-web-01 \
  --name disk-data-01 \
  --size-gb 128 \
  --sku Premium_LRS \
  --new

# List disks attached to the VM
az vm show -g rg-vm-lab -n vm-web-01 \
  --query "storageProfile.dataDisks[].{Name:name, SizeGB:diskSizeGb, LUN:lun}" -o table
```

<details>
<summary>Hint | Format and mount the disk inside the VM</summary>

SSH into the VM, then:
```bash
# Find the new disk
lsblk

# Partition and format (usually /dev/sdc)
sudo parted /dev/sdc --script mklabel gpt mkpart primary ext4 0% 100%
sudo mkfs.ext4 /dev/sdc1

# Mount
sudo mkdir /data
sudo mount /dev/sdc1 /data

# Make persistent across reboots
echo '/dev/sdc1 /data ext4 defaults 0 2' | sudo tee -a /etc/fstab

# Verify
df -h /data
```
</details>

### Task 3: Resize the VM

```bash
# List available sizes in the VM's location
az vm list-sizes --location eastus --query "[?starts_with(name,'Standard_B')]" -o table

# Resize the VM (requires a restart)
az vm resize \
  --resource-group rg-vm-lab \
  --name vm-web-01 \
  --size Standard_B2s

# Verify new size
az vm show -g rg-vm-lab -n vm-web-01 \
  --query "hardwareProfile.vmSize" -o tsv
```

### Task 4: Move a VM to Another Resource Group

```bash
# Create a destination resource group
az group create --name rg-vm-prod --location eastus

# Get the VM's resource ID
VM_ID=$(az vm show -g rg-vm-lab -n vm-web-01 --query id -o tsv)

# Move the VM and all dependent resources (NIC, disk, public IP, NSG)
az resource move \
  --destination-group rg-vm-prod \
  --ids $VM_ID

# NOTE: Moving VMs also requires moving dependent resources.
# List all resources to get their IDs:
az resource list -g rg-vm-lab --query "[].id" -o tsv
```

<details>
<summary>Hint | Moving all dependent resources</summary>

You must move the VM and all its dependent resources together:
```bash
RESOURCE_IDS=$(az resource list -g rg-vm-lab --query "[].id" -o tsv | tr '\n' ' ')
az resource move --destination-group rg-vm-prod --ids $RESOURCE_IDS
```
</details>

### Task 5: Create an Availability Set and Deploy a VM

```bash
# Create an availability set
az vm availability-set create \
  --resource-group rg-vm-lab \
  --name avset-web \
  --platform-fault-domain-count 2 \
  --platform-update-domain-count 5

# Deploy a VM into the availability set
az vm create \
  --resource-group rg-vm-lab \
  --name vm-web-avset \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --availability-set avset-web \
  --no-wait
```

### Task 6: Create a VMSS with Autoscale

```bash
# Create a VM Scale Set with 2 instances
az vmss create \
  --resource-group rg-vm-lab \
  --name vmss-web \
  --image Ubuntu2204 \
  --vm-sku Standard_B1s \
  --instance-count 2 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --upgrade-policy-mode automatic \
  --load-balancer lb-vmss-web

# Verify the instances
az vmss list-instances -g rg-vm-lab -n vmss-web -o table

# Create autoscale settings (scale out on CPU > 75%, scale in on CPU < 25%)
az monitor autoscale create \
  --resource-group rg-vm-lab \
  --resource vmss-web \
  --resource-type Microsoft.Compute/virtualMachineScaleSets \
  --name autoscale-vmss-web \
  --min-count 2 \
  --max-count 5 \
  --count 2

# Add scale-out rule
az monitor autoscale rule create \
  --resource-group rg-vm-lab \
  --autoscale-name autoscale-vmss-web \
  --condition "Percentage CPU > 75 avg 5m" \
  --scale out 1

# Add scale-in rule
az monitor autoscale rule create \
  --resource-group rg-vm-lab \
  --autoscale-name autoscale-vmss-web \
  --condition "Percentage CPU < 25 avg 5m" \
  --scale in 1
```

### Task 7: Test Autoscale with Load

```bash
# Get the public IP of the load balancer
LB_IP=$(az network public-ip show -g rg-vm-lab \
  -n vmss-webLBPublicIP --query ipAddress -o tsv)

# SSH into one VMSS instance and generate CPU load
az vmss list-instance-connection-info -g rg-vm-lab -n vmss-web -o table

# Inside the VM, run a CPU stress test:
# sudo apt-get update && sudo apt-get install -y stress
# stress --cpu 4 --timeout 300

# Monitor autoscale activity
az monitor autoscale show -g rg-vm-lab -n autoscale-vmss-web \
  --query "{MinCount:profiles[0].capacity.minimum, MaxCount:profiles[0].capacity.maximum}" -o table

az vmss list-instances -g rg-vm-lab -n vmss-web -o table
```

### Task 8: Deallocate to Stop Charges

```bash
# Deallocate the standalone VM (stops billing for compute)
az vm deallocate --resource-group rg-vm-lab --name vm-web-avset --no-wait

# Deallocate VMSS instances
az vmss deallocate --resource-group rg-vm-lab --name vmss-web

# Verify power state
az vm list -g rg-vm-lab --query "[].{Name:name, State:powerState}" -o table
```

## Success Criteria

- [ ] Linux VM created with SSH key authentication
- [ ] 128 GB data disk attached, formatted, and mounted
- [ ] VM resized to a different SKU
- [ ] VM moved to a different resource group
- [ ] Availability set created with correct fault/update domains
- [ ] VMSS running with 2 instances behind a load balancer
- [ ] Autoscale rules configured (CPU-based scale-out and scale-in)
- [ ] All VMs deallocated when finished

## Break & Fix Scenarios

### Scenario A: Unavailable VM Size
```bash
# Try resizing to a size not available in the current zone
az vm resize -g rg-vm-lab -n vm-web-avset --size Standard_M128s
# How do you find which sizes are available?
# az vm list-vm-resize-options -g rg-vm-lab -n vm-web-avset -o table
```

### Scenario B: Move VM with Public IP
```bash
# Try moving a VM while it has dependent resources in the source group
# What error do you get? What resources must move together?
```

### Scenario C: VMSS Instance Count Conflict
```bash
# Try to set autoscale min-count higher than max-count
az monitor autoscale update \
  --resource-group rg-vm-lab \
  --name autoscale-vmss-web \
  --min-count 10 --max-count 5
```

## Knowledge Check

**1. What is the difference between stopping and deallocating a VM?**

<details>
<summary>Show Answer</summary>

- **Stop** (from inside the OS): The VM is shut down but Azure **still reserves the compute resources and charges you**. The status shows as "Stopped."
- **Deallocate** (`az vm deallocate`): The VM releases compute resources and **you stop paying for compute**. You still pay for disks and public IPs. The status shows as "Stopped (deallocated)."
</details>

**2. What is the difference between an Availability Set and an Availability Zone?**

<details>
<summary>Show Answer</summary>

- **Availability Set**: Distributes VMs across fault domains (separate racks) and update domains (separate reboot groups) **within a single datacenter**. SLA: 99.95%.
- **Availability Zone**: Distributes VMs across **physically separate datacenters** within a region. Each zone has independent power, cooling, and networking. SLA: 99.99%.
</details>

**3. What are fault domains and update domains?**

<details>
<summary>Show Answer</summary>

- **Fault Domain (FD)**: A group of VMs sharing a common power source and network switch (essentially a rack). If one rack fails, VMs in other fault domains are unaffected. Max: 3 FDs.
- **Update Domain (UD)**: A group of VMs that Azure reboots together during planned maintenance. Only one UD is rebooted at a time. Max: 20 UDs.
</details>

**4. What are the VMSS orchestration modes?**

<details>
<summary>Show Answer</summary>

- **Uniform**: All instances use the same VM model/configuration. Best for large-scale stateless workloads. Supports up to 1,000 instances (3,000 with custom images).
- **Flexible**: Instances can mix VM sizes and configurations. Better for mixed workloads. Supports availability zones natively. This is the newer, recommended mode.
</details>

## Cleanup

```bash
# Delete all resources: run this when completely finished
az group delete --name rg-vm-lab --yes --no-wait
az group delete --name rg-vm-prod --yes --no-wait

echo "Resources are being deleted in the background."
echo "Verify in the portal that both resource groups are gone."
```
