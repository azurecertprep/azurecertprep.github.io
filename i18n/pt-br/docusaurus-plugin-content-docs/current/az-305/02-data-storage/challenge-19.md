---
sidebar_position: 6
title: "Challenge 19: Design an Unstructured Data Solution"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 19: Design an Unstructured Data Solution

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $3-10 | **Peso no Exame: 20-25%**

:::

## Introducao

MediaVault Studios e uma produtora de cinema e televisao que gerencia 500TB de conteudo de video em varias fases de producao. A biblioteca de conteudo se divide da seguinte forma: 25TB (5%) de filmagens de producao ativa carregadas diariamente e acessadas frequentemente por editores e equipes de pos-producao; 125TB (25%) de projetos recentemente concluidos acessados semanalmente para clips de marketing, ativos de redes sociais e re-edicoes promocionais; e 350TB (70%) de copias master arquivadas que sao acessadas aproximadamente uma vez por ano para acordos de licenciamento, relancamentos de aniversario ou procedimentos legais.

A equipe de pos-producao de 40 editores trabalha de um escritorio central em Los Angeles e requer acesso de file share SMB para software de edicao de video (Adobe Premiere Pro, DaVinci Resolve) que nao pode trabalhar com APIs de armazenamento de objetos. Eles precisam de acesso de baixa latencia a arquivos de projeto ativos com suporte a file locking para prevenir conflitos de edicao concorrente. As workstations de edicao se conectam ao Azure via uma conexao ExpressRoute de 10 Gbps.

O orcamento mensal de armazenamento da MediaVault e $8.000. Eles precisam minimizar o custo para conteudo arquivado enquanto garantem que podem recuperar masters arquivados dentro de 24 horas quando uma solicitacao de licenciamento chega. Adicionalmente, a equipe de analytics de dados quer executar jobs de processamento baseados em Spark em arquivos de metadados (logs JSON, arquivos de legendas, dados de color grading) que ficam junto ao conteudo de video. A empresa deve cumprir regulamentacoes de licenciamento de conteudo que exigem politicas de imutabilidade em copias master finalizadas (sem modificacao ou exclusao por 5 anos apos o lancamento).

## Habilidades do Exame Cobertas

- Recomendar uma solucao para armazenamento de dados nao estruturados

## Tarefas de Design

### Parte 1: Selecao de Servico de Armazenamento

1. Avalie os seguintes servicos de armazenamento Azure para cada porcao do conteudo da MediaVault e recomende o servico apropriado para cada carga de trabalho:
   - Azure Blob Storage (block blobs, append blobs, page blobs)
   - Azure Data Lake Storage Gen2
   - Azure Files (shares SMB/NFS)
   - Azure NetApp Files
2. Para a carga de trabalho dos editores que requer file shares SMB com file locking, compare Azure Files Premium vs Azure NetApp Files. Considere requisitos de throughput (ExpressRoute de 10 Gbps), sensibilidade a latencia e custo.
3. Determine se Azure Data Lake Storage Gen2 (hierarchical namespace habilitado no Blob Storage) e apropriado para os arquivos de metadados que requerem processamento Spark. Explique as vantagens sobre o Blob Storage padrao para cargas de trabalho de analytics.
4. Para o arquivo de video de 500TB, calcule se o Blob Storage padrao (sem hierarchical namespace) e mais economico do que Data Lake Storage Gen2.

### Parte 2: Camada de Acesso e Gerenciamento de Ciclo de Vida

5. Projete uma estrategia de camada de acesso para a biblioteca de conteudo de video. Mapeie cada categoria de conteudo para a camada apropriada:
   - Hot tier: Para filmagens de producao ativa (acesso diario)
   - Cool tier: Para projetos recentemente concluidos (acesso semanal)
   - Cold tier: Para conteudo acessado menos que trimestralmente
   - Archive tier: Para masters acessados uma vez por ano
6. Projete uma politica de gerenciamento de ciclo de vida que transicione automaticamente o conteudo entre camadas baseado no tempo de ultimo acesso. Especifique as regras (ex.: mover para Cool apos 30 dias, Cold apos 90 dias, Archive apos 180 dias sem acesso).
7. Calcule o custo mensal de armazenamento para sua estrategia em camadas e compare com armazenar tudo na camada Hot. Verifique se o design cabe no orcamento de $8.000/mes.
8. Documente o processo de reidratacao e tempo para conteudo na camada Archive. Compare reidratacao Standard (ate 15 horas) vs reidratacao High Priority (menos de 1 hora para objetos menores que 10GB) e suas implicacoes de custo para o requisito de recuperacao de 24 horas.

### Parte 3: Protecao de Dados e Compliance

9. Projete politicas de imutabilidade para copias master finalizadas. Avalie politicas de retencao baseadas em tempo (WORM - Write Once Read Many) versus legal holds. Determine qual abordagem atende ao requisito de 5 anos sem modificacao.
10. Projete uma estrategia de redundancia de dados para cada categoria de conteudo. Considere LRS, ZRS, GRS e GZRS baseado na criticidade e recuperabilidade de cada tipo de conteudo.
11. Implemente politicas de soft delete e versionamento para proteger contra exclusao acidental de arquivos de producao ativos. Especifique periodos de retencao para arquivos excluidos e versoes anteriores.
12. Projete uma estrategia de controle de acesso usando Azure RBAC e regras de firewall da storage account. A equipe de edicao precisa de acesso de leitura/escrita a shares ativos, a equipe de analytics precisa de acesso somente-leitura a metadados, e conteudo arquivado deve ser acessivel apenas atraves de um workflow de aprovacao.

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

Azure Files Premium suporta SMB 3.0 com ate 100.000 IOPS e 10 GiB/s de throughput por share. Usa armazenamento backed por SSD e suporta file locking. Azure NetApp Files fornece NAS de nivel empresarial com latencia sub-milissegundo, ate 4.500 MiB/s de throughput por volume, e suporta tanto SMB quanto NFS. Azure NetApp Files e tipicamente escolhido para cargas de trabalho que requerem throughput ou latencia extremos, como edicao de video, mas custa mais. Para 40 editores com ExpressRoute de 10 Gbps, Azure Files Premium pode ser suficiente a menos que latencia sub-milissegundo seja necessaria.

</details>

<details>
<summary>Dica 2: Precos de Camada de Acesso (aproximados)</summary>

Custos mensais de armazenamento por GB (US East, LRS): Hot = $0,018/GB, Cool = $0,01/GB, Cold = $0,0036/GB, Archive = $0,00099/GB. Custos de acesso aumentam conforme as camadas ficam mais frias: ler do Archive custa $5,00/10.000 operacoes mais custos de reidratacao. O trade-off chave do design: armazenamento mais barato vs acesso mais caro e mais lento. Para 350TB em Archive vs Hot: Archive = $350/mes vs Hot = $6.300/mes. A economia e substancial para dados raramente acessados.

</details>

<details>
<summary>Dica 3: Politicas de Gerenciamento de Ciclo de Vida</summary>

Regras de gerenciamento de ciclo de vida do Azure Blob Storage podem automaticamente: (1) Transicionar blobs para camadas mais frias baseado em dias desde a criacao ou tempo de ultimo acesso; (2) Deletar blobs apos um periodo especificado; (3) Aplicar regras baseadas em prefixo de nome de blob ou container. As regras sao avaliadas diariamente. Exemplo: mover para Cool apos 30 dias sem acesso, para Archive apos 180 dias. Importante: o rastreamento de tempo de ultimo acesso deve ser habilitado explicitamente na storage account (nao e habilitado por padrao e tem um pequeno custo adicional).

</details>

<details>
<summary>Dica 4: Data Lake Storage Gen2</summary>

ADLS Gen2 e Blob Storage com hierarchical namespace (HNS) habilitado, fornecendo operacoes em nivel de diretorio, POSIX ACLs e desempenho otimizado para frameworks de analytics (Spark, Synapse, Databricks). Suporta as mesmas camadas de acesso que Blob Storage. O hierarchical namespace adiciona um pequeno premium aos custos de armazenamento, mas melhora dramaticamente o desempenho para cargas de trabalho de analytics que enumeram diretorios ou renomeiam arquivos. Se voce precisa apenas de armazenamento de objetos sem analytics, Blob Storage padrao e mais barato.

</details>

<details>
<summary>Dica 5: Armazenamento Imutavel</summary>

Armazenamento imutavel do Azure Blob Storage suporta dois tipos de politica: (1) Retencao baseada em tempo: previne modificacao e exclusao por um periodo especificado (1 dia a 146.000 anos). Uma vez bloqueada, a politica nao pode ser encurtada. (2) Legal hold: previne modificacao/exclusao ate ser explicitamente removida (sem limite de tempo). Para o requisito de 5 anos da MediaVault em copias master, uma politica de retencao baseada em tempo definida para 5 anos (1.825 dias) garante compliance WORM. Politicas podem ser aplicadas em nivel de container ou versao de blob.

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

## Verificacao de Conhecimento

<details>
<summary>1. Uma equipe de edicao de video de 40 pessoas precisa de acesso a file share SMB com suporte a file locking. O workflow requer throughput sustentado de 5 GiB/s. Qual servico Azure voce deve recomendar?</summary>

**Azure Files Premium ou Azure NetApp Files.** Azure Files Premium suporta ate 10 GiB/s de throughput por share e fornece SMB 3.0 com file locking em armazenamento backed por SSD. Azure NetApp Files oferece ate 4.500 MiB/s por volume com latencia sub-milissegundo. Para 5 GiB/s de throughput sustentado, Azure Files Premium e provavelmente suficiente e mais economico. Azure NetApp Files seria escolhido se latencia sub-milissegundo for um requisito rigido ou se suporte ao protocolo NFS tambem for necessario.

</details>

<details>
<summary>2. Uma organizacao armazena 350TB de arquivos de video acessados uma vez por ano. Eles precisam recuperar arquivos especificos dentro de 24 horas de uma solicitacao. Qual camada de acesso e prioridade de reidratacao devem usar?</summary>

**Camada Archive com reidratacao de prioridade Standard.** O armazenamento na camada Archive custa aproximadamente $0,00099/GB/mes (economizando mais de $6.000/mes comparado a camada Hot para 350TB). A reidratacao de prioridade Standard completa dentro de 15 horas, o que esta bem dentro da janela de recuperacao de 24 horas. Reidratacao High Priority (menos de 1 hora) esta disponivel mas custa significativamente mais e e desnecessaria dado o SLA de 24 horas. Alternativamente, considere a camada Cold se o tempo de recuperacao de minutos (em vez de horas) for ocasionalmente necessario.

</details>

<details>
<summary>3. Quando voce deve habilitar hierarchical namespace (Data Lake Storage Gen2) versus usar Blob Storage padrao?</summary>

**Habilite hierarchical namespace quando:** sua carga de trabalho requer operacoes em nivel de diretorio (renomear, mover, deletar diretorios atomicamente), POSIX ACLs para controle de acesso granular, ou quando usa frameworks de analytics como Apache Spark, Azure Synapse ou Databricks que se beneficiam de enumeracao eficiente de diretorios. **Use Blob Storage padrao quando:** voce precisa apenas de armazenamento de objetos plano, custo e a preocupacao primaria (HNS adiciona um pequeno premium), ou sua carga de trabalho e puramente upload/download sem operacoes de diretorio. Para os arquivos de metadados de analytics da MediaVault, ADLS Gen2 e apropriado; para arquivo de video puro, Blob Storage padrao e mais economico.

</details>

<details>
<summary>4. Uma empresa de midia deve garantir que arquivos de video master finalizados nao podem ser modificados ou excluidos por 5 anos apos o lancamento. Qual recurso do Azure Storage deve ser configurado?</summary>

**Armazenamento imutavel com politica de retencao baseada em tempo.** Configure uma politica de retencao baseada em tempo em nivel de container definida para 1.825 dias (5 anos). Uma vez que a politica e bloqueada, ela nao pode ser encurtada ou deletada, e blobs dentro do container nao podem ser modificados ou excluidos ate o periodo de retencao expirar. Isso fornece compliance WORM (Write Once Read Many) adequado para requisitos regulatorios. Legal holds sao uma alternativa, mas sao mais adequados para retencao indefinida ligada a procedimentos legais em vez de periodos de tempo fixos.

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

**Proximo**: [Challenge 20: Design Data Storage for Cost and Performance](/docs/az-305/data-storage/challenge-20)
