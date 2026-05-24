---
sidebar_position: 1
title: "Desafio 01: Implementar Privileged Identity Management (PIM)"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 01: Implementar Privileged Identity Management (PIM)

## Habilidades do exame cobertas

- Projetar e implementar acesso privilegiado
- Configurar Privileged Identity Management (PIM) para recursos do Azure e funções do Microsoft Entra
- Configurar requisitos de ativação de função (aprovação, justificativa, MFA)
- Implementar acesso just-in-time para funções administrativas
- Monitorar e auditar acesso privilegiado usando alertas do PIM

## Cenário

A equipe de segurança da Contoso Ltd identificou que 47 usuários possuem atribuições permanentes de Global Administrator, e diversas contas de serviço detêm a função Owner em assinaturas de produção sem expiração. Após um teste de penetração recente revelar que credenciais comprometidas poderiam acessar imediatamente recursos críticos sem nenhuma verificação adicional, o CISO determinou a implementação do Privileged Identity Management para impor acesso just-in-time, fluxos de aprovação e atribuições de função com prazo definido em todas as funções privilegiadas.

---

## Pré-requisitos

- Assinatura do Azure com licença Microsoft Entra ID P2 (necessária para o PIM)
- Função de Global Administrator ou Privileged Role Administrator
- Azure CLI instalado e autenticado (`az login`)
- Pelo menos duas contas de usuário de teste para testar o fluxo de aprovação

---

## Tarefa 1: Habilitar o PIM e descobrir funções privilegiadas

Integre o PIM ao seu tenant do Entra ID e revise as atribuições permanentes de função atuais para identificar contas com privilégios excessivos.

```bash
# Set variables
TENANT_ID=$(az account show --query tenantId -o tsv)

# List all permanent (active) Global Administrator assignments
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments?\$filter=roleDefinitionId eq '62e90394-69f5-4237-9190-012177145e10'" \
  --headers "Content-Type=application/json"

# List all directory role definitions to find role IDs
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleDefinitions?\$select=id,displayName" \
  --headers "Content-Type=application/json"

# Check current PIM role settings for Global Administrator
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies?\$filter=scopeId eq '/' and scopeType eq 'DirectoryRole'" \
  --headers "Content-Type=application/json"
```

## Tarefa 2: Configurar as definições de função do PIM para Global Administrator

Configure os requisitos de ativação incluindo MFA, justificativa, aprovação e duração máxima de ativação.

```bash
# Get the policy ID for Global Administrator role
# The role definition ID for Global Admin is 62e90394-69f5-4237-9190-012177145e10
POLICY_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies?\$filter=scopeId eq '/' and scopeType eq 'DirectoryRole'" \
  --headers "Content-Type=application/json" \
  --query "value[?contains(displayName,'Global Administrator')].id" -o tsv)

# Update activation settings: require MFA, justification, max 4 hours
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/$POLICY_ID/rules/Expiration_EndUser_Assignment" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyExpirationRule",
    "id": "Expiration_EndUser_Assignment",
    "isExpirationRequired": true,
    "maximumDuration": "PT4H",
    "target": {
      "caller": "EndUser",
      "operations": ["all"],
      "level": "Assignment",
      "inheritableSettings": [],
      "enforcedSettings": []
    }
  }'

# Enable MFA requirement on activation
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/$POLICY_ID/rules/AuthenticationContext_EndUser_Assignment" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyAuthenticationContextRule",
    "id": "AuthenticationContext_EndUser_Assignment",
    "isEnabled": true,
    "claimValue": "c1",
    "target": {
      "caller": "EndUser",
      "operations": ["all"],
      "level": "Assignment"
    }
  }'

# Require justification on activation
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/$POLICY_ID/rules/Enablement_EndUser_Assignment" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyEnablementRule",
    "id": "Enablement_EndUser_Assignment",
    "enabledRules": ["MultiFactorAuthentication", "Justification"],
    "target": {
      "caller": "EndUser",
      "operations": ["all"],
      "level": "Assignment"
    }
  }'
```

## Tarefa 3: Configurar fluxo de aprovação

Configure um fluxo de aprovação multi-estágio exigindo que um membro da equipe de segurança aprove as ativações de Global Administrator.

```bash
# Get the approver user's object ID
APPROVER_ID=$(az ad user show --id "securityadmin@contoso.com" --query id -o tsv)

# Configure approval requirement for Global Administrator activation
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/$POLICY_ID/rules/Approval_EndUser_Assignment" \
  --headers "Content-Type=application/json" \
  --body "{
    \"@odata.type\": \"#microsoft.graph.unifiedRoleManagementPolicyApprovalRule\",
    \"id\": \"Approval_EndUser_Assignment\",
    \"setting\": {
      \"isApprovalRequired\": true,
      \"isApprovalRequiredForExtension\": false,
      \"isRequestorJustificationRequired\": true,
      \"approvalMode\": \"SingleStage\",
      \"approvalStages\": [
        {
          \"approvalStageTimeOutInDays\": 1,
          \"isApproverJustificationRequired\": true,
          \"escalationTimeInMinutes\": 0,
          \"isEscalationEnabled\": false,
          \"primaryApprovers\": [
            {
              \"@odata.type\": \"#microsoft.graph.singleUser\",
              \"userId\": \"$APPROVER_ID\"
            }
          ]
        }
      ]
    },
    \"target\": {
      \"caller\": \"EndUser\",
      \"operations\": [\"all\"],
      \"level\": \"Assignment\"
    }
  }"
```

## Tarefa 4: Criar atribuições de função elegíveis

Converta atribuições permanentes em atribuições elegíveis para que os usuários precisem ativar através do PIM.

```bash
# Get the user to make eligible
USER_ID=$(az ad user show --id "cloudadmin@contoso.com" --query id -o tsv)

# Create an eligible assignment for Global Administrator (eligible, not active)
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleRequests" \
  --headers "Content-Type=application/json" \
  --body "{
    \"action\": \"adminAssign\",
    \"justification\": \"Assign eligible Global Admin role per PIM policy\",
    \"roleDefinitionId\": \"62e90394-69f5-4237-9190-012177145e10\",
    \"directoryScopeId\": \"/\",
    \"principalId\": \"$USER_ID\",
    \"scheduleInfo\": {
      \"startDateTime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"expiration\": {
        \"type\": \"afterDuration\",
        \"duration\": \"P365D\"
      }
    }
  }"

# Remove the permanent (active) assignment
ASSIGNMENT_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignmentScheduleInstances?\$filter=principalId eq '$USER_ID' and roleDefinitionId eq '62e90394-69f5-4237-9190-012177145e10'" \
  --query "value[0].id" -o tsv)

az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignmentScheduleRequests" \
  --headers "Content-Type=application/json" \
  --body "{
    \"action\": \"adminRemove\",
    \"justification\": \"Remove permanent assignment - replaced with eligible via PIM\",
    \"roleDefinitionId\": \"62e90394-69f5-4237-9190-012177145e10\",
    \"directoryScopeId\": \"/\",
    \"principalId\": \"$USER_ID\"
  }"
```

## Tarefa 5: Configurar o PIM para funções de recursos do Azure

Estenda o PIM para proteger funções em nível de assinatura do Azure (Owner, Contributor) com atribuições elegíveis limitadas no tempo.

```bash
# Get subscription ID
SUB_ID=$(az account show --query id -o tsv)

# List current Owner role assignments on the subscription
az role assignment list --role "Owner" --scope "/subscriptions/$SUB_ID" --query "[].{principal:principalName,type:principalType}" -o table

# Create an eligible assignment for Owner role on subscription using PIM
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/roleManagement/azureResources/roleEligibilityScheduleRequests" \
  --headers "Content-Type=application/json" \
  --body "{
    \"action\": \"adminAssign\",
    \"justification\": \"Eligible Owner for emergency access\",
    \"roleDefinitionId\": \"/subscriptions/$SUB_ID/providers/Microsoft.Authorization/roleDefinitions/8e3af657-a8ff-443c-a75c-2fe8c4bcb635\",
    \"directoryScopeId\": \"/subscriptions/$SUB_ID\",
    \"principalId\": \"$USER_ID\",
    \"scheduleInfo\": {
      \"startDateTime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"expiration\": {
        \"type\": \"afterDuration\",
        \"duration\": \"P90D\"
      }
    }
  }"

# Configure the Azure resource role policy (max 2 hours for Owner)
# First get the policy for Owner role on the subscription
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies?\$filter=scopeId eq '/subscriptions/$SUB_ID' and scopeType eq 'subscription'" \
  --headers "Content-Type=application/json"
```

## Tarefa 6: Configurar alertas e revisões de acesso do PIM

Configure alertas para atividade suspeita no PIM e agende revisões de acesso periódicas.

```bash
# Create an access review for Global Administrator eligible assignments
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions" \
  --headers "Content-Type=application/json" \
  --body "{
    \"displayName\": \"Global Admin PIM Review - Quarterly\",
    \"descriptionForAdmins\": \"Quarterly review of Global Administrator eligible assignments\",
    \"descriptionForReviewers\": \"Please verify these users still require Global Administrator eligibility\",
    \"scope\": {
      \"@odata.type\": \"#microsoft.graph.principalResourceMembershipsScope\",
      \"principalScopes\": [
        {
          \"@odata.type\": \"#microsoft.graph.accessReviewQueryScope\",
          \"query\": \"/users\",
          \"queryType\": \"MicrosoftGraph\"
        }
      ],
      \"resourceScopes\": [
        {
          \"@odata.type\": \"#microsoft.graph.accessReviewQueryScope\",
          \"query\": \"/roleManagement/directory/roleDefinitions/62e90394-69f5-4237-9190-012177145e10\",
          \"queryType\": \"MicrosoftGraph\"
        }
      ]
    },
    \"reviewers\": [
      {
        \"query\": \"/users/$APPROVER_ID\",
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
          \"interval\": 3
        },
        \"range\": {
          \"type\": \"noEnd\",
          \"startDate\": \"2025-01-01\"
        }
      }
    }
  }"

# Check PIM alerts
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/roleManagementAlerts/alerts?\$filter=scopeId eq '/' and scopeType eq 'DirectoryRole'" \
  --headers "Content-Type=application/json"
```

---

## Quebra & conserta

### Cenário 1: Usuário não consegue ativar sua função elegível

Um usuário relata que possui uma atribuição elegível de Global Administrator no PIM, mas recebe um erro ao tentar ativar. O erro indica "MFA claim is not present in the token."

<details>
<summary>Mostrar solução</summary>

O usuário não completou a autenticação multifator antes de tentar a ativação. A política do PIM exige MFA na ativação.

```bash
# Verify the enablement rules require MFA
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/$POLICY_ID/rules/Enablement_EndUser_Assignment" \
  --headers "Content-Type=application/json"

# Option 1: User must re-authenticate with MFA before activating
# This is the expected behavior - user needs to complete MFA challenge

# Option 2: If MFA is blocking legitimate access, temporarily adjust the policy
# (Only do this in emergency situations)
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/$POLICY_ID/rules/Enablement_EndUser_Assignment" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyEnablementRule",
    "id": "Enablement_EndUser_Assignment",
    "enabledRules": ["Justification"],
    "target": {
      "caller": "EndUser",
      "operations": ["all"],
      "level": "Assignment"
    }
  }'

# Verify the user has registered MFA methods
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/users/$USER_ID/authentication/methods" \
  --headers "Content-Type=application/json"
```

</details>

### Cenário 2: Atribuição permanente de função ignorando o PIM

Um novo membro da equipe recebeu a função permanente de Contributor diretamente via `az role assignment create`, ignorando completamente o PIM. A atribuição não tem expiração e não requer ativação.

<details>
<summary>Mostrar solução</summary>

```bash
# Identify the direct (non-PIM) role assignment
az role assignment list --assignee "newuser@contoso.com" \
  --scope "/subscriptions/$SUB_ID" \
  --query "[?roleDefinitionName=='Contributor']" -o table

# Remove the permanent direct assignment
az role assignment delete --assignee "newuser@contoso.com" \
  --role "Contributor" \
  --scope "/subscriptions/$SUB_ID"

# Create a proper PIM eligible assignment instead
NEW_USER_ID=$(az ad user show --id "newuser@contoso.com" --query id -o tsv)

az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/roleManagement/azureResources/roleEligibilityScheduleRequests" \
  --headers "Content-Type=application/json" \
  --body "{
    \"action\": \"adminAssign\",
    \"justification\": \"Convert permanent to eligible assignment per security policy\",
    \"roleDefinitionId\": \"/subscriptions/$SUB_ID/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c\",
    \"directoryScopeId\": \"/subscriptions/$SUB_ID\",
    \"principalId\": \"$NEW_USER_ID\",
    \"scheduleInfo\": {
      \"startDateTime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"expiration\": {
        \"type\": \"afterDuration\",
        \"duration\": \"P180D\"
      }
    }
  }"

# Create an Azure Policy to audit direct role assignments (detect future bypasses)
az policy assignment create \
  --name "audit-direct-owner-assignments" \
  --display-name "Audit direct Owner role assignments" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/f8456c1c-aa66-4dfb-861a-25d127b775c9" \
  --scope "/subscriptions/$SUB_ID"
```

</details>

### Cenário 3: Solicitação de aprovação do PIM travada - nenhum aprovador configurado

Uma solicitação de ativação está pendente há 48 horas. A investigação mostra que o aprovador configurado saiu da empresa, e não existem aprovadores de fallback.

<details>
<summary>Mostrar solução</summary>

```bash
# Check pending activation requests
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignmentScheduleRequests?\$filter=status eq 'PendingApproval'" \
  --headers "Content-Type=application/json"

# Update the approval policy with new approvers
NEW_APPROVER_ID=$(az ad user show --id "securitylead@contoso.com" --query id -o tsv)
BACKUP_APPROVER_ID=$(az ad user show --id "ciso@contoso.com" --query id -o tsv)

az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/$POLICY_ID/rules/Approval_EndUser_Assignment" \
  --headers "Content-Type=application/json" \
  --body "{
    \"@odata.type\": \"#microsoft.graph.unifiedRoleManagementPolicyApprovalRule\",
    \"id\": \"Approval_EndUser_Assignment\",
    \"setting\": {
      \"isApprovalRequired\": true,
      \"isRequestorJustificationRequired\": true,
      \"approvalMode\": \"SingleStage\",
      \"approvalStages\": [
        {
          \"approvalStageTimeOutInDays\": 1,
          \"isApproverJustificationRequired\": true,
          \"primaryApprovers\": [
            {
              \"@odata.type\": \"#microsoft.graph.singleUser\",
              \"userId\": \"$NEW_APPROVER_ID\"
            },
            {
              \"@odata.type\": \"#microsoft.graph.singleUser\",
              \"userId\": \"$BACKUP_APPROVER_ID\"
            }
          ]
        }
      ]
    },
    \"target\": {
      \"caller\": \"EndUser\",
      \"operations\": [\"all\"],
      \"level\": \"Assignment\"
    }
  }"

# The stuck request will time out. User needs to submit a new activation request.
# A Privileged Role Administrator can also cancel and re-process the request.
```

</details>

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Um engenheiro de segurança precisa garantir que ativações de Global Administrator exijam aprovação de um membro da equipe de segurança, justificativa e MFA. Qual combinação de configurações do PIM atinge esse objetivo?",
    options: [
      "Configurar requisitos de ativação com MFA, justificativa e adicionar aprovadores no fluxo de aprovação",
      "Definir a função como permanente com Conditional Access exigindo MFA",
      "Criar uma função personalizada com permissões reduzidas e atribuí-la permanentemente",
      "Usar políticas de risco do Identity Protection para exigir MFA"
    ],
    correctIndex: 0,
    explanation: "As configurações de função do PIM permitem configurar requisitos de ativação (MFA, justificativa) e fluxos de aprovação de forma independente. Combinar os três nas configurações do PIM da função garante que cada ativação precise satisfazer MFA, incluir justificativa e receber aprovação explícita."
  },
  {
    question: "Qual é a duração máxima de ativação que pode ser configurada para uma atribuição de função elegível no PIM?",
    options: [
      "8 horas",
      "12 horas",
      "24 horas",
      "72 horas"
    ],
    correctIndex: 2,
    explanation: "A duração máxima de ativação para atribuições elegíveis do PIM é de 24 horas. Após esse período, o usuário deve reativar a função. Isso garante que o acesso elevado seja sempre limitado no tempo e exija reautorização periódica."
  },
  {
    question: "A Contoso deseja remover automaticamente atribuições de função elegíveis que não foram ativadas em 90 dias. Qual recurso do PIM deve ser configurado?",
    options: [
      "Alertas do PIM para atribuições de função redundantes",
      "Revisões de acesso com aplicação automática habilitada e negar como decisão padrão",
      "Controles de sessão do Conditional Access",
      "Azure Policy com efeito de negação"
    ],
    correctIndex: 1,
    explanation: "Revisões de acesso podem ser configuradas para revisar periodicamente atribuições elegíveis. Com a aplicação automática habilitada e 'Negar' como decisão padrão, atribuições onde os revisores não respondem serão removidas automaticamente. O PIM também fornece alertas para funções que não foram utilizadas."
  },
  {
    question: "Um usuário possui uma atribuição elegível do PIM para a função Contributor em uma assinatura. Ele tenta ativar, mas recebe 'Authorization failed'. Qual é a causa mais provável?",
    options: [
      "A atribuição elegível do usuário expirou",
      "A assinatura foi movida para um grupo de gerenciamento diferente",
      "A política do PIM exige um contexto de autenticação do Conditional Access que o usuário não satisfez",
      "A função Contributor foi descontinuada"
    ],
    correctIndex: 0,
    explanation: "Atribuições elegíveis do PIM possuem uma data de expiração. Se o período de elegibilidade passou, o usuário não consegue mais ativar a função. O Privileged Role Administrator deve criar uma nova atribuição elegível. Sempre verifique o agendamento de elegibilidade quando a ativação falhar."
  }
]} />

## Limpeza

```bash
# Remove eligible assignments created during the lab
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleRequests" \
  --headers "Content-Type=application/json" \
  --body "{
    \"action\": \"adminRemove\",
    \"justification\": \"Lab cleanup\",
    \"roleDefinitionId\": \"62e90394-69f5-4237-9190-012177145e10\",
    \"directoryScopeId\": \"/\",
    \"principalId\": \"$USER_ID\"
  }"

# Remove access review
REVIEW_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions?\$filter=displayName eq 'Global Admin PIM Review - Quarterly'" \
  --query "value[0].id" -o tsv)

az rest --method DELETE \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions/$REVIEW_ID" \
  --headers "Content-Type=application/json"

# Remove any policy assignments created
az policy assignment delete --name "audit-direct-owner-assignments"
```
