---
sidebar_position: 1
title: "Challenge 01: Design flow of work"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 01: Design flow of work

## Exam skills covered

- Design and implement a structure for the flow of work, including GitHub Flow

## Platform focus

GitHub-first

## Scenario

Contoso Ltd has five development teams working on a single monorepo. Each team invented its own branching strategy: some use long-lived feature branches, others commit directly to main, and one team maintains four parallel release branches. The result is predictable chaos. Merges regularly take two to three days to resolve conflicts, main is broken at least once per sprint, and nobody knows which branch represents the production state. The VP of Engineering has mandated a unified workflow based on GitHub Flow, with guardrails that prevent direct pushes and broken merges.

---

## Prerequisites

- A GitHub organization with at least one repository (create `contoso-flow-demo` for this lab)
- GitHub CLI installed and authenticated (`gh auth login`)
- Admin access to the repository for branch protection configuration
- Basic familiarity with Git branching concepts

---

## Task 1: Understand and compare branching strategies

Before implementing anything, you need to understand the three dominant strategies and when each applies.

### GitHub Flow

- Single long-lived branch: `main`
- Developers create short-lived feature branches from `main`
- Pull requests are opened early for discussion
- CI runs on every push to the PR branch
- After review and green CI, the PR merges to `main`
- `main` is always deployable; deployments happen from `main`

### GitFlow

- Long-lived branches: `main` (production) and `develop` (integration)
- Feature branches branch from `develop`
- Release branches branch from `develop` when preparing a release
- Hotfix branches branch from `main`
- Best for: software with formal release cycles (mobile apps, packaged software)

### Trunk-based development

- Single branch: `main` (the trunk)
- Developers commit directly to `main` or use extremely short-lived branches (less than one day)
- Relies heavily on feature flags for incomplete work
- Requires comprehensive automated testing
- Best for: high-performing teams with mature CI/CD and feature flag infrastructure

### When to choose GitHub Flow (Contoso's case)

GitHub Flow is the right choice for Contoso because:

- They deploy web services continuously (no formal release windows)
- Teams need a simple, consistent model everyone can follow
- They want CI validation before any code reaches main
- They do not need the complexity of release branches

Document your comparison in a decision record:

```bash
mkdir -p docs/decisions
cat > docs/decisions/001-branching-strategy.md << 'EOF'
# ADR 001: Adopt GitHub Flow as unified branching strategy

## Status
Accepted

## Context
Five teams use inconsistent branching strategies causing merge conflicts,
broken main branch, and unclear production state.

## Decision
Adopt GitHub Flow: short-lived feature branches, PR-based merges to main,
deploy from main.

## Consequences
- All teams follow one workflow
- Main is always deployable
- No long-lived branches (feature flags for incomplete work)
- Requires branch protection and CI gates
EOF
```

---

## Task 2: Create the repository and implement GitHub Flow

Create the demo repository and set up the initial structure:

```bash
# Create a new repository
gh repo create contoso-flow-demo --public --clone --description "Contoso GitHub Flow demo"
cd contoso-flow-demo

# Initialize with a README and basic structure
cat > README.md << 'EOF'
# Contoso Flow Demo

This repository demonstrates GitHub Flow with branch protection,
required CI checks, and automated merge policies.

## Workflow

1. Create a feature branch from main
2. Make changes and push
3. Open a pull request
4. Wait for CI checks and code review
5. Merge to main (squash merge preferred)
6. Deploy from main
EOF

git add -A
git commit -m "feat: initial repository structure"
git push origin main
```

Demonstrate the workflow by creating a feature branch:

```bash
# Create a feature branch
git checkout -b feature/add-user-service

# Make changes
mkdir -p src
cat > src/user-service.js << 'EOF'
class UserService {
  constructor(database) {
    this.db = database;
  }

  async getUser(id) {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }
}

module.exports = UserService;
EOF

git add -A
git commit -m "feat: add user service with basic query support"
git push origin feature/add-user-service

# Open a pull request
gh pr create \
  --title "feat: add user service" \
  --body "Adds UserService class with database query support.

## Changes
- New UserService class in src/user-service.js
- Basic getUser method with parameterized query

## Testing
- Unit tests pending CI pipeline setup" \
  --base main
```

---

## Task 3: Configure branch protection rules

Set up branch protection to enforce the GitHub Flow guardrails:

```bash
# Configure branch protection for main using GitHub CLI
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci/build","ci/test"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false

# Verify the protection is applied
gh api repos/{owner}/{repo}/branches/main/protection --jq '{
  required_reviews: .required_pull_request_reviews.required_approving_review_count,
  dismiss_stale: .required_pull_request_reviews.dismiss_stale_reviews,
  strict_status: .required_status_checks.strict,
  checks: .required_status_checks.contexts,
  enforce_admins: .enforce_admins.enabled
}'
```

Using the newer branch ruleset approach (recommended for organizations):

```bash
# Create a ruleset for the main branch
gh api repos/{owner}/{repo}/rulesets \
  --method POST \
  --input - << 'EOF'
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
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_reviews": true,
        "require_last_push_approval": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          {"context": "ci/build"},
          {"context": "ci/test"}
        ]
      }
    },
    {
      "type": "deletion"
    },
    {
      "type": "non_fast_forward"
    }
  ]
}
EOF
```

---

## Task 4: Set up pull request templates

Create a PR template that enforces consistency:

```bash
mkdir -p .github

cat > .github/pull_request_template.md << 'EOF'
## Summary

<!-- Describe what this PR does in 1-2 sentences -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would break existing functionality)
- [ ] Documentation update

## Related issues

<!-- Link related issues: Fixes #123, Relates to #456 -->

## How has this been tested?

<!-- Describe the tests you ran -->

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing performed

## Checklist

- [ ] My code follows the project style guidelines
- [ ] I have performed a self-review
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing unit tests pass locally
- [ ] Any dependent changes have been merged
EOF

git add .github/pull_request_template.md
git commit -m "chore: add pull request template"
git push origin main
```

---

## Task 5: Configure auto-merge when checks pass

Enable auto-merge so PRs merge automatically once all required checks pass and reviews are approved:

```bash
# Enable auto-merge on the repository
gh api repos/{owner}/{repo} \
  --method PATCH \
  --field allow_auto_merge=true \
  --field delete_branch_on_merge=true \
  --field allow_squash_merge=true \
  --field allow_merge_commit=false \
  --field allow_rebase_merge=true \
  --field squash_merge_commit_title="PR_TITLE" \
  --field squash_merge_commit_message="PR_BODY"
```

Now developers can enable auto-merge on their PRs:

```bash
# After opening a PR, enable auto-merge
gh pr merge --auto --squash

# The PR will merge automatically when:
# 1. All required status checks pass
# 2. Required reviews are approved
# 3. Branch is up to date with main (if strict mode enabled)
```

---

## Task 6: Implement a CI workflow that enforces the strategy

Create a GitHub Actions workflow that validates the branching model:

```bash
mkdir -p .github/workflows

cat > .github/workflows/ci.yml << 'EOF'
name: CI Pipeline

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run build
        run: npm run build

  test:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

  validate-branch-name:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - name: Check branch naming convention
        run: |
          BRANCH_NAME="${{ github.head_ref }}"
          PATTERN="^(feature|bugfix|hotfix|chore|docs)/[a-z0-9._-]+$"
          if [[ ! "$BRANCH_NAME" =~ $PATTERN ]]; then
            echo "::error::Branch name '$BRANCH_NAME' does not match pattern: $PATTERN"
            echo "Valid prefixes: feature/, bugfix/, hotfix/, chore/, docs/"
            exit 1
          fi
          echo "Branch name '$BRANCH_NAME' is valid"

  enforce-no-long-lived-branches:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check branch age
        run: |
          BRANCH_CREATED=$(git log --format=%ci --diff-filter=A --follow HEAD | tail -1)
          DAYS_OLD=$(( ($(date +%s) - $(date -d "$BRANCH_CREATED" +%s)) / 86400 ))
          if [ "$DAYS_OLD" -gt 7 ]; then
            echo "::warning::This branch is $DAYS_OLD days old. GitHub Flow recommends short-lived branches (< 7 days)."
          fi
EOF

git add .github/workflows/ci.yml
git commit -m "ci: add pipeline with branch name validation"
git push origin main
```

---

## Break & fix

### Scenario 1: Someone pushes directly to main

A developer bypasses the workflow and pushes directly to main:

```bash
# Simulate: try to push directly to main
git checkout main
echo "quick fix" >> README.md
git add -A
git commit -m "quick fix"
git push origin main
```

**Expected behavior:** The push is rejected because branch protection requires PRs.

**If protection is not working, verify:**

<details>
<summary>Show solution</summary>

```bash
gh api repos/{owner}/{repo}/branches/main/protection \
  --jq '.enforce_admins.enabled'
# Should be true - admins are also subject to protection

gh api repos/{owner}/{repo}/branches/main/protection \
  --jq '.required_pull_request_reviews.required_approving_review_count'
# Should be >= 1
```

</details>

### Scenario 2: A PR merges with failing checks

The status check context names must match exactly what your CI reports.

<details>
<summary>Show solution</summary>

```bash
# List recent check runs to see their exact names
gh api repos/{owner}/{repo}/commits/main/check-runs \
  --jq '.check_runs[].name'

# Update branch protection with correct check names if mismatched
gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks \
  --method PATCH \
  --field strict=true \
  --field contexts='["build","test","validate-branch-name"]'
```

</details>

### Scenario 3: Stale PR approvals persist after new commits

After a reviewer approves, the developer pushes new commits. The old approval should be dismissed.

<details>
<summary>Show solution</summary>

```bash
# Verify dismiss_stale_reviews is enabled
gh api repos/{owner}/{repo}/branches/main/protection/required_pull_request_reviews \
  --jq '.dismiss_stale_reviews'
# Must be true
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "In GitHub Flow, what is the role of the 'main' branch?",
    options: [
      "It serves as the integration branch where features are combined before release",
      "It is always in a deployable state and represents production",
      "It is locked and only updated during release windows",
      "It mirrors the develop branch after each sprint"
    ],
    correctIndex: 1,
    explanation: "In GitHub Flow, main is always deployable. Deployments happen directly from main, so it must never be in a broken state."
  },
  {
    question: "Which branch protection setting ensures a PR cannot merge if new commits were pushed to main after the PR branch was created?",
    options: [
      "Require code owner reviews",
      "Require status checks to pass before merging",
      "Require branches to be up to date before merging (strict mode)",
      "Dismiss stale pull request approvals"
    ],
    correctIndex: 2,
    explanation: "The \"strict\" option in required status checks forces the PR branch to be rebased on the latest main before merging, preventing merge skew."
  },
  {
    question: "When should you choose GitFlow over GitHub Flow?",
    options: [
      "When you need continuous deployment to production",
      "When you have a single team with trunk-based development expertise",
      "When you release packaged software with formal version numbers and support windows",
      "When you want the simplest possible workflow"
    ],
    correctIndex: 2,
    explanation: "GitFlow is designed for software with formal releases (mobile apps, boxed software) where you maintain multiple versions simultaneously."
  },
  {
    question: "What does enabling auto-merge with squash on a repository accomplish?",
    options: [
      "PRs merge immediately without any checks",
      "PRs merge automatically once all required conditions are satisfied, combining all commits into one",
      "PRs are force-merged even if reviews are pending",
      "PRs are automatically rebased and merged on a nightly schedule"
    ],
    correctIndex: 1,
    explanation: "Auto-merge with squash waits for all branch protection requirements (checks, reviews) and then merges with a single squash commit for a clean history."
  }
]} />

## Cleanup

```bash
# Delete the demo repository
gh repo delete contoso-flow-demo --yes

# Remove the local clone
cd ..
rm -rf contoso-flow-demo
```
