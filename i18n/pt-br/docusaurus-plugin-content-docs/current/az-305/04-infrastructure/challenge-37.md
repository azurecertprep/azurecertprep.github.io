---
sidebar_position: 4
title: "Challenge 37: Design a Serverless Solution"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 37: Design a Serverless Solution

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $2-10 | **Peso no Exame: 30-35%**

:::

## Introducao

TicketBlitz e uma plataforma de venda de ingressos para eventos que experimenta variabilidade extrema de trafego. Quando um show popular ou evento esportivo entra em venda, a plataforma recebe de 0 a 100,000 requisicoes por segundo em questao de segundos. Entre esses eventos de venda (que acontecem 2-3 vezes por semana), o trafego cai para quase zero. A abordagem atual de infraestrutura fixa desperdica orcamento significativo: servidores ficam ociosos 95% do tempo mas devem ser superprovisionados para lidar com os 5% de carga de pico.

Alem da API de venda de ingressos em tempo real, TicketBlitz tem varios requisitos de processamento em background: (1) Gerar ingressos PDF personalizados com QR codes apos cada compra (tolerante a latencia, 10-30 segundos aceitavel). (2) Enviar emails de confirmacao e notificacoes SMS apos geracao do ingresso. (3) Processar um batch noturno de 50,000 registros de reembolso de um processador de pagamentos parceiro, aplicando regras de negocio e atualizando o banco de dados. (4) Orquestrar um workflow multi-etapa para pacotes de ingressos VIP que inclui selecao de assentos, servicos adicionais, processamento de pagamento e confirmacao, todos devendo completar atomicamente.

A equipe de engenharia quer minimizar gerenciamento de infraestrutura e pagar apenas pelo tempo real de execucao. Eles precisam de um design que lide tanto com o trafego extremo em rajadas quanto com o processamento batch em background com otimizacao de custo apropriada para cada padrao.

## Habilidades do Exame Cobertas

- Recomendar uma solucao baseada em serverless
- Recomendar uma solucao de computacao para processamento batch

## Tarefas de Design

### Parte 1: Selecao de Plano Azure Functions

1. Avalie os planos de hospedagem Azure Functions para a API de venda de ingressos (0 a 100K requisicoes/segundo em rajada):

| Plano | Limite de Escala | Cold Start | Integracao VNet | Modelo de Custo |
|------|-------------|------------|------------------|------------|
| Consumption | 200 instancias | Sim (segundos) | Nao | Por execucao |
| Flex Consumption | 1000 instancias | Reduzido | Sim | Por execucao + always-ready |
| Premium (EP1-EP3) | 100 instancias | Nenhum (pre-aquecido) | Sim | Por segundo + instancias min |
| Dedicated (ASP) | 10-30 instancias | Nenhum | Sim | Mensal fixo |

2. Determine qual plano e apropriado para a API de venda de ingressos. Considere:
   - 100,000 requisicoes/segundo requer quantas instancias a ~100 requisicoes/segundo por instancia?
   - Cold start durante um evento de venda causaria compras falhadas. Quao critica e a eliminacao de cold starts?
   - O limite de 200 instancias do plano Consumption e suficiente?

3. Avalie se o plano Flex Consumption com instancias always-ready fornece o melhor equilibrio de capacidade de burst e mitigacao de cold-start para esta carga de trabalho.

### Parte 2: Design de Processamento em Background

4. Projete o pipeline de geracao de ingressos PDF:
   - Trigger: Mensagem na fila apos compra bem-sucedida
   - Processamento: Gerar PDF com QR code (intensivo em CPU, 2-5 segundos por ingresso)
   - Saida: Armazenar PDF no blob storage, disparar etapa de notificacao
   - Qual plano de Functions e apropriado (pode tolerar cold start, sensivel a custo)?

5. Projete o servico de notificacao email/SMS:
   - Deve ser Azure Functions ou Logic Apps?
   - Compare: Functions (code-first, controle total) vs Logic Apps (baseado em conectores, designer visual)
   - Para enviar emails via SendGrid e SMS via Twilio, qual abordagem minimiza esforco de desenvolvimento?

6. Projete o processamento batch noturno de reembolsos:
   - 50,000 registros processados a noite as 2h
   - Cada registro requer: validar, calcular valor do reembolso, chamar API de pagamento, atualizar banco de dados
   - Avalie: Azure Functions com fan-out baseado em fila vs. Azure Batch para este volume
   - Qual e o tempo de execucao esperado e custo para 50K registros?

### Parte 3: Orquestracao com Durable Functions

7. Projete o workflow de pacote de ingressos VIP usando Durable Functions:
   - Etapa 1: Reservar assentos selecionados (chamar Seats API)
   - Etapa 2: Processar servicos adicionais (comida, estacionamento, merch) - podem rodar em paralelo
   - Etapa 3: Cobrar pagamento (chamar Payment API)
   - Etapa 4: Gerar confirmacao (somente se pagamento for bem-sucedido)
   - Etapa 5: Liberar reserva de assento (somente se pagamento falhar - compensacao)

8. Identifique os padroes de Durable Functions necessarios:
   - **Function chaining**: Etapas sequenciais (reservar -> pagar -> confirmar)
   - **Fan-out/fan-in**: Processamento paralelo de adicionais
   - **Human interaction**: Timeout se usuario nao completar em 15 minutos
   - **Monitor**: Verificar status do pagamento ate confirmado ou falhado

9. Projete o tratamento de erros para a orquestracao:
   - O que acontece se a etapa de pagamento falhar apos os assentos serem reservados?
   - Como voce implementa o padrao Saga (transacoes compensatorias)?
   - Qual e a politica de retry para falhas transientes vs falhas permanentes?

### Parte 4: Mitigacao de Cold Start e Otimizacao de Custo

10. Compare estrategias de mitigacao de cold start:
    - Instancias pre-aquecidas (plano Premium): Sempre rodando, sem cold start, custo base maior
    - Instancias always-ready (Flex Consumption): Minimo configuravel, cobranca por segundo para instancias prontas
    - Pre-aquecimento baseado em agenda: Escalar 5 minutos antes de eventos de venda conhecidos

11. Calcule a comparacao de custo mensal:
    - API de venda de ingressos: 3 eventos/semana, cada um durando 30 minutos de trafego de pico
    - Processamento em background: ~5,000 geracoes de PDF/dia, 50K reembolsos a noite
    - Orquestracoes VIP: ~500/semana
    - Compare custo total entre planos Consumption, Flex Consumption e Premium

12. Projete o diagrama de arquitetura mostrando como todos os componentes se conectam:
    - HTTP trigger (venda de ingressos) -> Queue -> Geracao PDF -> Blob -> Notificacao
    - Timer trigger (batch) -> Processamento de reembolsos -> Payment API
    - HTTP trigger (VIP) -> Orquestracao Durable -> multiplas APIs backend

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-37"
  items={[
    "Plano de Functions correto selecionado para API de venda de ingressos com justificativa de cold-start",
    "Processamento em background projetado com triggers apropriados (queue, timer, blob)",
    "Orquestracao Durable Functions projetada para workflow VIP com tratamento de erros e padrao Saga",
    "Comparacao Azure Batch vs Functions documentada para carga batch noturna de 50K",
    "Comparacao de custo completada entre tipos de plano para todos os padroes de carga de trabalho",
    "Estrategia de mitigacao de cold start endereca o cenario critico de burst de venda de ingressos"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Plano de Functions para Burst Extremo</summary>

Para 100,000 requisicoes/segundo:
- A ~100 requisicoes/segundo por instancia, voce precisa de ~1,000 instancias concorrentes
- **Plano Consumption** tem limite maximo de 200 instancias -> insuficiente
- **Plano Flex Consumption** suporta ate 1,000 instancias com scaling mais rapido e instancias always-ready
- **Plano Premium** tem limite maximo de 100 instancias por padrao (pode solicitar aumento) -> provavelmente insuficiente

O plano Flex Consumption e a melhor opcao: suporta a escala necessaria, oferece instancias always-ready para eliminar cold starts para as primeiras N instancias, e fornece cobranca por execucao para as instancias de burst alem do minimo always-ready.

</details>

<details>
<summary>Dica 2: Decisao Logic Apps vs Functions</summary>

Escolha **Logic Apps** quando:
- O workflow conecta principalmente servicos existentes via conectores (400+ conectores pre-construidos)
- Nao-desenvolvedores precisam construir ou modificar workflows
- Voce precisa de monitoramento visual de execucoes de workflow
- Padroes de integracao: B2B, EDI, SAP, Salesforce

Escolha **Azure Functions** quando:
- Logica de negocio customizada e necessaria (calculos complexos, transformacao de dados)
- Voce precisa de latencia sub-segundo
- A equipe prefere desenvolvimento code-first
- Controle granular sobre retries, concorrencia e batching

Para enviar emails/SMS apos geracao de PDF: Logic Apps se usando conectores padrao e querendo rastreamento visual de workflow. Functions se voce precisa de logica de template customizada ou codebase unificado.

</details>

<details>
<summary>Dica 3: Padrao Saga com Durable Functions</summary>

O padrao Saga em Durable Functions usa transacoes compensatorias:

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
- Acoes compensatorias desfazem os efeitos de etapas bem-sucedidas
- A funcao orchestrator mantem estado automaticamente (estado duravel)
- Defina `maxNumberOfAttempts` e `backoffCoefficient` nas politicas de retry

</details>

<details>
<summary>Dica 4: Processamento Batch em Escala</summary>

Para 50,000 registros de reembolso noturnos:
- **Azure Functions com fan-out por fila**: Coloque cada registro em uma fila, Functions processa em paralelo. A ~100 mensagens/segundo com 5 segundos de processamento, 50K registros completam em ~8 minutos. Custo: ~$0.10-0.50 por execucao.
- **Azure Batch**: Melhor para tarefas de computacao de longa duracao (horas), VMs pesadas, e quando voce precisa de tamanhos de VM especificos. Excessivo para 50K registros leves.

Functions e preferido porque: precificacao por execucao e mais barata para tarefas curtas, sem gerenciamento de VM, auto-scales baseado na profundidade da fila, e integra naturalmente com o restante da arquitetura serverless.

</details>

## Recursos de Aprendizagem

- [Azure Functions hosting options](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale)
- [Azure Functions Flex Consumption plan](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan)
- [Durable Functions patterns](https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview)
- [Choose between Azure Functions and Logic Apps](https://learn.microsoft.com/en-us/azure/azure-functions/functions-compare-logic-apps-ms-flow-webjobs)
- [Azure Batch overview](https://learn.microsoft.com/en-us/azure/batch/batch-technical-overview)

## Verificacao de Conhecimento

<details>
<summary>1. Um function app no plano Consumption experimenta cold starts de 3-5 segundos durante uma venda relampago. O negocio requer tempo de resposta sub-200ms para a primeira requisicao. Qual mudanca de plano resolve isso?</summary>

**Mude para o plano Flex Consumption com instancias always-ready configuradas.** Instancias always-ready sao pre-provisionadas e mantidas aquecidas, eliminando cold start para requisicoes tratadas por essas instancias. Configure instancias always-ready suficientes para lidar com o burst inicial enquanto a plataforma escala instancias adicionais. Alternativamente, o plano Premium com instancias minimas definidas como 1+ elimina cold starts inteiramente, mas com custo base maior. O plano Flex Consumption oferece um meio-termo: instancias always-ready para baseline com scaling por execucao alem disso.

</details>

<details>
<summary>2. Um workflow precisa enviar um email via SendGrid, aguardar confirmacao do usuario (ate 24 horas), e entao processar o pedido. Por que Durable Functions e melhor que uma Function padrao com timer?</summary>

**Durable Functions suporta nativamente o padrao "wait for external event" com persistencia de estado por dias.** Uma Function padrao com timer precisaria consultar um banco de dados para status de confirmacao, desperdicando execucoes e adicionando latencia. O `WaitForExternalEvent` do Durable Functions suspende a orquestracao sem consumir recursos ate que o evento chegue ou o timeout expire. O estado do orchestrator e persistido no Azure Storage, entao mesmo se a infraestrutura escalar para zero durante o periodo de espera, o workflow retoma exatamente de onde parou quando o evento chega.

</details>

<details>
<summary>3. Um batch noturno processa 50,000 registros com 5 segundos de computacao por registro. Voce deve usar Azure Batch ou Azure Functions com fan-out baseado em fila?</summary>

**Azure Functions com fan-out baseado em fila.** Azure Batch e projetado para cargas de trabalho paralelas de computacao intensiva de longa duracao (renderizacao, simulacoes, genomica) onde tarefas individuais levam minutos a horas. Para 50K registros leves a 5 segundos cada, Functions fornece: scaling automatico baseado na profundidade da fila, precificacao por execucao (mais barato para tarefas curtas), sem atraso de provisionamento de VM, e integracao perfeita com o restante da arquitetura serverless. A computacao total e aproximadamente 69 horas de trabalho single-threaded, mas com 100+ instancias de Function concorrentes, completa em menos de 10 minutos.

</details>

<details>
<summary>4. Por que o plano Consumption e insuficiente para uma carga de trabalho que precisa fazer burst para 100,000 requisicoes por segundo?</summary>

**O plano Consumption tem um limite maximo de escala de 200 instancias.** A aproximadamente 100 requisicoes/segundo por instancia, 200 instancias podem lidar com apenas 20,000 requisicoes/segundo, que e 5x abaixo do requisito de 100,000 requisicoes/segundo. Adicionalmente, o plano Consumption escala reativamente (adicionando instancias baseado na carga observada), o que introduz atraso durante bursts subitos. O plano Flex Consumption suporta ate 1,000 instancias e inclui instancias always-ready que sao pre-provisionadas antes do burst chegar, tornando-o adequado para cenarios de escala extrema.

</details>

## Laboratorio de Validacao

Implante uma prova de conceito minima para validar seu design:

1. Crie um grupo de recursos para este laboratorio:

```bash
az group create --name rg-az305-challenge37 --location eastus
```

2. Crie uma conta de armazenamento (necessaria pelo runtime do Functions):

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
Esta mini-implantacao valida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge37 --yes --no-wait
```

---

**Proximo**: [Challenge 38: Design a Messaging Architecture](/docs/az-305/infrastructure/challenge-38)
