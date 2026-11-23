
const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');

const authController = require('../controllers/authController');

const {
    renovar,
    cerrar
} = require('../controllers/sesionController');

const router = Router();

const limitarIntentos = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        error: 'Demasiados intentos de inicio de sesión'
    }
});

router.post('/login', limitarIntentos, authController.login);
router.post('/renovar', renovar);
router.post('/logout', cerrar);

module.exports = router;
