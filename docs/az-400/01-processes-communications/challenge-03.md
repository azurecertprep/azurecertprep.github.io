---
sidebar_position: 3
title: "Challenge 03: Source, bug, and quality traceability"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 03: Source, bug, and quality traceability

## Exam skills covered

- Design and implement source, bug, and quality traceability

## Platform focus

Comparison (GitHub and Azure DevOps)

## Scenario

Last Thursday at 2:47 AM, Contoso Ltd's production payment service began returning 500 errors for 12% of transactions. The on-call engineer identified the symptom within minutes, but it took the team four hours to trace the error back to a specific commit, understand why it was approved, and determine which work item authorized the change. The root cause was a database migration that passed all tests in isolation but conflicted with a concurrent schema change from another team. The CTO has mandated full end-to-end traceability: from bug report through work item, pull request, commit, build artifact, and deployment, with no gaps in the audit chain.

---

## Prerequisites

- A GitHub repository (`contoso-payments`) with at least 10 commits
- Azure DevOps project connected to the GitHub repository
- GitHub CLI and Azure DevOps CLI installed
- Node.js installed (for commit linting tools)
- Basic understanding of conventional commits

---

## Task 1: Implement commit message conventions (Conventional Commits)

Conventional Commits provide a structured format that enables automated tooling: changelogs, version bumping, and traceability.

### Format specification

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Valid types and their meaning

| Type | Purpose | Triggers |
|------|---------|----------|
| `feat` | New feature | Minor version bump |
| `fix` | Bug fix | Patch version bump |
| `docs` | Documentation only | No version bump |
| `style` | Formatting, no logic change | No version bump |
| `refactor` | Code change, no feature/fix | No version bump |
| `perf` | Performance improvement | Patch version bump |
| `test` | Adding/correcting tests | No version bump |
| `build` | Build system changes | No version bump |
| `ci` | CI configuration changes | No version bump |
| `chore` | Maintenance tasks | No version bump |

### Breaking changes

```
feat(api)!: change authentication endpoint response format

BREAKING CHANGE: The /auth/token endpoint now returns a JSON object
with 'access_token' and 'refresh_token' fields instead of a flat
token string. All API consumers must update their parsing logic.

Reviewed-by: security-team
Refs: AB#2001
```

### Set up commit linting locally

```bash
cd contoso-payments

# Initialize if needed
npm init -y

# Install commitlint and conventional config
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# Create commitlint configuration
cat > commitlint.config.js << 'EOF'
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'build', 'ci', 'chore', 'revert'
    ]],
    'scope-enum': [1, 'always', [
      'api', 'auth', 'db', 'payments', 'notifications', 'ui'
    ]],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
    'footer-max-line-length': [2, 'always', 100],
    'references-empty': [1, 'never']
  }
};
EOF

# Install husky for Git hooks
npm install --save-dev husky
npx husky init

# Create commit-msg hook
echo 'npx --no -- commitlint --edit "$1"' > .husky/commit-msg
chmod +x .husky/commit-msg

# Test with a valid commit
git add -A
git commit -m "build: add commitlint with conventional commits config"

# Test with an invalid commit (should fail)
echo "test" > test.txt
git add test.txt
git commit -m "added a test file"
# Error: subject may not be empty, type may not be empty
```

---

## Task 2: Link commits to Azure Boards work items

### Configure the Azure Boards GitHub integration

```bash
# Verify the Azure Boards app is installed on the repository
gh api repos/{owner}/contoso-payments/installations \
  --jq '.[] | select(.app_slug == "azure-boards") | .id'

# If not installed, the admin must install from:
# https://github.com/marketplace/azure-boards
```

### Proper commit linking patterns

```bash
# Simple reference (creates link, no state change)
git commit -m "feat(auth): implement token refresh logic

Adds automatic token refresh when access token expires within
5 minutes of a request. Uses refresh token from HTTP-only cookie.

AB#2045"

# Fix reference (creates link AND transitions to Done/Resolved)
git commit -m "fix(payments): correct decimal precision in currency conversion

The conversion rate was truncated to 2 decimal places instead of 6,
causing rounding errors on high-value transactions.

Fixes AB#2100"

# Multiple references
git commit -m "feat(api): add rate limiting middleware

Implements token bucket algorithm with configurable burst and
sustained rates per API key.

AB#2050
AB#2051
Fixes AB#2052"
```

### Verify the links in Azure Boards

```bash
# Check work item links
az boards work-item show --id 2045 \
  --fields "System.Title,System.State" \
  --expand relations

# The output should show:
# relations:
#   - rel: "ArtifactLink"
#     url: "vstfs:///Git/Commit/..."
#     attributes:
#       name: "Fixed in Commit"
```

---

## Task 3: Link PRs to issues with closing keywords

### GitHub closing keywords

These keywords in a PR description automatically close the referenced issue when the PR merges to the default branch:

- `closes #123`
- `fixes #123`
- `resolves #123`

Case-insensitive variations all work: `Close`, `FIXES`, `Resolves`.

### Implement proper PR-to-issue linking

```bash
# Create an issue first
gh issue create \
  --title "Payment timeout not handled gracefully" \
  --body "When the payment gateway times out after 30s, users see a generic 500 error instead of a friendly timeout message." \
  --label "bug,priority/high" \
  --milestone "v2.4.0"

# Note the issue number (e.g., #87)

# Create a branch and fix
git checkout -b bugfix/payment-timeout-handling

cat > src/payments/timeout-handler.js << 'EOF'
class PaymentTimeoutHandler {
  constructor(timeoutMs = 30000) {
    this.timeoutMs = timeoutMs;
  }

  async executeWithTimeout(paymentFn) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const result = await paymentFn({ signal: controller.signal });
      return { success: true, data: result };
    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'PAYMENT_TIMEOUT',
          message: 'The payment is taking longer than expected. Please try again.',
          retryable: true
        };
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = PaymentTimeoutHandler;
EOF

git add -A
git commit -m "fix(payments): handle gateway timeout gracefully

Returns a user-friendly error message when the payment gateway
exceeds the 30-second timeout. The error includes a retry flag
so the UI can offer a retry button.

Fixes #87"

git push origin bugfix/payment-timeout-handling

# Create PR with closing reference
gh pr create \
  --title "fix(payments): handle gateway timeout gracefully" \
  --body "## Summary

Handles payment gateway timeouts with user-friendly error messages
instead of generic 500 errors.

## Changes
- New PaymentTimeoutHandler class with configurable timeout
- Returns structured error with retry guidance

## Testing
- Unit tests for timeout scenarios
- Integration test with mocked slow gateway

Fixes #87
AB#2100" \
  --base main
```

---

## Task 4: Build the full traceability chain

The goal is an unbroken chain: Bug Report -> Work Item -> PR -> Commit -> Build -> Deployment.

### End-to-end trace example

```bash
# Step 1: Bug is reported (GitHub Issue #87)
gh issue view 87 --json number,title,labels,milestone

# Step 2: Work item created/linked (Azure Boards AB#2100)
az boards work-item show --id 2100 --expand relations

# Step 3: PR created referencing both (#42)
gh pr view 42 --json number,title,body,commits,mergeCommit

# Step 4: Commits in the PR
gh pr view 42 --json commits --jq '.commits[].oid'

# Step 5: Build triggered by merge
gh run list --branch main --limit 5 --json databaseId,conclusion,headSha

# Step 6: Deployment from that build
gh api repos/{owner}/{repo}/deployments \
  --jq '.[] | select(.sha == "MERGE_COMMIT_SHA") | {id, environment, created_at}'
```

### Automate traceability verification

Create a workflow that validates the trace chain on every PR:

```bash
cat > .github/workflows/traceability-check.yml << 'EOF'
name: Traceability check

on:
  pull_request:
    types: [opened, synchronize, edited]

jobs:
  verify-traceability:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check PR links to issue or work item
        uses: actions/github-script@v7
        with:
          script: |
            const prBody = context.payload.pull_request.body || '';
            const prTitle = context.payload.pull_request.title || '';

            const hasIssueRef = /(close[sd]?|fix(e[sd])?|resolve[sd]?)\s+#\d+/i.test(prBody);
            const hasABRef = /AB#\d+/i.test(prBody) || /AB#\d+/i.test(prTitle);
            const hasLinkedIssue = prBody.match(/#\d+/);

            if (!hasIssueRef && !hasABRef && !hasLinkedIssue) {
              core.setFailed(
                'PR must reference at least one issue (#123) or work item (AB#123). ' +
                'Add "Fixes #<number>" or "AB#<number>" to the PR description.'
              );
            } else {
              core.info('Traceability check passed:');
              if (hasIssueRef) core.info('  - Found closing issue reference');
              if (hasABRef) core.info('  - Found Azure Boards reference');
            }

      - name: Validate commit message format
        run: |
          COMMITS=$(git log --format="%s" origin/main..HEAD)
          PATTERN="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?(!)?: .+"
          FAILED=0

          while IFS= read -r msg; do
            if [[ ! "$msg" =~ $PATTERN ]]; then
              echo "::error::Invalid commit message: $msg"
              FAILED=1
            fi
          done <<< "$COMMITS"

          if [ $FAILED -eq 1 ]; then
            echo "::error::All commits must follow Conventional Commits format"
            echo "Format: <type>(<scope>): <description>"
            exit 1
          fi
EOF
```

---

## Task 5: Configure audit logs and change tracking

### GitHub audit log queries

```bash
# Query organization audit log for repository events (requires org admin)
gh api orgs/{org}/audit-log \
  --method GET \
  -f phrase='action:protected_branch' \
  -f per_page=10 \
  --jq '.[] | {action, actor, created_at, data}'

# Query for specific user actions
gh api orgs/{org}/audit-log \
  --method GET \
  -f phrase='actor:username action:repo' \
  -f per_page=20 \
  --jq '.[] | {action, repo, created_at}'

# Get branch protection change history
gh api orgs/{org}/audit-log \
  --method GET \
  -f phrase='action:protected_branch.policy_override repo:contoso-org/contoso-payments' \
  --jq '.[] | {actor, action, created_at}'
```

### Azure DevOps audit streaming

```bash
# Query Azure DevOps audit log
az devops invoke \
  --area audit \
  --resource auditlog \
  --http-method GET \
  --api-version 7.1 \
  --query-parameters "startTime=2025-01-01T00:00:00Z&endTime=2025-01-31T23:59:59Z" \
  --query "[?contains(actionId, 'WorkItem')]"

# Set up audit streaming to a Log Analytics workspace
az devops invoke \
  --area audit \
  --resource streams \
  --http-method POST \
  --api-version 7.1 \
  --in-file - << 'EOF'
{
  "consumerType": "AzureMonitorLogs",
  "consumerInputs": {
    "WorkspaceId": "<workspace-id>",
    "SharedKey": "<workspace-key>"
  },
  "displayName": "Contoso Audit Stream"
}
EOF
```

---

## Task 6: Enforce commit message format via GitHub Actions

Create a robust commit message linter as a required check:

```bash
cat > .github/workflows/commit-lint.yml << 'EOF'
name: Commit message lint

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  commitlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install commitlint
        run: |
          npm install --save-dev @commitlint/cli @commitlint/config-conventional

      - name: Create commitlint config
        run: |
          cat > commitlint.config.js << 'CONFIG'
          module.exports = {
            extends: ['@commitlint/config-conventional'],
            rules: {
              'type-enum': [2, 'always', [
                'feat', 'fix', 'docs', 'style', 'refactor',
                'perf', 'test', 'build', 'ci', 'chore', 'revert'
              ]],
              'subject-max-length': [2, 'always', 72],
              'body-max-line-length': [2, 'always', 100],
              'footer-max-line-length': [2, 'always', 100]
            }
          };
          CONFIG

      - name: Lint commits in PR
        run: |
          npx commitlint \
            --from ${{ github.event.pull_request.base.sha }} \
            --to ${{ github.event.pull_request.head.sha }} \
            --verbose

  require-work-item-reference:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check for work item references in commits
        run: |
          COMMITS=$(git log --format="%H %s%n%b" \
            ${{ github.event.pull_request.base.sha }}..${{ github.event.pull_request.head.sha }})

          if echo "$COMMITS" | grep -qE "(AB#[0-9]+|#[0-9]+|Fixes|Closes|Resolves)"; then
            echo "Work item reference found in commits"
          else
            echo "::warning::No work item reference found in commits."
            echo "Consider adding AB#<id> or #<issue> to at least one commit."
          fi
EOF

git add -A
git commit -m "ci: add commit message linting and traceability enforcement"
git push origin main
```

---

## Break and fix

### Scenario 1: Commits are not linking to Azure Boards work items

Developers report that `AB#1234` in commit messages is not creating links in Azure Boards.

**Diagnosis:**

```bash
# Check if the Azure Boards GitHub connection is active
# In Azure DevOps: Project Settings > GitHub connections
az devops invoke \
  --area build \
  --resource builds \
  --http-method GET \
  --api-version 7.1 \
  --query-parameters "repositoryType=GitHub&repositoryId=contoso-org/contoso-payments"

# Verify the commit was pushed to the connected repository
gh api repos/{owner}/{repo}/commits/{sha} --jq '.commit.message'
```


<details>
<summary>Solution</summary>

**Fix:** The Azure Boards GitHub App must be installed on the repository, and the repository must be linked in the Azure DevOps project settings under Boards > GitHub connections. The `AB#` syntax only works for repositories that are explicitly connected.

</details>

### Scenario 2: Commitlint blocks a valid merge commit

A developer rebased and got a merge commit with message "Merge branch 'main' into feature/xyz" which fails commitlint.


<details>
<summary>Solution</summary>

**Fix:** Update commitlint.config.js to ignore merge commits:

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [(commit) => commit.startsWith('Merge')],
  rules: {
    // existing rules
  }
};
```

</details>

### Scenario 3: Traceability check fails on dependabot PRs

Automated PRs from Dependabot do not contain issue references.


<details>
<summary>Solution</summary>

**Fix:** Add a condition to skip the check for bot accounts:

```yaml
      - name: Check PR links to issue or work item
        if: github.actor != 'dependabot[bot]' && github.actor != 'github-actions[bot]'
```


</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the primary difference between 'AB#1234' and 'Fixes AB#1234' in a commit message?",
    options: [
      "'AB#1234' only works in PR descriptions; 'Fixes AB#1234' works in commits",
      "'AB#1234' creates a link to the work item; 'Fixes AB#1234' creates a link and transitions the work item state",
      "They are identical in behavior",
      "'AB#1234' links to Azure Boards; 'Fixes AB#1234' links to GitHub Issues"
    ],
    correctIndex: 1,
    explanation: "AB#1234 creates an association link between the commit and the work item without changing its state. Fixes AB#1234 additionally transitions the work item to the Resolved or Done state when the commit reaches the default branch."
  },
  {
    question: "Which component of Conventional Commits indicates a breaking change?",
    options: [
      "Using the 'breaking' type prefix",
      "An exclamation mark after the type/scope and/or a 'BREAKING CHANGE:' footer",
      "Capitalizing the entire subject line",
      "Adding '[BREAKING]' anywhere in the commit body"
    ],
    correctIndex: 1,
    explanation: "Breaking changes are signaled by appending ! after the type/scope (e.g., feat(api)!:) or by including a BREAKING CHANGE: footer in the commit message. Both trigger a major version bump in semantic versioning."
  },
  {
    question: "In a full traceability chain, what connects a merged PR to its deployed artifact?",
    options: [
      "The PR merge commit SHA matches the build trigger commit, and the build produces a versioned artifact deployed to the environment",
      "The developer manually tags the deployment with the PR number",
      "Azure Boards automatically tracks deployments",
      "The CODEOWNERS file maps PRs to deployments"
    ],
    correctIndex: 0,
    explanation: "The merge commit SHA is the common identifier. The CI system builds from that SHA, produces an artifact tagged with the commit hash, and the deployment system records which SHA was deployed to each environment."
  },
  {
    question: "What is the purpose of 'fetch-depth: 0' in a GitHub Actions checkout step when running commitlint?",
    options: [
      "It downloads all branches for comparison",
      "It fetches the complete Git history so commitlint can access all commits in the PR range",
      "It enables shallow cloning for faster builds",
      "It configures the checkout to include submodules"
    ],
    correctIndex: 1,
    explanation: "By default, actions/checkout performs a shallow clone (depth 1). Commitlint needs access to all commits in the PR (from base to head) to validate each message, which requires the full history within that range."
  }
]} />

## Cleanup

```bash
# Remove commitlint and husky
npm uninstall @commitlint/cli @commitlint/config-conventional husky
rm -f commitlint.config.js
rm -rf .husky

# Remove workflow files
rm -f .github/workflows/commit-lint.yml
rm -f .github/workflows/traceability-check.yml

# Clean up test branches
git checkout main
git branch -D bugfix/payment-timeout-handling 2>/dev/null

# Reset to clean state
git add -A
git commit -m "chore: remove traceability lab artifacts"
git push origin main
```
