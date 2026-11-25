const { Router } = require('express');
const tecnicoController = require('../controllers/tecnicoController');
const dashboardController = require('../controllers/dashboardController');

const router = Router();

router.get('/dashboard', dashboardController.obtenerDashboard);

router.get('/perfil', (req, res) => {
    const { nombre_completo, especialidad, telefono } = req.tecnico;

    return res.json({
        id_usuario: req.usuario.id_usuario,
        nombre_completo,
        especialidad,
        telefono
    });
});

router.get('/servicios', tecnicoController.listarServicios);
router.get('/servicios/:id', tecnicoController.obtenerServicioPorId);

module.exports = router;