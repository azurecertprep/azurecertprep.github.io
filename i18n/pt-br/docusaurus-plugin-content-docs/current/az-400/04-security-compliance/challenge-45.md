---
sidebar_position: 7
title: "Desafio 45: Defender for Cloud DevOps Security"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 45: Defender for Cloud DevOps Security

## Habilidades do exame abordadas

- Configurar Microsoft Defender for Cloud DevOps Security
- Integrar GitHub Advanced Security com Microsoft Defender for Cloud

## CenÃ¡rio

A CISO da Contoso Ltd quer um painel Ãºnico para todas as descobertas de seguranÃ§a em seus 30 repositÃ³rios GitHub e 15 repositÃ³rios Azure DevOps. Atualmente, cada plataforma tem seu prÃ³prio painel de seguranÃ§a, tornando impossÃ­vel obter uma visÃ£o agregada de risco ou impor polÃ­ticas de seguranÃ§a consistentes. VocÃª deve implementar o Microsoft Defender for Cloud DevOps Security para unificar o gerenciamento de postura de seguranÃ§a em ambas as plataformas.

## PrÃ©-requisitos

- Assinatura Azure com acesso de Contributor
- Microsoft Defender for Cloud habilitado (plano Defender CSPM ou Defender for DevOps)
- OrganizaÃ§Ã£o GitHub com acesso de administrador
- OrganizaÃ§Ã£o Azure DevOps com acesso de Project Collection Administrator
- Azure CLI instalado

## Tarefas

### Tarefa 1: Conectar organizaÃ§Ã£o GitHub ao Microsoft Defender for Cloud

```bash
# Ensure Microsoft Defender for Cloud is registered
az provider register --namespace Microsoft.Security

# Create a resource group for the DevOps connector
az group create --name rg-contoso-defender-devops --location eastus

# Navigate to Azure Portal:
# 1. Microsoft Defender for Cloud > Environment settings
# 2. Add environment > GitHub
# 3. Connector name: contoso-github-connector
# 4. Subscription: Select your subscription
# 5. Resource group: rg-contoso-defender-devops
# 6. Region: East US

# Authorize the connection:
# - Click "Authorize" to install the Microsoft Defender for Cloud GitHub App
# - Select the contoso organization
# - Choose repositories: All repositories (or select specific ones)

# Verify the connector via CLI
az security security-connector list \
  --query "[?environmentName=='GitHub']" -o table

# Check connector health
az security security-connector show \
  --name contoso-github-connector \
  --resource-group rg-contoso-defender-devops \
  --query "{name:name, state:properties.hierarchyIdentifier, health:properties.environmentData}"
```

### Tarefa 2: Conectar organizaÃ§Ã£o Azure DevOps ao Defender for Cloud

```bash
# Navigate to Azure Portal:
# 1. Microsoft Defender for Cloud > Environment settings
# 2. Add environment > Azure DevOps
# 3. Connector name: contoso-azdo-connector
# 4. Subscription: Select your subscription
# 5. Resource group: rg-contoso-defender-devops
# 6. Region: East US

# Authorize the connection:
# - Sign in with Azure DevOps admin account
# - Select the contoso Azure DevOps organization
# - Choose projects: All projects (or select specific ones)
# - Grant consent to the Microsoft Defender for DevOps app

# Verify the connector
az security security-connector list \
  --query "[?environmentName=='AzureDevOps']" -o table

# Alternative: Create connector via CLI (ARM template deployment)
az deployment group create \
  --resource-group rg-contoso-defender-devops \
  --template-file defender-devops-connector.json \
  --parameters organizationName=contoso
```

Template ARM para o conector:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "resources": [
    {
      "type": "Microsoft.Security/securityConnectors",
      "apiVersion": "2023-09-01-preview",
      "name": "contoso-azdo-connector",
      "location": "eastus",
      "properties": {
        "environmentName": "AzureDevOps",
        "environmentData": {
          "environmentType": "AzureDevOpsScope"
        },
        "hierarchyIdentifier": "<azdo-org-id>",
        "offerings": [
          {
            "offeringType": "CspmMonitorAzureDevOps"
          }
        ]
      }
    }
  ]
}
```

### Tarefa 3: Configurar gerenciamento de postura de seguranÃ§a DevOps

ApÃ³s os conectores serem estabelecidos, configure o que serÃ¡ verificado:

```bash
# View DevOps security posture recommendations
az security assessment list \
  --query "[?contains(resourceDetails.source, 'DevOps')]" -o table

# Configure auto-discovery of new repos (default is enabled)
# In Defender for Cloud > Environment settings > GitHub connector:
# - Auto-discovery: On (new repos automatically scanned)
# - Scanning frequency: Every 24 hours (default)
```

VerificaÃ§Ãµes de postura de seguranÃ§a que o Defender realiza automaticamente:

| VerificaÃ§Ã£o | DescriÃ§Ã£o | Plataforma |
|-------|-------------|----------|
| Code scanning nÃ£o habilitado | RepositÃ³rios sem CodeQL ou equivalente | GitHub, Azure DevOps |
| Secret scanning nÃ£o habilitado | RepositÃ³rios sem varredura de segredos | GitHub |
| Dependabot nÃ£o habilitado | RepositÃ³rios sem alertas de dependÃªncia | GitHub |
| ProteÃ§Ã£o de branch ausente | Branch padrÃ£o desprotegido | GitHub, Azure DevOps |
| PermissÃµes excessivas | ConexÃµes de serviÃ§o com permissÃµes excessivas | Azure DevOps |
| Sem revisores obrigatÃ³rios | PRs podem fazer merge sem revisÃ£o | GitHub, Azure DevOps |
| RepositÃ³rios inativos com acesso | RepositÃ³rios obsoletos ainda acessÃ­veis | GitHub |

### Tarefa 4: Visualizar e classificar descobertas de seguranÃ§a no painel do Defender

```bash
# Get all DevOps security recommendations
az security assessment list \
  --query "[?contains(resourceDetails.source, 'DevOps')].{name:displayName, status:status.code, resource:resourceDetails.id}" -o table

# Get specific recommendation details
az security assessment show \
  --name "<assessment-id>" \
  --resource-group rg-contoso-defender-devops

# List all security alerts from DevOps sources
az security alert list \
  --query "[?alertType=='DevOps']" -o table
```

No Portal do Azure:

1. Microsoft Defender for Cloud > DevOps Security
2. Visualize o inventÃ¡rio unificado de todos os repositÃ³rios conectados
3. Filtre por: Severidade (CrÃ­tica/Alta/MÃ©dia/Baixa), Tipo de descoberta, RepositÃ³rio
4. Para cada descoberta:
   - Visualize o cÃ³digo/configuraÃ§Ã£o afetado
   - Veja a orientaÃ§Ã£o de remediaÃ§Ã£o
   - Atribua a um membro da equipe
   - Defina substituiÃ§Ã£o de severidade se necessÃ¡rio

### Tarefa 5: Configurar anotaÃ§Ãµes de pull request do Defender

Habilite anotaÃ§Ãµes de PR para que os desenvolvedores vejam as descobertas de seguranÃ§a diretamente em seus pull requests:

Para GitHub:

1. Defender for Cloud > Environment settings > GitHub connector
2. Configure > Pull request annotations: Habilitar
3. Limite de severidade: Alta e CrÃ­tica (ignorar MÃ©dia/Baixa em PRs)
4. Comportamento da anotaÃ§Ã£o: Apenas comentÃ¡rio (nÃ£o bloquear merge)

Para Azure DevOps:

1. Defender for Cloud > Environment settings > Azure DevOps connector
2. Configure > Pull request annotations: Habilitar
3. Configure a extensÃ£o Microsoft Security DevOps Azure DevOps

Instale a extensÃ£o no Azure Pipelines:

```yaml
# azure-pipelines.yml - Add security scanning with PR annotations
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: MicrosoftSecurityDevOps@1
    displayName: 'Run Microsoft Security DevOps'
    inputs:
      categories: 'code,artifacts,IaC,containers'
      # Tools included: Bandit, BinSkim, ESlint, Template Analyzer,
      # Terrascan, Trivy, AntiMalware
```

Para GitHub Actions:

```yaml
# .github/workflows/defender-scan.yml
name: Microsoft Defender for DevOps
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  security-events: write
  id-token: write

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Microsoft Security DevOps
        uses: microsoft/security-devops-action@v1
        id: msdo
        with:
          categories: 'code,artifacts,IaC,containers'

      - name: Upload results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: ${{ steps.msdo.outputs.sarifFile }}
```

### Tarefa 6: Configurar alertas e polÃ­ticas de seguranÃ§a

Configure regras de alerta para descobertas de seguranÃ§a crÃ­ticas:

```bash
# Create an action group for security notifications
az monitor action-group create \
  --name ag-security-critical \
  --resource-group rg-contoso-defender-devops \
  --short-name SecCritical \
  --action email security-team security-team@contoso.com \
  --action webhook security-webhook "https://contoso.webhook.office.com/webhookb2/..."

# Configure Defender for Cloud alert notifications
# Azure Portal > Defender for Cloud > Environment settings > Email notifications:
# - Recipients: security-team@contoso.com
# - Notification types: High and Critical severity
# - Alert types: All alert types
# - Frequency: Real-time for Critical, Daily digest for High
```

Crie uma Azure Policy para governanÃ§a de seguranÃ§a DevOps:

```bash
# Assign built-in policy: "GitHub repositories should have code scanning enabled"
az policy assignment create \
  --name "require-code-scanning" \
  --display-name "Require code scanning on all GitHub repos" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/built-in-id" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-defender-devops"

# Assign built-in policy: "Azure DevOps repositories should have secret scanning enabled"
az policy assignment create \
  --name "require-secret-scanning" \
  --display-name "Require secret scanning on ADO repos" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/built-in-id" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-defender-devops"
```

### Tarefa 7: Integrar com Azure Policy para governanÃ§a

Crie uma regra de governanÃ§a para atribuir automaticamente as descobertas:

1. Defender for Cloud > Environment settings > Governance rules
2. Crie a regra:
   - Nome: "DevOps Critical Findings"
   - Escopo: Todos os conectores DevOps
   - Prioridade: 1
   - CondiÃ§Ãµes: Severidade = CrÃ­tica
   - ProprietÃ¡rio: security-team@contoso.com
   - Prazo de remediaÃ§Ã£o: 7 dias
   - PerÃ­odo de carÃªncia: 3 dias
   - NotificaÃ§Ãµes: Email semanal

```bash
# View compliance status across all DevOps resources
az security regulatory-compliance-assessments list \
  --query "[?contains(id, 'DevOps')]" -o table

# Export security posture data for reporting
az security assessment list \
  --query "[?contains(resourceDetails.source, 'DevOps')]" \
  -o json > devops-security-posture.json
```

Construa um painel de seguranÃ§a no Azure Workbooks:

```text
// KQL query for DevOps security findings over time
SecurityRecommendation
| where RecommendationName contains "DevOps" or RecommendationName contains "GitHub" or RecommendationName contains "Azure DevOps"
| summarize count() by RecommendationName, RecommendationState, bin(TimeGenerated, 1d)
| render timechart
```

## ExercÃ­cios de quebra e conserto

### CenÃ¡rio de quebra 1: Conector GitHub mostra status "Disconnected"

O conector GitHub do Defender for Cloud mostra status nÃ£o saudÃ¡vel e nenhuma nova descoberta estÃ¡ sendo coletada.

**Causa:** A autorizaÃ§Ã£o do GitHub App foi revogada por um administrador da organizaÃ§Ã£o, ou o aplicativo foi desinstalado da organizaÃ§Ã£o.

**DiagnÃ³stico:**

```bash
# Check connector status
az security security-connector show \
  --name contoso-github-connector \
  --resource-group rg-contoso-defender-devops \
  --query "properties.environmentData"
```


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:**

1. Navegue atÃ© Defender for Cloud > Environment settings > GitHub connector
2. Clique em "Reauthorize"
3. Reinstale o Microsoft Defender for Cloud GitHub App se ele foi removido
4. Verifique no GitHub: Organization Settings > Installed GitHub Apps > Microsoft Defender for Cloud

</details>

### CenÃ¡rio de quebra 2: AnotaÃ§Ãµes de PR nÃ£o aparecem no Azure DevOps

A tarefa MicrosoftSecurityDevOps@1 executa com sucesso, mas nenhuma anotaÃ§Ã£o aparece nos pull requests.

**Causa:** O pipeline estÃ¡ executando no push para main (nÃ£o no trigger de PR), ou os resultados SARIF nÃ£o estÃ£o sendo publicados corretamente.


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:** Garanta que o pipeline Ã© acionado em pull requests e publica os resultados:

```yaml
trigger: none  # Do not run on push
pr:
  branches:
    include:
      - main

steps:
  - task: MicrosoftSecurityDevOps@1
    inputs:
      categories: 'code,IaC'

  # Results must be published for PR annotations to appear
  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: '$(System.DefaultWorkingDirectory)/.gdn'
      artifactName: 'SecurityResults'
```

</details>
## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso quer visualizar descobertas de seguranÃ§a de repositÃ³rios GitHub e Azure DevOps em um Ãºnico painel. O que eles devem configurar?",
    options: [
      "Exportar alertas de cada plataforma para uma caixa de email compartilhada",
      "Conectar ambas as plataformas ao Microsoft Defender for Cloud usando conectores de seguranÃ§a DevOps",
      "Espelhar todo o cÃ³digo para uma Ãºnica plataforma e verificar lÃ¡",
      "Usar um SIEM de terceiros para agregar alertas"
    ],
    correctIndex: 1,
    explanation: "O Microsoft Defender for Cloud DevOps Security fornece conectores nativos para GitHub e Azure DevOps. Uma vez conectados, todas as descobertas de seguranÃ§a (varredura de cÃ³digo, vulnerabilidades de dependÃªncia, varredura de segredos, configuraÃ§Ãµes incorretas de IaC) aparecem no painel unificado do Defender for Cloud com classificaÃ§Ãµes de severidade consistentes e orientaÃ§Ã£o de remediaÃ§Ã£o."
  },
  {
    question: "ApÃ³s conectar o GitHub ao Defender for Cloud, qual descoberta de postura de seguranÃ§a o Defender detectaria automaticamente?",
    options: [
      "Uma vulnerabilidade de SQL injection no cÃ³digo da aplicaÃ§Ã£o",
      "Um repositÃ³rio sem proteÃ§Ã£o de branch no branch padrÃ£o",
      "Um certificado SSL expirado em um servidor web",
      "Um grupo de seguranÃ§a de rede de VM Azure configurado incorretamente"
    ],
    correctIndex: 1,
    explanation: "O gerenciamento de postura de seguranÃ§a DevOps verifica problemas no nÃ­vel de configuraÃ§Ã£o, como proteÃ§Ã£o de branch ausente, varredura de cÃ³digo desabilitada, falta de revisores obrigatÃ³rios e varredura de segredos desabilitada. Ele nÃ£o verifica o cÃ³digo em busca de vulnerabilidades diretamente (isso Ã© trabalho do CodeQL) nem inspeciona a infraestrutura Azure (isso Ã© o gerenciamento de postura de seguranÃ§a na nuvem do Defender for Cloud)."
  },
  {
    question: "A Contoso quer que descobertas de seguranÃ§a crÃ­ticas em pull requests bloqueiem o merge. Qual configuraÃ§Ã£o alcanÃ§a isso para repositÃ³rios GitHub?",
    options: [
      "Configurar anotaÃ§Ãµes de PR do Defender com comportamento \"Block\"",
      "Criar uma verificaÃ§Ã£o de status obrigatÃ³ria que usa a aÃ§Ã£o Microsoft Security DevOps com cÃ³digo de saÃ­da diferente de zero em descobertas crÃ­ticas",
      "Definir proteÃ§Ã£o de branch para exigir aprovaÃ§Ã£o do Defender",
      "Configurar Dependabot para bloquear merges"
    ],
    correctIndex: 1,
    explanation: "A microsoft/security-devops-action pode ser configurada para falhar (cÃ³digo de saÃ­da diferente de zero) quando descobertas crÃ­ticas sÃ£o detectadas. Quando este job Ã© definido como uma verificaÃ§Ã£o de status obrigatÃ³ria na proteÃ§Ã£o de branch, o PR nÃ£o pode fazer merge atÃ© que as descobertas crÃ­ticas sejam resolvidas. As anotaÃ§Ãµes de PR do Defender sozinhas apenas adicionam comentÃ¡rios, mas nÃ£o bloqueiam merges."
  },
  {
    question: "Qual Ã© o principal benefÃ­cio de conectar o Azure DevOps ao Microsoft Defender for Cloud comparado a usar apenas o GHAzDO (GitHub Advanced Security for Azure DevOps)?",
    options: [
      "O Defender fornece varredura CodeQL que o GHAzDO nÃ£o fornece",
      "O Defender fornece uma visÃ£o unificada entre mÃºltiplas plataformas e integra descobertas com a postura de seguranÃ§a na nuvem",
      "O Defender Ã© gratuito enquanto o GHAzDO requer uma licenÃ§a",
      "O Defender verifica o cÃ³digo mais rÃ¡pido que o GHAzDO"
    ],
    correctIndex: 1,
    explanation: "Embora o GHAzDO forneÃ§a excelente varredura dentro do Azure DevOps, o Defender for Cloud adiciona visibilidade entre plataformas (GitHub + Azure DevOps + recursos de nuvem em um Ãºnico painel), regras de governanÃ§a para atribuiÃ§Ã£o automÃ¡tica e rastreamento de SLA, integraÃ§Ã£o com Azure Policy e correlaÃ§Ã£o entre descobertas de seguranÃ§a DevOps e postura de seguranÃ§a da infraestrutura na nuvem."
  }
]} />

## Limpeza

```bash
# Remove the security connectors
az security security-connector delete \
  --name contoso-github-connector \
  --resource-group rg-contoso-defender-devops

az security security-connector delete \
  --name contoso-azdo-connector \
  --resource-group rg-contoso-defender-devops

# Delete resource group
az group delete --name rg-contoso-defender-devops --yes --no-wait

# Remove the GitHub App (Organization Settings > Installed GitHub Apps)
# Uninstall "Microsoft Defender for Cloud" app

# Remove the Azure DevOps extension
# Organization Settings > Extensions > Microsoft Security DevOps > Uninstall

# Clean up workflow files
rm -f .github/workflows/defender-scan.yml
git add -A && git commit -m "cleanup: remove challenge 45 Defender config" && git push
```
