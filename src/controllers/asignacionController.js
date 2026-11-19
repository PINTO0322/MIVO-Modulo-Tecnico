
const Asignacion = require('../models/asignacionModel');

const listarAsignaciones = async (req, res) => {
    try {
        const idTecnico = Number(req.params.idTecnico);

        if (!Number.isSafeInteger(idTecnico) || idTecnico <= 0) {
            return res.status(400).json({
                error: 'ID de técnico no válido'
            });
        }

        const asignaciones =
            await Asignacion.listarAsignacionesPorTecnico(idTecnico);

        return res.status(200).json(asignaciones);
    } catch (error) {
        console.error('Error al consultar asignaciones:', error.message);

        return res.status(500).json({
            error: 'No se pudieron consultar las asignaciones'
        });
    }
};

module.exports = {
    listarAsignaciones
};
