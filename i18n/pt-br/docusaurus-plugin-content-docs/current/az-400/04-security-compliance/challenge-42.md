---
sidebar_position: 4
title: "Desafio 42: Gerenciamento de segredos"
sidebar_label: "Desafio 42: Gerenciamento de segredos"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 42: Gerenciamento de segredos

## Habilidades do exame abordadas

- Implementar e gerenciar segredos, chaves e certificados usando o Azure Key Vault
- Implementar autenticação sem segredos (workload identity federation/OIDC)

## Cenário

A Contoso Ltd armazena strings de conexão de banco de dados e chaves de API diretamente no Azure Pipelines e GitHub Actions como variáveis de pipeline em texto simples. Uma auditoria de segurança recente descobriu que 34 segredos estão acessíveis a todos os 150 contribuidores em 12 repositórios. Três chaves de API foram encontradas em logs de pipeline devido a instruções echo acidentais. Você deve implementar gerenciamento centralizado de segredos usando o Azure Key Vault e eliminar segredos armazenados onde possível usando workload identity federation.

## Pré-requisitos

- Assinatura Azure com acesso de Contributor
- Azure CLI instalado
- Repositório GitHub e projeto do Azure DevOps
- Um aplicativo web existente (App Service) para testes

## Tarefas

### Tarefa 1: Criar Azure Key Vault e armazenar segredos

```bash
# Create resource group
az group create --name rg-contoso-secrets --location eastus

# Create Key Vault with RBAC authorization (recommended over access policies)
az keyvault create \
  --name kv-contoso-secrets-001 \
  --resource-group rg-contoso-secrets \
  --location eastus \
  --enable-rbac-authorization true \
  --sku standard

# Assign yourself the Key Vault Secrets Officer role
USER_ID=$(az ad signed-in-user show --query id -o tsv)

az role assignment create \
  --assignee $USER_ID \
  --role "Key Vault Secrets Officer" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001"

# Store secrets
az keyvault secret set \
  --vault-name kv-contoso-secrets-001 \
  --name "SqlConnectionString" \
  --value "Server=tcp:sql-contoso.database.windows.net,1433;Database=ContosoDb;User ID=appuser;Password=SecureP@ss123;Encrypt=true"

az keyvault secret set \
  --vault-name kv-contoso-secrets-001 \
  --name "ApiKey-PaymentGateway" \
  --value "pk_live_abc123def456ghi789"

az keyvault secret set \
  --vault-name kv-contoso-secrets-001 \
  --name "StorageAccountKey" \
  --value "DefaultEndpointsProtocol=https;AccountName=stcontoso;AccountKey=base64encodedkey=="

# Set expiration on secrets
az keyvault secret set-attributes \
  --vault-name kv-contoso-secrets-001 \
  --name "ApiKey-PaymentGateway" \
  --expires "2025-12-31T23:59:59Z"

# List all secrets with their expiration status
az keyvault secret list \
  --vault-name kv-contoso-secrets-001 \
  --query "[].{name:name, expires:attributes.expires, enabled:attributes.enabled}" -o table
```

### Tarefa 2: Integrar Key Vault com GitHub Actions

```yaml
# .github/workflows/deploy-with-keyvault.yml
name: Deploy with Key Vault secrets
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

      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Get secrets from Key Vault
        uses: Azure/get-keyvault-secrets@v1
        with:
          keyvault: kv-contoso-secrets-001
          secrets: 'SqlConnectionString, ApiKey-PaymentGateway'
        id: keyvault

      - name: Deploy with secrets (automatically masked in logs)
        run: |
          az webapp config appsettings set \
            --name app-contoso-web \
            --resource-group rg-contoso-secrets \
            --settings \
              "ConnectionStrings__Default=${{ steps.keyvault.outputs.SqlConnectionString }}" \
              "PaymentGateway__ApiKey=${{ steps.keyvault.outputs.ApiKey-PaymentGateway }}"
```

Alternativa usando Azure CLI diretamente:

```yaml
      - name: Get secret via Azure CLI
        id: get-secret
        run: |
          SECRET=$(az keyvault secret show \
            --vault-name kv-contoso-secrets-001 \
            --name SqlConnectionString \
            --query value -o tsv)
          echo "::add-mask::$SECRET"
          echo "sql-connection=$SECRET" >> $GITHUB_OUTPUT

      - name: Use secret in deployment
        run: |
          az webapp config connection-string set \
            --name app-contoso-web \
            --resource-group rg-contoso-secrets \
            --connection-string-type SQLAzure \
            --settings Default='${{ steps.get-secret.outputs.sql-connection }}'
```

### Tarefa 3: Integrar Key Vault com Azure Pipelines

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: AzureKeyVault@2
    inputs:
      azureSubscription: 'Azure-Prod-Federated'
      KeyVaultName: 'kv-contoso-secrets-001'
      SecretsFilter: 'SqlConnectionString,ApiKey-PaymentGateway,StorageAccountKey'
      RunAsPreJob: true
    displayName: 'Fetch secrets from Key Vault'

  - script: |
      echo "Deploying application..."
      echo "Connection string length: ${#SQLCONNECTIONSTRING}"
    displayName: 'Verify secrets loaded (length only, value is masked)'
    env:
      SQLCONNECTIONSTRING: $(SqlConnectionString)

  - task: AzureWebApp@1
    inputs:
      azureSubscription: 'Azure-Prod-Federated'
      appType: 'webApp'
      appName: 'app-contoso-web'
      appSettings: |
        -ConnectionStrings__Default "$(SqlConnectionString)"
        -PaymentGateway__ApiKey "$(ApiKey-PaymentGateway)"
```

### Tarefa 4: Grupos de variáveis vinculados ao Key Vault

Crie um grupo de variáveis que busca dinamicamente do Key Vault durante a execução do pipeline:

1. Navegue até Pipelines > Library > + Variable group
2. Nome: "KeyVault-Production-Secrets"
3. Link secrets from an Azure key vault: habilitado
4. Azure subscription: Azure-Prod-Federated
5. Key vault name: kv-contoso-secrets-001
6. Selecione os segredos para vincular: SqlConnectionString, ApiKey-PaymentGateway

Use o grupo de variáveis em um pipeline:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

variables:
  - group: KeyVault-Production-Secrets

pool:
  vmImage: 'ubuntu-latest'

steps:
  - script: |
      echo "Secrets from variable group are automatically masked in logs"
      echo "$(SqlConnectionString)"
    displayName: 'Demonstrate auto-masking'

  - task: AzureCLI@2
    inputs:
      azureSubscription: 'Azure-Prod-Federated'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        az webapp config appsettings set \
          --name app-contoso-web \
          --resource-group rg-contoso-secrets \
          --settings "DB_CONNECTION=$(SqlConnectionString)"
```

### Tarefa 5: Implementar OIDC/workload identity federation (padrão sem segredos)

Elimine completamente segredos armazenados usando managed identity para comunicação entre aplicação e serviço.

```bash
# Enable system-assigned managed identity on the App Service
az webapp identity assign \
  --name app-contoso-web \
  --resource-group rg-contoso-secrets

WEBAPP_IDENTITY=$(az webapp identity show \
  --name app-contoso-web \
  --resource-group rg-contoso-secrets \
  --query principalId -o tsv)

# Grant the App Service identity direct access to SQL Database
# (eliminates the stored connection string with password)
az sql server ad-admin create \
  --server-name sql-contoso \
  --resource-group rg-contoso-secrets \
  --display-name "App Service Identity" \
  --object-id $WEBAPP_IDENTITY

# Grant Key Vault access to the App Service (for runtime secret retrieval)
az role assignment create \
  --assignee-object-id $WEBAPP_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001"

# Configure App Service to use Key Vault references for remaining secrets
az webapp config appsettings set \
  --name app-contoso-web \
  --resource-group rg-contoso-secrets \
  --settings "PaymentGateway__ApiKey=@Microsoft.KeyVault(VaultName=kv-contoso-secrets-001;SecretName=ApiKey-PaymentGateway)"

# Update the connection string to use managed identity (no password)
az webapp config connection-string set \
  --name app-contoso-web \
  --resource-group rg-contoso-secrets \
  --connection-string-type SQLAzure \
  --settings Default="Server=tcp:sql-contoso.database.windows.net,1433;Database=ContosoDb;Authentication=Active Directory Managed Identity;Encrypt=true"
```

### Tarefa 6: Automação de rotação de segredos

Crie uma assinatura do Event Grid para eventos de segredo próximo à expiração:

```bash
# Subscribe to Key Vault secret expiry events
az eventgrid event-subscription create \
  --name secret-rotation-sub \
  --source-resource-id "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001" \
  --endpoint-type azurefunction \
  --endpoint "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.Web/sites/func-contoso-rotation/functions/SecretRotation" \
  --included-event-types "Microsoft.KeyVault.SecretNearExpiry"

# Enable Key Vault diagnostic logging to track secret access
az monitor diagnostic-settings create \
  --name kv-diagnostics \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001" \
  --workspace "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.OperationalInsights/workspaces/law-contoso" \
  --logs '[{"category":"AuditEvent","enabled":true}]'
```

### Tarefa 7: Políticas de acesso do Key Vault vs RBAC

| Recurso | Políticas de acesso | Azure RBAC |
|---------|----------------|------------|
| Granularidade | Operações de chave, segredo, certificado | Funções granulares no plano de dados |
| Escopo | Apenas no nível do cofre | Assinatura, RG, cofre ou segredo individual |
| Gerenciamento | Configuração por cofre | Centralizado com Azure RBAC |
| Acesso condicional | Não | Sim (via Microsoft Entra ID) |
| Auditoria | Diagnósticos do cofre | Azure Activity Log + diagnósticos do cofre |
| Recomendado para | Configurações legadas | Novos deployments (recomendado pela Microsoft) |

Funções RBAC do Key Vault:

| Função | Propósito |
|------|---------|
| Key Vault Administrator | Gerenciamento completo de todo o conteúdo do cofre |
| Key Vault Secrets Officer | Criar, ler, atualizar, excluir segredos |
| Key Vault Secrets User | Ler apenas valores de segredos |
| Key Vault Certificates Officer | Gerenciar certificados |
| Key Vault Crypto Officer | Gerenciar chaves |
| Key Vault Reader | Ler apenas metadados (não valores de segredos) |

```bash
# Grant pipeline identity read-only access to secrets
az role assignment create \
  --assignee <pipeline-sp-id> \
  --role "Key Vault Secrets User" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001"

# Grant security team full vault management
az role assignment create \
  --assignee <security-team-group-id> \
  --role "Key Vault Administrator" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001"
```

## Exercícios de quebra e conserto

### Cenário de quebra 1: Pipeline retorna 403 ao ler o Key Vault

A tarefa AzureKeyVault@2 falha com "Access denied. Caller was not found on any access policy."

**Causa:** O Key Vault usa autorização RBAC, mas o service principal só tem uma atribuição de política de acesso (ou nenhuma função RBAC).

**Diagnóstico:**

```bash
# Check authorization mode
az keyvault show --name kv-contoso-secrets-001 \
  --query "properties.enableRbacAuthorization"

# If true, check RBAC role assignments
az role assignment list \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001" \
  --query "[].{principal:principalName, role:roleDefinitionName}" -o table
```


<details>
<summary>Mostrar solução</summary>

**Correção:**

```bash
az role assignment create \
  --assignee <pipeline-sp-id> \
  --role "Key Vault Secrets User" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001"
```

</details>

### Cenário de quebra 2: Referência do Key Vault mostra erro no App Service

A configuração do aplicativo usando a sintaxe `@Microsoft.KeyVault(...)` mostra um indicador de status vermelho no portal.

**Causa:** A managed identity do App Service não possui a função Key Vault Secrets User, ou a identidade não está habilitada.

**Diagnóstico:**

```bash
# Verify managed identity is enabled
az webapp identity show --name app-contoso-web --resource-group rg-contoso-secrets

# Check role assignments
az role assignment list --assignee $WEBAPP_IDENTITY --all \
  --query "[?contains(scope, 'kv-contoso')]"
```


<details>
<summary>Mostrar solução</summary>

**Correção:**

```bash
az role assignment create \
  --assignee-object-id $WEBAPP_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001"
```

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso quer que os segredos do pipeline reflitam automaticamente a versão mais recente no Key Vault sem alterações no pipeline. Qual abordagem atinge isso para o Azure Pipelines?",
    options: [
      "Armazenar segredos como variáveis de pipeline e atualizá-los manualmente após cada rotação",
      "Usar um grupo de variáveis vinculado ao Azure Key Vault",
      "Usar a tarefa AzureKeyVault@2 com IDs de versão específicos de segredos",
      "Copiar segredos para variáveis de pipeline usando uma tarefa de script"
    ],
    correctIndex: 1,
    explanation: "Um grupo de variáveis vinculado ao Key Vault busca dinamicamente a versão mais recente do segredo durante a execução do pipeline. Quando um segredo é rotacionado no Key Vault, a próxima execução do pipeline automaticamente obtém o novo valor sem alterações na configuração. A tarefa AzureKeyVault@2 também funciona, mas os grupos de variáveis fornecem uma abstração reutilizável em vários pipelines."
  },
  {
    question: "Um aplicativo App Service precisa acessar o Azure SQL Database. Qual é a abordagem de autenticação mais segura?",
    options: [
      "Armazenar a string de conexão SQL com nome de usuário e senha no Key Vault",
      "Usar uma managed identity atribuída pelo sistema com autenticação Microsoft Entra para SQL",
      "Usar um service principal com um certificado de cliente armazenado no Key Vault",
      "Usar usuários de banco de dados contido SQL com senhas rotacionadas mensalmente"
    ],
    correctIndex: 1,
    explanation: "Usar uma managed identity com autenticação Microsoft Entra elimina todas as credenciais armazenadas. O App Service se autentica usando seu token de managed identity, gerenciado automaticamente pelo Azure. Nenhum segredo, senha ou certificado precisa ser armazenado ou rotacionado."
  },
  {
    question: "Qual função RBAC do Azure Key Vault deve ser atribuída a um pipeline de CI/CD que precisa ler valores de segredos durante o deployment, mas não deve criar ou excluir segredos?",
    options: [
      "Key Vault Administrator",
      "Key Vault Secrets Officer",
      "Key Vault Secrets User",
      "Key Vault Reader"
    ],
    correctIndex: 2,
    explanation: "Key Vault Secrets User permite ler valores de segredos (get e list), que é o que um pipeline precisa. Key Vault Reader apenas lê metadados sem valores. Secrets Officer e Administrator fornecem acesso de escrita desnecessário."
  },
  {
    question: "A Contoso usa referências do Key Vault ('@Microsoft.KeyVault(...)') nas configurações do App Service. O que acontece quando um segredo é rotacionado no Key Vault?",
    options: [
      "O App Service obtém o novo valor imediatamente",
      "O App Service obtém o novo valor dentro de 24 horas via atualização em segundo plano",
      "O App Service deve ser reiniciado para ler o novo valor",
      "A referência deve ser atualizada para especificar a nova versão do segredo"
    ],
    correctIndex: 1,
    explanation: "As referências do Key Vault no App Service são atualizadas periodicamente (aproximadamente a cada 24 horas). O aplicativo não precisa de reinicialização, e a referência resolve para a versão mais recente automaticamente. Para atualização imediata, você pode disparar uma atualização de configurações ou reiniciar o aplicativo."
  }
]} />

## Limpeza

```bash
# Delete the Key Vault (enters soft-delete state)
az keyvault delete --name kv-contoso-secrets-001 --resource-group rg-contoso-secrets
az keyvault purge --name kv-contoso-secrets-001 --location eastus

# Delete resource group
az group delete --name rg-contoso-secrets --yes --no-wait

# Remove variable groups in Azure DevOps (Pipelines > Library > delete)
# Clean up GitHub workflow files
rm -f .github/workflows/deploy-with-keyvault.yml
git add -A && git commit -m "cleanup: remove challenge 42 workflows" && git push
```
