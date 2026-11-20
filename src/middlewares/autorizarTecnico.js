
const Autorizacion = require('../models/autorizacionModel');

const autorizarTecnico = async (req, res, next) => {
    try {
        const idUsuario = Number(req.usuario?.id_usuario);

        if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
            return res.status(401).json({
                error: 'Acceso no autorizado'
            });
        }

        const tecnico =
            await Autorizacion.obtenerTecnicoActivo(idUsuario);

        if (!tecnico) {
            return res.status(403).json({
                error: 'Perfil técnico no autorizado'
            });
        }

        req.tecnico = tecnico;

        return next();
    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            error: 'No se pudo verificar el acceso'
        });
    }
};

module.exports = autorizarTecnico;
