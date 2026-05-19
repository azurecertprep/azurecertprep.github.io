---
sidebar_position: 1
title: "Desafio 01: Projetar fluxo de trabalho"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 01: Projetar fluxo de trabalho

## Habilidades do exame cobertas

- Projetar e implementar uma estrutura para o fluxo de trabalho, incluindo GitHub Flow

## Foco da plataforma

GitHub-first

## Cenário

A Contoso Ltd tem cinco equipes de desenvolvimento trabalhando em um único monorepo. Cada equipe inventou sua própria estratégia de branching: algumas usam branches de funcionalidade de longa duração, outras fazem commit diretamente na main, e uma equipe mantém quatro branches de release paralelas. O resultado é um caos previsível. Merges regularmente levam de dois a três dias para resolver conflitos, a main é quebrada pelo menos uma vez por sprint, e ninguém sabe qual branch representa o estado de produção. O VP de Engenharia determinou um workflow unificado baseado em GitHub Flow, com proteções que impedem pushes diretos e merges com falhas.

---

## Pré-requisitos

- Uma organização GitHub com pelo menos um repositório (crie `contoso-flow-demo` para este laboratório)
- GitHub CLI instalado e autenticado (`gh auth login`)
- Acesso de administrador ao repositório para configuração de proteção de branch
- Familiaridade básica com conceitos de branching no Git

---

## Tarefa 1: Entender e comparar estratégias de branching

Antes de implementar qualquer coisa, você precisa entender as três estratégias dominantes e quando cada uma se aplica.

### GitHub Flow

- Um único branch de longa duração: `main`
- Desenvolvedores criam branches de funcionalidade de curta duração a partir da `main`
- Pull requests são abertos cedo para discussão
- CI executa a cada push para o branch do PR
- Após revisão e CI verde, o PR é feito merge na `main`
- `main` é sempre implantável; deploys acontecem a partir da `main`

### GitFlow

- Branches de longa duração: `main` (produção) e `develop` (integração)
- Branches de funcionalidade derivam de `develop`
- Branches de release derivam de `develop` ao preparar um lançamento
- Branches de hotfix derivam de `main`
- Melhor para: software com ciclos formais de release (aplicativos móveis, software empacotado)

### Trunk-based development

- Um único branch: `main` (o tronco)
- Desenvolvedores fazem commit diretamente na `main` ou usam branches extremamente curtos (menos de um dia)
- Depende fortemente de feature flags para trabalho incompleto
- Requer testes automatizados abrangentes
- Melhor para: equipes de alta performance com infraestrutura madura de CI/CD e feature flags

### Quando escolher GitHub Flow (caso da Contoso)

GitHub Flow é a escolha certa para a Contoso porque:

- Eles fazem deploy de serviços web continuamente (sem janelas formais de release)
- As equipes precisam de um modelo simples e consistente que todos possam seguir
- Eles querem validação de CI antes que qualquer código chegue à main
- Eles não precisam da complexidade de branches de release

Documente sua comparação em um registro de decisão:

```bash
mkdir -p docs/decisions
cat > docs/decisions/001-branching-strategy.md << 'EOF'
# ADR 001: Adopt GitHub Flow as unified branching strategy

## Status
Accepted

## Context
Five teams use inconsistent branching strategies causing merge conflicts,
broken main branch, and unclear production state.

## Decision
Adopt GitHub Flow: short-lived feature branches, PR-based merges to main,
deploy from main.

## Consequences
- All teams follow one workflow
- Main is always deployable
- No long-lived branches (feature flags for incomplete work)
- Requires branch protection and CI gates
EOF
```

---

## Tarefa 2: Criar o repositório e implementar GitHub Flow

Crie o repositório de demonstração e configure a estrutura inicial:

```bash
# Create a new repository
gh repo create contoso-flow-demo --public --clone --description "Contoso GitHub Flow demo"
cd contoso-flow-demo

# Initialize with a README and basic structure
cat > README.md << 'EOF'
# Contoso Flow Demo

This repository demonstrates GitHub Flow with branch protection,
required CI checks, and automated merge policies.

## Workflow

1. Create a feature branch from main
2. Make changes and push
3. Open a pull request
4. Wait for CI checks and code review
5. Merge to main (squash merge preferred)
6. Deploy from main
EOF

git add -A
git commit -m "feat: initial repository structure"
git push origin main
```

Demonstre o workflow criando um branch de funcionalidade:

```bash
# Create a feature branch
git checkout -b feature/add-user-service

# Make changes
mkdir -p src
cat > src/user-service.js << 'EOF'
class UserService {
  constructor(database) {
    this.db = database;
  }

  async getUser(id) {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }
}

module.exports = UserService;
EOF

git add -A
git commit -m "feat: add user service with basic query support"
git push origin feature/add-user-service

# Open a pull request
gh pr create \
  --title "feat: add user service" \
  --body "Adds UserService class with database query support.

## Changes
- New UserService class in src/user-service.js
- Basic getUser method with parameterized query

## Testing
- Unit tests pending CI pipeline setup" \
  --base main
```

---

## Tarefa 3: Configurar regras de proteção de branch

Configure a proteção de branch para aplicar as proteções do GitHub Flow:

```bash
# Configure branch protection for main using GitHub CLI
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci/build","ci/test"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false

# Verify the protection is applied
gh api repos/{owner}/{repo}/branches/main/protection --jq '{
  required_reviews: .required_pull_request_reviews.required_approving_review_count,
  dismiss_stale: .required_pull_request_reviews.dismiss_stale_reviews,
  strict_status: .required_status_checks.strict,
  checks: .required_status_checks.contexts,
  enforce_admins: .enforce_admins.enabled
}'
```

Usando a abordagem mais recente de branch ruleset (recomendada para organizações):

```bash
# Create a ruleset for the main branch
gh api repos/{owner}/{repo}/rulesets \
  --method POST \
  --input - << 'EOF'
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
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_reviews": true,
        "require_last_push_approval": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          {"context": "ci/build"},
          {"context": "ci/test"}
        ]
      }
    },
    {
      "type": "deletion"
    },
    {
      "type": "non_fast_forward"
    }
  ]
}
EOF
```

---

## Tarefa 4: Configurar templates de pull request

Crie um template de PR que garanta consistência:

```bash
mkdir -p .github

cat > .github/pull_request_template.md << 'EOF'
## Summary

<!-- Describe what this PR does in 1-2 sentences -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would break existing functionality)
- [ ] Documentation update

## Related issues

<!-- Link related issues: Fixes #123, Relates to #456 -->

## How has this been tested?

<!-- Describe the tests you ran -->

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing performed

## Checklist

- [ ] My code follows the project style guidelines
- [ ] I have performed a self-review
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing unit tests pass locally
- [ ] Any dependent changes have been merged
EOF

git add .github/pull_request_template.md
git commit -m "chore: add pull request template"
git push origin main
```

---

## Tarefa 5: Configurar auto-merge quando as verificações passarem

Habilite o auto-merge para que PRs sejam mesclados automaticamente quando todas as verificações obrigatórias passarem e as revisões forem aprovadas:

```bash
# Enable auto-merge on the repository
gh api repos/{owner}/{repo} \
  --method PATCH \
  --field allow_auto_merge=true \
  --field delete_branch_on_merge=true \
  --field allow_squash_merge=true \
  --field allow_merge_commit=false \
  --field allow_rebase_merge=true \
  --field squash_merge_commit_title="PR_TITLE" \
  --field squash_merge_commit_message="PR_BODY"
```

Agora os desenvolvedores podem habilitar o auto-merge em seus PRs:

```bash
# After opening a PR, enable auto-merge
gh pr merge --auto --squash

# The PR will merge automatically when:
# 1. All required status checks pass
# 2. Required reviews are approved
# 3. Branch is up to date with main (if strict mode enabled)
```

---

## Tarefa 6: Implementar um workflow de CI que aplique a estratégia

Crie um workflow do GitHub Actions que valide o modelo de branching:

```bash
mkdir -p .github/workflows

cat > .github/workflows/ci.yml << 'EOF'
name: CI Pipeline

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run build
        run: npm run build

  test:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

  validate-branch-name:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - name: Check branch naming convention
        run: |
          BRANCH_NAME="${{ github.head_ref }}"
          PATTERN="^(feature|bugfix|hotfix|chore|docs)/[a-z0-9._-]+$"
          if [[ ! "$BRANCH_NAME" =~ $PATTERN ]]; then
            echo "::error::Branch name '$BRANCH_NAME' does not match pattern: $PATTERN"
            echo "Valid prefixes: feature/, bugfix/, hotfix/, chore/, docs/"
            exit 1
          fi
          echo "Branch name '$BRANCH_NAME' is valid"

  enforce-no-long-lived-branches:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check branch age
        run: |
          BRANCH_CREATED=$(git log --format=%ci --diff-filter=A --follow HEAD | tail -1)
          DAYS_OLD=$(( ($(date +%s) - $(date -d "$BRANCH_CREATED" +%s)) / 86400 ))
          if [ "$DAYS_OLD" -gt 7 ]; then
            echo "::warning::This branch is $DAYS_OLD days old. GitHub Flow recommends short-lived branches (< 7 days)."
          fi
EOF

git add .github/workflows/ci.yml
git commit -m "ci: add pipeline with branch name validation"
git push origin main
```

---

## Exercícios de quebra e conserto

### Cenário 1: Alguém faz push diretamente na main

Um desenvolvedor ignora o workflow e faz push diretamente na main:

```bash
# Simulate: try to push directly to main
git checkout main
echo "quick fix" >> README.md
git add -A
git commit -m "quick fix"
git push origin main
```

**Comportamento esperado:** O push é rejeitado porque a proteção de branch exige PRs.

**Se a proteção não estiver funcionando, verifique:**

<details>
<summary>Mostrar solução</summary>

```bash
gh api repos/{owner}/{repo}/branches/main/protection \
  --jq '.enforce_admins.enabled'
# Should be true - admins are also subject to protection

gh api repos/{owner}/{repo}/branches/main/protection \
  --jq '.required_pull_request_reviews.required_approving_review_count'
# Should be >= 1
```

</details>

### Cenário 2: Um PR é mesclado com verificações falhando

Os nomes de contexto das verificações de status devem corresponder exatamente ao que seu CI reporta.

<details>
<summary>Mostrar solução</summary>

```bash
# List recent check runs to see their exact names
gh api repos/{owner}/{repo}/commits/main/check-runs \
  --jq '.check_runs[].name'

# Update branch protection with correct check names if mismatched
gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks \
  --method PATCH \
  --field strict=true \
  --field contexts='["build","test","validate-branch-name"]'
```

</details>

### Cenário 3: Aprovações obsoletas de PR persistem após novos commits

Após um revisor aprovar, o desenvolvedor faz push de novos commits. A aprovação antiga deve ser descartada.

<details>
<summary>Mostrar solução</summary>

```bash
# Verify dismiss_stale_reviews is enabled
gh api repos/{owner}/{repo}/branches/main/protection/required_pull_request_reviews \
  --jq '.dismiss_stale_reviews'
# Must be true
```

</details>

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "No GitHub Flow, qual é o papel do branch 'main'?",
    options: [
      "Ele serve como o branch de integração onde funcionalidades são combinadas antes do release",
      "Ele está sempre em um estado implantável e representa produção",
      "Ele é bloqueado e apenas atualizado durante janelas de release",
      "Ele espelha o branch develop após cada sprint"
    ],
    correctIndex: 1,
    explanation: "No GitHub Flow, a main é sempre implantável. Deploys acontecem diretamente a partir da main, portanto ela nunca deve estar em um estado quebrado."
  },
  {
    question: "Qual configuração de proteção de branch garante que um PR não pode ser mesclado se novos commits foram enviados para a main após o branch do PR ter sido criado?",
    options: [
      "Exigir revisões de code owners",
      "Exigir que verificações de status passem antes do merge",
      "Exigir que branches estejam atualizados antes do merge (modo strict)",
      "Descartar aprovações obsoletas de pull request"
    ],
    correctIndex: 2,
    explanation: "A opção \"strict\" nas verificações de status obrigatórias força o branch do PR a ser rebaseado na última main antes do merge, prevenindo divergência de merge."
  },
  {
    question: "Quando você deve escolher GitFlow em vez de GitHub Flow?",
    options: [
      "Quando você precisa de deploy contínuo para produção",
      "Quando você tem uma única equipe com expertise em trunk-based development",
      "Quando você lança software empacotado com números de versão formais e janelas de suporte",
      "Quando você quer o workflow mais simples possível"
    ],
    correctIndex: 2,
    explanation: "GitFlow é projetado para software com releases formais (aplicativos móveis, software empacotado) onde você mantém múltiplas versões simultaneamente."
  },
  {
    question: "O que habilitar auto-merge com squash em um repositório realiza?",
    options: [
      "PRs são mesclados imediatamente sem nenhuma verificação",
      "PRs são mesclados automaticamente quando todas as condições obrigatórias são satisfeitas, combinando todos os commits em um",
      "PRs são forçados a merge mesmo se revisões estão pendentes",
      "PRs são automaticamente rebaseados e mesclados em uma agenda noturna"
    ],
    correctIndex: 1,
    explanation: "Auto-merge com squash aguarda todos os requisitos de proteção de branch (verificações, revisões) e então faz merge com um único commit squash para um histórico limpo."
  }
]} />

## Limpeza

```bash
# Delete the demo repository
gh repo delete contoso-flow-demo --yes

# Remove the local clone
cd ..
rm -rf contoso-flow-demo
```
