# Azure Cert Prep

[![Deploy to GitHub Pages](https://github.com/azurecertprep/azurecertprep.github.io/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/azurecertprep/azurecertprep.github.io/actions/workflows/deploy.yml)
[![Validate Content](https://github.com/azurecertprep/azurecertprep.github.io/actions/workflows/validate.yml/badge.svg?branch=main)](https://github.com/azurecertprep/azurecertprep.github.io/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AZ-104](https://img.shields.io/badge/AZ--104-100%25%20Coverage-0078d4?logo=microsoftazure&logoColor=white)](https://azurecertprep.github.io/docs/az-104/coverage-matrix)
[![AZ-305](https://img.shields.io/badge/AZ--305-100%25%20Coverage-0078d4?logo=microsoftazure&logoColor=white)](https://azurecertprep.github.io/docs/az-305/coverage-matrix)
[![AZ-400](https://img.shields.io/badge/AZ--400-100%25%20Coverage-0078d4?logo=microsoftazure&logoColor=white)](https://azurecertprep.github.io/docs/az-400/coverage-matrix)
[![Open in GitHub Codespaces](https://img.shields.io/badge/Codespaces-Open%20Lab-181717?logo=github&logoColor=white)](https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1)

### Don't just study — build it.

Hands-on, challenge-based preparation for Microsoft Azure certification exams. Every skill from the official study guide covered with real Azure resources you create, configure, and troubleshoot.

**Website**: [azurecertprep.github.io](https://azurecertprep.github.io)

## One-Click Lab Environment

**No setup needed!** Click the button below to get a full Azure lab environment running in your browser:

[![Open in GitHub Codespaces](https://img.shields.io/badge/Open_in_GitHub_Codespaces-181717?style=for-the-badge&logo=github&logoColor=white)](https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1)

Your Codespace comes pre-configured with:
- **Azure CLI** (latest) with Bicep support
- **Azure PowerShell** (Az module)
- **AzCopy** — Bulk data transfer tool
- **jq** / **yq** — JSON/YAML processing

> GitHub Free accounts get **60 hours/month** of Codespaces — more than enough to complete all challenges.

## Supported Exams

| Exam | Title | Challenges | Status |
|------|-------|-----------|--------|
| **AZ-104** | Azure Administrator | 28 | Available |
| **AZ-305** | Solutions Architect Expert | 50 | Available |
| **AZ-400** | DevOps Engineer Expert | 51 | Available |
| SC-500 | Cloud and AI Security Engineer | — | Planned |

## AZ-104: Azure Administrator

28 challenges covering **100% of the exam domains** (as of April 2026):

| Domain | Weight | Challenges | Topics |
|--------|--------|-----------|--------|
| Identity & Governance | 20-25% | 01-03, 17-18 | Entra ID, RBAC, Azure Policy, budgets, Cost Management |
| Storage | 15-20% | 04-06, 19-20 | Storage accounts, Blob, Files, AzCopy, lifecycle, legal hold |
| Compute | 20-25% | 07-10, 21-23 | ARM/Bicep, VMs, VMSS, Containers, App Service, Automation |
| Networking | 15-20% | 11-13, 24-26 | VNets, NSGs, Bastion, DNS, Load Balancer, Network Watcher |
| Monitor & Maintain | 10-15% | 14-15, 27-28 | Azure Monitor, KQL, Backup, Site Recovery, Alerts |
| Capstone | All | 16 | Cross-domain troubleshooting scenario |

## AZ-305: Azure Solutions Architect Expert

50 challenges covering **100% of the exam domains** (as of April 2026):

| Domain | Weight | Challenges | Topics |
|--------|--------|-----------|--------|
| Identity, Governance & Monitoring | 20-25% | 01-13 | Entra ID, conditional access, governance, monitoring, logging |
| Business Continuity | 15-20% | 14-22 | High availability, backup, disaster recovery, data redundancy |
| Data Storage | 15-20% | 23-32 | SQL, Cosmos DB, data integration, storage strategies |
| Infrastructure | 25-30% | 33-50 | Compute, networking, containers, migrations, app architecture |

## AZ-400: DevOps Engineer Expert

51 challenges covering **100% of the exam domains** (as of April 2026):

| Domain | Weight | Challenges | Topics |
|--------|--------|-----------|--------|
| Processes & Communications | 10-15% | 01-06 | GitHub Flow, work tracking, DevOps metrics, collaboration |
| Source Control | 10-15% | 07-12 | Branching strategies, PR workflows, Git security, monorepos |
| Build & Release Pipelines | 50-55% | 13-38 | Packages, testing, YAML pipelines, deployment, IaC, operations |
| Security & Compliance | 10-15% | 39-45 | Secret scanning, SAST/DAST, container security, governance |
| Instrumentation | 5-10% | 46-50 | App Insights, monitoring, alerting, SRE practices |
| Capstone | All | 51 | End-to-end DevOps scenario |

**Estimated total cost: ~$5-10** (with cleanup after each challenge)

### Challenge Format

Each challenge includes:
- **Exam skills** mapped to official study guide
- **Real-world scenario** (Contoso Ltd.)
- **Hands-on tasks** with Azure CLI, PowerShell, and Portal instructions
- **Interactive success criteria** — click to check off as you complete
- **Expandable hints** — try first, peek if stuck
- **Break & Fix** — troubleshooting scenarios with deliberate misconfigurations
- **Knowledge check** — exam-style questions
- **Cleanup script** — delete resources, avoid costs

### Features

- Multi-tool tabs (Azure CLI / PowerShell / Portal)
- Interactive decision matrix tables
- Interactive self-assessment checklist
- Progress tracking with localStorage
- Deep validation labs (real-world troubleshooting scenarios)
- Bilingual content (English + Brazilian Portuguese)
- GitHub Codespaces lab environment
- Coach/instructor guide with full solutions

## Prerequisites

- **Azure subscription** — [Azure Free Account](https://azure.microsoft.com/free/) ($200 credit) or [Azure for Students](https://azure.microsoft.com/free/students/) ($100 credit, no credit card)
- **Basic IT knowledge** — networking, command line, virtualization concepts
- **No prior Azure experience required** — but helpful. See our [self-assessment](https://azurecertprep.github.io/docs/az-104/self-assessment)

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm start

# Build for production
npm run build

# Serve production build locally
npm run serve
```

## Contributing

Contributions are welcome! Please:

1. Create an issue or start a [Discussion](https://github.com/azurecertprep/azurecertprep.github.io/discussions) describing the bug or improvement
2. Fork the repository and create a topic branch
3. Make changes, testing all commands
4. Submit a PR

## Related Projects

| Project | Description |
|---------|-------------|
| [Kubernetes Hackathon](https://k8shackathon.com/) | 20 hands-on Kubernetes challenges |
| [Linux FUNdamentals Hackathon](https://linuxhackathon.com/) | Master Linux basics through challenges |
| [AKS Learning](https://aks-learning.github.io/) | From zero to production on AKS |
| [From Server to Cluster](https://fromservertocluster.com/) | The book for Linux professionals moving to containers |
| [AI for Infrastructure](https://ai4infra.com/) | AI-powered infrastructure automation |
| [Azure Governance](https://azgovernance.com/) | Azure governance best practices |
| [AZ-900 Study Guide](https://github.com/ricmmartins/study-guide-az900) | Free study guide for Azure Fundamentals |

## Portuguese Content

This project is also available in **Brazilian Portuguese**! Use the language switcher on the website or check the [`i18n/pt-br`](https://github.com/azurecertprep/azurecertprep.github.io/tree/main/i18n/pt-br) directory.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

**Disclaimer:** This is an independent, personal project — not an official Microsoft publication. The views and content are solely the author's own. Microsoft, Azure, and related trademarks are property of Microsoft Corporation.

Created by **[Ricardo Martins](https://rmmartins.com)**
