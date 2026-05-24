---
sidebar_position: 2
title: "Desafio 14: EstratÃ©gias de versionamento"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 14: EstratÃ©gias de versionamento

:::info Plataforma: ambas
Este desafio cobre estratÃ©gias de versionamento aplicÃ¡veis a pipelines tanto do GitHub quanto do Azure DevOps.
:::

## Habilidades do exame

- Projetar e implementar uma estratÃ©gia de versionamento de dependÃªncias para ativos de cÃ³digo e pacotes, incluindo versionamento semÃ¢ntico (SemVer) e baseado em data (CalVer)
- Projetar e implementar uma estratÃ©gia de versionamento para artefatos de pipeline

## CenÃ¡rio

A Contoso tem versionamento inconsistente entre suas 15 equipes de microsserviÃ§os. A equipe de autenticaÃ§Ã£o usa datas como `20240115`, a equipe de pagamentos usa nÃºmeros de build aleatÃ³rios e trÃªs equipes nÃ£o versionam seus pacotes. Isso causa:

- Falhas de rollback porque as equipes nÃ£o conseguem identificar qual versÃ£o estÃ¡ implantada
- Conflitos de dependÃªncia quando duas bibliotecas com alteraÃ§Ãµes incompatÃ­veis compartilham a mesma versÃ£o major
- Incapacidade de configurar polÃ­ticas automatizadas de atualizaÃ§Ã£o de dependÃªncias
- Falhas de auditoria devido Ã  linhagem de artefatos nÃ£o rastreÃ¡vel

O VP de Engenharia exige uma estratÃ©gia unificada de versionamento em todas as equipes. Sua tarefa Ã© projetÃ¡-la e implementÃ¡-la.

## Tarefas

### Tarefa 1: Implementar versionamento semÃ¢ntico (SemVer)

O versionamento semÃ¢ntico segue o formato `MAJOR.MINOR.PATCH` onde:
- **MAJOR** incrementa para alteraÃ§Ãµes incompatÃ­veis na API
- **MINOR** incrementa para nova funcionalidade compatÃ­vel com versÃµes anteriores
- **PATCH** incrementa para correÃ§Ãµes de bugs compatÃ­veis com versÃµes anteriores

#### Tags de prÃ©-lanÃ§amento

VersÃµes de prÃ©-lanÃ§amento adicionam um hÃ­fen e identificadores apÃ³s o nÃºmero de patch:

```text
1.0.0-alpha.1
1.0.0-beta.3
1.0.0-rc.1
```

Ordem de precedÃªncia: `1.0.0-alpha.1 < 1.0.0-beta.1 < 1.0.0-rc.1 < 1.0.0`

#### Metadados de build

Metadados de build sÃ£o adicionados com um sinal de mais e nÃ£o afetam a precedÃªncia de versÃ£o:

```text
1.0.0+20240615
1.0.0-beta.1+build.42
```

#### Passo 1: Configurar SemVer para um pacote npm

Crie um pacote e defina sua versÃ£o inicial:

```bash
mkdir contoso-data-models && cd contoso-data-models
npm init -y
npm version 1.0.0
```

Incremente versÃµes com base no tipo de alteraÃ§Ã£o:

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

Substitua a versÃ£o no momento do build:

```bash
dotnet pack --configuration Release /p:Version=1.2.0-beta.1
```

### Tarefa 2: Implementar versionamento por calendÃ¡rio (CalVer)

O CalVer usa componentes de data como identificadores de versÃ£o. Formatos comuns:

| Formato | Exemplo | Caso de uso |
|---------|---------|-------------|
| YYYY.MM.DD | 2024.06.15 | LanÃ§amentos diÃ¡rios, deploys contÃ­nuos |
| YYYY.MM.MICRO | 2024.06.3 | LanÃ§amentos mensais com contagem de patches |
| YYYY.MINOR.MICRO | 2024.2.1 | Major anual, minor incremental |

O CalVer funciona bem para:
- AplicaÃ§Ãµes (nÃ£o bibliotecas) onde a compatibilidade de API nÃ£o Ã© a preocupaÃ§Ã£o principal
- Produtos com trens de lanÃ§amento baseados em tempo (Ubuntu usa YY.MM: 24.04)
- ServiÃ§os internos onde "quando foi implantado" importa mais do que "o que mudou"

#### Passo 1: Gerar uma versÃ£o CalVer em um script shell

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

Build com a versÃ£o:

```bash
docker build --build-arg VERSION=$(date +%Y.%m.%d).$GITHUB_RUN_NUMBER -t contoso-api .
```

### Tarefa 3: Versionamento automÃ¡tico no GitHub Actions

#### OpÃ§Ã£o A: Versionamento baseado em tags Git

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

#### OpÃ§Ã£o B: GitVersion para cÃ¡lculo automÃ¡tico de SemVer

O GitVersion analisa seu histÃ³rico git e modelo de branching para calcular automaticamente a prÃ³xima versÃ£o.

Instale o GitVersion como ferramenta .NET:

```bash
dotnet tool install --global GitVersion.Tool
```

Adicione uma configuraÃ§Ã£o `GitVersion.yml`:

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

### Tarefa 4: Versionamento automÃ¡tico no Azure Pipelines

#### OpÃ§Ã£o A: Usando BuildId e variÃ¡veis de pipeline

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

#### OpÃ§Ã£o B: Versionamento de prÃ©-lanÃ§amento baseado em branch

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

### Tarefa 5: EstratÃ©gias de versionamento de artefatos de pipeline

Artefatos de pipeline (saÃ­das de build, imagens de contÃªiner, Helm charts) requerem seu prÃ³prio versionamento:

#### EstratÃ©gia 1: VersÃ£o semÃ¢ntica a partir da fonte

Marque artefatos com o mesmo SemVer do pacote fonte:

```bash
# Container image tagged with SemVer
docker build -t contoso.azurecr.io/auth-service:1.2.0 .
docker tag contoso.azurecr.io/auth-service:1.2.0 contoso.azurecr.io/auth-service:latest
docker push contoso.azurecr.io/auth-service:1.2.0
docker push contoso.azurecr.io/auth-service:latest
```

#### EstratÃ©gia 2: BuildId para rastreabilidade

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

#### EstratÃ©gia 3: HÃ­brida (SemVer + metadados de build)

```bash
VERSION="1.2.0+build.${GITHUB_RUN_NUMBER}.sha.${GITHUB_SHA:0:7}"
echo "Artifact version: $VERSION"
# Output: 1.2.0+build.42.sha.a1b2c3d
```

## ExercÃ­cios de quebra e conserto

### CenÃ¡rio: Conflito de versÃ£o quando dois PRs sÃ£o mergeados simultaneamente

Dois desenvolvedores fazem merge de PRs para a main com segundos de diferenÃ§a. Ambos os pipelines calculam a prÃ³xima versÃ£o como `1.3.0` porque leram a mesma tag mais recente. O segundo `npm publish` falha:

```bash
npm ERR! 403 Forbidden - PUT https://npm.pkg.github.com/@contoso/data-models
npm ERR! You cannot publish over the previously published versions: 1.3.0
```

<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**Causa raiz**: Ambas as execuÃ§Ãµes de CI calcularam a versÃ£o a partir do mesmo estado git. CondiÃ§Ãµes de corrida no versionamento baseado em tags ocorrem quando pipelines paralelos leem a mesma tag "mais recente" antes que qualquer um tenha enviado uma nova.

**CorreÃ§Ã£o 1: Usar abordagem baseada em contador (Azure Pipelines)**

A expressÃ£o `counter()` do Azure Pipelines Ã© atÃ´mica e previne duplicatas:

```yaml
variables:
  patchVersion: $[counter(format('{0}.{1}', variables['majorVersion'], variables['minorVersion']), 0)]
```

Cada execuÃ§Ã£o de pipeline recebe um valor Ãºnico e incremental independentemente do timing.

**CorreÃ§Ã£o 2: Usar nÃºmero de execuÃ§Ã£o na tag de prÃ©-lanÃ§amento (GitHub Actions)**

Inclua o `GITHUB_RUN_NUMBER` que Ã© Ãºnico por workflow:

```yaml
- name: Calculate version
  run: |
    LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
    BASE_VERSION=${LATEST_TAG#v}
    VERSION="${BASE_VERSION%.*}.$((${BASE_VERSION##*.} + 1))"
    echo "VERSION=$VERSION" >> $GITHUB_OUTPUT
```

**CorreÃ§Ã£o 3: Retry com patch incrementado**

Adicione lÃ³gica de retry que detecta o 403 e incrementa:

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

**CorreÃ§Ã£o 4 (recomendada): Usar GitVersion com modo ContinuousDeployment**

O GitVersion no modo ContinuousDeployment adiciona a contagem de commits desde a Ãºltima tag, garantindo unicidade:

```text
v1.3.0 tag on main
  -> commit A: 1.3.1-ci.1
  -> commit B: 1.3.1-ci.2  (always unique)
```

Isso evita a condiÃ§Ã£o de corrida completamente porque cada commit produz uma versÃ£o distinta.

</details>

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "De acordo com o SemVer, qual versÃ£o tem a maior precedÃªncia?",
    options: [
      "1.0.0-alpha",
      "1.0.0-beta.2",
      "1.0.0-rc.1",
      "1.0.0"
    ],
    correctIndex: 3,
    explanation: "Uma versÃ£o de lanÃ§amento sempre tem precedÃªncia maior do que qualquer versÃ£o de prÃ©-lanÃ§amento com o mesmo MAJOR.MINOR.PATCH. VersÃµes de prÃ©-lanÃ§amento indicam instabilidade. A ordem Ã©: alpha < beta < rc < release."
  },
  {
    question: "Uma equipe lanÃ§a seu API gateway interno mensalmente e quer que a versÃ£o comunique \"quando\" em vez de \"o que mudou\". Qual estratÃ©gia devem usar?",
    options: [
      "SemVer com tags de prÃ©-lanÃ§amento",
      "CalVer com formato YYYY.MM",
      "NÃºmeros de build auto-incrementais",
      "SHA do commit Git como versÃ£o"
    ],
    correctIndex: 1,
    explanation: "O CalVer com formato YYYY.MM comunica a data de lanÃ§amento diretamente na string de versÃ£o. Isso Ã© ideal para serviÃ§os em uma cadÃªncia de lanÃ§amento baseada em tempo onde o timing do deploy importa mais do que a sinalizaÃ§Ã£o de compatibilidade com versÃµes anteriores."
  },
  {
    question: "No Azure Pipelines, qual expressÃ£o fornece um inteiro atÃ´mico auto-incremental que previne colisÃµes de versÃ£o entre execuÃ§Ãµes paralelas?",
    options: [
      "'$(Build.BuildId)'",
      "'$[counter(variables['prefix'], 0)]'",
      "'$(Rev:r)'",
      "'$(System.JobAttempt)'"
    ],
    correctIndex: 1,
    explanation: "A expressÃ£o counter() no Azure Pipelines fornece um inteiro atÃ´mico e auto-incremental com escopo em um prefixo. Ã‰ garantido que produz valores Ãºnicos mesmo quando mÃºltiplas execuÃ§Ãµes de pipeline ocorrem simultaneamente. $(Build.BuildId) Ã© Ãºnico mas nÃ£o sequencial por pacote."
  },
  {
    question: "Uma biblioteca com tag '2.1.0' recebe duas alteraÃ§Ãµes: um novo mÃ©todo compatÃ­vel com versÃµes anteriores e uma correÃ§Ã£o de bug. Qual deve ser a prÃ³xima versÃ£o?",
    options: [
      "2.1.1",
      "2.2.0",
      "3.0.0",
      "2.1.0-patch.1"
    ],
    correctIndex: 1,
    explanation: "Quando as alteraÃ§Ãµes incluem uma nova funcionalidade compatÃ­vel com versÃµes anteriores (novo mÃ©todo), a versÃ£o MINOR Ã© incrementada. A correÃ§Ã£o de bug normalmente seria um incremento de PATCH, mas como o MINOR estÃ¡ sendo incrementado, o patch Ã© resetado para 0. O resultado Ã© 2.2.0."
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

Remova os diretÃ³rios do projeto:

```bash
rm -rf contoso-data-models
```

Remova qualquer estado de contador do Azure Pipelines atualizando o prefixo da variÃ¡vel no YAML do pipeline se desejar resetar os contadores.
