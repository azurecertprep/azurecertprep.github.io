---
sidebar_position: 8
title: "Desafio 21: Projetar Durabilidade e Proteção de Dados"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 21: Projetar Durabilidade e Proteção de Dados

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $3-8 | **Peso no Exame: 20-25%**

:::

## Introdução

Meridian Legal Partners é um escritório de advocacia de médio porte que gerencia documentos sensíveis de casos, contratos e peticoes judiciais no Azure Storage. Eles tem três categorias de dados com diferentes requisitos de proteção: arquivos de casos ativos que advogados modificam diariamente e precisam de recuperação instantanea de exclusão acidental, documentos legais finalizados que devem ser imutáveis uma vez assinados (compliance WORM mandatado pelo tribunal), e registros de casos arquivados que devem sobreviver a uma falha completa de região Azure para recuperação de desastres.

O oficial de compliance do escritório mandatou o seguinte: todos os documentos finalizados devem ter legal holds que previnem exclusão durante litigio ativo, casos arquivados devem ser geo-redundantes com acesso de leitura da região secundária, e o escritório deve atender um SLA de disponibilidade de 99,99% para arquivos de casos ativos. Um incidente recente onde um paralegal excluiu acidentalmente uma pasta crítica de caso elevou este projeto a prioridade máxima.

Seu desafio é projetar uma estratégia abrangente de proteção de dados que combine a opcao de redundância correta para cada categoria de dados, implemente políticas de imutabilidade para compliance regulatorio, e forneça mecanismos de recuperação rápida para erros operacionais.

## Habilidades do Exame Cobertas

- Recomendar uma solução de dados para proteção e durabilidade

## Tarefas de Design

### Parte 1: Projetar Estratégia de Redundância

1. Crie um resource group e implante três storage accounts, cada uma representando uma categoria de dados diferente:
   - `active-cases` - para acesso diario de advogados (requer maior disponibilidade)
   - `finalized-docs` - para documentos legais imutáveis (requer garantias de compliance)
   - `archived-cases` - para recuperação de desastres (requer geo-redundância)
2. Para cada storage account, selecione e configure a opcao de redundância apropriada entre: LRS, ZRS, GRS, GZRS, RA-GRS ou RA-GZRS. Documente sua justificativa incluindo:
   - Número de copias e sua distribuição geográfica
   - SLA de disponibilidade alcancado (99,9%, 99,99% ou 99,9999999999% de durabilidade)
   - Capacidades de failover (automático vs manual, RTO/RPO)
   - Implicacoes de custo relativas a baseline LRS
3. Crie uma matriz de decisao comparando todas as seis opcoes de redundância com colunas para: durabilidade (nines), SLA de disponibilidade, acesso de leitura durante indisponibilidade, proteção contra falha regional e custo relativo.

### Parte 2: Implementar Recursos de Proteção de Dados

4. Habilite blob soft delete na storage account active-cases com período de retencao de 30 dias. Teste deletando e recuperando um blob.
5. Habilite container soft delete com retencao de 14 dias para proteger contra exclusão acidental de container.
6. Habilite blob versioning na conta active-cases para manter versoes anteriores de documentos modificados. Faca upload de um arquivo, modifique-o e demonstre o histórico de versoes.
7. Habilite point-in-time restore para a conta active-cases. Documente os requisitos (versioning, change feed e soft delete devem estar todos habilitados) e a janela máxima de restauracao.

### Parte 3: Implementar Políticas de Imutabilidade

8. Na storage account finalized-docs, crie um container com uma política de imutabilidade baseada em tempo:
   - Defina o período de retencao para 2.555 dias (7 anos)
   - Faca upload de um documento de teste e verifique que não pode ser excluido ou modificado
   - Documente a diferenca entre políticas bloqueadas e desbloqueadas
9. Aplique um legal hold a um container específico simulando litigio ativo:
   - Adicione uma tag de legal hold (ex.: "case-2024-meridian-v-smith")
   - Verifique que blobs sob legal hold não podem ser excluidos mesmo apos a retencao expirar
   - Documente como legal holds interagem com políticas de retencao baseadas em tempo
10. Projete uma política para transicionar documentos de mutavel (caso ativo) para imutável (finalizado), incluindo os gatilhos de workflow e etapas de validação.

### Parte 4: Projetar Backup e Recuperação

11. Configure Azure Backup para blob storage na conta active-cases:
    - Crie um backup vault e política de backup
    - Defina frequência de backup e regras de retencao
    - Documente RPO e RTO para backup operacional vs vaulted
12. Projete um runbook de recuperação que documenta procedimentos para:
    - Recuperação de blob individual (undelete de soft delete)
    - Restauracao point-in-time para corrupcao em massa/ransomware
    - Failover regional usando GRS para cenários de desastre
    - Recuperação de exclusão acidental de container

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-21"
  items={[
    "Three storage accounts deployed with different redundancy options, each with documented rationale",
    "Soft delete, versioning, and point-in-time restore all enabled and tested on active-cases account",
    "Immutability policy configured with locked time-based retention preventing blob deletion",
    "Legal hold applied and verified to block deletion independently of retention policy",
    "Decision matrix comparing all 6 redundancy options across durability, availability, cost, and failover",
    "Recovery runbook covers at least 4 scenarios with specific steps and expected RTO for each"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Opcoes de Redundância e SLAs de Disponibilidade</summary>

O SLA de disponibilidade depende tanto da opcao de redundância quanto de se o acesso de leitura esta configurado. LRS e GRS fornecem 99,9% de disponibilidade de leitura. ZRS e GZRS fornecem 99,9% para escritas. RA-GRS e RA-GZRS fornecem 99,99% de disponibilidade de leitura porque leituras podem ser servidas da região secundária. Para o maior SLA de disponibilidade (99,99%), você precisa de RA-GRS ou RA-GZRS. GZRS combina a proteção em nível de zona do ZRS no primário com geo-replicação para uma região secundária.

</details>

<details>
<summary>Dica 2: Bloqueio de Política de Imutabilidade</summary>

Uma política de retencao baseada em tempo pode estar em estado bloqueado ou desbloqueado. Enquanto desbloqueada, você pode aumentar ou diminuir o período de retencao ou deletar a política. Uma vez bloqueada, a política não pode ser deletada ou o período de retencao diminuido (apenas aumentado). O bloqueio e irreversível é necessário para compliance SEC 17a-4(f) e CFTC 1.31(d). Sempre teste com políticas desbloqueadas primeiro.

</details>

<details>
<summary>Dica 3: Pre-requisitos de Point-in-Time Restore</summary>

Point-in-time restore para block blobs requer três recursos habilitados: blob versioning, blob soft delete e blob change feed. A janela máxima de restauracao é limitada ao período de retencao do soft delete ou 365 dias, o que for menor. Funciona apenas com contas Standard general-purpose v2 e não pode restaurar blobs na camada Archive.

</details>

<details>
<summary>Dica 4: Legal Holds vs Retencao Baseada em Tempo</summary>

Legal holds e políticas de retencao baseadas em tempo servem propositos diferentes e podem coexistir no mesmo container. Um legal hold previne exclusão indefinidamente até que todas as tags de hold sejam removidas (sem limite de tempo). Retencao baseada em tempo previne exclusão até o período de retencao expirar. Se ambos sao aplicados, o blob não pode ser excluido até que ambas as condições sejam satisfeitas (hold removido E retencao expirada). Legal holds não requerem uma política bloqueada.

</details>

<details>
<summary>Dica 5: Consideracoes de Failover com Geo-Redundância</summary>

Com GRS/GZRS, o failover para a região secundária e iniciado pelo cliente (não automático) e tipicamente tem um RPO de até 15 minutos (o atraso de geo-replicação). Apos o failover, a storage account se torna LRS na nova região primária - você deve reconfigurar a redundância depois. RA-GRS/RA-GZRS permite acesso de leitura ao secundário sem failover, usando o sufixo de endpoint `-secondary`, mas os dados secundários podem estar desatualizados em até 15 minutos.

</details>

## Recursos de Aprendizagem

- [Azure Storage redundancy](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy)
- [Soft delete for blobs](https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview)
- [Blob versioning](https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview)
- [Point-in-time restore for block blobs](https://learn.microsoft.com/en-us/azure/storage/blobs/point-in-time-restore-overview)
- [Immutable storage for Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview)
- [Azure Backup for Azure Blobs](https://learn.microsoft.com/en-us/azure/backup/blob-backup-overview)
- [Best practices for data protection](https://learn.microsoft.com/en-us/azure/storage/blobs/data-protection-overview)

## Verificação de Conhecimento

<details>
<summary>1. Uma storage account usa GRS. Durante uma indisponibilidade regional na região primária, aplicações podem ler dados da região secundária?</summary>

**Não, não sem RA-GRS.** GRS padrão replica dados para a região secundária mas não expoe um endpoint de leitura la. Durante uma indisponibilidade, você deve iniciar um failover (que leva tempo e torna o secundário o novo primário) ou esperar o primário se recuperar. RA-GRS (Read-Access Geo-Redundant Storage) fornece um endpoint somente-leitura em `accountname-secondary.blob.core.windows.net` que esta sempre disponível, habilitando leituras mesmo durante uma indisponibilidade da região primária.

</details>

<details>
<summary>2. Uma organização precisa armazenar registros financeiros que não podem ser modificados ou excluidos por 7 anos (compliance SEC). Apos configurar uma política de retencao baseada em tempo, qual etapa adicional é necessária para compliance regulatorio?</summary>

**Bloquear a política de imutabilidade.** Uma política de retencao baseada em tempo desbloqueada pode ser deletada ou ter seu período de retencao reduzido, o que não atende aos requisitos SEC 17a-4(f). Bloquear a política e irreversível e garante que ninguém (incluindo proprietarios da storage account ou suporte Microsoft) pode deletar os dados antes do período de retencao expirar. Esta e a etapa que torna a política verdadeiramente compatível com WORM.

</details>

<details>
<summary>3. Uma empresa habilitou blob versioning, soft delete (retencao de 14 dias) e point-in-time restore em uma storage account. Um ataque de ransomware criptografa todos os blobs as 14h. O ataque e descoberto as 17h. Qual é a abordagem de recuperação mais rápida?</summary>

**Usar point-in-time restore para restaurar todos os blobs para seu estado as 13h59.** Point-in-time restore pode restaurar todos os blobs em um container (ou a conta inteira) para um ponto anterior no tempo com uma única operação. Isso e mais rápido que restaurar manualmente versoes individuais de blobs ou recuperar blobs individuais. A operação de restauracao cria um novo snapshot consistente da conta no timestamp especificado, revertendo todas as alteracoes feitas apos aquele ponto.

</details>

<details>
<summary>4. Qual é a diferenca de durabilidade entre ZRS e GZRS, e quando você escolheria um sobre o outro?</summary>

**ZRS fornece 99,9999999999% (12 nines) de durabilidade dentro de uma única região replicando através de 3 zonas de disponibilidade. GZRS fornece a mesma proteção em nível de zona mais replicação assincrona para uma região secundária, protegendo contra falha regional completa.** Escolha ZRS quando proteção em nível de zona é suficiente e você quer minimizar custo e complexidade. Escolha GZRS quando requisitos regulatorios ou de negocios demandam proteção contra desastres regionais (terremotos, enchentes, indisponibilidades generalizadas afetando uma região Azure inteira).

</details>

## Laboratório de Validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um resource group para este laboratório:

```bash
az group create --name rg-az305-challenge21 --location eastus
```

2. Implante uma storage account com soft delete e versioning habilitados:

```bash
az storage account create \
  --name staz305ch21$RANDOM \
  --resource-group rg-az305-challenge21 \
  --sku Standard_LRS \
  --kind StorageV2

az storage account blob-service-properties update \
  --account-name <your-account-name> \
  --resource-group rg-az305-challenge21 \
  --enable-delete-retention true \
  --delete-retention-days 30 \
  --enable-versioning true \
  --enable-container-delete-retention true \
  --container-delete-retention-days 14
```

3. Faca upload de um blob de teste, delete-o e depois recupere-o:

```bash
az storage container create --name testcontainer --account-name <your-account-name>

az storage blob upload \
  --account-name <your-account-name> \
  --container-name testcontainer \
  --name testfile.txt \
  --data "This is a recovery test" \
  --type block

az storage blob delete \
  --account-name <your-account-name> \
  --container-name testcontainer \
  --name testfile.txt

az storage blob undelete \
  --account-name <your-account-name> \
  --container-name testcontainer \
  --name testfile.txt
```

4. Verifique que o blob foi recuperado:

```bash
az storage blob show \
  --account-name <your-account-name> \
  --container-name testcontainer \
  --name testfile.txt \
  --query "properties.deletedTime"
```

:::tip
Esta mini-implantacao válida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge21 --yes --no-wait
```

---

**Próximo**: [Challenge 22: Design a Data Integration Pipeline](/docs/az-305/data-storage/challenge-22)
