---
sidebar_position: 3
title: "Desafio 03: Rastreabilidade de código-fonte, bugs e qualidade"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 03: Rastreabilidade de código-fonte, bugs e qualidade

## Habilidades do exame cobertas

- Projetar e implementar rastreabilidade de código-fonte, bugs e qualidade

## Foco da plataforma

Comparação (GitHub e Azure DevOps)

## Cenário

Na última quinta-feira às 2:47 da manhã, o serviço de pagamentos em produção da Contoso Ltd começou a retornar erros 500 para 12% das transações. O engenheiro de plantão identificou o sintoma em minutos, mas a equipe levou quatro horas para rastrear o erro até um commit específico, entender por que ele foi aprovado e determinar qual work item autorizou a mudança. A causa raiz era uma migração de banco de dados que passou em todos os testes isoladamente, mas entrou em conflito com uma alteração de schema concorrente de outra equipe. O CTO determinou rastreabilidade completa de ponta a ponta: do relatório de bug passando por work item, pull request, commit, artefato de build e deployment, sem lacunas na cadeia de auditoria.

---

## Pré-requisitos

- Um repositório GitHub (`contoso-payments`) com pelo menos 10 commits
- Projeto Azure DevOps conectado ao repositório GitHub
- GitHub CLI e Azure DevOps CLI instalados
- Node.js instalado (para ferramentas de linting de commits)
- Entendimento básico de conventional commits

---

## Tarefa 1: Implementar convenções de mensagens de commit (Conventional Commits)

Conventional Commits fornecem um formato estruturado que possibilita ferramentas automatizadas: changelogs, versionamento automático e rastreabilidade.

### Especificação do formato

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Tipos válidos e seus significados

| Tipo | Finalidade | Dispara |
|------|-----------|---------|
| `feat` | Nova funcionalidade | Incremento de versão minor |
| `fix` | Correção de bug | Incremento de versão patch |
| `docs` | Apenas documentação | Sem incremento de versão |
| `style` | Formatação, sem mudança de lógica | Sem incremento de versão |
| `refactor` | Mudança de código, sem feature/fix | Sem incremento de versão |
| `perf` | Melhoria de desempenho | Incremento de versão patch |
| `test` | Adição/correção de testes | Sem incremento de versão |
| `build` | Mudanças no sistema de build | Sem incremento de versão |
| `ci` | Mudanças de configuração de CI | Sem incremento de versão |
| `chore` | Tarefas de manutenção | Sem incremento de versão |

### Breaking changes

```
feat(api)!: change authentication endpoint response format

BREAKING CHANGE: The /auth/token endpoint now returns a JSON object
with 'access_token' and 'refresh_token' fields instead of a flat
token string. All API consumers must update their parsing logic.

Reviewed-by: security-team
Refs: AB#2001
```

### Configurar commit linting localmente

```bash
cd contoso-payments

# Initialize if needed
npm init -y

# Install commitlint and conventional config
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# Create commitlint configuration
cat > commitlint.config.js << 'EOF'
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'build', 'ci', 'chore', 'revert'
    ]],
    'scope-enum': [1, 'always', [
      'api', 'auth', 'db', 'payments', 'notifications', 'ui'
    ]],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
    'footer-max-line-length': [2, 'always', 100],
    'references-empty': [1, 'never']
  }
};
EOF

# Install husky for Git hooks
npm install --save-dev husky
npx husky init

# Create commit-msg hook
echo 'npx --no -- commitlint --edit "$1"' > .husky/commit-msg
chmod +x .husky/commit-msg

# Test with a valid commit
git add -A
git commit -m "build: add commitlint with conventional commits config"

# Test with an invalid commit (should fail)
echo "test" > test.txt
git add test.txt
git commit -m "added a test file"
# Error: subject may not be empty, type may not be empty
```

---

## Tarefa 2: Vincular commits a work items do Azure Boards

### Configurar a integração Azure Boards com GitHub

```bash
# Verify the Azure Boards app is installed on the repository
gh api repos/{owner}/contoso-payments/installations \
  --jq '.[] | select(.app_slug == "azure-boards") | .id'

# If not installed, the admin must install from:
# https://github.com/marketplace/azure-boards
```

### Padrões corretos de vinculação de commits

```bash
# Simple reference (creates link, no state change)
git commit -m "feat(auth): implement token refresh logic

Adds automatic token refresh when access token expires within
5 minutes of a request. Uses refresh token from HTTP-only cookie.

AB#2045"

# Fix reference (creates link AND transitions to Done/Resolved)
git commit -m "fix(payments): correct decimal precision in currency conversion

The conversion rate was truncated to 2 decimal places instead of 6,
causing rounding errors on high-value transactions.

Fixes AB#2100"

# Multiple references
git commit -m "feat(api): add rate limiting middleware

Implements token bucket algorithm with configurable burst and
sustained rates per API key.

AB#2050
AB#2051
Fixes AB#2052"
```

### Verificar os links no Azure Boards

```bash
# Check work item links
az boards work-item show --id 2045 \
  --fields "System.Title,System.State" \
  --expand relations

# The output should show:
# relations:
#   - rel: "ArtifactLink"
#     url: "vstfs:///Git/Commit/..."
#     attributes:
#       name: "Fixed in Commit"
```

---

## Tarefa 3: Vincular PRs a issues com palavras-chave de fechamento

### Palavras-chave de fechamento do GitHub

Essas palavras-chave na descrição de um PR automaticamente fecham a issue referenciada quando o PR é mergeado na branch padrão:

- `closes #123`
- `fixes #123`
- `resolves #123`

Variações sem distinção de maiúsculas/minúsculas funcionam: `Close`, `FIXES`, `Resolves`.

### Implementar vinculação correta de PR para issue

```bash
# Create an issue first
gh issue create \
  --title "Payment timeout not handled gracefully" \
  --body "When the payment gateway times out after 30s, users see a generic 500 error instead of a friendly timeout message." \
  --label "bug,priority/high" \
  --milestone "v2.4.0"

# Note the issue number (e.g., #87)

# Create a branch and fix
git checkout -b bugfix/payment-timeout-handling

cat > src/payments/timeout-handler.js << 'EOF'
class PaymentTimeoutHandler {
  constructor(timeoutMs = 30000) {
    this.timeoutMs = timeoutMs;
  }

  async executeWithTimeout(paymentFn) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const result = await paymentFn({ signal: controller.signal });
      return { success: true, data: result };
    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'PAYMENT_TIMEOUT',
          message: 'The payment is taking longer than expected. Please try again.',
          retryable: true
        };
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = PaymentTimeoutHandler;
EOF

git add -A
git commit -m "fix(payments): handle gateway timeout gracefully

Returns a user-friendly error message when the payment gateway
exceeds the 30-second timeout. The error includes a retry flag
so the UI can offer a retry button.

Fixes #87"

git push origin bugfix/payment-timeout-handling

# Create PR with closing reference
gh pr create \
  --title "fix(payments): handle gateway timeout gracefully" \
  --body "## Summary

Handles payment gateway timeouts with user-friendly error messages
instead of generic 500 errors.

## Changes
- New PaymentTimeoutHandler class with configurable timeout
- Returns structured error with retry guidance

## Testing
- Unit tests for timeout scenarios
- Integration test with mocked slow gateway

Fixes #87
AB#2100" \
  --base main
```

---

## Tarefa 4: Construir a cadeia completa de rastreabilidade

O objetivo é uma cadeia ininterrupta: Relatório de Bug -> Work Item -> PR -> Commit -> Build -> Deployment.

### Exemplo de rastreamento de ponta a ponta

```bash
# Step 1: Bug is reported (GitHub Issue #87)
gh issue view 87 --json number,title,labels,milestone

# Step 2: Work item created/linked (Azure Boards AB#2100)
az boards work-item show --id 2100 --expand relations

# Step 3: PR created referencing both (#42)
gh pr view 42 --json number,title,body,commits,mergeCommit

# Step 4: Commits in the PR
gh pr view 42 --json commits --jq '.commits[].oid'

# Step 5: Build triggered by merge
gh run list --branch main --limit 5 --json databaseId,conclusion,headSha

# Step 6: Deployment from that build
gh api repos/{owner}/{repo}/deployments \
  --jq '.[] | select(.sha == "MERGE_COMMIT_SHA") | {id, environment, created_at}'
```

### Automatizar verificação de rastreabilidade

Crie um workflow que valida a cadeia de rastreamento em cada PR:

```bash
cat > .github/workflows/traceability-check.yml << 'EOF'
name: Traceability check

on:
  pull_request:
    types: [opened, synchronize, edited]

jobs:
  verify-traceability:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check PR links to issue or work item
        uses: actions/github-script@v7
        with:
          script: |
            const prBody = context.payload.pull_request.body || '';
            const prTitle = context.payload.pull_request.title || '';

            const hasIssueRef = /(close[sd]?|fix(e[sd])?|resolve[sd]?)\s+#\d+/i.test(prBody);
            const hasABRef = /AB#\d+/i.test(prBody) || /AB#\d+/i.test(prTitle);
            const hasLinkedIssue = prBody.match(/#\d+/);

            if (!hasIssueRef && !hasABRef && !hasLinkedIssue) {
              core.setFailed(
                'PR must reference at least one issue (#123) or work item (AB#123). ' +
                'Add "Fixes #<number>" or "AB#<number>" to the PR description.'
              );
            } else {
              core.info('Traceability check passed:');
              if (hasIssueRef) core.info('  - Found closing issue reference');
              if (hasABRef) core.info('  - Found Azure Boards reference');
            }

      - name: Validate commit message format
        run: |
          COMMITS=$(git log --format="%s" origin/main..HEAD)
          PATTERN="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?(!)?: .+"
          FAILED=0

          while IFS= read -r msg; do
            if [[ ! "$msg" =~ $PATTERN ]]; then
              echo "::error::Invalid commit message: $msg"
              FAILED=1
            fi
          done <<< "$COMMITS"

          if [ $FAILED -eq 1 ]; then
            echo "::error::All commits must follow Conventional Commits format"
            echo "Format: <type>(<scope>): <description>"
            exit 1
          fi
EOF
```

---

## Tarefa 5: Configurar logs de auditoria e rastreamento de alterações

### Consultas ao log de auditoria do GitHub

```bash
# Query organization audit log for repository events (requires org admin)
gh api orgs/{org}/audit-log \
  --method GET \
  -f phrase='action:protected_branch' \
  -f per_page=10 \
  --jq '.[] | {action, actor, created_at, data}'

# Query for specific user actions
gh api orgs/{org}/audit-log \
  --method GET \
  -f phrase='actor:username action:repo' \
  -f per_page=20 \
  --jq '.[] | {action, repo, created_at}'

# Get branch protection change history
gh api orgs/{org}/audit-log \
  --method GET \
  -f phrase='action:protected_branch.policy_override repo:contoso-org/contoso-payments' \
  --jq '.[] | {actor, action, created_at}'
```

### Streaming de auditoria do Azure DevOps

```bash
# Query Azure DevOps audit log
az devops invoke \
  --area audit \
  --resource auditlog \
  --http-method GET \
  --api-version 7.1 \
  --query-parameters "startTime=2025-01-01T00:00:00Z&endTime=2025-01-31T23:59:59Z" \
  --query "[?contains(actionId, 'WorkItem')]"

# Set up audit streaming to a Log Analytics workspace
az devops invoke \
  --area audit \
  --resource streams \
  --http-method POST \
  --api-version 7.1 \
  --in-file - << 'EOF'
{
  "consumerType": "AzureMonitorLogs",
  "consumerInputs": {
    "WorkspaceId": "<workspace-id>",
    "SharedKey": "<workspace-key>"
  },
  "displayName": "Contoso Audit Stream"
}
EOF
```

---

## Tarefa 6: Aplicar formato de mensagem de commit via GitHub Actions

Crie um linter de mensagens de commit robusto como verificação obrigatória:

```bash
cat > .github/workflows/commit-lint.yml << 'EOF'
name: Commit message lint

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  commitlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install commitlint
        run: |
          npm install --save-dev @commitlint/cli @commitlint/config-conventional

      - name: Create commitlint config
        run: |
          cat > commitlint.config.js << 'CONFIG'
          module.exports = {
            extends: ['@commitlint/config-conventional'],
            rules: {
              'type-enum': [2, 'always', [
                'feat', 'fix', 'docs', 'style', 'refactor',
                'perf', 'test', 'build', 'ci', 'chore', 'revert'
              ]],
              'subject-max-length': [2, 'always', 72],
              'body-max-line-length': [2, 'always', 100],
              'footer-max-line-length': [2, 'always', 100]
            }
          };
          CONFIG

      - name: Lint commits in PR
        run: |
          npx commitlint \
            --from ${{ github.event.pull_request.base.sha }} \
            --to ${{ github.event.pull_request.head.sha }} \
            --verbose

  require-work-item-reference:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check for work item references in commits
        run: |
          COMMITS=$(git log --format="%H %s%n%b" \
            ${{ github.event.pull_request.base.sha }}..${{ github.event.pull_request.head.sha }})

          if echo "$COMMITS" | grep -qE "(AB#[0-9]+|#[0-9]+|Fixes|Closes|Resolves)"; then
            echo "Work item reference found in commits"
          else
            echo "::warning::No work item reference found in commits."
            echo "Consider adding AB#<id> or #<issue> to at least one commit."
          fi
EOF

git add -A
git commit -m "ci: add commit message linting and traceability enforcement"
git push origin main
```

---

## Exercícios de quebra e conserto

### Cenário 1: Commits não estão vinculando a work items do Azure Boards

Desenvolvedores relatam que `AB#1234` nas mensagens de commit não está criando links no Azure Boards.

**Diagnóstico:**

```bash
# Check if the Azure Boards GitHub connection is active
# In Azure DevOps: Project Settings > GitHub connections
az devops invoke \
  --area build \
  --resource builds \
  --http-method GET \
  --api-version 7.1 \
  --query-parameters "repositoryType=GitHub&repositoryId=contoso-org/contoso-payments"

# Verify the commit was pushed to the connected repository
gh api repos/{owner}/{repo}/commits/{sha} --jq '.commit.message'
```


<details>
<summary>Mostrar solução</summary>

**Correção:** O Azure Boards GitHub App deve estar instalado no repositório, e o repositório deve estar vinculado nas configurações do projeto Azure DevOps em Boards > GitHub connections. A sintaxe `AB#` funciona apenas para repositórios que estão explicitamente conectados.

</details>

### Cenário 2: Commitlint bloqueia um merge commit válido

Um desenvolvedor fez rebase e obteve um merge commit com a mensagem "Merge branch 'main' into feature/xyz" que falha no commitlint.


<details>
<summary>Mostrar solução</summary>

**Correção:** Atualize o commitlint.config.js para ignorar merge commits:

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [(commit) => commit.startsWith('Merge')],
  rules: {
    // existing rules
  }
};
```

</details>

### Cenário 3: Verificação de rastreabilidade falha em PRs do Dependabot

PRs automatizados do Dependabot não contêm referências a issues.


<details>
<summary>Mostrar solução</summary>

**Correção:** Adicione uma condição para pular a verificação para contas de bot:

```yaml
      - name: Check PR links to issue or work item
        if: github.actor != 'dependabot[bot]' && github.actor != 'github-actions[bot]'
```


</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a principal diferença entre 'AB#1234' e 'Fixes AB#1234' em uma mensagem de commit?",
    options: [
      "'AB#1234' funciona apenas em descrições de PR; 'Fixes AB#1234' funciona em commits",
      "'AB#1234' cria um link para o work item; 'Fixes AB#1234' cria um link e transiciona o estado do work item",
      "Eles têm comportamento idêntico",
      "'AB#1234' vincula ao Azure Boards; 'Fixes AB#1234' vincula ao GitHub Issues"
    ],
    correctIndex: 1,
    explanation: "AB#1234 cria um link de associação entre o commit e o work item sem alterar seu estado. Fixes AB#1234 adicionalmente transiciona o work item para o estado Resolved ou Done quando o commit chega à branch padrão."
  },
  {
    question: "Qual componente do Conventional Commits indica uma breaking change?",
    options: [
      "Usar o prefixo de tipo 'breaking'",
      "Um ponto de exclamação após o type/scope e/ou um footer 'BREAKING CHANGE:'",
      "Escrever toda a linha do subject em maiúsculas",
      "Adicionar '[BREAKING]' em qualquer lugar do corpo do commit"
    ],
    correctIndex: 1,
    explanation: "Breaking changes são sinalizadas adicionando ! após o type/scope (ex: feat(api)!:) ou incluindo um footer BREAKING CHANGE: na mensagem do commit. Ambos disparam um incremento de versão major no versionamento semântico."
  },
  {
    question: "Em uma cadeia completa de rastreabilidade, o que conecta um PR mergeado ao seu artefato implantado?",
    options: [
      "O SHA do merge commit corresponde ao commit que disparou o build, e o build produz um artefato versionado implantado no ambiente",
      "O desenvolvedor marca manualmente o deployment com o número do PR",
      "O Azure Boards rastreia deployments automaticamente",
      "O arquivo CODEOWNERS mapeia PRs a deployments"
    ],
    correctIndex: 0,
    explanation: "O SHA do merge commit é o identificador comum. O sistema de CI faz o build a partir desse SHA, produz um artefato tagueado com o hash do commit, e o sistema de deployment registra qual SHA foi implantado em cada ambiente."
  },
  {
    question: "Qual é o propósito de 'fetch-depth: 0' em um step de checkout do GitHub Actions ao executar commitlint?",
    options: [
      "Baixa todas as branches para comparação",
      "Busca o histórico completo do Git para que o commitlint possa acessar todos os commits no intervalo do PR",
      "Habilita clone superficial para builds mais rápidos",
      "Configura o checkout para incluir submódulos"
    ],
    correctIndex: 1,
    explanation: "Por padrão, actions/checkout realiza um clone superficial (depth 1). O commitlint precisa acessar todos os commits no PR (de base até head) para validar cada mensagem, o que requer o histórico completo dentro desse intervalo."
  }
]} />

## Limpeza

```bash
# Remove commitlint and husky
npm uninstall @commitlint/cli @commitlint/config-conventional husky
rm -f commitlint.config.js
rm -rf .husky

# Remove workflow files
rm -f .github/workflows/commit-lint.yml
rm -f .github/workflows/traceability-check.yml

# Clean up test branches
git checkout main
git branch -D bugfix/payment-timeout-handling 2>/dev/null

# Reset to clean state
git add -A
git commit -m "chore: remove traceability lab artifacts"
git push origin main
```
