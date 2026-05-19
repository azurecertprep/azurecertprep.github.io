---
sidebar_position: 4
title: "Desafio 37: Projetar uma Solução Serverless"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 37: projetar uma solução serverless

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $2-10 | **Peso no Exame: 30-35%**

:::

## Introdução

TicketBlitz é uma plataforma de venda de ingressos para eventos que experimenta variabilidade extrema de trafego. Quando um show popular ou evento esportivo entra em venda, a plataforma recebe de 0 a 100,000 requisicoes por segundo em questao de segundos. Entre esses eventos de venda (que acontecem 2-3 vezes por semana), o trafego cai para quase zero. A abordagem atual de infraestrutura fixa desperdica orcamento significativo: servidores ficam ociosos 95% do tempo mas devem ser superprovisionados para lidar com os 5% de carga de pico.

Além da API de venda de ingressos em tempo real, TicketBlitz tem vários requisitos de processamento em background: (1) Gerar ingressos PDF personalizados com QR codes apos cada compra (tolerante a latência, 10-30 segundos aceitavel). (2) Enviar emails de confirmacao e notificações SMS apos geracao do ingresso. (3) Processar um batch noturno de 50,000 registros de reembolso de um processador de pagamentos parceiro, aplicando regras de negócio e atualizando o banco de dados. (4) Orquestrar um workflow multi-etapa para pacotes de ingressos VIP que inclui seleção de assentos, serviços adicionais, processamento de pagamento e confirmacao, todos devendo completar atomicamente.

A equipe de engenharia quer minimizar gerenciamento de infraestrutura e pagar apenas pelo tempo real de execução. Eles precisam de um design que lide tanto com o trafego extremo em rajadas quanto com o processamento batch em background com otimização de custo aprópriada para cada padrão.

## Habilidades do exame cobertas

- Recomendar uma solução baseada em serverless
- Recomendar uma solução de computacao para processamento batch

## Tarefas de design

### Parte 1: seleção de plano Azure Functions

1. Avalie os planos de hospedagem Azure Functions para a API de venda de ingressos (0 a 100K requisicoes/segundo em rajada):

| Plano | Limite de Escala | Cold Start | Integração VNet | Modelo de Custo |
|------|-------------|------------|------------------|------------|
| Consumption | 200 instâncias | Sim (segundos) | Não | Por execução |
| Flex Consumption | 1000 instâncias | Reduzido | Sim | Por execução + always-ready |
| Premium (EP1-EP3) | 100 instâncias | Nenhum (pré-aquecido) | Sim | Por segundo + instâncias min |
| Dedicated (ASP) | 10-30 instâncias | Nenhum | Sim | Mensal fixo |

2. Determine qual plano e aprópriado para a API de venda de ingressos. Considere:
   - 100,000 requisicoes/segundo requer quantas instâncias a ~100 requisicoes/segundo por instância?
   - Cold start durante um evento de venda causaria compras falhadas. Quao crítica e a eliminacao de cold starts?
   - O limite de 200 instâncias do plano Consumption é suficiente?

3. Avalie se o plano Flex Consumption com instâncias always-ready fornece o melhor equilibrio de capacidade de burst e mitigacao de cold-start para esta carga de trabalho.

### Parte 2: design de processamento em background

4. Projete o pipeline de geracao de ingressos PDF:
   - Trigger: Mensagem na fila apos compra bem-sucedida
   - Processamento: Gerar PDF com QR code (intensivo em CPU, 2-5 segundos por ingresso)
   - Saida: Armazenar PDF no blob storage, disparar etapa de notificação
   - Qual plano de Functions e aprópriado (pode tolerar cold start, sensível a custo)?

5. Projete o serviço de notificação email/SMS:
   - Deve ser Azure Functions ou Logic Apps?
   - Compare: Functions (code-first, controle total) vs Logic Apps (baseado em conectores, designer visual)
   - Para enviar emails via SendGrid e SMS via Twilio, qual abordagem minimiza esforco de desenvolvimento?

6. Projete o processamento batch noturno de reembolsos:
   - 50,000 registros processados a noite as 2h
   - Cada registro requer: validar, calcular valor do reembolso, chamar API de pagamento, atualizar banco de dados
   - Avalie: Azure Functions com fan-out baseado em fila vs. Azure Batch para este volume
   - Qual é o tempo de execução esperado e custo para 50K registros?

### Parte 3: orquestração com Durable Functions

7. Projete o workflow de pacote de ingressos VIP usando Durable Functions:
   - Etapa 1: Reservar assentos selecionados (chamar Seats API)
   - Etapa 2: Processar serviços adicionais (comida, estacionamento, merch) - podem rodar em paralelo
   - Etapa 3: Cobrar pagamento (chamar Payment API)
   - Etapa 4: Gerar confirmacao (somente se pagamento for bem-sucedido)
   - Etapa 5: Liberar reserva de assento (somente se pagamento falhar - compensacao)

8. Identifique os padrões de Durable Functions necessários:
   - **Function chaining**: Etapas sequenciais (reservar -> pagar -> confirmar)
   - **Fan-out/fan-in**: Processamento paralelo de adicionais
   - **Human interaction**: Timeout se usuário não completar em 15 minutos
   - **Monitor**: Verificar status do pagamento até confirmado ou falhado

9. Projete o tratamento de erros para a orquestração:
   - O que acontece se a etapa de pagamento falhar apos os assentos serem reservados?
   - Como você implementa o padrão Saga (transações compensatorias)?
   - Qual é a política de retry para falhas transientes vs falhas permanentes?

### Parte 4: mitigacao de cold start e otimização de custo

10. Compare estratégias de mitigacao de cold start:
    - Instâncias pré-aquecidas (plano Premium): Sempre rodando, sem cold start, custo base maior
    - Instâncias always-ready (Flex Consumption): Mínimo configuravel, cobranca por segundo para instâncias prontas
    - Pre-aquecimento baseado em agenda: Escalar 5 minutos antes de eventos de venda conhecidos

11. Calcule a comparacao de custo mensal:
    - API de venda de ingressos: 3 eventos/semana, cada um durando 30 minutos de trafego de pico
    - Processamento em background: ~5,000 geracoes de PDF/dia, 50K reembolsos a noite
    - Orquestracoes VIP: ~500/semana
    - Compare custo total entre planos Consumption, Flex Consumption e Premium

12. Projete o diagrama de arquitetura mostrando como todos os componentes se conectam:
    - HTTP trigger (venda de ingressos) -> Queue -> Geracao PDF -> Blob -> Notificação
    - Timer trigger (batch) -> Processamento de reembolsos -> Payment API
    - HTTP trigger (VIP) -> Orquestração Durable -> múltiplas APIs backend

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-37"
  items={[
    "Plano de Functions correto selecionado para API de venda de ingressos com justificativa de cold-start",
    "Processamento em background projetado com triggers aprópriados (queue, timer, blob)",
    "Orquestração Durable Functions projetada para workflow VIP com tratamento de erros e padrão Saga",
    "Comparacao Azure Batch vs Functions documentada para carga batch noturna de 50K",
    "Comparacao de custo completada entre tipos de plano para todos os padrões de carga de trabalho",
    "Estratégia de mitigacao de cold start endereca o cenário crítico de burst de venda de ingressos"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Plano de Functions para Burst Extremo</summary>

Para 100,000 requisicoes/segundo:
- A ~100 requisicoes/segundo por instância, você precisa de ~1,000 instâncias concorrentes
- **Plano Consumption** tem limite máximo de 200 instâncias -> insuficiente
- **Plano Flex Consumption** suporta até 1,000 instâncias com scaling mais rápido e instâncias always-ready
- **Plano Premium** tem limite máximo de 100 instâncias por padrão (pode solicitar aumento) -> provavelmente insuficiente

O plano Flex Consumption e a melhor opcao: suporta a escala necessária, oferece instâncias always-ready para eliminar cold starts para as primeiras N instâncias, e fornece cobranca por execução para as instâncias de burst além do mínimo always-ready.

</details>

<details>
<summary>Dica 2: Decisao Logic Apps vs Functions</summary>

Escolha **Logic Apps** quando:
- O workflow conecta principalmente serviços existentes via conectores (400+ conectores pré-construidos)
- Não-desenvolvedores precisam construir ou modificar workflows
- Você precisa de monitoramento visual de execucoes de workflow
- Padrões de integração: B2B, EDI, SAP, Salesforce

Escolha **Azure Functions** quando:
- Lógica de negócio customizada é necessária (calculos complexos, transformacao de dados)
- Você precisa de latência sub-segundo
- A equipe prefere desenvolvimento code-first
- Controle granular sobre retries, concorrencia e batching

Para enviar emails/SMS apos geracao de PDF: Logic Apps se usando conectores padrão e querendo rastreamento visual de workflow. Functions se você precisa de lógica de template customizada ou codebase unificado.

</details>

<details>
<summary>Dica 3: Padrão Saga com Durable Functions</summary>

O padrão Saga em Durable Functions usa transações compensatorias:

```
try:
    seat_reservation = await reserve_seats(seats)
    addons = await process_addons_parallel(addon_list)
    payment = await charge_payment(total_amount)
    confirmation = await generate_confirmation(order)
except PaymentFailedException:
    await release_seat_reservation(seat_reservation)
    await cancel_addons(addons)
    await notify_customer_failure(customer)
```

Decisoes chave de design:
- Cada etapa deve ser idempotente (segura para retry)
- Ações compensatorias desfazem os efeitos de etapas bem-sucedidas
- A função orchestrator mantem estado automaticamente (estado durável)
- Defina `maxNumberOfAttempts` e `backoffCoefficient` nas políticas de retry

</details>

<details>
<summary>Dica 4: Processamento Batch em Escala</summary>

Para 50,000 registros de reembolso noturnos:
- **Azure Functions com fan-out por fila**: Coloque cada registro em uma fila, Functions processa em paralelo. A ~100 mensagens/segundo com 5 segundos de processamento, 50K registros completam em ~8 minutos. Custo: ~$0.10-0.50 por execução.
- **Azure Batch**: Melhor para tarefas de computacao de longa duracao (horas), VMs pesadas, e quando você precisa de tamanhos de VM específicos. Excessivo para 50K registros leves.

Functions e preferido porque: precificacao por execução e mais barata para tarefas curtas, sem gerenciamento de VM, auto-scales baseado na profundidade da fila, e integra naturalmente com o restante da arquitetura serverless.

</details>

## Recursos de aprendizagem

- [Azure Functions hosting options](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale)
- [Azure Functions Flex Consumption plan](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan)
- [Durable Functions patterns](https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview)
- [Choose between Azure Functions and Logic Apps](https://learn.microsoft.com/en-us/azure/azure-functions/functions-compare-logic-apps-ms-flow-webjobs)
- [Azure Batch overview](https://learn.microsoft.com/en-us/azure/batch/batch-technical-overview)

## Verificação de conhecimento

<details>
<summary>1. Um function app no plano Consumption experimenta cold starts de 3-5 segundos durante uma venda relampago. O negócio requer tempo de resposta sub-200ms para a primeira requisicao. Qual mudança de plano resolve isso?</summary>

**Mude para o plano Flex Consumption com instâncias always-ready configuradas.** Instâncias always-ready são pré-provisionadas é mantidas aquecidas, eliminando cold start para requisicoes tratadas por essas instâncias. Configure instâncias always-ready suficientes para lidar com o burst inicial enquanto a plataforma escala instâncias adicionais. Alternativamente, o plano Premium com instâncias minimas definidas como 1+ elimina cold starts inteiramente, mas com custo base maior. O plano Flex Consumption oferece um meio-termo: instâncias always-ready para baseline com scaling por execução além disso.

</details>

<details>
<summary>2. Um workflow precisa enviar um email via SendGrid, aguardar confirmacao do usuário (até 24 horas), e entao processar o pedido. Por que Durable Functions e melhor que uma Function padrão com timer?</summary>

**Durable Functions suporta nativamente o padrão "wait for external event" com persistência de estado por dias.** Uma Function padrão com timer precisaria consultar um banco de dados para status de confirmacao, desperdicando execucoes e adicionando latência. O `WaitForExternalEvent` do Durable Functions suspende a orquestração sem consumir recursos até que o evento chegue ou o timeout expire. O estado do orchestrator e persistido no Azure Storage, entao mesmo se a infraestrutura escalar para zero durante o período de espera, o workflow retoma exatamente de onde parou quando o evento chega.

</details>

<details>
<summary>3. Um batch noturno processa 50,000 registros com 5 segundos de computacao por registro. Você deve usar Azure Batch ou Azure Functions com fan-out baseado em fila?</summary>

**Azure Functions com fan-out baseado em fila.** Azure Batch é projetado para cargas de trabalho paralelas de computacao intensiva de longa duracao (renderizacao, simulacoes, genomica) onde tarefas individuais levam minutos a horas. Para 50K registros leves a 5 segundos cada, Functions fornece: scaling automático baseado na profundidade da fila, precificacao por execução (mais barato para tarefas curtas), sem atraso de provisionamento de VM, e integração perfeita com o restante da arquitetura serverless. A computacao total e aproximadamente 69 horas de trabalho single-threaded, mas com 100+ instâncias de Function concorrentes, completa em menos de 10 minutos.

</details>

<details>
<summary>4. Por que o plano Consumption e insuficiente para uma carga de trabalho que precisa fazer burst para 100,000 requisicoes por segundo?</summary>

**O plano Consumption tem um limite máximo de escala de 200 instâncias.** A aproximadamente 100 requisicoes/segundo por instância, 200 instâncias podem lidar com apenas 20,000 requisicoes/segundo, que é 5x abaixo do requisito de 100,000 requisicoes/segundo. Adicionalmente, o plano Consumption escala reativamente (adicionando instâncias baseado na carga observada), o que introduz atraso durante bursts subitos. O plano Flex Consumption suporta até 1,000 instâncias e inclui instâncias always-ready que são pré-provisionadas antes do burst chegar, tornando-o adequado para cenários de escala extrema.

</details>

## Laboratório de validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um grupo de recursos para este laboratório:

```bash
az group create --name rg-az305-challenge37 --location eastus
```

2. Crie uma conta de armazenamento (necessária pelo runtime do Functions):

```bash
az storage account create --resource-group rg-az305-challenge37 \
  --name stfunc37$RANDOM --sku Standard_LRS
```

3. Crie um Function App no plano Consumption com um HTTP trigger:

```bash
az functionapp create --resource-group rg-az305-challenge37 \
  --name func-challenge37-$RANDOM --consumption-plan-location eastus \
  --runtime node --runtime-version 20 --functions-version 4 \
  --storage-account $(az storage account list --resource-group rg-az305-challenge37 --query "[0].name" -o tsv)
```

4. Verifique que o Function App esta rodando:

```bash
az functionapp show --resource-group rg-az305-challenge37 \
  --name $(az functionapp list --resource-group rg-az305-challenge37 --query "[0].name" -o tsv) \
  --query "{State:state, HostName:defaultHostName, Plan:sku.tier}" --output table
```

:::tip
Esta mini-implantação válida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge37 --yes --no-wait
```

---

**Próximo**: [Challenge 38: Design a Messaging Architecture](/docs/az-305/infrastructure/challenge-38)
