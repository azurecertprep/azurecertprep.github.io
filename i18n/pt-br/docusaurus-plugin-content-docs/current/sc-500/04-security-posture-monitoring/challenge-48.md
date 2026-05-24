---
sidebar_position: 48
title: "Desafio 48: Security Copilot – Workspace, Permissões e Plugins"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 48: Security Copilot – Workspace, Permissões e Plugins

## Habilidades do exame cobertas

- Configurar workspace e unidades de capacidade do Security Copilot
- Gerenciar funções RBAC (Copilot owner, Copilot contributor)
- Habilitar e configurar plugins (Sentinel, Defender XDR, Intune, Entra, NaturalLanguageToKQL)
- Configurar promptbooks e configurações de compartilhamento
- Entender o processamento de dados e os limites de privacidade do Security Copilot

## Cenário

A Contoso Ltd adquiriu unidades de computação do Security Copilot e deseja implantar o serviço para sua equipe de SOC. Como administrador de segurança, você deve configurar a capacidade do workspace, definir permissões RBAC apropriadas para que analistas de Nível 1 possam usar o Copilot sem modificar configurações, habilitar os plugins relevantes para o ambiente da Contoso e configurar promptbooks para fluxos de trabalho comuns de investigação.

---

## Pré-requisitos

- Assinatura Azure com função Owner ou Contributor
- 🔒 **Licença necessária**: Unidades de computação do Security Copilot (SCU) provisionadas em seu tenant
- Microsoft Entra ID P2 (para atribuições de função)
- Workspace do Microsoft Sentinel com dados ativos
- Microsoft Defender XDR habilitado
- Ambiente Microsoft Intune (opcional, para plugin do Intune)
- Função Global Administrator ou Security Administrator no Entra ID

---

## Tarefa 1: Provisionar capacidade do Security Copilot

Configure o workspace do Security Copilot com capacidade de computação apropriada para a equipe de SOC da Contoso, composta por 12 analistas.

**Passos no Portal:**

1. Navegue até o [portal Azure](https://portal.azure.com)
2. Pesquise por **"Microsoft Security Copilot"** na barra de pesquisa
3. Selecione **Security Copilot** → **Settings** → **Capacity management**
4. Clique em **+ Add capacity**
5. Configure a unidade de capacidade:

| Configuração | Valor |
|---------|-------|
| Subscription | Contoso-Production |
| Resource group | rg-contoso-seccopilot |
| Region | East US |
| Capacity name | scu-contoso-soc |
| Compute units | 3 SCUs |
| Cross-geo evaluation | Disabled |

6. Clique em **Review + Create** → **Create**
7. Aguarde o provisionamento ser concluído (normalmente 2-5 minutos)

**Verifique a capacidade:**

1. Navegue até **Security Copilot** → **Settings** → **Capacity management**
2. Confirme que o status mostra **Active**
3. Anote as unidades de capacidade alocadas e a região

> 💡 **Dica de exame:** Cada SCU fornece aproximadamente 30 prompts por hora para todos os usuários. Planeje a capacidade com base no tamanho da equipe e nos padrões de uso esperados.

---

## Tarefa 2: Configurar funções RBAC para a equipe de SOC

Configure o acesso baseado em funções para que líderes de SOC possam gerenciar as configurações do Copilot, enquanto analistas podem apenas usar o serviço.

**Passos no Portal:**

1. Navegue até **Security Copilot** → **Settings** → **Role assignments**
2. Clique em **+ Add role assignment**
3. Atribua a função **Copilot owner**:

| Configuração | Valor |
|---------|-------|
| Role | Microsoft Security Copilot Owner |
| Assign to | SOC-Leads (security group) |
| Scope | Entire workspace |

4. Clique em **Add**
5. Atribua a função **Copilot contributor**:

| Configuração | Valor |
|---------|-------|
| Role | Microsoft Security Copilot Contributor |
| Assign to | SOC-Analysts-Tier1 (security group) |
| Scope | Entire workspace |

6. Clique em **Add**

**Entendendo as funções:**

| Função | Capacidades |
|------|-------------|
| **Copilot Owner** | Acesso total: gerenciar configurações, plugins, capacidade, visualizar todas as sessões, criar/compartilhar promptbooks |
| **Copilot Contributor** | Usar o Copilot, criar sessões pessoais, executar promptbooks compartilhados, não pode modificar configurações globais |

**Verifique as atribuições de função:**

1. Faça login como um usuário do grupo SOC-Analysts-Tier1
2. Navegue até o Security Copilot
3. Confirme que o usuário pode criar sessões e executar prompts
4. Confirme que o usuário **não consegue** acessar Settings → Capacity management
5. Faça login como membro do SOC-Leads e verifique o acesso total às configurações

> 💡 **Dica de exame:** Copilot Owner corresponde ao gerenciamento do serviço; Copilot Contributor corresponde ao uso do serviço. Isso é separado do Azure RBAC — são funções específicas do Security Copilot.

---

## Tarefa 3: Habilitar e configurar plugins

Habilite os plugins de segurança que a Contoso precisa para seu ambiente.

**Passos no Portal:**

1. Navegue até **Security Copilot** → **Settings** → **Plugins**
2. Habilite os seguintes plugins Microsoft:

### Microsoft Sentinel Plugin

| Configuração | Valor |
|---------|-------|
| Status | Enabled |
| Workspace | law-contoso-sentinel |
| Subscription | Contoso-Production |
| Resource group | rg-contoso-sentinel |
| Default time range | Last 7 days |

3. Clique em **Save**

### Microsoft Defender XDR Plugin

| Configuração | Valor |
|---------|-------|
| Status | Enabled |
| Scope | All Defender workloads |
| Include advanced hunting | Yes |

4. Clique em **Save**

### Microsoft Entra Plugin

| Configuração | Valor |
|---------|-------|
| Status | Enabled |
| Include sign-in logs | Yes |
| Include audit logs | Yes |
| Include risky users | Yes |

5. Clique em **Save**

### Microsoft Intune Plugin

| Configuração | Valor |
|---------|-------|
| Status | Enabled |
| Include device compliance | Yes |
| Include app protection | Yes |

6. Clique em **Save**

### Natural Language to KQL Plugin

| Configuração | Valor |
|---------|-------|
| Status | Enabled |
| Target workspace | law-contoso-sentinel |
| Allow query execution | Yes |
| Maximum query results | 100 |

7. Clique em **Save**

**Verifique se os plugins estão funcionando:**

1. Abra uma nova sessão do Security Copilot
2. Teste cada plugin com prompts de exemplo:

```text
# Test Sentinel plugin
"Show me the top 10 security alerts from Sentinel in the last 24 hours"

# Test Defender XDR plugin
"List active incidents in Defender XDR with high severity"

# Test Entra plugin
"Show users flagged as risky in the last 7 days"

# Test Intune plugin
"List non-compliant devices in Intune"

# Test NL2KQL plugin
"Write a KQL query to find failed sign-in attempts from outside the US"
```

3. Verifique se cada prompt retorna resultados relevantes do respectivo serviço

---

## Tarefa 4: Configurar promptbooks e configurações de compartilhamento

Crie promptbooks reutilizáveis para fluxos de trabalho comuns de investigação do SOC.

**Passos no Portal:**

1. Navegue até **Security Copilot** → **Promptbook library**
2. Clique em **+ Create promptbook**
3. Crie o promptbook **Incident Triage**:

| Configuração | Valor |
|---------|-------|
| Name | Incident Triage - Initial Assessment |
| Description | Standard triage workflow for new security incidents |
| Sharing | Shared with SOC-Analysts-Tier1 group |

4. Adicione os seguintes prompts em sequência:

```text
Prompt 1: "Summarize incident {incident_id} including affected entities, timeline, and severity justification"

Prompt 2: "What MITRE ATT&CK techniques are associated with this incident?"

Prompt 3: "Are there any related incidents or alerts in the last 30 days involving the same entities?"

Prompt 4: "What remediation steps do you recommend based on this incident type?"

Prompt 5: "Generate an executive summary of this incident suitable for management notification"
```

5. Defina os parâmetros de entrada:
   - `{incident_id}` — Type: String, Required: Yes
6. Clique em **Save promptbook**

**Crie um segundo promptbook para Investigação de Usuário:**

1. Clique em **+ Create promptbook**
2. Configure:

| Configuração | Valor |
|---------|-------|
| Name | User Compromise Investigation |
| Description | Deep-dive investigation for potentially compromised user accounts |
| Sharing | Shared with SOC-Leads group |

3. Adicione os prompts:

```text
Prompt 1: "Show all sign-in activity for user {user_upn} in the last 14 days including locations and devices"

Prompt 2: "Has this user had any impossible travel detections or sign-ins from anonymous IP addresses?"

Prompt 3: "What Azure resources has this user accessed in the last 7 days?"

Prompt 4: "Check if this user's credentials appear in any known breach databases"

Prompt 5: "Generate a timeline of suspicious activities for this user and recommend containment actions"
```

4. Clique em **Save promptbook**

**Configure as configurações de compartilhamento:**

1. Navegue até **Settings** → **Sharing & privacy**
2. Configure:

| Configuração | Valor |
|---------|-------|
| Allow session sharing | Yes - within organization |
| Allow promptbook sharing | Yes - with security groups |
| Data sharing with Microsoft | Opt-out (for compliance) |
| Session history retention | 90 days |
| Audit logging | Enabled |

3. Clique em **Save**

---

## Tarefa 5: Configurar limites de dados e configurações de conformidade

Garanta que o processamento de dados do Security Copilot atenda aos requisitos de conformidade da Contoso.

**Passos no Portal:**

1. Navegue até **Security Copilot** → **Settings** → **Data and privacy**
2. Configure os limites de dados:

| Configuração | Valor |
|---------|-------|
| Data processing region | United States |
| Cross-geo processing | Disabled |
| Customer data storage | Tenant boundary only |
| Prompt logging for improvement | Disabled |

3. Navegue até **Settings** → **Audit and compliance**
4. Habilite o registro de auditoria:

| Configuração | Valor |
|---------|-------|
| Audit log destination | law-contoso-sentinel |
| Log all user prompts | Yes |
| Log plugin invocations | Yes |
| Log session metadata | Yes |

5. Clique em **Save**

**Verifique o registro de auditoria:**

1. Execute um prompt de teste no Security Copilot
2. Aguarde 5-10 minutos para a ingestão dos logs
3. No Sentinel, consulte os logs de auditoria:

```kql
SecurityCopilotAudit_CL
| where TimeGenerated > ago(1h)
| project TimeGenerated, UserPrincipalName, OperationType, PluginUsed, PromptText
| sort by TimeGenerated desc
```

---

## Quebra & conserta

### Cenário 1: Plugin retorna "No data available"

Um analista de Nível 1 relata que o plugin do Sentinel sempre retorna "No data available", mesmo havendo dados no workspace.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** A conta do Entra ID do analista não possui a função **Microsoft Sentinel Reader** no workspace.

**Correção:**
1. Navegue até o workspace do Sentinel → **Access control (IAM)**
2. Adicione atribuição de função: **Microsoft Sentinel Reader** → atribua à conta do analista ou ao grupo de segurança correspondente
3. Aguarde 5-10 minutos para a propagação das permissões
4. Teste o plugin novamente

> Os plugins do Security Copilot respeitam as permissões do serviço subjacente. Mesmo com a função Copilot Contributor, os usuários precisam de RBAC apropriado nas fontes de dados.

</details>

### Cenário 2: Execução de promptbook falha com erro de capacidade

Os líderes de SOC relatam que a execução de promptbooks falha intermitentemente com erros de "Insufficient capacity" durante horários de pico.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** Os SCUs provisionados (3) são insuficientes para 12 analistas executando promptbooks simultaneamente.

**Correção:**
1. Navegue até **Security Copilot** → **Settings** → **Capacity management**
2. Selecione a unidade de capacidade existente → **Edit**
3. Aumente as unidades de computação de 3 para 6 SCUs
4. Habilite **burst capacity** se disponível
5. Considere implementar políticas de uso:
   - Limitar sessões simultâneas por usuário
   - Agendar promptbooks intensivos para horários de menor movimento
   - Monitorar padrões de uso no dashboard de capacidade

> Cada SCU suporta aproximadamente 30 prompts/hora. Para 12 analistas, planeje de 5 a 8 SCUs dependendo dos padrões de uso.

</details>

### Cenário 3: Alerta de processamento de dados entre regiões

A equipe de conformidade identifica que o Security Copilot está processando dados em uma região europeia, apesar do tenant estar configurado apenas para processamento nos EUA.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** A avaliação entre regiões foi habilitada acidentalmente, ou um plugin de terceiros está roteando dados por outra região.

**Correção:**
1. Navegue até **Security Copilot** → **Settings** → **Data and privacy**
2. Verifique se **Cross-geo processing** está definido como **Disabled**
3. Verifique em **Settings** → **Plugins** se há plugins de terceiros
4. Desabilite quaisquer plugins que possam processar dados fora dos limites dos EUA
5. Revise os logs de auditoria para informações sobre a região de processamento:

```kql
SecurityCopilotAudit_CL
| where ProcessingRegion != "US"
| project TimeGenerated, UserPrincipalName, PluginUsed, ProcessingRegion
```

6. Se o problema persistir, entre em contato com o Suporte Microsoft apresentando as evidências de auditoria

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a função mínima necessária para um analista de SOC usar o Security Copilot sem modificar configurações?",
    options: [
      "Security Administrator",
      "Microsoft Security Copilot Owner",
      "Microsoft Security Copilot Contributor",
      "Global Reader"
    ],
    correctIndex: 2,
    explanation: "A função Microsoft Security Copilot Contributor permite que os usuários criem sessões, executem prompts e usem promptbooks compartilhados, sem a capacidade de modificar configurações globais, plugins ou configuração de capacidade."
  },
  {
    question: "Um plugin do Security Copilot não retorna dados, mesmo que o serviço subjacente tenha dados. Qual é a causa mais provável?",
    options: [
      "O plugin não está habilitado nas configurações do Security Copilot",
      "O usuário não possui permissões RBAC na fonte de dados subjacente",
      "As unidades de capacidade do Security Copilot estão esgotadas",
      "O promptbook tem um parâmetro de entrada incorreto"
    ],
    correctIndex: 1,
    explanation: "Os plugins do Security Copilot aplicam as permissões do usuário chamador no serviço subjacente. Se um usuário não possui a função Sentinel Reader no workspace, o plugin do Sentinel não consegue recuperar dados, independentemente das atribuições de função do Copilot."
  },
  {
    question: "Qual configuração deve ser desabilitada para impedir que o Security Copilot processe prompts em regiões fora da sua geografia designada?",
    options: [
      "Data sharing with Microsoft",
      "Cross-geo evaluation",
      "Prompt logging for improvement",
      "Session history retention"
    ],
    correctIndex: 1,
    explanation: "A Cross-geo evaluation controla se o Security Copilot pode processar prompts em data centers fora da sua região configurada. Desabilitar essa opção garante que todo o processamento permaneça dentro da geografia designada para fins de conformidade."
  },
  {
    question: "Quantos prompts por hora uma unidade de computação do Security Copilot (SCU) suporta aproximadamente?",
    options: [
      "10 prompts por hora",
      "30 prompts por hora",
      "100 prompts por hora",
      "Prompts ilimitados por hora"
    ],
    correctIndex: 1,
    explanation: "Cada unidade de computação do Security Copilot (SCU) fornece aproximadamente 30 prompts por hora para todos os usuários compartilhando essa capacidade. Planeje a capacidade com base no tamanho da equipe e nos padrões de uso simultâneo esperados."
  }
]} />

---

## Limpeza

Como este desafio envolve apenas configuração via portal, a limpeza consiste em remover os recursos do Security Copilot:

1. Navegue até **Security Copilot** → **Settings** → **Capacity management**
2. Selecione a unidade de capacidade → **Delete**
3. Remova as atribuições de função em **Settings** → **Role assignments**
4. Exclua os promptbooks da **Promptbook library**

> ⚠️ **Aviso de custo:** As unidades de computação do Security Copilot são cobradas por hora. Exclua a capacidade quando não estiver estudando ativamente para evitar cobranças.
