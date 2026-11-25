let token = null;
let versionSesion = 0;
let trabajos = null;
let servicios = null;
let historial = null;
let operacion = null;
let cargando = false;
let enviando = false;
let cerrando = false;
let renovacionPendiente = null;
let actividadPendiente = false;

let ultimaInteraccion = 0;
let ultimoContactoAPI = 0;
let vencimientoJWT = 0;
let limiteInactividad = 0;
let limiteSesion = 0;
let ultimoIntentoRenovacion = 0;

const INACTIVIDAD_MS = 15 * 60 * 1000;
const SESION_MAXIMA_MS = 2 * 60 * 60 * 1000;
const JWT_MS = 15 * 60 * 1000;
const AVISO_MS = 2 * 60 * 1000;
const RENOVACION_ANTICIPADA_MS = 60 * 1000;
const INTERVALO_ACTIVIDAD_MS = 30 * 1000;
const ESPERA_API_MS = 15000;

const elemento = id => document.getElementById(id);

const vistas = [
    'dashboard',
    'asignaciones',
    'servicios',
    'reparaciones',
    'historial',
    'perfil'
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

const actualizarTiempos = datos => {
    const ahora = Date.now();
    const sesion = datos.sesion || {};
    const restantes = Number(sesion.segundos_restantes);
    const inactividad = Number(sesion.segundos_inactividad_restantes);

    if (Number.isFinite(restantes) && restantes > 0) {
        limiteSesion = ahora + restantes * 1000;
    } else if (!limiteSesion) {
        limiteSesion = ahora + SESION_MAXIMA_MS;
    }

    if (Number.isFinite(inactividad) && inactividad > 0) {
        limiteInactividad = ahora + inactividad * 1000;
    } else if (!limiteInactividad) {
        limiteInactividad = ahora + INACTIVIDAD_MS;
    }

    vencimientoJWT = ahora + JWT_MS;
};

const notificar = (mensaje, tipo = 'success') => {
    const aviso = elemento('notificacion');
    aviso.className = `alert alert-${tipo}`;
    aviso.textContent = mensaje;
    aviso.hidden = !mensaje;
};

const mostrarAvisoSesion = mensaje => {
    const aviso = elemento('avisoSesion');
    aviso.hidden = !mensaje;

    if (aviso.textContent !== mensaje) {
        aviso.textContent = mensaje;
    }
};

const obtenerIdUsuario = () => {
    const contenido = token?.split('.')[1];
    if (!contenido) return '—';

    try {
        const datos = JSON.parse(atob(contenido.replace(/-/g, '+').replace(/_/g, '/')));
        return datos.id_usuario ?? '—';
    } catch {
        return '—';
    }
};

const renderizarPerfil = (perfil = {}) => {
    elemento('perfilNombre').textContent = perfil.nombre_completo || '—';
    elemento('perfilUsuario').textContent = perfil.id_usuario ?? obtenerIdUsuario();
    elemento('perfilEspecialidad').textContent = perfil.especialidad || '—';
    elemento('perfilTelefono').textContent = perfil.telefono || '—';
};

const cerrarSesionLocal = (mensaje = '') => {
    const panelVisible = !elemento('panelTecnico').hidden;
    versionSesion++;

    token = null;
    trabajos = null;
    servicios = null;
    historial = null;
    operacion = null;
    cargando = false;
    enviando = false;
    actividadPendiente = false;

    ultimaInteraccion = 0;
    ultimoContactoAPI = 0;
    vencimientoJWT = 0;
    limiteInactividad = 0;
    limiteSesion = 0;
    ultimoIntentoRenovacion = 0;

    elemento('acceso').hidden = false;
    elemento('menu').hidden = true;
    elemento('panelTecnico').hidden = true;
    elemento('salir').hidden = true;

    elemento('login').reset();
    elemento('mensaje').textContent = mensaje;
    elemento('bienvenida').textContent = '';
    elemento('actualizarPanel').disabled = false;
    elemento('estadoCarga').textContent = '';
    renderizarPerfil();

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
    ].forEach(id => {
        elemento(id).value = '';
    });

    notificar('');
    mostrarAvisoSesion('');

    if (panelVisible) elemento('usuario').focus();
};

const terminarSesion = mensaje => {
    if (token) cerrarSesionLocal(mensaje);
};

const solicitarCambioSesion = (ruta, opciones = {}) => {
    const enviar = () => fetch(ruta, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(ESPERA_API_MS),
        ...opciones
    });

    return navigator.locks
        ? navigator.locks.request('mivo-sesion-tecnica', enviar)
        : enviar();
};

const renovarToken = async () => {
    if (!token) throw new Error('Inicia sesión nuevamente');
    if (renovacionPendiente) return renovacionPendiente;

    const version = versionSesion;
    const tarea = (async () => {
        const respuesta = await solicitarCambioSesion('/api/auth/renovar', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const datos = await respuesta.json().catch(() => ({}));

        if (version !== versionSesion) {
            throw new Error('La sesión ha cambiado');
        }

        if (respuesta.status === 401 || respuesta.status === 403) {
            terminarSesion('Tu sesión ha expirado. Inicia sesión nuevamente.');
            throw new Error('Sesión expirada');
        }

        if (!respuesta.ok || !datos.token) {
            throw new Error(datos.error || 'No se pudo renovar la sesión');
        }

        token = datos.token;
        actualizarTiempos(datos);
        return token;
    })();

    renovacionPendiente = tarea;

    try {
        return await tarea;
    } finally {
        if (renovacionPendiente === tarea) renovacionPendiente = null;
    }
};

const consultarAPI = async (ruta, metodo = 'GET', datos) => {
    const version = versionSesion;
    const protegida = ruta.startsWith('/api/tecnico/');

    if (protegida && token && Date.now() >= vencimientoJWT - RENOVACION_ANTICIPADA_MS) {
        await renovarToken();
    }

    const realizarSolicitud = async () => {
        const headers = {};
        const tokenEnviado = token;

        if (datos !== undefined) {
            headers['Content-Type'] = 'application/json';
        }

        if (protegida && tokenEnviado) {
            headers.Authorization = `Bearer ${tokenEnviado}`;
        }

        const opciones = {
            method: metodo,
            headers,
            credentials: 'same-origin',
            cache: 'no-store',
            body: datos === undefined ? undefined : JSON.stringify(datos)
        };

        const respuesta = ruta === '/api/auth/login'
            ? await solicitarCambioSesion(ruta, opciones)
            : await fetch(ruta, {
                ...opciones,
                signal: AbortSignal.timeout(ESPERA_API_MS)
            });

        return {
            respuesta,
            tokenEnviado,
            resultado: await respuesta.json().catch(() => ({}))
        };
    };

    let solicitud = await realizarSolicitud();

    if (version !== versionSesion) {
        throw new Error('La sesión ha cambiado');
    }

    if (protegida && solicitud.respuesta.status === 401 && token) {
        if (token === solicitud.tokenEnviado) await renovarToken();

        if (version !== versionSesion) {
            throw new Error('La sesión ha cambiado');
        }

        solicitud = await realizarSolicitud();
    }

    if (version !== versionSesion) {
        throw new Error('La sesión ha cambiado');
    }

    if (!solicitud.respuesta.ok) {
        const estado = solicitud.respuesta.status;

        if (protegida && [401, 403].includes(estado)) {
            terminarSesion(
                estado === 403
                    ? 'Tu acceso técnico ya no está autorizado.'
                    : 'Tu sesión ha expirado. Inicia sesión nuevamente.'
            );
        }

        const error = new Error(
            solicitud.resultado.error || 'No se pudo completar la solicitud'
        );
        error.status = estado;
        throw error;
    }

    if (protegida && token) {
        ultimoContactoAPI = Date.now();
        limiteInactividad = ultimoContactoAPI + INACTIVIDAD_MS;
    }

    return solicitud.resultado;
};

const comprobarVigencia = () => {
    if (!token || cerrando) return;

    const ahora = Date.now();
    const vencimiento = Math.min(
        limiteSesion,
        limiteInactividad,
        ultimaInteraccion + INACTIVIDAD_MS
    );
    const restante = vencimiento - ahora;

    if (restante <= 0) {
        terminarSesion('Tu sesión terminó por inactividad o por alcanzar el límite de 2 horas.');
        return;
    }

    if (restante <= AVISO_MS) {
        const minutos = Math.ceil(restante / 60000);
        mostrarAvisoSesion(`Tu sesión puede terminar en ${minutos} minuto(s).`);
    } else {
        mostrarAvisoSesion('');
    }

    if (
        ahora >= vencimientoJWT - RENOVACION_ANTICIPADA_MS &&
        ahora - ultimaInteraccion < INTERVALO_ACTIVIDAD_MS &&
        ahora - ultimoIntentoRenovacion >= INTERVALO_ACTIVIDAD_MS &&
        document.visibilityState === 'visible'
    ) {
        ultimoIntentoRenovacion = ahora;

        renovarToken().catch(error => {
            if (token) notificar(error.message, 'danger');
        });
    }
};

const registrarInteraccion = () => {
    if (!token || cerrando) return;

    const ahora = Date.now();

    if (
        ahora >= limiteSesion ||
        ahora >= limiteInactividad ||
        ahora >= ultimaInteraccion + INACTIVIDAD_MS
    ) {
        comprobarVigencia();
        return;
    }

    ultimaInteraccion = ahora;

    if (!actividadPendiente && ahora - ultimoContactoAPI >= INTERVALO_ACTIVIDAD_MS) {
        const version = versionSesion;
        actividadPendiente = true;

        consultarAPI('/api/tecnico/dashboard')
            .then(comprobarVigencia)
            .catch(error => {
                if (version === versionSesion && token) {
                    notificar(error.message, 'danger');
                }
            })
            .finally(() => {
                if (version === versionSesion) actividadPendiente = false;
            });
    }
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

    const seleccionada = vistas.includes(nombre) ? nombre : 'dashboard';

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

    const titulo = elemento(seleccionada).querySelector('h2');
    titulo.tabIndex = -1;
    titulo.focus({ preventScroll: true });
    window.scrollTo(0, 0);
};

const crearTabla = (contenedor, titulos, registros, hayFiltro = false) => {
    const destino = elemento(contenedor);
    destino.replaceChildren();

    if (!registros?.length) {
        const vacio = document.createElement('div');
        vacio.className = 'sin-registros';

        const icono = document.createElement('i');
        icono.className = 'bi bi-inbox';

        const mensaje = document.createElement('span');

        if (registros === null) {
            mensaje.textContent = 'Datos no disponibles. Usa Actualizar datos para reintentar.';
        } else if (hayFiltro) {
            mensaje.textContent = 'Ningún registro coincide con los filtros.';
        } else {
            mensaje.textContent = 'No hay registros disponibles.';
        }

        vacio.append(icono, mensaje);
        destino.appendChild(vacio);
        return;
    }

    const envoltura = document.createElement('div');
    envoltura.className = 'table-responsive';
    envoltura.tabIndex = 0;
    envoltura.setAttribute('role', 'region');
    envoltura.setAttribute('aria-label', destino.closest('.vista').querySelector('h2').textContent);

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

    operacion = { id: trabajo.id_citas, accion };
    elemento('tituloModal').textContent = titulo;
    elemento('detalleTrabajo').textContent = `${trabajo.placa} — ${trabajo.nombre_servicio}`;
    elemento('campoRepuestos').hidden = !accion.endsWith('finalizar');
    elemento('repuestos').value = '';
    elemento('errorTrabajo').textContent = '';
    elemento('errorTrabajo').hidden = true;
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

    if (trabajo.estado_reparacion === 'ASIGNADA' && trabajo.estado_cita !== 'CONFIRMADA') {
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
    if (datos) {
        elemento('bienvenida').textContent = datos.tecnico ? `Bienvenido, ${datos.tecnico}` : '';

        indicadores.forEach(id => {
            elemento(id).textContent = datos.resumen?.[id] ?? '—';
        });
    }

    const proximos = trabajos?.filter(trabajo =>
        ['ASIGNADA', 'EN_PROCESO', 'EN_CORRECCION'].includes(trabajo.estado_reparacion)
    ).slice(0, 5);

    crearTabla(
        'proximosTrabajos',
        ['Placa', 'Motocicleta', 'Servicio', 'Fecha', 'Estado'],
        proximos?.map(t => [
            t.placa,
            nombreMoto(t),
            t.nombre_servicio,
            formatearFecha(t.fecha_cita),
            crearEstado(t.estado_reparacion)
        ]) ?? null
    );
};

const renderizarAsignaciones = () => {
    const busqueda = elemento('buscarMoto').value;
    const estado = elemento('filtroEstado').value;

    const filtrados = trabajos?.filter(t =>
        coincide(busqueda, [t.placa, t.linea, t.modelo, t.nombre_servicio]) &&
        (!estado || t.estado_reparacion === estado)
    );

    crearTabla(
        'listaAsignaciones',
        ['Placa', 'Motocicleta', 'Servicio', 'Fecha', 'Estado', 'Acciones'],
        filtrados?.map(t => [
            t.placa,
            nombreMoto(t),
            t.nombre_servicio,
            formatearFecha(t.fecha_cita),
            crearEstado(t.estado_reparacion),
            crearAccion(t)
        ]) ?? null,
        Boolean(busqueda.trim() || estado)
    );
};

const renderizarServicios = () => {
    const busqueda = elemento('buscarServicio').value;

    const filtrados = servicios?.filter(s =>
        coincide(busqueda, [s.nombre_servicio, s.tipo_servicio, s.descripcion_servicio])
    );

    crearTabla(
        'listaServicios',
        ['Servicio', 'Descripción', 'Tipo', 'Precio', 'Duración', 'Garantía', 'Complejidad'],
        filtrados?.map(s => [
            s.nombre_servicio,
            s.descripcion_servicio,
            s.tipo_servicio,
            formatearPrecio(s.precio_servicio),
            s.duracion_estimada,
            s.garantia_servicio,
            s.nivel_complejidad
        ]) ?? null,
        Boolean(busqueda.trim())
    );
};

const renderizarReparaciones = () => {
    const busqueda = elemento('buscarReparacion').value;

    const filtrados = trabajos?.filter(t =>
        ['ASIGNADA', 'EN_PROCESO', 'FINALIZADA', 'EN_CORRECCION'].includes(t.estado_reparacion) &&
        coincide(busqueda, [t.placa, t.nombre_servicio, t.linea, t.modelo])
    );

    crearTabla(
        'listaReparaciones',
        ['Placa', 'Servicio', 'Inicio', 'Finalización', 'Estado', 'Acciones'],
        filtrados?.map(t => [
            t.placa,
            t.nombre_servicio,
            formatearFecha(t.fecha_inicio_reparacion),
            formatearFecha(t.fecha_fin_reparacion),
            crearEstado(t.estado_reparacion),
            crearAccion(t)
        ]) ?? null,
        Boolean(busqueda.trim())
    );
};

const renderizarHistorial = () => {
    const busqueda = elemento('buscarHistorial').value;

    const filtrados = historial?.filter(h =>
        coincide(busqueda, [
            h.servicio,
            h.estado,
            estados[h.estado],
            h.repuestos_utilizados,
            h.placa_moto,
            h.cliente
        ])
    );

    crearTabla(
        'listaHistorial',
        ['Cita', 'Fecha', 'Placa', 'Cliente', 'Servicio', 'Precio', 'Estado', 'Repuestos'],
        filtrados?.map(h => [
            h.id_citas,
            formatearFecha(h.fecha),
            h.placa_moto,
            h.cliente,
            h.servicio,
            formatearPrecio(h.precio),
            crearEstado(h.estado),
            h.repuestos_utilizados
        ]) ?? null,
        Boolean(busqueda.trim())
    );
};

const cargarInformacion = async () => {
    if (!token || cargando) return false;

    const version = versionSesion;
    const boton = elemento('actualizarPanel');
    const estadoCarga = elemento('estadoCarga');

    cargando = true;
    boton.disabled = true;
    estadoCarga.textContent = 'Cargando datos…';

    try {
        const [dashboard, asignaciones, catalogo, registros, perfil] = await Promise.allSettled([
            consultarAPI('/api/tecnico/dashboard'),
            consultarAPI('/api/tecnico/asignaciones'),
            consultarAPI('/api/tecnico/servicios'),
            consultarAPI('/api/tecnico/historial'),
            consultarAPI('/api/tecnico/perfil')
        ]);

        if (version !== versionSesion) return false;

        if (asignaciones.status === 'fulfilled') trabajos = asignaciones.value;
        if (catalogo.status === 'fulfilled') servicios = catalogo.value;
        if (registros.status === 'fulfilled') historial = registros.value;

        renderizarDashboard(dashboard.value);
        renderizarAsignaciones();
        renderizarServicios();
        renderizarReparaciones();
        renderizarHistorial();

        const perfilNoDisponible = perfil.reason?.status === 404;

        if (perfil.status === 'fulfilled') {
            renderizarPerfil(perfil.value);
        } else if (perfilNoDisponible) {
            renderizarPerfil({ nombre_completo: dashboard.value?.tecnico });
        }

        const fallos = [
            [dashboard, 'resumen'],
            [asignaciones, 'asignaciones y reparaciones'],
            [catalogo, 'servicios'],
            [registros, 'historial'],
            ...(perfilNoDisponible ? [] : [[perfil, 'perfil']])
        ].filter(([resultado]) => resultado.status === 'rejected')
            .map(([, nombre]) => nombre);

        if (fallos.length) {
            notificar(
                `No se pudieron actualizar: ${fallos.join(', ')}. Usa Actualizar datos para reintentar.`,
                'warning'
            );
        }

        return fallos.length === 0;
    } catch {
        if (version === versionSesion) {
            notificar(
                'No se pudo mostrar la información. Usa Actualizar datos para reintentar.',
                'danger'
            );
        }
        return false;
    } finally {
        if (version === versionSesion) {
            cargando = false;
            boton.disabled = false;
            estadoCarga.textContent = '';
        }
    }
};

const activarSesion = async datos => {
    if (!datos || typeof datos.token !== 'string') {
        throw new Error('No se recibió un token válido');
    }

    versionSesion++;
    token = datos.token;
    ultimaInteraccion = Date.now();
    ultimoContactoAPI = Date.now();
    limiteSesion = 0;
    limiteInactividad = 0;

    actualizarTiempos(datos);

    elemento('acceso').hidden = true;
    elemento('menu').hidden = false;
    elemento('panelTecnico').hidden = false;
    elemento('salir').hidden = false;
    elemento('login').reset();

    mostrarVista(window.location.hash.slice(1) || 'dashboard');
    await cargarInformacion();
};

const restaurarSesion = async () => {
    const boton = elemento('login').querySelector('button');
    const version = versionSesion;
    boton.disabled = true;

    try {
        const respuesta = await solicitarCambioSesion('/api/auth/renovar');
        const datos = await respuesta.json().catch(() => ({}));

        if (version !== versionSesion) return;

        if (respuesta.ok && datos.token) {
            await activarSesion(datos);
        } else if (respuesta.status >= 500) {
            elemento('mensaje').textContent = 'No se pudo comprobar la sesión anterior.';
        }
    } catch {
        elemento('mensaje').textContent = 'No se pudo comprobar la sesión anterior.';
    } finally {
        boton.disabled = false;
    }
};

elemento('login').addEventListener('submit', async evento => {
    evento.preventDefault();

    const boton = evento.currentTarget.querySelector('button');
    boton.disabled = true;
    elemento('mensaje').textContent = '';

    try {
        const datos = await consultarAPI('/api/auth/login', 'POST', {
            id_usuario: Number(elemento('usuario').value),
            password: elemento('password').value
        });

        await activarSesion(datos);
    } catch (error) {
        if (token) {
            notificar(error.message, 'danger');
        } else {
            elemento('mensaje').textContent = error.message;
        }
    } finally {
        boton.disabled = false;
    }
});

elemento('formTrabajo').addEventListener('submit', async evento => {
    evento.preventDefault();

    if (!operacion || enviando || !token) return;

    const version = versionSesion;
    const trabajoActual = { ...operacion };
    const errorTrabajo = elemento('errorTrabajo');

    enviando = true;
    elemento('confirmarTrabajo').disabled = true;
    elemento('cancelar').disabled = true;
    errorTrabajo.textContent = '';
    errorTrabajo.hidden = true;

    const datos = trabajoActual.accion.endsWith('finalizar')
        ? { repuestos_utilizados: elemento('repuestos').value.trim() || null }
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
                    : 'Operación realizada. Usa Actualizar datos para consultar el estado.',
                actualizado ? 'success' : 'warning'
            );
        }
    } catch (error) {
        if (version === versionSesion) {
            errorTrabajo.textContent = error.name === 'TimeoutError' || error instanceof TypeError
                ? 'No se pudo confirmar el resultado. Cierra esta ventana y actualiza los datos antes de reintentar.'
                : error.message;

            errorTrabajo.hidden = false;
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

elemento('salir').addEventListener('click', async () => {
    if (!token || cerrando) return;

    cerrando = true;
    elemento('salir').disabled = true;

    try {
        if (renovacionPendiente) {
            await renovacionPendiente.catch(() => {});
        }

        const respuesta = await solicitarCambioSesion('/api/auth/logout', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!respuesta.ok) {
            throw new Error('No se pudo cerrar la sesión');
        }

        cerrarSesionLocal();
    } catch {
        if (token) {
            notificar('No se pudo cerrar la sesión en el servidor. Inténtalo nuevamente.', 'danger');
        }
    } finally {
        cerrando = false;
        elemento('salir').disabled = false;
    }
});

elemento('actualizarPanel').addEventListener('click', async () => {
    notificar('');
    await cargarInformacion();
});

elemento('buscarMoto').addEventListener('input', renderizarAsignaciones);
elemento('filtroEstado').addEventListener('change', renderizarAsignaciones);
elemento('buscarServicio').addEventListener('input', renderizarServicios);
elemento('buscarReparacion').addEventListener('input', renderizarReparaciones);
elemento('buscarHistorial').addEventListener('input', renderizarHistorial);

window.addEventListener('hashchange', () => {
    mostrarVista(window.location.hash.slice(1));
});

document.addEventListener('pointerdown', registrarInteraccion);
document.addEventListener('keydown', registrarInteraccion);

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') comprobarVigencia();
});

window.addEventListener('focus', comprobarVigencia);
setInterval(comprobarVigencia, 1000);

cerrarSesionLocal();
restaurarSesion();