---
sidebar_position: 1
title: "AZ-700: Azure Network Engineer"
---

# AZ-700: Azure Network Engineer

:::info Exam details

**Exam version**: Skills measured as of April 24, 2026 | **Passing score**: 700/1000 | **Duration**: ~100-120 minutes

:::

## Who is this for?

As a candidate for this certification, you should have subject matter expertise in planning, implementing, and managing Azure networking solutions, including core network infrastructure, hybrid connectivity, application delivery services, private access to Azure services, and network security.

As an Azure network engineer your responsibilities include optimizing performance, resiliency, scale, and security of Azure networking solutions. You proactively monitor network environments to identify issues and minimize risk.

## Skills at a glance

| Domain | Weight | Challenges |
|--------|--------|------------|
| Design and implement core networking infrastructure | 25–30% | 01–13 |
| Design, implement, and manage connectivity services | 20–25% | 14–24 |
| Design and implement application delivery services | 15–20% | 25–33 |
| Design and implement private access to Azure services | 10–15% | 34–39 |
| Design and implement Azure network security services | 15–20% | 40–48 |
| Cross-domain capstone | All | 49 |

:::tip Challenge structure

Each challenge includes an **SVG network topology diagram** showing the architecture you will build, **multi-tool tabs** (Azure CLI / PowerShell / Portal), a **Break & Fix** troubleshooting section, and a **Knowledge Check** with exam-style questions.

:::

## How this site works

Each challenge follows a consistent format:

1. **Topology Diagram** | SVG showing the network architecture you will build
2. **Scenario** | Real-world enterprise problem that frames the challenge
3. **Exam Skills Covered** | Exact bullets from the official study guide
4. **Prerequisites** | Including cross-references to AZ-104 if overlap exists
5. **Tasks** | Step-by-step with Azure CLI, PowerShell, and Portal instructions
6. **Packet Flow** | Trace the path of traffic through the architecture
7. **Break & Fix** | Deliberate misconfigurations to troubleshoot
8. **Knowledge Check** | Exam-style questions to test understanding
9. **Cleanup** | Scripts to delete resources and avoid costs

## Prerequisites

- **AZ-104 certification (recommended)** — This exam builds on Azure Administrator knowledge
- Azure subscription with at least Contributor role
- Familiarity with networking fundamentals (TCP/IP, DNS, routing protocols, subnetting)
- Azure CLI or Azure PowerShell installed and authenticated
- Completion of AZ-104 Networking challenges (11-13, 24-26) is strongly recommended

## Cost considerations

:::warning Lab costs

Some challenges in this exam involve resources that incur significant costs:

| Resource | Approximate cost | Challenges |
|----------|-----------------|------------|
| VPN Gateway (VpnGw1) | ~$0.19/hour | 14–18, 24 |
| Azure Firewall | ~$1.25/hour | 42–44 |
| ExpressRoute | $55–$10,000+/month | 19–21 (SIMULATION only) |
| Application Gateway | ~$0.27/hour | 28–30 |
| Azure Front Door | ~$35/month base | 31–32 |
| DDoS Network Protection | ~$2,944/month | 13 (uses IP Protection alternative) |

**Always run cleanup scripts immediately after completing a challenge.** ExpressRoute challenges are simulation-based (you practice configuration knowledge without deploying actual circuits).

:::

## Certification path

```
AZ-900 (Fundamentals)
   ↓
AZ-104 (Administrator) ←── prerequisite knowledge
   ↓
AZ-700 (Network Engineer) ←── YOU ARE HERE
   ↓
AZ-305 (Solutions Architect) — broader design perspective
```
