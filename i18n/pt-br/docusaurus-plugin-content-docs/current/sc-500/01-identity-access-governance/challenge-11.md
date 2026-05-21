---
sidebar_position: 11
title: "Desafio 11: RBAC e Governança"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 11: RBAC e Governança

## Habilidades do exame cobertas

- Projetar e implementar atribuições de função Azure RBAC
- Criar e gerenciar definições de funções personalizadas RBAC
- Identificar e remediar acessos com privilégios excessivos
- Implementar governança com management groups
- Configurar deny assignments e resource locks
- Usar Access Reviews e Entra ID Governance para o ciclo de vida do RBAC

## Cenário

O ambiente Azure da Contoso Ltd cresceu para mais de 50 assinaturas em 4 unidades de negócio. Uma auditoria de segurança revelou que 40% das atribuições de função concedem mais permissões do que o necessário — usuários têm Owner ou Contributor quando precisam apenas de acesso específico a recursos. A equipe de governança deve implementar uma estratégia RBAC de menor privilégio usando funções personalizadas, hierarquias de management groups e Access Reviews automatizadas para remediar privilégios excessivos e prevenir desvios futuros.

---

## Pré-requisitos

- Assinatura do Azure com a função Owner (para gerenciamento de atribuições de função)
- Função User Access Administrator no escopo do management group (para funções personalizadas)
- Azure CLI instalado e autenticado
- Microsoft Entra ID P2 (para Access Reviews)

---

## Tarefa 1: Auditar atribuições de função existentes para privilégios excessivos

Analise as atribuições RBAC atuais para identificar permissões excessivas e potenciais riscos de segurança.

```bash
# Set variables
SUB_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-rbac-lab"
LOCATION="eastus2"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# List all Owner and Contributor assignments at subscription level
az role assignment list --scope "/subscriptions/$SUB_ID" \
  --query "[?roleDefinitionName=='Owner' || roleDefinitionName=='Contributor'].{principal:principalName, role:roleDefinitionName, type:principalType, scope:scope}" -o table

# Count role assignments by role type
az role assignment list --all --query "[].roleDefinitionName" -o tsv | sort | uniq -c | sort -rn | head -20

# Find users with multiple high-privilege assignments
az role assignment list --all \
  --query "[?roleDefinitionName=='Owner' || roleDefinitionName=='Contributor' || roleDefinitionName=='User Access Administrator'].{principal:principalName, role:roleDefinitionName, scope:scope}" -o table

# Identify role assignments to individual users (should be groups)
az role assignment list --all \
  --query "[?principalType=='User'].{user:principalName, role:roleDefinitionName, scope:scope}" -o table | head -30

# Find stale assignments (service principals that no longer exist)
az role assignment list --all \
  --query "[?principalType=='ServicePrincipal' && principalName==''].{id:id, role:roleDefinitionName, scope:scope}" -o table

# Check for classic administrators (legacy)
az role assignment list --include-classic-administrators \
  --query "[?contains(roleDefinitionName,'CoAdministrator') || contains(roleDefinitionName,'ServiceAdministrator')].{principal:principalName, role:roleDefinitionName}" -o table
```

## Tarefa 2: Criar funções RBAC personalizadas para menor privilégio

Projete funções personalizadas que forneçam exatamente as permissões necessárias para funções de trabalho comuns.

```bash
# Custom Role: Key Vault Secret Reader (more restrictive than built-in)
az role definition create --role-definition '{
  "Name": "Contoso Key Vault Secret Reader",
  "Description": "Can read secrets from Key Vault but cannot list or manage them",
  "Actions": [],
  "NotActions": [],
  "DataActions": [
    "Microsoft.KeyVault/vaults/secrets/getSecret/action"
  ],
  "NotDataActions": [
    "Microsoft.KeyVault/vaults/secrets/setSecret/action",
    "Microsoft.KeyVault/vaults/secrets/delete"
  ],
  "AssignableScopes": ["/subscriptions/'"$SUB_ID"'"]
}'

# Custom Role: Network Viewer (read network config without management access)
az role definition create --role-definition '{
  "Name": "Contoso Network Viewer",
  "Description": "Can view network configurations including NSGs, route tables, and VNets",
  "Actions": [
    "Microsoft.Network/virtualNetworks/read",
    "Microsoft.Network/networkSecurityGroups/read",
    "Microsoft.Network/networkSecurityGroups/securityRules/read",
    "Microsoft.Network/routeTables/read",
    "Microsoft.Network/routeTables/routes/read",
    "Microsoft.Network/publicIPAddresses/read",
    "Microsoft.Network/networkInterfaces/read",
    "Microsoft.Network/privateEndpoints/read",
    "Microsoft.Network/privateDnsZones/read"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": ["/subscriptions/'"$SUB_ID"'"]
}'

# Custom Role: App Service Deployer (deploy without full Contributor)
az role definition create --role-definition '{
  "Name": "Contoso App Deployer",
  "Description": "Can deploy to App Service and manage application settings without infrastructure changes",
  "Actions": [
    "Microsoft.Web/sites/read",
    "Microsoft.Web/sites/config/read",
    "Microsoft.Web/sites/config/write",
    "Microsoft.Web/sites/config/list/action",
    "Microsoft.Web/sites/publishxml/action",
    "Microsoft.Web/sites/restart/action",
    "Microsoft.Web/sites/slots/read",
    "Microsoft.Web/sites/slots/config/read",
    "Microsoft.Web/sites/slots/config/write",
    "Microsoft.Web/sites/slots/restart/action",
    "Microsoft.Web/sites/slots/slotsswap/action",
    "Microsoft.Web/sites/extensions/write",
    "Microsoft.Web/sites/deployments/read",
    "Microsoft.Web/sites/deployments/write"
  ],
  "NotActions": [
    "Microsoft.Web/sites/delete",
    "Microsoft.Web/sites/write"
  ],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": ["/subscriptions/'"$SUB_ID"'"]
}'

# List custom roles in the subscription
az role definition list --custom-role-only true \
  --query "[].{name:roleName, type:roleType}" -o table
```

## Tarefa 3: Implementar atribuições de função usando grupos de segurança

Migre atribuições de usuários individuais para atribuições baseadas em grupos para melhor governança.

```bash
# Create security groups for common roles
az ad group create \
  --display-name "Azure-Readers-Production" \
  --mail-nickname "azure-readers-prod" \
  --description "Members get Reader access to production subscription"

az ad group create \
  --display-name "Azure-AppDeployers-Production" \
  --mail-nickname "azure-deployers-prod" \
  --description "Members can deploy to production App Services"

az ad group create \
  --display-name "Azure-NetworkViewers" \
  --mail-nickname "azure-network-viewers" \
  --description "Members can view network configurations"

# Get group IDs
READERS_GROUP_ID=$(az ad group show --group "Azure-Readers-Production" --query id -o tsv)
DEPLOYERS_GROUP_ID=$(az ad group show --group "Azure-AppDeployers-Production" --query id -o tsv)
NETWORK_GROUP_ID=$(az ad group show --group "Azure-NetworkViewers" --query id -o tsv)

# Assign roles to groups instead of individual users
az role assignment create \
  --assignee-object-id $READERS_GROUP_ID \
  --assignee-principal-type Group \
  --role "Reader" \
  --scope "/subscriptions/$SUB_ID"

az role assignment create \
  --assignee-object-id $DEPLOYERS_GROUP_ID \
  --assignee-principal-type Group \
  --role "Contoso App Deployer" \
  --scope "/subscriptions/$SUB_ID"

az role assignment create \
  --assignee-object-id $NETWORK_GROUP_ID \
  --assignee-principal-type Group \
  --role "Contoso Network Viewer" \
  --scope "/subscriptions/$SUB_ID"

# Add users to groups (instead of direct role assignment)
USER_ID=$(az ad user show --id "developer@contoso.com" --query id -o tsv 2>/dev/null || echo "placeholder")
# az ad group member add --group $DEPLOYERS_GROUP_ID --member-id $USER_ID

# Remove old individual assignments (after verifying group membership)
# az role assignment delete --assignee "developer@contoso.com" --role "Contributor" --scope "/subscriptions/$SUB_ID"
```

## Tarefa 4: Remediar Service Principals com privilégios excessivos

Identifique e reduza permissões para Service Principals com acesso excessivo.

```bash
# Find service principals with Owner or Contributor at subscription level
az role assignment list --all \
  --query "[?principalType=='ServicePrincipal' && (roleDefinitionName=='Owner' || roleDefinitionName=='Contributor')].{principal:principalName, role:roleDefinitionName, scope:scope}" -o table

# For each overprivileged SP, analyze what it actually needs
# Example: An automation SP with Contributor that only manages storage
# Step 1: Check the SP's activity in activity logs
# az monitor activity-log list --caller "SP_APP_ID" --offset 30d --query "[].{operation:operationName.value, time:eventTimestamp}" -o table

# Step 2: Replace broad role with specific role
# Remove Contributor
# az role assignment delete --assignee "SP_OBJECT_ID" --role "Contributor" --scope "/subscriptions/$SUB_ID"

# Add specific role
# az role assignment create --assignee-object-id "SP_OBJECT_ID" --assignee-principal-type ServicePrincipal --role "Storage Blob Data Contributor" --scope "/subscriptions/$SUB_ID/resourceGroups/rg-storage"

# Find orphaned role assignments (principal deleted but assignment remains)
ORPHANED=$(az role assignment list --all --query "[?principalName=='' || principalName==null].id" -o tsv)
echo "Found $(echo $ORPHANED | wc -w) orphaned assignments"

# Clean up orphaned assignments
for ASSIGNMENT_ID in $ORPHANED; do
  az role assignment delete --ids "$ASSIGNMENT_ID"
  echo "Removed orphaned assignment: $ASSIGNMENT_ID"
done
```

## Tarefa 5: Implementar condições em atribuições de função (ABAC)

Use o controle de acesso baseado em atributos do Azure para adicionar condições a atribuições de função para controle granular.

```bash
# Create a role assignment with conditions (ABAC)
# Example: Storage Blob Data Reader, but only for blobs with specific tags

# Create a storage account for testing
STORAGE_NAME="stcontosoabac$(openssl rand -hex 4)"
az storage account create \
  --name $STORAGE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --sku Standard_LRS \
  --allow-blob-public-access false

STORAGE_ID=$(az storage account show --name $STORAGE_NAME --resource-group $RG_NAME --query id -o tsv)

# Create a conditional role assignment
# Only allow reading blobs tagged with "Department=Marketing"
USER_OBJ_ID=$(az ad signed-in-user show --query id -o tsv)

az role assignment create \
  --assignee-object-id $USER_OBJ_ID \
  --assignee-principal-type User \
  --role "Storage Blob Data Reader" \
  --scope $STORAGE_ID \
  --condition "((!(ActionMatches{'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read'} AND NOT SubOperationMatches{'Blob.List'})) OR (@Resource[Microsoft.Storage/storageAccounts/blobServices/containers/blobs/tags:Department<\$key_case_sensitive\$>] StringEquals 'Marketing'))" \
  --condition-version "2.0"

# Create a role assignment scoped to a specific resource group only
az role assignment create \
  --assignee-object-id $DEPLOYERS_GROUP_ID \
  --assignee-principal-type Group \
  --role "Contributor" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME"

# Verify conditional assignments
az role assignment list --scope $STORAGE_ID \
  --query "[?condition!=null].{principal:principalName, role:roleDefinitionName, condition:condition}" -o table
```

## Tarefa 6: Configurar Access Reviews para governança RBAC

Configure revisões periódicas de atribuições de função para identificar e remover acessos obsoletos.

```bash
# Create an access review for subscription-level Owner role assignments
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions" \
  --headers "Content-Type=application/json" \
  --body "{
    \"displayName\": \"Azure Subscription Owner Review - Monthly\",
    \"descriptionForAdmins\": \"Monthly review of Owner role assignments on production subscriptions\",
    \"descriptionForReviewers\": \"Confirm these users/groups still need Owner access to Azure subscriptions\",
    \"scope\": {
      \"@odata.type\": \"#microsoft.graph.accessReviewQueryScope\",
      \"query\": \"/roleManagement/azure/roleAssignments?\$filter=roleDefinitionId eq 'Owner'\",
      \"queryType\": \"MicrosoftGraph\"
    },
    \"reviewers\": [
      {
        \"query\": \"./manager\",
        \"queryType\": \"MicrosoftGraph\"
      }
    ],
    \"settings\": {
      \"mailNotificationsEnabled\": true,
      \"reminderNotificationsEnabled\": true,
      \"justificationRequiredOnApproval\": true,
      \"defaultDecisionEnabled\": true,
      \"defaultDecision\": \"Deny\",
      \"instanceDurationInDays\": 14,
      \"autoApplyDecisionsEnabled\": true,
      \"recommendationsEnabled\": true,
      \"recurrence\": {
        \"pattern\": {
          \"type\": \"absoluteMonthly\",
          \"interval\": 1
        },
        \"range\": {
          \"type\": \"noEnd\",
          \"startDate\": \"2025-01-01\"
        }
      }
    }
  }" 2>/dev/null || echo "Access review creation requires Entra ID P2 license"

# List existing access reviews
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions" \
  --headers "Content-Type=application/json" \
  --query "value[].{name:displayName, status:status}" -o table 2>/dev/null

# Check for recommendations on role assignments that should be removed
# (based on sign-in activity and role usage)
echo "=== Overprivilege Remediation Checklist ==="
echo "1. Replace Owner with Contributor where full control is not needed"
echo "2. Replace Contributor with specific roles (e.g., 'Storage Blob Data Contributor')"
echo "3. Move individual assignments to group-based assignments"
echo "4. Use PIM for time-bound elevated access"
echo "5. Remove orphaned assignments from deleted principals"
```

---

## Break & Fix

### Cenário 1: Atribuição de função personalizada falha com "Role definition not found"

Uma equipe tenta atribuir a função personalizada "Contoso App Deployer" em uma assinatura diferente, mas recebe um erro informando que a definição de função não existe.

<details>
<summary>Mostrar solução</summary>

```bash
# Check the assignable scopes of the custom role
az role definition list --custom-role-only true \
  --name "Contoso App Deployer" \
  --query "[].assignableScopes"

# The issue: Custom roles are only available in their assignable scopes
# If created at subscription scope, they're only available in that subscription

# Fix: Update the role to include additional subscriptions or use management group scope
az role definition update --role-definition '{
  "Name": "Contoso App Deployer",
  "AssignableScopes": [
    "/subscriptions/'"$SUB_ID"'",
    "/subscriptions/SECOND-SUB-ID"
  ]
}'

# Better fix: Define at management group level for organization-wide availability
# az role definition update --role-definition '{
#   "Name": "Contoso App Deployer",
#   "AssignableScopes": ["/providers/Microsoft.Management/managementGroups/contoso-root"]
# }'

# Verify the role is now visible in the target scope
az role definition list --custom-role-only true \
  --query "[?roleName=='Contoso App Deployer'].{name:roleName, scopes:assignableScopes}" -o json
```

</details>

### Cenário 2: Usuário tem a função correta mas ainda recebe "AuthorizationFailed"

Um usuário com a função "Contoso Key Vault Secret Reader" atribuída recebe erros de autorização ao tentar ler segredos, apesar de a função estar corretamente atribuída.

<details>
<summary>Mostrar solução</summary>

```bash
# Check the role assignment scope vs. the resource scope
az role assignment list --assignee "user@contoso.com" \
  --query "[?contains(roleDefinitionName,'Key Vault')].{role:roleDefinitionName, scope:scope}" -o table

# Common issues:
# 1. Role assigned at wrong scope (subscription but resource is in different sub)
# 2. Key Vault uses access policies instead of RBAC
KV_RBAC=$(az keyvault show --name "target-vault" --query "properties.enableRbacAuthorization" -o tsv 2>/dev/null)
echo "Key Vault RBAC enabled: $KV_RBAC"

# 3. Custom role has wrong DataActions (missing the getSecret action path)
az role definition list --name "Contoso Key Vault Secret Reader" \
  --query "[].{dataActions:permissions[0].dataActions, notDataActions:permissions[0].notDataActions}" -o json

# Fix: The role might need the full action path
az role definition update --role-definition '{
  "Name": "Contoso Key Vault Secret Reader",
  "DataActions": [
    "Microsoft.KeyVault/vaults/secrets/getSecret/action",
    "Microsoft.KeyVault/vaults/secrets/readMetadata/action"
  ],
  "AssignableScopes": ["/subscriptions/'"$SUB_ID"'"]
}'

# 4. There might be a deny assignment blocking access
az role assignment list --assignee "user@contoso.com" --all --include-inherited \
  --query "[?roleDefinitionName==null || contains(roleDefinitionName,'deny')]" -o table

# 5. Propagation delay - RBAC changes can take up to 5 minutes
echo "Wait 5 minutes for RBAC propagation and retry"
```

</details>

### Cenário 3: Não é possível remover a função Owner — "Cannot delete the last owner"

A equipe quer remover a última atribuição direta de Owner restante de uma assinatura (todo o acesso deveria ser via PIM), mas o Azure impede a remoção.

<details>
<summary>Mostrar solução</summary>

```bash
# Azure requires at least one active Owner on every subscription
# You cannot remove the last Owner assignment

# Solution: Use a break-glass approach
# 1. Create a security group as the emergency Owner
BREAKGLASS_GROUP_ID=$(az ad group create \
  --display-name "Azure-Emergency-Owners" \
  --mail-nickname "azure-emergency-owners" \
  --description "Break-glass Owner access - monitor via access reviews" \
  --query id -o tsv)

# 2. Assign Owner to the group (satisfies the "at least one owner" requirement)
az role assignment create \
  --assignee-object-id $BREAKGLASS_GROUP_ID \
  --assignee-principal-type Group \
  --role "Owner" \
  --scope "/subscriptions/$SUB_ID"

# 3. Now remove the individual Owner assignment
# az role assignment delete --assignee "individual@contoso.com" --role "Owner" --scope "/subscriptions/$SUB_ID"

# 4. Keep the group membership empty (or add only break-glass accounts)
# Access is managed through PIM eligible assignments

# 5. Set up monitoring on this group
echo "Configure:"
echo "- Access review on the Azure-Emergency-Owners group (quarterly)"
echo "- Alert on any group membership changes"
echo "- PIM eligible assignment for Owner through the group"
```

</details>

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso quer uma função personalizada que permita implantar código em App Services, mas impeça excluir ou criar novos recursos de App Service. Qual configuração de permissão alcança isso?",
    options: [
      "Actions: Microsoft.Web/sites/* com NotActions: Microsoft.Web/sites/delete, Microsoft.Web/sites/write",
      "Actions: Microsoft.Web/sites/read com NotActions: nenhum",
      "Actions: Contributor com NotActions: Microsoft.Web/*",
      "DataActions: Microsoft.Web/sites/deployments/write"
    ],
    correctIndex: 0,
    explanation: "Usando Microsoft.Web/sites/* em Actions, todas as sub-operações em sites existentes são concedidas, enquanto NotActions para delete e write (criar/atualizar o recurso em si) impede alterações na infraestrutura. Isso permite operações de implantação (escrita de config, restart, slot swap) enquanto bloqueia ações destrutivas."
  },
  {
    question: "Uma organização tem atribuições de função para usuários individuais espalhadas por 50 assinaturas. Qual é a abordagem recomendada para melhorar a governança?",
    options: [
      "Criar Azure Policy para auditar atribuições de função individuais",
      "Migrar para atribuições de função baseadas em grupos gerenciados por meio de grupos do Entra ID com Access Reviews",
      "Remover todas as atribuições individuais e usar PIM exclusivamente",
      "Criar um management group e atribuir funções apenas nesse nível"
    ],
    correctIndex: 1,
    explanation: "Atribuições de função baseadas em grupos centralizam o gerenciamento de acesso em grupos do Entra ID, que podem ser governados por meio de Access Reviews, regras de associação dinâmica e políticas de ciclo de vida de grupos. Isso reduz o número total de atribuições de função e torna a auditoria, integração e desligamento significativamente mais fáceis."
  },
  {
    question: "Qual é o número máximo de definições de funções personalizadas permitidas por tenant do Microsoft Entra ID?",
    options: [
      "500",
      "2000",
      "5000",
      "Ilimitado"
    ],
    correctIndex: 2,
    explanation: "Cada tenant do Microsoft Entra ID pode ter até 5000 definições de funções personalizadas. Funções personalizadas podem ter escopo de management groups, assinaturas ou grupos de recursos. Planejar as definições de funções cuidadosamente e usar abordagens parametrizadas ajuda a permanecer dentro desse limite."
  },
  {
    question: "Uma atribuição de função Azure RBAC foi criada há 2 minutos, mas o usuário ainda recebe 'AuthorizationFailed'. A atribuição está correta. O que deve ser feito?",
    options: [
      "Excluir e recriar a atribuição",
      "Escalar para o suporte Microsoft pois o RBAC está com defeito",
      "Aguardar até 10 minutos para a propagação do RBAC e solicitar que o usuário obtenha um novo token",
      "Atribuir uma função adicional para substituir o cache"
    ],
    correctIndex: 2,
    explanation: "Alterações no Azure RBAC podem levar até 10 minutos para se propagar devido ao cache na camada do Azure Resource Manager. O usuário também deve obter um novo token (reautenticar) já que seu token existente pode não refletir a nova atribuição. Este é um comportamento esperado, não uma falha do sistema."
  }
]} />

## Limpeza

```bash
# Delete custom role assignments
az role assignment delete --assignee $READERS_GROUP_ID --role "Reader" --scope "/subscriptions/$SUB_ID" 2>/dev/null
az role assignment delete --assignee $DEPLOYERS_GROUP_ID --role "Contoso App Deployer" --scope "/subscriptions/$SUB_ID" 2>/dev/null
az role assignment delete --assignee $NETWORK_GROUP_ID --role "Contoso Network Viewer" --scope "/subscriptions/$SUB_ID" 2>/dev/null

# Delete custom role definitions
az role definition delete --name "Contoso Key Vault Secret Reader" 2>/dev/null
az role definition delete --name "Contoso Network Viewer" 2>/dev/null
az role definition delete --name "Contoso App Deployer" 2>/dev/null

# Delete security groups
az ad group delete --group "Azure-Readers-Production" 2>/dev/null
az ad group delete --group "Azure-AppDeployers-Production" 2>/dev/null
az ad group delete --group "Azure-NetworkViewers" 2>/dev/null
az ad group delete --group "Azure-Emergency-Owners" 2>/dev/null
az ad group delete --group "KeyVault-CertificateOfficers" 2>/dev/null

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait
```
