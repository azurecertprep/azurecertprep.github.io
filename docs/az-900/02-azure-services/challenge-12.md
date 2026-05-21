---
sidebar_position: 6
title: "Challenge 12: VPN Gateway, ExpressRoute & DNS"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 12: VPN Gateway, ExpressRoute & DNS

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Azure Architecture & Services (35-40%)
:::

## Exam skills covered

- Describe virtual networking (VPN Gateway, ExpressRoute)
- Describe Azure DNS

## Overview

When you need to connect your on-premises network to Azure (or connect Azure VNets across regions), you need connectivity services. Azure offers **VPN Gateway** for encrypted connections over the internet, and **ExpressRoute** for private, dedicated connections that bypass the internet entirely.

**Azure DNS** provides name resolution — translating human-readable domain names into IP addresses.

## Explore

### Task 1: Understand connectivity options

| Service | Connection type | Over | Speed | Use case |
|---------|----------------|------|-------|----------|
| **VPN Gateway** | Encrypted tunnel | Public internet | Up to 10 Gbps | Site-to-site, point-to-site |
| **ExpressRoute** | Private circuit | Dedicated line | Up to 100 Gbps | Enterprise, compliance, high throughput |
| **VNet Peering** | Direct VNet link | Microsoft backbone | High | VNet-to-VNet within Azure |

### Task 2: Understand VPN Gateway types

| VPN type | Connects | Scenario |
|----------|----------|----------|
| **Site-to-Site (S2S)** | On-prem network ↔ Azure VNet | Office to Azure |
| **Point-to-Site (P2S)** | Individual computer ↔ Azure VNet | Remote worker to Azure |
| **VNet-to-VNet** | Azure VNet ↔ Azure VNet | Cross-region connectivity |

### Task 3: Explore VPN Gateway in Portal

1. In Azure Portal, search for **Virtual network gateways**
2. Click **+ Create**
3. Explore the form:
   - **Gateway type**: VPN or ExpressRoute
   - **SKU**: Different throughput tiers
   - **VPN type**: Route-based (modern) or Policy-based (legacy)
4. Notice: VPN Gateways take 30-45 minutes to deploy and DO cost money
5. Click **Cancel** — don't create

### Task 4: Understand ExpressRoute

ExpressRoute provides a **private connection** to Azure:
- Traffic does NOT go over the public internet
- Provided by connectivity partners (ISPs/telcos)
- Higher bandwidth (50 Mbps to 100 Gbps)
- Lower latency and higher reliability
- Required for some compliance scenarios

**When to choose ExpressRoute vs VPN:**

| Criteria | VPN Gateway | ExpressRoute |
|----------|------------|--------------|
| Cost | Lower | Higher |
| Setup time | Hours | Weeks (need ISP) |
| Bandwidth | Up to 10 Gbps | Up to 100 Gbps |
| Encryption | Built-in (IPsec) | Optional (add-on) |
| Traverses internet | Yes | No |
| Compliance needs | Standard | High-security |

### Task 5: Explore Azure DNS

1. In Azure Portal, search for **DNS zones**
2. Azure DNS hosts your domain's DNS records
3. Browse the service — no need to create

**Azure DNS features:**
- Host DNS zones in Azure
- Manage DNS records (A, AAAA, CNAME, MX, etc.)
- Integrated with other Azure services
- Uses Azure's global anycast network
- Does NOT register domain names (use a registrar for that)

| DNS Record | Purpose | Example |
|-----------|---------|---------|
| A | Maps name → IPv4 address | www → 20.53.x.x |
| AAAA | Maps name → IPv6 address | www → 2001:db8::1 |
| CNAME | Maps name → another name | blog → myapp.azurewebsites.net |
| MX | Mail server | @ → mail.example.com |
| TXT | Text data (verification, SPF) | @ → "v=spf1 include:..." |

:::tip Azure CLI Alternative
```bash
# List DNS zones (if any)
az network dns zone list --output table 2>/dev/null || echo "No DNS zones configured"

# List VPN gateways in a resource group (if any exist)
az network vnet-gateway list --resource-group rg-az900-learning --output table 2>/dev/null || echo "No VPN gateways configured (they cost money!)"
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **VPN Gateway** | Encrypted tunnel over public internet to Azure |
| **Site-to-Site VPN** | Connects an entire on-premises network to Azure |
| **Point-to-Site VPN** | Connects a single device to Azure |
| **ExpressRoute** | Private, dedicated connection (bypasses internet) |
| **Azure DNS** | Host and manage DNS zones and records |
| **DNS zone** | Container for DNS records of a domain |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-12-q1',
      question: 'A company needs a private, dedicated connection between their datacenter and Azure that does not traverse the public internet. Which service should they use?',
      options: ['VPN Gateway (Site-to-Site)', 'ExpressRoute', 'VNet Peering', 'Azure DNS'],
      correctAnswer: 1,
      explanation: 'ExpressRoute provides a private, dedicated connection between on-premises infrastructure and Azure. Traffic never goes over the public internet, providing higher security and reliability.'
    },
    {
      id: 'az900-12-q2',
      question: 'An employee working from home needs to securely access resources in an Azure VNet. Which VPN type is most appropriate?',
      options: ['Site-to-Site VPN', 'Point-to-Site VPN', 'ExpressRoute', 'VNet-to-VNet VPN'],
      correctAnswer: 1,
      explanation: 'Point-to-Site VPN connects a single device (like a home laptop) to an Azure VNet. It is designed for individual remote workers, not entire office networks.'
    },
    {
      id: 'az900-12-q3',
      question: 'What is the purpose of Azure DNS?',
      options: ['To register domain names', 'To host DNS zones and manage DNS records', 'To encrypt network traffic', 'To connect on-premises networks to Azure'],
      correctAnswer: 1,
      explanation: 'Azure DNS hosts DNS zones and manages DNS records (A, CNAME, MX, etc.). It does NOT register domain names — you need a domain registrar for that.'
    },
    {
      id: 'az900-12-q4',
      question: 'Which connectivity option provides the HIGHEST bandwidth to Azure?',
      options: ['Site-to-Site VPN', 'Point-to-Site VPN', 'ExpressRoute', 'VNet Peering'],
      correctAnswer: 2,
      explanation: 'ExpressRoute supports up to 100 Gbps bandwidth through dedicated private circuits, far exceeding VPN Gateway\'s maximum of 10 Gbps.'
    },
    {
      id: 'az900-12-q5',
      question: 'VPN Gateway connections are encrypted using which protocol?',
      options: ['SSL/TLS', 'IPsec/IKE', 'SSH', 'HTTPS'],
      correctAnswer: 1,
      explanation: 'Azure VPN Gateway uses IPsec/IKE (Internet Key Exchange) protocols to encrypt traffic in site-to-site and VNet-to-VNet connections.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe Azure compute and networking](https://learn.microsoft.com/en-us/training/modules/describe-azure-compute-networking-services/)
- [Azure VPN Gateway documentation](https://learn.microsoft.com/en-us/azure/vpn-gateway/)
- [Azure ExpressRoute documentation](https://learn.microsoft.com/en-us/azure/expressroute/)
