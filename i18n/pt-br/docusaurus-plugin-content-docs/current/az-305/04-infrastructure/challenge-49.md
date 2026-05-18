---
sidebar_position: 16
title: "Challenge 49: Design Network Security and Load Balancing"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 49: Design Network Security and Load Balancing

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $10-25 | **Peso no Exame: 30-35%**

:::

## Introducao

A CloudTenant SaaS e uma plataforma B2B multi-tenant que atende 500 clientes empresariais. A plataforma expoe APIs REST e dashboards web para a internet, processa dados financeiros sensiveis e deve atender requisitos de conformidade SOC 2 Type II. A arquitetura consiste em uma camada web (frontend), camada de API, camada de processamento em segundo plano e camada de dados compartilhada implantada em 2 regioes Azure (East US e West Europe) para disponibilidade global.

Os requisitos de seguranca e confiabilidade sao: (1) Protecao DDoS para todos os endpoints voltados para internet, (2) Web Application Firewall protegendo contra vulnerabilidades OWASP Top 10, (3) Conectividade privada para toda comunicacao backend-a-backend (nenhum servico backend exposto a internet), (4) Balanceamento de carga global com failover automatico entre regioes (< 60 segundos de tempo de failover), (5) Micro-segmentacao entre tenants para prevenir movimento lateral se a workload de um tenant for comprometida, (6) Aplicacao de TLS 1.3 com gerenciamento centralizado de certificados, e (7) Logging de rede e deteccao de ameacas para conformidade de auditoria de seguranca.

A equipe de plataforma precisa selecionar a combinacao certa de servicos de rede e seguranca Azure de um cenario amplo: Azure Firewall, WAF, NSG, ASG, Private Link, DDoS Protection, Front Door, Traffic Manager, Application Gateway e Load Balancer.

## Habilidades do Exame Cobertas

- Recomendar uma solucao para otimizar a seguranca de rede
- Recomendar uma solucao de balanceamento de carga e roteamento

## Tarefas de Design

### Parte 1: Arvore de Decisao de Balanceamento de Carga

1. Aplique a arvore de decisao de balanceamento de carga Azure para selecionar o servico apropriado para cada padrao de trafego:
   - Trafego HTTP/HTTPS voltado para internet (global): avalie Azure Front Door vs. Traffic Manager + Application Gateway
   - Trafego nao-HTTP voltado para internet (ex.: protocolos TCP customizados): avalie Traffic Manager + Load Balancer
   - Trafego HTTP interno entre microsservicos: avalie Application Gateway Interno vs. Load Balancer Interno
   - Trafego TCP/UDP interno: avalie Load Balancer Interno
2. Projete a arquitetura de balanceamento de carga global:
   - Azure Front Door como ponto de entrada global (anycast, SSL offload, integracao WAF)
   - Application Gateways regionais ou ingress de Container App como backends
   - Health probes e configuracao de failover (ativo-ativo ou ativo-passivo)
3. Compare as opcoes de balanceamento de carga lado a lado:
   - Front Door: Layer 7, global, anycast, WAF integrado, caching, roteamento baseado em URL
   - Traffic Manager: baseado em DNS, global, qualquer protocolo, sem processamento inline
   - Application Gateway: Layer 7, regional, WAF (v2), roteamento de URL, terminacao SSL
   - Load Balancer: Layer 4, regional, TCP/UDP, latencia ultra-baixa, HA ports

### Parte 2: Design de Web Application Firewall

4. Projete a estrategia de implantacao do WAF:
   - WAF no Azure Front Door (global, aplicado na borda antes do trafego chegar a regiao)
   - vs. WAF no Application Gateway (regional, aplicado no perimetro da VNet)
   - vs. Ambos (defesa em profundidade: WAF do Front Door para ataques volumetricos/bots, WAF do App Gateway para regras especificas da aplicacao)
5. Configure politicas WAF:
   - Selecao de versao do OWASP Core Rule Set (CRS) e modo (Detection vs. Prevention)
   - Regras customizadas para rate limiting especifico por tenant (ex.: 1000 requisicoes/minuto por chave de API do tenant)
   - Exclusoes para falsos positivos conhecidos (headers de requisicao especificos, campos do body)
   - Conjunto de regras de protecao contra bots para distinguir bots legitimos de crawlers maliciosos
6. Projete a estrategia de logging e alertas do WAF:
   - Registre todas as requisicoes bloqueadas no Log Analytics para auditoria de seguranca
   - Alerte sobre padroes incomuns (pico repentino em requisicoes bloqueadas, novos vetores de ataque)
   - Relatorio mensal do WAF para evidencia de conformidade SOC 2

### Parte 3: Segmentacao de Rede e Seguranca

7. Projete a estrategia de segmentacao de rede:
   - Regras NSG: controle trafego no nivel de subnet (camada web pode alcancar camada de API, camada de API pode alcancar camada de dados, sem acesso direto web-para-dados)
   - ASG (Application Security Groups): agrupe VMs/NICs por funcao para gerenciamento simplificado de regras
   - Projete o fluxo NSG para aplicar: internet -> Front Door -> camada web -> camada de API -> camada de dados (sem pular camadas)
8. Projete a estrategia de Private Link/Private Endpoint para servicos backend:
   - Azure SQL, Cosmos DB, Storage: somente private endpoints (desabilite acesso publico totalmente)
   - Comunicacao entre servicos: private endpoints para PaaS, VNet integration para App Service/Container Apps
   - Politicas de Service Endpoint onde Private Link nao e necessario
9. Projete micro-segmentacao para isolamento de tenants:
   - Isolamento no nivel de rede (subnets dedicadas por tier de tenant: clientes basicos vs. premium)
   - vs. Isolamento no nivel de aplicacao (infraestrutura compartilhada com separacao de dados por tenant)
   - Documente os trade-offs: custo de subnets dedicadas vs. seguranca de isolamento de rede completo

### Parte 4: Protecao DDoS e Deteccao de Ameacas

10. Projete a estrategia de protecao DDoS:
    - Azure DDoS Network Protection (por VNet, inclui garantia de protecao de custos, integracao WAF, telemetria)
    - vs. DDoS de infraestrutura Azure padrao (apenas Layer 3/4, sem politicas customizadas)
    - Avalie DDoS IP Protection (por IP publico, alternativa de menor custo)
11. Projete a estrategia de TLS:
    - Aplicacao de TLS 1.3 no Front Door (configuracao de versao TLS minima)
    - Gerenciamento de certificados: certificados gerenciados pelo Azure Key Vault vs. certificados gerenciados pelo Front Door
    - Criptografia de ponta a ponta: re-criptografe trafego entre Front Door e servidores de origem
12. Projete monitoramento de seguranca de rede:
    - Azure Firewall (Premium com IDPS para inspecao de trafego east-west)
    - NSG flow logs para analise de trafego de rede
    - Microsoft Defender for Cloud recomendacoes de seguranca de rede
    - Network Watcher para troubleshooting e captura de pacotes

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-49"
  items={[
    "Arvore de decisao de balanceamento de carga aplicada com selecao justificada para cada padrao de trafego (HTTP global, HTTP regional, TCP interno)",
    "Estrategia de implantacao WAF seleciona WAF do Front Door vs WAF do Application Gateway com justificativa de defesa em profundidade",
    "Segmentacao de rede aplica acesso baseado em camadas (web -> API -> dados) com regras NSG e ASG",
    "Estrategia de Private Endpoint garante que nenhum servico backend tenha exposicao publica a internet",
    "Tier de protecao DDoS selecionado com justificativa de custo (Network Protection vs IP Protection vs padrao)",
    "TLS 1.3 aplicado de ponta a ponta com gerenciamento centralizado de certificados no Key Vault"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Azure Front Door vs. Application Gateway WAF</summary>

O WAF do Front Door opera na borda (rede global de POPs da Microsoft) e pode bloquear ataques antes de chegarem a sua regiao Azure. Ele se destaca em ataques volumetricos, protecao contra bots e geo-filtering. O WAF do Application Gateway opera dentro da sua VNet e tem acesso a mais contexto de aplicacao (inspecao no nivel de VNet, integracao mais estreita com servicos backend). Para aplicacoes voltadas para internet, use o WAF do Front Door como primeira linha de defesa. Adicione o WAF do Application Gateway somente se voce precisar de inspecao WAF no nivel de VNet que o Front Door nao pode fornecer.

</details>

<details>
<summary>Dica 2: Tiers do Azure Firewall</summary>

O Azure Firewall vem em tres SKUs: **Basic** (workloads pequenas/medias, throughput limitado, sem inspecao TLS), **Standard** (filtragem baseada em threat intelligence, filtragem FQDN, regras de rede/aplicacao), e **Premium** (adiciona inspecao TLS, IDPS/IPS com deteccao baseada em assinatura, filtragem de URL, categorias web). Para conformidade SOC 2 com inspecao de trafego east-west, Premium e tipicamente necessario para inspecionar trafego criptografado entre camadas. Standard e suficiente se voce so precisa de filtragem de saida e regras baseadas em FQDN.

</details>

<details>
<summary>Dica 3: Simplificacao NSG vs. ASG</summary>

Sem ASGs, voce precisa de regras NSG referenciando faixas de IP (fragil, quebra quando VMs mudam de IP). ASGs permitem atribuir uma tag logica (ex.: "WebServers", "ApiServers") a NICs, e entao escrever regras NSG usando nomes ASG como origem/destino. Exemplo: Permitir ASG:WebServers -> ASG:ApiServers na porta 443. Isso e dinamico (novas VMs automaticamente recebem as regras corretas quando atribuidas ao ASG), mais facil de auditar e nao requer gerenciamento de IP. Use ASGs para todas as regras de segmentacao intra-VNet.

</details>

<details>
<summary>Dica 4: Modelo de Custo do DDoS Protection</summary>

O Azure DDoS Network Protection tem uma taxa mensal fixa (aproximadamente $2.944/mes) mais cobracas de excedente por GB, cobrindo ate 100 IPs publicos em todas as VNets na assinatura. O DDoS IP Protection e por preco por IP (aproximadamente $199/mes por IP) sem a taxa fixa. Para workloads com menos de 15 IPs publicos, IP Protection e mais custo-efetivo. Ambos incluem suporte de resposta rapida DDoS, protecao de custos (credito para custos de scale-out durante ataques) e integracao WAF. A protecao de infraestrutura padrao fornece apenas protecao basica Layer 3/4 sem metricas ou alertas.

</details>

<details>
<summary>Dica 5: Private Link vs. Service Endpoints</summary>

Private Endpoints trazem o servico PaaS para dentro da sua VNet com um IP privado (acessivel do ambiente local via VPN/ExpressRoute, funciona com NSGs). Service Endpoints estendem a identidade da VNet para o servico PaaS (trafego permanece no backbone Azure, mas o servico ainda tem um IP publico). Para conformidade SOC 2 onde "sem endpoints publicos para backend" e obrigatorio, Private Endpoints sao necessarios porque permitem desabilitar completamente o acesso publico ao servico PaaS. Service Endpoints nao podem garantir que nao haja acesso pela internet.

</details>

## Recursos de Aprendizagem

- [Azure load balancing decision tree](https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/load-balancing-overview)
- [Azure Front Door overview](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-overview)
- [Azure Web Application Firewall overview](https://learn.microsoft.com/en-us/azure/web-application-firewall/overview)
- [Azure Firewall overview](https://learn.microsoft.com/en-us/azure/firewall/overview)
- [Azure DDoS Protection overview](https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview)
- [Azure Private Link overview](https://learn.microsoft.com/en-us/azure/private-link/private-link-overview)

## Verificacao de Conhecimento

<details>
<summary>1. Uma aplicacao SaaS multi-regiao precisa de balanceamento de carga HTTP global com failover em menos de um segundo. Por que o Azure Front Door e preferido ao Traffic Manager para este cenario?</summary>

**O Front Door fornece failover instantaneo via anycast; o Traffic Manager depende do TTL do DNS.** O Azure Front Door usa roteamento anycast onde todos os nos de borda compartilham o mesmo endereco IP. Quando um backend se torna indisponivel, o Front Door imediatamente roteia requisicoes para o proximo backend saudavel na camada de rede (< 30 segundos de failover). O Traffic Manager e baseado em DNS: a velocidade de failover depende do TTL do DNS (minimo 0 segundos configurado, mas clientes fazem cache de respostas DNS). O failover real do Traffic Manager pode levar 30-120 segundos devido ao cache DNS. Para workloads HTTP que requerem failover em menos de um minuto, o Front Door e a escolha correta.

</details>

<details>
<summary>2. Seu WAF no Front Door esta bloqueando requisicoes legitimas de API de uma integracao parceira. As requisicoes contem payloads JSON que acionam regras de SQL injection. Como voce resolve isso sem reduzir a seguranca?</summary>

**Crie uma regra de exclusao WAF para o campo especifico do body da requisicao da fonte especifica.** Passos: (1) Revise os logs do WAF para identificar a regra especifica sendo acionada (ex.: regra 942430 - deteccao de anomalia de caractere SQL), (2) Crie uma exclusao que desabilita essa regra especifica apenas para as requisicoes do parceiro (correspondencia por IP, header ou caminho URI), (3) Alternativamente, crie uma regra customizada com prioridade mais alta que explicitamente permite as requisicoes do parceiro antes que as regras gerenciadas as avaliem, (4) Nao desabilite a regra globalmente pois ela protege outros caminhos de requisicao. Sempre prefira exclusoes direcionadas a desabilitar regras inteiramente.

</details>

<details>
<summary>3. Sua arquitetura usa NSGs para restringir o acesso da camada de API apenas a subnet da camada web. Um novo requisito precisa que uma ferramenta de monitoramento de terceiros implantada em uma subnet de gerenciamento faca health-check nos endpoints de API. Qual e a abordagem mais sustentavel?</summary>

**Use Application Security Groups (ASGs).** Atribua a NIC da ferramenta de monitoramento a um ASG chamado "MonitoringAgents." Adicione uma regra NSG permitindo ASG:MonitoringAgents alcancar ASG:ApiServers na porta de health check (ex.: 443). Isso e mais sustentavel do que adicionar o CIDR da subnet de gerenciamento a regra existente porque: (1) Se ferramentas de monitoramento mudam de subnet, a associacao ASG acompanha a NIC, (2) Voce pode adicionar novas instancias de monitoramento sem modificar regras NSG, (3) As regras sao lidas como intencao (monitoramento pode alcancar API) em vez de implementacao (10.0.3.0/24 pode alcancar 10.0.2.0/24).

</details>

## Limpeza

```bash
# Delete all resources created in this challenge
# WARNING: DDoS Protection plan has monthly cost - verify deletion
az group delete --name rg-az305-challenge49 --yes --no-wait
```

---

**Proximo**: [Challenge 50: Design a Complete Azure Solution (Cross-Domain Capstone)](/docs/az-305/infrastructure/challenge-50)
