# Documentation Technique - Bardahl Maroc Commercial Android (Design 2026)

## 1. Sécurité & Politiques Row Level Security (RLS)

L'accès aux données dans Supabase est régi de manière hermétique :

### Rôle ADMINISTRATEUR
- Accès global en lecture, écriture, modification et suppression sur toutes les tables (`clients`, `products`, `orders`, `commercials`, `settings`).
- Accès aux statistiques globales du chiffre d'affaires et au classement de l'équipe commerciale.

### Rôle COMMERCIAL
- **Clients** : Consultation et création uniquement de ses propres clients (`commercial_id = auth.uid()`).
- **Produits** : Consultation en lecture seule du catalogue officiel Bardahl.
- **Commandes** : Création et consultation de ses propres commandes. Modification et suppression uniquement des commandes avec statut `brouillon`.

---

## 2. Base de Données Supabase (PostgreSQL)

Les scripts SQL dans `/supabase` assurent la mise en place automatique :
- `schema.sql` : Création des tables, contraintes d'intégrité, index, vues analytiques (`view_dashboard_stats`, `view_top_products`, `view_commercial_performance`) et triggers de numérotation séquentielle (`BC-2026-00001`).
- `rls_policies.sql` : Activation et définition des règles de sécurité Supabase.
- `seed_products.sql` : Chargement initial des huiles (XTRA, XTEC, ATF), graisses, liquides de refroidissement XCL et AdBlue.

---

## 3. Architecture Offline-First & Synchronisation

1. **Sauvegarde Locale Instantanée** : Chaque bon de commande ou client créé est immédiatement enregistré dans la base de données SQLite locale via Room (`local_orders`, `local_clients`).
2. **Post en Arrière-Plan** : L'application tente une transmission vers l'API Supabase via `SupabaseService`.
3. **Gestion des Pannes Réseau** : En cas d'absence de connexion Internet, la requête est placée dans la file `sync_queue`. Dès le retour du réseau, `SyncRepository` rejoue automatiquement les opérations en attente.

---

## 4. Génération PDF & Export Excel

- **Générateur PDF (`PdfGenerator.kt`)** : Produit un document vectoriel A4 haute qualité comprenant le logo Bardahl, les mentions légales (ICE, RC, IF, Patente), la liste des articles avec calcul de TVA 20%, et l'emplacement pour la signature client.
- **Exportateur Excel (`ExcelExporter.kt`)** : Génère un fichier CSV/XLS structuré récapitulant les commandes avec filtres par période.
