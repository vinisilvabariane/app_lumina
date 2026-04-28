<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/configs/Authenticator.php';
?>

<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Lumina | Homepage</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/buttons/2.4.1/css/buttons.bootstrap5.min.css">
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
                    <small>Homepage de workflows</small>
                </div>
            </a>

            <div class="topbar-actions">
                <a class="topbar-link active" href="/app/views/workflow/geral/index.php">Home</a>
                <button class="btn btn-primary btn-create btn-create--top" data-bs-toggle="modal" data-bs-target="#newWorkflowModal">
                    <i class="fas fa-plus"></i>
                    Novo workflow
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
            <section class="hero-grid">
                <article class="hero-panel">
                    <div class="hero-copy">
                        <span class="eyebrow">Homepage</span>
                        <h1>Uma central mais moderna para visualizar, filtrar e criar workflows.</h1>
                        <p>Interface redesenhada com foco em clareza, contraste e tomada de decisao. Menos ruido visual, mais leitura e controle do fluxo.</p>

                        <div class="hero-actions">
                            <button class="btn btn-primary btn-create" data-bs-toggle="modal" data-bs-target="#newWorkflowModal">
                                <i class="fas fa-plus"></i>
                                Criar workflow
                            </button>
                            <a class="btn btn-secondary-shell" href="#workflowsTable">
                                <i class="fas fa-arrow-down"></i>
                                Ver fila
                            </a>
                        </div>
                    </div>

                    <div class="hero-aside" aria-hidden="true">
                        <div class="hero-aside__card">
                            <span class="hero-aside__label">Status da operacao</span>
                            <strong>Organizacao e foco em uma unica tela</strong>
                            <div class="hero-bars">
                                <span></span>
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>

                        <div class="hero-aside__meta">
                            <div>
                                <span>Visual</span>
                                <strong>Editorial</strong>
                            </div>
                            <div>
                                <span>Experiencia</span>
                                <strong>Clara e orientada a decisao</strong>
                            </div>
                        </div>
                    </div>
                </article>

                <aside class="quick-panel">
                    <span class="eyebrow">Atalhos</span>
                    <h2>Visao rapida da homepage</h2>
                    <p>Use os filtros abaixo para navegar pela fila e acompanhar o panorama do ambiente.</p>
                    <div class="quick-panel__list">
                        <div class="quick-item">
                            <i class="fas fa-layer-group"></i>
                            <div>
                                <strong>Fila central</strong>
                                <span>Tabela com leitura mais limpa</span>
                            </div>
                        </div>
                        <div class="quick-item">
                            <i class="fas fa-filter"></i>
                            <div>
                                <strong>Filtros diretos</strong>
                                <span>Todos, meus e participando</span>
                            </div>
                        </div>
                        <div class="quick-item">
                            <i class="fas fa-paperclip"></i>
                            <div>
                                <strong>Novo cadastro</strong>
                                <span>Modal mais organizado e consistente</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </section>

            <section class="stats-grid" id="workflowStatsContainer">
                <article class="stats-card stats-card--accent">
                    <span class="stats-icon"><i class="fas fa-layer-group"></i></span>
                    <span class="stats-label">Total</span>
                    <strong class="stats-value" id="ativosCount">0</strong>
                    <span class="stats-meta">Workflows registrados</span>
                </article>
                <article class="stats-card">
                    <span class="stats-icon"><i class="fas fa-spinner"></i></span>
                    <span class="stats-label">Ativos</span>
                    <strong class="stats-value" id="andamentoCount">0</strong>
                    <span class="stats-meta">Em andamento</span>
                </article>
                <article class="stats-card">
                    <span class="stats-icon"><i class="fas fa-circle-check"></i></span>
                    <span class="stats-label">Aprovados</span>
                    <strong class="stats-value" id="aprovadosCount">0</strong>
                    <span class="stats-meta">Concluidos com sucesso</span>
                </article>
                <article class="stats-card">
                    <span class="stats-icon"><i class="fas fa-triangle-exclamation"></i></span>
                    <span class="stats-label">Rejeitados</span>
                    <strong class="stats-value" id="rejeitadosCount">0</strong>
                    <span class="stats-meta">Demandam revisao</span>
                </article>
            </section>

            <section class="content-panel">
                <div class="panel-head">
                    <div>
                        <span class="section-kicker">Fila principal</span>
                        <h2>Workflows em andamento</h2>
                        <p>Filtre rapidamente os itens relevantes para seu contexto atual.</p>
                    </div>
                    <div class="filter-group" role="group" aria-label="Filtro de Workflows">
                        <button type="button" class="btn btn-filter active" id="btnTodos">Todos</button>
                        <button type="button" class="btn btn-filter" id="btnMeus">Meus</button>
                        <button type="button" class="btn btn-filter" id="btnParticipando">Participando</button>
                    </div>
                </div>

                <div class="table-card">
                    <div class="table-card__header">
                        <div>
                            <h3>Lista de workflows</h3>
                            <p>Leitura otimizada para consulta, triagem e acesso aos detalhes.</p>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table id="workflowsTable" class="table table-hover align-middle" style="width:100%">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Titulo</th>
                                    <th>Descricao</th>
                                    <th>Prioridade</th>
                                    <th>Categoria</th>
                                    <th>Data de criacao</th>
                                    <th>Status</th>
                                    <th>Acoes</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </section>
        </main>

        <div class="modal fade" id="newWorkflowModal" tabindex="-1" aria-labelledby="newWorkflowModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <div>
                            <span class="eyebrow">Cadastro</span>
                            <h5 class="modal-title" id="newWorkflowModalLabel">Novo workflow</h5>
                            <p>Preencha os dados abaixo para iniciar um novo fluxo.</p>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="newWorkflowForm" class="needs-validation" novalidate enctype="multipart/form-data">
                        <div class="modal-body">
                            <div class="row g-3">
                                <div class="col-12">
                                    <label for="workflowTitulo" class="form-label">Titulo</label>
                                    <input type="text" class="form-control" id="workflowTitulo" placeholder="Ex.: Revisao de procedimento interno" required maxlength="100" />
                                    <div class="invalid-feedback">Informe o titulo do workflow.</div>
                                </div>
                                <div class="col-12">
                                    <label for="workflowDescricao" class="form-label">Descricao</label>
                                    <textarea class="form-control" id="workflowDescricao" placeholder="Descreva o objetivo e o contexto do fluxo." style="height: 120px" maxlength="500"></textarea>
                                </div>
                                <div class="col-md-6">
                                    <label for="workflowPrioridade" class="form-label">Prioridade</label>
                                    <select class="form-select" id="workflowPrioridade" required>
                                        <option value="" selected disabled>Selecione uma prioridade</option>
                                        <option value="ALTA">Alta</option>
                                        <option value="MEDIA">Media</option>
                                        <option value="BAIXA">Baixa</option>
                                    </select>
                                    <div class="invalid-feedback">Selecione uma prioridade.</div>
                                </div>
                                <div class="col-md-6">
                                    <label for="workflowCategoria" class="form-label">Categoria</label>
                                    <select class="form-select" id="workflowCategoria">
                                        <option value="" selected disabled>Selecione uma categoria</option>
                                        <option value="REQUISITOS">Requisitos de clientes</option>
                                        <option value="NORMAS">Normas SGQ</option>
                                        <option value="PROCEDIMENTOS">Procedimentos</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label for="workflowPrazoFinal" class="form-label">Prazo final</label>
                                    <input type="date" class="form-control" id="workflowPrazoFinal" />
                                    <div class="form-text">Data limite para conclusao.</div>
                                </div>
                                <div class="col-12">
                                    <label for="workflowResponsaveis" class="form-label">Usuarios responsaveis</label>
                                    <select class="form-select" id="workflowResponsaveis" multiple></select>
                                    <div id="selectedUsersContainer" class="selected-users">
                                        <span>Nenhum usuario selecionado</span>
                                    </div>
                                    <input type="hidden" id="selectedUsersIds" name="selectedUsersIds">
                                </div>
                                <div class="col-12">
                                    <label class="form-label">Anexos</label>
                                    <div id="fileDropArea" class="upload-dropzone">
                                        <i class="fas fa-arrow-up-from-bracket"></i>
                                        <p>Arraste arquivos aqui ou clique para selecionar</p>
                                        <small>Maximo de 5 arquivos, ate 10 MB cada</small>
                                        <input type="file" id="fileInput" name="files[]" multiple style="display: none;" accept="*" />
                                    </div>
                                    <div class="mt-3" id="fileList"></div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Salvar workflow</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
        <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
        <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
        <script src="https://cdn.datatables.net/buttons/2.4.1/js/dataTables.buttons.min.js"></script>
        <script src="https://cdn.datatables.net/buttons/2.4.1/js/buttons.bootstrap5.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
        <script src="/app/src/js/shared/http.js"></script>
        <script src="/app/src/js/shared/ui.js"></script>
        <script src="/app/src/js/workflow/main.js"></script>
    </div>
</body>

</html>
