class SolicitudesModule {
    constructor() {
        this.currentSolicitudPhotos = []; // Para el visor de fotos
        this.currentSolicitudData = null; // Datos actuales de la solicitud
        console.log('SolicitudesModule initialized');
        this.setupEventListeners();
        this.createModals();
        this.setupModalEventListeners();
    }

    // Método para cargar el módulo (llamado desde app.js)
    loadModule() {
        console.log('Loading solicitudes module...');
        this.loadSolicitudes();
    }

    createModals() {
        // Solo crear modales si no existen
        if (document.getElementById('edit-modal')) {
            console.log('Modals already exist');
            return;
        }

        const modalHTML = `
        <!-- Modal de Edición de Solicitud -->
        <div id="edit-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Editar Solicitud</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="edit-form">
                        <div class="form-group">
                            <label for="edit-nombresocio">Nombre del Socio:</label>
                            <input type="text" id="edit-nombresocio" name="nombresocio" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-cedulasocio">Cédula:</label>
                            <input type="text" id="edit-cedulasocio" name="cedulasocio" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-monto">Monto (USD):</label>
                            <input type="number" id="edit-monto" name="monto" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-estado">Estado:</label>
                            <select id="edit-estado" name="estado" required>
                                <option value="PENDIENTE">PENDIENTE</option>
                                <option value="EN PROCESO">EN PROCESO</option>
                                <option value="APROBADA">APROBADA</option>
                                <option value="RECHAZADA">RECHAZADA</option>
                                <option value="ANULADA">ANULADA</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-close="modal">
                        <i class="fas fa-times"></i>
                        Cancelar
                    </button>
                    <button type="submit" form="edit-form" class="btn btn-primary">
                        <i class="fas fa-save"></i>
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal de Confirmación de Eliminación -->
        <div id="delete-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Confirmar Eliminación</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <p>¿Estás seguro de que deseas eliminar esta solicitud? Esta acción no se puede deshacer.</p>
                    <div class="solicitud-info">
                        <strong>Solicitud ID:</strong> <span id="delete-solicitud-id"></span><br>
                        <strong>Socio:</strong> <span id="delete-solicitud-socio"></span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-close="modal">
                        <i class="fas fa-times"></i>
                        Cancelar
                    </button>
                    <button type="button" id="confirm-delete-btn" class="btn btn-danger">
                        <i class="fas fa-trash-alt"></i>
                        Eliminar Solicitud
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal de Detalles de Solicitud -->
        <div id="details-modal" class="modal">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>Detalles de la Solicitud</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div id="details-content">
                        <!-- Contenido dinámico -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-info" id="details-show-info">
                        <i class="fas fa-info-circle"></i>
                        Ver Información
                    </button>
                    <button type="button" class="btn btn-secondary" data-close="modal">
                        <i class="fas fa-check"></i>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        console.log('Modals created successfully');
    }

    // Método para verificar autenticación y conexión con la base de datos
    async checkConnectionAndAuth() {
        try {
            console.log('Checking connection and auth...');
            console.log('window.db:', window.db);
            
            if (!window.db) {
                throw new Error('Base de datos no inicializada');
            }

            console.log('Getting user...');
            const { data: { user }, error: authError } = await window.db.auth.getUser();
            console.log('User data:', user);
            console.log('Auth error:', authError);
            
            if (authError || !user) {
                this.showCustomAlert('No hay una sesión activa. Redirigiendo al login...', 'warning', 'Sesión Expirada');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
                return false;
            }

            console.log('Auth check passed');
            return true;
        } catch (error) {
            console.error('Error checking connection and auth:', error);
            this.showCustomAlert('Error de conexión: ' + error.message, 'error', 'Error de Conexión');
            return false;
        }
    }

    async loadSolicitudes() {
        console.log('loadSolicitudes called');
        const isReady = await this.checkConnectionAndAuth();
        console.log('isReady:', isReady);
        if (!isReady) return;

        try {
            const tableBody = document.querySelector('#solicitudes-table tbody');
            console.log('tableBody found:', !!tableBody);
            if (!tableBody) {
                console.error('Tabla de solicitudes no encontrada');
                return;
            }

            // Mostrar indicador de carga
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Cargando solicitudes...</td></tr>';

            console.log('Fetching data from Supabase...');
            const { data: solicitudes, error } = await window.db
                .from('ic_solicitud_de_credito')
                .select('*')
                .order('solicitudid', { ascending: false });

            console.log('Supabase response - data:', solicitudes);
            console.log('Supabase response - error:', error);

            if (error) {
                console.error('Error al cargar solicitudes:', error);
                this.showCustomAlert('Error al cargar las solicitudes: ' + error.message, 'error', 'Error de Carga');
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error al cargar datos</td></tr>';
                return;
            }

            if (!solicitudes || solicitudes.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No hay solicitudes registradas</td></tr>';
                return;
            }

            // Agrupar solicitudes por estado con orden específico
            const estadosOrden = ['PENDIENTE', 'COLOCADA', 'APROBADO', 'EN REVISIÓN', 'RECHAZADO'];
            const solicitudesAgrupadas = {};
            
            // Inicializar grupos
            estadosOrden.forEach(estado => {
                solicitudesAgrupadas[estado] = [];
            });

            // Agrupar solicitudes
            solicitudes.forEach(solicitud => {
                const estado = (solicitud.estado || 'PENDIENTE').toUpperCase();
                if (solicitudesAgrupadas[estado]) {
                    solicitudesAgrupadas[estado].push(solicitud);
                } else {
                    // Si el estado no está en el orden predefinido, agregarlo al final
                    if (!solicitudesAgrupadas[estado]) {
                        solicitudesAgrupadas[estado] = [];
                    }
                    solicitudesAgrupadas[estado].push(solicitud);
                }
            });

            // Limpiar la tabla
            tableBody.innerHTML = '';

            // Renderizar grupos con acordeón
            let grupoIndex = 0;
            for (const [estado, solicitudesDelEstado] of Object.entries(solicitudesAgrupadas)) {
                if (solicitudesDelEstado.length === 0) continue; // Solo mostrar grupos que tienen solicitudes

                grupoIndex++;
                const isFirstGroup = grupoIndex === 1;

                // Crear fila de encabezado del grupo (acordeón)
                const headerRow = document.createElement('tr');
                headerRow.className = 'group-header';
                headerRow.innerHTML = `
                    <td colspan="7" class="group-title" data-group="${estado}">
                        <div class="group-header-content">
                            <i class="fas ${estado === 'PENDIENTE' ? 'fa-chevron-down' : 'fa-chevron-right'} group-toggle" data-target="group-${estado}"></i>
                            <span class="status-badge status-${estado.toLowerCase().replace(/\s+/g, '-')}">${estado}</span>
                            <span class="group-count">(${solicitudesDelEstado.length} solicitud${solicitudesDelEstado.length !== 1 ? 'es' : ''})</span>
                        </div>
                    </td>
                `;
                tableBody.appendChild(headerRow);

                // Llenar las solicitudes del grupo directamente en el tbody principal
                solicitudesDelEstado.forEach(solicitud => {
                    const row = document.createElement('tr');
                    row.className = `group-item ${estado === 'PENDIENTE' ? 'group-item-visible' : 'group-item-hidden'}`;
                    row.setAttribute('data-group', `group-${estado}`);
                    const monto = solicitud.monto ? parseFloat(solicitud.monto).toLocaleString() : 'No especificado';
                    
                    row.innerHTML = `
                        <td><strong>#${solicitud.solicitudid || 'N/A'}</strong></td>
                        <td>${solicitud.nombresocio || 'No especificado'}</td>
                        <td>${solicitud.cedulasocio || 'No especificado'}</td>
                        <td><strong>$${monto}</strong></td>
                        <td>${this.getStatusBadge(solicitud.estado || 'PENDIENTE')}</td>
                        <td>${this.formatDateOnly(solicitud.created_at, solicitud)}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-info btn-view" data-id="${solicitud.solicitudid}" title="Ver detalles">
                                    <i class="fas fa-eye"></i>
                                    Ver
                                </button>
                            </div>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            }

            // Agregar event listeners para el acordeón
            this.setupAccordionEventListeners();

            // Agregar event listeners a los botones
            this.setupTableEventListeners();

            console.log(`Cargadas ${solicitudes.length} solicitudes en ${grupoIndex} grupos`);

        } catch (error) {
            console.error('Error inesperado al cargar solicitudes:', error);
            this.showCustomAlert('Error inesperado: ' + error.message, 'error', 'Error');
        }
    }

    setupTableEventListeners() {
        // Event listeners para botones de Ver
        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const solicitudId = e.currentTarget.getAttribute('data-id');
                console.log('View button clicked for ID:', solicitudId, 'type:', typeof solicitudId);
                this.viewSolicitudDetails(solicitudId); // Usar como string
            });
        });
    }

    setupAccordionEventListeners() {
        // Event listeners para los toggles del acordeón
        document.querySelectorAll('.group-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetId = toggle.getAttribute('data-target');
                const groupItems = document.querySelectorAll(`tr[data-group="${targetId}"]`);
                const isExpanded = toggle.classList.contains('fa-chevron-down');

                groupItems.forEach(item => {
                    if (isExpanded) {
                        item.classList.remove('group-item-visible');
                        item.classList.add('group-item-hidden');
                    } else {
                        item.classList.remove('group-item-hidden');
                        item.classList.add('group-item-visible');
                    }
                });

                if (isExpanded) {
                    toggle.classList.remove('fa-chevron-down');
                    toggle.classList.add('fa-chevron-right');
                } else {
                    toggle.classList.remove('fa-chevron-right');
                    toggle.classList.add('fa-chevron-down');
                }
            });
        });

        // También permitir click en toda la fila del header
        document.querySelectorAll('.group-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const toggle = header.querySelector('.group-toggle');
                if (toggle) {
                    toggle.click();
                }
            });
        });
    }

    getStatusBadge(estado) {
        const estadoClean = (estado || 'pendiente').toLowerCase().replace(/\s+/g, '-');
        const estadoText = estado || 'PENDIENTE';
        return `<span class="status-badge status-${estadoClean}">${estadoText}</span>`;
    }

    // Función para extraer fecha del ID de solicitud (formato yyyyMMddHHmmssSSS)
    extractDateFromSolicitudId(solicitudId) {
        if (!solicitudId || solicitudId.length < 8) {
            return null;
        }
        
        try {
            const year = solicitudId.substring(0, 4);
            const month = solicitudId.substring(4, 6);
            const day = solicitudId.substring(6, 8);
            
            // Crear fecha en formato ISO (YYYY-MM-DD)
            const dateString = `${year}-${month}-${day}`;
            const date = new Date(dateString);
            
            if (!isNaN(date.getTime())) {
                return date;
            }
        } catch (error) {
            console.log('Error extracting date from ID:', solicitudId, error);
        }
        
        return null;
    }

    // Función para formatear solo la fecha (sin hora)
    formatDateOnly(dateString, fallbackFields = {}) {
        // Intentar con diferentes campos posibles
        const possibleDates = [
            dateString,
            fallbackFields.fechasolicitud,
            fallbackFields.fecha,
            fallbackFields.created_at,
            fallbackFields.updated_at
        ].filter(Boolean);

        for (let dateValue of possibleDates) {
            if (!dateValue) continue;
            
            try {
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) {
                    const months = [
                        'ene', 'feb', 'mar', 'abr', 'may', 'jun',
                        'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
                    ];
                    
                    const day = date.getDate();
                    const month = months[date.getMonth()];
                    const year = date.getFullYear();
                    
                    return `${day} ${month} ${year}`;
                }
            } catch (error) {
                console.log('Error parsing date:', dateValue, error);
                continue;
            }
        }
        
        // Si no hay fechas válidas, intentar extraer del ID de solicitud
        if (fallbackFields.solicitudid) {
            const extractedDate = this.extractDateFromSolicitudId(fallbackFields.solicitudid);
            if (extractedDate) {
                const months = [
                    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
                    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
                ];
                
                const day = extractedDate.getDate();
                const month = months[extractedDate.getMonth()];
                const year = extractedDate.getFullYear();
                
                return `${day} ${month} ${year}`;
            }
        }
        
        return 'N/A';
    }

    formatSolicitudId(solicitudId) {
        console.log('Formatting date for ID:', solicitudId);
        if (!solicitudId || solicitudId.length < 14) {
            return 'Fecha no válida';
        }
    
        const year = solicitudId.substring(0, 4);
        const month = parseInt(solicitudId.substring(4, 6), 10) - 1; // month is 0-indexed
        const day = solicitudId.substring(6, 8);
        const hourStr = solicitudId.substring(8, 10);
        const minute = solicitudId.substring(10, 12);
        const hour = parseInt(hourStr, 10);
    
        const date = new Date(year, month, day, hour, minute);
    
        const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        const dateString = new Intl.DateTimeFormat('es-ES', dateOptions).format(date);
    
        let timeOfDay;
        if (hour >= 18 || hour < 6) {
            timeOfDay = 'de la noche';
        } else if (hour >= 6 && hour < 12) {
            timeOfDay = 'de la mañana';
        } else if (hour >= 12 && hour < 13) {
            timeOfDay = 'del día';
        } else { // 13 to 17
            timeOfDay = 'de la tarde';
        }
    
        const result = `${dateString} a las ${hourStr} y ${minute} ${timeOfDay}`;
        console.log('Formatted date:', result);
        return result;
    }

    setupEventListeners() {
        // Event listener para el refresh de solicitudes
        const refreshBtn = document.getElementById('refresh-solicitudes');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadSolicitudes();
            });
        }

        // Event listener para el botón "Regresar"
        const backBtn = document.getElementById('back-to-solicitudes');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.backToSolicitudes();
            });
        }

        const savePdfBtn = document.getElementById('save-pdf-btn');
        if (savePdfBtn) {
            savePdfBtn.addEventListener('click', async () => {
                console.log('Generate PDF button clicked');
                
                // Activar loader
                savePdfBtn.classList.add('loading');
                
                try {
                    await this.generatePDF();
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    this.showCustomAlert('Error al generar el PDF: ' + error.message, 'error');
                } finally {
                    // Desactivar loader
                    savePdfBtn.classList.remove('loading');
                }
            });
        }
    }

    setupModalEventListeners() {
        // Event listeners para cerrar modales
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close') || e.target.hasAttribute('data-close')) {
                this.closeModal(e.target.closest('.modal').id);
            }
        });

        // Cerrar modal al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Event listener para el formulario de edición
        const editForm = document.getElementById('edit-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEditSolicitud();
            });
        }

        // Event listener para confirmar eliminación
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                this.deleteSolicitud();
            });
        }
    }

    // Ver detalles de solicitud (modo inline)
    async viewSolicitudDetails(solicitudId) {
        console.log('Viewing details for solicitud:', solicitudId);
        
        const solicitud = await this.loadSolicitudDetails(solicitudId);
    
        if (solicitud) {
            // Guardar datos actuales para edición
            this.currentSolicitudData = solicitud;
            
            document.getElementById('solicitudes-view').style.display = 'none';
            
            const detailsView = document.getElementById('solicitud-detalles-view');
            detailsView.style.display = 'block';
            
            const header = document.querySelector('.main-header');
            if (header) header.style.display = 'none';

            // Inicializar funcionalidad de edición
            this.initializeEditFunctionality();

            // Forzar un recalculado del layout para la cuadrícula
            window.dispatchEvent(new Event('resize'));
    
            requestAnimationFrame(() => {
                this.populateDetailsView(solicitud);
            });
        }
    }

    async loadSolicitudDetails(solicitudId) {
        try {
            const solicitudIdStr = String(solicitudId);
            const { data: solicitudes, error } = await window.db
                .from('ic_solicitud_de_credito')
                .select('*')
                .eq('solicitudid', solicitudIdStr);
    
            if (error) {
                console.error('Error loading solicitud:', error);
                this.showCustomAlert('Error al cargar la solicitud: ' + error.message, 'error', 'Error');
                return null;
            }
    
            if (solicitudes && solicitudes.length > 0) {
                const solicitud = solicitudes[0];
                this.currentSolicitudData = solicitud;
                return solicitud;
            } else {
                console.error('No solicitud found with ID:', solicitudIdStr);
                this.showCustomAlert('Solicitud no encontrada', 'error', 'Error');
                return null;
            }
        } catch (error) {
            console.error('Error loading solicitud details:', error);
            this.showCustomAlert('Error al cargar los detalles de la solicitud: ' + error.message, 'error', 'Error');
            return null;
        }
    }

    populateDetailsView(solicitud) {
        const loadingSection = document.querySelector('#details-loading');
        const errorSection = document.querySelector('#details-error');
        const contentSection = document.querySelector('#details-content');

        if (loadingSection) loadingSection.style.display = 'none';
        if (errorSection) errorSection.style.display = 'none';
        if (contentSection) contentSection.style.display = 'block';

        console.log('Populating details view with:', solicitud);
        
        // Actualizar título
        const titleElement = document.querySelector('#details-title');
        const subtitleElement = document.querySelector('#details-subtitle');
        
        if (titleElement) {
            titleElement.innerHTML = `
                <i class="fas fa-file-invoice-dollar"></i>
                Solicitud #${solicitud.solicitudid}
            `;
        }
        
        if (subtitleElement) {
            subtitleElement.textContent = `Cliente: ${solicitud.nombresocio || 'No especificado'}`;
        }
        
        // Datos personales
        const personalData = {
            'Nombre Completo': solicitud.nombresocio || 'No especificado',
            'Cédula': solicitud.cedulasocio || 'No especificado',
            'Estado Civil': solicitud.estadocivil || 'No especificado',
            'Dirección': solicitud.direccionsocio || 'No especificado',
            'País de Residencia': solicitud.paisresidencia || 'No especificado',
            'WhatsApp': solicitud.whatsappsocio || 'No especificado'
        };

        // Información familiar/referencias
        const familiarData = {
            'Nombre del Cónyuge': solicitud.nombreconyuge || 'No especificado',
            'País Residencia Cónyuge': solicitud.paisresidenciaconyuge || 'No especificado',
            'WhatsApp Cónyuge': solicitud.whatsappconyuge || 'No especificado',
            'Nombre de Referencia': solicitud.nombrereferencia || 'No especificado',
            'WhatsApp Referencia': solicitud.whatsappreferencia ? 
                (typeof solicitud.whatsappreferencia === 'number' ? 
                    solicitud.whatsappreferencia.toString() : 
                    solicitud.whatsappreferencia) : 'No especificado'
        };

        // Datos del crédito y bienes
        const formattedDate = this.formatSolicitudId(solicitud.solicitudid);
        const creditoData = {
            'Fecha de Solicitud': formattedDate,
            'Monto Solicitado': solicitud.monto ? 
                `$${(typeof solicitud.monto === 'number' ? solicitud.monto : parseInt(solicitud.monto)).toLocaleString()}` : 
                'No especificado',
            'Bien como Garantía': solicitud.bien || 'No especificado',
            'Estado de la Solicitud': solicitud.estado || 'PENDIENTE'
        };
        console.log('Credito Data:', creditoData);

        // Documentos y fotografías (solo mostrar si existen)
        const documentosData = {};
        const photosData = {};
        
        if (solicitud.fotoidentidad) {
            documentosData['Foto Identidad'] = 'Disponible';
            photosData['fotoidentidad'] = { url: solicitud.fotoidentidad, title: 'Foto de Identidad' };
        }
        if (solicitud.fotoconid) {
            documentosData['Foto con ID'] = 'Disponible';
            photosData['fotoconid'] = { url: solicitud.fotoconid, title: 'Foto con ID' };
        }
        if (solicitud.fotodireccion) {
            documentosData['Foto Dirección'] = 'Disponible';
            photosData['fotodireccion'] = { url: solicitud.fotodireccion, title: 'Foto de Dirección' };
        }
        if (solicitud.fotofirma) {
            documentosData['Foto Firma'] = 'Disponible';
            photosData['fotofirma'] = { url: solicitud.fotofirma, title: 'Foto de Firma' };
        }
        if (solicitud.fotoidentidadconyuge) {
            documentosData['Foto ID Cónyuge'] = 'Disponible';
            photosData['fotoidentidadconyuge'] = { url: solicitud.fotoidentidadconyuge, title: 'Foto ID Cónyuge' };
        }
        if (solicitud.fotofirmaconyuge) {
            documentosData['Foto Firma Cónyuge'] = 'Disponible';
            photosData['fotofirmaconyuge'] = { url: solicitud.fotofirmaconyuge, title: 'Foto Firma Cónyuge' };
        }
        if (solicitud.fotoidentidadreferencia) {
            documentosData['Foto ID Referencia'] = 'Disponible';
            photosData['fotoidentidadreferencia'] = { url: solicitud.fotoidentidadreferencia, title: 'Foto ID Referencia' };
        }
        if (solicitud.fotobien) {
            documentosData['Foto del Bien'] = 'Disponible';
            photosData['fotobien'] = { url: solicitud.fotobien, title: 'Foto del Bien' };
        }
        
        // Guardar datos de fotos para el visor
        this.currentSolicitudPhotos = photosData;
        
        // Si no hay documentos, agregar mensaje
        if (Object.keys(documentosData).length === 0) {
            documentosData['Documentos'] = 'No hay documentos registrados';
        }

        // Llenar las tarjetas
        this.fillDetailCard('personal-details', personalData, '<i class="fas fa-user"></i>');
        this.fillDetailCard('laboral-details', familiarData, '<i class="fas fa-users"></i>');
        this.fillDetailCard('credito-details', creditoData, '<i class="fas fa-dollar-sign"></i>');
        this.fillDetailCard('estado-details', documentosData, '<i class="fas fa-file-alt"></i>', true);
    }

    fillDetailCard(cardId, data, icon, isDocumentCard = false) {
        console.log('Filling detail card:', cardId, 'with data:', data);
        const card = document.getElementById(cardId);
        if (!card) {
            console.error('Card not found:', cardId);
            return;
        }

        // Actualizar el icono en el título
        const title = card.querySelector('h3');
        if (title && !title.querySelector('.card-icon')) {
            title.innerHTML = `<span class="card-icon">${icon}</span>${title.textContent}`;
        }

        // Llenar los datos
        const container = card.querySelector('.detail-items');
        if (!container) {
            console.error('Container .detail-items not found in card:', cardId);
            return;
        }

        container.innerHTML = '';
        Object.entries(data).forEach(([label, value]) => {
            const item = document.createElement('div');
            item.className = 'detail-item';
            
            // Si es el campo Estado, agregar el badge
            let displayValue = value;
            if (label === 'Estado de la Solicitud' && value) {
                displayValue = this.getStatusBadge(value);
            }
            
            item.innerHTML = `
                <span class="detail-label">${label}:</span>
                <span class="detail-value">${displayValue}</span>
            `;
            container.appendChild(item);
        });

        // Si es la tarjeta de documentos y hay fotos disponibles, agregar botón "Ver Fotos"
        if (isDocumentCard && Object.keys(this.currentSolicitudPhotos).length > 0) {
            const title = card.querySelector('h3');
            if (title) {
                // Remove existing button to avoid duplicates
                const existingBtn = title.querySelector('.btn-view-photos');
                if (existingBtn) {
                    existingBtn.remove();
                }

                const viewPhotosBtn = document.createElement('button');
                viewPhotosBtn.className = 'btn btn-info btn-sm btn-view-photos'; // added class
                viewPhotosBtn.innerHTML = '<i class="fas fa-images"></i> Ver Fotos';
                viewPhotosBtn.style.marginLeft = 'auto';
                viewPhotosBtn.onclick = () => this.viewPhotos();
                
                title.appendChild(viewPhotosBtn);
            }
        }
        
        console.log('Card filled successfully:', cardId);
    }

    // Método para regresar a la lista de solicitudes
    backToSolicitudes() {
        const header = document.querySelector('.main-header');
        
        document.getElementById('solicitud-detalles-view').style.display = 'none';
        document.getElementById('solicitudes-view').style.display = 'block';
        
        // Mostrar header de nuevo
        if (header) header.style.display = 'block';
        
        // Limpiar URL
        if (window.history && window.history.pushState) {
            window.history.pushState({}, '', window.location.pathname);
        }
    }

    // Métodos para el visor de fotos
    viewPhotos() {
        if (Object.keys(this.currentSolicitudPhotos).length === 0) {
            this.showCustomAlert('No hay fotos disponibles para esta solicitud', 'info', 'Sin Fotos');
            return;
        }

        this.createPhotoViewer();
    }

    createPhotoViewer() {
        // Ocultar vista de detalles
        document.getElementById('solicitud-detalles-view').style.display = 'none';
        
        // Crear o mostrar el visor de fotos
        let photoViewer = document.getElementById('photo-viewer');
        if (!photoViewer) {
            photoViewer = document.createElement('div');
            photoViewer.id = 'photo-viewer';
            photoViewer.className = 'photo-viewer';
            document.body.appendChild(photoViewer);
        }

        const solicitudId = this.currentSolicitudData ? this.currentSolicitudData.solicitudid : 'N/A';
        const clientName = this.currentSolicitudData ? this.currentSolicitudData.nombresocio : 'Cliente';

        photoViewer.innerHTML = `
            <div class="photo-viewer-container">
                <div class="photo-viewer-header">
                    <button class="btn-back" onclick="solicitudesModule.backFromPhotos()">
                        <i class="fas fa-arrow-left"></i>
                        Regresar
                    </button>
                    <div class="details-title">
                        <h2><i class="fas fa-images"></i> Documentos - Solicitud #${solicitudId}</h2>
                    </div>
                    <div></div>
                </div>
                <div class="photo-viewer-content">
                    <div class="photos-grid" id="photos-grid">
                        <!-- Fotos se cargarán aquí -->
                    </div>
                </div>
            </div>
        `;

        // Llenar grid de fotos
        const photosGrid = document.getElementById('photos-grid');
        Object.entries(this.currentSolicitudPhotos).forEach(([key, photoData]) => {
            const photoCard = document.createElement('div');
            photoCard.className = 'photo-card';
            photoCard.onclick = () => this.openFullscreen(photoData.url, photoData.title);
            
            photoCard.innerHTML = `
                <div class="photo-container">
                    <img src="${photoData.url}" alt="${photoData.title}" loading="lazy">
                    <div class="photo-overlay">
                        <i class="fas fa-search-plus"></i>
                        <span>Ver en pantalla completa</span>
                    </div>
                </div>
                <div class="photo-title">
                    <i class="fas fa-file-image"></i>
                    ${photoData.title}
                </div>
            `;
            
            photosGrid.appendChild(photoCard);
        });

        photoViewer.style.display = 'block';
    }

    backFromPhotos() {
        document.getElementById('photo-viewer').style.display = 'none';
        document.getElementById('solicitud-detalles-view').style.display = 'block';
    }

    openFullscreen(imageUrl, title) {
        // Crear overlay fullscreen
        let fullscreenViewer = document.getElementById('fullscreen-image-viewer');
        if (!fullscreenViewer) {
            fullscreenViewer = document.createElement('div');
            fullscreenViewer.id = 'fullscreen-image-viewer';
            fullscreenViewer.className = 'fullscreen-image-viewer';
            document.body.appendChild(fullscreenViewer);
        }

        fullscreenViewer.innerHTML = `
            <div class="fullscreen-overlay">
                <div class="fullscreen-content">
                    <div class="fullscreen-header">
                        <h3><i class="fas fa-file-image"></i> ${title}</h3>
                        <button class="btn-close-fullscreen" onclick="solicitudesModule.closeFullscreen()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="fullscreen-image-container">
                        <img src="${imageUrl}" alt="${title}">
                    </div>
                    <div class="fullscreen-footer">
                        <p>Presiona ESC o haz clic en el botón cerrar para salir</p>
                    </div>
                </div>
            </div>
        `;

        fullscreenViewer.style.display = 'flex';

        // Event listener para cerrar con ESC
        const closeWithEsc = (e) => {
            if (e.key === 'Escape') {
                this.closeFullscreen();
                document.removeEventListener('keydown', closeWithEsc);
            }
        };
        document.addEventListener('keydown', closeWithEsc);

        // Event listener para cerrar clickeando fuera
        fullscreenViewer.onclick = (e) => {
            if (e.target === fullscreenViewer || e.target.classList.contains('fullscreen-overlay')) {
                this.closeFullscreen();
            }
        };
    }

    closeFullscreen() {
        const fullscreenViewer = document.getElementById('fullscreen-image-viewer');
        if (fullscreenViewer) {
            fullscreenViewer.style.display = 'none';
        }
    }

    // Editar solicitud
    async editSolicitud(solicitudId) {
        const isReady = await this.checkConnectionAndAuth();
        if (!isReady) return;

        try {
            console.log('Editing solicitudId:', solicitudId, 'type:', typeof solicitudId);
            
            // Convertir siempre a string para la consulta
            const solicitudIdStr = String(solicitudId);
            console.log('Using solicitudId as string:', solicitudIdStr);

            const { data: solicitudes, error } = await window.db
                .from('ic_solicitud_de_credito')
                .select('*')
                .eq('solicitudid', solicitudIdStr);

            console.log('Edit query response - data:', solicitudes, 'error:', error);

            if (error) {
                console.error('Error loading solicitud for edit:', error);
                this.showCustomAlert('Error al cargar la solicitud: ' + error.message, 'error', 'Error');
                return;
            }

            if (!solicitudes || solicitudes.length === 0) {
                console.error('No solicitud found for edit with ID:', solicitudIdStr);
                this.showCustomAlert('Solicitud no encontrada', 'error', 'Error');
                return;
            }

            const solicitud = solicitudes[0];

            // Llenar el formulario
            document.getElementById('edit-nombresocio').value = solicitud.nombresocio || '';
            document.getElementById('edit-cedulasocio').value = solicitud.cedulasocio || '';
            document.getElementById('edit-monto').value = solicitud.monto || '';
            document.getElementById('edit-estado').value = solicitud.estado || 'PENDIENTE';

            // Guardar el ID como string para el envío
            document.getElementById('edit-form').dataset.solicitudId = solicitudIdStr;

            // Mostrar modal
            this.showModal('edit-modal');

        } catch (error) {
            console.error('Error editing solicitud:', error);
            this.showCustomAlert('Error inesperado: ' + error.message, 'error', 'Error');
        }
    }

    async saveEditSolicitud() {
        const isReady = await this.checkConnectionAndAuth();
        if (!isReady) return;

        try {
            const form = document.getElementById('edit-form');
            const solicitudId = form.dataset.solicitudId;

            const updateData = {
                nombresocio: document.getElementById('edit-nombresocio').value,
                cedulasocio: document.getElementById('edit-cedulasocio').value,
                monto: parseFloat(document.getElementById('edit-monto').value),
                estado: document.getElementById('edit-estado').value
            };

            console.log('Updating solicitudId:', solicitudId, 'with data:', updateData);

            // Usar siempre como string
            const solicitudIdStr = String(solicitudId);
            
            const { error } = await window.db
                .from('ic_solicitud_de_credito')
                .update(updateData)
                .eq('solicitudid', solicitudIdStr);

            if (error) {
                console.error('Error updating solicitud:', error);
                this.showCustomAlert('Error al actualizar la solicitud: ' + error.message, 'error', 'Error');
                return;
            }

            this.showCustomAlert('Solicitud actualizada exitosamente', 'success', 'Éxito');
            this.closeModal('edit-modal');
            this.loadSolicitudes();

        } catch (error) {
            console.error('Error saving edit solicitud:', error);
            this.showCustomAlert('Error inesperado: ' + error.message, 'error', 'Error');
        }
    }

    // Eliminar solicitud
    confirmDeleteSolicitud(solicitudId, nombreSocio) {
        document.getElementById('delete-solicitud-id').textContent = solicitudId;
        document.getElementById('delete-solicitud-socio').textContent = nombreSocio;
        document.getElementById('confirm-delete-btn').dataset.solicitudId = solicitudId;
        this.showModal('delete-modal');
    }

    async deleteSolicitud() {
        const isReady = await this.checkConnectionAndAuth();
        if (!isReady) return;

        try {
            const solicitudId = document.getElementById('confirm-delete-btn').dataset.solicitudId;
            console.log('Deleting solicitudId:', solicitudId);

            // Usar siempre como string
            const solicitudIdStr = String(solicitudId);
            
            const { error } = await window.db
                .from('ic_solicitud_de_credito')
                .delete()
                .eq('solicitudid', solicitudIdStr);

            if (error) {
                console.error('Error deleting solicitud:', error);
                this.showCustomAlert('Error al eliminar la solicitud: ' + error.message, 'error', 'Error');
                return;
            }

            this.showCustomAlert('Solicitud eliminada exitosamente', 'success', 'Éxito');
            this.closeModal('delete-modal');
            this.loadSolicitudes();

        } catch (error) {
            console.error('Error deleting solicitud:', error);
            this.showCustomAlert('Error inesperado: ' + error.message, 'error', 'Error');
        }
    }

    // Utilities para modales
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // Sistema de alertas personalizadas
    showCustomAlert(message, type = 'info', title = '') {
        // Eliminar alertas existentes
        const existingAlerts = document.querySelectorAll('.custom-alert');
        existingAlerts.forEach(alert => alert.remove());

        // Crear nueva alerta
        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert custom-alert-${type}`;
        
        const iconMap = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-circle', 
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        };

        const icon = iconMap[type] || iconMap['info'];
        const alertTitle = title || type.charAt(0).toUpperCase() + type.slice(1);

        alertDiv.innerHTML = `
            <div class="custom-alert-content">
                <div class="custom-alert-header">
                    <i class="${icon}"></i>
                    <span class="custom-alert-title">${alertTitle}</span>
                    <button class="custom-alert-close" onclick="this.closest('.custom-alert').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="custom-alert-body">
                    ${message}
                </div>
            </div>
        `;

        document.body.appendChild(alertDiv);

        // Auto-remove después de 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);

        // Animar entrada
        setTimeout(() => {
            alertDiv.classList.add('show');
        }, 10);
    }

    // Sistema de confirmación personalizada
    showCustomConfirm(message, title = 'Confirmación') {
        return new Promise((resolve) => {
            // Eliminar confirmaciones existentes
            const existingConfirms = document.querySelectorAll('.custom-confirm');
            existingConfirms.forEach(confirm => confirm.remove());

            // Crear nueva confirmación
            const confirmDiv = document.createElement('div');
            confirmDiv.className = 'custom-confirm';
            
            confirmDiv.innerHTML = `
                <div class="custom-confirm-overlay"></div>
                <div class="custom-confirm-content">
                    <div class="custom-confirm-header">
                        <i class="fas fa-question-circle"></i>
                        <span class="custom-confirm-title">${title}</span>
                    </div>
                    <div class="custom-confirm-body">
                        ${message}
                    </div>
                    <div class="custom-confirm-actions">
                        <button class="custom-confirm-cancel">
                            <i class="fas fa-times"></i>
                            Cancelar
                        </button>
                        <button class="custom-confirm-ok">
                            <i class="fas fa-check"></i>
                            Confirmar
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(confirmDiv);

            // Manejar eventos
            const cancelBtn = confirmDiv.querySelector('.custom-confirm-cancel');
            const okBtn = confirmDiv.querySelector('.custom-confirm-ok');
            const overlay = confirmDiv.querySelector('.custom-confirm-overlay');

            const handleCancel = () => {
                confirmDiv.remove();
                resolve(false);
            };

            const handleConfirm = () => {
                confirmDiv.remove();
                resolve(true);
            };

            cancelBtn.addEventListener('click', handleCancel);
            okBtn.addEventListener('click', handleConfirm);
            overlay.addEventListener('click', handleCancel);

            // Escape key to cancel
            const handleKeyPress = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                    document.removeEventListener('keydown', handleKeyPress);
                }
            };
            document.addEventListener('keydown', handleKeyPress);

            // Animar entrada
            setTimeout(() => {
                confirmDiv.classList.add('show');
            }, 10);
        });
    }

    // Función para generar PDF de la solicitud
    async generatePDF() {
        if (!this.currentSolicitudData) {
            this.showCustomAlert('No hay datos de solicitud para generar el PDF', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        // Colores corporativos
        const colors = {
            primary: [14, 89, 54],      // #0E5936
            secondary: [22, 115, 54],   // #167336
            tertiary: [17, 76, 89],     // #114C59
            contrast1: [191, 75, 33],   // #BF4B21
            contrast2: [242, 177, 56],  // #F2B138
            textDark: [51, 51, 51],     // #333
            lightGray: [240, 240, 240]  // #f0f0f0
        };

        const solicitud = this.currentSolicitudData;
        const nombreSocio = solicitud.nombresocio || '[NOMBRE NO ESPECIFICADO]';
        
        // Configuración de página
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        
        // Función para cargar imagen como base64
        const loadImageAsBase64 = (url) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = () => resolve(null);
                img.src = url;
            });
        };
        
        try {
            // Cargar logo
            this.showCustomAlert('Generando PDF, cargando imágenes...', 'info');
            const logoUrl = 'https://lh3.googleusercontent.com/d/15J6Aj6ZwkVrmDfs6uyVk-oG0Mqr-i9Jn=w2048?name=inka%20corp%20normal.png';
            const logoBase64 = await loadImageAsBase64(logoUrl);
            
            // Header con colores corporativos
            doc.setFillColor(...colors.primary);
            doc.rect(0, 0, pageWidth, 40, 'F');
            
            // Logo real
            if (logoBase64) {
                try {
                    // Agregar fondo blanco para el logo PNG con transparencia
                    doc.setFillColor(255, 255, 255);
                    doc.rect(15, 8, 25, 25, 'F');
                    doc.addImage(logoBase64, 'PNG', 15, 8, 25, 25);
                } catch (e) {
                    console.error('Error adding logo:', e);
                    // Fallback - rectángulo con texto
                    doc.setFillColor(255, 255, 255);
                    doc.rect(15, 10, 25, 20, 'F');
                    doc.setTextColor(...colors.primary);
                    doc.setFontSize(8);
                    doc.text('INKA CORP', 16, 18);
                    doc.text('LOGO', 24, 25);
                }
            } else {
                // Fallback - rectángulo con texto
                doc.setFillColor(255, 255, 255);
                doc.rect(15, 10, 25, 20, 'F');
                doc.setTextColor(...colors.primary);
                doc.setFontSize(8);
                doc.text('INKA CORP', 16, 18);
                doc.text('LOGO', 24, 25);
            }
            
            // Título principal
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('SOLICITUD DE CRÉDITO', 55, 20);
            
            // Número de solicitud
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Solicitud #${solicitud.solicitudid}`, 55, 30);
            
            // Línea decorativa
            doc.setDrawColor(...colors.contrast2);
            doc.setLineWidth(2);
            doc.line(margin, 45, pageWidth - margin, 45);
            
            let yPosition = 55;
            
            // DESCARGO DE RESPONSABILIDAD
            // Calcular espacio requerido para el descargo
            const nombreSocio = solicitud.nombresocio || '[NOMBRE NO ESPECIFICADO]';
            const descargoTexto = [
                `Yo, ${nombreSocio.toUpperCase()}, por medio del presente documento autorizo expresamente a INKA CORP a:`,
                '',
                '• Tomar esta solicitud como una autorización formal para la revisión y verificación de mis datos personales.',
                '• Realizar consultas en centrales de riesgo, buró de crédito y demás entidades financieras para evaluar mi historial crediticio.',
                '• Verificar la información laboral, referencias personales y familiares proporcionadas en esta solicitud.',
                '• Procesar y almacenar mis datos personales conforme a las políticas de privacidad vigentes.',
                '',
                'DECLARO BAJO LA GRAVEDAD DEL JURAMENTO que toda la información proporcionada en esta solicitud es',
                'VERAZ, COMPLETA Y ACTUALIZADA. Asumo total responsabilidad por cualquier inexactitud u omisión en los',
                'datos suministrados.',
                '',
                'Entiendo que cualquier falsedad en la información puede ser causal de rechazo inmediato de mi solicitud',
                'o terminación del contrato de crédito si ya ha sido aprobado.',
                '',
                'NOTA: Todos los términos y condiciones fueron compartidos con el solicitante al momento de llenar',
                'la solicitud en https://solicitud.inkacorp.net',
                '',
                'Esta autorización se otorga de manera libre, voluntaria e informada.'
            ];
            
            // Calcular altura del descargo
            let descargoHeight = 12; // Título
            descargoTexto.forEach(linea => {
                if (linea === '') {
                    descargoHeight += 3;
                } else {
                    const lines = doc.splitTextToSize(linea, contentWidth - 4);
                    descargoHeight += lines.length * 4;
                }
            });
            descargoHeight += 10; // Espaciado final
            
            // Verificar si cabe en la página actual
            if (yPosition + descargoHeight > pageHeight - 50) {
                doc.addPage();
                yPosition = 20;
            }
            
            // Renderizar descargo
            doc.setFillColor(...colors.tertiary);
            doc.rect(margin, yPosition, contentWidth, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('DESCARGO DE RESPONSABILIDAD Y AUTORIZACIÓN', margin + 3, yPosition + 5.5);
            
            yPosition += 12;
            
            // Contenido del descargo
            doc.setTextColor(...colors.textDark);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            
            descargoTexto.forEach((linea, index) => {
                if (linea === '') {
                    yPosition += 3; // Espaciado para líneas vacías
                } else {
                    const lines = doc.splitTextToSize(linea, contentWidth - 4);
                    lines.forEach(line => {
                        doc.text(line, margin + 2, yPosition);
                        yPosition += 4;
                    });
                }
            });
            
            yPosition += 10; // Espaciado después del descargo
            
            // Función helper para agregar secciones
            const addSection = (title, data, startY) => {
                let y = startY;
                
                // Calcular espacio requerido para la sección
                const titleHeight = 12;
                let contentHeight = 0;
                
                Object.entries(data).forEach(([key, value]) => {
                    if (value && value !== 'No especificado') {
                        const valueText = String(value);
                        const maxWidth = contentWidth - 60;
                        const lines = doc.splitTextToSize(valueText, maxWidth);
                        contentHeight += lines.length * 4 + 2;
                    }
                });
                
                const totalSectionHeight = titleHeight + contentHeight + 10; // +10 espaciado
                
                // Verificar si hay espacio suficiente en la página actual
                if (y + totalSectionHeight > pageHeight - 50) { // 50mm para footer
                    doc.addPage();
                    y = 20; // Margen superior en nueva página
                }
                
                // Título de la sección
                doc.setFillColor(...colors.secondary);
                doc.rect(margin, y, contentWidth, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(title, margin + 3, y + 5.5);
                
                y += 12;
                
                // Contenido de la sección
                doc.setTextColor(...colors.textDark);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                
                Object.entries(data).forEach(([key, value], index) => {
                    if (value && value !== 'No especificado') {
                        // Fondo alternado para filas
                        if (index % 2 === 0) {
                            doc.setFillColor(...colors.lightGray);
                            doc.rect(margin, y - 2, contentWidth, 6, 'F');
                        }
                        
                        doc.setFont('helvetica', 'bold');
                        doc.text(`${key}:`, margin + 2, y + 2);
                        doc.setFont('helvetica', 'normal');
                        
                        // Manejar texto largo
                        const valueText = String(value);
                        const maxWidth = contentWidth - 60;
                        const lines = doc.splitTextToSize(valueText, maxWidth);
                        doc.text(lines, margin + 55, y + 2);
                        
                        y += lines.length * 4 + 2;
                    }
                });
                
                return y + 5;
            };
            
            // Datos personales
            const personalData = {
                'Nombre Completo': solicitud.nombresocio || 'No especificado',
                'Cédula': solicitud.cedulasocio || 'No especificado',
                'Estado Civil': solicitud.estadocivil || 'No especificado',
                'Dirección': solicitud.direccionsocio || 'No especificado',
                'País de Residencia': solicitud.paisresidencia || 'No especificado',
                'WhatsApp': solicitud.whatsappsocio || 'No especificado'
            };
            
            yPosition = addSection('DATOS PERSONALES', personalData, yPosition);
            
            // Información familiar/referencias
            const familiarData = {
                'Nombre del Cónyuge': solicitud.nombreconyuge || 'No especificado',
                'País Residencia Cónyuge': solicitud.paisresidenciaconyuge || 'No especificado',
                'WhatsApp Cónyuge': solicitud.whatsappconyuge || 'No especificado',
                'Nombre de Referencia': solicitud.nombrereferencia || 'No especificado',
                'WhatsApp Referencia': solicitud.whatsappreferencia ? 
                    (typeof solicitud.whatsappreferencia === 'number' ? 
                        solicitud.whatsappreferencia.toString() : 
                        solicitud.whatsappreferencia) : 'No especificado'
            };
            
            yPosition = addSection('INFORMACIÓN FAMILIAR Y REFERENCIAS', familiarData, yPosition);
            
            // Datos del crédito
            const formattedDate = this.formatSolicitudId(solicitud.solicitudid);
            const creditoData = {
                'Fecha de Solicitud': formattedDate,
                'Monto Solicitado': solicitud.monto ? 
                    `$${(typeof solicitud.monto === 'number' ? solicitud.monto : parseInt(solicitud.monto)).toLocaleString()}` : 
                    'No especificado',
                'Bien como Garantía': solicitud.bien || 'No especificado',
                'Estado de la Solicitud': solicitud.estado || 'PENDIENTE'
            };
            
            yPosition = addSection('INFORMACIÓN DEL CRÉDITO', creditoData, yPosition);
            
            // Cargar todas las imágenes de documentos
            const documentosImagenes = [];
            const documentFields = [
                { field: 'fotoidentidad', title: 'Foto de Identidad' },
                { field: 'fotoconid', title: 'Foto con ID' },
                { field: 'fotodireccion', title: 'Foto de Dirección' },
                { field: 'fotofirma', title: 'Foto de Firma' },
                { field: 'fotoidentidadconyuge', title: 'Foto ID Cónyuge' },
                { field: 'fotofirmaconyuge', title: 'Foto Firma Cónyuge' },
                { field: 'fotoidentidadreferencia', title: 'Foto ID Referencia' },
                { field: 'fotobien', title: 'Foto del Bien' }
            ];
            
            // Cargar imágenes disponibles con sus dimensiones reales
            for (const docField of documentFields) {
                if (solicitud[docField.field]) {
                    const imageBase64 = await loadImageAsBase64(solicitud[docField.field]);
                    if (imageBase64) {
                        // Obtener dimensiones reales de la imagen
                        const imageInfo = await new Promise((resolve) => {
                            const img = new Image();
                            img.onload = () => {
                                resolve({
                                    data: imageBase64,
                                    width: img.width,
                                    height: img.height
                                });
                            };
                            img.onerror = () => {
                                resolve({
                                    data: imageBase64,
                                    width: 800, // Dimensiones por defecto
                                    height: 600
                                });
                            };
                            img.src = imageBase64;
                        });
                        
                        documentosImagenes.push({
                            title: docField.title,
                            data: imageInfo.data,
                            width: imageInfo.width,
                            height: imageInfo.height
                        });
                    }
                }
            }
            
            // Agregar sección de documentos si hay imágenes
            if (documentosImagenes.length > 0) {
                // Función para calcular dimensiones de imagen respetando restricciones
                const calculateImageDimensions = (originalWidth, originalHeight) => {
                    const maxWidth = 450; // px
                    const maxHeight = 300; // px
                    
                    // Convertir a mm (aproximadamente 1px = 0.264583mm)
                    const maxWidthMM = maxWidth * 0.264583; // ~119mm
                    const maxHeightMM = maxHeight * 0.264583; // ~79mm
                    
                    // Limitar el ancho máximo para que quepan 2 columnas (máximo 70mm)
                    const finalMaxWidthMM = Math.min(maxWidthMM, 70);
                    const finalMaxHeightMM = Math.min(maxHeightMM, 50);
                    
                    // Convertir dimensiones originales a mm (asumiendo que vienen en px)
                    const originalWidthMM = originalWidth * 0.264583;
                    const originalHeightMM = originalHeight * 0.264583;
                    
                    // Calcular factores de escala para cada dimensión
                    const widthScale = finalMaxWidthMM / originalWidthMM;
                    const heightScale = finalMaxHeightMM / originalHeightMM;
                    
                    // Usar el factor más restrictivo para mantener la relación de aspecto
                    const scale = Math.min(widthScale, heightScale, 1); // No aumentar, solo reducir
                    
                    // Aplicar el escalado manteniendo la proporción
                    const finalWidth = originalWidthMM * scale;
                    const finalHeight = originalHeightMM * scale;
                    
                    return {
                        width: finalWidth,
                        height: finalHeight
                    };
                };
                
                // Configuración de columnas
                const columnWidth = (contentWidth - 10) / 2; // 10mm de separación entre columnas
                const leftColumnX = margin;
                const rightColumnX = margin + columnWidth + 10;
                
                // Calcular espacio realmente necesario basado en las imágenes
                let totalRequiredHeight = 20; // Título de sección
                let maxItemHeight = 0;
                
                // Pre-calcular el espacio que necesitará cada imagen
                for (let i = 0; i < documentosImagenes.length; i++) {
                    const documento = documentosImagenes[i];
                    const dimensions = calculateImageDimensions(documento.width, documento.height);
                    const textHeight = Math.ceil(documento.title.length / 30) * 3; // Aproximado
                    const itemHeight = textHeight + dimensions.height + 10;
                    maxItemHeight = Math.max(maxItemHeight, itemHeight);
                }
                
                // Estimar filas necesarias (2 columnas)
                const estimatedRows = Math.ceil(documentosImagenes.length / 2);
                const estimatedHeight = totalRequiredHeight + (estimatedRows * maxItemHeight);
                
                // Solo crear nueva página si realmente no hay espacio mínimo útil
                const availableSpace = pageHeight - yPosition - 50; // 50 para footer
                const minUsefulSpace = totalRequiredHeight + maxItemHeight; // Al menos título + 1 imagen
                
                if (availableSpace < minUsefulSpace && estimatedHeight > availableSpace) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                // Título de la sección de documentos
                doc.setFillColor(...colors.secondary);
                doc.rect(margin, yPosition, contentWidth, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('DOCUMENTOS ADJUNTOS', margin + 3, yPosition + 5.5);
                
                yPosition += 15;
                
                // Variables para el control de columnas
                let currentColumn = 0; // 0 = izquierda, 1 = derecha
                let leftColumnY = yPosition;
                let rightColumnY = yPosition;
                
                // Agregar cada imagen en 2 columnas
                for (let i = 0; i < documentosImagenes.length; i++) {
                    const documento = documentosImagenes[i];
                    
                    // Determinar posición y columna
                    const isLeftColumn = currentColumn === 0;
                    const xPosition = isLeftColumn ? leftColumnX : rightColumnX;
                    const currentY = isLeftColumn ? leftColumnY : rightColumnY;
                    
                    // Título del documento
                    doc.setTextColor(...colors.textDark);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    
                    // Ajustar texto al ancho de la columna
                    const textLines = doc.splitTextToSize(documento.title, columnWidth);
                    const textHeight = textLines.length * 3;
                    
                    // Pre-calcular dimensiones para verificar espacio
                    const dimensions = calculateImageDimensions(documento.width, documento.height);
                    const totalItemHeight = textHeight + dimensions.height + 10;
                    
                    // Verificar espacio para la imagen completa en la página actual
                    if (currentY + totalItemHeight > pageHeight - 50) {
                        doc.addPage();
                        yPosition = 20;
                        leftColumnY = yPosition;
                        rightColumnY = yPosition;
                        currentColumn = 0; // Reiniciar en columna izquierda
                        i--; // Reprocessar esta imagen en la nueva página
                        continue;
                    }
                    
                    // Agregar título del documento
                    doc.text(textLines, xPosition, currentY);
                    const imageY = currentY + textHeight + 2;
                    
                    try {
                        // Centrar imagen en la columna
                        const centeredX = xPosition + (columnWidth - dimensions.width) / 2;
                        
                        // Agregar imagen
                        doc.addImage(documento.data, 'JPEG', centeredX, imageY, dimensions.width, dimensions.height);
                        
                        // Actualizar posición Y de la columna actual
                        if (isLeftColumn) {
                            leftColumnY += totalItemHeight;
                        } else {
                            rightColumnY += totalItemHeight;
                        }
                        
                    } catch (e) {
                        console.error(`Error adding image ${documento.title}:`, e);
                        // En caso de error, solo avanzar el espacio del texto
                        if (isLeftColumn) {
                            leftColumnY += textHeight + 20;
                        } else {
                            rightColumnY += textHeight + 20;
                        }
                    }
                    
                    // Alternar columna
                    currentColumn = (currentColumn + 1) % 2;
                }
                
                // Actualizar yPosition para el siguiente contenido
                yPosition = Math.max(leftColumnY, rightColumnY) + 10;
            }
            
            // FIRMA ELECTRÓNICA AL FINAL
            // Ir a la última página y agregar la firma
            doc.setPage(doc.getNumberOfPages());
            
            // Verificar si hay espacio suficiente en la página actual
            const firmaHeight = 40; // Altura necesaria para la firma
            if (yPosition + firmaHeight > pageHeight - 50) { // 50 para dejar espacio al footer
                doc.addPage();
                yPosition = 20;
            }
            
            // Generar datos para el QR
            const fechaActual = new Date();
            const fechaFormateada = fechaActual.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const textoQR = `FIRMADO ELECTRONICAMENTE POR:\n${nombreSocio.toUpperCase()}\n${fechaFormateada}`;
            
            // Crear QR usando QRious
            const qr = new QRious({
                value: textoQR,
                size: 200,
                background: 'white',
                foreground: '#0E5936' // Color primario en hex
            });
            
            const qrDataURL = qr.toDataURL();
            
            // Título de la sección de firma
            doc.setFillColor(...colors.contrast1);
            doc.rect(margin, yPosition, contentWidth, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('FIRMA ELECTRÓNICA', margin + 3, yPosition + 5.5);
            
            yPosition += 15;
            
            // Agregar QR y texto de firma
            try {
                // QR centrado
                const qrSize = 25; // mm
                const qrX = (pageWidth - qrSize) / 2;
                doc.addImage(qrDataURL, 'PNG', qrX, yPosition, qrSize, qrSize);
                
                // Texto de firma debajo del QR
                yPosition += qrSize + 5;
                
                doc.setTextColor(...colors.textDark);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                
                const firmaLines = [
                    'FIRMADO ELECTRÓNICAMENTE POR:',
                    nombreSocio.toUpperCase(),
                    fechaFormateada
                ];
                
                firmaLines.forEach(line => {
                    const textWidth = doc.getTextWidth(line);
                    const textX = (pageWidth - textWidth) / 2;
                    doc.text(line, textX, yPosition);
                    yPosition += 4;
                });
                
            } catch (e) {
                console.error('Error adding QR signature:', e);
                // Fallback: solo texto de firma
                doc.setTextColor(...colors.textDark);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                const fallbackText = `FIRMADO ELECTRÓNICAMENTE POR: ${nombreSocio.toUpperCase()} - ${fechaFormateada}`;
                const lines = doc.splitTextToSize(fallbackText, contentWidth);
                lines.forEach(line => {
                    const textWidth = doc.getTextWidth(line);
                    const textX = (pageWidth - textWidth) / 2;
                    doc.text(line, textX, yPosition);
                    yPosition += 5;
                });
            }
            
            // Footer en todas las páginas
            const totalPages = doc.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                const footerY = pageHeight - 25;
                doc.setFillColor(...colors.tertiary);
                doc.rect(0, footerY, pageWidth, 25, 'F');
                
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text('INKA CORP - Sistema de Gestión de Solicitudes', margin, footerY + 8);
                doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, margin, footerY + 15);
                
                // Número de página
                doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, footerY + 8);
            }
            
            // Guardar el PDF
            const fileName = `Solicitud_${solicitud.solicitudid}_${solicitud.nombresocio?.replace(/\s+/g, '_') || 'Cliente'}.pdf`;
            doc.save(fileName);
            
            this.showCustomAlert('PDF generado exitosamente con imágenes', 'success', 'Éxito');
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            this.showCustomAlert('Error al generar el PDF: ' + error.message, 'error');
        }
    }

    // ===== FUNCIONES DE EDICIÓN =====

    initializeEditFunctionality() {
        // Event listeners para botones de edición
        const corregirBtn = document.getElementById('corregir-btn');
        const guardarBtn = document.getElementById('guardar-btn');
        const cancelarBtn = document.getElementById('cancelar-btn');

        if (corregirBtn) {
            corregirBtn.addEventListener('click', () => this.activateEditMode());
        }

        if (guardarBtn) {
            guardarBtn.addEventListener('click', () => this.saveChanges());
        }

        if (cancelarBtn) {
            cancelarBtn.addEventListener('click', () => this.cancelEdit());
        }
    }

    activateEditMode() {
        if (!this.currentSolicitudData) {
            this.showCustomAlert('No hay datos de solicitud cargados', 'error');
            return;
        }

        document.body.classList.add('edit-mode');
        
        // Mostrar/ocultar botones
        document.getElementById('corregir-btn').classList.add('hidden');
        document.getElementById('guardar-btn').classList.remove('hidden');
        document.getElementById('cancelar-btn').classList.remove('hidden');
        document.getElementById('save-pdf-btn').classList.add('hidden'); // Ocultar PDF
        
        // Convertir campos a editables
        this.makeFieldsEditable();
    }

    makeFieldsEditable() {
        const personalCard = document.querySelector('#personal-details .detail-items');
        const familiarCard = document.querySelector('#laboral-details .detail-items');
        const creditoCard = document.querySelector('#credito-details .detail-items');
        const documentosCard = document.querySelector('#estado-details .detail-items');

        // Campos no editables
        const nonEditableFields = ['Fecha de Solicitud'];

        // Hacer editables los campos de información personal
        if (personalCard) {
            this.makeCardFieldsEditable(personalCard, this.currentSolicitudData, {
                'Nombre Completo': { type: 'text', field: 'nombresocio' },
                'Cédula': { type: 'text', field: 'cedulasocio' },
                'Estado Civil': { type: 'select', field: 'estadocivil', options: {
                    'Soltero': 'Soltero',
                    'Casado': 'Casado',
                    'Divorciado': 'Divorciado',
                    'Viudo': 'Viudo',
                    'Unión Libre': 'Unión Libre'
                }},
                'Dirección': { type: 'text', field: 'direccionsocio' },
                'País de Residencia': { type: 'text', field: 'paisresidencia' },
                'WhatsApp': { type: 'tel', field: 'whatsappsocio' }
            }, nonEditableFields);
        }

        // Hacer editables los campos familiares
        if (familiarCard) {
            this.makeCardFieldsEditable(familiarCard, this.currentSolicitudData, {
                'Nombre del Cónyuge': { type: 'text', field: 'nombreconyuge' },
                'País Residencia Cónyuge': { type: 'text', field: 'paisresidenciaconyuge' },
                'WhatsApp Cónyuge': { type: 'tel', field: 'whatsappconyuge' },
                'Nombre de Referencia': { type: 'text', field: 'nombrereferencia' },
                'WhatsApp Referencia': { type: 'number', field: 'whatsappreferencia' }
            }, nonEditableFields);
        }

        // Hacer editables los campos de crédito (excepto fecha)
        if (creditoCard) {
            this.makeCardFieldsEditable(creditoCard, this.currentSolicitudData, {
                'Monto Solicitado': { type: 'number', field: 'monto', step: '0.01', min: '0' },
                'Bien como Garantía': { type: 'text', field: 'bien' },
                'Estado de la Solicitud': { type: 'select', field: 'estado', options: {
                    'PENDIENTE': 'PENDIENTE',
                    'APROBADO': 'APROBADO',
                    'RECHAZADO': 'RECHAZADO',
                    'COLOCADA': 'COLOCADA',
                    'EN REVISION': 'EN REVISIÓN',
                    'ANULADA': 'ANULADA'
                }}
            }, nonEditableFields);
        }

        // La sección de documentos NO se toca - se mantiene normal
        console.log('Campos editables configurados. Documentos sin modificar.');
    }

    makeCardFieldsEditable(cardElement, data, fieldConfig, nonEditableFields) {
        if (!cardElement) {
            console.log('Card element not found');
            return;
        }

        const detailItems = cardElement.querySelectorAll('.detail-item');
        console.log('Found detail items:', detailItems.length);
        
        detailItems.forEach((item, index) => {
            const labelElement = item.querySelector('.detail-label');
            const valueElement = item.querySelector('.detail-value');
            
            if (!labelElement || !valueElement) {
                console.log('Label or value element not found in item', index);
                return;
            }
            
            const labelText = labelElement.textContent.replace(':', '').trim();
            console.log('Processing field:', labelText);
            
            const config = fieldConfig[labelText];
            
            if (!config) {
                console.log('No config found for field:', labelText);
                return;
            }
            
            // Si el campo no es editable, marcarlo
            if (nonEditableFields.includes(labelText)) {
                item.classList.add('non-editable');
                console.log('Field marked as non-editable:', labelText);
                return;
            }
            
            item.classList.add('editing');
            console.log('Making field editable:', labelText);
            
            let input;
            const currentValue = data[config.field] || '';
            console.log('Current value for', config.field, ':', currentValue);
            
            if (config.type === 'select' && config.options) {
                input = document.createElement('select');
                Object.entries(config.options).forEach(([value, label]) => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = label;
                    option.selected = currentValue === value;
                    input.appendChild(option);
                });
            } else if (config.type === 'textarea') {
                input = document.createElement('textarea');
                input.value = currentValue;
                input.rows = 3;
            } else {
                input = document.createElement('input');
                input.type = config.type;
                
                if (config.type === 'number') {
                    let numericValue = currentValue;
                    if (typeof currentValue === 'string') {
                        // Remover símbolos de moneda y separadores
                        numericValue = currentValue.replace(/[$,\s]/g, '');
                    }
                    input.value = numericValue;
                    
                    if (config.step) input.step = config.step;
                    if (config.min !== undefined) input.min = config.min;
                    if (config.max !== undefined) input.max = config.max;
                } else {
                    input.value = currentValue;
                }
            }
            
            input.setAttribute('data-field', config.field);
            input.className = 'editing-input';
            
            // Limpiar el contenido del valueElement y añadir el input
            valueElement.innerHTML = '';
            valueElement.appendChild(input);
            
            console.log('Input created for field:', labelText, 'with value:', input.value);
        });
    }

    async saveChanges() {
        // Mostrar confirmación custom
        const confirmed = await this.showCustomConfirm(
            '¿Está seguro que desea guardar todos los cambios?',
            'Confirmar Cambios'
        );
        
        if (!confirmed) return;

        const guardarBtn = document.getElementById('guardar-btn');
        guardarBtn.classList.add('loading');

        try {
            const updatedData = {};
            
            // Recolectar datos de todos los campos editables
            const editingInputs = document.querySelectorAll('.editing-input[data-field]');
            console.log('Found editing inputs:', editingInputs.length);
            
            editingInputs.forEach(input => {
                const fieldName = input.getAttribute('data-field');
                let value = input.value.trim();
                
                console.log('Processing field:', fieldName, 'with value:', value);
                
                // Convertir valores según el tipo de campo
                if (input.type === 'number' && value) {
                    value = parseFloat(value);
                    if (isNaN(value)) value = null;
                }
                
                // Campos que requieren conversión a bigint
                if (['whatsappreferencia', 'monto'].includes(fieldName) && value) {
                    // Asegurar que sean números enteros para bigint
                    if (fieldName === 'whatsappreferencia') {
                        // Eliminar caracteres no numéricos y convertir a entero
                        const cleanValue = value.toString().replace(/[^\d]/g, '');
                        value = parseInt(cleanValue);
                        if (isNaN(value) || value <= 0) {
                            console.warn('Invalid whatsapp number:', cleanValue);
                            value = null;
                        }
                    } else if (fieldName === 'monto') {
                        value = parseInt(value);
                        if (isNaN(value) || value <= 0) {
                            console.warn('Invalid amount:', value);
                            value = null;
                        }
                    }
                }
                
                // Campos de teléfono/WhatsApp (solo para campos de texto) - asegurar formato correcto
                if (['whatsappsocio', 'whatsappconyuge'].includes(fieldName) && value && typeof value === 'string') {
                    // Remover caracteres no numéricos excepto +
                    value = value.replace(/[^\d+]/g, '');
                }
                
                // Solo incluir campos que tengan valor o que se hayan cambiado
                if (value !== '' && value !== null && value !== undefined) {
                    updatedData[fieldName] = value;
                }
            });

            console.log('Datos a actualizar:', updatedData);

            if (Object.keys(updatedData).length === 0) {
                this.showCustomAlert('No se detectaron cambios para guardar', 'info', 'Sin cambios');
                return;
            }

            // Actualizar en la base de datos
            const { error } = await window.db
                .from('ic_solicitud_de_credito')
                .update(updatedData)
                .eq('solicitudid', this.currentSolicitudData.solicitudid);

            if (error) {
                console.error('Database error:', error);
                throw new Error(`Error de base de datos: ${error.message}`);
            }

            // Actualizar datos locales
            Object.assign(this.currentSolicitudData, updatedData);

            // Salir del modo edición
            this.exitEditMode();

            // Recargar la vista
            this.populateDetailsView(this.currentSolicitudData);

            this.showCustomAlert('Cambios guardados correctamente', 'success', 'Éxito');

        } catch (error) {
            console.error('Error al guardar:', error);
            this.showCustomAlert(`Error al guardar los cambios: ${error.message}`, 'error', 'Error');
        } finally {
            guardarBtn.classList.remove('loading');
        }
    }

    async cancelEdit() {
        const confirmed = await this.showCustomConfirm(
            '¿Está seguro que desea cancelar los cambios? Se perderán todas las modificaciones.',
            'Cancelar Edición'
        );
        
        if (confirmed) {
            this.exitEditMode();
            // Recargar datos originales
            this.populateDetailsView(this.currentSolicitudData);
        }
    }

    exitEditMode() {
        document.body.classList.remove('edit-mode');
        
        // Mostrar/ocultar botones
        document.getElementById('corregir-btn').classList.remove('hidden');
        document.getElementById('guardar-btn').classList.add('hidden');
        document.getElementById('cancelar-btn').classList.add('hidden');
        document.getElementById('save-pdf-btn').classList.remove('hidden'); // Mostrar PDF
    }
}

// Inicializar el módulo cuando se carga la página
let solicitudesModule;
document.addEventListener('DOMContentLoaded', () => {
    solicitudesModule = new SolicitudesModule();
    // Hacer la instancia globalmente disponible
    window.solicitudesModule = solicitudesModule;
});
