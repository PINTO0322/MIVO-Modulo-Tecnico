
const { Router } = require('express');
const tecnicoController = require('../controllers/tecnicoController');

const router = Router();

// Consultar los servicios asignados al técnico
router.get('/servicios', tecnicoController.listarServicios);

module.exports = router;
