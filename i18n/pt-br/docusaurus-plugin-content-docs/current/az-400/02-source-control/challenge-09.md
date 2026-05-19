---
sidebar_position: 3
title: 'Desafio 09: Gerenciamento de repositório'
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 09: Gerenciamento de repositório

:::info Platform: ADO-first
:::

## Habilidades do exame

- Configurar permissões no repositório de controle de código-fonte
- Configurar tags para organizar o repositório de controle de código-fonte

## Cenário

O monorepo da Contoso Ltd cresceu para 200 contribuidores em 8 equipes. Atualmente, todos têm o mesmo nível de acesso. No último sprint, um estagiário acidentalmente fez push de uma alteração de configuração nos manifestos de deploy de produção em `/deploy/prod/`, causando uma interrupção. As tags Git estão inconsistentes (algumas usam `v1.2.3`, outras usam `release-20240115`, e algumas são tags leves sem metadados). A equipe de DevOps precisa implementar controles de acesso adequados e estabelecer uma estratégia de tags que se integre com o pipeline de CI/CD.

## Tarefas

### Tarefa 1: Configurar permissões do repositório GitHub

Configure o acesso baseado em funções usando os níveis de permissão do GitHub:

```bash
# Create teams with appropriate repository access
# Admin: DevOps leads (full control including settings and branch protection)
gh api orgs/contoso/teams --method POST \
  -f name="platform-admins" \
  -f description="Platform administrators - full repo access" \
  -f privacy="closed"

# Grant admin access to the repo
gh api orgs/contoso/teams/platform-admins/repos/contoso/platform-monorepo \
  --method PUT -f permission="admin"

# Maintain: Tech leads (manage issues, PRs, but can't change settings)
gh api orgs/contoso/teams --method POST \
  -f name="tech-leads" \
  -f description="Technical leads - maintain access" \
  -f privacy="closed"

gh api orgs/contoso/teams/tech-leads/repos/contoso/platform-monorepo \
  --method PUT -f permission="maintain"

# Write: Senior developers (push to non-protected branches)
gh api orgs/contoso/teams --method POST \
  -f name="senior-developers" \
  -f description="Senior developers - write access" \
  -f privacy="closed"

gh api orgs/contoso/teams/senior-developers/repos/contoso/platform-monorepo \
  --method PUT -f permission="push"

# Triage: Junior developers (manage issues, can't push code)
gh api orgs/contoso/teams --method POST \
  -f name="junior-developers" \
  -f description="Junior developers and interns - triage access" \
  -f privacy="closed"

gh api orgs/contoso/teams/junior-developers/repos/contoso/platform-monorepo \
  --method PUT -f permission="triage"

# Read: Stakeholders and external auditors
gh api orgs/contoso/teams --method POST \
  -f name="stakeholders" \
  -f description="Business stakeholders - read only" \
  -f privacy="closed"

gh api orgs/contoso/teams/stakeholders/repos/contoso/platform-monorepo \
  --method PUT -f permission="pull"
```

Verifique as permissões das equipes:

```bash
# List all teams with access to the repository
gh api repos/contoso/platform-monorepo/teams | jq '.[] | {name: .name, permission: .permission}'

# Check a specific user's effective permissions
gh api repos/contoso/platform-monorepo/collaborators/intern-jane/permission \
  | jq '.permission'
```

### Tarefa 2: Configurar acesso baseado em equipes com GitHub Teams

Organize as equipes hierarquicamente com equipes aninhadas:

```bash
# Create parent team for engineering org
gh api orgs/contoso/teams --method POST \
  -f name="engineering" \
  -f description="All engineering staff" \
  -f privacy="closed"

# Create child teams under engineering
PARENT_ID=$(gh api orgs/contoso/teams/engineering --jq '.id')

gh api orgs/contoso/teams --method POST \
  -f name="billing-team" \
  -f description="Billing engine team" \
  -f privacy="closed" \
  -f parent_team_id="$PARENT_ID"

gh api orgs/contoso/teams --method POST \
  -f name="api-team" \
  -f description="API platform team" \
  -f privacy="closed" \
  -f parent_team_id="$PARENT_ID"

gh api orgs/contoso/teams --method POST \
  -f name="frontend-team" \
  -f description="Frontend/UI team" \
  -f privacy="closed" \
  -f parent_team_id="$PARENT_ID"

# Add members to teams
gh api orgs/contoso/teams/billing-team/memberships/sarah-billing --method PUT -f role="maintainer"
gh api orgs/contoso/teams/billing-team/memberships/dev-bob --method PUT -f role="member"
gh api orgs/contoso/teams/billing-team/memberships/dev-carol --method PUT -f role="member"

# List team members
gh api orgs/contoso/teams/billing-team/members | jq '.[].login'
```

### Tarefa 3: Configurar permissões do Azure Repos

Configure permissões granulares no Azure DevOps incluindo segurança em nível de caminho:

```bash
# Set repository-level permissions
# Grant contribute permission to the development team
az devops security permission update \
  --namespace-id "2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87" \
  --subject "vssgp.Uy0xLTktMTU1MTM3NDI0NS0xMjA0NDAwOTY5" \
  --token "repoV2/contoso-project-id/repo-id" \
  --allow-bit 4 \
  --deny-bit 0

# Deny force push to all non-admin users
az devops security permission update \
  --namespace-id "2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87" \
  --subject "vssgp.Uy0xLTktMTU1MTM3NDI0NS0xMjA0NDAwOTY5" \
  --token "repoV2/contoso-project-id/repo-id" \
  --deny-bit 8

# Configure branch-level permissions (protect release branches)
# Only release managers can push to release/* branches
az repos policy approver-count create \
  --project "Contoso-Platform" \
  --repository-id <repo-id> \
  --branch "release/*" \
  --minimum-approver-count 2 \
  --blocking true \
  --enabled true

# Path-level permissions using Azure DevOps security namespaces
# Deny interns write access to /deploy/prod/ path
# This requires the Git Repositories namespace and path-scoped tokens
az devops security permission update \
  --namespace-id "2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87" \
  --subject "vssgp.intern-group-descriptor" \
  --token "repoV2/project-id/repo-id/refs/heads/main//deploy/prod" \
  --deny-bit 4
```

Crie um documento de matriz de permissões para a equipe:

#### Níveis de permissão do Azure Repos para o monorepo da Contoso

| Permissão           | Admins | Tech leads | Seniores | Juniores | Estagiários |
|---------------------|--------|------------|----------|----------|-------------|
| Leitura             | Sim    | Sim        | Sim      | Sim      | Sim         |
| Contribuir          | Sim    | Sim        | Sim      | Sim      | Não         |
| Criar branch        | Sim    | Sim        | Sim      | Sim      | Não         |
| Force push          | Sim    | Não        | Não      | Não      | Não         |
| Gerenciar permissões| Sim    | Não        | Não      | Não      | Não         |
| Push para main      | Não*   | Não*       | Não*     | Não*     | Não*        |
| Push para release/* | Sim    | Sim        | Não      | Não      | Não         |
| Push para deploy/prod| Sim   | Não        | Não      | Não      | Não         |

*main é protegida - requer PR com aprovações

### Tarefa 4: Implementar tags Git para releases

Crie tags anotadas adequadas para releases:

```bash
# Annotated tag (stores tagger info, date, message - preferred for releases)
git tag -a v1.2.0 -m "Release v1.2.0 - Q1 2024 billing engine update

Changes:
- Add multi-currency support
- Fix EU VAT calculation
- Improve invoice PDF generation performance

Breaking changes:
- Currency field is now required on all invoice endpoints"

# Push the tag to remote
git push origin v1.2.0

# Lightweight tag (just a pointer to a commit - for temporary/internal use)
git tag build-2024.01.15-rc1
git push origin build-2024.01.15-rc1

# Tag a specific past commit (retroactive tagging)
git tag -a v1.1.5 abc1234 -m "Patch release v1.1.5 - hotfix for payment timeout"
git push origin v1.1.5

# List all tags
git tag --list

# List tags matching a pattern
git tag --list "v1.2.*"

# Show tag details
git show v1.2.0

# Verify a signed tag (if GPG signing is configured)
git tag -v v1.2.0
```

Compare tags anotadas vs tags leves:

```bash
# See the difference in object types
git cat-file -t v1.2.0        # Output: tag (annotated - full object)
git cat-file -t build-2024.01.15-rc1  # Output: commit (lightweight - just a ref)

# Annotated tags show in `git describe`
git describe --tags
# Output: v1.2.0-14-g2414721 (14 commits after v1.2.0)
```

### Tarefa 5: Convenções de nomenclatura de tags

Estabeleça um padrão de tags para a Contoso:

```bash
# Production releases: Semantic Versioning
# Format: v{MAJOR}.{MINOR}.{PATCH}
git tag -a v2.0.0 -m "Major release: new API version"
git tag -a v2.1.0 -m "Minor release: add search feature"
git tag -a v2.1.1 -m "Patch release: fix search pagination"

# Pre-release versions
git tag -a v2.2.0-alpha.1 -m "Alpha: new dashboard (unstable)"
git tag -a v2.2.0-beta.1 -m "Beta: new dashboard (feature complete, testing)"
git tag -a v2.2.0-rc.1 -m "Release candidate: final testing"

# Date-based releases (for services with continuous delivery)
# Format: release-YYYY.MM.DD
git tag -a release-2024.01.15 -m "Weekly release 2024-01-15"

# Build tags (CI-generated, lightweight is acceptable)
git tag ci-build-1847
git tag deploy-prod-2024.01.15.1
```

Documente a convenção:

#### Convenção de nomenclatura de tags

| Padrão                       | Caso de uso            | Exemplo                       | Tipo       |
|------------------------------|------------------------|-------------------------------|------------|
| `v{MAJOR}.{MINOR}.{PATCH}`  | Releases versionadas   | v2.1.0                        | Anotada    |
| `v{X}.{Y}.{Z}-{pre}.{N}`   | Pré-releases           | v2.2.0-beta.1                 | Anotada    |
| `release-{YYYY.MM.DD}`      | Releases baseadas em data | release-2024.01.15         | Anotada    |
| `ci-build-{N}`              | Artefatos de build CI  | ci-build-1847                 | Leve       |
| `deploy-{env}-{date}.{N}`   | Marcadores de deploy   | deploy-prod-2024.01.15.1      | Leve       |

Regras:
- Todas as releases de produção DEVEM usar tags anotadas com mensagens descritivas
- Pré-releases seguem a sintaxe de pré-release do SemVer
- Tags de CI/build podem ser leves (geradas automaticamente, alto volume)
- Nunca exclua ou mova uma tag de release publicada

### Tarefa 6: Tags automatizadas via pipeline de CI no merge para main

Crie um workflow do GitHub Actions que cria tags de releases automaticamente:

```yaml
# .github/workflows/auto-tag-release.yml
name: Auto-tag release on merge
on:
  push:
    branches: [main]

jobs:
  tag-release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Determine version bump from commit messages
        id: version
        run: |
          # Get the latest tag
          LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
          echo "latest_tag=$LATEST_TAG" >> "$GITHUB_OUTPUT"

          # Parse current version
          VERSION=${LATEST_TAG#v}
          IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

          # Determine bump type from conventional commit messages since last tag
          COMMITS=$(git log "$LATEST_TAG"..HEAD --pretty=format:"%s")

          if echo "$COMMITS" | grep -q "^BREAKING CHANGE\|^.*!:"; then
            MAJOR=$((MAJOR + 1))
            MINOR=0
            PATCH=0
          elif echo "$COMMITS" | grep -q "^feat"; then
            MINOR=$((MINOR + 1))
            PATCH=0
          elif echo "$COMMITS" | grep -q "^fix"; then
            PATCH=$((PATCH + 1))
          else
            echo "skip=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          NEW_TAG="v${MAJOR}.${MINOR}.${PATCH}"
          echo "new_tag=$NEW_TAG" >> "$GITHUB_OUTPUT"
          echo "skip=false" >> "$GITHUB_OUTPUT"

      - name: Create annotated tag
        if: steps.version.outputs.skip == 'false'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          # Generate changelog from commits
          CHANGELOG=$(git log ${{ steps.version.outputs.latest_tag }}..HEAD \
            --pretty=format:"- %s (%h)" --no-merges)

          git tag -a "${{ steps.version.outputs.new_tag }}" \
            -m "Release ${{ steps.version.outputs.new_tag }}

          Changes since ${{ steps.version.outputs.latest_tag }}:
          $CHANGELOG"

          git push origin "${{ steps.version.outputs.new_tag }}"

      - name: Create GitHub release
        if: steps.version.outputs.skip == 'false'
        run: |
          gh release create "${{ steps.version.outputs.new_tag }}" \
            --title "Release ${{ steps.version.outputs.new_tag }}" \
            --generate-notes
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Tarefa equivalente no Azure Pipelines para criação automatizada de tags:

```yaml
# azure-pipelines.yml (tag on merge to main)
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - checkout: self
    fetchDepth: 0
    persistCredentials: true

  - script: |
      LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
      VERSION=${LATEST_TAG#v}
      IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"
      MINOR=$((MINOR + 1))
      PATCH=0
      NEW_TAG="v${MAJOR}.${MINOR}.${PATCH}"

      git config user.email "azure-pipelines@contoso.com"
      git config user.name "Azure Pipelines"
      git tag -a "$NEW_TAG" -m "Release $NEW_TAG (automated)"
      git push origin "$NEW_TAG"

      echo "##vso[task.setvariable variable=releaseTag]$NEW_TAG"
    displayName: 'Create release tag'
```

### Tarefa 7: Configurações do repositório

Configure as definições em nível de repositório para consistência:

```bash
# Set default branch to main
gh api repos/contoso/platform-monorepo --method PATCH \
  -f default_branch="main"

# Configure allowed merge strategies
gh api repos/contoso/platform-monorepo --method PATCH \
  --input - << 'EOF'
{
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": true,
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "PR_BODY",
  "delete_branch_on_merge": true,
  "allow_auto_merge": true,
  "allow_update_branch": true
}
EOF

# Enable vulnerability alerts and automated security fixes
gh api repos/contoso/platform-monorepo/vulnerability-alerts --method PUT
gh api repos/contoso/platform-monorepo/automated-security-fixes --method PUT

# Set repository topics for discoverability
gh repo edit contoso/platform-monorepo --add-topic "monorepo,contoso,platform,typescript"

# Configure repository visibility and features
gh api repos/contoso/platform-monorepo --method PATCH \
  --input - << 'EOF'
{
  "has_issues": true,
  "has_projects": true,
  "has_wiki": false,
  "has_discussions": true,
  "web_commit_signoff_required": true
}
EOF
```

## Exercícios de quebra e conserto

### Cenário 1: Estagiário faz push para o caminho de produção

Um estagiário fez alterações em `/deploy/prod/kubernetes.yaml` e fez push diretamente para uma branch de feature que foi então mesclada sem revisão adequada porque o arquivo CODEOWNERS não cobria os manifestos de deploy.

**Diagnóstico**:

```bash
# Find who changed the production config
git log --oneline --all -- deploy/prod/kubernetes.yaml

# Check if CODEOWNERS covers this path
cat .github/CODEOWNERS | grep -i deploy

# Verify branch protection requires CODEOWNERS review
gh api repos/contoso/platform-monorepo/branches/main/protection/required_pull_request_reviews \
  | jq '.require_code_owner_reviews'
```


<details>
<summary>Mostrar solução</summary>

**Correção**: Adicione o caminho de deploy ao CODEOWNERS e garanta que a revisão por code owner seja obrigatória:

```bash
# Add to CODEOWNERS
echo '/deploy/prod/ @contoso/platform-admins @contoso/sre-team' >> .github/CODEOWNERS
git add .github/CODEOWNERS
git commit -m "fix: add production deploy path to CODEOWNERS"
git push origin main

# Revert the intern's change
git revert <merge-commit-sha> --mainline 1
git push origin main
```

</details>

### Cenário 2: Tags estão inconsistentes e o CI não consegue determinar a versão mais recente

O comando `git describe` retorna resultados inesperados por causa da nomenclatura mista de tags:

```bash
# The problem: inconsistent tags break automation
git tag --list | head -20
# Output shows:
# 1.0.0          (no v prefix)
# V1.1.0         (uppercase V)
# v1.2.0         (correct)
# release-20231115
# v1.3
# 1.4.0-beta

# git describe picks wrong tag
git describe --tags
# Output: release-20231115-47-gabc1234 (wrong! not a semver tag)
```


<details>
<summary>Mostrar solução</summary>

**Correção**: Limpe as tags e configure o `git describe` para filtrar corretamente:

```bash
# Use glob pattern to only match semver tags
git describe --tags --match "v[0-9]*"

# Rename inconsistent tags (requires coordination with team)
# Delete old tag locally and remotely, create new one
git tag -a v1.0.0 $(git rev-list -n 1 1.0.0) -m "Release v1.0.0 (re-tagged)"
git tag -d 1.0.0
git push origin :refs/tags/1.0.0
git push origin v1.0.0

git tag -a v1.1.0 $(git rev-list -n 1 V1.1.0) -m "Release v1.1.0 (re-tagged)"
git tag -d V1.1.0
git push origin :refs/tags/V1.1.0
git push origin v1.1.0

# Add a tag protection rule to prevent non-compliant tags
gh api repos/contoso/platform-monorepo/rulesets --method POST --input - << 'EOF'
{
  "name": "Tag naming enforcement",
  "target": "tag",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["~ALL"],
      "exclude": ["refs/tags/v*"]
    }
  },
  "rules": [
    { "type": "creation" }
  ]
}
EOF
```

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: ": No GitHub, qual é a diferença entre os níveis de permissão \"Maintain\" e \"Write\"?",
    options: [
      "Maintain pode fazer merge de PRs; Write não pode",
      "Maintain pode gerenciar configurações do repositório; Write só pode fazer push de código e gerenciar issues/PRs",
      "Maintain pode fazer push para branches protegidas; Write não pode fazer push de forma alguma",
      "Não há diferença; são aliases para a mesma permissão"
    ],
    correctIndex: 1,
    explanation: "A função \"Maintain\" é projetada para gerentes de projeto/tech leads que precisam gerenciar o repositório (editar descrição, gerenciar tópicos, gerenciar limites de interação, gerenciar wikis) sem ter acesso total de administrador (não podem alterar visibilidade, excluir o repositório ou gerenciar acesso). \"Write\" permite fazer push de código, gerenciar issues e PRs, mas não permite gerenciamento de configurações do repositório."
  },
  {
    question: ": Qual é a diferença principal entre uma tag Git anotada e uma tag leve?",
    options: [
      "Tags anotadas podem ser enviadas para o remote; tags leves não podem",
      "Tags anotadas são armazenadas como objetos completos com metadados (tagger, data, mensagem); tags leves são apenas ponteiros para um commit",
      "Tags anotadas são criptografadas; tags leves são texto simples",
      "Tags anotadas requerem uma chave GPG; tags leves não requerem"
    ],
    correctIndex: 1,
    explanation: "Tags anotadas (git tag -a) criam um objeto Git completo que armazena o nome do tagger, email, data e uma mensagem. Elas podem ser assinadas com GPG e aparecem no git describe. Tags leves (git tag sem -a) são simplesmente uma referência apontando para um commit sem metadados adicionais. Tags anotadas são recomendadas para releases; tags leves para marcadores temporários ou privados."
  },
  {
    question: ": No Azure DevOps, como você restringe um grupo específico de modificar arquivos em um caminho particular dentro de um repositório?",
    options: [
      "Criar uma entrada .gitignore para o caminho",
      "Usar segurança em nível de caminho com o namespace de segurança Git Repositories e tokens com escopo de caminho",
      "Criar um repositório separado para os arquivos protegidos",
      "Usar políticas de branch com exclusões de padrão de arquivo"
    ],
    correctIndex: 1,
    explanation: "O Azure DevOps suporta permissões em nível de caminho através do seu sistema de namespace de segurança. Usando o namespace Git Repositories (2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87) com tokens de segurança com escopo de caminho (formato: repoV2/project-id/repo-id/refs/heads/branch//path), você pode negar acesso de escrita a grupos específicos em caminhos específicos enquanto permite acesso em outros locais do repositório."
  },
  {
    question: ": Um pipeline de CI usa 'git describe --tags' para determinar a versão da aplicação. O comando retorna 'v1.2.0-47-g2414721'. O que essa saída significa?",
    options: [
      "A versão 1.2.0 foi lançada há 47 dias no commit 2414721",
      "O commit atual está 47 commits à frente da tag 'v1.2.0', e o SHA curto atual é 2414721",
      "Existem 47 arquivos alterados desde v1.2.0 no grupo de commits 2414721",
      "O número do build é 47 com um prefixo de hash Git de 2414721"
    ],
    correctIndex: 1,
    explanation: "O formato de saída do git describe é {tag}-{commits-à-frente}-g{sha-curto}. O prefixo g significa \"git\" e precede o hash abreviado do commit. Essa saída indica: a tag alcançável mais recente é v1.2.0, o HEAD atual está 47 commits após essa tag, e o SHA curto do commit atual começa com 2414721. Se o HEAD estiver exatamente em uma tag, a saída é apenas o nome da tag (por exemplo, v1.2.0)."
  }
]} />

## Limpeza

```bash
# Remove teams created during this challenge
gh api orgs/contoso/teams/platform-admins --method DELETE
gh api orgs/contoso/teams/tech-leads --method DELETE
gh api orgs/contoso/teams/senior-developers --method DELETE
gh api orgs/contoso/teams/junior-developers --method DELETE
gh api orgs/contoso/teams/stakeholders --method DELETE
gh api orgs/contoso/teams/engineering --method DELETE

# Delete practice tags
git tag -d v1.2.0 v1.1.5 v2.0.0 v2.1.0 v2.1.1 2>/dev/null
git tag -d v2.2.0-alpha.1 v2.2.0-beta.1 v2.2.0-rc.1 2>/dev/null
git tag -d release-2024.01.15 ci-build-1847 2>/dev/null
git push origin --delete v1.2.0 v1.1.5 v2.0.0 2>/dev/null

# Remove workflow files
rm -f .github/workflows/auto-tag-release.yml

# Reset repository settings to defaults
gh api repos/contoso/platform-monorepo --method PATCH \
  --input - << 'EOF'
{
  "allow_squash_merge": true,
  "allow_merge_commit": true,
  "allow_rebase_merge": true,
  "delete_branch_on_merge": false
}
EOF

# Verify clean state
git tag --list
gh api repos/contoso/platform-monorepo/teams | jq '.[].name'
```
