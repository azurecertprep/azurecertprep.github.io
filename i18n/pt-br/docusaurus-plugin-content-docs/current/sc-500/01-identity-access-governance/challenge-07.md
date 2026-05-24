---
sidebar_position: 7
title: "Desafio 07: Implantação e Configuração do Key Vault"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 07: Implantação e Configuração do Key Vault

## Habilidades do exame cobertas

- Implantar e configurar o Azure Key Vault
- Configurar controle de acesso do Key Vault (RBAC vs políticas de acesso)
- Implementar segurança de rede do Key Vault (firewall, private endpoints)
- Configurar logging de diagnóstico e monitoramento do Key Vault
- Implementar backup e recuperação de desastres do Key Vault
- Configurar soft-delete e purge protection

## Cenário

A Contoso Ltd está centralizando o gerenciamento de segredos em todo o seu ambiente Azure. Atualmente, os segredos estão espalhados em configurações de aplicativos, variáveis de ambiente e arquivos de configuração compartilhados. A equipe de segurança deve implantar uma infraestrutura de Key Vault de nível produção com controle de acesso baseado em RBAC, isolamento de rede via private endpoints, logging de auditoria abrangente e capacidades de recuperação de desastres. A implantação deve estar em conformidade com o mandato de arquitetura zero-trust da empresa.

---

## Pré-requisitos

- Assinatura do Azure com acesso de Contributor
- Azure CLI instalado e autenticado
- Compreensão de redes do Azure (VNets, private endpoints)
- Log Analytics workspace (ou capacidade de criar um)

---

## Tarefa 1: Implantar Key Vault com melhores práticas de segurança

Crie um Key Vault com autorização RBAC, soft-delete, purge protection e SKU premium para chaves protegidas por HSM.

```bash
# Set variables
RG_NAME="rg-contoso-keyvault-lab"
LOCATION="eastus2"
KV_NAME="kv-contoso-prod-$(openssl rand -hex 4)"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Create Key Vault with security features enabled
az keyvault create \
  --name $KV_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --sku premium \
  --enable-rbac-authorization true \
  --enable-soft-delete true \
  --retention-days 90 \
  --enable-purge-protection true \
  --public-network-access Enabled

# Verify Key Vault properties
az keyvault show --name $KV_NAME \
  --query "{name:name, sku:properties.sku.name, rbac:properties.enableRbacAuthorization, softDelete:properties.enableSoftDelete, purgeProtection:properties.enablePurgeProtection, retentionDays:properties.softDeleteRetentionInDays}" \
  -o table

# Tag the Key Vault for governance
az keyvault update --name $KV_NAME \
  --resource-group $RG_NAME \
  --tags Environment=Production Team=Security DataClassification=Confidential
```

## Tarefa 2: Configurar controle de acesso RBAC

Atribua funções RBAC apropriadas ao Key Vault seguindo o princípio de menor privilégio.

```bash
# Get Key Vault resource ID
KV_ID=$(az keyvault show --name $KV_NAME --query id -o tsv)

# Assign Key Vault Administrator to the security team (full management)
SECURITY_ADMIN_ID=$(az ad user show --id "securityadmin@contoso.com" --query id -o tsv 2>/dev/null || echo "placeholder-id")

az role assignment create \
  --assignee-object-id "$SECURITY_ADMIN_ID" \
  --assignee-principal-type User \
  --role "Key Vault Administrator" \
  --scope $KV_ID

# Assign Key Vault Secrets User to the web application's managed identity
# (read-only access to secrets)
# Replace with actual managed identity principal ID
# az role assignment create \
#   --assignee-object-id "$WEBAPP_IDENTITY" \
#   --assignee-principal-type ServicePrincipal \
#   --role "Key Vault Secrets User" \
#   --scope $KV_ID

# Assign Key Vault Crypto User for encryption operations (wrap/unwrap keys)
# az role assignment create \
#   --assignee-object-id "$ENCRYPTION_SVC_IDENTITY" \
#   --assignee-principal-type ServicePrincipal \
#   --role "Key Vault Crypto User" \
#   --scope $KV_ID

# Assign Key Vault Certificates Officer to DevOps team
# (manage certificates but not secrets or keys)
DEVOPS_GROUP_ID=$(az ad group create \
  --display-name "KeyVault-CertificateOfficers" \
  --mail-nickname "kv-cert-officers" \
  --query id -o tsv)

az role assignment create \
  --assignee-object-id $DEVOPS_GROUP_ID \
  --assignee-principal-type Group \
  --role "Key Vault Certificates Officer" \
  --scope $KV_ID

# List all role assignments on the Key Vault
az role assignment list --scope $KV_ID \
  --query "[].{principal:principalName, role:roleDefinitionName}" -o table
```

## Tarefa 3: Configurar firewall e regras de rede do Key Vault

Restrinja o acesso ao Key Vault a redes específicas e configure service endpoints.

```bash
# Create a VNet and subnet for the application tier
az network vnet create \
  --name "vnet-contoso-lab" \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --address-prefix "10.0.0.0/16" \
  --subnet-name "snet-app" \
  --subnet-prefixes "10.0.1.0/24"

# Enable Key Vault service endpoint on the subnet
az network vnet subnet update \
  --name "snet-app" \
  --vnet-name "vnet-contoso-lab" \
  --resource-group $RG_NAME \
  --service-endpoints "Microsoft.KeyVault"

# Get the subnet ID
SUBNET_ID=$(az network vnet subnet show \
  --name "snet-app" \
  --vnet-name "vnet-contoso-lab" \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Configure Key Vault firewall - deny by default, allow specific networks
az keyvault update --name $KV_NAME \
  --resource-group $RG_NAME \
  --default-action Deny \
  --bypass AzureServices

# Add the application subnet to allowed networks
az keyvault network-rule add \
  --name $KV_NAME \
  --resource-group $RG_NAME \
  --subnet $SUBNET_ID

# Add specific IP addresses for admin access
az keyvault network-rule add \
  --name $KV_NAME \
  --resource-group $RG_NAME \
  --ip-address "203.0.113.50/32"

# Verify network rules
az keyvault network-rule list --name $KV_NAME \
  --query "{defaultAction:defaultAction, bypass:bypass, ipRules:ipRules[].value, virtualNetworkRules:virtualNetworkRules[].id}" -o json
```

## Tarefa 4: Configurar private endpoint para o Key Vault

Implante um private endpoint para conectividade totalmente privada ao Key Vault.

```bash
# Create a subnet for private endpoints
az network vnet subnet create \
  --name "snet-private-endpoints" \
  --vnet-name "vnet-contoso-lab" \
  --resource-group $RG_NAME \
  --address-prefixes "10.0.2.0/24"

# Disable network policies on the PE subnet
az network vnet subnet update \
  --name "snet-private-endpoints" \
  --vnet-name "vnet-contoso-lab" \
  --resource-group $RG_NAME \
  --private-endpoint-network-policies Disabled

# Create private endpoint for Key Vault
az network private-endpoint create \
  --name "pe-$KV_NAME" \
  --resource-group $RG_NAME \
  --vnet-name "vnet-contoso-lab" \
  --subnet "snet-private-endpoints" \
  --private-connection-resource-id $KV_ID \
  --group-id vault \
  --connection-name "pec-keyvault"

# Create Private DNS Zone for Key Vault
az network private-dns zone create \
  --name "privatelink.vaultcore.azure.net" \
  --resource-group $RG_NAME

# Link DNS zone to VNet
az network private-dns link vnet create \
  --name "link-keyvault-dns" \
  --resource-group $RG_NAME \
  --zone-name "privatelink.vaultcore.azure.net" \
  --virtual-network "vnet-contoso-lab" \
  --registration-enabled false

# Create DNS records for private endpoint
PE_NIC_ID=$(az network private-endpoint show \
  --name "pe-$KV_NAME" \
  --resource-group $RG_NAME \
  --query "networkInterfaces[0].id" -o tsv)

PE_IP=$(az network nic show --ids $PE_NIC_ID \
  --query "ipConfigurations[0].privateIPAddress" -o tsv)

az network private-dns record-set a add-record \
  --zone-name "privatelink.vaultcore.azure.net" \
  --resource-group $RG_NAME \
  --record-set-name $KV_NAME \
  --ipv4-address $PE_IP

# Disable public access now that private endpoint is configured
az keyvault update --name $KV_NAME \
  --resource-group $RG_NAME \
  --public-network-access Disabled

# Verify private endpoint
az network private-endpoint show \
  --name "pe-$KV_NAME" \
  --resource-group $RG_NAME \
  --query "{state:privateLinkServiceConnections[0].privateLinkServiceConnectionState.status, ip:customDnsConfigs[0].ipAddresses[0]}" -o json
```

## Tarefa 5: Configurar logging de diagnóstico e monitoramento

Habilite logging de auditoria abrangente para operações do Key Vault e configure alertas.

```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --workspace-name "law-contoso-security" \
  --resource-group $RG_NAME \
  --location $LOCATION

LAW_ID=$(az monitor log-analytics workspace show \
  --workspace-name "law-contoso-security" \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Enable diagnostic settings for Key Vault
az monitor diagnostic-settings create \
  --name "keyvault-audit-logs" \
  --resource $KV_ID \
  --workspace $LAW_ID \
  --logs '[
    {"category": "AuditEvent", "enabled": true, "retentionPolicy": {"enabled": true, "days": 365}},
    {"category": "AzurePolicyEvaluationDetails", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}}
  ]' \
  --metrics '[
    {"category": "AllMetrics", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}}
  ]'

# Create an alert for unauthorized access attempts
az monitor metrics alert create \
  --name "keyvault-unauthorized-access" \
  --resource-group $RG_NAME \
  --scopes $KV_ID \
  --condition "total ServiceApiResult > 0 where StatusCode includes 403" \
  --description "Alert on Key Vault 403 Forbidden responses" \
  --severity 2 \
  --window-size 5m \
  --evaluation-frequency 1m

# Create an alert for Key Vault availability drops
az monitor metrics alert create \
  --name "keyvault-availability" \
  --resource-group $RG_NAME \
  --scopes $KV_ID \
  --condition "avg Availability < 99.9" \
  --description "Alert when Key Vault availability drops below 99.9%" \
  --severity 1 \
  --window-size 15m \
  --evaluation-frequency 5m

# Verify diagnostic settings
az monitor diagnostic-settings show \
  --name "keyvault-audit-logs" \
  --resource $KV_ID
```

## Tarefa 6: Configurar backup e recuperação de desastres do Key Vault

Configure procedimentos de backup e prepare-se para cenários de geo-replicação.

```bash
# Create a secondary Key Vault in a paired region for DR
KV_DR_NAME="kv-contoso-dr-$(openssl rand -hex 4)"
az keyvault create \
  --name $KV_DR_NAME \
  --resource-group $RG_NAME \
  --location "centralus" \
  --sku premium \
  --enable-rbac-authorization true \
  --enable-soft-delete true \
  --retention-days 90 \
  --enable-purge-protection true

# Backup a secret from primary vault
az keyvault secret backup \
  --vault-name $KV_NAME \
  --name "DatabaseConnectionString" \
  --file "secret-backup.blob" 2>/dev/null || echo "Secret not yet created - will backup after creation"

# Backup a key from primary vault
# az keyvault key backup --vault-name $KV_NAME --name "encryption-key" --file "key-backup.blob"

# To restore to the DR vault (only works if primary is unavailable/deleted):
# az keyvault secret restore --vault-name $KV_DR_NAME --file "secret-backup.blob"
# az keyvault key restore --vault-name $KV_DR_NAME --file "key-backup.blob"

# List all items for backup inventory
echo "=== Secrets ==="
az keyvault secret list --vault-name $KV_NAME --query "[].{name:name, enabled:attributes.enabled}" -o table
echo "=== Keys ==="
az keyvault key list --vault-name $KV_NAME --query "[].{name:name, enabled:attributes.enabled}" -o table
echo "=== Certificates ==="
az keyvault certificate list --vault-name $KV_NAME --query "[].{name:name, enabled:attributes.enabled}" -o table

# Clean up backup files
rm -f secret-backup.blob key-backup.blob
```

---

## Quebra & conserta

### Cenário 1: Aplicativo não consegue acessar o Key Vault após configuração do firewall

Após habilitar o firewall do Key Vault, um App Service que anteriormente acessava segredos com sucesso agora recebe erros "ForbiddenByFirewall".

<details>
<summary>Mostrar solução</summary>

```bash
# Check current firewall rules
az keyvault network-rule list --name $KV_NAME

# The App Service needs to be in an allowed network
# Option 1: Enable "Allow trusted Microsoft services" (if bypass is not set)
az keyvault update --name $KV_NAME \
  --resource-group $RG_NAME \
  --bypass AzureServices

# Option 2: Add the App Service's outbound IPs to the firewall
WEBAPP_IPS=$(az webapp show --name $WEB_APP_NAME --resource-group $RG_NAME \
  --query "outboundIpAddresses" -o tsv 2>/dev/null)

# Add each IP to the firewall
for IP in $(echo $WEBAPP_IPS | tr ',' '\n'); do
  az keyvault network-rule add --name $KV_NAME --ip-address "$IP/32"
done

# Option 3 (preferred): Use VNet integration + service endpoint
# az webapp vnet-integration add --name $WEB_APP_NAME \
#   --resource-group $RG_NAME \
#   --vnet "vnet-contoso-lab" \
#   --subnet "snet-app"

# Option 4 (best): Use private endpoint (configured in Task 4)
# Ensure the App Service is VNet-integrated to reach the private endpoint

# Verify the issue is resolved
az keyvault secret list --vault-name $KV_NAME --query "[].name" -o tsv
```

</details>

### Cenário 2: Não é possível excluir o Key Vault devido ao purge protection

Um Key Vault de teste com purge protection habilitado precisa ser removido, mas `az keyvault delete` o deixa em estado soft-deleted e `az keyvault purge` falha.

<details>
<summary>Mostrar solução</summary>

```bash
# Check if the vault is soft-deleted
az keyvault list-deleted --query "[?name=='$KV_NAME']" -o table

# Purge protection prevents immediate purging
# If purge protection is enabled, you CANNOT purge before the retention period expires

# Check retention period
az keyvault show-deleted --name $KV_NAME \
  --query "{scheduledPurgeDate:properties.scheduledPurgeDate, deletionDate:properties.deletionDate}" -o json

# If purge protection is NOT enabled, you can purge immediately:
# az keyvault purge --name $KV_NAME

# If purge protection IS enabled (our case), you must wait for retention period
# For testing, the only option is to recover and reuse it:
az keyvault recover --name $KV_NAME

# PREVENTION: For test/dev environments, create Key Vaults WITHOUT purge protection:
az keyvault create \
  --name "kv-contoso-test-$(openssl rand -hex 4)" \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --enable-rbac-authorization true \
  --enable-soft-delete true \
  --retention-days 7 \
  --no-wait

# Note: Once purge protection is enabled, it CANNOT be disabled
# Always use shorter retention-days (minimum 7) for non-production vaults
```

</details>

### Cenário 3: Atribuição de função RBAC não está fazendo efeito

Um desenvolvedor recebeu a função "Key Vault Secrets User" mas ainda recebe "Forbidden" ao tentar ler segredos. A atribuição foi feita há 5 minutos.

<details>
<summary>Mostrar solução</summary>

```bash
# Verify the role assignment exists and is at the correct scope
DEV_USER_ID=$(az ad user show --id "developer@contoso.com" --query id -o tsv)

az role assignment list \
  --assignee $DEV_USER_ID \
  --scope $KV_ID \
  --query "[].{role:roleDefinitionName, scope:scope}" -o table

# Common issues:
# 1. Assignment is at wrong scope (subscription level won't inherit if denied at vault)
# 2. There's a deny assignment blocking access
az role assignment list --assignee $DEV_USER_ID --all --include-inherited -o table

# 3. The Key Vault is still using access policies, not RBAC
az keyvault show --name $KV_NAME --query "properties.enableRbacAuthorization" -o tsv

# Fix: If RBAC authorization is not enabled, enable it
az keyvault update --name $KV_NAME --enable-rbac-authorization true

# 4. RBAC propagation delay (can take up to 5-10 minutes)
# Wait and retry

# 5. User needs to get a fresh token
# Have the user run: az account clear && az login

# Verify access works
az keyvault secret list --vault-name $KV_NAME --query "[].name" -o tsv
```

</details>

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual SKU do Key Vault é necessário para usar chaves protegidas por HSM?",
    options: [
      "SKU Standard com chaves protegidas por software",
      "SKU Premium com chaves protegidas por HSM",
      "Tanto Standard quanto Premium suportam chaves HSM",
      "Managed HSM é a única opção para chaves protegidas por HSM"
    ],
    correctIndex: 1,
    explanation: "O SKU Premium suporta chaves protegidas por HSM (RSA-HSM, EC-HSM) onde o material da chave é processado dentro de um HSM validado FIPS 140-2 Level 2. O SKU Standard suporta apenas chaves protegidas por software. O Managed HSM é um serviço separado para conformidade FIPS 140-2 Level 3."
  },
  {
    question: "Qual é o efeito de habilitar purge protection em um Azure Key Vault?",
    options: [
      "Itens soft-deleted podem ser recuperados mas nunca permanentemente purgados até que o período de retenção expire",
      "O Key Vault não pode ser excluído",
      "Apenas Global Administrators podem excluir segredos",
      "Um backup é criado automaticamente antes de qualquer exclusão"
    ],
    correctIndex: 0,
    explanation: "O purge protection impede a exclusão permanente de itens soft-deleted do vault e do próprio vault até que o período de retenção expire. Isso protege contra insiders maliciosos ou contas comprometidas que destruam permanentemente material criptográfico. Uma vez habilitado, não pode ser desabilitado."
  },
  {
    question: "A Contoso quer garantir que o acesso ao Key Vault só seja possível a partir da VNet do Azure deles. Qual combinação oferece o isolamento de rede mais forte?",
    options: [
      "Firewall do Key Vault com regras de permissão de IP",
      "Private endpoint com acesso de rede pública desabilitado",
      "Service endpoints com deny padrão",
      "Network Security Group na subnet do Key Vault"
    ],
    correctIndex: 1,
    explanation: "Um private endpoint atribui um IP privado da VNet ao Key Vault, e desabilitar o acesso de rede pública garante que todo o tráfego flua pela rede privada. Isso é mais forte que service endpoints (que ainda transitam pelo backbone da Microsoft) e elimina qualquer exposição à internet pública."
  },
  {
    question: "Ao migrar o Key Vault do modelo de políticas de acesso para autorização RBAC, o que acontece com as políticas de acesso existentes?",
    options: [
      "As políticas de acesso são automaticamente convertidas em atribuições de função RBAC",
      "As políticas de acesso são ignoradas quando RBAC é habilitado; novas atribuições de função devem ser criadas",
      "Tanto as políticas de acesso quanto o RBAC são avaliados simultaneamente",
      "A migração falha se existirem políticas de acesso"
    ],
    correctIndex: 1,
    explanation: "Quando a autorização RBAC é habilitada, as políticas de acesso existentes são completamente ignoradas (não excluídas, mas não avaliadas). Todo o acesso deve ser concedido através de atribuições de função RBAC. Os administradores devem criar atribuições RBAC equivalentes antes ou imediatamente após habilitar o RBAC para evitar interrupção de acesso."
  }
]} />

## Limpeza

```bash
# Delete the resource group (this removes all resources)
az group delete --name $RG_NAME --yes --no-wait

# Note: Key Vaults with purge protection will remain in soft-deleted state
# They will be automatically purged after the retention period (90 days)

# To check soft-deleted vaults:
# az keyvault list-deleted --query "[].name" -o tsv
```
