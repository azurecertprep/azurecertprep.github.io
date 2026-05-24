---
sidebar_position: 5
title: "Desafio 11: Fundamentos de Rede Azure"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 11: Fundamentos de Rede Azure

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **DomÃ­nio**: Arquitetura e ServiÃ§os Azure (35-40%)
:::

## Habilidades do exame cobertas

- Descrever redes virtuais (VNets, subnets, peering)
- Definir public e private endpoints

## VisÃ£o Geral

Azure Virtual Networks (VNets) sÃ£o o bloco fundamental de construÃ§Ã£o para redes no Azure. Elas permitem que recursos Azure se comuniquem de forma segura entre si, com a internet e com redes on-premises.

Pense em uma VNet como sua prÃ³pria rede privada na nuvem â€” similar a uma rede tradicional que vocÃª operaria no seu prÃ³prio datacenter, mas com os benefÃ­cios de escala, disponibilidade e isolamento do Azure.

## Explorar

### Tarefa 1: Entender conceitos de VNet

| Conceito | DescriÃ§Ã£o | Equivalente on-premises |
|----------|-----------|------------------------|
| **Virtual Network (VNet)** | Rede isolada no Azure | LAN/WAN |
| **Subnet** | Segmento dentro de uma VNet | VLAN |
| **Network Security Group (NSG)** | Regras de firewall para trÃ¡fego | ACL / Regras de firewall |
| **Public IP** | EndereÃ§o IP voltado para internet | IP pÃºblico |
| **Private IP** | EndereÃ§o IP apenas interno | EndereÃ§o RFC 1918 |
| **VNet Peering** | Conecta duas VNets | Link WAN entre escritÃ³rios |

### Tarefa 2: Explorar criaÃ§Ã£o de VNet (nÃ£o crie)

1. No Portal Azure, pesquise por **Virtual networks**
2. Clique em **+ Create**
3. Explore o formulÃ¡rio:
   - **Address space**: Defina o intervalo de IP (ex: 10.0.0.0/16)
   - **Subnets**: Divida a VNet (ex: 10.0.1.0/24 para web, 10.0.2.0/24 para banco de dados)
4. Observe que VNets sÃ£o **gratuitas** â€” vocÃª sÃ³ paga por transferÃªncia de dados
5. Clique em **Cancel**

### Tarefa 3: Entender endereÃ§amento IP

```text
VNet: 10.0.0.0/16 (65.536 endereÃ§os)
â”œâ”€â”€ Subnet: web-subnet      10.0.1.0/24 (251 endereÃ§os utilizÃ¡veis)
â”œâ”€â”€ Subnet: app-subnet      10.0.2.0/24 (251 endereÃ§os utilizÃ¡veis)
â””â”€â”€ Subnet: db-subnet       10.0.3.0/24 (251 endereÃ§os utilizÃ¡veis)
```

**Nota**: O Azure reserva 5 IPs em cada subnet (primeiros 4 + Ãºltimo 1), entÃ£o um /24 tem 251 endereÃ§os utilizÃ¡veis.

### Tarefa 4: Entender public vs private endpoints

| Tipo de endpoint | AcessÃ­vel de | Caso de uso |
|-----------------|-------------|-------------|
| **Public endpoint** | Internet + interno | Servidores web, APIs pÃºblicas |
| **Private endpoint** | Apenas VNet interna | Bancos de dados, serviÃ§os internos |
| **Service endpoint** | VNet para serviÃ§o Azure (rota otimizada) | Storage, SQL de dentro da VNet |

**Private endpoints** mantÃªm o trÃ¡fego na rede backbone da Microsoft â€” nunca tocando a internet pÃºblica.

### Tarefa 5: Entender VNet Peering

VNet Peering conecta duas VNets para que os recursos possam se comunicar:

| Tipo de peering | Escopo | LatÃªncia |
|----------------|--------|----------|
| **Regional peering** | Mesma regiÃ£o | Muito baixa |
| **Global peering** | RegiÃµes diferentes | Baixa (via backbone Microsoft) |

Regras importantes:
- VNets pareadas nÃ£o podem ter intervalos de IP sobrepostos
- Peering NÃƒO Ã© transitivo (Aâ†”B + Bâ†”C â‰  Aâ†”C)
- TrÃ¡fego entre VNets pareadas permanece na rede da Microsoft

:::tip Alternativa Azure CLI
```bash
# List virtual networks (if any exist)
az network vnet list --output table

# Show available address prefixes (example)
az network vnet show --name myVnet --resource-group rg-az900-learning --query "addressSpace" 2>/dev/null || echo "No VNet exists yet - that's fine!"
```
:::

## Conceitos-Chave

| Conceito | DescriÃ§Ã£o |
|----------|-----------|
| **VNet** | Rede privada no Azure; recursos se comunicam com seguranÃ§a |
| **Subnet** | Segmento de uma VNet com seu prÃ³prio intervalo de endereÃ§os e NSG |
| **NSG** | Regras de firewall com estado (permite/nega trÃ¡fego por porta, IP, protocolo) |
| **Public endpoint** | ServiÃ§o acessÃ­vel pela internet |
| **Private endpoint** | ServiÃ§o acessÃ­vel apenas de dentro de uma VNet |
| **VNet Peering** | Conecta duas VNets para comunicaÃ§Ã£o privada |
| **NÃ£o-transitivo** | Se Aâ†”B e Bâ†”C, A nÃ£o pode alcanÃ§ar C sem peering direto |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-11-q1',
      question: 'Qual Ã© a finalidade de uma Azure Virtual Network (VNet)?',
      options: ['Armazenar arquivos na nuvem', 'Permitir que recursos Azure se comuniquem de forma segura entre si', 'Gerenciar identidades de usuÃ¡rios', 'Monitorar a saÃºde de recursos'],
      correctAnswer: 1,
      explanation: 'Uma Azure Virtual Network permite que recursos Azure se comuniquem de forma segura entre si, com a internet e com redes on-premises. Ela fornece isolamento e segmentaÃ§Ã£o.'
    },
    {
      id: 'az900-11-q2',
      question: 'Uma empresa quer garantir que seu Azure SQL Database seja acessÃ­vel apenas de sua VNet e nunca da internet. O que devem usar?',
      options: ['Public endpoint', 'Private endpoint', 'VNet Peering', 'Load balancer'],
      correctAnswer: 1,
      explanation: 'Um private endpoint atribui um endereÃ§o IP privado da sua VNet ao serviÃ§o Azure, tornando-o acessÃ­vel apenas de dentro da VNet. O trÃ¡fego nunca atravessa a internet pÃºblica.'
    },
    {
      id: 'az900-11-q3',
      question: 'VNet A estÃ¡ pareada com VNet B, e VNet B estÃ¡ pareada com VNet C. Recursos na VNet A podem se comunicar diretamente com recursos na VNet C?',
      options: ['Sim, peering Ã© sempre transitivo', 'NÃ£o, peering Ã© nÃ£o-transitivo â€” peering direto entre A e C Ã© necessÃ¡rio', 'Apenas se estiverem na mesma regiÃ£o', 'Apenas se usarem global peering'],
      correctAnswer: 1,
      explanation: 'VNet Peering Ã© nÃ£o-transitivo. Cada par de VNets que precisa se comunicar deve ter peering direto estabelecido entre elas.'
    },
    {
      id: 'az900-11-q4',
      question: 'O que Ã© uma subnet na rede Azure?',
      options: ['Uma subscription Azure separada', 'Um intervalo de endereÃ§os IP dentro de uma VNet', 'Uma conexÃ£o entre duas VNets', 'Um tipo de mÃ¡quina virtual'],
      correctAnswer: 1,
      explanation: 'Uma subnet Ã© um intervalo de endereÃ§os IP dentro de uma VNet. Subnets permitem segmentar sua VNet e aplicar diferentes regras de seguranÃ§a (NSGs) a diferentes grupos de recursos.'
    },
    {
      id: 'az900-11-q5',
      question: 'Qual recurso age como um firewall para controlar trÃ¡fego de entrada e saÃ­da para recursos Azure?',
      options: ['Virtual Network', 'Subnet', 'Network Security Group (NSG)', 'VNet Peering'],
      correctAnswer: 2,
      explanation: 'Network Security Groups (NSGs) contÃªm regras de seguranÃ§a que permitem ou negam trÃ¡fego de rede de entrada/saÃ­da. Podem ser associados a subnets ou interfaces de rede individuais.'
    }
  ]}
/>

## Saiba Mais

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) â€” Materiais de estudo selecionados
- [Microsoft Learn: Describe Azure compute and networking](https://learn.microsoft.com/en-us/training/modules/describe-azure-compute-networking-services/)
- [Azure Virtual Network documentation](https://learn.microsoft.com/en-us/azure/virtual-network/)
