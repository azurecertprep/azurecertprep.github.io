---
sidebar_position: 7
title: "Desafio 20: Projetar Armazenamento de Dados para Custo e Desempenho"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 20: projetar armazenamento de dados para custo e desempenho

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $2-5 | **Peso no Exame: 20-25%**

:::

## Introdução

DataForge Analytics é uma startup de IA em rápido crescimento que superou sua arquitetura de armazenamento inicial. Hoje eles gerenciam 100TB de dados no Azure, com projeções atingindo 500TB dentro de 12 meses. Seus dados se dividem em três padrões de uso distintos: datasets de treinamento de ML acessados por hora por clusters GPU (dados quentes), arquivos carregados por usuários acessados diariamente através de sua plataforma SaaS (dados mornos) e arquivos de compliance que devem ser retidos por 7 anos mas raramente sao acessados (dados frios).

O CFO levantou uma preocupação urgente: a conta mensal atual de armazenamento é $15.000 e cresce linearmente com o volume de dados. A meta é reduzir os custos abaixo de $10.000/mes sem sacrificar o desempenho de leitura em dados quentes que alimentam o pipeline de ML. A equipe de ML relata que qualquer aumento de latência em leituras de dados de treinamento impacta diretamente o tempo de treinamento do modelo e a eficiência de utilizacao da GPU.

Sua tarefa é projetar uma estratégia de armazenamento em camadas que equilibre otimização de custos com requisitos de desempenho, aproveitando camadas de acesso do Azure Storage, precos de capacidade reservada, políticas de gerenciamento de ciclo de vida e camadas de cache onde apropriado.

## Habilidades do exame cobertas

- Recomendar uma solução de armazenamento de dados que equilibre recursos, desempenho e custos

## Tarefas de design

### Parte 1: analisar armazenamento atual e definir estratégia de camadas

1. Crie um resource group para este desafio é implante uma storage account Standard general-purpose v2.
2. Documente o preco atual para cada camada de acesso (Hot, Cool, Cold, Archive) incluindo custos de armazenamento por GB, custos de operação de leitura/escrita e custos de recuperação de dados na região escolhida.
3. Projete uma estratégia de camadas que mapeie cada categoria de dados para a camada de acesso apropriada:
   - Datasets de treinamento ML (10TB, acessados por hora) - avalie camada Hot vs Premium block blob storage
   - Uploads de usuários (30TB, acessados 1-5 vezes por dia) - avalie camada Cool vs Hot
   - Arquivos de compliance (60TB, acessados menos de uma vez por ano) - avalie camada Cold vs Archive
4. Calcule o custo mensal projetado para sua alocacao de camadas proposta versus manter tudo na camada Hot.

### Parte 2: implementar políticas de gerenciamento de ciclo de vida

5. Crie uma política de gerenciamento de ciclo de vida que transicione automaticamente blobs entre camadas baseado no tempo de último acesso:
   - Mover blobs não acessados por 30 dias de Hot para Cool
   - Mover blobs não acessados por 90 dias de Cool para Cold
   - Mover blobs não acessados por 180 dias de Cold para Archive
6. Habilite o rastreamento de tempo de último acesso na storage account para suportar políticas baseadas em tempo de acesso.
7. Crie uma segunda regra de política que deleta blobs de processamento temporário (prefixo: `temp/`) apos 7 dias.

### Parte 3: avaliar capacidade reservada e cache

8. Calcule a economia de comprar 100TB de capacidade reservada do Azure Storage (compromisso de 1 ano) versus preco pay-as-you-go para o armazenamento baseline estavel.
9. Projete uma estratégia de cache para os dados de treinamento ML usando Azure Cache for Redis ou Azure HPC Cache. Documente:
   - Qual solução de cache e apropriada para leituras de datasets grandes
   - Taxa de cache hit esperada para datasets de treinamento acessados repetidamente
   - Custo da camada de cache versus o beneficio de desempenho
10. Crie uma matriz de decisao comparando camadas de desempenho Standard vs Premium de storage account para a carga de trabalho ML, considerando IOPS, throughput e requisitos de latência.

### Parte 4: projetar para crescimento

11. Documente como seu design escala de 100TB para 500TB enquanto mantem a restrição de orcamento de $10K/mes.
12. Projete uma solução de monitoramento usando metricas do Azure Monitor para rastrear:
    - Crescimento de capacidade de armazenamento por container
    - Padrões de acesso por camada (para validar efetividade da política de ciclo de vida)
    - Alertas de custo quando o gasto mensal se aproxima do limite do orcamento

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-20"
  items={[
    "Lifecycle management policy deployed with at least 3 tier transition rules based on last access time",
    "Cost analysis document shows projected savings of 30% or more compared to all-Hot storage",
    "Decision matrix compares Standard vs Premium tiers with IOPS, throughput, latency, and cost columns",
    "Reserved capacity calculation demonstrates break-even point for 1-year commitment",
    "Caching strategy documented with solution selection rationale and cost-benefit analysis",
    "Growth plan shows cost remains under $10K/month at 500TB scale"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Entendendo Precos de Camada de Acesso</summary>

Camadas de acesso do Azure Blob Storage tem uma relação inversa entre custo de armazenamento e custo de acesso. A camada Hot tem custo de armazenamento por GB mais alto, mas custos de operação de leitura/escrita mais baixos. A camada Archive tem o custo de armazenamento mais baixo (aproximadamente 1/20 da Hot) mas altos custos de recuperação e 15 horas de latência de reidratacao. A camada Cold (introduzida apos Cool) oferece precos entre Cool e Archive com custos de recuperação mais baixos que Archive.

</details>

<details>
<summary>Dica 2: Estrutura da Política de Gerenciamento de Ciclo de Vida</summary>

Políticas de gerenciamento de ciclo de vida usam regras JSON com ações `baseBlob`. Habilite `enableAutoTierToHotFromCool` se você quer que o Azure mova automaticamente blobs de volta para Hot quando acessados. Use `daysAfterLastAccessTimeGreaterThan` (requer rastreamento de acesso habilitado) em vez de `daysAfterModificationGreaterThan` para tiering baseado em padrão de acesso.

</details>

<details>
<summary>Dica 3: Consideracoes de Capacidade Reservada</summary>

Capacidade reservada do Azure Storage fornece até 38% de desconto para compromissos de 1 ano e até 56% para compromissos de 3 anos em capacidade de armazenamento de block blob. A reserva se aplica ao total de armazenamento independente da camada. Não cobre custos de transação, transferencia de dados ou operações - apenas a cobranca de capacidade por GB.

</details>

<details>
<summary>Dica 4: Cache para Datasets Grandes</summary>

Para cargas de trabalho de treinamento ML lendo datasets grandes (multi-TB), Azure HPC Cache é projetado para cargas de trabalho baseadas em arquivo de alto throughput e pode fazer cache de dados do Azure Blob Storage. Azure Cache for Redis e mais adequado para lookups key-value menores. Considere se o framework de ML suporta leituras baseadas em arquivo (HPC Cache) ou leituras baseadas em objeto (Redis).

</details>

<details>
<summary>Dica 5: Premium Block Blob Storage</summary>

Contas de Premium block blob storage usam SSDs e sao otimizadas para cargas de trabalho que requerem latência baixa consistente e altas taxas de transação. Suportam apenas a camada Hot (sem lifecycle tiering) e custam significativamente mais por GB. Sao melhores quando você precisa de latência sub-milissegundo, não apenas alto throughput.

</details>

## Recursos de aprendizagem

- [Azure Blob Storage access tiers](https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview)
- [Optimize costs with Azure Storage reserved capacity](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-reserved-capacity)
- [Azure Blob Storage lifecycle management](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)
- [Plan and manage costs for Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/common/storage-plan-manage-costs)
- [Premium block blob storage accounts](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-block-blob-premium)
- [Azure HPC Cache overview](https://learn.microsoft.com/en-us/azure/hpc-cache/hpc-cache-overview)

## Verificação de conhecimento

<details>
<summary>1. Uma empresa armazena 50TB de dados de log que sao escritos uma vez e lidos aproximadamente duas vezes por mes para auditorias de compliance. Qual camada de acesso minimiza o custo total (armazenamento + operações)?</summary>

**Camada Cool.** Embora Archive tenha o custo de armazenamento por GB mais baixo, o padrão de leitura duas vezes ao mes incorreria em custos significativos de recuperação e atrasos de reidratacao de 15 horas. A camada Cold também poderia funcionar, mas Cool fornece um bom equilibrio entre economia no custo de armazenamento (aproximadamente 50% menos que Hot) e custos de operação razoaveis para leituras ocasionais. A insight chave e que Archive só e economico quando os dados sao acessados menos de uma ou duas vezes por ano.

</details>

<details>
<summary>2. Quando a capacidade reservada do Azure Storage NAO fornece economia de custos?</summary>

**Quando o volume de armazenamento e altamente variavel ou diminuindo.** Capacidade reservada requer um compromisso com uma quantidade fixa de armazenamento (incrementos de 100TB ou 1PB). Se o uso real ficar abaixo da quantidade reservada, você paga por capacidade não utilizada. Também não cobre custos de transação, egress ou operações - apenas a cobranca de capacidade por GB. Se sua carga de trabalho e pesada em transações mas leve em armazenamento, capacidade reservada fornece beneficio mínimo.

</details>

<details>
<summary>3. Uma política de gerenciamento de ciclo de vida move blobs para Archive apos 180 dias. Um usuário precisa ler um blob arquivado imediatamente. O que acontece?</summary>

**A leitura falha até que o blob seja reidratado.** Blobs arquivados estao offline e não podem ser lidos diretamente. O usuário deve primeiro reidratar o blob mudando sua camada para Hot, Cool ou Cold (prioridade standard leva até 15 horas; prioridade alta pode completar em menos de 1 hora para blobs menores que 10GB). Alternativamente, eles podem copiar o blob para um novo blob em uma camada online. Esta é uma consideracao crítica de design - se quaisquer dados de compliance podem precisar de acesso urgente, a camada Archive pode não ser apropriada sem um processo de reidratacao documentado.

</details>

<details>
<summary>4. Qual é a diferenca primária entre uma storage account Standard general-purpose v2 é uma storage account Premium block blob para cargas de trabalho pesadas em leitura?</summary>

**Consistência de latência e IOPS.** Premium block blob storage usa SSDs e fornece latência consistente de um digito de milissegundos e IOPS mais alto. Contas Standard usam HDDs com latência variavel (tipicamente 5-10ms mas pode ter picos). Premium e precificado por GB (sem camadas de acesso) e custa 2-3x mais por GB que a camada Hot Standard. A decisao de design depende de se a carga de trabalho requer latência baixa consistente (Premium) ou pode tolerar latência variavel em troca de otimização de custos baseada em camadas (Standard).

</details>

## Laboratório de validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um resource group para este laboratório:

```bash
az group create --name rg-az305-challenge20 --location eastus
```

2. Implante uma storage account com rastreamento de acesso habilitado:

```bash
az storage account create \
  --name staz305ch20$RANDOM \
  --resource-group rg-az305-challenge20 \
  --sku Standard_LRS \
  --kind StorageV2

az storage account blob-service-properties update \
  --account-name <your-account-name> \
  --resource-group rg-az305-challenge20 \
  --enable-last-access-tracking true
```

3. Aplique uma política de gerenciamento de ciclo de vida com transicoes de camada:

```bash
az storage account management-policy create \
  --account-name <your-account-name> \
  --resource-group rg-az305-challenge20 \
  --policy '{
    "rules": [
      {
        "enabled": true,
        "name": "auto-tier-rule",
        "type": "Lifecycle",
        "definition": {
          "actions": {
            "baseBlob": {
              "tierToCool": {"daysAfterLastAccessTimeGreaterThan": 30},
              "tierToCold": {"daysAfterLastAccessTimeGreaterThan": 90},
              "tierToArchive": {"daysAfterLastAccessTimeGreaterThan": 180}
            }
          },
          "filters": {"blobTypes": ["blockBlob"]}
        }
      }
    ]
  }'
```

4. Verifique se a política foi aplicada:

```bash
az storage account management-policy show \
  --account-name <your-account-name> \
  --resource-group rg-az305-challenge20
```

:::tip
Esta mini-implantacao válida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge20 --yes --no-wait
```

---

**Próximo**: [Challenge 21: Design Data Durability and Protection](/docs/az-305/data-storage/challenge-21)
