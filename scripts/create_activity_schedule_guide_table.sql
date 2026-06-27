CREATE TABLE IF NOT EXISTS ops.activity_schedule_guide (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_schedule_id UUID NOT NULL REFERENCES ops.activity_schedule(id) ON DELETE CASCADE,
    guide_id UUID NOT NULL REFERENCES ops.app_user(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (activity_schedule_id, guide_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_schedule_guide_schedule_id
    ON ops.activity_schedule_guide(activity_schedule_id);

CREATE INDEX IF NOT EXISTS idx_activity_schedule_guide_guide_id
    ON ops.activity_schedule_guide(guide_id);

COMMENT ON TABLE ops.activity_schedule_guide IS 'Guías asignados a una salida/horario de actividad, compartidos por todas sus reservas';
COMMENT ON COLUMN ops.activity_schedule_guide.activity_schedule_id IS 'Salida/horario de actividad';
COMMENT ON COLUMN ops.activity_schedule_guide.guide_id IS 'Guía asignado a la salida';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'ops'
          AND table_name = 'booking_guide'
    ) THEN
        INSERT INTO ops.activity_schedule_guide (activity_schedule_id, guide_id)
        SELECT DISTINCT b.activity_schedule_id, bg.guide_id
        FROM ops.booking_guide bg
        JOIN ops.booking b ON b.id = bg.booking_id
        ON CONFLICT (activity_schedule_id, guide_id) DO NOTHING;
    END IF;
END $$;
