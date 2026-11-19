
const express = require('express');
const tecnicoRoutes = require('./routes/tecnicoRoutes');

const app = express();

// Permitir recibir datos JSON
app.use(express.json());

// Ruta inicial de la API
app.get('/', (req, res) => {
    res.json({
        mensaje: 'API del módulo técnico MIVO activa'
    });
});

// Registrar las rutas del técnico
app.use('/api/tecnico', tecnicoRoutes);

module.exports = app;
