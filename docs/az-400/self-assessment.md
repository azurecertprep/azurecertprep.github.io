---
sidebar_position: 2
title: "Am I ready?"
---

import SelfAssessment from '@site/src/components/SelfAssessment';

# Am I ready for the AZ-400?

Before diving into the challenges, assess your readiness. The AZ-400 assumes you already have experience administering or developing in Azure, plus familiarity with at least one CI/CD platform.

## Self-assessment checklist

Click each row to cycle through: ✅ Comfortable | ⚠️ Need Review | ❌ New to Me

### Prerequisites

<SelfAssessment
  storageKey="az400-prereqs"
  skills={[
    "I have experience with Azure administration (AZ-104 level) or Azure development (AZ-204 level)",
    "I am comfortable with the command line (Bash, PowerShell)",
    "I understand YAML syntax and can read/write YAML files",
    "I have used Git for version control (commit, branch, merge, PR)",
    "I understand basic networking (HTTP, DNS, load balancers, TLS)",
    "I have deployed at least one application to Azure (App Service, ACA, or VMs)",
  ]}
/>

### Domain 1: Processes and communications (10-15%)

<SelfAssessment
  storageKey="az400-domain1"
  skills={[
    "I can design a GitHub Flow branching workflow for a team",
    "I can configure GitHub Projects or Azure Boards for sprint tracking",
    "I can set up integration between Azure Boards and GitHub repos",
    "I can explain DORA metrics (deployment frequency, lead time, MTTR, change failure rate)",
    "I can configure webhooks and Teams notifications for pipeline events",
    "I can create project documentation using wikis and Mermaid diagrams",
  ]}
/>

### Domain 2: Source control strategy (10-15%)

<SelfAssessment
  storageKey="az400-domain2"
  skills={[
    "I can explain trunk-based vs feature branch vs release branch strategies",
    "I can configure branch protection rules and policies",
    "I can set up a PR workflow with required reviewers, status checks, and merge restrictions",
    "I can configure Git LFS for large binary files",
    "I can recover deleted branches and use git reflog",
    "I can remove sensitive data from git history using filter-repo",
    "I can explain when to use mono-repo vs multi-repo",
  ]}
/>

### Domain 3: Build and release pipelines (50-55%)

#### Package management

<SelfAssessment
  storageKey="az400-packages"
  skills={[
    "I can publish packages to GitHub Packages and Azure Artifacts",
    "I can configure upstream sources and feed views (prerelease, release)",
    "I can implement SemVer and explain when to use CalVer",
  ]}
/>

#### Testing

<SelfAssessment
  storageKey="az400-testing"
  skills={[
    "I can configure unit tests, integration tests, and load tests in a pipeline",
    "I can implement quality gates that block deployments on test failure",
    "I can configure code coverage thresholds and reporting",
  ]}
/>

#### Pipeline fundamentals

<SelfAssessment
  storageKey="az400-pipelines"
  skills={[
    "I can write a multi-stage GitHub Actions workflow from scratch",
    "I can write a multi-stage Azure Pipelines YAML file from scratch",
    "I can configure self-hosted runners/agents",
    "I can implement pipeline triggers (push, PR, schedule, manual)",
    "I can create reusable workflow templates and composite actions",
    "I can configure environments with protection rules and approvals",
  ]}
/>

#### Deployments

<SelfAssessment
  storageKey="az400-deployments"
  skills={[
    "I can implement blue-green deployments with slot swaps",
    "I can configure canary and ring-based progressive deployments",
    "I can implement feature flags using Azure App Configuration",
    "I can deploy containerized apps to ACR + ACA/AKS via pipeline",
    "I can automate database schema migrations in a deployment pipeline",
  ]}
/>

#### Infrastructure as Code

<SelfAssessment
  storageKey="az400-iac"
  skills={[
    "I can implement IaC with Bicep or Terraform in a CI/CD pipeline",
    "I can configure Azure Machine Configuration for desired state",
    "I can set up Azure Deployment Environments for self-service",
  ]}
/>

#### Pipeline operations

<SelfAssessment
  storageKey="az400-operations"
  skills={[
    "I can monitor pipeline health (failure rate, duration, flaky tests)",
    "I can optimize pipelines for cost and performance (caching, parallelism)",
    "I can migrate Azure Pipelines from classic editor to YAML",
  ]}
/>

### Domain 4: Security and compliance (10-15%)

<SelfAssessment
  storageKey="az400-security"
  skills={[
    "I can choose between service principals, managed identities, and workload identity federation",
    "I can configure GitHub Apps and explain when to use GITHUB_TOKEN vs PAT",
    "I can set up Azure DevOps service connections with federated credentials",
    "I can integrate Azure Key Vault with pipelines for secrets management",
    "I can configure secretless authentication (OIDC/workload identity)",
    "I can enable and configure GitHub Advanced Security (CodeQL, Dependabot, secret scanning)",
    "I can configure Microsoft Defender for Cloud DevOps Security",
  ]}
/>

### Domain 5: Instrumentation (5-10%)

<SelfAssessment
  storageKey="az400-instrumentation"
  skills={[
    "I can configure Azure Monitor and Application Insights for a deployed app",
    "I can set up deployment annotations in Application Insights",
    "I can write basic KQL queries to analyze logs",
    "I can configure GitHub Actions workflow alerts and insights",
    "I can correlate deployment events with performance metrics",
  ]}
/>

## Scoring guide

| Your results | Recommendation |
|--------------|---------------|
| Mostly ✅ | Ready to schedule the exam |
| Mix of ✅ and ⚠️ | Review weak areas using the relevant challenges, then schedule |
| Several ⚠️ and ❌ | Complete all challenges in your weak domains first |
| Mostly ❌ | Start with the Microsoft Learn paths, then come back |

:::tip Exam readiness

Unlike AZ-104/AZ-305, the AZ-400 exam heavily tests **YAML syntax** and **platform-specific configuration**. Make sure you can write pipeline YAML from memory, not just recognize it.

:::
