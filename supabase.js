// ============================================
// SUPABASE CONFIGURATION
// ============================================

const SITE_URL = 'https://formulaire-iota.vercel.app'; // URL Vercel du site
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
            whatsapp: participant.whatsapp || participant.telephone || null,
            tranche_age: participant.tranche_age || null,
            ville: participant.ville || null,
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

    const fileExt = file.name.split('.').pop().toLowerCase();
    const fileName = `preuve_${participantId}_${Date.now()}.${fileExt}`;
    const filePath = `preuves/${fileName}`;

    console.log('📤 Upload preuve:', filePath, 'taille:', file.size);

    // Upload file
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('paiements')
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error('❌ Upload erreur:', uploadError);
        throw new Error('Erreur upload: ' + (uploadError.message || JSON.stringify(uploadError)));
    }

    console.log('✅ Upload réussi:', uploadData);

    // Get public URL
    const { data: urlData } = supabaseClient.storage
        .from('paiements')
        .getPublicUrl(filePath);

    const publicUrl = urlData?.publicUrl;
    console.log('🔗 URL publique:', publicUrl);
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
  <div style="background:linear-gradient(135deg,#4f46e5,#16a34a);border-radius:16px;padding:24px 32px;text-align:center;margin-bottom:24px;">
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:12px;">
      <img src="${SITE_URL}/assets/logorasin.PNG" alt="Rasin Ayiti" style="height:42px;width:auto;" />
      <span style="color:rgba(255,255,255,0.7);font-size:1.2rem;font-weight:700">×</span>
      <img src="${SITE_URL}/assets/logounitech.PNG" alt="UNITECH" style="height:42px;width:auto;" />
    </div>
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
    <div style="background:linear-gradient(135deg,#dcfce7,#f0fdf4);border:2px solid #22c55e;border-radius:12px;padding:18px;margin:16px 0;text-align:center;">
      <p style="margin:0 0 6px;font-size:0.9rem;font-weight:700;color:#166534;">📱 Rejoignez notre Groupe WhatsApp !</p>
      <p style="margin:0 0 14px;font-size:0.82rem;color:#15803d;line-height:1.6;">Utilisez le <strong>numéro WhatsApp enregistré</strong> lors de votre inscription.<br><span style="color:#dc2626;font-weight:600;">⚠️ Sans rejoindre le groupe, vous serez automatiquement exclu(e).</span></p>
      <a href="https://chat.whatsapp.com/Hf6T9GaKptAEs5EaOrOMLS?mode=gi_t" style="display:inline-block;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:800;font-size:0.88rem;">📱 Rejoindre le Groupe</a>
    </div>
    <p style="color:#9ca3af;font-size:0.8rem;margin:0;">Email : ${email}</p>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:0.75rem;margin-top:16px;">© 2026 Rasin Ayiti × UNITECH — +509 46807922</p>
</div>`;
}

function _confirmationHtml(prenom, nom, email, accessCode, zoomLink, zoomId, zoomPass) {
    return `<div style="font-family:Inter,Arial,sans-serif;max-width:580px;margin:0 auto;background:#f8fafc;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#4f46e5,#16a34a);border-radius:16px;padding:24px 32px;text-align:center;margin-bottom:24px;">
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:12px;">
      <img src="${SITE_URL}/assets/logorasin.PNG" alt="Rasin Ayiti" style="height:42px;width:auto;" />
      <span style="color:rgba(255,255,255,0.7);font-size:1.2rem;font-weight:700">×</span>
      <img src="${SITE_URL}/assets/logounitech.PNG" alt="UNITECH" style="height:42px;width:auto;" />
    </div>
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

function _reminderHtml(prenom, nom, email) {
    return `<div style="font-family:Inter,Arial,sans-serif;max-width:580px;margin:0 auto;background:#f8fafc;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#f59e0b,#dc2626);border-radius:16px;padding:24px 32px;text-align:center;margin-bottom:24px;">
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:12px;">
      <img src="${SITE_URL}/assets/logorasin.PNG" alt="Rasin Ayiti" style="height:42px;width:auto;" />
      <span style="color:rgba(255,255,255,0.7);font-size:1.2rem;font-weight:700">×</span>
      <img src="${SITE_URL}/assets/logounitech.PNG" alt="UNITECH" style="height:42px;width:auto;" />
    </div>
    <p style="color:rgba(255,255,255,0.85);font-size:0.88rem;margin:0;">⏰ Rappel — Séminaire sur les Compétences de Vie</p>
  </div>
  <div style="background:#fff;border-radius:12px;padding:28px 32px;border:1px solid #e5e7eb;">
    <h2 style="color:#1f2937;font-size:1.1rem;margin:0 0 16px;">Bonjour ${prenom} ${nom} 👋</h2>
    <p style="color:#4b5563;line-height:1.7;font-size:0.92rem;">Nous avons bien reçu votre inscription au <strong>Séminaire sur les Compétences de Vie</strong>.</p>
    <div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:10px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:0.95rem;color:#92400e;font-weight:700;">⚠️ Action requise</p>
      <p style="margin:0;font-size:0.88rem;color:#92400e;">Nous n'avons pas encore reçu votre <strong>preuve de paiement</strong>. Sans confirmation, nous ne pourrons pas vous envoyer votre certificat de participation.</p>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:0.88rem;color:#166534;"><strong>📅 Date :</strong> 30 Avril et 1er Mai 2026</p>
      <p style="margin:0 0 6px;font-size:0.88rem;color:#166534;"><strong>🕘 Heure :</strong> 09:00 AM – 01:00 PM</p>
      <p style="margin:0;font-size:0.88rem;color:#166534;"><strong>💰 Frais :</strong> 500 Gourdes (Moncash ou Natcash)</p>
    </div>
    <div style="text-align:center;margin:20px 0;">
      <p style="font-size:0.88rem;color:#4b5563;margin-bottom:12px;">Envoyez la capture d'écran de votre paiement à :</p>
      <a href="https://wa.me/50946807922" style="display:inline-block;background:#25D366;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:700;font-size:0.92rem;">📱 WhatsApp : +509 46807922</a>
    </div>
    <p style="color:#9ca3af;font-size:0.8rem;margin:16px 0 0;">Email inscrit : ${email}</p>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:0.75rem;margin-top:16px;">© 2026 Rasin Ayiti × UNITECH — +509 46807922</p>
</div>`;
}

function _waGroupInviteHtml(prenom, nom, email, waLink, waNumero) {
    return `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f0f4ff;padding:32px 16px;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#4f46e5 0%,#16a34a 100%);border-radius:20px;padding:28px 32px;text-align:center;margin-bottom:24px;">
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:14px;">
      <img src="${SITE_URL}/assets/logorasin.PNG" alt="Rasin Ayiti" style="height:44px;width:auto;" />
      <span style="color:rgba(255,255,255,0.7);font-size:1.2rem;font-weight:700">×</span>
      <img src="${SITE_URL}/assets/logounitech.PNG" alt="UNITECH" style="height:44px;width:auto;" />
    </div>
    <p style="color:rgba(255,255,255,0.9);font-size:0.92rem;margin:0;">Séminaire sur les Compétences de Vie</p>
  </div>

  <!-- Body -->
  <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e0e7ff;margin-bottom:16px;">
    <h2 style="color:#1f2937;font-size:1.15rem;margin:0 0 8px;">Bonjour ${prenom} ${nom} 👋</h2>
    <p style="color:#4b5563;line-height:1.8;font-size:0.93rem;margin-bottom:20px;">
      Nous sommes ravis de vous compter parmi les participants au <strong>Séminaire sur les Compétences de Vie</strong>. 
      Pour faciliter la communication et vous tenir informé(e) de tous les détails importants, 
      nous vous invitons à rejoindre notre <strong>groupe WhatsApp officiel</strong>.
    </p>

    <!-- WhatsApp CTA -->
    <div style="text-align:center;margin:28px 0;">
      <a href="${waLink}" style="display:inline-block;background:linear-gradient(135deg,#25D366,#128C7E);color:#ffffff;padding:16px 36px;border-radius:50px;text-decoration:none;font-weight:800;font-size:1rem;letter-spacing:0.02em;box-shadow:0 4px 20px rgba(37,211,102,0.4);">
        <span style="margin-right:8px;">📱</span> Rejoindre le Groupe WhatsApp
      </a>
    </div>

    <!-- Important notice -->
    <div style="background:#fef9c3;border-left:4px solid #f59e0b;border-radius:0 10px 10px 0;padding:16px 20px;margin:24px 0;">
      <p style="margin:0 0 8px;font-size:0.92rem;font-weight:700;color:#92400e;">⚠️ Information importante</p>
      <p style="margin:0;font-size:0.88rem;color:#92400e;line-height:1.7;">
        L'accès au groupe se fait <strong>uniquement avec le numéro WhatsApp enregistré lors de votre inscription</strong> 
        (<strong>${waNumero || 'votre numéro enregistré'}</strong>). 
        Toute personne n'ayant pas rejoint le groupe avant la date limite sera 
        <strong>automatiquement exclue de l'événement</strong>.
      </p>
    </div>

    <!-- Event details -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:18px;margin:20px 0;">
      <p style="margin:0 0 10px;font-size:0.88rem;font-weight:700;color:#166534;">📅 Rappel — Détails de l'événement</p>
      <table style="width:100%;border-collapse:collapse;font-size:0.86rem;color:#166534;">
        <tr><td style="padding:4px 0;"><strong>📆 Dates :</strong></td><td>30 Avril et 1er Mai 2026</td></tr>
        <tr><td style="padding:4px 0;"><strong>🕘 Heure :</strong></td><td>09:00 AM – 01:00 PM</td></tr>
        <tr><td style="padding:4px 0;"><strong>💻 Format :</strong></td><td>100% en ligne sur Zoom</td></tr>
        <tr><td style="padding:4px 0;"><strong>📜 Certificat :</strong></td><td>Remis après participation complète</td></tr>
      </table>
    </div>

    <p style="color:#9ca3af;font-size:0.78rem;margin:16px 0 0;">Email enregistré : ${email}</p>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:16px;">
    <p style="color:#6b7280;font-size:0.8rem;margin:0 0 6px;">Des questions ? Contactez-nous</p>
    <a href="https://wa.me/50946807922" style="color:#25D366;font-weight:600;font-size:0.85rem;text-decoration:none;">📱 +509 46807922</a>
    <p style="color:#9ca3af;font-size:0.72rem;margin:12px 0 0;">© 2026 Rasin Ayiti × UNITECH — Tous droits réservés</p>
  </div>
</div>`;
}

async function sendWAGroupInviteEmail(participant, waLink) {
    const subject = '📱 Rejoignez le Groupe WhatsApp — Séminaire Rasin Ayiti';
    const html = _waGroupInviteHtml(
        participant.prenom, participant.nom, participant.email,
        waLink, participant.whatsapp || participant.telephone
    );
    const cleanEmail = participant.email.trim().replace(/\.$/, '').replace(/\s/g, '');
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) throw new Error('Email invalide: ' + participant.email);
    const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: cleanEmail, subject, html }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || ('HTTP ' + res.status));
    return data;
}

async function sendReminderEmail(participant) {
    const subject = '⏰ Rappel — Votre preuve de paiement | Séminaire Rasin Ayiti';
    const html = _reminderHtml(participant.prenom, participant.nom, participant.email);
    const cleanEmail = participant.email.trim().replace(/\.$/, '').replace(/\s/g, '');
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        throw new Error('Email invalide: ' + participant.email);
    }
    const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: cleanEmail, subject, html }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || data.message || ('HTTP ' + res.status));
    }
    return data;
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

    const cleanEmail = payload.to.trim().replace(/\.$/, '').replace(/\s/g, '');
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        throw new Error('Email invalide: ' + payload.to);
    }

    const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: cleanEmail, subject, html }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const errMsg = data.error || data.message || JSON.stringify(data) || ('HTTP ' + res.status);
        throw new Error(errMsg);
    }
    return data;
}

/**
 * Marquer l'email comme envoyé dans Supabase
 * @param {string|number} participantId
 * @returns {Promise<void>}
 */
async function markEmailSent(participantId) {
    console.log('📝 markEmailSent appelé pour ID:', participantId);
    if (!supabaseClient) {
        console.warn('❌ Supabase non connecté - impossible de marquer email comme envoyé');
        return;
    }
    if (!participantId) {
        console.warn('❌ participantId manquant - impossible de marquer email');
        return;
    }
    const updateData = { 
        email_sent: true, 
        email_sent_at: new Date().toISOString(),
        confirmed: true,
        confirmed_at: new Date().toISOString()
    };
    console.log('📝 Mise à jour Supabase:', updateData, 'pour ID:', participantId);
    const { data, error } = await supabaseClient
        .from('participants')
        .update(updateData)
        .eq('id', participantId)
        .select();
    if (error) {
        console.error('❌ Erreur marquage email envoyé:', error);
    } else {
        console.log('✅ Email marqué comme envoyé:', data);
    }
}

async function sendRegistrationEmail(participant) {
    console.log('📧 sendRegistrationEmail pour:', participant.email, 'ID:', participant.id);
    const result = await sendEmail({
        type: 'registration',
        to: participant.email,
        prenom: participant.prenom,
        nom: participant.nom,
    });
    // Marquer comme envoyé après succès
    console.log('✉️ Email envoyé, marquage pour ID:', participant.id);
    if (participant.id) await markEmailSent(participant.id);
    return result;
}

async function sendConfirmationEmail(participant, zoomConfig) {
    console.log('📧 sendConfirmationEmail pour:', participant.email, 'ID:', participant.id);
    const result = await sendEmail({
        type: 'confirmation',
        to: participant.email,
        prenom: participant.prenom,
        nom: participant.nom,
        access_code: participant.access_code,
        zoom_link:   zoomConfig.link,
        zoom_id:     zoomConfig.meetingId,
        zoom_pass:   zoomConfig.password,
    });
    // Marquer comme envoyé après succès
    console.log('✉️ Email confirmé envoyé, marquage pour ID:', participant.id);
    if (participant.id) await markEmailSent(participant.id);
    return result;
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

// ============================================================
// SEMINAR ACCESS
// ============================================================

async function validateAccessCode(code) {
    if (!supabaseClient) throw new Error('Supabase non connecté');
    const { data, error } = await supabaseClient
        .from('participants')
        .select('*')
        .eq('access_code', code.trim().toUpperCase())
        .single();
    if (error || !data) return null;
    return data;
}

async function checkIsAdmin(email) {
    if (!supabaseClient) return false;
    try {
        // If email provided, use it; otherwise get from current session
        let checkEmail = email;
        if (!checkEmail) {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return false;
            checkEmail = user.email;
        }
        const { data } = await supabaseClient
            .from('admins')
            .select('*')
            .eq('email', checkEmail)
            .single();
        return data || false;
    } catch (_) { return false; }
}

// Expose globally for seminar pages
window.validateAccessCode = validateAccessCode;
window.checkIsAdmin       = checkIsAdmin;

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
        sendReminderEmail,
        sendWAGroupInviteEmail,
        saveDonation,
        getAllDonations,
        updateDonationStatus,
        uploadDonationProof,
        checkIsAdmin
    };
}

