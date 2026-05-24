---
sidebar_position: 5
title: "Desafio 43: Manuseio de arquivos sensíveis e prevenção de vazamentos"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 43: Manuseio de arquivos sensíveis e prevenção de vazamentos

## Habilidades do exame abordadas

- Projetar e implementar uma estratégia para gerenciar arquivos sensíveis durante o deployment, incluindo secure files do Azure Pipelines
- Projetar pipelines para prevenir vazamento de informações sensíveis

## Cenário

Um desenvolvedor da Contoso Ltd acidentalmente registrou uma string de conexão de banco de dados na saída de um pipeline ao depurar uma falha de deployment. Na mesma semana, outro desenvolvedor fez commit de um arquivo `.env` contendo chaves de API de produção no repositório. Os secrets ficaram expostos no histórico de commits por três dias antes de alguém perceber. Você deve implementar múltiplas camadas de proteção para prevenir vazamento de secrets tanto na saída do pipeline quanto no controle de código-fonte.

## Pré-requisitos

- Projeto Azure DevOps com um pipeline
- Repositório GitHub com GitHub Actions
- Git instalado localmente
- Python 3.8+ (para pre-commit hooks)

## Tarefas

### Tarefa 1: Secure files do Azure Pipelines

Secure files no Azure Pipelines são armazenados criptografados e só podem ser consumidos por tasks específicas. São ideais para certificados, chaves SSH e arquivos de configuração.

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

Use secure files em um pipeline:

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

Configure as permissões de secure files:

1. Pipelines > Library > Secure files
2. Selecione o arquivo > Pipeline permissions: restrinja a pipelines específicos
3. Selecione o arquivo > Approvals and checks: adicione aprovadores para certificados de produção

### Tarefa 2: GitHub Actions: mascarar secrets nos logs

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

### Tarefa 3: Prevenir secrets nos logs (isSecret e add-mask)

Abordagem no Azure Pipelines:

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

### Tarefa 4: Boas práticas de gitignore para arquivos de secrets

Crie um `.gitignore` abrangente para secrets:

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

Verifique se nada sensível já está sendo rastreado:

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

### Tarefa 5: Pre-commit hooks para bloquear padrões de secrets

Instale e configure o gitleaks:

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

Configure pre-commit hooks:

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

### Tarefa 6: GitHub push protection (bloquear pushes contendo secrets)

Habilite a proteção de push com secret scanning no nível do repositório ou organização:

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

Quando a push protection bloqueia um commit:

```text
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: - GITHUB PUSH PROTECTION
remote:   â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
remote:   Resolve the following violations before pushing again
remote:
remote:   â€” Push cannot contain secrets â€”
remote:
remote:   locations:
remote:     - commit: abc123def
remote:       path: src/config.js:3
remote:       secret type: Azure Storage Account Key
```

Opções do desenvolvedor quando bloqueado:
1. Remover o secret e fazer amend no commit
2. Se for um falso positivo, fazer bypass com um motivo documentado (se permitido pela política)

Configure as definições de push protection da organização:

1. Organization Settings > Code security and analysis
2. Secret scanning: Habilitar para todos os repositórios
3. Push protection: Habilitar para todos os repositórios
4. Allow actors to bypass push protection: Restringir (exigir revisão da equipe de segurança)

### Tarefa 7: Filtragem de saída do pipeline e mascaramento de secrets

Secrets do Azure Pipelines são mascarados automaticamente, mas padrões adicionais podem vazar:

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

### Tarefa 8: Download e uso de secure files no deployment

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

## Exercícios de quebra e conserto

### Cenário de quebra 1: Secret aparece nos logs do pipeline

Um desenvolvedor adiciona `echo $CONNECTION_STRING` para depuração e a senha completa do banco de dados aparece no log de build.

**Causa:** A variável não foi marcada como secret, então o Azure DevOps não a mascara na saída.


<details>
<summary>Mostrar solução</summary>

**Correção (imediata):** Exclua os logs da execução do pipeline:

```bash
# Delete the run to remove exposed logs
az pipelines runs delete --id <run-id> --yes
```

**Correção (preventiva):** Marque a variável como secret e use `isSecret`:

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

</details>

### Cenário de quebra 2: Pre-commit hook bloqueia dados de teste legítimos

Desenvolvedores reclamam que o gitleaks bloqueia commits contendo chaves de API de teste em fixtures de teste.


<details>
<summary>Mostrar solução</summary>

**Correção:** Atualize o `.gitleaks.toml` para incluir padrões de teste na allowlist:

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

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Um pipeline da Contoso precisa fazer deploy usando uma chave SSH que não deve ser acessível a desenvolvedores nem armazenada no controle de código-fonte. Onde a chave SSH deve ser armazenada?",
    options: [
      "Como uma variável de pipeline marcada como secret",
      "No Azure Key Vault como um secret",
      "Como um secure file do Azure Pipelines com permissões restritas de pipeline",
      "Em um repositório Git privado com acesso limitado"
    ],
    correctIndex: 2,
    explanation: "Secure files do Azure Pipelines são criptografados em repouso e só podem ser baixados por pipelines autorizados via a task DownloadSecureFile. Não são armazenados no controle de código-fonte, não são visíveis para desenvolvedores na library (apenas administradores podem ver o conteúdo) e podem ter permissões de pipeline e verificações de aprovação configuradas."
  },
  {
    question: "Um workflow do GitHub Actions recupera um secret dinamicamente via uma chamada de API. Como você deve prevenir que esse valor apareça nos logs do workflow?",
    options: [
      "Usar o contexto 'secrets' que mascara automaticamente todos os valores",
      "Usar 'echo \"::add-mask::$SECRET_VALUE\"' antes de usar o valor",
      "Definir 'ACTIONS_STEP_DEBUG' como false",
      "Redirecionar toda a saída para /dev/null"
    ],
    correctIndex: 1,
    explanation: "O comando de workflow ::add-mask:: instrui o GitHub Actions a mascarar um valor específico em toda a saída de log subsequente. Isso é necessário para secrets recuperados dinamicamente que não estão armazenados nas configurações de secrets do repositório (que são mascarados automaticamente). Uma vez mascarado, qualquer ocorrência do valor nos logs é substituída por asteriscos."
  },
  {
    question: "A Contoso quer prevenir que desenvolvedores acidentalmente façam push de secrets para qualquer repositório na organização. Qual recurso fornece a proteção mais abrangente?",
    options: [
      "Regras de branch protection exigindo revisões de PR",
      "GitHub secret scanning push protection habilitada no nível da organização",
      "Pre-commit hooks instalados em cada máquina de desenvolvedor",
      "Um workflow de CI que escaneia secrets após cada push"
    ],
    correctIndex: 1,
    explanation: "A GitHub push protection bloqueia o push no nível do servidor antes que o secret entre no repositório, fornecendo proteção garantida independentemente da configuração do lado do cliente. Pre-commit hooks podem ser contornados, branch protection apenas exige revisões (revisores podem não perceber secrets) e escaneamento por CI só detecta secrets depois que já foram commitados."
  },
  {
    question: "Um variable group do Azure Pipelines está vinculado ao Key Vault. Um desenvolvedor cria um pipeline que referencia esse variable group e imprime todas as variáveis no log. Os valores de secret do Key Vault aparecerão no log?",
    options: [
      "Sim, variáveis de variable group são sempre visíveis nos logs",
      "Não, variáveis vinculadas ao Key Vault são automaticamente tratadas como secret e mascaradas",
      "Somente se o pipeline tiver a configuração \"Allow access to all pipelines\" habilitada",
      "Somente se o desenvolvedor tiver a role Key Vault Secrets User"
    ],
    correctIndex: 1,
    explanation: "Variáveis originadas de um variable group vinculado ao Key Vault são automaticamente tratadas como variáveis secret pelo Azure Pipelines. Seus valores são mascarados (substituídos por asteriscos) em toda a saída de log do pipeline, mesmo que um script tente explicitamente exibi-los com echo."
  }
]} />

## Limpeza

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
