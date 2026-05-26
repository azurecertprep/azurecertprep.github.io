---
sidebar_position: 13
title: "Desafio 13: DDoS Protection & Recomendações de Segurança de Rede"
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

![Challenge 13 - Topologia de Rede](/img/az-700/challenge-13-topology.svg)


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
