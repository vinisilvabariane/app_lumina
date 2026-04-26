<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/configs/Authenticator.php';
$workflowId = isset($_GET['id']) ? intval($_GET['id']) : 0;
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Lumina | Detalhes do Workflow</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdn.datatables.net/buttons/1.5.1/css/buttons.dataTables.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
</head>

<body>
    <div class="page-glow page-glow--left"></div>
    <div class="page-glow page-glow--right"></div>

    <nav class="topbar">
        <div class="container-fluid topbar-inner">
            <a class="brand-mark" href="/app/views/workflow/geral/index.php">
                <img src="/app/src/img/lumina-logo.png" alt="Lumina">
                <div>
                    <span>Lumina</span>
                    <small>Detalhes do workflow</small>
                </div>
            </a>

            <div class="topbar-actions">
                <a class="topbar-link" href="/app/views/workflow/geral/index.php">Homepage</a>
                <button class="btn btn-light btn-back" onclick="window.history.back()">
                    <i class="fas fa-arrow-left"></i>
                    Voltar
                </button>
                <a class="btn btn-logout" href="/app/routers/login/LoginRouter.php?action=logout">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Sair</span>
                </a>
            </div>
        </div>
    </nav>

    <div id="main-wrapper">
        <main class="page-wrapper">
            <section class="detail-hero">
                <div>
                    <span class="eyebrow">Workflow</span>
                    <h1>Detalhes e acompanhamento do fluxo</h1>
                    <p>Uma visao consolidada para acompanhar status, participantes, historico de acoes, anexos e operacoes disponiveis.</p>
                </div>
                <div class="detail-hero__meta">
                    <span class="detail-hero__meta-label">Registro</span>
                    <strong id="workflowIdDisplay">Workflow #<?php echo $workflowId; ?></strong>
                </div>
            </section>

            <section class="workflow-overview">
                <div class="overview-main">
                    <div class="overview-card">
                        <div class="overview-card__head">
                            <div>
                                <span class="section-kicker">Resumo</span>
                                <h2 id="workflowTitulo">Carregando...</h2>
                            </div>
                            <div class="overview-badges">
                                <span id="workflowStatus" class="badge-slot">Carregando...</span>
                                <span id="workflowPrioridade" class="badge-slot">Carregando...</span>
                                <span id="workflowCategoria" class="badge-slot">Carregando...</span>
                            </div>
                        </div>

                        <div id="prazoFinal" class="deadline-card">
                            <i class="fas fa-calendar-day me-2"></i>Carregando prazo...
                        </div>

                        <div class="content-grid">
                            <article class="content-card">
                                <h3>Descricao</h3>
                                <div id="workflowDescricao">
                                    <div class="d-flex justify-content-center py-3">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Carregando descricao...</span>
                                        </div>
                                    </div>
                                </div>
                            </article>

                            <aside class="content-card content-card--aside">
                                <h3>Detalhes</h3>
                                <dl class="meta-list">
                                    <div>
                                        <dt>Criado por</dt>
                                        <dd id="workflowCriador">Carregando...</dd>
                                    </div>
                                    <div>
                                        <dt>Data de criacao</dt>
                                        <dd id="workflowDataCriacao">Carregando...</dd>
                                    </div>
                                </dl>
                            </aside>
                        </div>
                    </div>
                </div>

                <aside class="overview-actions">
                    <div class="action-card">
                        <span class="section-kicker">Acoes</span>
                        <h3>Operacoes do workflow</h3>
                        <p>Comandos contextuais liberados conforme status e permissoes.</p>
                        <div class="action-stack">
                            <button id="btnGerarPDF" class="btn btn-primary">
                                <i class="fas fa-file-pdf"></i>Gerar PDF
                            </button>
                            <button id="btnAprovar" class="btn btn-success" style="display: none;">
                                <i class="fas fa-check-circle"></i>Aprovar
                            </button>
                            <button id="btnRejeitar" class="btn btn-danger" style="display: none;">
                                <i class="fas fa-times-circle"></i>Rejeitar
                            </button>
                            <button id="btnEditar" class="btn btn-dark" style="display: none;">
                                <i class="fas fa-edit"></i>Editar
                            </button>
                        </div>
                    </div>
                </aside>
            </section>

            <section class="secondary-grid">
                <article class="panel-card">
                    <div class="panel-card__head">
                        <div>
                            <span class="section-kicker">Equipe</span>
                            <h3>Responsaveis</h3>
                        </div>
                        <button id="btnAdicionarResponsavel" class="btn btn-outline-primary btn-sm" style="display: none;">
                            <i class="fas fa-user-plus me-1"></i>Adicionar
                        </button>
                    </div>
                    <div class="panel-card__body">
                        <div class="row" id="responsaveisContainer">
                            <div class="col-12 text-center py-4">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Carregando...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>

                <article class="panel-card">
                    <div class="panel-card__head">
                        <div>
                            <span class="section-kicker">Timeline</span>
                            <h3>Historico de acoes</h3>
                        </div>
                    </div>
                    <div class="panel-card__body">
                        <div id="timeline-container">
                            <div id="timeline-items">
                                <div class="text-center py-4">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Carregando...</span>
                                    </div>
                                    <p class="mt-2 text-muted">Carregando historico...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>
            </section>

            <section class="panel-card">
                <div class="panel-card__head">
                    <div>
                        <span class="section-kicker">Arquivos</span>
                        <h3>Anexos</h3>
                    </div>
                </div>
                <div class="panel-card__body">
                    <div id="anexosContainer" class="row">
                        <div class="col-12 text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Carregando...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>

        <div class="modal fade" id="addResponsavelModal" tabindex="-1" aria-labelledby="addResponsavelModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <div>
                            <span class="eyebrow">Equipe</span>
                            <h5 class="modal-title" id="addResponsavelModalLabel">Adicionar responsavel</h5>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="selectResponsavel" class="form-label">Selecione o usuario</label>
                            <select class="form-select" id="selectResponsavel">
                                <option value="" selected disabled>Selecione um usuario</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" id="btnConfirmarResponsavel" class="btn btn-primary">Adicionar</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="editarWorkflowModal" tabindex="-1" aria-labelledby="editarWorkflowModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <div>
                            <span class="eyebrow">Edicao</span>
                            <h5 class="modal-title" id="editarWorkflowModalLabel">Editar workflow</h5>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="formEditarWorkflow">
                        <div class="modal-body">
                            <div class="row g-3">
                                <div class="col-12">
                                    <label for="editarTitulo" class="form-label">Titulo</label>
                                    <input type="text" class="form-control" id="editarTitulo" placeholder="Titulo" required maxlength="100" />
                                </div>
                                <div class="col-12">
                                    <label for="editarDescricao" class="form-label">Descricao</label>
                                    <textarea class="form-control" id="editarDescricao" placeholder="Descricao" style="height: 120px" maxlength="500"></textarea>
                                </div>
                                <div class="col-md-6">
                                    <label for="editarPrioridade" class="form-label">Prioridade</label>
                                    <select class="form-select" id="editarPrioridade" required>
                                        <option value="ALTA">Alta</option>
                                        <option value="MEDIA">Media</option>
                                        <option value="BAIXA">Baixa</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label for="editarCategoria" class="form-label">Categoria</label>
                                    <select class="form-select" id="editarCategoria">
                                        <option value="PROJETO">Projeto</option>
                                        <option value="MANUTENCAO">Manutencao</option>
                                        <option value="MELHORIA">Melhoria</option>
                                        <option value="CORRECAO">Correcao</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Salvar alteracoes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <div class="modal fade" id="chatReprovacaoModal" tabindex="-1" aria-labelledby="chatReprovacaoModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="chatReprovacaoModalLabel">
                            <i class="fas fa-comments me-2"></i>Historico de comunicacao
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div id="chatMessagesContainer" style="max-height: 500px; overflow-y: auto; padding: 1.5rem;"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="revisaoDonoModal" tabindex="-1" aria-labelledby="revisaoDonoModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="revisaoDonoModalLabel">
                            <i class="fas fa-exclamation-triangle me-2"></i>Revisao pendente
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="formRevisaoDono">
                        <div class="modal-body">
                            <input type="hidden" id="tipoRevisao" value="dono">
                            <p class="mb-3">Voce precisa revisar esta rejeicao antes que o workflow possa prosseguir.</p>
                            <div class="form-floating">
                                <textarea class="form-control" id="justificativaRevisaoDono" placeholder="Digite sua justificativa" style="height: 100px" required></textarea>
                                <label for="justificativaRevisaoDono">Justificativa</label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" id="btn-enviar-revisao-dono" class="btn btn-primary">Devolver rejeicao</button>
                            <button type="submit" id="btn-aceitar-rejeicao-dono" class="btn btn-danger">Aceitar rejeicao</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <div class="modal fade" id="revisaoUsuarioModal" tabindex="-1" aria-labelledby="revisaoUsuarioModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="revisaoUsuarioModalLabel">
                            <i class="fas fa-info-circle me-2"></i>Revisar minha acao
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="formRevisaoUsuario">
                        <div class="modal-body">
                            <input type="hidden" id="tipoRevisaoUsuario" value="usuario">
                            <p class="mb-3">Voce precisa revisar sua acao de rejeicao anterior.</p>
                            <div class="form-floating">
                                <textarea class="form-control" id="justificativaRevisaoUsuario" placeholder="Digite sua justificativa" style="height: 100px" required></textarea>
                                <label for="justificativaRevisaoUsuario">Justificativa</label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" id="btn-enviar-revisao-usuario" class="btn btn-primary">Devolver rejeicao</button>
                            <button type="button" id="btn-aprovar-rejeicao-usuario" class="btn btn-success">Aprovar workflow</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <div class="modal fade" id="justificativaModal" tabindex="-1" aria-labelledby="justificativaModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header" id="justificativaModalHeader">
                        <h5 class="modal-title" id="justificativaModalLabel">
                            <i class="fas fa-comment me-2"></i>Justificativa
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="formJustificativa">
                        <div class="modal-body">
                            <input type="hidden" id="acaoTipo">
                            <div class="form-floating mb-3">
                                <textarea class="form-control" id="textoJustificativa" placeholder="Digite sua justificativa" style="height: 120px" required></textarea>
                                <label for="textoJustificativa">Justificativa</label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Confirmar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/js-cookie@3.0.5/dist/js-cookie.min.js"></script>
        <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery-validate/1.19.5/localization/messages_pt_BR.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
        <script src="https://cdn.datatables.net/buttons/1.5.1/js/dataTables.buttons.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.32/vfs_fonts.js"></script>
        <script src="https://cdn.datatables.net/buttons/1.5.1/js/buttons.html5.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        <script>
            const WORKFLOW_ID = <?php echo $workflowId; ?>;
        </script>
        <script src="/app/src/js/workflow/detalhes.js"></script>
        <script src="/app/src/js/workflow/geradorPDF.js"></script>
    </div>
</body>

</html>
