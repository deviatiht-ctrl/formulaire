// ============================================
// DONATION PAGE - JS
// ============================================

let allDonations = [];
let currentFilter = 'all';

// Récupérer les donations
async function loadDonations() {
    try {
        if (typeof getAllDonations === 'function' && supabase) {
            allDonations = await getAllDonations();
        } else {
            throw new Error('Supabase non connecté');
        }
        
        // Ne montrer que les donations vérifiées publiquement
        const verifiedDonations = allDonations.filter(d => d.statut === 'verifie');
        renderDonations(verifiedDonations, currentFilter);
        updateTotal(verifiedDonations);
        
    } catch (error) {
        console.error('Erreur chargement donations:', error);
        showEmptyState();
    }
}

// Afficher les donations
function renderDonations(donations, filter) {
    const grid = document.getElementById('donorsGrid');
    const emptyState = document.getElementById('emptyDonors');
    
    // Filtrer
    let filtered = donations;
    if (filter === 'named') {
        filtered = donations.filter(d => d.type_donateur === 'named');
    } else if (filter === 'anonymous') {
        filtered = donations.filter(d => d.type_donateur === 'anonymous');
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    // Trier par montant décroissant
    filtered.sort((a, b) => b.montant - a.montant);
    
    grid.innerHTML = filtered.map(d => {
        const isAnonymous = d.type_donateur === 'anonymous';
        const initials = isAnonymous ? '?' : (d.prenom?.[0] || '') + (d.nom?.[0] || '');
        const name = isAnonymous ? 'Anonyme' : `${d.prenom} ${d.nom}`;
        const badge = isAnonymous ? 
            '<span class="donor-badge"><i class="fas fa-user-secret"></i> Anonyme</span>' : 
            '<span class="donor-badge"><i class="fas fa-heart"></i> Donateur</span>';
        
        return `
            <div class="donor-card ${isAnonymous ? 'anonymous' : ''}">
                <div class="donor-header">
                    <div class="donor-avatar">${initials.toUpperCase()}</div>
                    <div class="donor-info">
                        <h4>${escapeHtml(name)}</h4>
                        <p>${formatDate(d.date_don)}</p>
                    </div>
                </div>
                <div class="donor-amount">${d.montant} Gds</div>
                ${badge}
            </div>
        `;
    }).join('');
}

// Mettre à jour le total
function updateTotal(donations) {
    const total = donations.reduce((sum, d) => sum + d.montant, 0);
    document.getElementById('totalAmount').textContent = total.toLocaleString() + ' Gds';
}

// Filtrer les donateurs
function filterDonors(filter) {
    currentFilter = filter;
    
    // Update UI tabs
    document.querySelectorAll('.donor-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Re-render
    const verifiedDonations = allDonations.filter(d => d.statut === 'verifie');
    renderDonations(verifiedDonations, filter);
}

function showEmptyState() {
    document.getElementById('donorsGrid').innerHTML = '';
    document.getElementById('emptyDonors').classList.remove('hidden');
    document.getElementById('totalAmount').textContent = '0 Gds';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadDonations();
});

// Rafraîchir toutes les 30 secondes
setInterval(loadDonations, 30000);
