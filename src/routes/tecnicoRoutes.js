
const { Router } = require('express');
const tecnicoController = require('../controllers/tecnicoController');
const dashboardController = require('../controllers/dashboardController');

const router = Router();

router.get('/dashboard', dashboardController.obtenerDashboard);
router.get('/servicios', tecnicoController.listarServicios);
router.get('/servicios/:id', tecnicoController.obtenerServicioPorId);

module.exports = router;
