-- Marca flags de validación en ops.role por ID (Conductor → licencia, Guía → idiomas).
-- Idempotente.

BEGIN;

UPDATE ops.role
SET
  requires_license = true,
  requires_languages = false,
  updated_at = now()
WHERE id = 'b07fe1a3-40e2-4cb8-9fd7-ff6df2a2dba3'::uuid;

UPDATE ops.role
SET
  requires_license = false,
  requires_languages = true,
  updated_at = now()
WHERE id = '9d3372fa-7180-4f04-9727-374e9b513d53'::uuid;

-- Respaldo por nombre si los UUID difieren en otro entorno
UPDATE ops.role
SET requires_license = true, requires_languages = false, updated_at = now()
WHERE lower(trim(name)) = 'conductor'
  AND id <> 'b07fe1a3-40e2-4cb8-9fd7-ff6df2a2dba3'::uuid
  AND requires_license IS DISTINCT FROM true;

UPDATE ops.role
SET requires_license = false, requires_languages = true, updated_at = now()
WHERE lower(trim(name)) IN ('guía', 'guia')
  AND id <> '9d3372fa-7180-4f04-9727-374e9b513d53'::uuid
  AND requires_languages IS DISTINCT FROM true;

COMMIT;
