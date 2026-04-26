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
    
    try {
        // Vérifier que Supabase est connecté
        const supabaseConnected = (typeof supabase !== 'undefined' && supabase !== null) || 
                                   (typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null);
        
        if (typeof getAllParticipants === 'function' && supabaseConnected) {
            participants = await getAllParticipants();
        } else {
            throw new Error('Supabase non connecté - Vérifie la console pour les erreurs');
        }
        
        renderParticipants(participants);
        updateStats();
        
    } catch (error) {
        console.error('Erreur chargement:', error);
        showToast('Erreur lors du chargement des participants', 'error');
    } finally {
        showLoading(false);
    }
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

async function generateQRCode(participant) {
    const qrData = JSON.stringify({
        id: participant.id,
        nom: participant.nom,
        prenom: participant.prenom,
        email: participant.email,
        event: 'EventJeunes 2026'
    });
    
    try {
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, qrData, {
            width: 256,
            margin: 2,
            color: {
                dark: '#6366f1',
                light: '#ffffff'
            }
        });
        
        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Erreur QR:', error);
        throw error;
    }
}

async function showQRModal(participantId) {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;
    
    currentQRParticipant = participant;
    
    const qrInfo = document.getElementById('qrInfo');
    qrInfo.textContent = `${participant.prenom} ${participant.nom} - ${participant.email}`;
    
    // Générer ou récupérer le QR
    let qrCode = participant.qr_code;
    if (!qrCode) {
        try {
            qrCode = await generateQRCode(participant);
            
            // Sauvegarder dans Supabase
            if (typeof updateQRCode === 'function') {
                await updateQRCode(participant.id, qrCode);
            }
            
            // Mettre à jour localement
            participant.qr_code = qrCode;
            renderParticipants(participants);
            updateStats();
            
        } catch (error) {
            showToast('Erreur lors de la génération du QR', 'error');
            return;
        }
    }
    
    // Afficher le QR
    const canvas = document.getElementById('qrCanvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
    };
    img.src = qrCode;
    
    document.getElementById('qrModal').classList.remove('hidden');
}

function closeQRModal() {
    document.getElementById('qrModal').classList.add('hidden');
    currentQRParticipant = null;
}

function downloadQR() {
    if (!currentQRParticipant) return;
    
    const canvas = document.getElementById('qrCanvas');
    const link = document.createElement('a');
    link.download = `qr-${currentQRParticipant.prenom}-${currentQRParticipant.nom}.png`;
    link.href = canvas.toDataURL('image/png');
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

// ===== EMAIL SYSTEM =====

function generateEmailTemplate(participant, qrCode) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #ec4899); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px;">🎉 Bienvenue ${escapeHtml(participant.prenom)} !</h1>
                <p style="margin: 10px 0 0; font-size: 16px;">Ta place est réservée pour EventJeunes 2026</p>
            </div>
            
            <div style="padding: 30px; background: #f8fafc;">
                <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    Bonjour <strong>${escapeHtml(participant.prenom)} ${escapeHtml(participant.nom)}</strong>,<br><br>
                    Nous avons le plaisir de confirmer ton inscription à notre événement !
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #6366f1;">
                    <h3 style="margin: 0 0 15px; color: #6366f1;">📋 Récapitulatif</h3>
                    <p style="margin: 5px 0; color: #666;"><strong>Nom:</strong> ${escapeHtml(participant.nom)}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Prénom:</strong> ${escapeHtml(participant.prenom)}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${escapeHtml(participant.email)}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Date d'inscription:</strong> ${formatDate(participant.date_inscription)}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <p style="font-size: 16px; color: #333; margin-bottom: 15px;">🎟️ Voici ton QR Code unique :</p>
                    <div style="display: inline-block; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        ${qrCode ? `<img src="${qrCode}" alt="QR Code" style="max-width: 200px;">` : '<p>QR Code à venir</p>'}
                    </div>
                    <p style="font-size: 13px; color: #666; margin-top: 15px;">
                        Présente ce QR Code à l'entrée de l'événement
                    </p>
                </div>
                
                <div style="background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px; color: #f59e0b;">📅 Programme</h3>
                    <p style="margin: 0; color: #666; line-height: 1.6;">
                        Date: À définir<br>
                        Lieu: À définir<br>
                        Heure: À définir
                    </p>
                </div>
                
                <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
                    À très bientôt !<br>
                    <strong>L'équipe EventJeunes</strong>
                </p>
            </div>
            
            <div style="background: #1e293b; padding: 20px; text-align: center;">
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                    &copy; 2026 EventJeunes - Tous droits réservés
                </p>
            </div>
        </div>
    `;
}

async function sendEmail(participant, qrCode) {
    try {
        // Avec EmailJS
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_email: participant.email,
            to_name: `${participant.prenom} ${participant.nom}`,
            message: generateEmailTemplate(participant, qrCode),
            reply_to: 'contact@eventjeunes.com'
        });
        
        return true;
    } catch (error) {
        console.error('Erreur EmailJS:', error);
        showToast('Erreur lors de l\'envoi de l\'email', 'error');
        return false;
    }
}

async function showEmailModal(participantId) {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;
    
    currentEmailParticipant = participant;
    
    // Générer le QR s'il n'existe pas
    let qrCode = participant.qr_code;
    if (!qrCode) {
        try {
            qrCode = await generateQRCode(participant);
            participant.qr_code = qrCode;
        } catch (e) {
            qrCode = null;
        }
    }
    
    const preview = document.getElementById('emailPreview');
    preview.innerHTML = generateEmailTemplate(participant, qrCode);
    
    document.getElementById('emailModal').classList.remove('hidden');
}

function closeEmailModal() {
    document.getElementById('emailModal').classList.add('hidden');
    currentEmailParticipant = null;
}

async function confirmSendEmail() {
    if (!currentEmailParticipant) return;
    
    try {
        await sendEmail(currentEmailParticipant, currentEmailParticipant.qr_code);
        closeEmailModal();
        showToast('Email envoyé avec succès !', 'success');
    } catch (error) {
        showToast('Erreur lors de l\'envoi', 'error');
    }
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
    
    // Charger les données si nécessaire
    if (sectionName === 'donations') {
        loadDonations();
    }
}

// ===== DONATIONS MANAGEMENT =====

async function loadDonations() {
    loadingDonations?.classList.remove('hidden');
    donationsTable?.classList.add('hidden');
    
    try {
        // Vérifier que Supabase est connecté
        const supabaseConnected = (typeof supabase !== 'undefined' && supabase !== null) || 
                                   (typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null);
        
        if (typeof getAllDonations === 'function' && supabaseConnected) {
            donations = await getAllDonations();
        } else {
            throw new Error('Supabase non connecté - Vérifie la console pour les erreurs');
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
        const supabaseInstance = (typeof supabase !== 'undefined' && supabase) ? supabase : 
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

document.addEventListener('DOMContentLoaded', () => {
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
