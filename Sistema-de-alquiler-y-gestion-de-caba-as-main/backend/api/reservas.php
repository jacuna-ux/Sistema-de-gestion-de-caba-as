<?php

require_once __DIR__ . '/comun.php';
$usuarioActual = exigir_login();
$esEncargada = es_encargada($usuarioActual);

// El precio y el total salen de la propia reserva (se guardan al reservar), no de la cabaña:
// si la encargada cambia el precio de una cabaña, las reservas ya hechas no se tocan.
const SELECT_RESERVA = 'SELECT r.id_reserva, r.fecha_ingreso, r.fecha_egreso, r.estado,
        r.precio_por_noche, r.monto_total AS total,
        COALESCE((SELECT SUM(p.monto) FROM pago p WHERE p.id_reserva = r.id_reserva), 0) AS pagado,
        r.id_usuario AS id_cliente, u.nombre AS cliente_nombre, u.apellido AS cliente_apellido, u.dni AS cliente_dni,
        r.id_cabana, c.nombre_identificador AS cabana
    FROM reserva r
    JOIN usuario u ON u.id_usuario = r.id_usuario
    JOIN cabana c ON c.id_cabana = r.id_cabana';

const ESTADOS = ['Pendiente', 'Confirmada', 'Finalizada', 'Cancelada'];

// Agrega lo calculado: noches, saldo y qué acciones se pueden hacer hoy sobre la reserva
// (así el frontend no tiene que repetir las reglas).
function completar($r)
{
    $r['total'] = (int)$r['total'];
    $r['pagado'] = (int)$r['pagado'];
    $r['precio_por_noche'] = (int)$r['precio_por_noche'];
    $r['noches'] = noches($r['fecha_ingreso'], $r['fecha_egreso']);
    $vigente = in_array($r['estado'], ['Pendiente', 'Confirmada'], true);
    // En una reserva cancelada no se debe nada.
    $r['saldo'] = $r['estado'] === 'Cancelada' ? 0 : $r['total'] - $r['pagado'];
    $r['puede_cobrar'] = $vigente && $r['saldo'] > 0;
    $r['puede_finalizar'] = $r['estado'] === 'Confirmada' && $r['saldo'] === 0 && $r['fecha_egreso'] <= hoy();
    return $r;
}

function leer_reserva($pdo, $id)
{
    return completar(consulta($pdo, SELECT_RESERVA . ' WHERE r.id_reserva = ?', [$id])->fetch());
}

// $actual = la reserva tal como está guardada (solo al modificar). Una reserva nueva no puede
// empezar antes de hoy. Al modificar, si la fecha de ingreso no cambia se acepta aunque ya haya
// pasado (la estadía está en curso), pero el egreso nunca puede quedar antes de hoy.
function validar_fechas($ingreso, $egreso, $actual = null)
{
    if (!es_fecha($ingreso) || !es_fecha($egreso)) {
        fallar('Las fechas deben tener el formato AAAA-MM-DD.');
    }
    if ($egreso <= $ingreso) {
        fallar('La fecha de egreso debe ser posterior a la de ingreso.');
    }
    $ingresoCambia = !$actual || $ingreso !== $actual['fecha_ingreso'];
    if ($ingresoCambia && $ingreso < hoy()) {
        fallar('La fecha de ingreso no puede ser anterior a hoy (' . fecha_ar(hoy()) . ').');
    }
    if ($egreso < hoy()) {
        fallar('La fecha de egreso no puede ser anterior a hoy (' . fecha_ar(hoy()) . ').');
    }
}

function buscar_superposicion($pdo, $id_cabana, $ingreso, $egreso, $excluir = 0)
{
    return consulta($pdo, "SELECT r.fecha_ingreso, r.fecha_egreso, c.nombre_identificador
        FROM reserva r JOIN cabana c ON c.id_cabana = r.id_cabana
        WHERE r.id_cabana = ? AND r.estado IN ('Pendiente', 'Confirmada')
          AND r.fecha_ingreso < ? AND r.fecha_egreso > ? AND r.id_reserva <> ?
        ORDER BY r.fecha_ingreso LIMIT 1", [$id_cabana, $egreso, $ingreso, $excluir])->fetch();
}

function avisar_superposicion($s)
{
    fallar($s['nombre_identificador'] . ' está reservada del ' . fecha_ar($s['fecha_ingreso']) .
        ' al ' . fecha_ar($s['fecha_egreso']) . '. Elegí otras fechas.', 409);
}

// Bloquea la fila de la cabaña hasta que termine la transacción. Es lo que evita que dos pedidos
// simultáneos reserven las mismas fechas: el segundo espera, y cuando le toca ya ve la reserva del primero.
function bloquear_cabana($pdo, $id_cabana)
{
    $c = consulta($pdo, 'SELECT id_cabana, precio_por_noche FROM cabana WHERE id_cabana = ?' . para_actualizar($pdo), [$id_cabana])->fetch();
    if (!$c) {
        fallar('La cabaña no existe.', 404);
    }
    return $c;
}

function total_pagado($pdo, $id_reserva)
{
    return (int)consulta($pdo, 'SELECT COALESCE(SUM(monto), 0) FROM pago WHERE id_reserva = ?', [$id_reserva])->fetchColumn();
}

$id = id_param();
switch (metodo()) {
    case 'GET':
        if ($id) {
            $r = consulta($pdo, SELECT_RESERVA . ' WHERE r.id_reserva = ?', [$id])->fetch();
            if (!$r || (!$esEncargada && (int)$r['id_cliente'] !== (int)$usuarioActual['id_usuario'])) {
                fallar('La reserva no existe.', 404);
            }
            responder(completar($r));
        }
        if (!$esEncargada) {
            $_GET['id_cliente'] = $usuarioActual['id_usuario'];
        }
        $where = [];
        $p = [];
        if (!empty($_GET['estado'])) {
            if (!in_array($_GET['estado'], ESTADOS, true)) {
                fallar('El estado debe ser: ' . implode(', ', ESTADOS) . '.');
            }
            $where[] = 'r.estado = ?';
            $p[] = $_GET['estado'];
        }
        foreach (['id_cabana' => 'r.id_cabana = ?', 'id_cliente' => 'r.id_usuario = ?'] as $k => $cond) {
            if (!empty($_GET[$k])) {
                $n = entero_positivo($_GET[$k]);
                if ($n === null) {
                    fallar("El filtro $k debe ser un número entero.");
                }
                $where[] = $cond;
                $p[] = $n;
            }
        }
        foreach (['desde', 'hasta'] as $f) {
            if (!empty($_GET[$f]) && !es_fecha($_GET[$f])) {
                fallar("La fecha \"$f\" debe tener el formato AAAA-MM-DD.");
            }
        }
        if (!empty($_GET['desde'])) { $where[] = 'r.fecha_egreso > ?'; $p[] = $_GET['desde']; }
        if (!empty($_GET['hasta'])) { $where[] = 'r.fecha_ingreso <= ?'; $p[] = $_GET['hasta']; }
        $sql = SELECT_RESERVA . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY r.fecha_ingreso, r.id_reserva';
        responder(array_map('completar', consulta($pdo, $sql, $p)->fetchAll()));

    case 'POST':
        $d = entrada();
        if (!$esEncargada) {
            $d['id_cliente'] = $usuarioActual['id_usuario'];
        }
        exigir_campos($d, ['id_cliente', 'id_cabana', 'fecha_ingreso', 'fecha_egreso']);
        $idCliente = entero_positivo($d['id_cliente']);
        $idCabana = entero_positivo($d['id_cabana']);
        if (!$idCliente || !$idCabana) {
            fallar('El cliente y la cabaña deben ser números válidos.');
        }
        validar_fechas($d['fecha_ingreso'], $d['fecha_egreso']);
        if (!consulta($pdo, 'SELECT 1 FROM usuario WHERE id_usuario = ? AND id_rol = ?', [$idCliente, ROL_CLIENTE])->fetch()) {
            fallar('El cliente no existe.', 404);
        }
        $nueva = transaccion($pdo, function () use ($pdo, $d, $idCliente, $idCabana) {
            $cabana = bloquear_cabana($pdo, $idCabana);
            if ($s = buscar_superposicion($pdo, $idCabana, $d['fecha_ingreso'], $d['fecha_egreso'])) {
                avisar_superposicion($s);
            }
            // Se congela el precio de hoy en la reserva.
            $precio = (int)$cabana['precio_por_noche'];
            $total = noches($d['fecha_ingreso'], $d['fecha_egreso']) * $precio;
            consulta($pdo, "INSERT INTO reserva (fecha_ingreso, fecha_egreso, estado, precio_por_noche, monto_total, id_usuario, id_cabana)
                            VALUES (?, ?, 'Pendiente', ?, ?, ?, ?)",
                [$d['fecha_ingreso'], $d['fecha_egreso'], $precio, $total, $idCliente, $idCabana]);
            return (int)$pdo->lastInsertId();
        });
        responder(leer_reserva($pdo, $nueva), 201);

    case 'PUT':
        if (!$id) fallar('Falta el id de la reserva.');
        $d = entrada();
        $accion = $d['accion'] ?? null;

        // Cancelar: la encargada cualquiera; el cliente solo las suyas.
        if ($accion === 'cancelar') {
            $actual = consulta($pdo, 'SELECT id_usuario, estado FROM reserva WHERE id_reserva = ?', [$id])->fetch();
            if (!$actual || (!$esEncargada && (int)$actual['id_usuario'] !== (int)$usuarioActual['id_usuario'])) {
                fallar('La reserva no existe.', 404);
            }
            // El estado va en el WHERE: si otro pedido la cambió mientras tanto, no se pisa.
            $st = consulta($pdo, "UPDATE reserva SET estado = 'Cancelada' WHERE id_reserva = ? AND estado IN ('Pendiente', 'Confirmada')", [$id]);
            if (!$st->rowCount()) {
                fallar('No se puede cancelar una reserva ' . $actual['estado'] . '.', 409);
            }
            responder(['id_reserva' => $id, 'estado' => 'Cancelada']);
        }

        // De acá en adelante solo la encargada (finalizar y cambiar fechas).
        exigir_encargada();
        if (!consulta($pdo, 'SELECT 1 FROM reserva WHERE id_reserva = ?', [$id])->fetch()) {
            fallar('La reserva no existe.', 404);
        }

        if ($accion === 'finalizar') {
            transaccion($pdo, function () use ($pdo, $id) {
                $r = consulta($pdo, 'SELECT estado, fecha_egreso, monto_total FROM reserva WHERE id_reserva = ?' . para_actualizar($pdo), [$id])->fetch();
                if ($r['estado'] !== 'Confirmada') {
                    fallar('Solo se puede finalizar una reserva Confirmada (esta está ' . $r['estado'] . ').', 409);
                }
                $saldo = (int)$r['monto_total'] - total_pagado($pdo, $id);
                if ($saldo > 0) {
                    fallar('No se puede finalizar: la reserva tiene un saldo pendiente de ' . pesos($saldo) . '. Tiene que estar saldada.', 409);
                }
                if ($r['fecha_egreso'] > hoy()) {
                    fallar('No se puede finalizar antes de la fecha de egreso (' . fecha_ar($r['fecha_egreso']) . ').', 409);
                }
                consulta($pdo, "UPDATE reserva SET estado = 'Finalizada' WHERE id_reserva = ?", [$id]);
            });
            responder(['id_reserva' => $id, 'estado' => 'Finalizada']);
        }
        if ($accion !== null) {
            fallar('Acción desconocida: "' . $accion . '".');
        }

        // Cambio de fechas (y, opcionalmente, de cabaña).
        $previa = consulta($pdo, 'SELECT id_cabana FROM reserva WHERE id_reserva = ?', [$id])->fetch();
        $cabanaNueva = isset($d['id_cabana']) ? entero_positivo($d['id_cabana']) : (int)$previa['id_cabana'];
        if (!$cabanaNueva) {
            fallar('La cabaña debe ser un número válido.');
        }
        transaccion($pdo, function () use ($pdo, $id, $d, $cabanaNueva) {
            $cabana = bloquear_cabana($pdo, $cabanaNueva);
            $actual = consulta($pdo, 'SELECT * FROM reserva WHERE id_reserva = ?' . para_actualizar($pdo), [$id])->fetch();
            if (!in_array($actual['estado'], ['Pendiente', 'Confirmada'], true)) {
                fallar('Una reserva ' . $actual['estado'] . ' no se puede modificar.', 409);
            }
            $ingreso = $d['fecha_ingreso'] ?? $actual['fecha_ingreso'];
            $egreso = $d['fecha_egreso'] ?? $actual['fecha_egreso'];
            validar_fechas($ingreso, $egreso, $actual);

            $cambiaCabana = (int)$actual['id_cabana'] !== $cabanaNueva;
            if ($cambiaCabana && $actual['fecha_ingreso'] < hoy()) {
                fallar('No se puede cambiar de cabaña una reserva cuya estadía ya empezó.', 409);
            }
            if ($s = buscar_superposicion($pdo, $cabanaNueva, $ingreso, $egreso, $id)) {
                avisar_superposicion($s);
            }

            // Si se cambian solo las fechas, queda el precio con el que se reservó.
            // Si se cambia de cabaña, corre el precio actual de la nueva.
            $precio = $cambiaCabana ? (int)$cabana['precio_por_noche'] : (int)$actual['precio_por_noche'];
            $total = noches($ingreso, $egreso) * $precio;

            // Lo ya cobrado no puede superar el nuevo total.
            $pagado = total_pagado($pdo, $id);
            if ($pagado > $total) {
                fallar('No se pueden cambiar las fechas así: ya se cobraron ' . pesos($pagado) . ' y el nuevo total sería ' .
                    pesos($total) . '. Elegí fechas cuyo total sea al menos lo ya pagado.', 409);
            }
            consulta($pdo, 'UPDATE reserva SET fecha_ingreso = ?, fecha_egreso = ?, id_cabana = ?, precio_por_noche = ?, monto_total = ? WHERE id_reserva = ?',
                [$ingreso, $egreso, $cabanaNueva, $precio, $total, $id]);
        });
        responder(leer_reserva($pdo, $id));

    default:
        metodo_no_permitido();
}
