
USE mivo_db;

CREATE OR REPLACE SQL SECURITY DEFINER VIEW vista_acceso_tecnico AS
SELECT
    u.id_usuario,
    u.hash,
    t.id_tecnico
FROM usuario AS u
INNER JOIN tecnico AS t
    ON u.id_usuario = t.id_usuario
WHERE u.id_rol = 2
  AND u.estado = 'ACTIVO'
  AND t.estado = 'ACTIVO';
