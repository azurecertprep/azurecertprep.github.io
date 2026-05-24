---
sidebar_position: 3
title: "Challenge 15: Dependency management and vulnerability scanning"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 15: Dependency management and vulnerability scanning

:::info Platform: both
This challenge covers dependency security workflows on both GitHub and Azure DevOps.
:::

## Exam skills

- Recommend package management tools including GitHub Packages and Azure Artifacts
- Design and implement package feeds and views for local and upstream packages

## Scenario

Contoso's security team runs a quarterly audit and discovers that 3 of their 15 production microservices depend on a library with a critical CVE (CVE-2024-29041, an Express.js path traversal vulnerability). The issues are:

- No automated process detects vulnerable dependencies
- Developers are unaware which transitive dependencies carry risk
- There is no policy for license compliance (some teams accidentally included GPL-licensed code in proprietary services)
- Remediation takes weeks because nobody knows which services are affected

You must implement a comprehensive dependency management and vulnerability scanning strategy.

## Tasks

### Task 1: Configure Dependabot for automated dependency updates

Dependabot automatically opens pull requests to update dependencies on a schedule.

#### Step 1: Create the Dependabot configuration file

In your repository, create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # npm dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "America/New_York"
    open-pull-requests-limit: 10
    reviewers:
      - "contoso/backend-team"
    labels:
      - "dependencies"
      - "automated"
    commit-message:
      prefix: "deps"
      include: "scope"
    groups:
      dev-dependencies:
        dependency-type: "development"
        update-types:
          - "minor"
          - "patch"
      production-minor:
        dependency-type: "production"
        update-types:
          - "minor"
          - "patch"

  # NuGet dependencies
  - package-ecosystem: "nuget"
    directory: "/src/Contoso.Api"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    ignore:
      - dependency-name: "Microsoft.Extensions.*"
        update-types: ["version-update:semver-major"]

  # Docker base images
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "docker"
      - "dependencies"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "ci"
      - "dependencies"
```

#### Step 2: Verify Dependabot is active

After pushing the configuration:

```bash
gh api /repos/contoso/auth-service/vulnerability-alerts --method PUT
```

Check the status of Dependabot:

```bash
gh api /repos/contoso/auth-service/dependabot/alerts \
  --jq '.[0:5] | .[] | {package: .security_advisory.summary, severity: .security_advisory.severity, state: .state}'
```

### Task 2: Set up Dependabot security alerts

Security alerts differ from version updates. They trigger immediately when a new CVE is published that affects your dependency tree.

#### Step 1: Enable security alerts for the organization

```bash
gh api --method PUT /orgs/contoso/dependabot/alerts
```

Enable for all repositories:

```bash
gh api --method PUT /orgs/contoso \
  --field dependabot_security_updates_enabled_for_new_repositories=true \
  --field dependency_graph_enabled_for_new_repositories=true \
  --field dependabot_alerts_enabled_for_new_repositories=true
```

#### Step 2: List current security alerts across repositories

```bash
gh api /orgs/contoso/dependabot/alerts \
  --jq '.[] | select(.state == "open") | {repo: .repository.name, package: .dependency.package.name, severity: .security_advisory.severity, cve: .security_advisory.cve_id}'
```

Filter for critical and high severity alerts only:

```bash
gh api "/orgs/contoso/dependabot/alerts?severity=critical,high&state=open" \
  --jq '.[] | "\(.repository.name): \(.dependency.package.name) - \(.security_advisory.severity) - \(.security_advisory.cve_id)"'
```

#### Step 3: Dismiss an alert (false positive)

```bash
gh api --method PATCH /repos/contoso/auth-service/dependabot/alerts/42 \
  --field state=dismissed \
  --field dismissed_reason=tolerable_risk \
  --field dismissed_comment="This code path is not reachable in our configuration"
```

### Task 3: Azure Artifacts and Defender for DevOps integration

#### Step 1: Enable Microsoft Defender for DevOps

Connect your Azure DevOps organization to Defender for Cloud:

```bash
az security devops azuredevopsorg create \
  --name contoso-ado \
  --resource-group rg-security \
  --org-name contoso
```

#### Step 2: Configure the Microsoft Security DevOps Azure DevOps extension

Add the security scanning task to your Azure Pipeline:

```yaml
trigger:
  - main

pool:
  vmImage: ubuntu-latest

steps:
  - task: MicrosoftSecurityDevOps@1
    displayName: 'Run security analysis'
    inputs:
      categories: 'dependencies'
      tools: 'eslint,trivy'

  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: $(System.DefaultWorkingDirectory)/.gdn
      artifactName: security-results
```

#### Step 3: Configure Azure Artifacts package vulnerability alerts

Enable package scanning on your Azure Artifacts feed:

```bash
az rest --method patch \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages?api-version=7.1-preview.1" \
  --body '{
    "badgesEnabled": true,
    "hideDeletedPackageVersions": true
  }'
```

### Task 4: License compliance scanning

#### Step 1: Create a license policy with GitHub Actions

Create `.github/workflows/license-check.yml`:

```yaml
name: License compliance check
on:
  pull_request:
    paths:
      - 'package.json'
      - 'package-lock.json'
      - '**/*.csproj'

jobs:
  license-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install license checker
        run: npm install -g license-checker

      - name: Check npm licenses
        run: |
          license-checker --production --failOn \
            "GPL-2.0-only;GPL-3.0-only;AGPL-3.0-only;SSPL-1.0" \
            --summary

      - name: Check for unknown licenses
        run: |
          UNKNOWN=$(license-checker --production --unknown | wc -l)
          if [ "$UNKNOWN" -gt 0 ]; then
            echo "ERROR: Found packages with unknown licenses"
            license-checker --production --unknown
            exit 1
          fi
```

#### Step 2: NuGet license validation

For .NET projects, use `dotnet-project-licenses`:

```bash
dotnet tool install --global dotnet-project-licenses

dotnet-project-licenses \
  --input ./src/Contoso.Api/Contoso.Api.csproj \
  --output-directory ./license-report \
  --banned-license-types ./banned-licenses.json
```

Create `banned-licenses.json`:

```json
{
  "banned": [
    "GPL-2.0-only",
    "GPL-3.0-only",
    "AGPL-3.0-only",
    "SSPL-1.0"
  ]
}
```

### Task 5: Create a dependency review workflow in GitHub Actions

The dependency review action runs on pull requests and blocks merging if new dependencies introduce vulnerabilities or disallowed licenses.

Create `.github/workflows/dependency-review.yml`:

```yaml
name: Dependency review
on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Dependency review
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
          deny-licenses: GPL-2.0-only, GPL-3.0-only, AGPL-3.0-only
          allow-ghsas: GHSA-xxxx-yyyy-zzzz
          comment-summary-in-pr: always
          warn-only: false
          base-ref: ${{ github.event.pull_request.base.sha }}
          head-ref: ${{ github.event.pull_request.head.sha }}
```

### Task 6: Implement dependency allow and deny lists

#### Step 1: npm allow list with .npmrc

Restrict registries to only approved sources:

```ini
@contoso:registry=https://npm.pkg.github.com
registry=https://pkgs.dev.azure.com/contoso/ContosoServices/_packaging/contoso-packages/npm/registry/
```

This prevents developers from accidentally pulling packages from public npm directly.

#### Step 2: NuGet package source mapping

In `nuget.config`, map specific package patterns to specific sources:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="contoso-packages" value="https://pkgs.dev.azure.com/contoso/ContosoServices/_packaging/contoso-packages/nuget/v3/index.json" />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
  </packageSources>
  <packageSourceMapping>
    <packageSource key="contoso-packages">
      <package pattern="Contoso.*" />
    </packageSource>
    <packageSource key="nuget.org">
      <package pattern="Microsoft.*" />
      <package pattern="System.*" />
      <package pattern="Newtonsoft.*" />
    </packageSource>
  </packageSourceMapping>
</configuration>
```

#### Step 3: GitHub Actions dependency deny list

Block specific known-bad packages from being introduced:

```yaml
- name: Check for banned packages
  run: |
    BANNED_PACKAGES=("event-stream" "flatmap-stream" "ua-parser-js@0.7.29")
    LOCKFILE="package-lock.json"

    for pkg in "${BANNED_PACKAGES[@]}"; do
      if grep -q "\"$pkg\"" "$LOCKFILE"; then
        echo "ERROR: Banned package found: $pkg"
        exit 1
      fi
    done
    echo "No banned packages detected"
```

## Break & fix

### Scenario: Dependabot PR breaks build due to breaking change

Dependabot opens a PR to update `@contoso/auth-sdk` from 1.2.0 to 2.0.0. The CI pipeline fails with:

```text
TypeError: AuthClient.validateToken is not a function
    at Object.<anonymous> (src/middleware/auth.js:15:32)
```

The Dependabot PR is one of 12 open dependency updates. The team needs a strategy to handle this.

<details>
<summary>Show solution</summary>

**Root cause**: Dependabot updated a package across a major version boundary, introducing a breaking API change. The `validateToken` method was renamed to `verifyToken` in version 2.0.0.

**Immediate fix**: Close the Dependabot PR and pin to the safe version range:

```bash
gh pr close 847 --comment "Breaking change in v2.0.0. Pinning to 1.x until migration is complete."
```

**Step 1: Prevent major version bumps via Dependabot config**

Update `.github/dependabot.yml` to ignore major version updates for critical packages:

```yaml
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    ignore:
      - dependency-name: "@contoso/auth-sdk"
        update-types: ["version-update:semver-major"]
```

**Step 2: Pin the version range in package.json**

Use a tilde range to allow only patch updates:

```json
{
  "dependencies": {
    "@contoso/auth-sdk": "~1.2.0"
  }
}
```

Or use a caret range to allow minor and patch but not major:

```json
{
  "dependencies": {
    "@contoso/auth-sdk": "^1.2.0"
  }
}
```

**Step 3: Create a migration plan for the major update**

Track the breaking change as a separate work item rather than relying on Dependabot:

```bash
gh issue create \
  --title "Migrate to @contoso/auth-sdk v2.0.0" \
  --body "auth-sdk 2.0.0 renames validateToken to verifyToken. All services using auth middleware need updating." \
  --label "breaking-change,dependencies" \
  --assignee "@contoso/backend-team"
```

**Step 4: Add CI checks that catch breaking changes early**

Ensure your test suite covers the integration points. Add a smoke test:

```javascript
const { AuthClient } = require('@contoso/auth-sdk');
const client = new AuthClient();
// Verify expected API surface exists
assert(typeof client.validateToken === 'function',
  'auth-sdk API contract violated: validateToken must exist');
```

**Step 5: Group related dependency updates**

Configure Dependabot to group minor/patch updates so breaking changes are isolated:

```yaml
groups:
  contoso-internal:
    patterns:
      - "@contoso/*"
    update-types:
      - "minor"
      - "patch"
```

This ensures major version bumps appear as individual PRs that are easy to identify and defer.

</details>

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "A Dependabot configuration has 'schedule.interval: \"weekly\"' and 'open-pull-requests-limit: 5'. What happens when there are 8 outdated dependencies?",
    options: [
      "Dependabot opens 8 PRs simultaneously",
      "Dependabot opens 5 PRs and queues the remaining 3 for the next cycle",
      "Dependabot opens 5 PRs and ignores the remaining 3 permanently",
      "The configuration is invalid and Dependabot will not run"
    ],
    correctIndex: 1,
    explanation: "When the number of outdated dependencies exceeds the open-pull-requests-limit, Dependabot opens PRs up to the limit and queues the remaining updates. They will be opened as existing PRs are merged or closed, or on the next scheduled run if capacity is available."
  },
  {
    question: "Which GitHub Actions action blocks PR merging when a new dependency introduces a known vulnerability?",
    options: [
      "actions/codeql-action",
      "actions/dependency-review-action",
      "github/dependabot-action",
      "actions/security-scan"
    ],
    correctIndex: 1,
    explanation: "The actions/dependency-review-action is purpose-built for pull request dependency analysis. It compares the dependency changes in a PR against known vulnerability databases and can block merging based on severity thresholds and license policies."
  },
  {
    question: "In NuGet package source mapping, what happens if a package matches no configured pattern?",
    options: [
      "It is downloaded from all configured sources",
      "The restore fails with an error",
      "It falls back to nuget.org automatically",
      "It uses the first source in the list"
    ],
    correctIndex: 1,
    explanation: "When NuGet package source mapping is configured and a package matches no pattern, the restore fails. This is a security feature that prevents unintended package sources from being used. You must explicitly map every package pattern to an approved source."
  },
  {
    question: "A team wants to automatically remediate critical CVEs but manually review all other dependency updates. Which Dependabot configuration achieves this?",
    options: [
      "Set 'schedule.interval: \"daily\"' with 'open-pull-requests-limit: 1'",
      "Enable Dependabot security updates (automatic) and configure version updates with 'ignore' rules for non-critical",
      "Set 'fail-on-severity: critical' in the dependency review action",
      "Configure 'groups' to batch all non-critical updates"
    ],
    correctIndex: 1,
    explanation: "Dependabot has two independent features: security updates (triggered immediately by CVE publications, always automatic) and version updates (scheduled, configurable). Enabling security updates handles critical CVEs automatically, while version update configuration controls routine dependency freshness."
  }
]} />

## Cleanup

Remove Dependabot configuration:

```bash
rm .github/dependabot.yml
git add -A && git commit -m "Remove Dependabot configuration"
git push origin main
```

Remove workflow files:

```bash
rm .github/workflows/license-check.yml
rm .github/workflows/dependency-review.yml
git add -A && git commit -m "Remove dependency scanning workflows"
git push origin main
```

Disable Dependabot alerts for the repository:

```bash
gh api --method DELETE /repos/contoso/auth-service/vulnerability-alerts
```

Remove the license checker tool:

```bash
npm uninstall -g license-checker
dotnet tool uninstall --global dotnet-project-licenses
```

Remove NuGet source mapping (restore original `nuget.config`):

```bash
git checkout HEAD -- nuget.config
```
