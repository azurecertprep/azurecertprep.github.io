---
sidebar_position: 3
title: "Challenge 09: Virtual Machines & Availability"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 09: Virtual Machines & Availability

:::info Estimated Time
**20-30 min** | **Cost**: Free (exploration only) | **Domain**: Azure Architecture & Services (35-40%)
:::

## Exam skills covered

- Describe VM options (Azure VMs, VM Scale Sets, availability sets, Azure Virtual Desktop)
- Describe resources required for virtual machines
- Compare compute types (VMs, containers, functions)

## Overview

Azure Virtual Machines (VMs) are IaaS compute resources that let you run Windows or Linux operating systems in the cloud. When you create a VM, Azure also creates several supporting resources: a virtual network interface, a disk, and (optionally) a public IP address.

To make VMs highly available, Azure offers **Availability Sets** (protect against hardware failures within a datacenter) and **Availability Zones** (protect against entire datacenter failures).

## Explore

### Task 1: Explore VM creation (don't create!)

1. In the Azure Portal, click **Create a resource** → **Virtual Machine**
2. Explore each tab without creating:

**Basics tab:**
- Subscription, Resource Group, VM name, Region
- **Availability options**: None, Availability Zone, Availability Set, Scale Set
- Image (OS): Windows Server, Ubuntu, Red Hat, etc.
- Size: Choose CPU/RAM combination

**Disks tab:**
- OS disk type: Premium SSD, Standard SSD, Standard HDD

**Networking tab:**
- Virtual network, subnet, public IP, NSG

3. Click **Cancel** — just understanding what's needed

### Task 2: Understand VM-related resources

When you create a VM, Azure creates:

| Resource | Purpose | Required? |
|----------|---------|-----------|
| Virtual Machine | The compute instance | Yes |
| OS Disk (Managed Disk) | Storage for the operating system | Yes |
| Network Interface (NIC) | Connects VM to a virtual network | Yes |
| Virtual Network | Network for the VM to communicate | Yes (new or existing) |
| Public IP Address | Allow internet access to the VM | Optional |
| Network Security Group | Firewall rules for the VM | Recommended |

### Task 3: Understand availability options

| Option | Protects against | How it works |
|--------|-----------------|--------------|
| **Availability Set** | Hardware failures in a datacenter | VMs spread across fault domains and update domains |
| **Availability Zone** | Datacenter failures | VMs placed in different physical zones |
| **VM Scale Set** | Demand changes | Auto-scale number of identical VMs |

**Fault domains** = separate physical racks (power + network)
**Update domains** = groups that can be rebooted together during maintenance

### Task 4: Explore VM sizes

1. In the Azure Portal, go to **Virtual Machines** → **Create**
2. Click **See all sizes** (or the size selector)
3. Browse the VM family categories:

| Family | Prefix | Best for |
|--------|--------|----------|
| General purpose | B, D | Testing, dev, small databases |
| Compute optimized | F | CPU-intensive workloads |
| Memory optimized | E, M | Large databases, caching |
| Storage optimized | L | Big data, data warehousing |
| GPU | N | ML training, graphics rendering |

4. Click **Cancel**

### Task 5: Azure Virtual Desktop

Azure Virtual Desktop (AVD) is a related VM service:
- Provides virtual Windows desktops and apps
- Users access from any device via a browser or client
- IT manages the desktop centrally in Azure
- Multi-session Windows 10/11 (unique to Azure — not possible on-prem)

:::tip Azure CLI Alternative
```bash
# List available VM sizes in a region
az vm list-sizes --location eastus --query "[0:10].{Name:name, Cores:numberOfCores, RAM_MB:memoryInMb}" --output table

# List available VM images
az vm image list --output table

# List VM images for Ubuntu
az vm image list --offer Ubuntu --all --query "[0:5]" --output table
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Azure VM** | IaaS compute — you manage the OS and applications |
| **Availability Set** | Distributes VMs across fault/update domains within a datacenter |
| **Availability Zone** | Distributes VMs across physically separate datacenters |
| **VM Scale Set** | Group of identical VMs that auto-scale based on demand |
| **Azure Virtual Desktop** | Cloud-hosted desktops accessible from any device |
| **Fault domain** | Separate physical rack (protects against hardware failure) |
| **Update domain** | Logical grouping for planned maintenance reboots |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-09-q1',
      question: 'Which Azure feature distributes VMs across physically separate datacenters within a region?',
      options: ['Availability Sets', 'Availability Zones', 'VM Scale Sets', 'Resource groups'],
      correctAnswer: 1,
      explanation: 'Availability Zones place VMs in physically separate datacenters within a region. Each zone has independent power, cooling, and networking, protecting against datacenter-level failures.'
    },
    {
      id: 'az900-09-q2',
      question: 'When you create an Azure VM, which resource is automatically created to store the operating system?',
      options: ['Blob storage', 'Managed Disk', 'File Share', 'Queue Storage'],
      correctAnswer: 1,
      explanation: 'A Managed Disk is automatically created to serve as the OS disk when you create a VM. This disk stores the operating system and boot files.'
    },
    {
      id: 'az900-09-q3',
      question: 'A company needs to provide 100 employees with Windows 10 desktops that can be accessed from any device, anywhere. Which service should they use?',
      options: ['Azure Virtual Machines', 'Azure Virtual Desktop', 'Azure App Service', 'Azure Container Instances'],
      correctAnswer: 1,
      explanation: 'Azure Virtual Desktop provides cloud-hosted desktops that users can access from any device. It supports multi-session Windows 10/11 and centralizes desktop management.'
    },
    {
      id: 'az900-09-q4',
      question: 'What is the purpose of VM Scale Sets?',
      options: ['To increase the size of a single VM', 'To automatically add or remove identical VM instances based on demand', 'To replicate VMs across regions', 'To convert VMs from IaaS to PaaS'],
      correctAnswer: 1,
      explanation: 'VM Scale Sets automatically increase or decrease the number of identical VM instances based on demand or a schedule. This provides horizontal scaling (scale out/in).'
    },
    {
      id: 'az900-09-q5',
      question: 'In an Availability Set, what does a "fault domain" represent?',
      options: ['A logical group that can be rebooted during updates', 'A physical rack with shared power and network switch', 'A separate Azure region', 'A virtual network segment'],
      correctAnswer: 1,
      explanation: 'A fault domain represents a physical rack in the datacenter with its own power source and network switch. If the rack fails, only VMs in that fault domain are affected.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe Azure compute and networking](https://learn.microsoft.com/en-us/training/modules/describe-azure-compute-networking-services/)
- [Azure VMs documentation](https://learn.microsoft.com/en-us/azure/virtual-machines/)
