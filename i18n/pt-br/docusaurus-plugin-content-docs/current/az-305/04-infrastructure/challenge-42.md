---
sidebar_position: 9
title: "Challenge 42: Design Application Configuration Management"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 42: Design Application Configuration Management

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $2-5 | **Peso no Exame: 30-35%**

:::

## Introducao

A CloudScale Inc. opera uma plataforma de microsservicos com 30 servicos implantados em 4 ambientes (desenvolvimento, teste, staging, producao). Cada servico mantem seus proprios arquivos de configuracao, levando a desvios de configuracao que causaram 3 incidentes de producao no ultimo trimestre. Um incidente ocorreu quando um desenvolvedor alterou uma connection string em staging que foi acidentalmente promovida para producao. Outro aconteceu quando uma feature flag foi habilitada globalmente em vez de para um rollout direcionado de 5%.

A equipe de plataforma precisa de uma solucao centralizada de gerenciamento de configuracao que forneca: uma unica fonte de verdade para toda a configuracao de servicos, overrides especificos de ambiente sem mudancas de codigo, feature flags com capacidades de rollout gradual (baseado em porcentagem, direcionamento por usuario, janela temporal), kill switches instantaneos para recursos problematicos, e uma trilha de auditoria de todas as mudancas de configuracao.

Alem disso, valores de configuracao sensiveis (senhas de banco de dados, API keys, certificados) devem permanecer no Azure Key Vault com controles de acesso apropriados, enquanto configuracoes nao-sensiveis (feature flags, timeouts, tamanhos de pool de conexao) devem ser facilmente gerenciaveis por product owners sem intervencao de engenharia.

## Habilidades do Exame Cobertas

- Recomendar uma solucao de gerenciamento de configuracao de aplicacao

## Tarefas de Design

### Parte 1: Projetar Arquitetura de Configuracao Centralizada

1. Implante um store do Azure App Configuration e projete uma convencao de nomenclatura de chaves que suporte 30 servicos em 4 ambientes. Considere usar labels para diferenciacao de ambientes vs stores separados por ambiente.
2. Projete uma hierarquia de configuracao que suporte:
   - Configuracoes globais compartilhadas por todos os servicos (ex.: nivel de logging, endpoint de telemetria)
   - Configuracoes especificas de servico (ex.: tamanho do pool de conexao, valores de timeout)
   - Overrides especificos de ambiente (ex.: connection strings de banco de dados por ambiente)
3. Documente os trade-offs entre usar um unico store do App Configuration com labels vs multiplos stores (um por ambiente). Considere custo, granularidade de controle de acesso e raio de explosao de configuracoes incorretas.

### Parte 2: Integrar Referencias do Key Vault

4. Projete uma solucao que armazene valores sensiveis no Azure Key Vault enquanto os referencia a partir do App Configuration. Documente como as referencias do Key Vault funcionam e como as aplicacoes as resolvem em tempo de execucao.
5. Defina limites de controle de acesso: quais equipes podem gerenciar configuracao nao-sensivel (product owners) vs secrets (equipe de seguranca) vs feature flags (lideres de engenharia).
6. Projete uma estrategia de rotacao de secrets que atualize secrets do Key Vault sem exigir reinicializacao da aplicacao. Documente como os intervalos de atualizacao de configuracao interagem com a resolucao de referencias do Key Vault.

### Parte 3: Gerenciamento de Features e Rollout Gradual

7. Projete um sistema de feature flags usando o gerenciamento de features do App Configuration que suporte:
   - Flags booleanas on/off (kill switches)
   - Rollout baseado em porcentagem (habilitar para 5%, depois 25%, depois 100%)
   - Filtros de direcionamento por usuario (habilitar para IDs ou grupos de usuarios especificos)
   - Filtros de janela temporal (habilitar apenas durante horario comercial ou datas especificas)
8. Projete uma estrategia de rollout para um novo recurso de processamento de pagamentos: comece com usuarios internos, expanda para 5% dos usuarios externos, monitore taxas de erro, depois aumente para 25%, 50% e 100%.
9. Documente como implementar um kill switch instantaneo que desabilite um recurso em todos os 30 servicos dentro de 60 segundos sem reimplantacao.

### Parte 4: Atualizacao de Configuracao e Monitoramento

10. Projete uma estrategia de atualizacao de configuracao que equilibre frescor com desempenho. Compare atualizacao baseada em polling (padrao sentinel key) vs atualizacao baseada em push (notificacoes do Event Grid).
11. Projete uma solucao de monitoramento e alerta que detecte:
    - Mudancas de configuracao (log de auditoria)
    - Falhas de atualizacao de configuracao nas aplicacoes
    - Mudancas de estado de feature flags
12. Documente como snapshots do App Configuration podem ser usados para criar conjuntos de configuracao point-in-time para consistencia de implantacao e cenarios de rollback.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-42"
  items={[
    "Convencao de nomenclatura de chaves documentada com hierarquia suportando 30 servicos em 4 ambientes",
    "Integracao de referencia do Key Vault projetada com separacao de controle de acesso entre configuracao e secrets",
    "Sistema de feature flags suporta rollout por porcentagem, direcionamento por usuario, janelas temporais e kill switches",
    "Estrategia de atualizacao de configuracao documentada com padrao sentinel key ou abordagem push do Event Grid",
    "Estrategia de snapshots definida para consistencia de implantacao e capacidade de rollback",
    "Monitoramento cobre mudancas de configuracao, falhas de atualizacao e transicoes de estado de feature flags"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Convencao de Nomenclatura de Chaves</summary>

O Azure App Configuration suporta nomes de chaves hierarquicos usando delimitadores (comumente `:` ou `/`). Um padrao comum e `{aplicacao}:{componente}:{configuracao}` com labels para ambientes. Por exemplo: chave = `OrderService:Database:ConnectionTimeout`, label = `Production`. Isso permite consultar todas as configuracoes de um servico ou todas as configuracoes entre servicos para um ambiente usando filtros de chave e filtros de label.

</details>

<details>
<summary>Dica 2: Padrao Sentinel Key</summary>

Em vez de observar todas as chaves de configuracao por mudancas (caro em escala), use um padrao sentinel key: aplicacoes consultam uma unica chave sentinela (ex.: `app:settings:version`). Quando qualquer configuracao muda, atualize o valor sentinela. Aplicacoes so recarregam a configuracao completa quando o sentinela muda, reduzindo o trafego de polling de O(n) chaves para O(1) chave por intervalo de atualizacao.

</details>

<details>
<summary>Dica 3: Filtros de Feature Flag</summary>

O gerenciamento de features do Azure App Configuration suporta filtros integrados: `Microsoft.Targeting` (direcionamento por porcentagem e usuario/grupo), `Microsoft.TimeWindow` (datas de inicio/fim) e filtros customizados. Filtros de direcionamento usam hashing consistente para que os mesmos usuarios sempre vejam o mesmo estado da flag em uma dada porcentagem. Voce pode combinar multiplos filtros com logica AND/OR para regras de rollout complexas.

</details>

<details>
<summary>Dica 4: Camadas do Configuration Store</summary>

O Azure App Configuration oferece camadas Free e Standard. A camada Free e limitada a 10MB de armazenamento, 1.000 requisicoes/dia e sem SLA. A camada Standard fornece 1GB de armazenamento, 30.000 requisicoes/hora por replica, SLA de 99,9%, private endpoints, managed identity e geo-replicacao. Para cargas de trabalho de producao com 30 servicos consultando configuracao, a camada Standard com replicas e essencial.

</details>

<details>
<summary>Dica 5: Snapshots para Seguranca de Implantacao</summary>

Snapshots do App Configuration criam uma copia imutavel e point-in-time de key-values. Voce pode tirar um snapshot antes da implantacao para que, se mudancas de configuracao causarem problemas, voce possa reverter instantaneamente todos os servicos para o estado do snapshot. Snapshots tambem podem ser usados para garantir que todos os servicos em uma implantacao usem a mesma versao de configuracao, prevenindo inconsistencia durante implantacoes rolling.

</details>

## Recursos de Aprendizagem

- [Azure App Configuration overview](https://learn.microsoft.com/en-us/azure/azure-app-configuration/overview)
- [Use Key Vault references in App Configuration](https://learn.microsoft.com/en-us/azure/azure-app-configuration/use-key-vault-references-dotnet-core)
- [Feature management overview](https://learn.microsoft.com/en-us/azure/azure-app-configuration/concept-feature-management)
- [App Configuration best practices](https://learn.microsoft.com/en-us/azure/azure-app-configuration/howto-best-practices)
- [Azure App Configuration snapshots](https://learn.microsoft.com/en-us/azure/azure-app-configuration/concept-snapshots)
- [Enable dynamic configuration with push refresh](https://learn.microsoft.com/en-us/azure/azure-app-configuration/enable-dynamic-configuration-push-refresh)

## Verificacao de Conhecimento

<details>
<summary>1. Uma empresa usa um unico store do App Configuration com labels para separar ambientes. Um desenvolvedor acidentalmente aplica a label "Production" a um valor de configuracao de teste. Como a arquitetura poderia prevenir isso?</summary>

**Use Azure RBAC com roles customizados ou stores separados.** As opcoes incluem: (1) Usar stores separados do App Configuration por ambiente com diferentes atribuicoes RBAC (desenvolvedores tem acesso de escrita apenas a stores de dev/test), (2) Usar roles RBAC customizados que restringem escritas baseadas em label (ex.: apenas pipelines de CI/CD podem escrever chaves com a label "Production"), (3) Implementar Azure Policy para auditar mudancas de configuracao, (4) Usar chaves de acesso somente-leitura do App Configuration para consumidores de producao enquanto apenas o pipeline de implantacao tem acesso de escrita.

</details>

<details>
<summary>2. Trinta microsservicos consultam o App Configuration a cada 30 segundos. O configuration store comeca a limitar requisicoes. Qual mudanca de design reduz o volume de requisicoes mantendo o frescor?</summary>

**Implemente o padrao sentinel key com notificacoes push do Event Grid.** Em vez de 30 servicos cada um consultando N chaves a cada 30 segundos, cada servico observa apenas uma unica chave sentinela. Isso reduz o polling de 30 x N para 30 x 1 requisicoes por intervalo. Melhor ainda, mude para atualizacao baseada em push usando Event Grid: o App Configuration emite eventos em mudancas de chave, servicos assinam via Event Grid, e so atualizam quando realmente notificados de mudancas. Isso elimina o polling periodico inteiramente e fornece propagacao quase instantanea.

</details>

<details>
<summary>3. Uma feature flag esta configurada para rollout de 10% usando o filtro Targeting. Um usuario relata que as vezes ve o recurso e as vezes nao entre sessoes. O que esta errado?</summary>

**O contexto de direcionamento nao esta usando um identificador de usuario consistente.** O filtro Targeting usa hashing consistente no identificador do usuario para determinar o estado da flag. Se a aplicacao passa identificadores diferentes (ex.: ID de sessao em vez de ID de usuario), o mesmo usuario obtera resultados diferentes entre sessoes. A correcao e sempre passar o identificador estavel do usuario autenticado como contexto de direcionamento. Se o usuario for anonimo, use um cookie persistente ou ID de dispositivo para consistencia.

</details>

<details>
<summary>4. Sua aplicacao referencia um secret do Key Vault a partir do App Configuration. O secret e rotacionado no Key Vault mas a aplicacao ainda usa o valor antigo. Qual e a causa provavel?</summary>

**O intervalo de atualizacao do App Configuration nao expirou, ou a referencia do Key Vault usa uma URI de secret versionada.** O App Configuration faz cache das resolucoes de referencias do Key Vault pela duracao do intervalo de atualizacao de configuracao. Se a referencia aponta para uma versao especifica do secret (ex.: `https://vault.vault.azure.net/secrets/db-password/abc123`), ela sempre resolvera para aquela versao. Use uma URI sem versao (ex.: `https://vault.vault.azure.net/secrets/db-password`) para sempre resolver para a versao mais recente, e garanta que o intervalo de atualizacao seja curto o suficiente para captar secrets rotacionados dentro da sua janela de tolerancia.

</details>

## Laboratorio de Validacao

Implante uma prova de conceito minima para validar seu design:

1. Crie um resource group para este laboratorio:

```bash
az group create --name rg-az305-challenge42 --location eastus
```

2. Crie um store do App Configuration:

```bash
az appconfig create --resource-group rg-az305-challenge42 \
  --name appconfig-challenge42-$RANDOM --location eastus --sku Free
```

3. Adicione um par chave-valor e uma feature flag:

```bash
APPCONFIG_NAME=$(az appconfig list --resource-group rg-az305-challenge42 --query "[0].name" -o tsv)
az appconfig kv set --name $APPCONFIG_NAME --key "App:Settings/FontSize" --value "24" --yes
az appconfig feature set --name $APPCONFIG_NAME --feature "Beta" --yes
```

4. Habilite a feature flag e verifique a configuracao:

```bash
az appconfig feature enable --name $APPCONFIG_NAME --feature "Beta" --yes
az appconfig kv list --name $APPCONFIG_NAME --output table
```

5. Verifique o estado da feature flag:

```bash
az appconfig feature list --name $APPCONFIG_NAME --output table
```

:::tip
Esta mini-implantacao valida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge42 --yes --no-wait
```

---

**Proximo**: [Challenge 43: Design Automated Deployment](/docs/az-305/infrastructure/challenge-43)
