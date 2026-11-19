
CREATE TABLE tecnico (
    id_tecnico INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    nombre_completo VARCHAR(150) NOT NULL,
    especialidad VARCHAR(100),
    telefono VARCHAR(20),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT fk_tecnico_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
);

ALTER TABLE citas
    ADD COLUMN id_moto INT NULL,
    ADD COLUMN id_tecnico INT NULL,
    ADD CONSTRAINT fk_citas_moto
        FOREIGN KEY (id_moto) REFERENCES moto(id_moto),
    ADD CONSTRAINT fk_citas_tecnico
        FOREIGN KEY (id_tecnico) REFERENCES tecnico(id_tecnico);

ALTER TABLE historial_de_servicios
    ADD COLUMN id_moto INT NULL,
    ADD COLUMN id_servicio INT NULL,
    ADD COLUMN id_tecnico INT NULL,
    ADD CONSTRAINT fk_historial_moto
        FOREIGN KEY (id_moto) REFERENCES moto(id_moto),
    ADD CONSTRAINT fk_historial_servicio
        FOREIGN KEY (id_servicio) REFERENCES servicio(id_servicio),
    ADD CONSTRAINT fk_historial_tecnico
        FOREIGN KEY (id_tecnico) REFERENCES tecnico(id_tecnico);
