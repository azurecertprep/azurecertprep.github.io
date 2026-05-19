---
sidebar_position: 2
title: "Desafio 26: Projetar Backup e Recuperação para Computação"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 26: Projetar Backup e Recuperação para Computação

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-15 | **Peso no Exame: 15-20%**

:::

## Introdução

A Consolidated Manufacturing opera 50 maquinas virtuais de produção distribuidas em três regiões Azure (East US, West Europe, Southeast Asia). Sua frota de VMs inclui 5 domain controllers do Active Directory, 8 VMs SQL Server (com bancos de dados de até 2 TB), 25 servidores web IIS executando uma aplicação .NET customizada, e 12 VMs Linux executando microsservicos. Cada tipo de carga de trabalho tem diferentes requisitos de recuperação e sensibilidades de backup.

Os domain controllers requerem backups crash-consistent que capturam o estado de replicação do AD corretamente. As VMs SQL Server precisam de backups application-consistent que congelam o cache de escrita do SQL antes do snapshot. Os servidores web sao stateless e podem ser reimplantados a partir de imagens, mas precisam de backup de configuração. Recentemente, um ataque de ransomware criptografou 3 VMs antes da detecção, e a empresa descobriu que seus backups existentes também foram comprometidos porque não tinham proteção de imutabilidade.

O diretor de TI deseja uma estratégia de backup unificada gerenciada atraves do Azure Backup Center que forneca: diferentes frequencias de backup por tipo de carga de trabalho, capacidade de restauracao entre regiões para disaster recovery, backups imutáveis para proteção contra ransomware, e backup seletivo de disco para reduzir custos em VMs com discos grandes de temp/cache.

## Habilidades do Exame Cobertas

- Recomendar uma solução de backup e recuperação para computacao

## Tarefas de Design

### Parte 1: Design de Política de Backup

1. Projete políticas de backup diferenciadas para cada tipo de carga de trabalho:

| Carga de Trabalho | VMs | Frequência de Backup | Retencao | Tipo de Consistência |
|----------|-----|-------------------|-----------|-----------------|
| Domain Controllers | 5 | ? | ? | ? |
| SQL Server VMs | 8 | ? | ? | ? |
| Web Servers (IIS) | 25 | ? | ? | ? |
| Linux Microservices | 12 | ? | ? | ? |

2. Para cada carga de trabalho, determine o cronograma apropriado de pontos de recuperação:
   - Pontos de recuperação diarios: quantos dias retidos?
   - Pontos de recuperação semanais: quantas semanas retidas?
   - Pontos de recuperação mensais: quantos meses retidos?
   - Pontos de recuperação anuais: quantos anos retidos?

3. Justifique por que VMs SQL Server precisam de snapshots application-consistent ao inves de crash-consistent, e o que acontece se você usar crash-consistent para um banco de dados SQL em execução.

### Parte 2: Cross-Region Restore e Arquitetura de Vault

4. Projete a topologia de Recovery Services vault:
   - Quantos vaults você precisa? (Considere requisitos regionais e limites de gerenciamento)
   - Qual configuração de redundância para cada vault: LRS, ZRS ou GRS?
   - Onde o cross-region restore deve ser habilitado?

5. Configure cross-region restore (CRR) para as VMs SQL Server para habilitar recuperação em uma região pareada se a região primária falhar. Documente:
   - Quais pares de região se aplicam as suas três regiões
   - O RPO para cross-region restore (qual a defasagem da copia secundária)
   - O processo para acionar um cross-region restore

6. Crie um Recovery Services vault com GRS e CRR habilitados:

```bash
az backup vault create \
  --resource-group rg-backup-eastus \
  --name rsv-prod-eastus \
  --location eastus

az backup vault backup-properties set \
  --resource-group rg-backup-eastus \
  --name rsv-prod-eastus \
  --backup-storage-redundancy GeoRedundant

az backup vault backup-properties set \
  --resource-group rg-backup-eastus \
  --name rsv-prod-eastus \
  --cross-region-restore-flag true
```

### Parte 3: Vault Imutável e Proteção contra Ransomware

7. Projete uma estratégia de backup resiliente a ransomware usando:
   - Vaults imutáveis (não podem ser desabilitados uma vez habilitados com lock)
   - Soft delete (janela de recuperação de 14 dias para backups deletados)
   - Multi-user authorization (requer múltiplos aprovadores para modificar políticas de backup)

8. Implemente imutabilidade no vault e avalie os trade-offs:
   - Quais operações sao bloqueadas uma vez que a imutabilidade é habilitada?
   - Você pode reduzir períodos de retencao apos habilitar a imutabilidade?
   - Qual é a diferenca entre imutabilidade "locked" e "unlocked"?

9. Configure enhanced soft delete com período de retencao estendido:

```bash
az backup vault backup-properties set \
  --resource-group rg-backup-eastus \
  --name rsv-prod-eastus \
  --soft-delete-feature-state AlwaysOn \
  --soft-delete-duration 30
```

### Parte 4: Backup Seletivo de Disco e Otimização de Custo

10. Várias VMs SQL Server tem 4 discos cada: disco do SO (128 GB), disco de dados (2 TB), disco de log (512 GB) e disco temp (256 GB). Projete uma estratégia de backup seletivo de disco que:
    - Sempre faca backup dos discos do SO e dados
    - Exclua discos temp para economizar custo
    - Trate discos de log com base em se o backup de log do SQL esta configurado separadamente

11. Calcule a economia mensal estimada de custo de backup com backup seletivo de disco versus backup completo de VM para as 8 VMs SQL Server.

12. Configure o Backup Center para fornecer uma visao unificada em todas as três regiões e configure relatórios de backup para auditoria de conformidade.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-26"
  items={[
    "Backup policies designed with appropriate frequency and consistency type per workload",
    "Recovery Services vault topology designed with correct redundancy (GRS for cross-region)",
    "Cross-region restore enabled and tested for at least one VM",
    "Immutable vault configured with soft delete and multi-user authorization explained",
    "Selective disk backup strategy documented with cost savings calculation",
    "Backup Center configured for unified monitoring across regions"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Tipos de Consistência de Backup</summary>

O Azure Backup suporta três níveis de consistência:
- **Application-consistent**: Usa VSS (Windows) ou pré/post scripts (Linux) para pausar aplicações antes do snapshot. Necessário para SQL Server, Exchange, SharePoint. Garante que a aplicação pode iniciar sem reparo de dados.
- **File-system consistent**: Captura todos os arquivos no mesmo ponto no tempo. O sistema de arquivos e consistente, mas aplicações podem precisar de crash recovery ao restaurar.
- **Crash-consistent**: Captura o estado do disco como se a energia fosse cortada. Pode exigir reparo/recuperação do banco de dados ao restaurar. Mais rápido, mas mais arriscado para bancos de dados.

Para VMs SQL Server, sempre use application-consistent para evitar corrupcao do transaction log.

</details>

<details>
<summary>Dica 2: RPO do Cross-Region Restore</summary>

Cross-region restore usa replicação GRS, que tem um RPO de até 12 horas (o Azure não garante a defasagem exata de replicação). Pontos-chave:
- Dados CRR estao sempre pelo menos 12 horas atras da produção
- CRR esta disponível apenas quando o Azure declara um desastre regional OU para exercicios de DR
- Regiões pareadas: East US / West US, West Europe / North Europe, Southeast Asia / East Asia
- Você pode acionar CRR a qualquer momento para testes (não precisa esperar por um desastre real)

Para habilitar: o vault deve usar redundância GRS (não LRS ou ZRS), e CRR deve ser explicitamente habilitado.

</details>

<details>
<summary>Dica 3: Configuração de Vault Imutável</summary>

A imutabilidade impede que dados de backup sejam deletados ou que a retencao seja reduzida:
- **Estado unlocked**: A imutabilidade ainda pode ser desabilitada (para testes)
- **Estado locked**: A imutabilidade NAO pode ser desabilitada - isso é irreversivel
- Uma vez locked, você não pode: reduzir retencao, desabilitar backup, deletar dados de backup antes da retencao expirar

Recomendacao: Comece com imutabilidade unlocked durante a configuração inicial, valide que tudo funciona, entao aplique lock quando estiver pronto para produção. Uma vez locked, nem mesmo um Global Administrator pode deletar dados de backup.

```bash
az backup vault update \
  --resource-group rg-backup-eastus \
  --name rsv-prod-eastus \
  --immutability-state Unlocked
```

</details>

<details>
<summary>Dica 4: Backup Seletivo de Disco</summary>

O backup seletivo de disco permite escolher quais discos incluir no backup de VM, reduzindo custo e duracao do backup:

```bash
# Get disk LUNs for the VM
az vm show --resource-group rg-sql --name sql-vm-01 --query "storageProfile.dataDisks[].{name:name, lun:lun}"

# Configure backup excluding temp disk (e.g., LUN 2)
az backup protection enable-for-vm \
  --resource-group rg-backup-eastus \
  --vault-name rsv-prod-eastus \
  --vm sql-vm-01 \
  --policy-name sql-daily-policy \
  --disk-list-setting exclude \
  --diskslist 2
```

Excluir um disco temp de 256 GB de 8 VMs economiza aproximadamente $10-15/mes por VM em armazenamento de backup.

</details>

<details>
<summary>Dica 5: Política de Backup para Domain Controllers</summary>

Domain Controllers requerem consideracoes especiais de backup:
- Deve usar application-consistent (VSS) para capturar o banco de dados do AD corretamente
- Frequência de backup: pelo menos diaria (o tombstone lifetime do AD e de 60-180 dias)
- Reter pelo menos 2 backups diarios (caso um esteja corrompido)
- NAO restaure um backup de DC mais antigo que o tombstone lifetime
- Considere que restaurar um DC requer procedimentos de restauracao authoritative/non-authoritative

Para VMs Azure executando como DCs, o Azure Backup com snapshots application-consistent trata o VSS writer do Active Directory automaticamente.

</details>

## Recursos de Aprendizagem

- [Overview of Azure VM backup](https://learn.microsoft.com/en-us/azure/backup/backup-azure-vms-introduction)
- [Back up SQL Server databases in Azure VMs](https://learn.microsoft.com/en-us/azure/backup/backup-azure-sql-database)
- [Cross-region restore using Azure Backup](https://learn.microsoft.com/en-us/azure/backup/backup-create-recovery-services-vault#set-cross-region-restore)
- [Immutable vault for Azure Backup](https://learn.microsoft.com/en-us/azure/backup/backup-azure-immutable-vault-concept)
- [Selective disk backup for Azure VMs](https://learn.microsoft.com/en-us/azure/backup/selective-disk-backup-restore)
- [Backup Center overview](https://learn.microsoft.com/en-us/azure/backup/backup-center-overview)

## Verificação de Conhecimento

<details>
<summary>1. Uma empresa descobre que ransomware criptografou suas VMs de produção E deletou seus pontos de recuperação de backup. Qual recurso do Azure Backup teria prevenido a delecao do backup?</summary>

**Vaults imutáveis com estado de imutabilidade locked.** Uma vez que a imutabilidade esta locked, dados de backup não podem ser deletados antes do período de retencao expirar, mesmo por administradores ou atacantes com privilegios elevados. Adicionalmente, soft delete fornece uma janela de recuperação de 14 dias (ou configuravel até 180 dias) para itens de backup deletados acidental ou maliciosamente. Multi-user authorization adiciona outra camada ao exigir múltiplas identidades para aprovar operações destrutivas.

</details>

<details>
<summary>2. Por que VMs SQL Server devem usar backups application-consistent ao inves de crash-consistent?</summary>

**Backups application-consistent usam VSS para liberar o buffer cache e transaction log do SQL Server para o disco antes de tirar o snapshot.** Isso garante que todas as transações confirmadas sejam persistidas e o banco de dados possa iniciar de forma limpa sem executar crash recovery. Snapshots crash-consistent capturam o que esta no disco naquele instante, o que pode incluir paginas parcialmente escritas ou transações não confirmadas na memoria. Restaurar a partir de um backup crash-consistent requer que o SQL Server execute crash recovery (reproduzindo/desfazendo transações do log), que pode falhar se o log estiver inconsistente, potencialmente causando perda de dados.

</details>

<details>
<summary>3. Uma VM tem quatro discos: SO (128 GB), Dados (2 TB), Logs (512 GB) e Temp (256 GB). Quais discos devem ser excluidos do Azure Backup se backups de log do SQL estao configurados separadamente?</summary>

**Exclua tanto o disco Temp quanto o disco de Logs.** O disco temp contem apenas dados temporarios/cache que sao recriados no reinicio da VM, entao fazer backup dele desperica custos de armazenamento. Se backups de transaction log do SQL estao configurados separadamente (usando o agente SQL do Azure Backup ou uma ferramenta de terceiros), o disco de log também é redundante no backup em nível de VM porque a recuperação point-in-time e tratada pela cadeia de backup de log. Isso reduz o armazenamento de backup de 2.896 GB para 2.128 GB por VM (economia de 26%).

</details>

<details>
<summary>4. Cross-region restore tem um RPO de até 12 horas. Para uma carga de trabalho que requer RPO de 5 segundos, qual abordagem alternativa de DR você deve usar?</summary>

**Use Azure Site Recovery (ASR) para replicação continua com RPO quase sincrono.** O ASR replica escritas de disco de VM continuamente para a região destino com um RPO tipicamente de 5-15 segundos. Diferente do cross-region restore (que depende da replicação de backup GRS com defasagem de 12 horas), o ASR mantem uma replica quase em tempo real. Para bancos de dados especificamente, use SQL Always On availability groups ou Azure SQL failover groups, que oferecem RPO de 0-5 segundos com replicação sincrona ou assincrona.

</details>

## Limpeza

```bash
# Delete resource groups containing backup infrastructure
az group delete --name rg-backup-eastus --yes --no-wait
az group delete --name rg-backup-westeurope --yes --no-wait
az group delete --name rg-backup-southeastasia --yes --no-wait

# Note: Soft delete may prevent immediate deletion of backup items
# You may need to disable soft delete first or wait for retention to expire
```

---

**Próximo**: [Challenge 27: Design Backup & Recovery for Databases](/docs/az-305/business-continuity/challenge-27)
