---
sidebar_position: 8
title: "Challenge 32: Design High Availability for Non-Relational Data"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 32: Design High Availability for Non-Relational Data

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $15-30 | **Peso no Exame: 15-20%**

:::

## Introducao

A BattleForge Games e uma empresa global de jogos mobile com 25 milhoes de jogadores ativos diarios na America do Norte, Europa e Asia-Pacifico. Seu jogo principal armazena perfis de jogadores, inventario, dados de progressao e estado de partida em tempo real no Azure Cosmos DB (NoSQL API) com multi-region writes. Ativos do jogo (texturas, audio, modelos 3D totalizando 5 TB) sao servidos a partir do Azure Blob Storage atraves do Azure CDN para carregamento rapido.

A industria de games demanda disponibilidade extrema: se jogadores nao conseguem acessar seus perfis ou ativos do jogo, eles mudam para um concorrente em minutos. A BattleForge requer que perfis de jogadores sejam graváveis a partir de qualquer regiao com menos de 100ms de latencia, ativos do jogo devem estar disponiveis mesmo se uma regiao Azure inteira cair, e atualizacoes de estado de partida devem ser consistentes entre todos os jogadores em uma partida (independente de sua localizacao geografica).

O principal desafio tecnico e equilibrar consistencia vs. disponibilidade no Cosmos DB. Multi-region writes fornecem a menor latencia mas introduzem complexidade de resolucao de conflitos. A camada de armazenamento deve fornecer acesso continuo a 5 TB de ativos do jogo mesmo durante falhas regionais, sem que jogadores experimentem atrasos de carregamento. A BattleForge tem um orcamento de $8.000/mes para sua camada de dados (excluindo computacao).

## Habilidades do Exame Cobertas

- Recomendar uma solucao de alta disponibilidade para dados semi-estruturados e nao estruturados

## Tarefas de Design

### Parte 1: Configuracao de Multi-Region Write do Cosmos DB

1. Projete a implantacao do Cosmos DB para perfis de jogadores:
   - Conta implantada em 3 regioes: East US, West Europe, Japan East
   - Multi-region writes habilitado (jogadores escrevem na regiao mais proxima)
   - Documente as opcoes de politica de resolucao de conflitos:
     - Last Writer Wins (LWW) - automatico, usa timestamp
     - Custom conflict resolution - stored procedure
     - Qual e apropriado para perfis de jogadores?

2. Avalie os cinco consistency levels do Cosmos DB e selecione o apropriado para cada carga de trabalho:

| Consistency Level | Perfis de Jogadores | Estado de Partida | Leaderboards |
|-------------------|----------------|-------------|--------------|
| Strong | ? | ? | ? |
| Bounded Staleness | ? | ? | ? |
| Session | ? | ? | ? |
| Consistent Prefix | ? | ? | ? |
| Eventual | ? | ? | ? |

3. Justifique sua escolha de consistencia considerando:
   - Session consistency para perfis de jogadores: jogador ve suas proprias escritas imediatamente, outros veem eventualmente
   - Strong consistency para estado de partida: todos os jogadores devem ver o mesmo estado do jogo
   - Limitacao: Strong consistency NAO esta disponivel com multi-region writes
   - Qual alternativa alcanca consistencia de partida sem strong consistency?

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

### Parte 2: Disponibilidade e Failover do Cosmos DB

5. Analise as caracteristicas de disponibilidade da configuracao multi-region write:
   - Qual SLA o Cosmos DB multi-region write fornece? (99,999% para leitura e escrita)
   - O que acontece quando uma regiao falha? (Outras regioes continuam servindo leituras E escritas)
   - Como a zone redundancy dentro de cada regiao adiciona protecao adicional?

6. Compare single-region write vs. multi-region write para o caso de uso de estado de partida:

| Aspecto | Single-Region Write | Multi-Region Write |
|--------|--------------------|--------------------|
| Latencia de escrita de regioes remotas | Alta (round-trip cross-region) | Baixa (escrita local) |
| Resolucao de conflitos | Sem conflitos | Deve tratar conflitos |
| Opcoes de consistencia | Todos os 5 niveis incluindo Strong | Strong NAO disponivel |
| Disponibilidade de escrita durante falha regional | Failover necessario (segundos) | Automatica (outras regioes continuam) |
| Custo | Menor (sem taxa de replicacao de escrita) | Maior (cobracas de RU multi-master) |

7. Projete a arquitetura de estado de partida considerando a limitacao de strong consistency:
   - Opcao A: Single-region write com bounded staleness (baixo conflito, defasagem previsivel)
   - Opcao B: Multi-region writes com custom conflict resolution (complexo mas mais rapido)
   - Opcao C: Usar um servico diferente para estado de partida (ex: Azure SignalR para sync em tempo real)
   - Recomende e justifique sua escolha

### Parte 3: Redundancia de Storage Account para Ativos do Jogo

8. Projete a redundancia de armazenamento para 5 TB de ativos do jogo entre estas opcoes:

| Redundancia | Copias | Regioes | Leitura Durante Interrupcao | Multiplicador de Custo |
|------------|--------|---------|-------------------|----------------|
| LRS | 3 em 1 zona | 1 | Nao | 1x |
| ZRS | 3 entre zonas | 1 | Falha de zona: Sim | ~1,25x |
| GRS | 6 (3+3) | 2 | Nao (failover de escrita necessario) | ~2x |
| GZRS | 6 (3 ZRS + 3 LRS) | 2 | Falha de zona: Sim | ~2,25x |
| RA-GRS | 6 (3+3) | 2 | Sim (secundario read-only) | ~2x + ops de leitura |
| RA-GZRS | 6 (3 ZRS + 3 LRS) | 2 | Sim (zona + regiao) | ~2,5x |

9. Selecione a redundancia apropriada para ativos do jogo considerando:
   - Ativos devem estar disponiveis mesmo se uma regiao completa falhar
   - Acesso de leitura e necessario imediatamente (nao pode esperar por failover)
   - RA-GZRS fornece a maior disponibilidade mas com custo mais alto
   - RA-GRS e suficiente dado que CDN caching cobre a maioria dos cenarios de leitura?

10. Configure a storage account com a redundancia selecionada e o CDN para distribuicao global:

```bash
# Create storage account with RA-GRS (CDN handles zone-level caching)
az storage account create \
  --resource-group rg-battleforge \
  --name stbattleforgeassets \
  --location eastus \
  --sku Standard_RAGRS \
  --kind StorageV2 \
  --access-tier Hot
```

### Parte 4: CDN e Disponibilidade de Edge

11. Projete a arquitetura CDN para entrega de ativos do jogo:
    - Azure CDN (ou Azure Front Door com regras de caching) como mecanismo principal de entrega
    - Configure regras de cache: ativos do jogo sao imutaveis (URLs versionadas), cache por 30 dias
    - Failover de origem: se armazenamento primario estiver indisponivel, CDN serve do cache ou origem secundaria
    - Calcule: com TTL de cache de 30 dias e 5 TB de ativos, qual porcentagem esta tipicamente em cache no edge?

12. Projete a estrategia de fallback quando CDN cache miss durante uma interrupcao da regiao primaria:
    - Configure CDN origin group com primario (East US) e secundario (endpoint secundario RA-GRS)
    - Health probe na origem para detectar falha
    - Failover automatico de origem dentro da configuracao CDN

13. Calcule o custo mensal total para a camada de dados:
    - Cosmos DB: 3 regioes, multi-region write, consumo estimado de RU
    - Armazenamento: 5 TB com redundancia RA-GRS
    - CDN: custos de largura de banda para entrega global
    - Verifique se o total cabe dentro do orcamento de $8.000/mes

## Criterios de Sucesso

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
<summary>Dica 1: Consistencia e Multi-Region Writes do Cosmos DB</summary>

Limitacao critica: **Strong consistency NAO esta disponivel quando multi-region writes estao habilitados.** Isso ocorre porque strong consistency requer replicacao sincrona para todas as replicas antes de reconhecer uma escrita, o que e impraticavel entre regioes geograficamente distantes (latencia seria de centenas de milissegundos).

Para contas com multi-region write, a maior consistencia disponivel e Bounded Staleness:
- Bounded Staleness: garante que leituras nao estao mais que K versoes ou T segundos atras das escritas
- Session: garante que uma unica sessao de cliente ve suas proprias escritas (escolha mais popular)
- Consistent Prefix: garante que leituras nunca veem escritas fora de ordem
- Eventual: sem garantias de ordenacao, menor latencia

Para perfis de jogadores: Session consistency e ideal (jogadores veem suas proprias mudancas imediatamente).
Para estado de partida: Considere uma abordagem single-write-region com Strong consistency para o banco de dados de partida, ou use um mecanismo externo de coordenacao.

</details>

<details>
<summary>Dica 2: Resolucao de Conflitos de Multi-Region Write do Cosmos DB</summary>

Quando duas regioes escrevem no mesmo documento simultaneamente, um conflito ocorre. Opcoes de resolucao:

**Last Writer Wins (LWW)**:
- Politica padrao, automatica
- Usa `_ts` (timestamp) ou um caminho customizado para determinar vencedor
- Mais simples mas pode perder dados (escrita perdedora e descartada)
- Bom para: perfis de jogadores onde o estado mais recente e o que importa

**Custom conflict resolution (stored procedure)**:
- Seu codigo decide como mesclar escritas conflitantes
- Pode implementar logica de merge customizada (ex: combinar mudancas de inventario)
- Mais complexo mas preserva ambas as escritas
- Bom para: inventario de jogo onde ambas adicoes devem ser mantidas

**Conflict feed (resolucao manual)**:
- Conflitos sao escritos em um conflict feed para resolucao em nivel de aplicacao
- Aplicacao le e resolve conflitos de forma assincrona
- Mais flexivel mas maior latencia para resolucao

Para perfis de jogadores da BattleForge: LWW com `_ts` e apropriado. Se o jogador atualizar seu perfil de dois dispositivos simultaneamente, a ultima atualizacao vence. Para inventario, custom merge (combinar ambas mudancas de inventario) previne perda de itens.

</details>

<details>
<summary>Dica 3: RA-GRS vs CDN para Disponibilidade de Ativos</summary>

Ambos fornecem disponibilidade de leitura durante interrupcoes, mas servem propositos diferentes:

**RA-GRS (Read-Access Geo-Redundant Storage)**:
- Endpoint secundario sempre disponivel para leituras: `stbattleforgeassets-secondary.blob.core.windows.net`
- RPO: ate 15 minutos (defasagem de replicacao assincrona)
- Sem caching - toda leitura vai para o armazenamento
- 5 TB completos disponiveis do secundario o tempo todo
- Use como failover de origem do CDN, nao como endpoint direto para jogadores

**Azure CDN**:
- Cache em localizacoes edge globais (150+ PoPs mundialmente)
- Latencia sub-50ms para a maioria dos jogadores globalmente
- Serve do cache mesmo se a origem estiver completamente indisponivel (ate TTL expirar)
- Com TTL de 30 dias e URLs versionadas: 95%+ de taxa de cache hit para ativos do jogo
- Ativos faltando (cache miss) precisam de uma origem saudavel - e aqui que o secundario RA-GRS ajuda

Recomendado: CDN como entrega primaria com secundario RA-GRS como origem de failover.

</details>

<details>
<summary>Dica 4: Precos do Cosmos DB para Multi-Region</summary>

Consideracoes de custo de multi-region write do Cosmos DB:
- Custo de RU de escrita: cobrado por regiao que participa em escritas (efetivamente multiplicado pela contagem de regioes)
- Exemplo: 10.000 RU/s provisionados, 3 regioes de escrita = 30.000 RU/s cobrados
- RUs de leitura: cobrados por regiao onde leituras ocorrem
- Alternativa: Use autoscale para evitar super-provisionamento (RU/s maximo, pague pelo uso real)

Estimativa de custo para BattleForge:
- Operacoes de perfil de jogador: ~5.000 RU/s em media (picos de 15.000 durante eventos)
- 3 regioes de escrita: 15.000 RU/s base provisionados
- A $0,008 por 100 RU/s/hora: 15.000/100 x $0,008 x 730 horas = ~$876/mes
- Com autoscale (max 50.000 RU/s): cobrado a 10% do maximo quando ocioso = $292/mes base

Armazenamento: $0,25/GB/mes para dados, replicado para 3 regioes = $0,75/GB/mes efetivo

</details>

<details>
<summary>Dica 5: Requisitos para SLA de 99,999% do Cosmos DB</summary>

Para alcancar o SLA de 99,999% (5 noves, ~26 segundos de inatividade/ano), TODOS os seguintes devem estar configurados:
1. Multi-region writes habilitado (distribui escritas, sem ponto unico de falha)
2. Pelo menos 2 regioes configuradas (minimo para geo-redundancia)
3. Zone redundancy habilitada em cada regiao (isZoneRedundant=true)

Sem multi-region writes: SLA e 99,99% para leituras, 99,99% para escritas (com zone redundancy)
Com multi-region writes: SLA e 99,999% para leituras e escritas

Este e o SLA mais alto de qualquer servico de banco de dados Azure. Compare:
- Azure SQL Business Critical zone-redundant: 99,995%
- Azure SQL General Purpose zone-redundant: 99,995%
- Cosmos DB single-region zone-redundant: 99,99%
- Cosmos DB multi-region multi-write: 99,999%

</details>

## Recursos de Aprendizagem

- [Distribute data globally with Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/distribute-data-globally)
- [Consistency levels in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels)
- [Conflict resolution in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/conflict-resolution-policies)
- [Azure Storage redundancy](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy)
- [Azure CDN overview](https://learn.microsoft.com/en-us/azure/cdn/cdn-overview)
- [High availability for Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/high-availability)

## Verificacao de Conhecimento

<details>
<summary>1. A BattleForge precisa que todos os jogadores em uma partida multiplayer vejam o mesmo estado do jogo. Por que eles nao podem usar Strong consistency com multi-region writes, e qual e a alternativa recomendada?</summary>

**Strong consistency nao esta disponivel quando multi-region writes estao habilitados no Cosmos DB.** Strong consistency requer reconhecimento sincrono de todas as replicas antes de completar uma escrita, o que cria latencia inaceitavel entre regioes geograficamente distantes. A alternativa recomendada para estado de partida e usar single-write-region com Strong consistency para o banco de dados de partida especificamente (sessoes de partida sao tipicamente regionais), ou usar Bounded Staleness com janela de staleness apertada (ex: 5 segundos, 10 operacoes). Alternativamente, use Azure SignalR Service para sincronizacao de estado em tempo real, com Cosmos DB apenas para persistencia.

</details>

<details>
<summary>2. Uma conta Cosmos DB com multi-region writes e zone redundancy fornece SLA de 99,999%. O que isso significa em termos praticos de inatividade, e qual cenario ainda poderia causar indisponibilidade?</summary>

**99,999% de disponibilidade significa maximo de 26 segundos de inatividade por ano (ou ~2,6 segundos por mes).** Isso e alcancado porque escritas podem ter sucesso em qualquer uma das regioes configuradas - uma falha regional completa simplesmente significa que escritas pousam em outras regioes. Cenarios que ainda poderiam causar indisponibilidade incluem: (1) Multiplas regioes falhando simultaneamente (extremamente improvavel), (2) Problemas de plataforma Azure-wide afetando o control plane do Cosmos DB globalmente, (3) Problemas de rede do lado do cliente (nao cobertos pelo SLA), (4) Exceder throughput provisionado causando erros de throttling 429 (nao e uma falha de disponibilidade verdadeira mas impacta usuarios de forma similar). Planejamento adequado de capacidade de RU e autoscale mitigam o cenario 4.

</details>

<details>
<summary>3. A BattleForge usa RA-GRS para seu armazenamento de ativos de jogo de 5 TB. Durante uma interrupcao da regiao primaria, qual e a staleness maxima dos dados que jogadores podem ler do secundario?</summary>

**Ate 15 minutos (mas tipicamente muito menos).** RA-GRS replica dados de forma assincrona para a regiao secundaria. A Microsoft visa um RPO de 15 minutos (sem garantia de SLA sobre defasagem exata). Na pratica, a replicacao geralmente esta segundos atras. Para ativos de jogo que sao escritos uma vez e lidos muitas vezes (arquivos imutaveis, versionados), esta staleness e irrelevante - ativos carregados 15+ minutos atras estao completamente replicados. O unico risco e ativos carregados muito recentemente (nova atualizacao do jogo) que ainda nao foram replicados. Mitigacao: carregue novos ativos pelo menos 30 minutos antes de torna-los referenciados por clientes do jogo, ou use cache warming do CDN.

</details>

<details>
<summary>4. Dois jogadores em regioes diferentes simultaneamente compram o mesmo item de edicao limitada na BattleForge (apenas 1 disponivel). Com resolucao de conflito Last Writer Wins, o que acontece?</summary>

**Ambas escritas inicialmente tem sucesso localmente (cada jogador ve a compra confirmada), mas a resolucao de conflito LWW mantera apenas o timestamp mais recente, efetivamente "cancelando" a compra do outro jogador apos a replicacao.** Isso cria uma experiencia ruim para o usuario - um jogador pensa que comprou o item mas ele depois desaparece. Para inventario com quantidades limitadas, LWW e inadequado. Melhores opcoes: (1) Usar single-write region para o servico de inventario (Strong consistency, transacoes serializaveis previnem overselling), (2) Usar custom conflict resolution com stored procedure que verifica quantidade antes de resolver, (3) Usar um mecanismo externo de coordenacao (distributed lock via Redis) para operacoes de quantidade limitada.

</details>

## Laboratorio de Validacao

Implante uma prova de conceito minima para validar seu design:

1. Crie um resource group para este laboratorio:

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

4. Verifique que multi-region write esta habilitado e regioes estao ativas:

```bash
az cosmosdb show \
  --resource-group rg-az305-challenge32 \
  --name $COSMOS_NAME \
  --query "{MultiRegionWrites:enableMultipleWriteLocations, Regions:writeLocations[].locationName}" -o table
```

5. Confirme que a conta expoe endpoints de escrita em ambas regioes:

```bash
az cosmosdb show \
  --resource-group rg-az305-challenge32 \
  --name $COSMOS_NAME \
  --query "writeLocations[].[locationName, documentEndpoint]" -o table
```

:::tip
Esta mini-implantacao valida suas decisoes de design com recursos reais do Azure. E opcional, mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge32 --yes --no-wait
```

---

**Proximo**: [Challenge 33: Design a Highly Available Multi-Region Application](/docs/az-305/business-continuity/challenge-33)
