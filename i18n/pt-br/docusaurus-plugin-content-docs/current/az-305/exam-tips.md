---
sidebar_position: 3
title: "Dicas e Estratégia para o Exame"
---

# Dicas e estratégia para o exame

O AZ-305 testa sua capacidade de tomar decisões de design. Diferente do AZ-104, raramente ha um único comando CLI "correto". Em vez disso, você avaliara cenários e escolhera a melhor solução entre varias opções válidas.

## Formato do exame

| Detalhe | Valor |
|---------|-------|
| **Número de questões** | ~40-60 questões |
| **Duração** | 100-120 minutos |
| **Nota de aprovação** | 700 de 1000 |
| **Tipos de questão** | Múltipla escolha, múltipla resposta, arrastar e soltar, estudo de caso |
| **Penalidade por respostas erradas** | Nenhuma, sempre responda todas as questões |
| **Pode voltar?** | Sim, dentro de uma seção. Não, entre seções. |
| **Labs?** | Sem labs ativos (diferente do AZ-104). Questoes puramente baseadas em cenários. |

## Tipos de questao que você encontrara

### Múltipla escolha baseada em cenário
O tipo mais comum. Um cenário de negócio de 2-3 paragrafos seguido de "qual solução atende os requisitos?" Leia os requisitos com atenção. Frequentemente uma única palavra (como "minimizar custo" vs "minimizar tempo de inatividade") muda a resposta correta.

### Múltipla resposta ("Selecione duas/tres")
Escolha exatamente o número específicado. Comum para questões como "quais DOIS serviços você deve incluir no seu design?"

### Estudo de caso
Um cenário de múltiplas paginas (perfil da empresa, arquitetura existente, requisitos) com 4-7 questões. Você não pode retornar ao estudo de caso após avancar para a próxima seção.

:::warning Estratégia para Estudo de Caso

Leia a aba de **requisitos** primeiro, depois o **ambiente existente**. A maioria das questões testa apenas um requisito específico. Não perca tempo memorizando todo o cenário.

:::

### Arrastar e soltar / ordenacao
Associe serviços a requisitos, ou ordene etapas de implantação. Comum para planejamento de migração e camadas de arquitetura.

## Como o AZ-305 difere do AZ-104

O modelo mental é completamente diferente:

| Pensamento AZ-104 | Pensamento AZ-305 |
|--------------------|-------------------|
| "Como crio uma VNet?" | "Devo usar hub-spoke ou Virtual WAN?" |
| "Qual comando CLI implanta um App Service?" | "Isso deveria ser App Service, Container Apps ou Functions?" |
| "Como configuro regras de NSG?" | "Devo usar NSG, Azure Firewall ou WAF aqui?" |

**O exame testa o PORQUE, não o COMO.**

## Estratégia de estudo

### Semanas 1-2: soluções de infraestrutura (30-35%)
Este é o maior domínio. Foque em seleção de computação (VM vs container vs serverless), redes (VPN vs ExpressRoute, árvore de decisão de balanceamento de carga) e arquitetura de aplicação (mensageria, eventos, cache).

### Semanas 3-4: identidade, governanca e monitoramento (25-30%)
Conheca padroes de autenticação/autorização, design de Key Vault, hierarquias de management groups e Azure Policy. Monitoramento (Log Analytics, App Insights) conecta-se a todos os outros domínios.

### Semana 5: armazenamento de dados + continuidade de negócios (35-45% combinado)
Seleção relacional vs não-relacional, decisões de tier/computação, opções de redundância, estratégias de backup/DR, padroes de HA. Esses dois domínios se sobrepoe significativamente.

### Semana 6: revisao + prática
- Faça a [Avaliação Prática Gratuita](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-305/practice/assessment?assessment-type=practice&assessmentId=15)
- Revise a [Matriz de Cobertura](/docs/az-305/coverage-matrix) para identificar lacunas
- Refaça os desafios capstone (13, 24, 33, 50)

## Pegadinhas comuns do exame

:::warning Coisas que pegam as pessoas desprevenidas

1. **Níveis de consistência do Cosmos DB**: Consistência forte oferece leituras após gravacoes, mas custa 2x RUs e limita gravacoes multi-regiao. Eventual é barato mas com dados desatualizados. Conheca os 5 níveis e trade-offs.
2. **Tiers do SQL Database**: Business Critical inclui HA integrada (replicas de leitura), General Purpose não. Hyperscale é para bancos maiores que 4TB.
3. **Composição de SLA**: Dois serviços com 99,9% cada resultam em 99,8% composto (0,999 x 0,999). Adicionar redundância AUMENTA o SLA composto.
4. **ExpressRoute vs VPN Gateway**: ExpressRoute não passa pela internet pública. Mas requer um provedor de conectividade. Saiba quando cada um é aprópriado.
5. **Event Grid vs Event Hubs vs Service Bus**: Event Grid = reativo (eventos aconteceram), Event Hubs = streaming (telemetria de alto throughput), Service Bus = mensageria corporativa (entrega garantida, ordenação).
6. **Azure Front Door vs Traffic Manager**: Front Door opera na Camada 7 (HTTP), Traffic Manager no nível DNS. Front Door é preferido para workloads web.
7. **Private Endpoints vs Service Endpoints**: Private Endpoints fornecem um IP privado na sua VNet. Service Endpoints roteiam pelo backbone Microsoft mas o serviço ainda tem IP público.
8. **Managed Identity vs Service Principal**: Sempre prefira managed identity quando a origem é um recurso Azure. Service principals são para origens fora do Azure.
9. **Premium SSD v2 vs Ultra Disk**: Premium SSD v2 permite escalar IOPS/throughput independentemente sem mudar o tamanho do disco. Ultra Disk é para workloads extremos de sub-ms.
10. **Azure Batch vs Functions com filas**: Batch é para computação paralela massiva (milhares de nos). Functions com queue triggers são para processamento orientado a mensagens em escala moderada.

:::

## Frameworks de decisão para memorizar

### Árvore de decisão de computacao
- Precisa de controle total do SO? VM
- Workloads containerizados com orquestração? AKS
- Servicos HTTP containerizados simples? Container Apps
- Orientado a eventos, curta duração? Functions
- Orquestracao de workflows? Logic Apps ou Durable Functions
- Processamento em lote (milhares de cores)? Azure Batch

### Árvore de decisão de balanceamento de carga
- HTTP/HTTPS global? Azure Front Door
- Global não-HTTP (baseado em DNS)? Traffic Manager
- HTTP regional com WAF? Application Gateway
- Regional não-HTTP (Camada 4)? Azure Load Balancer

### Árvore de decisão de armazenamento
- Relacional + alta compatibilidade? SQL Managed Instance
- Relacional + PaaS otimizado em custo? Azure SQL Database
- NoSQL documento + distribuição global? Cosmos DB for NoSQL
- Key-value consultas simples? Table Storage ou Cosmos DB for Table
- Blobs não estruturados? Blob Storage
- Análise de big data? Data Lake Storage Gen2
- Compartilhamentos de arquivo SMB? Azure Files

## Links úteis

| Recurso | Link |
|---------|------|
| **Experimente a interface do exame** | [Sandbox do Exame](https://aka.ms/examdemo) |
| **Questoes práticas gratuitas** | [Avaliação Prática](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-305/practice/assessment?assessment-type=practice&assessmentId=15) |
| **Agendar o exame** | [Pearson VUE](https://learn.microsoft.com/en-us/credentials/certifications/azure-solutions-architect/) |
| **Azure Architecture Center** | [Arquiteturas de Referência](https://learn.microsoft.com/en-us/azure/architecture/) |
| **Well-Architected Framework** | [Documentacao WAF](https://learn.microsoft.com/en-us/azure/well-architected/) |
| **Renovação da certificação** | [Renove gratuitamente](https://learn.microsoft.com/en-us/credentials/certifications/renew-your-microsoft-certification) |

## Após a aprovacao

- Sua certificação aparece no seu [perfil Microsoft Learn](https://learn.microsoft.com/en-us/users/) em 24 horas
- Você recebe o título **Microsoft Certified: Azure Solutions Architect Expert**
- Você recebe um badge digital via Credly para compartilhar no LinkedIn
- A certificação e válida por 1 ano (renove gratuitamente via avaliação online)
- Considere seu próximo passo: [AZ-400](https://learn.microsoft.com/en-us/credentials/certifications/devops-engineer/) (DevOps) ou [AZ-500](https://learn.microsoft.com/en-us/credentials/certifications/azure-security-engineer/) (Seguranca)

---

**Pronto para começar?** Va para o [Desafio 01: Projetar uma Solução de Logging Centralizado](/docs/az-305/identity-governance-monitoring/challenge-01).
