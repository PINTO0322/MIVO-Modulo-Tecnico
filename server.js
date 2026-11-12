
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor MIVO Técnico funcionando en http://localhost:${PORT}`);
});
