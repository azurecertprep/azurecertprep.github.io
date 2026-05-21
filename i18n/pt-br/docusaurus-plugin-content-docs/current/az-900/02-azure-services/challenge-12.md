---
sidebar_position: 6
title: "Desafio 12: VPN Gateway, ExpressRoute e DNS"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 12: VPN Gateway, ExpressRoute e DNS

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Arquitetura e Serviços Azure (35-40%)
:::

## Habilidades do exame cobertas

- Descrever redes virtuais (VPN Gateway, ExpressRoute)
- Descrever Azure DNS

## Visão Geral

Quando você precisa conectar sua rede on-premises ao Azure (ou conectar VNets Azure entre regiões), você precisa de serviços de conectividade. O Azure oferece **VPN Gateway** para conexões criptografadas pela internet, e **ExpressRoute** para conexões privadas e dedicadas que ignoram completamente a internet.

**Azure DNS** fornece resolução de nomes — traduzindo nomes de domínio legíveis por humanos em endereços IP.

## Explorar

### Tarefa 1: Entender opções de conectividade

| Serviço | Tipo de conexão | Através de | Velocidade | Caso de uso |
|---------|----------------|-----------|-----------|-------------|
| **VPN Gateway** | Túnel criptografado | Internet pública | Até 10 Gbps | Site-to-Site, Point-to-Site |
| **ExpressRoute** | Circuito privado | Linha dedicada | Até 100 Gbps | Empresarial, conformidade, alto throughput |
| **VNet Peering** | Link direto entre VNets | Backbone Microsoft | Alta | VNet-para-VNet dentro do Azure |

### Tarefa 2: Entender tipos de VPN Gateway

| Tipo de VPN | Conecta | Cenário |
|-------------|---------|---------|
| **Site-to-Site (S2S)** | Rede on-premises ↔ Azure VNet | Escritório para Azure |
| **Point-to-Site (P2S)** | Computador individual ↔ Azure VNet | Trabalhador remoto para Azure |
| **VNet-to-VNet** | Azure VNet ↔ Azure VNet | Conectividade entre regiões |

### Tarefa 3: Explorar VPN Gateway no Portal

1. No Portal Azure, pesquise por **Virtual network gateways**
2. Clique em **+ Create**
3. Explore o formulário:
   - **Gateway type**: VPN ou ExpressRoute
   - **SKU**: Diferentes tiers de throughput
   - **VPN type**: Route-based (moderno) ou Policy-based (legado)
4. Observe: VPN Gateways levam 30-45 minutos para implantar e TÊM custo
5. Clique em **Cancel** — não crie

### Tarefa 4: Entender ExpressRoute

ExpressRoute fornece uma **conexão privada** ao Azure:
- O tráfego NÃO passa pela internet pública
- Fornecido por parceiros de conectividade (ISPs/operadoras)
- Maior largura de banda (50 Mbps a 100 Gbps)
- Menor latência e maior confiabilidade
- Exigido para alguns cenários de conformidade

**Quando escolher ExpressRoute vs VPN:**

| Critério | VPN Gateway | ExpressRoute |
|----------|------------|--------------|
| Custo | Menor | Maior |
| Tempo de configuração | Horas | Semanas (precisa de ISP) |
| Largura de banda | Até 10 Gbps | Até 100 Gbps |
| Criptografia | Integrada (IPsec) | Opcional (add-on) |
| Atravessa internet | Sim | Não |
| Necessidades de conformidade | Padrão | Alta segurança |

### Tarefa 5: Explorar Azure DNS

1. No Portal Azure, pesquise por **DNS zones**
2. Azure DNS hospeda os registros DNS do seu domínio
3. Navegue pelo serviço — não precisa criar

**Recursos do Azure DNS:**
- Hospedar zonas DNS no Azure
- Gerenciar registros DNS (A, AAAA, CNAME, MX, etc.)
- Integrado com outros serviços Azure
- Usa a rede anycast global do Azure
- NÃO registra nomes de domínio (use um registrador para isso)

| Registro DNS | Finalidade | Exemplo |
|-------------|-----------|---------|
| A | Mapeia nome → endereço IPv4 | www → 20.53.x.x |
| AAAA | Mapeia nome → endereço IPv6 | www → 2001:db8::1 |
| CNAME | Mapeia nome → outro nome | blog → myapp.azurewebsites.net |
| MX | Servidor de e-mail | @ → mail.example.com |
| TXT | Dados de texto (verificação, SPF) | @ → "v=spf1 include:..." |

:::tip Alternativa Azure CLI
```bash
# List DNS zones (if any)
az network dns zone list --output table 2>/dev/null || echo "No DNS zones configured"

# List available VPN Gateway SKUs
az network vnet-gateway list-available-sku --output table 2>/dev/null || echo "Explore SKUs in the portal"
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **VPN Gateway** | Túnel criptografado pela internet pública para o Azure |
| **Site-to-Site VPN** | Conecta uma rede on-premises inteira ao Azure |
| **Point-to-Site VPN** | Conecta um único dispositivo ao Azure |
| **ExpressRoute** | Conexão privada e dedicada (ignora a internet) |
| **Azure DNS** | Hospedar e gerenciar zonas e registros DNS |
| **DNS zone** | Container para registros DNS de um domínio |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-12-q1',
      question: 'Uma empresa precisa de uma conexão privada e dedicada entre seu datacenter e o Azure que não atravesse a internet pública. Qual serviço devem usar?',
      options: ['VPN Gateway (Site-to-Site)', 'ExpressRoute', 'VNet Peering', 'Azure DNS'],
      correctAnswer: 1,
      explanation: 'ExpressRoute fornece uma conexão privada e dedicada entre a infraestrutura on-premises e o Azure. O tráfego nunca passa pela internet pública, proporcionando maior segurança e confiabilidade.'
    },
    {
      id: 'az900-12-q2',
      question: 'Um funcionário trabalhando de casa precisa acessar recursos em uma Azure VNet de forma segura. Qual tipo de VPN é mais apropriado?',
      options: ['Site-to-Site VPN', 'Point-to-Site VPN', 'ExpressRoute', 'VNet-to-VNet VPN'],
      correctAnswer: 1,
      explanation: 'Point-to-Site VPN conecta um único dispositivo (como um laptop doméstico) a uma Azure VNet. É projetado para trabalhadores remotos individuais, não para redes de escritório inteiras.'
    },
    {
      id: 'az900-12-q3',
      question: 'Qual é a finalidade do Azure DNS?',
      options: ['Registrar nomes de domínio', 'Hospedar zonas DNS e gerenciar registros DNS', 'Criptografar tráfego de rede', 'Conectar redes on-premises ao Azure'],
      correctAnswer: 1,
      explanation: 'Azure DNS hospeda zonas DNS e gerencia registros DNS (A, CNAME, MX, etc.). Ele NÃO registra nomes de domínio — você precisa de um registrador de domínios para isso.'
    },
    {
      id: 'az900-12-q4',
      question: 'Qual opção de conectividade fornece a MAIOR largura de banda para o Azure?',
      options: ['Site-to-Site VPN', 'Point-to-Site VPN', 'ExpressRoute', 'VNet Peering'],
      correctAnswer: 2,
      explanation: 'ExpressRoute suporta até 100 Gbps de largura de banda através de circuitos privados dedicados, muito além do máximo de 10 Gbps do VPN Gateway.'
    },
    {
      id: 'az900-12-q5',
      question: 'Conexões VPN Gateway são criptografadas usando qual protocolo?',
      options: ['SSL/TLS', 'IPsec/IKE', 'SSH', 'HTTPS'],
      correctAnswer: 1,
      explanation: 'Azure VPN Gateway usa protocolos IPsec/IKE (Internet Key Exchange) para criptografar tráfego em conexões site-to-site e VNet-to-VNet.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo selecionados
- [Microsoft Learn: Describe Azure compute and networking](https://learn.microsoft.com/en-us/training/modules/describe-azure-compute-networking-services/)
- [Azure VPN Gateway documentation](https://learn.microsoft.com/en-us/azure/vpn-gateway/)
- [Azure ExpressRoute documentation](https://learn.microsoft.com/en-us/azure/expressroute/)
