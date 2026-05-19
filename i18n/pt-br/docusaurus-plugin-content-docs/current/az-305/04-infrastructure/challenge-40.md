---
sidebar_position: 7
title: "Desafio 40: Projetar Integração de API"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 40: Projetar Integração de API

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-20 | **Peso no Exame: 30-35%**

:::

## Introdução

A MedConnect é um sistema de saúde que fornece prontuarios eletronicos (EHR), agendamento de consultas e gerenciamento de prescricoes. A plataforma deve expor APIs para três categorias distintas de consumidores com níveis de confiança, requisitos de desempenho e padrões de acesso vastamente diferentes. O sistema processa Informações de Saúde Protegidas (PHI) e deve cumprir as regulamentacoes HIPAA para todo o trafego de API, independentemente do tipo de consumidor.

Tipo de Consumidor 1 (Aplicativo movel interno): Usado por 5.000 profissionais de saúde diariamente. Requer latência inferior a 100ms para busca de pacientes. Totalmente confiavel pois e desenvolvido internamente e autenticado via managed identity. Precisa de acesso a todos os endpoints da API, incluindo dados sensiveis de pacientes. Tipo de Consumidor 2 (Hospitais parceiros): 12 organizações parceiras trocam prontuarios de pacientes para encaminhamentos e cuidados compartilhados. Cada parceiro tem um SLA único (99,9% de disponibilidade, tempo de resposta máximo de 500ms), deve ser autenticado via OAuth2 client credentials, e só pode acessar prontuarios de pacientes com tokens de consentimento explicito. Tipo de Consumidor 3 (Desenvolvedores terceiros): Um ecossistema de 200+ startups de health-tech construindo apps de bem-estar, widgets de agendamento e ferramentas de pesquisa. Requerem API keys self-service, rate limiting (100 requisicoes/minuto para camada gratuita, 1.000 para camada paga), analitica de uso para cobranca, e acesso apenas a endpoints de dados anonimizados/agregados.

A arquitetura deve proteger os serviços backend de exposicao direta, aplicar políticas de segurança consistentes, permitir versionamento de API conforme a plataforma evolui, é fornecer capacidades de monetizacao para o programa de desenvolvedores.

## Habilidades do Exame Cobertas

- Recomendar uma solução para integração de API

## Tarefas de Design

### Parte 1: Selecao da Camada do API Management

1. Avalie as camadas do Azure API Management para este cenário de saúde:

| Recurso | Consumption | Developer | Basic | Standard | Premium |
|---------|-------------|-----------|-------|----------|---------|
| SLA | Sem SLA | Sem SLA | 99,95% | 99,95% | 99,95%+ (multi-região) |
| Integração VNet | Não | Não | Não | Não | Sim (externa/interna) |
| Multi-região | Não | Não | Não | Não | Sim |
| Self-hosted gateway | Não | Não | Não | Não | Sim |
| Portal do desenvolvedor | Somente gerenciado | Sim | Sim | Sim | Sim |
| Capacidade (unidades) | Serverless | 1 | 1 | 1-4 | 1-12+ por região |
| Private endpoint | Não | Não | Não | Não | Sim |

2. Determine qual camada é necessária para conformidade HIPAA:
   - O API gateway precisa estar dentro da VNet (modo interno)?
   - A conectividade de private endpoint para serviços backend é necessária?
   - Qual camada fornece o isolamento de rede necessário para PHI?

3. Justifique a selecao considerando: disponibilidade multi-região para SLAs de parceiros, integração VNet para HIPAA, portal do desenvolvedor para onboarding de terceiros, e capacidade para 5.000 usuários internos.

### Parte 2: Design de Políticas por Consumidor

4. Projete políticas do API Management para cada tipo de consumidor:

**Aplicativo movel interno (Tipo 1)**:
- Autenticação: Validar tokens de managed identity (política validate-jwt)
- Rate limiting: Nenhum (confiavel, alto volume)
- Caching: Cache de respostas de busca de pacientes por 30 segundos (cache-lookup/cache-store)
- Backend: Pass-through direto com overhead mínimo

**Hospitais parceiros (Tipo 2)**:
- Autenticação: Fluxo OAuth2 client credentials (validate-jwt com audience específica)
- Rate limiting: 10.000 requisicoes/hora por parceiro
- Validação de consentimento: Política customizada para verificar token de consentimento do paciente no header da requisicao
- Transformacao de resposta: Remover metadados internos antes de retornar
- Backend: Rotear para pool de backend específico do parceiro baseado no client ID

**Desenvolvedores terceiros (Tipo 3)**:
- Autenticação: Subscription key (API key via header Ocp-Apim-Subscription-Key)
- Rate limiting: 100 requisicoes/minuto (gratuito) ou 1.000 requisicoes/minuto (pago)
- Filtragem de IP: Allowlist de IP opcional para apps em produção
- Transformacao de resposta: Remover campos PHI, retornar apenas dados anonimizados
- Backend: Rotear para replica de dados anonimizados somente-leitura

5. Implemente as políticas de rate limiting usando `<rate-limit-by-key>`:
   - Como você diferencia limites de taxa baseado na camada de subscription (gratuito vs pago)?
   - Qual resposta um consumidor com limite excedido recebe (HTTP 429)?
   - Como você comunica a cota restante nos headers de resposta?

### Parte 3: Versionamento de API e Ciclo de Vida

6. Projete a estratégia de versionamento de API:
   - **Versionamento por caminho de URL**: `/api/v1/patients` vs `/api/v2/patients`
   - **Versionamento por header**: `Api-Version: 2024-01-15`
   - **Versionamento por query string**: `/api/patients?api-version=2024-01-15`
   - Qual abordagem e mais apropriada para cada tipo de consumidor?

7. Planeje o ciclo de vida de depreciacao da API:
   - Anuncio de versao: Como os consumidores sao notificados de novas versoes?
   - Período de sunset: Por quanto tempo versoes depreciadas permanecem ativas?
   - Breaking changes: O que constitui uma breaking change que requer uma nova versao?
   - Documentação no portal do desenvolvedor: Como as diferencas entre versoes sao comunicadas?

8. Projete a estratégia de revisoes dentro de uma versao:
   - Use revisoes do API Management para mudanças não-breaking
   - Como você testa uma nova revisao antes de torna-la corrente?
   - Qual é o processo de rollback se uma nova revisao introduzir bugs?

### Parte 4: Segurança, Conformidade e Monetizacao

9. Projete a arquitetura de segurança de API compatível com HIPAA:
   - Todo trafego deve usar TLS 1.2+ (configurar na política do APIM)
   - Logging de auditoria: Todas as chamadas de API registradas no Azure Monitor com identidade do chamador
   - Mascaramento de dados: Campos sensiveis mascarados nos logs de diagnóstico
   - Proteção de backend: Serviços backend acessiveis apenas a partir do APIM (regras VNet/NSG)
   - Autenticação por certificado para comunicação com serviços backend (mutual TLS)

10. Projete a experiência do portal do desenvolvedor para consumidores Tipo 3:
    - Registro self-service com verificação de email
    - Provisionamento de API key (automático apos registro)
    - Documentação interativa de API (console try-it com ambiente sandbox)
    - Dashboard de uso mostrando chamadas feitas, cota restante, erros
    - Fluxo de upgrade da camada gratuita para camada paga

11. Projete o modelo de monetizacao:
    - Camada gratuita: 100 requisicoes/minuto, apenas dados anonimizados, sem SLA
    - Basic pago ($49/mes): 1.000 requisicoes/minuto, dados agregados, 99,5% SLA
    - Enterprise ($499/mes): 10.000 requisicoes/minuto, dados detalhados (com consentimento), 99,9% SLA, suporte prioritario
    - Como você rastreia o uso por subscription para cobranca?
    - Integração com recursos de monetizacao do Azure API Management ou cobranca externa (Stripe)

12. Projete o pipeline de analitica de API:
    - Quais metricas coletar: percentis de latência, taxas de erro, principais consumidores, popularidade de endpoints
    - Exportar logs do API Management para workspace do Log Analytics
    - Criar dashboards para gerentes de produto de API (tendencias de uso, metricas de adocao)
    - Alertar sobre violacoes de SLA para APIs de parceiros

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-40"
  items={[
    "Camada Premium do APIM selecionada com justificativa de integração VNet para conformidade HIPAA",
    "Políticas específicas por consumidor projetadas com autenticação, rate limiting e transformacao de resposta apropriados",
    "Estratégia de versionamento de API definida com ciclo de vida de depreciacao e gerenciamento de revisoes",
    "Controles de segurança HIPAA implementados (TLS, logging de auditoria, mascaramento de dados, mutual TLS)",
    "Portal do desenvolvedor e modelo de monetizacao projetados com acesso em camadas e cobranca",
    "Pipeline de analitica de API exporta para Log Analytics com dashboards de monitoramento de SLA"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: APIM Premium para Saúde</summary>

O Azure API Management Premium é necessário para APIs de saúde regulamentadas por HIPAA porque:
- **Integração VNet (modo interno)**: O gateway APIM e implantado dentro da VNet sem IP público. Serviços backend só sao acessiveis de dentro da VNet. Isso garante que PHI nunca trafegue pela internet pública entre APIM e backends.
- **Private endpoints**: Consumidores podem acessar o APIM via Azure Private Link, mantendo o trafego no backbone da Microsoft.
- **Multi-região**: Implante o APIM em 2+ regiões para o SLA de 99,9%+ exigido pelos contratos de parceiros.
- **Self-hosted gateway**: Para hospitais parceiros que precisam de um API gateway on-premises para conformidade local.

O custo do Premium (~$2.800/mes por unidade) e justificado pelos requisitos regulatorios e de SLA.

</details>

<details>
<summary>Dica 2: Configuração de Política de Rate Limiting</summary>

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

Para consumidores Tipo 3 (terceiros), remova PHI das respostas usando políticas outbound do APIM:

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

Para anonimizacao mais complexa, roteie requisicoes do Tipo 3 para um backend separado que serve apenas dados pré-anonimizados (defesa em profundidade). Nunca confie exclusivamente na política do gateway para remover PHI de um backend que retorna registros completos.

</details>

<details>
<summary>Dica 4: Melhores Práticas de Versionamento de API</summary>

Para APIs de saúde com múltiplos tipos de consumidores:
- **Versionamento por caminho de URL** (`/v1/`, `/v2/`) e melhor para desenvolvedores terceiros porque e o mais explicito e descobrivel na documentação.
- **Versionamento por header** (`Api-Version: 2024-01-15`) e adequado para apps internos onde você controla o cliente e pode atualizar headers sem mudar URLs.
- O Azure API Management suporta todos os esquemas de versionamento nativamente.

Cronograma de depreciacao para saúde:
- Anunciar nova versao: 6 meses antes do sunset
- Suportar ambas as versoes: 12-18 meses de sobreposicao (parceiros de saúde tem ciclos de atualização lentos)
- Sunset da versao antiga: Somente apos confirmar zero trafego por 30 dias
- Breaking changes que requerem nova versao: Remocao de campos, mudança de tipos de dados, remocao de endpoints

</details>

<details>
<summary>Dica 5: Monetizacao com Produtos do APIM</summary>

Os Produtos do Azure API Management agrupam APIs e aplicam políticas:
- **Produto: Free Developer** -> inclui APIs anonimizadas, subscription key gratuita, limite de 100 req/min
- **Produto: Basic** -> inclui APIs agregadas, requer aprovacao, 1.000 req/min
- **Produto: Enterprise** -> inclui todas as APIs (com consentimento), aprovacao manual, 10.000 req/min

Cada produto pode ter:
- Diferentes termos de uso (aceitos durante o cadastro)
- Diferentes fluxos de aprovacao de subscription (auto-aprovacao para gratuito, manual para enterprise)
- Diferentes políticas aplicadas no nível do produto

Para integração de cobranca, exporte dados de uso do APIM Built-in Analytics ou Log Analytics para seu sistema de cobranca. O APIM não lida com pagamentos diretamente; integre com Stripe ou Azure Marketplace para transações comerciais.

</details>

## Recursos de Aprendizagem

- [Azure API Management overview](https://learn.microsoft.com/en-us/azure/api-management/api-management-key-concepts)
- [API Management policies reference](https://learn.microsoft.com/en-us/azure/api-management/api-management-policies)
- [API Management access restriction policies](https://learn.microsoft.com/en-us/azure/api-management/api-management-access-restriction-policies)
- [API versioning in Azure API Management](https://learn.microsoft.com/en-us/azure/api-management/api-management-versions)
- [Deploy API Management to a virtual network](https://learn.microsoft.com/en-us/azure/api-management/api-management-using-with-vnet)

## Verificação de Conhecimento

<details>
<summary>1. Uma API de saúde deve garantir que Informações de Saúde Protegidas nunca trafeguem pela internet pública entre o API gateway e os serviços backend. Qual modo de implantacao do APIM alcanca isso?</summary>

**Modo VNet interno (camada Premium).** No modo interno, o gateway do API Management e implantado dentro de uma VNet com apenas um endereço IP privado. Serviços backend na mesma VNet (ou VNets pareadas) sao acessados via IPs privados. Consumidores externos alcancam o APIM atraves do Azure Application Gateway ou private endpoints. Isso garante que PHI permaneca na rede privada entre APIM e backends. O modo externo coloca o APIM na VNet mas com um IP público, o que não isola completamente o trafego de backend do caminho da internet.

</details>

<details>
<summary>2. Por que desenvolvedores terceiros devem acessar um backend anonimizado separado em vez de confiar exclusivamente na transformacao de resposta do APIM para remover PHI?</summary>

**Defesa em profundidade: se a política do APIM falhar ou for mal configurada, PHI seria exposta a consumidores não confiaveis.** Uma abordagem de camada única (remocao apenas por política) cria um ponto único de falha para conformidade. Se um desenvolvedor acidentalmente remover a política de transformacao durante uma atualização, ou um novo endpoint de API for adicionado sem a política, PHI vaza para terceiros. Um backend anonimizado dedicado garante que mesmo com um gateway mal configurado, os dados servidos a consumidores Tipo 3 nunca contenham PHI na origem. Este e o principio de defesa em profundidade aplicado a classificacao de dados e segurança de API.

</details>

<details>
<summary>3. Um hospital parceiro relata que 5% de suas chamadas de API falham com HTTP 429 (Too Many Requests). Como você diagnostica e resolve isso?</summary>

**Verifique a analitica do APIM para a subscription do parceiro para verificar se estao excedendo o rate limit, entao aumente a cota ou implemente suavizacao de requisicoes.** HTTP 429 significa que a política de rate-limit foi acionada. Passos: (1) Consulte o Log Analytics pelo ID de subscription do parceiro com respostas 429 para identificar horarios de pico. (2) Compare a taxa real de requisicoes contra o limite configurado (10.000/hora). (3) Se o trafego legitimo exceder o limite, aumente a cota ou mude para uma camada superior. (4) Se o trafego for em rajadas, sugira implementar retry no lado do cliente com backoff exponencial e o valor do header `Retry-After` retornado pelo APIM.

</details>

<details>
<summary>4. Uma API evolui de v1 para v2 com uma breaking change (formato do ID do paciente muda de inteiro para GUID). Como você deve gerenciar essa transicao para hospitais parceiros?</summary>

**Publique v2 ao lado de v1, comunique a mudança com 6+ meses de antecedencia, e mantenha v1 até que todos os parceiros tenham migrado.** Use versionamento de API do APIM com esquema de caminho de URL (`/v1/patients/123` vs `/v2/patients/abc-def-123`). Ambas as versoes roteiam para versoes de backend apropriadas simultaneamente. Forneca guias de migração no portal do desenvolvedor, rastreie o uso de v1 por parceiro na analitica, e entre em contato proativamente com parceiros que ainda usam v1. Só faca sunset de v1 apos confirmar zero trafego por 30+ dias. Para saúde, permita 12-18 meses de sobreposicao devido aos requisitos de gerenciamento de mudanças regulatorias.

</details>

## Laboratório de Validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um resource group para este laboratório:

```bash
az group create --name rg-az305-challenge40 --location eastus
```

2. Crie uma instância do API Management (camada Consumption implanta em segundos):

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

4. Verifique se a API foi criada e liste suas operações:

```bash
az apim api operation list --resource-group rg-az305-challenge40 \
  --service-name $(az apim list --resource-group rg-az305-challenge40 --query "[0].name" -o tsv) \
  --api-id petstore --output table
```

:::tip
Esta mini-implantacao válida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge40 --yes --no-wait
```

---

**Próximo**: [Challenge 41: Design a Caching Strategy](/docs/az-305/infrastructure/challenge-41)
