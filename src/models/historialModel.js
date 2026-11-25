const { pool } = require('../config/mysqlDb');

const listarHistorialPorTecnico = async (idTecnico) => {
    const query = `
        SELECT
            h.*
        FROM historial_de_servicios AS h
        WHERE h.id_tecnico = ?
        ORDER BY h.fecha DESC, h.id_historialservicios DESC
    `;

    const [rows] = await pool.execute(query, [idTecnico]);

    return rows;
};

module.exports = {
    listarHistorialPorTecnico
};