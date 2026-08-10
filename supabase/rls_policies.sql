-- ============================================================================
-- BARDAHL MAROC - ROW LEVEL SECURITY (RLS) POLICIES
-- Security Architecture for Admin & Commercial Roles
-- ============================================================================

-- Enable RLS on all sensitive tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check if current authenticated user is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_id = auth.uid() AND role = 'admin' AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper Function: Get Commercial ID for current authenticated user
CREATE OR REPLACE FUNCTION public.get_current_commercial_id()
RETURNS UUID AS $$
DECLARE
    cid UUID;
BEGIN
    SELECT c.id INTO cid
    FROM public.commercials c
    JOIN public.users u ON c.user_id = u.id
    WHERE u.auth_id = auth.uid() AND u.is_active = TRUE;
    RETURN cid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- POLICIES FOR PRODUCTS & CATEGORIES
-- Read-only for Commercials, Full access for Admin
-- ----------------------------------------------------------------------------
CREATE POLICY "Products viewable by all authenticated users"
ON public.products FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Products editable only by admin"
ON public.products FOR ALL
USING (public.is_admin());

CREATE POLICY "Categories viewable by all authenticated users"
ON public.categories FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Categories editable only by admin"
ON public.categories FOR ALL
USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- POLICIES FOR CLIENTS
-- Admin sees all. Commercial sees ONLY clients assigned to them.
-- ----------------------------------------------------------------------------
CREATE POLICY "Clients select policy"
ON public.clients FOR SELECT
USING (
    public.is_admin() OR
    commercial_id = public.get_current_commercial_id()
);

CREATE POLICY "Clients insert policy"
ON public.clients FOR INSERT
WITH CHECK (
    public.is_admin() OR
    commercial_id = public.get_current_commercial_id()
);

CREATE POLICY "Clients update policy"
ON public.clients FOR UPDATE
USING (
    public.is_admin() OR
    commercial_id = public.get_current_commercial_id()
);

CREATE POLICY "Clients delete policy"
ON public.clients FOR DELETE
USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- POLICIES FOR ORDERS & ORDER ITEMS
-- Admin sees all. Commercial sees ONLY their own orders.
-- Commercial can delete ONLY draft orders.
-- ----------------------------------------------------------------------------
CREATE POLICY "Orders select policy"
ON public.orders FOR SELECT
USING (
    public.is_admin() OR
    commercial_id = public.get_current_commercial_id()
);

CREATE POLICY "Orders insert policy"
ON public.orders FOR INSERT
WITH CHECK (
    public.is_admin() OR
    commercial_id = public.get_current_commercial_id()
);

CREATE POLICY "Orders update policy"
ON public.orders FOR UPDATE
USING (
    public.is_admin() OR
    commercial_id = public.get_current_commercial_id()
);

CREATE POLICY "Orders delete policy"
ON public.orders FOR DELETE
USING (
    public.is_admin() OR
    (commercial_id = public.get_current_commercial_id() AND status = 'draft')
);

CREATE POLICY "Order items policy"
ON public.order_items FOR ALL
USING (
    public.is_admin() OR
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
          AND o.commercial_id = public.get_current_commercial_id()
    )
);

-- ----------------------------------------------------------------------------
-- POLICIES FOR SETTINGS & USERS
-- ----------------------------------------------------------------------------
CREATE POLICY "Users select policy"
ON public.users FOR SELECT
USING (
    public.is_admin() OR
    auth_id = auth.uid()
);

CREATE POLICY "Users admin full access"
ON public.users FOR ALL
USING (public.is_admin());

CREATE POLICY "Commercials select policy"
ON public.commercials FOR SELECT
USING (
    public.is_admin() OR
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
);

CREATE POLICY "Commercials admin full access"
ON public.commercials FOR ALL
USING (public.is_admin());

CREATE POLICY "Settings viewable by all"
ON public.settings FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Settings editable only by admin"
ON public.settings FOR ALL
USING (public.is_admin());
