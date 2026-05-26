---
sidebar_position: 1
title: "Challenge 07: Azure Global Infrastructure"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 07: Azure Global Infrastructure

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Azure Architecture & Services (35-40%)
:::

## Exam skills covered

- Describe Azure regions, region pairs, and sovereign regions
- Describe availability zones
- Describe Azure datacenters

## Overview

Azure's global infrastructure is the physical foundation of all cloud services. It consists of 60+ regions worldwide, each containing one or more datacenters connected by a dedicated, low-latency network.

Understanding how Azure organizes its infrastructure — from individual datacenters to availability zones to regions — is essential for designing reliable and performant cloud solutions.

## Explore

### Task 1: Explore Azure regions

1. Visit [azure.microsoft.com/explore/global-infrastructure/geographies](https://azure.microsoft.com/explore/global-infrastructure/geographies/)
2. Click on different regions to see what services are available
3. Notice:
   - Regions are organized by geography (Americas, Europe, Asia Pacific, etc.)
   - Not all services are available in all regions
   - Some regions are paired for disaster recovery

**Key facts about regions:**
- A **region** is a set of datacenters deployed within a defined perimeter
- Regions are connected via a dedicated regional low-latency network
- You choose a region when you deploy most Azure resources
- Choose the region closest to your users for best performance

### Task 2: Understand region pairs

| Primary Region | Paired Region | Distance |
|---------------|--------------|----------|
| East US | West US | ~2,500 km |
| North Europe (Ireland) | West Europe (Netherlands) | ~900 km |
| Southeast Asia (Singapore) | East Asia (Hong Kong) | ~2,600 km |

**Why region pairs matter:**
- Azure updates one region at a time (never both in a pair simultaneously)
- If a major outage affects a region, recovery is prioritized for paired regions
- Data residency is maintained within the same geography

### Task 3: Understand availability zones

1. In the Azure Portal, search for **Virtual Machine** and click **Create**
2. In the **Availability options** dropdown, look for **Availability zone**
3. Notice you can choose Zone 1, 2, or 3
4. **Cancel** — don't create the VM

**What are availability zones?**
- Physically separate locations within a region
- Each zone has independent power, cooling, and networking
- Minimum of 3 zones in enabled regions
- Designed to survive datacenter failures

```text
Region: East US
├── Availability Zone 1 (Datacenter A)
├── Availability Zone 2 (Datacenter B)
└── Availability Zone 3 (Datacenter C)
```

### Task 4: Understand sovereign regions

Sovereign regions are isolated instances of Azure for specific compliance needs:

| Sovereign Region | Purpose | Who can access |
|-----------------|---------|----------------|
| Azure Government (US) | US government agencies | US gov personnel with clearance |
| Azure China (21Vianet) | China data residency | China-based organizations |

These are physically and logically separate from the public Azure cloud.

:::tip Azure CLI Alternative
```bash
# List all Azure regions
az account list-locations --query "[].{Name:name, DisplayName:displayName}" --output table

# List regions with availability zone support
az account list-locations --query "[?availabilityZoneMappings != null].{Name:displayName, Zones:availabilityZoneMappings[*].logicalZone}" --output table
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Region** | Geographic area with one or more datacenters |
| **Region pair** | Two regions in the same geography linked for disaster recovery |
| **Availability zone** | Physically separate datacenter within a region |
| **Sovereign region** | Isolated Azure instance for government/compliance needs |
| **Datacenter** | Physical facility with servers, networking, and cooling |
| **Geography** | Market containing one or more regions (preserves data residency) |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-07-q1',
      question: 'What is an Azure availability zone?',
      options: ['A geographic area containing one or more datacenters', 'A physically separate datacenter within a region', 'A pair of regions in the same geography', 'A separate instance of Azure for government use'],
      correctAnswer: 1,
      explanation: 'An availability zone is a physically separate datacenter within an Azure region. Each zone has independent power, cooling, and networking to provide isolation from datacenter-level failures.'
    },
    {
      id: 'az900-07-q2',
      question: 'Why does Azure use region pairs?',
      options: ['To reduce costs by sharing resources', 'To ensure platform updates and recovery are coordinated across paired regions', 'To provide faster internet access', 'To comply with GDPR only'],
      correctAnswer: 1,
      explanation: 'Region pairs ensure that planned updates are rolled out to one region at a time, and recovery is prioritized for paired regions during major outages. They also maintain data residency within the same geography.'
    },
    {
      id: 'az900-07-q3',
      question: 'A company must ensure their data never leaves Germany due to regulations. Which Azure concept addresses this requirement?',
      options: ['Availability zones', 'Region pairs', 'Geography and data residency', 'Sovereign regions'],
      correctAnswer: 2,
      explanation: 'Azure geographies define boundaries for data residency. By deploying to German regions and using geo-redundant options within the geography, data stays within the required borders.'
    },
    {
      id: 'az900-07-q4',
      question: 'How many availability zones are there at minimum in an Azure region that supports them?',
      options: ['1', '2', '3', '5'],
      correctAnswer: 2,
      explanation: 'Azure regions that support availability zones have a minimum of 3 physically separate zones, each with independent infrastructure to ensure high availability.'
    },
    {
      id: 'az900-07-q5',
      question: 'Which Azure offering is specifically designed for US government agencies and contractors?',
      options: ['Azure region pair', 'Azure Government', 'Azure availability zone', 'Azure Premium tier'],
      correctAnswer: 1,
      explanation: 'Azure Government is a sovereign region that is physically and logically separate from the public Azure cloud. It is operated by screened US personnel and meets US government compliance requirements.'
    }
  ]}
/>

## Learn More

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe core architectural components](https://learn.microsoft.com/en-us/training/modules/describe-core-architectural-components-of-azure/)
- [Azure global infrastructure](https://azure.microsoft.com/explore/global-infrastructure/)
