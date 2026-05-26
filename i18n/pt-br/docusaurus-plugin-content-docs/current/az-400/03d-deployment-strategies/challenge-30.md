---
sidebar_position: 6
title: "Desafio 30: Caminhos de hotfix e resiliência"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 30: Caminhos de hotfix e resiliência

## Habilidades do exame mapeadas

- Projetar um plano de caminho de hotfix para responder a correções de código de alta prioridade
- Projetar e implementar uma estratégia de resiliência para deploy
- Projetar um pipeline para garantir que deploys de dependências sejam ordenados de forma confiável

## Cenário

A produção está fora do ar. Um bug crítico no serviço de processamento de pagamentos da Contoso está silenciosamente descartando transações quando o total do pedido excede $10.000. O problema foi introduzido na versão de ontem (v2.4.0). O pipeline normal de release leva 2 horas devido a testes de integração completos, varreduras de segurança, gates de aprovação manual e rollout progressivo por rings. O impacto ao cliente está crescendo a cada minuto.

A equipe de engenharia precisa de um caminho de hotfix que possa implantar uma correção verificada em produção em menos de 15 minutos, mantendo verificações de segurança essenciais. Eles também precisam projetar pipelines de deploy resilientes que lidem com ordenação de dependências e incluam circuit breakers para prevenir falhas em cascata.

**Detalhes do ambiente:**
- Payment Service: Azure App Service `app-contoso-payments`
- Shared Library: pacote NuGet `Contoso.Payments.Core`
- Frontend: Azure Static Web Apps `swa-contoso-store`
- Resource group: `rg-contoso-prod`
- Versão atual com problema: `v2.4.0` (tag: `release/2.4.0`)
- Última versão estável conhecida: `v2.3.1` (tag: `release/2.3.1`)

---

## Tarefa 1: Projetar estratégia de branching para hotfix

### Modelo de branching para hotfixes

O branch de hotfix é criado a partir da tag de release (não de `main`) para evitar incluir alterações não publicadas.

```bash
# Step 1: Create hotfix branch from the broken release tag
git checkout -b hotfix/payment-over-10k release/2.4.0

# Step 2: Apply the minimal fix
# Edit the specific file with the bug fix
git add src/PaymentService/Handlers/ProcessPaymentHandler.cs
git commit -m "fix: handle payment amounts exceeding 10000 threshold

The payment validation incorrectly rejected amounts over 10000 due to
an integer overflow in the amount conversion. Changed to use decimal
comparison.

Fixes: INC-4521"

# Step 3: Tag the hotfix release
git tag -a release/2.4.1 -m "Hotfix: payment amount overflow fix"

# Step 4: Push the hotfix branch and tag
git push origin hotfix/payment-over-10k
git push origin release/2.4.1
```

### Pós-hotfix: cherry-pick de volta para main

```bash
# After hotfix is deployed and verified, merge fix back to main
git checkout main
git pull origin main

# Cherry-pick the fix commit into main
git cherry-pick <hotfix-commit-sha>

# If there are conflicts, resolve them
git add .
git commit -m "fix: cherry-pick payment overflow fix from hotfix/payment-over-10k

Original fix deployed as v2.4.1 hotfix.
Cherry-picked to main for inclusion in next regular release."

git push origin main

# Clean up the hotfix branch
git branch -d hotfix/payment-over-10k
git push origin --delete hotfix/payment-over-10k
```

---

## Tarefa 2: Pipeline expedido (pular gates não-críticos, manter varredura de segurança)

### Pipeline de hotfix (GitHub Actions)

Crie `.github/workflows/hotfix-deploy.yml`:

```yaml
name: Hotfix deployment (expedited)

on:
  push:
    branches:
      - 'hotfix/**'
    tags:
      - 'release/*.*.*'

env:
  AZURE_WEBAPP_NAME: app-contoso-payments
  RESOURCE_GROUP: rg-contoso-prod
  DOTNET_VERSION: '8.0.x'

jobs:
  build-and-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      - name: Build
        run: |
          dotnet restore src/PaymentService/PaymentService.csproj
          dotnet build src/PaymentService/PaymentService.csproj -c Release

      - name: Run critical tests only (skip integration/e2e)
        run: |
          dotnet test tests/PaymentService.UnitTests/PaymentService.UnitTests.csproj \
            --configuration Release \
            --filter "Category=Critical|Category=Payment" \
            --no-build

      - name: Security scan (never skip this)
        uses: github/codeql-action/analyze@v3
        with:
          languages: csharp
          queries: security-and-quality

      - name: Publish
        run: |
          dotnet publish src/PaymentService/PaymentService.csproj \
            -c Release -o ./publish

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: hotfix-package
          path: ./publish

  deploy-hotfix:
    runs-on: ubuntu-latest
    needs: build-and-scan
    environment: production-hotfix
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: hotfix-package
          path: ./publish

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy directly to production slot
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          slot-name: staging
          package: ./publish

      - name: Quick health validation (30 seconds max)
        run: |
          STAGING_URL="https://${{ env.AZURE_WEBAPP_NAME }}-staging.azurewebsites.net"
          for i in {1..6}; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/health")
            if [ "$STATUS" == "200" ]; then
              echo "Staging healthy - proceeding with swap"
              exit 0
            fi
            sleep 5
          done
          echo "Staging not healthy after 30 seconds"
          exit 1

      - name: Swap to production (immediate)
        run: |
          az webapp deployment slot swap \
            --name ${{ env.AZURE_WEBAPP_NAME }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --slot staging \
            --target-slot production

      - name: Verify fix in production
        run: |
          PROD_URL="https://${{ env.AZURE_WEBAPP_NAME }}.azurewebsites.net"
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/health")
          echo "Production status: $STATUS"
          if [ "$STATUS" != "200" ]; then
            echo "Production not healthy - rolling back"
            az webapp deployment slot swap \
              --name ${{ env.AZURE_WEBAPP_NAME }} \
              --resource-group ${{ env.RESOURCE_GROUP }} \
              --slot production \
              --target-slot staging
            exit 1
          fi

      - name: Notify team
        if: always()
        run: |
          if [ "${{ job.status }}" == "success" ]; then
            echo "Hotfix deployed successfully to production"
          else
            echo "Hotfix deployment FAILED - manual intervention required"
          fi
```

### Comparação: Pipeline normal vs pipeline de hotfix

| Gate | Pipeline normal | Pipeline de hotfix |
|------|----------------|-------------------|
| Testes unitários | Suite completa (~15 min) | Apenas testes críticos (~2 min) |
| Testes de integração | Suite completa (~30 min) | Ignorados |
| Varredura de segurança | SAST + DAST completos | Apenas SAST (CodeQL) |
| Aprovação manual | Obrigatória (2 revisores) | Aprovador único (líder de plantão) |
| Rollout progressivo | Ring 0, 1, 2, 3 (48 hrs) | Direto para produção |
| Smoke tests | Regressão completa | Apenas health check |
| Tempo total | ~2 horas | ~10-15 minutos |

---

## Tarefa 3: Ordenação de dependências de deploy

### Grafo de dependências de serviços

```text
Contoso.Payments.Core (shared library)
    |
    +--- PaymentService API (depends on Core v2.4.x)
    |        |
    |        +--- Frontend (depends on PaymentService API)
    |
    +--- NotificationService (depends on Core v2.4.x)
```

### Azure Pipelines com ordenação de dependências

Crie `azure-pipelines-ordered-deploy.yml`:

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  azureSubscription: 'contoso-production-connection'

stages:
  - stage: BuildAll
    displayName: 'Build all services'
    jobs:
      - job: BuildCore
        displayName: 'Build shared library'
        steps:
          - script: |
              dotnet pack src/Contoso.Payments.Core/Contoso.Payments.Core.csproj \
                --configuration Release \
                --output $(Build.ArtifactStagingDirectory)/core
            displayName: 'Pack NuGet package'
          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)/core'
              ArtifactName: 'core-package'

      - job: BuildPaymentService
        displayName: 'Build Payment Service'
        dependsOn: BuildCore
        steps:
          - task: DownloadPipelineArtifact@2
            inputs:
              artifact: 'core-package'
              path: '$(Pipeline.Workspace)/core-package'
          - script: |
              dotnet nuget add source $(Pipeline.Workspace)/core-package --name local
              dotnet publish src/PaymentService/PaymentService.csproj \
                -c Release -o $(Build.ArtifactStagingDirectory)/payment
            displayName: 'Build with latest Core package'
          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)/payment'
              ArtifactName: 'payment-service'

      - job: BuildNotificationService
        displayName: 'Build Notification Service'
        dependsOn: BuildCore
        steps:
          - task: DownloadPipelineArtifact@2
            inputs:
              artifact: 'core-package'
              path: '$(Pipeline.Workspace)/core-package'
          - script: |
              dotnet nuget add source $(Pipeline.Workspace)/core-package --name local
              dotnet publish src/NotificationService/NotificationService.csproj \
                -c Release -o $(Build.ArtifactStagingDirectory)/notification
            displayName: 'Build with latest Core package'
          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)/notification'
              ArtifactName: 'notification-service'

      - job: BuildFrontend
        displayName: 'Build Frontend'
        steps:
          - script: |
              cd src/Frontend
              npm ci
              npm run build
            displayName: 'Build frontend'
          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: 'src/Frontend/dist'
              ArtifactName: 'frontend'

  - stage: DeployBackend
    displayName: 'Deploy backend services'
    dependsOn: BuildAll
    jobs:
      - deployment: DeployPaymentService
        displayName: 'Deploy Payment Service'
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: $(azureSubscription)
                    appName: 'app-contoso-payments'
                    deployToSlotOrASE: true
                    slotName: 'staging'
                    package: '$(Pipeline.Workspace)/payment-service'
                - task: AzureAppServiceManage@0
                  inputs:
                    azureSubscription: $(azureSubscription)
                    action: 'Swap Slots'
                    webAppName: 'app-contoso-payments'
                    resourceGroupName: 'rg-contoso-prod'
                    sourceSlot: 'staging'

      - deployment: DeployNotificationService
        displayName: 'Deploy Notification Service'
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: $(azureSubscription)
                    appName: 'app-contoso-notifications'
                    deployToSlotOrASE: true
                    slotName: 'staging'
                    package: '$(Pipeline.Workspace)/notification-service'
                - task: AzureAppServiceManage@0
                  inputs:
                    azureSubscription: $(azureSubscription)
                    action: 'Swap Slots'
                    webAppName: 'app-contoso-notifications'
                    resourceGroupName: 'rg-contoso-prod'
                    sourceSlot: 'staging'

  - stage: DeployFrontend
    displayName: 'Deploy Frontend (depends on backend)'
    dependsOn: DeployBackend
    jobs:
      - deployment: DeployStaticWebApp
        displayName: 'Deploy to Static Web Apps'
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureStaticWebApp@0
                  inputs:
                    app_location: '$(Pipeline.Workspace)/frontend'
                    azure_static_web_apps_api_token: $(SWA_DEPLOYMENT_TOKEN)
```

---

## Tarefa 4: Automação de rollback (reversão automática em caso de falha)

### Rollback imediato via slot swap

```bash
#!/bin/bash
# emergency-rollback.sh - Instant rollback via slot swap

set -euo pipefail

APP_NAME="app-contoso-payments"
RESOURCE_GROUP="rg-contoso-prod"

echo "EMERGENCY ROLLBACK: Swapping production back to previous version..."

# The staging slot contains the previous production version after a swap
az webapp deployment slot swap \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot production \
  --target-slot staging

echo "Rollback complete. Verifying..."

PROD_URL="https://${APP_NAME}.azurewebsites.net/health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")

if [ "$STATUS" == "200" ]; then
  echo "Production healthy after rollback (status: $STATUS)"
else
  echo "WARNING: Production still unhealthy after rollback (status: $STATUS)"
  echo "Manual intervention required!"
  exit 1
fi
```

### Workflow reutilizável do GitHub Actions para rollback

Crie `.github/workflows/rollback.yml`:

```yaml
name: Emergency rollback

on:
  workflow_dispatch:
    inputs:
      service:
        description: 'Service to rollback'
        required: true
        type: choice
        options:
          - payment-service
          - notification-service
          - all
      reason:
        description: 'Reason for rollback'
        required: true
        type: string

env:
  RESOURCE_GROUP: rg-contoso-prod

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: production-emergency
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Rollback payment service
        if: inputs.service == 'payment-service' || inputs.service == 'all'
        run: |
          az webapp deployment slot swap \
            --name app-contoso-payments \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --slot production \
            --target-slot staging
          echo "Payment service rolled back"

      - name: Rollback notification service
        if: inputs.service == 'notification-service' || inputs.service == 'all'
        run: |
          az webapp deployment slot swap \
            --name app-contoso-notifications \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --slot production \
            --target-slot staging
          echo "Notification service rolled back"

      - name: Verify health
        run: |
          sleep 10
          if [ "${{ inputs.service }}" == "payment-service" ] || [ "${{ inputs.service }}" == "all" ]; then
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://app-contoso-payments.azurewebsites.net/health")
            echo "Payment service: $STATUS"
          fi
          if [ "${{ inputs.service }}" == "notification-service" ] || [ "${{ inputs.service }}" == "all" ]; then
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://app-contoso-notifications.azurewebsites.net/health")
            echo "Notification service: $STATUS"
          fi

      - name: Create incident record
        run: |
          echo "Rollback performed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
          echo "Service: ${{ inputs.service }}"
          echo "Reason: ${{ inputs.reason }}"
          echo "Triggered by: ${{ github.actor }}"
```

---

## Tarefa 5: Padrão circuit breaker em deploy

### Conceito de circuit breaker em deploy

Um circuit breaker de deploy interrompe o rollout progressivo quando os limites de falha são excedidos, prevenindo que deploys com problemas alcancem mais usuários.

### Implementação no GitHub Actions

```yaml
  progressive-deploy-with-circuit-breaker:
    runs-on: ubuntu-latest
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to 10% (canary)
        run: |
          az webapp traffic-routing set \
            --name app-contoso-payments \
            --resource-group rg-contoso-prod \
            --distribution staging=10

      - name: Monitor canary (circuit breaker check)
        id: canary-check
        run: |
          MONITORING_DURATION=120
          CHECK_INTERVAL=15
          ERROR_THRESHOLD=5
          ERROR_COUNT=0
          ELAPSED=0

          while [ $ELAPSED -lt $MONITORING_DURATION ]; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://app-contoso-payments-staging.azurewebsites.net/health")
            if [ "$STATUS" != "200" ]; then
              ERROR_COUNT=$((ERROR_COUNT + 1))
              echo "Error detected (count: $ERROR_COUNT, threshold: $ERROR_THRESHOLD)"

              if [ $ERROR_COUNT -ge $ERROR_THRESHOLD ]; then
                echo "CIRCUIT BREAKER TRIPPED: Error threshold exceeded"
                echo "tripped=true" >> $GITHUB_OUTPUT
                exit 1
              fi
            fi
            sleep $CHECK_INTERVAL
            ELAPSED=$((ELAPSED + CHECK_INTERVAL))
          done
          echo "Canary monitoring passed (errors: $ERROR_COUNT)"
          echo "tripped=false" >> $GITHUB_OUTPUT

      - name: Circuit breaker - halt and rollback
        if: failure()
        run: |
          echo "Circuit breaker activated - removing canary traffic"
          az webapp traffic-routing clear \
            --name app-contoso-payments \
            --resource-group rg-contoso-prod
          echo "All traffic restored to production (canary removed)"

      - name: Promote to 50%
        if: success()
        run: |
          az webapp traffic-routing set \
            --name app-contoso-payments \
            --resource-group rg-contoso-prod \
            --distribution staging=50

      - name: Monitor 50% deployment
        if: success()
        run: |
          # Same monitoring pattern as canary check
          sleep 120
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://app-contoso-payments.azurewebsites.net/health")
          if [ "$STATUS" != "200" ]; then
            echo "Health check failed at 50% - rolling back"
            az webapp traffic-routing clear \
              --name app-contoso-payments \
              --resource-group rg-contoso-prod
            exit 1
          fi

      - name: Promote to 100% (swap)
        if: success()
        run: |
          az webapp traffic-routing clear \
            --name app-contoso-payments \
            --resource-group rg-contoso-prod
          az webapp deployment slot swap \
            --name app-contoso-payments \
            --resource-group rg-contoso-prod \
            --slot staging \
            --target-slot production
```

### Circuit breaker baseado em revisão do Azure Container Apps

```bash
# Deploy new revision with 0% traffic initially
az containerapp update \
  --name ca-contoso-payments \
  --resource-group rg-contoso-prod \
  --image acrcontosoprod.azurecr.io/payment-service:v2.4.1 \
  --revision-suffix hotfix-v241

# Route 10% to new revision
az containerapp ingress traffic set \
  --name ca-contoso-payments \
  --resource-group rg-contoso-prod \
  --revision-weight "ca-contoso-payments--hotfix-v241=10" \
  --revision-weight "ca-contoso-payments--stable=90"

# If errors detected, immediately route all traffic back
az containerapp ingress traffic set \
  --name ca-contoso-payments \
  --resource-group rg-contoso-prod \
  --revision-weight "ca-contoso-payments--stable=100"
```

---

## Tarefa 6: Cherry-pick pós-hotfix de volta para main

### Workflow automatizado de cherry-pick

Crie `.github/workflows/cherry-pick-hotfix.yml`:

```yaml
name: Cherry-pick hotfix to main

on:
  push:
    tags:
      - 'release/*'

jobs:
  cherry-pick:
    runs-on: ubuntu-latest
    if: contains(github.ref, 'hotfix') || contains(github.event.head_commit.message, 'fix:')
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.PAT_TOKEN }}

      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Cherry-pick to main
        run: |
          HOTFIX_SHA=$(git rev-parse HEAD)
          git checkout main
          git pull origin main

          if git cherry-pick $HOTFIX_SHA --no-commit; then
            git commit -m "fix: cherry-pick hotfix $(git describe --tags) to main

          Original commit: $HOTFIX_SHA
          Auto-cherry-picked from hotfix branch."
            git push origin main
            echo "Cherry-pick successful"
          else
            # If cherry-pick has conflicts, create a PR instead
            git cherry-pick --abort
            git checkout -b auto/cherry-pick-$HOTFIX_SHA
            git cherry-pick $HOTFIX_SHA || true
            git add -A
            git commit -m "fix: cherry-pick hotfix (conflicts resolved manually)"
            git push origin auto/cherry-pick-$HOTFIX_SHA

            gh pr create \
              --title "Cherry-pick hotfix to main (conflicts)" \
              --body "Automated cherry-pick of hotfix $HOTFIX_SHA. Manual conflict resolution required." \
              --base main \
              --head auto/cherry-pick-$HOTFIX_SHA
            echo "Created PR for manual conflict resolution"
          fi
```

---

## Exercícios de quebra e conserto

### Exercício 1: Hotfix implantado mas correção não está ativa

**Sintoma:** O hotfix foi implantado e o slot swap foi bem-sucedido, mas os clientes ainda experienciam o bug de pagamento.

**Investigar:**
```bash
# Check which version is actually running in production
curl -s "https://app-contoso-payments.azurewebsites.net/api/version"

# Check deployment slot status
az webapp show \
  --name app-contoso-payments \
  --resource-group rg-contoso-prod \
  --query "state"

# Check if traffic routing is sending traffic to staging instead
az webapp traffic-routing show \
  --name app-contoso-payments \
  --resource-group rg-contoso-prod
```

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** O roteamento de tráfego ainda estava configurado para enviar 10% ao slot de staging de um teste canary anterior. Após o swap, o slot "staging" agora contém o código ANTIGO (com problema) de produção, e 10% do tráfego vai para lá.

**Correção:**
```bash
# Clear all traffic routing rules
az webapp traffic-routing clear \
  --name app-contoso-payments \
  --resource-group rg-contoso-prod
```

</details>

### Exercício 2: Falha na ordenação de dependências

**Sintoma:** O deploy do frontend é concluído antes da API do Payment Service estar pronta, causando erros na UI por 2 minutos.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** Os estágios do pipeline não tinham `dependsOn` configurado entre os deploys do frontend e do backend.

**Correção:**
```yaml
# Ensure frontend waits for backend
- stage: DeployFrontend
  dependsOn: DeployBackend  # This ensures ordering
  condition: succeeded('DeployBackend')
```

</details>

### Exercício 3: Conflitos de cherry-pick bloqueiam main

**Sintoma:** Após implantar o hotfix de `release/2.4.0`, o cherry-pick para `main` falha com conflitos de merge porque `main` divergiu significativamente.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** A estrutura de arquivos em `main` mudou (refatoração moveu o código afetado), então o cherry-pick não pode ser aplicado de forma limpa.

**Correção:** Em vez de um cherry-pick automatizado, crie um pull request com a correção lógica aplicada à nova estrutura de arquivos:
```bash
# Create a branch from main and manually apply the fix
git checkout main
git checkout -b fix/payment-overflow-main
# Apply the fix to the new file location
git add .
git commit -m "fix: payment amount overflow (port from hotfix/payment-over-10k)"
git push origin fix/payment-overflow-main

# Create PR for review
gh pr create \
  --title "Port hotfix: payment amount overflow" \
  --body "Manual port of hotfix v2.4.1 to main branch due to cherry-pick conflicts." \
  --base main
```

</details>

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "O serviço de pagamentos em produção da Contoso está fora do ar. O pipeline normal de release leva 2 horas. Um branch de hotfix é criado a partir da tag de release. Quais gates devem ser IGNORADOS no pipeline de hotfix para reduzir o tempo de deploy mantendo a segurança?",
    options: [
      "Varredura de segurança, testes unitários e aprovação manual",
      "Testes de integração, rings de rollout progressivo e suite completa de regressão",
      "Todos os gates devem ser mantidos independentemente da urgência",
      "Varredura de segurança e testes unitários (apenas aprovação manual permanece)"
    ],
    correctIndex: 1,
    explanation: "Para hotfixes, o pipeline deve pular gates demorados mas não-críticos: testes de integração, testes end-to-end, rollout progressivo (rings) e regressão completa. No entanto, varreduras de segurança e testes unitários críticos NUNCA devem ser pulados, pois detectam vulnerabilidades e verificam que a correção funciona. A aprovação manual pode ser reduzida a um único aprovador de plantão."
  },
  {
    question: "Um branch de hotfix deve ser criado a partir de qual fonte para garantir que contenha apenas a correção mínima sem alterações não publicadas?",
    options: [
      "O branch 'main' (código de desenvolvimento mais recente)",
      "A tag de release que introduziu o bug (ex: 'release/2.4.0')",
      "O branch 'develop' (próximo candidato a release)",
      "A tag de release anterior (ex: 'release/2.3.1')"
    ],
    correctIndex: 1,
    explanation: "O branch de hotfix deve ser criado a partir da tag da release atual em produção. Isso garante que a correção seja aplicada exatamente ao código em execução em produção sem incluir funcionalidades não publicadas de main ou develop. Criar a partir da release anterior (v2.3.1) reverteria todas as alterações da v2.4.0, não apenas corrigiria o bug."
  },
  {
    question: "A Contoso tem três serviços com dependências: Shared Library leva à API que leva ao Frontend. O pipeline implanta os três. O que garante que o Frontend não seja implantado antes da API estar pronta?",
    options: [
      "Configurar todos os deploys para executar em paralelo para velocidade",
      "Usar 'dependsOn' no pipeline para criar ordenação explícita de estágios",
      "Implantar todos os serviços no mesmo App Service Plan",
      "Usar Azure Traffic Manager para reter o tráfego do frontend"
    ],
    correctIndex: 1,
    explanation: "A propriedade dependsOn no Azure Pipelines (ou needs no GitHub Actions) cria ordenação explícita de execução entre estágios ou jobs. O estágio de deploy do Frontend deve depender do estágio de deploy do Backend, que depende do estágio da Shared Library. Isso garante que cada camada seja implantada e esteja saudável antes que a próxima camada comece."
  },
  {
    question: "Um circuit breaker de deploy monitora o deploy canary e detecta que a taxa de erro excede 5%. O que o circuit breaker deve fazer?",
    options: [
      "Aumentar a porcentagem de tráfego canary para obter mais dados",
      "Alertar a equipe e aguardar intervenção manual",
      "Interromper imediatamente a promoção e rotear todo o tráfego de volta para a versão estável",
      "Reiniciar as instâncias canary para limpar erros transitórios"
    ],
    correctIndex: 2,
    explanation: "Um circuit breaker de deploy deve automaticamente interromper o rollout e reverter para o estado estável conhecido quando os limites de falha são excedidos. Isso minimiza o impacto ao cliente ao interromper imediatamente o deploy sem esperar intervenção humana. A equipe pode então investigar o problema offline e tentar novamente o deploy após corrigi-lo."
  }
]} />

## Limpeza

```bash
# Delete hotfix branch
git push origin --delete hotfix/payment-over-10k 2>/dev/null || true

# Clear any traffic routing
az webapp traffic-routing clear \
  --name app-contoso-payments \
  --resource-group rg-contoso-prod

# Delete resource group
az group delete --name rg-contoso-prod --yes --no-wait
```
