
const { Router } = require('express');
const tecnicoController = require('../controllers/tecnicoController');

const router = Router();

router.get('/servicios', tecnicoController.listarServicios);
router.get('/servicios/:id', tecnicoController.obtenerServicioPorId);

module.exports = router;
