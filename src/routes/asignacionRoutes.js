
const { Router } = require('express');
const asignacionController = require('../controllers/asignacionController');

const router = Router();

router.get('/', asignacionController.listarAsignaciones);

module.exports = router;
