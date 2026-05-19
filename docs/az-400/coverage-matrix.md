---
sidebar_position: 99
title: "Coverage matrix"
---

# AZ-400 skills coverage matrix

This matrix maps every official exam skill to a specific challenge. Use it to verify you've practiced all testable skills.

## Domain 1: Design and implement processes and communications (10-15%)

### Design and implement traceability and flow of work

| Skill | Challenge | Status |
|-------|-----------|--------|
| Design and implement a structure for the flow of work, including GitHub Flow | [Challenge 01](./01-processes-communications/challenge-01.md) | Covered |
| Design and implement a strategy for feedback cycles, including notifications and GitHub issues | [Challenge 02](./01-processes-communications/challenge-02.md) | Covered |
| Design and implement integration for tracking work, including GitHub projects, Azure Boards, and repositories | [Challenge 02](./01-processes-communications/challenge-02.md) | Covered |
| Design and implement source, bug, and quality traceability | [Challenge 03](./01-processes-communications/challenge-03.md) | Covered |

### Design and implement appropriate metrics and queries for DevOps

| Skill | Challenge | Status |
|-------|-----------|--------|
| Design and implement a dashboard, including flow of work (cycle times, time to recovery, lead time) | [Challenge 04](./01-processes-communications/challenge-04.md) | Covered |
| Design and implement appropriate metrics and queries for project planning | [Challenge 04](./01-processes-communications/challenge-04.md) | Covered |
| Design and implement appropriate metrics and queries for development | [Challenge 04](./01-processes-communications/challenge-04.md) | Covered |
| Design and implement appropriate metrics and queries for testing | [Challenge 04](./01-processes-communications/challenge-04.md) | Covered |
| Design and implement appropriate metrics and queries for security | [Challenge 04](./01-processes-communications/challenge-04.md) | Covered |
| Design and implement appropriate metrics and queries for delivery | [Challenge 04](./01-processes-communications/challenge-04.md) | Covered |
| Design and implement appropriate metrics and queries for operations | [Challenge 04](./01-processes-communications/challenge-04.md) | Covered |

### Configure collaboration and communication

| Skill | Challenge | Status |
|-------|-----------|--------|
| Document a project by configuring wikis and process diagrams, including Markdown and Mermaid syntax | [Challenge 05](./01-processes-communications/challenge-05.md) | Covered |
| Configure release documentation, including release notes and API documentation | [Challenge 05](./01-processes-communications/challenge-05.md) | Covered |
| Automate creation of documentation from Git history | [Challenge 05](./01-processes-communications/challenge-05.md) | Covered |
| Configure integration by using webhooks | [Challenge 06](./01-processes-communications/challenge-06.md) | Covered |
| Configure integration between Azure Boards and GitHub repositories | [Challenge 06](./01-processes-communications/challenge-06.md) | Covered |
| Configure integration between GitHub or Azure DevOps and Microsoft Teams | [Challenge 06](./01-processes-communications/challenge-06.md) | Covered |

## Domain 2: Design and implement a source control strategy (10-15%)

### Design and implement branching strategies for the source code

| Skill | Challenge | Status |
|-------|-----------|--------|
| Design a branch strategy, including trunk-based, feature branch, and release branch | [Challenge 07](./02-source-control/challenge-07.md) | Covered |
| Design and implement a pull request workflow by using branch policies and branch protection rules | [Challenge 08](./02-source-control/challenge-08.md) | Covered |
| Implement branch merging restrictions by using branch policies and branch protection rules | [Challenge 08](./02-source-control/challenge-08.md) | Covered |

### Configure and manage repositories

| Skill | Challenge | Status |
|-------|-----------|--------|
| Design and implement a strategy for managing large files, including Git LFS and git-fat | [Challenge 10](./02-source-control/challenge-10.md) | Covered |
| Design a strategy for scaling and optimizing a Git repository, including Scalar and cross-repository sharing | [Challenge 12](./02-source-control/challenge-12.md) | Covered |
| Configure permissions in the source control repository | [Challenge 09](./02-source-control/challenge-09.md) | Covered |
| Configure tags to organize the source control repository | [Challenge 09](./02-source-control/challenge-09.md) | Covered |
| Recover specific data by using Git commands | [Challenge 11](./02-source-control/challenge-11.md) | Covered |
| Remove specific data from source control | [Challenge 11](./02-source-control/challenge-11.md) | Covered |

## Domain 3: Design and implement build and release pipelines (50-55%)

### Design and implement a package management strategy

| Skill | Challenge | Status |
|-------|-----------|--------|
| Recommend package management tools including GitHub Packages and Azure Artifacts | [Challenge 13](./03a-package-management/challenge-13.md) | Covered |
| Design and implement package feeds and views for local and upstream packages | [Challenge 13](./03a-package-management/challenge-13.md) | Covered |
| Design and implement a dependency versioning strategy (SemVer and CalVer) | [Challenge 14](./03a-package-management/challenge-14.md) | Covered |
| Design and implement a versioning strategy for pipeline artifacts | [Challenge 14](./03a-package-management/challenge-14.md) | Covered |

### Design and implement a testing strategy for pipelines

| Skill | Challenge | Status |
|-------|-----------|--------|
| Design and implement quality and release gates, including security and governance | [Challenge 17](./03b-testing-pipelines/challenge-17.md) | Covered |
| Design a comprehensive testing strategy (local, unit, integration, load tests) | [Challenge 16](./03b-testing-pipelines/challenge-16.md) | Covered |
| Implement tests in a pipeline, including configuring test tasks and test agents | [Challenge 16](./03b-testing-pipelines/challenge-16.md) | Covered |
| Implement code coverage analysis | [Challenge 18](./03b-testing-pipelines/challenge-18.md) | Covered |

### Design and implement pipelines

| Skill | Challenge | Status |
|-------|-----------|--------|
| Select a deployment automation solution (GitHub Actions and Azure Pipelines) | [Challenge 19](./03c-pipeline-fundamentals/challenge-19.md), [Challenge 20](./03c-pipeline-fundamentals/challenge-20.md) | Covered |
| Design and implement runner/agent infrastructure (cost, connectivity, maintainability) | [Challenge 21](./03c-pipeline-fundamentals/challenge-21.md) | Covered |
| Design and implement integration between GitHub repositories and Azure Pipelines | [Challenge 20](./03c-pipeline-fundamentals/challenge-20.md) | Covered |
| Develop and implement pipeline trigger rules | [Challenge 22](./03c-pipeline-fundamentals/challenge-22.md) | Covered |
| Develop pipelines by using YAML | [Challenge 19](./03c-pipeline-fundamentals/challenge-19.md), [Challenge 20](./03c-pipeline-fundamentals/challenge-20.md) | Covered |
| Design and implement a strategy for job execution order (parallelism, multi-stage) | [Challenge 22](./03c-pipeline-fundamentals/challenge-22.md) | Covered |
| Develop complex pipeline scenarios (hybrid pipelines, VM templates, self-hosted runners) | [Challenge 21](./03c-pipeline-fundamentals/challenge-21.md) | Covered |
| Create reusable pipeline elements (YAML templates, task groups, variables, variable groups) | [Challenge 23](./03c-pipeline-fundamentals/challenge-23.md) | Covered |
| Design and implement checks and approvals by using YAML-based environments | [Challenge 24](./03c-pipeline-fundamentals/challenge-24.md) | Covered |

### Design and implement deployments

| Skill | Challenge | Status |
|-------|-----------|--------|
| Design a deployment strategy (blue-green, canary, ring, progressive exposure, feature flags, A/B) | [Challenge 25](./03d-deployment-strategies/challenge-25.md) | Covered |
| Design a pipeline to ensure dependency deployments are reliably ordered | [Challenge 30](./03d-deployment-strategies/challenge-30.md) | Covered |
| Plan for minimizing downtime (load balancing, rolling deployments, slot swaps) | [Challenge 26](./03d-deployment-strategies/challenge-26.md) | Covered |
| Design a hotfix path plan for high-priority code fixes | [Challenge 30](./03d-deployment-strategies/challenge-30.md) | Covered |
| Design and implement a resiliency strategy for deployment | [Challenge 30](./03d-deployment-strategies/challenge-30.md) | Covered |
| Implement feature flags by using Azure App Configuration Feature Manager | [Challenge 27](./03d-deployment-strategies/challenge-27.md) | Covered |
| Implement application deployment by using containers, binaries, and scripts | [Challenge 28](./03d-deployment-strategies/challenge-28.md) | Covered |
| Implement a deployment that includes database tasks | [Challenge 29](./03d-deployment-strategies/challenge-29.md) | Covered |

### Design and implement infrastructure as code (IaC)

| Skill | Challenge | Status |
|-------|-----------|--------|
| Recommend a configuration management technology for application infrastructure | [Challenge 31](./03e-infrastructure-as-code/challenge-31.md) | Covered |
| Implement a configuration management strategy for application infrastructure | [Challenge 31](./03e-infrastructure-as-code/challenge-31.md) | Covered |
| Define an IaC strategy, including source control and automation of testing and deployment | [Challenge 31](./03e-infrastructure-as-code/challenge-31.md) | Covered |
| Design and implement desired state configuration (Azure Automation, Bicep, Machine Configuration) | [Challenge 32](./03e-infrastructure-as-code/challenge-32.md) | Covered |
| Design and implement Azure Deployment Environments for on-demand self-deployment | [Challenge 33](./03e-infrastructure-as-code/challenge-33.md) | Covered |

### Maintain pipelines

| Skill | Challenge | Status |
|-------|-----------|--------|
| Monitor pipeline health (failure rate, duration, flaky tests) | [Challenge 34](./03f-pipeline-operations/challenge-34.md) | Covered |
| Optimize a pipeline for cost, time, performance, and reliability | [Challenge 35](./03f-pipeline-operations/challenge-35.md) | Covered |
| Optimize pipeline concurrency for performance and cost | [Challenge 35](./03f-pipeline-operations/challenge-35.md) | Covered |
| Design and implement a retention strategy for pipeline artifacts and dependencies | [Challenge 36](./03f-pipeline-operations/challenge-36.md) | Covered |
| Migrate a pipeline from classic to YAML in Azure Pipelines | [Challenge 37](./03f-pipeline-operations/challenge-37.md) | Covered |

## Domain 4: Develop a security and compliance plan (10-15%)

### Design and implement authentication and authorization methods

| Skill | Challenge | Status |
|-------|-----------|--------|
| Choose between service principals and managed identities (system/user-assigned) | [Challenge 39](./04-security-compliance/challenge-39.md) | Covered |
| Implement and manage GitHub authentication (GitHub Apps, GITHUB_TOKEN, PATs) | [Challenge 40](./04-security-compliance/challenge-40.md) | Covered |
| Implement and manage Azure DevOps service connections and PATs | [Challenge 41](./04-security-compliance/challenge-41.md) | Covered |
| Design and implement permissions and roles in GitHub | [Challenge 40](./04-security-compliance/challenge-40.md) | Covered |
| Design and implement permissions and security groups in Azure DevOps | [Challenge 41](./04-security-compliance/challenge-41.md) | Covered |
| Recommend appropriate access levels (stakeholder in ADO, outside collaborator in GitHub) | [Challenge 41](./04-security-compliance/challenge-41.md) | Covered |
| Configure projects and teams in Azure DevOps | [Challenge 41](./04-security-compliance/challenge-41.md) | Covered |

### Design and implement a strategy for managing sensitive information in automation

| Skill | Challenge | Status |
|-------|-----------|--------|
| Implement and manage secrets, keys, and certificates by using Azure Key Vault | [Challenge 42](./04-security-compliance/challenge-42.md) | Covered |
| Implement secretless authentication (workload identity federation/OIDC) | [Challenge 42](./04-security-compliance/challenge-42.md) | Covered |
| Design and implement a strategy for managing sensitive files during deployment | [Challenge 43](./04-security-compliance/challenge-43.md) | Covered |
| Design pipelines to prevent leakage of sensitive information | [Challenge 43](./04-security-compliance/challenge-43.md) | Covered |

### Automate security and compliance scanning

| Skill | Challenge | Status |
|-------|-----------|--------|
| Design a strategy for security and compliance scanning (dependency, code, secret, licensing) | [Challenge 44](./04-security-compliance/challenge-44.md) | Covered |
| Configure Microsoft Defender for Cloud DevOps Security | [Challenge 45](./04-security-compliance/challenge-45.md) | Covered |
| Configure GitHub Advanced Security for GitHub and Azure DevOps | [Challenge 44](./04-security-compliance/challenge-44.md) | Covered |
| Integrate GitHub Advanced Security with Microsoft Defender for Cloud | [Challenge 45](./04-security-compliance/challenge-45.md) | Covered |
| Automate container scanning (container images, CodeQL in containers) | [Challenge 44](./04-security-compliance/challenge-44.md) | Covered |
| Automate analysis of licensing, vulnerabilities, and versioning (Dependabot alerts) | [Challenge 44](./04-security-compliance/challenge-44.md) | Covered |

## Domain 5: Implement an instrumentation strategy (5-10%)

### Configure monitoring for a DevOps environment

| Skill | Challenge | Status |
|-------|-----------|--------|
| Configure Azure Monitor and Azure Monitor Logs to integrate with DevOps tools | [Challenge 46](./05-instrumentation/challenge-46.md) | Covered |
| Configure collection of telemetry (Application Insights, VM Insights, Container Insights) | [Challenge 47](./05-instrumentation/challenge-47.md) | Covered |
| Configure monitoring in GitHub (insights, charts) | [Challenge 48](./05-instrumentation/challenge-48.md) | Covered |
| Configure alerts for events in GitHub Actions and Azure Pipelines | [Challenge 48](./05-instrumentation/challenge-48.md) | Covered |

### Analyze metrics from instrumentation

| Skill | Challenge | Status |
|-------|-----------|--------|
| Inspect infrastructure performance indicators (CPU, memory, disk, network) | [Challenge 47](./05-instrumentation/challenge-47.md) | Covered |
| Analyze metrics by using collected telemetry (usage, application performance) | [Challenge 50](./05-instrumentation/challenge-50.md) | Covered |
| Inspect distributed tracing by using Application Insights | [Challenge 50](./05-instrumentation/challenge-50.md) | Covered |
| Interrogate logs using basic KQL queries | [Challenge 49](./05-instrumentation/challenge-49.md) | Covered |

---

**Total skills covered: 67/67 (100%)**
