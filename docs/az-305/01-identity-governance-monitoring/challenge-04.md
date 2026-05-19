---
sidebar_position: 4
title: "Challenge 04: Design Authentication for Cloud-Native Apps"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Challenge 04: design authentication for Cloud-Native Apps

:::info Estimated Time and Cost

**75-90 min** | **Estimated cost**: $0-5 | **Exam Weight: 25-30%**

:::

## Introduction

Relecloud is a SaaS company that provides event management software. They are building two new applications on Azure:

1. **Internal Operations Portal**: Used by 500 Relecloud employees to manage events, view analytics, and configure the platform. Employees use corporate laptops with Microsoft 365 licenses and Entra ID accounts. The security team requires MFA for all access and wants to block sign-ins from untrusted locations.

2. **Customer Booking Platform**: A public-facing web application used by 100,000+ consumers to browse events, purchase tickets, and manage their accounts. Customers should be able to sign up with email/password or their existing Google/Facebook accounts. The marketing team wants a branded login experience that matches Relecloud's visual identity.

Both applications share a common backend API hosted on Azure App Service that accesses Azure SQL Database, Azure Storage, and Azure Key Vault. The API must authenticate to these services without storing any credentials in code or configuration.

Your task is to design the complete authentication architecture for both applications and their backend services.

## Exam skills covered

- Recommend an authentication solution
- Recommend an identity management solution
- Recommend a solution for authorizing access to Azure resources

## Design tasks

### Part 1: authentication strategy selection

1. For each application, determine the appropriate identity platform:

<DecisionMatrix
  title="Authentication Strategy Selection"
  headers={["Internal Portal", "Customer Platform"]}
  rows={[
    {criteria: "Identity provider", values: ["Microsoft Entra ID (corporate tenant) - employees authenticate with existing work accounts", "Azure AD B2C (separate tenant) - consumer identities isolated from corporate directory"]},
    {criteria: "User population", values: ["500 internal employees with existing Azure AD accounts", "100,000+ external consumers, self-service registration required"]},
    {criteria: "Sign-up/sign-in experience", values: ["SSO via existing corporate credentials, no separate registration needed", "Custom sign-up flow with email verification, progressive profiling for loyalty data"]},
    {criteria: "Social identity support", values: ["Not needed - corporate accounts only (block social sign-in)", "Required - Google, Facebook, Apple sign-in to reduce registration friction"]},
    {criteria: "MFA requirements", values: ["Conditional Access policy: MFA required outside corporate network or for privileged operations", "Risk-based MFA: triggered only for suspicious sign-ins or high-value transactions (checkout)"]},
    {criteria: "Branding customization", values: ["Minimal - standard Microsoft sign-in page with company logo", "Fully customized - branded pages matching the e-commerce site design, custom CSS/HTML"]},
    {criteria: "Licensing model", values: ["Included with Microsoft 365 E3/E5 licenses already assigned to employees", "Azure AD B2C pricing: first 50K MAUs/month free, then per-MAU (Monthly Active User) billing"]}
  ]}
  storageKey="az305-challenge-04"
/>

2. Justify why you chose Microsoft Entra ID vs. Azure AD B2C vs. Azure AD B2B for each application. Document scenarios where the alternative would be more appropriate.

### Part 2: internal portal authentication design

3. Design the Conditional Access policy set for the Internal Operations Portal:
   - Policy 1: Require MFA for all users
   - Policy 2: Block access from countries outside the company's operating regions
   - Policy 3: Require compliant device for access to sensitive admin functions
   - Policy 4: Enforce sign-in frequency (re-authenticate every 8 hours)

4. Design the authentication flow for the internal portal:
   - Which OAuth 2.0/OIDC grant type to use (and why)
   - Token lifetime and refresh behavior
   - Session management approach

### Part 3: customer platform authentication design

5. Design the Azure AD B2C configuration for the customer platform:
   - User flows vs. custom policies: which approach and why
   - Identity providers to configure (local accounts + social)
   - Custom branding requirements
   - Self-service password reset flow

6. Design the token claims strategy:
   - What claims to include in ID tokens vs. access tokens
   - Custom claims (loyalty tier, subscription level)
   - Token lifetime considerations for consumer scenarios

### Part 4: Service-to-Service authentication

7. Design the managed identity strategy for the backend API:
   - System-assigned vs. user-assigned managed identity (and why)
   - How the App Service authenticates to Azure SQL Database
   - How the App Service authenticates to Azure Key Vault
   - How the App Service authenticates to Azure Storage

8. For scenarios where managed identity is not available (e.g., third-party API calls), design a secure credential management approach using Key Vault.

### Part 5: implement proof of concept

9. Register an application in Entra ID for the Internal Portal with appropriate redirect URIs and API permissions.

10. Create a managed identity for an App Service and grant it access to a Key Vault.

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-04"
  items={[
    "Identity platform selection justified for both internal and customer-facing applications",
    "Conditional Access policies designed covering MFA, location, device compliance, and session control",
    "B2C user flow or custom policy approach selected with social identity provider integration designed",
    "Managed identity strategy documented for all service-to-service authentication scenarios",
    "App registration created with correct permissions and redirect URIs",
    "Managed identity assigned and Key Vault access verified"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Choosing Between Entra ID, B2C, and B2B</summary>

| Scenario | Solution | Reason |
|----------|----------|--------|
| Employees accessing corporate apps | **Entra ID** | Users already exist in corporate directory, Conditional Access, MFA, device compliance |
| External consumers (self-service sign-up) | **Azure AD B2C** | Separate directory, social identity providers, custom branding, scales to millions |
| Business partners accessing your apps | **Azure AD B2B** | Partners use their own identity, appears as guest in your directory, governed by your policies |
| Both employees AND consumers in same app | **Entra External ID** (successor to B2C) | Unified platform for workforce + customer identities |

Key difference: B2C is a completely separate directory (tenant) with its own policies, branding, and user store. It does NOT share the corporate Entra ID directory.

</details>

<details>
<summary>Hint 2: Conditional Access Policy Design</summary>

Conditional Access policies are evaluated as IF-THEN statements: IF a condition is met, THEN enforce an access control.

Key signals (conditions):
- User/group membership
- Cloud app being accessed
- Device platform and compliance state
- Location (named locations, trusted IPs)
- Client app (browser, mobile app, desktop app)
- Sign-in risk level (from Identity Protection)

Key controls (grants/session):
- Require MFA
- Require device to be marked as compliant
- Require Entra hybrid join
- Block access
- Session controls (sign-in frequency, persistent browser)

Design principle: Start with a baseline policy requiring MFA for all users, then layer additional policies for specific scenarios. Always create a "break glass" emergency access account excluded from all policies.

</details>

<details>
<summary>Hint 3: App Registration and Managed Identity Setup</summary>

```bash
# Register the internal portal app
az ad app create \
  --display-name "Relecloud Internal Portal" \
  --sign-in-audience "AzureADMyOrg" \
  --web-redirect-uris "https://portal.relecloud.com/auth/callback" \
  --enable-id-token-issuance true

# Create a service principal for the app
APP_ID=$(az ad app list --display-name "Relecloud Internal Portal" --query "[0].appId" -o tsv)
az ad sp create --id $APP_ID

# Enable system-assigned managed identity on App Service
az webapp identity assign \
  --name app-relecloud-api \
  --resource-group rg-relecloud

# Get the managed identity principal ID
IDENTITY_ID=$(az webapp identity show \
  --name app-relecloud-api \
  --resource-group rg-relecloud \
  --query principalId -o tsv)

# Grant Key Vault access to the managed identity
az keyvault set-policy \
  --name kv-relecloud-prod \
  --object-id $IDENTITY_ID \
  --secret-permissions get list
```

</details>

<details>
<summary>Hint 4: Managed Identity for Azure SQL</summary>

For App Service to Azure SQL Database authentication without passwords:

1. Enable system-assigned managed identity on the App Service
2. Create a contained user in Azure SQL mapped to the managed identity
3. Use `Authentication=Active Directory Managed Identity` in the connection string

```sql
-- Run in Azure SQL Database (connected as AD admin)
CREATE USER [app-relecloud-api] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [app-relecloud-api];
ALTER ROLE db_datawriter ADD MEMBER [app-relecloud-api];
```

Connection string (no password needed):
```
Server=tcp:sql-relecloud.database.windows.net,1433;Database=releclouddb;Authentication=Active Directory Managed Identity;
```

System-assigned vs. User-assigned:
- **System-assigned**: Tied to one resource, deleted when resource is deleted. Simpler for single-resource scenarios.
- **User-assigned**: Independent lifecycle, can be shared across multiple resources. Better for deployment slots, blue-green deployments, and when multiple App Services need the same identity.

</details>

<details>
<summary>Hint 5: B2C User Flows vs. Custom Policies</summary>

**User flows** (recommended for most scenarios):
- Pre-built, configurable via Azure portal
- Support sign-up/sign-in, profile editing, password reset
- Can add social providers (Google, Facebook, Apple)
- Custom branding via HTML/CSS templates
- Limited extensibility (API connectors for custom logic)

**Custom policies** (XML-based Identity Experience Framework):
- Full control over every step of the authentication journey
- Complex scenarios: multi-step verification, conditional logic, external API calls
- Significantly more complex to implement and maintain
- Required for: custom MFA providers, complex claim transformations, REST API integrations mid-flow

For Relecloud's customer platform, **user flows** are sufficient because the requirements (email + social sign-up, branding, password reset) are standard. Use custom policies only if you need non-standard workflow logic.

</details>

## Learning resources

- [Microsoft Entra ID documentation](https://learn.microsoft.com/en-us/entra/identity/)
- [Azure AD B2C overview](https://learn.microsoft.com/en-us/azure/active-directory-b2c/overview)
- [Conditional Access overview](https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview)
- [Managed identities overview](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview)
- [Microsoft identity platform and OAuth 2.0 flows](https://learn.microsoft.com/en-us/entra/identity-platform/v2-app-types)
- [B2C user flows and custom policies](https://learn.microsoft.com/en-us/azure/active-directory-b2c/user-flow-overview)

## Knowledge check

<details>
<summary>1. Relecloud's customer platform needs to support sign-up with email, Google, and Facebook for 100,000+ consumers. The marketing team wants a fully branded login page. Which identity solution should you recommend?</summary>

**Azure AD B2C.** It is purpose-built for consumer-facing applications with: support for social identity providers (Google, Facebook, Apple), self-service sign-up with email, fully customizable UI via HTML/CSS templates, separate user directory that scales to millions of users, and a consumption-based pricing model. Entra ID (workforce) would require creating guest accounts for each consumer, which is not scalable. Entra External ID is the evolution of B2C and may also be appropriate.

</details>

<details>
<summary>2. The backend API on App Service needs to access Azure SQL Database, Key Vault, and a third-party payment API. Which authentication method should you use for each?</summary>

**Azure SQL and Key Vault: Managed Identity.** The App Service's managed identity authenticates directly to these services without any stored credentials. For Azure SQL, create a contained database user mapped to the identity. For Key Vault, assign an access policy or RBAC role granting secret read permissions.

**Third-party payment API: Client credentials stored in Key Vault.** Since managed identity only works with Azure and Microsoft services that support Entra ID authentication, store the payment API key/secret in Key Vault and retrieve it at runtime using the managed identity. This eliminates credentials from code and configuration files.

</details>

<details>
<summary>3. A Conditional Access policy requires MFA for all users accessing the Internal Portal. An emergency occurs and the admin account is locked out due to MFA issues. How should this be prevented in the design?</summary>

**Create emergency access (break glass) accounts excluded from all Conditional Access policies.** These accounts should: (1) Be cloud-only accounts (not synced from on-prem), (2) Use long complex passwords stored in a physical safe, (3) Be excluded from ALL Conditional Access policies, (4) Have Global Administrator role, (5) Be monitored with alerts on any sign-in activity, (6) Have at least two accounts for redundancy. Microsoft recommends at least two break-glass accounts per tenant.

</details>

<details>
<summary>4. When should you choose a user-assigned managed identity over a system-assigned managed identity?</summary>

**Choose user-assigned managed identity when:** (1) Multiple resources need the same identity and permissions (e.g., multiple App Services accessing the same database), (2) You use deployment slots and need identity to persist during slot swaps, (3) You want the identity lifecycle to be independent of the resource (pre-create identity and permissions before deploying the app), (4) You need to assign the identity during resource creation via IaC templates. System-assigned is simpler for single-resource scenarios where identity should be automatically cleaned up when the resource is deleted.

</details>

## Validation lab

This lab proves that managed identity eliminates stored credentials entirely and that access revocation is instantaneous -- no credential rotation window, no secret expiry waiting period. You will observe the behavioral difference between credential-based and identity-based authentication.

### Step 1: create the infrastructure

```bash
az group create \
  --name rg-az305-challenge04 \
  --location eastus
```

```bash
SUFFIX=$RANDOM
```

```bash
az keyvault create \
  --name "kv-ch04-${SUFFIX}" \
  --resource-group rg-az305-challenge04 \
  --location eastus \
  --enable-rbac-authorization false
```

```bash
az appservice plan create \
  --name "plan-ch04-${SUFFIX}" \
  --resource-group rg-az305-challenge04 \
  --sku B1 \
  --is-linux
```

```bash
az webapp create \
  --name "app-ch04-${SUFFIX}" \
  --resource-group rg-az305-challenge04 \
  --plan "plan-ch04-${SUFFIX}" \
  --runtime "NODE:18-lts"
```

### Step 2: enable system-assigned managed identity

```bash
az webapp identity assign \
  --name "app-ch04-${SUFFIX}" \
  --resource-group rg-az305-challenge04
```

```bash
PRINCIPAL_ID=$(az webapp identity show \
  --name "app-ch04-${SUFFIX}" \
  --resource-group rg-az305-challenge04 \
  --query principalId -o tsv)
```

```bash
echo "Managed identity principal: $PRINCIPAL_ID"
```

:::note[Architect Insight]
The system-assigned identity was created automatically and is tied to this App Service's lifecycle. If the App Service is deleted, the identity and all its permissions are automatically revoked. This is the "least privilege lifecycle" principle -- permissions exist only as long as the resource exists.
:::

### Step 3: store a secret and grant the managed identity access

```bash
az keyvault secret set \
  --vault-name "kv-ch04-${SUFFIX}" \
  --name "DatabaseConnectionString" \
  --value "Server=prod-sql.database.windows.net;Database=appdb;Trusted_Connection=True"
```

```bash
az keyvault set-policy \
  --name "kv-ch04-${SUFFIX}" \
  --object-id "$PRINCIPAL_ID" \
  --secret-permissions get list
```

### Step 4: prove passwordless authentication works

```bash
az keyvault secret show \
  --vault-name "kv-ch04-${SUFFIX}" \
  --name "DatabaseConnectionString" \
  --query "value" -o tsv
```

Verify the identity has access by listing secrets visible to it:

```bash
az keyvault secret list \
  --vault-name "kv-ch04-${SUFFIX}" \
  --query "[].name" -o tsv
```

:::note[Architect Insight]
No password, certificate, or connection string was stored anywhere in the application. The identity itself IS the credential. This eliminates an entire class of security vulnerabilities: leaked secrets in source control, expired credentials causing outages, and secrets sprawl across environments.
:::

### Step 5: revoke access -- observe instant denial

Remove the access policy to simulate a security response:

```bash
az keyvault delete-policy \
  --name "kv-ch04-${SUFFIX}" \
  --object-id "$PRINCIPAL_ID"
```

Now attempt to read the secret again:

```bash
az keyvault secret show \
  --vault-name "kv-ch04-${SUFFIX}" \
  --name "DatabaseConnectionString" \
  --query "value" -o tsv 2>&1 || true
```

The command fails immediately with an authorization error. There is no grace period, no cached credential that still works, no rotation delay.

:::note[Architect Insight]
Compare this to traditional credential-based auth: if you rotate a password, the old password may remain valid until expiry. With managed identity, removing the access policy produces INSTANT revocation. This is a critical exam topic -- AZ-305 asks about "minimizing the window of exposure" and managed identity reduces that window to zero.
:::

### Step 6: restore access and confirm recovery

```bash
az keyvault set-policy \
  --name "kv-ch04-${SUFFIX}" \
  --object-id "$PRINCIPAL_ID" \
  --secret-permissions get list
```

```bash
az keyvault secret show \
  --vault-name "kv-ch04-${SUFFIX}" \
  --name "DatabaseConnectionString" \
  --query "value" -o tsv
```

Access is restored immediately. No application redeployment required, no new credential to distribute.

### Step 7: add a user-assigned identity alongside system-assigned

Create a user-assigned identity:

```bash
az identity create \
  --name "id-shared-services-${SUFFIX}" \
  --resource-group rg-az305-challenge04
```

```bash
UA_ID=$(az identity show \
  --name "id-shared-services-${SUFFIX}" \
  --resource-group rg-az305-challenge04 \
  --query id -o tsv)
```

Assign it to the same App Service (both identity types coexist):

```bash
az webapp identity assign \
  --name "app-ch04-${SUFFIX}" \
  --resource-group rg-az305-challenge04 \
  --identities "$UA_ID"
```

Verify both identities are present:

```bash
az webapp identity show \
  --name "app-ch04-${SUFFIX}" \
  --resource-group rg-az305-challenge04 \
  --query "{systemAssigned:principalId, userAssigned:userAssignedIdentities}" -o json
```

:::note[Architect Insight]
System-assigned and user-assigned identities serve different architectural purposes. System-assigned is simpler and auto-cleans on resource deletion. User-assigned enables sharing permissions across multiple resources (e.g., multiple App Services accessing the same Key Vault) and survives resource recreation -- critical for blue-green deployments where you delete and recreate App Services but need permissions to persist.
:::

:::tip[Design Validation]
This lab proved three architectural principles: (1) Managed identity eliminates stored credentials entirely -- there is no secret to leak or rotate. (2) Access revocation is instantaneous -- removing the policy immediately denies access with zero grace period. (3) User-assigned and system-assigned identities coexist, enabling both per-resource isolation and cross-resource permission sharing in the same application.
:::

## Cleanup

```bash
APP_ID=$(az ad app list \
  --display-name "az305-challenge04-lab-app" \
  --query "[0].appId" -o tsv)
```

```bash
if [ -n "$APP_ID" ]; then az ad app delete --id "$APP_ID"; fi
```

```bash
az group delete \
  --name rg-az305-challenge04 \
  --yes --no-wait
```

---

**Next**: [Challenge 05: Design Identity Management](/docs/az-305/identity-governance-monitoring/challenge-05)
