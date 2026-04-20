# Script de Démonstration — PFF N°1

**Objectif:** soutenance PFF (10 à 15 minutes)  
**Audience:** jury pédagogique  
**Version:** Sprint 4

---

## 0) Préparation avant démo (checklist)

- Backend démarré (`python main.py`) sur `http://localhost:8000`
- Frontend démarré (`npm run dev`) sur `http://localhost:3000`
- PostgreSQL opérationnel (`docker compose up -d` dans `fastapi_app`)
- Données réalistes seedées (`python scripts/seed_real_world_data.py`)
- Mode simulation WhatsApp activé pour démo stable:
  - backend: `WHATSAPP_SIMULATION_MODE=true`
  - frontend: `VITE_SHOW_SIMULATION=true` (optionnel pour montrer panneau simulation)

Comptes opérateurs seed:

- `seed.manager@lab.local` / `SeedManager123!`
- `seed.operator@lab.local` / `SeedOperator123!`

---

## 1) Introduction orale (30–45s)

> « Le prototype répond à 3 besoins métier du laboratoire:
> 1) préparation des demandes via WhatsApp,
> 2) réponse automatique hors horaires grâce au chatbot RAG,
> 3) automatisation contrôlée de l'envoi des résultats avec validation humaine et audit. »

---

## 2) Scénario 1 — Ordonnance patient → préparation opérateur (Module 1)

### 2.1 Déclenchement

1. Ouvrir `/intake`.
2. Se connecter avec `seed.operator@lab.local`.
3. (Option A) Utiliser le panneau simulation pour envoyer un message type:
   - « Bonjour, voici mon ordonnance pour NFS et glycémie »
4. (Option B) Si données seed déjà présentes, sélectionner une conversation existante avec ordonnance.

### 2.2 Ce qu'on montre à l'écran

- Liste des conversations avec statuts
- **Fil des messages** en premier (UX Sprint 3)
- Panneau ordonnances détectées:
  - analyses extraites
  - données médecin/patient (si extraites)
  - estimation tarifaire détaillée

### 2.3 Action opérateur

1. Mettre à jour le workflow vers `in_review` puis `prepared`.
2. Enregistrer un message sortant patient (confirmation de prise en charge).

### 2.4 Message au jury

> « Le système automatise l'ingestion + extraction + pré-tarification, mais laisse la décision finale à l'assistante. »

---

## 3) Scénario 2 — Chatbot hors horaires (Module 2)

### 3.1 Déclenchement

1. Ouvrir `/chat`.
2. Poser une question simple, ex:
   - « Quels sont vos horaires d'ouverture ? »
   - « Puis-je envoyer mon ordonnance avant de venir ? »

### 3.2 Ce qu'on montre à l'écran

- Réponse naturelle en français
- Mention hors horaires si applicable (`Hors horaires`)
- Capacité multi-turn (historique contextuel)

### 3.3 Message au jury

> « Le chatbot utilise un pipeline RAG: récupération vectorielle PostgreSQL + génération Groq, avec garde-fous métier (pas de diagnostic médical). »

---

## 4) Scénario 3 — Résultat labo → validation humaine → envoi WhatsApp (Module 3)

### 4.1 Déclenchement

1. Retourner sur `/intake`.
2. Choisir une conversation en statut préparé.
3. Dans la section résultats:
   - uploader une URL PDF de résultat
   - cliquer **Approuver et Envoyer**

### 4.2 Ce qu'on montre à l'écran

- Statut résultat: `pending_validation` → `approved` → `sending` → `delivered`
- Preuve d'automatisation par worker (polling 20s)
- En mode simulation, envoi WhatsApp non destructif

### 4.3 Sécurité et robustesse à mentionner

- Vérification d'éligibilité avant envoi
- États intermédiaires (`sending`) pour éviter doublons
- Retry + dead-letter (`delivery_failed`) après 3 échecs
- Journal d'audit des transitions

### 4.4 Message au jury

> « L'automatisation reste supervisée: l'humain valide, l'agent exécute, et chaque action est traçable. »

---

## 5) Conclusion (30s)

> « Les trois modules sont implémentés et intégrés de bout en bout. Le prototype couvre les compétences IA, automatisation, data engineering, backend et documentation technique demandées par le PFF. »

---

## 6) Plan B (si un service externe tombe)

- **Groq indisponible**: montrer Module 1 + Module 3 en priorité
- **WhatsApp réel indisponible**: basculer `WHATSAPP_SIMULATION_MODE=true`
- **RAG API key invalide**: montrer architecture/documentation + flow intake/results

---

## 7) Chronométrage conseillé

- Intro: 0:45
- Scénario 1: 4:00
- Scénario 2: 2:30
- Scénario 3: 4:00
- Conclusion + Q/R: 2:00

Total: ~13 minutes
