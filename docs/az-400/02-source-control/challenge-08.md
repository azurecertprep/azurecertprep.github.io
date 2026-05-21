---
sidebar_position: 2
title: 'Challenge 08: Pull request workflows'
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 08: Pull request workflows

:::info Platform: GitHub-first
:::

## Exam skills

- Design and implement a pull request workflow by using branch policies and branch protection rules
- Implement branch merging restrictions by using branch policies and branch protection rules

## Scenario

Contoso Ltd had two production incidents last month caused by unreviewed code. Junior developers are pushing directly to `main`, bypassing code review entirely. The lead developer noticed that a SQL injection vulnerability made it to production because no one reviewed the database query changes. The VP of Engineering has mandated that all code must go through pull request review with automated checks before merging. You need to implement branch protection rules across both GitHub and Azure Repos to prevent direct pushes and enforce quality gates.

## Tasks

### Task 1: Configure GitHub branch protection rules

Set up comprehensive branch protection on the `main` branch:

```bash
# Using GitHub CLI to configure branch protection
# First, create a branch ruleset (modern approach, replaces legacy branch protection)
gh api repos/contoso/platform-api/rulesets --method POST --input - << 'EOF'
{
  "name": "Main branch protection",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 2,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": true,
        "require_last_push_approval": true,
        "required_review_thread_resolution": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_status_checks_policy": true,
        "required_status_checks": [
          { "context": "ci/build" },
          { "context": "ci/test" },
          { "context": "security/scan" }
        ]
      }
    },
    {
      "type": "required_signatures"
    },
    {
      "type": "non_fast_forward"
    },
    {
      "type": "deletion"
    }
  ],
  "bypass_actors": [
    {
      "actor_id": 1,
      "actor_type": "RepositoryRole",
      "bypass_mode": "pull_request"
    }
  ]
}
EOF
```

Alternatively, configure via legacy branch protection (still widely used):

```bash
# Enable branch protection using gh CLI
gh api repos/contoso/platform-api/branches/main/protection --method PUT --input - << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci/build", "ci/test", "security/scan"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismissal_restrictions": {},
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 2,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
EOF
```

### Task 2: Set up CODEOWNERS file for automatic reviewer assignment

Create a `CODEOWNERS` file in the repository root:

```bash
# .github/CODEOWNERS
# Each line defines a pattern and the team/individuals responsible for review

# Default owners for everything in the repo
* @contoso/platform-team

# Backend API owners
/src/api/ @contoso/backend-team
/src/api/billing/ @contoso/billing-team @sarah-lead

# Frontend owners
/src/web/ @contoso/frontend-team
/src/web/components/ @contoso/ui-team

# Infrastructure and DevOps
/infrastructure/ @contoso/devops-team
/scripts/ @contoso/devops-team
/.github/workflows/ @contoso/devops-team

# Database migrations require DBA review
/src/db/migrations/ @contoso/dba-team @mike-dba

# Security-sensitive files require security team
/src/auth/ @contoso/security-team
/src/crypto/ @contoso/security-team
**/security*.yml @contoso/security-team

# Documentation
/docs/ @contoso/docs-team

# Package manifests
package.json @contoso/platform-team @contoso/security-team
package-lock.json @contoso/platform-team
```

Verify CODEOWNERS syntax:

```bash
# GitHub validates CODEOWNERS automatically
# Check it locally with a linting tool
npm install -g github-codeowners
github-codeowners validate
```

### Task 3: Configure required status checks

Create the CI workflow that branch protection references:

```yaml
# .github/workflows/ci.yml
name: CI Pipeline
on:
  pull_request:
    branches: [main]

jobs:
  build:
    name: ci/build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build

  test:
    name: ci/test
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage ${COVERAGE}% is below 80% threshold"
            exit 1
          fi

  security-scan:
    name: security/scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run CodeQL analysis
        uses: github/codeql-action/init@v3
        with:
          languages: javascript
      - uses: github/codeql-action/analyze@v3
      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
```

### Task 4: Set up merge queue for busy repos

Configure merge queue to batch and test PRs together before merging:

```bash
# Enable merge queue via GitHub API
gh api repos/contoso/platform-api/rulesets --method POST --input - << 'EOF'
{
  "name": "Merge queue enforcement",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "merge_queue",
      "parameters": {
        "check_response_timeout_minutes": 30,
        "grouping_strategy": "ALLGREEN",
        "max_entries_to_build": 5,
        "max_entries_to_merge": 5,
        "merge_method": "squash",
        "min_entries_to_merge": 1,
        "min_entries_to_merge_wait_minutes": 5
      }
    }
  ]
}
EOF
```

Create a merge queue workflow:

```yaml
# .github/workflows/merge-queue.yml
name: Merge queue CI
on:
  merge_group:
    types: [checks_requested]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - run: npm test
      - name: Integration tests
        run: npm run test:integration
```

### Task 5: Configure Azure Repos branch policies

Set up equivalent protection in Azure DevOps:

```bash
# Set minimum number of reviewers
az repos policy approver-count create \
  --project "Contoso-Platform" \
  --repository-id $(az repos show --repository "platform-api" --query id -o tsv) \
  --branch main \
  --minimum-approver-count 2 \
  --creator-vote-counts false \
  --allow-downvotes false \
  --reset-on-source-push true \
  --blocking true \
  --enabled true

# Require linked work items
az repos policy work-item-linking create \
  --project "Contoso-Platform" \
  --repository-id $(az repos show --repository "platform-api" --query id -o tsv) \
  --branch main \
  --blocking true \
  --enabled true

# Require build validation
az repos policy build create \
  --project "Contoso-Platform" \
  --repository-id $(az repos show --repository "platform-api" --query id -o tsv) \
  --branch main \
  --build-definition-id 42 \
  --display-name "CI Build Validation" \
  --queue-on-source-update-only true \
  --valid-duration 720 \
  --blocking true \
  --enabled true

# Require comment resolution
az repos policy comment-required create \
  --project "Contoso-Platform" \
  --repository-id $(az repos show --repository "platform-api" --query id -o tsv) \
  --branch main \
  --blocking true \
  --enabled true

# Require merge strategy (squash only)
az repos policy merge-strategy create \
  --project "Contoso-Platform" \
  --repository-id $(az repos show --repository "platform-api" --query id -o tsv) \
  --branch main \
  --allow-squash true \
  --allow-no-fast-forward false \
  --allow-rebase false \
  --allow-rebase-merge false \
  --blocking true \
  --enabled true
```

### Task 6: PR size limits and auto-labeling

Create a workflow to label PRs by size and warn about large PRs:

```yaml
# .github/workflows/pr-size-labeler.yml
name: PR size labeler
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  label:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Calculate PR size and apply label
        uses: actions/github-script@v7
        with:
          script: |
            const { data: files } = await github.rest.pulls.listFiles({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number,
            });

            const changes = files.reduce((sum, f) => sum + f.additions + f.deletions, 0);
            const fileCount = files.length;

            let label, comment;
            if (changes <= 50 && fileCount <= 5) {
              label = 'size/S';
            } else if (changes <= 200 && fileCount <= 15) {
              label = 'size/M';
            } else if (changes <= 500) {
              label = 'size/L';
              comment = 'This PR has over 200 lines changed. Consider splitting into smaller PRs for easier review.';
            } else {
              label = 'size/XL';
              comment = 'This PR has over 500 lines changed. Large PRs are difficult to review thoroughly and increase the risk of bugs. Please split this into smaller, focused PRs.';
            }

            // Remove existing size labels
            const existingLabels = (await github.rest.issues.listLabelsOnIssue({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            })).data.map(l => l.name).filter(n => n.startsWith('size/'));

            for (const l of existingLabels) {
              await github.rest.issues.removeLabel({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                name: l,
              });
            }

            // Add new label
            await github.rest.issues.addLabels({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              labels: [label],
            });

            // Comment if PR is too large
            if (comment) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: comment,
              });
            }
```

### Task 7: Implement PR templates with checklist

Create a pull request template:

```markdown
<!-- .github/pull_request_template.md -->
## Summary

<!-- Brief description of what this PR does -->

## Related issues

<!-- Link to related issues: Closes #123, Fixes #456 -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Infrastructure/CI change

## Checklist

- [ ] My code follows the project style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have added tests that prove my fix or feature works
- [ ] New and existing unit tests pass locally
- [ ] I have updated documentation where applicable
- [ ] I have checked for security implications
- [ ] I have not committed any secrets or credentials
- [ ] My changes generate no new warnings or errors

## Testing

<!-- Describe the tests you ran and how to reproduce -->

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Deployment notes

<!-- Any special deployment considerations? Database migrations? Feature flags? -->
```

Create a specialized template for hotfixes:

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE/hotfix.md -->
## Hotfix summary

**Severity**: [ ] P1 - Service down [ ] P2 - Major degradation [ ] P3 - Minor issue

**Incident link**: <!-- Link to incident or on-call ticket -->

## Root cause

<!-- What caused the issue? -->

## Fix description

<!-- What does this fix do? -->

## Risk assessment

- [ ] Change is minimal and targeted
- [ ] Rollback plan identified
- [ ] Monitoring dashboards checked

## Checklist

- [ ] Fix verified in staging/dev
- [ ] Tests added to prevent regression
- [ ] On-call team notified
- [ ] Post-incident review scheduled
```

## Break and fix

### Scenario 1: Required status check never completes

A developer creates a PR but the required `ci/build` status check is stuck as "pending" and never reports back. The PR cannot be merged.

**Diagnosis**:

```bash
# Check the workflow runs for this PR
gh run list --branch feature/new-endpoint --limit 5

# Check if the workflow file name matches the required check name
gh api repos/contoso/platform-api/branches/main/protection/required_status_checks

# Common issue: the check context name in branch protection doesn't match
# the job name or workflow name in the YAML
```


<details>
<summary>Show solution</summary>

**Fix**: The required status check name `ci/build` must match the `name:` field of the job, not the workflow name. Update the workflow job name:

```yaml
jobs:
  build:
    name: ci/build  # This must match the required status check context
    runs-on: ubuntu-latest
```

Or update the branch protection to match the existing job name:

```bash
gh api repos/contoso/platform-api/branches/main/protection/required_status_checks \
  --method PATCH --input - << 'EOF'
{
  "strict": true,
  "contexts": ["build", "test", "security-scan"]
}
EOF
```

</details>

### Scenario 2: CODEOWNERS file not triggering reviewer assignment

PRs modifying `/src/api/billing/` are not automatically requesting review from `@contoso/billing-team` despite being listed in CODEOWNERS.

**Diagnosis**:

```bash
# Check if CODEOWNERS is in the correct location
# Must be in: .github/CODEOWNERS, CODEOWNERS, or docs/CODEOWNERS
find . -name "CODEOWNERS" -type f

# Verify the team exists and has read access to the repo
gh api orgs/contoso/teams/billing-team/repos/contoso/platform-api

# Check if "Require review from Code Owners" is enabled in branch protection
gh api repos/contoso/platform-api/branches/main/protection/required_pull_request_reviews \
  | jq '.require_code_owner_reviews'
```


<details>
<summary>Show solution</summary>

**Fix**: The team must have at least write access to the repository, and code owner reviews must be enabled:

```bash
# Grant the team write access
gh api orgs/contoso/teams/billing-team/repos/contoso/platform-api \
  --method PUT -f permission=push

# Enable code owner review requirement
gh api repos/contoso/platform-api/branches/main/protection/required_pull_request_reviews \
  --method PATCH --input - << 'EOF'
{
  "require_code_owner_reviews": true,
  "required_approving_review_count": 2
}
EOF
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "A repository has branch protection requiring 2 approving reviews and the 'ci/test' status check. A developer pushes a new commit to their PR branch after receiving 2 approvals. What happens?",
    options: [
      "The PR can still be merged because it already has 2 approvals",
      "The approvals are dismissed and the developer needs 2 new reviews",
      "Only 1 new approval is needed since the previous reviewers saw most of the code",
      "The PR is automatically closed and must be reopened"
    ],
    correctIndex: 1,
    explanation: "When \"Dismiss stale pull request approvals when new commits are pushed\" is enabled (configured in Task 1 with dismiss_stale_reviews_on_push: true), any new commits pushed to the PR branch automatically dismiss all existing approvals. This ensures reviewers approve the final version of the code, not an earlier version that may have changed."
  },
  {
    question: "In Azure Repos, what is the effect of setting \"Reset code reviewer votes when there are new changes\" on a branch policy?",
    options: [
      "All reviewers are removed from the PR",
      "Reviewer votes are reset to no vote, requiring re-approval",
      "Only the votes of reviewers whose files changed are reset",
      "The PR is moved back to draft status"
    ],
    correctIndex: 1,
    explanation: "This Azure Repos setting is equivalent to GitHub's \"Dismiss stale reviews on push.\" When new changes are pushed to the source branch, all existing reviewer votes (Approve, Approve with suggestions, Wait for author, Reject) are reset to \"No vote,\" requiring reviewers to re-evaluate and vote again on the updated code."
  },
  {
    question: "A CODEOWNERS file contains these entries in order. Who is required to review a change to '/src/api/billing/invoice.ts'?  ''' * @contoso/platform-team /src/api/ @contoso/backend-team /src/api/billing/ @contoso/billing-team @sarah-lead '''",
    options: [
      "'@contoso/platform-team' only (first match wins)",
      "'@contoso/backend-team' only (parent directory match)",
      "'@contoso/billing-team' and '@sarah-lead' (last matching pattern wins)",
      "All three teams and individuals listed"
    ],
    correctIndex: 2,
    explanation: "CODEOWNERS uses a last-match-wins rule, similar to .gitignore. The file is evaluated from top to bottom, and the last matching pattern determines the code owners. Since /src/api/billing/ matches the file path and appears after the other patterns, only @contoso/billing-team and @sarah-lead are assigned as required reviewers."
  },
  {
    question: "What is the primary purpose of a merge queue in GitHub?",
    options: [
      "To limit the number of PRs that can be open at one time",
      "To ensure PRs are merged in the order they were created",
      "To batch-test multiple approved PRs together against main before merging, preventing broken builds from concurrent merges",
      "To automatically resolve merge conflicts between competing PRs"
    ],
    correctIndex: 2,
    explanation: "A merge queue solves the \"semantic conflict\" problem where two PRs individually pass CI against main, but when both are merged, they break each other. The merge queue creates temporary merge groups that test PRs together, ensuring they are compatible before merging to main. If a group fails, the queue bisects to find the problematic PR and removes it."
  }
]} />

## Cleanup

```bash
# Remove branch protection (for testing purposes only)
gh api repos/contoso/platform-api/branches/main/protection --method DELETE

# Remove CODEOWNERS file if testing
rm .github/CODEOWNERS

# Remove workflow files created during this challenge
rm .github/workflows/ci.yml
rm .github/workflows/merge-queue.yml
rm .github/workflows/pr-size-labeler.yml
rm .github/pull_request_template.md
rm .github/PULL_REQUEST_TEMPLATE/hotfix.md

# Remove branch policies in Azure DevOps
az repos policy list --project "Contoso-Platform" --repository-id <repo-id> --query "[].id" -o tsv | \
  xargs -I {} az repos policy delete --id {} --project "Contoso-Platform" --yes

# Verify no policies remain
az repos policy list --project "Contoso-Platform" --branch main
```
