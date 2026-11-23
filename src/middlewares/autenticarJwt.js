
const jwt = require('jsonwebtoken');
const Sesion = require('../models/sesionModel');

const autenticarJwt = async (req, res, next) => {
    const autorizacion = req.headers.authorization;

    if (
        typeof autorizacion !== 'string' ||
        !autorizacion.startsWith('Bearer ')
    ) {
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

    let datos;

    try {
        datos = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256']
        });
    } catch (error) {
        return res.status(401).json({
            error: 'Token inválido o expirado'
        });
    }

    const idUsuario = Number(datos.id_usuario);
    const idRol = Number(datos.id_rol);
    const idSesion = datos.sid;

    const uuidValido =
        typeof idSesion === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            .test(idSesion);

    if (
        !Number.isSafeInteger(idUsuario) ||
        idUsuario <= 0 ||
        idRol !== 2 ||
        !uuidValido
    ) {
        return res.status(401).json({
            error: 'Token de autenticación inválido'
        });
    }

    try {
        const sesion = await Sesion.validarSesion(
            idSesion,
            idUsuario,
            true
        );

        if (!sesion) {
            return res.status(401).json({
                error: 'Sesión expirada, revocada o inactiva'
            });
        }

        req.usuario = {
            id_usuario: idUsuario,
            id_rol: idRol
        };

        req.sesion = {
            id_sesion: sesion.id_sesion,
            segundos_restantes: sesion.segundos_restantes,
            segundos_inactividad_restantes:
                sesion.segundos_inactividad_restantes
        };

        res.set('Cache-Control', 'no-store');

        return next();

    } catch (error) {
        console.error(
            'Error al validar sesión:',
            error.message
        );

        return res.status(500).json({
            error: 'No se pudo verificar la sesión'
        });
    }
};

module.exports = autenticarJwt;
