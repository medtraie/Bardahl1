-- ============================================================================
-- BARDAHL MAROC - GESTION DYNAMIQUE DES FAMILLES DE PRODUITS (SUPABASE)
-- ============================================================================
-- Ce script crée la table `product_families`, configure la sécurité RLS 
-- et insère les familles officielles Bardahl par défaut.
-- À exécuter dans le SQL Editor de Supabase.
-- ============================================================================

-- 1. CRÉATION DE LA TABLE `product_families`
CREATE TABLE IF NOT EXISTS public.product_families (
    id VARCHAR(100) PRIMARY KEY DEFAULT ('fam_' || substr(md5(random()::text), 1, 12)),
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    icon VARCHAR(20) DEFAULT '🏷️',
    color VARCHAR(30) DEFAULT '#FFD000',
    description TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ACTIVATION DE LA SÉCURITÉ AU NIVEAU DES LIGNES (RLS)
ALTER TABLE public.product_families ENABLE ROW LEVEL SECURITY;

-- 3. POLITIQUES D'ACCÈS RLS (POLICIES)
-- Permettre la lecture publique (utilisateurs anonymes et authentifiés)
DROP POLICY IF EXISTS "Allow public read access on product_families" ON public.product_families;
CREATE POLICY "Allow public read access on product_families" 
ON public.product_families 
FOR SELECT 
USING (true);

-- Permettre la création, modification et suppression pour tous les utilisateurs de l'application
DROP POLICY IF EXISTS "Allow full access on product_families" ON public.product_families;
CREATE POLICY "Allow full access on product_families" 
ON public.product_families 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. INDEX DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_product_families_code ON public.product_families(code);
CREATE INDEX IF NOT EXISTS idx_product_families_active ON public.product_families(is_active);

-- 5. INITIALISATION / SEED DES 5 FAMILLES OFFICIELLES BARDAHL
INSERT INTO public.product_families (id, code, label, icon, color, description, is_active, sort_order)
VALUES
  ('fam_additifs', 'ADDITIFS', 'Additifs & Traitements', '🧪', '#007AFF', 'Additifs carburant, huile, radiateur et traitements moteurs professionnels', true, 1),
  ('fam_fluides', 'FLUIDES_LR', 'Fluides & LR', '💧', '#00C7BE', 'Liquides de refroidissement, lave-glaces et liquides de freins', true, 2),
  ('fam_lubrifiants', 'LUB_AUTO', 'Lubrifiants Auto', '🛢️', '#FFD000', 'Huiles moteur synthétiques, semi-synthétiques, boîte et transmission', true, 3),
  ('fam_aerosols', 'IND_AEROSOLS', 'Aérosols & Nettoyants', '💨', '#AF52DE', 'Nettoyants freins, dégrippants, rénovateurs et aérosols techniques', true, 4),
  ('fam_graisses', 'IND_GRAISSES', 'Industrie & Graisses', '⚙️', '#FF9500', 'Graisses haute performance, maintenance industrielle et agricole', true, 5)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- 6. SYNCHRONISATION AVEC LA TABLE EXISTANTE `categories`
INSERT INTO public.categories (name, code, description, icon_name)
SELECT label, code, description, icon
FROM public.product_families
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name;
