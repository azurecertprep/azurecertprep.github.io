---
sidebar_position: 6
title: "Challenge 44: GitHub Advanced Security"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 44: GitHub Advanced Security

## Exam skills covered

- Configure GitHub Advanced Security for both GitHub and Azure DevOps
- Automate container scanning (container images, CodeQL analysis)
- Automate analysis of licensing, vulnerabilities, and versioning (Dependabot alerts)

## Scenario

Contoso Ltd's security team has no visibility into code vulnerabilities across their 45 repositories. Last quarter, a production outage was caused by a known vulnerability in a transitive dependency that had a patch available for six months. Developers never saw the alert because no scanning was configured. You must implement comprehensive security scanning using GitHub Advanced Security to detect vulnerabilities in code, dependencies, secrets, and container images.

## Prerequisites

- GitHub organization with GitHub Advanced Security license (included for public repos)
- At least one repository with application code (any language supported by CodeQL)
- GitHub CLI (`gh`) installed and authenticated
- Docker installed (for container scanning tasks)

## Tasks

### Task 1: Enable GitHub Advanced Security

```bash
# Enable GHAS for a specific repository
gh api repos/contoso/webapp -X PATCH --input - <<< '{
  "security_and_analysis": {
    "advanced_security": { "status": "enabled" },
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}'

# Enable for all repositories in the organization
gh api orgs/contoso -X PATCH --input - <<< '{
  "security_and_analysis": {
    "advanced_security": { "status": "enabled" },
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}'

# Verify GHAS is enabled
gh api repos/contoso/webapp --jq '.security_and_analysis'
```

### Task 2: Configure CodeQL analysis

Create a CodeQL workflow for automated code scanning:

```yaml
# .github/workflows/codeql-analysis.yml
name: CodeQL Analysis
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '30 6 * * 1'  # Weekly Monday 6:30 UTC

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: ['javascript', 'csharp']
        # Supported: cpp, csharp, go, java, javascript, python, ruby, swift

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          queries: +security-extended,security-and-quality
          # Options: security-extended, security-and-quality, or path to custom queries

      # For compiled languages, the build step is required
      - name: Build application (for compiled languages)
        if: matrix.language == 'csharp'
        run: |
          dotnet build src/Contoso.Web/Contoso.Web.csproj

      # For interpreted languages, autobuild handles it
      - name: Autobuild
        if: matrix.language == 'javascript'
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:${{ matrix.language }}"
```

### Task 3: Configure secret scanning and push protection

```bash
# View current secret scanning alerts
gh api repos/contoso/webapp/secret-scanning/alerts \
  --jq '.[] | {number: .number, secret_type: .secret_type_display_name, state: .state, created: .created_at}'

# Close a false positive alert
gh api repos/contoso/webapp/secret-scanning/alerts/1 -X PATCH \
  --field state="resolved" \
  --field resolution="false_positive"

# Define custom secret patterns for the organization
gh api orgs/contoso/secret-scanning/custom-patterns -X POST \
  --field name="Contoso Internal API Key" \
  --field pattern="contoso_[a-zA-Z0-9]{32}" \
  --field scope="organization"
```

Configure push protection bypass:

1. Organization Settings > Code security and analysis
2. Push protection > Who can bypass push protection for secret scanning:
   - Select "Specific roles or teams"
   - Add: Security team only
3. Require a reason when bypassing: Enable

### Task 4: Configure Dependabot alerts and security updates

```yaml
# .github/dependabot.yml
version: 2
updates:
  # npm dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "06:00"
      timezone: "America/New_York"
    open-pull-requests-limit: 10
    reviewers:
      - "contoso/backend-team"
    labels:
      - "dependencies"
      - "security"
    # Group minor and patch updates together
    groups:
      production-dependencies:
        patterns:
          - "*"
        update-types:
          - "minor"
          - "patch"

  # NuGet dependencies
  - package-ecosystem: "nuget"
    directory: "/src/Contoso.Web"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    reviewers:
      - "contoso/dotnet-team"

  # Docker base images
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    reviewers:
      - "contoso/platform-team"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "ci-cd"
```

Enable Dependabot security updates:

```bash
# Enable Dependabot alerts
gh api repos/contoso/webapp/vulnerability-alerts -X PUT

# View current Dependabot alerts
gh api repos/contoso/webapp/dependabot/alerts \
  --jq '.[] | {number: .number, package: .security_advisory.summary, severity: .security_advisory.severity, state: .state}'

# Dismiss an alert (not applicable to this project)
gh api repos/contoso/webapp/dependabot/alerts/5 -X PATCH \
  --field state="dismissed" \
  --field dismissed_reason="not_used" \
  --field dismissed_comment="This dependency is only in dev dependencies and not deployed"
```

### Task 5: Configure Dependabot version updates

Dependabot version updates keep dependencies current regardless of known vulnerabilities:

```yaml
# Additional configuration in .github/dependabot.yml
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    # Ignore major version updates for specific packages
    ignore:
      - dependency-name: "express"
        update-types: ["version-update:semver-major"]
      - dependency-name: "@types/*"
        update-types: ["version-update:semver-major"]
    # Allow only security updates for specific packages
    allow:
      - dependency-type: "production"
    # Auto-merge patch updates via GitHub Actions
    groups:
      patch-updates:
        patterns:
          - "*"
        update-types:
          - "patch"
```

Auto-merge Dependabot PRs for patch updates:

```yaml
# .github/workflows/dependabot-auto-merge.yml
name: Auto-merge Dependabot PRs
on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: write
  pull-requests: write

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'
    steps:
      - name: Dependabot metadata
        id: metadata
        uses: dependabot/fetch-metadata@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Auto-merge patch updates
        if: steps.metadata.outputs['update-type'] == 'version-update:semver-patch'
        run: |
          gh pr merge "${{ github.event.pull_request.number }}" \
            --auto --squash \
            --repo ${{ github.repository }}
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Task 6: GitHub Advanced Security for Azure DevOps (GHAzDO)

Enable GHAS features in Azure DevOps:

1. Organization Settings > Repositories > Settings
2. Enable "GitHub Advanced Security for Azure DevOps"
3. Per-repository: Repository Settings > Advanced Security > Enable

Configure Advanced Security scanning in Azure Pipelines:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  # Dependency scanning
  - task: AdvancedSecurity-Dependency-Scanning@1
    displayName: 'Dependency Scanning'

  # CodeQL code scanning (initialize)
  - task: AdvancedSecurity-Codeql-Init@1
    inputs:
      languages: 'csharp,javascript'
      querysuite: 'security-extended'
    displayName: 'Initialize CodeQL'

  # Build step (required for compiled languages)
  - task: DotNetCoreCLI@2
    inputs:
      command: 'build'
      projects: '**/*.csproj'
    displayName: 'Build .NET project'

  # CodeQL analysis
  - task: AdvancedSecurity-Codeql-Analyze@1
    displayName: 'Run CodeQL Analysis'

  # Publish results
  - task: AdvancedSecurity-Publish@1
    displayName: 'Publish Advanced Security Results'
```

View results in Azure DevOps:

1. Repos > Advanced Security (tab) to view alerts
2. Filter by severity (Critical, High, Medium, Low)
3. Alerts appear as PR annotations on pull requests

### Task 7: Create a custom CodeQL query

Create a custom query to detect organization-specific patterns:

```ql
/**
 * @name Hard-coded Contoso API endpoint
 * @description Finds hard-coded production API URLs that should use configuration
 * @kind problem
 * @problem.severity warning
 * @id contoso/hardcoded-api-url
 * @tags security
 *       contoso
 */

import javascript

from StringLiteral s
where
  s.getValue().matches("%api.contoso.com/v%") or
  s.getValue().matches("%prod.contoso.internal%")
select s, "Hard-coded production API URL found. Use environment configuration instead."
```

Save as `.github/codeql/queries/contoso-hardcoded-urls.ql` and reference in the workflow:

```yaml
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript
          queries: +./.github/codeql/queries/
```

Create a query pack configuration:

```yaml
# .github/codeql/queries/qlpack.yml
name: contoso/custom-queries
version: 1.0.0
dependencies:
  codeql/javascript-all: "*"
```

### Task 8: Container scanning with CodeQL

```yaml
# .github/workflows/container-scan.yml
name: Container Security Scan
on:
  push:
    branches: [main]
    paths:
      - 'Dockerfile'
      - 'docker-compose*.yml'
      - '.github/workflows/container-scan.yml'

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
      packages: read

    steps:
      - uses: actions/checkout@v4

      - name: Build container image
        run: |
          docker build -t contoso-webapp:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'contoso-webapp:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy scan results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
          category: 'container-scanning'

      - name: Fail on critical vulnerabilities
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'contoso-webapp:${{ github.sha }}'
          format: 'table'
          exit-code: '1'
          severity: 'CRITICAL'
```

## Break and fix

### Break scenario 1: CodeQL analysis fails with "no source code found"

The CodeQL workflow completes but reports zero results with a warning about no source code.

**Cause:** For compiled languages like C# or Java, CodeQL requires observing the build process. If the build step is missing or fails silently, CodeQL has no code to analyze.


<details>
<summary>Show solution</summary>

**Fix:** Ensure the build step runs between `init` and `analyze`:

```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    languages: csharp

# This step is required for compiled languages
- name: Build
  run: dotnet build src/Contoso.Web.sln

- name: Perform CodeQL Analysis
  uses: github/codeql-action/analyze@v3
```

</details>

### Break scenario 2: Dependabot PRs fail CI checks due to lockfile conflicts

Dependabot opens a PR but the CI pipeline fails because `package-lock.json` is out of sync.


<details>
<summary>Show solution</summary>

**Fix:** Add a `postUpdateOptions` section to the Dependabot config or add a workflow to regenerate lockfiles:

```yaml
# In dependabot.yml, Dependabot automatically updates lockfiles
# If conflicts arise, close and re-open the PR to trigger regeneration

# Or use a workflow to fix lockfile issues:
# .github/workflows/fix-lockfile.yml
name: Fix lockfile
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  fix:
    if: github.actor == 'dependabot[bot]'
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.head_ref }}
      - run: npm install
      - run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add package-lock.json
          git diff --staged --quiet || git commit -m "fix: regenerate lockfile"
          git push
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Contoso has repositories in both GitHub and Azure DevOps. They want CodeQL scanning on both platforms. What is the correct approach?",
    options: [
      "CodeQL only works with GitHub repositories",
      "Use GitHub CodeQL action for GitHub repos and AdvancedSecurity-Codeql tasks for Azure DevOps repos",
      "Mirror all Azure DevOps repos to GitHub for scanning",
      "Use a third-party tool since CodeQL cannot run in Azure DevOps"
    ],
    correctIndex: 1,
    explanation: "GitHub Advanced Security for Azure DevOps (GHAzDO) provides native CodeQL analysis through pipeline tasks (AdvancedSecurity-Codeql-Init@1 and AdvancedSecurity-Codeql-Analyze@1). GitHub repos use the github/codeql-action. Both provide the same CodeQL engine and query suites."
  },
  {
    question: "A Dependabot alert shows a critical vulnerability in a transitive dependency (a dependency of a dependency). The direct dependency has not released a fix yet. What should Contoso do?",
    options: [
      "Dismiss the alert since the direct dependency team must fix it",
      "Override the transitive dependency version using npm overrides or resolutions to force the patched version",
      "Remove the direct dependency entirely",
      "Wait for the direct dependency to release an update"
    ],
    correctIndex: 1,
    explanation: "Using package manager features like npm overrides or yarn resolutions allows forcing a patched version of the transitive dependency without waiting for the direct dependency to update. This provides immediate mitigation while maintaining functionality."
  },
  {
    question: "Which GitHub secret scanning feature prevents secrets from entering the repository in the first place?",
    options: [
      "Secret scanning alerts",
      "Custom secret patterns",
      "Push protection",
      "Security advisories"
    ],
    correctIndex: 2,
    explanation: "Push protection blocks the git push at the server level before the secret enters the repository history. Standard secret scanning alerts only notify after the secret is already committed. Push protection is the preventive control, while alerts are a detective control."
  },
  {
    question: "Contoso wants container vulnerability scan results to appear alongside CodeQL results in the GitHub Security tab. How should they configure container scanning?",
    options: [
      "Use a container scanning action that outputs SARIF format and upload with codeql-action/upload-sarif",
      "Enable Dependabot for Docker ecosystem only",
      "Run docker scan and parse the text output",
      "Container scanning results cannot appear in the Security tab"
    ],
    correctIndex: 0,
    explanation: "The GitHub Security tab displays SARIF (Static Analysis Results Interchange Format) results. Any scanner that produces SARIF output can upload results via the codeql-action/upload-sarif action, making them visible alongside CodeQL findings in a unified security dashboard."
  }
]} />

## Cleanup

```bash
# Remove workflow files
rm -f .github/workflows/codeql-analysis.yml
rm -f .github/workflows/container-scan.yml
rm -f .github/workflows/dependabot-auto-merge.yml
rm -f .github/dependabot.yml
rm -rf .github/codeql/

# Disable GHAS (if no longer needed for testing)
gh api repos/contoso/webapp -X PATCH \
  --field security_and_analysis[advanced_security][status]="disabled"

git add -A && git commit -m "cleanup: remove challenge 44 security scanning config" && git push
```
