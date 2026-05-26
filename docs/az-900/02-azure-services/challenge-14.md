---
sidebar_position: 8
title: "Challenge 14: Storage Redundancy & Tiers"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 14: Storage Redundancy & Tiers

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Azure Architecture & Services (35-40%)
:::

## Exam skills covered

- Describe storage tiers (hot, cool, cold, archive)
- Describe redundancy options (LRS, ZRS, GRS, RA-GRS)

## Overview

Azure Storage keeps multiple copies of your data to protect against failures. The **redundancy option** you choose determines how many copies are made and where they're stored. Azure also offers **access tiers** that let you optimize costs based on how frequently data is accessed.

## Explore

### Task 1: Understand redundancy options

| Redundancy | Copies | Scope | Protects against |
|-----------|--------|-------|-----------------|
| **LRS** (Locally Redundant) | 3 | Single datacenter | Disk/rack failure |
| **ZRS** (Zone Redundant) | 3 | 3 availability zones | Datacenter failure |
| **GRS** (Geo-Redundant) | 6 | 3 local + 3 in paired region | Regional failure |
| **RA-GRS** (Read-Access GRS) | 6 | Same as GRS + read from secondary | Regional failure + read availability |
| **GZRS** (Geo-Zone Redundant) | 6 | 3 zones + 3 in paired region | Zone + regional failure |
| **RA-GZRS** | 6 | Same as GZRS + read from secondary | Maximum protection |

**Visual representation:**
```yaml
LRS:    [Copy1][Copy2][Copy3]  ← All in ONE datacenter

ZRS:    [Zone1]  [Zone2]  [Zone3]  ← Each in a DIFFERENT datacenter

GRS:    [Primary: 3 copies] ←→ [Secondary region: 3 copies]

RA-GRS: Same as GRS, but secondary is READABLE
```

### Task 2: Choose redundancy for scenarios

| Scenario | Recommended redundancy | Why |
|----------|----------------------|-----|
| Dev/test, non-critical data | LRS | Cheapest, single datacenter OK |
| Production web app data | ZRS | Survives datacenter failure |
| Disaster recovery / compliance | GRS or RA-GRS | Survives regional failure |
| Mission-critical data | RA-GZRS | Maximum durability + read availability |

### Task 3: Understand access tiers

| Tier | Access frequency | Storage cost | Access cost | Min duration |
|------|-----------------|-------------|-------------|-------------|
| **Hot** | Frequently accessed | Higher | Lower | None |
| **Cool** | Infrequently (≥30 days) | Lower | Higher | 30 days |
| **Cold** | Rarely (≥90 days) | Lower still | Higher still | 90 days |
| **Archive** | Almost never (≥180 days) | Lowest | Highest + rehydration time | 180 days |

**Cost trade-off**: Cheaper to store ↔ More expensive to access

### Task 4: Access tier scenarios

| Data type | Best tier | Reasoning |
|-----------|----------|-----------|
| Active website images | Hot | Accessed constantly |
| Monthly reports (current quarter) | Cool | Accessed occasionally |
| Compliance data (yearly audit) | Cold | Rarely accessed |
| 7-year backup archives | Archive | Almost never accessed |

**Archive tier details:**
- Data is stored offline
- Rehydration can take hours (up to 15 hours for standard)
- Priority rehydration available (under 1 hour, costs more)
- Cannot read data directly — must rehydrate first

### Task 5: Explore in the Portal

1. In Azure Portal, search for **Storage accounts** → **+ Create**
2. On the **Basics** tab, observe:
   - **Redundancy** dropdown: LRS, ZRS, GRS, RA-GRS, GZRS, RA-GZRS
3. On the **Advanced** tab, observe:
   - **Default access tier**: Hot, Cool, or Cold
4. Click **Cancel**

:::tip Azure CLI Alternative
```bash
# Check storage account redundancy (if one exists)
az storage account list --query "[].{Name:name, Redundancy:sku.name}" --output table

# Access tier is set per blob or per account default
# Example: change a blob tier (requires a storage account)
# az storage blob set-tier --account-name <name> --container-name <container> --name <blob> --tier Cool
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **LRS** | 3 copies in one datacenter (cheapest, least durable) |
| **ZRS** | 3 copies across availability zones |
| **GRS** | 3 local + 3 in paired region (cross-region protection) |
| **RA-GRS** | GRS + read access to secondary region |
| **Hot tier** | Optimized for frequent access |
| **Cool tier** | Lower storage cost, higher access cost (30-day minimum) |
| **Cold tier** | Even lower storage cost (90-day minimum) |
| **Archive tier** | Lowest storage cost, offline data (180-day minimum) |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-14-q1',
      question: 'A company needs to ensure their data survives a complete regional outage. Which minimum redundancy option should they choose?',
      options: ['LRS', 'ZRS', 'GRS', 'None — Azure always protects against regional outages'],
      correctAnswer: 2,
      explanation: 'GRS (Geo-Redundant Storage) replicates data to a secondary region hundreds of miles away. This protects against complete regional outages. LRS and ZRS only protect within a single region.'
    },
    {
      id: 'az900-14-q2',
      question: 'Data that must be retained for 7 years for compliance but is almost never accessed should be stored in which tier?',
      options: ['Hot', 'Cool', 'Cold', 'Archive'],
      correctAnswer: 3,
      explanation: 'The Archive tier has the lowest storage cost and is designed for data that is rarely accessed and stored for at least 180 days. For 7-year retention with minimal access, Archive is most cost-effective.'
    },
    {
      id: 'az900-14-q3',
      question: 'What is a key limitation of the Archive access tier?',
      options: ['It cannot store more than 1 TB', 'Data must be rehydrated before it can be read', 'It does not support encryption', 'It is only available in US regions'],
      correctAnswer: 1,
      explanation: 'Archive tier stores data offline. To read archived data, you must first rehydrate it (move it to hot or cool tier), which can take hours.'
    },
    {
      id: 'az900-14-q4',
      question: 'LRS stores how many copies of your data?',
      options: ['1', '2', '3', '6'],
      correctAnswer: 2,
      explanation: 'LRS (Locally Redundant Storage) maintains 3 copies of your data within a single datacenter. This provides 99.999999999% (11 nines) durability within a year.'
    },
    {
      id: 'az900-14-q5',
      question: 'What is the difference between GRS and RA-GRS?',
      options: ['GRS is faster', 'RA-GRS allows reading from the secondary region', 'GRS has more copies', 'RA-GRS is cheaper'],
      correctAnswer: 1,
      explanation: 'Both GRS and RA-GRS maintain 6 copies (3 primary + 3 secondary region). The difference is RA-GRS provides READ access to the secondary region at all times, even when the primary is healthy.'
    }
  ]}
/>

## Learn More

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe Azure storage services](https://learn.microsoft.com/en-us/training/modules/describe-azure-storage-services/)
- [Azure Storage redundancy](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy)
