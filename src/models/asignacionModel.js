
const { pool } = require('../config/mysqlDb');

const listarAsignacionesPorTecnico = async (idTecnico) => {
    const query = `
        SELECT
            c.id_citas,
            c.id_moto,
            c.id_servicio,
            c.id_tecnico,
            c.fecha_cita,
            c.hora_cita,
            c.estado_cita,
            c.servicio_a_realizar,
            CASE
                WHEN c.estado_reparacion IS NULL
                     AND c.estado_cita = 'CONFIRMADA'
                THEN 'ASIGNADA'
                ELSE c.estado_reparacion
            END AS estado_reparacion,
            c.fecha_inicio_reparacion,
            c.fecha_fin_reparacion,
            m.placa,
            m.linea,
            m.modelo,
            s.nombre_servicio
        FROM citas AS c
        INNER JOIN servicio AS s
            ON c.id_servicio = s.id_servicio
        INNER JOIN moto AS m
            ON c.id_moto = m.id_moto
            AND c.id_cliente = m.id_cliente
        WHERE c.id_tecnico = ?
        ORDER BY c.fecha_cita ASC, c.hora_cita ASC
    `;

    const [rows] = await pool.execute(query, [idTecnico]);
    return rows;
};

module.exports = {
    listarAsignacionesPorTecnico
};
