---
sidebar_position: 9
title: "Challenge 15: Data Migration Options"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 15: Data Migration Options

:::info Estimated Time
**15-25 min** | **Cost**: Free | **Domain**: Azure Architecture & Services (35-40%)
:::

## Exam skills covered

- Identify options for moving files (AzCopy, Storage Explorer, Azure File Sync)
- Describe migration options (Azure Migrate, Azure Data Box)

## Overview

Moving data to Azure can be done in many ways depending on the volume of data, network bandwidth, and time constraints. Azure provides tools for small transfers (AzCopy, Storage Explorer), medium migrations (Azure Migrate), and massive offline transfers (Azure Data Box).

## Explore

### Task 1: Understand data movement tools

| Tool | Best for | How it works |
|------|----------|-------------|
| **AzCopy** | Files/blobs via command line | CLI utility, fast parallel transfers |
| **Azure Storage Explorer** | Files/blobs via GUI | Desktop app with drag-and-drop |
| **Azure File Sync** | Hybrid file shares | Syncs on-prem file server with Azure Files |
| **Azure Migrate** | Full workload migration | Assess and migrate VMs, databases, apps |
| **Azure Data Box** | Massive data (TBs-PBs) | Physical device shipped to you |

### Task 2: Understand Azure Migrate

Azure Migrate is a hub for discovering, assessing, and migrating:
- **Servers** (VMs from VMware, Hyper-V, physical)
- **Databases** (SQL Server → Azure SQL)
- **Web apps** (IIS → App Service)
- **Data** (using Data Box)

**Migration process:**
1. **Discover** — Find on-premises workloads
2. **Assess** — Check readiness and estimate costs
3. **Migrate** — Move workloads to Azure

### Task 3: Understand Azure Data Box

For very large data transfers where network upload would take weeks or months:

| Data Box variant | Capacity | Use case |
|-----------------|----------|----------|
| **Data Box Disk** | Up to 35 TB | Small-medium offline transfer |
| **Data Box** | Up to 80 TB | Medium offline transfer |
| **Data Box Heavy** | Up to 1 PB | Large offline transfer |

**How it works:**
1. Order a Data Box from Azure Portal
2. Microsoft ships the device to you
3. Copy your data to the device
4. Ship it back to Microsoft
5. Microsoft uploads data to your storage account

### Task 4: Explore Azure Migrate in Portal

1. In Azure Portal, search for **Azure Migrate**
2. Explore the **Get started** page
3. Notice the migration goals:
   - Servers, databases, and web apps
   - Azure VMware Solution
4. Browse **Assessment tools** and **Migration tools**
5. This is a discovery/assessment tool — read-only, no cost

### Task 5: AzCopy and Storage Explorer

**AzCopy** (command-line):
```bash
# Example: Copy a file to blob storage
# azcopy copy 'local-file.txt' 'https://account.blob.core.windows.net/container/file.txt?SAS-token'

# AzCopy is pre-installed in Azure Cloud Shell
azcopy --version
```

**Azure Storage Explorer** (GUI):
- Free desktop application
- Connect to storage accounts visually
- Drag-and-drop file uploads
- Manage blobs, files, queues, tables
- Download from: [azure.microsoft.com/products/storage/storage-explorer](https://azure.microsoft.com/products/storage/storage-explorer/)

:::tip Azure CLI Alternative
```bash
# AzCopy version check (pre-installed in Cloud Shell)
azcopy --version

# List storage accounts for migration planning
az storage account list --query "[].{Name:name, Location:location}" --output table
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **AzCopy** | Command-line tool for fast data transfer to/from Azure Storage |
| **Storage Explorer** | GUI tool for managing Azure Storage visually |
| **Azure File Sync** | Keeps on-prem file servers in sync with Azure Files |
| **Azure Migrate** | Assess and migrate servers, databases, and apps to Azure |
| **Azure Data Box** | Physical device for offline transfer of massive data |
| **Lift-and-shift** | Move workloads to Azure with minimal changes |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-15-q1',
      question: 'A company has 100 TB of data to move to Azure but limited internet bandwidth. What should they use?',
      options: ['AzCopy', 'Azure Storage Explorer', 'Azure Data Box', 'Azure File Sync'],
      correctAnswer: 2,
      explanation: 'Azure Data Box is designed for large offline data transfers. Microsoft ships a physical storage device, you copy data to it, and ship it back. It supports up to 80 TB per device (or Data Box Heavy for up to 1 PB).'
    },
    {
      id: 'az900-15-q2',
      question: 'Which tool provides a GUI for uploading files to Azure Blob Storage from a desktop computer?',
      options: ['AzCopy', 'Azure Storage Explorer', 'Azure Migrate', 'Azure Portal only'],
      correctAnswer: 1,
      explanation: 'Azure Storage Explorer is a free desktop application that provides a graphical interface for managing Azure Storage. It supports drag-and-drop file uploads and works across Windows, macOS, and Linux.'
    },
    {
      id: 'az900-15-q3',
      question: 'An organization wants to assess their on-premises VMs for readiness to move to Azure. Which service should they start with?',
      options: ['Azure Data Box', 'AzCopy', 'Azure Migrate', 'Azure File Sync'],
      correctAnswer: 2,
      explanation: 'Azure Migrate provides discovery and assessment tools that analyze on-premises workloads, check Azure readiness, and estimate costs before migration.'
    },
    {
      id: 'az900-15-q4',
      question: 'A company wants to keep their on-premises file server but also have files available in Azure for cloud-based applications. Which service enables this?',
      options: ['AzCopy', 'Azure Data Box', 'Azure File Sync', 'Azure Migrate'],
      correctAnswer: 2,
      explanation: 'Azure File Sync synchronizes on-premises Windows file servers with Azure Files. Files are accessible both locally and in the cloud, with cloud tiering to free local disk space.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe Azure storage services](https://learn.microsoft.com/en-us/training/modules/describe-azure-storage-services/)
- [Azure Migrate documentation](https://learn.microsoft.com/en-us/azure/migrate/)
- [Azure Data Box documentation](https://learn.microsoft.com/en-us/azure/databox/)
