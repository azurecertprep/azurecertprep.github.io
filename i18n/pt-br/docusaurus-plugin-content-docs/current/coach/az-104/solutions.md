---
sidebar_label: "AZ-104 Solutions"
sidebar_position: 1
---

# 🎓 Guia do Instrutor AZ-104: Soluções Completas

:::danger Apenas para Instrutores & Facilitadores

Este documento contém **soluções completas** para todos os 28 desafios. Os alunos devem tentar cada desafio de forma independente antes de consultar este guia. O aprendizado acontece na luta | se os alunos pularem direto para as soluções, não reterão o conhecimento para o exame.

**Como usar este guia:**
- Caminhe pelo desafio com os alunos primeiro | deixe-os encontrar obstáculos
- Use as seções de "Erros Comuns" para antecipar onde os alunos ficam travados
- Compartilhe dicas individuais das páginas de desafio antes de revelar soluções completas
- Use as estimativas de tempo para ritmar suas sessões de workshop
:::

---

## Desafio 01: Entra ID: Usuários & Grupos

> **Estimativa de tempo do instrutor**: 30–45 min (alunos: 45–60 min) | Domínio: Identidade & Governança

### Solução Completa

```bash
# Step 0: Get your tenant domain
DOMAIN=$(az rest --method get --url "https://graph.microsoft.com/v1.0/domains" \
  --query "value[?isDefault].id" -o tsv)
echo "Tenant domain: $DOMAIN"
```

**Por quê**: Todo tenant Entra ID tem um domínio padrão `*.onmicrosoft.com`. Você precisa disso para a construção do UPN (User Principal Name). Alunos que codificam um nome de domínio fixo terão problemas ao trocar de tenant.

```bash
# Part 1: Create 3 users
az ad user create \
  --display-name "Alice Johnson" \
  --user-principal-name "alice@$DOMAIN" \
  --password "TempP@ss123!" \
  --force-change-password-next-sign-in true \
  --department "IT" \
  --job-title "Cloud Engineer"

az ad user create \
  --display-name "Bob Smith" \
  --user-principal-name "bob@$DOMAIN" \
  --password "TempP@ss456!" \
  --force-change-password-next-sign-in true \
  --department "Finance" \
  --job-title "Financial Analyst"

az ad user create \
  --display-name "Carol Williams" \
  --user-principal-name "carol@$DOMAIN" \
  --password "TempP@ss789!" \
  --force-change-password-next-sign-in true \
  --department "IT" \
  --job-title "Security Admin"
```

**Por quê**: `--force-change-password-next-sign-in true` é o padrão seguro | os usuários devem definir sua própria senha. O exame testa se você sabe que essa flag existe. As senhas devem atender aos requisitos de complexidade (maiúscula, minúscula, número, caractere especial, 8+ caracteres).

```bash
# Part 2: Create groups and add members
az ad group create --display-name "IT-Team" --mail-nickname "it-team"
az ad group create --display-name "Finance-Team" --mail-nickname "finance-team"
az ad group create --display-name "All-Employees" --mail-nickname "all-employees"

# Get user object IDs (needed for member operations)
ALICE_ID=$(az ad user show --id "alice@$DOMAIN" --query id -o tsv)
BOB_ID=$(az ad user show --id "bob@$DOMAIN" --query id -o tsv)
CAROL_ID=$(az ad user show --id "carol@$DOMAIN" --query id -o tsv)

# Add members
az ad group member add --group "IT-Team" --member-id $ALICE_ID
az ad group member add --group "IT-Team" --member-id $CAROL_ID
az ad group member add --group "Finance-Team" --member-id $BOB_ID
az ad group member add --group "All-Employees" --member-id $ALICE_ID
az ad group member add --group "All-Employees" --member-id $BOB_ID
az ad group member add --group "All-Employees" --member-id $CAROL_ID
```

**Por quê**: O `--mail-nickname` é obrigatório ao criar grupos via CLI | é o alias seguro para email. Operações de membros requerem o Object ID (GUID), não o UPN | um ponto comum de confusão.

```bash
# Part 3: Manage properties
# Set Bob's usage location (required before license assignment)
az ad user update --id "bob@$DOMAIN" --usage-location "US"

# Disable Carol's account
az ad user update --id "carol@$DOMAIN" --account-enabled false

# Update IT-Team group description
IT_GROUP_ID=$(az ad group show --group "IT-Team" --query id -o tsv)
az rest --method patch \
  --url "https://graph.microsoft.com/v1.0/groups/$IT_GROUP_ID" \
  --body '{"description": "IT department security group"}'
```

**Por quê**: A localização de uso é um pré-requisito para atribuição de licença | o Azure não permite atribuir licenças sem ela porque o licenciamento varia por país. A atualização da descrição do grupo requer a Graph API porque `az ad group update` tem suporte limitado de propriedades.

```bash
# Part 4: Invite external user
az rest --method post \
  --url "https://graph.microsoft.com/v1.0/invitations" \
  --body '{
    "invitedUserEmailAddress": "external@yourpersonalemail.com",
    "inviteRedirectUrl": "https://portal.azure.com",
    "sendInvitationMessage": true
  }'

# Get the guest user's ID and add to All-Employees
GUEST_ID=$(az ad user list --filter "userType eq 'Guest'" --query "[0].id" -o tsv)
az ad group member add --group "All-Employees" --member-id $GUEST_ID
```

**Por quê**: Usuários externos (convidados B2B) são convidados via a API de Convites do Microsoft Graph. Eles aparecem como `userType eq 'Guest'` no Entra ID. O exame testa se você conhece a diferença entre os tipos de usuário Member e Guest.

```bash
# Part 5: SSPR (Portal steps | cannot be fully configured via CLI)
# 1. Azure Portal → Microsoft Entra ID → Password reset
# 2. Set "Self-service password reset enabled" to "Selected"
# 3. Select group: IT-Team
# 4. Authentication methods → Number required: 1
# 5. Check "Email" as allowed method
# 6. Save
```

**Por quê**: A configuração do SSPR é principalmente uma tarefa do Portal no exame. As configurações principais são: escopo (All/Selected/None), métodos de autenticação necessários (1 ou 2), e quais métodos são permitidos. Os alunos frequentemente perdem que você deve selecionar um grupo específico ao escolher "Selected."

### Erros Comuns

1. **Esquecer `--mail-nickname`** ao criar grupos | a CLI dá erro sem ele
2. **Usar UPN em vez de Object ID** para `--member-id` | o parâmetro requer GUIDs
3. **Não definir a localização de uso** antes de tentar atribuir licenças | falha silenciosamente no Portal, dá erro na CLI
4. **Definir SSPR como "All"** em vez de escopá-lo para IT-Team | o desafio pede um grupo específico
5. **Tentar criar grupos dinâmicos via CLI** | regras de associação dinâmica requerem Graph API ou Portal; se os alunos tentarem isso, oriente-os a usar associação estática e explique dinâmica como bônus

---

## Desafio 02: RBAC & Gerenciamento de Acesso

> **Estimativa de tempo do instrutor**: 30–40 min (alunos: 45–60 min) | Domínio: Identidade & Governança

### Solução Completa

```bash
# Setup
DOMAIN=$(az rest --method get --url "https://graph.microsoft.com/v1.0/domains" \
  --query "value[?isDefault].id" -o tsv)
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create resource group
az group create --name rg-rbac-challenge --location eastus
```

```bash
# Part 1: Explore built-in roles
az role definition list \
  --query "[?roleName=='Owner' || roleName=='Contributor' || roleName=='Reader' || roleName=='User Access Administrator'].{Name:roleName, Description:description}" \
  -o table

# Deep-dive into Contributor's NotActions (key exam topic)
az role definition list --name "Contributor" \
  --query "[].permissions[0].notActions" -o json
# Shows: Microsoft.Authorization/*/Delete, Microsoft.Authorization/*/Write, etc.
# This is WHY Contributor can't assign roles: those actions are explicitly excluded.
```

**Por quê**: Os 4 papéis fundamentais são Owner, Contributor, Reader e User Access Administrator. A distinção crítica do exame é que o Contributor tem `Microsoft.Authorization/*/Write` em NotActions | significando que não pode atribuir papéis. O Owner pode fazer tudo incluindo atribuições de papéis.

```bash
# Part 2: Assign roles at different scopes
ALICE_ID=$(az ad user show --id "alice@$DOMAIN" --query id -o tsv)
BOB_ID=$(az ad user show --id "bob@$DOMAIN" --query id -o tsv)
CAROL_ID=$(az ad user show --id "carol@$DOMAIN" --query id -o tsv)
IT_GROUP_ID=$(az ad group show --group "IT-Team" --query id -o tsv)

# Reader for Alice at subscription scope
az role assignment create \
  --assignee $ALICE_ID \
  --role "Reader" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"

# Contributor for IT-Team at resource group scope
az role assignment create \
  --assignee $IT_GROUP_ID \
  --role "Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-rbac-challenge"

# VM Contributor for Bob at resource group scope
az role assignment create \
  --assignee $BOB_ID \
  --role "Virtual Machine Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-rbac-challenge"
```

**Por quê**: O parâmetro `--scope` é o conceito chave. Papéis atribuídos em escopos mais altos (assinatura) são herdados por escopos mais baixos (grupo de recursos → recurso). Alice obtém Reader em todos os lugares; IT-Team obtém Contributor apenas em rg-rbac-challenge. RBAC é **aditivo** | Alice obtém tanto Reader (da atribuição direta) QUANTO Contributor (da associação ao grupo IT-Team) em rg-rbac-challenge.

```bash
# Part 3: Verify and interpret access
az role assignment list --assignee $ALICE_ID -o table
az role assignment list --resource-group rg-rbac-challenge -o table
az role assignment list --all --role "Owner" -o table
```

```bash
# Part 4: Create a custom role
cat > vm-reader-role.json << EOF
{
  "Name": "VM-Reader",
  "Description": "Can view virtual machines and their instance details only",
  "Actions": [
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Compute/virtualMachines/instanceView/read",
    "Microsoft.Network/networkInterfaces/read"
  ],
  "NotActions": [],
  "AssignableScopes": [
    "/subscriptions/$SUBSCRIPTION_ID"
  ]
}
EOF

az role definition create --role-definition vm-reader-role.json

# Assign custom role to Carol
az role assignment create \
  --assignee $CAROL_ID \
  --role "VM-Reader" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-rbac-challenge"
```

**Por quê**: Papéis personalizados preenchem lacunas quando os papéis embutidos são muito amplos ou muito restritos. O `AssignableScopes` limita ONDE o papel pode ser atribuído | não o que ele pode fazer. Pergunta comum do exame: "Qual é o número máximo de papéis personalizados por tenant?" Resposta: 5.000.

```bash
# Part 5: Audit access
az role assignment list --all -o table
az role assignment list --all --role "Owner" \
  --query "[].{Principal:principalName, Scope:scope, Type:principalType}" -o table
```

### Erros Comuns

1. **Usar `--assignee` com UPN para grupos** | grupos precisam de object ID, não de um nome
2. **Confundir a hierarquia de escopo** | alunos atribuem no escopo de grupo de recursos e esperam que se aplique no nível da assinatura (não funciona assim | a herança vai para BAIXO, não para CIMA)
3. **Erros no JSON do papel personalizado** | `AssignableScopes` ausente ou usando ID de assinatura errado
4. **Esquecer que RBAC é aditivo** | alunos acham que uma atribuição Reader na assinatura substitui Contributor no grupo de recursos (não substitui | o usuário obtém a união de todas as permissões)
5. **Atraso na propagação de papéis personalizados** | pode levar até 5 minutos para um novo papel personalizado ficar disponível para atribuição

---

## Desafio 03: Azure Policy & Governança

> **Estimativa de tempo do instrutor**: 45–55 min (alunos: 60–75 min) | Domínio: Identidade & Governança

### Solução Completa

```bash
# Part 1: Create resource groups with tags
az group create --name rg-policy-prod --location eastus \
  --tags Environment=Production CostCenter=IT-001 Owner=Coach
az group create --name rg-policy-dev --location eastus \
  --tags Environment=Development CostCenter=IT-002 Owner=Coach
```

```bash
# Part 2: Assign tag policy with Deny effect
# Find the built-in policy: "Require a tag and its value on resources"
az policy definition list \
  --query "[?contains(displayName, 'Require a tag and its value')].{Name:name, DisplayName:displayName}" -o table
# Policy ID: 1e30110a-5ceb-460c-a204-c1c3969c6d62

RG_PROD_ID=$(az group show --name rg-policy-prod --query id -o tsv)

az policy assignment create \
  --name "require-costcenter-tag" \
  --display-name "Require CostCenter tag on resources" \
  --policy "1e30110a-5ceb-460c-a204-c1c3969c6d62" \
  --scope "$RG_PROD_ID" \
  --params '{"tagName":{"value":"CostCenter"},"tagValue":{"value":"IT-001"}}'
```

**Por quê**: O Policy ID `1e30110a-5ceb-460c-a204-c1c3969c6d62` é a política embutida "Require a tag and its value on resources" | ela usa o efeito Deny para bloquear a criação de recursos se o par tag/valor estiver ausente. As políticas levam 5–15 minutos para entrar em vigor.

```bash
# Part 3: Assign Allowed Locations policy
# Built-in policy: "Allowed locations"
# Policy ID: e56962a6-4747-49cd-b67b-bf8b01975c4c
az policy assignment create \
  --name "allowed-locations" \
  --display-name "Allowed Locations - East US and West US 2" \
  --policy "e56962a6-4747-49cd-b67b-bf8b01975c4c" \
  --scope "$RG_PROD_ID" \
  --params '{"listOfAllowedLocations":{"value":["eastus","westus2"]}}'
```

```bash
# Part 4: Create a policy initiative
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

cat > initiative.json << 'EOF'
[
  {
    "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/871b6d14-10aa-478d-b466-ef6698f3ef28",
    "parameters": { "tagName": { "value": "CostCenter" } }
  },
  {
    "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/871b6d14-10aa-478d-b466-ef6698f3ef28",
    "parameters": { "tagName": { "value": "Environment" } }
  },
  {
    "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c",
    "parameters": { "listOfAllowedLocations": { "value": ["eastus", "westus2"] } }
  }
]
EOF

az policy set-definition create \
  --name "Contoso-Governance" \
  --display-name "Contoso Governance Initiative" \
  --definitions initiative.json \
  --description "Requires tags and restricts locations"

# Assign the initiative to rg-policy-dev
RG_DEV_ID=$(az group show --name rg-policy-dev --query id -o tsv)
az policy assignment create \
  --name "contoso-governance-assignment" \
  --display-name "Contoso Governance" \
  --policy-set-definition "Contoso-Governance" \
  --scope "$RG_DEV_ID"
```

**Por quê**: Uma iniciativa (conjunto de políticas) agrupa múltiplas políticas em uma única atribuição. Essa é a abordagem recomendada para governança em escala | atribua uma iniciativa em vez de 10 políticas individuais. A política `871b6d14` é "Require a tag on resources" (efeito Deny, verifica apenas o nome da tag | não o valor).

```bash
# Part 5: Resource locks
az lock create --name "PreventDeletion" \
  --lock-type CanNotDelete \
  --resource-group rg-policy-prod \
  --notes "Production resources - do not delete"

# Test: try to delete (will fail)
az group delete --name rg-policy-prod --yes 2>&1 || echo "EXPECTED: Lock prevented deletion"

# ReadOnly lock on a specific resource (if a storage account exists)
# az lock create --name "ReadOnlyLock" --lock-type ReadOnly \
#   --resource-group rg-policy-prod --resource-name <name> --resource-type Microsoft.Storage/storageAccounts
```

```bash
# Part 6: Advisor and budgets
az advisor recommendation list \
  --query "[].{Category:category, Impact:impact, Problem:shortDescription.problem}" -o table
```

### Erros Comuns

1. **Política não entra em vigor** | alunos testam imediatamente após a atribuição; lembre-os que leva 5–15 minutos. Use `az policy state trigger-scan` para acelerar
2. **ID de política errado** | existem múltiplas políticas relacionadas a tags; `1e30110a` requer tag E valor, `871b6d14` requer apenas tag
3. **Confusão com parâmetros de iniciativa** | alunos tentam passar parâmetros no momento da atribuição que deveriam estar na definição
4. **Surpresa com lock ReadOnly** | alunos aplicam ReadOnly em um grupo de recursos e não conseguem criar novos recursos dentro dele (ReadOnly previne TODAS as escritas, incluindo criações)
5. **Tags não são herdadas** | alunos assumem que marcar um grupo de recursos marca seus recursos (não marca | precisa da política "Inherit a tag")

---

## Desafio 04: Contas de Armazenamento & Acesso

> **Estimativa de tempo do instrutor**: 40–50 min (alunos: 60–75 min) | Domínio: Armazenamento

### Solução Completa

```bash
# Setup
RG="rg-storage-challenge"
LOCATION="eastus"
STORAGE_NAME="ststoragechallenge$(date +%s | tail -c 8)"

az group create --name $RG --location $LOCATION

# Part 1: Create storage account
az storage account create \
  --name $STORAGE_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --min-tls-version TLS1_2 \
  --tags Environment=Lab CostCenter=IT-001

# Part 2: Change redundancy
az storage account update --name $STORAGE_NAME --resource-group $RG --sku Standard_GRS
```

**Por quê**: Nomes de armazenamento devem ser globalmente únicos, 3–24 caracteres, apenas letras minúsculas+números. `$RANDOM` ou timestamp garante unicidade. LRS→GRS é uma transição direta suportada; algumas transições (LRS→RA-GZRS) requerem etapas intermediárias | um tópico chave do exame.

```bash
# Part 3: Access keys, containers, SAS tokens
CONN_STRING=$(az storage account show-connection-string \
  --name $STORAGE_NAME --resource-group $RG -o tsv)

az storage container create --name testcontainer --connection-string "$CONN_STRING"

echo "Hello from Azure Storage Challenge!" > testfile.txt
az storage blob upload --container-name testcontainer \
  --file testfile.txt --name testfile.txt --connection-string "$CONN_STRING"

# Account SAS (broad: covers all services)
END_DATE=$(date -u -d "+1 day" '+%Y-%m-%dT%H:%MZ' 2>/dev/null || date -u -v+1d '+%Y-%m-%dT%H:%MZ')
az storage account generate-sas \
  --account-name $STORAGE_NAME \
  --services b --resource-types sco \
  --permissions rl --expiry $END_DATE --https-only -o tsv

# Service SAS (scoped to container)
az storage container generate-sas \
  --name testcontainer --account-name $STORAGE_NAME \
  --permissions rl --expiry $END_DATE --https-only \
  --connection-string "$CONN_STRING" -o tsv
```

**Por quê**: Existem três tipos de SAS | Account (mais amplo), Service (escopado a um serviço) e User Delegation (mais seguro, usa Entra ID). O exame sempre pergunta: "Qual é o mais seguro?" → User Delegation SAS.

```bash
# Part 4: Stored access policy
az storage container policy create \
  --container-name testcontainer --name "ReadPolicy" \
  --permissions rl --expiry $END_DATE \
  --connection-string "$CONN_STRING"

# SAS linked to the policy (revocable!)
az storage container generate-sas \
  --name testcontainer --account-name $STORAGE_NAME \
  --policy-name "ReadPolicy" \
  --connection-string "$CONN_STRING" -o tsv

# Part 5: Storage firewall
MY_IP=$(curl -s https://api.ipify.org)
az storage account update --name $STORAGE_NAME --resource-group $RG --default-action Deny
az storage account network-rule add \
  --account-name $STORAGE_NAME --resource-group $RG --ip-address $MY_IP

# Part 6: Rotate key
az storage account keys renew --account-name $STORAGE_NAME --resource-group $RG --key key1

# Part 7: AzCopy
mkdir -p upload-test
for i in 1 2 3 4 5; do echo "Test file $i" > upload-test/file$i.txt; done

SAS_TOKEN=$(az storage account generate-sas \
  --account-name $STORAGE_NAME --services b --resource-types co \
  --permissions rwlac --expiry $END_DATE --https-only -o tsv)
azcopy copy "upload-test/*" "https://$STORAGE_NAME.blob.core.windows.net/testcontainer?$SAS_TOKEN" --recursive
```

### Erros Comuns

1. **Falhas de validação do nome de armazenamento** | maiúsculas, hifens ou >24 caracteres
2. **Bloqueio por firewall** | alunos definem default-action como Deny e esquecem de adicionar seu próprio IP; oriente-os a usar o Cloud Shell (sempre permitido como serviço confiável)
3. **Confusão com token SAS** | misturar Account SAS vs Service SAS vs User Delegation SAS
4. **Formatação de data no macOS** | `date -d` é apenas GNU; macOS precisa de `date -v+1d`; o desafio mostra ambas as formas
5. **Rotação de chave quebrando tudo** | alunos rotacionam key1 e depois se perguntam por que sua connection string parou de funcionar; explique o padrão de rotação de chave dupla

---

## Desafio 05: Blob Storage & Azure Files

> **Estimativa de tempo do instrutor**: 40–50 min (alunos: 60–75 min) | Domínio: Armazenamento

### Solução Completa

```bash
# Setup
RG="rg-blob-files-challenge"
STORAGE_NAME="stblobfiles$(date +%s | tail -c 8)"
az group create --name $RG --location eastus

az storage account create --name $STORAGE_NAME --resource-group $RG \
  --location eastus --sku Standard_LRS --kind StorageV2 --access-tier Hot

CONN_STRING=$(az storage account show-connection-string \
  --name $STORAGE_NAME --resource-group $RG -o tsv)

# Part 2: Containers and tiering
az storage container create --name app-data --connection-string "$CONN_STRING"
az storage container create --name logs --connection-string "$CONN_STRING"
az storage container create --name archive --connection-string "$CONN_STRING"

echo "User profile data for Alice" > profile-alice.txt
echo "User profile data for Bob" > profile-bob.txt
echo "Application log entry 2025-01-15" > app-log-2025-01-15.txt

az storage blob upload --container-name app-data --file profile-alice.txt \
  --name profiles/alice.txt --connection-string "$CONN_STRING"
az storage blob upload --container-name app-data --file profile-bob.txt \
  --name profiles/bob.txt --connection-string "$CONN_STRING"
az storage blob upload --container-name logs --file app-log-2025-01-15.txt \
  --name "2025/01/app-log-2025-01-15.txt" --connection-string "$CONN_STRING"

# Change log blob to Cool tier
az storage blob set-tier --container-name logs \
  --name "2025/01/app-log-2025-01-15.txt" --tier Cool \
  --connection-string "$CONN_STRING"

# Upload directly to Archive tier
echo "Quarterly Report Q3 2024" > q3-report.txt
az storage blob upload --container-name archive --file q3-report.txt \
  --name reports/q3-2024.txt --connection-string "$CONN_STRING" --tier Archive
```

**Por quê**: Diretórios virtuais (profiles/, 2025/01/) são apenas convenções de nomenclatura | o blob storage é plano. O `/` no nome cria a aparência de pasta no Storage Explorer. Mudanças de camada entre Hot/Cool/Cold são instantâneas; Archive requer reidratação (horas).

```bash
# Part 3: Soft delete
az storage account blob-service-properties update \
  --account-name $STORAGE_NAME --resource-group $RG \
  --enable-delete-retention true --delete-retention-days 14

az storage account blob-service-properties update \
  --account-name $STORAGE_NAME --resource-group $RG \
  --enable-container-delete-retention true --container-delete-retention-days 14

# Test: delete and recover
az storage blob delete --container-name app-data --name profiles/alice.txt \
  --connection-string "$CONN_STRING"
az storage blob undelete --container-name app-data --name profiles/alice.txt \
  --connection-string "$CONN_STRING"

# Part 4: Versioning
az storage account blob-service-properties update \
  --account-name $STORAGE_NAME --resource-group $RG --enable-versioning true

echo "Updated profile data for Alice | version 2" > profile-alice-v2.txt
az storage blob upload --container-name app-data --file profile-alice-v2.txt \
  --name profiles/alice.txt --connection-string "$CONN_STRING" --overwrite

# Part 5: Snapshots
az storage blob snapshot --container-name app-data --name profiles/bob.txt \
  --connection-string "$CONN_STRING"

# Part 6: Azure Files
az storage share-rm create --storage-account $STORAGE_NAME --resource-group $RG \
  --name finance-share --quota 50

az storage directory create --share-name finance-share --name "reports" \
  --connection-string "$CONN_STRING"
echo "Budget Report 2025" > budget-2025.txt
az storage file upload --share-name finance-share --source budget-2025.txt \
  --path "reports/budget-2025.txt" --connection-string "$CONN_STRING"

# Part 7: File share soft delete and snapshots
az storage account file-service-properties update \
  --account-name $STORAGE_NAME --resource-group $RG \
  --enable-delete-retention true --delete-retention-days 14

az storage share snapshot --name finance-share --connection-string "$CONN_STRING"
```

### Erros Comuns

1. **Tentar ler um blob arquivado** | retorna erro `BlobArchived`; deve reidratar primeiro (até 15 horas padrão, menos de 1 hora alta prioridade)
2. **Confundir versionamento vs snapshots** | versionamento é automático em cada escrita; snapshots são capturas manuais de ponto no tempo
3. **Porta 445 bloqueada** | Azure Files usa SMB sobre TCP 445; a maioria dos ISPs bloqueia isso. Oriente os alunos a testar com `Test-NetConnection` e sugira Azure VPN ou Cloud Shell como alternativas
4. **Esquecer `--overwrite`** | fazer upload para um blob com nome existente sem `--overwrite` falha
5. **Não habilitar versionamento antes de testar** | versionamento só captura alterações APÓS ser habilitado

---

## Desafio 06: Segurança de Storage & Ciclo de Vida

> **Estimativa de tempo do instrutor**: 40–50 min (alunos: 60–75 min) | Domínio: Armazenamento

### Solução Completa

```bash
# Setup: two storage accounts in different regions
RG="rg-lifecycle-challenge"
STORAGE_PRIMARY="stlifecyclepri$(date +%s | tail -c 8)"
STORAGE_SECONDARY="stlifecyclesec$(date +%s | tail -c 8)"

az group create --name $RG --location eastus

az storage account create --name $STORAGE_PRIMARY --resource-group $RG \
  --location eastus --sku Standard_LRS --kind StorageV2 --access-tier Hot

az storage account create --name $STORAGE_SECONDARY --resource-group $RG \
  --location westus2 --sku Standard_LRS --kind StorageV2 --access-tier Hot

# Enable versioning (required for object replication) and change feed on source
az storage account blob-service-properties update \
  --account-name $STORAGE_PRIMARY --resource-group $RG \
  --enable-versioning true --enable-change-feed true

az storage account blob-service-properties update \
  --account-name $STORAGE_SECONDARY --resource-group $RG \
  --enable-versioning true
```

**Por quê**: A replicação de objetos requer versionamento em ambas as contas e feed de alterações na origem. Esses pré-requisitos atrapalham alunos que pulam as etapas de configuração.

```bash
# Lifecycle management policy
az storage account management-policy create \
  --account-name $STORAGE_PRIMARY \
  --resource-group $RG \
  --policy '{
    "rules": [
      {
        "enabled": true,
        "name": "move-logs-to-cool",
        "type": "Lifecycle",
        "definition": {
          "actions": {
            "baseBlob": {
              "tierToCool": { "daysAfterModificationGreaterThan": 30 },
              "tierToArchive": { "daysAfterModificationGreaterThan": 90 },
              "delete": { "daysAfterModificationGreaterThan": 365 }
            }
          },
          "filters": {
            "blobTypes": ["blockBlob"],
            "prefixMatch": ["app-logs/"]
          }
        }
      }
    ]
  }'
```

**Por quê**: Políticas de ciclo de vida automatizam transições de camada e exclusão baseadas em idade. A regra acima move logs para Cool após 30 dias, Archive após 90 e exclui após 365. Os filtros escopam a regra para containers/prefixos específicos. Isso é fortemente testado no exame.

```bash
# Object replication
CONN_PRIMARY=$(az storage account show-connection-string \
  --name $STORAGE_PRIMARY --resource-group $RG -o tsv)
CONN_SECONDARY=$(az storage account show-connection-string \
  --name $STORAGE_SECONDARY --resource-group $RG -o tsv)

# Create matching containers
az storage container create --name replicated-data --connection-string "$CONN_PRIMARY"
az storage container create --name replicated-data --connection-string "$CONN_SECONDARY"

# Object replication is best configured via Portal:
# Source storage account → Object replication → Create replication rules
# Source: replicated-data container on primary
# Destination: replicated-data container on secondary
```

### Erros Comuns

1. **Pré-requisitos ausentes para replicação de objetos** | versionamento não habilitado, ou feed de alterações não habilitado na origem
2. **Sintaxe do JSON da política de ciclo de vida** | alunos frequentemente têm JSON malformado; valide com `python -m json.tool`
3. **Cobranças por exclusão antecipada** | alunos esquecem que mover do Cool antes de 30 dias ou do Archive antes de 180 dias gera cobranças de penalidade
4. **Replicação de objetos é assíncrona** | os dados não aparecem instantaneamente no destino; há um atraso de replicação
5. **Acesso baseado em identidade para Azure Files** | requer Entra ID DS ou AD DS on-prem ingressado; não pode ser feito facilmente em um tenant de lab gratuito

---

## Desafio 07: ARM Templates & Bicep

> **Estimativa de tempo do instrutor**: 40–50 min (alunos: 60 min) | Domínio: Computação (IaC)

### Solução Completa

```bash
az group create --name rg-iac-lab --location eastus

# Task 1: Save the ARM template (provided in the challenge)
# Task 2: Add environment tag parameter + tags property to the resource

# Task 3: Deploy ARM template
az deployment group create \
  --resource-group rg-iac-lab \
  --template-file storage.json \
  --parameters storagePrefix=contoso environment=dev \
  --name deploy-storage-v1

# Task 4: Export
az group export --name rg-iac-lab --output json > exported-template.json

# Task 5: Convert ARM to Bicep
az bicep install
az bicep decompile --file storage.json

# Task 6: Modify Bicep (add blob container | see challenge hints)
# Task 7: Deploy Bicep
az deployment group create \
  --resource-group rg-iac-lab \
  --template-file storage.bicep \
  --parameters storagePrefix=contoso environment=prod \
  --name deploy-storage-v2

# Task 8: What-If preview
az deployment group what-if \
  --resource-group rg-iac-lab \
  --template-file storage.bicep \
  --parameters storagePrefix=contoso environment=staging
```

**Por quê**: What-If é crítico para segurança em produção | mostra o que mudaria sem realmente implantar. O exame testa se você sabe a diferença entre os modos de implantação Incremental (padrão, aditivo) e Complete (exclui qualquer coisa que não esteja no template).

### Erros Comuns

1. **Avisos do decompile do Bicep** | a saída pode ter comentários `TODO` ou construções não suportadas; os alunos devem limpar isso manualmente
2. **Perda de dados no modo Complete** | alunos acidentalmente usam `--mode Complete` e excluem recursos não gerenciados; sempre enfatize que Incremental é o padrão seguro
3. **Confusão com `uniqueString()`** | alunos acham que é aleatório; na verdade é determinístico | a mesma entrada sempre produz a mesma saída
4. **Esquecer de validar antes de implantar** | `az deployment group validate` captura erros sem implantar
5. **Arquivo de parâmetros vs parâmetros inline** | o exame pode testar ambos os formatos; saiba que `@params.json` referencia um arquivo

---

## Desafio 08: Máquinas Virtuais & Scale Sets

> **Estimativa de tempo do instrutor**: 45–55 min (alunos: 60–75 min) | Domínio: Computação

### Solução Completa

```bash
az group create --name rg-vm-lab --location eastus

# Task 1: Create Linux VM
az vm create \
  --resource-group rg-vm-lab --name vm-web-01 \
  --image Ubuntu2204 --size Standard_B1s \
  --admin-username azureuser --generate-ssh-keys \
  --public-ip-sku Standard --output table

# Task 2: Attach data disk
az vm disk attach --resource-group rg-vm-lab --vm-name vm-web-01 \
  --name disk-data-01 --size-gb 128 --sku Premium_LRS --new
# Then SSH in and: lsblk → parted → mkfs.ext4 → mount → fstab

# Task 3: Resize
az vm resize --resource-group rg-vm-lab --name vm-web-01 --size Standard_B2s

# Task 4: Move VM (move ALL dependent resources together)
az group create --name rg-vm-prod --location eastus
RESOURCE_IDS=$(az resource list -g rg-vm-lab --query "[].id" -o tsv | tr '\n' ' ')
az resource move --destination-group rg-vm-prod --ids $RESOURCE_IDS

# Task 5: Availability set
az vm availability-set create --resource-group rg-vm-lab --name avset-web \
  --platform-fault-domain-count 2 --platform-update-domain-count 5

az vm create --resource-group rg-vm-lab --name vm-web-avset \
  --image Ubuntu2204 --size Standard_B1s \
  --admin-username azureuser --generate-ssh-keys \
  --availability-set avset-web --no-wait

# Task 6: VMSS with autoscale
az vmss create --resource-group rg-vm-lab --name vmss-web \
  --image Ubuntu2204 --vm-sku Standard_B1s --instance-count 2 \
  --admin-username azureuser --generate-ssh-keys \
  --upgrade-policy-mode automatic --load-balancer lb-vmss-web

az monitor autoscale create --resource-group rg-vm-lab \
  --resource vmss-web --resource-type Microsoft.Compute/virtualMachineScaleSets \
  --name autoscale-vmss-web --min-count 2 --max-count 5 --count 2

az monitor autoscale rule create --resource-group rg-vm-lab \
  --autoscale-name autoscale-vmss-web \
  --condition "Percentage CPU > 75 avg 5m" --scale out 1

az monitor autoscale rule create --resource-group rg-vm-lab \
  --autoscale-name autoscale-vmss-web \
  --condition "Percentage CPU < 25 avg 5m" --scale in 1

# Task 8: DEALLOCATE to stop charges!
az vm deallocate --resource-group rg-vm-lab --name vm-web-avset --no-wait
az vmss deallocate --resource-group rg-vm-lab --name vmss-web
```

**Por quê**: A distinção crítica é **Stop vs Deallocate**. Parar de dentro do SO mantém o compute reservado (você ainda paga). `az vm deallocate` libera o compute (você para de pagar pelo compute, mas ainda paga por discos/IPs). Esta é uma pergunta muito comum no exame.

### Erros Comuns

1. **Esquecer de desalocar** | alunos deixam VMs rodando e gastam créditos
2. **Mover VM sem recursos dependentes** | deve mover NIC, disco, IP público, NSG juntos; movimentações parciais falham
3. **Confusão entre Availability Set vs Zone** | Sets = dentro de um datacenter (SLA 99,95%); Zones = entre datacenters (SLA 99,99%)
4. **Não pode adicionar VM existente a availability set** | deve ser especificado no momento da criação
5. **Disco não visível após anexar** | alunos esquecem de particionar, formatar e montar dentro da VM; o disco é anexado mas não é utilizável até ser inicializado no SO

---

## Desafio 09: Containers no Azure

> **Estimativa de tempo do instrutor**: 30–40 min (alunos: 45–60 min) | Domínio: Computação

### Solução Completa

```bash
az group create --name rg-containers-lab --location eastus

# Task 1: ACR
ACR_NAME="contosoreglab$(date +%s | tail -c 8)"
az acr create --resource-group rg-containers-lab --name $ACR_NAME \
  --sku Basic --admin-enabled true

# Task 2: Build image in the cloud (no local Docker needed!)
mkdir container-app && cd container-app
cat > Dockerfile << 'EOF'
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
EOF
cat > index.html << 'EOF'
<!DOCTYPE html>
<html><body><h1>Contoso Dashboard</h1><p>Running on Azure Containers</p></body></html>
EOF

az acr build --registry $ACR_NAME --image contoso-dashboard:v1 .

# Task 3: Deploy to ACI
ACR_LOGIN=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

az container create --resource-group rg-containers-lab --name aci-dashboard \
  --image "$ACR_LOGIN/contoso-dashboard:v1" \
  --registry-login-server $ACR_LOGIN --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label contoso-aci-$RANDOM --ports 80 --cpu 0.5 --memory 0.5

# Task 4–5: Container Apps
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights

az containerapp env create --resource-group rg-containers-lab \
  --name cae-contoso-lab --location eastus

az containerapp create --resource-group rg-containers-lab --name ca-dashboard \
  --environment cae-contoso-lab --image "$ACR_LOGIN/contoso-dashboard:v1" \
  --registry-server $ACR_LOGIN --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --target-port 80 --ingress external --min-replicas 1 --max-replicas 5

# Task 6: Scaling
az containerapp update --resource-group rg-containers-lab --name ca-dashboard \
  --min-replicas 1 --max-replicas 10 \
  --scale-rule-name http-scaling --scale-rule-type http --scale-rule-http-concurrency 10
```

**Por quê**: `az acr build` é o comando chave | ele constrói imagens Docker na nuvem sem precisar do Docker instalado localmente. Este é um cenário comum do exame. A distinção entre ACI (simples/curta duração), Container Apps (microsserviços/APIs) e AKS (Kubernetes completo) é fortemente testada.

### Erros Comuns

1. **Validação do nome ACR** | 5–50 caracteres, apenas alfanumérico (sem hifens!)
2. **Incompatibilidade de porta** | implantar com `--target-port 8080` quando o container escuta na 80 → erros 502
3. **Esquecer credenciais do registro** | Container Apps sem credenciais não conseguem puxar de ACR privado
4. **Provider não registrado** | `Microsoft.App` e `Microsoft.OperationalInsights` devem ser registrados antes de criar ambientes Container Apps
5. **Escolha ACI vs Container Apps** | alunos usam ACI para tudo por padrão; oriente que Container Apps é preferido para qualquer coisa que precise de escalonamento, HTTPS ou múltiplas réplicas

---

## Desafio 10: Azure App Service

> **Estimativa de tempo do instrutor**: 45–55 min (alunos: 60–75 min) | Domínio: Computação

### Solução Completa

```bash
az group create --name rg-appservice-lab --location eastus

# Task 1: App Service Plan (S1 for slots)
az appservice plan create --resource-group rg-appservice-lab \
  --name plan-contoso-web --sku S1 --is-linux

# Task 2: Web app
APP_NAME="contoso-web-$(date +%s | tail -c 8)"
az webapp create --resource-group rg-appservice-lab \
  --plan plan-contoso-web --name $APP_NAME --runtime "NODE:18-lts"

# Task 3: Deploy code (zip deploy)
mkdir webapp && cd webapp
cat > index.js << 'EOF'
const http = require('http');
const port = process.env.PORT || 8080;
const version = process.env.APP_VERSION || 'v1';
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<h1>Contoso Marketing - ${version}</h1><p>Server time: ${new Date()}</p>`);
});
server.listen(port, () => console.log(`Running on port ${port}`));
EOF
cat > package.json << 'EOF'
{"name":"contoso-web","version":"1.0.0","scripts":{"start":"node index.js"},"engines":{"node":">=18.0.0"}}
EOF
zip -r app.zip index.js package.json
az webapp deploy --resource-group rg-appservice-lab --name $APP_NAME \
  --src-path app.zip --type zip

az webapp config appsettings set --resource-group rg-appservice-lab \
  --name $APP_NAME --settings APP_VERSION=v1

# Task 4-6: Deployment slots and swap
az webapp deployment slot create --resource-group rg-appservice-lab \
  --name $APP_NAME --slot staging

az webapp config appsettings set --resource-group rg-appservice-lab \
  --name $APP_NAME --slot staging --settings APP_VERSION=v2

# Swap staging → production (zero downtime)
az webapp deployment slot swap --resource-group rg-appservice-lab \
  --name $APP_NAME --slot staging --target-slot production

# Task 7: Autoscale
az monitor autoscale create --resource-group rg-appservice-lab \
  --resource plan-contoso-web --resource-type Microsoft.Web/serverfarms \
  --name autoscale-web --min-count 1 --max-count 5 --count 1

az monitor autoscale rule create --resource-group rg-appservice-lab \
  --autoscale-name autoscale-web \
  --condition "CpuPercentage > 70 avg 5m" --scale out 1

az monitor autoscale rule create --resource-group rg-appservice-lab \
  --autoscale-name autoscale-web \
  --condition "CpuPercentage < 30 avg 10m" --scale in 1
```

**Por quê**: Slots de implantação requerem o tier Standard (S1) ou superior | esta é uma pegadinha comum do exame. A operação de swap é atômica: o Azure aquece o slot de staging, depois troca o roteamento. Após o swap, o código antigo de produção está no staging | rollback instantâneo fazendo swap novamente. Configurações marcadas como "slot settings" não são trocadas (ficam fixas no slot).

### Erros Comuns

1. **Tier Free/Basic → sem slots** | alunos tentam criar slots nos planos F1/B1 e ficam confusos com o erro
2. **Direção do swap de slot** | alunos confundem qual slot vai para onde; staging→production significa que o código do staging se torna produção
3. **App settings que trocam vs não trocam** | connection strings e app settings trocam por padrão a menos que marcados como "slot setting" (fixos)
4. **Scale-up vs scale-out** | alunos confundem mudar o tier do plano (vertical) com adicionar instâncias (horizontal)
5. **Esquecer de implantar código no staging** | alunos criam o slot mas esquecem que ele começa vazio

---

## Desafio 11: Virtual Networks & Subnets

> **Estimativa de tempo do instrutor**: 35–45 min (alunos: 45–60 min) | Domínio: Rede

### Solução Completa

```bash
az group create --name rg-network-lab --location eastus

# Hub VNet
az network vnet create --resource-group rg-network-lab --name vnet-hub \
  --address-prefix 10.0.0.0/16 --subnet-name snet-frontend --subnet-prefix 10.0.1.0/24
az network vnet subnet create --resource-group rg-network-lab --vnet-name vnet-hub \
  --name snet-backend --address-prefix 10.0.2.0/24

# Spoke VNet
az network vnet create --resource-group rg-network-lab --name vnet-spoke \
  --address-prefix 10.1.0.0/16 --subnet-name snet-workloads --subnet-prefix 10.1.1.0/24

# Bidirectional peering
HUB_ID=$(az network vnet show -g rg-network-lab -n vnet-hub --query id -o tsv)
SPOKE_ID=$(az network vnet show -g rg-network-lab -n vnet-spoke --query id -o tsv)

az network vnet peering create -g rg-network-lab --name hub-to-spoke \
  --vnet-name vnet-hub --remote-vnet $SPOKE_ID \
  --allow-vnet-access true --allow-forwarded-traffic true

az network vnet peering create -g rg-network-lab --name spoke-to-hub \
  --vnet-name vnet-spoke --remote-vnet $HUB_ID \
  --allow-vnet-access true --allow-forwarded-traffic true

# Deploy test VMs
az vm create -g rg-network-lab --name vm-hub --image Ubuntu2204 --size Standard_B1s \
  --vnet-name vnet-hub --subnet snet-frontend --admin-username azureuser \
  --generate-ssh-keys --public-ip-address pip-hub --no-wait

az vm create -g rg-network-lab --name vm-spoke --image Ubuntu2204 --size Standard_B1s \
  --vnet-name vnet-spoke --subnet snet-workloads --admin-username azureuser \
  --generate-ssh-keys --public-ip-address pip-spoke --no-wait

# UDR
az network route-table create -g rg-network-lab --name rt-spoke-to-hub
HUB_PRIVATE_IP=$(az vm show -g rg-network-lab -n vm-hub -d --query privateIps -o tsv)
az network route-table route create -g rg-network-lab --route-table-name rt-spoke-to-hub \
  --name route-via-hub-nva --address-prefix 10.0.1.0/24 \
  --next-hop-type VirtualAppliance --next-hop-ip-address $HUB_PRIVATE_IP
az network vnet subnet update -g rg-network-lab --vnet-name vnet-spoke \
  --name snet-workloads --route-table rt-spoke-to-hub

# Network Watcher
SPOKE_PRIVATE_IP=$(az vm show -g rg-network-lab -n vm-spoke -d --query privateIps -o tsv)
az network watcher test-ip-flow -g rg-network-lab --vm vm-spoke --direction Outbound \
  --protocol TCP --local "$SPOKE_PRIVATE_IP:*" --remote "$HUB_PRIVATE_IP:80"
az network watcher show-next-hop -g rg-network-lab --vm vm-spoke \
  --source-ip $SPOKE_PRIVATE_IP --dest-ip $HUB_PRIVATE_IP
```

**Por quê**: O peering NÃO é transitivo | se a VNet A tem peering com B e B tem peering com C, A não pode falar com C sem peering direto ou um gateway. UDRs substituem rotas de sistema | a ordem de prioridade é UDR > BGP > Sistema. O IP Flow Verify do Network Watcher verifica apenas NSGs; use Next Hop para problemas de roteamento.

### Erros Comuns

1. **Peering unidirecional** | alunos criam apenas hub→spoke e esquecem spoke→hub; peering requer ambos os lados
2. **Espaços de endereço sobrepostos** | não é possível fazer peering de VNets com blocos CIDR sobrepostos
3. **ICMP bloqueado pelo NSG padrão** | ping não funciona até os alunos adicionarem uma regra de permissão ICMP
4. **IP de next hop do UDR não existe** | o tráfego é perdido silenciosamente; use o Network Watcher para diagnosticar
5. **Estado de peering "Disconnected"** | acontece quando um lado é excluído; ambos os lados devem ser recriados

---

## Desafio 12: Network Security

> **Estimativa de tempo do instrutor**: 40–50 min (alunos: 60 min) | Domínio: Rede

### Solução Completa

```bash
az group create --name rg-netsec-lab --location eastus

# VNet with subnets
az network vnet create -g rg-netsec-lab --name vnet-secure \
  --address-prefix 10.0.0.0/16 --subnet-name snet-frontend --subnet-prefix 10.0.1.0/24
az network vnet subnet create -g rg-netsec-lab --vnet-name vnet-secure \
  --name snet-backend --address-prefix 10.0.2.0/24

# NSG with rules
az network nsg create -g rg-netsec-lab --name nsg-frontend
az network nsg rule create -g rg-netsec-lab --nsg-name nsg-frontend --name AllowHTTP \
  --priority 100 --direction Inbound --access Allow --protocol Tcp \
  --destination-port-ranges 80
az network nsg rule create -g rg-netsec-lab --nsg-name nsg-frontend --name AllowHTTPS \
  --priority 110 --direction Inbound --access Allow --protocol Tcp \
  --destination-port-ranges 443
az network nsg rule create -g rg-netsec-lab --nsg-name nsg-frontend --name DenyAllInbound \
  --priority 4000 --direction Inbound --access Deny --protocol '*' \
  --destination-port-ranges '*'

az network vnet subnet update -g rg-netsec-lab --vnet-name vnet-secure \
  --name snet-frontend --network-security-group nsg-frontend

# ASGs
az network asg create -g rg-netsec-lab --name asg-webservers
az network asg create -g rg-netsec-lab --name asg-dbservers

# Backend NSG with ASG rules
az network nsg create -g rg-netsec-lab --name nsg-backend
az network nsg rule create -g rg-netsec-lab --nsg-name nsg-backend --name AllowWebToDb \
  --priority 100 --direction Inbound --access Allow --protocol Tcp \
  --source-asgs asg-webservers --destination-asgs asg-dbservers \
  --destination-port-ranges 5432

az network vnet subnet update -g rg-netsec-lab --vnet-name vnet-secure \
  --name snet-backend --network-security-group nsg-backend

# Bastion
az network vnet subnet create -g rg-netsec-lab --vnet-name vnet-secure \
  --name AzureBastionSubnet --address-prefix 10.0.3.0/26
az network public-ip create -g rg-netsec-lab --name pip-bastion \
  --sku Standard --allocation-method Static
az network bastion create -g rg-netsec-lab --name bastion-secure \
  --public-ip-address pip-bastion --vnet-name vnet-secure --sku Basic --no-wait

# Service endpoint
STORAGE_NAME="contosodata$(date +%s | tail -c 8)"
az storage account create -g rg-netsec-lab --name $STORAGE_NAME --sku Standard_LRS
az network vnet subnet update -g rg-netsec-lab --vnet-name vnet-secure \
  --name snet-backend --service-endpoints Microsoft.Storage
SUBNET_ID=$(az network vnet subnet show -g rg-netsec-lab --vnet-name vnet-secure \
  -n snet-backend --query id -o tsv)
az storage account network-rule add -g rg-netsec-lab --account-name $STORAGE_NAME \
  --subnet $SUBNET_ID
az storage account update -g rg-netsec-lab --name $STORAGE_NAME --default-action Deny

# Private endpoint
az network vnet subnet update -g rg-netsec-lab --vnet-name vnet-secure \
  --name snet-backend --private-endpoint-network-policies Disabled
STORAGE_ID=$(az storage account show -g rg-netsec-lab -n $STORAGE_NAME --query id -o tsv)
az network private-endpoint create -g rg-netsec-lab --name pe-storage \
  --vnet-name vnet-secure --subnet snet-backend \
  --private-connection-resource-id $STORAGE_ID --group-id blob \
  --connection-name pe-storage-connection
```

**Por quê**: A prioridade do NSG importa | **número mais baixo = maior prioridade = avaliado primeiro**. A primeira regra correspondente vence e a avaliação para. ASGs permitem escrever regras usando grupos lógicos (webservers, dbservers) em vez de endereços IP | muito mais fácil de gerenciar em escala. A subnet do Bastion DEVE ser nomeada exatamente `AzureBastionSubnet` e ter no mínimo /26.

### Erros Comuns

1. **Confusão na ordem de prioridade** | número mais baixo = maior prioridade; alunos frequentemente invertem isso
2. **Nomenclatura da subnet do Bastion** | deve ser exatamente `AzureBastionSubnet`, sensível a maiúsculas; qualquer outro nome falha
3. **Avaliação dupla de NSG** | entrada: NSG da subnet primeiro, depois NSG da NIC; ambos devem permitir; alunos esquecem o NSG no nível da NIC
4. **Service endpoint vs private endpoint** | service endpoints roteiam pelo backbone mas usam IP público; private endpoints criam um IP privado na sua VNet (mais seguro, funciona com on-prem)
5. **Cobranças horárias do Bastion** | ~$0,19/hora; lembre os alunos de excluir rapidamente!

---

## Desafio 13: DNS & Load Balancing

> **Estimativa de tempo do instrutor**: 40–50 min (alunos: 60 min) | Domínio: Rede

### Solução Completa

```bash
RG="rg-az104-challenge13"
az group create --name $RG --location eastus

# DNS Zone
az network dns zone create --resource-group $RG --name lab.contoso.com

# DNS Records
az network dns record-set a add-record -g $RG --zone-name lab.contoso.com \
  --record-set-name www --ipv4-address 10.0.0.4
az network dns record-set cname set-record -g $RG --zone-name lab.contoso.com \
  --record-set-name portal --cname www.lab.contoso.com
az network dns record-set txt add-record -g $RG --zone-name lab.contoso.com \
  --record-set-name @ --value "contoso-verification=12345"

# Load Balancer
az network lb create -g $RG --name lb-web --sku Standard \
  --frontend-ip-name lb-frontend --backend-pool-name lb-backend --public-ip-address lb-pip

# VNet and VMs
az network vnet create -g $RG --name vnet-lb --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-backend --subnet-prefix 10.0.1.0/24

for i in 1 2; do
  az vm create -g $RG --name vm-web-$i --image Ubuntu2204 --size Standard_B1s \
    --vnet-name vnet-lb --subnet subnet-backend --nsg "" --public-ip-address "" \
    --admin-username azureuser --generate-ssh-keys
done

# Health probe
az network lb probe create -g $RG --lb-name lb-web --name hp-http \
  --protocol Http --port 80 --path /

# LB Rule
az network lb rule create -g $RG --lb-name lb-web --name rule-http \
  --frontend-ip-name lb-frontend --backend-pool-name lb-backend \
  --probe-name hp-http --protocol Tcp --frontend-port 80 --backend-port 80

# Internal LB (no public IP)
az network lb create -g $RG --name lb-internal --sku Standard \
  --frontend-ip-name lb-internal-frontend --backend-pool-name lb-internal-backend \
  --vnet-name vnet-lb --subnet subnet-backend
```

**Por quê**: O LB Standard requer um NSG na subnet (diferente do Basic). Health probes determinam a integridade do backend | se uma VM falhar no probe, o LB para de enviar tráfego para ela. LBs internos não têm IP público | eles usam um IP privado de uma subnet VNet para comunicação backend-para-backend.

### Erros Comuns

1. **LB Standard vs Basic** | Standard requer NSG na subnet, suporta zonas de disponibilidade e tem um SLA; Basic não. Alunos esquecem o requisito de NSG e se perguntam por que o tráfego não flui
2. **VMs não estão no backend pool** | criar VMs não as adiciona automaticamente ao backend pool do LB; as NICs devem ser associadas
3. **Configuração errada do health probe** | porta ou caminho errado significa que todos os backends ficam não saudáveis e o LB para de encaminhar
4. **Zona DNS não resolve** | alunos esquecem que sem delegação NS do domínio pai, a resolução pública não funciona; mas eles ainda podem verificar registros com `az network dns record-set list`
5. **Camada 4 vs Camada 7** | Load Balancer é L4 (TCP/UDP); Application Gateway é L7 (HTTP/HTTPS com roteamento por URL, terminação SSL, WAF)

---

## Desafio 14: Azure Monitor & Alerts

> **Estimativa de tempo do instrutor**: 40–50 min (alunos: 60 min) | Domínio: Monitorar & Manter

### Solução Completa

```bash
RG="rg-az104-challenge14"
az group create --name $RG --location eastus

# Log Analytics workspace
az monitor log-analytics workspace create -g $RG --workspace-name law-contoso --location eastus

# VM for monitoring
az vm create -g $RG --name vm-monitored --image Ubuntu2204 --size Standard_B2s \
  --admin-username azureuser --generate-ssh-keys

# Enable VM Insights via Portal: VM → Insights → Enable

# Diagnostic settings
WORKSPACE_ID=$(az monitor log-analytics workspace show -g $RG \
  --workspace-name law-contoso --query id -o tsv)
VM_ID=$(az vm show -g $RG --name vm-monitored --query id -o tsv)

az monitor diagnostic-settings create --name diag-to-law --resource $VM_ID \
  --workspace $WORKSPACE_ID --metrics '[{"category":"AllMetrics","enabled":true}]'

# Action group
az monitor action-group create -g $RG --name ag-ops-team --short-name OpsTeam \
  --action email ops-email yourname@contoso.com

# Metric alert (CPU > 80%)
az monitor metrics alert create -g $RG --name alert-high-cpu --scopes $VM_ID \
  --condition "avg Percentage CPU > 80" --window-size 5m --evaluation-frequency 1m \
  --action ag-ops-team --severity 2 \
  --description "CPU usage exceeded 80% for 5 minutes"
```

**Consultas KQL chave para coaching:**

```kusto
// Top processes by CPU
Perf
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| where InstanceName == "_Total"
| summarize AvgCPU = avg(CounterValue) by Computer
| top 10 by AvgCPU desc

// Heartbeat check | which VMs are reporting?
Heartbeat
| summarize LastHeartbeat = max(TimeGenerated) by Computer
| extend Status = iff(LastHeartbeat < ago(5m), "Offline", "Online")

// Error events in last 24h
Syslog
| where SeverityLevel == "error"
| where TimeGenerated > ago(24h)
| project TimeGenerated, Computer, SyslogMessage
| order by TimeGenerated desc
| take 50
```

**Por quê**: Métricas são séries temporais numéricas (quase em tempo real); Logs são texto estruturado (consultado com KQL). O exame testa operadores KQL essenciais: `where`, `summarize`, `ago()`, `project`, `render`. Severidade de alerta: 0=Crítico, 1=Erro, 2=Aviso, 3=Informativo, 4=Detalhado.

### Erros Comuns

1. **Resultados de log vazios** | dados levam 15–30 minutos para aparecer após habilitar diagnósticos; isso é esperado, não está quebrado
2. **Alerta sem grupo de ação** | alerta dispara mas ninguém é notificado; alunos esquecem de anexar o grupo de ação
3. **Erros de sintaxe KQL** | `where` usa `==` para igualdade (não `=`); pipe `|` separa operadores
4. **Alerta de métrica vs alerta de log** | alertas de métrica são para limites numéricos (CPU > 80%); alertas de log são para resultados de consulta KQL (contagem de erros > 0)
5. **Regras de processamento de alertas** | suprimem notificações durante janelas de manutenção; alunos confundem estas com regras de alerta

---

## Desafio 15: Backup & Recovery

> **Estimativa de tempo do instrutor**: 45–55 min (alunos: 60–75 min) | Domínio: Monitorar & Manter

### Solução Completa

```bash
RG="rg-az104-challenge15"
az group create --name $RG --location eastus

# Recovery Services vault
az backup vault create -g $RG --name rsv-contoso --location eastus

# VM to back up
az vm create -g $RG --name vm-backup-test --image Ubuntu2204 --size Standard_B1s \
  --admin-username azureuser --generate-ssh-keys

# Enable backup with default policy
az backup protection enable-for-vm -g $RG --vault-name rsv-contoso \
  --vm vm-backup-test --policy-name DefaultPolicy

# On-demand backup
az backup protection backup-now -g $RG --vault-name rsv-contoso \
  --container-name "IaasVMContainer;iaasvmcontainerv2;$RG;vm-backup-test" \
  --item-name "VM;iaasvmcontainerv2;$RG;vm-backup-test" \
  --retain-until "2025-12-31"

# Azure Backup vault (for blobs)
az dataprotection backup-vault create -g $RG --vault-name bv-contoso \
  --location eastus \
  --storage-setting "[{type:LocallyRedundant,datastore-type:VaultStore}]"

# Site Recovery and blob backup are best configured via Portal (see challenge)
```

**Por quê**: Dois tipos de vault | Recovery Services vault (VMs, SQL, Azure Files, Site Recovery) e Azure Backup vault (Blobs, Discos, PostgreSQL). O vault deve estar na mesma região das VMs sendo protegidas. O primeiro backup leva 30–60 min. RPO = perda máxima de dados; RTO = tempo máximo de inatividade | estes termos são favoritos do exame.

### Erros Comuns

1. **Formato do nome do container** | o formato longo `IaasVMContainer;iaasvmcontainerv2;...` é confuso; oriente os alunos a usar `az backup container list` para obter o nome exato
2. **Incompatibilidade de região do vault** | não é possível fazer backup de uma VM em westus2 com um vault em eastus
3. **Excluir vault com itens protegidos** | deve parar a proteção e excluir dados de backup PRIMEIRO, depois excluir o vault
4. **Confusão Site Recovery vs Backup** | Backup = proteção de dados (restaurar arquivos/VMs); Site Recovery = recuperação de desastres (replicar VMs inteiras para outra região)
5. **Limpeza de test failover** | alunos esquecem de limpar recursos de test failover, que continuam rodando e gerando cobranças

---

## Desafio 16: Capstone: Um Dia na Vida de um Administrador Azure

> **Estimativa de tempo do instrutor**: 60–80 min (alunos: 90–120 min) | Domínio: Todos os 5 domínios

### Solução Completa

**Este desafio é um exercício de troubleshooting | o valor está no processo de diagnóstico, não apenas na correção. Guie os alunos pelos passos de diagnóstico antes de revelar as soluções.**

#### Ticket 1: Crise de Identidade

```bash
# Diagnose: Is the account enabled?
az ad user show --id jordan@contoso.com --query accountEnabled
# Diagnose: Is Jordan in the Developers group?
az ad group member check --group "Developers" \
  --member-id $(az ad user show --id jordan@contoso.com --query id -o tsv)

# Fix
az ad user update --id jordan@contoso.com --account-enabled true
az ad user update --id jordan@contoso.com \
  --password "TempP@ss123!" --force-change-password-next-sign-in true
az ad group member add --group "Developers" \
  --member-id $(az ad user show --id jordan@contoso.com --query id -o tsv)
```

**Dica de coaching**: Sempre verifique o mais simples primeiro | a conta está habilitada? Depois senha, depois associação ao grupo. Isso reflete o padrão de perguntas do exame "o que você deve verificar PRIMEIRO?".

#### Ticket 2: SOS de Storage

```bash
# Diagnose: Check firewall rules and SAS expiry
az storage account show --name stcontoso -g rg-az104-capstone-storage \
  --query networkRuleSet.defaultAction
# If "Deny": check IP allow list
# Check if SAS token has expired (decode the `se` parameter in the token)

# Fix: Generate new SAS or add IP to firewall
END_DATE=$(date -u -d "+7 days" '+%Y-%m-%dT%H:%MZ')
az storage account generate-sas --account-name stcontoso \
  --permissions rwdlacup --resource-types sco --services b --expiry $END_DATE -o tsv
```

**Dica de coaching**: AuthorizationFailure tem três causas comuns: SAS expirado, chaves rotacionadas ou firewall bloqueando. Ensine os alunos a verificar todas as três sistematicamente.

#### Ticket 3: VM Fora do Ar

```bash
# Diagnose: Who stopped it?
az monitor activity-log list -g rg-az104-capstone-compute \
  --query "[?contains(operationName.value,'deallocate')].{Time:eventTimestamp,Caller:caller}" -o table
# Check auto-shutdown
az vm auto-shutdown show -g rg-az104-capstone-compute --name vm-prod-01

# Fix
az vm start -g rg-az104-capstone-compute --name vm-prod-01
az vm auto-shutdown -g rg-az104-capstone-compute --name vm-prod-01 --off
```

**Dica de coaching**: O Log de Atividades é o primeiro lugar para procurar para perguntas "quem/quando/por quê". Ele registra todas as operações do plano de controle com identidade do chamador e timestamps.

#### Ticket 4: Bloqueio de Rede

```bash
# Diagnose: Check NSG rules
az network nsg rule list -g rg-az104-capstone-network --nsg-name nsg-web -o table
# Use IP Flow Verify
az network watcher test-ip-flow -g rg-az104-capstone-network --vm vm-web-01 \
  --direction Inbound --protocol TCP --local 10.0.0.4:443 --remote 0.0.0.0:*

# Fix: Add Allow rule BEFORE the Deny rule (lower priority number)
az network nsg rule create -g rg-az104-capstone-network --nsg-name nsg-web \
  --name Allow-HTTPS --priority 100 --direction Inbound --access Allow \
  --protocol Tcp --destination-port-ranges 443
```

**Dica de coaching**: Regras NSG são avaliadas do número-mais-baixo-primeiro. Um Deny na prioridade 200 bloqueia tudo | você precisa de um Allow com número mais baixo (ex: 100) para permitir tráfego específico.

#### Ticket 5: Cadê Meus Alertas?

```bash
# Diagnose: Check action group and alert rule
az monitor action-group show -g rg-az104-capstone-monitor --name ag-ops-team
# Look for typos in email addresses!
az monitor metrics alert show -g rg-az104-capstone-monitor \
  --name alert-vm-availability --query isEnabled

# Fix
az monitor action-group update -g rg-az104-capstone-monitor --name ag-ops-team \
  --add-action email ops-email correctemail@contoso.com
az monitor metrics alert update -g rg-az104-capstone-monitor \
  --name alert-vm-availability --enabled true
```

**Dica de coaching**: Três coisas para verificar quando alertas "não funcionam": (1) A regra de alerta está habilitada? (2) Um grupo de ação está anexado? (3) O grupo de ação está configurado corretamente (erros de digitação em emails são comuns)?

### Erros Comuns

1. **Pular para a correção sem diagnosticar** | alunos querem corrigir imediatamente; force-os a diagnosticar primeiro | o exame recompensa troubleshooting sistemático
2. **Não verificar o Log de Atividades** | esta é a resposta para toda pergunta "quem/quando/por quê"
3. **Confusão de prioridade NSG sob pressão** | em cenários cronometrados, alunos adicionam regras com prioridades erradas
4. **Esquecer de limpar todos os 5 grupos de recursos** | cada ticket tem seu próprio RG
5. **Super-engenharia da correção** | alunos querem redesenhar tudo; o capstone recompensa correções direcionadas e mínimas

---

## Cronograma de Facilitação do Workshop

| Bloco | Duração | Desafios | Foco |
|-------|---------|----------|------|
| **Dia 1 Manhã** | 3 horas | 01–03 | Identidade & Governança |
| **Dia 1 Tarde** | 3 horas | 04–06 | Armazenamento |
| **Dia 2 Manhã** | 3 horas | 07–10 | Computação |
| **Dia 2 Tarde** | 2,5 horas | 11–13 | Rede |
| **Dia 3 Manhã** | 2 horas | 14–15 | Monitorar & Manter |
| **Dia 3 Tarde** | 2 horas | 16 | Capstone |

**Tempo total do workshop**: ~15,5 horas (3 dias)

### Dicas para Instrutores

1. **Deixe os alunos lutarem** | o aprendizado acontece quando eles depuram seus próprios erros
2. **Use cenários de quebre & conserte** | estes simulam perguntas reais do exame melhor do que o caminho feliz
3. **Limite o tempo de cada desafio** | se um aluno estiver travado por >15 min em uma tarefa, dê uma dica direcionada
4. **Incentive CLI em vez do Portal** | o exame é baseado em cenários e o conhecimento de CLI demonstra compreensão mais profunda
5. **Revise a limpeza** | alunos que não limpam gastam créditos; faça da limpeza um hábito após cada desafio
6. **Rastreie bloqueios comuns** | se >50% dos alunos encontrarem o mesmo problema, pause e aborde para todos
