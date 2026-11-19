
const { pool } = require('../config/mysqlDb');

const autorizarTecnico = async (req, res, next) => {
    const idUsuario = Number(req.usuario?.id_usuario);
    const idRol = Number(req.usuario?.id_rol);

    if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
        return res.status(401).json({
            error: 'Acceso no autorizado'
        });
    }

    if (idRol !== 2) {
        return res.status(403).json({
            error: 'Acceso exclusivo para técnicos'
        });
    }

    try {
        const [rows] = await pool.execute(
            `SELECT id_tecnico
             FROM tecnico
             WHERE id_usuario = ? AND estado = ?
             LIMIT 1`,
            [idUsuario, 'ACTIVO']
        );

        if (rows.length === 0) {
            return res.status(403).json({
                error: 'Perfil técnico no autorizado'
            });
        }

        req.tecnico = {
            id_tecnico: rows[0].id_tecnico
        };

        return next();
    } catch (error) {
        console.error('Error al autorizar técnico:', error.message);

        return res.status(500).json({
            error: 'No se pudo verificar el acceso'
        });
    }
};

module.exports = autorizarTecnico;
