---
sidebar_position: 1
title: "Desafio 34: Projetar Computação para Requisitos de Carga de Trabalho"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Desafio 34: projetar computação para requisitos de carga de trabalho

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $0-5 | **Peso no Exame: 30-35%**

:::

## Introdução

NeuralForge é uma startup de IA que garantiu financiamento Series B e precisa migrar três cargas de trabalho distintas de um data center on-premises para o Azure. Cada carga de trabalho tem caracteristicas de computacao radicalmente diferentes, e o orcamento mensal total para todos os recursos de computacao é $8.000. Gastar além do orcamento não é uma opcao, pois a startup esta consumindo seu capital rapidamente.

As três cargas de trabalho sao: (1) Um frontend web voltado ao cliente e camada de API que lida com 2.000 usuários simultaneos durante horarios de pico. A utilizacao de CPU raramente excede 30%, mas o serviço deve manter 99,9% de disponibilidade com auto-scaling. (2) Um pipeline de treinamento de modelos de machine learning que executa jobs em lote exigindo GPUs NVIDIA. Os jobs levam 4-8 horas, executam 3-4 vezes por semana, e podem tolerar interrupcao desde que checkpointing esteja habilitado. (3) Um motor de processamento de dados em memoria que realiza engenharia de features em tempo real para inferencia de ML. Esta carga de trabalho requer um mínimo de 256 GB de RAM, executa 24/7 sob carga sustentada, e é CPU-bound durante fases de transformacao de dados.

Sua tarefa é selecionar a familia/serie de VM ideal para cada carga de trabalho, determinar o melhor modelo de precos (instâncias reservadas, spot ou pay-as-you-go), e dimensionar corretamente cada implantacao para ficar dentro do orcamento de $8.000/mes enquanto atende todos os requisitos de desempenho.

## Habilidades do exame cobertas

- Especificar componentes de uma solução de computacao baseada em requisitos de carga de trabalho

## Tarefas de design

### Parte 1: análise de carga de trabalho e selecao de familia de VM

1. Análise o perfil de computacao de cada carga de trabalho e mapeie-o para a familia de VM Azure apropriada:
   - Web frontend: CPU sustentada baixa, demanda burstable, alta disponibilidade necessária
   - Treinamento ML: GPU-intensivo, orientado a lote, tolera interrupcao
   - Processamento de dados: Otimizado para memoria, alta utilizacao sustentada, 256 GB+ RAM

2. Para cada carga de trabalho, avalie estas familias de VM e justifique sua selecao:
   - **B-series** (burstable): Acumula creditos de CPU durante baixa utilizacao, faz burst quando necessário
   - **D-series** (propósito geral): Relação CPU-para-memoria equilibrada para cargas de trabalho de produção
   - **E-series** (otimizada para memoria): Alta relação memoria-para-CPU, até 672 GiB RAM por VM
   - **N-series** (GPU): GPUs NVIDIA para treinamento de ML, inferencia e visualizacao

3. Documente por que as familias não selecionadas sao inadequadas para cada carga de trabalho (ex: por que B-series e errada para treinamento sustentado de ML, por que N-series e desperdicar recursos para um web frontend).

### Parte 2: otimização do modelo de precos

4. Determine o modelo de precos ideal para cada carga de trabalho:
   - **Pay-as-you-go**: Flexibilidade total, maior custo por hora
   - **Reserved Instances (1 ano ou 3 anos)**: Até 72% de desconto, requer compromisso
   - **Spot VMs**: Até 90% de desconto, podem ser removidas com aviso de 30 segundos
   - **Savings Plans**: Compromisso flexível entre familias de VM/regiões

5. Calcule o custo mensal para a carga de trabalho de treinamento ML em cada modelo de precos:
   - Precos Spot para jobs GPU interruptiveis (estime 4 jobs x 8 horas x 4 semanas = 128 GPU-horas/mes)
   - Pay-as-you-go para a mesma carga de trabalho
   - Qual é a diferenca de custo, e qual risco o Spot introduz?

6. Determine se uma Reserved Instance de 1 ano ou 3 anos faz sentido para o motor de processamento de dados que executa 24/7. Calcule pontos de equilibrio.

### Parte 3: dimensionamento correto e alocacao de orcamento

7. Proponha SKUs de VM específicos para cada carga de trabalho:
   - Web frontend: Selecione o tamanho B-series ou D-series apropriado baseado em 2.000 usuários simultaneos
   - Treinamento ML: Selecione a VM GPU da serie NC ou ND apropriada
   - Processamento de dados: Selecione a E-series apropriada com 256+ GB RAM

8. Crie uma tabela de alocacao de orcamento:

<DecisionMatrix
  title="Compute Budget Allocation"
  headers={["VM SKU", "Pricing Model", "Monthly Cost", "% of Budget"]}
  rows={[
    {criteria: "Web frontend", values: ["B2ms (2 vCPU, 8 GB) x 2 instances + VMSS autoscale to 4", "1-year Reserved Instance for base 2 VMs + pay-as-you-go for autoscale burst", "$180 (RI) + ~$50 (burst) = ~$230", "~3%"]},
    {criteria: "ML training", values: ["NC6s_v3 (6 vCPU, 112 GB, 1x V100 GPU)", "Spot VMs with checkpointing (up to 90% discount)", "~$400-800 (128 GPU-hours/month at Spot pricing)", "~5-10%"]},
    {criteria: "Data processing", values: ["E32-8ds_v5 (32 vCPU, 256 GB RAM) or E64ds_v5 (64 vCPU, 512 GB)", "3-year Reserved Instance (up to 72% discount for 24/7 workload)", "~$2,500-3,500 (depending on SKU and region)", "~35-45%"]},
    {criteria: "Total", values: ["—", "Mixed (RI + Spot + PAYG)", "$3,100-4,500 within $8,000 budget", "~40-56% (leaves room for storage, networking, other services)"]}
  ]}
  storageKey="az305-challenge-34"
/>

9. Verifique que o total permanece dentro de $8.000/mes. Se exceder o orcamento, identifique estratégias de otimização (SKUs menores, menos horas, precos diferentes).

### Parte 4: consideracoes de disponibilidade e escalabilidade

10. Projete a estratégia de disponibilidade para cada carga de trabalho:
    - Web frontend: Qual construcao de disponibilidade fornece SLA de 99,9%?
    - Treinamento ML: Como você lida com a remocao de Spot graciosamente?
    - Processamento de dados: VM única ou scale set para a carga de trabalho intensiva em memoria?

11. Documente a abordagem de escalabilidade para o web frontend: Em qual limite de CPU o auto-scaling deve ser acionado? Qual é a contagem mínima e máxima de instâncias?

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-34"
  items={[
    "Correct VM family selected for each workload with documented justification",
    "Pricing model optimized per workload (Spot for GPU batch, Reserved for 24/7 memory workload)",
    "Specific VM SKUs proposed with costs that total within the $8,000/month budget",
    "Right-sizing rationale explains why selected SKUs match workload demands without over-provisioning",
    "Availability strategy defined for each workload (zones, scale sets, eviction handling)",
    "Budget allocation table completed with realistic Azure pricing"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Modelo de Acumulo de Creditos B-series</summary>

VMs B-series acumulam creditos de CPU quando executam abaixo da linha base (ex: uma B4ms tem uma linha base de 22,5%). Quando seu web app esta ocioso a 5% de CPU, creditos se acumulam. Durante um pico de trafego, a VM pode fazer burst para 100% de CPU usando creditos acumulados. Isso torna a B-series ideal para cargas de trabalho com padrões de utilizacao variaveis. No entanto, uma vez que os creditos se esgotam, o desempenho cai para a linha base. Para cargas de trabalho sustentadas de alta CPU, D-series e mais apropriada porque fornece desempenho consistente sem o modelo de creditos.

</details>

<details>
<summary>Dica 2: Estratégia de Spot VM para Treinamento ML</summary>

Azure Spot VMs oferecem até 90% de desconto, mas podem ser removidas quando o Azure precisa da capacidade de volta. Para treinamento de ML, isso é aceitavel se você:
- Habilitar checkpointing a cada 30 minutos para que o treinamento possa retomar do último checkpoint
- Usar tipo de remocao "Deallocate" para reter o disco para reinicio
- Definir preco máximo como -1 (pagar até a taxa pay-as-you-go) para menor probabilidade de remocao
- Considerar NC-series (GPUs T4) para treinamento e ND-series (GPUs A100) para modelos grandes

Economias tipicas de Spot: NC6s_v3 custa aproximadamente $0,90/hora pay-as-you-go vs. $0,18-$0,27/hora Spot.

</details>

<details>
<summary>Dica 3: Dimensionamento E-series Otimizada para Memoria</summary>

Para requisitos de 256 GB RAM, considere:
- **E32s_v5**: 32 vCPUs, 256 GiB RAM (~$1.460/mes pay-as-you-go, ~$900/mes 1 ano RI)
- **E48s_v5**: 48 vCPUs, 384 GiB RAM (se você precisa de headroom de CPU)
- **E64s_v5**: 64 vCPUs, 512 GiB RAM (se a carga de trabalho crescer)

Uma Reserved Instance de 3 anos na E32s_v5 pode reduzir o custo para aproximadamente $580/mes, que é 60% de economia. Como esta carga de trabalho executa 24/7, Reserved Instances fornecem a melhor economia.

</details>

<details>
<summary>Dica 4: Abordagem de Estimativa de Orcamento</summary>

Custos mensais aproximados (região East US):
- Web frontend: 2x B4ms Reserved ($67/mes cada) = ~$134/mes
- Treinamento ML: NC6s_v3 Spot, 128 horas/mes a $0,25/hora = ~$32/mes
- Processamento de dados: E32s_v5 3 anos RI = ~$580/mes
- Total: ~$746/mes (bem abaixo de $8K, permitindo armazenamento, rede e crescimento)

Se os requisitos de GPU forem maiores (ex: NC24s_v3 com 4 GPUs), os custos aumentam significativamente. Dimensione corretamente baseado na complexidade real do modelo.

</details>

## Recursos de aprendizagem

- [Sizes for virtual machines in Azure](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview)
- [B-series burstable VM sizes](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/b-family)
- [Azure Spot Virtual Machines](https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms)
- [Azure Reserved VM Instances](https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/save-compute-costs-reservations)
- [GPU optimized VM sizes](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/overview)

## Verificação de conhecimento

<details>
<summary>1. Uma carga de trabalho executa a 10% de CPU por 22 horas/dia e depois dispara para 95% de CPU por 2 horas. Qual serie de VM e mais custo-efetiva?</summary>

**B-series (burstable).** A carga de trabalho acumula creditos de CPU durante as 22 horas de baixa utilizacao e os gasta durante o pico de 2 horas. Este padrão e o caso de uso ideal para VMs burstable. Uma VM D-series forneceria desempenho consistente mas a um custo maior, já que você estaria pagando por capacidade de computacao sustentada que fica ociosa 92% do tempo. O requisito chave e que o período de burst seja curto o suficiente para que os creditos acumulados sejam suficientes.

</details>

<details>
<summary>2. Por que Spot VMs sao inadequadas para a carga de trabalho de processamento de dados em memoria apesar da economia de custos?</summary>

**A carga de trabalho executa 24/7 sob carga sustentada e não pode tolerar interrupcao.** Spot VMs podem ser removidas com apenas 30 segundos de aviso quando o Azure precisa da capacidade. Para um motor de processamento em memoria, a remocao significa perder todo o estado em memoria e reiniciar o job do zero. A carga de trabalho de processamento de dados não tem limites naturais de checkpoint e requer disponibilidade continua. Reserved Instances sao a escolha correta aqui: fornecem descontos significativos (até 72%) enquanto garantem capacidade sem risco de remocao.

</details>

<details>
<summary>3. Uma startup precisa de VMs GPU para treinamento de ML que executa 4 horas por semana. Devem usar Reserved Instances ou Spot?</summary>

**Spot VMs.** Com apenas 16 GPU-horas por mes de utilizacao, uma Reserved Instance desperdicaria aproximadamente 98% da capacidade comprometida (uma reserva cobre todas as 730 horas em um mes). Spot VMs fornecem até 90% de desconto sobre pay-as-you-go e sao ideais para cargas de trabalho em lote interruptiveis. O pipeline de treinamento deve implementar checkpointing para lidar com remocoes. O ponto de equilibrio para Reserved Instances em VMs GPU e tipicamente acima de 40-50% de utilizacao (300+ horas/mes).

</details>

<details>
<summary>4. Qual é o risco primário de selecionar um tamanho de VM que corresponde exatamente aos requisitos atuais sem margem?</summary>

**Degradacao de desempenho durante picos de uso e sem capacidade para crescimento.** O dimensionamento correto deve visar 60-80% de utilizacao média, deixando 20-40% de margem para picos de trafego, overhead do SO e crescimento organico. Se uma carga de trabalho que requer 256 GB de RAM e colocada em uma VM com exatamente 256 GB, o overhead do SO e do runtime pode causar pressao de memoria. Selecione o próximo tamanho acima (ex: 384 GB) ou projete escalabilidade horizontal para cargas de trabalho que podem ser distribuidas. O custo de um leve over-provisioning e menor que o custo de incidentes de desempenho.

</details>

## Laboratório de validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um grupo de recursos para este lab:

```bash
az group create --name rg-az305-challenge34 --location eastus
```

2. Implante uma VM B2ms (burstable, 2 vCPUs, 8 GB RAM):

```bash
az vm create --resource-group rg-az305-challenge34 --name vm-burst-test \
  --image Ubuntu2204 --size Standard_B2ms \
  --admin-username azureuser --generate-ssh-keys
```

3. Verifique o saldo de creditos de CPU da VM:

```bash
az monitor metrics list --resource-type "Microsoft.Compute/virtualMachines" \
  --resource vm-burst-test --resource-group rg-az305-challenge34 \
  --metric "CPU Credits Remaining" --output table
```

4. Verifique que a VM esta executando e acessível:

```bash
az vm show --resource-group rg-az305-challenge34 --name vm-burst-test \
  --query "{Status:provisioningState, Size:hardwareProfile.vmSize}" --output table
```

:::tip
Esta mini-implantacao válida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge34 --yes --no-wait
```

---

**Próximo**: [Challenge 35: Design a VM-Based Solution](/docs/az-305/infrastructure/challenge-35)
