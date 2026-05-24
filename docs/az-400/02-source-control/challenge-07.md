---
sidebar_position: 1
title: 'Challenge 07: Branching strategies'
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 07: Branching strategies

:::info Platform: GitHub-first
:::

## Exam skills

- Design a branch strategy, including trunk-based, feature branch, and release branch

## Scenario

Contoso Ltd has three development teams working on a shared platform. Team Alpha ships weekly (mobile API), Team Beta ships bi-weekly (web dashboard), and Team Gamma ships monthly (billing engine). Each team adopted a different branching approach without coordination. The result: integration pain every release, broken builds when branches diverge for weeks, and hotfixes that never make it back to feature branches. The CTO has mandated that `main` must always be deployable and each team needs a branching strategy suited to their cadence.

## Tasks

### Task 1: Implement trunk-based development for Team Alpha (weekly releases)

Trunk-based development keeps all developers working on a single branch with short-lived feature branches (less than 24 hours) and feature flags to hide incomplete work.

```bash
# Clone the repository
git clone https://github.com/contoso/platform-api.git
cd platform-api

# Create a short-lived feature branch (should live < 1 day)
git checkout -b feature/add-rate-limiting
# Make changes...
git add .
git commit -m "feat: add rate limiting middleware"

# Rebase onto main before pushing (keep history linear)
git fetch origin
git rebase origin/main

# Push and create PR (will be merged same day)
git push origin feature/add-rate-limiting
gh pr create --title "Add rate limiting middleware" \
  --body "Short-lived branch - feature flagged behind RATE_LIMIT_ENABLED" \
  --base main

# After PR approval, merge with squash to keep main clean
gh pr merge --squash --delete-branch
```

Implement a feature flag to hide incomplete work:

```json
// config/feature-flags.json
{
  "RATE_LIMIT_ENABLED": {
    "enabled": false,
    "rollout_percentage": 0,
    "description": "Enable API rate limiting (in progress)"
  }
}
```

Configure continuous deployment from main:

```yaml
# .github/workflows/deploy-on-merge.yml
name: Deploy on merge to main
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
      - name: Deploy to production
        run: |
          az webapp deploy --resource-group contoso-prod \
            --name contoso-platform-api \
            --src-path ./dist
```

### Task 2: Implement GitHub Flow for Team Beta (bi-weekly releases)

GitHub Flow uses feature branches with pull requests merged to main, followed by a deployment.

```bash
# Start a feature branch from main
git checkout main
git pull origin main
git checkout -b feature/dashboard-dark-mode

# Work on the feature over several days
git add .
git commit -m "feat: add dark mode toggle to header"
git add .
git commit -m "feat: implement dark mode CSS variables"
git add .
git commit -m "test: add dark mode toggle tests"

# Push the branch and open a PR
git push origin feature/dashboard-dark-mode
gh pr create --title "Dashboard dark mode support" \
  --body "Implements dark mode toggle. Closes #234" \
  --base main \
  --reviewer "@contoso/web-team" \
  --label "enhancement"

# After review and CI passes, merge
gh pr merge --merge --delete-branch
```

Set up a scheduled deployment for bi-weekly releases:

```yaml
# .github/workflows/biweekly-release.yml
name: Bi-weekly release
on:
  schedule:
    - cron: '0 10 1,15 * *'  # 10 AM on 1st and 15th
  workflow_dispatch:

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create release tag
        run: |
          VERSION="v$(date +%Y.%m.%d)"
          git tag -a "$VERSION" -m "Bi-weekly release $VERSION"
          git push origin "$VERSION"
      - name: Deploy to staging
        run: ./scripts/deploy.sh staging
      - name: Run smoke tests
        run: npm run test:smoke
      - name: Deploy to production
        run: ./scripts/deploy.sh production
```

### Task 3: Implement release branching for Team Gamma (monthly releases)

Release branching maintains long-lived release branches for supporting older versions while main moves forward.

```bash
# Create a release branch when feature-complete
git checkout main
git pull origin main
git checkout -b release/v2.1
git push origin release/v2.1

# Continue development on main for next release
git checkout main
git checkout -b feature/new-billing-engine
# ... work on v2.2 features ...

# Bug fix on the release branch
git checkout release/v2.1
git checkout -b hotfix/fix-invoice-calculation
git add .
git commit -m "fix: correct tax calculation for EU invoices"
git push origin hotfix/fix-invoice-calculation
gh pr create --title "Fix invoice calculation" --base release/v2.1

# After merging to release, cherry-pick to main
git checkout main
git cherry-pick <commit-sha>
git push origin main

# Tag the release when ready to ship
git checkout release/v2.1
git tag -a v2.1.0 -m "Release v2.1.0 - Monthly billing release"
git push origin v2.1.0

# Patch release for hotfix
git tag -a v2.1.1 -m "Release v2.1.1 - Fix EU tax calculation"
git push origin v2.1.1
```

### Task 4: Decision framework - when to use which strategy

Create a decision matrix document:

#### Branching strategy decision framework

| Factor                  | Trunk-based        | GitHub Flow        | Release branching    |
|-------------------------|--------------------|--------------------|----------------------|
| Release cadence         | Daily/weekly       | Bi-weekly          | Monthly/quarterly    |
| Team size               | Any                | Small-medium       | Medium-large         |
| Deployment automation   | Required (CD)      | Recommended        | Optional             |
| Feature flags needed    | Yes                | Optional           | No                   |
| Support old versions    | No                 | No                 | Yes                  |
| Code review gate        | Optional (pair)    | Required (PR)      | Required (PR)        |
| Rollback strategy       | Feature flag off   | Revert commit      | Deploy prior release |
| Integration risk        | Low (always merged)| Medium             | High (long-lived)    |

### Task 5: Handling long-lived branches without drift

Prevent release branches from diverging too far from main:

```bash
# Schedule regular syncs from main to release (automate this)
git checkout release/v2.1
git merge main --no-edit
# Resolve any conflicts
git push origin release/v2.1
```

Automate drift detection with a GitHub Action:

```yaml
# .github/workflows/branch-drift-check.yml
name: Branch drift detection
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM

jobs:
  check-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Check drift between main and release branches
        run: |
          for branch in $(git branch -r | grep 'release/'); do
            AHEAD=$(git rev-list --count "origin/main..${branch}")
            BEHIND=$(git rev-list --count "${branch}..origin/main")
            echo "Branch ${branch}: ${BEHIND} commits behind, ${AHEAD} commits ahead"
            if [ "$BEHIND" -gt 50 ]; then
              echo "::warning::${branch} is ${BEHIND} commits behind main - sync needed"
              gh issue create --title "Branch drift: ${branch} is ${BEHIND} commits behind" \
                --body "Please merge main into ${branch} to reduce drift." \
                --label "maintenance"
            fi
          done
```

### Task 6: Demonstrate merge vs rebase workflows

**Merge workflow** (preserves history, shows where branch diverged):

```bash
# Feature branch with merge
git checkout -b feature/payment-gateway
git commit -m "feat: add Stripe integration"
git commit -m "feat: add payment webhook handler"

# Merge into main (creates merge commit)
git checkout main
git merge feature/payment-gateway --no-ff
# Creates: "Merge branch 'feature/payment-gateway' into main"
```

**Rebase workflow** (linear history, cleaner log):

```bash
# Feature branch with rebase
git checkout -b feature/payment-gateway
git commit -m "feat: add Stripe integration"
git commit -m "feat: add payment webhook handler"

# Rebase onto latest main (replays commits on top)
git fetch origin
git rebase origin/main

# Fast-forward merge (no merge commit)
git checkout main
git merge feature/payment-gateway --ff-only
```

**Interactive rebase to clean up before PR**:

```bash
# Squash 5 messy commits into 2 clean ones
git rebase -i HEAD~5

# In the editor:
# pick abc1234 feat: add Stripe integration
# squash def5678 wip: stripe config
# squash ghi9012 fix: typo in stripe key
# pick jkl3456 feat: add payment webhook handler
# squash mno7890 fix: webhook signature validation
```

## Break & fix

### Scenario 1: Merge conflict from stale release branch

A release branch has not been synced with main for 3 weeks. A critical hotfix on the release branch conflicts with refactored code on main.

```bash
# Simulate the problem
git checkout main
echo "class PaymentProcessor:" > billing/processor.py
echo "    def calculate(self, amount):" >> billing/processor.py
echo "        return amount * 1.2" >> billing/processor.py
git add . && git commit -m "refactor: rename billing processor"

git checkout release/v2.1
echo "class BillingEngine:" > billing/processor.py
echo "    def calculate(self, amount):" >> billing/processor.py
echo "        return amount * 1.15  # hotfix: correct tax rate" >> billing/processor.py
git add . && git commit -m "fix: correct tax rate"

# Now try to merge main into release
git merge main
# CONFLICT in billing/processor.py
```


<details>
<summary>Show solution</summary>

**Fix**: Resolve the conflict by keeping the hotfix logic in the refactored structure:

```bash
# Edit the file to resolve
cat > billing/processor.py << 'EOF'
class PaymentProcessor:
    def calculate(self, amount):
        return amount * 1.15  # hotfix: correct tax rate
EOF

git add billing/processor.py
git commit -m "merge: resolve conflict keeping hotfix tax rate in refactored class"
```

</details>

### Scenario 2: Accidentally pushed to main (bypassing branch strategy)

A developer pushed 3 commits directly to main instead of using a feature branch.

```bash
# Identify the bad commits
git log --oneline -5 main

# Create a branch from the bad commits to preserve work
git checkout main
git branch feature/recover-direct-push

# Reset main to before the direct pushes
git reset --hard HEAD~3
git push origin main --force-with-lease

# The work is preserved on the feature branch for a proper PR
git checkout feature/recover-direct-push
git push origin feature/recover-direct-push
gh pr create --title "Recover: direct push to main" --base main
```

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "A team releases daily and needs main always deployable. They use feature flags to hide incomplete work. Which branching strategy best fits this requirement?",
    options: [
      "Git Flow with develop and release branches",
      "Trunk-based development with short-lived branches",
      "Release branching with long-lived support branches",
      "GitHub Flow with feature branches lasting 1-2 weeks"
    ],
    correctIndex: 1,
    explanation: "Trunk-based development is designed for continuous delivery. Short-lived branches (ideally less than a day) minimize integration risk, and feature flags allow incomplete features to exist in production without being visible to users. This supports daily releases because main is always in a deployable state."
  },
  {
    question: "What is the primary risk of maintaining long-lived release branches?",
    options: [
      "They consume too much disk space",
      "They drift from main, causing increasingly complex merge conflicts",
      "They prevent other developers from creating branches",
      "They slow down git clone operations"
    ],
    correctIndex: 1,
    explanation: "Long-lived branches accumulate changes that differ from main. The longer they live without syncing, the more the codebases diverge, leading to painful merge conflicts. Regular forward-integration (merging main into the release branch) mitigates this risk."
  },
  {
    question: "When using 'git rebase' instead of 'git merge' for a feature branch, what happens to the branch history?",
    options: [
      "The feature branch commits are replayed on top of the target branch, creating new commit hashes",
      "A merge commit is created that combines both histories",
      "The feature branch commits are deleted and replaced with a single squash commit",
      "The target branch history is rewritten to include the feature commits in chronological order"
    ],
    correctIndex: 0,
    explanation: "Rebase takes each commit from the feature branch and re-applies it on top of the target branch tip. This creates new commits with different SHA hashes (because the parent commit changed) but the same changes. The result is a linear history without merge commits."
  },
  {
    question: "A team uses GitHub Flow. A critical bug is found in production. What is the correct procedure?",
    options: [
      "Create a hotfix branch from the release tag, fix, merge to release, then cherry-pick to main",
      "Create a branch from main, fix the bug, open a PR, merge to main, deploy",
      "Commit the fix directly to main and deploy immediately",
      "Revert main to the last known good state, then re-apply features"
    ],
    correctIndex: 1,
    explanation: "In GitHub Flow, main is the single source of truth. All changes go through the same process: branch from main, make changes, open a PR, get review, merge, deploy. Hotfixes follow the same workflow but with expedited review. There are no separate release branches in GitHub Flow."
  }
]} />

## Cleanup

```bash
# Delete feature branches created during this challenge
git branch -d feature/add-rate-limiting 2>/dev/null
git branch -d feature/dashboard-dark-mode 2>/dev/null
git branch -d feature/new-billing-engine 2>/dev/null
git branch -d feature/payment-gateway 2>/dev/null
git branch -d feature/recover-direct-push 2>/dev/null
git branch -d hotfix/fix-invoice-calculation 2>/dev/null

# Delete release branches
git branch -d release/v2.1 2>/dev/null

# Remove remote tracking branches
git push origin --delete feature/add-rate-limiting 2>/dev/null
git push origin --delete feature/dashboard-dark-mode 2>/dev/null
git push origin --delete release/v2.1 2>/dev/null

# Prune stale remote references
git remote prune origin

# Verify clean state
git branch -a
```
