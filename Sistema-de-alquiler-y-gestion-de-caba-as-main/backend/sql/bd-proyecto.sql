DROP DATABASE IF EXISTS pehuen_co;
CREATE DATABASE pehuen_co CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pehuen_co;

CREATE TABLE rol (
    id_rol INT NOT NULL AUTO_INCREMENT,
    nombre_rol VARCHAR(30) NOT NULL,
    PRIMARY KEY (id_rol)
) ENGINE=InnoDB;

CREATE TABLE usuario (
    id_usuario INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    dni VARCHAR(15) NOT NULL,
    telefono VARCHAR(30),
    email VARCHAR(100),
    nombre_usuario VARCHAR(50) NOT NULL,
    contrasena_encriptada VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuario_dni UNIQUE (dni),
    CONSTRAINT uq_usuario_nombre_usuario UNIQUE (nombre_usuario),
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES rol (id_rol)
) ENGINE=InnoDB;

CREATE TABLE cabana (
    id_cabana INT NOT NULL AUTO_INCREMENT,
    nombre_identificador VARCHAR(50) NOT NULL,
    capacidad_maxima INT NOT NULL,
    descripcion_equipamiento VARCHAR(500),
    precio_por_noche INT NOT NULL,
    PRIMARY KEY (id_cabana),
    CONSTRAINT uq_cabana_nombre UNIQUE (nombre_identificador),
    CONSTRAINT ck_cabana_capacidad CHECK (capacidad_maxima > 0),
    CONSTRAINT ck_cabana_precio CHECK (precio_por_noche >= 0)
) ENGINE=InnoDB;

CREATE TABLE reserva (
    id_reserva INT NOT NULL AUTO_INCREMENT,
    fecha_ingreso DATE NOT NULL,
    fecha_egreso DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
    precio_por_noche INT NOT NULL,
    monto_total INT NOT NULL,
    id_usuario INT NOT NULL,
    id_cabana INT NOT NULL,
    PRIMARY KEY (id_reserva),
    CONSTRAINT fk_reserva_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
    CONSTRAINT fk_reserva_cabana FOREIGN KEY (id_cabana) REFERENCES cabana (id_cabana),
    CONSTRAINT ck_reserva_fechas CHECK (fecha_egreso > fecha_ingreso),
    CONSTRAINT ck_reserva_estado CHECK (estado IN ('Pendiente', 'Confirmada', 'Finalizada', 'Cancelada')),
    CONSTRAINT ck_reserva_montos CHECK (precio_por_noche >= 0 AND monto_total >= 0),
    INDEX idx_reserva_cabana_fechas (id_cabana, fecha_ingreso, fecha_egreso)
) ENGINE=InnoDB;

CREATE TABLE pago (
    id_pago INT NOT NULL AUTO_INCREMENT,
    monto INT NOT NULL,
    fecha_hora_pago DATETIME NOT NULL,
    metodo_pago VARCHAR(30) NOT NULL,
    id_reserva INT NOT NULL,
    PRIMARY KEY (id_pago),
    CONSTRAINT fk_pago_reserva FOREIGN KEY (id_reserva) REFERENCES reserva (id_reserva),
    CONSTRAINT ck_pago_monto CHECK (monto > 0)
) ENGINE=InnoDB;

CREATE TABLE comprobante (
    id_comprobante INT NOT NULL AUTO_INCREMENT,
    ruta_archivo_digital VARCHAR(255) NOT NULL,
    fecha_carga DATE NOT NULL,
    id_pago INT NOT NULL,
    PRIMARY KEY (id_comprobante),
    CONSTRAINT uq_comprobante_pago UNIQUE (id_pago),
    CONSTRAINT fk_comprobante_pago FOREIGN KEY (id_pago) REFERENCES pago (id_pago)
) ENGINE=InnoDB;

-- Los ids de rol van explícitos: el código usa 1 = Encargada y 2 = Cliente (api/config.php).
INSERT INTO rol (id_rol, nombre_rol) VALUES
(1, 'Encargada'),
(2, 'Cliente');

-- Contraseñas guardadas con password_hash() (bcrypt).
-- Encargada: usuario "encargada" / clave "encargada2026".
-- Clientes de prueba: usuario = el de la tabla / clave "cliente2026".
INSERT INTO usuario (nombre, apellido, dni, telefono, email, nombre_usuario, contrasena_encriptada, id_rol) VALUES
('Encargada', 'Pehuen Co', '00000000', NULL, NULL, 'encargada', '$2y$10$Nxpt1eBSWnekHnFpIR6nZO650zyS.XiVSuK41cYjPAZvl5EPbMctC', 1);

INSERT INTO usuario (nombre, apellido, dni, telefono, email, nombre_usuario, contrasena_encriptada, id_rol) VALUES
('María', 'González', '30123456', '2926 41-1001', 'maria.gonzalez@example.com', 'mgonzalez', '$2y$10$7e6sTbHASYiS4bffOZP77Ot7Ykh2N.HptZBVAwJr7PKWzq0hwZ8bS', 2),
('Juan', 'Pérez', '28456789', '2926 41-1002', 'juan.perez@example.com', 'jperez', '$2y$10$7e6sTbHASYiS4bffOZP77Ot7Ykh2N.HptZBVAwJr7PKWzq0hwZ8bS', 2),
('Lucía', 'Fernández', '35111222', '291 455-1003', 'lucia.fernandez@example.com', 'lfernandez', '$2y$10$7e6sTbHASYiS4bffOZP77Ot7Ykh2N.HptZBVAwJr7PKWzq0hwZ8bS', 2),
('Carlos', 'Rodríguez', '27333444', '291 455-1004', 'carlos.rodriguez@example.com', 'crodriguez', '$2y$10$7e6sTbHASYiS4bffOZP77Ot7Ykh2N.HptZBVAwJr7PKWzq0hwZ8bS', 2),
('Sofía', 'Martínez', '38555666', '11 5555-1005', 'sofia.martinez@example.com', 'smartinez', '$2y$10$7e6sTbHASYiS4bffOZP77Ot7Ykh2N.HptZBVAwJr7PKWzq0hwZ8bS', 2),
('Martín', 'López', '33777888', '11 5555-1006', 'martin.lopez@example.com', 'mlopez', '$2y$10$7e6sTbHASYiS4bffOZP77Ot7Ykh2N.HptZBVAwJr7PKWzq0hwZ8bS', 2),
('Valentina', 'Díaz', '40222333', '221 555-1007', 'valentina.diaz@example.com', 'vdiaz', '$2y$10$7e6sTbHASYiS4bffOZP77Ot7Ykh2N.HptZBVAwJr7PKWzq0hwZ8bS', 2),
('Diego', 'Sánchez', '29888999', '221 555-1008', 'diego.sanchez@example.com', 'dsanchez', '$2y$10$7e6sTbHASYiS4bffOZP77Ot7Ykh2N.HptZBVAwJr7PKWzq0hwZ8bS', 2),
('Camila', 'Romero', '36444555', '2926 41-1009', NULL, 'cromero', '$2y$10$7e6sTbHASYiS4bffOZP77Ot7Ykh2N.HptZBVAwJr7PKWzq0hwZ8bS', 2),
('Pablo', 'Torres', '31666777', NULL, 'pablo.torres@example.com', 'ptorres', '$2y$10$7e6sTbHASYiS4bffOZP77Ot7Ykh2N.HptZBVAwJr7PKWzq0hwZ8bS', 2);

-- Más clientes de prueba (misma clave "cliente2026").
INSERT INTO usuario (nombre, apellido, dni, telefono, email, nombre_usuario, contrasena_encriptada, id_rol) VALUES
('Romina', 'Acosta', '34222111', '2926 41-1010', 'romina.acosta@example.com', 'racosta', '$2y$10$7e6sTbHASYiS4bffOZP77Ot7Ykh2N.HptZBVAwJr7PKWzq0hwZ8bS', 2),
('Nicolás', 'Benítez', '37888777', '291 455-1011', 'nicolas.benitez@example.com', 'nbenitez', '$2y$10$7e6sTbHASYiS4bffOZP77Ot7Ykh2N.HptZBVAwJr7PKWzq0hwZ8bS', 2),
('Florencia', 'Herrera', '41333222', '11 5555-1012', NULL, 'fherrera', '$2y$10$7e6sTbHASYiS4bffOZP77Ot7Ykh2N.HptZBVAwJr7PKWzq0hwZ8bS', 2),
('Tomás', 'Gutiérrez', '32444555', NULL, 'tomas.gutierrez@example.com', 'tgutierrez', '$2y$10$7e6sTbHASYiS4bffOZP77Ot7Ykh2N.HptZBVAwJr7PKWzq0hwZ8bS', 2);

INSERT INTO cabana (nombre_identificador, capacidad_maxima, descripcion_equipamiento, precio_por_noche) VALUES
('Cabaña 1', 2, 'Casa alpina chica para 2 personas. Dormitorio con cama matrimonial en planta alta, cocina comedor con heladera frigobar, TV, wifi, vajilla completa, baño con ducha de agua fría y caliente, aire acondicionado y fogón. A 4 cuadras del mar.', 38000),
('Cabaña 2', 2, 'Cabaña para hasta 2 personas con cama matrimonial, TV con Star+ y Disney+, cocina comedor con vajilla completa, heladera con freezer, aire acondicionado, baño con agua fría y caliente y fogón independiente. A 4 cuadras del mar.', 38000),
('La Delfina', 4, 'Casa para 4 personas con dos habitaciones: una con cama matrimonial y otra con 2 camas simples. Comedor con vajilla completa, TV por cable, heladera con freezer, futón, aire acondicionado, cochera techada, fogón, amplio patio con árboles y pileta exclusiva. En el predio compartido.', 55000),
('Cabaña 4', 6, 'Cabaña para hasta 6 personas, a 5 cuadras del mar, en el predio compartido. Cocina comedor amplio con TV, vajilla completa, heladera con freezer, 2 habitaciones (una con cama matrimonial y otra con cama simple y cucheta), aire acondicionado portátil, wifi, garaje cerrado con fogón y baño con mampara con agua fría y caliente.', 70000),
('Cabaña 5', 3, 'Cabaña monoambiente para hasta 3 personas con cama matrimonial y cama simple. Cocina sin horno, vajilla completa, heladera con freezer, baño con agua fría y caliente, wifi, aire acondicionado, TV y chulengo con parrilla. A 5 cuadras del mar, en el predio compartido.', 48000),
('Cabaña 6', 4, 'Cabaña alpina para 4 personas, a 5 cuadras del mar, en el predio compartido. Cocina con horno, baño con agua fría y caliente, heladera con freezer, sillón en planta baja, TV, aire acondicionado, wifi y vajilla completa. Planta alta con cama matrimonial y 2 camas simples.', 55000);

-- Reservas de prueba. Las fechas son relativas a HOY (CURDATE()) para que siempre haya
-- reservas pasadas, en curso y futuras. precio_por_noche y monto_total quedan guardados en la reserva
-- (la primera se hizo cuando la Cabaña 1 salía $ 35.000, por eso no coincide con el precio actual).
INSERT INTO reserva (fecha_ingreso, fecha_egreso, estado, precio_por_noche, monto_total, id_usuario, id_cabana) VALUES
(DATE_ADD(CURDATE(), INTERVAL -95 DAY), DATE_ADD(CURDATE(), INTERVAL -88 DAY), 'Finalizada', 35000, 245000, 2, 1),
(DATE_ADD(CURDATE(), INTERVAL -80 DAY), DATE_ADD(CURDATE(), INTERVAL -73 DAY), 'Finalizada', 52000, 364000, 3, 3),
(DATE_ADD(CURDATE(), INTERVAL -70 DAY), DATE_ADD(CURDATE(), INTERVAL -66 DAY), 'Finalizada', 70000, 280000, 4, 4),
(DATE_ADD(CURDATE(), INTERVAL -50 DAY), DATE_ADD(CURDATE(), INTERVAL -45 DAY), 'Finalizada', 38000, 190000, 5, 2),
(DATE_ADD(CURDATE(), INTERVAL -40 DAY), DATE_ADD(CURDATE(), INTERVAL -36 DAY), 'Finalizada', 48000, 192000, 6, 5),
(DATE_ADD(CURDATE(), INTERVAL -33 DAY), DATE_ADD(CURDATE(), INTERVAL -28 DAY), 'Finalizada', 55000, 275000, 7, 6),
(DATE_ADD(CURDATE(), INTERVAL -25 DAY), DATE_ADD(CURDATE(), INTERVAL -20 DAY), 'Finalizada', 38000, 190000, 8, 1),
(DATE_ADD(CURDATE(), INTERVAL -18 DAY), DATE_ADD(CURDATE(), INTERVAL -14 DAY), 'Finalizada', 55000, 220000, 9, 3),
(DATE_ADD(CURDATE(), INTERVAL -12 DAY), DATE_ADD(CURDATE(), INTERVAL -9 DAY), 'Finalizada', 70000, 210000, 2, 4),
(DATE_ADD(CURDATE(), INTERVAL -6 DAY), DATE_ADD(CURDATE(), INTERVAL -3 DAY), 'Confirmada', 38000, 114000, 10, 2),
(DATE_ADD(CURDATE(), INTERVAL -7 DAY), DATE_ADD(CURDATE(), INTERVAL -4 DAY), 'Confirmada', 48000, 144000, 11, 5),
(DATE_ADD(CURDATE(), INTERVAL -2 DAY), DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'Confirmada', 55000, 275000, 3, 6),
(DATE_ADD(CURDATE(), INTERVAL -1 DAY), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'Confirmada', 55000, 165000, 4, 3),
(DATE_ADD(CURDATE(), INTERVAL 4 DAY), DATE_ADD(CURDATE(), INTERVAL 9 DAY), 'Confirmada', 38000, 190000, 5, 1),
(DATE_ADD(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 12 DAY), 'Confirmada', 70000, 350000, 6, 4),
(DATE_ADD(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Pendiente', 38000, 152000, 7, 2),
(DATE_ADD(CURDATE(), INTERVAL 15 DAY), DATE_ADD(CURDATE(), INTERVAL 20 DAY), 'Confirmada', 48000, 240000, 8, 5),
(DATE_ADD(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 37 DAY), 'Confirmada', 55000, 385000, 9, 6),
(DATE_ADD(CURDATE(), INTERVAL 45 DAY), DATE_ADD(CURDATE(), INTERVAL 52 DAY), 'Pendiente', 55000, 385000, 10, 3),
(DATE_ADD(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 6 DAY), 'Cancelada', 70000, 210000, 11, 4),
(DATE_ADD(CURDATE(), INTERVAL -30 DAY), DATE_ADD(CURDATE(), INTERVAL -27 DAY), 'Cancelada', 38000, 114000, 7, 1),
(DATE_ADD(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 24 DAY), 'Cancelada', 55000, 220000, 5, 6);

-- Reservas adicionales (ids 23 en adelante): más historia para que los reportes tengan qué mostrar.
INSERT INTO reserva (fecha_ingreso, fecha_egreso, estado, precio_por_noche, monto_total, id_usuario, id_cabana) VALUES
(DATE_ADD(CURDATE(), INTERVAL -160 DAY), DATE_ADD(CURDATE(), INTERVAL -153 DAY), 'Finalizada', 33000, 231000, 12, 1),
(DATE_ADD(CURDATE(), INTERVAL -150 DAY), DATE_ADD(CURDATE(), INTERVAL -146 DAY), 'Finalizada', 35000, 140000, 13, 2),
(DATE_ADD(CURDATE(), INTERVAL -140 DAY), DATE_ADD(CURDATE(), INTERVAL -133 DAY), 'Finalizada', 50000, 350000, 14, 3),
(DATE_ADD(CURDATE(), INTERVAL -130 DAY), DATE_ADD(CURDATE(), INTERVAL -125 DAY), 'Finalizada', 65000, 325000, 15, 4),
(DATE_ADD(CURDATE(), INTERVAL -120 DAY), DATE_ADD(CURDATE(), INTERVAL -116 DAY), 'Finalizada', 45000, 180000, 12, 5),
(DATE_ADD(CURDATE(), INTERVAL -110 DAY), DATE_ADD(CURDATE(), INTERVAL -105 DAY), 'Finalizada', 52000, 260000, 13, 6),
(DATE_ADD(CURDATE(), INTERVAL -100 DAY), DATE_ADD(CURDATE(), INTERVAL -94 DAY), 'Finalizada', 36000, 216000, 14, 2),
(DATE_ADD(CURDATE(), INTERVAL -90 DAY), DATE_ADD(CURDATE(), INTERVAL -84 DAY), 'Finalizada', 45000, 270000, 15, 5),
(DATE_ADD(CURDATE(), INTERVAL -85 DAY), DATE_ADD(CURDATE(), INTERVAL -78 DAY), 'Finalizada', 52000, 364000, 2, 6),
(DATE_ADD(CURDATE(), INTERVAL -75 DAY), DATE_ADD(CURDATE(), INTERVAL -71 DAY), 'Finalizada', 35000, 140000, 6, 1),
(DATE_ADD(CURDATE(), INTERVAL -60 DAY), DATE_ADD(CURDATE(), INTERVAL -55 DAY), 'Finalizada', 52000, 260000, 8, 3),
(DATE_ADD(CURDATE(), INTERVAL -58 DAY), DATE_ADD(CURDATE(), INTERVAL -53 DAY), 'Finalizada', 70000, 350000, 9, 4),
(DATE_ADD(CURDATE(), INTERVAL -22 DAY), DATE_ADD(CURDATE(), INTERVAL -19 DAY), 'Finalizada', 55000, 165000, 4, 6),
(DATE_ADD(CURDATE(), INTERVAL -30 DAY), DATE_ADD(CURDATE(), INTERVAL -26 DAY), 'Finalizada', 48000, 192000, 10, 5),
(DATE_ADD(CURDATE(), INTERVAL -30 DAY), DATE_ADD(CURDATE(), INTERVAL -24 DAY), 'Finalizada', 38000, 228000, 15, 2),
(DATE_ADD(CURDATE(), INTERVAL 12 DAY), DATE_ADD(CURDATE(), INTERVAL 16 DAY), 'Pendiente', 38000, 152000, 12, 1),
(DATE_ADD(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 25 DAY), 'Confirmada', 38000, 190000, 13, 2),
(DATE_ADD(CURDATE(), INTERVAL 8 DAY), DATE_ADD(CURDATE(), INTERVAL 12 DAY), 'Confirmada', 55000, 220000, 14, 3),
(DATE_ADD(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 27 DAY), 'Confirmada', 70000, 490000, 15, 4),
(DATE_ADD(CURDATE(), INTERVAL 25 DAY), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Pendiente', 48000, 240000, 12, 5),
(DATE_ADD(CURDATE(), INTERVAL 40 DAY), DATE_ADD(CURDATE(), INTERVAL 47 DAY), 'Confirmada', 38000, 266000, 6, 1),
(DATE_ADD(CURDATE(), INTERVAL 60 DAY), DATE_ADD(CURDATE(), INTERVAL 66 DAY), 'Confirmada', 55000, 330000, 7, 6),
(DATE_ADD(CURDATE(), INTERVAL 55 DAY), DATE_ADD(CURDATE(), INTERVAL 60 DAY), 'Pendiente', 38000, 190000, 8, 2),
(DATE_ADD(CURDATE(), INTERVAL -40 DAY), DATE_ADD(CURDATE(), INTERVAL -36 DAY), 'Cancelada', 55000, 220000, 12, 3),
(DATE_ADD(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 35 DAY), 'Cancelada', 70000, 350000, 13, 4);

INSERT INTO pago (monto, fecha_hora_pago, metodo_pago, id_reserva) VALUES
(120000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -100 DAY), '10:00:00'), 'Transferencia', 1),
(125000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -89 DAY), '09:00:00'), 'Efectivo', 1),
(180000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -86 DAY), '11:00:00'), 'Transferencia', 2),
(184000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -74 DAY), '10:00:00'), 'Tarjeta', 2),
(100000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -78 DAY), '15:00:00'), 'Transferencia', 3),
(180000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -67 DAY), '09:00:00'), 'Efectivo', 3),
(90000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -58 DAY), '12:00:00'), 'Efectivo', 4),
(100000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -46 DAY), '10:00:00'), 'Efectivo', 4),
(192000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -44 DAY), '16:00:00'), 'Tarjeta', 5),
(130000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -40 DAY), '11:00:00'), 'Transferencia', 6),
(145000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -29 DAY), '10:00:00'), 'Transferencia', 6),
(90000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -30 DAY), '14:00:00'), 'Efectivo', 7),
(100000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -21 DAY), '09:00:00'), 'Efectivo', 7),
(100000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -25 DAY), '10:00:00'), 'Transferencia', 8),
(120000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -15 DAY), '10:00:00'), 'Tarjeta', 8),
(100000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -20 DAY), '13:00:00'), 'Transferencia', 9),
(110000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -10 DAY), '09:00:00'), 'Efectivo', 9),
(50000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -12 DAY), '10:00:00'), 'Transferencia', 10),
(64000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -7 DAY), '11:00:00'), 'Efectivo', 10),
(50000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -14 DAY), '10:00:00'), 'Efectivo', 11),
(100000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -9 DAY), '10:00:00'), 'Transferencia', 12),
(80000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -8 DAY), '10:00:00'), 'Tarjeta', 13),
(85000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '15:00:00'), 'Efectivo', 13),
(60000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '10:00:00'), 'Transferencia', 14),
(120000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -2 DAY), '12:00:00'), 'Tarjeta', 15),
(80000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '09:00:00'), 'Efectivo', 17),
(100000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 0 DAY), '09:00:00'), 'Transferencia', 18),
(50000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '10:00:00'), 'Transferencia', 22);

-- Pagos de las reservas adicionales (las finalizadas están saldadas; las confirmadas tienen seña o están saldadas).
INSERT INTO pago (monto, fecha_hora_pago, metodo_pago, id_reserva) VALUES
(100000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -170 DAY), '10:00:00'), 'Transferencia', 23),
(131000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -154 DAY), '09:30:00'), 'Efectivo', 23),
(140000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -155 DAY), '11:00:00'), 'Tarjeta', 24),
(150000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -150 DAY), '10:00:00'), 'Transferencia', 25),
(200000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -134 DAY), '10:00:00'), 'Transferencia', 25),
(130000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -140 DAY), '12:00:00'), 'Efectivo', 26),
(195000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -126 DAY), '09:00:00'), 'Transferencia', 26),
(80000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -125 DAY), '15:00:00'), 'Efectivo', 27),
(100000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -117 DAY), '10:00:00'), 'Efectivo', 27),
(260000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -112 DAY), '16:00:00'), 'Tarjeta', 28),
(100000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -108 DAY), '10:00:00'), 'Transferencia', 29),
(116000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -95 DAY), '11:00:00'), 'Efectivo', 29),
(120000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -98 DAY), '10:00:00'), 'Transferencia', 30),
(150000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -85 DAY), '09:00:00'), 'Efectivo', 30),
(150000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -92 DAY), '10:00:00'), 'Tarjeta', 31),
(214000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -79 DAY), '10:00:00'), 'Transferencia', 31),
(140000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -76 DAY), '13:00:00'), 'Efectivo', 32),
(100000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -66 DAY), '10:00:00'), 'Transferencia', 33),
(160000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -56 DAY), '12:00:00'), 'Efectivo', 33),
(150000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -63 DAY), '10:00:00'), 'Tarjeta', 34),
(200000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -54 DAY), '09:00:00'), 'Transferencia', 34),
(165000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -23 DAY), '10:00:00'), 'Transferencia', 35),
(90000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -33 DAY), '10:00:00'), 'Efectivo', 36),
(102000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -27 DAY), '10:00:00'), 'Transferencia', 36),
(100000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -35 DAY), '10:00:00'), 'Transferencia', 37),
(128000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -25 DAY), '14:00:00'), 'Tarjeta', 37),
(60000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '10:00:00'), 'Transferencia', 39),
(220000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -2 DAY), '11:00:00'), 'Tarjeta', 40),
(150000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 0 DAY), '08:30:00'), 'Efectivo', 41),
(100000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '10:00:00'), 'Efectivo', 43),
(110000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -6 DAY), '10:00:00'), 'Transferencia', 44),
(50000, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -45 DAY), '10:00:00'), 'Efectivo', 46);

-- Un comprobante por cada pago (misma convención de ruta que usa api/pagos.php).
INSERT INTO comprobante (ruta_archivo_digital, fecha_carga, id_pago)
SELECT CONCAT('comprobantes/', DATE_FORMAT(fecha_hora_pago, '%Y/%m'), '/comprobante_', LPAD(id_pago, 4, '0'), '.pdf'),
       DATE(fecha_hora_pago), id_pago
FROM pago;
