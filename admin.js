// ============================================
// ADMIN PANEL - MAIN JS
// ============================================

// ===== CONFIGURATION =====
// Remplace ces valeurs par tes propres credentials
const EMAILJS_PUBLIC_KEY = 'votre_cle_emailjs';
const EMAILJS_SERVICE_ID = 'votre_service_id';
const EMAILJS_TEMPLATE_ID = 'votre_template_id';

// EmailJS Initialisation
try {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    console.log('✅ EmailJS initialisé');
} catch (e) {
    console.warn('⚠️ EmailJS non configuré');
}

// ===== STATE =====
let participants = [];
let donations = [];
let currentQRParticipant = null;
let currentEmailParticipant = null;
let currentPaymentParticipant = null;
let currentDonation = null;

// ===== DOM ELEMENTS =====
const participantsTable = document.getElementById('participantsTable');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const searchInput = document.getElementById('searchInput');
const toastContainer = document.getElementById('toastContainer');

// Stats elements
const totalParticipantsEl = document.getElementById('totalParticipants');
const todayRegistrationsEl = document.getElementById('todayRegistrations');
const qrGeneratedEl = document.getElementById('qrGenerated');
const emailsSentEl = document.getElementById('emailsSent');
const paymentsVerifiedEl = document.getElementById('paymentsVerified');

// Donation elements
const donationsTable = document.getElementById('donationsTable');
const emptyDonationsState = document.getElementById('emptyDonationsState');
const loadingDonations = document.getElementById('loadingDonations');

// ===== UTILITY FUNCTIONS =====

function showLoading(show) {
    if (loadingState) {
        if (show) {
            loadingState.classList.remove('hidden');
            if (participantsTable) participantsTable.classList.add('hidden');
            if (emptyState) emptyState.classList.add('hidden');
        } else {
            loadingState.classList.add('hidden');
        }
    }
}

// ===== AUTH CHECK =====
function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (!isLoggedIn) {
        window.location.href = 'index.html';
    }
}

function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminEmail');
    sessionStorage.removeItem('adminNom');
    window.location.href = 'index.html';
}

// ===== PARTICIPANTS MANAGEMENT =====

async function loadParticipants() {
    showLoading(true);
    console.log('🔄 Chargement des participants...');
    
    try {
        console.log('🔍 window.supabaseClient:', window.supabaseClient ? 'OK' : 'Non trouvé');
        console.log('🔍 getAllParticipants:', typeof getAllParticipants === 'function' ? 'OK' : 'Non trouvée');
        
        if (typeof getAllParticipants !== 'function') {
            throw new Error('Fonction getAllParticipants manquante - vérifier supabase.js');
        }
        if (!window.supabaseClient) {
            throw new Error('Supabase non connecté - vérifier les credentials');
        }
        
        console.log('📡 Appel getAllParticipants...');
        participants = await getAllParticipants();
        console.log('✅ Participants reçus:', participants?.length || 0);
        
        renderParticipants(participants);
        updateStats();
        
    } catch (error) {
        console.error('❌ Erreur chargement participants:', error);
        console.error('❌ Message:', error.message);
        showToast('Erreur lors du chargement: ' + error.message, 'error');
    } finally {
        showLoading(false);
        console.log('✅ Chargement terminé');
    }
}

// ===== RENDER PARTICIPANTS =====

function renderParticipants(data) {
    console.log('🎨 Rendu des participants:', data?.length || 0);
    
    if (!participantsTable) {
        console.error('❌ Table participants non trouvée');
        return;
    }
    
    // Vider le tableau
    participantsTable.innerHTML = '';
    
    // Afficher état vide si pas de données
    if (!data || data.length === 0) {
        if (emptyState) {
            emptyState.classList.remove('hidden');
            participantsTable.classList.add('hidden');
        }
        return;
    }
    
    // Cacher état vide et afficher tableau
    if (emptyState) emptyState.classList.add('hidden');
    participantsTable.classList.remove('hidden');
    
    // Créer les lignes
    data.forEach(p => {
        const row = document.createElement('tr');
        
        // Statut paiement
        let statusBadge = '';
        if (p.statut_paiement === 'non_requis') {
            statusBadge = '<span class="badge badge-secondary">Non requis</span>';
        } else if (p.statut_paiement === 'en_attente') {
            statusBadge = '<span class="badge badge-warning">En attente</span>';
        } else if (p.statut_paiement === 'verifie') {
            statusBadge = '<span class="badge badge-success">Vérifié</span>';
        } else if (p.statut_paiement === 'refuse') {
            statusBadge = '<span class="badge badge-danger">Refusé</span>';
        }
        
        // Email status
        const emailStatus = p.email_envoye 
            ? '<span class="badge badge-success">Envoyé</span>' 
            : '<span class="badge badge-secondary">Non envoyé</span>';
        
        // QR status
        const qrStatus = p.qr_code 
            ? '<span class="badge badge-success">Généré</span>' 
            : '<span class="badge badge-secondary">Non généré</span>';
        
        // Boutons d'action
        let actionButtons = '';
        
        // Bouton QR
        if (p.qr_code) {
            actionButtons += `<button class="btn-icon btn-view" onclick="showQRModal(${p.id})" title="Voir QR"><i class="fas fa-qrcode"></i></button>`;
        } else if (p.statut_paiement === 'verifie') {
            actionButtons += `<button class="btn-icon btn-generate" onclick="showQRModal(${p.id})" title="Générer QR"><i class="fas fa-plus"></i></button>`;
        }
        
        // Bouton Email
        if (p.email_envoye) {
            actionButtons += `<button class="btn-icon btn-email" onclick="showEmailModal(${p.id})" title="Renvoyer email"><i class="fas fa-redo"></i></button>`;
        } else if (p.qr_code) {
            actionButtons += `<button class="btn-icon btn-email" onclick="showEmailModal(${p.id})" title="Envoyer email"><i class="fas fa-envelope"></i></button>`;
        }
        
        // Bouton paiement - montre si en_attente (avec ou sans preuve)
        if (p.statut_paiement === 'en_attente') {
            const icon = p.preuve_paiement ? 'fa-money-check' : 'fa-clock';
            const title = p.preuve_paiement ? 'Vérifier paiement' : 'Paiement en attente';
            actionButtons += `<button class="btn-icon btn-payment" onclick="showPaymentModal(${p.id})" title="${title}"><i class="fas ${icon}"></i></button>`;
        }
        
        // Bouton supprimer
        actionButtons += `<button class="btn-icon btn-delete" onclick="deleteParticipantItem(${p.id})" title="Supprimer"><i class="fas fa-trash"></i></button>`;
        
        row.innerHTML = `
            <td>${p.nom || '-'}</td>
            <td>${p.prenom || '-'}</td>
            <td>${p.email}</td>
            <td>${p.telephone || '-'}</td>
            <td>${statusBadge}</td>
            <td>${qrStatus}</td>
            <td>${emailStatus}</td>
            <td class="actions">${actionButtons}</td>
        `;
        
        participantsTable.appendChild(row);
    });
}

// ===== SEARCH =====
searchInput.addEventListener('input', async (e) => {
    const term = e.target.value.trim().toLowerCase();
    
    if (!term) {
        renderParticipants(participants);
        return;
    }
    
    try {
        let filtered;
        if (typeof searchParticipants === 'function') {
            filtered = await searchParticipants(term);
        } else {
            filtered = participants.filter(p => 
                p.nom.toLowerCase().includes(term) ||
                p.prenom.toLowerCase().includes(term) ||
                p.email.toLowerCase().includes(term)
            );
        }
        renderParticipants(filtered);
    } catch (error) {
        console.error('Erreur recherche:', error);
    }
});

// ===== QR CODE SYSTEM =====
// Utilise l'API gratuite api.qrserver.com (pas besoin de librairie)

function getQRUrl(participant) {
    const data = JSON.stringify({
        id: participant.id,
        nom: participant.nom,
        prenom: participant.prenom,
        email: participant.email,
        event: 'Rasin Ayiti 2026'
    });
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&color=4f46e5&bgcolor=ffffff&data=${encodeURIComponent(data)}`;
}

async function generateQRCode(participant) {
    return getQRUrl(participant);
}

async function showQRModal(participantId) {
    const participant = participants.find(p => p.id == participantId);
    if (!participant) { showToast('Participant non trouvé', 'error'); return; }
    
    currentQRParticipant = participant;
    
    const qrInfo = document.getElementById('qrInfo');
    if (qrInfo) qrInfo.textContent = `${participant.prenom} ${participant.nom} \u2014 ${participant.email}`;
    
    // Générer URL du QR
    const qrUrl = getQRUrl(participant);
    
    // Afficher dans l'image du modal
    const qrImg = document.getElementById('qrImage');
    if (qrImg) {
        qrImg.src = qrUrl;
        qrImg.alt = `QR Code - ${participant.prenom} ${participant.nom}`;
    }
    
    // Sauvegarder l'URL dans Supabase si pas encore fait
    if (!participant.qr_code && typeof updateQRCode === 'function' && window.supabaseClient) {
        try {
            await updateQRCode(participant.id, qrUrl);
            participant.qr_code = qrUrl;
            renderParticipants(participants);
            updateStats();
        } catch (e) {
            console.warn('⚠️ QR non sauvegardé:', e.message);
        }
    }
    
    const modal = document.getElementById('qrModal');
    if (modal) modal.classList.remove('hidden');
}

function closeQRModal() {
    document.getElementById('qrModal').classList.add('hidden');
    currentQRParticipant = null;
}

function downloadQR() {
    if (!currentQRParticipant) return;
    const qrUrl = getQRUrl(currentQRParticipant);
    const link = document.createElement('a');
    link.download = `qr-${currentQRParticipant.prenom}-${currentQRParticipant.nom}.png`;
    link.href = qrUrl;
    link.target = '_blank';
    link.click();
    showToast('QR Code téléchargé !', 'success');
}

async function generateAllQR() {
    const withoutQR = participants.filter(p => !p.qr_code);
    
    if (withoutQR.length === 0) {
        showToast('Tous les participants ont déjà un QR code', 'info');
        return;
    }
    
    let generated = 0;
    for (const participant of withoutQR) {
        try {
            const qrCode = await generateQRCode(participant);
            
            if (typeof updateQRCode === 'function') {
                await updateQRCode(participant.id, qrCode);
            }
            
            participant.qr_code = qrCode;
            generated++;
            
        } catch (error) {
            console.error(`Erreur QR pour ${participant.email}:`, error);
        }
    }
    
    renderParticipants(participants);
    updateStats();
    showToast(`${generated} QR codes générés`, 'success');
}

// ===== EMAIL SYSTEM (via Gmail / client email) =====

function buildEmailBody(participant) {
    const qrUrl = getQRUrl(participant);
    return `Bonjour ${participant.prenom} ${participant.nom},

Nous avons le plaisir de confirmer votre inscription au :

SEMINAIRE SUR LES COMPETENCES DE VIE
5 SECRETS POUR REUSSIR COMME JEUNE ET DEVENIR CREATEUR D'OPPORTUNITES EN HAITI

Organise par : RASIN AYITI x Universite de Technologie d'Haiti (UNITECH)

------- DETAILS DE L'EVENEMENT -------
Date   : 30 Avril et 1er Mai 2026
Heure  : 09:00 AM - 01:00 PM
Contact: +509 46807922

------- VOS INFORMATIONS -------
Nom    : ${participant.nom}
Prenom : ${participant.prenom}
Email  : ${participant.email}
Tel    : ${participant.telephone || '-'}

------- VOTRE QR CODE -------
Veuillez presenter ce lien a l'entree de l'evenement :
${qrUrl}

Apprenez a avoir du succes, creer des opportunites, depasser vos blocages.

A tres bientot !
L'equipe Rasin Ayiti`;
}

function showEmailModal(participantId) {
    const participant = participants.find(p => p.id == participantId);
    if (!participant) return;
    
    currentEmailParticipant = participant;
    
    // Afficher info participant dans le preview
    const preview = document.getElementById('emailPreview');
    if (preview) {
        preview.innerHTML = `
            <div style="font-family:monospace; font-size:0.82rem; background:#f8fafc; padding:16px; border-radius:8px; white-space:pre-wrap; border:1px solid #e5e7eb; max-height:320px; overflow-y:auto;">${escapeHtml(buildEmailBody(participant))}</div>
        `;
    }
    
    // Mettre à jour le destinataire affiché
    const recipientEl = document.getElementById('emailRecipient');
    if (recipientEl) recipientEl.textContent = `${participant.prenom} ${participant.nom} <${participant.email}>`;
    
    document.getElementById('emailModal').classList.remove('hidden');
}

function closeEmailModal() {
    document.getElementById('emailModal').classList.add('hidden');
    currentEmailParticipant = null;
}

async function confirmSendEmail() {
    if (!currentEmailParticipant) return;
    const p = currentEmailParticipant;
    
    const subject = encodeURIComponent('Confirmation - Séminaire Compétences de Vie | Rasin Ayiti');
    const body = encodeURIComponent(buildEmailBody(p));
    const mailtoLink = `mailto:${p.email}?subject=${subject}&body=${body}`;
    
    // Ouvrir Gmail / client email
    window.open(mailtoLink, '_blank');
    
    // Marquer comme envoyé
    try {
        if (typeof markEmailSent === 'function' && window.supabaseClient) {
            await markEmailSent(p.id);
        }
        p.email_envoye = true;
        renderParticipants(participants);
        updateStats();
    } catch (e) {
        console.warn('Impossible de marquer email:', e.message);
    }
    
    closeEmailModal();
    showToast('Application email ouverte !', 'success');
}

async function sendAllEmails() {
    const withoutEmail = participants.filter(p => !p.email_sent);
    
    if (withoutEmail.length === 0) {
        showToast('Tous les emails ont déjà été envoyés', 'info');
        return;
    }
    
    let sent = 0;
    for (const participant of withoutEmail) {
        try {
            if (!participant.qr_code) {
                participant.qr_code = await generateQRCode(participant);
            }
            
            await sendEmail(participant, participant.qr_code);
            participant.email_sent = true;
            sent++;
            
        } catch (error) {
            console.error(`Erreur email pour ${participant.email}:`, error);
        }
    }
    
    updateStats();
    showToast(`${sent} emails envoyés`, 'success');
}

// ===== DELETE PARTICIPANT =====

async function deleteParticipantItem(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce participant ?')) return;
    
    try {
        if (typeof deleteParticipant === 'function') {
            await deleteParticipant(id);
        }
        
        participants = participants.filter(p => p.id !== id);
        renderParticipants(participants);
        updateStats();
        
        showToast('Participant supprimé', 'success');
    } catch (error) {
        showToast('Erreur lors de la suppression', 'error');
    }
}

// ===== STATS =====

function updateStats() {
    totalParticipantsEl.textContent = participants.length;
    
    const today = new Date().toDateString();
    const todayCount = participants.filter(p => 
        new Date(p.date_inscription).toDateString() === today
    ).length;
    todayRegistrationsEl.textContent = todayCount;
    
    const qrCount = participants.filter(p => p.qr_code).length;
    qrGeneratedEl.textContent = qrCount;
    
    const emailCount = participants.filter(p => p.email_envoye).length;
    emailsSentEl.textContent = emailCount;
    
    const paymentCount = participants.filter(p => p.statut_paiement === 'verifie').length;
    paymentsVerifiedEl.textContent = paymentCount;
}

// ===== PAYMENT VERIFICATION =====

function showPaymentModal(participantId) {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;
    
    currentPaymentParticipant = participant;
    
    // Remplir les infos
    document.getElementById('paymentParticipantName').textContent = 
        `${participant.prenom} ${participant.nom}`;
    document.getElementById('paymentMethod').textContent = 
        participant.mode_paiement ? participant.mode_paiement.toUpperCase() : '-';
    document.getElementById('paymentPhone').textContent = 
        participant.telephone || '-';
    
    // Afficher l'image de preuve
    const proofImg = document.getElementById('paymentProofImage');
    if (participant.preuve_paiement) {
        proofImg.src = participant.preuve_paiement;
        proofImg.classList.remove('hidden');
    } else {
        proofImg.classList.add('hidden');
    }
    
    document.getElementById('paymentModal').classList.remove('hidden');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.add('hidden');
    currentPaymentParticipant = null;
}

async function verifyPayment() {
    if (!currentPaymentParticipant) return;
    
    const participant = currentPaymentParticipant;
    
    try {
        // 1. Mettre à jour le statut de paiement
        if (typeof updatePaymentStatus === 'function') {
            await updatePaymentStatus(participant.id, 'verifie');
        }
        participant.statut_paiement = 'verifie';
        
        // 2. Générer le QR code
        let qrCode = participant.qr_code;
        if (!qrCode) {
            qrCode = await generateQRCode(participant);
            participant.qr_code = qrCode;
            
            if (typeof updateQRCode === 'function') {
                await updateQRCode(participant.id, qrCode);
            }
        }
        
        // 3. Envoyer l'email avec QR code
        await sendEmail(participant, qrCode);
        
        // 4. Marquer email comme envoyé
        if (typeof markEmailSent === 'function') {
            await markEmailSent(participant.id);
        }
        participant.email_envoye = true;
        
        // 5. Mettre à jour l'affichage
        closePaymentModal();
        renderParticipants(participants);
        updateStats();
        
        showToast('Paiement vérifié et QR code envoyé !', 'success');
        
    } catch (error) {
        console.error('Erreur vérification:', error);
        showToast('Erreur: ' + error.message, 'error');
    }
}

async function rejectPayment() {
    if (!currentPaymentParticipant) return;
    
    if (!confirm('Êtes-vous sûr de vouloir refuser ce paiement ?')) return;
    
    try {
        if (typeof updatePaymentStatus === 'function') {
            await updatePaymentStatus(currentPaymentParticipant.id, 'refuse');
        }
        
        currentPaymentParticipant.statut_paiement = 'refuse';
        
        closePaymentModal();
        renderParticipants(participants);
        updateStats();
        
        showToast('Paiement refusé', 'warning');
    } catch (error) {
        showToast('Erreur lors du refus', 'error');
    }
}

// ===== UTILS =====

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
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== SECTION NAVIGATION =====

function showSection(sectionName) {
    // Cacher toutes les sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    // Afficher la section demandée
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Mettre à jour le menu actif
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active');
    
    // Charger les données selon la section
    if (sectionName === 'donations') {
        loadDonations();
    } else if (sectionName === 'emails') {
        renderEmailsSection();
    } else if (sectionName === 'qrcodes') {
        renderQRCodesSection();
    } else if (sectionName === 'stats') {
        renderStatsSection();
    }
}

function renderEmailsSection() {
    const tbody = document.getElementById('emailsTable');
    const emptyEl = document.getElementById('emptyEmailsState');
    if (!tbody) return;
    
    if (!participants || participants.length === 0) {
        tbody.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');
    
    tbody.innerHTML = participants.map(p => {
        const qrStatus = p.qr_code
            ? '<span class="badge badge-success">Généré</span>'
            : '<span class="badge badge-secondary">Non généré</span>';
        const emailStatus = p.email_envoye
            ? '<span class="badge badge-success">Envoyé</span>'
            : '<span class="badge badge-warning">Non envoyé</span>';
        const canSend = p.qr_code;
        return `<tr>
            <td>${p.nom || '-'}</td>
            <td>${p.prenom || '-'}</td>
            <td>${p.email}</td>
            <td>${qrStatus}</td>
            <td>${emailStatus}</td>
            <td class="actions">
                ${canSend ? `<button class="btn-icon btn-email" onclick="showEmailModal(${p.id})" title="Envoyer email"><i class="fas fa-envelope"></i></button>` : '<span style="color:var(--text-muted);font-size:0.8rem;">Générer QR d\'abord</span>'}
            </td>
        </tr>`;
    }).join('');
}

function renderQRCodesSection() {
    const tbody = document.getElementById('qrcodesTable');
    const emptyEl = document.getElementById('emptyQRState');
    if (!tbody) return;
    
    if (!participants || participants.length === 0) {
        tbody.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');
    
    tbody.innerHTML = participants.map(p => {
        let statusBadge = '';
        if (p.statut_paiement === 'non_requis') statusBadge = '<span class="badge badge-secondary">Non requis</span>';
        else if (p.statut_paiement === 'en_attente') statusBadge = '<span class="badge badge-warning">En attente</span>';
        else if (p.statut_paiement === 'verifie') statusBadge = '<span class="badge badge-success">Vérifié</span>';
        else if (p.statut_paiement === 'refuse') statusBadge = '<span class="badge badge-danger">Refusé</span>';
        
        const qrStatus = p.qr_code
            ? '<span class="badge badge-success">Généré</span>'
            : '<span class="badge badge-secondary">Non généré</span>';
        
        return `<tr>
            <td>${p.nom || '-'}</td>
            <td>${p.prenom || '-'}</td>
            <td>${p.email}</td>
            <td>${statusBadge}</td>
            <td>${qrStatus}</td>
            <td class="actions">
                ${p.qr_code
                    ? `<button class="btn-icon btn-view" onclick="showQRModal(${p.id})" title="Voir QR"><i class="fas fa-eye"></i></button>`
                    : `<button class="btn-icon btn-generate" onclick="showQRModal(${p.id})" title="Générer QR"><i class="fas fa-qrcode"></i></button>`
                }
            </td>
        </tr>`;
    }).join('');
}

function renderStatsSection() {
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    set('statsTotalParticipants', participants.length);
    set('statsVerifiedPayments', participants.filter(p => p.statut_paiement === 'verifie').length);
    set('statsQRGenerated', participants.filter(p => p.qr_code).length);
    set('statsEmailsSent', participants.filter(p => p.email_envoye).length);
    set('statsPendingPayments', participants.filter(p => p.statut_paiement === 'en_attente').length);
    set('statsRefusedPayments', participants.filter(p => p.statut_paiement === 'refuse').length);
}

// ===== DONATIONS MANAGEMENT =====

async function loadDonations() {
    loadingDonations?.classList.remove('hidden');
    donationsTable?.classList.add('hidden');
    
    try {
        if (typeof getAllDonations === 'function' && window.supabaseClient) {
            donations = await getAllDonations();
        } else {
            throw new Error('Supabase non connecté');
        }
        
        renderDonations();
        updateDonationStats();
        updateDonationBadge();
        
    } catch (error) {
        console.error('Erreur chargement donations:', error);
        showToast('Erreur lors du chargement des donations', 'error');
    } finally {
        loadingDonations?.classList.add('hidden');
        donationsTable?.classList.remove('hidden');
    }
}


function renderDonations() {
    if (!donationsTable) return;
    
    if (donations.length === 0) {
        donationsTable.innerHTML = '';
        emptyDonationsState?.classList.remove('hidden');
        return;
    }
    
    emptyDonationsState?.classList.add('hidden');
    
    // Trier par date décroissante
    const sorted = [...donations].sort((a, b) => new Date(b.date_don) - new Date(a.date_don));
    
    donationsTable.innerHTML = sorted.map(d => {
        const name = d.type_donateur === 'anonymous' ? 'Anonyme' : `${d.prenom} ${d.nom}`;
        
        let statusBadge = '';
        let canVerify = false;
        
        switch(d.statut) {
            case 'verifie':
                statusBadge = '<span class="badge badge-success"><i class="fas fa-check"></i> Vérifié</span>';
                break;
            case 'refuse':
                statusBadge = '<span class="badge badge-error"><i class="fas fa-times"></i> Refusé</span>';
                break;
            case 'en_attente':
            default:
                statusBadge = '<span class="badge badge-warning"><i class="fas fa-clock"></i> En attente</span>';
                canVerify = true;
                break;
        }
        
        return `
        <tr data-id="${d.id}">
            <td>${escapeHtml(name)}</td>
            <td><strong>${d.montant} Gds</strong></td>
            <td>${d.mode_paiement?.toUpperCase() || '-'}</td>
            <td>${escapeHtml(d.telephone)}</td>
            <td>${formatDate(d.date_don)}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="actions">
                    ${canVerify ? `<button class="btn-action btn-icon btn-success" onclick="showDonationVerifyModal(${d.id})" title="Vérifier"><i class="fas fa-check"></i></button>` : ''}
                    <button class="btn-action btn-icon btn-secondary" onclick="window.open('${d.preuve_paiement}', '_blank')" title="Voir preuve" ${!d.preuve_paiement ? 'disabled' : ''}><i class="fas fa-image"></i></button>
                    <button class="btn-action btn-icon btn-danger" onclick="deleteDonation(${d.id})" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

function updateDonationStats() {
    const totalEl = document.getElementById('totalDonations');
    const verifiedEl = document.getElementById('verifiedDonations');
    const pendingEl = document.getElementById('pendingDonations');
    const amountEl = document.getElementById('totalDonationAmount');
    
    if (totalEl) totalEl.textContent = donations.length;
    if (verifiedEl) verifiedEl.textContent = donations.filter(d => d.statut === 'verifie').length;
    if (pendingEl) pendingEl.textContent = donations.filter(d => d.statut === 'en_attente').length;
    
    const totalAmount = donations
        .filter(d => d.statut === 'verifie')
        .reduce((sum, d) => sum + d.montant, 0);
    if (amountEl) amountEl.textContent = totalAmount.toLocaleString() + ' Gds';
}

function updateDonationBadge() {
    const badge = document.getElementById('pendingDonationsBadge');
    if (badge) {
        const pending = donations.filter(d => d.statut === 'en_attente').length;
        badge.textContent = pending;
        badge.style.display = pending > 0 ? 'inline-flex' : 'none';
    }
}

function showDonationVerifyModal(donationId) {
    const donation = donations.find(d => d.id === donationId);
    if (!donation) return;
    
    currentDonation = donation;
    
    const name = donation.type_donateur === 'anonymous' ? 'Anonyme' : `${donation.prenom} ${donation.nom}`;
    
    document.getElementById('donationVerifyName').textContent = name;
    document.getElementById('donationVerifyAmount').textContent = donation.montant + ' Gds';
    document.getElementById('donationVerifyMethod').textContent = donation.mode_paiement?.toUpperCase() || '-';
    document.getElementById('donationVerifyPhone').textContent = donation.telephone || '-';
    
    const img = document.getElementById('donationVerifyImage');
    if (donation.preuve_paiement) {
        img.src = donation.preuve_paiement;
        img.classList.remove('hidden');
    } else {
        img.classList.add('hidden');
    }
    
    document.getElementById('donationVerifyModal').classList.remove('hidden');
}

function closeDonationVerifyModal() {
    document.getElementById('donationVerifyModal').classList.add('hidden');
    currentDonation = null;
}

async function verifyDonation() {
    if (!currentDonation) return;
    
    try {
        if (typeof updateDonationStatus === 'function') {
            await updateDonationStatus(currentDonation.id, 'verifie');
        }
        
        currentDonation.statut = 'verifie';
        
        closeDonationVerifyModal();
        renderDonations();
        updateDonationStats();
        updateDonationBadge();
        
        showToast('Donation vérifiée avec succès !', 'success');
    } catch (error) {
        showToast('Erreur lors de la vérification', 'error');
    }
}

async function rejectDonation() {
    if (!currentDonation) return;
    
    if (!confirm('Êtes-vous sûr de vouloir refuser cette donation ?')) return;
    
    try {
        if (typeof updateDonationStatus === 'function') {
            await updateDonationStatus(currentDonation.id, 'refuse');
        }
        
        currentDonation.statut = 'refuse';
        
        closeDonationVerifyModal();
        renderDonations();
        updateDonationStats();
        updateDonationBadge();
        
        showToast('Donation refusée', 'warning');
    } catch (error) {
        showToast('Erreur lors du refus', 'error');
    }
}

async function deleteDonation(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette donation ?')) return;
    
    try {
        // Vérifier que Supabase est connecté
        const supabaseInstance = (typeof supabaseClient !== 'undefined' && supabaseClient) ? supabaseClient : 
                                (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) ? window.supabaseClient : null;
        
        if (supabaseInstance) {
            const { error } = await supabaseInstance.from('donations').delete().eq('id', id);
            if (error) throw error;
        } else {
            throw new Error('Supabase non connecté');
        }
        
        donations = donations.filter(d => d.id !== id);
        renderDonations();
        updateDonationStats();
        updateDonationBadge();
        
        showToast('Donation supprimée', 'success');
    } catch (error) {
        showToast('Erreur lors de la suppression', 'error');
    }
}

// ===== NAVIGATION =====

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
    });
});

// ===== INITIALISATION =====

// Exposer les fonctions globalement pour les onclick
window.renderParticipants = renderParticipants;
window.showQRModal = showQRModal;
window.closeQRModal = closeQRModal;
window.downloadQR = downloadQR;
window.showEmailModal = showEmailModal;
window.closeEmailModal = closeEmailModal;
window.confirmSendEmail = confirmSendEmail;
window.showPaymentModal = showPaymentModal;
window.closePaymentModal = closePaymentModal;
window.verifyPayment = verifyPayment;
window.rejectPayment = rejectPayment;
window.deleteParticipantItem = deleteParticipantItem;
window.generateAllQR = generateAllQR;
window.sendAllEmails = sendAllEmails;
window.logout = logout;
window.showSection = showSection;
window.showDonationVerifyModal = showDonationVerifyModal;
window.closeDonationVerifyModal = closeDonationVerifyModal;
window.verifyDonation = verifyDonation;
window.rejectDonation = rejectDonation;
window.deleteDonation = deleteDonation;
window.loadDonations = loadDonations;
window.loadParticipants = loadParticipants;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initialisation Admin Panel...');
    console.log('🔍 renderParticipants défini:', typeof renderParticipants === 'function');
    console.log('🔍 loadParticipants défini:', typeof loadParticipants === 'function');
    
    checkAuth();
    loadParticipants();
    
    // Afficher l'email de l'admin connecté
    const adminEmail = sessionStorage.getItem('adminEmail');
    const adminNom = sessionStorage.getItem('adminNom');
    if (adminEmail && document.getElementById('adminEmailDisplay')) {
        document.getElementById('adminEmailDisplay').textContent = adminNom || adminEmail;
    }
    
    console.log('🔧 Panel Admin chargé');
});
