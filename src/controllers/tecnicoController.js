
const Tecnico = require('../models/tecnicoModel');

// Consultar el catálogo de servicios de MIVO
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

module.exports = { listarServicios };
