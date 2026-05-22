---
sidebar_position: 2
title: "Am I Ready?"
---

import SelfAssessment from '@site/src/components/SelfAssessment';

# Estou pronto para o AZ-700?

Antes de mergulhar nos desafios, avalie sua prontidão. O AZ-700 pressupõe que você já possui experiência como Azure Administrator (nível AZ-104) e compreende conceitos fundamentais de rede.

## Lista de autoavaliação

Clique em cada linha para alternar entre: ✅ Confortável | ⚠️ Preciso Revisar | ❌ Novo para Mim

### Pré-requisitos

<SelfAssessment
  storageKey="az700-prereqs"
  skills={[
    "Tenho experiência com administração do Azure (nível AZ-104)",
    "Entendo TCP/IP, sub-redes e notação CIDR",
    "Consigo explicar resolução DNS (recursiva, autoritativa, tipos de registro)",
    "Entendo protocolos e conceitos de roteamento (BGP, rotas estáticas, NAT)",
    "Já implantei VNets, sub-redes e NSGs no Azure",
    "Consigo usar Azure CLI e PowerShell para gerenciamento de recursos de rede",
  ]}
/>

### Domínio 1: Infraestrutura de rede principal (25–30%)

<SelfAssessment
  storageKey="az700-domain1"
  skills={[
    "Consigo projetar e implementar espaços de endereço de VNet com segmentação adequada",
    "Consigo configurar sub-redes para serviços específicos (gateways, Private Endpoints, Bastion, Firewall)",
    "Consigo configurar delegação de sub-rede para serviços de plataforma",
    "Consigo criar e gerenciar prefixos de IP público (incluindo BYOIP)",
    "Consigo configurar zonas DNS públicas do Azure com delegação e tipos de registro",
    "Consigo configurar zonas DNS privadas do Azure com links de VNet e registro automático",
    "Consigo projetar e implementar Azure DNS Private Resolver (endpoints de entrada/saída)",
    "Consigo implementar VNet peering com trânsito de gateway e encadeamento de serviços",
    "Consigo configurar Azure Virtual Network Manager (grupos de rede, configurações de conectividade)",
    "Consigo projetar rotas definidas pelo usuário com forced tunneling e diagnosticar problemas de roteamento",
    "Consigo configurar Azure Route Server para peering BGP com NVAs",
    "Consigo implementar NAT Gateway para conectividade de saída",
    "Consigo usar Network Watcher para diagnósticos (verificação de fluxo de IP, solução de problemas de conexão, próximo salto)",
    "Consigo configurar Azure Monitor for Networks e DDoS Protection",
  ]}
/>

### Domínio 2: Serviços de conectividade (20–25%)

<SelfAssessment
  storageKey="az700-domain2"
  skills={[
    "Consigo implantar e configurar uma conexão VPN site a site de ponta a ponta",
    "Consigo projetar VPN de alta disponibilidade (ativo-ativo, redundante por zona)",
    "Consigo selecionar SKUs de VPN Gateway apropriados e configurar políticas IPsec/IKE personalizadas",
    "Consigo implementar VPN ponto a site com múltiplos tipos de túnel e métodos de autenticação",
    "Consigo configurar P2S com RADIUS, Entra ID e autenticação por certificado",
    "Consigo explicar modelos de conectividade, SKUs e tipos de peering do ExpressRoute",
    "Consigo projetar ExpressRoute com Global Reach, FastPath e Direct",
    "Consigo configurar Virtual WAN com virtual hubs e implantação de gateway",
    "Consigo configurar roteamento de virtual hub e integração com NVA",
    "Consigo solucionar problemas de conectividade híbrida (diagnósticos de VPN/ExpressRoute)",
  ]}
/>

### Domínio 3: Serviços de entrega de aplicações (15–20%)

<SelfAssessment
  storageKey="az700-domain3"
  skills={[
    "Consigo implantar Azure Load Balancer (Standard) com backend pools e health probes",
    "Consigo configurar Load Balancer entre regiões e Gateway Load Balancer",
    "Consigo implementar Traffic Manager com métodos de roteamento apropriados",
    "Consigo configurar Application Gateway (listeners, regras de roteamento, backend pools)",
    "Consigo configurar terminação TLS, TLS ponta a ponta e regras de reescrita no Application Gateway",
    "Consigo implantar Azure Front Door com origens, roteamento e cache",
    "Consigo configurar o mecanismo de regras do Front Door e origens com Private Link",
    "Consigo escolher a solução de balanceamento de carga correta para um cenário específico",
  ]}
/>

### Domínio 4: Acesso privado a serviços do Azure (10–15%)

<SelfAssessment
  storageKey="az700-domain4"
  skills={[
    "Consigo criar e configurar Private Endpoints com integração DNS adequada",
    "Consigo implantar Private Endpoints para múltiplos serviços do Azure (Storage, SQL, Key Vault)",
    "Consigo criar um Private Link Service como provedor",
    "Consigo configurar acesso privado a partir de on-premises via encaminhamento DNS",
    "Consigo implementar Service Endpoints e políticas de Service Endpoint",
    "Consigo explicar quando usar Private Endpoints vs Service Endpoints",
  ]}
/>

### Domínio 5: Serviços de segurança de rede (15–20%)

<SelfAssessment
  storageKey="az700-domain5"
  skills={[
    "Consigo projetar regras de NSG com prioridade adequada e Application Security Groups",
    "Consigo configurar e interpretar VNet flow logs e Traffic Analytics",
    "Consigo implantar Azure Firewall com regras de aplicação, rede e DNAT",
    "Consigo configurar Azure Firewall Manager com hierarquias de políticas",
    "Consigo implantar Firewall em um hub Virtual WAN (hub virtual seguro)",
    "Consigo implementar WAF no Application Gateway e Azure Front Door",
    "Consigo projetar segurança de rede hub-spoke com encadeamento de NVA",
    "Consigo implementar segmentação de rede com regras de administração de segurança do AVNM",
  ]}
/>
