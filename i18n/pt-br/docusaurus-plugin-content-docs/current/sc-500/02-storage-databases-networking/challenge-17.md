---
sidebar_position: 17
title: "Desafio 17: NSGs e ASGs"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 17: NSGs e ASGs

## Habilidades do exame cobertas

- Planejar e implementar network security groups (NSGs) para filtragem de tráfego
- Configurar application security groups (ASGs) para agrupamento lógico
- Projetar regras de NSG para segmentação de rede
- Implementar NSG flow logs para monitoramento
- Avaliar regras de segurança efetivas

## Cenário

A Contoso Ltd está implantando uma aplicação web de três camadas (servidores web, servidores de aplicação e servidores de banco de dados) no Azure. A equipe de segurança exige segmentação de rede rigorosa onde os servidores web só aceitam tráfego nas portas 80/443 da internet, os servidores de aplicação só se comunicam com servidores web e de banco de dados em portas específicas, e os servidores de banco de dados só aceitam conexões dos servidores de aplicação. Você deve implementar essa segmentação usando NSGs e ASGs para criar um modelo de segurança de rede baseado em funções e fácil de manter.

---

## Pré-requisitos

- Assinatura do Azure com a função Network Contributor
- Azure CLI instalado e autenticado (`az login`)
- Compreensão de redes TCP/IP e números de porta
- Familiaridade com conceitos de Azure Virtual Network

---

## Tarefa 1: Criar a infraestrutura de rede

Implante uma rede virtual com três sub-redes para a aplicação de três camadas.

```bash
# Set variables
RG="rg-sc500-nsg-asg"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION

# Create virtual network with three subnets
az network vnet create \
  --name vnet-contoso-app \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16

# Create web tier subnet
az network vnet subnet create \
  --name snet-web \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --address-prefix 10.0.1.0/24

# Create application tier subnet
az network vnet subnet create \
  --name snet-app \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --address-prefix 10.0.2.0/24

# Create database tier subnet
az network vnet subnet create \
  --name snet-db \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --address-prefix 10.0.3.0/24
```

---

## Tarefa 2: Criar Application Security Groups

Crie ASGs para agrupar logicamente as VMs por sua função na aplicação.

```bash
# Create ASG for web servers
az network asg create \
  --name asg-web-servers \
  --resource-group $RG \
  --location $LOCATION

# Create ASG for application servers
az network asg create \
  --name asg-app-servers \
  --resource-group $RG \
  --location $LOCATION

# Create ASG for database servers
az network asg create \
  --name asg-db-servers \
  --resource-group $RG \
  --location $LOCATION

# Create ASG for management/jump hosts
az network asg create \
  --name asg-management \
  --resource-group $RG \
  --location $LOCATION

# List all ASGs
az network asg list --resource-group $RG -o table
```

---

## Tarefa 3: Criar NSGs com regras de segurança em camadas

Crie NSGs para cada sub-rede implementando o modelo de acesso de menor privilégio.

```bash
# Create NSG for web tier
az network nsg create \
  --name nsg-web-tier \
  --resource-group $RG \
  --location $LOCATION

# Allow HTTP/HTTPS from internet to web servers
az network nsg rule create \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  --name "Allow-HTTP-Inbound" \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes Internet \
  --destination-asgs asg-web-servers \
  --destination-port-ranges 80 443

# Allow health probe from Azure Load Balancer
az network nsg rule create \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  --name "Allow-AzureLB-Inbound" \
  --priority 110 \
  --direction Inbound \
  --access Allow \
  --protocol "*" \
  --source-address-prefixes AzureLoadBalancer \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*"

# Allow SSH from management ASG only
az network nsg rule create \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  --name "Allow-SSH-Management" \
  --priority 200 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-management \
  --destination-asgs asg-web-servers \
  --destination-port-ranges 22

# Deny all other inbound traffic
az network nsg rule create \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  --name "Deny-All-Inbound" \
  --priority 4000 \
  --direction Inbound \
  --access Deny \
  --protocol "*" \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*"

# --- NSG for Application Tier ---
az network nsg create \
  --name nsg-app-tier \
  --resource-group $RG \
  --location $LOCATION

# Allow traffic from web servers to app servers on port 8080
az network nsg rule create \
  --nsg-name nsg-app-tier \
  --resource-group $RG \
  --name "Allow-Web-To-App" \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-web-servers \
  --destination-asgs asg-app-servers \
  --destination-port-ranges 8080 8443

# Allow SSH from management
az network nsg rule create \
  --nsg-name nsg-app-tier \
  --resource-group $RG \
  --name "Allow-SSH-Management" \
  --priority 200 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-management \
  --destination-asgs asg-app-servers \
  --destination-port-ranges 22

# Deny all other inbound
az network nsg rule create \
  --nsg-name nsg-app-tier \
  --resource-group $RG \
  --name "Deny-All-Inbound" \
  --priority 4000 \
  --direction Inbound \
  --access Deny \
  --protocol "*" \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*"

# --- NSG for Database Tier ---
az network nsg create \
  --name nsg-db-tier \
  --resource-group $RG \
  --location $LOCATION

# Allow SQL traffic from app servers only
az network nsg rule create \
  --nsg-name nsg-db-tier \
  --resource-group $RG \
  --name "Allow-App-To-DB" \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-app-servers \
  --destination-asgs asg-db-servers \
  --destination-port-ranges 1433 5432

# Allow SSH from management
az network nsg rule create \
  --nsg-name nsg-db-tier \
  --resource-group $RG \
  --name "Allow-SSH-Management" \
  --priority 200 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-management \
  --destination-asgs asg-db-servers \
  --destination-port-ranges 22

# Deny all other inbound (including from web tier directly)
az network nsg rule create \
  --nsg-name nsg-db-tier \
  --resource-group $RG \
  --name "Deny-All-Inbound" \
  --priority 4000 \
  --direction Inbound \
  --access Deny \
  --protocol "*" \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*"
```

---

## Tarefa 4: Associar NSGs às sub-redes e NICs aos ASGs

Associe os NSGs às sub-redes e crie VMs de teste atribuídas aos ASGs.

```bash
# Associate NSGs with subnets
az network vnet subnet update \
  --name snet-web \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --network-security-group nsg-web-tier

az network vnet subnet update \
  --name snet-app \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --network-security-group nsg-app-tier

az network vnet subnet update \
  --name snet-db \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --network-security-group nsg-db-tier

# Create a web server NIC associated with the web ASG
az network nic create \
  --name nic-web-01 \
  --resource-group $RG \
  --vnet-name vnet-contoso-app \
  --subnet snet-web \
  --application-security-groups asg-web-servers

# Create an app server NIC associated with the app ASG
az network nic create \
  --name nic-app-01 \
  --resource-group $RG \
  --vnet-name vnet-contoso-app \
  --subnet snet-app \
  --application-security-groups asg-app-servers

# Create a database server NIC associated with the db ASG
az network nic create \
  --name nic-db-01 \
  --resource-group $RG \
  --vnet-name vnet-contoso-app \
  --subnet snet-db \
  --application-security-groups asg-db-servers

# Verify NIC ASG associations
az network nic show \
  --name nic-web-01 \
  --resource-group $RG \
  --query "ipConfigurations[0].applicationSecurityGroups[].id" -o tsv
```

---

## Tarefa 5: Verificar regras de segurança efetivas

Valide a configuração de segurança usando a análise de regras de segurança efetivas.

```bash
# List rules in each NSG
echo "=== Web Tier NSG Rules ==="
az network nsg rule list \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  -o table --include-default

echo ""
echo "=== App Tier NSG Rules ==="
az network nsg rule list \
  --nsg-name nsg-app-tier \
  --resource-group $RG \
  -o table --include-default

echo ""
echo "=== DB Tier NSG Rules ==="
az network nsg rule list \
  --nsg-name nsg-db-tier \
  --resource-group $RG \
  -o table --include-default

# Show effective security rules for a specific NIC
# (Requires a VM attached to the NIC for full evaluation)
az network nic list-effective-nsg \
  --name nic-web-01 \
  --resource-group $RG 2>/dev/null || echo "Note: Effective NSG evaluation requires a running VM attached to the NIC"

# Verify subnet-NSG associations
az network vnet subnet show \
  --name snet-web \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --query "{Subnet:name, NSG:networkSecurityGroup.id}"

az network vnet subnet show \
  --name snet-app \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --query "{Subnet:name, NSG:networkSecurityGroup.id}"

az network vnet subnet show \
  --name snet-db \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --query "{Subnet:name, NSG:networkSecurityGroup.id}"
```

---

## Tarefa 6: Implementar regras de NSG de saída para controle de egresso

Adicione regras de saída para controlar qual tráfego pode sair de cada camada.

```bash
# Web tier: Allow outbound only to app tier on 8080/8443
az network nsg rule create \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  --name "Allow-Web-To-App-Outbound" \
  --priority 100 \
  --direction Outbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-web-servers \
  --destination-asgs asg-app-servers \
  --destination-port-ranges 8080 8443

# Web tier: Allow HTTPS to internet for updates
az network nsg rule create \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  --name "Allow-HTTPS-Outbound" \
  --priority 200 \
  --direction Outbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes "10.0.1.0/24" \
  --destination-address-prefixes Internet \
  --destination-port-ranges 443

# Web tier: Deny all other outbound
az network nsg rule create \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  --name "Deny-All-Outbound" \
  --priority 4000 \
  --direction Outbound \
  --access Deny \
  --protocol "*" \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*"

# App tier: Allow outbound only to DB tier on SQL ports
az network nsg rule create \
  --nsg-name nsg-app-tier \
  --resource-group $RG \
  --name "Allow-App-To-DB-Outbound" \
  --priority 100 \
  --direction Outbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-app-servers \
  --destination-asgs asg-db-servers \
  --destination-port-ranges 1433 5432

# DB tier: Deny all internet outbound
az network nsg rule create \
  --nsg-name nsg-db-tier \
  --resource-group $RG \
  --name "Deny-Internet-Outbound" \
  --priority 100 \
  --direction Outbound \
  --access Deny \
  --protocol "*" \
  --source-address-prefixes "*" \
  --destination-address-prefixes Internet \
  --destination-port-ranges "*"
```

---

## Quebre &amp; Conserte

### Cenário 1: Servidores web não conseguem se conectar aos servidores de aplicação

Após implantar as regras de NSG, a camada web não consegue alcançar a camada de aplicação na porta 8080. O NSG da camada web tem a regra de saída, mas o tráfego ainda está bloqueado.

<details>
<summary>Mostrar solução</summary>

```bash
# Check if the app tier NSG has a matching inbound rule
az network nsg rule list \
  --nsg-name nsg-app-tier \
  --resource-group $RG \
  --query "[?direction=='Inbound' && access=='Allow']" -o table

# The issue could be that NSG rules are evaluated per-subnet.
# Both subnets must allow the traffic:
# 1. Web subnet NSG must allow OUTBOUND to app subnet
# 2. App subnet NSG must allow INBOUND from web subnet

# Verify the source/destination in both rules match
# Check if ASGs are correctly associated with NICs
az network nic show --name nic-web-01 --resource-group $RG \
  --query "ipConfigurations[0].applicationSecurityGroups[].id"

az network nic show --name nic-app-01 --resource-group $RG \
  --query "ipConfigurations[0].applicationSecurityGroups[].id"

# If ASGs are not associated, re-associate
az network nic ip-config update \
  --nic-name nic-app-01 \
  --resource-group $RG \
  --name ipconfig1 \
  --application-security-groups asg-app-servers
```

</details>

### Cenário 2: Acesso SSH de gerenciamento bloqueado em todas as camadas

A equipe de operações não consegue fazer SSH em nenhum servidor a partir do jump host. As regras do ASG de gerenciamento existem, mas o acesso é negado.

<details>
<summary>Mostrar solução</summary>

```bash
# The issue is that no NIC is associated with the asg-management ASG
# The jump host NIC must be a member of the management ASG

# Create or update the management NIC
az network nic create \
  --name nic-mgmt-01 \
  --resource-group $RG \
  --vnet-name vnet-contoso-app \
  --subnet snet-web \
  --application-security-groups asg-management

# Or update an existing jump host NIC
# az network nic ip-config update \
#   --nic-name nic-jumphost \
#   --resource-group $RG \
#   --name ipconfig1 \
#   --application-security-groups asg-management

# Also verify the management subnet has outbound rules allowing SSH (port 22)
# to the other subnets
```

</details>

### Cenário 3: Regras padrão estão sobrepondo regras de negação personalizadas

Apesar de ter uma regra "Deny-All-Inbound" na prioridade 4000, algum tráfego inesperado ainda está alcançando as VMs.

<details>
<summary>Mostrar solução</summary>

```bash
# Azure NSG has default rules that cannot be deleted:
# - AllowVNetInBound (priority 65000)
# - AllowAzureLoadBalancerInBound (priority 65001)
# - DenyAllInBound (priority 65500)

# Custom rules with priority 4000 are evaluated BEFORE defaults (lower = higher priority)
# However, default AllowVNetInBound at 65000 won't apply because
# custom Deny-All at 4000 takes precedence.

# The issue is likely VNet-to-VNet traffic matching the AllowVNetInBound default
# but your custom deny rule at 4000 should block this.

# Check if there are rules between 4000 and your allow rules that inadvertently allow traffic
az network nsg rule list \
  --nsg-name nsg-db-tier \
  --resource-group $RG \
  --query "sort_by([?direction=='Inbound'], &priority)[].{Priority:priority, Name:name, Access:access, Source:sourceAddressPrefix, Dest:destinationPortRange}" \
  -o table

# If the deny rule has specific source/destination that doesn't match all traffic,
# update it to use wildcards
az network nsg rule update \
  --nsg-name nsg-db-tier \
  --resource-group $RG \
  --name "Deny-All-Inbound" \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*" \
  --protocol "*"
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a principal vantagem de usar Application Security Groups (ASGs) em vez de regras de NSG baseadas em IP?",
    options: [
      "ASGs oferecem melhor desempenho do que regras baseadas em IP",
      "ASGs permitem agrupamento baseado em funções que se aplica automaticamente a novas VMs atribuídas ao grupo sem alterações nas regras",
      "ASGs suportam mais protocolos do que regras baseadas em IP",
      "ASGs podem filtrar tráfego entre diferentes regiões do Azure"
    ],
    correctIndex: 1,
    explanation: "ASGs permitem agrupar VMs por função na aplicação. Quando uma nova VM é adicionada a um ASG, as regras de NSG existentes se aplicam automaticamente sem modificação. Isso simplifica o gerenciamento em comparação com a atualização de endereços IP nas regras quando a infraestrutura muda."
  },
  {
    question: "Em qual ordem as regras de NSG são avaliadas?",
    options: [
      "Regras padrão primeiro, depois regras personalizadas",
      "Alfabeticamente pelo nome da regra",
      "Por número de prioridade, do menor (mais específico) primeiro; a primeira regra correspondente é aplicada",
      "Regras de saída primeiro, depois regras de entrada"
    ],
    correctIndex: 2,
    explanation: "As regras de NSG são avaliadas em ordem de prioridade, do número mais baixo (maior prioridade) ao número mais alto (menor prioridade). A primeira regra que corresponde ao tráfego é aplicada, e nenhuma regra adicional é avaliada para esse fluxo de tráfego."
  },
  {
    question: "Quando um NSG está associado tanto a uma sub-rede quanto a uma NIC, como o tráfego é avaliado?",
    options: [
      "Apenas o NSG da sub-rede é avaliado",
      "Apenas o NSG da NIC é avaliado",
      "Entrada: NSG da sub-rede primeiro, depois NSG da NIC; Saída: NSG da NIC primeiro, depois NSG da sub-rede",
      "Ambos os NSGs são mesclados e avaliados como um único conjunto de regras"
    ],
    correctIndex: 2,
    explanation: "Para tráfego de entrada, o NSG da sub-rede é avaliado primeiro; se permitido, o NSG da NIC é avaliado em seguida. Para tráfego de saída, o NSG da NIC é avaliado primeiro; se permitido, o NSG da sub-rede é avaliado em seguida. O tráfego deve ser permitido por ambos os NSGs para fluir."
  },
  {
    question: "Qual regra padrão do NSG permite a comunicação entre todos os recursos dentro da mesma rede virtual?",
    options: [
      "AllowInternetOutBound",
      "AllowVNetInBound",
      "AllowAzureLoadBalancerInBound",
      "AllowAllInBound"
    ],
    correctIndex: 1,
    explanation: "A regra padrão AllowVNetInBound (prioridade 65000) permite todo o tráfego de entrada onde tanto a origem quanto o destino estão na service tag VirtualNetwork, habilitando comunicação livre entre recursos na mesma VNet e VNets emparelhadas por padrão."
  }
]} />

## Limpeza

```bash
# Delete the resource group and all resources
az group delete --name $RG --yes --no-wait
```
