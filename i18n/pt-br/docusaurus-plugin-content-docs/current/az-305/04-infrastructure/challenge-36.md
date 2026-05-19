---
sidebar_position: 3
title: "Desafio 36: Projetar uma Solução Baseada em Contêineres"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 36: projetar uma solução baseada em contêineres

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-20 | **Peso no Exame: 30-35%**

:::

## Introdução

CloudCart é uma empresa SaaS migrando 20 microservicos de um cluster Kubernetes on-premises para o Azure. A equipe de engenharia tem níveis variados de expertise em Kubernetes: a equipe de plataforma e proficiente com kubectl, Helm charts e service meshes, mas os desenvolvedores de aplicação apenas querem implantar containers sem gerenciar infraestrutura. A empresa precisa selecionar o serviço correto de hospedagem de containers para cada microservico baseado em seus requisitos operacionais.

Os 20 microservicos se dividem em três categorias: (1) Oito serviços que requerem controle granular sobre rede, ingress controllers customizados (NGINX com anotacoes específicas), um service mesh (Istio) para mTLS entre serviços, e operators Kubernetes customizados para failover de banco de dados. (2) Dez serviços que sao APIs HTTP stateless simples precisando apenas de auto-scaling, gerenciamento de revisoes e integração com Dapr para mensageria pub/sub. (3) Dois serviços de inferencia de ML que requerem GPUs NVIDIA para classificacao de imagens em tempo real, processam requisicoes em rajadas e precisam escalar para zero quando nenhuma requisicao de inferencia esta na fila.

O orcamento de migração requer minimizar overhead operacional onde possível. A equipe de plataforma pode gerenciar um cluster Kubernetes mas não tem largura de banda para gerenciar múltiplos clusters ou lidar com operações day-2 para cargas de trabalho simples.

## Habilidades do exame cobertas

- Recomendar uma solução baseada em containers

## Tarefas de design

### Parte 1: selecao de plataforma de Container

1. Avalie as três principais opcoes de hospedagem de containers Azure para cada categoria de microservico:

| Criterio | AKS | Azure Container Apps | Azure Container Instances |
|----------|-----|---------------------|--------------------------|
| Plano de controle Kubernetes | Acesso completo | Abstraido (construido sobre AKS) | Nenhum |
| Rede customizada | Controle CNI completo | Limitado (baseado em envoy) | Injecao VNet |
| Suporte a service mesh | Qualquer (Istio, Linkerd) | Dapr integrado | Nenhum |
| Suporte a GPU | Sim (GPU node pools) | Sim (GPU workload profiles) | Sim (GPU SKUs) |
| Scale to zero | Sim (com KEDA) | Nativo | N/A (por execução) |
| Overhead operacional mínimo | Alto | Baixo | Mais baixo |

2. Atribua cada categoria de microservico a plataforma apropriada:
   - Categoria 1 (complexo, precisa de primitivas Kubernetes): Qual plataforma e por que?
   - Categoria 2 (APIs HTTP simples com Dapr): Qual plataforma e por que?
   - Categoria 3 (inferencia GPU, scale-to-zero): Qual plataforma e por que?

3. Documente por que rodar todos os 20 serviços no AKS seria operacionalmente desperdicador, e por que rodar os serviços da Categoria 1 no Container Apps seria tecnicamente insuficiente.

### Parte 2: design do cluster AKS

4. Projete o cluster AKS para os 8 microservicos complexos:
   - **Rede**: Compare Azure CNI vs Azure CNI Overlay vs kubenet:
     - kubenet: Simples, usa NAT, limitado a 400 nos, sem suporte Windows
     - Azure CNI: Cada pod recebe um IP da VNet, consome espaço de endereço da subnet
     - Azure CNI Overlay: Pods recebem IPs overlay, preserva espaço de endereço da VNet
   - Selecione o modelo de rede e justifique baseado nas restrições de endereço IP

5. Projete a estratégia de node pool:
   - System node pool (componentes do plano de controle): Qual tamanho e contagem?
   - User node pool para cargas de trabalho de aplicação: Limites de auto-scaling?
   - Cargas de trabalho GPU devem rodar no mesmo cluster (node pool separado) ou separadamente?

6. Planeje a configuração de scaling do cluster:
   - Cluster autoscaler: Contagens min/max de nos por pool
   - KEDA (Kubernetes Event-Driven Autoscaling): Para quais cargas de trabalho?
   - Horizontal Pod Autoscaler: Limiares de CPU/memoria

### Parte 3: design do ambiente Container Apps

7. Projete o ambiente Azure Container Apps para as 10 APIs HTTP simples:
   - Tipo de ambiente: Somente Consumption vs Dedicated (workload profiles)?
   - Regras de scaling: Requisicoes HTTP concorrentes, tamanho de fila, metricas customizadas?
   - Gerenciamento de revisoes: Revisao única vs múltiplas revisoes ativas (divisao de trafego)?

8. Configure a integração Dapr para os Container Apps:
   - Quais building blocks do Dapr sao necessários (pub/sub, state, service invocation)?
   - Como funciona a invocacao service-to-service do Dapr dentro de um ambiente Container Apps?
   - Qual é o modelo de rede entre Container Apps no mesmo ambiente?

### Parte 4: Container Registry e segurança

9. Projete a estratégia de Azure Container Registry (ACR):
   - Qual tier do ACR (Basic, Standard, Premium) atende aos requisitos?
   - Como as imagens devem ser compartilhadas entre AKS e Container Apps?
   - Habilite varredura de vulnerabilidades com Microsoft Defender for Containers

10. Planeje a postura de segurança de containers:
    - Assinatura de imagens e content trust
    - Varredura de segurança em tempo de execução
    - Network policies para comunicação pod-to-pod no AKS
    - Managed identity para pull de imagens (vs. credenciais de admin)

11. Projete o pipeline de CI/CD para implantar tanto no AKS (Helm charts) quanto no Container Apps (implantacao por revisao) a partir de um único container registry.

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-36"
  items={[
    "Cada categoria de microservico mapeada para a plataforma de container correta com justificativa",
    "Modelo de rede AKS selecionado com análise de espaço de endereço IP",
    "Estratégia de node pool projetada com limites de auto-scaling e consideracao de GPU node pool",
    "Ambiente Container Apps configurado com regras de scaling apropriadas e integração Dapr",
    "Tier ACR selecionado com varredura de segurança e acesso por managed identity configurados",
    "Justificativa clara documentada de por que uma única plataforma para todos os 20 serviços e subotima"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Arvore de Decisao de Selecao de Plataforma</summary>

Use este fluxo de decisao:
1. O serviço precisa de recursos Kubernetes customizados (CRDs, operators, service mesh)? -> AKS
2. O serviço precisa de computacao GPU com scale-to-zero? -> Container Apps com GPU workload profiles ou AKS com GPU node pools
3. E uma API HTTP simples ou processador orientado a eventos? -> Azure Container Apps
4. E uma tarefa batch de curta duracao ou sidecar? -> Azure Container Instances (ou AKS Jobs)

Container Apps e construido sobre AKS internamente mas abstrai o gerenciamento do cluster. Você obtem ingress baseado em Envoy, scaling baseado em KEDA e integração Dapr sem gerenciar o plano de controle.

</details>

<details>
<summary>Dica 2: Comparacao de Rede AKS</summary>

**kubenet**: Pods recebem IPs de um espaço de endereço separado (10.244.0.0/16 por padrão). Apenas IPs de nos consomem endereços VNet. Limitado a 400 nos e 250 pods/no. Sem suporte a containers Windows. Simples mas com limitacoes.

**Azure CNI**: Cada pod recebe um IP da VNet. Uma subnet /24 (256 endereços) suporta apenas ~8 nos com 30 pods cada. Você precisa de uma subnet grande (ex.: /16) para 100+ pods. Beneficio: pods sao diretamente enderecaveis da VNet.

**Azure CNI Overlay**: Pods recebem IPs de rede overlay (não IPs da VNet). Nos ainda consomem IPs da VNet. Melhor para clusters grandes que precisam de integração VNet sem consumir espaço massivo de endereços. Suporta até 1,000 nos e 250 pods/no.

Para a maioria das novas implantacoes AKS, Azure CNI Overlay fornece o melhor equilibrio.

</details>

<details>
<summary>Dica 3: GPU Workload Profiles do Container Apps</summary>

Azure Container Apps suporta cargas de trabalho GPU através de workload profiles dedicados. Consideracoes chave:
- Use um ambiente Dedicated (não somente Consumption) para acessar GPU profiles
- GPU profiles fornecem GPUs NVIDIA para cargas de trabalho de inferencia ML
- Scale-to-zero é suportado, significando que você não paga nada quando nenhuma requisicao de inferencia chega
- Isso elimina a necessidade de um cluster AKS separado apenas para 2 serviços GPU

Compare o custo operacional: gerenciar um GPU node pool no AKS (configuração de node pool, atualizações de driver, scheduling) vs. Container Apps GPU profile (totalmente gerenciado, apenas implante seu container).

</details>

<details>
<summary>Dica 4: Selecao de Tier ACR</summary>

- **Basic**: 10 GiB de armazenamento, adequado para dev/test
- **Standard**: 100 GiB de armazenamento, maior throughput, adequado para maioria das cargas de produção
- **Premium**: 500 GiB de armazenamento, geo-replicação, private link, content trust, redundância de zona

Para este cenário, **Premium** é recomendado porque:
- Geo-replicação garante pulls rápidos de clusters AKS em qualquer região
- Private link protege o endpoint do registry dentro da VNet
- Content trust habilita assinatura de imagens para segurança da cadeia de suprimentos
- Integração com Defender for Containers para varredura de vulnerabilidades esta disponível em todos os tiers mas Premium fornece o isolamento de rede necessário para produção

</details>

## Recursos de aprendizagem

- [Comparing Azure container options](https://learn.microsoft.com/en-us/azure/container-apps/compare-options)
- [AKS networking concepts](https://learn.microsoft.com/en-us/azure/aks/concepts-network)
- [Azure Container Apps overview](https://learn.microsoft.com/en-us/azure/container-apps/overview)
- [Azure Container Registry service tiers](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Dapr integration with Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/dapr-overview)

## Verificação de conhecimento

<details>
<summary>1. Uma equipe precisa rodar um service mesh Istio com recursos EnvoyFilter customizados. Eles podem usar Azure Container Apps?</summary>

**Não.** Azure Container Apps usa seu próprio ingress gerenciado baseado em Envoy e arquitetura de sidecar Dapr. Você não pode instalar Istio, aplicar EnvoyFilters customizados ou usar CRDs Kubernetes. Container Apps abstrai a camada Kubernetes subjacente, o que significa que você não pode acessar o plano de controle ou implantar operators customizados. Para cargas de trabalho que requerem um service mesh específico, CRDs customizados ou acesso direto a API Kubernetes, AKS é necessário. O trade-off e maior overhead operacional em troca de flexibilidade total do Kubernetes.

</details>

<details>
<summary>2. Um cluster AKS precisa de 500 pods mas a subnet da VNet e apenas /24 (256 endereços). Qual modelo de rede resolve isso?</summary>

**Azure CNI Overlay.** Com Azure CNI padrão, cada pod consome um endereço IP da VNet, tornando uma subnet /24 insuficiente para 500 pods. Azure CNI Overlay atribui IPs aos pods de uma rede overlay (não da VNet), entao apenas IPs de nos consomem endereços VNet. Uma subnet /24 pode suportar até 251 nos (menos endereços reservados), cada um rodando até 250 pods. Isso fornece escala massiva sem requerer uma subnet VNet maior. Kubenet é uma alternativa mas tem limite de 400 nos e carece de alguns recursos avancados.

</details>

<details>
<summary>3. Por que você escolheria Azure Container Apps ao inves de AKS para APIs HTTP stateless simples?</summary>

**Overhead operacional reduzido com funcionalidade equivalente para cargas de trabalho simples.** Container Apps fornece auto-scaling integrado (incluindo scale-to-zero), implantacoes baseadas em revisao, divisao de trafego, dominios customizados, terminacao TLS e integração Dapr sem requerer gerenciamento de cluster, patching de nos, upgrades de plano de controle ou configuração de rede. Para uma equipe que apenas quer implantar uma imagem de container é definir regras de scaling, Container Apps elimina o trabalho pesado indiferenciado de operações Kubernetes enquanto fornece as mesmas capacidades centrais da plataforma para cargas de trabalho HTTP.

</details>

<details>
<summary>4. Uma empresa tem 2 serviços de inferencia ML baseados em GPU. Devem implantar um cluster AKS dedicado com GPU node pools ou usar Container Apps com GPU workload profiles?</summary>

**Container Apps com GPU workload profiles, a menos que os serviços requeiram scheduling Kubernetes customizado ou device plugins.** Para apenas 2 serviços GPU que precisam de scale-to-zero e burst scaling, gerenciar um cluster AKS inteiro com GPU node pools introduz overhead significativo (gerenciamento de drivers, configuração de node pool, setup do KEDA). Container Apps GPU profiles fornecem uma experiência totalmente gerenciada com scale-to-zero nativo. Escolha AKS GPU node pools apenas se você precisar de device plugins NVIDIA customizados, scheduling multi-GPU, ou os serviços fizerem parte de um ecossistema AKS maior que já existe.

</details>

## Laboratório de validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um grupo de recursos para este laboratório:

```bash
az group create --name rg-az305-challenge36 --location eastus
```

2. Crie um ambiente Container Apps:

```bash
az containerapp env create --resource-group rg-az305-challenge36 \
  --name cae-challenge36 --location eastus
```

3. Implante um container HTTP simples com scale-to-zero habilitado:

```bash
az containerapp create --resource-group rg-az305-challenge36 \
  --name ca-hello --environment cae-challenge36 \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --target-port 80 --ingress external \
  --min-replicas 0 --max-replicas 3
```

4. Verifique que o app esta respondendo e confira a contagem de replicas:

```bash
az containerapp show --resource-group rg-az305-challenge36 --name ca-hello \
  --query "{FQDN:properties.configuration.ingress.fqdn, Replicas:properties.runningStatus}" --output table
```

:::tip
Esta mini-implantacao válida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge36 --yes --no-wait
```

---

**Próximo**: [Challenge 37: Design a Serverless Solution](/docs/az-305/infrastructure/challenge-37)
