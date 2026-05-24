---
sidebar_position: 6
title: 'Desafio 12: Mono-repo vs multi-repo'
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 12: Mono-repo vs multi-repo

:::info Platform: comparison
:::

## Habilidades do exame

- Projetar uma estratÃ©gia para escalar e otimizar um repositÃ³rio Git, incluindo Scalar e compartilhamento entre repositÃ³rios

## CenÃ¡rio

A Contoso Ltd opera 15 microsserviÃ§os que compÃµem sua plataforma de e-commerce: user-service, catalog-service, order-service, payment-service, shipping-service, notification-service, search-service, analytics-service, auth-service, inventory-service, review-service, recommendation-service, admin-portal, customer-portal e shared-libs. Algumas equipes defendem o mono-repo (refatoraÃ§Ã£o entre serviÃ§os mais fÃ¡cil, pipeline de CI Ãºnico, alteraÃ§Ãµes atÃ´micas). Outras querem repositÃ³rios separados (propriedade clara, deploys independentes, tamanhos de clone menores). O repositÃ³rio cresceu para 8GB com 5 anos de histÃ³rico e 50.000 commits. O tempo de clone Ã© de 25 minutos. O CTO quer uma recomendaÃ§Ã£o baseada em dados com detalhes de implementaÃ§Ã£o para qualquer abordagem escolhida.

## Tarefas

### Tarefa 1: Vantagens e desvantagens do mono-repo

Documente os trade-offs para a situaÃ§Ã£o especÃ­fica da Contoso:

#### AnÃ¡lise de mono-repo para a plataforma de e-commerce da Contoso

**Vantagens:**
- AlteraÃ§Ãµes atÃ´micas entre serviÃ§os (renomear um tipo compartilhado, atualizar todos os 15 serviÃ§os em um Ãºnico commit)
- Fonte Ãºnica de verdade para bibliotecas compartilhadas (sem divergÃªncia de versÃ£o entre serviÃ§os)
- ConfiguraÃ§Ã£o unificada de pipeline de CI/CD
- Descoberta de cÃ³digo mais fÃ¡cil e colaboraÃ§Ã£o entre equipes
- Ferramentas e linting consistentes em todos os serviÃ§os
- Gerenciamento simplificado de dependÃªncias (todos os serviÃ§os usam as mesmas versÃµes)
- RefatoraÃ§Ã£o entre fronteiras de serviÃ§os Ã© simples

**Desvantagens:**
- Tamanho do repositÃ³rio (8GB) torna o clone lento (25 min)
- Todos os 50 desenvolvedores acionam o CI a cada push (sem filtro por caminho)
- Granularidade de permissÃµes Ã© limitada (mais difÃ­cil restringir acesso por serviÃ§o)
- Ponto Ãºnico de falha (indisponibilidade do repo afeta todas as equipes)
- Conflitos de merge em arquivos compartilhados (package.json, configuraÃ§Ã£o de CI)
- OperaÃ§Ãµes Git ficam lentas Ã  medida que o histÃ³rico cresce
- Todas as equipes devem concordar com a estratÃ©gia de branching

Exemplo de estrutura de mono-repo:

```text
contoso-platform/
â”œâ”€â”€ services/
â”‚   â”œâ”€â”€ user-service/
â”‚   â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ tests/
â”‚   â”‚   â”œâ”€â”€ Dockerfile
â”‚   â”‚   â””â”€â”€ package.json
â”‚   â”œâ”€â”€ order-service/
â”‚   â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ tests/
â”‚   â”‚   â”œâ”€â”€ Dockerfile
â”‚   â”‚   â””â”€â”€ package.json
â”‚   â””â”€â”€ payment-service/
â”‚       â””â”€â”€ ...
â”œâ”€â”€ libs/
â”‚   â”œâ”€â”€ shared-types/
â”‚   â”œâ”€â”€ common-utils/
â”‚   â””â”€â”€ auth-middleware/
â”œâ”€â”€ infrastructure/
â”‚   â”œâ”€â”€ terraform/
â”‚   â””â”€â”€ kubernetes/
â”œâ”€â”€ tools/
â”‚   â”œâ”€â”€ scripts/
â”‚   â””â”€â”€ generators/
â”œâ”€â”€ .github/workflows/
â”œâ”€â”€ package.json (workspace root)
â””â”€â”€ nx.json (or turborepo.json)
```

### Tarefa 2: Vantagens e desvantagens do multi-repo

#### AnÃ¡lise de multi-repo para a plataforma de e-commerce da Contoso

**Vantagens:**
- Fronteiras claras de propriedade (cada equipe possui seu repo)
- Ciclos de release e versionamento independentes
- Controle de acesso granular por repositÃ³rio
- RepositÃ³rios menores sÃ£o rÃ¡pidos para clonar e operar
- Equipes podem escolher suas prÃ³prias ferramentas e linguagens
- Falhas sÃ£o isoladas (problemas de CI de um repo nÃ£o bloqueiam outros)
- Escala bem com o crescimento organizacional

**Desvantagens:**
- AlteraÃ§Ãµes entre serviÃ§os exigem PRs coordenados entre repos
- Versionamento de bibliotecas compartilhadas cria problemas de dependÃªncia diamante
- Ferramentas e prÃ¡ticas inconsistentes entre repos
- Descoberta Ã© mais difÃ­cil (onde esse serviÃ§o estÃ¡?)
- Testes de integraÃ§Ã£o exigem checkout de mÃºltiplos repos
- AtualizaÃ§Ãµes de dependÃªncias devem ser propagadas em cada repo separadamente
- RefatoraÃ§Ã£o entre fronteiras de serviÃ§os Ã© dolorosa

Exemplo de estrutura multi-repo:

```text
# GitHub organization: contoso
contoso/user-service          (team: identity)
contoso/catalog-service       (team: catalog)
contoso/order-service         (team: commerce)
contoso/payment-service       (team: commerce)
contoso/shipping-service      (team: fulfillment)
contoso/notification-service  (team: platform)
contoso/search-service        (team: catalog)
contoso/analytics-service     (team: data)
contoso/auth-service          (team: identity)
contoso/inventory-service     (team: fulfillment)
contoso/review-service        (team: catalog)
contoso/recommendation-service (team: data)
contoso/admin-portal          (team: platform)
contoso/customer-portal       (team: frontend)
contoso/shared-libs           (team: platform)
```

### Tarefa 3: Implementar Scalar para otimizaÃ§Ã£o de repositÃ³rios grandes

Scalar (mantido pela Microsoft, integrado ao Git desde a versÃ£o 2.38) otimiza o desempenho de repositÃ³rios grandes:

```bash
# Register the repository with Scalar (enables all optimizations)
scalar register

# What Scalar enables:
# - Partial clone (only download needed objects)
# - Filesystem monitor (FSMonitor for faster git status)
# - Commit-graph (faster git log and traversal)
# - Multi-pack index (faster object lookups)
# - Background maintenance (prefetch, gc, commit-graph updates)

# Clone a large repo with Scalar (partial clone + sparse checkout)
scalar clone https://github.com/contoso/platform-monorepo.git
cd platform-monorepo

# Verify Scalar configuration
scalar list
# Output: C:/repos/platform-monorepo

# Check what optimizations are active
git config --list | grep -E "(core.fsmonitor|core.multipackindex|fetch.writeCommitGraph|maintenance)"
# Output:
# core.fsmonitor=true
# core.multipackindex=true
# fetch.writecommitgraph=true
# maintenance.auto=false
# maintenance.strategy=incremental

# View scheduled maintenance tasks
scalar run
# Runs: prefetch, commit-graph, loose-objects, incremental-repack

# Manual Scalar commands
scalar diagnose    # Generate diagnostic zip for troubleshooting
scalar cache-server --set https://cache.contoso.internal  # Use a cache server
scalar unregister  # Remove Scalar from this repo
```

Configure o Scalar para runners de CI:

```yaml
# .github/workflows/ci-with-scalar.yml
name: CI with Scalar optimization
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Scalar clone (partial + sparse)
        run: |
          scalar clone https://github.com/contoso/platform-monorepo.git repo
          cd repo
          # Only fetch objects needed for the changed service
          git sparse-checkout set services/order-service libs/shared-types
```

### Tarefa 4: Configurar sparse-checkout para acesso a subconjunto do mono-repo

Permita que desenvolvedores trabalhem apenas no serviÃ§o de sua equipe dentro do mono-repo:

```bash
# Initialize sparse-checkout in cone mode (faster than pattern mode)
git sparse-checkout init --cone

# Only check out the order-service and shared libraries
git sparse-checkout set services/order-service libs/shared-types libs/common-utils

# View what's included
git sparse-checkout list
# Output:
# services/order-service
# libs/shared-types
# libs/common-utils

# The working directory now only shows those paths:
ls services/
# Output: order-service/

# Add another service temporarily (e.g., for cross-service debugging)
git sparse-checkout add services/payment-service

# Remove a path from sparse checkout
git sparse-checkout set services/order-service libs/shared-types
# (payment-service files disappear from working directory)

# Disable sparse-checkout (get everything back)
git sparse-checkout disable

# Combine with partial clone for maximum speed
git clone --filter=blob:none --sparse https://github.com/contoso/platform-monorepo.git
cd platform-monorepo
git sparse-checkout set services/user-service libs/auth-middleware
# Only downloads blobs for the sparse paths (not entire repo history)
```

Crie perfis de sparse-checkout especÃ­ficos por equipe:

```bash
# scripts/sparse-profiles/commerce-team.sh
#!/bin/bash
git sparse-checkout set \
  services/order-service \
  services/payment-service \
  services/inventory-service \
  libs/shared-types \
  libs/common-utils \
  infrastructure/kubernetes/order-service \
  infrastructure/kubernetes/payment-service

# scripts/sparse-profiles/frontend-team.sh
#!/bin/bash
git sparse-checkout set \
  services/customer-portal \
  services/admin-portal \
  libs/shared-types \
  libs/ui-components

# scripts/sparse-profiles/data-team.sh
#!/bin/bash
git sparse-checkout set \
  services/analytics-service \
  services/recommendation-service \
  libs/shared-types \
  libs/data-utils \
  infrastructure/terraform/analytics
```

### Tarefa 5: Git submodules para dependÃªncias entre repositÃ³rios

Configure submodules ao usar multi-repo para compartilhar bibliotecas comuns:

```bash
# Add shared-libs as a submodule in the order-service repo
cd order-service
git submodule add https://github.com/contoso/shared-libs.git libs/shared
git commit -m "chore: add shared-libs as submodule"

# The .gitmodules file tracks submodule configuration
cat .gitmodules
# [submodule "libs/shared"]
#     path = libs/shared
#     url = https://github.com/contoso/shared-libs.git
#     branch = main

# Pin to a specific version/tag of shared-libs
cd libs/shared
git checkout v2.3.0
cd ..
git add libs/shared
git commit -m "chore: pin shared-libs to v2.3.0"

# Clone a repo with submodules
git clone --recurse-submodules https://github.com/contoso/order-service.git

# If already cloned without submodules, initialize them
git submodule init
git submodule update

# Update submodule to latest commit on its tracked branch
git submodule update --remote libs/shared
git add libs/shared
git commit -m "chore: update shared-libs to latest"

# Update all submodules
git submodule update --remote --merge

# Run a command in all submodules
git submodule foreach 'git checkout main && git pull'

# Remove a submodule
git submodule deinit libs/shared
git rm libs/shared
rm -rf .git/modules/libs/shared
git commit -m "chore: remove shared-libs submodule"
```

### Tarefa 6: Checkout de mÃºltiplos repositÃ³rios no Azure DevOps Pipelines

Configure o Azure Pipelines para fazer checkout de mÃºltiplos repositÃ³rios:

```yaml
# azure-pipelines.yml - Multi-repo checkout
trigger:
  branches:
    include:
      - main

resources:
  repositories:
    - repository: shared-libs
      type: git
      name: Contoso-Platform/shared-libs
      ref: refs/tags/v2.3.0
    - repository: infrastructure
      type: git
      name: Contoso-Platform/infrastructure
      ref: refs/heads/main
    - repository: order-service
      type: github
      name: contoso/order-service
      endpoint: github-service-connection

pool:
  vmImage: 'ubuntu-latest'

steps:
  # Check out the primary repo (self)
  - checkout: self
    path: s/payment-service
    fetchDepth: 1

  # Check out additional repos
  - checkout: shared-libs
    path: s/shared-libs
    fetchDepth: 1

  - checkout: infrastructure
    path: s/infrastructure
    fetchDepth: 1

  - script: |
      echo "Directory structure:"
      ls -la $(Pipeline.Workspace)/s/
      # Output:
      # payment-service/
      # shared-libs/
      # infrastructure/
    displayName: 'Verify multi-repo checkout'

  - script: |
      cd $(Pipeline.Workspace)/s/payment-service
      npm ci
      # Reference shared libs from adjacent checkout
      npm link ../shared-libs
      npm run build
      npm test
    displayName: 'Build with shared dependencies'

  - script: |
      cd $(Pipeline.Workspace)/s/infrastructure
      terraform init
      terraform plan -var-file=environments/prod.tfvars
    displayName: 'Validate infrastructure'
```

### Tarefa 7: Checkout de mÃºltiplos repositÃ³rios no GitHub Actions

Configure o GitHub Actions para trabalhar com mÃºltiplos repositÃ³rios:

```yaml
# .github/workflows/ci-multi-repo.yml
name: CI with multi-repo dependencies
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Check out the primary repo
      - uses: actions/checkout@v4
        with:
          path: order-service

      # Check out shared libraries (public repo)
      - uses: actions/checkout@v4
        with:
          repository: contoso/shared-libs
          ref: v2.3.0
          path: shared-libs

      # Check out private repo (requires PAT or GitHub App token)
      - uses: actions/checkout@v4
        with:
          repository: contoso/infrastructure
          token: ${{ secrets.CROSS_REPO_TOKEN }}
          path: infrastructure

      - name: Build with dependencies
        working-directory: order-service
        run: |
          npm ci
          # Create symlink to shared libs
          ln -s ../shared-libs/packages/common ./node_modules/@contoso/common
          npm run build

      - name: Run integration tests
        run: |
          cd order-service
          npm run test:integration -- --config ../infrastructure/test-config.json
```

### Tarefa 8: OtimizaÃ§Ã£o de build com triggers por caminho

Construa e teste apenas os serviÃ§os que realmente mudaram:

```yaml
# .github/workflows/ci-path-triggers.yml
name: Mono-repo path-based CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      order-service: ${{ steps.changes.outputs.order-service }}
      payment-service: ${{ steps.changes.outputs.payment-service }}
      shared-libs: ${{ steps.changes.outputs.shared-libs }}
      user-service: ${{ steps.changes.outputs.user-service }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: changes
        with:
          filters: |
            order-service:
              - 'services/order-service/**'
              - 'libs/shared-types/**'
              - 'libs/common-utils/**'
            payment-service:
              - 'services/payment-service/**'
              - 'libs/shared-types/**'
            shared-libs:
              - 'libs/**'
            user-service:
              - 'services/user-service/**'
              - 'libs/auth-middleware/**'

  build-order-service:
    needs: detect-changes
    if: needs.detect-changes.outputs.order-service == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          sparse-checkout: |
            services/order-service
            libs/shared-types
            libs/common-utils
      - name: Build order-service
        working-directory: services/order-service
        run: |
          npm ci
          npm run build
          npm test

  build-payment-service:
    needs: detect-changes
    if: needs.detect-changes.outputs.payment-service == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          sparse-checkout: |
            services/payment-service
            libs/shared-types
      - name: Build payment-service
        working-directory: services/payment-service
        run: |
          npm ci
          npm run build
          npm test

  # If shared libs change, rebuild ALL dependent services
  build-all-on-shared-change:
    needs: detect-changes
    if: needs.detect-changes.outputs.shared-libs == 'true'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service:
          - order-service
          - payment-service
          - user-service
          - catalog-service
          - shipping-service
    steps:
      - uses: actions/checkout@v4
      - name: Build ${{ matrix.service }}
        working-directory: services/${{ matrix.service }}
        run: |
          npm ci
          npm run build
          npm test
```

Equivalente no Azure Pipelines com triggers por caminho:

```yaml
# azure-pipelines.yml - Path-based triggers
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - services/order-service/**
      - libs/shared-types/**

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'

  - script: |
      cd services/order-service
      npm ci
      npm run build
      npm test
    displayName: 'Build and test order-service'
```

## ExercÃ­cios de quebra e conserto

### CenÃ¡rio 1: Sparse-checkout estÃ¡ sem arquivos necessÃ¡rios para o build

Um desenvolvedor configurou sparse-checkout apenas para `services/order-service`, mas o build falha porque importa de `libs/shared-types` que nÃ£o foi incluÃ­do no checkout.

```bash
# Error during build:
npm run build
# ERROR: Cannot find module '@contoso/shared-types'
# Module not found: libs/shared-types/index.ts

# Check what's currently included
git sparse-checkout list
# Output: services/order-service (missing libs!)
```


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o**: Adicione os caminhos de dependÃªncia faltantes ao sparse-checkout:

```bash
# Add the shared library paths
git sparse-checkout add libs/shared-types libs/common-utils

# Verify the files are now available
ls libs/shared-types/
# Output: index.ts  package.json  src/  ...

# Re-run the build
cd services/order-service
npm run build
# Success!

# Document dependencies in a sparse profile for the team
cat > .sparse-profiles/order-service.txt << 'EOF'
services/order-service
libs/shared-types
libs/common-utils
infrastructure/kubernetes/order-service
EOF
```

</details>

### CenÃ¡rio 2: Submodule estÃ¡ preso em commit antigo apÃ³s pull

ApÃ³s executar `git pull`, o diretÃ³rio do submodule ainda mostra a versÃ£o antiga mesmo que `.gitmodules` tenha sido atualizado.

```bash
# The submodule shows as modified but content is old
git status
# Output:
# modified: libs/shared (new commits)

git diff
# Shows submodule pointer changed but local copy is behind

# The submodule directory has the old code
cd libs/shared
git log --oneline -1
# abc1234 (HEAD) old commit from 2 weeks ago
```


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o**: Atualize o submodule para corresponder ao que o repositÃ³rio pai espera:

```bash
# Update submodule to the commit specified by the parent
cd ..
git submodule update --init --recursive

# Verify it's now at the correct commit
cd libs/shared
git log --oneline -1
# def5678 (HEAD) latest pinned commit

# If you want to update to the latest on the tracked branch instead:
cd ..
git submodule update --remote libs/shared
git add libs/shared
git commit -m "chore: update shared-libs submodule to latest"
```

</details>

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: ": A Contoso tem um mono-repo com 15 microsserviÃ§os. Um desenvolvedor trabalha apenas no order-service e precisa clonar o repo rapidamente. Qual combinaÃ§Ã£o de recursos do Git fornece o clone mais rÃ¡pido com uso mÃ­nimo de disco?",
    options: [
      "'git clone --depth=1' (shallow clone)",
      "'git clone --filter=blob:none --sparse' seguido de 'git sparse-checkout set services/order-service'",
      "'git clone' seguido de exclusÃ£o dos diretÃ³rios indesejados",
      "'git clone --single-branch --branch=main'"
    ],
    correctIndex: 1,
    explanation: "Essa combinaÃ§Ã£o usa partial clone (--filter=blob:none) para evitar o download de objetos blob atÃ© que sejam necessÃ¡rios, e sparse-checkout para materializar apenas os arquivos dos caminhos especificados. Juntos, minimizam tanto a transferÃªncia de rede quanto o uso de disco. O desenvolvedor obtÃ©m o histÃ³rico completo de commits (para blame, log, etc.) mas sÃ³ baixa o conteÃºdo de arquivos para os caminhos necessÃ¡rios. Shallow clone (opÃ§Ã£o A) limita a profundidade do histÃ³rico mas ainda baixa todos os arquivos. A opÃ§Ã£o D ainda baixa todos os blobs de todos os caminhos."
  },
  {
    question: ": O que o comando 'scalar register' do Scalar habilita para um repositÃ³rio Git?",
    options: [
      "Faz upload do repositÃ³rio para um servidor Scalar centralizado para cache",
      "Habilita um conjunto de otimizaÃ§Ãµes de desempenho do Git incluindo FSMonitor, commit-graph, multi-pack index e manutenÃ§Ã£o em segundo plano",
      "Converte o repositÃ³rio para um novo formato especÃ­fico do Scalar incompatÃ­vel com o Git padrÃ£o",
      "Habilita filtragem de partial clone no lado do servidor para todos os clones deste repositÃ³rio"
    ],
    correctIndex: 1,
    explanation: "scalar register configura o repositÃ³rio local com otimizaÃ§Ãµes de desempenho que fazem parte do Git padrÃ£o mas nÃ£o sÃ£o habilitadas por padrÃ£o. Estas incluem: FSMonitor (observador de sistema de arquivos para git status mais rÃ¡pido), commit-graph (grafo prÃ©-computado para log/travessia mais rÃ¡pidos), multi-pack index (consultas de objetos mais rÃ¡pidas) e tarefas de manutenÃ§Ã£o em segundo plano agendadas (prefetch, atualizaÃ§Ãµes de commit-graph, limpeza de objetos soltos, repack incremental). O repositÃ³rio continua sendo um repositÃ³rio Git padrÃ£o acessÃ­vel por qualquer cliente Git."
  },
  {
    question: ": Em uma configuraÃ§Ã£o multi-repo, a equipe A atualiza 'shared-libs' v2.3.0 para v2.4.0 com uma breaking change. Qual Ã© o principal desafio que isso cria?",
    options: [
      "Todos os outros repos atualizam automaticamente e podem quebrar",
      "Cada repo consumidor deve atualizar independentemente sua dependÃªncia, testar e lanÃ§ar, criando sobrecarga de coordenaÃ§Ã£o e risco de divergÃªncia de versÃ£o",
      "Git submodules impedem qualquer repo de usar a nova versÃ£o",
      "O repo shared-libs deve ser forked para cada equipe consumidora"
    ],
    correctIndex: 1,
    explanation: "Em uma configuraÃ§Ã£o multi-repo, atualizar uma dependÃªncia compartilhada requer que cada repositÃ³rio consumidor atualize explicitamente sua referÃªncia (ponteiro de submodule, versÃ£o do pacote, etc.), execute seus prÃ³prios testes e faÃ§a deploy. Isso cria sobrecarga de coordenaÃ§Ã£o, especialmente com breaking changes. Alguns repos podem permanecer na v2.3.0 enquanto outros migram para v2.4.0, criando divergÃªncia de versÃ£o. Em um mono-repo, a breaking change e todas as atualizaÃ§Ãµes aos consumidores acontecem em um Ãºnico commit atÃ´mico."
  },
  {
    question: ": Um arquivo YAML do Azure Pipelines usa 'trigger.paths.include' para construir apenas quando caminhos especÃ­ficos mudam. Um desenvolvedor modifica 'libs/shared-types/index.ts'. Qual comportamento do pipeline estÃ¡ correto?",
    options: [
      "Todos os pipelines sÃ£o acionados porque qualquer alteraÃ§Ã£o de arquivo aciona todos os pipelines por padrÃ£o",
      "Apenas pipelines cujo 'paths.include' corresponde a 'libs/shared-types/**' serÃ£o acionados",
      "Nenhum pipeline Ã© acionado porque alteraÃ§Ãµes em bibliotecas sÃ£o excluÃ­das por padrÃ£o",
      "O pipeline Ã© acionado mas pula a etapa de build e executa apenas os testes"
    ],
    correctIndex: 1,
    explanation: "Os triggers por caminho do Azure Pipelines filtram quais pushes ativam um pipeline. Quando trigger.paths.include estÃ¡ configurado, o pipeline sÃ³ executa se pelo menos um arquivo alterado corresponder aos padrÃµes de inclusÃ£o. Uma alteraÃ§Ã£o em libs/shared-types/index.ts sÃ³ aciona pipelines que incluem libs/shared-types/ ou libs/ em seu filtro de caminho. Outros pipelines (por exemplo, aqueles que sÃ³ observam services/user-service/) nÃ£o serÃ£o acionados. Ã‰ assim que mono-repos alcanÃ§am eficiÃªncia de CI por serviÃ§o."
  }
]} />

## Limpeza

```bash
# Remove Scalar registration
scalar unregister 2>/dev/null

# Reset sparse-checkout
git sparse-checkout disable 2>/dev/null

# Remove submodules added during testing
git submodule deinit --all -f 2>/dev/null
rm -rf .git/modules/* 2>/dev/null

# Remove test directories and files
rm -rf services/ libs/ infrastructure/ tools/ 2>/dev/null
rm -f .gitmodules nx.json turborepo.json 2>/dev/null
rm -rf .sparse-profiles/ 2>/dev/null

# Remove workflow files created during this challenge
rm -f .github/workflows/ci-path-triggers.yml
rm -f .github/workflows/ci-multi-repo.yml
rm -f .github/workflows/ci-with-scalar.yml

# Clean up any partial clone filter config
git config --unset remote.origin.promisor 2>/dev/null
git config --unset remote.origin.partialclonefilter 2>/dev/null

# Verify clean state
git status
git config --list | grep -E "(scalar|sparse|fsmonitor|multipack)"
```
