---
sidebar_position: 12
title: "Desafio 45: Projetar Migração de Servidores e Aplicações"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 45: projetar migração de servidores e aplicações

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $2-5 | **Peso no Exame: 30-35%**

:::

## Introdução

Seguindo a estratégia do Cloud Adoption Framework desenvolvida para a Precision Manufacturing (Challenge 44), a equipe de migração completou uma descoberta de 30 dias usando appliances do Azure Migrate em ambos os data centers. A avaliação revela 200 servidores com a seguinte distribuição:

**VMs Windows (80):** 35 aplicações web IIS (.NET Framework 4.5-4.8), 15 servidores de arquivo (50TB total de armazenamento compartilhado), 10 controladores de dominio Active Directory e infraestrutura de suporte (ADFS, ADCS, NPS), 12 servidores de aplicação executando serviços Windows customizados, 8 Remote Desktop Session Hosts.

**VMs Linux (50):** 20 servidores web (12 Apache com PHP, 8 Nginx com Node.js), 15 servidores de aplicação (Python Flask/Django), 10 servidores utilitarios (monitoramento, logging, agendamento), 5 aplicações containerizadas já executando Docker.

**Aplicações legadas (40):** 8 aplicações com endereços IP hard-coded na configuração, 12 aplicações com dependências em versoes específicas de SO (Windows Server 2012 R2), 10 aplicações com dependências de sistema de arquivos local, 10 aplicações com integracoes de terceiros não documentadas.

A equipe de migração precisa categorizar cada grupo de workload, selecionar o alvo Azure apropriado (IaaS vs PaaS), recomendar ferramentas de migração específicas é projetar uma estratégia de validação.

## Habilidades do exame cobertas

- Avaliar servidores, dados e aplicações on-premises para migração
- Recomendar uma solução para migrar workloads para infrastructure as a service (IaaS) e platform as a service (PaaS)

## Tarefas de design

### Parte 1: análise de avaliação e descoberta

1. Revise a saida da avaliação do Azure Migrate e crie uma matriz de categorizacao de workloads com colunas para: nome do workload, plataforma atual, dependências descobertas, status de prontidao Azure (pronto, condicionalmente pronto, não pronto), alvo recomendado e ferramenta de migração.
2. Para cada grupo de workload, documente os criterios de avaliação que determinam o alvo IaaS vs. PaaS:
   - Pode executar em PaaS sem mudanças de código? (versao do framework, dependências de SO, uso de armazenamento local)
   - Se beneficia de recursos PaaS? (auto-scaling, patching gerenciado, HA integrado)
   - Existem dependências bloqueadoras? (versao específica de SO, módulos de kernel, serviços locais)
3. Identifique os "bloqueadores" para cada workload condicionalmente pronto e documente os passos de remediacao necessários antes da migração (ex: atualizar versao do .NET Framework, remover IPs hard-coded, externalizar estado de sessão).

### Parte 2: estratégia de migração IaaS

4. Projete a abordagem de migração IaaS para workloads que não podem mover para PaaS:
   - Controladores de dominio AD: migrar usando Azure Migrate Server Migration com Entra Connect pré-configurado
   - Workloads Windows Server 2012 R2: enderece fim de suporte com Extended Security Updates no Azure
   - Serviços Windows customizados com dependências locais: Azure VM com dimensionamento de VM apropriado
5. Selecione o método de replicação apropriado do Azure Migrate para cada tipo de workload:
   - Replicação agentless (VMs VMware): beneficios e limitacoes
   - Replicação agent-based (servidores físicos, Hyper-V): quando necessário
   - Documente os requisitos de largura de banda de replicação para migrar 200 servidores dentro da timeline
6. Projete a estratégia de dimensionamento de VM: compare dimensionamento "as-on-premises" (corresponder specs atuais) vs. dimensionamento "baseado em performance" (right-size baseado em dados reais de utilizacao da avaliação de 30 dias).

### Parte 3: estratégia de migração PaaS

7. Projete o caminho de migração PaaS para aplicações web elegiveis:
   - Apps .NET Framework IIS: avaliar compatibilidade com Azure App Service (Windows) usando App Service Migration Assistant
   - Apps Node.js/Python: avaliar Azure App Service (Linux) ou Azure Container Apps
   - Aplicações containerizadas: Azure Container Apps ou Azure Kubernetes Service
8. Projete o caminho de migração para servidores de arquivo:
   - Avaliar Azure Files vs. Azure NetApp Files baseado em requisitos de protocolo (SMB, NFS), tiers de performance e tamanho
   - Projetar Azure File Sync para cenários hibridos durante o período de transicao da migração
9. Projete o caminho de migração para as 5 aplicações já containerizadas:
   - Push de imagens de container para Azure Container Registry
   - Implantar em Container Apps com configuração de ambiente mapeada do Docker Compose on-premises

### Parte 4: teste e validação

10. Projete um checklist de teste pré-migração para cada tipo de workload:
    - Validação de conectividade de rede (resolução DNS, acessibilidade de portas, latência para dependências)
    - Funcionalidade da aplicação (smoke tests, transações sinteticas)
    - Benchmarking de performance (comparar performance da Azure VM com baseline on-premises)
    - Integridade de dados (comparacao de hash de arquivos, verificacoes de consistência de banco de dados)
11. Projete uma estratégia de execução paralela para workloads críticos onde tanto on-premises quanto Azure funcionam simultaneamente, com trafego gradualmente desviado para Azure usando Azure Traffic Manager ou cutover baseado em DNS.
12. Defina criterios e procedimentos de rollback: em que ponto uma migração e considerada falha, e como você reverte (reabilitar VM on-premises, atualizar DNS, restaurar da replicação)?

## Criterios de sucesso

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

Azure Migrate classifica servidores como: **Ready for Azure** (pode ser migrado como esta), **Conditionally ready** (pode ter problemas menores como tipo de boot não suportado ou versao de SO), **Not ready** (tem problemas bloqueadores como SO não suportado ou recursos incompativeis), **Readiness unknown** (dados insuficientes coletados). Para cada servidor condicionalmente pronto, o relatório de avaliação lista problemas específicos e passos de remediacao. Enderece estes antes de incluir o servidor em uma onda de migração.

</details>

<details>
<summary>Dica 2: Dimensionamento Baseado em Performance</summary>

Dimensionamento baseado em performance usa CPU, memoria, IOPS de disco e utilizacao de rede reais coletados durante o período de avaliação (30 dias recomendados). Tipicamente recomenda tamanhos de VM menores (mais baratos) que dimensionamento as-on-premises porque a maioria dos servidores e superprovisionada. Use um fator de conforto (padrão 1.3x) para adicionar margem. Defina o percentil de utilizacao (ex: percentil 95) para evitar dimensionamento baseado em picos raros enquanto ainda acomoda picos normais.

</details>

<details>
<summary>Dica 3: App Service Migration Assistant</summary>

O Azure App Service Migration Assistant escaneia aplicações web IIS e produz um relatório de prontidao. Ele verifica: compatibilidade de versao do .NET Framework, métodos de autenticação, diretorios virtuais, regras de URL rewrite, bindings HTTPS e módulos IIS instalados. Alguns bloqueadores podem ser resolvidos (ex: trocar de Windows Authentication para Entra ID), enquanto outros requerem permanecer em IaaS (ex: componentes COM, dependências de registro Windows, assemblies GAC não disponíveis no App Service).

</details>

<details>
<summary>Dica 4: Extended Security Updates no Azure</summary>

Windows Server 2012/2012 R2 atingiu fim de suporte, mas VMs executando no Azure recebem Extended Security Updates (ESU) gratuitas automaticamente. Isso torna o Azure um alvo atraente para workloads legados que não podem ser atualizados imediatamente. O beneficio ESU se aplica a Azure VMs, Azure Stack HCI e Azure VMware Solution. Isso remove a dependência "atualizar antes de migrar" e permite rehost seguido de modernizacao em data posterior.

</details>

<details>
<summary>Dica 5: Arquitetura do Azure File Sync</summary>

Azure File Sync permite que servidores de arquivo Windows on-premises permanecam operacionais enquanto sincronizam com Azure Files. Ele suporta cloud tiering (arquivos quentes permanecem locais, arquivos frios sao movidos para Azure com um ponteiro local). Durante a migração, você pode configurar Azure File Sync para replicar todos os dados para Azure, validar acessibilidade, entao fazer cutover apontando clientes diretamente para Azure Files ou mantendo o servidor on-premises como cache. Isso permite migração gradual sem cutover rigido.

</details>

## Recursos de aprendizagem

- [Azure Migrate overview](https://learn.microsoft.com/en-us/azure/migrate/migrate-services-overview)
- [Azure Migrate server assessment](https://learn.microsoft.com/en-us/azure/migrate/concepts-assessment-calculation)
- [Azure App Service Migration Assistant](https://learn.microsoft.com/en-us/azure/app-service/app-service-migration-assistant)
- [Azure File Sync overview](https://learn.microsoft.com/en-us/azure/storage/file-sync/file-sync-introduction)
- [Extended Security Updates for Windows Server](https://learn.microsoft.com/en-us/windows-server/get-started/extended-security-updates-overview)
- [Migrate servers to Azure using Azure Migrate](https://learn.microsoft.com/en-us/azure/migrate/tutorial-migrate-vmware)

## Verificação de conhecimento

<details>
<summary>1. Uma aplicação IIS usa Windows Authentication e acessa um compartilhamento de arquivo local em D:\AppData. O App Service Migration Assistant reporta como "condicionalmente pronto." Quais sao os fatores bloqueadores e opcoes de remediacao?</summary>

**Dois bloqueadores: Windows Authentication e dependência de sistema de arquivos local.** Opcoes de remediacao: (1) Para Windows Authentication: trocar para autenticação Entra ID (mudança de código), ou usar App Service com hybrid connections/integração VNet para alcancar AD on-premises (mudança de arquitetura), ou manter em IaaS. (2) Para sistema de arquivos local: migrar arquivos para Azure Blob Storage com mudanças de código da aplicação, ou usar Azure Files montado como drive no App Service (limitado ao tier Premium), ou manter em IaaS. Se qualquer remediacao for muito custosa, rehost em uma VM Windows.

</details>

<details>
<summary>2. A avaliação baseada em performance do Azure Migrate recomenda uma VM B2s para um servidor atualmente executando em um servidor físico de 4-vCPU, 16GB RAM. A utilizacao de CPU atual média 8% com picos de 25%. A recomendacao e segura?</summary>

**Provavelmente segura, mas valide o timing e duracao do pico.** A B2s tem 2 vCPUs e 4GB RAM com CPU burstable. Se o servidor só atinge pico de 25% de 4 vCPUs (equivalente a 1 vCPU), a B2s pode lidar usando creditos burst. Porém, verifique: (1) Quanto tempo duram os picos? Bursting da B-series é limitado por creditos, (2) Qual é a utilizacao de memoria? Cair de 16GB para 4GB pode causar problemas se a aplicação e intensiva em memoria, (3) O período de avaliação e representativo? Uma janela de 30 dias em um período calmo pode perder picos trimestrais. Considere o fator de conforto e padrões sazonais antes de aceitar downsizing agressivo.

</details>

<details>
<summary>3. Cinco aplicações containerizadas executam Docker em VMs Linux. Devem migrar para Azure Container Apps, AKS ou VMs executando Docker?</summary>

**Azure Container Apps e o alvo recomendado para a maioria das aplicações containerizadas de pequeno a médio porte.** Container Apps fornece infraestrutura Kubernetes gerenciada sem overhead de gerenciamento de cluster, autoscaling integrado (incluindo escalar para zero), suporte Dapr integrado e implantacoes baseadas em revisao. Escolha AKS se: as aplicações precisam de configurações Kubernetes customizadas, requisitos de rede específicos, ou a equipe já gerencia Kubernetes. Escolha VMs com Docker somente se: as aplicações requerem recursos específicos do kernel Linux, configurações Docker customizadas, ou tem dependências rigidas na orquestracao Docker Compose que não pode ser facilmente mapeada para Container Apps ou AKS.

</details>

<details>
<summary>4. Durante teste de migração, uma aplicação web funciona corretamente no Azure mas responde 3x mais lento que on-premises. A VM esta dimensionada corretamente baseada na avaliação. O que você deve investigar?</summary>

**Latência de rede para serviços dependentes ainda on-premises.** A causa mais comum de degradacao de performance pós-migração e aumento de latência de rede entre a aplicação migrada e suas dependências que ainda não migraram (bancos de dados, APIs, compartilhamentos de arquivo). Verifique: (1) Latência round-trip para bancos de dados on-premises via VPN/ExpressRoute, (2) Se a aplicação faz muitas chamadas sequenciais que amplificam latência, (3) Performance de I/O de disco (Standard HDD vs. Premium SSD), (4) Tempo de resolução DNS se ainda apontando para DNS on-premises. Solução: migrar serviços dependentes na mesma onda, ou implementar cache para reduzir chamadas cross-network.

</details>

## Limpeza

```bash
# Delete todos os recursos criados neste challenge
az group delete --name rg-az305-challenge45 --yes --no-wait
```

---

**Próximo**: [Challenge 46: Design Database Migration](/docs/az-305/infrastructure/challenge-46)
