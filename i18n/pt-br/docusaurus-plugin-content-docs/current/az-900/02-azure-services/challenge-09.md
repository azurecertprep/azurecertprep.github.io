---
sidebar_position: 3
title: "Desafio 09: Máquinas Virtuais e Disponibilidade"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 09: Máquinas Virtuais e Disponibilidade

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito (apenas exploração) | **Domínio**: Arquitetura e Serviços Azure (35-40%)
:::

## Habilidades do exame cobertas

- Descrever opções de VM (Azure VMs, VM Scale Sets, availability sets, Azure Virtual Desktop)
- Descrever recursos necessários para máquinas virtuais
- Comparar tipos de computação (VMs, containers, functions)

## Visão Geral

Azure Virtual Machines (VMs) são recursos de computação IaaS que permitem executar sistemas operacionais Windows ou Linux na nuvem. Quando você cria uma VM, o Azure também cria vários recursos de suporte: uma interface de rede virtual, um disco e (opcionalmente) um endereço IP público.

Para tornar VMs altamente disponíveis, o Azure oferece **Availability Sets** (protegem contra falhas de hardware dentro de um datacenter) e **Availability Zones** (protegem contra falhas de datacenter inteiro).

## Explorar

### Tarefa 1: Explorar criação de VM (não crie!)

1. No Portal Azure, clique em **Create a resource** → **Virtual Machine**
2. Explore cada aba sem criar:

**Aba Basics:**
- Subscription, Resource Group, nome da VM, Region
- **Availability options**: None, Availability Zone, Availability Set, Scale Set
- Image (SO): Windows Server, Ubuntu, Red Hat, etc.
- Size: Escolha a combinação de CPU/RAM

**Aba Disks:**
- Tipo de disco do SO: Premium SSD, Standard SSD, Standard HDD

**Aba Networking:**
- Virtual network, subnet, public IP, NSG

3. Clique em **Cancel** — apenas entendendo o que é necessário

### Tarefa 2: Entender recursos relacionados à VM

Quando você cria uma VM, o Azure cria:

| Recurso | Finalidade | Obrigatório? |
|---------|-----------|--------------|
| Virtual Machine | A instância de computação | Sim |
| OS Disk (Managed Disk) | Armazenamento para o sistema operacional | Sim |
| Network Interface (NIC) | Conecta a VM a uma rede virtual | Sim |
| Virtual Network | Rede para a VM se comunicar | Sim (nova ou existente) |
| Public IP Address | Permite acesso à internet para a VM | Opcional |
| Network Security Group | Regras de firewall para a VM | Recomendado |

### Tarefa 3: Entender opções de disponibilidade

| Opção | Protege contra | Como funciona |
|-------|---------------|---------------|
| **Availability Set** | Falhas de hardware em um datacenter | VMs distribuídas entre fault domains e update domains |
| **Availability Zone** | Falhas de datacenter | VMs colocadas em diferentes zonas físicas |
| **VM Scale Set** | Mudanças de demanda | Auto-escala o número de VMs idênticas |

**Fault domains** = racks físicos separados (energia + rede)
**Update domains** = grupos que podem ser reiniciados juntos durante manutenção

### Tarefa 4: Explorar tamanhos de VM

1. No Portal Azure, vá em **Virtual Machines** → **Create**
2. Clique em **See all sizes** (ou no seletor de tamanho)
3. Navegue pelas categorias de famílias de VM:

| Família | Prefixo | Ideal para |
|---------|---------|-----------|
| Uso geral | B, D | Testes, dev, bancos de dados pequenos |
| Otimizada para computação | F | Cargas de trabalho intensivas em CPU |
| Otimizada para memória | E, M | Bancos de dados grandes, cache |
| Otimizada para armazenamento | L | Big data, data warehousing |
| GPU | N | Treinamento de ML, renderização gráfica |

4. Clique em **Cancel**

### Tarefa 5: Azure Virtual Desktop

Azure Virtual Desktop (AVD) é um serviço de VM relacionado:
- Fornece desktops e aplicativos Windows virtuais
- Usuários acessam de qualquer dispositivo via navegador ou cliente
- TI gerencia o desktop centralmente no Azure
- Windows 10/11 multi-sessão (exclusivo do Azure — não é possível on-premises)

:::tip Alternativa Azure CLI
```bash
# List available VM sizes in a region
az vm list-sizes --location eastus --query "[0:10].{Name:name, Cores:numberOfCores, RAM_MB:memoryInMb}" --output table

# List available VM images
az vm image list --output table

# List VM images for Ubuntu
az vm image list --offer Ubuntu --all --query "[0:5]" --output table
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **Azure VM** | Computação IaaS — você gerencia o SO e as aplicações |
| **Availability Set** | Distribui VMs entre fault/update domains dentro de um datacenter |
| **Availability Zone** | Distribui VMs entre datacenters fisicamente separados |
| **VM Scale Set** | Grupo de VMs idênticas que auto-escala com base na demanda |
| **Azure Virtual Desktop** | Desktops hospedados na nuvem acessíveis de qualquer dispositivo |
| **Fault domain** | Rack físico separado (protege contra falha de hardware) |
| **Update domain** | Agrupamento lógico para reinicializações de manutenção planejada |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-09-q1',
      question: 'Qual recurso do Azure distribui VMs entre datacenters fisicamente separados dentro de uma região?',
      options: ['Availability Sets', 'Availability Zones', 'VM Scale Sets', 'Resource groups'],
      correctAnswer: 1,
      explanation: 'Availability Zones colocam VMs em datacenters fisicamente separados dentro de uma região. Cada zona tem energia, refrigeração e rede independentes, protegendo contra falhas no nível do datacenter.'
    },
    {
      id: 'az900-09-q2',
      question: 'Quando você cria uma Azure VM, qual recurso é automaticamente criado para armazenar o sistema operacional?',
      options: ['Blob storage', 'Managed Disk', 'File Share', 'Queue Storage'],
      correctAnswer: 1,
      explanation: 'Um Managed Disk é automaticamente criado para servir como disco do SO quando você cria uma VM. Este disco armazena o sistema operacional e os arquivos de boot.'
    },
    {
      id: 'az900-09-q3',
      question: 'Uma empresa precisa fornecer desktops Windows 10 para 100 funcionários que podem ser acessados de qualquer dispositivo, em qualquer lugar. Qual serviço devem usar?',
      options: ['Azure Virtual Machines', 'Azure Virtual Desktop', 'Azure App Service', 'Azure Container Instances'],
      correctAnswer: 1,
      explanation: 'Azure Virtual Desktop fornece desktops hospedados na nuvem que usuários podem acessar de qualquer dispositivo. Suporta Windows 10/11 multi-sessão e centraliza o gerenciamento de desktops.'
    },
    {
      id: 'az900-09-q4',
      question: 'Qual é a finalidade dos VM Scale Sets?',
      options: ['Aumentar o tamanho de uma única VM', 'Adicionar ou remover automaticamente instâncias de VM idênticas com base na demanda', 'Replicar VMs entre regiões', 'Converter VMs de IaaS para PaaS'],
      correctAnswer: 1,
      explanation: 'VM Scale Sets aumentam ou diminuem automaticamente o número de instâncias de VM idênticas com base na demanda ou em um agendamento. Isso fornece escalabilidade horizontal (scale out/in).'
    },
    {
      id: 'az900-09-q5',
      question: 'Em um Availability Set, o que um "fault domain" representa?',
      options: ['Um grupo lógico que pode ser reiniciado durante atualizações', 'Um rack físico com energia compartilhada e switch de rede', 'Uma região Azure separada', 'Um segmento de rede virtual'],
      correctAnswer: 1,
      explanation: 'Um fault domain representa um rack físico no datacenter com sua própria fonte de energia e switch de rede. Se o rack falhar, apenas VMs naquele fault domain são afetadas.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo selecionados
- [Microsoft Learn: Describe Azure compute and networking](https://learn.microsoft.com/en-us/training/modules/describe-azure-compute-networking-services/)
- [Azure VMs documentation](https://learn.microsoft.com/en-us/azure/virtual-machines/)
