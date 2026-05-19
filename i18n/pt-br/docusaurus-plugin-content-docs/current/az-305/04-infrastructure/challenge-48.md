---
sidebar_position: 15
title: "Desafio 48: Projetar Conectividade de Rede"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 48: Projetar Conectividade de Rede

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-20 | **Peso no Exame: 30-35%**

:::

## Introdução

A NexaGlobal é uma empresa multinacional de serviços financeiros com escritorios em 5 paises (Estados Unidos, Reino Unido, Alemanha, Singapura, Japao) e 2 data centers locais (Nova York, Londres). Eles estao expandindo sua presença no Azure de uma única região (East US) para 3 regiões (East US, UK South, Southeast Asia) para atender usuários regionais com baixa latência.

Os requisitos de conectividade incluem: conexões site-to-site seguras de ambos os data centers para todas as regiões Azure, VPN point-to-site para 2.000 trabalhadores remotos, acesso privado a serviços Azure PaaS (Azure SQL, Storage, Key Vault) sem expo-los a internet, roteamento otimizado para aplicações de trading sensiveis a latência (requisitos de milissegundos de um digito), resolução DNS que funcione perfeitamente entre o ambiente local e todas as regiões Azure, e conectividade de filiais para 15 escritorios satelite com necessidades variadas de largura de banda (10-100Mbps cada).

A equipe de rede deve projetar uma solução que equilibre custo, performance e complexidade operacional enquanto atende requisitos regulatorios rigorosos para residencia de dados e criptografia de rede.

## Habilidades do Exame Cobertas

- Recomendar uma solução de conectividade que conecte recursos Azure a internet
- Recomendar uma solução de conectividade que conecte recursos Azure a redes locais
- Recomendar uma solução para otimizar a performance de rede

## Tarefas de Design

### Parte 1: Design de Conectividade Hibrida

1. Compare as opcoes de conectividade para os 2 data centers com 3 regiões Azure:
   - VPN Gateway (S2S VPN): custo por gateway, limites de largura de banda por SKU, overhead de criptografia
   - ExpressRoute: Standard vs. Premium, opcoes de largura de banda (50Mbps a 10Gbps), locais de peering
   - ExpressRoute com failover VPN: design para alta disponibilidade
2. Projete a topologia ExpressRoute:
   - Quantos circuitos ExpressRoute sao necessários? (um por data center? compartilhado?)
   - Standard vs. Premium SKU (Premium necessário para conectividade cross-region/global)
   - ExpressRoute Global Reach para conectividade direta data center-a-data center via backbone da Microsoft
   - Redundância: circuitos duplos por localização ou circuito único com backup VPN
3. Projete VPN point-to-site (P2S) para 2.000 trabalhadores remotos:
   - Capacidade P2S do VPN Gateway por SKU (VpnGw1-VpnGw5, máximo de conexões simultaneas)
   - Método de autenticação: Entra ID, baseado em certificado, ou RADIUS
   - Consideracoes de split tunneling vs. forced tunneling para trabalhadores remotos

### Parte 2: Topologia de Rede Azure

4. Projete a arquitetura de VNet Azure em 3 regiões:
   - Topologia hub-spoke em cada região com VNets hub em peering
   - vs. Azure Virtual WAN (hub gerenciado com conectividade automatizada)
   - Planejamento de espaço de endereço (faixas não sobrepostas para todas as VNets, redes locais e crescimento futuro)
5. Projete a estratégia de VNet peering:
   - Peering regional (dentro da mesma região, baixo custo)
   - Peering global (cross-region, cobracas de transferencia de dados se aplicam)
   - Conectividade de transito: como VNets spoke em uma região alcancam VNets spoke em outra região
   - Quando usar hub Virtual WAN vs. NVA customizado/Azure Firewall para roteamento de transito
6. Projete a configuração de NAT Gateway para workloads que requerem acesso de saida a internet:
   - Quais subnets precisam de NAT Gateway (subnets de aplicação, não subnets de gateway)
   - Requisitos de IP de saida estatico para allowlisting de APIs de terceiros

### Parte 3: Conectividade Privada para Serviços PaaS

7. Projete a estratégia de Private Endpoint para serviços Azure PaaS:
   - Azure SQL Database, Storage Accounts, Key Vault: private endpoint na VNet hub de cada região
   - Resolução DNS para private endpoints (Private DNS Zones)
   - Padrões de acesso cross-region: VNets spoke na Asia precisam de acesso privado ao SQL no East US?
8. Projete a arquitetura de Private DNS Zone:
   - Estratégia de hospedagem de zona (centralizada vs. por região)
   - VNet links para resolução DNS de todos os spokes
   - Encaminhamento condicional do DNS local para o Azure Private DNS (via forwarders DNS nas VNets hub)
   - Fluxo de resolução DNS do ambiente local para private endpoint Azure
9. Compare Private Endpoint vs. Service Endpoint vs. acesso público com regras de firewall. Documente quando cada abordagem e apropriada e as implicacoes de segurança de cada uma.

### Parte 4: DNS e Otimização de Roteamento

10. Projete a arquitetura DNS de ponta a ponta:
    - Servidores DNS locais (Active Directory Integrated DNS)
    - Azure DNS Private Resolver (endpoints de entrada e saida)
    - Regras de encaminhamento condicional para zonas privadas Azure (privatelink.database.windows.net, etc.)
    - Lookup direto: cliente local resolvendo private endpoint Azure
    - Lookup reverso: VM Azure resolvendo servidores locais
11. Projete a otimização de roteamento para aplicações de trading sensiveis a latência:
    - ExpressRoute Microsoft peering vs. Private peering para diferentes tipos de trafego
    - ExpressRoute FastPath para conectividade de latência ultra-baixa (bypassa o gateway)
    - Proximity placement groups para VMs co-localizadas
    - Accelerated Networking para latência reduzida VM-a-VM
12. Projete conectividade de filiais para 15 escritorios satelite:
    - Virtual WAN com integração SD-WAN
    - VPN hub com múltiplas conexões S2S
    - Compare custo e overhead de gerenciamento

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-48"
  items={[
    "Topologia ExpressRoute projetada com selecao de SKU, modelo de redundância e justificativa para Global Reach",
    "Arquitetura de VNet Azure aborda topologia hub-spoke em 3 regiões com planejamento de espaço de endereço",
    "Estratégia de Private Endpoint cobre serviços PaaS com resolução DNS tanto do ambiente local quanto do Azure",
    "Arquitetura DNS habilita resolução entre ambiente local, zonas privadas Azure e DNS público",
    "Otimização de latência documentada para aplicações de trading incluindo FastPath e accelerated networking",
    "Solução de conectividade de filiais selecionada com comparacao de custo e gerenciamento"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: ExpressRoute Standard vs. Premium</summary>

O ExpressRoute Standard conecta a regiões Azure na mesma região geopolitica (ex.: todas as regiões dos EUA, todas as regiões europeias). O ExpressRoute Premium adiciona: conectividade a todas as regiões Azure globalmente (ex.: circuito em Londres pode alcancar East US), limites aumentados de tabela de rotas (10.000 rotas vs. 4.000), e capacidade de Global Reach. Para uma empresa multinacional com circuitos em diferentes regiões geopoliticas precisando de conectividade cross-region, Premium é necessário. Premium custa aproximadamente 2x a taxa do circuito Standard.

</details>

<details>
<summary>Dica 2: Virtual WAN vs. Hub-Spoke Customizado</summary>

O Azure Virtual WAN fornece um hub gerenciado com conectividade automatizada (VPN, ExpressRoute, P2S, conexões VNet). Beneficios: gerenciamento simplificado, roteamento de transito any-to-any por padrão, suporte integrado a parceiros SD-WAN e escalabilidade. Hub-spoke customizado requer gerenciamento manual de UDR para transito, NVA ou Azure Firewall para roteamento spoke-a-spoke e mais overhead operacional. Escolha Virtual WAN quando: muitas filiais, precisa de integração SD-WAN ou quer operações simplificadas. Escolha customizado quando: você precisa de controle granular de rotas ou otimização de custos para topologias simples.

</details>

<details>
<summary>Dica 3: Private DNS Zone para Private Endpoints</summary>

Cada tipo de serviço Azure PaaS tem um nome de zona DNS privada específico (ex.: `privatelink.database.windows.net` para Azure SQL, `privatelink.blob.core.windows.net` para Blob Storage). Crie uma zona DNS privada por tipo de serviço, vincule-a a todas as VNets que precisam de resolução, e configure o DNS local para encaminhar essas zonas para o Azure DNS (via VMs de encaminhamento DNS ou endpoint de entrada do Azure DNS Private Resolver em 168.63.129.16 acessível atraves da VNet).

</details>

<details>
<summary>Dica 4: ExpressRoute FastPath</summary>

O ExpressRoute FastPath melhora a performance do caminho de dados ao bypassar o gateway de rede virtual ExpressRoute para trafego do plano de dados. Ele envia trafego diretamente para VMs na rede virtual, reduzindo a latência. O FastPath esta disponível com ExpressRoute Direct (10Gbps/100Gbps) e SKUs de gateway Ultra Performance ou ErGw3AZ. Ele não suporta trafego de transito de VNet peering ou UDR na subnet do gateway. Use-o para workloads sensiveis a latência onde cada milissegundo importa.

</details>

<details>
<summary>Dica 5: Azure DNS Private Resolver</summary>

O Azure DNS Private Resolver substitui a necessidade de VMs customizadas de encaminhamento DNS nas VNets hub. Ele fornece: endpoints de entrada (ambiente local pode consultar zonas Azure Private DNS), endpoints de saida (VMs Azure podem resolver zonas DNS locais via regras de encaminhamento). Este é um serviço gerenciado com SLA de 99,99%, sem gerenciamento de VM e escalabilidade automática. Implante na VNet hub com rulesets de encaminhamento que especificam os IPs dos servidores DNS locais para suas zonas de dominio corporativo.

</details>

## Recursos de Aprendizagem

- [Azure ExpressRoute overview](https://learn.microsoft.com/en-us/azure/expressroute/expressroute-introduction)
- [Azure Virtual WAN overview](https://learn.microsoft.com/en-us/azure/virtual-wan/virtual-wan-about)
- [Private endpoint DNS configuration](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns)
- [Azure DNS Private Resolver](https://learn.microsoft.com/en-us/azure/dns/dns-private-resolver-overview)
- [VPN Gateway design](https://learn.microsoft.com/en-us/azure/vpn-gateway/design)
- [Hub-spoke network topology](https://learn.microsoft.com/en-us/azure/architecture/networking/architecture/hub-spoke)

## Verificação de Conhecimento

<details>
<summary>1. Uma empresa tem circuitos ExpressRoute em Nova York (conectado ao East US) e Londres (conectado ao UK South). Sua workload Azure no Southeast Asia precisa de conectividade privada para ambos os data centers. O que eles precisam?</summary>

**ExpressRoute Premium SKU e Global Reach.** O ExpressRoute Standard só conecta a regiões dentro da mesma fronteira geopolitica. Para alcancar o Southeast Asia a partir de circuitos nos EUA e Europa, ambos os circuitos devem ser atualizados para Premium (ou um novo circuito Premium criado em um local de peering em Singapura). Além disso, o ExpressRoute Global Reach habilita trafego direto entre os data centers de Nova York e Londres pelo backbone da Microsoft sem hairpinning atraves de VNets Azure. Para latência ótima ao Southeast Asia, considere adicionar um terceiro circuito em um local de peering em Singapura.

</details>

<details>
<summary>2. Uma aplicação local precisa resolver o IP privado de um Azure SQL Database configurado com private endpoint. A consulta DNS para `mydb.database.windows.net` atualmente retorna o IP público. Como você corrige isso?</summary>

**Configure encaminhamento DNS condicional do DNS local para o Azure DNS.** O fluxo de resolução deve ser: (1) DNS local recebe consulta para `mydb.database.windows.net`, (2) CNAME redireciona para `mydb.privatelink.database.windows.net`, (3) DNS local tem um forwarder condicional para `privatelink.database.windows.net` apontando para o endpoint de entrada do Azure DNS Private Resolver (ou VMs de encaminhamento DNS na VNet hub), (4) Azure DNS resolve o registro da zona DNS privada e retorna o IP privado (10.x.x.x). Sem este encaminhamento condicional, o DNS local resolve contra o DNS público e retorna o IP público.

</details>

<details>
<summary>3. Um hub Virtual WAN conecta 15 filiais via VPN S2S, 2 data centers via ExpressRoute e 3 VNets spoke. Um usuário de filial precisa acessar uma VM em uma VNet spoke. Isso funciona por padrão?</summary>

**Sim, o Virtual WAN fornece roteamento de transito any-to-any por padrão.** Este é um diferencial chave do hub-spoke customizado onde você deve configurar manualmente UDRs e NVAs para roteamento de transito. No Virtual WAN, trafego branch-to-VNet (VPN para conexão VNet), VNet-to-VNet (via hub) e branch-to-branch roteia atraves do hub automaticamente. Você pode restringir isso usando políticas de roteamento ou tabelas de rotas se necessário. No hub-spoke customizado, trafego branch-to-spoke requer um firewall/NVA no hub e UDRs nas subnets spoke.

</details>

## Limpeza

```bash
# Delete all resources created in this challenge
# WARNING: ExpressRoute circuits and VPN Gateways can be expensive - verify deletion
az group delete --name rg-az305-challenge48 --yes --no-wait
```

---

**Próximo**: [Challenge 49: Design Network Security and Load Balancing](/docs/az-305/infrastructure/challenge-49)
