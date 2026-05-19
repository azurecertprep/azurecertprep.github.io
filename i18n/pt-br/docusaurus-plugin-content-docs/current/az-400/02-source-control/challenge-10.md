---
sidebar_position: 4
title: 'Desafio 10: Gerenciamento de arquivos grandes'
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 10: Gerenciamento de arquivos grandes

:::info Platform: comparison
:::

## Habilidades do exame

- Projetar e implementar uma estratégia para gerenciamento de arquivos grandes, incluindo Git Large File Storage (LFS) e git-fat

## Cenário

O estúdio de jogos da Contoso Ltd armazena todos os ativos binários (texturas, modelos 3D, arquivos de áudio, shaders compilados) diretamente em seu repositório Git. O repositório cresceu para 50GB, com arquivos `.psd` tendo em média 200MB e modelos 3D `.fbx` chegando a 500MB. Operações de clone levam mais de 4 horas na rede do escritório. Os desenvolvedores frequentemente enfrentam timeouts de push porque o Git tenta fazer diff e comprimir arquivos binários de forma ineficiente. Builds de CI falham quando os runners ficam sem espaço em disco. A equipe precisa de uma estratégia para lidar com arquivos binários grandes sem abandonar o Git como seu sistema de controle de versão.

## Tarefas

### Tarefa 1: Instalar e configurar o Git LFS

Instale o Git LFS e configure o repositório:

```bash
# Install Git LFS (varies by OS)
# macOS
brew install git-lfs

# Ubuntu/Debian
sudo apt-get install git-lfs

# Windows (via winget)
winget install GitHub.GitLFS

# Windows (via chocolatey)
choco install git-lfs

# Initialize Git LFS for the current user (one-time setup)
git lfs install
# Output: Updated git hooks. Git LFS initialized.

# Verify installation
git lfs version
# Output: git-lfs/3.4.0 (GitHub; windows amd64; go 1.21.3)

# Check current LFS configuration
git lfs env
```

### Tarefa 2: Rastrear tipos de arquivo com Git LFS

Configure quais arquivos devem ser gerenciados pelo LFS:

```bash
# Track all Photoshop files
git lfs track "*.psd"

# Track 3D model formats
git lfs track "*.fbx"
git lfs track "*.blend"
git lfs track "*.obj"
git lfs track "*.max"

# Track large image formats
git lfs track "*.png"
git lfs track "*.tga"
git lfs track "*.tiff"
git lfs track "*.exr"

# Track audio files
git lfs track "*.wav"
git lfs track "*.mp3"
git lfs track "*.ogg"

# Track video files
git lfs track "*.mp4"
git lfs track "*.mov"

# Track compiled/binary artifacts
git lfs track "*.dll"
git lfs track "*.so"
git lfs track "*.dylib"

# Track by directory (all files in assets/textures regardless of extension)
git lfs track "assets/textures/**"

# View current tracking rules
git lfs track
# Output:
# Listing tracked patterns
#     *.psd (.gitattributes)
#     *.fbx (.gitattributes)
#     ...

# The tracking rules are stored in .gitattributes
cat .gitattributes
# Output:
# *.psd filter=lfs diff=lfs merge=lfs -text
# *.fbx filter=lfs diff=lfs merge=lfs -text
# ...

# IMPORTANT: Commit the .gitattributes file
git add .gitattributes
git commit -m "chore: configure Git LFS tracking for binary assets"
```

### Tarefa 3: Migrar arquivos grandes existentes para o LFS

Converta arquivos que já estão no histórico do repositório para o LFS:

```bash
# First, check what large files exist in history
git lfs migrate info --everything
# Output shows file types sorted by total size in history

# Check specific extensions
git lfs migrate info --include="*.psd,*.fbx,*.png" --everything

# Migrate existing files to LFS (rewrites history)
# WARNING: This rewrites git history - coordinate with entire team
git lfs migrate import --include="*.psd,*.fbx,*.png,*.wav" --everything

# For a less disruptive approach, migrate only the current branch
git lfs migrate import --include="*.psd,*.fbx" --include-ref=refs/heads/main

# Migrate files above a certain size (e.g., anything over 1MB)
git lfs migrate import --above=1mb --everything

# After migration, verify the files are now LFS pointers
git lfs ls-files
# Output:
# abc1234567 * assets/textures/hero_diffuse.psd
# def8901234 * models/character/protagonist.fbx

# Check a file to confirm it's an LFS pointer
cat assets/textures/hero_diffuse.psd
# Output (pointer file, not binary):
# version https://git-lfs.github.com/spec/v1
# oid sha256:4d7a214614...
# size 214958080

# Force push the rewritten history (requires team coordination)
git push origin main --force-with-lease

# Team members must re-clone or run:
git lfs pull
```

Limpe objetos antigos após a migração:

```bash
# Remove old large objects from local repository
git reflog expire --expire-unreachable=now --all
git gc --prune=now

# Verify repository size reduction
git count-objects -vH
# Before: size-pack: 50.2 GiB
# After:  size-pack: 1.8 GiB (only code + LFS pointers)
```

### Tarefa 4: Configurar .gitattributes para rastreamento LFS

Crie um arquivo `.gitattributes` abrangente para um estúdio de jogos:

```bash
# .gitattributes - Git LFS configuration for Contoso Game Studio

# 3D Models
*.fbx filter=lfs diff=lfs merge=lfs -text
*.blend filter=lfs diff=lfs merge=lfs -text
*.obj filter=lfs diff=lfs merge=lfs -text
*.max filter=lfs diff=lfs merge=lfs -text
*.ma filter=lfs diff=lfs merge=lfs -text
*.mb filter=lfs diff=lfs merge=lfs -text

# Textures
*.psd filter=lfs diff=lfs merge=lfs -text
*.tga filter=lfs diff=lfs merge=lfs -text
*.tiff filter=lfs diff=lfs merge=lfs -text
*.exr filter=lfs diff=lfs merge=lfs -text
*.hdr filter=lfs diff=lfs merge=lfs -text
*.png filter=lfs diff=lfs merge=lfs -text
*.bmp filter=lfs diff=lfs merge=lfs -text

# Audio
*.wav filter=lfs diff=lfs merge=lfs -text
*.mp3 filter=lfs diff=lfs merge=lfs -text
*.ogg filter=lfs diff=lfs merge=lfs -text
*.flac filter=lfs diff=lfs merge=lfs -text
*.bank filter=lfs diff=lfs merge=lfs -text

# Video
*.mp4 filter=lfs diff=lfs merge=lfs -text
*.mov filter=lfs diff=lfs merge=lfs -text
*.avi filter=lfs diff=lfs merge=lfs -text

# Compiled assets
*.asset filter=lfs diff=lfs merge=lfs -text
*.prefab filter=lfs diff=lfs merge=lfs -text
*.unity filter=lfs diff=lfs merge=lfs -text
*.unitypackage filter=lfs diff=lfs merge=lfs -text

# Fonts
*.ttf filter=lfs diff=lfs merge=lfs -text
*.otf filter=lfs diff=lfs merge=lfs -text

# Archives
*.zip filter=lfs diff=lfs merge=lfs -text
*.7z filter=lfs diff=lfs merge=lfs -text
*.rar filter=lfs diff=lfs merge=lfs -text

# Ensure text files are handled correctly
*.cs text diff=csharp
*.json text
*.yaml text
*.xml text
*.md text
*.txt text
```

### Tarefa 5: Cotas de armazenamento e largura de banda do LFS

Entenda e gerencie as cotas do LFS no GitHub e Azure DevOps:

```bash
# Check GitHub LFS usage for the organization
gh api orgs/contoso --jq '{
  plan: .plan.name,
  lfs_bandwidth_used: .plan.filled_seats,
  total_repos: .total_private_repos
}'

# Check repository-specific LFS storage
gh api repos/contoso/game-studio/git/lfs --jq '.repository.storage'

# GitHub LFS limits (as of current pricing):
# - Free: 1 GB storage, 1 GB bandwidth/month
# - Data packs: $5/month per 50 GB storage + 50 GB bandwidth

# Azure DevOps LFS limits:
# - Free tier: 1 GB per repository
# - Additional storage available with organization billing

# Monitor LFS bandwidth usage in CI
# Add to your CI pipeline:
git lfs env | grep -i "batch"
```

Configure o LFS para reduzir a largura de banda no CI:

```yaml
# .github/workflows/ci.yml - Optimized LFS checkout
name: CI with LFS optimization
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: false  # Don't fetch all LFS files

      - name: Fetch only needed LFS files
        run: |
          # Only pull LFS files that changed in this PR
          git lfs pull --include="src/**" --exclude="assets/cinematics/**"

      # Alternative: Skip LFS entirely for code-only CI
      - name: Build (no assets needed)
        run: dotnet build --configuration Release
        env:
          GIT_LFS_SKIP_SMUDGE: 1
```

### Tarefa 6: Alternativa - git-fat para armazenamento com backend S3

Configure o git-fat como alternativa para equipes que usam AWS S3:

```bash
# Install git-fat
pip install git-fat

# Initialize git-fat in the repository
git fat init

# Configure the S3 backend
cat > .gitfat << 'EOF'
[rsync]
remote = contoso-assets.s3.amazonaws.com:/game-assets
options = --progress
EOF

# Alternative S3 configuration
cat > .gitfat << 'EOF'
[s3]
bucket = contoso-game-assets
region = us-east-1
prefix = git-fat/
EOF

# Configure which files to manage with git-fat
echo "*.psd filter=fat -text" >> .gitattributes
echo "*.fbx filter=fat -text" >> .gitattributes

# Push large files to the remote store
git fat push

# Pull large files from the remote store
git fat pull

# Check status of fat files
git fat status
```

Comparação entre LFS e git-fat:

| Recurso              | Git LFS                          | git-fat                      |
|----------------------|----------------------------------|------------------------------|
| Armazenamento backend | Servidor LFS do GitHub/Azure DevOps | S3, rsync, qualquer armazenamento remoto |
| Integração com hospedagem | Suporte nativo no GitHub/ADO | Autogerenciado               |
| Bloqueio de arquivos | Sim (integrado)                  | Não                          |
| Gerenciamento de largura de banda | Cotas gerenciadas pelo provedor | Autogerenciado (custos S3)   |
| Complexidade de configuração | Baixa (provedor gerencia o servidor) | Média (configurar armazenamento) |
| Modelo de custo      | Pacotes de dados por GB          | Custos de armazenamento + transferência S3 |
| Integração com CI    | Nativa (actions/checkout lfs)    | Scripts personalizados necessários |
| Manutenção           | Gerenciada pelo provedor         | Autogerenciada               |

### Tarefa 7: Configurar bloqueio de arquivos LFS para arquivos binários

Previna conflitos de merge em arquivos binários implementando bloqueio de arquivos:

```bash
# Enable file locking for specific patterns
git lfs track --lockable "*.psd"
git lfs track --lockable "*.fbx"
git lfs track --lockable "*.blend"

# This updates .gitattributes with the lockable flag:
# *.psd filter=lfs diff=lfs merge=lfs -text lockable
# *.fbx filter=lfs diff=lfs merge=lfs -text lockable

# Lock a file before editing
git lfs lock assets/textures/hero_diffuse.psd
# Output: Locked assets/textures/hero_diffuse.psd

# View all locked files
git lfs locks
# Output:
# ID    Path                                    Owner        Locked At
# 1234  assets/textures/hero_diffuse.psd        sarah-artist 2024-01-15T10:30:00Z
# 1235  models/character/protagonist.fbx        mike-3d      2024-01-15T11:00:00Z

# Check who has a specific file locked
git lfs locks --path="assets/textures/hero_diffuse.psd"

# Unlock after completing edits
git lfs unlock assets/textures/hero_diffuse.psd

# Force unlock someone else's lock (requires admin/maintain permission)
git lfs unlock assets/textures/hero_diffuse.psd --force

# Unlock by ID
git lfs unlock --id=1234
```

Configure arquivos bloqueáveis para serem somente leitura por padrão:

```bash
# When lockable flag is set, files are checked out as read-only
ls -la assets/textures/hero_diffuse.psd
# -r--r--r-- (read-only until locked)

# After locking:
git lfs lock assets/textures/hero_diffuse.psd
ls -la assets/textures/hero_diffuse.psd
# -rw-r--r-- (now writable)
```

Configure um hook pre-push para alertar sobre alterações em arquivos binários desbloqueados:

```bash
#!/bin/bash
# .git/hooks/pre-push
# Warn if pushing changes to lockable files that aren't locked by you

LOCKABLE_FILES=$(git diff --name-only HEAD~1 | grep -E '\.(psd|fbx|blend)$')

if [ -n "$LOCKABLE_FILES" ]; then
  echo "Checking locks for modified binary files..."
  for file in $LOCKABLE_FILES; do
    LOCK_OWNER=$(git lfs locks --path="$file" --json | jq -r '.[0].owner.name // empty')
    CURRENT_USER=$(git config user.name)
    if [ -z "$LOCK_OWNER" ]; then
      echo "WARNING: $file was modified without a lock!"
      echo "Run: git lfs lock \"$file\" before pushing."
      exit 1
    elif [ "$LOCK_OWNER" != "$CURRENT_USER" ]; then
      echo "ERROR: $file is locked by $LOCK_OWNER, not you!"
      exit 1
    fi
  done
fi
```

## Exercícios de quebra e conserto

### Cenário 1: Arquivos LFS exibem texto de ponteiro em vez do conteúdo real

Após clonar o repositório, os arquivos binários contêm texto como `version https://git-lfs.github.com/spec/v1` em vez dos dados binários reais.

```bash
# Symptom: opening a .psd file shows text content
cat assets/textures/hero_diffuse.psd
# version https://git-lfs.github.com/spec/v1
# oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393
# size 214958080

# Diagnosis: LFS smudge filter didn't run during checkout
git lfs status
# Shows files that need to be downloaded
```


<details>
<summary>Mostrar solução</summary>

**Correção**: Baixe o conteúdo real do LFS:

```bash
# Pull all LFS files
git lfs pull

# Or pull only specific files/patterns
git lfs pull --include="assets/textures/*"

# If LFS wasn't installed before clone, install and fetch:
git lfs install
git lfs fetch --all
git lfs checkout

# Verify files are now real binary content
file assets/textures/hero_diffuse.psd
# Output: Adobe Photoshop Image, ...
```

</details>

### Cenário 2: Push falha com cota de largura de banda do LFS excedida

```bash
# Error message:
# batch response: This repository is over its data quota.
# Account responsible for LFS bandwidth has exceeded limit.
# error: failed to push some refs to 'origin'
```


<details>
<summary>Mostrar solução</summary>

**Correção**: Resolva o problema de largura de banda:

```bash
# Check current usage
gh api repos/contoso/game-studio --jq '.size'

# Option 1: Purchase additional data packs (GitHub)
# Done through GitHub Settings > Billing > Git LFS Data

# Option 2: Reduce LFS bandwidth usage by using fetch with include/exclude
git config lfs.fetchinclude "assets/textures/*, assets/models/*"
git config lfs.fetchexclude "assets/cinematics/*"

# Option 3: Use a custom LFS server with no bandwidth limits
git config lfs.url "https://lfs.contoso.internal/game-studio"

# Option 4: For CI, cache LFS objects between runs
# .github/workflows/ci.yml
# - uses: actions/cache@v4
#   with:
#     path: .git/lfs
#     key: lfs-${{ hashFiles('.lfs-assets-id') }}
#     restore-keys: lfs-
```

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: ": Um repositório usa Git LFS para rastrear arquivos '*.psd'. Um novo desenvolvedor clona o repositório com 'GIT_LFS_SKIP_SMUDGE=1'. O que os arquivos '.psd' conterão no diretório de trabalho?",
    options: [
      "Arquivos vazios com zero bytes",
      "Arquivos de ponteiro em texto contendo o ID do objeto LFS e o tamanho do arquivo",
      "Dados binários corrompidos",
      "Os arquivos não existirão no diretório de trabalho"
    ],
    correctIndex: 1,
    explanation: "Quando GIT_LFS_SKIP_SMUDGE=1 está definido, o filtro smudge do LFS é ignorado durante o checkout. Em vez de baixar o conteúdo binário real do servidor LFS, o Git grava o arquivo de ponteiro LFS no disco. Este ponteiro contém a versão da especificação LFS, um OID SHA-256 do conteúdo real e o tamanho do arquivo. O desenvolvedor pode posteriormente executar git lfs pull para baixar o conteúdo real."
  },
  {
    question: ": Após executar 'git lfs migrate import --include=\"*.fbx\" --everything', o que todos os outros membros da equipe devem fazer?",
    options: [
      "Executar apenas 'git lfs install'",
      "Executar 'git pull' para obter o histórico atualizado",
      "Clonar novamente o repositório porque o histórico foi reescrito",
      "Excluir seus arquivos '.fbx' locais e executar 'git checkout'"
    ],
    correctIndex: 2,
    explanation: "O comando git lfs migrate import --everything reescreve todo o histórico do repositório, alterando os hashes de commit para cada commit que tocou os tipos de arquivo migrados. Isso é semelhante a uma operação git filter-branch ou git filter-repo. Como todos os SHAs de commit mudam, clones existentes têm histórico incompatível. Os membros da equipe devem excluir seu clone local e clonar novamente, ou usar cuidadosamente git fetch e git reset --hard origin/main (perdendo qualquer trabalho local)."
  },
  {
    question: ": Qual é a principal vantagem do git-fat sobre o Git LFS?",
    options: [
      "Melhor desempenho para arquivos grandes",
      "Integração nativa com GitHub e Azure DevOps",
      "Flexibilidade para usar qualquer backend de armazenamento (S3, rsync, servidores personalizados) sem depender da implementação LFS de um provedor de hospedagem",
      "Bloqueio de arquivos integrado para edição simultânea"
    ],
    correctIndex: 2,
    explanation: "O git-fat permite que equipes armazenem arquivos grandes em qualquer backend de armazenamento que controlem (AWS S3, servidores rsync, etc.) em vez de depender da implementação LFS do provedor de hospedagem e suas cotas e custos associados. Isso é particularmente útil para organizações com infraestrutura de armazenamento existente ou que desejam evitar cobranças por GB de largura de banda do GitHub ou Azure DevOps LFS."
  },
  {
    question: ": Um artista de jogos bloqueia 'character.fbx' com 'git lfs lock' e sai de férias. Outro artista precisa editar o arquivo com urgência. Qual é a abordagem correta?",
    options: [
      "Excluir o arquivo e recriá-lo para contornar o bloqueio",
      "Usar 'git lfs unlock --path=\"character.fbx\" --force' (requer permissão de maintain ou admin)",
      "Desabilitar o bloqueio LFS nas configurações do repositório",
      "Editar o arquivo localmente sem fazer push até que o bloqueio seja liberado"
    ],
    correctIndex: 1,
    explanation: "A flag --force no git lfs unlock permite que alguém diferente do proprietário do bloqueio libere o bloqueio. Isso requer permissões elevadas (role maintain ou admin no repositório). Este é o procedimento de emergência correto. A equipe também deve estabelecer uma política para duração de bloqueio e delegação, e considerar o uso de expiração de bloqueio se suportado pelo seu servidor LFS."
  }
]} />

## Limpeza

```bash
# Untrack LFS file types (stop tracking new files, existing stay in LFS)
git lfs untrack "*.psd"
git lfs untrack "*.fbx"
git lfs untrack "*.blend"
git add .gitattributes
git commit -m "chore: remove LFS tracking rules"

# Remove all locks
git lfs locks --json | jq -r '.[].id' | xargs -I {} git lfs unlock --id={}

# Prune old LFS objects not referenced by current branches
git lfs prune
# Output: prune: 47 local objects, 12 retained, done.

# Remove LFS hooks (if uninstalling LFS entirely)
git lfs uninstall

# Clean LFS cache
rm -rf .git/lfs/objects

# Remove .gitfat configuration (if testing git-fat)
rm -f .gitfat

# Verify state
git lfs status
git lfs ls-files
```
