const API = 'api/';

function armarQuery(params) {
  let partes = [];
  for (let clave in params) {
    partes.push(encodeURIComponent(clave) + '=' + encodeURIComponent(params[clave]));
  }
  if (partes.length > 0) {
    return '?' + partes.join('&');
  }
  return '';
}

function llamar(archivo, metodo, cuerpo, params) {
  let opciones = {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  };
  if (cuerpo) {
    opciones.body = JSON.stringify(cuerpo);
  }
  return fetch(API + archivo + armarQuery(params), opciones).then(function (respuesta) {
    return respuesta.json().then(function (datos) {
      if (!respuesta.ok) {
        throw new Error(datos.error || 'Error en la API');
      }
      return datos;
    });
  });
}

const api = {
  login: function (nombre_usuario, contrasena) {
    return llamar('login.php', 'POST', { nombre_usuario: nombre_usuario, contrasena: contrasena }, null);
  },
  sesion: function () {
    return llamar('login.php', 'GET', null, null);
  },
  logout: function () {
    return llamar('login.php', 'DELETE', null, null);
  },
  registro: function (datos) {
    return llamar('registro.php', 'POST', datos, null);
  },

  cabanas: function () {
    return llamar('cabanas.php', 'GET', null, null);
  },
  crearCabana: function (datos) {
    return llamar('cabanas.php', 'POST', datos, null);
  },
  modificarCabana: function (id, datos) {
    return llamar('cabanas.php', 'PUT', datos, { id: id });
  },
  eliminarCabana: function (id) {
    return llamar('cabanas.php', 'DELETE', null, { id: id });
  },

  clientes: function () {
    return llamar('clientes.php', 'GET', null, null);
  },
  crearCliente: function (datos) {
    return llamar('clientes.php', 'POST', datos, null);
  },
  modificarCliente: function (id, datos) {
    return llamar('clientes.php', 'PUT', datos, { id: id });
  },
  eliminarCliente: function (id) {
    return llamar('clientes.php', 'DELETE', null, { id: id });
  },
  restablecerClave: function (id) {
    return llamar('clientes.php', 'PUT', { accion: 'restablecer_clave' }, { id: id });
  },

  reservas: function (filtros) {
    return llamar('reservas.php', 'GET', null, filtros);
  },
  crearReserva: function (datos) {
    return llamar('reservas.php', 'POST', datos, null);
  },
  modificarReserva: function (id, datos) {
    return llamar('reservas.php', 'PUT', datos, { id: id });
  },
  cancelarReserva: function (id) {
    return llamar('reservas.php', 'PUT', { accion: 'cancelar' }, { id: id });
  },
  finalizarReserva: function (id) {
    return llamar('reservas.php', 'PUT', { accion: 'finalizar' }, { id: id });
  },

  disponibilidad: function (ingreso, egreso) {
    return llamar('disponibilidad.php', 'GET', null, { ingreso: ingreso, egreso: egreso });
  },

  pagos: function (filtros) {
    return llamar('pagos.php', 'GET', null, filtros);
  },
  registrarPago: function (id_reserva, monto, metodo_pago) {
    return llamar('pagos.php', 'POST', { id_reserva: id_reserva, monto: monto, metodo_pago: metodo_pago }, null);
  },

  reporte: function (desde, hasta) {
    return llamar('reportes.php', 'GET', null, { desde: desde, hasta: hasta });
  }
};
