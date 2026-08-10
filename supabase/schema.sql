-- ============================================================================
-- BARDAHL MAROC - SUPABASE DATABASE SCHEMA (DESIGN 2026)
-- Project: Bardahl Maroc Commercial Application
-- Engine: PostgreSQL 15+ (Supabase)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ENUMS & DOMAINS
-- ----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('admin', 'commercial');
CREATE TYPE order_status AS ENUM ('draft', 'validated', 'sent', 'delivered', 'cancelled');
CREATE TYPE client_type AS ENUM ('detail', 'gros', 'station', 'garage', 'industriel', 'flotte');

-- ----------------------------------------------------------------------------
-- 2. TABLES DEFINITIONS
-- ----------------------------------------------------------------------------

-- Table: roles
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name user_role NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: users (Extends Supabase Auth or Local Profile Table)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE, -- References auth.users(id) in Supabase
    email VARCHAR(255) NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'commercial',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url TEXT,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: commercials
CREATE TABLE IF NOT EXISTS public.commercials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    matricule VARCHAR(50) NOT NULL UNIQUE,
    city VARCHAR(100) NOT NULL,
    target_monthly_sales DECIMAL(12,2) DEFAULT 0.00,
    current_month_sales DECIMAL(12,2) DEFAULT 0.00,
    total_orders_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: clients
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commercial_id UUID REFERENCES public.commercials(id) ON DELETE SET NULL,
    company_name VARCHAR(255) NOT NULL,
    ice VARCHAR(15) NOT NULL UNIQUE, -- Identifiant Commun de l'Entreprise (15 digits)
    rc VARCHAR(50),                  -- Registre du Commerce
    if_code VARCHAR(50),             -- Identifiant Fiscal
    patente VARCHAR(50),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    gps_latitude DOUBLE PRECISION,
    gps_longitude DOUBLE PRECISION,
    client_type client_type NOT NULL DEFAULT 'detail',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    icon_name VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    reference VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    viscosity VARCHAR(50),
    volume VARCHAR(50),
    packaging VARCHAR(100) NOT NULL, -- e.g., 12 X 1l, 3 X 5l, 1 X 205l
    unit_price_ttc DECIMAL(10,2) NOT NULL,
    tva_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    unit_price_ht DECIMAL(10,2) GENERATED ALWAYS AS (unit_price_ttc / 1.20) STORED,
    stock_quantity INT NOT NULL DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'Bidon',
    technical_specs TEXT,
    applications TEXT,
    compatibility TEXT,
    barcode VARCHAR(100),
    qr_code VARCHAR(100),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: orders (Bons de Commande)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL UNIQUE, -- e.g., BC-2026-00001
    commercial_id UUID NOT NULL REFERENCES public.commercials(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status order_status NOT NULL DEFAULT 'draft',
    total_ht DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_tva DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_ttc DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    signature_url TEXT,
    observations TEXT,
    is_synced BOOLEAN DEFAULT TRUE,
    offline_created_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: order_items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price_ttc DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    tva_rate DECIMAL(5,2) DEFAULT 20.00,
    total_ht DECIMAL(12,2) NOT NULL,
    total_ttc DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: settings (Enterprise Profile)
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) DEFAULT 'BARDAHL MAGHREB S.A',
    logo_url TEXT,
    address TEXT DEFAULT 'Casablanca, Maroc',
    phone VARCHAR(50) DEFAULT '+212 5 22 00 00 00',
    email VARCHAR(255) DEFAULT 'contact@bardahl.ma',
    ice VARCHAR(15) DEFAULT '001524389000045',
    rc VARCHAR(50) DEFAULT '123456',
    if_code VARCHAR(50) DEFAULT '9876543',
    patente VARCHAR(50) DEFAULT '456789',
    tva_default DECIMAL(5,2) DEFAULT 20.00,
    signature_url TEXT,
    stamp_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: logs / Audit Trails
CREATE TABLE IF NOT EXISTS public.logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. INDEXES FOR MAXIMUM PERFORMANCE
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_commercials_user_id ON public.commercials(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_commercial_id ON public.clients(commercial_id);
CREATE INDEX IF NOT EXISTS idx_clients_ice ON public.clients(ice);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(code);
CREATE INDEX IF NOT EXISTS idx_products_reference ON public.products(reference);
CREATE INDEX IF NOT EXISTS idx_orders_commercial ON public.orders(commercial_id);
CREATE INDEX IF NOT EXISTS idx_orders_client ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- ----------------------------------------------------------------------------
-- 4. FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_commercials_updated_at BEFORE UPDATE ON public.commercials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Automatic Order Number Generator (BC-2026-00001)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT := TO_CHAR(NOW(), 'YYYY');
    seq_num INT;
BEGIN
    SELECT COALESCE(COUNT(*), 0) + 1 INTO seq_num FROM public.orders WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    NEW.order_number := 'BC-' || year_str || '-' || LPAD(seq_num::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
EXECUTE FUNCTION generate_order_number();

-- ----------------------------------------------------------------------------
-- 5. ANALYTICAL VIEWS
-- ----------------------------------------------------------------------------

-- View: Dashboard Overall Stats
CREATE OR REPLACE VIEW view_dashboard_stats AS
SELECT
    COUNT(DISTINCT o.id) AS total_orders,
    COALESCE(SUM(CASE WHEN o.order_date >= CURRENT_DATE THEN 1 ELSE 0 END), 0) AS orders_today,
    COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM o.order_date) = EXTRACT(MONTH FROM CURRENT_DATE) 
                      AND EXTRACT(YEAR FROM o.order_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN 1 ELSE 0 END), 0) AS orders_this_month,
    COALESCE(SUM(o.total_ttc), 0.00) AS total_revenue_ttc,
    (SELECT COUNT(*) FROM public.clients WHERE is_active = TRUE) AS active_clients_count,
    (SELECT COUNT(*) FROM public.products WHERE is_active = TRUE) AS active_products_count
FROM public.orders o
WHERE o.status != 'cancelled';

-- View: Top Selling Products
CREATE OR REPLACE VIEW view_top_products AS
SELECT
    p.id AS product_id,
    p.code,
    p.name,
    p.reference,
    SUM(oi.quantity) AS total_quantity_sold,
    SUM(oi.total_ttc) AS total_revenue_ttc
FROM public.order_items oi
JOIN public.products p ON oi.product_id = p.id
JOIN public.orders o ON oi.order_id = o.id
WHERE o.status != 'cancelled'
GROUP BY p.id, p.code, p.name, p.reference
ORDER BY total_quantity_sold DESC;

-- View: Commercial Performance
CREATE OR REPLACE VIEW view_commercial_performance AS
SELECT
    c.id AS commercial_id,
    u.first_name || ' ' || u.last_name AS commercial_name,
    c.matricule,
    c.city,
    COUNT(o.id) AS total_orders,
    COALESCE(SUM(o.total_ttc), 0.00) AS total_sales_ttc,
    c.target_monthly_sales
FROM public.commercials c
JOIN public.users u ON c.user_id = u.id
LEFT JOIN public.orders o ON o.commercial_id = c.id AND o.status != 'cancelled'
GROUP BY c.id, u.first_name, u.last_name, c.matricule, c.city, c.target_monthly_sales;
