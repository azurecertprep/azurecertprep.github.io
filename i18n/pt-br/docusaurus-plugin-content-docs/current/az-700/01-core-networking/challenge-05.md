---
sidebar_position: 5
title: "Challenge 05: Azure DNS Private Resolver"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 05: Azure DNS Private Resolver

:::info Tempo e custo estimados

**90-120 minutos** | **~$0,18/hora por endpoint** | **Peso no exame: 15-20%**

:::

## Cenário

A Contoso possui um ambiente híbrido com servidores DNS locais (DNS do Active Directory em 10.1.0.4 e 10.1.0.5) e cargas de trabalho no Azure usando zonas Azure Private DNS. Atualmente, encaminhadores condicionais nos servidores DNS locais apontam para um par de VMs de encaminhamento DNS IaaS na VNet hub. A equipe deseja eliminar essas VMs e substituí-las pelo Azure DNS Private Resolver para resolução DNS bidirecional entre o ambiente local e o Azure.

A arquitetura requer:
- Clientes locais resolvendo registros de zonas Azure Private DNS (como `db.contoso.internal` vinculado a um ponto de extremidade privado) por meio do ponto de extremidade de entrada
- Cargas de trabalho do Azure em VNets spoke resolvendo domínios Active Directory locais (como `corp.contoso.com`) por meio do ponto de extremidade de saída e regras de encaminhamento

## Objetivos de aprendizagem

Após concluir este desafio, você será capaz de:

- Implantar um Azure DNS Private Resolver em uma rede virtual hub
- Configurar um ponto de extremidade de entrada para resolução DNS do ambiente local para o Azure
- Configurar um ponto de extremidade de saída para resolução DNS do Azure para o ambiente local
- Criar conjuntos de regras de encaminhamento DNS e regras direcionando servidores DNS locais
- Vincular conjuntos de regras de encaminhamento a redes virtuais spoke
- Validar a resolução DNS híbrida bidirecional

## Pré-requisitos

- Uma assinatura do Azure com acesso de Colaborador
- Azure CLI instalado e autenticado (`az login`)
- A extensão CLI `dns-resolver` (instalada automaticamente no primeiro uso, requer CLI versão 2.75.0+)
- Um grupo de recursos e uma VNet hub (ou permissão para criá-los)
- Compreensão de zonas Azure Private DNS e conceitos de DNS híbrido
- (Opcional) Servidores DNS locais acessíveis via ExpressRoute ou VPN para testes ponta a ponta

---

## Tarefa 1: Criar a VNet hub com sub-redes dedicadas ao resolver

O DNS Private Resolver requer duas sub-redes dedicadas (uma para entrada, uma para saída), cada uma com tamanho mínimo de /28 e delegada a `Microsoft.Network/dnsResolvers`.

### Etapa 1: Criar o grupo de recursos

```bash
az group create \
    --name rg-dns-resolver-lab \
    --location eastus2
```

### Etapa 2: Criar a rede virtual hub

```bash
az network vnet create \
    --resource-group rg-dns-resolver-lab \
    --name vnet-hub \
    --address-prefixes 10.0.0.0/16 \
    --location eastus2
```

### Etapa 3: Criar a sub-rede do ponto de extremidade de entrada com delegação

```bash
az network vnet subnet create \
    --resource-group rg-dns-resolver-lab \
    --vnet-name vnet-hub \
    --name snet-dns-inbound \
    --address-prefixes 10.0.0.0/28 \
    --delegations Microsoft.Network/dnsResolvers
```

### Etapa 4: Criar a sub-rede do ponto de extremidade de saída com delegação

```bash
az network vnet subnet create \
    --resource-group rg-dns-resolver-lab \
    --vnet-name vnet-hub \
    --name snet-dns-outbound \
    --address-prefixes 10.0.0.16/28 \
    --delegations Microsoft.Network/dnsResolvers
```

:::tip Nota para o exame

Ambas as sub-redes devem ser delegadas a `Microsoft.Network/dnsResolvers`. Você não pode usar a mesma sub-rede para os pontos de extremidade de entrada e saída. O tamanho mínimo da sub-rede é /28 (16 endereços). Nenhum outro recurso pode residir nessas sub-redes delegadas.

:::

### Etapa 5: Criar uma VNet spoke (para vinculação posterior do conjunto de regras)

```bash
az network vnet create \
    --resource-group rg-dns-resolver-lab \
    --name vnet-spoke-01 \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name snet-workload \
    --subnet-prefixes 10.1.1.0/24 \
    --location eastus2
```

---

## Tarefa 2: Implantar o Azure DNS Private Resolver

Crie o recurso DNS Private Resolver na VNet hub.

### Etapa 1: Criar o DNS Private Resolver

```bash
az dns-resolver create \
    --name dnspr-hub-eastus2 \
    --resource-group rg-dns-resolver-lab \
    --location eastus2 \
    --id "/subscriptions/<subscription-id>/resourceGroups/rg-dns-resolver-lab/providers/Microsoft.Network/virtualNetworks/vnet-hub"
```

O parâmetro `--id` especifica o ID do recurso da rede virtual onde o resolver será implantado.

:::note

Substitua `<subscription-id>` pelo ID real da sua assinatura do Azure. Você pode obtê-lo com `az account show --query id --output tsv`.

:::

### Etapa 2: Verificar se o resolver foi criado

```bash
az dns-resolver show \
    --name dnspr-hub-eastus2 \
    --resource-group rg-dns-resolver-lab \
    --output table
```

O estado do resolver deve mostrar `Succeeded` no estado de provisionamento.

---

## Tarefa 3: Configurar o ponto de extremidade de entrada

O ponto de extremidade de entrada fornece um endereço IP para o qual os servidores DNS locais podem encaminhar consultas. Isso permite que clientes locais resolvam registros em zonas Azure Private DNS.

### Etapa 1: Criar o ponto de extremidade de entrada

```bash
az dns-resolver inbound-endpoint create \
    --dns-resolver-name dnspr-hub-eastus2 \
    --name ie-inbound \
    --resource-group rg-dns-resolver-lab \
    --location eastus2 \
    --ip-configurations "[{private-ip-allocation-method:Dynamic,id:/subscriptions/<subscription-id>/resourceGroups/rg-dns-resolver-lab/providers/Microsoft.Network/virtualNetworks/vnet-hub/subnets/snet-dns-inbound}]"
```

O parâmetro `--ip-configurations` aceita um array JSON especificando a sub-rede e o método de alocação de IP. Use `Dynamic` para permitir que o Azure atribua um IP disponível da sub-rede, ou `Static` com um campo `private-ip-address` para fixar um endereço específico.

### Etapa 2: Recuperar o endereço IP atribuído

```bash
az dns-resolver inbound-endpoint show \
    --dns-resolver-name dnspr-hub-eastus2 \
    --name ie-inbound \
    --resource-group rg-dns-resolver-lab \
    --query "ipConfigurations[0].privateIpAddress" \
    --output tsv
```

Registre este endereço IP (por exemplo, `10.0.0.4`). Este é o endereço que os encaminhadores condicionais locais devem apontar em vez das antigas VMs de encaminhamento IaaS.

### Etapa 3: (Opcional) Criar com um IP estático

Se você precisar de um endereço IP previsível para regras de firewall ou configuração DNS:

```bash
az dns-resolver inbound-endpoint create \
    --dns-resolver-name dnspr-hub-eastus2 \
    --name ie-inbound-static \
    --resource-group rg-dns-resolver-lab \
    --location eastus2 \
    --ip-configurations "[{private-ip-address:10.0.0.10,private-ip-allocation-method:Static,id:/subscriptions/<subscription-id>/resourceGroups/rg-dns-resolver-lab/providers/Microsoft.Network/virtualNetworks/vnet-hub/subnets/snet-dns-inbound}]"
```

:::tip Nota para o exame

O IP do ponto de extremidade de entrada é o que você configura nos servidores DNS locais como destino do encaminhador condicional para zonas Azure Private DNS. Após a implantação, atualize os encaminhadores condicionais locais para apontar para este IP em vez das VMs de encaminhamento IaaS legadas.

:::

---

## Tarefa 4: Configurar o ponto de extremidade de saída

O ponto de extremidade de saída permite que o resolver encaminhe consultas de VNets do Azure para servidores DNS externos (como DNS do Active Directory local).

### Etapa 1: Criar o ponto de extremidade de saída

```bash
az dns-resolver outbound-endpoint create \
    --dns-resolver-name dnspr-hub-eastus2 \
    --name oe-outbound \
    --resource-group rg-dns-resolver-lab \
    --location eastus2 \
    --id "/subscriptions/<subscription-id>/resourceGroups/rg-dns-resolver-lab/providers/Microsoft.Network/virtualNetworks/vnet-hub/subnets/snet-dns-outbound"
```

O parâmetro `--id` para o ponto de extremidade de saída especifica o ID do recurso da sub-rede (não o ID da VNet como no próprio resolver).

### Etapa 2: Verificar o ponto de extremidade de saída

```bash
az dns-resolver outbound-endpoint show \
    --dns-resolver-name dnspr-hub-eastus2 \
    --name oe-outbound \
    --resource-group rg-dns-resolver-lab \
    --output table
```

:::warning Importante

A sub-rede do ponto de extremidade de saída deve ter conectividade de rede com os servidores DNS de destino. Se os servidores DNS locais são acessíveis via ExpressRoute ou VPN site a site, certifique-se de que a tabela de rotas e os grupos de segurança de rede na sub-rede de saída permitam tráfego UDP/TCP na porta 53 para esses servidores.

:::

---

## Tarefa 5: Criar um conjunto de regras de encaminhamento DNS e regras

Um conjunto de regras de encaminhamento contém regras que definem quais consultas de domínio são encaminhadas para quais servidores DNS de destino. O conjunto de regras é associado a um ou mais pontos de extremidade de saída.

### Etapa 1: Criar o conjunto de regras de encaminhamento

```bash
az dns-resolver forwarding-ruleset create \
    --name frs-contoso-onprem \
    --resource-group rg-dns-resolver-lab \
    --location eastus2 \
    --outbound-endpoints "[{id:/subscriptions/<subscription-id>/resourceGroups/rg-dns-resolver-lab/providers/Microsoft.Network/dnsResolvers/dnspr-hub-eastus2/outboundEndpoints/oe-outbound}]"
```

O parâmetro `--outbound-endpoints` aceita um array JSON de IDs de recursos de pontos de extremidade de saída. Você pode referenciar múltiplos pontos de extremidade de saída para redundância.

### Etapa 2: Criar uma regra de encaminhamento para o domínio AD local

```bash
az dns-resolver forwarding-rule create \
    --ruleset-name frs-contoso-onprem \
    --name rule-corp-contoso \
    --resource-group rg-dns-resolver-lab \
    --domain-name "corp.contoso.com." \
    --forwarding-rule-state "Enabled" \
    --target-dns-servers "[{ip-address:10.1.0.4,port:53},{ip-address:10.1.0.5,port:53}]"
```

### Etapa 3: Criar uma regra de encaminhamento para DNS reverso (registros PTR)

Para pesquisas reversas locais (útil quando VMs do Azure precisam resolver registros PTR para IPs locais):

```bash
az dns-resolver forwarding-rule create \
    --ruleset-name frs-contoso-onprem \
    --name rule-reverse-10 \
    --resource-group rg-dns-resolver-lab \
    --domain-name "1.10.in-addr.arpa." \
    --forwarding-rule-state "Enabled" \
    --target-dns-servers "[{ip-address:10.1.0.4,port:53},{ip-address:10.1.0.5,port:53}]"
```

### Etapa 4: Verificar as regras

```bash
az dns-resolver forwarding-rule list \
    --ruleset-name frs-contoso-onprem \
    --resource-group rg-dns-resolver-lab \
    --output table
```

:::tip Nota para o exame

O nome de domínio em uma regra de encaminhamento deve terminar com um ponto final (por exemplo, `corp.contoso.com.`). Esta é a notação DNS padrão indicando um nome de domínio totalmente qualificado. A regra corresponde a todas as consultas para o domínio especificado e seus subdomínios. Os servidores DNS de destino são especificados como um array de pares de endereço IP e porta.

:::

---

## Tarefa 6: Vincular o conjunto de regras de encaminhamento às VNets spoke

Vincular um conjunto de regras a uma VNet permite que todas as consultas DNS originadas dessa VNet sejam avaliadas em relação às regras de encaminhamento. Sem esse vínculo, as cargas de trabalho do Azure na VNet spoke usarão a resolução DNS padrão do Azure e não poderão acessar recursos locais por nome.

### Etapa 1: Vincular o conjunto de regras à VNet spoke

```bash
az dns-resolver vnet-link create \
    --ruleset-name frs-contoso-onprem \
    --name vnetlink-spoke-01 \
    --resource-group rg-dns-resolver-lab \
    --id "/subscriptions/<subscription-id>/resourceGroups/rg-dns-resolver-lab/providers/Microsoft.Network/virtualNetworks/vnet-spoke-01"
```

O parâmetro `--id` especifica o ID do recurso da rede virtual a ser vinculada.

### Etapa 2: Vincular o conjunto de regras à VNet hub (se cargas de trabalho do Azure no hub também precisarem de resolução local)

```bash
az dns-resolver vnet-link create \
    --ruleset-name frs-contoso-onprem \
    --name vnetlink-hub \
    --resource-group rg-dns-resolver-lab \
    --id "/subscriptions/<subscription-id>/resourceGroups/rg-dns-resolver-lab/providers/Microsoft.Network/virtualNetworks/vnet-hub"
```

### Etapa 3: Verificar os vínculos

```bash
az dns-resolver vnet-link list \
    --ruleset-name frs-contoso-onprem \
    --resource-group rg-dns-resolver-lab \
    --output table
```

:::warning Importante

Uma rede virtual pode ser vinculada a no máximo dois conjuntos de regras de encaminhamento DNS. Se mais conjuntos de regras precisarem ser aplicados, consolide as regras em menos conjuntos. Um conjunto de regras pode ser vinculado a até 500 redes virtuais.

:::

---

## Tarefa 7: Verificar resolução ponta a ponta

### Do Azure para o ambiente local (caminho de saída)

A partir de uma VM do Azure na VNet spoke, verifique se as consultas para domínios locais são encaminhadas corretamente:

```bash
# From an Azure VM in vnet-spoke-01
nslookup dc01.corp.contoso.com
```

Resultado esperado: resolve para o IP do controlador de domínio local (por exemplo, 10.1.0.4).

O caminho de resolução é: VM do Azure -> Azure DNS (168.63.129.16) -> conjunto de regras de encaminhamento corresponde a `corp.contoso.com.` -> ponto de extremidade de saída encaminha para 10.1.0.4:53 e 10.1.0.5:53.

### Do ambiente local para o Azure (caminho de entrada)

A partir de um servidor local (após atualizar os encaminhadores condicionais para o IP do ponto de extremidade de entrada):

```bash
# From an on-premises server
nslookup db.contoso.internal 10.0.0.4
```

Resultado esperado: resolve para o IP do ponto de extremidade privado vinculado à zona Azure Private DNS.

O caminho de resolução é: servidor DNS local -> encaminhador condicional -> ponto de extremidade de entrada (10.0.0.4) -> Azure DNS resolve o registro da zona Private DNS.

### Verificar usando dig (Linux)

```bash
# Test outbound forwarding from Azure VM
dig dc01.corp.contoso.com

# Test inbound resolution from on-prem (specifying the inbound endpoint IP)
dig @10.0.0.4 db.contoso.internal
```

---

## Cenários de quebra e correção

### Cenário 1: Sub-rede do ponto de extremidade de entrada sem delegação adequada

**Sintoma:** A implantação do ponto de extremidade de entrada falha com um erro indicando que a sub-rede não está delegada corretamente.

```text
(SubnetMissingDelegation) The subnet 'snet-dns-inbound' must have a delegation 
to 'Microsoft.Network/dnsResolvers' to be used by a DNS resolver.
```

**Causa raiz:** A sub-rede foi criada sem o parâmetro `--delegations Microsoft.Network/dnsResolvers`. O serviço DNS Private Resolver requer essa delegação para injetar seus recursos de ponto de extremidade na sub-rede.

**Correção:** Atualize a sub-rede para adicionar a delegação:

```bash
az network vnet subnet update \
    --resource-group rg-dns-resolver-lab \
    --vnet-name vnet-hub \
    --name snet-dns-inbound \
    --delegations Microsoft.Network/dnsResolvers
```

### Cenário 2: Regra de encaminhamento com IP de servidor DNS de destino incorreto

**Sintoma:** VMs do Azure na VNet spoke não conseguem resolver `dc01.corp.contoso.com`. As consultas expiram por tempo limite em vez de retornar NXDOMAIN.

**Causa raiz:** O IP do servidor DNS de destino na regra de encaminhamento está incorreto (por exemplo, `10.1.0.100` em vez de `10.1.0.4`). O ponto de extremidade de saída tenta alcançar um servidor que não existe ou não está executando DNS.

**Correção:** Atualize a regra de encaminhamento com o destino correto:

```bash
az dns-resolver forwarding-rule update \
    --ruleset-name frs-contoso-onprem \
    --name rule-corp-contoso \
    --resource-group rg-dns-resolver-lab \
    --target-dns-servers "[{ip-address:10.1.0.4,port:53},{ip-address:10.1.0.5,port:53}]"
```

Verifique também se os NSGs na sub-rede de saída permitem tráfego de saída UDP/TCP 53 para o intervalo de IP de destino.

### Cenário 3: Conjunto de regras não vinculado à VNet spoke

**Sintoma:** VMs do Azure em `vnet-spoke-01` podem resolver DNS público e zonas Azure Private DNS, mas consultas para `corp.contoso.com` retornam NXDOMAIN do resolvedor recursivo do Azure.

**Causa raiz:** O conjunto de regras de encaminhamento existe e contém a regra correta, mas nunca foi vinculado à VNet spoke. Sem o vínculo da VNet, as consultas DNS dessa VNet não são avaliadas em relação às regras de encaminhamento.

**Correção:** Crie o vínculo de VNet ausente:

```bash
az dns-resolver vnet-link create \
    --ruleset-name frs-contoso-onprem \
    --name vnetlink-spoke-01 \
    --resource-group rg-dns-resolver-lab \
    --id "/subscriptions/<subscription-id>/resourceGroups/rg-dns-resolver-lab/providers/Microsoft.Network/virtualNetworks/vnet-spoke-01"
```

Após a vinculação, consultas para `corp.contoso.com` a partir da VNet spoke corresponderão à regra de encaminhamento e serão enviadas aos servidores DNS locais.

---

## Limpar recursos

```bash
az group delete --name rg-dns-resolver-lab --yes --no-wait
```

---

## Resumo dos conceitos-chave

| Conceito | Detalhe |
|----------|---------|
| DNS Private Resolver | Serviço gerenciado que substitui VMs de encaminhamento DNS IaaS para DNS híbrido |
| Ponto de extremidade de entrada | Fornece um IP privado para o DNS local encaminhar consultas para o Azure |
| Ponto de extremidade de saída | Permite que o Azure DNS encaminhe consultas para servidores DNS externos (locais) |
| Conjunto de regras de encaminhamento | Coleção de regras baseadas em domínio definindo para onde as consultas são encaminhadas |
| Regra de encaminhamento | Corresponde a um sufixo de domínio e especifica servidores DNS de destino (IP + porta) |
| Vínculo de VNet | Associa um conjunto de regras de encaminhamento a uma VNet para ativar a avaliação de regras |
| Delegação de sub-rede | Obrigatória em ambas as sub-redes de endpoint; `Microsoft.Network/dnsResolvers` |
| Tamanho mínimo da sub-rede | /28 (16 endereços); dedicada, nenhum outro recurso permitido |
| Máximo de conjuntos de regras por VNet | 2 conjuntos de regras de encaminhamento podem ser vinculados a uma única VNet |
| Formato do nome de domínio | Deve terminar com um ponto final (por exemplo, `contoso.com.`) |

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-05-q1",
    question: "What is the minimum subnet size required for an Azure DNS Private Resolver endpoint?",
    options: [
      "/30 (4 addresses)",
      "/29 (8 addresses)",
      "/28 (16 addresses)",
      "/27 (32 addresses)"
    ],
    correctIndex: 2,
    explanation: "Both inbound and outbound endpoints require a dedicated subnet with a minimum size of /28 (16 addresses). The subnet must be delegated to Microsoft.Network/dnsResolvers and cannot contain any other resources."
  },
  {
    id: "az700-05-q2",
    question: "On-premises clients need to resolve records in an Azure Private DNS zone. Which DNS Private Resolver component provides the IP address that on-prem conditional forwarders should target?",
    options: [
      "The outbound endpoint IP address",
      "The inbound endpoint IP address",
      "The Azure recursive resolver (168.63.129.16)",
      "The forwarding ruleset virtual IP"
    ],
    correctIndex: 1,
    explanation: "The inbound endpoint provides a private IP address within the hub VNet. On-premises DNS servers configure conditional forwarders pointing to this IP for Azure Private DNS zone resolution. The inbound endpoint then resolves the query using Azure DNS."
  },
  {
    id: "az700-05-q3",
    question: "Azure VMs in a spoke VNet cannot resolve on-premises Active Directory domain names. The forwarding ruleset and rule are correctly configured. What is the most likely missing step?",
    options: [
      "The inbound endpoint is not configured",
      "The spoke VNet is not linked to the forwarding ruleset",
      "The Azure Private DNS zone needs a VNet link to the spoke",
      "The on-premises DNS servers need a conditional forwarder to Azure"
    ],
    correctIndex: 1,
    explanation: "A forwarding ruleset must be linked to each VNet that needs to use its rules. Without the VNet link, DNS queries from the spoke VNet bypass the forwarding rules and are handled by default Azure DNS resolution, which cannot resolve on-premises domains."
  },
  {
    id: "az700-05-q4",
    question: "Which parameter format is correct for specifying target DNS servers in an 'az dns-resolver forwarding-rule create' command?",
    options: [
      "--target-dns-servers 10.1.0.4:53,10.1.0.5:53",
      "--target-dns-servers [{ip-address:10.1.0.4,port:53},{ip-address:10.1.0.5,port:53}]",
      "--dns-servers 10.1.0.4 10.1.0.5",
      "--forwarders [{address:10.1.0.4},{address:10.1.0.5}]"
    ],
    correctIndex: 1,
    explanation: "The --target-dns-servers parameter accepts a JSON array of objects, each with 'ip-address' and 'port' properties. The shorthand syntax uses square brackets and curly braces to define the array of server entries."
  },
  {
    id: "az700-05-q5",
    question: "What is the maximum number of DNS forwarding rulesets that can be linked to a single virtual network?",
    options: [
      "1",
      "2",
      "5",
      "10"
    ],
    correctIndex: 1,
    explanation: "A virtual network can be linked to a maximum of two DNS forwarding rulesets. If more rules are needed, they should be consolidated into fewer rulesets. A single ruleset, however, can be linked to up to 500 virtual networks."
  },
  {
    id: "az700-05-q6",
    question: "Contoso wants to replace their IaaS DNS forwarder VMs in Azure with a managed solution. After deploying the DNS Private Resolver with an inbound endpoint, what must be updated on the on-premises DNS infrastructure?",
    options: [
      "Add a new zone for Azure Private DNS on the on-prem DNS server",
      "Update conditional forwarders to point to the inbound endpoint IP instead of the old VM IPs",
      "Configure the on-prem DNS servers as secondary for the Azure Private DNS zones",
      "Create a DNS delegation from the on-prem domain to the resolver outbound endpoint"
    ],
    correctIndex: 1,
    explanation: "The inbound endpoint replaces the IaaS forwarder VMs. On-premises conditional forwarders that previously pointed to the VM IPs must be updated to the inbound endpoint IP. No zone transfers or delegations are needed; the resolver handles query resolution against Azure Private DNS zones natively."
  }
]} />

---

## Recursos adicionais

- [What is Azure DNS Private Resolver?](https://learn.microsoft.com/azure/dns/dns-private-resolver-overview)
- [Create an Azure DNS Private Resolver using Azure CLI](https://learn.microsoft.com/azure/dns/dns-private-resolver-get-started-portal)
- [Azure DNS Private Resolver endpoints and rulesets](https://learn.microsoft.com/azure/dns/private-resolver-endpoints-rulesets)
- [az dns-resolver CLI reference](https://learn.microsoft.com/cli/azure/dns-resolver)
- [DNS Private Resolver architecture](https://learn.microsoft.com/azure/architecture/networking/architecture/azure-dns-private-resolver)
