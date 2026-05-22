---
sidebar_position: 1
title: "AZ-700: Azure Network Engineer"
---

# AZ-700: Azure Network Engineer | visão geral do exame

:::info Detalhes do Exame

**Versão do exame**: Habilidades medidas a partir de 24 de abril de 2026 | **Nota de aprovação**: 700/1000 | **Duração**: ~100-120 minutos

:::

## Para quem é este exame?

Como candidato a esta certificação, você deve ter experiência em planejamento, implementação e gerenciamento de soluções de rede do Azure, incluindo infraestrutura de rede principal, conectividade híbrida, serviços de entrega de aplicações, acesso privado a serviços do Azure e segurança de rede.

Como engenheiro de rede do Azure, suas responsabilidades incluem otimizar o desempenho, resiliência, escala e segurança das soluções de rede do Azure. Você monitora proativamente ambientes de rede para identificar problemas e minimizar riscos.

## Habilidades em resumo

| Domínio | Peso | Desafios |
|---------|------|----------|
| Projetar e implementar infraestrutura de rede principal | 25–30% | 01–13 |
| Projetar, implementar e gerenciar serviços de conectividade | 20–25% | 14–24 |
| Projetar e implementar serviços de entrega de aplicações | 15–20% | 25–33 |
| Projetar e implementar acesso privado a serviços do Azure | 10–15% | 34–39 |
| Projetar e implementar serviços de segurança de rede do Azure | 15–20% | 40–48 |
| Capstone entre domínios | Todos | 49 |

:::tip Estrutura dos Desafios

Cada desafio inclui um **diagrama de topologia de rede em SVG** mostrando a arquitetura que você irá construir, **abas multi-ferramenta** (Azure CLI / PowerShell / Portal), uma seção de **Quebra & Correção** para solução de problemas e uma **Verificação de Conhecimento** com questões no estilo do exame.

:::

## Como este site funciona

Cada desafio segue um formato consistente:

1. **Diagrama de Topologia** | SVG mostrando a arquitetura de rede que você irá construir
2. **Cenário** | Problema empresarial do mundo real que contextualiza o desafio
3. **Habilidades do Exame Cobertas** | Tópicos exatos do guia de estudo oficial
4. **Pré-requisitos** | Incluindo referências cruzadas ao AZ-104 quando houver sobreposição
5. **Tarefas** | Passo a passo com instruções para Azure CLI, PowerShell e Portal
6. **Fluxo de Pacotes** | Rastreie o caminho do tráfego pela arquitetura
7. **Quebra & Correção** | Configurações incorretas intencionais para solução de problemas
8. **Verificação de Conhecimento** | Questões no estilo do exame para testar sua compreensão
9. **Limpeza** | Scripts para excluir recursos e evitar custos

## Pré-requisitos

- **Certificação AZ-104 (recomendada)** — Este exame se baseia no conhecimento de Azure Administrator
- Assinatura do Azure com pelo menos a função de Contributor
- Familiaridade com fundamentos de rede (TCP/IP, DNS, protocolos de roteamento, sub-redes)
- Azure CLI ou Azure PowerShell instalados e autenticados
- Conclusão dos desafios de Rede do AZ-104 (11-13, 24-26) é fortemente recomendada

## Considerações de custo

:::warning Custos do laboratório

Alguns desafios neste exame envolvem recursos que geram custos significativos:

| Recurso | Custo aproximado | Desafios |
|---------|-----------------|----------|
| VPN Gateway (VpnGw1) | ~$0,19/hora | 14–18, 24 |
| Azure Firewall | ~$1,25/hora | 42–44 |
| ExpressRoute | $55–$10.000+/mês | 19–21 (apenas SIMULAÇÃO) |
| Application Gateway | ~$0,27/hora | 28–30 |
| Azure Front Door | ~$35/mês base | 31–32 |
| DDoS Network Protection | ~$2.944/mês | 13 (usa alternativa IP Protection) |

**Sempre execute os scripts de limpeza imediatamente após concluir um desafio.** Os desafios de ExpressRoute são baseados em simulação (você pratica o conhecimento de configuração sem implantar circuitos reais).

:::

## Trilha de certificação

```
AZ-900 (Fundamentos)
   ↓
AZ-104 (Administrador) ←── conhecimento pré-requisito
   ↓
AZ-700 (Engenheiro de Rede) ←── VOCÊ ESTÁ AQUI
   ↓
AZ-305 (Arquiteto de Soluções) — perspectiva mais ampla de design
```
