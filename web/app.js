/* ============================================================================
   BARDAHL MAROC - WEB APPLICATION CONTROLLER (2026)
   ============================================================================ */

const SUPABASE_URL = "https://uoknnkrphtlsmvrdkeov.supabase.co/rest/v1";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVva25ua3JwaHRsc212cmRrZW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NzgwNjgsImV4cCI6MjEwMTQ1NDA2OH0.jOaTIQRMOTTbNZ7m-pJjQa269wFbERaKcKEWx3rzU4g";

// State Management
let currentUser = null;
let selectedRole = "COMMERCIAL";

let state = {
    clients: [
        { id: "c1", companyName: "Auto Service Ain Sebaa", ice: "001548792000088", rc: "45892", address: "Zone Ind. Ain Sebaa", city: "Casablanca", phone: "+212 5 22 35 44 55", type: "Garage" },
        { id: "c2", companyName: "Station Afriquia Route de Rabat", ice: "001984256000077", rc: "12458", address: "Km 12 Route de Rabat", city: "Casablanca", phone: "+212 5 22 78 99 00", type: "Station" },
        { id: "c3", companyName: "Transport & Logistique du Sud", ice: "002145893000066", rc: "89654", address: "Zone Logistique Zenata", city: "Mohammedia", phone: "+212 5 23 30 20 10", type: "Flotte" }
    ],
    products: [
        { id: "p1", category: "LUB_AUTO", code: "XTRA-10W40-1L", reference: "34131", name: "Bardahl XTRA 10W40", viscosity: "10W40", packaging: "12 X 1l", priceTtc: 78.0, stock: 500 },
        { id: "p2", category: "LUB_AUTO", code: "XTRA-5W40-1L", reference: "34121", name: "Bardahl XTRA 5W40", viscosity: "5W40", packaging: "12 X 1l", priceTtc: 120.0, stock: 450 },
        { id: "p3", category: "LUB_AUTO", code: "XTRA-5W30-C2C3-1L", reference: "34111", name: "Bardahl XTRA 5W30 C2/C3", viscosity: "5W30", packaging: "12 X 1l", priceTtc: 123.0, stock: 300 },
        { id: "p4", category: "IND_GRAISSES", code: "GRAISSE-LITH-N2-400G", reference: "GAL01", name: "Graisse Lithium All Purpose N°2", viscosity: "N/A", packaging: "24 X 400g", priceTtc: 27.0, stock: 1000 },
        { id: "p5", category: "IND_AEROSOLS", code: "DEGRIPPANT-LUB-400ML", reference: "1123", name: "Dégrippant Lubrifiant Bardahl", viscosity: "N/A", packaging: "12 X 400ml", priceTtc: 62.0, stock: 800 },
        { id: "p6", category: "IND_AEROSOLS", code: "NETTOYANT-FREINS-600ML", reference: "4451E", name: "Brake Cleaner Nettoyant Freins", viscosity: "N/A", packaging: "12 X 600ml", priceTtc: 47.0, stock: 1200 },
        { id: "p7", category: "FLUIDES_LR", code: "XCL-G12-ROSE-5L", reference: "8313", name: "XCL G12/G12+ Rose -25°C 5L", viscosity: "N/A", packaging: "3 X 5l", priceTtc: 133.0, stock: 400 },
        { id: "p8", category: "FLUIDES_MISC", code: "ADBLUE-10L", reference: "3129", name: "AdBlue Solution d'Urée 10L", viscosity: "N/A", packaging: "1 X 10l", priceTtc: 193.0, stock: 300 }
    ],
    orders: [
        {
            id: "o1", orderNumber: "BC-2026-00001", date: "2026-08-05 14:30", commercialName: "Karim Benjelloun", clientName: "Auto Service Ain Sebaa", status: "VALIDATED",
            totalHt: 4250.0, totalTva: 850.0, totalTtc: 5100.0,
            items: [{ productName: "Bardahl XTRA 10W40", ref: "34131", qty: 24, priceTtc: 78.0, totalTtc: 1872.0 }]
        },
        {
            id: "o2", orderNumber: "BC-2026-00002", date: "2026-08-05 16:15", commercialName: "Karim Benjelloun", clientName: "Station Afriquia Route de Rabat", status: "DRAFT",
            totalHt: 7450.0, totalTva: 1490.0, totalTtc: 8940.0,
            items: [{ productName: "Bardahl XTRA 5W40", ref: "34121", qty: 36, priceTtc: 120.0, totalTtc: 4320.0 }]
        }
    ],
    commercials: [
        { id: "comm1", name: "Karim Benjelloun", matricule: "COMM-001", city: "Casablanca", target: 150000, current: 118500 },
        { id: "comm2", name: "Youssef El Amrani", matricule: "COMM-002", city: "Rabat", target: 120000, current: 95000 },
        { id: "comm3", name: "Mehdi Naciri", matricule: "COMM-003", city: "Marrakech", target: 100000, current: 82000 }
    ]
};

// Wizard Order Draft State
let newOrderDraft = {
    clientId: "",
    items: []
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    initCharts();
    initSignaturePad();
});

// --- AUTHENTICATION ---
function selectLoginRole(role) {
    selectedRole = role;
    document.getElementById("btn-role-commercial").classList.toggle("active", role === "COMMERCIAL");
    document.getElementById("btn-role-admin").classList.toggle("active", role === "ADMIN");
    document.getElementById("login-email").value = role === "ADMIN" ? "admin@bardahl.ma" : "commercial@bardahl.ma";
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value;

    currentUser = {
        name: selectedRole === "ADMIN" ? "Direction Bardahl" : "Karim Benjelloun",
        email: email,
        role: selectedRole,
        initials: selectedRole === "ADMIN" ? "DB" : "KB"
    };

    document.getElementById("login-screen").classList.remove("active");
    document.getElementById("app-container").classList.remove("hidden");

    // Update User Info Display
    document.getElementById("user-name-display").innerText = currentUser.name;
    document.getElementById("user-role-display").innerText = currentUser.role === "ADMIN" ? "Administrateur" : "Commercial";
    document.getElementById("user-avatar-initials").innerText = currentUser.initials;

    // Toggle Admin Only Menu Options
    document.querySelectorAll(".admin-only").forEach(el => {
        el.style.display = currentUser.role === "ADMIN" ? "flex" : "none";
    });

    renderAllData();
}

function handleLogout() {
    currentUser = null;
    document.getElementById("app-container").classList.add("hidden");
    document.getElementById("login-screen").classList.add("active");
}

// --- NAVIGATION ---
function navigate(panelId, targetElement) {
    document.querySelectorAll(".panel-section").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

    document.getElementById(panelId).classList.add("active");
    if (targetElement) targetElement.classList.add("active");

    const titles = {
        "panel-dashboard": "Tableau de Bord",
        "panel-clients": "Gestion des Clients",
        "panel-products": "Catalogue Produits Bardahl",
        "panel-orders": "Bons de Commande",
        "panel-commercials": "Équipe Commerciale & Performance",
        "panel-analytics": "Analyses Business Intelligence",
        "panel-settings": "Paramètres & Entreprise"
    };
    document.getElementById("header-panel-title").innerText = titles[panelId] || "Bardahl Maroc";
}

// --- DATA RENDERERS ---
function renderAllData() {
    renderDashboard();
    renderClients();
    renderProducts();
    renderOrders();
    renderCommercials();
}

function renderDashboard() {
    const tbody = document.getElementById("dashboard-recent-orders-body");
    tbody.innerHTML = "";
    state.orders.slice(0, 5).forEach(o => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${o.orderNumber}</strong></td>
                <td>${o.clientName}</td>
                <td>${o.date}</td>
                <td class="text-gold"><strong>${o.totalTtc.toFixed(2)} DH</strong></td>
                <td><span class="badge-status ${o.status.toLowerCase()}">${o.status}</span></td>
            </tr>
        `;
    });
}

function renderClients() {
    const container = document.getElementById("clients-cards-container");
    container.innerHTML = "";
    state.clients.forEach(c => {
        container.innerHTML += `
            <div class="glass-card">
                <h3>${c.companyName}</h3>
                <p class="text-sub mt-2">ICE : ${c.ice} | RC : ${c.rc}</p>
                <p class="text-sub"><i class="fa-solid fa-location-dot text-gold"></i> ${c.address}, ${c.city}</p>
                <p class="text-sub"><i class="fa-solid fa-phone text-gold"></i> ${c.phone}</p>
                <span class="badge-status validated mt-4">${c.type}</span>
            </div>
        `;
    });
}

function filterClients() {
    const query = document.getElementById("search-clients").value.toLowerCase();
    document.querySelectorAll("#clients-cards-container .glass-card").forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(query) ? "block" : "none";
    });
}

function renderProducts() {
    const container = document.getElementById("products-cards-container");
    container.innerHTML = "";
    state.products.forEach(p => {
        container.innerHTML += `
            <div class="glass-card product-card" data-category="${p.category}">
                <div class="flex-between">
                    <h4>${p.name}</h4>
                    ${p.viscosity !== 'N/A' ? `<span class="pill active">${p.viscosity}</span>` : ''}
                </div>
                <p class="text-sub mt-2">Réf: ${p.reference} | Code: ${p.code}</p>
                <p class="text-sub">Conditionnement: ${p.packaging}</p>
                <div class="flex-between mt-4">
                    <span class="text-gold font-bold" style="font-size:18px;">${p.priceTtc.toFixed(2)} DH</span>
                    <span class="text-sub">TTC / Unité</span>
                </div>
            </div>
        `;
    });
}

function filterProducts() {
    const query = document.getElementById("search-products").value.toLowerCase();
    document.querySelectorAll("#products-cards-container .product-card").forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(query) ? "block" : "none";
    });
}

function filterCategory(cat, btn) {
    document.querySelectorAll("#category-filter-pills .pill").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll("#products-cards-container .product-card").forEach(card => {
        if (cat === "ALL" || card.dataset.category === cat) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

function renderOrders() {
    const tbody = document.getElementById("orders-table-body");
    tbody.innerHTML = "";
    state.orders.forEach(o => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${o.orderNumber}</strong></td>
                <td>${o.date}</td>
                <td>${o.commercialName}</td>
                <td>${o.clientName}</td>
                <td>${o.totalHt.toFixed(2)} DH</td>
                <td>${o.totalTva.toFixed(2)} DH</td>
                <td class="text-gold"><strong>${o.totalTtc.toFixed(2)} DH</strong></td>
                <td><span class="badge-status ${o.status.toLowerCase()}">${o.status}</span></td>
                <td>
                    <button class="btn-secondary btn-xs" onclick="downloadOrderPdf('${o.id}')">
                        <i class="fa-solid fa-file-pdf"></i> PDF
                    </button>
                </td>
            </tr>
        `;
    });
}

function renderCommercials() {
    const container = document.getElementById("commercials-cards-container");
    container.innerHTML = "";
    state.commercials.forEach(c => {
        const percent = Math.min(100, Math.round((c.current / c.target) * 100));
        container.innerHTML += `
            <div class="glass-card">
                <h3>${c.name}</h3>
                <p class="text-sub">Matricule: ${c.matricule} | Ville: ${c.city}</p>
                <div class="mt-4">
                    <div class="flex-between text-sub mb-1">
                        <span>Objectif Ventes</span>
                        <span>${percent}%</span>
                    </div>
                    <div style="background:#2B313E; height:8px; border-radius:4px; overflow:hidden;">
                        <div style="background:var(--bardahl-yellow); height:100%; width:${percent}%;"></div>
                    </div>
                    <div class="flex-between text-sub mt-2">
                        <span class="text-gold font-bold">${c.current.toLocaleString()} DH</span>
                        <span>Cible: ${c.target.toLocaleString()} DH</span>
                    </div>
                </div>
            </div>
        `;
    });
}

// --- MODALS & WIZARD BON DE COMMANDE ---
function openAddClientModal() {
    document.getElementById("modal-add-client").classList.remove("hidden");
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add("hidden");
}

function saveNewClient(e) {
    e.preventDefault();
    const newClient = {
        id: "c" + Date.now(),
        companyName: document.getElementById("client-company-name").value,
        ice: document.getElementById("client-ice").value,
        rc: document.getElementById("client-rc").value,
        address: document.getElementById("client-address").value,
        city: document.getElementById("client-city").value,
        phone: document.getElementById("client-phone").value,
        type: document.getElementById("client-type").value
    };
    state.clients.push(newClient);
    renderClients();
    closeModal("modal-add-client");
    alert("Client " + newClient.companyName + " enregistré avec succès !");
}

function openNewOrderModal() {
    newOrderDraft = { clientId: "", items: [] };

    // Populate Client Select
    const clientSelect = document.getElementById("order-select-client");
    clientSelect.innerHTML = `<option value="">-- Choisir un client dans votre portefeuille --</option>`;
    state.clients.forEach(c => {
        clientSelect.innerHTML += `<option value="${c.id}">${c.companyName} (${c.city})</option>`;
    });

    // Populate Product Select
    const prodSelect = document.getElementById("order-add-product-select");
    prodSelect.innerHTML = `<option value="">+ Ajouter un produit du catalogue</option>`;
    state.products.forEach(p => {
        prodSelect.innerHTML += `<option value="${p.id}">${p.name} - ${p.priceTtc} DH (Réf: ${p.reference})</option>`;
    });

    updateOrderWizardTotals();
    clearSignature();
    document.getElementById("modal-new-order").classList.remove("hidden");
}

function onOrderClientSelected() {
    newOrderDraft.clientId = document.getElementById("order-select-client").value;
}

function addSelectedProductToOrder(selectEl) {
    const productId = selectEl.value;
    if (!productId) return;

    const prod = state.products.find(p => p.id === productId);
    if (prod) {
        const existing = newOrderDraft.items.find(i => i.productId === productId);
        if (existing) {
            existing.qty++;
        } else {
            newOrderDraft.items.push({
                productId: prod.id,
                productName: prod.name,
                reference: prod.reference,
                priceTtc: prod.priceTtc,
                discountPercent: 0,
                qty: 1
            });
        }
        updateOrderWizardTotals();
    }
    selectEl.value = "";
}

function updateOrderItemQty(index, newQty) {
    if (newQty <= 0) {
        newOrderDraft.items.splice(index, 1);
    } else {
        newOrderDraft.items[index].qty = parseInt(newQty);
    }
    updateOrderWizardTotals();
}

function updateOrderWizardTotals() {
    const tbody = document.getElementById("order-items-table-body");
    tbody.innerHTML = "";

    let totalTtc = 0;

    newOrderDraft.items.forEach((item, idx) => {
        const itemTtc = item.priceTtc * item.qty * (1 - (item.discountPercent / 100));
        totalTtc += itemTtc;

        tbody.innerHTML += `
            <tr>
                <td>${item.reference}</td>
                <td><strong>${item.productName}</strong></td>
                <td>
                    <input type="number" min="1" value="${item.qty}" style="width:60px;" onchange="updateOrderItemQty(${idx}, this.value)">
                </td>
                <td>${item.priceTtc.toFixed(2)} DH</td>
                <td>${item.discountPercent}%</td>
                <td class="text-gold"><strong>${itemTtc.toFixed(2)} DH</strong></td>
                <td>
                    <button class="btn-link text-cancelled" onclick="updateOrderItemQty(${idx}, 0)">&times;</button>
                </td>
            </tr>
        `;
    });

    const totalHt = totalTtc / 1.20;
    const totalTva = totalTtc - totalHt;

    document.getElementById("order-calc-ht").innerText = totalHt.toFixed(2) + " DH";
    document.getElementById("order-calc-tva").innerText = totalTva.toFixed(2) + " DH";
    document.getElementById("order-calc-ttc").innerText = totalTtc.toFixed(2) + " DH";
}

function submitNewOrder() {
    if (!newOrderDraft.clientId) {
        alert("Veuillez sélectionner un client.");
        return;
    }
    if (newOrderDraft.items.length === 0) {
        alert("Veuillez ajouter au moins un produit à la commande.");
        return;
    }

    const client = state.clients.find(c => c.id === newOrderDraft.clientId);
    const seq = Math.floor(10000 + Math.random() * 90000);

    let totalTtc = 0;
    newOrderDraft.items.forEach(i => totalTtc += (i.priceTtc * i.qty));
    const totalHt = totalTtc / 1.20;
    const totalTva = totalTtc - totalHt;

    const newOrder = {
        id: "o" + Date.now(),
        orderNumber: "BC-2026-" + seq,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        commercialName: currentUser.name,
        clientName: client.companyName,
        status: "VALIDATED",
        totalHt: totalHt,
        totalTva: totalTva,
        totalTtc: totalTtc,
        items: newOrderDraft.items
    };

    state.orders.unshift(newOrder);
    renderAllData();
    closeModal("modal-new-order");

    // Auto-generate PDF
    downloadOrderPdf(newOrder.id);
    alert("Bon de Commande " + newOrder.orderNumber + " validé et PDF généré !");
}

// --- SIGNATURE CANVAS ---
let canvas, ctx, drawing = false;

function initSignaturePad() {
    canvas = document.getElementById("signature-canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0D0F12";

    canvas.addEventListener("mousedown", () => drawing = true);
    canvas.addEventListener("mouseup", () => { drawing = false; ctx.beginPath(); });
    canvas.addEventListener("mousemove", draw);
}

function draw(e) {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function clearSignature() {
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// --- EXPORT PDF & EXCEL ---
function downloadOrderPdf(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header Banner Yellow
    doc.setFillColor(255, 208, 0);
    doc.rect(0, 0, 210, 30, 'F');

    doc.setTextColor(13, 15, 18);
    doc.setFontSize(20);
    doc.text("BARDAHL MAGHREB S.A.", 14, 18);
    doc.setFontSize(10);
    doc.text("RIEN NE VOUS ARRÊTERA - BON DE COMMANDE", 14, 25);

    doc.setFontSize(12);
    doc.text("N°: " + order.orderNumber, 150, 18);
    doc.text("Date: " + order.date, 150, 25);

    // Client Info Box
    doc.setFillColor(244, 245, 248);
    doc.roundedRect(14, 40, 182, 25, 3, 3, 'F');

    doc.setTextColor(20, 23, 31);
    doc.setFontSize(10);
    doc.text("Client: " + order.clientName, 20, 50);
    doc.text("Commercial: " + order.commercialName, 20, 58);

    // Table Items
    const rows = order.items.map(i => [
        i.reference || '34131',
        i.productName,
        i.qty.toString(),
        i.priceTtc.toFixed(2) + " DH",
        (i.priceTtc * i.qty).toFixed(2) + " DH"
    ]);

    doc.autoTable({
        startY: 72,
        head: [['Réf.', 'Désignation Produit', 'Qté', 'Prix U. TTC', 'Total TTC']],
        body: rows,
        headStyles: { fillStyle: [24, 28, 36], textColor: [255, 255, 255] }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text("Total HT : " + order.totalHt.toFixed(2) + " DH", 130, finalY);
    doc.text("TVA (20%) : " + order.totalTva.toFixed(2) + " DH", 130, finalY + 6);
    doc.setFontSize(12);
    doc.setTextColor(229, 184, 0);
    doc.text("TOTAL TTC : " + order.totalTtc.toFixed(2) + " DH", 130, finalY + 14);

    doc.save(order.orderNumber + ".pdf");
}

function exportOrdersToExcel() {
    const data = state.orders.map(o => ({
        "N° Bon": o.orderNumber,
        "Date": o.date,
        "Commercial": o.commercialName,
        "Client": o.clientName,
        "Total HT (DH)": o.totalHt,
        "TVA (DH)": o.totalTva,
        "Total TTC (DH)": o.totalTtc,
        "Statut": o.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Commandes");
    XLSX.writeFile(workbook, "Bardahl_Export_Commandes.xlsx");
}

// --- CHARTS ---
function initCharts() {
    const ctxMonthly = document.getElementById("chart-monthly-sales");
    if (ctxMonthly) {
        new Chart(ctxMonthly, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août'],
                datasets: [{
                    label: 'Ventes (DH)',
                    data: [85000, 92000, 110000, 105000, 128000, 140000, 135000, 148500],
                    backgroundColor: '#FFD000',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9EA6B8' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9EA6B8' } }
                }
            }
        });
    }

    const ctxCat = document.getElementById("chart-category-sales");
    if (ctxCat) {
        new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: ['Lubrifiants Auto', 'Graisses', 'Aérosols', 'Fluides & AdBlue'],
                datasets: [{
                    data: [45, 25, 18, 12],
                    backgroundColor: ['#FFD000', '#007AFF', '#FF9500', '#34C759']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#F2F4F8' } } }
            }
        });
    }
}
