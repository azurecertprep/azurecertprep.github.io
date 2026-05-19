---
sidebar_position: 16
title: "Desafio 49: Projetar Segurança de Rede e Balanceamento de Carga"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 49: projetar segurança de rede e balanceamento de carga

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $10-25 | **Peso no Exame: 30-35%**

:::

## Introdução

A CloudTenant SaaS é uma plataforma B2B multi-tenant que atende 500 clientes empresariais. A plataforma expoe APIs REST e dashboards web para a internet, processa dados financeiros sensíveis e deve atender requisitos de conformidade SOC 2 Type II. A arquitetura consiste em uma camada web (frontend), camada de API, camada de processamento em segundo plano e camada de dados compartilhada implantada em 2 regiões Azure (East US e West Europe) para disponibilidade global.

Os requisitos de segurança e confiabilidade sao: (1) Proteção DDoS para todos os endpoints voltados para internet, (2) Web Application Firewall protegendo contra vulnerabilidades OWASP Top 10, (3) Conectividade privada para toda comunicação backend-a-backend (nenhum serviço backend exposto a internet), (4) Balanceamento de carga global com failover automático entre regiões (< 60 segundos de tempo de failover), (5) Micro-segmentacao entre tenants para prevenir movimento lateral se a workload de um tenant for comprometida, (6) Aplicação de TLS 1.3 com gerenciamento centralizado de certificados, e (7) Logging de rede e detecção de ameacas para conformidade de auditoria de segurança.

A equipe de plataforma precisa selecionar a combinacao certa de serviços de rede e segurança Azure de um cenário amplo: Azure Firewall, WAF, NSG, ASG, Private Link, DDoS Protection, Front Door, Traffic Manager, Application Gateway e Load Balancer.

## Habilidades do exame cobertas

- Recomendar uma solução para otimizar a segurança de rede
- Recomendar uma solução de balanceamento de carga e roteamento

## Tarefas de design

### Parte 1: arvore de decisao de balanceamento de carga

1. Aplique a arvore de decisao de balanceamento de carga Azure para selecionar o serviço apropriado para cada padrão de trafego:
   - Trafego HTTP/HTTPS voltado para internet (global): avalie Azure Front Door vs. Traffic Manager + Application Gateway
   - Trafego não-HTTP voltado para internet (ex.: protocolos TCP customizados): avalie Traffic Manager + Load Balancer
   - Trafego HTTP interno entre microsservicos: avalie Application Gateway Interno vs. Load Balancer Interno
   - Trafego TCP/UDP interno: avalie Load Balancer Interno
2. Projete a arquitetura de balanceamento de carga global:
   - Azure Front Door como ponto de entrada global (anycast, SSL offload, integração WAF)
   - Application Gateways regionais ou ingress de Container App como backends
   - Health probes e configuração de failover (ativo-ativo ou ativo-passivo)
3. Compare as opcoes de balanceamento de carga lado a lado:
   - Front Door: Layer 7, global, anycast, WAF integrado, caching, roteamento baseado em URL
   - Traffic Manager: baseado em DNS, global, qualquer protocolo, sem processamento inline
   - Application Gateway: Layer 7, regional, WAF (v2), roteamento de URL, terminacao SSL
   - Load Balancer: Layer 4, regional, TCP/UDP, latência ultra-baixa, HA ports

### Parte 2: design de web Application Firewall

4. Projete a estratégia de implantacao do WAF:
   - WAF no Azure Front Door (global, aplicado na borda antes do trafego chegar a região)
   - vs. WAF no Application Gateway (regional, aplicado no perimetro da VNet)
   - vs. Ambos (defesa em profundidade: WAF do Front Door para ataques volumetricos/bots, WAF do App Gateway para regras específicas da aplicação)
5. Configure políticas WAF:
   - Selecao de versao do OWASP Core Rule Set (CRS) e modo (Detection vs. Prevention)
   - Regras customizadas para rate limiting específico por tenant (ex.: 1000 requisicoes/minuto por chave de API do tenant)
   - Exclusoes para falsos positivos conhecidos (headers de requisicao específicos, campos do body)
   - Conjunto de regras de proteção contra bots para distinguir bots legitimos de crawlers maliciosos
6. Projete a estratégia de logging e alertas do WAF:
   - Registre todas as requisicoes bloqueadas no Log Analytics para auditoria de segurança
   - Alerte sobre padrões incomuns (pico repentino em requisicoes bloqueadas, novos vetores de ataque)
   - Relatório mensal do WAF para evidencia de conformidade SOC 2

### Parte 3: segmentacao de rede e segurança

7. Projete a estratégia de segmentacao de rede:
   - Regras NSG: controle trafego no nível de subnet (camada web pode alcancar camada de API, camada de API pode alcancar camada de dados, sem acesso direto web-para-dados)
   - ASG (Application Security Groups): agrupe VMs/NICs por função para gerenciamento simplificado de regras
   - Projete o fluxo NSG para aplicar: internet -> Front Door -> camada web -> camada de API -> camada de dados (sem pular camadas)
8. Projete a estratégia de Private Link/Private Endpoint para serviços backend:
   - Azure SQL, Cosmos DB, Storage: somente private endpoints (desabilite acesso público totalmente)
   - Comunicação entre serviços: private endpoints para PaaS, VNet integration para App Service/Container Apps
   - Políticas de Service Endpoint onde Private Link não é necessário
9. Projete micro-segmentacao para isolamento de tenants:
   - Isolamento no nível de rede (subnets dedicadas por tier de tenant: clientes básicos vs. premium)
   - vs. Isolamento no nível de aplicação (infraestrutura compartilhada com separacao de dados por tenant)
   - Documente os trade-offs: custo de subnets dedicadas vs. segurança de isolamento de rede completo

### Parte 4: proteção DDoS e detecção de ameacas

10. Projete a estratégia de proteção DDoS:
    - Azure DDoS Network Protection (por VNet, inclui garantia de proteção de custos, integração WAF, telemetria)
    - vs. DDoS de infraestrutura Azure padrão (apenas Layer 3/4, sem políticas customizadas)
    - Avalie DDoS IP Protection (por IP público, alternativa de menor custo)
11. Projete a estratégia de TLS:
    - Aplicação de TLS 1.3 no Front Door (configuração de versao TLS mínima)
    - Gerenciamento de certificados: certificados gerenciados pelo Azure Key Vault vs. certificados gerenciados pelo Front Door
    - Criptografia de ponta a ponta: re-criptografe trafego entre Front Door e servidores de origem
12. Projete monitoramento de segurança de rede:
    - Azure Firewall (Premium com IDPS para inspecao de trafego east-west)
    - NSG flow logs para análise de trafego de rede
    - Microsoft Defender for Cloud recomendacoes de segurança de rede
    - Network Watcher para troubleshooting e captura de pacotes

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-49"
  items={[
    "Arvore de decisao de balanceamento de carga aplicada com selecao justificada para cada padrão de trafego (HTTP global, HTTP regional, TCP interno)",
    "Estratégia de implantacao WAF seleciona WAF do Front Door vs WAF do Application Gateway com justificativa de defesa em profundidade",
    "Segmentacao de rede aplica acesso baseado em camadas (web -> API -> dados) com regras NSG e ASG",
    "Estratégia de Private Endpoint garante que nenhum serviço backend tenha exposicao pública a internet",
    "Tier de proteção DDoS selecionado com justificativa de custo (Network Protection vs IP Protection vs padrão)",
    "TLS 1.3 aplicado de ponta a ponta com gerenciamento centralizado de certificados no Key Vault"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Azure Front Door vs. Application Gateway WAF</summary>

O WAF do Front Door opera na borda (rede global de POPs da Microsoft) e pode bloquear ataques antes de chegarem a sua região Azure. Ele se destaca em ataques volumetricos, proteção contra bots e geo-filtering. O WAF do Application Gateway opera dentro da sua VNet e tem acesso a mais contexto de aplicação (inspecao no nível de VNet, integração mais estreita com serviços backend). Para aplicações voltadas para internet, use o WAF do Front Door como primeira linha de defesa. Adicione o WAF do Application Gateway somente se você precisar de inspecao WAF no nível de VNet que o Front Door não pode fornecer.

</details>

<details>
<summary>Dica 2: Tiers do Azure Firewall</summary>

O Azure Firewall vem em três SKUs: **Basic** (workloads pequenas/medias, throughput limitado, sem inspecao TLS), **Standard** (filtragem baseada em threat intelligence, filtragem FQDN, regras de rede/aplicação), e **Premium** (adiciona inspecao TLS, IDPS/IPS com detecção baseada em assinatura, filtragem de URL, categorias web). Para conformidade SOC 2 com inspecao de trafego east-west, Premium e tipicamente necessário para inspecionar trafego criptografado entre camadas. Standard é suficiente se você só precisa de filtragem de saida e regras baseadas em FQDN.

</details>

<details>
<summary>Dica 3: Simplificacao NSG vs. ASG</summary>

Sem ASGs, você precisa de regras NSG referenciando faixas de IP (fragil, quebra quando VMs mudam de IP). ASGs permitem atribuir uma tag lógica (ex.: "WebServers", "ApiServers") a NICs, e entao escrever regras NSG usando nomes ASG como origem/destino. Exemplo: Permitir ASG:WebServers -> ASG:ApiServers na porta 443. Isso e dinâmico (novas VMs automaticamente recebem as regras corretas quando atribuidas ao ASG), mais fácil de auditar e não requer gerenciamento de IP. Use ASGs para todas as regras de segmentacao intra-VNet.

</details>

<details>
<summary>Dica 4: Modelo de Custo do DDoS Protection</summary>

O Azure DDoS Network Protection tem uma taxa mensal fixa (aproximadamente $2.944/mes) mais cobracas de excedente por GB, cobrindo até 100 IPs públicos em todas as VNets na assinatura. O DDoS IP Protection e por preco por IP (aproximadamente $199/mes por IP) sem a taxa fixa. Para workloads com menos de 15 IPs públicos, IP Protection e mais custo-efetivo. Ambos incluem suporte de resposta rápida DDoS, proteção de custos (credito para custos de scale-out durante ataques) e integração WAF. A proteção de infraestrutura padrão fornece apenas proteção básica Layer 3/4 sem metricas ou alertas.

</details>

<details>
<summary>Dica 5: Private Link vs. Service Endpoints</summary>

Private Endpoints trazem o serviço PaaS para dentro da sua VNet com um IP privado (acessível do ambiente local via VPN/ExpressRoute, funciona com NSGs). Service Endpoints estendem a identidade da VNet para o serviço PaaS (trafego permanece no backbone Azure, mas o serviço ainda tem um IP público). Para conformidade SOC 2 onde "sem endpoints públicos para backend" é obrigatório, Private Endpoints sao necessários porque permitem desabilitar completamente o acesso público ao serviço PaaS. Service Endpoints não podem garantir que não haja acesso pela internet.

</details>

## Recursos de aprendizagem

- [Azure load balancing decision tree](https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/load-balancing-overview)
- [Azure Front Door overview](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-overview)
- [Azure Web Application Firewall overview](https://learn.microsoft.com/en-us/azure/web-application-firewall/overview)
- [Azure Firewall overview](https://learn.microsoft.com/en-us/azure/firewall/overview)
- [Azure DDoS Protection overview](https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview)
- [Azure Private Link overview](https://learn.microsoft.com/en-us/azure/private-link/private-link-overview)

## Verificação de conhecimento

<details>
<summary>1. Uma aplicação SaaS multi-região precisa de balanceamento de carga HTTP global com failover em menos de um segundo. Por que o Azure Front Door e preferido ao Traffic Manager para este cenário?</summary>

**O Front Door fornece failover instantaneo via anycast; o Traffic Manager depende do TTL do DNS.** O Azure Front Door usa roteamento anycast onde todos os nos de borda compartilham o mesmo endereço IP. Quando um backend se torna indisponivel, o Front Door imediatamente roteia requisicoes para o próximo backend saudavel na camada de rede (< 30 segundos de failover). O Traffic Manager é baseado em DNS: a velocidade de failover depende do TTL do DNS (mínimo 0 segundos configurado, mas clientes fazem cache de respostas DNS). O failover real do Traffic Manager pode levar 30-120 segundos devido ao cache DNS. Para workloads HTTP que requerem failover em menos de um minuto, o Front Door e a escolha correta.

</details>

<details>
<summary>2. Seu WAF no Front Door esta bloqueando requisicoes legitimas de API de uma integração parceira. As requisicoes contem payloads JSON que acionam regras de SQL injection. Como você resolve isso sem reduzir a segurança?</summary>

**Crie uma regra de exclusão WAF para o campo específico do body da requisicao da fonte específica.** Passos: (1) Revise os logs do WAF para identificar a regra específica sendo acionada (ex.: regra 942430 - detecção de anomalia de caractere SQL), (2) Crie uma exclusão que desabilita essa regra específica apenas para as requisicoes do parceiro (correspondencia por IP, header ou caminho URI), (3) Alternativamente, crie uma regra customizada com prioridade mais alta que explicitamente permite as requisicoes do parceiro antes que as regras gerenciadas as avaliem, (4) Não desabilite a regra globalmente pois ela protege outros caminhos de requisicao. Sempre prefira exclusoes direcionadas a desabilitar regras inteiramente.

</details>

<details>
<summary>3. Sua arquitetura usa NSGs para restringir o acesso da camada de API apenas a subnet da camada web. Um novo requisito precisa que uma ferramenta de monitoramento de terceiros implantada em uma subnet de gerenciamento faca health-check nos endpoints de API. Qual é a abordagem mais sustentavel?</summary>

**Use Application Security Groups (ASGs).** Atribua a NIC da ferramenta de monitoramento a um ASG chamado "MonitoringAgents." Adicione uma regra NSG permitindo ASG:MonitoringAgents alcancar ASG:ApiServers na porta de health check (ex.: 443). Isso e mais sustentavel do que adicionar o CIDR da subnet de gerenciamento a regra existente porque: (1) Se ferramentas de monitoramento mudam de subnet, a associacao ASG acompanha a NIC, (2) Você pode adicionar novas instâncias de monitoramento sem modificar regras NSG, (3) As regras sao lidas como intencao (monitoramento pode alcancar API) em vez de implementação (10.0.3.0/24 pode alcancar 10.0.2.0/24).

</details>

## Limpeza

```bash
# Delete all resources created in this challenge
# WARNING: DDoS protection plan has monthly cost - verify deletion
az group delete --name rg-az305-challenge49 --yes --no-wait
```

---

**Próximo**: [Challenge 50: Design a Complete Azure Solution (Cross-Domain Capstone)](/docs/az-305/infrastructure/challenge-50)
