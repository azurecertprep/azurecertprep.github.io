---
sidebar_position: 6
title: "Desafio 30: Projetar Alta Disponibilidade para Computação"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 30: Projetar Alta Disponibilidade para Computação

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $10-20 | **Peso no Exame: 15-20%**

:::

## Introdução

O Federal Benefits Portal (FedBenefits) é uma aplicação web operada pelo governo que permite a 10 milhões de cidadaos gerenciar seus beneficios de aposentadoria, inscricao em saúde e informações fiscais. O portal esta sujeito a requisitos rigorosos de uptime determinados pelo Government Accountability Office: 99,99% de disponibilidade (máximo de 52,6 minutos de inatividade por ano). Qualquer interrupcao superior a 5 minutos aciona um requisito de relatório ao congresso e potencial auditoria.

A arquitetura atual executa em 8 VMs atras de um Azure Load Balancer em um único availability set dentro de East US 2. No mes passado, um evento de manutenção não planejada da plataforma Azure derrubou todo o availability set por 12 minutos, violando o SLA. A equipe de infraestrutura foi encarregada de reprojetar a camada de computacao para sobreviver a uma falha completa de availability zone sem qualquer impacto visivel ao usuário.

Alguns componentes do FedBenefits sao aplicações legadas .NET Framework que não podem ser facilmente containerizadas, enquanto microsservicos mais novos executam em .NET 8 e poderiam aproveitar ofertas PaaS. A arquitetura deve acomodar tanto IaaS (VMs para legado) quanto PaaS (App Service para moderno) enquanto alcanca a meta de SLA composto de 99,99%. O orcamento permite upgrade para infraestrutura zone-redundant mas não para uma implantacao multi-região active-active completa.

## Habilidades do Exame Cobertas

- Recomendar uma solução de alta disponibilidade para computacao

## Tarefas de Design

### Parte 1: Availability Sets vs. Availability Zones

1. Análise por que a implantacao atual com availability set falhou em atingir a meta de 99,99%:
   - Qual SLA um availability set fornece? (99,95%)
   - Quais cenários podem causar que TODAS as VMs em um availability set sejam impactadas simultaneamente?
   - Qual é a diferenca entre fault domains e update domains?

2. Projete a migração de availability sets para availability zones:

| Aspecto | Availability Set | Availability Zones |
|--------|-----------------|-------------------|
| SLA | 99,95% | 99,99% |
| Isolamento de falha | Nível de rack (fault domain) | Nível de datacenter (zone) |
| Proteção de update domain | Sim (rollouts escalonados) | Sim (atualizações sequenciais por zona) |
| Sobrevive a falha de zona | Não | Sim |
| Impacto no custo | Nenhum | Potencial egress cross-zone |
| Requisitos de SKU de VM | Qualquer | Deve suportar AZ |

3. Determine quais regiões Azure suportam availability zones e confirme o suporte para East US 2. Documente quaisquer restrições de SKU de VM para implantacoes em zona.

### Parte 2: Load Balancing Zone-Redundant

4. Projete a arquitetura de load balancing para VMs zone-redundant:
   - Standard Load Balancer (frontend zone-redundant) distribuindo entre 3 zonas
   - Configuração de health probe (qual endpoint, qual intervalo, qual limite)
   - Backend pool com VMs distribuidas entre Zona 1, 2 e 3

5. Implante VMs zone-redundant com um Standard Load Balancer:

```bash
# Create zone-redundant load balancer
az network lb create \
  --resource-group rg-fedbenefits \
  --name lb-fedbenefits \
  --sku Standard \
  --frontend-ip-name frontend-ip \
  --backend-pool-name backend-pool \
  --location eastus2

# Create VMs across zones (minimum 2 per zone for zone-level redundancy)
for zone in 1 2 3; do
  for i in 1 2; do
    az vm create \
      --resource-group rg-fedbenefits \
      --name vm-web-z${zone}-${i} \
      --image Win2022Datacenter \
      --size Standard_D4s_v5 \
      --zone $zone \
      --nsg "" \
      --public-ip-address "" \
      --no-wait
  done
done
```

6. Configure health probes que detectam falhas em nível de aplicação (não apenas disponibilidade de porta TCP):
   - HTTP health probe para endpoint `/health`
   - Intervalo de probe: 5 segundos
   - Limite de não saudavel: 2 falhas consecutivas
   - Calcule: Com que rapidez uma VM falhada e removida da rotacao?

### Parte 3: Virtual Machine Scale Sets (VMSS)

7. Avalie se VMSS seria mais apropriado que VMs individuais para a camada web:

| Fator | VMs Individuais | VMSS Uniform | VMSS Flexible |
|--------|---------------|--------------|---------------|
| Auto-scaling | Manual | Sim | Sim |
| Distribuição em zonas | Manual | Automática | Automática |
| Rolling updates | Manual | Automático | Automático |
| Acesso individual a VM | Completo | Limitado | Completo |
| Integração com load balancer | Manual | Automática | Automática |
| Adequacao para FedBenefits | ? | ? | ? |

8. Projete uma configuração VMSS Flexible para a camada web legada .NET Framework:
   - Distribuição entre 3 availability zones
   - Mínimo de 6 instâncias (2 por zona)
   - Máximo de 18 instâncias (6 por zona) para períodos de pico (inscricao aberta)
   - Regras de autoscale baseadas em CPU e contagem de requisicoes

9. Configure o perfil de autoscale:
   - Scale-out: Adicione 2 instâncias quando CPU média > 70% por 5 minutos
   - Scale-in: Remova 1 instância quando CPU média < 30% por 10 minutos
   - Scaling baseado em cronograma: Pre-escale para 12 instâncias durante inscricao aberta (Janeiro)

### Parte 4: Alta Disponibilidade PaaS (App Service)

10. Projete a implantacao para os microsservicos .NET 8 usando Azure App Service:
    - Qual tier de App Service plan suporta availability zones? (Premium v3 ou acima)
    - Como o App Service zone-redundant funciona? (mínimo 3 instâncias, distribuidas entre zonas)
    - O que acontece se uma zona falhar? (instâncias restantes tratam o trafego)

11. Configure um App Service plan zone-redundant:

```bash
# Zone-redundant App Service requires Premium v3 and minimum 3 instances
az appservice plan create \
  --resource-group rg-fedbenefits \
  --name asp-fedbenefits \
  --location eastus2 \
  --sku P1V3 \
  --number-of-workers 3 \
  --zone-redundant true
```

12. Compare o SLA composto das duas abordagens:
    - Camada legada: VMs zone-redundant (99,99%) + Standard LB (99,99%) = ?
    - Camada moderna: App Service zone-redundant (99,99%) = ?
    - SLA combinado da aplicação (ambas camadas devem estar disponíveis): ?

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-30"
  items={[
    "Availability Zones selected over Availability Sets with documented justification",
    "Zone-redundant Standard Load Balancer configured with health probes",
    "VMSS Flexible or zone-spread VMs deployed across 3 availability zones",
    "Autoscaling configured with CPU-based and schedule-based rules",
    "Zone-redundant App Service plan deployed for PaaS workloads",
    "Composite SLA calculated and validated against 99.99% target"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Detalhes do SLA de Availability Zones</summary>

Garantias de SLA de Availability Zone para VMs:
- **Duas ou mais VMs em 2+ zonas**: SLA de 99,99% (52,6 min/ano de inatividade)
- **Duas ou mais VMs em um availability set**: SLA de 99,95% (4,38 horas/ano)
- **VM única com Premium SSD**: SLA de 99,9% (8,76 horas/ano)

O SLA de 99,99% significa que o Azure garante conectividade a pelo menos uma instância de VM entre zonas 99,99% do tempo. Requisito-chave: você precisa de pelo menos 2 VMs em pelo menos 2 zonas diferentes.

Para FedBenefits: Implante pelo menos 2 VMs por zona (6 no mínimo total) para manter o serviço mesmo se uma VM em qualquer zona falhar E uma zona inteira falhar simultaneamente.

</details>

<details>
<summary>Dica 2: Standard vs Basic Load Balancer</summary>

Apenas Standard Load Balancer suporta availability zones:
- **Standard LB**: Frontend zone-redundant, backend pools cross-zone, SLA de 99,99%
- **Basic LB**: Sem suporte a zona, sem SLA, sendo descontinuado

Standard LB com frontend zone-redundant:
- IP do frontend sobrevive a qualquer falha de zona única
- Backend pool pode conter VMs de qualquer/todas as zonas
- Health probes roteiam trafego apenas para instâncias saudaveis em zonas saudaveis
- Sem cobrancas de transferencia de dados cross-zone dentro da mesma região

```bash
# Verify zone-redundant frontend
az network lb frontend-ip show \
  --resource-group rg-fedbenefits \
  --lb-name lb-fedbenefits \
  --name frontend-ip \
  --query zones
```

</details>

<details>
<summary>Dica 3: VMSS Flexible vs Uniform</summary>

Para aplicações legadas .NET Framework do FedBenefits:
- **VMSS Uniform**: Todas as VMs sao identicas, gerenciamento individual de VM limitado, sem suporte para anexar VMs existentes. Melhor para cargas de trabalho stateless verdadeiramente identicas.
- **VMSS Flexible**: Suporta tamanhos mistos de VM, acesso individual a VM via SSH/RDP, pode anexar VMs existentes, suporta availability zones. Melhor para cargas de trabalho legadas migrando de VMs individuais.

VMSS Flexible é recomendado para FedBenefits porque:
1. Apps legados podem precisar de troubleshooting individual de VM (acesso RDP)
2. Tamanhos mistos de VM permitem otimização de custo (VMs menores para baseline, maiores para burst)
3. Suporta os mesmos padrões de implantacao que VMs individuais mas adiciona autoscaling
4. Distribuição em zonas e automática (equilibra entre zonas configuradas)

</details>

<details>
<summary>Dica 4: Requisitos de App Service Zone-Redundant</summary>

Requisitos de App Service zone-redundant:
- Tier mínimo do plano: Premium v3 (P1v3 ou superior) ou Isolated v2
- Contagem mínima de instâncias: 3 (uma por zona)
- Deve ser configurado no momento da criação do plano (não pode habilitar em plano existente)
- Regiões suportadas: A maioria das regiões com availability zones
- Distribuição em zonas e automática e não configuravel (Azure distribui uniformemente)

Impacto no custo: Você paga por mínimo 3 instâncias o tempo todo (sem escalar abaixo de 3). Com precos P1v3 (~$140/mes por instância), custo mínimo e ~$420/mes para zone redundancy.

Se uma zona falhar, as 2 instâncias restantes tratam todo o trafego. Garanta que sua aplicação pode suportar a carga com 2/3 da capacidade.

</details>

<details>
<summary>Dica 5: Melhores Práticas de Health Probe</summary>

Configuração de health probe para disponibilidade máxima:
- **Endpoint**: Endpoint `/health` customizado que verifica conectividade com banco de dados, disponibilidade de cache e espaço em disco (não apenas verificação de porta TCP)
- **Protocolo**: HTTP/HTTPS (Layer 7) ao inves de TCP (Layer 4) para health consciente da aplicação
- **Intervalo**: 5-15 segundos (menor = detecção mais rápida mas mais overhead)
- **Limite de não saudavel**: 2-3 falhas (menor = remocao mais rápida mas mais falsos positivos)

Tempo para remover VM não saudavel = intervalo x limite = 5s x 2 = 10 segundos

Exemplo de endpoint de health customizado:
```csharp
app.MapGet("/health", async (DbContext db, IConnectionMultiplexer redis) =>
{
    var dbHealthy = await db.Database.CanConnectAsync();
    var redisHealthy = redis.IsConnected;
    return dbHealthy && redisHealthy ? Results.Ok() : Results.StatusCode(503);
});
```

</details>

## Recursos de Aprendizagem

- [Availability zones overview](https://learn.microsoft.com/en-us/azure/reliability/availability-zones-overview)
- [Virtual Machine Scale Sets - Flexible orchestration](https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-orchestration-modes)
- [Standard Load Balancer and Availability Zones](https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-standard-availability-zones)
- [Azure App Service zone redundancy](https://learn.microsoft.com/en-us/azure/app-service/how-to-zone-redundancy)
- [SLA for Virtual Machines](https://www.microsoft.com/licensing/docs/view/Service-Level-Agreements-SLA-for-Online-Services)
- [Autoscale overview for VMSS](https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-autoscale-overview)

## Verificação de Conhecimento

<details>
<summary>1. Um portal governamental requer 99,99% de uptime. A implantacao atual usa um availability set com 4 VMs. Por que isso é insuficiente, e qual mudança é necessária?</summary>

**Availability sets fornecem apenas SLA de 99,95%, que permite até 4,38 horas de inatividade por ano - muito acima do orcamento de 52,6 minutos para 99,99%.** Availability sets protegem contra falhas em nível de rack (fault domains) e atualizações de plataforma (update domains) mas não podem sobreviver a uma falha completa de datacenter/zona. A correcao e migrar para availability zones, implantando VMs em pelo menos 2 zonas. Isso fornece SLA de 99,99% porque o Azure garante que as zonas sao datacenters fisicamente separados com energia, refrigeracao e rede independentes.

</details>

<details>
<summary>2. Um VMSS Flexible orchestration esta configurado em 3 availability zones com autoscale min=6. Durante uma falha de zona, quantas instâncias permanecem, e o serviço ainda esta disponível?</summary>

**4 instâncias permanecem (6 distribuidas uniformemente em 3 zonas = 2 por zona; perder 1 zona = 4 restantes).** O serviço permanece disponível porque as health probes do Standard Load Balancer detectam as instâncias da zona falhada como não saudaveis e roteiam todo o trafego para as 4 instâncias saudaveis nas 2 zonas restantes. O autoscale pode acionar para adicionar instâncias nas zonas saudaveis se a capacidade reduzida causar alta CPU. Para cargas de trabalho críticas, considere min=9 (3 por zona) para que uma falha de zona deixe 6 instâncias - capacidade suficiente sem intervencao do autoscale.

</details>

<details>
<summary>3. Um App Service plan e zone-redundant com 3 instâncias. Você pode escalar para 1 instância durante horarios de baixa demanda para economizar custo?</summary>

**Não. App Service plans zone-redundant requerem um mínimo de 3 instâncias o tempo todo.** Esta é uma restrição rigida porque o Azure precisa de pelo menos uma instância por zona para manter a zone-redundancy. Se você escalar abaixo de 3, a zone-redundancy e perdida. Para otimização de custo com zone redundancy, use o menor SKU que pode suportar sua carga de baixa demanda com 3 instâncias (por exemplo, P1v3 ao inves de P2v3). Alternativamente, se o trafego fora de pico for muito baixo, considere se você realmente precisa de zone redundancy 24/7 ou apenas durante horario comercial.

</details>

<details>
<summary>4. Qual é o SLA composto para uma aplicação que requer tanto uma camada de VM zone-redundant (99,99%) atras de um Standard Load Balancer (99,99%) QUANTO um App Service zone-redundant (99,99%)?</summary>

**Se ambas as camadas devem funcionar para a aplicação funcionar (dependência serial): 0,9999 x 0,9999 x 0,9999 = 99,97%.** Isso esta abaixo da meta de 99,99%. Para atingir 99,99%, você precisa eliminar uma dependência (usar App Service para tudo) ou adicionar redundância. Se as camadas sao independentes (qualquer uma pode servir usuários), a formula paralela se aplica: 1 - (0,0001 x 0,0001) = 99,9999%. Na prática, a maioria das aplicações tem dependências seriais, entao minimizar o número de serviços encadeados e crítico para alcancar 99,99%.

</details>

## Laboratório de Validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um resource group para este laboratório:

```bash
az group create --name rg-az305-challenge30 --location eastus
```

2. Implante um Virtual Machine Scale Set distribuido entre availability zones:

```bash
az vmss create \
  --resource-group rg-az305-challenge30 \
  --name vmss-ha-lab \
  --image Ubuntu2204 \
  --vm-sku Standard_B1s \
  --instance-count 3 \
  --zones 1 2 3 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --load-balancer lb-ha-lab
```

3. Verifique que as instâncias estao distribuidas entre zonas:

```bash
az vmss list-instances \
  --resource-group rg-az305-challenge30 \
  --name vmss-ha-lab \
  --query "[].{Instance:instanceId, Zone:zones[0]}" -o table
```

4. Confirme que o load balancer esta usando um frontend zone-redundant:

```bash
az network lb show \
  --resource-group rg-az305-challenge30 \
  --name lb-ha-lab \
  --query "frontendIPConfigurations[0].zones" -o table
```

5. Verifique que todas as três zonas estao em uso (válida zone-spreading para SLA de 99,99%):

```bash
az vmss list-instances \
  --resource-group rg-az305-challenge30 \
  --name vmss-ha-lab \
  --query "unique([].zones[0])" -o tsv
```

:::tip
Esta mini-implantacao válida suas decisoes de design com recursos reais do Azure. E opcional, mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge30 --yes --no-wait
```

---

**Próximo**: [Challenge 31: Design High Availability for Relational Data](/docs/az-305/business-continuity/challenge-31)
