---
sidebar_position: 5
title: "Desafio 05: Concessões de Permissão OAuth e Configurações de Consentimento"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 05: Concessões de Permissão OAuth e Configurações de Consentimento

## Habilidades do exame cobertas

- Configurar e gerenciar concessões de permissão OAuth
- Implementar políticas de consentimento e condições de concessão de permissão
- Revisar e revogar concessões de consentimento de aplicativos
- Configurar avaliação de consentimento baseada em risco
- Investigar ataques de concessão de consentimento ilícito
- Implementar classificação de permissões e consentimento de baixo risco

## Cenário

A equipe de resposta a incidentes da Contoso Ltd descobriu que um atacante usou um e-mail de phishing para enganar um usuário e fazê-lo conceder acesso total à caixa de correio a um aplicativo OAuth malicioso. O aplicativo esteve lendo e-mails silenciosamente por três semanas antes de ser detectado. A equipe de segurança agora precisa auditar todas as concessões de consentimento existentes, implementar políticas de consentimento rigorosas, classificar permissões por nível de risco e configurar monitoramento para detectar futuros ataques de concessão de consentimento ilícito.

---

## Pré-requisitos

- Assinatura do Azure com licença Microsoft Entra ID P1 ou P2
- Função de Global Administrator ou Cloud Application Administrator
- Azure CLI instalado e autenticado
- Compreensão do framework de consentimento OAuth 2.0

---

## Tarefa 1: Auditar concessões de permissão OAuth existentes

Revise todas as concessões de permissão delegada e de aplicativo no tenant para identificar consentimentos com privilégios excessivos ou suspeitos.

```bash
# List all OAuth2 delegated permission grants (user consent)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$top=100" \
  --headers "Content-Type=application/json" \
  --query "value[].{clientId:clientId, consentType:consentType, scope:scope, principalId:principalId}"

# Get details about high-privilege delegated grants (Mail.ReadWrite, Files.ReadWrite.All)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=consentType eq 'Principal'" \
  --headers "Content-Type=application/json"

# List all application role assignments (application permissions)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals?\$filter=servicePrincipalType eq 'Application'&\$select=displayName,appId,id&\$expand=appRoleAssignments" \
  --headers "Content-Type=application/json"

# Find applications with dangerous permissions (Mail.ReadWrite, Directory.ReadWrite.All)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals?\$filter=servicePrincipalType eq 'Application'&\$expand=appRoleAssignments" \
  --headers "Content-Type=application/json" \
  --query "value[?appRoleAssignments[0]].{app:displayName, assignmentCount:length(appRoleAssignments)}"

# Identify apps without verified publisher
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals?\$filter=servicePrincipalType eq 'Application'&\$select=displayName,appId,verifiedPublisher,publisherName" \
  --headers "Content-Type=application/json" \
  --query "value[?!verifiedPublisher.displayName].{app:displayName, appId:appId}"
```

## Tarefa 2: Revogar concessões de consentimento suspeitas

Remova permissões de um aplicativo suspeito que recebeu acesso Mail.ReadWrite através de phishing.

```bash
# Identify the malicious app's service principal
MALICIOUS_SP_ID=$(az ad sp list --filter "displayName eq 'Suspicious App'" --query "[0].id" -o tsv)

# List all permission grants for this service principal
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=clientId eq '$MALICIOUS_SP_ID'" \
  --headers "Content-Type=application/json"

# Revoke all delegated permission grants for the app
GRANT_IDS=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=clientId eq '$MALICIOUS_SP_ID'" \
  --query "value[].id" -o tsv)

for GRANT_ID in $GRANT_IDS; do
  az rest --method DELETE \
    --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants/$GRANT_ID"
  echo "Revoked grant: $GRANT_ID"
done

# Revoke application permission assignments
APP_ROLE_ASSIGNMENTS=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$MALICIOUS_SP_ID/appRoleAssignments" \
  --query "value[].id" -o tsv)

for ASSIGNMENT_ID in $APP_ROLE_ASSIGNMENTS; do
  az rest --method DELETE \
    --url "https://graph.microsoft.com/v1.0/servicePrincipals/$MALICIOUS_SP_ID/appRoleAssignments/$ASSIGNMENT_ID"
  echo "Revoked app role assignment: $ASSIGNMENT_ID"
done

# Disable the service principal to block all access
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$MALICIOUS_SP_ID" \
  --headers "Content-Type=application/json" \
  --body '{
    "accountEnabled": false
  }'

# Invalidate all refresh tokens for the app
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$MALICIOUS_SP_ID/invalidateAllRefreshTokens" \
  --headers "Content-Type=application/json"
```

## Tarefa 3: Configurar restrições de consentimento de usuário

Implemente políticas que controlam quando os usuários podem consentir com aplicativos e quais permissões podem conceder.

```bash
# Disable user consent entirely (most restrictive)
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authorizationPolicy/authorizationPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionGrantPolicyIdsAssignedToDefaultUserRole": []
  }'

# OR: Allow user consent only for verified publisher apps with low-risk permissions
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authorizationPolicy/authorizationPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionGrantPolicyIdsAssignedToDefaultUserRole": [
      "managePermissionGrantsForSelf.microsoft-user-default-low"
    ]
  }'

# Verify the current consent settings
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/authorizationPolicy/authorizationPolicy" \
  --headers "Content-Type=application/json" \
  --query "permissionGrantPolicyIdsAssignedToDefaultUserRole"
```

## Tarefa 4: Criar uma política de concessão de permissão personalizada

Defina condições granulares para quando o consentimento é aprovado automaticamente (publishers verificados, permissões específicas apenas).

```bash
# Create a custom permission grant policy
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/policies/permissionGrantPolicies" \
  --headers "Content-Type=application/json" \
  --body '{
    "id": "contoso-restricted-consent",
    "displayName": "Contoso Restricted Consent",
    "description": "Allow consent only for verified publishers with classified low-risk permissions"
  }'

# Add an include condition: verified publisher apps only
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/policies/permissionGrantPolicies/contoso-restricted-consent/includes" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionType": "delegated",
    "permissionClassification": "low",
    "clientApplicationsFromVerifiedPublisherOnly": true,
    "resourceApplication": "any"
  }'

# Add an exclude condition: never allow mail or directory write permissions
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/policies/permissionGrantPolicies/contoso-restricted-consent/excludes" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionType": "delegated",
    "permissions": {
      "@odata.type": "#microsoft.graph.allPreApprovedPermissions",
      "permissionIds": [
        "e383f46e-2787-4529-855e-0e479a3ffac0",
        "024d486e-b451-40bb-833d-3e66d98c5c73"
      ]
    }
  }'

# Apply the custom policy to the default user role
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authorizationPolicy/authorizationPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionGrantPolicyIdsAssignedToDefaultUserRole": [
      "managePermissionGrantsForSelf.contoso-restricted-consent"
    ]
  }'
```

## Tarefa 5: Classificar permissões por nível de risco

Categorize permissões delegadas do Microsoft Graph como baixo, médio ou alto risco para habilitar consentimento baseado em risco.

```bash
# Get the Microsoft Graph service principal ID
GRAPH_SP_ID=$(az ad sp list --filter "appId eq '00000003-0000-0000-c000-000000000000'" --query "[0].id" -o tsv)

# Classify User.Read as low risk
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionId": "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
    "permissionName": "User.Read",
    "classification": "low"
  }'

# Classify openid as low risk
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionId": "37f7f235-527c-4136-accd-4a02d197296e",
    "permissionName": "openid",
    "classification": "low"
  }'

# Classify profile as low risk
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionId": "14dad69e-099b-42c9-810b-d002981feec1",
    "permissionName": "profile",
    "classification": "low"
  }'

# Classify email as low risk
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionId": "64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0",
    "permissionName": "email",
    "classification": "low"
  }'

# List all permission classifications
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications" \
  --headers "Content-Type=application/json" \
  --query "value[].{permission:permissionName, classification:classification}"
```

## Tarefa 6: Habilitar workflow de consentimento de administrador e monitoramento

Configure um processo de aprovação para solicitações de consentimento e configure o registro de auditoria.

```bash
# Enable the admin consent request workflow
REVIEWER_ID=$(az ad user show --id "securityadmin@contoso.com" --query id -o tsv)

az rest --method PUT \
  --url "https://graph.microsoft.com/v1.0/policies/adminConsentRequestPolicy" \
  --headers "Content-Type=application/json" \
  --body "{
    \"isEnabled\": true,
    \"notifyReviewers\": true,
    \"remindersEnabled\": true,
    \"requestDurationInDays\": 14,
    \"reviewers\": [
      {
        \"query\": \"/users/$REVIEWER_ID\",
        \"queryType\": \"MicrosoftGraph\"
      }
    ]
  }"

# Check pending consent requests
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/appConsent/appConsentRequests" \
  --headers "Content-Type=application/json"

# Query audit logs for consent grant activities
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=activityDisplayName eq 'Consent to application'&\$top=20&\$orderby=activityDateTime desc" \
  --headers "Content-Type=application/json" \
  --query "value[].{time:activityDateTime, app:targetResources[0].displayName, user:initiatedBy.user.userPrincipalName, result:result}"

# Look for suspicious consent patterns (consent granted from unusual locations)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=activityDisplayName eq 'Consent to application' and result eq 'success'&\$top=50" \
  --headers "Content-Type=application/json"
```

---

## Break & Fix

### Cenário 1: Ataque de concessão de consentimento ilícito detectado

A equipe SOC percebe nos logs de auditoria que um usuário consentiu com um aplicativo chamado "Document Viewer Pro" que solicitou permissões Mail.ReadWrite e Files.ReadWrite.All. O aplicativo não possui publisher verificado e foi registrado em um tenant externo.

<details>
<summary>Mostrar solução</summary>

```bash
# Find the malicious application's service principal
MALICIOUS_APP=$(az ad sp list --filter "displayName eq 'Document Viewer Pro'" --query "[0]" -o json)
MALICIOUS_SP_ID=$(echo $MALICIOUS_APP | jq -r '.id')
MALICIOUS_APP_ID=$(echo $MALICIOUS_APP | jq -r '.appId')

# Identify which users consented
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=clientId eq '$MALICIOUS_SP_ID' and consentType eq 'Principal'" \
  --headers "Content-Type=application/json" \
  --query "value[].{userId:principalId, scopes:scope}"

# Revoke ALL consent grants for this application
GRANT_IDS=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=clientId eq '$MALICIOUS_SP_ID'" \
  --query "value[].id" -o tsv)

for GID in $GRANT_IDS; do
  az rest --method DELETE \
    --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants/$GID"
done

# Disable the service principal
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$MALICIOUS_SP_ID" \
  --headers "Content-Type=application/json" \
  --body '{"accountEnabled": false}'

# Revoke the affected user's sessions to force re-authentication
AFFECTED_USER_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=clientId eq '$MALICIOUS_SP_ID' and consentType eq 'Principal'" \
  --query "value[0].principalId" -o tsv)

az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/users/$AFFECTED_USER_ID/revokeSignInSessions" \
  --headers "Content-Type=application/json"

# Prevent future incidents: disable user consent
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authorizationPolicy/authorizationPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionGrantPolicyIdsAssignedToDefaultUserRole": [
      "managePermissionGrantsForSelf.microsoft-user-default-low"
    ]
  }'
```

</details>

### Cenário 2: Aplicativo legítimo bloqueado pelas restrições de consentimento

Após implementar políticas de consentimento rigorosas, um aplicativo legítimo de um fornecedor (com publisher verificado) que a equipe de marketing usa para análise de campanhas está sendo bloqueado. Os usuários recebem erros "Need admin approval".

<details>
<summary>Mostrar solução</summary>

```bash
# Check what permissions the app is requesting
VENDOR_APP_ID="<vendor-app-client-id>"
VENDOR_SP_ID=$(az ad sp list --filter "appId eq '$VENDOR_APP_ID'" --query "[0].id" -o tsv)

# Check if the publisher is verified
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$VENDOR_SP_ID?\$select=displayName,verifiedPublisher,publisherName" \
  --headers "Content-Type=application/json"

# Option 1: Grant admin consent for the specific app (pre-approve)
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants" \
  --headers "Content-Type=application/json" \
  --body "{
    \"clientId\": \"$VENDOR_SP_ID\",
    \"consentType\": \"AllPrincipals\",
    \"resourceId\": \"$(az ad sp list --filter \"appId eq '00000003-0000-0000-c000-000000000000'\" --query '[0].id' -o tsv)\",
    \"scope\": \"User.Read Analytics.Read\"
  }"

# Option 2: Classify the requested permissions as low-risk
# so the consent policy allows them automatically
GRAPH_SP_ID=$(az ad sp list --filter "appId eq '00000003-0000-0000-c000-000000000000'" --query "[0].id" -o tsv)

# If the app needs Analytics.Read, classify it as low risk
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionId": "e03cf23f-8056-446a-8994-7d93dfc8b50e",
    "permissionName": "Analytics.Read",
    "classification": "low"
  }'

# Option 3: Process the admin consent request if it's pending
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/appConsent/appConsentRequests?\$filter=appId eq '$VENDOR_APP_ID'" \
  --headers "Content-Type=application/json"
```

</details>

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Um atacante envia um e-mail de phishing que redireciona a vítima para um prompt de consentimento para um aplicativo malicioso solicitando Mail.ReadWrite. Como esse ataque é chamado e qual é a principal mitigação?",
    options: [
      "Ataque de password spray; mitigado por MFA",
      "Ataque de concessão de consentimento ilícito; mitigado restringindo o consentimento de usuário e exigindo aprovação de administrador",
      "Ataque de replay de token; mitigado por controles de sessão do Conditional Access",
      "Credential stuffing; mitigado pelo Identity Protection do Azure AD"
    ],
    correctIndex: 1,
    explanation: "Um ataque de concessão de consentimento ilícito engana os usuários para conceder permissões OAuth a aplicativos controlados por atacantes. A principal mitigação é restringir o consentimento do usuário (permitindo apenas publishers verificados com permissões de baixo risco) e habilitar o workflow de consentimento de administrador para que permissões perigosas exijam aprovação do administrador."
  },
  {
    question: "Qual configuração permite que os usuários consentam com aplicativos de publishers verificados solicitando apenas permissões classificadas como 'baixo impacto'?",
    options: [
      "permissionGrantPolicyIdsAssignedToDefaultUserRole: ['managePermissionGrantsForSelf.microsoft-user-default-low']",
      "defaultUserRolePermissions.allowedToCreateApps: true",
      "adminConsentRequestPolicy.isEnabled: true",
      "permissionGrantPolicyIdsAssignedToDefaultUserRole: ['managePermissionGrantsForSelf.microsoft-all']"
    ],
    correctIndex: 0,
    explanation: "A política 'microsoft-user-default-low' permite que os usuários consentam com aplicativos de publishers verificados solicitando apenas permissões classificadas como baixo risco. Esta é a abordagem equilibrada recomendada entre segurança e usabilidade, pois bloqueia o consentimento para aplicativos não verificados e permissões de alto risco."
  },
  {
    question: "Após descobrir um aplicativo OAuth comprometido, qual é a ordem correta dos passos de resposta a incidentes?",
    options: [
      "Excluir o registro do aplicativo, notificar os usuários, redefinir senhas",
      "Revogar as concessões de consentimento, desabilitar o service principal, revogar as sessões dos usuários, investigar o acesso aos dados",
      "Redefinir todas as senhas dos usuários, habilitar MFA, bloquear o endereço IP",
      "Criar uma política de Conditional Access para bloquear o aplicativo, aguardar a expiração do token"
    ],
    correctIndex: 1,
    explanation: "A resposta correta é: 1) Revogar todas as concessões de consentimento para interromper o acesso contínuo, 2) Desabilitar o service principal para impedir a aquisição de novos tokens, 3) Revogar as sessões dos usuários afetados para invalidar tokens em cache, 4) Investigar quais dados foram acessados. Aguardar a expiração do token deixa uma janela de acesso continuado."
  },
  {
    question: "Qual é a diferença entre 'consentType: AllPrincipals' e 'consentType: Principal' em um OAuth2PermissionGrant?",
    options: [
      "AllPrincipals significa consentimento de administrador (aplica-se a todos os usuários); Principal significa consentimento individual do usuário",
      "AllPrincipals é para permissões de aplicativo; Principal é para permissões delegadas",
      "AllPrincipals requer licença P2; Principal funciona com qualquer licença",
      "AllPrincipals é para aplicativos multi-tenant; Principal é para aplicativos single-tenant"
    ],
    correctIndex: 0,
    explanation: "Em objetos OAuth2PermissionGrant, 'AllPrincipals' indica que o consentimento de administrador foi concedido em nome de todos os usuários no tenant (nenhum consentimento individual necessário). 'Principal' indica que um usuário específico (identificado pelo principalId) consentiu individualmente. O consentimento de administrador (AllPrincipals) é preferido para aplicativos confiáveis."
  }
]} />

## Limpeza

```bash
# Re-enable default user consent settings
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authorizationPolicy/authorizationPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionGrantPolicyIdsAssignedToDefaultUserRole": [
      "managePermissionGrantsForSelf.microsoft-user-default-legacy"
    ]
  }'

# Delete custom permission grant policy
az rest --method DELETE \
  --url "https://graph.microsoft.com/v1.0/policies/permissionGrantPolicies/contoso-restricted-consent"

# Remove permission classifications
GRAPH_SP_ID=$(az ad sp list --filter "appId eq '00000003-0000-0000-c000-000000000000'" --query "[0].id" -o tsv)
CLASSIFICATIONS=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications" \
  --query "value[].id" -o tsv)

for CLASS_ID in $CLASSIFICATIONS; do
  az rest --method DELETE \
    --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications/$CLASS_ID"
done

# Disable admin consent workflow
az rest --method PUT \
  --url "https://graph.microsoft.com/v1.0/policies/adminConsentRequestPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "isEnabled": false,
    "notifyReviewers": false,
    "remindersEnabled": false,
    "requestDurationInDays": 30,
    "reviewers": []
  }'
```
