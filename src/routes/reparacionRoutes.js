
const { Router } = require('express');
const reparacionController = require('../controllers/reparacionController');
const autenticarJwt = require('../middlewares/autenticarJwt');
const autorizarTecnico = require('../middlewares/autorizarTecnico');

const router = Router();

router.use(autenticarJwt, autorizarTecnico);

router.patch('/:idCita/iniciar', reparacionController.iniciar);
router.patch('/:idCita/finalizar', reparacionController.finalizar);

router.patch(
    '/:idCita/correccion/iniciar',
    reparacionController.iniciarCorreccion
);

router.patch(
    '/:idCita/correccion/finalizar',
    reparacionController.finalizarCorreccion
);

module.exports = router;
