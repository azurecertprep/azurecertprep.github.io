---
sidebar_position: 1
title: "AZ-104: Azure Administrator"
---

# AZ-104: Azure administrator

:::info Exam Details

**Exam version**: Skills measured as of April 17, 2026 | **Passing score**: 700/1000 | **Duration**: ~100-120 minutes

:::

## Who is this for?

As a candidate for this certification, you should have subject matter expertise in implementing, managing, and monitoring an organization's Microsoft Azure environment, including virtual networks, storage, compute, identity, security, and governance.

## Skills at a glance

| Domain | Weight | Challenges |
|--------|--------|------------|
| Manage Azure identities and governance | 20–25% | 01, 02, 03, 17, 18 |
| Implement and manage storage | 15–20% | 04, 05, 06, 19, 20 |
| Deploy and manage Azure compute resources | 20–25% | 07, 08, 09, 10, 21, 22, 23 |
| Implement and manage virtual networking | 15–20% | 11, 12, 13, 24, 25, 26 |
| Monitor and maintain Azure resources | 10–15% | 14, 15, 27, 28 |
| Cross-domain capstone | All | 16 |

:::tip Challenge Structure

Challenges 01-16 cover core exam topics. Challenges 17-28 are advanced deep dives added to each domain. Navigation follows the **exam domain order** (Identity → Storage → Compute → Networking → Monitor → Capstone), not the challenge number. Within each domain, basic challenges come first, then advanced ones.

:::

## How this site works

Each challenge follows a consistent format:

1. **Introduction** | Real-world scenario that frames the challenge
2. **Exam Skills Covered** | Exact bullets from the official study guide
3. **Description** | Your mission with step-by-step tasks
4. **Success Criteria** | Clear "done" definition
5. **Multi-Tool Tabs** | Azure CLI, PowerShell, and Portal instructions
6. **Hints** | Expandable hints if you get stuck
7. **Break & Fix** | Troubleshooting scenarios with deliberate misconfigurations
8. **Knowledge Check** | Exam-style questions to test yourself
9. **Cleanup** | Scripts to delete resources and avoid costs

## Prerequisites

- **Azure subscription** | [Azure Free Account](https://azure.microsoft.com/free/) ($200 credit for 30 days) or [Azure for Students](https://azure.microsoft.com/free/students/) ($100 credit, no credit card)
- **Familiarity with** | Operating systems, networking basics, servers, virtualization
- **Experience with** | Azure Portal, command-line tools (CLI or PowerShell)

:::tip One-Click Lab

No setup needed! [Open in GitHub Codespaces](https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1) and get Azure CLI, Bicep, and PowerShell ready in minutes. Free for 60h/month.

:::
## Study resources

| Resource | Link |
|----------|------|
| Official Study Guide | [AZ-104 Study Guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104) |
| Instructor-Led Course | [AZ-104T00 Course](https://learn.microsoft.com/en-us/training/courses/az-104t00) |
| Free Practice Assessment | [Practice Questions](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-104/practice/assessment?assessment-type=practice&assessmentId=21) |
| Exam Sandbox | [Try the exam interface](https://aka.ms/examdemo) |
| Schedule the Exam | [Pearson VUE](https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/) |

## Microsoft Learn paths

The official Microsoft Learn self-paced content for AZ-104:

| Learning Path | Modules |
|---------------|---------|
| [Prerequisites for Azure administrators](https://learn.microsoft.com/en-us/training/paths/az-104-administrator-prerequisites/) | 2 |
| [Manage identities and governance in Azure](https://learn.microsoft.com/en-us/training/paths/az-104-manage-identities-governance/) | 6 |
| [Configure and manage virtual networks](https://learn.microsoft.com/en-us/training/paths/az-104-manage-virtual-networks/) | 8 |
| [Implement and manage storage in Azure](https://learn.microsoft.com/en-us/training/paths/az-104-manage-storage/) | 4 |
| [Deploy and manage Azure compute resources](https://learn.microsoft.com/en-us/training/paths/az-104-manage-compute-resources/) | 5 |
| [Monitor and back up Azure resources](https://learn.microsoft.com/en-us/training/paths/az-104-monitor-backup-resources/) | 3 |

## Learning path

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 260" font-family="Segoe UI, Arial, sans-serif" style={{maxWidth: '680px', width: '100%'}}>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#666"/>
    </marker>
  </defs>

  {/* AZ-900 */}
  <rect x="20" y="100" width="150" height="60" rx="8" fill="#d5e8d4" stroke="#82b366" strokeWidth="2"/>
  <text x="95" y="125" textAnchor="middle" fontWeight="bold" fontSize="13" fill="#1b5e20">AZ-900</text>
  <text x="95" y="145" textAnchor="middle" fontSize="11" fill="#555">Fundamentals</text>

  {/* Arrow AZ-900 → AZ-104 */}
  <line x1="170" y1="130" x2="230" y2="130" stroke="#666" strokeWidth="1.5" markerEnd="url(#arrow)"/>

  {/* AZ-104 */}
  <rect x="235" y="100" width="150" height="60" rx="8" fill="#dae8fc" stroke="#6c8ebf" strokeWidth="2"/>
  <text x="310" y="125" textAnchor="middle" fontWeight="bold" fontSize="13" fill="#1a3a5c">AZ-104</text>
  <text x="310" y="145" textAnchor="middle" fontSize="11" fill="#555">Administrator</text>

  {/* Arrow AZ-104 → AZ-305 */}
  <line x1="385" y1="115" x2="490" y2="55" stroke="#666" strokeWidth="1.5" markerEnd="url(#arrow)"/>

  {/* Arrow AZ-104 → AZ-500 */}
  <line x1="385" y1="130" x2="490" y2="130" stroke="#666" strokeWidth="1.5" markerEnd="url(#arrow)"/>

  {/* Arrow AZ-104 → AZ-400 */}
  <line x1="385" y1="145" x2="490" y2="205" stroke="#666" strokeWidth="1.5" markerEnd="url(#arrow)"/>

  {/* AZ-305 */}
  <rect x="495" y="25" width="165" height="60" rx="8" fill="#e1d5e7" stroke="#9673a6" strokeWidth="2"/>
  <text x="577" y="50" textAnchor="middle" fontWeight="bold" fontSize="13" fill="#4a235a">AZ-305</text>
  <text x="577" y="70" textAnchor="middle" fontSize="11" fill="#555">Solutions Architect</text>

  {/* AZ-500 */}
  <rect x="495" y="100" width="165" height="60" rx="8" fill="#e1d5e7" stroke="#9673a6" strokeWidth="2"/>
  <text x="577" y="125" textAnchor="middle" fontWeight="bold" fontSize="13" fill="#4a235a">AZ-500</text>
  <text x="577" y="145" textAnchor="middle" fontSize="11" fill="#555">Security Engineer</text>

  {/* AZ-400 */}
  <rect x="495" y="175" width="165" height="60" rx="8" fill="#e1d5e7" stroke="#9673a6" strokeWidth="2"/>
  <text x="577" y="200" textAnchor="middle" fontWeight="bold" fontSize="13" fill="#4a235a">AZ-400</text>
  <text x="577" y="220" textAnchor="middle" fontSize="11" fill="#555">DevOps Engineer</text>
</svg>

---

## Sysadmin ↔ Azure

You already know the concepts. Here's how they translate to Azure.

| On-Prem / Sysadmin | Azure Equivalent | Description |
|---------------------|------------------|-------------|
| `Active Directory` | **Microsoft Entra ID** | Identity & access management |
| `Group Policy (GPO)` | **Azure Policy** | Compliance & governance |
| `File server (SMB)` | **Azure Files** | Managed file shares |
| `NAS / SAN` | **Azure Blob Storage** | Object & block storage |
| `Hyper-V / VMware` | **Azure Virtual Machines** | Compute workloads |
| `IIS / Apache` | **Azure App Service** | Web app hosting |
| `Docker host` | **Azure Container Apps** | Container workloads |
| `VLAN / Subnet` | **Azure VNet / Subnet** | Network isolation |
| `Firewall rules` | **NSG / Azure Firewall** | Traffic control |
| `DNS server` | **Azure DNS** | Name resolution |
| `F5 / HAProxy` | **Azure Load Balancer** | Traffic distribution |
| `Nagios / Zabbix` | **Azure Monitor** | Monitoring & alerts |
| `Veeam / SCDPM` | **Azure Backup** | Backup & recovery |
| `DR site` | **Azure Site Recovery** | Disaster recovery |

---

**Ready?** Start with the [Am I Ready?](/docs/az-104/self-assessment) self-assessment or jump straight to the [Lab Setup](/docs/az-104/lab-setup).
