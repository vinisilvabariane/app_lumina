<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/BaseModel.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/user/UserModel.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/workflow/WorkflowModel.php';

class WorkflowResponsavelModel extends BaseModel
{
    private UserModel $userModel;
    private WorkflowModel $workflowModel;

    public function __construct(?PDO $connection = null)
    {
        parent::__construct($connection);
        $this->userModel = new UserModel($this->pdo);
        $this->workflowModel = new WorkflowModel($this->pdo);
    }

    public function listarPorWorkflowId(int $workflowId): array
    {
        return $this->fetchAll(
            'SELECT wr.*,
                    u.NOME AS nome_usuario,
                    u.USUARIO AS usuario_login,
                    u.EMAIL AS email
             FROM workflow_responsaveis wr
             JOIN users u ON wr.usuario_id = u.ID
             WHERE wr.workflow_id = :workflow_id
             ORDER BY wr.data_atribuicao DESC',
            [':workflow_id' => $workflowId]
        );
    }

    public function adicionar(int $workflowId, int $userId): array
    {
        $this->workflowModel->validarPodeModificarResponsaveis($workflowId);

        if ($this->existeResponsavel($workflowId, $userId)) {
            throw new Exception('Este usuario ja e responsavel por este workflow');
        }

        $owner = $this->workflowModel->buscarDono($workflowId);
        if ($owner && (int) $owner['usuario_criador'] === $userId) {
            throw new Exception('O criador do workflow ja e automaticamente um responsavel');
        }

        $this->executeStatement(
            'INSERT INTO workflow_responsaveis (workflow_id, usuario_id, data_atribuicao)
             VALUES (:workflow_id, :usuario_id, NOW())',
            [':workflow_id' => $workflowId, ':usuario_id' => $userId]
        );

        $usuario = $this->userModel->buscarLoginPorId($userId);

        return [
            'usuario_id' => $userId,
            'nome_usuario' => $usuario['NOME'] ?? 'Usuario',
            'usuario_login' => $usuario['USUARIO'] ?? ''
        ];
    }

    public function remover(int $workflowId, int $userId, int $novoResponsavelId): bool
    {
        $this->workflowModel->validarPodeModificarResponsaveis($workflowId);

        if (!$this->existeResponsavel($workflowId, $userId)) {
            throw new Exception('Responsavel nao encontrado para este workflow');
        }

        $owner = $this->workflowModel->buscarDono($workflowId);
        if ($owner && (int) $owner['usuario_criador'] === $userId) {
            throw new Exception('Nao e possivel remover o criador do workflow');
        }

        if ($this->usuarioJaAprovou($workflowId, $userId)) {
            throw new Exception('Nao e possivel remover um responsavel que ja realizou acoes de aprovacao');
        }

        if ($this->existeResponsavel($workflowId, $novoResponsavelId)) {
            throw new Exception('O novo responsavel selecionado ja esta na lista de responsaveis');
        }

        $this->pdo->beginTransaction();

        try {
            $this->executeStatement(
                'DELETE FROM workflow_responsaveis WHERE workflow_id = :workflow_id AND usuario_id = :usuario_id',
                [':workflow_id' => $workflowId, ':usuario_id' => $userId]
            );

            $this->executeStatement(
                'INSERT INTO workflow_responsaveis (workflow_id, usuario_id, data_atribuicao)
                 VALUES (:workflow_id, :usuario_id, NOW())',
                [':workflow_id' => $workflowId, ':usuario_id' => $novoResponsavelId]
            );

            $this->executeStatement(
                'UPDATE workflow_etapas
                 SET revisao_dono = 0, revisao_usuario = 0
                 WHERE workflow_id = :workflow_id AND usuario_id = :usuario_id',
                [':workflow_id' => $workflowId, ':usuario_id' => $userId]
            );

            $this->pdo->commit();

            return true;
        } catch (Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function totalResponsaveis(int $workflowId): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) FROM workflow_responsaveis WHERE workflow_id = :workflow_id'
        );
        $stmt->execute([':workflow_id' => $workflowId]);

        return (int) $stmt->fetchColumn();
    }

    private function existeResponsavel(int $workflowId, int $userId): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT id FROM workflow_responsaveis WHERE workflow_id = :workflow_id AND usuario_id = :usuario_id'
        );
        $stmt->execute([':workflow_id' => $workflowId, ':usuario_id' => $userId]);

        return (bool) $stmt->fetchColumn();
    }

    private function usuarioJaAprovou(int $workflowId, int $userId): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*)
             FROM workflow_etapas
             WHERE workflow_id = :workflow_id
             AND usuario_id = :usuario_id
             AND tipo_acao = :tipo_acao'
        );
        $stmt->execute([
            ':workflow_id' => $workflowId,
            ':usuario_id' => $userId,
            ':tipo_acao' => 'APROVACAO'
        ]);

        return ((int) $stmt->fetchColumn()) > 0;
    }
}
