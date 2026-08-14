const { pool } = require('../config/db.pg');

// Rango de fechas sobre la fecha del tour (activity_schedule.scheduled_start).
// Se filtra por reservas no canceladas salvo el reporte de estados.

/** KPIs generales + serie de ventas por día en el período. */
async function salesByPeriod({ from, to }) {
  const kpis = await pool.query(
    `
    SELECT
      COUNT(*)::int AS reservas,
      COALESCE(SUM(b.number_of_people), 0)::int AS personas,
      COALESCE(SUM(b.subtotal), 0)::numeric AS subtotal,
      COALESCE(SUM(b.vat_amount), 0)::numeric AS iva,
      COALESCE(SUM(b.total), 0)::numeric AS total
    FROM ops.booking b
    JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
    WHERE b.status IN ('pending','confirmed')
      AND s.scheduled_start >= $1::timestamptz AND s.scheduled_start < $2::timestamptz
    `,
    [from, to]
  );
  const series = await pool.query(
    `
    SELECT to_char(date_trunc('day', s.scheduled_start), 'YYYY-MM-DD') AS dia,
           COUNT(*)::int AS reservas,
           COALESCE(SUM(b.number_of_people),0)::int AS personas,
           COALESCE(SUM(b.total),0)::numeric AS total
    FROM ops.booking b
    JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
    WHERE b.status IN ('pending','confirmed')
      AND s.scheduled_start >= $1::timestamptz AND s.scheduled_start < $2::timestamptz
    GROUP BY 1 ORDER BY 1
    `,
    [from, to]
  );
  return { kpis: kpis.rows[0], series: series.rows };
}

/** Comisiones por compañía en el período. */
async function commissionsByCompany({ from, to }) {
  const { rows } = await pool.query(
    `
    SELECT c.name AS compania,
           COUNT(b.id)::int AS reservas,
           COALESCE(SUM(b.number_of_people),0)::int AS personas,
           COALESCE(SUM(b.subtotal),0)::numeric AS subtotal,
           COALESCE(AVG(b.commission_percentage),0)::numeric AS comision_pct,
           COALESCE(SUM(b.commission_amount),0)::numeric AS comision_monto
    FROM ops.booking b
    JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
    JOIN ops.company c ON c.id = b.company_id
    WHERE b.status IN ('pending','confirmed')
      AND s.scheduled_start >= $1::timestamptz AND s.scheduled_start < $2::timestamptz
    GROUP BY c.name
    ORDER BY comision_monto DESC
    `,
    [from, to]
  );
  return rows;
}

/** Ocupación por horario (cupos vendidos vs capacidad de la actividad). */
async function occupancyBySchedule({ from, to }) {
  const { rows } = await pool.query(
    `
    SELECT a.title AS actividad,
           to_char(s.scheduled_start, 'YYYY-MM-DD HH24:MI') AS horario,
           a.party_size AS capacidad,
           COALESCE(SUM(b.number_of_people) FILTER (WHERE b.status IN ('pending','confirmed')),0)::int AS reservado
    FROM ops.activity_schedule s
    JOIN ops.activity a ON a.id = s.activity_id
    LEFT JOIN ops.booking b ON b.activity_schedule_id = s.id
    WHERE s.status = true
      AND s.scheduled_start >= $1::timestamptz AND s.scheduled_start < $2::timestamptz
    GROUP BY a.title, s.scheduled_start, a.party_size
    ORDER BY s.scheduled_start
    `,
    [from, to]
  );
  return rows.map((r) => ({
    ...r,
    ocupacion_pct: r.capacidad > 0 ? Math.round((r.reservado / r.capacidad) * 100) : 0,
  }));
}

/** Ranking de actividades por ingresos y personas. */
async function activityRanking({ from, to }) {
  const { rows } = await pool.query(
    `
    SELECT a.title AS actividad,
           COUNT(b.id)::int AS reservas,
           COALESCE(SUM(b.number_of_people),0)::int AS personas,
           COALESCE(SUM(b.total),0)::numeric AS ingresos
    FROM ops.booking b
    JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
    JOIN ops.activity a ON a.id = s.activity_id
    WHERE b.status IN ('pending','confirmed')
      AND s.scheduled_start >= $1::timestamptz AND s.scheduled_start < $2::timestamptz
    GROUP BY a.title
    ORDER BY ingresos DESC
    `,
    [from, to]
  );
  return rows;
}

/** Reservas por estado (incluye canceladas) + tasa de cancelación. */
async function bookingsByStatus({ from, to }) {
  const { rows } = await pool.query(
    `
    SELECT b.status,
           COUNT(*)::int AS reservas,
           COALESCE(SUM(b.number_of_people),0)::int AS personas
    FROM ops.booking b
    JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
    WHERE s.scheduled_start >= $1::timestamptz AND s.scheduled_start < $2::timestamptz
    GROUP BY b.status
    `,
    [from, to]
  );
  return rows;
}

/** Traslados por chofer en el período. */
async function transportByDriver({ from, to }) {
  const { rows } = await pool.query(
    `
    SELECT COALESCE(u.full_name, 'Sin asignar') AS chofer,
           COUNT(bt.id)::int AS traslados,
           COALESCE(SUM(b.number_of_people),0)::int AS personas
    FROM ops.booking_transport bt
    JOIN ops.booking b ON b.id = bt.booking_id
    JOIN ops.activity_schedule s ON s.id = b.activity_schedule_id
    LEFT JOIN ops.app_user u ON u.id = bt.driver_id
    WHERE b.status IN ('pending','confirmed')
      AND COALESCE(bt.pickup_at, s.scheduled_start) >= $1::timestamptz
      AND COALESCE(bt.pickup_at, s.scheduled_start) < $2::timestamptz
    GROUP BY u.full_name
    ORDER BY traslados DESC
    `,
    [from, to]
  );
  return rows;
}

/** Carga de guías (salidas asignadas) en el período. */
async function guideWorkload({ from, to }) {
  const { rows } = await pool.query(
    `
    SELECT u.full_name AS guia,
           COUNT(DISTINCT asg.activity_schedule_id)::int AS salidas,
           COALESCE(SUM(agg.personas),0)::int AS personas
    FROM ops.activity_schedule_guide asg
    JOIN ops.activity_schedule s ON s.id = asg.activity_schedule_id
    JOIN ops.app_user u ON u.id = asg.guide_id
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(b.number_of_people),0) AS personas
      FROM ops.booking b
      WHERE b.activity_schedule_id = s.id AND b.status IN ('pending','confirmed')
    ) agg ON true
    WHERE s.scheduled_start >= $1::timestamptz AND s.scheduled_start < $2::timestamptz
    GROUP BY u.full_name
    ORDER BY salidas DESC
    `,
    [from, to]
  );
  return rows;
}

module.exports = {
  salesByPeriod,
  commissionsByCompany,
  occupancyBySchedule,
  activityRanking,
  bookingsByStatus,
  transportByDriver,
  guideWorkload,
};
