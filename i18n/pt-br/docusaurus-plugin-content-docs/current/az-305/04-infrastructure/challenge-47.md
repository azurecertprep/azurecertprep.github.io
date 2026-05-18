---
sidebar_position: 14
title: "Challenge 47: Design Unstructured Data Migration"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 47: Design Unstructured Data Migration

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $0-3 | **Peso no Exame: 30-35%**

:::

## Introducao

A MediaVault Productions e uma empresa de midia com 2PB (petabytes) de conteudo de video armazenado em arrays NAS (Network Attached Storage) locais em suas instalacoes de producao em Los Angeles. O conteudo inclui filmagens brutas em 4K/8K, producoes editadas, materiais promocionais e um arquivo digital de conteudo dos ultimos 20 anos. A empresa decidiu migrar todo o conteudo para o Azure para reduzir custos de armazenamento, habilitar acesso global para equipes de edicao distribuidas e melhorar a recuperacao de desastres.

O desafio: sua conexao de internet e de 100Mbps dedicada. Um calculo simples revela que transferir 2PB a 100Mbps levaria aproximadamente 6,2 anos de transferencia continua na velocidade maxima. Isso claramente nao e viavel para uma migracao com prazo de conclusao de 12 meses.

Restricoes adicionais: o conteudo deve permanecer acessivel aos editores em Los Angeles durante todo o periodo de migracao (sem congelamento da producao). Novo conteudo e gerado a uma taxa de 5TB por semana. Algum conteudo tem requisitos especificos de retencao (obrigacoes contratuais de reter filmagens brutas por 7 anos). O arquivo (1,2PB) e raramente acessado (menos de uma vez por trimestre) enquanto as producoes ativas (800TB) sao acessadas diariamente.

## Habilidades do Exame Cobertas

- Recomendar uma solucao para migrar dados nao estruturados

## Tarefas de Design

### Parte 1: Analise de Largura de Banda de Rede e Selecao de Ferramentas

1. Calcule o tempo de transferencia para 2PB de dados usando cada metodo disponivel:
   - Transferencia online a 100Mbps (teorico vs. realista com overhead de protocolo)
   - Azure Data Box (80TB utilizaveis por dispositivo, tempo de pedido e envio)
   - Azure Data Box Heavy (770TB utilizaveis, logistica de envio)
   - Conexao de internet atualizada (1Gbps ou 10Gbps ExpressRoute)
2. Projete uma estrategia de migracao hibrida que combine metodos de transferencia offline (em massa) e online (incremental):
   - Transferencia em massa para o arquivo existente de 2PB e conteudo ativo
   - Sincronizacao online para novo conteudo gerado durante o periodo de migracao
   - Documente o periodo de sobreposicao onde ambos os metodos executam simultaneamente
3. Compare as ferramentas disponiveis para transferencia de dados online:
   - AzCopy: transferencia paralela, capacidade de retomada, limitacao de largura de banda
   - Azure Storage Mover: servico de migracao gerenciado com agendamento de trabalhos
   - Azure File Sync: sincronizacao continua com cloud tiering
   - Documente quando usar cada ferramenta e suas limitacoes

### Parte 2: Planejamento do Azure Data Box

4. Calcule o numero de dispositivos Azure Data Box necessarios para transferir 2PB:
   - Standard Data Box: 80TB de capacidade utilizavel por dispositivo
   - Data Box Heavy: 770TB de capacidade utilizavel por dispositivo
   - Considere o tempo de espera do pedido, tempo de copia de dados, tempo de envio e tempo de ingestao
5. Projete o plano de pedido e logistica do Data Box:
   - Quantos dispositivos podem ser usados em paralelo?
   - Qual e o tempo total de ponta a ponta desde o pedido ate os dados estarem disponiveis no Azure?
   - Como voce lida com os 800TB de conteudo ativo que muda enquanto o Data Box esta em transito?
6. Projete procedimentos de validacao de dados para transferencias do Data Box:
   - Pre-copia: arquivo de manifesto com checksums para todos os arquivos
   - Pos-ingestao: verificar contagem de arquivos, tamanho total e checksums por amostragem
   - Lidar com transferencias falhas ou corrompidas (recopiar pastas especificas)

### Parte 3: Sincronizacao Continua Durante a Migracao

7. Projete a arquitetura de sincronizacao continua para os 5TB/semana de novo conteudo gerado durante a migracao:
   - Agente Azure File Sync no servidor gateway NAS para replicacao continua
   - Politica de cloud tiering para manter arquivos quentes localmente enquanto sincroniza tudo para o Azure
   - Resolucao de conflitos para arquivos modificados tanto localmente quanto no Azure
8. Projete a arquitetura de acesso durante o periodo de transicao:
   - Editores em Los Angeles continuam trabalhando contra o NAS local (sem impacto na performance)
   - Equipes remotas em Londres e Toquio acessam conteudo do Azure Blob Storage ou Azure Files
   - Projete integracao com CDN ou Azure Front Door para distribuicao global de conteudo
9. Planeje a sequencia de cutover:
   - Verifique que todo o conteudo do Data Box foi ingerido e validado
   - Garanta que o delta do Azure File Sync e minimo (< 100GB pendentes)
   - Redirecione todos os editores locais para Azure Files ou um cache local
   - Descomissione os arrays NAS locais

### Parte 4: Otimizacao de Camadas de Armazenamento

10. Projete a estrategia de camadas de armazenamento Azure para o conteudo migrado:
    - Producoes ativas (800TB, acessadas diariamente): Hot tier ou Premium file shares
    - Arquivo recente (400GB, acessado mensalmente): Cool tier
    - Arquivo profundo (1,2PB, acessado trimestralmente ou menos): Archive tier com procedimentos de reidratacao
11. Projete politicas de lifecycle management que automaticamente movem conteudo entre camadas com base nos padroes de acesso pos-migracao.
12. Calcule o custo total de armazenamento Azure para 2PB entre camadas e compare com o custo total de propriedade do NAS local atual (hardware, energia, refrigeracao, espaco fisico, mao de obra de TI, recuperacao de desastres).

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-47"
  items={[
    "Tempo de transferencia calculado para cada metodo (online, Data Box, Data Box Heavy) com estimativas realistas de throughput",
    "Estrategia de migracao hibrida combina transferencia offline em massa com sincronizacao incremental online durante a janela de migracao",
    "Plano logistico do Data Box especifica contagem de dispositivos, cronograma de pedidos, operacoes paralelas e duracao total da migracao",
    "Arquitetura de sincronizacao continua mantem acesso dos editores localmente enquanto replica novo conteudo para o Azure",
    "Estrategia de camadas de armazenamento otimiza custos entre Hot, Cool e Archive para diferentes padroes de acesso de conteudo",
    "Comparacao de custo total demonstra TCO do armazenamento Azure contra o NAS local"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Tempos de Transferencia do Data Box</summary>

Cronograma de ponta a ponta do Data Box: processamento do pedido (1-2 dias), envio ao cliente (3-5 dias regional), copia de dados para o dispositivo (varia por volume de dados e velocidade da fonte, tipicamente 1-3 dias para 80TB de NAS de alta velocidade), envio ao datacenter Azure (3-5 dias), ingestao na conta de armazenamento (1-2 dias para padrao, mais rapido para contas grandes). Total: aproximadamente 10-15 dias por ciclo de dispositivo. Para 2PB, voce precisa de 3 unidades Data Box Heavy (770TB cada) ou 25 unidades Data Box padrao (80TB cada).

</details>

<details>
<summary>Dica 2: Otimizacao de Performance do AzCopy</summary>

O AzCopy v10 suporta transferencia paralela com concorrencia configuravel (variavel de ambiente AZCOPY_CONCURRENCY_VALUE). Para migracoes em larga escala: use `--cap-mbps` para limitar largura de banda durante o horario comercial, `--log-level` para troubleshooting, e `--include-after` para sincronizacao incremental de arquivos modificados apos uma data especifica. O AzCopy usa o endpoint da conta de armazenamento, entao a performance e limitada pela velocidade do link de rede e limites de ingress da conta de armazenamento (padrao 25Gbps para contas standard).

</details>

<details>
<summary>Dica 3: Azure Storage Mover vs. AzCopy</summary>

O Azure Storage Mover e um servico de migracao gerenciado projetado para migracoes em larga escala. Diferente do AzCopy (uma ferramenta de linha de comando), o Storage Mover fornece: uma interface de gerenciamento centralizada, arquitetura baseada em agentes (implante agentes perto dos dados de origem), agendamento e sequenciamento de trabalhos, rastreamento de progresso e relatorios integrados, e retry automatico em falhas. Use o Storage Mover quando voce tem multiplos compartilhamentos de origem, precisa de trabalhos de migracao agendados ou quer uma experiencia gerenciada. Use o AzCopy para copias ad-hoc mais simples ou automacao por script.

</details>

<details>
<summary>Dica 4: Cloud Tiering do Azure File Sync</summary>

Cloud tiering e um recurso do Azure File Sync que armazena em cache arquivos acessados frequentemente no servidor local enquanto move arquivos acessados com pouca frequencia para o Azure Files. O servidor local mantem um namespace completo (todos os metadados de arquivos/pastas) mas so mantem o conteudo dos arquivos quentes localmente. Quando um arquivo em camada e acessado, ele e transparentemente recuperado do Azure. Configure a politica de espaco livre do volume (ex.: manter 20% do volume livre) e a politica de data (mover arquivos nao acessados em N dias) para controlar o comportamento de tiering.

</details>

<details>
<summary>Dica 5: Planejamento de Reidratacao do Archive Tier</summary>

Arquivos no Azure Blob Storage Archive tier estao offline e nao podem ser lidos diretamente. Opcoes de reidratacao: Prioridade Standard (ate 15 horas) e Prioridade Alta (menos de 1 hora para blobs menores que 10GB). Para workflows de midia onde editores ocasionalmente precisam de conteudo arquivado, projete um workflow de reidratacao self-service: usuario solicita conteudo, automacao aciona reidratacao para Hot tier, usuario e notificado quando o conteudo esta disponivel. Defina uma politica de lifecycle para automaticamente re-arquivar conteudo apos 7 dias se nao for acessado novamente.

</details>

## Recursos de Aprendizagem

- [Azure Data Box overview](https://learn.microsoft.com/en-us/azure/databox/data-box-overview)
- [Azure Data Box Heavy overview](https://learn.microsoft.com/en-us/azure/databox/data-box-heavy-overview)
- [Get started with AzCopy](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10)
- [Azure Storage Mover overview](https://learn.microsoft.com/en-us/azure/storage-mover/overview)
- [Azure File Sync overview](https://learn.microsoft.com/en-us/azure/storage/file-sync/file-sync-introduction)
- [Choose an Azure solution for data transfer](https://learn.microsoft.com/en-us/azure/storage/common/storage-choose-data-transfer-solution)

## Verificacao de Conhecimento

<details>
<summary>1. Uma empresa tem 2PB de dados e uma conexao de internet de 100Mbps. Eles pedem 3 dispositivos Data Box Heavy. Durante o ciclo de 15 dias de envio/ingestao, 5TB de novos dados sao gerados. Como voce lida com o delta?</summary>

**Use AzCopy ou Azure File Sync para transferencia incremental do delta enquanto o Data Box esta em transito.** Os 5TB gerados durante o ciclo de 15 dias podem ser transferidos online: a 100Mbps com 80% de eficiencia, 5TB leva aproximadamente 5,8 dias. Estrategia: (1) Copie os dados existentes para os dispositivos Data Box Heavy, (2) Registre o timestamp de corte quando a copia for concluida, (3) Enquanto o Data Box esta em transito, inicie a sincronizacao online de todos os arquivos criados/modificados apos o corte, (4) Apos a ingestao do Data Box ser concluida, execute uma sincronizacao final do AzCopy com a flag `--include-after` para capturar qualquer delta restante. Isso garante zero perda de dados sem esperar por outro ciclo de Data Box.

</details>

<details>
<summary>2. A documentacao do Azure Data Box indica 80TB de capacidade utilizavel, mas o NAS da empresa mostra 85TB de dados em um compartilhamento. Quais sao as opcoes?</summary>

**Divida os dados entre dois dispositivos Data Box, use Data Box Heavy (770TB), ou reduza o tamanho dos dados antes da copia.** Opcoes: (1) Peca duas unidades Data Box e divida o compartilhamento (arquivos A-M no dispositivo 1, N-Z no dispositivo 2), (2) Use Data Box Heavy que tem 770TB utilizaveis e pode lidar com o compartilhamento completo em um dispositivo, (3) Faca limpeza no compartilhamento de origem antes da migracao (remova duplicatas, comprima, exclua arquivos desnecessarios). Nota: Data Box Disk (8TB por disco, ate 5 discos por pedido = 40TB) e muito pequeno. Tambem considere que o Data Box reporta 80TB utilizaveis apos overhead do sistema de arquivos; a capacidade bruta real e ligeiramente maior.

</details>

<details>
<summary>3. Editores em Los Angeles relatam que apos habilitar o Azure File Sync com cloud tiering, abrir arquivos de video arquivados leva 30-60 segundos. Como voce mantem a produtividade dos editores durante a migracao?</summary>

**Aumente a politica de data do cloud tiering ou o limite de espaco livre do volume para manter mais conteudo local.** Solucoes: (1) Defina a politica de data para que arquivos acessados nos ultimos 60-90 dias permanecam locais (cobre o conteudo de producao ativa), (2) Aumente a politica de espaco livre do volume para so mover para camada quando absolutamente necessario, (3) Pre-aquecer conteudo executando um script que toca todos os arquivos em pastas de projetos ativos, (4) Para projetos criticos, exclua pastas especificas do cloud tiering usando DFS Namespaces para separar caminhos ativos dos de arquivo. O objetivo e mover para camada apenas o arquivo de 1,2PB enquanto mantem os 800TB de conteudo ativo totalmente local ate o cutover.

</details>

## Limpeza

```bash
# This challenge is primarily design-focused
# If you deployed any Azure resources for exploration:
az group delete --name rg-az305-challenge47 --yes --no-wait
```

---

**Proximo**: [Challenge 48: Design Network Connectivity](/docs/az-305/infrastructure/challenge-48)
