---
sidebar_position: 3
title: "Desafio 41: Permissões e conexões de serviço do Azure DevOps"
sidebar_label: "Desafio 41: Permissões e conexões de serviço do Azure DevOps"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 41: Permissões e conexões de serviço do Azure DevOps

## Habilidades do exame abordadas

- Implementar e gerenciar conexões de serviço e tokens de acesso pessoal do Azure DevOps
- Projetar e implementar permissões e grupos de segurança no Azure DevOps
- Recomendar níveis de acesso apropriados
- Configurar projetos e equipes no Azure DevOps

## Cenário

A organização Azure DevOps da Contoso Ltd cresceu organicamente ao longo de três anos. Todos os 200 usuários são membros do grupo Project Administrators porque "era mais fácil." Cada pipeline usa uma única conexão de serviço chamada `Azure-All` com acesso de Contributor à assinatura de produção inteira. O PAT usado pela integração de CI foi criado por um ex-funcionário com escopo completo e sem expiração. Você deve reprojetar o modelo de permissões para implementar acesso com privilégio mínimo.

## Pré-requisitos

- Organização Azure DevOps com acesso de Project Collection Administrator
- Assinatura Azure com função Owner
- Azure CLI com extensão `azure-devops` instalada
- Pelo menos um projeto do Azure DevOps

## Tarefas

### Tarefa 1: Projetar grupos de segurança (por equipe, por função)

Crie uma estrutura de grupos que mapeie a organização de equipes da Contoso.

```bash
# Install the Azure DevOps CLI extension
az extension add --name azure-devops

# Set the default organization and project
az devops configure --defaults organization=https://dev.azure.com/contoso project=ContosoWeb

# Create team-specific security groups
az devops security group create \
  --name "Contoso-Backend-Developers" \
  --description "Backend development team - write access to backend repos" \
  --project ContosoWeb

az devops security group create \
  --name "Contoso-Frontend-Developers" \
  --description "Frontend development team - write access to frontend repos" \
  --project ContosoWeb

az devops security group create \
  --name "Contoso-DevOps-Engineers" \
  --description "Platform team - manage pipelines and service connections" \
  --project ContosoWeb

az devops security group create \
  --name "Contoso-Release-Managers" \
  --description "Approve and manage production releases" \
  --project ContosoWeb

az devops security group create \
  --name "Contoso-Stakeholders" \
  --description "View work items and dashboards only" \
  --project ContosoWeb
```

Remova os usuários do grupo Project Administrators:

```bash
# List current Project Administrators members
az devops security group membership list \
  --id "vstfs:///Classification/TeamProject/<project-id>\\Project Administrators"

# Remove a user from Project Administrators
az devops security group membership remove \
  --group "vstfs:///Classification/TeamProject/<project-id>\\Project Administrators" \
  --member-id <user-descriptor>

# Add user to the appropriate team group instead
az devops security group membership add \
  --group "vstfs:///Classification/TeamProject/<project-id>\\Contoso-Backend-Developers" \
  --member-id <user-descriptor>
```

### Tarefa 2: Configurar permissões no nível do projeto

Defina permissões granulares para cada grupo.

```bash
# Get the security namespace IDs
az devops security permission namespace list --query "[].{name:name, id:namespaceId}" -o table

# Key namespace IDs:
# Build: 33344d9c-fc72-4d6f-aba5-fa317101a7e9
# Git Repositories: 2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87
# ReleaseManagement: c788c23e-1b46-4162-8f5e-d7585343b5de

# Grant build permissions to DevOps Engineers group
az devops security permission update \
  --namespace-id 33344d9c-fc72-4d6f-aba5-fa317101a7e9 \
  --subject <devops-engineers-group-descriptor> \
  --token "<project-id>" \
  --allow-bit 1535 \
  --deny-bit 0

# Restrict developers to only queue builds (not edit pipelines)
az devops security permission update \
  --namespace-id 33344d9c-fc72-4d6f-aba5-fa317101a7e9 \
  --subject <backend-developers-group-descriptor> \
  --token "<project-id>" \
  --allow-bit 128 \
  --deny-bit 0
```

Matriz de permissões para a Contoso:

| Permissão | Backend Devs | Frontend Devs | DevOps Engineers | Release Managers |
|-----------|-------------|---------------|------------------|-----------------|
| Visualizar builds | Sim | Sim | Sim | Sim |
| Enfileirar builds | Sim | Sim | Sim | Sim |
| Editar pipelines de build | Não | Não | Sim | Não |
| Criar releases | Não | Não | Sim | Sim |
| Aprovar releases | Não | Não | Não | Sim |
| Gerenciar conexões de serviço | Não | Não | Sim | Não |
| Editar configurações do projeto | Não | Não | Sim | Não |

### Tarefa 3: Configurar conexões de serviço com permissões mínimas

Substitua a conexão excessivamente permissiva `Azure-All` por conexões com escopo definido.

```bash
# Create a resource group per environment
az group create --name rg-contoso-dev --location eastus
az group create --name rg-contoso-staging --location eastus
az group create --name rg-contoso-prod --location eastus

# Create service principals scoped to each environment
az ad sp create-for-rbac \
  --name "sp-ado-contoso-dev" \
  --role "Contributor" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-contoso-dev"

az ad sp create-for-rbac \
  --name "sp-ado-contoso-staging" \
  --role "Contributor" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-contoso-staging"

az ad sp create-for-rbac \
  --name "sp-ado-contoso-prod" \
  --role "Contributor" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod"
```

Crie conexões de serviço no Azure DevOps:

```bash
# Create the development service connection
az devops service-endpoint azurerm create \
  --name "Azure-Dev" \
  --azure-rm-service-principal-id <dev-sp-app-id> \
  --azure-rm-subscription-id <subscription-id> \
  --azure-rm-subscription-name "Contoso Dev" \
  --azure-rm-tenant-id <tenant-id>

# Create staging and production connections similarly
az devops service-endpoint azurerm create \
  --name "Azure-Staging" \
  --azure-rm-service-principal-id <staging-sp-app-id> \
  --azure-rm-subscription-id <subscription-id> \
  --azure-rm-subscription-name "Contoso Staging" \
  --azure-rm-tenant-id <tenant-id>

az devops service-endpoint azurerm create \
  --name "Azure-Prod" \
  --azure-rm-service-principal-id <prod-sp-app-id> \
  --azure-rm-subscription-id <subscription-id> \
  --azure-rm-subscription-name "Contoso Production" \
  --azure-rm-tenant-id <tenant-id>
```

### Tarefa 4: Conexões de serviço federadas (workload identity)

Crie uma conexão de serviço usando workload identity federation para eliminar segredos.

```bash
# Create the app registration
az ad app create --display-name "sp-ado-contoso-federated"

APP_OBJECT_ID=$(az ad app list --display-name "sp-ado-contoso-federated" --query "[0].id" -o tsv)
APP_CLIENT_ID=$(az ad app list --display-name "sp-ado-contoso-federated" --query "[0].appId" -o tsv)

# Create the federated credential for the service connection
az ad app federated-credential create \
  --id $APP_OBJECT_ID \
  --parameters '{
    "name": "ado-contoso-prod-connection",
    "issuer": "https://vstoken.dev.azure.com/<org-guid>",
    "subject": "sc://contoso/ContosoWeb/Azure-Prod-Federated",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Create service principal and assign role
az ad sp create --id $APP_CLIENT_ID
az role assignment create \
  --assignee $APP_CLIENT_ID \
  --role "Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod"
```

No Azure DevOps, crie a conexão de serviço usando "Workload Identity federation (manual)" e forneça os detalhes do registro do aplicativo.

### Tarefa 5: Permissões de pipeline (restringir uso de conexão de serviço)

Restrinja quais pipelines podem usar cada conexão de serviço.

```bash
# Get the service endpoint ID
ENDPOINT_ID=$(az devops service-endpoint list \
  --query "[?name=='Azure-Prod'].id" -o tsv)

# Disable "Grant access permission to all pipelines"
az devops service-endpoint update \
  --id $ENDPOINT_ID \
  --enable-for-all false
```

Use ambientes com verificações de aprovação no pipeline:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

stages:
  - stage: Build
    jobs:
      - job: BuildApp
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - script: echo "Building application"

  - stage: DeployProd
    dependsOn: Build
    jobs:
      - deployment: DeployToProd
        pool:
          vmImage: 'ubuntu-latest'
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: 'Azure-Prod-Federated'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      az group show --name rg-contoso-prod
```

Configure aprovações de ambiente:

1. Pipelines > Environments > production > Approvals and checks
2. Adicione "Approvals" com o grupo Contoso-Release-Managers
3. Adicione "Branch control" para restringir apenas a `refs/heads/main`
4. Adicione "Business hours" para impedir deployments fora do horário de trabalho

### Tarefa 6: Níveis de acesso (Basic, Stakeholder, Visual Studio)

| Nível de acesso | Custo | Capacidades principais | Ideal para |
|-------------|------|-----------------|----------|
| Stakeholder | Gratuito | Visualizar backlogs, criar work items, visualizar dashboards, visualizar wiki | Product owners, gerentes, executivos |
| Basic | Pago (primeiros 5 gratuitos) | Boards, Repos, Pipelines completos, Test Plans (limitado) | Desenvolvedores, testadores, engenheiros de DevOps |
| Basic + Test Plans | Complemento pago | Test Plans completo, gerenciamento de casos de teste | Engenheiros de QA dedicados |
| Visual Studio subscription | Incluído | Mesmo que Basic, incluído com VS Enterprise/Professional | Desenvolvedores com assinaturas do VS |

```bash
# List current access level assignments
az devops user list --query "items[].{name:user.displayName, level:accessLevel.accountLicenseType}" -o table

# Change a user's access level to Stakeholder
az devops user update \
  --user user@contoso.com \
  --license-type stakeholder

# Add a new user with Basic access
az devops user add \
  --email-id newdev@contoso.com \
  --license-type express \
  --send-email-invite true
```

### Tarefa 7: Gerenciamento do ciclo de vida de PATs e políticas

Configure políticas de PAT no nível da organização:

1. Organization Settings > Policies (via portal web):
   - Restringir criação de PATs com escopo completo: Habilitado
   - Restringir criação de PATs globais: Habilitado (forçar escopo por projeto)
   - Impor tempo máximo de vida do PAT: 90 dias
   - Restringir criação de PATs com escopo de administrador: Habilitado

Auditoria e revogação de PATs:

```bash
# Via REST API: List all PATs for auditing
curl -u :$PAT \
  "https://vssps.dev.azure.com/contoso/_apis/tokens/pats?api-version=7.1-preview.1" \
  | jq '.patTokens[] | {displayName, scope, validTo}'

# Revoke a specific PAT
curl -X DELETE -u :$ADMIN_PAT \
  "https://vssps.dev.azure.com/contoso/_apis/tokens/pats?authorizationId=<pat-auth-id>&api-version=7.1-preview.1"
```

Crie um pipeline agendado que audita o uso de PATs:

```yaml
# azure-pipelines.yml
schedules:
  - cron: "0 8 * * 1"
    displayName: Weekly PAT audit
    branches:
      include:
        - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: PowerShell@2
    inputs:
      targetType: 'inline'
      script: |
        $headers = @{
          Authorization = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$(PAT_AUDIT_TOKEN)")))"
        }
        $uri = "https://vssps.dev.azure.com/contoso/_apis/tokens/pats?api-version=7.1-preview.1"
        $response = Invoke-RestMethod -Uri $uri -Headers $headers
        $expiringSoon = $response.patTokens | Where-Object {
          $_.validTo -lt (Get-Date).AddDays(14) -and $_.validTo -gt (Get-Date)
        }
        if ($expiringSoon) {
          Write-Host "##vso[task.logissue type=warning]PATs expiring within 14 days:"
          $expiringSoon | ForEach-Object {
            Write-Host "  - $($_.displayName): expires $($_.validTo)"
          }
        }
```

## Exercícios de quebra e conserto

### Cenário de quebra 1: Pipeline falha com erro de autorização de recurso

Um desenvolvedor cria um novo pipeline e referencia a conexão de serviço `Azure-Prod`. O pipeline falha com "There was a resource authorization problem."

**Causa:** A conexão de serviço tem "Grant access permission to all pipelines" desabilitado, e este pipeline não foi autorizado explicitamente.

**Diagnóstico:** Verifique o log de execução do pipeline para o erro de autorização. A interface mostrará um botão "Permit" se você tiver permissões suficientes.


<details>
<summary>Mostrar solução</summary>

**Correção:**

1. Navegue até Project Settings > Service connections > Azure-Prod > Security
2. Em "Pipeline permissions," clique no botão "+" e adicione o pipeline específico
3. Alternativamente, quando a execução do pipeline mostrar o prompt de autorização, clique em "Permit"

</details>

### Cenário de quebra 2: Usuário não consegue visualizar work items após reestruturação de grupos

Após mover usuários do grupo Project Administrators para grupos específicos de equipe, os usuários relatam que não conseguem visualizar work items.

**Causa:** Os grupos personalizados não herdam do grupo interno "Contributors", que possui acesso de leitura padrão a work items.


<details>
<summary>Mostrar solução</summary>

**Correção:**

```bash
# Make the custom group a member of Contributors (inherits basic permissions)
az devops security group membership add \
  --group "vstfs:///Classification/TeamProject/<project-id>\\Contributors" \
  --member-id <custom-group-descriptor>
```

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso quer garantir que apenas o pipeline Production-Deploy possa usar a conexão de serviço 'Azure-Prod'. O que você deve configurar?",
    options: [
      "Definir a conexão de serviço como \"Grant access permission to all pipelines\" e adicionar uma condição YAML",
      "Desabilitar \"Grant access permission to all pipelines\" e adicionar explicitamente apenas o pipeline Production-Deploy às permissões de pipeline da conexão de serviço",
      "Criar um projeto separado do Azure DevOps para pipelines de produção",
      "Usar variáveis de pipeline para restringir quais estágios podem acessar a conexão"
    ],
    correctIndex: 1,
    explanation: "Desabilitar \"Grant access permission to all pipelines\" e adicionar explicitamente apenas o pipeline específico às permissões da conexão de serviço garante que nenhum outro pipeline possa referenciar esta conexão. Este é o modelo de autorização integrado para conexões de serviço no Azure DevOps."
  },
  {
    question: "A Contoso tem 200 usuários: 150 desenvolvedores, 30 gerentes de produto que precisam apenas de acesso a work items, e 20 executivos que visualizam dashboards. Qual é a atribuição de nível de acesso mais econômica?",
    options: [
      "200 licenças Basic",
      "150 Basic + 50 Stakeholder",
      "200 Stakeholder",
      "150 Basic + 30 Basic + 20 Stakeholder"
    ],
    correctIndex: 1,
    explanation: "O acesso Stakeholder é gratuito e fornece a capacidade de visualizar e criar work items, visualizar dashboards e participar de discussões. Gerentes de produto e executivos que não precisam de acesso ao código, gerenciamento de pipelines ou planos de teste devem usar o acesso Stakeholder. Apenas desenvolvedores que precisam dos recursos completos de Repos, Pipelines e Boards requerem acesso Basic."
  },
  {
    question: "Uma política organizacional exige que todos os PATs tenham escopo de projeto com tempo máximo de vida de 90 dias. Onde você deve configurar essas restrições?",
    options: [
      "Project Settings > Policies",
      "Organization Settings > Policies",
      "Configurações pessoais de cada usuário",
      "Microsoft Entra Conditional Access"
    ],
    correctIndex: 1,
    explanation: "As políticas de ciclo de vida de PATs (tempo máximo de vida, restrições de escopo e restrições de escopo de administrador) são configuradas no nível de Organization Settings em Policies. Estas se aplicam a todos os usuários na organização e não podem ser substituídas no nível do projeto."
  },
  {
    question: "Uma equipe precisa fazer deploy em ambientes de desenvolvimento e produção a partir de um pipeline. A produção requer aprovação do gerente de release. Qual é a configuração correta?",
    options: [
      "Criar dois pipelines separados com triggers diferentes",
      "Usar um único pipeline com estágios e configurar uma verificação de Approvals no recurso de ambiente de produção",
      "Adicionar uma tarefa de intervenção manual no YAML do pipeline",
      "Configurar branch policies que exigem aprovação na branch main"
    ],
    correctIndex: 1,
    explanation: "Os ambientes do Azure DevOps suportam Approvals e checks que controlam deployments. Configurar uma verificação de aprovação no ambiente de produção significa que qualquer estágio de pipeline que tenha como alvo esse ambiente será pausado para aprovação. Isso fornece um ponto de controle centralizado e reutilizável, independentemente de qual pipeline é usado."
  }
]} />

## Limpeza

```bash
# Delete service connections
az devops service-endpoint delete --id <endpoint-id> --yes

# Delete security groups
az devops security group delete --id <group-descriptor>

# Delete service principals
az ad sp delete --id $(az ad sp list --display-name "sp-ado-contoso-dev" --query "[0].id" -o tsv)
az ad sp delete --id $(az ad sp list --display-name "sp-ado-contoso-staging" --query "[0].id" -o tsv)
az ad sp delete --id $(az ad sp list --display-name "sp-ado-contoso-prod" --query "[0].id" -o tsv)
az ad app delete --id $APP_OBJECT_ID

# Delete resource groups
az group delete --name rg-contoso-dev --yes --no-wait
az group delete --name rg-contoso-staging --yes --no-wait
az group delete --name rg-contoso-prod --yes --no-wait
```
