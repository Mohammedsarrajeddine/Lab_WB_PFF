# GitHub Actions — Guide Complet pour PFF Lab

> Ce guide explique comment fonctionne GitHub Actions dans ton projet, étape par étape,
> avec des exemples concrets tirés de tes fichiers `.github/workflows/ci.yml` et `cd.yml`.

---

## Table des matières

1. [C'est quoi GitHub Actions ?](#1-cest-quoi-github-actions)
2. [Anatomie d'un workflow](#2-anatomie-dun-workflow)
3. [Ton CI — ce qui se passe quand tu push](#3-ton-ci--ce-qui-se-passe-quand-tu-push)
4. [Ton CD — comment le déploiement fonctionne](#4-ton-cd--comment-le-déploiement-fonctionne)
5. [Les Secrets — comment gérer les infos sensibles](#5-les-secrets--comment-gérer-les-infos-sensibles)
6. [Les Environments — staging vs production](#6-les-environments--staging-vs-production)
7. [GHCR — publier tes images Docker](#7-ghcr--publier-tes-images-docker)
8. [Déclencher manuellement un workflow](#8-déclencher-manuellement-un-workflow)
9. [Lire les logs quand ça échoue](#9-lire-les-logs-quand-ça-échoue)
10. [Commandes utiles et astuces](#10-commandes-utiles-et-astuces)

---

## 1. C'est quoi GitHub Actions ?

GitHub Actions est un service CI/CD intégré à GitHub. Il exécute automatiquement des **workflows** (scripts) dans des **machines virtuelles Ubuntu** quand certains événements se produisent (push, pull request, tag, déclenchement manuel).

**Termes clés :**

| Terme | Signification |
|-------|--------------|
| **Workflow** | Un fichier YAML dans `.github/workflows/` qui définit quoi exécuter |
| **Job** | Un bloc de travail qui tourne sur une machine virtuelle. Plusieurs jobs peuvent tourner **en parallèle** |
| **Step** | Une action individuelle dans un job (exécuter une commande, utiliser une action) |
| **Action** | Un composant réutilisable (`actions/checkout@v4`, `docker/build-push-action@v6`) |
| **Runner** | La machine virtuelle qui exécute le job (`ubuntu-latest`) |
| **Secret** | Une variable chiffrée stockée dans les paramètres du repo GitHub |
| **Trigger** | L'événement qui lance le workflow (`push`, `pull_request`, `workflow_dispatch`) |

---

## 2. Anatomie d'un workflow

Chaque workflow vit dans `.github/workflows/*.yml`. Voici la structure de base :

```yaml
name: Mon Workflow          # Nom affiché dans l'onglet Actions

on:                          # QUAND exécuter
  push:
    branches: [main]
  pull_request:

permissions:                 # Permissions accordées au token GITHUB_TOKEN
  contents: read

jobs:                        # QUOI exécuter
  mon-job:
    runs-on: ubuntu-latest   # Sur quelle machine
    steps:
      - uses: actions/checkout@v4       # Étape 1 : cloner le repo
      - run: echo "Hello World"         # Étape 2 : exécuter une commande
```

### Les blocs importants

```
on:          → Quand ça se déclenche
permissions: → Ce que le workflow a le droit de faire
jobs:        → Les tâches à exécuter
  job-name:
    runs-on:   → Le type de machine
    needs:     → Attendre qu'un autre job finisse d'abord
    if:        → Condition pour exécuter ou non
    env:       → Variables d'environnement
    defaults:  → Paramètres par défaut (ex: working-directory)
    services:  → Conteneurs auxiliaires (ex: PostgreSQL)
    steps:     → Les étapes séquentielles
```

---

## 3. Ton CI — ce qui se passe quand tu push

**Fichier :** `.github/workflows/ci.yml`
**Se déclenche :** À chaque push sur `main` ou chaque pull request

### Flux visuel

```
push/PR sur main
    │
    ├──► [dependency-review]  (PR uniquement — vérifie les dépendances)
    │
    ├──► [backend]            (lint + tests + sécurité du Python)
    │
    ├──► [frontend]           (lint + audit du Node.js)
    │
    │    ← les deux doivent réussir ─┐
    │                                │
    ├──► [integration]               ◄── (tests d'intégration avec PostgreSQL)
    │
    │    ← doit réussir ─────────────┐
    │                                │
    └──► [docker]                    ◄── (valide compose + build les images)
```

### Détail de chaque job

#### Job `backend` — Qualité du code Python

```yaml
backend:
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: fastapi_app    # ← toutes les commandes s'exécutent ici
  steps:
    - uses: actions/checkout@v4         # Clone le repo
    - uses: actions/setup-python@v5     # Installe Python 3.12
      with:
        python-version: "3.12"
        cache: "pip"                    # ← Cache les paquets pip (accélère les runs)
    - run: pip install -e ".[dev]"      # Installe les dépendances
    - run: bash ../scripts/ci/backend-quality.sh   # Lint, format, tests unitaires
    - run: bandit -q -r app -x tests               # Scan de sécurité
    - run: pip-audit                                # Vérifie les vulnérabilités
```

**Concepts clés ici :**
- `working-directory` → évite de faire `cd fastapi_app` dans chaque commande
- `cache: "pip"` → ne retélécharge pas les paquets à chaque run
- `needs` n'est pas défini → ce job tourne **en parallèle** avec `frontend`

#### Job `integration` — Tests avec vraie base de données

```yaml
integration:
  needs: [backend, frontend]            # ← Attend que les 2 réussissent
  services:
    postgres:                           # ← Lance un conteneur PostgreSQL à côté
      image: pgvector/pgvector:0.8.2-pg18-trixie
      env:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
      ports:
        - 5432:5432
      options: >-
        --health-cmd="pg_isready -U postgres"
        --health-interval=10s
```

**Ce qui se passe :**
1. GitHub démarre une VM Ubuntu
2. Lance un conteneur PostgreSQL+pgvector en arrière-plan
3. Attend que PostgreSQL soit `healthy` (via `pg_isready`)
4. Exécute les tests d'intégration contre cette base

#### Job `docker` — Valide que tout se build

```yaml
docker:
  needs: [integration]                  # ← Après les tests
  steps:
    - run: docker compose -f docker-compose.prod.yml config   # Valide le YAML
    - run: docker build -t app-backend:ci ./fastapi_app       # Build backend
    - run: docker build -t app-frontend:ci ./frontend-pff-lab # Build frontend
```

Les images ne sont PAS poussées ici — c'est juste pour vérifier que le build fonctionne.

---

## 4. Ton CD — comment le déploiement fonctionne

**Fichier :** `.github/workflows/cd.yml`
**Se déclenche :**
- Push sur `main` → déploie en **staging**
- Push d'un tag `v*.*.*` → déploie en **production**
- **Manuel** via `workflow_dispatch` → choix de l'environnement et du tag

### Flux visuel

```
Trigger (push main / tag / manuel)
    │
    ▼
[prepare]  ← Détermine : environment, image_tag, should_build
    │
    ▼
[deploy]
    ├── 1. Derive image names (ghcr.io/owner/repo/backend:sha-xxx)
    ├── 2. Build & push images to GHCR (si should_build = true)
    ├── 3. Configure SSH (installe la clé privée)
    ├── 4. Upload deployment assets (compose, Caddyfile, scripts)
    └── 5. Deploy release (SSH → exécute deploy-compose.sh)
```

### Job `prepare` — Décision automatique

```yaml
prepare:
  outputs:                              # ← Expose des valeurs pour le job suivant
    deploy_environment: ${{ steps.vars.outputs.deploy_environment }}
    image_tag: ${{ steps.vars.outputs.image_tag }}
    should_build: ${{ steps.vars.outputs.should_build }}
```

La logique :

| Événement | Environment | Image tag | Build ? |
|-----------|-------------|-----------|---------|
| Push sur `main` | `staging` | `sha-abc123def456` | ✅ Oui |
| Tag `v1.2.3` | `production` | `v1.2.3` | ✅ Oui |
| Manuel (sans tag) | Choix utilisateur | `sha-abc123def456` | ✅ Oui |
| Manuel (avec tag) | Choix utilisateur | Tag fourni | ❌ Non (image existe déjà) |

### Comment les jobs communiquent

```yaml
# Job 1 : définit une sortie
prepare:
  outputs:
    image_tag: ${{ steps.vars.outputs.image_tag }}    # ← EXPOSE la valeur
  steps:
    - id: vars
      run: echo "image_tag=sha-abc123" >> "$GITHUB_OUTPUT"  # ← ÉCRIT la valeur

# Job 2 : lit la sortie
deploy:
  needs: prepare                                      # ← DÉPEND de prepare
  steps:
    - run: echo ${{ needs.prepare.outputs.image_tag }}  # ← LIT la valeur
```

### Étape : Build & push des images Docker

```yaml
- uses: docker/build-push-action@v6
  with:
    context: ./fastapi_app        # Dossier du Dockerfile
    push: true                    # Pousse l'image vers GHCR
    tags: ghcr.io/owner/repo/backend:sha-abc123
    cache-from: type=gha          # ← Utilise le cache GitHub Actions
    cache-to: type=gha,mode=max   # ← Sauvegarde le cache pour le prochain run
```

### Étape : Déploiement SSH

```yaml
# 1. Installer la clé SSH
- run: |
    install -m 700 -d ~/.ssh
    printf '%s\n' "${SSH_KEY}" > ~/.ssh/id_ed25519
    chmod 600 ~/.ssh/id_ed25519
    ssh-keyscan -p "${PORT}" "${SSH_HOST}" >> ~/.ssh/known_hosts

# 2. Uploader les fichiers
- run: |
    scp docker-compose.prod.yml user@server:~/app/
    scp deploy/Caddyfile user@server:~/app/deploy/
    scp scripts/deploy/*.sh user@server:~/app/scripts/deploy/

# 3. Exécuter le déploiement à distance
- run: |
    ssh user@server "cd ~/app && ./scripts/deploy/deploy-compose.sh"
```

### Concurrency — empêcher les déploiements simultanés

```yaml
concurrency:
  group: deploy-${{ needs.prepare.outputs.deploy_environment }}
  cancel-in-progress: false     # ← Attend que le précédent finisse (ne l'annule pas)
```

Cela garantit qu'un seul déploiement tourne à la fois par environnement.

---

## 5. Les Secrets — comment gérer les infos sensibles

### Où les configurer

1. Va sur ton repo GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Clique **New repository secret**
3. Donne un nom (ex: `DEPLOY_SSH_PRIVATE_KEY`) et colle la valeur

### Les secrets de ton projet

| Secret | À quoi il sert | Comment le créer |
|--------|----------------|------------------|
| `DEPLOY_SSH_PRIVATE_KEY` | Clé SSH pour se connecter au serveur | `ssh-keygen -t ed25519 -C "github-actions"` → copier le contenu de `id_ed25519` (pas `.pub`) |
| `DEPLOY_SSH_HOST` | IP ou hostname du serveur | Ex: `203.0.113.10` |
| `DEPLOY_SSH_PORT` | Port SSH | Ex: `22` |
| `DEPLOY_SSH_USER` | Utilisateur Linux | Ex: `deploy` |
| `DEPLOY_APP_DIR` | Chemin sur le serveur | Ex: `/home/deploy/app` |
| `GHCR_USERNAME` | Ton username GitHub | Ex: `sirag` |
| `GHCR_READ_TOKEN` | PAT pour pull les images | Créer dans GitHub → Settings → Developer settings → Personal access tokens → `read:packages` |
| `FRONTEND_PUBLIC_API_URL` | URL publique de l'API | Ex: `https://lab.example.com` |

### Comment utiliser un secret dans le workflow

```yaml
env:
  SSH_KEY: ${{ secrets.DEPLOY_SSH_PRIVATE_KEY }}    # ← Injecté comme variable d'env
```

⚠️ **Règles importantes :**
- Les secrets sont **masqués** dans les logs (remplacés par `***`)
- Ils ne sont **jamais** accessibles dans les pull requests de forks
- `GITHUB_TOKEN` est un secret **automatique** qui expire à la fin du workflow

---

## 6. Les Environments — staging vs production

### Créer un environment

1. Repo GitHub → **Settings** → **Environments**
2. Clique **New environment**
3. Crée `staging` et `production`

### Protections pour production

Dans l'environment `production`, tu peux activer :

- **Required reviewers** — Un humain doit approuver avant le déploiement
- **Wait timer** — Délai obligatoire (ex: 5 minutes) avant exécution
- **Deployment branches** — Seuls les tags `v*.*.*` peuvent déployer

### Comment le workflow l'utilise

```yaml
deploy:
  environment: ${{ needs.prepare.outputs.deploy_environment }}
  # ← GitHub applique automatiquement les protections de cet environment
```

Quand `deploy_environment = production` et qu'un reviewer est requis :
1. Le workflow se met **en pause**
2. Le reviewer reçoit une notification
3. Il approuve → le déploiement continue
4. Il refuse → le workflow échoue

### Secrets par environment

Tu peux avoir des secrets **différents** par environment :

```
staging/DEPLOY_SSH_HOST  = 10.0.0.1    (serveur staging)
production/DEPLOY_SSH_HOST = 10.0.0.2  (serveur production)
```

→ Le même workflow utilise `${{ secrets.DEPLOY_SSH_HOST }}` et obtient la bonne valeur selon l'environment.

---

## 7. GHCR — publier tes images Docker

**GHCR** = GitHub Container Registry (`ghcr.io`). C'est le registre Docker intégré à GitHub.

### Comment ça marche dans ton CD

```
1. Le workflow se connecte à GHCR avec GITHUB_TOKEN
2. Il build l'image Docker
3. Il la pousse sur ghcr.io/ton-username/ton-repo/backend:sha-xxx
4. Sur le serveur, deploy-compose.sh pull cette image
```

### Nommage des images

```
ghcr.io/{owner}/{repo}/backend:{tag}
ghcr.io/{owner}/{repo}/frontend:{tag}

Exemples :
ghcr.io/sirag/projet-gemini/backend:sha-abc123def456
ghcr.io/sirag/projet-gemini/frontend:v1.0.0
```

### Rendre les images pullables depuis le serveur

Le serveur a besoin d'un **Personal Access Token (PAT)** avec `read:packages` :

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token** → sélectionne `read:packages`
3. Copie le token → ajoute-le comme secret `GHCR_READ_TOKEN`

Sur le serveur, `deploy-compose.sh` fait :
```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
```

### Voir tes images

Va sur ton repo GitHub → onglet **Packages** (dans la barre latérale droite).

---

## 8. Déclencher manuellement un workflow

### Depuis l'interface GitHub

1. Repo → onglet **Actions**
2. Clique sur **CD** dans la barre latérale
3. Clique **Run workflow** (bouton bleu à droite)
4. Choisis :
   - **Branch** : `main`
   - **Target environment** : `staging` ou `production`
   - **Existing image tag** : vide (build nouveau) ou `sha-abc123` (redéployer)
5. Clique **Run workflow**

### Depuis la ligne de commande (GitHub CLI)

```bash
# Installer GitHub CLI : https://cli.github.com
gh auth login

# Déclencher un déploiement staging (build + deploy)
gh workflow run cd.yml -f environment=staging

# Redéployer un tag existant en production
gh workflow run cd.yml -f environment=production -f image_tag=sha-abc123def456
```

### Créer un tag et déclencher un déploiement production

```bash
# 1. Crée le tag localement
git tag v1.0.0

# 2. Pousse le tag vers GitHub
git push origin v1.0.0

# → Le CD se déclenche automatiquement avec environment=production
```

---

## 9. Lire les logs quand ça échoue

### Accéder aux logs

1. Repo → onglet **Actions**
2. Clique sur le workflow run qui a échoué (icône ❌ rouge)
3. Clique sur le **job** qui a échoué
4. Clique sur le **step** qui a échoué → les logs s'affichent

### Erreurs fréquentes et solutions

| Erreur | Cause | Solution |
|--------|-------|----------|
| `denied: installation not allowed` | GHCR pas accessible | Vérifier `permissions: packages: write` dans le workflow |
| `ssh: connect to host ... Connection refused` | SSH pas configuré | Vérifier `DEPLOY_SSH_HOST`, `DEPLOY_SSH_PORT`, firewall du serveur |
| `Permission denied (publickey)` | Mauvaise clé SSH | Vérifier que `DEPLOY_SSH_PRIVATE_KEY` correspond à `authorized_keys` sur le serveur |
| `Error: Process completed with exit code 1` | Une commande a échoué | Lire les lignes au-dessus dans le log pour trouver l'erreur exacte |
| `no space left on device` | Disque plein du runner | Ajouter un step de nettoyage Docker : `docker system prune -af` |
| `Error response from daemon: Head ... unauthorized` | Le serveur ne peut pas pull l'image | Vérifier `GHCR_READ_TOKEN` et `GHCR_USERNAME` |

### Re-exécuter un workflow échoué

1. Onglet Actions → clique sur le run échoué
2. En haut à droite : **Re-run all jobs** ou **Re-run failed jobs**

---

## 10. Commandes utiles et astuces

### Valider un workflow YAML localement (syntaxe)

```bash
# Installer actionlint : https://github.com/rhysd/actionlint
actionlint .github/workflows/ci.yml
actionlint .github/workflows/cd.yml
```

### Tester localement avec `act` (optionnel)

```bash
# Installer act : https://github.com/nektos/act
# Simule le CI localement
act push --job backend
```

### Structure de ton `.github/`

```
.github/
├── dependabot.yml           # Mises à jour auto des dépendances (hebdomadaire)
└── workflows/
    ├── ci.yml               # Tests + lint + build validation
    └── cd.yml               # Build images + deploy sur serveur
```

### Variables GitHub automatiques utiles

| Variable | Valeur | Exemple |
|----------|--------|---------|
| `GITHUB_SHA` | Hash du commit | `abc123def456789` |
| `GITHUB_REF` | Référence (branche/tag) | `refs/heads/main` ou `refs/tags/v1.0.0` |
| `GITHUB_REF_NAME` | Nom court | `main` ou `v1.0.0` |
| `GITHUB_REPOSITORY` | Owner/repo | `sirag/projet-gemini` |
| `GITHUB_EVENT_NAME` | Type d'événement | `push`, `pull_request`, `workflow_dispatch` |
| `GITHUB_TOKEN` | Token automatique | Permissions définies dans `permissions:` |
| `GITHUB_ACTOR` | Qui a déclenché | `sirag` |

### Le `if:` conditionnel

```yaml
# Exécuter un step seulement si une condition est vraie
- if: github.event_name == 'pull_request'
  run: echo "C'est une PR"

- if: needs.prepare.outputs.should_build == 'true'
  run: docker build ...

# Exécuter même si un step précédent a échoué
- if: always()
  run: echo "Je tourne toujours"
```

---

## Résumé : le cycle complet de ton projet

```
Développeur push sur main
         │
         ▼
    ┌─── CI ───┐
    │           │
    │  backend  │──► lint, tests unitaires, sécurité
    │  frontend │──► lint, audit
    │           │
    │  integration ──► tests avec PostgreSQL réel
    │  docker      ──► valide que les images se build
    │           │
    └───────────┘
         │ ✅ tout passe
         ▼
    ┌─── CD ───┐
    │           │
    │  prepare  │──► staging, sha-abc123, should_build=true
    │           │
    │  deploy   │──► build images → push GHCR → SSH → deploy-compose.sh
    │           │
    └───────────┘
         │
         ▼
    Serveur: pull images → backup DB → docker compose up → healthcheck
```

Pour **production** : crée un tag `v1.0.0` → push → le CD fait la même chose avec `environment=production`.
