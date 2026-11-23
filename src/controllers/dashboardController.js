
const Dashboard = require('../models/dashboardModel');

const obtenerDashboard = async (req, res) => {
    try {
        const idTecnico = Number(req.tecnico?.id_tecnico);

        if (!Number.isSafeInteger(idTecnico) || idTecnico <= 0) {
            return res.status(401).json({
                error: 'Acceso no autorizado'
            });
        }

        const resumen = await Dashboard.obtenerResumen(idTecnico);

        return res.status(200).json({
            tecnico: req.tecnico.nombre_completo,
            resumen
        });
    } catch (error) {
        console.error('Error en dashboard:', error.message);

        return res.status(500).json({
            error: 'No se pudo consultar el dashboard'
        });
    }
};

module.exports = {
    obtenerDashboard
};
