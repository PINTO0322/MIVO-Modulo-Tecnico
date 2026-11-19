
const { Router } = require('express');
const historialController = require('../controllers/historialController');

const router = Router();

router.get('/', historialController.listarHistorial);

module.exports = router;
