---
sidebar_position: 1
title: "Desafio 39: Autenticação e identidade para DevOps"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 39: Autenticação e identidade para DevOps

## Habilidades do exame abordadas

- Escolher entre service principals do Microsoft Entra e identidades gerenciadas (atribuídas pelo sistema e atribuídas pelo usuário)
- Implementar e gerenciar segredos, chaves e certificados usando o Azure Key Vault
- Implementar autenticação sem segredos (workload identity federation/OIDC)

## Cenário

A Contoso Ltd opera 40 microsserviços implantados por meio do Azure Pipelines e GitHub Actions. A equipe de plataforma descobriu recentemente que 12 pipelines se autenticam no Azure usando um service principal compartilhado cujo segredo é armazenado como uma variável de pipeline em texto simples visível para todos os contribuidores. Três equipes criaram independentemente seus próprios service principals com acesso de Contributor à assinatura de produção inteira. A auditoria de segurança também revelou que os segredos são rotacionados manualmente (a última rotação foi há 14 meses). Você deve migrar a Contoso para padrões modernos de identidade que eliminem segredos armazenados sempre que possível e imponham o acesso com privilégios mínimos.

## Pré-requisitos

- Assinatura Azure com função Owner ou User Access Administrator
- Azure CLI 2.50+ instalado
- Conta GitHub com um repositório para testes
- Organização Azure DevOps com um projeto

## Tarefas

### Tarefa 1: Criar um service principal para autenticação de pipeline

Crie um service principal com um segredo de cliente, com escopo para um grupo de recursos específico.

```bash
# Create a resource group for the challenge
az group create --name rg-contoso-challenge39 --location eastus

# Create a service principal scoped to the resource group
az ad sp create-for-rbac \
  --name "sp-contoso-pipeline-dev" \
  --role "Contributor" \
  --scopes "/subscriptions/<subscription-id>/resourceGroups/rg-contoso-challenge39" \
  --years 1
```

Registre a saída (appId, password, tenant). Isso demonstra a abordagem tradicional com um segredo de cliente.

```bash
# Verify the service principal can authenticate
az login --service-principal \
  --username <appId> \
  --password <password> \
  --tenant <tenantId>

# Confirm access scope
az group show --name rg-contoso-challenge39
```

### Tarefa 2: Criar uma identidade gerenciada atribuída pelo usuário

Crie uma identidade gerenciada que pode ser compartilhada entre vários recursos Azure sem gerenciar segredos.

```bash
# Create a user-assigned managed identity
az identity create \
  --name id-contoso-pipeline \
  --resource-group rg-contoso-challenge39 \
  --location eastus

# Get the principal ID and client ID
IDENTITY_PRINCIPAL_ID=$(az identity show \
  --name id-contoso-pipeline \
  --resource-group rg-contoso-challenge39 \
  --query principalId -o tsv)

IDENTITY_CLIENT_ID=$(az identity show \
  --name id-contoso-pipeline \
  --resource-group rg-contoso-challenge39 \
  --query clientId -o tsv)

# Assign a role to the managed identity
az role assignment create \
  --assignee-object-id $IDENTITY_PRINCIPAL_ID \
  --assignee-principal-type ServicePrincipal \
  --role "Contributor" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/rg-contoso-challenge39"
```

### Tarefa 3: Implementar workload identity federation para GitHub Actions

Configure autenticação baseada em OIDC para que o GitHub Actions possa se autenticar no Azure sem armazenar segredos.

```bash
# Create an app registration for GitHub Actions
az ad app create --display-name "sp-contoso-github-oidc"

APP_ID=$(az ad app list --display-name "sp-contoso-github-oidc" --query "[0].appId" -o tsv)
OBJECT_ID=$(az ad app list --display-name "sp-contoso-github-oidc" --query "[0].id" -o tsv)

# Create a service principal from the app registration
az ad sp create --id $APP_ID

# Add federated credential for the main branch
az ad app federated-credential create \
  --id $OBJECT_ID \
  --parameters '{
    "name": "github-main-branch",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:contoso/webapp:ref:refs/heads/main",
    "description": "GitHub Actions main branch",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Add federated credential for the production environment
az ad app federated-credential create \
  --id $OBJECT_ID \
  --parameters '{
    "name": "github-production-env",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:contoso/webapp:environment:production",
    "description": "GitHub Actions production environment",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Assign role to the service principal
az role assignment create \
  --assignee $APP_ID \
  --role "Contributor" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/rg-contoso-challenge39"
```

Crie o workflow do GitHub Actions usando OIDC:

```yaml
# .github/workflows/deploy.yml
name: Deploy with OIDC
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login with OIDC
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy resources
        run: |
          az group show --name rg-contoso-challenge39
```

### Tarefa 4: Implementar workload identity federation para Azure Pipelines

Configure workload identity federation para service connections do Azure DevOps.

```bash
# Create federated credential for Azure DevOps
az ad app federated-credential create \
  --id $OBJECT_ID \
  --parameters '{
    "name": "azdo-contoso-project",
    "issuer": "https://vstoken.dev.azure.com/<org-id>",
    "subject": "sc://contoso-org/contoso-project/azure-production",
    "description": "Azure DevOps service connection",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

No Azure DevOps, crie uma service connection:

1. Project Settings > Service connections > New service connection
2. Selecione "Azure Resource Manager"
3. Selecione "Workload Identity federation (manual)"
4. Insira a Issuer URL, Service Principal Client ID e Tenant ID
5. Nomeie a conexão como `azure-production`

YAML do pipeline usando a conexão federada:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: AzureCLI@2
    inputs:
      azureSubscription: 'azure-production'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        az group show --name rg-contoso-challenge39
```

### Tarefa 5: Comparar métodos de autenticação (tabela de decisão)

| Critério | Service principal + segredo | Identidade gerenciada | Workload identity federation |
|----------|---------------------------|------------------|------------------------------|
| Gerenciamento de segredos | Requer armazenamento e rotação de segredos | Sem segredos para gerenciar | Sem segredos para gerenciar |
| Rotação necessária | Sim (expiração 1-2 anos) | Não | Não (troca de token) |
| Funciona a partir de | Qualquer lugar | Apenas recursos hospedados no Azure | GitHub Actions, Azure Pipelines, provedores OIDC externos |
| Controle de escopo | RBAC personalizado | RBAC personalizado | RBAC personalizado |
| Trilha de auditoria | Logs de sign-in | Logs de sign-in | Logs de sign-in com claims federadas |
| Melhor para | Sistemas legados, agentes on-premises | Computação hospedada no Azure (VMs, App Service, AKS) | Pipelines CI/CD (GitHub, ADO) |
| Risco se comprometido | Segredo pode ser usado de qualquer lugar até ser rotacionado | Não pode ser usado fora do recurso atribuído | Token válido apenas para repo/branch/environment específico |

### Tarefa 6: Configurar credenciais federadas para repos, branches e environments específicos

```bash
# Federated credential for pull requests
az ad app federated-credential create \
  --id $OBJECT_ID \
  --parameters '{
    "name": "github-pull-request",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:contoso/webapp:pull_request",
    "description": "GitHub Actions pull requests",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Federated credential for a specific tag pattern
az ad app federated-credential create \
  --id $OBJECT_ID \
  --parameters '{
    "name": "github-release-tags",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:contoso/webapp:ref:refs/tags/v*",
    "description": "GitHub Actions release tags",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# List all federated credentials
az ad app federated-credential list --id $OBJECT_ID
```

## Exercícios de quebra e conserto

### Cenário de quebra 1: Incompatibilidade no subject da credencial federada

Um desenvolvedor relata que o workflow do GitHub Actions falha com "AADSTS70021: No matching federated identity record found."

**Causa:** O claim `subject` na credencial federada não corresponde ao token emitido pelo GitHub. Causas comuns incluem nome de repositório errado, branch errado ou configuração de environment ausente no workflow.

**Diagnóstico:**

```bash
# List federated credentials to check subjects
az ad app federated-credential list --id $OBJECT_ID --query "[].{name:name, subject:subject}"
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Verifique se o trigger do workflow corresponde ao subject da credencial federada. Se o workflow é executado em `refs/heads/develop` mas a credencial especifica `refs/heads/main`, adicione uma nova credencial:

```bash
az ad app federated-credential create \
  --id $OBJECT_ID \
  --parameters '{
    "name": "github-develop-branch",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:contoso/webapp:ref:refs/heads/develop",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

</details>

### Cenário de quebra 2: Identidade gerenciada sem atribuição de função

Uma aplicação usando uma identidade gerenciada retorna "AuthorizationFailed" ao tentar acessar uma conta de armazenamento.

**Diagnóstico:**

```bash
# Check role assignments for the managed identity
az role assignment list --assignee $IDENTITY_PRINCIPAL_ID --all
```


<details>
<summary>Mostrar solução</summary>

**Correção:**

```bash
az role assignment create \
  --assignee-object-id $IDENTITY_PRINCIPAL_ID \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/rg-contoso-challenge39"
```

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual método de autenticação você deve recomendar para um pipeline executando em um agente self-hosted do Azure DevOps hospedado em uma VM Azure que precisa implantar recursos no Azure?",
    options: [
      "Service principal com segredo de cliente armazenado em variáveis de pipeline",
      "Identidade gerenciada atribuída pelo usuário associada à VM",
      "Token de acesso pessoal",
      "Par de chaves SSH"
    ],
    correctIndex: 1,
    explanation: "Uma identidade gerenciada atribuída pelo usuário elimina a necessidade de armazenar e rotacionar segredos. Como o agente é executado em uma VM Azure, a identidade gerenciada está disponível e é a opção mais segura. Service principals com segredos requerem rotação e apresentam risco de exposição. PATs e chaves SSH são para cenários de autenticação diferentes."
  },
  {
    question: "Um workflow do GitHub Actions usa workload identity federation mas falha com \"AADSTS700024: Client assertion is not within its valid time range.\" Qual é a causa mais provável?",
    options: [
      "A credencial federada expirou",
      "O relógio do sistema no runner do GitHub está significativamente desajustado",
      "O token do GitHub foi revogado",
      "A assinatura Azure foi suspensa"
    ],
    correctIndex: 1,
    explanation: "Este erro indica uma falha de validação de tempo na troca de token. Embora runners hospedados pelo GitHub raramente tenham desajuste de relógio, este erro aponta para problemas de temporização na validação do token OIDC. Credenciais federadas não possuem sua própria expiração separada do registro do aplicativo."
  },
  {
    question: "Ao configurar workload identity federation para Azure Pipelines, qual formato o claim 'subject' deve usar?",
    options: [
      "'repo:org/repo:ref:refs/heads/main'",
      "'sc://organization/project/service-connection-name'",
      "'pipeline://organization/project/pipeline-id'",
      "'ado://organization/project/environment'"
    ],
    correctIndex: 1,
    explanation: "O Azure DevOps usa o formato sc://organization/project/service-connection-name para o claim subject em credenciais federadas. O formato repo: é usado pelo GitHub Actions. O Azure Pipelines se identifica através do nome da service connection."
  },
  {
    question: "A Contoso possui três environments (dev, staging, production) e deseja um único registro de aplicativo com credenciais federadas que limitem qual branch do GitHub pode implantar em cada environment. Qual é a abordagem correta?",
    options: [
      "Criar três registros de aplicativo, um por environment",
      "Criar três credenciais federadas no mesmo registro de aplicativo com claims de subject diferentes direcionando environments diferentes",
      "Usar uma única credencial federada com um subject curinga",
      "Criar três identidades gerenciadas"
    ],
    correctIndex: 1,
    explanation: "Você pode adicionar múltiplas credenciais federadas a um único registro de aplicativo, cada uma com um claim de subject diferente (por exemplo, repo:org/repo:environment:production e repo:org/repo:environment:staging). Isso mantém uma única identidade enquanto restringe qual contexto de workflow pode obter tokens para cada environment. Subjects curinga não são suportados."
  }
]} />

## Limpeza

```bash
# Delete the resource group
az group delete --name rg-contoso-challenge39 --yes --no-wait

# Delete the service principal
az ad sp delete --id $(az ad sp list --display-name "sp-contoso-pipeline-dev" --query "[0].id" -o tsv)

# Delete the app registration and its federated credentials
az ad app delete --id $OBJECT_ID

# Delete the managed identity (deleted with resource group)
az identity delete --name id-contoso-pipeline --resource-group rg-contoso-challenge39
```
