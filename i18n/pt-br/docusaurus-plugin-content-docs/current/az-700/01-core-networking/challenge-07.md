---
sidebar_position: 7
title: "Challenge 07: Azure Virtual Network Manager"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 07: Azure Virtual Network Manager

:::info Tempo e custo estimados

**90-120 minutos** | **~$0 (AVNM é gratuito; emparelhamentos criados incorrem custos padrão de emparelhamento de VNet)** | **Peso no exame: 10-15%**

:::

## Cenário

A equipe de rede da Contoso gerencia mais de 50 VNets em várias assinaturas e regiões. Criar manualmente emparelhamentos, tabelas de rotas e regras de segurança para cada nova VNet é insustentável. Eles decidem implementar o Azure Virtual Network Manager (AVNM) para gerenciar centralmente a conectividade (topologias hub-spoke e malha) e impor regras de administração de segurança em todas as VNets a partir de um único plano de controle.

## Objetivos de aprendizagem

Após concluir este desafio, você será capaz de:

- Criar uma instância do Azure Virtual Network Manager com escopo e acesso definidos
- Organizar VNets em grupos de rede usando associação estática e dinâmica
- Criar configurações de conectividade para topologias hub-spoke e malha
- Criar regras de administração de segurança que são aplicadas antes dos NSGs
- Implantar (confirmar) configurações em regiões de destino
- Verificar a conectividade efetiva e as regras de administração de segurança nas VNets

## Pré-requisitos

- Uma assinatura do Azure com acesso de Contributor (Owner recomendado para atribuições de política)
- Azure CLI instalado e autenticado (`az login`)
- A extensão CLI `virtual-network-manager` (`az extension add -n virtual-network-manager`)
- Um grupo de recursos para este laboratório (ou permissão para criar um)

---

## Tarefa 1: Criar uma instância do Virtual Network Manager

Crie a instância do AVNM com escopo e tipos de acesso apropriados. O escopo define quais assinaturas ou grupos de gerenciamento o AVNM pode gerenciar, e os tipos de acesso determinam quais configurações você pode criar.

### Etapa 1: Criar o grupo de recursos

```bash
az group create \
    --name rg-avnm-lab \
    --location eastus2
```

### Etapa 2: Criar a instância do Virtual Network Manager

```bash
az network manager create \
    --name avnm-contoso \
    --resource-group rg-avnm-lab \
    --location eastus2 \
    --scope-accesses "Connectivity" "SecurityAdmin" \
    --network-manager-scopes subscriptions="/subscriptions/<subscriptionID>"
```

Substitua `<subscriptionID>` pelo ID da sua assinatura.

Parâmetros principais:

| Parâmetro | Finalidade |
|-----------|---------|
| `--scope-accesses` | Define os tipos de configuração: `Connectivity`, `SecurityAdmin` ou ambos |
| `--network-manager-scopes` | Define o limite de gerenciamento (assinatura ou grupo de gerenciamento) |

:::tip Nota para o exame

O escopo determina quais VNets o AVNM pode gerenciar. Você pode definir o escopo para um grupo de gerenciamento para cobrir várias assinaturas. Uma única instância do AVNM pode ter os acessos Connectivity e SecurityAdmin habilitados simultaneamente.

:::

### Etapa 3: Verificar se a instância foi criada

```bash
az network manager show \
    --name avnm-contoso \
    --resource-group rg-avnm-lab \
    --output table
```

---

## Tarefa 2: Criar VNets e definir grupos de rede

Grupos de rede são contêineres lógicos para VNets. Membros podem ser adicionados estaticamente (manual) ou dinamicamente (usando condições do Azure Policy).

### Etapa 1: Criar a VNet hub

```bash
az network vnet create \
    --name vnet-hub \
    --resource-group rg-avnm-lab \
    --location eastus2 \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name default \
    --subnet-prefixes 10.0.0.0/24 \
    --tags Environment=Hub
```

### Etapa 2: Criar VNets spoke

```bash
az network vnet create \
    --name vnet-spoke-01 \
    --resource-group rg-avnm-lab \
    --location eastus2 \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name default \
    --subnet-prefixes 10.1.0.0/24 \
    --tags Environment=Prod Department=Engineering

az network vnet create \
    --name vnet-spoke-02 \
    --resource-group rg-avnm-lab \
    --location eastus2 \
    --address-prefixes 10.2.0.0/16 \
    --subnet-name default \
    --subnet-prefixes 10.2.0.0/24 \
    --tags Environment=Prod Department=Finance

az network vnet create \
    --name vnet-spoke-03 \
    --resource-group rg-avnm-lab \
    --location eastus2 \
    --address-prefixes 10.3.0.0/16 \
    --subnet-name default \
    --subnet-prefixes 10.3.0.0/24 \
    --tags Environment=Dev Department=Engineering
```

### Etapa 3: Criar um grupo de rede para VNets spoke

```bash
az network manager group create \
    --name ng-spokes-prod \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --description "Production spoke virtual networks"
```

### Etapa 4: Adicionar membros estáticos ao grupo de rede

```bash
az network manager group static-member create \
    --name vnet-spoke-01 \
    --network-group ng-spokes-prod \
    --network-manager avnm-contoso \
    --resource-group rg-avnm-lab \
    --resource-id "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/virtualNetworks/vnet-spoke-01"

az network manager group static-member create \
    --name vnet-spoke-02 \
    --network-group ng-spokes-prod \
    --network-manager avnm-contoso \
    --resource-group rg-avnm-lab \
    --resource-id "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/virtualNetworks/vnet-spoke-02"
```

### Etapa 5: (Opcional) Criar associação dinâmica com Azure Policy

A associação dinâmica usa o Azure Policy para adicionar automaticamente VNets que correspondam a determinadas condições. Esta política adiciona todas as VNets marcadas com `Environment=Prod`:

```bash
az policy definition create \
    --name "avnm-prod-vnets" \
    --description "Add Prod VNets to AVNM network group" \
    --rules "{\"if\":{\"allOf\":[{\"field\":\"type\",\"equals\":\"Microsoft.Network/virtualNetworks\"},{\"field\":\"tags['Environment']\",\"equals\":\"Prod\"}]},\"then\":{\"effect\":\"addToNetworkGroup\",\"details\":{\"networkGroupId\":\"/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/networkManagers/avnm-contoso/networkGroups/ng-spokes-prod\"}}}" \
    --mode "Microsoft.Network.Data"
```

Atribua a política ao escopo da assinatura:

```bash
az policy assignment create \
    --name "avnm-prod-vnets-assignment" \
    --policy "avnm-prod-vnets" \
    --scope "/subscriptions/<subscriptionID>"
```

:::tip Nota para o exame

A associação dinâmica usa o modo de política `Microsoft.Network.Data` e o efeito `addToNetworkGroup`. As políticas devem ser definidas no escopo ou acima de onde se aplicam. Associação estática e dinâmica podem coexistir no mesmo grupo de rede.

:::

---

## Tarefa 3: Criar uma configuração de conectividade hub-spoke

Uma configuração de conectividade define como as VNets em um grupo de rede se conectam. Para hub-spoke, o AVNM cria automaticamente emparelhamentos entre o hub e cada spoke.

### Etapa 1: Criar a configuração de conectividade hub-spoke

```bash
az network manager connect-config create \
    --configuration-name "cc-hub-spoke-prod" \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --connectivity-topology "HubAndSpoke" \
    --hub '[{"resourceId": "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/virtualNetworks/vnet-hub", "resourceType": "Microsoft.Network/virtualNetworks"}]' \
    --applies-to-groups '[{"networkGroupId": "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/networkManagers/avnm-contoso/networkGroups/ng-spokes-prod", "groupConnectivity": "DirectlyConnected", "useHubGateway": "False", "isGlobal": "False"}]' \
    --delete-existing-peering True \
    --description "Hub-spoke topology for production spokes with direct spoke connectivity"
```

Parâmetros principais explicados:

| Parâmetro | Finalidade |
|-----------|---------|
| `--connectivity-topology` | `HubAndSpoke` ou `Mesh` |
| `--hub` | Especifica a VNet hub (formato JSON) |
| `--applies-to-groups` | Grupos de rede que atuam como spokes |
| `groupConnectivity: DirectlyConnected` | Habilita comunicação spoke-a-spoke |
| `--delete-existing-peering` | Remove emparelhamentos criados manualmente que conflitam |

### Etapa 2: Verificar a configuração

```bash
az network manager connect-config show \
    --configuration-name "cc-hub-spoke-prod" \
    --name avnm-contoso \
    --resource-group rg-avnm-lab
```

:::tip Nota para o exame

Definir `groupConnectivity` como `DirectlyConnected` permite que as VNets spoke se comuniquem diretamente sem rotear pelo hub. Sem isso, os spokes só podem alcançar o hub. A opção `useHubGateway` permite que os spokes usem um gateway VPN/ExpressRoute implantado na VNet hub.

:::

---

## Tarefa 4: Criar uma configuração de administração de segurança

As regras de administração de segurança são avaliadas antes dos NSGs e não podem ser substituídas por administradores de rede no nível da VNet. Isso as torna ideais para linhas de base de segurança em toda a organização.

### Etapa 1: Criar a configuração de administração de segurança

```bash
az network manager security-admin-config create \
    --configuration-name "sac-baseline" \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --description "Baseline security rules for all production VNets"
```

### Etapa 2: Criar uma coleção de regras

Uma coleção de regras agrupa regras relacionadas e é direcionada a grupos de rede específicos:

```bash
az network manager security-admin-config rule-collection create \
    --configuration-name "sac-baseline" \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --rule-collection-name "rc-deny-dangerous-inbound" \
    --applies-to-groups '[{"networkGroupId": "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/networkManagers/avnm-contoso/networkGroups/ng-spokes-prod"}]' \
    --description "Block dangerous inbound protocols from the internet"
```

### Etapa 3: Criar uma regra para negar SSH de entrada da internet

```bash
az network manager security-admin-config rule-collection rule create \
    --configuration-name "sac-baseline" \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --rule-collection-name "rc-deny-dangerous-inbound" \
    --rule-name "deny-ssh-from-internet" \
    --kind "Custom" \
    --protocol "Tcp" \
    --access "Deny" \
    --priority 100 \
    --direction "Inbound" \
    --sources address-prefix="*" address-prefix-type="IPPrefix" \
    --destinations address-prefix="*" address-prefix-type="IPPrefix" \
    --dest-port-ranges 22 \
    --description "Block SSH from all external sources"
```

### Etapa 4: Criar uma regra para negar RDP de entrada da internet

```bash
az network manager security-admin-config rule-collection rule create \
    --configuration-name "sac-baseline" \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --rule-collection-name "rc-deny-dangerous-inbound" \
    --rule-name "deny-rdp-from-internet" \
    --kind "Custom" \
    --protocol "Tcp" \
    --access "Deny" \
    --priority 110 \
    --direction "Inbound" \
    --sources address-prefix="*" address-prefix-type="IPPrefix" \
    --destinations address-prefix="*" address-prefix-type="IPPrefix" \
    --dest-port-ranges 3389 \
    --description "Block RDP from all external sources"
```

### Etapa 5: Criar uma regra Always Allow para monitoramento interno

```bash
az network manager security-admin-config rule-collection rule create \
    --configuration-name "sac-baseline" \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --rule-collection-name "rc-deny-dangerous-inbound" \
    --rule-name "always-allow-monitoring" \
    --kind "Custom" \
    --protocol "Tcp" \
    --access "AlwaysAllow" \
    --priority 50 \
    --direction "Inbound" \
    --sources address-prefix="10.0.0.0/8" address-prefix-type="IPPrefix" \
    --destinations address-prefix="*" address-prefix-type="IPPrefix" \
    --dest-port-ranges 443 \
    --description "Ensure monitoring from internal network is never blocked"
```

:::tip Nota para o exame

Ações das regras de administração de segurança e sua ordem de avaliação:
1. **Always Allow** -- O tráfego é permitido independentemente de regras de administração de prioridade inferior ou NSGs
2. **Allow** -- O tráfego é permitido no nível de administração, mas ainda pode ser bloqueado por NSGs
3. **Deny** -- O tráfego é bloqueado independentemente do que os NSGs permitem

As regras de administração são avaliadas antes dos NSGs. Uma regra de administração Deny substitui qualquer regra Allow do NSG. É assim que as organizações impõem políticas de segurança inegociáveis.

:::

---

## Tarefa 5: Implantar (confirmar) configurações nas regiões de destino

As configurações não têm efeito até serem implantadas. A implantação confirma a configuração em regiões específicas do Azure.

### Etapa 1: Confirmar a configuração de conectividade

```bash
az network manager post-commit \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --commit-type "Connectivity" \
    --configuration-ids "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/networkManagers/avnm-contoso/connectivityConfigurations/cc-hub-spoke-prod" \
    --target-locations "eastus2"
```

### Etapa 2: Confirmar a configuração de administração de segurança

```bash
az network manager post-commit \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --commit-type "SecurityAdmin" \
    --configuration-ids "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/networkManagers/avnm-contoso/securityAdminConfigurations/sac-baseline" \
    --target-locations "eastus2"
```

Parâmetros principais:

| Parâmetro | Finalidade |
|-----------|---------|
| `--commit-type` | `Connectivity` ou `SecurityAdmin` |
| `--configuration-ids` | ID completo do recurso da configuração a ser implantada |
| `--target-locations` | Regiões do Azure onde a configuração entra em vigor |

:::caution Importante

O comando é `az network manager post-commit`, não `az network manager commit`. A implantação pode levar vários minutos para propagar. Você pode implantar várias configurações do mesmo tipo em um único commit fornecendo vários IDs de configuração.

:::

---

## Tarefa 6: Verificar conectividade efetiva e regras de segurança

Após a implantação, verifique se as configurações foram aplicadas às VNets de destino.

### Etapa 1: Verificar a configuração de conectividade efetiva em uma VNet spoke

```bash
az network manager list-effective-connectivity-config \
    --resource-group rg-avnm-lab \
    --virtual-network-name vnet-spoke-01
```

Isso deve retornar a configuração de topologia hub-spoke mostrando a VNet hub e as configurações de conectividade do grupo.

### Etapa 2: Verificar as regras de administração de segurança efetivas em uma VNet spoke

```bash
az network manager list-effective-security-admin-rules \
    --resource-group rg-avnm-lab \
    --virtual-network-name vnet-spoke-01
```

Isso mostra todas as regras de administração de segurança aplicadas à VNet, incluindo as regras deny-SSH e deny-RDP.

### Etapa 3: Verificar se os emparelhamentos foram criados automaticamente

```bash
az network vnet peering list \
    --resource-group rg-avnm-lab \
    --vnet-name vnet-spoke-01 \
    --output table
```

Você deve ver um emparelhamento gerenciado pelo AVNM para `vnet-hub`. Esses emparelhamentos são marcados como gerenciados e não podem ser excluídos manualmente enquanto a configuração estiver implantada.

### Etapa 4: Verificar emparelhamentos no lado do hub

```bash
az network vnet peering list \
    --resource-group rg-avnm-lab \
    --vnet-name vnet-hub \
    --output table
```

O hub deve ter emparelhamentos para todas as VNets spoke no grupo de rede.

:::tip Nota para o exame

Emparelhamentos gerenciados pelo AVNM exibem uma propriedade `managedBy`. Você não pode excluí-los ou modificá-los diretamente; é necessário remover a VNet do grupo de rede ou excluir a configuração de conectividade. Se precisar remover uma implantação, confirme com uma lista vazia de IDs de configuração para aquela região.

:::

---

## Cenários de quebra e correção

### Cenário 1: Configuração criada mas não implantada

**Sintoma:** Você criou uma configuração de conectividade e adicionou VNets ao grupo de rede, mas nenhum emparelhamento aparece e as VNets não conseguem se comunicar.

**Causa raiz:** As configurações devem ser explicitamente implantadas (confirmadas) nas regiões de destino. Criar uma configuração apenas define o estado desejado; não o aplica.

**Correção:** Implante a configuração usando `az network manager post-commit`:

```bash
az network manager post-commit \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --commit-type "Connectivity" \
    --configuration-ids "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/networkManagers/avnm-contoso/connectivityConfigurations/cc-hub-spoke-prod" \
    --target-locations "eastus2"
```

### Cenário 2: Regra de administração de segurança bloqueando tráfego legítimo

**Sintoma:** Uma regra NSG permite explicitamente HTTPS de entrada, mas o tráfego ainda está sendo bloqueado. A aplicação estava funcionando antes do AVNM ser implantado.

**Causa raiz:** Uma regra de administração de segurança Deny para a mesma porta tem precedência sobre regras Allow do NSG. As regras de administração são avaliadas antes dos NSGs.

**Diagnóstico:**

```bash
az network manager list-effective-security-admin-rules \
    --resource-group rg-avnm-lab \
    --virtual-network-name vnet-spoke-01
```

**Correção:** Altere a ação da regra de administração de `Deny` para `Allow` (permitindo que os NSGs tomem a decisão final), ou use `AlwaysAllow` se o tráfego nunca deve ser bloqueado:

```bash
az network manager security-admin-config rule-collection rule update \
    --configuration-name "sac-baseline" \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --rule-collection-name "rc-deny-dangerous-inbound" \
    --rule-name "deny-ssh-from-internet" \
    --access "Allow"
```

Em seguida, reimplante a configuração de administração de segurança.

### Cenário 3: Condição de associação dinâmica muito ampla

**Sintoma:** VNets de desenvolvimento/teste estão recebendo regras de segurança de produção e configurações de conectividade que deveriam se aplicar apenas a VNets de produção.

**Causa raiz:** A condição do Azure Policy para associação dinâmica é muito ampla. Por exemplo, correspondência no prefixo de nome de VNet `vnet-` inclui tanto VNets de produção quanto de desenvolvimento.

**Diagnóstico:** Verifique quais VNets estão no grupo de rede:

```bash
az network manager group static-member list \
    --network-group ng-spokes-prod \
    --network-manager avnm-contoso \
    --resource-group rg-avnm-lab
```

**Correção:** Restrinja a condição da política para usar um valor de tag mais específico ou combine várias condições:

```json
{
  "if": {
    "allOf": [
      { "field": "type", "equals": "Microsoft.Network/virtualNetworks" },
      { "field": "tags['Environment']", "equals": "Prod" },
      { "field": "tags['ManagedByAVNM']", "equals": "true" }
    ]
  },
  "then": {
    "effect": "addToNetworkGroup",
    "details": {
      "networkGroupId": "<networkGroupResourceId>"
    }
  }
}
```

---

## Limpeza de recursos

Remova o grupo de recursos e todos os recursos dentro dele:

```bash
az group delete \
    --name rg-avnm-lab \
    --yes \
    --no-wait
```

Se você criou definições e atribuições de política, remova-as também:

```bash
az policy assignment delete --name "avnm-prod-vnets-assignment"
az policy definition delete --name "avnm-prod-vnets"
```

---

## Resumo dos conceitos principais

| Conceito | Descrição |
|---------|-------------|
| Escopo do Network Manager | Limite de assinatura ou grupo de gerenciamento para administração |
| Grupo de rede | Coleção lógica de VNets (associação estática ou dinâmica) |
| Configuração de conectividade | Define a topologia (Hub-spoke ou Malha) |
| Configuração de administração de segurança | Regras aplicadas antes dos NSGs em toda a organização |
| Implantação (commit) | Aplica configurações às regiões de destino |
| Always Allow | Não pode ser substituída por nenhuma outra regra de administração ou NSG |
| Allow (regra de administração) | Permite no nível de administração; NSGs ainda podem bloquear |
| Deny (regra de administração) | Bloqueia o tráfego independentemente das regras NSG |

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-07-q1",
    question: "You create a security admin rule with action 'Deny' for port 22 inbound. A VNet in the network group has an NSG rule that allows port 22 inbound. What happens to SSH traffic?",
    options: [
      "SSH traffic is blocked because security admin rules are evaluated before NSGs",
      "SSH traffic is allowed because NSG rules take precedence over admin rules",
      "The rules conflict and traffic is allowed by default",
      "The deployment fails due to conflicting rules"
    ],
    correctIndex: 0,
    explanation: "Security admin rules are evaluated before NSGs. A Deny action at the admin level blocks traffic regardless of what NSG rules permit. This is how organizations enforce non-negotiable security baselines."
  },
  {
    id: "az700-07-q2",
    question: "You created a connectivity configuration for hub-spoke topology and added VNets to the network group, but no peerings appear on the VNets. What is the most likely cause?",
    options: [
      "The VNets have overlapping address spaces",
      "The configuration was not deployed (committed) to the target region",
      "The network group has exceeded the maximum member count",
      "Hub-spoke topology requires a VPN gateway in the hub"
    ],
    correctIndex: 1,
    explanation: "Configurations must be explicitly deployed using 'az network manager post-commit' with the target region specified. Creating a configuration only defines the desired state; it does not apply it until committed."
  },
  {
    id: "az700-07-q3",
    question: "Which Azure Policy mode must be used when creating a policy for dynamic AVNM network group membership?",
    options: [
      "All",
      "Indexed",
      "Microsoft.Network.Data",
      "Microsoft.Network.VirtualNetworks"
    ],
    correctIndex: 2,
    explanation: "Dynamic membership policies for Azure Virtual Network Manager must use the 'Microsoft.Network.Data' mode. This mode enables the special 'addToNetworkGroup' effect that assigns matching VNets to a network group."
  },
  {
    id: "az700-07-q4",
    question: "In a hub-spoke connectivity configuration, what does setting 'groupConnectivity' to 'DirectlyConnected' achieve?",
    options: [
      "It connects the hub to an ExpressRoute circuit",
      "It enables spoke VNets to communicate with each other without routing through the hub",
      "It creates a full mesh between all network groups",
      "It allows the hub to route traffic to on-premises networks"
    ],
    correctIndex: 1,
    explanation: "Setting groupConnectivity to DirectlyConnected enables direct spoke-to-spoke communication. Without this setting, spokes can only reach the hub VNet and must route through it (via NVA or Azure Firewall) to reach other spokes."
  },
  {
    id: "az700-07-q5",
    question: "What is the correct CLI command to deploy an AVNM configuration to a target region?",
    options: [
      "az network manager commit",
      "az network manager deploy",
      "az network manager post-commit",
      "az network manager configuration apply"
    ],
    correctIndex: 2,
    explanation: "The correct command is 'az network manager post-commit'. It requires --commit-type (Connectivity or SecurityAdmin), --configuration-ids (full resource IDs), and --target-locations (Azure regions where the configuration should take effect)."
  },
  {
    id: "az700-07-q6",
    question: "A security admin rule has the action set to 'AlwaysAllow' for HTTPS inbound from 10.0.0.0/8. Another admin rule with higher priority number denies all inbound traffic on port 443. What happens to HTTPS traffic from 10.0.0.0/8?",
    options: [
      "Traffic is denied because the deny rule has a higher priority number",
      "Traffic is allowed because AlwaysAllow cannot be overridden by other admin rules",
      "Traffic is denied because deny takes precedence over allow",
      "Traffic is allowed only if an NSG also permits it"
    ],
    correctIndex: 1,
    explanation: "AlwaysAllow is the strongest action in security admin rules. It permits traffic regardless of any other admin rules or NSG rules. It is intended for critical traffic (such as monitoring) that must never be blocked by any network policy."
  }
]} />
