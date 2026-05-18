---
sidebar_position: 15
title: "Challenge 48: Design Network Connectivity"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 48: Design Network Connectivity

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-20 | **Peso no Exame: 30-35%**

:::

## Introducao

A NexaGlobal e uma empresa multinacional de servicos financeiros com escritorios em 5 paises (Estados Unidos, Reino Unido, Alemanha, Singapura, Japao) e 2 data centers locais (Nova York, Londres). Eles estao expandindo sua presenca no Azure de uma unica regiao (East US) para 3 regioes (East US, UK South, Southeast Asia) para atender usuarios regionais com baixa latencia.

Os requisitos de conectividade incluem: conexoes site-to-site seguras de ambos os data centers para todas as regioes Azure, VPN point-to-site para 2.000 trabalhadores remotos, acesso privado a servicos Azure PaaS (Azure SQL, Storage, Key Vault) sem expo-los a internet, roteamento otimizado para aplicacoes de trading sensiveis a latencia (requisitos de milissegundos de um digito), resolucao DNS que funcione perfeitamente entre o ambiente local e todas as regioes Azure, e conectividade de filiais para 15 escritorios satelite com necessidades variadas de largura de banda (10-100Mbps cada).

A equipe de rede deve projetar uma solucao que equilibre custo, performance e complexidade operacional enquanto atende requisitos regulatorios rigorosos para residencia de dados e criptografia de rede.

## Habilidades do Exame Cobertas

- Recomendar uma solucao de conectividade que conecte recursos Azure a internet
- Recomendar uma solucao de conectividade que conecte recursos Azure a redes locais
- Recomendar uma solucao para otimizar a performance de rede

## Tarefas de Design

### Parte 1: Design de Conectividade Hibrida

1. Compare as opcoes de conectividade para os 2 data centers com 3 regioes Azure:
   - VPN Gateway (S2S VPN): custo por gateway, limites de largura de banda por SKU, overhead de criptografia
   - ExpressRoute: Standard vs. Premium, opcoes de largura de banda (50Mbps a 10Gbps), locais de peering
   - ExpressRoute com failover VPN: design para alta disponibilidade
2. Projete a topologia ExpressRoute:
   - Quantos circuitos ExpressRoute sao necessarios? (um por data center? compartilhado?)
   - Standard vs. Premium SKU (Premium necessario para conectividade cross-region/global)
   - ExpressRoute Global Reach para conectividade direta data center-a-data center via backbone da Microsoft
   - Redundancia: circuitos duplos por localizacao ou circuito unico com backup VPN
3. Projete VPN point-to-site (P2S) para 2.000 trabalhadores remotos:
   - Capacidade P2S do VPN Gateway por SKU (VpnGw1-VpnGw5, maximo de conexoes simultaneas)
   - Metodo de autenticacao: Entra ID, baseado em certificado, ou RADIUS
   - Consideracoes de split tunneling vs. forced tunneling para trabalhadores remotos

### Parte 2: Topologia de Rede Azure

4. Projete a arquitetura de VNet Azure em 3 regioes:
   - Topologia hub-spoke em cada regiao com VNets hub em peering
   - vs. Azure Virtual WAN (hub gerenciado com conectividade automatizada)
   - Planejamento de espaco de endereco (faixas nao sobrepostas para todas as VNets, redes locais e crescimento futuro)
5. Projete a estrategia de VNet peering:
   - Peering regional (dentro da mesma regiao, baixo custo)
   - Peering global (cross-region, cobracas de transferencia de dados se aplicam)
   - Conectividade de transito: como VNets spoke em uma regiao alcancam VNets spoke em outra regiao
   - Quando usar hub Virtual WAN vs. NVA customizado/Azure Firewall para roteamento de transito
6. Projete a configuracao de NAT Gateway para workloads que requerem acesso de saida a internet:
   - Quais subnets precisam de NAT Gateway (subnets de aplicacao, nao subnets de gateway)
   - Requisitos de IP de saida estatico para allowlisting de APIs de terceiros

### Parte 3: Conectividade Privada para Servicos PaaS

7. Projete a estrategia de Private Endpoint para servicos Azure PaaS:
   - Azure SQL Database, Storage Accounts, Key Vault: private endpoint na VNet hub de cada regiao
   - Resolucao DNS para private endpoints (Private DNS Zones)
   - Padroes de acesso cross-region: VNets spoke na Asia precisam de acesso privado ao SQL no East US?
8. Projete a arquitetura de Private DNS Zone:
   - Estrategia de hospedagem de zona (centralizada vs. por regiao)
   - VNet links para resolucao DNS de todos os spokes
   - Encaminhamento condicional do DNS local para o Azure Private DNS (via forwarders DNS nas VNets hub)
   - Fluxo de resolucao DNS do ambiente local para private endpoint Azure
9. Compare Private Endpoint vs. Service Endpoint vs. acesso publico com regras de firewall. Documente quando cada abordagem e apropriada e as implicacoes de seguranca de cada uma.

### Parte 4: DNS e Otimizacao de Roteamento

10. Projete a arquitetura DNS de ponta a ponta:
    - Servidores DNS locais (Active Directory Integrated DNS)
    - Azure DNS Private Resolver (endpoints de entrada e saida)
    - Regras de encaminhamento condicional para zonas privadas Azure (privatelink.database.windows.net, etc.)
    - Lookup direto: cliente local resolvendo private endpoint Azure
    - Lookup reverso: VM Azure resolvendo servidores locais
11. Projete a otimizacao de roteamento para aplicacoes de trading sensiveis a latencia:
    - ExpressRoute Microsoft peering vs. Private peering para diferentes tipos de trafego
    - ExpressRoute FastPath para conectividade de latencia ultra-baixa (bypassa o gateway)
    - Proximity placement groups para VMs co-localizadas
    - Accelerated Networking para latencia reduzida VM-a-VM
12. Projete conectividade de filiais para 15 escritorios satelite:
    - Virtual WAN com integracao SD-WAN
    - VPN hub com multiplas conexoes S2S
    - Compare custo e overhead de gerenciamento

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-48"
  items={[
    "Topologia ExpressRoute projetada com selecao de SKU, modelo de redundancia e justificativa para Global Reach",
    "Arquitetura de VNet Azure aborda topologia hub-spoke em 3 regioes com planejamento de espaco de endereco",
    "Estrategia de Private Endpoint cobre servicos PaaS com resolucao DNS tanto do ambiente local quanto do Azure",
    "Arquitetura DNS habilita resolucao entre ambiente local, zonas privadas Azure e DNS publico",
    "Otimizacao de latencia documentada para aplicacoes de trading incluindo FastPath e accelerated networking",
    "Solucao de conectividade de filiais selecionada com comparacao de custo e gerenciamento"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: ExpressRoute Standard vs. Premium</summary>

O ExpressRoute Standard conecta a regioes Azure na mesma regiao geopolitica (ex.: todas as regioes dos EUA, todas as regioes europeias). O ExpressRoute Premium adiciona: conectividade a todas as regioes Azure globalmente (ex.: circuito em Londres pode alcancar East US), limites aumentados de tabela de rotas (10.000 rotas vs. 4.000), e capacidade de Global Reach. Para uma empresa multinacional com circuitos em diferentes regioes geopoliticas precisando de conectividade cross-region, Premium e necessario. Premium custa aproximadamente 2x a taxa do circuito Standard.

</details>

<details>
<summary>Dica 2: Virtual WAN vs. Hub-Spoke Customizado</summary>

O Azure Virtual WAN fornece um hub gerenciado com conectividade automatizada (VPN, ExpressRoute, P2S, conexoes VNet). Beneficios: gerenciamento simplificado, roteamento de transito any-to-any por padrao, suporte integrado a parceiros SD-WAN e escalabilidade. Hub-spoke customizado requer gerenciamento manual de UDR para transito, NVA ou Azure Firewall para roteamento spoke-a-spoke e mais overhead operacional. Escolha Virtual WAN quando: muitas filiais, precisa de integracao SD-WAN ou quer operacoes simplificadas. Escolha customizado quando: voce precisa de controle granular de rotas ou otimizacao de custos para topologias simples.

</details>

<details>
<summary>Dica 3: Private DNS Zone para Private Endpoints</summary>

Cada tipo de servico Azure PaaS tem um nome de zona DNS privada especifico (ex.: `privatelink.database.windows.net` para Azure SQL, `privatelink.blob.core.windows.net` para Blob Storage). Crie uma zona DNS privada por tipo de servico, vincule-a a todas as VNets que precisam de resolucao, e configure o DNS local para encaminhar essas zonas para o Azure DNS (via VMs de encaminhamento DNS ou endpoint de entrada do Azure DNS Private Resolver em 168.63.129.16 acessivel atraves da VNet).

</details>

<details>
<summary>Dica 4: ExpressRoute FastPath</summary>

O ExpressRoute FastPath melhora a performance do caminho de dados ao bypassar o gateway de rede virtual ExpressRoute para trafego do plano de dados. Ele envia trafego diretamente para VMs na rede virtual, reduzindo a latencia. O FastPath esta disponivel com ExpressRoute Direct (10Gbps/100Gbps) e SKUs de gateway Ultra Performance ou ErGw3AZ. Ele nao suporta trafego de transito de VNet peering ou UDR na subnet do gateway. Use-o para workloads sensiveis a latencia onde cada milissegundo importa.

</details>

<details>
<summary>Dica 5: Azure DNS Private Resolver</summary>

O Azure DNS Private Resolver substitui a necessidade de VMs customizadas de encaminhamento DNS nas VNets hub. Ele fornece: endpoints de entrada (ambiente local pode consultar zonas Azure Private DNS), endpoints de saida (VMs Azure podem resolver zonas DNS locais via regras de encaminhamento). Este e um servico gerenciado com SLA de 99,99%, sem gerenciamento de VM e escalabilidade automatica. Implante na VNet hub com rulesets de encaminhamento que especificam os IPs dos servidores DNS locais para suas zonas de dominio corporativo.

</details>

## Recursos de Aprendizagem

- [Azure ExpressRoute overview](https://learn.microsoft.com/en-us/azure/expressroute/expressroute-introduction)
- [Azure Virtual WAN overview](https://learn.microsoft.com/en-us/azure/virtual-wan/virtual-wan-about)
- [Private endpoint DNS configuration](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns)
- [Azure DNS Private Resolver](https://learn.microsoft.com/en-us/azure/dns/dns-private-resolver-overview)
- [VPN Gateway design](https://learn.microsoft.com/en-us/azure/vpn-gateway/design)
- [Hub-spoke network topology](https://learn.microsoft.com/en-us/azure/architecture/networking/architecture/hub-spoke)

## Verificacao de Conhecimento

<details>
<summary>1. Uma empresa tem circuitos ExpressRoute em Nova York (conectado ao East US) e Londres (conectado ao UK South). Sua workload Azure no Southeast Asia precisa de conectividade privada para ambos os data centers. O que eles precisam?</summary>

**ExpressRoute Premium SKU e Global Reach.** O ExpressRoute Standard so conecta a regioes dentro da mesma fronteira geopolitica. Para alcancar o Southeast Asia a partir de circuitos nos EUA e Europa, ambos os circuitos devem ser atualizados para Premium (ou um novo circuito Premium criado em um local de peering em Singapura). Alem disso, o ExpressRoute Global Reach habilita trafego direto entre os data centers de Nova York e Londres pelo backbone da Microsoft sem hairpinning atraves de VNets Azure. Para latencia otima ao Southeast Asia, considere adicionar um terceiro circuito em um local de peering em Singapura.

</details>

<details>
<summary>2. Uma aplicacao local precisa resolver o IP privado de um Azure SQL Database configurado com private endpoint. A consulta DNS para `mydb.database.windows.net` atualmente retorna o IP publico. Como voce corrige isso?</summary>

**Configure encaminhamento DNS condicional do DNS local para o Azure DNS.** O fluxo de resolucao deve ser: (1) DNS local recebe consulta para `mydb.database.windows.net`, (2) CNAME redireciona para `mydb.privatelink.database.windows.net`, (3) DNS local tem um forwarder condicional para `privatelink.database.windows.net` apontando para o endpoint de entrada do Azure DNS Private Resolver (ou VMs de encaminhamento DNS na VNet hub), (4) Azure DNS resolve o registro da zona DNS privada e retorna o IP privado (10.x.x.x). Sem este encaminhamento condicional, o DNS local resolve contra o DNS publico e retorna o IP publico.

</details>

<details>
<summary>3. Um hub Virtual WAN conecta 15 filiais via VPN S2S, 2 data centers via ExpressRoute e 3 VNets spoke. Um usuario de filial precisa acessar uma VM em uma VNet spoke. Isso funciona por padrao?</summary>

**Sim, o Virtual WAN fornece roteamento de transito any-to-any por padrao.** Este e um diferencial chave do hub-spoke customizado onde voce deve configurar manualmente UDRs e NVAs para roteamento de transito. No Virtual WAN, trafego branch-to-VNet (VPN para conexao VNet), VNet-to-VNet (via hub) e branch-to-branch roteia atraves do hub automaticamente. Voce pode restringir isso usando politicas de roteamento ou tabelas de rotas se necessario. No hub-spoke customizado, trafego branch-to-spoke requer um firewall/NVA no hub e UDRs nas subnets spoke.

</details>

## Limpeza

```bash
# Delete all resources created in this challenge
# WARNING: ExpressRoute circuits and VPN Gateways can be expensive - verify deletion
az group delete --name rg-az305-challenge48 --yes --no-wait
```

---

**Proximo**: [Challenge 49: Design Network Security and Load Balancing](/docs/az-305/infrastructure/challenge-49)
