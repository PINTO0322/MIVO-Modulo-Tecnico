
const express = require('express');

const tecnicoRoutes = require('./routes/tecnicoRoutes');
const asignacionRoutes = require('./routes/asignacionRoutes');
const historialRoutes = require('./routes/historialRoutes');
const reparacionRoutes = require('./routes/reparacionRoutes');

const autenticarJwt = require('./middlewares/autenticarJwt');
const autorizarTecnico = require('./middlewares/autorizarTecnico');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        mensaje: 'API del módulo técnico MIVO activa'
    });
});

app.use(
    '/api/tecnico/asignaciones',
    autenticarJwt,
    autorizarTecnico,
    asignacionRoutes
);

app.use(
    '/api/tecnico/historial',
    autenticarJwt,
    autorizarTecnico,
    historialRoutes
);

app.use(
    '/api/tecnico/reparaciones',
    reparacionRoutes
);

app.use(
    '/api/tecnico',
    autenticarJwt,
    autorizarTecnico,
    tecnicoRoutes
);

module.exports = app;
