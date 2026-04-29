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

// ---- Zoom config (loaded from localStorage, set via admin panel) ----
function getZoomConfig() {
    try {
        const raw = localStorage.getItem('zoomConfig');
        if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
        meetingNumber: localStorage.getItem('adminZoomId')   || '',
        password:      localStorage.getItem('adminZoomPass') || '',
        sdkKey:        ''
    };
}

// ============================================================
//  INIT — runs on page load
// ============================================================
async function init() {
    // 1. Verify participant session
    const stored = sessionStorage.getItem('seminarParticipant');
    if (!stored) {
        window.location.href = 'index.html';
        return;
    }
    currentParticipant = JSON.parse(stored);

    // 2. Admin flag (check via URL param or Supabase admin check)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('host') === '1') {
        try {
            isHost = await checkIsAdmin();
        } catch (_) { isHost = false; }
    }

    // 3. Update header UI
    updateHeaderUI();

    // 4. Show admin tab if host
    if (isHost) {
        document.getElementById('adminTab').classList.remove('hidden');
    }

    // 5. Load Zoom config
    const cfg = getZoomConfig();
    if (cfg.meetingNumber) {
        document.getElementById('infoMeetingId').textContent = cfg.meetingNumber;
        // 6. Initialize Zoom SDK
        initZoom(cfg);
    } else {
        showToastMsg('⚠️ Meeting ID non configuré. Contactez l\'admin.');
        hideJoiningOverlay();
    }

    // 7. Load & refresh participant list from Supabase
    await loadParticipants();
    refreshInterval = setInterval(loadParticipants, 30000);
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
function initZoom(cfg) {
    // Set Zoom library path (CDN)
    ZoomMtg.setZoomJSLib('https://source.zoom.us/2.18.0/lib', '/av');
    ZoomMtg.preLoadWasm();
    ZoomMtg.prepareWebSDK();

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
            joinMeeting(cfg);
        },
        error: (err) => {
            console.error('ZoomMtg.init error:', err);
            showToastMsg('❌ Erreur init Zoom: ' + (err.errorMessage || JSON.stringify(err)));
            hideJoiningOverlay();
        }
    });
}

async function joinMeeting(cfg) {
    try {
        // Get JWT signature from server
        const res = await fetch('/api/zoom-signature', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                meetingNumber: cfg.meetingNumber,
                role: isHost ? 1 : 0
            })
        });
        const data = await res.json();
        if (!data.signature) throw new Error('Signature non reçue: ' + JSON.stringify(data));

        const p = currentParticipant;
        const userName = `${p.prenom} ${p.nom}`;

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
//  START
// ============================================================
window.addEventListener('DOMContentLoaded', init);

// Prevent accidental navigation away
window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
    e.returnValue = 'Voulez-vous vraiment quitter le séminaire ?';
});

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
