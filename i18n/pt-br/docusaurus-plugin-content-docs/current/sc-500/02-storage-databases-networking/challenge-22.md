---
sidebar_position: 22
title: "Desafio 22: Private Link Services"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 22: Private Link Services

## Habilidades do exame cobertas

- Planejar e implementar Azure Private Link services para serviços customizados
- Configurar Private Link services com Standard Load Balancer
- Gerenciar conexões e aprovações de private endpoints
- Implementar NAT (Network Address Translation) para Private Link
- Configurar visibilidade e auto-aprovação para Private Link services

## Cenário

A equipe de plataforma da Contoso Ltd opera um serviço de API gateway compartilhado que equipes de desenvolvimento internas em múltiplas assinaturas precisam consumir de forma segura. Em vez de expor o serviço pela internet ou gerenciar peering de VNet complexo, a equipe deseja publicar o serviço via Azure Private Link. Isso permite que equipes consumidoras criem private endpoints em suas próprias VNets, acessando o serviço através de endereços IP privados sem que nenhum tráfego trafegue pela internet pública. Você deve configurar o Private Link service, gerenciar aprovações de conexão e configurar o NAT adequadamente.

---

## Pré-requisitos

- Assinatura Azure com função Network Contributor
- Azure CLI instalado e autenticado (`az login`)
- Entendimento do Azure Load Balancer (SKU Standard)
- Entendimento de Private Endpoints (coberto no Desafio 21)

---

## Tarefa 1: Criar a infraestrutura do provedor de serviço

Implante a infraestrutura do serviço de backend incluindo VNet, VMs e Standard Load Balancer.

```bash
# Set variables
RG="rg-sc500-private-link-service"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION

# Create provider virtual network
az network vnet create \
  --name vnet-provider \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16

# Create subnet for backend servers
az network vnet subnet create \
  --name snet-backend \
  --vnet-name vnet-provider \
  --resource-group $RG \
  --address-prefix 10.0.1.0/24

# Create subnet for Private Link service (NAT subnet)
# Disable private link service network policies on this subnet
az network vnet subnet create \
  --name snet-private-link \
  --vnet-name vnet-provider \
  --resource-group $RG \
  --address-prefix 10.0.2.0/24 \
  --disable-private-link-service-network-policies true

# Create a Standard Load Balancer (required for Private Link service)
az network lb create \
  --name lb-api-gateway \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard \
  --frontend-ip-name "fe-api" \
  --backend-pool-name "be-api-servers" \
  --vnet-name vnet-provider \
  --subnet snet-backend

# Create health probe
az network lb probe create \
  --name "probe-api-health" \
  --lb-name lb-api-gateway \
  --resource-group $RG \
  --protocol Tcp \
  --port 443 \
  --interval 15

# Create load balancing rule
az network lb rule create \
  --name "rule-api-https" \
  --lb-name lb-api-gateway \
  --resource-group $RG \
  --frontend-ip-name "fe-api" \
  --backend-pool-name "be-api-servers" \
  --protocol Tcp \
  --frontend-port 443 \
  --backend-port 443 \
  --probe-name "probe-api-health" \
  --enable-tcp-reset true \
  --idle-timeout 15

# Get the frontend IP configuration ID
FE_IP_ID=$(az network lb frontend-ip show \
  --lb-name lb-api-gateway \
  --resource-group $RG \
  --name "fe-api" \
  --query id -o tsv)

echo "Frontend IP Config ID: $FE_IP_ID"
```

---

## Tarefa 2: Criar o Private Link service

Configure o Private Link service vinculado ao load balancer para consumo por outras assinaturas.

```bash
# Create Private Link service
az network private-link-service create \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --location $LOCATION \
  --vnet-name vnet-provider \
  --subnet snet-private-link \
  --lb-frontend-ip-configs $FE_IP_ID \
  --auto-approval "subscription1-id subscription2-id" \
  --visibility "subscription1-id subscription2-id *" \
  --enable-proxy-protocol false

# Get the Private Link service ID (needed by consumers)
PLS_ID=$(az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query id -o tsv)

echo "Private Link Service ID: $PLS_ID"
echo "Share this ID with consuming teams to create private endpoints"

# View Private Link service details
az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query "{Name:name, Alias:alias, State:provisioningState, Visibility:visibility.subscriptions, AutoApproval:autoApproval.subscriptions}"
```

---

## Tarefa 3: Configurar endereços IP NAT para o Private Link service

Configure NAT (Network Address Translation) para mapear IPs de private endpoints dos consumidores para IPs da sub-rede do provedor.

```bash
# List current NAT IP configurations
az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query "ipConfigurations[].{Name:name, PrivateIP:privateIPAddress, Primary:primary, Subnet:subnet.id}"

# Add additional NAT IP for scalability
az network private-link-service update \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --ip-configs "[{\"name\":\"nat-ip-1\",\"privateIPAddress\":\"10.0.2.10\",\"privateIPAllocationMethod\":\"Static\",\"subnet\":{\"id\":\"$(az network vnet subnet show --name snet-private-link --vnet-name vnet-provider --resource-group $RG --query id -o tsv)\"},\"primary\":true},{\"name\":\"nat-ip-2\",\"privateIPAddress\":\"10.0.2.11\",\"privateIPAllocationMethod\":\"Static\",\"subnet\":{\"id\":\"$(az network vnet subnet show --name snet-private-link --vnet-name vnet-provider --resource-group $RG --query id -o tsv)\"},\"primary\":false}]"

# Verify NAT configuration
az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query "ipConfigurations[].{Name:name, PrivateIP:privateIPAddress, Primary:primary}" -o table

echo ""
echo "NAT IP Explanation:"
echo "  When a consumer connects via private endpoint, the source IP"
echo "  seen by the backend servers will be one of the NAT IPs (10.0.2.10/11)"
echo "  rather than the consumer's actual IP. This provides IP isolation."
echo ""
echo "  Each NAT IP can handle ~64,000 TCP connections."
echo "  Add more NAT IPs for higher connection counts."
```

---

## Tarefa 4: Criar um private endpoint do consumidor (simulando outra assinatura)

Simule uma equipe consumidora criando um private endpoint para acessar o Private Link service.

```bash
# Create consumer virtual network (simulating another subscription/team)
az network vnet create \
  --name vnet-consumer-team1 \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 172.16.0.0/16

az network vnet subnet create \
  --name snet-consumer-pe \
  --vnet-name vnet-consumer-team1 \
  --resource-group $RG \
  --address-prefix 172.16.1.0/24

# Create private endpoint connecting to the Private Link service
az network private-endpoint create \
  --name "pe-team1-api-gateway" \
  --resource-group $RG \
  --location $LOCATION \
  --vnet-name vnet-consumer-team1 \
  --subnet snet-consumer-pe \
  --connection-name "pec-team1-api" \
  --private-connection-resource-id $PLS_ID \
  --request-message "Team 1 requesting access to shared API gateway"

# Check the connection status (may need approval)
az network private-endpoint show \
  --name "pe-team1-api-gateway" \
  --resource-group $RG \
  --query "manualPrivateLinkServiceConnections[0].privateLinkServiceConnectionState"

# Verify the private IP assigned to the consumer endpoint
az network private-endpoint show \
  --name "pe-team1-api-gateway" \
  --resource-group $RG \
  --query "networkInterfaces[0].id" -o tsv

# Get the private IP
PE_NIC_ID=$(az network private-endpoint show \
  --name "pe-team1-api-gateway" \
  --resource-group $RG \
  --query "networkInterfaces[0].id" -o tsv)

az network nic show \
  --ids $PE_NIC_ID \
  --query "ipConfigurations[0].privateIPAddress" -o tsv
```

---

## Tarefa 5: Gerenciar conexões do Private Link service (aprovar/rejeitar)

Gerencie solicitações de conexão de private endpoints vindas dos consumidores.

```bash
# List all private endpoint connections on the Private Link service
az network private-link-service connection list \
  --service-name "pls-api-gateway" \
  --resource-group $RG \
  --query "[].{Name:name, Status:privateLinkServiceConnectionState.status, Description:privateLinkServiceConnectionState.description}" -o table

# Approve a pending connection
CONN_NAME=$(az network private-link-service connection list \
  --service-name "pls-api-gateway" \
  --resource-group $RG \
  --query "[?privateLinkServiceConnectionState.status=='Pending'].name" -o tsv | head -1)

if [ -n "$CONN_NAME" ]; then
  az network private-link-service connection update \
    --service-name "pls-api-gateway" \
    --resource-group $RG \
    --name "$CONN_NAME" \
    --connection-status Approved \
    --description "Approved by security team - verified team ownership"
  echo "Connection approved: $CONN_NAME"
fi

# To reject a connection:
# az network private-link-service connection update \
#   --service-name "pls-api-gateway" \
#   --resource-group $RG \
#   --name "connection-name" \
#   --connection-status Rejected \
#   --description "Rejected - unauthorized subscription"

# To delete/remove a connection:
# az network private-link-service connection delete \
#   --service-name "pls-api-gateway" \
#   --resource-group $RG \
#   --name "connection-name"

# Verify final connection status
az network private-link-service connection list \
  --service-name "pls-api-gateway" \
  --resource-group $RG \
  -o table
```

---

## Tarefa 6: Configurar visibilidade e configurações de auto-aprovação

Controle quais assinaturas podem descobrir e se conectar automaticamente ao Private Link service.

```bash
# Update visibility settings (who can see/discover the service)
# "*" means visible to all subscriptions
# Specific subscription IDs restrict visibility
az network private-link-service update \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --visibility "*"

# Configure auto-approval for trusted subscriptions
# Connections from these subscriptions are automatically approved
TRUSTED_SUB_1="$(az account show --query id -o tsv)"

az network private-link-service update \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --auto-approval "$TRUSTED_SUB_1"

# Verify updated settings
az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query "{Name:name, Alias:alias, Visibility:visibility.subscriptions, AutoApproval:autoApproval.subscriptions}" -o json

# Show the Private Link service alias (alternative to resource ID for consumers)
PLS_ALIAS=$(az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query alias -o tsv)

echo ""
echo "Private Link Service Alias: $PLS_ALIAS"
echo "Consumers can use either the resource ID or this alias to create endpoints."
echo "The alias format is: <name>.<random>.<region>.azure.privatelinkservice"

# Enable proxy protocol to get the original consumer IP (optional)
az network private-link-service update \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --enable-proxy-protocol true

echo ""
echo "Proxy Protocol enabled. Backend servers will now receive"
echo "the consumer's original private endpoint IP in the PROXY protocol header."
echo "Backend application must support PROXY protocol v2 to parse this."
```

---

## Quebra & conserta

### Cenário 1: Criação do Private Link service falha — políticas de rede da sub-rede não desabilitadas

A tentativa de criar um Private Link service falha com um erro sobre políticas de rede na sub-rede.

<details>
<summary>Mostrar solução</summary>

```bash
# Check if private link service network policies are disabled on the subnet
az network vnet subnet show \
  --name snet-private-link \
  --vnet-name vnet-provider \
  --resource-group $RG \
  --query "privateLinkServiceNetworkPolicies"

# The value must be "Disabled" for Private Link SERVICE (not endpoint)
az network vnet subnet update \
  --name snet-private-link \
  --vnet-name vnet-provider \
  --resource-group $RG \
  --disable-private-link-service-network-policies true

# Verify
az network vnet subnet show \
  --name snet-private-link \
  --vnet-name vnet-provider \
  --resource-group $RG \
  --query "{Name:name, PLSNetworkPolicies:privateLinkServiceNetworkPolicies}"

# Note: This is different from private ENDPOINT network policies
# --private-endpoint-network-policies (for PE subnets)
# --disable-private-link-service-network-policies (for PLS subnets)
```

</details>

### Cenário 2: Consumidor não consegue descobrir o Private Link service

Uma equipe consumidora em outra assinatura relata que não consegue encontrar o Private Link service ao tentar criar um private endpoint.

<details>
<summary>Mostrar solução</summary>

```bash
# Check visibility settings
az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query "visibility.subscriptions"

# If the consumer's subscription is not in the visibility list, add it
CONSUMER_SUB_ID="<consumer-subscription-id>"

# Update visibility to include the consumer subscription
az network private-link-service update \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --visibility "$CONSUMER_SUB_ID"

# Alternatively, set visibility to all subscriptions
az network private-link-service update \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --visibility "*"

# Provide the consumer with the Private Link service alias or resource ID
az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query "{ResourceId:id, Alias:alias}"
```

</details>

### Cenário 3: Servidores backend veem o IP NAT em vez do IP real do consumidor

Os logs do API gateway mostram todo o tráfego vindo dos endereços IP NAT (10.0.2.10/11) em vez dos IPs reais dos consumidores, tornando a auditoria de logs impossível.

<details>
<summary>Mostrar solução</summary>

```bash
# Enable Proxy Protocol v2 on the Private Link service
az network private-link-service update \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --enable-proxy-protocol true

# After enabling, the backend servers receive the PROXY protocol header
# containing the original consumer private endpoint IP address.

# The backend application/load balancer must be configured to parse
# PROXY protocol v2 headers.

echo "Backend configuration required:"
echo "  - NGINX: set 'proxy_protocol on;' in stream block"
echo "  - HAProxy: set 'accept-proxy' on bind line"
echo "  - Application: Parse the PROXY protocol header to get real client IP"
echo ""
echo "Note: If backends don't support PROXY protocol, enabling this"
echo "will break connectivity as they'll misinterpret the header as data."

# Verify proxy protocol is enabled
az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query "enableProxyProtocol"
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a diferença principal entre um Private Endpoint e um Private Link Service?",
    options: [
      "Private Endpoints são gratuitos; Private Link Services têm cobrança por hora",
      "Um Private Endpoint é uma NIC no lado do consumidor que fornece acesso, enquanto um Private Link Service é um recurso no lado do provedor que expõe um serviço atrás de um Standard Load Balancer",
      "Private Link Services funcionam apenas com serviços PaaS da Microsoft",
      "Private Endpoints requerem peering de VNet; Private Link Services não"
    ],
    correctIndex: 1,
    explanation: "Um Private Endpoint é uma interface de rede na VNet do consumidor que fornece acesso privado. Um Private Link Service é configurado pelo provedor de serviço no seu Standard Load Balancer para expor seu serviço para consumo via Private Endpoints. Eles trabalham juntos: consumidores criam PEs que se conectam ao PLS do provedor."
  },
  {
    question: "Por que 'privateLinkServiceNetworkPolicies' deve ser desabilitado na sub-rede usada para um Private Link service?",
    options: [
      "Para permitir que o Private Link service use alocação dinâmica de IP",
      "Para impedir que NSGs e UDRs bloqueiem o tráfego NAT de origem do Private Link service",
      "Para habilitar a resolução DNS para o serviço",
      "Para permitir que o serviço se comunique com o plano de gerenciamento do Azure"
    ],
    correctIndex: 1,
    explanation: "Desabilitar as políticas de rede do Private Link service na sub-rede impede que NSGs e UDRs interfiram no tráfego NAT de origem que o Private Link service gera. Os IPs NAT atribuídos a partir desta sub-rede precisam de acesso de rede irrestrito para funcionar corretamente."
  },
  {
    question: "Como um provedor de Private Link service pode ver o endereço IP real do private endpoint do consumidor?",
    options: [
      "Verificar o Azure Activity Log",
      "Habilitar o Proxy Protocol v2 no Private Link service",
      "Verificar os NSG flow logs",
      "Consultar a API do Azure Resource Manager"
    ],
    correctIndex: 1,
    explanation: "Por padrão, os servidores backend veem apenas os endereços IP NAT. Habilitar o Proxy Protocol v2 no Private Link service adiciona um cabeçalho a cada conexão TCP contendo o endereço IP real do private endpoint do consumidor. A aplicação backend deve suportar a análise de cabeçalhos Proxy Protocol v2."
  },
  {
    question: "O que a configuração 'auto-approval' em um Private Link service controla?",
    options: [
      "Ela cria automaticamente private endpoints em assinaturas especificadas",
      "Conexões de private endpoints de assinaturas listadas são automaticamente aprovadas sem intervenção manual",
      "Ela aprova todas as conexões independentemente da assinatura de origem",
      "Ela rotaciona automaticamente os endereços IP NAT"
    ],
    correctIndex: 1,
    explanation: "A configuração de auto-aprovação lista IDs de assinaturas cujas solicitações de conexão de private endpoints são automaticamente aprovadas. Conexões de assinaturas não listadas permanecem no estado 'Pending' até serem manualmente aprovadas ou rejeitadas pelo provedor do serviço."
  }
]} />

## Limpeza

```bash
# Delete the resource group and all resources
az group delete --name $RG --yes --no-wait
```
