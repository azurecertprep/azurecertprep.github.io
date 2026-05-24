---
sidebar_position: 3
title: "Desafio 03: Métodos de Autenticação e Passwordless"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 03: Métodos de Autenticação e Passwordless

## Habilidades do exame cobertas

- Planejar e implementar métodos de autenticação (MFA, passwordless, FIDO2)
- Configurar políticas de métodos de autenticação
- Implementar passkeys e chaves de segurança FIDO2
- Configurar notificações push e correspondência de número do Microsoft Authenticator
- Gerenciar registro e migração de métodos de autenticação
- Monitorar uso e lacunas de métodos de autenticação

## Cenário

O help desk da Contoso Ltd relata que 35% dos chamados de suporte são relacionados a senhas (redefinições, bloqueios, senhas expiradas). A equipe de segurança também identificou que o MFA baseado em SMS foi comprometido em um ataque recente de SIM-swap direcionado a um executivo sênior. O CISO aprovou uma implementação gradual de autenticação passwordless, começando com chaves de segurança FIDO2 para administradores e passkeys do Microsoft Authenticator para todos os usuários, eliminando métodos mais fracos como SMS e chamadas de voz para contas privilegiadas.

---

## Pré-requisitos

- Assinatura do Azure com licença Microsoft Entra ID P1 ou P2
- Função de Authentication Policy Administrator ou Global Administrator
- Azure CLI instalado e autenticado
- Chaves de segurança FIDO2 para teste (YubiKey, Feitian, etc.)
- Aplicativo Microsoft Authenticator instalado em dispositivos de teste

---

## Tarefa 1: Revisar registros atuais de métodos de autenticação

Audite quais métodos os usuários registraram para identificar lacunas e planejar a migração.

```bash
# Get authentication methods registration summary
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/reports/authenticationMethods/usersRegisteredByMethod" \
  --headers "Content-Type=application/json"

# Get per-user registration details (check specific users)
USER_ID=$(az ad user show --id "admin@contoso.com" --query id -o tsv)

az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/users/$USER_ID/authentication/methods" \
  --headers "Content-Type=application/json"

# Check registration status across all users (paginated)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/reports/authenticationMethods/userRegistrationDetails?\$top=50&\$select=userPrincipalName,methodsRegistered,isMfaRegistered,isSsprRegistered" \
  --headers "Content-Type=application/json"

# Get users who have NOT registered any MFA method
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/reports/authenticationMethods/userRegistrationDetails?\$filter=isMfaRegistered eq false&\$select=userPrincipalName,methodsRegistered" \
  --headers "Content-Type=application/json"
```

## Tarefa 2: Configurar políticas de métodos de autenticação

Habilite métodos passwordless e restrinja métodos mais fracos para usuários privilegiados.

```bash
# Get current authentication methods policy
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy" \
  --headers "Content-Type=application/json"

# Enable FIDO2 security keys for the admin security group
ADMIN_GROUP_ID=$(az ad group create \
  --display-name "FIDO2-Enabled-Admins" \
  --mail-nickname "fido2-admins" \
  --query id -o tsv)

az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/fido2" \
  --headers "Content-Type=application/json" \
  --body "{
    \"@odata.type\": \"#microsoft.graph.fido2AuthenticationMethodConfiguration\",
    \"state\": \"enabled\",
    \"isAttestationEnforced\": true,
    \"isSelfServiceRegistrationAllowed\": true,
    \"keyRestrictions\": {
      \"isEnforced\": true,
      \"enforcementType\": \"allow\",
      \"aaGuids\": [
        \"cb69481e-8ff7-4039-93ec-0a2729a154a8\",
        \"ee882879-721c-4913-9775-3dfcce97072a\",
        \"2fc0579f-8113-47ea-b116-bb5a8db9202a\"
      ]
    },
    \"includeTargets\": [
      {
        \"targetType\": \"group\",
        \"id\": \"$ADMIN_GROUP_ID\",
        \"isRegistrationRequired\": false
      }
    ]
  }"

# Enable Microsoft Authenticator with number matching for all users
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/microsoftAuthenticator" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.microsoftAuthenticatorAuthenticationMethodConfiguration",
    "state": "enabled",
    "featureSettings": {
      "displayAppInformationRequiredState": {
        "state": "enabled",
        "includeTarget": {
          "targetType": "group",
          "id": "all_users"
        }
      },
      "displayLocationInformationRequiredState": {
        "state": "enabled",
        "includeTarget": {
          "targetType": "group",
          "id": "all_users"
        }
      },
      "numberMatchingRequiredState": {
        "state": "enabled",
        "includeTarget": {
          "targetType": "group",
          "id": "all_users"
        }
      }
    },
    "includeTargets": [
      {
        "targetType": "group",
        "id": "all_users",
        "authenticationMode": "any"
      }
    ]
  }'
```

## Tarefa 3: Desabilitar SMS e voz para contas privilegiadas

Remova métodos de autenticação mais fracos (SMS, chamada de voz) para usuários com funções administrativas.

```bash
# Create a group for users who should NOT use SMS/Voice
PRIVILEGED_GROUP_ID=$(az ad group create \
  --display-name "No-SMS-Voice-Auth" \
  --mail-nickname "no-sms-voice" \
  --query id -o tsv)

# Disable SMS for the privileged group (configure with exclude)
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/sms" \
  --headers "Content-Type=application/json" \
  --body "{
    \"@odata.type\": \"#microsoft.graph.smsAuthenticationMethodConfiguration\",
    \"state\": \"enabled\",
    \"includeTargets\": [
      {
        \"targetType\": \"group\",
        \"id\": \"all_users\",
        \"isUsableForSignIn\": false
      }
    ],
    \"excludeTargets\": [
      {
        \"targetType\": \"group\",
        \"id\": \"$PRIVILEGED_GROUP_ID\"
      }
    ]
  }"

# Disable voice call for privileged users
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/voice" \
  --headers "Content-Type=application/json" \
  --body "{
    \"@odata.type\": \"#microsoft.graph.voiceAuthenticationMethodConfiguration\",
    \"state\": \"enabled\",
    \"includeTargets\": [
      {
        \"targetType\": \"group\",
        \"id\": \"all_users\",
        \"isOtp\": false
      }
    ],
    \"excludeTargets\": [
      {
        \"targetType\": \"group\",
        \"id\": \"$PRIVILEGED_GROUP_ID\"
      }
    ]
  }"

# Add admin users to the privileged group
az ad group member add --group "$PRIVILEGED_GROUP_ID" --member-id "$USER_ID"
```

## Tarefa 4: Configurar Temporary Access Pass para onboarding

Configure o Temporary Access Pass (TAP) como uma credencial com tempo limitado para registro inicial de métodos passwordless.

```bash
# Enable Temporary Access Pass policy
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/temporaryAccessPass" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.temporaryAccessPassAuthenticationMethodConfiguration",
    "state": "enabled",
    "defaultLifetimeInMinutes": 60,
    "defaultLength": 12,
    "minimumLifetimeInMinutes": 15,
    "maximumLifetimeInMinutes": 480,
    "isUsableOnce": true,
    "includeTargets": [
      {
        "targetType": "group",
        "id": "all_users"
      }
    ]
  }'

# Create a TAP for a user (e.g., new employee onboarding)
NEW_USER_ID=$(az ad user show --id "newemployee@contoso.com" --query id -o tsv)

az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/users/$NEW_USER_ID/authentication/temporaryAccessPassMethods" \
  --headers "Content-Type=application/json" \
  --body '{
    "lifetimeInMinutes": 120,
    "isUsableOnce": true
  }'
```

## Tarefa 5: Habilitar passkeys (FIDO2) com restrições de dispositivo

Configure o suporte a passkeys com aplicação de attestation e restrições de AAGUID para fornecedores aprovados.

```bash
# Enable passkey (device-bound) authentication for all users
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/fido2" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.fido2AuthenticationMethodConfiguration",
    "state": "enabled",
    "isAttestationEnforced": true,
    "isSelfServiceRegistrationAllowed": true,
    "keyRestrictions": {
      "isEnforced": true,
      "enforcementType": "allow",
      "aaGuids": [
        "cb69481e-8ff7-4039-93ec-0a2729a154a8",
        "ee882879-721c-4913-9775-3dfcce97072a",
        "2fc0579f-8113-47ea-b116-bb5a8db9202a",
        "d8522d9f-575b-4866-88a9-ba99fa02f35b",
        "73bb0cd4-e502-49b8-9c6f-b59445bf720b"
      ]
    },
    "includeTargets": [
      {
        "targetType": "group",
        "id": "all_users",
        "isRegistrationRequired": false
      }
    ]
  }'

# List registered FIDO2 keys for a user
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/users/$USER_ID/authentication/fido2Methods" \
  --headers "Content-Type=application/json"

# Delete a specific FIDO2 key (if lost or compromised)
# FIDO2_KEY_ID="obtained from previous query"
# az rest --method DELETE \
#   --url "https://graph.microsoft.com/v1.0/users/$USER_ID/authentication/fido2Methods/$FIDO2_KEY_ID"
```

## Tarefa 6: Configurar campanha de registro para migração de MFA

Configure uma campanha de registro para incentivar os usuários a registrar o Microsoft Authenticator.

```bash
# Configure the registration campaign (system-managed nudge)
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy" \
  --headers "Content-Type=application/json" \
  --body "{
    \"registrationEnforcement\": {
      \"authenticationMethodsRegistrationCampaign\": {
        \"snoozeDurationInDays\": 3,
        \"state\": \"enabled\",
        \"excludeTargets\": [],
        \"includeTargets\": [
          {
            \"id\": \"all_users\",
            \"targetType\": \"group\",
            \"targetedAuthenticationMethod\": \"microsoftAuthenticator\"
          }
        ]
      }
    }
  }"

# Check authentication methods activity (usage reports)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/reports/authenticationMethods/usersRegisteredByMethod" \
  --headers "Content-Type=application/json"
```

---

## Quebra & conserta

### Cenário 1: Registro de chave FIDO2 falha para os usuários

Usuários tentando registrar sua YubiKey 5 recebem um erro: "This security key model is not allowed by your organization's policy." As chaves foram compradas em lote para a implantação.

<details>
<summary>Mostrar solução</summary>

A política de restrição de chave FIDO2 usa AAGUID (Authenticator Attestation GUID) para permitir/bloquear modelos de chave específicos. O AAGUID da série YubiKey 5 pode não estar na lista de permissão.

```bash
# Check the current FIDO2 key restrictions
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/fido2" \
  --headers "Content-Type=application/json" \
  --query "{enforced:keyRestrictions.isEnforced, type:keyRestrictions.enforcementType, aaGuids:keyRestrictions.aaGuids}"

# The YubiKey 5 NFC has AAGUID: cb69481e-8ff7-4039-93ec-0a2729a154a8
# The YubiKey 5Ci has AAGUID: c5ef55ff-ad9a-4b9f-b580-adebafe026d0
# Add the missing AAGUID to the allow list

az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/fido2" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.fido2AuthenticationMethodConfiguration",
    "keyRestrictions": {
      "isEnforced": true,
      "enforcementType": "allow",
      "aaGuids": [
        "cb69481e-8ff7-4039-93ec-0a2729a154a8",
        "ee882879-721c-4913-9775-3dfcce97072a",
        "2fc0579f-8113-47ea-b116-bb5a8db9202a",
        "c5ef55ff-ad9a-4b9f-b580-adebafe026d0",
        "d8522d9f-575b-4866-88a9-ba99fa02f35b"
      ]
    }
  }'

# Alternative: temporarily disable enforcement for testing
# az rest --method PATCH \
#   --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/fido2" \
#   --body '{"keyRestrictions":{"isEnforced":false}}'
```

</details>

### Cenário 2: Notificações push do Authenticator aparecem como "Negar" sem interação do usuário

Múltiplos usuários relatam que seu aplicativo Microsoft Authenticator nega automaticamente solicitações de autenticação que eles não iniciaram. A equipe de segurança suspeita de ataques de fadiga de MFA.

<details>
<summary>Mostrar solução</summary>

A correspondência de número já deveria prevenir aprovações cegas, mas a organização precisa verificar se está habilitada e também habilitar contexto adicional (nome do aplicativo + localização) para ajudar os usuários a identificar solicitações legítimas.

```bash
# Verify number matching is enabled (prevents MFA fatigue)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/microsoftAuthenticator" \
  --headers "Content-Type=application/json" \
  --query "featureSettings.numberMatchingRequiredState"

# Ensure additional context is showing (app + location)
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/microsoftAuthenticator" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.microsoftAuthenticatorAuthenticationMethodConfiguration",
    "featureSettings": {
      "displayAppInformationRequiredState": {
        "state": "enabled",
        "includeTarget": {
          "targetType": "group",
          "id": "all_users"
        }
      },
      "displayLocationInformationRequiredState": {
        "state": "enabled",
        "includeTarget": {
          "targetType": "group",
          "id": "all_users"
        }
      },
      "numberMatchingRequiredState": {
        "state": "enabled",
        "includeTarget": {
          "targetType": "group",
          "id": "all_users"
        }
      }
    }
  }'

# Check sign-in logs for suspicious MFA attempts (multiple rapid attempts)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=status/errorCode eq 500121&\$top=20&\$orderby=createdDateTime desc" \
  --headers "Content-Type=application/json"

# Investigate the affected users for compromised credentials
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers?\$filter=riskLevel eq 'high'" \
  --headers "Content-Type=application/json"
```

</details>

### Cenário 3: TAP expirou antes do usuário concluir o registro

Um novo funcionário recebeu um Temporary Access Pass, mas ele expirou antes que pudesse registrar sua chave FIDO2 devido a atrasos no onboarding de TI. Agora ele não tem como se autenticar.

<details>
<summary>Mostrar solução</summary>

```bash
# Check the user's current authentication methods
NEW_USER_ID=$(az ad user show --id "newemployee@contoso.com" --query id -o tsv)

az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/users/$NEW_USER_ID/authentication/temporaryAccessPassMethods" \
  --headers "Content-Type=application/json"

# Delete the expired TAP
EXPIRED_TAP_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/users/$NEW_USER_ID/authentication/temporaryAccessPassMethods" \
  --query "value[0].id" -o tsv)

az rest --method DELETE \
  --url "https://graph.microsoft.com/v1.0/users/$NEW_USER_ID/authentication/temporaryAccessPassMethods/$EXPIRED_TAP_ID"

# Issue a new TAP with longer lifetime
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/users/$NEW_USER_ID/authentication/temporaryAccessPassMethods" \
  --headers "Content-Type=application/json" \
  --body '{
    "lifetimeInMinutes": 480,
    "isUsableOnce": false
  }'

# The new TAP can be used multiple times within 8 hours
# giving the user enough time to register their FIDO2 key
```

</details>

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso quer prevenir ataques de fadiga de MFA onde atacantes disparam repetidamente notificações push esperando que o usuário aprove. Qual recurso do Microsoft Authenticator deve ser habilitado?",
    options: [
      "Login por telefone passwordless",
      "Correspondência de número com contexto adicional (aplicativo e localização)",
      "Tokens de hardware OATH",
      "Códigos de verificação por SMS"
    ],
    correctIndex: 1,
    explanation: "A correspondência de número exige que o usuário insira um número exibido na tela de login no aplicativo Authenticator, prevenindo aprovações cegas. O contexto adicional mostra o nome do aplicativo e a localização de login, ajudando os usuários a identificar solicitações suspeitas que não iniciaram."
  },
  {
    question: "Uma organização quer impor chaves de segurança FIDO2 apenas de fornecedores aprovados. Qual configuração da política FIDO2 controla isso?",
    options: [
      "Definir isAttestationEnforced como true",
      "Configurar keyRestrictions com enforcementType 'allow' e AAGUIDs específicos",
      "Desabilitar o registro por autoatendimento",
      "Configurar Conditional Access para bloquear dispositivos não conformes"
    ],
    correctIndex: 1,
    explanation: "Restrições de chave com o tipo de aplicação 'allow' e uma lista de AAGUIDs (Authenticator Attestation GUIDs) garantem que apenas chaves de segurança de fornecedores/modelos aprovados possam ser registradas. Cada modelo de chave FIDO2 possui um AAGUID único que identifica seu fabricante e modelo."
  },
  {
    question: "Um novo funcionário precisa registrar uma chave de segurança FIDO2, mas não possui métodos de autenticação existentes. Qual é a abordagem recomendada?",
    options: [
      "Ter um administrador registrando a chave em nome do usuário",
      "Emitir um Temporary Access Pass (TAP) para que o usuário possa fazer login e auto-registrar a chave",
      "Habilitar temporariamente autenticação por senha para o usuário",
      "Usar verificação por e-mail para inicializar a conta"
    ],
    correctIndex: 1,
    explanation: "O Temporary Access Pass foi projetado como uma credencial com tempo limitado para inicializar métodos passwordless. Ele permite que os usuários façam login uma vez (ou múltiplas vezes dentro do período de validade) para registrar sua chave FIDO2 ou configurar o Authenticator sem precisar de um método de autenticação pré-existente."
  },
  {
    question: "Quais métodos de autenticação são considerados resistentes a phishing no Microsoft Entra ID?",
    options: [
      "SMS, chamada de voz e OTP por e-mail",
      "Notificações push do Microsoft Authenticator e tokens OATH",
      "Chaves de segurança FIDO2, Windows Hello for Business e autenticação baseada em certificado",
      "Todas as formas de MFA incluindo SMS e voz"
    ],
    correctIndex: 2,
    explanation: "Métodos resistentes a phishing são aqueles que não podem ser interceptados por um ataque man-in-the-middle. FIDO2, Windows Hello for Business e autenticação baseada em certificado usam desafios criptográficos vinculados à origem, tornando-os imunes a phishing. SMS, voz e notificações push podem ser manipulados por engenharia social ou interceptados."
  }
]} />

## Limpeza

```bash
# Delete test groups
az ad group delete --group "FIDO2-Enabled-Admins"
az ad group delete --group "No-SMS-Voice-Auth"

# Reset FIDO2 policy to default (disabled)
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/fido2" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.fido2AuthenticationMethodConfiguration",
    "state": "disabled"
  }'

# Reset TAP policy
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/temporaryAccessPass" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.temporaryAccessPassAuthenticationMethodConfiguration",
    "state": "disabled"
  }'

# Reset registration campaign
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "registrationEnforcement": {
      "authenticationMethodsRegistrationCampaign": {
        "state": "disabled"
      }
    }
  }'
```
