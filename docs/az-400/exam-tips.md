---
sidebar_position: 4
title: "Exam tips and strategy"
---

# AZ-400 exam tips and strategy

## Exam format

- **40-60 questions** (multiple choice, drag-and-drop, case studies, labs)
- **~120 minutes** (some candidates report getting 150 min)
- **Passing score**: 700/1000
- Questions come from all 5 domains, but ~50% will be from Domain 3 (pipelines)
- Lab questions may require you to perform tasks in Azure DevOps or Azure Portal

## Top strategies

### 1. Know YAML syntax cold

The exam will show you pipeline YAML and ask you to:
- Identify errors
- Choose the correct trigger/stage/job configuration
- Complete missing sections

You need to write YAML from memory, not just recognize it.

### 2. Think dual-platform

Every concept has two implementations:
- GitHub Actions ↔ Azure Pipelines
- GitHub Packages ↔ Azure Artifacts
- GitHub Advanced Security ↔ Azure DevOps extensions
- GitHub Projects ↔ Azure Boards

The exam tests whether you know **both** and when to choose each.

### 3. Security is a common fail area

Candidates often lose points on:
- Workload identity federation vs service principals vs managed identities
- When to use GITHUB_TOKEN vs PAT vs GitHub App
- Secretless authentication patterns (OIDC)
- Pipeline permissions and least-privilege

### 4. DORA metrics appear frequently

Know the four key metrics:
- **Deployment frequency** — How often you deploy to production
- **Lead time for changes** — Time from commit to production
- **Mean time to recovery (MTTR)** — Time to restore service after incident
- **Change failure rate** — % of deployments causing failures

### 5. Deployment strategies matter

Be able to explain trade-offs between:
- Blue-green (instant rollback, double infrastructure cost)
- Canary (gradual, requires traffic splitting)
- Ring-based (progressive exposure by audience)
- Feature flags (code-level, independent of deployment)

## YAML gotchas reference

### GitHub Actions common errors

```yaml
# WRONG: trigger syntax
on:
  push:
    branch: main        # Should be "branches: [main]"

# WRONG: missing "uses" prefix
steps:
  - checkout@v4        # Should be "uses: actions/checkout@v4"

# WRONG: env vs secrets
env:
  TOKEN: ${{ secrets.MY_TOKEN }}   # Correct for secrets
  TOKEN: ${{ env.MY_TOKEN }}       # This reads environment variable, not secret

# WRONG: job dependency
jobs:
  deploy:
    needs: [build]     # Correct
    need: build        # Wrong key name
```

### Azure Pipelines common errors

```yaml
# WRONG: stage vs stages
stage:                 # Should be "stages:"
  - stage: Build

# WRONG: pool syntax
pool: ubuntu-latest    # Should be "pool: { vmImage: 'ubuntu-latest' }"

# WRONG: variable reference
variables:
  myVar: 'hello'
steps:
  - script: echo $myVar          # Linux only
  - script: echo $(myVar)        # Correct for Azure Pipelines
  - script: echo ${{ variables.myVar }}  # Compile-time expression

# WRONG: template reference
template: templates/build.yml    # Should be under "extends:" or in "steps:"
```

### Key differences to memorize

| Concept | GitHub Actions | Azure Pipelines |
|---------|---------------|-----------------|
| CI file location | `.github/workflows/*.yml` | Root or specified path |
| Trigger keyword | `on:` | `trigger:` / `pr:` |
| Job runner | `runs-on:` | `pool:` |
| Steps | `uses:` / `run:` | `task:` / `script:` |
| Secrets access | `${{ secrets.NAME }}` | `$(NAME)` (from variable group/Key Vault) |
| Reusable workflows | `uses: org/repo/.github/workflows/x.yml@main` | `template: path/to/template.yml` |
| Environments | `environment:` with protection rules | `environment:` with checks/approvals |
| Artifacts upload | `actions/upload-artifact@v4` | `PublishBuildArtifacts@1` task |
| Caching | `actions/cache@v4` | `Cache@2` task |
| Matrix strategy | `strategy: { matrix: {} }` | `strategy: { matrix: {} }` (same!) |

## Time management

| Section | Suggested time | Notes |
|---------|---------------|-------|
| First pass (all questions) | 80 min | Answer what you know, flag rest |
| Second pass (flagged) | 30 min | Focus on scenario questions |
| Lab section (if present) | 20-30 min | Usually 1-2 lab tasks |
| Review | 10 min | Check flagged answers |

## Domain-specific tips

### Domain 1: Processes (10-15%)

- Know the difference between GitHub Projects (v2) and Azure Boards
- Understand how to link commits to work items (AB#123 syntax in Azure DevOps)
- Know webhook payload formats and when to use them

### Domain 2: Source control (10-15%)

- `git filter-repo` is the recommended tool for removing sensitive data (not `filter-branch`)
- Understand Scalar for large repos (GVFS protocol)
- Know the difference between `CODEOWNERS` in GitHub vs branch policies in Azure DevOps

### Domain 3: Pipelines (50-55%)

- This is HALF the exam — spend proportional study time
- Know how to configure parallel jobs and agent pools
- Understand the difference between `dependsOn` and `condition`
- Multi-stage pipelines: know stage → job → step hierarchy
- Classic-to-YAML migration is testable

### Domain 4: Security (10-15%)

- Workload identity federation (OIDC) is the modern best practice — know it well
- GitHub Advanced Security: CodeQL + secret scanning + Dependabot = the trio
- Microsoft Defender for Cloud DevOps Security connects GitHub/ADO to Defender

### Domain 5: Instrumentation (5-10%)

- Know how to create deployment annotations in Application Insights
- KQL basics: `where`, `summarize`, `render`, `ago(1h)`
- Understand the difference between VM Insights, Container Insights, and App Insights

## Resources

| Resource | Link |
|----------|------|
| AZ-400 study guide | [aka.ms/AZ400-StudyGuide](https://aka.ms/AZ400-StudyGuide) |
| Exam prep videos | [Exam Readiness Zone](https://learn.microsoft.com/en-us/shows/exam-readiness-zone/preparing-for-az-400-configure-processes-and-communications-1-of-5) |
| Free practice assessment | [Practice questions](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-400/practice/assessment?assessment-type=practice&assessmentId=56) |
| GitHub Actions docs | [docs.github.com/actions](https://docs.github.com/en/actions) |
| Azure Pipelines docs | [learn.microsoft.com/azure/devops/pipelines](https://learn.microsoft.com/en-us/azure/devops/pipelines/) |
