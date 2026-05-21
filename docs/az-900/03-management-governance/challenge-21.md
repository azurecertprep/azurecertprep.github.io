---
sidebar_position: 3
title: "Challenge 21: Azure Cloud Shell, CLI & PowerShell"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 21: Azure Cloud Shell, CLI & PowerShell

:::info Estimated Time
**25-35 min** | **Cost**: Free | **Domain**: Management & Governance (30-35%)
:::

## Exam skills covered

- Describe the Azure portal
- Describe Azure Cloud Shell (Azure CLI and Azure PowerShell)

## Overview

Azure provides multiple ways to manage resources: the **Azure Portal** (web GUI), **Azure CLI** (cross-platform command line), and **Azure PowerShell** (PowerShell modules for Azure). **Azure Cloud Shell** runs both CLI and PowerShell directly in your browser — no local installation needed.

## Explore

### Task 1: Explore the Azure Portal

1. Open [portal.azure.com](https://portal.azure.com)
2. Familiarize yourself with key areas:
   - **Search bar** (top): Find any service or resource
   - **Home**: Quick access to recent resources
   - **All services**: Browse every Azure service by category
   - **Dashboard**: Customizable view of your environment
   - **Favorites** (left sidebar): Pin frequently used services
3. Try customizing your dashboard:
   - Click **+ New dashboard** or **Edit**
   - Add tiles showing resource groups, service health, etc.

### Task 2: Open Azure Cloud Shell

1. In the Azure Portal, click the **Cloud Shell** icon (looks like `>_` in the top toolbar)
2. If first time: select **Bash** or **PowerShell** (you can switch later)
3. If prompted for storage: click **Create storage** (uses a small, free storage account)
4. You now have a terminal in your browser!

**Cloud Shell features:**
- Pre-installed: Azure CLI, Azure PowerShell, Git, Python, Node.js, Terraform
- Persistent: 5 GB home directory storage
- Authenticated: Already logged into your Azure account
- Minimal cost: Requires a small storage account for persistence (~$0.01/month)

### Task 3: Try Azure CLI commands

Switch to **Bash** in Cloud Shell, then run:

```bash
# See which account you're logged into
az account show --output table

# List all resource groups
az group list --output table

# List available Azure regions (first 10)
az account list-locations --query "[0:10].{Name:displayName, Geo:metadata.geographyGroup}" --output table

# Get help for any command
az vm --help
```

**Azure CLI pattern:** `az <service> <action> --parameters`
- `az vm create` — create a VM
- `az group list` — list resource groups
- `az storage account show` — show storage details

### Task 4: Try Azure PowerShell commands

Switch to **PowerShell** in Cloud Shell, then run:

```powershell
# See which account you're logged into
Get-AzContext

# List all resource groups
Get-AzResourceGroup | Format-Table

# List available VM sizes (first 10)
Get-AzVMSize -Location "eastus" | Select-Object -First 10

# Get help
Get-Help New-AzVM
```

**Azure PowerShell pattern:** `Verb-AzNoun -Parameters`
- `New-AzVM` — create a VM
- `Get-AzResourceGroup` — list resource groups
- `Remove-AzStorageAccount` — delete storage

### Task 5: Compare management tools

| Tool | Best for | Available on |
|------|----------|-------------|
| **Azure Portal** | Visual management, exploration, one-off tasks | Any browser |
| **Azure CLI** | Scripting (Bash), cross-platform automation | Windows, macOS, Linux, Cloud Shell |
| **Azure PowerShell** | Scripting (PowerShell), Windows automation | Windows, macOS, Linux, Cloud Shell |
| **Azure Cloud Shell** | Quick commands without local setup | Any browser |
| **Azure Mobile App** | Monitoring on-the-go | iOS, Android |
| **REST API** | Custom integrations, SDKs | Any language |

**When to use what:**
- Learning/exploring → **Portal**
- Repeating tasks → **CLI or PowerShell** (scriptable)
- CI/CD pipelines → **CLI** (cross-platform)
- Windows admin familiar with PowerShell → **Azure PowerShell**

:::tip Try it now!
Open Cloud Shell and run: `az interactive` for an enhanced CLI experience with auto-complete and inline documentation.
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Azure Portal** | Web-based GUI for managing Azure resources |
| **Azure CLI** | Cross-platform command-line tool (`az` commands) |
| **Azure PowerShell** | PowerShell module for Azure (`Verb-AzNoun` commands) |
| **Azure Cloud Shell** | Browser-based terminal with CLI + PowerShell pre-installed |
| **Infrastructure as Code** | Manage infrastructure through scripts/templates (repeatable) |
| **Idempotent** | Running the same command twice produces the same result |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-21-q1',
      question: 'What is Azure Cloud Shell?',
      options: ['A downloadable application for managing Azure', 'A virtual machine running in your subscription', 'A browser-based terminal with pre-installed Azure tools', 'A mobile app for Azure management'],
      correctAnswer: 2,
      explanation: 'Azure Cloud Shell is a browser-based terminal accessible from the Azure Portal. It comes with Azure CLI, Azure PowerShell, and other tools pre-installed, and is already authenticated to your account.'
    },
    {
      id: 'az900-21-q2',
      question: 'Which Azure management tool is best for tasks that need to be repeated automatically through scripts?',
      options: ['Azure CLI or Azure PowerShell', 'Azure Portal', 'Azure Mobile App', 'Azure Advisor'],
      correctAnswer: 0,
      explanation: 'Azure CLI and Azure PowerShell are scriptable command-line tools, making them ideal for automation and repeatable tasks. The Portal is better for one-off tasks and exploration.'
    },
    {
      id: 'az900-21-q3',
      question: 'What is a key advantage of the Azure Portal over CLI tools?',
      options: ['It is faster', 'It supports automation', 'It can be used offline', 'It provides a visual interface for exploration and discovery'],
      correctAnswer: 3,
      explanation: 'The Azure Portal provides a graphical interface that makes it easy to explore services, discover options, and understand relationships between resources — ideal for learning and one-off management tasks.'
    },
    {
      id: 'az900-21-q4',
      question: 'Azure Cloud Shell requires which of the following to persist files between sessions?',
      options: ['A virtual machine', 'An Azure Storage account', 'A premium subscription', 'A local installation'],
      correctAnswer: 1,
      explanation: 'Cloud Shell uses a small Azure Storage account (Azure Files share) to persist your home directory between sessions. This is created automatically on first use.'
    },
    {
      id: 'az900-21-q5',
      question: 'The Azure CLI command pattern follows which format?',
      options: ['Verb-AzNoun', 'New-AzResource', 'az <service> <action> --parameters', 'azure.service.action()'],
      correctAnswer: 2,
      explanation: 'Azure CLI uses the pattern: az <service> <action> --parameters. For example: az vm create --name myVM --resource-group myRG. Azure PowerShell uses the Verb-AzNoun pattern.'
    }
  ]}
/>

## Learn More

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Curated study materials
- [Microsoft Learn: Describe features and tools for managing and deploying Azure resources](https://learn.microsoft.com/en-us/training/modules/describe-features-tools-manage-deploy-azure-resources/)
- [Azure CLI documentation](https://learn.microsoft.com/en-us/cli/azure/)
- [Azure PowerShell documentation](https://learn.microsoft.com/en-us/powershell/azure/)
