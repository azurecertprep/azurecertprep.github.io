---
sidebar_position: 1
title: "Challenge 16: Capstone | Day in the Life of an Azure Admin"
---

# Desafio 16: Capstone | Um Dia na Vida de um Administrador Azure

:::info Tempo e Custo Estimados

**90–120 minutos** | **Custo estimado**: ~$0,50 | **Peso no Exame: Todos os 5 domínios**

:::

:::info Informação Desafio Capstone

Este desafio abrange **todos os cinco domínios do exame AZ-104**. Ele simula um dia de trabalho real onde você soluciona problemas usando habilidades de cada domínio. Trate isto como seu ensaio final para o exame.

:::
## Cenário

Você chega ao trabalho na segunda-feira de manhã na Contoso e encontra **cinco tickets urgentes** na sua fila. Cada ticket testa conhecimentos de um domínio diferente do exame. Ninguém mais está disponível | tudo depende de você.

## Configuração

```bash
# Create resource groups for the capstone
for i in identity storage compute network monitor; do
  az group create --name "rg-az104-capstone-$i" --location eastus
done
```

---

## Ticket 1: Crise de Identidade

**Domínio: Gerenciar Identidades e Governança do Microsoft Entra ID**

> *"O novo funcionário Jordan Chen não consegue acessar o Portal do Azure. A conta dele existe no Entra ID, mas ele não consegue fazer login. O helpdesk diz que a senha nunca foi configurada corretamente. Além disso, Jordan deveria estar no grupo 'Developers', mas não aparece como membro."*

### Diagnosticar

1. Verifique se a conta de Jordan está **habilitada** no Entra ID
2. Verifique se o **SSPR (Self-Service Password Reset)** está configurado
3. Verifique a associação ao grupo | Jordan está no grupo "Developers"?

<details>
<summary>Passos de Diagnóstico</summary>

```bash
# Check if user account is enabled
az ad user show --id jordan@contoso.com --query accountEnabled

# Check group membership
az ad group member check \
  --group "Developers" \
  --member-id $(az ad user show --id jordan@contoso.com --query id -o tsv)
```

</details>

### Corrigir

1. **Habilitar a conta** (se estiver desabilitada)
2. **Redefinir a senha** e exigir alteração no próximo login
3. **Adicionar Jordan ao grupo Developers**

<details>
<summary>Comandos de Correção</summary>

```bash
# Enable account
az ad user update --id jordan@contoso.com --account-enabled true

# Reset password
az ad user update --id jordan@contoso.com --password "TempP@ss123!" --force-change-password-next-sign-in true

# Add to group
az ad group member add \
  --group "Developers" \
  --member-id $(az ad user show --id jordan@contoso.com --query id -o tsv)
```

</details>

### Causa Raiz
O usuário foi provisionado por um script automatizado que falhou no meio do processo | a conta foi criada mas ficou em estado desabilitado, nenhuma senha inicial foi definida, e a etapa de atribuição de grupo foi pulada.

---

## Ticket 2: SOS de Storage

**Domínio: Implementar e Gerenciar Armazenamento**

> *"A equipe de analytics relata que os uploads de blob via AzCopy estão falhando com 'AuthorizationFailure'. Isso estava funcionando normalmente ontem."*

### Diagnosticar

1. Verifique o **token SAS** | ele expirou?
2. Verifique o **firewall da conta de armazenamento** | uma regra de rede foi adicionada que bloqueia o IP deles?
3. Verifique se as **chaves de acesso foram rotacionadas**

<details>
<summary>Passos de Diagnóstico</summary>

```bash
# Check storage account network rules
az storage account show \
  --name stcontoso \
  --resource-group rg-az104-capstone-storage \
  --query networkRuleSet

# Check if the default action is Deny
az storage account show \
  --name stcontoso \
  --resource-group rg-az104-capstone-storage \
  --query networkRuleSet.defaultAction

# Test access with current SAS token
azcopy list "https://stcontoso.blob.core.windows.net/data?<SAS_TOKEN>"
```

</details>

### Corrigir

Gere um novo token SAS ou atualize as regras de firewall para permitir o IP da equipe de analytics.

<details>
<summary>Comandos de Correção</summary>

```bash
# Option A: Generate a new SAS token
END_DATE=$(date -u -d "+7 days" '+%Y-%m-%dT%H:%MZ')
az storage account generate-sas \
  --account-name stcontoso \
  --permissions rwdlacup \
  --resource-types sco \
  --services b \
  --expiry $END_DATE \
  -o tsv

# Option B: Add IP to firewall allow list
az storage account network-rule add \
  --account-name stcontoso \
  --resource-group rg-az104-capstone-storage \
  --ip-address 203.0.113.50
```

</details>

### Causa Raiz
O token SAS gerado na semana passada tinha validade de 7 dias e expirou durante a noite. Além disso, um membro da equipe de segurança adicionou regras de firewall à conta de armazenamento mas não incluiu o IP da equipe de analytics.

---

## Ticket 3: VM Fora do Ar

**Domínio: Implantar e Gerenciar Recursos de Computação do Azure**

> *"Uma VM de produção está inacessível. O dashboard de monitoramento mostra que ela está como 'Parada (desalocada)', mas ninguém lembra de ter parado."*

### Diagnosticar

1. Verifique o **log de atividades** | quem ou o que parou a VM?
2. Verifique se há um **agendamento de desligamento automático** configurado
3. Verifique o **estado de energia** atual da VM

<details>
<summary>Passos de Diagnóstico</summary>

```bash
# Check activity log for Stop/Deallocate events
az monitor activity-log list \
  --resource-group rg-az104-capstone-compute \
  --query "[?operationName.value=='Microsoft.Compute/virtualMachines/deallocate/action'].{Time:eventTimestamp, Caller:caller, Status:status.value}" \
  -o table

# Check auto-shutdown schedule
az vm auto-shutdown show \
  --resource-group rg-az104-capstone-compute \
  --name vm-prod-01

# Check current VM status
az vm get-instance-view \
  --resource-group rg-az104-capstone-compute \
  --name vm-prod-01 \
  --query instanceView.statuses
```

</details>

### Corrigir

1. **Iniciar a VM** imediatamente
2. **Revisar o log de atividades** para identificar a causa
3. **Remover o desligamento automático** se estiver mal configurado

<details>
<summary>Comandos de Correção</summary>

```bash
# Start the VM
az vm start \
  --resource-group rg-az104-capstone-compute \
  --name vm-prod-01

# Disable auto-shutdown if misconfigured
az vm auto-shutdown \
  --resource-group rg-az104-capstone-compute \
  --name vm-prod-01 \
  --off
```

</details>

### Causa Raiz
Um desenvolvedor habilitou o desligamento automático às 19:00 para sua VM de desenvolvimento, mas acidentalmente aplicou na VM de produção. O log de atividades mostra que o desligamento foi acionado pelo provedor de recursos `Microsoft.DevTestLab`.

---

## Ticket 4: Bloqueio de Rede

**Domínio: Configurar e Gerenciar Redes Virtuais**

> *"Após uma alteração de 'hardening de segurança' na sexta-feira passada, a aplicação web na porta 443 não está mais acessível pela internet."*

### Diagnosticar

1. Verifique as **regras NSG** | uma regra deny-all foi adicionada?
2. Verifique o **health probe do Load Balancer** | o backend está saudável?
3. Verifique se a **NIC da VM ainda tem o NSG correto** associado

<details>
<summary>Passos de Diagnóstico</summary>

```bash
# List NSG rules
az network nsg rule list \
  --resource-group rg-az104-capstone-network \
  --nsg-name nsg-web \
  -o table

# Check effective security rules on the NIC
az network nic list-effective-nsg \
  --resource-group rg-az104-capstone-network \
  --name vm-web-01-nic

# Check LB health probe status (via Portal: LB > Insights)
az network lb probe show \
  --resource-group rg-az104-capstone-network \
  --lb-name lb-web \
  --name hp-https

# Use Network Watcher IP flow verify
az network watcher test-ip-flow \
  --direction Inbound \
  --local 10.0.0.4:443 \
  --protocol TCP \
  --remote 0.0.0.0:* \
  --vm vm-web-01 \
  --resource-group rg-az104-capstone-network
```

</details>

### Corrigir

Adicione uma regra NSG de permissão adequada para tráfego HTTPS e verifique a configuração do health probe.

<details>
<summary>Comandos de Correção</summary>

```bash
# Add NSG rule to allow HTTPS
az network nsg rule create \
  --resource-group rg-az104-capstone-network \
  --nsg-name nsg-web \
  --name Allow-HTTPS \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 443 \
  --source-address-prefixes '*'

# Verify the health probe is checking the right port
az network lb probe show \
  --resource-group rg-az104-capstone-network \
  --lb-name lb-web \
  --name hp-https
```

</details>

### Causa Raiz
A equipe de segurança adicionou uma regra `DenyAllInbound` com prioridade 200, que substitui as regras padrão. Eles esqueceram de adicionar uma regra explícita de `Allow` para a porta 443 antes da regra de negação.

---

## Ticket 5: Cadê Meus Alertas?

**Domínio: Monitorar e Manter Recursos do Azure**

> *"A equipe diz que nunca recebeu um alerta quando uma VM ficou fora do ar no fim de semana passado. O job de backup também falhou na sexta à noite mas ninguém foi notificado."*

### Diagnosticar

1. Verifique o **grupo de ação** | o endereço de email está correto?
2. Verifique se as **regras de alerta estão habilitadas**
3. Verifique as **configurações de alerta de backup** no Recovery Services vault

<details>
<summary>Passos de Diagnóstico</summary>

```bash
# List alert rules and their status
az monitor metrics alert list \
  --resource-group rg-az104-capstone-monitor \
  -o table

# Check action group configuration
az monitor action-group show \
  --resource-group rg-az104-capstone-monitor \
  --name ag-ops-team

# Check if alerts are enabled
az monitor metrics alert show \
  --resource-group rg-az104-capstone-monitor \
  --name alert-vm-availability \
  --query isEnabled
```

</details>

### Corrigir

1. **Verificar o grupo de ação** | confirmar que o endereço de email está correto
2. **Habilitar a regra de alerta** (ela estava desabilitada)
3. **Configurar alertas de falha de backup**

<details>
<summary>Comandos de Correção</summary>

```bash
# Update action group with correct email
az monitor action-group update \
  --resource-group rg-az104-capstone-monitor \
  --name ag-ops-team \
  --add-action email ops-email correctemail@contoso.com

# Enable the alert rule
az monitor metrics alert update \
  --resource-group rg-az104-capstone-monitor \
  --name alert-vm-availability \
  --enabled true
```

Para alertas de backup: Configure via **Recovery Services vault → Alertas → Configurar notificações**.

</details>

### Causa Raiz
O grupo de ação tinha o email errado (um erro de digitação | `ops@contso.com` em vez de `ops@contoso.com`). O alerta de disponibilidade de VM foi criado mas ficou em estado desabilitado durante os testes e nunca foi reabilitado. Os alertas de backup nunca foram configurados.

---

## Teste seus Conhecimentos: Questões Estilo Exame

**Questão 1** *(Identidade)*
Um usuário relata que não consegue fazer login no Portal do Azure. A conta dele existe no Microsoft Entra ID. O que você deve verificar PRIMEIRO?

- A. Verificar se o usuário tem uma assinatura do Azure
- B. Verificar se a conta do usuário está habilitada
- C. Redefinir o registro MFA do usuário
- D. Adicionar o usuário ao papel de Administrador Global

<details><summary>Resposta</summary>**B.** Uma conta desabilitada impede o login. Sempre verifique o básico primeiro | a conta está habilitada e tem uma senha válida?</details>

**Questão 2** *(Armazenamento)*
Uploads do AzCopy para uma conta de armazenamento falham com "AuthorizationFailure." O token SAS foi gerado 8 dias atrás com validade de 7 dias. Qual é a causa mais provável?

- A. O firewall da conta de armazenamento está bloqueando as requisições
- B. O token SAS expirou
- C. A conta de armazenamento foi excluída
- D. O AzCopy precisa ser atualizado

<details><summary>Resposta</summary>**B.** Um token SAS com validade de 7 dias gerado 8 dias atrás expirou. Gere um novo token SAS com uma validade apropriada.</details>

**Questão 3** *(Computação)*
Uma VM está mostrando como "Parada (desalocada)" e você precisa descobrir o que a parou. Qual ferramenta você deve usar?

- A. Métricas do Azure Monitor
- B. Log de Atividades
- C. Resource Health
- D. Network Watcher

<details><summary>Resposta</summary>**B.** O Log de Atividades registra todas as operações do plano de controle, incluindo quem ou o que desalocou a VM e quando.</details>

**Questão 4** *(Rede)*
Após adicionar uma regra NSG DenyAllInbound na prioridade 200, o tráfego web na porta 443 está bloqueado. Qual é a correção correta?

- A. Remover todas as regras NSG
- B. Adicionar uma regra Allow para a porta 443 com prioridade menor que 200 (ex: 100)
- C. Adicionar uma regra Allow para a porta 443 com prioridade maior que 200 (ex: 300)
- D. Desassociar o NSG da subnet

<details><summary>Resposta</summary>**B.** As regras NSG são avaliadas por prioridade | o número mais baixo vence. Uma regra Allow na prioridade 100 é avaliada antes de uma regra Deny na prioridade 200.</details>

**Questão 5** *(Monitoramento)*
Uma regra de alerta está configurada com a condição correta, mas a equipe nunca recebe notificações por email. O que você deve verificar?

- A. O nível de severidade do alerta
- B. A configuração do grupo de ação e o endereço de email
- C. O tier de preço do Azure Monitor
- D. A política de retenção do Log Analytics workspace

<details><summary>Resposta</summary>**B.** Se o alerta dispara mas nenhuma notificação é recebida, o grupo de ação é o provável culpado | verifique se ele tem os endereços de email corretos e se está anexado à regra de alerta.</details>

---

## Limpeza

```bash
# Delete all capstone resource groups
for i in identity storage compute network monitor; do
  az group delete --name "rg-az104-capstone-$i" --yes --no-wait
done
```

## Critérios de Sucesso

- [ ] **Ticket 1** | Crise de Identidade resolvida (conta habilitada, senha redefinida, associação ao grupo corrigida)
- [ ] **Ticket 2** | SOS de Storage resolvido (novo token SAS ou regras de firewall atualizadas)
- [ ] **Ticket 3** | VM Fora do Ar resolvida (VM iniciada, desligamento automático removido, causa raiz identificada)
- [ ] **Ticket 4** | Bloqueio de Rede resolvido (regra NSG adicionada, tráfego fluindo)
- [ ] **Ticket 5** | Alertas corrigidos (grupo de ação corrigido, alerta habilitado, alertas de backup configurados)
- [ ] Cada ticket: passos de diagnóstico documentados, causa raiz identificada, correção aplicada
- [ ] Todos os grupos de recursos limpos

---

:::tip Dica 🎓 Você Completou a Série de Desafios AZ-104!

Se você trabalhou em todos os 28 desafios, cobriu todas as principais habilidades medidas no exame AZ-104. Revise as áreas onde teve dificuldade e depois agende seu exame com confiança. Boa sorte!

:::