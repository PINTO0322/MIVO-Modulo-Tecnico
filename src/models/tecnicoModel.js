
const { pool } = require('../config/mysqlDb');

// Consultar el catálogo de servicios de MIVO
const listarCatalogoServicios = async () => {
    const query = `
        SELECT
            s.id_servicio,
            s.nombre_servicio,
            s.descripcion_servicio,
            s.precio_servicio,
            s.duracion_estimada,
            s.garantia_servicio,
            s.nivel_complejidad,
            ts.nombre AS tipo_servicio
        FROM servicio AS s
        INNER JOIN tipo_servicio AS ts
            ON s.id_tipo_servicio = ts.id_tipo_servicio
        ORDER BY s.id_servicio ASC
    `;

    const [rows] = await pool.execute(query);
    return rows;
};

module.exports = { listarCatalogoServicios };
