CREATE TABLE IF NOT EXISTS tecnico (
    id_tecnico INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    nombre_completo VARCHAR(150) NOT NULL,
    especialidad VARCHAR(100),
    telefono VARCHAR(20),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT fk_tecnico_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
) ENGINE=InnoDB;

ALTER TABLE citas
    ADD COLUMN IF NOT EXISTS id_moto INT NULL,
    ADD COLUMN IF NOT EXISTS id_tecnico INT NULL,
    ADD CONSTRAINT fk_citas_moto
        FOREIGN KEY IF NOT EXISTS (id_moto) REFERENCES moto(id_moto),
    ADD CONSTRAINT fk_citas_tecnico
        FOREIGN KEY IF NOT EXISTS (id_tecnico) REFERENCES tecnico(id_tecnico);

ALTER TABLE historial_de_servicios
    ADD COLUMN IF NOT EXISTS id_moto INT NULL,
    ADD COLUMN IF NOT EXISTS id_servicio INT NULL,
    ADD COLUMN IF NOT EXISTS id_tecnico INT NULL,
    ADD CONSTRAINT fk_historial_moto
        FOREIGN KEY IF NOT EXISTS (id_moto) REFERENCES moto(id_moto),
    ADD CONSTRAINT fk_historial_servicio
        FOREIGN KEY IF NOT EXISTS (id_servicio) REFERENCES servicio(id_servicio),
    ADD CONSTRAINT fk_historial_tecnico
        FOREIGN KEY IF NOT EXISTS (id_tecnico) REFERENCES tecnico(id_tecnico);