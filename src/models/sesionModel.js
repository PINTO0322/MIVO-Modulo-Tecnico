
const pool = require('../config/mysqlDb');
const config = require('../config/sesionConfig');

const crearSesion = async (idSesion, idUsuario, hashRenovacion) => {
    const [resultado] = await pool.execute(
        `INSERT INTO sesiones_tecnico (
            id_sesion,
            id_usuario,
            hash_renovacion,
            fecha_creacion,
            ultima_actividad,
            fecha_expiracion
        ) VALUES (
            ?, ?, ?,
            UTC_TIMESTAMP(),
            UTC_TIMESTAMP(),
            DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND)
        )`,
        [
            idSesion,
            idUsuario,
            hashRenovacion,
            config.DURACION_MAXIMA_SEGUNDOS
        ]
    );

    return resultado.affectedRows === 1;
};

const consultarSesion = async (conexion, idSesion) => {
    const [filas] = await conexion.execute(
        `SELECT
            id_sesion,
            id_usuario,
            fecha_creacion,
            ultima_actividad,
            fecha_expiracion,
            TIMESTAMPDIFF(
                SECOND,
                UTC_TIMESTAMP(),
                fecha_expiracion
            ) AS segundos_restantes,
            TIMESTAMPDIFF(
                SECOND,
                UTC_TIMESTAMP(),
                DATE_ADD(ultima_actividad, INTERVAL ? SECOND)
            ) AS segundos_inactividad_restantes
        FROM sesiones_tecnico
        WHERE id_sesion = ?
          AND fecha_revocacion IS NULL
          AND fecha_expiracion > UTC_TIMESTAMP()
          AND ultima_actividad >
              DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND)`,
        [
            config.INACTIVIDAD_SEGUNDOS,
            idSesion,
            config.INACTIVIDAD_SEGUNDOS
        ]
    );

    return filas[0] || null;
};

const validarSesion = async (
    idSesion,
    idUsuario,
    registrarActividad = false
) => {
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();

        const [filas] = await conexion.execute(
            `SELECT id_sesion
             FROM sesiones_tecnico
             WHERE id_sesion = ?
               AND id_usuario = ?
             FOR UPDATE`,
            [idSesion, idUsuario]
        );

        if (!filas.length) {
            await conexion.rollback();
            return null;
        }

        let sesion = await consultarSesion(conexion, idSesion);

        if (!sesion) {
            await conexion.rollback();
            return null;
        }

        if (registrarActividad) {
            await conexion.execute(
                `UPDATE sesiones_tecnico
                 SET ultima_actividad = UTC_TIMESTAMP()
                 WHERE id_sesion = ?`,
                [idSesion]
            );

            sesion = await consultarSesion(conexion, idSesion);
        }

        await conexion.commit();

        return sesion;

    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

const renovarSesion = async (hashActual, hashNuevo) => {
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();

        const [filas] = await conexion.execute(
            `SELECT id_sesion
             FROM sesiones_tecnico
             WHERE hash_renovacion = ?
             FOR UPDATE`,
            [hashActual]
        );

        if (!filas.length) {
            await conexion.rollback();
            return null;
        }

        const idSesion = filas[0].id_sesion;

        const sesion = await consultarSesion(conexion, idSesion);

        if (!sesion) {
            await conexion.rollback();
            return null;
        }

        await conexion.execute(
            `UPDATE sesiones_tecnico
             SET hash_renovacion = ?
             WHERE id_sesion = ?`,
            [hashNuevo, idSesion]
        );

        await conexion.commit();

        return sesion;

    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

const revocarSesion = async (idSesion, idUsuario) => {
    const [resultado] = await pool.execute(
        `UPDATE sesiones_tecnico
         SET fecha_revocacion = UTC_TIMESTAMP()
         WHERE id_sesion = ?
           AND id_usuario = ?
           AND fecha_revocacion IS NULL`,
        [idSesion, idUsuario]
    );

    return resultado.affectedRows === 1;
};

module.exports = {
    crearSesion,
    validarSesion,
    renovarSesion,
    revocarSesion
};

