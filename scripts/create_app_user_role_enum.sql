-- Enum de roles de usuario (inglés)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_user_role') THEN
        CREATE TYPE ops.app_user_role AS ENUM (
            'admin',
            'driver',
            'receptionist',
            'operator',
            'guide'
        );
    END IF;
END $$;
