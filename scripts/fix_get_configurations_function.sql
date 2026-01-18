-- Script para corregir la función get_configurations
-- Problema: Referencias ambiguas en ORDER BY
-- Solución: Calificar columnas con alias del CTE y agregar created_at al SELECT

CREATE OR REPLACE FUNCTION ops.get_configurations(
    p_opcion INT DEFAULT 0,
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

