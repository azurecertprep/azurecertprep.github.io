---
sidebar_position: 1
title: "Desafio 25: Projetar Objetivos e Estratégia de Recuperação"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Desafio 25: Projetar Objetivos e Estratégia de Recuperação

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $0-5 | **Peso no Exame: 15-20%**

:::

## Introdução

O Mercy Regional Health System opera uma rede de hospitais e clinicas atendendo 500.000 pacientes em três estados. Sua infraestrutura de TI suporta tudo, desde sistemas críticos de monitoramento de pacientes até funções administrativas rotineiras. Apos um recente incidente de ransomware em um sistema de saúde vizinho que causou uma interrupcao de 72 horas nos registros de pacientes, o conselho determinou uma estratégia abrangente de disaster recovery.

O CIO categorizou todas as cargas de trabalho em três níveis com base na análise de impacto nos negocios: Nível 1 (crítico) inclui o sistema de Prontuarios Eletronicos (EHR) e monitoramento de pacientes - estes devem recuperar em 1 minuto com zero perda de dados. Nível 2 (importante) inclui o sistema de agendamento, gerenciamento de farmacia e portal de resultados de laboratório - estes podem tolerar até 1 hora de inatividade e 15 minutos de perda de dados. Nível 3 (padrão) inclui RH/folha de pagamento, portais de treinamento e comunicações internas - estes podem tolerar até 24 horas de inatividade e 4 horas de perda de dados.

O desafio é significativo: Mercy tem um orcamento de DR de apenas $5.000/mes para proteger todos os três níveis. Você deve projetar uma estratégia de recuperação que aloque adequadamente o orcamento entre os níveis, selecionando o padrão de recuperação correto (hot/warm/cold standby) para cada classe de carga de trabalho, comprovando que o SLA composto atende aos requisitos de disponibilidade.

## Habilidades do Exame Cobertas

- Recomendar uma solução de recuperação para cargas de trabalho Azure e hibridas que atenda aos objetivos de recuperação

## Tarefas de Design

### Parte 1: Análise de Impacto nos Negocios e Objetivos de Recuperação

1. Para cada nível de carga de trabalho, defina formalmente os seguintes parametros de recuperação:
   - Recovery Time Objective (RTO)
   - Recovery Point Objective (RPO)
   - Recovery Level Objective (RLO) - qual nível de funcionalidade e aceitavel durante a recuperação
   - Maximum Tolerable Downtime (MTD) - o máximo absoluto antes que a viabilidade do negocio seja ameacada

2. Calcule a porcentagem de uptime necessária para cada nível:
   - Nível 1: RTO de 1 minuto implica qual porcentagem de SLA?
   - Nível 2: RTO de 1 hora implica qual porcentagem de SLA?
   - Nível 3: RTO de 24 horas implica qual porcentagem de SLA?

3. Documente o impacto nos negocios de exceder o RTO para cada nível (perda financeira por hora, risco a segurança do paciente, penalidades regulatorias).

### Parte 2: Selecao da Estratégia de Recuperação

4. Mapeie cada nível de carga de trabalho para o padrão de recuperação apropriado:
   - **Hot standby**: Active-active ou active-passive com replicação em tempo real
   - **Warm standby**: Replica em escala reduzida que pode ser ampliada durante o failover
   - **Cold standby**: Infraestrutura definida como código, implantada sob demanda durante desastres
   - **Backup only**: Backups regulares com recuperação a partir do zero

5. Complete esta matriz de decisao para cada nível:

<DecisionMatrix
  title="DR Strategy by Workload Tier"
  headers={["Tier 1 (Critical)", "Tier 2 (Important)", "Tier 3 (Standard)"]}
  rows={[
    {criteria: "Recovery pattern", values: ["Hot standby (active-active or active-passive with synchronous replication)", "Warm standby (scaled-down replica with asynchronous replication)", "Cold standby (IaC templates + backup restore)"]},
    {criteria: "Monthly DR cost", values: ["$3,000-4,000 (80-100% of production cost for secondary region)", "$800-1,500 (30-50% of production for scaled-down replicas)", "$200-500 (5-10% for storage of backups + IaC definitions)"]},
    {criteria: "Data replication method", values: ["Synchronous geo-replication (SQL Always On, ZRS/GZRS), real-time data sync", "Asynchronous geo-replication (SQL geo-replication, GRS), 5-15 min lag acceptable", "Daily/hourly backups to GRS storage, restore from backup during disaster"]},
    {criteria: "Failover automation", values: ["Fully automated - Traffic Manager/Front Door health probes trigger instant failover", "Semi-automated - runbook triggered by alert, requires validation before cutover", "Manual - ops team deploys from IaC templates and restores data from backups"]},
    {criteria: "Testing frequency", values: ["Monthly failover drills (automated), quarterly full DR tests", "Quarterly failover tests with documented runbook validation", "Semi-annual restore tests to verify backup integrity"]}
  ]}
  storageKey="az305-challenge-25"
/>

6. Justifique por que hot standby é necessário para o Nível 1, mas seria desperdicar recursos no Nível 3.

### Parte 3: Composicao de SLA e Alocacao de Orcamento

7. Calcule o SLA composto para uma carga de trabalho Nível 1 que depende de:
   - Azure Virtual Machines (99,99% com Availability Zones)
   - Azure SQL Database Business Critical (99,995%)
   - Azure Load Balancer (99,99%)
   - Azure ExpressRoute (99,95%)

   Use a formula: SLA Composto = SLA1 x SLA2 x SLA3 x SLA4

8. Determine se o SLA composto atende ao requisito do Nível 1. Se não, projete medidas compensatorias (multi-região, caminhos redundantes) para atingir a meta.

9. Aloque o orcamento de DR de $5.000/mes entre os níveis. Considere que hot standby custa aproximadamente 80-100% dos custos de produção, warm standby custa 30-50%, e cold standby custa 5-10%.

### Parte 4: Documentação da Estratégia de Recuperação

10. Crie um documento de estratégia de recuperação que mapeie serviços Azure para cada nível:
    - Nível 1: Quais serviços Azure fornecem RTO inferior a um minuto?
    - Nível 2: Quais serviços fornecem RTO de 1 hora com custo moderado?
    - Nível 3: Quais serviços permitem recuperação em 24 horas com custo mínimo?

11. Defina o cronograma de testes de DR e criterios de validação para cada nível.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-25"
  items={[
    "RTO, RPO, RLO, and MTD defined for all three workload tiers with business justification",
    "Appropriate recovery pattern (hot/warm/cold) selected for each tier with cost analysis",
    "Composite SLA calculated correctly using multiplication formula",
    "Budget allocation across tiers documented with cost-per-tier breakdown totaling $5K/month",
    "Recovery strategy maps specific Azure services to each tier's requirements",
    "DR testing schedule defined with appropriate frequency per tier"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Formula de Composicao de SLA</summary>

Quando serviços estao encadeados em serie (cada um depende do anterior), multiplique seus SLAs:

SLA Composto = 0,9999 x 0,99995 x 0,9999 x 0,9995 = 0,99925 (aproximadamente 99,925%)

Isso significa aproximadamente 6,5 horas de inatividade por ano. Para melhorar isso, adicione redundância (caminhos paralelos) onde:

Disponibilidade com redundância = 1 - (1 - SLA_A) x (1 - SLA_B)

Por exemplo, circuitos ExpressRoute duplos: 1 - (1 - 0,9995)^2 = 0,99999975

</details>

<details>
<summary>Dica 2: Estimativas de Custo por Padrão de Recuperação</summary>

Custos mensais aproximados para uma aplicação tipica de 3 camadas (web + app + DB):
- **Hot standby** (active-active): $3.000-4.000/mes (replica completa em execução)
- **Warm standby** (replica em escala reduzida): $800-1.500/mes (SKUs minimos, pode escalar)
- **Cold standby** (IaC + backups): $100-300/mes (apenas armazenamento para backups/templates)
- **Backup only**: $50-150/mes (apenas armazenamento do vault de backup)

Sugestao de alocacao de orcamento: Nível 1 recebe 60-70%, Nível 2 recebe 20-30%, Nível 3 recebe 5-10%.

</details>

<details>
<summary>Dica 3: Serviços Azure por Velocidade de Recuperação</summary>

**RTO inferior a um minuto (Nível 1)**:
- Azure SQL Database com failover groups (failover automático)
- Availability Zones para VMs (zone-redundant)
- Azure Front Door / Traffic Manager (failover baseado em DNS)
- Cosmos DB com multi-region writes

**RTO de 1 hora (Nível 2)**:
- Azure Site Recovery (RPO de 15 minutos, minutos para failover)
- Azure SQL geo-restore
- Reimplantacao de VM a partir de imagens gerenciadas

**RTO de 24 horas (Nível 3)**:
- Azure Backup com restauracao
- Reimplantacao a partir de templates ARM/Bicep
- Backups em cold storage com restauracao manual

</details>

<details>
<summary>Dica 4: Calculo de Porcentagem de Uptime</summary>

Para converter RTO em porcentagem mínima de uptime:
- Minutos em um ano: 525.600
- RTO 1 min: (525.600 - 1) / 525.600 = 99,99981% (mas isso assume apenas UMA interrupcao por ano)
- De forma mais realista, considere metas mensais de SLA:
  - 99,99% = 4,32 min de inatividade/mes
  - 99,95% = 21,6 min de inatividade/mes
  - 99,9% = 43,2 min de inatividade/mes
  - 99% = 7,2 horas de inatividade/mes

</details>

## Recursos de Aprendizagem

- [Business continuity and disaster recovery - Cloud Adoption Framework](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/design-area/management-business-continuity-disaster-recovery)
- [Azure Well-Architected Framework - Reliability pillar](https://learn.microsoft.com/en-us/azure/well-architected/reliability/)
- [Backup and disaster recovery for Azure applications](https://learn.microsoft.com/en-us/azure/architecture/framework/resiliency/backup-and-recovery)
- [SLA summary for Azure services](https://www.microsoft.com/licensing/docs/view/Service-Level-Agreements-SLA-for-Online-Services)
- [Composite SLA calculation](https://learn.microsoft.com/en-us/azure/architecture/framework/resiliency/business-metrics#composite-slas)

## Verificação de Conhecimento

<details>
<summary>1. Uma carga de trabalho tem SLA composto de 99,9% mas requer 99,99% de disponibilidade. Qual mudança arquitetural fecha essa lacuna de forma mais eficaz?</summary>

**Adicionar redundância multi-região com failover automático.** Quando uma implantacao em região única não consegue atingir o SLA alvo apenas pela multiplicacao de componentes, implantar em uma segunda região e usar um balanceador de carga global (Azure Front Door ou Traffic Manager) cria caminhos de disponibilidade paralelos. A formula se torna: 1 - (1 - 0,999)^2 = 0,999999 (99,9999%), que excede o requisito. A contrapartida e aumento de custo e complexidade de sincronizacao de dados.

</details>

<details>
<summary>2. Por que você escolheria warm standby ao inves de hot standby para uma carga de trabalho Nível 2 com RTO de 1 hora?</summary>

**Warm standby custa 30-50% da produção versus 80-100% para hot standby, e o RTO de 1 hora fornece tempo suficiente para escalar os recursos.** Hot standby mantem uma replica em capacidade total funcionando o tempo todo, o que é desnecessario quando você tem 60 minutos para detectar a falha, acionar o failover e escalar uma replica mínima. Warm standby mantem uma versao em escala reduzida em execução (por exemplo, SKUs de VM menores, databases com DTU mais baixo) que pode ser escalada para capacidade de produção dentro da janela de RTO.

</details>

<details>
<summary>3. O sistema EHR de um hospital depende de quatro serviços Azure, cada um com SLA de 99,99%. Qual é o SLA composto, e ele atende a uma meta de 99,99%?</summary>

**O SLA composto e 0,9999^4 = 99,96%, que NAO atende a meta de 99,99%.** Quando múltiplos serviços estao encadeados em serie, o SLA composto e sempre menor que o SLA individual mais fraco. Cada dependência adicional reduz a disponibilidade geral. Para atingir 99,99% com quatro dependências, você precisa de SLAs individuais mais altos (por exemplo, tier Business Critical a 99,995%) ou redundância em uma ou mais camadas para compensar o efeito multiplicativo.

</details>

<details>
<summary>4. Qual é a diferenca principal entre RTO e MTD (Maximum Tolerable Downtime)?</summary>

**RTO e o tempo alvo de recuperação para sistemas de TI; MTD e o tempo máximo absoluto antes que o proprio negocio seja ameacado.** O RTO deve sempre ser menor que o MTD para fornecer uma margem de segurança. Por exemplo, o sistema EHR de um hospital pode ter um RTO de 1 minuto (meta para restaurar o serviço) mas um MTD de 15 minutos (além do qual a segurança do paciente esta em risco e violacoes regulatorias ocorrem). A diferenca entre RTO e MTD e sua margem de segurança para complicacoes inesperadas na recuperação.

</details>

## Laboratório de Validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um resource group para este laboratório:

```bash
az group create --name rg-az305-challenge25 --location eastus
```

2. Implante duas VMs em diferentes availability zones para observar a composicao de SLA:

```bash
az vm create \
  --resource-group rg-az305-challenge25 \
  --name vm-zone1 \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --zone 1 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --no-wait

az vm create \
  --resource-group rg-az305-challenge25 \
  --name vm-zone2 \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --zone 2 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --no-wait
```

3. Verifique o posicionamento de zona para cada VM:

```bash
az vm show \
  --resource-group rg-az305-challenge25 \
  --name vm-zone1 \
  --query "{name:name, zone:zones[0]}" -o table

az vm show \
  --resource-group rg-az305-challenge25 \
  --name vm-zone2 \
  --query "{name:name, zone:zones[0]}" -o table
```

4. Confirme o tier de SLA listando as atribuicoes de availability zone:

```bash
az vm list \
  --resource-group rg-az305-challenge25 \
  --query "[].{Name:name, Zone:zones[0]}" -o table
```

5. Verifique que ambas as VMs estao em execução em zonas separadas (esta configuração qualifica para SLA de 99,99%):

```bash
az vm list \
  --resource-group rg-az305-challenge25 \
  --query "length(unique([].zones[0]))" -o tsv
```

:::tip
Esta mini-implantacao válida suas decisoes de design com recursos reais do Azure. E opcional, mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge25 --yes --no-wait
```

---

**Próximo**: [Challenge 26: Design Backup & Recovery for Compute](/docs/az-305/business-continuity/challenge-26)
