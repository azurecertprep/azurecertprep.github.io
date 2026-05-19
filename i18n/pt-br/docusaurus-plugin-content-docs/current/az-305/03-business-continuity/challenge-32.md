---
sidebar_position: 8
title: "Desafio 32: Projetar Alta Disponibilidade para Dados Não Relacionais"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 32: projetar alta disponibilidade para dados não relacionais

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $15-30 | **Peso no Exame: 15-20%**

:::

## Introdução

A BattleForge Games é uma empresa global de jogos mobile com 25 milhões de jogadores ativos diarios na América do Norte, Europa e Asia-Pacifico. Seu jogo principal armazena perfis de jogadores, inventário, dados de progressao e estado de partida em tempo real no Azure Cosmos DB (NoSQL API) com multi-region writes. Ativos do jogo (texturas, audio, modelos 3D totalizando 5 TB) são servidos a partir do Azure Blob Storage através do Azure CDN para carregamento rápido.

A industria de games demanda disponibilidade extrema: se jogadores não conseguem acessar seus perfis ou ativos do jogo, eles mudam para um concorrente em minutos. A BattleForge requer que perfis de jogadores sejam graváveis a partir de qualquer região com menos de 100ms de latência, ativos do jogo devem estar disponíveis mesmo se uma região Azure inteira cair, e atualizações de estado de partida devem ser consistentes entre todos os jogadores em uma partida (independente de sua localização geográfica).

O principal desafio técnico e equilibrar consistência vs. disponibilidade no Cosmos DB. Multi-region writes fornecem a menor latência mas introduzem complexidade de resolução de conflitos. A camada de armazenamento deve fornecer acesso continuo a 5 TB de ativos do jogo mesmo durante falhas regionais, sem que jogadores experimentem atrasos de carregamento. A BattleForge tem um orcamento de $8.000/mes para sua camada de dados (excluindo computacao).

## Habilidades do exame cobertas

- Recomendar uma solução de alta disponibilidade para dados semi-estruturados e não estruturados

## Tarefas de design

### Parte 1: configuração de Multi-Region write do Cosmos DB

1. Projete a implantação do Cosmos DB para perfis de jogadores:
   - Conta implantada em 3 regiões: East US, West Europe, Japan East
   - Multi-region writes habilitado (jogadores escrevem na região mais próxima)
   - Documente as opcoes de política de resolução de conflitos:
     - Last Writer Wins (LWW) - automático, usa timestamp
     - Custom conflict resolution - stored procedure
     - Qual é aprópriado para perfis de jogadores?

2. Avalie os cinco consistency levels do Cosmos DB e selecione o aprópriado para cada carga de trabalho:

| Consistency Level | Perfis de Jogadores | Estado de Partida | Leaderboards |
|-------------------|----------------|-------------|--------------|
| Strong | ? | ? | ? |
| Bounded Staleness | ? | ? | ? |
| Session | ? | ? | ? |
| Consistent Prefix | ? | ? | ? |
| Eventual | ? | ? | ? |

3. Justifique sua escolha de consistência considerando:
   - Session consistency para perfis de jogadores: jogador ve suas próprias escritas imediatamente, outros veem eventualmente
   - Strong consistency para estado de partida: todos os jogadores devem ver o mesmo estado do jogo
   - Limitacao: Strong consistency NAO esta disponível com multi-region writes
   - Qual alternativa alcanca consistência de partida sem strong consistency?

4. Configure a conta Cosmos DB com multi-region writes:

```bash
# Create Cosmos DB account with multi-region writes
az cosmosdb create \
  --resource-group rg-battleforge \
  --name cosmos-battleforge \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=true \
  --locations regionName=westeurope failoverPriority=1 isZoneRedundant=true \
  --locations regionName=japaneast failoverPriority=2 isZoneRedundant=true \
  --enable-multiple-write-locations true \
  --default-consistency-level Session
```

### Parte 2: disponibilidade e failover do Cosmos DB

5. Análise as caracteristicas de disponibilidade da configuração multi-region write:
   - Qual SLA o Cosmos DB multi-region write fornece? (99,999% para leitura e escrita)
   - O que acontece quando uma região falha? (Outras regiões continuam servindo leituras E escritas)
   - Como a zone redundancy dentro de cada região adiciona proteção adicional?

6. Compare single-region write vs. multi-region write para o caso de uso de estado de partida:

| Aspecto | Single-Region Write | Multi-Region Write |
|--------|--------------------|--------------------|
| Latência de escrita de regiões remotas | Alta (round-trip cross-region) | Baixa (escrita local) |
| Resolução de conflitos | Sem conflitos | Deve tratar conflitos |
| Opcoes de consistência | Todos os 5 níveis incluindo Strong | Strong NAO disponível |
| Disponibilidade de escrita durante falha regional | Failover necessário (segundos) | Automática (outras regiões continuam) |
| Custo | Menor (sem taxa de replicação de escrita) | Maior (cobracas de RU multi-master) |

7. Projete a arquitetura de estado de partida considerando a limitacao de strong consistency:
   - Opcao A: Single-region write com bounded staleness (baixo conflito, defasagem previsível)
   - Opcao B: Multi-region writes com custom conflict resolution (complexo mas mais rápido)
   - Opcao C: Usar um serviço diferente para estado de partida (ex: Azure SignalR para sync em tempo real)
   - Recomende e justifique sua escolha

### Parte 3: redundância de Storage account para ativos do jogo

8. Projete a redundância de armazenamento para 5 TB de ativos do jogo entre estas opcoes:

| Redundância | Copias | Regiões | Leitura Durante Interrupcao | Multiplicador de Custo |
|------------|--------|---------|-------------------|----------------|
| LRS | 3 em 1 zona | 1 | Não | 1x |
| ZRS | 3 entre zonas | 1 | Falha de zona: Sim | ~1,25x |
| GRS | 6 (3+3) | 2 | Não (failover de escrita necessário) | ~2x |
| GZRS | 6 (3 ZRS + 3 LRS) | 2 | Falha de zona: Sim | ~2,25x |
| RA-GRS | 6 (3+3) | 2 | Sim (secundário read-only) | ~2x + ops de leitura |
| RA-GZRS | 6 (3 ZRS + 3 LRS) | 2 | Sim (zona + região) | ~2,5x |

9. Selecione a redundância aprópriada para ativos do jogo considerando:
   - Ativos devem estar disponíveis mesmo se uma região completa falhar
   - Acesso de leitura é necessário imediatamente (não pode esperar por failover)
   - RA-GZRS fornece a maior disponibilidade mas com custo mais alto
   - RA-GRS é suficiente dado que CDN caching cobre a maioria dos cenários de leitura?

10. Configure a storage account com a redundância selecionada e o CDN para distribuição global:

```bash
# Create storage account with RA-GRS (cdn handles zone-level caching)
az storage account create \
  --resource-group rg-battleforge \
  --name stbattleforgeassets \
  --location eastus \
  --sku Standard_RAGRS \
  --kind StorageV2 \
  --access-tier Hot
```

### Parte 4: CDN e disponibilidade de edge

11. Projete a arquitetura CDN para entrega de ativos do jogo:
    - Azure CDN (ou Azure Front Door com regras de caching) como mecanismo principal de entrega
    - Configure regras de cache: ativos do jogo são imutáveis (URLs versionadas), cache por 30 dias
    - Failover de origem: se armazenamento primário estiver indisponível, CDN serve do cache ou origem secundária
    - Calcule: com TTL de cache de 30 dias e 5 TB de ativos, qual porcentagem esta tipicamente em cache no edge?

12. Projete a estratégia de fallback quando CDN cache miss durante uma interrupcao da região primária:
    - Configure CDN origin group com primário (East US) e secundário (endpoint secundário RA-GRS)
    - Health probe na origem para detectar falha
    - Failover automático de origem dentro da configuração CDN

13. Calcule o custo mensal total para a camada de dados:
    - Cosmos DB: 3 regiões, multi-region write, consumo estimado de RU
    - Armazenamento: 5 TB com redundância RA-GRS
    - CDN: custos de largura de banda para entrega global
    - Verifique se o total cabe dentro do orcamento de $8.000/mes

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-32"
  items={[
    "Cosmos DB configured with multi-region writes and zone redundancy in each region",
    "Consistency level selected and justified for each workload (profiles, match state, leaderboards)",
    "Conflict resolution strategy designed for multi-region writes",
    "Storage account redundancy selected (RA-GRS or RA-GZRS) with justification",
    "CDN configured with origin failover for continuous asset delivery",
    "Total data tier cost estimated and validated against $8K/month budget"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Consistência e Multi-Region Writes do Cosmos DB</summary>

Limitacao crítica: **Strong consistency NAO esta disponível quando multi-region writes estao habilitados.** Isso ocorre porque strong consistency requer replicação sincrona para todas as replicas antes de reconhecer uma escrita, o que é impraticavel entre regiões geograficamente distantes (latência seria de centenas de milissegundos).

Para contas com multi-region write, a maior consistência disponível e Bounded Staleness:
- Bounded Staleness: garante que leituras não estao mais que K versoes ou T segundos atras das escritas
- Session: garante que uma única sessão de cliente ve suas próprias escritas (escolha mais popular)
- Consistent Prefix: garante que leituras nunca veem escritas fora de ordem
- Eventual: sem garantias de ordenacao, menor latência

Para perfis de jogadores: Session consistency é ideal (jogadores veem suas próprias mudanças imediatamente).
Para estado de partida: Considere uma abordagem single-write-region com Strong consistency para o banco de dados de partida, ou use um mecanismo externo de coordenacao.

</details>

<details>
<summary>Dica 2: Resolução de Conflitos de Multi-Region Write do Cosmos DB</summary>

Quando duas regiões escrevem no mesmo documento simultaneamente, um conflito ocorre. Opcoes de resolução:

**Last Writer Wins (LWW)**:
- Política padrão, automática
- Usa `_ts` (timestamp) ou um caminho customizado para determinar vencedor
- Mais simples mas pode perder dados (escrita perdedora e descartada)
- Bom para: perfis de jogadores onde o estado mais recente e o que importa

**Custom conflict resolution (stored procedure)**:
- Seu código decide como mesclar escritas conflitantes
- Pode implementar lógica de merge customizada (ex: combinar mudanças de inventário)
- Mais complexo mas preserva ambas as escritas
- Bom para: inventário de jogo onde ambas adicoes devem ser mantidas

**Conflict feed (resolução manual)**:
- Conflitos são escritos em um conflict feed para resolução em nível de aplicação
- Aplicação le e resolve conflitos de forma assincrona
- Mais flexível mas maior latência para resolução

Para perfis de jogadores da BattleForge: LWW com `_ts` e aprópriado. Se o jogador atualizar seu perfil de dois dispositivos simultaneamente, a última atualização vence. Para inventário, custom merge (combinar ambas mudanças de inventário) previne perda de itens.

</details>

<details>
<summary>Dica 3: RA-GRS vs CDN para Disponibilidade de Ativos</summary>

Ambos fornecem disponibilidade de leitura durante interrupcoes, mas servem propositos diferentes:

**RA-GRS (Read-Access Geo-Redundant Storage)**:
- Endpoint secundário sempre disponível para leituras: `stbattleforgeassets-secondary.blob.core.windows.net`
- RPO: até 15 minutos (defasagem de replicação assincrona)
- Sem caching - toda leitura vai para o armazenamento
- 5 TB completos disponíveis do secundário o tempo todo
- Use como failover de origem do CDN, não como endpoint direto para jogadores

**Azure CDN**:
- Cache em localizacoes edge globais (150+ PoPs mundialmente)
- Latência sub-50ms para a maioria dos jogadores globalmente
- Serve do cache mesmo se a origem estiver completamente indisponível (até TTL expirar)
- Com TTL de 30 dias e URLs versionadas: 95%+ de taxa de cache hit para ativos do jogo
- Ativos faltando (cache miss) precisam de uma origem saudavel - e aqui que o secundário RA-GRS ajuda

Recomendado: CDN como entrega primária com secundário RA-GRS como origem de failover.

</details>

<details>
<summary>Dica 4: Precos do Cosmos DB para Multi-Region</summary>

Consideracoes de custo de multi-region write do Cosmos DB:
- Custo de RU de escrita: cobrado por região que participa em escritas (efetivamente multiplicado pela contagem de regiões)
- Exemplo: 10.000 RU/s provisionados, 3 regiões de escrita = 30.000 RU/s cobrados
- RUs de leitura: cobrados por região onde leituras ocorrem
- Alternativa: Use autoscale para evitar super-provisionamento (RU/s máximo, pague pelo uso real)

Estimativa de custo para BattleForge:
- Operações de perfil de jogador: ~5.000 RU/s em média (picos de 15.000 durante eventos)
- 3 regiões de escrita: 15.000 RU/s base provisionados
- A $0,008 por 100 RU/s/hora: 15.000/100 x $0,008 x 730 horas = ~$876/mes
- Com autoscale (max 50.000 RU/s): cobrado a 10% do máximo quando ocioso = $292/mes base

Armazenamento: $0,25/GB/mes para dados, replicado para 3 regiões = $0,75/GB/mes efetivo

</details>

<details>
<summary>Dica 5: Requisitos para SLA de 99,999% do Cosmos DB</summary>

Para alcancar o SLA de 99,999% (5 noves, ~26 segundos de inatividade/ano), TODOS os seguintes devem estar configurados:
1. Multi-region writes habilitado (distribui escritas, sem ponto único de falha)
2. Pelo menos 2 regiões configuradas (mínimo para geo-redundância)
3. Zone redundancy habilitada em cada região (isZoneRedundant=true)

Sem multi-region writes: SLA e 99,99% para leituras, 99,99% para escritas (com zone redundancy)
Com multi-region writes: SLA e 99,999% para leituras e escritas

Este e o SLA mais alto de qualquer serviço de banco de dados Azure. Compare:
- Azure SQL Business Critical zone-redundant: 99,995%
- Azure SQL General Purpose zone-redundant: 99,995%
- Cosmos DB single-region zone-redundant: 99,99%
- Cosmos DB multi-region multi-write: 99,999%

</details>

## Recursos de aprendizagem

- [Distribute data globally with Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/distribute-data-globally)
- [Consistency levels in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels)
- [Conflict resolution in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/conflict-resolution-policies)
- [Azure Storage redundancy](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy)
- [Azure CDN overview](https://learn.microsoft.com/en-us/azure/cdn/cdn-overview)
- [High availability for Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/high-availability)

## Verificação de conhecimento

<details>
<summary>1. A BattleForge precisa que todos os jogadores em uma partida multiplayer vejam o mesmo estado do jogo. Por que eles não podem usar Strong consistency com multi-region writes, e qual é a alternativa recomendada?</summary>

**Strong consistency não esta disponível quando multi-region writes estao habilitados no Cosmos DB.** Strong consistency requer reconhecimento sincrono de todas as replicas antes de completar uma escrita, o que cria latência inaceitavel entre regiões geograficamente distantes. A alternativa recomendada para estado de partida e usar single-write-region com Strong consistency para o banco de dados de partida específicamente (sessões de partida são tipicamente regionais), ou usar Bounded Staleness com janela de staleness apertada (ex: 5 segundos, 10 operações). Alternativamente, use Azure SignalR Service para sincronizacao de estado em tempo real, com Cosmos DB apenas para persistência.

</details>

<details>
<summary>2. Uma conta Cosmos DB com multi-region writes e zone redundancy fornece SLA de 99,999%. O que isso significa em termos praticos de inatividade, e qual cenário ainda poderia causar indisponibilidade?</summary>

**99,999% de disponibilidade significa máximo de 26 segundos de inatividade por ano (ou ~2,6 segundos por mes).** Isso e alcancado porque escritas podem ter sucesso em qualquer uma das regiões configuradas - uma falha regional completa simplesmente significa que escritas pousam em outras regiões. Cenários que ainda poderiam causar indisponibilidade incluem: (1) Múltiplas regiões falhando simultaneamente (extremamente improvavel), (2) Problemas de plataforma Azure-wide afetando o control plane do Cosmos DB globalmente, (3) Problemas de rede do lado do cliente (não cobertos pelo SLA), (4) Exceder throughput provisionado causando erros de throttling 429 (não é uma falha de disponibilidade verdadeira mas impacta usuários de forma similar). Planejamento adequado de capacidade de RU e autoscale mitigam o cenário 4.

</details>

<details>
<summary>3. A BattleForge usa RA-GRS para seu armazenamento de ativos de jogo de 5 TB. Durante uma interrupcao da região primária, qual é a staleness máxima dos dados que jogadores podem ler do secundário?</summary>

**Até 15 minutos (mas tipicamente muito menos).** RA-GRS replica dados de forma assincrona para a região secundária. A Microsoft visa um RPO de 15 minutos (sem garantia de SLA sobre defasagem exata). Na prática, a replicação geralmente esta segundos atras. Para ativos de jogo que são escritos uma vez e lidos muitas vezes (arquivos imutáveis, versionados), esta staleness e irrelevante - ativos carregados 15+ minutos atras estao completamente replicados. O único risco e ativos carregados muito recentemente (nova atualização do jogo) que ainda não foram replicados. Mitigacao: carregue novos ativos pelo menos 30 minutos antes de torna-los referenciados por clientes do jogo, ou use cache warming do CDN.

</details>

<details>
<summary>4. Dois jogadores em regiões diferentes simultaneamente compram o mesmo item de edicao limitada na BattleForge (apenas 1 disponível). Com resolução de conflito Last Writer Wins, o que acontece?</summary>

**Ambas escritas inicialmente tem sucesso localmente (cada jogador ve a compra confirmada), mas a resolução de conflito LWW mantera apenas o timestamp mais recente, efetivamente "cancelando" a compra do outro jogador apos a replicação.** Isso cria uma experiência ruim para o usuário - um jogador pensa que comprou o item mas ele depois desaparece. Para inventário com quantidades limitadas, LWW e inadequado. Melhores opcoes: (1) Usar single-write region para o serviço de inventário (Strong consistency, transações serializaveis previnem overselling), (2) Usar custom conflict resolution com stored procedure que verifica quantidade antes de resolver, (3) Usar um mecanismo externo de coordenacao (distributed lock via Redis) para operações de quantidade limitada.

</details>

## Laboratório de validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um resource group para este laboratório:

```bash
az group create --name rg-az305-challenge32 --location eastus
```

2. Implante uma conta Cosmos DB com multi-region writes habilitado:

```bash
az cosmosdb create \
  --resource-group rg-az305-challenge32 \
  --name cosmos-challenge32-$RANDOM \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=false \
  --locations regionName=westus failoverPriority=1 isZoneRedundant=false \
  --enable-multiple-write-locations true \
  --default-consistency-level Session
```

3. Crie um banco de dados e container com uma partition key:

```bash
COSMOS_NAME=$(az cosmosdb list --resource-group rg-az305-challenge32 --query "[0].name" -o tsv)

az cosmosdb sql database create \
  --resource-group rg-az305-challenge32 \
  --account-name $COSMOS_NAME \
  --name gamedb

az cosmosdb sql container create \
  --resource-group rg-az305-challenge32 \
  --account-name $COSMOS_NAME \
  --database-name gamedb \
  --name profiles \
  --partition-key-path "/userId" \
  --throughput 400
```

4. Verifique que multi-region write esta habilitado e regiões estao ativas:

```bash
az cosmosdb show \
  --resource-group rg-az305-challenge32 \
  --name $COSMOS_NAME \
  --query "{MultiRegionWrites:enableMultipleWriteLocations, Regions:writeLocations[].locationName}" -o table
```

5. Confirme que a conta expoe endpoints de escrita em ambas regiões:

```bash
az cosmosdb show \
  --resource-group rg-az305-challenge32 \
  --name $COSMOS_NAME \
  --query "writeLocations[].[locationName, documentEndpoint]" -o table
```

:::tip
Esta mini-implantação válida suas decisoes de design com recursos reais do Azure. E opcional, mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge32 --yes --no-wait
```

---

**Próximo**: [Challenge 33: Design a Highly Available Multi-Region Application](/docs/az-305/business-continuity/challenge-33)
