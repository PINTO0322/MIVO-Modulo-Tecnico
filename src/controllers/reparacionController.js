
const Reparacion = require('../models/reparacionModel');

const gestionarTrabajo = async (req, res, operacion, mensaje) => {
    try {
        const idCita = Number(req.params.idCita);
        const idTecnico = Number(req.tecnico?.id_tecnico);

        if (!Number.isSafeInteger(idTecnico) || idTecnico <= 0) {
            return res.status(401).json({
                error: 'Acceso no autorizado'
            });
        }

        if (!Number.isSafeInteger(idCita) || idCita <= 0) {
            return res.status(400).json({
                error: 'ID de cita no válido'
            });
        }

        const repuestos = req.body?.repuestos_utilizados ?? null;

        if (repuestos !== null &&
            (typeof repuestos !== 'string' || repuestos.length > 10000)) {
            return res.status(400).json({
                error: 'Repuestos utilizados no válidos'
            });
        }

        const resultado = await operacion(
            idCita,
            idTecnico,
            repuestos
        );

        if (!resultado) {
            return res.status(409).json({
                error: 'El trabajo no permite esta operación'
            });
        }

        return res.status(200).json({ mensaje });
    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            error: 'No se pudo gestionar el trabajo'
        });
    }
};

const iniciar = (req, res) =>
    gestionarTrabajo(
        req, res,
        Reparacion.iniciarReparacion,
        'Reparación iniciada correctamente'
    );

const finalizar = (req, res) =>
    gestionarTrabajo(
        req, res,
        Reparacion.finalizarReparacion,
        'Reparación finalizada correctamente'
    );

const iniciarCorreccion = (req, res) =>
    gestionarTrabajo(
        req, res,
        Reparacion.iniciarCorreccion,
        'Corrección iniciada correctamente'
    );

const finalizarCorreccion = (req, res) =>
    gestionarTrabajo(
        req, res,
        Reparacion.finalizarCorreccion,
        'Corrección finalizada correctamente'
    );

module.exports = {
    iniciar,
    finalizar,
    iniciarCorreccion,
    finalizarCorreccion
};
