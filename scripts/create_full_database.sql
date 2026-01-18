-- ============================================================
-- Proyecto: Sistema de Gestión de Operaciones Turísticas
-- Base de datos: PostgreSQL
-- Esquema principal: ops
-- Objetivo: recrear la base completa (tablas, índices, funciones)
-- Uso sugerido:
--   1) psql -U <usuario> -d <base> -f scripts/create_full_database.sql
--   2) Verificar con las consultas de chequeo al final
-- ============================================================

-- 0. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Esquema
CREATE SCHEMA IF NOT EXISTS ops;

-- ============================================================
-- 2. Catálogos básicos
-- ============================================================

-- 2.1 Tipos de actividad (canopeo, cabalgata, etc.)
CREATE TABLE IF NOT EXISTS ops.activity_type (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_activity_type_status ON ops.activity_type(status);

-- 2.2 Idiomas
CREATE TABLE IF NOT EXISTS ops.language (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_language_status ON ops.language(status);

-- 2.3 Guías
CREATE TABLE IF NOT EXISTS ops.guide (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    is_leader BOOLEAN NOT NULL DEFAULT false, -- marca global de líder
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_guide_status ON ops.guide(status);
CREATE INDEX IF NOT EXISTS idx_guide_is_leader ON ops.guide(is_leader);

-- 2.4 Compañías (socios/agencias)
-- (mantiene compatibilidad con scripts previos)
CREATE TABLE IF NOT EXISTS ops.company (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    commission_percentage NUMERIC(5, 2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_company_status ON ops.company(status);
CREATE INDEX IF NOT EXISTS idx_company_name ON ops.company(name);
CREATE INDEX IF NOT EXISTS idx_company_created_at ON ops.company(created_at);

-- 2.5 Transporte
CREATE TABLE IF NOT EXISTS ops.transport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    model VARCHAR(255) NOT NULL,
    operational_status BOOLEAN NOT NULL DEFAULT true,
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_transport_operational_status ON ops.transport(operational_status);
CREATE INDEX IF NOT EXISTS idx_transport_status ON ops.transport(status);
CREATE INDEX IF NOT EXISTS idx_transport_model ON ops.transport(model);

-- 2.6 Usuarios de aplicación (para autenticación y auditoría básica)
CREATE TABLE IF NOT EXISTS ops.app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin','operador')),
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_app_user_status ON ops.app_user(status);
CREATE INDEX IF NOT EXISTS idx_app_user_role ON ops.app_user(role);

-- ============================================================
-- 3. Actividades y planeaciones
-- ============================================================

-- 3.1 Actividad
CREATE TABLE IF NOT EXISTS ops.activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type_id UUID NOT NULL REFERENCES ops.activity_type(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    party_size INTEGER NOT NULL CHECK (party_size > 0),
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_activity_type ON ops.activity(activity_type_id);
CREATE INDEX IF NOT EXISTS idx_activity_status ON ops.activity(status);

-- 3.2 Planeaciones (horarios)
-- Incluye capacidad y contador de reservas
CREATE TABLE IF NOT EXISTS ops.activity_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES ops.activity(id) ON DELETE CASCADE,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end   TIMESTAMPTZ NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 0,
    booked_count INTEGER NOT NULL DEFAULT 0,
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_schedule_time CHECK (scheduled_end > scheduled_start),
    CONSTRAINT check_capacity_positive CHECK (capacity >= 0 AND booked_count >= 0),
    CONSTRAINT check_capacity_limit CHECK (booked_count <= capacity)
);
CREATE INDEX IF NOT EXISTS idx_activity_schedule_activity_id ON ops.activity_schedule(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_schedule_status ON ops.activity_schedule(status);
CREATE INDEX IF NOT EXISTS idx_activity_schedule_start ON ops.activity_schedule(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_activity_schedule_end ON ops.activity_schedule(scheduled_end);
CREATE INDEX IF NOT EXISTS idx_activity_schedule_date_range 
    ON ops.activity_schedule(scheduled_start, scheduled_end) WHERE status = true;
CREATE INDEX IF NOT EXISTS idx_activity_schedule_capacity 
    ON ops.activity_schedule(capacity) WHERE status = true;
CREATE INDEX IF NOT EXISTS idx_activity_schedule_availability 
    ON ops.activity_schedule(activity_id, scheduled_start, capacity, booked_count) WHERE status = true;

-- 3.3 Idiomas asignados a actividad
CREATE TABLE IF NOT EXISTS ops.activity_language (
    activity_id UUID NOT NULL REFERENCES ops.activity(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES ops.language(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, language_id)
);

-- 3.4 Guías asignados a actividad
CREATE TABLE IF NOT EXISTS ops.activity_assignment (
    activity_id UUID NOT NULL REFERENCES ops.activity(id) ON DELETE CASCADE,
    guide_id UUID NOT NULL REFERENCES ops.guide(id) ON DELETE CASCADE,
    is_leader BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (activity_id, guide_id)
);

-- ============================================================
-- 4. Reservas
-- ============================================================

CREATE TABLE IF NOT EXISTS ops.booking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_schedule_id UUID NOT NULL REFERENCES ops.activity_schedule(id) ON DELETE RESTRICT,
    company_id UUID REFERENCES ops.company(id) ON DELETE SET NULL,
    transport_id UUID REFERENCES ops.transport(id) ON DELETE SET NULL,
    transport BOOLEAN NOT NULL DEFAULT false, -- coincide con repositorio (campo booleano)
    number_of_people INTEGER NOT NULL CHECK (number_of_people > 0),
    passenger_count INTEGER, -- opcional, para diferenciar adultos/niños si se requiere
    commission_percentage NUMERIC(5, 2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES ops.app_user(id)
);
CREATE INDEX IF NOT EXISTS idx_booking_activity_schedule_id ON ops.booking(activity_schedule_id);
CREATE INDEX IF NOT EXISTS idx_booking_company_id ON ops.booking(company_id);
CREATE INDEX IF NOT EXISTS idx_booking_transport_id ON ops.booking(transport_id);
CREATE INDEX IF NOT EXISTS idx_booking_status ON ops.booking(status);
CREATE INDEX IF NOT EXISTS idx_booking_created_at ON ops.booking(created_at);
CREATE INDEX IF NOT EXISTS idx_booking_created_by ON ops.booking(created_by);
CREATE INDEX IF NOT EXISTS idx_booking_schedule_status 
    ON ops.booking(activity_schedule_id, status) WHERE status IN ('pending', 'confirmed');

-- ============================================================
-- 4.X Configuración (Migración de dbo.CONFIGURATION a ops.configuration)
-- ============================================================

CREATE TABLE IF NOT EXISTS ops.configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key01 VARCHAR(255),
    key02 VARCHAR(255),
    key03 VARCHAR(255),
    key04 VARCHAR(255),
    key05 VARCHAR(255),
    key06 VARCHAR(255),
    value TEXT,
    description TEXT,
    observation TEXT,    -- OBSERVACION
    display_name TEXT,   -- DisplayName
    status BOOLEAN NOT NULL DEFAULT true, -- ESTADO
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_configuration_keys ON ops.configuration(key01, key02, key03, key04, key05, key06);
CREATE INDEX IF NOT EXISTS idx_configuration_status ON ops.configuration(status);

-- Función de búsqueda y paginado para configuraciones
-- Corregida: Referencias ambiguas en ORDER BY resueltas usando alias del CTE
CREATE OR REPLACE FUNCTION ops.get_configurations(
    p_opcion INT DEFAULT 0, -- 0: Normal list, 1: Specific Logic if needed
    p_id UUID DEFAULT NULL,
    p_description VARCHAR DEFAULT NULL,
    p_key01 VARCHAR DEFAULT NULL,
    p_key02 VARCHAR DEFAULT NULL,
    p_key03 VARCHAR DEFAULT NULL,
    p_key04 VARCHAR DEFAULT NULL,
    p_key05 VARCHAR DEFAULT NULL,
    p_key06 VARCHAR DEFAULT NULL,
    p_value VARCHAR DEFAULT NULL,
    p_page INT DEFAULT 1,
    p_page_size INT DEFAULT 10,
    p_search VARCHAR DEFAULT NULL,
    p_sort_col VARCHAR DEFAULT 'created_at',
    p_sort_dir VARCHAR DEFAULT 'DESC'
)
RETURNS TABLE(
    id UUID,
    key01 VARCHAR,
    key02 VARCHAR,
    key03 VARCHAR,
    key04 VARCHAR,
    key05 VARCHAR,
    key06 VARCHAR,
    value TEXT,
    description TEXT,
    observation TEXT,
    display_name TEXT,
    status BOOLEAN,
    total_count BIGINT
) AS $$
DECLARE
    v_offset INT;
BEGIN
    v_offset := (p_page - 1) * p_page_size;

    RETURN QUERY
    WITH FilteredData AS (
        SELECT 
            c.id, 
            c.key01, 
            c.key02, 
            c.key03, 
            c.key04, 
            c.key05, 
            c.key06, 
            c.value, 
            c.description, 
            c.observation, 
            c.display_name, 
            c.status,
            c.created_at,
            COUNT(*) OVER() AS total_count
        FROM ops.configuration c
        WHERE 
            (p_id IS NULL OR c.id = p_id) AND
            (p_description IS NULL OR c.description ILIKE '%' || p_description || '%') AND
            (p_key01 IS NULL OR c.key01 = p_key01) AND
            (p_key02 IS NULL OR c.key02 = p_key02) AND
            (p_key03 IS NULL OR c.key03 = p_key03) AND
            (p_key04 IS NULL OR c.key04 = p_key04) AND
            (p_key05 IS NULL OR c.key05 = p_key05) AND
            (p_key06 IS NULL OR c.key06 = p_key06) AND
            (p_value IS NULL OR c.value ILIKE '%' || p_value || '%') AND
            (p_search IS NULL OR (
                c.description ILIKE '%' || p_search || '%' OR
                c.key01 ILIKE '%' || p_search || '%' OR
                c.value ILIKE '%' || p_search || '%'
            ))
    )
    SELECT 
        fd.id, 
        fd.key01, 
        fd.key02, 
        fd.key03, 
        fd.key04, 
        fd.key05, 
        fd.key06, 
        fd.value, 
        fd.description, 
        fd.observation, 
        fd.display_name, 
        fd.status,
        fd.total_count
    FROM FilteredData fd
    ORDER BY 
        CASE WHEN p_sort_dir = 'ASC' THEN
            CASE 
                WHEN p_sort_col = 'key01' THEN fd.key01 
                WHEN p_sort_col = 'value' THEN fd.value
                WHEN p_sort_col = 'created_at' THEN CAST(fd.created_at AS TEXT)
                ELSE CAST(fd.created_at AS TEXT)
            END
        END ASC,
        CASE WHEN p_sort_dir = 'DESC' THEN
            CASE 
                WHEN p_sort_col = 'key01' THEN fd.key01
                WHEN p_sort_col = 'value' THEN fd.value
                WHEN p_sort_col = 'created_at' THEN CAST(fd.created_at AS TEXT)
                ELSE CAST(fd.created_at AS TEXT)
            END
        END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$ LANGUAGE plpgsql;

-- 4.X.1 Datos de Ejemplo Configuración
-- (Ajustar 'operador' o el ID que corresponda al Rol Cliente en tu lógica)
INSERT INTO ops.configuration (
    key01, key02, key03, key04, key05, key06, 
    value, description, display_name, status
) VALUES (
    'PARAMETRO', 'FUNCIONALIDAD', 'MRB', 'ROL', 'CLIENTE', 'ROLCLIENTE',
    'operador', 'Rol asignado para clientes externos', 'Rol Cliente por Defecto', true
);

-- ============================================================
-- 5. Funciones de negocio (capacidad, solapamientos, disponibilidad)
-- ============================================================

-- 5.1 Detección de solapamientos
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
        AND (p_start_time < s.scheduled_end AND p_end_time > s.scheduled_start);
END;
$$ LANGUAGE plpgsql;

-- 5.2 Inserción masiva de horarios
CREATE OR REPLACE FUNCTION ops.bulk_create_schedules(
    p_activity_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_time_slots JSONB,  -- [{ "startTime": "08:00", "endTime": "11:00", "capacity": 20}, ...]
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
    IF NOT EXISTS (SELECT 1 FROM ops.activity WHERE id = p_activity_id AND status = true) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ACTIVITY_NOT_FOUND',
            'message', 'La actividad especificada no existe o está inactiva'
        );
    END IF;

    IF p_start_date > p_end_date THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_DATE_RANGE',
            'message', 'La fecha de inicio debe ser menor o igual a la fecha de fin'
        );
    END IF;

    IF jsonb_typeof(p_time_slots) != 'array' OR jsonb_array_length(p_time_slots) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_TIME_SLOTS',
            'message', 'time_slots debe ser un array no vacío'
        );
    END IF;

    IF p_validate_overlaps THEN
        v_current_date := p_start_date;
        WHILE v_current_date <= p_end_date LOOP
            FOR v_time_slot IN SELECT * FROM jsonb_array_elements(p_time_slots) LOOP
                v_schedule_start := (v_current_date::text || ' ' || (v_time_slot->>'startTime'))::TIMESTAMPTZ;
                v_schedule_end := (v_current_date::text || ' ' || (v_time_slot->>'endTime'))::TIMESTAMPTZ;
                v_capacity := (v_time_slot->>'capacity')::INTEGER;

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

        IF v_has_conflicts THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'SCHEDULE_CONFLICTS',
                'message', 'Se encontraron conflictos de horarios. No se insertaron registros.',
                'conflicts', v_conflicts
            );
        END IF;
    END IF;

    v_current_date := p_start_date;
    WHILE v_current_date <= p_end_date LOOP
        FOR v_time_slot IN SELECT * FROM jsonb_array_elements(p_time_slots) LOOP
            v_schedule_start := (v_current_date::text || ' ' || (v_time_slot->>'startTime'))::TIMESTAMPTZ;
            v_schedule_end := (v_current_date::text || ' ' || (v_time_slot->>'endTime'))::TIMESTAMPTZ;
            v_capacity := COALESCE((v_time_slot->>'capacity')::INTEGER, 0);

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

-- 5.3 Sumar asistentes con bloqueo FOR UPDATE
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
    SELECT capacity, booked_count
    INTO v_capacity, v_current_booked
    FROM ops.activity_schedule
    WHERE id = p_schedule_id
        AND status = true
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'SCHEDULE_NOT_FOUND',
            'message', 'El horario especificado no existe o está inactivo'
        );
    END IF;

    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_QUANTITY',
            'message', 'La cantidad debe ser mayor a 0'
        );
    END IF;

    v_available_spots := v_capacity - v_current_booked;

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

    UPDATE ops.activity_schedule
    SET booked_count = booked_count + p_quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_schedule_id;

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

-- 5.4 Consulta de disponibilidad
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

-- ============================================================
-- 6. Datos mínimos de ejemplo (opcionales, comentar si no se desea)
-- ============================================================

-- Insertar un admin por defecto (cambiar password_hash por uno real/hasheado)
INSERT INTO ops.app_user (email, full_name, password_hash, role)
VALUES ('admin@example.com', 'Administrador', 'FuOfNI+qd0vGEY2gcFXKVQ==', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insertar tipos de actividad base
INSERT INTO ops.activity_type (name, description) VALUES
('Canopy', 'Circuito de canopy'),
('Cabalgata', 'Paseo a caballo'),
('Tubing', 'Descenso en río'),
('Senderismo', 'Caminata guiada')
ON CONFLICT (name) DO NOTHING;

-- Insertar idiomas base
INSERT INTO ops.language (code, name) VALUES
('es', 'Español'),
('en', 'Inglés')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 7. Verificaciones rápidas
-- ============================================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'ops';
-- SELECT * FROM ops.activity_type;
-- SELECT * FROM ops.language;
-- SELECT * FROM ops.app_user;

-- ============================================================
-- Fin del script
-- ============================================================

