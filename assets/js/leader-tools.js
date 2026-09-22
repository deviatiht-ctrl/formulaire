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

    async registrationDetails(type, id) {
        const client = window.supabaseClient;
        const { data: row, error } = await client.from(type === 'event' ? 'inscriptions_evenements' : 'inscriptions').select('*').eq('id', id).single();
        if (error) throw error;
        const related = async (table, key, columns) => {
            if (!key) return null;
            const { data, error: relationError } = await client.from(table).select(columns).eq('id', key).maybeSingle();
            if (relationError) throw relationError;
            return data;
        };
        const [events, formations, seminaires, etudiants] = await Promise.all([
            related('events', row.event_id, 'id,titre'), related('formations', row.formation_id, 'id,titre'),
            related('seminaires', row.seminaire_id, 'id,titre'), related('etudiants', row.etudiant_id, 'id,prenom,nom,email,telephone')
        ]);
        return { ...row, events, formations, seminaires, etudiants };
    },

    async review(type, id) {
        const event = type === 'event';
        const table = event ? 'inscriptions_evenements' : 'inscriptions';
        try {
            const row = await this.registrationDetails(type, id);
            if (event && row.consolidation_source_id) {
                const { data: original, error: sourceError } = await window.supabaseClient.rpc('rasinayiti_original_registration', { p_id: id });
                if (sourceError) throw sourceError;
                if (!original) throw new Error('Inscription d’origine introuvable. Consultez Consolidation.');
                return this.review(original.kind === 'event' ? 'event' : 'formation', original.id);
            }
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
                        if (status === 'verifie' && contact.email && typeof window.sendPaymentConfirmedEmail === 'function') {
                            message.textContent = 'Paiement validé. Envoi de l’email de confirmation...';
                            try {
                                await window.sendPaymentConfirmedEmail(
                                    { prenom: contact.prenom, nom: contact.nom, email: contact.email, whatsapp: contact.telephone, access_code: row.access_code },
                                    row.events?.titre || row.formations?.titre || row.seminaires?.titre
                                );
                            } catch (emailError) {
                                console.warn('Email confirmation:', emailError.message);
                                alert('Paiement validé, mais l’email de confirmation n’a pas pu être envoyé : ' + emailError.message);
                            }
                        }
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

    async loadUsage() {
        const client = window.supabaseClient;
        const { data: admin, error } = await client.rpc('rasinayiti_is_admin');
        if (error || !admin) throw new Error('Connectez-vous avec un compte administrateur Supabase Auth autorisé. La migration 09 doit être installée.');
        const [events, courses, leaders, activities, formations, seminaires] = await Promise.all([
            this.all(() => client.from('inscriptions_evenements').select('*').not('code_leader', 'is', null).order('id')),
            this.all(() => client.from('inscriptions').select('*').not('code_leader', 'is', null).order('id')),
            this.all(() => client.from('leaders_v2').select('id,nom,commune,code_reduction,reduction_pourcentage,est_actif,code_actif').order('id')),
            this.all(() => client.from('events').select('id,titre').order('id')),
            this.all(() => client.from('formations').select('id,titre').order('id')),
            this.all(() => client.from('seminaires').select('id,titre').order('id'))
        ]);
        const students = [];
        const ids = [...new Set(courses.map(r => r.etudiant_id).filter(Boolean))];
        for (let i = 0; i < ids.length; i += 100) {
            students.push(...await this.all(() => client.from('etudiants').select('id,prenom,nom,email,telephone').in('id', ids.slice(i, i + 100)).order('id')));
        }
        const byId = list => new Map(list.map(r => [r.id, r]));
        const studentMap = byId(students), eventMap = byId(activities), formationMap = byId(formations), seminarMap = byId(seminaires);
        const leaderMap = byId(leaders), codeMap = new Map(leaders.filter(l => l.code_reduction).map(l => [l.code_reduction.trim().toUpperCase(), l]));
        const rows = [...events.filter(r => !r.consolidation_source_id).map(r => ({ ...r, type: 'event', activity_id: r.event_id, activity: eventMap.get(r.event_id)?.titre })),
            ...courses.map(r => ({ ...r, ...this.contact({ ...r, etudiants: studentMap.get(r.etudiant_id) }),
                email: r.etudiant_email || r.inscription_email || studentMap.get(r.etudiant_id)?.email || '',
                type: r.formation_id ? 'formation' : 'seminaire', activity_id: r.formation_id || r.seminaire_id,
                activity: formationMap.get(r.formation_id)?.titre || seminarMap.get(r.seminaire_id)?.titre
            }))].filter(r => String(r.code_leader || '').trim()).map(r => {
                const code = r.code_leader.trim().toUpperCase();
                const leader = r.leader_id ? leaderMap.get(r.leader_id) : codeMap.get(code);
                return { ...r, email: r.email || r.inscription_email || '',
                    activity: r.activity || `Activité non disponible (${r.activity_id || 'non renseignée'})`,
                    leader_key: r.leader_id || leader?.id ? 'id:' + (r.leader_id || leader.id) : 'code:' + code,
                    leader_display: leader?.nom || r.leader_nom || leader?.commune || `Code historique ${code}`,
                    leader_nom: r.leader_nom || leader?.nom || leader?.commune || '',
                    registration_status: r.statut || r.status_inscription || 'non_renseigne',
                    registration_date: r.created_at || r.date_inscription || null
                };
            });
        return { rows, leaders };
    },

    usageRanking(rows, leaders) {
        const groups = new Map(leaders.map(l => ['id:' + l.id, { key: 'id:' + l.id, id: l.id, name: l.nom || l.commune || l.code_reduction,
            code: l.code_reduction || '', commune: l.commune || '', active: !!l.est_actif && !!l.code_actif, total: 0, paid: 0, pending: 0, refused: 0, cancelled: 0, emails: new Set() }]));
        for (const row of rows) {
            const group = groups.get(row.leader_key) || { key: row.leader_key, id: row.leader_id || null, name: row.leader_display,
                code: row.code_leader, commune: '', active: false, total: 0, paid: 0, pending: 0, refused: 0, cancelled: 0, emails: new Set() };
            group.total++;
            if (row.email?.trim()) group.emails.add(row.email.trim().toLowerCase());
            if (row.certificat_statut_paiement === 'verifie' && Number(row.certificat_prix) > 0 && row.registration_status !== 'annule') group.paid++;
            if (row.certificat_statut_paiement === 'en_attente') group.pending++;
            if (row.certificat_statut_paiement === 'refuse') group.refused++;
            if (row.registration_status === 'annule') group.cancelled++;
            groups.set(group.key, group);
        }
        const ranking = [...groups.values()].map(({ emails, ...group }) => ({ ...group, people: emails.size }))
            .sort((a, b) => b.total - a.total || String(a.name).localeCompare(String(b.name)) || a.key.localeCompare(b.key));
        let rank = 0, previous = null;
        return ranking.map((group, index) => {
            if (group.total !== previous) rank = index + 1;
            previous = group.total;
            return { ...group, rank };
        });
    },

    async loadReport() {
        const container = document.getElementById('leaderReport');
        if (!container) return;
        container.textContent = 'Le rapport complet compte toutes les utilisations de codes, quel que soit le paiement. ';
        const link = document.createElement('a'); link.href = 'codes-leaders.html'; link.className = 'btn-primary';
        link.textContent = 'Ouvrir la gestion des codes leaders'; container.append(link);
    }
};
document.addEventListener('DOMContentLoaded', () => {
    LeaderTools.loadRanking();
    if (document.getElementById('leaderReport')) LeaderTools.loadReport();
});
