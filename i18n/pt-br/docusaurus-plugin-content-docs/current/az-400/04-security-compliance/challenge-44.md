---
sidebar_position: 6
title: "Desafio 44: GitHub Advanced Security"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 44: GitHub Advanced Security

## Habilidades do exame abordadas

- Configurar GitHub Advanced Security para GitHub e Azure DevOps
- Automatizar escaneamento de containers (imagens de container, análise CodeQL)
- Automatizar análise de licenciamento, vulnerabilidades e versionamento (alertas do Dependabot)

## Cenário

A equipe de segurança da Contoso Ltd não tem visibilidade sobre vulnerabilidades de código em seus 45 repositórios. No último trimestre, uma interrupção em produção foi causada por uma vulnerabilidade conhecida em uma dependência transitiva que tinha um patch disponível há seis meses. Os desenvolvedores nunca viram o alerta porque nenhum escaneamento estava configurado. Você deve implementar escaneamento de segurança abrangente usando GitHub Advanced Security para detectar vulnerabilidades em código, dependências, secrets e imagens de container.

## Pré-requisitos

- Organização GitHub com licença GitHub Advanced Security (incluída para repositórios públicos)
- Pelo menos um repositório com código de aplicação (qualquer linguagem suportada pelo CodeQL)
- GitHub CLI (`gh`) instalado e autenticado
- Docker instalado (para tarefas de escaneamento de containers)

## Tarefas

### Tarefa 1: Habilitar GitHub Advanced Security

```bash
# Enable GHAS for a specific repository
gh api repos/contoso/webapp -X PATCH \
  --field security_and_analysis[advanced_security][status]="enabled" \
  --field security_and_analysis[secret_scanning][status]="enabled" \
  --field security_and_analysis[secret_scanning_push_protection][status]="enabled"

# Enable for all repositories in the organization
gh api orgs/contoso -X PATCH \
  --field security_and_analysis[advanced_security][status]="enabled" \
  --field security_and_analysis[secret_scanning][status]="enabled" \
  --field security_and_analysis[secret_scanning_push_protection][status]="enabled"

# Verify GHAS is enabled
gh api repos/contoso/webapp --jq '.security_and_analysis'
```

### Tarefa 2: Configurar análise CodeQL

Crie um workflow CodeQL para escaneamento de código automatizado:

```yaml
# .github/workflows/codeql-analysis.yml
name: CodeQL Analysis
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '30 6 * * 1'  # Weekly Monday 6:30 UTC

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: ['javascript', 'csharp']
        # Supported: cpp, csharp, go, java, javascript, python, ruby, swift

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          queries: +security-extended,security-and-quality
          # Options: security-extended, security-and-quality, or path to custom queries

      # For compiled languages, the build step is required
      - name: Build application (for compiled languages)
        if: matrix.language == 'csharp'
        run: |
          dotnet build src/Contoso.Web/Contoso.Web.csproj

      # For interpreted languages, autobuild handles it
      - name: Autobuild
        if: matrix.language == 'javascript'
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:${{ matrix.language }}"
```

### Tarefa 3: Configurar secret scanning e push protection

```bash
# View current secret scanning alerts
gh api repos/contoso/webapp/secret-scanning/alerts \
  --jq '.[] | {number: .number, secret_type: .secret_type_display_name, state: .state, created: .created_at}'

# Close a false positive alert
gh api repos/contoso/webapp/secret-scanning/alerts/1 -X PATCH \
  --field state="resolved" \
  --field resolution="false_positive"

# Define custom secret patterns for the organization
gh api orgs/contoso/secret-scanning/custom-patterns -X POST \
  --field name="Contoso Internal API Key" \
  --field pattern="contoso_[a-zA-Z0-9]{32}" \
  --field scope="organization"
```

Configure o bypass de push protection:

1. Organization Settings > Code security and analysis
2. Push protection > Who can bypass push protection for secret scanning:
   - Selecione "Specific roles or teams"
   - Adicione: Somente a equipe de segurança
3. Require a reason when bypassing: Habilitar

### Tarefa 4: Configurar alertas do Dependabot e atualizações de segurança

```yaml
# .github/dependabot.yml
version: 2
updates:
  # npm dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "06:00"
      timezone: "America/New_York"
    open-pull-requests-limit: 10
    reviewers:
      - "contoso/backend-team"
    labels:
      - "dependencies"
      - "security"
    # Group minor and patch updates together
    groups:
      production-dependencies:
        patterns:
          - "*"
        update-types:
          - "minor"
          - "patch"

  # NuGet dependencies
  - package-ecosystem: "nuget"
    directory: "/src/Contoso.Web"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    reviewers:
      - "contoso/dotnet-team"

  # Docker base images
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    reviewers:
      - "contoso/platform-team"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "ci-cd"
```

Habilite atualizações de segurança do Dependabot:

```bash
# Enable Dependabot alerts
gh api repos/contoso/webapp/vulnerability-alerts -X PUT

# View current Dependabot alerts
gh api repos/contoso/webapp/dependabot/alerts \
  --jq '.[] | {number: .number, package: .security_advisory.summary, severity: .security_advisory.severity, state: .state}'

# Dismiss an alert (not applicable to this project)
gh api repos/contoso/webapp/dependabot/alerts/5 -X PATCH \
  --field state="dismissed" \
  --field dismissed_reason="not_used" \
  --field dismissed_comment="This dependency is only in dev dependencies and not deployed"
```

### Tarefa 5: Configurar atualizações de versão do Dependabot

Atualizações de versão do Dependabot mantêm as dependências atualizadas independentemente de vulnerabilidades conhecidas:

```yaml
# Additional configuration in .github/dependabot.yml
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    # Ignore major version updates for specific packages
    ignore:
      - dependency-name: "express"
        update-types: ["version-update:semver-major"]
      - dependency-name: "@types/*"
        update-types: ["version-update:semver-major"]
    # Allow only security updates for specific packages
    allow:
      - dependency-type: "production"
    # Auto-merge patch updates via GitHub Actions
    groups:
      patch-updates:
        patterns:
          - "*"
        update-types:
          - "patch"
```

Auto-merge de PRs do Dependabot para atualizações de patch:

```yaml
# .github/workflows/dependabot-auto-merge.yml
name: Auto-merge Dependabot PRs
on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: write
  pull-requests: write

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'
    steps:
      - name: Dependabot metadata
        id: metadata
        uses: dependabot/fetch-metadata@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Auto-merge patch updates
        if: steps.metadata.outputs.update-type == 'version-update:semver-patch'
        run: |
          gh pr merge "${{ github.event.pull_request.number }}" \
            --auto --squash \
            --repo ${{ github.repository }}
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Tarefa 6: GitHub Advanced Security para Azure DevOps (GHAzDO)

Habilite recursos do GHAS no Azure DevOps:

1. Organization Settings > Repositories > Settings
2. Habilite "GitHub Advanced Security for Azure DevOps"
3. Por repositório: Repository Settings > Advanced Security > Enable

Configure escaneamento de Advanced Security no Azure Pipelines:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  # Dependency scanning
  - task: AdvancedSecurity-Dependency-Scanning@1
    displayName: 'Dependency Scanning'

  # CodeQL code scanning (initialize)
  - task: AdvancedSecurity-Codeql-Init@1
    inputs:
      languages: 'csharp,javascript'
      querysuite: 'security-extended'
    displayName: 'Initialize CodeQL'

  # Build step (required for compiled languages)
  - task: DotNetCoreCLI@2
    inputs:
      command: 'build'
      projects: '**/*.csproj'
    displayName: 'Build .NET project'

  # CodeQL analysis
  - task: AdvancedSecurity-Codeql-Analyze@1
    displayName: 'Run CodeQL Analysis'

  # Publish results
  - task: AdvancedSecurity-Publish@1
    displayName: 'Publish Advanced Security Results'
```

Visualize os resultados no Azure DevOps:

1. Repos > Advanced Security (aba) para ver alertas
2. Filtre por severidade (Critical, High, Medium, Low)
3. Alertas aparecem como anotações de PR nos pull requests

### Tarefa 7: Criar uma query CodeQL personalizada

Crie uma query personalizada para detectar padrões específicos da organização:

```ql
/**
 * @name Hard-coded Contoso API endpoint
 * @description Finds hard-coded production API URLs that should use configuration
 * @kind problem
 * @problem.severity warning
 * @id contoso/hardcoded-api-url
 * @tags security
 *       contoso
 */

import javascript

from StringLiteral s
where
  s.getValue().matches("%api.contoso.com/v%") or
  s.getValue().matches("%prod.contoso.internal%")
select s, "Hard-coded production API URL found. Use environment configuration instead."
```

Salve como `.github/codeql/queries/contoso-hardcoded-urls.ql` e referencie no workflow:

```yaml
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript
          queries: +./.github/codeql/queries/
```

Crie uma configuração de query pack:

```yaml
# .github/codeql/queries/qlpack.yml
name: contoso/custom-queries
version: 1.0.0
dependencies:
  codeql/javascript-all: "*"
```

### Tarefa 8: Escaneamento de containers com CodeQL

```yaml
# .github/workflows/container-scan.yml
name: Container Security Scan
on:
  push:
    branches: [main]
    paths:
      - 'Dockerfile'
      - 'docker-compose*.yml'
      - '.github/workflows/container-scan.yml'

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
      packages: read

    steps:
      - uses: actions/checkout@v4

      - name: Build container image
        run: |
          docker build -t contoso-webapp:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'contoso-webapp:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy scan results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
          category: 'container-scanning'

      - name: Fail on critical vulnerabilities
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'contoso-webapp:${{ github.sha }}'
          format: 'table'
          exit-code: '1'
          severity: 'CRITICAL'
```

## Exercícios de quebra e conserto

### Cenário de quebra 1: Análise CodeQL falha com "no source code found"

O workflow CodeQL completa mas reporta zero resultados com um aviso sobre nenhum código-fonte encontrado.

**Causa:** Para linguagens compiladas como C# ou Java, o CodeQL requer observar o processo de build. Se a etapa de build estiver ausente ou falhar silenciosamente, o CodeQL não tem código para analisar.


<details>
<summary>Mostrar solução</summary>

**Correção:** Garanta que a etapa de build execute entre `init` e `analyze`:

```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    languages: csharp

# This step is required for compiled languages
- name: Build
  run: dotnet build src/Contoso.Web.sln

- name: Perform CodeQL Analysis
  uses: github/codeql-action/analyze@v3
```

</details>

### Cenário de quebra 2: PRs do Dependabot falham nas verificações de CI devido a conflitos de lockfile

O Dependabot abre um PR mas o pipeline de CI falha porque o `package-lock.json` está dessincronizado.


<details>
<summary>Mostrar solução</summary>

**Correção:** Adicione uma seção `postUpdateOptions` na configuração do Dependabot ou adicione um workflow para regenerar lockfiles:

```yaml
# In dependabot.yml, Dependabot automatically updates lockfiles
# If conflicts arise, close and re-open the PR to trigger regeneration

# Or use a workflow to fix lockfile issues:
# .github/workflows/fix-lockfile.yml
name: Fix lockfile
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  fix:
    if: github.actor == 'dependabot[bot]'
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.head_ref }}
      - run: npm install
      - run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add package-lock.json
          git diff --staged --quiet || git commit -m "fix: regenerate lockfile"
          git push
```

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso tem repositórios tanto no GitHub quanto no Azure DevOps. Eles querem escaneamento CodeQL em ambas as plataformas. Qual é a abordagem correta?",
    options: [
      "CodeQL só funciona com repositórios GitHub",
      "Usar GitHub CodeQL action para repositórios GitHub e tasks AdvancedSecurity-Codeql para repositórios Azure DevOps",
      "Espelhar todos os repositórios do Azure DevOps para o GitHub para escaneamento",
      "Usar uma ferramenta de terceiros já que o CodeQL não pode ser executado no Azure DevOps"
    ],
    correctIndex: 1,
    explanation: "O GitHub Advanced Security para Azure DevOps (GHAzDO) fornece análise CodeQL nativa através de tasks de pipeline (AdvancedSecurity-Codeql-Init@1 e AdvancedSecurity-Codeql-Analyze@1). Repositórios GitHub usam a github/codeql-action. Ambos fornecem o mesmo engine CodeQL e conjuntos de queries."
  },
  {
    question: "Um alerta do Dependabot mostra uma vulnerabilidade crítica em uma dependência transitiva (uma dependência de uma dependência). A dependência direta ainda não lançou uma correção. O que a Contoso deve fazer?",
    options: [
      "Dispensar o alerta já que a equipe da dependência direta deve corrigi-lo",
      "Sobrescrever a versão da dependência transitiva usando npm overrides ou resolutions para forçar a versão corrigida",
      "Remover a dependência direta inteiramente",
      "Aguardar a dependência direta lançar uma atualização"
    ],
    correctIndex: 1,
    explanation: "Usar recursos do gerenciador de pacotes como npm overrides ou yarn resolutions permite forçar uma versão corrigida da dependência transitiva sem esperar que a dependência direta seja atualizada. Isso fornece mitigação imediata mantendo a funcionalidade."
  },
  {
    question: "Qual recurso do GitHub secret scanning previne que secrets entrem no repositório em primeiro lugar?",
    options: [
      "Alertas de secret scanning",
      "Padrões de secret personalizados",
      "Push protection",
      "Security advisories"
    ],
    correctIndex: 2,
    explanation: "Push protection bloqueia o git push no nível do servidor antes que o secret entre no histórico do repositório. Alertas padrão de secret scanning apenas notificam após o secret já ter sido commitado. Push protection é o controle preventivo, enquanto alertas são um controle detectivo."
  },
  {
    question: "A Contoso quer que resultados de escaneamento de vulnerabilidades de container apareçam junto com resultados do CodeQL na aba Security do GitHub. Como eles devem configurar o escaneamento de containers?",
    options: [
      "Usar uma action de escaneamento de container que gera formato SARIF e fazer upload com codeql-action/upload-sarif",
      "Habilitar Dependabot apenas para o ecossistema Docker",
      "Executar docker scan e parsear a saída em texto",
      "Resultados de escaneamento de container não podem aparecer na aba Security"
    ],
    correctIndex: 0,
    explanation: "A aba Security do GitHub exibe resultados SARIF (Static Analysis Results Interchange Format). Qualquer scanner que produza saída SARIF pode fazer upload de resultados via a action codeql-action/upload-sarif, tornando-os visíveis junto com achados do CodeQL em um painel de segurança unificado."
  }
]} />

## Limpeza

```bash
# Remove workflow files
rm -f .github/workflows/codeql-analysis.yml
rm -f .github/workflows/container-scan.yml
rm -f .github/workflows/dependabot-auto-merge.yml
rm -f .github/dependabot.yml
rm -rf .github/codeql/

# Disable GHAS (if no longer needed for testing)
gh api repos/contoso/webapp -X PATCH \
  --field security_and_analysis[advanced_security][status]="disabled"

git add -A && git commit -m "cleanup: remove challenge 44 security scanning config" && git push
```
