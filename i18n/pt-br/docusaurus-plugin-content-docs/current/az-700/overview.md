---
sidebar_position: 1
title: "AZ-700: Azure Network Engineer"
---

# AZ-700: Azure Network Engineer | visÃ£o geral do exame

:::info Detalhes do Exame

**VersÃ£o do exame**: Habilidades medidas a partir de 24 de abril de 2026 | **Nota de aprovaÃ§Ã£o**: 700/1000 | **DuraÃ§Ã£o**: ~100-120 minutos

:::

## Para quem Ã© este exame?

Como candidato a esta certificaÃ§Ã£o, vocÃª deve ter experiÃªncia em planejamento, implementaÃ§Ã£o e gerenciamento de soluÃ§Ãµes de rede do Azure, incluindo infraestrutura de rede principal, conectividade hÃ­brida, serviÃ§os de entrega de aplicaÃ§Ãµes, acesso privado a serviÃ§os do Azure e seguranÃ§a de rede.

Como engenheiro de rede do Azure, suas responsabilidades incluem otimizar o desempenho, resiliÃªncia, escala e seguranÃ§a das soluÃ§Ãµes de rede do Azure. VocÃª monitora proativamente ambientes de rede para identificar problemas e minimizar riscos.

## Habilidades em resumo

| DomÃ­nio | Peso | Desafios |
|---------|------|----------|
| Projetar e implementar infraestrutura de rede principal | 25â€“30% | 01â€“13 |
| Projetar, implementar e gerenciar serviÃ§os de conectividade | 20â€“25% | 14â€“24 |
| Projetar e implementar serviÃ§os de entrega de aplicaÃ§Ãµes | 15â€“20% | 25â€“33 |
| Projetar e implementar acesso privado a serviÃ§os do Azure | 10â€“15% | 34â€“39 |
| Projetar e implementar serviÃ§os de seguranÃ§a de rede do Azure | 15â€“20% | 40â€“48 |
| Capstone entre domÃ­nios | Todos | 49 |

:::tip Estrutura dos Desafios

Cada desafio inclui um **diagrama de topologia de rede em SVG** mostrando a arquitetura que vocÃª irÃ¡ construir, **abas multi-ferramenta** (Azure CLI / PowerShell / Portal), uma seÃ§Ã£o de **Quebra & CorreÃ§Ã£o** para soluÃ§Ã£o de problemas e uma **VerificaÃ§Ã£o de Conhecimento** com questÃµes no estilo do exame.

:::

## Como este site funciona

Cada desafio segue um formato consistente:

1. **Diagrama de Topologia** | SVG mostrando a arquitetura de rede que vocÃª irÃ¡ construir
2. **CenÃ¡rio** | Problema empresarial do mundo real que contextualiza o desafio
3. **Habilidades do Exame Cobertas** | TÃ³picos exatos do guia de estudo oficial
4. **PrÃ©-requisitos** | Incluindo referÃªncias cruzadas ao AZ-104 quando houver sobreposiÃ§Ã£o
5. **Tarefas** | Passo a passo com instruÃ§Ãµes para Azure CLI, PowerShell e Portal
6. **Fluxo de Pacotes** | Rastreie o caminho do trÃ¡fego pela arquitetura
7. **Quebra & CorreÃ§Ã£o** | ConfiguraÃ§Ãµes incorretas intencionais para soluÃ§Ã£o de problemas
8. **VerificaÃ§Ã£o de Conhecimento** | QuestÃµes no estilo do exame para testar sua compreensÃ£o
9. **Limpeza** | Scripts para excluir recursos e evitar custos

## PrÃ©-requisitos

- **CertificaÃ§Ã£o AZ-104 (recomendada)** â€” Este exame se baseia no conhecimento de Azure Administrator
- Assinatura do Azure com pelo menos a funÃ§Ã£o de Contributor
- Familiaridade com fundamentos de rede (TCP/IP, DNS, protocolos de roteamento, sub-redes)
- Azure CLI ou Azure PowerShell instalados e autenticados
- ConclusÃ£o dos desafios de Rede do AZ-104 (11-13, 24-26) Ã© fortemente recomendada

## ConsideraÃ§Ãµes de custo

:::warning Custos do laboratÃ³rio

Alguns desafios neste exame envolvem recursos que geram custos significativos:

| Recurso | Custo aproximado | Desafios |
|---------|-----------------|----------|
| VPN Gateway (VpnGw1) | ~$0,19/hora | 14â€“18, 24 |
| Azure Firewall | ~$1,25/hora | 42â€“44 |
| ExpressRoute | $55â€“$10.000+/mÃªs | 19â€“21 (apenas SIMULAÃ‡ÃƒO) |
| Application Gateway | ~$0,27/hora | 28â€“30 |
| Azure Front Door | ~$35/mÃªs base | 31â€“32 |
| DDoS Network Protection | ~$2.944/mÃªs | 13 (usa alternativa IP Protection) |

**Sempre execute os scripts de limpeza imediatamente apÃ³s concluir um desafio.** Os desafios de ExpressRoute sÃ£o baseados em simulaÃ§Ã£o (vocÃª pratica o conhecimento de configuraÃ§Ã£o sem implantar circuitos reais).

:::

## Trilha de certificaÃ§Ã£o

```text
AZ-900 (Fundamentos)
   â†“
AZ-104 (Administrador) â†â”€â”€ conhecimento prÃ©-requisito
   â†“
AZ-700 (Engenheiro de Rede) â†â”€â”€ VOCÃŠ ESTÃ AQUI
   â†“
AZ-305 (Arquiteto de SoluÃ§Ãµes) â€” perspectiva mais ampla de design
```
