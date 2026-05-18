---
sidebar_position: 7
title: "Challenge 40: Design API Integration"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 40: Design API Integration

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-20 | **Peso no Exame: 30-35%**

:::

## Introducao

A MedConnect e um sistema de saude que fornece prontuarios eletronicos (EHR), agendamento de consultas e gerenciamento de prescricoes. A plataforma deve expor APIs para tres categorias distintas de consumidores com niveis de confianca, requisitos de desempenho e padroes de acesso vastamente diferentes. O sistema processa Informacoes de Saude Protegidas (PHI) e deve cumprir as regulamentacoes HIPAA para todo o trafego de API, independentemente do tipo de consumidor.

Tipo de Consumidor 1 (Aplicativo movel interno): Usado por 5.000 profissionais de saude diariamente. Requer latencia inferior a 100ms para busca de pacientes. Totalmente confiavel pois e desenvolvido internamente e autenticado via managed identity. Precisa de acesso a todos os endpoints da API, incluindo dados sensiveis de pacientes. Tipo de Consumidor 2 (Hospitais parceiros): 12 organizacoes parceiras trocam prontuarios de pacientes para encaminhamentos e cuidados compartilhados. Cada parceiro tem um SLA unico (99,9% de disponibilidade, tempo de resposta maximo de 500ms), deve ser autenticado via OAuth2 client credentials, e so pode acessar prontuarios de pacientes com tokens de consentimento explicito. Tipo de Consumidor 3 (Desenvolvedores terceiros): Um ecossistema de 200+ startups de health-tech construindo apps de bem-estar, widgets de agendamento e ferramentas de pesquisa. Requerem API keys self-service, rate limiting (100 requisicoes/minuto para camada gratuita, 1.000 para camada paga), analitica de uso para cobranca, e acesso apenas a endpoints de dados anonimizados/agregados.

A arquitetura deve proteger os servicos backend de exposicao direta, aplicar politicas de seguranca consistentes, permitir versionamento de API conforme a plataforma evolui, e fornecer capacidades de monetizacao para o programa de desenvolvedores.

## Habilidades do Exame Cobertas

- Recomendar uma solucao para integracao de API

## Tarefas de Design

### Parte 1: Selecao da Camada do API Management

1. Avalie as camadas do Azure API Management para este cenario de saude:

| Recurso | Consumption | Developer | Basic | Standard | Premium |
|---------|-------------|-----------|-------|----------|---------|
| SLA | Sem SLA | Sem SLA | 99,95% | 99,95% | 99,95%+ (multi-regiao) |
| Integracao VNet | Nao | Nao | Nao | Nao | Sim (externa/interna) |
| Multi-regiao | Nao | Nao | Nao | Nao | Sim |
| Self-hosted gateway | Nao | Nao | Nao | Nao | Sim |
| Portal do desenvolvedor | Somente gerenciado | Sim | Sim | Sim | Sim |
| Capacidade (unidades) | Serverless | 1 | 1 | 1-4 | 1-12+ por regiao |
| Private endpoint | Nao | Nao | Nao | Nao | Sim |

2. Determine qual camada e necessaria para conformidade HIPAA:
   - O API gateway precisa estar dentro da VNet (modo interno)?
   - A conectividade de private endpoint para servicos backend e necessaria?
   - Qual camada fornece o isolamento de rede necessario para PHI?

3. Justifique a selecao considerando: disponibilidade multi-regiao para SLAs de parceiros, integracao VNet para HIPAA, portal do desenvolvedor para onboarding de terceiros, e capacidade para 5.000 usuarios internos.

### Parte 2: Design de Politicas por Consumidor

4. Projete politicas do API Management para cada tipo de consumidor:

**Aplicativo movel interno (Tipo 1)**:
- Autenticacao: Validar tokens de managed identity (politica validate-jwt)
- Rate limiting: Nenhum (confiavel, alto volume)
- Caching: Cache de respostas de busca de pacientes por 30 segundos (cache-lookup/cache-store)
- Backend: Pass-through direto com overhead minimo

**Hospitais parceiros (Tipo 2)**:
- Autenticacao: Fluxo OAuth2 client credentials (validate-jwt com audience especifica)
- Rate limiting: 10.000 requisicoes/hora por parceiro
- Validacao de consentimento: Politica customizada para verificar token de consentimento do paciente no header da requisicao
- Transformacao de resposta: Remover metadados internos antes de retornar
- Backend: Rotear para pool de backend especifico do parceiro baseado no client ID

**Desenvolvedores terceiros (Tipo 3)**:
- Autenticacao: Subscription key (API key via header Ocp-Apim-Subscription-Key)
- Rate limiting: 100 requisicoes/minuto (gratuito) ou 1.000 requisicoes/minuto (pago)
- Filtragem de IP: Allowlist de IP opcional para apps em producao
- Transformacao de resposta: Remover campos PHI, retornar apenas dados anonimizados
- Backend: Rotear para replica de dados anonimizados somente-leitura

5. Implemente as politicas de rate limiting usando `<rate-limit-by-key>`:
   - Como voce diferencia limites de taxa baseado na camada de subscription (gratuito vs pago)?
   - Qual resposta um consumidor com limite excedido recebe (HTTP 429)?
   - Como voce comunica a cota restante nos headers de resposta?

### Parte 3: Versionamento de API e Ciclo de Vida

6. Projete a estrategia de versionamento de API:
   - **Versionamento por caminho de URL**: `/api/v1/patients` vs `/api/v2/patients`
   - **Versionamento por header**: `Api-Version: 2024-01-15`
   - **Versionamento por query string**: `/api/patients?api-version=2024-01-15`
   - Qual abordagem e mais apropriada para cada tipo de consumidor?

7. Planeje o ciclo de vida de depreciacao da API:
   - Anuncio de versao: Como os consumidores sao notificados de novas versoes?
   - Periodo de sunset: Por quanto tempo versoes depreciadas permanecem ativas?
   - Breaking changes: O que constitui uma breaking change que requer uma nova versao?
   - Documentacao no portal do desenvolvedor: Como as diferencas entre versoes sao comunicadas?

8. Projete a estrategia de revisoes dentro de uma versao:
   - Use revisoes do API Management para mudancas nao-breaking
   - Como voce testa uma nova revisao antes de torna-la corrente?
   - Qual e o processo de rollback se uma nova revisao introduzir bugs?

### Parte 4: Seguranca, Conformidade e Monetizacao

9. Projete a arquitetura de seguranca de API compativel com HIPAA:
   - Todo trafego deve usar TLS 1.2+ (configurar na politica do APIM)
   - Logging de auditoria: Todas as chamadas de API registradas no Azure Monitor com identidade do chamador
   - Mascaramento de dados: Campos sensiveis mascarados nos logs de diagnostico
   - Protecao de backend: Servicos backend acessiveis apenas a partir do APIM (regras VNet/NSG)
   - Autenticacao por certificado para comunicacao com servicos backend (mutual TLS)

10. Projete a experiencia do portal do desenvolvedor para consumidores Tipo 3:
    - Registro self-service com verificacao de email
    - Provisionamento de API key (automatico apos registro)
    - Documentacao interativa de API (console try-it com ambiente sandbox)
    - Dashboard de uso mostrando chamadas feitas, cota restante, erros
    - Fluxo de upgrade da camada gratuita para camada paga

11. Projete o modelo de monetizacao:
    - Camada gratuita: 100 requisicoes/minuto, apenas dados anonimizados, sem SLA
    - Basic pago ($49/mes): 1.000 requisicoes/minuto, dados agregados, 99,5% SLA
    - Enterprise ($499/mes): 10.000 requisicoes/minuto, dados detalhados (com consentimento), 99,9% SLA, suporte prioritario
    - Como voce rastreia o uso por subscription para cobranca?
    - Integracao com recursos de monetizacao do Azure API Management ou cobranca externa (Stripe)

12. Projete o pipeline de analitica de API:
    - Quais metricas coletar: percentis de latencia, taxas de erro, principais consumidores, popularidade de endpoints
    - Exportar logs do API Management para workspace do Log Analytics
    - Criar dashboards para gerentes de produto de API (tendencias de uso, metricas de adocao)
    - Alertar sobre violacoes de SLA para APIs de parceiros

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-40"
  items={[
    "Camada Premium do APIM selecionada com justificativa de integracao VNet para conformidade HIPAA",
    "Politicas especificas por consumidor projetadas com autenticacao, rate limiting e transformacao de resposta apropriados",
    "Estrategia de versionamento de API definida com ciclo de vida de depreciacao e gerenciamento de revisoes",
    "Controles de seguranca HIPAA implementados (TLS, logging de auditoria, mascaramento de dados, mutual TLS)",
    "Portal do desenvolvedor e modelo de monetizacao projetados com acesso em camadas e cobranca",
    "Pipeline de analitica de API exporta para Log Analytics com dashboards de monitoramento de SLA"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: APIM Premium para Saude</summary>

O Azure API Management Premium e necessario para APIs de saude regulamentadas por HIPAA porque:
- **Integracao VNet (modo interno)**: O gateway APIM e implantado dentro da VNet sem IP publico. Servicos backend so sao acessiveis de dentro da VNet. Isso garante que PHI nunca trafegue pela internet publica entre APIM e backends.
- **Private endpoints**: Consumidores podem acessar o APIM via Azure Private Link, mantendo o trafego no backbone da Microsoft.
- **Multi-regiao**: Implante o APIM em 2+ regioes para o SLA de 99,9%+ exigido pelos contratos de parceiros.
- **Self-hosted gateway**: Para hospitais parceiros que precisam de um API gateway on-premises para conformidade local.

O custo do Premium (~$2.800/mes por unidade) e justificado pelos requisitos regulatorios e de SLA.

</details>

<details>
<summary>Dica 2: Configuracao de Politica de Rate Limiting</summary>

Use `rate-limit-by-key` para rate limiting por consumidor:

```xml
<inbound>
    <choose>
        <when condition="@(context.Subscription.Name.Contains("free"))">
            <rate-limit-by-key calls="100" renewal-period="60"
                counter-key="@(context.Subscription.Id)" />
        </when>
        <when condition="@(context.Subscription.Name.Contains("paid"))">
            <rate-limit-by-key calls="1000" renewal-period="60"
                counter-key="@(context.Subscription.Id)" />
        </when>
    </choose>
</inbound>
```

Adicione headers de cota restante:
```xml
<outbound>
    <set-header name="X-RateLimit-Remaining" exists-action="override">
        <value>@(context.Variables.GetValueOrDefault("remainingCalls", ""))</value>
    </set-header>
</outbound>
```

</details>

<details>
<summary>Dica 3: Transformacao de Resposta para Remocao de PHI</summary>

Para consumidores Tipo 3 (terceiros), remova PHI das respostas usando politicas outbound do APIM:

```xml
<outbound>
    <set-body>
        @{
            var response = context.Response.Body.As<JObject>();
            response.Remove("patientSSN");
            response.Remove("dateOfBirth");
            response.Remove("address");
            response["patientId"] = "ANONYMIZED";
            return response.ToString();
        }
    </set-body>
</outbound>
```

Para anonimizacao mais complexa, roteie requisicoes do Tipo 3 para um backend separado que serve apenas dados pre-anonimizados (defesa em profundidade). Nunca confie exclusivamente na politica do gateway para remover PHI de um backend que retorna registros completos.

</details>

<details>
<summary>Dica 4: Melhores Praticas de Versionamento de API</summary>

Para APIs de saude com multiplos tipos de consumidores:
- **Versionamento por caminho de URL** (`/v1/`, `/v2/`) e melhor para desenvolvedores terceiros porque e o mais explicito e descobrivel na documentacao.
- **Versionamento por header** (`Api-Version: 2024-01-15`) e adequado para apps internos onde voce controla o cliente e pode atualizar headers sem mudar URLs.
- O Azure API Management suporta todos os esquemas de versionamento nativamente.

Cronograma de depreciacao para saude:
- Anunciar nova versao: 6 meses antes do sunset
- Suportar ambas as versoes: 12-18 meses de sobreposicao (parceiros de saude tem ciclos de atualizacao lentos)
- Sunset da versao antiga: Somente apos confirmar zero trafego por 30 dias
- Breaking changes que requerem nova versao: Remocao de campos, mudanca de tipos de dados, remocao de endpoints

</details>

<details>
<summary>Dica 5: Monetizacao com Produtos do APIM</summary>

Os Produtos do Azure API Management agrupam APIs e aplicam politicas:
- **Produto: Free Developer** -> inclui APIs anonimizadas, subscription key gratuita, limite de 100 req/min
- **Produto: Basic** -> inclui APIs agregadas, requer aprovacao, 1.000 req/min
- **Produto: Enterprise** -> inclui todas as APIs (com consentimento), aprovacao manual, 10.000 req/min

Cada produto pode ter:
- Diferentes termos de uso (aceitos durante o cadastro)
- Diferentes fluxos de aprovacao de subscription (auto-aprovacao para gratuito, manual para enterprise)
- Diferentes politicas aplicadas no nivel do produto

Para integracao de cobranca, exporte dados de uso do APIM Built-in Analytics ou Log Analytics para seu sistema de cobranca. O APIM nao lida com pagamentos diretamente; integre com Stripe ou Azure Marketplace para transacoes comerciais.

</details>

## Recursos de Aprendizagem

- [Azure API Management overview](https://learn.microsoft.com/en-us/azure/api-management/api-management-key-concepts)
- [API Management policies reference](https://learn.microsoft.com/en-us/azure/api-management/api-management-policies)
- [API Management access restriction policies](https://learn.microsoft.com/en-us/azure/api-management/api-management-access-restriction-policies)
- [API versioning in Azure API Management](https://learn.microsoft.com/en-us/azure/api-management/api-management-versions)
- [Deploy API Management to a virtual network](https://learn.microsoft.com/en-us/azure/api-management/api-management-using-with-vnet)

## Verificacao de Conhecimento

<details>
<summary>1. Uma API de saude deve garantir que Informacoes de Saude Protegidas nunca trafeguem pela internet publica entre o API gateway e os servicos backend. Qual modo de implantacao do APIM alcanca isso?</summary>

**Modo VNet interno (camada Premium).** No modo interno, o gateway do API Management e implantado dentro de uma VNet com apenas um endereco IP privado. Servicos backend na mesma VNet (ou VNets pareadas) sao acessados via IPs privados. Consumidores externos alcancam o APIM atraves do Azure Application Gateway ou private endpoints. Isso garante que PHI permaneca na rede privada entre APIM e backends. O modo externo coloca o APIM na VNet mas com um IP publico, o que nao isola completamente o trafego de backend do caminho da internet.

</details>

<details>
<summary>2. Por que desenvolvedores terceiros devem acessar um backend anonimizado separado em vez de confiar exclusivamente na transformacao de resposta do APIM para remover PHI?</summary>

**Defesa em profundidade: se a politica do APIM falhar ou for mal configurada, PHI seria exposta a consumidores nao confiaveis.** Uma abordagem de camada unica (remocao apenas por politica) cria um ponto unico de falha para conformidade. Se um desenvolvedor acidentalmente remover a politica de transformacao durante uma atualizacao, ou um novo endpoint de API for adicionado sem a politica, PHI vaza para terceiros. Um backend anonimizado dedicado garante que mesmo com um gateway mal configurado, os dados servidos a consumidores Tipo 3 nunca contenham PHI na origem. Este e o principio de defesa em profundidade aplicado a classificacao de dados e seguranca de API.

</details>

<details>
<summary>3. Um hospital parceiro relata que 5% de suas chamadas de API falham com HTTP 429 (Too Many Requests). Como voce diagnostica e resolve isso?</summary>

**Verifique a analitica do APIM para a subscription do parceiro para verificar se estao excedendo o rate limit, entao aumente a cota ou implemente suavizacao de requisicoes.** HTTP 429 significa que a politica de rate-limit foi acionada. Passos: (1) Consulte o Log Analytics pelo ID de subscription do parceiro com respostas 429 para identificar horarios de pico. (2) Compare a taxa real de requisicoes contra o limite configurado (10.000/hora). (3) Se o trafego legitimo exceder o limite, aumente a cota ou mude para uma camada superior. (4) Se o trafego for em rajadas, sugira implementar retry no lado do cliente com backoff exponencial e o valor do header `Retry-After` retornado pelo APIM.

</details>

<details>
<summary>4. Uma API evolui de v1 para v2 com uma breaking change (formato do ID do paciente muda de inteiro para GUID). Como voce deve gerenciar essa transicao para hospitais parceiros?</summary>

**Publique v2 ao lado de v1, comunique a mudanca com 6+ meses de antecedencia, e mantenha v1 ate que todos os parceiros tenham migrado.** Use versionamento de API do APIM com esquema de caminho de URL (`/v1/patients/123` vs `/v2/patients/abc-def-123`). Ambas as versoes roteiam para versoes de backend apropriadas simultaneamente. Forneca guias de migracao no portal do desenvolvedor, rastreie o uso de v1 por parceiro na analitica, e entre em contato proativamente com parceiros que ainda usam v1. So faca sunset de v1 apos confirmar zero trafego por 30+ dias. Para saude, permita 12-18 meses de sobreposicao devido aos requisitos de gerenciamento de mudancas regulatorias.

</details>

## Laboratorio de Validacao

Implante uma prova de conceito minima para validar seu design:

1. Crie um resource group para este laboratorio:

```bash
az group create --name rg-az305-challenge40 --location eastus
```

2. Crie uma instancia do API Management (camada Consumption implanta em segundos):

```bash
az apim create --resource-group rg-az305-challenge40 --name apim-challenge40-$RANDOM \
  --publisher-name "AZ305 Lab" --publisher-email "lab@example.com" \
  --sku-name Consumption --location eastus
```

3. Importe uma API mock usando a spec OpenAPI do Petstore:

```bash
az apim api import --resource-group rg-az305-challenge40 \
  --service-name $(az apim list --resource-group rg-az305-challenge40 --query "[0].name" -o tsv) \
  --api-id petstore --path pet --specification-format OpenApi \
  --specification-url "https://petstore3.swagger.io/api/v3/openapi.json" \
  --display-name "Pet Store"
```

4. Verifique se a API foi criada e liste suas operacoes:

```bash
az apim api operation list --resource-group rg-az305-challenge40 \
  --service-name $(az apim list --resource-group rg-az305-challenge40 --query "[0].name" -o tsv) \
  --api-id petstore --output table
```

:::tip
Esta mini-implantacao valida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge40 --yes --no-wait
```

---

**Proximo**: [Challenge 41: Design a Caching Strategy](/docs/az-305/infrastructure/challenge-41)
