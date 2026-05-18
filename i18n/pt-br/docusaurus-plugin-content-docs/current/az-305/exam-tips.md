---
sidebar_position: 3
title: "Dicas e Estrategia para o Exame"
---

# Dicas e Estrategia para o Exame

O AZ-305 testa sua capacidade de tomar decisoes de design. Diferente do AZ-104, raramente ha um unico comando CLI "correto". Em vez disso, voce avaliara cenarios e escolhera a melhor solucao entre varias opcoes validas.

## Formato do Exame

| Detalhe | Valor |
|---------|-------|
| **Numero de questoes** | ~40-60 questoes |
| **Duracao** | 100-120 minutos |
| **Nota de aprovacao** | 700 de 1000 |
| **Tipos de questao** | Multipla escolha, multipla resposta, arrastar e soltar, estudo de caso |
| **Penalidade por respostas erradas** | Nenhuma, sempre responda todas as questoes |
| **Pode voltar?** | Sim, dentro de uma secao. Nao, entre secoes. |
| **Labs?** | Sem labs ativos (diferente do AZ-104). Questoes puramente baseadas em cenarios. |

## Tipos de Questao que Voce Encontrara

### Multipla Escolha Baseada em Cenario
O tipo mais comum. Um cenario de negocio de 2-3 paragrafos seguido de "qual solucao atende os requisitos?" Leia os requisitos com atencao. Frequentemente uma unica palavra (como "minimizar custo" vs "minimizar tempo de inatividade") muda a resposta correta.

### Multipla Resposta ("Selecione DUAS/TRES")
Escolha exatamente o numero especificado. Comum para questoes como "quais DOIS servicos voce deve incluir no seu design?"

### Estudo de Caso
Um cenario de multiplas paginas (perfil da empresa, arquitetura existente, requisitos) com 4-7 questoes. Voce nao pode retornar ao estudo de caso apos avancar para a proxima secao.

:::warning Estrategia para Estudo de Caso

Leia a aba de **requisitos** primeiro, depois o **ambiente existente**. A maioria das questoes testa apenas um requisito especifico. Nao perca tempo memorizando todo o cenario.

:::

### Arrastar e Soltar / Ordenacao
Associe servicos a requisitos, ou ordene etapas de implantacao. Comum para planejamento de migracao e camadas de arquitetura.

## Como o AZ-305 Difere do AZ-104

O modelo mental e completamente diferente:

| Pensamento AZ-104 | Pensamento AZ-305 |
|--------------------|-------------------|
| "Como crio uma VNet?" | "Devo usar hub-spoke ou Virtual WAN?" |
| "Qual comando CLI implanta um App Service?" | "Isso deveria ser App Service, Container Apps ou Functions?" |
| "Como configuro regras de NSG?" | "Devo usar NSG, Azure Firewall ou WAF aqui?" |

**O exame testa o PORQUE, nao o COMO.**

## Estrategia de Estudo

### Semanas 1-2: Solucoes de Infraestrutura (30-35%)
Este e o maior dominio. Foque em selecao de computacao (VM vs container vs serverless), redes (VPN vs ExpressRoute, arvore de decisao de balanceamento de carga) e arquitetura de aplicacao (mensageria, eventos, cache).

### Semanas 3-4: Identidade, Governanca e Monitoramento (25-30%)
Conheca padroes de autenticacao/autorizacao, design de Key Vault, hierarquias de management groups e Azure Policy. Monitoramento (Log Analytics, App Insights) conecta-se a todos os outros dominios.

### Semana 5: Armazenamento de Dados + Continuidade de Negocios (35-45% combinado)
Selecao relacional vs nao-relacional, decisoes de tier/computacao, opcoes de redundancia, estrategias de backup/DR, padroes de HA. Esses dois dominios se sobrepoe significativamente.

### Semana 6: Revisao + Pratica
- Faca a [Avaliacao Pratica Gratuita](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-305/practice/assessment?assessment-type=practice&assessmentId=15)
- Revise a [Matriz de Cobertura](/docs/az-305/coverage-matrix) para identificar lacunas
- Refaca os desafios capstone (13, 24, 33, 50)

## Pegadinhas Comuns do Exame

:::warning Coisas que pegam as pessoas desprevenidas

1. **Niveis de consistencia do Cosmos DB**: Consistencia forte oferece leituras apos gravacoes, mas custa 2x RUs e limita gravacoes multi-regiao. Eventual e barato mas com dados desatualizados. Conheca os 5 niveis e trade-offs.
2. **Tiers do SQL Database**: Business Critical inclui HA integrada (replicas de leitura), General Purpose nao. Hyperscale e para bancos maiores que 4TB.
3. **Composicao de SLA**: Dois servicos com 99,9% cada resultam em 99,8% composto (0,999 x 0,999). Adicionar redundancia AUMENTA o SLA composto.
4. **ExpressRoute vs VPN Gateway**: ExpressRoute nao passa pela internet publica. Mas requer um provedor de conectividade. Saiba quando cada um e apropriado.
5. **Event Grid vs Event Hubs vs Service Bus**: Event Grid = reativo (eventos aconteceram), Event Hubs = streaming (telemetria de alto throughput), Service Bus = mensageria corporativa (entrega garantida, ordenacao).
6. **Azure Front Door vs Traffic Manager**: Front Door opera na Camada 7 (HTTP), Traffic Manager no nivel DNS. Front Door e preferido para workloads web.
7. **Private Endpoints vs Service Endpoints**: Private Endpoints fornecem um IP privado na sua VNet. Service Endpoints roteiam pelo backbone Microsoft mas o servico ainda tem IP publico.
8. **Managed Identity vs Service Principal**: Sempre prefira managed identity quando a origem e um recurso Azure. Service principals sao para origens fora do Azure.
9. **Premium SSD v2 vs Ultra Disk**: Premium SSD v2 permite escalar IOPS/throughput independentemente sem mudar o tamanho do disco. Ultra Disk e para workloads extremos de sub-ms.
10. **Azure Batch vs Functions com filas**: Batch e para computacao paralela massiva (milhares de nos). Functions com queue triggers sao para processamento orientado a mensagens em escala moderada.

:::

## Frameworks de Decisao para Memorizar

### Arvore de Decisao de Computacao
- Precisa de controle total do SO? VM
- Workloads containerizados com orquestracao? AKS
- Servicos HTTP containerizados simples? Container Apps
- Orientado a eventos, curta duracao? Functions
- Orquestracao de workflows? Logic Apps ou Durable Functions
- Processamento em lote (milhares de cores)? Azure Batch

### Arvore de Decisao de Balanceamento de Carga
- HTTP/HTTPS global? Azure Front Door
- Global nao-HTTP (baseado em DNS)? Traffic Manager
- HTTP regional com WAF? Application Gateway
- Regional nao-HTTP (Camada 4)? Azure Load Balancer

### Arvore de Decisao de Armazenamento
- Relacional + alta compatibilidade? SQL Managed Instance
- Relacional + PaaS otimizado em custo? Azure SQL Database
- NoSQL documento + distribuicao global? Cosmos DB for NoSQL
- Key-value consultas simples? Table Storage ou Cosmos DB for Table
- Blobs nao estruturados? Blob Storage
- Analise de big data? Data Lake Storage Gen2
- Compartilhamentos de arquivo SMB? Azure Files

## Links Uteis

| Recurso | Link |
|---------|------|
| **Experimente a interface do exame** | [Sandbox do Exame](https://aka.ms/examdemo) |
| **Questoes praticas gratuitas** | [Avaliacao Pratica](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-305/practice/assessment?assessment-type=practice&assessmentId=15) |
| **Agendar o exame** | [Pearson VUE](https://learn.microsoft.com/en-us/credentials/certifications/azure-solutions-architect/) |
| **Azure Architecture Center** | [Arquiteturas de Referencia](https://learn.microsoft.com/en-us/azure/architecture/) |
| **Well-Architected Framework** | [Documentacao WAF](https://learn.microsoft.com/en-us/azure/well-architected/) |
| **Renovacao da certificacao** | [Renove gratuitamente](https://learn.microsoft.com/en-us/credentials/certifications/renew-your-microsoft-certification) |

## Apos a Aprovacao

- Sua certificacao aparece no seu [perfil Microsoft Learn](https://learn.microsoft.com/en-us/users/) em 24 horas
- Voce recebe o titulo **Microsoft Certified: Azure Solutions Architect Expert**
- Voce recebe um badge digital via Credly para compartilhar no LinkedIn
- A certificacao e valida por 1 ano (renove gratuitamente via avaliacao online)
- Considere seu proximo passo: [AZ-400](https://learn.microsoft.com/en-us/credentials/certifications/devops-engineer/) (DevOps) ou [AZ-500](https://learn.microsoft.com/en-us/credentials/certifications/azure-security-engineer/) (Seguranca)

---

**Pronto para comecar?** Va para o [Desafio 01: Projetar uma Solucao de Logging Centralizado](/docs/az-305/identity-governance-monitoring/challenge-01).
