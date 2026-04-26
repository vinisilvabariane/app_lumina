document.addEventListener("DOMContentLoaded", function () {
    // Obtém o ID do workflow a partir de uma variável global ou outro método
    const workflowId = typeof WORKFLOW_ID !== 'undefined' ? WORKFLOW_ID : 0;

    /*
    * Verifica e atualiza o status do workflow periodicamente
    */
    async function atualizarStatusWorkflow() {
        if (!workflowId) {
            console.error("ID do workflow inválido para verificação de status.");
            return;
        }
        const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=atualizarStatusWorkflow`;
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ workflowId })
            });
            if (!response.ok) {
                throw new Error(`Erro na requisição de status: ${response.statusText}`);
            }
            const data = await response.json();
        } catch (error) {
            console.error("Erro ao verificar status do workflow:", error);
        }
    }

    /*
    * Verifica se o usuário logado é o proprietário do workflow.
    */
    async function getPermissionOwnerWorkflow() {
        if (!workflowId || workflowId === 0) {
            console.error("ID do workflow inválido para verificação de permissão.");
            return;
        }
        const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=getValidateOwner&id=${workflowId}`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`Erro na requisição de permissão: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.status === 'success' && data.data) {
                const btnAprovar = document.getElementById('btnAprovar');
                const btnRejeitar = document.getElementById('btnRejeitar');
                const btnEditar = document.getElementById('btnEditar');
                if (data.data.isOwner === true) {
                    btnEditar.style.display = 'inline-block';
                    btnAprovar.style.display = 'none';
                    btnRejeitar.style.display = 'none';
                } else {
                    btnEditar.style.display = 'none';
                    btnAprovar.style.display = 'inline-block';
                    btnRejeitar.style.display = 'inline-block';
                }
            }
        } catch (error) {
            console.error('Erro ao validar permissão do workflow:', error);
        }
    }

    /*
    * Carrega todos os dados do workflow do backend e inicia o preenchimento da página.
    */
    async function carregarDadosDoWorkflow() {
        if (!workflowId || workflowId === 0) {
            Swal.fire({
                icon: 'error',
                title: 'ID inválido',
                text: 'Não foi possível identificar o workflow.'
            });
            window.history.back();
            return;
        }
        const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=carregarWorkflowPorId&id=${workflowId}`;
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
            if (result.status === 'success' && result.data) {
                preencherDadosWorkflow(result.data);
                await configurarAcoes(result.data);
            } else {
                throw new Error(result.message || 'Workflow não encontrado');
            }
        } catch (error) {
            console.error('Erro ao carregar workflow:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao carregar workflow',
                text: error.message || 'Não foi possível carregar os dados do workflow.'
            }).then(() => {
                window.history.back();
            });
        }
    }

    /*
    * Preenche os dados do Workflow
    */
    async function preencherDadosWorkflow(workflow) {
        document.getElementById('workflowTitulo').textContent = workflow.titulo;
        const prazoFinalElement = document.getElementById('prazoFinal');
        if (workflow.prazo_final) {
            const dataPrazo = new Date(workflow.prazo_final);
            const dataFormatada = dataPrazo.toLocaleDateString('pt-BR');
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            dataPrazo.setHours(0, 0, 0, 0);
            if (dataPrazo < hoje) {
                prazoFinalElement.className = 'd-flex align-items-center mb-2 fw-bold text-danger';
            } else if (dataPrazo.getTime() === hoje.getTime()) {
                prazoFinalElement.className = 'd-flex align-items-center mb-2 fw-bold text-warning';
            } else {
                prazoFinalElement.className = 'd-flex align-items-center mb-2 fw-bold text-success';
            }
            prazoFinalElement.innerHTML = `<i class="fas fa-calendar-day me-2"></i>Prazo Final: ${dataFormatada}`;
        } else {
            prazoFinalElement.innerHTML = `<i class="fas fa-calendar-day me-2"></i>Prazo Final: Não definido`;
            prazoFinalElement.className = 'd-flex align-items-center mb-2 fw-bold text-muted';
        }
        const descricaoElement = document.getElementById('workflowDescricao');
        const descricao = workflow.descricao || 'Sem descrição';
        descricaoElement.textContent = descricao;
        descricaoElement.className = 'mb-0 text-dark lh-base' + (descricao === 'Sem descrição' ? ' text-muted fst-italic' : '');
        const prioridadeElement = document.getElementById('workflowPrioridade');
        prioridadeElement.innerHTML = getPrioridadeBadgeHTML(workflow.prioridade || 'MEDIA');
        const categoriaElement = document.getElementById('workflowCategoria');
        categoriaElement.innerHTML = getCategoriaBadgeHTML(workflow.categoria || 'Não definida');
        const statusElement = document.getElementById('workflowStatus');
        statusElement.innerHTML = getStatusBadgeHTML(workflow.status || 'EM_ANDAMENTO');
        document.getElementById('workflowCriador').textContent = workflow.nome_criador || 'Usuário não identificado';
        document.getElementById('workflowDataCriacao').textContent = formatarData(workflow.data_criacao);
        const usuarioDono = await getIsOwnerWorkflow();
        carregarResponsaveis(workflow.responsaveis || [], usuarioDono);
        carregarAnexos(workflow.anexos || []);
        verificaRevisaoWorkflow();
        carregarEtapas();
    }

    /*
    * Função para retornar o HTML do badge de prioridade
    */
    function getPrioridadeBadgeHTML(prioridade) {
        const config = {
            'ALTA': { icon: 'fas fa-exclamation-triangle', text: 'Alta', class: 'badge bg-info text-white px-3 py-2' },
            'MEDIA': { icon: 'fas fa-minus-circle', text: 'Média', class: 'badge bg-info text-dark px-3 py-2' },
            'BAIXA': { icon: 'fas fa-check-circle', text: 'Baixa', class: 'badge bg-info text-white px-3 py-2' }
        };
        const cfg = config[prioridade] || { icon: 'fas fa-question-circle', text: prioridade, class: 'badge bg-secondary text-white px-3 py-2' };
        return `<span class="${cfg.class}"><i class="${cfg.icon} me-1"></i> ${cfg.text}</span>`;
    }

    /*
    * Função para retornar o HTML do badge de categoria
    */
    function getCategoriaBadgeHTML(categoria) {
        const config = {
            'REQUISITOS': { text: 'Requisitos', class: 'badge bg-info text-white px-3 py-2' },
            'NORMAS': { text: 'Normas', class: 'badge bg-info text-dark px-3 py-2' },
            'PROCEDIMENTOS': { text: 'Procedimentos', class: 'badge bg-info text-white px-3 py-2' }
        };
        const cfg = config[categoria] || { text: categoria, class: 'badge bg-secondary text-white px-3 py-2' };
        return `<span class="${cfg.class}">${cfg.text}</span>`;
    }

    /*
    * Função para retornar o HTML do badge de status
    */
    function getStatusBadgeHTML(status) {
        const config = {
            'EM_ANDAMENTO': { icon: 'fas fa-sync-alt fa-spin', text: 'Em Andamento', class: 'badge bg-info text-white px-3 py-2' },
            'APROVADO': { icon: 'fas fa-check-circle', text: 'Aprovado', class: 'badge bg-info text-white px-3 py-2' },
            'REJEITADO': { icon: 'fas fa-times-circle', text: 'Rejeitado', class: 'badge bg-info text-white px-3 py-2' }
        };
        const cfg = config[status] || { icon: 'fas fa-question-circle', text: status, class: 'badge bg-secondary text-white px-3 py-2' };
        return `<span class="${cfg.class}"><i class="${cfg.icon} me-1"></i> ${cfg.text}</span>`;
    }

    /*
    * Formata uma data no formato brasileiro
    */
    function formatarData(dataString) {
        if (!dataString) return 'Data não disponível';
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR');
    }

    /*
    * Formata o tamanho do arquivo em uma unidade legível (Bytes, KB, MB, GB)
    */
    function formatarTamanhoArquivo(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /*
    * Retorna o ícone apropriado para o tipo MIME do arquivo
    */
    function getIconePorTipo(tipo) {
        if (!tipo) return 'fas fa-file';
        const icones = {
            'pdf': 'fas fa-file-pdf text-danger', 'image': 'fas fa-file-image text-success',
            'video': 'fas fa-file-video text-warning', 'audio': 'fas fa-file-audio text-info',
            'zip': 'fas fa-file-archive text-secondary', 'word': 'fas fa-file-word text-primary',
            'excel': 'fas fa-file-excel text-success', 'powerpoint': 'fas fa-file-powerpoint text-danger',
            'text': 'fas fa-file-alt text-muted', 'code': 'fas fa-file-code text-info'
        };
        if (tipo.includes('pdf')) return icones.pdf;
        if (tipo.includes('image')) return icones.image;
        if (tipo.includes('video')) return icones.video;
        if (tipo.includes('audio')) return icones.audio;
        if (tipo.includes('zip') || tipo.includes('rar')) return icones.zip;
        if (tipo.includes('word')) return icones.word;
        if (tipo.includes('excel')) return icones.excel;
        if (tipo.includes('powerpoint')) return icones.powerpoint;
        if (tipo.includes('text')) return icones.text;
        if (tipo.includes('javascript') || tipo.includes('php') || tipo.includes('html')) return icones.code;
        return 'fas fa-file text-muted';
    }

    /*
    * Carrega os responsáveis no container designado no formato de cards
    */
    function carregarResponsaveis(responsaveis, usuarioDono = false) {
        const container = document.getElementById('responsaveisContainer');
        const btnAdicionar = document.getElementById('btnAdicionarResponsavel');
        if (btnAdicionar) {
            btnAdicionar.style.display = usuarioDono ? 'inline-block' : 'none';
        }
        if (responsaveis.length === 0) {
            container.innerHTML = `
        <div class="col-12">
            <div class="card">
                <div class="card-body text-center text-muted py-4">
                    <i class="fas fa-users fa-2x mb-3 opacity-50"></i>
                    <p class="mb-0">Nenhum responsável atribuído</p>
                </div>
            </div>
        </div>`;
            return;
        }
        container.innerHTML = responsaveis.map(resp => `
    <div class="col-12 mb-3">
        <div class="card h-100 shadow-sm border-0">
            <div class="card-body p-3">
                <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center">
                        <div class="flex-shrink-0">
                            <div class="bg-info rounded-circle d-flex align-items-center justify-content-center text-white" 
                                 style="width: 50px; height: 50px;">
                                <i class="fas fa-user fa-lg"></i>
                            </div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h6 class="card-title mb-1 text-dark fw-bold">${resp.nome_usuario || 'Usuário'}</h6>
                            <p class="card-text mb-0 text-muted small">
                                <i class="fas fa-at me-1"></i>${resp.usuario_login || ''}
                            </p>
                        </div>
                    </div>
                    ${usuarioDono ? `
                    <button class="btn btn-sm btn-danger btn-remover-responsavel" 
                            data-user-id="${resp.id || resp.usuario_id}"
                            data-user-name="${resp.nome_usuario || 'Usuário'}"
                            title="Remover responsável">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        </div>
    </div>
    `).join('');
        if (usuarioDono) {
            document.querySelectorAll('.btn-remover-responsavel').forEach(btn => {
                btn.addEventListener('click', function () {
                    const userId = this.getAttribute('data-user-id');
                    const userName = this.getAttribute('data-user-name');
                    removerResponsavel(userId, userName);
                });
            });
        }
    }

    /*
    * Carrega os anexos no container designado 
    */
    function carregarAnexos(anexos) {
        const container = document.getElementById('anexosContainer');
        if (anexos.length === 0) {
            container.innerHTML = `<div class="col-12 text-center py-5"><i class="fas fa-folder-open fa-3x text-muted mb-3"></i><h5 class="text-muted">Nenhum anexo encontrado</h5></div>`;
            return;
        }
        container.innerHTML = anexos.map(anexo => `
            <div class="col-xl-4 col-lg-6 col-md-6 mb-3">
                <div class="card h-100 shadow-sm hover-shadow">
                    <div class="card-body p-3">
                        <div class="text-center mb-3">
                            <i class="${getIconePorTipo(anexo.tipo)} fa-3x mb-2"></i>
                            <h6 class="card-title text-truncate text-dark fw-bold" title="${anexo.nome_arquivo}">${anexo.nome_arquivo || 'Arquivo'}</h6>
                        </div>
                        <div class="small text-muted text-center mb-3">
                            <div class="mb-1"><i class="fas fa-hdd me-1"></i> ${formatarTamanhoArquivo(anexo.tamanho)}</div>
                            <div><i class="fas fa-calendar me-1"></i> ${formatarData(anexo.data_upload)}</div>
                        </div>
                        <a href="${anexo.caminho_arquivo}" class="btn btn-primary btn-sm w-100" target="_blank" download="${anexo.nome_arquivo}">
                            <i class="fas fa-download me-1"></i> Baixar
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /*
    * Abre o modal de justificativa para aprovação ou rejeição
    */
    function abrirModalJustificativa(acao) {
        const modal = new bootstrap.Modal(document.getElementById('justificativaModal'));
        const header = document.getElementById('justificativaModalHeader');
        const titulo = document.getElementById('justificativaModalLabel');
        document.getElementById('acaoTipo').value = acao;
        document.getElementById('textoJustificativa').value = '';
        if (acao === 'aprovar') {
            header.className = 'modal-header bg-success text-white';
            titulo.innerHTML = '<i class="fas fa-check-circle me-2"></i> Justificativa de Aprovação';
        } else if (acao === "rejeitar") {
            header.className = 'modal-header bg-danger text-white';
            titulo.innerHTML = '<i class="fas fa-times-circle me-2"></i> Justificativa de Rejeição';
            carregarUsuarios();
        }
        modal.show();
    }

    /*
    * Função para buscar os usuários e carregar no select
    */
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
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            const result = await response.json();
            if (result.status !== 'success' || !Array.isArray(result.data)) {
                throw new Error('Resposta inválida do servidor');
            }
            const selectElement = document.getElementById('selectResponsavel');
            if (selectElement) {
                selectElement.innerHTML = '';
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Selecione...';
                selectElement.appendChild(defaultOption);
                result.data.forEach(usuario => {
                    const option = document.createElement('option');
                    option.value = usuario.ID;
                    option.textContent = usuario.USUARIO;
                    selectElement.appendChild(option);
                });
                if ($(selectElement).hasClass('select2-hidden-accessible')) {
                    $(selectElement).select2('destroy');
                }
                $(selectElement).select2({
                    placeholder: "Selecione o responsável",
                    allowClear: true,
                    width: '100%',
                    dropdownParent: $('#addResponsavelModal')
                });
            }
        } catch (error) {
            console.error("Erro ao carregar usuários:", error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Não foi possível carregar a lista de usuários.'
            });
        }
    }

    /*
    * Abre o modal de visualização da justificativa na timeline
    */
    function abrirModalJustificativaTimeline(justificativa, titulo, usuario, data) {
        const modalHTML = `
        <div class="modal fade" id="justificativaTimelineModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-file-alt me-2"></i>${titulo}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <strong><i class="fas fa-user me-1"></i>Usuário:</strong>
                                <p class="mb-0">${usuario}</p>
                            </div>
                            <div class="col-md-6">
                                <strong><i class="fas fa-calendar me-1"></i>Data:</strong>
                                <p class="mb-0">${data}</p>
                            </div>
                        </div>
                        <div class="mb-3">
                            <strong><i class="fas fa-comment me-1"></i>Justificativa:</strong>
                            <div class="p-3 mt-2">
                                ${justificativa.replace(/\n/g, '<br>')}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-1"></i> Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        const existingModal = document.getElementById('justificativaTimelineModal');
        if (existingModal) {
            const existingBsModal = bootstrap.Modal.getInstance(existingModal);
            if (existingBsModal) {
                existingBsModal.dispose();
            }
            existingModal.remove();
        }
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('justificativaTimelineModal'));
        modal.show();
        document.getElementById('justificativaTimelineModal').addEventListener('hidden.bs.modal', function () {
            const bsModal = bootstrap.Modal.getInstance(this);
            if (bsModal) {
                bsModal.dispose();
            }
            this.remove();
        });
    }

    /*
    * Abre o modal de edição do workflow
    */
    function abrirModalEditar(workflow) {
        document.getElementById('editarTitulo').value = workflow.titulo || '';
        document.getElementById('editarDescricao').value = workflow.descricao || '';
        document.getElementById('editarPrioridade').value = workflow.prioridade || 'MEDIA';
        document.getElementById('editarCategoria').value = workflow.categoria || 'PROJETO';
        const modal = new bootstrap.Modal(document.getElementById('editarWorkflowModal'));
        modal.show();
    }

    /*
    * Carrega as etapas do workflow e preenche a timeline
    */
    function carregarEtapas() {
        if (!workflowId || workflowId === 0) {
            console.error("ID do workflow inválido para carregar etapas.");
            document.getElementById('timeline-items').innerHTML = `
            <div class="text-center py-4 text-warning">
                <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                <p>ID do workflow não identificado</p>
            </div>`;
            return;
        }
        const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=getEtapas&workflowId=${workflowId}`;
        fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const container = document.getElementById('timeline-items');
                if (data.success && data.data && data.data.length > 0) {
                    return gerarTimelineItems(data.data).then(html => {
                        container.innerHTML = html;
                    });
                } else {
                    container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <p class="text-muted">Nenhuma ação registrada no histórico</p>
                </div>`;
                }
            })
            .catch(error => {
                console.error('Erro ao carregar etapas:', error);
                document.getElementById('timeline-items').innerHTML = `
            <div class="text-center py-4 text-danger">
                <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                <p>Erro ao carregar histórico</p>
                <small class="text-muted">${error.message}</small>
            </div>`;
            });
    }

    /*
    * Função para obter o ID do usuário atual
    */
    async function obterUsuarioIdAtual() {
        try {
            const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=obterUsuarioIdAtual`;
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.id) {
                    console.log("DADOS VINDOS DO BANCO: ", data);
                    return data.id;
                } else if (data.id) {
                    return data.id;
                } else if (data.usuarioId) {
                    return data.usuarioId;
                }
            }
            return null;
        } catch (error) {
            console.error('Erro ao obter ID do usuário:', error);
            return null;
        }
    }

    /*
    * Event Listener para botões de revisão
    */
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('btn-revisar-workflow') ||
            e.target.closest('.btn-revisar-workflow')) {
            const button = e.target.classList.contains('btn-revisar-workflow') ?
                e.target : e.target.closest('.btn-revisar-workflow');
            const tipoRevisao = button.getAttribute('data-tipo-revisao');
            const etapaId = button.getAttribute('data-etapa-id');
            if (tipoRevisao === 'dono') {
                abrirModalRevisaoDono(etapaId);
            } else if (tipoRevisao === 'usuario') {
                abrirModalRevisaoUsuario(etapaId);
            }
        }
    });

    /*
    * Função auxiliar para obter se o usuário é dono do workflow
    */
    async function getIsOwnerWorkflow() {
        if (!workflowId || workflowId === 0) {
            console.error("ID do workflow inválido para verificação de permissão.");
            return false;
        }
        const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=getValidateOwner&id=${workflowId}`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`Erro na requisição de permissão: ${response.statusText}`);
            }
            const data = await response.json();
            return data.status === 'success' && data.data ? data.data.isOwner : false;
        } catch (error) {
            console.error('Erro ao validar permissão do workflow:', error);
            return false;
        }
    }

    /*
    * Função para abrir modal de revisão do dono - VERSÃO CORRIGIDA
    */
    function abrirModalRevisaoDono(etapaId) {
        const modal = document.getElementById('revisaoDonoModal');
        modal.setAttribute('data-etapa-id', etapaId);
        document.getElementById('justificativaRevisaoDono').value = '';
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    /*
   * Função para abrir modal de revisão do usuário - VERSÃO CORRIGIDA
   */
    function abrirModalRevisaoUsuario(etapaId) {
        const modal = document.getElementById('revisaoUsuarioModal');
        modal.setAttribute('data-etapa-id', etapaId);
        document.getElementById('justificativaRevisaoUsuario').value = '';
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    /*
    * Event Listener para submissão do formulário de revisão do dono
    */
    document.getElementById('formRevisaoDono').addEventListener('submit', async function (e) {
        e.preventDefault();
        await processarRevisao('dono');
    });

    /*
    * Event Listener para submissão do formulário de revisão do usuário
    */
    document.getElementById('formRevisaoUsuario').addEventListener('submit', async function (e) {
        e.preventDefault();
        await processarRevisao('usuario');
    });

    /*
    * Event Listener para botões de ver justificativa na timeline
    */
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('btn-ver-justificativa') ||
            e.target.closest('.btn-ver-justificativa')) {
            const button = e.target.classList.contains('btn-ver-justificativa') ?
                e.target : e.target.closest('.btn-ver-justificativa');
            const justificativa = button.getAttribute('data-justificativa');
            const titulo = button.getAttribute('data-titulo');
            const usuario = button.getAttribute('data-usuario');
            const data = button.getAttribute('data-data');
            abrirModalJustificativaTimeline(justificativa, titulo, usuario, data);
        }
    });

    /*
    * Retorna a configuração visual para cada tipo de ação na timeline 
    */
    async function verificaAprovado() {
        if (!workflowId || workflowId === 0) {
            console.error("ID do workflow inválido para verificação de aprovação.");
            return false;
        }
        const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=verificaAprovado`;
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workflowId }),
            });
            if (!response.ok) {
                throw new Error("Erro ao verificar aprovação do workflow.");
            }
            const data = await response.json();
            const aprovado = data?.data?.aprovado === true;
            return aprovado;
        } catch (error) {
            console.error("Erro na verificação de aprovação:", error);
            return false;
        }
    }

    /*
    * Valida se o usuário logado é um dos responsáveis pelo workflow
    */
    async function validarResponsavel() {
        if (!workflowId || workflowId === 0) {
            console.error("ID do workflow inválido para verificação de aprovação.");
            return false;
        }
        const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=validarResponsavel`;
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workflowId }),
            });
            if (!response.ok) {
                throw new Error("Erro ao verificar aprovação do workflow.");
            }
            const data = await response.json();
            return data?.data?.isResponsavel === true;
        } catch (error) {
            throw new Error("Erro na verificação do responsável: " + error.message);
        }
    }

    /*
    * Verifica se o usuário reprovou o workflow
    */
    async function verificaReprovacaoUsuario() {
        if (!workflowId || workflowId === 0) {
            console.error("ID do workflow inválido para verificação de reprovação.");
            return false;
        }
        const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=verificaReprovacaoUsuario`;
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workflowId }),
                credentials: "include"
            });
            if (!response.ok) {
                throw new Error("Erro ao verificar reprovação do workflow.");
            }
            const data = await response.json();
            return Boolean(data?.data?.temReprovacao);
        } catch (error) {
            console.error("Erro na verificação de reprovação:", error);
            return false;
        }
    }

    /*
    * Verifica se o usuário aprovou o workflow
    */
    async function verificaAprovacaoUsuario() {
        if (!workflowId || workflowId === 0) {
            console.error("ID do workflow inválido para verificação de aprovação.");
            return false;
        }
        const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=verificaAprovacaoUsuario`;
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workflowId }),
                credentials: "include"
            });
            if (!response.ok) {
                throw new Error("Erro ao verificar aprovação do workflow.");
            }
            const data = await response.json();
            return Boolean(data?.data?.temAprovacao); // Mudei para temAprovacao
        } catch (error) {
            console.error("Erro na verificação de aprovação:", error);
            return false;
        }
    }

    /*
    * Retorna a configuração visual para cada tipo de ação na timeline 
    */
    function getConfiguracaoAcao(acao) {
        const configs = {
            'CRIACAO': { icone: 'fas fa-plus', cor: 'bg-primary', titulo: 'Workflow Criado' },
            'EDICAO': { icone: 'fas fa-edit', cor: 'bg-warning', titulo: 'Workflow Atualizado' },
            'APROVACAO': { icone: 'fas fa-check', cor: 'bg-success', titulo: 'Workflow Aprovado pelo Usuário' },
            'APROVACAO_FINAL': { icone: 'fas fa-check', cor: 'bg-success', titulo: 'Workflow Finalizado' },
            'REPROVACAO': { icone: 'fas fa-times', cor: 'bg-danger', titulo: 'Workflow Rejeitado' },
            'COMENTARIO': { icone: 'fas fa-comment', cor: 'bg-info', titulo: 'Comentário Adicionado' },
            'ANEXO_ADICIONADO': { icone: 'fas fa-upload', cor: 'bg-secondary', titulo: 'Arquivo Anexado' },
        };
        return configs[acao] || { icone: 'fas fa-circle', cor: 'bg-dark', titulo: 'Ação Realizada' };
    }

    /*
    * Event Listener para submissão do formulário de justificativa (aprovar/rejeitar)
    */
    document.getElementById('formJustificativa').addEventListener('submit', async function (e) {
        e.preventDefault();
        const acao = document.getElementById('acaoTipo').value;
        const justificativa = document.getElementById('textoJustificativa').value;
        const selectResp = document.getElementById('workflowResponsaveis');
        if (!justificativa.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Justificativa obrigatória',
                text: 'Por favor, informe uma justificativa.'
            });
            return;
        }
        const novoResp = (acao === 'rejeitar' && selectResp && selectResp.value) ? selectResp.value : null;
        try {
            const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=${acao}PorUsuarioWorkflow`;
            const payload = {
                workflowId: workflowId,
                justificativa
            };
            if (novoResp) {
                payload.novo_resp = novoResp;
            }
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            const result = await response.json();
            if (result.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: `Workflow ${acao === 'aprovar' ? 'aprovado' : 'rejeitado'}!`,
                    text: result.message || 'Ação realizada com sucesso.'
                }).then(() => {
                    bootstrap.Modal.getInstance(document.getElementById('justificativaModal')).hide();
                    carregarDadosDoWorkflow();
                });
            } else {
                throw new Error(result.message || 'Erro ao processar ação');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: error.message || 'Não foi possível processar a ação.'
            });
        }
    });

    /*
    * Verifica com quem esta a revisão
    */
    async function verificaRevisaoWorkflow() {
        if (!workflowId) return { etapasEmRevisao: [], totalEtapasRevisao: 0 };
        try {
            const response = await fetch('/app/routers/workflow/WorkFlowRouter.php?action=verificaRevisaoWorkflow', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workflowId }),
                credentials: "include"
            });
            const data = await response.json();
            return {
                etapasEmRevisao: data?.data?.etapas_em_revisao || [],
                totalEtapasRevisao: data?.data?.total_etapas_revisao || 0
            };
        } catch (error) {
            console.error("Erro na verificação de revisão:", error);
            return { etapasEmRevisao: [], totalEtapasRevisao: 0 };
        }
    }

    /*
    * Configura os botões de ação com base no status do workflow e permissões
    */
    async function configurarAcoes(workflow) {
        const btnAprovar = document.getElementById('btnAprovar');
        const btnRejeitar = document.getElementById('btnRejeitar');
        const btnEditar = document.getElementById('btnEditar');
        btnAprovar.style.display = 'none';
        btnRejeitar.style.display = 'none';
        btnEditar.style.display = 'none';
        const aprovado = await verificaAprovado();
        const isResponsavel = await validarResponsavel();
        const isReproved = await verificaReprovacaoUsuario();
        const isAproved = await verificaAprovacaoUsuario();
        const usuarioDono = await getIsOwnerWorkflow();
        if (!isReproved && !isAproved) {
            if (isResponsavel) {
                if (aprovado || workflow.status === 'APROVADO' || workflow.status === 'REJEITADO') {
                } else {
                    const temPermissao = await getPermissionOwnerWorkflow();
                    if (temPermissao) {
                        btnAprovar.style.display = 'inline-block';
                        btnRejeitar.style.display = 'inline-block';
                    }
                }
            }
        }
        if (usuarioDono) {
            if (!aprovado && workflow.status !== 'APROVADO' && workflow.status !== 'REJEITADO') {
                btnEditar.style.display = 'inline-block';
            }
        }
        if (btnAprovar.style.display !== 'none') {
            btnAprovar.title = 'Aprovar este workflow';
            btnAprovar.replaceWith(btnAprovar.cloneNode(true));
            const novoBtnAprovar = document.getElementById('btnAprovar');
            novoBtnAprovar.addEventListener('click', () => abrirModalJustificativa('aprovar'));
        }
        if (btnRejeitar.style.display !== 'none') {
            btnRejeitar.title = 'Rejeitar este workflow';
            btnRejeitar.replaceWith(btnRejeitar.cloneNode(true));
            const novoBtnRejeitar = document.getElementById('btnRejeitar');
            novoBtnRejeitar.addEventListener('click', () => abrirModalJustificativa('rejeitar'));
        }
        if (btnEditar.style.display !== 'none') {
            btnEditar.title = 'Editar informações do workflow';
            btnEditar.replaceWith(btnEditar.cloneNode(true));
            const novoBtnEditar = document.getElementById('btnEditar');
            novoBtnEditar.addEventListener('click', () => abrirModalEditar(workflow));
        }
    }

    /*
    * Event Listener para submissão do formulário de edição do workflow
    */
    document.getElementById('formEditarWorkflow').addEventListener('submit', async function (e) {
        e.preventDefault();
        const dadosAtualizados = {
            id: workflowId,
            titulo: document.getElementById('editarTitulo').value,
            descricao: document.getElementById('editarDescricao').value,
            prioridade: document.getElementById('editarPrioridade').value,
            categoria: document.getElementById('editarCategoria').value
        };
        try {
            const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=atualizarWorkflow`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify(dadosAtualizados),
                credentials: 'include'
            });
            const result = await response.json();
            if (result.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: 'Workflow atualizado!',
                    text: result.message || 'Alterações salvas com sucesso.'
                }).then(() => {
                    bootstrap.Modal.getInstance(document.getElementById('editarWorkflowModal')).hide();
                    carregarDadosDoWorkflow();
                });
            } else {
                throw new Error(result.message || 'Erro ao atualizar workflow');
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Erro', text: error.message || 'Não foi possível atualizar o workflow.' });
        }
    });

    /*
    * Event Listener aceitar rejeicao por parte do dono
    */
    document.getElementById('btn-aceitar-rejeicao-dono').addEventListener('click', async function (e) {
        e.preventDefault();
        const justificativa = document.getElementById('justificativaRevisaoDono').value;
        if (!justificativa.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo obrigatório',
                text: 'Por favor, digite uma justificativa.'
            });
            return;
        }
        try {
            const endpoint = "/app/routers/workflow/WorkFlowRouter.php?action=rejeitarWorkflow";
            const payload = {
                workflowId,
                justificativa
            };
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            const result = await response.json();
            if (result.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: 'Rejeição aceita!',
                    text: result.message || 'Workflow rejeitado com sucesso.'
                }).then(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('revisaoDonoModal'));
                    modal.hide();
                    carregarDadosDoWorkflow();
                });
            } else {
                throw new Error(result.message || 'Erro ao processar ação');
            }
        } catch (error) {
            console.error('Erro:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: error.message || 'Erro ao aceitar a rejeição!'
            });
        }
    });

    /*
    * Event Listener enviar aprovação do usuario após revisão
    */
    document.getElementById('btn-aprovar-rejeicao-usuario').addEventListener('click', async function (e) {
        e.preventDefault();
        const justificativa = document.getElementById('justificativaRevisaoUsuario').value;
        if (!justificativa.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo obrigatório',
                text: 'Por favor, digite uma justificativa.'
            });
            return;
        }
        try {
            const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=aprovarPorUsuarioWorkflow`;
            const payload = {
                workflowId,
                justificativa
            };
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            const result = await response.json();
            if (result.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: 'Workflow aprovado!',
                    text: result.message || 'Ação realizada com sucesso.'
                }).then(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('revisaoUsuarioModal'));
                    modal.hide();
                    carregarDadosDoWorkflow();
                });
            } else {
                throw new Error(result.message || 'Erro ao processar ação');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: error.message || 'Não foi possível processar a ação.'
            });
        }
    });

    /*
    * Event Listener Devolver rejeição dono
    */
    document.getElementById('btn-enviar-revisao-dono').addEventListener('click', async function (e) {
        e.preventDefault();
        const justificativa = document.getElementById('justificativaRevisaoDono').value;
        const modal = document.getElementById('revisaoDonoModal');
        const etapaId = modal.getAttribute('data-etapa-id');
        if (!justificativa.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo obrigatório',
                text: 'Por favor, digite uma justificativa.'
            });
            return;
        }
        if (!etapaId) {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'ID da etapa não identificado.'
            });
            return;
        }
        try {
            const endpoint = '/app/routers/workflow/WorkFlowRouter.php?action=devolverRevisaoDono';
            const payload = {
                workflowId,
                etapaId,
                justificativa
            };
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            const result = await response.json();
            if (result.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: 'Rejeição aceita!',
                    text: result.message || 'Workflow rejeitado com sucesso.'
                }).then(() => {
                    const modalInstance = bootstrap.Modal.getInstance(modal);
                    modalInstance.hide();
                    carregarDadosDoWorkflow();
                });
            } else {
                throw new Error(result.message || 'Erro ao processar ação');
            }
        } catch (error) {
            console.error('Erro:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: error.message || 'Erro ao aceitar a rejeição!'
            });
        }
    });

    /*
    * Event Listener Devolver rejeição usuário
    */
    document.getElementById('btn-enviar-revisao-usuario').addEventListener('click', async function (e) {
        e.preventDefault();
        const justificativa = document.getElementById('justificativaRevisaoUsuario').value;
        const modal = document.getElementById('revisaoUsuarioModal');
        const etapaId = modal.getAttribute('data-etapa-id');
        if (!justificativa.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo obrigatório',
                text: 'Por favor, digite uma justificativa.'
            });
            return;
        }
        if (!etapaId) {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'ID da etapa não identificado.'
            });
            return;
        }
        try {
            const endpoint = '/app/routers/workflow/WorkFlowRouter.php?action=devolverRevisaoUsuario';
            const payload = {
                workflowId,
                etapaId,
                justificativa
            };
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            const result = await response.json();
            if (result.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: 'Rejeição revisada!',
                    text: result.message || 'Revisão enviada com sucesso.'
                }).then(() => {
                    const modalInstance = bootstrap.Modal.getInstance(modal);
                    modalInstance.hide();
                    carregarDadosDoWorkflow();
                });
            } else {
                throw new Error(result.message || 'Erro ao processar ação');
            }
        } catch (error) {
            console.error('Erro:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: error.message || 'Erro ao enviar a revisão!'
            });
        }
    });

    /*
    * Gera o HTML dos itens da timeline com base nas etapas fornecidas
    */
    async function gerarTimelineItems(etapas) {
        const statusRevisao = await verificaRevisaoWorkflow();
        const usuarioDono = await getIsOwnerWorkflow();
        const usuarioIdAtual = await obterUsuarioIdAtual();
        let timelineHTML = '';
        timelineHTML += etapas.map((etapa, index) => {
            const { icone, cor, titulo } = getConfiguracaoAcao(etapa.tipo_acao);
            const dataFormatada = formatarData(etapa.data_hora);
            const textoJustificativa = etapa.justificativa || etapa.observacoes || etapa.descricao || '';
            const temJustificativa = textoJustificativa.trim() !== '';
            const etapaRejeitada = etapa.tipo_acao === 'REPROVACAO';
            const etapaId = etapa.id;
            const etapaEmRevisao = statusRevisao.etapasEmRevisao.find(
                revisao => parseInt(revisao.etapa_id) === parseInt(etapaId)
            );
            const precisaRevisao = etapaRejeitada && etapaEmRevisao;
            const precisaRevisaoDono = precisaRevisao && etapaEmRevisao?.revisao_dono;
            const precisaRevisaoUsuario = precisaRevisao && etapaEmRevisao?.revisao_usuario;
            const usuarioReprovouEstaEtapa = etapaRejeitada &&
                etapa.usuario_id &&
                usuarioIdAtual &&
                etapa.usuario_id.toString() === usuarioIdAtual.toString();
            let botaoRevisaoHTML = '';
            let botaoChatHTML = '';
            if (etapaRejeitada) {
                botaoChatHTML = `
            <button 
                type="button"
                class="btn btn-sm btn-outline-secondary border-0 mx-1 btn-chat-reprovacao hover-bg"
                data-etapa-id="${etapaId}"
                data-tipo-acao="${etapa.tipo_acao}"
                title="Abrir chat desta reprovação">
                <i class="fas fa-comments me-1"></i> Chat
            </button>`;
            }
            if (precisaRevisao) {
                const tipoRevisao = precisaRevisaoDono ? 'dono' : 'usuario';
                const textoBotao = precisaRevisaoDono ? 'Revisar como Dono' : 'Revisar Minha Ação';
                const classeCor = precisaRevisaoDono ? 'warning' : 'info';
                let mostrarBotao = false;
                if (precisaRevisaoDono) {
                    mostrarBotao = usuarioDono;
                } else {
                    mostrarBotao = usuarioReprovouEstaEtapa;
                }
                if (mostrarBotao) {
                    botaoRevisaoHTML = `
                <button 
                    type="button"
                    class="btn btn-sm btn-outline-${classeCor} border-0 mx-1 btn-revisar-workflow hover-bg"
                    data-tipo-revisao="${tipoRevisao}"
                    data-etapa-id="${etapaId}">
                    <i class="fas fa-clipboard-check me-1"></i> ${textoBotao}
                </button>`;
                }
            }
            let avisoHTML = '';
            if (precisaRevisao) {
                const mensagem = precisaRevisaoDono
                    ? 'O dono do workflow precisa revisar esta rejeição.'
                    : 'O usuário que rejeitou precisa revisar esta ação.';
                const tipoAlerta = precisaRevisaoDono ? 'warning' : 'info';
                const iconeAlerta = precisaRevisaoDono ? 'exclamation-triangle' : 'info-circle';
                avisoHTML = `
            <div class="alert alert-${tipoAlerta} mt-2 py-2" role="alert">
                <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-${iconeAlerta} me-2"></i>
                        <small class="flex-grow-1"><strong>Revisão Pendente:</strong> ${mensagem}</small>
                    </div>
                    <div class="d-flex align-items-center">
                        ${botaoChatHTML}
                        ${botaoRevisaoHTML}
                    </div>
                </div>
            </div>`;
            } else if (etapaRejeitada) {
                avisoHTML = `
            <div class="alert alert-secondary mt-2 py-2" role="alert">
                <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-times-circle me-2"></i>
                        <small class="flex-grow-1"><strong>Reprovação:</strong> Esta etapa foi reprovada.</small>
                    </div>
                    <div class="d-flex align-items-center">
                        ${botaoChatHTML}
                    </div>
                </div>
            </div>`;
            }
            const indicadorRevisao = precisaRevisao ?
                `<span class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"></span>` : '';
            const mostrarBotaoJustificativa = temJustificativa;
            return `
        <div class="d-flex mb-4 position-relative">
            <div class="flex-shrink-0 ${cor} rounded-circle d-flex align-items-center justify-content-center text-white z-1 position-relative" style="width: 40px; height: 40px;">
                <i class="${icone}"></i>
                ${indicadorRevisao}
            </div>
            <div class="flex-grow-1 ms-3">
                <div class="d-flex justify-content-between align-items-start">
                    <h6 class="mb-1 ${precisaRevisao ? 'text-warning' : ''}">
                        ${titulo}
                        ${precisaRevisao ? '<span class="badge bg-warning ms-2">Revisão Pendente</span>' : ''}
                    </h6>
                    <small class="text-muted">${dataFormatada}</small>
                </div>
                <p class="mb-1 text-muted">${etapa.descricao || etapa.etapa}</p>
                ${avisoHTML}
                <div class="d-flex align-items-center mt-2">
                    <small class="text-muted">
                        <i class="fas fa-user me-1"></i>${etapa.usuario_nome || 'Usuário não identificado'}
                    </small>
                    ${mostrarBotaoJustificativa ? `
                    <button 
                        type="button"
                        class="btn btn-sm btn-outline-info border-0 mx-4 btn-ver-justificativa hover-bg"
                        data-justificativa="${textoJustificativa}" 
                        data-titulo="${titulo}"
                        data-usuario="${etapa.usuario_nome || 'Usuário não identificado'}"
                        data-data="${dataFormatada}">
                        <i class="fas fa-eye me-1"></i> Ver Justificativa
                    </button>
                    ` : ''}
                </div>
            </div>
        </div>`;
        }).join('');
        return timelineHTML;
    }

    /*
    * Event Listener para abrir chat de reprovação
    */
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('btn-chat-reprovacao') ||
            e.target.closest('.btn-chat-reprovacao')) {
            e.preventDefault();
            const button = e.target.classList.contains('btn-chat-reprovacao') ?
                e.target : e.target.closest('.btn-chat-reprovacao');
            const etapaId = button.getAttribute('data-etapa-id');
            abrirChatReprovacao(etapaId);
        }
    });

    /*
    * Abre o chat de reprovação para uma etapa específica
    */
    function abrirChatReprovacao(etapaId) {
        if (!etapaId) {
            console.error('ID da etapa não fornecido para abrir o chat');
            return;
        }
        const modalChat = new bootstrap.Modal(document.getElementById('chatReprovacaoModal'));
        const modalElement = document.getElementById('chatReprovacaoModal');
        modalElement.setAttribute('data-etapa-id', etapaId);
        document.getElementById('chatMessagesContainer').innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Carregando mensagens...</p></div>';
        carregarMensagensChat(etapaId);
        modalChat.show();
    }

    /*
    * Carrega as mensagens do chat para uma etapa específica
    */
    async function carregarMensagensChat(etapaId) {
        try {
            const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=getChatReprovacao&etapaId=${etapaId}`;
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.status === 'success') {
                exibirMensagensChat(result.data);
            } else {
                throw new Error(result.message || 'Erro ao carregar mensagens');
            }
        } catch (error) {
            console.error('Erro ao carregar mensagens do chat:', error);
            document.getElementById('chatMessagesContainer').innerHTML = `
            <div class="text-center text-danger py-4">
                <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                <p>Erro ao carregar mensagens</p>
                <small class="text-muted">${error.message}</small>
            </div>
        `;
        }
    }

    /*
    * Exibe as mensagens no container do chat
    */
    async function exibirMensagensChat(mensagens) {
        const container = document.getElementById('chatMessagesContainer');
        if (!mensagens || mensagens.length === 0) {
            container.innerHTML = `
        <div class="text-center text-muted py-4">
            <i class="fas fa-comments fa-2x mb-2"></i>
            <p>Nenhuma mensagem no chat ainda</p>
            <small class="text-muted">As mensagens aparecerão aqui quando houver comunicação sobre esta reprovação.</small>
        </div>`;
            return;
        }
        const usuarioAtualId = await obterUsuarioIdAtual();
        const mensagensHTML = mensagens.map(mensagem => {
            const dataHora = formatarDataHoraChat(mensagem.data_hora || new Date().toISOString());
            const usuarioId = mensagem.user;
            const usuarioNome = mensagem.usuario;
            const isUsuarioAtual = parseInt(usuarioId) === parseInt(usuarioAtualId);
            const bubbleClass = isUsuarioAtual
                ? "bg-info text-white"
                : "bg-light";
            const alignClass = isUsuarioAtual
                ? "justify-content-end"
                : "justify-content-start";
            const textAlignClass = isUsuarioAtual
                ? "text-end"
                : "text-start";
            return `
        <div class="d-flex ${alignClass} mb-3">
            <div class="w-100">
                <div class="d-flex justify-content-between align-items-center mb-1 ${textAlignClass}">
                    <small class="fw-bold ${isUsuarioAtual ? 'text-white' : 'text-white'}">${usuarioNome || 'Usuário'}</small>
                    <small class="${isUsuarioAtual ? 'text-white' : 'text-white'} ms-2">${dataHora}</small>
                </div>
                <div class="card ${bubbleClass}">
                    <div class="card-body p-3">
                        <p class="card-text mb-0 text-white">${mensagem.justificativa || ''}</p>
                    </div>
                </div>
            </div>
        </div>
        `;
        }).join('');
        container.innerHTML = mensagensHTML;
        container.scrollTop = container.scrollHeight;
    }

    /*
    * Formata data/hora para exibição no chat
    */
    function formatarDataHoraChat(dataHoraString) {
        const data = new Date(dataHoraString);
        return data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /*
    * Função para abrir modal de add responsavel
    */
    document.getElementById('btnAdicionarResponsavel').addEventListener('click', async function (e) {
        const modal = new bootstrap.Modal(document.getElementById('addResponsavelModal'));
        const selectElement = document.getElementById('selectResponsavel');
        selectElement.innerHTML = '<option value="">Selecione...</option>';
        modal.show();
        const modalElement = document.getElementById('addResponsavelModal');
        modalElement.addEventListener('shown.bs.modal', async function () {
            await carregarUsuarios();
        }, { once: true });
    });

    /*
    * Função para adicionar responsável
    */
    document.getElementById('btnConfirmarResponsavel').addEventListener('click', async function (e) {
        const selectElement = document.getElementById('selectResponsavel');
        const userId = selectElement.value;
        if (!userId) {
            Swal.fire({
                icon: 'warning',
                title: 'Selecione um usuário',
                text: 'Por favor, selecione um usuário para adicionar como responsável.'
            });
            return;
        }
        try {
            const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=adicionarResponsavel`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    workflowId: workflowId,
                    userId: userId
                }),
                credentials: 'include'
            });
            const result = await response.json();
            if (result.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: 'Responsável adicionado!',
                    text: result.message || 'Responsável adicionado com sucesso.'
                }).then(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addResponsavelModal'));
                    modal.hide();
                    carregarDadosDoWorkflow();
                });
            } else {
                throw new Error(result.message || 'Erro ao adicionar responsável');
            }
        } catch (error) {
            console.error('Erro ao adicionar responsável:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: error.message || 'Não foi possível adicionar o responsável.'
            });
        }
    });

    /*
    * Função para remover um responsável do workflow
    */
    async function removerResponsavel(userId, userName) {
        if (!workflowId || !userId || userId === 'undefined') {
            console.error('ID do workflow ou usuário inválido:', { workflowId, userId });
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'ID do usuário inválido. Não foi possível remover o responsável.'
            });
            return;
        }
        try {
            const endpoint = '/app/routers/workflow/WorkFlowRouter.php?action=carregarUsuarios';
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            const result = await response.json();
            if (result.status !== 'success' || !Array.isArray(result.data)) {
                throw new Error('Resposta inválida do servidor');
            }
            const usuariosDisponiveis = result.data.filter(usuario => usuario.ID !== userId);
            const selectHtml = `
            <div class="mb-3">
                <label for="novoResponsavelSelect" class="form-label">Selecione o novo responsável:</label>
                <select id="novoResponsavelSelect" class="form-select">
                    <option value="">Selecione um novo responsável...</option>
                    ${usuariosDisponiveis.map(usuario =>
                `<option value="${usuario.ID}">${usuario.USUARIO}</option>`
            ).join('')}
                </select>
            </div>
            <div class="form-text">
                É obrigatório selecionar um novo responsável para substituir o removido.
            </div>`;
            const confirmacao = await Swal.fire({
                icon: 'warning',
                title: 'Remover Responsável',
                html: `
                <div>
                    <p>Tem certeza que deseja remover <strong>${userName}</strong> como responsável?</p>
                    ${selectHtml}
                </div>`,
                showCancelButton: true,
                confirmButtonText: 'Sim, substituir',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#d33',
                preConfirm: () => {
                    const select = document.getElementById('novoResponsavelSelect');
                    const novoResponsavelId = select.value;
                    if (!novoResponsavelId) {
                        Swal.showValidationMessage('Por favor, selecione um novo responsável');
                        return false;
                    }
                    return {
                        novoResponsavelId: novoResponsavelId,
                        novoResponsavelNome: select.options[select.selectedIndex].text
                    };
                },
                didOpen: () => {
                    const selectElement = document.getElementById('novoResponsavelSelect');
                    if (typeof $.fn.select2 !== 'undefined') {
                        $(selectElement).select2({
                            placeholder: "Selecione o novo responsável",
                            allowClear: false,
                            width: '100%',
                            dropdownParent: $('.swal2-container')
                        });
                    }
                }
            });
            if (!confirmacao.isConfirmed) {
                return;
            }
            const { novoResponsavelId, novoResponsavelNome } = confirmacao.value;
            const removeEndpoint = `/app/routers/workflow/WorkFlowRouter.php?action=removerResponsavel`;
            const removeResponse = await fetch(removeEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    workflowId: workflowId,
                    userId: userId,
                    novoResponsavelId: novoResponsavelId
                }),
                credentials: 'include'
            });
            const removeResult = await removeResponse.json();
            if (removeResult.status === 'success') {
                let mensagem = removeResult.message;
                if (removeResult.workflow_aprovado) {
                    mensagem += '\n\nO workflow foi automaticamente aprovado pois todos os responsáveis restantes já haviam aprovado.';
                }
                Swal.fire({
                    icon: 'success',
                    title: 'Sucesso!',
                    html: `
                    <p>${mensagem}</p>
                    <p><strong>${userName}</strong> foi substituído por <strong>${novoResponsavelNome}</strong></p>`
                }).then(() => {
                    carregarDadosDoWorkflow();
                });
            } else {
                throw new Error(removeResult.message || 'Erro ao remover responsável');
            }
        } catch (error) {
            console.error('Erro ao remover responsável:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: error.message || 'Não foi possível remover o responsável.'
            });
        }
    }

    atualizarStatusWorkflow();
    carregarDadosDoWorkflow();
});
