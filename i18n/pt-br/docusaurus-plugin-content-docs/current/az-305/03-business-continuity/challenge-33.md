---
sidebar_position: 9
title: "Desafio 33: Projetar uma Aplicacao Multi-Região Altamente Disponível"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 33: Projetar uma Aplicacao Multi-Região Altamente Disponível

:::info Tempo Estimado e Custo

**90-120 min** | **Custo estimado**: $20-40 | **Peso no Exame: 15-20%**

:::

## Introdução

A StreamFlix é uma plataforma de streaming de vídeo atendendo 50 milhões de usuários ativos mensais na América do Norte, Europa e Asia-Pacifico. A plataforma transmite conteúdo de vídeo 4K, gerencia perfis de usuários e histórico de visualizacao, processa recomendacoes em tempo real e trata metadados de licenciamento de conteúdo. A StreamFlix se posicionou como a alternativa "sempre disponível" aos concorrentes, prometendo aos usuários que nunca experimentarao uma tela de buffering ou indisponibilidade de serviço.

A equipe executiva determinou um SLA composto de 99,99% com menos de 50ms de tempo de início de vídeo globalmente e a capacidade de sobreviver a uma falha completa de região Azure com menos de 2 minutos de impacto visivel ao usuário. A plataforma deve estar ativa em 3 regiões simultaneamente (East US 2, North Europe, Japan East), não em uma configuração active-passive. Toda região deve servir trafego de produção o tempo todo, e se qualquer região única falhar, as duas restantes devem absorver seu trafego sem degradacao.

Este e o desafio capstone do Dominio 3. Você combinara todos os conceitos de alta disponibilidade, backup e disaster recovery dos Challenges 25-32 em uma arquitetura multi-região completa e pronta para produção. Você deve calcular o SLA composto matematicamente, provar que atende a meta de 99,99% é demonstrar que cada componente tem redundância apropriada.

## Habilidades do Exame Cobertas

- Recomendar uma solução de alta disponibilidade para computacao
- Recomendar uma solução de alta disponibilidade para dados relacionais
- Recomendar uma solução de alta disponibilidade para dados semi-estruturados e não estruturados
- Recomendar uma solução de recuperação para cargas de trabalho Azure e hibridas que atenda aos objetivos de recuperação

## Tarefas de Design

### Parte 1: Roteamento Global de Trafego e Camada de Edge

1. Projete o ponto de entrada global usando Azure Front Door:
   - Configure 3 origin groups (East US 2, North Europe, Japan East)
   - Método de roteamento: baseado em latência (usuários roteados para região saudavel mais próxima)
   - Health probes: HTTP no endpoint `/health`, intervalo de 10 segundos, 3 falhas = não saudavel
   - Calcule o tempo de detecção de failover: intervalo de probe x limite de falha = ?

2. Projete a estratégia de CDN e caching:
   - Conteúdo de vídeo: servir a partir do Azure CDN (ou regras de caching do Front Door) com TTL de 24 horas
   - Respostas de API: fazer cache de dados personalizados? (Não - conteúdo dinâmico ignora cache)
   - Ativos estaticos (UI, thumbnails): cache de 7 dias com URLs versionadas para cache-busting
   - Calcule: qual porcentagem de requisicoes acerta o cache CDN vs. origem?

3. Documente o comportamento de failover quando uma região falha:
   - Tempo para detectar: intervalo de health probe x limite
   - Tempo para redirecionar: propagacao do Front Door (quase instantanea, anycast)
   - Impacto ao usuário: requisicoes em andamento para região falhada falham, próxima requisicao vai para região saudavel
   - Interrupcao total visivel ao usuário: aproximadamente 30-60 segundos

### Parte 2: Camada de Computação (Por Região)

4. Projete a arquitetura de computacao dentro de cada região:
   - Camada Web/API: Azure Kubernetes Service (AKS) ou App Service (zone-redundant)
   - Motor de recomendacao: Container Apps com autoscale
   - Transcodificacao de vídeo: VMSS com spot instances (batch, não crítico para HA)

5. Para cada região, configure zone redundancy:
   - AKS com 3 availability zones, mínimo 3 nos (1 por zona)
   - Node autoscaler: min 3, max 12 (absorver trafego de uma região falhada)
   - Pod disruption budgets: minAvailable 66% (sobreviver a falha de zona)

6. Calcule a capacidade de computacao por região necessária para absorver trafego de uma região falhada:
   - Operação normal: cada região trata 33% do trafego global
   - Durante falha regional: cada região sobrevivente trata 50%
   - Folga do autoscaler: cada região deve poder escalar para 150% da capacidade normal em 2 minutos
   - Projete os gatilhos de autoscale e estratégia de pré-aquecimento

### Parte 3: Camada de Dados (Multi-Region)

7. Projete a arquitetura de dados para cada tipo de dado:

| Tipo de Dado | Serviço | Regiões | Consistência | Failover |
|-----------|---------|---------|-------------|----------|
| Perfis de usuário e histórico | Cosmos DB (NoSQL) | 3, multi-write | Session | Automático (99,999%) |
| Catálogo de conteúdo e licenciamento | Azure SQL Database | 3 (1 primário + 2 leitura) | Strong | Failover group |
| Arquivos de vídeo (conteúdo 4K) | Blob Storage + CDN | 3 (RA-GRS) | Eventual | CDN cache + leitura secundária |
| Tokens de sessão | Azure Cache for Redis | 3 (Enterprise, active geo) | Eventual | Replicação cross-region |
| Recomendacoes (cache de modelo ML) | Redis ou Cosmos DB | 3 | Eventual | Reconstrucao por região |

8. Configure Cosmos DB para a carga de trabalho de perfil de usuário e histórico de visualizacao:
   - Multi-region writes (todas as 3 regiões escrevem localmente)
   - Session consistency (usuário ve suas próprias escritas imediatamente)
   - Estratégia de partition key: `/userId` (garante que dados do usuário estao co-localizados)
   - Autoscale: 10.000 - 100.000 RU/s por região (dependente de trafego)

9. Projete a topologia do SQL Database para o catálogo de conteúdo:
   - Primário: East US 2 (Business Critical, zone-redundant, 16 vCores)
   - Secundário do failover group: North Europe (failover automático, grace de 1 hora)
   - Active geo-replica: Japan East (read-only, failover manual)
   - Justifique por que catálogo de conteúdo usa SQL (restrições de licenciamento relacional, consultas complexas) vs. Cosmos DB

10. Configure o armazenamento de conteúdo de vídeo para entrega global:
    - Armazenamento primário: East US 2 (RA-GRS, replicado para região pareada)
    - Contas de armazenamento secundarias em North Europe e Japan East para conteúdo region-local
    - Azure CDN com múltiplos origin groups para failover
    - Cache warming: pré-popular cache CDN para novos lancamentos antes do lancamento

### Parte 4: Calculo do SLA Composto

11. Calcule o SLA composto para a arquitetura completa:

**SLA por região (dependências seriais):**
- Azure Front Door: 99,99%
- AKS (zone-redundant): 99,95%
- Cosmos DB (multi-region write): 99,999%
- Azure SQL (Business Critical, zone-redundant): 99,995%
- Azure Cache for Redis (Enterprise): 99,99%
- Storage (RA-GRS): 99,99%

SLA composto por região = Front Door x AKS x Cosmos DB x SQL x Redis x Storage

**SLA multi-região (paralelo, active-active em 3 regiões):**
- Disponibilidade multi-região = 1 - (1 - por-região)^3

12. Realize o calculo:
    - Por região: 0,9999 x 0,9995 x 0,99999 x 0,99995 x 0,9999 x 0,9999 = ?
    - Isso atende 99,99%? Se não, qual é o gargalo?
    - Multi-região: 1 - (1 - por-região)^3 = ?
    - A arquitetura multi-região atende ou excede 99,99%?

13. Se o SLA composto de região única ficar abaixo de 99,99%, demonstre como a implantacao multi-região active-active recupera a meta:
    - Mesmo se por-região = 99,9%, multi-região = 1 - (0,001)^3 = 99,9999999%
    - O padrão multi-região active-active compensa SLAs por-região mais baixos
    - Documente premissas: Front Door deve corretamente detectar e rotear ao redor de falhas regionais

### Parte 5: Testes de Falha e Operações

14. Projete uma abordagem de chaos engineering para validar a arquitetura:
    - **Teste de falha de zona**: Simule falha de AZ, verifique que trafego redistribui dentro da zona
    - **Teste de falha de região**: Desabilite uma origem de região no Front Door, verifique failover < 2 minutos
    - **Teste de falha de dados**: Simule indisponibilidade de região do Cosmos DB, verifique que escritas continuam em outras regiões
    - **Teste de falha em cascata**: Simule falha de Redis causando aumento de carga no DB

15. Crie runbooks operacionais para:
    - Failover regional (automatizado via health probes do Front Door)
    - Verificacao de consistência de dados apos recuperação de região
    - Validação de capacidade (2 regiões podem tratar 100% do trafego?)
    - Template de revisao pós-incidente

16. Projete a estratégia de monitoramento e observabilidade:
    - Azure Monitor com dashboard cross-region
    - Score de saúde por região (composicao de todos os serviços naquela região)
    - Alertas: alertar quando qualquer região cair abaixo do limite saudavel
    - Rastreamento de SLA: calculo mensal de uptime com relatórios automatizados

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

**Por região (serial):**
0,9999 x 0,9995 x 0,99999 x 0,99995 x 0,9999 x 0,9999 = 0,99914 (aproximadamente 99,914%)

Isso esta ABAIXO de 99,99% para uma região única. Implantação de região única não pode atender ao requisito.

**Multi-região (paralelo, 3 regiões ativas):**
Probabilidade de falha por região = 1 - 0,99914 = 0,00086
Probabilidade de todas-regiões-falharem = 0,00086^3 = 0,000000000636
Disponibilidade multi-região = 1 - 0,000000000636 = 99,9999999% (efetivamente 9+ noves)

O insight-chave: mesmo que nenhuma região única atinja 99,99%, três regiões ativas juntas excedem em muito. Este e a proposta de valor fundamental da arquitetura multi-região active-active.

No entanto, isso assume que Front Door roteia perfeitamente ao redor de falhas. O próprio SLA do Front Door de 99,99% se torna o fator limitante:
SLA Efetivo = SLA do Front Door x SLA de Backend Multi-região = 0,9999 x ~1,0 = 99,99%

</details>

<details>
<summary>Dica 2: Active-Active vs Active-Passive Multi-Region</summary>

**Active-Active (requisito da StreamFlix):**
- Todas as regiões servem trafego de produção simultaneamente
- Failover e instantaneo (trafego já flui para outras regiões)
- Capacidade deve ser pré-provisionada em todas as regiões (custo mais alto)
- Dados devem ser graváveis em todas as regiões (multi-region writes)
- Formula de SLA: paralelo (disponibilidade dramaticamente maior)
- Mais caro mas atende ao requisito de recuperação < 2 minutos

**Active-Passive:**
- Uma região serve trafego, outras sao standby
- Failover requer iniciar/escalar região passiva (minutos a horas)
- Região standby custa menos (capacidade mínima até ativacao)
- Dados só graváveis na região primária (consistência mais simples)
- Não pode atender recuperação < 2 minutos para cargas de trabalho completas
- Menos caro para requisitos de disponibilidade mais baixos

A StreamFlix DEVE usar active-active para atender ao requisito de recuperação < 2 minutos porque regiões passivas não podem escalar para tratar trafego de produção em menos de 2 minutos.

</details>

<details>
<summary>Dica 3: Timing de Failover do Front Door</summary>

Detecção e roteamento de failover do Azure Front Door:
- Intervalo de health probe: configuravel (5-255 segundos, padrão 30)
- Limite de não saudavel: configuravel (tipicamente 3 falhas)
- Tempo de detecção = intervalo x limite = 10s x 3 = 30 segundos (com configurações recomendadas)
- Atualização de roteamento: quase instantanea (arquitetura anycast, sem propagacao DNS)

Tempo total de failover para StreamFlix:
- Detecção: 30 segundos (health probe detecta falha da origem)
- Roteamento: < 1 segundo (Front Door remove origem não saudavel da rotacao)
- Requisicoes em andamento: podem falhar (timeout de 10-30 segundos no cliente)
- Retry do usuário: próxima requisicao tem sucesso via origem saudavel
- **Impacto total visivel ao usuário: aproximadamente 30-60 segundos** (atende requisito < 2 minutos)

Otimização: Defina intervalo de probe para 5 segundos com limite de 3 = 15 segundos de detecção.

</details>

<details>
<summary>Dica 4: Zone-Redundancy do AKS e Planejamento de Capacidade</summary>

Configuração zone-redundant do AKS para StreamFlix:
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
- Carga normal por região: 6 nos tratam 33% do trafego (50M usuários / 3 regiões)
- Falha de zona: 4 nos tratam 33% (AKS redistribui pods para nos sobreviventes)
- Falha de região: 2 regiões restantes escalam para 9-12 nos cada para tratar 50% do trafego
- Gatilho de autoscaler: CPU > 60% ou memoria > 70% -> adicionar nos
- Tempo de scale-up: ~2-3 minutos para novos nos estarem prontos (atende < 2 min apenas se pré-aquecido)

Estratégia de pré-aquecimento: manter min-count em 9 ao inves de 6 (paga 50% mais de capacidade baseline mas garante absorcao imediata de falha regional sem esperar pelo autoscaler).

</details>

<details>
<summary>Dica 5: Tempo de Início de Video < 50ms Globalmente</summary>

Alcancar < 50ms de tempo de início de vídeo requer que CDN caching trate a grande maioria das requisicoes de vídeo:
- PoPs do Azure CDN estao dentro de 10-30ms da maioria dos usuários globalmente
- Latência de primeiro byte do cache CDN: ~10-50ms (atende requisito)
- Latência de primeiro byte da origem (cache miss): 100-500ms (NAO atende requisito)
- Estratégia: garantir > 99% de taxa de cache hit para segmentos de vídeo

Arquitetura de cache:
- Conteúdo de vídeo e segmentado (HLS/DASH, chunks de 2-10 segundos)
- Primeiro segmento de conteúdo popular pré-cached globalmente
- TTL de cache: mínimo 24 horas (conteúdo não muda)
- Cache warming: enviar novo conteúdo para todos os PoPs CDN antes do lancamento
- Origin shield: camada intermediaria de cache reduz carga na origem

Para o requisito de < 50ms ser atendido globalmente, o CDN não é opcional - e arquiteturalmente crítico. Sem CDN caching, a latência cross-region sozinha excederia 50ms para usuários remotos.

</details>

## Recursos de Aprendizagem

- [Azure Front Door routing architecture](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-routing-architecture)
- [Multi-region web application - Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/app-service-web-app/multi-region)
- [Distribute data globally with Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/distribute-data-globally)
- [Azure Well-Architected Framework - Reliability](https://learn.microsoft.com/en-us/azure/well-architected/reliability/)
- [Composite SLA calculation](https://learn.microsoft.com/en-us/azure/architecture/framework/resiliency/business-metrics#composite-slas)
- [AKS availability zones](https://learn.microsoft.com/en-us/azure/aks/availability-zones)

## Verificação de Conhecimento

<details>
<summary>1. O SLA composto por região da StreamFlix e 99,914%. Como implantar active-active em 3 regiões alcanca 99,99%+ geral, e qual componente se torna o teto efetivo do SLA?</summary>

**Com 3 regiões ativas, a probabilidade de TODAS as regiões falharem simultaneamente e (1 - 0,99914)^3 = desprezivel, dando disponibilidade efetiva de ~99,9999999%.** No entanto, o próprio SLA do Azure Front Door de 99,99% se torna o teto porque é um único serviço global pelo qual todo o trafego flui - não pode ser tornado redundante dentro do Azure. O SLA composto efetivo e: min(SLA do Front Door, SLA de backend multi-região) = min(99,99%, ~100%) = 99,99%. Front Door e o fator limitante, não a infraestrutura de backend. Para exceder 99,99%, você precisaria de uma estratégia multi-CDN (Front Door + Cloudflare/Akamai), que adiciona complexidade operacional significativa.

</details>

<details>
<summary>2. Cada região da StreamFlix opera a 33% de capacidade durante operações normais. Quando uma região falha, as outras duas devem tratar 50% cada. Por que autoscaling sozinho pode ser insuficiente para atender a meta de recuperação de 2 minutos?</summary>

**O autoscaler do AKS leva 2-3 minutos para provisionar novos nos, o que excede o orcamento de recuperação de 2 minutos.** O autoscaler deve: detectar carga aumentada (30-60 segundos), solicitar novas VMs do Azure (30-60 segundos), esperar VMs ingressarem no cluster (30-60 segundos), e agendar pods nos novos nos (10-30 segundos). Total: 2-4 minutos. Solução: super-provisionar capacidade baseline para que cada região opere a ~50% de utilizacao normalmente (min-count = 9 ao inves de 6). Esta "capacidade quente" absorve imediatamente a carga adicional de uma região falhada sem esperar pelo autoscaler. O trade-off e 50% mais custo de computacao baseline para failover garantido em menos de 2 minutos.

</details>

<details>
<summary>3. A StreamFlix usa Cosmos DB multi-region writes para perfis de usuários. Se um usuário atualizar seu perfil em East US 2 e imediatamente ler de Japan East, o que ele ve com Session consistency?</summary>

**Com Session consistency e multi-region writes, o usuário ve sua própria atualização APENAS se continuar lendo da mesma região (East US 2).** Garantias de Session consistency sao escopadas a um único session token é uma única região. Se a próxima leitura do usuário for roteada para Japan East (ex: porque ele viajou ou Front Door redirecionou), ele pode ver dados desatualizados até a replicação alcancar (tipicamente milissegundos a poucos segundos). Para garantir read-your-own-writes globalmente, a aplicação deve passar o session token e rotear a leitura para a região de escrita, ou usar Bounded Staleness com janela apertada. Na prática, este caso de borda raramente importa para leituras de perfil.

</details>

<details>
<summary>4. O catálogo de conteúdo usa Azure SQL com failover group (East US 2 -> North Europe) e geo-replica (Japan East). Se East US 2 falhar, o que acontece em cada região?</summary>

**North Europe e automaticamente promovido a primário (via failover group, ~30 segundos), e a geo-replica de Japan East quebra porque sua fonte (East US 2) se foi.** Apos failover: North Europe trata todas as escritas como o novo primário. O endpoint DNS do failover group atualiza automaticamente. A geo-replica de Japan East deve ser recriada com North Europe como a nova fonte. Durante a lacuna (minutos a horas), Japan East tem dados read-only desatualizados de antes da falha. O design da aplicação deve tratar isso: Japan East pode servir leituras de seu último estado bom enquanto a geo-replica e re-estabelecida, ou rotear escritas através do endpoint do failover group (maior latência de Japan East para North Europe). Esta é uma limitacao conhecida de combinar failover groups com geo-replicas adicionais.

</details>

## Laboratório de Validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um resource group para este laboratório:

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
  --protocol HTTP \
  --port 80 \
  --path "/"
```

3. Adicione dois endpoints externos simulando origens multi-região:

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
Esta mini-implantacao válida suas decisoes de design com recursos reais do Azure. E opcional, mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge33 --yes --no-wait
```

---

**Próximo**: [Challenge 34: Design Network Topology](/docs/az-305/infrastructure/challenge-34)
