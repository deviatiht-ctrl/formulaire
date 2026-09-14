-- ============================================================
--  KREYE KONT ADMIN — RASIN AYITI 2.0
--  Email    : rasinayiti.ht@gmail.com
--  Password : FKpoEAmU1
--  Role     : super_admin
--
--  KOURI LI NAN : Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 0. EXTENSION POU HASH PASSWORD (bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================
-- 1. KREYE ITILIZATÈ NAN SUPABASE AUTH (auth.users)
--    Sa a nesesè paske login la itilize signInWithPassword()
-- ============================================================
DO $$
DECLARE
    v_user_id  UUID;
    v_email    TEXT := 'rasinayiti.ht@gmail.com';
    v_password TEXT := 'FKpoEAmU1';
BEGIN
    -- Si kont lan egziste deja nan Auth, pran id li
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id, id, aud, role, email,
            encrypted_password, email_confirmed_at,
            confirmation_token, recovery_token,
            email_change_token_new, email_change,
            raw_app_meta_data, raw_user_meta_data,
            is_super_admin, is_sso_user, is_anonymous,
            created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated', 'authenticated', v_email,
            crypt(v_password, gen_salt('bf')), NOW(),
            '', '',
            '', '',
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"prenom":"Rasin","nom":"Ayiti"}'::jsonb,
            FALSE, FALSE, FALSE,
            NOW(), NOW()
        );
    ELSE
        -- Kont lan te deja la: mete password + konfimasyon ajou
        UPDATE auth.users
        SET encrypted_password  = crypt(v_password, gen_salt('bf')),
            email_confirmed_at  = COALESCE(email_confirmed_at, NOW()),
            updated_at          = NOW()
        WHERE id = v_user_id;
    END IF;

    -- ============================================================
    -- 2. KREYE IDENTITY (obligatwa pou signInWithPassword mache)
    -- ============================================================
    IF NOT EXISTS (
        SELECT 1 FROM auth.identities
        WHERE provider = 'email' AND user_id = v_user_id
    ) THEN
        INSERT INTO auth.identities (
            id, user_id, provider_id, identity_data, provider,
            last_sign_in_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            v_user_id::text,
            jsonb_build_object('sub', v_user_id::text, 'email', v_email),
            'email',
            NOW(), NOW(), NOW()
        );
    END IF;

    RAISE NOTICE 'Auth user OK: % (id: %)', v_email, v_user_id;
END $$;

-- ============================================================
-- 3. METE LI NAN TAB ADMINISTRATEURS (role super_admin)
-- ============================================================
INSERT INTO public.rasinayiti_administrateurs
    (prenom, nom, email, mot_de_passe_hash, role, permissions, actif)
VALUES
    ('Rasin', 'Ayiti', 'rasinayiti.ht@gmail.com',
     crypt('FKpoEAmU1', gen_salt('bf')),
     'super_admin', '["all"]'::jsonb, true)
ON CONFLICT (email) DO UPDATE SET
    role             = 'super_admin',
    actif            = true,
    mot_de_passe_hash = EXCLUDED.mot_de_passe_hash,
    updated_at       = NOW();

-- ============================================================
-- 4. SIPO POU ANSYEN LOGIN ADMIN LA (modal sou index.html -> admin.html)
--    script.js konpare password an klè sou kolòn 'password'
--    NOTE: password an klè — itilize sèlman si w bezwen ansyen panèl la
-- ============================================================
ALTER TABLE public.rasinayiti_administrateurs
    ADD COLUMN IF NOT EXISTS password TEXT;

UPDATE public.rasinayiti_administrateurs
SET password = 'FKpoEAmU1'
WHERE email = 'rasinayiti.ht@gmail.com';

-- ============================================================
-- 5. VERIFYE
-- ============================================================
SELECT
    (SELECT email FROM auth.users WHERE email = 'rasinayiti.ht@gmail.com')
        AS auth_user,
    (SELECT email FROM public.rasinayiti_administrateurs WHERE email = 'rasinayiti.ht@gmail.com')
        AS admin_row,
    'KONT ADMIN KREYE AVEC SUCCES!' AS mesaj;
