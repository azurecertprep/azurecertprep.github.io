---
sidebar_position: 4
title: "Challenge 04: Enterprise Applications and App Registrations"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 04: Enterprise Applications and App Registrations

## Exam skills covered

- Manage application registrations in Microsoft Entra ID
- Configure application permissions and API access
- Implement OAuth 2.0 flows for application authentication
- Configure service principals and enterprise applications
- Manage application credentials (secrets and certificates)
- Implement application-level Conditional Access

## Scenario

Contoso Ltd is onboarding a new SaaS vendor application that needs to read user profiles and send emails on behalf of users. Additionally, the development team is building an internal API that requires both delegated and application permissions to Microsoft Graph. The security team has been asked to review all existing app registrations, identify applications with excessive permissions, and implement proper credential management with certificate-based authentication instead of client secrets for production workloads.

---

## Prerequisites

- Azure subscription with Microsoft Entra ID P1 license
- Application Administrator or Global Administrator role
- Azure CLI installed and authenticated
- OpenSSL installed (for certificate generation)

---

## Task 1: Create and configure an app registration

Register a new application for Contoso's internal API with proper redirect URIs and platform configurations.

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

## Task 2: Configure API permissions (delegated and application)

Add required Microsoft Graph permissions for the application to read user profiles and send mail.

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

## Task 3: Configure certificate-based authentication

Replace client secrets with certificate-based authentication for production security.

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

## Task 4: Configure app roles for authorization

Define application roles for role-based access control within the application.

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

## Task 5: Audit existing applications for security issues

Review all app registrations for overprivileged permissions, expiring credentials, and unused applications.

```bash
# List all app registrations with their permissions
az ad app list --all --query "[].{name:displayName, appId:appId, signInAudience:signInAudience}" -o table

# Find apps with high-privilege application permissions (e.g., Directory.ReadWrite.All)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/applications?\$select=displayName,appId,requiredResourceAccess" \
  --headers "Content-Type=application/json"

# Find apps with credentials expiring in the next 30 days
# Note: date -u -d syntax requires GNU date (Linux/Cloud Shell)
az ad app list --all --query "[?passwordCredentials[?endDateTime<='$(date -u -d '+30 days' +%Y-%m-%dT%H:%M:%SZ)']].{name:displayName, appId:appId}" -o table

# Find apps that haven't been signed into recently (stale apps)
# Note: signInActivity requires the beta API endpoint
az rest --method GET \
  --url "https://graph.microsoft.com/beta/servicePrincipals?\$filter=servicePrincipalType eq 'Application'&\$select=displayName,appId,signInActivity" \
  --headers "Content-Type=application/json" \
  --query "value[].{name:displayName, appId:appId, lastSignIn:signInActivity.lastSignInDateTime}"

# Check for apps with owner assignment issues
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/applications?\$select=displayName,appId&\$expand=owners(\$select=displayName,userPrincipalName)" \
  --headers "Content-Type=application/json"
```

## Task 6: Restrict application creation and consent

Configure tenant settings to prevent unauthorized application registrations and consent grants.

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

### Scenario 1: Application receives "Insufficient privileges" when calling Graph API

A daemon application configured with application permissions for `User.Read.All` receives a 403 error when attempting to list users via Microsoft Graph.

<details>
<summary>Show solution</summary>

```bash
# Check if admin consent has been granted
az ad app permission list --id "$APP_ID" --output table

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

### Scenario 2: Client secret expired causing application outage

A production application suddenly stopped working. Investigation reveals the client secret expired, and the application cannot authenticate.

<details>
<summary>Show solution</summary>

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

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "A daemon service needs to read all users' profiles without any user signed in. Which OAuth 2.0 flow and permission type should be used?",
    options: [
      "Authorization code flow with delegated User.Read permission",
      "Client credentials flow with application User.Read.All permission",
      "Implicit flow with delegated User.Read.All permission",
      "Device code flow with application User.Read permission"
    ],
    correctIndex: 1,
    explanation: "Daemon services without user interaction must use the client credentials flow, which requires application permissions (not delegated). User.Read.All as an application permission allows the app to read all users' profiles without a signed-in user context."
  },
  {
    question: "What is the recommended credential type for production applications authenticating to Microsoft Entra ID?",
    options: [
      "Client secrets with 24-month expiration",
      "Certificates stored in Azure Key Vault with auto-rotation",
      "Client secrets stored in application configuration files",
      "Managed identities for all application types"
    ],
    correctIndex: 1,
    explanation: "Certificates are more secure than client secrets because they use asymmetric cryptography (the private key never leaves the client). Storing them in Key Vault with auto-rotation ensures they don't expire unexpectedly. Managed identities are preferred when available but aren't applicable to all scenarios (e.g., multi-tenant apps)."
  },
  {
    question: "Contoso wants to prevent users from consenting to applications on their own while still allowing them to request access. What should they configure?",
    options: [
      "Disable all application consent and block access requests",
      "Enable the admin consent workflow and disable user consent",
      "Create a Conditional Access policy blocking app registrations",
      "Remove the Application Administrator role from all users"
    ],
    correctIndex: 1,
    explanation: "The admin consent workflow allows users to request access to applications that require permissions they cannot consent to themselves. Combined with disabling user consent (or restricting to verified publishers with low-risk permissions), this ensures an administrator reviews all consent requests."
  }
]} />

## Cleanup

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
