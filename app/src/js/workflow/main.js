(() => {
    const MAX_FILES = 5;
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const ROUTES = {
        users: '/app/routers/workflow/WorkFlowRouter.php?action=carregarUsuarios',
        workflows: '/app/routers/workflow/WorkFlowRouter.php?action=getWorkFlow',
        statistics: '/app/routers/workflow/WorkFlowRouter.php?action=getEstatisticsWorkFlow',
        create: '/app/routers/workflow/WorkFlowRouter.php?action=createWorkflow'
    };

    const dom = {};
    const state = {
        currentFilter: 'todos',
        users: [],
        selectedUsers: [],
        selectedFiles: [],
        table: null
    };

    function init() {
        cacheDom();
        bindEvents();
        updateFileList();
        updateSelectedUsers();
        setMinimumDeadline();
        dom.table.addEventListener('click', handleTableClick);
        Promise.all([
            loadUsers(),
            loadStatistics(),
            loadWorkflows(state.currentFilter)
        ]).catch((error) => {
            console.error('Erro na carga inicial:', error);
        });
    }

    function cacheDom() {
        dom.form = document.getElementById('newWorkflowForm');
        dom.modal = document.getElementById('newWorkflowModal');
        dom.title = document.getElementById('workflowTitulo');
        dom.description = document.getElementById('workflowDescricao');
        dom.priority = document.getElementById('workflowPrioridade');
        dom.category = document.getElementById('workflowCategoria');
        dom.deadline = document.getElementById('workflowPrazoFinal');
        dom.usersSelect = document.getElementById('workflowResponsaveis');
        dom.usersContainer = document.getElementById('selectedUsersContainer');
        dom.selectedUsersIds = document.getElementById('selectedUsersIds');
        dom.fileDropzone = document.getElementById('fileDropArea');
        dom.fileInput = document.getElementById('fileInput');
        dom.fileList = document.getElementById('fileList');
        dom.stats = {
            ativos: document.getElementById('ativosCount'),
            andamento: document.getElementById('andamentoCount'),
            aprovados: document.getElementById('aprovadosCount'),
            rejeitados: document.getElementById('rejeitadosCount')
        };
        dom.filterButtons = {
            todos: document.getElementById('btnTodos'),
            meus: document.getElementById('btnMeus'),
            participando: document.getElementById('btnParticipando')
        };
        dom.table = document.getElementById('workflowsTable');
    }

    function bindEvents() {
        dom.form.addEventListener('submit', handleSubmit);
        dom.modal.addEventListener('hidden.bs.modal', resetForm);
        dom.usersContainer.addEventListener('click', handleUserRemoval);
        dom.fileList.addEventListener('click', handleFileRemoval);

        Object.entries(dom.filterButtons).forEach(([filter, button]) => {
            button.addEventListener('click', () => {
                setActiveFilter(filter);
                loadWorkflows(filter);
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
        if (result.status !== 'success' || !Array.isArray(result.data)) {
            throw new Error('Resposta invalida ao carregar usuarios');
        }

        state.users = result.data;
        renderUserOptions();
    }

    function renderUserOptions() {
        dom.usersSelect.innerHTML = '';

        state.users.forEach((user) => {
            const option = document.createElement('option');
            option.value = String(user.ID);
            option.textContent = `${user.USUARIO} - ${user.NOME}`;
            option.dataset.nome = user.NOME;
            dom.usersSelect.appendChild(option);
        });

        if ($(dom.usersSelect).data('select2')) {
            $(dom.usersSelect).select2('destroy');
        }

        $(dom.usersSelect).select2({
            placeholder: 'Selecione os usuarios',
            allowClear: true,
            width: '100%',
            dropdownParent: $('#newWorkflowModal')
        });

        $(dom.usersSelect)
            .off('select2:select')
            .on('select2:select', (event) => {
                const optionElement = event.params.data.element;
                const userId = String(event.params.data.id);
                const userName = optionElement?.dataset.nome || event.params.data.text;

                if (!state.selectedUsers.some((user) => user.id === userId)) {
                    state.selectedUsers.push({ id: userId, name: userName });
                    updateSelectedUsers();
                }

                $(dom.usersSelect).val(null).trigger('change');
            });
    }

    async function loadWorkflows(filter) {
        state.currentFilter = filter;
        const result = await LuminaHttp.get(`${ROUTES.workflows}&filter=${filter}`);
        if (result.status !== 'success' || !Array.isArray(result.data)) {
            throw new Error('Resposta invalida ao carregar workflows');
        }

        renderTable(result.data);
    }

    async function loadStatistics() {
        const result = await LuminaHttp.get(ROUTES.statistics);
        const stats = result.data || {};
        updateStat(dom.stats.ativos, stats.ativos ?? 0);
        updateStat(dom.stats.andamento, stats.andamento ?? 0);
        updateStat(dom.stats.aprovados, stats.aprovados ?? 0);
        updateStat(dom.stats.rejeitados, stats.rejeitados ?? 0);
    }

    function updateStat(element, value) {
        element.textContent = value;
        element.classList.remove('stat-pulse');
        void element.offsetWidth;
        element.classList.add('stat-pulse');
    }

    function renderTable(workflows) {
        const rows = workflows.map((workflow) => ([
            workflow.id,
            LuminaUI.escapeHtml(workflow.titulo),
            LuminaUI.escapeHtml(truncate(workflow.descricao || '', 72)),
            renderPriorityBadge(workflow.prioridade),
            LuminaUI.escapeHtml(workflow.categoria || 'N/D'),
            LuminaUI.formatDateTime(workflow.data_criacao),
            renderStatusBadge(workflow.status),
            `<button class="btn btn-sm btn-table-action btn-detalhes" data-workflow-id="${workflow.id}">
                <i class="fas fa-eye"></i> Detalhes
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
        const button = event.target.closest('.btn-detalhes');
        if (!button) {
            return;
        }

        const workflowId = button.dataset.workflowId;
        window.location.href = `/app/views/workflow/detalhes/index.php?id=${workflowId}`;
    }

    function renderPriorityBadge(value) {
        const priority = normalize(value);
        const map = {
            ALTA: ['table-badge--danger', 'Alta'],
            MEDIA: ['table-badge--warning', 'Media'],
            BAIXA: ['table-badge--success', 'Baixa']
        };
        const [className, label] = map[priority] || ['table-badge--neutral', value || 'N/D'];
        return `<span class="table-badge ${className}">${LuminaUI.escapeHtml(label)}</span>`;
    }

    function renderStatusBadge(value) {
        const map = {
            APROVADO: ['table-badge--success', 'Aprovado'],
            REJEITADO: ['table-badge--danger', 'Rejeitado'],
            EM_ANDAMENTO: ['table-badge--info', 'Andamento']
        };
        const [className, label] = map[value] || ['table-badge--neutral', value || 'N/D'];
        return `<span class="table-badge ${className}">${LuminaUI.escapeHtml(label)}</span>`;
    }

    function updateSelectedUsers() {
        if (!state.selectedUsers.length) {
            dom.usersContainer.innerHTML = '<span>Nenhum usuario selecionado</span>';
            dom.selectedUsersIds.value = '';
            return;
        }

        dom.usersContainer.innerHTML = state.selectedUsers.map((user) => `
            <div class="selected-user-chip">
                <span>${LuminaUI.escapeHtml(user.name)}</span>
                <button type="button" class="btn-close" aria-label="Remover usuario" data-user-id="${user.id}"></button>
            </div>
        `).join('');

        dom.selectedUsersIds.value = state.selectedUsers.map((user) => user.id).join(',');
    }

    function handleUserRemoval(event) {
        const button = event.target.closest('[data-user-id]');
        if (!button) {
            return;
        }

        state.selectedUsers = state.selectedUsers.filter((user) => user.id !== button.dataset.userId);
        updateSelectedUsers();
    }

    function addFiles(fileList) {
        const incomingFiles = Array.from(fileList);

        if (state.selectedFiles.length + incomingFiles.length > MAX_FILES) {
            LuminaUI.modalAlert({
                icon: 'error',
                title: 'Limite excedido',
                text: `Voce pode enviar no maximo ${MAX_FILES} arquivos.`
            });
            return;
        }

        incomingFiles.forEach((file) => {
            if (file.size > MAX_FILE_SIZE) {
                LuminaUI.modalAlert({
                    icon: 'warning',
                    title: 'Arquivo muito grande',
                    html: `O arquivo <strong>${LuminaUI.escapeHtml(file.name)}</strong> excede 10 MB.`
                });
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
                        <span class="file-list-item__icon">
                            <i class="fas ${getFileIcon(file.type)}"></i>
                        </span>
                        <div>
                            <div class="file-list-item__name">${LuminaUI.escapeHtml(file.name)}</div>
                            <small class="file-list-item__size">${LuminaUI.formatBytes(file.size)}</small>
                        </div>
                    </div>
                    <button type="button" class="file-remove-btn" data-file-index="${index}" aria-label="Remover arquivo">
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

        const index = Number(button.dataset.fileIndex);
        state.selectedFiles.splice(index, 1);
        updateFileList();
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!(await validateForm())) {
            return;
        }

        const formData = new FormData();
        formData.append('titulo', dom.title.value.trim());
        formData.append('descricao', dom.description.value.trim());
        formData.append('prioridade', dom.priority.value);
        formData.append('categoria', dom.category.value || '');
        formData.append('responsaveis', dom.selectedUsersIds.value);
        formData.append('prazo_final', dom.deadline.value);
        state.selectedFiles.forEach((file, index) => formData.append(`anexos[${index}]`, file));

        const loader = LuminaUI.loading('Enviando workflow...', 'Validando e registrando os dados.');

        try {
            const result = await LuminaHttp.postForm(ROUTES.create, formData);
            loader.close();

            const modal = bootstrap.Modal.getInstance(dom.modal);
            modal?.hide();
            resetForm();
            await Promise.all([loadWorkflows(state.currentFilter), loadStatistics()]);

            const workflowId = result.data?.workflow_id || result.data?.id;
            const confirmation = await LuminaUI.confirm({
                icon: 'success',
                title: 'Workflow criado',
                text: 'O workflow foi registrado com sucesso.',
                showCancelButton: true,
                confirmButtonText: 'Ver detalhes',
                cancelButtonText: 'Fechar'
            });

            if (confirmation.isConfirmed && workflowId) {
                window.location.href = `/app/views/workflow/detalhes/index.php?id=${workflowId}`;
            }
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({
                icon: 'error',
                title: 'Erro ao criar workflow',
                text: error.message
            });
        }
    }

    async function validateForm() {
        const title = dom.title.value.trim();
        const deadline = dom.deadline.value;
        const priority = dom.priority.value;

        if (!deadline) {
            dom.deadline.focus();
            await LuminaUI.modalAlert({ icon: 'error', title: 'Campo obrigatorio', text: 'Informe o prazo final do workflow.' });
            return false;
        }

        if (!title) {
            dom.title.focus();
            await LuminaUI.modalAlert({ icon: 'error', title: 'Campo obrigatorio', text: 'Informe o titulo do workflow.' });
            return false;
        }

        if (!priority) {
            dom.priority.focus();
            await LuminaUI.modalAlert({ icon: 'error', title: 'Campo obrigatorio', text: 'Selecione a prioridade do workflow.' });
            return false;
        }

        if (!state.selectedUsers.length) {
            const confirmation = await LuminaUI.confirm({
                icon: 'question',
                title: 'Nenhum responsavel selecionado',
                text: 'Deseja continuar sem atribuir responsaveis?',
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
        state.selectedUsers = [];
        state.selectedFiles = [];
        updateSelectedUsers();
        updateFileList();

        if ($(dom.usersSelect).data('select2')) {
            $(dom.usersSelect).val(null).trigger('change');
        }
    }

    function setActiveFilter(filter) {
        Object.entries(dom.filterButtons).forEach(([key, button]) => {
            button.classList.toggle('active', key === filter);
        });
    }

    function setMinimumDeadline() {
        const today = new Date();
        const value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        dom.deadline.min = value;
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
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();
    }

    function truncate(value, maxLength) {
        return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
    }

    document.addEventListener('DOMContentLoaded', init);
})();
