---
sidebar_position: 18
title: "Desafio 18: Azure Virtual Network Manager"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 18: Azure Virtual Network Manager

## Habilidades do exame cobertas

- Planejar e implementar Azure Virtual Network Manager (AVNM) para governança centralizada de rede
- Configurar network groups para segmentação lógica de VNets
- Criar e implantar regras de security admin que sobrepõem regras de NSG
- Implementar configurações de conectividade (hub-and-spoke, mesh)
- Implantar configurações em regiões de destino

## Cenário

A Contoso Ltd opera um ambiente Azure multi-assinatura com mais de 50 redes virtuais em ambientes de desenvolvimento, homologação e produção. A equipe central de segurança precisa aplicar políticas de segurança de rede consistentes em todas as VNets, independentemente das configurações de NSG dos proprietários de assinaturas individuais. Eles precisam da capacidade de bloquear portas de alto risco globalmente, impor segmentação entre ambientes e manter uma visão centralizada da conectividade de rede. Você deve implementar o Azure Virtual Network Manager para estabelecer regras de security admin que não podem ser sobrescritas por administradores locais.

---

## Pré-requisitos

- Assinatura do Azure com a função Network Contributor (idealmente em um management group)
- Azure CLI instalado e autenticado (`az login`)
- Múltiplas VNets (ou disposição para criá-las para teste)
- Compreensão de conceitos de rede do Azure e NSG

---

## Tarefa 1: Criar instância do Azure Virtual Network Manager

Implante uma instância do AVNM com o escopo e recursos apropriados.

```bash
# Set variables
RG="rg-sc500-avnm"
LOCATION="eastus"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create resource group
az group create --name $RG --location $LOCATION

# Create Azure Virtual Network Manager
az network manager create \
  --name "avnm-contoso-security" \
  --resource-group $RG \
  --location $LOCATION \
  --scope-accesses "SecurityAdmin" "Connectivity" \
  --network-manager-scopes subscriptions="/subscriptions/$SUBSCRIPTION_ID"

# Verify AVNM creation
az network manager show \
  --name "avnm-contoso-security" \
  --resource-group $RG \
  --query "{Name:name, ScopeAccesses:scopeAccesses, Scopes:networkManagerScopes}"
```

---

## Tarefa 2: Criar redes virtuais e network groups

Crie VNets de teste representando diferentes ambientes e organize-as em network groups.

```bash
# Create VNets representing different environments
az network vnet create \
  --name vnet-prod-web \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.1.0.0/16 \
  --subnet-name snet-default --subnet-prefix 10.1.0.0/24 \
  --tags environment=production tier=web

az network vnet create \
  --name vnet-prod-app \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.2.0.0/16 \
  --subnet-name snet-default --subnet-prefix 10.2.0.0/24 \
  --tags environment=production tier=app

az network vnet create \
  --name vnet-dev-web \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.10.0.0/16 \
  --subnet-name snet-default --subnet-prefix 10.10.0.0/24 \
  --tags environment=development tier=web

az network vnet create \
  --name vnet-dev-app \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.11.0.0/16 \
  --subnet-name snet-default --subnet-prefix 10.11.0.0/24 \
  --tags environment=development tier=app

# Create network group for all production VNets
az network manager group create \
  --name "ng-production" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --description "All production virtual networks"

# Create network group for all development VNets
az network manager group create \
  --name "ng-development" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --description "All development virtual networks"

# Create network group for all VNets (global policies)
az network manager group create \
  --name "ng-all-vnets" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --description "All managed virtual networks"

# Add VNets to network groups (static members)
PROD_WEB_ID=$(az network vnet show --name vnet-prod-web --resource-group $RG --query id -o tsv)
PROD_APP_ID=$(az network vnet show --name vnet-prod-app --resource-group $RG --query id -o tsv)
DEV_WEB_ID=$(az network vnet show --name vnet-dev-web --resource-group $RG --query id -o tsv)
DEV_APP_ID=$(az network vnet show --name vnet-dev-app --resource-group $RG --query id -o tsv)

az network manager group static-member create \
  --name "vnet-prod-web" \
  --network-group-name "ng-production" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --resource-id $PROD_WEB_ID

az network manager group static-member create \
  --name "vnet-prod-app" \
  --network-group-name "ng-production" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --resource-id $PROD_APP_ID

az network manager group static-member create \
  --name "vnet-dev-web" \
  --network-group-name "ng-development" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --resource-id $DEV_WEB_ID

az network manager group static-member create \
  --name "vnet-dev-app" \
  --network-group-name "ng-development" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --resource-id $DEV_APP_ID

# Add all VNets to the global group
for VNET_ID in $PROD_WEB_ID $PROD_APP_ID $DEV_WEB_ID $DEV_APP_ID; do
  MEMBER_NAME=$(echo $VNET_ID | awk -F'/' '{print $NF}')
  az network manager group static-member create \
    --name "$MEMBER_NAME" \
    --network-group-name "ng-all-vnets" \
    --network-manager-name "avnm-contoso-security" \
    --resource-group $RG \
    --resource-id $VNET_ID
done
```

---

## Tarefa 3: Criar regras de security admin para bloquear portas de alto risco

Crie uma configuração de security admin que bloqueia portas perigosas em todas as VNets. Essas regras não podem ser sobrescritas por NSGs.

```bash
# Create security admin configuration
az network manager security-admin-config create \
  --name "sac-block-high-risk" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --description "Block high-risk ports across all VNets"

# Create rule collection for the configuration
az network manager security-admin-config rule-collection create \
  --name "rc-global-deny" \
  --configuration-name "sac-block-high-risk" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --applies-to-groups "[{\"networkGroupId\":\"$(az network manager group show --name ng-all-vnets --network-manager-name avnm-contoso-security --resource-group $RG --query id -o tsv)\"}]"

# Rule 1: Block RDP from internet
az network manager security-admin-config rule-collection rule create \
  --name "Deny-RDP-Internet" \
  --rule-collection-name "rc-global-deny" \
  --configuration-name "sac-block-high-risk" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --kind "Custom" \
  --protocol Tcp \
  --direction Inbound \
  --access Deny \
  --priority 100 \
  --source-port-ranges "*" \
  --sources "[{\"addressPrefix\":\"Internet\",\"addressPrefixType\":\"ServiceTag\"}]" \
  --dest-port-ranges "3389" \
  --destinations "[{\"addressPrefix\":\"*\",\"addressPrefixType\":\"IPPrefix\"}]"

# Rule 2: Block SSH from internet
az network manager security-admin-config rule-collection rule create \
  --name "Deny-SSH-Internet" \
  --rule-collection-name "rc-global-deny" \
  --configuration-name "sac-block-high-risk" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --kind "Custom" \
  --protocol Tcp \
  --direction Inbound \
  --access Deny \
  --priority 110 \
  --source-port-ranges "*" \
  --sources "[{\"addressPrefix\":\"Internet\",\"addressPrefixType\":\"ServiceTag\"}]" \
  --dest-port-ranges "22" \
  --destinations "[{\"addressPrefix\":\"*\",\"addressPrefixType\":\"IPPrefix\"}]"

# Rule 3: Block SMB from internet
az network manager security-admin-config rule-collection rule create \
  --name "Deny-SMB-Internet" \
  --rule-collection-name "rc-global-deny" \
  --configuration-name "sac-block-high-risk" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --kind "Custom" \
  --protocol Tcp \
  --direction Inbound \
  --access Deny \
  --priority 120 \
  --source-port-ranges "*" \
  --sources "[{\"addressPrefix\":\"Internet\",\"addressPrefixType\":\"ServiceTag\"}]" \
  --dest-port-ranges "445" \
  --destinations "[{\"addressPrefix\":\"*\",\"addressPrefixType\":\"IPPrefix\"}]"

# Rule 4: Block Telnet from anywhere
az network manager security-admin-config rule-collection rule create \
  --name "Deny-Telnet-All" \
  --rule-collection-name "rc-global-deny" \
  --configuration-name "sac-block-high-risk" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --kind "Custom" \
  --protocol Tcp \
  --direction Inbound \
  --access Deny \
  --priority 130 \
  --source-port-ranges "*" \
  --sources "[{\"addressPrefix\":\"*\",\"addressPrefixType\":\"IPPrefix\"}]" \
  --dest-port-ranges "23" \
  --destinations "[{\"addressPrefix\":\"*\",\"addressPrefixType\":\"IPPrefix\"}]"
```

---

## Tarefa 4: Criar regras de isolamento de ambientes

Crie regras de security admin que impedem a comunicação entre ambientes de produção e desenvolvimento.

```bash
# Create a separate security admin configuration for environment isolation
az network manager security-admin-config create \
  --name "sac-env-isolation" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --description "Isolate production from development environments"

# Create rule collection targeting production VNets
az network manager security-admin-config rule-collection create \
  --name "rc-prod-isolation" \
  --configuration-name "sac-env-isolation" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --applies-to-groups "[{\"networkGroupId\":\"$(az network manager group show --name ng-production --network-manager-name avnm-contoso-security --resource-group $RG --query id -o tsv)\"}]"

# Deny all traffic from development address ranges to production
az network manager security-admin-config rule-collection rule create \
  --name "Deny-Dev-To-Prod" \
  --rule-collection-name "rc-prod-isolation" \
  --configuration-name "sac-env-isolation" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --kind "Custom" \
  --protocol "*" \
  --direction Inbound \
  --access Deny \
  --priority 100 \
  --source-port-ranges "*" \
  --sources "[{\"addressPrefix\":\"10.10.0.0/15\",\"addressPrefixType\":\"IPPrefix\"}]" \
  --dest-port-ranges "*" \
  --destinations "[{\"addressPrefix\":\"*\",\"addressPrefixType\":\"IPPrefix\"}]"
```

---

## Tarefa 5: Implantar configurações de segurança

Implante as configurações de security admin nas regiões de destino.

```bash
# Deploy the high-risk port blocking configuration
az network manager post-commit \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --commit-type "SecurityAdmin" \
  --configuration-ids "$(az network manager security-admin-config show --name sac-block-high-risk --network-manager-name avnm-contoso-security --resource-group $RG --query id -o tsv)" \
  --target-locations $LOCATION

# Deploy the environment isolation configuration
az network manager post-commit \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --commit-type "SecurityAdmin" \
  --configuration-ids "$(az network manager security-admin-config show --name sac-env-isolation --network-manager-name avnm-contoso-security --resource-group $RG --query id -o tsv)" \
  --target-locations $LOCATION

# Check deployment status
az network manager list-deploy-status \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --deployment-types "SecurityAdmin" \
  --regions $LOCATION

# Verify the security admin rules are applied to a VNet
az network manager list-effective-security-admin-rules \
  --resource-group $RG \
  --virtual-network-name vnet-prod-web
```

---

## Tarefa 6: Configurar conectividade (topologia hub-and-spoke)

Crie uma configuração de conectividade para VNets de produção usando topologia hub-and-spoke.

```bash
# Create a hub VNet
az network vnet create \
  --name vnet-hub \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16 \
  --subnet-name snet-default --subnet-prefix 10.0.0.0/24

HUB_VNET_ID=$(az network vnet show --name vnet-hub --resource-group $RG --query id -o tsv)

# Create connectivity configuration (hub-and-spoke)
az network manager connect-config create \
  --name "cc-prod-hub-spoke" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --connectivity-topology "HubAndSpoke" \
  --hub "{\"resourceId\":\"$HUB_VNET_ID\",\"resourceType\":\"Microsoft.Network/virtualNetworks\"}" \
  --applies-to-groups "[{\"networkGroupId\":\"$(az network manager group show --name ng-production --network-manager-name avnm-contoso-security --resource-group $RG --query id -o tsv)\",\"useHubGateway\":\"False\",\"isGlobal\":\"False\",\"groupConnectivity\":\"DirectlyConnected\"}]"

# Deploy connectivity configuration
az network manager post-commit \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --commit-type "Connectivity" \
  --configuration-ids "$(az network manager connect-config show --name cc-prod-hub-spoke --network-manager-name avnm-contoso-security --resource-group $RG --query id -o tsv)" \
  --target-locations $LOCATION

# Verify connectivity deployment
az network manager list-deploy-status \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --deployment-types "Connectivity" \
  --regions $LOCATION
```

---

## Quebra & conserta

### Cenário 1: Regras de security admin não aparecem nas VNets

Após implantar a configuração de security admin, as regras não aparecem ao verificar as regras de segurança efetivas nas VNets da região de destino.

<details>
<summary>Mostrar solução</summary>

```bash
# Check if the deployment was successful
az network manager list-deploy-status \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --deployment-types "SecurityAdmin" \
  --regions $LOCATION

# Verify the VNets are actually members of the network group
az network manager group static-member list \
  --network-group-name "ng-all-vnets" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG -o table

# Ensure the region in the deployment matches the VNet location
# Re-deploy if needed
az network manager post-commit \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --commit-type "SecurityAdmin" \
  --configuration-ids "$(az network manager security-admin-config show --name sac-block-high-risk --network-manager-name avnm-contoso-security --resource-group $RG --query id -o tsv)" \
  --target-locations $LOCATION

# Verify effective rules
az network manager list-effective-security-admin-rules \
  --resource-group $RG \
  --virtual-network-name vnet-prod-web
```

</details>

### Cenário 2: Administrador local ainda consegue permitir RDP apesar da regra de negação

Um proprietário de assinatura adicionou uma regra de NSG permitindo RDP (porta 3389) da internet. Apesar da regra de negação do AVNM, ele afirma que funciona.

<details>
<summary>Mostrar solução</summary>

```bash
# Security admin rules with "Deny" action CANNOT be overridden by NSGs.
# If RDP is working, the security admin rule may not be deployed correctly.

# Verify the rule is deployed
az network manager list-effective-security-admin-rules \
  --resource-group $RG \
  --virtual-network-name vnet-prod-web

# Check rule priority and ensure it's not set to "AlwaysAllow"
# (AlwaysAllow can be overridden; Deny and Allow cannot be overridden by NSGs)
az network manager security-admin-config rule-collection rule show \
  --name "Deny-RDP-Internet" \
  --rule-collection-name "rc-global-deny" \
  --configuration-name "sac-block-high-risk" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --query "{Name:name, Access:access, Direction:direction, DestPorts:destinationPortRanges}"

# If access is "AlwaysAllow" instead of "Deny", update it
# AlwaysAllow means "allow and can be overridden by NSG"
# Deny means "block and cannot be overridden by NSG"
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a diferença fundamental entre as regras de security admin do Azure Virtual Network Manager e as regras de NSG?",
    options: [
      "Regras de security admin são gratuitas enquanto regras de NSG têm cobrança por regra",
      "Regras de security admin são avaliadas primeiro e podem impor políticas que os NSGs não conseguem sobrescrever",
      "NSGs suportam mais protocolos do que regras de security admin",
      "Regras de security admin só funcionam com redes virtuais emparelhadas"
    ],
    correctIndex: 1,
    explanation: "Regras de security admin são avaliadas antes das regras de NSG e podem impor ações de 'Deny' e 'Allow' que as regras locais de NSG não conseguem sobrescrever. Isso permite que equipes centrais de segurança imponham políticas em toda a organização, independentemente do que os proprietários de assinaturas individuais configurem em seus NSGs."
  },
  {
    question: "Qual tipo de acesso em uma regra de security admin permite tráfego mas ainda pode ser sobrescrito por uma regra de negação local do NSG?",
    options: [
      "Allow",
      "AlwaysAllow",
      "Deny",
      "Permit"
    ],
    correctIndex: 1,
    explanation: "O tipo de acesso 'AlwaysAllow' nas regras de security admin permite tráfego no nível administrativo, mas ainda pode ser sobrescrito por regras de negação locais do NSG. O tipo de acesso 'Allow' não pode ser sobrescrito por NSGs. Use 'AlwaysAllow' quando quiser definir uma linha de base que administradores locais possam restringir ainda mais."
  },
  {
    question: "Como as VNets são adicionadas a network groups no Azure Virtual Network Manager?",
    options: [
      "Apenas por meio de associação automática via Azure Policy",
      "Apenas por meio de associação estática manual",
      "Por meio de associação estática (manual) ou associação dinâmica (condições do Azure Policy)",
      "Por meio de registro DNS"
    ],
    correctIndex: 2,
    explanation: "Network groups suportam tanto associação estática (adicionando manualmente IDs de recursos de VNet específicos) quanto associação dinâmica (usando condições do Azure Policy como tags ou convenções de nomenclatura para incluir automaticamente VNets correspondentes). A associação dinâmica é preferida para ambientes de grande escala."
  }
]} />

## Limpeza

```bash
# Remove deployments first (required before deleting configurations)
az network manager post-commit \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --commit-type "SecurityAdmin" \
  --configuration-ids "[]" \
  --target-locations $LOCATION

az network manager post-commit \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --commit-type "Connectivity" \
  --configuration-ids "[]" \
  --target-locations $LOCATION

# Delete the resource group
az group delete --name $RG --yes --no-wait
```
