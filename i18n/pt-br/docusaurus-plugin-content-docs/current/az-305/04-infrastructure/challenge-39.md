---
sidebar_position: 6
title: "Desafio 39: Projetar uma Arquitetura Orientada a Eventos"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 39: projetar uma arquitetura orientada a eventos

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-15 | **Peso no Exame: 30-35%**

:::

## Introdução

A SmartSpace Technologies opera uma plataforma de edificios inteligentes que monitora 10.000 sensores IoT implantados em 50 edificios comerciais. Os sensores reportam dados de temperatura, umidade, ocupação e consumo de energia a cada 5 segundos, gerando aproximadamente 120.000 eventos por minuto (2.000 eventos por segundo sustentados, com picos de 5.000/segundo durante o horario de abertura dos edificios). A plataforma deve lidar com quatro cenários distintos de processamento de eventos com diferentes requisitos de latência e durabilidade.

Cenário 1 (Alertas em tempo real): Quando um sensor de temperatura excede 35C ou a ocupação excede os limites de segurança contra incendio, um alerta deve chegar a gerencia do edifício em até 2 segundos. Cenário 2 (Dashboards quase em tempo real): Os dashboards de operações do edifício devem ser atualizados em 10-15 segundos para mostrar as condições atuais em todos os andares. Cenário 3 (Arquivo de eventos): Todos os eventos dos sensores devem ser arquivados por 7 anos para suportar treinamento de modelos de ML e auditorias de conformidade regulatoria. Cenário 4 (Respostas automatizadas): Quando condições específicas sao atendidas (ex.: ocupação cai para zero E consumo de energia excede o limite), a plataforma deve acionar ações automatizadas (ajustar setpoints do HVAC, diminuir luzes, enviar notificações de manutenção).

O desafio é projetar uma arquitetura orientada a eventos que roteie eventos para o pipeline de processamento apropriado com base nos requisitos de latência e durabilidade de cada cenário.

## Habilidades do exame cobertas

- Recomendar uma arquitetura orientada a eventos

## Tarefas de design

### Parte 1: selecao do serviço de ingestao de eventos

1. Compare os serviços de ingestao de eventos do Azure para 2.000-5.000 eventos/segundo:

| Recurso | Event Hubs | Event Grid | IoT Hub |
|---------|-----------|-----------|---------|
| Throughput | Milhoes/segundo | 10M eventos/segundo | Centenas de milhares/segundo |
| Protocolo | AMQP, Kafka, HTTPS | HTTP, MQTT (para IoT) | MQTT, AMQP, HTTPS |
| Modelo de consumo | Pull (consumer groups) | Push (subscriptions) | Pull (consumer groups) + roteamento |
| Retencao de mensagens | 1-7 dias (Standard), até 90 dias (Premium/Dedicated) | 24 horas (retry) | 1-7 dias |
| Ordenacao | Por particao | Sem garantia | Por dispositivo |
| Gerenciamento de dispositivos | Não | Não | Sim (device twin, C2D) |
| Modelo de custo | Por throughput unit | Por evento | Por mensagem + por dispositivo |

2. Determine o serviço de ingestao principal:
   - Os sensores IoT devem se conectar diretamente ao Event Hubs, ou o IoT Hub deve ser o ponto de entrada?
   - Se IoT Hub: Como o roteamento de mensagens direciona eventos para serviços downstream?
   - Qual papel o Event Grid desempenha nesta arquitetura (distribuição de eventos vs ingestao de eventos)?

3. Projete a configuração do Event Hubs:
   - Quantas particoes sao necessárias para 5.000 eventos/segundo de throughput de pico?
   - Quantas throughput units (Standard) ou processing units (Premium)?
   - Qual é a estratégia de partition key? (Building ID? Tipo de sensor? Andar?)

### Parte 2: processamento de alertas em tempo real (Cenário 1)

4. Projete o pipeline de alertas em tempo real (requisito de latência de 2 segundos):
   - Fonte de eventos: Event Hubs (ou rota do IoT Hub)
   - Processamento: Avaliar regras de limite no fluxo
   - Saida: Notificação push para gerencia do edifício

5. Avalie opcoes de processamento para detecção de limites:
   - **Azure Stream Analytics**: Consultas tipo SQL, agregacoes em janelas, joins com dados de referência
   - **Azure Functions (Event Hub trigger)**: Código customizado, processamento por evento
   - **Spark Structured Streaming (Databricks)**: Analitica complexa, inferencia de ML

6. Para o SLA de 2 segundos, qual opcao de processamento fornece a menor latência? Projete a lógica de regra de alerta (ex.: temperatura > 35C por 3 leituras consecutivas em 30 segundos, para evitar falsos positivos por ruido do sensor).

### Parte 3: distribuição de eventos com event Grid (Cenário 4)

7. Projete o sistema de resposta automatizada usando Event Grid:
   - Defina eventos customizados para condições do edifício (OccupancyZero, EnergyAnomaly, TemperatureExceedance)
   - Crie tópicos do Event Grid para cada edifício ou um único tópico com filtragem por subject
   - Projete subscriptions que acionem diferentes Azure Functions com base no tipo de evento

8. Configure a filtragem do Event Grid:
   - Filtro de prefixo de subject: `/buildings/building-42/floors/3/`
   - Filtro avancado: `data.temperature > 35 AND data.sensorType == 'ambient'`
   - Determine qual nível de filtragem (subject vs avancado) e apropriado para cada cenário

9. Projete o padrão de fan-out:
   - Um evento (ex.: OccupancyZero) deve acionar múltiplas ações simultaneamente:
     - Ajustar setpoints do HVAC (chamar Building Management API)
     - Diminuir luzes (chamar Lighting Control API)
     - Registrar na trilha de auditoria (escrever no Cosmos DB)
   - Como o Event Grid garante a entrega para todos os subscribers?
   - O que acontece se um subscriber estiver temporariamente indisponivel?

### Parte 4: arquivo de eventos e armazenamento de longo prazo (Cenário 3)

10. Projete a estratégia de arquivamento de eventos para retencao de 7 anos:
    - **Event Hubs Capture**: Escreve automaticamente eventos no Azure Storage ou Data Lake em formato Avro
    - Configure a janela de captura: baseada em tempo (a cada 5 minutos) vs baseada em tamanho (a cada 256 MB)
    - Projete a estrutura de pastas: `{Namespace}/{EventHub}/{PartitionId}/{Year}/{Month}/{Day}/{Hour}/{Minute}`

11. Calcule os requisitos de armazenamento:
    - 120.000 eventos/minuto x 60 x 24 x 365 x 7 anos
    - Tamanho médio do evento: 500 bytes
    - Armazenamento bruto total: estime e identifique a camada de armazenamento apropriada
    - Quando os dados devem migrar da camada Hot para Cool para Archive?

12. Projete a estrutura do data lake para treinamento de modelos de ML:
    - Eventos brutos em Avro (imutável, append-only)
    - Datasets curados em Parquet (agregados, otimizados para analitica)
    - Como a equipe de ML consulta 7 anos de dados de sensores de forma eficiente?

### Parte 5: estratégia de consumer Groups

13. Projete a alocacao de consumer groups para Event Hubs:
    - Consumer Group 1: Processador de alertas em tempo real (Stream Analytics)
    - Consumer Group 2: Serviço de atualização de dashboard (Functions)
    - Consumer Group 3: Event Hubs Capture (arquivamento)
    - Consumer Group 4: Pipeline de features de ML (Databricks)

14. Explique por que cada consumidor precisa de seu próprio consumer group e o que acontece se duas aplicações diferentes compartilharem um consumer group.

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-39"
  items={[
    "Serviço de ingestao correto selecionado (IoT Hub ou Event Hubs) com justificativa de gerenciamento de dispositivos",
    "Pipeline de alertas em tempo real atende SLA de 2 segundos com mitigacao de falsos positivos",
    "Event Grid configurado para respostas automatizadas com padrões de filtragem e fan-out",
    "Event Hubs Capture configurado para arquivamento de 7 anos com política de ciclo de vida de camadas de armazenamento",
    "Estratégia de consumer groups aloca leitores independentes para cada cenário de processamento",
    "Arquitetura separa claramente responsabilidades: ingestao, processamento, distribuição e armazenamento"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: IoT Hub vs Event Hubs como Ponto de Entrada</summary>

Use **IoT Hub** quando você precisa de:
- Identidade e autenticação por dispositivo (certificados X.509, SAS tokens por dispositivo)
- Gerenciamento de device twin (propriedades desejadas/reportadas)
- Comandos cloud-to-device (C2D) (ex.: dizer a um sensor para recalibrar)
- Regras de roteamento de mensagens que direcionam eventos para diferentes endpoints com base nas propriedades da mensagem

Use **Event Hubs** diretamente quando:
- Os dispositivos sao gerenciados por outro sistema (ex.: um gateway que agrega dados de sensores)
- Você só precisa de ingestao de eventos de alto throughput sem gerenciamento de dispositivos
- A compatibilidade com o protocolo Kafka é necessária

Para 10.000 sensores IoT, o IoT Hub é recomendado porque você precisa de identidade por dispositivo, atualizações de firmware e a capacidade de enviar comandos de volta aos sensores. O IoT Hub tem um endpoint compatível com Event Hub integrado para processamento downstream.

</details>

<details>
<summary>Dica 2: Estratégia de Particoes do Event Hubs</summary>

Particoes determinam o paralelismo:
- Cada particao suporta até 1 MB/segundo de ingress (Standard) ou 20 MB/segundo (Premium)
- 5.000 eventos/segundo a 500 bytes cada = 2,5 MB/segundo de ingress
- Camada Standard: Precisa de pelo menos 3 particoes (1 MB/s cada)
- Recomendado: 8-16 particoes para margem e consumidores paralelos

Estratégia de partition key:
- **Building ID**: Todos os eventos de um edifício vao para a mesma particao (bom para ordenacao de processamento por edifício)
- **Sensor ID**: Distribuição uniforme mas sem ordenacao por edifício
- **Aleatorio (null key)**: Melhor distribuição de throughput, sem garantias de ordenacao

Para este cenário, Building ID como partition key garante que todos os eventos de um edifício sejam processados em ordem pelo sistema de alertas, permitindo correlacao multi-sensor dentro de um edifício.

</details>

<details>
<summary>Dica 3: Garantias de Entrega do Event Grid</summary>

O Event Grid fornece entrega at-least-once com retry:
- Política de retry padrão: 30 tentativas em 24 horas com backoff exponencial
- Se um subscriber falhar em todos os retries, os eventos vao para um container de dead-letter (deve ser configurado)
- Cada subscription entrega independentemente (fan-out e paralelo)
- Indisponibilidade de um subscriber não bloqueia a entrega para outros subscribers

Configure o destino de dead-letter (Azure Blob Storage) para cada subscription para capturar eventos não entregaveis. Configure alertas do Azure Monitor quando a contagem de dead-letter > 0.

O Event Grid também suporta batching (até 5.000 eventos por entrega) e customizacao do schema de saida (Event Grid schema, CloudEvents schema, ou schema de entrada customizado).

</details>

<details>
<summary>Dica 4: Calculo de Armazenamento para Arquivo de 7 Anos</summary>

Calculo:
- 120.000 eventos/minuto x 60 minutos x 24 horas x 365 dias = ~63 bilhoes de eventos/ano
- 63B eventos x 500 bytes = ~31,5 TB/ano bruto
- 7 anos = ~220 TB bruto (antes da compressao)
- Avro com compressao: ~50-70% de redução = ~66-110 TB de armazenamento real

Estratégia de camadas de armazenamento:
- Ultimos 30 dias: Camada Hot ($0,018/GB/mes) para dashboards ativos
- 30 dias a 1 ano: Camada Cool ($0,01/GB/mes) para análise ad-hoc
- 1-7 anos: Camada Archive ($0,002/GB/mes) para retencao de conformidade

A política de gerenciamento de ciclo de vida automatiza as transicoes entre camadas. Custo total estimado: aproximadamente $300-500/mes para o arquivo completo de 7 anos.

</details>

## Recursos de aprendizagem

- [Azure Event Hubs overview](https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-about)
- [Azure Event Grid overview](https://learn.microsoft.com/en-us/azure/event-grid/overview)
- [Event Hubs Capture](https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-capture-overview)
- [IoT Hub message routing](https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-messages-d2c)
- [Choose between Azure messaging services](https://learn.microsoft.com/en-us/azure/service-bus-messaging/compare-messaging-services)

## Verificação de conhecimento

<details>
<summary>1. Duas aplicações leem do mesmo Event Hub usando o mesmo consumer group. Qual problema ocorre?</summary>

**As aplicações competem por particoes e cada uma recebe apenas um subconjunto de eventos.** Dentro de um consumer group, cada particao e atribuida a no máximo uma instância de consumidor. Se a Aplicação A e a Aplicação B compartilham um consumer group com 8 particoes, elas dividem a propriedade (ex.: A recebe particoes 0-3, B recebe particoes 4-7). Nenhuma aplicação ve todos os eventos. Para permitir que ambas as aplicações leiam todos os eventos independentemente, elas devem usar consumer groups separados. Cada consumer group mantem sua própria posicao de leitura (offset) por particao.

</details>

<details>
<summary>2. Por que o Event Grid e melhor que o Event Hubs para o cenário de resposta automatizada (fan-out para múltiplos subscribers)?</summary>

**O Event Grid usa entrega baseada em push para múltiplos subscribers simultaneamente, enquanto o Event Hubs requer que cada subscriber faca pull e mantenha seu próprio offset.** Para respostas automatizadas onde um evento deve acionar 3-5 ações diferentes (HVAC, iluminacao, auditoria), o Event Grid suporta nativamente múltiplas subscriptions por tópico, cada uma recebendo o evento independentemente com sua própria política de retry e configuração de dead-letter. Com Event Hubs, você precisaria que cada handler de acao consultasse o hub, mantivesse checkpoints e processasse todos os eventos mesmo quando apenas um subconjunto e relevante. A filtragem server-side do Event Grid reduz o processamento desnecessario.

</details>

<details>
<summary>3. O Event Hubs Capture escreve eventos no Blob Storage a cada 5 minutos ou a cada 256 MB, o que ocorrer primeiro. Por que não capturar a cada 1 segundo para menor latência de arquivamento?</summary>

**Captura frequente cria arquivos pequenos excessivos que degradam o desempenho de consultas downstream e aumentam os custos de transações de armazenamento.** Cada janela de captura cria um arquivo Avro separado. Capturar a cada segundo produziria 86.400 arquivos por particao por dia. Motores analiticos (Spark, Synapse) tem desempenho ruim ao escanear milhões de arquivos pequenos versus poucos arquivos maiores. A janela de 5 minutos equilibra a latência de arquivamento (atraso máximo de 5 minutos) contra a otimização do tamanho dos arquivos. Se o arquivamento quase em tempo real for necessário, use um consumer group dedicado escrevendo no Data Lake via um processo customizado com compactacao de arquivos.

</details>

<details>
<summary>4. Um alerta de temperatura dispara quando uma única leitura do sensor excede 35C. O gerente do edifício relata muitos alarmes falsos de picos breves do sensor. Como você reduz falsos positivos?</summary>

**Use uma janela tumbling ou hopping no Stream Analytics para exigir múltiplas leituras consecutivas acima do limite antes de disparar um alerta.** Em vez de alertar em uma única leitura, configure a regra para exigir 3 leituras consecutivas acima de 35C dentro de uma janela de 30 segundos (correspondencia de padrão temporal). O Stream Analytics suporta funções `LAG()` e agregacoes em janelas para esse propósito. Alternativamente, use uma média de janela deslizante: alerte apenas quando a média movel de 60 segundos exceder 34C. Isso filtra ruido transitório do sensor enquanto ainda detecta excursoes genuinas de temperatura dentro do SLA de entrega de 2 segundos.

</details>

## Laboratório de validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um resource group para este laboratório:

```bash
az group create --name rg-az305-challenge39 --location eastus
```

2. Crie um tópico do Event Grid:

```bash
az eventgrid topic create --resource-group rg-az305-challenge39 \
  --name egt-challenge39 --location eastus
```

3. Crie uma subscription webhook (usando um endpoint de teste público):

```bash
az eventgrid event-subscription create \
  --source-resource-id $(az eventgrid topic show --resource-group rg-az305-challenge39 --name egt-challenge39 --query "id" -o tsv) \
  --name sub-test --endpoint-type webhook \
  --endpoint https://httpbin.org/post
```

4. Publique um evento de teste no tópico:

```bash
TOPIC_ENDPOINT=$(az eventgrid topic show --resource-group rg-az305-challenge39 --name egt-challenge39 --query "endpoint" -o tsv)
TOPIC_KEY=$(az eventgrid topic key list --resource-group rg-az305-challenge39 --name egt-challenge39 --query "key1" -o tsv)
curl -X POST "$TOPIC_ENDPOINT" -H "aeg-sas-key: $TOPIC_KEY" \
  -H "Content-Type: application/json" \
  -d '[{"id":"1","eventType":"test","subject":"challenge39","dataVersion":"1.0","data":{"message":"hello"}}]'
```

:::tip
Esta mini-implantacao válida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge39 --yes --no-wait
```

---

**Próximo**: [Challenge 40: Design API Integration](/docs/az-305/infrastructure/challenge-40)
