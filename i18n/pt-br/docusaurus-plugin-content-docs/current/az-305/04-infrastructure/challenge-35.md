---
sidebar_position: 2
title: "Desafio 35: Projetar uma Solução Baseada em VM"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 35: Projetar uma Solução Baseada em VM

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-15 | **Peso no Exame: 30-35%**

:::

## Introdução

Meridian Capital Partners é uma empresa de serviços financeiros que executa simulacoes de Monte Carlo para precificar derivativos complexos é avaliar risco de portfolio. Essas simulacoes sao embaracosamente paralelas (cada simulacao e independente) e requerem capacidade massiva de computacao durante o horario de mercado (6h as 20h EST, segunda a sexta) mas zero capacidade durante a noite e nos fins de semana. Durante horarios de pico, a empresa precisa de mais de 100 VMs rodando simultaneamente para atender o SLA de 30 minutos para calculos de risco.

A empresa opera sob requisitos regulatorios rigorosos. Certas cargas de trabalho processam Informações Pessoalmente Identificaveis (PII) e devem rodar em hardware que não é compartilhado com outros locatarios do Azure. Além disso, a camada de cache de simulacao requer latência de disco sub-milissegundo para evitar se tornar um gargalo durante escritas paralelas de centenas de threads de simulacao. A empresa já experimentou problemas de latência de comunicação inter-VM no passado que causaram falhas de sincronizacao das simulacoes.

Sua tarefa é projetar uma solução baseada em VM que enderece economia de scale-to-zero, soberania de dados atraves de hardware dedicado, armazenamento de ultra-baixa-latência e proximidade de rede para comunicação inter-VM, mantendo os custos gerenciáveis pagando apenas por recursos durante a janela ativa de 14 horas.

## Habilidades do Exame Cobertas

- Recomendar uma solução baseada em maquinas virtuais

## Tarefas de Design

### Parte 1: Design de Orquestracao de Scale Set

1. Avalie os modos de orquestracao do VMSS para a carga de trabalho Monte Carlo:
   - **Orquestracao Flexible**: Suporta tamanhos mistos de VM, zonas de disponibilidade, pode adicionar VMs existentes
   - **Orquestracao Uniform**: Todas as VMs sao identicas, suporta Service Fabric e AKS, atualizações gerenciadas pela plataforma

2. Determine qual modo de orquestracao e apropriado para cargas de trabalho embaracosamente paralelas onde todas as VMs executam código de simulacao identico. Documente os trade-offs entre Flexible e Uniform para este caso de uso.

3. Projete a estratégia de auto-scaling:
   - Escalar de 0 para mais de 100 VMs as 6h EST (scale-out agendado)
   - Manter mais de 100 VMs durante horario de mercado
   - Escalar para 0 VMs as 20h EST (scale-in agendado)
   - Lidar com burst no meio do dia para mais de 150 VMs se o backlog de calculos de risco crescer
   - Calcular a economia mensal de custos de scale-to-zero versus rodar 24/7

### Parte 2: Hardware Dedicado e Computação Confidencial

4. Para cargas de trabalho que processam PII e não podem compartilhar hardware com outros locatarios, avalie:
   - **Azure Dedicated Hosts**: Servidor fisico dedicado a sua organização
   - **Confidential Computing (VMs DCsv2/DCsv3)**: TEE baseado em hardware (Trusted Execution Environments) com enclaves Intel SGX

5. Determine qual abordagem de isolamento atende aos requisitos regulatorios:
   - Se o requisito é "nenhum outro locatario no mesmo servidor fisico" -> qual solução?
   - Se o requisito é "dados devem ser criptografados mesmo durante o processamento" -> qual solução?
   - Ambas podem ser combinadas? Quais sao as implicacoes de custo?

6. Projete a configuração do grupo de Dedicated Host:
   - Quantos hosts sao necessários para 20 VMs que processam PII?
   - Qual SKU de host acomoda o tamanho de VM selecionado?
   - Como funciona o controle de manutenção no nível do host?

### Parte 3: Design de Armazenamento de Ultra-Baixa-Latência

7. Compare os tipos de disco Azure para o requisito de cache de simulacao (latência sub-milissegundo):

| Tipo de Disco | IOPS Max | Throughput Max | Latência | Caso de Uso |
|-----------|----------|----------------|---------|----------|
| Standard HDD | 2,000 | 500 MBps | 10+ ms | Backup/arquivo |
| Standard SSD | 6,000 | 750 MBps | 1-10 ms | Dev/test |
| Premium SSD | 20,000 | 900 MBps | Sub-1 ms | Produção |
| Premium SSD v2 | 80,000 | 1,200 MBps | Sub-1 ms | Sensivel a latência |
| Ultra Disk | 400,000 | 4,000 MBps | Sub-0.5 ms | Sub-ms crítico |

8. Justifique por que Ultra Disk é necessário para esta carga de trabalho. Documente os requisitos de IOPS e throughput para mais de 100 VMs realizando escritas paralelas de simulacao.

9. Projete a configuração de disco: Cada VM deve ter seu proprio Ultra Disk, ou você deve usar uma arquitetura de disco compartilhado? Quais sao as consideracoes de dimensionamento?

### Parte 4: Proximidade de Rede e Performance

10. Projete a arquitetura de rede para minimizar latência inter-VM:
    - Implante um proximity placement group para co-localizar VMs no mesmo spine de rede
    - Habilite Accelerated Networking em todas as VMs de simulacao
    - Avalie se todas as 100+ VMs cabem em um único proximity placement group

11. Documente as restrições de proximity placement groups:
    - O que acontece se o data center ficar sem capacidade para seu placement group?
    - Como proximity placement groups interagem com zonas de disponibilidade?
    - Você pode combinar proximity placement groups com VMSS?

12. Projete a topologia de rede para VMs de simulacao que precisam trocar resultados intermediarios com latência sub-1ms entre si.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-35"
  items={[
    "Modo de orquestracao VMSS selecionado com justificativa para carga de trabalho paralela Monte Carlo",
    "Estratégia de auto-scaling projetada para horario 6h-20h com economia de scale-to-zero",
    "Dedicated Hosts vs Confidential Computing avaliados e método correto de isolamento escolhido para requisitos de PII",
    "Ultra Disk selecionado para latência sub-milissegundo com dimensionamento apropriado por VM",
    "Proximity placement group e Accelerated Networking configurados para comunicação inter-VM",
    "Análise de custo comparando implantacao somente em horario ativo versus 24/7"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Selecao de Modo de Orquestracao VMSS</summary>

Para simulacoes Monte Carlo embaracosamente paralelas onde todas as VMs executam código identico:
- **Orquestracao Uniform** e a melhor opcao porque todas as instâncias usam o mesmo modelo e configuração de VM, e você se beneficia de scaling otimizado pela plataforma (over-provisioning para scale-out mais rápido).
- **Orquestracao Flexible** agrega valor quando você precisa de tamanhos mistos de VM ou quer adicionar VMs standalone ao grupo, o que não é necessário para workers de simulacao identicos.

Diferenca chave: Uniform trata instâncias como intercambiaveis; Flexible as trata como VMs individualmente gerenciáveis.

</details>

<details>
<summary>Dica 2: Dimensionamento de Dedicated Host</summary>

Azure Dedicated Hosts sao servidores fisicos. Um único host do tipo DSv4 pode acomodar:
- 16x Standard_D4s_v4 (4 vCPU cada), ou
- 8x Standard_D8s_v4 (8 vCPU cada), ou
- 4x Standard_D16s_v4, etc.

Para 20 VMs que processam PII, calcule quantas cabem por host baseado no tamanho de VM escolhido. Adicione um host reserva para operações de manutenção (live migration no nível do host requer capacidade disponível em outro host no grupo). Habilite posicionamento automático para que o Azure distribua VMs de forma ótima entre os hosts.

</details>

<details>
<summary>Dica 3: Configuração de Ultra Disk</summary>

Ultra Disk permite que você configure IOPS e throughput independentemente sem redimensionar o disco:
- Tamanho: 4 GiB a 64 TiB
- IOPS max por disco: 400,000
- Throughput max por disco: 4,000 MBps
- Latência: sub-milissegundo (tipicamente 0.1-0.5 ms)

Para cache de simulacao, considere:
- Cada VM pode precisar de 10,000-50,000 IOPS para escritas paralelas
- IOPS e throughput do Ultra Disk podem ser ajustados dinamicamente sem downtime
- Suportado apenas em tamanhos de VM específicos (Es_v5, Dsv5, M-series) e regiões
- Não pode ser usado como disco do SO

</details>

<details>
<summary>Dica 4: Economia de Custos com Scale-to-Zero</summary>

Calcule a economia de custos para 100x VMs Standard_D16s_v4:
- Pay-as-you-go: ~$0.77/hora por VM
- 100 VMs x 14 horas/dia x 22 dias uteis = 30,800 VM-horas/mes
- Custo: 30,800 x $0.77 = ~$23,716/mes

Versus 24/7: 100 VMs x 730 horas = 73,000 VM-horas x $0.77 = ~$56,210/mes

Economia com scale-to-zero: ~$32,494/mes (redução de 58%). Scaling agendado com regras de autoscale do VMSS torna isso automático.

</details>

<details>
<summary>Dica 5: Limites de Proximity Placement Group</summary>

Proximity placement groups (PPGs) garantem que VMs sejam co-localizadas no mesmo spine de rede para baixa latência:
- Sem limite rigido de contagem de VMs, mas restrições de capacidade podem impedir que todas as VMs sejam posicionadas
- PPGs sao fixados em um data center específico na primeira implantacao
- Não podem abranger zonas de disponibilidade (use zona única + PPG)
- Trade-off: baixa latência vs. disponibilidade reduzida (zona única = sem redundância de zona)

Para 100+ VMs em um PPG, use posicionamento baseado em intent: especifique os tamanhos de VM antecipadamente para que o Azure possa reservar capacidade de rack apropriada.

</details>

## Recursos de Aprendizagem

- [Virtual Machine Scale Sets orchestration modes](https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-orchestration-modes)
- [Azure Dedicated Hosts](https://learn.microsoft.com/en-us/azure/virtual-machines/dedicated-hosts)
- [Azure managed disk types](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types)
- [Proximity placement groups](https://learn.microsoft.com/en-us/azure/virtual-machines/co-location)
- [Accelerated Networking overview](https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview)

## Verificação de Conhecimento

<details>
<summary>1. Um VMSS com 100 VMs identicas precisa escalar de 0 para 100 o mais rápido possível em um horario agendado. Qual modo de orquestracao e qual configuração otimiza a velocidade de implantacao?</summary>

**Orquestracao Uniform com overprovisioning habilitado.** O modo Uniform e otimizado para implantacoes identicas em larga escala e suporta overprovisioning, que cria VMs extras durante o scale-out (ex.: 120 VMs) e depois deleta as extras assim que 100 estao confirmadas como saudaveis. Isso compensa falhas de provisionamento de VMs individuais e reduz o tempo para atingir o alvo. Orquestracao Flexible não suporta overprovisioning. Adicionalmente, defina a política de scale-out para usar "newest VMs" para scale-in para reter as instâncias de maior execução.

</details>

<details>
<summary>2. Quando você deve escolher Azure Dedicated Hosts ao inves de VMs de Confidential Computing?</summary>

**Quando o requisito regulatorio e isolamento de hardware fisico (sem co-locacao) ao inves de criptografia de dados em uso.** Dedicated Hosts fornecem um servidor fisico inteiro onde nenhuma VM de outro locatario pode rodar. Confidential Computing (DCsv2/DCsv3) fornece enclaves criptografados por hardware que protegem dados enquanto estao sendo processados, mesmo do hypervisor. Se sua regulamentacao diz "não deve compartilhar infraestrutura fisica com outros locatarios," Dedicated Hosts sao a resposta. Se diz "dados devem permanecer criptografados durante a computacao," Confidential Computing é necessário. Para isolamento máximo, você pode rodar VMs Confidenciais em Dedicated Hosts.

</details>

<details>
<summary>3. Por que você não pode usar Premium SSD ao inves de Ultra Disk para uma carga de trabalho que requer 200,000 IOPS com latência sub-milissegundo?</summary>

**Premium SSD tem limite máximo de 20,000 IOPS por disco (80,000 com v2), enquanto Ultra Disk suporta até 400,000 IOPS por disco.** Mesmo com Premium SSD v2 (máximo de 80,000 IOPS), você não consegue atingir 200,000 IOPS em um único disco. Você precisaria de múltiplos discos Premium SSD v2 em stripe, adicionando complexidade de gerenciamento. Ultra Disk fornece IOPS configuravel até 400,000 e latência sub-milissegundo garantida, tornando-o a única solução de disco único para requisitos extremos de IOPS. Ultra Disk também permite ajuste independente de IOPS/throughput sem downtime.

</details>

## Laboratório de Validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um grupo de recursos para este laboratório:

```bash
az group create --name rg-az305-challenge35 --location eastus
```

2. Crie um proximity placement group:

```bash
az ppg create --resource-group rg-az305-challenge35 --name ppg-finance \
  --intent-vm-sizes Standard_D2s_v3
```

3. Implante um VMSS com 2 instâncias no proximity placement group:

```bash
az vmss create --resource-group rg-az305-challenge35 --name vmss-finance \
  --image Ubuntu2204 --instance-count 2 --vm-sku Standard_D2s_v3 \
  --ppg ppg-finance --admin-username azureuser --generate-ssh-keys \
  --upgrade-policy-mode Automatic
```

4. Verifique que as instâncias do scale set estao rodando:

```bash
az vmss list-instances --resource-group rg-az305-challenge35 \
  --name vmss-finance --output table
```

:::tip
Esta mini-implantacao válida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge35 --yes --no-wait
```

---

**Próximo**: [Challenge 36: Design a Container-Based Solution](/docs/az-305/infrastructure/challenge-36)
