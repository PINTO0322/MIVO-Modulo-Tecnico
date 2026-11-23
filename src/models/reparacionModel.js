
const { pool } = require('../config/mysqlDb');

const iniciarReparacion = async (idCita, idTecnico) => {
    const [result] = await pool.execute(`
        UPDATE citas AS c
        INNER JOIN moto AS m
            ON c.id_moto = m.id_moto
            AND c.id_cliente = m.id_cliente
        SET c.estado_reparacion = 'EN_PROCESO',
            c.fecha_inicio_reparacion = NOW()
        WHERE c.id_citas = ?
          AND c.id_tecnico = ?
          AND c.estado_cita = 'CONFIRMADA'
          AND (
              c.estado_reparacion IS NULL
              OR c.estado_reparacion = 'ASIGNADA'
          )
    `, [idCita, idTecnico]);

    return result.affectedRows > 0;
};

const iniciarCorreccion = async (idCita, idTecnico) => {
    const [result] = await pool.execute(`
        UPDATE citas AS c
        INNER JOIN moto AS m
            ON c.id_moto = m.id_moto
            AND c.id_cliente = m.id_cliente
        SET c.estado_reparacion = 'EN_CORRECCION'
        WHERE c.id_citas = ?
          AND c.id_tecnico = ?
          AND c.estado_reparacion = 'FINALIZADA'
          AND EXISTS (
              SELECT 1
              FROM historial_de_servicios AS h
              WHERE h.id_citas = c.id_citas
                AND h.id_tecnico = c.id_tecnico
                AND h.id_moto = c.id_moto
                AND h.id_servicio = c.id_servicio
                AND h.estado = 'FINALIZADA'
          )
    `, [idCita, idTecnico]);

    return result.affectedRows > 0;
};

const finalizarTrabajo = async (
    idCita, idTecnico, repuestos, esCorreccion
) => {
    const conexion = await pool.getConnection();

    const estadoAnterior = esCorreccion
        ? 'EN_CORRECCION'
        : 'EN_PROCESO';

    const estadoHistorial = esCorreccion
        ? 'CORRECCION_FINALIZADA'
        : 'FINALIZADA';

    try {
        await conexion.beginTransaction();

        const [result] = await conexion.execute(`
            UPDATE citas AS c
            INNER JOIN moto AS m
                ON c.id_moto = m.id_moto
                AND c.id_cliente = m.id_cliente
            SET c.estado_reparacion = 'FINALIZADA',
                c.fecha_fin_reparacion = CASE
                    WHEN ? = 0 THEN NOW()
                    ELSE c.fecha_fin_reparacion
                END
            WHERE c.id_citas = ?
              AND c.id_tecnico = ?
              AND c.estado_reparacion = ?
        `, [
            esCorreccion ? 1 : 0,
            idCita,
            idTecnico,
            estadoAnterior
        ]);

        if (result.affectedRows === 0) {
            await conexion.rollback();
            return false;
        }

        const [historial] = await conexion.execute(`
            INSERT INTO historial_de_servicios (
                id_citas,
                id_moto,
                id_servicio,
                id_tecnico,
                servicio,
                tecnico_responsable,
                fecha,
                estado,
                repuestos_utilizados
            )
            SELECT
                c.id_citas,
                c.id_moto,
                c.id_servicio,
                c.id_tecnico,
                s.nombre_servicio,
                t.nombre_completo,
                CURDATE(),
                ?,
                ?
            FROM citas AS c
            INNER JOIN moto AS m
                ON c.id_moto = m.id_moto
                AND c.id_cliente = m.id_cliente
            INNER JOIN servicio AS s
                ON c.id_servicio = s.id_servicio
            INNER JOIN tecnico AS t
                ON c.id_tecnico = t.id_tecnico
            WHERE c.id_citas = ?
              AND c.id_tecnico = ?
              AND (
                  ? = 0 OR EXISTS (
                      SELECT 1
                      FROM historial_de_servicios AS h
                      WHERE h.id_citas = c.id_citas
                        AND h.id_tecnico = c.id_tecnico
                        AND h.id_moto = c.id_moto
                        AND h.id_servicio = c.id_servicio
                        AND h.estado = 'FINALIZADA'
                  )
              )
        `, [
            estadoHistorial,
            repuestos,
            idCita,
            idTecnico,
            esCorreccion ? 1 : 0
        ]);

        if (historial.affectedRows !== 1) {
            await conexion.rollback();
            return false;
        }

        await conexion.commit();
        return true;
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

const finalizarReparacion = (idCita, idTecnico, repuestos) =>
    finalizarTrabajo(idCita, idTecnico, repuestos, false);

const finalizarCorreccion = (idCita, idTecnico, repuestos) =>
    finalizarTrabajo(idCita, idTecnico, repuestos, true);

module.exports = {
    iniciarReparacion,
    finalizarReparacion,
    iniciarCorreccion,
    finalizarCorreccion
};
