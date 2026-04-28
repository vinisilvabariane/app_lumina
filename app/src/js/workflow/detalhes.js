(() => {
    const workflowId = Number(window.WORKFLOW_ID || 0);

    if (!workflowId) {
        return;
    }

    const ROUTES = {
        updateStatus: '/app/routers/workflow/WorkFlowRouter.php?action=atualizarStatusWorkflow',
        workflow: `/app/routers/workflow/WorkFlowRouter.php?action=carregarWorkflowPorId&id=${workflowId}`,
        owner: `/app/routers/workflow/WorkFlowRouter.php?action=getValidateOwner&id=${workflowId}`,
        steps: `/app/routers/workflow/WorkFlowRouter.php?action=getEtapas&workflowId=${workflowId}`,
        userId: '/app/routers/workflow/WorkFlowRouter.php?action=obterUsuarioIdAtual',
        approved: '/app/routers/workflow/WorkFlowRouter.php?action=verificaAprovado',
        responsible: '/app/routers/workflow/WorkFlowRouter.php?action=validarResponsavel',
        userRejected: '/app/routers/workflow/WorkFlowRouter.php?action=verificaReprovacaoUsuario',
        userApproved: '/app/routers/workflow/WorkFlowRouter.php?action=verificaAprovacaoUsuario',
        reviewStatus: '/app/routers/workflow/WorkFlowRouter.php?action=verificaRevisaoWorkflow',
        users: '/app/routers/workflow/WorkFlowRouter.php?action=carregarUsuarios',
        approve: '/app/routers/workflow/WorkFlowRouter.php?action=aprovarPorUsuarioWorkflow',
        rejectByUser: '/app/routers/workflow/WorkFlowRouter.php?action=rejeitarPorUsuarioWorkflow',
        rejectByOwner: '/app/routers/workflow/WorkFlowRouter.php?action=rejeitarWorkflow',
        edit: '/app/routers/workflow/WorkFlowRouter.php?action=atualizarWorkflow',
        returnOwnerReview: '/app/routers/workflow/WorkFlowRouter.php?action=devolverRevisaoDono',
        returnUserReview: '/app/routers/workflow/WorkFlowRouter.php?action=devolverRevisaoUsuario',
        chat: '/app/routers/workflow/WorkFlowRouter.php?action=getChatReprovacao',
        addResponsible: '/app/routers/workflow/WorkFlowRouter.php?action=adicionarResponsavel',
        removeResponsible: '/app/routers/workflow/WorkFlowRouter.php?action=removerResponsavel'
    };

    const dom = {};
    const state = {
        workflow: null,
        timeline: [],
        users: [],
        permissions: {
            currentUserId: null,
            isOwner: false,
            isResponsible: false,
            isApproved: false,
            userRejected: false,
            userApproved: false,
            reviewStatus: {
                etapasEmRevisao: [],
                totalEtapasRevisao: 0
            }
        }
    };

    window.LuminaWorkflowPage = {
        getState: () => state
    };

    const badges = {
        priority: {
            ALTA: ['bg-danger', 'Alta', 'fas fa-arrow-up'],
            MEDIA: ['bg-warning', 'Media', 'fas fa-equals'],
            BAIXA: ['bg-success', 'Baixa', 'fas fa-arrow-down']
        },
        status: {
            EM_ANDAMENTO: ['bg-info', 'Em andamento', 'fas fa-clock'],
            APROVADO: ['bg-success', 'Aprovado', 'fas fa-check-circle'],
            REJEITADO: ['bg-danger', 'Rejeitado', 'fas fa-times-circle']
        },
        category: {
            REQUISITOS: ['bg-info', 'Requisitos'],
            NORMAS: ['bg-secondary', 'Normas'],
            PROCEDIMENTOS: ['bg-primary', 'Procedimentos']
        },
        actions: {
            CRIACAO: { icon: 'fas fa-sparkles', color: 'bg-info', title: 'Criacao' },
            EDICAO: { icon: 'fas fa-pen', color: 'bg-primary', title: 'Edicao' },
            APROVACAO: { icon: 'fas fa-check', color: 'bg-success', title: 'Aprovacao' },
            APROVACAO_FINAL: { icon: 'fas fa-seal-check', color: 'bg-success', title: 'Aprovacao final' },
            REPROVACAO: { icon: 'fas fa-ban', color: 'bg-danger', title: 'Reprovacao' }
        }
    };

    function init() {
        cacheDom();
        bindEvents();
        bootstrapPage();
    }

    function cacheDom() {
        dom.workflowTitle = document.getElementById('workflowTitulo');
        dom.workflowStatus = document.getElementById('workflowStatus');
        dom.workflowPriority = document.getElementById('workflowPrioridade');
        dom.workflowCategory = document.getElementById('workflowCategoria');
        dom.workflowDescription = document.getElementById('workflowDescricao');
        dom.workflowCreator = document.getElementById('workflowCriador');
        dom.workflowCreatedAt = document.getElementById('workflowDataCriacao');
        dom.deadline = document.getElementById('prazoFinal');
        dom.idDisplay = document.getElementById('workflowIdDisplay');
        dom.timeline = document.getElementById('timeline-items');
        dom.responsaveis = document.getElementById('responsaveisContainer');
        dom.anexos = document.getElementById('anexosContainer');
        dom.selectResponsavel = document.getElementById('selectResponsavel');
        dom.btnAddResponsible = document.getElementById('btnAdicionarResponsavel');
        dom.btnConfirmResponsible = document.getElementById('btnConfirmarResponsavel');
        dom.btnApprove = document.getElementById('btnAprovar');
        dom.btnReject = document.getElementById('btnRejeitar');
        dom.btnEdit = document.getElementById('btnEditar');
        dom.btnPdf = document.getElementById('btnGerarPDF');
        dom.formJustification = document.getElementById('formJustificativa');
        dom.formEdit = document.getElementById('formEditarWorkflow');
        dom.formReviewOwner = document.getElementById('formRevisaoDono');
        dom.formReviewUser = document.getElementById('formRevisaoUsuario');
        dom.btnAcceptOwnerRejection = document.getElementById('btn-aceitar-rejeicao-dono');
        dom.btnApproveUserRejection = document.getElementById('btn-aprovar-rejeicao-usuario');
        dom.btnSendOwnerReview = document.getElementById('btn-enviar-revisao-dono');
        dom.btnSendUserReview = document.getElementById('btn-enviar-revisao-usuario');
        dom.chatMessages = document.getElementById('chatMessagesContainer');
        dom.addResponsibleModal = document.getElementById('addResponsavelModal');
        dom.reviewOwnerModal = document.getElementById('revisaoDonoModal');
        dom.reviewUserModal = document.getElementById('revisaoUsuarioModal');
    }

    function bindEvents() {
        dom.btnApprove.addEventListener('click', () => openJustificationModal('aprovar'));
        dom.btnReject.addEventListener('click', () => openJustificationModal('rejeitar'));
        dom.btnEdit.addEventListener('click', openEditModal);
        dom.btnAddResponsible.addEventListener('click', openAddResponsibleModal);
        dom.btnConfirmResponsible.addEventListener('click', handleAddResponsible);

        dom.formJustification.addEventListener('submit', handleSubmitDecision);
        dom.formEdit.addEventListener('submit', handleEditWorkflow);
        dom.formReviewOwner.addEventListener('submit', (event) => event.preventDefault());
        dom.formReviewUser.addEventListener('submit', (event) => event.preventDefault());
        dom.btnAcceptOwnerRejection.addEventListener('click', handleOwnerRejectionAcceptance);
        dom.btnApproveUserRejection.addEventListener('click', handleUserRejectionApproval);
        dom.btnSendOwnerReview.addEventListener('click', () => handleReturnReview('owner'));
        dom.btnSendUserReview.addEventListener('click', () => handleReturnReview('user'));

        document.addEventListener('click', handleDelegatedClick);
    }

    async function bootstrapPage() {
        const loader = LuminaUI.loading('Carregando workflow...', 'Montando a visao completa do fluxo.');

        try {
            await refreshWorkflowStatus();
            await Promise.all([loadWorkflow(), loadPermissionSnapshot(), loadUsers()]);
            renderWorkflow();
            renderResponsiblePeople();
            renderAttachments();
            await loadTimeline();
            renderActions();
            loader.close();
        } catch (error) {
            loader.close();
            await LuminaUI.modalAlert({
                icon: 'error',
                title: 'Erro ao carregar workflow',
                text: error.message || 'Nao foi possivel carregar os dados do workflow.'
            });
            window.history.back();
        }
    }

    async function refreshWorkflowStatus() {
        try {
            await LuminaHttp.postJson(ROUTES.updateStatus, { workflowId });
        } catch (error) {
            console.debug('Falha ao atualizar status de workflow:', error.message);
        }
    }

    async function loadWorkflow() {
        const result = await LuminaHttp.get(ROUTES.workflow);
        if (result.status !== 'success' || !result.data) {
            throw new Error(result.message || 'Workflow nao encontrado');
        }

        state.workflow = result.data;
    }

    async function loadPermissionSnapshot() {
        const [userIdResult, ownerResult, approvedResult, responsibleResult, rejectedResult, approvedByUserResult, reviewResult] = await Promise.all([
            LuminaHttp.get(ROUTES.userId),
            LuminaHttp.get(ROUTES.owner),
            LuminaHttp.postJson(ROUTES.approved, { workflowId }),
            LuminaHttp.postJson(ROUTES.responsible, { workflowId }),
            LuminaHttp.postJson(ROUTES.userRejected, { workflowId }),
            LuminaHttp.postJson(ROUTES.userApproved, { workflowId }),
            LuminaHttp.postJson(ROUTES.reviewStatus, { workflowId })
        ]);

        state.permissions.currentUserId = Number(userIdResult.id || 0);
        state.permissions.isOwner = Boolean(ownerResult.data?.isOwner);
        state.permissions.isApproved = Boolean(approvedResult.data?.aprovado);
        state.permissions.isResponsible = Boolean(responsibleResult.data?.isResponsavel);
        state.permissions.userRejected = Boolean(rejectedResult.data?.temReprovacao);
        state.permissions.userApproved = Boolean(approvedByUserResult.data?.temAprovacao);
        state.permissions.reviewStatus = {
            etapasEmRevisao: reviewResult.data?.etapas_em_revisao || [],
            totalEtapasRevisao: reviewResult.data?.total_etapas_revisao || 0
        };
    }

    async function loadUsers() {
        const result = await LuminaHttp.get(ROUTES.users);
        state.users = result.data || [];
    }

    async function loadTimeline() {
        const result = await LuminaHttp.get(ROUTES.steps);
        if (!result.success) {
            throw new Error(result.message || 'Nao foi possivel carregar a timeline');
        }

        state.timeline = result.data || [];
        renderTimeline();
    }

    function renderWorkflow() {
        const workflow = state.workflow;
        dom.workflowTitle.textContent = workflow.titulo || 'Sem titulo';
        dom.idDisplay.textContent = `Workflow #${workflow.id}`;
        dom.workflowDescription.textContent = workflow.descricao || 'Sem descricao';
        dom.workflowDescription.classList.toggle('is-empty', !workflow.descricao);
        dom.workflowCreator.textContent = workflow.nome_criador || 'Usuario nao identificado';
        dom.workflowCreatedAt.textContent = LuminaUI.formatDateTime(workflow.data_criacao);
        dom.workflowPriority.innerHTML = buildPriorityBadge(workflow.prioridade);
        dom.workflowStatus.innerHTML = buildStatusBadge(workflow.status);
        dom.workflowCategory.innerHTML = buildCategoryBadge(workflow.categoria);
        renderDeadline(workflow.prazo_final);
        fillEditForm(workflow);
    }

    function renderDeadline(value) {
        if (!value) {
            dom.deadline.className = 'deadline-card deadline-card--neutral';
            dom.deadline.innerHTML = '<i class="fas fa-calendar-day me-2"></i>Prazo final nao definido';
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const date = new Date(value);
        date.setHours(0, 0, 0, 0);

        const modifier = date < today
            ? 'deadline-card--late'
            : date.getTime() === today.getTime()
                ? 'deadline-card--today'
                : 'deadline-card--ok';

        dom.deadline.className = `deadline-card ${modifier}`;
        dom.deadline.innerHTML = `<i class="fas fa-calendar-day me-2"></i>Prazo final: ${LuminaUI.formatDate(value)}`;
    }

    function renderResponsiblePeople() {
        const people = state.workflow.responsaveis || [];

        dom.btnAddResponsible.style.display = state.permissions.isOwner ? 'inline-flex' : 'none';

        if (!people.length) {
            dom.responsaveis.innerHTML = `
                <div class="col-12">
                    <div class="empty-state-card">
                        <i class="fas fa-users"></i>
                        <strong>Nenhum responsavel atribuido</strong>
                        <span>Adicione pessoas para distribuir a validacao do fluxo.</span>
                    </div>
                </div>
            `;
            return;
        }

        dom.responsaveis.innerHTML = people.map((person) => `
            <div class="col-12 mb-3">
                <article class="person-card">
                    <div class="person-card__identity">
                        <span class="person-card__avatar">
                            <i class="fas fa-user"></i>
                        </span>
                        <div>
                            <strong>${LuminaUI.escapeHtml(person.nome_usuario || 'Usuario')}</strong>
                            <span>@${LuminaUI.escapeHtml(person.usuario_login || 'sem-login')}</span>
                        </div>
                    </div>
                    ${state.permissions.isOwner ? `
                        <button
                            type="button"
                            class="btn btn-sm btn-outline-danger btn-remove-responsavel"
                            data-user-id="${person.usuario_id || person.id}"
                            data-user-name="${LuminaUI.escapeHtml(person.nome_usuario || 'Usuario')}">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </article>
            </div>
        `).join('');
    }

    function renderAttachments() {
        const attachments = state.workflow.anexos || [];

        if (!attachments.length) {
            dom.anexos.innerHTML = `
                <div class="col-12">
                    <div class="empty-state-card">
                        <i class="fas fa-paperclip"></i>
                        <strong>Nenhum anexo encontrado</strong>
                        <span>Arquivos relacionados ao workflow aparecerao aqui.</span>
                    </div>
                </div>
            `;
            return;
        }

        dom.anexos.innerHTML = attachments.map((attachment) => `
            <div class="col-xl-4 col-md-6 mb-3">
                <article class="attachment-card">
                    <span class="attachment-card__icon">
                        <i class="${getAttachmentIcon(attachment.tipo)}"></i>
                    </span>
                    <strong title="${LuminaUI.escapeHtml(attachment.nome_arquivo)}">${LuminaUI.escapeHtml(attachment.nome_arquivo)}</strong>
                    <span>${LuminaUI.formatBytes(Number(attachment.tamanho || 0))}</span>
                    <span>${LuminaUI.formatDateTime(attachment.data_upload)}</span>
                    <a class="btn btn-primary btn-sm" href="${attachment.caminho_arquivo}" target="_blank" download="${LuminaUI.escapeHtml(attachment.nome_arquivo)}">
                        <i class="fas fa-download"></i> Baixar
                    </a>
                </article>
            </div>
        `).join('');
    }

    function renderTimeline() {
        if (!state.timeline.length) {
            dom.timeline.innerHTML = `
                <div class="empty-state-card">
                    <i class="fas fa-stream"></i>
                    <strong>Nenhuma acao registrada</strong>
                    <span>O historico do workflow aparecera aqui conforme as etapas forem executadas.</span>
                </div>
            `;
            return;
        }

        dom.timeline.innerHTML = state.timeline.map((step) => {
            const action = badges.actions[step.tipo_acao] || { icon: 'fas fa-circle', color: 'bg-secondary', title: step.tipo_acao };
            const review = state.permissions.reviewStatus.etapasEmRevisao.find((item) => Number(item.etapa_id) === Number(step.id));
            const needsReview = step.tipo_acao === 'REPROVACAO' && review;
            const reviewButton = buildReviewButton(step, review);
            const chatButton = step.tipo_acao === 'REPROVACAO'
                ? `<button type="button" class="btn btn-sm btn-outline-secondary btn-chat" data-etapa-id="${step.id}"><i class="fas fa-comments"></i> Chat</button>`
                : '';
            const justificationButton = step.justificativa
                ? `<button type="button" class="btn btn-sm btn-outline-info btn-justificativa" data-etapa-id="${step.id}"><i class="fas fa-eye"></i> Ver justificativa</button>`
                : '';

            return `
                <article class="timeline-item">
                    <span class="timeline-dot ${action.color}">
                        <i class="${action.icon}"></i>
                    </span>
                    <div class="timeline-card">
                        <div class="timeline-card__head">
                            <div>
                                <h6>${action.title}</h6>
                                <p>${LuminaUI.escapeHtml(step.descricao || step.tipo_acao)}</p>
                            </div>
                            <small>${LuminaUI.formatDateTime(step.data_hora)}</small>
                        </div>
                        <div class="timeline-card__meta">
                            <span><i class="fas fa-user me-1"></i>${LuminaUI.escapeHtml(step.usuario_nome || 'Usuario nao identificado')}</span>
                        </div>
                        ${needsReview ? buildReviewAlert(review) : ''}
                        <div class="timeline-card__actions">
                            ${justificationButton}
                            ${chatButton}
                            ${reviewButton}
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    function renderActions() {
        const { workflow } = state;
        const { permissions } = state;
        const hasPendingOwnerReview = permissions.reviewStatus.etapasEmRevisao.some((item) => item.revisao_dono);

        dom.btnApprove.style.display = 'none';
        dom.btnReject.style.display = 'none';
        dom.btnEdit.style.display = 'none';

        if (permissions.isOwner) {
            dom.btnEdit.style.display = workflow.status !== 'APROVADO' && workflow.status !== 'REJEITADO' ? 'inline-flex' : 'none';
            return;
        }

        const canAct = permissions.isResponsible &&
            !permissions.isApproved &&
            !permissions.userApproved &&
            !permissions.userRejected &&
            !hasPendingOwnerReview &&
            workflow.status !== 'REJEITADO';

        if (canAct) {
            dom.btnApprove.style.display = 'inline-flex';
            dom.btnReject.style.display = 'inline-flex';
        }
    }

    function fillEditForm(workflow) {
        document.getElementById('editarTitulo').value = workflow.titulo || '';
        document.getElementById('editarDescricao').value = workflow.descricao || '';
        document.getElementById('editarPrioridade').value = normalize(workflow.prioridade || 'MEDIA');
        document.getElementById('editarCategoria').value = workflow.categoria || '';
    }

    function buildPriorityBadge(value) {
        const [className, label, icon] = badges.priority[normalize(value)] || ['bg-secondary', value || 'N/D', 'fas fa-circle'];
        return `<span class="badge ${className}"><i class="${icon} me-1"></i>${LuminaUI.escapeHtml(label)}</span>`;
    }

    function buildStatusBadge(value) {
        const [className, label, icon] = badges.status[value] || ['bg-secondary', value || 'N/D', 'fas fa-circle'];
        return `<span class="badge ${className}"><i class="${icon} me-1"></i>${LuminaUI.escapeHtml(label)}</span>`;
    }

    function buildCategoryBadge(value) {
        const [className, label] = badges.category[value] || ['bg-secondary', value || 'Nao definida'];
        return `<span class="badge ${className}">${LuminaUI.escapeHtml(label)}</span>`;
    }

    function buildReviewAlert(review) {
        const ownerReview = Boolean(review?.revisao_dono);
        const label = ownerReview
            ? 'O dono do workflow precisa revisar esta reprovacao.'
            : 'O usuario que reprovou precisa revisar esta acao.';

        return `
            <div class="review-alert ${ownerReview ? 'review-alert--owner' : 'review-alert--user'}">
                <i class="fas ${ownerReview ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                <span>${label}</span>
            </div>
        `;
    }

    function buildReviewButton(step, review) {
        if (!review) {
            return '';
        }

        const isStepOwner = Number(step.usuario_id) === state.permissions.currentUserId;

        if (review.revisao_dono && state.permissions.isOwner) {
            return `<button type="button" class="btn btn-sm btn-outline-warning btn-review" data-revision-type="owner" data-etapa-id="${step.id}">
                <i class="fas fa-clipboard-check"></i> Revisar
            </button>`;
        }

        if (review.revisao_usuario && isStepOwner) {
            return `<button type="button" class="btn btn-sm btn-outline-info btn-review" data-revision-type="user" data-etapa-id="${step.id}">
                <i class="fas fa-clipboard-check"></i> Revisar
            </button>`;
        }

        return '';
    }

    function openJustificationModal(action) {
        const modalElement = document.getElementById('justificativaModal');
        const title = document.getElementById('justificativaModalLabel');
        const header = document.getElementById('justificativaModalHeader');
        const textarea = document.getElementById('textoJustificativa');

        document.getElementById('acaoTipo').value = action;
        textarea.value = '';

        if (action === 'aprovar') {
            header.className = 'modal-header modal-header--success';
            title.innerHTML = '<i class="fas fa-check-circle me-2"></i>Justificativa de aprovacao';
        } else {
            header.className = 'modal-header modal-header--danger';
            title.innerHTML = '<i class="fas fa-times-circle me-2"></i>Justificativa de rejeicao';
        }

        bootstrap.Modal.getOrCreateInstance(modalElement).show();
    }

    function openEditModal() {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('editarWorkflowModal')).show();
    }

    function openAddResponsibleModal() {
        const modal = bootstrap.Modal.getOrCreateInstance(dom.addResponsibleModal);
        renderUserSelectOptions();
        modal.show();
    }

    function openReviewModal(type, etapaId) {
        const modalElement = type === 'owner' ? dom.reviewOwnerModal : dom.reviewUserModal;
        modalElement.dataset.etapaId = String(etapaId);
        const textareaId = type === 'owner' ? 'justificativaRevisaoDono' : 'justificativaRevisaoUsuario';
        document.getElementById(textareaId).value = '';
        bootstrap.Modal.getOrCreateInstance(modalElement).show();
    }

    function openTimelineJustification(step) {
        LuminaUI.modalAlert({
            icon: 'info',
            title: step.tipo_acao,
            html: `
                <div class="text-start">
                    <p><strong>Usuario:</strong> ${LuminaUI.escapeHtml(step.usuario_nome || 'Nao identificado')}</p>
                    <p><strong>Data:</strong> ${LuminaUI.formatDateTime(step.data_hora)}</p>
                    <hr>
                    <p>${LuminaUI.escapeHtml(step.justificativa || 'Sem justificativa')}</p>
                </div>
            `
        });
    }

    async function openChatModal(stepId) {
        dom.chatMessages.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2">Carregando mensagens...</p>
            </div>
        `;

        bootstrap.Modal.getOrCreateInstance(document.getElementById('chatReprovacaoModal')).show();

        try {
            const result = await LuminaHttp.get(`${ROUTES.chat}&etapaId=${stepId}`);
            renderChatMessages(result.data || []);
        } catch (error) {
            dom.chatMessages.innerHTML = `
                <div class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                    <p>${LuminaUI.escapeHtml(error.message)}</p>
                </div>
            `;
        }
    }

    function renderChatMessages(messages) {
        if (!messages.length) {
            dom.chatMessages.innerHTML = `
                <div class="empty-state-card empty-state-card--chat">
                    <i class="fas fa-comments"></i>
                    <strong>Nenhuma mensagem no chat</strong>
                    <span>As trocas sobre esta reprovacao apareceram aqui.</span>
                </div>
            `;
            return;
        }

        dom.chatMessages.innerHTML = messages.map((message) => {
            const isCurrentUser = Number(message.user) === state.permissions.currentUserId;
            return `
                <div class="chat-bubble ${isCurrentUser ? 'chat-bubble--mine' : 'chat-bubble--other'}">
                    <div class="chat-bubble__meta">
                        <strong>${LuminaUI.escapeHtml(message.usuario || 'Usuario')}</strong>
                        <small>${LuminaUI.formatDateTime(message.data_hora)}</small>
                    </div>
                    <p>${LuminaUI.escapeHtml(message.justificativa || '')}</p>
                </div>
            `;
        }).join('');

        dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    }

    async function handleSubmitDecision(event) {
        event.preventDefault();
        const action = document.getElementById('acaoTipo').value;
        const justification = document.getElementById('textoJustificativa').value.trim();

        if (!justification) {
            await LuminaUI.modalAlert({ icon: 'warning', title: 'Justificativa obrigatoria', text: 'Informe uma justificativa para continuar.' });
            return;
        }

        const endpoint = action === 'aprovar' ? ROUTES.approve : ROUTES.rejectByUser;
        const loader = LuminaUI.loading('Salvando decisao...', 'Registrando sua acao neste workflow.');

        try {
            await LuminaHttp.postJson(endpoint, { workflowId, justificativa: justification });
            loader.close();
            bootstrap.Modal.getInstance(document.getElementById('justificativaModal'))?.hide();
            await refreshPageData();
            LuminaUI.toast('success', 'Acao registrada', action === 'aprovar' ? 'Workflow aprovado.' : 'Rejeicao registrada.');
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({ icon: 'error', title: 'Erro', text: error.message });
        }
    }

    async function handleEditWorkflow(event) {
        event.preventDefault();

        const payload = {
            id: workflowId,
            titulo: document.getElementById('editarTitulo').value.trim(),
            descricao: document.getElementById('editarDescricao').value.trim(),
            prioridade: document.getElementById('editarPrioridade').value,
            categoria: document.getElementById('editarCategoria').value
        };

        const loader = LuminaUI.loading('Atualizando workflow...', 'Aplicando alteracoes.');

        try {
            await LuminaHttp.postJson(ROUTES.edit, payload);
            loader.close();
            bootstrap.Modal.getInstance(document.getElementById('editarWorkflowModal'))?.hide();
            await refreshPageData();
            LuminaUI.toast('success', 'Workflow atualizado', 'As informacoes foram atualizadas.');
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({ icon: 'error', title: 'Erro ao atualizar', text: error.message });
        }
    }

    async function handleOwnerRejectionAcceptance() {
        const justification = document.getElementById('justificativaRevisaoDono').value.trim();
        if (!justification) {
            await LuminaUI.modalAlert({ icon: 'warning', title: 'Justificativa obrigatoria', text: 'Informe a justificativa antes de continuar.' });
            return;
        }

        const loader = LuminaUI.loading('Rejeitando workflow...', 'Concluindo a revisao do dono.');

        try {
            await LuminaHttp.postJson(ROUTES.rejectByOwner, { workflowId, justificativa: justification });
            loader.close();
            bootstrap.Modal.getInstance(dom.reviewOwnerModal)?.hide();
            await refreshPageData();
            LuminaUI.toast('success', 'Workflow rejeitado', 'A revisao foi concluida.');
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({ icon: 'error', title: 'Erro', text: error.message });
        }
    }

    async function handleUserRejectionApproval() {
        const justification = document.getElementById('justificativaRevisaoUsuario').value.trim();
        if (!justification) {
            await LuminaUI.modalAlert({ icon: 'warning', title: 'Justificativa obrigatoria', text: 'Informe a justificativa antes de continuar.' });
            return;
        }

        const loader = LuminaUI.loading('Aprovando workflow...', 'Processando a aprovacao apos revisao.');

        try {
            await LuminaHttp.postJson(ROUTES.approve, { workflowId, justificativa: justification });
            loader.close();
            bootstrap.Modal.getInstance(dom.reviewUserModal)?.hide();
            await refreshPageData();
            LuminaUI.toast('success', 'Workflow aprovado', 'A revisao do usuario foi concluida.');
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({ icon: 'error', title: 'Erro', text: error.message });
        }
    }

    async function handleReturnReview(type) {
        const isOwnerFlow = type === 'owner';
        const modalElement = isOwnerFlow ? dom.reviewOwnerModal : dom.reviewUserModal;
        const textareaId = isOwnerFlow ? 'justificativaRevisaoDono' : 'justificativaRevisaoUsuario';
        const justification = document.getElementById(textareaId).value.trim();
        const etapaId = Number(modalElement.dataset.etapaId || 0);

        if (!justification || !etapaId) {
            await LuminaUI.modalAlert({ icon: 'warning', title: 'Dados incompletos', text: 'Preencha a justificativa para devolver a revisao.' });
            return;
        }

        const endpoint = isOwnerFlow ? ROUTES.returnOwnerReview : ROUTES.returnUserReview;
        const loader = LuminaUI.loading('Devolvendo revisao...', 'Atualizando o fluxo de analise.');

        try {
            await LuminaHttp.postJson(endpoint, { workflowId, etapaId, justificativa: justification });
            loader.close();
            bootstrap.Modal.getInstance(modalElement)?.hide();
            await refreshPageData();
            LuminaUI.toast('success', 'Revisao devolvida', 'A etapa foi enviada para nova avaliacao.');
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({ icon: 'error', title: 'Erro', text: error.message });
        }
    }

    async function handleAddResponsible() {
        const userId = Number(dom.selectResponsavel.value || 0);
        if (!userId) {
            await LuminaUI.modalAlert({ icon: 'warning', title: 'Selecione um usuario', text: 'Escolha um usuario para adicionar como responsavel.' });
            return;
        }

        const loader = LuminaUI.loading('Adicionando responsavel...', 'Registrando a nova atribuicao.');

        try {
            await LuminaHttp.postJson(ROUTES.addResponsible, { workflowId, userId });
            loader.close();
            bootstrap.Modal.getInstance(dom.addResponsibleModal)?.hide();
            await refreshPageData();
            LuminaUI.toast('success', 'Responsavel adicionado', 'A equipe do workflow foi atualizada.');
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({ icon: 'error', title: 'Erro', text: error.message });
        }
    }

    async function handleRemoveResponsible(userId, userName) {
        const choices = state.users.filter((user) => Number(user.ID) !== Number(userId));

        const selectHtml = `
            <div class="text-start">
                <p>Substitua <strong>${LuminaUI.escapeHtml(userName)}</strong> por outro responsavel.</p>
                <select id="novoResponsavelSelect" class="form-select">
                    <option value="">Selecione um novo responsavel</option>
                    ${choices.map((user) => `<option value="${user.ID}">${LuminaUI.escapeHtml(user.USUARIO)} - ${LuminaUI.escapeHtml(user.NOME)}</option>`).join('')}
                </select>
            </div>
        `;

        const result = await LuminaUI.confirm({
            icon: 'warning',
            title: 'Remover responsavel',
            html: selectHtml,
            showCancelButton: true,
            confirmButtonText: 'Substituir',
            cancelButtonText: 'Cancelar',
            didOpen: () => {
                $('#novoResponsavelSelect').select2({
                    placeholder: 'Selecione um novo responsavel',
                    width: '100%',
                    dropdownParent: $('.swal2-container')
                });
            },
            preConfirm: () => {
                const replacement = document.getElementById('novoResponsavelSelect').value;
                if (!replacement) {
                    Swal.showValidationMessage('Selecione um novo responsavel');
                    return false;
                }
                return replacement;
            }
        });

        if (!result.isConfirmed) {
            return;
        }

        const loader = LuminaUI.loading('Atualizando responsaveis...', 'Aplicando a substituicao.');

        try {
            await LuminaHttp.postJson(ROUTES.removeResponsible, {
                workflowId,
                userId,
                novoResponsavelId: Number(result.value)
            });
            loader.close();
            await refreshPageData();
            LuminaUI.toast('success', 'Responsavel substituido', 'A lista de responsaveis foi atualizada.');
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({ icon: 'error', title: 'Erro', text: error.message });
        }
    }

    function renderUserSelectOptions() {
        const existingResponsibleIds = new Set((state.workflow.responsaveis || []).map((person) => String(person.usuario_id || person.id)));
        const availableUsers = state.users.filter((user) => !existingResponsibleIds.has(String(user.ID)));

        dom.selectResponsavel.innerHTML = `
            <option value="">Selecione um usuario</option>
            ${availableUsers.map((user) => `<option value="${user.ID}">${LuminaUI.escapeHtml(user.USUARIO)} - ${LuminaUI.escapeHtml(user.NOME)}</option>`).join('')}
        `;

        if ($(dom.selectResponsavel).hasClass('select2-hidden-accessible')) {
            $(dom.selectResponsavel).select2('destroy');
        }

        $(dom.selectResponsavel).select2({
            placeholder: 'Selecione o responsavel',
            width: '100%',
            dropdownParent: $('#addResponsavelModal')
        });
    }

    async function refreshPageData() {
        await Promise.all([loadWorkflow(), loadPermissionSnapshot()]);
        renderWorkflow();
        renderResponsiblePeople();
        renderAttachments();
        await loadTimeline();
        renderActions();
    }

    function handleDelegatedClick(event) {
        const justificationButton = event.target.closest('.btn-justificativa');
        if (justificationButton) {
            const step = state.timeline.find((item) => Number(item.id) === Number(justificationButton.dataset.etapaId));
            if (step) {
                openTimelineJustification(step);
            }
            return;
        }

        const chatButton = event.target.closest('.btn-chat');
        if (chatButton) {
            openChatModal(Number(chatButton.dataset.etapaId));
            return;
        }

        const reviewButton = event.target.closest('.btn-review');
        if (reviewButton) {
            openReviewModal(reviewButton.dataset.revisionType, Number(reviewButton.dataset.etapaId));
            return;
        }

        const removeButton = event.target.closest('.btn-remove-responsavel');
        if (removeButton) {
            handleRemoveResponsible(Number(removeButton.dataset.userId), removeButton.dataset.userName);
        }
    }

    function getAttachmentIcon(type) {
        if (!type) return 'fas fa-file';
        if (type.includes('pdf')) return 'fas fa-file-pdf';
        if (type.includes('image')) return 'fas fa-file-image';
        if (type.includes('video')) return 'fas fa-file-video';
        if (type.includes('audio')) return 'fas fa-file-audio';
        if (type.includes('word')) return 'fas fa-file-word';
        if (type.includes('excel') || type.includes('spreadsheet')) return 'fas fa-file-excel';
        return 'fas fa-file';
    }

    function normalize(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
