---
sidebar_position: 1
title: "Desafio 52: Capstone – Segurança End-to-End em Nuvem e IA"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 52: Capstone – Segurança End-to-End em Nuvem e IA

## Habilidades do exame cobertas

- **Identidade e Acesso**: Configurar PIM, Conditional Access, enforcement de MFA
- **Segurança de Dados e Armazenamento**: Key Vault com private endpoints, criptografia de disco
- **Segurança de Computação**: Secure boot, vTPM, Bastion, acesso JIT a VMs
- **Segurança de Rede**: Topologia hub-spoke, Azure Firewall, NSGs
- **Postura de Segurança**: Defender for Cloud CSPM, planos de proteção de workload
- **Detecção de Ameaças**: Microsoft Sentinel, regras de análise, playbooks de automação
- **Segurança de IA**: API Management AI Gateway, rate limiting, content safety

## Cenário

**A GRANDE FINAL**

A Contoso Ltd é uma empresa global de serviços financeiros finalizando uma grande migração para a nuvem. Como arquiteto de segurança líder, você deve implementar uma arquitetura de segurança abrangente que cobre todos os domínios do exame SC-500. Este desafio capstone integra governança de identidade, proteção de dados, segurança de rede, hardening de computação, detecção de ameaças e governança de IA em uma implantação única e coesa.

**Requisitos da Contoso:**
- Arquitetura zero-trust com acesso privilegiado protegido por PIM
- Todas as cargas de trabalho sensíveis devem usar rede privada (sem endpoints públicos)
- Máquinas virtuais devem atender benchmarks de hardening CIS Level 1
- Todo acesso administrativo via Azure Bastion com aprovação JIT
- Design de rede hub-spoke com inspeção centralizada por firewall
- Monitoramento de segurança completo com resposta automatizada a incidentes
- Cargas de trabalho de IA governadas por API Management com controles de segurança
- Conformidade com SOC 2 Type II e PCI-DSS

---

## Pré-requisitos

- Assinatura do Azure com role Owner
- Licenciamento Microsoft Entra ID P2 (PIM, Conditional Access)
- Microsoft Defender for Cloud habilitado (plano CSPM)
- Azure CLI com extensões: `sentinel`, `bastion`, `ssh`
- Familiaridade com todos os desafios anteriores (1-51)
- Tempo estimado: 90-120 minutos
- Custo estimado: ~$15-25 para a implantação completa (exclua prontamente)

---

## Tarefa 1: Configurar PIM para contas de admin privilegiadas com fluxo de aprovação

Implemente Privileged Identity Management com acesso limitado no tempo e que requer aprovação para Global Administrators.

```bash
# Set variables for the entire capstone
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
RG_CORE="rg-contoso-capstone-core"
RG_SPOKE="rg-contoso-capstone-spoke"
LOCATION="eastus"

# Create core resource group
az group create --name $RG_CORE --location $LOCATION
az group create --name $RG_SPOKE --location $LOCATION

# Configure PIM settings via Graph API
# Set Global Admin role to require approval with 4-hour maximum duration
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies" \
  --headers "Content-Type=application/json" \
  --body '{
    "rules": [
      {
        "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyApprovalRule",
        "id": "Approval_EndUser_Assignment",
        "target": {"caller": "EndUser", "operations": ["all"], "level": "Assignment"},
        "setting": {
          "isApprovalRequired": true,
          "isApprovalRequiredForExtension": true,
          "approvalStages": [{
            "approvalStageTimeOutInDays": 1,
            "isApproverJustificationRequired": true,
            "primaryApprovers": [{
              "@odata.type": "#microsoft.graph.groupMembers",
              "groupId": "security-approvers-group-id",
              "description": "Security Approvers"
            }]
          }]
        }
      },
      {
        "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyExpirationRule",
        "id": "Expiration_EndUser_Assignment",
        "target": {"caller": "EndUser", "operations": ["all"], "level": "Assignment"},
        "isExpirationRequired": true,
        "maximumDuration": "PT4H"
      },
      {
        "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyAuthenticationContextRule",
        "id": "AuthenticationContext_EndUser_Assignment",
        "claimValue": "c1",
        "isEnabled": true
      }
    ]
  }'

# Make admin user eligible (not permanently assigned)
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleRequests" \
  --body '{
    "action": "adminAssign",
    "justification": "Capstone: PIM eligible assignment for Global Admin",
    "roleDefinitionId": "62e90394-69f5-4237-9190-012177145e10",
    "directoryScopeId": "/",
    "principalId": "admin-user-object-id",
    "scheduleInfo": {
      "startDateTime": "2025-01-15T00:00:00Z",
      "expiration": {
        "type": "afterDuration",
        "duration": "P365D"
      }
    }
  }'
```

**Verificar configuração do PIM:**
1. Navegue até **Entra ID** → **Identity Governance** → **Privileged Identity Management**
2. Selecione **Azure AD roles** → **Settings** → **Global Administrator**
3. Confirme:
   - Ativação requer aprovação ✓
   - Duração máxima de ativação: 4 horas ✓
   - Exigir MFA na ativação ✓
   - Exigir justificativa ✓

---

## Tarefa 2: Criar política de Conditional Access exigindo MFA para logins arriscados

Implante uma política de Conditional Access que impõe MFA quando o Identity Protection detecta risco.

```bash
# Create Conditional Access policy via Graph API
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --body '{
    "displayName": "Capstone: Require MFA for Risky Sign-ins",
    "state": "enabled",
    "conditions": {
      "users": {
        "includeUsers": ["All"],
        "excludeUsers": ["break-glass-admin-object-id"],
        "excludeGroups": ["service-accounts-group-id"]
      },
      "applications": {
        "includeApplications": ["All"]
      },
      "signInRiskLevels": ["high", "medium"],
      "userRiskLevels": ["high"]
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["mfa"]
    },
    "sessionControls": {
      "signInFrequency": {
        "value": 1,
        "type": "hours",
        "isEnabled": true
      }
    }
  }'

# Create a second policy: Block legacy authentication
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --body '{
    "displayName": "Capstone: Block Legacy Authentication",
    "state": "enabled",
    "conditions": {
      "users": {"includeUsers": ["All"]},
      "applications": {"includeApplications": ["All"]},
      "clientAppTypes": ["exchangeActiveSync", "other"]
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["block"]
    }
  }'
```

**Verificar:**
```bash
# List all Conditional Access policies
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --query "value[].{Name:displayName, State:state}" -o table
```

---

## Tarefa 3: Implantar Key Vault com private endpoint e regras de firewall

Crie um Key Vault acessível apenas via rede privada.

```bash
# Create VNet for private endpoints (will be spoke network)
az network vnet create \
  --resource-group $RG_SPOKE \
  --name "vnet-contoso-spoke" \
  --address-prefix "10.1.0.0/16" \
  --subnet-name "snet-private-endpoints" \
  --subnet-prefix "10.1.1.0/24"

# Disable private endpoint network policies on subnet
az network vnet subnet update \
  --resource-group $RG_SPOKE \
  --vnet-name "vnet-contoso-spoke" \
  --name "snet-private-endpoints" \
  --private-endpoint-network-policies Disabled

# Create Key Vault with no public access
az keyvault create \
  --name "kv-contoso-capstone" \
  --resource-group $RG_SPOKE \
  --location $LOCATION \
  --sku premium \
  --enable-rbac-authorization true \
  --enable-purge-protection true \
  --enable-soft-delete true \
  --public-network-access Disabled \
  --retention-days 90

# Create private endpoint for Key Vault
az network private-endpoint create \
  --resource-group $RG_SPOKE \
  --name "pe-keyvault-capstone" \
  --vnet-name "vnet-contoso-spoke" \
  --subnet "snet-private-endpoints" \
  --private-connection-resource-id $(az keyvault show --name "kv-contoso-capstone" --resource-group $RG_SPOKE --query id -o tsv) \
  --group-ids vault \
  --connection-name "keyvault-private-connection"

# Create private DNS zone for Key Vault
az network private-dns zone create \
  --resource-group $RG_SPOKE \
  --name "privatelink.vaultcore.azure.net"

# Link DNS zone to VNet
az network private-dns link vnet create \
  --resource-group $RG_SPOKE \
  --zone-name "privatelink.vaultcore.azure.net" \
  --name "link-spoke-vnet" \
  --virtual-network "vnet-contoso-spoke" \
  --registration-enabled false

# Create DNS zone group for automatic DNS record management
az network private-endpoint dns-zone-group create \
  --resource-group $RG_SPOKE \
  --endpoint-name "pe-keyvault-capstone" \
  --name "default" \
  --private-dns-zone $(az network private-dns zone show --resource-group $RG_SPOKE --name "privatelink.vaultcore.azure.net" --query id -o tsv) \
  --zone-name "keyvault"

# Add a secret for testing
az keyvault secret set \
  --vault-name "kv-contoso-capstone" \
  --name "DatabaseConnectionString" \
  --value "Server=tcp:sql-contoso.database.windows.net;Encrypt=True;"

# Assign Key Vault Secrets Officer role to admin
az role assignment create \
  --assignee $(az ad signed-in-user show --query id -o tsv) \
  --role "Key Vault Secrets Officer" \
  --scope $(az keyvault show --name "kv-contoso-capstone" --resource-group $RG_SPOKE --query id -o tsv)
```

**Verificar acesso apenas privado:**
```bash
# This should fail (no public access)
az keyvault secret show --vault-name "kv-contoso-capstone" --name "DatabaseConnectionString" 2>&1 | grep -i "forbidden\|error"

# Verify private endpoint is connected
az network private-endpoint show \
  --resource-group $RG_SPOKE \
  --name "pe-keyvault-capstone" \
  --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status" -o tsv
```

---

## Tarefa 4: Criar VM com criptografia de disco, secure boot e vTPM

Implante uma máquina virtual hardened com Trusted Launch e Azure Disk Encryption.

```bash
# Create VM subnet
az network vnet subnet create \
  --resource-group $RG_SPOKE \
  --vnet-name "vnet-contoso-spoke" \
  --name "snet-compute" \
  --address-prefix "10.1.2.0/24"

# Create Trusted Launch VM with secure boot and vTPM
az vm create \
  --resource-group $RG_SPOKE \
  --name "vm-contoso-secure" \
  --image "Canonical:ubuntu-24_04-lts:server:latest" \
  --size "Standard_D2s_v5" \
  --vnet-name "vnet-contoso-spoke" \
  --subnet "snet-compute" \
  --admin-username "contosoAdmin" \
  --generate-ssh-keys \
  --security-type TrustedLaunch \
  --enable-secure-boot true \
  --enable-vtpm true \
  --public-ip-address "" \
  --nsg ""

# Enable Azure Disk Encryption (using Key Vault for key management)
# First, create a disk encryption set
az disk-encryption-set create \
  --resource-group $RG_SPOKE \
  --name "des-contoso-capstone" \
  --key-url "https://kv-contoso-capstone.vault.azure.net/keys/disk-encryption-key/version" \
  --source-vault "kv-contoso-capstone" \
  --encryption-type EncryptionAtRestWithPlatformAndCustomerKeys \
  2>/dev/null || echo "Note: Key must be created in KV first for full disk encryption set"

# Enable host-based encryption on the VM
az vm update \
  --resource-group $RG_SPOKE \
  --name "vm-contoso-secure" \
  --set securityProfile.encryptionAtHost=true \
  2>/dev/null || echo "Note: encryptionAtHost requires feature registration"

# Install Guest Attestation extension for Trusted Launch verification
az vm extension set \
  --resource-group $RG_SPOKE \
  --vm-name "vm-contoso-secure" \
  --name "GuestAttestation" \
  --publisher "Microsoft.Azure.Security.LinuxAttestation" \
  --version "1.0"
```

**Verificar configuração de segurança da VM:**
```bash
az vm show \
  --resource-group $RG_SPOKE \
  --name "vm-contoso-secure" \
  --query "{
    SecureBoot: securityProfile.uefiSettings.secureBootEnabled,
    VTPM: securityProfile.uefiSettings.vTpmEnabled,
    SecurityType: securityProfile.securityType,
    EncryptionAtHost: securityProfile.encryptionAtHost
  }" -o table
```

---

## Tarefa 5: Configurar Azure Bastion e acesso JIT a VMs

Implante o Bastion para acesso administrativo seguro e habilite políticas Just-In-Time.

```bash
# Create Bastion subnet (required name: AzureBastionSubnet)
az network vnet subnet create \
  --resource-group $RG_SPOKE \
  --vnet-name "vnet-contoso-spoke" \
  --name "AzureBastionSubnet" \
  --address-prefix "10.1.255.0/26"

# Create public IP for Bastion
az network public-ip create \
  --resource-group $RG_SPOKE \
  --name "pip-bastion-capstone" \
  --sku Standard \
  --allocation-method Static

# Deploy Azure Bastion (Standard SKU for file transfer and native client)
az network bastion create \
  --resource-group $RG_SPOKE \
  --name "bastion-contoso-capstone" \
  --public-ip-address "pip-bastion-capstone" \
  --vnet-name "vnet-contoso-spoke" \
  --sku Standard \
  --enable-tunneling true \
  --enable-ip-connect true

# Enable JIT VM access via Defender for Cloud
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG_SPOKE/providers/Microsoft.Compute/virtualMachines/vm-contoso-secure/providers/Microsoft.Security/jitNetworkAccessPolicies/default?api-version=2020-01-01" \
  --body '{
    "properties": {
      "virtualMachines": [{
        "id": "/subscriptions/'$SUBSCRIPTION_ID'/resourceGroups/'$RG_SPOKE'/providers/Microsoft.Compute/virtualMachines/vm-contoso-secure",
        "ports": [
          {
            "number": 22,
            "protocol": "TCP",
            "allowedSourceAddressPrefix": "*",
            "maxRequestAccessDuration": "PT3H"
          }
        ]
      }]
    },
    "kind": "Basic"
  }'
```

**Verificar Bastion e JIT:**
```bash
# Verify Bastion is provisioned
az network bastion show \
  --resource-group $RG_SPOKE \
  --name "bastion-contoso-capstone" \
  --query "{Status:provisioningState, SKU:sku.name, Tunneling:enableTunneling}" -o table

# Verify JIT policy is active
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG_SPOKE/providers/Microsoft.Security/jitNetworkAccessPolicies?api-version=2020-01-01" \
  --query "value[].{Name:name, VMs:properties.virtualMachines[].id}" -o table
```

---

## Tarefa 6: Configurar rede hub-spoke com Azure Firewall e regras NSG

Crie a rede hub com Azure Firewall centralizado para inspeção de tráfego.

```bash
# Create hub VNet
az network vnet create \
  --resource-group $RG_CORE \
  --name "vnet-contoso-hub" \
  --address-prefix "10.0.0.0/16" \
  --subnet-name "AzureFirewallSubnet" \
  --subnet-prefix "10.0.1.0/26"

# Create Azure Firewall public IP
az network public-ip create \
  --resource-group $RG_CORE \
  --name "pip-firewall-capstone" \
  --sku Standard \
  --allocation-method Static

# Deploy Azure Firewall (Standard tier)
az network firewall create \
  --resource-group $RG_CORE \
  --name "fw-contoso-hub" \
  --location $LOCATION \
  --sku AZFW_VNet \
  --tier Standard

# Associate public IP with firewall
az network firewall ip-config create \
  --resource-group $RG_CORE \
  --firewall-name "fw-contoso-hub" \
  --name "fw-ipconfig" \
  --public-ip-address "pip-firewall-capstone" \
  --vnet-name "vnet-contoso-hub"

# Get firewall private IP for routing
FW_PRIVATE_IP=$(az network firewall show \
  --resource-group $RG_CORE \
  --name "fw-contoso-hub" \
  --query "ipConfigurations[0].privateIPAddress" -o tsv)

# Create firewall network rules (allow spoke to internet via firewall)
az network firewall network-rule create \
  --resource-group $RG_CORE \
  --firewall-name "fw-contoso-hub" \
  --collection-name "AllowSpokeOutbound" \
  --name "AllowHTTPS" \
  --protocols TCP \
  --source-addresses "10.1.0.0/16" \
  --destination-addresses "*" \
  --destination-ports 443 \
  --action Allow \
  --priority 100

# Create firewall application rules (restrict to approved FQDNs)
az network firewall application-rule create \
  --resource-group $RG_CORE \
  --firewall-name "fw-contoso-hub" \
  --collection-name "AllowAzureServices" \
  --name "AllowAzureManagement" \
  --protocols Https=443 \
  --source-addresses "10.1.0.0/16" \
  --fqdn-tags "AzureCloud" "MicrosoftActiveDirectory" \
  --action Allow \
  --priority 200

# Create DNAT rule to deny known malicious destinations
az network firewall network-rule create \
  --resource-group $RG_CORE \
  --firewall-name "fw-contoso-hub" \
  --collection-name "DenyMalicious" \
  --name "DenyKnownC2" \
  --protocols Any \
  --source-addresses "10.0.0.0/8" \
  --destination-addresses "198.51.100.0/24" "203.0.113.0/24" \
  --destination-ports "*" \
  --action Deny \
  --priority 50

# Peer hub and spoke VNets
az network vnet peering create \
  --resource-group $RG_CORE \
  --name "hub-to-spoke" \
  --vnet-name "vnet-contoso-hub" \
  --remote-vnet $(az network vnet show --resource-group $RG_SPOKE --name "vnet-contoso-spoke" --query id -o tsv) \
  --allow-forwarded-traffic \
  --allow-gateway-transit

az network vnet peering create \
  --resource-group $RG_SPOKE \
  --name "spoke-to-hub" \
  --vnet-name "vnet-contoso-spoke" \
  --remote-vnet $(az network vnet show --resource-group $RG_CORE --name "vnet-contoso-hub" --query id -o tsv) \
  --allow-forwarded-traffic \
  --use-remote-gateways false

# Create route table to force traffic through firewall
az network route-table create \
  --resource-group $RG_SPOKE \
  --name "rt-spoke-to-firewall" \
  --location $LOCATION

az network route-table route create \
  --resource-group $RG_SPOKE \
  --route-table-name "rt-spoke-to-firewall" \
  --name "default-to-firewall" \
  --address-prefix "0.0.0.0/0" \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address $FW_PRIVATE_IP

# Associate route table with compute subnet
az network vnet subnet update \
  --resource-group $RG_SPOKE \
  --vnet-name "vnet-contoso-spoke" \
  --name "snet-compute" \
  --route-table "rt-spoke-to-firewall"

# Create NSG for compute subnet
az network nsg create \
  --resource-group $RG_SPOKE \
  --name "nsg-compute-capstone"

# Deny all inbound except Bastion
az network nsg rule create \
  --resource-group $RG_SPOKE \
  --nsg-name "nsg-compute-capstone" \
  --name "AllowBastionInbound" \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol TCP \
  --source-address-prefixes "10.1.255.0/26" \
  --destination-port-ranges 22 3389

az network nsg rule create \
  --resource-group $RG_SPOKE \
  --nsg-name "nsg-compute-capstone" \
  --name "DenyAllInbound" \
  --priority 4000 \
  --direction Inbound \
  --access Deny \
  --protocol "*" \
  --source-address-prefixes "*" \
  --destination-port-ranges "*"

# Associate NSG with compute subnet
az network vnet subnet update \
  --resource-group $RG_SPOKE \
  --vnet-name "vnet-contoso-spoke" \
  --name "snet-compute" \
  --network-security-group "nsg-compute-capstone"
```

---

## Tarefa 7: Habilitar Defender for Cloud CSPM e proteção de workload

Ative o gerenciamento completo de postura de segurança em nuvem e proteção de workload.

```bash
# Enable Defender for Cloud CSPM (Cloud Security Posture Management)
az security pricing create \
  --name "CloudPosture" \
  --tier "Standard"

# Enable Defender for Servers (Plan 2 - full EDR)
az security pricing create \
  --name "VirtualMachines" \
  --tier "Standard" \
  --subplan "P2"

# Enable Defender for Key Vault
az security pricing create \
  --name "KeyVaults" \
  --tier "Standard"

# Enable Defender for Storage
az security pricing create \
  --name "StorageAccounts" \
  --tier "Standard" \
  --subplan "DefenderForStorageV2"

# Enable Defender for Azure Resource Manager
az security pricing create \
  --name "Arm" \
  --tier "Standard"

# Enable Defender for DNS
az security pricing create \
  --name "Dns" \
  --tier "Standard"

# Configure security contact for alerts
az security contact create \
  --name "default" \
  --emails "soc@contoso.com" \
  --alert-notifications "On" \
  --alerts-to-admins "On"

# Enable auto-provisioning for Defender for Endpoint
az security auto-provisioning-setting update \
  --name "default" \
  --auto-provision "On"

# Set Defender for Cloud governance rules
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/providers/Microsoft.Security/governanceRules/capstone-governance?api-version=2022-01-01-preview" \
  --body '{
    "properties": {
      "displayName": "Capstone: Remediate Critical Findings in 7 Days",
      "description": "Auto-assign critical security findings to resource owners",
      "rulePriority": 100,
      "isGracePeriod": true,
      "governanceEmailNotification": {
        "disableManagerEmailNotification": false,
        "disableOwnerEmailNotification": false
      },
      "ownerSource": {"type": "ByTag", "value": "SecurityOwner"},
      "remediationTimeframe": "7.00:00:00",
      "conditionSets": [{
        "conditions": [{
          "property": "$.Severity",
          "value": ["High", "Critical"],
          "operator": "In"
        }]
      }]
    }
  }'
```

**Verificar status do Defender for Cloud:**
```bash
# Check all pricing tiers
az security pricing list --query "[].{Name:name, Tier:pricingTier}" -o table
```

---

## Tarefa 8: Implantar workspace do Sentinel com conectores Azure Activity e Entra ID

Crie a camada de monitoramento de segurança com o Microsoft Sentinel.

```bash
# Create dedicated Sentinel workspace
SENTINEL_WORKSPACE="law-contoso-sentinel-capstone"

az monitor log-analytics workspace create \
  --workspace-name $SENTINEL_WORKSPACE \
  --resource-group $RG_CORE \
  --location $LOCATION \
  --retention-time 90

# Enable Sentinel
az sentinel onboarding-state create \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --name "default"

# Enable Azure Activity data connector
az sentinel data-connector create \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --data-connector-id "AzureActivity" \
  --azure-activity \
  --subscription-id $SUBSCRIPTION_ID \
  --data-types-azure-activity-state "Enabled"

# Enable Entra ID data connector
az sentinel data-connector create \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --data-connector-id "AzureActiveDirectory" \
  --aad \
  --tenant-id $TENANT_ID \
  --data-types-sign-in-logs-state "Enabled" \
  --data-types-audit-logs-state "Enabled" \
  --data-types-alerts-state "Enabled"

# Enable Defender for Cloud connector
az sentinel data-connector create \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --data-connector-id "AzureSecurityCenter" \
  --asc \
  --subscription-id $SUBSCRIPTION_ID \
  --data-types-alerts-state "Enabled"

# Send Azure Firewall logs to Sentinel workspace
SENTINEL_WS_ID=$(az monitor log-analytics workspace show \
  --workspace-name $SENTINEL_WORKSPACE \
  --resource-group $RG_CORE \
  --query id -o tsv)

az monitor diagnostic-settings create \
  --name "firewall-to-sentinel" \
  --resource $(az network firewall show --resource-group $RG_CORE --name "fw-contoso-hub" --query id -o tsv) \
  --workspace $SENTINEL_WS_ID \
  --logs '[
    {"category":"AzureFirewallApplicationRule","enabled":true},
    {"category":"AzureFirewallNetworkRule","enabled":true},
    {"category":"AzureFirewallDnsProxy","enabled":true}
  ]'

# Verify connectors
az sentinel data-connector list \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --query "[].{Name:name, Kind:kind}" -o table
```

---

## Tarefa 9: Criar regras de análise e playbook de automação para detecção de força bruta

Construa detecção e resposta automatizada para ataques de credenciais.

```bash
# Create brute-force detection rule
az sentinel alert-rule create \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --rule-id "capstone-brute-force" \
  --scheduled \
  --name "Capstone: Brute Force Sign-in with Subsequent Success" \
  --description "Detects brute-force attacks where attacker eventually succeeds" \
  --severity "High" \
  --enabled true \
  --query "let failThreshold = 10;
SigninLogs
| where TimeGenerated > ago(1h)
| summarize 
    FailCount = countif(ResultType != 0),
    SuccessCount = countif(ResultType == 0),
    FirstAttempt = min(TimeGenerated),
    LastAttempt = max(TimeGenerated),
    AttemptedAccounts = make_set(UserPrincipalName, 20)
    by IPAddress
| where FailCount >= failThreshold and SuccessCount > 0
| project IPAddress, FailCount, SuccessCount, 
          FirstAttempt, LastAttempt, AttemptedAccounts" \
  --query-frequency "PT10M" \
  --query-period "PT1H" \
  --trigger-operator "GreaterThan" \
  --trigger-threshold 0 \
  --tactics "CredentialAccess" \
  --techniques "T1110"

# Create privilege escalation detection (NRT)
az sentinel alert-rule create \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --rule-id "capstone-priv-esc" \
  --nrt \
  --name "Capstone: Unauthorized Role Assignment (NRT)" \
  --description "Detects direct privileged role assignment bypassing PIM" \
  --severity "High" \
  --enabled true \
  --query "AuditLogs
| where TimeGenerated > ago(5m)
| where OperationName == 'Add member to role'
| extend RoleName = tostring(TargetResources[0].displayName)
| where RoleName has_any ('Global Administrator', 'Privileged Role Administrator', 'Security Administrator')
| where OperationName != 'Add eligible member to role in PIM'
| extend Actor = tostring(InitiatedBy.user.userPrincipalName),
         Target = tostring(TargetResources[0].userPrincipalName)
| project TimeGenerated, Actor, Target, RoleName" \
  --tactics "PrivilegeEscalation" \
  --techniques "T1078.004"

# Create Logic App playbook for automated response
az logic workflow create \
  --resource-group $RG_CORE \
  --name "playbook-capstone-brute-force" \
  --location $LOCATION \
  --definition '{
    "definition": {
      "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      "contentVersion": "1.0.0.0",
      "triggers": {
        "Microsoft_Sentinel_incident": {
          "type": "ApiConnectionWebhook",
          "inputs": {
            "body": {"callback_url": "@{listCallbackUrl()}"},
            "host": {"connection": {"name": "@parameters($connections)[azuresentinel][connectionId]"}},
            "path": "/incident-creation"
          }
        }
      },
      "actions": {
        "Revoke_user_sessions": {
          "type": "Http",
          "inputs": {
            "method": "POST",
            "uri": "https://graph.microsoft.com/v1.0/users/@{triggerBody()?[object]?[properties]?[relatedEntities]?[0]?[properties]?[friendlyName]}/revokeSignInSessions"
          },
          "runAfter": {}
        },
        "Add_comment": {
          "type": "ApiConnection",
          "inputs": {
            "host": {"connection": {"name": "@parameters($connections)[azuresentinel][connectionId]"}},
            "method": "post",
            "path": "/comment",
            "body": {
              "incidentArmId": "@triggerBody()?[object]?[id]",
              "message": "Automated: User sessions revoked. IP submitted for blocking."
            }
          },
          "runAfter": {"Revoke_user_sessions": ["Succeeded"]}
        }
      }
    }
  }'

# Link playbook to brute-force rule via automation rule
PLAYBOOK_ID=$(az logic workflow show \
  --resource-group $RG_CORE \
  --name "playbook-capstone-brute-force" \
  --query id -o tsv)

az sentinel automation-rule create \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --automation-rule-id "capstone-auto-brute-force" \
  --name "Capstone: Auto-respond Brute Force" \
  --order 1 \
  --triggering-logic \
    is-enabled=true \
    triggers-on="Incidents" \
    triggers-when="Created" \
    conditions='[{
      "conditionType": "Property",
      "conditionProperties": {
        "propertyName": "IncidentSeverity",
        "operator": "Equals",
        "propertyValues": ["High"]
      }
    }]' \
  --actions '[{
    "actionType": "RunPlaybook",
    "order": 1,
    "actionConfiguration": {
      "logicAppResourceId": "'$PLAYBOOK_ID'",
      "tenantId": "'$TENANT_ID'"
    }
  }]'
```

---

## Tarefa 10: Configurar API Management AI Gateway com rate limiting e content safety

Implante uma instância do API Management como AI Gateway com controles de segurança.

```bash
# Create APIM subnet in spoke
az network vnet subnet create \
  --resource-group $RG_SPOKE \
  --vnet-name "vnet-contoso-spoke" \
  --name "snet-apim" \
  --address-prefix "10.1.3.0/24"

# Create API Management instance (Consumption tier for lab speed)
az apim create \
  --resource-group $RG_SPOKE \
  --name "apim-contoso-aigateway" \
  --publisher-name "Contoso Ltd" \
  --publisher-email "api-admin@contoso.com" \
  --sku-name Consumption \
  --location $LOCATION

# Import Azure OpenAI API as backend
az apim api import \
  --resource-group $RG_SPOKE \
  --service-name "apim-contoso-aigateway" \
  --path "openai" \
  --display-name "Azure OpenAI Gateway" \
  --specification-format OpenApi \
  --specification-url "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/stable/2024-02-01/inference.json" \
  --api-id "azure-openai-api" \
  2>/dev/null || echo "Note: Import URL may need updating for latest spec"

# Create rate limiting policy (token-based)
az apim api policy set \
  --resource-group $RG_SPOKE \
  --service-name "apim-contoso-aigateway" \
  --api-id "azure-openai-api" \
  --xml-policy '<policies>
  <inbound>
    <base />
    <!-- Rate limiting: 10000 tokens per minute per subscription -->
    <rate-limit-by-key 
      calls="60" 
      renewal-period="60" 
      counter-key="@(context.Subscription.Id)" />
    <!-- Token limit policy for AI workloads -->
    <azure-openai-token-limit
      counter-key="@(context.Subscription.Id)"
      tokens-per-minute="10000"
      estimate-prompt-tokens="true"
      remaining-tokens-variable-name="remainingTokens" />
    <!-- Content safety filter -->
    <azure-openai-semantic-cache-store duration="300" />
    <!-- Validate JWT for authentication -->
    <validate-azure-ad-token tenant-id="'$TENANT_ID'" header-name="Authorization">
      <client-application-ids>
        <application-id>allowed-client-app-id</application-id>
      </client-application-ids>
    </validate-azure-ad-token>
    <!-- Log token usage for monitoring -->
    <set-header name="x-request-timestamp" exists-action="override">
      <value>@(DateTime.UtcNow.ToString("o"))</value>
    </set-header>
  </inbound>
  <backend>
    <base />
  </backend>
  <outbound>
    <base />
    <!-- Emit token usage metrics -->
    <azure-openai-emit-token-metric namespace="AIGateway">
      <dimension name="Subscription" value="@(context.Subscription.Id)" />
      <dimension name="API" value="@(context.Api.Name)" />
      <dimension name="Model" value="@(context.Request.Headers.GetValueOrDefault(\"model\",\"unknown\"))" />
    </azure-openai-emit-token-metric>
  </outbound>
  <on-error>
    <base />
    <return-response>
      <set-status code="429" reason="Rate limit exceeded" />
      <set-body>{"error": "Token or request rate limit exceeded. Please retry after the rate limit window resets."}</set-body>
    </return-response>
  </on-error>
</policies>'

# Create subscription key for the AI API
az apim subscription create \
  --resource-group $RG_SPOKE \
  --service-name "apim-contoso-aigateway" \
  --display-name "AI-Team-Production" \
  --scope "/apis/azure-openai-api" \
  --state active
```

**Verificar configuração do AI Gateway:**
```bash
# List APIs
az apim api list \
  --resource-group $RG_SPOKE \
  --service-name "apim-contoso-aigateway" \
  --query "[].{Name:displayName, Path:path}" -o table

# List subscriptions
az apim subscription list \
  --resource-group $RG_SPOKE \
  --service-name "apim-contoso-aigateway" \
  --query "[].{Name:displayName, State:state}" -o table
```

---

## Quebra & conserta

### Cenário 1: Ativação do PIM falha com "Authentication context required"

Um admin tenta ativar sua role Global Administrator via PIM mas recebe um erro informando que o requisito de authentication context não pode ser satisfeito.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** A política de role do PIM referencia um authentication context (`c1`) que requer uma política de Conditional Access específica para ser satisfeita, mas nenhuma política CA está configurada com esse authentication context.

**Correção:**
1. Crie uma política de Conditional Access com o authentication context necessário:
   ```bash
   az rest --method POST \
     --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
     --body '{
       "displayName": "Require phishing-resistant MFA for PIM activation",
       "state": "enabled",
       "conditions": {
         "users": {"includeUsers": ["All"]},
         "applications": {
           "includeAuthenticationContextClassReferences": ["c1"]
         }
       },
       "grantControls": {
         "operator": "OR",
         "authenticationStrength": {
           "id": "00000000-0000-0000-0000-000000000004"
         }
       }
     }'
   ```
2. Alternativamente, remova o requisito de authentication context da política PIM se MFA resistente a phishing não for viável

</details>

### Cenário 2: VM não consegue acessar Key Vault via private endpoint

A VM segura na VNet spoke não consegue acessar segredos do Key Vault mesmo com o private endpoint existente.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** A zona DNS privada não está resolvendo corretamente — a VM ainda está tentando alcançar o endpoint público que está desabilitado.

**Correção:**
1. Verifique a resolução DNS a partir da VM:
   ```bash
   az network bastion ssh \
     --resource-group $RG_SPOKE \
     --name "bastion-contoso-capstone" \
     --target-resource-id $(az vm show -g $RG_SPOKE -n "vm-contoso-secure" --query id -o tsv) \
     --auth-type ssh-key \
     --username contosoAdmin \
     --ssh-key "~/.ssh/id_rsa" \
     -- -t "nslookup kv-contoso-capstone.vault.azure.net"
   ```
2. Se estiver resolvendo para IP público, verifique o link da zona DNS privada:
   ```bash
   az network private-dns link vnet show \
     --resource-group $RG_SPOKE \
     --zone-name "privatelink.vaultcore.azure.net" \
     --name "link-spoke-vnet"
   ```
3. Garanta que o DNS zone group foi criado no private endpoint:
   ```bash
   az network private-endpoint dns-zone-group show \
     --resource-group $RG_SPOKE \
     --endpoint-name "pe-keyvault-capstone" \
     --name "default"
   ```
4. Se a tabela de rotas força todo o tráfego pelo firewall, garanta que o firewall tem uma regra de rede permitindo tráfego para o IP do private endpoint (10.1.1.x) ou use um service endpoint

</details>

### Cenário 3: Firewall bloqueia tráfego legítimo de gerenciamento do Azure em VMs spoke

Após habilitar a tabela de rotas forçando tráfego pelo firewall, a VM não consegue mais alcançar endpoints de gerenciamento do Azure necessários para extensões e atualizações.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** As regras de aplicação do firewall usam FQDN tags mas as regras podem não cobrir todos os endpoints de gerenciamento necessários, ou a ordenação de prioridade está incorreta.

**Correção:**
1. Adicione service tags necessárias às regras de rede:
   ```bash
   az network firewall network-rule create \
     --resource-group $RG_CORE \
     --firewall-name "fw-contoso-hub" \
     --collection-name "AllowAzureManagement" \
     --name "AllowAzureMonitor" \
     --protocols TCP \
     --source-addresses "10.1.0.0/16" \
     --destination-addresses "AzureMonitor" \
     --destination-ports 443 \
     --action Allow \
     --priority 150
   ```
2. Verifique se a FQDN tag `AzureCloud` inclui todos os endpoints necessários
3. Considere adicionar service tags específicas: `AzureActiveDirectory`, `AzureKeyVault`, `Storage`
4. Verifique os logs do firewall para tráfego bloqueado:
   ```kql
   AzureDiagnostics
   | where ResourceProvider == "MICROSOFT.NETWORK"
   | where Category == "AzureFirewallNetworkRule"
   | where msg_s has "Deny"
   | where msg_s has "10.1."
   | project TimeGenerated, msg_s
   | sort by TimeGenerated desc
   | take 20
   ```

</details>

### Cenário 4: Regra de análise do Sentinel dispara mas o playbook de automação não executa

A regra de detecção de força bruta cria incidentes corretamente, mas a automation rule nunca aciona o playbook.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** A managed identity do Logic App não possui a role **Microsoft Sentinel Automation Contributor** no workspace, que é necessária para acionar playbooks a partir de automation rules.

**Correção:**
```bash
# Get the Logic App's managed identity
LOGIC_APP_PRINCIPAL=$(az logic workflow show \
  --resource-group $RG_CORE \
  --name "playbook-capstone-brute-force" \
  --query identity.principalId -o tsv)

# If no managed identity, enable one
az logic workflow identity assign \
  --resource-group $RG_CORE \
  --name "playbook-capstone-brute-force" \
  --system-assigned

# Assign Sentinel Automation Contributor role
az role assignment create \
  --assignee $LOGIC_APP_PRINCIPAL \
  --role "Microsoft Sentinel Automation Contributor" \
  --scope $SENTINEL_WS_ID
```

Verifique também se a condição da automation rule corresponde às propriedades do incidente:
```bash
az sentinel automation-rule show \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --automation-rule-id "capstone-auto-brute-force"
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Em um design de rede hub-spoke, qual é a forma correta de forçar todo o tráfego do spoke pelo Azure Firewall no hub?",
    options: [
      "Criar uma regra NSG na subnet do spoke que redireciona o tráfego",
      "Configurar uma User-Defined Route (UDR) nas subnets do spoke com 0.0.0.0/0 apontando para o IP privado do firewall",
      "Habilitar forced tunneling na configuração de peering da VNet",
      "Configurar as regras DNAT do firewall para interceptar tráfego do spoke"
    ],
    correctIndex: 1,
    explanation: "Uma User-Defined Route (UDR) com a rota padrão (0.0.0.0/0) apontando para o IP privado do Azure Firewall como próximo salto força todo o tráfego das subnets spoke pelo firewall do hub para inspeção. Este é o padrão de fluxo de tráfego hub-spoke padrão."
  },
  {
    question: "O que é necessário para que um playbook Logic App seja acionado por uma automation rule do Sentinel?",
    options: [
      "O Logic App deve ter uma managed identity atribuída pelo sistema com role Security Reader",
      "O Logic App deve usar o trigger de incidente do Microsoft Sentinel e ter a role Sentinel Automation Contributor",
      "O Logic App deve estar no mesmo resource group que o workspace do Sentinel",
      "O Logic App deve ter a role Contributor em toda a assinatura"
    ],
    correctIndex: 1,
    explanation: "Um playbook do Sentinel requer duas coisas: (1) um trigger de incidente do Microsoft Sentinel na definição do Logic App, e (2) a managed identity do Logic App deve ter a role Microsoft Sentinel Automation Contributor no workspace para ser invocado por automation rules."
  },
  {
    question: "Ao configurar PIM com um requisito de authentication context, qual configuração adicional é necessária?",
    options: [
      "Uma política de Conditional Access que visa a referência de classe de authentication context",
      "Uma role personalizada Azure RBAC com a permissão de authentication context",
      "Um certificado do Key Vault vinculado ao fluxo de ativação do PIM",
      "Um grupo do Entra ID com o tipo de claim de authentication context"
    ],
    correctIndex: 0,
    explanation: "Authentication contexts no PIM funcionam exigindo que o usuário que está ativando satisfaça uma política de Conditional Access que visa a referência de classe de authentication context específica (por exemplo, 'c1'). Sem essa política CA, a ativação do PIM falha porque o requisito de contexto não pode ser avaliado."
  },
  {
    question: "Por que uma VM falha ao acessar um Key Vault via private endpoint quando a tabela de rotas força todo o tráfego pelo Azure Firewall?",
    options: [
      "Private endpoints não são compatíveis com Azure Firewall",
      "O firewall precisa de uma regra de rede permitindo tráfego para o IP privado do private endpoint",
      "Private endpoints do Key Vault só funcionam com firewalls tier Premium",
      "A VM deve ter um service endpoint habilitado para Key Vault"
    ],
    correctIndex: 1,
    explanation: "Quando uma UDR força tráfego pelo Azure Firewall, o tráfego para IPs de private endpoint também é roteado pelo firewall. O firewall deve ter uma regra de rede permitindo tráfego da subnet do spoke para o IP do private endpoint (ou o FQDN do privatelink) na porta 443. Sem essa regra, o firewall bloqueia a conexão."
  },
  {
    question: "Qual plano do Azure Defender for Cloud fornece capacidades completas de endpoint detection and response (EDR) via integração com Microsoft Defender for Endpoint?",
    options: [
      "Defender for Servers Plan 1",
      "Defender for Servers Plan 2",
      "Defender for Cloud CSPM",
      "Defender for Key Vault"
    ],
    correctIndex: 1,
    explanation: "O Defender for Servers Plan 2 inclui capacidades completas de EDR via integração com Microsoft Defender for Endpoint, além de avaliação de vulnerabilidades, acesso JIT a VMs, monitoramento de integridade de arquivos e controles de aplicação adaptáveis. O Plan 1 fornece proteção básica de endpoint sem EDR completo, varredura de vulnerabilidades e recursos JIT."
  },
  {
    question: "Na política do API Management AI Gateway, o que a política azure-openai-token-limit faz?",
    options: [
      "Valida que a requisição contém um token OAuth válido",
      "Limita o número total de chamadas de API por janela de tempo",
      "Impõe limites de consumo de tokens por assinatura baseados em tokens estimados de prompt e completion",
      "Criptografa tokens no corpo da requisição para segurança"
    ],
    correctIndex: 2,
    explanation: "A política azure-openai-token-limit impõe rate limiting baseado em tokens especificamente para cargas de trabalho AI/LLM. Ela estima tokens de prompt da requisição, rastreia consumo por assinatura (ou outra chave) e rejeita requisições que excederiam o limite configurado de tokens por minuto. Isso é diferente de rate limiting por contagem de chamadas."
  }
]} />

---

## Limpeza

```bash
# ⚠️ IMPORTANT: Run cleanup promptly to avoid ongoing charges
# Bastion and Azure Firewall incur significant hourly costs

# Delete automation and analytics rules
az sentinel automation-rule delete \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --automation-rule-id "capstone-auto-brute-force" --yes 2>/dev/null

az sentinel alert-rule delete \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --rule-id "capstone-brute-force" --yes 2>/dev/null

az sentinel alert-rule delete \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --rule-id "capstone-priv-esc" --yes 2>/dev/null

# Delete Logic App
az logic workflow delete \
  --resource-group $RG_CORE \
  --name "playbook-capstone-brute-force" --yes 2>/dev/null

# Delete both resource groups (removes all resources)
az group delete --name $RG_SPOKE --yes --no-wait
az group delete --name $RG_CORE --yes --no-wait

# Remove Conditional Access policies (clean up carefully)
# List policies and delete the ones created in this challenge
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --query "value[?contains(displayName,'Capstone')].{Name:displayName, ID:id}" -o table

# Delete each capstone CA policy by ID
# az rest --method DELETE --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/{policy-id}"

echo "🎉 Capstone cleanup complete! Verify in portal that all resources are deleted."
echo "⚠️  Remember to check: Defender for Cloud pricing tiers may remain enabled."
echo "⚠️  PIM eligible assignments should be removed manually if no longer needed."
```

---

## 🎉 Parabéns!

Você completou o **Desafio Capstone SC-500** — a grande final cobrindo todos os domínios do exame:

| Domínio | Tarefas Cobertas |
|--------|--------------|
| Identidade e Acesso | PIM, Conditional Access, MFA, authentication contexts |
| Dados e Armazenamento | Key Vault, private endpoints, criptografia de disco |
| Segurança de Computação | Trusted Launch, secure boot, vTPM, acesso JIT |
| Segurança de Rede | Hub-spoke, Azure Firewall, NSGs, UDRs, peering |
| Postura de Segurança | Defender for Cloud, CSPM, proteção de workload |
| Detecção de Ameaças | Sentinel, regras de análise, playbooks de automação |
| Segurança de IA | API Management, limites de token, content safety |

Você agora está pronto para enfrentar o exame SC-500 com confiança prática! 🚀
