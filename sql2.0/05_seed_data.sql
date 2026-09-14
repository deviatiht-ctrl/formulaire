-- ============================================================
--  RASIN AYITI 2.0 — DONE INITIAL (SEED DATA)
-- ============================================================

-- 1. KATEGORI FORMATION INITIAL
INSERT INTO public.rasinayiti_categories (nom, description, icone, couleur, ordre, active)
VALUES 
('Développement Personnel', 'Formations pou devlope potansyèl ak lidèchip pèsonèl ou', 'fa-user-graduate', '#2563eb', 1, true),
('Leadership & Angajman', 'Fòmasyon pou vin lidè efikas nan kominote w ak peyi w', 'fa-crown', '#f59e0b', 2, true),
('Konpetans Pwofesyonèl', 'Amelyore karyè w ak zouti modèn', 'fa-briefcase', '#10b981', 3, true),
('Sante Mantal & Byennèt', 'Pran swen tèt ou ak byennèt sikolojik ou', 'fa-heart', '#ef4444', 4, true),
('Antreprenarya & Biznis', 'Lanse biznis ou ak jere pwojè w', 'fa-rocket', '#8b5cf6', 5, true)
ON CONFLICT DO NOTHING;

-- 2. PARAMETRES SISTÈM
INSERT INTO public.rasinayiti_parametres (cle, valeur, description)
VALUES
('site_nom', 'Rasin Ayiti - Mobilisation pour le Développement Juvénile', 'Non ofisyèl platfòm nan'),
('site_description', 'Platfòm fòmasyon, evènman, ak devlopman pou lajenès ayisyen', 'Deskripsyon sit la'),
('contact_email', 'contact@rasinayiti.com', 'Adrès imèl kontak ofisyèl'),
('contact_phone', '+509 47 11 1111', 'Nimewo telefòn kontak'),
('moncash_number', '+509 47 11 1111', 'Nimewo Moncash pou peman'),
('natcash_number', '+509 38 22 2222', 'Nimewo Natcash pou peman'),
('annee_academique', '2025-2026', 'Ane akademik an kour')
ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur;

-- 3. ADMINISTRATEUR DEFO (Email: admin@rasinayiti.com / Password hash: Admin2026!)
INSERT INTO public.rasinayiti_administrateurs (prenom, nom, email, mot_de_passe_hash, role, actif)
VALUES
('Super', 'Admin', 'admin@rasinayiti.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', true)
ON CONFLICT (email) DO NOTHING;

-- 4. BOUTIQUE MAILLOT INITIAL
INSERT INTO public.rasinayiti_maillots (nom, description, prix, devise, image_url_1, est_disponible)
VALUES 
('Maillot Officiel Rasin Ayiti', 'Département de Développement Juvénile - Édition Spéciale 2026', 1500, 'HTG', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop', true)
ON CONFLICT DO NOTHING;

-- 5. CONFIGURATION ZOOM DEFO
INSERT INTO public.rasinayiti_zoom_config (id, meeting_id, password, link)
VALUES (1, '', '', '')
ON CONFLICT (id) DO NOTHING;

-- 6. KEKSYON QUIZ SOU DRAPO AYISYEN AK EWÒ YO
INSERT INTO public.rasinayiti_event_questions (question_text, option_a, option_b, option_c, option_d, correct_option, points, is_active)
VALUES 
('Ki koulè drapo ayisyen an genyen?', 'Vèt ak jòn', 'Ble ak wouj', 'Nwa ak blan', 'Wouj ak jòn', 'B', 2, true),
('Ki dat Ayiti selebre fèt drapo li?', '1 janvye', '17 oktòb', '18 me', '25 desanm', 'C', 2, true),
('Ki vil ki asosye ak kreyasyon drapo ayisyen an?', 'Jakmèl', 'Okay', 'Pòtoprens', 'Aks (Arcahaie)', 'D', 2, true),
('Kiyès ki te koud premye drapo ayisyen an?', 'Toussaint Louverture', 'Catherine Flon', 'Alexandre Pétion', 'Henri Christophe', 'B', 2, true),
('Ki koulè Dessalines te retire nan drapo franse a?', 'Ble', 'Wouj', 'Blan', 'Vèt', 'C', 2, true),
('Kisa drapo ayisyen an reprezante?', 'Divizyon', 'Inyon ak libète', 'Lagè sèlman', 'Richès peyi a', 'B', 2, true),
('Ki deviz ki sou drapo ayisyen an?', 'L''Union Fait La Force', 'Libète oswa lanmò', 'Ayiti pap peri', 'Viv ansanm', 'A', 2, true),
('Ki ewo yo rele "Papa drapo ayisyen an"?', 'Capois-La-Mort', 'Henri Christophe', 'Jean-Jacques Dessalines', 'Charlemagne Péralte', 'C', 2, true),
('Ki koulè ki anwo sou drapo ayisyen an?', 'Wouj', 'Ble', 'Blan', 'Vèt', 'B', 2, true),
('Poukisa 18 me enpòtan pou Ayiti?', 'Se jou endepandans', 'Se jou eleksyon', 'Se fèt drapo ak inyon pèp ayisyen', 'Se fèt travay', 'C', 2, true)
ON CONFLICT DO NOTHING;
