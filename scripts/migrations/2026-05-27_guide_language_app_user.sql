-- Relaciona ops.guide_language con ops.app_user (usuarios con rol Guía)
-- Mantiene guide_id opcional para el módulo legacy ops.guide
-- Ejecutar en DBeaver

BEGIN;

-- Rol Guía: idiomas obligatorios en mantenimiento de usuarios
ALTER TABLE ops.role
  ADD COLUMN IF NOT EXISTS requires_languages boolean NOT NULL DEFAULT false;

UPDATE ops.role
SET requires_languages = true
WHERE lower(trim(name)) IN ('guía', 'guia', 'guide');

-- Tabla puente: soporte app_user + guide legacy
ALTER TABLE ops.guide_language
  ADD COLUMN IF NOT EXISTS app_user_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guide_language_app_user_id_fkey'
  ) THEN
    ALTER TABLE ops.guide_language
      ADD CONSTRAINT guide_language_app_user_id_fkey
      FOREIGN KEY (app_user_id) REFERENCES ops.app_user(id) ON DELETE CASCADE;
  END IF;
END $$;

-- guide_id nullable (solo filas legacy de ops.guide)
ALTER TABLE ops.guide_language
  ALTER COLUMN guide_id DROP NOT NULL;

-- Quitar PK compuesta si existe y crear índices únicos parciales
ALTER TABLE ops.guide_language DROP CONSTRAINT IF EXISTS guide_language_pkey;

CREATE UNIQUE INDEX IF NOT EXISTS guide_language_guide_lang_uq
  ON ops.guide_language (guide_id, language_id)
  WHERE guide_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS guide_language_app_user_lang_uq
  ON ops.guide_language (app_user_id, language_id)
  WHERE app_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guide_language_app_user_id
  ON ops.guide_language (app_user_id);

ALTER TABLE ops.guide_language DROP CONSTRAINT IF EXISTS guide_language_has_owner;
ALTER TABLE ops.guide_language ADD CONSTRAINT guide_language_has_owner CHECK (
  (guide_id IS NOT NULL AND app_user_id IS NULL)
  OR (guide_id IS NULL AND app_user_id IS NOT NULL)
);

COMMENT ON COLUMN ops.guide_language.app_user_id IS 'Usuario (app_user) con rol Guía';
COMMENT ON COLUMN ops.role.requires_languages IS 'Si true, languageIds es obligatorio al crear/editar usuario';

COMMIT;
