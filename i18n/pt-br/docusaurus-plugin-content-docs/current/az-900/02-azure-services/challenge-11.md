---
sidebar_position: 5
title: "Desafio 11: Fundamentos de Rede Azure"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 11: Fundamentos de Rede Azure

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **Domínio**: Arquitetura e Serviços Azure (35-40%)
:::

## Habilidades do exame cobertas

- Descrever redes virtuais (VNets, subnets, peering)
- Definir public e private endpoints

## Visão Geral

Azure Virtual Networks (VNets) são o bloco fundamental de construção para redes no Azure. Elas permitem que recursos Azure se comuniquem de forma segura entre si, com a internet e com redes on-premises.

Pense em uma VNet como sua própria rede privada na nuvem — similar a uma rede tradicional que você operaria no seu próprio datacenter, mas com os benefícios de escala, disponibilidade e isolamento do Azure.

## Explorar

### Tarefa 1: Entender conceitos de VNet

| Conceito | Descrição | Equivalente on-premises |
|----------|-----------|------------------------|
| **Virtual Network (VNet)** | Rede isolada no Azure | LAN/WAN |
| **Subnet** | Segmento dentro de uma VNet | VLAN |
| **Network Security Group (NSG)** | Regras de firewall para tráfego | ACL / Regras de firewall |
| **Public IP** | Endereço IP voltado para internet | IP público |
| **Private IP** | Endereço IP apenas interno | Endereço RFC 1918 |
| **VNet Peering** | Conecta duas VNets | Link WAN entre escritórios |

### Tarefa 2: Explorar criação de VNet (não crie)

1. No Portal Azure, pesquise por **Virtual networks**
2. Clique em **+ Create**
3. Explore o formulário:
   - **Address space**: Defina o intervalo de IP (ex: 10.0.0.0/16)
   - **Subnets**: Divida a VNet (ex: 10.0.1.0/24 para web, 10.0.2.0/24 para banco de dados)
4. Observe que VNets são **gratuitas** — você só paga por transferência de dados
5. Clique em **Cancel**

### Tarefa 3: Entender endereçamento IP

```
VNet: 10.0.0.0/16 (65.536 endereços)
├── Subnet: web-subnet      10.0.1.0/24 (251 endereços utilizáveis)
├── Subnet: app-subnet      10.0.2.0/24 (251 endereços utilizáveis)
└── Subnet: db-subnet       10.0.3.0/24 (251 endereços utilizáveis)
```

**Nota**: O Azure reserva 5 IPs em cada subnet (primeiros 4 + último 1), então um /24 tem 251 endereços utilizáveis.

### Tarefa 4: Entender public vs private endpoints

| Tipo de endpoint | Acessível de | Caso de uso |
|-----------------|-------------|-------------|
| **Public endpoint** | Internet + interno | Servidores web, APIs públicas |
| **Private endpoint** | Apenas VNet interna | Bancos de dados, serviços internos |
| **Service endpoint** | VNet para serviço Azure (rota otimizada) | Storage, SQL de dentro da VNet |

**Private endpoints** mantêm o tráfego na rede backbone da Microsoft — nunca tocando a internet pública.

### Tarefa 5: Entender VNet Peering

VNet Peering conecta duas VNets para que os recursos possam se comunicar:

| Tipo de peering | Escopo | Latência |
|----------------|--------|----------|
| **Regional peering** | Mesma região | Muito baixa |
| **Global peering** | Regiões diferentes | Baixa (via backbone Microsoft) |

Regras importantes:
- VNets pareadas não podem ter intervalos de IP sobrepostos
- Peering NÃO é transitivo (A↔B + B↔C ≠ A↔C)
- Tráfego entre VNets pareadas permanece na rede da Microsoft

:::tip Alternativa Azure CLI
```bash
# List virtual networks (if any exist)
az network vnet list --output table

# Show available address prefixes (example)
az network vnet show --name myVnet --resource-group rg-az900-learning --query "addressSpace" 2>/dev/null || echo "No VNet exists yet - that's fine!"
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **VNet** | Rede privada no Azure; recursos se comunicam com segurança |
| **Subnet** | Segmento de uma VNet com seu próprio intervalo de endereços e NSG |
| **NSG** | Regras de firewall com estado (permite/nega tráfego por porta, IP, protocolo) |
| **Public endpoint** | Serviço acessível pela internet |
| **Private endpoint** | Serviço acessível apenas de dentro de uma VNet |
| **VNet Peering** | Conecta duas VNets para comunicação privada |
| **Não-transitivo** | Se A↔B e B↔C, A não pode alcançar C sem peering direto |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-11-q1',
      question: 'Qual é a finalidade de uma Azure Virtual Network (VNet)?',
      options: ['Armazenar arquivos na nuvem', 'Permitir que recursos Azure se comuniquem de forma segura entre si', 'Gerenciar identidades de usuários', 'Monitorar a saúde de recursos'],
      correctAnswer: 1,
      explanation: 'Uma Azure Virtual Network permite que recursos Azure se comuniquem de forma segura entre si, com a internet e com redes on-premises. Ela fornece isolamento e segmentação.'
    },
    {
      id: 'az900-11-q2',
      question: 'Uma empresa quer garantir que seu Azure SQL Database seja acessível apenas de sua VNet e nunca da internet. O que devem usar?',
      options: ['Public endpoint', 'Private endpoint', 'VNet Peering', 'Load balancer'],
      correctAnswer: 1,
      explanation: 'Um private endpoint atribui um endereço IP privado da sua VNet ao serviço Azure, tornando-o acessível apenas de dentro da VNet. O tráfego nunca atravessa a internet pública.'
    },
    {
      id: 'az900-11-q3',
      question: 'VNet A está pareada com VNet B, e VNet B está pareada com VNet C. Recursos na VNet A podem se comunicar diretamente com recursos na VNet C?',
      options: ['Sim, peering é sempre transitivo', 'Não, peering é não-transitivo — peering direto entre A e C é necessário', 'Apenas se estiverem na mesma região', 'Apenas se usarem global peering'],
      correctAnswer: 1,
      explanation: 'VNet Peering é não-transitivo. Cada par de VNets que precisa se comunicar deve ter peering direto estabelecido entre elas.'
    },
    {
      id: 'az900-11-q4',
      question: 'O que é uma subnet na rede Azure?',
      options: ['Uma subscription Azure separada', 'Um intervalo de endereços IP dentro de uma VNet', 'Uma conexão entre duas VNets', 'Um tipo de máquina virtual'],
      correctAnswer: 1,
      explanation: 'Uma subnet é um intervalo de endereços IP dentro de uma VNet. Subnets permitem segmentar sua VNet e aplicar diferentes regras de segurança (NSGs) a diferentes grupos de recursos.'
    },
    {
      id: 'az900-11-q5',
      question: 'Qual recurso age como um firewall para controlar tráfego de entrada e saída para recursos Azure?',
      options: ['Virtual Network', 'Subnet', 'Network Security Group (NSG)', 'VNet Peering'],
      correctAnswer: 2,
      explanation: 'Network Security Groups (NSGs) contêm regras de segurança que permitem ou negam tráfego de rede de entrada/saída. Podem ser associados a subnets ou interfaces de rede individuais.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo selecionados
- [Microsoft Learn: Describe Azure compute and networking](https://learn.microsoft.com/en-us/training/modules/describe-azure-compute-networking-services/)
- [Azure Virtual Network documentation](https://learn.microsoft.com/en-us/azure/virtual-network/)
