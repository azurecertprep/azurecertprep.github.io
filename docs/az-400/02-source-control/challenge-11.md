---
sidebar_position: 5
title: 'Challenge 11: Git advanced operations'
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 11: Git advanced operations

:::info Platform: GitHub-first
:::

## Exam skills

- Recover specific data by using Git commands
- Remove specific data from source control

## Scenario

Contoso Ltd's platform team has two urgent problems. First, a developer accidentally committed AWS access keys (`AKIA...`) to the repository three weeks ago in a configuration file. The credentials have been in 47 commits across multiple branches since then. The security team detected the exposure through automated scanning but the keys are still in the Git history. Second, a senior developer deleted a branch (`feature/payment-gateway-v2`) that contained 3 weeks of work on a critical project. The branch was never merged and no PR exists. Both issues need to be resolved immediately while minimizing disruption to the 15 developers working on the repository.

## Tasks

### Task 1: Recover a deleted branch using git reflog

The `feature/payment-gateway-v2` branch was deleted but the commits still exist in the local reflog (if you had the branch checked out) or on the remote (within the retention period).

```bash
# Check the reflog for references to the deleted branch
git reflog | grep "payment-gateway-v2"
# Output:
# abc1234 HEAD@{5}: checkout: moving from feature/payment-gateway-v2 to main
# def5678 HEAD@{12}: commit: feat: add Stripe webhook handler
# ghi9012 HEAD@{13}: commit: feat: implement payment retry logic

# Find the last commit on the deleted branch
git reflog show --all | grep "payment-gateway-v2"

# Alternative: search for the branch tip commit in all refs
git fsck --no-reflogs | grep "dangling commit"
# Output:
# dangling commit jkl3456789abcdef...

# Recreate the branch from the last known commit
git branch feature/payment-gateway-v2 abc1234

# Or from a dangling commit found via fsck
git branch feature/payment-gateway-v2 jkl3456

# Push the recovered branch to remote
git push origin feature/payment-gateway-v2

# Verify the recovery
git log --oneline feature/payment-gateway-v2 -10
```

If the branch was deleted remotely but another developer had it:

```bash
# Check if any remote tracking branch exists
git branch -r | grep payment-gateway

# If deleted from remote, check GitHub's event log (branches are retained briefly)
gh api repos/contoso/platform-api/events | jq '.[] | select(.type == "DeleteEvent")'

# Ask GitHub support for branch restoration (within 90 days) or check:
gh api repos/contoso/platform-api/git/refs | jq '.[].ref' | grep payment
```

### Task 2: Recover a specific commit from detached HEAD

A developer was in detached HEAD state, made important commits, then accidentally checked out another branch, losing the reference.

```bash
# The developer's situation:
# They were reviewing a tag, made fixes, committed, then lost them
git checkout v1.5.0        # Entered detached HEAD
# ... made changes and committed ...
git checkout main          # Lost the detached HEAD commits!

# Recovery: check the reflog for the detached HEAD commits
git reflog
# Output:
# mno7890 HEAD@{0}: checkout: moving from mno7890 to main
# mno7890 HEAD@{1}: commit: fix: critical auth bypass in v1.5.0
# pqr1234 HEAD@{2}: commit: fix: SQL injection in user search
# stu5678 HEAD@{3}: checkout: moving from main to v1.5.0

# Recover by creating a branch at that commit
git branch hotfix/recovered-auth-fix mno7890

# Or cherry-pick the commits onto current branch
git cherry-pick pqr1234 mno7890

# Verify the recovered commits
git log --oneline hotfix/recovered-auth-fix -5
```

### Task 3: Cherry-pick a commit from another branch

Apply a specific bug fix from a release branch to main without merging the entire branch:

```bash
# Identify the commit to cherry-pick
git log --oneline release/v2.1 -20
# Output:
# fed4321 fix: prevent race condition in payment processing
# cba8765 docs: update API changelog
# ...

# Cherry-pick the specific fix onto main
git checkout main
git cherry-pick fed4321

# If there's a conflict during cherry-pick
git cherry-pick fed4321
# CONFLICT (content): Merge conflict in src/payments/processor.js
# Resolve the conflict
git add src/payments/processor.js
git cherry-pick --continue

# Cherry-pick multiple commits (a range)
git cherry-pick abc1234..def5678

# Cherry-pick without committing (stage changes only)
git cherry-pick --no-commit fed4321

# Abort a cherry-pick in progress
git cherry-pick --abort

# Cherry-pick a merge commit (must specify parent)
git cherry-pick -m 1 <merge-commit-sha>
```

### Task 4: Interactive rebase to squash and reorder commits

Clean up messy commit history before merging a PR:

```bash
# View the commits to clean up
git log --oneline -8
# Output:
# h8 fix: typo in variable name
# h7 wip: debugging payment flow
# h6 feat: add payment retry logic
# h5 fix: linting errors
# h4 feat: implement webhook handler
# h3 wip: trying different approach
# h2 feat: add Stripe SDK integration
# h1 chore: initial branch setup

# Start interactive rebase for the last 8 commits
git rebase -i HEAD~8

# The editor opens with:
# pick h1 chore: initial branch setup
# pick h2 feat: add Stripe SDK integration
# pick h3 wip: trying different approach
# pick h4 feat: implement webhook handler
# pick h5 fix: linting errors
# pick h6 feat: add payment retry logic
# pick h7 wip: debugging payment flow
# pick h8 fix: typo in variable name

# Reorder and squash to create clean history:
# pick h1 chore: initial branch setup
# pick h2 feat: add Stripe SDK integration
# squash h3 wip: trying different approach
# pick h4 feat: implement webhook handler
# squash h5 fix: linting errors
# pick h6 feat: add payment retry logic
# squash h7 wip: debugging payment flow
# squash h8 fix: typo in variable name

# After saving, edit each combined commit message
# Result: 4 clean commits instead of 8 messy ones

# Force push the cleaned branch (only for feature branches, never main)
git push origin feature/payment-gateway --force-with-lease

# Alternative: Use fixup instead of squash (discards the fixup commit message)
# fixup h3 wip: trying different approach
# fixup h5 fix: linting errors

# Auto-squash: mark commits for automatic fixup
git commit --fixup=h2   # Creates "fixup! feat: add Stripe SDK integration"
git rebase -i --autosquash HEAD~5  # Automatically reorders fixup commits
```

### Task 5: Remove sensitive data with git filter-repo

Remove the AWS credentials that were committed 3 weeks ago. Use `git filter-repo` (the modern replacement for the deprecated `git filter-branch`):

```bash
# Install git-filter-repo
pip install git-filter-repo

# First, identify where the sensitive data exists
git log --all --full-history -p -- config/aws-credentials.json
git log --all -S "AKIAIOSFODNN7EXAMPLE" --oneline
# Output shows 47 commits containing the secret

# Option 1: Remove an entire file from all history
git filter-repo --invert-paths --path config/aws-credentials.json

# Option 2: Replace specific text in all files across all history
# Create a replacements file
cat > expressions.txt << 'EOF'
regex:AKIA[A-Z0-9]{16}==>REMOVED_AWS_KEY
regex:(?i)aws_secret_access_key\s*=\s*\S+==>aws_secret_access_key=REMOVED
EOF

git filter-repo --replace-text expressions.txt

# Option 3: Remove a specific string (literal replacement)
cat > replacements.txt << 'EOF'
AKIAIOSFODNN7EXAMPLE==>***REMOVED***
wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY==>***REMOVED***
EOF

git filter-repo --replace-text replacements.txt

# Verify the sensitive data is gone
git log --all -S "AKIAIOSFODNN7EXAMPLE" --oneline
# Output: (empty - no commits contain the string)

# Check the file no longer exists in any commit
git log --all --full-history -- config/aws-credentials.json
# Output: (empty)
```

### Task 6: BFG Repo Cleaner for large file removal

Use BFG for faster removal of large files and secrets (simpler interface than filter-repo for common cases):

```bash
# Download BFG Repo Cleaner
curl -L -o bfg.jar https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Clone a fresh mirror of the repo (BFG works on bare repos)
git clone --mirror https://github.com/contoso/platform-api.git platform-api-mirror.git
cd platform-api-mirror.git

# Remove files containing AWS keys
echo "AKIAIOSFODNN7EXAMPLE" > ../passwords.txt
echo "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" >> ../passwords.txt
java -jar ../bfg.jar --replace-text ../passwords.txt

# Remove all files over 100MB from history
java -jar ../bfg.jar --strip-blobs-bigger-than 100M

# Remove specific files by name
java -jar ../bfg.jar --delete-files "*.psd"
java -jar ../bfg.jar --delete-files "aws-credentials.json"

# Remove specific folders
java -jar ../bfg.jar --delete-folders ".terraform"

# After BFG, clean up the repository
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Verify the cleanup
git rev-list --objects --all | git cat-file --batch-check | sort -k3nr | head -20

cd ..
```

### Task 7: Verify removal and force-push

After rewriting history, coordinate with the team for the force push:

```bash
# Verify sensitive data is completely removed
git log --all -S "AKIAIOSFODNN7EXAMPLE" --oneline
# Should return empty

# Search blob objects directly
git rev-list --objects --all | while read hash path; do
  if git cat-file -p "$hash" 2>/dev/null | grep -q "AKIA"; then
    echo "FOUND in: $hash $path"
  fi
done

# Force push all branches and tags
git push origin --force --all
git push origin --force --tags

# Notify all team members (they must re-clone)
# Post in team channel:
cat << 'EOF'
IMPORTANT: Repository history has been rewritten to remove exposed credentials.
All team members must:
1. Save any uncommitted work (git stash or copy files)
2. Delete your local clone: rm -rf platform-api
3. Re-clone: git clone https://github.com/contoso/platform-api.git
4. Reapply any stashed work

DO NOT run `git pull` on your existing clone - it will create duplicate history.
EOF

# Request GitHub garbage collection (secrets may still be in loose objects)
# Contact GitHub Support or use the API for repository maintenance
gh api repos/contoso/platform-api/git/refs -X GET | jq '.[].ref'
```

### Task 8: Invalidate exposed credentials

The final critical step - removing the data from history does not revoke compromised credentials:

```bash
# Immediately rotate the exposed AWS credentials
aws iam create-access-key --user-name contoso-platform-svc
aws iam delete-access-key --user-name contoso-platform-svc \
  --access-key-id AKIAIOSFODNN7EXAMPLE

# Check CloudTrail for unauthorized usage during the exposure window
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAIOSFODNN7EXAMPLE \
  --start-time "2024-01-01T00:00:00Z" \
  --end-time "2024-01-22T00:00:00Z"

# Add the credential patterns to .gitignore to prevent future commits
echo "config/aws-credentials.json" >> .gitignore
echo "*.pem" >> .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "chore: add credential files to .gitignore"

# Set up pre-commit hook to prevent future secret commits
cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/bash
# Scan staged files for potential secrets
if git diff --cached --diff-filter=ACM | grep -qE '(AKIA[A-Z0-9]{16}|-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----|password\s*=\s*["\x27][^"\x27]+["\x27])'; then
  echo "ERROR: Potential secret detected in staged files!"
  echo "Please remove credentials before committing."
  exit 1
fi
HOOK
chmod +x .git/hooks/pre-commit

# Set up GitHub secret scanning alerts
# (Automatically enabled for public repos; enable for private repos)
gh api repos/contoso/platform-api --method PATCH \
  -f security_and_analysis='{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}'
```

## Break and fix

### Scenario 1: Rebase conflict during interactive rebase

A developer is doing an interactive rebase to squash commits but hits a conflict that repeats on every commit:

```bash
# The problem: conflict during rebase
git rebase -i HEAD~5
# CONFLICT (content): Merge conflict in src/api/routes.js
# error: could not apply abc1234... feat: add new endpoint

# The conflict appears again after resolving because multiple
# commits modified the same lines
```


<details>
<summary>Show solution</summary>

**Fix**: Resolve each conflict as it appears, or abort and use a different strategy:

```bash
# Option 1: Resolve and continue for each conflict
git add src/api/routes.js
git rebase --continue
# Repeat for each conflicting commit

# Option 2: Abort and try a different approach
git rebase --abort

# Use merge --squash instead (creates a single squashed commit without rebase)
git checkout main
git merge --squash feature/payment-gateway
git commit -m "feat: complete payment gateway implementation"

# Option 3: If the rebase is too complex, skip problematic commits
git rebase --skip  # Caution: this drops the conflicting commit's changes
```

</details>

### Scenario 2: git filter-repo refuses to run on a non-fresh clone

```bash
# Error when running filter-repo:
git filter-repo --invert-paths --path secrets.json
# ERROR: Refusing to destructively overwrite repo history since
# this does not look like a fresh clone.
# (expected freshly packed repo)
```


<details>
<summary>Show solution</summary>

**Fix**: Either use the `--force` flag or work on a fresh clone:

```bash
# Option 1: Force filter-repo to run (use with caution)
git filter-repo --invert-paths --path secrets.json --force

# Option 2: Create a fresh clone and work from there (recommended)
cd ..
git clone --no-local platform-api platform-api-clean
cd platform-api-clean
git filter-repo --invert-paths --path secrets.json

# Then push the cleaned repo back
git remote add origin https://github.com/contoso/platform-api.git
git push origin --force --all
git push origin --force --tags
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "A developer committed a database password 50 commits ago. The password has been in the repository history across 3 branches. Which tool should you use to remove it from ALL history?",
    options: [
      "'git rm' followed by a commit to delete the file",
      "'git filter-repo --replace-text' to replace the password across all history",
      "'git reset --hard HEAD~50' to rewind history before the commit",
      "'git revert' on the commit that introduced the password"
    ],
    correctIndex: 1,
    explanation: "git filter-repo rewrites the entire repository history, replacing the sensitive text in every commit across all branches and tags. git rm only removes the file from the current commit forward (the password remains in history). git reset would lose 50 commits of work and doesn't affect other branches. git revert creates a new commit that undoes the change but the password remains visible in the original commit."
  },
  {
    question: "After rewriting repository history with 'git filter-repo', what must all other team members do with their local clones?",
    options: [
      "Run 'git pull --rebase' to update their history",
      "Run 'git fetch --all' followed by 'git reset --hard origin/main'",
      "Delete their local clone and re-clone the repository from scratch",
      "Run 'git filter-repo' locally with the same parameters"
    ],
    correctIndex: 2,
    explanation: "When history is rewritten, every commit SHA changes from the point of rewrite forward. Existing clones have the old SHAs which are incompatible with the new history. Running git pull would attempt to merge two completely different histories, creating duplicate commits. The safest approach is to delete the local clone entirely and start fresh. Developers should save any uncommitted work before doing this."
  },
  {
    question: "A branch 'feature/analytics' was deleted from both local and remote 2 days ago. The developer who created it no longer has a local clone. How can the commits be recovered?",
    options: [
      "The commits are permanently lost and cannot be recovered",
      "Use 'git reflog' on any machine that had the branch checked out (within the reflog expiry window)",
      "Use 'git fsck --lost-found' on the remote server directly",
      "Contact GitHub support; deleted branch commits are retained for a limited time"
    ],
    correctIndex: 3,
    explanation: "GitHub retains dangling commits (commits not referenced by any branch or tag) for approximately 90 days before garbage collection removes them permanently. If no developer has the branch in their local reflog, GitHub support can help locate and restore the branch reference. On Azure DevOps, deleted branches can be restored directly through the UI within a retention period. The reflog (option B) only works if someone still has a local clone that had the branch."
  },
  {
    question: "What is the difference between 'git cherry-pick' and 'git rebase' when moving commits between branches?",
    options: [
      "Cherry-pick copies individual commits creating new SHAs; rebase replays a series of commits onto a new base creating new SHAs for all of them",
      "Cherry-pick preserves original commit SHAs; rebase changes them",
      "Cherry-pick is for merge commits only; rebase is for regular commits",
      "Cherry-pick moves the commit; rebase copies it"
    ],
    correctIndex: 0,
    explanation: "Both operations create new commits (new SHAs) because the parent commit changes. The difference is scope and intent: git cherry-pick selects specific individual commits to copy onto the current branch (surgical, one-at-a-time). git rebase replays an entire series of commits from one base onto another base (used to move or linearize a whole branch). Cherry-pick leaves the original commit in place; rebase typically moves the branch pointer away from the originals."
  }
]} />

## Cleanup

```bash
# Remove recovered branches
git branch -D feature/payment-gateway-v2 2>/dev/null
git branch -D hotfix/recovered-auth-fix 2>/dev/null

# Remove BFG jar and related files
rm -f bfg.jar passwords.txt expressions.txt replacements.txt

# Remove mirror clone used for BFG
rm -rf platform-api-mirror.git
rm -rf platform-api-clean

# Reset any force-pushed test branches
git checkout main
git branch -D feature/payment-gateway 2>/dev/null

# Remove pre-commit hook (if this was for testing)
rm -f .git/hooks/pre-commit

# Clean up reflog entries older than now (reclaim space)
git reflog expire --expire=now --all
git gc --prune=now

# Verify clean state
git status
git branch -a
git stash list
```
