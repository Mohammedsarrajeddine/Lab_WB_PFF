# Audit d'Alignement : PDF "Schéma de Tables" vs Implémentation

> Comparaison entre le document de spécification (13 tables) et l'implémentation réelle du projet.

---

## Légende

| Symbole | Signification |
|---------|---------------|
| ✅ | Implémenté et conforme |
| ⚠️ | Partiellement implémenté (différences architecturales ou colonnes manquantes) |
| ❌ | Non implémenté |

---

## 1. Table `users` → `operator_users`

| Aspect | PDF | Implémentation | Statut |
|--------|-----|----------------|--------|
| **Table** | `users` (id, email, full_name, password_hash, role, is_active, last_login_at, created_at, updated_at) | `operator_users` (même colonnes) | ✅ |
| **Rôles** | PDF mentionne des rôles génériques | `OperatorRole`: intake_operator, intake_manager, admin | ✅ |
| **Auth** | email + password | JWT auth via `/api/v1/auth/login` | ✅ |
| **Frontend** | Gestion des opérateurs | `/operators` page + CRUD | ✅ |

**Verdict : ✅ Conforme** — Renommé `users` → `operator_users` mais fonctionnellement identique.

---

## 2. Table `user_sessions`

| Aspect | PDF | Implémentation | Statut |
|--------|-----|----------------|--------|
| **Table** | `user_sessions` (id, user_id, token, ip_address, device_info, is_active, expires_at, created_at) | Non implémenté comme table | ❌ |
| **Mécanisme** | Sessions persistées en BD | JWT stateless (access + refresh tokens) | ⚠️ |

**Verdict : ⚠️ Architecture différente** — Pas de table `user_sessions`. Le projet utilise des JWT stateless. L'authentification fonctionne mais sans tracking de sessions actives, IP, ni appareil. C'est un choix architectural valide mais divergent du PDF.

**Colonnes manquantes :** ip_address, device_info, is_active (session), expires_at.

---

## 3. Table `patients`

| Aspect | PDF | Implémentation | Statut |
|--------|-----|----------------|--------|
| **Table** | `patients` (id, full_name, phone, date_of_birth, gender, address, city, assurance_id, channel_id, reference_number, created_at, updated_at) | `patients` (id, full_name, phone_e164, created_at, updated_at) | ⚠️ |
| **phone unique** | ✅ | ✅ (phone_e164 UNIQUE) | ✅ |
| **Frontend** | Gestion patients | `/patients` + `/patients/$patientId` | ✅ |

**Verdict : ⚠️ Colonnes manquantes** — Le cœur fonctionne mais il manque plusieurs colonnes :
- ❌ `date_of_birth`
- ❌ `gender`
- ❌ `address` / `city`
- ❌ `assurance_id` (FK vers assurances)
- ❌ `channel_id` (FK vers channels)
- ❌ `reference_number` (numéro lisible de référence)

---

## 4. Table `assurances`

| Aspect | PDF | Implémentation | Statut |
|--------|-----|----------------|--------|
| **Table** | `assurances` (id, name, code, is_active, created_at) | Non implémenté | ❌ |
| **Lien patient** | patient.assurance_id FK | N/A | ❌ |

**Verdict : ❌ Non implémenté** — Aucune table d'assurances n'existe. Le PDF requiert le suivi des mutuelles par patient. Il y a cependant un `PricingTier` enum (conventionnel/non_conventionnel) sur `AnalysisRequest` qui couvre partiellement le concept de convention, mais sans table dédiée de mutuelles.

---

## 5. Table `channels`

| Aspect | PDF | Implémentation | Statut |
|--------|-----|----------------|--------|
| **Table** | `channels` (id, name, is_active, created_at) | Non implémenté | ❌ |
| **Canaux** | WhatsApp, Téléphone, Sur Place, Email, Site Web | Seul WhatsApp est géré (implicite) | ❌ |

**Verdict : ❌ Non implémenté** — Le projet est centré WhatsApp uniquement. Pas de table `channels` ni de tracking du canal d'origine du patient.

---

## 6. Table `conversations`

| Aspect | PDF | Implémentation | Statut |
|--------|-----|----------------|--------|
| **Table** | `conversations` (id, patient_id, whatsapp_id, status, assigned_to, assigned_at, is_ai_managed, needs_human_attention, is_after_hours, started_at, closed_at, last_message_at, created_at, updated_at) | `conversations` (id, whatsapp_chat_id, patient_id, status, last_message_at, created_at, updated_at) | ⚠️ |
| **Status** | active, pending, closed | open, pending_review, prepared, closed | ⚠️ |
| **FK patient** | ✅ | ✅ | ✅ |
| **Frontend** | Intake page | `/intake` avec conversation list, messages, prescriptions | ✅ |

**Verdict : ⚠️ Colonnes manquantes importantes** :
- ❌ `assigned_to` (FK vers users — assignation d'assistante)
- ❌ `assigned_at`
- ❌ `is_ai_managed` (filtre IA)
- ❌ `needs_human_attention` (filtre urgence)
- ❌ `is_after_hours` (filtre hors horaire)
- ❌ `started_at` / `closed_at`

Les statuts sont différents mais couvrent le workflow d'intake.

---

## 7. Table `messages`

| Aspect | PDF | Implémentation | Statut |
|--------|-----|----------------|--------|
| **Table** | `messages` (id, conversation_id, sender, content, media_url, media_type, is_ordenance, is_read, is_result_message, created_at, updated_at) | `messages` (id, conversation_id, direction, message_type, whatsapp_message_id, content_text, media_url, mime_type, sent_at, created_at) | ⚠️ |
| **FK conversation** | ✅ | ✅ | ✅ |

**Verdict : ⚠️ Modélisation différente** :
- PDF utilise `sender` (patient/bot/assistante) → Implémentation utilise `direction` (incoming/outgoing) + `message_type` (text/image/document/audio/other)
- ❌ `is_ordenance` (flag ordonnance) — géré via table `prescriptions` séparée
- ❌ `is_read`
- ❌ `is_result_message` — géré via `LabResult` séparé

La fonctionnalité est couverte mais via une architecture relationnelle différente (tables séparées Prescription + LabResult au lieu de flags booléens).

---

## 8. Table `test_types` → `analysis_catalog`

| Aspect | PDF | Implémentation | Statut |
|--------|-----|----------------|--------|
| **Table** | `test_types` (id, name, code) | `analysis_catalog` (id, code, name, coefficient, synonyms) | ✅ |
| **Frontend** | Catalogue analyses | `/analyses` page avec recherche et pagination | ✅ |

**Verdict : ✅ Conforme et enrichi** — La table `analysis_catalog` inclut en plus `coefficient` (pour la lettre-clé B) et `synonyms` (JSONB) pour faciliter le mapping IA. Renommée mais fonctionnellement supérieure au PDF.

---

## 9. Table `analyses` → `analysis_requests`

| Aspect | PDF | Implémentation | Statut |
|--------|-----|----------------|--------|
| **Table** | `analyses` (id, patient_id, conversation_id, message_id, status, doctor_name, diagnosed, reference, priority, notes, validated_by, validated_at, created_at, updated_at) | `analysis_requests` (id, conversation_id, patient_id, status, pricing_tier, notes, created_at, updated_at) | ⚠️ |
| **Status** | prescrite, prelevee, en_cours, terminee | received, prescription_received, in_review, prepared | ⚠️ |

**Verdict : ⚠️ Colonnes manquantes** :
- ❌ `message_id` (lien direct au message)
- ❌ `doctor_name` (nom du médecin prescripteur)
- ❌ `diagnosed` (diagnostic)
- ❌ `reference` (numéro de référence lisible)
- ❌ `priority` (urgent/normal)
- ❌ `validated_by` / `validated_at`
- ✅ `pricing_tier` (ajout — gère conventionnel vs non-conventionnel)

---

## 10. Table `analysis_tests`

| Aspect | PDF | Implémentation | Statut |
|--------|-----|----------------|--------|
| **Table** | `analysis_tests` (id, analysis_id, test_type_id, origin, is_validated, is_corrected, corrected_by, tube_type, sample_type, notes, created_at) | Non implémenté comme table | ❌ |

**Verdict : ❌ Non implémenté** — La table de détail des tests individuels par analyse n'existe pas. L'extraction IA des ordonnances produit un `extracted_payload` JSONB sur `Prescription`, mais il n'y a pas de table structurée `analysis_tests` avec validation individuelle, correction IA, tube_type, etc.

C'est un **gap significatif** pour la traçabilité du détail des tests.

---

## 11. Table `resultats` → `lab_results`

| Aspect | PDF | Implémentation | Statut |
|--------|-----|----------------|--------|
| **Table** | `resultats` (id, analysis_id, file_url, file_type, file_hash, uploaded_by, sent_via_whatsapp, sent_at, message_id, status, notes, created_at, updated_at) | `lab_results` (id, analysis_request_id, file_url, status, retry_count, operator_notes, created_at, updated_at) | ⚠️ |
| **Status** | genere, envoye, erreur_envoi | pending_validation, approved, sending, delivered, delivery_failed, rejected | ✅ |
| **Livraison** | Envoi WhatsApp | Worker async avec retries + dead letter | ✅ |

**Verdict : ⚠️ Fonctionnel mais colonnes manquantes** :
- ❌ `file_type` / `file_hash` (intégrité fichier)
- ❌ `uploaded_by` (qui a uploadé)
- ❌ `sent_via_whatsapp` (bool)
- ❌ `sent_at`
- ❌ `message_id` (lien vers le message WhatsApp d'envoi)
- ✅ `retry_count` (ajout — gestion des retentatives, supérieur au PDF)
- ✅ Statuts plus granulaires qu'attendu (sending, delivery_failed, rejected — supérieur)

---

## 12. Table `activity_logs`

| Aspect | PDF | Implémentation | Statut |
|--------|-----|----------------|--------|
| **Table** | `activity_logs` (id, actor_type, actor_id, actor_name, action_type, action_category, table_name, record_id, record_label, old_value, new_value, description, ip_address, device_info, created_at) | `result_audit_logs` (id, lab_result_id, operator_id, action, details, created_at, updated_at) | ⚠️ |

**Verdict : ⚠️ Partiel** — Seul un audit des résultats existe (`result_audit_logs`). Il manque un système de logging global :
- ❌ Pas de log global cross-tables
- ❌ Pas de `actor_type` (user/bot/system)
- ❌ Pas de `old_value` / `new_value` JSONB
- ❌ Pas de `ip_address` / `device_info`
- ❌ Pas de `action_category` (analyse, patient, message, resultat, auth)

---

## 13. Table `internal_notes`

| Aspect | PDF | Implémentation | Statut |
|--------|-----|----------------|--------|
| **Table** | `internal_notes` (id, conversation_id, user_id, content, is_pinned, created_at, updated_at) | Non implémenté | ❌ |
| **Frontend** | Note clinique modal | Bouton "Note Clinique" existe dans `/patients/$patientId` mais `alert()` seulement (simulation) | ⚠️ |

**Verdict : ❌ Non implémenté en backend** — Le frontend a un bouton pour les notes cliniques mais il fait juste un `alert()`. Pas de table, pas d'endpoint API, pas de persistance.

---

## Tables extra (non dans le PDF)

| Table | Rôle | Dans le PDF ? |
|-------|------|---------------|
| `prescriptions` | Ordonnances reçues + extraction IA payload | ❌ (le PDF utilise `is_ordenance` sur messages) |
| `pricing_rules` | Règles de tarification (conventionnel/non-conv.) | ❌ |
| `knowledge_chunks` | Chunks RAG pour le chatbot (pgvector) | ❌ |
| `runtime_settings` | Key-value store pour config runtime | ❌ |

Ces tables sont des **ajouts positifs** qui enrichissent le système au-delà du PDF.

---

## Résumé Global

| # | Table PDF | Table Implémentée | Statut |
|---|-----------|-------------------|--------|
| 1 | `users` | `operator_users` | ✅ Conforme |
| 2 | `user_sessions` | — (JWT stateless) | ⚠️ Architecture différente |
| 3 | `patients` | `patients` (allégé) | ⚠️ Colonnes manquantes |
| 4 | `assurances` | — | ❌ Absent |
| 5 | `channels` | — | ❌ Absent |
| 6 | `conversations` | `conversations` (allégé) | ⚠️ Colonnes manquantes |
| 7 | `messages` | `messages` (restructuré) | ⚠️ Modélisation différente |
| 8 | `test_types` | `analysis_catalog` | ✅ Conforme + enrichi |
| 9 | `analyses` | `analysis_requests` | ⚠️ Colonnes manquantes |
| 10 | `analysis_tests` | — | ❌ Absent |
| 11 | `resultats` | `lab_results` | ⚠️ Partiel + enrichi |
| 12 | `activity_logs` | `result_audit_logs` (partiel) | ⚠️ Partiel |
| 13 | `internal_notes` | — (UI simulée) | ❌ Absent |

### Score
- **✅ Conforme :** 2/13
- **⚠️ Partiel :** 7/13
- **❌ Absent :** 4/13

### Gaps Critiques à Combler (priorité haute)
1. **`assurances`** — Table mutuelles + lien patient
2. **`channels`** — Canaux de contact + lien patient
3. **`analysis_tests`** — Détail des tests par analyse (crucial pour traçabilité IA)
4. **`internal_notes`** — Notes internes par conversation (backend + API)
5. **Colonnes `patients`** — date_of_birth, gender, address, city, reference_number
6. **Colonnes `conversations`** — assigned_to, is_ai_managed, needs_human_attention, is_after_hours

### Points Forts (supérieurs au PDF)
1. `prescriptions` table séparée (meilleure normalisation que `is_ordenance` booléen)
2. `analysis_catalog` avec synonyms JSONB et coefficient (meilleur mapping IA)
3. `lab_results` avec retry_count et statuts granulaires
4. `knowledge_chunks` pour RAG chatbot (non prévu dans le PDF)
5. `pricing_rules` pour tarification conventionnel/non-conventionnel
