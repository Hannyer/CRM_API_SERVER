-- Token secreto por usuario para la suscripción de calendario (.ics)
-- Cada guía obtiene un enlace personal con este token para suscribir sus
-- actividades en el calendario del celular (Google / Apple / Outlook).
-- Nullable: el token se genera bajo demanda la primera vez que el guía lo pide.

ALTER TABLE ops.app_user ADD COLUMN IF NOT EXISTS calendar_token text;

-- UNIQUE permite múltiples NULL (guías sin token todavía) y garantiza que
-- cada token resuelva a un solo usuario.
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_user_calendar_token
  ON ops.app_user (calendar_token);
