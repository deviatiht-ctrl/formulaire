// Composeur d'emails admin partagé (certificats, inscriptions événements).
// Usage : EmailComposer.open({ recipients: [{ email, prenom, nom, activite }], preset: 'libre' })
// Envoi via deliverEmails() (supabase.js) → Edge Function "send-email" → Brevo.
window.EmailComposer = (() => {
    const CHUNK = 25;
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const site = () => (typeof SITE_URL !== 'undefined' ? SITE_URL : location.origin);
    const safeUrl = u => /^(https?:\/\/|mailto:)/i.test(String(u || '').trim()) ? String(u).trim() : '';
    const safeColor = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#4f46e5';

    const PRESETS = {
        libre: { label: 'Message libre', subject: 'Message de Rasin Ayiti', title: 'Bonjour {{prenom}} 👋', body: '', button: '', url: '', color: '#4f46e5' },
        certificat: {
            label: 'Certificat disponible', color: '#16a34a',
            subject: '🎓 Votre certificat — {{activite}}', title: 'Félicitations {{prenom}} !',
            body: 'Votre certificat pour « {{activite}} » est maintenant **disponible**.\n\nConnectez-vous à votre espace étudiant avec l’adresse email utilisée lors de votre inscription pour le télécharger.',
            button: 'Télécharger mon certificat', url: () => site() + '/espace-etudiant/certificats.html'
        },
        paiement: {
            label: 'Rappel paiement certificat', color: '#ea580c',
            subject: '⏰ Rappel — paiement de votre certificat', title: 'Bonjour {{prenom}},',
            body: 'Nous n’avons pas encore validé le paiement de votre certificat pour « {{activite}} ».\n\nEnvoyez votre **preuve de paiement** sur WhatsApp afin que nous puissions la vérifier rapidement.',
            button: 'Envoyer ma preuve sur WhatsApp', url: 'https://wa.me/50946807922'
        },
        whatsapp: {
            label: 'Groupe WhatsApp', color: '#128C7E',
            subject: '📱 Rejoignez le groupe WhatsApp — {{activite}}', title: 'Bonjour {{prenom}} 👋',
            body: 'Merci pour votre inscription à « {{activite}} ».\n\nRejoignez le groupe WhatsApp officiel pour recevoir toutes les informations importantes.\n\n⚠️ Utilisez le numéro WhatsApp enregistré lors de votre inscription.',
            button: 'Rejoindre le groupe', url: async () => (window.getSiteSettings ? (await window.getSiteSettings()).waLink : '')
        },
        info: {
            label: 'Information sur l’activité', color: '#2563eb',
            subject: '📢 Information — {{activite}}', title: 'Bonjour {{prenom}},',
            body: 'Voici une information importante concernant « {{activite}} » :\n\n', button: '', url: ''
        }
    };

    const fill = (text, r) => String(text || '').replace(/\{\{\s*(prenom|nom|activite)\s*\}\}/g, (_, k) => (r && r[k]) || '');
    const format = text => esc(text).split(/\n{2,}/).map(p => `<p style="margin:0 0 14px;">${p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</p>`).join('');

    function buildHtml(o, r) {
        const color = safeColor(o.color), image = safeUrl(o.image), url = safeUrl(fill(o.url, r)), button = fill(o.button, r).trim();
        return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08);">
<tr><td style="background:${color};padding:28px 24px;text-align:center;">
<img src="${esc(site())}/assets/logorasin.PNG" width="64" height="64" alt="Rasin Ayiti" style="display:block;margin:0 auto 10px;border-radius:12px;background:#ffffff;">
<div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:1px;">RASIN AYITI</div>
<div style="color:#ffffff;opacity:.85;font-size:13px;margin-top:4px;">Département de Développement Juvénile</div>
</td></tr>
${image ? `<tr><td><img src="${esc(image)}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>` : ''}
<tr><td style="padding:32px 32px 8px;">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f172a;">${esc(fill(o.title, r))}</h1>
<div style="font-size:15px;line-height:1.7;color:#334155;">${format(fill(o.body, r))}</div>
</td></tr>
${button && url ? `<tr><td align="center" style="padding:12px 32px 8px;"><a href="${esc(url)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-weight:700;padding:14px 32px;border-radius:999px;font-size:15px;">${esc(button)}</a></td></tr>` : ''}
<tr><td style="padding:24px 32px 32px;"><div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:12px;color:#94a3b8;text-align:center;line-height:1.7;">
RASIN AYITI — Développement Juvénile<br>📞 +509 46807922 · ✉️ rasinayiti.ht@gmail.com<br>© ${new Date().getFullYear()} RASIN AYITI</div></td></tr>
</table></td></tr></table></body></html>`;
    }

    const CSS = `
.ec-dialog{width:min(1180px,96vw);max-height:94vh;border:0;border-radius:18px;padding:0;box-shadow:0 30px 80px rgba(0,0,0,.35);font-family:Inter,Arial,sans-serif;color:#0f172a}
.ec-dialog::backdrop{background:rgba(15,23,42,.55)}
.ec-head{display:flex;justify-content:space-between;align-items:center;padding:16px 22px;border-bottom:1px solid #e2e8f0;background:#f8fafc}
.ec-head h2{margin:0;font-size:1.1rem}.ec-x{background:none;border:0;font-size:1.6rem;cursor:pointer;color:#64748b}
.ec-body{display:grid;grid-template-columns:minmax(300px,420px) 1fr;gap:0;max-height:calc(94vh - 140px);overflow:auto}
.ec-form{padding:18px 22px;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;gap:12px;overflow:auto}
.ec-form label{display:flex;flex-direction:column;gap:5px;font-size:.78rem;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:.03em}
.ec-form input,.ec-form select,.ec-form textarea{font:inherit;font-size:.92rem;text-transform:none;letter-spacing:0;font-weight:400;padding:9px 11px;border:1.5px solid #cbd5e1;border-radius:9px;color:#0f172a;background:#fff}
.ec-form input,.ec-form select,.ec-form textarea{width:100%;box-sizing:border-box;min-width:0}
.ec-form input[type=color]{height:40px;padding:3px;cursor:pointer}.ec-form input[type=file]{flex:1}
.ec-form textarea{min-height:170px;resize:vertical}.ec-row{display:flex;gap:10px}.ec-row>*{flex:1;min-width:0}
.ec-hint{font-size:.75rem;color:#64748b;margin:-4px 0 0}.ec-img{display:flex;gap:8px;align-items:center}.ec-img .ec-btn{flex:0 0 auto;width:auto;padding:9px 14px}
.ec-img img{max-height:60px;border-radius:6px;border:1px solid #e2e8f0}
.ec-preview{padding:14px 18px;background:#e2e8f0;display:flex;flex-direction:column;gap:8px;min-height:480px}
.ec-preview iframe{flex:1;width:100%;min-height:460px;border:0;border-radius:12px;background:#fff}
.ec-foot{display:flex;gap:10px;align-items:center;justify-content:flex-end;flex-wrap:wrap;padding:14px 22px;border-top:1px solid #e2e8f0;background:#f8fafc}
.ec-btn{border:0;border-radius:10px;padding:11px 20px;font-weight:700;cursor:pointer;font-size:.9rem}
.ec-primary{background:linear-gradient(135deg,#4f46e5,#16a34a);color:#fff}.ec-secondary{background:#e2e8f0;color:#0f172a}
.ec-btn:disabled{opacity:.55;cursor:not-allowed}.ec-status{flex:1;min-width:220px;font-size:.85rem;color:#334155;white-space:pre-line}
.ec-bar{height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin-top:6px}.ec-bar>div{height:100%;width:0;background:#16a34a;transition:width .3s}
.ec-list{max-height:120px;overflow:auto;font-size:.8rem;color:#475569;background:#f8fafc;border-radius:8px;padding:8px;text-transform:none;font-weight:400;letter-spacing:0}
@media(max-width:820px){.ec-body{grid-template-columns:1fr}.ec-form{border-right:0}}`;

    function ensureCss() {
        if (document.getElementById('ec-style')) return;
        const style = document.createElement('style'); style.id = 'ec-style'; style.textContent = CSS; document.head.append(style);
    }

    function dedupe(recipients) {
        const seen = new Map();
        for (const r of recipients || []) {
            const email = String(r.email || '').trim().toLowerCase();
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !seen.has(email)) seen.set(email, { ...r, email });
        }
        return [...seen.values()];
    }

    function open({ recipients, preset = 'libre' } = {}) {
        const list = dedupe(recipients);
        if (!list.length) { alert('Aucun destinataire avec un email valide.'); return; }
        if (typeof window.deliverEmails !== 'function') { alert('Module email indisponible : supabase.js non chargé.'); return; }
        ensureCss();
        const d = document.createElement('dialog'); d.className = 'ec-dialog';
        d.innerHTML = `
<div class="ec-head"><h2>✉️ Composer un email — <span style="color:#4f46e5">${list.length}</span> destinataire(s)</h2><button type="button" class="ec-x" data-x aria-label="Fermer">&times;</button></div>
<div class="ec-body">
  <form class="ec-form" onsubmit="return false">
    <label>Modèle<select data-f="preset">${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${esc(p.label)}</option>`).join('')}</select></label>
    <label>Sujet<input data-f="subject" maxlength="200"></label>
    <div class="ec-row"><label>Titre<input data-f="title" maxlength="200"></label><label style="flex:0 0 90px">Couleur<input type="color" data-f="color"></label></div>
    <label>Message<textarea data-f="body"></textarea></label>
    <p class="ec-hint">Variables : {{prenom}} {{nom}} {{activite}} · **gras** · ligne vide = nouveau paragraphe</p>
    <label>Image (optionnelle)<div class="ec-img"><input type="file" data-upload accept="image/png,image/jpeg,image/webp,image/gif"><button type="button" class="ec-btn ec-secondary" data-noimg>Retirer</button></div></label>
    <input data-f="image" placeholder="…ou collez l’URL d’une image (https://)">
    <div class="ec-row"><label>Texte du bouton<input data-f="button" maxlength="80"></label><label>Lien du bouton<input data-f="url" placeholder="https://"></label></div>
    <label>Destinataires (${list.length})<div class="ec-list">${list.slice(0, 300).map(r => esc(`${r.prenom || ''} ${r.nom || ''}`.trim() || r.email) + ' — ' + esc(r.email)).join('<br>')}${list.length > 300 ? `<br>… et ${list.length - 300} autre(s)` : ''}</div></label>
  </form>
  <div class="ec-preview">
    <label style="font-size:.8rem;font-weight:700;color:#334155">Aperçu pour : <select data-who>${list.slice(0, 100).map((r, i) => `<option value="${i}">${esc(r.email)}</option>`).join('')}</select></label>
    <div style="font-size:.85rem;color:#334155"><strong>Sujet :</strong> <span data-subj></span></div>
    <iframe title="Aperçu de l’email" sandbox=""></iframe>
  </div>
</div>
<div class="ec-foot"><div class="ec-status" data-status>Vérifiez l’aperçu, puis envoyez-vous un test avant l’envoi groupé.<div class="ec-bar" hidden><div></div></div></div>
  <button type="button" class="ec-btn ec-secondary" data-diag title="Vérifier dans Brevo si l’email a été livré, bloqué ou rejeté">🔍 Diagnostic livraison</button>
  <button type="button" class="ec-btn ec-secondary" data-test>Envoyer un test à moi</button>
  <button type="button" class="ec-btn ec-primary" data-send>Envoyer à ${list.length} destinataire(s)</button></div>`;
        document.body.append(d);
        const q = s => d.querySelector(s), f = name => q(`[data-f="${name}"]`);
        const statusEl = q('[data-status]'), bar = q('.ec-bar'), iframe = q('iframe');
        let sending = false;
        const values = () => Object.fromEntries(['subject', 'title', 'body', 'image', 'button', 'url', 'color'].map(k => [k, f(k).value]));
        const status = text => { statusEl.firstChild.nodeValue = text; };
        const refresh = () => {
            const r = list[Number(q('[data-who]').value) || 0], o = values();
            q('[data-subj]').textContent = fill(o.subject, r);
            iframe.srcdoc = buildHtml(o, r);
        };
        async function applyPreset(key) {
            const p = PRESETS[key] || PRESETS.libre;
            for (const k of ['subject', 'title', 'body', 'button', 'color']) f(k).value = p[k] || '';
            f('url').value = typeof p.url === 'function' ? await p.url() || '' : p.url || '';
            refresh();
        }
        const setBusy = busy => { sending = busy; d.querySelectorAll('input,select,textarea,button').forEach(x => { if (!x.matches('[data-x]')) x.disabled = busy; }); };

        f('preset').value = PRESETS[preset] ? preset : 'libre';
        applyPreset(f('preset').value);
        f('preset').onchange = () => applyPreset(f('preset').value);
        q('.ec-form').addEventListener('input', e => { if (!e.target.matches('[data-upload]')) refresh(); });
        q('[data-who]').onchange = refresh;
        q('[data-noimg]').onclick = () => { f('image').value = ''; q('[data-upload]').value = ''; refresh(); };
        q('[data-upload]').onchange = async e => {
            const file = e.target.files[0]; if (!file) return;
            if (file.size > 5 * 1024 * 1024) { alert('Image trop lourde (5 Mo maximum).'); e.target.value = ''; return; }
            status('Téléversement de l’image…');
            try {
                const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
                const path = `emails/${crypto.randomUUID()}.${ext}`;
                const { error } = await window.supabaseClient.storage.from('events').upload(path, file, { contentType: file.type, upsert: false });
                if (error) throw error;
                f('image').value = window.supabaseClient.storage.from('events').getPublicUrl(path).data.publicUrl;
                status('Image ajoutée à l’email.'); refresh();
            } catch (err) { status('Échec du téléversement : ' + (err.message || err)); }
        };

        const validate = o => {
            if (!o.subject.trim() || !o.title.trim()) return 'Le sujet et le titre sont obligatoires.';
            if (o.button.trim() && !safeUrl(o.url)) return 'Le lien du bouton doit commencer par https://';
            if (o.image.trim() && !safeUrl(o.image)) return 'L’URL de l’image doit commencer par https://';
            return '';
        };
        q('[data-test]').onclick = async () => {
            const o = values(), problem = validate(o); if (problem) { alert(problem); return; }
            const { data } = await window.supabaseClient.auth.getUser();
            const me = data && data.user && data.user.email;
            if (!me) { alert('Connectez-vous avec votre compte administrateur pour envoyer un test.'); return; }
            const r = list[Number(q('[data-who]').value) || 0];
            setBusy(true); status('Envoi du test à ' + me + '…');
            try {
                const res = await window.deliverEmails([{ to: me, subject: '[TEST] ' + fill(o.subject, r), html: buildHtml(o, r) }]);
                const one = res && res.results && res.results[0];
                status(one && one.ok ? `✅ Brevo a accepté le test pour ${me}${one.messageId ? ' (id ' + one.messageId + ')' : ''}.\nS’il n’arrive pas dans 2 minutes (vérifiez les spams), cliquez « Diagnostic livraison ».` : '❌ ' + ((one && one.error) || 'Échec du test'));
            } catch (err) { status('❌ ' + err.message); }
            finally { setBusy(false); }
        };
        const EVENTS = { requests: '📨 Reçu par Brevo', request: '📨 Reçu par Brevo', delivered: '✅ Livré', opened: '👁 Ouvert', uniqueOpened: '👁 Ouvert', clicks: '🖱 Cliqué',
            deferred: '⏳ Différé (réessai)', softBounces: '⚠️ Rejet temporaire', hardBounces: '❌ Rejeté (adresse)', blocked: '⛔ Bloqué par Brevo',
            invalid: '❌ Adresse invalide', error: '❌ Erreur', spam: '🚫 Signalé comme spam', unsubscribed: '🔕 Désabonné' };
        q('[data-diag]').onclick = async () => {
            if (typeof window.emailDiagnostic !== 'function') { alert('Diagnostic indisponible : supabase.js non à jour.'); return; }
            const { data } = await window.supabaseClient.auth.getUser();
            const who = prompt('Email à vérifier dans Brevo :', (data && data.user && data.user.email) || list[0].email);
            if (!who) return;
            setBusy(true); status('Interrogation de Brevo…');
            try {
                const d = await window.emailDiagnostic(who.trim().toLowerCase());
                const lines = [];
                if (d.sender) lines.push(d.sender.active ? `✅ Expéditeur ${d.sender.email} validé dans Brevo.` : `❌ Expéditeur ${d.sender.email} ${d.sender.missing ? 'ABSENT' : 'NON VALIDÉ'} dans Brevo → Senders : ajoutez-le et cliquez le lien de confirmation reçu. Sans cela Brevo accepte l’envoi mais ne livre rien.`);
                if (d.account) lines.push(`Compte Brevo : ${d.account.email || ''}${d.account.plan && d.account.plan.length ? ' · ' + d.account.plan.join(', ') : ''}`);
                lines.push(d.events && d.events.length ? `Derniers événements pour ${who} :` : `Aucun événement Brevo sur 7 jours pour ${who} : l’email n’a pas été traité (expéditeur non validé ou compte en cours de validation).`);
                (d.events || []).slice(0, 8).forEach(e => lines.push(`• ${new Date(e.date).toLocaleString('fr-FR')} — ${EVENTS[e.event] || e.event}${e.reason ? ' : ' + e.reason : ''}`));
                (d.errors || []).forEach(e => lines.push('⚠️ ' + e));
                status(lines.join('\n'));
            } catch (err) { status('❌ Diagnostic impossible : ' + err.message); }
            finally { setBusy(false); }
        };
        q('[data-send]').onclick = async () => {
            const o = values(), problem = validate(o); if (problem) { alert(problem); return; }
            if (!confirm(`Envoyer « ${fill(o.subject, list[0])} » à ${list.length} destinataire(s) ?`)) return;
            setBusy(true); bar.hidden = false;
            let sent = 0; const failures = [];
            for (let i = 0; i < list.length; i += CHUNK) {
                const chunk = list.slice(i, i + CHUNK);
                status(`Envoi ${Math.min(i + CHUNK, list.length)}/${list.length}… Ne fermez pas cette fenêtre.`);
                try {
                    const res = await window.deliverEmails(chunk.map(r => ({ to: r.email, subject: fill(o.subject, r), html: buildHtml(o, r) })));
                    for (const r of (res && res.results) || []) r.ok ? sent++ : failures.push(`${r.to} : ${r.error}`);
                } catch (err) {
                    chunk.forEach(r => failures.push(`${r.email} : ${err.message}`));
                    if (/administrateur|BREVO_API_KEY|403|401/i.test(err.message)) { list.slice(i + CHUNK).forEach(r => failures.push(`${r.email} : non envoyé`)); break; }
                }
                bar.firstElementChild.style.width = Math.round(Math.min(i + CHUNK, list.length) / list.length * 100) + '%';
            }
            setBusy(false);
            status(`Terminé : ✅ ${sent} envoyé(s) · ❌ ${failures.length} échec(s)${failures.length ? '\n' + failures.slice(0, 8).join('\n') + (failures.length > 8 ? '\n…' : '') : ''}`);
        };
        const close = () => { if (!sending) d.close(); };
        q('[data-x]').onclick = close;
        d.addEventListener('cancel', e => { if (sending) e.preventDefault(); });
        d.addEventListener('close', () => d.remove(), { once: true });
        d.showModal();
    }

    return { open, buildHtml, PRESETS };
})();
