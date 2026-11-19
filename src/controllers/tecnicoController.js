
const Tecnico = require('../models/tecnicoModel');

const listarServicios = async (req, res) => {
    try {
        const servicios = await Tecnico.listarCatalogoServicios();
        return res.status(200).json(servicios);
    } catch (error) {
        console.error('Error al consultar servicios:', error.message);

        return res.status(500).json({
            error: 'No se pudieron consultar los servicios'
        });
    }
};

const obtenerServicioPorId = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'ID de servicio no válido'
            });
        }

        const servicio = await Tecnico.obtenerServicioPorId(id);

        if (!servicio) {
            return res.status(404).json({
                error: 'Servicio no encontrado'
            });
        }

        return res.status(200).json(servicio);
    } catch (error) {
        console.error('Error al consultar el servicio:', error.message);

        return res.status(500).json({
            error: 'No se pudo consultar el servicio'
        });
    }
};

module.exports = {
    listarServicios,
    obtenerServicioPorId
};
