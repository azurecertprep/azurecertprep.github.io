---
sidebar_position: 6
title: "Desafio 06: Managed Identities para Recursos do Azure"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 06: Managed Identities para Recursos do Azure

## Habilidades do exame cobertas

- Implementar Managed Identities para recursos do Azure
- Escolher entre Managed Identity atribuída pelo sistema e atribuída pelo usuário
- Configurar permissões de Managed Identity usando RBAC
- Usar Managed Identities para acessar serviços do Azure com segurança
- Implementar federação de Managed Identity para workloads externos
- Solucionar problemas de autenticação com Managed Identity

## Cenário

A equipe de desenvolvimento da Contoso Ltd tem armazenado strings de conexão e credenciais de contas de serviço em arquivos de configuração de aplicativos e variáveis de ambiente. Uma auditoria de segurança recente revelou credenciais hard-coded no controle de código-fonte e segredos compartilhados entre múltiplos aplicativos. O arquiteto de segurança deve implementar Managed Identities para eliminar a sobrecarga de gerenciamento de credenciais, estabelecer comunicação segura entre serviços e configurar federação de Workload Identities para pipelines de CI/CD executados no GitHub Actions.

---

## Pré-requisitos

- Assinatura do Azure com acesso de Contributor
- Azure CLI instalado e autenticado
- Um resource group existente ou capacidade de criar um
- Compreensão básica de Azure RBAC

---

## Tarefa 1: Criar recursos com Managed Identity atribuída pelo sistema

Faça o deploy de um Azure App Service e Azure Function com Managed Identities atribuídas pelo sistema habilitadas.

```bash
# Set variables
RG_NAME="rg-contoso-managed-identity-lab"
LOCATION="eastus2"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Create an App Service plan
az appservice plan create \
  --name "asp-contoso-lab" \
  --resource-group $RG_NAME \
  --sku B1 \
  --is-linux

# Create a Web App with system-assigned managed identity
az webapp create \
  --name "app-contoso-api-$(openssl rand -hex 4)" \
  --resource-group $RG_NAME \
  --plan "asp-contoso-lab" \
  --runtime "DOTNET|8.0" \
  --assign-identity "[system]"

# Get the web app name and identity
WEB_APP_NAME=$(az webapp list --resource-group $RG_NAME --query "[0].name" -o tsv)
WEBAPP_IDENTITY=$(az webapp identity show \
  --name $WEB_APP_NAME \
  --resource-group $RG_NAME \
  --query principalId -o tsv)

echo "Web App System Identity: $WEBAPP_IDENTITY"

# Create an Azure Function App with system-assigned managed identity
STORAGE_NAME="stcontosolab$(openssl rand -hex 4)"
az storage account create \
  --name $STORAGE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --sku Standard_LRS

az functionapp create \
  --name "func-contoso-processor-$(openssl rand -hex 4)" \
  --resource-group $RG_NAME \
  --storage-account $STORAGE_NAME \
  --consumption-plan-location $LOCATION \
  --runtime dotnet-isolated \
  --functions-version 4 \
  --assign-identity "[system]"

FUNC_APP_NAME=$(az functionapp list --resource-group $RG_NAME --query "[0].name" -o tsv)
FUNC_IDENTITY=$(az functionapp identity show \
  --name $FUNC_APP_NAME \
  --resource-group $RG_NAME \
  --query principalId -o tsv)

echo "Function App System Identity: $FUNC_IDENTITY"
```

## Tarefa 2: Criar e atribuir Managed Identities atribuídas pelo usuário

Crie Managed Identities atribuídas pelo usuário para padrões de acesso compartilhado entre múltiplos recursos.

```bash
# Create a user-assigned managed identity for shared database access
az identity create \
  --name "id-contoso-db-reader" \
  --resource-group $RG_NAME \
  --location $LOCATION

# Create another identity for blob storage access
az identity create \
  --name "id-contoso-storage-writer" \
  --resource-group $RG_NAME \
  --location $LOCATION

# Get identity resource IDs
DB_IDENTITY_ID=$(az identity show \
  --name "id-contoso-db-reader" \
  --resource-group $RG_NAME \
  --query id -o tsv)

STORAGE_IDENTITY_ID=$(az identity show \
  --name "id-contoso-storage-writer" \
  --resource-group $RG_NAME \
  --query id -o tsv)

DB_IDENTITY_CLIENT_ID=$(az identity show \
  --name "id-contoso-db-reader" \
  --resource-group $RG_NAME \
  --query clientId -o tsv)

DB_IDENTITY_PRINCIPAL_ID=$(az identity show \
  --name "id-contoso-db-reader" \
  --resource-group $RG_NAME \
  --query principalId -o tsv)

# Assign user-assigned identity to the Web App
az webapp identity assign \
  --name $WEB_APP_NAME \
  --resource-group $RG_NAME \
  --identities $DB_IDENTITY_ID $STORAGE_IDENTITY_ID

# Assign user-assigned identity to the Function App
az functionapp identity assign \
  --name $FUNC_APP_NAME \
  --resource-group $RG_NAME \
  --identities $DB_IDENTITY_ID

# Verify all identities assigned to the web app
az webapp identity show --name $WEB_APP_NAME --resource-group $RG_NAME
```

## Tarefa 3: Conceder acesso às Managed Identities para recursos do Azure

Atribua funções RBAC às Managed Identities para acessar Key Vault, Storage e SQL Database.

```bash
# Create a Key Vault
KV_NAME="kv-contoso-lab-$(openssl rand -hex 4)"
az keyvault create \
  --name $KV_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --enable-rbac-authorization true

# Grant the web app's system identity access to Key Vault secrets
az role assignment create \
  --assignee-object-id $WEBAPP_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope $(az keyvault show --name $KV_NAME --query id -o tsv)

# Grant the user-assigned storage identity access to Blob Storage
STORAGE_IDENTITY_PRINCIPAL=$(az identity show \
  --name "id-contoso-storage-writer" \
  --resource-group $RG_NAME \
  --query principalId -o tsv)

az role assignment create \
  --assignee-object-id $STORAGE_IDENTITY_PRINCIPAL \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" \
  --scope $(az storage account show --name $STORAGE_NAME --query id -o tsv)

# Grant the function app's system identity access to read storage queues
az role assignment create \
  --assignee-object-id $FUNC_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Queue Data Reader" \
  --scope $(az storage account show --name $STORAGE_NAME --query id -o tsv)

# Grant the DB reader identity access to SQL (using Graph API for Entra auth)
# This would be done on the SQL Database itself:
# CREATE USER [id-contoso-db-reader] FROM EXTERNAL PROVIDER;
# ALTER ROLE db_datareader ADD MEMBER [id-contoso-db-reader];

# List all role assignments for our identities
az role assignment list --assignee $WEBAPP_IDENTITY --all -o table
az role assignment list --assignee $STORAGE_IDENTITY_PRINCIPAL --all -o table
```

## Tarefa 4: Configurar o App Service para usar Managed Identity com referências do Key Vault

Use referências do Key Vault na configuração do App Service para acessar segredos com segurança sem alterações no código.

```bash
# Add a secret to Key Vault
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "DatabaseConnectionString" \
  --value "Server=tcp:contoso-sql.database.windows.net;Database=ContosoDb;Authentication=Active Directory Managed Identity;"

az keyvault secret set \
  --vault-name $KV_NAME \
  --name "ApiKey" \
  --value "sk-contoso-api-key-12345"

# Configure the Web App to use Key Vault references
az webapp config appsettings set \
  --name $WEB_APP_NAME \
  --resource-group $RG_NAME \
  --settings \
    "DatabaseConnection=@Microsoft.KeyVault(VaultName=$KV_NAME;SecretName=DatabaseConnectionString)" \
    "ApiKey=@Microsoft.KeyVault(VaultName=$KV_NAME;SecretName=ApiKey)"

# Verify the Key Vault reference resolution
az webapp config appsettings list \
  --name $WEB_APP_NAME \
  --resource-group $RG_NAME \
  --query "[?contains(value,'Microsoft.KeyVault')].{name:name, value:value}" -o table

# Check Key Vault reference status
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG_NAME/providers/Microsoft.Web/sites/$WEB_APP_NAME/config/configreferences/appsettings?api-version=2022-03-01" \
  --headers "Content-Type=application/json"
```

## Tarefa 5: Configurar federação de Workload Identity para GitHub Actions

Configure credenciais de identidade federada para permitir que o GitHub Actions se autentique como uma Managed Identity do Azure sem segredos.

```bash
# Create a user-assigned identity for the CI/CD pipeline
az identity create \
  --name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --location $LOCATION

GITHUB_IDENTITY_ID=$(az identity show \
  --name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --query id -o tsv)

GITHUB_IDENTITY_CLIENT_ID=$(az identity show \
  --name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --query clientId -o tsv)

GITHUB_IDENTITY_PRINCIPAL_ID=$(az identity show \
  --name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --query principalId -o tsv)

# Create federated credential for GitHub Actions (main branch)
az identity federated-credential create \
  --name "github-actions-main" \
  --identity-name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --issuer "https://token.actions.githubusercontent.com" \
  --subject "repo:contoso/contoso-app:ref:refs/heads/main" \
  --audiences "api://AzureADTokenExchange"

# Create federated credential for pull requests
az identity federated-credential create \
  --name "github-actions-pr" \
  --identity-name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --issuer "https://token.actions.githubusercontent.com" \
  --subject "repo:contoso/contoso-app:pull_request" \
  --audiences "api://AzureADTokenExchange"

# Create federated credential for a specific environment
az identity federated-credential create \
  --name "github-actions-production" \
  --identity-name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --issuer "https://token.actions.githubusercontent.com" \
  --subject "repo:contoso/contoso-app:environment:production" \
  --audiences "api://AzureADTokenExchange"

# Grant the deployment identity Contributor access to the resource group
az role assignment create \
  --assignee-object-id $GITHUB_IDENTITY_PRINCIPAL_ID \
  --assignee-principal-type ServicePrincipal \
  --role "Contributor" \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG_NAME"

# List federated credentials
az identity federated-credential list \
  --identity-name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --query "[].{name:name, issuer:issuer, subject:subject}" -o table
```

## Tarefa 6: Testar acesso da Managed Identity e verificar aquisição de token

Valide que as Managed Identities conseguem adquirir tokens com sucesso e acessar recursos.

```bash
# Test token acquisition from within the App Service (via Kudu console)
# This simulates what the app code does internally
# The IDENTITY_ENDPOINT and IDENTITY_HEADER are set automatically

# Verify the web app's identity configuration
az webapp show --name $WEB_APP_NAME --resource-group $RG_NAME \
  --query "identity.{type:type, systemPrincipalId:principalId, userAssigned:userAssignedIdentities}" -o json

# Verify role assignments are effective
az role assignment list \
  --assignee $WEBAPP_IDENTITY \
  --all \
  --query "[].{role:roleDefinitionName, scope:scope}" -o table

# Test Key Vault access with the managed identity (simulating from local dev)
# In production, the app uses DefaultAzureCredential which auto-detects managed identity
az keyvault secret show \
  --vault-name $KV_NAME \
  --name "DatabaseConnectionString" \
  --query "value" -o tsv

# Verify storage access
az storage blob list \
  --account-name $STORAGE_NAME \
  --container-name "test" \
  --auth-mode login 2>/dev/null || echo "Container not created yet - identity permissions verified via RBAC"

# Check for any identity-related issues in App Service logs
az webapp log show --name $WEB_APP_NAME --resource-group $RG_NAME --only-show-errors
```

---

## Quebra & conserta

### Cenário 1: Referência do Key Vault retorna "SecretNotFound" no App Service

O aplicativo web mostra erros de referência do Key Vault no status das configurações do app. A Managed Identity foi configurada, mas os segredos não podem ser resolvidos.

<details>
<summary>Mostrar solução</summary>

```bash
# Check Key Vault reference status
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG_NAME/providers/Microsoft.Web/sites/$WEB_APP_NAME/config/configreferences/appsettings?api-version=2022-03-01"

# Common issues:
# 1. Identity doesn't have the correct RBAC role on Key Vault
az role assignment list \
  --assignee $WEBAPP_IDENTITY \
  --scope $(az keyvault show --name $KV_NAME --query id -o tsv) \
  --query "[].roleDefinitionName" -o tsv

# Fix: Assign Key Vault Secrets User role if missing
az role assignment create \
  --assignee-object-id $WEBAPP_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope $(az keyvault show --name $KV_NAME --query id -o tsv)

# 2. Key Vault might be using access policies instead of RBAC
KV_AUTH_MODE=$(az keyvault show --name $KV_NAME --query "properties.enableRbacAuthorization" -o tsv)
if [ "$KV_AUTH_MODE" != "true" ]; then
  # Add access policy for the identity
  az keyvault set-policy \
    --name $KV_NAME \
    --object-id $WEBAPP_IDENTITY \
    --secret-permissions get list
fi

# 3. Key Vault reference syntax might be wrong
# Correct format: @Microsoft.KeyVault(VaultName=myvault;SecretName=mysecret)
az webapp config appsettings list \
  --name $WEB_APP_NAME \
  --resource-group $RG_NAME \
  --query "[?contains(value,'KeyVault')]"

# 4. Key Vault firewall might be blocking App Service
az keyvault network-rule list --name $KV_NAME
# Add the App Service's outbound IPs or use private endpoint
```

</details>

### Cenário 2: Aquisição de token da Managed Identity falha com "identity not found"

Um Function App implantado em uma nova região falha com "ManagedIdentityCredential authentication unavailable. The requested identity has not been assigned to this resource." O mesmo código funciona na região original.

<details>
<summary>Mostrar solução</summary>

```bash
# Check if the Function App has identity assigned
az functionapp identity show --name $FUNC_APP_NAME --resource-group $RG_NAME

# If using user-assigned identity, verify it's assigned to THIS function app
az functionapp show --name $FUNC_APP_NAME --resource-group $RG_NAME \
  --query "identity.userAssignedIdentities"

# Common issue: The code specifies a user-assigned identity client ID
# but the identity isn't assigned to the new deployment
# Fix: Assign the user-assigned identity
az functionapp identity assign \
  --name $FUNC_APP_NAME \
  --resource-group $RG_NAME \
  --identities $DB_IDENTITY_ID

# If using DefaultAzureCredential with a specific client ID in config:
# Ensure AZURE_CLIENT_ID environment variable matches the assigned identity
az functionapp config appsettings set \
  --name $FUNC_APP_NAME \
  --resource-group $RG_NAME \
  --settings "AZURE_CLIENT_ID=$DB_IDENTITY_CLIENT_ID"

# Verify the identity is propagated (may take a few minutes)
az functionapp identity show --name $FUNC_APP_NAME --resource-group $RG_NAME \
  --query "{system:principalId, userAssigned:userAssignedIdentities}"

# Restart the function app to pick up identity changes
az functionapp restart --name $FUNC_APP_NAME --resource-group $RG_NAME
```

</details>

### Cenário 3: Federação de Workload Identity retorna "AADSTS700024: Client assertion is not within its valid time range"

O workflow do GitHub Actions usando federação de Workload Identity falha durante a etapa de login do Azure com um erro de validação de tempo do token.

<details>
<summary>Mostrar solução</summary>

```bash
# This error typically occurs when:
# 1. The federated credential subject doesn't match the token's claims
# 2. Clock skew between GitHub and Azure AD

# Verify the federated credential configuration
az identity federated-credential list \
  --identity-name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --query "[].{name:name, subject:subject, issuer:issuer}" -o table

# Check if the subject matches the workflow context
# For a push to main: "repo:contoso/contoso-app:ref:refs/heads/main"
# For a pull request: "repo:contoso/contoso-app:pull_request"
# For an environment: "repo:contoso/contoso-app:environment:production"

# Common fix: The subject claim doesn't match
# If the workflow runs on a tag, it needs a different credential:
az identity federated-credential create \
  --name "github-actions-tags" \
  --identity-name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --issuer "https://token.actions.githubusercontent.com" \
  --subject "repo:contoso/contoso-app:ref:refs/tags/*" \
  --audiences "api://AzureADTokenExchange"

# Verify the GitHub Actions workflow YAML uses correct parameters:
# - uses: azure/login@v2
#   with:
#     client-id: ${{ secrets.AZURE_CLIENT_ID }}
#     tenant-id: ${{ secrets.AZURE_TENANT_ID }}
#     subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

# Ensure the client-id matches the managed identity's client ID
echo "Client ID for GitHub secrets: $GITHUB_IDENTITY_CLIENT_ID"
echo "Tenant ID: $(az account show --query tenantId -o tsv)"
echo "Subscription ID: $(az account show --query id -o tsv)"
```

</details>

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Um aplicativo web precisa acessar tanto o Azure Key Vault quanto o Azure SQL Database. Três App Services separados precisam do mesmo acesso ao banco de dados. Qual é a abordagem recomendada de Managed Identity?",
    options: [
      "Usar Managed Identity atribuída pelo sistema em cada App Service com atribuições RBAC individuais",
      "Usar uma única Managed Identity atribuída pelo usuário para acesso ao banco de dados compartilhada entre os três App Services",
      "Criar um Service Principal com client secret para acesso compartilhado",
      "Usar uma única Managed Identity atribuída pelo sistema de um App Service compartilhada com os outros"
    ],
    correctIndex: 1,
    explanation: "Managed Identities atribuídas pelo usuário são ideais para padrões de acesso compartilhado. Uma única identidade atribuída pelo usuário pode ser atribuída a múltiplos recursos, mantendo permissões consistentes e simplificando o gerenciamento. Identidades atribuídas pelo sistema estão vinculadas ao ciclo de vida de um único recurso e não podem ser compartilhadas."
  },
  {
    question: "O que acontece com uma Managed Identity atribuída pelo sistema quando o recurso do Azure associado é excluído?",
    options: [
      "A identidade persiste e pode ser reatribuída a outro recurso",
      "A identidade é automaticamente excluída junto com todas as suas atribuições de função",
      "A identidade é movida para um estado de 'soft-deleted' por 30 dias",
      "A identidade permanece, mas suas atribuições de função são removidas"
    ],
    correctIndex: 1,
    explanation: "Managed Identities atribuídas pelo sistema têm o mesmo ciclo de vida que o recurso ao qual estão vinculadas. Quando o recurso é excluído, a identidade é automaticamente excluída e todas as atribuições de função associadas são removidas. Esta é uma diferença fundamental em relação às identidades atribuídas pelo usuário, que persistem independentemente."
  },
  {
    question: "O pipeline de CI/CD da Contoso no GitHub Actions precisa fazer deploy no Azure sem armazenar segredos. Qual recurso eles devem usar?",
    options: [
      "Armazenar credenciais do Azure como GitHub encrypted secrets",
      "Usar federação de Workload Identity com credencial federada em uma Managed Identity atribuída pelo usuário",
      "Criar um Service Principal de longa duração com autenticação por certificado",
      "Usar conexões de serviço do Azure DevOps com rotação automática"
    ],
    correctIndex: 1,
    explanation: "A federação de Workload Identity permite que provedores de identidade externos (como GitHub Actions) troquem seus tokens por tokens do Azure AD sem nenhuma credencial armazenada. Uma credencial federada em uma Managed Identity atribuída pelo usuário confia em tokens do provedor OIDC do GitHub para repositórios e branches específicos."
  },
  {
    question: "Um App Service usa referências do Key Vault nas configurações do app, mas algumas referências mostram 'SecretNotFound'. A Managed Identity existe e tem a função 'Reader' no Key Vault. O que está errado?",
    options: [
      "O App Service precisa ser reiniciado",
      "Referências do Key Vault requerem configuração de endpoint HTTPS",
      "A função 'Reader' fornece apenas acesso a metadados; a identidade precisa da função 'Key Vault Secrets User'",
      "O Key Vault deve estar na mesma região que o App Service"
    ],
    correctIndex: 2,
    explanation: "A função RBAC 'Reader' fornece acesso aos metadados do Key Vault (propriedades do recurso), mas não ao data plane (segredos, chaves, certificados). Para ler segredos via referências do Key Vault, a Managed Identity precisa da função 'Key Vault Secrets User' que concede acesso de leitura ao data plane de segredos."
  }
]} />

## Limpeza

```bash
# Delete the entire resource group (removes all resources)
az group delete --name $RG_NAME --yes --no-wait

# If you need to clean up individual resources:
# az webapp delete --name $WEB_APP_NAME --resource-group $RG_NAME
# az functionapp delete --name $FUNC_APP_NAME --resource-group $RG_NAME
# az keyvault delete --name $KV_NAME
# az keyvault purge --name $KV_NAME  # If soft-delete is enabled
# az identity delete --name "id-contoso-db-reader" --resource-group $RG_NAME
# az identity delete --name "id-contoso-storage-writer" --resource-group $RG_NAME
# az identity delete --name "id-contoso-github-deploy" --resource-group $RG_NAME
# az storage account delete --name $STORAGE_NAME --resource-group $RG_NAME --yes
```
