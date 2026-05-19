---
sidebar_position: 6
title: 'Desafio 12: Mono-repo vs multi-repo'
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 12: Mono-repo vs multi-repo

:::info Platform: comparison
:::

## Habilidades do exame

- Projetar uma estratégia para escalar e otimizar um repositório Git, incluindo Scalar e compartilhamento entre repositórios

## Cenário

A Contoso Ltd opera 15 microsserviços que compõem sua plataforma de e-commerce: user-service, catalog-service, order-service, payment-service, shipping-service, notification-service, search-service, analytics-service, auth-service, inventory-service, review-service, recommendation-service, admin-portal, customer-portal e shared-libs. Algumas equipes defendem o mono-repo (refatoração entre serviços mais fácil, pipeline de CI único, alterações atômicas). Outras querem repositórios separados (propriedade clara, deploys independentes, tamanhos de clone menores). O repositório cresceu para 8GB com 5 anos de histórico e 50.000 commits. O tempo de clone é de 25 minutos. O CTO quer uma recomendação baseada em dados com detalhes de implementação para qualquer abordagem escolhida.

## Tarefas

### Tarefa 1: Vantagens e desvantagens do mono-repo

Documente os trade-offs para a situação específica da Contoso:

#### Análise de mono-repo para a plataforma de e-commerce da Contoso

**Vantagens:**
- Alterações atômicas entre serviços (renomear um tipo compartilhado, atualizar todos os 15 serviços em um único commit)
- Fonte única de verdade para bibliotecas compartilhadas (sem divergência de versão entre serviços)
- Configuração unificada de pipeline de CI/CD
- Descoberta de código mais fácil e colaboração entre equipes
- Ferramentas e linting consistentes em todos os serviços
- Gerenciamento simplificado de dependências (todos os serviços usam as mesmas versões)
- Refatoração entre fronteiras de serviços é simples

**Desvantagens:**
- Tamanho do repositório (8GB) torna o clone lento (25 min)
- Todos os 50 desenvolvedores acionam o CI a cada push (sem filtro por caminho)
- Granularidade de permissões é limitada (mais difícil restringir acesso por serviço)
- Ponto único de falha (indisponibilidade do repo afeta todas as equipes)
- Conflitos de merge em arquivos compartilhados (package.json, configuração de CI)
- Operações Git ficam lentas à medida que o histórico cresce
- Todas as equipes devem concordar com a estratégia de branching

Exemplo de estrutura de mono-repo:

```
contoso-platform/
├── services/
│   ├── user-service/
│   │   ├── src/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── order-service/
│   │   ├── src/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── payment-service/
│       └── ...
├── libs/
│   ├── shared-types/
│   ├── common-utils/
│   └── auth-middleware/
├── infrastructure/
│   ├── terraform/
│   └── kubernetes/
├── tools/
│   ├── scripts/
│   └── generators/
├── .github/workflows/
├── package.json (workspace root)
└── nx.json (or turborepo.json)
```

### Tarefa 2: Vantagens e desvantagens do multi-repo

#### Análise de multi-repo para a plataforma de e-commerce da Contoso

**Vantagens:**
- Fronteiras claras de propriedade (cada equipe possui seu repo)
- Ciclos de release e versionamento independentes
- Controle de acesso granular por repositório
- Repositórios menores são rápidos para clonar e operar
- Equipes podem escolher suas próprias ferramentas e linguagens
- Falhas são isoladas (problemas de CI de um repo não bloqueiam outros)
- Escala bem com o crescimento organizacional

**Desvantagens:**
- Alterações entre serviços exigem PRs coordenados entre repos
- Versionamento de bibliotecas compartilhadas cria problemas de dependência diamante
- Ferramentas e práticas inconsistentes entre repos
- Descoberta é mais difícil (onde esse serviço está?)
- Testes de integração exigem checkout de múltiplos repos
- Atualizações de dependências devem ser propagadas em cada repo separadamente
- Refatoração entre fronteiras de serviços é dolorosa

Exemplo de estrutura multi-repo:

```
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

### Tarefa 3: Implementar Scalar para otimização de repositórios grandes

Scalar (mantido pela Microsoft, integrado ao Git desde a versão 2.38) otimiza o desempenho de repositórios grandes:

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

Permita que desenvolvedores trabalhem apenas no serviço de sua equipe dentro do mono-repo:

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

Crie perfis de sparse-checkout específicos por equipe:

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

### Tarefa 5: Git submodules para dependências entre repositórios

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

### Tarefa 6: Checkout de múltiplos repositórios no Azure DevOps Pipelines

Configure o Azure Pipelines para fazer checkout de múltiplos repositórios:

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

### Tarefa 7: Checkout de múltiplos repositórios no GitHub Actions

Configure o GitHub Actions para trabalhar com múltiplos repositórios:

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

### Tarefa 8: Otimização de build com triggers por caminho

Construa e teste apenas os serviços que realmente mudaram:

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

## Exercícios de quebra e conserto

### Cenário 1: Sparse-checkout está sem arquivos necessários para o build

Um desenvolvedor configurou sparse-checkout apenas para `services/order-service`, mas o build falha porque importa de `libs/shared-types` que não foi incluído no checkout.

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
<summary>Mostrar solução</summary>

**Correção**: Adicione os caminhos de dependência faltantes ao sparse-checkout:

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

### Cenário 2: Submodule está preso em commit antigo após pull

Após executar `git pull`, o diretório do submodule ainda mostra a versão antiga mesmo que `.gitmodules` tenha sido atualizado.

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
<summary>Mostrar solução</summary>

**Correção**: Atualize o submodule para corresponder ao que o repositório pai espera:

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

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: ": A Contoso tem um mono-repo com 15 microsserviços. Um desenvolvedor trabalha apenas no order-service e precisa clonar o repo rapidamente. Qual combinação de recursos do Git fornece o clone mais rápido com uso mínimo de disco?",
    options: [
      "'git clone --depth=1' (shallow clone)",
      "'git clone --filter=blob:none --sparse' seguido de 'git sparse-checkout set services/order-service'",
      "'git clone' seguido de exclusão dos diretórios indesejados",
      "'git clone --single-branch --branch=main'"
    ],
    correctIndex: 1,
    explanation: "Essa combinação usa partial clone (--filter=blob:none) para evitar o download de objetos blob até que sejam necessários, e sparse-checkout para materializar apenas os arquivos dos caminhos especificados. Juntos, minimizam tanto a transferência de rede quanto o uso de disco. O desenvolvedor obtém o histórico completo de commits (para blame, log, etc.) mas só baixa o conteúdo de arquivos para os caminhos necessários. Shallow clone (opção A) limita a profundidade do histórico mas ainda baixa todos os arquivos. A opção D ainda baixa todos os blobs de todos os caminhos."
  },
  {
    question: ": O que o comando 'scalar register' do Scalar habilita para um repositório Git?",
    options: [
      "Faz upload do repositório para um servidor Scalar centralizado para cache",
      "Habilita um conjunto de otimizações de desempenho do Git incluindo FSMonitor, commit-graph, multi-pack index e manutenção em segundo plano",
      "Converte o repositório para um novo formato específico do Scalar incompatível com o Git padrão",
      "Habilita filtragem de partial clone no lado do servidor para todos os clones deste repositório"
    ],
    correctIndex: 1,
    explanation: "scalar register configura o repositório local com otimizações de desempenho que fazem parte do Git padrão mas não são habilitadas por padrão. Estas incluem: FSMonitor (observador de sistema de arquivos para git status mais rápido), commit-graph (grafo pré-computado para log/travessia mais rápidos), multi-pack index (consultas de objetos mais rápidas) e tarefas de manutenção em segundo plano agendadas (prefetch, atualizações de commit-graph, limpeza de objetos soltos, repack incremental). O repositório continua sendo um repositório Git padrão acessível por qualquer cliente Git."
  },
  {
    question: ": Em uma configuração multi-repo, a equipe A atualiza 'shared-libs' v2.3.0 para v2.4.0 com uma breaking change. Qual é o principal desafio que isso cria?",
    options: [
      "Todos os outros repos atualizam automaticamente e podem quebrar",
      "Cada repo consumidor deve atualizar independentemente sua dependência, testar e lançar, criando sobrecarga de coordenação e risco de divergência de versão",
      "Git submodules impedem qualquer repo de usar a nova versão",
      "O repo shared-libs deve ser forked para cada equipe consumidora"
    ],
    correctIndex: 1,
    explanation: "Em uma configuração multi-repo, atualizar uma dependência compartilhada requer que cada repositório consumidor atualize explicitamente sua referência (ponteiro de submodule, versão do pacote, etc.), execute seus próprios testes e faça deploy. Isso cria sobrecarga de coordenação, especialmente com breaking changes. Alguns repos podem permanecer na v2.3.0 enquanto outros migram para v2.4.0, criando divergência de versão. Em um mono-repo, a breaking change e todas as atualizações aos consumidores acontecem em um único commit atômico."
  },
  {
    question: ": Um arquivo YAML do Azure Pipelines usa 'trigger.paths.include' para construir apenas quando caminhos específicos mudam. Um desenvolvedor modifica 'libs/shared-types/index.ts'. Qual comportamento do pipeline está correto?",
    options: [
      "Todos os pipelines são acionados porque qualquer alteração de arquivo aciona todos os pipelines por padrão",
      "Apenas pipelines cujo 'paths.include' corresponde a 'libs/shared-types/**' serão acionados",
      "Nenhum pipeline é acionado porque alterações em bibliotecas são excluídas por padrão",
      "O pipeline é acionado mas pula a etapa de build e executa apenas os testes"
    ],
    correctIndex: 1,
    explanation: "Os triggers por caminho do Azure Pipelines filtram quais pushes ativam um pipeline. Quando trigger.paths.include está configurado, o pipeline só executa se pelo menos um arquivo alterado corresponder aos padrões de inclusão. Uma alteração em libs/shared-types/index.ts só aciona pipelines que incluem libs/shared-types/ ou libs/ em seu filtro de caminho. Outros pipelines (por exemplo, aqueles que só observam services/user-service/) não serão acionados. É assim que mono-repos alcançam eficiência de CI por serviço."
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
