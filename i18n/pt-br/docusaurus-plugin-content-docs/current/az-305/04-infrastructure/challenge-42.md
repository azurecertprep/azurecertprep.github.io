---
sidebar_position: 9
title: "Desafio 42: Projetar Gerenciamento de Configuracao de Aplicações"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 42: Projetar Gerenciamento de Configuracao de Aplicações

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $2-5 | **Peso no Exame: 30-35%**

:::

## Introdução

A CloudScale Inc. opera uma plataforma de microsservicos com 30 serviços implantados em 4 ambientes (desenvolvimento, teste, staging, produção). Cada serviço mantem seus proprios arquivos de configuração, levando a desvios de configuração que causaram 3 incidentes de produção no último trimestre. Um incidente ocorreu quando um desenvolvedor alterou uma connection string em staging que foi acidentalmente promovida para produção. Outro aconteceu quando uma feature flag foi habilitada globalmente em vez de para um rollout direcionado de 5%.

A equipe de plataforma precisa de uma solução centralizada de gerenciamento de configuração que forneca: uma única fonte de verdade para toda a configuração de serviços, overrides específicos de ambiente sem mudanças de código, feature flags com capacidades de rollout gradual (baseado em porcentagem, direcionamento por usuário, janela temporal), kill switches instantaneos para recursos problematicos, é uma trilha de auditoria de todas as mudanças de configuração.

Além disso, valores de configuração sensiveis (senhas de banco de dados, API keys, certificados) devem permanecer no Azure Key Vault com controles de acesso apropriados, enquanto configurações não-sensiveis (feature flags, timeouts, tamanhos de pool de conexão) devem ser facilmente gerenciáveis por product owners sem intervencao de engenharia.

## Habilidades do Exame Cobertas

- Recomendar uma solução de gerenciamento de configuração de aplicação

## Tarefas de Design

### Parte 1: Projetar Arquitetura de Configuração Centralizada

1. Implante um store do Azure App Configuration e projete uma convencao de nomenclatura de chaves que suporte 30 serviços em 4 ambientes. Considere usar labels para diferenciacao de ambientes vs stores separados por ambiente.
2. Projete uma hierarquia de configuração que suporte:
   - Configurações globais compartilhadas por todos os serviços (ex.: nível de logging, endpoint de telemetria)
   - Configurações específicas de serviço (ex.: tamanho do pool de conexão, valores de timeout)
   - Overrides específicos de ambiente (ex.: connection strings de banco de dados por ambiente)
3. Documente os trade-offs entre usar um único store do App Configuration com labels vs múltiplos stores (um por ambiente). Considere custo, granularidade de controle de acesso e raio de explosao de configurações incorretas.

### Parte 2: Integrar Referencias do Key Vault

4. Projete uma solução que armazene valores sensiveis no Azure Key Vault enquanto os referência a partir do App Configuration. Documente como as referências do Key Vault funcionam e como as aplicações as resolvem em tempo de execução.
5. Defina limites de controle de acesso: quais equipes podem gerenciar configuração não-sensivel (product owners) vs secrets (equipe de segurança) vs feature flags (lideres de engenharia).
6. Projete uma estratégia de rotacao de secrets que atualize secrets do Key Vault sem exigir reinicializacao da aplicação. Documente como os intervalos de atualização de configuração interagem com a resolução de referências do Key Vault.

### Parte 3: Gerenciamento de Features e Rollout Gradual

7. Projete um sistema de feature flags usando o gerenciamento de features do App Configuration que suporte:
   - Flags booleanas on/off (kill switches)
   - Rollout baseado em porcentagem (habilitar para 5%, depois 25%, depois 100%)
   - Filtros de direcionamento por usuário (habilitar para IDs ou grupos de usuários específicos)
   - Filtros de janela temporal (habilitar apenas durante horario comercial ou datas específicas)
8. Projete uma estratégia de rollout para um novo recurso de processamento de pagamentos: comece com usuários internos, expanda para 5% dos usuários externos, monitore taxas de erro, depois aumente para 25%, 50% e 100%.
9. Documente como implementar um kill switch instantaneo que desabilite um recurso em todos os 30 serviços dentro de 60 segundos sem reimplantacao.

### Parte 4: Atualização de Configuração e Monitoramento

10. Projete uma estratégia de atualização de configuração que equilibre frescor com desempenho. Compare atualização baseada em polling (padrão sentinel key) vs atualização baseada em push (notificações do Event Grid).
11. Projete uma solução de monitoramento e alerta que detecte:
    - Mudancas de configuração (log de auditoria)
    - Falhas de atualização de configuração nas aplicações
    - Mudancas de estado de feature flags
12. Documente como snapshots do App Configuration podem ser usados para criar conjuntos de configuração point-in-time para consistência de implantacao e cenários de rollback.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-42"
  items={[
    "Convencao de nomenclatura de chaves documentada com hierarquia suportando 30 serviços em 4 ambientes",
    "Integração de referência do Key Vault projetada com separacao de controle de acesso entre configuração e secrets",
    "Sistema de feature flags suporta rollout por porcentagem, direcionamento por usuário, janelas temporais e kill switches",
    "Estratégia de atualização de configuração documentada com padrão sentinel key ou abordagem push do Event Grid",
    "Estratégia de snapshots definida para consistência de implantacao e capacidade de rollback",
    "Monitoramento cobre mudanças de configuração, falhas de atualização e transicoes de estado de feature flags"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Convencao de Nomenclatura de Chaves</summary>

O Azure App Configuration suporta nomes de chaves hierarquicos usando delimitadores (comumente `:` ou `/`). Um padrão comum e `{aplicação}:{componente}:{configuração}` com labels para ambientes. Por exemplo: chave = `OrderService:Database:ConnectionTimeout`, label = `Production`. Isso permite consultar todas as configurações de um serviço ou todas as configurações entre serviços para um ambiente usando filtros de chave e filtros de label.

</details>

<details>
<summary>Dica 2: Padrão Sentinel Key</summary>

Em vez de observar todas as chaves de configuração por mudanças (caro em escala), use um padrão sentinel key: aplicações consultam uma única chave sentinela (ex.: `app:settings:version`). Quando qualquer configuração muda, atualize o valor sentinela. Aplicações só recarregam a configuração completa quando o sentinela muda, reduzindo o trafego de polling de O(n) chaves para O(1) chave por intervalo de atualização.

</details>

<details>
<summary>Dica 3: Filtros de Feature Flag</summary>

O gerenciamento de features do Azure App Configuration suporta filtros integrados: `Microsoft.Targeting` (direcionamento por porcentagem e usuário/grupo), `Microsoft.TimeWindow` (datas de início/fim) e filtros customizados. Filtros de direcionamento usam hashing consistente para que os mesmos usuários sempre vejam o mesmo estado da flag em uma dada porcentagem. Você pode combinar múltiplos filtros com lógica AND/OR para regras de rollout complexas.

</details>

<details>
<summary>Dica 4: Camadas do Configuration Store</summary>

O Azure App Configuration oferece camadas Free e Standard. A camada Free é limitada a 10MB de armazenamento, 1.000 requisicoes/dia e sem SLA. A camada Standard fornece 1GB de armazenamento, 30.000 requisicoes/hora por replica, SLA de 99,9%, private endpoints, managed identity e geo-replicação. Para cargas de trabalho de produção com 30 serviços consultando configuração, a camada Standard com replicas é essencial.

</details>

<details>
<summary>Dica 5: Snapshots para Segurança de Implantação</summary>

Snapshots do App Configuration criam uma copia imutável e point-in-time de key-values. Você pode tirar um snapshot antes da implantacao para que, se mudanças de configuração causarem problemas, você possa reverter instantaneamente todos os serviços para o estado do snapshot. Snapshots também podem ser usados para garantir que todos os serviços em uma implantacao usem a mesma versao de configuração, prevenindo inconsistencia durante implantacoes rolling.

</details>

## Recursos de Aprendizagem

- [Azure App Configuration overview](https://learn.microsoft.com/en-us/azure/azure-app-configuration/overview)
- [Use Key Vault references in App Configuration](https://learn.microsoft.com/en-us/azure/azure-app-configuration/use-key-vault-references-dotnet-core)
- [Feature management overview](https://learn.microsoft.com/en-us/azure/azure-app-configuration/concept-feature-management)
- [App Configuration best practices](https://learn.microsoft.com/en-us/azure/azure-app-configuration/howto-best-practices)
- [Azure App Configuration snapshots](https://learn.microsoft.com/en-us/azure/azure-app-configuration/concept-snapshots)
- [Enable dynamic configuration with push refresh](https://learn.microsoft.com/en-us/azure/azure-app-configuration/enable-dynamic-configuration-push-refresh)

## Verificação de Conhecimento

<details>
<summary>1. Uma empresa usa um único store do App Configuration com labels para separar ambientes. Um desenvolvedor acidentalmente aplica a label "Production" a um valor de configuração de teste. Como a arquitetura poderia prevenir isso?</summary>

**Use Azure RBAC com roles customizados ou stores separados.** As opcoes incluem: (1) Usar stores separados do App Configuration por ambiente com diferentes atribuicoes RBAC (desenvolvedores tem acesso de escrita apenas a stores de dev/test), (2) Usar roles RBAC customizados que restringem escritas baseadas em label (ex.: apenas pipelines de CI/CD podem escrever chaves com a label "Production"), (3) Implementar Azure Policy para auditar mudanças de configuração, (4) Usar chaves de acesso somente-leitura do App Configuration para consumidores de produção enquanto apenas o pipeline de implantacao tem acesso de escrita.

</details>

<details>
<summary>2. Trinta microsservicos consultam o App Configuration a cada 30 segundos. O configuration store comeca a limitar requisicoes. Qual mudança de design reduz o volume de requisicoes mantendo o frescor?</summary>

**Implemente o padrão sentinel key com notificações push do Event Grid.** Em vez de 30 serviços cada um consultando N chaves a cada 30 segundos, cada serviço observa apenas uma única chave sentinela. Isso reduz o polling de 30 x N para 30 x 1 requisicoes por intervalo. Melhor ainda, mude para atualização baseada em push usando Event Grid: o App Configuration emite eventos em mudanças de chave, serviços assinam via Event Grid, e só atualizam quando realmente notificados de mudanças. Isso elimina o polling periodico inteiramente e fornece propagacao quase instantanea.

</details>

<details>
<summary>3. Uma feature flag esta configurada para rollout de 10% usando o filtro Targeting. Um usuário relata que as vezes ve o recurso e as vezes não entre sessões. O que esta errado?</summary>

**O contexto de direcionamento não esta usando um identificador de usuário consistente.** O filtro Targeting usa hashing consistente no identificador do usuário para determinar o estado da flag. Se a aplicação passa identificadores diferentes (ex.: ID de sessão em vez de ID de usuário), o mesmo usuário obtera resultados diferentes entre sessões. A correcao e sempre passar o identificador estavel do usuário autenticado como contexto de direcionamento. Se o usuário for anonimo, use um cookie persistente ou ID de dispositivo para consistência.

</details>

<details>
<summary>4. Sua aplicação referência um secret do Key Vault a partir do App Configuration. O secret e rotacionado no Key Vault mas a aplicação ainda usa o valor antigo. Qual é a causa provavel?</summary>

**O intervalo de atualização do App Configuration não expirou, ou a referência do Key Vault usa uma URI de secret versionada.** O App Configuration faz cache das resolucoes de referências do Key Vault pela duracao do intervalo de atualização de configuração. Se a referência aponta para uma versao específica do secret (ex.: `https://vault.vault.azure.net/secrets/db-password/abc123`), ela sempre resolvera para aquela versao. Use uma URI sem versao (ex.: `https://vault.vault.azure.net/secrets/db-password`) para sempre resolver para a versao mais recente, e garanta que o intervalo de atualização seja curto o suficiente para captar secrets rotacionados dentro da sua janela de tolerância.

</details>

## Laboratório de Validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um resource group para este laboratório:

```bash
az group create --name rg-az305-challenge42 --location eastus
```

2. Crie um store do App Configuration:

```bash
az appconfig create --resource-group rg-az305-challenge42 \
  --name appconfig-challenge42-$RANDOM --location eastus --sku Free
```

3. Adicione um par chave-valor é uma feature flag:

```bash
APPCONFIG_NAME=$(az appconfig list --resource-group rg-az305-challenge42 --query "[0].name" -o tsv)
az appconfig kv set --name $APPCONFIG_NAME --key "App:Settings/FontSize" --value "24" --yes
az appconfig feature set --name $APPCONFIG_NAME --feature "Beta" --yes
```

4. Habilite a feature flag e verifique a configuração:

```bash
az appconfig feature enable --name $APPCONFIG_NAME --feature "Beta" --yes
az appconfig kv list --name $APPCONFIG_NAME --output table
```

5. Verifique o estado da feature flag:

```bash
az appconfig feature list --name $APPCONFIG_NAME --output table
```

:::tip
Esta mini-implantacao válida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge42 --yes --no-wait
```

---

**Próximo**: [Challenge 43: Design Automated Deployment](/docs/az-305/infrastructure/challenge-43)
