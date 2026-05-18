---
sidebar_position: 9
title: "Challenge 33: Design a Highly Available Multi-Region Application"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 33: Design a Highly Available Multi-Region Application

:::info Tempo Estimado e Custo

**90-120 min** | **Custo estimado**: $20-40 | **Peso no Exame: 15-20%**

:::

## Introducao

A StreamFlix e uma plataforma de streaming de video atendendo 50 milhoes de usuarios ativos mensais na America do Norte, Europa e Asia-Pacifico. A plataforma transmite conteudo de video 4K, gerencia perfis de usuarios e historico de visualizacao, processa recomendacoes em tempo real e trata metadados de licenciamento de conteudo. A StreamFlix se posicionou como a alternativa "sempre disponivel" aos concorrentes, prometendo aos usuarios que nunca experimentarao uma tela de buffering ou indisponibilidade de servico.

A equipe executiva determinou um SLA composto de 99,99% com menos de 50ms de tempo de inicio de video globalmente e a capacidade de sobreviver a uma falha completa de regiao Azure com menos de 2 minutos de impacto visivel ao usuario. A plataforma deve estar ativa em 3 regioes simultaneamente (East US 2, North Europe, Japan East), nao em uma configuracao active-passive. Toda regiao deve servir trafego de producao o tempo todo, e se qualquer regiao unica falhar, as duas restantes devem absorver seu trafego sem degradacao.

Este e o desafio capstone do Dominio 3. Voce combinara todos os conceitos de alta disponibilidade, backup e disaster recovery dos Challenges 25-32 em uma arquitetura multi-regiao completa e pronta para producao. Voce deve calcular o SLA composto matematicamente, provar que atende a meta de 99,99% e demonstrar que cada componente tem redundancia apropriada.

## Habilidades do Exame Cobertas

- Recomendar uma solucao de alta disponibilidade para computacao
- Recomendar uma solucao de alta disponibilidade para dados relacionais
- Recomendar uma solucao de alta disponibilidade para dados semi-estruturados e nao estruturados
- Recomendar uma solucao de recuperacao para cargas de trabalho Azure e hibridas que atenda aos objetivos de recuperacao

## Tarefas de Design

### Parte 1: Roteamento Global de Trafego e Camada de Edge

1. Projete o ponto de entrada global usando Azure Front Door:
   - Configure 3 origin groups (East US 2, North Europe, Japan East)
   - Metodo de roteamento: baseado em latencia (usuarios roteados para regiao saudavel mais proxima)
   - Health probes: HTTP no endpoint `/health`, intervalo de 10 segundos, 3 falhas = nao saudavel
   - Calcule o tempo de deteccao de failover: intervalo de probe x limite de falha = ?

2. Projete a estrategia de CDN e caching:
   - Conteudo de video: servir a partir do Azure CDN (ou regras de caching do Front Door) com TTL de 24 horas
   - Respostas de API: fazer cache de dados personalizados? (Nao - conteudo dinamico ignora cache)
   - Ativos estaticos (UI, thumbnails): cache de 7 dias com URLs versionadas para cache-busting
   - Calcule: qual porcentagem de requisicoes acerta o cache CDN vs. origem?

3. Documente o comportamento de failover quando uma regiao falha:
   - Tempo para detectar: intervalo de health probe x limite
   - Tempo para redirecionar: propagacao do Front Door (quase instantanea, anycast)
   - Impacto ao usuario: requisicoes em andamento para regiao falhada falham, proxima requisicao vai para regiao saudavel
   - Interrupcao total visivel ao usuario: aproximadamente 30-60 segundos

### Parte 2: Camada de Computacao (Por Regiao)

4. Projete a arquitetura de computacao dentro de cada regiao:
   - Camada Web/API: Azure Kubernetes Service (AKS) ou App Service (zone-redundant)
   - Motor de recomendacao: Container Apps com autoscale
   - Transcodificacao de video: VMSS com spot instances (batch, nao critico para HA)

5. Para cada regiao, configure zone redundancy:
   - AKS com 3 availability zones, minimo 3 nos (1 por zona)
   - Node autoscaler: min 3, max 12 (absorver trafego de uma regiao falhada)
   - Pod disruption budgets: minAvailable 66% (sobreviver a falha de zona)

6. Calcule a capacidade de computacao por regiao necessaria para absorver trafego de uma regiao falhada:
   - Operacao normal: cada regiao trata 33% do trafego global
   - Durante falha regional: cada regiao sobrevivente trata 50%
   - Folga do autoscaler: cada regiao deve poder escalar para 150% da capacidade normal em 2 minutos
   - Projete os gatilhos de autoscale e estrategia de pre-aquecimento

### Parte 3: Camada de Dados (Multi-Region)

7. Projete a arquitetura de dados para cada tipo de dado:

| Tipo de Dado | Servico | Regioes | Consistencia | Failover |
|-----------|---------|---------|-------------|----------|
| Perfis de usuario e historico | Cosmos DB (NoSQL) | 3, multi-write | Session | Automatico (99,999%) |
| Catalogo de conteudo e licenciamento | Azure SQL Database | 3 (1 primario + 2 leitura) | Strong | Failover group |
| Arquivos de video (conteudo 4K) | Blob Storage + CDN | 3 (RA-GRS) | Eventual | CDN cache + leitura secundaria |
| Tokens de sessao | Azure Cache for Redis | 3 (Enterprise, active geo) | Eventual | Replicacao cross-region |
| Recomendacoes (cache de modelo ML) | Redis ou Cosmos DB | 3 | Eventual | Reconstrucao por regiao |

8. Configure Cosmos DB para a carga de trabalho de perfil de usuario e historico de visualizacao:
   - Multi-region writes (todas as 3 regioes escrevem localmente)
   - Session consistency (usuario ve suas proprias escritas imediatamente)
   - Estrategia de partition key: `/userId` (garante que dados do usuario estao co-localizados)
   - Autoscale: 10.000 - 100.000 RU/s por regiao (dependente de trafego)

9. Projete a topologia do SQL Database para o catalogo de conteudo:
   - Primario: East US 2 (Business Critical, zone-redundant, 16 vCores)
   - Secundario do failover group: North Europe (failover automatico, grace de 1 hora)
   - Active geo-replica: Japan East (read-only, failover manual)
   - Justifique por que catalogo de conteudo usa SQL (restricoes de licenciamento relacional, consultas complexas) vs. Cosmos DB

10. Configure o armazenamento de conteudo de video para entrega global:
    - Armazenamento primario: East US 2 (RA-GRS, replicado para regiao pareada)
    - Contas de armazenamento secundarias em North Europe e Japan East para conteudo region-local
    - Azure CDN com multiplos origin groups para failover
    - Cache warming: pre-popular cache CDN para novos lancamentos antes do lancamento

### Parte 4: Calculo do SLA Composto

11. Calcule o SLA composto para a arquitetura completa:

**SLA por regiao (dependencias seriais):**
- Azure Front Door: 99,99%
- AKS (zone-redundant): 99,95%
- Cosmos DB (multi-region write): 99,999%
- Azure SQL (Business Critical, zone-redundant): 99,995%
- Azure Cache for Redis (Enterprise): 99,99%
- Storage (RA-GRS): 99,99%

SLA composto por regiao = Front Door x AKS x Cosmos DB x SQL x Redis x Storage

**SLA multi-regiao (paralelo, active-active em 3 regioes):**
- Disponibilidade multi-regiao = 1 - (1 - por-regiao)^3

12. Realize o calculo:
    - Por regiao: 0,9999 x 0,9995 x 0,99999 x 0,99995 x 0,9999 x 0,9999 = ?
    - Isso atende 99,99%? Se nao, qual e o gargalo?
    - Multi-regiao: 1 - (1 - por-regiao)^3 = ?
    - A arquitetura multi-regiao atende ou excede 99,99%?

13. Se o SLA composto de regiao unica ficar abaixo de 99,99%, demonstre como a implantacao multi-regiao active-active recupera a meta:
    - Mesmo se por-regiao = 99,9%, multi-regiao = 1 - (0,001)^3 = 99,9999999%
    - O padrao multi-regiao active-active compensa SLAs por-regiao mais baixos
    - Documente premissas: Front Door deve corretamente detectar e rotear ao redor de falhas regionais

### Parte 5: Testes de Falha e Operacoes

14. Projete uma abordagem de chaos engineering para validar a arquitetura:
    - **Teste de falha de zona**: Simule falha de AZ, verifique que trafego redistribui dentro da zona
    - **Teste de falha de regiao**: Desabilite uma origem de regiao no Front Door, verifique failover < 2 minutos
    - **Teste de falha de dados**: Simule indisponibilidade de regiao do Cosmos DB, verifique que escritas continuam em outras regioes
    - **Teste de falha em cascata**: Simule falha de Redis causando aumento de carga no DB

15. Crie runbooks operacionais para:
    - Failover regional (automatizado via health probes do Front Door)
    - Verificacao de consistencia de dados apos recuperacao de regiao
    - Validacao de capacidade (2 regioes podem tratar 100% do trafego?)
    - Template de revisao pos-incidente

16. Projete a estrategia de monitoramento e observabilidade:
    - Azure Monitor com dashboard cross-region
    - Score de saude por regiao (composicao de todos os servicos naquela regiao)
    - Alertas: alertar quando qualquer regiao cair abaixo do limite saudavel
    - Rastreamento de SLA: calculo mensal de uptime com relatorios automatizados

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-33"
  items={[
    "Azure Front Door configured with 3 origin groups and latency-based routing with health probes",
    "Zone-redundant compute deployed in each region with autoscale to absorb regional failure",
    "Cosmos DB multi-region writes configured with appropriate consistency and conflict resolution",
    "SQL Database failover group and geo-replicas configured for content catalog",
    "Composite SLA calculated mathematically and proven to meet 99.99% target",
    "Chaos testing plan documented with specific failure scenarios and expected behavior"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Matematica do SLA Composto</summary>

Calculo passo a passo:

**Por regiao (serial):**
0,9999 x 0,9995 x 0,99999 x 0,99995 x 0,9999 x 0,9999 = 0,99914 (aproximadamente 99,914%)

Isso esta ABAIXO de 99,99% para uma regiao unica. Implantacao de regiao unica nao pode atender ao requisito.

**Multi-regiao (paralelo, 3 regioes ativas):**
Probabilidade de falha por regiao = 1 - 0,99914 = 0,00086
Probabilidade de todas-regioes-falharem = 0,00086^3 = 0,000000000636
Disponibilidade multi-regiao = 1 - 0,000000000636 = 99,9999999% (efetivamente 9+ noves)

O insight-chave: mesmo que nenhuma regiao unica atinja 99,99%, tres regioes ativas juntas excedem em muito. Este e a proposta de valor fundamental da arquitetura multi-regiao active-active.

No entanto, isso assume que Front Door roteia perfeitamente ao redor de falhas. O proprio SLA do Front Door de 99,99% se torna o fator limitante:
SLA Efetivo = SLA do Front Door x SLA de Backend Multi-regiao = 0,9999 x ~1,0 = 99,99%

</details>

<details>
<summary>Dica 2: Active-Active vs Active-Passive Multi-Region</summary>

**Active-Active (requisito da StreamFlix):**
- Todas as regioes servem trafego de producao simultaneamente
- Failover e instantaneo (trafego ja flui para outras regioes)
- Capacidade deve ser pre-provisionada em todas as regioes (custo mais alto)
- Dados devem ser graváveis em todas as regioes (multi-region writes)
- Formula de SLA: paralelo (disponibilidade dramaticamente maior)
- Mais caro mas atende ao requisito de recuperacao < 2 minutos

**Active-Passive:**
- Uma regiao serve trafego, outras sao standby
- Failover requer iniciar/escalar regiao passiva (minutos a horas)
- Regiao standby custa menos (capacidade minima ate ativacao)
- Dados so graváveis na regiao primaria (consistencia mais simples)
- Nao pode atender recuperacao < 2 minutos para cargas de trabalho completas
- Menos caro para requisitos de disponibilidade mais baixos

A StreamFlix DEVE usar active-active para atender ao requisito de recuperacao < 2 minutos porque regioes passivas nao podem escalar para tratar trafego de producao em menos de 2 minutos.

</details>

<details>
<summary>Dica 3: Timing de Failover do Front Door</summary>

Deteccao e roteamento de failover do Azure Front Door:
- Intervalo de health probe: configuravel (5-255 segundos, padrao 30)
- Limite de nao saudavel: configuravel (tipicamente 3 falhas)
- Tempo de deteccao = intervalo x limite = 10s x 3 = 30 segundos (com configuracoes recomendadas)
- Atualizacao de roteamento: quase instantanea (arquitetura anycast, sem propagacao DNS)

Tempo total de failover para StreamFlix:
- Deteccao: 30 segundos (health probe detecta falha da origem)
- Roteamento: < 1 segundo (Front Door remove origem nao saudavel da rotacao)
- Requisicoes em andamento: podem falhar (timeout de 10-30 segundos no cliente)
- Retry do usuario: proxima requisicao tem sucesso via origem saudavel
- **Impacto total visivel ao usuario: aproximadamente 30-60 segundos** (atende requisito < 2 minutos)

Otimizacao: Defina intervalo de probe para 5 segundos com limite de 3 = 15 segundos de deteccao.

</details>

<details>
<summary>Dica 4: Zone-Redundancy do AKS e Planejamento de Capacidade</summary>

Configuracao zone-redundant do AKS para StreamFlix:
```bash
az aks create \
  --resource-group rg-streamflix-eastus2 \
  --name aks-streamflix-eastus2 \
  --node-count 6 \
  --zones 1 2 3 \
  --enable-cluster-autoscaler \
  --min-count 6 \
  --max-count 18 \
  --node-vm-size Standard_D8s_v5
```

Planejamento de capacidade:
- Carga normal por regiao: 6 nos tratam 33% do trafego (50M usuarios / 3 regioes)
- Falha de zona: 4 nos tratam 33% (AKS redistribui pods para nos sobreviventes)
- Falha de regiao: 2 regioes restantes escalam para 9-12 nos cada para tratar 50% do trafego
- Gatilho de autoscaler: CPU > 60% ou memoria > 70% -> adicionar nos
- Tempo de scale-up: ~2-3 minutos para novos nos estarem prontos (atende < 2 min apenas se pre-aquecido)

Estrategia de pre-aquecimento: manter min-count em 9 ao inves de 6 (paga 50% mais de capacidade baseline mas garante absorcao imediata de falha regional sem esperar pelo autoscaler).

</details>

<details>
<summary>Dica 5: Tempo de Inicio de Video < 50ms Globalmente</summary>

Alcancar < 50ms de tempo de inicio de video requer que CDN caching trate a grande maioria das requisicoes de video:
- PoPs do Azure CDN estao dentro de 10-30ms da maioria dos usuarios globalmente
- Latencia de primeiro byte do cache CDN: ~10-50ms (atende requisito)
- Latencia de primeiro byte da origem (cache miss): 100-500ms (NAO atende requisito)
- Estrategia: garantir > 99% de taxa de cache hit para segmentos de video

Arquitetura de cache:
- Conteudo de video e segmentado (HLS/DASH, chunks de 2-10 segundos)
- Primeiro segmento de conteudo popular pre-cached globalmente
- TTL de cache: minimo 24 horas (conteudo nao muda)
- Cache warming: enviar novo conteudo para todos os PoPs CDN antes do lancamento
- Origin shield: camada intermediaria de cache reduz carga na origem

Para o requisito de < 50ms ser atendido globalmente, o CDN nao e opcional - e arquiteturalmente critico. Sem CDN caching, a latencia cross-region sozinha excederia 50ms para usuarios remotos.

</details>

## Recursos de Aprendizagem

- [Azure Front Door routing architecture](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-routing-architecture)
- [Multi-region web application - Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/app-service-web-app/multi-region)
- [Distribute data globally with Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/distribute-data-globally)
- [Azure Well-Architected Framework - Reliability](https://learn.microsoft.com/en-us/azure/well-architected/reliability/)
- [Composite SLA calculation](https://learn.microsoft.com/en-us/azure/architecture/framework/resiliency/business-metrics#composite-slas)
- [AKS availability zones](https://learn.microsoft.com/en-us/azure/aks/availability-zones)

## Verificacao de Conhecimento

<details>
<summary>1. O SLA composto por regiao da StreamFlix e 99,914%. Como implantar active-active em 3 regioes alcanca 99,99%+ geral, e qual componente se torna o teto efetivo do SLA?</summary>

**Com 3 regioes ativas, a probabilidade de TODAS as regioes falharem simultaneamente e (1 - 0,99914)^3 = desprezivel, dando disponibilidade efetiva de ~99,9999999%.** No entanto, o proprio SLA do Azure Front Door de 99,99% se torna o teto porque e um unico servico global pelo qual todo o trafego flui - nao pode ser tornado redundante dentro do Azure. O SLA composto efetivo e: min(SLA do Front Door, SLA de backend multi-regiao) = min(99,99%, ~100%) = 99,99%. Front Door e o fator limitante, nao a infraestrutura de backend. Para exceder 99,99%, voce precisaria de uma estrategia multi-CDN (Front Door + Cloudflare/Akamai), que adiciona complexidade operacional significativa.

</details>

<details>
<summary>2. Cada regiao da StreamFlix opera a 33% de capacidade durante operacoes normais. Quando uma regiao falha, as outras duas devem tratar 50% cada. Por que autoscaling sozinho pode ser insuficiente para atender a meta de recuperacao de 2 minutos?</summary>

**O autoscaler do AKS leva 2-3 minutos para provisionar novos nos, o que excede o orcamento de recuperacao de 2 minutos.** O autoscaler deve: detectar carga aumentada (30-60 segundos), solicitar novas VMs do Azure (30-60 segundos), esperar VMs ingressarem no cluster (30-60 segundos), e agendar pods nos novos nos (10-30 segundos). Total: 2-4 minutos. Solucao: super-provisionar capacidade baseline para que cada regiao opere a ~50% de utilizacao normalmente (min-count = 9 ao inves de 6). Esta "capacidade quente" absorve imediatamente a carga adicional de uma regiao falhada sem esperar pelo autoscaler. O trade-off e 50% mais custo de computacao baseline para failover garantido em menos de 2 minutos.

</details>

<details>
<summary>3. A StreamFlix usa Cosmos DB multi-region writes para perfis de usuarios. Se um usuario atualizar seu perfil em East US 2 e imediatamente ler de Japan East, o que ele ve com Session consistency?</summary>

**Com Session consistency e multi-region writes, o usuario ve sua propria atualizacao APENAS se continuar lendo da mesma regiao (East US 2).** Garantias de Session consistency sao escopadas a um unico session token e uma unica regiao. Se a proxima leitura do usuario for roteada para Japan East (ex: porque ele viajou ou Front Door redirecionou), ele pode ver dados desatualizados ate a replicacao alcancar (tipicamente milissegundos a poucos segundos). Para garantir read-your-own-writes globalmente, a aplicacao deve passar o session token e rotear a leitura para a regiao de escrita, ou usar Bounded Staleness com janela apertada. Na pratica, este caso de borda raramente importa para leituras de perfil.

</details>

<details>
<summary>4. O catalogo de conteudo usa Azure SQL com failover group (East US 2 -> North Europe) e geo-replica (Japan East). Se East US 2 falhar, o que acontece em cada regiao?</summary>

**North Europe e automaticamente promovido a primario (via failover group, ~30 segundos), e a geo-replica de Japan East quebra porque sua fonte (East US 2) se foi.** Apos failover: North Europe trata todas as escritas como o novo primario. O endpoint DNS do failover group atualiza automaticamente. A geo-replica de Japan East deve ser recriada com North Europe como a nova fonte. Durante a lacuna (minutos a horas), Japan East tem dados read-only desatualizados de antes da falha. O design da aplicacao deve tratar isso: Japan East pode servir leituras de seu ultimo estado bom enquanto a geo-replica e re-estabelecida, ou rotear escritas atraves do endpoint do failover group (maior latencia de Japan East para North Europe). Esta e uma limitacao conhecida de combinar failover groups com geo-replicas adicionais.

</details>

## Laboratorio de Validacao

Implante uma prova de conceito minima para validar seu design:

1. Crie um resource group para este laboratorio:

```bash
az group create --name rg-az305-challenge33 --location eastus
```

2. Implante um perfil Traffic Manager com roteamento por performance:

```bash
az network traffic-manager profile create \
  --resource-group rg-az305-challenge33 \
  --name tm-multiregion-lab \
  --routing-method Performance \
  --unique-dns-name tm-az305-challenge33-$RANDOM \
  --monitor-protocol HTTP \
  --monitor-port 80 \
  --monitor-path "/"
```

3. Adicione dois endpoints externos simulando origens multi-regiao:

```bash
az network traffic-manager endpoint create \
  --resource-group rg-az305-challenge33 \
  --profile-name tm-multiregion-lab \
  --name endpoint-eastus \
  --type externalEndpoints \
  --target "www.microsoft.com" \
  --endpoint-location eastus

az network traffic-manager endpoint create \
  --resource-group rg-az305-challenge33 \
  --profile-name tm-multiregion-lab \
  --name endpoint-westeurope \
  --type externalEndpoints \
  --target "www.microsoft.com" \
  --endpoint-location westeurope
```

4. Verifique que o perfil esta ativo e endpoints estao sendo monitorados:

```bash
az network traffic-manager profile show \
  --resource-group rg-az305-challenge33 \
  --name tm-multiregion-lab \
  --query "{Status:profileStatus, Routing:trafficRoutingMethod, FQDN:dnsConfig.fqdn}" -o table
```

5. Confirme que ambos endpoints estao online e respondendo a health checks:

```bash
az network traffic-manager endpoint list \
  --resource-group rg-az305-challenge33 \
  --profile-name tm-multiregion-lab \
  --query "[].{Name:name, Status:endpointMonitorStatus, Location:endpointLocation}" -o table
```

:::tip
Esta mini-implantacao valida suas decisoes de design com recursos reais do Azure. E opcional, mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge33 --yes --no-wait
```

---

**Proximo**: [Challenge 34: Design Network Topology](/docs/az-305/infrastructure/challenge-34)
