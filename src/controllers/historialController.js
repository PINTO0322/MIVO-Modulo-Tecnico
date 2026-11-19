
const Historial = require('../models/historialModel');

const listarHistorial = async (req, res) => {
    try {
        const idTecnico = Number(req.tecnico?.id_tecnico);

        if (!Number.isSafeInteger(idTecnico) || idTecnico <= 0) {
            return res.status(401).json({
                error: 'Acceso no autorizado'
            });
        }

        const historial = await Historial.listarHistorialPorTecnico(idTecnico);

        return res.status(200).json(historial);
    } catch (error) {
        console.error('Error al consultar el historial:', error.message);

        return res.status(500).json({
            error: 'No se pudo consultar el historial'
        });
    }
};

module.exports = {
    listarHistorial
};
