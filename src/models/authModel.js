
const { pool } = require('../config/mysqlDb');

const obtenerUsuarioTecnico = async (idUsuario) => {
    const [rows] = await pool.execute(`
        SELECT id_usuario, hash, id_tecnico
        FROM vista_acceso_tecnico
        WHERE id_usuario = ?
        LIMIT 1
    `, [idUsuario]);

    return rows[0] || null;
};

module.exports = {
    obtenerUsuarioTecnico
};
