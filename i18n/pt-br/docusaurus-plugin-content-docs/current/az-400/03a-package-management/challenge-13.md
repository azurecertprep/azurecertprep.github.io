---
sidebar_position: 1
title: "Desafio 13: GitHub Packages e Azure Artifacts"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 13: GitHub Packages e Azure Artifacts

:::info Plataforma: comparaÃ§Ã£o
Este desafio compara o GitHub Packages e o Azure Artifacts lado a lado.
:::

## Habilidades do exame

- Recomendar ferramentas de gerenciamento de pacotes incluindo GitHub Packages e Azure Artifacts
- Projetar e implementar feeds e views de pacotes para pacotes locais e upstream

## CenÃ¡rio

A Contoso Ltd possui 15 microsserviÃ§os que compartilham 4 bibliotecas internas (auth-sdk, logging-sdk, data-models e api-contracts). Atualmente, as equipes copiam cÃ³digo-fonte entre repositÃ³rios. O VP de Engenharia deseja uma soluÃ§Ã£o centralizada de gerenciamento de pacotes com:
- Hospedagem privada de pacotes
- VerificaÃ§Ã£o de vulnerabilidades em dependÃªncias
- Controle de acesso por equipe
- Suporte para pacotes npm e NuGet

Seu trabalho Ã© avaliar tanto o GitHub Packages quanto o Azure Artifacts, configurar cada plataforma e recomendar a melhor opÃ§Ã£o para o ecossistema multi-linguagem da Contoso.

## Tarefas

### Tarefa 1: Configurar GitHub Packages (npm)

#### Passo 1: Criar o projeto da biblioteca

```bash
mkdir contoso-auth-sdk && cd contoso-auth-sdk
npm init -y
```

Edite o `package.json` para definir o escopo do pacote para sua organizaÃ§Ã£o GitHub:

```json
{
  "name": "@contoso/auth-sdk",
  "version": "1.0.0",
  "description": "Contoso internal authentication SDK",
  "main": "index.js",
  "repository": {
    "type": "git",
    "url": "https://github.com/contoso/auth-sdk.git"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

#### Passo 2: Configurar autenticaÃ§Ã£o

Crie um arquivo `.npmrc` na raiz do projeto para apontar para o GitHub Packages:

```ini
@contoso:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Gere um token de acesso pessoal com os escopos `read:packages` e `write:packages`:

```bash
gh auth token
```

Ou defina o token como variÃ¡vel de ambiente:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Passo 3: Publicar o pacote

```bash
npm publish
```

Verifique se o pacote existe:

```bash
gh api /orgs/contoso/packages/npm/auth-sdk
```

#### Passo 4: Consumir o pacote em outro projeto

No repositÃ³rio do microsserviÃ§o consumidor, crie um `.npmrc`:

```ini
@contoso:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Instale o pacote:

```bash
npm install @contoso/auth-sdk
```

#### Passo 5: Definir visibilidade e permissÃµes do pacote

Defina o pacote como interno (visÃ­vel para todos os membros da organizaÃ§Ã£o):

```bash
gh api --method PUT /orgs/contoso/packages/npm/auth-sdk/visibility \
  -f visibility=internal
```

Conceda acesso de escrita a uma equipe especÃ­fica:

```bash
gh api --method PUT /orgs/contoso/packages/npm/auth-sdk/teams/backend-team \
  -f permission=write
```

#### Passo 6: Publicar a partir do GitHub Actions

Crie `.github/workflows/publish.yml`:

```yaml
name: Publish package
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://npm.pkg.github.com/
      - run: npm ci
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Tarefa 2: Configurar Azure Artifacts (npm e NuGet)

#### Passo 1: Criar um feed do Azure Artifacts

```bash
az artifacts feed create \
  --name contoso-packages \
  --organization https://dev.azure.com/contoso \
  --project ContosoServices \
  --scope project
```

#### Passo 2: Configurar fontes upstream

Adicione o npmjs.com como fonte upstream para que pacotes pÃºblicos sejam proxeados atravÃ©s do seu feed:

```bash
az rest --method post \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages/upstreamsources?api-version=7.1-preview.1" \
  --body '{
    "name": "npmjs",
    "protocol": "npm",
    "location": "https://registry.npmjs.org/",
    "upstreamSourceType": "public"
  }'
```

Adicione o upstream do nuget.org:

```bash
az rest --method post \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages/upstreamsources?api-version=7.1-preview.1" \
  --body '{
    "name": "nuget.org",
    "protocol": "nuget",
    "location": "https://api.nuget.org/v3/index.json",
    "upstreamSourceType": "public"
  }'
```

#### Passo 3: Publicar um pacote npm no Azure Artifacts

Configure o `.npmrc` para o feed do Azure Artifacts:

```ini
registry=https://pkgs.dev.azure.com/contoso/ContosoServices/_packaging/contoso-packages/npm/registry/
always-auth=true
//pkgs.dev.azure.com/contoso/ContosoServices/_packaging/contoso-packages/npm/registry/:_authToken=${AZURE_DEVOPS_PAT}
```

Publique:

```bash
npm publish
```

#### Passo 4: Publicar um pacote NuGet no Azure Artifacts

Crie uma fonte NuGet:

```bash
dotnet nuget add source \
  "https://pkgs.dev.azure.com/contoso/ContosoServices/_packaging/contoso-packages/nuget/v3/index.json" \
  --name contoso-packages \
  --username contoso \
  --password $AZURE_DEVOPS_PAT \
  --store-password-in-clear-text
```

Empacote e publique uma biblioteca .NET:

```bash
dotnet pack --configuration Release --output ./nupkgs
dotnet nuget push ./nupkgs/*.nupkg \
  --source contoso-packages \
  --api-key az
```

#### Passo 5: Definir permissÃµes do feed

Conceda Ã  equipe backend acesso de contribuidor (pode publicar e consumir):

```bash
az rest --method patch \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages/permissions?api-version=7.1-preview.1" \
  --body '[{
    "identityDescriptor": "Microsoft.TeamFoundation.Identity;S-1-9-xxx",
    "role": "contributor"
  }]'
```

FunÃ§Ãµes de feed no Azure Artifacts:
- **Reader**: Pode consumir pacotes do feed
- **Collaborator**: Pode consumir pacotes e salvar pacotes de fontes upstream
- **Contributor**: Pode publicar novos pacotes e versÃµes
- **Owner**: Controle total incluindo exclusÃ£o do feed e gerenciamento de permissÃµes

#### Passo 6: Criar views (prÃ©-lanÃ§amento e lanÃ§amento)

```bash
az rest --method post \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages/views?api-version=7.1-preview.1" \
  --body '{
    "name": "prerelease",
    "type": "implicit",
    "visibility": "private"
  }'

az rest --method post \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages/views?api-version=7.1-preview.1" \
  --body '{
    "name": "release",
    "type": "implicit",
    "visibility": "organization"
  }'
```

Promova uma versÃ£o de pacote para a view de release:

```bash
az rest --method post \
  --uri "https://pkgs.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages/npm/@contoso/auth-sdk/versions/1.0.0?api-version=7.1-preview.1" \
  --body '{
    "views": { "op": "add", "path": "/views/-", "value": "release" }
  }'
```

### Tarefa 3: Configurar fontes upstream

Fontes upstream permitem que seu feed privado faÃ§a proxy de registros pÃºblicos. Quando um desenvolvedor solicita um pacote que nÃ£o existe localmente, o feed o busca na fonte upstream configurada e o armazena em cache.

#### Passo 1: Entender o comportamento das fontes upstream

- Primeira solicitaÃ§Ã£o: O pacote Ã© buscado do upstream e salvo no feed local
- SolicitaÃ§Ãµes subsequentes: O pacote Ã© servido do cache do feed local
- Se o upstream ficar offline, os pacotes em cache permanecem disponÃ­veis
- Novas versÃµes do upstream sÃ£o buscadas sob demanda

#### Passo 2: Configurar ordem de prioridade

Fontes upstream sÃ£o avaliadas em ordem de prioridade. Coloque seu feed interno primeiro para que pacotes internos tenham precedÃªncia sobre pacotes pÃºblicos com o mesmo nome:

```bash
az rest --method patch \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages?api-version=7.1-preview.1" \
  --body '{
    "upstreamSources": [
      {
        "name": "contoso-shared",
        "protocol": "npm",
        "location": "https://pkgs.dev.azure.com/contoso/_packaging/shared-libs/npm/registry/",
        "upstreamSourceType": "internal"
      },
      {
        "name": "npmjs",
        "protocol": "npm",
        "location": "https://registry.npmjs.org/",
        "upstreamSourceType": "public"
      }
    ]
  }'
```

#### Passo 3: Testar a resoluÃ§Ã£o upstream

Instale um pacote pÃºblico atravÃ©s do seu feed:

```bash
npm install lodash --registry https://pkgs.dev.azure.com/contoso/ContosoServices/_packaging/contoso-packages/npm/registry/
```

Verifique se ele foi armazenado em cache no seu feed consultando o conteÃºdo do feed no Azure DevOps ou via API:

```bash
az rest --method get \
  --uri "https://feeds.dev.azure.com/contoso/ContosoServices/_apis/packaging/feeds/contoso-packages/npm/packages?api-version=7.1-preview.1"
```

## ExercÃ­cios de quebra e conserto

### CenÃ¡rio: PublicaÃ§Ã£o de pacote falha com 403

Um desenvolvedor relata que nÃ£o consegue publicar no GitHub Package Registry. O erro Ã©:

```bash
npm ERR! 403 Forbidden - PUT https://npm.pkg.github.com/@contoso/auth-sdk
```

Diagnostique e corrija o problema. Causas comuns:

1. PermissÃ£o `packages: write` ausente no workflow
2. Nome do pacote nÃ£o corresponde ao escopo do proprietÃ¡rio do repositÃ³rio
3. `.npmrc` apontando para o registro errado
4. Token nÃ£o possui o escopo `write:packages`

<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**Causa 1: PermissÃµes ausentes no workflow do GitHub Actions**

O arquivo de workflow deve declarar explicitamente permissÃµes de escrita de pacotes:

```yaml
permissions:
  contents: read
  packages: write
```

Sem isso, o `GITHUB_TOKEN` assume permissÃ£o somente leitura para pacotes em workflows acionados por pull requests de forks.

**Causa 2: Incompatibilidade de escopo do pacote**

O GitHub Packages exige que o escopo do pacote (`@contoso/`) corresponda ao proprietÃ¡rio do repositÃ³rio. Verifique o nome do pacote:

```bash
cat package.json | grep name
# Deve retornar: "@contoso/auth-sdk" onde "contoso" corresponde Ã  org/usuÃ¡rio dono do repo
```

Corrija atualizando o `package.json`:

```json
{
  "name": "@contoso/auth-sdk"
}
```

**Causa 3: ConfiguraÃ§Ã£o incorreta do .npmrc**

Verifique qual registro o npm estÃ¡ usando:

```bash
npm config get registry
cat .npmrc
```

Certifique-se de que o `.npmrc` contenha:

```ini
@contoso:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

**Causa 4: Token sem os escopos necessÃ¡rios**

Verifique os escopos do token:

```bash
gh auth status
```

Se estiver usando um PAT clÃ¡ssico, regenere com o escopo `write:packages`. Se estiver usando um PAT de granularidade fina, certifique-se de que o token tenha permissÃµes de escrita de pacotes para o repositÃ³rio alvo.

Para testar com um token novo:

```bash
gh auth refresh --scopes write:packages,read:packages
export GITHUB_TOKEN=$(gh auth token)
npm publish
```

</details>

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Quais tipos de pacote o GitHub Packages suporta?",
    options: [
      "npm, Maven, NuGet, Docker, RubyGems",
      "Apenas npm",
      "Apenas npm e Docker",
      "npm, Maven e pip"
    ],
    correctIndex: 0,
    explanation: "O GitHub Packages suporta npm, Maven, NuGet, Docker (imagens de contÃªiner) e RubyGems. Pacotes Python (pip) nÃ£o sÃ£o suportados nativamente pelo GitHub Packages."
  },
  {
    question: "Qual Ã© o nÃºmero mÃ¡ximo de fontes upstream em um Ãºnico feed do Azure Artifacts?",
    options: [
      "1",
      "5",
      "Ilimitado",
      "10"
    ],
    correctIndex: 2,
    explanation: "O Azure Artifacts nÃ£o impÃµe um limite rÃ­gido no nÃºmero de fontes upstream por feed. VocÃª pode configurar quantas forem necessÃ¡rias, embora consideraÃ§Ãµes de desempenho se apliquem com nÃºmeros muito grandes."
  },
  {
    question: "Uma empresa precisa de verificaÃ§Ã£o de vulnerabilidades de pacotes integrada ao pipeline. Qual soluÃ§Ã£o oferece isso nativamente?",
    options: [
      "Azure Artifacts com Defender for Cloud",
      "GitHub Packages com Dependabot",
      "Ambas A e B",
      "Nenhuma - requer ferramentas de terceiros"
    ],
    correctIndex: 2,
    explanation: "Ambas as plataformas fornecem verificaÃ§Ã£o de vulnerabilidades nativa. O GitHub usa o Dependabot para alertas de seguranÃ§a e PRs automatizados. O Azure integra-se com o Microsoft Defender for DevOps para verificar dependÃªncias vulnerÃ¡veis."
  },
  {
    question: "O que acontece quando um pacote em uma fonte upstream do Azure Artifacts Ã© consumido pela primeira vez?",
    options: [
      "Ele Ã© sempre buscado do upstream a cada solicitaÃ§Ã£o",
      "Uma cÃ³pia Ã© salva no feed local",
      "Ele fica disponÃ­vel apenas na view de prÃ©-lanÃ§amento",
      "Requer aprovaÃ§Ã£o manual"
    ],
    correctIndex: 1,
    explanation: "Quando um pacote de uma fonte upstream Ã© solicitado pela primeira vez, o Azure Artifacts faz o download e salva uma cÃ³pia no feed local. SolicitaÃ§Ãµes subsequentes sÃ£o servidas a partir da cÃ³pia em cache, proporcionando resiliÃªncia contra indisponibilidade do upstream."
  }
]} />

## Limpeza

Remova o pacote do GitHub:

```bash
gh api --method DELETE /orgs/contoso/packages/npm/auth-sdk
```

Se a exclusÃ£o por versÃ£o for necessÃ¡ria:

```bash
# List versions
gh api /orgs/contoso/packages/npm/auth-sdk/versions

# Delete a specific version
gh api --method DELETE /orgs/contoso/packages/npm/auth-sdk/versions/PACKAGE_VERSION_ID
```

Exclua o feed do Azure Artifacts:

```bash
az artifacts feed delete \
  --name contoso-packages \
  --organization https://dev.azure.com/contoso \
  --project ContosoServices \
  --yes
```

Remova a configuraÃ§Ã£o local do npm:

```bash
rm .npmrc
dotnet nuget remove source contoso-packages
```

Remova os diretÃ³rios locais do projeto:

```bash
rm -rf contoso-auth-sdk
```
