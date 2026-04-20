# PFF Lab — Guide Rapide : Docker + CI/CD

> Tout ce qu'il faut pour lancer le projet en local et configurer le CI/CD, étape par étape.

---

## Partie 1 : Lancer le projet en local avec Docker

### Prérequis

- **Docker Desktop** installé et lancé (icône visible dans la barre des tâches)
- Le fichier `.env` à la racine du projet (déjà présent)

### Étapes

```
┌─────────────────────────────────────────────────────┐
│  1. Ouvrir un terminal dans le dossier du projet    │
│  2. docker compose up --build -d                    │
│  3. Attendre ~2-3 minutes (premier build long)      │
│  4. Ouvrir http://localhost:3000 (frontend)         │
│  5. Se connecter : admin@lab.local / Admin123!      │
└─────────────────────────────────────────────────────┘
```

#### Commande de lancement

```bash
docker compose up --build -d
```

Cela démarre **3 services** :

| Service    | URL                       | Description                       |
|------------|---------------------------|-----------------------------------|
| **db**     | localhost:5432            | PostgreSQL + pgvector             |
| **backend**| http://localhost:8000     | API FastAPI (docs: /docs)         |
| **frontend**| http://localhost:3000    | Interface React (Vite dev server) |

#### Que se passe-t-il au démarrage ?

1. PostgreSQL démarre et attend d'être `healthy`
2. Le backend attend PostgreSQL, puis :
   - Exécute les migrations Alembic (crée les tables)
   - Charge le catalogue d'analyses (seed_catalog.py)
   - Charge les données de démo : patients, opérateurs, conversations (seed_real_world_data.py)
   - Démarre uvicorn sur le port 8000
3. Le frontend attend le backend, puis démarre le serveur Vite

#### Comptes de démo

| Rôle             | Email                  | Mot de passe |
|------------------|------------------------|--------------|
| Admin            | admin@lab.local        | Admin123!    |

> D'autres comptes opérateurs sont créés par le seed de démo.

### Commandes utiles

```bash
# Voir les logs en temps réel
docker compose logs -f

# Voir les logs d'un seul service
docker compose logs -f backend

# Arrêter tout
docker compose down

# Arrêter tout ET supprimer les données (reset complet)
docker compose down -v

# Reconstruire après un changement de code
docker compose up --build -d

# Voir l'état des services
docker compose ps
```

### Accéder à la base de données

```bash
# Ouvrir un shell PostgreSQL
docker compose exec db psql -U postgres -d fastapi_app
```

### Dépannage

| Problème | Solution |
|----------|----------|
| `failed to connect to docker API` | Lancer Docker Desktop et attendre qu'il soit prêt |
| Backend crash loop | `docker compose logs backend` pour voir l'erreur |
| Port 5432 déjà utilisé | Arrêter tout PostgreSQL local : `docker compose down` puis relancer |
| Port 3000 déjà utilisé | Fermer l'autre app sur le port 3000 |
| Build très lent (1ère fois) | Normal — télécharge Python, Node, dépendances. Les builds suivants sont cachés |
| `no space left on device` | Docker Desktop → Settings → Resources → augmenter l'espace disque |

---

## Partie 2 : CI/CD avec GitHub Actions

### Vue d'ensemble

```
Tu push ton code
       │
       ▼
 ┌──── CI ─────┐        Automatique à chaque push/PR
 │  ✅ Lint     │
 │  ✅ Tests    │
 │  ✅ Sécurité │
 │  ✅ Build    │
 └──────────────┘
       │ tout passe
       ▼
 ┌──── CD ─────┐        Automatique sur main / tags
 │  📦 Build images Docker           │
 │  📤 Push vers GitHub Registry     │
 │  🚀 Déploie sur le serveur (SSH)  │
 └──────────────┘
```

### Étape 1 : Push ton code sur GitHub

```bash
# Si pas encore fait
git init
git remote add origin https://github.com/TON-USERNAME/TON-REPO.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

> Le CI se déclenche **automatiquement** dès le premier push.

### Étape 2 : Vérifier que le CI passe

1. Va sur ton repo GitHub
2. Clique sur l'onglet **Actions**
3. Tu verras le workflow **CI** en cours d'exécution
4. Attends qu'il devienne vert ✅

### Ce que le CI vérifie automatiquement

| Vérification | Détail |
|--------------|--------|
| **Backend lint** | `ruff check` — style du code Python |
| **Backend tests** | `pytest` — tests unitaires |
| **Backend sécurité** | `bandit` + `pip-audit` — vulnérabilités |
| **Frontend lint** | ESLint — style du code TypeScript |
| **Frontend typecheck** | `tsc --noEmit` — erreurs de types |
| **Frontend tests** | `vitest` — tests unitaires |
| **Frontend build** | Vérifie que l'app compile |
| **Intégration** | Tests avec une vraie base PostgreSQL |
| **Docker build** | Vérifie que les images Docker se construisent |

### Étape 3 : Configurer le CD (déploiement)

> Le CD ne se configure que si tu as un **serveur** où déployer (VPS, VM, etc.).
> Si tu n'as pas encore de serveur, le CI seul suffit pour valider ton code.

#### 3a. Préparer le serveur

Sur ton serveur (Ubuntu recommandé) :

```bash
# Installer Docker
curl -fsSL https://get.docker.com | sh

# Créer un utilisateur deploy
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

# Créer le dossier de l'app
sudo mkdir -p /home/deploy/app
sudo chown deploy:deploy /home/deploy/app
```

#### 3b. Créer une clé SSH

Sur ta machine locale :

```bash
ssh-keygen -t ed25519 -C "github-actions" -f github-deploy-key
```

Cela crée 2 fichiers :
- `github-deploy-key` (clé privée → pour GitHub)
- `github-deploy-key.pub` (clé publique → pour le serveur)

Copie la clé publique sur le serveur :

```bash
ssh-copy-id -i github-deploy-key.pub deploy@TON-SERVEUR
```

#### 3c. Ajouter les secrets GitHub

1. Repo GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Crée ces secrets :

| Secret | Valeur | Exemple |
|--------|--------|---------|
| `DEPLOY_SSH_PRIVATE_KEY` | Contenu de `github-deploy-key` | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| `DEPLOY_SSH_HOST` | IP du serveur | `203.0.113.10` |
| `DEPLOY_SSH_PORT` | Port SSH | `22` |
| `DEPLOY_SSH_USER` | Utilisateur | `deploy` |
| `DEPLOY_APP_DIR` | Chemin sur le serveur | `/home/deploy/app` |
| `GHCR_USERNAME` | Ton username GitHub | `sirag` |
| `GHCR_READ_TOKEN` | Token avec `read:packages` | Créer dans GitHub → Settings → Developer settings → Personal access tokens |
| `FRONTEND_PUBLIC_API_URL` | URL publique de l'API | `https://ton-domaine.com` |

#### 3d. Créer les environments GitHub

1. Repo → **Settings** → **Environments**
2. Crée `staging` — pas de protection
3. Crée `production` — active "Required reviewers" (optionnel)

#### 3e. Créer le fichier .env sur le serveur

```bash
# Sur le serveur
ssh deploy@TON-SERVEUR
cd /home/deploy/app

# Copier le template et le remplir
nano .env.production
```

Remplis avec tes vraies valeurs (voir `.env.production.example` dans le repo).

### Comment déployer

| Action | Commande |
|--------|----------|
| **Déployer en staging** | Push sur `main` — automatique |
| **Déployer en production** | `git tag v1.0.0 && git push origin v1.0.0` |
| **Redéployer manuellement** | GitHub → Actions → CD → Run workflow |
| **Rollback** | Run workflow avec un ancien `image_tag` |

---

## Résumé : les seules commandes à retenir

```bash
# ─── LOCAL ──────────────────────────────────
docker compose up --build -d    # Lancer tout
docker compose logs -f          # Voir les logs
docker compose down             # Arrêter
docker compose down -v          # Reset total

# ─── DÉPLOYER ───────────────────────────────
git add . && git commit -m "..." && git push   # → CI + staging auto
git tag v1.0.0 && git push origin v1.0.0       # → production

# ─── URLS LOCALES ───────────────────────────
# Frontend : http://localhost:3000
# Backend  : http://localhost:8000
# API Docs : http://localhost:8000/docs
# Login    : admin@lab.local / Admin123!
```
