// ============================================
// SUPABASE CONFIGURATION
// ============================================

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
// FONCTIONS EMAIL (Resend API direct)
// ============================================

const RESEND_API_KEY = 're_3fzBXEVJ_5xcYX4bahNNtizCWcFdkuymS';
const RESEND_FROM    = 'Rasin Ayiti <onboarding@resend.dev>';

function _registrationHtml(prenom, nom, email) {
    return `<div style="font-family:Inter,Arial,sans-serif;max-width:580px;margin:0 auto;background:#f8fafc;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#4f46e5,#16a34a);border-radius:16px;padding:28px 32px;text-align:center;margin-bottom:24px;">
    <h1 style="color:#fff;font-size:1.4rem;margin:0 0 4px;">RASIN AYITI × UNITECH</h1>
    <p style="color:rgba(255,255,255,0.85);font-size:0.88rem;margin:0;">Séminaire sur les Compétences de Vie</p>
  </div>
  <div style="background:#fff;border-radius:12px;padding:28px 32px;border:1px solid #e5e7eb;">
    <h2 style="color:#1f2937;font-size:1.1rem;margin:0 0 16px;">Bonjour ${prenom} ${nom} 👋</h2>
    <p style="color:#4b5563;line-height:1.7;font-size:0.92rem;">Nous avons bien reçu votre inscription au <strong>Séminaire sur les Compétences de Vie</strong>.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 6px;font-size:0.88rem;color:#166534;"><strong>📅 Date :</strong> 30 Avril et 1er Mai 2026</p>
      <p style="margin:0 0 6px;font-size:0.88rem;color:#166534;"><strong>🕘 Heure :</strong> 09:00 AM – 01:00 PM</p>
      <p style="margin:0;font-size:0.88rem;color:#166534;"><strong>💻 Format :</strong> 100% en ligne sur Zoom</p>
    </div>
    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:10px;padding:14px;margin:16px 0;">
      <p style="margin:0;font-size:0.88rem;color:#854d0e;">⏳ <strong>Prochaine étape :</strong> Complétez votre paiement (500 Gds) pour confirmer votre place. Vous recevrez votre <strong>code d'accès Zoom</strong> après confirmation.</p>
    </div>
    <p style="color:#9ca3af;font-size:0.8rem;margin:0;">Email : ${email}</p>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:0.75rem;margin-top:16px;">© 2026 Rasin Ayiti × UNITECH — +509 46807922</p>
</div>`;
}

function _confirmationHtml(prenom, nom, email, accessCode, zoomLink, zoomId, zoomPass) {
    return `<div style="font-family:Inter,Arial,sans-serif;max-width:580px;margin:0 auto;background:#f8fafc;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#4f46e5,#16a34a);border-radius:16px;padding:28px 32px;text-align:center;margin-bottom:24px;">
    <h1 style="color:#fff;font-size:1.4rem;margin:0 0 4px;">RASIN AYITI × UNITECH</h1>
    <p style="color:rgba(255,255,255,0.85);font-size:0.88rem;margin:0;">Confirmation de Participation</p>
  </div>
  <div style="background:#fff;border-radius:12px;padding:28px 32px;border:1px solid #e5e7eb;">
    <div style="text-align:center;margin-bottom:20px;">
      <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:1.6rem;">✅</div>
      <h2 style="color:#1f2937;font-size:1.1rem;margin:10px 0 4px;">Paiement confirmé !</h2>
      <p style="color:#6b7280;font-size:0.88rem;margin:0;">Bienvenue ${prenom} ${nom}</p>
    </div>
    <div style="background:#f0f7ff;border:2px solid #4f46e5;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
      <p style="font-size:0.75rem;color:#4f46e5;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">Votre Code d'Accès</p>
      <div style="font-size:2rem;font-weight:900;color:#4f46e5;letter-spacing:0.2em;font-family:monospace;">${accessCode}</div>
      <p style="font-size:0.78rem;color:#6b7280;margin:8px 0 0;">Entrez ce code sur la page d'accès participant</p>
    </div>
    <div style="text-align:center;margin:16px 0;">
      <a href="https://formulaire-rho-rouge.vercel.app/access.html" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:700;font-size:0.92rem;">Accéder à ma formation →</a>
    </div>
    <div style="border-top:1px solid #e5e7eb;padding-top:14px;margin-top:14px;">
      <p style="font-size:0.88rem;font-weight:700;color:#1f2937;margin:0 0 8px;">📹 Rejoindre sur Zoom</p>
      <p style="font-size:0.88rem;color:#4b5563;margin:0 0 5px;"><strong>Lien :</strong> <a href="${zoomLink}" style="color:#4f46e5;">${zoomLink}</a></p>
      <p style="font-size:0.88rem;color:#4b5563;margin:0 0 5px;"><strong>Meeting ID :</strong> ${zoomId}</p>
      <p style="font-size:0.88rem;color:#4b5563;margin:0;"><strong>Mot de passe :</strong> ${zoomPass}</p>
    </div>
    <div style="background:#f8fafc;border-radius:10px;padding:12px;margin-top:14px;font-size:0.82rem;color:#6b7280;">
      <p style="margin:0 0 3px;"><strong>📅</strong> 30 Avril et 1er Mai 2026 — 09:00 AM – 01:00 PM</p>
      <p style="margin:0;"><strong>📧</strong> ${email}</p>
    </div>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:0.75rem;margin-top:16px;">© 2026 Rasin Ayiti × UNITECH — +509 46807922</p>
</div>`;
}

async function sendEmail(payload) {
    let subject, html;

    if (payload.type === 'registration') {
        subject = '📋 Inscription reçue — Séminaire Compétences de Vie | Rasin Ayiti';
        html = _registrationHtml(payload.prenom, payload.nom, payload.to);
    } else if (payload.type === 'confirmation') {
        subject = "✅ Paiement confirmé + Code d'accès Zoom — Séminaire Rasin Ayiti";
        html = _confirmationHtml(payload.prenom, payload.nom, payload.to,
                                  payload.access_code, payload.zoom_link,
                                  payload.zoom_id, payload.zoom_pass);
    } else {
        throw new Error('Type email inconnu: ' + payload.type);
    }

    const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: payload.to, subject, html }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.name || 'Erreur Resend ' + res.status);
    return data;
}

async function sendRegistrationEmail(participant) {
    return sendEmail({
        type: 'registration',
        to: participant.email,
        prenom: participant.prenom,
        nom: participant.nom,
    });
}

async function sendConfirmationEmail(participant, zoomConfig) {
    return sendEmail({
        type: 'confirmation',
        to: participant.email,
        prenom: participant.prenom,
        nom: participant.nom,
        access_code: participant.access_code,
        zoom_link:   zoomConfig.link,
        zoom_id:     zoomConfig.meetingId,
        zoom_pass:   zoomConfig.password,
    });
}

// ============================================
// FONCTIONS ACCESS CODE
// ============================================

async function saveAccessCode(participantId, code) {
    if (!supabaseClient) throw new Error('Supabase non connecté');
    const { data, error } = await supabaseClient
        .from('participants')
        .update({ access_code: code, code_genere_at: new Date().toISOString() })
        .eq('id', participantId)
        .select();
    if (error) throw error;
    return data[0];
}

async function validateAccessCode(code) {
    if (!supabaseClient) throw new Error('Supabase non connecté');
    const { data, error } = await supabaseClient
        .from('participants')
        .select('*')
        .eq('access_code', code.trim().toUpperCase())
        .limit(1);
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
}

async function markCertificatDownloaded(participantId) {
    if (!supabaseClient) throw new Error('Supabase non connecté');
    const { data, error } = await supabaseClient
        .from('participants')
        .update({ certificat_telecharge: true })
        .eq('id', participantId)
        .select();
    if (error) throw error;
    return data[0];
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

