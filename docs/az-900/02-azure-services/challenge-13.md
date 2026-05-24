---
sidebar_position: 7
title: "Challenge 13: Azure Storage Accounts & Types"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 13: Azure Storage Accounts & Types

:::info Estimated Time
**25-35 min** | **Cost**: Free | **Domain**: Azure Architecture & Services (35-40%)
:::

## Exam skills covered

- Compare Azure storage services (Blob, File, Queue, Table)
- Describe storage account options and storage types

## Overview

Azure Storage is a cloud storage solution for modern data storage scenarios. A **storage account** is the top-level container that provides a unique namespace for your data. Within a storage account, you can use four different storage services: Blob, File, Queue, and Table.

Each service addresses a different storage need â€” from unstructured binary data (blobs) to semi-structured NoSQL data (tables).

## Explore

### Task 1: Understand storage services

| Service | Data type | Use case | On-prem equivalent |
|---------|-----------|----------|-------------------|
| **Blob Storage** | Unstructured (files, images, videos) | Media files, backups, data lakes | File server / NAS |
| **Azure Files** | File shares (SMB/NFS) | Shared drives, lift-and-shift | File server with SMB shares |
| **Queue Storage** | Messages (up to 64 KB each) | Async communication between apps | Message queue (MSMQ) |
| **Table Storage** | NoSQL key-value data | Configuration data, logs | Simple database |

### Task 2: Explore storage account creation

1. In Azure Portal, search for **Storage accounts**
2. Click **+ Create**
3. Explore the options:
   - **Performance**: Standard (HDD) or Premium (SSD)
   - **Redundancy**: LRS, ZRS, GRS, RA-GRS (covered in Challenge 14)
   - **Account kind**: StorageV2 (recommended)
4. Click **Cancel** â€” don't create

### Task 3: Understand Blob Storage types

Blob Storage has three types of blobs:

| Blob type | Description | Use case |
|-----------|-------------|----------|
| **Block blobs** | Large objects (up to ~190.7 TiB) | Files, images, videos, backups |
| **Append blobs** | Optimized for append operations | Log files, streaming data |
| **Page blobs** | Random read/write (up to 8 TiB) | VM disks (VHDs) |

**Blob containers** organize blobs within a storage account:
```text
Storage Account: mystorageaccount
â”œâ”€â”€ Container: images
â”‚   â”œâ”€â”€ photo1.jpg
â”‚   â””â”€â”€ photo2.png
â”œâ”€â”€ Container: backups
â”‚   â””â”€â”€ db-backup-2024.bak
â””â”€â”€ Container: logs
    â””â”€â”€ app-log-01.txt
```

### Task 4: Understand Azure Files

Azure Files provides fully managed file shares:
- Accessible via **SMB** (Windows/Linux/macOS) or **NFS** (Linux)
- Can be mounted as a network drive
- Compatible with on-premises file share workflows
- Supports Azure File Sync (cache frequently accessed files on-premises)

**Key scenario**: Replace an on-premises file server with Azure Files â€” same user experience, less hardware.

### Task 5: Storage account naming

Storage account names must be:
- **3-24 characters** long
- **Lowercase letters and numbers only** (no dashes, underscores, or uppercase)
- **Globally unique** across all of Azure

Why globally unique? Because the storage account name becomes part of the URL:
- `https://mystorageaccount.blob.core.windows.net`
- `https://mystorageaccount.file.core.windows.net`

:::tip Azure CLI Alternative
```bash
# Check if a storage account name is available
az storage account check-name --name mystorageaz900test --output table

# List existing storage accounts (if any)
az storage account list --query "[].{Name:name, Location:location, Kind:kind}" --output table
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Storage account** | Top-level container; provides unique namespace |
| **Blob Storage** | Object storage for unstructured data |
| **Azure Files** | Managed file shares (SMB/NFS) |
| **Queue Storage** | Message queue for async communication |
| **Table Storage** | NoSQL key-value store |
| **Block blob** | Store large files (images, videos, backups) |
| **Storage account name** | Globally unique, lowercase alphanumeric, 3-24 chars |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-13-q1',
      question: 'A company needs to store thousands of image files that will be served to a web application. Which Azure storage service should they use?',
      options: ['Azure Files', 'Azure Blob Storage', 'Azure Queue Storage', 'Azure Table Storage'],
      correctAnswer: 1,
      explanation: 'Azure Blob Storage is designed for storing unstructured data like images, videos, and documents. It is optimized for serving large amounts of data to web applications.'
    },
    {
      id: 'az900-13-q2',
      question: 'A company wants to replace their on-premises file server with a cloud solution that users can mount as a network drive. Which service should they use?',
      options: ['Azure Blob Storage', 'Azure Files', 'Azure Queue Storage', 'Azure Cosmos DB'],
      correctAnswer: 1,
      explanation: 'Azure Files provides fully managed SMB and NFS file shares that can be mounted as network drives on Windows, Linux, and macOS â€” just like a traditional file server.'
    },
    {
      id: 'az900-13-q3',
      question: 'Which of the following is a valid Azure storage account name?',
      options: ['My-Storage-Account', 'mystorageaccount1', 'MyStorageAccount', 'my_storage_account'],
      correctAnswer: 1,
      explanation: 'Storage account names must be 3-24 characters, use only lowercase letters and numbers (no dashes, underscores, or uppercase). "mystorageaccount1" is the only valid option.'
    },
    {
      id: 'az900-13-q4',
      question: 'An application needs to decouple its components so they can process tasks asynchronously. Which storage service is designed for this?',
      options: ['Blob Storage', 'Azure Files', 'Queue Storage', 'Table Storage'],
      correctAnswer: 2,
      explanation: 'Azure Queue Storage is designed for storing messages that can be processed asynchronously. It decouples application components so they can scale independently.'
    },
    {
      id: 'az900-13-q5',
      question: 'What is the relationship between a storage account and blob containers?',
      options: ['A blob container can span multiple storage accounts', 'A storage account can contain multiple blob containers', 'They are the same thing', 'A blob container is a type of storage account'],
      correctAnswer: 1,
      explanation: 'A storage account is the top-level resource. Within it, you can create multiple blob containers, each holding multiple blobs. The hierarchy is: Storage Account â†’ Containers â†’ Blobs.'
    }
  ]}
/>

## Learn More

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) â€” Curated study materials
- [Microsoft Learn: Describe Azure storage services](https://learn.microsoft.com/en-us/training/modules/describe-azure-storage-services/)
- [Azure Storage documentation](https://learn.microsoft.com/en-us/azure/storage/)
