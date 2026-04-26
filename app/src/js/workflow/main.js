let selectedUsers = [];
let currentFilter = 'todos';
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
let selectedFiles = [];

async function carregarUsuarios() {
    const endpoint = '/app/routers/workflow/WorkFlowRouter.php?action=carregarUsuarios';

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const result = await response.json();
        if (result.status !== 'success' || !Array.isArray(result.data)) {
            throw new Error('Resposta invalida do servidor');
        }

        const selectElement = document.getElementById('workflowResponsaveis');
        if (!selectElement) {
            throw new Error('Elemento workflowResponsaveis nao encontrado');
        }

        selectElement.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Selecione os usuarios';
        selectElement.appendChild(defaultOption);

        result.data.forEach(usuario => {
            const option = document.createElement('option');
            option.value = usuario.ID;
            option.textContent = `${usuario.USUARIO} - ${usuario.NOME}`;
            option.setAttribute('data-nome', usuario.NOME);
            selectElement.appendChild(option);
        });

        $(selectElement).select2({
            placeholder: 'Selecione os usuarios',
            allowClear: true,
            width: '100%',
            dropdownParent: $('#newWorkflowModal'),
            templateResult: function (usuario) {
                if (!usuario.id) return usuario.text;
                return $('<span>' + usuario.text + '</span>');
            }
        });

        $(selectElement).off('select2:select').on('select2:select', function (e) {
            const selectedUserId = e.params.data.id;
            const selectedUserName = e.params.data.element.getAttribute('data-nome') || e.params.data.text.split(' - ')[0];

            if (!selectedUsers.some(user => user.id === selectedUserId)) {
                selectedUsers.push({
                    id: selectedUserId,
                    name: selectedUserName
                });
                updateSelectedUsersContainer();
            }

            $(selectElement).val(null).trigger('change');
        });
    } catch (error) {
        console.error('Erro ao carregar usuarios:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao carregar usuarios',
            text: 'Nao foi possivel carregar a lista de usuarios. Por favor, tente novamente.',
            footer: error.message
        });
    }
}

async function carregarWorkFlows(filter = 'todos') {
    currentFilter = filter;
    const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=getWorkFlow&filter=${filter}`;

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const result = await response.json();
        if (result.status !== 'success' || !Array.isArray(result.data)) {
            throw new Error('Resposta invalida do servidor');
        }

        inicializarDataTable(result.data);
    } catch (error) {
        console.error('Erro ao carregar workflows:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao carregar workflows',
            text: 'Nao foi possivel carregar a lista de workflows. Por favor, tente novamente.',
            footer: error.message
        });
    }
}

function getPrioridadeBadge(workflow) {
    const prioridadeValor = (workflow.prioridade || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();

    switch (prioridadeValor) {
        case 'ALTA':
            return '<span class="table-badge table-badge--danger">Alta</span>';
        case 'MEDIA':
            return '<span class="table-badge table-badge--warning">Media</span>';
        case 'BAIXA':
            return '<span class="table-badge table-badge--success">Baixa</span>';
        default:
            return `<span class="table-badge table-badge--neutral">${workflow.prioridade || 'N/D'}</span>`;
    }
}

function getStatusBadge(workflow) {
    switch (workflow.status) {
        case 'APROVADO':
            return '<span class="table-badge table-badge--success">Aprovado</span>';
        case 'REJEITADO':
            return '<span class="table-badge table-badge--danger">Rejeitado</span>';
        case 'EM_ANDAMENTO':
            return '<span class="table-badge table-badge--info">Andamento</span>';
        default:
            return `<span class="table-badge table-badge--neutral">${workflow.status || 'N/D'}</span>`;
    }
}

function inicializarDataTable(data) {
    if ($.fn.DataTable.isDataTable('#workflowsTable')) {
        $('#workflowsTable').DataTable().destroy();
        $('#workflowsTable tbody').empty();
    }

    const formattedData = data.map(workflow => {
        const dataCriacao = new Date(workflow.data_criacao);
        const dataFormatada = dataCriacao.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const descricao = workflow.descricao || '';

        return [
            workflow.id,
            workflow.titulo,
            descricao.substring(0, 50) + (descricao.length > 50 ? '...' : ''),
            getPrioridadeBadge(workflow),
            workflow.categoria || 'N/D',
            dataFormatada,
            getStatusBadge(workflow),
            `<button class="btn btn-sm btn-table-action btn-detalhes" onclick="visualizarWorkflow(${workflow.id})" data-workflow-id="${workflow.id}">
                <i class="fas fa-eye"></i> Detalhes
            </button>`
        ];
    });

    $('#workflowsTable').DataTable({
        data: formattedData,
        columns: [
            { title: 'ID', visible: false },
            { title: 'Titulo' },
            { title: 'Descricao' },
            { title: 'Prioridade' },
            { title: 'Categoria' },
            { title: 'Data de criacao' },
            { title: 'Status' },
            {
                title: 'Acoes',
                orderable: false,
                className: 'text-center'
            }
        ],
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/pt-BR.json'
        },
        dom: '<"top"f>rt<"bottom"lip><"clear">',
        pageLength: 10,
        responsive: true,
        order: [[5, 'desc']],
        autoWidth: false,
        initComplete: function () {
            $('.dataTables_filter input').addClass('form-control form-control-sm');
            $('.dataTables_length select').addClass('form-control form-control-sm');
        },
        drawCallback: function () {
            $('.paginate_button.current').addClass('btn-primary').removeClass('btn-outline-secondary');
        }
    });
}

function visualizarWorkflow(id) {
    window.location.href = `/app/views/workflow/detalhes/index.php?id=${id}`;
}

function loadWorkflowStatistics() {
    axios.get('/app/routers/workflow/WorkFlowRouter.php?action=getEstatisticsWorkFlow')
        .then(response => {
            const stats = response.data.data;
            document.getElementById('ativosCount').textContent = stats.ativos;
            document.getElementById('andamentoCount').textContent = stats.andamento;
            document.getElementById('aprovadosCount').textContent = stats.aprovados;
            document.getElementById('rejeitadosCount').textContent = stats.rejeitados;
            animateCountUpdate('ativosCount');
            animateCountUpdate('andamentoCount');
            animateCountUpdate('aprovadosCount');
            animateCountUpdate('rejeitadosCount');
        })
        .catch(error => {
            console.error('Erro ao carregar estatisticas:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Nao foi possivel carregar as estatisticas dos workflows.',
                timer: 3000,
                showConfirmButton: false
            });
        });
}

function animateCountUpdate(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.style.transform = 'scale(1.2)';
    element.style.transition = 'transform 0.3s ease';
    setTimeout(() => {
        element.style.transform = 'scale(1)';
    }, 300);
}

async function sendFormData() {
    const titulo = document.getElementById('workflowTitulo').value.trim();
    const prioridade = document.getElementById('workflowPrioridade').value;
    const prazo = document.getElementById('workflowPrazoFinal').value;

    if (!prazo) {
        Swal.fire({
            icon: 'error',
            title: 'Campo obrigatorio',
            text: 'Por favor, informe o prazo do workflow.',
            footer: 'O campo "Prazo" e obrigatorio'
        });
        document.getElementById('workflowTitulo').focus();
        return false;
    }

    if (!titulo) {
        Swal.fire({
            icon: 'error',
            title: 'Campo obrigatorio',
            text: 'Por favor, informe o titulo do workflow.',
            footer: 'O campo "Titulo" e obrigatorio'
        });
        document.getElementById('workflowTitulo').focus();
        return false;
    }

    if (!prioridade) {
        Swal.fire({
            icon: 'error',
            title: 'Campo obrigatorio',
            text: 'Por favor, selecione a prioridade do workflow.',
            footer: 'O campo "Prioridade" e obrigatorio'
        });
        document.getElementById('workflowPrioridade').focus();
        return false;
    }

    if (selectedUsers.length === 0) {
        const result = await Swal.fire({
            icon: 'question',
            title: 'Nenhum responsavel selecionado',
            text: 'Deseja continuar sem atribuir responsaveis?',
            showCancelButton: true,
            confirmButtonText: 'Continuar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) {
            return false;
        }
    }

    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('descricao', document.getElementById('workflowDescricao').value.trim());
    formData.append('prioridade', prioridade);
    formData.append('categoria', document.getElementById('workflowCategoria').value || '');
    formData.append('responsaveis', document.getElementById('selectedUsersIds').value);
    formData.append('prazo_final', prazo);

    selectedFiles.forEach((file, index) => {
        formData.append(`anexos[${index}]`, file);
    });

    const loadingSwal = Swal.fire({
        title: 'Enviando workflow...',
        html: 'Por favor, aguarde enquanto processamos seu workflow.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const response = await fetch('/app/routers/workflow/WorkFlowRouter.php?action=createWorkflow', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        const result = await response.json();
        await loadingSwal.close();

        if (!response.ok) {
            throw new Error(result.message || 'Erro ao enviar formulario');
        }

        if (result.status === 'success') {
            const workflowId = result.data.id || result.data.workflow_id;
            const swalResult = await Swal.fire({
                icon: 'success',
                title: 'Workflow criado!',
                text: 'O workflow foi registrado com sucesso.',
                showConfirmButton: true,
                confirmButtonText: 'Ver detalhes',
                showCancelButton: true,
                cancelButtonText: 'Fechar'
            });

            const modal = bootstrap.Modal.getInstance(document.getElementById('newWorkflowModal'));
            if (modal) {
                modal.hide();
            }

            resetWorkflowForm();
            carregarWorkFlows(currentFilter);
            loadWorkflowStatistics();

            if (swalResult.isConfirmed && workflowId) {
                window.location.href = `/app/views/workflow/detalhes/index.php?id=${workflowId}`;
            }
        } else {
            throw new Error(result.message || 'Erro ao processar o workflow');
        }
    } catch (error) {
        await loadingSwal.close();
        console.error('Erro:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao criar workflow',
            text: error.message,
            footer: 'Por favor, tente novamente.'
        });
    }
}

function resetWorkflowForm() {
    document.getElementById('newWorkflowForm').reset();
    selectedUsers = [];
    selectedFiles = [];
    updateSelectedUsersContainer();
    updateFileList();

    const selectElement = document.getElementById('workflowResponsaveis');
    if (selectElement && $(selectElement).data('select2')) {
        $(selectElement).val(null).trigger('change');
    }

    const formElements = document.getElementById('newWorkflowForm').elements;
    for (const element of formElements) {
        element.classList.remove('is-invalid');
    }
}

function updateSelectedUsersContainer() {
    const container = document.getElementById('selectedUsersContainer');
    const hiddenInput = document.getElementById('selectedUsersIds');
    if (!container || !hiddenInput) return;

    container.innerHTML = '';
    if (selectedUsers.length === 0) {
        container.innerHTML = '<span class="text-muted">Nenhum usuario selecionado</span>';
        hiddenInput.value = '';
        return;
    }

    selectedUsers.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'selected-user-chip';
        userCard.innerHTML = `
            <span>${user.name}</span>
            <button type="button" class="btn-close btn-close-sm" data-user-id="${user.id}" aria-label="Remover usuario"></button>`;
        container.appendChild(userCard);
    });

    hiddenInput.value = selectedUsers.map(user => user.id).join(',');
    container.querySelectorAll('.btn-close').forEach(btn => {
        btn.addEventListener('click', function () {
            const userId = this.getAttribute('data-user-id');
            selectedUsers = selectedUsers.filter(user => user.id !== userId);
            updateSelectedUsersContainer();
        });
    });
}

function handleFileUpload(files) {
    if (selectedFiles.length + files.length > MAX_FILES) {
        Swal.fire({
            icon: 'error',
            title: 'Limite excedido',
            text: `Voce pode enviar no maximo ${MAX_FILES} arquivos.`,
            footer: `Arquivos selecionados: ${selectedFiles.length} | Tentando adicionar: ${files.length}`
        });
        return;
    }

    Array.from(files).forEach(file => {
        if (file.size > MAX_FILE_SIZE) {
            Swal.fire({
                icon: 'warning',
                title: 'Arquivo muito grande',
                html: `O arquivo <strong>${file.name}</strong> excede o tamanho maximo de 10MB.<br>Tamanho: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
                footer: 'Este arquivo nao sera adicionado.'
            });
            return;
        }

        if (selectedFiles.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) {
            Swal.fire({
                icon: 'info',
                title: 'Arquivo duplicado',
                html: `O arquivo <strong>${file.name}</strong> ja foi selecionado.`,
                footer: 'Este arquivo nao sera adicionado novamente.'
            });
            return;
        }

        selectedFiles.push(file);
    });

    updateFileList();
}

function updateFileList() {
    const fileListElement = document.getElementById('fileList');
    if (!fileListElement) return;

    fileListElement.innerHTML = '';
    if (selectedFiles.length === 0) {
        fileListElement.innerHTML = '<div class="file-list-empty">Nenhum arquivo selecionado</div>';
        return;
    }

    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-list-item';
        let iconClass = 'fa-file';

        if (file.type.startsWith('image/')) iconClass = 'fa-file-image';
        else if (file.type.startsWith('video/')) iconClass = 'fa-file-video';
        else if (file.type.startsWith('audio/')) iconClass = 'fa-file-audio';
        else if (file.type === 'application/pdf') iconClass = 'fa-file-pdf';
        else if (file.type.includes('spreadsheet')) iconClass = 'fa-file-excel';
        else if (file.type.includes('word')) iconClass = 'fa-file-word';

        fileItem.innerHTML = `
            <div class="file-list-item__meta">
                <span class="file-list-item__icon">
                    <i class="fas ${iconClass}"></i>
                </span>
                <div>
                    <div class="file-list-item__name">${file.name}</div>
                    <small class="file-list-item__size">${(file.size / 1024).toFixed(2)} KB</small>
                </div>
            </div>
            <button type="button" class="file-remove-btn" data-file-index="${index}" aria-label="Remover arquivo">
                <i class="fas fa-times"></i>
            </button>
        `;
        fileListElement.appendChild(fileItem);
    });

    const counter = document.createElement('div');
    counter.className = 'file-list-counter mt-2';
    counter.textContent = `${selectedFiles.length} de ${MAX_FILES} arquivos selecionados`;
    fileListElement.appendChild(counter);

    fileListElement.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function () {
            const index = parseInt(this.getAttribute('data-file-index'), 10);
            selectedFiles.splice(index, 1);
            updateFileList();
        });
    });
}

function setActiveFilterButton(activeId) {
    ['btnTodos', 'btnMeus', 'btnParticipando'].forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            button.classList.toggle('active', id === activeId);
        }
    });
}

function configurarEventos() {
    document.getElementById('newWorkflowForm').addEventListener('submit', function (e) {
        e.preventDefault();
        sendFormData();
    });

    document.getElementById('newWorkflowModal').addEventListener('hidden.bs.modal', function () {
        resetWorkflowForm();
    });

    document.getElementById('workflowPrazoFinal').addEventListener('change', function () {
        const dataSelecionada = new Date(this.value);
        const dataAtual = new Date();
        dataAtual.setHours(0, 0, 0, 0);

        if (dataSelecionada < dataAtual) {
            Swal.fire({
                icon: 'error',
                title: 'Data invalida',
                text: 'A data do prazo final nao pode ser menor que a data atual!',
                confirmButtonText: 'Entendi',
                confirmButtonColor: '#dc3545',
                timer: 5000,
                timerProgressBar: true
            });
            this.value = '';
            this.focus();
        }
    });

    document.getElementById('btnTodos').addEventListener('click', function () {
        setActiveFilterButton('btnTodos');
        carregarWorkFlows('todos');
    });

    document.getElementById('btnMeus').addEventListener('click', function () {
        setActiveFilterButton('btnMeus');
        carregarWorkFlows('meus');
    });

    document.getElementById('btnParticipando').addEventListener('click', function () {
        setActiveFilterButton('btnParticipando');
        carregarWorkFlows('participando');
    });

    const fileDropArea = document.getElementById('fileDropArea');
    const fileInput = document.getElementById('fileInput');
    if (fileDropArea && fileInput) {
        fileDropArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', e => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files);
                fileInput.value = '';
            }
        });

        fileDropArea.addEventListener('dragover', e => {
            e.preventDefault();
            fileDropArea.classList.add('is-dragover');
        });

        fileDropArea.addEventListener('dragleave', () => {
            fileDropArea.classList.remove('is-dragover');
        });

        fileDropArea.addEventListener('drop', e => {
            e.preventDefault();
            fileDropArea.classList.remove('is-dragover');
            if (e.dataTransfer.files.length > 0) {
                handleFileUpload(e.dataTransfer.files);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', function () {
    configurarEventos();
    carregarUsuarios();
    loadWorkflowStatistics();
    updateFileList();
    carregarWorkFlows('todos');
});
