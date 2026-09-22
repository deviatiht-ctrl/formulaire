(() => {
    const el = id => document.getElementById(id), tools = window.AdminWorkflows, pdf = window.CertificatePDF;
    const escape = value => LeaderTools.escape(value);
    let rows = [], activities = [], filtered = [], page = 0, busy = false;
    const message = (text, error = false) => { el('message').textContent = text; el('message').classList.toggle('error', error); };
    const settings = () => ({ x: el('nameX').value, y: el('nameY').value, size: el('fontSize').value, width: el('nameWidth').value, color: el('nameColor').value });
    const selectedActivity = () => activities.find(a => a.key === el('activity').value);
    function preview() {
        try { if (pdf.image) pdf.draw(el('certificatePreview'), el('previewName').value, settings()); }
        catch (error) { message(error.message, true); }
        el('previewPdf').disabled = !pdf.image;
        el('generateBatch').disabled = !pdf.image || !selectedActivity() || !filtered.some(r => r.eligible && !r.certificate_id) || busy;
    }
    function render() {
        const activity = selectedActivity();
        el('activityStatus').textContent = activity ? `${activity.titre} · ${activity.type} · ${activity.status}` : 'Choisissez une activité pour clôturer ou générer un lot de certificats.';
        el('complete').disabled = !activity || !!activity.archived_at || ['termine','annule','archive'].includes(activity.status);
        const search = el('search').value.toLowerCase().trim();
        filtered = rows.filter(r => (!activity || (r.effective_type === activity.type && r.effective_id === activity.id))
            && `${r.nom_complet} ${r.email}`.toLowerCase().includes(search)
            && (!el('state').value || (el('state').value === 'eligible' ? r.eligible && !r.certificate_id : el('state').value === 'issued' ? r.certificate_id : !r.eligible)));
        page = Math.min(page, Math.max(0, Math.ceil(filtered.length / 50) - 1));
        el('summary').textContent = `${filtered.length} participant(s) · ${filtered.filter(r => r.eligible && !r.certificate_id).length} prêt(s) à publier · ${filtered.filter(r => r.certificate_id).length} publié(s).`;
        el('rows').innerHTML = filtered.slice(page * 50, page * 50 + 50).map((r, i) => `<tr>
            <td>${escape(r.nom_complet)}<br>${escape(r.email)}<br><small>${escape(r.titre)} · ${escape(r.effective_type)}</small></td>
            <td>${escape(r.paiement)}<br>${r.eligible ? '<strong>Éligible</strong>' : 'Bloqué : vérifier paiement, annulation et fin de l’activité'}<br><button type="button" class="secondary" data-action="payment" data-index="${i}">Détails / paiement</button></td>
            <td>${r.certificate_id ? `Publié${r.eligible ? '' : ' — accès étudiant suspendu'}<br><button type="button" class="secondary" data-action="download" data-index="${i}">Télécharger PDF</button>` : 'Non publié'}</td>
            <td><button type="button" class="secondary" data-action="preview" data-index="${i}">Aperçu du nom</button><br><button type="button" data-action="generate" data-index="${i}" ${!r.eligible || r.certificate_id ? 'disabled' : ''}>Générer et publier</button><button type="button" class="secondary" data-action="upload" data-index="${i}" ${!r.eligible || r.certificate_id ? 'disabled' : ''}>Téléverser un PDF fini</button></td>
        </tr>`).join('') || '<tr><td colspan="4">Aucun certificat demandé pour ces filtres.</td></tr>';
        el('page').textContent = `Page ${page + 1} / ${Math.max(1, Math.ceil(filtered.length / 50))}`;
        el('previous').disabled = page === 0; el('next').disabled = (page + 1) * 50 >= filtered.length; preview();
    }
    async function load() {
        busy = true; el('workspace').disabled = true;
        try {
            await tools.requireAdmin();
            const selected = el('activity').value;
            [rows, activities] = await Promise.all([tools.all(() => window.supabaseClient.rpc('rasinayiti_admin_certificates').order('effective_type').order('canonical_id')), tools.activities()]);
            tools.options(el('activity'), activities, 'Toutes les activités'); el('activity').value = selected;
            el('workspace').disabled = false; render(); message('Données actualisées. Les droits de publication et de téléchargement sont vérifiés par SQL.');
        } catch (error) { message(tools.error(error), true); }
        finally { busy = false; preview(); }
    }
    async function publish(row, blob) {
        await pdf.validate(blob);
        const path = `issued/${crypto.randomUUID()}.pdf`;
        const { error } = await window.supabaseClient.storage.from('certificats').upload(path, blob, { contentType: 'application/pdf', upsert: false });
        if (error) throw error;
        return tools.rpc('rasinayiti_publish_certificate', { p_kind: row.source_kind, p_source: row.source_id, p_path: path });
    }
    async function issue(list, file) {
        if (busy || !list.length) return;
        const activity = selectedActivity();
        if (!file && (!pdf.image || !activity || list.some(r => r.effective_type !== activity.type || r.effective_id !== activity.id))) { message('Choisissez l’activité correspondante et importez son modèle avant de générer.', true); return; }
        const title = list[0].titre;
        if (!confirm(`${file ? 'Publier le PDF fini' : 'Générer et publier ' + list.length + ' PDF'} pour « ${title} » ?\n${list.length === 1 ? list[0].nom_complet + ' — ' + list[0].email + '\n' : ''}Vérifiez le nom, le titre, la date et les signatures sur le modèle. Les PDF seront accessibles aux étudiants éligibles. Aucun PDF existant ne sera remplacé.`)) return;
        busy = true; el('workspace').disabled = true;
        let done = 0; const errors = [];
        try {
            await tools.requireAdmin();
            const config = settings();
            for (const row of list) {
                message(`Publication ${done + errors.length + 1}/${list.length} : ${row.nom_complet}... Ne fermez pas cet onglet.`);
                try { await publish(row, file || pdf.generate(row.nom_complet, config)); done++; }
                catch (error) { errors.push(`${row.nom_complet} : ${tools.error(error)}`); }
            }
            await load();
            message(`${done} certificat(s) publié(s). ${errors.length} échec(s).${errors.length ? '\n' + errors.slice(0, 10).join('\n') + '\nActualisez avant de réessayer. Les PDF déjà publiés sont conservés ; les fichiers non publiés ne sont pas accessibles aux étudiants.' : ''}`, errors.length > 0);
        } catch (error) { message(tools.error(error), true); el('workspace').disabled = false; }
        finally { busy = false; preview(); }
    }
    el('template').onchange = async () => {
        el('template').disabled = true;
        try { await pdf.load(el('template').files[0]); preview(); message('Modèle chargé. Vérifiez l’aperçu et téléchargez un PDF de test avant de publier.'); }
        catch (error) { el('certificatePreview').hidden = true; message(error.message, true); preview(); }
        finally { el('template').disabled = false; }
    };
    ['previewName','nameX','nameY','fontSize','nameWidth','nameColor'].forEach(id => el(id).addEventListener('input', preview));
    el('certificatePreview').onclick = event => {
        if (busy) return;
        const rect = event.currentTarget.getBoundingClientRect();
        el('nameX').value = Math.max(5, Math.min(95, (event.clientX - rect.left) / rect.width * 100)).toFixed(1);
        el('nameY').value = Math.max(5, Math.min(95, (event.clientY - rect.top) / rect.height * 100)).toFixed(1); preview();
    };
    el('previewPdf').onclick = () => { try { tools.save(pdf.generate(el('previewName').value, settings()), 'certificat-test.pdf'); } catch (error) { message(error.message, true); } };
    el('generateBatch').onclick = () => issue(filtered.filter(r => r.eligible && !r.certificate_id));
    ['activity','search','state'].forEach(id => el(id).addEventListener('input', () => { page = 0; render(); }));
    el('refresh').onclick = load; el('previous').onclick = () => { page--; render(); }; el('next').onclick = () => { page++; render(); };
    el('complete').onclick = async () => {
        const a = selectedActivity(); if (busy || !a || !confirm(`Confirmer que « ${a.titre} » est terminé ? Les inscriptions seront fermées et les certificats payés deviendront publiables.`)) return;
        busy = true; el('workspace').disabled = true;
        try { await tools.rpc('rasinayiti_complete_activity', { p_type: a.type, p_id: a.id }); await load(); }
        catch (error) { message(tools.error(error), true); el('workspace').disabled = false; }
        finally { busy = false; render(); }
    };
    el('rows').onclick = async event => {
        const button = event.target.closest('button'); if (!button || busy) return;
        const row = filtered[page * 50 + Number(button.dataset.index)]; if (!row) return;
        try {
            switch (button.dataset.action) {
                case 'payment': await LeaderTools.review(row.source_kind === 'event' ? 'event' : 'formation', row.source_id); break;
                case 'preview': el('previewName').value = row.nom_complet; preview(); el('certificatePreview').scrollIntoView({ behavior: 'smooth', block: 'center' }); break;
                case 'download': button.disabled = true; await tools.download(row.storage_path, `certificat-${row.certificate_id}.pdf`); break;
                case 'generate': await issue([row]); break;
                case 'upload': {
                    const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/pdf';
                    input.onchange = async () => { if (input.files[0]) await issue([row], input.files[0]); }; input.click(); break;
                }
            }
        } catch (error) { message(tools.error(error), true); }
        finally { button.disabled = false; }
    };
    window.loadInscriptions = load;
    load();
})();
