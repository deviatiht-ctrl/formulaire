// ============================================
// SUPABASE CONFIGURATION
// ============================================

// Éviter redéclaration si le fichier est chargé plusieurs fois
if (typeof window.supabaseClient === 'undefined') {

const SUPABASE_URL = 'https://silpnglpfzeoqkqvwdsn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpbHBuZ2xwZnplb3FrcXZ3ZHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNjAxNjMsImV4cCI6MjA5MjYzNjE2M30.DKkAvKjh6AyQfIrc3aAG3GVp-6B7lrGd7Bf_CMNkk9o';

// Initialisation Supabase
let supabaseClient;

try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Make it globally available
    window.supabaseClient = supabaseClient;
    console.log('✅ Supabase connecté');
} catch (error) {
    console.error('❌ Erreur connexion Supabase:', error);
    supabaseClient = null;
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
    if (!supabaseClient) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabaseClient
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
    if (!supabaseClient) {
        throw new Error('Supabase non connecté');
    }

    console.log('📡 Requête Supabase: participants...');
    
    const { data, error } = await supabaseClient
        .from('participants')
        .select('*')
        .order('date_inscription', { ascending: false });

    if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
    }
    
    console.log('✅ Données reçues:', data);
    return data || []; // Retourne tableau vide si null
}

/**
 * Rechercher des participants
 * @param {string} searchTerm
 * @returns {Promise<Array>}
 */
async function searchParticipants(searchTerm) {
    if (!supabaseClient) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabaseClient
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
    if (!supabaseClient) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabaseClient
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
    if (!supabaseClient) {
        throw new Error('Supabase non connecté');
    }

    const updates = {
        statut_paiement: statut,
        date_paiement: new Date().toISOString()
    };
    
    if (preuveUrl) updates.preuve_paiement = preuveUrl;

    const { data, error } = await supabaseClient
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
    if (!supabaseClient) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabaseClient
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
    if (!supabaseClient) {
        throw new Error('Supabase non connecté');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `preuve_${participantId}_${Date.now()}.${fileExt}`;
    const filePath = `preuves/${fileName}`;

    // Upload file
    const { error: uploadError } = await supabaseClient.storage
        .from('paiements')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
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
    if (!supabaseClient) {
        throw new Error('Supabase non connecté');
    }

    const { error } = await supabaseClient
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
    if (!supabaseClient) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabaseClient
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
 * Vérifier si un email est admin
 * @param {string} email
 * @returns {Promise<Object|null>} - Retourne l'admin si trouvé, null sinon
 */
async function checkIsAdmin(email) {
    if (!supabaseClient) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabaseClient
        .from('admin_users')
        .select('*')
        .eq('email', email)
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
    if (!supabaseClient) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabaseClient
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
    if (!supabaseClient) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabaseClient
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
    if (!supabaseClient) {
        throw new Error('Supabase non connecté');
    }

    const { data, error } = await supabaseClient
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
    if (!supabaseClient) {
        throw new Error('Supabase non connecté');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `donation_${Date.now()}.${fileExt}`;
    const filePath = `donations/${fileName}`;

    // Upload file
    const { error: uploadError } = await supabaseClient.storage
        .from('paiements')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
        .from('paiements')
        .getPublicUrl(filePath);

    return publicUrl;
}

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        supabaseClient,
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
        checkIsAdmin
    };
}

} // fin du bloc if (typeof window.supabaseClient === 'undefined')
