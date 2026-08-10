# Guide d'Installation & Déploiement - Application Bardahl Maroc

## Étape 1 : Configuration de la Base de Données Supabase

1. Connectez-vous à votre console Supabase : [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez le projet `uoknnkrphtlsmvrdkeov`.
3. Allez dans la section **SQL Editor**.
4. Exécutez les fichiers SQL dans l'ordre suivant :
   - `supabase/schema.sql` (Structure et tables)
   - `supabase/rls_policies.sql` (Sécurité Row Level Security)
   - `supabase/seed_products.sql` (Données produits et clients initiaux)

---

## Étape 2 : Configuration du Projet Android Studio

1. Ouvrez **Android Studio (Ladybug 2024.2.1 ou supérieur)**.
2. Choisissez **Open** et sélectionnez le dossier `c:\Users\SFT\Desktop\bardahl`.
3. Attendez la synchronisation Gradle (`Gradle Sync`).
4. Vérifiez que la configuration `app` est sélectionnée.
5. Cliquez sur **Run 'app'** ou maj+F10 pour exécuter l'application sur un émulateur Android ou un smartphone physique (Android 8.0+ / API 26+).

---

## Étape 3 : Compte de Test

### Connexion Commercial :
- **Email** : `commercial@bardahl.ma`
- **Mot de passe** : `123456`
- **Rôle** : Commercial (Accès restreint à ses propres données)

### Connexion Administrateur :
- **Email** : `admin@bardahl.ma`
- **Mot de passe** : `123456`
- **Rôle** : Administrateur (Accès global, gestion équipe et statistiques)
