// Compte à rebours de fin d'inscription des événements (events.inscription_date_limite).
// EventCountdown.register(events) puis placer EventCountdown.badge(ev) dans la carte et
// EventCountdown.buttonAttrs(ev) sur le bouton d'inscription. La base refuse aussi les
// inscriptions après la date limite (sql2.0/13_date_limite_inscription.sql).
window.EventCountdown = (() => {
    const events = new Map();
    let timer = null;
    const deadlineOf = ev => {
        const d = ev && ev.inscription_date_limite ? new Date(ev.inscription_date_limite) : null;
        return d && !isNaN(d) ? d : null;
    };
    const isClosed = ev => !!ev && (ev.inscription_ouverte === false || (!!deadlineOf(ev) && deadlineOf(ev) <= new Date()));
    const pad = n => String(n).padStart(2, '0');
    const key = ev => String(ev.id).replace(/[^a-zA-Z0-9-]/g, '');

    const CSS = `
.event-countdown{display:flex;flex-direction:column;gap:2px;margin:10px 0;padding:10px 12px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;font-size:.85rem;line-height:1.35}
.event-countdown .ecd-time{font-size:1.05rem;font-weight:800;letter-spacing:.02em;font-variant-numeric:tabular-nums}
.event-countdown .ecd-time b{font-size:1.2rem}
.event-countdown small{color:inherit;opacity:.8}
.event-countdown.urgent{background:#fff7ed;border-color:#fdba74;color:#9a3412}
.event-countdown.closed{background:#fef2f2;border-color:#fecaca;color:#991b1b;font-weight:700}
[data-reg-btn].is-closed,[data-reg-btn]:disabled{opacity:.6;cursor:not-allowed;filter:grayscale(.4)}`;
    function ensureCss() {
        if (document.getElementById('ecd-style')) return;
        const s = document.createElement('style'); s.id = 'ecd-style'; s.textContent = CSS; document.head.append(s);
    }

    function paint(el, ev) {
        const deadline = deadlineOf(ev);
        if (isClosed(ev)) {
            el.className = 'event-countdown closed';
            el.innerHTML = `🔒 Inscriptions clôturées${deadline ? `<small>depuis le ${deadline.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</small>` : ''}`;
            document.querySelectorAll(`[data-reg-btn="${key(ev)}"]`).forEach(b => {
                if (b.classList.contains('is-closed')) return;
                b.disabled = true; b.classList.add('is-closed'); b.textContent = 'Inscriptions clôturées';
            });
            return;
        }
        const ms = deadline - Date.now(), s = Math.floor(ms / 1000);
        const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
        el.className = 'event-countdown' + (ms < 86400000 ? ' urgent' : '');
        el.innerHTML = `<span>⏳ Fin des inscriptions dans</span>
            <span class="ecd-time">${d ? `<b>${d}</b>j ` : ''}<b>${pad(h)}</b>h <b>${pad(m)}</b>m <b>${pad(sec)}</b>s</span>
            <small>Jusqu’au ${deadline.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}</small>`;
    }

    function tick() {
        document.querySelectorAll('[data-countdown]').forEach(el => {
            const ev = events.get(el.dataset.countdown);
            if (ev) paint(el, ev);
        });
    }

    function register(list) {
        ensureCss();
        (list || []).forEach(ev => events.set(key(ev), ev));
        tick();
        if (!timer) timer = setInterval(tick, 1000);
    }

    return {
        register,
        isClosed,
        isClosedId: id => isClosed(events.get(String(id).replace(/[^a-zA-Z0-9-]/g, ''))),
        badge: ev => (deadlineOf(ev) || ev.inscription_ouverte === false) ? `<div class="event-countdown" data-countdown="${key(ev)}"></div>` : '',
        buttonAttrs: ev => `data-reg-btn="${key(ev)}"${isClosed(ev) ? ' disabled' : ''}`,
        buttonLabel: (ev, openLabel) => isClosed(ev) ? 'Inscriptions clôturées' : openLabel
    };
})();
