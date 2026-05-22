---
sidebar_position: 13
title: "Challenge 13: DDoS Protection & Network Security Recommendations"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 13: DDoS Protection e recomendações de segurança de rede

:::info Tempo e custo estimados

**60-90 minutos** | **~$0,50-1/hora** (DDoS IP Protection em um único IP público) | **Peso no exame: 10-15%**

:::

:::danger Aviso de custo

DDoS Network Protection custa **$2.944/mês** (taxa fixa por plano). NÃO implante um plano DDoS Protection em uma assinatura de laboratório. Este desafio usa **DDoS IP Protection** ($199/recurso/mês) como alternativa acessível e mostra comandos de Network Protection apenas para referência.

:::

## Cenário

As aplicações web voltadas ao público da Contoso têm sido alvo de ataques DDoS volumétricos que saturaram a largura de banda e esgotaram os recursos da aplicação. A equipe de segurança precisa avaliar as opções de proteção contra DDoS, configurar a proteção apropriada para IPs públicos, configurar monitoramento e alertas para detecção de ataques e usar o Microsoft Defender for Cloud para identificar lacunas adicionais de segurança de rede no ambiente.

**Arquitetura:**

```
Internet
    |
[Public IP: pip-web-frontend]  ←  DDoS IP Protection enabled
    |
[Application Gateway / Load Balancer]
    |
  VNet (10.0.0.0/16)
    ├── snet-frontend (10.0.1.0/24)
    └── snet-backend  (10.0.2.0/24)
```

## Objetivos de aprendizagem

Após concluir este desafio, você será capaz de:

- Comparar as camadas DDoS Infrastructure, IP Protection e Network Protection
- Criar um plano DDoS Protection (Network Protection) e associá-lo a uma VNet
- Habilitar DDoS IP Protection em um endereço IP público específico
- Configurar logs de diagnóstico e alertas de métricas para detecção de ataques DDoS
- Revisar recomendações de segurança de rede no Defender for Cloud Secure Score
- Usar o Azure Resource Graph para consultar avaliações de segurança para recursos de rede

## Pré-requisitos

- Uma assinatura do Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- Um endereço IP público com SKU Standard (necessário para recursos de proteção DDoS)
- Microsoft Defender for Cloud habilitado (a camada gratuita é suficiente para avaliações)

## Conceitos-chave para o AZ-700

| Conceito | Detalhe |
|----------|---------|
| DDoS Infrastructure Protection | Gratuito, sempre ativo, proteção básica L3/L4 para todos os IPs públicos do Azure |
| DDoS IP Protection | $199/recurso/mês, por IP, inclui métricas, alertas, relatórios de mitigação |
| DDoS Network Protection | $2.944/mês fixo, plano por VNet, adiciona proteção de custos, equipe DDoS Rapid Response, desconto em WAF |
| Métricas-chave | IfUnderDDoSAttack (0 ou 1), PacketsDroppedDDoS, BytesDroppedDDoS |
| Namespace de métricas | Microsoft.Network/publicIPAddresses |
| Categorias de log de diagnóstico | DDoSProtectionNotifications, DDoSMitigationFlowLogs, DDoSMitigationReports |
| Gatilho de mitigação | Automático; os limites são aprendidos a partir dos padrões normais de tráfego |
| Requisito de SKU Standard | DDoS IP Protection requer IPs públicos com SKU Standard (SKU Basic não é suportado) |

---

## Tarefa 1: Entender as camadas de proteção DDoS

Antes de implantar qualquer proteção, entenda as três camadas disponíveis no Azure.

| Recurso | Infrastructure Protection | IP Protection | Network Protection |
|---------|--------------------------|---------------|-------------------|
| Custo | Gratuito | $199/recurso/mês | $2.944/mês (fixo) |
| Escopo | Todos os recursos do Azure | Por IP público | Por VNet (todos os IPs na VNet) |
| Mitigação L3/L4 | Sim | Sim | Sim |
| Métricas e alertas DDoS | Não | Sim | Sim |
| Logs de fluxo de mitigação | Não | Sim | Sim |
| Relatórios de mitigação | Não | Sim | Sim |
| Políticas de ajuste adaptativo | Não | Sim | Sim |
| Proteção de custos (créditos de excedente) | Não | Não | Sim |
| Equipe DDoS Rapid Response (DRR) | Não | Não | Sim |
| Desconto em WAF | Não | Não | Sim |
| Proteção para até 100 IPs públicos | Não | Não (cobrança por IP) | Sim (incluso) |

:::tip Nota para o exame

O exame testa se você consegue identificar qual camada fornece um recurso específico. Diferenciadores-chave: apenas Network Protection inclui garantias de proteção de custos e acesso à equipe DDoS Rapid Response. IP Protection é ideal para implantações pequenas (menos de 15 IPs públicos, onde o custo por IP é menor que a taxa fixa de Network Protection).

:::

---

## Tarefa 2: Criar um plano DDoS Protection (referência de Network Protection)

:::danger NÃO execute isto em uma assinatura de laboratório

Os comandos a seguir criam um plano DDoS Network Protection que custa $2.944/mês imediatamente após a criação. Esses comandos são fornecidos apenas para referência de preparação para o exame.

:::

### Etapa 1: Criar um plano DDoS Protection (apenas referência)

```bash
# REFERENCE ONLY — costs $2,944/month
az network ddos-protection create \
    --resource-group rg-ddos-lab \
    --name ddos-plan-contoso \
    --location eastus
```

### Etapa 2: Associar o plano a uma VNet (apenas referência)

```bash
# REFERENCE ONLY — associates the paid plan with a VNet
az network vnet update \
    --resource-group rg-ddos-lab \
    --name vnet-contoso \
    --ddos-protection-plan ddos-plan-contoso \
    --ddos-protection true
```

### Etapa 3: Verificar o status de proteção (apenas referência)

```bash
az network vnet show \
    --resource-group rg-ddos-lab \
    --name vnet-contoso \
    --query "{ddosPlan:ddosProtectionPlan.id, enabled:enableDdosProtection}" \
    --output table
```

### Etapa 4: Desabilitar DDoS Network Protection em uma VNet (apenas referência)

```bash
# Disassociate to stop billing
az network vnet update \
    --resource-group rg-ddos-lab \
    --name vnet-contoso \
    --ddos-protection false
```

---

## Tarefa 3: Habilitar DDoS IP Protection (adequado para laboratório)

DDoS IP Protection é a opção econômica para laboratórios. Ele fornece as mesmas métricas, alertas e recursos de mitigação que o Network Protection, mas é cobrado por IP público a $199/mês.

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

### Etapa 2: Criar um IP público com SKU Standard com DDoS IP Protection habilitado

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

O parâmetro `--ddos-protection-mode` aceita três valores:
- **Enabled** — DDoS IP Protection está ativo neste IP público ($199/mês)
- **Disabled** — apenas Infrastructure Protection gratuito (padrão para novos IPs)
- **VirtualNetworkInherited** — herda a proteção de um plano DDoS Network Protection na VNet

:::

### Etapa 3: Habilitar DDoS IP Protection em um IP público existente

Se você já possui um IP público sem proteção DDoS:

```bash
az network public-ip update \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --ddos-protection-mode Enabled
```

### Etapa 4: Verificar o status de proteção DDoS

```bash
az network public-ip show \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --query "{name:name, ddosSettings:ddosSettings}" \
    --output json
```

A saída esperada deve mostrar `"protectionMode": "Enabled"` em `ddosSettings`.

### Etapa 5: Desabilitar DDoS IP Protection (para parar a cobrança)

```bash
az network public-ip update \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --ddos-protection-mode Disabled
```

---

## Tarefa 4: Configurar logs de diagnóstico e alertas de métricas

A proteção DDoS expõe telemetria por meio do Azure Monitor. Você precisa de configurações de diagnóstico para capturar logs de ataque e alertas de métricas para notificar sua equipe quando um ataque for detectado.

### Etapa 1: Criar um workspace do Log Analytics

```bash
az monitor log-analytics workspace create \
    --resource-group rg-ddos-lab \
    --workspace-name law-ddos-contoso \
    --location eastus
```

### Etapa 2: Obter o ID do recurso de IP público

```bash
PIP_ID=$(az network public-ip show \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --query "id" \
    --output tsv)
```

### Etapa 3: Criar configurações de diagnóstico para logs DDoS

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

- **DDoSProtectionNotifications** — alertas quando a mitigação inicia e para (ataque detectado/resolvido)
- **DDoSMitigationFlowLogs** — detalhes por fluxo de pacotes descartados e encaminhados durante a mitigação ativa
- **DDoSMitigationReports** — relatórios resumidos pós-ataque com estatísticas agregadas

:::

### Etapa 4: Verificar configurações de diagnóstico

```bash
az monitor diagnostic-settings list \
    --resource "$PIP_ID" \
    --output table
```

### Etapa 5: Criar um alerta de métrica para detecção de ataque DDoS

A métrica `IfUnderDDoSAttack` é 1 quando um ataque está ativo e 0 caso contrário. Esta é a métrica principal para alertas.

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

As métricas DDoS são expostas no recurso de **endereço IP público** (namespace `Microsoft.Network/publicIPAddresses`), não no recurso de VNet ou plano DDoS. Este é um erro comum na configuração de alertas. Os nomes das métricas incluem `IfUnderDDoSAttack`, `PacketsDroppedDDoS`, `BytesDroppedDDoS`, `PacketsForwardedDDoS` e variantes específicas de protocolo (TCP, UDP).

:::

---

## Tarefa 5: Revisar recomendações de segurança de rede no Defender for Cloud

O Microsoft Defender for Cloud avalia continuamente seu ambiente em relação às melhores práticas de segurança e produz recomendações que afetam seu Secure Score.

### Etapa 1: Listar avaliações de segurança via Azure Resource Graph

A maneira mais eficaz de consultar recomendações do Defender for Cloud programaticamente é via Azure Resource Graph, que consulta a tabela `SecurityResources`:

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

O comando `az graph` requer a extensão `resource-graph`. Instale-a com:

```bash
az extension add --name resource-graph
```

:::

### Etapa 2: Filtrar por recomendações relacionadas a DDoS

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

Recomendações comuns relacionadas a DDoS incluem:
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

### Etapa 4: Identificar avaliações de rede não saudáveis com orientação de remediação

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

Os **caminhos de ataque** do Defender for Cloud mostram cadeias de vulnerabilidades que um atacante poderia explorar para alcançar recursos sensíveis. Por exemplo: VM exposta à internet com regra NSG aberta, executando software desatualizado, com acesso a uma conta de armazenamento contendo dados sensíveis. Os caminhos de ataque são visualizados no portal em Defender for Cloud > Attack path analysis. O acesso via CLI é limitado; este é principalmente um recurso baseado no portal testado conceitualmente no exame.

:::

---

## Tarefa 6: Usar o Security Explorer para identificar recursos de rede em risco

O Security Explorer (Cloud Security Explorer) no Defender for Cloud permite que você construa consultas baseadas em grafos para encontrar recursos que correspondam a condições específicas. Embora o Security Explorer completo seja baseado no portal, você pode replicar consultas comuns usando o Azure Resource Graph.

### Etapa 1: Encontrar IPs públicos sem proteção DDoS

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

### Etapa 4: Correlacionar IPs públicos com seus recursos vinculados

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

O **Cloud Security Explorer** no Defender for Cloud usa um modelo de grafos onde você pode consultar relacionamentos como "IP público está exposto à internet E está vinculado a uma VM E a VM possui vulnerabilidades de alta severidade." Isso é diferente do Azure Resource Graph, que consulta metadados de recursos. O exame pode perguntar sobre cenários de consulta do Security Explorer conceitualmente, não sobre sintaxe de consulta específica.

:::

---

## Cenários de quebra e correção

### Cenário 1: IP público sem proteção DDoS

**Sintoma:** Durante uma revisão de simulação de ataque DDoS, a equipe descobre que o IP público crítico do frontend não possui métricas DDoS disponíveis e nenhuma telemetria de proteção.

**Diagnóstico:**

```bash
az network public-ip show \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --query "ddosSettings"
```

Se `protectionMode` é `null` ou `Disabled`, apenas a Infrastructure Protection gratuita está ativa. Nenhuma métrica ou log é gerado.

**Correção:**

```bash
az network public-ip update \
    --resource-group rg-ddos-lab \
    --name pip-web-frontend \
    --ddos-protection-mode Enabled
```

### Cenário 2: Regra de alerta usa namespace de métrica incorreto

**Sintoma:** O alerta DDoS nunca dispara mesmo durante tráfego de ataque confirmado. A regra de alerta foi criada, mas mostra "No data" no portal.

**Causa raiz:** O escopo do alerta aponta para o recurso de VNet ou plano DDoS em vez do endereço IP público. As métricas DDoS são emitidas pelo recurso de IP público, não pela VNet.

**Diagnóstico:**

```bash
az monitor metrics alert show \
    --name alert-ddos-attack-detected \
    --resource-group rg-ddos-lab \
    --query "scopes"
```

Se o escopo contém `/providers/Microsoft.Network/virtualNetworks/` ou `/providers/Microsoft.Network/ddosProtectionPlans/`, o alerta está apontando para o recurso errado.

**Correção:** Exclua e recrie o alerta com o escopo correto (o ID do recurso de IP público):

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

### Cenário 3: Logs de diagnóstico DDoS não aparecem no Log Analytics

**Sintoma:** Após habilitar o DDoS IP Protection, a equipe configurou as configurações de diagnóstico, mas nenhum log aparece no workspace mesmo após um ataque simulado.

**Causa raiz:** A configuração de diagnóstico usa nomes de categorias de log incorretos (erros de digitação ou nomes de categorias desatualizados).

**Diagnóstico:**

```bash
az monitor diagnostic-settings show \
    --name diag-ddos-logs \
    --resource "$PIP_ID" \
    --query "logs[].{category:category, enabled:enabled}"
```

Verifique se as categorias correspondem exatamente: `DDoSProtectionNotifications`, `DDoSMitigationFlowLogs`, `DDoSMitigationReports`. Erros comuns incluem usar `DDOSProtectionNotifications` (capitalização incorreta) ou `DDoSFlowLogs` (nome incorreto).

**Correção:** Exclua e recrie com os nomes de categoria corretos:

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

Se você habilitou o DDoS IP Protection e não excluir o IP público, continuará sendo cobrado $199/mês por esse recurso. Verifique se a exclusão foi concluída:

```bash
az group show --name rg-ddos-lab 2>/dev/null || echo "Resource group deleted"
```

:::

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-13-q1",
    question: "Your organization has 5 public IP addresses that need DDoS protection with metrics and alerting. Which DDoS protection tier is most cost-effective?",
    options: [
      "DDoS Infrastructure Protection (free tier)",
      "DDoS IP Protection at $199/resource/month",
      "DDoS Network Protection at $2,944/month",
      "Azure Firewall Premium with DDoS built-in"
    ],
    correctIndex: 1,
    explanation: "DDoS IP Protection at $199/resource/month for 5 IPs costs $995/month. DDoS Network Protection costs $2,944/month flat regardless of the number of IPs. Since 5 x $199 = $995 < $2,944, IP Protection is more cost-effective. The break-even point is approximately 15 public IPs ($199 x 15 = $2,985)."
  },
  {
    id: "az700-13-q2",
    question: "Which metric should you alert on to detect an active DDoS attack against a public IP address?",
    options: [
      "BytesInDDoS on the VNet resource",
      "IfUnderDDoSAttack on the public IP resource",
      "DDoSAttackActive on the DDoS Protection plan",
      "NetworkSecurityGroupEvent on the NSG"
    ],
    correctIndex: 1,
    explanation: "The IfUnderDDoSAttack metric is emitted by the public IP address resource (namespace Microsoft.Network/publicIPAddresses). It returns 1 when an attack is actively being mitigated and 0 otherwise. DDoS metrics are not available on VNet or DDoS plan resources."
  },
  {
    id: "az700-13-q3",
    question: "You configured DDoS diagnostic settings on a public IP, but DDoSMitigationFlowLogs never appear in your Log Analytics workspace. The public IP has DDoS IP Protection enabled. What is the most likely reason?",
    options: [
      "The diagnostic setting category name has a typo",
      "Mitigation flow logs are only generated during an active DDoS attack",
      "DDoS IP Protection does not support flow logs",
      "Log Analytics cannot ingest DDoS logs directly"
    ],
    correctIndex: 1,
    explanation: "DDoSMitigationFlowLogs are only generated when DDoS mitigation is actively occurring (during an attack). If no attack has occurred since enabling diagnostic settings, no flow logs will be generated. DDoSProtectionNotifications also only appear when mitigation starts or stops. This is expected behavior, not a misconfiguration."
  },
  {
    id: "az700-13-q4",
    question: "Which DDoS protection tier provides access to the DDoS Rapid Response (DRR) team and cost protection guarantees?",
    options: [
      "DDoS Infrastructure Protection",
      "DDoS IP Protection",
      "DDoS Network Protection",
      "Both IP Protection and Network Protection"
    ],
    correctIndex: 2,
    explanation: "Only DDoS Network Protection ($2,944/month) includes access to the DDoS Rapid Response team for expert assistance during attacks and cost protection (credits for resource scale-out costs incurred during a DDoS attack). DDoS IP Protection provides metrics, alerts, and mitigation reports but not DRR or cost protection."
  },
  {
    id: "az700-13-q5",
    question: "You want to enable DDoS protection on an existing public IP address using Azure CLI. Which command is correct?",
    options: [
      "az network public-ip update --name pip-web --resource-group rg --ddos-protection true",
      "az network public-ip update --name pip-web --resource-group rg --ddos-protection-mode Enabled",
      "az network ddos-protection associate --public-ip pip-web --resource-group rg",
      "az network vnet update --name vnet --resource-group rg --ddos-protection-plan myPlan"
    ],
    correctIndex: 1,
    explanation: "The correct command uses --ddos-protection-mode Enabled on az network public-ip update to enable DDoS IP Protection on an existing public IP. The --ddos-protection flag (without -mode) is used on az network vnet update for Network Protection plans. There is no az network ddos-protection associate command."
  },
  {
    id: "az700-13-q6",
    question: "In Microsoft Defender for Cloud, what does an 'attack path' represent?",
    options: [
      "The network route packets take from source to destination",
      "A chain of security weaknesses an attacker could exploit to reach a sensitive resource",
      "The historical timeline of a detected DDoS attack",
      "The list of firewall rules traffic traverses"
    ],
    correctIndex: 1,
    explanation: "An attack path in Defender for Cloud represents a chain of exploitable vulnerabilities and misconfigurations that an attacker could use to move from an entry point (such as an internet-exposed VM) to a high-value target (such as a database or storage account with sensitive data). Attack paths help prioritize remediation by showing which combinations of issues create the highest risk."
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
