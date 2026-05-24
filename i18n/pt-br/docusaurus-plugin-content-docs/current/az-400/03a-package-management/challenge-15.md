---
sidebar_position: 3
title: "Desafio 15: Gerenciamento de dependÃªncias e verificaÃ§Ã£o de vulnerabilidades"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 15: Gerenciamento de dependÃªncias e verificaÃ§Ã£o de vulnerabilidades

:::info Plataforma: ambas
Este desafio cobre fluxos de trabalho de seguranÃ§a de dependÃªncias tanto no GitHub quanto no Azure DevOps.
:::

## Habilidades do exame

- Recomendar ferramentas de gerenciamento de pacotes incluindo GitHub Packages e Azure Artifacts
- Projetar e implementar feeds e views de pacotes para pacotes locais e upstream

## CenÃ¡rio

A equipe de seguranÃ§a da Contoso executa uma auditoria trimestral e descobre que 3 dos 15 microsserviÃ§os em produÃ§Ã£o dependem de uma biblioteca com um CVE crÃ­tico (CVE-2024-29041, uma vulnerabilidade de path traversal no Express.js). Os problemas sÃ£o:

- Nenhum processo automatizado detecta dependÃªncias vulnerÃ¡veis
- Desenvolvedores nÃ£o sabem quais dependÃªncias transitivas apresentam risco
- NÃ£o hÃ¡ polÃ­tica para conformidade de licenÃ§as (algumas equipes incluÃ­ram acidentalmente cÃ³digo licenciado sob GPL em serviÃ§os proprietÃ¡rios)
- A remediaÃ§Ã£o leva semanas porque ninguÃ©m sabe quais serviÃ§os sÃ£o afetados

VocÃª deve implementar uma estratÃ©gia abrangente de gerenciamento de dependÃªncias e verificaÃ§Ã£o de vulnerabilidades.

## Tarefas

### Tarefa 1: Configurar Dependabot para atualizaÃ§Ãµes automÃ¡ticas de dependÃªncias

O Dependabot abre automaticamente pull requests para atualizar dependÃªncias em um cronograma.

#### Passo 1: Criar o arquivo de configuraÃ§Ã£o do Dependabot

No seu repositÃ³rio, crie `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # npm dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "America/New_York"
    open-pull-requests-limit: 10
    reviewers:
      - "contoso/backend-team"
    labels:
      - "dependencies"
      - "automated"
    commit-message:
      prefix: "deps"
      include: "scope"
    groups:
      dev-dependencies:
        dependency-type: "development"
        update-types:
          - "minor"
          - "patch"
      production-minor:
        dependency-type: "production"
        update-types:
          - "minor"
          - "patch"

  # NuGet dependencies
  - package-ecosystem: "nuget"
    directory: "/src/Contoso.Api"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    ignore:
      - dependency-name: "Microsoft.Extensions.*"
        update-types: ["version-update:semver-major"]

  # Docker base images
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "docker"
      - "dependencies"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "ci"
      - "dependencies"
```

#### Passo 2: Verificar se o Dependabot estÃ¡ ativo

ApÃ³s enviar a configuraÃ§Ã£o:

```bash
gh api /repos/contoso/auth-service/vulnerability-alerts --method PUT
```

Verifique o status do Dependabot:

```bash
gh api /repos/contoso/auth-service/dependabot/alerts \
  --jq '.[0:5] | .[] | {package: .security_advisory.summary, severity: .security_advisory.severity, state: .state}'
```

### Tarefa 2: Configurar alertas de seguranÃ§a do Dependabot

Alertas de seguranÃ§a diferem das atualizaÃ§Ãµes de versÃ£o. Eles sÃ£o acionados imediatamente quando um novo CVE Ã© publicado que afeta sua Ã¡rvore de dependÃªncias.

#### Passo 1: Habilitar alertas de seguranÃ§a para a organizaÃ§Ã£o

```bash
gh api --method PUT /orgs/contoso/dependabot/alerts
```

Habilite para todos os repositÃ³rios:

```bash
gh api --method PUT /orgs/contoso \
  --field dependabot_security_updates_enabled_for_new_repositories=true \
  --field dependency_graph_enabled_for_new_repositories=true \
  --field dependabot_alerts_enabled_for_new_repositories=true
```

#### Passo 2: Listar alertas de seguranÃ§a atuais entre repositÃ³rios

```bash
gh api /orgs/contoso/dependabot/alerts \
  --jq '.[] | select(.state == "open") | {repo: .repository.name, package: .dependency.package.name, severity: .security_advisory.severity, cve: .security_advisory.cve_id}'
```

Filtre apenas alertas de severidade crÃ­tica e alta:

```bash
gh api "/orgs/contoso/dependabot/alerts?severity=critical,high&state=open" \
  --jq '.[] | "\(.repository.name): \(.dependency.package.name) - \(.security_advisory.severity) - \(.security_advisory.cve_id)"'
```

#### Passo 3: Dispensar um alerta (falso positivo)

```bash
gh api --method PATCH /repos/contoso/auth-service/dependabot/alerts/42 \
  --field state=dismissed \
  --field dismissed_reason=tolerable_risk \
  --field dismissed_comment="This code path is not reachable in our configuration"
```

### Tarefa 3: IntegraÃ§Ã£o do Azure Artifacts com Defender for DevOps

#### Passo 1: Habilitar Microsoft Defender for DevOps

Conecte sua organizaÃ§Ã£o Azure DevOps ao Defender for Cloud:

```bash
az security devops azuredevopsorg create \
  --name contoso-ado \
  --resource-group rg-security \
  --org-name contoso
```

#### Passo 2: Configurar a extensÃ£o Microsoft Security DevOps do Azure DevOps

Adicione a tarefa de verificaÃ§Ã£o de seguranÃ§a ao seu Azure Pipeline:

```yaml
trigger:
  - main

pool:
  vmImage: ubuntu-latest

steps:
  - task: MicrosoftSecurityDevOps@1
    displayName: 'Run security analysis'
    inputs:
      categories: 'dependencies'
      tools: 'eslint,trivy'

  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: $(System.DefaultWorkingDirectory)/.gdn
      artifactName: security-results
```

#### Passo 3: Configurar alertas de vulnerabilidade de pacotes do Azure Artifacts

Habilite a verificaÃ§Ã£o de pacotes no seu feed do Azure Artifacts:

```bash
az rest --method patch \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages?api-version=7.1-preview.1" \
  --body '{
    "badgesEnabled": true,
    "hideDeletedPackageVersions": true
  }'
```

### Tarefa 4: VerificaÃ§Ã£o de conformidade de licenÃ§as

#### Passo 1: Criar uma polÃ­tica de licenÃ§as com GitHub Actions

Crie `.github/workflows/license-check.yml`:

```yaml
name: License compliance check
on:
  pull_request:
    paths:
      - 'package.json'
      - 'package-lock.json'
      - '**/*.csproj'

jobs:
  license-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install license checker
        run: npm install -g license-checker

      - name: Check npm licenses
        run: |
          license-checker --production --failOn \
            "GPL-2.0-only;GPL-3.0-only;AGPL-3.0-only;SSPL-1.0" \
            --summary

      - name: Check for unknown licenses
        run: |
          UNKNOWN=$(license-checker --production --unknown | wc -l)
          if [ "$UNKNOWN" -gt 1 ]; then
            echo "ERROR: Found packages with unknown licenses"
            license-checker --production --unknown
            exit 1
          fi
```

#### Passo 2: ValidaÃ§Ã£o de licenÃ§as NuGet

Para projetos .NET, use o `dotnet-project-licenses`:

```bash
dotnet tool install --global dotnet-project-licenses

dotnet-project-licenses \
  --input ./src/Contoso.Api/Contoso.Api.csproj \
  --output-directory ./license-report \
  --banned-license-types ./banned-licenses.json
```

Crie o `banned-licenses.json`:

```json
{
  "banned": [
    "GPL-2.0-only",
    "GPL-3.0-only",
    "AGPL-3.0-only",
    "SSPL-1.0"
  ]
}
```

### Tarefa 5: Criar um workflow de revisÃ£o de dependÃªncias no GitHub Actions

A action de revisÃ£o de dependÃªncias Ã© executada em pull requests e bloqueia o merge se novas dependÃªncias introduzirem vulnerabilidades ou licenÃ§as nÃ£o permitidas.

Crie `.github/workflows/dependency-review.yml`:

```yaml
name: Dependency review
on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Dependency review
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
          deny-licenses: GPL-2.0-only, GPL-3.0-only, AGPL-3.0-only
          allow-ghsas: GHSA-xxxx-yyyy-zzzz
          comment-summary-in-pr: always
          warn-only: false
          base-ref: ${{ github.event.pull_request.base.sha }}
          head-ref: ${{ github.event.pull_request.head.sha }}
```

### Tarefa 6: Implementar listas de permissÃ£o e bloqueio de dependÃªncias

#### Passo 1: Lista de permissÃ£o npm com .npmrc

Restrinja registros apenas a fontes aprovadas:

```ini
@contoso:registry=https://npm.pkg.github.com
registry=https://pkgs.dev.azure.com/contoso/ContosoServices/_packaging/contoso-packages/npm/registry/
```

Isso impede que desenvolvedores busquem acidentalmente pacotes diretamente do npm pÃºblico.

#### Passo 2: Mapeamento de fontes de pacotes NuGet

No `nuget.config`, mapeie padrÃµes de pacotes especÃ­ficos para fontes especÃ­ficas:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="contoso-packages" value="https://pkgs.dev.azure.com/contoso/ContosoServices/_packaging/contoso-packages/nuget/v3/index.json" />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
  </packageSources>
  <packageSourceMapping>
    <packageSource key="contoso-packages">
      <package pattern="Contoso.*" />
    </packageSource>
    <packageSource key="nuget.org">
      <package pattern="Microsoft.*" />
      <package pattern="System.*" />
      <package pattern="Newtonsoft.*" />
    </packageSource>
  </packageSourceMapping>
</configuration>
```

#### Passo 3: Lista de bloqueio de dependÃªncias no GitHub Actions

Bloqueie pacotes especÃ­ficos conhecidos como maliciosos de serem introduzidos:

```yaml
- name: Check for banned packages
  run: |
    BANNED_PACKAGES=("event-stream" "flatmap-stream" "ua-parser-js@0.7.29")
    LOCKFILE="package-lock.json"

    for pkg in "${BANNED_PACKAGES[@]}"; do
      if grep -q "\"$pkg\"" "$LOCKFILE"; then
        echo "ERROR: Banned package found: $pkg"
        exit 1
      fi
    done
    echo "No banned packages detected"
```

## ExercÃ­cios de quebra e conserto

### CenÃ¡rio: PR do Dependabot quebra o build devido a breaking change

O Dependabot abre um PR para atualizar `@contoso/auth-sdk` de 1.2.0 para 2.0.0. O pipeline de CI falha com:

```text
TypeError: AuthClient.validateToken is not a function
    at Object.<anonymous> (src/middleware/auth.js:15:32)
```

O PR do Dependabot Ã© um de 12 atualizaÃ§Ãµes de dependÃªncias abertas. A equipe precisa de uma estratÃ©gia para lidar com isso.

<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**Causa raiz**: O Dependabot atualizou um pacote atravÃ©s de uma fronteira de versÃ£o major, introduzindo uma alteraÃ§Ã£o quebrante na API. O mÃ©todo `validateToken` foi renomeado para `verifyToken` na versÃ£o 2.0.0.

**CorreÃ§Ã£o imediata**: Feche o PR do Dependabot e fixe na faixa de versÃ£o segura:

```bash
gh pr close 847 --comment "Breaking change in v2.0.0. Pinning to 1.x until migration is complete."
```

**Passo 1: Prevenir bumps de versÃ£o major via configuraÃ§Ã£o do Dependabot**

Atualize o `.github/dependabot.yml` para ignorar atualizaÃ§Ãµes de versÃ£o major para pacotes crÃ­ticos:

```yaml
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    ignore:
      - dependency-name: "@contoso/auth-sdk"
        update-types: ["version-update:semver-major"]
```

**Passo 2: Fixar a faixa de versÃ£o no package.json**

Use uma faixa tilde para permitir apenas atualizaÃ§Ãµes de patch:

```json
{
  "dependencies": {
    "@contoso/auth-sdk": "~1.2.0"
  }
}
```

Ou use uma faixa caret para permitir minor e patch, mas nÃ£o major:

```json
{
  "dependencies": {
    "@contoso/auth-sdk": "^1.2.0"
  }
}
```

**Passo 3: Criar um plano de migraÃ§Ã£o para a atualizaÃ§Ã£o major**

Rastreie a alteraÃ§Ã£o quebrante como um item de trabalho separado em vez de depender do Dependabot:

```bash
gh issue create \
  --title "Migrate to @contoso/auth-sdk v2.0.0" \
  --body "auth-sdk 2.0.0 renames validateToken to verifyToken. All services using auth middleware need updating." \
  --label "breaking-change,dependencies" \
  --assignee "@contoso/backend-team"
```

**Passo 4: Adicionar verificaÃ§Ãµes de CI que detectem breaking changes antecipadamente**

Certifique-se de que sua suÃ­te de testes cubra os pontos de integraÃ§Ã£o. Adicione um smoke test:

```javascript
const { AuthClient } = require('@contoso/auth-sdk');
const client = new AuthClient();
// Verify expected API surface exists
assert(typeof client.validateToken === 'function',
  'auth-sdk API contract violated: validateToken must exist');
```

**Passo 5: Agrupar atualizaÃ§Ãµes de dependÃªncias relacionadas**

Configure o Dependabot para agrupar atualizaÃ§Ãµes minor/patch para que breaking changes fiquem isoladas:

```yaml
groups:
  contoso-internal:
    patterns:
      - "@contoso/*"
    update-types:
      - "minor"
      - "patch"
```

Isso garante que bumps de versÃ£o major apareÃ§am como PRs individuais que sÃ£o fÃ¡ceis de identificar e adiar.

</details>

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Uma configuraÃ§Ã£o do Dependabot tem 'schedule.interval: \"weekly\"' e 'open-pull-requests-limit: 5'. O que acontece quando existem 8 dependÃªncias desatualizadas?",
    options: [
      "O Dependabot abre 8 PRs simultaneamente",
      "O Dependabot abre 5 PRs e enfileira os 3 restantes para o prÃ³ximo ciclo",
      "O Dependabot abre 5 PRs e ignora os 3 restantes permanentemente",
      "A configuraÃ§Ã£o Ã© invÃ¡lida e o Dependabot nÃ£o serÃ¡ executado"
    ],
    correctIndex: 1,
    explanation: "Quando o nÃºmero de dependÃªncias desatualizadas excede o open-pull-requests-limit, o Dependabot abre PRs atÃ© o limite e enfileira as atualizaÃ§Ãµes restantes. Elas serÃ£o abertas conforme PRs existentes forem mergeados ou fechados, ou na prÃ³xima execuÃ§Ã£o agendada se houver capacidade disponÃ­vel."
  },
  {
    question: "Qual action do GitHub Actions bloqueia o merge de PR quando uma nova dependÃªncia introduz uma vulnerabilidade conhecida?",
    options: [
      "actions/codeql-action",
      "actions/dependency-review-action",
      "github/dependabot-action",
      "actions/security-scan"
    ],
    correctIndex: 1,
    explanation: "A actions/dependency-review-action Ã© construÃ­da especificamente para anÃ¡lise de dependÃªncias em pull requests. Ela compara as alteraÃ§Ãµes de dependÃªncias em um PR contra bancos de dados de vulnerabilidades conhecidas e pode bloquear o merge com base em limites de severidade e polÃ­ticas de licenÃ§a."
  },
  {
    question: "No mapeamento de fontes de pacotes NuGet, o que acontece se um pacote nÃ£o corresponder a nenhum padrÃ£o configurado?",
    options: [
      "Ele Ã© baixado de todas as fontes configuradas",
      "O restore falha com um erro",
      "Ele faz fallback para o nuget.org automaticamente",
      "Ele usa a primeira fonte da lista"
    ],
    correctIndex: 1,
    explanation: "Quando o mapeamento de fontes de pacotes NuGet estÃ¡ configurado e um pacote nÃ£o corresponde a nenhum padrÃ£o, o restore falha. Este Ã© um recurso de seguranÃ§a que impede que fontes de pacotes nÃ£o intencionais sejam usadas. VocÃª deve mapear explicitamente cada padrÃ£o de pacote para uma fonte aprovada."
  },
  {
    question: "Uma equipe quer remediar automaticamente CVEs crÃ­ticos mas revisar manualmente todas as outras atualizaÃ§Ãµes de dependÃªncias. Qual configuraÃ§Ã£o do Dependabot alcanÃ§a isso?",
    options: [
      "Definir 'schedule.interval: \"daily\"' com 'open-pull-requests-limit: 1'",
      "Habilitar atualizaÃ§Ãµes de seguranÃ§a do Dependabot (automÃ¡ticas) e configurar atualizaÃ§Ãµes de versÃ£o com regras 'ignore' para nÃ£o-crÃ­ticos",
      "Definir 'fail-on-severity: critical' na action de revisÃ£o de dependÃªncias",
      "Configurar 'groups' para agrupar todas as atualizaÃ§Ãµes nÃ£o-crÃ­ticas"
    ],
    correctIndex: 1,
    explanation: "O Dependabot possui dois recursos independentes: atualizaÃ§Ãµes de seguranÃ§a (acionadas imediatamente por publicaÃ§Ãµes de CVE, sempre automÃ¡ticas) e atualizaÃ§Ãµes de versÃ£o (agendadas, configurÃ¡veis). Habilitar atualizaÃ§Ãµes de seguranÃ§a trata CVEs crÃ­ticos automaticamente, enquanto a configuraÃ§Ã£o de atualizaÃ§Ã£o de versÃ£o controla a atualizaÃ§Ã£o rotineira de dependÃªncias."
  }
]} />

## Limpeza

Remova a configuraÃ§Ã£o do Dependabot:

```bash
rm .github/dependabot.yml
git add -A && git commit -m "Remove Dependabot configuration"
git push origin main
```

Remova os arquivos de workflow:

```bash
rm .github/workflows/license-check.yml
rm .github/workflows/dependency-review.yml
git add -A && git commit -m "Remove dependency scanning workflows"
git push origin main
```

Desabilite os alertas do Dependabot para o repositÃ³rio:

```bash
gh api --method DELETE /repos/contoso/auth-service/vulnerability-alerts
```

Remova a ferramenta de verificaÃ§Ã£o de licenÃ§as:

```bash
npm uninstall -g license-checker
dotnet tool uninstall --global dotnet-project-licenses
```

Remova o mapeamento de fontes NuGet (restaure o `nuget.config` original):

```bash
git checkout HEAD -- nuget.config
```
