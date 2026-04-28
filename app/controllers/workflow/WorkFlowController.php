<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/configs/Connection.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/configs/Authenticator.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/controllers/BaseController.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/user/UserModel.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/workflow/WorkflowModel.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/workflow/WorkflowResponsavelModel.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/workflow/WorkflowEtapaModel.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/workflow/WorkflowAnexoModel.php';

class WorkFlowController extends BaseController
{
    private PDO $pdo;
    private UserModel $userModel;
    private WorkflowModel $workflowModel;
    private WorkflowResponsavelModel $responsavelModel;
    private WorkflowEtapaModel $etapaModel;
    private WorkflowAnexoModel $anexoModel;

    public function __construct()
    {
        $this->ensureSessionStarted();

        $this->pdo = (new Connection())->getConnection();
        $this->userModel = new UserModel($this->pdo);
        $this->workflowModel = new WorkflowModel($this->pdo);
        $this->responsavelModel = new WorkflowResponsavelModel($this->pdo);
        $this->etapaModel = new WorkflowEtapaModel($this->pdo);
        $this->anexoModel = new WorkflowAnexoModel($this->pdo);
    }

    public function carregarUsuarios(): void
    {
        try {
            $this->respondSuccess($this->userModel->carregarUsuariosAtivos());
        } catch (Throwable $exception) {
            $this->respondError('Erro ao buscar usuarios: ' . $exception->getMessage(), 500);
        }
    }

    public function getWorkFlow(string $filter): void
    {
        try {
            $workflows = $this->workflowModel->listarPorFiltro($filter, $this->getSessionUserId());
            $this->respondSuccess($workflows);
        } catch (Throwable $exception) {
            $this->respondError('Erro ao buscar workflows: ' . $exception->getMessage(), 401);
        }
    }

    public function getEtapas($workflowId): void
    {
        try {
            $etapas = $this->etapaModel->listarPorWorkflowId((int) $workflowId);

            if ($etapas === []) {
                $this->respondJson([
                    'success' => false,
                    'message' => 'Nenhuma etapa encontrada'
                ]);
            }

            $this->respondJson([
                'success' => true,
                'data' => $etapas
            ]);
        } catch (Throwable $exception) {
            $this->respondJson([
                'success' => false,
                'message' => 'Erro ao buscar etapas: ' . $exception->getMessage()
            ], 500);
        }
    }

    public function getValidateOwner($workflowId): void
    {
        try {
            if (!is_numeric($workflowId)) {
                $this->respondError('ID do workflow invalido', 400);
            }

            $owner = $this->workflowModel->buscarDono((int) $workflowId);
            if (!$owner) {
                $this->respondError('Workflow nao encontrado', 404);
            }

            $this->respondSuccess([
                'isOwner' => (int) $owner['usuario_criador'] === $this->getSessionUserId()
            ]);
        } catch (Throwable $exception) {
            $this->respondError('Erro ao validar proprietario: ' . $exception->getMessage(), 500);
        }
    }

    public function verificaRevisaoWorkflow(): void
    {
        try {
            $input = $this->getJsonInput();
            $workflowId = (int) ($input['workflowId'] ?? 0);

            if ($workflowId <= 0) {
                throw new Exception('ID do workflow nao informado');
            }

            $revisao = $this->etapaModel->verificarRevisao($workflowId);
            $this->respondSuccess([
                'message' => 'Verificacao de revisao concluida',
                'etapas_em_revisao' => $revisao['etapas_em_revisao'],
                'total_etapas_revisao' => $revisao['total_etapas_revisao']
            ]);
        } catch (Throwable $exception) {
            $this->respondError('Erro ao verificar etapa de revisao: ' . $exception->getMessage(), 400);
        }
    }

    public function verificaReprovacaoUsuario(): void
    {
        try {
            $input = $this->getJsonInput();
            $workflowId = (int) ($input['workflowId'] ?? 0);

            if ($workflowId <= 0) {
                throw new Exception('ID do workflow nao informado');
            }

            $temReprovacao = $this->etapaModel->verificarReprovacaoUsuario($workflowId, $this->getSessionUserId());
            $this->respondSuccess([
                'message' => 'Verificacao concluida',
                'temReprovacao' => (int) $temReprovacao
            ]);
        } catch (Throwable $exception) {
            $this->respondError('Erro ao verificar se o usuario ja rejeitou: ' . $exception->getMessage(), 400);
        }
    }

    public function verificaAprovacaoUsuario(): void
    {
        try {
            $input = $this->getJsonInput();
            $workflowId = (int) ($input['workflowId'] ?? 0);

            if ($workflowId <= 0) {
                throw new Exception('ID do workflow nao informado');
            }

            $temAprovacao = $this->etapaModel->verificarAprovacaoUsuario($workflowId, $this->getSessionUserId());
            $this->respondSuccess([
                'message' => 'Verificacao concluida',
                'temAprovacao' => (int) $temAprovacao
            ]);
        } catch (Throwable $exception) {
            $this->respondError('Erro ao verificar se o usuario ja aprovou: ' . $exception->getMessage(), 400);
        }
    }

    public function validarResponsavel(): void
    {
        try {
            $input = $this->getJsonInput();
            $workflowId = (int) ($input['workflowId'] ?? 0);
            $usuarioId = $this->getSessionUserId();

            $responsaveis = $this->responsavelModel->listarPorWorkflowId($workflowId);
            $usuarioEhResponsavel = false;

            foreach ($responsaveis as $responsavel) {
                if ((int) $responsavel['usuario_id'] === $usuarioId) {
                    $usuarioEhResponsavel = true;
                    break;
                }
            }

            $this->respondSuccess(['isResponsavel' => $usuarioEhResponsavel]);
        } catch (Throwable $exception) {
            $this->respondError('Ocorreu um erro interno ao validar o responsavel.', 500);
        }
    }

    public function carregarWorkflowPorId($id): void
    {
        try {
            $workflowId = (int) $id;
            if ($workflowId <= 0) {
                $this->respondError('ID do workflow invalido', 400);
            }

            $workflow = $this->workflowModel->buscarPorId($workflowId);
            if (!$workflow) {
                $this->respondError('Workflow nao encontrado', 404);
            }

            $this->respondSuccess([
                'id' => $workflow['id'],
                'titulo' => $workflow['titulo'],
                'descricao' => $workflow['descricao'],
                'prioridade' => $workflow['prioridade'],
                'categoria' => $workflow['categoria'],
                'status' => $workflow['status'],
                'prazo_final' => $workflow['prazo_final'],
                'criado_por' => $workflow['criado_por'],
                'nome_criador' => $workflow['nome_criador'],
                'email_criador' => $workflow['email_criador'],
                'data_criacao' => $workflow['data_criacao'],
                'data_conclusao' => $workflow['data_conclusao'],
                'responsaveis' => $this->responsavelModel->listarPorWorkflowId($workflowId),
                'anexos' => $this->anexoModel->listarPorWorkflowId($workflowId)
            ]);
        } catch (Throwable $exception) {
            error_log('Erro em carregarWorkflowPorId: ' . $exception->getMessage());
            $this->respondError('Erro interno ao buscar workflow', 500);
        }
    }

    public function getEstatisticsWorkFlow(): void
    {
        try {
            $this->respondSuccess($this->workflowModel->obterEstatisticas());
        } catch (Throwable $exception) {
            $this->respondError('Erro ao buscar estatisticas: ' . $exception->getMessage(), 500);
        }
    }

    public function createWorkflow(): void
    {
        try {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Metodo nao permitido');
            }

            $requiredFields = ['titulo', 'prioridade'];
            foreach ($requiredFields as $field) {
                if (empty($_POST[$field])) {
                    throw new Exception("O campo $field e obrigatorio");
                }
            }

            $dadosWorkflow = [
                'titulo' => trim($_POST['titulo']),
                'descricao' => trim($_POST['descricao'] ?? ''),
                'prioridade' => $this->normalizarPrioridade($_POST['prioridade']),
                'categoria' => $_POST['categoria'] ?? null,
                'responsaveis' => !empty($_POST['responsaveis']) ? array_map('intval', explode(',', $_POST['responsaveis'])) : [],
                'criado_por' => $this->getSessionUserId(),
                'prazo_final' => !empty($_POST['prazo_final']) ? $_POST['prazo_final'] : null
            ];

            if (!in_array($dadosWorkflow['criado_por'], $dadosWorkflow['responsaveis'], true)) {
                $dadosWorkflow['responsaveis'][] = $dadosWorkflow['criado_por'];
            }

            $anexos = !empty($_FILES['anexos']) ? $this->processarAnexos($_FILES['anexos']) : [];

            $this->pdo->beginTransaction();

            $workflowId = $this->workflowModel->criar($dadosWorkflow);
            $this->vincularResponsaveis($workflowId, $dadosWorkflow['responsaveis']);
            $this->anexoModel->inserirLote($workflowId, $anexos);

            $this->etapaModel->inserirAcao(
                $workflowId,
                $dadosWorkflow['criado_por'],
                'CRIACAO',
                'Workflow criado pelo usuario',
                'Workflow criado'
            );

            $this->registrarAprovacaoAutomaticaCriador($workflowId, $dadosWorkflow['responsaveis'], $dadosWorkflow['criado_por']);

            $this->pdo->commit();

            $this->respondSuccess([
                'workflow_id' => $workflowId,
                'message' => 'Workflow criado com sucesso'
            ]);
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            $this->respondError($exception->getMessage(), 400);
        }
    }

    public function verificaAprovado(): void
    {
        try {
            $input = $this->getJsonInput();
            $workflowId = (int) ($input['workflowId'] ?? 0);

            if ($workflowId <= 0) {
                throw new Exception('ID do workflow nao fornecido');
            }

            $this->respondSuccess([
                'aprovado' => $this->workflowModel->estaAprovado($workflowId)
            ]);
        } catch (Throwable $exception) {
            $this->respondError('Erro ao verificar aprovacao: ' . $exception->getMessage(), 400);
        }
    }

    public function atualizarWorkflow(): void
    {
        try {
            $input = $this->getJsonInput();
            $workflowId = (int) ($input['id'] ?? 0);
            $usuarioId = $this->getSessionUserId();

            if ($workflowId <= 0 || empty($input['titulo'])) {
                throw new Exception('Dados incompletos para atualizacao');
            }

            if (isset($input['prioridade'])) {
                $input['prioridade'] = $this->normalizarPrioridade($input['prioridade']);
            }

            $result = $this->workflowModel->atualizar($input);
            $this->etapaModel->inserirAcao(
                $workflowId,
                $usuarioId,
                'EDICAO',
                'Workflow editado',
                'Processo editado pelo criador do workflow'
            );

            if (!$result) {
                throw new Exception('Erro ao atualizar workflow');
            }

            $this->respondSuccess(['message' => 'Workflow atualizado com sucesso']);
        } catch (Throwable $exception) {
            $this->respondError($exception->getMessage(), 400);
        }
    }

    public function atualizarStatusWorkflow($workflowId = null): void
    {
        try {
            $input = $this->getJsonInput();
            $workflowId = (int) ($input['workflowId'] ?? $workflowId ?? 0);
            $statusAtual = $this->workflowModel->buscarStatus($workflowId);

            if ($statusAtual === 'REJEITADO') {
                $this->respondJson([
                    'success' => true,
                    'status' => 'REJEITADO',
                    'workflowId' => $workflowId,
                    'message' => 'Workflow ja esta rejeitado - status mantido'
                ]);
            }

            $todosAprovaram = $this->etapaModel->verificarAprovacaoCompleta(
                $workflowId,
                $this->responsavelModel->totalResponsaveis($workflowId)
            );

            if ($todosAprovaram) {
                $this->workflowModel->aprovar($workflowId);
                $status = 'APROVADO';
            } else {
                $this->workflowModel->setarEmAndamento($workflowId);
                $status = 'EM_ANDAMENTO';
            }

            $this->respondJson([
                'success' => true,
                'status' => $status,
                'workflowId' => $workflowId
            ]);
        } catch (Throwable $exception) {
            $this->respondError($exception->getMessage(), 400);
        }
    }

    public function reprovarWorkflow(): void
    {
        try {
            $input = $this->getJsonInput();
            $workflowId = (int) ($input['workflowId'] ?? 0);
            $justificativa = trim((string) ($input['justificativa'] ?? ''));
            $usuarioId = $this->getSessionUserId();

            $this->etapaModel->desativarRevisoes($workflowId);
            $this->workflowModel->rejeitar($workflowId);
            $this->etapaModel->inserirAcao(
                $workflowId,
                $usuarioId,
                'APROVACAO_FINAL',
                'Workflow rejeitado pelo dono',
                $justificativa
            );

            $this->respondJson([
                'status' => 'success',
                'message' => 'Workflow rejeitado com sucesso'
            ]);
        } catch (Throwable $exception) {
            $this->respondJson([
                'status' => 'error',
                'message' => 'Erro ao reprovar Workflow: ' . $exception->getMessage()
            ], 500);
        }
    }

    public function devolverRevisaoDono(): void
    {
        try {
            $input = $this->getJsonInput();
            $this->etapaModel->devolverRevisaoDono(
                (int) ($input['workflowId'] ?? 0),
                (int) ($input['etapaId'] ?? 0),
                (string) ($input['justificativa'] ?? ''),
                $this->getSessionUserId()
            );

            $this->respondJson([
                'status' => 'success',
                'message' => 'Revisao devolvida com sucesso!'
            ]);
        } catch (Throwable $exception) {
            $this->respondJson([
                'status' => 'error',
                'message' => 'Erro ao devolver a revisao do dono: ' . $exception->getMessage()
            ], 500);
        }
    }

    public function devolverRevisaoUsuario(): void
    {
        try {
            $input = $this->getJsonInput();
            $this->etapaModel->devolverRevisaoUsuario(
                (int) ($input['workflowId'] ?? 0),
                (int) ($input['etapaId'] ?? 0),
                (string) ($input['justificativa'] ?? ''),
                $this->getSessionUserId()
            );

            $this->respondJson([
                'status' => 'success',
                'message' => 'Revisao devolvida com sucesso!'
            ]);
        } catch (Throwable $exception) {
            $this->respondJson([
                'status' => 'error',
                'message' => 'Erro ao devolver a revisao do dono: ' . $exception->getMessage()
            ], 500);
        }
    }

    public function aprovarWorkflow(): void
    {
        try {
            $input = $this->getJsonInput();
            $workflowId = (int) ($input['workflowId'] ?? 0);
            $justificativa = (string) ($input['justificativa'] ?? '');
            $usuarioId = $this->getSessionUserId();

            $idEtapa = $this->etapaModel->buscarUltimaEtapaPorTipo($workflowId, $usuarioId);
            if ($idEtapa) {
                $this->etapaModel->atualizarRevisao($idEtapa);
            }

            $this->etapaModel->inserirAcao(
                $workflowId,
                $usuarioId,
                'APROVACAO',
                'Workflow aprovado pelo usuario',
                $justificativa
            );

            $todosAprovaram = $this->etapaModel->verificarAprovacaoCompleta(
                $workflowId,
                $this->responsavelModel->totalResponsaveis($workflowId)
            );

            if ($todosAprovaram) {
                $this->workflowModel->aprovar($workflowId);
                $this->etapaModel->inserirAcao(
                    $workflowId,
                    $usuarioId,
                    'APROVACAO_FINAL',
                    'Workflow aprovado por todos os responsaveis',
                    'Aprovacao final concluida',
                    $this->getFutureTimestamp()
                );

                $this->respondSuccess(['message' => 'Workflow aprovado completamente por todos os responsaveis']);
            }

            $this->respondSuccess(['message' => 'Sua aprovacao foi registrada. Aguardando outros responsaveis.']);
        } catch (Throwable $exception) {
            $this->respondError('Erro ao aprovar workflow: ' . $exception->getMessage(), 400);
        }
    }

    public function rejeitarUsuarioWorkflow(): void
    {
        try {
            $input = $this->getJsonInput();
            $workflowId = (int) ($input['workflowId'] ?? 0);
            $justificativa = trim((string) ($input['justificativa'] ?? ''));

            if ($workflowId <= 0 || $justificativa === '') {
                throw new Exception('Dados incompletos para rejeicao');
            }

            $result = $this->etapaModel->inserirAcao(
                $workflowId,
                $this->getSessionUserId(),
                'REPROVACAO',
                'Workflow rejeitado pelo usuario',
                $justificativa,
                null,
                1,
                0
            );

            if (!$result) {
                throw new Exception('Erro ao rejeitar workflow');
            }

            $this->respondSuccess(['message' => 'Usuario rejeitou o workflow']);
        } catch (Throwable $exception) {
            $this->respondError($exception->getMessage(), 400);
        }
    }

    public function getChatReprovacao(): void
    {
        try {
            $etapaId = (int) ($_GET['etapaId'] ?? 0);
            if ($etapaId <= 0) {
                throw new Exception('ID da etapa nao fornecido');
            }

            $this->respondJson([
                'status' => 'success',
                'data' => $this->etapaModel->listarMensagensChat($etapaId)
            ]);
        } catch (Throwable $exception) {
            $this->respondJson([
                'status' => 'error',
                'message' => 'Erro ao carregar chat: ' . $exception->getMessage()
            ], 400);
        }
    }

    public function adicionarResponsavel(): void
    {
        try {
            $input = $this->getJsonInput();
            $result = $this->responsavelModel->adicionar(
                (int) ($input['workflowId'] ?? 0),
                (int) ($input['userId'] ?? 0)
            );

            $this->respondJson([
                'status' => 'success',
                'message' => 'Responsavel adicionado com sucesso!',
                'data' => $result
            ]);
        } catch (Throwable $exception) {
            $this->respondJson([
                'status' => 'error',
                'message' => $exception->getMessage()
            ], 400);
        }
    }

    public function removerResponsavel(): void
    {
        try {
            $input = $this->getJsonInput();
            $workflowId = (int) ($input['workflowId'] ?? 0);
            $userId = (int) ($input['userId'] ?? 0);
            $novoResponsavelId = (int) ($input['novoResponsavelId'] ?? 0);
            $usuarioId = $this->getSessionUserId();

            if ($novoResponsavelId <= 0) {
                throw new Exception('E necessario selecionar um novo responsavel para substituir o removido');
            }

            $result = $this->responsavelModel->remover($workflowId, $userId, $novoResponsavelId);
            if (!$result) {
                throw new Exception('Erro ao remover responsavel no banco de dados');
            }

            $todosAprovaram = $this->etapaModel->verificarAprovacaoCompleta(
                $workflowId,
                $this->responsavelModel->totalResponsaveis($workflowId)
            );

            if ($todosAprovaram) {
                $this->workflowModel->aprovar($workflowId);
                $this->etapaModel->inserirAcao(
                    $workflowId,
                    $usuarioId,
                    'APROVACAO_FINAL',
                    'Workflow aprovado por todos os responsaveis apos remocao',
                    'Aprovacao final concluida automaticamente apos remocao de responsavel',
                    $this->getFutureTimestamp()
                );

                $this->respondJson([
                    'status' => 'success',
                    'message' => 'Responsavel removido e workflow aprovado automaticamente!',
                    'data' => $result,
                    'workflow_aprovado' => true
                ]);
            }

            $this->respondJson([
                'status' => 'success',
                'message' => 'Responsavel removido e substituido com sucesso!',
                'data' => $result,
                'workflow_aprovado' => false
            ]);
        } catch (Throwable $exception) {
            $this->respondJson([
                'status' => 'error',
                'message' => $exception->getMessage()
            ], 400);
        }
    }

    private function vincularResponsaveis(int $workflowId, array $responsaveis): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO workflow_responsaveis (workflow_id, usuario_id, data_atribuicao)
             VALUES (:workflow_id, :usuario_id, NOW())'
        );

        foreach ($responsaveis as $responsavelId) {
            $stmt->execute([
                ':workflow_id' => $workflowId,
                ':usuario_id' => (int) $responsavelId
            ]);
        }
    }

    private function registrarAprovacaoAutomaticaCriador(int $workflowId, array $responsaveis, int $criadorId): void
    {
        if (!in_array($criadorId, $responsaveis, true)) {
            return;
        }

        $this->etapaModel->inserirAcao(
            $workflowId,
            $criadorId,
            'APROVACAO',
            'Aprovacao automatica do criador',
            'Aprovado automaticamente ao criar o workflow',
            $this->getFutureTimestamp()
        );
    }

    private function processarAnexos(array $arquivos): array
    {
        $anexosProcessados = [];
        $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/';

        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        foreach ($arquivos['name'] as $index => $name) {
            if ($arquivos['error'][$index] !== UPLOAD_ERR_OK) {
                continue;
            }

            if ($arquivos['size'][$index] > (10 * 1024 * 1024)) {
                continue;
            }

            $extensao = pathinfo($name, PATHINFO_EXTENSION);
            $nomeArquivo = uniqid() . '.' . $extensao;
            $caminhoCompleto = $uploadDir . $nomeArquivo;

            if (move_uploaded_file($arquivos['tmp_name'][$index], $caminhoCompleto)) {
                $anexosProcessados[] = [
                    'nome_original' => $name,
                    'nome_arquivo' => $nomeArquivo,
                    'caminho' => '/uploads/' . $nomeArquivo,
                    'tipo' => $arquivos['type'][$index],
                    'tamanho' => $arquivos['size'][$index]
                ];
            }
        }

        return $anexosProcessados;
    }

    private function normalizarPrioridade($prioridade): string
    {
        $prioridade = strtoupper(trim((string) $prioridade));

        if ($prioridade === 'MEDIA' || $prioridade === 'MÉDIA') {
            return 'MEDIA';
        }

        return $prioridade;
    }

    private function getFutureTimestamp(): string
    {
        $dt = new DateTime('now', new DateTimeZone('America/Sao_Paulo'));
        $dt->modify('+1 second');

        return $dt->format('Y-m-d H:i:s');
    }
}
