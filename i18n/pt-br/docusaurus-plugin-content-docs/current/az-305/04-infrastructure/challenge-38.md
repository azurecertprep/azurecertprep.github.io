---
sidebar_position: 5
title: "Desafio 38: Projetar uma Arquitetura de Mensageria"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 38: projetar uma arquitetura de mensageria

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $3-10 | **Peso no Exame: 30-35%**

:::

## Introdução

MegaMart é um marketplace online processando 500,000 pedidos por dia em 10,000 vendedores. O pipeline de processamento de pedidos e a espinha dorsal do negócio, e qualquer falha na entrega de mensagens significa receita perdida e relacionamentos danificados com vendedores. O sistema atual tem três problemas críticos: (1) pedidos duplicados são ocasionalmente processados quando retries ocorrem durante timeouts de rede, custando a empresa $200K/ano em reembolsos duplicados; (2) clientes premium (pagando $99/ano para processamento prioritario) veem seus pedidos processados na mesma velocidade que clientes do tier gratuito, violando o SLA premium; (3) pedidos complexos que requerem orquestração multi-etapa (verificação de pagamento, reserva de inventário, geracao de etiqueta de envio) as vezes ficam presos em um estado inconsistente quando um serviço downstream falha.

A equipe de arquitetura precisa projetar uma solução de mensageria que garanta processamento exactly-once, suporte roteamento de mensagens baseado em prioridade, lide com transações multi-etapa de forma confiável e mantenha garantias de entrega mesmo quando serviços downstream experimentam indisponibilidades prolongadas (até 4 horas).

## Habilidades do exame cobertas

- Recomendar uma arquitetura de mensageria

## Tarefas de design

### Parte 1: seleção de serviço de mensageria

1. Compare serviços de mensageria Azure para o pipeline de processamento de pedidos:

| Recurso | Azure Service Bus | Azure Storage Queues | Azure Event Grid |
|---------|-------------------|---------------------|------------------|
| Tamanho max de mensagem | 256 KB (Standard) / 100 MB (Premium) | 64 KB | 1 MB |
| Ordenacao de mensagens | Sessions (FIFO) | Sem garantia | Sem garantia |
| Detecção de duplicatas | Integrada (janela de tempo) | Nenhuma | Integrada (24 horas) |
| Dead-letter queue | Sim | Não | Sim |
| Transações | Sim | Não | Não |
| Tamanho max da fila | 1-80 GB | 500 TB | N/A (entrega push) |
| Garantia de entrega | At-least-once / At-most-once | At-least-once | At-least-once |

2. Justifique por que Azure Service Bus é necessário ao inves de Storage Queues para este cenário. Identifique quais recursos específicos (sessions, detecção de duplicatas, dead-letter, transações) mapeiam para quais problemas de negócio.

3. Determine se o tier Standard ou Premium do Service Bus é necessário. Considere:
   - Volume de mensagens: 500,000 pedidos/dia = ~350/minuto em média, 2,000/minuto em pico
   - Requisitos de recursos: detecção de duplicatas, sessions, transações
   - Isolamento de rede: O sistema precisa de private endpoints?

### Parte 2: design de processamento Exactly-Once

4. Projete a estratégia de detecção de duplicatas:
   - Service Bus fornece detecção de duplicatas dentro de uma janela de tempo configuravel (até 7 dias)
   - Para que o `MessageId` deve ser definido nas mensagens de pedido? (Order ID? Transaction ID?)
   - Qual é a janela de tempo de detecção de duplicatas aprópriada para retries de pedidos?
   - Como isso interage com lógica de retry do lado do cliente?

5. Implemente o padrão de processamento exactly-once no lado do consumidor:
   - Service Bus garante entrega at-least-once; como você alcanca semantica exactly-once?
   - Projete processamento de mensagem idempotente: check-then-process com store de deduplicacao
   - O que acontece se o consumidor crashar apos processar mas antes de completar a mensagem?
   - Como o modo PeekLock previne processamento duplicado vs modo ReceiveAndDelete?

6. Documente o ciclo de vida da mensagem para um pedido:
   - Produtor envia mensagem com MessageId = OrderId
   - Detecção de duplicatas rejeita retransmissoes dentro da janela de detecção
   - Consumidor recebe mensagem no modo PeekLock
   - Consumidor processa pedido e escreve no banco de dados em uma transação
   - Consumidor completa (acknowledges) a mensagem
   - Se o processamento falhar, mensagem retorna a fila apos o lock expirar

### Parte 3: design de fila de prioridade

7. Projete a arquitetura de roteamento por prioridade para pedidos premium vs standard:
   - **Opcao A**: Filas separadas (premium-orders, standard-orders) com alocacao diferente de consumidores
   - **Opcao B**: Fila única com propriedades de mensagem e filtragem no lado do consumidor
   - **Opcao C**: Service Bus Topics com subscriptions filtradas por tier do cliente

8. Avalie cada opcao:
   - Opcao A: Como você garante que a fila premium e sempre atendida primeiro?
   - Opcao B: Filtragem no lado do consumidor cria head-of-line blocking?
   - Opcao C: Como topic subscriptions com filtros SQL roteiam mensagens por prioridade?

9. Projete a estratégia de alocacao de consumidores:
   - Se usando filas separadas: aloque 70% dos consumidores para premium, 30% para standard
   - Implemente o padrão competing consumers para scaling horizontal
   - Como você previne starvation de pedidos standard durante spikes de trafego premium?

### Parte 4: orquestração de transações Multi-Etapa

10. Projete a saga de fulfillment de pedidos usando Service Bus:
    - Etapa 1: Verificar pagamento (chamar Payment Service via fila)
    - Etapa 2: Reservar inventário (chamar Inventory Service via fila)
    - Etapa 3: Gerar etiqueta de envio (chamar Shipping Service via fila)
    - Cada etapa deve completar ou disparar compensacao para etapas anteriores

11. Implemente mensageria confiável para a orquestração:
    - Use Service Bus sessions para manter ordem de operações por pedido (session ID = Order ID)
    - Use transações para atomicamente receber uma mensagem e enviar a mensagem da próxima etapa
    - Use dead-letter queues para mensagens que falham apos número máximo de tentativas de retry

12. Projete a estratégia de processamento de dead-letter queue:
    - Quais condições devem enviar uma mensagem para a dead-letter queue?
    - Como mensagens dead-lettered devem ser monitoradas e alertadas?
    - Projete o processo de revisao manual para pedidos dead-lettered
    - Qual é a política de retenção para mensagens dead-letter?

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-38"
  items={[
    "Service Bus selecionado ao inves de Storage Queues com justificativa baseada em recursos",
    "Detecção de duplicatas configurada com estratégia de MessageId e janela de tempo aprópriadas",
    "Padrão de processamento exactly-once projetado usando PeekLock e consumidores idempotentes",
    "Arquitetura de roteamento por prioridade escolhida (filas separadas ou topic subscriptions) com alocacao de consumidores",
    "Orquestração saga multi-etapa usa sessions e transações para consistência",
    "Estratégia de dead-letter queue inclui monitoramento, alertas e processo de revisao manual"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Configuração de Detecção de Duplicatas</summary>

A detecção de duplicatas do Service Bus funciona mantendo uma tabela hash de MessageIds por uma janela configuravel:
- Defina `MessageId` para um identificador com significado de negócio (ex.: `OrderId` ou `OrderId-AttemptTimestamp`)
- Configure `DuplicateDetectionHistoryTimeWindow` para cobrir sua janela de retry (ex.: 10 minutos para retries de API)
- Mensagens com o mesmo MessageId dentro da janela são silenciosamente descartadas
- O remetente recebe sucesso (não sabe que a mensagem foi deduplicada)

Importante: Isso apenas previne envios duplicados. Para prevenir processamento duplicado, você ainda precisa de consumidores idempotentes (usando PeekLock + store de deduplicacao no banco de dados).

</details>

<details>
<summary>Dica 2: Fila de Prioridade com Topics</summary>

O padrão recomendado para mensageria com prioridade usa Service Bus Topics com subscriptions com filtro SQL:

```
Topic: orders
├── Subscription: premium-orders
│   └── SQL Filter: CustomerTier = 'Premium'
│   └── 8 competing consumers
├── Subscription: standard-orders
│   └── SQL Filter: CustomerTier = 'Standard'
│   └── 4 competing consumers
```

Beneficios sobre filas separadas:
- Publicador único (não precisa de lógica de roteamento)
- Filtros são avaliados no lado do servidor (sem filtragem no lado do cliente)
- Facil adicionar novos níveis de prioridade sem alterar produtores
- Cada subscription tem sua própria dead-letter queue

Previna starvation garantindo que pelo menos 2 consumidores sempre processem a subscription standard.

</details>

<details>
<summary>Dica 3: Transações do Service Bus</summary>

Service Bus suporta transações para operações atomicas dentro de uma única entidade ou entre entidades no mesmo namespace (usando o padrão "via" ou "transfer"):

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

Se qualquer operação falhar, todas sofrem rollback. Isso garante que nenhuma mensagem seja perdida ou duplicada entre etapas da saga.

</details>

<details>
<summary>Dica 4: Melhores Práticas de Dead-Letter Queue</summary>

Mensagens são dead-lettered quando:
- MaxDeliveryCount e excedido (padrão: 10 tentativas)
- TTL da mensagem expira
- Avaliação de filtro de subscription falha
- Consumidor explicitamente dead-lettera a mensagem (ex.: mensagem venenosa detectada)

Projete sua estratégia de DLQ:
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

## Verificação de conhecimento

<details>
<summary>1. Um consumidor processa uma mensagem de pedido e escreve no banco de dados, mas crasheia antes de chamar Complete() na mensagem do Service Bus. O que acontece?</summary>

**O lock da mensagem expira e a mensagem se torna disponível para reprocessamento.** No modo PeekLock, a mensagem e bloqueada por uma duracao configuravel (padrão 30 segundos, máximo 5 minutos). Se o consumidor não chamar Complete() antes do lock expirar (devido a crash ou timeout), Service Bus torna a mensagem visível para outros consumidores. A contagem de entregas incrementa. Para prevenir processamento duplo, o consumidor deve verificar no banco de dados se o pedido já foi processado antes de re-executar a lógica de negócio (processamento idempotente). Apos MaxDeliveryCount ser atingido, a mensagem e dead-lettered.

</details>

<details>
<summary>2. Por que Azure Storage Queues são insuficientes para um sistema de processamento de pedidos que requer semantica de entrega exactly-once?</summary>

**Storage Queues carecem de detecção de duplicatas, transações, dead-letter queues e message sessions.** Sem detecção de duplicatas integrada, a aplicação deve implementar sua própria lógica de deduplicacao inteiramente. Sem transações, você não pode atomicamente receber uma mensagem e enviar uma mensagem de acompanhamento. Sem dead-letter queues, mensagens venenosas devem ser tratadas manualmente. Sem sessions, ordenacao FIFO por cliente e impossível. Storage Queues são projetadas para cenários simples de alto volume onde entrega at-least-once e aceitavel e a aplicação lida com toda semantica avancada por conta própria.

</details>

<details>
<summary>3. Um pedido requer pagamento, depois reserva de inventário, depois geracao de etiqueta de envio. Se a reserva de inventário falhar, como o sistema deve compensar?</summary>

**Emita uma transação compensatória para reverter o pagamento, e entao notifique o cliente.** Este e o padrão Saga: cada etapa tem uma acao de compensacao correspondente. Usando Service Bus sessions (session ID = Order ID), o orquestrador rastreia quais etapas completaram. Quando a Etapa 2 (inventário) falha, o orquestrador envia uma mensagem "reverter pagamento" para a fila do Payment Service. Transações do Service Bus garantem que "envio da mensagem de compensacao" e "complete da mensagem original" são atomicos. A dead-letter queue captura pedidos que falham na compensacao, requerendo revisao manual.

</details>

<details>
<summary>4. Como o padrão competing consumers melhora o throughput para processamento de pedidos?</summary>

**Múltiplas instâncias de consumidor leem da mesma fila concorrentemente, distribuindo a carga de processamento.** Com um único consumidor processando 500,000 pedidos/dia a 1 segundo por pedido, throughput é limitado a 86,400/dia. Com 10 competing consumers, throughput aumenta para 864,000/dia. Service Bus garante que cada mensagem e bloqueada para um consumidor por vez (PeekLock), prevenindo processamento duplo. Auto-scaling de consumidores baseado na profundidade da fila garante que o sistema lide com carga de pico sem superprovisionamento durante períodos tranquilos. O padrão funciona tanto com queues quanto com topic subscriptions.

</details>

## Laboratório de validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um grupo de recursos para este laboratório:

```bash
az group create --name rg-az305-challenge38 --location eastus
```

2. Crie um namespace do Service Bus (tier Standard para queues e topics):

```bash
az servicebus namespace create --resource-group rg-az305-challenge38 \
  --name sb-challenge38-$RANDOM --sku Standard --location eastus
```

3. Crie uma queue com dead-lettering e detecção de duplicatas:

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

5. Liste as authorization rules para confirmar políticas de acesso:

```bash
az servicebus namespace authorization-rule list \
  --resource-group rg-az305-challenge38 \
  --namespace-name $SB_NS --query "[].{name:name, rights:rights}"
```

:::tip
Esta mini-implantação válida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge38 --yes --no-wait
```

---

**Próximo**: [Challenge 39: Design an Event-Driven Architecture](/docs/az-305/infrastructure/challenge-39)
