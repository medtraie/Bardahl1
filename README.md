# Bardahl Maroc - Application Android Premium (Design 2026)

Application Android haut de gamme destinée à l'équipe commerciale et à la direction de **Bardahl Maroc** ([https://bardahl.ma/](https://bardahl.ma/)).

L'application permet la création de bons de commande en mobilité, la gestion des clients et du catalogue produits, la signature électronique, l'exportation PDF/Excel, et la synchronisation en temps réel avec **Supabase** tout en garantissant un fonctionnement 100% hors-ligne (**Offline-First**).

---

## 🌟 Points Forts & Identité Visuelle 2026

- **Charte Graphique Bardahl** : Déclinée des règles d'identité visuelle 2019 (Jaune Bardahl `Pantone 109C / RAL 1021` & Noir Karbon `Pantone Black C / RAL 9005`).
- **Material Design 4 & Jetpack Compose** : Interface sombre moderne avec Glassmorphism, animations à 60 FPS, et Dynamic Color.
- **Supabase Backend & RLS** : Sécurisation totale par Row Level Security (RLS) avec isolation stricte des données entre commerciaux et administrateurs.
- **Offline-First** : Persistance locale via Room Database + moteur de synchronisation automatique lors du retour de la connexion réseau.
- **Catalogue Produits Pré-Chargé** : Importation de l'intégralité des huiles moteur, graisses, fluides XCL, liquides de refroidissement et AdBlue issus des tarifs officiels Bardahl.

---

## 🛠️ Stack Technique

- **Langage** : Kotlin 2.0+
- **UI Framework** : Jetpack Compose + Material 3 / 4 (2026)
- **Architecture** : MVVM + Clean Architecture + Repository Pattern
- **Backend & Database** : Supabase (PostgreSQL 15+, Auth, Storage, RLS)
- **Database Locale** : Android Room DB
- **Concurrence & Réseau** : Coroutines, StateFlow, Ktor Client
- **Document Engine** : Générateur Android PDF & Exportateur Excel CSV

---

## 📂 Structure du Projet

```text
c:/Users/SFT/Desktop/bardahl/
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       └── java/com/bardahl/maroc/
│           ├── MainActivity.kt
│           ├── BardahlApplication.kt
│           ├── data/
│           │   ├── local/ (Room DB, DAOs, Entities, SyncQueue)
│           │   ├── remote/ (Supabase Service, REST API)
│           │   └── repository/ (Client, Product, Order Repositories)
│           ├── domain/
│           │   └── model/ (User, Commercial, Client, Product, Order)
│           ├── ui/
│           │   ├── components/ (GlassCard, BardahlHeader, BardahlButton, etc.)
│           │   ├── theme/ (Color, Theme, Type - Charte Bardahl)
│           │   ├── viewmodels/ (Auth, Dashboard, Client, Order, Product ViewModels)
│           │   └── screens/
│           │       ├── auth/ (LoginScreen)
│           │       ├── dashboard/ (DashboardScreen, Interactive KPIs)
│           │       ├── clients/ (ClientListScreen, AddClientDialog)
│           │       ├── products/ (ProductCatalogScreen)
│           │       ├── orders/ (OrderListScreen, OrderCreateScreen)
│           │       ├── commercials/ (CommercialManagementScreen)
│           │       ├── analytics/ (AnalyticsScreen)
│           │       └── settings/ (SettingsScreen)
│           └── util/ (PdfGenerator, ExcelExporter)
├── supabase/
│   ├── schema.sql (Tables, Triggers, Views, Functions)
│   ├── rls_policies.sql (Row Level Security Admin vs Commercial)
│   └── seed_products.sql (Injection du Catalogue Officiel Bardahl)
├── README.md
├── DOCUMENTATION.md
└── INSTALLATION_GUIDE.md
```
