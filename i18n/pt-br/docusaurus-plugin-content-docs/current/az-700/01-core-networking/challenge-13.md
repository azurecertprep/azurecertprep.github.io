---
sidebar_position: 13
title: "Desafio 13: DDoS Protection & Recomendações de Segurança de Rede"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 13: DDoS Protection e recomendaÃ§Ãµes de seguranÃ§a de rede

:::info Tempo e custo estimados

**60-90 minutos** | **~$0,50-1/hora** (DDoS IP Protection em um Ãºnico IP pÃºblico) | **Peso no exame: 10-15%**

:::

:::danger Aviso de custo

DDoS Network Protection custa **$2.944/mÃªs** (taxa fixa por plano). NÃƒO implante um plano DDoS Protection em uma assinatura de laboratÃ³rio. Este desafio usa **DDoS IP Protection** ($199/recurso/mÃªs) como alternativa acessÃ­vel e mostra comandos de Network Protection apenas para referÃªncia.

:::

## CenÃ¡rio

As aplicaÃ§Ãµes web voltadas ao pÃºblico da Contoso tÃªm sido alvo de ataques DDoS volumÃ©tricos que saturaram a largura de banda e esgotaram os recursos da aplicaÃ§Ã£o. A equipe de seguranÃ§a precisa avaliar as opÃ§Ãµes de proteÃ§Ã£o contra DDoS, configurar a proteÃ§Ã£o apropriada para IPs pÃºblicos, configurar monitoramento e alertas para detecÃ§Ã£o de ataques e usar o Microsoft Defender for Cloud para identificar lacunas adicionais de seguranÃ§a de rede no ambiente.

**Arquitetura:**

```text
Internet
    |
[Public IP: pip-web-frontend]  â†  DDoS IP Protection enabled
    |
[Application Gateway / Load Balancer]
    |
  VNet (10.0.0.0/16)
    â”œâ”€â”€ snet-frontend (10.0.1.0/24)
    â””â”€â”€ snet-backend  (10.0.2.0/24)
```

## Objetivos de aprendizagem

ApÃ³s concluir este desafio, vocÃª serÃ¡ capaz de:

- Comparar as camadas DDoS Infrastructure, IP Protection e Network Protection
- Criar um plano DDoS Protection (Network Protection) e associÃ¡-lo a uma VNet
- Habilitar DDoS IP Protection em um endereÃ§o IP pÃºblico especÃ­fico
- Configurar logs de diagnÃ³stico e alertas de mÃ©tricas para detecÃ§Ã£o de ataques DDoS
- Revisar recomendaÃ§Ãµes de seguranÃ§a de rede no Defender for Cloud Secure Score
- Usar o Azure Resource Graph para consultar avaliaÃ§Ãµes de seguranÃ§a para recursos de rede

## PrÃ©-requisitos

- Uma assinatura do Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- Um endereÃ§o IP pÃºblico com SKU Standard (necessÃ¡rio para recursos de proteÃ§Ã£o DDoS)
- Microsoft Defender for Cloud habilitado (a camada gratuita Ã© suficiente para avaliaÃ§Ãµes)

## Conceitos-chave para o AZ-700

| Conceito | Detalhe |
|----------|---------|
| DDoS Infrastructure Protection | Gratuito, sempre ativo, proteÃ§Ã£o bÃ¡sica L3/L4 para todos os IPs pÃºblicos do Azure |
| DDoS IP Protection | $199/recurso/mÃªs, por IP, inclui mÃ©tricas, alertas, relatÃ³rios de mitigaÃ§Ã£o |
| DDoS Network Protection | $2.944/mÃªs fixo, plano por VNet, adiciona proteÃ§Ã£o de custos, equipe DDoS Rapid Response, desconto em WAF |
| MÃ©tricas-chave | IfUnderDDoSAttack (0 ou 1), PacketsDroppedDDoS, BytesDroppedDDoS |
| Namespace de mÃ©tricas | Microsoft.Network/publicIPAddresses |
| Categorias de log de diagnÃ³stico | DDoSProtectionNotifications, DDoSMitigationFlowLogs, DDoSMitigationReports |
| Gatilho de mitigaÃ§Ã£o | AutomÃ¡tico; os limites sÃ£o aprendidos a partir dos padrÃµes normais de trÃ¡fego |
| Requisito de SKU Standard | DDoS IP Protection requer IPs pÃºblicos com SKU Standard (SKU Basic nÃ£o Ã© suportado) |

---

## Tarefa 1: Entender as camadas de proteÃ§Ã£o DDoS

Antes de implantar qualquer proteÃ§Ã£o, entenda as trÃªs camadas disponÃ­veis no Azure.

| Recurso | Infrastructure Protection | IP Protection | Network Protection |
|---------|--------------------------|---------------|-------------------|
| Custo | Gratuito | $199/recurso/mÃªs | $2.944/mÃªs (fixo) |
| Escopo | Todos os recursos do Azure | Por IP pÃºblico | Por VNet (todos os IPs na VNet) |
| MitigaÃ§Ã£o L3/L4 | Sim | Sim | Sim |
| MÃ©tricas e alertas DDoS | NÃ£o | Sim | Sim |
| Logs de fluxo de mitigaÃ§Ã£o | NÃ£o | Sim | Sim |
| RelatÃ³rios de mitigaÃ§Ã£o | NÃ£o | Sim | Sim |
| PolÃ­ticas de ajuste adaptativo | NÃ£o | Sim | Sim |
| ProteÃ§Ã£o de custos (crÃ©ditos de excedente) | NÃ£o | NÃ£o | Sim |
| Equipe DDoS Rapid Response (DRR) | NÃ£o | NÃ£o | Sim |
| Desconto em WAF | NÃ£o | NÃ£o | Sim |
| ProteÃ§Ã£o para atÃ© 100 IPs pÃºblicos | NÃ£o | NÃ£o (cobranÃ§a por IP) | Sim (incluso) |

:::tip Nota para o exame

O exame testa se vocÃª consegue identificar qual camada fornece um recurso especÃ­fico. Diferenciadores-chave: apenas Network Protection inclui garantias de proteÃ§Ã£o de custos e acesso Ã  equipe DDoS Rapid Response. IP Protection Ã© ideal para implantaÃ§Ãµes pequenas (menos de 15 IPs pÃºblicos, onde o custo por IP Ã© menor que a taxa fixa de Network Protection).

:::

---

## Tarefa 2: Criar um plano DDoS Protection (referÃªncia de Network Protection)

:::danger NÃƒO execute isto em uma assinatura de laboratÃ³rio

Os comandos a seguir criam um plano DDoS Network Protection que custa $2.944/mÃªs imediatamente apÃ³s a criaÃ§Ã£o. Esses comandos sÃ£o fornecidos apenas para referÃªncia de preparaÃ§Ã£o para o exame.

:::

### Etapa 1: Criar um plano DDoS Protection (apenas referÃªncia)

```bash
# REFERENCE ONLY â€” costs $2,944/month
az network ddos-protection create \
    --resource-group rg-ddos-lab \
    --name ddos-plan-contoso \
    --location eastus
```

### Etapa 2: Associar o plano a uma VNet (apenas referÃªncia)

```bash
# REFERENCE ONLY â€” associates the paid plan with a VNet
az network vnet update \
    --resource-group rg-ddos-lab \
    --name vnet-contoso \
    --ddos-protection-plan ddos-plan-contoso \
    --ddos-protection true
```

### Etapa 3: Verificar o status de proteÃ§Ã£o (apenas referÃªncia)

```bash
az network vnet show \
    --resource-group rg-ddos-lab \
    --name vnet-contoso \
    --query "{ddosPlan:ddosProtectionPlan.id, enabled:enableDdosProtection}" \
    --output table
```

### Etapa 4: Desabilitar DDoS Network Protection em uma VNet (apenas referÃªncia)

```bash
# Disassociate to stop billing
az network vnet update \
    --resource-group rg-ddos-lab \
    --name vnet-contoso \
    --ddos-protection false
```

---

## Tarefa 3: Habilitar DDoS IP Protection (adequado para laboratÃ³rio)

DDoS IP Protection Ã© a opÃ§Ã£o econÃ´mica para laboratÃ³rios. Ele fornece as mesmas mÃ©tricas, alertas e recursos de mitigaÃ§Ã£o que o Network Protection, mas Ã© cobrado por IP pÃºblico a $199/mÃªs.

### Etapa 1: Criar o grupo de recursos e a VNet

```bash
az group create \
    --name rg-ddos-lab \
    --location eastus

az network vnet create \
    --resource-group rg-ddos-lab \
    --name vnet-contoso \
    --location eastus \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name snet-frontend \
    --subnet-prefixes 10.0.1.0/24
```

### Etapa 2: Criar um IP pÃºblico com SKU Standard com DDoS IP Protection habilitado

```bash
az network public-ip create \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --location eastus \
    --allocation-method Static \
    --sku Standard \
    --ddos-protection-mode Enabled
```

:::note

O parÃ¢metro `--ddos-protection-mode` aceita trÃªs valores:
- **Enabled** â€” DDoS IP Protection estÃ¡ ativo neste IP pÃºblico ($199/mÃªs)
- **Disabled** â€” apenas Infrastructure Protection gratuito (padrÃ£o para novos IPs)
- **VirtualNetworkInherited** â€” herda a proteÃ§Ã£o de um plano DDoS Network Protection na VNet

:::

### Etapa 3: Habilitar DDoS IP Protection em um IP pÃºblico existente

Se vocÃª jÃ¡ possui um IP pÃºblico sem proteÃ§Ã£o DDoS:

```bash
az network public-ip update \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --ddos-protection-mode Enabled
```

### Etapa 4: Verificar o status de proteÃ§Ã£o DDoS

```bash
az network public-ip show \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --query "{name:name, ddosSettings:ddosSettings}" \
    --output json
```

A saÃ­da esperada deve mostrar `"protectionMode": "Enabled"` em `ddosSettings`.

### Etapa 5: Desabilitar DDoS IP Protection (para parar a cobranÃ§a)

```bash
az network public-ip update \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --ddos-protection-mode Disabled
```

---

## Tarefa 4: Configurar logs de diagnÃ³stico e alertas de mÃ©tricas

A proteÃ§Ã£o DDoS expÃµe telemetria por meio do Azure Monitor. VocÃª precisa de configuraÃ§Ãµes de diagnÃ³stico para capturar logs de ataque e alertas de mÃ©tricas para notificar sua equipe quando um ataque for detectado.

### Etapa 1: Criar um workspace do Log Analytics

```bash
az monitor log-analytics workspace create \
    --resource-group rg-ddos-lab \
    --workspace-name law-ddos-contoso \
    --location eastus
```

### Etapa 2: Obter o ID do recurso de IP pÃºblico

```bash
PIP_ID=$(az network public-ip show \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --query "id" \
    --output tsv)
```

### Etapa 3: Criar configuraÃ§Ãµes de diagnÃ³stico para logs DDoS

```bash
WORKSPACE_ID=$(az monitor log-analytics workspace show \
    --resource-group rg-ddos-lab \
    --workspace-name law-ddos-contoso \
    --query "id" \
    --output tsv)

az monitor diagnostic-settings create \
    --name diag-ddos-logs \
    --resource "$PIP_ID" \
    --workspace "$WORKSPACE_ID" \
    --logs '[
      {"category": "DDoSProtectionNotifications", "enabled": true},
      {"category": "DDoSMitigationFlowLogs", "enabled": true},
      {"category": "DDoSMitigationReports", "enabled": true}
    ]' \
    --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

:::note Categorias de log explicadas

- **DDoSProtectionNotifications** â€” alertas quando a mitigaÃ§Ã£o inicia e para (ataque detectado/resolvido)
- **DDoSMitigationFlowLogs** â€” detalhes por fluxo de pacotes descartados e encaminhados durante a mitigaÃ§Ã£o ativa
- **DDoSMitigationReports** â€” relatÃ³rios resumidos pÃ³s-ataque com estatÃ­sticas agregadas

:::

### Etapa 4: Verificar configuraÃ§Ãµes de diagnÃ³stico

```bash
az monitor diagnostic-settings list \
    --resource "$PIP_ID" \
    --output table
```

### Etapa 5: Criar um alerta de mÃ©trica para detecÃ§Ã£o de ataque DDoS

A mÃ©trica `IfUnderDDoSAttack` Ã© 1 quando um ataque estÃ¡ ativo e 0 caso contrÃ¡rio. Esta Ã© a mÃ©trica principal para alertas.

```bash
az monitor metrics alert create \
    --name alert-ddos-attack-detected \
    --resource-group rg-ddos-lab \
    --scopes "$PIP_ID" \
    --condition "max IfUnderDDoSAttack >= 1" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --severity 1 \
    --description "DDoS attack detected on pip-web-frontend"
```

### Etapa 6: Criar um alerta para pacotes descartados excedendo um limite

```bash
az monitor metrics alert create \
    --name alert-ddos-packets-dropped \
    --resource-group rg-ddos-lab \
    --scopes "$PIP_ID" \
    --condition "max PacketsDroppedDDoS > 1000" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --severity 2 \
    --description "High volume of packets dropped by DDoS mitigation"
```

:::tip Nota para o exame

As mÃ©tricas DDoS sÃ£o expostas no recurso de **endereÃ§o IP pÃºblico** (namespace `Microsoft.Network/publicIPAddresses`), nÃ£o no recurso de VNet ou plano DDoS. Este Ã© um erro comum na configuraÃ§Ã£o de alertas. Os nomes das mÃ©tricas incluem `IfUnderDDoSAttack`, `PacketsDroppedDDoS`, `BytesDroppedDDoS`, `PacketsForwardedDDoS` e variantes especÃ­ficas de protocolo (TCP, UDP).

:::

---

## Tarefa 5: Revisar recomendaÃ§Ãµes de seguranÃ§a de rede no Defender for Cloud

O Microsoft Defender for Cloud avalia continuamente seu ambiente em relaÃ§Ã£o Ã s melhores prÃ¡ticas de seguranÃ§a e produz recomendaÃ§Ãµes que afetam seu Secure Score.

### Etapa 1: Listar avaliaÃ§Ãµes de seguranÃ§a via Azure Resource Graph

A maneira mais eficaz de consultar recomendaÃ§Ãµes do Defender for Cloud programaticamente Ã© via Azure Resource Graph, que consulta a tabela `SecurityResources`:

```bash
az graph query -q "
  SecurityResources
  | where type == 'microsoft.security/assessments'
  | where properties.status.code == 'Unhealthy'
  | where properties.metadata.categories contains 'Networking'
  | project
      recommendationName=properties.displayName,
      severity=properties.metadata.severity,
      status=properties.status.code,
      resourceId=properties.resourceDetails.Id
  | order by severity asc
  | take 20
"
```

:::note

O comando `az graph` requer a extensÃ£o `resource-graph`. Instale-a com:

```bash
az extension add --name resource-graph
```

:::

### Etapa 2: Filtrar por recomendaÃ§Ãµes relacionadas a DDoS

```bash
az graph query -q "
  SecurityResources
  | where type == 'microsoft.security/assessments'
  | where properties.status.code == 'Unhealthy'
  | where properties.displayName contains 'DDoS'
  | project
      recommendationName=properties.displayName,
      severity=properties.metadata.severity,
      description=properties.metadata.description,
      resourceId=properties.resourceDetails.Id
"
```

RecomendaÃ§Ãµes comuns relacionadas a DDoS incluem:
- "Virtual networks should be protected by Azure DDoS Protection"
- "Public IP addresses should have DDoS protection enabled"

### Etapa 3: Consultar o Secure Score para a categoria de rede

```bash
az graph query -q "
  SecurityResources
  | where type == 'microsoft.security/securescores'
  | project
      subscriptionId,
      score=properties.score.current,
      maxScore=properties.score.max,
      percentage=properties.score.percentage
"
```

### Etapa 4: Identificar avaliaÃ§Ãµes de rede nÃ£o saudÃ¡veis com orientaÃ§Ã£o de remediaÃ§Ã£o

```bash
az graph query -q "
  SecurityResources
  | where type == 'microsoft.security/assessments'
  | where properties.status.code == 'Unhealthy'
  | where properties.metadata.categories contains 'Networking'
  | project
      recommendationName=properties.displayName,
      severity=properties.metadata.severity,
      remediation=properties.metadata.remediationDescription,
      implementationEffort=properties.metadata.implementationEffort
  | order by severity asc
  | take 10
"
```

:::tip Nota para o exame

Os **caminhos de ataque** do Defender for Cloud mostram cadeias de vulnerabilidades que um atacante poderia explorar para alcanÃ§ar recursos sensÃ­veis. Por exemplo: VM exposta Ã  internet com regra NSG aberta, executando software desatualizado, com acesso a uma conta de armazenamento contendo dados sensÃ­veis. Os caminhos de ataque sÃ£o visualizados no portal em Defender for Cloud > Attack path analysis. O acesso via CLI Ã© limitado; este Ã© principalmente um recurso baseado no portal testado conceitualmente no exame.

:::

---

## Tarefa 6: Usar o Security Explorer para identificar recursos de rede em risco

O Security Explorer (Cloud Security Explorer) no Defender for Cloud permite que vocÃª construa consultas baseadas em grafos para encontrar recursos que correspondam a condiÃ§Ãµes especÃ­ficas. Embora o Security Explorer completo seja baseado no portal, vocÃª pode replicar consultas comuns usando o Azure Resource Graph.

### Etapa 1: Encontrar IPs pÃºblicos sem proteÃ§Ã£o DDoS

```bash
az graph query -q "
  Resources
  | where type == 'microsoft.network/publicipaddresses'
  | where properties.ddosSettings.protectionMode != 'Enabled'
      and properties.ddosSettings.protectionMode != 'VirtualNetworkInherited'
  | project name, resourceGroup, location,
      sku=properties.sku.name,
      protectionMode=properties.ddosSettings.protectionMode
"
```

### Etapa 2: Encontrar NSGs com regras de entrada excessivamente permissivas (qualquer origem)

```bash
az graph query -q "
  Resources
  | where type == 'microsoft.network/networksecuritygroups'
  | mv-expand rules = properties.securityRules
  | where rules.properties.direction == 'Inbound'
      and rules.properties.access == 'Allow'
      and (rules.properties.sourceAddressPrefix == '*'
           or rules.properties.sourceAddressPrefix == 'Internet')
  | project nsgName=name, resourceGroup,
      ruleName=rules.properties.name,
      destinationPort=rules.properties.destinationPortRange,
      priority=rules.properties.priority
  | order by nsgName asc
"
```

### Etapa 3: Encontrar VNets sem DDoS Network Protection

```bash
az graph query -q "
  Resources
  | where type == 'microsoft.network/virtualnetworks'
  | where properties.enableDdosProtection == false
      or isnull(properties.enableDdosProtection)
  | project name, resourceGroup, location
"
```

### Etapa 4: Correlacionar IPs pÃºblicos com seus recursos vinculados

```bash
az graph query -q "
  Resources
  | where type == 'microsoft.network/publicipaddresses'
  | project name, resourceGroup,
      ipAddress=properties.ipAddress,
      attachedTo=properties.ipConfiguration.id,
      ddosMode=properties.ddosSettings.protectionMode
  | where isnotempty(attachedTo)
"
```

:::tip Nota para o exame

O **Cloud Security Explorer** no Defender for Cloud usa um modelo de grafos onde vocÃª pode consultar relacionamentos como "IP pÃºblico estÃ¡ exposto Ã  internet E estÃ¡ vinculado a uma VM E a VM possui vulnerabilidades de alta severidade." Isso Ã© diferente do Azure Resource Graph, que consulta metadados de recursos. O exame pode perguntar sobre cenÃ¡rios de consulta do Security Explorer conceitualmente, nÃ£o sobre sintaxe de consulta especÃ­fica.

:::

---

## CenÃ¡rios de quebra e correÃ§Ã£o

### CenÃ¡rio 1: IP pÃºblico sem proteÃ§Ã£o DDoS

**Sintoma:** Durante uma revisÃ£o de simulaÃ§Ã£o de ataque DDoS, a equipe descobre que o IP pÃºblico crÃ­tico do frontend nÃ£o possui mÃ©tricas DDoS disponÃ­veis e nenhuma telemetria de proteÃ§Ã£o.

**DiagnÃ³stico:**

```bash
az network public-ip show \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --query "ddosSettings"
```

Se `protectionMode` Ã© `null` ou `Disabled`, apenas a Infrastructure Protection gratuita estÃ¡ ativa. Nenhuma mÃ©trica ou log Ã© gerado.

**CorreÃ§Ã£o:**

```bash
az network public-ip update \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --ddos-protection-mode Enabled
```

### CenÃ¡rio 2: Regra de alerta usa namespace de mÃ©trica incorreto

**Sintoma:** O alerta DDoS nunca dispara mesmo durante trÃ¡fego de ataque confirmado. A regra de alerta foi criada, mas mostra "No data" no portal.

**Causa raiz:** O escopo do alerta aponta para o recurso de VNet ou plano DDoS em vez do endereÃ§o IP pÃºblico. As mÃ©tricas DDoS sÃ£o emitidas pelo recurso de IP pÃºblico, nÃ£o pela VNet.

**DiagnÃ³stico:**

```bash
az monitor metrics alert show \
    --name alert-ddos-attack-detected \
    --resource-group rg-ddos-lab \
    --query "scopes"
```

Se o escopo contÃ©m `/providers/Microsoft.Network/virtualNetworks/` ou `/providers/Microsoft.Network/ddosProtectionPlans/`, o alerta estÃ¡ apontando para o recurso errado.

**CorreÃ§Ã£o:** Exclua e recrie o alerta com o escopo correto (o ID do recurso de IP pÃºblico):

```bash
az monitor metrics alert delete \
    --name alert-ddos-attack-detected \
    --resource-group rg-ddos-lab

PIP_ID=$(az network public-ip show \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --query "id" --output tsv)

az monitor metrics alert create \
    --name alert-ddos-attack-detected \
    --resource-group rg-ddos-lab \
    --scopes "$PIP_ID" \
    --condition "max IfUnderDDoSAttack >= 1" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --severity 1 \
    --description "DDoS attack detected on pip-web-frontend"
```

### CenÃ¡rio 3: Logs de diagnÃ³stico DDoS nÃ£o aparecem no Log Analytics

**Sintoma:** ApÃ³s habilitar o DDoS IP Protection, a equipe configurou as configuraÃ§Ãµes de diagnÃ³stico, mas nenhum log aparece no workspace mesmo apÃ³s um ataque simulado.

**Causa raiz:** A configuraÃ§Ã£o de diagnÃ³stico usa nomes de categorias de log incorretos (erros de digitaÃ§Ã£o ou nomes de categorias desatualizados).

**DiagnÃ³stico:**

```bash
az monitor diagnostic-settings show \
    --name diag-ddos-logs \
    --resource "$PIP_ID" \
    --query "logs[].{category:category, enabled:enabled}"
```

Verifique se as categorias correspondem exatamente: `DDoSProtectionNotifications`, `DDoSMitigationFlowLogs`, `DDoSMitigationReports`. Erros comuns incluem usar `DDOSProtectionNotifications` (capitalizaÃ§Ã£o incorreta) ou `DDoSFlowLogs` (nome incorreto).

**CorreÃ§Ã£o:** Exclua e recrie com os nomes de categoria corretos:

```bash
az monitor diagnostic-settings delete \
    --name diag-ddos-logs \
    --resource "$PIP_ID"

az monitor diagnostic-settings create \
    --name diag-ddos-logs \
    --resource "$PIP_ID" \
    --workspace "$WORKSPACE_ID" \
    --logs '[
      {"category": "DDoSProtectionNotifications", "enabled": true},
      {"category": "DDoSMitigationFlowLogs", "enabled": true},
      {"category": "DDoSMitigationReports", "enabled": true}
    ]' \
    --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

---

## Limpeza

Remova todos os recursos criados neste desafio:

```bash
az group delete \
    --name rg-ddos-lab \
    --yes \
    --no-wait
```

:::warning

Se vocÃª habilitou o DDoS IP Protection e nÃ£o excluir o IP pÃºblico, continuarÃ¡ sendo cobrado $199/mÃªs por esse recurso. Verifique se a exclusÃ£o foi concluÃ­da:

```bash
az group show --name rg-ddos-lab 2>/dev/null || echo "Resource group deleted"
```

:::

---

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-13-q1",
    question: "Sua organização tem 5 endereços IP públicos que precisam de proteção DDoS com métricas e alertas. Qual camada de proteção DDoS é mais econômica?",
    options: [
      "DDoS Infrastructure Protection (camada gratuita)",
      "DDoS IP Protection a $199/recurso/mês",
      "DDoS Network Protection a $2.944/mês",
      "Azure Firewall Premium com DDoS integrado"
    ],
    correctIndex: 1,
    explanation: "DDoS IP Protection a $199/recurso/mês para 5 IPs custa $995/mês. DDoS Network Protection custa $2.944/mês fixos, independentemente do número de IPs. Como 5 x $199 = $995 < $2.944, o IP Protection é mais econômico. O ponto de equilíbrio é aproximadamente 15 IPs públicos ($199 x 15 = $2.985)."
  },
  {
    id: "az700-13-q2",
    question: "Em qual métrica você deve criar um alerta para detectar um ataque DDoS ativo contra um endereço IP público?",
    options: [
      "BytesInDDoS no recurso de VNet",
      "IfUnderDDoSAttack no recurso de IP público",
      "DDoSAttackActive no plano DDoS Protection",
      "NetworkSecurityGroupEvent no NSG"
    ],
    correctIndex: 1,
    explanation: "A métrica IfUnderDDoSAttack é emitida pelo recurso de endereço IP público (namespace Microsoft.Network/publicIPAddresses). Ela retorna 1 quando um ataque está sendo ativamente mitigado e 0 caso contrário. Métricas de DDoS não estão disponíveis em recursos de VNet ou plano DDoS."
  },
  {
    id: "az700-13-q3",
    question: "Você configurou as configurações de diagnóstico DDoS em um IP público, mas DDoSMitigationFlowLogs nunca aparecem no seu workspace do Log Analytics. O IP público tem DDoS IP Protection habilitado. Qual é o motivo mais provável?",
    options: [
      "O nome da categoria da configuração de diagnóstico tem um erro de digitação",
      "Os flow logs de mitigação são gerados apenas durante um ataque DDoS ativo",
      "DDoS IP Protection não suporta flow logs",
      "O Log Analytics não pode ingerir logs de DDoS diretamente"
    ],
    correctIndex: 1,
    explanation: "DDoSMitigationFlowLogs são gerados apenas quando a mitigação de DDoS está ocorrendo ativamente (durante um ataque). Se nenhum ataque ocorreu desde que as configurações de diagnóstico foram habilitadas, nenhum flow log será gerado. DDoSProtectionNotifications também só aparecem quando a mitigação inicia ou para. Este é o comportamento esperado, não uma configuração incorreta."
  },
  {
    id: "az700-13-q4",
    question: "Qual camada de proteção DDoS fornece acesso à equipe DDoS Rapid Response (DRR) e garantias de proteção de custos?",
    options: [
      "DDoS Infrastructure Protection",
      "DDoS IP Protection",
      "DDoS Network Protection",
      "Tanto IP Protection quanto Network Protection"
    ],
    correctIndex: 2,
    explanation: "Apenas o DDoS Network Protection ($2.944/mês) inclui acesso à equipe DDoS Rapid Response para assistência especializada durante ataques e proteção de custos (créditos para custos de scale-out de recursos incorridos durante um ataque DDoS). O DDoS IP Protection fornece métricas, alertas e relatórios de mitigação, mas não DRR ou proteção de custos."
  },
  {
    id: "az700-13-q5",
    question: "Você deseja habilitar a proteção DDoS em um endereço IP público existente usando Azure CLI. Qual comando é correto?",
    options: [
      "az network public-ip update --name pip-web --resource-group rg --ddos-protection true",
      "az network public-ip update --name pip-web --resource-group rg --ddos-protection-mode Enabled",
      "az network ddos-protection associate --public-ip pip-web --resource-group rg",
      "az network vnet update --name vnet --resource-group rg --ddos-protection-plan myPlan"
    ],
    correctIndex: 1,
    explanation: "O comando correto usa --ddos-protection-mode Enabled em az network public-ip update para habilitar DDoS IP Protection em um IP público existente. O flag --ddos-protection (sem -mode) é usado em az network vnet update para planos de Network Protection. Não existe um comando az network ddos-protection associate."
  },
  {
    id: "az700-13-q6",
    question: "No Microsoft Defender for Cloud, o que um 'attack path' representa?",
    options: [
      "A rota de rede que os pacotes percorrem da origem ao destino",
      "Uma cadeia de fraquezas de segurança que um atacante poderia explorar para alcançar um recurso sensível",
      "A linha do tempo histórica de um ataque DDoS detectado",
      "A lista de regras de firewall que o tráfego atravessa"
    ],
    correctIndex: 1,
    explanation: "Um attack path no Defender for Cloud representa uma cadeia de vulnerabilidades exploráveis e configurações incorretas que um atacante poderia usar para se mover de um ponto de entrada (como uma VM exposta à internet) até um alvo de alto valor (como um banco de dados ou conta de armazenamento com dados sensíveis). Os attack paths ajudam a priorizar remediação mostrando quais combinações de problemas criam o maior risco."
  }
]} />

---

## Recursos adicionais

- [Azure DDoS Protection overview](https://learn.microsoft.com/azure/ddos-protection/ddos-protection-overview)
- [Manage DDoS IP Protection - CLI](https://learn.microsoft.com/azure/ddos-protection/manage-ddos-ip-protection-cli)
- [Manage DDoS Network Protection - CLI](https://learn.microsoft.com/azure/ddos-protection/manage-ddos-protection-cli)
- [Azure DDoS Protection monitoring data reference](https://learn.microsoft.com/azure/ddos-protection/monitor-ddos-protection-reference)
- [Configure DDoS diagnostic logs](https://learn.microsoft.com/azure/ddos-protection/diagnostic-logging)
- [Defender for Cloud Secure Score](https://learn.microsoft.com/azure/defender-for-cloud/secure-score-security-controls)
- [Cloud Security Explorer](https://learn.microsoft.com/azure/defender-for-cloud/how-to-manage-cloud-security-explorer)
