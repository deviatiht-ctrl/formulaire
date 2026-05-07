-- ============================================================
--  MIGRASYON PARTICIPANTS VERS ETUDIANTS + INSCRIPTIONS
--  Kreye: 2026
--  Deskripsyon: Kopye tout participants nan etudiants epi kreye inscriptions
--  Ak done etudiant kopye nan inscriptions
-- ============================================================

-- Premyeman: Kopye participants nan etudiants
INSERT INTO etudiants (
    prenom,
    nom,
    email,
    telephone,
    status,
    email_verifie,
    created_at,
    updated_at
)
SELECT 
    prenom,
    nom,
    email,
    telephone,
    'actif' as status,
    true as email_verifie,
    date_inscription as created_at,
    NOW() as updated_at
FROM participants
ON CONFLICT (email) DO NOTHING;

-- Dezyemman: Kreye inscriptions pou chak etudiant
-- Note: Ou bezwen yon formation_id - si ou pa gen, kreye yon formation default anvan
INSERT INTO inscriptions (
    etudiant_id,
    etudiant_prenom,
    etudiant_nom,
    etudiant_email,
    etudiant_telephone,
    formation_id,
    seminaire_id,
    type_paiement,
    montant_paye,
    montant_total,
    status_paiement,
    status_inscription,
    date_inscription,
    date_confirmation
)
SELECT 
    e.id as etudiant_id,
    e.prenom as etudiant_prenom,
    e.nom as etudiant_nom,
    e.email as etudiant_email,
    e.telephone as etudiant_telephone,
    NULL as formation_id, -- Chanje sa ak ID formation ou vle
    NULL as seminaire_id,
    CASE 
        WHEN p.statut_paiement = 'verifie' THEN 'complet'
        WHEN p.frais > 0 THEN 'certificat_seulement'
        ELSE 'gratuit'
    END as type_paiement,
    p.frais as montant_paye,
    p.frais as montant_total,
    p.statut_paiement as status_paiement,
    CASE 
        WHEN p.statut_paiement = 'verifie' THEN 'confirme'
        ELSE 'en_attente'
    END as status_inscription,
    p.date_inscription as date_inscription,
    CASE 
        WHEN p.statut_paiement = 'verifie' THEN p.date_paiement
        ELSE NULL
    END as date_confirmation
FROM participants p
JOIN etudiants e ON e.email = p.email
ON CONFLICT (etudiant_id, formation_id) DO NOTHING;

-- Affiche nombre de participants et inscriptions migrés
SELECT 
    (SELECT COUNT(*) FROM etudiants WHERE email IN (SELECT email FROM participants)) as etudiants_migres,
    (SELECT COUNT(*) FROM inscriptions i 
     JOIN etudiants e ON e.id = i.etudiant_id 
     WHERE e.email IN (SELECT email FROM participants)) as inscriptions_crees,
    'MIGRASYON TERMINER AVEC SUCCES!' AS message;
