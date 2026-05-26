---
sidebar_position: 5
title: "Challenge 11: Azure Networking Basics"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 11: Azure Networking Basics

:::info Estimated Time
**25-35 min** | **Cost**: Free | **Domain**: Azure Architecture & Services (35-40%)
:::

## Exam skills covered

- Describe virtual networking (VNets, subnets, peering)
- Define public and private endpoints

## Overview

Azure Virtual Networks (VNets) are the fundamental building block for networking in Azure. They enable Azure resources to securely communicate with each other, the internet, and on-premises networks.

Think of a VNet like your own private network in the cloud — similar to a traditional network you'd operate in your own datacenter, but with the benefits of Azure's scale, availability, and isolation.

## Explore

### Task 1: Understand VNet concepts

| Concept | Description | On-prem equivalent |
|---------|-------------|-------------------|
| **Virtual Network (VNet)** | Isolated network in Azure | LAN/WAN |
| **Subnet** | Segment within a VNet | VLAN |
| **Network Security Group (NSG)** | Firewall rules for traffic | ACL / Firewall rules |
| **Public IP** | Internet-facing IP address | Public IP |
| **Private IP** | Internal-only IP address | RFC 1918 address |
| **VNet Peering** | Connect two VNets | WAN link between offices |

### Task 2: Explore VNet creation (don't create)

1. In Azure Portal, search for **Virtual networks**
2. Click **+ Create**
3. Explore the form:
   - **Address space**: Define the IP range (e.g., 10.0.0.0/16)
   - **Subnets**: Divide the VNet (e.g., 10.0.1.0/24 for web, 10.0.2.0/24 for database)
4. Notice that VNets are **free** — you only pay for data transfer
5. Click **Cancel**

### Task 3: Understand IP addressing

![Challenge 11 - Virtual Network Topology](/img/az-900/challenge-11-topology.svg)

**Note**: Azure reserves 5 IPs in each subnet (first 4 + last 1), so a /24 has 251 usable addresses.

### Task 4: Understand public vs private endpoints

| Endpoint type | Accessible from | Use case |
|--------------|-----------------|----------|
| **Public endpoint** | Internet + internal | Web servers, public APIs |
| **Private endpoint** | Internal VNet only | Databases, internal services |
| **Service endpoint** | VNet to Azure service (optimized route) | Storage, SQL from within VNet |

**Private endpoints** keep traffic on Microsoft's backbone network — never touching the public internet.

### Task 5: Understand VNet peering

VNet peering connects two VNets so resources can communicate:

| Peering type | Scope | Latency |
|-------------|-------|---------|
| **Regional peering** | Same region | Very low |
| **Global peering** | Different regions | Low (via Microsoft backbone) |

Key rules:
- Peered VNets can't have overlapping IP ranges
- Peering is NOT transitive (A↔B + B↔C ≠ A↔C)
- Traffic between peered VNets stays on Microsoft's network

:::tip Azure CLI Alternative
```bash
# List virtual networks (if any exist)
az network vnet list --output table

# Show available address prefixes (example)
az network vnet show --name myVnet --resource-group rg-az900-learning --query "addressSpace" 2>/dev/null || echo "No VNet exists yet - that's fine!"
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **VNet** | Private network in Azure; resources communicate securely |
| **Subnet** | Segment of a VNet with its own address range and NSG |
| **NSG** | Stateful firewall rules (allow/deny traffic by port, IP, protocol) |
| **Public endpoint** | Service accessible from the internet |
| **Private endpoint** | Service accessible only from within a VNet |
| **VNet peering** | Connects two VNets for private communication |
| **Non-transitive** | If A↔B and B↔C, A cannot reach C without direct peering |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-11-q1',
      question: 'What is the purpose of an Azure Virtual Network (VNet)?',
      options: ['To store files in the cloud', 'To enable Azure resources to communicate securely with each other', 'To manage user identities', 'To monitor resource health'],
      correctAnswer: 1,
      explanation: 'An Azure Virtual Network enables Azure resources to securely communicate with each other, the internet, and on-premises networks. It provides isolation and segmentation.'
    },
    {
      id: 'az900-11-q2',
      question: 'A company wants to ensure their Azure SQL Database is only accessible from their VNet and never from the internet. What should they use?',
      options: ['Public endpoint', 'Private endpoint', 'VNet peering', 'Load balancer'],
      correctAnswer: 1,
      explanation: 'A private endpoint assigns a private IP address from your VNet to the Azure service, making it accessible only from within the VNet. Traffic never traverses the public internet.'
    },
    {
      id: 'az900-11-q3',
      question: 'VNet A is peered with VNet B, and VNet B is peered with VNet C. Can resources in VNet A communicate directly with resources in VNet C?',
      options: ['Yes, peering is always transitive', 'No, peering is non-transitive — direct peering between A and C is required', 'Only if they are in the same region', 'Only if they use global peering'],
      correctAnswer: 1,
      explanation: 'VNet peering is non-transitive. Each pair of VNets that needs to communicate must have direct peering established between them.'
    },
    {
      id: 'az900-11-q4',
      question: 'What is a subnet in Azure networking?',
      options: ['A separate Azure subscription', 'A range of IP addresses within a VNet', 'A connection between two VNets', 'A type of virtual machine'],
      correctAnswer: 1,
      explanation: 'A subnet is a range of IP addresses within a VNet. Subnets let you segment your VNet and apply different security rules (NSGs) to different groups of resources.'
    },
    {
      id: 'az900-11-q5',
      question: 'Which resource acts as a firewall to control inbound and outbound traffic to Azure resources?',
      options: ['Virtual Network', 'Subnet', 'Network Security Group (NSG)', 'VNet Peering'],
      correctAnswer: 2,
      explanation: 'Network Security Groups (NSGs) contain security rules that allow or deny inbound/outbound network traffic. They can be associated with subnets or individual network interfaces.'
    }
  ]}
/>

## Learn More

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe Azure compute and networking](https://learn.microsoft.com/en-us/training/modules/describe-azure-compute-networking-services/)
- [Azure Virtual Network documentation](https://learn.microsoft.com/en-us/azure/virtual-network/)
