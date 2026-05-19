---
sidebar_position: 5
title: "Challenge 43: Sensitive file handling and leak prevention"
---

# Challenge 43: Sensitive file handling and leak prevention

## Exam skills covered

- Design and implement a strategy for managing sensitive files during deployment, including Azure Pipelines secure files
- Design pipelines to prevent leakage of sensitive information

## Scenario

A Contoso Ltd developer accidentally logged a database connection string in a pipeline output when debugging a deployment failure. The same week, another developer committed a `.env` file containing production API keys to the repository. The secrets were exposed in the commit history for three days before anyone noticed. You must implement multiple layers of protection to prevent secret leakage in both pipeline output and source control.

## Prerequisites

- Azure DevOps project with a pipeline
- GitHub repository with GitHub Actions
- Git installed locally
- Python 3.8+ (for pre-commit hooks)

## Tasks

### Task 1: Azure Pipelines secure files

Secure files in Azure Pipelines are stored encrypted and can only be consumed by specific tasks. They are ideal for certificates, SSH keys, and configuration files.

```bash
# Upload a secure file via CLI
# First, create a sample certificate for testing
openssl req -x509 -newkey rsa:4096 -keyout contoso-deploy.key -out contoso-deploy.crt \
  -days 365 -nodes -subj "/CN=contoso-deploy"

# Upload via Azure DevOps REST API
curl -X POST \
  "https://dev.azure.com/contoso/ContosoWeb/_apis/distributedtask/securefiles?api-version=7.1-preview.1" \
  -H "Authorization: Basic $(echo -n :$PAT | base64)" \
  -F "file=@contoso-deploy.crt" \
  -F "name=contoso-deploy.crt"
```

Use secure files in a pipeline:

```yaml
# azure-pipelines.yml
pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: DownloadSecureFile@1
    name: deployCert
    inputs:
      secureFile: 'contoso-deploy.crt'
    displayName: 'Download deployment certificate'

  - task: DownloadSecureFile@1
    name: deployKey
    inputs:
      secureFile: 'contoso-deploy.key'
    displayName: 'Download deployment key'

  - script: |
      echo "Certificate downloaded to: $(deployCert.secureFilePath)"
      echo "Key downloaded to: $(deployKey.secureFilePath)"

      # Use the certificate for deployment
      cp $(deployCert.secureFilePath) /home/vsts/.ssh/deploy.crt
      cp $(deployKey.secureFilePath) /home/vsts/.ssh/deploy.key
      chmod 600 /home/vsts/.ssh/deploy.key

      # Deploy using the certificate
      scp -i /home/vsts/.ssh/deploy.key \
        -o StrictHostKeyChecking=no \
        ./build/* deploy@contoso-prod.eastus.cloudapp.azure.com:/app/
    displayName: 'Deploy with certificate'

  - script: |
      # Secure files are automatically deleted after the pipeline completes
      # but explicitly remove sensitive files from the agent
      rm -f /home/vsts/.ssh/deploy.key
      rm -f /home/vsts/.ssh/deploy.crt
    displayName: 'Clean up sensitive files'
    condition: always()
```

Configure secure file permissions:

1. Pipelines > Library > Secure files
2. Select the file > Pipeline permissions: restrict to specific pipelines
3. Select the file > Approvals and checks: add approvers for production certificates

### Task 2: GitHub Actions: mask secrets in logs

```yaml
# .github/workflows/masked-secrets.yml
name: Deployment with secret masking
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Retrieve and mask dynamic secrets
        id: secrets
        run: |
          # Retrieve a secret at runtime
          DB_CONN=$(az keyvault secret show \
            --vault-name kv-contoso-secrets-001 \
            --name SqlConnectionString \
            --query value -o tsv)

          # Mask the value so it never appears in logs
          echo "::add-mask::$DB_CONN"

          # Store for later steps
          echo "db-connection=$DB_CONN" >> $GITHUB_OUTPUT

          # Also mask partial values that might leak
          DB_PASSWORD=$(echo "$DB_CONN" | grep -oP 'Password=\K[^;]+')
          echo "::add-mask::$DB_PASSWORD"

      - name: Deploy (secret is masked even if accidentally echoed)
        run: |
          # This would print *** instead of the actual value
          echo "Connection: ${{ steps.secrets.outputs.db-connection }}"
          az webapp config appsettings set \
            --name app-contoso-web \
            --resource-group rg-contoso-secrets \
            --settings "DB=${{ steps.secrets.outputs.db-connection }}"
```

### Task 3: Prevent secrets in logs (isSecret and add-mask)

Azure Pipelines approach:

```yaml
# azure-pipelines.yml
steps:
  - task: AzureCLI@2
    inputs:
      azureSubscription: 'Azure-Prod'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        # Retrieve a secret
        SECRET=$(az keyvault secret show \
          --vault-name kv-contoso-secrets-001 \
          --name ApiKey-PaymentGateway \
          --query value -o tsv)

        # Mark as secret so it is masked in all subsequent log output
        echo "##vso[task.setvariable variable=API_KEY;isSecret=true;isOutput=true]$SECRET"

        # This will print *** in logs
        echo "The API key is: $SECRET"
    name: fetchSecrets
    displayName: 'Fetch and mask secrets'

  - script: |
      # Using the masked secret - value is replaced with *** in logs
      echo "Deploying with key: $(fetchSecrets.API_KEY)"
      curl -H "X-API-Key: $(fetchSecrets.API_KEY)" https://api.contoso.com/deploy
    displayName: 'Deploy using masked secret'
    env:
      API_KEY: $(fetchSecrets.API_KEY)
```

### Task 4: Gitignore best practices for secrets files

Create a comprehensive `.gitignore` for secrets:

```bash
# .gitignore - Secrets and sensitive files
# Environment files
.env
.env.local
.env.*.local
.env.production
.env.staging

# Key files
*.pem
*.key
*.p12
*.pfx
*.cer

# Azure specific
appsettings.Development.json
appsettings.Local.json
local.settings.json

# Terraform state (contains secrets)
*.tfstate
*.tfstate.*
.terraform/

# AWS/Azure/GCP credentials
credentials
.azure/
.aws/

# IDE secrets
.vscode/settings.json
.idea/

# Docker secrets
docker-compose.override.yml
```

Verify nothing sensitive is already tracked:

```bash
# Check if any sensitive files are already tracked
git ls-files | grep -iE '\.(env|pem|key|pfx|p12)$'
git ls-files | grep -iE '(secret|credential|password|apikey)'

# Remove a previously committed secret file from tracking
git rm --cached .env
git rm --cached appsettings.Development.json
git commit -m "fix: remove tracked secret files"

# Verify the file is now ignored
git status --ignored | grep .env
```

### Task 5: Pre-commit hooks to block secret patterns

Install and configure gitleaks:

```bash
# Install gitleaks
# On macOS: brew install gitleaks
# On Linux: download from https://github.com/gitleaks/gitleaks/releases
# On Windows: choco install gitleaks

# Create gitleaks configuration
cat > .gitleaks.toml << 'EOF'
title = "Contoso Gitleaks Configuration"

[extend]
useDefault = true

[[rules]]
id = "contoso-api-key"
description = "Contoso internal API key pattern"
regex = '''contoso_api_[a-zA-Z0-9]{32}'''
tags = ["key", "contoso"]

[[rules]]
id = "azure-storage-key"
description = "Azure Storage Account Key"
regex = '''(?i)AccountKey=[A-Za-z0-9+/=]{86,88}'''
tags = ["key", "azure"]

[allowlist]
paths = [
  '''(.*)_test\.go''',
  '''(.*)/testdata/''',
  '''(.*)\.md'''
]
EOF

# Run gitleaks scan on the repository
gitleaks detect --source . --verbose

# Run on staged changes only (for pre-commit)
gitleaks protect --staged --verbose
```

Set up pre-commit hooks:

```bash
# Install pre-commit framework
pip install pre-commit

# Create pre-commit configuration
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
EOF

# Install the hooks
pre-commit install

# Generate detect-secrets baseline (marks existing secrets as known)
detect-secrets scan > .secrets.baseline

# Test the hook by attempting to commit a secret
echo "API_KEY=sk_live_abc123def456" > test-secrets.txt
git add test-secrets.txt
git commit -m "test: this should be blocked"
# Expected: commit blocked by gitleaks
rm test-secrets.txt
```

### Task 6: GitHub push protection (block pushes containing secrets)

Enable secret scanning push protection at the repository or organization level:

```bash
# Enable via GitHub API (organization-wide)
gh api orgs/contoso -X PATCH \
  --field security_and_analysis[secret_scanning][status]="enabled" \
  --field security_and_analysis[secret_scanning_push_protection][status]="enabled"

# Enable for a specific repository
gh api repos/contoso/webapp -X PATCH \
  --field security_and_analysis[secret_scanning][status]="enabled" \
  --field security_and_analysis[secret_scanning_push_protection][status]="enabled"
```

When push protection blocks a commit:

```
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: - GITHUB PUSH PROTECTION
remote:   —————————————————————————————————————————
remote:   Resolve the following violations before pushing again
remote:
remote:   — Push cannot contain secrets —
remote:
remote:   locations:
remote:     - commit: abc123def
remote:       path: src/config.js:3
remote:       secret type: Azure Storage Account Key
```

Developer options when blocked:
1. Remove the secret and amend the commit
2. If it is a false positive, bypass with a documented reason (if allowed by policy)

Configure organization push protection settings:

1. Organization Settings > Code security and analysis
2. Secret scanning: Enable for all repositories
3. Push protection: Enable for all repositories
4. Allow actors to bypass push protection: Restrict (require review from security team)

### Task 7: Pipeline output filtering and secret masking

Azure Pipelines secrets are masked automatically, but additional patterns may leak:

```yaml
# azure-pipelines.yml
variables:
  - name: secretPattern
    value: 'pk_live_'

steps:
  - script: |
      # Mask any output matching common secret patterns
      # Azure DevOps automatically masks variables marked as secret
      # but dynamically generated values need explicit masking

      # Fetch a token from an API
      TOKEN=$(curl -s https://auth.contoso.com/token | jq -r '.access_token')

      # Mask it immediately
      echo "##vso[task.setvariable variable=bearer_token;isSecret=true]$TOKEN"

      # Set output variable for next steps
      echo "##vso[task.setvariable variable=AUTH_TOKEN;isOutput=true;isSecret=true]$TOKEN"
    name: auth
    displayName: 'Authenticate and mask token'

  - script: |
      # Use the masked token - safe even with verbose logging
      curl -H "Authorization: Bearer $(auth.AUTH_TOKEN)" \
        https://api.contoso.com/deploy \
        --fail --silent --show-error
    displayName: 'Deploy with masked token'
    env:
      AUTH_TOKEN: $(auth.AUTH_TOKEN)
```

### Task 8: Secure file download and usage in deployment

```yaml
# Complete secure deployment pipeline
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: DownloadSecureFile@1
    name: sshKey
    inputs:
      secureFile: 'contoso-prod-deploy.key'

  - task: DownloadSecureFile@1
    name: kubeConfig
    inputs:
      secureFile: 'aks-prod-kubeconfig'

  - script: |
      mkdir -p ~/.ssh ~/.kube
      cp $(sshKey.secureFilePath) ~/.ssh/deploy.key
      chmod 600 ~/.ssh/deploy.key

      cp $(kubeConfig.secureFilePath) ~/.kube/config
      chmod 600 ~/.kube/config

      # Verify connectivity
      kubectl cluster-info
      kubectl get nodes
    displayName: 'Configure secure access'

  - script: |
      kubectl apply -f k8s/deployment.yaml
      kubectl rollout status deployment/contoso-web -n production
    displayName: 'Deploy to AKS'

  - script: |
      rm -f ~/.ssh/deploy.key
      rm -f ~/.kube/config
    displayName: 'Clean up credentials'
    condition: always()
```

## Break and fix

### Break scenario 1: Secret appears in pipeline logs

A developer adds `echo $CONNECTION_STRING` for debugging and the full database password appears in the build log.

**Cause:** The variable was not marked as secret, so Azure DevOps does not mask it in output.

**Fix (immediate):** Delete the pipeline run logs:

```bash
# Delete the run to remove exposed logs
az pipelines runs delete --id <run-id> --yes
```

**Fix (preventive):** Mark the variable as secret and use `isSecret`:

```yaml
variables:
  - name: connectionString
    value: $(SqlConnectionString)  # from Key Vault-linked variable group

steps:
  - script: |
      # Never echo secret values directly
      # Instead, verify by length or hash
      echo "Connection string length: ${#CONNECTION_STRING}"
      echo "Connection string SHA256: $(echo -n "$CONNECTION_STRING" | sha256sum | cut -d' ' -f1)"
    env:
      CONNECTION_STRING: $(connectionString)
```

### Break scenario 2: Pre-commit hook blocks legitimate test data

Developers complain that gitleaks blocks commits containing test API keys in test fixtures.

**Fix:** Update `.gitleaks.toml` to allowlist test patterns:

```toml
[allowlist]
paths = [
  '''tests/''',
  '''(.*)_test\.(go|py|js|ts)''',
  '''testdata/''',
  '''fixtures/'''
]

[[allowlist.commits]]
description = "Test data commits"
regexes = ['''test_api_key_[a-z0-9]+''']
```

## Knowledge check

1. A Contoso pipeline needs to deploy using an SSH key that should not be accessible to developers or stored in source control. Where should the SSH key be stored?

   A) As a pipeline variable marked as secret
   B) In Azure Key Vault as a secret
   C) As an Azure Pipelines secure file with restricted pipeline permissions
   D) In a private Git repository with limited access

   **Answer: C.** Azure Pipelines secure files are encrypted at rest and can only be downloaded by authorized pipelines via the DownloadSecureFile task. They are not stored in source control, are not visible to developers in the library (only admins can see the content), and can have pipeline permissions and approval checks configured.

2. A GitHub Actions workflow retrieves a secret dynamically via an API call. How should you prevent this value from appearing in workflow logs?

   A) Use the `secrets` context which automatically masks all values
   B) Use `echo "::add-mask::$SECRET_VALUE"` before using the value
   C) Set `ACTIONS_STEP_DEBUG` to false
   D) Redirect all output to /dev/null

   **Answer: B.** The `::add-mask::` workflow command tells GitHub Actions to mask a specific value in all subsequent log output. This is necessary for dynamically retrieved secrets that are not stored in the repository's secrets settings (which are masked automatically). Once masked, any occurrence of the value in logs is replaced with asterisks.

3. Contoso wants to prevent developers from accidentally pushing secrets to any repository in the organization. Which feature provides the most comprehensive protection?

   A) Branch protection rules requiring PR reviews
   B) GitHub secret scanning push protection enabled at the organization level
   C) Pre-commit hooks installed on each developer machine
   D) A CI workflow that scans for secrets after each push

   **Answer: B.** GitHub push protection blocks the push at the server level before the secret enters the repository, providing guaranteed protection regardless of client-side configuration. Pre-commit hooks can be bypassed, branch protection only requires reviews (reviewers might miss secrets), and CI scanning only detects secrets after they are already committed.

4. An Azure Pipelines variable group is linked to Key Vault. A developer creates a pipeline that references this variable group and prints all variables in the log. Will the Key Vault secret values appear in the log?

   A) Yes, variable group variables are always visible in logs
   B) No, Key Vault-linked variables are automatically treated as secret and masked
   C) Only if the pipeline has the "Allow access to all pipelines" setting enabled
   D) Only if the developer has Key Vault Secrets User role

   **Answer: B.** Variables sourced from a Key Vault-linked variable group are automatically treated as secret variables by Azure Pipelines. Their values are masked (replaced with asterisks) in all pipeline log output, even if a script explicitly tries to echo them.

## Cleanup

```bash
# Remove pre-commit hooks
pre-commit uninstall
rm -f .pre-commit-config.yaml .gitleaks.toml .secrets.baseline

# Remove test files
rm -f contoso-deploy.key contoso-deploy.crt test-secrets.txt

# Remove secure files from Azure DevOps (via UI: Pipelines > Library > Secure files)

# Clean up git history if secrets were committed during testing
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env test-secrets.txt" \
  --prune-empty -- --all

# Force push to remove secrets from remote history (use with caution)
# git push origin --force --all
```
