---
sidebar_position: 2
title: "Challenge 14: Versioning strategies"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 14: Versioning strategies

:::info Platform: both
This challenge covers versioning strategies applicable to both GitHub and Azure DevOps pipelines.
:::

## Exam skills

- Design and implement a dependency versioning strategy for code assets and packages, including semantic versioning (SemVer) and date-based (CalVer)
- Design and implement a versioning strategy for pipeline artifacts

## Scenario

Contoso has inconsistent versioning across their 15 microservice teams. The auth team uses dates like `20240115`, the payments team uses random build numbers, and three teams do not version their packages at all. This causes:

- Rollback failures because teams cannot identify which version is deployed
- Dependency conflicts when two libraries with incompatible changes share the same major version
- Inability to set up automated dependency update policies
- Audit failures due to untraceable artifact lineage

The VP of Engineering mandates a unified versioning strategy across all teams. Your task is to design and implement it.

## Tasks

### Task 1: Implement semantic versioning (SemVer)

Semantic versioning follows the format `MAJOR.MINOR.PATCH` where:
- **MAJOR** increments for incompatible API changes
- **MINOR** increments for backward-compatible new functionality
- **PATCH** increments for backward-compatible bug fixes

#### Pre-release tags

Pre-release versions append a hyphen and identifiers after the patch number:

```
1.0.0-alpha.1
1.0.0-beta.3
1.0.0-rc.1
```

Precedence order: `1.0.0-alpha.1 < 1.0.0-beta.1 < 1.0.0-rc.1 < 1.0.0`

#### Build metadata

Build metadata is appended with a plus sign and does not affect version precedence:

```
1.0.0+20240615
1.0.0-beta.1+build.42
```

#### Step 1: Configure SemVer for an npm package

Create a package and set its initial version:

```bash
mkdir contoso-data-models && cd contoso-data-models
npm init -y
npm version 1.0.0
```

Bump versions based on change type:

```bash
# Bug fix: 1.0.0 -> 1.0.1
npm version patch

# New feature (backward compatible): 1.0.1 -> 1.1.0
npm version minor

# Breaking change: 1.1.0 -> 2.0.0
npm version major

# Pre-release: 2.0.0 -> 2.1.0-beta.0
npm version preminor --preid=beta

# Increment pre-release: 2.1.0-beta.0 -> 2.1.0-beta.1
npm version prerelease
```

#### Step 2: Configure SemVer for a NuGet package

In the `.csproj` file:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <PackageId>Contoso.DataModels</PackageId>
    <Version>1.0.0</Version>
    <PackageVersion>1.0.0</PackageVersion>
    <Authors>Contoso</Authors>
    <Description>Shared data models for Contoso microservices</Description>
  </PropertyGroup>
</Project>
```

Override version at build time:

```bash
dotnet pack --configuration Release /p:Version=1.2.0-beta.1
```

### Task 2: Implement calendar versioning (CalVer)

CalVer uses date components as version identifiers. Common formats:

| Format | Example | Use case |
|--------|---------|----------|
| YYYY.MM.DD | 2024.06.15 | Daily releases, rolling deployments |
| YYYY.MM.MICRO | 2024.06.3 | Monthly releases with patch count |
| YYYY.MINOR.MICRO | 2024.2.1 | Yearly major, incremental minor |

CalVer works well for:
- Applications (not libraries) where API compatibility is not the primary concern
- Products with time-based release trains (Ubuntu uses YY.MM: 24.04)
- Internal services where "when was this deployed" matters more than "what changed"

#### Step 1: Generate a CalVer version in a shell script

```bash
CALVER=$(date +%Y.%m.%d)
BUILD_NUMBER=${GITHUB_RUN_NUMBER:-0}
VERSION="${CALVER}.${BUILD_NUMBER}"
echo "Version: $VERSION"
# Output: Version: 2024.06.15.42
```

#### Step 2: Use CalVer in a Dockerfile

```dockerfile
ARG VERSION=0.0.0
FROM mcr.microsoft.com/dotnet/aspnet:8.0
LABEL version="${VERSION}"
COPY ./publish /app
WORKDIR /app
ENTRYPOINT ["dotnet", "Contoso.Api.dll"]
```

Build with the version:

```bash
docker build --build-arg VERSION=$(date +%Y.%m.%d).$GITHUB_RUN_NUMBER -t contoso-api .
```

### Task 3: Automatic versioning in GitHub Actions

#### Option A: Git tag-based versioning

```yaml
name: Release with tag version
on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Extract version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF_NAME#v}" >> $GITHUB_OUTPUT

      - name: Build and publish
        run: |
          npm version ${{ steps.version.outputs.VERSION }} --no-git-tag-version
          npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Create and push a tag to trigger:

```bash
git tag v1.2.0
git push origin v1.2.0
```

#### Option B: GitVersion for automatic SemVer calculation

GitVersion analyzes your git history and branching model to automatically calculate the next version.

Install GitVersion as a .NET tool:

```bash
dotnet tool install --global GitVersion.Tool
```

Add a `GitVersion.yml` configuration:

```yaml
mode: ContinuousDeployment
branches:
  main:
    regex: ^main$
    tag: ''
    increment: Patch
  feature:
    regex: ^feature/
    tag: alpha
    increment: Minor
  release:
    regex: ^release/
    tag: rc
    increment: None
  hotfix:
    regex: ^hotfix/
    tag: beta
    increment: Patch
```

Use GitVersion in a GitHub Actions workflow:

```yaml
name: Build with GitVersion
on:
  push:
    branches: [main, 'feature/**', 'release/**']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install GitVersion
        uses: gittools/actions/gitversion/setup@v1
        with:
          versionSpec: '5.x'

      - name: Determine version
        id: gitversion
        uses: gittools/actions/gitversion/execute@v1

      - name: Display version
        run: |
          echo "SemVer: ${{ steps.gitversion.outputs.semVer }}"
          echo "NuGetVersion: ${{ steps.gitversion.outputs.nuGetVersion }}"
          echo "InformationalVersion: ${{ steps.gitversion.outputs.informationalVersion }}"

      - name: Build with version
        run: dotnet pack /p:Version=${{ steps.gitversion.outputs.nuGetVersion }}
```

### Task 4: Automatic versioning in Azure Pipelines

#### Option A: Using BuildId and pipeline variables

```yaml
trigger:
  - main

variables:
  majorVersion: 1
  minorVersion: 3
  patchVersion: $[counter(format('{0}.{1}', variables['majorVersion'], variables['minorVersion']), 0)]
  packageVersion: $(majorVersion).$(minorVersion).$(patchVersion)

pool:
  vmImage: ubuntu-latest

steps:
  - task: DotNetCoreCLI@2
    displayName: 'Pack with version'
    inputs:
      command: pack
      packagesToPack: '**/*.csproj'
      versioningScheme: byEnvVar
      versionEnvVar: packageVersion

  - task: NuGetCommand@2
    displayName: 'Push to feed'
    inputs:
      command: push
      publishVstsFeed: contoso-packages
```

#### Option B: Branch-based pre-release versioning

```yaml
variables:
  ${{ if eq(variables['Build.SourceBranch'], 'refs/heads/main') }}:
    versionSuffix: ''
  ${{ elseif startsWith(variables['Build.SourceBranch'], 'refs/heads/feature/') }}:
    versionSuffix: '-alpha.$(Build.BuildId)'
  ${{ elseif startsWith(variables['Build.SourceBranch'], 'refs/heads/release/') }}:
    versionSuffix: '-rc.$(Build.BuildId)'
  ${{ else }}:
    versionSuffix: '-dev.$(Build.BuildId)'

steps:
  - script: |
      VERSION="1.2.0$(versionSuffix)"
      echo "##vso[build.updatebuildnumber]$VERSION"
      echo "##vso[task.setvariable variable=packageVersion]$VERSION"
    displayName: 'Calculate version'

  - script: dotnet pack /p:Version=$(packageVersion) --output $(Build.ArtifactStagingDirectory)
    displayName: 'Pack NuGet'

  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: $(Build.ArtifactStagingDirectory)
      artifactName: packages
```

### Task 5: Pipeline artifact versioning strategies

Pipeline artifacts (build outputs, container images, Helm charts) require their own versioning:

#### Strategy 1: Semantic version from source

Tag artifacts with the same SemVer as the source package:

```bash
# Container image tagged with SemVer
docker build -t contoso.azurecr.io/auth-service:1.2.0 .
docker tag contoso.azurecr.io/auth-service:1.2.0 contoso.azurecr.io/auth-service:latest
docker push contoso.azurecr.io/auth-service:1.2.0
docker push contoso.azurecr.io/auth-service:latest
```

#### Strategy 2: BuildId for traceability

```yaml
steps:
  - script: |
      SHORT_SHA=$(echo $(Build.SourceVersion) | cut -c1-7)
      IMAGE_TAG="$(Build.BuildId)-${SHORT_SHA}"
      echo "##vso[task.setvariable variable=imageTag]$IMAGE_TAG"
    displayName: 'Generate image tag'

  - task: Docker@2
    inputs:
      containerRegistry: contoso-acr
      repository: auth-service
      command: buildAndPush
      tags: |
        $(imageTag)
        latest
```

#### Strategy 3: Hybrid (SemVer + build metadata)

```bash
VERSION="1.2.0+build.${GITHUB_RUN_NUMBER}.sha.${GITHUB_SHA:0:7}"
echo "Artifact version: $VERSION"
# Output: 1.2.0+build.42.sha.a1b2c3d
```

## Break and fix

### Scenario: Version conflict when two PRs merge simultaneously

Two developers merge PRs to main within seconds of each other. Both pipelines calculate the next version as `1.3.0` because they read the same latest tag. The second `npm publish` fails:

```
npm ERR! 403 Forbidden - PUT https://npm.pkg.github.com/@contoso/data-models
npm ERR! You cannot publish over the previously published versions: 1.3.0
```

<details>
<summary>Solution</summary>

**Root cause**: Both CI runs calculated the version from the same git state. Race conditions in tag-based versioning occur when parallel pipelines read the same "latest" tag before either has pushed a new one.

**Fix 1: Use a counter-based approach (Azure Pipelines)**

Azure Pipelines `counter()` expression is atomic and prevents duplicates:

```yaml
variables:
  patchVersion: $[counter(format('{0}.{1}', variables['majorVersion'], variables['minorVersion']), 0)]
```

Each pipeline run gets a unique, incrementing value regardless of timing.

**Fix 2: Use run number in pre-release tag (GitHub Actions)**

Include `GITHUB_RUN_NUMBER` which is unique per workflow:

```yaml
- name: Calculate version
  run: |
    LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
    BASE_VERSION=${LATEST_TAG#v}
    VERSION="${BASE_VERSION%.*}.$((${BASE_VERSION##*.} + 1))"
    echo "VERSION=$VERSION" >> $GITHUB_OUTPUT
```

**Fix 3: Retry with incremented patch**

Add retry logic that detects the 403 and increments:

```yaml
- name: Publish with retry
  run: |
    MAX_RETRIES=3
    ATTEMPT=0
    while [ $ATTEMPT -lt $MAX_RETRIES ]; do
      npm publish && break
      ATTEMPT=$((ATTEMPT + 1))
      CURRENT=$(node -p "require('./package.json').version")
      NEXT_PATCH=$((${CURRENT##*.} + 1))
      npm version "${CURRENT%.*}.$NEXT_PATCH" --no-git-tag-version
      echo "Retrying with version $(node -p "require('./package.json').version")"
    done
```

**Fix 4 (recommended): Use GitVersion with ContinuousDeployment mode**

GitVersion in ContinuousDeployment mode appends the commit count since last tag, ensuring uniqueness:

```
v1.3.0 tag on main
  -> commit A: 1.3.1-ci.1
  -> commit B: 1.3.1-ci.2  (always unique)
```

This avoids the race entirely because each commit produces a distinct version.

</details>

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "According to SemVer, which version has the highest precedence?",
    options: [
      "1.0.0-alpha",
      "1.0.0-beta.2",
      "1.0.0-rc.1",
      "1.0.0"
    ],
    correctIndex: 3,
    explanation: "A release version always has higher precedence than any pre-release version with the same MAJOR.MINOR.PATCH. Pre-release versions indicate instability. The order is: alpha < beta < rc < release."
  },
  {
    question: "A team releases their internal API gateway monthly and wants their version to communicate \"when\" rather than \"what changed.\" Which strategy should they use?",
    options: [
      "SemVer with pre-release tags",
      "CalVer with YYYY.MM format",
      "Auto-incrementing build numbers",
      "Git commit SHA as version"
    ],
    correctIndex: 1,
    explanation: "CalVer with YYYY.MM format communicates the release date directly in the version string. This is ideal for services on a time-based release cadence where deployment timing matters more than backward compatibility signaling."
  },
  {
    question: "In Azure Pipelines, which expression provides an atomic auto-incrementing integer that prevents version collisions between parallel runs?",
    options: [
      "'$(Build.BuildId)'",
      "'$[counter(variables['prefix'], 0)]'",
      "'$(Rev:r)'",
      "'$(System.JobAttempt)'"
    ],
    correctIndex: 1,
    explanation: "The counter() expression in Azure Pipelines provides an atomic, auto-incrementing integer scoped to a prefix. It is guaranteed to produce unique values even when multiple pipeline runs execute concurrently. $(Build.BuildId) is unique but not sequential per package."
  },
  {
    question: "A library tagged '2.1.0' receives two changes: a backward-compatible new method and a bug fix. What should the next version be?",
    options: [
      "2.1.1",
      "2.2.0",
      "3.0.0",
      "2.1.0-patch.1"
    ],
    correctIndex: 1,
    explanation: "When changes include a new backward-compatible feature (new method), the MINOR version increments. The bug fix would normally be a PATCH increment, but since MINOR is being bumped, the patch resets to 0. The result is 2.2.0."
  }
]} />

## Cleanup

Remove git tags created during this challenge:

```bash
git tag -d v1.0.0 v1.2.0 v1.3.0
git push origin --delete v1.0.0 v1.2.0 v1.3.0
```

Remove GitVersion tool if installed:

```bash
dotnet tool uninstall --global GitVersion.Tool
```

Remove project directories:

```bash
rm -rf contoso-data-models
```

Remove any Azure Pipelines counter state by updating the variable prefix in your pipeline YAML if you wish to reset counters.
