---
sidebar_position: 11
title: "Challenge 44: Design a Migration Strategy Using CAF"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 44: Design a Migration Strategy Using CAF

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $0-2 | **Exam Weight: 30-35%**

:::

## Introduction

Precision Manufacturing is a mid-size manufacturing company operating 200 servers across 2 on-premises data centers (primary in Chicago, DR in Dallas). Their data center lease in Chicago expires in 18 months, and the Dallas facility lease expires 6 months later. The CEO has committed to migrating entirely to Azure rather than renewing the leases, projecting a 30% cost reduction over 3 years.

The current environment includes: 80 Windows Server VMs (running IIS web applications on .NET Framework 4.x, file servers, Active Directory domain controllers), 50 Linux VMs (Apache/Nginx web servers, custom Python applications, Jenkins build servers), 30 SQL Server instances (versions ranging from 2012 to 2022, some with cross-database queries), and 40 legacy applications with undocumented dependencies. Some applications have compliance requirements (SOX for financial systems, FDA 21 CFR Part 11 for quality management).

The IT team has limited cloud experience (2 engineers with AZ-104 certification) and the organization has no existing Azure landing zone. They need a structured migration plan using the Microsoft Cloud Adoption Framework that addresses organizational readiness, technical planning, and phased execution.

## Exam Skills Covered

- Evaluate a migration solution that leverages the Microsoft Cloud Adoption Framework for Azure

## Design Tasks

### Part 1: CAF Strategy and Planning Phase

1. Apply the CAF Strategy methodology: define business motivations (data center exit, cost reduction, modernization), business outcomes (measurable KPIs), and financial justification for the migration.
2. Create a rationalization plan using the 5 Rs for a representative sample of workloads:
   - Active Directory domain controllers (Rehost? Rearchitect to Entra ID?)
   - .NET Framework 4.x IIS applications (Rehost to VMs? Refactor to App Service?)
   - SQL Server 2012 instances (Rehost to SQL on VM? Refactor to Azure SQL MI?)
   - Jenkins build servers (Rehost? Replace with Azure DevOps/GitHub Actions?)
   - File servers (Rehost? Replace with Azure Files/SharePoint?)
3. Design a migration wave plan that groups workloads into 4-6 waves based on: dependency mapping, business criticality, technical complexity, and compliance requirements. Document which workloads go in each wave and why.

### Part 2: CAF Ready Phase - Landing Zone Design

4. Design an Azure landing zone using the CAF enterprise-scale architecture. Document:
   - Management group hierarchy (root, platform, workloads, sandbox)
   - Subscription strategy (single vs. multiple subscriptions per environment)
   - Networking topology (hub-spoke with hub in each region)
   - Identity integration (hybrid identity with Entra Connect)
5. Define governance guardrails for the landing zone using Azure Policy:
   - Allowed regions (compliance requirement)
   - Required tags (cost center, environment, owner)
   - Denied resource types (prevent unmanaged resources)
   - Security baselines (encryption, network restrictions)
6. Design the shared services infrastructure that must be deployed before any workload migration: VPN/ExpressRoute connectivity, DNS resolution, monitoring (Log Analytics), security (Microsoft Defender for Cloud).

### Part 3: CAF Adopt Phase - Migration Execution

7. Design the assessment process using Azure Migrate:
   - Discovery and inventory (agentless vs. agent-based)
   - Dependency mapping (30-day data collection)
   - Performance-based sizing recommendations
   - Cost estimation for Azure targets
8. Create a migration timeline that fits within the 18-month lease deadline, accounting for:
   - Landing zone setup (months 1-3)
   - Wave 1 pilot migration (months 3-5)
   - Waves 2-4 bulk migration (months 5-14)
   - Wave 5 complex/legacy applications (months 14-17)
   - Decommissioning and lease exit (month 18)
9. Design a testing and validation strategy for each migration wave: pre-migration testing, migration execution, post-migration validation, performance benchmarking, and user acceptance testing.

### Part 4: CAF Govern and Manage Phase

10. Design the ongoing governance model: who approves new Azure resource deployments, how cost is allocated back to business units, how compliance is continuously monitored.
11. Create a risk register for the migration identifying top 5 risks (e.g., undiscovered dependencies, performance degradation, extended downtime) with mitigation strategies for each.
12. Define success metrics for each CAF phase: Strategy (business case approved), Plan (assessment complete), Ready (landing zone deployed), Adopt (workloads migrated with SLA met), Govern (policies enforced), Manage (operations running).

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-44"
  items={[
    "5 Rs rationalization applied to at least 5 distinct workload types with justified target state",
    "Migration wave plan groups 200 servers into 4-6 waves with dependency-based sequencing",
    "Landing zone design covers management groups, subscriptions, networking, identity, and governance policies",
    "Migration timeline fits within 18-month lease deadline with buffer for contingencies",
    "Risk register identifies top 5 migration risks with quantified impact and mitigation plans",
    "Success metrics defined for each CAF phase with measurable KPIs"
  ]}
/>

## Hints

<details>
<summary>Hint 1: The 5 Rs of Rationalization</summary>

The 5 Rs framework helps determine the migration approach for each workload: **Rehost** (lift-and-shift to IaaS with minimal changes), **Refactor** (minor modifications to use PaaS features), **Rearchitect** (significant code changes to adopt cloud-native patterns), **Rebuild** (rewrite from scratch when current architecture is too constraining), **Replace** (switch to a SaaS solution like Microsoft 365 or Dynamics 365). Start with "assumed rehost" for initial planning, then refine as you assess each workload.

</details>

<details>
<summary>Hint 2: Landing Zone Accelerators</summary>

Microsoft provides landing zone accelerators (formerly enterprise-scale reference implementations) as IaC templates. The CAF enterprise-scale architecture includes: management group hierarchy, hub-spoke networking, centralized logging, policy-driven governance, and identity integration. Start with the accelerator and customize rather than building from scratch. This significantly reduces the "Ready" phase timeline.

</details>

<details>
<summary>Hint 3: Migration Wave Sequencing</summary>

Sequence waves by dependency and risk: Wave 1 should be low-risk, well-understood workloads to build team confidence and validate the landing zone. Middle waves handle the bulk of standard workloads. Final waves tackle complex workloads with difficult dependencies. Never put domain controllers or DNS in the first wave. Consider "dependency gravity" - if 20 servers depend on a shared database, the database must migrate in the same wave or earlier.

</details>

<details>
<summary>Hint 4: Azure Migrate Assessment Types</summary>

Azure Migrate offers different assessment types: **Azure VM assessment** (right-sizing for IaaS), **Azure SQL assessment** (compatibility with Azure SQL DB, MI, or SQL on VM), **Azure App Service assessment** (compatibility for web app migration), and **Azure VMware Solution assessment** (for VMware workloads). Run multiple assessment types for workloads that could target either IaaS or PaaS to compare cost and feature trade-offs.

</details>

<details>
<summary>Hint 5: Compliance Considerations in Migration</summary>

SOX and FDA 21 CFR Part 11 compliance require: audit trails (Azure Activity Log, diagnostic logs), access controls (RBAC, Conditional Access), change management (documented migration procedures), data integrity validation (hash comparison pre/post migration), and continuous compliance monitoring (Microsoft Defender for Cloud regulatory compliance dashboard). These workloads may need dedicated subscriptions or resource groups with stricter policies.

</details>

## Learning Resources

- [Microsoft Cloud Adoption Framework overview](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/overview)
- [CAF migration methodology](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/migrate/)
- [Azure landing zone overview](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/)
- [Five Rs of rationalization](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/digital-estate/5-rs-of-rationalization)
- [Azure Migrate overview](https://learn.microsoft.com/en-us/azure/migrate/migrate-services-overview)
- [CAF enterprise-scale landing zone](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/enterprise-scale/architecture)

## Knowledge Check

<details>
<summary>1. A company has 200 servers to migrate with an 18-month deadline. The migration team wants to assess all servers before migrating any. What CAF principle does this violate and what is the recommended approach?</summary>

**This violates the "iterate and learn" principle and risks analysis paralysis.** CAF recommends an incremental approach: assess a pilot wave (10-20 servers), migrate them to validate the landing zone and processes, then apply lessons learned to subsequent waves. Attempting to fully assess all 200 servers before migrating any consumes months of the timeline without delivering business value. Use "assumed rationalization" (assume rehost) for initial planning and refine assessments wave-by-wave.

</details>

<details>
<summary>2. During dependency mapping, you discover that 15 applications all connect to a single SQL Server 2012 instance using cross-database queries. What migration constraint does this create?</summary>

**Cross-database queries prevent migrating to Azure SQL Database (single database).** Azure SQL Database does not support cross-database queries within the same server (each database is isolated). Options: (1) Migrate to Azure SQL Managed Instance which supports cross-database queries within the same instance, (2) Rehost on SQL Server in an Azure VM, (3) Refactor applications to eliminate cross-database dependencies (longest timeline). All 15 applications and the SQL Server must be in the same migration wave since they cannot function independently.

</details>

<details>
<summary>3. The migration team deploys the landing zone and migrates Wave 1 successfully. During Wave 2, they discover that the hub VNet address space is too small to accommodate all planned subnets. What CAF phase should have prevented this?</summary>

**The Ready phase (landing zone design).** The landing zone should have been sized based on the full digital estate assessment from the Plan phase. IP address planning should account for all workloads across all waves, not just the immediate needs. This highlights the importance of the Plan-to-Ready handoff: the digital estate assessment informs network sizing, subscription strategy, and resource capacity planning. CAF recommends designing the landing zone for the target state, not just the first wave.

</details>

<details>
<summary>4. A financial application subject to SOX compliance needs to migrate. The compliance team insists on a parallel-run period where both on-premises and Azure instances run simultaneously with data comparison. Which migration approach supports this?</summary>

**Online migration with validation period.** Use Azure Migrate with continuous replication (for VMs) or Azure Database Migration Service online mode (for databases) to replicate changes in near-real-time. Both environments run simultaneously, allowing the compliance team to compare outputs and validate data integrity. Only after successful validation (typically 2-4 weeks for regulated workloads) do you cut over. This approach satisfies SOX change management requirements by providing a documented validation period with rollback capability.

</details>

## Cleanup

```bash
# This challenge is primarily design-focused
# If you deployed any Azure resources for exploration:
az group delete --name rg-az305-challenge44 --yes --no-wait
```

---

**Next**: [Challenge 45: Design Server and Application Migration](/docs/az-305/infrastructure/challenge-45)
