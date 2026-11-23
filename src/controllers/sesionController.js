
const jwt = require('jsonwebtoken');
const { randomBytes, createHash } = require('node:crypto');

const Auth = require('../models/authModel');
const Sesion = require('../models/sesionModel');
const config = require('../config/sesionConfig');

const obtenerCookie = (req, nombre) => {
    const cookies = req.headers.cookie || '';

    const encontrada = cookies
        .split(';')
        .map(cookie => cookie.trim())
        .find(cookie => cookie.startsWith(`${nombre}=`));

    return encontrada
        ? encontrada.slice(nombre.length + 1)
        : null;
};

const opcionesCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth'
};

const limpiarCookie = res => {
    res.clearCookie('mivo_refresh', opcionesCookie);
};

const renovar = async (req, res) => {
    res.set('Cache-Control', 'no-store');

    try {
        if (!process.env.JWT_SECRET) {
            return res.status(503).json({
                error: 'Autenticación no configurada'
            });
        }

        const tokenActual = obtenerCookie(req, 'mivo_refresh');

        if (!tokenActual || !/^[a-f0-9]{64}$/.test(tokenActual)) {
            limpiarCookie(res);

            return res.status(401).json({
                error: 'Sesión no válida'
            });
        }

        const hashActual = createHash('sha256')
            .update(tokenActual)
            .digest('hex');

        const tokenNuevo = randomBytes(32).toString('hex');

        const hashNuevo = createHash('sha256')
            .update(tokenNuevo)
            .digest('hex');

        const sesion = await Sesion.renovarSesion(
            hashActual,
            hashNuevo
        );

        if (!sesion) {
            limpiarCookie(res);

            return res.status(401).json({
                error: 'Sesión expirada o revocada'
            });
        }

        const usuario = await Auth.obtenerUsuarioTecnico(
            sesion.id_usuario
        );

        if (!usuario) {
            await Sesion.revocarSesion(
                sesion.id_sesion,
                sesion.id_usuario
            );

            limpiarCookie(res);

            return res.status(403).json({
                error: 'Acceso técnico no autorizado'
            });
        }

        const token = jwt.sign(
            {
                id_usuario: sesion.id_usuario,
                id_rol: 2,
                sid: sesion.id_sesion
            },
            process.env.JWT_SECRET,
            {
                algorithm: 'HS256',
                expiresIn: config.JWT_DURACION
            }
        );

        res.cookie('mivo_refresh', tokenNuevo, {
            ...opcionesCookie,
            maxAge: Math.max(
                0,
                sesion.segundos_restantes * 1000
            )
        });

        return res.status(200).json({
            mensaje: 'Sesión renovada correctamente',
            token
        });

    } catch (error) {
        console.error('Error al renovar sesión:', error.message);

        return res.status(500).json({
            error: 'No se pudo renovar la sesión'
        });
    }
};

const cerrar = async (req, res) => {
    res.set('Cache-Control', 'no-store');

    try {
        const tokenActual = obtenerCookie(req, 'mivo_refresh');

        if (tokenActual && /^[a-f0-9]{64}$/.test(tokenActual)) {
            const hashRenovacion = createHash('sha256')
                .update(tokenActual)
                .digest('hex');

            await Sesion.revocarSesionPorHash(hashRenovacion);
        }

        limpiarCookie(res);

        return res.status(200).json({
            mensaje: 'Sesión cerrada correctamente'
        });

    } catch (error) {
        console.error('Error al cerrar sesión:', error.message);

        return res.status(500).json({
            error: 'No se pudo cerrar la sesión'
        });
    }
};

module.exports = {
    renovar,
    cerrar
};
