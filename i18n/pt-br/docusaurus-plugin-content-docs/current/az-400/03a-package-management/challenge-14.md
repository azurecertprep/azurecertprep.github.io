---
sidebar_position: 2
title: "Desafio 14: Estratégias de versionamento"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 14: Estratégias de versionamento

:::info Plataforma: ambas
Este desafio cobre estratégias de versionamento aplicáveis a pipelines tanto do GitHub quanto do Azure DevOps.
:::

## Habilidades do exame

- Projetar e implementar uma estratégia de versionamento de dependências para ativos de código e pacotes, incluindo versionamento semântico (SemVer) e baseado em data (CalVer)
- Projetar e implementar uma estratégia de versionamento para artefatos de pipeline

## Cenário

A Contoso tem versionamento inconsistente entre suas 15 equipes de microsserviços. A equipe de autenticação usa datas como `20240115`, a equipe de pagamentos usa números de build aleatórios e três equipes não versionam seus pacotes. Isso causa:

- Falhas de rollback porque as equipes não conseguem identificar qual versão está implantada
- Conflitos de dependência quando duas bibliotecas com alterações incompatíveis compartilham a mesma versão major
- Incapacidade de configurar políticas automatizadas de atualização de dependências
- Falhas de auditoria devido à linhagem de artefatos não rastreável

O VP de Engenharia exige uma estratégia unificada de versionamento em todas as equipes. Sua tarefa é projetá-la e implementá-la.

## Tarefas

### Tarefa 1: Implementar versionamento semântico (SemVer)

O versionamento semântico segue o formato `MAJOR.MINOR.PATCH` onde:
- **MAJOR** incrementa para alterações incompatíveis na API
- **MINOR** incrementa para nova funcionalidade compatível com versões anteriores
- **PATCH** incrementa para correções de bugs compatíveis com versões anteriores

#### Tags de pré-lançamento

Versões de pré-lançamento adicionam um hífen e identificadores após o número de patch:

```text
1.0.0-alpha.1
1.0.0-beta.3
1.0.0-rc.1
```

Ordem de precedência: `1.0.0-alpha.1 < 1.0.0-beta.1 < 1.0.0-rc.1 < 1.0.0`

#### Metadados de build

Metadados de build são adicionados com um sinal de mais e não afetam a precedência de versão:

```text
1.0.0+20240615
1.0.0-beta.1+build.42
```

#### Passo 1: Configurar SemVer para um pacote npm

Crie um pacote e defina sua versão inicial:

```bash
mkdir contoso-data-models && cd contoso-data-models
npm init -y
npm version 1.0.0
```

Incremente versões com base no tipo de alteração:

```bash
# Bug fix: 1.0.0 -> 1.0.1
npm version patch

# New feature (backward compatible): 1.0.1 -> 1.1.0
npm version minor

# Breaking change: 1.1.0 -> 2.0.0
npm version major

# Pre-release: 2.0.0 -> 2.1.0-beta.0
npm version preminor --preid=beta

# Increment pre-release: 2.1.0-beta.0 -> 2.1.0-beta.1
npm version prerelease
```

#### Passo 2: Configurar SemVer para um pacote NuGet

No arquivo `.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <PackageId>Contoso.DataModels</PackageId>
    <Version>1.0.0</Version>
    <PackageVersion>1.0.0</PackageVersion>
    <Authors>Contoso</Authors>
    <Description>Shared data models for Contoso microservices</Description>
  </PropertyGroup>
</Project>
```

Substitua a versão no momento do build:

```bash
dotnet pack --configuration Release /p:Version=1.2.0-beta.1
```

### Tarefa 2: Implementar versionamento por calendário (CalVer)

O CalVer usa componentes de data como identificadores de versão. Formatos comuns:

| Formato | Exemplo | Caso de uso |
|---------|---------|-------------|
| YYYY.MM.DD | 2024.06.15 | Lançamentos diários, deploys contínuos |
| YYYY.MM.MICRO | 2024.06.3 | Lançamentos mensais com contagem de patches |
| YYYY.MINOR.MICRO | 2024.2.1 | Major anual, minor incremental |

O CalVer funciona bem para:
- Aplicações (não bibliotecas) onde a compatibilidade de API não é a preocupação principal
- Produtos com trens de lançamento baseados em tempo (Ubuntu usa YY.MM: 24.04)
- Serviços internos onde "quando foi implantado" importa mais do que "o que mudou"

#### Passo 1: Gerar uma versão CalVer em um script shell

```bash
CALVER=$(date +%Y.%m.%d)
BUILD_NUMBER=${GITHUB_RUN_NUMBER:-0}
VERSION="${CALVER}.${BUILD_NUMBER}"
echo "Version: $VERSION"
# Output: Version: 2024.06.15.42
```

#### Passo 2: Usar CalVer em um Dockerfile

```dockerfile
ARG VERSION=0.0.0
FROM mcr.microsoft.com/dotnet/aspnet:8.0
LABEL version="${VERSION}"
COPY ./publish /app
WORKDIR /app
ENTRYPOINT ["dotnet", "Contoso.Api.dll"]
```

Build com a versão:

```bash
docker build --build-arg VERSION=$(date +%Y.%m.%d).$GITHUB_RUN_NUMBER -t contoso-api .
```

### Tarefa 3: Versionamento automático no GitHub Actions

#### Opção A: Versionamento baseado em tags Git

```yaml
name: Release with tag version
on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Extract version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF_NAME#v}" >> $GITHUB_OUTPUT

      - name: Build and publish
        run: |
          npm version ${{ steps.version.outputs.VERSION }} --no-git-tag-version
          npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Crie e envie uma tag para acionar:

```bash
git tag v1.2.0
git push origin v1.2.0
```

#### Opção B: GitVersion para cálculo automático de SemVer

O GitVersion analisa seu histórico git e modelo de branching para calcular automaticamente a próxima versão.

Instale o GitVersion como ferramenta .NET:

```bash
dotnet tool install --global GitVersion.Tool
```

Adicione uma configuração `GitVersion.yml`:

```yaml
mode: ContinuousDeployment
branches:
  main:
    regex: ^main$
    tag: ''
    increment: Patch
  feature:
    regex: ^feature/
    tag: alpha
    increment: Minor
  release:
    regex: ^release/
    tag: rc
    increment: None
  hotfix:
    regex: ^hotfix/
    tag: beta
    increment: Patch
```

Use o GitVersion em um workflow do GitHub Actions:

```yaml
name: Build with GitVersion
on:
  push:
    branches: [main, 'feature/**', 'release/**']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install GitVersion
        uses: gittools/actions/gitversion/setup@v1
        with:
          versionSpec: '5.x'

      - name: Determine version
        id: gitversion
        uses: gittools/actions/gitversion/execute@v1

      - name: Display version
        run: |
          echo "SemVer: ${{ steps.gitversion.outputs.semVer }}"
          echo "NuGetVersion: ${{ steps.gitversion.outputs.nuGetVersion }}"
          echo "InformationalVersion: ${{ steps.gitversion.outputs.informationalVersion }}"

      - name: Build with version
        run: dotnet pack /p:Version=${{ steps.gitversion.outputs.nuGetVersion }}
```

### Tarefa 4: Versionamento automático no Azure Pipelines

#### Opção A: Usando BuildId e variáveis de pipeline

```yaml
trigger:
  - main

variables:
  majorVersion: 1
  minorVersion: 3
  patchVersion: $[counter(format('{0}.{1}', variables['majorVersion'], variables['minorVersion']), 0)]
  packageVersion: $(majorVersion).$(minorVersion).$(patchVersion)

pool:
  vmImage: ubuntu-latest

steps:
  - task: DotNetCoreCLI@2
    displayName: 'Pack with version'
    inputs:
      command: pack
      packagesToPack: '**/*.csproj'
      versioningScheme: byEnvVar
      versionEnvVar: packageVersion

  - task: NuGetCommand@2
    displayName: 'Push to feed'
    inputs:
      command: push
      publishVstsFeed: contoso-packages
```

#### Opção B: Versionamento de pré-lançamento baseado em branch

```yaml
variables:
  ${{ if eq(variables['Build.SourceBranch'], 'refs/heads/main') }}:
    versionSuffix: ''
  ${{ elseif startsWith(variables['Build.SourceBranch'], 'refs/heads/feature/') }}:
    versionSuffix: '-alpha.$(Build.BuildId)'
  ${{ elseif startsWith(variables['Build.SourceBranch'], 'refs/heads/release/') }}:
    versionSuffix: '-rc.$(Build.BuildId)'
  ${{ else }}:
    versionSuffix: '-dev.$(Build.BuildId)'

steps:
  - script: |
      VERSION="1.2.0$(versionSuffix)"
      echo "##vso[build.updatebuildnumber]$VERSION"
      echo "##vso[task.setvariable variable=packageVersion]$VERSION"
    displayName: 'Calculate version'

  - script: dotnet pack /p:Version=$(packageVersion) --output $(Build.ArtifactStagingDirectory)
    displayName: 'Pack NuGet'

  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: $(Build.ArtifactStagingDirectory)
      artifactName: packages
```

### Tarefa 5: Estratégias de versionamento de artefatos de pipeline

Artefatos de pipeline (saídas de build, imagens de contêiner, Helm charts) requerem seu próprio versionamento:

#### Estratégia 1: Versão semântica a partir da fonte

Marque artefatos com o mesmo SemVer do pacote fonte:

```bash
# Container image tagged with SemVer
docker build -t contoso.azurecr.io/auth-service:1.2.0 .
docker tag contoso.azurecr.io/auth-service:1.2.0 contoso.azurecr.io/auth-service:latest
docker push contoso.azurecr.io/auth-service:1.2.0
docker push contoso.azurecr.io/auth-service:latest
```

#### Estratégia 2: BuildId para rastreabilidade

```yaml
steps:
  - script: |
      SHORT_SHA=$(echo $(Build.SourceVersion) | cut -c1-7)
      IMAGE_TAG="$(Build.BuildId)-${SHORT_SHA}"
      echo "##vso[task.setvariable variable=imageTag]$IMAGE_TAG"
    displayName: 'Generate image tag'

  - task: Docker@2
    inputs:
      containerRegistry: contoso-acr
      repository: auth-service
      command: buildAndPush
      tags: |
        $(imageTag)
        latest
```

#### Estratégia 3: Híbrida (SemVer + metadados de build)

```bash
VERSION="1.2.0+build.${GITHUB_RUN_NUMBER}.sha.${GITHUB_SHA:0:7}"
echo "Artifact version: $VERSION"
# Output: 1.2.0+build.42.sha.a1b2c3d
```

## Exercícios de quebra e conserto

### Cenário: Conflito de versão quando dois PRs são mergeados simultaneamente

Dois desenvolvedores fazem merge de PRs para a main com segundos de diferença. Ambos os pipelines calculam a próxima versão como `1.3.0` porque leram a mesma tag mais recente. O segundo `npm publish` falha:

```bash
npm ERR! 403 Forbidden - PUT https://npm.pkg.github.com/@contoso/data-models
npm ERR! You cannot publish over the previously published versions: 1.3.0
```

<details>
<summary>Mostrar solução</summary>

**Causa raiz**: Ambas as execuções de CI calcularam a versão a partir do mesmo estado git. Condições de corrida no versionamento baseado em tags ocorrem quando pipelines paralelos leem a mesma tag "mais recente" antes que qualquer um tenha enviado uma nova.

**Correção 1: Usar abordagem baseada em contador (Azure Pipelines)**

A expressão `counter()` do Azure Pipelines é atômica e previne duplicatas:

```yaml
variables:
  patchVersion: $[counter(format('{0}.{1}', variables['majorVersion'], variables['minorVersion']), 0)]
```

Cada execução de pipeline recebe um valor único e incremental independentemente do timing.

**Correção 2: Usar número de execução na tag de pré-lançamento (GitHub Actions)**

Inclua o `GITHUB_RUN_NUMBER` que é único por workflow:

```yaml
- name: Calculate version
  run: |
    LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
    BASE_VERSION=${LATEST_TAG#v}
    VERSION="${BASE_VERSION%.*}.$((${BASE_VERSION##*.} + 1))"
    echo "VERSION=$VERSION" >> $GITHUB_OUTPUT
```

**Correção 3: Retry com patch incrementado**

Adicione lógica de retry que detecta o 403 e incrementa:

```yaml
- name: Publish with retry
  run: |
    MAX_RETRIES=3
    ATTEMPT=0
    while [ $ATTEMPT -lt $MAX_RETRIES ]; do
      npm publish && break
      ATTEMPT=$((ATTEMPT + 1))
      CURRENT=$(node -p "require('./package.json').version")
      NEXT_PATCH=$((${CURRENT##*.} + 1))
      npm version "${CURRENT%.*}.$NEXT_PATCH" --no-git-tag-version
      echo "Retrying with version $(node -p "require('./package.json').version")"
    done
```

**Correção 4 (recomendada): Usar GitVersion com modo ContinuousDeployment**

O GitVersion no modo ContinuousDeployment adiciona a contagem de commits desde a última tag, garantindo unicidade:

```text
v1.3.0 tag on main
  -> commit A: 1.3.1-ci.1
  -> commit B: 1.3.1-ci.2  (always unique)
```

Isso evita a condição de corrida completamente porque cada commit produz uma versão distinta.

</details>

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "De acordo com o SemVer, qual versão tem a maior precedência?",
    options: [
      "1.0.0-alpha",
      "1.0.0-beta.2",
      "1.0.0-rc.1",
      "1.0.0"
    ],
    correctIndex: 3,
    explanation: "Uma versão de lançamento sempre tem precedência maior do que qualquer versão de pré-lançamento com o mesmo MAJOR.MINOR.PATCH. Versões de pré-lançamento indicam instabilidade. A ordem é: alpha < beta < rc < release."
  },
  {
    question: "Uma equipe lança seu API gateway interno mensalmente e quer que a versão comunique \"quando\" em vez de \"o que mudou\". Qual estratégia devem usar?",
    options: [
      "SemVer com tags de pré-lançamento",
      "CalVer com formato YYYY.MM",
      "Números de build auto-incrementais",
      "SHA do commit Git como versão"
    ],
    correctIndex: 1,
    explanation: "O CalVer com formato YYYY.MM comunica a data de lançamento diretamente na string de versão. Isso é ideal para serviços em uma cadência de lançamento baseada em tempo onde o timing do deploy importa mais do que a sinalização de compatibilidade com versões anteriores."
  },
  {
    question: "No Azure Pipelines, qual expressão fornece um inteiro atômico auto-incremental que previne colisões de versão entre execuções paralelas?",
    options: [
      "'$(Build.BuildId)'",
      "'$[counter(variables['prefix'], 0)]'",
      "'$(Rev:r)'",
      "'$(System.JobAttempt)'"
    ],
    correctIndex: 1,
    explanation: "A expressão counter() no Azure Pipelines fornece um inteiro atômico e auto-incremental com escopo em um prefixo. É garantido que produz valores únicos mesmo quando múltiplas execuções de pipeline ocorrem simultaneamente. $(Build.BuildId) é único mas não sequencial por pacote."
  },
  {
    question: "Uma biblioteca com tag '2.1.0' recebe duas alterações: um novo método compatível com versões anteriores e uma correção de bug. Qual deve ser a próxima versão?",
    options: [
      "2.1.1",
      "2.2.0",
      "3.0.0",
      "2.1.0-patch.1"
    ],
    correctIndex: 1,
    explanation: "Quando as alterações incluem uma nova funcionalidade compatível com versões anteriores (novo método), a versão MINOR é incrementada. A correção de bug normalmente seria um incremento de PATCH, mas como o MINOR está sendo incrementado, o patch é resetado para 0. O resultado é 2.2.0."
  }
]} />

## Limpeza

Remova as tags git criadas durante este desafio:

```bash
git tag -d v1.0.0 v1.2.0 v1.3.0
git push origin --delete v1.0.0 v1.2.0 v1.3.0
```

Remova a ferramenta GitVersion se instalada:

```bash
dotnet tool uninstall --global GitVersion.Tool
```

Remova os diretórios do projeto:

```bash
rm -rf contoso-data-models
```

Remova qualquer estado de contador do Azure Pipelines atualizando o prefixo da variável no YAML do pipeline se desejar resetar os contadores.
