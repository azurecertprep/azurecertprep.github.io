---
sidebar_position: 2
title: "Am I Ready?"
---

import SelfAssessment from '@site/src/components/SelfAssessment';

# Am I ready for the AZ-700?

Before diving into the challenges, assess your readiness. The AZ-700 assumes you already have Azure Administrator experience (AZ-104 level) and understand fundamental networking concepts.

## Self-assessment checklist

Click each row to cycle through: ✅ Comfortable | ⚠️ Need Review | ❌ New to Me

### Prerequisites

<SelfAssessment
  storageKey="az700-prereqs"
  skills={[
    "I have experience with Azure administration (AZ-104 level)",
    "I understand TCP/IP, subnetting, and CIDR notation",
    "I can explain DNS resolution (recursive, authoritative, record types)",
    "I understand routing protocols and concepts (BGP, static routes, NAT)",
    "I have deployed VNets, subnets, and NSGs in Azure",
    "I can use Azure CLI and PowerShell for network resource management",
  ]}
/>

### Domain 1: Core networking infrastructure (25–30%)

<SelfAssessment
  storageKey="az700-domain1"
  skills={[
    "I can design and implement VNet address spaces with proper segmentation",
    "I can configure subnets for specific services (gateways, Private Endpoints, Bastion, Firewall)",
    "I can configure subnet delegation for platform services",
    "I can create and manage public IP prefixes (including BYOIP)",
    "I can configure Azure DNS public zones with delegation and record types",
    "I can configure Azure DNS private zones with VNet links and auto-registration",
    "I can design and implement Azure DNS Private Resolver (inbound/outbound endpoints)",
    "I can implement VNet peering with gateway transit and service chaining",
    "I can configure Azure Virtual Network Manager (network groups, connectivity configs)",
    "I can design user-defined routes with forced tunneling and diagnose routing issues",
    "I can configure Azure Route Server for BGP peering with NVAs",
    "I can implement NAT Gateway for outbound connectivity",
    "I can use Network Watcher for diagnostics (IP flow verify, connection troubleshoot, next hop)",
    "I can configure Azure Monitor for Networks and DDoS Protection",
  ]}
/>

### Domain 2: Connectivity services (20–25%)

<SelfAssessment
  storageKey="az700-domain2"
  skills={[
    "I can deploy and configure a site-to-site VPN connection end-to-end",
    "I can design high-availability VPN (active-active, zone-redundant)",
    "I can select appropriate VPN Gateway SKUs and configure custom IPsec/IKE policies",
    "I can implement point-to-site VPN with multiple tunnel types and authentication methods",
    "I can configure P2S with RADIUS, Entra ID, and certificate authentication",
    "I can explain ExpressRoute connectivity models, SKUs, and peering types",
    "I can design ExpressRoute with Global Reach, FastPath, and Direct",
    "I can configure Virtual WAN with virtual hubs and gateway deployment",
    "I can configure virtual hub routing and NVA integration",
    "I can troubleshoot hybrid connectivity issues (VPN/ExpressRoute diagnostics)",
  ]}
/>

### Domain 3: Application delivery services (15–20%)

<SelfAssessment
  storageKey="az700-domain3"
  skills={[
    "I can deploy Azure Load Balancer (Standard) with backend pools and health probes",
    "I can configure cross-region Load Balancer and Gateway Load Balancer",
    "I can implement Traffic Manager with appropriate routing methods",
    "I can configure Application Gateway (listeners, routing rules, backend pools)",
    "I can configure TLS termination, E2E TLS, and rewrite rules on Application Gateway",
    "I can deploy Azure Front Door with origins, routing, and caching",
    "I can configure Front Door rules engine and Private Link origins",
    "I can choose the right load balancing solution for a given scenario",
  ]}
/>

### Domain 4: Private access to Azure services (10–15%)

<SelfAssessment
  storageKey="az700-domain4"
  skills={[
    "I can create and configure Private Endpoints with proper DNS integration",
    "I can deploy Private Endpoints for multiple Azure services (Storage, SQL, Key Vault)",
    "I can create a Private Link Service as a provider",
    "I can configure private access from on-premises via DNS forwarding",
    "I can implement Service Endpoints and Service Endpoint policies",
    "I can explain when to use Private Endpoints vs Service Endpoints",
  ]}
/>

### Domain 5: Network security services (15–20%)

<SelfAssessment
  storageKey="az700-domain5"
  skills={[
    "I can design NSG rules with proper priority and Application Security Groups",
    "I can configure and interpret VNet flow logs and Traffic Analytics",
    "I can deploy Azure Firewall with application, network, and DNAT rules",
    "I can configure Azure Firewall Manager with policy hierarchies",
    "I can deploy Firewall in a Virtual WAN hub (secured virtual hub)",
    "I can implement WAF on Application Gateway and Azure Front Door",
    "I can design hub-spoke network security with NVA chaining",
    "I can implement network segmentation with AVNM security admin rules",
  ]}
/>
