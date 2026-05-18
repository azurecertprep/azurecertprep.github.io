---
sidebar_position: 3
title: "Challenge 36: Design a Container-Based Solution"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 36: Design a Container-Based Solution

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-20 | **Peso no Exame: 30-35%**

:::

## Introducao

CloudCart e uma empresa SaaS migrando 20 microservicos de um cluster Kubernetes on-premises para o Azure. A equipe de engenharia tem niveis variados de expertise em Kubernetes: a equipe de plataforma e proficiente com kubectl, Helm charts e service meshes, mas os desenvolvedores de aplicacao apenas querem implantar containers sem gerenciar infraestrutura. A empresa precisa selecionar o servico correto de hospedagem de containers para cada microservico baseado em seus requisitos operacionais.

Os 20 microservicos se dividem em tres categorias: (1) Oito servicos que requerem controle granular sobre rede, ingress controllers customizados (NGINX com anotacoes especificas), um service mesh (Istio) para mTLS entre servicos, e operators Kubernetes customizados para failover de banco de dados. (2) Dez servicos que sao APIs HTTP stateless simples precisando apenas de auto-scaling, gerenciamento de revisoes e integracao com Dapr para mensageria pub/sub. (3) Dois servicos de inferencia de ML que requerem GPUs NVIDIA para classificacao de imagens em tempo real, processam requisicoes em rajadas e precisam escalar para zero quando nenhuma requisicao de inferencia esta na fila.

O orcamento de migracao requer minimizar overhead operacional onde possivel. A equipe de plataforma pode gerenciar um cluster Kubernetes mas nao tem largura de banda para gerenciar multiplos clusters ou lidar com operacoes day-2 para cargas de trabalho simples.

## Habilidades do Exame Cobertas

- Recomendar uma solucao baseada em containers

## Tarefas de Design

### Parte 1: Selecao de Plataforma de Container

1. Avalie as tres principais opcoes de hospedagem de containers Azure para cada categoria de microservico:

| Criterio | AKS | Azure Container Apps | Azure Container Instances |
|----------|-----|---------------------|--------------------------|
| Plano de controle Kubernetes | Acesso completo | Abstraido (construido sobre AKS) | Nenhum |
| Rede customizada | Controle CNI completo | Limitado (baseado em envoy) | Injecao VNet |
| Suporte a service mesh | Qualquer (Istio, Linkerd) | Dapr integrado | Nenhum |
| Suporte a GPU | Sim (GPU node pools) | Sim (GPU workload profiles) | Sim (GPU SKUs) |
| Scale to zero | Sim (com KEDA) | Nativo | N/A (por execucao) |
| Overhead operacional minimo | Alto | Baixo | Mais baixo |

2. Atribua cada categoria de microservico a plataforma apropriada:
   - Categoria 1 (complexo, precisa de primitivas Kubernetes): Qual plataforma e por que?
   - Categoria 2 (APIs HTTP simples com Dapr): Qual plataforma e por que?
   - Categoria 3 (inferencia GPU, scale-to-zero): Qual plataforma e por que?

3. Documente por que rodar todos os 20 servicos no AKS seria operacionalmente desperdicador, e por que rodar os servicos da Categoria 1 no Container Apps seria tecnicamente insuficiente.

### Parte 2: Design do Cluster AKS

4. Projete o cluster AKS para os 8 microservicos complexos:
   - **Rede**: Compare Azure CNI vs Azure CNI Overlay vs kubenet:
     - kubenet: Simples, usa NAT, limitado a 400 nos, sem suporte Windows
     - Azure CNI: Cada pod recebe um IP da VNet, consome espaco de endereco da subnet
     - Azure CNI Overlay: Pods recebem IPs overlay, preserva espaco de endereco da VNet
   - Selecione o modelo de rede e justifique baseado nas restricoes de endereco IP

5. Projete a estrategia de node pool:
   - System node pool (componentes do plano de controle): Qual tamanho e contagem?
   - User node pool para cargas de trabalho de aplicacao: Limites de auto-scaling?
   - Cargas de trabalho GPU devem rodar no mesmo cluster (node pool separado) ou separadamente?

6. Planeje a configuracao de scaling do cluster:
   - Cluster autoscaler: Contagens min/max de nos por pool
   - KEDA (Kubernetes Event-Driven Autoscaling): Para quais cargas de trabalho?
   - Horizontal Pod Autoscaler: Limiares de CPU/memoria

### Parte 3: Design do Ambiente Container Apps

7. Projete o ambiente Azure Container Apps para as 10 APIs HTTP simples:
   - Tipo de ambiente: Somente Consumption vs Dedicated (workload profiles)?
   - Regras de scaling: Requisicoes HTTP concorrentes, tamanho de fila, metricas customizadas?
   - Gerenciamento de revisoes: Revisao unica vs multiplas revisoes ativas (divisao de trafego)?

8. Configure a integracao Dapr para os Container Apps:
   - Quais building blocks do Dapr sao necessarios (pub/sub, state, service invocation)?
   - Como funciona a invocacao service-to-service do Dapr dentro de um ambiente Container Apps?
   - Qual e o modelo de rede entre Container Apps no mesmo ambiente?

### Parte 4: Container Registry e Seguranca

9. Projete a estrategia de Azure Container Registry (ACR):
   - Qual tier do ACR (Basic, Standard, Premium) atende aos requisitos?
   - Como as imagens devem ser compartilhadas entre AKS e Container Apps?
   - Habilite varredura de vulnerabilidades com Microsoft Defender for Containers

10. Planeje a postura de seguranca de containers:
    - Assinatura de imagens e content trust
    - Varredura de seguranca em tempo de execucao
    - Network policies para comunicacao pod-to-pod no AKS
    - Managed identity para pull de imagens (vs. credenciais de admin)

11. Projete o pipeline de CI/CD para implantar tanto no AKS (Helm charts) quanto no Container Apps (implantacao por revisao) a partir de um unico container registry.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-36"
  items={[
    "Cada categoria de microservico mapeada para a plataforma de container correta com justificativa",
    "Modelo de rede AKS selecionado com analise de espaco de endereco IP",
    "Estrategia de node pool projetada com limites de auto-scaling e consideracao de GPU node pool",
    "Ambiente Container Apps configurado com regras de scaling apropriadas e integracao Dapr",
    "Tier ACR selecionado com varredura de seguranca e acesso por managed identity configurados",
    "Justificativa clara documentada de por que uma unica plataforma para todos os 20 servicos e subotima"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Arvore de Decisao de Selecao de Plataforma</summary>

Use este fluxo de decisao:
1. O servico precisa de recursos Kubernetes customizados (CRDs, operators, service mesh)? -> AKS
2. O servico precisa de computacao GPU com scale-to-zero? -> Container Apps com GPU workload profiles ou AKS com GPU node pools
3. E uma API HTTP simples ou processador orientado a eventos? -> Azure Container Apps
4. E uma tarefa batch de curta duracao ou sidecar? -> Azure Container Instances (ou AKS Jobs)

Container Apps e construido sobre AKS internamente mas abstrai o gerenciamento do cluster. Voce obtem ingress baseado em Envoy, scaling baseado em KEDA e integracao Dapr sem gerenciar o plano de controle.

</details>

<details>
<summary>Dica 2: Comparacao de Rede AKS</summary>

**kubenet**: Pods recebem IPs de um espaco de endereco separado (10.244.0.0/16 por padrao). Apenas IPs de nos consomem enderecos VNet. Limitado a 400 nos e 250 pods/no. Sem suporte a containers Windows. Simples mas com limitacoes.

**Azure CNI**: Cada pod recebe um IP da VNet. Uma subnet /24 (256 enderecos) suporta apenas ~8 nos com 30 pods cada. Voce precisa de uma subnet grande (ex.: /16) para 100+ pods. Beneficio: pods sao diretamente enderecaveis da VNet.

**Azure CNI Overlay**: Pods recebem IPs de rede overlay (nao IPs da VNet). Nos ainda consomem IPs da VNet. Melhor para clusters grandes que precisam de integracao VNet sem consumir espaco massivo de enderecos. Suporta ate 1,000 nos e 250 pods/no.

Para a maioria das novas implantacoes AKS, Azure CNI Overlay fornece o melhor equilibrio.

</details>

<details>
<summary>Dica 3: GPU Workload Profiles do Container Apps</summary>

Azure Container Apps suporta cargas de trabalho GPU atraves de workload profiles dedicados. Consideracoes chave:
- Use um ambiente Dedicated (nao somente Consumption) para acessar GPU profiles
- GPU profiles fornecem GPUs NVIDIA para cargas de trabalho de inferencia ML
- Scale-to-zero e suportado, significando que voce nao paga nada quando nenhuma requisicao de inferencia chega
- Isso elimina a necessidade de um cluster AKS separado apenas para 2 servicos GPU

Compare o custo operacional: gerenciar um GPU node pool no AKS (configuracao de node pool, atualizacoes de driver, scheduling) vs. Container Apps GPU profile (totalmente gerenciado, apenas implante seu container).

</details>

<details>
<summary>Dica 4: Selecao de Tier ACR</summary>

- **Basic**: 10 GiB de armazenamento, adequado para dev/test
- **Standard**: 100 GiB de armazenamento, maior throughput, adequado para maioria das cargas de producao
- **Premium**: 500 GiB de armazenamento, geo-replicacao, private link, content trust, redundancia de zona

Para este cenario, **Premium** e recomendado porque:
- Geo-replicacao garante pulls rapidos de clusters AKS em qualquer regiao
- Private link protege o endpoint do registry dentro da VNet
- Content trust habilita assinatura de imagens para seguranca da cadeia de suprimentos
- Integracao com Defender for Containers para varredura de vulnerabilidades esta disponivel em todos os tiers mas Premium fornece o isolamento de rede necessario para producao

</details>

## Recursos de Aprendizagem

- [Comparing Azure container options](https://learn.microsoft.com/en-us/azure/container-apps/compare-options)
- [AKS networking concepts](https://learn.microsoft.com/en-us/azure/aks/concepts-network)
- [Azure Container Apps overview](https://learn.microsoft.com/en-us/azure/container-apps/overview)
- [Azure Container Registry service tiers](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Dapr integration with Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/dapr-overview)

## Verificacao de Conhecimento

<details>
<summary>1. Uma equipe precisa rodar um service mesh Istio com recursos EnvoyFilter customizados. Eles podem usar Azure Container Apps?</summary>

**Nao.** Azure Container Apps usa seu proprio ingress gerenciado baseado em Envoy e arquitetura de sidecar Dapr. Voce nao pode instalar Istio, aplicar EnvoyFilters customizados ou usar CRDs Kubernetes. Container Apps abstrai a camada Kubernetes subjacente, o que significa que voce nao pode acessar o plano de controle ou implantar operators customizados. Para cargas de trabalho que requerem um service mesh especifico, CRDs customizados ou acesso direto a API Kubernetes, AKS e necessario. O trade-off e maior overhead operacional em troca de flexibilidade total do Kubernetes.

</details>

<details>
<summary>2. Um cluster AKS precisa de 500 pods mas a subnet da VNet e apenas /24 (256 enderecos). Qual modelo de rede resolve isso?</summary>

**Azure CNI Overlay.** Com Azure CNI padrao, cada pod consome um endereco IP da VNet, tornando uma subnet /24 insuficiente para 500 pods. Azure CNI Overlay atribui IPs aos pods de uma rede overlay (nao da VNet), entao apenas IPs de nos consomem enderecos VNet. Uma subnet /24 pode suportar ate 251 nos (menos enderecos reservados), cada um rodando ate 250 pods. Isso fornece escala massiva sem requerer uma subnet VNet maior. Kubenet e uma alternativa mas tem limite de 400 nos e carece de alguns recursos avancados.

</details>

<details>
<summary>3. Por que voce escolheria Azure Container Apps ao inves de AKS para APIs HTTP stateless simples?</summary>

**Overhead operacional reduzido com funcionalidade equivalente para cargas de trabalho simples.** Container Apps fornece auto-scaling integrado (incluindo scale-to-zero), implantacoes baseadas em revisao, divisao de trafego, dominios customizados, terminacao TLS e integracao Dapr sem requerer gerenciamento de cluster, patching de nos, upgrades de plano de controle ou configuracao de rede. Para uma equipe que apenas quer implantar uma imagem de container e definir regras de scaling, Container Apps elimina o trabalho pesado indiferenciado de operacoes Kubernetes enquanto fornece as mesmas capacidades centrais da plataforma para cargas de trabalho HTTP.

</details>

<details>
<summary>4. Uma empresa tem 2 servicos de inferencia ML baseados em GPU. Devem implantar um cluster AKS dedicado com GPU node pools ou usar Container Apps com GPU workload profiles?</summary>

**Container Apps com GPU workload profiles, a menos que os servicos requeiram scheduling Kubernetes customizado ou device plugins.** Para apenas 2 servicos GPU que precisam de scale-to-zero e burst scaling, gerenciar um cluster AKS inteiro com GPU node pools introduz overhead significativo (gerenciamento de drivers, configuracao de node pool, setup do KEDA). Container Apps GPU profiles fornecem uma experiencia totalmente gerenciada com scale-to-zero nativo. Escolha AKS GPU node pools apenas se voce precisar de device plugins NVIDIA customizados, scheduling multi-GPU, ou os servicos fizerem parte de um ecossistema AKS maior que ja existe.

</details>

## Laboratorio de Validacao

Implante uma prova de conceito minima para validar seu design:

1. Crie um grupo de recursos para este laboratorio:

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
Esta mini-implantacao valida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge36 --yes --no-wait
```

---

**Proximo**: [Challenge 37: Design a Serverless Solution](/docs/az-305/infrastructure/challenge-37)
