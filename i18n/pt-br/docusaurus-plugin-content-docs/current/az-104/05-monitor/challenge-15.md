---
sidebar_position: 2
title: "Challenge 15: Backup & Recovery"
---

# Desafio 15: Backup & Recovery

| | |
|---|---|
| ⏱️ **Tempo estimado** | 60–75 minutos |
| 💰 **Custo estimado** | ~$0,30 |
| 📊 **Peso no exame** | 10–15% |

## Cenário

O desastre aconteceu na Contoso — um desenvolvedor acidentalmente excluiu dados de produção. A gerência está exigindo respostas: *"Por que não havia um backup?"* Seu trabalho é implementar o Azure Backup e o Azure Site Recovery para que isso nunca mais aconteça.

## Habilidades do Exame Cobertas

- Criar um Recovery Services vault
- Criar um Azure Backup vault
- Criar e configurar política de backup
- Realizar operações de backup e restauração
- Configurar Azure Site Recovery para VMs
- Realizar failover para uma região secundária
- Configurar e interpretar relatórios e alertas para backups

## Referência Sysadmin ➜ Azure

| On-Prem / Tradicional | Equivalente no Azure |
|---|---|
| Veeam / SCDPM | Azure Backup |
| Rotação de fitas de backup (GFS) | Políticas de backup (diário/semanal/mensal/anual) |
| Site de DR (hot / cold / warm) | Azure Site Recovery |
| Relatórios de backup | Backup center |

## Configuração

```bash
# Variables
RG="rg-az104-challenge15"
LOCATION="eastus"
DR_LOCATION="westus2"

# Create resource group
az group create --name $RG --location $LOCATION
```

## Tarefas

### Tarefa 1 — Criar um Recovery Services Vault

```bash
az backup vault create \
  --resource-group $RG \
  --name rsv-contoso \
  --location $LOCATION
```

:::tip Dica
Recovery Services vaults são usados para backup de VM e Azure Site Recovery. O vault deve estar na **mesma região** das VMs que você deseja fazer backup.
:::

### Tarefa 2 — Criar uma Política de Backup

Crie uma política de backup personalizada: backups diários às 2:00 da manhã, retenção de 30 dias.

<details>
<summary>💡 Dica</summary>

O jeito mais fácil é pelo Portal do Azure:

1. Vá ao seu Recovery Services vault
2. **Políticas de backup → Adicionar**
3. Tipo de política: Azure Virtual Machine
4. Agendamento: Diário às 2:00 da manhã
5. Retenção: 30 dias

Ou via CLI (usando um JSON de política):

```bash
az backup policy set \
  --resource-group $RG \
  --vault-name rsv-contoso \
  --policy '{"name":"policy-daily-30","properties":{"backupManagementType":"AzureIaasVM","schedulePolicy":{"schedulePolicyType":"SimpleSchedulePolicy","scheduleRunFrequency":"Daily","scheduleRunTimes":["2024-01-01T02:00:00Z"]},"retentionPolicy":{"retentionPolicyType":"LongTermRetentionPolicy","dailySchedule":{"retentionTimes":["2024-01-01T02:00:00Z"],"retentionDuration":{"count":30,"durationType":"Days"}}}}}'
```

</details>

### Tarefa 3 — Habilitar Backup para uma VM

Implante uma VM e habilite o backup:

```bash
# Create a VM
az vm create \
  --resource-group $RG \
  --name vm-backup-test \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys

# Enable backup
az backup protection enable-for-vm \
  --resource-group $RG \
  --vault-name rsv-contoso \
  --vm vm-backup-test \
  --policy-name DefaultPolicy
```

### Tarefa 4 — Acionar um Backup Sob Demanda

```bash
az backup protection backup-now \
  --resource-group $RG \
  --vault-name rsv-contoso \
  --container-name "IaasVMContainer;iaasvmcontainerv2;$RG;vm-backup-test" \
  --item-name "VM;iaasvmcontainerv2;$RG;vm-backup-test" \
  --retain-until "2025-12-31"
```

:::note
O primeiro backup pode levar **30–60 minutos** dependendo do tamanho da VM. Você pode acompanhar o progresso na aba **Backup Jobs** do vault.
:::

### Tarefa 5 — Restaurar uma VM a partir do Backup

Quando o backup for concluído, restaure-o para uma nova VM:

1. Vá para **Recovery Services vault → Itens de backup → Azure Virtual Machine**
2. Selecione a VM → **Restaurar VM**
3. Escolha **Criar novo** → Dê um novo nome como `vm-backup-restored`
4. Selecione o ponto de restauração e a VNet/subnet de destino

<details>
<summary>💡 Dica CLI</summary>

```bash
# List recovery points
az backup recoverypoint list \
  --resource-group $RG \
  --vault-name rsv-contoso \
  --container-name "IaasVMContainer;iaasvmcontainerv2;$RG;vm-backup-test" \
  --item-name "VM;iaasvmcontainerv2;$RG;vm-backup-test"

# Restore (Portal is easier for this task)
```

</details>

### Tarefa 6 — Criar um Azure Backup Vault

Azure Backup vaults são usados para cargas de trabalho mais novas como backup de blob e Azure Database for PostgreSQL.

```bash
az dataprotection backup-vault create \
  --resource-group $RG \
  --vault-name bv-contoso \
  --location $LOCATION \
  --storage-setting "[{type:LocallyRedundant,datastore-type:VaultStore}]"
```

### Tarefa 7 — Configurar Backup de Blob (Camada Operacional)

1. Crie uma conta de armazenamento
2. Configure backup operacional para blobs (restauração point-in-time)

<details>
<summary>💡 Dica</summary>

Pelo Portal do Azure:
1. Vá ao seu Backup vault → **+ Backup**
2. Tipo de fonte de dados: **Azure Blobs (Azure Storage)**
3. Selecione a conta de armazenamento
4. Configure a política de backup (padrão: 30 dias de retenção operacional)

Isso habilita a restauração point-in-time para blobs — nenhuma cópia de backup é criada; ele usa rastreamento de alterações na conta de armazenamento.

</details>

### Tarefa 8 — Configurar Azure Site Recovery

Habilite a replicação para uma VM em uma região secundária:

1. Vá para **Recovery Services vault → Site Recovery → Itens replicados**
2. Clique em **+ Replicar → Máquinas virtuais do Azure**
3. Região de origem: `eastus`
4. Região de destino: `westus2`
5. Selecione sua VM
6. Revise as configurações de replicação e habilite

:::tip Dica
O Site Recovery replica os discos da VM de forma assíncrona para a região de destino. A replicação inicial pode levar 30–60 minutos dependendo do tamanho do disco.
:::

### Tarefa 9 — Executar um Test Failover

Após a replicação inicial ser concluída:

1. Vá para o item replicado
2. Clique em **Test Failover**
3. Selecione o ponto de recuperação e a VNet de destino
4. Verifique a VM de teste na região de destino
5. **Limpe o test failover** quando terminar

:::warning Atenção
Sempre limpe os recursos do test failover — eles continuam gerando cobranças até serem removidos.
:::

### Tarefa 10 — Configurar Relatórios de Backup

1. Vá para **Backup center → Relatórios de backup**
2. Configure o Log Analytics workspace como fonte de dados
3. Explore: integridade dos itens de backup, tendências de jobs de backup, consumo de armazenamento

### Tarefa 11 — Configurar Alertas de Backup

Configure alertas para jobs de backup com falha:

1. Vá para **Recovery Services vault → Alertas**
2. Crie uma regra de alerta para **Falha de backup**
3. Anexe um grupo de ação para notificação por email

## 🔨 Quebre & Conserte

### Quebre
1. **Excluir um vault com itens protegidos** — Tente excluir o Recovery Services vault enquanto ele ainda tem itens de backup. Observe o erro: *"O vault não pode ser excluído pois existem recursos dentro do vault."*
2. **Incompatibilidade de região** — Tente fazer backup de uma VM em `westus2` usando o vault em `eastus`. O que acontece?

### Conserte
- Para excluir um vault: primeiro pare a proteção de backup, exclua os dados de backup, depois exclua o vault
- Mova ou recrie o vault na mesma região da VM

## 📝 Teste seus Conhecimentos

1. **Recovery Services vault vs Azure Backup vault?**
   - Recovery Services vault: VMs, SQL em Azure VM, Azure Files, Azure Site Recovery
   - Azure Backup vault: Blobs, Azure Disks, Azure Database for PostgreSQL

2. **RPO vs RTO?**
   - RPO (Recovery Point Objective) = Perda máxima aceitável de dados (tempo entre o último backup e o desastre)
   - RTO (Recovery Time Objective) = Tempo de inatividade máximo aceitável (tempo para restaurar o serviço)

3. **Quais são os tipos de backup?**
   - Completo — cópia completa de todos os dados
   - Incremental — apenas alterações desde o último backup (padrão do Azure para VMs)
   - Diferencial — alterações desde o último backup completo

4. **Site Recovery: failover vs test failover?**
   - Test failover — valida a replicação sem afetar a produção; cria recursos de teste
   - Failover — recuperação de desastre real; transfere a produção para a região secundária

## 🧹 Limpeza

```bash
# IMPORTANT: Must stop protection before deleting vault
# 1. Stop backup and delete backup data for each protected item
# 2. Disable Site Recovery replication
# 3. Then delete the resource group

az group delete --name $RG --yes --no-wait
```

:::warning Atenção
Se a exclusão do vault falhar, siga esta ordem:
1. Pare a proteção de backup com "Excluir dados de backup" para todos os itens
2. Remova os itens replicados do Site Recovery
3. Exclua o vault
4. Exclua o grupo de recursos
:::

## ✅ Critérios de Sucesso

- [ ] Recovery Services vault criado
- [ ] Política de backup personalizada configurada (diária, retenção de 30 dias)
- [ ] Backup de VM habilitado e backup sob demanda acionado
- [ ] VM restaurada a partir do backup para uma nova VM
- [ ] Azure Backup vault criado para backup de blob
- [ ] Backup operacional de blob configurado
- [ ] Azure Site Recovery habilitado (replicação de VM para região secundária)
- [ ] Test failover executado e limpo
- [ ] Relatórios de backup configurados no Backup center
- [ ] Alertas de falha de backup configurados
- [ ] Cenários de Quebre & Conserte concluídos
- [ ] Recursos limpos (na ordem correta!)
