---
sidebar_position: 1
title: 'Desafio 07: Estratégias de branching'
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 07: Estratégias de branching

:::info Platform: GitHub-first
:::

## Habilidades do exame

- Projetar uma estratégia de branch, incluindo trunk-based development, feature branch e release branch

## Cenário

A Contoso Ltd tem três equipes de desenvolvimento trabalhando em uma plataforma compartilhada. A equipe Alpha faz deploy semanalmente (API mobile), a equipe Beta faz deploy quinzenalmente (painel web) e a equipe Gamma faz deploy mensalmente (motor de cobrança). Cada equipe adotou uma abordagem de branching diferente sem coordenação. O resultado: dor de integração a cada release, builds quebrados quando branches divergem por semanas e hotfixes que nunca voltam para as feature branches. O CTO determinou que `main` deve estar sempre implantável e cada equipe precisa de uma estratégia de branching adequada à sua cadência.

## Tarefas

### Tarefa 1: Implementar trunk-based development para a equipe Alpha (releases semanais)

Trunk-based development mantém todos os desenvolvedores trabalhando em um único branch com feature branches de curta duração (menos de 24 horas) e feature flags para ocultar trabalho incompleto.

```bash
# Clone the repository
git clone https://github.com/contoso/platform-api.git
cd platform-api

# Create a short-lived feature branch (should live < 1 day)
git checkout -b feature/add-rate-limiting
# Make changes...
git add .
git commit -m "feat: add rate limiting middleware"

# Rebase onto main before pushing (keep history linear)
git fetch origin
git rebase origin/main

# Push and create PR (will be merged same day)
git push origin feature/add-rate-limiting
gh pr create --title "Add rate limiting middleware" \
  --body "Short-lived branch - feature flagged behind RATE_LIMIT_ENABLED" \
  --base main

# After PR approval, merge with squash to keep main clean
gh pr merge --squash --delete-branch
```

Implemente uma feature flag para ocultar trabalho incompleto:

```json
// config/feature-flags.json
{
  "RATE_LIMIT_ENABLED": {
    "enabled": false,
    "rollout_percentage": 0,
    "description": "Enable API rate limiting (in progress)"
  }
}
```

Configure deploy contínuo a partir de main:

```yaml
# .github/workflows/deploy-on-merge.yml
name: Deploy on merge to main
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
      - name: Deploy to production
        run: |
          az webapp deploy --resource-group contoso-prod \
            --name contoso-platform-api \
            --src-path ./dist
```

### Tarefa 2: Implementar GitHub Flow para a equipe Beta (releases quinzenais)

GitHub Flow usa feature branches com pull requests mesclados em main, seguido de um deploy.

```bash
# Start a feature branch from main
git checkout main
git pull origin main
git checkout -b feature/dashboard-dark-mode

# Work on the feature over several days
git add .
git commit -m "feat: add dark mode toggle to header"
git add .
git commit -m "feat: implement dark mode CSS variables"
git add .
git commit -m "test: add dark mode toggle tests"

# Push the branch and open a PR
git push origin feature/dashboard-dark-mode
gh pr create --title "Dashboard dark mode support" \
  --body "Implements dark mode toggle. Closes #234" \
  --base main \
  --reviewer "@contoso/web-team" \
  --label "enhancement"

# After review and CI passes, merge
gh pr merge --merge --delete-branch
```

Configure um deploy agendado para releases quinzenais:

```yaml
# .github/workflows/biweekly-release.yml
name: Bi-weekly release
on:
  schedule:
    - cron: '0 10 1,15 * *'  # 10 AM on 1st and 15th
  workflow_dispatch:

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create release tag
        run: |
          VERSION="v$(date +%Y.%m.%d)"
          git tag -a "$VERSION" -m "Bi-weekly release $VERSION"
          git push origin "$VERSION"
      - name: Deploy to staging
        run: ./scripts/deploy.sh staging
      - name: Run smoke tests
        run: npm run test:smoke
      - name: Deploy to production
        run: ./scripts/deploy.sh production
```

### Tarefa 3: Implementar release branching para a equipe Gamma (releases mensais)

Release branching mantém branches de release de longa duração para suportar versões antigas enquanto main avança.

```bash
# Create a release branch when feature-complete
git checkout main
git pull origin main
git checkout -b release/v2.1
git push origin release/v2.1

# Continue development on main for next release
git checkout main
git checkout -b feature/new-billing-engine
# ... work on v2.2 features ...

# Bug fix on the release branch
git checkout release/v2.1
git checkout -b hotfix/fix-invoice-calculation
git add .
git commit -m "fix: correct tax calculation for EU invoices"
git push origin hotfix/fix-invoice-calculation
gh pr create --title "Fix invoice calculation" --base release/v2.1

# After merging to release, cherry-pick to main
git checkout main
git cherry-pick <commit-sha>
git push origin main

# Tag the release when ready to ship
git checkout release/v2.1
git tag -a v2.1.0 -m "Release v2.1.0 - Monthly billing release"
git push origin v2.1.0

# Patch release for hotfix
git tag -a v2.1.1 -m "Release v2.1.1 - Fix EU tax calculation"
git push origin v2.1.1
```

### Tarefa 4: Framework de decisão - quando usar qual estratégia

Crie um documento de matriz de decisão:

#### Framework de decisão de estratégia de branching

| Fator                       | Trunk-based        | GitHub Flow        | Release branching    |
|-----------------------------|--------------------|--------------------|----------------------|
| Cadência de release         | Diária/semanal     | Quinzenal          | Mensal/trimestral    |
| Tamanho da equipe           | Qualquer           | Pequena-média      | Média-grande         |
| Automação de deploy         | Obrigatória (CD)   | Recomendada        | Opcional             |
| Feature flags necessárias   | Sim                | Opcional           | Não                  |
| Suportar versões antigas    | Não                | Não                | Sim                  |
| Portão de code review       | Opcional (pair)    | Obrigatório (PR)   | Obrigatório (PR)     |
| Estratégia de rollback      | Feature flag off   | Revert commit      | Deploy versão anterior|
| Risco de integração         | Baixo (sempre merged)| Médio            | Alto (longa duração) |

### Tarefa 5: Lidando com branches de longa duração sem divergência

Evite que branches de release divirjam demais de main:

```bash
# Schedule regular syncs from main to release (automate this)
git checkout release/v2.1
git merge main --no-edit
# Resolve any conflicts
git push origin release/v2.1
```

Automatize a detecção de divergência com uma GitHub Action:

```yaml
# .github/workflows/branch-drift-check.yml
name: Branch drift detection
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM

jobs:
  check-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Check drift between main and release branches
        run: |
          for branch in $(git branch -r | grep 'release/'); do
            BEHIND=$(git rev-list --count "origin/main..${branch}")
            AHEAD=$(git rev-list --count "${branch}..origin/main")
            echo "Branch ${branch}: ${BEHIND} commits behind, ${AHEAD} commits ahead"
            if [ "$BEHIND" -gt 50 ]; then
              echo "::warning::${branch} is ${BEHIND} commits behind main - sync needed"
              gh issue create --title "Branch drift: ${branch} is ${BEHIND} commits behind" \
                --body "Please merge main into ${branch} to reduce drift." \
                --label "maintenance"
            fi
          done
```

### Tarefa 6: Demonstrar workflows de merge vs rebase

**Workflow de merge** (preserva histórico, mostra onde o branch divergiu):

```bash
# Feature branch with merge
git checkout -b feature/payment-gateway
git commit -m "feat: add Stripe integration"
git commit -m "feat: add payment webhook handler"

# Merge into main (creates merge commit)
git checkout main
git merge feature/payment-gateway --no-ff
# Creates: "Merge branch 'feature/payment-gateway' into main"
```

**Workflow de rebase** (histórico linear, log mais limpo):

```bash
# Feature branch with rebase
git checkout -b feature/payment-gateway
git commit -m "feat: add Stripe integration"
git commit -m "feat: add payment webhook handler"

# Rebase onto latest main (replays commits on top)
git fetch origin
git rebase origin/main

# Fast-forward merge (no merge commit)
git checkout main
git merge feature/payment-gateway --ff-only
```

**Rebase interativo para limpar antes do PR**:

```bash
# Squash 5 messy commits into 2 clean ones
git rebase -i HEAD~5

# In the editor:
# pick abc1234 feat: add Stripe integration
# squash def5678 wip: stripe config
# squash ghi9012 fix: typo in stripe key
# pick jkl3456 feat: add payment webhook handler
# squash mno7890 fix: webhook signature validation
```

## Exercícios de quebra e conserto

### Cenário 1: Conflito de merge de release branch desatualizado

Um release branch não foi sincronizado com main por 3 semanas. Um hotfix crítico no release branch conflita com código refatorado em main.

```bash
# Simulate the problem
git checkout main
echo "class PaymentProcessor:" > billing/processor.py
echo "    def calculate(self, amount):" >> billing/processor.py
echo "        return amount * 1.2" >> billing/processor.py
git add . && git commit -m "refactor: rename billing processor"

git checkout release/v2.1
echo "class BillingEngine:" > billing/processor.py
echo "    def calculate(self, amount):" >> billing/processor.py
echo "        return amount * 1.15  # hotfix: correct tax rate" >> billing/processor.py
git add . && git commit -m "fix: correct tax rate"

# Now try to merge main into release
git merge main
# CONFLICT in billing/processor.py
```


<details>
<summary>Mostrar solução</summary>

**Correção**: Resolva o conflito mantendo a lógica do hotfix na estrutura refatorada:

```bash
# Edit the file to resolve
cat > billing/processor.py << 'EOF'
class PaymentProcessor:
    def calculate(self, amount):
        return amount * 1.15  # hotfix: correct tax rate
EOF

git add billing/processor.py
git commit -m "merge: resolve conflict keeping hotfix tax rate in refactored class"
```

</details>

### Cenário 2: Push acidental em main (burlando a estratégia de branch)

Um desenvolvedor fez push de 3 commits diretamente em main em vez de usar um feature branch.

```bash
# Identify the bad commits
git log --oneline -5 main

# Create a branch from the bad commits to preserve work
git checkout main
git branch feature/recover-direct-push

# Reset main to before the direct pushes
git reset --hard HEAD~3
git push origin main --force-with-lease

# The work is preserved on the feature branch for a proper PR
git checkout feature/recover-direct-push
git push origin feature/recover-direct-push
gh pr create --title "Recover: direct push to main" --base main
```

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: ": Uma equipe faz releases diários e precisa que main esteja sempre implantável. Eles usam feature flags para ocultar trabalho incompleto. Qual estratégia de branching melhor atende a esse requisito?",
    options: [
      "Git Flow com branches develop e release",
      "Trunk-based development com branches de curta duração",
      "Release branching com branches de suporte de longa duração",
      "GitHub Flow com feature branches durando 1-2 semanas"
    ],
    correctIndex: 1,
    explanation: "Trunk-based development é projetado para entrega contínua. Branches de curta duração (idealmente menos de um dia) minimizam o risco de integração, e feature flags permitem que funcionalidades incompletas existam em produção sem serem visíveis para os usuários. Isso suporta releases diários porque main está sempre em estado implantável."
  },
  {
    question: ": Qual é o principal risco de manter branches de release de longa duração?",
    options: [
      "Eles consomem muito espaço em disco",
      "Eles divergem de main, causando conflitos de merge cada vez mais complexos",
      "Eles impedem outros desenvolvedores de criar branches",
      "Eles tornam as operações de git clone mais lentas"
    ],
    correctIndex: 1,
    explanation: "Branches de longa duração acumulam mudanças que diferem de main. Quanto mais tempo ficam sem sincronizar, mais as bases de código divergem, levando a conflitos de merge dolorosos. Integração regular para frente (merge de main no release branch) mitiga esse risco."
  },
  {
    question: ": Ao usar 'git rebase' em vez de 'git merge' para um feature branch, o que acontece com o histórico do branch?",
    options: [
      "Os commits do feature branch são reaplicados no topo do branch de destino, criando novos hashes de commit",
      "Um commit de merge é criado que combina ambos os históricos",
      "Os commits do feature branch são deletados e substituídos por um único commit squash",
      "O histórico do branch de destino é reescrito para incluir os commits da feature em ordem cronológica"
    ],
    correctIndex: 0,
    explanation: "O rebase pega cada commit do feature branch e o reaaplica no topo do branch de destino. Isso cria novos commits com hashes SHA diferentes (porque o commit pai mudou) mas com as mesmas mudanças. O resultado é um histórico linear sem commits de merge."
  },
  {
    question: ": Uma equipe usa GitHub Flow. Um bug crítico é encontrado em produção. Qual é o procedimento correto?",
    options: [
      "Criar um branch hotfix a partir da tag de release, corrigir, fazer merge no release, depois cherry-pick em main",
      "Criar um branch a partir de main, corrigir o bug, abrir um PR, fazer merge em main, fazer deploy",
      "Fazer commit da correção diretamente em main e fazer deploy imediatamente",
      "Reverter main para o último estado estável conhecido, depois reaplicar features"
    ],
    correctIndex: 1,
    explanation: "No GitHub Flow, main é a única fonte de verdade. Todas as mudanças passam pelo mesmo processo: criar branch a partir de main, fazer alterações, abrir um PR, obter revisão, fazer merge, fazer deploy. Hotfixes seguem o mesmo workflow mas com revisão expedida. Não existem branches de release separados no GitHub Flow."
  }
]} />

## Limpeza

```bash
# Delete feature branches created during this challenge
git branch -d feature/add-rate-limiting 2>/dev/null
git branch -d feature/dashboard-dark-mode 2>/dev/null
git branch -d feature/new-billing-engine 2>/dev/null
git branch -d feature/payment-gateway 2>/dev/null
git branch -d feature/recover-direct-push 2>/dev/null
git branch -d hotfix/fix-invoice-calculation 2>/dev/null

# Delete release branches
git branch -d release/v2.1 2>/dev/null

# Remove remote tracking branches
git push origin --delete feature/add-rate-limiting 2>/dev/null
git push origin --delete feature/dashboard-dark-mode 2>/dev/null
git push origin --delete release/v2.1 2>/dev/null

# Prune stale remote references
git remote prune origin

# Verify clean state
git branch -a
```
