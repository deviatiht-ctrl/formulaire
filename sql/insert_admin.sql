-- ============================================================
--  INSERE ADMIN POU LOGIN
--  Kreye: 2026
--  Deskripsyon: Enskri admin nan sistèm lan
-- ============================================================

-- Admin 1 (Super Admin)
-- Email: laurorejeanclarens0@gmail.com
-- Password: Deja kreye nan Supabase Auth
INSERT INTO administrateurs (prenom, nom, email, role) VALUES
('Laurore', 'Jean', 'rasinayiti@gmail.com', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
    actif = true;

SELECT 'ADMIN INSERE AVEC SUCCES!' AS message;
