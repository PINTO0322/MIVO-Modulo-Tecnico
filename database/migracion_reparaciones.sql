ALTER TABLE citas
    ADD COLUMN IF NOT EXISTS estado_reparacion VARCHAR(30) NULL,
    ADD COLUMN IF NOT EXISTS fecha_inicio_reparacion DATETIME NULL,
    ADD COLUMN IF NOT EXISTS fecha_fin_reparacion DATETIME NULL;