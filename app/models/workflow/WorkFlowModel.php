<?php
include_once($_SERVER["DOCUMENT_ROOT"] . "/app/configs/Connection.php");

class WorkFlowModel
{
    protected $pdo;
    protected $pdoUsuarios;


    public function __construct()
    {
        $conexaoModel = new Connection;
        $this->pdo = $conexaoModel->getConnection();
        $this->pdoUsuarios = $conexaoModel->getConnection();
    }

    /*
    FUNÇÕES NA BASE DE USUÁRIOS
    */

    // Retorna todos os usuários ativos
    public function carregarUsuarios()
    {
        $stmt = $this->pdoUsuarios->prepare("SELECT ID, USUARIO, NOME FROM users ORDER BY NOME ASC");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /*
    FUNÇÕES NA BASE DE WORKFLOWS
    */

    // Retorna workflow por ID
    public function carregarWorkflowPorId($id)
    {
        $sql = "SELECT w.*, 
                   u.NOME as nome_criador,
                   u.EMAIL as email_criador
            FROM workflows w 
            LEFT JOIN users u ON w.criado_por = u.ID 
            WHERE w.id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Retorna responsáveis por workflow ID
    public function carregarResponsaveisPorWorkflowId($id)
    {
        $sql = "SELECT wr.*, 
            u.NOME as nome_usuario,
            u.USUARIO as usuario_login,
            u.EMAIL as email
        FROM workflow_responsaveis wr 
        JOIN users u ON wr.usuario_id = u.ID 
        WHERE wr.workflow_id = ?
        ORDER BY wr.data_atribuicao DESC;";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Verifica se todos os responsáveis aprovaram
    public function verificarAprovacaoCompleta($workflowId)
    {
        $sqlTotal = "SELECT COUNT(*) as total 
                 FROM workflow_responsaveis 
                 WHERE workflow_id = ?";
        $stmtTotal = $this->pdo->prepare($sqlTotal);
        $stmtTotal->execute([$workflowId]);
        $total = $stmtTotal->fetch(PDO::FETCH_ASSOC)['total'];
        $sqlAprovacoes = "SELECT COUNT(DISTINCT we.usuario_id) as aprovacoes
                      FROM workflow_etapas we
                      WHERE we.workflow_id = ? 
                      AND we.tipo_acao = 'APROVACAO'";
        $stmtAprovacoes = $this->pdo->prepare($sqlAprovacoes);
        $stmtAprovacoes->execute([$workflowId]);
        $aprovacoes = $stmtAprovacoes->fetch(PDO::FETCH_ASSOC)['aprovacoes'];
        return $aprovacoes >= $total;
    }

    // Retorna permissão
    public function getValidateOwner($workflowId): mixed
    {
        $sql = "
        SELECT w.criado_por AS usuario_criador
        FROM workflows w
        WHERE w.id = ?
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$workflowId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Retorna anexos por workflow ID
    public function getAnexosByWorkflowId($id)
    {
        $sql = "SELECT id, 
                   nome_original as nome_arquivo,
                   nome_arquivo as nome_sistema,
                   caminho as caminho_arquivo,
                   tipo,
                   tamanho,
                   data_upload
            FROM workflow_anexos 
            WHERE workflow_id = ?
            ORDER BY data_upload DESC";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Retorna workflows com filtros
    public function getWorkFlow($filter, $userId): array
    {
        try {
            $filtrosPermitidos = ['todos', 'meus', 'participando'];
            if (!in_array($filter, $filtrosPermitidos)) {
                $filter = 'todos';
            }
            $sql = "SELECT w.* FROM workflows w";
            switch ($filter) {
                case 'meus':
                    $sql .= " WHERE w.criado_por = :user_id";
                    break;
                case 'participando':
                    $sql .= " JOIN workflow_responsaveis wr ON w.id = wr.workflow_id 
                WHERE wr.usuario_id = :user_id";
                    break;
                case 'todos':
                default:
                    break;
            }
            $sql .= " ORDER BY w.data_criacao DESC";
            $stmt = $this->pdo->prepare($sql);
            if ($filter !== 'todos') {
                $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
            }
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new PDOException($e->getMessage());
        }
    }

    // Retorna estatísticas dos workflows
    public function getEstatisticsWorkFlow()
    {
        $stmtAtivos = $this->pdo->prepare("
                    SELECT COUNT(*) as total 
                    FROM workflows");
        $stmtAtivos->execute();
        $ativos = $stmtAtivos->fetch(PDO::FETCH_ASSOC)['total'];
        $stmtAndamento = $this->pdo->prepare("
                    SELECT COUNT(*) as total 
                    FROM workflows 
                    WHERE status = 'EM_ANDAMENTO'");
        $stmtAndamento->execute();
        $andamento = $stmtAndamento->fetch(PDO::FETCH_ASSOC)['total'];
        $stmtAprovados = $this->pdo->prepare("
                    SELECT COUNT(*) as total 
                    FROM workflows 
                    WHERE status = 'APROVADO'");
        $stmtAprovados->execute();
        $aprovados = $stmtAprovados->fetch(PDO::FETCH_ASSOC)['total'];
        $stmtRejeitados = $this->pdo->prepare("
                    SELECT COUNT(*) as total 
                    FROM workflows 
                    WHERE status = 'REJEITADO'");
        $stmtRejeitados->execute();
        $rejeitados = $stmtRejeitados->fetch(PDO::FETCH_ASSOC)['total'];
        return [
            'ativos' => $ativos,
            'andamento' => $andamento,
            'aprovados' => $aprovados,
            'rejeitados' => $rejeitados
        ];
    }

    //Cria um novo workflow
    public function criarWorkflow($dados, $anexos = [])
    {
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("
            INSERT INTO workflows 
            (titulo, descricao, prioridade, categoria, criado_por, data_criacao, status, prazo_final) 
            VALUES 
            (:titulo, :descricao, :prioridade, :categoria, :criado_por, NOW(), 'EM_ANDAMENTO', :prazo_final)
        ");
            $stmt->execute([
                ':titulo' => $dados['titulo'],
                ':descricao' => $dados['descricao'],
                ':prioridade' => $dados['prioridade'],
                ':categoria' => $dados['categoria'],
                ':criado_por' => $_SESSION['id'],
                ':prazo_final' => !empty($dados['prazo_final']) ? $dados['prazo_final'] : null
            ]);
            $workflowId = $this->pdo->lastInsertId();
            if (!empty($dados['responsaveis'])) {
                foreach ($dados['responsaveis'] as $responsavelId) {
                    $stmt = $this->pdo->prepare("
                    INSERT INTO workflow_responsaveis 
                    (workflow_id, usuario_id, data_atribuicao) 
                    VALUES 
                    (:workflow_id, :usuario_id, NOW())
                ");
                    $stmt->execute([
                        ':workflow_id' => $workflowId,
                        ':usuario_id' => $responsavelId
                    ]);
                }
            }
            if (!empty($anexos)) {
                foreach ($anexos as $anexo) {
                    $stmt = $this->pdo->prepare("
                    INSERT INTO workflow_anexos 
                    (workflow_id, nome_original, nome_arquivo, caminho, tipo, tamanho) 
                    VALUES 
                    (:workflow_id, :nome_original, :nome_arquivo, :caminho, :tipo, :tamanho)
                ");
                    $stmt->execute([
                        ':workflow_id' => $workflowId,
                        ':nome_original' => $anexo['nome_original'],
                        ':nome_arquivo' => $anexo['nome_arquivo'],
                        ':caminho' => $anexo['caminho'],
                        ':tipo' => $anexo['tipo'],
                        ':tamanho' => $anexo['tamanho']
                    ]);
                }
            }
            $this->pdo->commit();
            return $workflowId;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    // Registra uma ação no workflo
    public function inserirAcaoWorkflow(
        $workflowId,
        $usuarioId,
        $tipoAcao,
        $descricao = null,
        $justificativa = null,
        $dataHora = null,
        $revisao_dono = 0,
        $revisao_usuario = 0,
        $novo_resp = null
    ) {
        try {
            $query = "
            INSERT INTO workflow_etapas 
            (workflow_id, usuario_id, tipo_acao, descricao, justificativa, data_hora, revisao_dono, revisao_usuario, novo_resp)
            VALUES (:workflow_id, :usuario_id, :tipo_acao, :descricao, :justificativa, 
                    " . ($dataHora ? ":data_hora" : "NOW()") . ", 
                    :revisao_dono, :revisao_usuario, :novo_resp)";
            $stmt = $this->pdo->prepare($query);
            $params = [
                ':workflow_id' => $workflowId,
                ':usuario_id' => $usuarioId,
                ':tipo_acao' => $tipoAcao,
                ':descricao' => $descricao,
                ':justificativa' => $justificativa,
                ':revisao_dono' => $revisao_dono,
                ':revisao_usuario' => $revisao_usuario,
                ':novo_resp' => $novo_resp
            ];
            if ($dataHora) {
                $params[':data_hora'] = $dataHora;
            }
            $stmt->execute($params);
            return $this->pdo->lastInsertId();
        } catch (Exception $e) {
            throw new Exception("Erro ao registrar ação do workflow: " . $e->getMessage());
        }
    }

    public function verificaReprovacaoUsuario($workflowId, $userId)
    {
        try {
            $query = "
            SELECT 
                CASE 
                    WHEN UPPER(tipo_acao) = 'REPROVACAO' AND (revisao_dono = 1 OR revisao_usuario = 1) THEN 1
                    ELSE 0 
                END AS tem_reprovacao
            FROM workflow_etapas
            WHERE workflow_id = :workflow_id
            AND usuario_id = :usuario_id
            ORDER BY id DESC
            LIMIT 1";
            $stmt = $this->pdo->prepare($query);
            $stmt->bindParam(':workflow_id', $workflowId, PDO::PARAM_INT);
            $stmt->bindParam(':usuario_id', $userId, PDO::PARAM_INT);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$result) {
                return false;
            }
            return (bool)$result['tem_reprovacao'];
        } catch (PDOException $e) {
            throw new PDOException("Erro ao verificar última reprovação do usuário: " . $e->getMessage());
        }
    }

    public function verificaAprovacaoUsuario($workflowId, $userId)
    {
        try {
            $query = "
            SELECT 
                CASE 
                    WHEN UPPER(tipo_acao) = 'APROVACAO' THEN 1 
                    ELSE 0 
                END AS tem_aprovacao
            FROM workflow_etapas
            WHERE workflow_id = :workflow_id
            AND usuario_id = :usuario_id
            ORDER BY id DESC
            LIMIT 1";
            $stmt = $this->pdo->prepare($query);
            $stmt->bindParam(':workflow_id', $workflowId, PDO::PARAM_INT);
            $stmt->bindParam(':usuario_id', $userId, PDO::PARAM_INT);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$result) {
                return false;
            }
            return (bool)$result['tem_aprovacao'];
        } catch (PDOException $e) {
            throw new PDOException("Erro ao verificar última aprovação do usuário: " . $e->getMessage());
        }
    }

    // Método verificaRevisao
    public function verificaRevisao($workflowId): array
    {
        try {
            $sql = "SELECT 
                id,
                revisao_dono,
                revisao_usuario
            FROM workflow_etapas
            WHERE workflow_id = ? 
            AND tipo_acao = 'REPROVACAO'
            AND (revisao_dono = 1 OR revisao_usuario = 1)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$workflowId]);
            $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $etapasEmRevisao = [];
            foreach ($resultados as $result) {
                $etapasEmRevisao[] = [
                    'etapa_id' => $result['id'],
                    'revisao_dono' => (bool)$result['revisao_dono'],
                    'revisao_usuario' => (bool)$result['revisao_usuario']
                ];
            }
            return [
                'etapas_em_revisao' => $etapasEmRevisao,
                'total_etapas_revisao' => count($etapasEmRevisao)
            ];
        } catch (Exception $e) {
            error_log("Erro em verificaRevisao: " . $e->getMessage());
            return [
                'etapas_em_revisao' => [],
                'total_etapas_revisao' => 0
            ];
        }
    }

    // Retorna etapas do workflow
    public function getEtapas($workflowId)
    {
        $sql = "SELECT 
                we.id,
                we.workflow_id,
                we.descricao,
                we.tipo_acao,
                we.usuario_id,
                we.data_hora,
                we.justificativa,
                u.NOME as usuario_nome
            FROM workflow_etapas we
            LEFT JOIN users u ON we.usuario_id = u.ID
            WHERE we.workflow_id = ?
            ORDER BY we.data_hora DESC";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$workflowId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Retorna status final do workflow true ou false
    public function verificaAprovado($workflowId)
    {
        $query = "SELECT status 
              FROM workflows 
              WHERE id = :id
              LIMIT 1";
        $stmt = $this->pdo->prepare($query);
        $stmt->bindValue(':id', $workflowId, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return ($result && strtoupper($result['status']) === 'APROVADO');
    }

    //Funções de atualização
    public function atualizarWorkflow($dados)
    {
        $sql = "UPDATE workflows 
                SET titulo = :titulo, 
                    descricao = :descricao, 
                    prioridade = :prioridade, 
                    categoria = :categoria 
                WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([
            ':titulo' => $dados['titulo'],
            ':descricao' => $dados['descricao'],
            ':prioridade' => $dados['prioridade'],
            ':categoria' => $dados['categoria'],
            ':id' => $dados['id']
        ]);
    }

    public function desativarRevisoesWorkflow($workflowId)
    {
        $sql = "UPDATE workflow_etapas 
            SET revisao_dono = 0, 
                revisao_usuario = 0 
            WHERE workflow_id = :workflow_id 
            AND (revisao_dono = 1 OR revisao_usuario = 1)";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([':workflow_id' => $workflowId]);
    }

    // Atualiza status do workflow para "APROVADO"
    public function aprovarWorkflow($workflowId)
    {
        $sql = "UPDATE workflows 
                SET status = 'APROVADO', 
                    data_conclusao = NOW() 
                WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([':id' => $workflowId]);
    }

    public function atualizarRevisao($etapaId)
    {
        $sql = "UPDATE workflow_etapas 
            SET revisao_dono = 0, revisao_usuario = 0 
            WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([$etapaId]);
    }

    public function getIdEtapa($workflowId, $usuarioId, $tipoAcao = 'REPROVACAO')
    {
        $sql = "SELECT id FROM workflow_etapas 
            WHERE workflow_id = ? 
            AND usuario_id = ? 
            AND tipo_acao = ? 
            ORDER BY id DESC 
            LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$workflowId, $usuarioId, $tipoAcao]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['id'] : null;
    }

    public function devolverRevisaoDono($workflowId, $etapaId, $justificativa, $usuarioId)
    {
        try {
            $this->pdo->beginTransaction();
            $sqlChat = "INSERT INTO workflow_chat (workflow_id, workflow_etapa, user, justificativa) 
               VALUES (:workflow_id, :workflow_etapa, :user, :justificativa)";
            $stmtChat = $this->pdo->prepare($sqlChat);
            $stmtChat->execute([
                ':workflow_id' => $workflowId,
                ':workflow_etapa' => $etapaId,
                ':user' => $usuarioId,
                ':justificativa' => $justificativa
            ]);
            $sqlEtapa = "UPDATE workflow_etapas 
                SET revisao_dono = 0, 
                    revisao_usuario = 1,
                    justificativa = :justificativa
                WHERE id = :etapa_id AND workflow_id = :workflow_id";
            $stmtEtapa = $this->pdo->prepare($sqlEtapa);
            $stmtEtapa->execute([
                ':justificativa' => $justificativa,
                ':etapa_id' => $etapaId,
                ':workflow_id' => $workflowId
            ]);
            if ($stmtEtapa->rowCount() === 0) {
                throw new Exception('Etapa não encontrada ou não foi possível atualizar');
            }
            $this->pdo->commit();
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception('Erro ao devolver revisao do dono: ' . $e->getMessage());
        }
    }

    public function devolverRevisaoUsuario($workflowId, $etapaId, $justificativa, $usuarioId)
    {
        try {
            $this->pdo->beginTransaction();
            $sqlChat = "INSERT INTO workflow_chat (workflow_id, workflow_etapa, user, justificativa) 
           VALUES (:workflow_id, :workflow_etapa, :user, :justificativa)";
            $stmtChat = $this->pdo->prepare($sqlChat);
            $stmtChat->execute([
                ':workflow_id' => $workflowId,
                ':workflow_etapa' => $etapaId,
                ':user' => $usuarioId,
                ':justificativa' => $justificativa
            ]);
            $sqlEtapa = "UPDATE workflow_etapas 
            SET revisao_dono = 1,
                revisao_usuario = 0,
                justificativa = :justificativa
            WHERE id = :etapa_id AND workflow_id = :workflow_id";
            $stmtEtapa = $this->pdo->prepare($sqlEtapa);
            $stmtEtapa->execute([
                ':justificativa' => $justificativa,
                ':etapa_id' => $etapaId,
                ':workflow_id' => $workflowId
            ]);
            if ($stmtEtapa->rowCount() === 0) {
                throw new Exception('Etapa não encontrada ou não foi possível atualizar');
            }
            $this->pdo->commit();
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception('Erro ao devolver revisao do usuario: ' . $e->getMessage());
        }
    }

    public function rejeitarWorkflow($workflowId, $justificativa)
    {
        $sql = "UPDATE workflows 
            SET status = 'REJEITADO', 
                data_conclusao = NOW() 
            WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([':id' => $workflowId]);
    }

    public function getStatusWorkflow($workflowId)
    {
        $sql = "SELECT status FROM workflows WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $workflowId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['status'] : null;
    }

    public function adicionarResponsavel($workflowId, $userId)
    {
        try {
            $this->validarWorkflowPodeSerModificado($workflowId);
            $sqlVerifica = "SELECT id FROM workflow_responsaveis 
                       WHERE workflow_id = ? AND usuario_id = ?";
            $stmtVerifica = $this->pdo->prepare($sqlVerifica);
            $stmtVerifica->execute([$workflowId, $userId]);
            if ($stmtVerifica->rowCount() > 0) {
                throw new Exception('Este usuário já é responsável por este workflow!');
            }
            $sqlDono = "SELECT criado_por FROM workflows WHERE id = ?";
            $stmtDono = $this->pdo->prepare($sqlDono);
            $stmtDono->execute([$workflowId]);
            $workflow = $stmtDono->fetch(PDO::FETCH_ASSOC);
            if ($workflow && $workflow['criado_por'] == $userId) {
                throw new Exception('O criador do workflow já é automaticamente um responsável!');
            }
            $sql = "INSERT INTO workflow_responsaveis (workflow_id, usuario_id, data_atribuicao) 
                VALUES (?, ?, NOW())";
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute([$workflowId, $userId]);
            if ($result) {
                $sqlUsuario = "SELECT ID, NOME, USUARIO FROM users WHERE id = ?";
                $stmtUsuario = $this->pdoUsuarios->prepare($sqlUsuario);
                $stmtUsuario->execute([$userId]);
                $usuario = $stmtUsuario->fetch(PDO::FETCH_ASSOC);
                return [
                    'usuario_id' => $userId,
                    'nome_usuario' => $usuario['NOME'] ?? 'Usuário',
                    'usuario_login' => $usuario['USUARIO'] ?? ''
                ];
            }
            return false;
        } catch (Exception $e) {
            throw new Exception('Erro ao adicionar responsável: ' . $e->getMessage());
        }
    }

    public function removerResponsavel($workflowId, $userId, $novoResponsavelId)
    {
        try {
            $this->validarWorkflowPodeSerModificado($workflowId);
            $sqlVerifica = "SELECT id FROM workflow_responsaveis 
               WHERE workflow_id = ? AND usuario_id = ?";
            $stmtVerifica = $this->pdo->prepare($sqlVerifica);
            $stmtVerifica->execute([$workflowId, $userId]);
            if ($stmtVerifica->rowCount() === 0) {
                throw new Exception('Responsável não encontrado para este workflow!');
            }
            $sqlDono = "SELECT criado_por FROM workflows WHERE id = ?";
            $stmtDono = $this->pdo->prepare($sqlDono);
            $stmtDono->execute([$workflowId]);
            $workflow = $stmtDono->fetch(PDO::FETCH_ASSOC);
            if ($workflow && $workflow['criado_por'] == $userId) {
                throw new Exception('Não é possível remover o criador do workflow!');
            }
            $sqlAcoes = "SELECT COUNT(*) as total_acoes 
            FROM workflow_etapas 
            WHERE workflow_id = ? 
            AND usuario_id = ? 
            AND tipo_acao IN ('APROVACAO')";
            $stmtAcoes = $this->pdo->prepare($sqlAcoes);
            $stmtAcoes->execute([$workflowId, $userId]);
            $resultAcoes = $stmtAcoes->fetch(PDO::FETCH_ASSOC);
            if ($resultAcoes && $resultAcoes['total_acoes'] > 0) {
                throw new Exception('Não é possível remover um responsável que já realizou ações de aprovação/rejeição!');
            }
            $sqlVerificaNovo = "SELECT id FROM workflow_responsaveis 
                   WHERE workflow_id = ? AND usuario_id = ?";
            $stmtVerificaNovo = $this->pdo->prepare($sqlVerificaNovo);
            $stmtVerificaNovo->execute([$workflowId, $novoResponsavelId]);
            if ($stmtVerificaNovo->rowCount() > 0) {
                throw new Exception('O novo responsável selecionado já está na lista de responsáveis!');
            }
            $this->pdo->beginTransaction();
            try {
                $sqlDelete = "DELETE FROM workflow_responsaveis 
                 WHERE workflow_id = ? AND usuario_id = ?";
                $stmtDelete = $this->pdo->prepare($sqlDelete);
                $stmtDelete->execute([$workflowId, $userId]);
                $sqlInsert = "INSERT INTO workflow_responsaveis (workflow_id, usuario_id, data_atribuicao) 
                 VALUES (?, ?, NOW())";
                $stmtInsert = $this->pdo->prepare($sqlInsert);
                $stmtInsert->execute([$workflowId, $novoResponsavelId]);
                $sqlUpdateEtapas = "UPDATE workflow_etapas 
                           SET revisao_dono = 0, revisao_usuario = 0 
                           WHERE workflow_id = ? AND usuario_id = ?";
                $stmtUpdateEtapas = $this->pdo->prepare($sqlUpdateEtapas);
                $stmtUpdateEtapas->execute([$workflowId, $userId]);
                $sqlUsuarioAntigo = "SELECT USUARIO FROM users WHERE ID = ?";
                $stmtUsuarioAntigo = $this->pdoUsuarios->prepare($sqlUsuarioAntigo);
                $stmtUsuarioAntigo->execute([$userId]);
                $usuarioAntigo = $stmtUsuarioAntigo->fetch(PDO::FETCH_ASSOC);
                $sqlUsuarioNovo = "SELECT USUARIO FROM users WHERE ID = ?";
                $stmtUsuarioNovo = $this->pdoUsuarios->prepare($sqlUsuarioNovo);
                $stmtUsuarioNovo->execute([$novoResponsavelId]);
                $usuarioNovo = $stmtUsuarioNovo->fetch(PDO::FETCH_ASSOC);
                $descricao = "Substituição de responsável: {$usuarioAntigo['USUARIO']} → {$usuarioNovo['USUARIO']}";
                $observacoes = "Responsável substituído mediante solicitação do usuário";
                $this->pdo->commit();
                return true;
            } catch (Exception $e) {
                $this->pdo->rollBack();
                throw new Exception('Erro na transação: ' . $e->getMessage());
            }
        } catch (Exception $e) {
            throw new Exception('Erro ao remover responsável: ' . $e->getMessage());
        }
    }

    private function validarWorkflowPodeSerModificado($workflowId)
    {
        $sql = "SELECT status FROM workflows WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$workflowId]);
        $workflow = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$workflow) {
            throw new Exception('Workflow não encontrado!');
        }
        $status = $workflow['status'];
        if ($status === 'APROVADO' || $status === 'REJEITADO') {
            throw new Exception('Não é possível modificar responsáveis em um workflow ' . strtolower($status) . '!');
        }
    }

    public function getMensagensChat($etapaId)
    {
        try {
            $sql = "SELECT wc.*, u.USUARIO as usuario
                FROM workflow_chat wc 
                INNER JOIN users u ON wc.user = u.ID 
                WHERE wc.workflow_etapa = :etapa_id 
                ORDER BY wc.id ASC";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':etapa_id' => $etapaId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            throw new Exception('Erro ao carregar mensagens do chat: ' . $e->getMessage());
        }
    }

    public function setarEmAndamento($workflowId)
    {
        $sql = "UPDATE workflows 
            SET status = 'EM_ANDAMENTO', 
                data_conclusao = NULL 
            WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([':id' => $workflowId]);
    }

    public function salvarMensagem()
    {
        try {
            $query = "INSERT INTO workflow_etapas";
            $stmt = $this->pdo->prepare($query);
            $stmt->execute();
        } catch (Exception $e) {
            throw new Exception("Erro ao inserir mensagem.");
        }
    }

    public function getWorkflowsPrazoProximo($horas = 24)
    {
        $sql = "SELECT w.*, 
                   u.NOME as nome_criador,
                   u.EMAIL as email_criador
            FROM workflows w
            INNER JOIN users u ON w.criado_por = u.ID
            WHERE w.status NOT IN ('APROVADO', 'REJEITADO')
            AND w.prazo_final IS NOT NULL
            AND w.prazo_final BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? HOUR)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(1, $horas, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getWorkflowsVencidos()
    {
        $sql = "SELECT w.*, 
                   u.NOME as nome_criador,
                   u.EMAIL as email_criador
            FROM workflows w
            INNER JOIN users u ON w.criado_por = u.ID
            WHERE w.status NOT IN ('APROVADO', 'REJEITADO')
            AND w.prazo_final IS NOT NULL
            AND w.prazo_final < NOW()";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
