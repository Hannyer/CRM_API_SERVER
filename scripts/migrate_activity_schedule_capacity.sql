-- Script de migración para agregar capacidad y contador de reservas a activity_schedule
-- Ejecutar este script en la base de datos PostgreSQL
-- 
-- Este script:
-- 1. Agrega las columnas capacity y booked_count a activity_schedule
-- 2. Crea función para inserción masiva de horarios con validación de solapamientos
-- 3. Crea función para sumar asistentes con bloqueo FOR UPDATE
-- 4. Crea índices necesarios

-- ============================================
-- PASO 1: Agregar columnas a activity_schedule
-- ============================================

-- Agregar columna capacity (capacidad máxima por horario)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'ops' 
        AND table_name = 'activity_schedule' 
        AND column_name = 'capacity'
    ) THEN
        ALTER TABLE ops.activity_schedule 
        ADD COLUMN capacity INTEGER NOT NULL DEFAULT 0;
        
        COMMENT ON COLUMN ops.activity_schedule.capacity IS 'Capacidad máxima de personas para este horario';
    END IF;
END $$;

-- Agregar columna booked_count (contador de personas reservadas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'ops' 
        AND table_name = 'activity_schedule' 
        AND column_name = 'booked_count'
    ) THEN
        ALTER TABLE ops.activity_schedule 
        ADD COLUMN booked_count INTEGER NOT NULL DEFAULT 0;
        
        COMMENT ON COLUMN ops.activity_schedule.booked_count IS 'Cantidad de personas que ya han reservado este horario';
    END IF;
END $$;

-- Agregar constraint para asegurar que booked_count no exceda capacity
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_capacity_limit'
    ) THEN
        ALTER TABLE ops.activity_schedule 
        ADD CONSTRAINT check_capacity_limit 
        CHECK (booked_count <= capacity);
    END IF;
END $$;

-- Agregar constraint para valores no negativos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_capacity_positive'
    ) THEN
        ALTER TABLE ops.activity_schedule 
        ADD CONSTRAINT check_capacity_positive 
        CHECK (capacity >= 0 AND booked_count >= 0);
    END IF;
END $$;

-- ============================================
-- PASO 2: Función para detectar solapamientos
-- ============================================

CREATE OR REPLACE FUNCTION ops.check_schedule_overlaps(
    p_activity_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_exclude_schedule_id UUID DEFAULT NULL
)
RETURNS TABLE(
    conflict_id UUID,
    conflict_start TIMESTAMPTZ,
    conflict_end TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.scheduled_start,
        s.scheduled_end
    FROM ops.activity_schedule s
    WHERE s.activity_id = p_activity_id
        AND s.status = true
        AND (p_exclude_schedule_id IS NULL OR s.id != p_exclude_schedule_id)
        AND (
            -- Solapamiento: el nuevo horario se superpone con uno existente
            (p_start_time < s.scheduled_end AND p_end_time > s.scheduled_start)
        );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION ops.check_schedule_overlaps IS 'Detecta horarios que se solapan con el horario propuesto para una actividad';

-- ============================================
-- PASO 3: Función para inserción masiva de horarios
-- ============================================

CREATE OR REPLACE FUNCTION ops.bulk_create_schedules(
    p_activity_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_time_slots JSONB,  -- Array de objetos: [{"startTime": "08:00", "endTime": "11:00", "capacity": 20}, ...]
    p_validate_overlaps BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
    v_current_date DATE;
    v_time_slot JSONB;
    v_schedule_start TIMESTAMPTZ;
    v_schedule_end TIMESTAMPTZ;
    v_capacity INTEGER;
    v_conflicts JSONB := '[]'::JSONB;
    v_created_count INTEGER := 0;
    v_schedule_id UUID;
    v_conflict_record RECORD;
    v_has_conflicts BOOLEAN := false;
BEGIN
    -- Validar que la actividad existe
    IF NOT EXISTS (SELECT 1 FROM ops.activity WHERE id = p_activity_id AND status = true) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ACTIVITY_NOT_FOUND',
            'message', 'La actividad especificada no existe o está inactiva'
        );
    END IF;

    -- Validar rango de fechas
    IF p_start_date > p_end_date THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_DATE_RANGE',
            'message', 'La fecha de inicio debe ser menor o igual a la fecha de fin'
        );
    END IF;

    -- Validar que time_slots es un array válido
    IF jsonb_typeof(p_time_slots) != 'array' OR jsonb_array_length(p_time_slots) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_TIME_SLOTS',
            'message', 'time_slots debe ser un array no vacío'
        );
    END IF;

    -- Primero, verificar todos los conflictos si se requiere validación
    IF p_validate_overlaps THEN
        v_current_date := p_start_date;
        WHILE v_current_date <= p_end_date LOOP
            FOR v_time_slot IN SELECT * FROM jsonb_array_elements(p_time_slots) LOOP
                v_schedule_start := (v_current_date::text || ' ' || (v_time_slot->>'startTime'))::TIMESTAMPTZ;
                v_schedule_end := (v_current_date::text || ' ' || (v_time_slot->>'endTime'))::TIMESTAMPTZ;
                v_capacity := (v_time_slot->>'capacity')::INTEGER;

                -- Validar que el horario de fin sea mayor al de inicio
                IF v_schedule_end <= v_schedule_start THEN
                    v_has_conflicts := true;
                    v_conflicts := v_conflicts || jsonb_build_object(
                        'date', v_current_date,
                        'startTime', v_time_slot->>'startTime',
                        'endTime', v_time_slot->>'endTime',
                        'error', 'INVALID_TIME_RANGE',
                        'message', 'El horario de fin debe ser mayor al de inicio'
                    );
                ELSE
                    -- Verificar solapamientos
                    FOR v_conflict_record IN 
                        SELECT * FROM ops.check_schedule_overlaps(
                            p_activity_id, 
                            v_schedule_start, 
                            v_schedule_end
                        )
                    LOOP
                        v_has_conflicts := true;
                        v_conflicts := v_conflicts || jsonb_build_object(
                            'date', v_current_date,
                            'startTime', v_time_slot->>'startTime',
                            'endTime', v_time_slot->>'endTime',
                            'conflictId', v_conflict_record.conflict_id,
                            'conflictStart', v_conflict_record.conflict_start,
                            'conflictEnd', v_conflict_record.conflict_end,
                            'error', 'SCHEDULE_OVERLAP'
                        );
                    END LOOP;
                END IF;
            END LOOP;
            v_current_date := v_current_date + INTERVAL '1 day';
        END LOOP;

        -- Si hay conflictos, retornar sin insertar nada
        IF v_has_conflicts THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'SCHEDULE_CONFLICTS',
                'message', 'Se encontraron conflictos de horarios. No se insertaron registros.',
                'conflicts', v_conflicts
            );
        END IF;
    END IF;

    -- Si no hay conflictos (o no se requiere validación), proceder con la inserción
    v_current_date := p_start_date;
    WHILE v_current_date <= p_end_date LOOP
        FOR v_time_slot IN SELECT * FROM jsonb_array_elements(p_time_slots) LOOP
            v_schedule_start := (v_current_date::text || ' ' || (v_time_slot->>'startTime'))::TIMESTAMPTZ;
            v_schedule_end := (v_current_date::text || ' ' || (v_time_slot->>'endTime'))::TIMESTAMPTZ;
            v_capacity := COALESCE((v_time_slot->>'capacity')::INTEGER, 0);

            -- Validar que el horario de fin sea mayor al de inicio
            IF v_schedule_end > v_schedule_start THEN
                INSERT INTO ops.activity_schedule (
                    activity_id,
                    scheduled_start,
                    scheduled_end,
                    capacity,
                    booked_count,
                    status
                ) VALUES (
                    p_activity_id,
                    v_schedule_start,
                    v_schedule_end,
                    v_capacity,
                    0,
                    true
                ) RETURNING id INTO v_schedule_id;
                
                v_created_count := v_created_count + 1;
            END IF;
        END LOOP;
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'createdCount', v_created_count,
        'message', format('Se crearon %s horarios exitosamente', v_created_count)
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION ops.bulk_create_schedules IS 'Crea múltiples horarios para una actividad en un rango de fechas, validando solapamientos';

-- ============================================
-- PASO 4: Función para sumar asistentes con bloqueo
-- ============================================

CREATE OR REPLACE FUNCTION ops.add_attendees_to_schedule(
    p_schedule_id UUID,
    p_quantity INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_current_booked INTEGER;
    v_capacity INTEGER;
    v_available_spots INTEGER;
BEGIN
    -- Bloquear el registro para evitar condiciones de carrera
    SELECT capacity, booked_count
    INTO v_capacity, v_current_booked
    FROM ops.activity_schedule
    WHERE id = p_schedule_id
        AND status = true
    FOR UPDATE;

    -- Verificar que el horario existe y está activo
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'SCHEDULE_NOT_FOUND',
            'message', 'El horario especificado no existe o está inactivo'
        );
    END IF;

    -- Validar cantidad positiva
    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_QUANTITY',
            'message', 'La cantidad debe ser mayor a 0'
        );
    END IF;

    -- Calcular espacios disponibles
    v_available_spots := v_capacity - v_current_booked;

    -- Verificar que hay suficiente capacidad
    IF v_current_booked + p_quantity > v_capacity THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'CAPACITY_EXCEEDED',
            'message', format('No hay suficiente capacidad. Disponible: %s, Solicitado: %s', v_available_spots, p_quantity),
            'currentBooked', v_current_booked,
            'capacity', v_capacity,
            'available', v_available_spots,
            'requested', p_quantity
        );
    END IF;

    -- Actualizar el contador
    UPDATE ops.activity_schedule
    SET booked_count = booked_count + p_quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_schedule_id;

    -- Retornar información actualizada
    SELECT booked_count, capacity
    INTO v_current_booked, v_capacity
    FROM ops.activity_schedule
    WHERE id = p_schedule_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Se agregaron %s asistentes exitosamente', p_quantity),
        'scheduleId', p_schedule_id,
        'bookedCount', v_current_booked,
        'capacity', v_capacity,
        'available', v_capacity - v_current_booked
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION ops.add_attendees_to_schedule IS 'Suma asistentes a un horario con bloqueo FOR UPDATE para prevenir sobreventa';

-- ============================================
-- PASO 5: Función para consultar disponibilidad
-- ============================================

CREATE OR REPLACE FUNCTION ops.get_schedule_availability(
    p_activity_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    schedule_id UUID,
    activity_id UUID,
    activity_title TEXT,
    scheduled_date DATE,
    start_time TIME,
    end_time TIME,
    capacity INTEGER,
    booked_count INTEGER,
    available_spots INTEGER,
    status BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id AS schedule_id,
        s.activity_id,
        a.title AS activity_title,
        DATE(s.scheduled_start) AS scheduled_date,
        s.scheduled_start::TIME AS start_time,
        s.scheduled_end::TIME AS end_time,
        s.capacity,
        s.booked_count,
        (s.capacity - s.booked_count) AS available_spots,
        s.status
    FROM ops.activity_schedule s
    JOIN ops.activity a ON a.id = s.activity_id
    WHERE s.status = true
        AND (p_activity_id IS NULL OR s.activity_id = p_activity_id)
        AND (p_start_date IS NULL OR DATE(s.scheduled_start) >= p_start_date)
        AND (p_end_date IS NULL OR DATE(s.scheduled_start) <= p_end_date)
    ORDER BY s.scheduled_start ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION ops.get_schedule_availability IS 'Consulta horarios disponibles con información de capacidad y disponibilidad';

-- ============================================
-- PASO 6: Índices adicionales
-- ============================================

-- Índice para búsquedas por capacidad
CREATE INDEX IF NOT EXISTS idx_activity_schedule_capacity 
ON ops.activity_schedule(capacity) 
WHERE status = true;

-- Índice para búsquedas por disponibilidad
CREATE INDEX IF NOT EXISTS idx_activity_schedule_availability 
ON ops.activity_schedule(activity_id, scheduled_start, capacity, booked_count) 
WHERE status = true;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

