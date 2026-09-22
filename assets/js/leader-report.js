(() => {
    const el = id => document.getElementById(id), tools = window.LeaderTools, escape = value => tools.escape(value);
    let rows = [], leaders = [], filtered = [], ranking = [], page = 0, busy = false;
    const controls = ['reportSearch','reportLeader','reportType','reportPayment','reportRegistration','reportFrom','reportTo'];
    const message = (text, error = false) => { el('reportMessage').textContent = text; el('reportMessage').classList.toggle('error', error); };
    const people = list => new Set(list.map(r => r.email.trim().toLowerCase()).filter(Boolean)).size;
    const localDate = value => {
        if (!value) return '';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    const labelDate = value => localDate(value) ? new Date(value).toLocaleString('fr-FR') : 'Non renseignée';
    function render() {
        const search = el('reportSearch').value.trim().toLocaleLowerCase();
        const from = el('reportFrom').value, to = el('reportTo').value;
        const invalidRange = from && to && from > to;
        filtered = rows.filter(r => {
            const date = localDate(r.registration_date);
            return !invalidRange && (!el('reportLeader').value || r.leader_key === el('reportLeader').value)
                && (!el('reportType').value || r.type === el('reportType').value)
                && (!el('reportPayment').value || (r.certificat_statut_paiement || 'non_renseigne') === el('reportPayment').value)
                && (!el('reportRegistration').value || r.registration_status === el('reportRegistration').value)
                && (!from || date && date >= from) && (!to || date && date <= to)
                && `${r.prenom || ''} ${r.nom || ''} ${r.email} ${r.telephone || ''} ${r.leader_nom} ${r.leader_display} ${r.code_leader} ${r.activity}`.toLocaleLowerCase().includes(search);
        });
        ranking = tools.usageRanking(filtered, leaders);
        if (controls.some(id => el(id).value)) ranking = ranking.filter(r => r.total > 0 || r.key === el('reportLeader').value);
        el('filterSummary').textContent = invalidRange ? 'La date de début doit précéder la date de fin.'
            : `${filtered.length} utilisation(s) selon les filtres · ${people(filtered)} email(s) distinct(s).${from || to ? ' Les inscriptions sans date sont exclues de cette période.' : ''}`;
        el('rankingRows').innerHTML = ranking.map(r => `<tr><td>${r.total ? '#' + r.rank : '—'}</td>
            <td><strong>${escape(r.name)}</strong><br>${escape(r.code)}<br><small>${escape(r.commune)} · ${r.active ? 'Code actif' : 'Code désactivé / historique'}</small></td>
            <td><strong>${r.total}</strong></td><td>${r.people}</td><td>${r.paid}</td><td>${r.pending} / ${r.refused} / ${r.cancelled}</td>
            <td><button type="button" class="secondary" data-leader="${escape(r.key)}">Voir les participants</button></td></tr>`).join('') || '<tr><td colspan="7">Aucun leader pour ces filtres.</td></tr>';
        page = Math.min(page, Math.max(0, Math.ceil(filtered.length / 50) - 1));
        el('usageRows').innerHTML = filtered.slice(page * 50, page * 50 + 50).map((r, index) => `<tr>
            <td><strong>${escape(r.prenom)} ${escape(r.nom)}</strong><br>${escape(r.email || 'Email non renseigné')}<br>${escape(r.telephone)}</td>
            <td>${escape(r.leader_display)}<br><strong>${escape(r.code_leader)}</strong>${r.leader_nom && r.leader_nom !== r.leader_display ? `<br><small>Nom enregistré : ${escape(r.leader_nom)}</small>` : ''}</td>
            <td>${escape(r.activity)}<br><small>${escape(r.type)} · ${escape(r.activity_id)}</small></td>
            <td>${escape(labelDate(r.registration_date))}<br>${escape(r.registration_status)}</td>
            <td>${escape(r.certificat_statut_paiement || 'non_renseigne')}<br>${escape(r.certificat_prix ?? '—')} HTG<br><small>Prix initial : ${escape(r.certificat_prix_initial ?? '—')} · Rabais : ${escape(r.reduction_pourcentage ?? '—')}% (${escape(r.certificat_reduction ?? '—')} HTG)</small></td>
            <td><button type="button" class="secondary" data-details="${index}">Données historiques</button><button type="button" data-payment="${index}">Détails / paiement</button></td></tr>`).join('') || '<tr><td colspan="6">Aucune utilisation pour ces filtres.</td></tr>';
        el('participantsSummary').textContent = `${filtered.length} inscription(s) d’origine. Les coordonnées et codes affichés proviennent de l’inscription ; le profil sert uniquement si une information manque.`;
        el('reportPage').textContent = `Page ${page + 1} / ${Math.max(1, Math.ceil(filtered.length / 50))}`;
        el('reportPrevious').disabled = page === 0; el('reportNext').disabled = (page + 1) * 50 >= filtered.length;
        el('exportParticipants').disabled = !filtered.length; el('exportRanking').disabled = !ranking.length;
    }
    async function load() {
        if (busy) return;
        busy = true; el('workspace').disabled = true; el('retryReport').hidden = true; message('Chargement de toutes les utilisations enregistrées...');
        try {
            const data = await tools.loadUsage(); rows = data.rows; leaders = data.leaders;
            rows.sort((a, b) => (new Date(b.registration_date).getTime() || 0) - (new Date(a.registration_date).getTime() || 0) || a.type.localeCompare(b.type) || a.id.localeCompare(b.id));
            const globalRanking = tools.usageRanking(rows, leaders), selected = el('reportLeader').value;
            el('reportLeader').replaceChildren(new Option('Tous les leaders', ''));
            globalRanking.forEach(r => el('reportLeader').add(new Option(`${r.name} — ${r.code} (${r.total})`, r.key)));
            el('reportLeader').value = globalRanking.some(r => r.key === selected) ? selected : '';
            el('reportTotal').textContent = String(rows.length); el('reportPeople').textContent = String(people(rows));
            el('reportLeaders').textContent = String(globalRanking.filter(r => r.total > 0).length);
            const top = globalRanking[0];
            el('reportBest').textContent = top?.total ? `${top.name} — ${top.total}${globalRanking[1]?.total === top.total ? ' (ex æquo)' : ''}` : 'Aucune utilisation';
            render(); el('workspace').disabled = false;
            el('reportUpdated').textContent = 'Actualisé le ' + new Date().toLocaleString('fr-FR');
            message('Historique chargé en lecture seule. Aucun code ni aucune inscription n’a été modifié.');
        } catch (error) {
            el('retryReport').hidden = false;
            message('Rapport indisponible : ' + (error.message || 'Vérifiez votre connexion.') + ' Les chiffres précédents, s’ils sont visibles, ne sont pas actualisés.', true);
        } finally { busy = false; }
    }
    controls.forEach(id => el(id).addEventListener(id === 'reportSearch' ? 'input' : 'change', () => { page = 0; render(); }));
    el('refreshReport').onclick = load; el('retryReport').onclick = load;
    el('resetReport').onclick = () => { controls.forEach(id => el(id).value = ''); page = 0; render(); };
    el('reportPrevious').onclick = () => { page--; render(); }; el('reportNext').onclick = () => { page++; render(); };
    el('rankingRows').onclick = event => {
        const button = event.target.closest('[data-leader]'); if (!button) return;
        el('reportLeader').value = button.dataset.leader; page = 0; render(); el('participantsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    el('usageRows').onclick = async event => {
        const button = event.target.closest('button'); if (!button || busy) return;
        const row = filtered[page * 50 + Number(button.dataset.details ?? button.dataset.payment)]; if (!row) return;
        if (button.dataset.details !== undefined) AdminWorkflows.details(row);
        else await tools.review(row.type, row.id);
    };
    el('exportParticipants').onclick = () => tools.csv(
        ['ID inscription','Type','Prénom','Nom','Email','Téléphone','Leader actuel','Leader enregistré','Code utilisé','Activité d’origine','ID activité','Date','Paiement certificat','Statut inscription','Prix initial HTG','Rabais %','Réduction HTG','Prix final HTG'],
        filtered.map(r => [r.id,r.type,r.prenom,r.nom,r.email,r.telephone,r.leader_display,r.leader_nom,r.code_leader,r.activity,r.activity_id,r.registration_date,r.certificat_statut_paiement,r.registration_status,r.certificat_prix_initial,r.reduction_pourcentage,r.certificat_reduction,r.certificat_prix]), 'participants_codes_leaders.csv');
    el('exportRanking').onclick = () => tools.csv(['Rang','Leader','Code','Utilisations','Emails distincts','Payants vérifiés non annulés','En attente','Refusés','Annulés'],
        ranking.map(r => [r.rank,r.name,r.code,r.total,r.people,r.paid,r.pending,r.refused,r.cancelled]), 'classement_codes_leaders.csv');
    window.loadInscriptions = load;
    load();
})();
