---
sidebar_position: 4
title: "Dicas e Estratégia para o Exame"
---

# Dicas e Estratégia para o AZ-900

## Formato do exame

| Detalhe | Valor |
|---------|-------|
| Duração | 45 minutos |
| Questões | ~40-60 |
| Nota de aprovação | 700/1000 |
| Tipos de questão | Múltipla escolha, arrastar e soltar, cenários sim/não |
| Custo | $99 USD (gratuito para estudantes elegíveis) |

## Principais estratégias

### 1. Foque no domínio de maior peso

**Domínio 2: Arquitetura e serviços Azure (35-40%)** tem o maior peso. Conheça seus serviços principais:
- Computação: VMs, App Service, Functions, Containers
- Armazenamento: Blob, File, Queue, Table + opções de redundância
- Rede: VNet, VPN Gateway, ExpressRoute, DNS
- Identidade: Entra ID, RBAC, Conditional Access

### 2. Conheça o padrão "qual serviço"

Muitas questões do AZ-900 seguem este padrão:
> "Uma empresa precisa de [requisito]. Qual serviço Azure ela deve usar?"

Domine o mapeamento entre requisitos e serviços.

### 3. Entenda a responsabilidade compartilhada

Isso é muito cobrado. Lembre-se:
- **IaaS**: Você gerencia SO, apps, dados. Azure gerencia hardware, rede.
- **PaaS**: Você gerencia apps e dados. Azure gerencia todo o resto.
- **SaaS**: Você gerencia dados e acesso. Azure gerencia todo o resto.

### 4. Saiba CapEx vs OpEx

- **CapEx** (Despesa de Capital): Custo inicial, deprecia com o tempo (comprar servidores)
- **OpEx** (Despesa Operacional): Pago conforme o uso, baseado em consumo (nuvem)

### 5. Não complique demais

O AZ-900 é um exame fundamental. Se uma resposta parece excessivamente complexa ou avançada, provavelmente está errada. Procure a resposta direta.

## Armadilhas comuns

| Armadilha | Realidade |
|-----------|-----------|
| "Azure AD" nas respostas | Agora se chama **Microsoft Entra ID** — ambos os nomes podem aparecer |
| "Availability Sets" vs "Availability Zones" | Zones = datacenters, Sets = racks dentro de um datacenter |
| "Scale up" vs "Scale out" | Up = VM maior, Out = mais VMs |
| "Azure Policy" vs "RBAC" | Policy = "o que pode ser criado", RBAC = "quem pode fazer o quê" |
| "Management Groups" vs "Resource Groups" | Management Groups = organizar subscriptions, Resource Groups = organizar recursos |

## Checklist para o dia do exame

- [ ] Teste seu ambiente de exame (webcam, microfone, documento de identidade) no dia anterior
- [ ] Feche todas as aplicações exceto o navegador do exame
- [ ] Tenha um documento de identidade oficial em mãos
- [ ] Limpe sua mesa completamente (proctored online)
- [ ] Relaxe — o AZ-900 tem uma taxa de aprovação muito alta com preparação adequada

## Gerenciamento de tempo

Com ~45 minutos para ~50 questões, você tem menos de 1 minuto por questão:
- Não gaste mais de 60 segundos em nenhuma questão
- Marque questões difíceis e volte a elas depois
- Confie no seu primeiro instinto — não mude respostas a menos que tenha certeza

:::tip Retake gratuito
A Microsoft ocasionalmente oferece retakes gratuitos através de promoções. Verifique o [Microsoft Learn](https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/) para ofertas atuais.
:::
