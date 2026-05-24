---
sidebar_position: 5
title: "Desafio 38: Projetar uma Arquitetura de Mensageria"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 38: projetar uma arquitetura de mensageria

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $3-10 | **Peso no Exame: 30-35%**

:::

## IntroduÃ§Ã£o

MegaMart Ã© um marketplace online processando 500,000 pedidos por dia em 10,000 vendedores. O pipeline de processamento de pedidos e a espinha dorsal do negÃ³cio, e qualquer falha na entrega de mensagens significa receita perdida e relacionamentos danificados com vendedores. O sistema atual tem trÃªs problemas crÃ­ticos: (1) pedidos duplicados sÃ£o ocasionalmente processados quando retries ocorrem durante timeouts de rede, custando a empresa $200K/ano em reembolsos duplicados; (2) clientes premium (pagando $99/ano para processamento prioritario) veem seus pedidos processados na mesma velocidade que clientes do tier gratuito, violando o SLA premium; (3) pedidos complexos que requerem orquestraÃ§Ã£o multi-etapa (verificaÃ§Ã£o de pagamento, reserva de inventÃ¡rio, geracao de etiqueta de envio) as vezes ficam presos em um estado inconsistente quando um serviÃ§o downstream falha.

A equipe de arquitetura precisa projetar uma soluÃ§Ã£o de mensageria que garanta processamento exactly-once, suporte roteamento de mensagens baseado em prioridade, lide com transaÃ§Ãµes multi-etapa de forma confiÃ¡vel e mantenha garantias de entrega mesmo quando serviÃ§os downstream experimentam indisponibilidades prolongadas (atÃ© 4 horas).

## Habilidades do exame cobertas

- Recomendar uma arquitetura de mensageria

## Tarefas de design

### Parte 1: seleÃ§Ã£o de serviÃ§o de mensageria

1. Compare serviÃ§os de mensageria Azure para o pipeline de processamento de pedidos:

| Recurso | Azure Service Bus | Azure Storage Queues | Azure Event Grid |
|---------|-------------------|---------------------|------------------|
| Tamanho max de mensagem | 256 KB (Standard) / 100 MB (Premium) | 64 KB | 1 MB |
| Ordenacao de mensagens | Sessions (FIFO) | Sem garantia | Sem garantia |
| DetecÃ§Ã£o de duplicatas | Integrada (janela de tempo) | Nenhuma | Integrada (24 horas) |
| Dead-letter queue | Sim | NÃ£o | Sim |
| TransaÃ§Ãµes | Sim | NÃ£o | NÃ£o |
| Tamanho max da fila | 1-80 GB | 500 TB | N/A (entrega push) |
| Garantia de entrega | At-least-once / At-most-once | At-least-once | At-least-once |

2. Justifique por que Azure Service Bus Ã© necessÃ¡rio ao inves de Storage Queues para este cenÃ¡rio. Identifique quais recursos especÃ­ficos (sessions, detecÃ§Ã£o de duplicatas, dead-letter, transaÃ§Ãµes) mapeiam para quais problemas de negÃ³cio.

3. Determine se o tier Standard ou Premium do Service Bus Ã© necessÃ¡rio. Considere:
   - Volume de mensagens: 500,000 pedidos/dia = ~350/minuto em mÃ©dia, 2,000/minuto em pico
   - Requisitos de recursos: detecÃ§Ã£o de duplicatas, sessions, transaÃ§Ãµes
   - Isolamento de rede: O sistema precisa de private endpoints?

### Parte 2: design de processamento Exactly-Once

4. Projete a estratÃ©gia de detecÃ§Ã£o de duplicatas:
   - Service Bus fornece detecÃ§Ã£o de duplicatas dentro de uma janela de tempo configuravel (atÃ© 7 dias)
   - Para que o `MessageId` deve ser definido nas mensagens de pedido? (Order ID? Transaction ID?)
   - Qual Ã© a janela de tempo de detecÃ§Ã£o de duplicatas aprÃ³priada para retries de pedidos?
   - Como isso interage com lÃ³gica de retry do lado do cliente?

5. Implemente o padrÃ£o de processamento exactly-once no lado do consumidor:
   - Service Bus garante entrega at-least-once; como vocÃª alcanca semantica exactly-once?
   - Projete processamento de mensagem idempotente: check-then-process com store de deduplicacao
   - O que acontece se o consumidor crashar apos processar mas antes de completar a mensagem?
   - Como o modo PeekLock previne processamento duplicado vs modo ReceiveAndDelete?

6. Documente o ciclo de vida da mensagem para um pedido:
   - Produtor envia mensagem com MessageId = OrderId
   - DetecÃ§Ã£o de duplicatas rejeita retransmissoes dentro da janela de detecÃ§Ã£o
   - Consumidor recebe mensagem no modo PeekLock
   - Consumidor processa pedido e escreve no banco de dados em uma transaÃ§Ã£o
   - Consumidor completa (acknowledges) a mensagem
   - Se o processamento falhar, mensagem retorna a fila apos o lock expirar

### Parte 3: design de fila de prioridade

7. Projete a arquitetura de roteamento por prioridade para pedidos premium vs standard:
   - **Opcao A**: Filas separadas (premium-orders, standard-orders) com alocacao diferente de consumidores
   - **Opcao B**: Fila Ãºnica com propriedades de mensagem e filtragem no lado do consumidor
   - **Opcao C**: Service Bus Topics com subscriptions filtradas por tier do cliente

8. Avalie cada opcao:
   - Opcao A: Como vocÃª garante que a fila premium e sempre atendida primeiro?
   - Opcao B: Filtragem no lado do consumidor cria head-of-line blocking?
   - Opcao C: Como topic subscriptions com filtros SQL roteiam mensagens por prioridade?

9. Projete a estratÃ©gia de alocacao de consumidores:
   - Se usando filas separadas: aloque 70% dos consumidores para premium, 30% para standard
   - Implemente o padrÃ£o competing consumers para scaling horizontal
   - Como vocÃª previne starvation de pedidos standard durante spikes de trafego premium?

### Parte 4: orquestraÃ§Ã£o de transaÃ§Ãµes Multi-Etapa

10. Projete a saga de fulfillment de pedidos usando Service Bus:
    - Etapa 1: Verificar pagamento (chamar Payment Service via fila)
    - Etapa 2: Reservar inventÃ¡rio (chamar Inventory Service via fila)
    - Etapa 3: Gerar etiqueta de envio (chamar Shipping Service via fila)
    - Cada etapa deve completar ou disparar compensacao para etapas anteriores

11. Implemente mensageria confiÃ¡vel para a orquestraÃ§Ã£o:
    - Use Service Bus sessions para manter ordem de operaÃ§Ãµes por pedido (session ID = Order ID)
    - Use transaÃ§Ãµes para atomicamente receber uma mensagem e enviar a mensagem da prÃ³xima etapa
    - Use dead-letter queues para mensagens que falham apos nÃºmero mÃ¡ximo de tentativas de retry

12. Projete a estratÃ©gia de processamento de dead-letter queue:
    - Quais condiÃ§Ãµes devem enviar uma mensagem para a dead-letter queue?
    - Como mensagens dead-lettered devem ser monitoradas e alertadas?
    - Projete o processo de revisao manual para pedidos dead-lettered
    - Qual Ã© a polÃ­tica de retenÃ§Ã£o para mensagens dead-letter?

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-38"
  items={[
    "Service Bus selecionado ao inves de Storage Queues com justificativa baseada em recursos",
    "DetecÃ§Ã£o de duplicatas configurada com estratÃ©gia de MessageId e janela de tempo aprÃ³priadas",
    "PadrÃ£o de processamento exactly-once projetado usando PeekLock e consumidores idempotentes",
    "Arquitetura de roteamento por prioridade escolhida (filas separadas ou topic subscriptions) com alocacao de consumidores",
    "OrquestraÃ§Ã£o saga multi-etapa usa sessions e transaÃ§Ãµes para consistÃªncia",
    "EstratÃ©gia de dead-letter queue inclui monitoramento, alertas e processo de revisao manual"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: ConfiguraÃ§Ã£o de DetecÃ§Ã£o de Duplicatas</summary>

A detecÃ§Ã£o de duplicatas do Service Bus funciona mantendo uma tabela hash de MessageIds por uma janela configuravel:
- Defina `MessageId` para um identificador com significado de negÃ³cio (ex.: `OrderId` ou `OrderId-AttemptTimestamp`)
- Configure `DuplicateDetectionHistoryTimeWindow` para cobrir sua janela de retry (ex.: 10 minutos para retries de API)
- Mensagens com o mesmo MessageId dentro da janela sÃ£o silenciosamente descartadas
- O remetente recebe sucesso (nÃ£o sabe que a mensagem foi deduplicada)

Importante: Isso apenas previne envios duplicados. Para prevenir processamento duplicado, vocÃª ainda precisa de consumidores idempotentes (usando PeekLock + store de deduplicacao no banco de dados).

</details>

<details>
<summary>Dica 2: Fila de Prioridade com Topics</summary>

O padrÃ£o recomendado para mensageria com prioridade usa Service Bus Topics com subscriptions com filtro SQL:

```text
Topic: orders
â”œâ”€â”€ Subscription: premium-orders
â”‚   â””â”€â”€ SQL Filter: CustomerTier = 'Premium'
â”‚   â””â”€â”€ 8 competing consumers
â”œâ”€â”€ Subscription: standard-orders
â”‚   â””â”€â”€ SQL Filter: CustomerTier = 'Standard'
â”‚   â””â”€â”€ 4 competing consumers
```

Beneficios sobre filas separadas:
- Publicador Ãºnico (nÃ£o precisa de lÃ³gica de roteamento)
- Filtros sÃ£o avaliados no lado do servidor (sem filtragem no lado do cliente)
- Facil adicionar novos nÃ­veis de prioridade sem alterar produtores
- Cada subscription tem sua prÃ³pria dead-letter queue

Previna starvation garantindo que pelo menos 2 consumidores sempre processem a subscription standard.

</details>

<details>
<summary>Dica 3: TransaÃ§Ãµes do Service Bus</summary>

Service Bus suporta transaÃ§Ãµes para operaÃ§Ãµes atomicas dentro de uma Ãºnica entidade ou entre entidades no mesmo namespace (usando o padrÃ£o "via" ou "transfer"):

```csharp
using (var ts = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
{
    // Receive message from step-1 queue
    var msg = await receiver.ReceiveMessageAsync();
    
    // Send next step message to step-2 queue
    await sender.SendMessageAsync(new ServiceBusMessage("step2-payload"));
    
    // Complete the original message
    await receiver.CompleteMessageAsync(msg);
    
    ts.Complete(); // All three operations commit atomically
}
```

Se qualquer operaÃ§Ã£o falhar, todas sofrem rollback. Isso garante que nenhuma mensagem seja perdida ou duplicada entre etapas da saga.

</details>

<details>
<summary>Dica 4: Melhores PrÃ¡ticas de Dead-Letter Queue</summary>

Mensagens sÃ£o dead-lettered quando:
- MaxDeliveryCount e excedido (padrÃ£o: 10 tentativas)
- TTL da mensagem expira
- AvaliaÃ§Ã£o de filtro de subscription falha
- Consumidor explicitamente dead-lettera a mensagem (ex.: mensagem venenosa detectada)

Projete sua estratÃ©gia de DLQ:
1. Monitore profundidade da DLQ com alertas do Azure Monitor (alertar se profundidade > 0)
2. Configure um Function processador de DLQ que registra detalhes no Application Insights
3. Crie um dashboard administrativo para revisao manual e resubmissao
4. Retenha mensagens dead-lettered por 14 dias (TTL configuravel)
5. Categorize razoes de DLQ: transientes (resubmeter apos correcao) vs permanentes (requer intervencao manual)

</details>

## Recursos de aprendizagem

- [Azure Service Bus overview](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview)
- [Service Bus message sessions (FIFO)](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions)
- [Service Bus duplicate detection](https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection)
- [Service Bus dead-letter queues](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues)
- [Competing Consumers pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/competing-consumers)

## VerificaÃ§Ã£o de conhecimento

<details>
<summary>1. Um consumidor processa uma mensagem de pedido e escreve no banco de dados, mas crasheia antes de chamar Complete() na mensagem do Service Bus. O que acontece?</summary>

**O lock da mensagem expira e a mensagem se torna disponÃ­vel para reprocessamento.** No modo PeekLock, a mensagem e bloqueada por uma duracao configuravel (padrÃ£o 30 segundos, mÃ¡ximo 5 minutos). Se o consumidor nÃ£o chamar Complete() antes do lock expirar (devido a crash ou timeout), Service Bus torna a mensagem visÃ­vel para outros consumidores. A contagem de entregas incrementa. Para prevenir processamento duplo, o consumidor deve verificar no banco de dados se o pedido jÃ¡ foi processado antes de re-executar a lÃ³gica de negÃ³cio (processamento idempotente). Apos MaxDeliveryCount ser atingido, a mensagem e dead-lettered.

</details>

<details>
<summary>2. Por que Azure Storage Queues sÃ£o insuficientes para um sistema de processamento de pedidos que requer semantica de entrega exactly-once?</summary>

**Storage Queues carecem de detecÃ§Ã£o de duplicatas, transaÃ§Ãµes, dead-letter queues e message sessions.** Sem detecÃ§Ã£o de duplicatas integrada, a aplicaÃ§Ã£o deve implementar sua prÃ³pria lÃ³gica de deduplicacao inteiramente. Sem transaÃ§Ãµes, vocÃª nÃ£o pode atomicamente receber uma mensagem e enviar uma mensagem de acompanhamento. Sem dead-letter queues, mensagens venenosas devem ser tratadas manualmente. Sem sessions, ordenacao FIFO por cliente e impossÃ­vel. Storage Queues sÃ£o projetadas para cenÃ¡rios simples de alto volume onde entrega at-least-once e aceitavel e a aplicaÃ§Ã£o lida com toda semantica avancada por conta prÃ³pria.

</details>

<details>
<summary>3. Um pedido requer pagamento, depois reserva de inventÃ¡rio, depois geracao de etiqueta de envio. Se a reserva de inventÃ¡rio falhar, como o sistema deve compensar?</summary>

**Emita uma transaÃ§Ã£o compensatÃ³ria para reverter o pagamento, e entao notifique o cliente.** Este e o padrÃ£o Saga: cada etapa tem uma acao de compensacao correspondente. Usando Service Bus sessions (session ID = Order ID), o orquestrador rastreia quais etapas completaram. Quando a Etapa 2 (inventÃ¡rio) falha, o orquestrador envia uma mensagem "reverter pagamento" para a fila do Payment Service. TransaÃ§Ãµes do Service Bus garantem que "envio da mensagem de compensacao" e "complete da mensagem original" sÃ£o atomicos. A dead-letter queue captura pedidos que falham na compensacao, requerendo revisao manual.

</details>

<details>
<summary>4. Como o padrÃ£o competing consumers melhora o throughput para processamento de pedidos?</summary>

**MÃºltiplas instÃ¢ncias de consumidor leem da mesma fila concorrentemente, distribuindo a carga de processamento.** Com um Ãºnico consumidor processando 500,000 pedidos/dia a 1 segundo por pedido, throughput Ã© limitado a 86,400/dia. Com 10 competing consumers, throughput aumenta para 864,000/dia. Service Bus garante que cada mensagem e bloqueada para um consumidor por vez (PeekLock), prevenindo processamento duplo. Auto-scaling de consumidores baseado na profundidade da fila garante que o sistema lide com carga de pico sem superprovisionamento durante perÃ­odos tranquilos. O padrÃ£o funciona tanto com queues quanto com topic subscriptions.

</details>

## LaboratÃ³rio de validaÃ§Ã£o

Implante uma prova de conceito mÃ­nima para validar seu design:

1. Crie um grupo de recursos para este laboratÃ³rio:

```bash
az group create --name rg-az305-challenge38 --location eastus
```

2. Crie um namespace do Service Bus (tier Standard para queues e topics):

```bash
az servicebus namespace create --resource-group rg-az305-challenge38 \
  --name sb-challenge38-$RANDOM --sku Standard --location eastus
```

3. Crie uma queue com dead-lettering e detecÃ§Ã£o de duplicatas:

```bash
SB_NS=$(az servicebus namespace list --resource-group rg-az305-challenge38 --query "[0].name" -o tsv)

az servicebus queue create --resource-group rg-az305-challenge38 \
  --namespace-name $SB_NS \
  --name orders-queue \
  --enable-dead-lettering-on-message-expiration true \
  --enable-duplicate-detection true \
  --duplicate-detection-history-time-window PT10M \
  --lock-duration PT1M \
  --max-delivery-count 10
```

4. Verifique que a queue foi criada com as propriedades corretas:

```bash
az servicebus queue show --resource-group rg-az305-challenge38 \
  --namespace-name $SB_NS --name orders-queue \
  --query "{name:name, deadLettering:deadLetteringOnMessageExpiration, duplicateDetection:requiresDuplicateDetection, lockDuration:lockDuration, maxDeliveryCount:maxDeliveryCount}"
```

5. Liste as authorization rules para confirmar polÃ­ticas de acesso:

```bash
az servicebus namespace authorization-rule list \
  --resource-group rg-az305-challenge38 \
  --namespace-name $SB_NS --query "[].{name:name, rights:rights}"
```

:::tip
Esta mini-implantaÃ§Ã£o vÃ¡lida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge38 --yes --no-wait
```

---

**PrÃ³ximo**: [Challenge 39: Design an Event-Driven Architecture](/docs/az-305/infrastructure/challenge-39)
