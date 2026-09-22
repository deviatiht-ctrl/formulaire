window.CertificatePDF = {
    image: null,
    async load(file) {
        this.image?.close();
        this.image = null;
        if (!file || !['image/png', 'image/jpeg'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Choisissez une image PNG ou JPEG de moins de 10 Mo.');
        const image = await createImageBitmap(file);
        if (image.width > 6000 || image.height > 6000 || image.width * image.height > 16000000) { image.close(); throw new Error('Image trop grande : maximum 6000 pixels par côté et 16 mégapixels.'); }
        this.image = image;
    },
    settings(values) {
        const ranges = { x: [5, 95], y: [5, 95], size: [1, 12], width: [10, 95] };
        const result = { color: /^#[0-9a-f]{6}$/i.test(values.color) ? values.color : '#172337' };
        for (const [key, [min, max]] of Object.entries(ranges)) {
            result[key] = Number(values[key]);
            if (!Number.isFinite(result[key]) || result[key] < min || result[key] > max) throw new Error('Position ou taille du nom invalide. Respectez les limites du formulaire.');
        }
        return result;
    },
    draw(canvas, name, values) {
        if (!this.image) throw new Error('Importez d’abord un modèle de certificat.');
        const settings = this.settings(values);
        const text = String(name || '').trim();
        if (!text) throw new Error('Le nom du participant est obligatoire.');
        const scale = Math.min(1, 2400 / Math.max(this.image.width, this.image.height));
        canvas.width = Math.round(this.image.width * scale); canvas.height = Math.round(this.image.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(this.image, 0, 0, canvas.width, canvas.height);
        let font = canvas.height * settings.size / 100;
        ctx.font = `600 ${font}px Arial, sans-serif`;
        const width = canvas.width * Math.min(settings.width, 2 * settings.x - 2, 198 - 2 * settings.x) / 100;
        if (ctx.measureText(text).width > width) font *= width / ctx.measureText(text).width;
        ctx.font = `600 ${font}px Arial, sans-serif`; ctx.fillStyle = settings.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width * settings.x / 100, canvas.height * settings.y / 100);
        canvas.hidden = false;
        return { width: canvas.width, height: canvas.height, fontSize: font };
    },
    generate(name, settings) {
        if (!window.jspdf?.jsPDF) throw new Error('Le moteur PDF n’est pas chargé. Vérifiez votre connexion puis rechargez la page.');
        const canvas = document.createElement('canvas');
        this.draw(canvas, name, settings);
        const landscape = canvas.width >= canvas.height;
        const width = landscape ? 297 : 210;
        const height = width * canvas.height / canvas.width;
        const pdf = new window.jspdf.jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: [width, height], compress: true });
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, width, height);
        pdf.setProperties({ title: 'Certificat — ' + name, author: 'Rasin Ayiti' });
        return pdf.output('blob');
    },
    async validate(file) {
        if (!file || file.size === 0 || file.size > 15 * 1024 * 1024 || await file.slice(0, 5).text() !== '%PDF-') throw new Error('Choisissez un PDF valide de moins de 15 Mo.');
    }
};
