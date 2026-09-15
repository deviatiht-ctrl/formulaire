window.LeaderTools = {
    escape(value) {
        return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    },

    contact(row) {
        return {
            prenom: row.etudiant_prenom || row.etudiants?.prenom || '',
            nom: row.etudiant_nom || row.etudiants?.nom || '',
            email: row.etudiant_email || row.etudiants?.email || '',
            telephone: row.etudiant_telephone || row.etudiants?.telephone || ''
        };
    },

    async all(query) {
        const rows = [];
        for (let start = 0; ; start += 500) {
            const { data, error } = await query().range(start, start + 499);
            if (error) throw error;
            rows.push(...data);
            if (data.length < 500) return rows;
        }
    },

    populateFilter(rows) {
        const select = document.getElementById('leaderFilter');
        if (!select) return;
        const value = select.value;
        const leaders = new Map(rows.filter(r => r.leader_id).map(r => [r.leader_id, `${r.leader_nom || ''} — ${r.code_leader}`]));
        select.innerHTML = '<option value="">Tous les leaders</option>' + [...leaders].map(([id, title]) => `<option value="${this.escape(id)}">${this.escape(title)}</option>`).join('');
        select.value = leaders.has(value) ? value : '';
    },

    matches(row) {
        const leader = document.getElementById('leaderFilter')?.value;
        return !leader || row.leader_id === leader;
    },

    certificateCell(row, type) {
        if (!row.veut_certificat) return '<small>Sans certificat</small>';
        return `<div style="font-size:0.8rem;line-height:1.5;">Certificat : ${this.escape(row.certificat_prix)} HTG · ${this.escape(row.certificat_statut_paiement)}
            ${row.code_leader ? `<br>${this.escape(row.leader_nom)} · ${this.escape(row.code_leader)}<br>Rabais : ${this.escape(row.reduction_pourcentage)}% (${this.escape(row.certificat_reduction)} HTG)` : ''}
            <br><button type="button" class="btn-action" onclick="LeaderTools.review('${type}', '${this.escape(row.id)}')">Détails / paiement</button></div>`;
    },

    async review(type, id) {
        const event = type === 'event';
        const table = event ? 'inscriptions_evenements' : 'inscriptions';
        try {
            const { data: row, error } = await window.supabaseClient.from(table)
                .select(event ? '*, events(titre)' : '*, etudiants(prenom,nom,email,telephone), formations(titre), seminaires(titre)').eq('id', id).single();
            if (error) throw error;
            const contact = event ? row : {
                prenom: row.etudiant_prenom || row.etudiants?.prenom, nom: row.etudiant_nom || row.etudiants?.nom,
                email: row.etudiant_email || row.etudiants?.email, telephone: row.etudiant_telephone || row.etudiants?.telephone
            };
            const dialog = document.createElement('dialog');
            dialog.style.cssText = 'border:0;border-radius:16px;padding:24px;width:min(90vw,600px);max-height:85vh;overflow:auto;';
            const fields = {
                Participant: `${contact.prenom || ''} ${contact.nom || ''}`, Email: contact.email, Téléphone: contact.telephone,
                Activité: row.events?.titre || row.formations?.titre || row.seminaires?.titre,
                Leader: row.leader_nom || 'Aucun', Code: row.code_leader || 'Aucun',
                'Prix initial (HTG)': row.certificat_prix_initial ?? row.certificat_prix,
                'Rabais (%)': row.reduction_pourcentage || 0, 'Réduction (HTG)': row.certificat_reduction || 0,
                'Prix final (HTG)': row.certificat_prix || 0, Paiement: row.certificat_statut_paiement || 'non_requis',
                Mode: row.certificat_mode_paiement || 'Aucun'
            };
            dialog.innerHTML = '<h2>Inscription et certificat</h2>' + Object.entries(fields).map(([label, value]) => `<p><strong>${this.escape(label)} :</strong> ${this.escape(value)}</p>`).join('');
            if (row.certificat_preuve_url) {
                const url = new URL(row.certificat_preuve_url, location.href);
                if (url.protocol === 'https:') {
                    const link = document.createElement('a');
                    link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
                    link.textContent = 'Consulter la preuve de paiement'; dialog.append(link);
                }
            }
            const message = document.createElement('p'); message.setAttribute('role', 'status'); dialog.append(message);
            const buttons = [];
            for (const [status, label] of [['verifie', 'Valider le paiement'], ['refuse', 'Refuser le paiement'], ['en_attente', 'Remettre en attente']]) {
                if (!row.veut_certificat || !(Number(row.certificat_prix) > 0)) break;
                const button = document.createElement('button');
                button.type = 'button'; button.className = 'btn-secondary'; button.textContent = label;
                button.style.margin = '8px 8px 0 0'; buttons.push(button); dialog.append(button);
                button.addEventListener('click', async () => {
                    if (!confirm(`${label} pour cette inscription ?`)) return;
                    buttons.forEach(b => b.disabled = true);
                    try {
                        const { error: updateError } = await window.supabaseClient.from(table).update({ certificat_statut_paiement: status }).eq('id', id).select('id').single();
                        if (updateError) throw updateError;
                        dialog.close();
                        if (typeof loadInscriptions === 'function') await loadInscriptions();
                        if (document.getElementById('leaderReport')) await this.loadReport();
                    } catch (updateError) { message.textContent = updateError.message; }
                    finally { buttons.forEach(b => b.disabled = false); }
                });
            }
            const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Fermer'; close.className = 'btn-secondary';
            close.style.margin = '8px'; close.addEventListener('click', () => dialog.close()); dialog.append(close);
            dialog.addEventListener('close', () => dialog.remove(), { once: true });
            document.body.append(dialog); dialog.showModal(); close.focus();
        } catch (error) { alert(error.message || 'Impossible de charger cette inscription.'); }
    },

    csv(headers, rows, filename) {
        const cell = value => {
            const text = String(value ?? '');
            return '"' + (/^[=+@\-\t\r\n]/.test(text) ? "'" + text : text).replace(/"/g, '""') + '"';
        };
        const blob = new Blob(['\ufeff' + [headers, ...rows].map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    async loadRanking() {
        const container = document.getElementById('leaderRanking');
        if (!container) return;
        container.textContent = 'Chargement du classement...';
        try {
            const { data, error } = await window.supabaseClient.rpc('rasinayiti_leader_ranking');
            if (error) throw error;
            let rank = 0;
            let previous = null;
            container.innerHTML = data.length ? data.map((row, index) => {
                if (row.inscriptions !== previous) rank = index + 1;
                previous = row.inscriptions;
                return `<div style="background:white;padding:16px;border-radius:12px;border:1px solid #e2e8f0;margin:8px 0;">
                    <strong>#${rank} ${this.escape(row.nom)}</strong> — ${this.escape(row.commune)}
                    <span style="float:right;font-weight:700;">${this.escape(row.inscriptions)} inscription(s)</span></div>`;
            }).join('') : '<p>Aucun leader disponible.</p>';
        } catch (error) { container.textContent = 'Classement indisponible pour le moment. Réessayez plus tard.'; }
    },

    async loadReport() {
        const container = document.getElementById('leaderReport');
        if (!container) return;
        container.textContent = 'Chargement des utilisations...';
        try {
            const { data: admin, error: authError } = await window.supabaseClient.rpc('rasinayiti_is_admin');
            if (authError || !admin) throw new Error('Connectez-vous avec un compte administrateur autorisé. Vérifiez aussi la migration 09.');
            const [events, courses] = await Promise.all([
                this.all(() => window.supabaseClient.from('inscriptions_evenements').select('*, events(titre)').not('code_leader', 'is', null).order('id')),
                this.all(() => window.supabaseClient.from('inscriptions').select('*, etudiants(prenom,nom,email,telephone), formations(titre), seminaires(titre)').not('code_leader', 'is', null).order('id'))
            ]);
            const rows = [...events.map(r => ({ ...r, type: 'event', activity: r.events?.titre })), ...courses.map(r => ({
                ...r, type: r.formation_id ? 'formation' : 'seminaire', activity: r.formations?.titre || r.seminaires?.titre,
                prenom: r.etudiant_prenom || r.etudiants?.prenom, nom: r.etudiant_nom || r.etudiants?.nom,
                email: r.etudiant_email || r.etudiants?.email, telephone: r.etudiant_telephone || r.etudiants?.telephone
            }))];
            container.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
                <select id="reportLeader" aria-label="Filtrer par leader"><option value="">Tous les leaders</option></select>
                <select id="reportStatus" aria-label="Filtrer par paiement"><option value="">Tous les paiements</option><option value="en_attente">En attente</option><option value="verifie">Vérifiés</option><option value="refuse">Refusés</option></select>
                <input id="reportSearch" type="search" placeholder="Nom, email, code..." aria-label="Rechercher une utilisation">
                <button type="button" class="btn-secondary" id="exportLeaderReport">Exporter CSV</button>
                <button type="button" class="btn-secondary" onclick="LeaderTools.loadReport()">Actualiser</button></div>
                <div id="reportSummary"></div><div style="overflow-x:auto;"><table style="width:100%;text-align:left;"><thead><tr><th>Participant</th><th>Activité</th><th>Leader / code</th><th>Certificat</th></tr></thead><tbody id="reportRows"></tbody></table></div>`;
            const leaders = new Map(rows.map(r => [r.leader_id, r.leader_nom || r.code_leader]));
            const select = container.querySelector('#reportLeader');
            for (const [id, name] of leaders) { const option = document.createElement('option'); option.value = id; option.textContent = name; select.append(option); }
            const filtered = () => rows.filter(r => (!select.value || r.leader_id === select.value)
                && (!container.querySelector('#reportStatus').value || r.certificat_statut_paiement === container.querySelector('#reportStatus').value)
                && `${r.prenom} ${r.nom} ${r.email} ${r.code_leader} ${r.leader_nom}`.toLowerCase().includes(container.querySelector('#reportSearch').value.toLowerCase()));
            const render = () => {
                const selected = filtered();
                const summary = new Map();
                for (const row of selected) {
                    const stats = summary.get(row.leader_id) || { name: row.leader_nom, total: 0, paid: 0, pending: 0, refused: 0 };
                    stats.total++;
                    if (row.certificat_statut_paiement === 'verifie' && Number(row.certificat_prix) > 0 && (row.statut || row.status_inscription) !== 'annule') stats.paid++;
                    if (row.certificat_statut_paiement === 'en_attente') stats.pending++;
                    if (row.certificat_statut_paiement === 'refuse') stats.refused++;
                    summary.set(row.leader_id, stats);
                }
                container.querySelector('#reportSummary').innerHTML = [...summary.values()].sort((a, b) => b.paid - a.paid).map(s => `<p><strong>${this.escape(s.name)}</strong> : ${s.total} utilisation(s), ${s.paid} paiement(s) comptabilisé(s), ${s.pending} en attente, ${s.refused} refusé(s).</p>`).join('');
                container.querySelector('#reportRows').innerHTML = selected.length ? selected.map(r => `<tr>
                    <td>${this.escape(r.prenom)} ${this.escape(r.nom)}<br>${this.escape(r.email)}<br>${this.escape(r.telephone)}</td>
                    <td>${this.escape(r.activity)}<br>${this.escape(r.type)}</td><td>${this.escape(r.leader_nom)}<br>${this.escape(r.code_leader)}</td>
                    <td>${this.certificateCell(r, r.type)}</td></tr>`).join('') : '<tr><td colspan="4">Aucune utilisation trouvée.</td></tr>';
            };
            select.addEventListener('change', render);
            container.querySelector('#reportStatus').addEventListener('change', render);
            container.querySelector('#reportSearch').addEventListener('input', render);
            container.querySelector('#exportLeaderReport').addEventListener('click', () => this.csv(
                ['Prénom','Nom','Email','Téléphone','Activité','Type','Leader','Code','Prix initial','Rabais %','Réduction','Prix final','Paiement certificat','Statut inscription','Date'],
                filtered().map(r => [r.prenom,r.nom,r.email,r.telephone,r.activity,r.type,r.leader_nom,r.code_leader,r.certificat_prix_initial,r.reduction_pourcentage,r.certificat_reduction,r.certificat_prix,r.certificat_statut_paiement,r.statut || r.status_inscription,r.created_at || r.date_inscription]), 'utilisations_codes_leaders.csv'));
            render();
        } catch (error) { container.textContent = error.message; }
    }
};
document.addEventListener('DOMContentLoaded', () => {
    LeaderTools.loadRanking();
    if (document.getElementById('leaderReport')) LeaderTools.loadReport();
});
