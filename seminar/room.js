/* ============================================================
   ROOM.JS — Zoom Web SDK + Participant Tracking
   ============================================================ */

'use strict';

// ---- State ----
let currentParticipant = null;
let isHost   = false;
let micOn    = false;
let camOn    = false;
let handRaised = false;
let chatMessages = [];
let presentParticipants = [];
let refreshInterval = null;

// ---- Zoom config (loaded from Supabase DB, set via admin panel) ----
// HARDCODED FALLBACK — Seminar meeting details
const HARDCODED_ZOOM_CONFIG = {
    meetingNumber: '83538746946',
    password: '822928',
    link: 'https://unitech-edu-ht.zoom.us/j/83538746946?pwd=6a8lbOLvWMyE9p12YAHS6PPbldpBMz.1',
    sdkKey: ''
};

async function getZoomConfig() {
    // 1. Try to get from Supabase DB first (shared with all users)
    try {
        if (typeof getZoomConfigFromDb === 'function') {
            const dbConfig = await getZoomConfigFromDb();
            if (dbConfig && dbConfig.meetingNumber) {
                console.log('✅ Using DB config:', dbConfig.meetingNumber);
                return { ...dbConfig, sdkKey: '' };
            }
        }
    } catch (e) { console.warn('DB config error:', e); }
    
    // 2. Fallback to localStorage
    try {
        const raw = localStorage.getItem('zoomConfig');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.meetingNumber) {
                console.log('✅ Using localStorage config');
                return { ...parsed, sdkKey: '' };
            }
        }
    } catch (_) {}
    
    // 3. HARDCODED fallback — ensures seminar always works
    console.log('⚠️ Using HARDCODED fallback config');
    return HARDCODED_ZOOM_CONFIG;
}

// ============================================================
//  INIT — runs on page load
// ============================================================
async function init() {
    console.log('🟢 === room.js init() START ===');
    
    try {
        // 1. Verify participant session (OR bypass during live)
        const stored = sessionStorage.getItem('seminarParticipant');
        const bypassCode = new URLSearchParams(window.location.search).get('live') === '1';
        
        if (!stored && !bypassCode) {
            console.log('❌ No participant session, redirecting...');
            window.location.href = 'index.html';
            return;
        }
        
        // If bypass mode (direct live entry), create generic participant
        if (!stored && bypassCode) {
            currentParticipant = {
                prenom: 'Participant',
                nom: 'Live',
                email: 'live@seminar.rasin',
                statut_paiement: 'verifie'
            };
            sessionStorage.setItem('seminarParticipant', JSON.stringify(currentParticipant));
            console.log('✅ Live bypass mode - generic participant created');
        } else {
            currentParticipant = JSON.parse(stored);
        }
        console.log('✅ Participant:', currentParticipant.prenom, currentParticipant.nom);

        // 2. Admin flag (check via URL param or Supabase admin check)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('host') === '1') {
            try {
                isHost = await checkIsAdmin();
                console.log('👑 Is host:', isHost);
            } catch (e) { 
                console.log('👑 Admin check failed:', e.message);
                isHost = false; 
            }
        }

        // 3. Update header UI
        updateHeaderUI();

        // 4. Show admin tab if host
        if (isHost) {
            const adminTab = document.getElementById('adminTab');
            if (adminTab) adminTab.classList.remove('hidden');
        }

        // 5. Check if code already verified
        console.log('🔐 Checking code verification...');
        if (isCodeVerified()) {
            console.log('✅ Code already verified - showing Restream');
            showRestreamEmbed();
            await registerViewer();
            setInterval(updateViewerPresence, 30000);
        } else {
            console.log('🔐 Code gate displayed - waiting for user input');
        }

        // 6. Register viewer in Supabase for tracking
        await registerViewer();
        
        // 7. Start viewer heartbeat (update presence every 30s)
        setInterval(updateViewerPresence, 30000);

        // 7. Load & refresh participant list from Supabase
        try {
            await loadParticipants();
            refreshInterval = setInterval(loadParticipants, 30000);
        } catch (e) {
            console.error('❌ Error loading participants:', e);
        }
        
        console.log('🟢 === init() COMPLETE ===');
    } catch (err) {
        console.error('❌❌❌ GLOBAL init() ERROR:', err);
        showToastMsg('❌ Erreur: ' + err.message);
        hideJoiningOverlay();
    }
}

// ============================================================
//  HEADER UI
// ============================================================
function updateHeaderUI() {
    const p = currentParticipant;
    const initials = ((p.prenom || '?')[0] + (p.nom || '')[0]).toUpperCase();
    document.getElementById('headerAvatar').textContent = initials;
    document.getElementById('headerName').textContent = `${p.prenom} ${p.nom}`;
}

// ============================================================
//  ZOOM SDK INITIALIZATION
// ============================================================
async function initZoom(cfg) {
    console.log('🎥 === initZoom START ===');
    console.log('🎥 Config:', cfg);
    console.log('🎥 Meeting Number:', cfg.meetingNumber);
    console.log('🎥 Password:', cfg.password ? '(set)' : '(empty)');
    
    // Set Zoom library path (CDN)
    console.log('🎥 Setting Zoom JS Lib...');
    ZoomMtg.setZoomJSLib('https://source.zoom.us/2.18.0/lib', '/av');
    console.log('🎥 preLoadWasm...');
    ZoomMtg.preLoadWasm();
    console.log('🎥 prepareWebSDK...');
    ZoomMtg.prepareWebSDK();

    console.log('🎥 Calling ZoomMtg.init...');
    ZoomMtg.init({
        leaveUrl:        window.location.origin + '/seminar/index.html',
        isSupportAV:     true,
        isSupportChat:   true,
        isSupportQA:     false,
        isSupportBreakout: false,
        videoDrag:       false,
        videoHeader:     false,
        isShowJoiningErrorDialog: true,
        meetingInfo: ['topic', 'host', 'participant'],
        success: () => {
            console.log('✅ ZoomMtg.init SUCCESS - calling joinMeeting...');
            joinMeeting(cfg);
        },
        error: (err) => {
            console.error('❌ ZoomMtg.init error:', err);
            showToastMsg('❌ Erreur init Zoom: ' + (err.errorMessage || JSON.stringify(err)));
            hideJoiningOverlay();
        }
    });
    console.log('🎥 ZoomMtg.init called, waiting for callback...');
}

async function joinMeeting(cfg) {
    console.log('🚀 === joinMeeting START ===');
    try {
        // Get JWT signature from server
        console.log('📡 Fetching signature from /api/zoom-signature...');
        console.log('📡 Meeting Number:', cfg.meetingNumber);
        const res = await fetch('/api/zoom-signature', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                meetingNumber: cfg.meetingNumber,
                role: isHost ? 1 : 0
            })
        });
        const data = await res.json();
        console.log('📡 Signature response:', data);
        if (!data.signature) throw new Error('Signature non reçue: ' + JSON.stringify(data));
        console.log('✅ Signature received, calling ZoomMtg.join...');

        const p = currentParticipant;
        const userName = `${p.prenom} ${p.nom}`;
        console.log('👤 Joining as:', userName);

        ZoomMtg.join({
            signature:     data.signature,
            meetingNumber: String(cfg.meetingNumber).replace(/\s/g, ''),
            userName:      userName,
            sdkKey:        data.sdkKey,
            userEmail:     p.email || '',
            passWord:      cfg.password || '',
            success: () => {
                console.log('✅ Joined Zoom meeting');
                hideJoiningOverlay();
                // Register presence in Supabase
                markPresent();
                // Bind Zoom SDK events
                bindZoomEvents();
            },
            error: (err) => {
                console.error('Zoom join error:', err);
                showToastMsg('❌ Erreur connexion: ' + (err.errorMessage || err.reason || JSON.stringify(err)));
                hideJoiningOverlay();
            }
        });
    } catch (err) {
        console.error('joinMeeting error:', err);
        showToastMsg('❌ ' + err.message);
        hideJoiningOverlay();
    }
}

// ============================================================
//  ZOOM SDK EVENTS
// ============================================================
function bindZoomEvents() {
    // User joins
    ZoomMtg.inMeetingServiceListener('onUserJoin', (data) => {
        console.log('User joined:', data);
        loadParticipants();
    });

    // User leaves
    ZoomMtg.inMeetingServiceListener('onUserLeave', (data) => {
        console.log('User left:', data);
        loadParticipants();
    });

    // Audio change
    ZoomMtg.inMeetingServiceListener('onUserAudioStatusChange', (data) => {
        console.log('Audio changed:', data);
        // Refresh participant list to update mute indicators
        loadParticipants();
    });
}

// ============================================================
//  PRESENCE TRACKING (Supabase)
// ============================================================
async function markPresent() {
    if (!currentParticipant || !supabaseClient) return;
    try {
        await supabaseClient
            .from('participants')
            .update({ is_present: true, last_seen: new Date().toISOString() })
            .eq('id', currentParticipant.id);
    } catch (err) {
        console.warn('markPresent error:', err);
    }
}

async function loadParticipants() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient
            .from('participants')
            .select('id, nom, prenom, email, statut_paiement, is_present, access_code')
            .eq('statut_paiement', 'verifie')
            .order('prenom');

        if (error) throw error;
        presentParticipants = data || [];
        renderParticipantsList();
    } catch (err) {
        console.warn('loadParticipants error:', err);
    }
}

function renderParticipantsList() {
    const list  = document.getElementById('participantsList');
    const count = document.getElementById('pCount');
    const info  = document.getElementById('infoCount');

    const present = presentParticipants.filter(p => p.is_present);
    if (count) count.textContent = present.length;
    if (info)  info.textContent  = present.length;

    if (!list) return;

    if (presentParticipants.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:24px;color:rgba(255,255,255,0.3);font-size:0.8rem;">Aucun participant confirmé</div>`;
        return;
    }

    list.innerHTML = presentParticipants.map(p => {
        const initials = ((p.prenom||'?')[0] + (p.nom||'')[0]).toUpperCase();
        const isMe     = p.id === currentParticipant?.id;
        const online   = p.is_present;

        return `
        <div class="participant-item" title="${p.email}">
            <div class="p-avatar ${isHost ? 'host' : ''}">${initials}</div>
            <div class="p-info">
                <div class="p-name">${p.prenom} ${p.nom}${isMe ? ' <span style="color:var(--primary);font-size:0.7rem;">(vous)</span>' : ''}</div>
                <div class="p-email">${p.email}</div>
            </div>
            ${isHost && !isMe ? `
            <div class="p-actions">
                <button class="p-action-btn danger" onclick="adminMuteUser('${p.id}')" title="Couper le micro">
                    <i class="fas fa-microphone-slash"></i>
                </button>
                <button class="p-action-btn" onclick="adminAllowSpeak('${p.id}','${p.prenom} ${p.nom}')" title="Donner la parole">
                    <i class="fas fa-microphone"></i>
                </button>
            </div>` : ''}
            <div class="p-status ${online ? '' : 'muted'}" title="${online ? 'En ligne' : 'Hors ligne'}"></div>
        </div>`;
    }).join('');
}

// ============================================================
//  MIC / CAMERA CONTROLS (student)
// ============================================================
function toggleMic() {
    micOn = !micOn;
    const btn  = document.getElementById('btnMic');
    const icon = document.getElementById('micIcon');
    if (micOn) {
        btn.classList.remove('active-muted');
        btn.classList.add('active');
        icon.className = 'fas fa-microphone';
        ZoomMtg.mute({ mute: false, userId: 0 });
    } else {
        btn.classList.add('active-muted');
        btn.classList.remove('active');
        icon.className = 'fas fa-microphone-slash';
        ZoomMtg.mute({ mute: true, userId: 0 });
    }
}

function toggleCam() {
    camOn = !camOn;
    const btn  = document.getElementById('btnCam');
    const icon = document.getElementById('camIcon');
    if (camOn) {
        btn.classList.remove('active-muted');
        btn.classList.add('active');
        icon.className = 'fas fa-video';
        ZoomMtg.muteVideo({ mute: false, userId: 0 });
    } else {
        btn.classList.add('active-muted');
        btn.classList.remove('active');
        icon.className = 'fas fa-video-slash';
        ZoomMtg.muteVideo({ mute: true, userId: 0 });
    }
}

function toggleHand() {
    handRaised = !handRaised;
    const btn  = document.getElementById('btnHand');
    const icon = document.getElementById('handIcon');
    if (handRaised) {
        btn.classList.add('hand-raised');
        icon.style.color = 'var(--warning)';
        ZoomMtg.raiseHand();
        appendChatMessage({
            name: `${currentParticipant.prenom} ${currentParticipant.nom}`,
            text: '✋ A levé la main',
            type: 'raise-hand',
            own: false
        });
        showToastMsg('✋ Vous avez levé la main');
    } else {
        btn.classList.remove('hand-raised');
        icon.style.color = '';
        ZoomMtg.lowerHand({ userId: 0 });
        showToastMsg('Main baissée');
    }
}

function leaveMeeting() {
    if (refreshInterval) clearInterval(refreshInterval);
    // Mark as no longer present
    if (supabaseClient && currentParticipant) {
        supabaseClient.from('participants')
            .update({ is_present: false })
            .eq('id', currentParticipant.id)
            .then(() => {});
    }
    ZoomMtg.leaveMeeting({});
    sessionStorage.removeItem('seminarParticipant');
    window.location.href = 'index.html';
}

// ============================================================
//  ADMIN CONTROLS (host only)
// ============================================================
function adminMuteAll() {
    ZoomMtg.mute({ mute: true, userId: 'all' });
    showToastMsg('🔇 Tous les micros sont coupés');
}

function adminUnmuteAll() {
    ZoomMtg.mute({ mute: false, userId: 'all' });
    showToastMsg('🎤 Micros autorisés');
}

function adminMuteUser(userId) {
    ZoomMtg.mute({ mute: true, userId });
    showToastMsg('🔇 Micro coupé');
}

function adminAllowSpeak(userId, name) {
    ZoomMtg.mute({ mute: false, userId });
    showToastMsg(`🎤 ${name} peut parler`);
}

function adminShowHands() {
    switchTab('chat');
    showToastMsg('💡 Voir les mains levées dans le chat');
}

function adminSetHD() {
    try {
        ZoomMtg.getCurrentUser({
            success: () => {
                showToastMsg('📺 Qualité HD activée (selon réseau)');
            }
        });
    } catch(_) {
        showToastMsg('📺 Qualité dépend de votre connexion');
    }
}

function adminConfirmEndMeeting() {
    document.getElementById('endModal').classList.remove('hidden');
}

function closeEndModal() {
    document.getElementById('endModal').classList.add('hidden');
}

function adminEndMeeting() {
    closeEndModal();
    ZoomMtg.endMeeting({});
    window.location.href = '../admin.html';
}

// ============================================================
//  CHAT (internal Zoom chat wrapper)
// ============================================================
function handleChatKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const text  = input.value.trim();
    if (!text) return;
    input.value = '';

    const p = currentParticipant;
    // Send via Zoom SDK chat
    try {
        ZoomMtg.sendChat({ message: text });
    } catch (_) {}

    // Also show in our custom chat
    appendChatMessage({
        name: `${p.prenom} ${p.nom}`,
        text,
        own: true,
        type: 'normal'
    });
}

function appendChatMessage({ name, text, own, type }) {
    const container = document.getElementById('chatMessages');
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
    const div = document.createElement('div');
    div.className = `chat-msg${own ? ' own' : ''}${type === 'raise-hand' ? ' raise-hand' : ''}`;
    div.innerHTML = `
        <div class="chat-msg-avatar">${initials}</div>
        <div class="chat-msg-body">
            <div class="chat-msg-name">${escHtml(name)}</div>
            <div class="chat-msg-text">${escHtml(text)}</div>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;');
}

// ============================================================
//  TABS
// ============================================================
function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const btn = document.querySelector(`[data-tab="${name}"]`);
    if (btn) btn.classList.add('active');
    const panel = document.getElementById(`tab-${name}`);
    if (panel) panel.classList.add('active');
}

// ============================================================
//  HELPERS
// ============================================================
function hideJoiningOverlay() {
    const ov = document.getElementById('joiningOverlay');
    if (ov) {
        ov.classList.add('hidden');
        setTimeout(() => ov.remove(), 600);
    }
}

function showToastMsg(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

// ============================================================
//  RESTREAM CODE VERIFICATION
// ============================================================

const RESTREAM_CONFIG = {
    // Admin sets this code - change to your actual Restream code
    accessCode: 'RESTREAM2026', 
    embedUrl: '', // Your Restream embed URL will be set here
    backupUrl: 'https://restream.io/watch' // Fallback URL
};

// Check if code was already verified in this session
function isCodeVerified() {
    return sessionStorage.getItem('restreamCodeVerified') === 'true';
}

function verifyRestreamCode() {
    const input = document.getElementById('restreamCodeInput');
    const error = document.getElementById('codeError');
    const code = input.value.trim().toUpperCase();
    
    // Accept multiple codes - main code or admin code
    const validCodes = [RESTREAM_CONFIG.accessCode, 'RASIN2026', 'LIVE2026', 'UNITECH'];
    
    if (validCodes.includes(code)) {
        console.log('✅ Code verified!');
        sessionStorage.setItem('restreamCodeVerified', 'true');
        
        // Hide code gate
        const gate = document.getElementById('codeGate');
        if (gate) gate.style.display = 'none';
        
        // Show Restream iframe
        showRestreamEmbed();
        
        // Register viewer
        registerViewer();
        
        showToastMsg('✅ Accès Restream autorisé!');
    } else {
        error.textContent = 'Code incorrect. Essayez encore.';
        input.classList.add('error');
        setTimeout(() => input.classList.remove('error'), 1000);
    }
}

function showRestreamEmbed() {
    const frame = document.getElementById('restreamFrame');
    const waiting = document.getElementById('restreamWaiting');
    const videoArea = document.getElementById('videoArea');
    
    // Hide waiting message
    if (waiting) waiting.style.display = 'none';
    
    // Show iframe with Restream
    if (frame) {
        // Use embed URL or backup
        const url = RESTREAM_CONFIG.embedUrl || RESTREAM_CONFIG.backupUrl;
        frame.src = url;
        frame.style.display = 'block';
    }
    
    // Add active class to video area
    if (videoArea) videoArea.classList.add('active');
    
    console.log('📺 Restream embed shown');
}

// Handle Enter key in code input
function handleCodeKey(e) {
    if (e.key === 'Enter') {
        verifyRestreamCode();
    }
}

// ============================================================
//  VIEWER TRACKING (Register each user watching)
// ============================================================
async function registerViewer() {
    if (!currentParticipant) return;
    if (!supabaseClient) {
        console.warn('⚠️ Supabase not connected - viewer not tracked');
        return;
    }
    
    const viewerData = {
        participant_id: currentParticipant.id || null,
        prenom: currentParticipant.prenom,
        nom: currentParticipant.nom,
        email: currentParticipant.email,
        platform: currentPlatform,
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        is_active: true
    };
    
    try {
        const { data, error } = await supabaseClient
            .from('live_viewers')
            .upsert(viewerData, { onConflict: 'participant_id' });
        
        if (error) {
            console.error('❌ Error registering viewer:', error);
        } else {
            console.log('✅ Viewer registered:', currentParticipant.prenom);
        }
    } catch (e) {
        console.error('❌ Error registering viewer:', e);
    }
}

async function updateViewerPresence() {
    if (!currentParticipant) return;
    if (!supabaseClient) return;
    
    try {
        await supabaseClient
            .from('live_viewers')
            .update({ 
                last_seen: new Date().toISOString(),
                platform: currentPlatform,
                is_active: true
            })
            .eq('participant_id', currentParticipant.id);
    } catch (e) {
        console.error('❌ Error updating presence:', e);
    }
}

async function removeViewer() {
    if (!currentParticipant) return;
    if (!supabaseClient) return;
    
    try {
        await supabaseClient
            .from('live_viewers')
            .update({ is_active: false })
            .eq('participant_id', currentParticipant.id);
        console.log('👋 Viewer marked as left:', currentParticipant.prenom);
    } catch (e) {
        console.error('❌ Error removing viewer:', e);
    }
}

// ============================================================
//  REACTIONS SYSTEM (Real-time reactions from viewers)
// ============================================================
async function sendReaction(emoji) {
    if (!currentParticipant) return;
    if (!supabaseClient) {
        showToastMsg('❌ Chat non disponible');
        return;
    }
    
    const reactionData = {
        participant_id: currentParticipant.id || null,
        prenom: currentParticipant.prenom,
        nom: currentParticipant.nom,
        emoji: emoji,
        platform: currentPlatform,
        created_at: new Date().toISOString()
    };
    
    try {
        const { error } = await supabaseClient
            .from('live_reactions')
            .insert(reactionData);
        
        if (error) {
            console.error('❌ Error sending reaction:', error);
        } else {
            showFloatingReaction(emoji);
            console.log('✅ Reaction sent:', emoji);
        }
    } catch (e) {
        console.error('❌ Error sending reaction:', e);
    }
}

function showFloatingReaction(emoji) {
    const reaction = document.createElement('div');
    reaction.textContent = emoji;
    reaction.style.cssText = `
        position: fixed;
        left: ${Math.random() * 80 + 10}%;
        bottom: 100px;
        font-size: 2rem;
        animation: floatUp 2s ease-out forwards;
        pointer-events: none;
        z-index: 1000;
    `;
    document.body.appendChild(reaction);
    setTimeout(() => reaction.remove(), 2000);
}

// Add floating animation
const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        0% { transform: translateY(0) scale(1); opacity: 1; }
        100% { transform: translateY(-300px) scale(1.5); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ============================================================
//  START
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOMContentLoaded fired');
    init();
});

// Mark viewer as left when leaving
window.addEventListener('beforeunload', (e) => {
    removeViewer();
});

// Mark viewer as left when leaving (already handled above)
window.addEventListener('beforeunload', (e) => {
    removeViewer();
    e.preventDefault();
    e.returnValue = 'Voulez-vous vraiment quitter le séminaire ?';
});

// ============================================================
//  CERTIFICATE (only for paid participants)
// ============================================================
function downloadCertificateFromRoom() {
    if (!currentParticipant) return;
    const p = currentParticipant;

    // Check payment status
    if (p.statut_paiement !== 'verifie') {
        showToastMsg('🔒 Certificat disponible après paiement. Allez sur la page de paiement.');
        setTimeout(() => {
            if (confirm('Voulez-vous aller à la page de paiement pour obtenir votre certificat ?')) {
                window.open('../payment.html', '_blank');
            }
        }, 1500);
        return;
    }

    // Generate certificate PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // Background gradient simulation
    doc.setFillColor(250, 250, 255);
    doc.rect(0, 0, W, H, 'F');

    // Border
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(1.5);
    doc.rect(10, 10, W - 20, H - 20, 'S');

    // Inner border (gold)
    doc.setDrawColor(251, 191, 36);
    doc.setLineWidth(0.5);
    doc.rect(14, 14, W - 28, H - 28, 'S');

    // Header
    doc.setTextColor(79, 70, 229);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RASIN AYITI  ×  UNIVERSITÉ DE TECHNOLOGIE D\'HAÏTI (UNITECH)', W / 2, 16, { align: 'center' });

    // Title
    doc.setTextColor(79, 70, 229);
    doc.setFontSize(38);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICAT', W / 2, 48, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 120);
    doc.text('DE PARTICIPATION AU SÉMINAIRE', W / 2, 58, { align: 'center' });

    // Decorative line
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.3);
    doc.line(W / 2 - 60, 64, W / 2 + 60, 64);

    // "Certifié à"
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 140);
    doc.text('Ce certificat est décerné à', W / 2, 74, { align: 'center' });

    // Participant name
    doc.setFontSize(30);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(`${p.prenom} ${p.nom}`, W / 2, 88, { align: 'center' });

    // Body text
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 100);
    doc.setFont('helvetica', 'normal');
    const bodyText = `Pour sa participation active au séminaire sur les Compétences de Vie :\n"5 Secrets pour Réussir comme Jeune et Devenir Créateur d'Opportunités en Haïti"\n\nDate : 30 Avril et 1er Mai 2026\nFormat : En ligne via Zoom`;
    doc.text(bodyText, W / 2, 102, { align: 'center', lineHeightFactor: 1.5 });

    // Signatures section
    const sigY = H - 45;

    // Left signature (Rasin Ayiti)
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 120);
    doc.text('Rasin Ayiti', 50, sigY + 12, { align: 'center' });
    doc.line(30, sigY, 70, sigY);

    // Center (seal)
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(2);
    doc.circle(W / 2, sigY + 5, 12, 'S');
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text('SCELLÉ', W / 2, sigY + 7, { align: 'center' });

    // Right signature (UNITECH)
    doc.setTextColor(100, 100, 120);
    doc.setFontSize(10);
    doc.text('UNITECH', W - 50, sigY + 12, { align: 'center' });
    doc.line(W - 70, sigY, W - 30, sigY);

    // Footer with verification code
    doc.setFontSize(9);
    doc.setTextColor(160, 160, 180);
    doc.text(`Code de vérification: ${p.access_code}   |   Email: ${p.email}`, W / 2, H - 16, { align: 'center' });

    doc.save(`Certificat_${p.prenom}_${p.nom}_RasinAyiti2026.pdf`);
    showToastMsg('✅ Certificat téléchargé !');

    // Mark as downloaded in DB
    try {
        if (supabaseClient) {
            supabaseClient.from('participants')
                .update({ certificat_downloaded: true, certificat_date: new Date().toISOString() })
                .eq('id', p.id)
                .then(() => {});
        }
    } catch(e) { console.warn('Marquage certificat:', e.message); }
}

// Expose functions used in HTML
window.switchTab             = switchTab;
window.toggleMic             = toggleMic;
window.toggleCam             = toggleCam;
window.toggleHand            = toggleHand;
window.leaveMeeting          = leaveMeeting;
window.sendChatMessage       = sendChatMessage;
window.handleChatKey         = handleChatKey;
window.adminMuteAll          = adminMuteAll;
window.adminUnmuteAll        = adminUnmuteAll;
window.adminMuteUser         = adminMuteUser;
window.adminAllowSpeak       = adminAllowSpeak;
window.adminShowHands        = adminShowHands;
window.adminSetHD            = adminSetHD;
window.adminConfirmEndMeeting= adminConfirmEndMeeting;
window.closeEndModal         = closeEndModal;
window.adminEndMeeting       = adminEndMeeting;
window.downloadCertificateFromRoom = downloadCertificateFromRoom;
window.verifyRestreamCode    = verifyRestreamCode;
window.handleCodeKey         = handleCodeKey;
window.sendReaction          = sendReaction;
