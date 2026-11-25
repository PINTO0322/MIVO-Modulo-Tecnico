const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const mysql = require('mysql2/promise');

require('dotenv').config();

const migraciones = [
    'migracion_modulo_tecnico.sql',
    'migracion_reparaciones.sql',
    'migracion_sesiones.sql',
    'migracion_acceso_tecnico.sql'
];

const relaciones = [
    'tecnico.id_usuario=usuario.id_usuario',
    'sesiones_tecnico.id_usuario=usuario.id_usuario',
    'citas.id_moto=moto.id_moto',
    'citas.id_tecnico=tecnico.id_tecnico',
    'historial_de_servicios.id_moto=moto.id_moto',
    'historial_de_servicios.id_servicio=servicio.id_servicio',
    'historial_de_servicios.id_tecnico=tecnico.id_tecnico'
];

async function migrar() {
    const database = process.env.DB_NAME?.trim();

    if (!database) {
        throw new Error('Configura DB_NAME con el nombre de la copia local de MIVO.');
    }

    const conexion = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database
    });

    const bloqueo = 'mivo-tecnico-' + createHash('sha256')
        .update(database)
        .digest('hex')
        .slice(0, 40);

    try {
        const [[{ obtenido }]] = await conexion.execute(
            'SELECT GET_LOCK(?, 10) AS obtenido',
            [bloqueo]
        );

        if (obtenido !== 1) {
            throw new Error('Otra ejecución está migrando esta base. Vuelve a intentarlo.');
        }

        await conexion.query(`
            SELECT id_citas, id_cliente, id_servicio
            FROM citas LIMIT 0
        `);
        await conexion.query(`
            SELECT id_historialservicios, cliente, placa_moto, precio
            FROM historial_de_servicios LIMIT 0
        `);
        await conexion.query(`
            SELECT id_moto, id_cliente
            FROM moto LIMIT 0
        `);
        await conexion.query(`
            SELECT id_usuario, id_rol, hash, estado
            FROM usuario LIMIT 0
        `);
        await conexion.query(`
            SELECT id_servicio, nombre_servicio, precio_servicio
            FROM servicio LIMIT 0
        `);

        for (const archivo of migraciones) {
            const sql = await readFile(path.join(__dirname, archivo), 'utf8');
            const sentencias = sql
                .split(';')
                .map(sentencia => sentencia.trim())
                .filter(Boolean);

            for (const sentencia of sentencias) {
                await conexion.query(sentencia);
            }

            console.log(`Aplicada: ${archivo}`);
        }

        await conexion.query(`
            SELECT id_usuario, hash, id_tecnico
            FROM vista_acceso_tecnico LIMIT 0
        `);
        await conexion.query(`
            SELECT id_sesion, hash_renovacion, fecha_creacion,
                   ultima_actividad, fecha_expiracion, fecha_revocacion
            FROM sesiones_tecnico LIMIT 0
        `);
        await conexion.query(`
            SELECT id_moto, id_tecnico, estado_reparacion,
                   fecha_inicio_reparacion, fecha_fin_reparacion
            FROM citas LIMIT 0
        `);
        await conexion.query(`
            SELECT id_moto, id_servicio, id_tecnico
            FROM historial_de_servicios LIMIT 0
        `);

        const [claves] = await conexion.query(`
            SELECT CONCAT(
                TABLE_NAME, '.', COLUMN_NAME, '=',
                REFERENCED_TABLE_NAME, '.', REFERENCED_COLUMN_NAME
            ) AS relacion
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND REFERENCED_TABLE_SCHEMA = DATABASE()
        `);

        const presentes = new Set(claves.map(clave => clave.relacion));
        const faltantes = relaciones.filter(relacion => !presentes.has(relacion));

        if (faltantes.length) {
            throw new Error(`Faltan relaciones: ${faltantes.join(', ')}`);
        }

        console.log(`Esquema técnico verificado en ${database}.`);
    } finally {
        await conexion.end();
    }
}

migrar().catch(error => {
    console.error('No se pudo preparar la base técnica:', error.message);
    process.exitCode = 1;
});