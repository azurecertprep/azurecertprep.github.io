---
sidebar_position: 4
title: "Desafio 28: Projetar Backup e Recuperação para Dados Não Estruturados"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Desafio 28: Projetar Backup e Recuperação para Dados Não Estruturados

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-15 | **Peso no Exame: 15-20%**

:::

## Introdução

A Vivid Creative Agency é uma empresa de design de 200 pessoas que produz campanhas publicitarias para clientes da Fortune 500. Seus ativos criativos totalizando 200 TB incluem fotografia em alta resolução (arquivos RAW, 50-100 MB cada), projetos de video 4K/8K (arquivos individuais de até 500 GB), arquivos de projeto Adobe (Photoshop, Premiere, After Effects) e entregaveis de clientes em vários formatos. Todos os ativos sao armazenados no Azure Blob Storage e Azure Files (para workspaces de projeto compartilhados).

O maior risco operacional e a delecao acidental. Somente no último trimestre, designers acidentalmente deletaram a pasta errada três vezes, uma vez perdendo 2 semanas de trabalho em uma campanha de $500K. O processo de recuperação existente requeria restauracao a partir de backups noturnos, significando que até 24 horas de trabalho poderiam ser perdidas. O diretor criativo exige recuperação em menos de uma hora para delecoes recentes, enquanto o CFO insiste em proteção de arquivo de longo prazo (alguns contratos de clientes requerem retencao de ativos por 7 anos pós-campanha).

O desafio é equilibrar múltiplas camadas de proteção: recuperação instantanea para o cenário "ops, deletei a pasta errada", backups programados para recuperação point-in-time, e arquivamento imutável para conformidade de longo prazo. Os custos de armazenamento já sao altos com 200 TB, entao a estratégia de backup deve ser consciente de custos e evitar dobrar as despesas de armazenamento.

## Habilidades do Exame Cobertas

- Recomendar uma solução de backup e recuperação para dados não estruturados

## Tarefas de Design

### Parte 1: Design de Proteção de Dados no Blob Storage

1. Avalie e configure os seguintes recursos nativos de proteção para as contas de blob storage. Para cada um, documente contra o que protege, seu impacto no custo e suas limitacoes:

<DecisionMatrix
  title="Blob Storage Protection Features"
  headers={["Protects Against", "Cost Impact", "Retention"]}
  rows={[
    {criteria: "Blob soft delete", values: ["Accidental blob deletion and overwrites - deleted blobs retained as soft-deleted for recovery", "Low - only charged for storage of soft-deleted data at standard rates for the blob access tier", "Configurable 1-365 days; after retention expires, data is permanently deleted"]},
    {criteria: "Container soft delete", values: ["Accidental container deletion - entire container and its contents recoverable", "Low - same as blob soft delete, charged for stored data during retention period", "Configurable 1-365 days; independent of blob soft delete setting"]},
    {criteria: "Blob versioning", values: ["Overwrites - every write creates a new version, previous versions preserved automatically", "High for frequently modified files - each version stored at full size, can multiply storage costs significantly", "Indefinite until explicitly deleted or managed by lifecycle policy; no automatic expiration"]},
    {criteria: "Point-in-time restore", values: ["Bulk corruption or accidental mass deletion - restores entire container to a previous state", "Moderate - requires versioning + change feed + soft delete all enabled; additional storage for change feed", "Maximum 365 days; requires continuous change tracking enabled; cannot be used with hierarchical namespace (ADLS Gen2)"]}
  ]}
  storageKey="az305-challenge-28"
/>

2. Projete uma estratégia de proteção em camadas:
   - **Camada 1 (Recuperação instantanea)**: Quais recursos fornecem restauracao self-service em minutos?
   - **Camada 2 (Backup programado)**: O que fornece backup diario com retencao de 30 dias?
   - **Camada 3 (Arquivo de longo prazo)**: O que fornece retencao de 7 anos com custo mais baixo?

3. Configure blob soft delete e container soft delete para as contas de armazenamento de produção:

```bash
# Enable blob soft delete (30-day retention)
az storage account blob-service-properties update \
  --account-name stvividcreative \
  --resource-group rg-creative-assets \
  --enable-delete-retention true \
  --delete-retention-days 30

# Enable container soft delete (30-day retention)
az storage account blob-service-properties update \
  --account-name stvividcreative \
  --resource-group rg-creative-assets \
  --enable-container-delete-retention true \
  --container-delete-retention-days 30
```

### Parte 2: Versionamento e Point-in-Time Restore

4. Habilite blob versioning e análise seu impacto no patrimonio de armazenamento de 200 TB:
   - Como o versionamento afeta os custos de armazenamento quando arquivos sao frequentemente sobrescritos?
   - Para arquivos de video que sao raramente modificados, o versionamento e custo-efetivo?
   - Para arquivos de projeto Adobe que sao salvos centenas de vezes diariamente, qual é o risco de custo?

5. Projete regras de lifecycle management para gerenciar custos de versoes:
   - Mova versoes anteriores para o tier Cool apos 7 dias
   - Mova versoes anteriores para o tier Archive apos 30 dias
   - Delete versoes anteriores com mais de 90 dias (exceto blobs com tag de conformidade)

6. Configure point-in-time restore e entenda seus pré-requisitos:
   - Quais outros recursos devem estar habilitados para point-in-time restore funcionar?
   - Qual é o período máximo de retencao para point-in-time restore?
   - Você pode restaurar um único container, ou deve restaurar a conta inteira?
   - Quais sao as limitacoes? (por exemplo, não pode ser usado com hierarchical namespace do Data Lake Storage Gen2)

### Parte 3: Azure Backup para Blobs (Vaulted Backup)

7. Projete a configuração do Azure Backup para dados blob usando o Backup vault:
   - Compare operational backup (continuo, usa recursos nativos do blob) vs. vaulted backup (programado, armazenado no vault)
   - Qual abordagem funciona para o patrimonio de 200 TB dadas as restrições de custo?
   - Qual é a frequência de backup e faixa de retencao para vaulted blob backup?

8. Configure uma política de operational backup para os ativos criativos:

```bash
# Create a Backup vault
az dataprotection backup-vault create \
  --resource-group rg-creative-assets \
  --vault-name bv-vivid-creative \
  --location eastus \
  --storage-setting "[{type:LocallyRedundant,datastore-type:VaultStore}]"

# Create a backup policy for blobs (operational tier)
az dataprotection backup-policy create \
  --resource-group rg-creative-assets \
  --vault-name bv-vivid-creative \
  --name policy-blob-30day \
  --policy '{backupRules:[{name:Default,trigger:{kind:ScheduleBased,schedule:{repeatingTimeIntervals:["R/2024-01-01T00:00:00+00:00/P1D"]}},dataStore:{dataStoreType:OperationalStore,objectType:DataStoreInfoBase}}],objectType:BackupPolicy,datasourceTypes:["Microsoft.Storage/storageAccounts/blobServices"]}'
```

9. Avalie se vaulted backup é necessário além do operational backup para o requisito de conformidade de 7 anos. Documente os trade-offs:
   - Vaulted backup armazena dados independentemente (isolado da delecao da conta de origem)
   - Vaulted backup suporta cross-region restore
   - Vaulted backup tem custos adicionais de armazenamento

### Parte 4: Backup e Recuperação do Azure Files

10. A equipe de design usa Azure Files (Premium, share de 10 TB) para colaboracao ativa em projetos. Projete a estratégia de backup:
    - Azure Backup para Azure Files usa share snapshots
    - Configure backup diario com retencao de 30 dias
    - Configure backup anual para conformidade (armazenado como snapshot)

11. Compare as limitacoes de backup do Azure Files com backup de blob:
    - Número máximo de snapshots por share (200)
    - Custos de armazenamento de snapshot (diferencial, apenas blocos alterados)
    - Opcoes de restauracao: restauracao de share completo vs. restauracao individual de arquivo/pasta

12. Crie uma arvore de decisao para a equipe de recuperação:
    - "Deletei acidentalmente um arquivo 5 minutos atras" -> Usar qual recurso?
    - "Preciso recuperar uma pasta de ontem" -> Usar qual recurso?
    - "Preciso recuperar arquivos de 2 anos atras para retencao legal" -> Usar qual recurso?
    - "A conta de armazenamento foi deletada por um administrador malicioso" -> Usar qual recurso?

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-28"
  items={[
    "Layered protection strategy documented with soft delete, versioning, and backup vault",
    "Blob soft delete and container soft delete enabled with appropriate retention periods",
    "Lifecycle management rules configured to manage versioning costs with tier transitions",
    "Azure Backup for blobs configured with appropriate backup policy type selected",
    "Azure Files backup configured with daily snapshots and appropriate retention",
    "Recovery decision tree created mapping scenarios to correct recovery method"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Pre-requisitos do Point-in-Time Restore</summary>

Point-in-time restore para blobs requer que TODOS os seguintes estejam habilitados:
1. Blob soft delete
2. Blob versioning
3. Blob change feed

Limitacoes importantes:
- Retencao máxima: 14 dias (você só pode restaurar para um ponto nos ultimos 14 dias)
- Restaura em nível de container (não blobs individuais - use versionamento para isso)
- NAO suportado com hierarchical namespace (Data Lake Storage Gen2)
- NAO suportado com premium block blobs
- Só pode restaurar block blobs (não page blobs ou append blobs)

Isso significa que point-in-time restore e proteção de Camada 1 para acidentes recentes, não para conformidade de longo prazo.

</details>

<details>
<summary>Dica 2: Gerenciamento de Custo de Versionamento</summary>

Blob versioning armazena cada versao anterior como um blob separado. Calculo de risco de custo para um arquivo Adobe de 100 MB salvo 50 vezes/dia:
- Sem versionamento: 100 MB armazenados
- Com versionamento (sem lifecycle): 100 MB x 50 versoes/dia x 30 dias = 150 GB por arquivo!

Estratégias de mitigacao:
- Use lifecycle management para mover versoes anteriores para o tier Cool apos 1-7 dias
- Delete versoes anteriores apos 30-90 dias (a menos que tenham tag de conformidade)
- Use rastreamento de último acesso para arquivar versoes não utilizadas
- Considere desabilitar versionamento para containers com arquivos de alta rotatividade e usar Azure Backup em vez disso

```json
{
  "rules": [{
    "name": "version-lifecycle",
    "type": "Lifecycle",
    "definition": {
      "actions": {
        "version": {
          "tierToCool": { "daysAfterCreationGreaterThan": 7 },
          "tierToArchive": { "daysAfterCreationGreaterThan": 30 },
          "delete": { "daysAfterCreationGreaterThan": 90 }
        }
      }
    }
  }]
}
```

</details>

<details>
<summary>Dica 3: Operational vs Vaulted Backup para Blobs</summary>

**Operational backup:**
- Usa recursos nativos de proteção de blob (soft delete, versionamento, change feed)
- Proteção continua (sem lacuna de RPO)
- Dados permanecem na conta de armazenamento de origem
- Se a conta de origem for deletada, operational backup também é perdido
- Sem cross-region restore
- Melhor para: proteção contra delecao acidental, corrupcao

**Vaulted backup:**
- Dados sao copiados para um Backup vault separado
- Programado (diario/semanal) com retencao configuravel
- Dados sobrevivem a delecao da conta de origem
- Suporta cross-region restore (com vault GRS)
- Custo adicional de armazenamento para a copia no vault
- Melhor para: proteção contra desastres em nível de conta, requisitos de conformidade

Para Vivid Creative: Use operational backup para proteção do dia a dia + vaulted backup para o requisito de conformidade de 7 anos.

</details>

<details>
<summary>Dica 4: Limites de Snapshot do Azure Files</summary>

O backup do Azure Files usa share snapshots com estas restrições:
- Máximo de 200 snapshots por file share
- Com backup diario: 200 snapshots = ~6,5 meses de retencao máxima
- Para retencao mais longa: menos snapshots diarios ou use cronograma semanal/mensal
- Armazenamento de snapshot e diferencial (só armazena blocos alterados desde o snapshot anterior)
- Exemplo de custo: share de 10 TB com 5% de alteracao diaria = ~500 GB de armazenamento de snapshot para 200 snapshots

Opcoes de restauracao:
- Restauracao de share completo para um novo share
- Restauracao individual de arquivo/pasta (recuperação em nível de item)
- Restaurar para local original ou local alternativo
- Não pode restaurar para uma conta de armazenamento diferente (mesma conta apenas)

</details>

## Recursos de Aprendizagem

- [Soft delete for blobs](https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview)
- [Blob versioning](https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview)
- [Point-in-time restore for block blobs](https://learn.microsoft.com/en-us/azure/storage/blobs/point-in-time-restore-overview)
- [Azure Backup for Azure Blobs](https://learn.microsoft.com/en-us/azure/backup/blob-backup-overview)
- [Back up Azure file shares](https://learn.microsoft.com/en-us/azure/backup/azure-file-share-backup-overview)
- [Lifecycle management for Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)

## Verificação de Conhecimento

<details>
<summary>1. Um designer acidentalmente deletou um container inteiro com 50.000 arquivos 10 minutos atras. Qual é o método de recuperação mais rápido?</summary>

**Container soft delete fornece recuperação instantanea do container inteiro deletado.** Com container soft delete habilitado, o container deletado e todo seu conteúdo sao retidos pelo período de retencao configurado (até 365 dias). A recuperação é uma única operação "undelete" que restaura o container inteiro imediatamente. Isso e mais rápido que point-in-time restore (que requer uma operação de restauracao que pode levar tempo proporcional ao tamanho dos dados) e mais rápido que restaurar do backup vault. Container soft delete e especificamente projetado para este cenário de "delecao acidental de container inteiro".

</details>

<details>
<summary>2. Uma conta de armazenamento tem 200 TB de dados com blob versioning habilitado. Designers salvam arquivos Adobe centenas de vezes diariamente. Qual é o risco principal, e como você mitiga?</summary>

**O risco principal e a explosao de custo de armazenamento por versoes acumuladas.** Cada salvamento cria uma nova versao, entao um arquivo de 100 MB salvo 100 vezes/dia gera 10 GB de dados de versao diariamente por arquivo. Mitigacao: implemente políticas de lifecycle management que movam versoes anteriores para o tier Cool apos 1-7 dias, tier Archive apos 30 dias, e delete apos 90 dias. Alternativamente, desabilite versionamento para containers de alta rotatividade e confie no Azure Backup (snapshots diarios) em vez disso, que tem custos previsiveis de cronograma fixo ao inves de custos por salvamento.

</details>

<details>
<summary>3. Uma empresa precisa garantir a recuperação de dados blob mesmo se um administrador malicioso deletar a conta de armazenamento inteira. Qual mecanismo de proteção aborda isso?</summary>

**Vaulted backup (Azure Backup para Blobs armazenado em um Backup vault) fornece proteção independente da conta de armazenamento de origem.** Operational backup depende de recursos nativos dentro da mesma conta de armazenamento e é perdido se a conta for deletada. Vaulted backup copia dados para um Backup vault separado com seu proprio RBAC, imutabilidade e lifecycle. Adicionalmente, Azure Resource Manager locks (CanNotDelete) e Azure Policy podem prevenir delecao de conta, mas apenas vaulted backup fornece recuperação apos o fato. Combine com vault imutável para proteção máxima.

</details>

<details>
<summary>4. Point-in-time restore para blobs tem retencao máxima de 14 dias. Qual alternativa fornece capacidade de recuperação point-in-time mais longa para dados blob?</summary>

**Blob versioning combinado com lifecycle management fornece recuperação point-in-time estendida.** Enquanto o recurso integrado de point-in-time restore é limitado a 14 dias, blob versioning retem cada versao indefinidamente (até que políticas de lifecycle as deletem). Você pode definir regras de lifecycle para reter versoes por 90, 180 ou 365+ dias. Para recuperação de longo prazo em nível de conformidade (7+ anos), use vaulted backup com retencao estendida configurada na política de backup. O trade-off e que versionamento requer que você identifique a versao específica do blob para restaurar, enquanto point-in-time restore pode reverter um container inteiro atomicamente.

</details>

## Limpeza

```bash
# Delete resource groups
az group delete --name rg-creative-assets --yes --no-wait

# Note: If soft delete is enabled, storage data persists until retention expires
# If you need immediate cleanup, disable soft delete first:
# az storage account blob-service-properties update \
#   --account-name stvividcreative \
#   --resource-group rg-creative-assets \
#   --enable-delete-retention false
```

---

**Próximo**: [Challenge 29: Design a Disaster Recovery Plan](/docs/az-305/business-continuity/challenge-29)
