-- Script para corregir la función bulk_create_schedules
-- Problema: La construcción de timestamps no maneja correctamente las horas y zonas horarias
-- Solución: Usar make_timestamptz para construir los timestamps de forma más robusta

DROP FUNCTION IF EXISTS ops.bulk_create_schedules(uuid, date, date, jsonb, bool);

CREATE OR REPLACE FUNCTION ops.bulk_create_schedules(
    p_activity_id uuid, 
    p_start_date date, 
    p_end_date date, 
    p_time_slots jsonb, 
    p_validate_overlaps boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
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
    v_start_time_str TEXT;
    v_end_time_str TEXT;
    v_start_time_parts TEXT[];
    v_end_time_parts TEXT[];
    v_start_hour INTEGER;
    v_start_minute INTEGER;
    v_end_hour INTEGER;
    v_end_minute INTEGER;
BEGIN
    -- Validar que la actividad existe y está activa
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

    -- Validación de conflictos si está habilitada
    IF p_validate_overlaps THEN
        v_current_date := p_start_date;
        
        WHILE v_current_date <= p_end_date LOOP
            FOR v_time_slot IN SELECT * FROM jsonb_array_elements(p_time_slots) LOOP
                -- Extraer y normalizar las horas
                v_start_time_str := v_time_slot->>'startTime';
                v_end_time_str := v_time_slot->>'endTime';
                
                -- Asegurar formato HH:MM:SS (agregar :00 si solo viene HH:MM)
                IF position(':' in v_start_time_str) > 0 THEN
                    v_start_time_parts := string_to_array(v_start_time_str, ':');
                    v_start_hour := (v_start_time_parts[1])::INTEGER;
                    v_start_minute := COALESCE((v_start_time_parts[2])::INTEGER, 0);
                ELSE
                    -- Si no tiene formato de hora válido, marcar como error
                    v_has_conflicts := true;
                    v_conflicts := v_conflicts || jsonb_build_object(
                        'date', v_current_date,
                        'startTime', v_start_time_str,
                        'endTime', v_end_time_str,
                        'error', 'INVALID_TIME_FORMAT',
                        'message', 'El formato de hora de inicio no es válido'
                    );
                    CONTINUE;
                END IF;
                
                IF position(':' in v_end_time_str) > 0 THEN
                    v_end_time_parts := string_to_array(v_end_time_str, ':');
                    v_end_hour := (v_end_time_parts[1])::INTEGER;
                    v_end_minute := COALESCE((v_end_time_parts[2])::INTEGER, 0);
                ELSE
                    v_has_conflicts := true;
                    v_conflicts := v_conflicts || jsonb_build_object(
                        'date', v_current_date,
                        'startTime', v_start_time_str,
                        'endTime', v_end_time_str,
                        'error', 'INVALID_TIME_FORMAT',
                        'message', 'El formato de hora de fin no es válido'
                    );
                    CONTINUE;
                END IF;
                
                -- Construir timestamps concatenando fecha y hora con formato correcto
                -- Formato: YYYY-MM-DD HH:MM:SS y luego convertir a timestamptz
                v_schedule_start := (v_current_date::text || ' ' || 
                    lpad(v_start_hour::text, 2, '0') || ':' || 
                    lpad(v_start_minute::text, 2, '0') || ':00')::timestamptz;
                
                v_schedule_end := (v_current_date::text || ' ' || 
                    lpad(v_end_hour::text, 2, '0') || ':' || 
                    lpad(v_end_minute::text, 2, '0') || ':00')::timestamptz;
                
                -- Validar que el horario de fin sea mayor al de inicio
                IF v_schedule_end <= v_schedule_start THEN
                    v_has_conflicts := true;
                    v_conflicts := v_conflicts || jsonb_build_object(
                        'date', v_current_date,
                        'startTime', v_start_time_str,
                        'endTime', v_end_time_str,
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
                            'startTime', v_start_time_str,
                            'endTime', v_end_time_str,
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
            -- Extraer y normalizar las horas
            v_start_time_str := v_time_slot->>'startTime';
            v_end_time_str := v_time_slot->>'endTime';
            
            -- Asegurar formato HH:MM:SS
            IF position(':' in v_start_time_str) > 0 THEN
                v_start_time_parts := string_to_array(v_start_time_str, ':');
                v_start_hour := (v_start_time_parts[1])::INTEGER;
                v_start_minute := COALESCE((v_start_time_parts[2])::INTEGER, 0);
            ELSE
                -- Saltar este slot si no tiene formato válido
                CONTINUE;
            END IF;
            
            IF position(':' in v_end_time_str) > 0 THEN
                v_end_time_parts := string_to_array(v_end_time_str, ':');
                v_end_hour := (v_end_time_parts[1])::INTEGER;
                v_end_minute := COALESCE((v_end_time_parts[2])::INTEGER, 0);
            ELSE
                -- Saltar este slot si no tiene formato válido
                CONTINUE;
            END IF;
            
            -- Construir timestamps concatenando fecha y hora con formato correcto
            -- Formato: YYYY-MM-DD HH:MM:SS y luego convertir a timestamptz
            v_schedule_start := (v_current_date::text || ' ' || 
                lpad(v_start_hour::text, 2, '0') || ':' || 
                lpad(v_start_minute::text, 2, '0') || ':00')::timestamptz;
            
            v_schedule_end := (v_current_date::text || ' ' || 
                lpad(v_end_hour::text, 2, '0') || ':' || 
                lpad(v_end_minute::text, 2, '0') || ':00')::timestamptz;
            
            v_capacity := COALESCE((v_time_slot->>'capacity')::INTEGER, 0);

            -- Validar que el horario de fin sea mayor al de inicio antes de insertar
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
$function$;

COMMENT ON FUNCTION ops.bulk_create_schedules IS 'Crea múltiples horarios para una actividad en un rango de fechas, validando solapamientos. Construye timestamps concatenando fecha y hora con formato YYYY-MM-DD HH:MM:SS.';

