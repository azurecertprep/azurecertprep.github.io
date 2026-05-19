---
sidebar_position: 23
title: "Desafio 23: Configuração Avançada do App Service"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 23: configuração avançada do App Service

:::info Tempo e Custo Estimados

**75-90 minutos** | **Custo estimado**: ~$0,30 | **Peso no Exame: 20-25%**

:::

## Cenário

A Contoso Ltd. está reforçando a segurança da sua aplicação web de produção hospedada no Azure App Service. As equipes de segurança e operações exigem mapeamento de domínio personalizado com imposição de TLS, backups automatizados e restrições de acesso em nível de rede. Você deve configurar o App Service para atender aos padrões de produção empresarial, incluindo integração com VNet e conectividade híbrida.

## Habilidades do exame cobertas

- Configurar certificados e TLS para App Service
- Mapear nomes DNS personalizados para App Service
- Configurar backup para App Service
- Configurar definições de rede para App Service
- Configurar integração com VNet
- Configurar restrições de acesso

## Referência sysadmin ↔ Azure

| On-Prem / Tradicional | Equivalente no Azure |
|---|---|
| Let's Encrypt / certificados SSL comerciais | App Service Managed Certificates |
| Registros DNS A/CNAME apontando para servidor web | Mapeamento de domínio personalizado com verificação |
| Scripts de backup com cron + tar | App Service Backup (agendado) |
| Regras de iptables / Windows Firewall | Access Restrictions (permitir/negar IP) |
| Túnel VPN para rede corporativa | VNet Integration + Hybrid Connections |
| Proxy reverso com allowlist de IPs | Access Restrictions + Service Endpoints |
| VPN site-to-site para serviços internos | Hybrid Connections (sem necessidade de VPN) |

## Configuração inicial

```bash
# Variables
RG="rg-az104-challenge23"
LOCATION="eastus"
SUFFIX=$RANDOM

# Create resource group
az group create --name $RG --location $LOCATION
```

## Tarefas

### Tarefa 1: criar App Service com pré-requisitos de domínio personalizado

```bash
# Create App Service plan (Standard required for custom domains + tls)
az appservice plan create \
  --resource-group $RG \
  --name plan-contoso-prod \
  --sku S1 \
  --is-linux

# Create web app
APP_NAME="contoso-prod-$SUFFIX"
az webapp create \
  --resource-group $RG \
  --plan plan-contoso-prod \
  --name $APP_NAME \
  --runtime "NODE:18-lts"

echo "App URL: https://$APP_NAME.azurewebsites.net"
```

### Tarefa 2: configurar domínio personalizado com verificação DNS

:::tip Dica

O Azure requer verificação de propriedade do domínio antes do mapeamento. Você pode usar um registro TXT (verificação asuid) ou um registro CNAME. Para fins de laboratório, criamos a zona DNS no Azure.

:::
```bash
# Create a DNS zone (simulating domain ownership)
az network dns zone create \
  --resource-group $RG \
  --name contoso-lab.com

# Add the domain verification TXT record
VERIFICATION_ID=$(az webapp show \
  --resource-group $RG \
  --name $APP_NAME \
  --query "id" -o tsv)

az network dns record-set txt add-record \
  --resource-group $RG \
  --zone-name contoso-lab.com \
  --record-set-name asuid.www \
  --value $(az webapp show -g $RG -n $APP_NAME \
    --query "hostNameSslStates[0].thumbprint" -o tsv 2>/dev/null || echo "placeholder")

# Add CNAME record pointing to the app
az network dns record-set cname set-record \
  --resource-group $RG \
  --zone-name contoso-lab.com \
  --record-set-name www \
  --cname "$APP_NAME.azurewebsites.net"

# Map the custom domain (requires real DNS delegation in production)
# az webapp config hostname add \
# --resource-group $rg \
# --webapp-name $app_name \
# --hostname www.contoso-lab.com
```

**Passos no Portal:**
1. Navegue até seu App Service > **Custom domains**
2. Clique em **Add custom domain**
3. Insira o nome do domínio (ex.: `www.contoso-lab.com`)
4. Selecione o método de validação (CNAME ou TXT)
5. Adicione os registros DNS necessários no seu registrador
6. Clique em **Validate** e depois em **Add**

### Tarefa 3: vincular um certificado TLS (Managed certificate)

```bash
# Create an App Service managed certificate (free, auto-renewed)
# Note: requires custom domain to be validated first
# az webapp config ssl create \
# --resource-group $rg \
# --name $app_name \
# --hostname www.contoso-lab.com

# Bind the certificate to the custom domain
# az webapp config ssl bind \
# --resource-group $rg \
# --name $app_name \
# --certificate-thumbprint <thumbprint> \
# --ssl-type SNI

# Enforce HTTPS (redirect HTTP to https)
az webapp update \
  --resource-group $RG \
  --name $APP_NAME \
  --https-only true

# Set minimum TLS version
az webapp config set \
  --resource-group $RG \
  --name $APP_NAME \
  --min-tls-version 1.2

# Verify TLS settings
az webapp show -g $RG -n $APP_NAME \
  --query "{HTTPS_Only:httpsOnly, MinTLS:siteConfig.minTlsVersion}" -o table
```

**Passos no Portal:**
1. Navegue até App Service > **TLS/SSL settings**
2. Em **Bindings**, clique em **Add TLS/SSL binding**
3. Selecione o domínio personalizado e escolha **App Service Managed Certificate**
4. Selecione **SNI SSL** como tipo de binding
5. Em **Protocol Settings**, defina a versão mínima de TLS para **1.2**

### Tarefa 4: configurar Backup do App Service

```bash
# Create storage account for backups
STORAGE_NAME="contosobkup$SUFFIX"
az storage account create \
  --resource-group $RG \
  --name $STORAGE_NAME \
  --sku Standard_LRS \
  --location $LOCATION

# Create container for backups
az storage container create \
  --name app-backups \
  --account-name $STORAGE_NAME

# Generate SAS token for the backup container
EXPIRY=$(date -u -d "+365 days" '+%Y-%m-%dT%H:%MZ' 2>/dev/null || date -u -v+365d '+%Y-%m-%dT%H:%MZ')
SAS_TOKEN=$(az storage container generate-sas \
  --account-name $STORAGE_NAME \
  --name app-backups \
  --permissions rwdl \
  --expiry $EXPIRY \
  --output tsv)

CONTAINER_URL="https://$STORAGE_NAME.blob.core.windows.net/app-backups?$SAS_TOKEN"

# Configure scheduled backup (every 24 hours, retain 30 days)
az webapp config backup update \
  --resource-group $RG \
  --webapp-name $APP_NAME \
  --container-url "$CONTAINER_URL" \
  --backup-name "contoso-daily" \
  --frequency 1d \
  --retain-one true \
  --retention 30

# Verify backup configuration
az webapp config backup show \
  --resource-group $RG \
  --webapp-name $APP_NAME
```

**Passos no Portal:**
1. Navegue até App Service > **Backups**
2. Clique em **Configure**
3. Selecione ou crie uma conta de armazenamento e contêiner
4. Defina o agendamento de backup (ex.: a cada 1 dia)
5. Defina o período de retenção (ex.: 30 dias)
6. Opcionalmente inclua banco de dados vinculado
7. Clique em **Save**

### Tarefa 5: configurar integração com VNet

```bash
# Create a VNet for integration
az network vnet create \
  --resource-group $RG \
  --name vnet-contoso \
  --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-webapp-integration \
  --subnet-prefix 10.0.1.0/24

# Enable VNet integration for the web app
az webapp vnet-integration add \
  --resource-group $RG \
  --name $APP_NAME \
  --vnet vnet-contoso \
  --subnet subnet-webapp-integration

# Verify VNet integration
az webapp vnet-integration list \
  --resource-group $RG \
  --name $APP_NAME -o table

# Configure "Route all" to send all outbound traffic through the VNet
az webapp config appsettings set \
  --resource-group $RG \
  --name $APP_NAME \
  --settings WEBSITE_VNET_ROUTE_ALL=1
```

:::tip Dica

A sub-rede de integração deve ser delegada a Microsoft.Web/serverFarms e não deve conter outros recursos. Use uma sub-rede /24 ou /26 dedicada à integração com App Service.

:::
### Tarefa 6: configurar restrições de acesso (Regras de Permitir/Negar ip)

```bash
# Get your current IP
MY_IP=$(curl -s ifconfig.me)

# Allow traffic only from your IP
az webapp config access-restriction add \
  --resource-group $RG \
  --name $APP_NAME \
  --rule-name "AllowAdmin" \
  --priority 100 \
  --ip-address "$MY_IP/32" \
  --action Allow

# Allow traffic from corporate network
az webapp config access-restriction add \
  --resource-group $RG \
  --name $APP_NAME \
  --rule-name "AllowCorporate" \
  --priority 200 \
  --ip-address "203.0.113.0/24" \
  --action Allow

# Deny all other traffic (implicit, but explicit for clarity)
az webapp config access-restriction add \
  --resource-group $RG \
  --name $APP_NAME \
  --rule-name "DenyAll" \
  --priority 300 \
  --ip-address "0.0.0.0/0" \
  --action Deny

# Also restrict the SCM (deployment) site
az webapp config access-restriction add \
  --resource-group $RG \
  --name $APP_NAME \
  --rule-name "AllowAdminSCM" \
  --priority 100 \
  --ip-address "$MY_IP/32" \
  --action Allow \
  --scm-site true

# View all access restrictions
az webapp config access-restriction show \
  --resource-group $RG \
  --name $APP_NAME -o table
```

### Tarefa 7: configurar hybrid connections

:::tip Dica

Hybrid Connections fornecem conectividade do App Service para recursos on-premises sem exigir VPN ou ExpressRoute. Utiliza um agente de relay (Hybrid Connection Manager) instalado on-premises.

:::
**Passos no Portal (Hybrid Connections requerem configuração pelo Portal):**
1. Navegue até App Service > **Networking** > **Hybrid connections**
2. Clique em **Add hybrid connection**
3. Crie uma nova hybrid connection:
   - Nome: `contoso-onprem-sql`
   - Endpoint Host: `sql-server.contoso.local`
   - Endpoint Port: `1433`
4. Baixe e instale o **Hybrid Connection Manager** em um servidor on-premises
5. Registre a hybrid connection no manager

```bash
# Verify hybrid connection namespace exists
az relay namespace list --resource-group $RG -o table
```

## Critérios de sucesso

<SuccessChecklist
  storageKey="az104-challenge-23"
  items={[
    "Plano do App Service criado no tier Standard (S1) ou superior",
    "Registros DNS de domínio personalizado configurados (verificação TXT + CNAME)",
    "Modo somente HTTPS habilitado com TLS mínimo 1.2",
    "Backup agendado configurado para conta de armazenamento (diário, retenção de 30 dias)",
    "Integração com VNet habilitada com sub-rede dedicada",
    "Restrições de acesso configuradas (permitir IPs específicos, negar todos os outros)",
    "Restrições de acesso do site SCM configuradas separadamente",
    "Conceito de Hybrid Connection compreendido"
  ]}
/>
## Cenários de quebrar & consertar

### Cenário a: Backup falha com erro de armazenamento

```bash
# Simulate: revoke the SAS token by regenerating storage keys
az storage account keys renew \
  --resource-group $RG \
  --account-name $STORAGE_NAME \
  --key primary

# Trigger a manual backup: it will fail
az webapp config backup create \
  --resource-group $RG \
  --webapp-name $APP_NAME \
  --container-url "$CONTAINER_URL" \
  --backup-name "manual-test"

# Fix: generate a new SAS token and update the backup configuration
```

### Cenário b: integração com VNet bloqueia saída

```bash
# After enabling website_vnet_route_all, external APIs stop working
# because the VNet has no internet route.
# Diagnosis: check if the VNet has a default route to the internet
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name vnet-contoso \
  --name subnet-webapp-integration \
  --query "routeTable"

# Fix: ensure a NAT gateway or route to internet exists
# Or set website_vnet_route_all=0 for split tunneling
```

### Cenário c: restrições de acesso bloqueiam seu próprio acesso

```bash
# You accidentally denied all traffic including your own IP
# Fix via CLI (still works even when HTTP is blocked):
az webapp config access-restriction remove \
  --resource-group $RG \
  --name $APP_NAME \
  --rule-name "DenyAll"
```

## Verificação de conhecimento

**1. Qual é a diferença entre App Service Managed Certificates e certificados adquiridos?**

<details>
<summary>Mostrar Resposta</summary>

| Recurso | Managed Certificate | Adquirido/Uploaded |
|---------|--------------------|--------------------|
| Custo | Gratuito | Variável |
| Renovação automática | Sim (automática) | Gerenciamento manual |
| Suporte a wildcard | Não | Sim |
| Domínio raiz (naked) | Não (apenas www) | Sim |
| Exportação | Não | Sim |

Managed certificates são gratuitos, renovados automaticamente, mas limitados a domínios padrão (sem wildcards, sem domínios raiz).
</details>

**2. Quais são as diferenças entre VNet Integration e Hybrid Connections?**

<details>
<summary>Mostrar Resposta</summary>

| Recurso | VNet Integration | Hybrid Connections |
|---------|-----------------|-------------------|
| Direção | Saída do app para VNet | Saída do app para endpoint on-prem |
| Requer VPN | Não | Não |
| Agente on-prem | Não requerido | Requer Hybrid Connection Manager |
| Protocolo | Todo TCP | TCP (host:porta específico) |
| Endereços | Acesso a toda VNet/VNets peered | Acesso a um único endpoint |
| Plano necessário | Standard ou superior | Standard ou superior |
</details>

**3. Como as restrições de acesso interagem com o site SCM?**

<details>
<summary>Mostrar Resposta</summary>

Por padrão, o site SCM (Kudu/deployment) herda as restrições de acesso do site principal. Você pode configurá-los separadamente:
- Desmarcando "Use same restrictions as main site" no Portal
- Usando a flag `--scm-site true` no CLI

Isso é importante porque você pode querer restringir o site principal aos usuários, mas permitir acesso ao site SCM a partir dos endereços IP do seu pipeline de CI/CD.
</details>

**4. Quais tiers do plano App Service suportam VNet Integration?**

<details>
<summary>Mostrar Resposta</summary>

- **Regional VNet Integration** (recomendado): Standard, Premium, PremiumV2, PremiumV3, Elastic Premium
- **Gateway-required VNet Integration** (legado): Basic e superiores, mas requer um gateway de VNet
- Os tiers Free e Shared NÃO suportam nenhuma forma de integração com VNet
</details>

## Limpeza

```bash
# Delete all resources
az group delete --name $RG --yes --no-wait

echo "Resources are being deleted in the background."
```

## Recursos de aprendizagem

- [Configurar domínios personalizados do App Service](https://learn.microsoft.com/azure/app-service/app-service-web-tutorial-custom-domain)
- [Certificados TLS/SSL do App Service](https://learn.microsoft.com/azure/app-service/configure-ssl-certificate)
- [Backup e restauração do App Service](https://learn.microsoft.com/azure/app-service/manage-backup)
- [Integração com VNet do App Service](https://learn.microsoft.com/azure/app-service/overview-vnet-integration)
- [Restrições de acesso do App Service](https://learn.microsoft.com/azure/app-service/app-service-ip-restrictions)
- [Azure Hybrid Connections](https://learn.microsoft.com/azure/app-service/app-service-hybrid-connections)
