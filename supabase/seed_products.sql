-- ============================================================================
-- BARDAHL MAROC - SEED DATA (CATEGORIES & PRODUCTS FROM OFFICIAL TARIFFS)
-- Valid UUIDs (Hexadecimal 0-9, a-f)
-- ============================================================================

-- 1. Insert Main Categories
INSERT INTO public.categories (id, name, code, description) VALUES
('a0000000-0000-0000-0000-000000000001', 'Lubrifiants Auto (BVM - BVA)', 'LUB_AUTO', 'Huiles moteur et transmissions automobiles'),
('a0000000-0000-0000-0000-000000000002', 'Industrie & Specs - Graisses', 'IND_GRAISSES', 'Graisses industrielles haute performance'),
('a0000000-0000-0000-0000-000000000003', 'Industrie & Specs - Aérosols', 'IND_AEROSOLS', 'Lubrifiants et dégraissants en spray'),
('a0000000-0000-0000-0000-000000000004', 'Industrie & Specs - Alimentaire', 'IND_ALIM', 'Lubrifiants et graisses certifiés agro-alimentaires'),
('a0000000-0000-0000-0000-000000000005', 'Fluides - Liquides de Refroidissement', 'FLUIDES_LR', 'Liquides de refroidissement XCL & LR'),
('a0000000-0000-0000-0000-000000000006', 'Fluides - Lave Glace & AdBlue', 'FLUIDES_MISC', 'Lave-glace et AdBlue haute pureté')
ON CONFLICT (code) DO NOTHING;

-- 2. Insert Products from Official Tariffs 2026
INSERT INTO public.products (category_id, code, reference, name, viscosity, volume, packaging, unit_price_ttc, stock_quantity, description) VALUES

-- Category: Lubrifiants Auto - XTRA & XTEC & ATF & XTG
('a0000000-0000-0000-0000-000000000001', 'XTRA-10W40-1L', '34131', 'Bardahl XTRA 10W40', '10W40', '1L', '12 X 1l', 78.00, 500, 'Huile Moteur synthétique haut de gamme pour véhicules légers.'),
('a0000000-0000-0000-0000-000000000001', 'XTRA-10W40-205L', '34137', 'Bardahl XTRA 10W40 Fût', '10W40', '205L', '1 X 205l', 15916.00, 20, 'Fût d''huile moteur 10W40 pour ateliers et flottes.'),
('a0000000-0000-0000-0000-000000000001', 'XTRA-5W40-1L', '34121', 'Bardahl XTRA 5W40', '5W40', '1L', '12 X 1l', 120.00, 450, 'Huile 100% Synthétique avec protection anti-usure Bardahl.'),
('a0000000-0000-0000-0000-000000000001', 'XTRA-5W40-5L', '34123', 'Bardahl XTRA 5W40 5L', '5W40', '5L', '3 X 5l', 574.00, 200, 'Bidon de 5L d''huile 5W40 haute performance.'),
('a0000000-0000-0000-0000-000000000001', 'XTRA-5W30-C2C3-1L', '34111', 'Bardahl XTRA 5W30 C2/C3', '5W30', '1L', '12 X 1l', 123.00, 300, 'Compatible filtres à particules (FAP) et pot catalytique.'),
('a0000000-0000-0000-0000-000000000001', 'XTRA-5W30-C2C3-5L', '34113', 'Bardahl XTRA 5W30 C2/C3 5L', '5W30', '5L', '3 X 5l', 590.00, 150, 'Bidon 5L spécial moteurs essence et diesel modernes.'),
('a0000000-0000-0000-0000-000000000001', 'XTRA-5W30-C3-1L', '34101', 'Bardahl XTRA 5W30 C3', '5W30', '1L', '12 X 1l', 131.00, 250, 'Formulation spéciale hautes exigences constructeurs.'),
('a0000000-0000-0000-0000-000000000001', 'XTEC-5W30-ST-1L', '34951', 'Bardahl XTEC 5W30 ST', '5W30', '1L', '12 X 1l', 171.00, 180, 'Huile très haute technologie pour conditions extrêmes.'),
('a0000000-0000-0000-0000-000000000001', 'XTEC-0W30-LLC3-1L', '34141', 'Bardahl XTEC 0W30 LL C3', '0W30', '1L', '12 X 1l', 194.00, 140, 'Fluidité optimale à froid et économie de carburant.'),
('a0000000-0000-0000-0000-000000000001', 'XTEC-0W20-FE-1L', '36801', 'Bardahl XTEC 0W20 FE', '0W20', '1L', '12 X 1l', 165.00, 120, 'Formule ultra-fluide Fuel Economy.'),
('a0000000-0000-0000-0000-000000000001', 'ATF-III-1L', '36281', 'Bardahl ATF III Automatic Transmission', 'ATF', '1L', '12 X 1l', 110.00, 300, 'Fluide pour boîtes automatiques et directions assistées.'),
('a0000000-0000-0000-0000-000000000001', 'ATF-8PLUS-1L', '34971', 'Bardahl ATF 8+ Synthétique', 'ATF', '1L', '12 X 1l', 204.00, 100, 'Pour boîtes automatiques modernes 8 et 9 rapports.'),
('a0000000-0000-0000-0000-000000000001', 'XTG-80W90-1L', '36271', 'Bardahl XTG 80W90 Engrenages', '80W90', '1L', '12 X 1l', 107.00, 220, 'Lubrifiant extrême pression pour boîtes de vitesses manuelles.'),

-- Category: Industrie & Specs - Graisses
('a0000000-0000-0000-0000-000000000002', 'GRAISSE-LITH-N2-400G', 'GAL01', 'Graisse Lithium All Purpose N°2 Cartouche', 'N/A', '400g', '24 X 400g', 27.00, 1000, 'Graisse multi-usages pour roulements et articulations.'),
('a0000000-0000-0000-0000-000000000002', 'GRAISSE-LITH-N2-4KG', 'GAL03', 'Graisse Lithium All Purpose N°2 4KG', 'N/A', '4kg', '4 X 4kg', 244.00, 150, 'Seau de 4kg de graisse multi-services.'),
('a0000000-0000-0000-0000-000000000002', 'GRAISSE-LITH-N2-180KG', 'GAL04', 'Graisse Lithium All Purpose N°2 Fût', 'N/A', '180kg', '1 X 180kg', 10581.00, 10, 'Fût industriel de graisse Lithium 180kg.'),
('a0000000-0000-0000-0000-000000000002', 'POLYPLEX-TRI-400G', '1740', 'Polyplex Lithium Tri-Complex', 'N/A', '400g', '24 X 400g', 119.00, 400, 'Graisse hautes performances complexes.'),
('a0000000-0000-0000-0000-000000000002', 'HTX-HAUTE-TEMP-15KG', 'BHTX15', 'HTX Haute Température 15KG', 'N/A', '15kg', '1 X 15kg', 4700.00, 15, 'Graisse spéciale pour roulements soumis à forte chaleur.'),

-- Category: Industrie & Specs - Aérosols
('a0000000-0000-0000-0000-000000000003', 'DEGRIPPANT-LUB-400ML', '1123', 'Dégrippant Lubrifiant Bardahl', 'N/A', '400ml', '12 X 400ml', 62.00, 800, 'Formule pénétrante anti-rouille et lubrifiante.'),
('a0000000-0000-0000-0000-000000000003', 'NETTOYANT-FREINS-600ML', '4451E', 'Brake and Parts Cleaner (Nettoyant Freins)', 'N/A', '600ml', '12 X 600ml', 47.00, 1200, 'Dégraissant puissant pour systèmes de freinage et pièces.'),
('a0000000-0000-0000-0000-000000000003', 'LUBRIFIANT-SILICONE-400ML', '4457', 'Lubrifiant Silicone Spray', 'N/A', '400ml', '6 X 400ml', 86.00, 350, 'Protège et lubrifie joints, plastiques et mécanismes.'),

-- Category: Industrie & Specs - Alimentaire
('a0000000-0000-0000-0000-000000000004', 'CFA-3H-400G', '1990', 'CFA 3H Graisse Multiservice Agro-Alimentaire', 'N/A', '400g', '12 X 400g', 275.00, 120, 'Graisse certifiée H1 pour usines agro-alimentaires.'),
('a0000000-0000-0000-0000-000000000004', 'BARATHON-CFA-100-20L', '1968', 'Barathon CFA 100 Huile Compresseur Alimentaire', 'N/A', '20L', '1 X 20l', 7360.00, 8, 'Huile synthétique H1 pour compresseurs industriels.'),

-- Category: Fluides - Liquides de Refroidissement & Lave Glace
('a0000000-0000-0000-0000-000000000005', 'XCL-UNIVERSEL-1L', '7111', 'XCL Universel Concentré', 'N/A', '1L', '12 X 1l', 56.00, 600, 'Liquide de refroidissement universel concentré.'),
('a0000000-0000-0000-0000-000000000005', 'XCL-G12-ROSE-5L', '8313', 'XCL G12/G12+ Rose -25°C 5L', 'N/A', '5L', '3 X 5l', 133.00, 400, 'Protection antigel et anti-surchauffe longue durée.'),
('a0000000-0000-0000-0000-000000000005', 'LR-TYPE-D-ROSE-20L', 'LRR2035', 'LR Type D -35°C Rose Universel 20L', 'N/A', '20L', '1 X 20l', 470.00, 50, 'Bidon de 20L pour flottes et poids lourds.'),

-- Category: Fluides - Lave Glace & AdBlue
('a0000000-0000-0000-0000-000000000006', 'LAVE-GLACE-POMME-250ML', '4510', 'Lave Glace Concentré Senteur Pomme', 'N/A', '250ml', '24 X 250ml', 22.00, 900, 'Nettoie sans traces et laisse un parfum frais.'),
('a0000000-0000-0000-0000-000000000006', 'ADBLUE-10L', '3129', 'AdBlue Solution d''Urée Haute Pureté 10L', 'N/A', '10L', '1 X 10l', 193.00, 300, 'Réduit les émissions SCR des moteurs diesel modernes.')
ON CONFLICT (code) DO NOTHING;

-- 3. Insert Default Admin User & Commercial Profile (Valid Hex UUIDs)
INSERT INTO public.users (id, email, role, first_name, last_name, phone, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@bardahl.ma', 'admin', 'Direction', 'Bardahl', '+212 5 22 11 22 33', TRUE),
('22222222-2222-2222-2222-222222222222', 'commercial@bardahl.ma', 'commercial', 'Karim', 'Benjelloun', '+212 6 61 00 11 22', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.commercials (id, user_id, matricule, city, target_monthly_sales) VALUES
('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', 'COMM-001', 'Casablanca', 150000.00)
ON CONFLICT (matricule) DO NOTHING;

-- 4. Insert Default Clients
INSERT INTO public.clients (commercial_id, company_name, ice, rc, if_code, patente, address, city, phone, email, client_type) VALUES
('88888888-8888-8888-8888-888888888888', 'Auto Service Ain Sebaa', '001548792000088', '45892', '1425367', '789654', 'Zone Industrielle Ain Sebaa', 'Casablanca', '+212 5 22 35 44 55', 'contact@autoservice.ma', 'garage'),
('88888888-8888-8888-8888-888888888888', 'Station Afriquia Route de Rabat', '001984256000077', '12458', '8523694', '456123', 'Km 12 Route de Rabat', 'Casablanca', '+212 5 22 78 99 00', 'station.rabat@afriquia.ma', 'station'),
('88888888-8888-8888-8888-888888888888', 'Transport & Logistique du Sud', '002145893000066', '89654', '3692581', '123987', 'Zone Logistique Zenata', 'Mohammedia', '+212 5 23 30 20 10', 'achats@tlsud.ma', 'flotte')
ON CONFLICT (ice) DO NOTHING;
