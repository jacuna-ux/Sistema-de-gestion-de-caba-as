<?php

require_once __DIR__ . '/comun.php';

switch (metodo()) {
    case 'POST':
        $d = entrada();
        exigir_campos($d, ['nombre_usuario', 'contrasena']);
        $u = consulta($pdo, 'SELECT u.id_usuario, u.nombre, u.apellido, u.nombre_usuario,
                                    u.contrasena_encriptada, u.id_rol, r.nombre_rol
                             FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
                             WHERE u.nombre_usuario = ?', [$d['nombre_usuario']])->fetch();
        // Si el usuario no existe se verifica igual contra un hash de relleno, para que
        // la respuesta tarde lo mismo y no se pueda averiguar qué usuarios existen.
        $hash = $u['contrasena_encriptada'] ?? '$2y$10$1wzoS9RJBjFEcpXdH6Y3XuoPh2tI9HV5PqqRZOPEWvZCYml9Aivc6';
        $ok = password_verify((string)$d['contrasena'], $hash) && $u;
        if (!$ok) {
            fallar('Usuario o contraseña incorrectos.', 401);
        }
        unset($u['contrasena_encriptada']);
        session_regenerate_id(true);
        $_SESSION['usuario'] = $u;
        responder($u);
    case 'GET':
        responder(exigir_login());
    case 'DELETE':
        $_SESSION = [];
        session_destroy();
        responder(['mensaje' => 'Sesión cerrada.']);
    default:
        metodo_no_permitido();
}
