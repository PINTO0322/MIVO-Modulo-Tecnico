
const { pool } = require('../config/mysqlDb');

const listarAsignacionesPorTecnico = async (idTecnico) => {
    const query = `
        SELECT
            c.id_citas,
            c.id_moto,
            c.id_servicio,
            c.id_tecnico,
            c.estado_cita,
            s.nombre_servicio
        FROM citas AS c
        INNER JOIN servicio AS s
            ON c.id_servicio = s.id_servicio
        WHERE c.id_tecnico = ?
        ORDER BY c.id_citas DESC
    `;

    const [rows] = await pool.execute(query, [idTecnico]);
    return rows;
};

module.exports = {
    listarAsignacionesPorTecnico
};
