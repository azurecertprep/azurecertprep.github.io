---
sidebar_position: 4
title: "Desafio 04: Enterprise Applications e App Registrations"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 04: Enterprise Applications e App Registrations

## Habilidades do exame cobertas

- Gerenciar registros de aplicações no Microsoft Entra ID
- Configurar permissões de aplicação e acesso a APIs
- Implementar fluxos OAuth 2.0 para autenticação de aplicações
- Configurar service principals e enterprise applications
- Gerenciar credenciais de aplicação (segredos e certificados)
- Implementar Conditional Access em nível de aplicação

## Cenário

A Contoso Ltd está integrando uma nova aplicação SaaS de fornecedor que precisa ler perfis de usuários e enviar e-mails em nome dos usuários. Além disso, a equipe de desenvolvimento está construindo uma API interna que requer permissões delegadas e de aplicação para o Microsoft Graph. A equipe de segurança foi solicitada a revisar todos os registros de aplicações existentes, identificar aplicações com permissões excessivas e implementar gerenciamento adequado de credenciais com autenticação baseada em certificado em vez de client secrets para cargas de trabalho de produção.

---

## Pré-requisitos

- Assinatura do Azure com licença Microsoft Entra ID P1
- Função de Application Administrator ou Global Administrator
- Azure CLI instalado e autenticado
- OpenSSL instalado (para geração de certificados)

---

## Tarefa 1: Criar e configurar um registro de aplicação

Registre uma nova aplicação para a API interna da Contoso com URIs de redirecionamento e configurações de plataforma adequadas.

```bash
# Create a new app registration
APP_ID=$(az ad app create \
  --display-name "Contoso-Internal-API" \
  --sign-in-audience "AzureADMyOrg" \
  --web-redirect-uris "https://api.contoso.com/auth/callback" "https://localhost:5001/auth/callback" \
  --enable-id-token-issuance true \
  --enable-access-token-issuance false \
  --query appId -o tsv)

echo "Application (client) ID: $APP_ID"

# Get the object ID for further configuration
APP_OBJECT_ID=$(az ad app show --id "$APP_ID" --query id -o tsv)

# Add an application identifier URI
az ad app update --id "$APP_ID" \
  --identifier-uris "api://contoso-internal-api"

# Define custom API scopes (OAuth2 permissions exposed by this API)
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/applications/$APP_OBJECT_ID" \
  --headers "Content-Type=application/json" \
  --body '{
    "api": {
      "oauth2PermissionScopes": [
        {
          "adminConsentDescription": "Read data from Contoso Internal API",
          "adminConsentDisplayName": "Read API Data",
          "id": "b3a1c5d2-8f4e-4a6b-9c7d-1e2f3a4b5c6d",
          "isEnabled": true,
          "type": "User",
          "userConsentDescription": "Read your data from the internal API",
          "userConsentDisplayName": "Read your data",
          "value": "Data.Read"
        },
        {
          "adminConsentDescription": "Read and write data in Contoso Internal API",
          "adminConsentDisplayName": "Read and Write API Data",
          "id": "c4b2d6e3-9f5a-4b7c-8d1e-2f3a4b5c6d7e",
          "isEnabled": true,
          "type": "Admin",
          "userConsentDescription": "Read and write your data in the internal API",
          "userConsentDisplayName": "Read and write your data",
          "value": "Data.ReadWrite"
        }
      ]
    }
  }'

# Create the service principal (enterprise application)
az ad sp create --id "$APP_ID"
```

## Tarefa 2: Configurar permissões de API (delegadas e de aplicação)

Adicione as permissões necessárias do Microsoft Graph para a aplicação ler perfis de usuários e enviar e-mail.

```bash
# Add delegated permission: User.Read (sign in and read user profile)
az ad app permission add --id "$APP_ID" \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope

# Add delegated permission: Mail.Send (send mail as signed-in user)
az ad app permission add --id "$APP_ID" \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions e383f46e-2787-4529-855e-0e479a3ffac0=Scope

# Add application permission: User.Read.All (read all user profiles - app-only)
az ad app permission add --id "$APP_ID" \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions df021288-bdef-4463-88db-98f22de89214=Role

# Add application permission: Mail.Send (send mail as any user - app-only)
az ad app permission add --id "$APP_ID" \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions b633e1c5-b582-4048-a93e-9f11b44c7e96=Role

# Grant admin consent for the permissions
az ad app permission admin-consent --id "$APP_ID"

# Verify granted permissions
az ad app permission list --id "$APP_ID" -o table
```

## Tarefa 3: Configurar autenticação baseada em certificado

Substitua client secrets por autenticação baseada em certificado para segurança de produção.

```bash
# Generate a self-signed certificate for the application
openssl req -x509 -newkey rsa:2048 \
  -keyout contoso-api-key.pem \
  -out contoso-api-cert.pem \
  -days 365 -nodes \
  -subj "/CN=Contoso-Internal-API/O=Contoso Ltd"

# Convert to PFX for upload
openssl pkcs12 -export \
  -out contoso-api-cert.pfx \
  -inkey contoso-api-key.pem \
  -in contoso-api-cert.pem \
  -passout pass:

# Upload the certificate to the app registration
az ad app credential reset --id "$APP_ID" \
  --cert @contoso-api-cert.pem \
  --append

# Verify certificate credentials
az ad app credential list --id "$APP_ID" --cert --query "[].{keyId:keyId, displayName:displayName, endDateTime:endDateTime}" -o table

# Remove any existing client secrets (security best practice for production)
SECRET_KEY_IDS=$(az ad app credential list --id "$APP_ID" --query "[].keyId" -o tsv)
for KEY_ID in $SECRET_KEY_IDS; do
  az ad app credential delete --id "$APP_ID" --key-id "$KEY_ID"
done

# Clean up local key files
rm -f contoso-api-key.pem contoso-api-cert.pfx
# Keep contoso-api-cert.pem for reference
```

## Tarefa 4: Configurar app roles para autorização

Defina funções de aplicação para controle de acesso baseado em função dentro da aplicação.

```bash
# Add app roles to the application
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/applications/$APP_OBJECT_ID" \
  --headers "Content-Type=application/json" \
  --body '{
    "appRoles": [
      {
        "allowedMemberTypes": ["User"],
        "description": "Can read data from the API",
        "displayName": "Data Reader",
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "isEnabled": true,
        "value": "Data.Reader"
      },
      {
        "allowedMemberTypes": ["User"],
        "description": "Can read and write data in the API",
        "displayName": "Data Writer",
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "isEnabled": true,
        "value": "Data.Writer"
      },
      {
        "allowedMemberTypes": ["Application"],
        "description": "Daemon apps that can access all data",
        "displayName": "Application Data Access",
        "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
        "isEnabled": true,
        "value": "Application.DataAccess"
      }
    ]
  }'

# Assign a user to an app role
SP_OBJECT_ID=$(az ad sp show --id "$APP_ID" --query id -o tsv)
USER_ID=$(az ad user show --id "developer@contoso.com" --query id -o tsv)

az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_OBJECT_ID/appRoleAssignedTo" \
  --headers "Content-Type=application/json" \
  --body "{
    \"principalId\": \"$USER_ID\",
    \"resourceId\": \"$SP_OBJECT_ID\",
    \"appRoleId\": \"a1b2c3d4-e5f6-7890-abcd-ef1234567890\"
  }"
```

## Tarefa 5: Auditar aplicações existentes para problemas de segurança

Revise todos os registros de aplicações em busca de permissões excessivas, credenciais expirando e aplicações não utilizadas.

```bash
# List all app registrations with their permissions
az ad app list --all --query "[].{name:displayName, appId:appId, signInAudience:signInAudience}" -o table

# Find apps with high-privilege application permissions (e.g., Directory.ReadWrite.All)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/applications?\$select=displayName,appId,requiredResourceAccess" \
  --headers "Content-Type=application/json"

# Find apps with credentials expiring in the next 30 days
az ad app list --all --query "[?passwordCredentials[?endDateTime<='$(date -u -d '+30 days' +%Y-%m-%dT%H:%M:%SZ)']].{name:displayName, appId:appId}" -o table

# Find apps that haven't been signed into recently (stale apps)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals?\$filter=servicePrincipalType eq 'Application'&\$select=displayName,appId,lastSignInDateTime" \
  --headers "Content-Type=application/json"

# Check for apps with owner assignment issues
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/applications?\$select=displayName,appId&\$expand=owners(\$select=displayName,userPrincipalName)" \
  --headers "Content-Type=application/json"
```

## Tarefa 6: Restringir criação de aplicações e consentimento

Configure as definições do tenant para prevenir registros não autorizados de aplicações e concessões de consentimento.

```bash
# Disable default user ability to register applications
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authorizationPolicy/authorizationPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "defaultUserRolePermissions": {
      "allowedToCreateApps": false
    }
  }'

# Create an admin consent workflow
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/adminConsentRequestPolicy" \
  --headers "Content-Type=application/json" \
  --body "{
    \"isEnabled\": true,
    \"notifyReviewers\": true,
    \"remindersEnabled\": true,
    \"requestDurationInDays\": 30,
    \"reviewers\": [
      {
        \"query\": \"/users/$USER_ID\",
        \"queryType\": \"MicrosoftGraph\",
        \"queryRoot\": null
      }
    ]
  }"

# Configure permission grant policies (restrict low-risk consent)
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/policies/permissionGrantPolicies" \
  --headers "Content-Type=application/json" \
  --body '{
    "id": "contoso-consent-policy",
    "displayName": "Contoso Restricted Consent Policy",
    "description": "Only allow consent to verified publisher apps with low-risk permissions"
  }'

# Verify the authorization policy settings
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/authorizationPolicy/authorizationPolicy" \
  --headers "Content-Type=application/json" \
  --query "defaultUserRolePermissions"
```

---

## Break & Fix

### Cenário 1: Aplicação recebe "Insufficient privileges" ao chamar a Graph API

Uma aplicação daemon configurada com permissões de aplicação para `User.Read.All` recebe um erro 403 ao tentar listar usuários via Microsoft Graph.

<details>
<summary>Mostrar solução</summary>

```bash
# Check if admin consent has been granted
az ad app permission list-grants --id "$APP_ID" --show-resource-name -o table

# The issue is that admin consent was not granted after adding permissions
# Grant admin consent
az ad app permission admin-consent --id "$APP_ID"

# Verify the service principal has the correct permission grants
SP_ID=$(az ad sp show --id "$APP_ID" --query id -o tsv)

az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID/appRoleAssignments" \
  --headers "Content-Type=application/json" \
  --query "value[].{resource:resourceDisplayName, role:appRoleId}"

# If the permission was recently granted, the token may be cached
# The application needs to acquire a new token (tokens are cached for ~1 hour)
# In code: clear the token cache and re-authenticate
```

</details>

### Cenário 2: Client secret expirado causando indisponibilidade da aplicação

Uma aplicação de produção parou de funcionar repentinamente. A investigação revela que o client secret expirou e a aplicação não consegue se autenticar.

<details>
<summary>Mostrar solução</summary>

```bash
# Check credential expiration
az ad app credential list --id "$APP_ID" \
  --query "[].{keyId:keyId, displayName:displayName, endDate:endDateTime}" -o table

# Create a new client secret with longer expiration
NEW_SECRET=$(az ad app credential reset --id "$APP_ID" \
  --display-name "Production-$(date +%Y%m%d)" \
  --years 1 \
  --query password -o tsv)

echo "New secret (store securely): $NEW_SECRET"

# Better long-term fix: migrate to certificate authentication
openssl req -x509 -newkey rsa:2048 \
  -keyout app-key.pem -out app-cert.pem \
  -days 730 -nodes \
  -subj "/CN=Contoso-API-Production"

az ad app credential reset --id "$APP_ID" \
  --cert @app-cert.pem \
  --append

# Set up Key Vault to manage the certificate with auto-rotation
# az keyvault certificate create --vault-name contoso-kv \
#   --name app-cert --policy @cert-policy.json

# Clean up old expired secrets
EXPIRED_KEYS=$(az ad app credential list --id "$APP_ID" \
  --query "[?endDateTime<'$(date -u +%Y-%m-%dT%H:%M:%SZ)'].keyId" -o tsv)
for KEY in $EXPIRED_KEYS; do
  az ad app credential delete --id "$APP_ID" --key-id "$KEY"
done

rm -f app-key.pem app-cert.pem
```

</details>

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Um serviço daemon precisa ler os perfis de todos os usuários sem nenhum usuário conectado. Qual fluxo OAuth 2.0 e tipo de permissão deve ser utilizado?",
    options: [
      "Fluxo de código de autorização com permissão delegada User.Read",
      "Fluxo de credenciais de cliente com permissão de aplicação User.Read.All",
      "Fluxo implícito com permissão delegada User.Read.All",
      "Fluxo de código de dispositivo com permissão de aplicação User.Read"
    ],
    correctIndex: 1,
    explanation: "Serviços daemon sem interação do usuário devem usar o fluxo de credenciais de cliente, que requer permissões de aplicação (não delegadas). User.Read.All como permissão de aplicação permite que o app leia os perfis de todos os usuários sem contexto de usuário conectado."
  },
  {
    question: "Qual é o tipo de credencial recomendado para aplicações de produção que se autenticam no Microsoft Entra ID?",
    options: [
      "Client secrets com expiração de 24 meses",
      "Certificados armazenados no Azure Key Vault com rotação automática",
      "Client secrets armazenados em arquivos de configuração da aplicação",
      "Managed identities para todos os tipos de aplicação"
    ],
    correctIndex: 1,
    explanation: "Certificados são mais seguros que client secrets porque usam criptografia assimétrica (a chave privada nunca sai do cliente). Armazená-los no Key Vault com rotação automática garante que não expirem inesperadamente. Managed identities são preferidas quando disponíveis, mas não se aplicam a todos os cenários (ex.: aplicações multi-tenant)."
  },
  {
    question: "A Contoso quer impedir que usuários consentem com aplicações por conta própria, mas ainda permitir que solicitem acesso. O que deve ser configurado?",
    options: [
      "Desabilitar todo consentimento de aplicações e bloquear solicitações de acesso",
      "Habilitar o fluxo de consentimento de administrador e desabilitar o consentimento do usuário",
      "Criar uma política de Conditional Access bloqueando registros de aplicações",
      "Remover a função Application Administrator de todos os usuários"
    ],
    correctIndex: 1,
    explanation: "O fluxo de consentimento de administrador permite que os usuários solicitem acesso a aplicações que requerem permissões às quais não podem consentir sozinhos. Combinado com a desabilitação do consentimento do usuário (ou restrição a editores verificados com permissões de baixo risco), isso garante que um administrador revise todas as solicitações de consentimento."
  }
]} />

## Limpeza

```bash
# Delete the app registration (also deletes the service principal)
az ad app delete --id "$APP_ID"

# Remove leftover certificate files
rm -f contoso-api-cert.pem contoso-api-key.pem contoso-api-cert.pfx

# Re-enable user app registration if desired
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authorizationPolicy/authorizationPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "defaultUserRolePermissions": {
      "allowedToCreateApps": true
    }
  }'

# Disable admin consent workflow
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/adminConsentRequestPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "isEnabled": false
  }'
```
