---
sidebar_position: 1
title: "Challenge 13: GitHub Packages and Azure Artifacts"
---

# Challenge 13: GitHub Packages and Azure Artifacts

:::info Platform: comparison
This challenge compares both GitHub Packages and Azure Artifacts side by side.
:::

## Exam skills

- Recommend package management tools including GitHub Packages and Azure Artifacts
- Design and implement package feeds and views for local and upstream packages

## Scenario

Contoso Ltd has 15 microservices sharing 4 internal libraries (auth-sdk, logging-sdk, data-models, and api-contracts). Currently, teams copy source code between repos. The VP of Engineering wants a centralized package management solution with:
- Private package hosting
- Vulnerability scanning on dependencies
- Access control per team
- Support for npm and NuGet packages

Your job is to evaluate both GitHub Packages and Azure Artifacts, configure each platform, and recommend the best fit for Contoso's multi-language ecosystem.

## Tasks

### Task 1: Set up GitHub Packages (npm)

#### Step 1: Create the library project

```bash
mkdir contoso-auth-sdk && cd contoso-auth-sdk
npm init -y
```

Edit `package.json` to scope the package to your GitHub organization:

```json
{
  "name": "@contoso/auth-sdk",
  "version": "1.0.0",
  "description": "Contoso internal authentication SDK",
  "main": "index.js",
  "repository": {
    "type": "git",
    "url": "https://github.com/contoso/auth-sdk.git"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

#### Step 2: Configure authentication

Create a `.npmrc` file in the project root to point to GitHub Packages:

```ini
@contoso:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Generate a personal access token with the `read:packages` and `write:packages` scopes:

```bash
gh auth token
```

Or set the token as an environment variable:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Step 3: Publish the package

```bash
npm publish
```

Verify the package exists:

```bash
gh api /orgs/contoso/packages/npm/auth-sdk
```

#### Step 4: Consume the package in another project

In the consuming microservice repository, create a `.npmrc`:

```ini
@contoso:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Install the package:

```bash
npm install @contoso/auth-sdk
```

#### Step 5: Set package visibility and permissions

Set the package to internal (visible to all organization members):

```bash
gh api --method PUT /orgs/contoso/packages/npm/auth-sdk/visibility \
  -f visibility=internal
```

Grant a specific team write access:

```bash
gh api --method PUT /orgs/contoso/packages/npm/auth-sdk/teams/backend-team \
  -f permission=write
```

#### Step 6: Publish from GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish package
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://npm.pkg.github.com/
      - run: npm ci
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Task 2: Set up Azure Artifacts (npm and NuGet)

#### Step 1: Create an Azure Artifacts feed

```bash
az artifacts feed create \
  --name contoso-packages \
  --organization https://dev.azure.com/contoso \
  --project ContosoServices \
  --scope project
```

#### Step 2: Configure upstream sources

Add npmjs.com as an upstream source so public packages are proxied through your feed:

```bash
az rest --method post \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages/upstreamsources?api-version=7.1-preview.1" \
  --body '{
    "name": "npmjs",
    "protocol": "npm",
    "location": "https://registry.npmjs.org/",
    "upstreamSourceType": "public"
  }'
```

Add nuget.org upstream:

```bash
az rest --method post \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages/upstreamsources?api-version=7.1-preview.1" \
  --body '{
    "name": "nuget.org",
    "protocol": "nuget",
    "location": "https://api.nuget.org/v3/index.json",
    "upstreamSourceType": "public"
  }'
```

#### Step 3: Publish an npm package to Azure Artifacts

Configure `.npmrc` for the Azure Artifacts feed:

```ini
registry=https://pkgs.dev.azure.com/contoso/ContosoServices/_packaging/contoso-packages/npm/registry/
always-auth=true
//pkgs.dev.azure.com/contoso/ContosoServices/_packaging/contoso-packages/npm/registry/:_authToken=${AZURE_DEVOPS_PAT}
```

Publish:

```bash
npm publish
```

#### Step 4: Publish a NuGet package to Azure Artifacts

Create a NuGet source:

```bash
dotnet nuget add source \
  "https://pkgs.dev.azure.com/contoso/ContosoServices/_packaging/contoso-packages/nuget/v3/index.json" \
  --name contoso-packages \
  --username contoso \
  --password $AZURE_DEVOPS_PAT \
  --store-password-in-clear-text
```

Pack and publish a .NET library:

```bash
dotnet pack --configuration Release --output ./nupkgs
dotnet nuget push ./nupkgs/*.nupkg \
  --source contoso-packages \
  --api-key az
```

#### Step 5: Set feed permissions

Grant the backend team contributor access (can publish and consume):

```bash
az rest --method patch \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages/permissions?api-version=7.1-preview.1" \
  --body '[{
    "identityDescriptor": "Microsoft.TeamFoundation.Identity;S-1-9-xxx",
    "role": "contributor"
  }]'
```

Feed roles in Azure Artifacts:
- **Reader**: Can consume packages from the feed
- **Collaborator**: Can consume packages and save packages from upstream sources
- **Contributor**: Can publish new packages and versions
- **Owner**: Full control including feed deletion and permission management

#### Step 6: Create views (prerelease and release)

```bash
az rest --method post \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages/views?api-version=7.1-preview.1" \
  --body '{
    "name": "prerelease",
    "type": "implicit",
    "visibility": "private"
  }'

az rest --method post \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages/views?api-version=7.1-preview.1" \
  --body '{
    "name": "release",
    "type": "implicit",
    "visibility": "organization"
  }'
```

Promote a package version to the release view:

```bash
az rest --method post \
  --uri "https://pkgs.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages/npm/@contoso/auth-sdk/versions/1.0.0?api-version=7.1-preview.1" \
  --body '{
    "views": { "op": "add", "path": "/views/-", "value": "release" }
  }'
```

### Task 3: Configure upstream sources

Upstream sources allow your private feed to proxy public registries. When a developer requests a package that does not exist locally, the feed fetches it from the configured upstream and caches it.

#### Step 1: Understand upstream source behavior

- First request: Package is fetched from upstream and saved to the local feed
- Subsequent requests: Package is served from the local feed cache
- If the upstream goes offline, cached packages remain available
- New versions from upstream are fetched on demand

#### Step 2: Configure priority order

Upstream sources are evaluated in priority order. Place your internal feed first so internal packages take precedence over public ones with the same name:

```bash
az rest --method patch \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages?api-version=7.1-preview.1" \
  --body '{
    "upstreamSources": [
      {
        "name": "contoso-shared",
        "protocol": "npm",
        "location": "https://pkgs.dev.azure.com/contoso/_packaging/shared-libs/npm/registry/",
        "upstreamSourceType": "internal"
      },
      {
        "name": "npmjs",
        "protocol": "npm",
        "location": "https://registry.npmjs.org/",
        "upstreamSourceType": "public"
      }
    ]
  }'
```

#### Step 3: Test upstream resolution

Install a public package through your feed:

```bash
npm install lodash --registry https://pkgs.dev.azure.com/contoso/ContosoServices/_packaging/contoso-packages/npm/registry/
```

Verify it was cached in your feed by checking the feed contents in Azure DevOps or via API:

```bash
az rest --method get \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages/npm/packages?api-version=7.1-preview.1"
```

## Break and fix

### Scenario: Package publishing fails with 403

A developer reports they cannot publish to the GitHub Package Registry. The error is:

```
npm ERR! 403 Forbidden - PUT https://npm.pkg.github.com/@contoso/auth-sdk
```

Diagnose and fix the issue. Common causes:

1. Missing `packages: write` permission in the workflow
2. Package name does not match the repository owner scope
3. `.npmrc` pointing to wrong registry
4. Token does not have `write:packages` scope

<details>
<summary>Solution</summary>

**Cause 1: Missing permissions in GitHub Actions workflow**

The workflow file must explicitly declare package write permissions:

```yaml
permissions:
  contents: read
  packages: write
```

Without this, the `GITHUB_TOKEN` defaults to read-only for packages in workflows triggered by pull requests from forks.

**Cause 2: Package scope mismatch**

GitHub Packages requires the package scope (`@contoso/`) to match the repository owner. Verify the package name:

```bash
cat package.json | grep name
# Must output: "@contoso/auth-sdk" where "contoso" matches the org/user owning the repo
```

Fix by updating `package.json`:

```json
{
  "name": "@contoso/auth-sdk"
}
```

**Cause 3: Incorrect .npmrc configuration**

Check which registry npm is targeting:

```bash
npm config get registry
cat .npmrc
```

Ensure the `.npmrc` contains:

```ini
@contoso:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

**Cause 4: Token missing required scopes**

Verify the token scopes:

```bash
gh auth status
```

If using a classic PAT, regenerate with `write:packages` scope. If using a fine-grained PAT, ensure the token has package write permissions for the target repository.

To test with a fresh token:

```bash
gh auth refresh --scopes write:packages,read:packages
export GITHUB_TOKEN=$(gh auth token)
npm publish
```

</details>

## Knowledge check

1. Which package types does GitHub Packages support?
   - A) npm, Maven, NuGet, Docker, RubyGems
   - B) npm only
   - C) npm and Docker only
   - D) npm, Maven, and pip

2. What is the maximum number of upstream sources in a single Azure Artifacts feed?
   - A) 1
   - B) 5
   - C) Unlimited
   - D) 10

3. A company needs package vulnerability scanning integrated with their pipeline. Which solution provides this natively?
   - A) Azure Artifacts with Defender for Cloud
   - B) GitHub Packages with Dependabot
   - C) Both A and B
   - D) Neither - requires third-party tools

4. What happens when a package in an Azure Artifacts upstream source is consumed for the first time?
   - A) It is always fetched from upstream on each request
   - B) A copy is saved to the local feed
   - C) It is only available in the prerelease view
   - D) It requires manual approval

<details>
<summary>Answers</summary>

1. **A** - GitHub Packages supports npm, Maven, NuGet, Docker (container images), and RubyGems. Python (pip) packages are not natively supported by GitHub Packages.

2. **C** - Azure Artifacts does not impose a hard limit on the number of upstream sources per feed. You can configure as many as needed, though performance considerations apply with very large numbers.

3. **C** - Both platforms provide native vulnerability scanning. GitHub uses Dependabot for security alerts and automated PRs. Azure integrates with Microsoft Defender for DevOps to scan for vulnerable dependencies.

4. **B** - When a package from an upstream source is requested for the first time, Azure Artifacts downloads it and saves a copy to the local feed. Subsequent requests are served from the cached copy, providing resilience against upstream outages.

</details>

## Cleanup

Remove the GitHub Package:

```bash
gh api --method DELETE /orgs/contoso/packages/npm/auth-sdk
```

If versioned deletion is needed:

```bash
# List versions
gh api /orgs/contoso/packages/npm/auth-sdk/versions

# Delete a specific version
gh api --method DELETE /orgs/contoso/packages/npm/auth-sdk/versions/PACKAGE_VERSION_ID
```

Delete the Azure Artifacts feed:

```bash
az artifacts feed delete \
  --name contoso-packages \
  --organization https://dev.azure.com/contoso \
  --project ContosoServices \
  --yes
```

Remove local npm configuration:

```bash
rm .npmrc
dotnet nuget remove source contoso-packages
```

Remove the local project directories:

```bash
rm -rf contoso-auth-sdk
```
