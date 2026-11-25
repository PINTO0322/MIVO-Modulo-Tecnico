const { pool } = require('../config/mysqlDb');

const obtenerTecnicoActivo = async (idUsuario) => {
    const [rows] = await pool.execute(`
        SELECT
            t.id_tecnico,
            t.nombre_completo,
            t.especialidad,
            t.telefono
        FROM tecnico AS t
        INNER JOIN usuario AS u
            ON t.id_usuario = u.id_usuario
        WHERE u.id_usuario = ?
          AND u.id_rol = 2
          AND u.estado = 'ACTIVO'
          AND t.estado = 'ACTIVO'
        LIMIT 1
    `, [idUsuario]);

    return rows[0] || null;
};

module.exports = {
    obtenerTecnicoActivo
};