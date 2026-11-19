
const jwt = require('jsonwebtoken');

const autenticarJwt = (req, res, next) => {
    const autorizacion = req.headers.authorization;

    if (!autorizacion || !autorizacion.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Token de autenticación requerido'
        });
    }

    const token = autorizacion.slice(7).trim();

    if (!token) {
        return res.status(401).json({
            error: 'Token de autenticación requerido'
        });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(503).json({
            error: 'Autenticación no configurada'
        });
    }

    try {
        const datos = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256']
        });

        const idUsuario = Number(datos.id_usuario);
        const idRol = Number(datos.id_rol);

        if (
            !Number.isSafeInteger(idUsuario) ||
            idUsuario <= 0 ||
            !Number.isSafeInteger(idRol) ||
            idRol <= 0
        ) {
            return res.status(401).json({
                error: 'Token de autenticación inválido'
            });
        }

        req.usuario = {
            id_usuario: idUsuario,
            id_rol: idRol
        };

        return next();
    } catch (error) {
        return res.status(401).json({
            error: 'Token inválido o expirado'
        });
    }
};

module.exports = autenticarJwt;
