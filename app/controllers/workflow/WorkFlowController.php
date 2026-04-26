<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once($_SERVER["DOCUMENT_ROOT"] . "/app/configs/Authenticator.php");
require_once($_SERVER["DOCUMENT_ROOT"] . "/app/models/workflow/WorkFlowModel.php");

class WorkFlowController
{
    private $model;

    public function __construct()
    {
        $this->model = new WorkFlowModel();
    }

    /*
    FUNÇÕES NA BASE DE USUÁRIOS
    */

    //Carrega todos os usuários
    public function carregarUsuarios()
    {
        try {
            $usuarios = $this->model->carregarUsuarios();
            $this->envioRespostaSucesso($usuarios);
        } catch (Exception $e) {
            $this->envioRespostaErro(500, 'Erro ao buscar usuários: ' . $e->getMessage());
        }
    }

    /*
    FUNÇÕES NA BASE DE WORKFLOWS
    */

    //Carrega workflows com base no filtro
    public function getWorkFlow($filter)
    {
        try {
            if (!isset($_SESSION['id'])) {
                throw new Exception('Usuário não autenticado');
            }
            $userId = (int)$_SESSION['id'];
            $workflows = $this->model->getWorkFlow($filter, $userId);
            $this->envioRespostaSucesso($workflows);
        } catch (Exception $e) {
            $this->envioRespostaErro(401, 'Erro ao buscar workflows: ' . $e->getMessage());
        }
    }

    //Carrega etapas de um workflow específico
    public function getEtapas($workflowId)
    {
        try {
            $etapas = $this->model->getEtapas($workflowId);
            if ($etapas) {
                echo json_encode([
                    'success' => true,
                    'data' => $etapas
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Nenhuma etapa encontrada'
                ]);
                return null;
            }
            return $etapas;
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Erro ao buscar etapas: ' . $e->getMessage()
            ]);
        }
    }

    //Valida se o usuário é o proprietário
    public function getValidateOwner($workflowId)
    {
        try {
            if (!is_numeric($workflowId)) {
                return $this->envioRespostaErro(400, 'ID do workflow inválido');
            }
            $owner = $this->model->getValidateOwner($workflowId);
            if (!$owner) {
                return $this->envioRespostaErro(404, 'Workflow não encontrado');
            }
            $isOwner = $owner['usuario_criador'] == $_SESSION['id'];
            return $this->envioRespostaSucesso(['isOwner' => $isOwner]);
        } catch (Exception $e) {
            return $this->envioRespostaErro(500, 'Erro ao validar proprietário: ' . $e->getMessage());
        }
    }

    // Verifica se o workflow está em revisão e de quem é a revisão
    public function verificaRevisaoWorkflow(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            if (empty($input['workflowId'])) {
                throw new Exception('ID do workflow não informado');
            }
            $workflowId = (int)$input['workflowId'];
            $revisao = $this->model->verificaRevisao($workflowId);
            $this->envioRespostaSucesso([
                'message' => 'Verificação de revisão concluída',
                'etapas_em_revisao' => $revisao['etapas_em_revisao'],
                'total_etapas_revisao' => $revisao['total_etapas_revisao']
            ]);
        } catch (Exception $e) {
            $this->envioRespostaErro(400, "Erro ao verificar etapa de revisão: " . $e->getMessage());
        }
    }

    //Verifica se para o usuario consta reprovacao
    public function verificaReprovacaoUsuario()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            if (empty($input['workflowId'])) {
                throw new Exception('ID do workflow não informado');
            }
            $workflowId = (int)$input['workflowId'];
            $usuarioId = $_SESSION['id'];
            $temReprovacao = $this->model->verificaReprovacaoUsuario($workflowId, $usuarioId);
            $this->envioRespostaSucesso([
                'message' => 'Verificação concluída',
                'temReprovacao' => (int)$temReprovacao
            ]);
        } catch (Exception $e) {
            $this->envioRespostaErro(400, "Erro ao verificar se o usuário já rejeitou: " . $e->getMessage());
        }
    }

    //Verifica se para o usuario consta aprovacao
    public function verificaAprovacaoUsuario()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            if (empty($input['workflowId'])) {
                throw new Exception('ID do workflow não informado');
            }
            $workflowId = (int)$input['workflowId'];
            $usuarioId = $_SESSION['id'];
            $temAprovacao = $this->model->verificaAprovacaoUsuario($workflowId, $usuarioId);
            $this->envioRespostaSucesso([
                'message' => 'Verificação concluída',
                'temAprovacao' => (int)$temAprovacao
            ]);
        } catch (Exception $e) {
            $this->envioRespostaErro(400, "Erro ao verificar se o usuário já aprovou: " . $e->getMessage());
        }
    }

    //Verifica se o usuario faz parte dos responsaveis do workflow
    public function validarResponsavel()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $workflowId = isset($input['workflowId']) ? (int)$input['workflowId'] : 0;
            $usuarioId = $_SESSION['id'];
            $responsaveis = $this->model->carregarResponsaveisPorWorkflowId($workflowId);
            $usuarioEhResponsavel = false;
            foreach ($responsaveis as $responsavel) {
                if ($responsavel['usuario_id'] == $usuarioId) {
                    $usuarioEhResponsavel = true;
                    break;
                }
            }
            return $this->envioRespostaSucesso(['isResponsavel' => $usuarioEhResponsavel]);
        } catch (Exception $e) {
            return $this->envioRespostaErro(500, 'Ocorreu um erro interno ao validar o responsável.');
        }
    }

    //Carrega workflow completo por ID
    public function carregarWorkflowPorId($id)
    {
        try {
            if (!is_numeric($id)) {
                $this->envioRespostaErro(400, 'ID do workflow inválido');
                return;
            }
            $workflow = $this->model->carregarWorkflowPorId($id);
            if (!$workflow) {
                $this->envioRespostaErro(404, 'Workflow não encontrado');
                return;
            }
            $responsaveis = $this->model->carregarResponsaveisPorWorkflowId($id);
            $anexos = $this->model->getAnexosByWorkflowId($id);
            $workflowCompleto = [
                'id' => $workflow['id'],
                'titulo' => $workflow['titulo'],
                'descricao' => $workflow['descricao'],
                'prioridade' => $workflow['prioridade'],
                'categoria' => $workflow['categoria'],
                'status' => $workflow['status'],
                "prazo_final" => $workflow['prazo_final'],
                'criado_por' => $workflow['criado_por'],
                'nome_criador' => $workflow['nome_criador'],
                'email_criador' => $workflow['email_criador'],
                'data_criacao' => $workflow['data_criacao'],
                'data_conclusao' => $workflow['data_conclusao'],
                'responsaveis' => $responsaveis,
                'anexos' => $anexos
            ];
            $this->envioRespostaSucesso($workflowCompleto);
        } catch (Exception $e) {
            error_log("Erro em carregarWorkflowPorId: " . $e->getMessage());
            $this->envioRespostaErro(500, 'Erro interno ao buscar workflow');
        }
    }

    //Obtém estatísticas gerais dos workflows
    public function getEstatisticsWorkFlow()
    {
        try {
            $estatisticas = $this->model->getEstatisticsWorkFlow();
            $this->envioRespostaSucesso($estatisticas);
        } catch (Exception $e) {
            $this->envioRespostaErro(500, 'Erro ao buscar estatísticas: ' . $e->getMessage());
        }
    }

    //Cria um novo workflow
    public function createWorkflow()
    {
        try {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Método não permitido');
            }
            $requiredFields = ['titulo', 'prioridade'];
            foreach ($requiredFields as $field) {
                if (empty($_POST[$field])) {
                    throw new Exception("O campo $field é obrigatório");
                }
            }
            $dadosWorkflow = [
                'titulo' => trim($_POST['titulo']),
                'descricao' => trim($_POST['descricao'] ?? ''),
                'prioridade' => $this->normalizarPrioridade($_POST['prioridade']),
                'categoria' => $_POST['categoria'] ?? null,
                'responsaveis' => !empty($_POST['responsaveis']) ? explode(',', $_POST['responsaveis']) : [],
                'criado_por' => $_SESSION['id'],
                'prazo_final' => !empty($_POST['prazo_final']) ? $_POST['prazo_final'] : null
            ];
            if (!in_array($_SESSION['id'], $dadosWorkflow['responsaveis'])) {
                $dadosWorkflow['responsaveis'][] = $_SESSION['id'];
            }
            $anexos = [];
            if (!empty($_FILES['anexos'])) {
                $anexos = $this->processarAnexos($_FILES['anexos']);
            }
            $workflowId = $this->model->criarWorkflow($dadosWorkflow, $anexos);
            $this->model->inserirAcaoWorkflow(
                $workflowId,
                $_SESSION['id'],
                'CRIACAO',
                'Workflow criado pelo usuário',
                'Workflow criado'
            );
            if (in_array($_SESSION['id'], $dadosWorkflow['responsaveis'])) {
                $dt = new DateTime('now', new DateTimeZone('America/Sao_Paulo'));
                $dt->modify('+1 second');
                $dataFinal = $dt->format('Y-m-d H:i:s');
                $this->model->inserirAcaoWorkflow(
                    $workflowId,
                    $_SESSION['id'],
                    'APROVACAO',
                    'Aprovação automática do criador',
                    'Aprovado automaticamente ao criar o workflow',
                    $dataFinal
                );
            }
            $this->envioRespostaSucesso([
                'workflow_id' => $workflowId,
                'message' => 'Workflow criado com sucesso'
            ]);
        } catch (Exception $e) {
            $this->envioRespostaErro(400, $e->getMessage());
        }
    }

    //Valida se workflow esta aprovado true ou false
    public function verificaAprovado()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $workflowId = $input['workflowId'];
            if (empty($workflowId)) {
                throw new Exception('ID do workflow não fornecido');
            }
            $aprovado = $this->model->verificaAprovado($workflowId);
            if ($aprovado) {
                $this->envioRespostaSucesso(['aprovado' => true]);
            } else {
                $this->envioRespostaSucesso(['aprovado' => false]);
            }
        } catch (Exception $e) {
            throw new Exception('Erro ao verificar aprovação: ' . $e->getMessage());
        }
    }

    //Atualiza um workflow existente
    public function atualizarWorkflow()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $workflowId = $input['id'];
            $usuarioId = $_SESSION['id'];
            if (empty($input['id']) || empty($input['titulo'])) {
                throw new Exception('Dados incompletos para atualização');
            }
            if (isset($input['prioridade'])) {
                $input['prioridade'] = $this->normalizarPrioridade($input['prioridade']);
            }
            $result = $this->model->atualizarWorkflow($input);
            $this->model->inserirAcaoWorkflow(
                $workflowId,
                $usuarioId,
                'EDICAO',
                'Workflow editado',
                'Processo editado pelo criador do workflow'
            );
            if ($result) {
                $this->envioRespostaSucesso(['message' => 'Workflow atualizado com sucesso']);
            } else {
                throw new Exception('Erro ao atualizar workflow');
            }
        } catch (Exception $e) {
            $this->envioRespostaErro(400, $e->getMessage());
        }
    }

    //Atualiza o status do workflow com base nas aprovações
    public function atualizarStatusWorkflow($workflowId)
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $workflowId = $input['workflowId'];
            $statusAtual = $this->model->getStatusWorkflow($workflowId);
            if ($statusAtual === 'REJEITADO') {
                echo json_encode([
                    'success' => true,
                    'status' => 'REJEITADO',
                    'workflowId' => $workflowId,
                    'message' => 'Workflow já está rejeitado - status mantido'
                ]);
                return;
            }
            $aprovados = $this->model->verificarAprovacaoCompleta($workflowId);
            if ($aprovados) {
                $this->model->aprovarWorkflow($workflowId);
                $status = "APROVADO";
            } else {
                $this->model->setarEmAndamento($workflowId);
                $status = "EM_ANDAMENTO";
            }
            echo json_encode([
                'success' => true,
                'status' => $status,
                'workflowId' => $workflowId
            ]);
        } catch (Exception $e) {
            $this->envioRespostaErro(400, "" . $e->getMessage());
            throw new Exception('Erro ao alterar status do workflow: ' . $e->getMessage());
        }
    }

    public function reprovarWorkflow()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $workflowId = $input['workflowId'];
            $justificativa = $input['justificativa'];
            $usuarioId = $_SESSION['id'];
            $this->model->desativarRevisoesWorkflow($workflowId);
            $this->model->rejeitarWorkflow($workflowId, $justificativa);
            $this->model->inserirAcaoWorkflow(
                $workflowId,
                $usuarioId,
                'APROVACAO_FINAL',
                'Workflow rejeitado pelo dono',
                $justificativa
            );
            echo json_encode([
                'status' => 'success',
                'message' => 'Workflow rejeitado com sucesso'
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Erro ao reprovar Workflow: ' . $e->getMessage()
            ]);
        }
    }

    // Método público para a API
    public function devolverRevisaoDono()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $workflowId = $input['workflowId'] ?? null;
            $etapaId = $input['etapaId'] ?? null;
            $justificativa = $input['justificativa'] ?? null;
            $usuarioId = $_SESSION['id'] ?? null;
            $this->model->devolverRevisaoDono($workflowId, $etapaId, $justificativa, $usuarioId);
            echo json_encode([
                'status' => 'success',
                'message' => 'Revisão devolvida com sucesso!'
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Erro ao devolver a revisão do dono: ' . $e->getMessage()
            ]);
        }
    }

    public function devolverRevisaoUsuario()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $workflowId = $input['workflowId'] ?? null;
            $etapaId = $input['etapaId'] ?? null;
            $justificativa = $input['justificativa'] ?? null;
            $usuarioId = $_SESSION['id'] ?? null;
            $this->model->devolverRevisaoUsuario($workflowId, $etapaId, $justificativa, $usuarioId);
            echo json_encode([
                'status' => 'success',
                'message' => 'Revisão devolvida com sucesso!'
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Erro ao devolver a revisão do dono: ' . $e->getMessage()
            ]);
        }
    }

    //Aprova o workflow verificando se todos aprovaram
    public function aprovarWorkflow()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $workflowId = $input['workflowId'];
            $justificativa = $input['justificativa'];
            $usuarioId = $_SESSION['id'];
            $idEtapa = $this->model->getIdEtapa($workflowId, $usuarioId);
            if ($idEtapa) {
                $this->model->atualizarRevisao($idEtapa);
            }
            $this->model->inserirAcaoWorkflow(
                $workflowId,
                $usuarioId,
                'APROVACAO',
                'Workflow aprovado pelo usuário',
                $justificativa
            );
            $todosAprovaram = $this->model->verificarAprovacaoCompleta($workflowId);
            if ($todosAprovaram) {
                $this->model->aprovarWorkflow($workflowId);
                $dt = new DateTime('now', new DateTimeZone('America/Sao_Paulo'));
                $dt->modify('+1 second');
                $dataFinal = $dt->format('Y-m-d H:i:s');
                $this->model->inserirAcaoWorkflow(
                    $workflowId,
                    $usuarioId,
                    'APROVACAO_FINAL',
                    'Workflow aprovado por todos os responsáveis',
                    'Aprovação final concluída',
                    $dataFinal
                );
                $this->envioRespostaSucesso(['message' => 'Workflow aprovado completamente por todos os responsáveis']);
            } else {
                $this->envioRespostaSucesso(['message' => 'Sua aprovação foi registrada. Aguardando outros responsáveis.']);
            }
        } catch (Exception $e) {
            $this->envioRespostaErro(400, "Erro ao aprovar workflow: " . $e->getMessage());
        }
    }

    //Rejeita o workflow por parte do usuários
    public function rejeitarUsuarioWorkflow()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            if (empty($input['workflowId']) || empty($input['justificativa'])) {
                throw new Exception('Dados incompletos para rejeição');
            }
            $workflowId = (int)$input['workflowId'];
            $justificativa = trim($input['justificativa']);
            $resp_atual = $_SESSION['id'];
            $result = $this->model->inserirAcaoWorkflow(
                $workflowId,
                $_SESSION['id'],
                'REPROVACAO',
                'Workflow rejeitado pelo usuário',
                $justificativa,
                null,
                1,
                0,
            );
            if ($result) {
                $this->envioRespostaSucesso(['message' => 'Usuário rejeitou o workflow']);
            } else {
                throw new Exception('Erro ao rejeitar workflow');
            }
        } catch (Exception $e) {
            $this->envioRespostaErro(400, $e->getMessage());
        }
    }

    //Processa anexos enviados no workflow
    private function processarAnexos($arquivos)
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

    public function getChatReprovacao()
    {
        try {
            $etapaId = $_GET['etapaId'] ?? null;
            if (!$etapaId) {
                throw new Exception('ID da etapa não fornecido');
            }
            $mensagens = $this->model->getMensagensChat($etapaId);
            echo json_encode([
                'status' => 'success',
                'data' => $mensagens
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Erro ao carregar chat: ' . $e->getMessage()
            ]);
        }
    }

    //Envio de resposta padrão para sucesso
    private function envioRespostaSucesso($data)
    {
        header('Content-Type: application/json');
        $response = [
            'status' => 'success',
            'data' => $data
        ];
        echo json_encode($response);
        exit;
    }

    //Envio de resposta padrão para erro
    private function envioRespostaErro($code, $message)
    {
        http_response_code($code);
        header('Content-Type: application/json');
        $response = [
            'status' => 'error',
            'message' => $message
        ];
        echo json_encode($response);
        exit;
    }

    private function normalizarPrioridade($prioridade)
    {
        $prioridade = strtoupper(trim((string)$prioridade));

        if ($prioridade === 'MÉDIA' || $prioridade === 'MEDIA') {
            return 'MEDIA';
        }

        return $prioridade;
    }

    public function adicionarResponsavel()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $workflowId = $input['workflowId'];
            $userId = $input['userId'];
            $result = $this->model->adicionarResponsavel($workflowId, $userId);
            if ($result) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Responsável adicionado com sucesso!',
                    'data' => $result
                ]);
            } else {
                throw new Exception('Erro ao adicionar responsável no banco de dados!');
            }
        } catch (Exception $e) {
            echo json_encode([
                'status' => 'error',
                'message' => $e->getMessage()
            ]);
        }
    }

    public function removerResponsavel()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $workflowId = $input['workflowId'];
            $userId = $input['userId'];
            $novoResponsavelId = $input['novoResponsavelId'] ?? null;
            $usuarioId = $_SESSION['id'];
            if (!$novoResponsavelId) {
                throw new Exception('É necessário selecionar um novo responsável para substituir o removido!');
            }
            $result = $this->model->removerResponsavel($workflowId, $userId, $novoResponsavelId);
            if ($result) {
                $todosAprovaram = $this->model->verificarAprovacaoCompleta($workflowId);
                if ($todosAprovaram) {
                    $this->model->aprovarWorkflow($workflowId);
                    $dt = new DateTime('now', new DateTimeZone('America/Sao_Paulo'));
                    $dt->modify('+1 second');
                    $dataFinal = $dt->format('Y-m-d H:i:s');
                    $this->model->inserirAcaoWorkflow(
                        $workflowId,
                        $usuarioId,
                        'APROVACAO_FINAL',
                        'Workflow aprovado por todos os responsáveis após remoção',
                        'Aprovação final concluída automaticamente após remoção de responsável',
                        $dataFinal
                    );
                    echo json_encode([
                        'status' => 'success',
                        'message' => 'Responsável removido e workflow aprovado automaticamente!',
                        'data' => $result,
                        'workflow_aprovado' => true
                    ]);
                } else {
                    echo json_encode([
                        'status' => 'success',
                        'message' => 'Responsável removido e substituído com sucesso!',
                        'data' => $result,
                        'workflow_aprovado' => false
                    ]);
                }
            } else {
                throw new Exception('Erro ao remover responsável no banco de dados!');
            }
        } catch (Exception $e) {
            echo json_encode([
                'status' => 'error',
                'message' => $e->getMessage()
            ]);
        }
    }
}
