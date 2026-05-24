---
sidebar_position: 26
title: "Desafio 26: Segurança de IA – Superexposição de Dados no SharePoint & Purview DSPM"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 26: Segurança de IA – Superexposição de Dados no SharePoint & Purview DSPM

## Habilidades do exame cobertas

- Identificar e mitigar riscos de superexposição de dados antes de implantar cargas de trabalho de IA
- Configurar Microsoft Purview Data Security Posture Management (DSPM) para IA
- Avaliar permissões de sites SharePoint para compartilhamento excessivo
- Implementar rótulos de sensibilidade para proteger dados expostos pelo Copilot
- Monitorar riscos de exposição de dados através do portal de conformidade do Purview

## Cenário

A Contoso Ltd está se preparando para implantar o Microsoft 365 Copilot para 5.000 usuários. O CISO está preocupado que o Copilot possa expor documentos sensíveis que atualmente estão supercompartilhados via SharePoint Online — incluindo registros de RH, previsões financeiras e documentos de M&A armazenados em sites com permissões amplas. Você deve avaliar e remediar riscos de superexposição de dados usando o Purview DSPM for AI antes de habilitar o Copilot.

---

## Pré-requisitos

- 🔒 **Licença necessária**: Microsoft 365 E5 + complemento Microsoft Purview DSPM for AI
- Função de Global Administrator ou Compliance Administrator no Microsoft 365
- Função de SharePoint Administrator
- Acesso ao portal Microsoft Purview
- Módulo Azure AD PowerShell ou Microsoft Graph PowerShell SDK instalado

---

## Tarefa 1: Avaliar riscos atuais de supercompartilhamento no SharePoint

Execute o relatório de supercompartilhamento do SharePoint Advanced Management (SAM) para identificar sites com acesso amplo.

```powershell
# Connect to SharePoint Online
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"

# Get sites with "Everyone except external users" permissions
Get-SPOSite -Limit All | ForEach-Object {
    $site = $_
    $groups = Get-SPOSiteGroup -Site $site.Url
    $overshared = $groups | Where-Object {
        $_.Users -contains "c:0-.f|rolemanager|spo-grid-all-users/$($site.Url)"
    }
    if ($overshared) {
        [PSCustomObject]@{
            SiteUrl = $site.Url
            Title = $site.Title
            OversharedGroups = ($overshared.Title -join ", ")
            StorageUsageMB = $site.StorageUsageCurrent
        }
    }
} | Export-Csv -Path "oversharing-report.csv" -NoTypeInformation
```

```powershell
# Identify sites with anonymous sharing links
Get-SPOSite -Limit All -IncludePersonalSite $false | Where-Object {
    $_.SharingCapability -eq "ExternalUserAndGuestSharing" -or
    $_.SharingCapability -eq "Anyone"
} | Select-Object Url, Title, SharingCapability
```

---

## Tarefa 2: Habilitar Purview DSPM for AI

Configure o dashboard de Data Security Posture Management para cargas de trabalho de IA.

1. Navegue até **Microsoft Purview portal** → **Solutions** → **DSPM for AI**
2. Clique em **Get started** para ativar a solução DSPM for AI
3. Em **Data assessments**, clique em **New assessment**
4. Configure a avaliação:
   - **Name**: "Pre-Copilot Data Exposure Assessment"
   - **Scope**: Todos os sites SharePoint Online
   - **Assessment type**: Detecção de supercompartilhamento
5. Clique em **Start assessment** e aguarde a conclusão (pode levar 24-48 horas)

```powershell
# Use Microsoft Graph API to check DSPM assessment status
Connect-MgGraph -Scopes "InformationProtection.Read.All"

# Query Purview DSPM assessments via Graph
$uri = "https://graph.microsoft.com/beta/security/informationProtection/datasecurityposture/assessments"
Invoke-MgGraphRequest -Method GET -Uri $uri
```

---

## Tarefa 3: Configurar rótulos de sensibilidade para conteúdo crítico de IA

Crie e aplique rótulos de sensibilidade para proteger conteúdo de alto valor de ser exposto pelo Copilot.

```powershell
# Connect to Security & Compliance PowerShell
Connect-IPPSSession

# Create sensitivity label for highly confidential data
New-Label -DisplayName "Highly Confidential - No AI" `
    -Name "HC-NoAI" `
    -Tooltip "Content excluded from AI processing" `
    -Comment "Applied to content that should not be surfaced by Microsoft 365 Copilot" `
    -ContentType "File, Email, Site"

# Configure label encryption settings
Set-Label -Identity "HC-NoAI" `
    -EncryptionEnabled $true `
    -EncryptionProtectionType "Template" `
    -EncryptionDoNotForward $false `
    -EncryptionOfflineAccessDays 30

# Create auto-labeling policy for financial documents
New-AutoSensitivityLabelPolicy -Name "Auto-Label-Financial-NoAI" `
    -SharePointLocation "All" `
    -ExchangeLocation "All" `
    -Mode "Simulate"

New-AutoSensitivityLabelRule -Policy "Auto-Label-Financial-NoAI" `
    -Name "Financial-Pattern-Match" `
    -SensitiveInformationType @{
        Name = "Credit Card Number"; minCount = 1
    }, @{
        Name = "U.S. Bank Account Number"; minCount = 1
    } `
    -ApplySensitivityLabel "HC-NoAI"
```

---

## Tarefa 4: Restringir acesso a sites SharePoint para reduzir supercompartilhamento

Remedie os principais sites supercompartilhados identificados na Tarefa 1.

```powershell
# Remove "Everyone except external users" from specific sites
$sitesToRemediate = @(
    "https://contoso.sharepoint.com/sites/HRConfidential",
    "https://contoso.sharepoint.com/sites/Finance-MA",
    "https://contoso.sharepoint.com/sites/ExecutiveComp"
)

foreach ($siteUrl in $sitesToRemediate) {
    # Restrict site sharing capability
    Set-SPOSite -Identity $siteUrl -SharingCapability "Disabled"

    # Remove broad access groups
    $groups = Get-SPOSiteGroup -Site $siteUrl
    foreach ($group in $groups) {
        $broadUsers = $group.Users | Where-Object {
            $_ -like "*spo-grid-all-users*" -or
            $_ -like "*nt:s-1-1-0*"
        }
        if ($broadUsers) {
            foreach ($user in $broadUsers) {
                Remove-SPOUser -Site $siteUrl -Group $group.Title -LoginName $user
                Write-Host "Removed $user from $($group.Title) on $siteUrl"
            }
        }
    }
}
```

```powershell
# Enable Restricted Access Control for sensitive sites
Set-SPOSite -Identity "https://contoso.sharepoint.com/sites/HRConfidential" `
    -RestrictedAccessControl $true

# Configure site-level Conditional Access policy
Set-SPOSite -Identity "https://contoso.sharepoint.com/sites/Finance-MA" `
    -ConditionalAccessPolicy "AllowLimitedAccess" `
    -LimitedAccessFileType "WebPreviewableFiles"
```

---

## Tarefa 5: Monitorar recomendações do DSPM for AI

Revise e atue nas recomendações do DSPM para melhorar a postura de segurança de dados antes da implantação do Copilot.

1. Navegue até **Microsoft Purview portal** → **DSPM for AI** → **Recommendations**
2. Revise as seguintes categorias de recomendações:
   - **Conteúdo supercompartilhado**: Sites com permissões amplas contendo dados sensíveis
   - **Conteúdo sensível sem rótulo**: Arquivos correspondentes a tipos de informações sensíveis sem rótulos
   - **Riscos de compartilhamento externo**: Conteúdo compartilhado externamente que a IA poderia referenciar
3. Para cada recomendação de alta prioridade:
   - Clique em **View details** para ver sites/arquivos afetados
   - Clique em **Take action** para aplicar a remediação sugerida
   - Defina a **Priority** para acompanhar o progresso da remediação

```powershell
# Use Graph API to retrieve DSPM recommendations
$uri = "https://graph.microsoft.com/beta/security/informationProtection/datasecurityposture/recommendations"
$recommendations = Invoke-MgGraphRequest -Method GET -Uri $uri

# Filter high-severity recommendations
$recommendations.value | Where-Object { $_.severity -eq "high" } | ForEach-Object {
    [PSCustomObject]@{
        Title = $_.title
        Category = $_.category
        AffectedAssets = $_.affectedAssetsCount
        RecommendedAction = $_.recommendedAction
    }
}
```

---

## Tarefa 6: Criar relatório de prontidão para o Copilot

Gere um relatório resumido combinando descobertas de supercompartilhamento com insights do DSPM.

```powershell
# Generate readiness summary
$report = @{
    AssessmentDate = Get-Date -Format "yyyy-MM-dd"
    TotalSitesScanned = (Get-SPOSite -Limit All).Count
    OversharedSites = (Import-Csv "oversharing-report.csv").Count
    SitesWithAnonymousLinks = (Get-SPOSite -Limit All | Where-Object {
        $_.SharingCapability -eq "Anyone"
    }).Count
    SensitivityLabelsApplied = $true
    DSPMAssessmentComplete = $true
}

$report | ConvertTo-Json | Out-File "copilot-readiness-report.json"

# Verify no remaining high-risk sites
Get-SPOSite -Limit All | Where-Object {
    $_.SharingCapability -eq "Anyone" -and
    $_.StorageUsageCurrent -gt 100
} | Select-Object Url, Title, SharingCapability | Format-Table
```

---

## Quebra & conserta

### Cenário 1: Copilot expõe documentos confidenciais de M&A para todos os funcionários

Usuários relatam que o Microsoft 365 Copilot está retornando conteúdo do site "Project Titan" de M&A quando perguntam sobre aquisições da empresa. O site foi criado há 6 meses com "Everyone except external users" como membros.

<details>
<summary>Mostrar solução</summary>

```powershell
# Immediately restrict the site
Set-SPOSite -Identity "https://contoso.sharepoint.com/sites/ProjectTitan" `
    -SharingCapability "Disabled" `
    -RestrictedAccessControl $true

# Remove broad access
Get-SPOSiteGroup -Site "https://contoso.sharepoint.com/sites/ProjectTitan" | ForEach-Object {
    $broadUsers = $_.Users | Where-Object { $_ -like "*spo-grid-all-users*" }
    foreach ($user in $broadUsers) {
        Remove-SPOUser -Site "https://contoso.sharepoint.com/sites/ProjectTitan" `
            -Group $_.Title -LoginName $user
    }
}

# Apply sensitivity label to all content in the site
# This requires SharePoint PnP module
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/ProjectTitan" -Interactive
$items = Get-PnPListItem -List "Documents" -PageSize 500
foreach ($item in $items) {
    Set-PnPListItem -List "Documents" -Identity $item.Id `
        -Label "Highly Confidential - No AI"
}
```

</details>

### Cenário 2: Avaliação do DSPM mostra 0 sites supercompartilhados apesar de problemas conhecidos

A avaliação do DSPM for AI foi concluída mas não reporta riscos de supercompartilhamento, mesmo que a revisão manual tenha encontrado múltiplos sites amplamente compartilhados com conteúdo sensível.

<details>
<summary>Mostrar solução</summary>

```powershell
# Verify DSPM has proper permissions
# 1. Check that the Purview service principal has SharePoint read access
Connect-MgGraph -Scopes "Application.Read.All"
$purviewApp = Get-MgServicePrincipal -Filter "displayName eq 'Microsoft Purview'"

# 2. Ensure SharePoint sites are included in assessment scope
# Navigate to Purview portal > DSPM for AI > Settings > Data sources
# Verify "SharePoint Online" is toggled ON and scope is "All sites"

# 3. Check assessment configuration
# Navigate to DSPM for AI > Assessments > Click on the assessment
# Verify:
#   - Status is "Completed" (not "In progress" or "Failed")
#   - Scope includes all SharePoint sites (not filtered to specific sites)
#   - Sensitive info types are properly configured

# 4. Re-run assessment with corrected scope
# Click "Edit assessment" > Ensure scope is "All SharePoint Online sites"
# Enable "Include sites with fewer than 10 files" if needed
# Click "Re-run assessment"

# 5. Verify sensitive info type classifiers are active
Get-DlpSensitiveInformationType | Where-Object { $_.Publisher -eq "Microsoft" } |
    Select-Object Name, State | Where-Object { $_.State -ne "Active" }
```

</details>

### Cenário 3: Política de auto-rotulagem não aplica rótulos aos arquivos sensíveis detectados

A política de auto-rotulagem foi criada em modo de simulação e mostra correspondências, mas após habilitar a aplicação, os rótulos não estão sendo aplicados.

<details>
<summary>Mostrar solução</summary>

```powershell
# Check policy status
Get-AutoSensitivityLabelPolicy -Identity "Auto-Label-Financial-NoAI" |
    Select-Object Name, Mode, Enabled, WhenChanged

# Switch from simulation to enforcement mode
Set-AutoSensitivityLabelPolicy -Identity "Auto-Label-Financial-NoAI" `
    -Mode "Enable"

# Verify the label exists and is published
Get-Label -Identity "HC-NoAI" | Select-Object Name, Enabled, ContentType

# Ensure label is published to users via a label policy
Get-LabelPolicy | Where-Object {
    $_.Labels -contains "HC-NoAI"
} | Select-Object Name, Enabled

# If no policy publishes the label, create one
New-LabelPolicy -Name "Publish-HC-NoAI-Label" `
    -Labels "HC-NoAI" `
    -ExchangeLocation "All" `
    -SharePointLocation "All"
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é o principal risco que o Purview DSPM for AI ajuda a resolver antes de implantar o Microsoft 365 Copilot?",
    options: [
      "Copilot gerando sugestões de código incorretas",
      "Superexposição de dados através de conteúdo supercompartilhado sendo exposto pela IA",
      "Usuários contornando autenticação multifator via Copilot",
      "Atacantes externos explorando endpoints da API do Copilot"
    ],
    correctIndex: 1,
    explanation: "O DSPM for AI identifica especificamente riscos de superexposição de dados onde conteúdo com permissões amplas (especialmente no SharePoint) pode ser exposto pelo Copilot a usuários que não deveriam ter acesso a ele, com base em permissões existentes que são muito amplas."
  },
  {
    question: "Um site SharePoint tem 'Everyone except external users' adicionado ao grupo Members. O que acontece quando o Microsoft 365 Copilot é implantado?",
    options: [
      "O Copilot ignora sites com permissões amplas por padrão",
      "O Copilot pode expor conteúdo desse site para qualquer usuário interno que faça perguntas relacionadas",
      "O Copilot só expõe conteúdo se o usuário pesquisar explicitamente por ele",
      "O SharePoint restringe automaticamente o site quando o Copilot é habilitado"
    ],
    correctIndex: 1,
    explanation: "O Microsoft 365 Copilot respeita as permissões existentes. Se um site concede acesso a 'Everyone except external users', qualquer usuário interno pode ter conteúdo desse site exposto através de consultas ao Copilot, mesmo que não soubesse que o conteúdo existia."
  },
  {
    question: "Qual ação deve ser tomada PRIMEIRO ao preparar uma implantação de Copilot do ponto de vista de segurança de dados?",
    options: [
      "Implantar rótulos de sensibilidade em todo o conteúdo",
      "Desabilitar todo o compartilhamento externo",
      "Executar uma avaliação DSPM for AI para identificar conteúdo supercompartilhado",
      "Revogar todas as permissões do SharePoint e reconstruir do zero"
    ],
    correctIndex: 2,
    explanation: "O primeiro passo é avaliar o estado atual usando o DSPM for AI para identificar onde existe supercompartilhamento. Isso fornece uma visão priorizada dos riscos antes de tomar ações de remediação como aplicar rótulos ou restringir permissões."
  },
  {
    question: "Como a aplicação de um rótulo de sensibilidade com criptografia afeta a capacidade do Microsoft 365 Copilot de expor esse conteúdo?",
    options: [
      "Conteúdo criptografado é completamente invisível para o Copilot independentemente das permissões",
      "O Copilot só pode expor conteúdo criptografado para usuários que têm direitos de descriptografia",
      "A criptografia não tem efeito no Copilot — ele sempre indexa todo o conteúdo",
      "O Copilot remove a criptografia antes de apresentar resultados aos usuários"
    ],
    correctIndex: 1,
    explanation: "Rótulos de sensibilidade com criptografia aplicam o acesso no nível do conteúdo. O Copilot respeita esses direitos — ele só exporá conteúdo criptografado para usuários que receberam direitos de descriptografia através das configurações de proteção do rótulo."
  }
]} />

## Limpeza

```powershell
# Remove test sensitivity labels and policies (if created in test environment)
Remove-AutoSensitivityLabelPolicy -Identity "Auto-Label-Financial-NoAI" -Confirm:$false
Remove-LabelPolicy -Identity "Publish-HC-NoAI-Label" -Confirm:$false
Remove-Label -Identity "HC-NoAI" -Confirm:$false

# Disconnect sessions
Disconnect-SPOService
Disconnect-MgGraph
Disconnect-ExchangeOnline

# Remove generated reports
Remove-Item "oversharing-report.csv" -ErrorAction SilentlyContinue
Remove-Item "copilot-readiness-report.json" -ErrorAction SilentlyContinue
```
