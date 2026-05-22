---
sidebar_position: 4
title: "Exam Tips & Strategy"
---

# Dicas e estratégia para o exame

:::info Em breve

Esta seção será preenchida após a conclusão de todos os desafios com dicas específicas do exame, armadilhas comuns e estratégias de estudo baseadas nos pesos dos domínios.

:::

## Formato do exame

- **Questões**: ~40-60 questões
- **Duração**: 100-120 minutos
- **Nota de aprovação**: 700/1000
- **Tipos de questão**: Múltipla escolha, arrastar e soltar, estudos de caso, hot area (baseado em diagrama)

## Pesos dos domínios principais

| Domínio | Peso | Prioridade de estudo |
|---------|------|---------------------|
| Rede Principal | 25-30% | Mais alta — domine VNets, DNS, roteamento |
| Conectividade | 20-25% | Alta — VPN e ExpressRoute são muito cobrados |
| Entrega de Aplicações | 15-20% | Média — saiba quando usar qual solução de LB |
| Acesso Privado | 10-15% | Média — integração DNS de PE/PLS é crítica |
| Segurança de Rede | 15-20% | Alta — cenários com NSG + Firewall + WAF |

## Principais recomendações de estudo

1. **Conheça a matriz de decisão** — Quando usar Load Balancer vs Application Gateway vs Front Door vs Traffic Manager
2. **DNS está em todo lugar** — Private DNS zones, Private Resolver, DNS split-horizon para híbrido
3. **Profundidade em roteamento** — UDRs, Route Server BGP, forced tunneling, rotas efetivas
4. **Detalhes do ExpressRoute** — Global Reach vs FastPath vs Direct, tipos de peering, opções de criptografia
5. **Firewall vs NSG vs WAF** — Cada um tem uma camada e propósito específico
