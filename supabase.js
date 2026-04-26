// ============================================
// SUPABASE CONFIGURATION
// ============================================
// Remplace ces valeurs par tes propres credentials Supabase

const SUPABASE_URL = 'https://silpnglpfzeoqkqvwdsn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpbHBuZ2xwZnplb3FrcXZ3ZHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNjAxNjMsImV4cCI6MjA5MjYzNjE2M30.DKkAvKjh6AyQfIrc3aAG3GVp-6B7lrGd7Bf_CMNkk9o';

// Initialisation Supabase
let supabase;

try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Make it globally available
    window.supabaseClient = supabase;
    console.log('✅ Supabase connecté');
} catch (error) {
    console.error('❌ Erreur connexion Supabase:', error);
    supabase = null;
    window.supabaseClient = null;
}

// ============================================
// FONCTIONS SUPABASE
// ============================================

/**
 * Enregistrer un nouveau participant
 * @param {Object} participant - {nom, prenom, email}
 * @returns {Promise<Object>}
 */
async function saveParticipant(participant) {
    if (!supabase) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabase
        .from('participants')
        .insert([{
            nom: participant.nom,
            prenom: participant.prenom,
            email: participant.email,
            telephone: participant.telephone || null,
            date_inscription: new Date().toISOString(),
            qr_code: null,
            // Payment fields
            frais: 500, // 500 Gourdes
            statut_paiement: 'en_attente', // en_attente, verifie, refuse
            preuve_paiement: null, // URL de l'image
            mode_paiement: null, // moncash, natcash
            date_paiement: null,
            email_envoye: false,
            date_email: null
        }])
        .select();

    if (error) throw error;
    return data[0];
}

/**
 * Récupérer tous les participants
 * @returns {Promise<Array>}
 */
async function getAllParticipants() {
    if (!supabase) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order('date_inscription', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Rechercher des participants
 * @param {string} searchTerm
 * @returns {Promise<Array>}
 */
async function searchParticipants(searchTerm) {
    if (!supabase) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabase
        .from('participants')
        .select('*')
        .or(`nom.ilike.%${searchTerm}%,prenom.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('date_inscription', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Mettre à jour le QR code d'un participant
 * @param {number} id
 * @param {string} qrCode
 * @returns {Promise<Object>}
 */
async function updateQRCode(id, qrCode) {
    if (!supabase) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabase
        .from('participants')
        .update({ qr_code: qrCode })
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
}

/**
 * Mettre à jour le statut de paiement
 * @param {number} id
 * @param {string} statut - 'en_attente', 'verifie', 'refuse'
 * @param {string} preuveUrl - URL de la preuve
 * @returns {Promise<Object>}
 */
async function updatePaymentStatus(id, statut, preuveUrl = null) {
    if (!supabase) {
        throw new Error('Supabase non connecté');
    }

    const updates = {
        statut_paiement: statut,
        date_paiement: new Date().toISOString()
    };
    
    if (preuveUrl) updates.preuve_paiement = preuveUrl;

    const { data, error } = await supabase
        .from('participants')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
}

/**
 * Marquer email comme envoyé
 * @param {number} id
 * @returns {Promise<Object>}
 */
async function markEmailSent(id) {
    if (!supabase) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabase
        .from('participants')
        .update({ 
            email_envoye: true,
            date_email: new Date().toISOString()
        })
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
}

/**
 * Upload une image de preuve de paiement
 * @param {File} file
 * @param {string} participantId
 * @returns {Promise<string>} URL de l'image
 */
async function uploadPaymentProof(file, participantId) {
    if (!supabase) {
        throw new Error('Supabase non connecté');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `preuve_${participantId}_${Date.now()}.${fileExt}`;
    const filePath = `preuves/${fileName}`;

    // Upload file
    const { error: uploadError } = await supabase.storage
        .from('paiements')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('paiements')
        .getPublicUrl(filePath);

    return publicUrl;
}

/**
 * Supprimer un participant
 * @param {number} id
 * @returns {Promise<void>}
 */
async function deleteParticipant(id) {
    if (!supabase) {
        throw new Error('Supabase non connecté');
    }

    const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

/**
 * Vérifier si un email existe déjà
 * @param {string} email
 * @returns {Promise<boolean>}
 */
async function emailExists(email) {
    if (!supabase) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabase
        .from('participants')
        .select('id')
        .eq('email', email)
        .limit(1);

    if (error) throw error;
    return data && data.length > 0;
}

// ============================================
// FONCTIONS ADMIN
// ============================================

/**
 * Vérifier les credentials admin
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object|null>} - Retourne l'admin si valide, null sinon
 */
async function adminLogin(email, password) {
    if (!supabase) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

    if (error || !data) return null;
    return data;
}

// ============================================
// FONCTIONS DONATIONS
// ============================================

/**
 * Sauvegarder une donation
 * @param {Object} donation - {nom, prenom, telephone, montant, mode_paiement, preuve_paiement, type_donateur}
 * @returns {Promise<Object>}
 */
async function saveDonation(donation) {
    if (!supabase) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabase
        .from('donations')
        .insert([{
            nom: donation.nom,
            prenom: donation.prenom,
            telephone: donation.telephone,
            montant: donation.montant,
            mode_paiement: donation.mode_paiement,
            preuve_paiement: donation.preuve_paiement,
            type_donateur: donation.type_donateur,
            statut: 'en_attente',
            date_don: new Date().toISOString()
        }])
        .select();

    if (error) throw error;
    return data[0];
}

/**
 * Récupérer toutes les donations
 * @returns {Promise<Array>}
 */
async function getAllDonations() {
    if (!supabase) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabase
        .from('donations')
        .select('*')
        .order('date_don', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Mettre à jour le statut d'une donation
 * @param {number} id
 * @param {string} statut - 'en_attente', 'verifie', 'refuse'
 * @returns {Promise<Object>}
 */
async function updateDonationStatus(id, statut) {
    if (!supabase) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabase
        .from('donations')
        .update({ statut })
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
}

/**
 * Upload une preuve de donation
 * @param {File} file
 * @returns {Promise<string>} URL de l'image
 */
async function uploadDonationProof(file) {
    if (!supabase) {
        throw new Error('Supabase non connecté');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `donation_${Date.now()}.${fileExt}`;
    const filePath = `donations/${fileName}`;

    // Upload file
    const { error: uploadError } = await supabase.storage
        .from('paiements')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('paiements')
        .getPublicUrl(filePath);

    return publicUrl;
}

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        supabase,
        saveParticipant,
        getAllParticipants,
        searchParticipants,
        updateQRCode,
        deleteParticipant,
        emailExists,
        updatePaymentStatus,
        markEmailSent,
        uploadPaymentProof,
        saveDonation,
        getAllDonations,
        updateDonationStatus,
        uploadDonationProof,
        adminLogin
    };
}
