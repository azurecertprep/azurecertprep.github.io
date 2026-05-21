---
sidebar_position: 10
title: "Desafio 10: Azure Policy para Segurança"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 10: Azure Policy para Segurança

## Habilidades do exame cobertas

- Implementar Azure Policy para governança de segurança
- Atribuir definições e iniciativas de políticas de segurança integradas
- Criar definições de políticas personalizadas para requisitos de segurança
- Configurar padrões de segurança e recomendações do Defender for Cloud
- Implementar isenções de políticas e tarefas de remediação
- Monitorar conformidade e desvios de políticas

## Cenário

A equipe de governança de nuvem da Contoso Ltd descobriu que equipes de desenvolvimento estão implantando recursos sem configurações de segurança adequadas — Key Vaults sem exclusão suave, contas de armazenamento com acesso público, VMs sem criptografia de disco e recursos sem as tags exigidas. O CISO exige a implementação do Azure Policy para aplicar linhas de base de segurança em escala, alinhar com o Microsoft Cloud Security Benchmark (MCSB) e criar políticas personalizadas para requisitos de segurança específicos da Contoso que não são cobertos por definições integradas.

---

## Pré-requisitos

- Assinatura do Azure com a função Owner ou Resource Policy Contributor
- Azure CLI instalado e autenticado
- Conhecimento de templates Azure Resource Manager (ARM)
- Defender for Cloud habilitado na assinatura

---

## Tarefa 1: Atribuir a iniciativa Microsoft Cloud Security Benchmark

Aplique a iniciativa MCSB para estabelecer uma linha de base de segurança abrangente.

```bash
# Set variables
SUB_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-policy-lab"
LOCATION="eastus2"

# Create resource group for testing
az group create --name $RG_NAME --location $LOCATION

# List available security initiatives (policy sets)
az policy set-definition list --query "[?contains(displayName,'Microsoft cloud security benchmark') || contains(displayName,'Azure Security Benchmark')].{name:name, displayName:displayName}" -o table

# Assign the Microsoft Cloud Security Benchmark at subscription level
az policy assignment create \
  --name "mcsb-assignment" \
  --display-name "Microsoft Cloud Security Benchmark" \
  --policy-set-definition "1f3afdf9-d0c9-4c3d-847f-89da613e70a8" \
  --scope "/subscriptions/$SUB_ID" \
  --enforcement-mode Default \
  --identity-type SystemAssigned \
  --location $LOCATION

# Verify the assignment
az policy assignment show --name "mcsb-assignment" \
  --query "{name:displayName, enforcement:enforcementMode, scope:scope}" -o json

# Check compliance state (may take 30+ minutes for initial evaluation)
az policy state summarize \
  --policy-assignment "mcsb-assignment" \
  --query "{compliant:results.resourceDetails[?complianceState=='compliant'].count, nonCompliant:results.resourceDetails[?complianceState=='noncompliant'].count}" 2>/dev/null || echo "Compliance evaluation pending"
```

## Tarefa 2: Atribuir políticas de segurança integradas com efeito Deny

Aplique configurações de segurança críticas que nunca devem ser violadas.

```bash
# Policy: Deny Key Vaults without soft-delete
az policy assignment create \
  --name "deny-kv-no-softdelete" \
  --display-name "Deny Key Vaults without soft-delete" \
  --policy "1e66c121-a66a-4b1f-9b83-0fd5dd164d6e" \
  --scope "/subscriptions/$SUB_ID" \
  --enforcement-mode Default

# Policy: Deny storage accounts that allow public blob access
az policy assignment create \
  --name "deny-storage-public-access" \
  --display-name "Deny storage accounts with public access" \
  --policy "4fa4b6c0-31ca-4c0d-b10d-24b96f62a751" \
  --scope "/subscriptions/$SUB_ID" \
  --enforcement-mode Default

# Policy: Deny VMs without managed disks
az policy assignment create \
  --name "deny-vm-unmanaged-disks" \
  --display-name "Deny VMs with unmanaged disks" \
  --policy "06a78e20-9358-41c9-923c-fb736d382a4d" \
  --scope "/subscriptions/$SUB_ID" \
  --enforcement-mode Default

# Policy: Require specific tags on resource groups
az policy assignment create \
  --name "require-env-tag" \
  --display-name "Require Environment tag on resource groups" \
  --policy "96670d01-0a4d-4649-9c89-2d3abc0a5025" \
  --scope "/subscriptions/$SUB_ID" \
  --params '{"tagName":{"value":"Environment"}}' \
  --enforcement-mode Default

# Policy: Deny public IP addresses (network isolation)
az policy assignment create \
  --name "deny-public-ip" \
  --display-name "Deny public IP creation in production" \
  --policy "6c112d4e-5bc7-47ae-a041-ea2d9dccd749" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME" \
  --enforcement-mode Default

# List all policy assignments on the subscription
az policy assignment list --scope "/subscriptions/$SUB_ID" \
  --query "[?contains(displayName,'Deny') || contains(displayName,'Require')].{name:displayName, enforcement:enforcementMode}" -o table
```

## Tarefa 3: Criar uma definição de política personalizada

Crie políticas personalizadas para requisitos específicos da Contoso não cobertos por definições integradas.

```bash
# Custom Policy: Deny Key Vaults without RBAC authorization enabled
az policy definition create \
  --name "deny-kv-no-rbac" \
  --display-name "Deny Key Vaults without RBAC authorization" \
  --description "Ensures all Key Vaults use RBAC authorization instead of access policies" \
  --rules '{
    "if": {
      "allOf": [
        {
          "field": "type",
          "equals": "Microsoft.KeyVault/vaults"
        },
        {
          "field": "Microsoft.KeyVault/vaults/enableRbacAuthorization",
          "notEquals": true
        }
      ]
    },
    "then": {
      "effect": "deny"
    }
  }' \
  --mode All

# Custom Policy: Audit resources without approved encryption
az policy definition create \
  --name "audit-missing-encryption-tag" \
  --display-name "Audit resources without encryption classification tag" \
  --description "Identifies resources missing the DataClassification tag required by Contoso security policy" \
  --rules '{
    "if": {
      "allOf": [
        {
          "field": "type",
          "in": [
            "Microsoft.Storage/storageAccounts",
            "Microsoft.Sql/servers/databases",
            "Microsoft.KeyVault/vaults"
          ]
        },
        {
          "field": "tags['\''DataClassification'\'']",
          "exists": false
        }
      ]
    },
    "then": {
      "effect": "audit"
    }
  }' \
  --mode All

# Custom Policy: Deny resources in non-approved regions
az policy definition create \
  --name "deny-non-approved-regions" \
  --display-name "Restrict resources to approved regions" \
  --description "Only allows resource creation in Contoso-approved Azure regions" \
  --rules '{
    "if": {
      "not": {
        "field": "location",
        "in": ["eastus2", "centralus", "westeurope", "northeurope"]
      }
    },
    "then": {
      "effect": "deny"
    }
  }' \
  --params '{
    "allowedLocations": {
      "type": "Array",
      "metadata": {
        "displayName": "Allowed Locations",
        "description": "List of Azure regions where resources can be deployed"
      },
      "defaultValue": ["eastus2", "centralus", "westeurope", "northeurope"]
    }
  }' \
  --mode All

# Assign the custom Key Vault RBAC policy
az policy assignment create \
  --name "deny-kv-no-rbac" \
  --display-name "Deny Key Vaults without RBAC authorization" \
  --policy "deny-kv-no-rbac" \
  --scope "/subscriptions/$SUB_ID" \
  --enforcement-mode Default
```

## Tarefa 4: Criar uma iniciativa de política personalizada

Agrupe múltiplas políticas de segurança em uma iniciativa de segurança específica da Contoso.

```bash
# Create the initiative (policy set) definition
az policy set-definition create \
  --name "contoso-security-baseline" \
  --display-name "Contoso Security Baseline" \
  --description "Contoso-specific security requirements for all Azure resources" \
  --definitions "[
    {
      \"policyDefinitionId\": \"/subscriptions/$SUB_ID/providers/Microsoft.Authorization/policyDefinitions/deny-kv-no-rbac\",
      \"policyDefinitionReferenceId\": \"kvRbacRequired\"
    },
    {
      \"policyDefinitionId\": \"/subscriptions/$SUB_ID/providers/Microsoft.Authorization/policyDefinitions/audit-missing-encryption-tag\",
      \"policyDefinitionReferenceId\": \"encryptionTagRequired\"
    },
    {
      \"policyDefinitionId\": \"/providers/Microsoft.Authorization/policyDefinitions/1e66c121-a66a-4b1f-9b83-0fd5dd164d6e\",
      \"policyDefinitionReferenceId\": \"kvSoftDeleteRequired\"
    },
    {
      \"policyDefinitionId\": \"/providers/Microsoft.Authorization/policyDefinitions/0a914e76-4921-4c19-b460-a2d36003525a\",
      \"policyDefinitionReferenceId\": \"kvDiagnosticsRequired\"
    }
  ]" \
  --metadata '{"category":"Security","version":"1.0.0"}'

# Assign the initiative
az policy assignment create \
  --name "contoso-security-baseline" \
  --display-name "Contoso Security Baseline Initiative" \
  --policy-set-definition "contoso-security-baseline" \
  --scope "/subscriptions/$SUB_ID" \
  --enforcement-mode Default \
  --identity-type SystemAssigned \
  --location $LOCATION
```

## Tarefa 5: Configurar recomendações e padrões do Defender for Cloud

Alinhe o Defender for Cloud com padrões de segurança personalizados e gerencie recomendações.

```bash
# List current security standards applied
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/securityStandards?api-version=2024-08-01" \
  --headers "Content-Type=application/json" \
  --query "value[].{name:properties.displayName, state:properties.state}" 2>/dev/null || \
az security regulatory-compliance-standards list \
  --query "[].{standard:name, state:state}" -o table 2>/dev/null || echo "Check Defender for Cloud portal for standards"

# Get unhealthy recommendations
az security assessment list \
  --query "[?status.code=='Unhealthy'].{recommendation:displayName, severity:metadata.severity, resource:resourceDetails.id}" -o table 2>/dev/null

# Exempt a resource from a specific recommendation (with justification)
az policy exemption create \
  --name "exempt-test-rg-from-tag" \
  --policy-assignment "require-env-tag" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME" \
  --exemption-category "Waiver" \
  --description "Test resource group for policy lab - exempt from tag requirement" \
  --expires-on "2025-12-31T23:59:59Z"

# Configure auto-provisioning for Defender recommendations
az security auto-provisioning-setting update \
  --name "default" \
  --auto-provision "On"

# List all exemptions
az policy exemption list \
  --scope "/subscriptions/$SUB_ID" \
  --query "[].{name:displayName, category:exemptionCategory, expires:expiresOn}" -o table
```

## Tarefa 6: Implementar tarefas de remediação para recursos não conformes

Crie tarefas de remediação para trazer recursos existentes à conformidade.

```bash
# Check which policies support remediation (DeployIfNotExists or Modify)
az policy assignment list --scope "/subscriptions/$SUB_ID" \
  --query "[?identity.type=='SystemAssigned'].{name:displayName, identity:identity.principalId}" -o table

# Create a remediation task for Key Vault diagnostics
az policy remediation create \
  --name "remediate-kv-diagnostics" \
  --policy-assignment "contoso-security-baseline" \
  --definition-reference-id "kvDiagnosticsRequired" \
  --scope "/subscriptions/$SUB_ID" \
  --resource-discovery-mode ReEvaluateCompliance

# Check remediation task status
az policy remediation show \
  --name "remediate-kv-diagnostics" \
  --scope "/subscriptions/$SUB_ID" \
  --query "{status:provisioningState, deployed:deploymentStatus.totalDeployments, succeeded:deploymentStatus.successfulDeployments, failed:deploymentStatus.failedDeployments}" -o json

# Trigger on-demand policy evaluation for faster feedback
az policy state trigger-scan \
  --resource-group $RG_NAME \
  --no-wait

# View non-compliant resources
az policy state list \
  --policy-assignment "contoso-security-baseline" \
  --filter "complianceState eq 'NonCompliant'" \
  --query "[].{resource:resourceId, policy:policyDefinitionName}" -o table 2>/dev/null

# Get overall compliance summary
az policy state summarize \
  --query "value[0].results.{total:totalResources, compliant:resourceDetails[?complianceState=='compliant'].count | [0], nonCompliant:resourceDetails[?complianceState=='noncompliant'].count | [0]}" 2>/dev/null || echo "Compliance data still evaluating"
```

---

## Break & Fix

### Cenário 1: Política bloqueia implantação legítima de recurso

Um desenvolvedor não consegue criar um Key Vault para seu ambiente de desenvolvimento porque a política personalizada "deny-kv-no-rbac" está bloqueando. O template ARM do desenvolvedor cria o Key Vault com access policies (padrão legado).

<details>
<summary>Mostrar solução</summary>

```bash
# Option 1: Update the developer's template to include RBAC authorization
# In the ARM template, add: "enableRbacAuthorization": true

# Option 2: Create a policy exemption for the dev resource group
az policy exemption create \
  --name "exempt-dev-kv-rbac" \
  --policy-assignment "deny-kv-no-rbac" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/rg-dev-team" \
  --exemption-category "Waiver" \
  --description "Dev team transitioning to RBAC - temporary exemption while updating templates" \
  --expires-on "$(date -u -d '+30 days' +%Y-%m-%dT%H:%M:%SZ)"

# Option 3: Change policy enforcement to audit-only for dev subscriptions
az policy assignment update \
  --name "deny-kv-no-rbac" \
  --enforcement-mode DoNotEnforce \
  --scope "/subscriptions/$SUB_ID/resourceGroups/rg-dev-team" 2>/dev/null || \
az policy assignment create \
  --name "audit-kv-no-rbac-dev" \
  --display-name "Audit Key Vaults without RBAC (dev)" \
  --policy "deny-kv-no-rbac" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/rg-dev-team" \
  --enforcement-mode DoNotEnforce

# Best practice: Use management groups with different policies per environment
# Production MG: Deny effect
# Development MG: Audit effect
echo "Recommended: Apply different enforcement per environment using Management Groups"
```

</details>

### Cenário 2: Conformidade da política mostra 0% mas recursos parecem configurados corretamente

Uma conta de armazenamento tem o acesso público desabilitado em suas configurações, mas o Azure Policy ainda a reporta como não conforme com a política "deny-storage-public-access".

<details>
<summary>Mostrar solução</summary>

```bash
# Check the specific non-compliance reason
az policy state list \
  --resource "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME/providers/Microsoft.Storage/storageAccounts/stcontoso" \
  --query "[].{policy:policyDefinitionName, reason:complianceState, details:policyDefinitionAction}" -o table 2>/dev/null

# Common cause: Policy evaluates a different property than what was configured
# The policy might check "allowBlobPublicAccess" at account level
# while the user disabled public access at the container level

# Fix: Ensure the account-level setting is correct
# az storage account update --name "stcontoso" --resource-group $RG_NAME \
#   --allow-blob-public-access false

# Trigger a re-evaluation (compliance scans are periodic)
az policy state trigger-scan --resource-group $RG_NAME --no-wait

# Another common cause: Evaluation delay
# Standard policy evaluation cycle is every 24 hours
# Use trigger-scan for immediate evaluation

# Check if the policy definition matches the correct property path
az policy definition show --name "4fa4b6c0-31ca-4c0d-b10d-24b96f62a751" \
  --query "policyRule.if" -o json

# Verify: The policy might check "Microsoft.Storage/storageAccounts/allowBlobPublicAccess"
# Ensure the property is set at the RESOURCE level, not just inherited
echo "Ensure 'allowBlobPublicAccess' is explicitly set to false on the storage account"
```

</details>

### Cenário 3: Tarefa de remediação falha com "DeploymentFailed"

Uma tarefa de remediação para habilitar configurações de diagnóstico em Key Vaults falha. O erro menciona "Authorization failed for the template deployment."

<details>
<summary>Mostrar solução</summary>

```bash
# Check the remediation task status and errors
az policy remediation show \
  --name "remediate-kv-diagnostics" \
  --scope "/subscriptions/$SUB_ID" \
  --query "{status:provisioningState, failed:deploymentStatus.failedDeployments}"

# The issue: The policy assignment's managed identity lacks permissions
# DeployIfNotExists policies need a managed identity to make changes

# Get the policy assignment's managed identity
POLICY_IDENTITY=$(az policy assignment show \
  --name "contoso-security-baseline" \
  --query "identity.principalId" -o tsv)

# Grant the necessary role (Contributor for diagnostic settings deployment)
az role assignment create \
  --assignee-object-id $POLICY_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --role "Contributor" \
  --scope "/subscriptions/$SUB_ID"

# For more restrictive access, use specific roles:
az role assignment create \
  --assignee-object-id $POLICY_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --role "Monitoring Contributor" \
  --scope "/subscriptions/$SUB_ID"

# Re-run the remediation task
az policy remediation delete --name "remediate-kv-diagnostics" --scope "/subscriptions/$SUB_ID"
az policy remediation create \
  --name "remediate-kv-diagnostics-v2" \
  --policy-assignment "contoso-security-baseline" \
  --definition-reference-id "kvDiagnosticsRequired" \
  --scope "/subscriptions/$SUB_ID" \
  --resource-discovery-mode ReEvaluateCompliance
```

</details>

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Uma política com efeito 'Deny' é atribuída no nível da assinatura. Um desenvolvedor precisa implantar um recurso não conforme para testes. Qual é a abordagem de menor privilégio para permitir isso?",
    options: [
      "Remover a atribuição de política temporariamente",
      "Criar uma isenção de política com a categoria 'Waiver' com escopo no grupo de recursos específico",
      "Alterar o efeito da política para 'Audit' em toda a assinatura",
      "Conceder ao desenvolvedor a função Policy Contributor"
    ],
    correctIndex: 1,
    explanation: "Uma isenção de política com a categoria 'Waiver' permite que um escopo específico ignore a aplicação da política sem afetar outros recursos. Isenções podem incluir datas de expiração e exigem justificativa, tornando-as o mecanismo de governança adequado para exceções."
  },
  {
    question: "Qual efeito do Azure Policy deve ser usado para adicionar automaticamente uma tag ausente a recursos quando eles são criados ou atualizados?",
    options: [
      "Deny",
      "Audit",
      "DeployIfNotExists",
      "Modify"
    ],
    correctIndex: 3,
    explanation: "O efeito 'Modify' é projetado para adicionar, atualizar ou remover propriedades ou tags em recursos durante operações de criação ou atualização. Diferente do 'DeployIfNotExists' que implanta recursos adicionais, o 'Modify' altera diretamente propriedades no próprio recurso avaliado."
  },
  {
    question: "Uma política DeployIfNotExists para habilitar configurações de diagnóstico falha ao remediar recursos existentes. Qual é a causa mais provável?",
    options: [
      "A política está no modo 'DoNotEnforce'",
      "A Managed Identity da atribuição de política não possui a função RBAC necessária para implantar o recurso",
      "A política só se aplica a novos recursos, não a existentes",
      "Políticas DeployIfNotExists não podem ser remediadas"
    ],
    correctIndex: 1,
    explanation: "Políticas DeployIfNotExists usam uma Managed Identity (atribuída pelo sistema) para implantar templates de remediação. Se essa identidade não tiver as permissões RBAC necessárias para criar a implantação (ex.: Monitoring Contributor para configurações de diagnóstico), a tarefa de remediação falhará com erros de autorização."
  },
  {
    question: "Como o Microsoft Defender for Cloud se relaciona com o Azure Policy para padrões de segurança?",
    options: [
      "O Defender for Cloud substitui o Azure Policy para segurança",
      "O Defender for Cloud usa iniciativas do Azure Policy para avaliar recomendações de segurança e conformidade com padrões como o MCSB",
      "O Azure Policy deve ser desabilitado antes de usar o Defender for Cloud",
      "O Defender for Cloud apenas monitora; o Azure Policy apenas aplica"
    ],
    correctIndex: 1,
    explanation: "O Defender for Cloud utiliza iniciativas do Azure Policy (como o Microsoft Cloud Security Benchmark) para avaliar continuamente configurações de recursos e gerar recomendações de segurança. As recomendações mostradas no Defender são os resultados das avaliações de conformidade de políticas. O Defender adiciona detecção de ameaças e priorização por cima."
  }
]} />

## Limpeza

```bash
# Remove policy assignments
az policy assignment delete --name "mcsb-assignment"
az policy assignment delete --name "deny-kv-no-softdelete"
az policy assignment delete --name "deny-storage-public-access"
az policy assignment delete --name "deny-vm-unmanaged-disks"
az policy assignment delete --name "require-env-tag"
az policy assignment delete --name "deny-public-ip" --scope "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME"
az policy assignment delete --name "deny-kv-no-rbac"
az policy assignment delete --name "contoso-security-baseline"

# Remove policy exemptions
az policy exemption delete --name "exempt-test-rg-from-tag" --scope "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME"

# Remove custom policy definitions (must delete assignments first)
az policy set-definition delete --name "contoso-security-baseline"
az policy definition delete --name "deny-kv-no-rbac"
az policy definition delete --name "audit-missing-encryption-tag"
az policy definition delete --name "deny-non-approved-regions"

# Remove remediation tasks
az policy remediation delete --name "remediate-kv-diagnostics" --scope "/subscriptions/$SUB_ID" 2>/dev/null
az policy remediation delete --name "remediate-kv-diagnostics-v2" --scope "/subscriptions/$SUB_ID" 2>/dev/null

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait
```
