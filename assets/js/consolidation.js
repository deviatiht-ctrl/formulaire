(() => {
    const el = id => document.getElementById(id);
    const tools = window.AdminWorkflows;
    const escape = value => LeaderTools.escape(value);
    let rows = [], activities = [], filtered = [], page = 0, busy = false;
    const message = (text, error = false) => { el('message').textContent = text; el('message').classList.toggle('error', error); };
    const key = row => row.activity_type + ':' + row.activity_id;
    function render() {
        const counts = new Map();
        rows.forEach(r => counts.set(r.email, (counts.get(r.email) || 0) + 1));
        const search = el('search').value.trim().toLowerCase();
        filtered = rows.filter(r => (!el('activityFilter').value || key(r) === el('activityFilter').value)
            && (!el('paymentFilter').value || r.payload.certificat_statut_paiement === el('paymentFilter').value)
            && (!el('duplicatesOnly').checked || counts.get(r.email) > 1)
            && `${r.prenom} ${r.nom} ${r.email} ${r.payload.telephone || r.payload.etudiant_telephone || r.student?.telephone || ''} ${r.titre} ${r.effective_title}`.toLowerCase().includes(search));
        page = Math.min(page, Math.max(0, Math.ceil(filtered.length / 50) - 1));
        el('summary').textContent = `${rows.length} inscriptions d’origine au total · ${filtered.length} affichées par filtre · ${new Set(filtered.map(r => r.email)).size} emails distincts · ${filtered.filter(r => r.transferred_at).length} déjà transférées. Les copies techniques ne sont pas comptées deux fois.`;
        el('rows').innerHTML = filtered.slice(page * 50, page * 50 + 50).map((r, i) => `<tr>
            <td>${escape(r.prenom)} ${escape(r.nom)}<br>${escape(r.email)}<br><small>${escape(r.payload.telephone || r.payload.etudiant_telephone || r.student?.telephone || '')}</small>${counts.get(r.email) > 1 ? '<br><strong>Email présent plusieurs fois</strong>' : ''}</td>
            <td>${escape(r.titre)}<br><small>${escape(r.activity_type)} · ${escape(r.activity?.status)}</small>${r.transferred_at ? `<br>→ ${escape(r.effective_title)}<br><small>Transférée le ${escape(new Date(r.transferred_at).toLocaleString('fr-FR'))}</small>` : ''}</td>
            <td>${escape(r.payload.certificat_statut_paiement || 'non_requis')}<br>${escape(r.payload.certificat_prix || 0)} HTG<br>${escape(r.payload.code_leader || '')}<br><small>Inscription : ${escape(r.payload.statut || r.payload.status_inscription)}</small></td>
            <td><button type="button" class="secondary" data-details="${i}">Toutes les données</button>${r.payload.veut_certificat ? `<button type="button" data-payment="${i}">Vérifier le paiement</button>` : ''}</td>
        </tr>`).join('') || '<tr><td colspan="4">Aucune inscription pour ces filtres.</td></tr>';
        el('page').textContent = `Page ${page + 1} / ${Math.max(1, Math.ceil(filtered.length / 50))}`;
        el('previous').disabled = page === 0; el('next').disabled = (page + 1) * 50 >= filtered.length;
    }
    function preview() {
        const source = activities.find(a => a.key === el('source').value);
        const target = activities.find(a => a.key === el('target').value);
        el('transfer').disabled = true;
        if (!source || !target || source.key === target.key) { el('preview').textContent = 'Choisissez une source et un événement de destination différents.'; return; }
        const registrations = rows.filter(r => key(r) === source.key);
        const pending = registrations.filter(r => !r.transferred_at);
        const conflicts = registrations.some(r => r.transferred_at && r.effective_id !== target.id);
        const destination = new Set(rows.filter(r => r.effective_type === 'event' && r.effective_id === target.id).map(r => r.email));
        let copies = 0, duplicates = 0;
        pending.forEach(r => { if (destination.has(r.email)) duplicates++; else { copies++; destination.add(r.email); } });
        el('preview').textContent = conflicts ? 'Cette source a déjà été transférée vers un autre événement. Transfert bloqué.'
            : `${source.titre} → ${target.titre}\n${registrations.length} inscriptions d’origine, ${registrations.length - pending.length} déjà transférées.\n${copies} nouvelle(s) copie(s), ${duplicates} doublon(s) à lier sans écrasement.\nLes inscriptions annulées gardent leur statut. La source sera retirée du site. Vérifiez que ces activités correspondent bien à la même formation. Aucun rapprochement automatique par nom.`;
        el('transfer').disabled = busy || conflicts;
    }
    async function load() {
        busy = true; el('workspace').disabled = true;
        try {
            await tools.requireAdmin();
            const selections = ['source','target','activityFilter'].map(id => el(id).value);
            [rows, activities] = await Promise.all([tools.all(() => window.supabaseClient.rpc('rasinayiti_admin_registrations').order('source_kind').order('source_id')), tools.activities()]);
            tools.options(el('source'), activities, 'Choisir une activité source');
            tools.options(el('target'), activities.filter(a => a.type === 'event' && !a.archived_at && !['archive','annule'].includes(a.status)), 'Choisir l’événement à conserver');
            tools.options(el('activityFilter'), activities, 'Toutes les activités');
            ['source','target','activityFilter'].forEach((id, i) => el(id).value = selections[i]);
            render(); el('workspace').disabled = false; message('Données actualisées. Le transfert conserve les originaux et nécessite votre confirmation.');
        } catch (error) { message(tools.error(error), true); }
        finally { busy = false; preview(); }
    }
    el('source').onchange = preview; el('target').onchange = preview;
    ['search','activityFilter','paymentFilter','duplicatesOnly'].forEach(id => el(id).addEventListener('input', () => { page = 0; render(); }));
    el('previous').onclick = () => { page--; render(); }; el('next').onclick = () => { page++; render(); };
    el('refresh').onclick = load;
    el('export').onclick = () => tools.save(new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' }), 'inscriptions-historique.json');
    el('rows').onclick = async event => {
        const button = event.target.closest('button'); if (!button) return;
        const index = Number(button.dataset.details ?? button.dataset.payment);
        const row = filtered[page * 50 + index]; if (!row) return;
        if (button.dataset.details !== undefined) tools.details(row);
        else await LeaderTools.review(row.activity_type, row.source_id);
    };
    el('transfer').onclick = async () => {
        if (busy) return;
        const source = activities.find(a => a.key === el('source').value);
        const target = activities.find(a => a.key === el('target').value);
        if (!source || !target || !confirm(`${el('preview').textContent}\n\nConfirmer le transfert SQL et l’archivage de « ${source.titre} » ?`)) return;
        busy = true; el('workspace').disabled = true;
        try {
            const result = await tools.rpc('rasinayiti_consolidate', { p_type: source.type, p_id: source.id, p_target: target.id });
            await load(); message(`Transfert terminé : ${result.copies} copie(s), ${result.doublons_conserves} doublon(s) conservé(s). Source archivée, aucune donnée supprimée.`);
        } catch (error) { message(tools.error(error) + '\nEn cas de coupure réseau, actualisez avant de réessayer : le transfert est atomique et les répétitions ne créent pas de doublons.', true); el('workspace').disabled = false; }
        finally { busy = false; preview(); }
    };
    window.loadInscriptions = load;
    load();
})();
