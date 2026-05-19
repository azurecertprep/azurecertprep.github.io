---
sidebar_position: 3
title: 'Challenge 09: Repository management'
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 09: Repository management

:::info Platform: ADO-first
:::

## Exam skills

- Configure permissions in the source control repository
- Configure tags to organize the source control repository

## Scenario

Contoso Ltd's monorepo has grown to 200 contributors across 8 teams. Currently, everyone has the same access level. Last sprint, an intern accidentally pushed a configuration change to the production deployment manifests in `/deploy/prod/`, causing an outage. Git tags are inconsistent (some use `v1.2.3`, others use `release-20240115`, and some are lightweight tags with no metadata). The DevOps team needs to implement proper access controls and establish a tagging strategy that integrates with their CI/CD pipeline.

## Tasks

### Task 1: Configure GitHub repository permissions

Set up role-based access using GitHub's permission levels:

```bash
# Create teams with appropriate repository access
# Admin: DevOps leads (full control including settings and branch protection)
gh api orgs/contoso/teams --method POST \
  -f name="platform-admins" \
  -f description="Platform administrators - full repo access" \
  -f privacy="closed"

# Grant admin access to the repo
gh api orgs/contoso/teams/platform-admins/repos/contoso/platform-monorepo \
  --method PUT -f permission="admin"

# Maintain: Tech leads (manage issues, PRs, but can't change settings)
gh api orgs/contoso/teams --method POST \
  -f name="tech-leads" \
  -f description="Technical leads - maintain access" \
  -f privacy="closed"

gh api orgs/contoso/teams/tech-leads/repos/contoso/platform-monorepo \
  --method PUT -f permission="maintain"

# Write: Senior developers (push to non-protected branches)
gh api orgs/contoso/teams --method POST \
  -f name="senior-developers" \
  -f description="Senior developers - write access" \
  -f privacy="closed"

gh api orgs/contoso/teams/senior-developers/repos/contoso/platform-monorepo \
  --method PUT -f permission="push"

# Triage: Junior developers (manage issues, can't push code)
gh api orgs/contoso/teams --method POST \
  -f name="junior-developers" \
  -f description="Junior developers and interns - triage access" \
  -f privacy="closed"

gh api orgs/contoso/teams/junior-developers/repos/contoso/platform-monorepo \
  --method PUT -f permission="triage"

# Read: Stakeholders and external auditors
gh api orgs/contoso/teams --method POST \
  -f name="stakeholders" \
  -f description="Business stakeholders - read only" \
  -f privacy="closed"

gh api orgs/contoso/teams/stakeholders/repos/contoso/platform-monorepo \
  --method PUT -f permission="pull"
```

Verify team permissions:

```bash
# List all teams with access to the repository
gh api repos/contoso/platform-monorepo/teams | jq '.[] | {name: .name, permission: .permission}'

# Check a specific user's effective permissions
gh api repos/contoso/platform-monorepo/collaborators/intern-jane/permission \
  | jq '.permission'
```

### Task 2: Set up team-based access with GitHub Teams

Organize teams hierarchically with nested teams:

```bash
# Create parent team for engineering org
gh api orgs/contoso/teams --method POST \
  -f name="engineering" \
  -f description="All engineering staff" \
  -f privacy="closed"

# Create child teams under engineering
PARENT_ID=$(gh api orgs/contoso/teams/engineering --jq '.id')

gh api orgs/contoso/teams --method POST \
  -f name="billing-team" \
  -f description="Billing engine team" \
  -f privacy="closed" \
  -f parent_team_id="$PARENT_ID"

gh api orgs/contoso/teams --method POST \
  -f name="api-team" \
  -f description="API platform team" \
  -f privacy="closed" \
  -f parent_team_id="$PARENT_ID"

gh api orgs/contoso/teams --method POST \
  -f name="frontend-team" \
  -f description="Frontend/UI team" \
  -f privacy="closed" \
  -f parent_team_id="$PARENT_ID"

# Add members to teams
gh api orgs/contoso/teams/billing-team/memberships/sarah-billing --method PUT -f role="maintainer"
gh api orgs/contoso/teams/billing-team/memberships/dev-bob --method PUT -f role="member"
gh api orgs/contoso/teams/billing-team/memberships/dev-carol --method PUT -f role="member"

# List team members
gh api orgs/contoso/teams/billing-team/members | jq '.[].login'
```

### Task 3: Configure Azure Repos permissions

Set up granular permissions in Azure DevOps including path-level security:

```bash
# Set repository-level permissions
# Grant contribute permission to the development team
az devops security permission update \
  --namespace-id "2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87" \
  --subject "vssgp.Uy0xLTktMTU1MTM3NDI0NS0xMjA0NDAwOTY5" \
  --token "repoV2/contoso-project-id/repo-id" \
  --allow-bit 4 \
  --deny-bit 0

# Deny force push to all non-admin users
az devops security permission update \
  --namespace-id "2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87" \
  --subject "vssgp.Uy0xLTktMTU1MTM3NDI0NS0xMjA0NDAwOTY5" \
  --token "repoV2/contoso-project-id/repo-id" \
  --deny-bit 8

# Configure branch-level permissions (protect release branches)
# Only release managers can push to release/* branches
az repos policy approver-count create \
  --project "Contoso-Platform" \
  --repository-id <repo-id> \
  --branch "release/*" \
  --minimum-approver-count 2 \
  --blocking true \
  --enabled true

# Path-level permissions using Azure DevOps security namespaces
# Deny interns write access to /deploy/prod/ path
# This requires the Git Repositories namespace and path-scoped tokens
az devops security permission update \
  --namespace-id "2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87" \
  --subject "vssgp.intern-group-descriptor" \
  --token "repoV2/project-id/repo-id/refs/heads/main//deploy/prod" \
  --deny-bit 4
```

Create a permissions matrix document for the team:

#### Azure Repos permission levels for Contoso monorepo

| Permission          | Admins | Tech leads | Seniors | Juniors | Interns |
|---------------------|--------|------------|---------|---------|---------|
| Read                | Yes    | Yes        | Yes     | Yes     | Yes     |
| Contribute          | Yes    | Yes        | Yes     | Yes     | No      |
| Create branch       | Yes    | Yes        | Yes     | Yes     | No      |
| Force push          | Yes    | No         | No      | No      | No      |
| Manage permissions  | Yes    | No         | No      | No      | No      |
| Push to main        | No*    | No*        | No*     | No*     | No*     |
| Push to release/*   | Yes    | Yes        | No      | No      | No      |
| Push to deploy/prod | Yes    | No         | No      | No      | No      |

*main is protected - requires PR with approvals

### Task 4: Implement Git tags for releases

Create proper annotated tags for releases:

```bash
# Annotated tag (stores tagger info, date, message - preferred for releases)
git tag -a v1.2.0 -m "Release v1.2.0 - Q1 2024 billing engine update

Changes:
- Add multi-currency support
- Fix EU VAT calculation
- Improve invoice PDF generation performance

Breaking changes:
- Currency field is now required on all invoice endpoints"

# Push the tag to remote
git push origin v1.2.0

# Lightweight tag (just a pointer to a commit - for temporary/internal use)
git tag build-2024.01.15-rc1
git push origin build-2024.01.15-rc1

# Tag a specific past commit (retroactive tagging)
git tag -a v1.1.5 abc1234 -m "Patch release v1.1.5 - hotfix for payment timeout"
git push origin v1.1.5

# List all tags
git tag --list

# List tags matching a pattern
git tag --list "v1.2.*"

# Show tag details
git show v1.2.0

# Verify a signed tag (if GPG signing is configured)
git tag -v v1.2.0
```

Compare annotated vs lightweight tags:

```bash
# See the difference in object types
git cat-file -t v1.2.0        # Output: tag (annotated - full object)
git cat-file -t build-2024.01.15-rc1  # Output: commit (lightweight - just a ref)

# Annotated tags show in `git describe`
git describe --tags
# Output: v1.2.0-14-g2414721 (14 commits after v1.2.0)
```

### Task 5: Tag naming conventions

Establish a tagging standard for Contoso:

```bash
# Production releases: Semantic Versioning
# Format: v{MAJOR}.{MINOR}.{PATCH}
git tag -a v2.0.0 -m "Major release: new API version"
git tag -a v2.1.0 -m "Minor release: add search feature"
git tag -a v2.1.1 -m "Patch release: fix search pagination"

# Pre-release versions
git tag -a v2.2.0-alpha.1 -m "Alpha: new dashboard (unstable)"
git tag -a v2.2.0-beta.1 -m "Beta: new dashboard (feature complete, testing)"
git tag -a v2.2.0-rc.1 -m "Release candidate: final testing"

# Date-based releases (for services with continuous delivery)
# Format: release-YYYY.MM.DD
git tag -a release-2024.01.15 -m "Weekly release 2024-01-15"

# Build tags (CI-generated, lightweight is acceptable)
git tag ci-build-1847
git tag deploy-prod-2024.01.15.1
```

Document the convention:

#### Tag naming convention

| Pattern                | Use case              | Example           | Type      |
|------------------------|-----------------------|-------------------|-----------|
| `v{MAJOR}.{MINOR}.{PATCH}` | Versioned releases | v2.1.0            | Annotated |
| `v{X}.{Y}.{Z}-{pre}.{N}`  | Pre-releases       | v2.2.0-beta.1     | Annotated |
| `release-{YYYY.MM.DD}`     | Date-based releases| release-2024.01.15| Annotated |
| `ci-build-{N}`             | CI build artifacts | ci-build-1847     | Lightweight|
| `deploy-{env}-{date}.{N}`  | Deployment markers | deploy-prod-2024.01.15.1| Lightweight|

Rules:
- All production releases MUST use annotated tags with descriptive messages
- Pre-releases follow SemVer pre-release syntax
- CI/build tags may be lightweight (auto-generated, high volume)
- Never delete or move a published release tag

### Task 6: Automated tagging via CI pipeline on merge to main

Create a GitHub Actions workflow that automatically tags releases:

```yaml
# .github/workflows/auto-tag-release.yml
name: Auto-tag release on merge
on:
  push:
    branches: [main]

jobs:
  tag-release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Determine version bump from commit messages
        id: version
        run: |
          # Get the latest tag
          LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
          echo "latest_tag=$LATEST_TAG" >> "$GITHUB_OUTPUT"

          # Parse current version
          VERSION=${LATEST_TAG#v}
          IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

          # Determine bump type from conventional commit messages since last tag
          COMMITS=$(git log "$LATEST_TAG"..HEAD --pretty=format:"%s")

          if echo "$COMMITS" | grep -q "^BREAKING CHANGE\|^.*!:"; then
            MAJOR=$((MAJOR + 1))
            MINOR=0
            PATCH=0
          elif echo "$COMMITS" | grep -q "^feat"; then
            MINOR=$((MINOR + 1))
            PATCH=0
          elif echo "$COMMITS" | grep -q "^fix"; then
            PATCH=$((PATCH + 1))
          else
            echo "skip=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          NEW_TAG="v${MAJOR}.${MINOR}.${PATCH}"
          echo "new_tag=$NEW_TAG" >> "$GITHUB_OUTPUT"
          echo "skip=false" >> "$GITHUB_OUTPUT"

      - name: Create annotated tag
        if: steps.version.outputs.skip == 'false'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          # Generate changelog from commits
          CHANGELOG=$(git log ${{ steps.version.outputs.latest_tag }}..HEAD \
            --pretty=format:"- %s (%h)" --no-merges)

          git tag -a "${{ steps.version.outputs.new_tag }}" \
            -m "Release ${{ steps.version.outputs.new_tag }}

          Changes since ${{ steps.version.outputs.latest_tag }}:
          $CHANGELOG"

          git push origin "${{ steps.version.outputs.new_tag }}"

      - name: Create GitHub release
        if: steps.version.outputs.skip == 'false'
        run: |
          gh release create "${{ steps.version.outputs.new_tag }}" \
            --title "Release ${{ steps.version.outputs.new_tag }}" \
            --generate-notes
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Equivalent Azure Pipelines task for automated tagging:

```yaml
# azure-pipelines.yml (tag on merge to main)
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - checkout: self
    fetchDepth: 0
    persistCredentials: true

  - script: |
      LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
      VERSION=${LATEST_TAG#v}
      IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"
      MINOR=$((MINOR + 1))
      PATCH=0
      NEW_TAG="v${MAJOR}.${MINOR}.${PATCH}"

      git config user.email "azure-pipelines@contoso.com"
      git config user.name "Azure Pipelines"
      git tag -a "$NEW_TAG" -m "Release $NEW_TAG (automated)"
      git push origin "$NEW_TAG"

      echo "##vso[task.setvariable variable=releaseTag]$NEW_TAG"
    displayName: 'Create release tag'
```

### Task 7: Repository settings

Configure repository-level settings for consistency:

```bash
# Set default branch to main
gh api repos/contoso/platform-monorepo --method PATCH \
  -f default_branch="main"

# Configure allowed merge strategies
gh api repos/contoso/platform-monorepo --method PATCH \
  --input - << 'EOF'
{
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": true,
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "PR_BODY",
  "delete_branch_on_merge": true,
  "allow_auto_merge": true,
  "allow_update_branch": true
}
EOF

# Enable vulnerability alerts and automated security fixes
gh api repos/contoso/platform-monorepo/vulnerability-alerts --method PUT
gh api repos/contoso/platform-monorepo/automated-security-fixes --method PUT

# Set repository topics for discoverability
gh repo edit contoso/platform-monorepo --add-topic "monorepo,contoso,platform,typescript"

# Configure repository visibility and features
gh api repos/contoso/platform-monorepo --method PATCH \
  --input - << 'EOF'
{
  "has_issues": true,
  "has_projects": true,
  "has_wiki": false,
  "has_discussions": true,
  "web_commit_signoff_required": true
}
EOF
```

## Break and fix

### Scenario 1: Intern pushes to production path

An intern made changes to `/deploy/prod/kubernetes.yaml` and pushed directly to a feature branch that was then merged without proper review because the CODEOWNERS file did not cover deployment manifests.

**Diagnosis**:

```bash
# Find who changed the production config
git log --oneline --all -- deploy/prod/kubernetes.yaml

# Check if CODEOWNERS covers this path
cat .github/CODEOWNERS | grep -i deploy

# Verify branch protection requires CODEOWNERS review
gh api repos/contoso/platform-monorepo/branches/main/protection/required_pull_request_reviews \
  | jq '.require_code_owner_reviews'
```


<details>
<summary>Solution</summary>

**Fix**: Add the deploy path to CODEOWNERS and ensure code owner review is required:

```bash
# Add to CODEOWNERS
echo '/deploy/prod/ @contoso/platform-admins @contoso/sre-team' >> .github/CODEOWNERS
git add .github/CODEOWNERS
git commit -m "fix: add production deploy path to CODEOWNERS"
git push origin main

# Revert the intern's change
git revert <merge-commit-sha> --mainline 1
git push origin main
```

</details>

### Scenario 2: Tags are inconsistent and CI cannot determine latest version

The `git describe` command returns unexpected results because of mixed tag naming:

```bash
# The problem: inconsistent tags break automation
git tag --list | head -20
# Output shows:
# 1.0.0          (no v prefix)
# V1.1.0         (uppercase V)
# v1.2.0         (correct)
# release-20231115
# v1.3
# 1.4.0-beta

# git describe picks wrong tag
git describe --tags
# Output: release-20231115-47-gabc1234 (wrong! not a semver tag)
```


<details>
<summary>Solution</summary>

**Fix**: Clean up tags and configure `git describe` to filter properly:

```bash
# Use glob pattern to only match semver tags
git describe --tags --match "v[0-9]*"

# Rename inconsistent tags (requires coordination with team)
# Delete old tag locally and remotely, create new one
git tag -a v1.0.0 $(git rev-list -n 1 1.0.0) -m "Release v1.0.0 (re-tagged)"
git tag -d 1.0.0
git push origin :refs/tags/1.0.0
git push origin v1.0.0

git tag -a v1.1.0 $(git rev-list -n 1 V1.1.0) -m "Release v1.1.0 (re-tagged)"
git tag -d V1.1.0
git push origin :refs/tags/V1.1.0
git push origin v1.1.0

# Add a tag protection rule to prevent non-compliant tags
gh api repos/contoso/platform-monorepo/rulesets --method POST --input - << 'EOF'
{
  "name": "Tag naming enforcement",
  "target": "tag",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["~ALL"],
      "exclude": ["refs/tags/v*"]
    }
  },
  "rules": [
    { "type": "creation" }
  ]
}
EOF
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: ": In GitHub, what is the difference between the \"Maintain\" and \"Write\" permission levels?",
    options: [
      "Maintain can merge PRs; Write cannot",
      "Maintain can manage repository settings; Write can only push code and manage issues/PRs",
      "Maintain can push to protected branches; Write cannot push at all",
      "There is no difference; they are aliases for the same permission"
    ],
    correctIndex: 1,
    explanation: "The \"Maintain\" role is designed for project managers/tech leads who need to manage the repository (edit description, manage topics, manage interaction limits, manage wikis) without having full admin access (cannot change visibility, delete the repo, or manage access). \"Write\" allows pushing code, managing issues and PRs, but not repository settings management."
  },
  {
    question: ": What is the key difference between an annotated Git tag and a lightweight tag?",
    options: [
      "Annotated tags can be pushed to remote; lightweight tags cannot",
      "Annotated tags are stored as full objects with metadata (tagger, date, message); lightweight tags are just pointers to a commit",
      "Annotated tags are encrypted; lightweight tags are plain text",
      "Annotated tags require a GPG key; lightweight tags do not"
    ],
    correctIndex: 1,
    explanation: "Annotated tags (git tag -a) create a full Git object that stores the tagger name, email, date, and a message. They can be GPG-signed and show up in git describe. Lightweight tags (git tag without -a) are simply a reference pointing to a commit with no additional metadata. Annotated tags are recommended for releases; lightweight tags for temporary or private bookmarks."
  },
  {
    question: ": In Azure DevOps, how do you restrict a specific group from modifying files in a particular path within a repository?",
    options: [
      "Create a .gitignore entry for the path",
      "Use path-level security with the Git Repositories security namespace and path-scoped tokens",
      "Create a separate repository for the protected files",
      "Use branch policies with file-pattern exclusions"
    ],
    correctIndex: 1,
    explanation: "Azure DevOps supports path-level permissions through its security namespace system. By using the Git Repositories namespace (2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87) with path-scoped security tokens (format: repoV2/project-id/repo-id/refs/heads/branch//path), you can deny specific groups write access to specific paths while allowing them access elsewhere in the repository."
  },
  {
    question: ": A CI pipeline uses 'git describe --tags' to determine the application version. The command returns 'v1.2.0-47-g2414721'. What does this output mean?",
    options: [
      "Version 1.2.0 was released 47 days ago at commit 2414721",
      "The current commit is 47 commits ahead of the 'v1.2.0' tag, and the current short SHA is 2414721",
      "There are 47 files changed since v1.2.0 in commit group 2414721",
      "The build number is 47 with a Git hash prefix of 2414721"
    ],
    correctIndex: 1,
    explanation: "The git describe output format is \{tag\}-\{commits-ahead\}-g\{short-sha\}. The g prefix stands for \"git\" and precedes the abbreviated commit hash. This output tells you: the most recent reachable tag is v1.2.0, the current HEAD is 47 commits after that tag, and the current commit's short SHA starts with 2414721. If HEAD is exactly on a tag, the output is just the tag name (e.g., v1.2.0)."
  }
]} />

## Cleanup

```bash
# Remove teams created during this challenge
gh api orgs/contoso/teams/platform-admins --method DELETE
gh api orgs/contoso/teams/tech-leads --method DELETE
gh api orgs/contoso/teams/senior-developers --method DELETE
gh api orgs/contoso/teams/junior-developers --method DELETE
gh api orgs/contoso/teams/stakeholders --method DELETE
gh api orgs/contoso/teams/engineering --method DELETE

# Delete practice tags
git tag -d v1.2.0 v1.1.5 v2.0.0 v2.1.0 v2.1.1 2>/dev/null
git tag -d v2.2.0-alpha.1 v2.2.0-beta.1 v2.2.0-rc.1 2>/dev/null
git tag -d release-2024.01.15 ci-build-1847 2>/dev/null
git push origin --delete v1.2.0 v1.1.5 v2.0.0 2>/dev/null

# Remove workflow files
rm -f .github/workflows/auto-tag-release.yml

# Reset repository settings to defaults
gh api repos/contoso/platform-monorepo --method PATCH \
  --input - << 'EOF'
{
  "allow_squash_merge": true,
  "allow_merge_commit": true,
  "allow_rebase_merge": true,
  "delete_branch_on_merge": false
}
EOF

# Verify clean state
git tag --list
gh api repos/contoso/platform-monorepo/teams | jq '.[].name'
```
