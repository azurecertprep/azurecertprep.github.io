---
sidebar_position: 4
title: "Desafio 37: Projetar uma SoluÃ§Ã£o Serverless"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 37: projetar uma soluÃ§Ã£o serverless

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $2-10 | **Peso no Exame: 30-35%**

:::

## IntroduÃ§Ã£o

TicketBlitz Ã© uma plataforma de venda de ingressos para eventos que experimenta variabilidade extrema de trafego. Quando um show popular ou evento esportivo entra em venda, a plataforma recebe de 0 a 100,000 requisicoes por segundo em questao de segundos. Entre esses eventos de venda (que acontecem 2-3 vezes por semana), o trafego cai para quase zero. A abordagem atual de infraestrutura fixa desperdica orcamento significativo: servidores ficam ociosos 95% do tempo mas devem ser superprovisionados para lidar com os 5% de carga de pico.

AlÃ©m da API de venda de ingressos em tempo real, TicketBlitz tem vÃ¡rios requisitos de processamento em background: (1) Gerar ingressos PDF personalizados com QR codes apos cada compra (tolerante a latÃªncia, 10-30 segundos aceitavel). (2) Enviar emails de confirmacao e notificaÃ§Ãµes SMS apos geracao do ingresso. (3) Processar um batch noturno de 50,000 registros de reembolso de um processador de pagamentos parceiro, aplicando regras de negÃ³cio e atualizando o banco de dados. (4) Orquestrar um workflow multi-etapa para pacotes de ingressos VIP que inclui seleÃ§Ã£o de assentos, serviÃ§os adicionais, processamento de pagamento e confirmacao, todos devendo completar atomicamente.

A equipe de engenharia quer minimizar gerenciamento de infraestrutura e pagar apenas pelo tempo real de execuÃ§Ã£o. Eles precisam de um design que lide tanto com o trafego extremo em rajadas quanto com o processamento batch em background com otimizaÃ§Ã£o de custo aprÃ³priada para cada padrÃ£o.

## Habilidades do exame cobertas

- Recomendar uma soluÃ§Ã£o baseada em serverless
- Recomendar uma soluÃ§Ã£o de computacao para processamento batch

## Tarefas de design

### Parte 1: seleÃ§Ã£o de plano Azure Functions

1. Avalie os planos de hospedagem Azure Functions para a API de venda de ingressos (0 a 100K requisicoes/segundo em rajada):

| Plano | Limite de Escala | Cold Start | IntegraÃ§Ã£o VNet | Modelo de Custo |
|------|-------------|------------|------------------|------------|
| Consumption | 200 instÃ¢ncias | Sim (segundos) | NÃ£o | Por execuÃ§Ã£o |
| Flex Consumption | 1000 instÃ¢ncias | Reduzido | Sim | Por execuÃ§Ã£o + always-ready |
| Premium (EP1-EP3) | 100 instÃ¢ncias | Nenhum (prÃ©-aquecido) | Sim | Por segundo + instÃ¢ncias min |
| Dedicated (ASP) | 10-30 instÃ¢ncias | Nenhum | Sim | Mensal fixo |

2. Determine qual plano e aprÃ³priado para a API de venda de ingressos. Considere:
   - 100,000 requisicoes/segundo requer quantas instÃ¢ncias a ~100 requisicoes/segundo por instÃ¢ncia?
   - Cold start durante um evento de venda causaria compras falhadas. Quao crÃ­tica e a eliminacao de cold starts?
   - O limite de 200 instÃ¢ncias do plano Consumption Ã© suficiente?

3. Avalie se o plano Flex Consumption com instÃ¢ncias always-ready fornece o melhor equilibrio de capacidade de burst e mitigacao de cold-start para esta carga de trabalho.

### Parte 2: design de processamento em background

4. Projete o pipeline de geracao de ingressos PDF:
   - Trigger: Mensagem na fila apos compra bem-sucedida
   - Processamento: Gerar PDF com QR code (intensivo em CPU, 2-5 segundos por ingresso)
   - Saida: Armazenar PDF no blob storage, disparar etapa de notificaÃ§Ã£o
   - Qual plano de Functions e aprÃ³priado (pode tolerar cold start, sensÃ­vel a custo)?

5. Projete o serviÃ§o de notificaÃ§Ã£o email/SMS:
   - Deve ser Azure Functions ou Logic Apps?
   - Compare: Functions (code-first, controle total) vs Logic Apps (baseado em conectores, designer visual)
   - Para enviar emails via SendGrid e SMS via Twilio, qual abordagem minimiza esforco de desenvolvimento?

6. Projete o processamento batch noturno de reembolsos:
   - 50,000 registros processados a noite as 2h
   - Cada registro requer: validar, calcular valor do reembolso, chamar API de pagamento, atualizar banco de dados
   - Avalie: Azure Functions com fan-out baseado em fila vs. Azure Batch para este volume
   - Qual Ã© o tempo de execuÃ§Ã£o esperado e custo para 50K registros?

### Parte 3: orquestraÃ§Ã£o com Durable Functions

7. Projete o workflow de pacote de ingressos VIP usando Durable Functions:
   - Etapa 1: Reservar assentos selecionados (chamar Seats API)
   - Etapa 2: Processar serviÃ§os adicionais (comida, estacionamento, merch) - podem rodar em paralelo
   - Etapa 3: Cobrar pagamento (chamar Payment API)
   - Etapa 4: Gerar confirmacao (somente se pagamento for bem-sucedido)
   - Etapa 5: Liberar reserva de assento (somente se pagamento falhar - compensacao)

8. Identifique os padrÃµes de Durable Functions necessÃ¡rios:
   - **Function chaining**: Etapas sequenciais (reservar -> pagar -> confirmar)
   - **Fan-out/fan-in**: Processamento paralelo de adicionais
   - **Human interaction**: Timeout se usuÃ¡rio nÃ£o completar em 15 minutos
   - **Monitor**: Verificar status do pagamento atÃ© confirmado ou falhado

9. Projete o tratamento de erros para a orquestraÃ§Ã£o:
   - O que acontece se a etapa de pagamento falhar apos os assentos serem reservados?
   - Como vocÃª implementa o padrÃ£o Saga (transaÃ§Ãµes compensatorias)?
   - Qual Ã© a polÃ­tica de retry para falhas transientes vs falhas permanentes?

### Parte 4: mitigacao de cold start e otimizaÃ§Ã£o de custo

10. Compare estratÃ©gias de mitigacao de cold start:
    - InstÃ¢ncias prÃ©-aquecidas (plano Premium): Sempre rodando, sem cold start, custo base maior
    - InstÃ¢ncias always-ready (Flex Consumption): MÃ­nimo configuravel, cobranca por segundo para instÃ¢ncias prontas
    - Pre-aquecimento baseado em agenda: Escalar 5 minutos antes de eventos de venda conhecidos

11. Calcule a comparacao de custo mensal:
    - API de venda de ingressos: 3 eventos/semana, cada um durando 30 minutos de trafego de pico
    - Processamento em background: ~5,000 geracoes de PDF/dia, 50K reembolsos a noite
    - Orquestracoes VIP: ~500/semana
    - Compare custo total entre planos Consumption, Flex Consumption e Premium

12. Projete o diagrama de arquitetura mostrando como todos os componentes se conectam:
    - HTTP trigger (venda de ingressos) -> Queue -> Geracao PDF -> Blob -> NotificaÃ§Ã£o
    - Timer trigger (batch) -> Processamento de reembolsos -> Payment API
    - HTTP trigger (VIP) -> OrquestraÃ§Ã£o Durable -> mÃºltiplas APIs backend

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-37"
  items={[
    "Plano de Functions correto selecionado para API de venda de ingressos com justificativa de cold-start",
    "Processamento em background projetado com triggers aprÃ³priados (queue, timer, blob)",
    "OrquestraÃ§Ã£o Durable Functions projetada para workflow VIP com tratamento de erros e padrÃ£o Saga",
    "Comparacao Azure Batch vs Functions documentada para carga batch noturna de 50K",
    "Comparacao de custo completada entre tipos de plano para todos os padrÃµes de carga de trabalho",
    "EstratÃ©gia de mitigacao de cold start endereca o cenÃ¡rio crÃ­tico de burst de venda de ingressos"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Plano de Functions para Burst Extremo</summary>

Para 100,000 requisicoes/segundo:
- A ~100 requisicoes/segundo por instÃ¢ncia, vocÃª precisa de ~1,000 instÃ¢ncias concorrentes
- **Plano Consumption** tem limite mÃ¡ximo de 200 instÃ¢ncias -> insuficiente
- **Plano Flex Consumption** suporta atÃ© 1,000 instÃ¢ncias com scaling mais rÃ¡pido e instÃ¢ncias always-ready
- **Plano Premium** tem limite mÃ¡ximo de 100 instÃ¢ncias por padrÃ£o (pode solicitar aumento) -> provavelmente insuficiente

O plano Flex Consumption e a melhor opcao: suporta a escala necessÃ¡ria, oferece instÃ¢ncias always-ready para eliminar cold starts para as primeiras N instÃ¢ncias, e fornece cobranca por execuÃ§Ã£o para as instÃ¢ncias de burst alÃ©m do mÃ­nimo always-ready.

</details>

<details>
<summary>Dica 2: Decisao Logic Apps vs Functions</summary>

Escolha **Logic Apps** quando:
- O workflow conecta principalmente serviÃ§os existentes via conectores (400+ conectores prÃ©-construidos)
- NÃ£o-desenvolvedores precisam construir ou modificar workflows
- VocÃª precisa de monitoramento visual de execucoes de workflow
- PadrÃµes de integraÃ§Ã£o: B2B, EDI, SAP, Salesforce

Escolha **Azure Functions** quando:
- LÃ³gica de negÃ³cio customizada Ã© necessÃ¡ria (calculos complexos, transformacao de dados)
- VocÃª precisa de latÃªncia sub-segundo
- A equipe prefere desenvolvimento code-first
- Controle granular sobre retries, concorrencia e batching

Para enviar emails/SMS apos geracao de PDF: Logic Apps se usando conectores padrÃ£o e querendo rastreamento visual de workflow. Functions se vocÃª precisa de lÃ³gica de template customizada ou codebase unificado.

</details>

<details>
<summary>Dica 3: PadrÃ£o Saga com Durable Functions</summary>

O padrÃ£o Saga em Durable Functions usa transaÃ§Ãµes compensatorias:

```text
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
- AÃ§Ãµes compensatorias desfazem os efeitos de etapas bem-sucedidas
- A funÃ§Ã£o orchestrator mantem estado automaticamente (estado durÃ¡vel)
- Defina `maxNumberOfAttempts` e `backoffCoefficient` nas polÃ­ticas de retry

</details>

<details>
<summary>Dica 4: Processamento Batch em Escala</summary>

Para 50,000 registros de reembolso noturnos:
- **Azure Functions com fan-out por fila**: Coloque cada registro em uma fila, Functions processa em paralelo. A ~100 mensagens/segundo com 5 segundos de processamento, 50K registros completam em ~8 minutos. Custo: ~$0.10-0.50 por execuÃ§Ã£o.
- **Azure Batch**: Melhor para tarefas de computacao de longa duracao (horas), VMs pesadas, e quando vocÃª precisa de tamanhos de VM especÃ­ficos. Excessivo para 50K registros leves.

Functions e preferido porque: precificacao por execuÃ§Ã£o e mais barata para tarefas curtas, sem gerenciamento de VM, auto-scales baseado na profundidade da fila, e integra naturalmente com o restante da arquitetura serverless.

</details>

## Recursos de aprendizagem

- [Azure Functions hosting options](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale)
- [Azure Functions Flex Consumption plan](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan)
- [Durable Functions patterns](https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview)
- [Choose between Azure Functions and Logic Apps](https://learn.microsoft.com/en-us/azure/azure-functions/functions-compare-logic-apps-ms-flow-webjobs)
- [Azure Batch overview](https://learn.microsoft.com/en-us/azure/batch/batch-technical-overview)

## VerificaÃ§Ã£o de conhecimento

<details>
<summary>1. Um function app no plano Consumption experimenta cold starts de 3-5 segundos durante uma venda relampago. O negÃ³cio requer tempo de resposta sub-200ms para a primeira requisicao. Qual mudanÃ§a de plano resolve isso?</summary>

**Mude para o plano Flex Consumption com instÃ¢ncias always-ready configuradas.** InstÃ¢ncias always-ready sÃ£o prÃ©-provisionadas Ã© mantidas aquecidas, eliminando cold start para requisicoes tratadas por essas instÃ¢ncias. Configure instÃ¢ncias always-ready suficientes para lidar com o burst inicial enquanto a plataforma escala instÃ¢ncias adicionais. Alternativamente, o plano Premium com instÃ¢ncias minimas definidas como 1+ elimina cold starts inteiramente, mas com custo base maior. O plano Flex Consumption oferece um meio-termo: instÃ¢ncias always-ready para baseline com scaling por execuÃ§Ã£o alÃ©m disso.

</details>

<details>
<summary>2. Um workflow precisa enviar um email via SendGrid, aguardar confirmacao do usuÃ¡rio (atÃ© 24 horas), e entao processar o pedido. Por que Durable Functions e melhor que uma Function padrÃ£o com timer?</summary>

**Durable Functions suporta nativamente o padrÃ£o "wait for external event" com persistÃªncia de estado por dias.** Uma Function padrÃ£o com timer precisaria consultar um banco de dados para status de confirmacao, desperdicando execucoes e adicionando latÃªncia. O `WaitForExternalEvent` do Durable Functions suspende a orquestraÃ§Ã£o sem consumir recursos atÃ© que o evento chegue ou o timeout expire. O estado do orchestrator e persistido no Azure Storage, entao mesmo se a infraestrutura escalar para zero durante o perÃ­odo de espera, o workflow retoma exatamente de onde parou quando o evento chega.

</details>

<details>
<summary>3. Um batch noturno processa 50,000 registros com 5 segundos de computacao por registro. VocÃª deve usar Azure Batch ou Azure Functions com fan-out baseado em fila?</summary>

**Azure Functions com fan-out baseado em fila.** Azure Batch Ã© projetado para cargas de trabalho paralelas de computacao intensiva de longa duracao (renderizacao, simulacoes, genomica) onde tarefas individuais levam minutos a horas. Para 50K registros leves a 5 segundos cada, Functions fornece: scaling automÃ¡tico baseado na profundidade da fila, precificacao por execuÃ§Ã£o (mais barato para tarefas curtas), sem atraso de provisionamento de VM, e integraÃ§Ã£o perfeita com o restante da arquitetura serverless. A computacao total e aproximadamente 69 horas de trabalho single-threaded, mas com 100+ instÃ¢ncias de Function concorrentes, completa em menos de 10 minutos.

</details>

<details>
<summary>4. Por que o plano Consumption e insuficiente para uma carga de trabalho que precisa fazer burst para 100,000 requisicoes por segundo?</summary>

**O plano Consumption tem um limite mÃ¡ximo de escala de 200 instÃ¢ncias.** A aproximadamente 100 requisicoes/segundo por instÃ¢ncia, 200 instÃ¢ncias podem lidar com apenas 20,000 requisicoes/segundo, que Ã© 5x abaixo do requisito de 100,000 requisicoes/segundo. Adicionalmente, o plano Consumption escala reativamente (adicionando instÃ¢ncias baseado na carga observada), o que introduz atraso durante bursts subitos. O plano Flex Consumption suporta atÃ© 1,000 instÃ¢ncias e inclui instÃ¢ncias always-ready que sÃ£o prÃ©-provisionadas antes do burst chegar, tornando-o adequado para cenÃ¡rios de escala extrema.

</details>

## LaboratÃ³rio de validaÃ§Ã£o

Implante uma prova de conceito mÃ­nima para validar seu design:

1. Crie um grupo de recursos para este laboratÃ³rio:

```bash
az group create --name rg-az305-challenge37 --location eastus
```

2. Crie uma conta de armazenamento (necessÃ¡ria pelo runtime do Functions):

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
Esta mini-implantaÃ§Ã£o vÃ¡lida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge37 --yes --no-wait
```

---

**PrÃ³ximo**: [Challenge 38: Design a Messaging Architecture](/docs/az-305/infrastructure/challenge-38)
