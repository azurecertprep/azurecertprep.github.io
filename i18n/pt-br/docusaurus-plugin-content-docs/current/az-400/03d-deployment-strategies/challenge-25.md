---
sidebar_position: 1
title: "Desafio 25: Deployments blue-green e canary"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 25: Deployments blue-green e canary

## Habilidades do exame mapeadas

- Projetar uma estratégia de deployment, incluindo blue-green, canary, ring, exposição progressiva, feature flags e testes A/B

## Cenário

A Contoso Ltd opera um serviço de processamento de pagamentos que lida com mais de 50.000 transações por minuto durante horários de pico. O serviço tem um SLA contratual de 99,95% de disponibilidade. A liderança de engenharia calculou que qualquer tempo de inatividade relacionado a deployment custa aproximadamente US$ 10.000 por minuto em receita perdida, penalidades de SLA e erosão da confiança do cliente. O processo de deployment atual envolve uma janela de manutenção toda quinta-feira à noite, o que viola o mandato de "sempre disponível" do CTO.

Você foi encarregado de projetar e implementar estratégias de deployment com zero tempo de inatividade que permitam à Contoso realizar múltiplos deploys por dia sem impactar o processamento de transações.

**Detalhes do ambiente:**
- Azure App Service (Premium v3, P1v3) executando a API de pagamentos
- Azure Traffic Manager para roteamento baseado em DNS
- Application Insights para monitoramento
- Resource group: `rg-contoso-payments-prod`
- Região: East US 2

---

## Tarefa 1: Implementar deployment blue-green com deployment slots do Azure App Service

Crie um App Service com um deployment slot de staging para habilitar deployments blue-green.

### Provisionar a infraestrutura

```bash
# Set variables
RESOURCE_GROUP="rg-contoso-payments-prod"
LOCATION="eastus2"
APP_NAME="app-contoso-payments-api"
APP_SERVICE_PLAN="asp-contoso-payments"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service Plan (Standard tier or higher required for slots)
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --sku P1V3 \
  --is-linux

# Create the web app (production slot)
az webapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --runtime "DOTNET|8.0"

# Create the staging deployment slot
az webapp deployment slot create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging

# Configure slot-specific app settings (these stay with the slot, not the app)
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --slot-settings ENVIRONMENT=staging ASPNETCORE_ENVIRONMENT=Staging
```

### Executar um slot swap (troca blue-green)

```bash
# Swap staging to production (performs warm-up automatically)
az webapp deployment slot swap \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --target-slot production

# If something goes wrong, swap back immediately
az webapp deployment slot swap \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot production \
  --target-slot staging
```

---

## Tarefa 2: Workflow do GitHub Actions para deployment com slot swap

Crie um workflow do GitHub Actions que faz deploy no staging, valida a saúde do serviço e depois faz swap para produção.

### Criar o arquivo de workflow

Crie `.github/workflows/deploy-blue-green.yml`:

```yaml
name: Blue-Green Deployment

on:
  push:
    branches: [main]
    paths:
      - 'src/PaymentApi/**'

env:
  AZURE_WEBAPP_NAME: app-contoso-payments-api
  RESOURCE_GROUP: rg-contoso-payments-prod
  DOTNET_VERSION: '8.0.x'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      - name: Build and publish
        run: |
          dotnet restore src/PaymentApi/PaymentApi.csproj
          dotnet publish src/PaymentApi/PaymentApi.csproj \
            --configuration Release \
            --output ./publish

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: payment-api
          path: ./publish

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    environment: staging
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: payment-api
          path: ./publish

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to staging slot
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          slot-name: staging
          package: ./publish

      - name: Wait for staging to warm up
        run: sleep 30

      - name: Validate staging health
        run: |
          STAGING_URL="https://${{ env.AZURE_WEBAPP_NAME }}-staging.azurewebsites.net"
          HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/health")
          if [ "$HTTP_STATUS" != "200" ]; then
            echo "Health check failed with status $HTTP_STATUS"
            exit 1
          fi
          echo "Staging health check passed"

  swap-to-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: production
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Swap staging to production
        run: |
          az webapp deployment slot swap \
            --name ${{ env.AZURE_WEBAPP_NAME }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --slot staging \
            --target-slot production

      - name: Validate production health
        run: |
          PROD_URL="https://${{ env.AZURE_WEBAPP_NAME }}.azurewebsites.net"
          for i in {1..5}; do
            HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/health")
            if [ "$HTTP_STATUS" == "200" ]; then
              echo "Production health check passed (attempt $i)"
              exit 0
            fi
            echo "Attempt $i failed with status $HTTP_STATUS, retrying..."
            sleep 10
          done
          echo "Production health check failed after 5 attempts"
          exit 1

      - name: Rollback on failure
        if: failure()
        run: |
          az webapp deployment slot swap \
            --name ${{ env.AZURE_WEBAPP_NAME }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --slot production \
            --target-slot staging
          echo "Rolled back to previous production version"
```

---

## Tarefa 3: Implementar deployment canary usando Azure Traffic Manager

Configure o Azure Traffic Manager para rotear 90% do tráfego para o deployment estável e 10% para o canary.

### Criar perfil do Traffic Manager com roteamento ponderado

```bash
# Create Traffic Manager profile
az network traffic-manager profile create \
  --name tm-contoso-payments \
  --resource-group $RESOURCE_GROUP \
  --routing-method Weighted \
  --unique-dns-name contoso-payments \
  --ttl 30 \
  --protocol HTTPS \
  --port 443 \
  --path "/health"

# Add production endpoint (weight 90)
az network traffic-manager endpoint create \
  --name ep-production \
  --resource-group $RESOURCE_GROUP \
  --profile-name tm-contoso-payments \
  --type azureEndpoints \
  --target-resource-id "/subscriptions/<sub-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$APP_NAME" \
  --weight 90 \
  --endpoint-status enabled

# Add canary endpoint (weight 10)
az network traffic-manager endpoint create \
  --name ep-canary \
  --resource-group $RESOURCE_GROUP \
  --profile-name tm-contoso-payments \
  --type azureEndpoints \
  --target-resource-id "/subscriptions/<sub-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/${APP_NAME}-canary" \
  --weight 10 \
  --endpoint-status enabled
```

### Workflow de promoção do canary

Crie `.github/workflows/canary-deployment.yml`:

```yaml
name: Canary Deployment

on:
  workflow_dispatch:
    inputs:
      canary_weight:
        description: 'Traffic percentage for canary (0-100)'
        required: true
        default: '10'
      promote:
        description: 'Promote canary to production'
        required: false
        type: boolean
        default: false

env:
  RESOURCE_GROUP: rg-contoso-payments-prod
  TM_PROFILE: tm-contoso-payments

jobs:
  adjust-traffic:
    runs-on: ubuntu-latest
    if: ${{ !inputs.promote }}
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Update canary traffic weight
        run: |
          CANARY_WEIGHT=${{ inputs.canary_weight }}
          PROD_WEIGHT=$((100 - CANARY_WEIGHT))

          az network traffic-manager endpoint update \
            --name ep-canary \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --profile-name ${{ env.TM_PROFILE }} \
            --type azureEndpoints \
            --weight $CANARY_WEIGHT

          az network traffic-manager endpoint update \
            --name ep-production \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --profile-name ${{ env.TM_PROFILE }} \
            --type azureEndpoints \
            --weight $PROD_WEIGHT

          echo "Traffic split: Production=$PROD_WEIGHT%, Canary=$CANARY_WEIGHT%"

  promote-canary:
    runs-on: ubuntu-latest
    if: ${{ inputs.promote }}
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Route all traffic to canary (now becomes production)
        run: |
          az network traffic-manager endpoint update \
            --name ep-canary \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --profile-name ${{ env.TM_PROFILE }} \
            --type azureEndpoints \
            --weight 100

          az network traffic-manager endpoint update \
            --name ep-production \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --profile-name ${{ env.TM_PROFILE }} \
            --type azureEndpoints \
            --weight 0

          echo "Canary promoted to production - 100% traffic"
```

---

## Tarefa 4: Deployment baseado em rings (interno, beta, GA)

Implemente exposição progressiva com deployment baseado em rings usando slots do Azure App Service e Traffic Manager.

### Definições dos rings

| Ring | Audiência | Tráfego | Duração | Critérios para avançar |
|------|-----------|---------|---------|------------------------|
| Ring 0 | Equipe interna | 0% externo | 2 horas | Sem alertas P1/P2 |
| Ring 1 | Usuários beta | 5% | 24 horas | Taxa de erro abaixo de 0,1% |
| Ring 2 | Early adopters | 25% | 48 horas | Latência P95 abaixo de 200ms |
| Ring 3 | Disponibilidade geral | 100% | Permanente | Todos os rings validados |

### Script de deployment por ring

```bash
#!/bin/bash
# ring-deploy.sh - Progressive ring-based deployment

set -euo pipefail

RESOURCE_GROUP="rg-contoso-payments-prod"
TM_PROFILE="tm-contoso-payments"
APP_NAME="app-contoso-payments-api"

promote_ring() {
  local ring=$1
  case $ring in
    0)
      echo "Ring 0: Deploying to internal slot..."
      az webapp deployment slot swap \
        --name $APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --slot internal \
        --target-slot staging
      echo "Ring 0 deployed. Internal team can validate at: https://${APP_NAME}-internal.azurewebsites.net"
      ;;
    1)
      echo "Ring 1: Enabling 5% canary traffic..."
      az network traffic-manager endpoint update \
        --name ep-canary \
        --resource-group $RESOURCE_GROUP \
        --profile-name $TM_PROFILE \
        --type azureEndpoints \
        --weight 5
      az network traffic-manager endpoint update \
        --name ep-production \
        --resource-group $RESOURCE_GROUP \
        --profile-name $TM_PROFILE \
        --type azureEndpoints \
        --weight 95
      ;;
    2)
      echo "Ring 2: Increasing to 25% traffic..."
      az network traffic-manager endpoint update \
        --name ep-canary \
        --resource-group $RESOURCE_GROUP \
        --profile-name $TM_PROFILE \
        --type azureEndpoints \
        --weight 25
      az network traffic-manager endpoint update \
        --name ep-production \
        --resource-group $RESOURCE_GROUP \
        --profile-name $TM_PROFILE \
        --type azureEndpoints \
        --weight 75
      ;;
    3)
      echo "Ring 3: Promoting to 100% (GA)..."
      az webapp deployment slot swap \
        --name $APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --slot staging \
        --target-slot production
      az network traffic-manager endpoint update \
        --name ep-production \
        --resource-group $RESOURCE_GROUP \
        --profile-name $TM_PROFILE \
        --type azureEndpoints \
        --weight 100
      az network traffic-manager endpoint update \
        --name ep-canary \
        --resource-group $RESOURCE_GROUP \
        --profile-name $TM_PROFILE \
        --type azureEndpoints \
        --weight 0
      ;;
  esac
}

promote_ring "$1"
```

---

## Tarefa 5: Rollback automático em caso de falha no health check

Configure alertas do Application Insights que disparam um rollback automático.

### Regra de alerta do Application Insights

```bash
# Create action group for rollback automation
az monitor action-group create \
  --name ag-deployment-rollback \
  --resource-group $RESOURCE_GROUP \
  --short-name rollback \
  --action webhook rollback-webhook "https://prod.contoso.com/api/deployment/rollback"

# Create metric alert for error rate spike
az monitor metrics alert create \
  --name alert-deployment-error-rate \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/<sub-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$APP_NAME" \
  --condition "avg Http5xx > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action ag-deployment-rollback \
  --description "Triggers automatic rollback when 5xx errors exceed threshold"
```

### Monitoramento pós-deployment no GitHub Actions com auto-rollback

```yaml
  post-deployment-monitor:
    runs-on: ubuntu-latest
    needs: swap-to-production
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Monitor for 5 minutes post-deployment
        run: |
          APP_NAME="app-contoso-payments-api"
          RESOURCE_GROUP="rg-contoso-payments-prod"
          PROD_URL="https://${APP_NAME}.azurewebsites.net/health"
          MONITOR_DURATION=300
          CHECK_INTERVAL=30
          ELAPSED=0

          while [ $ELAPSED -lt $MONITOR_DURATION ]; do
            HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")
            if [ "$HTTP_STATUS" != "200" ]; then
              echo "Health check failed at ${ELAPSED}s with status $HTTP_STATUS. Rolling back..."
              az webapp deployment slot swap \
                --name $APP_NAME \
                --resource-group $RESOURCE_GROUP \
                --slot production \
                --target-slot staging
              echo "Rollback complete"
              exit 1
            fi
            echo "Health OK at ${ELAPSED}s (status: $HTTP_STATUS)"
            sleep $CHECK_INTERVAL
            ELAPSED=$((ELAPSED + CHECK_INTERVAL))
          done
          echo "Post-deployment monitoring passed (${MONITOR_DURATION}s)"
```

---

## Tarefa 6: Tabela de decisão de estratégias de deployment

| Estratégia | Tempo de inatividade | Velocidade de rollback | Custo de infraestrutura | Complexidade | Melhor para |
|------------|---------------------|------------------------|------------------------|--------------|-------------|
| Blue-green | Zero | Instantâneo (swap back) | 2x (ambiente duplicado) | Baixa | Serviços críticos com SLA rigoroso |
| Canary | Zero | Rápido (redirecionar tráfego) | 1.1x (canary pequeno) | Média | Validar mudanças com tráfego real de usuários |
| Rolling | Quase zero | Moderado (roll forward/back) | 1x (in-place) | Média | Serviços stateless com múltiplas instâncias |
| Ring-based | Zero | Rápido (parar promoção) | 1.2x-1.5x | Alta | Serviços em larga escala com base de usuários diversa |
| Feature flags | Zero | Instantâneo (alternar flag) | 1x | Média | Desacoplar deploy de release |

### Quando usar cada estratégia

- **Blue-green**: Quando você precisa de rollback instantâneo e pode arcar com infraestrutura duplicada. Ideal para o serviço de pagamentos da Contoso, onde qualquer falha deve ser revertida em segundos.
- **Canary**: Quando você quer validar com tráfego real antes do rollout completo. Use quando você tem boa observabilidade e pode detectar problemas rapidamente.
- **Rolling**: Quando executa múltiplas instâncias idênticas e quer custo mínimo de infraestrutura extra. Comum para frontends web stateless.
- **Ring-based**: Quando você tem populações de usuários distintas (interno, beta, GA) e quer construção progressiva de confiança.
- **Feature flags**: Quando você quer fazer deploy de código sem ativar funcionalidades. Ideal para desenvolvimento de funcionalidades de longa duração.

---

## Exercícios de quebra e conserto

### Exercício 1: Slot swap falha devido a configurações sticky

**Sintoma:** Após o slot swap, o app de produção se conecta ao banco de dados de staging.

**Investigar:**
```bash
# Check which settings are slot-specific
az webapp config appsettings list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[?slotSetting==``true``].{name:name, slotSetting:slotSetting}"
```


<details>
<summary>Mostrar solução</summary>

**Causa raiz:** As connection strings não foram marcadas como slot settings, então elas foram trocadas junto com o código.


**Correção:**
```bash
# Mark connection string as slot-specific (stays with the slot)
az webapp config connection-string set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --connection-string-type SQLAzure \
  --settings "DefaultConnection=Server=prod-sql.database.windows.net;Database=Payments;Authentication=Active Directory Managed Identity;"

# Set as slot setting on the staging slot
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --slot-settings "ConnectionStrings__DefaultConnection=Server=staging-sql.database.windows.net;Database=Payments;Authentication=Active Directory Managed Identity;"
```

</details>

### Exercício 2: Canary recebendo mais tráfego que o esperado

**Sintoma:** O endpoint canary configurado para 10% do tráfego está recebendo aproximadamente 50% das requisições.

**Investigar:**
```bash
# Check Traffic Manager endpoint weights
az network traffic-manager endpoint show \
  --name ep-canary \
  --resource-group $RESOURCE_GROUP \
  --profile-name $TM_PROFILE \
  --type azureEndpoints \
  --query "{weight:weight, status:endpointStatus}"

# Check DNS TTL
az network traffic-manager profile show \
  --name $TM_PROFILE \
  --resource-group $RESOURCE_GROUP \
  --query "{ttl:dnsConfig.ttl, routingMethod:trafficRoutingMethod}"
```


<details>
<summary>Mostrar solução</summary>

**Causa raiz:** O TTL do DNS foi configurado para 300 segundos (5 minutos). Os clientes fazem cache da resposta DNS, então mudanças de peso levam tempo para propagar. Além disso, o roteamento ponderado do Traffic Manager é probabilístico no nível DNS, não por requisição.


**Correção:**
```bash
# Reduce TTL for faster convergence
az network traffic-manager profile update \
  --name $TM_PROFILE \
  --resource-group $RESOURCE_GROUP \
  --ttl 30
```

</details>

### Exercício 3: Timeout de warm-up do slot de staging

**Sintoma:** Após o swap, as primeiras requisições para produção levam mais de 30 segundos, causando timeouts.


<details>
<summary>Mostrar solução</summary>

**Causa raiz:** A inicialização da aplicação (carregar caches, aquecer JIT) não foi concluída antes do swap.


**Correção:** Configure as definições de inicialização da aplicação:
```bash
# Set warm-up path
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --settings WEBSITE_SWAP_WARMUP_PING_PATH="/health" \
             WEBSITE_SWAP_WARMUP_PING_STATUSES="200"
```


</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso quer fazer deploy de uma nova versão da API de pagamentos com zero tempo de inatividade. O deployment deve permitir rollback instantâneo se problemas forem detectados. Qual abordagem requer a MENOR complexidade operacional enquanto atende a esses requisitos?",
    options: [
      "Deployment canary com Azure Traffic Manager",
      "Deployment blue-green com deployment slots do Azure App Service",
      "Deployment rolling entre múltiplas instâncias de VM",
      "Deployment baseado em rings com exposição progressiva"
    ],
    correctIndex: 1,
    explanation: "Blue-green com deployment slots oferece zero tempo de inatividade e rollback instantâneo (basta fazer swap de volta) com a menor complexidade operacional. A operação de swap é atômica e integrada ao App Service. Canary e ring-based adicionam complexidade de divisão de tráfego, e rolling updates requerem gerenciamento de estados parcialmente implantados."
  },
  {
    question: "Um perfil do Traffic Manager usa roteamento ponderado com produção no peso 90 e canary no peso 10. O TTL do DNS está configurado para 300 segundos. Um desenvolvedor percebe que o canary está recebendo aproximadamente 50% do tráfego. Qual é a causa MAIS PROVÁVEL?",
    options: [
      "O Traffic Manager não suporta roteamento ponderado com Azure App Service",
      "O endpoint canary tem prioridade maior que o de produção",
      "O cache DNS dos clientes causa distribuição desigual, especialmente com baixo volume de requisições",
      "O health probe do endpoint de produção está falhando"
    ],
    correctIndex: 2,
    explanation: "O roteamento ponderado do Traffic Manager opera no nível DNS. Quando clientes fazem cache das respostas DNS durante todo o período do TTL (300 segundos), um único cliente envia todas as requisições para qualquer endpoint que foi retornado. Com baixo volume de requisições, isso cria distribuição desigual. Reduzir o TTL e aumentar o volume de requisições melhora a distribuição estatística."
  },
  {
    question: "Durante um deployment blue-green, a connection string do slot de staging NÃO deve ser trocada para produção. Qual configuração garante esse comportamento?",
    options: [
      "Definir o valor da connection string idêntico em ambos os slots",
      "Marcar a connection string como slot setting (configuração de deployment slot)",
      "Armazenar a connection string no Azure Key Vault",
      "Usar managed identity para autenticação no banco de dados"
    ],
    correctIndex: 1,
    explanation: "Quando uma configuração é marcada como \"slot setting\" (também chamada de \"sticky\"), ela permanece com o slot em vez de seguir o código durante um swap. Isso garante que a connection string de staging fique em staging e a connection string de produção fique em produção, independentemente de qual versão do código está implantada em cada slot."
  },
  {
    question: "A Contoso implementa deployment baseado em rings com Ring 0 (interno), Ring 1 (5% beta), Ring 2 (25% early adopters) e Ring 3 (GA). Após fazer deploy no Ring 1, a taxa de erro aumenta para 2%. O que deve acontecer?",
    options: [
      "Promover imediatamente para Ring 2 para obter mais pontos de dados",
      "Fazer rollback do Ring 1 e investigar, bloqueando promoção para rings superiores",
      "Aumentar Ring 1 para 15% para determinar se o erro é transitório",
      "Pular para Ring 3 já que 2% de taxa de erro é aceitável para usuários beta"
    ],
    correctIndex: 1,
    explanation: "O propósito do deployment baseado em rings é detectar problemas em níveis de exposição mais baixos antes que impactem mais usuários. Uma taxa de erro de 2% no Ring 1 excede os critérios de avanço (taxa de erro abaixo de 0,1%) e indica um problema que afetaria mais usuários em rings superiores. O deployment deve ser revertido, o problema investigado e corrigido, e então o processo de rings reiniciado."
  }
]} />

## Limpeza

```bash
# Remove all resources created in this challenge
az group delete --name rg-contoso-payments-prod --yes --no-wait

# If Traffic Manager is in a separate resource group
az network traffic-manager profile delete \
  --name tm-contoso-payments \
  --resource-group rg-contoso-payments-prod
```
