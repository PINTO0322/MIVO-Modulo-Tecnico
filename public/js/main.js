
let token = null;
let versionSesion = 0;
let trabajos = [];
let servicios = [];
let historial = [];
let operacion = null;
let cargando = false;
let enviando = false;

const elemento = id => document.getElementById(id);

const vistas = [
    'dashboard',
    'asignaciones',
    'servicios',
    'reparaciones',
    'historial'
];

const indicadores = [
    'pendientes',
    'en_proceso',
    'finalizadas',
    'en_correccion'
];

const estados = {
    ASIGNADA: 'Asignada',
    EN_PROCESO: 'En proceso',
    FINALIZADA: 'Finalizada',
    EN_CORRECCION: 'En corrección',
    CORRECCION_FINALIZADA: 'Corrección finalizada'
};

const consultarAPI = async (ruta, metodo = 'GET', datos) => {
    const version = versionSesion;

    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const respuesta = await fetch(ruta, {
        method: metodo,
        headers,
        body: datos === undefined
            ? undefined
            : JSON.stringify(datos)
    });

    const resultado = await respuesta.json().catch(() => ({}));

    if (version !== versionSesion) {
        throw new Error('La sesión ha cambiado');
    }

    if (respuesta.status === 401 && token) {
        cerrarSesion('Tu sesión ha expirado. Ingresa nuevamente.');
        throw new Error('Sesión expirada');
    }

    if (!respuesta.ok) {
        throw new Error(
            resultado.error || 'No se pudo completar la solicitud'
        );
    }

    return resultado;
};

const notificar = (mensaje, tipo = 'success') => {
    const aviso = elemento('notificacion');

    aviso.className = `alert alert-${tipo}`;
    aviso.textContent = mensaje;
    aviso.hidden = !mensaje;
};

const normalizar = valor =>
    String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const coincide = (texto, valores) =>
    normalizar(valores.join(' ')).includes(normalizar(texto));

const formatearFecha = fecha => {
    if (!fecha) return '—';

    const partes = String(fecha).slice(0, 10).split('-');

    return partes.length === 3
        ? `${partes[2]}/${partes[1]}/${partes[0]}`
        : String(fecha);
};

const formatearPrecio = precio => {
    if (precio === null || precio === undefined) return '—';

    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number(precio));
};

const nombreMoto = trabajo =>
    `${trabajo.linea || ''} ${trabajo.modelo || ''}`.trim() || '—';

const crearEstado = estado => {
    const etiqueta = document.createElement('span');

    etiqueta.className = estados[estado]
        ? `estado estado-${estado.toLowerCase()}`
        : 'estado estado-neutral';

    etiqueta.textContent = estados[estado] || estado || 'Sin iniciar';

    return etiqueta;
};

const mostrarVista = nombre => {
    if (!token) return;

    const seleccionada = vistas.includes(nombre)
        ? nombre
        : 'dashboard';

    vistas.forEach(vista => {
        elemento(vista).hidden = vista !== seleccionada;
    });

    document.querySelectorAll('.menu-lateral a').forEach(enlace => {
        const activo = enlace.hash === `#${seleccionada}`;

        enlace.classList.toggle('activo', activo);

        if (activo) {
            enlace.setAttribute('aria-current', 'page');
        } else {
            enlace.removeAttribute('aria-current');
        }
    });

    window.scrollTo(0, 0);
};

const crearTabla = (contenedor, titulos, registros) => {
    const destino = elemento(contenedor);
    destino.replaceChildren();

    if (!registros.length) {
        const vacio = document.createElement('div');
        vacio.className = 'sin-registros';

        const icono = document.createElement('i');
        icono.className = 'bi bi-inbox';

        const mensaje = document.createElement('span');
        mensaje.textContent = 'No hay registros disponibles.';

        vacio.append(icono, mensaje);
        destino.appendChild(vacio);
        return;
    }

    const envoltura = document.createElement('div');
    envoltura.className = 'table-responsive';

    const tabla = document.createElement('table');
    tabla.className = 'table table-hover align-middle';

    const encabezado = tabla.createTHead().insertRow();

    titulos.forEach(titulo => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = titulo;
        encabezado.appendChild(th);
    });

    const cuerpo = tabla.createTBody();

    registros.forEach(registro => {
        const fila = cuerpo.insertRow();

        registro.forEach(valor => {
            const celda = fila.insertCell();

            if (valor instanceof Node) {
                celda.appendChild(valor);
            } else {
                celda.textContent = valor ?? '—';
            }
        });
    });

    envoltura.appendChild(tabla);
    destino.appendChild(envoltura);
};

const abrirOperacion = (trabajo, accion, titulo) => {
    if (!token || cargando || enviando) return;

    operacion = {
        id: trabajo.id_citas,
        accion
    };

    elemento('tituloModal').textContent = titulo;

    elemento('detalleTrabajo').textContent =
        `${trabajo.placa} — ${trabajo.nombre_servicio}`;

    elemento('campoRepuestos').hidden =
        !accion.endsWith('finalizar');

    elemento('repuestos').value = '';
    elemento('errorTrabajo').textContent = '';

    elemento('modalTrabajo').showModal();
};

const crearAccion = trabajo => {
    const opciones = {
        ASIGNADA: ['Iniciar', 'iniciar'],
        EN_PROCESO: ['Finalizar', 'finalizar'],
        FINALIZADA: ['Iniciar corrección', 'correccion/iniciar'],
        EN_CORRECCION: ['Finalizar corrección', 'correccion/finalizar']
    };

    const opcion = opciones[trabajo.estado_reparacion];

    if (!opcion) return '—';

    if (
        trabajo.estado_reparacion === 'ASIGNADA' &&
        trabajo.estado_cita !== 'CONFIRMADA'
    ) {
        return '—';
    }

    const boton = document.createElement('button');

    boton.type = 'button';
    boton.className = 'btn btn-danger btn-sm';
    boton.textContent = opcion[0];

    boton.addEventListener('click', () => {
        abrirOperacion(trabajo, opcion[1], opcion[0]);
    });

    return boton;
};

const renderizarDashboard = datos => {
    elemento('bienvenida').textContent =
        `Bienvenido, ${datos.tecnico}`;

    indicadores.forEach(id => {
        elemento(id).textContent = datos.resumen[id] ?? 0;
    });

    const proximos = trabajos.filter(trabajo =>
        ['ASIGNADA', 'EN_PROCESO', 'EN_CORRECCION']
            .includes(trabajo.estado_reparacion)
    ).slice(0, 5);

    crearTabla(
        'proximosTrabajos',
        ['Placa', 'Motocicleta', 'Servicio', 'Fecha', 'Estado'],
        proximos.map(t => [
            t.placa,
            nombreMoto(t),
            t.nombre_servicio,
            formatearFecha(t.fecha_cita),
            crearEstado(t.estado_reparacion)
        ])
    );
};

const renderizarAsignaciones = () => {
    const busqueda = elemento('buscarMoto').value;
    const estado = elemento('filtroEstado').value;

    const filtrados = trabajos.filter(t =>
        coincide(busqueda, [
            t.placa,
            t.linea,
            t.modelo,
            t.nombre_servicio
        ]) && (!estado || t.estado_reparacion === estado)
    );

    crearTabla(
        'listaAsignaciones',
        ['Placa', 'Motocicleta', 'Servicio', 'Fecha', 'Estado', 'Acciones'],
        filtrados.map(t => [
            t.placa,
            nombreMoto(t),
            t.nombre_servicio,
            formatearFecha(t.fecha_cita),
            crearEstado(t.estado_reparacion),
            crearAccion(t)
        ])
    );
};

const renderizarServicios = () => {
    const busqueda = elemento('buscarServicio').value;

    const filtrados = servicios.filter(s =>
        coincide(busqueda, [
            s.nombre_servicio,
            s.tipo_servicio,
            s.descripcion_servicio
        ])
    );

    crearTabla(
        'listaServicios',
        [
            'Servicio',
            'Descripción',
            'Tipo',
            'Precio',
            'Duración',
            'Garantía',
            'Complejidad'
        ],
        filtrados.map(s => [
            s.nombre_servicio,
            s.descripcion_servicio,
            s.tipo_servicio,
            formatearPrecio(s.precio_servicio),
            s.duracion_estimada,
            s.garantia_servicio,
            s.nivel_complejidad
        ])
    );
};

const renderizarReparaciones = () => {
    const busqueda = elemento('buscarReparacion').value;

    const filtrados = trabajos.filter(t =>
        ['ASIGNADA', 'EN_PROCESO', 'FINALIZADA', 'EN_CORRECCION']
            .includes(t.estado_reparacion) &&
        coincide(busqueda, [
            t.placa,
            t.nombre_servicio,
            t.linea,
            t.modelo
        ])
    );

    crearTabla(
        'listaReparaciones',
        ['Placa', 'Servicio', 'Inicio', 'Finalización', 'Estado', 'Acciones'],
        filtrados.map(t => [
            t.placa,
            t.nombre_servicio,
            formatearFecha(t.fecha_inicio_reparacion),
            formatearFecha(t.fecha_fin_reparacion),
            crearEstado(t.estado_reparacion),
            crearAccion(t)
        ])
    );
};

const renderizarHistorial = () => {
    const busqueda = elemento('buscarHistorial').value;

    const filtrados = historial.filter(h =>
        coincide(busqueda, [
            h.servicio,
            h.estado,
            estados[h.estado],
            h.repuestos_utilizados,
            h.placa_moto
        ])
    );

    crearTabla(
        'listaHistorial',
        ['Cita', 'Fecha', 'Servicio', 'Estado', 'Repuestos'],
        filtrados.map(h => [
            h.id_citas,
            formatearFecha(h.fecha),
            h.servicio,
            crearEstado(h.estado),
            h.repuestos_utilizados
        ])
    );
};

const cargarInformacion = async (avisar = false) => {
    if (!token || cargando) return false;

    const version = versionSesion;

    cargando = true;

    try {
        const resultados = await Promise.all([
            consultarAPI('/api/tecnico/dashboard'),
            consultarAPI('/api/tecnico/asignaciones'),
            consultarAPI('/api/tecnico/servicios'),
            consultarAPI('/api/tecnico/historial')
        ]);

        if (version !== versionSesion) return false;

        trabajos = resultados[1];
        servicios = resultados[2];
        historial = resultados[3];

        renderizarDashboard(resultados[0]);
        renderizarAsignaciones();
        renderizarServicios();
        renderizarReparaciones();
        renderizarHistorial();

        if (avisar) {
            notificar('Información actualizada correctamente.');
        }

        return true;

    } catch (error) {
        if (version === versionSesion) {
            notificar(error.message, 'danger');
        }

        return false;

    } finally {
        if (version === versionSesion) {
            cargando = false;
        }
    }
};

const cerrarSesion = (mensaje = '') => {
    versionSesion++;
    token = null;
    trabajos = [];
    servicios = [];
    historial = [];
    operacion = null;
    cargando = false;
    enviando = false;

    elemento('acceso').hidden = false;
    elemento('menu').hidden = true;
    elemento('panelTecnico').hidden = true;
    elemento('salir').hidden = true;

    elemento('login').reset();
    elemento('mensaje').textContent = mensaje;
    elemento('bienvenida').textContent = '';

    elemento('confirmarTrabajo').disabled = false;
    elemento('cancelar').disabled = false;

    if (elemento('modalTrabajo').open) {
        elemento('modalTrabajo').close();
    }

    indicadores.forEach(id => {
        elemento(id).textContent = '—';
    });

    [
        'proximosTrabajos',
        'listaAsignaciones',
        'listaServicios',
        'listaReparaciones',
        'listaHistorial'
    ].forEach(id => elemento(id).replaceChildren());

    [
        'buscarMoto',
        'buscarServicio',
        'buscarReparacion',
        'buscarHistorial',
        'filtroEstado',
        'repuestos'
    ].forEach(id => elemento(id).value = '');

    notificar('');

    window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
    );
};

elemento('login').addEventListener('submit', async evento => {
    evento.preventDefault();

    const boton = evento.currentTarget.querySelector('button');

    boton.disabled = true;
    elemento('mensaje').textContent = '';

    try {
        const datos = await consultarAPI(
            '/api/auth/login',
            'POST',
            {
                id_usuario: Number(elemento('usuario').value),
                password: elemento('password').value
            }
        );

        if (typeof datos.token !== 'string' || !datos.token) {
            throw new Error('No se recibió un token válido');
        }

        versionSesion++;
        token = datos.token;

        elemento('acceso').hidden = true;
        elemento('menu').hidden = false;
        elemento('panelTecnico').hidden = false;
        elemento('salir').hidden = false;

        elemento('login').reset();

        window.history.replaceState(null, '', '#dashboard');

        mostrarVista('dashboard');
        await cargarInformacion();

    } catch (error) {
        cerrarSesion(error.message);
    } finally {
        boton.disabled = false;
    }
});

elemento('formTrabajo').addEventListener('submit', async evento => {
    evento.preventDefault();

    if (!operacion || enviando || !token) return;

    const version = versionSesion;
    const trabajoActual = { ...operacion };

    enviando = true;

    elemento('confirmarTrabajo').disabled = true;
    elemento('cancelar').disabled = true;
    elemento('errorTrabajo').textContent = '';

    const datos = trabajoActual.accion.endsWith('finalizar')
        ? {
            repuestos_utilizados:
                elemento('repuestos').value.trim() || null
        }
        : {};

    try {
        const resultado = await consultarAPI(
            `/api/tecnico/reparaciones/${trabajoActual.id}/${trabajoActual.accion}`,
            'PATCH',
            datos
        );

        if (version !== versionSesion) return;

        elemento('modalTrabajo').close();
        operacion = null;

        const actualizado = await cargarInformacion();

        if (version === versionSesion) {
            notificar(
                actualizado
                    ? resultado.mensaje
                    : 'Operación realizada. Actualiza los datos para visualizar el cambio.',
                actualizado ? 'success' : 'warning'
            );
        }

    } catch (error) {
        if (version === versionSesion) {
            elemento('errorTrabajo').textContent = error.message;
        }

    } finally {
        if (version === versionSesion) {
            enviando = false;
            elemento('confirmarTrabajo').disabled = false;
            elemento('cancelar').disabled = false;
        }
    }
});

elemento('cancelar').addEventListener('click', () => {
    if (!enviando) {
        operacion = null;
        elemento('modalTrabajo').close();
    }
});

elemento('modalTrabajo').addEventListener('cancel', evento => {
    if (enviando) {
        evento.preventDefault();
    } else {
        operacion = null;
    }
});

elemento('salir').addEventListener('click', () => cerrarSesion());


elemento('buscarMoto').addEventListener('input', renderizarAsignaciones);
elemento('filtroEstado').addEventListener('change', renderizarAsignaciones);
elemento('buscarServicio').addEventListener('input', renderizarServicios);
elemento('buscarReparacion').addEventListener('input', renderizarReparaciones);
elemento('buscarHistorial').addEventListener('input', renderizarHistorial);

window.addEventListener('hashchange', () => {
    mostrarVista(window.location.hash.slice(1));
});

cerrarSesion();
