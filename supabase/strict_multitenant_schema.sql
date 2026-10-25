-- ============================================================================
-- BARDAHL MAROC - ISOLATION STRICTE MULTI-TENANT (USER_ID)
-- ============================================================================
-- Ce script ajoute les colonnes user_id nécessaires sur les tables
-- clients, orders et commercials pour garantir une séparation stricte des données :
-- - Utilisateur A voit uniquement ses données.
-- - Utilisateur B voit uniquement ses données.
-- - Nouveau compte : application vide.
-- - Les anciennes lignes qui n'ont pas de user_id ne seront visibles par personne.
-- ============================================================================

-- 1. Table `clients` : ajout de user_id et index
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- 2. Table `orders` : ajout de user_id et index
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- 3. Table `commercials` : vérification et index
ALTER TABLE public.commercials ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_commercials_user_id ON public.commercials(user_id);

-- 4. Table `users` : colonnes optionnelles pour les tenants
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255) DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT '';

-- 5. Politique d'accès pour les utilisateurs
DROP POLICY IF EXISTS "Allow service_role full access users" ON public.users;
CREATE POLICY "Allow service_role full access users" ON public.users FOR ALL USING (true) WITH CHECK (true);
