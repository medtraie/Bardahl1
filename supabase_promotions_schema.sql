-- =============================================================================
-- BARDAHL MAROC - GESTION DES PROMOTIONS ET OFFRES COMMERCIALES
-- Script SQL pour Supabase (SQL Editor)
-- =============================================================================

-- 1. Création de la table 'promotions'
CREATE TABLE IF NOT EXISTS public.promotions (
    id TEXT PRIMARY KEY DEFAULT ('promo_' || replace(gen_random_uuid()::text, '-', '')),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT NOT NULL CHECK (type IN ('TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4')),
    target_type TEXT NOT NULL DEFAULT 'FAMILY' CHECK (target_type IN ('FAMILY', 'PRODUCT')),
    target_family TEXT,
    target_product_id TEXT,
    target_product_ref TEXT,
    target_product_name TEXT,
    threshold NUMERIC(12, 2) NOT NULL DEFAULT 10.0,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    free_item_type TEXT CHECK (free_item_type IN ('SAME_PRODUCT', 'DIFFERENT_PRODUCT')),
    free_product_id TEXT,
    free_product_ref TEXT,
    free_product_name TEXT,
    free_quantity INTEGER NOT NULL DEFAULT 0,
    tiers JSONB DEFAULT '[]'::jsonb,
    voucher_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour optimiser les recherches par cible et type
CREATE INDEX IF NOT EXISTS idx_promotions_type ON public.promotions(type);
CREATE INDEX IF NOT EXISTS idx_promotions_is_active ON public.promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_target_family ON public.promotions(target_family);

-- 2. Configuration des Politiques de Sécurité (Row Level Security - RLS)
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on promotions" ON public.promotions;
CREATE POLICY "Allow public read access on promotions"
    ON public.promotions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow full access on promotions" ON public.promotions;
CREATE POLICY "Allow full access on promotions"
    ON public.promotions FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Activation du Temps Réel Supabase (Realtime)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'promotions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;
    END IF;
END $$;

-- 4. Insertion des Offres Promotionnelles Bardahl officielles par défaut
INSERT INTO public.promotions (
    id, name, description, type, target_type, target_family, target_product_ref, target_product_name,
    threshold, discount_percent, free_item_type, free_product_ref, free_product_name, free_quantity,
    tiers, voucher_amount, is_active, start_date, end_date
) VALUES 
-- Type 1 : Quantité de cartons -> Remise %
(
    'promo_1',
    'Offre Volume Additifs (5% dès 10 cartons)',
    'À partir de 10 cartons achetés dans la famille Additifs -> 5% de remise sur la famille.',
    'TYPE_1',
    'FAMILY',
    'ADDITIFS',
    NULL,
    NULL,
    10.0,
    5.0,
    NULL,
    NULL,
    NULL,
    0,
    '[]'::jsonb,
    0.0,
    true,
    '2026-01-01',
    '2026-12-31'
),
-- Type 2 Option A : Quantité de cartons -> Remise + Carton gratuit même référence
(
    'promo_2a',
    'Promo XTRA 10W40 (5% + 1 Carton Offert Même Réf)',
    'À partir de 10 cartons de Bardahl XTRA 10W40 -> 5% de remise + 1 carton gratuit identique.',
    'TYPE_2',
    'PRODUCT',
    NULL,
    '34131',
    'Bardahl XTRA 10W40 1L (Huile Moteur)',
    10.0,
    5.0,
    'SAME_PRODUCT',
    NULL,
    NULL,
    1,
    '[]'::jsonb,
    0.0,
    true,
    '2026-01-01',
    '2026-12-31'
),
-- Type 2 Option B : Quantité de cartons -> Remise + Carton gratuit autre référence
(
    'promo_2b',
    'Offre Lubrifiants Auto (5% + 2 Plasma Booster Offerts)',
    'À partir de 10 cartons de Lubrifiants Auto -> 5% de remise + 2 cartons de Plasma Oil Booster offerts.',
    'TYPE_2',
    'FAMILY',
    'LUBRIFIANTS AUTO',
    NULL,
    NULL,
    10.0,
    5.0,
    'DIFFERENT_PRODUCT',
    '2530B',
    'PLASMA OIL BOOSTER (Réf: 2530B)',
    2,
    '[]'::jsonb,
    0.0,
    true,
    '2026-01-01',
    '2026-12-31'
),
-- Type 2 avec Paliers Exclusifs (Section 5)
(
    'promo_tiers',
    'Paliers Progressifs Graisses & Nettoyants (10/20/30 cartons)',
    'Paliers exclusifs : 10 cartons = 5% + 1 offert | 20 cartons = 7% + 2 offerts | 30 cartons = 10% + 3 offerts.',
    'TYPE_2',
    'FAMILY',
    'GRAISSES',
    NULL,
    NULL,
    10.0,
    0.0,
    'SAME_PRODUCT',
    NULL,
    NULL,
    0,
    '[
        {"threshold": 10, "discountPercent": 5, "freeQuantity": 1},
        {"threshold": 20, "discountPercent": 7, "freeQuantity": 2},
        {"threshold": 30, "discountPercent": 10, "freeQuantity": 3}
    ]'::jsonb,
    0.0,
    true,
    '2026-01-01',
    '2026-12-31'
),
-- Type 3 : Quantité de cartons -> Remise + Bon d'achat fixe déduit immédiatement
(
    'promo_3',
    'Pack Atelier Pro (5% + Bon d''Achat Immédiat 100 DH)',
    'Dès 10 cartons de Produits Atelier -> 5% de remise + 100 DH déduits directement sur la commande actuelle.',
    'TYPE_3',
    'FAMILY',
    'PRODUITS ATELIER',
    NULL,
    NULL,
    10.0,
    5.0,
    NULL,
    NULL,
    NULL,
    0,
    '[]'::jsonb,
    100.0,
    true,
    '2026-01-01',
    '2026-12-31'
),
-- Type 4 : Montant total d'une famille -> Remise %
(
    'promo_4',
    'Challenge Chiffre d''Affaires Additifs (Dès 5 000 DH)',
    'Pour un montant total d''achat >= 5 000 DH dans la famille Additifs -> 5% de remise sur toute la famille.',
    'TYPE_4',
    'FAMILY',
    'ADDITIFS',
    NULL,
    NULL,
    5000.0,
    5.0,
    NULL,
    NULL,
    NULL,
    0,
    '[]'::jsonb,
    0.0,
    true,
    '2026-01-01',
    '2026-12-31'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    type = EXCLUDED.type,
    target_type = EXCLUDED.target_type,
    target_family = EXCLUDED.target_family,
    target_product_ref = EXCLUDED.target_product_ref,
    target_product_name = EXCLUDED.target_product_name,
    threshold = EXCLUDED.threshold,
    discount_percent = EXCLUDED.discount_percent,
    free_item_type = EXCLUDED.free_item_type,
    free_product_ref = EXCLUDED.free_product_ref,
    free_product_name = EXCLUDED.free_product_name,
    free_quantity = EXCLUDED.free_quantity,
    tiers = EXCLUDED.tiers,
    voucher_amount = EXCLUDED.voucher_amount,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
