---
sidebar_position: 3
title: "Challenge 09 | Containers in Azure"
---

# Desafio 09: Contêineres no Azure

:::info Informação

**Tempo estimado: 45–60 minutos** | **Custo estimado: ~$0.30** | 📊 **Peso no exame: 20–25%**

:::
## Cenário

A equipe de desenvolvimento da Contoso containerizou sua aplicação de dashboard interno. O Dockerfile está pronto, mas a equipe tem executado contêineres no laptop de um desenvolvedor. Você precisa configurar a infraestrutura adequada de contêineres no Azure: um registro privado para armazenar imagens e uma plataforma de hospedagem para executá-las em escala.

## Habilidades do Exame Cobertas

| Habilidade | Peso |
|------------|------|
| Criar e gerenciar Azure Container Registry (ACR) | Alto |
| Provisionar Azure Container Instances (ACI) | Alto |
| Provisionar Azure Container Apps (ACA) | Alto |
| Gerenciar dimensionamento e escalabilidade de contêineres | Médio |
| Escolher entre ACI, Container Apps e AKS | Médio |

## Referência Sysadmin ↔ Azure

| Tradicional | Equivalente no Azure |
|-------------|---------------------|
| Registro privado Docker (Harbor, Nexus) | Azure Container Registry (ACR) |
| `docker run` em uma VM | Azure Container Instances (ACI) |
| Docker Compose + proxy reverso | Azure Container Apps (ACA) |
| `docker-compose scale web=5` | Regras de escalabilidade do ACA |
| Cluster Kubernetes (auto-gerenciado) | AKS (Kubernetes gerenciado) |

## Tarefas

### Tarefa 1: Criar um Azure Container Registry

```bash
# Criar um grupo de recursos
az group create --name rg-containers-lab --location eastus

# Criar um ACR (SKU Basic para fins de laboratório)
# O nome deve ser globalmente único, 5-50 caracteres alfanuméricos
az acr create \
  --resource-group rg-containers-lab \
  --name contosoreglab$RANDOM \
  --sku Basic \
  --admin-enabled true

# Armazenar o nome do registro para uso posterior
ACR_NAME=$(az acr list -g rg-containers-lab --query "[0].name" -o tsv)
echo "ACR Name: $ACR_NAME"

# Verificar o registro
az acr show --name $ACR_NAME --query "{Name:name, SKU:sku.name, LoginServer:loginServer}" -o table
```

### Tarefa 2: Compilar e Enviar uma Imagem para o ACR

Use `az acr build` para compilar diretamente na nuvem | sem necessidade de Docker local:

```bash
# Criar um diretório simples para a aplicação
mkdir container-app && cd container-app

# Criar um Dockerfile simples
cat > Dockerfile << 'EOF'
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
EOF

# Criar uma página de exemplo
cat > index.html << 'EOF'
<!DOCTYPE html>
<html><body>
<h1>Contoso Dashboard</h1>
<p>Running on Azure Containers</p>
</body></html>
EOF

# Compilar e enviar usando ACR Tasks (compila na nuvem)
az acr build \
  --registry $ACR_NAME \
  --image contoso-dashboard:v1 \
  .

# Verificar se a imagem está no registro
az acr repository list --name $ACR_NAME -o table
az acr repository show-tags --name $ACR_NAME --repository contoso-dashboard -o table
```

### Tarefa 3: Implantar no Azure Container Instances

```bash
# Obter as credenciais do ACR
ACR_LOGIN=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# Implantar no ACI
az container create \
  --resource-group rg-containers-lab \
  --name aci-dashboard \
  --image "$ACR_LOGIN/contoso-dashboard:v1" \
  --registry-login-server $ACR_LOGIN \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label contoso-aci-$RANDOM \
  --ports 80 \
  --cpu 0.5 \
  --memory 0.5

# Obter o FQDN e testar
az container show -g rg-containers-lab -n aci-dashboard \
  --query "{FQDN:ipAddress.fqdn, State:instanceView.state, IP:ipAddress.ip}" -o table

ACI_FQDN=$(az container show -g rg-containers-lab -n aci-dashboard --query ipAddress.fqdn -o tsv)
echo "Teste: http://$ACI_FQDN"

# Visualizar logs do contêiner
az container logs -g rg-containers-lab -n aci-dashboard
```

### Tarefa 4: Criar um Ambiente de Container Apps

```bash
# Instalar/atualizar a extensão de Container Apps
az extension add --name containerapp --upgrade

# Registrar os provedores necessários
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights

# Criar um ambiente de Container Apps
az containerapp env create \
  --resource-group rg-containers-lab \
  --name cae-contoso-lab \
  --location eastus
```

### Tarefa 5: Implantar no Container Apps

```bash
# Habilitar acesso de identidade gerenciada ao ACR (preferível a credenciais de admin)
az containerapp create \
  --resource-group rg-containers-lab \
  --name ca-dashboard \
  --environment cae-contoso-lab \
  --image "$ACR_LOGIN/contoso-dashboard:v1" \
  --registry-server $ACR_LOGIN \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --target-port 80 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 5

# Obter a URL
az containerapp show -g rg-containers-lab -n ca-dashboard \
  --query "properties.configuration.ingress.fqdn" -o tsv
```

### Tarefa 6: Configurar Escalabilidade do Container Apps

```bash
# Adicionar uma regra de escalabilidade HTTP (escalar quando requisições simultâneas > 10 por réplica)
az containerapp update \
  --resource-group rg-containers-lab \
  --name ca-dashboard \
  --min-replicas 1 \
  --max-replicas 10 \
  --scale-rule-name http-scaling \
  --scale-rule-type http \
  --scale-rule-http-concurrency 10

# Verificar a configuração de escalabilidade
az containerapp show -g rg-containers-lab -n ca-dashboard \
  --query "properties.template.scale" -o json

# Verificar a contagem atual de réplicas
az containerapp replica list -g rg-containers-lab -n ca-dashboard -o table
```

### Tarefa 7: Comparar ACI vs Container Apps

Execute ambas as implantações e compare:

```bash
# Comparar detalhes do ACI
echo "=== ACI ==="
az container show -g rg-containers-lab -n aci-dashboard \
  --query "{Name:name, CPU:containers[0].resources.requests.cpu, Memory:containers[0].resources.requests.memoryInGb, State:instanceView.state}" -o table

# Comparar detalhes do Container Apps
echo "=== Container Apps ==="
az containerapp show -g rg-containers-lab -n ca-dashboard \
  --query "{Name:name, Replicas:properties.template.scale, Ingress:properties.configuration.ingress.fqdn}" -o json
```

<details>
<summary>Dica | Quando usar ACI vs Container Apps vs AKS</summary>

| Recurso | ACI | Container Apps | AKS |
|---------|-----|---------------|-----|
| **Melhor para** | Tarefas simples e de curta duração | Microsserviços, APIs | Orquestração complexa |
| **Escalabilidade** | Apenas manual | Auto (HTTP, KEDA) | Auto (HPA, KEDA) |
| **Rede** | Básica | Ingress integrado | Rede completa do Kubernetes |
| **Modelo de custo** | Cobrança por segundo | Por segundo + camada gratuita | Cluster + VMs dos nós |
| **Inicialização** | Segundos | Segundos | Minutos (cluster) |
| **Complexidade** | Muito baixa | Baixa | Alta |
</details>

## Critérios de Sucesso

- [ ] ACR criado e contém a imagem `contoso-dashboard:v1`
- [ ] ACI em execução e acessível via HTTP
- [ ] Ambiente de Container Apps criado
- [ ] Container App implantado e acessível via HTTPS
- [ ] Regras de escalabilidade configuradas no Container Apps
- [ ] Consegue articular quando usar ACI vs Container Apps vs AKS

## Cenários Quebre & Conserte

### Cenário A: Nome de Imagem Incorreto
```bash
# Implante o ACI com um nome de imagem digitado errado
az container create \
  --resource-group rg-containers-lab \
  --name aci-broken \
  --image "$ACR_LOGIN/contoso-dashbord:v1" \
  --registry-login-server $ACR_LOGIN \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --ports 80
# Qual erro você recebe? Verifique: az container show -g rg-containers-lab -n aci-broken --query "instanceView"
```

### Cenário B: Problema de Permissão do ACR
```bash
# Tente implantar Container Apps sem fornecer credenciais do registro
az containerapp create \
  --resource-group rg-containers-lab \
  --name ca-broken \
  --environment cae-contoso-lab \
  --image "$ACR_LOGIN/contoso-dashboard:v1" \
  --target-port 80 \
  --ingress external
# Como você corrige a autenticação do ACR? (Dica: identidade gerenciada ou credenciais de admin)
```

### Cenário C: Porta Incorreta
```bash
# Implante com a porta de destino errada
az containerapp create \
  --resource-group rg-containers-lab \
  --name ca-wrong-port \
  --environment cae-contoso-lab \
  --image "$ACR_LOGIN/contoso-dashboard:v1" \
  --registry-server $ACR_LOGIN \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --target-port 8080 \
  --ingress external
# A aplicação roda mas retorna erros 502. Por quê?
```

## Teste seus Conhecimentos

**1. Quais são as diferenças entre os SKUs do ACR?**

<details>
<summary>Mostrar Resposta</summary>

| Recurso | Basic | Standard | Premium |
|---------|-------|----------|---------|
| Armazenamento | 10 GB | 100 GB | 500 GB |
| Webhooks | 2 | 10 | 500 |
| Replicação geográfica | ❌ | ❌ | ✅ |
| Private Link | ❌ | ❌ | ✅ |
| Confiança de conteúdo | ❌ | ❌ | ✅ |
| Chaves gerenciadas pelo cliente | ❌ | ❌ | ✅ |
</details>

**2. Quando você deve usar ACI vs Container Apps vs AKS?**

<details>
<summary>Mostrar Resposta</summary>

- **ACI**: Trabalhos batch simples, agentes de build, contêineres sidecar, testes rápidos. Sem necessidade de orquestração. Cobrança por segundo.
- **Container Apps**: Microsserviços, APIs, aplicações orientadas a eventos, aplicações web. Escalabilidade integrada com KEDA, integração com Dapr, ingress HTTPS fácil. Preço serverless.
- **AKS**: Kubernetes completo necessário | rede complexa, operators personalizados, cargas de trabalho stateful, pods multi-contêiner com armazenamento compartilhado. Você gerencia o cluster.
</details>

**3. Qual é a diferença entre conta de admin do ACR e identidade gerenciada para autenticação?**

<details>
<summary>Mostrar Resposta</summary>

- **Conta de admin**: Um usuário/senha compartilhado. Simples mas inseguro | qualquer pessoa com a senha tem acesso total de push/pull. Desabilitado por padrão. Use apenas para dev/test.
- **Identidade gerenciada**: Autenticação baseada no Azure AD. Sem senhas para gerenciar. Suporta acesso baseado em funções (AcrPull, AcrPush). Recomendado para produção. Funciona com ACI, Container Apps, AKS e App Service.
</details>

**4. O que o `az acr build` faz de diferente do `docker build`?**

<details>
<summary>Mostrar Resposta</summary>

`az acr build` executa o build **na nuvem** usando ACR Tasks. Ele faz upload do contexto de build para o Azure, compila a imagem em computação do Azure e envia o resultado diretamente para o registro. Você não precisa ter o Docker instalado localmente. Isso é ideal para pipelines de CI/CD e desenvolvedores sem Docker Desktop.
</details>

## Limpeza

```bash
# Excluir todos os recursos
az group delete --name rg-containers-lab --yes --no-wait

# Limpar arquivos locais
rm -rf container-app

echo "Os recursos estão sendo excluídos em segundo plano."
```
