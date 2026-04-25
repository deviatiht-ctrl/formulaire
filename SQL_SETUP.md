# Configuration SQL - EventJeunes

## Table Participants

Exécute ce SQL dans l'éditeur SQL de Supabase:

```sql
-- Créer la table participants
CREATE TABLE participants (
    id BIGSERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telephone TEXT,
    date_inscription TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- QR Code
    qr_code TEXT,
    
    -- Paiement (500 Gds)
    frais INTEGER DEFAULT 500,
    statut_paiement TEXT DEFAULT 'en_attente', -- en_attente, verifie, refuse
    preuve_paiement TEXT, -- URL de l'image dans Supabase Storage
    mode_paiement TEXT, -- moncash, natcash
    date_paiement TIMESTAMP WITH TIME ZONE,
    
    -- Email
    email_envoye BOOLEAN DEFAULT FALSE,
    date_email TIMESTAMP WITH TIME ZONE
);

-- Index pour recherche rapide
CREATE INDEX idx_participants_email ON participants(email);
CREATE INDEX idx_participants_statut ON participants(statut_paiement);

-- Activer Row Level Security (RLS)
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Politique: tout le monde peut s'inscrire
CREATE POLICY "Allow insert for all" ON participants
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Politique: lecture pour tous (nécessaire pour le formulaire)
CREATE POLICY "Allow select for all" ON participants
    FOR SELECT TO anon, authenticated
    USING (true);

-- Politique: mise à jour uniquement pour authenticated (admin)
CREATE POLICY "Allow update for authenticated" ON participants
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Politique: suppression uniquement pour authenticated (admin)
CREATE POLICY "Allow delete for authenticated" ON participants
    FOR DELETE TO authenticated
    USING (true);
```

## Storage Bucket pour les preuves de paiement

```sql
-- Créer le bucket pour les paiements (à faire via l'interface ou API)
-- Nom du bucket: paiements
-- Type: Public

-- Politique de stockage: tout le monde peut uploader
CREATE POLICY "Allow upload for all" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id = 'paiements');

-- Politique de stockage: lecture publique
CREATE POLICY "Allow read for all" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id = 'paiements');
```

## Configuration Supabase Storage (via Interface)

1. Va dans **Storage** dans le dashboard Supabase
2. Clique **New bucket**
3. Nom: `paiements`
4. Coche **Public bucket**
5. Clique **Create bucket**

## Clés à configurer dans les fichiers

### supabase.js
```javascript
const SUPABASE_URL = 'https://TON-PROJECT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'ta-cle-anon-key';
```

### admin.js (optionnel - pour EmailJS)
```javascript
const EMAILJS_PUBLIC_KEY = 'ta_cle_emailjs';
const EMAILJS_SERVICE_ID = 'ton_service_id';
const EMAILJS_TEMPLATE_ID = 'ton_template_id';
```

### payment.js
```javascript
const PAYMENT_NUMBERS = {
    moncash: '+509 XX XX XXXX',  // Ton numéro Moncash
    natcash: '+509 XX XX XXXX'   // Ton numéro Natcash
};
```

## Numéros de paiement

Modifie dans `payment.js`:
```javascript
const PAYMENT_NUMBERS = {
    moncash: '+509 47 11 1111',  // Remplace par ton vrai numéro
    natcash: '+509 38 22 2222'   // Remplace par ton vrai numéro
};
```

## Flux de fonctionnement

```
1. Utilisateur remplit le formulaire (index.html)
   ↓
2. Redirection vers payment.html
   ↓
3. Utilisateur paie 500 Gds via Moncash/Natcash
   ↓
4. Upload de la capture d'écran
   ↓
5. Attente de vérification par l'admin
   ↓
6. Admin voit "À vérifier" dans le tableau
   ↓
7. Admin clique pour voir la preuve
   ↓
8. Admin clique "Vérifier & Envoyer QR"
   ↓
9. QR code généré + Email envoyé automatiquement
   ↓
10. Utilisateur reçoit l'email avec QR code
```

## Statuts de paiement

- `en_attente` : Paiement non encore soumis ou en attente de vérification
- `verifie` : Paiement confirmé par l'admin - QR code envoyé
- `refuse` : Paiement refusé (preuve invalide)

## Permissions nécessaires

Le bucket "paiements" doit avoir ces permissions:
- **INSERT**: Anonymous (pour upload)
- **SELECT**: Anonymous (pour afficher les preuves)
