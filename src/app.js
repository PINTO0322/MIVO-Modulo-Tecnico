
const express = require('express');

const app = express();

// Permitir recibir datos JSON
app.use(express.json());

// Ruta inicial para verificar la API
app.get('/', (req, res) => {
    res.json({
        mensaje: 'API del módulo técnico MIVO activa'
    });
});

module.exports = app;
