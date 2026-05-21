---
sidebar_position: 2
title: "Dicas e estrategia para o exame"
---

# SC-500 dicas e estrategia para o exame

## Formato do exame

- **40–60 questoes** (multipla escolha, arrastar e soltar, estudos de caso, labs)
- **~120 minutos** (alguns candidatos relatam receber 150 min)
- **Nota de aprovacao**: 700/1000
- As questoes sao distribuidas entre todos os 4 dominios (nenhum dominio unico domina como o foco em pipelines do AZ-400)
- Questoes de lab podem exigir que voce configure settings de seguranca no Portal Azure ou execute comandos Azure CLI

## Gerenciamento de tempo

| Secao | Tempo sugerido | Observacoes |
|-------|---------------|-------------|
| Primeira passada (todas as questoes) | 70 min | Responda o que voce sabe, marque o resto |
| Segunda passada (marcadas) | 30 min | Foque em questoes baseadas em cenario |
| Secao de lab (se presente) | 20–30 min | Geralmente 1–2 tarefas no portal |
| Revisao | 10 min | Verifique respostas marcadas |

:::tip Armadilha de tempo

Questoes de estudo de caso fornecem muito contexto. **Leia a questao primeiro**, depois escaneie o estudo de caso buscando detalhes relevantes. Nao leia o estudo de caso inteiro antes de olhar a questao — isso desperdiça tempo.

:::

## Principais estrategias

### 1. Conheça a hierarquia do stack de seguranca

Muitas questoes testam se voce escolhe a ferramenta certa para o trabalho:

| Camada | Ferramenta |
|--------|------------|
| Identidade | Entra ID, PIM, Conditional Access |
| Rede | NSG, Azure Firewall, WAF, Private Link |
| Dados | Encryption, Key Vault, Purview |
| Computacao | Planos Defender, JIT VM access, endpoint protection |
| Monitoramento | Defender for Cloud, Sentinel, alertas de seguranca |
| IA | Purview DSPM, sensitivity labels, Azure AI content safety |

### 2. Entenda o padrao de resposta "defesa em profundidade"

Quando multiplas respostas parecem corretas, o exame geralmente quer o controle **mais especifico** na **camada mais proxima** do ativo sendo protegido.

### 3. Conditional Access e fortemente testado

Conheça a ordem de avaliacao:
1. Estado da sessao avaliado
2. Assignments verificados (usuarios, apps, condicoes)
3. Controles de acesso aplicados (grant/block, MFA, device compliance)
4. Controles de sessao aplicados (frequencia de sign-in, restricoes app-enforced)

### 4. Conheça a diferenca entre servicos similares

O exame adora perguntar para voce escolher entre:
- Azure Firewall vs NSG vs WAF
- Private Endpoint vs Service Endpoint
- Customer-managed keys vs Microsoft-managed keys vs double encryption
- Defender for Servers Plan 1 vs Plan 2
- Sentinel analytics rules vs alertas do Defender

### 5. Seguranca de IA e NOVA — estude com cuidado

Este e conteudo totalmente novo em relacao ao AZ-500. Espere questoes sobre:
- Purview DSPM para IA (avaliacao de exposicao de dados)
- Sensitivity labels impedindo o Copilot de exibir dados restritos
- Azure OpenAI content filtering e safety
- Conscientizacao sobre prompt injection

## Dicas por dominio

### Dominio 1: Identidade, acesso e governanca (20–25%)

- **Fluxos de ativacao PIM**: Conheça a sequencia completa — eligible → activate → approve → atribuicao ativa time-bound
- **Ordem de avaliacao Conditional Access**: Assignments sao avaliados primeiro, depois controles de grant, depois controles de sessao
- **Access reviews**: Saiba quando usar Entra access reviews vs PIM access reviews
- **Entitlement management**: Access packages, catalogs e connected organizations
- Conheça a diferenca entre **administrative units** e **management groups**
- **Custom RBAC roles**: Entenda `Actions`, `NotActions`, `DataActions`, `NotDataActions`

### Dominio 2: Armazenamento, bancos de dados e rede (25–30%)

- **Prioridade de regra NSG**: Numero mais baixo = prioridade mais alta. Regras padrao comecam em 65000.
- **DNS de Private Endpoint**: Voce DEVE configurar DNS (private DNS zone ou DNS customizado) — private endpoints nao funcionam sem resolucao de nomes correta
- **Modelos de acesso Key Vault**: RBAC vs access policies. RBAC e o modelo recomendado para novas implantacoes.
- **Camadas de seguranca SQL Database**: Firewall rules → Private Link → TDE → Always Encrypted → Dynamic Data Masking → Row-Level Security
- **Criptografia de storage**: Saiba quando usar CMK (customer-managed keys) vs infrastructure encryption (double encryption)
- **DDoS Protection**: Standard vs Network (anteriormente Basic) — saiba o que cada um cobre

### Dominio 3: Proteger computacao (20–25%)

- **Planos Defender**: Saiba qual plano cobre qual recurso:
  - Defender for Servers (Plan 1 = somente EDR, Plan 2 = EDR + vulnerability scanning + JIT + adaptive controls)
  - Defender for Containers (registry scanning + runtime protection)
  - Defender for App Service, Storage, SQL, Key Vault, DNS, Resource Manager
- **Seguranca de IA e NOVA**: Purview DSPM, sensitivity labels para Copilot readiness, Azure AI content safety
- **JIT VM access**: Abre portas por tempo limitado — saiba que ele modifica as regras do NSG temporariamente
- **Adaptive application controls**: Allowlisting baseado em machine learning para VMs
- **Seguranca de containers**: Admission control com Azure Policy, registry scanning com Defender

### Dominio 4: Postura de seguranca e monitoramento (20–25%)

- **KQL basico para Sentinel**: Voce nao precisa ser expert, mas conheça:
  - `where`, `project`, `summarize`, `extend`, `ago()`, `render`
  - Tabelas comuns: `SecurityEvent`, `SigninLogs`, `AzureActivity`, `CommonSecurityLog`
- **Tipos de data connector**: Conheça a diferenca entre conectores built-in, CEF/Syslog e conectores customizados (baseados em DCR)
- **Sentinel analytics rules**: Scheduled vs NRT (near real-time) vs Microsoft Security vs Fusion
- **Secure Score**: Saiba como recomendacoes mapeiam para impacto no score
- **Attack path analysis**: Recurso do Defender CSPM — entenda como ele encadeia vulnerabilidades

## Armadilhas comuns

| Armadilha | Por que esta errado | Resposta correta |
|-----------|--------------------|--------------------|
| "Use Azure Firewall para bloquear trafego entre subnets" | Azure Firewall e para internet/cross-VNet; use **NSGs** para intra-subnet | NSG na subnet |
| "Use Service Endpoint para isolar totalmente o storage" | Service Endpoints ainda usam IPs publicos; use **Private Endpoint** para isolamento total | Private Endpoint |
| "Habilite Defender for Cloud tier Basico" | Nao existe "tier Basico" — e **free tier** (CSPM) vs **planos pagos** (Defender plans) | Habilitar o plano Defender especifico |
| "Armazene secrets no App Configuration" | App Configuration e para feature flags/config; use **Key Vault** para secrets | Azure Key Vault |
| "Use access policies para novo Key Vault" | Microsoft agora recomenda **RBAC** para controle de acesso ao Key Vault | Modelo de permissao Azure RBAC |
| "Bloqueie acesso ao Copilot com Conditional Access" | Voce nao pode bloquear o Copilot assim; use **sensitivity labels** e **Purview DSPM** | Sensitivity labels + DSPM |

## Gerenciamento de custo nos labs

- **Entra ID P2**: Use um trial gratuito de 30 dias para labs de PIM e Identity Protection
- **Defender for Cloud**: Planos sao cobrados por recurso. Habilite apenas para o desafio, desabilite depois.
- **Sentinel**: Primeiros 10 GB/dia gratuitos por 31 dias em um novo workspace. Use com sabedoria.
- **VMs**: Use B1s/B1ls e desaloque imediatamente apos cada desafio
- **Defina um alerta de orcamento em $15** para detectar recursos que ficaram ligados

:::tip Dica profissional

Muitos desafios do Dominio 1 (Identidade) podem ser concluidos inteiramente com um trial do Entra ID P2 e recursos do free-tier. Desafios do Dominio 4 (Monitoramento) se beneficiam do periodo gratuito do Sentinel. Planeje sua ordem de estudo para maximizar os trials gratuitos.

:::

## Recursos

| Recurso | Link |
|---------|------|
| Guia de estudo SC-500 | [Microsoft Learn study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/sc-500) |
| Trilha de aprendizado SC-500 | [Modulos individuais](https://learn.microsoft.com/en-us/credentials/certifications/cloud-ai-security-engineer/) |
| Docs Defender for Cloud | [learn.microsoft.com/defender-for-cloud](https://learn.microsoft.com/en-us/azure/defender-for-cloud/) |
| Docs Microsoft Sentinel | [learn.microsoft.com/sentinel](https://learn.microsoft.com/en-us/azure/sentinel/) |
| Documentacao Entra ID | [learn.microsoft.com/entra](https://learn.microsoft.com/en-us/entra/identity/) |
| Sandbox do exame | [Experimentar a interface do exame](https://aka.ms/examdemo) |
