---
sidebar_position: 6
title: "Desafio 19: Projetar uma Solução de Dados Não Estruturados"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 19: Projetar uma Solução de Dados Não Estruturados

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $3-10 | **Peso no Exame: 20-25%**

:::

## Introdução

MediaVault Studios é uma produtora de cinema e televisão que gerencia 500TB de conteúdo de vídeo em várias fases de produção. A biblioteca de conteúdo se divide da seguinte forma: 25TB (5%) de filmagens de produção ativa carregadas diariamente e acessadas frequentemente por editores e equipes de pós-produção; 125TB (25%) de projetos recentemente concluidos acessados semanalmente para clips de marketing, ativos de redes sociais e re-edicoes promocionais; e 350TB (70%) de copias master arquivadas que sao acessadas aproximadamente uma vez por ano para acordos de licenciamento, relancamentos de aniversario ou procedimentos legais.

A equipe de pós-produção de 40 editores trabalha de um escritório central em Los Angeles e requer acesso de file share SMB para software de edicao de vídeo (Adobe Premiere Pro, DaVinci Resolve) que não pode trabalhar com APIs de armazenamento de objetos. Eles precisam de acesso de baixa latência a arquivos de projeto ativos com suporte a file locking para prevenir conflitos de edicao concorrente. As workstations de edicao se conectam ao Azure via uma conexão ExpressRoute de 10 Gbps.

O orcamento mensal de armazenamento da MediaVault é $8.000. Eles precisam minimizar o custo para conteúdo arquivado enquanto garantem que podem recuperar masters arquivados dentro de 24 horas quando uma solicitacao de licenciamento chega. Adicionalmente, a equipe de analytics de dados quer executar jobs de processamento baseados em Spark em arquivos de metadados (logs JSON, arquivos de legendas, dados de color grading) que ficam junto ao conteúdo de vídeo. A empresa deve cumprir regulamentacoes de licenciamento de conteúdo que exigem políticas de imutabilidade em copias master finalizadas (sem modificacao ou exclusão por 5 anos apos o lancamento).

## Habilidades do Exame Cobertas

- Recomendar uma solução para armazenamento de dados não estruturados

## Tarefas de Design

### Parte 1: Selecao de Serviço de Armazenamento

1. Avalie os seguintes serviços de armazenamento Azure para cada porcao do conteúdo da MediaVault e recomende o serviço apropriado para cada carga de trabalho:
   - Azure Blob Storage (block blobs, append blobs, page blobs)
   - Azure Data Lake Storage Gen2
   - Azure Files (shares SMB/NFS)
   - Azure NetApp Files
2. Para a carga de trabalho dos editores que requer file shares SMB com file locking, compare Azure Files Premium vs Azure NetApp Files. Considere requisitos de throughput (ExpressRoute de 10 Gbps), sensibilidade a latência e custo.
3. Determine se Azure Data Lake Storage Gen2 (hierarchical namespace habilitado no Blob Storage) e apropriado para os arquivos de metadados que requerem processamento Spark. Explique as vantagens sobre o Blob Storage padrão para cargas de trabalho de analytics.
4. Para o arquivo de vídeo de 500TB, calcule se o Blob Storage padrão (sem hierarchical namespace) e mais economico do que Data Lake Storage Gen2.

### Parte 2: Camada de Acesso e Gerenciamento de Ciclo de Vida

5. Projete uma estratégia de camada de acesso para a biblioteca de conteúdo de vídeo. Mapeie cada categoria de conteúdo para a camada apropriada:
   - Hot tier: Para filmagens de produção ativa (acesso diario)
   - Cool tier: Para projetos recentemente concluidos (acesso semanal)
   - Cold tier: Para conteúdo acessado menos que trimestralmente
   - Archive tier: Para masters acessados uma vez por ano
6. Projete uma política de gerenciamento de ciclo de vida que transicione automaticamente o conteúdo entre camadas baseado no tempo de último acesso. Especifique as regras (ex.: mover para Cool apos 30 dias, Cold apos 90 dias, Archive apos 180 dias sem acesso).
7. Calcule o custo mensal de armazenamento para sua estratégia em camadas e compare com armazenar tudo na camada Hot. Verifique se o design cabe no orcamento de $8.000/mes.
8. Documente o processo de reidratacao e tempo para conteúdo na camada Archive. Compare reidratacao Standard (até 15 horas) vs reidratacao High Priority (menos de 1 hora para objetos menores que 10GB) e suas implicacoes de custo para o requisito de recuperação de 24 horas.

### Parte 3: Proteção de Dados e Compliance

9. Projete políticas de imutabilidade para copias master finalizadas. Avalie políticas de retencao baseadas em tempo (WORM - Write Once Read Many) versus legal holds. Determine qual abordagem atende ao requisito de 5 anos sem modificacao.
10. Projete uma estratégia de redundância de dados para cada categoria de conteúdo. Considere LRS, ZRS, GRS e GZRS baseado na criticidade e recuperabilidade de cada tipo de conteúdo.
11. Implemente políticas de soft delete e versionamento para proteger contra exclusão acidental de arquivos de produção ativos. Especifique períodos de retencao para arquivos excluidos e versoes anteriores.
12. Projete uma estratégia de controle de acesso usando Azure RBAC e regras de firewall da storage account. A equipe de edicao precisa de acesso de leitura/escrita a shares ativos, a equipe de analytics precisa de acesso somente-leitura a metadados, e conteúdo arquivado deve ser acessível apenas através de um workflow de aprovacao.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-19"
  items={[
    "Selected appropriate storage services for each workload (SMB shares, blob storage, ADLS Gen2)",
    "Designed lifecycle management policy with clear tier transition rules and timing",
    "Monthly cost estimate fits within $8,000 budget with tiered storage strategy",
    "Configured immutability policies meeting 5-year WORM compliance requirement",
    "Addressed Archive tier rehydration time within 24-hour retrieval SLA",
    "Implemented data redundancy appropriate to content criticality"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Azure Files vs Azure NetApp Files</summary>

Azure Files Premium suporta SMB 3.0 com até 100.000 IOPS e 10 GiB/s de throughput por share. Usa armazenamento backed por SSD e suporta file locking. Azure NetApp Files fornece NAS de nível empresarial com latência sub-milissegundo, até 4.500 MiB/s de throughput por volume, e suporta tanto SMB quanto NFS. Azure NetApp Files e tipicamente escolhido para cargas de trabalho que requerem throughput ou latência extremos, como edicao de vídeo, mas custa mais. Para 40 editores com ExpressRoute de 10 Gbps, Azure Files Premium pode ser suficiente a menos que latência sub-milissegundo seja necessária.

</details>

<details>
<summary>Dica 2: Precos de Camada de Acesso (aproximados)</summary>

Custos mensais de armazenamento por GB (US East, LRS): Hot = $0,018/GB, Cool = $0,01/GB, Cold = $0,0036/GB, Archive = $0,00099/GB. Custos de acesso aumentam conforme as camadas ficam mais frias: ler do Archive custa $5,00/10.000 operações mais custos de reidratacao. O trade-off chave do design: armazenamento mais barato vs acesso mais caro e mais lento. Para 350TB em Archive vs Hot: Archive = $350/mes vs Hot = $6.300/mes. A economia e substancial para dados raramente acessados.

</details>

<details>
<summary>Dica 3: Políticas de Gerenciamento de Ciclo de Vida</summary>

Regras de gerenciamento de ciclo de vida do Azure Blob Storage podem automaticamente: (1) Transicionar blobs para camadas mais frias baseado em dias desde a criação ou tempo de último acesso; (2) Deletar blobs apos um período especificado; (3) Aplicar regras baseadas em prefixo de nome de blob ou container. As regras sao avaliadas diariamente. Exemplo: mover para Cool apos 30 dias sem acesso, para Archive apos 180 dias. Importante: o rastreamento de tempo de último acesso deve ser habilitado explicitamente na storage account (não é habilitado por padrão e tem um pequeno custo adicional).

</details>

<details>
<summary>Dica 4: Data Lake Storage Gen2</summary>

ADLS Gen2 e Blob Storage com hierarchical namespace (HNS) habilitado, fornecendo operações em nível de diretório, POSIX ACLs e desempenho otimizado para frameworks de analytics (Spark, Synapse, Databricks). Suporta as mesmas camadas de acesso que Blob Storage. O hierarchical namespace adiciona um pequeno premium aos custos de armazenamento, mas melhora dramaticamente o desempenho para cargas de trabalho de analytics que enumeram diretorios ou renomeiam arquivos. Se você precisa apenas de armazenamento de objetos sem analytics, Blob Storage padrão e mais barato.

</details>

<details>
<summary>Dica 5: Armazenamento Imutável</summary>

Armazenamento imutável do Azure Blob Storage suporta dois tipos de política: (1) Retencao baseada em tempo: previne modificacao e exclusão por um período especificado (1 dia a 146.000 anos). Uma vez bloqueada, a política não pode ser encurtada. (2) Legal hold: previne modificacao/exclusão até ser explicitamente removida (sem limite de tempo). Para o requisito de 5 anos da MediaVault em copias master, uma política de retencao baseada em tempo definida para 5 anos (1.825 dias) garante compliance WORM. Políticas podem ser aplicadas em nível de container ou versao de blob.

</details>

## Recursos de Aprendizagem

- [Azure Blob Storage access tiers](https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview)
- [Azure Blob Storage lifecycle management](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)
- [Azure Data Lake Storage Gen2 introduction](https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-introduction)
- [Azure Files overview](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-introduction)
- [Azure NetApp Files overview](https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-introduction)
- [Immutable storage for Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview)
- [Archive rehydration overview](https://learn.microsoft.com/en-us/azure/storage/blobs/archive-rehydrate-overview)
- [Azure Storage redundancy](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy)

## Verificação de Conhecimento

<details>
<summary>1. Uma equipe de edicao de vídeo de 40 pessoas precisa de acesso a file share SMB com suporte a file locking. O workflow requer throughput sustentado de 5 GiB/s. Qual serviço Azure você deve recomendar?</summary>

**Azure Files Premium ou Azure NetApp Files.** Azure Files Premium suporta até 10 GiB/s de throughput por share e fornece SMB 3.0 com file locking em armazenamento backed por SSD. Azure NetApp Files oferece até 4.500 MiB/s por volume com latência sub-milissegundo. Para 5 GiB/s de throughput sustentado, Azure Files Premium e provavelmente suficiente e mais economico. Azure NetApp Files seria escolhido se latência sub-milissegundo for um requisito rigido ou se suporte ao protocolo NFS também for necessário.

</details>

<details>
<summary>2. Uma organização armazena 350TB de arquivos de vídeo acessados uma vez por ano. Eles precisam recuperar arquivos específicos dentro de 24 horas de uma solicitacao. Qual camada de acesso e prioridade de reidratacao devem usar?</summary>

**Camada Archive com reidratacao de prioridade Standard.** O armazenamento na camada Archive custa aproximadamente $0,00099/GB/mes (economizando mais de $6.000/mes comparado a camada Hot para 350TB). A reidratacao de prioridade Standard completa dentro de 15 horas, o que esta bem dentro da janela de recuperação de 24 horas. Reidratacao High Priority (menos de 1 hora) esta disponível mas custa significativamente mais e é desnecessaria dado o SLA de 24 horas. Alternativamente, considere a camada Cold se o tempo de recuperação de minutos (em vez de horas) for ocasionalmente necessário.

</details>

<details>
<summary>3. Quando você deve habilitar hierarchical namespace (Data Lake Storage Gen2) versus usar Blob Storage padrão?</summary>

**Habilite hierarchical namespace quando:** sua carga de trabalho requer operações em nível de diretório (renomear, mover, deletar diretorios atomicamente), POSIX ACLs para controle de acesso granular, ou quando usa frameworks de analytics como Apache Spark, Azure Synapse ou Databricks que se beneficiam de enumeracao eficiente de diretorios. **Use Blob Storage padrão quando:** você precisa apenas de armazenamento de objetos plano, custo e a preocupação primária (HNS adiciona um pequeno premium), ou sua carga de trabalho e puramente upload/download sem operações de diretório. Para os arquivos de metadados de analytics da MediaVault, ADLS Gen2 e apropriado; para arquivo de vídeo puro, Blob Storage padrão e mais economico.

</details>

<details>
<summary>4. Uma empresa de midia deve garantir que arquivos de vídeo master finalizados não podem ser modificados ou excluidos por 5 anos apos o lancamento. Qual recurso do Azure Storage deve ser configurado?</summary>

**Armazenamento imutável com política de retencao baseada em tempo.** Configure uma política de retencao baseada em tempo em nível de container definida para 1.825 dias (5 anos). Uma vez que a política e bloqueada, ela não pode ser encurtada ou deletada, e blobs dentro do container não podem ser modificados ou excluidos até o período de retencao expirar. Isso fornece compliance WORM (Write Once Read Many) adequado para requisitos regulatorios. Legal holds sao uma alternativa, mas sao mais adequados para retencao indefinida ligada a procedimentos legais em vez de períodos de tempo fixos.

</details>

## Limpeza

```bash
# Delete the resource group containing all MediaVault storage resources
az group delete --name rg-mediavault-storage --yes --no-wait

# If you created a separate Azure NetApp Files account (requires explicit cleanup)
az group delete --name rg-mediavault-netapp --yes --no-wait

# Note: Immutable storage policies must be unlocked/expired before deletion
# For testing, use unlocked policies that can be removed:
# az storage container immutability-policy delete --account-name <name> --container-name <name>
```

---

**Próximo**: [Challenge 20: Design Data Storage for Cost and Performance](/docs/az-305/data-storage/challenge-20)
