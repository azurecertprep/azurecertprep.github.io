---
sidebar_position: 12
title: "Challenge 45: Design Server and Application Migration"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 45: Design Server and Application Migration

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $2-5 | **Peso no Exame: 30-35%**

:::

## Introducao

Seguindo a estrategia do Cloud Adoption Framework desenvolvida para a Precision Manufacturing (Challenge 44), a equipe de migracao completou uma descoberta de 30 dias usando appliances do Azure Migrate em ambos os data centers. A avaliacao revela 200 servidores com a seguinte distribuicao:

**VMs Windows (80):** 35 aplicacoes web IIS (.NET Framework 4.5-4.8), 15 servidores de arquivo (50TB total de armazenamento compartilhado), 10 controladores de dominio Active Directory e infraestrutura de suporte (ADFS, ADCS, NPS), 12 servidores de aplicacao executando servicos Windows customizados, 8 Remote Desktop Session Hosts.

**VMs Linux (50):** 20 servidores web (12 Apache com PHP, 8 Nginx com Node.js), 15 servidores de aplicacao (Python Flask/Django), 10 servidores utilitarios (monitoramento, logging, agendamento), 5 aplicacoes containerizadas ja executando Docker.

**Aplicacoes legadas (40):** 8 aplicacoes com enderecos IP hard-coded na configuracao, 12 aplicacoes com dependencias em versoes especificas de SO (Windows Server 2012 R2), 10 aplicacoes com dependencias de sistema de arquivos local, 10 aplicacoes com integracoes de terceiros nao documentadas.

A equipe de migracao precisa categorizar cada grupo de workload, selecionar o alvo Azure apropriado (IaaS vs PaaS), recomendar ferramentas de migracao especificas e projetar uma estrategia de validacao.

## Habilidades do Exame Cobertas

- Avaliar servidores, dados e aplicacoes on-premises para migracao
- Recomendar uma solucao para migrar workloads para infrastructure as a service (IaaS) e platform as a service (PaaS)

## Tarefas de Design

### Parte 1: Analise de Avaliacao e Descoberta

1. Revise a saida da avaliacao do Azure Migrate e crie uma matriz de categorizacao de workloads com colunas para: nome do workload, plataforma atual, dependencias descobertas, status de prontidao Azure (pronto, condicionalmente pronto, nao pronto), alvo recomendado e ferramenta de migracao.
2. Para cada grupo de workload, documente os criterios de avaliacao que determinam o alvo IaaS vs. PaaS:
   - Pode executar em PaaS sem mudancas de codigo? (versao do framework, dependencias de SO, uso de armazenamento local)
   - Se beneficia de recursos PaaS? (auto-scaling, patching gerenciado, HA integrado)
   - Existem dependencias bloqueadoras? (versao especifica de SO, modulos de kernel, servicos locais)
3. Identifique os "bloqueadores" para cada workload condicionalmente pronto e documente os passos de remediacao necessarios antes da migracao (ex: atualizar versao do .NET Framework, remover IPs hard-coded, externalizar estado de sessao).

### Parte 2: Estrategia de Migracao IaaS

4. Projete a abordagem de migracao IaaS para workloads que nao podem mover para PaaS:
   - Controladores de dominio AD: migrar usando Azure Migrate Server Migration com Entra Connect pre-configurado
   - Workloads Windows Server 2012 R2: enderece fim de suporte com Extended Security Updates no Azure
   - Servicos Windows customizados com dependencias locais: Azure VM com dimensionamento de VM apropriado
5. Selecione o metodo de replicacao apropriado do Azure Migrate para cada tipo de workload:
   - Replicacao agentless (VMs VMware): beneficios e limitacoes
   - Replicacao agent-based (servidores fisicos, Hyper-V): quando necessario
   - Documente os requisitos de largura de banda de replicacao para migrar 200 servidores dentro da timeline
6. Projete a estrategia de dimensionamento de VM: compare dimensionamento "as-on-premises" (corresponder specs atuais) vs. dimensionamento "baseado em performance" (right-size baseado em dados reais de utilizacao da avaliacao de 30 dias).

### Parte 3: Estrategia de Migracao PaaS

7. Projete o caminho de migracao PaaS para aplicacoes web elegiveis:
   - Apps .NET Framework IIS: avaliar compatibilidade com Azure App Service (Windows) usando App Service Migration Assistant
   - Apps Node.js/Python: avaliar Azure App Service (Linux) ou Azure Container Apps
   - Aplicacoes containerizadas: Azure Container Apps ou Azure Kubernetes Service
8. Projete o caminho de migracao para servidores de arquivo:
   - Avaliar Azure Files vs. Azure NetApp Files baseado em requisitos de protocolo (SMB, NFS), tiers de performance e tamanho
   - Projetar Azure File Sync para cenarios hibridos durante o periodo de transicao da migracao
9. Projete o caminho de migracao para as 5 aplicacoes ja containerizadas:
   - Push de imagens de container para Azure Container Registry
   - Implantar em Container Apps com configuracao de ambiente mapeada do Docker Compose on-premises

### Parte 4: Teste e Validacao

10. Projete um checklist de teste pre-migracao para cada tipo de workload:
    - Validacao de conectividade de rede (resolucao DNS, acessibilidade de portas, latencia para dependencias)
    - Funcionalidade da aplicacao (smoke tests, transacoes sinteticas)
    - Benchmarking de performance (comparar performance da Azure VM com baseline on-premises)
    - Integridade de dados (comparacao de hash de arquivos, verificacoes de consistencia de banco de dados)
11. Projete uma estrategia de execucao paralela para workloads criticos onde tanto on-premises quanto Azure funcionam simultaneamente, com trafego gradualmente desviado para Azure usando Azure Traffic Manager ou cutover baseado em DNS.
12. Defina criterios e procedimentos de rollback: em que ponto uma migracao e considerada falha, e como voce reverte (reabilitar VM on-premises, atualizar DNS, restaurar da replicacao)?

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-45"
  items={[
    "Workload categorization matrix covers all 200 servers with justified IaaS vs PaaS target selection",
    "Migration tool recommendation specified for each workload type (Azure Migrate, App Service Migration Assistant, Azure File Sync)",
    "VM sizing strategy justifies performance-based vs as-on-premises sizing with cost comparison",
    "PaaS migration path documented for web applications with compatibility assessment findings",
    "Testing and validation checklist covers network, application, performance, and data integrity checks",
    "Rollback criteria and procedures defined with specific thresholds triggering reversion to on-premises"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Categorias de Prontidao do Azure Migrate</summary>

Azure Migrate classifica servidores como: **Ready for Azure** (pode ser migrado como esta), **Conditionally ready** (pode ter problemas menores como tipo de boot nao suportado ou versao de SO), **Not ready** (tem problemas bloqueadores como SO nao suportado ou recursos incompativeis), **Readiness unknown** (dados insuficientes coletados). Para cada servidor condicionalmente pronto, o relatorio de avaliacao lista problemas especificos e passos de remediacao. Enderece estes antes de incluir o servidor em uma onda de migracao.

</details>

<details>
<summary>Dica 2: Dimensionamento Baseado em Performance</summary>

Dimensionamento baseado em performance usa CPU, memoria, IOPS de disco e utilizacao de rede reais coletados durante o periodo de avaliacao (30 dias recomendados). Tipicamente recomenda tamanhos de VM menores (mais baratos) que dimensionamento as-on-premises porque a maioria dos servidores e superprovisionada. Use um fator de conforto (padrao 1.3x) para adicionar margem. Defina o percentil de utilizacao (ex: percentil 95) para evitar dimensionamento baseado em picos raros enquanto ainda acomoda picos normais.

</details>

<details>
<summary>Dica 3: App Service Migration Assistant</summary>

O Azure App Service Migration Assistant escaneia aplicacoes web IIS e produz um relatorio de prontidao. Ele verifica: compatibilidade de versao do .NET Framework, metodos de autenticacao, diretorios virtuais, regras de URL rewrite, bindings HTTPS e modulos IIS instalados. Alguns bloqueadores podem ser resolvidos (ex: trocar de Windows Authentication para Entra ID), enquanto outros requerem permanecer em IaaS (ex: componentes COM, dependencias de registro Windows, assemblies GAC nao disponiveis no App Service).

</details>

<details>
<summary>Dica 4: Extended Security Updates no Azure</summary>

Windows Server 2012/2012 R2 atingiu fim de suporte, mas VMs executando no Azure recebem Extended Security Updates (ESU) gratuitas automaticamente. Isso torna o Azure um alvo atraente para workloads legados que nao podem ser atualizados imediatamente. O beneficio ESU se aplica a Azure VMs, Azure Stack HCI e Azure VMware Solution. Isso remove a dependencia "atualizar antes de migrar" e permite rehost seguido de modernizacao em data posterior.

</details>

<details>
<summary>Dica 5: Arquitetura do Azure File Sync</summary>

Azure File Sync permite que servidores de arquivo Windows on-premises permanecam operacionais enquanto sincronizam com Azure Files. Ele suporta cloud tiering (arquivos quentes permanecem locais, arquivos frios sao movidos para Azure com um ponteiro local). Durante a migracao, voce pode configurar Azure File Sync para replicar todos os dados para Azure, validar acessibilidade, entao fazer cutover apontando clientes diretamente para Azure Files ou mantendo o servidor on-premises como cache. Isso permite migracao gradual sem cutover rigido.

</details>

## Recursos de Aprendizagem

- [Azure Migrate overview](https://learn.microsoft.com/en-us/azure/migrate/migrate-services-overview)
- [Azure Migrate server assessment](https://learn.microsoft.com/en-us/azure/migrate/concepts-assessment-calculation)
- [Azure App Service Migration Assistant](https://learn.microsoft.com/en-us/azure/app-service/app-service-migration-assistant)
- [Azure File Sync overview](https://learn.microsoft.com/en-us/azure/storage/file-sync/file-sync-introduction)
- [Extended Security Updates for Windows Server](https://learn.microsoft.com/en-us/windows-server/get-started/extended-security-updates-overview)
- [Migrate servers to Azure using Azure Migrate](https://learn.microsoft.com/en-us/azure/migrate/tutorial-migrate-vmware)

## Verificacao de Conhecimento

<details>
<summary>1. Uma aplicacao IIS usa Windows Authentication e acessa um compartilhamento de arquivo local em D:\AppData. O App Service Migration Assistant reporta como "condicionalmente pronto." Quais sao os fatores bloqueadores e opcoes de remediacao?</summary>

**Dois bloqueadores: Windows Authentication e dependencia de sistema de arquivos local.** Opcoes de remediacao: (1) Para Windows Authentication: trocar para autenticacao Entra ID (mudanca de codigo), ou usar App Service com hybrid connections/integracao VNet para alcancar AD on-premises (mudanca de arquitetura), ou manter em IaaS. (2) Para sistema de arquivos local: migrar arquivos para Azure Blob Storage com mudancas de codigo da aplicacao, ou usar Azure Files montado como drive no App Service (limitado ao tier Premium), ou manter em IaaS. Se qualquer remediacao for muito custosa, rehost em uma VM Windows.

</details>

<details>
<summary>2. A avaliacao baseada em performance do Azure Migrate recomenda uma VM B2s para um servidor atualmente executando em um servidor fisico de 4-vCPU, 16GB RAM. A utilizacao de CPU atual media 8% com picos de 25%. A recomendacao e segura?</summary>

**Provavelmente segura, mas valide o timing e duracao do pico.** A B2s tem 2 vCPUs e 4GB RAM com CPU burstable. Se o servidor so atinge pico de 25% de 4 vCPUs (equivalente a 1 vCPU), a B2s pode lidar usando creditos burst. Porem, verifique: (1) Quanto tempo duram os picos? Bursting da B-series e limitado por creditos, (2) Qual e a utilizacao de memoria? Cair de 16GB para 4GB pode causar problemas se a aplicacao e intensiva em memoria, (3) O periodo de avaliacao e representativo? Uma janela de 30 dias em um periodo calmo pode perder picos trimestrais. Considere o fator de conforto e padroes sazonais antes de aceitar downsizing agressivo.

</details>

<details>
<summary>3. Cinco aplicacoes containerizadas executam Docker em VMs Linux. Devem migrar para Azure Container Apps, AKS ou VMs executando Docker?</summary>

**Azure Container Apps e o alvo recomendado para a maioria das aplicacoes containerizadas de pequeno a medio porte.** Container Apps fornece infraestrutura Kubernetes gerenciada sem overhead de gerenciamento de cluster, autoscaling integrado (incluindo escalar para zero), suporte Dapr integrado e implantacoes baseadas em revisao. Escolha AKS se: as aplicacoes precisam de configuracoes Kubernetes customizadas, requisitos de rede especificos, ou a equipe ja gerencia Kubernetes. Escolha VMs com Docker somente se: as aplicacoes requerem recursos especificos do kernel Linux, configuracoes Docker customizadas, ou tem dependencias rigidas na orquestracao Docker Compose que nao pode ser facilmente mapeada para Container Apps ou AKS.

</details>

<details>
<summary>4. Durante teste de migracao, uma aplicacao web funciona corretamente no Azure mas responde 3x mais lento que on-premises. A VM esta dimensionada corretamente baseada na avaliacao. O que voce deve investigar?</summary>

**Latencia de rede para servicos dependentes ainda on-premises.** A causa mais comum de degradacao de performance pos-migracao e aumento de latencia de rede entre a aplicacao migrada e suas dependencias que ainda nao migraram (bancos de dados, APIs, compartilhamentos de arquivo). Verifique: (1) Latencia round-trip para bancos de dados on-premises via VPN/ExpressRoute, (2) Se a aplicacao faz muitas chamadas sequenciais que amplificam latencia, (3) Performance de I/O de disco (Standard HDD vs. Premium SSD), (4) Tempo de resolucao DNS se ainda apontando para DNS on-premises. Solucao: migrar servicos dependentes na mesma onda, ou implementar cache para reduzir chamadas cross-network.

</details>

## Limpeza

```bash
# Delete todos os recursos criados neste challenge
az group delete --name rg-az305-challenge45 --yes --no-wait
```

---

**Proximo**: [Challenge 46: Design Database Migration](/docs/az-305/infrastructure/challenge-46)
