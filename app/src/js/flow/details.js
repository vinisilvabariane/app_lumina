(() => {
    const flowId = Number(window.FLOW_ID || window.WORKFLOW_ID || 0);
    if (!flowId) {
        return;
    }

    const ROUTES = {
        refreshStatus: '/app/routers/flow/FlowRouter.php?action=refreshFlowStatus',
        flow: `/app/routers/flow/FlowRouter.php?action=loadFlowById&id=${flowId}`,
        owner: `/app/routers/flow/FlowRouter.php?action=validateFlowOwner&id=${flowId}`,
        steps: `/app/routers/flow/FlowRouter.php?action=getSteps&flowId=${flowId}`,
        currentUser: '/app/routers/flow/FlowRouter.php?action=getCurrentUserId',
        approved: '/app/routers/flow/FlowRouter.php?action=checkApprovedFlow',
        assignee: '/app/routers/flow/FlowRouter.php?action=validateAssignee',
        userRejection: '/app/routers/flow/FlowRouter.php?action=checkUserRejection',
        userApproval: '/app/routers/flow/FlowRouter.php?action=checkUserApproval',
        review: '/app/routers/flow/FlowRouter.php?action=checkFlowReview',
        users: '/app/routers/flow/FlowRouter.php?action=loadUsers',
        approve: '/app/routers/flow/FlowRouter.php?action=approveFlowByUser',
        rejectByUser: '/app/routers/flow/FlowRouter.php?action=rejectFlowByUser',
        rejectByOwner: '/app/routers/flow/FlowRouter.php?action=rejectFlow',
        update: '/app/routers/flow/FlowRouter.php?action=updateFlow',
        returnOwnerReview: '/app/routers/flow/FlowRouter.php?action=returnOwnerReview',
        returnUserReview: '/app/routers/flow/FlowRouter.php?action=returnUserReview',
        chat: '/app/routers/flow/FlowRouter.php?action=getRejectionChat',
        addAssignee: '/app/routers/flow/FlowRouter.php?action=addAssignee',
        removeAssignee: '/app/routers/flow/FlowRouter.php?action=removeAssignee'
    };

    const dom = {};
    const state = {
        flow: null,
        steps: [],
        users: [],
        permissions: {
            currentUserId: 0,
            isOwner: false,
            isAssignee: false,
            isApproved: false,
            hasUserRejection: false,
            hasUserApproval: false,
            reviewStatus: {
                review_steps: [],
                total_review_steps: 0
            }
        }
    };

    window.LuminaFlowPage = {
        getState: () => state
    };

    function init() {
        cacheDom();
        bindEvents();
        bootstrapPage();
    }

    function cacheDom() {
        dom.title = document.getElementById('workflowTitulo');
        dom.status = document.getElementById('workflowStatus');
        dom.priority = document.getElementById('workflowPrioridade');
        dom.category = document.getElementById('workflowCategoria');
        dom.description = document.getElementById('workflowDescricao');
        dom.creator = document.getElementById('workflowCriador');
        dom.createdAt = document.getElementById('workflowDataCriacao');
        dom.deadline = document.getElementById('prazoFinal');
        dom.idDisplay = document.getElementById('workflowIdDisplay');
        dom.assignees = document.getElementById('responsaveisContainer');
        dom.attachments = document.getElementById('anexosContainer');
        dom.timeline = document.getElementById('timeline-items');
        dom.selectAssignee = document.getElementById('selectResponsavel');
        dom.chatMessages = document.getElementById('chatMessagesContainer');
        dom.btnPdf = document.getElementById('btnGerarPDF');
        dom.btnApprove = document.getElementById('btnAprovar');
        dom.btnReject = document.getElementById('btnRejeitar');
        dom.btnEdit = document.getElementById('btnEditar');
        dom.btnAddAssignee = document.getElementById('btnAdicionarResponsavel');
        dom.btnConfirmAssignee = document.getElementById('btnConfirmarResponsavel');
        dom.formDecision = document.getElementById('formJustificativa');
        dom.formEdit = document.getElementById('editFlowForm');
        dom.btnAcceptOwnerRejection = document.getElementById('btn-aceitar-rejeicao-dono');
        dom.btnApproveUserReview = document.getElementById('btn-aprovar-rejeicao-usuario');
        dom.btnSendOwnerReview = document.getElementById('btn-enviar-revisao-dono');
        dom.btnSendUserReview = document.getElementById('btn-enviar-revisao-usuario');
        dom.ownerReviewModal = document.getElementById('revisaoDonoModal');
        dom.userReviewModal = document.getElementById('revisaoUsuarioModal');
        dom.assigneeModal = document.getElementById('addResponsavelModal');
    }

    function bindEvents() {
        dom.btnApprove.addEventListener('click', () => openDecisionModal('approve'));
        dom.btnReject.addEventListener('click', () => openDecisionModal('reject'));
        dom.btnEdit.addEventListener('click', openEditModal);
        dom.btnAddAssignee.addEventListener('click', openAssigneeModal);
        dom.btnConfirmAssignee.addEventListener('click', handleAddAssignee);
        dom.formDecision.addEventListener('submit', handleDecisionSubmit);
        dom.formEdit.addEventListener('submit', handleEditSubmit);
        dom.btnAcceptOwnerRejection.addEventListener('click', handleOwnerRejection);
        dom.btnApproveUserReview.addEventListener('click', handleUserReviewApproval);
        dom.btnSendOwnerReview.addEventListener('click', () => handleReturnReview('owner'));
        dom.btnSendUserReview.addEventListener('click', () => handleReturnReview('user'));
        document.addEventListener('click', handleDelegatedClick);
    }

    async function bootstrapPage() {
        const loader = LuminaUI.loading('Carregando flow...', 'Montando a visao detalhada do flow.');

        try {
            await refreshStatus();
            await Promise.all([loadUsers(), loadPermissionSnapshot(), loadFlow(), loadSteps()]);
            renderPage();
            loader.close();
        } catch (error) {
            loader.close();
            await LuminaUI.modalAlert({ icon: 'error', title: 'Erro ao carregar flow', text: error.message });
            window.history.back();
        }
    }

    async function refreshStatus() {
        try {
            await LuminaHttp.postJson(ROUTES.refreshStatus, { flowId });
        } catch (error) {
            console.debug('Status refresh failed:', error.message);
        }
    }

    async function loadUsers() {
        const result = await LuminaHttp.get(ROUTES.users);
        state.users = result.data || [];
    }

    async function loadPermissionSnapshot() {
        const [currentUser, owner, approved, assignee, rejection, approval, review] = await Promise.all([
            LuminaHttp.get(ROUTES.currentUser),
            LuminaHttp.get(ROUTES.owner),
            LuminaHttp.postJson(ROUTES.approved, { flowId }),
            LuminaHttp.postJson(ROUTES.assignee, { flowId }),
            LuminaHttp.postJson(ROUTES.userRejection, { flowId }),
            LuminaHttp.postJson(ROUTES.userApproval, { flowId }),
            LuminaHttp.postJson(ROUTES.review, { flowId })
        ]);

        state.permissions.currentUserId = Number(currentUser.id || 0);
        state.permissions.isOwner = Boolean(owner.data?.is_owner);
        state.permissions.isApproved = Boolean(approved.data?.is_approved);
        state.permissions.isAssignee = Boolean(assignee.data?.is_assignee);
        state.permissions.hasUserRejection = Boolean(rejection.data?.has_rejection);
        state.permissions.hasUserApproval = Boolean(approval.data?.has_approval);
        state.permissions.reviewStatus = review.data || { review_steps: [], total_review_steps: 0 };
    }

    async function loadFlow() {
        const result = await LuminaHttp.get(ROUTES.flow);
        state.flow = result.data;
    }

    async function loadSteps() {
        const result = await LuminaHttp.get(ROUTES.steps);
        if (!result.success) {
            throw new Error(result.message || 'Failed to load steps.');
        }

        state.steps = result.data || [];
    }

    function renderPage() {
        renderFlowSummary();
        renderAssignees();
        renderAttachments();
        renderTimeline();
        renderActions();
        renderAssigneeSelect();
        fillEditForm();
    }

    function renderFlowSummary() {
        const flow = state.flow;
        dom.title.textContent = flow.title || 'Sem titulo';
        dom.status.innerHTML = renderStatusBadge(flow.status);
        dom.priority.innerHTML = renderPriorityBadge(flow.priority);
        dom.category.innerHTML = renderCategoryBadge(flow.category);
        dom.description.textContent = flow.description || 'Sem descricao';
        dom.description.classList.toggle('is-empty', !flow.description);
        dom.creator.textContent = flow.creator_name || 'Usuario nao identificado';
        dom.createdAt.textContent = LuminaUI.formatDateTime(flow.created_at);
        dom.idDisplay.textContent = `Flow #${flow.id}`;
        renderDeadline(flow.deadline);
    }

    function renderDeadline(deadline) {
        if (!deadline) {
            dom.deadline.className = 'deadline-card deadline-card--neutral';
            dom.deadline.innerHTML = '<i class="fas fa-calendar-day me-2"></i>Prazo final nao definido';
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(deadline);
        target.setHours(0, 0, 0, 0);
        const modifier = target < today ? 'deadline-card--late' : target.getTime() === today.getTime() ? 'deadline-card--today' : 'deadline-card--ok';
        dom.deadline.className = `deadline-card ${modifier}`;
        dom.deadline.innerHTML = `<i class="fas fa-calendar-day me-2"></i>Prazo final: ${LuminaUI.formatDate(deadline)}`;
    }

    function renderAssignees() {
        const assignees = state.flow.assignees || [];
        dom.btnAddAssignee.style.display = state.permissions.isOwner ? 'inline-flex' : 'none';

        if (!assignees.length) {
            dom.assignees.innerHTML = `<div class="col-12"><div class="empty-state-card"><i class="fas fa-users"></i><strong>Nenhum assignee atribuido</strong><span>Adicione pessoas para distribuir a validacao do flow.</span></div></div>`;
            return;
        }

        dom.assignees.innerHTML = assignees.map((assignee) => `
            <div class="col-12 mb-3">
                <article class="person-card">
                    <div class="person-card__identity">
                        <span class="person-card__avatar"><i class="fas fa-user"></i></span>
                        <div>
                            <strong>${LuminaUI.escapeHtml(assignee.name || 'User')}</strong>
                            <span>@${LuminaUI.escapeHtml(assignee.username || 'no-login')}</span>
                        </div>
                    </div>
                    ${state.permissions.isOwner ? `<button type="button" class="btn btn-sm btn-outline-danger btn-remove-assignee" data-user-id="${assignee.user_id}" data-user-name="${LuminaUI.escapeHtml(assignee.name || 'User')}"><i class="fas fa-trash"></i></button>` : ''}
                </article>
            </div>
        `).join('');
    }

    function renderAttachments() {
        const attachments = state.flow.attachments || [];
        if (!attachments.length) {
            dom.attachments.innerHTML = `<div class="col-12"><div class="empty-state-card"><i class="fas fa-paperclip"></i><strong>Nenhum anexo encontrado</strong><span>Arquivos relacionados ao flow aparecerao aqui.</span></div></div>`;
            return;
        }

        dom.attachments.innerHTML = attachments.map((attachment) => `
            <div class="col-xl-4 col-md-6 mb-3">
                <article class="attachment-card">
                    <span class="attachment-card__icon"><i class="${getAttachmentIcon(attachment.mime_type)}"></i></span>
                    <strong>${LuminaUI.escapeHtml(attachment.file_name)}</strong>
                    <span>${LuminaUI.formatBytes(Number(attachment.size_bytes || 0))}</span>
                    <span>${LuminaUI.formatDateTime(attachment.uploaded_at)}</span>
                    <a class="btn btn-primary btn-sm" href="${attachment.file_path}" target="_blank" download="${LuminaUI.escapeHtml(attachment.file_name)}"><i class="fas fa-download"></i> Baixar</a>
                </article>
            </div>
        `).join('');
    }

    function renderTimeline() {
        if (!state.steps.length) {
            dom.timeline.innerHTML = `<div class="empty-state-card"><i class="fas fa-stream"></i><strong>Nenhuma acao registrada</strong><span>O historico do flow aparecera aqui conforme as etapas forem executadas.</span></div>`;
            return;
        }

        dom.timeline.innerHTML = state.steps.map((step) => {
            const badge = getActionBadge(step.action_type);
            const review = state.permissions.reviewStatus.review_steps.find((item) => Number(item.step_id) === Number(step.id));
            const showChat = step.action_type === 'REPROVACAO';
            const showJustification = Boolean(step.justification);
            const reviewButton = renderReviewButton(step, review);

            return `
                <article class="timeline-item">
                    <span class="timeline-dot ${badge.color}"><i class="${badge.icon}"></i></span>
                    <div class="timeline-card">
                        <div class="timeline-card__head">
                            <div>
                                <h6>${badge.title}</h6>
                                <p>${LuminaUI.escapeHtml(step.description || step.action_type)}</p>
                            </div>
                            <small>${LuminaUI.formatDateTime(step.created_at)}</small>
                        </div>
                        <div class="timeline-card__meta"><span><i class="fas fa-user me-1"></i>${LuminaUI.escapeHtml(step.user_name || 'User')}</span></div>
                        ${renderReviewAlert(review)}
                        <div class="timeline-card__actions">
                            ${showJustification ? `<button type="button" class="btn btn-sm btn-outline-info btn-step-justification" data-step-id="${step.id}"><i class="fas fa-eye"></i> Ver justificativa</button>` : ''}
                            ${showChat ? `<button type="button" class="btn btn-sm btn-outline-secondary btn-step-chat" data-step-id="${step.id}"><i class="fas fa-comments"></i> Chat</button>` : ''}
                            ${reviewButton}
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    function renderActions() {
        dom.btnApprove.style.display = 'none';
        dom.btnReject.style.display = 'none';
        dom.btnEdit.style.display = 'none';

        if (state.permissions.isOwner) {
            dom.btnEdit.style.display = state.flow.status === 'APROVADO' || state.flow.status === 'REJEITADO' ? 'none' : 'inline-flex';
            return;
        }

        const hasOwnerReviewPending = state.permissions.reviewStatus.review_steps.some((item) => item.owner_review);
        const canAct = state.permissions.isAssignee &&
            !state.permissions.isApproved &&
            !state.permissions.hasUserApproval &&
            !state.permissions.hasUserRejection &&
            !hasOwnerReviewPending &&
            state.flow.status !== 'REJEITADO';

        if (canAct) {
            dom.btnApprove.style.display = 'inline-flex';
            dom.btnReject.style.display = 'inline-flex';
        }
    }

    function renderAssigneeSelect() {
        const assignedUserIds = new Set((state.flow.assignees || []).map((assignee) => String(assignee.user_id)));
        const availableUsers = state.users.filter((user) => !assignedUserIds.has(String(getUserId(user))));

        dom.selectAssignee.innerHTML = `
            <option value="">Selecione um usuario</option>
            ${availableUsers.map((user) => `<option value="${getUserId(user)}">${LuminaUI.escapeHtml(user.username)} - ${LuminaUI.escapeHtml(user.name)}</option>`).join('')}
        `;

        if ($(dom.selectAssignee).hasClass('select2-hidden-accessible')) {
            $(dom.selectAssignee).select2('destroy');
        }

        $(dom.selectAssignee).select2({
            placeholder: 'Selecione o assignee',
            width: '100%',
            dropdownParent: $('#addResponsavelModal')
        });
    }

    function fillEditForm() {
        document.getElementById('editarTitulo').value = state.flow.title || '';
        document.getElementById('editarDescricao').value = state.flow.description || '';
        document.getElementById('editarPrioridade').value = normalizePriority(state.flow.priority);
        document.getElementById('editarCategoria').value = state.flow.category || '';
    }

    function openDecisionModal(type) {
        const modal = document.getElementById('justificativaModal');
        const header = document.getElementById('justificativaModalHeader');
        const title = document.getElementById('justificativaModalLabel');
        document.getElementById('acaoTipo').value = type;
        document.getElementById('textoJustificativa').value = '';

        if (type === 'approve') {
            header.className = 'modal-header modal-header--success';
            title.innerHTML = '<i class="fas fa-check-circle me-2"></i>Justificativa de aprovacao';
        } else {
            header.className = 'modal-header modal-header--danger';
            title.innerHTML = '<i class="fas fa-times-circle me-2"></i>Justificativa de rejeicao';
        }

        bootstrap.Modal.getOrCreateInstance(modal).show();
    }

    function openEditModal() {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('editFlowModal')).show();
    }

    function openAssigneeModal() {
        renderAssigneeSelect();
        bootstrap.Modal.getOrCreateInstance(dom.assigneeModal).show();
    }

    function openReviewModal(type, stepId) {
        const modal = type === 'owner' ? dom.ownerReviewModal : dom.userReviewModal;
        modal.dataset.stepId = String(stepId);
        document.getElementById(type === 'owner' ? 'justificativaRevisaoDono' : 'justificativaRevisaoUsuario').value = '';
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }

    async function openChatModal(stepId) {
        dom.chatMessages.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Carregando mensagens...</p></div>';
        bootstrap.Modal.getOrCreateInstance(document.getElementById('chatReprovacaoModal')).show();

        try {
            const result = await LuminaHttp.get(`${ROUTES.chat}&stepId=${stepId}`);
            renderChatMessages(result.data || []);
        } catch (error) {
            dom.chatMessages.innerHTML = `<div class="text-center text-danger py-4"><i class="fas fa-exclamation-triangle fa-2x mb-2"></i><p>${LuminaUI.escapeHtml(error.message)}</p></div>`;
        }
    }

    function renderChatMessages(messages) {
        if (!messages.length) {
            dom.chatMessages.innerHTML = '<div class="empty-state-card empty-state-card--chat"><i class="fas fa-comments"></i><strong>Nenhuma mensagem no chat</strong><span>As mensagens desta reprovacao aparecerao aqui.</span></div>';
            return;
        }

        dom.chatMessages.innerHTML = messages.map((message) => {
            const isMine = Number(message.user_id) === state.permissions.currentUserId;
            return `
                <div class="chat-bubble ${isMine ? 'chat-bubble--mine' : 'chat-bubble--other'}">
                    <div class="chat-bubble__meta">
                        <strong>${LuminaUI.escapeHtml(message.username || 'User')}</strong>
                        <small>${LuminaUI.formatDateTime(message.created_at)}</small>
                    </div>
                    <p>${LuminaUI.escapeHtml(message.justification || '')}</p>
                </div>
            `;
        }).join('');
    }

    async function handleDecisionSubmit(event) {
        event.preventDefault();
        const type = document.getElementById('acaoTipo').value;
        const justification = document.getElementById('textoJustificativa').value.trim();
        if (!justification) {
            await LuminaUI.modalAlert({ icon: 'warning', title: 'Justificativa obrigatoria', text: 'Informe a justificativa para continuar.' });
            return;
        }

        const route = type === 'approve' ? ROUTES.approve : ROUTES.rejectByUser;
        const loader = LuminaUI.loading('Salvando decisao...', 'Registrando sua acao no flow.');

        try {
            await LuminaHttp.postJson(route, { flowId, justification });
            loader.close();
            bootstrap.Modal.getInstance(document.getElementById('justificativaModal'))?.hide();
            await refreshPage();
            LuminaUI.toast('success', 'Acao registrada', type === 'approve' ? 'Flow aprovado.' : 'Rejeicao registrada.');
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({ icon: 'error', title: 'Erro', text: error.message });
        }
    }

    async function handleEditSubmit(event) {
        event.preventDefault();
        const payload = {
            id: flowId,
            title: document.getElementById('editarTitulo').value.trim(),
            description: document.getElementById('editarDescricao').value.trim(),
            priority: document.getElementById('editarPrioridade').value,
            category: document.getElementById('editarCategoria').value
        };

        const loader = LuminaUI.loading('Atualizando flow...', 'Aplicando alteracoes.');
        try {
            await LuminaHttp.postJson(ROUTES.update, payload);
            loader.close();
            bootstrap.Modal.getInstance(document.getElementById('editFlowModal'))?.hide();
            await refreshPage();
            LuminaUI.toast('success', 'Flow atualizado', 'As informacoes foram atualizadas.');
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({ icon: 'error', title: 'Erro ao atualizar', text: error.message });
        }
    }

    async function handleOwnerRejection() {
        const justification = document.getElementById('justificativaRevisaoDono').value.trim();
        if (!justification) {
            await LuminaUI.modalAlert({ icon: 'warning', title: 'Justificativa obrigatoria', text: 'Informe a justificativa para continuar.' });
            return;
        }

        const loader = LuminaUI.loading('Rejeitando flow...', 'Concluindo a revisao do owner.');
        try {
            await LuminaHttp.postJson(ROUTES.rejectByOwner, { flowId, justification });
            loader.close();
            bootstrap.Modal.getInstance(dom.ownerReviewModal)?.hide();
            await refreshPage();
            LuminaUI.toast('success', 'Flow rejeitado', 'A revisao foi concluida.');
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({ icon: 'error', title: 'Erro', text: error.message });
        }
    }

    async function handleUserReviewApproval() {
        const justification = document.getElementById('justificativaRevisaoUsuario').value.trim();
        if (!justification) {
            await LuminaUI.modalAlert({ icon: 'warning', title: 'Justificativa obrigatoria', text: 'Informe a justificativa para continuar.' });
            return;
        }

        const loader = LuminaUI.loading('Aprovando flow...', 'Processando a aprovacao apos revisao.');
        try {
            await LuminaHttp.postJson(ROUTES.approve, { flowId, justification });
            loader.close();
            bootstrap.Modal.getInstance(dom.userReviewModal)?.hide();
            await refreshPage();
            LuminaUI.toast('success', 'Flow aprovado', 'A revisao do usuario foi concluida.');
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({ icon: 'error', title: 'Erro', text: error.message });
        }
    }

    async function handleReturnReview(type) {
        const modal = type === 'owner' ? dom.ownerReviewModal : dom.userReviewModal;
        const stepId = Number(modal.dataset.stepId || 0);
        const fieldId = type === 'owner' ? 'justificativaRevisaoDono' : 'justificativaRevisaoUsuario';
        const justification = document.getElementById(fieldId).value.trim();

        if (!stepId || !justification) {
            await LuminaUI.modalAlert({ icon: 'warning', title: 'Dados incompletos', text: 'Informe a justificativa para devolver a revisao.' });
            return;
        }

        const route = type === 'owner' ? ROUTES.returnOwnerReview : ROUTES.returnUserReview;
        const loader = LuminaUI.loading('Devolvendo revisao...', 'Atualizando o fluxo de analise.');

        try {
            await LuminaHttp.postJson(route, { flowId, stepId, justification });
            loader.close();
            bootstrap.Modal.getInstance(modal)?.hide();
            await refreshPage();
            LuminaUI.toast('success', 'Revisao devolvida', 'A etapa foi enviada para nova avaliacao.');
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({ icon: 'error', title: 'Erro', text: error.message });
        }
    }

    async function handleAddAssignee() {
        const userId = Number(dom.selectAssignee.value || 0);
        if (!userId) {
            await LuminaUI.modalAlert({ icon: 'warning', title: 'Selecione um usuario', text: 'Escolha um usuario para adicionar como assignee.' });
            return;
        }

        const loader = LuminaUI.loading('Adicionando assignee...', 'Registrando a nova atribuicao.');
        try {
            await LuminaHttp.postJson(ROUTES.addAssignee, { flowId, userId });
            loader.close();
            bootstrap.Modal.getInstance(dom.assigneeModal)?.hide();
            await refreshPage();
            LuminaUI.toast('success', 'Assignee adicionado', 'A equipe do flow foi atualizada.');
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({ icon: 'error', title: 'Erro', text: error.message });
        }
    }

    async function handleRemoveAssignee(userId, userName) {
        const assignedUserIds = new Set((state.flow.assignees || []).map((assignee) => String(assignee.user_id)));
        const availableUsers = state.users.filter((user) => !assignedUserIds.has(String(getUserId(user))) || String(getUserId(user)) === String(userId));

        const result = await LuminaUI.confirm({
            icon: 'warning',
            title: 'Remover assignee',
            html: `
                <div class="text-start">
                    <p>Substitua <strong>${LuminaUI.escapeHtml(userName)}</strong> por outro assignee.</p>
                    <select id="replacementAssigneeSelect" class="form-select">
                        <option value="">Selecione um novo assignee</option>
                        ${availableUsers.filter((user) => String(getUserId(user)) !== String(userId)).map((user) => `<option value="${getUserId(user)}">${LuminaUI.escapeHtml(user.username)} - ${LuminaUI.escapeHtml(user.name)}</option>`).join('')}
                    </select>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Substituir',
            cancelButtonText: 'Cancelar',
            didOpen: () => {
                $('#replacementAssigneeSelect').select2({ width: '100%', dropdownParent: $('.swal2-container') });
            },
            preConfirm: () => {
                const replacementUserId = document.getElementById('replacementAssigneeSelect').value;
                if (!replacementUserId) {
                    Swal.showValidationMessage('Selecione um novo assignee');
                    return false;
                }
                return replacementUserId;
            }
        });

        if (!result.isConfirmed) {
            return;
        }

        const loader = LuminaUI.loading('Atualizando assignees...', 'Aplicando a substituicao.');
        try {
            await LuminaHttp.postJson(ROUTES.removeAssignee, {
                flowId,
                userId,
                replacementUserId: Number(result.value)
            });
            loader.close();
            await refreshPage();
            LuminaUI.toast('success', 'Assignee substituido', 'A lista de assignees foi atualizada.');
        } catch (error) {
            loader.close();
            LuminaUI.modalAlert({ icon: 'error', title: 'Erro', text: error.message });
        }
    }

    async function refreshPage() {
        const loader = LuminaUI.loading('Atualizando flow...', 'Sincronizando dados mais recentes.');
        try {
            await Promise.all([loadPermissionSnapshot(), loadFlow(), loadSteps()]);
            renderPage();
            loader.close();
        } catch (error) {
            loader.close();
            throw error;
        }
    }

    function handleDelegatedClick(event) {
        const justificationButton = event.target.closest('.btn-step-justification');
        if (justificationButton) {
            const step = state.steps.find((item) => Number(item.id) === Number(justificationButton.dataset.stepId));
            if (step) {
                openStepJustification(step);
            }
            return;
        }

        const chatButton = event.target.closest('.btn-step-chat');
        if (chatButton) {
            openChatModal(Number(chatButton.dataset.stepId));
            return;
        }

        const reviewButton = event.target.closest('.btn-step-review');
        if (reviewButton) {
            openReviewModal(reviewButton.dataset.reviewType, Number(reviewButton.dataset.stepId));
            return;
        }

        const removeButton = event.target.closest('.btn-remove-assignee');
        if (removeButton) {
            handleRemoveAssignee(Number(removeButton.dataset.userId), removeButton.dataset.userName);
        }
    }

    function openStepJustification(step) {
        LuminaUI.modalAlert({
            icon: 'info',
            title: step.action_type,
            html: `
                <div class="text-start">
                    <p><strong>Usuario:</strong> ${LuminaUI.escapeHtml(step.user_name || 'User')}</p>
                    <p><strong>Data:</strong> ${LuminaUI.formatDateTime(step.created_at)}</p>
                    <hr>
                    <p>${LuminaUI.escapeHtml(step.justification || 'Sem justificativa')}</p>
                </div>
            `
        });
    }

    function renderReviewButton(step, review) {
        if (!review) {
            return '';
        }

        if (review.owner_review && state.permissions.isOwner) {
            return `<button type="button" class="btn btn-sm btn-outline-warning btn-step-review" data-review-type="owner" data-step-id="${step.id}"><i class="fas fa-clipboard-check"></i> Revisar</button>`;
        }

        if (review.user_review && Number(step.user_id) === state.permissions.currentUserId) {
            return `<button type="button" class="btn btn-sm btn-outline-info btn-step-review" data-review-type="user" data-step-id="${step.id}"><i class="fas fa-clipboard-check"></i> Revisar</button>`;
        }

        return '';
    }

    function renderReviewAlert(review) {
        if (!review) {
            return '';
        }

        if (review.owner_review) {
            return '<div class="review-alert review-alert--owner"><i class="fas fa-exclamation-triangle"></i><span>O owner do flow precisa revisar esta reprovacao.</span></div>';
        }

        if (review.user_review) {
            return '<div class="review-alert review-alert--user"><i class="fas fa-info-circle"></i><span>O usuario que reprovou precisa revisar esta acao.</span></div>';
        }

        return '';
    }

    function getActionBadge(actionType) {
        const map = {
            CRIACAO: { icon: 'fas fa-sparkles', color: 'bg-info', title: 'Criacao' },
            EDICAO: { icon: 'fas fa-pen', color: 'bg-primary', title: 'Edicao' },
            APROVACAO: { icon: 'fas fa-check', color: 'bg-success', title: 'Aprovacao' },
            APROVACAO_FINAL: { icon: 'fas fa-seal-check', color: 'bg-success', title: 'Aprovacao final' },
            REPROVACAO: { icon: 'fas fa-ban', color: 'bg-danger', title: 'Reprovacao' }
        };
        return map[actionType] || { icon: 'fas fa-circle', color: 'bg-secondary', title: actionType };
    }

    function renderPriorityBadge(priority) {
        const map = {
            ALTA: ['bg-danger', 'Alta', 'fas fa-arrow-up'],
            MEDIA: ['bg-warning', 'Media', 'fas fa-equals'],
            BAIXA: ['bg-success', 'Baixa', 'fas fa-arrow-down']
        };
        const [className, label, icon] = map[normalizePriority(priority)] || ['bg-secondary', priority || 'N/D', 'fas fa-circle'];
        return `<span class="badge ${className}"><i class="${icon} me-1"></i>${LuminaUI.escapeHtml(label)}</span>`;
    }

    function renderStatusBadge(status) {
        const map = {
            EM_ANDAMENTO: ['bg-info', 'Em andamento', 'fas fa-clock'],
            APROVADO: ['bg-success', 'Aprovado', 'fas fa-check-circle'],
            REJEITADO: ['bg-danger', 'Rejeitado', 'fas fa-times-circle']
        };
        const [className, label, icon] = map[status] || ['bg-secondary', status || 'N/D', 'fas fa-circle'];
        return `<span class="badge ${className}"><i class="${icon} me-1"></i>${LuminaUI.escapeHtml(label)}</span>`;
    }

    function renderCategoryBadge(category) {
        const map = {
            REQUISITOS: ['bg-info', 'Requisitos'],
            NORMAS: ['bg-secondary', 'Normas'],
            PROCEDIMENTOS: ['bg-primary', 'Procedimentos']
        };
        const [className, label] = map[category] || ['bg-secondary', category || 'Nao definida'];
        return `<span class="badge ${className}">${LuminaUI.escapeHtml(label)}</span>`;
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

    function normalizePriority(priority) {
        return String(priority || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    }

    function getUserId(user) {
        return user?.id ?? user?.ID ?? 0;
    }

    document.addEventListener('DOMContentLoaded', init);
})();
