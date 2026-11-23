
const { pool } = require('../config/mysqlDb');

const obtenerResumen = async (idTecnico) => {
    const [rows] = await pool.execute(`
        SELECT
            COUNT(*) AS total_asignaciones,

            COUNT(CASE
                WHEN c.estado_cita = 'CONFIRMADA'
                AND (
                    c.estado_reparacion IS NULL
                    OR c.estado_reparacion = 'ASIGNADA'
                )
                THEN 1
            END) AS pendientes,

            COUNT(CASE
                WHEN c.estado_reparacion = 'EN_PROCESO'
                THEN 1
            END) AS en_proceso,

            COUNT(CASE
                WHEN c.estado_reparacion = 'FINALIZADA'
                THEN 1
            END) AS finalizadas,

            COUNT(CASE
                WHEN c.estado_reparacion = 'EN_CORRECCION'
                THEN 1
            END) AS en_correccion

        FROM citas AS c
        INNER JOIN moto AS m
            ON c.id_moto = m.id_moto
            AND c.id_cliente = m.id_cliente
        WHERE c.id_tecnico = ?
    `, [idTecnico]);

    return rows[0];
};

module.exports = {
    obtenerResumen
};
