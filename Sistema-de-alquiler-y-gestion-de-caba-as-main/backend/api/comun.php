<?php

header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('America/Argentina/Buenos_Aires');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
session_start();
require_once __DIR__ . '/conexion.php';

function responder($datos, $codigo = 200)
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fallar($mensaje, $codigo = 400)
{
    // Si estábamos a mitad de una transacción, se deshace antes de responder.
    $pdo = $GLOBALS['pdo'] ?? null;
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    responder(['error' => $mensaje], $codigo);
}

set_exception_handler(function ($e) {
    error_log($e); // el detalle queda en el log del servidor; al navegador solo le llega un mensaje genérico
    fallar('Error interno del servidor.', 500);
});

function entrada()
{
    $datos = json_decode(file_get_contents('php://input'), true);
    return is_array($datos) ? $datos : [];
}

function metodo()
{
    return $_SERVER['REQUEST_METHOD'];
}

function exigir_login()
{
    if (empty($_SESSION['usuario'])) {
        fallar('Tenés que iniciar sesión.', 401);
    }
    return $_SESSION['usuario'];
}

function exigir_campos($datos, $campos)
{
    foreach ($campos as $c) {
        if (!isset($datos[$c]) || trim((string)$datos[$c]) === '') {
            fallar("Falta completar el campo $c.");
        }
    }
}

function es_fecha($texto)
{
    $f = DateTime::createFromFormat('Y-m-d', (string)$texto);
    return $f && $f->format('Y-m-d') === $texto;
}

// Fecha de hoy (zona horaria de Argentina, ver date_default_timezone_set arriba).
function hoy()
{
    return date('Y-m-d');
}

// Valida un entero positivo recibido por JSON o por URL. Devuelve null si no lo es.
function entero_positivo($valor)
{
    $n = filter_var($valor, FILTER_VALIDATE_INT);
    return ($n === false || $n < 1) ? null : $n;
}

function id_param()
{
    $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
    return $id === false ? null : $id;
}

function noches($ingreso, $egreso)
{
    return (int)(new DateTime($ingreso))->diff(new DateTime($egreso))->days;
}

function fecha_ar($f)
{
    return (new DateTime($f))->format('d/m/Y');
}

function pesos($n)
{
    return '$ ' . number_format((int)$n, 0, ',', '.');
}

function consulta($pdo, $sql, $params = [])
{
    $st = $pdo->prepare($sql);
    $st->execute($params);
    return $st;
}

function metodo_no_permitido()
{
    fallar('Método no permitido.', 405);
}

// ---------------------------------------------------------------------------
// Transacciones y bloqueos
// ---------------------------------------------------------------------------

// Ejecuta $f dentro de una transacción. Si algo falla (excepción o fallar()), se deshace todo.
function transaccion($pdo, callable $f)
{
    $pdo->beginTransaction();
    try {
        $r = $f();
        $pdo->commit();
        return $r;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

// " FOR UPDATE" en MySQL: bloquea las filas leídas hasta que termine la transacción,
// así dos pedidos simultáneos sobre lo mismo se ejecutan uno después del otro.
// (SQLite, que se usa solo para pruebas locales, no lo soporta ni lo necesita.)
function para_actualizar($pdo)
{
    return $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
}

// ¿El error es una violación de UNIQUE (clave duplicada)?
function es_duplicado($e)
{
    if (!($e instanceof PDOException)) {
        return false;
    }
    return ($e->errorInfo[1] ?? null) == 1062 || stripos($e->getMessage(), 'UNIQUE constraint failed') !== false;
}

// ¿El error es una violación de clave foránea (fila referenciada por otra tabla)?
function es_clave_foranea($e)
{
    if (!($e instanceof PDOException)) {
        return false;
    }
    return in_array($e->errorInfo[1] ?? null, [1451, 1452], true) || stripos($e->getMessage(), 'FOREIGN KEY constraint failed') !== false;
}

// Devuelve solo el nombre de la clave violada, sin el valor duplicado (para no confundir
// un valor como "dni" con el nombre de la columna):
//   MySQL/MariaDB: "Duplicate entry 'x' for key 'usuario.uq_usuario_dni'"  ->  usuario.uq_usuario_dni
//   SQLite:        "UNIQUE constraint failed: usuario.dni"                 ->  usuario.dni
function clave_duplicada($e)
{
    $msg = $e->getMessage();
    if (preg_match("/for key '([^']+)'\s*$/", $msg, $m) || preg_match('/UNIQUE constraint failed: (.+)$/', $msg, $m)) {
        return $m[1];
    }
    return $msg;
}

// Traduce un error de UNIQUE a un mensaje. $mensajes = ['texto que aparece en la clave' => 'mensaje'].
// Si no es un duplicado, vuelve a lanzar el error original.
function fallar_si_duplicado($e, $mensajes)
{
    if (!es_duplicado($e)) {
        throw $e;
    }
    $clave = clave_duplicada($e);
    foreach ($mensajes as $texto => $mensaje) {
        if (stripos($clave, $texto) !== false) {
            fallar($mensaje, 409);
        }
    }
    fallar('Ya existe un registro con esos datos.', 409);
}

// ---------------------------------------------------------------------------
// Roles: se decide siempre por id_rol (constantes de config.php), nunca por el nombre.
// ---------------------------------------------------------------------------

function es_encargada($u = null)
{
    $u = $u ?: ($_SESSION['usuario'] ?? null);
    return $u && (int)$u['id_rol'] === ROL_ENCARGADA;
}

function exigir_encargada()
{
    $u = exigir_login();
    if (!es_encargada($u)) {
        fallar('Solo la encargada puede hacer esto.', 403);
    }
    return $u;
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

function validar_cliente($d)
{
    exigir_campos($d, ['nombre', 'apellido', 'dni']);
    if (!preg_match('/^\d{7,9}$/', (string)$d['dni'])) {
        fallar('El DNI debe tener entre 7 y 9 números, sin puntos.');
    }
    if (!empty($d['email']) && !filter_var($d['email'], FILTER_VALIDATE_EMAIL)) {
        fallar('El email no es válido.');
    }
    if (isset($d['contrasena']) && $d['contrasena'] !== '' && strlen($d['contrasena']) < 6) {
        fallar('La contraseña debe tener al menos 6 caracteres.');
    }
}

const MENSAJES_DUPLICADO_USUARIO = [
    'nombre_usuario' => 'Ese nombre de usuario ya está en uso.',
    'dni' => 'Ya existe una persona registrada con ese DNI.',
];

// Contraseña temporal legible (sin 0/O, 1/l/I) para cuando la encargada no escribe una.
function generar_clave()
{
    $letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $clave = '';
    for ($i = 0; $i < 10; $i++) {
        $clave .= $letras[random_int(0, strlen($letras) - 1)];
    }
    return $clave;
}

// Crea un cliente. Devuelve ['id_cliente', 'nombre_usuario', 'contrasena_generada'].
// 'contrasena_generada' solo viene cuando no se indicó contraseña: es la única vez que
// existe en texto plano (en la BD queda únicamente el hash), así que quien llama debe mostrarla.
function crear_cliente($pdo, $d)
{
    validar_cliente($d);
    $nombreUsuario = trim($d['nombre_usuario'] ?? '') !== '' ? trim($d['nombre_usuario']) : $d['dni'];
    $generada = empty($d['contrasena']);
    $clave = $generada ? generar_clave() : $d['contrasena'];
    try {
        consulta($pdo, 'INSERT INTO usuario (nombre, apellido, dni, telefono, email, nombre_usuario, contrasena_encriptada, id_rol)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [$d['nombre'], $d['apellido'], $d['dni'], $d['telefono'] ?? null, $d['email'] ?? null,
             $nombreUsuario, password_hash($clave, PASSWORD_DEFAULT), ROL_CLIENTE]);
    } catch (PDOException $e) {
        // La unicidad de DNI y de nombre de usuario la garantiza la base (UNIQUE), no un SELECT previo.
        // Si no se eligió usuario, el usuario es el DNI: un choque en cualquiera de los dos es "DNI repetido".
        $mensajes = trim($d['nombre_usuario'] ?? '') === ''
            ? ['nombre_usuario' => MENSAJES_DUPLICADO_USUARIO['dni'], 'dni' => MENSAJES_DUPLICADO_USUARIO['dni']]
            : MENSAJES_DUPLICADO_USUARIO;
        fallar_si_duplicado($e, $mensajes);
    }
    return ['id_cliente' => (int)$pdo->lastInsertId(), 'nombre_usuario' => $nombreUsuario,
            'contrasena_generada' => $generada ? $clave : null];
}

// Cambia la contraseña de un cliente. Si no se indica una, genera una temporal y la devuelve
// (única vez que existe en texto plano; en la BD queda solo el hash).
function cambiar_clave($pdo, $id, $nueva = null)
{
    $generada = $nueva === null || $nueva === '';
    $clave = $generada ? generar_clave() : $nueva;
    consulta($pdo, 'UPDATE usuario SET contrasena_encriptada = ? WHERE id_usuario = ? AND id_rol = ?',
        [password_hash($clave, PASSWORD_DEFAULT), $id, ROL_CLIENTE]);
    return $generada ? $clave : null;
}
