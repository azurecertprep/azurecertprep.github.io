---
sidebar_position: 7
title: "Desafio 45: Defender for Cloud DevOps Security"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 45: Defender for Cloud DevOps Security

## Habilidades do exame abordadas

- Configurar Microsoft Defender for Cloud DevOps Security
- Integrar GitHub Advanced Security com Microsoft Defender for Cloud

## Cenário

A CISO da Contoso Ltd quer um painel único para todas as descobertas de segurança em seus 30 repositórios GitHub e 15 repositórios Azure DevOps. Atualmente, cada plataforma tem seu próprio painel de segurança, tornando impossível obter uma visão agregada de risco ou impor políticas de segurança consistentes. Você deve implementar o Microsoft Defender for Cloud DevOps Security para unificar o gerenciamento de postura de segurança em ambas as plataformas.

## Pré-requisitos

- Assinatura Azure com acesso de Contributor
- Microsoft Defender for Cloud habilitado (plano Defender CSPM ou Defender for DevOps)
- Organização GitHub com acesso de administrador
- Organização Azure DevOps com acesso de Project Collection Administrator
- Azure CLI instalado

## Tarefas

### Tarefa 1: Conectar organização GitHub ao Microsoft Defender for Cloud

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

### Tarefa 2: Conectar organização Azure DevOps ao Defender for Cloud

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

### Tarefa 3: Configurar gerenciamento de postura de segurança DevOps

Após os conectores serem estabelecidos, configure o que será verificado:

```bash
# View DevOps security posture recommendations
az security assessment list \
  --query "[?contains(resourceDetails.source, 'DevOps')]" -o table

# Configure auto-discovery of new repos (default is enabled)
# In Defender for Cloud > Environment settings > GitHub connector:
# - Auto-discovery: On (new repos automatically scanned)
# - Scanning frequency: Every 24 hours (default)
```

Verificações de postura de segurança que o Defender realiza automaticamente:

| Verificação | Descrição | Plataforma |
|-------|-------------|----------|
| Code scanning não habilitado | Repositórios sem CodeQL ou equivalente | GitHub, Azure DevOps |
| Secret scanning não habilitado | Repositórios sem varredura de segredos | GitHub |
| Dependabot não habilitado | Repositórios sem alertas de dependência | GitHub |
| Proteção de branch ausente | Branch padrão desprotegido | GitHub, Azure DevOps |
| Permissões excessivas | Conexões de serviço com permissões excessivas | Azure DevOps |
| Sem revisores obrigatórios | PRs podem fazer merge sem revisão | GitHub, Azure DevOps |
| Repositórios inativos com acesso | Repositórios obsoletos ainda acessíveis | GitHub |

### Tarefa 4: Visualizar e classificar descobertas de segurança no painel do Defender

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
2. Visualize o inventário unificado de todos os repositórios conectados
3. Filtre por: Severidade (Crítica/Alta/Média/Baixa), Tipo de descoberta, Repositório
4. Para cada descoberta:
   - Visualize o código/configuração afetado
   - Veja a orientação de remediação
   - Atribua a um membro da equipe
   - Defina substituição de severidade se necessário

### Tarefa 5: Configurar anotações de pull request do Defender

Habilite anotações de PR para que os desenvolvedores vejam as descobertas de segurança diretamente em seus pull requests:

Para GitHub:

1. Defender for Cloud > Environment settings > GitHub connector
2. Configure > Pull request annotations: Habilitar
3. Limite de severidade: Alta e Crítica (ignorar Média/Baixa em PRs)
4. Comportamento da anotação: Apenas comentário (não bloquear merge)

Para Azure DevOps:

1. Defender for Cloud > Environment settings > Azure DevOps connector
2. Configure > Pull request annotations: Habilitar
3. Configure a extensão Microsoft Security DevOps Azure DevOps

Instale a extensão no Azure Pipelines:

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

### Tarefa 6: Configurar alertas e políticas de segurança

Configure regras de alerta para descobertas de segurança críticas:

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

Crie uma Azure Policy para governança de segurança DevOps:

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

### Tarefa 7: Integrar com Azure Policy para governança

Crie uma regra de governança para atribuir automaticamente as descobertas:

1. Defender for Cloud > Environment settings > Governance rules
2. Crie a regra:
   - Nome: "DevOps Critical Findings"
   - Escopo: Todos os conectores DevOps
   - Prioridade: 1
   - Condições: Severidade = Crítica
   - Proprietário: security-team@contoso.com
   - Prazo de remediação: 7 dias
   - Período de carência: 3 dias
   - Notificações: Email semanal

```bash
# View compliance status across all DevOps resources
az security regulatory-compliance-assessments list \
  --query "[?contains(id, 'DevOps')]" -o table

# Export security posture data for reporting
az security assessment list \
  --query "[?contains(resourceDetails.source, 'DevOps')]" \
  -o json > devops-security-posture.json
```

Construa um painel de segurança no Azure Workbooks:

```
// KQL query for DevOps security findings over time
SecurityRecommendation
| where RecommendationName contains "DevOps" or RecommendationName contains "GitHub" or RecommendationName contains "Azure DevOps"
| summarize count() by RecommendationName, RecommendationState, bin(TimeGenerated, 1d)
| render timechart
```

## Exercícios de quebra e conserto

### Cenário de quebra 1: Conector GitHub mostra status "Disconnected"

O conector GitHub do Defender for Cloud mostra status não saudável e nenhuma nova descoberta está sendo coletada.

**Causa:** A autorização do GitHub App foi revogada por um administrador da organização, ou o aplicativo foi desinstalado da organização.

**Diagnóstico:**

```bash
# Check connector status
az security security-connector show \
  --name contoso-github-connector \
  --resource-group rg-contoso-defender-devops \
  --query "properties.environmentData"
```


<details>
<summary>Mostrar solução</summary>

**Correção:**

1. Navegue até Defender for Cloud > Environment settings > GitHub connector
2. Clique em "Reauthorize"
3. Reinstale o Microsoft Defender for Cloud GitHub App se ele foi removido
4. Verifique no GitHub: Organization Settings > Installed GitHub Apps > Microsoft Defender for Cloud

</details>

### Cenário de quebra 2: Anotações de PR não aparecem no Azure DevOps

A tarefa MicrosoftSecurityDevOps@1 executa com sucesso, mas nenhuma anotação aparece nos pull requests.

**Causa:** O pipeline está executando no push para main (não no trigger de PR), ou os resultados SARIF não estão sendo publicados corretamente.


<details>
<summary>Mostrar solução</summary>

**Correção:** Garanta que o pipeline é acionado em pull requests e publica os resultados:

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
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso quer visualizar descobertas de segurança de repositórios GitHub e Azure DevOps em um único painel. O que eles devem configurar?",
    options: [
      "Exportar alertas de cada plataforma para uma caixa de email compartilhada",
      "Conectar ambas as plataformas ao Microsoft Defender for Cloud usando conectores de segurança DevOps",
      "Espelhar todo o código para uma única plataforma e verificar lá",
      "Usar um SIEM de terceiros para agregar alertas"
    ],
    correctIndex: 1,
    explanation: "O Microsoft Defender for Cloud DevOps Security fornece conectores nativos para GitHub e Azure DevOps. Uma vez conectados, todas as descobertas de segurança (varredura de código, vulnerabilidades de dependência, varredura de segredos, configurações incorretas de IaC) aparecem no painel unificado do Defender for Cloud com classificações de severidade consistentes e orientação de remediação."
  },
  {
    question: "Após conectar o GitHub ao Defender for Cloud, qual descoberta de postura de segurança o Defender detectaria automaticamente?",
    options: [
      "Uma vulnerabilidade de SQL injection no código da aplicação",
      "Um repositório sem proteção de branch no branch padrão",
      "Um certificado SSL expirado em um servidor web",
      "Um grupo de segurança de rede de VM Azure configurado incorretamente"
    ],
    correctIndex: 1,
    explanation: "O gerenciamento de postura de segurança DevOps verifica problemas no nível de configuração, como proteção de branch ausente, varredura de código desabilitada, falta de revisores obrigatórios e varredura de segredos desabilitada. Ele não verifica o código em busca de vulnerabilidades diretamente (isso é trabalho do CodeQL) nem inspeciona a infraestrutura Azure (isso é o gerenciamento de postura de segurança na nuvem do Defender for Cloud)."
  },
  {
    question: "A Contoso quer que descobertas de segurança críticas em pull requests bloqueiem o merge. Qual configuração alcança isso para repositórios GitHub?",
    options: [
      "Configurar anotações de PR do Defender com comportamento \"Block\"",
      "Criar uma verificação de status obrigatória que usa a ação Microsoft Security DevOps com código de saída diferente de zero em descobertas críticas",
      "Definir proteção de branch para exigir aprovação do Defender",
      "Configurar Dependabot para bloquear merges"
    ],
    correctIndex: 1,
    explanation: "A microsoft/security-devops-action pode ser configurada para falhar (código de saída diferente de zero) quando descobertas críticas são detectadas. Quando este job é definido como uma verificação de status obrigatória na proteção de branch, o PR não pode fazer merge até que as descobertas críticas sejam resolvidas. As anotações de PR do Defender sozinhas apenas adicionam comentários, mas não bloqueiam merges."
  },
  {
    question: "Qual é o principal benefício de conectar o Azure DevOps ao Microsoft Defender for Cloud comparado a usar apenas o GHAzDO (GitHub Advanced Security for Azure DevOps)?",
    options: [
      "O Defender fornece varredura CodeQL que o GHAzDO não fornece",
      "O Defender fornece uma visão unificada entre múltiplas plataformas e integra descobertas com a postura de segurança na nuvem",
      "O Defender é gratuito enquanto o GHAzDO requer uma licença",
      "O Defender verifica o código mais rápido que o GHAzDO"
    ],
    correctIndex: 1,
    explanation: "Embora o GHAzDO forneça excelente varredura dentro do Azure DevOps, o Defender for Cloud adiciona visibilidade entre plataformas (GitHub + Azure DevOps + recursos de nuvem em um único painel), regras de governança para atribuição automática e rastreamento de SLA, integração com Azure Policy e correlação entre descobertas de segurança DevOps e postura de segurança da infraestrutura na nuvem."
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
