// ============================================
// PAYMENT PAGE - JS
// ============================================

// Numéros de paiement (à personnaliser)
const PAYMENT_NUMBERS = {
    moncash: '+509 47 11 1111',
    natcash: '+509 38 22 2222'
};

// Récupérer l'ID du participant depuis l'URL ou sessionStorage
function getParticipantId() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        sessionStorage.setItem('pendingParticipantId', id);
        return id;
    }
    return sessionStorage.getItem('pendingParticipantId');
}

// Récupérer l'email du participant
function getParticipantEmail() {
    return sessionStorage.getItem('pendingParticipantEmail') || '';
}

// DOM Elements
const paymentForm = document.getElementById('paymentForm');
const waitingMessage = document.getElementById('waitingMessage');
const paymentFormElement = document.getElementById('paymentFormElement');
const submitBtn = document.getElementById('submitBtn');
const fileUpload = document.getElementById('fileUpload');
const previewImage = document.getElementById('previewImage');
const preuveFile = document.getElementById('preuveFile');
const phoneNumberSection = document.getElementById('phoneNumberSection');
const displayPhone = document.getElementById('displayPhone');
const userEmailEl = document.getElementById('userEmail');
const modePaiementInput = document.getElementById('modePaiement');

let selectedFile = null;

// Vérifier si déjà soumis
function checkStatus() {
    const participantId = getParticipantId();
    const email = getParticipantEmail();
    
    if (!participantId) {
        window.location.href = 'index.html';
        return;
    }
    
    userEmailEl.textContent = email;
    
    // Afficher le formulaire
    paymentForm.style.display = 'block';
}

// Sélectionner méthode de paiement
function selectMethod(method) {
    // Reset all
    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
    
    // Select clicked
    const selected = document.querySelector(`[data-method="${method}"]`);
    if (selected) {
        selected.classList.add('selected');
        modePaiementInput.value = method;
        
        // Show phone number
        phoneNumberSection.style.display = 'block';
        displayPhone.textContent = PAYMENT_NUMBERS[method];
        
        // Clear error
        document.getElementById('methodError').textContent = '';
    }
}

// Gérer sélection fichier
function handleFileSelect(input) {
    if (input.files && input.files[0]) {
        selectedFile = input.files[0];
        
        // Vérifier taille
        if (selectedFile.size > 5 * 1024 * 1024) {
            showToast('Le fichier est trop grand (max 5MB)', 'error');
            selectedFile = null;
            return;
        }
        
        // Afficher preview
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewImage.classList.remove('hidden');
            fileUpload.classList.add('has-file');
            fileUpload.querySelector('p').innerHTML = `<span class="filename">${selectedFile.name}</span>`;
            document.getElementById('fileError').textContent = '';
        };
        reader.readAsDataURL(selectedFile);
    }
}

// Validation
function validateForm() {
    let isValid = true;
    
    // Mode paiement
    if (!modePaiementInput.value) {
        document.getElementById('methodError').textContent = 'Sélectionne un mode de paiement';
        isValid = false;
    }
    
    // Téléphone
    const telephone = document.getElementById('telephone').value.trim();
    if (!telephone) {
        document.getElementById('telephoneError').textContent = 'Le numéro de téléphone est obligatoire';
        isValid = false;
    } else if (!/^[\d\s\+\-\(\)]{8,}$/.test(telephone)) {
        document.getElementById('telephoneError').textContent = 'Numéro de téléphone invalide';
        isValid = false;
    } else {
        document.getElementById('telephoneError').textContent = '';
    }
    
    // Fichier
    if (!selectedFile) {
        document.getElementById('fileError').textContent = 'La preuve de paiement est obligatoire';
        isValid = false;
    } else {
        document.getElementById('fileError').textContent = '';
    }
    
    return isValid;
}

// Soumettre paiement
paymentFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const participantId = getParticipantId();
    if (!participantId) {
        showToast('Erreur: ID participant manquant', 'error');
        return;
    }
    
    setLoading(true);
    
    try {
        // Upload image
        let preuveUrl = null;
        if (typeof uploadPaymentProof === 'function') {
            preuveUrl = await uploadPaymentProof(selectedFile, participantId);
        } else {
            // Mode démo
            await new Promise(r => setTimeout(r, 1000));
            preuveUrl = 'https://example.com/demo-preuve.jpg';
        }
        
        // Mettre à jour statut paiement
        if (typeof updatePaymentStatus === 'function') {
            await updatePaymentStatus(participantId, 'en_attente', preuveUrl);
        }
        
        // Masquer formulaire, afficher attente
        paymentForm.style.display = 'none';
        waitingMessage.style.display = 'block';
        
        showToast('Paiement soumis avec succès!', 'success');
        
    } catch (error) {
        console.error('Erreur paiement:', error);
        showToast('Erreur lors de l\'envoi: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
});

function setLoading(loading) {
    if (loading) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
    } else {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    
    const icon = toast.querySelector('i');
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    icon.className = `fas ${icons[type] || icons.info}`;
    icon.style.color = type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary)';
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    checkStatus();
});
