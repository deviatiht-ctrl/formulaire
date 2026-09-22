window.AdminWorkflows = {
    async rpc(name, args) {
        const { data, error } = await window.supabaseClient.rpc(name, args);
        if (error) throw new Error(this.error(error));
        return data;
    },
    error(error) {
        if (error.code === 'PGRST202' || error.code === '42883' || error.code === '42P01') return 'Fonction SQL manquante. Faites déployer les migrations 10 et 11 après 07, 08 et 09. ' + error.message;
        return error.message || 'Opération impossible. Vérifiez votre connexion et réessayez.';
    },
    async requireAdmin() {
        const { data, error } = await window.supabaseClient.auth.getUser();
        if (error || !data.user || !await this.rpc('rasinayiti_is_admin')) throw new Error('Session Supabase Auth administrateur requise. Reconnectez-vous depuis l’accueil avec votre compte administrateur.');
    },
    async archive(type, id, reload) {
        if (!confirm('Retirer cette activité du site en l’archivant ? Toutes les inscriptions et les données seront conservées. Pour les réunir dans un événement, utilisez d’abord Consolidation.')) return;
        try {
            await this.requireAdmin();
            await this.rpc('rasinayiti_archive_activity', { p_type: type, p_id: id });
            await reload();
            alert('Activité archivée. Aucune inscription supprimée. Historique disponible dans Consolidation.');
        } catch (error) { alert(this.error(error)); }
    },
    async all(query) {
        const rows = [];
        for (let start = 0; ; start += 500) {
            const { data, error } = await query().range(start, start + 499);
            if (error) throw new Error(this.error(error));
            rows.push(...data);
            if (data.length < 500) return rows;
        }
    },
    async activities() {
        const groups = await Promise.all([['event','events'],['formation','formations'],['seminaire','seminaires']].map(async ([type, table]) =>
            (await this.all(() => window.supabaseClient.from(table).select('*').order('id'))).map(row => ({ ...row, type, key: type + ':' + row.id }))));
        return groups.flat().sort((a, b) => a.titre.localeCompare(b.titre));
    },
    options(select, activities, placeholder) {
        select.replaceChildren(new Option(placeholder, ''));
        for (const a of activities) select.add(new Option(`${a.titre} — ${a.type} · ${a.status} · ${a.id.slice(0, 8)}`, a.key));
    },
    async download(path, filename) {
        const { data, error } = await window.supabaseClient.storage.from('certificats').createSignedUrl(path, 60);
        if (error) throw error;
        const response = await fetch(data.signedUrl);
        if (!response.ok) throw new Error('Téléchargement indisponible. Actualisez et réessayez.');
        this.save(await response.blob(), filename);
    },
    save(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    details(row) {
        const dialog = document.createElement('dialog');
        dialog.className = 'workflow-dialog';
        const title = document.createElement('h2'); title.textContent = 'Données conservées et provenance';
        const content = document.createElement('pre'); content.textContent = JSON.stringify(row, null, 2);
        const close = document.createElement('button'); close.textContent = 'Fermer'; close.onclick = () => dialog.close();
        dialog.append(title, content, close); document.body.append(dialog);
        dialog.addEventListener('close', () => dialog.remove(), { once: true }); dialog.showModal(); close.focus();
    }
};
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav || !location.pathname.includes('/admin/')) return;
    for (const [href, title] of [['consolidation.html','Consolidation'],['certificats.html','Certificats PDF'],['codes-leaders.html','Codes leaders']]) {
        if (nav.querySelector(`a[href="${href}"]`)) continue;
        const link = document.createElement('a'); link.href = href; link.className = 'nav-item'; link.textContent = title; nav.append(link);
    }
});
