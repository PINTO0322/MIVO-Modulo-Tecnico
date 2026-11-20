
USE mivo_db;

ALTER TABLE citas
    ADD COLUMN estado_reparacion VARCHAR(30) NULL,
    ADD COLUMN fecha_inicio_reparacion DATETIME NULL,
    ADD COLUMN fecha_fin_reparacion DATETIME NULL;
