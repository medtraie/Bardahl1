-- ============================================================================
-- BARDAHL MAROC - GESTION DES DEVIS & ESTIMATIONS (SUPABASE)
-- ============================================================================
-- Ce script crée la table `devis`, configure la sécurité RLS et les index.
-- À exécuter dans le SQL Editor de Supabase pour une synchronisation cloud complète.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.devis (
    id VARCHAR(100) PRIMARY KEY DEFAULT ('dev_' || substr(md5(random()::text), 1, 12)),
    devis_number VARCHAR(50) NOT NULL UNIQUE,
    commercial_id UUID REFERENCES public.commercials(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    validity_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
    total_ht NUMERIC(12, 2) DEFAULT 0,
    total_discount NUMERIC(12, 2) DEFAULT 0,
    total_tva NUMERIC(12, 2) DEFAULT 0,
    total_ttc NUMERIC(12, 2) DEFAULT 0,
    converted_order_number VARCHAR(50),
    converted_order_id UUID,
    converted_at TIMESTAMPTZ,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activation de la sécurité RLS
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;

-- Politiques RLS permissives pour les agents et administrateurs
DROP POLICY IF EXISTS "Allow public read access on devis" ON public.devis;
CREATE POLICY "Allow public read access on devis" 
ON public.devis FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow full access on devis" ON public.devis;
CREATE POLICY "Allow full access on devis" 
ON public.devis FOR ALL USING (true) WITH CHECK (true);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_devis_number ON public.devis(devis_number);
CREATE INDEX IF NOT EXISTS idx_devis_commercial_id ON public.devis(commercial_id);
CREATE INDEX IF NOT EXISTS idx_devis_client_id ON public.devis(client_id);
CREATE INDEX IF NOT EXISTS idx_devis_status ON public.devis(status);
