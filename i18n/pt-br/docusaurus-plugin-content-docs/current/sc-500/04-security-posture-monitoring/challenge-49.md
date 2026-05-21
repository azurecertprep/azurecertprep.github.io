---
sidebar_position: 49
title: "Desafio 49: Security Copilot – Microsoft Agents e Security Store"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 49: Security Copilot – Microsoft Agents e Security Store

## Habilidades do exame cobertas

- Habilitar e configurar agentes de segurança Microsoft integrados
- Configurar agentes e soluções personalizadas do Security Store
- Criar promptbooks personalizados para fluxos de trabalho de investigação
- Configurar políticas de orquestração de agentes e guardrails
- Gerenciar permissões de agentes e limites de acesso a dados

## Cenário

A Contoso Ltd quer aproveitar os agentes autônomos do Security Copilot para reduzir a carga de trabalho do SOC. A equipe de segurança lida com mais de 500 alertas de phishing diariamente e precisa de triagem automatizada. Além disso, a equipe de gerenciamento de vulnerabilidades gasta tempo excessivo priorizando patches. Você deve habilitar os agentes integrados, configurar promptbooks personalizados para fluxos de trabalho especializados e definir políticas de orquestração que garantam que os agentes operem dentro dos limites aprovados.

---

## Pré-requisitos

- 🔒 **Licença necessária**: Unidades de computação do Security Copilot (SCU) provisionadas e ativas
- Workspace do Security Copilot configurado (do Desafio 48)
- Workspace do Microsoft Sentinel com incidentes ativos
- Microsoft Defender XDR com alertas fluindo
- Microsoft Defender Vulnerability Management habilitado
- Função Copilot Owner no Security Copilot
- Função Security Administrator no Entra ID

---

## Tarefa 1: Habilitar o Phishing Triage Agent

Configure o agente integrado de triagem de phishing para analisar e classificar automaticamente alertas de phishing.

**Passos no Portal:**

1. Navegue até [Security Copilot](https://securitycopilot.microsoft.com)
2. Vá para **Settings** → **Agents** → **Microsoft agents**
3. Localize **Phishing Triage Agent** e clique em **Configure**
4. Habilite o agente com as seguintes configurações:

| Configuração | Valor |
|---------|-------|
| Status | Enabled |
| Data sources | Microsoft Defender XDR, Exchange Online |
| Auto-classify confidence threshold | High (90%+) |
| Actions on high-confidence phishing | Move to quarantine, notify user |
| Actions on suspicious (medium confidence) | Flag for analyst review |
| Actions on benign (low threat) | Close alert, no action |
| Working hours | 24/7 |
| Maximum alerts per hour | 100 |

5. Configure os critérios de triagem:

| Critério | Peso |
|----------|--------|
| Domínios de remetentes maliciosos conhecidos | Alto |
| Reputação de URL (VirusTotal, Microsoft) | Alto |
| Análise de anexos (detonação) | Alto |
| Detecção de personificação | Médio |
| Falhas de SPF/DKIM/DMARC | Médio |
| Relatado pelo usuário vs. detecção automatizada | Baixo |

6. Defina as regras de escalonamento:

| Condição | Ação |
|-----------|--------|
| Alvo VIP (C-suite, financeiro) | Notificação imediata ao analista |
| Indicadores de business email compromise | Escalonar para Nível 2 |
| Link de coleta de credenciais detectado | Bloquear domínio do remetente, escalonar |
| Confiança do agente < 60% | Encaminhar para analista humano |

7. Clique em **Save and activate**

**Verifique a operação do agente:**

1. Navegue até **Security Copilot** → **Agent activity**
2. Confirme que o agente de phishing mostra status: **Active**
3. Revise as decisões recentes de triagem no log do agente
4. Verifique a redução no volume de alertas na fila de alertas do Defender XDR

---

## Tarefa 2: Habilitar o Alert Triage Agent

Configure o agente de triagem de alertas para alertas de segurança não relacionados a phishing do Defender XDR.

**Passos no Portal:**

1. Navegue até **Settings** → **Agents** → **Microsoft agents**
2. Localize **Alert Triage Agent** e clique em **Configure**
3. Habilite com as configurações:

| Configuração | Valor |
|---------|-------|
| Status | Enabled |
| Scope | All Defender XDR alerts (excluding email) |
| Auto-resolve true positives | No (flag for review) |
| Auto-close false positives | Yes (confidence > 95%) |
| Enrichment sources | Sentinel, Entra ID, Threat Intelligence |
| Incident correlation | Enabled |

4. Configure as categorias de alertas e o tratamento:

| Categoria de Alerta | Ação do Agente |
|---------------|-------------|
| Detecção de malware (endpoint) | Enriquecer com contexto do dispositivo, verificar movimento lateral |
| Execução de processo suspeito | Correlacionar com MITRE ATT&CK, verificar outros endpoints |
| Viagem impossível | Verificar com logs de sign-in do Entra, checar uso de VPN |
| Acesso anômalo a recursos Azure | Verificar atribuições de função, validar autorização |
| Tentativas de acesso a credenciais | Correlacionar com proteção de identidade, verificar status de MFA |

5. Configure os prompts de enriquecimento que o agente usa internamente:

```text
Enrichment 1: "What is the risk score and recent activity for the user associated with this alert?"
Enrichment 2: "Are there related alerts from the same entity in the last 48 hours?"
Enrichment 3: "What MITRE ATT&CK stage does this alert represent and what is the typical next stage?"
Enrichment 4: "Is the affected device compliant with Intune policies?"
```

6. Defina o formato de saída:

| Campo | Descrição |
|-------|-------------|
| Veredicto de triagem | True positive / False positive / Needs review |
| Score de confiança | 0-100% |
| Resumo de enriquecimento | Contexto principal coletado pelo agente |
| Ação recomendada | Próximos passos sugeridos para o analista |
| Incidentes relacionados | Links para incidentes correlacionados |

7. Clique em **Save and activate**

---

## Tarefa 3: Habilitar o Vulnerability Remediation Agent

Configure o agente para priorizar e recomendar remediação para vulnerabilidades descobertas.

**Passos no Portal:**

1. Navegue até **Settings** → **Agents** → **Microsoft agents**
2. Localize **Vulnerability Remediation Agent** e clique em **Configure**
3. Habilite com as configurações:

| Configuração | Valor |
|---------|-------|
| Status | Enabled |
| Data source | Microsoft Defender Vulnerability Management |
| Prioritization model | Risk-based (EPSS + asset criticality) |
| Remediation recommendations | Enabled |
| Patch scheduling suggestions | Enabled |
| Compensating control recommendations | Enabled |

4. Configure o mapeamento de criticidade de ativos:

| Grupo de Ativos | Criticidade | SLA para CVEs Críticos |
|-------------|-------------|----------------------|
| Domain Controllers | Crítica | 24 horas |
| Servidores web públicos | Alta | 48 horas |
| Servidores de banco de dados | Alta | 48 horas |
| Estações de trabalho de desenvolvedores | Média | 7 dias |
| Endpoints gerais | Baixa | 14 dias |

5. Configure a saída do agente:

```text
For each vulnerability, the agent provides:
- CVE ID and description
- EPSS score (probability of exploitation)
- Affected assets with criticality ratings
- Available patches or workarounds
- Compensating controls if patching isn't immediate
- Recommended remediation timeline based on SLA
- Impact assessment if vulnerability is exploited
```

6. Defina as regras de notificação:

| Condição | Ação |
|-----------|--------|
| Adição ao CISA KEV | Notificação imediata aos líderes de segurança |
| EPSS > 0.9 em ativo crítico | Ticket de remediação de alta prioridade |
| Zero-day com exploração ativa | Solicitação de mudança emergencial |
| Patch disponível para vulnerabilidade antiga | Lembrete ao responsável pelo patch |

7. Clique em **Save and activate**

---

## Tarefa 4: Configurar agentes e soluções personalizadas do Security Store

Navegue e instale agentes adicionais do Security Store.

**Passos no Portal:**

1. Navegue até **Security Copilot** → **Security Store**
2. Explore os agentes e soluções disponíveis
3. Instale os seguintes agentes de comunidade/parceiros:

### Threat Intelligence Enrichment Agent

1. Encontre **"Threat Intelligence Enrichment"** no Security Store
2. Clique em **Install**
3. Configure:

| Configuração | Valor |
|---------|-------|
| TI feeds | Microsoft TI, CIRCL, AlienVault OTX |
| Auto-enrich indicators | Enabled |
| IOC aging policy | 90 days |
| Confidence threshold for blocking | 80% |

4. Clique em **Activate**

### Compliance Posture Agent

1. Encontre **"Compliance Posture Monitor"** no Security Store
2. Clique em **Install**
3. Configure:

| Configuração | Valor |
|---------|-------|
| Frameworks | NIST 800-53, CIS Benchmarks, ISO 27001 |
| Scan frequency | Daily |
| Drift alerting | Enabled |
| Auto-remediation | Disabled (recommend only) |

4. Clique em **Activate**

**Gerenciando agentes instalados:**

1. Navegue até **Settings** → **Agents** → **Installed agents**
2. Revise de cada agente:
   - Log de atividade (prompts processados, ações tomadas)
   - Taxa de erros e operações com falha
   - Consumo de capacidade (uso de SCU)
   - Trilha de auditoria de acesso a dados

---

## Tarefa 5: Criar promptbooks personalizados para fluxos de trabalho orientados por agentes

Projete promptbooks que aproveitam agentes para cenários complexos de investigação.

**Passos no Portal:**

1. Navegue até **Security Copilot** → **Promptbook library**
2. Clique em **+ Create promptbook**

### Promptbook: Resposta Automatizada a Incidentes

| Configuração | Valor |
|---------|-------|
| Name | Agent-Driven Incident Response |
| Description | End-to-end incident investigation using agents and manual steps |
| Trigger | Manual or agent-initiated |
| Sharing | SOC-Leads and SOC-Analysts-Tier1 |

3. Adicione os prompts:

```text
Prompt 1 (Agent: Alert Triage): 
"Analyze incident {incident_id} and provide a triage verdict with enrichment context from all available sources"

Prompt 2 (Agent: Threat Intelligence): 
"Enrich all indicators of compromise found in incident {incident_id} with threat intelligence from all configured feeds"

Prompt 3 (Copilot): 
"Based on the triage and threat intelligence enrichment, what is the kill chain stage and what are the likely next attacker actions?"

Prompt 4 (Copilot): 
"Generate containment recommendations for this incident. Include immediate actions and long-term remediation"

Prompt 5 (Agent: Compliance Posture): 
"What compliance controls failed that allowed this incident? Recommend control improvements"

Prompt 6 (Copilot): 
"Create a complete incident report for incident {incident_id} including timeline, impact assessment, root cause, and lessons learned"
```

4. Configure os parâmetros de entrada:
   - `{incident_id}` — Type: String, Required: Yes
5. Clique em **Save promptbook**

### Promptbook: Revisão Semanal de Vulnerabilidades

| Configuração | Valor |
|---------|-------|
| Name | Weekly Vulnerability Prioritization |
| Description | Agent-driven vulnerability assessment for weekly patch review |
| Trigger | Scheduled (Every Monday 08:00 UTC) |
| Sharing | Security-Operations group |

6. Adicione os prompts:

```text
Prompt 1 (Agent: Vulnerability Remediation): 
"List all new vulnerabilities discovered in the last 7 days, sorted by risk score (EPSS × asset criticality)"

Prompt 2 (Agent: Threat Intelligence): 
"Are any of the top 20 vulnerabilities being actively exploited in the wild? Check CISA KEV and exploit databases"

Prompt 3 (Copilot): 
"Create a prioritized patch deployment plan for this week based on risk scores, active exploitation, and asset criticality"

Prompt 4 (Copilot): 
"For vulnerabilities that cannot be patched immediately, recommend compensating controls"

Prompt 5 (Copilot): 
"Generate a weekly vulnerability report suitable for the CISO including risk trends, patch compliance metrics, and recommendations"
```

7. Clique em **Save promptbook**

---

## Tarefa 6: Configurar políticas de orquestração de agentes

Defina guardrails e políticas que governam como os agentes operam.

**Passos no Portal:**

1. Navegue até **Security Copilot** → **Settings** → **Agent policies**
2. Crie uma política de orquestração:

| Configuração | Valor |
|---------|-------|
| Policy name | Contoso Agent Guardrails |
| Scope | All agents |
| Priority | High |

3. Configure os limites:

**Limites de ações:**

| Tipo de Ação | Política |
|-------------|--------|
| Leitura de dados | Permitido - todas as fontes conectadas |
| Modificar status de alerta | Permitido - com registro de auditoria |
| Quarentena de e-mail | Permitido - apenas agente de phishing |
| Isolar dispositivo | Requer aprovação humana |
| Desabilitar conta de usuário | Requer aprovação humana |
| Bloquear IP/domínio | Requer aprovação humana |
| Excluir dados | Proibido |

**Limites de acesso a dados:**

| Categoria de Dados | Nível de Acesso |
|--------------|-------------|
| Alertas e incidentes de segurança | Acesso total |
| Logs de sign-in de usuários | Acesso total |
| Conteúdo de e-mail | Somente metadados (sem corpo) |
| Conteúdo de arquivos | Somente hash e metadados |
| Dados de RH/pessoal | Proibido |
| Sistemas financeiros | Proibido |

**Limites operacionais:**

| Limite | Valor |
|-------|-------|
| Máx. de ações por hora por agente | 200 |
| Máx. de consumo de SCU por agente por hora | 1 SCU |
| Timeout de escalonamento | 15 minutos |
| Limite de tentativas em falhas | 3 |
| Threshold de circuit breaker | 10 falhas consecutivas |

4. Clique em **Save policy**

5. Configure o roteamento de alertas:

| Tipo de Alerta | Agente Primário | Fallback |
|------------|--------------|----------|
| Phishing/ameaças por e-mail | Phishing Triage Agent | Alert Triage Agent |
| Alertas de endpoint | Alert Triage Agent | Analista humano |
| Alertas de identidade | Alert Triage Agent | Analista humano |
| Alertas de recursos em nuvem | Alert Triage Agent | Analista humano |
| Achados de vulnerabilidade | Vulnerability Agent | Analista humano |

6. Clique em **Save routing configuration**

---

## Quebre & Conserte

### Cenário 1: Agente de phishing colocando em quarentena e-mails legítimos em excesso

O agente de triagem de phishing colocou em quarentena vários e-mails legítimos de um novo parceiro de negócios, causando interrupção nas operações.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** O domínio do novo parceiro foi registrado recentemente e possui scores de reputação baixos, acionando o threshold de confiança do agente.

**Correção:**
1. Navegue até **Settings** → **Agents** → **Phishing Triage Agent** → **Configuration**
2. Adicione o domínio do parceiro à **Allow list**:
   - Domain: `newpartner.com`
   - Reason: "Verified business partner - approved by IT security"
   - Expiration: 90 days (review periodically)
3. Ajuste o threshold de confiança para idade do domínio:
   - Reduza o peso de "recently registered domain" de High para Medium
4. Revise e libere os e-mails em quarentena:
   - Vá para Defender XDR → **Email & collaboration** → **Quarantine**
   - Libere os e-mails legítimos e marque como "not junk"
5. Monitore as decisões do agente para o domínio do parceiro nas próximas 24 horas

</details>

### Cenário 2: Esgotamento de capacidade dos agentes durante pico de incidentes

Durante um incidente de segurança grave, todos os agentes param de responder e os analistas veem erros de "capacity unavailable".

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** O incidente gerou centenas de alertas simultaneamente, esgotando a capacidade de SCU alocada para todos os agentes.

**Correção:**
1. **Imediato:** Navegue até **Settings** → **Capacity management**
   - Aumente a alocação de SCU temporariamente (ex.: de 3 para 8 SCUs)
2. **Curto prazo:** Ajuste os limites operacionais dos agentes:
   - Reduza o máximo de alertas por hora do agente de phishing durante o incidente
   - Pause o agente de vulnerabilidades (não urgente durante incidente ativo)
   - Priorize a capacidade do agente de triagem de alertas
3. **Longo prazo:** Configure a prioridade dos agentes durante contenção de capacidade:
   - Navegue até **Settings** → **Agent policies** → **Priority**
   - Defina: Alert Triage Agent = Prioridade 1, Phishing Agent = Prioridade 2, Outros = Prioridade 3
   - Habilite "capacity reservation" para agentes de Prioridade 1 (reserve no mínimo 1 SCU)

</details>

### Cenário 3: Promptbook personalizado retorna resultados inconsistentes

O promptbook de revisão semanal de vulnerabilidades às vezes retorna priorizações diferentes para os mesmos dados.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** Os prompts usam linguagem ambígua, e o LLM interpreta "risk score" de forma diferente entre as execuções.

**Correção:**
1. Navegue até **Promptbook library** → Edite o promptbook semanal de vulnerabilidades
2. Torne os prompts mais determinísticos:

```text
# Before (ambiguous):
"List vulnerabilities sorted by risk score"

# After (specific):
"List all new vulnerabilities discovered between {start_date} and {end_date}. 
Sort by: EPSS score × Asset Criticality Score (Critical=4, High=3, Medium=2, Low=1). 
Output as a table with columns: CVE-ID, EPSS, Asset Criticality, Calculated Risk Score, Affected Hosts Count"
```

3. Adicione requisitos explícitos de formato de saída para cada prompt
4. Use parâmetros de entrada para datas em vez de termos relativos ("last 7 days" pode variar)
5. Teste o promptbook atualizado 3 vezes e verifique a consistência da saída

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual agente integrado do Security Copilot você habilitaria para classificar e triar automaticamente ameaças baseadas em e-mail?",
    options: [
      "Alert Triage Agent",
      "Phishing Triage Agent",
      "Vulnerability Remediation Agent",
      "Compliance Posture Agent"
    ],
    correctIndex: 1,
    explanation: "O Phishing Triage Agent é projetado especificamente para analisar e classificar ameaças baseadas em e-mail, incluindo phishing, business email compromise e anexos maliciosos. Ele pode quarentenar automaticamente, sinalizar para revisão ou fechar alertas com base nos thresholds de confiança."
  },
  {
    question: "Um agente precisa isolar um dispositivo comprometido. Com base na política de orquestração configurada neste desafio, o que acontece?",
    options: [
      "O dispositivo é isolado imediatamente",
      "A ação é proibida e bloqueada",
      "A ação requer aprovação humana antes da execução",
      "A ação é registrada mas executada sem aprovação"
    ],
    correctIndex: 2,
    explanation: "De acordo com a política de orquestração, o isolamento de dispositivos se enquadra em 'Requer aprovação humana' nos limites de ações. Ações de alto impacto como isolar dispositivos, desabilitar contas ou bloquear IPs exigem que um analista humano aprove antes que o agente possa executar."
  },
  {
    question: "O que você deve configurar quando os agentes esgotam a capacidade durante um pico de incidentes?",
    options: [
      "Desabilitar todos os agentes até o incidente ser resolvido",
      "Configurar níveis de prioridade dos agentes e reserva de capacidade",
      "Remover todas as políticas de orquestração",
      "Mudar permanentemente para modo somente manual"
    ],
    correctIndex: 1,
    explanation: "Configurar níveis de prioridade dos agentes com reserva de capacidade garante que agentes críticos (como Alert Triage) mantenham uma alocação mínima de SCU durante picos. Agentes de menor prioridade podem ser pausados ou limitados enquanto o incidente estiver ativo."
  },
  {
    question: "Um promptbook personalizado retorna resultados inconsistentes em múltiplas execuções. Qual é a correção mais eficaz?",
    options: [
      "Aumentar a alocação de SCU para execução de promptbooks",
      "Tornar os prompts mais específicos com formatos de saída explícitos e critérios determinísticos",
      "Desabilitar todos os plugins e reabilitá-los um por um",
      "Excluir e recriar o promptbook com os mesmos prompts"
    ],
    correctIndex: 1,
    explanation: "LLMs podem produzir saídas variáveis para prompts ambíguos. Tornar os prompts mais específicos — com critérios de ordenação explícitos, requisitos de formato de saída e parâmetros determinísticos — melhora significativamente a consistência entre as execuções."
  }
]} />

---

## Limpeza

Como este desafio envolve apenas configuração de agentes via portal:

1. Navegue até **Settings** → **Agents** → **Microsoft agents**
2. Desabilite cada agente: Phishing Triage, Alert Triage, Vulnerability Remediation
3. Navegue até **Security Store** → **Installed agents**
4. Desinstale os agentes Threat Intelligence Enrichment e Compliance Posture
5. Exclua os promptbooks personalizados da Promptbook library
6. Remova as políticas de orquestração em **Settings** → **Agent policies**

> ⚠️ **Aviso de custo:** Agentes ativos consomem capacidade de SCU mesmo quando ociosos (eles processam alertas recebidos). Desabilite os agentes quando não estiver estudando ativamente.
