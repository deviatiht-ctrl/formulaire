// ============================================================
// ACCESS.JS — Gestion de l'espace participant
// ============================================================

// ---- CONFIG ZOOM (admin met à jour ces valeurs) ----
const ZOOM_LINK        = 'https://zoom.us/j/VOTRE_MEETING_ID?pwd=VOTRE_MOT_DE_PASSE';
const ZOOM_MEETING_ID  = 'Configurez dans admin';
const ZOOM_PASSWORD    = 'Configurez dans admin';
// -----------------------------------------------------

let currentParticipant = null;

function show(id) {
    ['screenCode','screenDash','screenLoad'].forEach(s => {
        document.getElementById(s).classList.add('hidden');
    });
    document.getElementById(id).classList.remove('hidden');
}

// ---- Validate code on Enter key ----
document.getElementById('codeInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkCode();
});

async function checkCode() {
    const input = document.getElementById('codeInput');
    const code = input.value.trim().toUpperCase();
    const errorEl = document.getElementById('codeError');

    if (!code || code.length < 4) {
        input.classList.add('error');
        errorEl.textContent = 'Entrez votre code d\'accès (ex: RA2026AB)';
        return;
    }

    input.classList.remove('error');
    errorEl.textContent = '';
    show('screenLoad');

    try {
        const participant = await validateAccessCode(code);

        if (!participant) {
            show('screenCode');
            input.classList.add('error');
            errorEl.textContent = '❌ Code invalide. Vérifiez votre email.';
            return;
        }

        currentParticipant = participant;
        sessionStorage.setItem('accessParticipant', JSON.stringify(participant));
        renderDashboard(participant);
        show('screenDash');

    } catch (err) {
        show('screenCode');
        errorEl.textContent = 'Erreur réseau. Réessayez.';
        console.error(err);
    }
}

function renderDashboard(p) {
    // Header
    document.getElementById('dashName').textContent = `${p.prenom} ${p.nom}`;
    document.getElementById('dashCode').textContent = p.access_code;

    // Zoom
    document.getElementById('zoomJoinBtn').href = ZOOM_LINK;
    document.getElementById('zoomMeetingId').textContent = ZOOM_MEETING_ID;
    document.getElementById('zoomPassword').textContent = ZOOM_PASSWORD;

    // Participant info
    document.getElementById('participantInfo').innerHTML = `
        <table style="width:100%; border-collapse:collapse;">
            <tr><td style="padding:5px 0; color:var(--text-muted);">Nom</td><td style="font-weight:600;">${p.nom} ${p.prenom}</td></tr>
            <tr><td style="padding:5px 0; color:var(--text-muted);">Email</td><td style="font-weight:600;">${p.email}</td></tr>
            <tr><td style="padding:5px 0; color:var(--text-muted);">Téléphone</td><td style="font-weight:600;">${p.telephone || '—'}</td></tr>
            <tr><td style="padding:5px 0; color:var(--text-muted);">Paiement</td><td>${paymentBadge(p.statut_paiement)}</td></tr>
        </table>
    `;

    // Certificate section
    const certEl = document.getElementById('certSection');
    if (p.statut_paiement === 'verifie') {
        certEl.innerHTML = `
            <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:14px;">
                Votre paiement a été confirmé ✅. Vous pouvez télécharger votre certificat de participation.
            </p>
            <button class="cert-btn" onclick="downloadCertificate()">
                <i class="fas fa-file-pdf"></i> Télécharger mon Certificat (PDF)
            </button>
        `;
    } else if (p.statut_paiement === 'en_attente') {
        certEl.innerHTML = `
            <div class="cert-locked">
                <i class="fas fa-lock"></i>
                <p>Votre paiement est <strong>en attente de vérification</strong>. Le certificat sera disponible une fois confirmé.<br><br>
                <a href="payment.html" style="color:var(--primary); font-weight:600;">Effectuer le paiement →</a></p>
            </div>
        `;
    } else if (p.statut_paiement === 'refuse') {
        certEl.innerHTML = `
            <div class="cert-locked">
                <i class="fas fa-times-circle" style="color:#ef4444;"></i>
                <p>Votre paiement a été <strong>refusé</strong>. Contactez-nous au +509 46807922.</p>
            </div>
        `;
    } else {
        certEl.innerHTML = `
            <div class="cert-locked">
                <i class="fas fa-lock"></i>
                <p>Certificat disponible après confirmation du paiement.<br><br>
                <a href="payment.html" style="color:var(--primary); font-weight:600;">Payer maintenant (500 Gds) →</a></p>
            </div>
        `;
    }
}

function paymentBadge(statut) {
    if (statut === 'verifie')    return '<span class="status-badge badge-verified">✅ Vérifié</span>';
    if (statut === 'en_attente') return '<span class="status-badge badge-pending">⏳ En attente</span>';
    if (statut === 'refuse')     return '<span class="status-badge badge-refused">❌ Refusé</span>';
    return '<span class="status-badge" style="background:#f3f4f6;color:#6b7280;">—</span>';
}

// ---- PDF Certificate ----
async function downloadCertificate() {
    if (!currentParticipant) return;
    const p = currentParticipant;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // Background color
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, W, H, 'F');

    // Decorative border
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(3);
    doc.rect(8, 8, W - 16, H - 16, 'S');
    doc.setLineWidth(1);
    doc.setDrawColor(167, 162, 242);
    doc.rect(12, 12, W - 24, H - 24, 'S');

    // Top green accent bar
    doc.setFillColor(21, 128, 61);
    doc.rect(8, 8, W - 16, 12, 'F');

    // Organizations line
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('RASIN AYITI  ×  UNIVERSITÉ DE TECHNOLOGIE D\'HAÏTI (UNITECH)', W / 2, 16, { align: 'center' });

    // Title CERTIFICAT
    doc.setTextColor(79, 70, 229);
    doc.setFontSize(38);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICAT', W / 2, 48, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 120);
    doc.setFont('helvetica', 'normal');
    doc.text('DE PARTICIPATION', W / 2, 58, { align: 'center' });

    // Divider
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.8);
    doc.line(W / 2 - 60, 63, W / 2 + 60, 63);

    // "Certifié à"
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 140);
    doc.text('Ce certificat est décerné à', W / 2, 74, { align: 'center' });

    // Participant name
    doc.setFontSize(30);
    doc.setTextColor(21, 128, 61);
    doc.setFont('helvetica', 'bold');
    doc.text(`${p.prenom.toUpperCase()} ${p.nom.toUpperCase()}`, W / 2, 90, { align: 'center' });

    // Event description
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 80);
    doc.setFont('helvetica', 'normal');
    doc.text('Pour sa participation au :', W / 2, 102, { align: 'center' });

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 50);
    doc.text('SÉMINAIRE SUR LES COMPÉTENCES DE VIE', W / 2, 112, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 100);
    doc.text('« 5 Secrets pour réussir comme Jeune et devenir Créateur d\'Opportunités en Haïti »', W / 2, 121, { align: 'center' });

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 120);
    doc.text('30 Avril — 1er Mai 2026', W / 2, 133, { align: 'center' });

    // Bottom divider
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.4);
    doc.line(20, 148, W - 20, 148);

    // Signature area
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 120);
    doc.text('Signature RASIN AYITI', 60, 160, { align: 'center' });
    doc.setDrawColor(150); doc.line(30, 157, 90, 157);
    doc.text('Signature UNITECH', W - 60, 160, { align: 'center' });
    doc.setDrawColor(150); doc.line(W - 90, 157, W - 30, 157);

    // Code at bottom
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 180);
    doc.text(`Code de vérification: ${p.access_code}   |   Email: ${p.email}`, W / 2, H - 16, { align: 'center' });

    doc.save(`Certificat_${p.prenom}_${p.nom}_RasinAyiti2026.pdf`);

    // Mark as downloaded in DB
    try {
        if (typeof markCertificatDownloaded === 'function') {
            await markCertificatDownloaded(p.id);
        }
    } catch(e) { console.warn('Marquage certificat:', e.message); }
}

function logout() {
    sessionStorage.removeItem('accessParticipant');
    currentParticipant = null;
    document.getElementById('codeInput').value = '';
    show('screenCode');
}

// ---- Auto-login if session exists ----
window.addEventListener('DOMContentLoaded', () => {
    const saved = sessionStorage.getItem('accessParticipant');
    if (saved) {
        try {
            currentParticipant = JSON.parse(saved);
            renderDashboard(currentParticipant);
            show('screenDash');
        } catch(e) { show('screenCode'); }
    } else {
        show('screenCode');
    }
});
