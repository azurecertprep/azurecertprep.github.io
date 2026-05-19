---
sidebar_position: 2
title: 'Desafio 08: Fluxos de trabalho de pull request'
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 08: Fluxos de trabalho de pull request

:::info Platform: GitHub-first
:::

## Habilidades do exame

- Projetar e implementar um fluxo de trabalho de pull request usando políticas de branch e regras de branch protection
- Implementar restrições de merge de branch usando políticas de branch e regras de branch protection

## Cenário

A Contoso Ltd teve dois incidentes de produção no mês passado causados por código não revisado. Desenvolvedores juniores estão fazendo push diretamente para `main`, ignorando completamente a revisão de código. O desenvolvedor líder percebeu que uma vulnerabilidade de SQL injection chegou à produção porque ninguém revisou as alterações nas consultas ao banco de dados. O VP de Engenharia determinou que todo código deve passar por revisão de pull request com verificações automatizadas antes do merge. Você precisa implementar regras de branch protection no GitHub e no Azure Repos para evitar pushes diretos e aplicar gates de qualidade.

## Tarefas

### Tarefa 1: Configurar regras de branch protection no GitHub

Configure uma proteção abrangente de branch na branch `main`:

```bash
# Using GitHub CLI to configure branch protection
# First, create a branch ruleset (modern approach, replaces legacy branch protection)
gh api repos/contoso/platform-api/rulesets --method POST --input - << 'EOF'
{
  "name": "Main branch protection",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 2,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": true,
        "require_last_push_approval": true,
        "required_review_thread_resolution": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_status_checks_policy": true,
        "required_status_checks": [
          { "context": "ci/build" },
          { "context": "ci/test" },
          { "context": "security/scan" }
        ]
      }
    },
    {
      "type": "required_signatures"
    },
    {
      "type": "non_fast_forward"
    },
    {
      "type": "deletion"
    }
  ],
  "bypass_actors": [
    {
      "actor_id": 1,
      "actor_type": "RepositoryRole",
      "bypass_mode": "pull_request"
    }
  ]
}
EOF
```

Alternativamente, configure via legacy branch protection (ainda amplamente utilizado):

```bash
# Enable branch protection using gh CLI
gh api repos/contoso/platform-api/branches/main/protection --method PUT --input - << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci/build", "ci/test", "security/scan"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismissal_restrictions": {},
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 2,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
EOF
```

### Tarefa 2: Configurar o arquivo CODEOWNERS para atribuição automática de revisores

Crie um arquivo `CODEOWNERS` na raiz do repositório:

```bash
# .github/CODEOWNERS
# Each line defines a pattern and the team/individuals responsible for review

# Default owners for everything in the repo
* @contoso/platform-team

# Backend API owners
/src/api/ @contoso/backend-team
/src/api/billing/ @contoso/billing-team @sarah-lead

# Frontend owners
/src/web/ @contoso/frontend-team
/src/web/components/ @contoso/ui-team

# Infrastructure and DevOps
/infrastructure/ @contoso/devops-team
/scripts/ @contoso/devops-team
/.github/workflows/ @contoso/devops-team

# Database migrations require DBA review
/src/db/migrations/ @contoso/dba-team @mike-dba

# Security-sensitive files require security team
/src/auth/ @contoso/security-team
/src/crypto/ @contoso/security-team
**/security*.yml @contoso/security-team

# Documentation
/docs/ @contoso/docs-team

# Package manifests
package.json @contoso/platform-team @contoso/security-team
package-lock.json @contoso/platform-team
```

Verifique a sintaxe do CODEOWNERS:

```bash
# GitHub validates CODEOWNERS automatically
# Check it locally with a linting tool
npm install -g github-codeowners
github-codeowners validate
```

### Tarefa 3: Configurar verificações de status obrigatórias

Crie o workflow de CI que a branch protection referencia:

```yaml
# .github/workflows/ci.yml
name: CI Pipeline
on:
  pull_request:
    branches: [main]

jobs:
  build:
    name: ci/build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build

  test:
    name: ci/test
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage ${COVERAGE}% is below 80% threshold"
            exit 1
          fi

  security-scan:
    name: security/scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run CodeQL analysis
        uses: github/codeql-action/init@v3
        with:
          languages: javascript
      - uses: github/codeql-action/analyze@v3
      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
```

### Tarefa 4: Configurar merge queue para repositórios movimentados

Configure o merge queue para agrupar e testar PRs juntos antes do merge:

```bash
# Enable merge queue via GitHub API
gh api repos/contoso/platform-api/rulesets --method POST --input - << 'EOF'
{
  "name": "Merge queue enforcement",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "merge_queue",
      "parameters": {
        "check_response_timeout_minutes": 30,
        "grouping_strategy": "ALLGREEN",
        "max_entries_to_build": 5,
        "max_entries_to_merge": 5,
        "merge_method": "squash",
        "min_entries_to_merge": 1,
        "min_entries_to_merge_wait_minutes": 5
      }
    }
  ]
}
EOF
```

Crie um workflow para o merge queue:

```yaml
# .github/workflows/merge-queue.yml
name: Merge queue CI
on:
  merge_group:
    types: [checks_requested]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - run: npm test
      - name: Integration tests
        run: npm run test:integration
```

### Tarefa 5: Configurar políticas de branch no Azure Repos

Configure proteção equivalente no Azure DevOps:

```bash
# Set minimum number of reviewers
az repos policy approver-count create \
  --project "Contoso-Platform" \
  --repository-id $(az repos show --repository "platform-api" --query id -o tsv) \
  --branch main \
  --minimum-approver-count 2 \
  --creator-vote-counts false \
  --allow-downvotes false \
  --reset-on-source-push true \
  --blocking true \
  --enabled true

# Require linked work items
az repos policy work-item-linking create \
  --project "Contoso-Platform" \
  --repository-id $(az repos show --repository "platform-api" --query id -o tsv) \
  --branch main \
  --blocking true \
  --enabled true

# Require build validation
az repos policy build create \
  --project "Contoso-Platform" \
  --repository-id $(az repos show --repository "platform-api" --query id -o tsv) \
  --branch main \
  --build-definition-id 42 \
  --display-name "CI Build Validation" \
  --queue-on-source-update-only true \
  --valid-duration 720 \
  --blocking true \
  --enabled true

# Require comment resolution
az repos policy comment-required create \
  --project "Contoso-Platform" \
  --repository-id $(az repos show --repository "platform-api" --query id -o tsv) \
  --branch main \
  --blocking true \
  --enabled true

# Require merge strategy (squash only)
az repos policy merge-strategy create \
  --project "Contoso-Platform" \
  --repository-id $(az repos show --repository "platform-api" --query id -o tsv) \
  --branch main \
  --allow-squash true \
  --allow-no-fast-forward false \
  --allow-rebase false \
  --allow-rebase-merge false \
  --blocking true \
  --enabled true
```

### Tarefa 6: Limites de tamanho de PR e rotulagem automática

Crie um workflow para rotular PRs por tamanho e alertar sobre PRs grandes:

```yaml
# .github/workflows/pr-size-labeler.yml
name: PR size labeler
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  label:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Calculate PR size and apply label
        uses: actions/github-script@v7
        with:
          script: |
            const { data: files } = await github.rest.pulls.listFiles({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number,
            });

            const changes = files.reduce((sum, f) => sum + f.additions + f.deletions, 0);
            const fileCount = files.length;

            let label, comment;
            if (changes <= 50 && fileCount <= 5) {
              label = 'size/S';
            } else if (changes <= 200 && fileCount <= 15) {
              label = 'size/M';
            } else if (changes <= 500) {
              label = 'size/L';
              comment = 'This PR has over 200 lines changed. Consider splitting into smaller PRs for easier review.';
            } else {
              label = 'size/XL';
              comment = 'This PR has over 500 lines changed. Large PRs are difficult to review thoroughly and increase the risk of bugs. Please split this into smaller, focused PRs.';
            }

            // Remove existing size labels
            const existingLabels = (await github.rest.issues.listLabelsOnIssue({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            })).data.map(l => l.name).filter(n => n.startsWith('size/'));

            for (const l of existingLabels) {
              await github.rest.issues.removeLabel({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                name: l,
              });
            }

            // Add new label
            await github.rest.issues.addLabels({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              labels: [label],
            });

            // Comment if PR is too large
            if (comment) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: comment,
              });
            }
```

### Tarefa 7: Implementar templates de PR com checklist

Crie um template de pull request:

```markdown
<!-- .github/pull_request_template.md -->
## Summary

<!-- Brief description of what this PR does -->

## Related issues

<!-- Link to related issues: Closes #123, Fixes #456 -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Infrastructure/CI change

## Checklist

- [ ] My code follows the project style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have added tests that prove my fix or feature works
- [ ] New and existing unit tests pass locally
- [ ] I have updated documentation where applicable
- [ ] I have checked for security implications
- [ ] I have not committed any secrets or credentials
- [ ] My changes generate no new warnings or errors

## Testing

<!-- Describe the tests you ran and how to reproduce -->

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Deployment notes

<!-- Any special deployment considerations? Database migrations? Feature flags? -->
```

Crie um template especializado para hotfixes:

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE/hotfix.md -->
## Hotfix summary

**Severity**: [ ] P1 - Service down [ ] P2 - Major degradation [ ] P3 - Minor issue

**Incident link**: <!-- Link to incident or on-call ticket -->

## Root cause

<!-- What caused the issue? -->

## Fix description

<!-- What does this fix do? -->

## Risk assessment

- [ ] Change is minimal and targeted
- [ ] Rollback plan identified
- [ ] Monitoring dashboards checked

## Checklist

- [ ] Fix verified in staging/dev
- [ ] Tests added to prevent regression
- [ ] On-call team notified
- [ ] Post-incident review scheduled
```

## Exercícios de quebra e conserto

### Cenário 1: Verificação de status obrigatória nunca completa

Um desenvolvedor cria um PR, mas a verificação de status obrigatória `ci/build` fica presa como "pending" e nunca reporta resultado. O PR não pode ser mergeado.

**Diagnóstico**:

```bash
# Check the workflow runs for this PR
gh run list --branch feature/new-endpoint --limit 5

# Check if the workflow file name matches the required check name
gh api repos/contoso/platform-api/branches/main/protection/required_status_checks

# Common issue: the check context name in branch protection doesn't match
# the job name or workflow name in the YAML
```


<details>
<summary>Mostrar solução</summary>

**Correção**: O nome da verificação de status obrigatória `ci/build` deve corresponder ao campo `name:` do job, não ao nome do workflow. Atualize o nome do job no workflow:

```yaml
jobs:
  build:
    name: ci/build  # This must match the required status check context
    runs-on: ubuntu-latest
```

Ou atualize a branch protection para corresponder ao nome do job existente:

```bash
gh api repos/contoso/platform-api/branches/main/protection/required_status_checks \
  --method PATCH --input - << 'EOF'
{
  "strict": true,
  "contexts": ["build", "test", "security-scan"]
}
EOF
```

</details>

### Cenário 2: Arquivo CODEOWNERS não aciona atribuição de revisores

PRs que modificam `/src/api/billing/` não estão solicitando automaticamente a revisão de `@contoso/billing-team`, apesar de estarem listados no CODEOWNERS.

**Diagnóstico**:

```bash
# Check if CODEOWNERS is in the correct location
# Must be in: .github/CODEOWNERS, CODEOWNERS, or docs/CODEOWNERS
find . -name "CODEOWNERS" -type f

# Verify the team exists and has read access to the repo
gh api orgs/contoso/teams/billing-team/repos/contoso/platform-api

# Check if "Require review from Code Owners" is enabled in branch protection
gh api repos/contoso/platform-api/branches/main/protection/required_pull_request_reviews \
  | jq '.require_code_owner_reviews'
```


<details>
<summary>Mostrar solução</summary>

**Correção**: O time deve ter pelo menos acesso de escrita ao repositório, e as revisões de code owner devem estar habilitadas:

```bash
# Grant the team write access
gh api orgs/contoso/teams/billing-team/repos/contoso/platform-api \
  --method PUT -f permission=push

# Enable code owner review requirement
gh api repos/contoso/platform-api/branches/main/protection/required_pull_request_reviews \
  --method PATCH --input - << 'EOF'
{
  "require_code_owner_reviews": true,
  "required_approving_review_count": 2
}
EOF
```

</details>

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: ": Um repositório possui branch protection exigindo 2 revisões aprovadas e a verificação de status 'ci/test'. Um desenvolvedor faz push de um novo commit para a branch do PR após receber 2 aprovações. O que acontece?",
    options: [
      "O PR ainda pode ser mergeado porque já possui 2 aprovações",
      "As aprovações são descartadas e o desenvolvedor precisa de 2 novas revisões",
      "Apenas 1 nova aprovação é necessária, já que os revisores anteriores viram a maior parte do código",
      "O PR é automaticamente fechado e precisa ser reaberto"
    ],
    correctIndex: 1,
    explanation: "Quando \"Dismiss stale pull request approvals when new commits are pushed\" está habilitado (configurado na Tarefa 1 com dismiss_stale_reviews_on_push: true), quaisquer novos commits enviados para a branch do PR descartam automaticamente todas as aprovações existentes. Isso garante que os revisores aprovem a versão final do código, não uma versão anterior que pode ter sido alterada."
  },
  {
    question: ": No Azure Repos, qual é o efeito de configurar \"Reset code reviewer votes when there are new changes\" em uma política de branch?",
    options: [
      "Todos os revisores são removidos do PR",
      "Os votos dos revisores são redefinidos para sem voto, exigindo reaprovação",
      "Apenas os votos dos revisores cujos arquivos foram alterados são redefinidos",
      "O PR é movido de volta para o status de rascunho"
    ],
    correctIndex: 1,
    explanation: "Essa configuração do Azure Repos é equivalente ao \"Dismiss stale reviews on push\" do GitHub. Quando novas alterações são enviadas para a branch de origem, todos os votos existentes dos revisores (Approve, Approve with suggestions, Wait for author, Reject) são redefinidos para \"No vote\", exigindo que os revisores reavaliem e votem novamente no código atualizado."
  },
  {
    question: ": Um arquivo CODEOWNERS contém estas entradas em ordem. Quem é obrigado a revisar uma alteração em '/src/api/billing/invoice.ts'?  ''' * @contoso/platform-team /src/api/ @contoso/backend-team /src/api/billing/ @contoso/billing-team @sarah-lead '''",
    options: [
      "'@contoso/platform-team' apenas (primeira correspondência vence)",
      "'@contoso/backend-team' apenas (correspondência do diretório pai)",
      "'@contoso/billing-team' e '@sarah-lead' (último padrão correspondente vence)",
      "Todos os três times e indivíduos listados"
    ],
    correctIndex: 2,
    explanation: "O CODEOWNERS usa a regra de última correspondência vence, semelhante ao .gitignore. O arquivo é avaliado de cima para baixo, e o último padrão correspondente determina os code owners. Como /src/api/billing/ corresponde ao caminho do arquivo e aparece após os outros padrões, apenas @contoso/billing-team e @sarah-lead são atribuídos como revisores obrigatórios."
  },
  {
    question: ": Qual é o principal objetivo de um merge queue no GitHub?",
    options: [
      "Limitar o número de PRs que podem estar abertos ao mesmo tempo",
      "Garantir que PRs sejam mergeados na ordem em que foram criados",
      "Testar em lote múltiplos PRs aprovados juntos contra a main antes do merge, prevenindo builds quebrados de merges concorrentes",
      "Resolver automaticamente conflitos de merge entre PRs concorrentes"
    ],
    correctIndex: 2,
    explanation: "Um merge queue resolve o problema de \"conflito semântico\" onde dois PRs individualmente passam no CI contra a main, mas quando ambos são mergeados, quebram um ao outro. O merge queue cria grupos de merge temporários que testam PRs juntos, garantindo que sejam compatíveis antes do merge na main. Se um grupo falhar, a fila faz bisect para encontrar o PR problemático e o remove."
  }
]} />

## Limpeza

```bash
# Remove branch protection (for testing purposes only)
gh api repos/contoso/platform-api/branches/main/protection --method DELETE

# Remove CODEOWNERS file if testing
rm .github/CODEOWNERS

# Remove workflow files created during this challenge
rm .github/workflows/ci.yml
rm .github/workflows/merge-queue.yml
rm .github/workflows/pr-size-labeler.yml
rm .github/pull_request_template.md
rm .github/PULL_REQUEST_TEMPLATE/hotfix.md

# Remove branch policies in Azure DevOps
az repos policy list --project "Contoso-Platform" --repository-id <repo-id> --query "[].id" -o tsv | \
  xargs -I {} az repos policy delete --id {} --project "Contoso-Platform" --yes

# Verify no policies remain
az repos policy list --project "Contoso-Platform" --branch main
```
