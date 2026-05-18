---
sidebar_position: 7
title: "Challenge 07: Design Authorization for On-Premises Resources"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 07: Design Authorization for On-Premises Resources

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $10-30 | **Exam Weight: 25-30%**

:::

## Introduction

Adventure Works Cycles is a manufacturing company with 3,000 employees undergoing a hybrid cloud transformation. While their new applications are cloud-native, they rely heavily on several legacy on-premises applications that cannot be easily modernized:

1. **HR Portal**: An IIS-based ASP.NET application using Windows Integrated Authentication (Kerberos). It contains sensitive employee data and is currently accessible only via the corporate network.
2. **Engineering File Shares**: Windows Server file shares containing CAD drawings and manufacturing specifications. Engineering teams (including 200 remote workers) need daily access.
3. **Manufacturing ERP System**: A thick client application connecting to an on-premises SQL Server that requires NTLM authentication with domain-joined machines.
4. **Supplier Portal**: A legacy web application used by 50 external suppliers that currently requires VPN access to reach.

The company wants to:
- Enable single sign-on (SSO) to the HR Portal and Supplier Portal from anywhere without requiring VPN
- Allow remote workers to access file shares without VPN
- Maintain Kerberos/NTLM authentication for applications that require it
- Eventually migrate thick-client users to cloud-managed devices while maintaining ERP access

Your task is to design solutions that bridge cloud identities with on-premises resources, providing secure remote access without exposing the corporate network.

## Exam Skills Covered

- Recommend a solution for authorizing access to on-premises resources
- Recommend an authentication solution
- Recommend an identity management solution

## Design Tasks

### Part 1: Solution Selection Matrix

1. For each application, evaluate and recommend the appropriate access solution:

| Application | Requirements | Options to Evaluate | Recommended Solution |
|-------------|-------------|--------------------|--------------------|
| HR Portal (Kerberos/IIS) | SSO, no VPN, secure | App Proxy, Azure AD DS, VPN, P2S | |
| Engineering File Shares | Remote access, domain-joined | Azure Files, App Proxy, VPN, Azure AD DS | |
| Manufacturing ERP (NTLM) | Domain-joined thick client | Azure AD DS, VPN, AVD | |
| Supplier Portal (external users) | B2B access, no VPN | App Proxy + B2B, SWA, modernize | |

2. Document the decision criteria for each choice:
   - Authentication protocol support (Kerberos, NTLM, header-based)
   - Network topology requirements (line of sight to DCs, connector placement)
   - User experience impact
   - Licensing and cost implications

### Part 2: Microsoft Entra Application Proxy Design

3. Design the Application Proxy architecture for the HR Portal:
   - Connector group topology (how many connectors, where deployed, HA considerations)
   - Pre-authentication method (Entra ID vs. passthrough)
   - Kerberos Constrained Delegation (KCD) configuration
   - Conditional Access policy integration
   - Internal URL vs. external URL mapping

4. Design Application Proxy for the Supplier Portal:
   - B2B guest access integration
   - How external suppliers authenticate
   - Conditional Access requirements for external users
   - Session controls (sign-in frequency, MFA requirements)

5. Deploy an Application Proxy connector (or document the deployment architecture if on-premises resources are not available).

### Part 3: Microsoft Entra Domain Services Design

6. Evaluate whether Microsoft Entra Domain Services (Entra DS) is appropriate for Adventure Works:
   - Which scenarios benefit from Entra DS vs. traditional AD DS vs. Application Proxy
   - VNet design for Entra DS deployment
   - Password hash synchronization requirements
   - Limitations compared to full AD DS (no schema extensions, no trust relationships, no GPO flexibility)

7. Design the Entra DS deployment for the manufacturing ERP scenario:
   - VNet and subnet requirements
   - Integration with existing Entra Connect sync
   - How cloud-managed devices will authenticate to the ERP (NTLM/Kerberos through Entra DS)
   - DNS configuration

### Part 4: Azure Files for Hybrid File Access

8. Design Azure Files integration for the engineering file shares:
   - Identity-based authentication (Entra DS, on-prem AD DS, or Entra Kerberos)
   - Share-level permissions (RBAC) vs. directory/file-level permissions (NTFS ACLs)
   - Access tier selection (Hot vs. Cool for CAD files)
   - Azure File Sync considerations for caching at branch offices
   - Protocol selection (SMB 3.0 with encryption)

9. Design the migration path from on-premises file shares to Azure Files:
   - Coexistence strategy during transition (Azure File Sync as bridge)
   - How to maintain existing NTFS permissions
   - Client connectivity (private endpoint vs. public endpoint with restrictions)

### Part 5: Implement Proof of Concept

10. Create an Azure Files share with identity-based authentication enabled.

11. Document the complete Application Proxy deployment architecture for the HR Portal, including connector placement, KCD setup, and Conditional Access policies.

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-07"
  items={[
    "Solution selection matrix completed with justified recommendations for all four applications",
    "Application Proxy architecture designed with connector groups, KCD, and Conditional Access",
    "Entra Domain Services evaluated with clear documentation of when to use vs. alternatives",
    "Azure Files designed with identity-based authentication and hybrid permissions model",
    "Migration path from on-premises file shares documented with coexistence strategy",
    "At least one component deployed (Azure Files share or Application Proxy connector architecture)"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Application Proxy Architecture</summary>

Microsoft Entra Application Proxy consists of:
- **Cloud service**: Hosted by Microsoft, handles external URLs and pre-authentication
- **Connector(s)**: Lightweight agents installed on Windows Servers inside your network (no inbound firewall rules needed)
- **Published application**: The on-premises app made accessible via external URL

Key architecture decisions:
- Install 2+ connectors per connector group for high availability
- Place connectors close to the application servers (same network segment)
- Connectors make outbound-only HTTPS connections (no inbound ports required)
- Use connector groups to segregate applications (HR connectors vs. supplier connectors)
- For KCD: connectors must be domain-joined and able to obtain Kerberos tickets on behalf of users

Pre-authentication options:
- **Microsoft Entra ID**: User authenticates with Entra ID before reaching the app (enables Conditional Access, MFA)
- **Passthrough**: No pre-auth, application handles authentication directly (less secure, limited scenarios)

</details>

<details>
<summary>Hint 2: Kerberos Constrained Delegation (KCD) for SSO</summary>

For SSO to IIS apps using Windows Integrated Authentication:

1. Register a Service Principal Name (SPN) for the backend application
2. Configure the Application Proxy connector's computer account for KCD in AD
3. Set the Application Proxy application to use "Integrated Windows Authentication" for SSO

```powershell
# On Active Directory (domain controller or admin workstation)
# 1. Register SPN for the backend app service account
setspn -S HTTP/hrportal.adventureworks.local svc_hrportal

# 2. Configure KCD on the connector computer account
# In AD Users & Computers:
# Connector computer account > Properties > Delegation tab
# "Trust this computer for delegation to specified services only"
# "Use any authentication protocol"
# Add: HTTP/hrportal.adventureworks.local
```

The authentication flow:
1. User accesses external URL (https://hrportal-adventureworks.msappproxy.net)
2. Entra ID authenticates the user (MFA, Conditional Access)
3. Token is sent to the connector
4. Connector requests a Kerberos ticket for the user via KCD
5. Connector presents the Kerberos ticket to the IIS application
6. User gets SSO without seeing a login prompt

</details>

<details>
<summary>Hint 3: Entra Domain Services vs. AD DS vs. Application Proxy</summary>

| Feature | Entra Domain Services | On-Prem AD DS | Application Proxy |
|---------|----------------------|---------------|-------------------|
| Kerberos/NTLM auth | Yes | Yes | Yes (via KCD) |
| Domain join cloud VMs | Yes | Yes (with VPN/ER) | No |
| LDAP support | Yes (read-only LDAPS) | Yes (full LDAP) | No |
| Group Policy | Limited (built-in GPOs) | Full GPO | No |
| Schema extensions | No | Yes | N/A |
| Forest trusts | No | Yes | N/A |
| Management overhead | Low (PaaS) | High (IaaS) | Low (SaaS) |
| Best for | Lift-and-shift legacy apps | Full AD functionality | Web app remote access |

Use **Application Proxy** when: Web app needs remote access with SSO, no VPN desired
Use **Entra DS** when: Apps need domain-join or LDAP, cannot be fronted by a reverse proxy
Use **On-Prem AD DS (on Azure VMs)** when: Need full AD features (trusts, schema extensions, complex GPO)

</details>

<details>
<summary>Hint 4: Azure Files with Identity-Based Authentication</summary>

```bash
# Create storage account with Azure AD DS authentication
az storage account create \
  --name stadventureworksfiles \
  --resource-group rg-files \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Enable identity-based authentication (on-premises AD DS)
az storage account update \
  --name stadventureworksfiles \
  --resource-group rg-files \
  --enable-files-adds true \
  --domain-name "adventureworks.local" \
  --net-bios-domain-name "ADVENTUREWORKS" \
  --forest-name "adventureworks.local" \
  --domain-guid "<domain-guid>" \
  --domain-sid "<domain-sid>" \
  --azure-storage-sid "<storage-account-sid>"

# Create the file share
az storage share-rm create \
  --storage-account stadventureworksfiles \
  --resource-group rg-files \
  --name engineering-cad \
  --quota 5120 \
  --access-tier Hot

# Assign share-level RBAC (Storage File Data SMB Share Contributor)
az role assignment create \
  --assignee-object-id $(az ad group show -g "Engineering-Team" --query id -o tsv) \
  --role "Storage File Data SMB Share Contributor" \
  --scope "/subscriptions/{sub}/resourceGroups/rg-files/providers/Microsoft.Storage/storageAccounts/stadventureworksfiles/fileServices/default/fileshares/engineering-cad"
```

Access model (two layers):
1. **Share-level**: Azure RBAC roles (Storage File Data SMB Share Reader/Contributor/Elevated Contributor)
2. **File/directory-level**: Windows NTFS ACLs (set via mounted share from domain-joined machine)

</details>

<details>
<summary>Hint 5: Azure File Sync for Hybrid Scenarios</summary>

Azure File Sync enables branch office caching and migration coexistence:

Architecture:
- **Cloud endpoint**: Azure Files share (source of truth)
- **Server endpoint**: Path on a Windows Server (local cache)
- **Sync group**: Links cloud endpoint to one or more server endpoints
- **Cloud tiering**: Automatically tiers infrequently accessed files to Azure, keeping only hot files on local disk

Migration strategy with coexistence:
1. Deploy Azure File Sync agent on existing file servers
2. Create sync group linking Azure Files share to on-premises share path
3. Initial sync uploads all data to Azure Files (can take days for large datasets)
4. During coexistence: users access files from either location, changes sync bi-directionally
5. Cutover: redirect users to Azure Files directly (via private endpoint) or maintain File Sync for caching

```bash
# Create Storage Sync Service
az storagesync create \
  --name sync-adventureworks \
  --resource-group rg-files \
  --location eastus

# Create Sync Group
az storagesync sync-group create \
  --name sg-engineering-cad \
  --storage-sync-service sync-adventureworks \
  --resource-group rg-files
```

</details>

## Learning Resources

- [Microsoft Entra Application Proxy](https://learn.microsoft.com/en-us/entra/identity/app-proxy/overview-what-is-app-proxy)
- [KCD for SSO with Application Proxy](https://learn.microsoft.com/en-us/entra/identity/app-proxy/how-to-configure-sso-with-kcd)
- [Microsoft Entra Domain Services overview](https://learn.microsoft.com/en-us/entra/identity/domain-services/overview)
- [Azure Files identity-based authentication](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-active-directory-overview)
- [Azure File Sync planning](https://learn.microsoft.com/en-us/azure/storage/file-sync/file-sync-planning)
- [Enable B2B external collaboration](https://learn.microsoft.com/en-us/entra/external-id/what-is-b2b)
- [Conditional Access for Application Proxy apps](https://learn.microsoft.com/en-us/entra/identity/app-proxy/how-to-configure-conditional-access)

## Knowledge Check

<details>
<summary>1. Adventure Works has an on-premises IIS web application using Windows Integrated Authentication. Remote users need SSO without VPN. Which solution provides this with the least infrastructure change?</summary>

**Microsoft Entra Application Proxy with Kerberos Constrained Delegation (KCD).** Application Proxy provides external access without modifying the application or opening inbound firewall ports. The connector (installed on a domain-joined server inside the network) uses KCD to obtain Kerberos tickets on behalf of pre-authenticated users. The user authenticates with Entra ID (including MFA via Conditional Access), and the connector translates this to a Kerberos ticket for the IIS application. No VPN, no app code changes, no inbound ports.

</details>

<details>
<summary>2. External suppliers need access to an on-premises web application. They should authenticate with their own corporate accounts and have MFA enforced. How should you design this?</summary>

**Use Application Proxy combined with Entra ID B2B collaboration.** (1) Invite suppliers as B2B guest users in your Entra ID tenant. (2) Publish the supplier portal via Application Proxy with Entra ID pre-authentication. (3) Create a Conditional Access policy targeting guest users accessing the supplier portal that requires MFA. (4) Suppliers authenticate with their own organizational credentials (federated via B2B), your Conditional Access policy enforces MFA, and Application Proxy provides access to the on-premises app. Suppliers never need VPN access.

</details>

<details>
<summary>3. A company wants to provide cloud-managed (Entra joined, not domain-joined) Windows devices with access to SMB file shares that require Kerberos authentication. What options are available?</summary>

**Two options:** (1) **Microsoft Entra Kerberos for Azure Files** -- enables Entra-joined devices to access Azure Files shares using Kerberos tickets issued by Entra ID (no domain controller needed, no line of sight to on-prem AD). This works only for Azure Files, not on-premises file servers. (2) **Microsoft Entra Domain Services** -- provides domain controller functionality as a managed service; Entra-joined devices can be configured to use Entra DS for Kerberos authentication to resources in the same VNet. For purely on-premises file servers with no Azure Files migration, you would still need VPN/ExpressRoute plus either hybrid-join or Azure AD DS.

</details>

<details>
<summary>4. When should you deploy Microsoft Entra Domain Services instead of promoting a VM to a domain controller in Azure IaaS?</summary>

**Choose Entra Domain Services when:** (1) You need basic domain services (LDAP, Kerberos, NTLM, Group Policy) without managing domain controller VMs, (2) Your applications do not require schema extensions, custom GPOs beyond built-in templates, or forest trusts, (3) You want a PaaS experience with automatic patching, replication, and HA, (4) Your users already sync from on-prem AD via Entra Connect (Entra DS syncs from Entra ID). **Choose AD DS on IaaS VMs when:** You need forest trusts, schema extensions, fine-grained GPO control, or direct LDAP write access. Entra DS is read-only LDAP and does not support custom schema -- applications relying on these features must use full AD DS.

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge07 --location eastus
```

2. Deploy a storage account with Azure Files enabled:

```bash
az storage account create \
  --name staz305challenge07$RANDOM \
  --resource-group rg-az305-challenge07 \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2
```

3. Create an Azure Files share:

```bash
ST_NAME=$(az storage account list --resource-group rg-az305-challenge07 --query "[0].name" -o tsv)
az storage share-rm create \
  --storage-account "$ST_NAME" \
  --resource-group rg-az305-challenge07 \
  --name "department-share" \
  --quota 5
```

4. Assign the Storage File Data SMB Share Contributor role to your identity:

```bash
CURRENT_USER=$(az ad signed-in-user show --query id -o tsv)
STORAGE_ID=$(az storage account show --name "$ST_NAME" --resource-group rg-az305-challenge07 --query id -o tsv)
az role assignment create \
  --assignee-object-id "$CURRENT_USER" \
  --assignee-principal-type User \
  --role "Storage File Data SMB Share Contributor" \
  --scope "$STORAGE_ID"
```

5. Verify the share and RBAC assignment:

```bash
az storage share-rm list \
  --storage-account "$ST_NAME" \
  --resource-group rg-az305-challenge07 \
  --query "[].{name:name, quota:shareQuota}" -o table
az role assignment list \
  --scope "$STORAGE_ID" \
  --query "[?roleDefinitionName=='Storage File Data SMB Share Contributor'].{principal:principalName, role:roleDefinitionName}" -o table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az group delete --name rg-az305-challenge07 --yes --no-wait
```

---

**Next**: [Challenge 08: Design a Governance Strategy](/docs/az-305/identity-governance-monitoring/challenge-08)
