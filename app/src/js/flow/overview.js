(() => {
    const MAX_FILES = 5;
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const ROUTES = {
        users: '/app/routers/flow/FlowRouter.php?action=loadUsers',
        flows: '/app/routers/flow/FlowRouter.php?action=getFlows',
        statistics: '/app/routers/flow/FlowRouter.php?action=getFlowStatistics',
        create: '/app/routers/flow/FlowRouter.php?action=createFlow'
    };

    const dom = {};
    const state = {
        currentFilter: 'all',
        assignees: [],
        selectedAssignees: [],
        selectedFiles: [],
        table: null
    };

    function init() {
        cacheDom();
        bindEvents();
        updateAssigneeChips();
        updateFileList();
        setMinimumDeadline();
        dom.table.addEventListener('click', handleTableClick);

        Promise.all([
            loadUsers(),
            loadStatistics(),
            loadFlows(state.currentFilter)
        ]).catch((error) => console.error('Initial load failed:', error));
    }

    function cacheDom() {
        dom.form = document.getElementById('newFlowForm');
        dom.modal = document.getElementById('newFlowModal');
        dom.title = document.getElementById('workflowTitulo');
        dom.description = document.getElementById('workflowDescricao');
        dom.priority = document.getElementById('workflowPrioridade');
        dom.category = document.getElementById('workflowCategoria');
        dom.deadline = document.getElementById('workflowPrazoFinal');
        dom.assigneeSelect = document.getElementById('workflowResponsaveis');
        dom.assigneeContainer = document.getElementById('selectedUsersContainer');
        dom.selectedAssigneeIds = document.getElementById('selectedUsersIds');
        dom.fileDropzone = document.getElementById('fileDropArea');
        dom.fileInput = document.getElementById('fileInput');
        dom.fileList = document.getElementById('fileList');
        dom.table = document.getElementById('workflowsTable');
        dom.filterButtons = {
            all: document.getElementById('btnTodos'),
            mine: document.getElementById('btnMeus'),
            assigned: document.getElementById('btnParticipando')
        };
        dom.stats = {
            total: document.getElementById('ativosCount'),
            inProgress: document.getElementById('andamentoCount'),
            approved: document.getElementById('aprovadosCount'),
            rejected: document.getElementById('rejeitadosCount')
        };
    }

    function bindEvents() {
        dom.form.addEventListener('submit', handleSubmit);
        dom.modal.addEventListener('hidden.bs.modal', resetForm);
        dom.assigneeContainer.addEventListener('click', handleAssigneeRemoval);
        dom.fileList.addEventListener('click', handleFileRemoval);

        Object.entries(dom.filterButtons).forEach(([filter, button]) => {
            button.addEventListener('click', () => {
                setActiveFilter(filter);
                loadFlows(filter);
            });
        });

        bindFileDropzone();
    }

    function bindFileDropzone() {
        dom.fileDropzone.addEventListener('click', () => dom.fileInput.click());
        dom.fileInput.addEventListener('change', (event) => {
            if (event.target.files?.length) {
                addFiles(event.target.files);
                dom.fileInput.value = '';
            }
        });

        ['dragenter', 'dragover'].forEach((eventName) => {
            dom.fileDropzone.addEventListener(eventName, (event) => {
                event.preventDefault();
                dom.fileDropzone.classList.add('is-dragover');
            });
        });

        ['dragleave', 'drop'].forEach((eventName) => {
            dom.fileDropzone.addEventListener(eventName, (event) => {
                event.preventDefault();
                dom.fileDropzone.classList.remove('is-dragover');
            });
        });

        dom.fileDropzone.addEventListener('drop', (event) => {
            if (event.dataTransfer.files?.length) {
                addFiles(event.dataTransfer.files);
            }
        });
    }

    async function loadUsers() {
        const result = await LuminaHttp.get(ROUTES.users);
        state.assignees = result.data || [];
        renderAssigneeOptions();
    }

    function renderAssigneeOptions() {
        dom.assigneeSelect.innerHTML = '';

        state.assignees.forEach((user) => {
            const option = document.createElement('option');
            option.value = String(getUserId(user));
            option.textContent = `${user.username} - ${user.name}`;
            option.dataset.name = user.name;
            dom.assigneeSelect.appendChild(option);
        });

        if ($(dom.assigneeSelect).data('select2')) {
            $(dom.assigneeSelect).select2('destroy');
        }

        $(dom.assigneeSelect).select2({
            placeholder: 'Selecione os assignees',
            allowClear: true,
            width: '100%',
            dropdownParent: $('#newFlowModal')
        });

        $(dom.assigneeSelect).off('select2:select').on('select2:select', (event) => {
            const userId = String(event.params.data.id);
            const optionElement = event.params.data.element;
            const userName = optionElement?.dataset.name || event.params.data.text;

            if (!state.selectedAssignees.some((user) => user.id === userId)) {
                state.selectedAssignees.push({ id: userId, name: userName });
                updateAssigneeChips();
            }

            $(dom.assigneeSelect).val(null).trigger('change');
        });
    }

    async function loadFlows(filter) {
        state.currentFilter = filter;
        const result = await LuminaHttp.get(`${ROUTES.flows}&filter=${filter}`);
        renderTable(result.data || []);
    }

    async function loadStatistics() {
        const result = await LuminaHttp.get(ROUTES.statistics);
        const stats = result.data || {};
        pulseStat(dom.stats.total, stats.total ?? 0);
        pulseStat(dom.stats.inProgress, stats.in_progress ?? 0);
        pulseStat(dom.stats.approved, stats.approved ?? 0);
        pulseStat(dom.stats.rejected, stats.rejected ?? 0);
    }

    function pulseStat(element, value) {
        element.textContent = value;
        element.classList.remove('stat-pulse');
        void element.offsetWidth;
        element.classList.add('stat-pulse');
    }

    function renderTable(flows) {
        const rows = flows.map((flow) => ([
            flow.id,
            LuminaUI.escapeHtml(flow.title),
            LuminaUI.escapeHtml(truncate(flow.description || '', 72)),
            renderPriorityBadge(flow.priority),
            LuminaUI.escapeHtml(flow.category || 'N/D'),
            LuminaUI.formatDateTime(flow.created_at),
            renderStatusBadge(flow.status),
            `<button class="btn btn-sm btn-table-action btn-flow-details" data-flow-id="${flow.id}">
                <i class="fas fa-eye"></i> Details
            </button>`
        ]));

        if (state.table) {
            state.table.destroy();
            $('#workflowsTable tbody').empty();
        }

        state.table = $('#workflowsTable').DataTable({
            data: rows,
            columns: [
                { title: 'ID', visible: false },
                { title: 'Titulo' },
                { title: 'Descricao' },
                { title: 'Prioridade' },
                { title: 'Categoria' },
                { title: 'Data de criacao' },
                { title: 'Status' },
                { title: 'Acoes', orderable: false, className: 'text-center' }
            ],
            language: { url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/pt-BR.json' },
            dom: '<"top"f>rt<"bottom"lip><"clear">',
            pageLength: 10,
            responsive: true,
            autoWidth: false,
            order: [[5, 'desc']]
        });
    }

    function handleTableClick(event) {
        const button = event.target.closest('.btn-flow-details');
        if (!button) {
            return;
        }

        window.location.href = `/app/views/flow/details/index.php?id=${button.dataset.flowId}`;
    }

    function updateAssigneeChips() {
        if (!state.selectedAssignees.length) {
            dom.assigneeContainer.innerHTML = '<span>Nenhum assignee selecionado</span>';
            dom.selectedAssigneeIds.value = '';
            return;
        }

        dom.assigneeContainer.innerHTML = state.selectedAssignees.map((user) => `
            <div class="selected-user-chip">
                <span>${LuminaUI.escapeHtml(user.name)}</span>
                <button type="button" class="btn-close" data-user-id="${user.id}" aria-label="Remove assignee"></button>
            </div>
        `).join('');

        dom.selectedAssigneeIds.value = state.selectedAssignees.map((user) => user.id).join(',');
    }

    function handleAssigneeRemoval(event) {
        const button = event.target.closest('[data-user-id]');
        if (!button) {
            return;
        }

        state.selectedAssignees = state.selectedAssignees.filter((user) => user.id !== button.dataset.userId);
        updateAssigneeChips();
    }

    function addFiles(fileList) {
        const incomingFiles = Array.from(fileList);

        if (state.selectedFiles.length + incomingFiles.length > MAX_FILES) {
            LuminaUI.modalAlert({ icon: 'error', title: 'Limite excedido', text: `Voce pode enviar no maximo ${MAX_FILES} arquivos.` });
            return;
        }

        incomingFiles.forEach((file) => {
            if (file.size > MAX_FILE_SIZE) {
                LuminaUI.modalAlert({ icon: 'warning', title: 'Arquivo muito grande', html: `O arquivo <strong>${LuminaUI.escapeHtml(file.name)}</strong> excede 10 MB.` });
                return;
            }

            const duplicate = state.selectedFiles.some((current) =>
                current.name === file.name &&
                current.size === file.size &&
                current.lastModified === file.lastModified
            );

            if (!duplicate) {
                state.selectedFiles.push(file);
            }
        });

        updateFileList();
    }

    function updateFileList() {
        if (!state.selectedFiles.length) {
            dom.fileList.innerHTML = '<div class="file-list-empty">Nenhum arquivo selecionado</div>';
            return;
        }

        dom.fileList.innerHTML = `
            ${state.selectedFiles.map((file, index) => `
                <div class="file-list-item">
                    <div class="file-list-item__meta">
                        <span class="file-list-item__icon"><i class="fas ${getFileIcon(file.type)}"></i></span>
                        <div>
                            <div class="file-list-item__name">${LuminaUI.escapeHtml(file.name)}</div>
                            <small class="file-list-item__size">${LuminaUI.formatBytes(file.size)}</small>
                        </div>
                    </div>
                    <button type="button" class="file-remove-btn" data-file-index="${index}" aria-label="Remove attachment">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('')}
            <div class="file-list-counter mt-2">${state.selectedFiles.length} de ${MAX_FILES} arquivos selecionados</div>
        `;
    }

    function handleFileRemoval(event) {
        const button = event.target.closest('[data-file-index]');
        if (!button) {
            return;
        }

        state.selectedFiles.splice(Number(button.dataset.fileIndex), 1);
        updateFileList();
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!(await validateForm())) {
            return;
        }

        const formData = new FormData();
        formData.append('title', dom.title.value.trim());
        formData.append('description', dom.description.value.trim());
        formData.append('priority', dom.priority.value);
        formData.append('category', dom.category.value || '');
        formData.append('assignees', dom.selectedAssigneeIds.value);
        formData.append('deadline', dom.deadline.value);
        state.selectedFiles.forEach((file, index) => formData.append(`attachments[${index}]`, file));

        const loader = LuminaUI.loading('Enviando flow...', 'Validando e registrando os dados.');

        try {
            const result = await LuminaHttp.postForm(ROUTES.create, formData);
            loader.close();
            bootstrap.Modal.getInstance(dom.modal)?.hide();
            resetForm();
            await Promise.all([loadFlows(state.currentFilter), loadStatistics()]);

            const flowId = result.data?.flow_id;
            const confirmation = await LuminaUI.confirm({
                icon: 'success',
                title: 'Flow criado',
                text: 'O flow foi registrado com sucesso.',
                showCancelButton: true,
                confirmButtonText: 'Ver details',
                cancelButtonText: 'Fechar'
            });

            if (confirmation.isConfirmed && flowId) {
                window.location.href = `/app/views/flow/details/index.php?id=${flowId}`;
            }
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({ icon: 'error', title: 'Erro ao criar flow', text: error.message });
        }
    }

    async function validateForm() {
        if (!dom.deadline.value) {
            dom.deadline.focus();
            await LuminaUI.modalAlert({ icon: 'error', title: 'Campo obrigatorio', text: 'Informe o prazo final do flow.' });
            return false;
        }

        if (!dom.title.value.trim()) {
            dom.title.focus();
            await LuminaUI.modalAlert({ icon: 'error', title: 'Campo obrigatorio', text: 'Informe o titulo do flow.' });
            return false;
        }

        if (!dom.priority.value) {
            dom.priority.focus();
            await LuminaUI.modalAlert({ icon: 'error', title: 'Campo obrigatorio', text: 'Selecione a prioridade do flow.' });
            return false;
        }

        if (!state.selectedAssignees.length) {
            const confirmation = await LuminaUI.confirm({
                icon: 'question',
                title: 'Nenhum assignee selecionado',
                text: 'Deseja continuar sem atribuir assignees?',
                showCancelButton: true,
                confirmButtonText: 'Continuar',
                cancelButtonText: 'Cancelar'
            });

            return confirmation.isConfirmed;
        }

        return true;
    }

    function resetForm() {
        dom.form.reset();
        state.selectedAssignees = [];
        state.selectedFiles = [];
        updateAssigneeChips();
        updateFileList();
        if ($(dom.assigneeSelect).data('select2')) {
            $(dom.assigneeSelect).val(null).trigger('change');
        }
    }

    function setActiveFilter(filter) {
        Object.entries(dom.filterButtons).forEach(([key, button]) => {
            button.classList.toggle('active', key === filter);
        });
    }

    function setMinimumDeadline() {
        const today = new Date();
        dom.deadline.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    function renderPriorityBadge(priority) {
        const normalized = normalize(priority);
        const map = {
            ALTA: ['table-badge--danger', 'Alta'],
            MEDIA: ['table-badge--warning', 'Media'],
            BAIXA: ['table-badge--success', 'Baixa']
        };
        const [className, label] = map[normalized] || ['table-badge--neutral', priority || 'N/D'];
        return `<span class="table-badge ${className}">${LuminaUI.escapeHtml(label)}</span>`;
    }

    function renderStatusBadge(status) {
        const map = {
            APROVADO: ['table-badge--success', 'Aprovado'],
            REJEITADO: ['table-badge--danger', 'Rejeitado'],
            EM_ANDAMENTO: ['table-badge--info', 'Em andamento']
        };
        const [className, label] = map[status] || ['table-badge--neutral', status || 'N/D'];
        return `<span class="table-badge ${className}">${LuminaUI.escapeHtml(label)}</span>`;
    }

    function getFileIcon(type) {
        if (!type) return 'fa-file';
        if (type.startsWith('image/')) return 'fa-file-image';
        if (type === 'application/pdf') return 'fa-file-pdf';
        if (type.startsWith('video/')) return 'fa-file-video';
        if (type.startsWith('audio/')) return 'fa-file-audio';
        if (type.includes('spreadsheet') || type.includes('excel')) return 'fa-file-excel';
        if (type.includes('word')) return 'fa-file-word';
        return 'fa-file';
    }

    function normalize(value) {
        return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    }

    function getUserId(user) {
        return user?.id ?? user?.ID ?? 0;
    }

    function truncate(value, maxLength) {
        return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
    }

    document.addEventListener('DOMContentLoaded', init);
})();
