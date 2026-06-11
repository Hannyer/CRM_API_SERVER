-- Fix: crear usuario con rol Guía inserta (app_user_id, language_id) sin guide_id.
-- La tabla legacy exigía guide_id NOT NULL → error:
--   null value in column "guide_id" of relation "guide_language" violates not-null constraint
--
-- Ejecutar una vez en PostgreSQL / DBeaver (esquema ops).

BEGIN;

-- 1) Columna para usuarios Guía (mantenimiento /api/users)
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

-- 2) guide_id ya no es obligatorio (módulo legacy ops.guide sigue usándolo)
ALTER TABLE ops.guide_language
  ALTER COLUMN guide_id DROP NOT NULL;

-- 3) PK compuesta antigua → índices únicos por tipo de dueño
ALTER TABLE ops.guide_language DROP CONSTRAINT IF EXISTS guide_language_pkey;

DROP INDEX IF EXISTS ops.guide_language_guide_lang_uq;
DROP INDEX IF EXISTS ops.guide_language_app_user_lang_uq;

CREATE UNIQUE INDEX guide_language_guide_lang_uq
  ON ops.guide_language (guide_id, language_id)
  WHERE guide_id IS NOT NULL;

CREATE UNIQUE INDEX guide_language_app_user_lang_uq
  ON ops.guide_language (app_user_id, language_id)
  WHERE app_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guide_language_app_user_id
  ON ops.guide_language (app_user_id);

-- 4) Cada fila pertenece a un guía legacy O a un app_user, no ambos
ALTER TABLE ops.guide_language DROP CONSTRAINT IF EXISTS guide_language_has_owner;
ALTER TABLE ops.guide_language ADD CONSTRAINT guide_language_has_owner CHECK (
  (guide_id IS NOT NULL AND app_user_id IS NULL)
  OR (guide_id IS NULL AND app_user_id IS NOT NULL)
);

COMMENT ON COLUMN ops.guide_language.app_user_id IS
  'Usuario (ops.app_user) con rol Guía; guide_id queda para ops.guide legacy';

COMMIT;
