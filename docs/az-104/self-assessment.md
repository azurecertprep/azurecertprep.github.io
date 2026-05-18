---
sidebar_position: 2
title: "Am I Ready?"
---

import SelfAssessment from '@site/src/components/SelfAssessment';

# Am I Ready for the AZ-104?

Before diving into the challenges, take a few minutes to assess your readiness. The AZ-104 assumes you already have foundational knowledge of IT concepts and some Azure experience.

## Self-Assessment Checklist

Click each row to cycle through: ✅ Comfortable | ⚠️ Need Review | ❌ New to Me

### General IT Knowledge

<SelfAssessment
  storageKey="general-it"
  skills={[
    "I understand basic networking (IP addresses, subnets, DNS, DHCP)",
    "I can navigate a command-line interface (Bash, PowerShell, or CMD)",
    "I understand user authentication and authorization concepts",
    "I know the difference between IaaS, PaaS, and SaaS",
    "I understand virtualization concepts (VMs, hypervisors)",
    "I can read and write basic JSON",
  ]}
/>

### Azure-Specific Knowledge

<SelfAssessment
  storageKey="azure-specific"
  skills={[
    "I have logged into the Azure Portal and navigated it",
    "I understand Azure subscriptions, resource groups, and resources",
    "I have created at least one Azure resource (VM, Storage, etc.)",
    "I have used Azure CLI or Azure PowerShell at least once",
    "I know what ARM (Azure Resource Manager) is",
    "I understand Azure regions and availability zones",
  ]}
/>

## How to Interpret Your Results

### Mostly ✅: You're ready!
Jump straight to [Lab Setup](/docs/az-104/lab-setup) and start Challenge 01.

### Mix of ✅ and ⚠️: You're almost ready
Start the challenges but give yourself extra time on unfamiliar topics. Use the **Learning Resources** section in each challenge to fill gaps.

### Several ❌: Start with fundamentals first
Consider these resources before starting:
- [AZ-900: Azure Fundamentals](https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/) | Free learning path covering all the basics
- [Azure Portal Tour](https://learn.microsoft.com/en-us/azure/azure-portal/azure-portal-overview) | Get comfortable navigating the Portal
- [Azure CLI Getting Started](https://learn.microsoft.com/en-us/cli/azure/get-started-with-azure-cli) | Command-line basics

:::tip No Azure experience at all?

That's okay! The AZ-900 (Azure Fundamentals) certification is an excellent starting point. It's a lighter exam that builds the foundation you need for AZ-104. Many people take AZ-900 first, then AZ-104.
:::

## Experience Expectations

According to Microsoft, AZ-104 candidates should have:

- **6+ months** of hands-on Azure administration experience
- Experience with **PowerShell** and/or **Azure CLI**
- Familiarity with the **Azure Portal**
- Understanding of **ARM templates** or **Bicep files**
- Knowledge of **Microsoft Entra ID** (formerly Azure AD)

:::note Don't have 6 months of experience?

These challenges are designed to accelerate your learning. If you're motivated and dedicate focused time, you can build equivalent hands-on experience by completing all 28 challenges. Many successful candidates have passed with less than 6 months of experience by studying intensively.
:::

---

**Ready to go?** Head to the [Lab Setup](/docs/az-104/lab-setup) to configure your environment.
