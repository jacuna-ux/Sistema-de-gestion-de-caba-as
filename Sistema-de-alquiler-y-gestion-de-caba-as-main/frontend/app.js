const ROL_ENCARGADA = 1;

const CLASE_ESTADO = {
  Pendiente: 'insignia_amarilla',
  Confirmada: 'insignia_verde',
  Finalizada: 'insignia_gris',
  Cancelada: 'insignia_roja'
};

let usuario = null;
let esEncargada = false;
let cabanas = [];
let cabanaModal = null;
let reservasCache = [];
let clientesCache = [];
let accionModalForm = null;
let temporizadorAviso = null;

function el(id) {
  return document.getElementById(id);
}

function esc(texto) {
  if (texto === null || texto === undefined) {
    texto = '';
  }
  texto = String(texto);
  texto = texto.replace(/&/g, '&amp;');
  texto = texto.replace(/</g, '&lt;');
  texto = texto.replace(/>/g, '&gt;');
  texto = texto.replace(/"/g, '&quot;');
  texto = texto.replace(/'/g, '&#39;');
  return texto;
}

function pesos(n) {
  return '$ ' + Number(n).toLocaleString('es-AR');
}

function pad(n, largo) {
  let texto = String(n);
  while (texto.length < largo) {
    texto = '0' + texto;
  }
  return texto;
}

function fechaAR(f) {
  if (!f) {
    return '';
  }
  let partes = f.slice(0, 10).split('-');
  return partes[2] + '/' + partes[1] + '/' + partes[0];
}

function aIso(fecha) {
  return fecha.getFullYear() + '-' + pad(fecha.getMonth() + 1, 2) + '-' + pad(fecha.getDate(), 2);
}

function hoyIso() {
  return aIso(new Date());
}

function sumarDias(iso, dias) {
  let fecha = new Date(iso + 'T00:00:00');
  fecha.setDate(fecha.getDate() + dias);
  return aIso(fecha);
}

function cantNoches(ingreso, egreso) {
  let diferencia = new Date(egreso + 'T00:00:00') - new Date(ingreso + 'T00:00:00');
  return Math.round(diferencia / 86400000);
}

function buscar(lista, campo, valor) {
  for (let i = 0; i < lista.length; i++) {
    if (lista[i][campo] === valor) {
      return lista[i];
    }
  }
  return null;
}

function sumar(lista, campo) {
  let total = 0;
  for (let i = 0; i < lista.length; i++) {
    total = total + lista[i][campo];
  }
  return total;
}

function insignia(estado) {
  return '<span class="insignia ' + (CLASE_ESTADO[estado] || '') + '">' + esc(estado) + '</span>';
}

function filaVacia(columnas, texto) {
  return '<tr><td colspan="' + columnas + '" class="celda_vacia">' + esc(texto) + '</td></tr>';
}

function mostrarError(id, mensaje) {
  el(id).textContent = mensaje;
  el(id).classList.remove('oculto');
}

function limpiarError(id) {
  el(id).classList.add('oculto');
}

function avisar(texto) {
  el('aviso').textContent = texto;
  el('aviso').classList.remove('oculto');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(function () {
    el('aviso').classList.add('oculto');
  }, 4000);
}

function manejarError(e) {
  if (/iniciar sesión/i.test(e.message)) {
    pantallaDeIngreso();
    return;
  }
  avisar(e.message);
}

function errorEn(id, e) {
  if (/iniciar sesión/i.test(e.message)) {
    pantallaDeIngreso();
    return;
  }
  mostrarError(id, e.message);
}

function botonVer(id, ingreso, egreso, texto) {
  return '<button class="boton_ver" onclick="abrirModal(' + id + ', \'' + ingreso + '\', \'' + egreso + '\')">' + texto + '</button>';
}

function resumen(texto) {
  texto = texto || '';
  if (texto.length > 110) {
    return texto.slice(0, 110).trim() + '…';
  }
  return texto;
}

function tarjetaCabana(c, extra) {
  return '<div class="tarjeta_cabana">' +
    '<div class="imagen_ejemplo">Foto de la cabaña</div>' +
    '<div class="cuerpo_tarjeta">' +
    '<h3 class="titulo_cabana">' + esc(c.nombre_identificador) + '</h3>' +
    '<p class="datos_cabana">Hasta ' + esc(c.capacidad_maxima) + ' personas · ' + pesos(c.precio_por_noche) + ' por noche</p>' +
    '<p class="texto_ejemplo">' + esc(resumen(c.descripcion_equipamiento)) + '</p>' +
    extra +
    '</div></div>';
}

function tarjetasConBotonVer() {
  let html = '';
  for (let i = 0; i < cabanas.length; i++) {
    html = html + tarjetaCabana(cabanas[i], botonVer(cabanas[i].id_cabana, '', '', 'Ver'));
  }
  return html;
}

function traerCabanas() {
  return api.cabanas().then(function (lista) {
    cabanas = lista;
    return lista;
  });
}

function mostrarCatalogoInicio() {
  el('inicio_grilla_cabanas').innerHTML = tarjetasConBotonVer();
}

function irALogin(registro) {
  document.body.classList.add('en_login');
  alternarRegistro(registro);
  window.scrollTo(0, 0);
}

function volverAInicio() {
  document.body.classList.remove('en_login');
}

function irAInicio(idDestino) {
  volverAInicio();
  setTimeout(function () {
    if (idDestino === 'pantalla_inicio') {
      window.scrollTo(0, 0);
    } else {
      el(idDestino).scrollIntoView();
    }
  }, 0);
}

function pantallaDeIngreso() {
  usuario = null;
  document.body.classList.remove('en_login');
  document.body.classList.add('sin_sesion');
  el('navegacion_cliente').classList.add('oculto');
  el('navegacion_encargado').classList.add('oculto');
  let secciones = document.getElementsByClassName('seccion_contenido');
  for (let i = 0; i < secciones.length; i++) {
    secciones[i].classList.add('oculto');
  }
}

function entrar(u) {
  usuario = u;
  esEncargada = Number(u.id_rol) === ROL_ENCARGADA;
  document.body.classList.remove('sin_sesion');
  el('texto_usuario').textContent = u.nombre + ' ' + u.apellido + ' · ' + u.nombre_rol;
  if (esEncargada) {
    el('navegacion_cliente').classList.add('oculto');
    el('navegacion_encargado').classList.remove('oculto');
    mostrarSeccion('encargado_seccion_inicio', el('enc_menu_inicio'), 'navegacion_encargado');
  } else {
    el('navegacion_encargado').classList.add('oculto');
    el('navegacion_cliente').classList.remove('oculto');
    mostrarSeccion('cliente_seccion_inicio', el('cli_menu_inicio'), 'navegacion_cliente');
  }
}

function enviarLogin(evento) {
  evento.preventDefault();
  limpiarError('login_error');
  api.login(el('login_usuario').value.trim(), el('login_clave').value).then(function (u) {
    entrar(u);
    el('login_clave').value = '';
  }).catch(function (e) {
    mostrarError('login_error', e.message);
  });
}

function alternarRegistro(mostrar) {
  if (mostrar) {
    el('form_login').classList.add('oculto');
    el('form_registro').classList.remove('oculto');
    el('login_titulo').textContent = 'Crear cuenta de cliente';
  } else {
    el('form_login').classList.remove('oculto');
    el('form_registro').classList.add('oculto');
    el('login_titulo').textContent = 'Ingresar';
  }
  limpiarError('login_error');
  limpiarError('registro_error');
}

function enviarRegistro(evento) {
  evento.preventDefault();
  limpiarError('registro_error');
  let datos = {
    nombre: el('reg_nombre').value.trim(),
    apellido: el('reg_apellido').value.trim(),
    dni: el('reg_dni').value.trim(),
    telefono: el('reg_telefono').value.trim(),
    email: el('reg_email').value.trim(),
    nombre_usuario: el('reg_usuario').value.trim(),
    contrasena: el('reg_clave').value
  };
  api.registro(datos).then(function (u) {
    el('form_registro').reset();
    alternarRegistro(false);
    entrar(u);
  }).catch(function (e) {
    mostrarError('registro_error', e.message);
  });
}

function cerrarSesion() {
  api.logout().then(pantallaDeIngreso).catch(pantallaDeIngreso);
}

function mostrarSeccion(idSeccion, botonPresionado, idMenu) {
  let secciones = document.getElementsByClassName('seccion_contenido');
  for (let i = 0; i < secciones.length; i++) {
    secciones[i].classList.add('oculto');
    secciones[i].classList.remove('activo');
  }
  el(idSeccion).classList.remove('oculto');
  el(idSeccion).classList.add('activo');

  let botones = el(idMenu).getElementsByClassName('boton_menu');
  for (let i = 0; i < botones.length; i++) {
    botones[i].classList.remove('activo');
  }
  botonPresionado.classList.add('activo');

  CARGADORES[idSeccion]();
}

function cargarClienteInicio() {
  traerCabanas().then(function () {
    el('cliente_grilla_cabanas').innerHTML = tarjetasConBotonVer();
  }).catch(manejarError);
}

function cargarClienteCabanas() {
  el('disp_ingreso').min = hoyIso();
  el('disp_egreso').min = hoyIso();
  if (!el('disp_ingreso').value) {
    el('disp_ingreso').value = hoyIso();
    el('disp_egreso').value = sumarDias(hoyIso(), 3);
  }
  consultarDisponibilidad();
}

function consultarDisponibilidad() {
  limpiarError('disp_error');
  let ingreso = el('disp_ingreso').value;
  let egreso = el('disp_egreso').value;
  traerCabanas().then(function () {
    return api.disponibilidad(ingreso, egreso);
  }).then(function (r) {
    let html = '';
    for (let i = 0; i < cabanas.length; i++) {
      let c = cabanas[i];
      let ocupada = buscar(r.ocupadas, 'id_cabana', c.id_cabana);
      if (ocupada) {
        let rangos = '';
        for (let j = 0; j < ocupada.reservas.length; j++) {
          if (j > 0) {
            rangos = rangos + ', ';
          }
          rangos = rangos + fechaAR(ocupada.reservas[j].fecha_ingreso) + ' al ' + fechaAR(ocupada.reservas[j].fecha_egreso);
        }
        html = html + tarjetaCabana(c, '<p class="aviso_ocupada"><span class="insignia insignia_roja">Ocupada</span> Reservada: ' + esc(rangos) + '</p>' +
          botonVer(c.id_cabana, '', '', 'Ver'));
      } else {
        html = html + tarjetaCabana(c, '<p class="aviso_ocupada"><span class="insignia insignia_verde">Disponible</span> ' + r.noches + ' noches: ' + pesos(r.noches * c.precio_por_noche) + '</p>' +
          botonVer(c.id_cabana, ingreso, egreso, 'Ver y reservar'));
      }
    }
    el('cliente_disponibilidad').innerHTML = html;
  }).catch(function (e) {
    errorEn('disp_error', e);
  });
}

function celdaSaldo(r) {
  if (r.estado === 'Cancelada') {
    return '-';
  }
  if (r.saldo > 0) {
    return '<strong>' + pesos(r.saldo) + '</strong>';
  }
  return '<span class="insignia insignia_verde">Saldada</span>';
}

function esVigente(r) {
  return r.estado === 'Pendiente' || r.estado === 'Confirmada';
}

function cargarMisReservas() {
  api.reservas({}).then(function (filas) {
    let html = '';
    for (let i = 0; i < filas.length; i++) {
      let r = filas[i];
      let boton = '';
      if (esVigente(r)) {
        boton = '<button class="boton_secundario boton_chico" onclick="cancelarReserva(' + r.id_reserva + ')">Cancelar</button>';
      }
      html = html + '<tr>' +
        '<td>#' + esc(r.id_reserva) + '</td>' +
        '<td>' + esc(r.cabana) + '</td>' +
        '<td>' + fechaAR(r.fecha_ingreso) + '</td>' +
        '<td>' + fechaAR(r.fecha_egreso) + '</td>' +
        '<td>' + pesos(r.total) + '</td>' +
        '<td>' + (r.estado === 'Cancelada' ? '-' : pesos(r.pagado)) + '</td>' +
        '<td>' + celdaSaldo(r) + '</td>' +
        '<td>' + insignia(r.estado) + '</td>' +
        '<td>' + boton + '</td>' +
        '</tr>';
    }
    if (filas.length === 0) {
      html = filaVacia(9, 'Todavía no tenés reservas. Elegí una cabaña en Inicio.');
    }
    el('cliente_tabla_reservas').innerHTML = html;
  }).catch(manejarError);
}

function cargarMisPagos() {
  api.pagos({}).then(function (pagos) {
    api.reservas({}).then(function (reservas) {
      let debe = 0;
      for (let i = 0; i < reservas.length; i++) {
        if (esVigente(reservas[i])) {
          debe = debe + reservas[i].saldo;
        }
      }
      el('cliente_pagos_resumen').innerHTML =
        '<div class="tarjeta_metrica"><h4>Total pagado</h4><p class="valor_metrica">' + pesos(sumar(pagos, 'monto')) + '</p></div>' +
        '<div class="tarjeta_metrica"><h4>Te falta pagar</h4><p class="valor_metrica">' + pesos(debe) + '</p>' +
        '<p class="texto_ejemplo">Suma de lo que falta en tus reservas pendientes y confirmadas.</p></div>';

      let html = '';
      for (let i = 0; i < pagos.length; i++) {
        let p = pagos[i];
        let r = buscar(reservas, 'id_reserva', p.id_reserva);
        html = html + '<tr>' +
          '<td>#COMP-' + pad(p.id_comprobante, 4) + '</td>' +
          '<td>Pago de la reserva #' + esc(p.id_reserva) + ' · ' + esc(p.cabana) + '</td>' +
          '<td>' + pesos(p.monto) + '</td>' +
          '<td>' + fechaAR(p.fecha_hora_pago) + '</td>' +
          '<td>' + (r ? celdaSaldo(r) : '-') + '</td>' +
          '</tr>';
      }
      if (pagos.length === 0) {
        html = filaVacia(5, 'Todavía no hay pagos registrados a tu nombre.');
      }
      el('cliente_tabla_pagos').innerHTML = html;
    }).catch(manejarError);
  }).catch(manejarError);
}

function cancelarReserva(id) {
  if (!confirm('¿Cancelar la reserva #' + id + '?')) {
    return;
  }
  api.cancelarReserva(id).then(function () {
    avisar('Reserva #' + id + ' cancelada.');
    if (esEncargada) {
      cargarEncargadaReservas();
    } else {
      cargarMisReservas();
    }
  }).catch(manejarError);
}

function abrirModal(id, ingreso, egreso) {
  cabanaModal = buscar(cabanas, 'id_cabana', id);
  if (!cabanaModal) {
    return;
  }
  el('modal_titulo').textContent = cabanaModal.nombre_identificador;
  el('modal_datos').textContent = 'Hasta ' + cabanaModal.capacidad_maxima + ' personas · ' + pesos(cabanaModal.precio_por_noche) + ' por noche';
  el('modal_descripcion').textContent = cabanaModal.descripcion_equipamiento || '';
  el('modal_ingreso').min = hoyIso();
  el('modal_egreso').min = hoyIso();
  el('modal_ingreso').value = ingreso || '';
  el('modal_egreso').value = egreso || '';
  limpiarError('modal_error');
  if (usuario) {
    el('modal_reservar').textContent = 'Reservar';
  } else {
    el('modal_reservar').textContent = 'Ingresar para reservar';
  }
  actualizarTotalModal();
  el('modal_ejemplo').classList.remove('oculto');
}

function cerrarModal() {
  el('modal_ejemplo').classList.add('oculto');
}

function actualizarTotalModal() {
  let ingreso = el('modal_ingreso').value;
  let egreso = el('modal_egreso').value;
  let n = 0;
  if (ingreso && egreso) {
    n = cantNoches(ingreso, egreso);
  }
  if (n > 0) {
    el('modal_total').textContent = n + ' noche' + (n > 1 ? 's' : '') + ' · total estimado ' + pesos(n * cabanaModal.precio_por_noche);
  } else {
    el('modal_total').textContent = 'Elegí las fechas para ver el total.';
  }
}

function reservarDesdeModal() {
  limpiarError('modal_error');
  if (!usuario) {
    cerrarModal();
    irALogin(false);
    avisar('Ingresá o creá tu cuenta para poder reservar.');
    return;
  }
  let datos = {
    id_cabana: cabanaModal.id_cabana,
    fecha_ingreso: el('modal_ingreso').value,
    fecha_egreso: el('modal_egreso').value
  };
  api.crearReserva(datos).then(function (r) {
    cerrarModal();
    avisar('Reserva #' + r.id_reserva + ' creada. Queda pendiente hasta que se pague la seña.');
    mostrarSeccion('cliente_seccion_mis_reservas', el('cli_menu_reservas'), 'navegacion_cliente');
  }).catch(function (e) {
    mostrarError('modal_error', e.message);
  });
}

function cargarEncargadaInicio() {
  let hoy = hoyIso();
  api.disponibilidad(hoy, sumarDias(hoy, 1)).then(function (disp) {
    return api.reservas({}).then(function (reservas) {
      return api.pagos({}).then(function (pagos) {
        let pendientes = 0;
        for (let i = 0; i < reservas.length; i++) {
          if (reservas[i].estado === 'Pendiente') {
            pendientes = pendientes + 1;
          }
        }
        el('metrica_ocupadas').textContent = disp.ocupadas.length + ' / ' + (disp.ocupadas.length + disp.libres.length);
        el('metrica_reservas').textContent = reservas.length;
        el('metrica_pendientes').textContent = pendientes;
        el('metrica_pagos').textContent = pesos(sumar(pagos, 'monto'));
      });
    });
  }).catch(manejarError);
}

function botonesReserva(r) {
  if (!esVigente(r)) {
    return '';
  }
  let cobro = '<span class="insignia insignia_verde">Saldada</span>';
  if (r.puede_cobrar) {
    cobro = '<button class="boton_secundario boton_chico" onclick="abrirPago(' + r.id_reserva + ')">Cobrar</button>';
  }
  let finalizar = '';
  if (r.puede_finalizar) {
    finalizar = '<button class="boton_secundario boton_chico" onclick="finalizarReserva(' + r.id_reserva + ')">Finalizar</button>';
  }
  return cobro +
    '<button class="boton_secundario boton_chico" onclick="abrirCambioFechas(' + r.id_reserva + ')">Fechas</button>' +
    finalizar +
    '<button class="boton_peligro boton_chico" onclick="cancelarReserva(' + r.id_reserva + ')">Cancelar</button>';
}

function filtrosReservas() {
  let filtros = {};
  if (el('fr_estado').value) {
    filtros.estado = el('fr_estado').value;
  }
  if (el('fr_cabana').value) {
    filtros.id_cabana = el('fr_cabana').value;
  }
  if (el('fr_desde').value) {
    filtros.desde = el('fr_desde').value;
  }
  if (el('fr_hasta').value) {
    filtros.hasta = el('fr_hasta').value;
  }
  return filtros;
}

function limpiarFiltroReservas() {
  el('form_filtro_reservas').reset();
  cargarEncargadaReservas();
}

function cargarEncargadaReservas() {
  api.reservas(filtrosReservas()).then(function (reservas) {
    return api.clientes().then(function (clientes) {
      return traerCabanas().then(function (cab) {
        let seleccionFiltro = el('fr_cabana').value;
        let opcionesFiltro = '<option value="">Todas</option>';
        let opcionesCabana = '';
        for (let i = 0; i < cab.length; i++) {
          let opcion = '<option value="' + cab[i].id_cabana + '">' + esc(cab[i].nombre_identificador) + '</option>';
          opcionesFiltro = opcionesFiltro + opcion;
          opcionesCabana = opcionesCabana + opcion;
        }
        el('fr_cabana').innerHTML = opcionesFiltro;
        el('fr_cabana').value = seleccionFiltro;

        let totalActivas = 0;
        for (let i = 0; i < reservas.length; i++) {
          if (reservas[i].estado !== 'Cancelada') {
            totalActivas = totalActivas + reservas[i].total;
          }
        }
        el('fr_resumen').textContent = reservas.length + ' reserva' + (reservas.length === 1 ? '' : 's') + ' · total de las no canceladas: ' + pesos(totalActivas);
        reservasCache = reservas;

        let seleccionCliente = el('nr_cliente').value;
        let seleccionCabana = el('nr_cabana').value;
        let opcionesCliente = '';
        for (let i = 0; i < clientes.length; i++) {
          opcionesCliente = opcionesCliente + '<option value="' + clientes[i].id_cliente + '">' + esc(clientes[i].apellido) + ', ' + esc(clientes[i].nombre) + '</option>';
        }
        if (clientes.length === 0) {
          opcionesCliente = '<option value="">No hay clientes: cargalos en la sección Clientes</option>';
        }
        el('nr_cliente').innerHTML = opcionesCliente;
        el('nr_cabana').innerHTML = opcionesCabana;
        if (seleccionCliente) {
          el('nr_cliente').value = seleccionCliente;
        }
        if (seleccionCabana) {
          el('nr_cabana').value = seleccionCabana;
        }
        el('nr_ingreso').min = hoyIso();
        el('nr_egreso').min = hoyIso();

        let html = '';
        for (let i = 0; i < reservas.length; i++) {
          let r = reservas[i];
          html = html + '<tr>' +
            '<td>#RES-' + pad(r.id_reserva, 2) + '</td>' +
            '<td>' + esc(r.cliente_apellido) + ', ' + esc(r.cliente_nombre) + '</td>' +
            '<td>' + esc(r.cabana) + '</td>' +
            '<td>' + fechaAR(r.fecha_ingreso) + '</td>' +
            '<td>' + fechaAR(r.fecha_egreso) + '</td>' +
            '<td>' + pesos(r.total) + '</td>' +
            '<td>' + (r.estado === 'Cancelada' ? '-' : pesos(r.pagado)) + '</td>' +
            '<td>' + celdaSaldo(r) + '</td>' +
            '<td>' + insignia(r.estado) + '</td>' +
            '<td class="celda_acciones">' + botonesReserva(r) + '</td>' +
            '</tr>';
        }
        if (reservas.length === 0) {
          html = filaVacia(10, 'No hay reservas registradas.');
        }
        el('encargado_tabla_reservas').innerHTML = html;
      });
    });
  }).catch(manejarError);
}

function crearReservaEncargada(evento) {
  evento.preventDefault();
  limpiarError('nr_error');
  let datos = {
    id_cliente: Number(el('nr_cliente').value),
    id_cabana: Number(el('nr_cabana').value),
    fecha_ingreso: el('nr_ingreso').value,
    fecha_egreso: el('nr_egreso').value
  };
  api.crearReserva(datos).then(function (r) {
    avisar('Reserva #' + r.id_reserva + ' creada (' + pesos(r.total) + ').');
    cargarEncargadaReservas();
  }).catch(function (e) {
    errorEn('nr_error', e);
  });
}

function finalizarReserva(id) {
  api.finalizarReserva(id).then(function () {
    avisar('Reserva #' + id + ' finalizada.');
    cargarEncargadaReservas();
  }).catch(manejarError);
}

function abrirModalForm(titulo, cuerpoHtml, alConfirmar, textoBoton) {
  el('mf_titulo').textContent = titulo;
  el('mf_confirmar').textContent = textoBoton || 'Confirmar';
  el('mf_cuerpo').innerHTML = cuerpoHtml;
  limpiarError('mf_error');
  accionModalForm = alConfirmar;
  el('modal_form').classList.remove('oculto');
}

function cerrarModalForm() {
  el('modal_form').classList.add('oculto');
}

function confirmarModalForm() {
  accionModalForm().then(function () {
    cerrarModalForm();
  }).catch(function (e) {
    mostrarError('mf_error', e.message);
  });
}

function abrirPago(id) {
  let r = buscar(reservasCache, 'id_reserva', id);
  if (!r || !r.puede_cobrar) {
    avisar('Esa reserva ya está saldada.');
    return;
  }
  abrirModalForm('Cobrar reserva #' + id,
    '<p class="modal_datos">' + esc(r.cliente_apellido) + ', ' + esc(r.cliente_nombre) + ' · ' + esc(r.cabana) + '<br>' +
    'Total ' + pesos(r.total) + ' · Pagado ' + pesos(r.pagado) + ' · <strong>Saldo ' + pesos(r.saldo) + '</strong></p>' +
    '<div class="fila_campos">' +
    '<div class="campo_grupo"><label for="pg_monto">Monto ($)</label><input id="pg_monto" type="number" min="1" max="' + r.saldo + '" value="' + r.saldo + '" class="campo_entrada"></div>' +
    '<div class="campo_grupo"><label for="pg_metodo">Método</label>' +
    '<select id="pg_metodo" class="campo_entrada"><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option></select></div>' +
    '</div>',
    function () {
      return api.registrarPago(id, Number(el('pg_monto').value), el('pg_metodo').value).then(function (p) {
        avisar('Pago registrado. Comprobante #COMP-' + pad(p.id_comprobante, 4) + '. Reserva ' + p.estado_reserva + '.');
        cargarEncargadaReservas();
      });
    }, 'Confirmar');
}

function abrirCambioFechas(id) {
  let r = buscar(reservasCache, 'id_reserva', id);
  let ingresoMin = '';
  if (r.fecha_ingreso >= hoyIso()) {
    ingresoMin = 'min="' + hoyIso() + '"';
  }
  abrirModalForm('Cambiar fechas de la reserva #' + id,
    '<p class="modal_datos">' + esc(r.cabana) + ' · ' + esc(r.cliente_apellido) + ', ' + esc(r.cliente_nombre) + '<br>' +
    'Total ' + pesos(r.total) + ' (' + pesos(r.precio_por_noche) + ' por noche) · Ya pagado ' + pesos(r.pagado) + '</p>' +
    '<div class="fila_campos">' +
    '<div class="campo_grupo"><label for="cf_ingreso">Ingreso</label><input id="cf_ingreso" type="date" ' + ingresoMin + ' value="' + r.fecha_ingreso + '" class="campo_entrada"></div>' +
    '<div class="campo_grupo"><label for="cf_egreso">Egreso</label><input id="cf_egreso" type="date" min="' + hoyIso() + '" value="' + r.fecha_egreso + '" class="campo_entrada"></div>' +
    '</div>' +
    '<p id="cf_total" class="nota_pantalla"></p>',
    function () {
      let datos = { fecha_ingreso: el('cf_ingreso').value, fecha_egreso: el('cf_egreso').value };
      return api.modificarReserva(id, datos).then(function () {
        avisar('Fechas de la reserva #' + id + ' actualizadas.');
        cargarEncargadaReservas();
      });
    }, 'Confirmar');

  function recalcular() {
    let n = cantNoches(el('cf_ingreso').value, el('cf_egreso').value);
    if (n > 0) {
      let nuevo = n * r.precio_por_noche;
      let texto = 'Nuevo total: ' + pesos(nuevo) + ' (' + n + ' noche' + (n > 1 ? 's' : '') + ' al precio con que se reservó). ';
      if (nuevo < r.pagado) {
        texto = texto + 'Es menor a lo ya pagado: el sistema no lo va a permitir.';
      }
      el('cf_total').textContent = texto;
    } else {
      el('cf_total').textContent = '';
    }
  }
  el('cf_ingreso').addEventListener('change', recalcular);
  el('cf_egreso').addEventListener('change', recalcular);
  recalcular();
}

function cargarEncargadaClientes() {
  api.clientes().then(function (clientes) {
    return api.reservas({}).then(function (reservas) {
      clientesCache = clientes;
      let cuenta = {};
      for (let i = 0; i < reservas.length; i++) {
        let idCliente = reservas[i].id_cliente;
        cuenta[idCliente] = (cuenta[idCliente] || 0) + 1;
      }
      let html = '';
      for (let i = 0; i < clientes.length; i++) {
        let c = clientes[i];
        html = html + '<tr>' +
          '<td>' + esc(c.apellido) + ', ' + esc(c.nombre) + '</td>' +
          '<td>' + esc(c.dni) + '</td>' +
          '<td>' + esc(c.telefono || '-') + '</td>' +
          '<td>' + esc(c.email || '-') + '</td>' +
          '<td>' + (cuenta[c.id_cliente] || 0) + '</td>' +
          '<td class="celda_acciones">' +
          '<button class="boton_secundario boton_chico" onclick="editarCliente(' + c.id_cliente + ')">Editar</button>' +
          '<button class="boton_secundario boton_chico" onclick="restablecerClave(' + c.id_cliente + ')">Nueva clave</button>' +
          '<button class="boton_peligro boton_chico" onclick="eliminarCliente(' + c.id_cliente + ')">Eliminar</button>' +
          '</td></tr>';
      }
      if (clientes.length === 0) {
        html = filaVacia(6, 'No hay clientes registrados.');
      }
      el('encargado_tabla_clientes').innerHTML = html;
    });
  }).catch(manejarError);
}

function limpiarFormCliente() {
  el('form_cliente').reset();
  el('cli_id').value = '';
  el('cli_form_titulo').textContent = 'Nuevo cliente';
  el('cli_cancelar').classList.add('oculto');
  limpiarError('cli_error');
}

function editarCliente(id) {
  let c = buscar(clientesCache, 'id_cliente', id);
  el('cli_id').value = id;
  el('cli_nombre').value = c.nombre;
  el('cli_apellido').value = c.apellido;
  el('cli_dni').value = c.dni;
  el('cli_telefono').value = c.telefono || '';
  el('cli_email').value = c.email || '';
  el('cli_clave').value = '';
  el('cli_form_titulo').textContent = 'Modificar cliente #' + id;
  el('cli_cancelar').classList.remove('oculto');
  el('form_cliente').scrollIntoView();
}

function guardarCliente(evento) {
  evento.preventDefault();
  limpiarError('cli_error');
  let datos = {
    nombre: el('cli_nombre').value.trim(),
    apellido: el('cli_apellido').value.trim(),
    dni: el('cli_dni').value.trim(),
    telefono: el('cli_telefono').value.trim(),
    email: el('cli_email').value.trim()
  };
  if (el('cli_clave').value) {
    datos.contrasena = el('cli_clave').value;
  }
  let id = el('cli_id').value;
  let pedido;
  if (id) {
    pedido = api.modificarCliente(id, datos);
  } else {
    pedido = api.crearCliente(datos);
  }
  pedido.then(function (nuevo) {
    if (id) {
      avisar('Cliente modificado.');
    } else {
      avisar('Cliente registrado.');
    }
    limpiarFormCliente();
    cargarEncargadaClientes();
    if (!id && nuevo.contrasena_generada) {
      mostrarCredenciales('Cliente registrado', nuevo.nombre_usuario, nuevo.contrasena_generada);
    }
  }).catch(function (e) {
    errorEn('cli_error', e);
  });
}

function mostrarCredenciales(titulo, nombreUsuario, clave) {
  let usuarioHtml = '';
  if (nombreUsuario) {
    usuarioHtml = '<p>Usuario: <strong>' + esc(nombreUsuario) + '</strong></p>';
  }
  abrirModalForm(titulo,
    '<p class="modal_datos">Pasale estos datos al cliente. <strong>La contraseña no se vuelve a mostrar</strong>: si se pierde, se genera una nueva desde "Nueva clave".</p>' +
    '<div class="credenciales">' + usuarioHtml +
    '<p>Contraseña: <strong class="clave_generada">' + esc(clave) + '</strong></p></div>',
    function () {
      return Promise.resolve();
    }, 'Ya la anoté');
}

function restablecerClave(id) {
  let c = buscar(clientesCache, 'id_cliente', id);
  if (!confirm('¿Generar una contraseña nueva para ' + c.apellido + ', ' + c.nombre + '? La anterior deja de servir.')) {
    return;
  }
  api.restablecerClave(id).then(function (r) {
    mostrarCredenciales('Nueva contraseña de ' + c.apellido + ', ' + c.nombre, null, r.contrasena_generada);
  }).catch(manejarError);
}

function eliminarCliente(id) {
  if (!confirm('¿Eliminar este cliente?')) {
    return;
  }
  api.eliminarCliente(id).then(function () {
    avisar('Cliente eliminado.');
    cargarEncargadaClientes();
  }).catch(manejarError);
}

function cargarEncargadaCabanas() {
  let hoy = hoyIso();
  traerCabanas().then(function (lista) {
    return api.disponibilidad(hoy, sumarDias(hoy, 1)).then(function (disp) {
      let html = '';
      for (let i = 0; i < lista.length; i++) {
        let c = lista[i];
        let estado = '<span class="insignia insignia_verde">Disponible</span>';
        if (buscar(disp.ocupadas, 'id_cabana', c.id_cabana)) {
          estado = '<span class="insignia insignia_roja">Ocupada</span>';
        }
        html = html + '<tr>' +
          '<td>' + esc(c.nombre_identificador) + '</td>' +
          '<td>' + esc(c.capacidad_maxima) + ' personas</td>' +
          '<td>' + pesos(c.precio_por_noche) + '</td>' +
          '<td>' + estado + '</td>' +
          '<td class="celda_acciones">' +
          '<button class="boton_secundario boton_chico" onclick="editarCabana(' + c.id_cabana + ')">Editar</button>' +
          '<button class="boton_peligro boton_chico" onclick="eliminarCabana(' + c.id_cabana + ')">Eliminar</button>' +
          '</td></tr>';
      }
      if (lista.length === 0) {
        html = filaVacia(5, 'No hay cabañas cargadas.');
      }
      el('encargado_tabla_cabanas').innerHTML = html;
    });
  }).catch(manejarError);
}

function limpiarFormCabana() {
  el('form_cabana').reset();
  el('cab_id').value = '';
  el('cab_form_titulo').textContent = 'Nueva cabaña';
  el('cab_cancelar').classList.add('oculto');
  limpiarError('cab_error');
}

function editarCabana(id) {
  let c = buscar(cabanas, 'id_cabana', id);
  el('cab_id').value = id;
  el('cab_nombre').value = c.nombre_identificador;
  el('cab_capacidad').value = c.capacidad_maxima;
  el('cab_precio').value = c.precio_por_noche;
  el('cab_descripcion').value = c.descripcion_equipamiento || '';
  el('cab_form_titulo').textContent = 'Modificar cabaña #' + id;
  el('cab_cancelar').classList.remove('oculto');
  el('form_cabana').scrollIntoView();
}

function guardarCabana(evento) {
  evento.preventDefault();
  limpiarError('cab_error');
  let datos = {
    nombre_identificador: el('cab_nombre').value.trim(),
    capacidad_maxima: Number(el('cab_capacidad').value),
    precio_por_noche: Number(el('cab_precio').value),
    descripcion_equipamiento: el('cab_descripcion').value.trim()
  };
  let id = el('cab_id').value;
  let pedido;
  if (id) {
    pedido = api.modificarCabana(id, datos);
  } else {
    pedido = api.crearCabana(datos);
  }
  pedido.then(function () {
    if (id) {
      avisar('Cabaña modificada.');
    } else {
      avisar('Cabaña creada.');
    }
    limpiarFormCabana();
    cargarEncargadaCabanas();
  }).catch(function (e) {
    errorEn('cab_error', e);
  });
}

function eliminarCabana(id) {
  if (!confirm('¿Eliminar esta cabaña?')) {
    return;
  }
  api.eliminarCabana(id).then(function () {
    avisar('Cabaña eliminada.');
    cargarEncargadaCabanas();
  }).catch(manejarError);
}

function limpiarFiltroPagos() {
  el('form_filtro_pagos').reset();
  cargarEncargadaPagos();
}

function cargarEncargadaPagos() {
  limpiarError('fp_error');
  let filtros = {};
  if (el('fp_desde').value) {
    filtros.desde = el('fp_desde').value;
  }
  if (el('fp_hasta').value) {
    filtros.hasta = el('fp_hasta').value;
  }
  if (el('fp_metodo').value) {
    filtros.metodo_pago = el('fp_metodo').value;
  }
  api.pagos(filtros).then(function (pagos) {
    let porMetodo = { Efectivo: 0, Transferencia: 0, Tarjeta: 0 };
    for (let i = 0; i < pagos.length; i++) {
      porMetodo[pagos[i].metodo_pago] = (porMetodo[pagos[i].metodo_pago] || 0) + pagos[i].monto;
    }
    let tarjetas = '';
    for (let metodo in porMetodo) {
      tarjetas = tarjetas + '<div class="tarjeta_metrica"><h4>' + esc(metodo) + '</h4><p class="valor_metrica">' + pesos(porMetodo[metodo]) + '</p></div>';
    }
    el('pagos_resumen').innerHTML =
      '<div class="tarjeta_metrica"><h4>Pagos en el filtro</h4><p class="valor_metrica">' + pagos.length + '</p></div>' +
      '<div class="tarjeta_metrica"><h4>Total cobrado</h4><p class="valor_metrica">' + pesos(sumar(pagos, 'monto')) + '</p></div>' +
      tarjetas;

    let html = '';
    for (let i = 0; i < pagos.length; i++) {
      let p = pagos[i];
      html = html + '<tr>' +
        '<td>#PAG-' + pad(p.id_pago, 3) + '</td>' +
        '<td>#RES-' + pad(p.id_reserva, 2) + '</td>' +
        '<td>' + esc(p.cliente_apellido) + ', ' + esc(p.cliente_nombre) + '</td>' +
        '<td>' + pesos(p.monto) + '</td>' +
        '<td>' + esc(p.metodo_pago) + '</td>' +
        '<td>' + fechaAR(p.fecha_hora_pago) + '</td>' +
        '<td>#COMP-' + pad(p.id_comprobante, 4) + '</td>' +
        '</tr>';
    }
    if (pagos.length === 0) {
      html = filaVacia(7, 'No hay pagos registrados.');
    }
    el('encargado_tabla_pagos').innerHTML = html;
  }).catch(function (e) {
    errorEn('fp_error', e);
  });
}

function cargarEncargadaReportes() {
  if (!el('rep_desde').value) {
    let hoy = new Date();
    el('rep_desde').value = aIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    el('rep_hasta').value = aIso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
  }
  armarReporte();
}

function armarReporte() {
  limpiarError('rep_error');
  api.reporte(el('rep_desde').value, el('rep_hasta').value).then(function (r) {
    let filas = '';
    for (let i = 0; i < r.cabanas.length; i++) {
      let c = r.cabanas[i];
      filas = filas + '<tr><td>' + esc(c.cabana) + '</td><td>' + c.noches_ocupadas + ' de ' + r.dias_periodo + '</td><td>' + c.ocupacion_pct + '%</td><td>' + pesos(c.ingresos) + '</td></tr>';
    }
    el('reporte_resultado').innerHTML =
      '<div class="grilla_metricas separado_abajo">' +
      '<div class="tarjeta_metrica"><h4>Ocupación general</h4><p class="valor_metrica">' + r.ocupacion_general_pct + '%</p>' +
      '<p class="texto_ejemplo">Según las noches de estadía</p></div>' +
      '<div class="tarjeta_metrica"><h4>Noches ocupadas</h4><p class="valor_metrica">' + r.total_noches_ocupadas + '</p>' +
      '<p class="texto_ejemplo">Según las noches de estadía</p></div>' +
      '<div class="tarjeta_metrica"><h4>Ingresos cobrados</h4><p class="valor_metrica">' + pesos(r.total_ingresos) + '</p>' +
      '<p class="texto_ejemplo">Según la fecha de pago</p></div>' +
      '</div>' +
      '<div class="caja_tabla"><table class="tabla_ejemplo">' +
      '<thead><tr><th>Cabaña</th><th>Noches ocupadas<br><small>(por fechas de estadía)</small></th><th>Ocupación</th><th>Ingresos cobrados<br><small>(por fecha de pago)</small></th></tr></thead>' +
      '<tbody>' + filas + '</tbody></table></div>';
  }).catch(function (e) {
    errorEn('rep_error', e);
  });
}

const CARGADORES = {
  cliente_seccion_inicio: cargarClienteInicio,
  cliente_seccion_cabanas: cargarClienteCabanas,
  cliente_seccion_mis_reservas: cargarMisReservas,
  cliente_seccion_mis_pagos: cargarMisPagos,
  cliente_seccion_contacto: function () {},
  encargado_seccion_inicio: cargarEncargadaInicio,
  encargado_seccion_reservas: cargarEncargadaReservas,
  encargado_seccion_clientes: cargarEncargadaClientes,
  encargado_seccion_cabanas: cargarEncargadaCabanas,
  encargado_seccion_pagos: cargarEncargadaPagos,
  encargado_seccion_reportes: cargarEncargadaReportes
};

function conectarClick(idBoton, funcion) {
  el(idBoton).addEventListener('click', funcion);
}

function conectarEnvio(idFormulario, funcion) {
  el(idFormulario).addEventListener('submit', funcion);
}

function conectarMenu(idBoton, idSeccion, idMenu) {
  el(idBoton).addEventListener('click', function () {
    mostrarSeccion(idSeccion, el(idBoton), idMenu);
  });
}

function conectarInicio(idBoton, idDestino) {
  el(idBoton).addEventListener('click', function () {
    irAInicio(idDestino);
  });
}

function conectarLogin(idBoton, registro) {
  el(idBoton).addEventListener('click', function () {
    irALogin(registro);
  });
}

conectarClick('cerrar_sesion', cerrarSesion);

conectarInicio('menu_inicio_portada', 'pantalla_inicio');
conectarInicio('menu_inicio_cabanas', 'inicio_cabanas');
conectarInicio('menu_inicio_pasos', 'inicio_pasos');
conectarLogin('menu_ingresar', false);
conectarLogin('menu_crear_cuenta', true);
conectarLogin('inicio_ingresar', false);
conectarLogin('inicio_registro', true);

conectarClick('boton_volver_inicio', volverAInicio);
conectarClick('ir_a_registro', function () {
  alternarRegistro(true);
});
conectarClick('ir_a_login', function () {
  alternarRegistro(false);
});
conectarEnvio('form_login', enviarLogin);
conectarEnvio('form_registro', enviarRegistro);

conectarMenu('cli_menu_inicio', 'cliente_seccion_inicio', 'navegacion_cliente');
conectarMenu('cli_menu_cabanas', 'cliente_seccion_cabanas', 'navegacion_cliente');
conectarMenu('cli_menu_reservas', 'cliente_seccion_mis_reservas', 'navegacion_cliente');
conectarMenu('cli_menu_pagos', 'cliente_seccion_mis_pagos', 'navegacion_cliente');
conectarMenu('cli_menu_contacto', 'cliente_seccion_contacto', 'navegacion_cliente');

conectarMenu('enc_menu_inicio', 'encargado_seccion_inicio', 'navegacion_encargado');
conectarMenu('enc_menu_reservas', 'encargado_seccion_reservas', 'navegacion_encargado');
conectarMenu('enc_menu_clientes', 'encargado_seccion_clientes', 'navegacion_encargado');
conectarMenu('enc_menu_cabanas', 'encargado_seccion_cabanas', 'navegacion_encargado');
conectarMenu('enc_menu_pagos', 'encargado_seccion_pagos', 'navegacion_encargado');
conectarMenu('enc_menu_reportes', 'encargado_seccion_reportes', 'navegacion_encargado');

conectarEnvio('form_disponibilidad', function (evento) {
  evento.preventDefault();
  consultarDisponibilidad();
});
conectarClick('boton_contacto', function () {
  avisar('Gracias por tu consulta.');
});
conectarEnvio('form_nueva_reserva', crearReservaEncargada);
conectarEnvio('form_filtro_reservas', function (evento) {
  evento.preventDefault();
  cargarEncargadaReservas();
});
conectarClick('filtro_reservas_limpiar', limpiarFiltroReservas);
conectarEnvio('form_cliente', guardarCliente);
conectarClick('cli_cancelar', limpiarFormCliente);
conectarEnvio('form_cabana', guardarCabana);
conectarClick('cab_cancelar', limpiarFormCabana);
conectarEnvio('form_filtro_pagos', function (evento) {
  evento.preventDefault();
  cargarEncargadaPagos();
});
conectarClick('filtro_pagos_limpiar', limpiarFiltroPagos);
conectarEnvio('form_reporte', function (evento) {
  evento.preventDefault();
  armarReporte();
});

conectarClick('modal_cerrar_boton', cerrarModal);
conectarClick('modal_reservar', reservarDesdeModal);
conectarClick('modal_form_cerrar', cerrarModalForm);
conectarClick('mf_confirmar', confirmarModalForm);
el('modal_ingreso').addEventListener('change', actualizarTotalModal);
el('modal_egreso').addEventListener('change', actualizarTotalModal);

traerCabanas().then(mostrarCatalogoInicio).catch(function () {});
api.sesion().then(entrar).catch(pantallaDeIngreso);
