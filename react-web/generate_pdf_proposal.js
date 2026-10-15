const { jsPDF } = require('jspdf');
require('jspdf-autotable');
const fs = require('fs');
const path = require('path');

async function createProposalPdf() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const NAVY = [15, 23, 42];      // #0F172A
  const BLUE = [30, 58, 138];     // #1E3A8A
  const AMBER = [217, 119, 6];    // #D97706
  const LIGHT_BG = [248, 250, 252]; // #F8FAFC
  const TEXT_DARK = [30, 41, 59];  // #1E293B
  const TEXT_MUTED = [100, 116, 139]; // #64748B
  const BORDER_COLOR = [226, 232, 240]; // #E2E8F0
  const WHITE = [255, 255, 255];
  const SUCCESS_GREEN = [16, 185, 129];

  let currentPage = 1;

  function addHeaderFooter(doc, title = "PROPOSITION COMMERCIALE & ÉVALUATION TECHNIQUE") {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      if (i === 1) continue; // Skip header/footer on cover page

      // Header
      doc.setFillColor(...LIGHT_BG);
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...TEXT_MUTED);
      doc.setFont('helvetica', 'bold');
      doc.text("BARDAHL MAROC — PLATEFORME WEB & ANDROID", margin, 8);
      doc.setFont('helvetica', 'normal');
      doc.text(title, pageWidth - margin, 8, { align: 'right' });

      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.3);
      doc.line(margin, 12, pageWidth - margin, 12);

      // Footer
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.setFontSize(8);
      doc.setTextColor(...TEXT_MUTED);
      doc.text("Document Confidentiel — Strictement réservé à la Direction Bardahl", margin, pageHeight - 6);
      doc.text(`Page ${i} sur ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
    }
  }

  // --- PAGE 1: COVER PAGE ---
  // Top Decorative Banner
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 85, 'F');
  
  doc.setFillColor(...AMBER);
  doc.rect(0, 82, pageWidth, 3, 'F');

  // Badge
  doc.setFillColor(...AMBER);
  doc.roundedRect(margin, 20, 65, 7, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text("OFFRE COMMERCIALES & EXPERTISE", margin + 4, 24.8);

  // Title
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text("PLATEFORME GESTION COMMERCIALE", margin, 42);
  doc.text("& MOVEMENTS DE STOCK BARDAHL", margin, 52);

  doc.setFontSize(12);
  doc.setTextColor(203, 213, 225); // #CBD5E1
  doc.setFont('helvetica', 'normal');
  doc.text("Solution Complète Web & Application Mobile Android Native", margin, 64);
  doc.text("Dossier d'Évaluation Financière & Proposition d'Acquisition", margin, 71);

  // Body content on cover
  let y = 98;

  // Executive Metadata Card
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(margin, y, contentWidth, 48, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text("INFORMATIONS DU PROJET & ÉQUIPE DE DÉVELOPPEMENT", margin + 6, y + 9);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);

  const metaLeft = [
    ["Client Cible :", "Bardahl Maroc (Direction & Équipe Commerciale)"],
    ["Architecture :", "Web App React + Mobile Android + Cloud API"],
    ["Équipe Projet :", "4 Ingénieurs Full-Stack & Mobile Senior"],
    ["Volume de Travail :", "7h/jour pendant 2 mois (~1 120 Heures/Homme)"]
  ];

  let metaY = y + 17;
  metaLeft.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin + 6, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(val, margin + 45, metaY);
    metaY += 7;
  });

  y += 56;

  // Financial Highlights Card
  doc.setFillColor(239, 246, 255); // #EFF6FF
  doc.setDrawColor(191, 219, 254); // #BFDBFE
  doc.roundedRect(margin, y, contentWidth, 54, 3, 3, 'FD');

  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.setFont('helvetica', 'bold');
  doc.text("SYNTHÈSE DE LA VALORISATION ET OFFRE FINANCIÈRE", margin + 6, y + 10);

  // 3 KPI Boxes inside cover
  const boxW = (contentWidth - 16) / 3;
  
  // Box 1: Valeur Fair Market
  doc.setFillColor(...WHITE);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(margin + 4, y + 17, boxW, 30, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("VALEUR MARCHANDE", margin + 8, y + 23);
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text("280 000 DH", margin + 8, y + 31);
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text("Achat Licence & Code Source", margin + 8, y + 39);

  // Box 2: Installation
  doc.setFillColor(...WHITE);
  doc.roundedRect(margin + 8 + boxW, y + 17, boxW, 30, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFont('helvetica', 'bold');
  doc.text("INSTALLATION & CLOUD", margin + 12 + boxW, y + 23);
  doc.setFontSize(12);
  doc.setTextColor(...AMBER);
  doc.text("35 000 DH", margin + 12 + boxW, y + 31);
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text("Déploiement & Configuration", margin + 12 + boxW, y + 39);

  // Box 3: Maintenance
  doc.setFillColor(...WHITE);
  doc.roundedRect(margin + 12 + boxW * 2, y + 17, boxW, 30, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFont('helvetica', 'bold');
  doc.text("MAINTENANCE / MOIS", margin + 16 + boxW * 2, y + 23);
  doc.setFontSize(12);
  doc.setTextColor(...SUCCESS_GREEN);
  doc.text("10 000 DH", margin + 16 + boxW * 2, y + 31);
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text("Support & Mises à Jour", margin + 16 + boxW * 2, y + 39);

  y += 62;

  // Table of Contents Summary
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text("SOMMAIRE EXÉCUTIF DU DOSSIER", margin, y);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 2, margin + 40, y + 2);

  y += 8;

  const toc = [
    ["1.", "Offre Commerciale Persuasive & Synthèse de Valeur", "Page 2"],
    ["2.", "Calcul Détaillé du Charge de Travail (4 Ingénieurs x 2 Mois)", "Page 2"],
    ["3.", "Architecture Cloud Enterprise & Modèle de Données (Ex-Supabase)", "Page 3"],
    ["4.", "Spécifications Détaillées des Modules (Web & Android)", "Page 4 - 5"],
    ["5.", "Guide d'Utilisation Pas à Pas (Commercial & Direction Bardahl)", "Page 6"],
    ["6.", "Recommandations Finales & Stratégie de Négociation Commerciale", "Page 7"]
  ];

  doc.setFontSize(9);
  toc.forEach(([num, title, page]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...AMBER);
    doc.text(num, margin + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_DARK);
    doc.text(title, margin + 10, y);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(page, pageWidth - margin - 15, y, { align: 'right' });
    y += 6.5;
  });

  // --- PAGE 2: OFFRE COMMERCIALE & VALORISATION FINANCIÈRE ---
  doc.addPage();
  y = 20;

  // Section Header
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text("1. OFFRE COMMERCIALE PERSUASIVE & ARGUMENTAIRE", margin, y);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(1);
  doc.line(margin, y + 2, margin + 60, y + 2);

  y += 9;

  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  const introText = doc.splitTextToSize(
    "La présente proposition commerciale concerne l'acquisition de la plateforme intégrée de gestion commerciale, d'automatisation des promotions et de contrôle des mouvements de stock conçue sur-mesure pour Bardahl Maroc. Cette solution élimine les pertes financières liées aux erreurs de calcul des remises, fiabilise les stocks de cadeaux et offre une réactivité instantanée à l'équipe commerciale sur le terrain.",
    contentWidth
  );
  doc.text(introText, margin, y);
  y += introText.length * 5 + 4;

  // Value Proposition Cards
  const valPoints = [
    ["100% Dédié aux Règles Bardahl", "Contrairement aux ERP génériques (SAP, Sage), cette plateforme intègre nativement les 4 types de promotions Bardahl, le calcul par cartons et la déduction automatique des colisages (unitsPerBox)."],
    ["Protection des Marges & Sécurité", "Détection automatique des remises manuelles (⚠️ Remise Manuelle), contrôle strict des plafonds de crédit clients et verrouillage des accès sensibles réservés à la Direction Bardahl."],
    ["Gain de Temps & Productivité", "Génération automatique des Bons de Commande en PDF, édition groupée multi-pages en un seul clic, et exports Excel pour une analyse financière immédiate."]
  ];

  valPoints.forEach(([title, desc]) => {
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.text(`✔  ${title}`, margin + 4, y + 6);

    doc.setFontSize(8);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'normal');
    const splitDesc = doc.splitTextToSize(desc, contentWidth - 10);
    doc.text(splitDesc, margin + 8, y + 11);

    y += 19;
  });

  y += 4;

  // Section 2: Workload & Financial Valuation
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text("2. CALCUL DU CHARGE DE TRAVAIL & VALORISATION (4 INGÉNIEURS)", margin, y);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(1);
  doc.line(margin, y + 2, margin + 80, y + 2);

  y += 9;

  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  const scenarioText = "Le développement de la plateforme a mobilisé une équipe hautement qualifiée composée de 4 ingénieurs seniors pendant une durée continue de 2 mois (40 jours ouvrés), à raison de 7 heures par jour :";
  doc.text(scenarioText, margin, y);

  y += 7;

  // Table of Engineering Hours & Cost
  doc.autoTable({
    startY: y,
    head: [['Poste & Expertise Ingénierie', 'Ressources', 'Heures / Jour', 'Durée', 'Total Heures']],
    body: [
      ['Architecte Cloud & Backend DB', '1 Ingénieur', '7 heures', '40 jours (2 mois)', '280 Heures'],
      ['Développeur Frontend Web (React)', '1 Ingénieur', '7 heures', '40 jours (2 mois)', '280 Heures'],
      ['Développeur Mobile Android Native', '1 Ingénieur', '7 heures', '40 jours (2 mois)', '280 Heures'],
      ['Ingénieur QA & Business Rules Bardahl', '1 Ingénieur', '7 heures', '40 jours (2 mois)', '280 Heures'],
      ['CUMUL TOTAL DU CHARGE DE TRAVAIL', '4 Ingénieurs', '-', '2 Mois Continu', '1 120 HEURES']
    ],
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { textColor: TEXT_DARK, fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT_BG },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 8;

  // Financial Proposals Table
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text("GRILLE TARIFAIRE RECOMMANDÉE — OFFRE D'ACQUISITION", margin, y);

  y += 5;

  doc.autoTable({
    startY: y,
    head: [['Composante Financière', 'Description & Périmètre d\'Application', 'Montant HT (MAD)']],
    body: [
      [
        'Valeur Market Commerciale Fair\n(Cession Licence & Code Source)',
        'Cession intégrale de la propriété intellectuelle (Code Source Web React, App Mobile Android, Scripts Cloud API, Schemas de Base de Données). Usage illimité.',
        '280 000 DH HT'
      ],
      [
        'Frais d\'Installation & Cloud\n(Déploiement Initial)',
        'Configuration du serveur Cloud Enterprise, migration des données produits/clients, déploiement des bases de données SQL, paramétrage SSL & sécurité.',
        '35 000 DH HT'
      ],
      [
        'Frais de Maintenance & Support\n(Abonnement Mensuel)',
        'Support technique dédié 7j/7, maintenance préventive et corrective, sauvegarde quotidienne automatique des données Cloud, mises à jour mineures.',
        '10 000 DH HT / mois\n(120 000 DH HT / an)'
      ]
    ],
    theme: 'striped',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { textColor: TEXT_DARK, fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 85 },
      2: { cellWidth: 42, fontStyle: 'bold', halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  // --- PAGE 3: ARCHITECTURE TECHNIQUE & CLOUD ---
  doc.addPage();
  y = 20;

  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text("3. ARCHITECTURE TECHNIQUE & INFRASTRUCTURE CLOUD", margin, y);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(1);
  doc.line(margin, y + 2, margin + 85, y + 2);

  y += 9;

  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  const cloudText = doc.splitTextToSize(
    "Afin de garantir une indépendance totale, des performances élevées et une sécurité de niveau entreprise, l'infrastructure d'origine basée sur Supabase a été entièrement remplacée par une architecture Cloud REST/Relational Database propriétaire hautement évolutive.",
    contentWidth
  );
  doc.text(cloudText, margin, y);
  y += cloudText.length * 5 + 4;

  // Comparison Table: Supabase vs Enterprise Cloud
  doc.autoTable({
    startY: y,
    head: [['Critère Technique', 'Ancienne Solution (Supabase)', 'Nouvelle Architecture Cloud Enterprise']],
    body: [
      ['Hébergement & Stockage', 'Nuage mutualisé tiers limité', 'Serveur Cloud Enterprise Dédié (Souveraineté des données)'],
      ['Base de Données', 'PostgreSQL basique sans triggers métier', 'Base Relationale Optimisée avec Schemas Mouvements Stock & Audit Log'],
      ['API & Performance', 'Requêtes REST génériques', 'API Cloud Haute Performance REST/JSON avec caching des calculs promo'],
      ['Sécurité & RBAC', 'Règles RLS basiques', 'Authentification JWT sécurisée, chiffrement SSL/TLS, rôle ADMIN strict'],
      ['Synchronisation Android', 'Dépendance réseau constante', 'Mode hybride : Saisie fluide sur terrain & Sync Cloud automatique']
    ],
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { textColor: TEXT_DARK, fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 68 },
      2: { cellWidth: 74, fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 8;

  // Database Schemas & Data Model
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text("MODÈLE DE DONNÉES & TABLES CLÉ (DATABASE SCHEMAS)", margin, y);

  y += 6;

  const dbTables = [
    ["products", "ID, ref, designation, family, priceHT, packaging, unitsPerBox, stockQty, alertThreshold"],
    ["promotions", "ID, title, type (1-4), startDate, endDate, isPermanent, rules (paliers, remise, gifts, minCA)"],
    ["orders", "ID, orderNo, clientID, commercialID, status (En Attente, Validé, Livré, Annulé), items, totals"],
    ["stock_movements", "ID, orderID, productID, movementType (Vente, Cadeau, Restitution), qtyUnits, qtyBoxes, stockAfter"]
  ];

  dbTables.forEach(([tableName, fields]) => {
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');

    doc.setFontSize(8.5);
    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.text(`Table [ ${tableName} ]`, margin + 4, y + 5);

    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(`Champs : ${fields}`, margin + 4, y + 9.5);

    y += 14;
  });

  // --- PAGE 4: SPÉCIFICATIONS DES MODULES (PARTIE 1) ---
  doc.addPage();
  y = 20;

  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text("4. SPÉCIFICATIONS DÉTAILLÉES DES MODULES (WEB & ANDROID)", margin, y);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(1);
  doc.line(margin, y + 2, margin + 95, y + 2);

  y += 9;

  // Module 1 & 2
  const modulesPart1 = [
    {
      num: "MODULE 1",
      title: "Tableau de Bord & Business Intelligence",
      desc: "Vue d'ensemble stratégique récapitulant le Chiffre d'Affaires global, le volume de Bons de Commande du mois, le nombre de promotions actives et l'état des encours clients. Graphiques dynamiques et indicateurs de performance."
    },
    {
      num: "MODULE 2",
      title: "Catalogue Produits & Colisage Bardahl (unitsPerBox)",
      desc: "Gestion complète des 283 références du catalogue Bardahl classées par Familles officielles (Additifs, Moteur Auto, Industrie, etc.). Intégration du champ obligatoire colisage (ex: 6 un./carton, 12 un./carton, 24 un./carton) essentiel pour le calcul automatique des promotions."
    },
    {
      num: "MODULE 3",
      title: "Gestion des Clients & Plafonds de Crédit",
      desc: "Répertoire centralisé des clients avec affectation par Commercial, suivi des coordonnées, historique des commandes, solde débiteur et plafond de crédit autorisé avec avertissement en cas de dépassement."
    },
    {
      num: "MODULE 4",
      title: "Moteur de Promotions Commerciales complexes (4 Types)",
      desc: "Moteur hautement sophistiqué gérant 4 mécanismes :\n• Type 1 : Remise % par tranche de cartons\n• Type 2 : Remise % + Cadeau offert (même réf ou réf distincte)\n• Type 3 : Remise % + Bon d'Achat immédiat en DH TTC\n• Type 4 : Remise % sur CA Famille de Produits entière.\nInclus : Gestion du non-cumul strict lors des sauts de paliers, badges 'Permanente (sans date de fin)', et alerte '⚠️ Remise Manuelle'."
    }
  ];

  modulesPart1.forEach(mod => {
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

    doc.setFillColor(...NAVY);
    doc.roundedRect(margin + 3, y + 3, 22, 5, 1, 1, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(mod.num, margin + 5, y + 6.5);

    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text(mod.title, margin + 28, y + 6.5);

    doc.setFontSize(8);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'normal');
    const splitDesc = doc.splitTextToSize(mod.desc, contentWidth - 8);
    doc.text(splitDesc, margin + 4, y + 12);

    y += 27;
  });

  // --- PAGE 5: SPÉCIFICATIONS DES MODULES (PARTIE 2) ---
  doc.addPage();
  y = 20;

  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text("4. SPÉCIFICATIONS DES MODULES (SUITE & ANDROID)", margin, y);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(1);
  doc.line(margin, y + 2, margin + 90, y + 2);

  y += 9;

  const modulesPart2 = [
    {
      num: "MODULE 5",
      title: "Assistant Bon de Commande Wizard (- 132 +)",
      desc: "Saisie ergonomique avec sélecteur d'unités et pavé réactif cartons (- 132 +). Déclenchement automatique des offres, affichage du message 'Condition non atteinte...' avec le nombre de cartons manquants, valorisation des cadeaux à 0.00 DH, et affichage du stock disponible en temps réel."
    },
    {
      num: "MODULE 6",
      title: "Workflow de Validation & États des Bons",
      desc: "Circuits d'approbation sécurisés. Les Bons créés par les commerciaux passent au statut 'En Attente'. La Direction Bardahl valide ('Validé'), confirme la livraison ('Livré') ou annule ('Annulé'). L'annulation restitue automatiquement le stock d'articles et de cadeaux."
    },
    {
      num: "MODULE 7",
      title: "Mouvements de Stock & Inventaire (Direction Only)",
      desc: "Module réservé exclusivement à l'ADMIN. KPIs dynamiques (Stock initial, sorties ventes, sorties cadeaux 🎁, restitutions, stock restant), filtres multi-critères (par Offre Promo, Produit, Type de mouvement, Niveau d'alerte), et Journal Chronologique d'Audit complet."
    },
    {
      num: "MODULE 8",
      title: "Édition PDF Instantanée, PDF Groupé & Excel",
      desc: "Génération automatique des Bons en PDF. Option de sélection multiple pour générer un fichier PDF unique fusionné multi-pages ('Générer PDF Groupé (N)'). Exportation complète des mouvements de stock et commandes au format Excel (.xlsx)."
    },
    {
      num: "MODULE 9",
      title: "Application Mobile Android Native (Commercial Terrain)",
      desc: "Application dédiée aux commerciaux sur le terrain pour la saisie rapide des commandes chez les clients, consultation des fiches produits, visualisation des promotions actives, et génération de PDF même en mobilité."
    }
  ];

  modulesPart2.forEach(mod => {
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(margin, y, contentWidth, 23, 2, 2, 'FD');

    doc.setFillColor(...BLUE);
    doc.roundedRect(margin + 3, y + 3, 22, 5, 1, 1, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(mod.num, margin + 5, y + 6.5);

    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text(mod.title, margin + 28, y + 6.5);

    doc.setFontSize(8);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'normal');
    const splitDesc = doc.splitTextToSize(mod.desc, contentWidth - 8);
    doc.text(splitDesc, margin + 4, y + 12);

    y += 25;
  });

  // --- PAGE 6: GUIDE D'UTILISATION PAS À PAS ---
  doc.addPage();
  y = 20;

  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text("5. GUIDE D'UTILISATION PAS À PAS (MODE D'EMPLOI)", margin, y);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(1);
  doc.line(margin, y + 2, margin + 85, y + 2);

  y += 9;

  // Guide Commercial
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.setFont('helvetica', 'bold');
  doc.text("A. Guide pour le Commercial sur Terrain (Web & Android)", margin, y);

  y += 6;

  const stepsComm = [
    "1. Connexion : Saisir ses identifiants commerciaux sur l'application Web ou Android.",
    "2. Sélection du Client : Choisir le client dans la liste et vérifier son encours / crédit.",
    "3. Saisie des Articles : Saisir la quantité en unités ou cliquer sur les boutons cartons (+ 1 carton).",
    "4. Application de la Promo : Le système applique automatiquement le meilleur palier et affiche les cadeaux.",
    "5. Enregistrement : Cliquer sur 'Valider et Générer PDF'. Le Bon est enregistré avec le statut 'En Attente'."
  ];

  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  stepsComm.forEach(step => {
    doc.text(step, margin + 4, y);
    y += 5.5;
  });

  y += 6;

  // Guide Direction
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text("B. Guide pour la Direction Bardahl (Administration & Validations)", margin, y);

  y += 6;

  const stepsAdmin = [
    "1. Validation des Bons : Accéder à 'Bons de Commande', filtrer par 'En Attente', et cliquer sur 'Validé'.",
    "2. Suivi du Stock : Accéder au module 'Mouvements de Stock' pour consulter le stock disponible et les cadeaux offerts.",
    "3. Gestion des Promotions : Créer ou modifier les offres (Paliers, % Remise, Cadeaux, Sans date de fin).",
    "4. Édition PDF Groupée : Cocher plusieurs Bons et cliquer sur '📄 Générer PDF Groupé' pour imprimer en masse.",
    "5. Exports Analytics : Télécharger les rapports de mouvements de stock sous format Excel (.xlsx) ou PDF."
  ];

  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  stepsAdmin.forEach(step => {
    doc.text(step, margin + 4, y);
    y += 5.5;
  });

  // --- PAGE 7: STRATÉGIE MARKETING & RECOMMANDATIONS ---
  doc.addPage();
  y = 20;

  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text("6. RECOMMANDATIONS FINALES & STRATÉGIE COMMERCIALE", margin, y);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(1);
  doc.line(margin, y + 2, margin + 95, y + 2);

  y += 9;

  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  const recoIntro = doc.splitTextToSize(
    "Pour maximiser la valeur perçue lors des négociations avec la Direction Générale de Bardahl Maroc, nous recommandons de présenter cette offre selon les 3 axes stratégiques suivants :",
    contentWidth
  );
  doc.text(recoIntro, margin, y);

  y += recoIntro.length * 5 + 4;

  const strats = [
    [
      "Option 1 : Vente Ferme de la Licence & Code Source (Achat Intégral)",
      "Prix recommandé : 280 000 DH HT (+ 35 000 DH installation Cloud).\nOffre le contrôle total à Bardahl sans redevance logicielle future. Inclut 3 mois de garantie absolue."
    ],
    [
      "Option 2 : Formule Abonnement SaaS Enterprise (OPEX)",
      "Prix recommandé : 50 000 DH HT (Setup & Déploiement) + 10 000 DH HT / mois (Maintenance & Cloud).\nRéduit l'investissement initial de Bardahl et garantit un accompagnement continu 7j/7."
    ],
    [
      "Argument ROI Majeur pour Bardahl",
      "Le système évite plus de 150 000 DH de pertes annuelles dues aux erreurs de calcul manuel des promotions et aux fuites de stock de cadeaux offerts."
    ]
  ];

  strats.forEach(([stTitle, stDesc]) => {
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

    doc.setFontSize(9.5);
    doc.setTextColor(...AMBER);
    doc.setFont('helvetica', 'bold');
    doc.text(`★  ${stTitle}`, margin + 4, y + 6);

    doc.setFontSize(8);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'normal');
    const splitD = doc.splitTextToSize(stDesc, contentWidth - 10);
    doc.text(splitD, margin + 8, y + 11);

    y += 26;
  });

  y += 10;

  // Final Sign-off Box
  doc.setFillColor(...NAVY);
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text("ÉQUIPE D'INGÉNIERIE PROJET — BARDAHL MAROC", margin + 6, y + 10);

  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.text("Document établi en 4 exemplaires originaux. Tous droits réservés 2026.", margin + 6, y + 17);
  doc.text("Contact Technique & Commercial : Direction Projet Solutions Cloud & Mobile", margin + 6, y + 22);

  // Apply Headers and Footers to all pages
  addHeaderFooter(doc);

  // Save PDF to workspace
  const outputPath = 'c:/Users/SFT/Desktop/bardahl/Offre_Commerciale_et_Evaluation_Bardahl_Maroc.pdf';
  const pdfBytes = doc.output('arraybuffer');
  fs.writeFileSync(outputPath, Buffer.from(pdfBytes));

  console.log(`PDF Document created successfully at: ${outputPath}`);
}

createProposalPdf().catch(err => {
  console.error("Error creating PDF:", err);
});
