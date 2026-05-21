---
sidebar_position: 4
title: "Desafio 04: IaaS — Infrastructure as a Service"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 04: IaaS — Infrastructure as a Service

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Conceitos de Nuvem (25-30%)
:::

## Habilidades do exame cobertas

- Descrever Infrastructure as a Service (IaaS)
- Identificar casos de uso apropriados para IaaS
- Descrever o modelo de responsabilidade compartilhada em relação ao IaaS

## Visão Geral

Infrastructure as a Service (IaaS) é a categoria de serviço em nuvem mais flexível. Ela oferece máximo controle sobre seus recursos de computação — você aluga o hardware (máquinas virtuais, armazenamento, redes) e gerencia todo o resto por conta própria.

Pense no IaaS como alugar um espaço de escritório vazio: o proprietário fornece o prédio, eletricidade e encanamento. Você traz seus próprios móveis, equipamentos e equipe. Você decide como usar o espaço.

No Azure, IaaS significa que você gerencia o sistema operacional, aplicações, runtime e dados. O Azure gerencia o hardware físico, rede e datacenter.

## Explorar

### Tarefa 1: Entender as responsabilidades do IaaS

| Camada | Quem gerencia? |
|--------|----------------|
| Dados e acesso | **Você** |
| Aplicações | **Você** |
| Runtime | **Você** |
| Sistema operacional | **Você** |
| Máquina virtual | **Você** |
| Controles de rede | **Você** |
| Host físico | **Azure** |
| Rede física | **Azure** |
| Datacenter físico | **Azure** |

### Tarefa 2: Explorar serviços IaaS do Azure

1. No Portal Azure, clique em **Create a resource**
2. Pesquise por **Virtual Machine** — este é o serviço IaaS principal
3. **Não crie** — apenas explore o formulário de criação:
   - Observe que você escolhe o SO (Windows/Linux)
   - Você seleciona o tamanho da VM (CPU/RAM)
   - Você configura rede, discos, gerenciamento
   - Você é responsável por aplicar patches e manter o SO
4. Clique **Cancel** quando terminar de explorar

### Tarefa 3: Explorar outros serviços IaaS

Navegue até **All services** e encontre estas ofertas IaaS:

| Serviço Azure | O que fornece | Você gerencia |
|---------------|---------------|---------------|
| Virtual Machines | Instâncias de computação | SO, apps, patches |
| Virtual Network | Infraestrutura de rede | Faixas de IP, regras de roteamento |
| Managed Disks | Armazenamento em bloco para VMs | Dados, configurações de criptografia |
| Load Balancer | Distribuição de tráfego | Regras, health probes |

### Tarefa 4: Quando usar IaaS

IaaS é ideal quando você precisa de:
- **Controle total** sobre o SO e a pilha de software
- **Migração lift-and-shift** — mover VMs on-prem existentes para o Azure
- **Ambientes personalizados** — versões específicas de SO, drivers customizados
- **Dev/test** — criar e destruir ambientes rapidamente
- **Computação de alto desempenho** — cargas de trabalho especializadas com GPU/CPU

**IaaS NÃO é ideal quando:**
- Você só quer rodar um aplicativo web (use PaaS em vez disso)
- Você quer serviço de e-mail (use SaaS em vez disso)
- Você não tem equipe para gerenciar patches e atualizações do SO

:::tip Alternativa Azure CLI
```bash
# List available VM sizes in a region (does not create anything)
az vm list-sizes --location eastus --output table | head -20

# List available VM images (does not create anything)
az vm image list --output table
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **IaaS** | A nuvem fornece hardware virtualizado; você gerencia o SO e acima |
| **Lift-and-shift** | Mover cargas de trabalho existentes para VMs na nuvem com mudanças mínimas |
| **VM Scale Sets** | Grupos de VMs idênticas que escalam automaticamente com base na demanda |
| **Controle máximo** | IaaS oferece o maior controle, mas também a maior responsabilidade |
| **Pague-por-uso** | Pague por minuto/hora pelas VMs enquanto estiverem rodando |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-04-q1',
      question: 'No modelo IaaS, quem é responsável por aplicar patches no sistema operacional?',
      options: ['O provedor de nuvem', 'O cliente', 'Ambos igualmente', 'Ninguém — é automatizado'],
      correctAnswer: 1,
      explanation: 'No IaaS, o cliente é responsável por gerenciar e aplicar patches no sistema operacional. O provedor de nuvem apenas gerencia a infraestrutura física abaixo da VM.'
    },
    {
      id: 'az900-04-q2',
      question: 'Uma empresa quer migrar seus servidores on-premises existentes para o Azure com mudanças mínimas nas aplicações. Qual abordagem e modelo de serviço é mais apropriado?',
      options: ['Refatorar usando PaaS', 'Lift-and-shift usando IaaS', 'Substituir por SaaS', 'Reconstruir como serverless'],
      correctAnswer: 1,
      explanation: 'A migração lift-and-shift move cargas de trabalho existentes para IaaS (VMs Azure) com mudanças mínimas ou nenhuma nas aplicações. Este é o caminho mais rápido para a nuvem, mas mantém a maior responsabilidade de gerenciamento.'
    },
    {
      id: 'az900-04-q3',
      question: 'Qual dos seguintes é um exemplo de IaaS no Azure?',
      options: ['Microsoft 365', 'Azure App Service', 'Azure Virtual Machines', 'Azure Active Directory'],
      correctAnswer: 2,
      explanation: 'Azure Virtual Machines é IaaS — você obtém um servidor virtualizado e gerencia o SO, aplicações e dados. App Service é PaaS, e Microsoft 365 é SaaS.'
    },
    {
      id: 'az900-04-q4',
      question: 'Qual tipo de serviço em nuvem fornece o MAIOR controle para o cliente?',
      options: ['SaaS', 'PaaS', 'IaaS', 'Serverless'],
      correctAnswer: 2,
      explanation: 'IaaS fornece o maior controle porque você gerencia o SO, runtime, aplicações e dados. Com PaaS você perde o controle do SO, e com SaaS você só gerencia dados e acesso.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Guia de Estudos AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo curados
- [Microsoft Learn: Descrever tipos de serviço em nuvem](https://learn.microsoft.com/en-us/training/modules/describe-cloud-service-types/)
- [O que é IaaS?](https://azure.microsoft.com/resources/cloud-computing-dictionary/what-is-iaas/)
