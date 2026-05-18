---
sidebar_position: 4
title: "Challenge 10 | Azure App Service"
---

# Desafio 10: Azure App Service

:::info Informação

**Tempo estimado: 60–75 minutos** | **Custo estimado: ~$0.20** (tier S1, exclua rapidamente) | 📊 **Peso no exame: 20–25%**
:::

## Cenário

A equipe de marketing da Contoso precisa de uma aplicação web implantada para uma campanha futura. O site deve suportar implantações sem tempo de inatividade, auto-scaling durante picos de tráfego e backups regulares. Você vai implantá-lo no Azure App Service com boas práticas de produção | deployment slots, autoscale e controles de rede.

## Habilidades do Exame Cobertas

| Habilidade | Peso |
|------------|------|
| Provisionar um plano do App Service | Alto |
| Configurar escalabilidade para o App Service | Alto |
| Criar um web app no App Service | Alto |
| Configurar deployment slots | Alto |
| Configurar TLS/SSL e certificados | Médio |
| Mapear domínio DNS personalizado existente | Médio |
| Configurar backup para o App Service | Médio |
| Configurar definições de rede | Médio |

## Referência Sysadmin ↔ Azure

| Tradicional | Equivalente no Azure |
|-------------|---------------------|
| IIS / Apache / Nginx em uma VM | Azure App Service |
| Load balancer + múltiplos servidores IIS | Scale-out do App Service |
| Registro DNS CNAME | Mapeamento de domínio personalizado |
| web.config / .htaccess | Configuração do App Service (App Settings, Connection Strings) |
| Implantação blue-green | Deployment slots + swap |
| Snapshots de VM / scripts de backup via cron | App Service Backup |
| Regras de firewall no servidor web | App Service Access Restrictions |

## Tarefas

### Tarefa 1: Criar um Plano do App Service

```bash
# Criar um grupo de recursos
az group create --name rg-appservice-lab --location eastus

# Criar um plano do App Service (Standard S1: necessário para deployment slots)
az appservice plan create \
  --resource-group rg-appservice-lab \
  --name plan-contoso-web \
  --sku S1 \
  --is-linux

# Verificar o plano
az appservice plan show -g rg-appservice-lab -n plan-contoso-web \
  --query "{Name:name, SKU:sku.name, Tier:sku.tier, Workers:sku.capacity}" -o table
```

### Tarefa 2: Criar um Web App

```bash
# Criar um web app com runtime Node.js
az webapp create \
  --resource-group rg-appservice-lab \
  --plan plan-contoso-web \
  --name contoso-web-$RANDOM \
  --runtime "NODE:18-lts"

# Armazenar o nome do app para uso posterior
APP_NAME=$(az webapp list -g rg-appservice-lab --query "[0].name" -o tsv)
echo "App Name: $APP_NAME"

# Verificar se está em execução
az webapp show -g rg-appservice-lab -n $APP_NAME \
  --query "{Name:name, State:state, URL:defaultHostName}" -o table
```

### Tarefa 3: Implantar Código de Exemplo

```bash
# Criar uma aplicação Node.js simples
mkdir webapp && cd webapp

cat > index.js << 'EOF'
const http = require('http');
const port = process.env.PORT || 8080;
const version = process.env.APP_VERSION || 'v1';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<h1>Contoso Marketing - ${version}</h1><p>Server time: ${new Date()}</p>`);
});

server.listen(port, () => console.log(`Running on port ${port}`));
EOF

cat > package.json << 'EOF'
{
  "name": "contoso-web",
  "version": "1.0.0",
  "scripts": { "start": "node index.js" },
  "engines": { "node": ">=18.0.0" }
}
EOF

# Implantar usando zip deploy
zip -r app.zip index.js package.json
az webapp deploy \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --src-path app.zip \
  --type zip

# Definir uma configuração de aplicação
az webapp config appsettings set \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --settings APP_VERSION=v1

# Testar a implantação
echo "Visite: https://$APP_NAME.azurewebsites.net"
```

### Tarefa 4: Criar um Deployment Slot de Staging

```bash
# Criar um slot de staging
az webapp deployment slot create \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --slot staging

# Verificar o slot
az webapp deployment slot list -g rg-appservice-lab -n $APP_NAME -o table

# O slot de staging tem sua própria URL
echo "URL de Staging: https://$APP_NAME-staging.azurewebsites.net"
```

### Tarefa 5: Implantar uma Nova Versão no Staging

```bash
# Atualizar a versão no staging
az webapp config appsettings set \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --slot staging \
  --settings APP_VERSION=v2

# Implantar código atualizado no staging
cd webapp
sed -i "s/Contoso Marketing/Contoso Marketing 2.0/" index.js
zip -r app-v2.zip index.js package.json

az webapp deploy \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --slot staging \
  --src-path app-v2.zip \
  --type zip

# Testar o slot de staging
echo "Staging: https://$APP_NAME-staging.azurewebsites.net"
echo "Produção: https://$APP_NAME.azurewebsites.net"
```

### Tarefa 6: Trocar Staging e Produção

```bash
# Visualizar o que vai mudar
az webapp deployment slot list -g rg-appservice-lab -n $APP_NAME -o table

# Trocar staging para produção (sem tempo de inatividade)
az webapp deployment slot swap \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --slot staging \
  --target-slot production

# Verificar: produção agora executa v2, staging tem v1
echo "Produção: https://$APP_NAME.azurewebsites.net"
echo "Staging: https://$APP_NAME-staging.azurewebsites.net"
```

### Tarefa 7: Configurar Autoscale

```bash
# Obter o ID do recurso do plano do App Service
PLAN_ID=$(az appservice plan show -g rg-appservice-lab -n plan-contoso-web --query id -o tsv)

# Criar configurações de autoscale
az monitor autoscale create \
  --resource-group rg-appservice-lab \
  --resource plan-contoso-web \
  --resource-type Microsoft.Web/serverfarms \
  --name autoscale-web \
  --min-count 1 \
  --max-count 5 \
  --count 1

# Escalar quando CPU > 70%
az monitor autoscale rule create \
  --resource-group rg-appservice-lab \
  --autoscale-name autoscale-web \
  --condition "CpuPercentage > 70 avg 5m" \
  --scale out 1

# Reduzir quando CPU < 30%
az monitor autoscale rule create \
  --resource-group rg-appservice-lab \
  --autoscale-name autoscale-web \
  --condition "CpuPercentage < 30 avg 10m" \
  --scale in 1

# Verificar configurações de autoscale
az monitor autoscale show -g rg-appservice-lab -n autoscale-web \
  --query "profiles[0].rules[].{Metric:metricTrigger.metricName, Op:metricTrigger.operator, Threshold:metricTrigger.threshold, Direction:scaleAction.direction}" -o table
```

### Tarefa 8: Configurar Backup

```bash
# Criar uma conta de armazenamento para backups
BACKUP_STORAGE="contosobackup$RANDOM"
az storage account create \
  --resource-group rg-appservice-lab \
  --name $BACKUP_STORAGE \
  --sku Standard_LRS

# Criar um contêiner para backups
az storage container create \
  --name webapp-backups \
  --account-name $BACKUP_STORAGE

# Gerar uma URL SAS para o contêiner
EXPIRY=$(date -u -d "1 year" '+%Y-%m-%dT%H:%MZ')
SAS_URL=$(az storage container generate-sas \
  --account-name $BACKUP_STORAGE \
  --name webapp-backups \
  --permissions rwdl \
  --expiry $EXPIRY \
  --output tsv)

CONTAINER_URL="https://$BACKUP_STORAGE.blob.core.windows.net/webapp-backups?$SAS_URL"

# Configurar backup
az webapp config backup create \
  --resource-group rg-appservice-lab \
  --webapp-name $APP_NAME \
  --container-url "$CONTAINER_URL" \
  --backup-name "contoso-backup" \
  --frequency 1d \
  --retain-one true
```

### Tarefa 9: Configurar Restrições de Acesso

```bash
# Adicionar uma restrição de acesso baseada em IP (permitir apenas seu IP)
MY_IP=$(curl -s ifconfig.me)

az webapp config access-restriction add \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --rule-name "AllowMyIP" \
  --priority 100 \
  --ip-address "$MY_IP/32" \
  --action Allow

# Adicionar uma regra de negar tudo com prioridade menor
az webapp config access-restriction add \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --rule-name "DenyAll" \
  --priority 200 \
  --ip-address "0.0.0.0/0" \
  --action Deny

# Mostrar regras efetivas
az webapp config access-restriction show \
  -g rg-appservice-lab -n $APP_NAME -o table
```

## ✅ Critérios de Sucesso

- [ ] Plano do App Service (Standard S1) criado
- [ ] Web app implantado e acessível via HTTPS
- [ ] Deployment slot de staging criado e recebe a v2
- [ ] Swap de slot executado | produção executa a v2
- [ ] Autoscale configurado com regras baseadas em CPU
- [ ] Agenda de backup configurada com conta de armazenamento
- [ ] Restrições de acesso configuradas no web app

## Cenários Quebre & Conserte

### Cenário A: Implantando no Slot Errado
```bash
# Você implantou a v2 em produção em vez de staging. Como reverter?
# Dica: A versão anterior agora está no slot de staging após um swap.
az webapp deployment slot swap \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --slot staging \
  --target-slot production
```

### Cenário B: Autoscale Min > Max
```bash
# Tente definir min-count maior que max-count
az monitor autoscale update \
  --resource-group rg-appservice-lab \
  --name autoscale-web \
  --min-count 10 --max-count 3
# Qual erro você recebe?
```

### Cenário C: Slots no Tier Gratuito
```bash
# Crie um plano de tier Gratuito e tente adicionar um slot
az appservice plan create -g rg-appservice-lab -n plan-free --sku F1 --is-linux
az webapp create -g rg-appservice-lab --plan plan-free --name free-app-$RANDOM --runtime "NODE:18-lts"
az webapp deployment slot create -g rg-appservice-lab --name free-app-$RANDOM --slot staging
# Qual erro você recebe? Quais tiers suportam deployment slots?
```

## 📝 Teste seus Conhecimentos

**1. Quais tiers do plano do App Service suportam deployment slots?**

<details>
<summary>Mostrar Resposta</summary>

| Tier | Slots | Domínios Personalizados | SSL | Autoscale |
|------|-------|------------------------|-----|-----------|
| Free (F1) | 0 | 0 | ❌ | ❌ |
| Shared (D1) | 0 | Personalizado | ❌ | ❌ |
| Basic (B1-B3) | 0 | Personalizado | ✅ | ❌ |
| Standard (S1-S3) | 5 | Personalizado | ✅ | ✅ |
| Premium (P1-P3) | 20 | Personalizado | ✅ | ✅ |

Deployment slots requerem tier **Standard** ou superior.
</details>

**2. O que acontece durante um swap de slot?**

<details>
<summary>Mostrar Resposta</summary>

1. O Azure aplica as **configurações do slot de destino** (connection strings, app settings marcadas como "slot setting") ao slot de origem.
2. O Azure **aquece** o slot de origem enviando uma requisição HTTP para seu caminho raiz.
3. Se o aquecimento for bem-sucedido, o Azure **troca as regras de roteamento** | o tráfego agora vai para o slot de origem aquecido.
4. O código anterior de produção agora está no slot de staging (rollback instantâneo se necessário).

O swap é atômico da perspectiva do usuário | sem tempo de inatividade.
</details>

**3. Quais configurações de deployment slot são trocadas e quais não são?**

<details>
<summary>Mostrar Resposta</summary>

**Configurações que SÃO trocadas** (seguem o código):
- App settings (a menos que marcadas como "slot setting"), connection strings, handler mappings, certificados públicos, conteúdo de WebJobs, aplicações virtuais

**Configurações que NÃO são trocadas** (ficam com o slot):
- Endpoints de publicação, nomes de domínio personalizados, certificados e bindings TLS/SSL, configurações de escala, configurações de diagnóstico, CORS, integração VNet, identidades gerenciadas, configurações terminando em `_EXTENSION_VERSION`
</details>

**4. Qual é a diferença entre scale-up e scale-out?**

<details>
<summary>Mostrar Resposta</summary>

- **Scale-up** (vertical): Altera o tier/tamanho do plano do App Service | VM maior, mais CPU/RAM. Requer uma breve reinicialização.
- **Scale-out** (horizontal): Adiciona mais instâncias do mesmo tamanho. O App Service faz balanceamento de carga entre as instâncias. Pode ser manual ou automático (regras de autoscale). Sem tempo de inatividade.
</details>

## 🧹 Limpeza

```bash
# Excluir todos os recursos
az group delete --name rg-appservice-lab --yes --no-wait

# Limpar arquivos locais
rm -rf webapp

echo "Os recursos estão sendo excluídos em segundo plano."
```
