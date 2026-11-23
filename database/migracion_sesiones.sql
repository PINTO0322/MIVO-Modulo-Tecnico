
USE mivo_db;

CREATE TABLE sesiones_tecnico (
    id_sesion CHAR(36) PRIMARY KEY,
    id_usuario INT NOT NULL,
    hash_renovacion CHAR(64) NOT NULL UNIQUE,
    fecha_creacion DATETIME NOT NULL,
    ultima_actividad DATETIME NOT NULL,
    fecha_expiracion DATETIME NOT NULL,
    fecha_revocacion DATETIME NULL,

    CONSTRAINT fk_sesion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    INDEX idx_sesion_usuario (id_usuario),
    INDEX idx_sesion_expiracion (fecha_expiracion)
) ENGINE=InnoDB;
