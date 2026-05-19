---
sidebar_position: 8
title: "Desafio 41: Projetar uma Estratégia de Cache"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 41: Projetar uma Estratégia de Cache

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-15 | **Peso no Exame: 30-35%**

:::

## Introdução

A SocialPulse é uma plataforma de midia social com 50 milhoes de usuários ativos. Seu recurso principal é um feed personalizado que agrega conteúdo de 50+ fontes incluindo posts de amigos, tópicos em alta, conteúdo patrocinado e recomendacoes algoritmicas. Atualmente, o feed leva 2 segundos para carregar porque cada requisicao aciona consultas de agregacao em tempo real em múltiplos bancos de dados e microsservicos.

O padrão de acesso da plataforma e fortemente enviesado para leitura: feeds sao lidos aproximadamente 1.000 vezes para cada escrita (novo post ou interação). A equipe de produto exige tempo de carregamento do feed inferior a 200 milissegundos para permanecer competitiva. Além disso, alguns dados sao específicos de sessão (posicao de rolagem do usuário, respostas em rascunho) enquanto outros dados sao compartilhados entre milhoes de usuários (posts em alta, hashtags populares, perfis publicos).

A equipe de engenharia precisa de uma estratégia de caching abrangente que enderece múltiplas camadas: CDN para ativos estaticos, caching em nível de aplicação para feeds computados, e caching de sessão para estado do usuário. Eles também devem projetar lógica de invalidacao de cache que garanta que usuários vejam novos posts dentro de 30 segundos da publicacao sem sobrecarregar os serviços de origem.

## Habilidades do Exame Cobertas

- Recomendar uma solução de caching para aplicações

## Tarefas de Design

### Parte 1: Avaliar Camadas de Caching e Selecionar Configuração Redis

1. Compare as opcoes de camada do Azure Cache for Redis (Basic, Standard, Premium, Enterprise, Enterprise Flash) e documente as diferencas de recursos relevantes para este cenário (clustering, geo-replicação, persistência, tamanho de dados, SLA de disponibilidade).
2. Determine qual camada e tamanho de instância Redis e apropriado para:
   - Cache de sessão: 10 milhoes de sessões concorrentes, cada uma com aproximadamente 2KB
   - Cache de feed: 50 milhoes de usuários com tamanho medio de feed de 50KB, 20% ativos no pico
   - Cache de conteúdo compartilhado: 100.000 itens em alta, media de 5KB cada
3. Projete o schema de chaves e política de despejo para cada tipo de cache. Documente a estratégia de TTL para dados de sessão vs dados de feed vs conteúdo compartilhado.

### Parte 2: Projetar CDN e Caching de Borda

4. Compare as capacidades de caching do Azure Front Door com perfis do Azure CDN para servir ativos estaticos (imagens, videos, bundles CSS/JS). Documente quando usar cada um.
5. Projete regras de cache para diferentes tipos de conteúdo:
   - Imagens de perfil (mudam raramente, acessiveis publicamente)
   - Thumbnails de video (imutáveis uma vez gerados)
   - Respostas de API para conteúdo em alta (muda a cada 5 minutos)
6. Projete uma estratégia de purge de cache para quando usuários atualizam sua foto de perfil ou excluem um post.

### Parte 3: Implementar Padrões de Caching em Nível de Aplicação

7. Projete um padrão cache-aside (lazy loading) para geracao de feed do usuário. Documente o caminho de leitura (verificar cache, fallback para origem, popular cache) e o caminho de escrita (invalidar cache em novo post).
8. Avalie caching write-through vs write-behind para o sistema de notificações onde garantias de entrega importam. Documente os trade-offs de cada abordagem.
9. Projete uma estratégia de cache warming para feeds populares que nunca devem experimentar um cache miss frio (contas de celebridades, paginas de marcas com milhoes de seguidores).
10. Projete um padrão circuit breaker para quando o Redis ficar indisponivel. Qual é o fallback? Como você previne thundering herd quando o cache volta?

### Parte 4: Invalidacao de Cache e Consistência

11. Projete um sistema de invalidacao de cache orientado a eventos usando Azure Event Grid ou Service Bus que propague mudanças de conteúdo para todas as camadas de cache dentro do SLA de 30 segundos.
12. Documente como você lida com cache stampede (múltiplas requisicoes simultaneas para a mesma chave expirada) usando locking distribuido ou coalescencia de requisicoes.
13. Crie um plano de monitoramento que rastreie taxa de hit do cache, percentis de latência (p50, p95, p99), utilizacao de memoria e taxa de despejo.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-41"
  items={[
    "Selecao de camada Redis justificada com matriz de comparacao de recursos cobrindo clustering, persistência, geo-replicação e requisitos de SLA",
    "Estratégia de CDN documentada com regras de cache para ativos estaticos, respostas de API e mecanismos de purge",
    "Padrão cache-aside projetado com estratégia de TTL, política de despejo e gatilhos de invalidacao para cada tipo de dados",
    "Mitigacao de cache stampede documentada usando abordagem de locking distribuido ou coalescencia de requisicoes",
    "Plano de monitoramento cobre taxa de hit, percentis de latência, utilizacao de memoria e alertas de taxa de despejo",
    "Estratégia de fallback projetada para indisponibilidade do Redis com prevenção de thundering herd"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Selecao de Camada Redis</summary>

A camada Enterprise do Azure Cache for Redis suporta geo-replicação ativa (escritas multi-região), módulos RediSearch e RedisJSON. A camada Premium suporta clustering (até 10 shards), geo-replicação (apenas ativa-passiva), injecao em VNet e persistência de dados. A camada Standard fornece um cache replicado com SLA de 99,9% mas sem clustering. Para datasets de 20GB+ com necessidades de alto throughput, você precisa da camada Premium ou Enterprise.

</details>

<details>
<summary>Dica 2: Cache-Aside vs Read-Through</summary>

No cache-aside (lazy loading), a aplicação é responsável por ler e escrever no cache. Em um cache miss, a aplicação consulta o banco de dados e entao popula o cache. No read-through, o proprio cache busca da origem em um miss. O Azure Cache for Redis suporta cache-aside nativamente. Read-through requer implementação customizada ou um framework como Redis Gears.

</details>

<details>
<summary>Dica 3: Prevenindo Cache Stampede</summary>

Quando uma chave de cache popular expira, centenas de requisicoes simultaneamente atingem a origem. Soluções incluem: (1) expiracao antecipada probabilistica (atualizar antes do TTL expirar), (2) mutex distribuido (apenas uma requisicao busca da origem enquanto outras esperam), (3) coalescencia de requisicoes na camada de aplicação, (4) nunca-expirar com atualização em background. O Azure Cache for Redis suporta locks distribuidos usando SET com opcoes NX e PX.

</details>

<details>
<summary>Dica 4: Caching do Azure Front Door</summary>

O Azure Front Door faz cache de conteúdo em POPs de borda globalmente. Ele suporta regras de cache baseadas em query string, headers de requisicao e padrões de caminho de URL. A duracao do cache pode ser definida via headers de origem (Cache-Control, Expires) ou sobrescrita com regras do Front Door. O purge pode direcionar URLs específicas, caminhos com wildcard ou todo o conteúdo. O Front Door também suporta compressao na borda.

</details>

<details>
<summary>Dica 5: Dimensionamento de Memoria para Redis</summary>

Calcule as necessidades de memoria considerando: overhead de serializacao (JSON e 2-3x maior que binario), metadados do Redis por chave (aproximadamente 70 bytes), taxa de fragmentacao (tipicamente 1,2-1,5x), e replicação (replica dobra o uso de memoria). Para 10M sessões a 2KB cada, dados brutos sao 20GB mas a memoria real do Redis necessária e aproximadamente 30-40GB com overhead.

</details>

## Recursos de Aprendizagem

- [Azure Cache for Redis overview](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview)
- [Azure Cache for Redis service tiers](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview#service-tiers)
- [Caching with Azure Front Door](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-caching)
- [Cache-aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- [Best practices for Azure Cache for Redis](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-best-practices-development)
- [Azure Architecture Center - Caching guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/caching)

## Verificação de Conhecimento

<details>
<summary>1. Uma plataforma de midia social precisa de latência de leitura sub-milissegundo para dados de sessão com 99,99% de disponibilidade em duas regiões com escritas ativas-ativas. Qual camada do Azure Cache for Redis é necessária?</summary>

**Camada Enterprise.** Somente a camada Enterprise suporta geo-replicação ativa (escritas ativas-ativas multi-região) onde escritas em qualquer região sao replicadas para todas as outras. A camada Premium suporta geo-replicação mas apenas no modo ativo-passivo (um primário, uma replica somente-leitura). A camada Enterprise também fornece SLA de 99,99% com redundância de zona, comparado a 99,9% para camadas Standard e Premium.

</details>

<details>
<summary>2. Seu cache armazena feeds de usuários que mudam quando qualquer um de 50+ serviços fonte pública novo conteúdo. Cache-aside com TTL de 60 segundos resulta em reclamacoes de dados obsoletos. Qual padrão se adequa melhor a este cenário de invalidacao com muitas escritas?</summary>

**Invalidacao orientada a eventos com atualização write-behind.** Em vez de confiar exclusivamente na expiracao por TTL, implemente uma arquitetura orientada a eventos onde serviços de conteúdo publicam eventos de mudança em um barramento de mensagens. Um serviço de invalidacao de cache assina esses eventos e inválida ou atualiza proativamente as entradas de cache afetadas. Isso fornece frescor quase em tempo real sem o custo de TTLs extremamente curtos (que reduzem a taxa de hit) ou polling (que desperdicea recursos).

</details>

<details>
<summary>3. Durante pico de trafego, uma celebridade posta e 5 milhoes de caches de feed de seguidores sao imediatamente invalidados. Qual problema isso cria e como você resolve?</summary>

**Cache stampede (thundering herd).** Todos os 5 milhoes de seguidores requisitando seus feeds simultaneamente terao cache miss e atingirao os serviços de origem, potencialmente causando falha em cascata. Soluções: (1) Escalonar a invalidacao ao longo de 30 segundos usando uma fila, (2) Usar pré-computacao em background para aquecer os caches dos seguidores da celebridade antes de invalidar as entradas antigas, (3) Implementar coalescencia de requisicoes para que apenas uma requisicao a origem seja feita por feed único enquanto outras esperam, (4) Usar um padrão "stale-while-revalidate" onde dados levemente obsoletos sao servidos enquanto a atualização acontece em background.

</details>

<details>
<summary>4. Você precisa fazer cache de 500GB de dados de feed entre regiões. A camada Premium suporta até 10 shards de 120GB cada (1,2TB total). Enterprise Flash suporta até 4,5TB. Quais fatores além da capacidade bruta determinam a escolha correta?</summary>

**Custo, latência, suporte a módulos e padrões de acesso.** Enterprise Flash usa uma combinacao de RAM e SSDs NVMe, fornecendo grande capacidade a menor custo por GB mas com latência levemente maior (milissegundos de um digito vs sub-ms para apenas RAM). Se sua carga de trabalho tolera 1-2ms de latência e precisa de datasets grandes, Enterprise Flash e mais custo-efetivo. Se você precisa de latência sub-milissegundo para todas as operações, Premium com clustering mantem tudo na RAM. Enterprise (não-Flash) também adiciona módulos Redis (RediSearch, RedisJSON) que permitem indexacao secundária e operações JSON nativas que podem simplificar consultas de feed.

</details>

## Laboratório de Validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um resource group para este laboratório:

```bash
az group create --name rg-az305-challenge41 --location eastus
```

2. Implante um Redis Cache (camada Basic C0, menor disponível):

```bash
az redis create --resource-group rg-az305-challenge41 --name redis-challenge41-$RANDOM \
  --sku Basic --vm-size c0 --location eastus
```

3. Aguarde o provisionamento e recupere a chave de acesso:

```bash
az redis show --resource-group rg-az305-challenge41 \
  --name $(az redis list --resource-group rg-az305-challenge41 --query "[0].name" -o tsv) \
  --query "{HostName:hostName, Port:sslPort, ProvisioningState:provisioningState}" --output table
```

4. Teste uma operação SET e GET usando redis-cli:

```bash
REDIS_HOST=$(az redis list --resource-group rg-az305-challenge41 --query "[0].hostName" -o tsv)
REDIS_KEY=$(az redis list-keys --resource-group rg-az305-challenge41 --name $(az redis list --resource-group rg-az305-challenge41 --query "[0].name" -o tsv) --query "primaryKey" -o tsv)
redis-cli -h $REDIS_HOST -p 6380 --tls -a $REDIS_KEY SET testkey "hello-az305" && \
redis-cli -h $REDIS_HOST -p 6380 --tls -a $REDIS_KEY GET testkey
```

:::tip
Esta mini-implantacao válida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge41 --yes --no-wait
```

---

**Próximo**: [Challenge 42: Design Application Configuration Management](/docs/az-305/infrastructure/challenge-42)
