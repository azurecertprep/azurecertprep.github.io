---
sidebar_position: 5
title: 'Desafio 11: Operações avançadas do Git'
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 11: Operações avançadas do Git

:::info Platform: GitHub-first
:::

## Habilidades do exame

- Recuperar dados específicos usando comandos Git
- Remover dados específicos do controle de código-fonte

## Cenário

A equipe de plataforma da Contoso Ltd tem dois problemas urgentes. Primeiro, um desenvolvedor acidentalmente fez commit de chaves de acesso da AWS (`AKIA...`) no repositório há três semanas em um arquivo de configuração. As credenciais estão em 47 commits em múltiplas branches desde então. A equipe de segurança detectou a exposição por meio de varredura automatizada, mas as chaves ainda estão no histórico do Git. Segundo, um desenvolvedor sênior deletou uma branch (`feature/payment-gateway-v2`) que continha 3 semanas de trabalho em um projeto crítico. A branch nunca foi mergeada e nenhum PR existe. Ambos os problemas precisam ser resolvidos imediatamente, minimizando a interrupção para os 15 desenvolvedores trabalhando no repositório.

## Tarefas

### Tarefa 1: Recuperar uma branch deletada usando git reflog

A branch `feature/payment-gateway-v2` foi deletada, mas os commits ainda existem no reflog local (se você tinha a branch checked out) ou no remote (dentro do período de retenção).

```bash
# Check the reflog for references to the deleted branch
git reflog | grep "payment-gateway-v2"
# Output:
# abc1234 HEAD@{5}: checkout: moving from feature/payment-gateway-v2 to main
# def5678 HEAD@{12}: commit: feat: add Stripe webhook handler
# ghi9012 HEAD@{13}: commit: feat: implement payment retry logic

# Find the last commit on the deleted branch
git reflog show --all | grep "payment-gateway-v2"

# Alternative: search for the branch tip commit in all refs
git fsck --no-reflogs | grep "dangling commit"
# Output:
# dangling commit jkl3456789abcdef...

# Recreate the branch from the last known commit
git branch feature/payment-gateway-v2 abc1234

# Or from a dangling commit found via fsck
git branch feature/payment-gateway-v2 jkl3456

# Push the recovered branch to remote
git push origin feature/payment-gateway-v2

# Verify the recovery
git log --oneline feature/payment-gateway-v2 -10
```

Se a branch foi deletada remotamente, mas outro desenvolvedor a possuía:

```bash
# Check if any remote tracking branch exists
git branch -r | grep payment-gateway

# If deleted from remote, check GitHub's event log (branches are retained briefly)
gh api repos/contoso/platform-api/events | jq '.[] | select(.type == "DeleteEvent")'

# Ask GitHub support for branch restoration (within 90 days) or check:
gh api repos/contoso/platform-api/git/refs | jq '.[].ref' | grep payment
```

### Tarefa 2: Recuperar um commit específico de um HEAD desanexado

Um desenvolvedor estava em estado de detached HEAD, fez commits importantes e, em seguida, acidentalmente fez checkout de outra branch, perdendo a referência.

```bash
# The developer's situation:
# They were reviewing a tag, made fixes, committed, then lost them
git checkout v1.5.0        # Entered detached HEAD
# ... made changes and committed ...
git checkout main          # Lost the detached HEAD commits!

# Recovery: check the reflog for the detached HEAD commits
git reflog
# Output:
# mno7890 HEAD@{0}: checkout: moving from mno7890 to main
# mno7890 HEAD@{1}: commit: fix: critical auth bypass in v1.5.0
# pqr1234 HEAD@{2}: commit: fix: SQL injection in user search
# stu5678 HEAD@{3}: checkout: moving from main to v1.5.0

# Recover by creating a branch at that commit
git branch hotfix/recovered-auth-fix mno7890

# Or cherry-pick the commits onto current branch
git cherry-pick pqr1234 mno7890

# Verify the recovered commits
git log --oneline hotfix/recovered-auth-fix -5
```

### Tarefa 3: Cherry-pick de um commit de outra branch

Aplicar uma correção de bug específica de uma branch de release para main sem fazer merge da branch inteira:

```bash
# Identify the commit to cherry-pick
git log --oneline release/v2.1 -20
# Output:
# fed4321 fix: prevent race condition in payment processing
# cba8765 docs: update API changelog
# ...

# Cherry-pick the specific fix onto main
git checkout main
git cherry-pick fed4321

# If there's a conflict during cherry-pick
git cherry-pick fed4321
# CONFLICT (content): Merge conflict in src/payments/processor.js
# Resolve the conflict
git add src/payments/processor.js
git cherry-pick --continue

# Cherry-pick multiple commits (a range)
git cherry-pick abc1234..def5678

# Cherry-pick without committing (stage changes only)
git cherry-pick --no-commit fed4321

# Abort a cherry-pick in progress
git cherry-pick --abort

# Cherry-pick a merge commit (must specify parent)
git cherry-pick -m 1 <merge-commit-sha>
```

### Tarefa 4: Rebase interativo para squash e reordenação de commits

Limpar histórico de commits desorganizado antes de fazer merge de um PR:

```bash
# View the commits to clean up
git log --oneline -8
# Output:
# h8 fix: typo in variable name
# h7 wip: debugging payment flow
# h6 feat: add payment retry logic
# h5 fix: linting errors
# h4 feat: implement webhook handler
# h3 wip: trying different approach
# h2 feat: add Stripe SDK integration
# h1 chore: initial branch setup

# Start interactive rebase for the last 8 commits
git rebase -i HEAD~8

# The editor opens with:
# pick h1 chore: initial branch setup
# pick h2 feat: add Stripe SDK integration
# pick h3 wip: trying different approach
# pick h4 feat: implement webhook handler
# pick h5 fix: linting errors
# pick h6 feat: add payment retry logic
# pick h7 wip: debugging payment flow
# pick h8 fix: typo in variable name

# Reorder and squash to create clean history:
# pick h1 chore: initial branch setup
# pick h2 feat: add Stripe SDK integration
# squash h3 wip: trying different approach
# pick h4 feat: implement webhook handler
# squash h5 fix: linting errors
# pick h6 feat: add payment retry logic
# squash h7 wip: debugging payment flow
# squash h8 fix: typo in variable name

# After saving, edit each combined commit message
# Result: 4 clean commits instead of 8 messy ones

# Force push the cleaned branch (only for feature branches, never main)
git push origin feature/payment-gateway --force-with-lease

# Alternative: Use fixup instead of squash (discards the fixup commit message)
# fixup h3 wip: trying different approach
# fixup h5 fix: linting errors

# Auto-squash: mark commits for automatic fixup
git commit --fixup=h2   # Creates "fixup! feat: add Stripe SDK integration"
git rebase -i --autosquash HEAD~5  # Automatically reorders fixup commits
```

### Tarefa 5: Remover dados sensíveis com git filter-repo

Remover as credenciais da AWS que foram commitadas há 3 semanas. Use `git filter-repo` (a substituição moderna do obsoleto `git filter-branch`):

```bash
# Install git-filter-repo
pip install git-filter-repo

# First, identify where the sensitive data exists
git log --all --full-history -p -- config/aws-credentials.json
git log --all -S "AKIAIOSFODNN7EXAMPLE" --oneline
# Output shows 47 commits containing the secret

# Option 1: Remove an entire file from all history
git filter-repo --invert-paths --path config/aws-credentials.json

# Option 2: Replace specific text in all files across all history
# Create a replacements file
cat > expressions.txt << 'EOF'
regex:AKIA[A-Z0-9]{16}==>REMOVED_AWS_KEY
regex:(?i)aws_secret_access_key\s*=\s*\S+==>aws_secret_access_key=REMOVED
EOF

git filter-repo --replace-text expressions.txt

# Option 3: Remove a specific string (literal replacement)
cat > replacements.txt << 'EOF'
AKIAIOSFODNN7EXAMPLE==>***REMOVED***
wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY==>***REMOVED***
EOF

git filter-repo --replace-text replacements.txt

# Verify the sensitive data is gone
git log --all -S "AKIAIOSFODNN7EXAMPLE" --oneline
# Output: (empty - no commits contain the string)

# Check the file no longer exists in any commit
git log --all --full-history -- config/aws-credentials.json
# Output: (empty)
```

### Tarefa 6: BFG Repo Cleaner para remoção de arquivos grandes

Use o BFG para remoção mais rápida de arquivos grandes e segredos (interface mais simples que filter-repo para casos comuns):

```bash
# Download BFG Repo Cleaner
curl -L -o bfg.jar https://repo1.maven.org/maven2/com/madgp/bfg/1.14.0/bfg-1.14.0.jar

# Clone a fresh mirror of the repo (BFG works on bare repos)
git clone --mirror https://github.com/contoso/platform-api.git platform-api-mirror.git
cd platform-api-mirror.git

# Remove files containing AWS keys
echo "AKIAIOSFODNN7EXAMPLE" > ../passwords.txt
echo "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" >> ../passwords.txt
java -jar ../bfg.jar --replace-text ../passwords.txt

# Remove all files over 100MB from history
java -jar ../bfg.jar --strip-blobs-bigger-than 100M

# Remove specific files by name
java -jar ../bfg.jar --delete-files "*.psd"
java -jar ../bfg.jar --delete-files "aws-credentials.json"

# Remove specific folders
java -jar ../bfg.jar --delete-folders ".terraform"

# After BFG, clean up the repository
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Verify the cleanup
git rev-list --objects --all | git cat-file --batch-check | sort -k3nr | head -20

cd ..
```

### Tarefa 7: Verificar remoção e force-push

Após reescrever o histórico, coordene com a equipe para o force push:

```bash
# Verify sensitive data is completely removed
git log --all -S "AKIAIOSFODNN7EXAMPLE" --oneline
# Should return empty

# Search blob objects directly
git rev-list --objects --all | while read hash path; do
  if git cat-file -p "$hash" 2>/dev/null | grep -q "AKIA"; then
    echo "FOUND in: $hash $path"
  fi
done

# Force push all branches and tags
git push origin --force --all
git push origin --force --tags

# Notify all team members (they must re-clone)
# Post in team channel:
cat << 'EOF'
IMPORTANT: Repository history has been rewritten to remove exposed credentials.
All team members must:
1. Save any uncommitted work (git stash or copy files)
2. Delete your local clone: rm -rf platform-api
3. Re-clone: git clone https://github.com/contoso/platform-api.git
4. Reapply any stashed work

DO NOT run `git pull` on your existing clone - it will create duplicate history.
EOF

# Request GitHub garbage collection (secrets may still be in loose objects)
# Contact GitHub Support or use the API for repository maintenance
gh api repos/contoso/platform-api/git/refs -X GET | jq '.[].ref'
```

### Tarefa 8: Invalidar credenciais expostas

A etapa final crítica - remover os dados do histórico não revoga credenciais comprometidas:

```bash
# Immediately rotate the exposed AWS credentials
aws iam create-access-key --user-name contoso-platform-svc
aws iam delete-access-key --user-name contoso-platform-svc \
  --access-key-id AKIAIOSFODNN7EXAMPLE

# Check CloudTrail for unauthorized usage during the exposure window
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAIOSFODNN7EXAMPLE \
  --start-time "2024-01-01T00:00:00Z" \
  --end-time "2024-01-22T00:00:00Z"

# Add the credential patterns to .gitignore to prevent future commits
echo "config/aws-credentials.json" >> .gitignore
echo "*.pem" >> .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "chore: add credential files to .gitignore"

# Set up pre-commit hook to prevent future secret commits
cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/bash
# Scan staged files for potential secrets
if git diff --cached --diff-filter=ACM | grep -qE '(AKIA[A-Z0-9]{16}|-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----|password\s*=\s*["\x27][^"\x27]+["\x27])'; then
  echo "ERROR: Potential secret detected in staged files!"
  echo "Please remove credentials before committing."
  exit 1
fi
HOOK
chmod +x .git/hooks/pre-commit

# Set up GitHub secret scanning alerts
# (Automatically enabled for public repos; enable for private repos)
gh api repos/contoso/platform-api --method PATCH \
  -f security_and_analysis='{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}'
```

## Exercícios de quebra e conserto

### Cenário 1: Conflito de rebase durante rebase interativo

Um desenvolvedor está fazendo um rebase interativo para fazer squash de commits, mas encontra um conflito que se repete em cada commit:

```bash
# The problem: conflict during rebase
git rebase -i HEAD~5
# CONFLICT (content): Merge conflict in src/api/routes.js
# error: could not apply abc1234... feat: add new endpoint

# The conflict appears again after resolving because multiple
# commits modified the same lines
```


<details>
<summary>Mostrar solução</summary>

**Correção**: Resolva cada conflito conforme ele aparece, ou aborte e use uma estratégia diferente:

```bash
# Option 1: Resolve and continue for each conflict
git add src/api/routes.js
git rebase --continue
# Repeat for each conflicting commit

# Option 2: Abort and try a different approach
git rebase --abort

# Use merge --squash instead (creates a single squashed commit without rebase)
git checkout main
git merge --squash feature/payment-gateway
git commit -m "feat: complete payment gateway implementation"

# Option 3: If the rebase is too complex, skip problematic commits
git rebase --skip  # Caution: this drops the conflicting commit's changes
```

</details>

### Cenário 2: git filter-repo recusa executar em um clone não-fresco

```bash
# Error when running filter-repo:
git filter-repo --invert-paths --path secrets.json
# ERROR: Refusing to destructively overwrite repo history since
# this does not look like a fresh clone.
# (expected freshly packed repo)
```


<details>
<summary>Mostrar solução</summary>

**Correção**: Use a flag `--force` ou trabalhe em um clone fresco:

```bash
# Option 1: Force filter-repo to run (use with caution)
git filter-repo --invert-paths --path secrets.json --force

# Option 2: Create a fresh clone and work from there (recommended)
cd ..
git clone --no-local platform-api platform-api-clean
cd platform-api-clean
git filter-repo --invert-paths --path secrets.json

# Then push the cleaned repo back
git remote add origin https://github.com/contoso/platform-api.git
git push origin --force --all
git push origin --force --tags
```

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: ": Um desenvolvedor fez commit de uma senha de banco de dados há 50 commits. A senha está no histórico do repositório em 3 branches. Qual ferramenta você deve usar para removê-la de TODO o histórico?",
    options: [
      "'git rm' seguido de um commit para deletar o arquivo",
      "'git filter-repo --replace-text' para substituir a senha em todo o histórico",
      "'git reset --hard HEAD~50' para voltar o histórico antes do commit",
      "'git revert' no commit que introduziu a senha"
    ],
    correctIndex: 1,
    explanation: "git filter-repo reescreve todo o histórico do repositório, substituindo o texto sensível em cada commit em todas as branches e tags. git rm apenas remove o arquivo do commit atual em diante (a senha permanece no histórico). git reset perderia 50 commits de trabalho e não afeta outras branches. git revert cria um novo commit que desfaz a alteração, mas a senha permanece visível no commit original."
  },
  {
    question: ": Após reescrever o histórico do repositório com 'git filter-repo', o que todos os outros membros da equipe devem fazer com seus clones locais?",
    options: [
      "Executar 'git pull --rebase' para atualizar o histórico",
      "Executar 'git fetch --all' seguido de 'git reset --hard origin/main'",
      "Deletar o clone local e re-clonar o repositório do zero",
      "Executar 'git filter-repo' localmente com os mesmos parâmetros"
    ],
    correctIndex: 2,
    explanation: "Quando o histórico é reescrito, cada SHA de commit muda a partir do ponto de reescrita em diante. Clones existentes possuem os SHAs antigos que são incompatíveis com o novo histórico. Executar git pull tentaria fazer merge de dois históricos completamente diferentes, criando commits duplicados. A abordagem mais segura é deletar o clone local inteiramente e começar do zero. Os desenvolvedores devem salvar qualquer trabalho não commitado antes de fazer isso."
  },
  {
    question: ": Uma branch 'feature/analytics' foi deletada tanto local quanto remotamente há 2 dias. O desenvolvedor que a criou não possui mais um clone local. Como os commits podem ser recuperados?",
    options: [
      "Os commits estão permanentemente perdidos e não podem ser recuperados",
      "Usar 'git reflog' em qualquer máquina que tinha a branch checked out (dentro da janela de expiração do reflog)",
      "Usar 'git fsck --lost-found' no servidor remoto diretamente",
      "Contatar o suporte do GitHub; commits de branches deletadas são retidos por tempo limitado"
    ],
    correctIndex: 3,
    explanation: "O GitHub retém commits pendentes (commits não referenciados por nenhuma branch ou tag) por aproximadamente 90 dias antes que a coleta de lixo os remova permanentemente. Se nenhum desenvolvedor tem a branch em seu reflog local, o suporte do GitHub pode ajudar a localizar e restaurar a referência da branch. No Azure DevOps, branches deletadas podem ser restauradas diretamente pela interface dentro de um período de retenção. O reflog (opção B) só funciona se alguém ainda tiver um clone local que possuía a branch."
  },
  {
    question: ": Qual é a diferença entre 'git cherry-pick' e 'git rebase' ao mover commits entre branches?",
    options: [
      "Cherry-pick copia commits individuais criando novos SHAs; rebase reproduz uma série de commits em uma nova base criando novos SHAs para todos eles",
      "Cherry-pick preserva os SHAs originais dos commits; rebase os altera",
      "Cherry-pick é apenas para merge commits; rebase é para commits regulares",
      "Cherry-pick move o commit; rebase o copia"
    ],
    correctIndex: 0,
    explanation: "Ambas as operações criam novos commits (novos SHAs) porque o commit pai muda. A diferença está no escopo e na intenção: git cherry-pick seleciona commits individuais específicos para copiar na branch atual (cirúrgico, um de cada vez). git rebase reproduz uma série inteira de commits de uma base para outra base (usado para mover ou linearizar uma branch inteira). Cherry-pick deixa o commit original no lugar; rebase tipicamente move o ponteiro da branch para longe dos originais."
  }
]} />

## Limpeza

```bash
# Remove recovered branches
git branch -D feature/payment-gateway-v2 2>/dev/null
git branch -D hotfix/recovered-auth-fix 2>/dev/null

# Remove BFG jar and related files
rm -f bfg.jar passwords.txt expressions.txt replacements.txt

# Remove mirror clone used for BFG
rm -rf platform-api-mirror.git
rm -rf platform-api-clean

# Reset any force-pushed test branches
git checkout main
git branch -D feature/payment-gateway 2>/dev/null

# Remove pre-commit hook (if this was for testing)
rm -f .git/hooks/pre-commit

# Clean up reflog entries older than now (reclaim space)
git reflog expire --expire=now --all
git gc --prune=now

# Verify clean state
git status
git branch -a
git stash list
```
