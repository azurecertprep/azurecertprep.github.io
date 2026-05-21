---
sidebar_position: 2
title: "Challenge 40: GitHub authentication"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 40: GitHub authentication

## Exam skills covered

- Implement and manage GitHub authentication, including GitHub Apps, GITHUB_TOKEN, and personal access tokens
- Design and implement permissions and roles in GitHub

## Scenario

Contoso Ltd's automation relies on three classic personal access tokens (PATs) created by a developer who left the company six months ago. These PATs have `repo` and `admin:org` scope with no expiration date. They are shared across 15 repositories and used by custom integrations, scheduled workflows, and a deployment bot. You must replace these with secure, scoped, and auditable authentication mechanisms.

## Prerequisites

- GitHub account with organization admin access (free tier is sufficient for most tasks)
- A test repository in the organization
- GitHub CLI (`gh`) installed and authenticated

## Tasks

### Task 1: Understand GITHUB_TOKEN (automatic token)

The `GITHUB_TOKEN` is automatically created for every workflow run. It is scoped to the repository, cannot access other repositories, and expires when the job completes.

```yaml
# .github/workflows/auto-token-demo.yml
name: GITHUB_TOKEN demonstration
on:
  push:
    branches: [main]

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  demo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create an issue using GITHUB_TOKEN
        run: |
          gh issue create \
            --title "Automated issue from workflow" \
            --body "Created by workflow run ${{ github.run_id }}" \
            --label "automation"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: List repository contents (read access)
        run: |
          gh api repos/${{ github.repository }}/contents \
            --jq '.[].name'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Key characteristics of GITHUB_TOKEN:
- Automatically created, no manual setup required
- Scoped to the current repository only
- Expires when the job completes
- Permissions configurable via the `permissions` key
- Cannot trigger other workflows (prevents recursive triggers)
- Cannot access other repositories in the organization

### Task 2: Create a GitHub App for cross-repo automation

When automation needs to span multiple repositories, create a GitHub App.

```bash
# Navigate to: Organization Settings > Developer settings > GitHub Apps > New GitHub App

# Required settings:
# - App name: contoso-deploy-bot
# - Homepage URL: https://github.com/contoso
# - Webhook: Deactivate (for CI/CD use cases without event subscriptions)
# - Permissions:
#   - Repository: Contents (read), Pull requests (write), Deployments (write)
#   - Organization: Members (read)
# - Where can this app be installed: Only on this account
```

Generate an installation token in a workflow:

```yaml
# .github/workflows/cross-repo-deploy.yml
name: Cross-repo deployment
on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Generate installation token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ vars.CONTOSO_APP_ID }}
          private-key: ${{ secrets.CONTOSO_APP_PRIVATE_KEY }}
          owner: contoso

      - name: Clone deployment manifests from another repo
        run: |
          git clone https://x-access-token:${{ steps.app-token.outputs.token }}@github.com/contoso/deploy-manifests.git
          ls deploy-manifests/

      - name: Trigger deployment in target repo
        run: |
          gh workflow run deploy.yml \
            --repo contoso/production-infra \
            --ref main
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
```

### Task 3: Fine-grained personal access tokens

Replace classic PATs with fine-grained PATs that have limited scope.

```bash
# Create a fine-grained PAT via:
# Settings > Developer settings > Personal access tokens > Fine-grained tokens

# Configuration:
# - Token name: contoso-ci-readonly
# - Expiration: 30 days (maximum recommended for automation)
# - Resource owner: contoso (organization)
# - Repository access: Only select repositories > contoso/webapp, contoso/api
# - Permissions:
#   - Contents: Read-only
#   - Metadata: Read-only (always required)
#   - Pull requests: Read and write

# Test the fine-grained PAT
gh auth login --with-token <<< "github_pat_xxxxx"

# Verify access scope
gh api repos/contoso/webapp --jq '.full_name'

# This should fail (not in token scope)
gh api repos/contoso/other-repo --jq '.full_name'
# Expected: 404 Not Found
```

Organization policy to require fine-grained PATs:

1. Organization Settings > Personal access tokens > Settings
2. Restrict access via personal access tokens (classic): Do not allow
3. Require approval of fine-grained personal access tokens: Enable
4. Restrict access via fine-grained personal access tokens: Allow access via fine-grained personal access tokens

### Task 4: Configure GitHub App permissions (minimum required)

Design minimum permissions for Contoso's use cases:

| Use case | Repository permissions | Organization permissions |
|----------|----------------------|-------------------------|
| CI build status | Checks: write, Contents: read | None |
| Auto-merge PRs | Pull requests: write, Contents: write | None |
| Deployment | Deployments: write, Contents: read, Environments: read | None |
| Team notifications | None | Members: read |
| Security scanning | Security events: read, Contents: read | None |

```bash
# Verify current app permissions
gh api /app --jq '.permissions'

# List installations and their repository access
gh api /app/installations --jq '.[].repository_selection'
```

### Task 5: Use GITHUB_TOKEN in workflows with the permissions key

Configure default and per-job permissions:

```yaml
# .github/workflows/restricted-permissions.yml
name: Least-privilege workflow
on:
  pull_request:
    branches: [main]

# Default permissions for all jobs in this workflow
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build

  test:
    runs-on: ubuntu-latest
    needs: build
    permissions:
      contents: read
      checks: write
    steps:
      - uses: actions/checkout@v4
      - run: npm test
      - name: Publish test results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Jest Tests
          path: reports/jest-*.xml
          reporter: jest-junit

  deploy:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push'
    permissions:
      contents: read
      id-token: write
      deployments: write
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

Set organization default token permissions:

1. Organization Settings > Actions > General
2. Workflow permissions: Read repository contents and packages permissions
3. Uncheck "Allow GitHub Actions to create and approve pull requests"

### Task 6: GitHub organization roles

| Role | Access level | Use case |
|------|-------------|----------|
| Owner | Full admin access to organization | CTO, platform lead (limit to 2-3 people) |
| Member | Default access, can be added to teams | All developers |
| Billing manager | View and manage billing | Finance team |
| Security manager | Read access to all repos, manage security alerts | Security team |
| Outside collaborator | Access to specific repositories only | Contractors, vendors |

```bash
# List organization members and their roles
gh api orgs/contoso/members --jq '.[] | {login: .login}'

# Set a team as security managers
gh api orgs/contoso/security-managers/teams/security-team -X PUT

# Invite an outside collaborator to a specific repo
gh api repos/contoso/webapp/collaborators/vendor-user -X PUT \
  --field permission=push
```

### Task 7: Repository roles and custom roles

Default repository roles:

| Role | Permissions |
|------|------------|
| Read | Clone, view issues and PRs |
| Triage | Manage issues and PRs (no code write) |
| Write | Push to non-protected branches, merge PRs |
| Maintain | Manage repo settings (no destructive actions) |
| Admin | Full access including settings, delete |

Create a custom repository role:

```bash
# Create a custom role via Organization Settings > Roles
gh api orgs/contoso/custom-repository-roles -X POST \
  --field name="Release Manager" \
  --field description="Can manage releases and deployments" \
  --field base_role="write" \
  --field permissions[]="manage_deploy_keys" \
  --field permissions[]="manage_releases" \
  --field permissions[]="edit_repo_metadata"

# Assign the custom role to a team for a repository
gh api orgs/contoso/teams/release-team/repos/contoso/webapp -X PUT \
  --field permission="maintain"
```

## Break and fix

### Break scenario 1: GITHUB_TOKEN cannot push to protected branch

A workflow that auto-formats code and pushes the result fails with "refusing to allow a GitHub App to create or update workflow files."

**Cause:** By default, `GITHUB_TOKEN` cannot push to branches with branch protection rules that require PR reviews, and it can never modify workflow files under `.github/workflows/`.


<details>
<summary>Show solution</summary>

**Fix:** Use a GitHub App token instead of GITHUB_TOKEN:

```yaml
- name: Generate token with bypass
  id: app-token
  uses: actions/create-github-app-token@v1
  with:
    app-id: ${{ vars.FORMATTER_APP_ID }}
    private-key: ${{ secrets.FORMATTER_APP_PRIVATE_KEY }}

- name: Push formatted code
  run: |
    git config user.name "contoso-formatter[bot]"
    git config user.email "contoso-formatter[bot]@users.noreply.github.com"
    git add -A
    git commit -m "style: auto-format"
    git push
  env:
    GH_TOKEN: ${{ steps.app-token.outputs.token }}
```

Additionally, add the GitHub App to the branch protection bypass list in repository settings.

</details>

### Break scenario 2: GitHub App installation token returns 403

**Cause:** The GitHub App is installed on the organization but its repository access is set to "Selected repositories" and the target repo is not included.

**Diagnosis:**

```bash
# Check which repos the app installation can access
gh api /app/installations/{installation_id}/repositories --jq '.repositories[].full_name'
```


<details>
<summary>Show solution</summary>

**Fix:** Update the app installation to include the missing repository via Organization Settings > Installed GitHub Apps > contoso-deploy-bot > Configure > add the repository.

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "A workflow needs to create a deployment in the current repository and also trigger a workflow in a different repository within the same organization. Which authentication approach should you use?",
    options: [
      "GITHUB_TOKEN with 'permissions: contents: write'",
      "A classic PAT with 'repo' scope stored as a secret",
      "A GitHub App installation token",
      "A fine-grained PAT with access to both repositories"
    ],
    correctIndex: 2,
    explanation: "GITHUB_TOKEN cannot access other repositories, so it cannot trigger workflows cross-repo. A GitHub App with installation access to both repositories provides scoped, auditable authentication without being tied to a user account. While a fine-grained PAT could technically work, GitHub Apps are preferred for automation because they provide better audit trails and are not affected by user account changes."
  },
  {
    question: "Contoso wants to enforce that all automation tokens expire within 90 days. Which token types support enforced expiration at the organization level?",
    options: [
      "Classic PATs only",
      "Fine-grained PATs only",
      "Both classic and fine-grained PATs",
      "GITHUB_TOKEN and fine-grained PATs"
    ],
    correctIndex: 1,
    explanation: "Organization administrators can enforce maximum lifetime policies for fine-grained PATs through organization settings. Classic PATs can be set to expire by the user but the organization cannot enforce a maximum lifetime policy on them (only restrict or block them entirely). GITHUB_TOKEN already expires after each job automatically."
  },
  {
    question: "A security manager at Contoso needs to view and dismiss Dependabot alerts across all repositories but should not be able to modify code. What is the most appropriate role?",
    options: [
      "Organization Owner",
      "Organization Member with Write access to all repos",
      "Security Manager organization role",
      "Triage repository role on each repo"
    ],
    correctIndex: 2,
    explanation: "The Security Manager role grants read access to all repositories and the ability to manage security alerts (including Dependabot, secret scanning, and code scanning) across the organization without write access to code. This follows the principle of least privilege."
  },
  {
    question: "Which statement about GITHUB_TOKEN is correct?",
    options: [
      "It can be used to trigger other workflows in the same repository",
      "Its permissions are fixed and cannot be customized per workflow",
      "It persists across multiple workflow runs for caching purposes",
      "It cannot be used to push commits to the repository if branch protection requires PR reviews"
    ],
    correctIndex: 3,
    explanation: "GITHUB_TOKEN respects branch protection rules and cannot bypass required reviews. It also cannot trigger other workflows (to prevent infinite loops). Its permissions are customizable via the permissions key, and it expires after each job (does not persist across runs)."
  }
]} />

## Cleanup

```bash
# Delete the GitHub App (via web UI)
# Organization Settings > Developer settings > GitHub Apps > contoso-deploy-bot > Delete

# Revoke fine-grained PATs
# Settings > Developer settings > Personal access tokens > Fine-grained tokens > Delete

# Remove outside collaborators
gh api repos/contoso/webapp/collaborators/vendor-user -X DELETE

# Delete custom roles
gh api orgs/contoso/custom-repository-roles/{role_id} -X DELETE

# Delete test repository workflows
rm -rf .github/workflows/auto-token-demo.yml
rm -rf .github/workflows/cross-repo-deploy.yml
rm -rf .github/workflows/restricted-permissions.yml
git add -A && git commit -m "cleanup: remove challenge 40 test workflows" && git push
```
