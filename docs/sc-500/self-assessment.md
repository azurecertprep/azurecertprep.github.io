---
sidebar_position: 4
title: "Am I ready?"
---

import SelfAssessment from '@site/src/components/SelfAssessment';

# Am I ready for the SC-500?

Before diving into the challenges, assess your readiness. The SC-500 assumes you already have experience administering Azure resources (AZ-104 level) and understand basic security concepts.

## Self-assessment checklist

Click each row to cycle through: ✅ Comfortable | ⚠️ Need Review | ❌ New to Me

### Prerequisites

<SelfAssessment
  storageKey="sc500-prereqs"
  skills={[
    "I have experience with Azure administration (AZ-104 level)",
    "I understand identity concepts (authentication, authorization, federation)",
    "I can navigate the Azure Portal and use Azure CLI for resource management",
    "I understand basic networking (subnets, NSGs, DNS, load balancers, TLS)",
    "I have deployed and managed Azure resources (VMs, storage, databases)",
    "I understand encryption concepts (symmetric, asymmetric, hashing, TLS)",
  ]}
/>

### Domain 1: Manage identity, access, and governance (20–25%)

#### Manage identity and access

<SelfAssessment
  storageKey="sc500-domain1-identity"
  skills={[
    "I can configure Privileged Identity Management (PIM) for Entra roles and Azure resources",
    "I can design and implement Conditional Access policies with proper evaluation logic",
    "I can configure multi-factor authentication methods and authentication strengths",
    "I can implement identity protection policies (sign-in risk, user risk)",
    "I can configure external identities and cross-tenant access settings",
    "I can implement Entra ID entitlement management (access packages, catalogs)",
  ]}
/>

#### Manage governance

<SelfAssessment
  storageKey="sc500-domain1-governance"
  skills={[
    "I can design and implement custom RBAC roles (Actions, DataActions, scopes)",
    "I can configure Azure Policy for security compliance enforcement",
    "I can implement resource locks and management group hierarchies",
    "I can configure and review access using Entra access reviews",
    "I can implement administrative units for delegated administration",
    "I can design governance strategies using management groups and subscriptions",
  ]}
/>

### Domain 2: Secure storage, databases, and networking (25–30%)

#### Secure storage and databases

<SelfAssessment
  storageKey="sc500-domain2-storage"
  skills={[
    "I can configure storage account encryption with customer-managed keys (CMK)",
    "I can implement storage account network restrictions (firewalls, VNet rules, private endpoints)",
    "I can configure shared access signatures (SAS) and stored access policies",
    "I can implement Azure SQL security (TDE, Always Encrypted, dynamic data masking)",
    "I can configure Azure SQL firewall rules and private endpoints",
    "I can implement Key Vault access control (RBAC model vs access policies)",
    "I can configure Key Vault networking, backup, and soft-delete/purge protection",
  ]}
/>

#### Secure networking

<SelfAssessment
  storageKey="sc500-domain2-networking"
  skills={[
    "I can design and implement NSG rules with proper priority ordering",
    "I can configure Azure Firewall rules (network rules, application rules, DNAT)",
    "I can implement private endpoints and configure private DNS zones",
    "I can configure Web Application Firewall (WAF) policies on Application Gateway",
    "I can implement DDoS Protection plans and configure mitigation",
    "I can design network segmentation using VNets, subnets, and NSGs",
    "I can configure service endpoints vs private endpoints (know the trade-offs)",
    "I can implement Azure Bastion for secure VM access",
  ]}
/>

### Domain 3: Secure compute (20–25%)

#### Secure AI workloads

<SelfAssessment
  storageKey="sc500-domain3-ai"
  skills={[
    "I can identify and mitigate data overexposure risks before deploying AI (Purview DSPM)",
    "I can configure sensitivity labels to protect data surfaced by Copilot",
    "I can implement Azure AI content safety and content filtering",
    "I can assess and remediate SharePoint oversharing for Copilot readiness",
    "I can configure security controls for Azure OpenAI deployments",
  ]}
/>

#### Secure VMs and containers

<SelfAssessment
  storageKey="sc500-domain3-compute"
  skills={[
    "I can configure Microsoft Defender for Servers (Plan 1 vs Plan 2)",
    "I can implement just-in-time (JIT) VM access",
    "I can configure adaptive application controls for VMs",
    "I can implement endpoint protection and vulnerability scanning",
    "I can configure Microsoft Defender for Containers (registry scanning, runtime)",
    "I can implement Azure Policy for Kubernetes admission control",
    "I can configure disk encryption (Azure Disk Encryption, server-side encryption)",
    "I can secure Azure App Service (TLS, access restrictions, managed identity)",
  ]}
/>

### Domain 4: Manage and monitor security posture (20–25%)

#### Security posture management

<SelfAssessment
  storageKey="sc500-domain4-posture"
  skills={[
    "I can configure and manage Defender for Cloud environment settings",
    "I can evaluate and improve Secure Score",
    "I can identify and remediate risks using attack path analysis",
    "I can configure Defender CSPM and cloud security graph",
    "I can implement regulatory compliance assessments",
    "I can configure security alerts and suppress false positives",
  ]}
/>

#### Microsoft Sentinel and monitoring

<SelfAssessment
  storageKey="sc500-domain4-sentinel"
  skills={[
    "I can configure data connectors in Microsoft Sentinel",
    "I can write basic KQL queries for security investigation",
    "I can create and manage Sentinel analytics rules (scheduled, NRT, Fusion)",
    "I can implement Sentinel automation rules and playbooks (Logic Apps)",
    "I can design and configure Sentinel workbooks for security monitoring",
    "I can implement threat intelligence indicators and hunting queries",
    "I can configure diagnostic settings and route logs to Log Analytics",
    "I can implement Microsoft Defender for Cloud alerts integration with Sentinel",
  ]}
/>

## Scoring guide

| Your results | Recommendation |
|--------------|---------------|
| Mostly ✅ | Ready to schedule the exam |
| Mix of ✅ and ⚠️ | Review weak areas using the relevant challenges, then schedule |
| Several ⚠️ and ❌ | Complete all challenges in your weak domains first |
| Mostly ❌ | Start with AZ-104 or the Microsoft Learn paths, then come back |

:::tip Exam readiness

Unlike AZ-500, the SC-500 includes **AI security** (Purview DSPM, sensitivity labels, Copilot readiness). If you're experienced with traditional Azure security but haven't worked with Purview or M365 Copilot security, budget extra study time for Domain 3's AI challenges.

:::
