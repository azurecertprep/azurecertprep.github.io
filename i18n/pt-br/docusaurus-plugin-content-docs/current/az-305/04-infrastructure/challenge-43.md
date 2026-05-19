---
sidebar_position: 10
title: "Desafio 43: Projetar Implantação Automatizada"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 43: projetar implantação automatizada

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $3-8 | **Peso no Exame: 30-35%**

:::

## Introdução

A VelocityShip é uma empresa fintech que implanta 10 microsserviços em produção 3 vezes por dia. O processo de implantação atual depende de scripts manuais executados por engenheiros seniors, resultando em uma taxa de falha de 15% nas implantacoes é um tempo médio de recuperação de 45 minutos por implantação falha. No mes passado, uma implantação mal-sucedida causou 2 horas de inatividade, custando a empresa $500K em transações perdidas.

O CTO determinou implantacoes com zero tempo de inatividade com rollback automático quando health checks falham. A equipe de engenharia precisa implementar infrastructure-as-code para todos os ambientes (dev, staging, produção em 2 regiões), pipelines de promocao de imagens de container que impedem imagens não testadas de chegar a produção, e estratégias de implantação aprópriadas para cada tipo de serviço (APIs stateless, workers stateful, alteracoes de schema de banco de dados).

A equipe esta dividida entre usar GitHub Actions (já usado para CI) e Azure DevOps (usado pela equipe de plataforma para gerenciamento de releases). Eles precisam de uma recomendacao que considere a experiência de ambas as equipes enquanto padroniza uma abordagem de implantação que escale para 50 serviços dentro de um ano.

## Habilidades do exame cobertas

- Recomendar uma solução de implantação automatizada para aplicações

## Tarefas de design

### Parte 1: estratégia de infrastructure as code

1. Compare Bicep, Terraform e ARM templates para gerenciar infraestrutura Azure. Documente os trade-offs em termos de: curva de aprendizado, gerenciamento de estado, suporte multi-cloud, ecossistema de módulos e integração nativa com Azure.
2. Projete uma estrutura de repositório IaC que suporte 10 microsserviços em 3 ambientes (dev, staging, produção) e 2 regiões. Enderece: infraestrutura compartilhada (VNet, Key Vault, Container Registry) vs. infraestrutura específica de serviço.
3. Projete uma estratégia para gerenciar o estado do IaC. Para Terraform, compare backends de estado remoto (Azure Storage, Terraform Cloud). Para Bicep, documente como implantacoes idempotentes lidam com estado implicitamente.
4. Implemente detecção de drift: como você identifica quando mudanças manuais foram feitas na infraestrutura fora do IaC?

### Parte 2: design do pipeline CI/CD

5. Compare GitHub Actions e Azure DevOps Pipelines para este cenário. Considere: integração com ferramentas existentes, gates de aprovacao, regras de proteção de ambiente, histórico de implantação e RBAC para implantacoes em produção.
6. Projete um pipeline de promocao de imagem de container:
   - Build e teste no CI (executar testes unitarios, scanning SAST)
   - Push para tag de registro dev, implantar no ambiente dev
   - Promover para tag de registro staging apos testes de integração passarem
   - Promover para tag de registro produção apos aprovacao manual
7. Projete o pipeline de implantação para incluir validação pré-implantação (what-if para IaC, endpoints de health check prontos), execução da implantação, verificação pós-implantação (smoke tests, monitoramento sintetico) e gatilho de rollback automático.

### Parte 3: estratégias de implantação

8. Projete uma estratégia de implantação blue-green para os serviços de API stateless usando revisoes do Azure Container Apps ou deployment slots do App Service. Documente roteamento de trafego, validação de saúde e procedimento de rollback instantaneo.
9. Projete uma estratégia de implantação canary para o serviço de processamento de pagamentos onde você roteia 5% do trafego para a nova versao, monitora taxas de erro por 10 minutos, e entao aumenta progressivamente para 25%, 50% e 100%.
10. Projete uma estratégia de implantação rolling para os serviços de worker em background onde você atualiza instâncias uma por vez com health checks entre cada uma. Documente como você lida com mensagens em andamento durante atualizações.
11. Documente sua estratégia para migrações de schema de banco de dados durante implantacoes com zero tempo de inatividade (padrão expand-contract, migrações backward-compatible).

### Parte 4: rollback e recuperação

12. Defina critérios de health check que disparam rollback automático: códigos de resposta HTTP, percentis de latência de resposta, limiares de taxa de erro e metricas de negócio customizadas.
13. Projete um procedimento de rollback para cada estratégia de implantação (blue-green: swap de volta, canary: rotear 100% para antigo, rolling: parar e reverter).
14. Documente como você lida com o cenário "implantação bem-sucedida mas causou degradacao de performance" que só se manifesta sob carga de produção apos 30 minutos.

## Criterios de sucesso

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

Bicep e nativo do Azure sem arquivo de estado (Azure Resource Manager rastreia o estado), tem suporte de primeiro dia para novos recursos Azure e compila para ARM templates. Terraform usa HashiCorp Configuration Language, requer gerenciamento de estado, suporta multi-cloud, tem um vasto ecossistema de providers e usa um workflow plan/apply que mostra mudanças antes da execução. Para empresas somente Azure, Bicep tem menor overhead operacional. Para multi-cloud ou equipes com expertise em Terraform, Terraform oferece portabilidade.

</details>

<details>
<summary>Dica 2: Implantacoes Baseadas em Revisao do Container Apps</summary>

Azure Container Apps suporta divisao de trafego entre revisoes nativamente. Implante uma nova revisao, roteie uma porcentagem do trafego para ela e monitore. Se saudavel, mude 100% do trafego. Se não saudavel, desative a nova revisao. Isso e blue-green e canary integrados sem ferramentas externas. Revisoes são imutáveis, tornando o rollback instantaneo ao redirecionar trafego para a revisao anterior.

</details>

<details>
<summary>Dica 3: Deployment Slots do App Service</summary>

Deployment slots do App Service permitem implantar em um slot não-produção, aquece-lo e entao fazer swap com produção. A operação de swap redireciona o trafego instantaneamente no nível do load balancer (sem cold start). Você pode configurar auto-swap para implantação continua ou usar configurações de app específicas do slot para evitar que connection strings sejam trocadas. Slots compartilham os mesmos recursos do App Service Plan.

</details>

<details>
<summary>Dica 4: Proteção de Ambiente do GitHub Actions</summary>

GitHub Actions suporta ambientes com regras de proteção: revisores obrigatórios (aprovacao manual antes da implantação), timer de espera (atrasar implantação por N minutos) e branches de implantação (restringir quais branches podem implantar em produção). Combinado com federacao OIDC para autenticação Azure, isso elimina credenciais armazenadas e fornece auditabilidade para todas as implantacoes em produção.

</details>

<details>
<summary>Dica 5: Migracoes de Banco de Dados Expand-Contract</summary>

Para mudanças de banco de dados com zero tempo de inatividade: (1) Fase Expand: adicionar novas colunas/tabelas sem remover as antigas, implantar código da aplicação que escreve em ambos antigo e novo, (2) Migrar dados: preencher novas colunas a partir das antigas, (3) Fase Contract: implantar código da aplicação que le apenas do novo, entao remover colunas antigas. Nunca renomeie ou remova colunas na mesma implantação que altera o código da aplicação. Use ferramentas de migração como EF Core Migrations ou Flyway que suportam este padrão.

</details>

## Recursos de aprendizagem

- [Azure Container Apps blue-green deployment](https://learn.microsoft.com/en-us/azure/container-apps/blue-green-deployment)
- [Set up staging environments in Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots)
- [Bicep overview](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview)
- [GitHub Actions for Azure](https://learn.microsoft.com/en-us/azure/developer/github/github-actions)
- [Azure DevOps multi-stage pipelines](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/stages)
- [Deployment best practices](https://learn.microsoft.com/en-us/azure/architecture/framework/devops/release-engineering-cd)

## Verificação de conhecimento

<details>
<summary>1. Uma equipe usa Terraform para gerenciar infraestrutura Azure. Apos uma implantação, eles descobrem que alguem escalou manualmente uma VM pelo portal Azure. O que acontece no próximo `terraform apply`?</summary>

**Terraform reverte a mudança manual.** Terraform compara o estado desejado (nos arquivos .tf) com o estado real (armazenado no arquivo de estado, atualizado do Azure no plan). Ele detecta o drift entre o arquivo de estado e o recurso ao vivo, e entao gera um plano para trazer o recurso de volta a configuração declarada. A mudança manual de escala sera desfeita. E por isso que detecção de drift e gerenciamento do arquivo de estado são críticos. Equipes devem usar `terraform plan` regularmente para detectar drift e estabelecer políticas contra mudanças manuais.

</details>

<details>
<summary>2. Durante uma implantação blue-green, o novo ambiente (green) passa nos health checks mas usuários reportam erros intermitentes 20 minutos apos o swap. Qual elemento de design teria detectado isso?</summary>

**Tempo de bake estendido com monitoramento de trafego em nível de produção.** Health checks sozinhos verificam conectividade básica, não comportamento sob carga real. A estratégia de implantação deve incluir: (1) Um período de bake onde a nova versao lida com trafego de produção enquanto e monitorada de perto (taxas de erro, latência P95/P99, metricas de negócio), (2) Gatilhos de rollback automático baseados nessas metricas, não apenas status de endpoint de saúde, (3) Implantação canary (mudança gradual de trafego) em vez de swap imediato de 100% para limitar o raio de explosao durante o período de bake.

</details>

<details>
<summary>3. Um serviço de pagamento requer processamento exactly-once. Durante uma implantação rolling, algumas mensagens são processadas por instâncias antigas e algumas por instâncias novas. Como você previne transações duplicadas ou perdidas?</summary>

**Use shutdown graceful com garantias de conclusão de mensagem.** Projete a implantação para: (1) Parar de rotear novas mensagens para a instância sendo atualizada (drain), (2) Esperar mensagens em andamento completarem o processamento (timeout de shutdown graceful), (3) Somente entao terminar a instância antiga e iniciar a nova. Use o modo PeekLock do Service Bus para que mensagens só sejam completadas apos o processamento ter sucesso. Se uma instância terminar de forma não-graceful, o lock expira e outra instância reprocessa a mensagem. Garanta que handlers sejam idempotentes para lidar com reprocessamento potencial de forma segura.

</details>

## Laboratório de validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um grupo de recursos para este laboratório:

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

4. Verifique que a implantação foi bem-sucedida e a conta de armazenamento existe:

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
Esta mini-implantação válida suas decisoes de design com recursos Azure reais. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge43 --yes --no-wait
```

---

**Próximo**: [Challenge 44: Design a Migration Strategy Using CAF](/docs/az-305/infrastructure/challenge-44)
