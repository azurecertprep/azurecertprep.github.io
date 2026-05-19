---
sidebar_position: 6
title: 'Challenge 12: Mono-repo vs multi-repo'
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 12: Mono-repo vs multi-repo

:::info Platform: comparison
:::

## Exam skills

- Design a strategy for scaling and optimizing a Git repository, including Scalar and cross-repository sharing

## Scenario

Contoso Ltd operates 15 microservices that make up their e-commerce platform: user-service, catalog-service, order-service, payment-service, shipping-service, notification-service, search-service, analytics-service, auth-service, inventory-service, review-service, recommendation-service, admin-portal, customer-portal, and shared-libs. Some teams advocate for a mono-repo (easier cross-service refactoring, single CI pipeline, atomic changes). Others want separate repos (clear ownership, independent deployments, smaller clone sizes). The repository has grown to 8GB with 5 years of history and 50,000 commits. Clone time is 25 minutes. The CTO wants a data-driven recommendation with implementation details for whichever approach is chosen.

## Tasks

### Task 1: Mono-repo advantages and disadvantages

Document the trade-offs for Contoso's specific situation:

#### Mono-repo analysis for Contoso e-commerce platform

**Advantages:**
- Atomic cross-service changes (rename a shared type, update all 15 services in one commit)
- Single source of truth for shared libraries (no version drift between services)
- Unified CI/CD pipeline configuration
- Easier code discovery and cross-team collaboration
- Consistent tooling and linting across all services
- Simplified dependency management (all services use same versions)
- Refactoring across service boundaries is straightforward

**Disadvantages:**
- Repository size (8GB) makes clone slow (25 min)
- All 50 developers trigger CI on every push (without path filtering)
- Permission granularity is limited (harder to restrict access per-service)
- Single point of failure (repo outage affects all teams)
- Merge conflicts on shared files (package.json, CI config)
- Git operations slow down as history grows
- All teams must agree on branching strategy

Example mono-repo structure:

```
contoso-platform/
├── services/
│   ├── user-service/
│   │   ├── src/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── order-service/
│   │   ├── src/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── payment-service/
│       └── ...
├── libs/
│   ├── shared-types/
│   ├── common-utils/
│   └── auth-middleware/
├── infrastructure/
│   ├── terraform/
│   └── kubernetes/
├── tools/
│   ├── scripts/
│   └── generators/
├── .github/workflows/
├── package.json (workspace root)
└── nx.json (or turborepo.json)
```

### Task 2: Multi-repo advantages and disadvantages

#### Multi-repo analysis for Contoso e-commerce platform

**Advantages:**
- Clear ownership boundaries (each team owns their repo)
- Independent release cycles and versioning
- Fine-grained access control per repository
- Smaller repos are fast to clone and operate on
- Teams can choose their own tooling and languages
- Failures are isolated (one repo's CI issues don't block others)
- Scales well with organizational growth

**Disadvantages:**
- Cross-service changes require coordinated PRs across repos
- Shared library versioning creates diamond dependency problems
- Inconsistent tooling and practices across repos
- Discovery is harder (where does this service live?)
- Integration testing requires checking out multiple repos
- Dependency updates must propagate through each repo separately
- Refactoring across service boundaries is painful

Example multi-repo structure:

```
# GitHub organization: contoso
contoso/user-service          (team: identity)
contoso/catalog-service       (team: catalog)
contoso/order-service         (team: commerce)
contoso/payment-service       (team: commerce)
contoso/shipping-service      (team: fulfillment)
contoso/notification-service  (team: platform)
contoso/search-service        (team: catalog)
contoso/analytics-service     (team: data)
contoso/auth-service          (team: identity)
contoso/inventory-service     (team: fulfillment)
contoso/review-service        (team: catalog)
contoso/recommendation-service (team: data)
contoso/admin-portal          (team: platform)
contoso/customer-portal       (team: frontend)
contoso/shared-libs           (team: platform)
```

### Task 3: Implement Scalar for large repo optimization

Scalar (maintained by Microsoft, integrated into Git since 2.38) optimizes large repository performance:

```bash
# Register the repository with Scalar (enables all optimizations)
scalar register

# What Scalar enables:
# - Partial clone (only download needed objects)
# - Filesystem monitor (FSMonitor for faster git status)
# - Commit-graph (faster git log and traversal)
# - Multi-pack index (faster object lookups)
# - Background maintenance (prefetch, gc, commit-graph updates)

# Clone a large repo with Scalar (partial clone + sparse checkout)
scalar clone https://github.com/contoso/platform-monorepo.git
cd platform-monorepo

# Verify Scalar configuration
scalar list
# Output: C:/repos/platform-monorepo

# Check what optimizations are active
git config --list | grep -E "(core.fsmonitor|core.multipackindex|fetch.writeCommitGraph|maintenance)"
# Output:
# core.fsmonitor=true
# core.multipackindex=true
# fetch.writecommitgraph=true
# maintenance.auto=false
# maintenance.strategy=incremental

# View scheduled maintenance tasks
scalar run
# Runs: prefetch, commit-graph, loose-objects, incremental-repack

# Manual Scalar commands
scalar diagnose    # Generate diagnostic zip for troubleshooting
scalar cache-server --set https://cache.contoso.internal  # Use a cache server
scalar unregister  # Remove Scalar from this repo
```

Configure Scalar for CI runners:

```yaml
# .github/workflows/ci-with-scalar.yml
name: CI with Scalar optimization
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Scalar clone (partial + sparse)
        run: |
          scalar clone https://github.com/contoso/platform-monorepo.git repo
          cd repo
          # Only fetch objects needed for the changed service
          git sparse-checkout set services/order-service libs/shared-types
```

### Task 4: Configure sparse-checkout for mono-repo subset access

Allow developers to work on only their team's service within the mono-repo:

```bash
# Initialize sparse-checkout in cone mode (faster than pattern mode)
git sparse-checkout init --cone

# Only check out the order-service and shared libraries
git sparse-checkout set services/order-service libs/shared-types libs/common-utils

# View what's included
git sparse-checkout list
# Output:
# services/order-service
# libs/shared-types
# libs/common-utils

# The working directory now only shows those paths:
ls services/
# Output: order-service/

# Add another service temporarily (e.g., for cross-service debugging)
git sparse-checkout add services/payment-service

# Remove a path from sparse checkout
git sparse-checkout set services/order-service libs/shared-types
# (payment-service files disappear from working directory)

# Disable sparse-checkout (get everything back)
git sparse-checkout disable

# Combine with partial clone for maximum speed
git clone --filter=blob:none --sparse https://github.com/contoso/platform-monorepo.git
cd platform-monorepo
git sparse-checkout set services/user-service libs/auth-middleware
# Only downloads blobs for the sparse paths (not entire repo history)
```

Create team-specific sparse-checkout profiles:

```bash
# scripts/sparse-profiles/commerce-team.sh
#!/bin/bash
git sparse-checkout set \
  services/order-service \
  services/payment-service \
  services/inventory-service \
  libs/shared-types \
  libs/common-utils \
  infrastructure/kubernetes/order-service \
  infrastructure/kubernetes/payment-service

# scripts/sparse-profiles/frontend-team.sh
#!/bin/bash
git sparse-checkout set \
  services/customer-portal \
  services/admin-portal \
  libs/shared-types \
  libs/ui-components

# scripts/sparse-profiles/data-team.sh
#!/bin/bash
git sparse-checkout set \
  services/analytics-service \
  services/recommendation-service \
  libs/shared-types \
  libs/data-utils \
  infrastructure/terraform/analytics
```

### Task 5: Git submodules for cross-repo dependencies

Set up submodules when using multi-repo to share common libraries:

```bash
# Add shared-libs as a submodule in the order-service repo
cd order-service
git submodule add https://github.com/contoso/shared-libs.git libs/shared
git commit -m "chore: add shared-libs as submodule"

# The .gitmodules file tracks submodule configuration
cat .gitmodules
# [submodule "libs/shared"]
#     path = libs/shared
#     url = https://github.com/contoso/shared-libs.git
#     branch = main

# Pin to a specific version/tag of shared-libs
cd libs/shared
git checkout v2.3.0
cd ..
git add libs/shared
git commit -m "chore: pin shared-libs to v2.3.0"

# Clone a repo with submodules
git clone --recurse-submodules https://github.com/contoso/order-service.git

# If already cloned without submodules, initialize them
git submodule init
git submodule update

# Update submodule to latest commit on its tracked branch
git submodule update --remote libs/shared
git add libs/shared
git commit -m "chore: update shared-libs to latest"

# Update all submodules
git submodule update --remote --merge

# Run a command in all submodules
git submodule foreach 'git checkout main && git pull'

# Remove a submodule
git submodule deinit libs/shared
git rm libs/shared
rm -rf .git/modules/libs/shared
git commit -m "chore: remove shared-libs submodule"
```

### Task 6: Azure DevOps multi-repo checkout in pipelines

Configure Azure Pipelines to check out multiple repositories:

```yaml
# azure-pipelines.yml - Multi-repo checkout
trigger:
  branches:
    include:
      - main

resources:
  repositories:
    - repository: shared-libs
      type: git
      name: Contoso-Platform/shared-libs
      ref: refs/tags/v2.3.0
    - repository: infrastructure
      type: git
      name: Contoso-Platform/infrastructure
      ref: refs/heads/main
    - repository: order-service
      type: github
      name: contoso/order-service
      endpoint: github-service-connection

pool:
  vmImage: 'ubuntu-latest'

steps:
  # Check out the primary repo (self)
  - checkout: self
    path: s/payment-service
    fetchDepth: 1

  # Check out additional repos
  - checkout: shared-libs
    path: s/shared-libs
    fetchDepth: 1

  - checkout: infrastructure
    path: s/infrastructure
    fetchDepth: 1

  - script: |
      echo "Directory structure:"
      ls -la $(Pipeline.Workspace)/s/
      # Output:
      # payment-service/
      # shared-libs/
      # infrastructure/
    displayName: 'Verify multi-repo checkout'

  - script: |
      cd $(Pipeline.Workspace)/s/payment-service
      npm ci
      # Reference shared libs from adjacent checkout
      npm link ../shared-libs
      npm run build
      npm test
    displayName: 'Build with shared dependencies'

  - script: |
      cd $(Pipeline.Workspace)/s/infrastructure
      terraform init
      terraform plan -var-file=environments/prod.tfvars
    displayName: 'Validate infrastructure'
```

### Task 7: GitHub Actions checkout multiple repos

Configure GitHub Actions to work with multiple repositories:

```yaml
# .github/workflows/ci-multi-repo.yml
name: CI with multi-repo dependencies
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Check out the primary repo
      - uses: actions/checkout@v4
        with:
          path: order-service

      # Check out shared libraries (public repo)
      - uses: actions/checkout@v4
        with:
          repository: contoso/shared-libs
          ref: v2.3.0
          path: shared-libs

      # Check out private repo (requires PAT or GitHub App token)
      - uses: actions/checkout@v4
        with:
          repository: contoso/infrastructure
          token: ${{ secrets.CROSS_REPO_TOKEN }}
          path: infrastructure

      - name: Build with dependencies
        working-directory: order-service
        run: |
          npm ci
          # Create symlink to shared libs
          ln -s ../shared-libs/packages/common ./node_modules/@contoso/common
          npm run build

      - name: Run integration tests
        run: |
          cd order-service
          npm run test:integration -- --config ../infrastructure/test-config.json
```

### Task 8: Build optimization with path triggers

Only build and test services that actually changed:

```yaml
# .github/workflows/ci-path-triggers.yml
name: Mono-repo path-based CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      order-service: ${{ steps.changes.outputs.order-service }}
      payment-service: ${{ steps.changes.outputs.payment-service }}
      shared-libs: ${{ steps.changes.outputs.shared-libs }}
      user-service: ${{ steps.changes.outputs.user-service }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: changes
        with:
          filters: |
            order-service:
              - 'services/order-service/**'
              - 'libs/shared-types/**'
              - 'libs/common-utils/**'
            payment-service:
              - 'services/payment-service/**'
              - 'libs/shared-types/**'
            shared-libs:
              - 'libs/**'
            user-service:
              - 'services/user-service/**'
              - 'libs/auth-middleware/**'

  build-order-service:
    needs: detect-changes
    if: needs.detect-changes.outputs.order-service == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          sparse-checkout: |
            services/order-service
            libs/shared-types
            libs/common-utils
      - name: Build order-service
        working-directory: services/order-service
        run: |
          npm ci
          npm run build
          npm test

  build-payment-service:
    needs: detect-changes
    if: needs.detect-changes.outputs.payment-service == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          sparse-checkout: |
            services/payment-service
            libs/shared-types
      - name: Build payment-service
        working-directory: services/payment-service
        run: |
          npm ci
          npm run build
          npm test

  # If shared libs change, rebuild ALL dependent services
  build-all-on-shared-change:
    needs: detect-changes
    if: needs.detect-changes.outputs.shared-libs == 'true'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service:
          - order-service
          - payment-service
          - user-service
          - catalog-service
          - shipping-service
    steps:
      - uses: actions/checkout@v4
      - name: Build ${{ matrix.service }}
        working-directory: services/${{ matrix.service }}
        run: |
          npm ci
          npm run build
          npm test
```

Azure Pipelines equivalent with path triggers:

```yaml
# azure-pipelines.yml - Path-based triggers
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - services/order-service/**
      - libs/shared-types/**

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'

  - script: |
      cd services/order-service
      npm ci
      npm run build
      npm test
    displayName: 'Build and test order-service'
```

## Break and fix

### Scenario 1: Sparse-checkout is missing files needed for build

A developer configured sparse-checkout for `services/order-service` only, but the build fails because it imports from `libs/shared-types` which is not checked out.

```bash
# Error during build:
npm run build
# ERROR: Cannot find module '@contoso/shared-types'
# Module not found: libs/shared-types/index.ts

# Check what's currently included
git sparse-checkout list
# Output: services/order-service (missing libs!)
```

**Fix**: Add the missing dependency paths to sparse-checkout:

```bash
# Add the shared library paths
git sparse-checkout add libs/shared-types libs/common-utils

# Verify the files are now available
ls libs/shared-types/
# Output: index.ts  package.json  src/  ...

# Re-run the build
cd services/order-service
npm run build
# Success!

# Document dependencies in a sparse profile for the team
cat > .sparse-profiles/order-service.txt << 'EOF'
services/order-service
libs/shared-types
libs/common-utils
infrastructure/kubernetes/order-service
EOF
```

### Scenario 2: Submodule is stuck at old commit after pull

After running `git pull`, the submodule directory still shows the old version even though `.gitmodules` was updated.

```bash
# The submodule shows as modified but content is old
git status
# Output:
# modified: libs/shared (new commits)

git diff
# Shows submodule pointer changed but local copy is behind

# The submodule directory has the old code
cd libs/shared
git log --oneline -1
# abc1234 (HEAD) old commit from 2 weeks ago
```

**Fix**: Update the submodule to match what the parent repo expects:

```bash
# Update submodule to the commit specified by the parent
cd ..
git submodule update --init --recursive

# Verify it's now at the correct commit
cd libs/shared
git log --oneline -1
# def5678 (HEAD) latest pinned commit

# If you want to update to the latest on the tracked branch instead:
cd ..
git submodule update --remote libs/shared
git add libs/shared
git commit -m "chore: update shared-libs submodule to latest"
```

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: ": Contoso has a mono-repo with 15 microservices. A developer only works on the order-service and needs to clone the repo quickly. Which combination of Git features provides the fastest clone with minimal disk usage?",
    options: [
      "'git clone --depth=1' (shallow clone)",
      "'git clone --filter=blob:none --sparse' followed by 'git sparse-checkout set services/order-service'",
      "'git clone' followed by deleting unwanted directories",
      "'git clone --single-branch --branch=main'"
    ],
    correctIndex: 1,
    explanation: "This combination uses partial clone (--filter=blob:none) to skip downloading blob objects until they are needed, and sparse-checkout to only materialize the files for the specified paths. Together, they minimize both network transfer and disk usage. The developer gets full commit history (for blame, log, etc.) but only downloads file content for the paths they need. Shallow clone (option A) limits history depth but still downloads all files. Option D still downloads all blobs across all paths."
  },
  {
    question: ": What does Scalar's 'scalar register' command enable for a Git repository?",
    options: [
      "Uploads the repository to a centralized Scalar server for caching",
      "Enables a set of Git performance optimizations including FSMonitor, commit-graph, multi-pack index, and background maintenance",
      "Converts the repository to a new Scalar-specific format incompatible with standard Git",
      "Enables server-side partial clone filtering for all clones of this repository"
    ],
    correctIndex: 1,
    explanation: "scalar register configures the local repository with performance optimizations that are all part of standard Git but not enabled by default. These include: FSMonitor (filesystem watcher for faster git status), commit-graph (pre-computed graph for faster log/traversal), multi-pack index (faster object lookups), and scheduled background maintenance tasks (prefetch, commit-graph updates, loose object cleanup, incremental repack). The repository remains a standard Git repository accessible by any Git client."
  },
  {
    question: ": In a multi-repo setup, team A updates 'shared-libs' v2.3.0 to v2.4.0 with a breaking change. What is the primary challenge this creates?",
    options: [
      "All other repos automatically update and may break",
      "Each consuming repo must independently update their dependency, test, and release, creating coordination overhead and risk of version drift",
      "Git submodules prevent any repo from using the new version",
      "The shared-libs repo must be forked for each consuming team"
    ],
    correctIndex: 1,
    explanation: "In a multi-repo setup, updating a shared dependency requires each consuming repository to explicitly update their reference (submodule pointer, package version, etc.), run their own tests, and deploy. This creates coordination overhead, especially with breaking changes. Some repos may stay on v2.3.0 while others move to v2.4.0, creating version drift. In a mono-repo, the breaking change and all updates to consumers happen in a single atomic commit."
  },
  {
    question: ": An Azure Pipelines YAML file uses 'trigger.paths.include' to only build when specific paths change. A developer modifies 'libs/shared-types/index.ts'. Which pipeline behavior is correct?",
    options: [
      "All pipelines trigger because any file change triggers all pipelines by default",
      "Only pipelines whose 'paths.include' matches 'libs/shared-types/**' will trigger",
      "No pipelines trigger because library changes are excluded by default",
      "The pipeline triggers but skips the build step and only runs tests"
    ],
    correctIndex: 1,
    explanation: "Azure Pipelines path triggers filter which pushes activate a pipeline. When trigger.paths.include is configured, the pipeline only runs if at least one changed file matches the include patterns. A change to libs/shared-types/index.ts only triggers pipelines that include libs/shared-types/ or libs/ in their path filter. Other pipelines (e.g., those only watching services/user-service/) will not trigger. This is how mono-repos achieve per-service CI efficiency."
  }
]} />

## Cleanup

```bash
# Remove Scalar registration
scalar unregister 2>/dev/null

# Reset sparse-checkout
git sparse-checkout disable 2>/dev/null

# Remove submodules added during testing
git submodule deinit --all -f 2>/dev/null
rm -rf .git/modules/* 2>/dev/null

# Remove test directories and files
rm -rf services/ libs/ infrastructure/ tools/ 2>/dev/null
rm -f .gitmodules nx.json turborepo.json 2>/dev/null
rm -rf .sparse-profiles/ 2>/dev/null

# Remove workflow files created during this challenge
rm -f .github/workflows/ci-path-triggers.yml
rm -f .github/workflows/ci-multi-repo.yml
rm -f .github/workflows/ci-with-scalar.yml

# Clean up any partial clone filter config
git config --unset remote.origin.promisor 2>/dev/null
git config --unset remote.origin.partialclonefilter 2>/dev/null

# Verify clean state
git status
git config --list | grep -E "(scalar|sparse|fsmonitor|multipack)"
```
