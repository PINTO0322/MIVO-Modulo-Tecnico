
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
    randomUUID,
    randomBytes,
    createHash
} = require('node:crypto');

const Auth = require('../models/authModel');
const Sesion = require('../models/sesionModel');
const config = require('../config/sesionConfig');

const login = async (req, res) => {
    try {
        const { id_usuario, password } = req.body || {};
        const idUsuario = Number(id_usuario);

        if (
            !Number.isSafeInteger(idUsuario) ||
            idUsuario <= 0 ||
            !['string', 'number'].includes(typeof id_usuario) ||
            typeof password !== 'string' ||
            !password ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            return res.status(400).json({
                error: 'Credenciales no válidas'
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(503).json({
                error: 'Autenticación no configurada'
            });
        }

        const usuario = await Auth.obtenerUsuarioTecnico(idUsuario);

        if (
            !usuario ||
            typeof usuario.hash !== 'string' ||
            !(await bcrypt.compare(
                password,
                usuario.hash.replace(/^\$2y\$/, '$2b$')
            ))
        ) {
            return res.status(401).json({
                error: 'Credenciales incorrectas'
            });
        }

        const idSesion = randomUUID();

        const tokenRenovacion = randomBytes(32).toString('hex');

        const hashRenovacion = createHash('sha256')
            .update(tokenRenovacion)
            .digest('hex');

        const token = jwt.sign(
            {
                id_usuario: usuario.id_usuario,
                id_rol: 2,
                sid: idSesion
            },
            process.env.JWT_SECRET,
            {
                algorithm: 'HS256',
                expiresIn: config.JWT_DURACION
            }
        );

        const registrada = await Sesion.crearSesion(
            idSesion,
            usuario.id_usuario,
            hashRenovacion
        );

        if (!registrada) {
            throw new Error('No se pudo registrar la sesión');
        }

        res.cookie('mivo_refresh', tokenRenovacion, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/api/auth',
            maxAge: config.DURACION_MAXIMA_SEGUNDOS * 1000
        });

        res.set('Cache-Control', 'no-store');

        return res.status(200).json({
    mensaje: 'Inicio de sesión correcto',
    token,
    sesion: {
        segundos_restantes: config.DURACION_MAXIMA_SEGUNDOS,
        segundos_inactividad_restantes: config.INACTIVIDAD_SEGUNDOS,
        aviso_segundos: config.AVISO_SEGUNDOS
    }
});

    } catch (error) {
        console.error('Error de autenticación:', error.message);

        return res.status(500).json({
            error: 'No se pudo iniciar sesión'
        });
    }
};

module.exports = {
    login
};
