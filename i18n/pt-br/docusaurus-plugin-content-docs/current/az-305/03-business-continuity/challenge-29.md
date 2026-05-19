---
sidebar_position: 5
title: "Desafio 29: Projetar um Plano de Recuperação de Desastres"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 29: Projetar um Plano de Recuperação de Desastres

:::info Tempo Estimado e Custo

**90-120 min** | **Custo estimado**: $15-30 | **Peso no Exame: 15-20%**

:::

## Introdução

A ShopStream é uma plataforma de e-commerce de medio porte atendendo 2 milhoes de clientes ativos com $50M em receita anual. Sua plataforma funciona como uma arquitetura classica de 3 camadas no Azure: uma camada web (frontend e CDN), uma camada de API (processamento de pedidos, gerenciamento de inventário, integração com gateway de pagamento), é uma camada de banco de dados (Azure SQL para transações, Redis para estado de sessão, Azure Storage para imagens de produtos). A implantacao primária esta em East US 2.

Apos uma interrupcao de 4 horas na última Black Friday causada por uma falha do subsistema de armazenamento em sua região primária, a ShopStream perdeu aproximadamente $800K em receita e confiança significativa dos clientes. O conselho determinou um plano abrangente de disaster recovery com os seguintes requisitos rigidos: a camada web deve recuperar em 5 minutos (RTO), a camada de API em 10 minutos (RTO), e a camada de banco de dados deve ter no máximo 5 segundos de perda de dados (RPO). O orcamento de DR é $3.000/mes para infraestrutura secundária em West US 2.

Este desafio combina todas as habilidades de backup e DR dos desafios anteriores em um plano completo e end-to-end de disaster recovery usando Azure Site Recovery, bancos de dados geo-replicados e roteamento de failover automatizado. Você projetara a estratégia de replicação, criara planos de recuperação com failover sequenciado é validara que o design atende a todos os requisitos dentro do orcamento.

## Habilidades do Exame Cobertas

- Recomendar uma solução de recuperação para cargas de trabalho Azure e hibridas que atenda aos objetivos de recuperação
- Recomendar uma solução de backup e recuperação para computacao
- Recomendar uma solução de backup e recuperação para bancos de dados

## Tarefas de Design

### Parte 1: Azure Site Recovery para Camadas de Computação

1. Projete a configuração do Azure Site Recovery (ASR) para as camadas web e API:
   - Camada web: 4 VMs atras de um load balancer (stateless, sessão armazenada no Redis)
   - Camada API: 6 VMs processando pedidos (stateless exceto por transações em andamento)
   - Determine frequência de replicação, retencao de pontos de recuperação e snapshots crash-consistent vs. app-consistent

2. Configure a replicação ASR para uma VM representativa:

```bash
# Create ASR resources in the DR region
az group create --name rg-shopstream-dr --location westus2

# Note: ASR configuration typically uses the portal or PowerShell
# Conceptual configuration:
# Source: East US 2, Target: West US 2
# Replication policy: 
#   - Recovery point retention: 24 hours
#   - App-consistent snapshot frequency: 4 hours
#   - Crash-consistent replication: continuous (RPO ~30 seconds)
```

3. Documente a configuração de rede para o site de DR:
   - Virtual network em West US 2 (espelho da produção)
   - Regras NSG replicadas ou pré-configuradas
   - Enderecos IP publicos para load balancers na região de DR
   - Estratégia de DNS para cutover (Azure DNS com TTL baixo ou Traffic Manager)

### Parte 2: Estratégia de DR da Camada de Banco de Dados

4. Projete a estratégia de replicação de banco de dados para cada data store:

| Data Store | Região Primaria | Abordagem de DR | RPO | RTO |
|------------|---------------|-------------|-----|-----|
| Azure SQL (transações) | East US 2 | ? | 5 seg | ? |
| Redis Cache (sessões) | East US 2 | ? | N/A | ? |
| Azure Storage (imagens) | East US 2 | ? | ? | ? |

5. Configure um Azure SQL failover group para o banco de dados de transações:
   - Failover automático com grace period apropriado
   - Endpoint read-only para o secundário (pode servir trafego de leitura durante operações normais)
   - Estratégia de connection string que sobrevive ao failover sem alteracoes na aplicação

6. Projete a estratégia de DR do Redis Cache:
   - Avalie geo-replication para Azure Cache for Redis (tier Premium/Enterprise)
   - Considere se a perda de sessão e aceitavel (usuários re-autenticam) vs. custo de replicação de sessão
   - Documente o processo de failover para Redis

7. Configure geo-redundant storage (RA-GRS) para imagens de produtos e projete o failover:
   - Como o failover RA-GRS funciona (iniciado pela Microsoft vs. iniciado pelo cliente)?
   - Qual é o RPO para geo-replicação de armazenamento?
   - Como você redireciona leituras para o endpoint secundário durante uma interrupcao?

### Parte 3: Orquestracao do Plano de Recuperação

8. Crie um plano de recuperação sequenciado que define a ordem de failover:
   - **Grupo 1**: Camada de banco de dados (SQL failover group ativa primeiro)
   - **Grupo 2**: Camada API (VMs iniciam apos banco de dados estar disponível)
   - **Grupo 3**: Camada web (VMs frontend iniciam apos API estar disponível)
   - **Grupo 4**: Roteamento de trafego (DNS/Front Door alterna para região de DR)

9. Adicione automacao ao plano de recuperação:
   - Script pré-failover: Verificar que a replicação do banco de dados esta atualizada (< 5 segundos atras)
   - Script pós-failover: Atualizar configuração da aplicação para apontar para endpoints de banco de dados de DR
   - Script pós-failover: Executar health checks em cada camada antes de prosseguir para o próximo grupo
   - Script pós-failover: Enviar notificação para a equipe de operações com status do failover

10. Projete o failover de roteamento de trafego usando Azure Front Door ou Traffic Manager:
    - Qual serviço fornece detecção de failover mais rápida (health probes)?
    - Configure endpoints de health probe para cada camada
    - Defina o limite de failover (quantas probes falhadas antes de alternar?)
    - Calcule o tempo total de failover: detecção + propagacao DNS + startup de VM

### Parte 4: Failback e Testes de DR

11. Projete o procedimento de failback apos a região primária recuperar:
    - Re-protect (replicação reversa do DR de volta para o primário)
    - Estratégia de sincronizacao de dados durante failback
    - Planned failover de volta para o primário (zero perda de dados)
    - Tratamento do cenário "split brain" se ambas as regiões aceitarem escritas

12. Crie um cronograma e procedimento de testes de DR:
    - Test failover (não disruptivo, usa rede isolada no DR)
    - Planned failover (válida cutover real com tempo de inatividade mínimo)
    - Frequência: Com que frequência cada tipo de teste deve ser conduzido?
    - Criterios de sucesso: Quais metricas validam um teste de DR bem-sucedido?

13. Calcule o custo mensal da infraestrutura de DR e verifique se cabe dentro de $3.000/mes:
    - Custo de replicação ASR por VM
    - VMs na região de DR (só executando durante failover, mas discos pré-provisionados)
    - Secundário do SQL Database (legivel, entao útil para read offload)
    - Custo de replicação GRS do armazenamento
    - Custo mensal total vs. orcamento de $3K

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-29"
  items={[
    "ASR configured for web and API tier VMs with appropriate replication policy",
    "SQL failover group configured with automatic failover and validated RPO meets 5-second requirement",
    "Recovery plan created with correct sequencing (DB -> API -> Web -> Traffic)",
    "Traffic routing failover designed with health probes and failover threshold defined",
    "DR cost estimate documented and validated against $3K/month budget",
    "Failback procedure and DR testing schedule documented"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Replicação ASR e RPO</summary>

Azure Site Recovery fornece:
- **Replicação continua**: Escritas em disco sao continuamente replicadas para a região destino
- **RPO**: Tipicamente 30 segundos a 2 minutos para VMs (depende da taxa de alteracao de dados)
- **Snapshots app-consistent**: A cada 1-12 horas (configuravel) - captura o estado da aplicação
- **Snapshots crash-consistent**: A cada 5 minutos - captura o estado do disco

Para as camadas web/API stateless da ShopStream, snapshots crash-consistent sao suficientes porque:
- Sessoes estao no Redis (não na VM)
- Transacoes em andamento serao reexecutadas pelo cliente
- Sem estado de banco de dados local para proteger

Custo do ASR: aproximadamente $25/mes por VM protegida + armazenamento para discos de replica.

</details>

<details>
<summary>Dica 2: Configuração do SQL Failover Group</summary>

Configurações-chave do failover group:
- **Grace period**: Mínimo 1 hora. E quanto tempo o failover automático espera apos detectar falha do primário antes de alternar. Menor = failover mais rápido mas maior risco de falsos positivos.
- **Endpoint read-write**: `fg-shopstream.database.windows.net` (sempre aponta para o primário)
- **Endpoint read-only**: `fg-shopstream.secondary.database.windows.net` (sempre aponta para o secundário)
- **RPO**: Aproximadamente 5 segundos para geo-replicação assincrona (garantido pelo SLA)

```bash
az sql failover-group create \
  --resource-group rg-shopstream \
  --server sql-shopstream-primary \
  --partner-server sql-shopstream-dr \
  --name fg-shopstream \
  --failover-policy Automatic \
  --grace-period 1
```

A connection string da aplicação deve usar o endpoint do failover group, NAO o nome individual do servidor.

</details>

<details>
<summary>Dica 3: Sequenciamento do Recovery Plan no ASR</summary>

ASR Recovery Plans permitem que você defina grupos que fazem failover em sequência:
1. Crie um Recovery Plan no Recovery Services vault
2. Adicione VMs a grupos numerados (Grupo 1 inicia primeiro)
3. Adicione ações pré/pós (scripts, Azure Automation runbooks, passos manuais)

Sequenciamento tipico para app de 3 camadas:
- Grupo 1: Failover de banco de dados (execute failover do SQL failover-group como acao pré)
- Grupo 2: VMs da camada API (configure para esperar health check do banco de dados)
- Grupo 3: VMs da camada web (configure para esperar health check da API)
- Acao pós: Atualize Traffic Manager/Front Door para apontar para a região de DR

Cada grupo completa antes do próximo iniciar. Dentro de um grupo, todas as VMs iniciam em paralelo.

</details>

<details>
<summary>Dica 4: Estimativa de Custo de DR</summary>

Detalhamento de custo mensal para DR da ShopStream (orcamento de $3.000):
- **Replicação ASR** (10 VMs): 10 x $25 = $250/mes
- **Discos gerenciados de replica** (10 VMs, media 256 GB cada): 10 x 256 GB x $0,05 = $128/mes
- **Secundário do SQL Database** (General Purpose, 8 vCores): ~$800/mes (mas fornece valor de read offload)
- **Geo-replicação Redis** (Premium P1): ~$450/mes (considere se sessões sao descartaveis)
- **Delta de GRS do armazenamento**: ~$200/mes (GRS custa ~2x LRS para 5 TB de imagens)
- **Egress de rede ASR durante replicação**: ~$50/mes

Total estimado: ~$1.878/mes sem geo-replicação Redis, ~$2.328 com ela. Ambos cabem dentro do orcamento de $3K.

Se Redis for muito caro, aceite perda de sessão durante failover (usuários re-logam) e use Premium sem geo-replicação na região de DR, iniciando do zero no failover.

</details>

<details>
<summary>Dica 5: Front Door vs Traffic Manager para Failover</summary>

**Azure Front Door:**
- Load balancer Layer 7 (HTTP/HTTPS) com health probes
- Intervalo de probe: tao baixo quanto 5 segundos
- Detecção de failover: ~10-30 segundos (frequência de probe configuravel x limite)
- Sem dependência de TTL DNS (usa anycast - mudança de roteamento instantanea)
- Recursos adicionais: WAF, caching, SSL offload

**Azure Traffic Manager:**
- Roteamento baseado em DNS (retorna IP do backend saudavel)
- Intervalo de probe: 10-30 segundos
- Detecção de failover: 30-90 segundos + propagacao de TTL DNS (30-300 segundos)
- Tempo total de failover pode ser 1-5 minutos dependendo das configurações de TTL DNS
- Mais simples, mais barato, suporta protocolos não-HTTP

Para o RTO de 5 minutos da camada web da ShopStream: Front Door e preferido (detecção mais rápida, sem atraso de propagacao DNS). Traffic Manager funciona se você definir TTL para 30 segundos mas adiciona risco de entradas DNS em cache.

</details>

## Recursos de Aprendizagem

- [About Azure Site Recovery](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview)
- [Set up disaster recovery for Azure VMs](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication)
- [Recovery plans in Azure Site Recovery](https://learn.microsoft.com/en-us/azure/site-recovery/recovery-plan-overview)
- [Azure SQL Database failover groups](https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-sql-db)
- [Azure Front Door traffic routing](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-traffic-acceleration)
- [Geo-replication for Azure Cache for Redis](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-geo-replication)

## Verificação de Conhecimento

<details>
<summary>1. Uma aplicação de 3 camadas tem requisitos de RTO de 5 min (web), 10 min (API) e 30 seg (banco de dados). Por que a camada de banco de dados deve fazer failover PRIMEIRO no plano de recuperação?</summary>

**A camada API depende do banco de dados - se as VMs da API iniciarem antes do banco de dados estar disponível, elas iraao crashar ou retornar erros.** Da mesma forma, a camada web depende da camada API. Os planos de recuperação devem respeitar a ordem de dependência: a camada mais baixa na pilha (banco de dados) deve estar disponível antes que as camadas superiores iniciem. Mesmo que o banco de dados tenha o RTO mais rigoroso (30 seg), inicia-lo primeiro garante que as camadas superiores possam inicializar suas conexões de banco de dados com sucesso. ASR recovery plans aplicam isso atraves de grupos numerados que executam sequencialmente.

</details>

<details>
<summary>2. A ShopStream usa Azure Front Door para roteamento de trafego. Durante um failover, o que acontece com requisicoes em andamento que estavam sendo servidas pela região primária?</summary>

**Requisicoes em andamento para a região primária falhada irao timeout e falhar.** As health probes do Azure Front Door detectam a falha do backend em 10-30 segundos e param de rotear NOVAS requisicoes para a origem não saudavel. No entanto, requisicoes já em transito (recebidas pelo backend falhado) falharao com timeout ou erros de conexão. O cliente deve retentar, e a retentativa sera roteada para a origem de DR saudavel. Para e-commerce, isso significa que alguns usuários podem ver uma pagina de erro por 10-30 segundos durante o failover. Design de API stateless garante que requisicoes reexecutadas tenham sucesso sem efeitos colaterais (idempotencia e crítica).

</details>

<details>
<summary>3. O orcamento de DR é $3.000/mes. Qual é o componente de custo mais significativo, e como ele pode fornecer valor mesmo durante operações normais?</summary>

**O secundário do SQL Database (failover group) e o maior custo com ~$800/mes mas fornece capacidade de read-offload durante operações normais.** O banco de dados secundário em um failover group tem um endpoint legivel que pode servir consultas pesadas de leitura (relatórios, analytics, busca) sem impactar o primário. Isso efetivamente dobra a capacidade de leitura sem custo adicional além do investimento de DR. Da mesma forma, o secundário de geo-replicação Redis pode servir leituras para usuários geograficamente distribuidos. Converter gasto de DR em melhoria de performance justifica o custo para stakeholders.

</details>

<details>
<summary>4. Apos um failover bem-sucedido para West US 2, a região primária (East US 2) recupera. Qual é a sequência correta para fazer failback sem perda de dados?</summary>

**Re-protect, sincronizar, depois planned failover.** A sequência e: (1) Re-protect: habilitar replicação reversa de West US 2 (primário atual) de volta para East US 2. (2) Esperar a sincronizacao inicial completar (copia completa das alteracoes feitas durante a interrupcao). (3) Verificar que a replicação esta saudavel e a defasagem e mínima. (4) Executar um planned failover de West US 2 de volta para East US 2 (isso brevemente para escritas para garantir zero perda de dados durante o cutover). (5) Re-protect novamente para restaurar a direcao original de DR. Pular re-protection arrisca perda de dados se East US 2 tiver dados desatualizados.

</details>

## Laboratório de Validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um resource group para este laboratório:

```bash
az group create --name rg-az305-challenge29 --location eastus
```

2. Implante uma VM para usar como fonte de replicação ASR:

```bash
az vm create \
  --resource-group rg-az305-challenge29 \
  --name vm-asr-source \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --zone 1 \
  --admin-username azureuser \
  --generate-ssh-keys
```

3. Crie um Recovery Services vault e defina a política de replicação:

```bash
az backup vault create \
  --resource-group rg-az305-challenge29 \
  --name vault-az305-challenge29 \
  --location eastus

az backup policy list \
  --resource-group rg-az305-challenge29 \
  --vault-name vault-az305-challenge29 \
  --query "[].name" -o table
```

4. Habilite backup na VM para validar integração com o vault:

```bash
az backup protection enable-for-vm \
  --resource-group rg-az305-challenge29 \
  --vault-name vault-az305-challenge29 \
  --vm vm-asr-source \
  --policy-name DefaultPolicy
```

5. Verifique que a VM esta registrada para proteção:

```bash
az backup item list \
  --resource-group rg-az305-challenge29 \
  --vault-name vault-az305-challenge29 \
  --query "[].{Name:name, Status:properties.protectionStatus}" -o table
```

:::tip
Esta mini-implantacao válida suas decisoes de design com recursos reais do Azure. E opcional, mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge29 --yes --no-wait
```

---

**Próximo**: [Challenge 30: Design High Availability for Compute](/docs/az-305/business-continuity/challenge-30)
