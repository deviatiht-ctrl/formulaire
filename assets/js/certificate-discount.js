class CertificateDiscount {
    static lockForm(form) {
        const controls = Array.from(form.elements).map(control => [control, control.disabled]);
        form.dataset.submitting = 'true';
        controls.forEach(([control]) => control.disabled = true);
        return () => {
            delete form.dataset.submitting;
            controls.forEach(([control, disabled]) => control.disabled = disabled);
        };
    }

    constructor({ choiceId, paymentId, onChange }) {
        this.choice = document.getElementById(choiceId);
        this.onChange = onChange;
        this.version = 0;
        this.context = {};
        this.quote = null;
        this.box = document.createElement('div');
        this.box.className = 'form-group';
        this.box.hidden = true;
        this.box.innerHTML = `<label for="leaderDiscountCode">Code leader (optionnel)</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <input id="leaderDiscountCode" class="form-input" type="text" maxlength="40" autocomplete="off" autocapitalize="characters" placeholder="Code de votre leader" style="flex:1;min-width:140px;">
                <button type="button" class="btn-secondary">Appliquer</button>
                <button type="button" class="btn-secondary">Retirer</button>
            </div><p role="status" aria-live="polite" style="margin:8px 0;color:#1e40af;"></p>`;
        const payment = document.getElementById(paymentId);
        payment.before(this.box);
        this.input = this.box.querySelector('input');
        this.message = this.box.querySelector('[role="status"]');
        const [apply, remove] = this.box.querySelectorAll('button');
        this.input.addEventListener('input', () => this.invalidate());
        this.input.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); apply.click(); }
        });
        apply.addEventListener('click', async () => {
            apply.disabled = true;
            try { await this.fetchQuote(); }
            catch (error) { this.message.textContent = error.message; }
            finally { apply.disabled = false; }
        });
        remove.addEventListener('click', () => { this.input.value = ''; this.invalidate(); });
        this.choice.addEventListener('change', () => {
            if (this.choice.value !== 'true') { this.input.value = ''; this.invalidate(); }
            this.refresh();
        });
    }

    reset(context) {
        this.context = context;
        this.input.value = '';
        this.invalidate();
    }

    invalidate() {
        this.version++;
        this.quote = null;
        this.message.textContent = this.input.value.trim() ? 'Cliquez sur Appliquer pour vérifier ce code.' : '';
        this.refresh();
    }

    refresh() {
        this.box.hidden = !(this.context.available && this.context.price > 0 && this.choice.value === 'true');
        this.onChange();
    }

    price() {
        return Number(this.quote?.certificat_prix ?? this.context.price ?? 0);
    }

    code() {
        return this.choice.value === 'true' ? this.quote?.code_leader || null : null;
    }

    async fetchQuote() {
        const version = ++this.version;
        const { type, id } = this.context;
        const { data, error } = await window.supabaseClient.rpc('rasinayiti_certificate_quote', {
            p_type: type, p_id: id, p_code: this.input.value.trim() || null
        });
        if (version !== this.version) throw new Error('La sélection a changé. Vérifiez à nouveau le code.');
        if (error) {
            this.quote = null;
            this.refresh();
            throw new Error(error.message || 'Impossible de vérifier le prix. Réessayez.');
        }
        this.quote = data;
        this.message.textContent = data.code_leader
            ? `${data.leader_nom} — Prix normal : ${data.certificat_prix_initial} HTG — Rabais : ${data.reduction_pourcentage}% (${data.certificat_reduction} HTG) — À payer : ${data.certificat_prix} HTG`
            : `À payer : ${data.certificat_prix} HTG`;
        this.refresh();
        return data;
    }

    async ensure() {
        if (this.choice.value !== 'true') return;
        if (this.input.value.trim() && !this.quote?.code_leader) throw new Error('Appliquez votre code leader ou retirez-le avant de confirmer.');
        const previous = this.price();
        await this.fetchQuote();
        if (previous !== this.price()) throw new Error('Le prix a changé. Vérifiez le nouveau montant avant de confirmer.');
    }
}
window.CertificateDiscount = CertificateDiscount;
