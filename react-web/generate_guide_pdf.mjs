import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import fs from 'fs';
import path from 'path';
import { BARDAHL_LOGO_BASE64 } from './src/utils/logoBase64.js';

function cleanText(txt) {
  if (!txt) return '';
  return txt
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/•/g, '-');
}

console.log("Generating Official Bardahl French Operational Guide PDF...");

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

const pageWidth = 210;
const pageHeight = 297;
const margin = 14;
const contentWidth = pageWidth - (margin * 2);

// Color Palette
const COLOR_YELLOW = [255, 208, 0];
const COLOR_DARK = [26, 29, 32];
const COLOR_MUTED = [100, 116, 139];
const COLOR_LIGHT_BG = [248, 250, 252];
const COLOR_BORDER = [226, 232, 240];
const COLOR_BLUE = [30, 64, 175];
const COLOR_GREEN = [22, 163, 74];
const COLOR_ORANGE = [217, 119, 6];

function drawSectionBanner(title, subtitle, yPos) {
  doc.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.roundedRect(margin, yPos, contentWidth, 16, 2, 2, 'F');
  doc.setFillColor(COLOR_YELLOW[0], COLOR_YELLOW[1], COLOR_YELLOW[2]);
  doc.rect(margin, yPos, 4, 16, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 208, 0);
  doc.text(cleanText(title), margin + 8, yPos + 6.5);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(240, 240, 240);
    doc.text(cleanText(subtitle), margin + 8, yPos + 12);
  }
  return yPos + 21;
}

function drawCallout(title, textLines, yPos, type = 'info') {
  let boxColor = COLOR_LIGHT_BG;
  let borderColor = COLOR_BLUE;
  let titleColor = COLOR_BLUE;

  if (type === 'success') {
    borderColor = COLOR_GREEN;
    titleColor = COLOR_GREEN;
  } else if (type === 'warning') {
    borderColor = COLOR_ORANGE;
    titleColor = COLOR_ORANGE;
  }

  const padding = 4;
  const height = 10 + (textLines.length * 4.5);

  doc.setFillColor(boxColor[0], boxColor[1], boxColor[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, yPos, contentWidth, height, 1.5, 1.5, 'FD');

  doc.setFillColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.rect(margin, yPos, 3, height, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
  doc.text(cleanText(title), margin + 6, yPos + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 60, 70);
  let curY = yPos + 10.5;
  for (const line of textLines) {
    doc.text(cleanText(line), margin + 6, curY);
    curY += 4.5;
  }

  return yPos + height + 4;
}

// ==========================================
// PAGE 1: COUVERTURE & PRESENTATION OFFICIELLE
// ==========================================
// Top Yellow Accent Band
doc.setFillColor(COLOR_YELLOW[0], COLOR_YELLOW[1], COLOR_YELLOW[2]);
doc.rect(0, 0, pageWidth, 8, 'F');

// Official Bardahl Logo
try {
  doc.addImage(BARDAHL_LOGO_BASE64, 'PNG', margin, 18, 55, 33);
} catch (e) {
  console.log("Logo rendering note:", e.message);
}

doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
doc.text("SADAPS BARDAHL MAROC", pageWidth - margin, 24, { align: 'right' });
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
doc.text("Direction Commerciale & Developpement des Ventes", pageWidth - margin, 29, { align: 'right' });
doc.text("Systeme Integre de Gestion des Commandes & Promotions", pageWidth - margin, 34, { align: 'right' });

// Hero Title Box
doc.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
doc.roundedRect(margin, 60, contentWidth, 52, 3, 3, 'F');
doc.setFillColor(COLOR_YELLOW[0], COLOR_YELLOW[1], COLOR_YELLOW[2]);
doc.rect(margin, 60, 6, 52, 'F');

doc.setFont('helvetica', 'bold');
doc.setFontSize(22);
doc.setTextColor(255, 208, 0);
doc.text("MANUEL OPERATIONNEL", margin + 14, 76);
doc.setFontSize(16);
doc.setTextColor(255, 255, 255);
doc.text("Promotions Commerciales & Creation Bons de Commande", margin + 14, 86);
doc.setFont('helvetica', 'normal');
doc.setFontSize(9.5);
doc.setTextColor(200, 210, 220);
doc.text("Guide exhaustif d'utilisation, regles de gestion des remises par produit,", margin + 14, 96);
doc.text("detection des familles d'articles, analyse BI des ventes et bons d'achat.", margin + 14, 102);

// Metadata Block
doc.setFillColor(COLOR_LIGHT_BG[0], COLOR_LIGHT_BG[1], COLOR_LIGHT_BG[2]);
doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
doc.setLineWidth(0.4);
doc.roundedRect(margin, 120, contentWidth, 34, 2, 2, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(9);
doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
doc.text("METADONNEES DU DOCUMENT", margin + 6, 127);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(80, 90, 100);
doc.text("- Version du Systeme : Release 2026.3 (Web & Application Mobile Android)", margin + 6, 134);
doc.text("- Public Vise : Directeurs Commerciaux, Chefs de Vente, Superviseurs, Delegues Commerciaux", margin + 6, 139);
doc.text("- Perimetre : Gestion des Offres Bardahl, Bons de Commande, Remises par Ligne et Statistiques BI", margin + 6, 144);
doc.text("- Date d'Edition : Septembre 2026 - Conforme aux protocoles de tarification Bardahl Maroc", margin + 6, 149);

// Sommaire Executif Table
let yPos = 162;
doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
doc.text("SOMMAIRE GENERAL", margin, yPos);
yPos += 4;

doc.autoTable({
  startY: yPos,
  margin: { left: margin, right: margin },
  head: [['Section', 'Intitule Operatoire', 'Sujets Cles Couverts', 'Page']],
  body: [
    ['01', 'Vision & Architecture Commerciale', 'Objectifs strategiques, synergie Web / Mobile Android, conformite tarifaire', '2'],
    ['02', 'Module Promotions & Offres Commerciales', 'Navigation double vue (Grille de Cartes vs. Tableau Liste), filtres dynamiques', '3'],
    ['03', 'Creation & Configuration d\'une Offre', 'Formulaire pas-a-pas, modalite de calcul, detection automatique des 5 Familles', '4'],
    ['04', 'Tableau de Bord & Moteur d\'Analyse BI', 'Analyse du volume de cartons vendus, nombre de factures generees, rentabilite', '5'],
    ['05', 'Creation Bon de Commande Bardahl', 'Parcours complet en 8 etapes : du choix client a la finalisation du bon', '6'],
    ['06', 'Remise Commerciale par Ligne de Produit', 'Saisie directe %, boutons rapides par lot, arbitrage promo et regle de non-cumul', '7'],
    ['07', 'Cas Pratiques & Simulations Chiffrees', 'Scenarios de commandes reelles : remises lignes, cartons gratuits et bons d\'achat', '8'],
    ['08', 'Bonnes Pratiques & Questions Frequentes', 'Controles anti-erreur, gestion des litiges, synchronisation et validation', '9']
  ],
  theme: 'grid',
  headStyles: { fillColor: COLOR_DARK, textColor: [255, 208, 0], fontStyle: 'bold', fontSize: 8.5 },
  bodyStyles: { fontSize: 8, textColor: [30, 40, 50], cellPadding: 2.2 },
  columnStyles: {
    0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
    1: { cellWidth: 55, fontStyle: 'bold' },
    2: { cellWidth: 95 },
    3: { cellWidth: 16, halign: 'center' }
  }
});

// ==========================================
// PAGE 2: SECTION 1 - VISION & ARCHITECTURE
// ==========================================
doc.addPage();
yPos = 20;
yPos = drawSectionBanner("01. VISION STRATEGIQUE & ARCHITECTURE COMMERCIALE", "Principes directeurs du systeme de vente et fidelisation Bardahl Maroc", yPos);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(40, 50, 60);
const p1Lines = [
  "La plateforme integree de SADAPS Bardahl Maroc repond a un imperatif fondamental : maximiser la performance commerciale",
  "sur le terrain tout en garantissant une rigueur financiere absolue sur la politique des remises et des marges distributeurs.",
  "Ce manuel detaille les deux piliers centraux du dispositif : le pilotage des Promotions & Offres Commerciales et la Creation",
  "des Bons de Commande avec la nouvelle fonctionnalite de Remise Commerciale a la ligne de produit."
];
for (const line of p1Lines) {
  doc.text(cleanText(line), margin, yPos);
  yPos += 5;
}
yPos += 2;

yPos = drawCallout(
  "PRINCIPE DIRECTEUR : EQUILIBRE ENTRE FLEXIBILITE TERRAIN ET SECURITE DE MARGE",
  [
    "1. Autonomie Commerciale Responsabilisee : Les delegues commerciaux adaptent les remises article par article.",
    "2. Transparence Tarifaire Totale : Chaque ligne affiche son prix brut TTC, son taux de remise et son total net.",
    "3. Automatisation des Cadeaux & Cartons : Les paliers d'offres declenchent automatiquement les cartons offerts.",
    "4. Synchronisation Temps Reel : Toute promotion creee sur le portail web est instantanement disponible sur l'application mobile."
  ],
  yPos,
  'success'
);

doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
doc.text("Architecture de Flux entre les Deux Modules", margin, yPos);
yPos += 5;

doc.autoTable({
  startY: yPos,
  margin: { left: margin, right: margin },
  head: [['Composant', 'Module Promotions & Offres', 'Module Creation Bon de Commande', 'Synergie Operationnelle']],
  body: [
    ['Role Metier', 'Administration & modelisation des offres de vente par la direction.', 'Saisie rapide terrain des commandes clients par les delegues.', 'Alignement strategique instantane sans ressaisie.'],
    ['Donnees Entrees', 'Familles ciblees, paliers en cartons/DH, lots offerts, bon d\'achat.', 'Client, echeance, articles du catalogue, remises individuelles.', 'Validation automatique de solvabilite et de stock.'],
    ['Mecanisme de Calcul', 'Algorithme d\'eligibilite selon la composition du panier commande.', 'Calcul en temps reel ligne par ligne : Brut - Remise Ligne = Net.', 'Arbitrage automatique entre offre catalogue et remise manuelle.'],
    ['Livrables Generes', 'Indicateurs BI de cartons vendus, factures et rentabilite nette.', 'Bon de Commande officiel PDF Bardahl conforme avec QR Code.', 'Donnees fiables injectees dans l\'ERP commercial de l\'entreprise.']
  ],
  theme: 'striped',
  headStyles: { fillColor: COLOR_DARK, textColor: [255, 208, 0], fontStyle: 'bold', fontSize: 8 },
  bodyStyles: { fontSize: 7.5, textColor: [40, 50, 60], cellPadding: 2.2 },
  columnStyles: {
    0: { cellWidth: 32, fontStyle: 'bold' },
    1: { cellWidth: 50 },
    2: { cellWidth: 50 },
    3: { cellWidth: 50 }
  }
});

yPos = doc.lastAutoTable.finalY + 8;

yPos = drawCallout(
  "SECURISATION DE LA POLITIQUE TARIFAIRE",
  [
    "- Zero divergence entre les documents papier remis aux clients et les enregistrements comptables officiels.",
    "- Calculs bases exclusivement sur les prix officiels en Dirhams TTC avec suivi rigoureux de la TVA (20%).",
    "- Historisation permanente des conditions accordees pour eviter tout litige lors des reglements finaux."
  ],
  yPos,
  'info'
);

// =======================================================
// PAGE 3: SECTION 2 - MODULE PROMOTIONS & OFFRES
// =======================================================
doc.addPage();
yPos = 20;
yPos = drawSectionBanner("02. MODULE PROMOTIONS & OFFRES COMMERCIALES", "Interface double affichage, ergonomie visuelle et filtrage avance des offres", yPos);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(40, 50, 60);
const p3Lines = [
  "Le module Promotions & Offres Commerciales a ete entierement enrichi pour offrir une flexibilite maximale d'exploitation.",
  "Les responsables des ventes peuvent desormais basculer d'un clic entre deux modes de consultation complementaires :",
  "la vue Grille de Cartes (ideale pour une vision visuelle et synthetique) et la vue Tableau Liste (confectionnee pour l'audit detaille)."
];
for (const line of p3Lines) {
  doc.text(cleanText(line), margin, yPos);
  yPos += 5;
}
yPos += 3;

doc.autoTable({
  startY: yPos,
  margin: { left: margin, right: margin },
  head: [['Mode d\'Affichage', 'Aspect Visuel & Elements Affiches', 'Cas d\'Usage Recommande']],
  body: [
    [
      'Vue Grille (Cartes Interactives)',
      'Cartes stylisees avec badge statut colore (Actif / A Venir / Expire), icone thematique de famille, seuil minimum en cartons ou DH, type de cadeau (Carton offert ou Bon d\'achat), et indicateurs d\'impact commercial.',
      'Recommandee pour les reunions commerciales, les briefs d\'equipe et la consultation rapide par les delegues sur tablette tactile.'
    ],
    [
      'Vue Tableau (Liste Dense)',
      'Tableau analytique compact avec colonnes : Code/Nom de l\'offre, Categorie de remise, Famille de produits couverte, Periode de validite, Conditions d\'eligibilite, Avantages accordes, et boutons d\'action directe.',
      'Recommandee pour les revues de gestion, l\'export de donnees, la comparaison rapide de plusieurs offres et les audits de rentabilite.'
    ]
  ],
  theme: 'grid',
  headStyles: { fillColor: COLOR_DARK, textColor: [255, 208, 0], fontStyle: 'bold', fontSize: 8.5 },
  bodyStyles: { fontSize: 8, textColor: [30, 40, 50], cellPadding: 3 },
  columnStyles: {
    0: { cellWidth: 42, fontStyle: 'bold' },
    1: { cellWidth: 80 },
    2: { cellWidth: 60 }
  }
});

yPos = doc.lastAutoTable.finalY + 8;

doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
doc.text("Barre d'Outils et Filtres Intelligents", margin, yPos);
yPos += 5;

const toolsText = [
  "1. Recherche Textuelle Instantanee : Filtre en temps reel sur le titre de l'offre, le code promo ou la reference produit.",
  "2. Filtrage par Statut : Bascule rapide entre [Toutes], [En Cours / Actives], [Planifiees / A Venir], et [Archivees / Expirées].",
  "3. Filtrage par Famille Bardahl : Isolement des promotions relatives aux Additifs, Lubrifiants, Fluides, Aérosols ou Industrie.",
  "4. Tri Dynamique : Classement par date d'echeance, par montant minimum requis ou par volume de cartons d'avantage."
];
for (const line of toolsText) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 60, 70);
  doc.text(cleanText(line), margin + 4, yPos);
  yPos += 5;
}
yPos += 4;

yPos = drawCallout(
  "INDICATEUR VISUEL DE COULEUR PAR STATUT",
  [
    "- Vert Emeraude (#16A34A) : Promotion en cours de validite, applicable immediatement dans les bons de commande.",
    "- Ambre / Orange (#D97706) : Offre validee mais a echeance future (campagne saisonniere programmee).",
    "- Gris Ardoise (#64748B) : Promotion close, conservee pour la tracabilite des historiques comptables."
  ],
  yPos,
  'info'
);

// ===============================================================
// PAGE 4: SECTION 3 - CREATION D'UNE OFFRE & DETECTION FAMILLES
// ===============================================================
doc.addPage();
yPos = 20;
yPos = drawSectionBanner("03. CREATION D'UNE OFFRE & DETECTION AUTOMATIQUE", "Formulaire complet et assignation intelligente aux 5 Familles Bardahl officielles", yPos);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(40, 50, 60);
const p4Lines = [
  "L'ouverture du modal 'Nouvelle Promotion Commerciale' permet de concevoir une mecanique promotionnelle sur mesure.",
  "Pour supprimer tout risque de saisie erronée, le systeme integre un moteur de detection automatique : des la selection d'un produit",
  "ou d'un lot, le systeme identifie instantanement la Famille de Produits Entiere correspondante parmi le catalogue officiel Bardahl."
];
for (const line of p4Lines) {
  doc.text(cleanText(line), margin, yPos);
  yPos += 5;
}
yPos += 3;

doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
doc.text("Les 5 Familles Officielles Bardahl Automatiquement Reconnues", margin, yPos);
yPos += 5;

doc.autoTable({
  startY: yPos,
  margin: { left: margin, right: margin },
  head: [['Famille Officielle Bardahl', 'Icone Badge', 'Typologie d\'Articles Couverts', 'Exemples Produits Cles']],
  body: [
    ['Additifs & Traitements', '[ADD]', 'Nettoyants injecteurs, traitements huile, stop fuites, additifs carburant', 'Nettoyant Injecteurs 1L, No Smoke, BDC, Tratament Moteur 400ml'],
    ['Fluides & LR', '[LQD]', 'Liquides de refroidissement -35C, lave-glaces concentres, fluides de frein', 'LR Type D Jaune/Bleu 5L, Liquide de Frein DOT 4/DOT 5.1, Degivrant'],
    ['Lubrifiants Auto', '[OIL]', 'Huiles moteur synthese et semi-synthese, huiles transmission, boites', 'XTEC 5W30 C3 5L, XTS 5W40 4L, Huile Boite Synchromesh 75W80'],
    ['Aerosols & Nettoyants', '[AER]', 'Nettoyants freins, degrippants ultra-penetrants, mousses desinfectantes', 'Nettoyant Freins 600ml, Degrippant MoS2 500ml, Lubrifiant Chaine'],
    ['Industrie & Graisses', '[IND]', 'Graisses complexes haute temperature, pates d\'assemblage, fluides coupe', 'Graisse Lithium Complexe NLGI 2, Pâte Cuivre 500g, Huile Hydraulique 46']
  ],
  theme: 'grid',
  headStyles: { fillColor: COLOR_DARK, textColor: [255, 208, 0], fontStyle: 'bold', fontSize: 8 },
  bodyStyles: { fontSize: 7.5, textColor: [40, 50, 60], cellPadding: 2 },
  columnStyles: {
    0: { cellWidth: 42, fontStyle: 'bold' },
    1: { cellWidth: 20, halign: 'center' },
    2: { cellWidth: 65 },
    3: { cellWidth: 55 }
  }
});

yPos = doc.lastAutoTable.finalY + 7;

doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
doc.text("Typologie des Mecaniques Promotionnelles Configurables", margin, yPos);
yPos += 5;

doc.autoTable({
  startY: yPos,
  margin: { left: margin, right: margin },
  head: [['Type de Promotion', 'Regle de Declenchement', 'Avantage Accorde au Client', 'Impact Comptable']],
  body: [
    ['Palier de Cartons + Carton Offert', 'Commande d\'un seuil N de cartons (ex: 10 cartons d\'Additifs).', 'Attribution automatique d\'un carton gratuit (produit identique ou cible).', 'Gratuite valorisee a 0 DH sur la ligne de bon de commande.'],
    ['Volume DH + Bon d\'Achat (Voucher)', 'Chiffre d\'affaires commande atteignant un palier en DH TTC (ex: 15 000 DH).', 'Deduction forfaitaire immediate sous forme d\'avoir / bon d\'achat (ex: 1 000 DH).', 'Ligne speciale deduction commerciale TTC appliquee en bas de bon.'],
    ['Remise a Echelons Multiples', 'Plusieurs tranches progressives (ex: 5 ctn = 3%, 15 ctn = 7%, 30 ctn = 12%).', 'Pourcentage de rabais automatiquement applique au franchissement de palier.', 'Remise commerciale integree dans les totaux financiers du bon.'],
    ['Pack Bundle / Offre Duo', 'Achat combine de 2 references complementaires.', 'Prix forfaitaire avantageux ou produit d\'accompagnement offert (ex: distributeur).', 'Facturation groupee selon la tarification pack conventionnee.']
  ],
  theme: 'striped',
  headStyles: { fillColor: COLOR_DARK, textColor: [255, 208, 0], fontStyle: 'bold', fontSize: 8 },
  bodyStyles: { fontSize: 7.5, textColor: [40, 50, 60], cellPadding: 2 },
  columnStyles: {
    0: { cellWidth: 45, fontStyle: 'bold' },
    1: { cellWidth: 50 },
    2: { cellWidth: 50 },
    3: { cellWidth: 37 }
  }
});

yPos = doc.lastAutoTable.finalY + 6;

yPos = drawCallout(
  "AUTOMATISATION DE LA FAMILLE DE PRODUITS ENTIERE",
  [
    "Lors de la selection d'un produit dans la liste deroulante, le champ 'Famille de Produits Entiere' se verrouille et s'affiche",
    "avec son macaron officiel. Si la promotion vise toute la categorie (ex: 'Tous les Lubrifiants Auto'), l'algorithme appliquera la promotion",
    "a l'ensemble des articles du bon de commande appartenant a cette meme famille."
  ],
  yPos,
  'success'
);

// ===============================================================
// PAGE 5: SECTION 4 - MOTEUR D'ANALYSE BI & STATISTIQUES
// ===============================================================
doc.addPage();
yPos = 20;
yPos = drawSectionBanner("04. MOTEUR D'ANALYSE BI & PERFORMANCE DES VENTES", "Indicateurs en temps reel : cartons ecoules, factures generees et rentabilite", yPos);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(40, 50, 60);
const p5Lines = [
  "Pour transformer le centre de couts promotionnel en levier de croissance mesurable, le module Promotions integre",
  "un Moteur de Business Intelligence (BI). Chaque promotion active dispose d'une fiche analytique vivante, recalculee",
  "a chaque validation de bon de commande par les delegues sur le terrain."
];
for (const line of p5Lines) {
  doc.text(cleanText(line), margin, yPos);
  yPos += 5;
}
yPos += 3;

doc.autoTable({
  startY: yPos,
  margin: { left: margin, right: margin },
  head: [['Indicateur BI Clé', 'Description & Formule Metier', 'Interet Strategique pour la Direction']],
  body: [
    [
      'Volume de Cartons Vendus',
      'Somme cumulee de tous les colisages et cartons livres dans le cadre strict de l\'offre promotionnelle.',
      'Permet de verifier si l\'offre stimule reellement le destockage et l\'ecoulement massif des volumes cibles.'
    ],
    [
      'Nombre de Factures Emises',
      'Compteur unique des bons de commande et factures clientes ayant active la promotion.',
      'Mesure le taux de penetration et l\'adhesion du reseau distributeurs / garagistes a l\'operation.'
    ],
    [
      'Chiffre d\'Affaires Net Genere',
      'Total des ventes HT et TTC imputables aux lignes de commande concernees par la mecanique promotionnelle.',
      'Quantifie la contribution directe de l\'offre au chiffre d\'affaires global de SADAPS Bardahl Maroc.'
    ],
    [
      'Taux d\'Impact sur la Marge',
      'Rapport entre le cout des avantages (cartons gratuits + bons d\'achat) et la marge brute brute realisee.',
      'Garantit que les rabais accordes ne degradent pas la rentabilite plancher fixee par la direction generale.'
    ],
    [
      'Vitesse d\'Adoption Commerciale',
      'Delai moyen necessaire pour atteindre 50% de l\'objectif de cartons initialement assigne a la campagne.',
      'Identifie les offres les plus dynamiques pour reconduire les succes et corriger les operations lentes.'
    ]
  ],
  theme: 'grid',
  headStyles: { fillColor: COLOR_DARK, textColor: [255, 208, 0], fontStyle: 'bold', fontSize: 8 },
  bodyStyles: { fontSize: 7.5, textColor: [30, 40, 50], cellPadding: 2.3 },
  columnStyles: {
    0: { cellWidth: 42, fontStyle: 'bold' },
    1: { cellWidth: 78 },
    2: { cellWidth: 62 }
  }
});

yPos = doc.lastAutoTable.finalY + 8;

doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
doc.text("Exemple de Restitution Analytique par Promotion", margin, yPos);
yPos += 5;

doc.autoTable({
  startY: yPos,
  margin: { left: margin, right: margin },
  head: [['Promotion Active', 'Famille Concernee', 'Seuil Declenchement', 'Cartons Ecoules', 'Bons / Factures', 'CA Net TTC', 'Statut BI']],
  body: [
    ['Offre Flash Injecteurs 10+1', 'Additifs & Traitements', '10 Cartons', '420 Cartons', '38 Factures', '168 000 DH', 'Performance Superieure'],
    ['Campagne Hiver Liquides LR', 'Fluides & LR', '15 Cartons', '315 Cartons', '21 Factures', '78 750 DH', 'Conforme aux Objectifs'],
    ['Challenge Vidange Synthese XTEC', 'Lubrifiants Auto', '20 000 DH TTC', '580 Cartons', '29 Factures', '348 000 DH', 'Marge Maximale Atteinte'],
    ['Boost Nettoyant Freins Carton', 'Aerosols & Nettoyants', '5 Cartons', '260 Cartons', '52 Factures', '65 000 DH', 'Forte Penetration Client']
  ],
  theme: 'striped',
  headStyles: { fillColor: COLOR_DARK, textColor: [255, 208, 0], fontStyle: 'bold', fontSize: 7.5 },
  bodyStyles: { fontSize: 7.5, textColor: [40, 50, 60], cellPadding: 2 },
  columnStyles: {
    0: { cellWidth: 42, fontStyle: 'bold' },
    1: { cellWidth: 32 },
    2: { cellWidth: 24, halign: 'center' },
    3: { cellWidth: 22, halign: 'center' },
    4: { cellWidth: 20, halign: 'center' },
    5: { cellWidth: 22, halign: 'right' },
    6: { cellWidth: 20, halign: 'center' }
  }
});

yPos = doc.lastAutoTable.finalY + 6;

yPos = drawCallout(
  "UTILISATION DES STATISTIQUES POUR LES COMMERCIAUX",
  [
    "- Le delegue commercial peut visualiser lors de son entretien de vente les promotions les plus appreciees par des clients similaires.",
    "- Argumentaire d'opportunite : 'Cette offre 10+1 a deja ete saisie sur plus de 38 commandes ce mois-ci par les ateliers de la region.'",
    "- Pilotage des approvisionnements : Les superviseurs anticipent les ruptures de stock sur les produits cadeaux les plus sollicites."
  ],
  yPos,
  'info'
);

// ===============================================================
// PAGE 6: SECTION 5 - CREATION BON DE COMMANDE BARDAHL
// ===============================================================
doc.addPage();
yPos = 20;
yPos = drawSectionBanner("05. CREATION DU BON DE COMMANDE BARDAHL", "Guide operatoire pas-a-pas en 8 etapes pour les delegues commerciaux", yPos);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(40, 50, 60);
const p6Lines = [
  "La creation d'un Bon de Commande sur la plateforme Bardahl suit un cheminement structure en 8 etapes.",
  "Chaque etape a ete concue pour eviter les erreurs d'inattention, optimiser la rapidite de saisie sur tablette ou ordinateur,",
  "et assurer l'application stricte des baremes tarifaires et conditions de paiement consenties au client."
];
for (const line of p6Lines) {
  doc.text(cleanText(line), margin, yPos);
  yPos += 5;
}
yPos += 3;

doc.autoTable({
  startY: yPos,
  margin: { left: margin, right: margin },
  head: [['Etape', 'Intitule Operatoire', 'Actions Realisees sur l\'Interface', 'Points de Controle & Verifications']],
  body: [
    ['Etape 1', 'Delegue Commercial & Mandataire', 'Selection du commercial assigne (pre-rempli selon la session active du delegue).', 'Garantit l\'affectation exacte des commissions et primes de vente.'],
    ['Etape 2', 'Date du Bon & Echeance Reglement', 'Choix de la date d\'emission et de l\'echeance de paiement (Immediat, 30j, 60j, 90j).', 'Verification de l\'alignement avec la charte de credit client.'],
    ['Etape 3', 'Selection du Client Partenaire', 'Recherche par Raison Sociale, Ville ou ICE. Affichage instantane de l\'encours.', 'Alerte si le client a depasse son plafond d\'impayes autorise.'],
    ['Etape 4', 'Choix Promotion Commerciale', 'Menu deroulant listant toutes les offres actives Bardahl compatibles.', 'Si une offre est selectionnee, ses parametres sont charges en memoire.'],
    ['Etape 5', 'Panier d\'Articles & Colisage', 'Recherche rapide d\'articles par nom ou reference. Saisie des quantites.', 'Affichage automatique du prix unitaire TTC officiel et du total brut.'],
    ['Etape 6', 'Remise Commerciale par Produit', 'Saisie du % de remise pour chaque ligne ou boutons rapides par lot (0 a 20%).', 'Calcul immediat de la remise en DH et du Prix Net TTC par article.'],
    ['Etape 7', 'Cartons Gratuits & Bons d\'Achat', 'Attribution automatique des cartons offerts selon les paliers de l\'offre choisie.', 'Saisie optionnelle d\'un bon d\'achat autorise deduire sur le net TTC.'],
    ['Etape 8', 'Validation, Enregistrement & PDF', 'Verification du recapitulatif financier complet. Clic sur [Creer le Bon].', 'Generation automatique du Bon PDF officiel avec logo et QR Code.']
  ],
  theme: 'grid',
  headStyles: { fillColor: COLOR_DARK, textColor: [255, 208, 0], fontStyle: 'bold', fontSize: 8 },
  bodyStyles: { fontSize: 7.5, textColor: [30, 40, 50], cellPadding: 2.2 },
  columnStyles: {
    0: { cellWidth: 18, fontStyle: 'bold', halign: 'center' },
    1: { cellWidth: 42, fontStyle: 'bold' },
    2: { cellWidth: 62 },
    3: { cellWidth: 60 }
  }
});

yPos = doc.lastAutoTable.finalY + 8;

yPos = drawCallout(
  "SUPPRESSION DE L'ANCIENNE NOTE PROMOTIONNELLE MANUELLE",
  [
    "Conformement aux nouvelles exigences de rigueur, le champ libre 'Note Promotionnelle' a ete supprime du formulaire.",
    "Toute offre doit desormais provenir du referentiel officiel des promotions ou d'une remise a la ligne explicite.",
    "Cela evite les annotations manuscrites ambiguës et garantit une facturation automatique sans retouche manuelle."
  ],
  yPos,
  'warning'
);

// ===============================================================
// PAGE 7: SECTION 6 - REMISE COMMERCIALE PAR LIGNE DE PRODUIT
// ===============================================================
doc.addPage();
yPos = 20;
yPos = drawSectionBanner("06. REMISE COMMERCIALE PAR LIGNE DE PRODUIT", "Mecanisme de remise individualisee, boutons par lot et calcul financier transparent", yPos);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(40, 50, 60);
const p7Lines = [
  "L'evolution majeure du systeme de commande Bardahl reside dans l'abandon de la remise globale forfaitaire au profit",
  "d'une Remise Commerciale Individualisee par Ligne de Produit. Cette fonctionnalite permet au delegue commercial d'accorder",
  "un pourcentage precis sur un article precis (ex: 10% sur les additifs a forte marge) tout en maintenant 0% sur les produits reglementes."
];
for (const line of p7Lines) {
  doc.text(cleanText(line), margin, yPos);
  yPos += 5;
}
yPos += 3;

doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
doc.text("Presentation du Tableau des Articles avec la Colonne Remise (%)", margin, yPos);
yPos += 5;

doc.autoTable({
  startY: yPos,
  margin: { left: margin, right: margin },
  head: [['Designation Article', 'Famille', 'PU TTC', 'Quantite', 'Remise (%)', 'Montant Remise', 'Total Net TTC']],
  body: [
    ['Nettoyant Injecteurs 1L (Ref: 1155)', 'Additifs', '120.00 DH', '12', '10.0 %', '- 144.00 DH', '1 296.00 DH'],
    ['Huile XTEC 5W30 C3 5L (Ref: 36343)', 'Lubrifiants', '380.00 DH', '6', '5.0 %', '- 114.00 DH', '2 166.00 DH'],
    ['Liquide Refroidissement -35C 5L', 'Fluides', '95.00 DH', '20', '0.0 %', '0.00 DH', '1 900.00 DH'],
    ['Nettoyant Freins 600ml (Ref: 4452)', 'Aerosols', '45.00 DH', '24', '15.0 %', '- 162.00 DH', '918.00 DH'],
    ['Totaux Synthetiques Commande', '-', '-', '62 articles', 'Moy: 6.7%', '- 420.00 DH', '6 280.00 DH']
  ],
  theme: 'grid',
  headStyles: { fillColor: COLOR_DARK, textColor: [255, 208, 0], fontStyle: 'bold', fontSize: 8 },
  bodyStyles: { fontSize: 7.5, textColor: [30, 40, 50], cellPadding: 2.2 },
  columnStyles: {
    0: { cellWidth: 50, fontStyle: 'bold' },
    1: { cellWidth: 24 },
    2: { cellWidth: 20, halign: 'right' },
    3: { cellWidth: 16, halign: 'center' },
    4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
    5: { cellWidth: 24, halign: 'right', textColor: [217, 119, 6] },
    6: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] }
  }
});

yPos = doc.lastAutoTable.finalY + 8;

doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
doc.text("Boutons d'Application Rapide par Lot (Batch Remise)", margin, yPos);
yPos += 5;

const batchLines = [
  "Pour accelerer la saisie lors des commandes volumineuses comportant plusieurs dizaines d'articles, la section 6 propose",
  "des boutons de raccourci permettant d'appliquer un taux uniforme a l'ensemble du panier d'un seul clic :",
  "  * [0% - Aucune Remise] : Reinitialise l'ensemble des lignes au tarif catalogue de base.",
  "  * [5% - Remise Standard] : Taux de courtoisie accorde aux clients reguliers sans condition de volume.",
  "  * [10% - Remise Volume] : Taux distributeur conventionnel pour commande superieure a 5 000 DH.",
  "  * [15% - Remise Partenaire] : Taux reserve aux grossistes et centrales d'achat agreees.",
  "  * [20% - Remise Exceptionnelle] : Taux plafond necessitant accord prealable de la direction commerciale."
];
for (const line of batchLines) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 60, 70);
  doc.text(cleanText(line), margin + 4, yPos);
  yPos += 5;
}
yPos += 3;

yPos = drawCallout(
  "FORMULES DE CALCUL COMPTABLE AUTOMATISEES",
  [
    "1. Montant Remise Ligne = (Prix Unitaire TTC x Quantite) x (Taux Remise % / 100)",
    "2. Total Net Ligne TTC = (Prix Unitaire TTC x Quantite) - Montant Remise Ligne",
    "3. Total Brut Commande TTC = Somme de toutes les lignes brutes sans deduction",
    "4. Total Net a Payer TTC = Total Brut TTC - Somme des Remises Lignes - Bon d'Achat (Voucher)"
  ],
  yPos,
  'success'
);

// ===============================================================
// PAGE 8: SECTION 7 - CAS PRATIQUES & SIMULATIONS CHIFFREES
// ===============================================================
doc.addPage();
yPos = 20;
yPos = drawSectionBanner("07. CAS PRATIQUES & SCENARIOS CHIFFREES", "Exemples concrets de commandes combinant remises par produit et avantages promo", yPos);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(40, 50, 60);
const p8Lines = [
  "Afin d'illustrer la parfaite cohabitation entre les Remises par Ligne et les Promotions Commerciales,",
  "les trois cas d'ecole ci-dessous representent des situations commerciales reelles rencontrees quotidiennement sur le terrain."
];
for (const line of p8Lines) {
  doc.text(cleanText(line), margin, yPos);
  yPos += 5;
}
yPos += 3;

// Scenario A Box
doc.setFillColor(COLOR_LIGHT_BG[0], COLOR_LIGHT_BG[1], COLOR_LIGHT_BG[2]);
doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
doc.roundedRect(margin, yPos, contentWidth, 54, 2, 2, 'FD');
doc.setFillColor(COLOR_BLUE[0], COLOR_BLUE[1], COLOR_BLUE[2]);
doc.rect(margin, yPos, 3, 54, 'F');

doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(COLOR_BLUE[0], COLOR_BLUE[1], COLOR_BLUE[2]);
doc.text("SCENARIO A : COMMANDE MULTI-LIGNES AVEC REMISES DIFFERENCIEES", margin + 6, yPos + 6);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(40, 50, 60);
doc.text("- Contexte Client : Garage Moderne a Casablanca commande 3 types de produits.", margin + 6, yPos + 12);
doc.text("- Ligne 1 : 10 bidons Huile 5W30 a 380 DH TTC = 3 800 DH brut. Negocie a 5% de remise -> Net: 3 610 DH (-190 DH).", margin + 6, yPos + 17);
doc.text("- Ligne 2 : 24 flacons Nettoyant Injecteurs a 120 DH TTC = 2 880 DH brut. Negocie a 10% -> Net: 2 592 DH (-288 DH).", margin + 6, yPos + 22);
doc.text("- Ligne 3 : 12 flacons Stop-Fuite a 90 DH TTC = 1 080 DH brut. Pas de remise (0%) -> Net: 1 080 DH.", margin + 6, yPos + 27);
doc.text("- Total Brut TTC : 7 760.00 DH | Total Remises Lignes : - 478.00 DH | Net a Payer : 7 282.00 DH TTC.", margin + 6, yPos + 34);
doc.setFont('helvetica', 'bold');
doc.setTextColor(COLOR_GREEN[0], COLOR_GREEN[1], COLOR_GREEN[2]);
doc.text("Resultat : Chaque produit porte sa juste marge, sans sacrifice aveugle sur le panier total.", margin + 6, yPos + 44);

yPos += 58;

// Scenario B Box
doc.setFillColor(COLOR_LIGHT_BG[0], COLOR_LIGHT_BG[1], COLOR_LIGHT_BG[2]);
doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
doc.roundedRect(margin, yPos, contentWidth, 54, 2, 2, 'FD');
doc.setFillColor(COLOR_YELLOW[0], COLOR_YELLOW[1], COLOR_YELLOW[2]);
doc.rect(margin, yPos, 3, 54, 'F');

doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
doc.text("SCENARIO B : SELECTION PROMOTION 10+1 AVEC REMISE SUR ARTICLE COMPLEMENTAIRE", margin + 6, yPos + 6);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(40, 50, 60);
doc.text("- Contexte Client : Centre Auto Rabat profite de la promotion officielle 'Pack Additifs 10 Cartons + 1 Offert'.", margin + 6, yPos + 12);
doc.text("- Panier Promotionnel : 10 cartons Injecteurs 1L = 120 unites a 120 DH = 14 400 DH TTC (Remise ligne: 0%).", margin + 6, yPos + 17);
doc.text("- Cadeau Promotionnel : 1 Carton Offert (12 unites) ajoute automatiquement a 0.00 DH TTC.", margin + 6, yPos + 22);
doc.text("- Article Complementaire : 5 cartons de Nettoyant Freins ajoutes en plus avec une remise ligne de 10%.", margin + 6, yPos + 27);
doc.text("- Synthese Bon : Total Brut: 17 100 DH | Remise Freins: - 270 DH | Cartons Gratuits: 1 | Net: 16 830 DH TTC.", margin + 6, yPos + 34);
doc.setFont('helvetica', 'bold');
doc.setTextColor(COLOR_BLUE[0], COLOR_BLUE[1], COLOR_BLUE[2]);
doc.text("Resultat : La promotion active livre son cadeau sans bloquer la remise commerciale sur le reste.", margin + 6, yPos + 44);

yPos += 58;

// Scenario C Box
doc.setFillColor(COLOR_LIGHT_BG[0], COLOR_LIGHT_BG[1], COLOR_LIGHT_BG[2]);
doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
doc.roundedRect(margin, yPos, contentWidth, 54, 2, 2, 'FD');
doc.setFillColor(COLOR_ORANGE[0], COLOR_ORANGE[1], COLOR_ORANGE[2]);
doc.rect(margin, yPos, 3, 54, 'F');

doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(COLOR_ORANGE[0], COLOR_ORANGE[1], COLOR_ORANGE[2]);
doc.text("SCENARIO C : CUMUL AVEC BON D'ACHAT COMMERCIAL (VOUCHER)", margin + 6, yPos + 6);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(40, 50, 60);
doc.text("- Contexte Client : Grossiste Fes dispose d'un Bon d'Achat de fidelisation de 1 000 DH valide par la direction.", margin + 6, yPos + 12);
doc.text("- Saisie Commande : 50 bidons d'huile moteur pour un total brut TTC de 19 000 DH.", margin + 6, yPos + 17);
doc.text("- Remise Ligne Accordee : 5% sur l'ensemble du lot = - 950.00 DH de remise.", margin + 6, yPos + 22);
doc.text("- Deduction Bon d'Achat : Saisie du bon d'achat de 1 000 DH en bas de bon de commande.", margin + 6, yPos + 27);
doc.text("- Calcul Net Final : 19 000 DH - 950 DH (Remises Lignes) - 1 000 DH (Bon d'Achat) = 17 050 DH TTC.", margin + 6, yPos + 34);
doc.setFont('helvetica', 'bold');
doc.setTextColor(COLOR_GREEN[0], COLOR_GREEN[1], COLOR_GREEN[2]);
doc.text("Resultat : Distinction limpide sur le bon de commande officiel PDF entre remise et bon d'achat.", margin + 6, yPos + 44);

// ===============================================================
// PAGE 9: SECTION 8 - BONNES PRATIQUES & QUESTIONS FREQUENTES
// ===============================================================
doc.addPage();
yPos = 20;
yPos = drawSectionBanner("08. BONNES PRATIQUES & QUESTIONS FREQUENTES (FAQ)", "Conseils operationnels, securisation des ventes et resolution des cas particuliers", yPos);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(40, 50, 60);
const p9Lines = [
  "Pour clore ce manuel d'exploitation, cette section rassemble les questions operationnelles les plus frequentes",
  "posees par la force de vente et rappelle les regles d'or pour preserver l'excellence commerciale de SADAPS Bardahl Maroc."
];
for (const line of p9Lines) {
  doc.text(cleanText(line), margin, yPos);
  yPos += 5;
}
yPos += 3;

doc.autoTable({
  startY: yPos,
  margin: { left: margin, right: margin },
  head: [['Question Frequente', 'Reponse & Protocole Officiel']],
  body: [
    [
      'Puis-je appliquer a la fois une remise ligne et un carton offert ?',
      'Oui, absolument. Le moteur de calcul applique d\'abord la regle de promotion (carton offert a 0.00 DH) et conserve independamment le taux de remise % defini sur chaque article payant.'
    ],
    [
      'Comment annuler rapidement toutes les remises saisies par erreur ?',
      'Il suffit de cliquer sur le bouton [0% - Aucune] dans la barre des boutons rapides de l\'Etape 6. L\'ensemble du panier repassera immediatement a son prix officiel catalogue.'
    ],
    [
      'Que faire si une famille de produits entiere n\'est pas reconnue ?',
      'La classification s\'effectue selon la base centrale des 5 Familles officielles Bardahl. Verifiez que l\'article n\'est pas enregistre sous une reference temporaire ou contactez l\'administrateur des ventes.'
    ],
    [
      'Le client peut-il contester le montant du Bon de Commande genere ?',
      'Le bon PDF Bardahl officiel affiche l\'integralite des details : prix unitaire TTC, taux de remise explicite par ligne, cartons cadeaux et modalites de paiement, e的多ant toute ambiguïte.'
    ],
    [
      'Comment fonctionne la synchronisation avec l\'application mobile Android ?',
      'La synchronisation est automatique en temps reel des que le smartphone dispose d\'une connexion Internet. En cas de zone blanche, la commande est stockee localement et synchronisee au retour du reseau.'
    ]
  ],
  theme: 'grid',
  headStyles: { fillColor: COLOR_DARK, textColor: [255, 208, 0], fontStyle: 'bold', fontSize: 8 },
  bodyStyles: { fontSize: 7.5, textColor: [30, 40, 50], cellPadding: 2.5 },
  columnStyles: {
    0: { cellWidth: 60, fontStyle: 'bold' },
    1: { cellWidth: 122 }
  }
});

yPos = doc.lastAutoTable.finalY + 8;

doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
doc.text("Les 5 Regles d'Or du Delegue Commercial Bardahl", margin, yPos);
yPos += 5;

const goldenRules = [
  "1. Privilegier Toujours les Offres Officielles : Elles sont concues pour maximiser la satisfaction client tout en preservant la marge de l'entreprise.",
  "2. Ne Jamais Depasser le Taux Plafond de Remise sans Autorisation : Tout taux superieur a 15% doit faire l'objet d'un visa de votre chef des ventes.",
  "3. Verifier Systematiquement l'En-cours Client : Ne creez pas de bon de commande pour un client sous moratoire financier sans regularisation prealable.",
  "4. Remettre Immediatement le Bon PDF au Client : Envoyez le fichier PDF genere par WhatsApp ou e-mail directement apres signature pour eviter tout litige a la livraison.",
  "5. Consulter le Dashboard BI Chaque Debut de Semaine : Analysez les promotions les plus dynamiques pour orienter vos propositions lors de vos tournees terrain."
];
for (const line of goldenRules) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 60, 70);
  doc.text(cleanText(line), margin + 4, yPos);
  yPos += 5;
}
yPos += 4;

yPos = drawCallout(
  "SUPPORT & ASSISTANCE DIRECTION COMMERCIALE",
  [
    "Pour toute question relative aux baremes de remises ou pour la creation d'une offre promotionnelle sur mesure,",
    "veuillez contacter la Direction Commerciale SADAPS Bardahl Maroc : support-commercial@bardahl.ma | +212 (0) 5 22 XX XX XX."
  ],
  yPos,
  'success'
);

// ===============================================================
// SWEEP PASS: HEADERS & FOOTERS SUR TOUTES LES PAGES
// ===============================================================
const totalPages = doc.internal.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);

  // Skip header on cover page (page 1)
  if (i > 1) {
    // Header Yellow Line
    doc.setFillColor(COLOR_YELLOW[0], COLOR_YELLOW[1], COLOR_YELLOW[2]);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Header Logo & Text
    try {
      doc.addImage(BARDAHL_LOGO_BASE64, 'PNG', margin, 5.5, 20, 12);
    } catch (e) {}

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text("BARDAHL MAROC - GUIDE OPERATIONNEL DES PROMOTIONS ET BONS DE COMMANDE", margin + 23, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text("Document de Reference Officiel - Usage Interne Force de Vente", margin + 23, 15);

    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, 18.5, pageWidth - margin, 18.5);
  }

  // Footer on all pages
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text("SADAPS Bardahl Maroc - Tous droits reserves - Reproduction interdite sans autorisation", margin, pageHeight - 7.5);

  doc.setFont('helvetica', 'bold');
  doc.text(`Page ${i} sur ${totalPages}`, pageWidth - margin, pageHeight - 7.5, { align: 'right' });
}

// Write PDF to workspace and artifacts directory
const outputFileName = 'Guide_Promotions_et_Bons_de_Commande_Bardahl.pdf';
const workspaceOutputPath = path.join('c:', 'Users', 'SFT', 'Desktop', 'bardahl', outputFileName);
const artifactOutputPath = path.join('C:', 'Users', 'SFT', '.gemini', 'antigravity', 'brain', '56883a94-503e-4191-ba88-68aac45a19d7', outputFileName);

const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(workspaceOutputPath, pdfBuffer);
console.log(`Successfully generated workspace PDF at: ${workspaceOutputPath} (${pdfBuffer.length} bytes)`);

fs.writeFileSync(artifactOutputPath, pdfBuffer);
console.log(`Successfully generated artifact PDF at: ${artifactOutputPath} (${pdfBuffer.length} bytes)`);

console.log("PDF generation completed successfully!");
