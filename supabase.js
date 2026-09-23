// ============================================
// SUPABASE CONFIGURATION
// ============================================

const SITE_URL = 'https://formulaire-iota.vercel.app'; // URL Vercel du site
const SUPABASE_URL = 'https://oykuhhogcdbmoybskexd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95a3VoaG9nY2RibW95YnNrZXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MTk1OTksImV4cCI6MjA5NjQ5NTU5OX0.xbIdgA6-DCILYkDQcl_VzWgz7HmIlHYhmRp0u_a87F4';

// Initialisation Supabase
let rawSupabaseClient;
let supabaseClient;

const RASINAYITI_PREFIX = 'rasinayiti_';
const RASINAYITI_TABLE_MAP = {
    'categories': 'rasinayiti_categories',
    'formations': 'rasinayiti_formations',
    'seminaires': 'rasinayiti_seminaires',
    'etudiants': 'rasinayiti_etudiants',
    'inscriptions': 'rasinayiti_inscriptions',
    'progressions': 'rasinayiti_progressions',
    'modules': 'rasinayiti_modules',
    'completions_modules': 'rasinayiti_completions_modules',
    'galerie': 'rasinayiti_galerie',
    'notifications': 'rasinayiti_notifications',
    'administrateurs': 'rasinayiti_administrateurs',
    'admins': 'rasinayiti_administrateurs',
    'admin_users': 'rasinayiti_administrateurs',
    'parametres': 'rasinayiti_parametres',
    'logs_activite': 'rasinayiti_logs_activite',
    'events': 'rasinayiti_events',
    'event_questions': 'rasinayiti_event_questions',
    'inscriptions_evenements': 'rasinayiti_inscriptions_evenements',
    'donations': 'rasinayiti_donations',
    'maillots': 'rasinayiti_maillots',
    'maillot_orders': 'rasinayiti_maillot_orders',
    'leaders': 'rasinayiti_leaders_v2',
    'leaders_v2': 'rasinayiti_leaders_v2',
    'participants': 'rasinayiti_participants',
    'zoom_config': 'rasinayiti_zoom_config',
    'live_viewers': 'rasinayiti_live_viewers',
    'live_reactions': 'rasinayiti_live_reactions'
};

const RASINAYITI_BUCKET_MAP = {
    'paiements': 'rasinayiti_paiements',
    'events': 'rasinayiti_events',
    'maillots': 'rasinayiti_maillots',
    'leaders': 'rasinayiti_leaders',
    'galerie': 'rasinayiti_galerie'
};

function resolveRasinAyitiTable(tableName) {
    if (!tableName) return tableName;
    if (tableName.startsWith(RASINAYITI_PREFIX)) return tableName;
    return RASINAYITI_TABLE_MAP[tableName] || (RASINAYITI_PREFIX + tableName);
}

function resolveRasinAyitiBucket(bucketName) {
    if (!bucketName) return bucketName;
    if (bucketName.startsWith(RASINAYITI_PREFIX)) return bucketName;
    return RASINAYITI_BUCKET_MAP[bucketName] || (RASINAYITI_PREFIX + bucketName);
}

// Rewrite embedded table names inside select() strings.
// PostgREST needs the real prefixed table name for joins, so
// 'categories(nom)' becomes 'categories:rasinayiti_categories(nom)'
// and the result key stays 'categories'.
function rewriteRasinAyitiSelect(selectQuery) {
    if (typeof selectQuery !== 'string') return selectQuery;
    Object.keys(RASINAYITI_TABLE_MAP).forEach(function(alias) {
        const re = new RegExp('(^|[\\s,])' + alias + '(\\s*\\()', 'g');
        selectQuery = selectQuery.replace(re, '$1' + alias + ':' + RASINAYITI_TABLE_MAP[alias] + '$2');
    });
    return selectQuery;
}

try {
    rawSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Create wrapper with automatic rasinayiti_ table and bucket resolution
    const originalFrom = rawSupabaseClient.from.bind(rawSupabaseClient);
    rawSupabaseClient.from = function(tableName) {
        const resolved = resolveRasinAyitiTable(tableName);
        const builder = originalFrom(resolved);
        const originalSelect = builder.select.bind(builder);
        builder.select = function(query, opts) {
            return originalSelect(rewriteRasinAyitiSelect(query), opts);
        };
        return builder;
    };

    if (rawSupabaseClient.storage) {
        const originalStorageFrom = rawSupabaseClient.storage.from.bind(rawSupabaseClient.storage);
        rawSupabaseClient.storage.from = function(bucketName) {
            const resolved = resolveRasinAyitiBucket(bucketName);
            return originalStorageFrom(resolved);
        };
    }

    supabaseClient = rawSupabaseClient;
    window.supabaseClient = supabaseClient;
    console.log('✅ Supabase connecté ak sipò Rasin Ayiti 2.0 (rasinayiti_ prefix)');
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
// FONCTIONS EMAIL (via /api/send-email — Brevo)
// ============================================

// Paramètres partagés (table rasinayiti_parametres) — modifiables dans Admin → Paramètres.
// Ils remplacent les valeurs codées en dur dans les modèles d'emails.
const DEFAULT_WA_LINK = 'https://chat.whatsapp.com/Hf6T9GaKptAEs5EaOrOMLS?mode=gi_t';
const DEFAULT_WA_NAME = 'Groupe WhatsApp Rasin Ayiti';
const DEFAULT_WA_NUMBER = '+509 46807922';

const _escHtml = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function setSiteSetting(cle, valeur) {
    if (!supabaseClient) throw new Error('Supabase non connecté');
    const { error } = await supabaseClient
        .from('parametres')
        .upsert({ cle, valeur: valeur ?? '' }, { onConflict: 'cle' });
    if (error) throw error;
}

async function getSiteSettings() {
    const settings = {
        waLink: DEFAULT_WA_LINK,
        waName: DEFAULT_WA_NAME,
        waNumber: DEFAULT_WA_NUMBER,
        zoomLink: '', zoomId: '', zoomPass: ''
    };
    if (!supabaseClient) return settings;
    try {
        const { data, error } = await supabaseClient
            .from('parametres')
            .select('cle,valeur')
            .in('cle', ['whatsapp_group_link', 'whatsapp_group_name', 'whatsapp_admin_number']);
        if (error) throw error;
        for (const row of data || []) {
            if (row.cle === 'whatsapp_group_link' && /^https?:\/\//i.test(row.valeur || '')) settings.waLink = row.valeur;
            if (row.cle === 'whatsapp_group_name' && row.valeur) settings.waName = row.valeur;
            if (row.cle === 'whatsapp_admin_number' && row.valeur) settings.waNumber = row.valeur;
        }
    } catch (e) {
        console.warn('⚠️ Paramètres WhatsApp indisponibles, valeurs par défaut utilisées:', e.message);
    }
    try {
        const zoom = await getZoomConfigFromDb();
        if (zoom) { settings.zoomLink = zoom.link || ''; settings.zoomId = zoom.meetingNumber || ''; settings.zoomPass = zoom.password || ''; }
    } catch (_) { /* zoom optionnel */ }
    return settings;
}

// Bloc WhatsApp réutilisable — nom du groupe + lien configurés dans Admin → Paramètres
function _waGroupBlock(wa) {
    if (!wa || !wa.link) return '';
    const name = _escHtml(wa.name || DEFAULT_WA_NAME);
    const link = /^https?:\/\//i.test(wa.link) ? wa.link : DEFAULT_WA_LINK;
    return `<div style="background:linear-gradient(135deg,#dcfce7,#f0fdf4);border:2px solid #22c55e;border-radius:12px;padding:18px;margin:16px 0;text-align:center;">
      <p style="margin:0 0 6px;font-size:0.9rem;font-weight:700;color:#166534;">📱 ${name}</p>
      <p style="margin:0 0 14px;font-size:0.82rem;color:#15803d;line-height:1.6;">Rejoignez le groupe officiel pour recevoir toutes les informations importantes.<br><span style="color:#dc2626;font-weight:600;">⚠️ Utilisez le numéro WhatsApp enregistré lors de votre inscription.</span></p>
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:800;font-size:0.88rem;">📱 Rejoindre ${name}</a>
    </div>`;
}

function _registrationHtml(prenom, nom, email, activity, wa) {
    const activityTitle = _escHtml(activity || 'Séminaire sur les Compétences de Vie');
    return `<div style="font-family:Inter,Arial,sans-serif;max-width:580px;margin:0 auto;background:#f8fafc;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#4f46e5,#16a34a);border-radius:16px;padding:24px 32px;text-align:center;margin-bottom:24px;">
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:12px;">
      <img src="${SITE_URL}/assets/logorasin.PNG" alt="Rasin Ayiti" style="height:42px;width:auto;" />
      <span style="color:rgba(255,255,255,0.7);font-size:1.2rem;font-weight:700">×</span>
      <img src="${SITE_URL}/assets/logounitech.PNG" alt="UNITECH" style="height:42px;width:auto;" />
    </div>
    <p style="color:rgba(255,255,255,0.85);font-size:0.88rem;margin:0;">${activityTitle}</p>
  </div>
  <div style="background:#fff;border-radius:12px;padding:28px 32px;border:1px solid #e5e7eb;">
    <h2 style="color:#1f2937;font-size:1.1rem;margin:0 0 16px;">Bonjour ${_escHtml(prenom)} ${_escHtml(nom)} 👋</h2>
    <p style="color:#4b5563;line-height:1.7;font-size:0.92rem;">Nous avons bien reçu votre inscription à <strong>${activityTitle}</strong>.</p>
    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:10px;padding:14px;margin:16px 0;">
      <p style="margin:0;font-size:0.88rem;color:#854d0e;">⏳ <strong>Prochaine étape :</strong> Si un paiement est requis, complétez-le pour confirmer votre place. Vous recevrez un email de confirmation dès qu'il sera validé.</p>
    </div>
    ${_waGroupBlock(wa)}
    <p style="color:#9ca3af;font-size:0.8rem;margin:0;">Email : ${_escHtml(email)}</p>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:0.75rem;margin-top:16px;">© 2026 Rasin Ayiti × UNITECH — +509 46807922</p>
</div>`;
}

function _confirmationHtml(prenom, nom, email, accessCode, zoomLink, zoomId, zoomPass, wa) {
    const zoomBlock = zoomLink ? `
    <div style="border-top:1px solid #e5e7eb;padding-top:14px;margin-top:14px;">
      <p style="font-size:0.88rem;font-weight:700;color:#1f2937;margin:0 0 8px;">📹 Rejoindre sur Zoom</p>
      <p style="font-size:0.88rem;color:#4b5563;margin:0 0 5px;"><strong>Lien :</strong> <a href="${zoomLink}" style="color:#4f46e5;">${zoomLink}</a></p>
      <p style="font-size:0.88rem;color:#4b5563;margin:0 0 5px;"><strong>Meeting ID :</strong> ${_escHtml(zoomId)}</p>
      <p style="font-size:0.88rem;color:#4b5563;margin:0;"><strong>Mot de passe :</strong> ${_escHtml(zoomPass)}</p>
    </div>` : '';
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
      <p style="color:#6b7280;font-size:0.88rem;margin:0;">Bienvenue ${_escHtml(prenom)} ${_escHtml(nom)}</p>
    </div>
    ${accessCode ? `<div style="background:#f0f7ff;border:2px solid #4f46e5;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
      <p style="font-size:0.75rem;color:#4f46e5;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">Votre Code d'Accès</p>
      <div style="font-size:2rem;font-weight:900;color:#4f46e5;letter-spacing:0.2em;font-family:monospace;">${_escHtml(accessCode)}</div>
      <p style="font-size:0.78rem;color:#6b7280;margin:8px 0 0;">Entrez ce code sur la page d'accès participant</p>
    </div>
    <div style="text-align:center;margin:16px 0;">
      <a href="${SITE_URL}/access.html" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:700;font-size:0.92rem;">Accéder à ma formation →</a>
    </div>` : ''}
    ${_waGroupBlock(wa)}
    ${zoomBlock}
    <div style="background:#f8fafc;border-radius:10px;padding:12px;margin-top:14px;font-size:0.82rem;color:#6b7280;">
      <p style="margin:0;"><strong>�</strong> ${_escHtml(email)}</p>
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

function _waGroupInviteHtml(prenom, nom, email, waLink, waNumero, waName) {
    const groupName = _escHtml(waName || 'Groupe WhatsApp officiel');
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
      nous vous invitons à rejoindre <strong>${groupName}</strong>.
    </p>

    <!-- WhatsApp CTA -->
    <div style="text-align:center;margin:28px 0;">
      <a href="${waLink}" style="display:inline-block;background:linear-gradient(135deg,#25D366,#128C7E);color:#ffffff;padding:16px 36px;border-radius:50px;text-decoration:none;font-weight:800;font-size:1rem;letter-spacing:0.02em;box-shadow:0 4px 20px rgba(37,211,102,0.4);">
        <span style="margin-right:8px;">📱</span> Rejoindre ${groupName}
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

function _paymentConfirmedHtml(prenom, nom, email, activity, wa, zoom, accessCode) {
    const activityTitle = _escHtml(activity || 'votre activité');
    const zoomBlock = zoom && zoom.link ? `
    <div style="border-top:1px solid #e5e7eb;padding-top:14px;margin-top:14px;">
      <p style="font-size:0.88rem;font-weight:700;color:#1f2937;margin:0 0 8px;">📹 Rejoindre sur Zoom</p>
      <p style="font-size:0.88rem;color:#4b5563;margin:0 0 5px;"><strong>Lien :</strong> <a href="${zoom.link}" style="color:#4f46e5;">${zoom.link}</a></p>
      ${zoom.id ? `<p style="font-size:0.88rem;color:#4b5563;margin:0 0 5px;"><strong>Meeting ID :</strong> ${_escHtml(zoom.id)}</p>` : ''}
      ${zoom.pass ? `<p style="font-size:0.88rem;color:#4b5563;margin:0;"><strong>Mot de passe :</strong> ${_escHtml(zoom.pass)}</p>` : ''}
    </div>` : '';
    const codeBlock = accessCode ? `
    <div style="background:#f0f7ff;border:2px solid #4f46e5;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
      <p style="font-size:0.75rem;color:#4f46e5;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">Votre Code d'Accès</p>
      <div style="font-size:2rem;font-weight:900;color:#4f46e5;letter-spacing:0.2em;font-family:monospace;">${_escHtml(accessCode)}</div>
      <p style="font-size:0.78rem;color:#6b7280;margin:8px 0 0;">Entrez ce code sur la page d'accès participant</p>
    </div>` : '';
    return `<div style="font-family:Inter,Arial,sans-serif;max-width:580px;margin:0 auto;background:#f8fafc;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#4f46e5,#16a34a);border-radius:16px;padding:24px 32px;text-align:center;margin-bottom:24px;">
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:12px;">
      <img src="${SITE_URL}/assets/logorasin.PNG" alt="Rasin Ayiti" style="height:42px;width:auto;" />
      <span style="color:rgba(255,255,255,0.7);font-size:1.2rem;font-weight:700">×</span>
      <img src="${SITE_URL}/assets/logounitech.PNG" alt="UNITECH" style="height:42px;width:auto;" />
    </div>
    <p style="color:rgba(255,255,255,0.85);font-size:0.88rem;margin:0;">Confirmation de paiement</p>
  </div>
  <div style="background:#fff;border-radius:12px;padding:28px 32px;border:1px solid #e5e7eb;">
    <div style="text-align:center;margin-bottom:20px;">
      <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:1.6rem;">✅</div>
      <h2 style="color:#1f2937;font-size:1.1rem;margin:10px 0 4px;">Paiement confirmé !</h2>
      <p style="color:#6b7280;font-size:0.88rem;margin:0;">Félicitations ${_escHtml(prenom)} ${_escHtml(nom)}</p>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:0.9rem;color:#166534;line-height:1.6;">Votre paiement pour <strong>${activityTitle}</strong> a été vérifié et confirmé. Votre place est réservée.</p>
    </div>
    ${codeBlock}
    ${_waGroupBlock(wa)}
    ${zoomBlock}
    <div style="background:#f8fafc;border-radius:10px;padding:12px;margin-top:14px;font-size:0.82rem;color:#6b7280;">
      <p style="margin:0;"><strong>📧</strong> ${_escHtml(email)}</p>
    </div>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:0.75rem;margin-top:16px;">© 2026 Rasin Ayiti × UNITECH — +509 46807922</p>
</div>`;
}

async function sendWAGroupInviteEmail(participant, waLink, waName) {
    const settings = await getSiteSettings();
    const link = waLink || settings.waLink;
    const name = waName || settings.waName;
    const subject = '📱 ' + name + ' — Rasin Ayiti';
    const html = _waGroupInviteHtml(
        participant.prenom, participant.nom, participant.email,
        link, participant.whatsapp || participant.telephone, name
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
        const regActivity = payload.activity || 'Séminaire sur les Compétences de Vie';
        subject = '📋 Inscription reçue — ' + regActivity + ' | Rasin Ayiti';
        html = _registrationHtml(payload.prenom, payload.nom, payload.to, regActivity, payload.wa);
    } else if (payload.type === 'confirmation') {
        subject = '✅ Paiement confirmé — ' + (payload.activity || 'Rasin Ayiti');
        html = _confirmationHtml(payload.prenom, payload.nom, payload.to,
                                  payload.access_code, payload.zoom_link,
                                  payload.zoom_id, payload.zoom_pass, payload.wa);
    } else if (payload.type === 'payment_confirmed') {
        const payActivity = payload.activity || 'votre activité';
        subject = '✅ Paiement confirmé — ' + payActivity + ' | Rasin Ayiti';
        html = _paymentConfirmedHtml(payload.prenom, payload.nom, payload.to, payActivity, payload.wa, payload.zoom, payload.access_code);
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

async function sendRegistrationEmail(participant, activityTitle, overrides = {}) {
    const settings = await getSiteSettings();
    const wa = {
        link: overrides.waLink || settings.waLink,
        name: overrides.waName || settings.waName,
        number: settings.waNumber
    };
    const activity = activityTitle || overrides.activity || 'Séminaire sur les Compétences de Vie';
    console.log('📧 sendRegistrationEmail pour:', participant.email, '—', activity, 'ID:', participant.id);
    try {
        const result = await sendEmail({
            type: 'registration',
            to: participant.email,
            prenom: participant.prenom,
            nom: participant.nom,
            activity,
            wa
        });
        // Marquer comme envoyé après succès
        console.log('✉️ Email envoyé, marquage pour ID:', participant.id);
        if (participant.id) await markEmailSent(participant.id);
        return result;
    } catch (emailError) {
        console.error('❌ Erreur envoi email:', emailError);
        console.error('❌ Détails email error:', emailError.message);
        // Ne pas bloquer l'inscription si l'email échoue
        return { success: false, error: emailError.message };
    }
}

async function sendConfirmationEmail(participant, zoomConfig) {
    const settings = await getSiteSettings();
    const zoom = (zoomConfig && zoomConfig.link && !/VOTRE|configurer/i.test(zoomConfig.link))
        ? { link: zoomConfig.link, meetingId: zoomConfig.meetingId || '', password: zoomConfig.password || '' }
        : { link: settings.zoomLink, meetingId: settings.zoomId, password: settings.zoomPass };
    const wa = { link: settings.waLink, name: settings.waName, number: settings.waNumber };
    const activity = participant.activity || 'Séminaire sur les Compétences de Vie';
    console.log('📧 sendConfirmationEmail pour:', participant.email, 'ID:', participant.id);
    const result = await sendEmail({
        type: 'confirmation',
        to: participant.email,
        prenom: participant.prenom,
        nom: participant.nom,
        access_code: participant.access_code,
        zoom_link:   zoom.link,
        zoom_id:     zoom.meetingId,
        zoom_pass:   zoom.password,
        activity,
        wa
    });
    // Marquer comme envoyé après succès
    console.log('✉️ Email confirmé envoyé, marquage pour ID:', participant.id);
    if (participant.id) await markEmailSent(participant.id);
    return result;
}

// Envoyé automatiquement quand un admin valide un paiement (certificat / activité)
async function sendPaymentConfirmedEmail(participant, activityTitle) {
    const settings = await getSiteSettings();
    const wa = { link: settings.waLink, name: settings.waName, number: settings.waNumber };
    const zoom = { link: settings.zoomLink, id: settings.zoomId, pass: settings.zoomPass };
    const activity = activityTitle || 'votre activité';
    console.log('📧 sendPaymentConfirmedEmail pour:', participant.email, '—', activity);
    return sendEmail({
        type: 'payment_confirmed',
        to: participant.email,
        prenom: participant.prenom,
        nom: participant.nom,
        activity,
        wa,
        zoom,
        access_code: participant.access_code
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

// ============================================================
// ZOOM CONFIG — Shared via Supabase (not just localStorage)
// ============================================================

async function saveZoomConfigToDb(config) {
    if (!supabaseClient) throw new Error('Supabase non connecté');
    console.log('💾 Saving Zoom config:', config);
    
    // Upsert: update if exists, insert if not
    const { data, error } = await supabaseClient
        .from('zoom_config')
        .upsert({ 
            id: 1, 
            meeting_id: config.meetingId || config.meetingNumber || '',
            password: config.password || '',
            link: config.link || '',
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
    
    if (error) {
        console.error('❌ DB Save Error:', error);
        throw error;
    }
    console.log('✅ Config saved to DB:', data);
    return data;
}

async function getZoomConfigFromDb() {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase not connected');
        return null;
    }
    console.log('📖 Reading Zoom config from DB...');
    
    const { data, error } = await supabaseClient
        .from('zoom_config')
        .select('*')
        .eq('id', 1)
        .single();
    
    if (error) {
        console.error('❌ DB Read Error:', error);
        return null;
    }
    
    if (!data) {
        console.warn('⚠️ No config found in DB');
        return null;
    }
    
    console.log('✅ Config from DB:', data);
    return {
        meetingNumber: data.meeting_id,
        password: data.password,
        link: data.link
    };
}

// ============================================
// DONATION RECEIPT EMAIL
// ============================================

function _donationReceiptHtml(donation) {
    const donorName = donation.est_anonyme ? 'Donateur Anonyme' : (donation.nom_donateur || donation.association_nom || 'Donateur');
    const dateStr = new Date(donation.created_at || Date.now()).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
    return `<div style="font-family:Inter,Arial,sans-serif;max-width:580px;margin:0 auto;background:#f8fafc;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#667eea,#764ba2);border-radius:16px;padding:24px 32px;text-align:center;margin-bottom:24px;">
    <img src="${SITE_URL}/assets/logorasin.PNG" alt="RASIN AYITI" style="height:50px;width:auto;margin-bottom:10px;" />
    <h1 style="color:#fff;font-size:1.2rem;margin:0;">RASIN AYITI</h1>
    <p style="color:rgba(255,255,255,0.85);font-size:0.85rem;margin:4px 0 0;">Département de Développement Juvénile</p>
  </div>
  <div style="background:#fff;border-radius:12px;padding:28px 32px;border:1px solid #e5e7eb;">
    <div style="text-align:center;margin-bottom:20px;">
      <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:1.6rem;">🎉</div>
      <h2 style="color:#1f2937;font-size:1.15rem;margin:12px 0 4px;">Merci pour votre don !</h2>
      <p style="color:#6b7280;font-size:0.88rem;margin:0;">Votre générosité fait la différence</p>
    </div>
    <div style="background:#f0f9ff;border:2px solid #667eea;border-radius:12px;padding:20px;margin:20px 0;">
      <h3 style="font-size:0.85rem;color:#667eea;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 14px;text-align:center;">Reçu de Don</h3>
      <table style="width:100%;font-size:0.88rem;color:#374151;">
        <tr><td style="padding:6px 0;font-weight:700;">Donateur :</td><td style="padding:6px 0;">${donorName}</td></tr>
        <tr><td style="padding:6px 0;font-weight:700;">Montant :</td><td style="padding:6px 0;font-size:1.1rem;font-weight:800;color:#667eea;">${donation.montant} ${donation.devise || 'HTG'}</td></tr>
        <tr><td style="padding:6px 0;font-weight:700;">But :</td><td style="padding:6px 0;">${donation.but_don || 'Général'}${donation.activite_specifique ? ' — ' + donation.activite_specifique : ''}</td></tr>
        <tr><td style="padding:6px 0;font-weight:700;">Méthode :</td><td style="padding:6px 0;text-transform:capitalize;">${donation.methode_paiement || '-'}</td></tr>
        <tr><td style="padding:6px 0;font-weight:700;">Date :</td><td style="padding:6px 0;">${dateStr}</td></tr>
        <tr><td style="padding:6px 0;font-weight:700;">Statut :</td><td style="padding:6px 0;"><span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:700;">En attente de vérification</span></td></tr>
      </table>
    </div>
    <p style="color:#6b7280;font-size:0.85rem;line-height:1.7;margin:16px 0;">Votre don sera vérifié sous peu. Vous pouvez contacter notre équipe pour toute question :</p>
    <div style="text-align:center;margin:16px 0;">
      <a href="https://wa.me/50946807922" style="display:inline-block;background:#25D366;color:#fff;padding:10px 24px;border-radius:50px;text-decoration:none;font-weight:700;font-size:0.88rem;">📱 WhatsApp : +509 46807922</a>
    </div>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:0.75rem;margin-top:16px;">© 2026 RASIN AYITI — Département de Développement Juvénile</p>
</div>`;
}

async function sendDonationReceiptEmail(donation) {
    if (!donation.email) throw new Error('Pas d\'email pour ce don');
    const subject = '🎉 Reçu de votre don — RASIN AYITI';
    const html = _donationReceiptHtml(donation);

    const cleanEmail = donation.email.trim().replace(/\.$/, '').replace(/\s/g, '');
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        throw new Error('Email invalide: ' + donation.email);
    }

    const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: cleanEmail, subject, html }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'HTTP ' + res.status);
    return data;
}

// Expose globally
window.sendDonationReceiptEmail = sendDonationReceiptEmail;
window.sendRegistrationEmail = sendRegistrationEmail;
window.sendConfirmationEmail = sendConfirmationEmail;
window.sendPaymentConfirmedEmail = sendPaymentConfirmedEmail;
window.sendWAGroupInviteEmail = sendWAGroupInviteEmail;
window.sendReminderEmail = sendReminderEmail;
window.getSiteSettings = getSiteSettings;
window.setSiteSetting = setSiteSetting;

// Expose globally for seminar pages
window.validateAccessCode = validateAccessCode;
window.checkIsAdmin       = checkIsAdmin;
window.saveZoomConfigToDb = saveZoomConfigToDb;
window.getZoomConfigFromDb = getZoomConfigFromDb;

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

