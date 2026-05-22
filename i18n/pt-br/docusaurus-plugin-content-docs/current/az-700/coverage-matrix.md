---
sidebar_position: 99
title: "Coverage Matrix"
---

# Matriz de cobertura

Esta matriz mapeia cada objetivo do guia de estudo do AZ-700 (abril de 2026) ao(s) desafio(s) que o cobrem.

## Domínio 1: Projetar e implementar infraestrutura de rede principal (25–30%)

### Projetar e implementar endereçamento IP para recursos do Azure

| Objetivo | Desafio |
|----------|---------|
| Planejar e implementar segmentação de rede e espaços de endereço | 01 |
| Criar uma virtual network (VNet) | 01 |
| Planejar e configurar sub-redes para serviços (gateways, PE, SE, firewalls, App GW, Bastion) | 02 |
| Planejar e configurar delegação de sub-rede | 02 |
| Planejar e configurar sub-redes compartilhadas ou dedicadas | 02 |
| Criar um prefixo para endereços IP públicos | 01 |
| Escolher quando usar um prefixo de IP público | 01 |
| Planejar e implementar um prefixo de IP público personalizado (BYOIP) | 01 |
| Criar um endereço IP público | 01 |
| Associar endereços IP públicos a recursos | 01 |

### Projetar e implementar resolução de nomes

| Objetivo | Desafio |
|----------|---------|
| Projetar resolução de nomes dentro de uma VNet | 03, 04 |
| Configurar definições de DNS para uma VNet | 03, 04 |
| Projetar zonas DNS públicas | 03 |
| Projetar zonas DNS privadas | 04 |
| Configurar zonas DNS públicas e privadas | 03, 04 |
| Vincular uma zona DNS privada a uma VNet | 04 |
| Projetar e implementar Azure DNS Private Resolver | 05 |

### Projetar e implementar conectividade e roteamento de VNet

| Objetivo | Desafio |
|----------|---------|
| Projetar encadeamento de serviços, incluindo trânsito de gateway | 06 |
| Implementar VNet peering | 06 |
| Implementar e gerenciar conectividade de rede virtual usando Azure Virtual Network Manager | 07 |
| Projetar e implementar rotas definidas pelo usuário (UDRs) | 08 |
| Associar uma tabela de rotas a uma sub-rede | 08 |
| Configurar forced tunneling | 08 |
| Diagnosticar e resolver problemas de roteamento | 08, 11 |
| Projetar e implementar Azure Route Server | 09 |
| Identificar casos de uso apropriados para Azure NAT Gateway | 10 |
| Implementar Azure NAT Gateway | 10 |

### Monitorar redes

| Objetivo | Desafio |
|----------|---------|
| Configurar monitoramento, diagnóstico de rede e logs no Azure Network Watcher | 11 |
| Monitorar e solucionar problemas de integridade de rede usando Azure Network Watcher | 11 |
| Monitorar e solucionar problemas de redes usando Azure Monitor for Networks | 12 |
| Ativar e monitorar DDoS Protection | 13 |
| Avaliar recomendações de segurança de rede (Defender for Cloud Secure Score) | 13 |
| Avaliar recomendações de segurança de rede (caminhos de ataque) | 13 |
| Identificar recursos de rede usando Microsoft Defender for Cloud Security Explorer | 13 |

## Domínio 2: Projetar, implementar e gerenciar serviços de conectividade (20–25%)

### Projetar, implementar e gerenciar uma conexão VPN site a site

| Objetivo | Desafio |
|----------|---------|
| Projetar uma conexão VPN site a site, incluindo para alta disponibilidade | 14, 15 |
| Selecionar um SKU de virtual network gateway apropriado | 16 |
| Implementar uma conexão VPN site a site | 14 |
| Identificar quando usar VPN baseada em política versus baseada em rota | 16 |
| Criar e configurar um local network gateway | 14 |
| Criar e configurar uma política IPsec/IKE | 16 |
| Criar e configurar um virtual network gateway | 14 |
| Diagnosticar e resolver problemas de conectividade de virtual network gateway | 24 |
| Implementar Azure Extended Network | 15 |

### Projetar, implementar e gerenciar uma conexão VPN ponto a site

| Objetivo | Desafio |
|----------|---------|
| Selecionar um SKU de virtual network gateway apropriado para P2S | 17 |
| Selecionar e configurar um tipo de túnel | 17 |
| Selecionar um método de autenticação apropriado | 18 |
| Configurar autenticação RADIUS | 18 |
| Configurar autenticação usando Microsoft Entra ID | 18 |
| Implementar um arquivo de configuração de cliente VPN | 17 |
| Diagnosticar e resolver problemas de cliente e autenticação | 24 |
| Especificar requisitos do Azure para Always On VPN | 18 |
| Especificar requisitos do Azure para Azure Network Adapter | 17 |

### Projetar, implementar e gerenciar Azure ExpressRoute

| Objetivo | Desafio |
|----------|---------|
| Selecionar um modelo de conectividade ExpressRoute | 19 |
| Selecionar um SKU e tier de ExpressRoute apropriados | 19 |
| Projetar e implementar ExpressRoute (entre regiões, redundância, DR) | 19, 20 |
| Projetar e implementar opções de ExpressRoute (Global Reach, FastPath, Direct) | 20 |
| Escolher entre apenas peering privado do Azure, apenas peering Microsoft, ou ambos | 19, 21 |
| Configurar peering privado do Azure | 19 |
| Configurar peering Microsoft | 21 |
| Criar e configurar um gateway ExpressRoute | 19 |
| Conectar uma rede virtual a um circuito ExpressRoute | 19 |
| Recomendar uma configuração de anúncio de rotas | 21 |
| Configurar criptografia sobre ExpressRoute | 21 |
| Implementar Bidirectional Forwarding Detection | 20 |
| Diagnosticar e resolver problemas de conexão ExpressRoute | 24 |

### Projetar e implementar uma arquitetura Azure Virtual WAN

| Objetivo | Desafio |
|----------|---------|
| Selecionar um SKU de Virtual WAN | 22 |
| Projetar uma arquitetura Virtual WAN | 22 |
| Criar um virtual hub no Virtual WAN | 22 |
| Escolher uma unidade de escala apropriada para cada tipo de gateway | 22 |
| Implantar um gateway em um virtual hub | 22 |
| Configurar roteamento de virtual hub | 23 |
| Integrar um virtual hub com um NVA de terceiros | 23 |

## Domínio 3: Projetar e implementar serviços de entrega de aplicações (15–20%)

### Projetar e implementar Azure Load Balancer e Azure Traffic Manager

| Objetivo | Desafio |
|----------|---------|
| Mapear requisitos para recursos e capacidades do Azure Load Balancer | 25 |
| Identificar casos de uso apropriados para Azure Load Balancer | 25, 33 |
| Escolher um SKU e tier do Azure Load Balancer | 25 |
| Escolher entre load balancers públicos e internos | 25 |
| Escolher entre load balancers regionais e entre regiões | 26 |
| Criar e configurar um Azure Load Balancer | 25 |
| Implementar Azure Traffic Manager | 27 |
| Implementar Gateway Load Balancer | 26 |
| Implementar uma regra de balanceamento de carga | 25 |
| Criar e configurar regras NAT de entrada | 25 |
| Criar e configurar regras de saída explícitas (SNAT) | 26 |

### Projetar e implementar Azure Application Gateway

| Objetivo | Desafio |
|----------|---------|
| Mapear requisitos para recursos e capacidades do Azure Application Gateway | 28, 33 |
| Identificar casos de uso apropriados para Azure Application Gateway | 28, 33 |
| Escolher entre escala manual e autoscale | 30 |
| Criar um backend pool | 28 |
| Configurar health probes | 30 |
| Configurar listeners | 28 |
| Configurar regras de roteamento | 28 |
| Configurar HTTP settings | 28 |
| Configurar TLS | 29 |
| Configurar conjuntos de regras de reescrita | 29 |

### Projetar e implementar Azure Front Door

| Objetivo | Desafio |
|----------|---------|
| Mapear requisitos para recursos e capacidades do Azure Front Door | 31, 33 |
| Identificar casos de uso apropriados para Azure Front Door | 31, 33 |
| Escolher um tier apropriado | 31 |
| Configurar um Azure Front Door (roteamento, origens, endpoints) | 31 |
| Configurar terminação TLS e criptografia TLS ponta a ponta | 31 |
| Configurar cache | 31 |
| Configurar aceleração de tráfego | 31 |
| Implementar regras, reescrita de URL e redirecionamento de URL | 32 |
| Proteger uma origem usando Azure Private Link no Azure Front Door | 32 |

## Domínio 4: Projetar e implementar acesso privado a serviços do Azure (10–15%)

### Projetar e implementar Azure Private Link service e Azure private endpoints

| Objetivo | Desafio |
|----------|---------|
| Planejar private endpoints | 34 |
| Criar private endpoints | 34, 35 |
| Configurar acesso a private endpoints | 34 |
| Criar um Private Link service | 36 |
| Integrar Private Link e Private Endpoint com DNS | 34, 37 |
| Integrar um Private Link service com clientes on-premises | 37 |

### Projetar e implementar service endpoints

| Objetivo | Desafio |
|----------|---------|
| Escolher quando usar um service endpoint | 38, 39 |
| Criar service endpoints | 38 |
| Configurar políticas de service endpoint | 38 |
| Configurar acesso a service endpoints | 38 |

## Domínio 5: Projetar e implementar serviços de segurança de rede do Azure (15–20%)

### Implementar e gerenciar network security groups

| Objetivo | Desafio |
|----------|---------|
| Criar um network security group (NSG) | 40 |
| Associar um NSG a um recurso | 40 |
| Criar um application security group (ASG) | 40 |
| Associar um ASG a uma interface de rede | 40 |
| Criar e configurar regras de segurança de entrada e saída do NSG | 40 |
| Implementar virtual network flow logs | 41 |
| Interpretar virtual network flow logs | 41 |
| Verificar fluxo de IP | 41 |
| Configurar um NSG para administração remota de servidor (Azure Bastion) | 41 |
| Implementar e gerenciar segurança de rede virtual usando Azure Virtual Network Manager | 48 |

### Projetar e implementar Azure Firewall e Azure Firewall Manager

| Objetivo | Desafio |
|----------|---------|
| Mapear requisitos para recursos e capacidades do Azure Firewall | 42 |
| Selecionar um SKU apropriado do Azure Firewall | 43 |
| Projetar uma implantação do Azure Firewall | 42 |
| Criar e implementar uma implantação do Azure Firewall | 42 |
| Configurar regras do Azure Firewall | 42 |
| Criar e implementar políticas do Azure Firewall Manager | 43 |
| Criar um hub seguro implantando Azure Firewall dentro de um hub Virtual WAN | 44 |

### Projetar e implementar uma implantação de Web Application Firewall (WAF)

| Objetivo | Desafio |
|----------|---------|
| Mapear requisitos para recursos e capacidades do WAF | 45, 46 |
| Projetar uma implantação de WAF | 45 |
| Configurar modo de detecção ou prevenção | 45 |
| Configurar conjuntos de regras para WAF no Azure Front Door | 46 |
| Configurar conjuntos de regras para WAF no Application Gateway | 45 |
| Implementar uma política WAF | 45, 46 |
| Associar uma política WAF | 45, 46 |

---

**Cobertura: 100%** — Cada objetivo do guia de estudo oficial do AZ-700 (abril de 2026) está mapeado para pelo menos um desafio.
