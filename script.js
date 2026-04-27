// ============================================
// FORMULAIRE INSCRIPTION - MAIN JS
// ============================================

// Éléments DOM
const form = document.getElementById('registrationForm');
const formCard = document.querySelector('.form-card');
const successCard = document.getElementById('successCard');
const submitBtn = document.getElementById('submitBtn');
const adminModal = document.getElementById('adminModal');
const adminLoginForm = document.getElementById('adminLoginForm');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Champs
const fields = {
    nom: document.getElementById('nom'),
    prenom: document.getElementById('prenom'),
    email: document.getElementById('email'),
    telephone: document.getElementById('telephone')
};

// Messages d'erreur
const errors = {
    nom: document.getElementById('nomError'),
    prenom: document.getElementById('prenomError'),
    email: document.getElementById('emailError'),
    telephone: document.getElementById('telephoneError')
};

// ============================================
// VALIDATION
// ============================================

const validators = {
    nom: (value) => {
        if (!value.trim()) return 'Le nom est obligatoire';
        if (value.trim().length < 2) return 'Le nom doit contenir au moins 2 caractères';
        if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(value)) return 'Le nom contient des caractères invalides';
        return '';
    },
    
    prenom: (value) => {
        if (!value.trim()) return 'Le prénom est obligatoire';
        if (value.trim().length < 2) return 'Le prénom doit contenir au moins 2 caractères';
        if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(value)) return 'Le prénom contient des caractères invalides';
        return '';
    },
    
    email: (value) => {
        if (!value.trim()) return 'L\'email est obligatoire';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Veuillez entrer un email valide';
        return '';
    },

    telephone: (value) => {
        if (!value.trim()) return 'Le numéro de téléphone est obligatoire';
        const cleaned = value.replace(/[\s\-\+\(\)]/g, '');
        if (!/^\d{8,}$/.test(cleaned)) return 'Numéro invalide (min 8 chiffres)';
        return '';
    }
};

function validateField(fieldName) {
    const field = fields[fieldName];
    const errorElement = errors[fieldName];
    const validate = validators[fieldName];
    
    const error = validate(field.value);
    
    if (error) {
        field.classList.add('error');
        field.classList.remove('success');
        errorElement.textContent = error;
        return false;
    } else {
        field.classList.remove('error');
        field.classList.add('success');
        errorElement.textContent = '';
        return true;
    }
}

function validateForm() {
    let isValid = true;
    
    Object.keys(fields).forEach(fieldName => {
        if (!validateField(fieldName)) {
            isValid = false;
        }
    });
    
    return isValid;
}

function clearValidation() {
    Object.keys(fields).forEach(fieldName => {
        const field = fields[fieldName];
        field.classList.remove('error', 'success');
        errors[fieldName].textContent = '';
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

// Validation en temps réel
Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName];
    
    field.addEventListener('blur', () => validateField(fieldName));
    
    field.addEventListener('input', () => {
        if (field.classList.contains('error')) {
            validateField(fieldName);
        }
    });
});

// Soumission du formulaire
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validation
    if (!validateForm()) {
        // Shake animation sur le formulaire
        formCard.classList.add('shake');
        setTimeout(() => formCard.classList.remove('shake'), 500);
        
        // Focus sur le premier champ avec erreur
        const firstError = document.querySelector('.error');
        if (firstError) firstError.focus();
        
        showToast('Veuillez corriger les erreurs', 'error');
        return;
    }
    
    // Désactiver le bouton
    setLoading(true);
    
    try {
        // Vérifier si l'email existe déjà
        const email = fields.email.value.trim().toLowerCase();
        
        if (typeof emailExists === 'function') {
            const exists = await emailExists(email);
            if (exists) {
                fields.email.classList.add('error');
                errors.email.textContent = 'Cet email est déjà inscrit';
                throw new Error('Email déjà inscrit');
            }
        }
        
        // Préparer les données
        const participant = {
            nom: fields.nom.value.trim(),
            prenom: fields.prenom.value.trim(),
            email: email,
            telephone: fields.telephone.value.trim()
        };
        
        let participantId;
        let result;
        
        // Sauvegarder dans Supabase
        if (typeof saveParticipant === 'function') {
            result = await saveParticipant(participant);
            participantId = result.id;
        } else {
            // Mode demo (sans Supabase)
            console.log('Mode demo - Données:', participant);
            await new Promise(resolve => setTimeout(resolve, 1000));
            participantId = 'demo_' + Date.now();
        }
        
        // Stocker ID pour la page de paiement
        sessionStorage.setItem('pendingParticipantId', participantId);
        sessionStorage.setItem('pendingParticipantEmail', email);
        sessionStorage.setItem('pendingParticipantName', `${participant.prenom} ${participant.nom}`);
        
        // Inscription gratuite - afficher modal certificat
        showSuccess();
        
        // Afficher modal certificat après 1 seconde
        setTimeout(() => {
            showCertificateModal();
        }, 1000);
        
    } catch (error) {
        console.error('Erreur:', error);
        showToast(error.message || 'Une erreur est survenue', 'error');
    } finally {
        setLoading(false);
    }
});

// ============================================
// UI HELPERS
// ============================================

function setLoading(loading) {
    if (loading) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
    } else {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

function showSuccess() {
    formCard.classList.add('hidden');
    successCard.classList.remove('hidden');
    
    // Animation de succès
    successCard.style.animation = 'none';
    setTimeout(() => {
        successCard.style.animation = 'fadeInUp 0.6s ease';
    }, 10);
}

function resetForm() {
    form.reset();
    clearValidation();
    
    successCard.classList.add('hidden');
    formCard.classList.remove('hidden');
    
    // Réinitialiser les modals
    closeCertificateModal();
    closeDonationModal();
}

// ============================================
// CERTIFICATE MODAL
// ============================================

function showCertificateModal() {
    document.getElementById('certificateModal').classList.remove('hidden');
}

function closeCertificateModal() {
    document.getElementById('certificateModal').classList.add('hidden');
}

function goToCertificatePayment() {
    const participantId = sessionStorage.getItem('pendingParticipantId');
    if (participantId) {
        window.location.href = 'payment.html?id=' + participantId + '&type=certificate';
    } else {
        showToast('Erreur: ID participant manquant', 'error');
    }
}

// ============================================
// DONATION MODAL
// ============================================

function openDonationModal() {
    document.getElementById('donationModal').classList.remove('hidden');
}

function closeDonationModal() {
    document.getElementById('donationModal').classList.add('hidden');
    resetDonationForm();
}

function toggleDonationFields() {
    const type = document.querySelector('input[name="donationType"]:checked').value;
    const donorFields = document.getElementById('donorFields');
    
    if (type === 'named') {
        donorFields.classList.remove('hidden');
        document.getElementById('donorNom').required = true;
        document.getElementById('donorPrenom').required = true;
    } else {
        donorFields.classList.add('hidden');
        document.getElementById('donorNom').required = false;
        document.getElementById('donorPrenom').required = false;
    }
}

function selectAmount(amount) {
    document.getElementById('donationAmount').value = amount;
    document.getElementById('amountError').textContent = '';
    
    // Update UI
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.textContent === amount + ' Gds') {
            btn.classList.add('selected');
        }
    });
    
    // Clear custom amount input and remove active styling
    const customInput = document.getElementById('customAmount');
    customInput.value = '';
    customInput.classList.remove('active');
}

function selectCustomAmount(value) {
    const input = document.getElementById('customAmount');
    
    if (value && value >= 50) {
        document.getElementById('donationAmount').value = value;
        document.getElementById('amountError').textContent = '';
        
        // Add active styling
        input.classList.add('active');
        
        // Remove selection from buttons
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    } else {
        document.getElementById('donationAmount').value = '';
        input.classList.remove('active');
    }
}

function selectDonationMethod(method) {
    document.getElementById('donationMethod').value = method;
    document.getElementById('donationMethodError').textContent = '';
    
    // Update UI
    document.querySelectorAll('#donationModal .payment-method').forEach(m => {
        m.classList.remove('selected');
    });
    document.querySelector(`#donationModal .payment-method[data-method="${method}"]`)?.classList.add('selected');
}

let donationFile = null;

function handleDonationFile(input) {
    if (input.files && input.files[0]) {
        donationFile = input.files[0];
        
        if (donationFile.size > 5 * 1024 * 1024) {
            showToast('Le fichier est trop grand (max 5MB)', 'error');
            donationFile = null;
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('donationPreviewImage');
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            document.getElementById('donationFileUpload').classList.add('has-file');
            document.getElementById('donationFileError').textContent = '';
        };
        reader.readAsDataURL(donationFile);
    }
}

function validateDonationForm() {
    let isValid = true;
    
    const amount = document.getElementById('donationAmount').value;
    const customAmount = document.getElementById('customAmount').value;
    
    // Check if either button is selected or custom amount is filled
    const hasButtonSelected = document.querySelector('.amount-btn.selected') !== null;
    const hasCustomAmount = customAmount && parseInt(customAmount) >= 50;
    
    if (!amount && !hasCustomAmount) {
        document.getElementById('amountError').textContent = 'Sélectionne un montant ou entre ton propre montant (min 50 Gds)';
        isValid = false;
    } else {
        document.getElementById('amountError').textContent = '';
    }
    
    const method = document.getElementById('donationMethod').value;
    if (!method) {
        document.getElementById('donationMethodError').textContent = 'Sélectionne un mode de paiement';
        isValid = false;
    }
    
    const type = document.querySelector('input[name="donationType"]:checked').value;
    if (type === 'named') {
        const nom = document.getElementById('donorNom').value.trim();
        const prenom = document.getElementById('donorPrenom').value.trim();
        if (!nom || !prenom) {
            showToast('Veuillez entrer votre nom et prénom', 'error');
            isValid = false;
        }
    }
    
    if (!donationFile) {
        document.getElementById('donationFileError').textContent = 'La preuve de paiement est obligatoire';
        isValid = false;
    }
    
    return isValid;
}

function resetDonationForm() {
    document.getElementById('donationForm').reset();
    donationFile = null;
    document.getElementById('donationPreviewImage').classList.add('hidden');
    document.getElementById('donationFileUpload').classList.remove('has-file');
    document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('#donationModal .payment-method').forEach(m => m.classList.remove('selected'));
    document.getElementById('donorFields').classList.add('hidden');
    document.getElementById('customAmount').value = '';
    document.getElementById('customAmount').classList.remove('active');
    document.getElementById('donationAmount').value = '';
    document.querySelectorAll('.error-message').forEach(e => e.textContent = '');
}

// Donation form submission
document.getElementById('donationForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!validateDonationForm()) return;
    
    const btn = document.getElementById('donationSubmitBtn');
    btn.classList.add('loading');
    btn.disabled = true;
    
    try {
        const type = document.querySelector('input[name="donationType"]:checked').value;
        const nom = type === 'named' ? document.getElementById('donorNom').value.trim() : 'Anonyme';
        const prenom = type === 'named' ? document.getElementById('donorPrenom').value.trim() : '';
        const telephone = document.getElementById('donorPhone').value.trim();
        const amount = parseInt(document.getElementById('donationAmount').value);
        const method = document.getElementById('donationMethod').value;
        
        // Upload file
        let proofUrl = null;
        if (typeof uploadDonationProof === 'function') {
            proofUrl = await uploadDonationProof(donationFile);
        } else {
            await new Promise(r => setTimeout(r, 1000));
            proofUrl = 'https://example.com/demo-donation.jpg';
        }
        
        // Save donation
        if (typeof saveDonation === 'function') {
            await saveDonation({
                nom,
                prenom,
                telephone,
                montant: amount,
                mode_paiement: method,
                preuve_paiement: proofUrl,
                type_donateur: type
            });
        }
        
        closeDonationModal();
        showToast('Merci pour ton don ! Nous te contacterons bientôt.', 'success');
        
    } catch (error) {
        console.error('Erreur don:', error);
        showToast('Erreur lors de l\'envoi: ' + error.message, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
});

function showToast(message, type = 'info') {
    toastMessage.textContent = message;
    
    const icon = toast.querySelector('i');
    icon.className = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-info-circle';
    icon.style.color = type === 'error' ? 'var(--error)' : 'var(--primary)';
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

// ============================================
// ADMIN MODAL
// ============================================

function openAdminLogin() {
    adminModal.classList.remove('hidden');
    document.getElementById('adminEmail').focus();
}

function closeAdminLogin() {
    adminModal.classList.add('hidden');
    adminLoginForm.reset();
}

function togglePassword() {
    const passwordField = document.getElementById('adminPassword');
    const toggleBtn = document.querySelector('.toggle-password i');
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        toggleBtn.className = 'fas fa-eye-slash';
    } else {
        passwordField.type = 'password';
        toggleBtn.className = 'fas fa-eye';
    }
}

// Admin login
adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    // Désactiver le bouton pendant la vérification
    const btn = adminLoginForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Vérification...';
    
    try {
        // Vérifier que Supabase est connecté
        const supabaseInstance = (typeof supabaseClient !== 'undefined' && supabaseClient) ? supabaseClient : 
                                (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) ? window.supabaseClient : null;
        
        if (!supabaseInstance) {
            throw new Error('Supabase non connecté - Vérifie ta connexion internet');
        }
        
        // 1. Connexion avec Supabase Auth
        const { data: authData, error: authError } = await supabaseInstance.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (authError) {
            throw new Error('Email ou mot de passe incorrect');
        }
        
        // 2. Vérifier si l'utilisateur est admin
        let admin = null;
        if (typeof checkIsAdmin === 'function') {
            admin = await checkIsAdmin(email);
        }
        
        if (!admin) {
            // Déconnexion car pas admin
            await supabaseInstance.auth.signOut();
            throw new Error('Accès refusé - Vous n\'êtes pas autorisé à accéder au panel admin');
        }
        
        // C'est un admin - continuer
        // Stocker la session admin
        sessionStorage.setItem('adminLoggedIn', 'true');
        sessionStorage.setItem('adminEmail', admin.email);
        sessionStorage.setItem('adminNom', admin.nom || 'Admin');
        
        showToast('Connexion réussie !');
        
        // Rediriger vers le panel admin
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 500);
    } catch (error) {
        console.error('Erreur login:', error);
        showToast('Erreur de connexion: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Se connecter';
    }
});

// Fermer le modal avec Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !adminModal.classList.contains('hidden')) {
        closeAdminLogin();
    }
});

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Formulaire d\'inscription chargé');
    
    // Focus sur le premier champ
    fields.nom.focus();
    
    // Fermer modals avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!document.getElementById('certificateModal').classList.contains('hidden')) {
                closeCertificateModal();
            }
            if (!document.getElementById('donationModal').classList.contains('hidden')) {
                closeDonationModal();
            }
        }
    });
});
