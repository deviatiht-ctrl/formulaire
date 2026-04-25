# 🎉 EventJeunes 2026 - Système d'Inscription & Donations

## 📋 Résumé du Projet

Application web complète pour la gestion d'événements avec :
- **Inscription GRATUITE** aux événements
- **Certificats de participation** (500 Gds - optionnel)
- **Système de dons** (anonyme ou nommé)
- **Panel Admin** avec vérification des paiements
- **QR Codes** pour validation à l'entrée

---

## 🗂️ Structure des Fichiers

```
/project
├── index.html          # Page d'accueil + Formulaire + Donations
├── style.css           # Styles modernes (clean/white)
├── script.js           # Logique inscription + donations
├── payment.html        # Paiement certificat (500 Gds)
├── payment.js          # Upload preuve certificat
├── donation.html       # Page donateurs (affichage public)
├── donation.js         # Liste des donateurs
├── admin.html          # Panel Admin complet
├── admin.css           # Styles admin
├── admin.js            # Gestion participants + donations
├── supabase.js         # Fonctions Supabase
├── sql/
│   └── database.sql    # SQL complet pour setup
└── README.md           # Ce fichier
```

---

## 🎯 Fonctionnalités

### 1️⃣ Inscription (GRATIS)
- Formulaire simple: Nom, Prénom, Email
- Inscription gratuite sans paiement obligatoire
- Modal optionnel pour achat certificat (500 Gds)

### 2️⃣ Certificat (Optionnel - 500 Gds)
- Modal qui s'affiche après inscription
- Paiement via Moncash ou Natcash
- Upload capture d'écran comme preuve
- Admin vérifie et envoie QR code par email

### 3️⃣ Donations
- Section visible sur la page d'accueil
- Choix: Anonyme ou avec nom
- Montants: 250, 500, 1000, 2000 Gds
- Upload preuve de paiement
- Page publique des donateurs

### 4️⃣ Panel Admin
- Liste participants avec statut paiement
- Gestion donations avec vérification
- Génération QR codes
- Envoi emails avec QR codes
- Statistiques en temps réel

---

## 🚀 Installation

### 1. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Exécuter le SQL dans `sql/database.sql`
3. Créer le bucket "paiements" dans Storage (Public)

### 2. Configurer les clés

**supabase.js:**
```javascript
const SUPABASE_URL = 'https://TON-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'ta-cle-anon-key';
```

**payment.js:**
```javascript
const PAYMENT_NUMBERS = {
    moncash: '+509 XX XX XXXX',  // Ton numéro Moncash
    natcash: '+509 XX XX XXXX'   // Ton numéro Natcash
};
```

### 3. Déployer

Options gratuites:
- **Netlify**: Drag & drop du dossier
- **Vercel**: Connecter repo GitHub
- **Surge.sh**: `surge .`

---

## 📊 Flux de Fonctionnement

### Pour les Participants:
```
1. Remplit formulaire (GRATUIT)
   ↓
2. Modal: "Veux-tu un certificat?"
   ↓ Optionnel
3. Si OUI → Paiement 500 Gds → Upload preuve
   ↓
4. Attente validation admin
   ↓
5. Reçoit QR code par email
```

### Pour les Donateurs:
```
1. Clique "Faire un don"
   ↓
2. Choisit Anonyme ou Nommé
   ↓
3. Sélectionne montant (250-2000 Gds)
   ↓
4. Paie via Moncash/Natcash
   ↓
5. Upload capture d'écran
   ↓
6. Attente validation
   ↓
7. Apparaît sur page donateurs
```

### Pour l'Admin:
```
1. Connexion: admin@eventjeunes.com / admin2026
   ↓
2. Voir participants avec statut paiement
   ↓
3. Voir donations avec badge "À vérifier"
   ↓
4. Clique pour voir preuve
   ↓
5. Valide ou refuse
   ↓
6. Système envoie QR automatiquement
```

---

## 🔐 Accès Admin

- **URL**: `/admin.html` (ou clique coin supérieur droit de la page d'accueil)
- **Email**: `admin@eventjeunes.com`
- **Password**: `admin2026`

---

## 🗄️ Tables Supabase

### participants
| Champ | Type | Description |
|-------|------|-------------|
| id | bigint | ID auto |
| nom | text | Nom participant |
| prenom | text | Prénom |
| email | text | Email unique |
| telephone | text | Téléphone |
| qr_code | text | URL QR code |
| frais | int | 0 ou 500 |
| statut_paiement | text | non_requis/en_attente/verifie/refuse |
| preuve_paiement | text | URL image |
| mode_paiement | text | moncash/natcash |
| email_envoye | bool | Email envoyé ? |

### donations
| Champ | Type | Description |
|-------|------|-------------|
| id | bigint | ID auto |
| nom | text | Nom (si nommé) |
| prenom | text | Prénom |
| telephone | text | Téléphone |
| montant | int | Montant don |
| mode_paiement | text | moncash/natcash |
| preuve_paiement | text | URL image |
| type_donateur | text | anonymous/named |
| statut | text | en_attente/verifie/refuse |

---

## 🎨 Design

- **Style**: Clean, minimal, moderne 2026
- **Couleurs**: 
  - Primary: Indigo (#4f46e5)
  - Success: Green (#10b981)
  - Donation: Pink (#ec4899)
  - Warning: Orange (#f59e0b)
- **Background**: Blanc cassé (#fafafa)
- **UI**: Cards avec ombres douces, pas de glassmorphism excessif

---

## ⚙️ Fonctions Clés

### Inscription Gratuite
```javascript
// Inscription sans paiement obligatoire
await saveParticipant({nom, prenom, email});

// Modal certificat optionnel
showCertificateModal();
```

### Paiement Certificat
```javascript
// Upload preuve
const proofUrl = await uploadPaymentProof(file, participantId);

// Mettre à jour statut
await updatePaymentStatus(id, 'en_attente', proofUrl);
```

### Donation
```javascript
// Sauvegarder don
await saveDonation({
    nom, prenom, telephone, 
    montant, mode_paiement, 
    preuve_paiement, type_donateur
});
```

---

## 📱 Responsive

- Mobile-first design
- Grids adaptatifs
- Modals plein écran sur mobile
- Navigation sidebar repliable

---

## 🔧 Technologies

- **Frontend**: HTML5, CSS3, Vanilla JS
- **Backend**: Supabase (PostgreSQL + Storage)
- **Email**: EmailJS (optionnel)
- **QR Code**: qrcode.js
- **Icons**: Font Awesome 6
- **Fonts**: Inter (Google Fonts)

---

## 📝 TODO (Améliorations Futures)

- [ ] Export CSV des participants
- [ ] Page "Mon compte" pour voir son QR
- [ ] Notifications push (OneSignal)
- [ ] Génération PDF certificats
- [ ] Scan QR code pour validation entrée
- [ ] Statistiques avancées (graphiques)

---

## 🤝 Support

Pour toute question ou problème:
1. Vérifier la console du navigateur
2. Vérifier les logs Supabase
3. Vérifier les policies RLS

---

## 📄 Licence

© 2026 EventJeunes - Tous droits réservés

---

**Fait avec ❤️ pour les jeunes d'Haïti**
