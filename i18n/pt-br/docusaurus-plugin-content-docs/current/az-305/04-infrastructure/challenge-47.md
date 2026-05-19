---
sidebar_position: 14
title: "Desafio 47: Projetar Migração de Dados Não Estruturados"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 47: projetar migração de dados não estruturados

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $0-3 | **Peso no Exame: 30-35%**

:::

## Introdução

A MediaVault Productions é uma empresa de midia com 2PB (petabytes) de conteúdo de vídeo armazenado em arrays NAS (Network Attached Storage) locais em suas instalacoes de produção em Los Angeles. O conteúdo inclui filmagens brutas em 4K/8K, producoes editadas, materiais promocionais é um arquivo digital de conteúdo dos últimos 20 anos. A empresa decidiu migrar todo o conteúdo para o Azure para reduzir custos de armazenamento, habilitar acesso global para equipes de edicao distribuidas é melhorar a recuperação de desastres.

O desafio: sua conexão de internet e de 100Mbps dedicada. Um calculo simples revela que transferir 2PB a 100Mbps levaria aproximadamente 6,2 anos de transferencia continua na velocidade máxima. Isso claramente não é viavel para uma migração com prazo de conclusão de 12 meses.

Restricoes adicionais: o conteúdo deve permanecer acessível aos editores em Los Angeles durante todo o período de migração (sem congelamento da produção). Novo conteúdo e gerado a uma taxa de 5TB por semana. Algum conteúdo tem requisitos específicos de retenção (obrigacoes contratuais de reter filmagens brutas por 7 anos). O arquivo (1,2PB) e raramente acessado (menos de uma vez por trimestre) enquanto as producoes ativas (800TB) são acessadas diariamente.

## Habilidades do exame cobertas

- Recomendar uma solução para migrar dados não estruturados

## Tarefas de design

### Parte 1: análise de largura de banda de rede e seleção de ferramentas

1. Calcule o tempo de transferencia para 2PB de dados usando cada método disponível:
   - Transferencia online a 100Mbps (teorico vs. realista com overhead de protocolo)
   - Azure Data Box (80TB utilizaveis por dispositivo, tempo de pedido e envio)
   - Azure Data Box Heavy (770TB utilizaveis, logistica de envio)
   - Conexão de internet atualizada (1Gbps ou 10Gbps ExpressRoute)
2. Projete uma estratégia de migração híbrida que combine métodos de transferencia offline (em massa) e online (incremental):
   - Transferencia em massa para o arquivo existente de 2PB e conteúdo ativo
   - Sincronizacao online para novo conteúdo gerado durante o período de migração
   - Documente o período de sobreposicao onde ambos os métodos executam simultaneamente
3. Compare as ferramentas disponíveis para transferencia de dados online:
   - AzCopy: transferencia paralela, capacidade de retomada, limitacao de largura de banda
   - Azure Storage Mover: serviço de migração gerenciado com agendamento de trabalhos
   - Azure File Sync: sincronizacao continua com cloud tiering
   - Documente quando usar cada ferramenta e suas limitacoes

### Parte 2: planejamento do Azure Data box

4. Calcule o número de dispositivos Azure Data Box necessários para transferir 2PB:
   - Standard Data Box: 80TB de capacidade utilizavel por dispositivo
   - Data Box Heavy: 770TB de capacidade utilizavel por dispositivo
   - Considere o tempo de espera do pedido, tempo de copia de dados, tempo de envio e tempo de ingestao
5. Projete o plano de pedido e logistica do Data Box:
   - Quantos dispositivos podem ser usados em paralelo?
   - Qual é o tempo total de ponta a ponta desde o pedido até os dados estarem disponíveis no Azure?
   - Como você lida com os 800TB de conteúdo ativo que muda enquanto o Data Box esta em transito?
6. Projete procedimentos de validação de dados para transferencias do Data Box:
   - Pre-copia: arquivo de manifesto com checksums para todos os arquivos
   - Pos-ingestao: verificar contagem de arquivos, tamanho total e checksums por amostragem
   - Lidar com transferencias falhas ou corrompidas (recopiar pastas específicas)

### Parte 3: sincronizacao continua durante a migração

7. Projete a arquitetura de sincronizacao continua para os 5TB/semana de novo conteúdo gerado durante a migração:
   - Agente Azure File Sync no servidor gateway NAS para replicação continua
   - Política de cloud tiering para manter arquivos quentes localmente enquanto sincroniza tudo para o Azure
   - Resolução de conflitos para arquivos modificados tanto localmente quanto no Azure
8. Projete a arquitetura de acesso durante o período de transicao:
   - Editores em Los Angeles continuam trabalhando contra o NAS local (sem impacto na performance)
   - Equipes remotas em Londres e Toquio acessam conteúdo do Azure Blob Storage ou Azure Files
   - Projete integração com CDN ou Azure Front Door para distribuição global de conteúdo
9. Planeje a sequência de cutover:
   - Verifique que todo o conteúdo do Data Box foi ingerido e validado
   - Garanta que o delta do Azure File Sync e mínimo (< 100GB pendentes)
   - Redirecione todos os editores locais para Azure Files ou um cache local
   - Descomissione os arrays NAS locais

### Parte 4: otimização de camadas de armazenamento

10. Projete a estratégia de camadas de armazenamento Azure para o conteúdo migrado:
    - Producoes ativas (800TB, acessadas diariamente): Hot tier ou Premium file shares
    - Arquivo recente (400GB, acessado mensalmente): Cool tier
    - Arquivo profundo (1,2PB, acessado trimestralmente ou menos): Archive tier com procedimentos de reidratacao
11. Projete políticas de lifecycle management que automaticamente movem conteúdo entre camadas com base nos padrões de acesso pós-migração.
12. Calcule o custo total de armazenamento Azure para 2PB entre camadas e compare com o custo total de propriedade do NAS local atual (hardware, energia, refrigeracao, espaço físico, mao de obra de TI, recuperação de desastres).

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-47"
  items={[
    "Tempo de transferencia calculado para cada método (online, Data Box, Data Box Heavy) com estimativas realistas de throughput",
    "Estratégia de migração híbrida combina transferencia offline em massa com sincronizacao incremental online durante a janela de migração",
    "Plano logistico do Data Box específica contagem de dispositivos, cronograma de pedidos, operações paralelas e duracao total da migração",
    "Arquitetura de sincronizacao continua mantem acesso dos editores localmente enquanto replica novo conteúdo para o Azure",
    "Estratégia de camadas de armazenamento otimiza custos entre Hot, Cool e Archive para diferentes padrões de acesso de conteúdo",
    "Comparacao de custo total demonstra TCO do armazenamento Azure contra o NAS local"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Tempos de Transferencia do Data Box</summary>

Cronograma de ponta a ponta do Data Box: processamento do pedido (1-2 dias), envio ao cliente (3-5 dias regional), copia de dados para o dispositivo (varia por volume de dados e velocidade da fonte, tipicamente 1-3 dias para 80TB de NAS de alta velocidade), envio ao datacenter Azure (3-5 dias), ingestao na conta de armazenamento (1-2 dias para padrão, mais rápido para contas grandes). Total: aproximadamente 10-15 dias por ciclo de dispositivo. Para 2PB, você precisa de 3 unidades Data Box Heavy (770TB cada) ou 25 unidades Data Box padrão (80TB cada).

</details>

<details>
<summary>Dica 2: Otimização de Performance do AzCopy</summary>

O AzCopy v10 suporta transferencia paralela com concorrencia configuravel (variavel de ambiente AZCOPY_CONCURRENCY_VALUE). Para migrações em larga escala: use `--cap-mbps` para limitar largura de banda durante o horario comercial, `--log-level` para troubleshooting, e `--include-after` para sincronizacao incremental de arquivos modificados apos uma data específica. O AzCopy usa o endpoint da conta de armazenamento, entao a performance é limitada pela velocidade do link de rede e limites de ingress da conta de armazenamento (padrão 25Gbps para contas standard).

</details>

<details>
<summary>Dica 3: Azure Storage Mover vs. AzCopy</summary>

O Azure Storage Mover é um serviço de migração gerenciado projetado para migrações em larga escala. Diferente do AzCopy (uma ferramenta de linha de comando), o Storage Mover fornece: uma interface de gerenciamento centralizada, arquitetura baseada em agentes (implante agentes perto dos dados de origem), agendamento e sequenciamento de trabalhos, rastreamento de progresso e relatórios integrados, e retry automático em falhas. Use o Storage Mover quando você tem múltiplos compartilhamentos de origem, precisa de trabalhos de migração agendados ou quer uma experiência gerenciada. Use o AzCopy para copias ad-hoc mais simples ou automacao por script.

</details>

<details>
<summary>Dica 4: Cloud Tiering do Azure File Sync</summary>

Cloud tiering é um recurso do Azure File Sync que armazena em cache arquivos acessados frequentemente no servidor local enquanto move arquivos acessados com pouca frequência para o Azure Files. O servidor local mantem um namespace completo (todos os metadados de arquivos/pastas) mas só mantem o conteúdo dos arquivos quentes localmente. Quando um arquivo em camada e acessado, ele e transparentemente recuperado do Azure. Configure a política de espaço livre do volume (ex.: manter 20% do volume livre) e a política de data (mover arquivos não acessados em N dias) para controlar o comportamento de tiering.

</details>

<details>
<summary>Dica 5: Planejamento de Reidratacao do Archive Tier</summary>

Arquivos no Azure Blob Storage Archive tier estao offline e não podem ser lidos diretamente. Opcoes de reidratacao: Prioridade Standard (até 15 horas) e Prioridade Alta (menos de 1 hora para blobs menores que 10GB). Para workflows de midia onde editores ocasionalmente precisam de conteúdo arquivado, projete um workflow de reidratacao self-service: usuário solicita conteúdo, automacao aciona reidratacao para Hot tier, usuário e notificado quando o conteúdo esta disponível. Defina uma política de lifecycle para automaticamente re-arquivar conteúdo apos 7 dias se não for acessado novamente.

</details>

## Recursos de aprendizagem

- [Azure Data Box overview](https://learn.microsoft.com/en-us/azure/databox/data-box-overview)
- [Azure Data Box Heavy overview](https://learn.microsoft.com/en-us/azure/databox/data-box-heavy-overview)
- [Get started with AzCopy](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10)
- [Azure Storage Mover overview](https://learn.microsoft.com/en-us/azure/storage-mover/overview)
- [Azure File Sync overview](https://learn.microsoft.com/en-us/azure/storage/file-sync/file-sync-introduction)
- [Choose an Azure solution for data transfer](https://learn.microsoft.com/en-us/azure/storage/common/storage-choose-data-transfer-solution)

## Verificação de conhecimento

<details>
<summary>1. Uma empresa tem 2PB de dados é uma conexão de internet de 100Mbps. Eles pedem 3 dispositivos Data Box Heavy. Durante o ciclo de 15 dias de envio/ingestao, 5TB de novos dados são gerados. Como você lida com o delta?</summary>

**Use AzCopy ou Azure File Sync para transferencia incremental do delta enquanto o Data Box esta em transito.** Os 5TB gerados durante o ciclo de 15 dias podem ser transferidos online: a 100Mbps com 80% de eficiência, 5TB leva aproximadamente 5,8 dias. Estratégia: (1) Copie os dados existentes para os dispositivos Data Box Heavy, (2) Registre o timestamp de corte quando a copia for concluida, (3) Enquanto o Data Box esta em transito, inicie a sincronizacao online de todos os arquivos criados/modificados apos o corte, (4) Apos a ingestao do Data Box ser concluida, execute uma sincronizacao final do AzCopy com a flag `--include-after` para capturar qualquer delta restante. Isso garante zero perda de dados sem esperar por outro ciclo de Data Box.

</details>

<details>
<summary>2. A documentação do Azure Data Box indica 80TB de capacidade utilizavel, mas o NAS da empresa mostra 85TB de dados em um compartilhamento. Quais são as opcoes?</summary>

**Divida os dados entre dois dispositivos Data Box, use Data Box Heavy (770TB), ou reduza o tamanho dos dados antes da copia.** Opcoes: (1) Peca duas unidades Data Box e divida o compartilhamento (arquivos A-M no dispositivo 1, N-Z no dispositivo 2), (2) Use Data Box Heavy que tem 770TB utilizaveis e pode lidar com o compartilhamento completo em um dispositivo, (3) Faca limpeza no compartilhamento de origem antes da migração (remova duplicatas, comprima, exclua arquivos desnecessários). Nota: Data Box Disk (8TB por disco, até 5 discos por pedido = 40TB) e muito pequeno. Também considere que o Data Box reporta 80TB utilizaveis apos overhead do sistema de arquivos; a capacidade bruta real e ligeiramente maior.

</details>

<details>
<summary>3. Editores em Los Angeles relatam que apos habilitar o Azure File Sync com cloud tiering, abrir arquivos de vídeo arquivados leva 30-60 segundos. Como você mantem a produtividade dos editores durante a migração?</summary>

**Aumente a política de data do cloud tiering ou o limite de espaço livre do volume para manter mais conteúdo local.** Soluções: (1) Defina a política de data para que arquivos acessados nos últimos 60-90 dias permanecam locais (cobre o conteúdo de produção ativa), (2) Aumente a política de espaço livre do volume para só mover para camada quando absolutamente necessário, (3) Pre-aquecer conteúdo executando um script que toca todos os arquivos em pastas de projetos ativos, (4) Para projetos críticos, exclua pastas específicas do cloud tiering usando DFS Namespaces para separar caminhos ativos dos de arquivo. O objetivo é mover para camada apenas o arquivo de 1,2PB enquanto mantem os 800TB de conteúdo ativo totalmente local até o cutover.

</details>

## Limpeza

```bash
# This challenge is primarily design-focused
# If you deployed any Azure resources for exploration:
az group delete --name rg-az305-challenge47 --yes --no-wait
```

---

**Próximo**: [Challenge 48: Design Network Connectivity](/docs/az-305/infrastructure/challenge-48)
