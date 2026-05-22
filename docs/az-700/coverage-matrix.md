---
sidebar_position: 99
title: "Coverage Matrix"
---

# Coverage matrix

This matrix maps every AZ-700 study guide objective (April 2026) to the challenge(s) that cover it.

## Domain 1: Design and implement core networking infrastructure (25–30%)

### Design and implement IP addressing for Azure resources

| Objective | Challenge |
|-----------|-----------|
| Plan and implement network segmentation and address spaces | 01 |
| Create a virtual network (VNet) | 01 |
| Plan and configure subnetting for services (gateways, PE, SE, firewalls, App GW, Bastion) | 02 |
| Plan and configure subnet delegation | 02 |
| Plan and configure shared or dedicated subnets | 02 |
| Create a prefix for public IP addresses | 01 |
| Choose when to use a public IP address prefix | 01 |
| Plan and implement a custom public IP address prefix (BYOIP) | 01 |
| Create a public IP address | 01 |
| Associate public IP addresses to resources | 01 |

### Design and implement name resolution

| Objective | Challenge |
|-----------|-----------|
| Design name resolution inside a VNet | 03, 04 |
| Configure DNS settings for a VNet | 03, 04 |
| Design public DNS zones | 03 |
| Design private DNS zones | 04 |
| Configure public and private DNS zones | 03, 04 |
| Link a private DNS zone to a VNet | 04 |
| Design and implement Azure DNS Private Resolver | 05 |

### Design and implement VNet connectivity and routing

| Objective | Challenge |
|-----------|-----------|
| Design service chaining, including gateway transit | 06 |
| Implement VNet peering | 06 |
| Implement and manage virtual network connectivity by using Azure Virtual Network Manager | 07 |
| Design and implement user-defined routes (UDRs) | 08 |
| Associate a route table with a subnet | 08 |
| Configure forced tunneling | 08 |
| Diagnose and resolve routing issues | 08, 11 |
| Design and implement Azure Route Server | 09 |
| Identify appropriate use cases for Azure NAT Gateway | 10 |
| Implement Azure NAT Gateway | 10 |

### Monitor networks

| Objective | Challenge |
|-----------|-----------|
| Configure monitoring, network diagnostics, and logs in Azure Network Watcher | 11 |
| Monitor and troubleshoot network health by using Azure Network Watcher | 11 |
| Monitor and troubleshoot networks by using Azure Monitor for Networks | 12 |
| Activate and monitor DDoS protection | 13 |
| Evaluate network security recommendations (Defender for Cloud Secure Score) | 13 |
| Evaluate network security recommendations (attack paths) | 13 |
| Identify network resources by using Microsoft Defender for Cloud Security Explorer | 13 |

## Domain 2: Design, implement, and manage connectivity services (20–25%)

### Design, implement, and manage a site-to-site VPN connection

| Objective | Challenge |
|-----------|-----------|
| Design a site-to-site VPN connection, including for high availability | 14, 15 |
| Select an appropriate virtual network gateway SKU | 16 |
| Implement a site-to-site VPN connection | 14 |
| Identify when to use a policy-based VPN versus a route-based VPN | 16 |
| Create and configure a local network gateway | 14 |
| Create and configure an IPsec/IKE policy | 16 |
| Create and configure a virtual network gateway | 14 |
| Diagnose and resolve virtual network gateway connectivity issues | 24 |
| Implement Azure Extended Network | 15 |

### Design, implement, and manage a point-to-site VPN connection

| Objective | Challenge |
|-----------|-----------|
| Select an appropriate virtual network gateway SKU for P2S | 17 |
| Select and configure a tunnel type | 17 |
| Select an appropriate authentication method | 18 |
| Configure RADIUS authentication | 18 |
| Configure authentication by using Microsoft Entra ID | 18 |
| Implement a VPN client configuration file | 17 |
| Diagnose and resolve client-side and authentication issues | 24 |
| Specify Azure requirements for Always On VPN | 18 |
| Specify Azure requirements for Azure Network Adapter | 17 |

### Design, implement, and manage Azure ExpressRoute

| Objective | Challenge |
|-----------|-----------|
| Select an ExpressRoute connectivity model | 19 |
| Select an appropriate ExpressRoute SKU and tier | 19 |
| Design and implement ExpressRoute (cross-region, redundancy, DR) | 19, 20 |
| Design and implement ExpressRoute options (Global Reach, FastPath, Direct) | 20 |
| Choose between Azure private peering only, Microsoft peering only, or both | 19, 21 |
| Configure Azure private peering | 19 |
| Configure Microsoft peering | 21 |
| Create and configure an ExpressRoute gateway | 19 |
| Connect a virtual network to an ExpressRoute circuit | 19 |
| Recommend a route advertisement configuration | 21 |
| Configure encryption over ExpressRoute | 21 |
| Implement Bidirectional Forwarding Detection | 20 |
| Diagnose and resolve ExpressRoute connection issues | 24 |

### Design and implement an Azure Virtual WAN architecture

| Objective | Challenge |
|-----------|-----------|
| Select a Virtual WAN SKU | 22 |
| Design a Virtual WAN architecture | 22 |
| Create a virtual hub in Virtual WAN | 22 |
| Choose an appropriate scale unit for each gateway type | 22 |
| Deploy a gateway into a virtual hub | 22 |
| Configure virtual hub routing | 23 |
| Integrate a virtual hub with a third-party NVA | 23 |

## Domain 3: Design and implement application delivery services (15–20%)

### Design and implement Azure Load Balancer and Azure Traffic Manager

| Objective | Challenge |
|-----------|-----------|
| Map requirements to features and capabilities of Azure Load Balancer | 25 |
| Identify appropriate use cases for Azure Load Balancer | 25, 33 |
| Choose an Azure Load Balancer SKU and tier | 25 |
| Choose between public and internal load balancers | 25 |
| Choose between regional and cross-region load balancers | 26 |
| Create and configure an Azure Load Balancer | 25 |
| Implement Azure Traffic Manager | 27 |
| Implement Gateway Load Balancer | 26 |
| Implement a load balancing rule | 25 |
| Create and configure inbound NAT rules | 25 |
| Create and configure explicit outbound rules (SNAT) | 26 |

### Design and implement Azure Application Gateway

| Objective | Challenge |
|-----------|-----------|
| Map requirements to features and capabilities of Azure Application Gateway | 28, 33 |
| Identify appropriate use cases for Azure Application Gateway | 28, 33 |
| Choose between manual and autoscale | 30 |
| Create a backend pool | 28 |
| Configure health probes | 30 |
| Configure listeners | 28 |
| Configure routing rules | 28 |
| Configure HTTP settings | 28 |
| Configure TLS | 29 |
| Configure rewrite rule sets | 29 |

### Design and implement Azure Front Door

| Objective | Challenge |
|-----------|-----------|
| Map requirements to features and capabilities of Azure Front Door | 31, 33 |
| Identify appropriate use cases for Azure Front Door | 31, 33 |
| Choose an appropriate tier | 31 |
| Configure an Azure Front Door (routing, origins, endpoints) | 31 |
| Configure TLS termination and end-to-end TLS encryption | 31 |
| Configure caching | 31 |
| Configure traffic acceleration | 31 |
| Implement rules, URL rewrite, and URL redirect | 32 |
| Secure an origin by using Azure Private Link in Azure Front Door | 32 |

## Domain 4: Design and implement private access to Azure services (10–15%)

### Design and implement Azure Private Link service and Azure private endpoints

| Objective | Challenge |
|-----------|-----------|
| Plan private endpoints | 34 |
| Create private endpoints | 34, 35 |
| Configure access to private endpoints | 34 |
| Create a Private Link service | 36 |
| Integrate Private Link and Private Endpoint with DNS | 34, 37 |
| Integrate a Private Link service with on-premises clients | 37 |

### Design and implement service endpoints

| Objective | Challenge |
|-----------|-----------|
| Choose when to use a service endpoint | 38, 39 |
| Create service endpoints | 38 |
| Configure service endpoint policies | 38 |
| Configure access to service endpoints | 38 |

## Domain 5: Design and implement Azure network security services (15–20%)

### Implement and manage network security groups

| Objective | Challenge |
|-----------|-----------|
| Create a network security group (NSG) | 40 |
| Associate a NSG to a resource | 40 |
| Create an application security group (ASG) | 40 |
| Associate an ASG to a network interface | 40 |
| Create and configure NSG inbound and outbound security rules | 40 |
| Implement virtual network flow logs | 41 |
| Interpret virtual network flow logs | 41 |
| Verify IP flow | 41 |
| Configure an NSG for remote server administration (Azure Bastion) | 41 |
| Implement and manage virtual network security by using Azure Virtual Network Manager | 48 |

### Design and implement Azure Firewall and Azure Firewall Manager

| Objective | Challenge |
|-----------|-----------|
| Map requirements to features and capabilities of Azure Firewall | 42 |
| Select an appropriate Azure Firewall SKU | 43 |
| Design an Azure Firewall deployment | 42 |
| Create and implement an Azure Firewall deployment | 42 |
| Configure Azure Firewall rules | 42 |
| Create and implement Azure Firewall Manager policies | 43 |
| Create a secure hub by deploying Azure Firewall inside a Virtual WAN hub | 44 |

### Design and implement a Web Application Firewall (WAF) deployment

| Objective | Challenge |
|-----------|-----------|
| Map requirements to features and capabilities of WAF | 45, 46 |
| Design a WAF deployment | 45 |
| Configure detection or prevention mode | 45 |
| Configure rule sets for WAF on Azure Front Door | 46 |
| Configure rule sets for WAF on Application Gateway | 45 |
| Implement a WAF policy | 45, 46 |
| Associate a WAF policy | 45, 46 |

---

**Coverage: 100%** — Every objective from the official AZ-700 study guide (April 2026) is mapped to at least one challenge.
