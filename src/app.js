const express = require('express');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const tecnicoRoutes = require('./routes/tecnicoRoutes');
const asignacionRoutes = require('./routes/asignacionRoutes');
const historialRoutes = require('./routes/historialRoutes');
const reparacionRoutes = require('./routes/reparacionRoutes');

const autenticarJwt = require('./middlewares/autenticarJwt');
const autorizarTecnico = require('./middlewares/autorizarTecnico');

const app = express();

app.disable('x-powered-by');
app.use(express.json());

app.use('/tecnico', express.static(
    path.join(__dirname, '../public')
));

app.get('/', (req, res) => {
    res.json({
        mensaje: 'API del módulo técnico MIVO activa'
    });
});

app.use('/api/auth', authRoutes);

const apiTecnica = express.Router();

apiTecnica.use(autenticarJwt, autorizarTecnico);
apiTecnica.use('/asignaciones', asignacionRoutes);
apiTecnica.use('/historial', historialRoutes);
apiTecnica.use('/reparaciones', reparacionRoutes);
apiTecnica.use(tecnicoRoutes);

app.use('/api/tecnico', apiTecnica);

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            error: 'El cuerpo de la solicitud debe ser JSON válido'
        });
    }

    if (error.type === 'entity.too.large') {
        return res.status(413).json({
            error: 'El cuerpo de la solicitud supera el tamaño permitido'
        });
    }

    console.error('Error de la aplicación:', error.message);

    return res.status(500).json({
        error: 'No se pudo completar la solicitud'
    });
});

module.exports = app;