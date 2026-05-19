---
sidebar_position: 4
title: 'Challenge 10: Large file management'
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 10: Large file management

:::info Platform: comparison
:::

## Exam skills

- Design and implement a strategy for managing large files, including Git Large File Storage (LFS) and git-fat

## Scenario

Contoso Ltd's game studio stores all binary assets (textures, 3D models, audio files, compiled shaders) directly in their Git repository. The repository has grown to 50GB, with `.psd` files averaging 200MB and `.fbx` 3D models reaching 500MB. Clone operations take over 4 hours on the office network. Developers regularly hit push timeouts because Git tries to diff and compress binary files inefficiently. CI builds fail when runners run out of disk space. The team needs a strategy to handle large binary files without abandoning Git as their version control system.

## Tasks

### Task 1: Install and configure Git LFS

Install Git LFS and set up the repository:

```bash
# Install Git LFS (varies by OS)
# macOS
brew install git-lfs

# Ubuntu/Debian
sudo apt-get install git-lfs

# Windows (via winget)
winget install GitHub.GitLFS

# Windows (via chocolatey)
choco install git-lfs

# Initialize Git LFS for the current user (one-time setup)
git lfs install
# Output: Updated git hooks. Git LFS initialized.

# Verify installation
git lfs version
# Output: git-lfs/3.4.0 (GitHub; windows amd64; go 1.21.3)

# Check current LFS configuration
git lfs env
```

### Task 2: Track file types with Git LFS

Configure which files should be managed by LFS:

```bash
# Track all Photoshop files
git lfs track "*.psd"

# Track 3D model formats
git lfs track "*.fbx"
git lfs track "*.blend"
git lfs track "*.obj"
git lfs track "*.max"

# Track large image formats
git lfs track "*.png"
git lfs track "*.tga"
git lfs track "*.tiff"
git lfs track "*.exr"

# Track audio files
git lfs track "*.wav"
git lfs track "*.mp3"
git lfs track "*.ogg"

# Track video files
git lfs track "*.mp4"
git lfs track "*.mov"

# Track compiled/binary artifacts
git lfs track "*.dll"
git lfs track "*.so"
git lfs track "*.dylib"

# Track by directory (all files in assets/textures regardless of extension)
git lfs track "assets/textures/**"

# View current tracking rules
git lfs track
# Output:
# Listing tracked patterns
#     *.psd (.gitattributes)
#     *.fbx (.gitattributes)
#     ...

# The tracking rules are stored in .gitattributes
cat .gitattributes
# Output:
# *.psd filter=lfs diff=lfs merge=lfs -text
# *.fbx filter=lfs diff=lfs merge=lfs -text
# ...

# IMPORTANT: Commit the .gitattributes file
git add .gitattributes
git commit -m "chore: configure Git LFS tracking for binary assets"
```

### Task 3: Migrate existing large files to LFS

Convert files already in the repository history to LFS:

```bash
# First, check what large files exist in history
git lfs migrate info --everything
# Output shows file types sorted by total size in history

# Check specific extensions
git lfs migrate info --include="*.psd,*.fbx,*.png" --everything

# Migrate existing files to LFS (rewrites history)
# WARNING: This rewrites git history - coordinate with entire team
git lfs migrate import --include="*.psd,*.fbx,*.png,*.wav" --everything

# For a less disruptive approach, migrate only the current branch
git lfs migrate import --include="*.psd,*.fbx" --include-ref=refs/heads/main

# Migrate files above a certain size (e.g., anything over 1MB)
git lfs migrate import --above=1mb --everything

# After migration, verify the files are now LFS pointers
git lfs ls-files
# Output:
# abc1234567 * assets/textures/hero_diffuse.psd
# def8901234 * models/character/protagonist.fbx

# Check a file to confirm it's an LFS pointer
cat assets/textures/hero_diffuse.psd
# Output (pointer file, not binary):
# version https://git-lfs.github.com/spec/v1
# oid sha256:4d7a214614...
# size 214958080

# Force push the rewritten history (requires team coordination)
git push origin main --force-with-lease

# Team members must re-clone or run:
git lfs pull
```

Clean up old objects after migration:

```bash
# Remove old large objects from local repository
git reflog expire --expire-unreachable=now --all
git gc --prune=now

# Verify repository size reduction
git count-objects -vH
# Before: size-pack: 50.2 GiB
# After:  size-pack: 1.8 GiB (only code + LFS pointers)
```

### Task 4: Configure .gitattributes for LFS tracking

Create a comprehensive `.gitattributes` file for a game studio:

```bash
# .gitattributes - Git LFS configuration for Contoso Game Studio

# 3D Models
*.fbx filter=lfs diff=lfs merge=lfs -text
*.blend filter=lfs diff=lfs merge=lfs -text
*.obj filter=lfs diff=lfs merge=lfs -text
*.max filter=lfs diff=lfs merge=lfs -text
*.ma filter=lfs diff=lfs merge=lfs -text
*.mb filter=lfs diff=lfs merge=lfs -text

# Textures
*.psd filter=lfs diff=lfs merge=lfs -text
*.tga filter=lfs diff=lfs merge=lfs -text
*.tiff filter=lfs diff=lfs merge=lfs -text
*.exr filter=lfs diff=lfs merge=lfs -text
*.hdr filter=lfs diff=lfs merge=lfs -text
*.png filter=lfs diff=lfs merge=lfs -text
*.bmp filter=lfs diff=lfs merge=lfs -text

# Audio
*.wav filter=lfs diff=lfs merge=lfs -text
*.mp3 filter=lfs diff=lfs merge=lfs -text
*.ogg filter=lfs diff=lfs merge=lfs -text
*.flac filter=lfs diff=lfs merge=lfs -text
*.bank filter=lfs diff=lfs merge=lfs -text

# Video
*.mp4 filter=lfs diff=lfs merge=lfs -text
*.mov filter=lfs diff=lfs merge=lfs -text
*.avi filter=lfs diff=lfs merge=lfs -text

# Compiled assets
*.asset filter=lfs diff=lfs merge=lfs -text
*.prefab filter=lfs diff=lfs merge=lfs -text
*.unity filter=lfs diff=lfs merge=lfs -text
*.unitypackage filter=lfs diff=lfs merge=lfs -text

# Fonts
*.ttf filter=lfs diff=lfs merge=lfs -text
*.otf filter=lfs diff=lfs merge=lfs -text

# Archives
*.zip filter=lfs diff=lfs merge=lfs -text
*.7z filter=lfs diff=lfs merge=lfs -text
*.rar filter=lfs diff=lfs merge=lfs -text

# Ensure text files are handled correctly
*.cs text diff=csharp
*.json text
*.yaml text
*.xml text
*.md text
*.txt text
```

### Task 5: LFS storage and bandwidth quotas

Understand and manage LFS quotas on GitHub and Azure DevOps:

```bash
# Check GitHub LFS usage for the organization
gh api orgs/contoso --jq '{
  plan: .plan.name,
  lfs_bandwidth_used: .plan.filled_seats,
  total_repos: .total_private_repos
}'

# Check repository-specific LFS storage
gh api repos/contoso/game-studio/git/lfs --jq '.repository.storage'

# GitHub LFS limits (as of current pricing):
# - Free: 1 GB storage, 1 GB bandwidth/month
# - Data packs: $5/month per 50 GB storage + 50 GB bandwidth

# Azure DevOps LFS limits:
# - Free tier: 1 GB per repository
# - Additional storage available with organization billing

# Monitor LFS bandwidth usage in CI
# Add to your CI pipeline:
git lfs env | grep -i "batch"
```

Configure LFS to reduce bandwidth in CI:

```yaml
# .github/workflows/ci.yml - Optimized LFS checkout
name: CI with LFS optimization
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: false  # Don't fetch all LFS files

      - name: Fetch only needed LFS files
        run: |
          # Only pull LFS files that changed in this PR
          git lfs pull --include="src/**" --exclude="assets/cinematics/**"

      # Alternative: Skip LFS entirely for code-only CI
      - name: Build (no assets needed)
        run: dotnet build --configuration Release
        env:
          GIT_LFS_SKIP_SMUDGE: 1
```

### Task 6: Alternative - git-fat for S3-backed storage

Set up git-fat as an alternative for teams using AWS S3:

```bash
# Install git-fat
pip install git-fat

# Initialize git-fat in the repository
git fat init

# Configure the S3 backend
cat > .gitfat << 'EOF'
[rsync]
remote = contoso-assets.s3.amazonaws.com:/game-assets
options = --progress
EOF

# Alternative S3 configuration
cat > .gitfat << 'EOF'
[s3]
bucket = contoso-game-assets
region = us-east-1
prefix = git-fat/
EOF

# Configure which files to manage with git-fat
echo "*.psd filter=fat -text" >> .gitattributes
echo "*.fbx filter=fat -text" >> .gitattributes

# Push large files to the remote store
git fat push

# Pull large files from the remote store
git fat pull

# Check status of fat files
git fat status
```

Comparison of LFS vs git-fat:

| Feature              | Git LFS                          | git-fat                      |
|----------------------|----------------------------------|------------------------------|
| Backend storage      | GitHub/Azure DevOps LFS server   | S3, rsync, any remote store  |
| Hosting integration  | Native GitHub/ADO support        | Self-managed                 |
| File locking         | Yes (built-in)                   | No                           |
| Bandwidth management | Provider-managed quotas          | Self-managed (S3 costs)      |
| Setup complexity     | Low (provider handles server)    | Medium (configure storage)   |
| Cost model           | Per-GB data packs                | S3 storage + transfer costs  |
| CI integration       | Native (actions/checkout lfs)    | Custom scripts needed        |
| Maintenance          | Provider-managed                 | Self-managed                 |

### Task 7: Configure LFS file locking for binary files

Prevent merge conflicts on binary files by implementing file locking:

```bash
# Enable file locking for specific patterns
git lfs track --lockable "*.psd"
git lfs track --lockable "*.fbx"
git lfs track --lockable "*.blend"

# This updates .gitattributes with the lockable flag:
# *.psd filter=lfs diff=lfs merge=lfs -text lockable
# *.fbx filter=lfs diff=lfs merge=lfs -text lockable

# Lock a file before editing
git lfs lock assets/textures/hero_diffuse.psd
# Output: Locked assets/textures/hero_diffuse.psd

# View all locked files
git lfs locks
# Output:
# ID    Path                                    Owner        Locked At
# 1234  assets/textures/hero_diffuse.psd        sarah-artist 2024-01-15T10:30:00Z
# 1235  models/character/protagonist.fbx        mike-3d      2024-01-15T11:00:00Z

# Check who has a specific file locked
git lfs locks --path="assets/textures/hero_diffuse.psd"

# Unlock after completing edits
git lfs unlock assets/textures/hero_diffuse.psd

# Force unlock someone else's lock (requires admin/maintain permission)
git lfs unlock assets/textures/hero_diffuse.psd --force

# Unlock by ID
git lfs unlock --id=1234
```

Configure lockable files to be read-only by default:

```bash
# When lockable flag is set, files are checked out as read-only
ls -la assets/textures/hero_diffuse.psd
# -r--r--r-- (read-only until locked)

# After locking:
git lfs lock assets/textures/hero_diffuse.psd
ls -la assets/textures/hero_diffuse.psd
# -rw-r--r-- (now writable)
```

Set up a pre-push hook to warn about unlocked binary file changes:

```bash
#!/bin/bash
# .git/hooks/pre-push
# Warn if pushing changes to lockable files that aren't locked by you

LOCKABLE_FILES=$(git diff --name-only HEAD~1 | grep -E '\.(psd|fbx|blend)$')

if [ -n "$LOCKABLE_FILES" ]; then
  echo "Checking locks for modified binary files..."
  for file in $LOCKABLE_FILES; do
    LOCK_OWNER=$(git lfs locks --path="$file" --json | jq -r '.[0].owner.name // empty')
    CURRENT_USER=$(git config user.name)
    if [ -z "$LOCK_OWNER" ]; then
      echo "WARNING: $file was modified without a lock!"
      echo "Run: git lfs lock \"$file\" before pushing."
      exit 1
    elif [ "$LOCK_OWNER" != "$CURRENT_USER" ]; then
      echo "ERROR: $file is locked by $LOCK_OWNER, not you!"
      exit 1
    fi
  done
fi
```

## Break and fix

### Scenario 1: LFS files show as pointer text instead of actual content

After cloning the repository, binary files contain text like `version https://git-lfs.github.com/spec/v1` instead of actual binary data.

```bash
# Symptom: opening a .psd file shows text content
cat assets/textures/hero_diffuse.psd
# version https://git-lfs.github.com/spec/v1
# oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393
# size 214958080

# Diagnosis: LFS smudge filter didn't run during checkout
git lfs status
# Shows files that need to be downloaded
```


<details>
<summary>Show solution</summary>

**Fix**: Pull the actual LFS content:

```bash
# Pull all LFS files
git lfs pull

# Or pull only specific files/patterns
git lfs pull --include="assets/textures/*"

# If LFS wasn't installed before clone, install and fetch:
git lfs install
git lfs fetch --all
git lfs checkout

# Verify files are now real binary content
file assets/textures/hero_diffuse.psd
# Output: Adobe Photoshop Image, ...
```

</details>

### Scenario 2: Push fails with LFS bandwidth quota exceeded

```bash
# Error message:
# batch response: This repository is over its data quota.
# Account responsible for LFS bandwidth has exceeded limit.
# error: failed to push some refs to 'origin'
```


<details>
<summary>Show solution</summary>

**Fix**: Address the bandwidth issue:

```bash
# Check current usage
gh api repos/contoso/game-studio --jq '.size'

# Option 1: Purchase additional data packs (GitHub)
# Done through GitHub Settings > Billing > Git LFS Data

# Option 2: Reduce LFS bandwidth usage by using fetch with include/exclude
git config lfs.fetchinclude "assets/textures/*, assets/models/*"
git config lfs.fetchexclude "assets/cinematics/*"

# Option 3: Use a custom LFS server with no bandwidth limits
git config lfs.url "https://lfs.contoso.internal/game-studio"

# Option 4: For CI, cache LFS objects between runs
# .github/workflows/ci.yml
# - uses: actions/cache@v4
#   with:
#     path: .git/lfs
#     key: lfs-${{ hashFiles('.lfs-assets-id') }}
#     restore-keys: lfs-
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: ": A repository uses Git LFS to track '*.psd' files. A new developer clones the repository with 'GIT_LFS_SKIP_SMUDGE=1'. What will the '.psd' files contain in their working directory?",
    options: [
      "Empty files with zero bytes",
      "Text pointer files containing the LFS object ID and file size",
      "Corrupted binary data",
      "The files will not exist in the working directory"
    ],
    correctIndex: 1,
    explanation: "When GIT_LFS_SKIP_SMUDGE=1 is set, the LFS smudge filter is skipped during checkout. Instead of downloading the actual binary content from the LFS server, Git writes the LFS pointer file to disk. This pointer contains the LFS spec version, a SHA-256 OID of the actual content, and the file size. The developer can later run git lfs pull to download the actual content."
  },
  {
    question: ": After running 'git lfs migrate import --include=\"*.fbx\" --everything', what must all other team members do?",
    options: [
      "Run 'git lfs install' only",
      "Run 'git pull' to get the updated history",
      "Re-clone the repository because history was rewritten",
      "Delete their local '.fbx' files and run 'git checkout'"
    ],
    correctIndex: 2,
    explanation: "The git lfs migrate import --everything command rewrites the entire repository history, changing commit hashes for every commit that touched the migrated file types. This is similar to a git filter-branch or git filter-repo operation. Because all commit SHAs change, existing clones have incompatible history. Team members must delete their local clone and re-clone, or carefully use git fetch and git reset --hard origin/main (losing any local work)."
  },
  {
    question: ": What is the primary advantage of git-fat over Git LFS?",
    options: [
      "Better performance for large files",
      "Native integration with GitHub and Azure DevOps",
      "Flexibility to use any storage backend (S3, rsync, custom servers) without depending on a hosting provider's LFS implementation",
      "Built-in file locking for concurrent editing"
    ],
    correctIndex: 2,
    explanation: "git-fat allows teams to store large files on any storage backend they control (AWS S3, rsync servers, etc.) rather than relying on the hosting provider's LFS implementation and its associated quotas and costs. This is particularly useful for organizations with existing storage infrastructure or those who want to avoid per-GB bandwidth charges from GitHub or Azure DevOps LFS."
  },
  {
    question: ": A game artist locks 'character.fbx' with 'git lfs lock' and goes on vacation. Another artist needs to edit the file urgently. What is the correct approach?",
    options: [
      "Delete the file and recreate it to bypass the lock",
      "Use 'git lfs unlock --path=\"character.fbx\" --force' (requires maintain or admin permission)",
      "Disable LFS locking in the repository settings",
      "Edit the file locally without pushing until the lock is released"
    ],
    correctIndex: 1,
    explanation: "The --force flag on git lfs unlock allows someone other than the lock owner to release the lock. This requires elevated permissions (maintain or admin role on the repository). This is the correct emergency procedure. The team should also establish a policy for lock duration and delegation, and consider using lock expiration if supported by their LFS server."
  }
]} />

## Cleanup

```bash
# Untrack LFS file types (stop tracking new files, existing stay in LFS)
git lfs untrack "*.psd"
git lfs untrack "*.fbx"
git lfs untrack "*.blend"
git add .gitattributes
git commit -m "chore: remove LFS tracking rules"

# Remove all locks
git lfs locks --json | jq -r '.[].id' | xargs -I {} git lfs unlock --id={}

# Prune old LFS objects not referenced by current branches
git lfs prune
# Output: prune: 47 local objects, 12 retained, done.

# Remove LFS hooks (if uninstalling LFS entirely)
git lfs uninstall

# Clean LFS cache
rm -rf .git/lfs/objects

# Remove .gitfat configuration (if testing git-fat)
rm -f .gitfat

# Verify state
git lfs status
git lfs ls-files
```
