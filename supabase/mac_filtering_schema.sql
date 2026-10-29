-- ==============================================================================
-- BARDAHL MAGHREB - FILTRAGE MAC & SÉCURITÉ DES APPAREILS COMMERCIAUX (2026)
-- Chaque commercial est restreint à maximum 3 adresses MAC autorisées.
-- ==============================================================================

-- 1. Table des Appareils Autorisés (Commercial Devices)
CREATE TABLE IF NOT EXISTS public.commercial_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commercial_id UUID NOT NULL REFERENCES public.commercials(id) ON DELETE CASCADE,
    mac_address VARCHAR(20) NOT NULL,
    device_name VARCHAR(100) NOT NULL DEFAULT 'Appareil Android Commercial',
    device_model VARCHAR(100) DEFAULT 'Android Device',
    is_active BOOLEAN NOT NULL DEFAULT true,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_commercial_mac UNIQUE (commercial_id, mac_address)
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_commercial_devices_comm_id ON public.commercial_devices(commercial_id);
CREATE INDEX IF NOT EXISTS idx_commercial_devices_mac ON public.commercial_devices(mac_address);

-- 2. Table des Logs de Sécurité et Tentatives de Connexion (Security Logs)
CREATE TABLE IF NOT EXISTS public.mac_security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commercial_id UUID REFERENCES public.commercials(id) ON DELETE SET NULL,
    commercial_name VARCHAR(150),
    commercial_email VARCHAR(150),
    attempted_mac VARCHAR(20) NOT NULL,
    device_model VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'BLOCKED', -- 'AUTHORIZED', 'BLOCKED', 'PENDING'
    reason VARCHAR(255) DEFAULT 'Appareil non enregistré',
    ip_address VARCHAR(50) DEFAULT 'Réseau Mobile / Wi-Fi',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mac_security_logs_created_at ON public.mac_security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mac_security_logs_comm_id ON public.mac_security_logs(commercial_id);

-- 3. Configuration Globale de Sécurité
CREATE TABLE IF NOT EXISTS public.mac_security_config (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'global_config',
    is_filtering_enabled BOOLEAN NOT NULL DEFAULT true,
    max_devices_per_commercial INT NOT NULL DEFAULT 3,
    allow_auto_approval BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insertion de la configuration initiale si non existante
INSERT INTO public.mac_security_config (id, is_filtering_enabled, max_devices_per_commercial)
VALUES ('global_config', true, 3)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies
ALTER TABLE public.commercial_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mac_security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mac_security_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for commercial_devices" ON public.commercial_devices
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read-write for mac_security_logs" ON public.mac_security_logs
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read-write for mac_security_config" ON public.mac_security_config
    FOR ALL USING (true) WITH CHECK (true);
