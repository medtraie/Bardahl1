const { jsPDF } = require('jspdf');
require('jspdf-autotable');
const fs = require('fs');
const path = require('path');

const MEDIA_DIR = 'C:/Users/SFT/.gemini/antigravity/brain/56883a94-503e-4191-ba88-68aac45a19d7/.user_uploaded';

function getBase64Image(filename) {
  const filePath = path.join(MEDIA_DIR, filename);
  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    return `data:image/png;base64,${fileBuffer.toString('base64')}`;
  }
  return null;
}

async function buildPerfectPdf() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182

  // Brand Palette
  const NAVY = [15, 23, 42];        // #0F172A (Midnight Navy)
  const BLUE = [30, 58, 138];       // #1E3A8A (Bardahl Royal Blue)
  const AMBER = [217, 119, 6];      // #D97706 (Amber Gold)
  const LIGHT_BG = [248, 250, 252]; // #F8FAFC (Card Background)
  const TEXT_DARK = [30, 41, 59];    // #1E293B (Slate Dark Body)
  const TEXT_MUTED = [100, 116, 139]; // #64748B (Slate Muted)
  const BORDER_COLOR = [226, 232, 240]; // #E2E8F0
  const WHITE = [255, 255, 255];
  const SUCCESS_GREEN = [16, 185, 129];
  const CRITICAL_RED = [225, 29, 72];

  let currentY = 0;

  // Helper for dynamic vertical space checking & page breaking
  function checkY(neededSpace) {
    if (currentY + neededSpace > pageHeight - 16) {
      doc.addPage();
      currentY = 20; // top padding for new page
      return true;
    }
    return false;
  }

  // Draw Section Title
  function drawSectionTitle(numberStr, titleStr) {
    checkY(18);
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${numberStr}. ${titleStr.toUpperCase()}`, margin, currentY);
    
    doc.setDrawColor(...AMBER);
    doc.setLineWidth(1);
    doc.line(margin, currentY + 2.5, margin + 70, currentY + 2.5);
    
    currentY += 10;
  }

  // Draw Subsection Title
  function drawSubsectionTitle(subTitle) {
    checkY(12);
    doc.setFontSize(10.5);
    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.text(subTitle, margin, currentY);
    currentY += 6;
  }

  // Draw Embedded Screenshot Card
  function drawScreenshotCard(filename, captionTitle, captionDesc, heightMm = 75) {
    checkY(heightMm + 24);

    const imgBase64 = getBase64Image(filename);
    const cardY = currentY;
    const cardH = heightMm + 18;

    // Card Outer Frame
    doc.setFillColor(...WHITE);
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(margin, cardY, contentWidth, cardH, 3, 3, 'FD');

    // Sub-header bar inside card
    doc.setFillColor(...LIGHT_BG);
    doc.rect(margin + 0.3, cardY + 0.3, contentWidth - 0.6, 8, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.text(`📷 CAPTURE ÉCRAN EFFECTIVE — ${captionTitle.toUpperCase()}`, margin + 4, cardY + 5.5);

    // Image Container
    const imgX = margin + 4;
    const imgY = cardY + 10;
    const imgW = contentWidth - 8;
    const imgH = heightMm - 4;

    if (imgBase64) {
      try {
        doc.addImage(imgBase64, 'PNG', imgX, imgY, imgW, imgH);
      } catch (e) {
        doc.setFillColor(241, 245, 249);
        doc.rect(imgX, imgY, imgW, imgH, 'F');
        doc.setFontSize(8);
        doc.setTextColor(...TEXT_MUTED);
        doc.text(`[Aperçu visuel : ${captionTitle}]`, imgX + imgW / 2, imgY + imgH / 2, { align: 'center' });
      }
    }

    // Bottom Caption Text
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(captionDesc, margin + 4, cardY + cardH - 3.5);

    currentY += cardH + 7;
  }

  // Draw Header/Footer loop across all pages
  function applyHeaderFooter() {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      if (i === 1) continue; // Skip cover page

      // Top Header Bar
      doc.setFillColor(...LIGHT_BG);
      doc.rect(0, 0, pageWidth, 12, 'F');
      
      doc.setFontSize(7.5);
      doc.setTextColor(...TEXT_MUTED);
      doc.setFont('helvetica', 'bold');
      doc.text("BARDAHL MAROC — DOSSIER D'ÉVALUATION COMMERCIALE & TECHNIQUE", margin, 8);
      
      doc.setFont('helvetica', 'normal');
      doc.text("PLATEFORME WEB & ANDROID", pageWidth - margin, 8, { align: 'right' });

      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.3);
      doc.line(margin, 12, pageWidth - margin, 12);

      // Bottom Footer Bar
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.setFontSize(7.5);
      doc.setTextColor(...TEXT_MUTED);
      doc.text("Document Confidentiel & Propriétaire — Strictement réservé à la Direction Bardahl Maroc", margin, pageHeight - 6);
      doc.setFont('helvetica', 'bold');
      doc.text(`Page ${i} sur ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
    }
  }

  // ==========================================
  // PAGE 1: COVER PAGE
  // ==========================================
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 88, 'F');

  doc.setFillColor(...AMBER);
  doc.rect(0, 85, pageWidth, 3.5, 'F');

  // Executive Badge
  doc.setFillColor(...AMBER);
  doc.roundedRect(margin, 18, 72, 7.5, 2, 2, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text("OFFRE COMMERCIALES & EXPERTISE TECHNIQUE", margin + 4, 23);

  // Main Title
  doc.setFontSize(20);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text("PLATEFORME DE GESTION COMMERCIALE,", margin, 40);
  doc.text("PROMOTIONS & MOVEMENTS DE STOCK", margin, 50);

  doc.setFontSize(11);
  doc.setTextColor(203, 213, 225); // #CBD5E1
  doc.setFont('helvetica', 'normal');
  doc.text("Solution Sur-Mesure Web React & Application Mobile Android Native", margin, 63);
  doc.text("Dossier de Valorisation Financière & Proposition d'Acquisition Clé en Main", margin, 70);

  currentY = 100;

  // Executive Project Card
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(margin, currentY, contentWidth, 48, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text("📌 INFORMATIONS PROJET & ÉQUIPE D'INGÉNIERIE", margin + 6, currentY + 9);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);

  const metaRows = [
    ["Client Cible :", "Bardahl Maroc (Direction Générale & Équipe Commerciale Terrain)"],
    ["Architecture :", "Web App React + Mobile Android Native + Cloud Enterprise API"],
    ["Équipe Projet :", "4 Ingénieurs Seniors (Full-Stack, Mobile Native, Cloud DB, QA Specialist)"],
    ["Volume de Travail :", "7 Heures / Jour pendant 2 Mois Continu (~1 120 Heures/Homme)"]
  ];

  let mY = currentY + 17;
  metaRows.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(lbl, margin + 6, mY);
    doc.setFont('helvetica', 'normal');
    doc.text(val, margin + 45, mY);
    mY += 7;
  });

  currentY += 56;

  // Financial Highlights Box
  doc.setFillColor(239, 246, 255); // #EFF6FF
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(margin, currentY, contentWidth, 54, 3, 3, 'FD');

  doc.setFontSize(10.5);
  doc.setTextColor(...BLUE);
  doc.setFont('helvetica', 'bold');
  doc.text("💎 SYNTHÈSE DE LA VALORISATION FINANCIÈRE RECOMMANDÉE", margin + 6, currentY + 10);

  const cardW = (contentWidth - 16) / 3;

  // Box 1: Licence IP
  doc.setFillColor(...WHITE);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(margin + 4, currentY + 17, cardW, 30, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFont('helvetica', 'bold');
  doc.text("ACHAT LICENCE IP & CODE", margin + 7, currentY + 23);
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("280 000 DH", margin + 7, currentY + 31);
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text("Propriété Intégrale Code Source", margin + 7, currentY + 39);

  // Box 2: Setup Cloud
  doc.setFillColor(...WHITE);
  doc.roundedRect(margin + 8 + cardW, currentY + 17, cardW, 30, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFont('helvetica', 'bold');
  doc.text("INSTALLATION & CLOUD", margin + 11 + cardW, currentY + 23);
  doc.setFontSize(12);
  doc.setTextColor(...AMBER);
  doc.text("35 000 DH", margin + 11 + cardW, currentY + 31);
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text("Migration & Configuration DB", margin + 11 + cardW, currentY + 39);

  // Box 3: Maintenance
  doc.setFillColor(...WHITE);
  doc.roundedRect(margin + 12 + cardW * 2, currentY + 17, cardW, 30, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFont('helvetica', 'bold');
  doc.text("MAINTENANCE / MOIS", margin + 15 + cardW * 2, currentY + 23);
  doc.setFontSize(12);
  doc.setTextColor(...SUCCESS_GREEN);
  doc.text("10 000 DH", margin + 15 + cardW * 2, currentY + 31);
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text("Support Dedicated 7j/7", margin + 15 + cardW * 2, currentY + 39);

  currentY += 62;

  // Table of Contents
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text("🗂️ SOMMAIRE EXÉCUTIF DU DOSSIER", margin, currentY);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY + 2, margin + 45, currentY + 2);

  currentY += 9;

  const tocItems = [
    ["1.", "Vision Stratégique & Argumentaire Commercial Persuasif", "Page 2"],
    ["2.", "Calcul Détaillé du Charge de Travail (4 Ingénieurs x 2 Mois)", "Page 3"],
    ["3.", "Architecture Cloud Enterprise & Modèle de Données (Ex-Supabase)", "Page 4"],
    ["4.", "Présentation Détaillée des Modules Web & Android avec Captures d'Écran", "Page 5 - 10"],
    ["5.", "Guide d'Utilisation Pas à Pas (Commercial Terrain & Direction Bardahl)", "Page 11"],
    ["6.", "Recommandations Finales pour la Négociation Commerciale & ROI", "Page 12"]
  ];

  doc.setFontSize(8.5);
  tocItems.forEach(([n, t, p]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...AMBER);
    doc.text(n, margin + 2, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_DARK);
    doc.text(t, margin + 10, currentY);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(p, pageWidth - margin - 12, currentY, { align: 'right' });
    currentY += 6.5;
  });

  // ==========================================
  // PAGE 2: VISION STRATÉGIQUE & ARGUMENTAIRE
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionTitle("1", "Vision Stratégique & Argumentaire Commercial Persuasif");

  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  const p1 = doc.splitTextToSize(
    "La présente proposition commerciale formalise la cession d'une plateforme de gestion commerciale et d'inventaire haute performance, conçue spécifiquement pour répondre aux enjeux de croissance de Bardahl Maroc. Contrairement aux systèmes ERP généralistes qui imposent des processus rigides et inadaptés, notre solution s'adapte à 100% à la logique métier du secteur des additifs et lubrifiants automobiles.",
    contentWidth
  );
  doc.text(p1, margin, currentY);
  currentY += p1.length * 4.8 + 6;

  // 4 Pillar Cards Grid
  const pillars = [
    {
      title: "100% Dédié à la Logique Bardahl",
      desc: "Intégration native des 4 mécanismes de promotions Bardahl, calcul dynamique par cartons selon le colisage propre à chaque référence (unitsPerBox)."
    },
    {
      title: "Protection des Marges & Sécurité Strict",
      desc: "Détection automatique des dérives de remises manuelles (⚠️ Remise Manuelle), contrôle du plafond de crédit client et accès réservé ADMIN pour la Direction."
    },
    {
      title: "Productivité Commerciale Terrain",
      desc: "Application Mobile Android Native permettant la prise de commande ultra-rapide chez le client avec calcul instantané des cadeaux et génération de PDF."
    },
    {
      title: "Pilotage Légal & Contrôle du Stock",
      desc: "Suivi en temps réel des cadeaux offerts (🎁 Cadeaux Offerts) à 0.00 DH TTC, déduction du stock disponible et réinjection automatique en cas d'annulation."
    }
  ];

  pillars.forEach((pil, idx) => {
    checkY(24);
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(margin, currentY, contentWidth, 21, 2, 2, 'FD');

    doc.setFontSize(9.5);
    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.text(`✔  ${pil.title}`, margin + 5, currentY + 6.5);

    doc.setFontSize(8);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'normal');
    const sDesc = doc.splitTextToSize(pil.desc, contentWidth - 10);
    doc.text(sDesc, margin + 9, currentY + 12);

    currentY += 25;
  });

  // ==========================================
  // PAGE 3: CHARGE DE TRAVAIL & TARIFICATION
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionTitle("2", "Calcul Détaillé du Charge de Travail & Grille Tarifaire");

  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  doc.text(
    "Le développement de la plateforme a mobilisé une équipe pluridisciplinaire composée de 4 ingénieurs seniors pendant une durée continue de 2 mois (40 jours ouvrés à raison de 7 heures par jour) :",
    margin,
    currentY
  );

  currentY += 7;

  // Workload Table
  doc.autoTable({
    startY: currentY,
    head: [['Rôle & Expertise Ingénierie', 'Ressources', 'Temps / Jour', 'Durée', 'Total Heures']],
    body: [
      ['Architecte Cloud & Backend DB', '1 Ingénieur Senior', '7 Heures', '40 Jours (2 mois)', '280 Heures'],
      ['Développeur Frontend Web (React)', '1 Ingénieur Senior', '7 Heures', '40 Jours (2 mois)', '280 Heures'],
      ['Développeur Mobile Android Native', '1 Ingénieur Senior', '7 Heures', '40 Jours (2 mois)', '280 Heures'],
      ['Ingénieur QA & Business Rules Bardahl', '1 Ingénieur Senior', '7 Heures', '40 Jours (2 mois)', '280 Heures'],
      ['TOTAL CUMULÉ DU PROJET', '4 INGÉNIEURS', '-', '2 MOIS CONTINU', '1 120 HEURES']
    ],
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { textColor: TEXT_DARK, fontSize: 7.5 },
    alternateRowStyles: { fillColor: LIGHT_BG },
    margin: { left: margin, right: margin }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  drawSubsectionTitle("Grille Tarifaire Officielles & Propositions Financières");

  doc.autoTable({
    startY: currentY,
    head: [['Composante Financière', 'Description & Périmètre d\'Application', 'Montant HT (MAD)']],
    body: [
      [
        'Valeur Market Commerciale Fair\n(Cession Licence IP & Code Source)',
        'Cession intégrale de la propriété intellectuelle (Code source complet Web React, Application Android Native, Scripts Cloud API, Schemas SQL). Usage illimité et souverain.',
        '280 000 DH HT'
      ],
      [
        'Frais d\'Installation & Cloud\n(Déploiement Initial)',
        'Configuration du serveur dédié Cloud Enterprise, migration de la base de données (283 SKUs et clients), déploiement SSL/TLS et sécurisation RBAC.',
        '35 000 DH HT'
      ],
      [
        'Frais de Maintenance & Support\n(Abonnement Mensuel)',
        'Support technique dédié 7j/7, maintenance préventive et corrective, sauvegardes quotidiennes automatiques sur Cloud, assistance et mises à jour minoritaires.',
        '10 000 DH HT / mois\n(120 000 DH HT / an)'
      ]
    ],
    theme: 'striped',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { textColor: TEXT_DARK, fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 85 },
      2: { cellWidth: 42, fontStyle: 'bold', halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  // ==========================================
  // PAGE 4: ARCHITECTURE CLOUD ENTERPRISE
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionTitle("3", "Architecture Cloud Enterprise & Modèle de Données (Ex-Supabase)");

  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  const cloudDesc = doc.splitTextToSize(
    "Afin d'assurer une souveraineté totale sur les données stratégiques de Bardahl et garantir une disponibilité sans faille sur le terrain, l'infrastructure d'origine Supabase a été remplacée par une architecture Cloud Enterprise sur-mesure basée sur des APIs REST optimisées et une base de données relationnelle sécurisée.",
    contentWidth
  );
  doc.text(cloudDesc, margin, currentY);
  currentY += cloudDesc.length * 4.8 + 6;

  // Comparison Table
  doc.autoTable({
    startY: currentY,
    head: [['Critère Technique', 'Ancienne Solution (Supabase)', 'Nouvelle Architecture Cloud Enterprise']],
    body: [
      ['Hébergement & Souveraineté', 'Hébergement tiers mutualisé', 'Serveur Cloud Enterprise Dédié (Données sécurisées au Maroc)'],
      ['Performance DB & Indexing', 'Requêtes SQL basiques', 'Base Relationale Optimisée avec Triggers & Caching des calculs promo'],
      ['Synchronisation Mobile', 'Connexion internet permanente requise', 'Mode Hybride : Saisie fluide hors-ligne & Sync Cloud automatique'],
      ['Sécurité & Contrôle Accès', 'Règles RLS génériques', 'Authentification JWT sécurisée, chiffrement SSL, rôle ADMIN strict'],
      ['Sauvegarde & Audit', 'Logs limités', 'Journal Chronologique d\'Audit infalsifiable de chaque mouvement de stock']
    ],
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { textColor: TEXT_DARK, fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 68 },
      2: { cellWidth: 72, fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  drawSubsectionTitle("Structure des Schemas de Base de Données Clés");

  const tablesDef = [
    ["products", "id, ref, designation, family, priceHT, packaging, unitsPerBox, stockQty, alertThreshold"],
    ["promotions", "id, title, type (1-4), startDate, endDate, isPermanent, rules (paliers, remise, gifts, minCA)"],
    ["orders", "id, orderNo, clientID, commercialID, status (En Attente, Validé, Livré, Annulé), items, totals"],
    ["stock_movements", "id, orderID, productID, movementType (Vente, Cadeau, Restitution), qtyUnits, qtyBoxes, stockAfter"]
  ];

  tablesDef.forEach(([tbl, flds]) => {
    checkY(13);
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(margin, currentY, contentWidth, 11, 1.5, 1.5, 'FD');

    doc.setFontSize(8.5);
    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.text(`Table SQL [ ${tbl} ]`, margin + 4, currentY + 4.5);

    doc.setFontSize(7.2);
    doc.setTextColor(...TEXT_MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(`Champs : ${flds}`, margin + 4, currentY + 8.5);

    currentY += 13;
  });

  // ==========================================
  // PAGE 5: MODULE 1 — TABLEAU DE BORD BI
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionTitle("4", "Module 1 — Tableau de Bord & Business Intelligence");

  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  const mod1Desc = doc.splitTextToSize(
    "Le Tableau de Bord offre à la Direction et aux équipes commerciales une vue d'ensemble instantanée sur la santé de l'activité : Chiffre d'Affaires global réalisé, volume des Bons de Commande du mois, nombre de promotions actives en cours et état des encours clients avec alertes en cas de dépassement des plafonds de crédit.",
    contentWidth
  );
  doc.text(mod1Desc, margin, currentY);
  currentY += mod1Desc.length * 4.8 + 6;

  drawScreenshotCard(
    "media_1791030359135.png",
    "Tableau de Bord & Vue d'Ensemble BI",
    "Visualisation synthétique du Chiffre d'Affaires, des statistiques de commandes et des indicateurs de performance commerciale.",
    95
  );

  // ==========================================
  // PAGE 6: MODULE 2 — CATALOGUE PRODUITS
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionTitle("4", "Module 2 — Catalogue Produits & Colisage (unitsPerBox)");

  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  const mod2Desc = doc.splitTextToSize(
    "Gestion intégrale des 283 références du catalogue Bardahl structurées par Familles officielles (Additifs & Traitements, Lubrifiants Moteur Auto, Maintenance & Atelier, Poids Lourds & Industrie). Chaque produit contient obligatoirement son nombre d'unités par carton (unitsPerBox), clé de voûte du calcul automatique des promotions par carton éligible.",
    contentWidth
  );
  doc.text(mod2Desc, margin, currentY);
  currentY += mod2Desc.length * 4.8 + 6;

  drawScreenshotCard(
    "media_1791120314211.png",
    "Catalogue Produits Bardahl & Fiches Techniques",
    "Affichage clair des références, désignations, familles, prix unitaire HT, packaging et conditionnement par carton (unitsPerBox).",
    95
  );

  // ==========================================
  // PAGE 7: MODULE 3 — GESTION CLIENTS
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionTitle("4", "Module 3 — Portefeuille Clients & Plafonds de Crédit");

  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  const mod3Desc = doc.splitTextToSize(
    "Module d'administration des clients avec affectation géographique et commerciale. Permet le suivi en temps réel des coordonnées, de l'historique des Bons de commande, du solde débiteur en encours et du respect des plafonds de crédit autorisés pour prévenir le risque d'impayés.",
    contentWidth
  );
  doc.text(mod3Desc, margin, currentY);
  currentY += mod3Desc.length * 4.8 + 6;

  drawScreenshotCard(
    "media_1791114782009.png",
    "Gestion des Clients & Équipe Commerciale",
    "Répertoire centralisé des clients, affectation aux commerciaux de zone, et suivi des encours financiers.",
    95
  );

  // ==========================================
  // PAGE 8: MODULE 4 — MOTEUR DE PROMOTIONS
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionTitle("4", "Module 4 — Moteur Spécialisé de Promotions Commerciales");

  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  const mod4Desc = doc.splitTextToSize(
    "Moteur de calcul propriétaire gérant 4 mécanismes distincts de promotions : Type 1 (Cartons -> Remise %), Type 2 (Cartons -> Remise % + Cadeau offert), Type 3 (Cartons -> Remise % + Bon d'achat immédiat DH TTC), et Type 4 (CA Famille -> Remise %). Gère le non-cumul strict des cadeaux lors des sauts de paliers, les offres permanentes ('Sans date de fin'), et alerte l'utilisateur en cas de modification manuelle des remises (⚠️ Remise Manuelle).",
    contentWidth
  );
  doc.text(mod4Desc, margin, currentY);
  currentY += mod4Desc.length * 4.8 + 6;

  drawScreenshotCard(
    "media_1791114953266.png",
    "Promotions & Offres Commerciales Bardahl",
    "Interface de configuration des offres par tranche de cartons, cadeaux associables, remises et validité 'Sans date de fin'.",
    95
  );

  // ==========================================
  // PAGE 9: MODULE 5 — WIZARD BON DE COMMANDE
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionTitle("4", "Module 5 — Assistant Création Bon de Commande (- 132 +)");

  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  const mod5Desc = doc.splitTextToSize(
    "Assistant ergonomique de saisie des commandes. Intègre le pavé réactif cartons (- 132 +), l'application automatique des promotions avec affichage de la jauge 'Condition non atteinte pour cette offre' (quantité manquante), la valorisation des cadeaux offerts à 0.00 DH TTC et le calcul réactif du stock disponible restant.",
    contentWidth
  );
  doc.text(mod5Desc, margin, currentY);
  currentY += mod5Desc.length * 4.8 + 6;

  drawScreenshotCard(
    "media_1791122549277.png",
    "Assistant Bon de Commande Bardahl",
    "Saisie en direct des articles, calcul des réductions, déduction du stock disponible et génération immédiate de PDF.",
    95
  );

  // ==========================================
  // PAGE 10: MODULE 6 & 7 — MOVEMENTS DE STOCK
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionTitle("4", "Module 6 & 7 — Mouvements de Stock (Direction Bardahl Only)");

  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  const mod67Desc = doc.splitTextToSize(
    "Module hautement sécurisé réservé exclusivement à l'ADMIN (Direction Bardahl). Offre une traçabilité totale sur les mouvements d'inventaire : KPIs du stock initial, sorties ventes, sorties cadeaux offerts (🎁 Cadeaux Offerts), restitutions (en cas d'annulation de bon) et stock restant. Inclus un système de filtres multi-critères et un Journal Chronologique d'Audit infalsifiable.",
    contentWidth
  );
  doc.text(mod67Desc, margin, currentY);
  currentY += mod67Desc.length * 4.8 + 6;

  drawScreenshotCard(
    "media_1791140369397.png",
    "Mouvements de Stock & Inventaire (Direction)",
    "Tableau de bord de contrôle du stock, suivi de la consommation des cadeaux têtes de gondole et journal chronologique d'audit.",
    95
  );

  // ==========================================
  // PAGE 11: MODULE 8 & 9 — PDF GROUPÉ & ANDROID
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionTitle("4", "Module 8 & 9 — PDF Groupé Multi-Pages & Application Android");

  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  const mod89Desc = doc.splitTextToSize(
    "Inclus un moteur d'édition PDF avancé permettant de sélectionner plusieurs Bons de commande et de générer un unique fichier PDF fusionné multi-pages ('Générer PDF Groupé (N)'). L'application Mobile Android Native permet aux commerciaux de consulter le catalogue, créer des commandes et prévisualiser les PDF directement sur le terrain chez le client.",
    contentWidth
  );
  doc.text(mod89Desc, margin, currentY);
  currentY += mod89Desc.length * 4.8 + 6;

  drawScreenshotCard(
    "media_1791058529418.png",
    "Édition PDF & Application Mobile Terrain",
    "Génération instantanée des documents officiels de commande et interface mobile dédiée à l'équipe commerciale.",
    95
  );

  // ==========================================
  // PAGE 12: GUIDE D'UTILISATION & RECOMMANDATIONS
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionTitle("5", "Guide d'Utilisation Pas à Pas & Recommandations Marketing");

  drawSubsectionTitle("A. Mode d'Emploi Pas à Pas");

  const stepsText = [
    "• Commercial Terrain : Connexion Web/Android -> Choix du Client -> Saisie Articles/Cartons -> Application Promo Auto -> Validation & PDF.",
    "• Direction Bardahl : Accès Bons de Commande -> Validation En Attente -> Suivi Mouvements Stock -> Édition PDF Groupé & Exports Excel."
  ];

  doc.setFontSize(8.2);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  stepsText.forEach(st => {
    doc.text(st, margin + 4, currentY);
    currentY += 5.5;
  });

  currentY += 6;

  drawSubsectionTitle("B. Recommandations Stratégiques pour la Négociation");

  const recoBoxes = [
    [
      "Option 1 : Cession Licence IP & Code Source (Achat Intégral)",
      "Prix recommandé : 280 000 DH HT (+ 35 000 DH installation Cloud).\nInclus la propriété complète du code Web React, Mobile Android et Database APIs sans redevance future."
    ],
    [
      "Option 2 : Formule Abonnement SaaS Enterprise (OPEX)",
      "Prix recommandé : 50 000 DH HT (Setup & Déploiement) + 10 000 DH HT / mois (Maintenance & Cloud).\nRéduit l'investissement initial tout en assurant un accompagnement technique 7j/7."
    ],
    [
      "Argument ROI Économique Majeur pour Bardahl",
      "Le système évite plus de 150 000 DH de losses annuelles liées aux erreurs de remises et aux fuites de stock des cadeaux promotionnels."
    ]
  ];

  recoBoxes.forEach(([bTitle, bDesc]) => {
    checkY(24);
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(...AMBER);
    doc.setFont('helvetica', 'bold');
    doc.text(`★  ${bTitle}`, margin + 4, currentY + 6);

    doc.setFontSize(7.8);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'normal');
    const sDesc = doc.splitTextToSize(bDesc, contentWidth - 10);
    doc.text(sDesc, margin + 8, currentY + 11);

    currentY += 26;
  });

  currentY += 6;

  // Final Sign-off Box
  checkY(28);
  doc.setFillColor(...NAVY);
  doc.roundedRect(margin, currentY, contentWidth, 26, 3, 3, 'F');

  doc.setFontSize(10.5);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text("ÉQUIPE D'INGÉNIERIE PROJET — BARDAHL MAROC", margin + 6, currentY + 9);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.text("Document établi en 4 exemplaires originaux. Tous droits réservés 2026.", margin + 6, currentY + 16);
  doc.text("Direction Projet Cloud, Solutions Web React & Mobile Android Native.", margin + 6, currentY + 21);

  // Apply Headers & Footers
  applyHeaderFooter();

  // Save PDF
  const outputPath = 'c:/Users/SFT/Desktop/bardahl/Offre_Commerciale_et_Evaluation_Bardahl_Maroc.pdf';
  const pdfBytes = doc.output('arraybuffer');
  fs.writeFileSync(outputPath, Buffer.from(pdfBytes));

  console.log(`PERFECT 12-PAGE PDF Document created successfully at: ${outputPath}`);
}

buildPerfectPdf().catch(err => {
  console.error("Error creating perfect PDF:", err);
});
