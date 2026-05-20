---
sidebar_position: 99
title: "Coverage matrix"
---

# SC-500 skills coverage matrix

This matrix maps every official exam skill to a specific challenge. Use it to verify you've practiced all testable skills.

## Domain 1: Manage identity, access, and governance (20–25%)

### Design and implement privileged access

| Skill | Challenge | Status |
|-------|-----------|--------|
| Design and implement Privileged Identity Management (PIM) for Azure resources and Microsoft Entra roles | [Challenge 01](./01-identity-access-governance/challenge-01.md) | Covered |
| Configure role activation requirements (approval, justification, MFA) | [Challenge 01](./01-identity-access-governance/challenge-01.md) | Covered |
| Implement just-in-time access for administrative roles | [Challenge 01](./01-identity-access-governance/challenge-01.md) | Covered |
| Monitor and audit privileged access using PIM alerts and access reviews | [Challenge 02](./01-identity-access-governance/challenge-02.md) | Covered |
| Design emergency access (break-glass) accounts | [Challenge 02](./01-identity-access-governance/challenge-02.md) | Covered |

### Design and implement Conditional Access

| Skill | Challenge | Status |
|-------|-----------|--------|
| Design Conditional Access policies for zero-trust scenarios | [Challenge 03](./01-identity-access-governance/challenge-03.md) | Covered |
| Configure Conditional Access grant and session controls | [Challenge 03](./01-identity-access-governance/challenge-03.md) | Covered |
| Implement Conditional Access authentication context | [Challenge 03](./01-identity-access-governance/challenge-03.md) | Covered |
| Configure authentication strengths and MFA methods | [Challenge 04](./01-identity-access-governance/challenge-04.md) | Covered |
| Troubleshoot and evaluate Conditional Access policy evaluation | [Challenge 04](./01-identity-access-governance/challenge-04.md) | Covered |

### Manage identity protection and risk

| Skill | Challenge | Status |
|-------|-----------|--------|
| Configure sign-in risk and user risk policies | [Challenge 05](./01-identity-access-governance/challenge-05.md) | Covered |
| Implement risk-based Conditional Access policies | [Challenge 05](./01-identity-access-governance/challenge-05.md) | Covered |
| Investigate and remediate risky users and sign-ins | [Challenge 05](./01-identity-access-governance/challenge-05.md) | Covered |
| Configure external identities and cross-tenant access settings | [Challenge 06](./01-identity-access-governance/challenge-06.md) | Covered |
| Implement B2B collaboration and entitlement management | [Challenge 06](./01-identity-access-governance/challenge-06.md) | Covered |

### Design and implement governance

| Skill | Challenge | Status |
|-------|-----------|--------|
| Design and implement custom RBAC roles for least-privilege access | [Challenge 07](./01-identity-access-governance/challenge-07.md) | Covered |
| Configure role assignments at management group, subscription, and resource scope | [Challenge 07](./01-identity-access-governance/challenge-07.md) | Covered |
| Design and implement Azure Policy for security compliance | [Challenge 08](./01-identity-access-governance/challenge-08.md) | Covered |
| Configure policy enforcement modes (audit, deny, deploy-if-not-exists) | [Challenge 08](./01-identity-access-governance/challenge-08.md) | Covered |
| Implement resource locks and governance hierarchies | [Challenge 09](./01-identity-access-governance/challenge-09.md) | Covered |
| Configure and manage access reviews for groups, apps, and roles | [Challenge 10](./01-identity-access-governance/challenge-10.md) | Covered |
| Design entitlement management with access packages and catalogs | [Challenge 11](./01-identity-access-governance/challenge-11.md) | Covered |
| Implement administrative units for delegated administration | [Challenge 12](./01-identity-access-governance/challenge-12.md) | Covered |

## Domain 2: Secure storage, databases, and networking (25–30%)

### Plan and implement security for storage

| Skill | Challenge | Status |
|-------|-----------|--------|
| Configure storage account encryption (Microsoft-managed and customer-managed keys) | [Challenge 13](./02-storage-databases-networking/challenge-13.md) | Covered |
| Configure storage account network access (firewalls and virtual network rules) | [Challenge 13](./02-storage-databases-networking/challenge-13.md) | Covered |
| Configure shared access signatures (SAS) and stored access policies | [Challenge 14](./02-storage-databases-networking/challenge-14.md) | Covered |
| Manage storage account access keys and key rotation | [Challenge 14](./02-storage-databases-networking/challenge-14.md) | Covered |
| Configure Azure Storage lifecycle management for security | [Challenge 14](./02-storage-databases-networking/challenge-14.md) | Covered |
| Implement infrastructure encryption (double encryption) for storage | [Challenge 13](./02-storage-databases-networking/challenge-13.md) | Covered |

### Plan and implement security for databases

| Skill | Challenge | Status |
|-------|-----------|--------|
| Configure Azure SQL Database firewall rules and virtual network rules | [Challenge 15](./02-storage-databases-networking/challenge-15.md) | Covered |
| Configure Azure SQL transparent data encryption (TDE) with CMK | [Challenge 15](./02-storage-databases-networking/challenge-15.md) | Covered |
| Implement Always Encrypted for column-level encryption | [Challenge 16](./02-storage-databases-networking/challenge-16.md) | Covered |
| Configure dynamic data masking and row-level security | [Challenge 16](./02-storage-databases-networking/challenge-16.md) | Covered |
| Implement Azure SQL auditing and threat detection | [Challenge 17](./02-storage-databases-networking/challenge-17.md) | Covered |
| Configure Cosmos DB security (RBAC, network restrictions, encryption) | [Challenge 17](./02-storage-databases-networking/challenge-17.md) | Covered |

### Plan and implement security for Azure Key Vault

| Skill | Challenge | Status |
|-------|-----------|--------|
| Configure Key Vault access control (RBAC vs access policies) | [Challenge 18](./02-storage-databases-networking/challenge-18.md) | Covered |
| Configure Key Vault networking (private endpoint, firewall) | [Challenge 18](./02-storage-databases-networking/challenge-18.md) | Covered |
| Implement key, secret, and certificate management and rotation | [Challenge 19](./02-storage-databases-networking/challenge-19.md) | Covered |
| Configure Key Vault backup, soft-delete, and purge protection | [Challenge 19](./02-storage-databases-networking/challenge-19.md) | Covered |

### Design and implement network security

| Skill | Challenge | Status |
|-------|-----------|--------|
| Design and implement network security groups (NSGs) and application security groups (ASGs) | [Challenge 20](./02-storage-databases-networking/challenge-20.md) | Covered |
| Configure NSG flow logs and traffic analytics | [Challenge 20](./02-storage-databases-networking/challenge-20.md) | Covered |
| Design and implement Azure Firewall (rules, threat intelligence, IDPS) | [Challenge 21](./02-storage-databases-networking/challenge-21.md) | Covered |
| Configure Azure Firewall Manager and firewall policies | [Challenge 21](./02-storage-databases-networking/challenge-21.md) | Covered |
| Implement private endpoints and Private Link services | [Challenge 22](./02-storage-databases-networking/challenge-22.md) | Covered |
| Configure private DNS zones for private endpoint resolution | [Challenge 22](./02-storage-databases-networking/challenge-22.md) | Covered |
| Configure Web Application Firewall (WAF) on Application Gateway and Front Door | [Challenge 23](./02-storage-databases-networking/challenge-23.md) | Covered |
| Implement DDoS Protection plans and configure mitigation policies | [Challenge 24](./02-storage-databases-networking/challenge-24.md) | Covered |
| Configure Azure Bastion for secure remote access | [Challenge 25](./02-storage-databases-networking/challenge-25.md) | Covered |
| Implement network segmentation and micro-segmentation strategies | [Challenge 25](./02-storage-databases-networking/challenge-25.md) | Covered |

## Domain 3: Secure compute (20–25%)

### Secure AI workloads

| Skill | Challenge | Status |
|-------|-----------|--------|
| Identify and mitigate data overexposure risks before deploying AI workloads | [Challenge 26](./03-secure-compute/challenge-26.md) | Covered |
| Configure Microsoft Purview Data Security Posture Management (DSPM) for AI | [Challenge 26](./03-secure-compute/challenge-26.md) | Covered |
| Assess SharePoint site permissions for oversharing (Copilot readiness) | [Challenge 27](./03-secure-compute/challenge-27.md) | Covered |
| Implement sensitivity labels to protect data surfaced by Copilot | [Challenge 27](./03-secure-compute/challenge-27.md) | Covered |
| Configure Azure AI content safety and content filtering policies | [Challenge 28](./03-secure-compute/challenge-28.md) | Covered |
| Implement security controls for Azure OpenAI deployments | [Challenge 28](./03-secure-compute/challenge-28.md) | Covered |
| Design and implement prompt injection detection and mitigation | [Challenge 29](./03-secure-compute/challenge-29.md) | Covered |
| Monitor AI workload security using Defender for Cloud | [Challenge 30](./03-secure-compute/challenge-30.md) | Covered |

### Plan and implement security for virtual machines

| Skill | Challenge | Status |
|-------|-----------|--------|
| Configure Microsoft Defender for Servers (Plan 1 and Plan 2) | [Challenge 31](./03-secure-compute/challenge-31.md) | Covered |
| Implement just-in-time (JIT) VM access | [Challenge 31](./03-secure-compute/challenge-31.md) | Covered |
| Configure adaptive application controls | [Challenge 32](./03-secure-compute/challenge-32.md) | Covered |
| Implement endpoint protection and antimalware policies | [Challenge 32](./03-secure-compute/challenge-32.md) | Covered |
| Configure disk encryption (Azure Disk Encryption, server-side encryption with CMK) | [Challenge 33](./03-secure-compute/challenge-33.md) | Covered |
| Implement vulnerability assessment and remediation for VMs | [Challenge 34](./03-secure-compute/challenge-34.md) | Covered |
| Configure update management and patch compliance | [Challenge 34](./03-secure-compute/challenge-34.md) | Covered |

### Plan and implement security for containers and app services

| Skill | Challenge | Status |
|-------|-----------|--------|
| Configure Microsoft Defender for Containers (registry scanning, runtime protection) | [Challenge 35](./03-secure-compute/challenge-35.md) | Covered |
| Implement Azure Policy for Kubernetes admission control | [Challenge 35](./03-secure-compute/challenge-35.md) | Covered |
| Configure container image scanning and vulnerability management | [Challenge 36](./03-secure-compute/challenge-36.md) | Covered |
| Implement secure container registry access (ACR with private endpoint, content trust) | [Challenge 36](./03-secure-compute/challenge-36.md) | Covered |
| Configure Azure App Service security (TLS, access restrictions, managed identity) | [Challenge 37](./03-secure-compute/challenge-37.md) | Covered |
| Implement Defender for App Service and configure security alerts | [Challenge 37](./03-secure-compute/challenge-37.md) | Covered |
| Configure Azure Functions security (authentication, network restrictions) | [Challenge 38](./03-secure-compute/challenge-38.md) | Covered |
| Implement API Management security policies (JWT validation, rate limiting) | [Challenge 38](./03-secure-compute/challenge-38.md) | Covered |

## Domain 4: Manage and monitor security posture (20–25%)

### Configure and manage Microsoft Defender for Cloud

| Skill | Challenge | Status |
|-------|-----------|--------|
| Configure environment settings in Microsoft Defender for Cloud | [Challenge 39](./04-security-posture-monitoring/challenge-39.md) | Covered |
| Evaluate security posture by using Cloud Security Posture Management (CSPM) | [Challenge 39](./04-security-posture-monitoring/challenge-39.md) | Covered |
| Identify and remediate risks by using attack path analysis | [Challenge 39](./04-security-posture-monitoring/challenge-39.md) | Covered |
| Configure Secure Score and implement security recommendations | [Challenge 40](./04-security-posture-monitoring/challenge-40.md) | Covered |
| Configure regulatory compliance dashboards and assessments | [Challenge 40](./04-security-posture-monitoring/challenge-40.md) | Covered |
| Configure Defender for Cloud security alerts and incidents | [Challenge 41](./04-security-posture-monitoring/challenge-41.md) | Covered |
| Implement alert suppression rules for false positives | [Challenge 41](./04-security-posture-monitoring/challenge-41.md) | Covered |
| Configure workflow automation for security responses | [Challenge 42](./04-security-posture-monitoring/challenge-42.md) | Covered |
| Integrate Defender for Cloud with Microsoft Sentinel | [Challenge 42](./04-security-posture-monitoring/challenge-42.md) | Covered |

### Configure and manage Microsoft Sentinel

| Skill | Challenge | Status |
|-------|-----------|--------|
| Configure data connectors for Azure and non-Azure sources | [Challenge 43](./04-security-posture-monitoring/challenge-43.md) | Covered |
| Configure data collection rules (DCR) for custom log ingestion | [Challenge 43](./04-security-posture-monitoring/challenge-43.md) | Covered |
| Design and implement Sentinel analytics rules (scheduled, NRT, Microsoft Security) | [Challenge 44](./04-security-posture-monitoring/challenge-44.md) | Covered |
| Configure Fusion detection for advanced multi-stage attacks | [Challenge 44](./04-security-posture-monitoring/challenge-44.md) | Covered |
| Implement automation rules and playbooks using Logic Apps | [Challenge 45](./04-security-posture-monitoring/challenge-45.md) | Covered |
| Configure SOAR (Security Orchestration, Automation, and Response) workflows | [Challenge 45](./04-security-posture-monitoring/challenge-45.md) | Covered |
| Design and configure Sentinel workbooks for security monitoring | [Challenge 46](./04-security-posture-monitoring/challenge-46.md) | Covered |
| Implement threat intelligence indicators and feeds | [Challenge 47](./04-security-posture-monitoring/challenge-47.md) | Covered |
| Configure threat hunting queries and bookmarks | [Challenge 47](./04-security-posture-monitoring/challenge-47.md) | Covered |

### Monitor security by using KQL and diagnostic settings

| Skill | Challenge | Status |
|-------|-----------|--------|
| Write KQL queries for security investigation (SecurityEvent, SigninLogs, AzureActivity) | [Challenge 48](./04-security-posture-monitoring/challenge-48.md) | Covered |
| Configure diagnostic settings to route security logs to Log Analytics | [Challenge 48](./04-security-posture-monitoring/challenge-48.md) | Covered |
| Implement log retention policies and archive strategies | [Challenge 49](./04-security-posture-monitoring/challenge-49.md) | Covered |
| Configure alerts based on KQL queries and metric thresholds | [Challenge 49](./04-security-posture-monitoring/challenge-49.md) | Covered |
| Implement Azure Monitor security baseline assessments | [Challenge 50](./04-security-posture-monitoring/challenge-50.md) | Covered |
| Design and implement incident response procedures using Sentinel incidents | [Challenge 51](./04-security-posture-monitoring/challenge-51.md) | Covered |
| Configure entity behavior analytics (UEBA) for anomaly detection | [Challenge 51](./04-security-posture-monitoring/challenge-51.md) | Covered |

---

**Total skills covered: 89/89 (100%)**
