---
sidebar_position: 10
title: "Challenge 43: Design Automated Deployment"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 43: Design Automated Deployment

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $3-8 | **Peso no Exame: 30-35%**

:::

## Introducao

A VelocityShip e uma empresa fintech que implanta 10 microsservicos em producao 3 vezes por dia. O processo de implantacao atual depende de scripts manuais executados por engenheiros seniors, resultando em uma taxa de falha de 15% nas implantacoes e um tempo medio de recuperacao de 45 minutos por implantacao falha. No mes passado, uma implantacao mal-sucedida causou 2 horas de inatividade, custando a empresa $500K em transacoes perdidas.

O CTO determinou implantacoes com zero tempo de inatividade com rollback automatico quando health checks falham. A equipe de engenharia precisa implementar infrastructure-as-code para todos os ambientes (dev, staging, producao em 2 regioes), pipelines de promocao de imagens de container que impedem imagens nao testadas de chegar a producao, e estrategias de implantacao apropriadas para cada tipo de servico (APIs stateless, workers stateful, alteracoes de schema de banco de dados).

A equipe esta dividida entre usar GitHub Actions (ja usado para CI) e Azure DevOps (usado pela equipe de plataforma para gerenciamento de releases). Eles precisam de uma recomendacao que considere a experiencia de ambas as equipes enquanto padroniza uma abordagem de implantacao que escale para 50 servicos dentro de um ano.

## Habilidades do Exame Cobertas

- Recomendar uma solucao de implantacao automatizada para aplicacoes

## Tarefas de Design

### Parte 1: Estrategia de Infrastructure as Code

1. Compare Bicep, Terraform e ARM templates para gerenciar infraestrutura Azure. Documente os trade-offs em termos de: curva de aprendizado, gerenciamento de estado, suporte multi-cloud, ecossistema de modulos e integracao nativa com Azure.
2. Projete uma estrutura de repositorio IaC que suporte 10 microsservicos em 3 ambientes (dev, staging, producao) e 2 regioes. Enderece: infraestrutura compartilhada (VNet, Key Vault, Container Registry) vs. infraestrutura especifica de servico.
3. Projete uma estrategia para gerenciar o estado do IaC. Para Terraform, compare backends de estado remoto (Azure Storage, Terraform Cloud). Para Bicep, documente como implantacoes idempotentes lidam com estado implicitamente.
4. Implemente deteccao de drift: como voce identifica quando mudancas manuais foram feitas na infraestrutura fora do IaC?

### Parte 2: Design do Pipeline CI/CD

5. Compare GitHub Actions e Azure DevOps Pipelines para este cenario. Considere: integracao com ferramentas existentes, gates de aprovacao, regras de protecao de ambiente, historico de implantacao e RBAC para implantacoes em producao.
6. Projete um pipeline de promocao de imagem de container:
   - Build e teste no CI (executar testes unitarios, scanning SAST)
   - Push para tag de registro dev, implantar no ambiente dev
   - Promover para tag de registro staging apos testes de integracao passarem
   - Promover para tag de registro producao apos aprovacao manual
7. Projete o pipeline de implantacao para incluir validacao pre-implantacao (what-if para IaC, endpoints de health check prontos), execucao da implantacao, verificacao pos-implantacao (smoke tests, monitoramento sintetico) e gatilho de rollback automatico.

### Parte 3: Estrategias de Implantacao

8. Projete uma estrategia de implantacao blue-green para os servicos de API stateless usando revisoes do Azure Container Apps ou deployment slots do App Service. Documente roteamento de trafego, validacao de saude e procedimento de rollback instantaneo.
9. Projete uma estrategia de implantacao canary para o servico de processamento de pagamentos onde voce roteia 5% do trafego para a nova versao, monitora taxas de erro por 10 minutos, e entao aumenta progressivamente para 25%, 50% e 100%.
10. Projete uma estrategia de implantacao rolling para os servicos de worker em background onde voce atualiza instancias uma por vez com health checks entre cada uma. Documente como voce lida com mensagens em andamento durante atualizacoes.
11. Documente sua estrategia para migracoes de schema de banco de dados durante implantacoes com zero tempo de inatividade (padrao expand-contract, migracoes backward-compatible).

### Parte 4: Rollback e Recuperacao

12. Defina criterios de health check que disparam rollback automatico: codigos de resposta HTTP, percentis de latencia de resposta, limiares de taxa de erro e metricas de negocio customizadas.
13. Projete um procedimento de rollback para cada estrategia de implantacao (blue-green: swap de volta, canary: rotear 100% para antigo, rolling: parar e reverter).
14. Documente como voce lida com o cenario "implantacao bem-sucedida mas causou degradacao de performance" que so se manifesta sob carga de producao apos 30 minutos.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-43"
  items={[
    "IaC tool comparison documents trade-offs between Bicep and Terraform with justified recommendation",
    "Container image promotion pipeline prevents untested images from reaching production with gated stages",
    "Blue-green or canary deployment strategy designed with traffic routing and health validation steps",
    "Automatic rollback criteria defined with specific thresholds for error rate, latency, and health checks",
    "Database migration strategy supports zero-downtime deployments using expand-contract pattern",
    "CI/CD platform comparison addresses approval gates, environment protection, and RBAC for production"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Fatores de Decisao Bicep vs. Terraform</summary>

Bicep e nativo do Azure sem arquivo de estado (Azure Resource Manager rastreia o estado), tem suporte de primeiro dia para novos recursos Azure e compila para ARM templates. Terraform usa HashiCorp Configuration Language, requer gerenciamento de estado, suporta multi-cloud, tem um vasto ecossistema de providers e usa um workflow plan/apply que mostra mudancas antes da execucao. Para empresas somente Azure, Bicep tem menor overhead operacional. Para multi-cloud ou equipes com expertise em Terraform, Terraform oferece portabilidade.

</details>

<details>
<summary>Dica 2: Implantacoes Baseadas em Revisao do Container Apps</summary>

Azure Container Apps suporta divisao de trafego entre revisoes nativamente. Implante uma nova revisao, roteie uma porcentagem do trafego para ela e monitore. Se saudavel, mude 100% do trafego. Se nao saudavel, desative a nova revisao. Isso e blue-green e canary integrados sem ferramentas externas. Revisoes sao imutaveis, tornando o rollback instantaneo ao redirecionar trafego para a revisao anterior.

</details>

<details>
<summary>Dica 3: Deployment Slots do App Service</summary>

Deployment slots do App Service permitem implantar em um slot nao-producao, aquece-lo e entao fazer swap com producao. A operacao de swap redireciona o trafego instantaneamente no nivel do load balancer (sem cold start). Voce pode configurar auto-swap para implantacao continua ou usar configuracoes de app especificas do slot para evitar que connection strings sejam trocadas. Slots compartilham os mesmos recursos do App Service Plan.

</details>

<details>
<summary>Dica 4: Protecao de Ambiente do GitHub Actions</summary>

GitHub Actions suporta ambientes com regras de protecao: revisores obrigatorios (aprovacao manual antes da implantacao), timer de espera (atrasar implantacao por N minutos) e branches de implantacao (restringir quais branches podem implantar em producao). Combinado com federacao OIDC para autenticacao Azure, isso elimina credenciais armazenadas e fornece auditabilidade para todas as implantacoes em producao.

</details>

<details>
<summary>Dica 5: Migracoes de Banco de Dados Expand-Contract</summary>

Para mudancas de banco de dados com zero tempo de inatividade: (1) Fase Expand: adicionar novas colunas/tabelas sem remover as antigas, implantar codigo da aplicacao que escreve em ambos antigo e novo, (2) Migrar dados: preencher novas colunas a partir das antigas, (3) Fase Contract: implantar codigo da aplicacao que le apenas do novo, entao remover colunas antigas. Nunca renomeie ou remova colunas na mesma implantacao que altera o codigo da aplicacao. Use ferramentas de migracao como EF Core Migrations ou Flyway que suportam este padrao.

</details>

## Recursos de Aprendizagem

- [Azure Container Apps blue-green deployment](https://learn.microsoft.com/en-us/azure/container-apps/blue-green-deployment)
- [Set up staging environments in Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots)
- [Bicep overview](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview)
- [GitHub Actions for Azure](https://learn.microsoft.com/en-us/azure/developer/github/github-actions)
- [Azure DevOps multi-stage pipelines](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/stages)
- [Deployment best practices](https://learn.microsoft.com/en-us/azure/architecture/framework/devops/release-engineering-cd)

## Verificacao de Conhecimento

<details>
<summary>1. Uma equipe usa Terraform para gerenciar infraestrutura Azure. Apos uma implantacao, eles descobrem que alguem escalou manualmente uma VM pelo portal Azure. O que acontece no proximo `terraform apply`?</summary>

**Terraform reverte a mudanca manual.** Terraform compara o estado desejado (nos arquivos .tf) com o estado real (armazenado no arquivo de estado, atualizado do Azure no plan). Ele detecta o drift entre o arquivo de estado e o recurso ao vivo, e entao gera um plano para trazer o recurso de volta a configuracao declarada. A mudanca manual de escala sera desfeita. E por isso que deteccao de drift e gerenciamento do arquivo de estado sao criticos. Equipes devem usar `terraform plan` regularmente para detectar drift e estabelecer politicas contra mudancas manuais.

</details>

<details>
<summary>2. Durante uma implantacao blue-green, o novo ambiente (green) passa nos health checks mas usuarios reportam erros intermitentes 20 minutos apos o swap. Qual elemento de design teria detectado isso?</summary>

**Tempo de bake estendido com monitoramento de trafego em nivel de producao.** Health checks sozinhos verificam conectividade basica, nao comportamento sob carga real. A estrategia de implantacao deve incluir: (1) Um periodo de bake onde a nova versao lida com trafego de producao enquanto e monitorada de perto (taxas de erro, latencia P95/P99, metricas de negocio), (2) Gatilhos de rollback automatico baseados nessas metricas, nao apenas status de endpoint de saude, (3) Implantacao canary (mudanca gradual de trafego) em vez de swap imediato de 100% para limitar o raio de explosao durante o periodo de bake.

</details>

<details>
<summary>3. Um servico de pagamento requer processamento exactly-once. Durante uma implantacao rolling, algumas mensagens sao processadas por instancias antigas e algumas por instancias novas. Como voce previne transacoes duplicadas ou perdidas?</summary>

**Use shutdown graceful com garantias de conclusao de mensagem.** Projete a implantacao para: (1) Parar de rotear novas mensagens para a instancia sendo atualizada (drain), (2) Esperar mensagens em andamento completarem o processamento (timeout de shutdown graceful), (3) Somente entao terminar a instancia antiga e iniciar a nova. Use o modo PeekLock do Service Bus para que mensagens so sejam completadas apos o processamento ter sucesso. Se uma instancia terminar de forma nao-graceful, o lock expira e outra instancia reprocessa a mensagem. Garanta que handlers sejam idempotentes para lidar com reprocessamento potencial de forma segura.

</details>

## Laboratorio de Validacao

Implante uma prova de conceito minima para validar seu design:

1. Crie um grupo de recursos para este laboratorio:

```bash
az group create --name rg-az305-challenge43 --location eastus
```

2. Crie um template Bicep inline e implante-o:

```bash
cat <<'EOF' > main.bicep
param location string = resourceGroup().location
param storagePrefix string = 'staz305c43'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: '${storagePrefix}${uniqueString(resourceGroup().id)}'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}

output storageAccountName string = storageAccount.name
EOF
```

3. Implante o template Bicep:

```bash
az deployment group create --resource-group rg-az305-challenge43 \
  --template-file main.bicep --query "properties.outputs" --output table
```

4. Verifique que a implantacao foi bem-sucedida e a conta de armazenamento existe:

```bash
az deployment group list --resource-group rg-az305-challenge43 \
  --query "[].{Name:name, State:properties.provisioningState, Timestamp:properties.timestamp}" --output table
```

5. Confirme que a conta de armazenamento foi criada:

```bash
az storage account list --resource-group rg-az305-challenge43 \
  --query "[].{Name:name, Kind:kind, SKU:sku.name}" --output table
```

:::tip
Esta mini-implantacao valida suas decisoes de design com recursos Azure reais. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge43 --yes --no-wait
```

---

**Proximo**: [Challenge 44: Design a Migration Strategy Using CAF](/docs/az-305/infrastructure/challenge-44)
