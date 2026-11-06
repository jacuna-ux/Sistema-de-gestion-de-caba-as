<?php

require_once __DIR__ . '/comun.php';
exigir_encargada();

const CAMPOS_CLIENTE = 'id_usuario AS id_cliente, nombre, apellido, dni, telefono, email';
$id = id_param();

switch (metodo()) {
    case 'GET':
        if ($id) {
            $c = consulta($pdo, 'SELECT ' . CAMPOS_CLIENTE . ' FROM usuario WHERE id_usuario = ? AND id_rol = ?', [$id, ROL_CLIENTE])->fetch();
            $c ? responder($c) : fallar('El cliente no existe.', 404);
        }
        if (!empty($_GET['dni'])) {
            $c = consulta($pdo, 'SELECT ' . CAMPOS_CLIENTE . ' FROM usuario WHERE dni = ? AND id_rol = ?', [$_GET['dni'], ROL_CLIENTE])->fetch();
            $c ? responder($c) : fallar('No hay un cliente con ese DNI.', 404);
        }
        responder(consulta($pdo, 'SELECT ' . CAMPOS_CLIENTE . ' FROM usuario WHERE id_rol = ? ORDER BY apellido, nombre', [ROL_CLIENTE])->fetchAll());

    case 'POST':
        // crear_cliente() devuelve la contraseña generada (si la encargada no escribió una):
        // es la única vez que existe en texto plano, así que se muestra en la pantalla.
        responder(crear_cliente($pdo, entrada()) + ['mensaje' => 'Cliente registrado.'], 201);

    case 'PUT':
        if (!$id) fallar('Falta el id del cliente.');
        $d = entrada();
        if (!consulta($pdo, 'SELECT 1 FROM usuario WHERE id_usuario = ? AND id_rol = ?', [$id, ROL_CLIENTE])->fetch()) {
            fallar('El cliente no existe.', 404);
        }
        // Restablecer contraseña: genera una temporal nueva y la devuelve para mostrarla una vez.
        if (($d['accion'] ?? null) === 'restablecer_clave') {
            responder(['contrasena_generada' => cambiar_clave($pdo, $id), 'mensaje' => 'Contraseña restablecida.']);
        }
        validar_cliente($d);
        try {
            // La unicidad del DNI la garantiza la base (UNIQUE), no un SELECT previo.
            consulta($pdo, 'UPDATE usuario SET nombre = ?, apellido = ?, dni = ?, telefono = ?, email = ? WHERE id_usuario = ?',
                [$d['nombre'], $d['apellido'], $d['dni'], $d['telefono'] ?? null, $d['email'] ?? null, $id]);
        } catch (PDOException $e) {
            fallar_si_duplicado($e, MENSAJES_DUPLICADO_USUARIO);
        }
        if (!empty($d['contrasena'])) {
            cambiar_clave($pdo, $id, $d['contrasena']);
        }
        responder(['mensaje' => 'Cliente modificado.']);

    case 'DELETE':
        if (!$id) fallar('Falta el id del cliente.');
        try {
            $st = consulta($pdo, 'DELETE FROM usuario WHERE id_usuario = ? AND id_rol = ?', [$id, ROL_CLIENTE]);
        } catch (PDOException $e) {
            // La clave foránea de reserva impide borrar a un cliente que tiene reservas.
            if (es_clave_foranea($e)) {
                fallar('No se puede eliminar: el cliente tiene reservas registradas.', 409);
            }
            throw $e;
        }
        $st->rowCount() ? responder(['mensaje' => 'Cliente eliminado.']) : fallar('El cliente no existe.', 404);

    default:
        metodo_no_permitido();
}
