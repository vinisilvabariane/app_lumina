<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/BaseModel.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/user/UserModel.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/flow/FlowModel.php';

class FlowResponsibleModel extends BaseModel
{
    private UserModel $userModel;
    private FlowModel $flowModel;

    public function __construct(?PDO $connection = null)
    {
        parent::__construct($connection);
        $this->userModel = new UserModel($this->pdo);
        $this->flowModel = new FlowModel($this->pdo);
    }

    public function listByFlowId(int $flowId): array
    {
        return $this->fetchAll(
            'SELECT wr.workflow_id AS flow_id,
                    wr.usuario_id AS user_id,
                    wr.data_atribuicao AS assigned_at,
                    u.NOME AS name,
                    u.USUARIO AS username,
                    u.EMAIL AS email
             FROM workflow_responsaveis wr
             JOIN users u ON wr.usuario_id = u.ID
             WHERE wr.workflow_id = :flow_id
             ORDER BY wr.data_atribuicao DESC',
            [':flow_id' => $flowId]
        );
    }

    public function add(int $flowId, int $userId): array
    {
        $this->flowModel->assertAssignmentChangesAllowed($flowId);

        if ($this->exists($flowId, $userId)) {
            throw new Exception('Este usuario ja esta atribuido a este flow.');
        }

        $owner = $this->flowModel->findOwner($flowId);
        if ($owner && (int) $owner['owner_user_id'] === $userId) {
            throw new Exception('O criador do flow ja e automaticamente um responsavel.');
        }

        $this->executeStatement(
            'INSERT INTO workflow_responsaveis (workflow_id, usuario_id, data_atribuicao)
             VALUES (:flow_id, :user_id, NOW())',
            [':flow_id' => $flowId, ':user_id' => $userId]
        );

        $user = $this->userModel->findLoginById($userId);

        return [
            'user_id' => $userId,
            'name' => $user['name'] ?? 'User',
            'username' => $user['username'] ?? ''
        ];
    }

    public function remove(int $flowId, int $userId, int $replacementUserId): bool
    {
        $this->flowModel->assertAssignmentChangesAllowed($flowId);

        if (!$this->exists($flowId, $userId)) {
            throw new Exception('Responsavel nao encontrado para este flow.');
        }

        $owner = $this->flowModel->findOwner($flowId);
        if ($owner && (int) $owner['owner_user_id'] === $userId) {
            throw new Exception('Nao e possivel remover o criador do flow.');
        }

        if ($this->hasApproved($flowId, $userId)) {
            throw new Exception('Nao e possivel remover um responsavel que ja aprovou este flow.');
        }

        if ($this->exists($flowId, $replacementUserId)) {
            throw new Exception('O novo responsavel ja esta atribuido ao flow.');
        }

        $this->pdo->beginTransaction();

        try {
            $this->executeStatement(
                'DELETE FROM workflow_responsaveis WHERE workflow_id = :flow_id AND usuario_id = :user_id',
                [':flow_id' => $flowId, ':user_id' => $userId]
            );
            $this->executeStatement(
                'INSERT INTO workflow_responsaveis (workflow_id, usuario_id, data_atribuicao)
                 VALUES (:flow_id, :user_id, NOW())',
                [':flow_id' => $flowId, ':user_id' => $replacementUserId]
            );
            $this->executeStatement(
                'UPDATE workflow_etapas
                 SET revisao_dono = 0, revisao_usuario = 0
                 WHERE workflow_id = :flow_id AND usuario_id = :user_id',
                [':flow_id' => $flowId, ':user_id' => $userId]
            );

            $this->pdo->commit();
            return true;
        } catch (Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function countByFlowId(int $flowId): int
    {
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM workflow_responsaveis WHERE workflow_id = :flow_id');
        $stmt->execute([':flow_id' => $flowId]);

        return (int) $stmt->fetchColumn();
    }

    private function exists(int $flowId, int $userId): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT id FROM workflow_responsaveis WHERE workflow_id = :flow_id AND usuario_id = :user_id'
        );
        $stmt->execute([':flow_id' => $flowId, ':user_id' => $userId]);

        return (bool) $stmt->fetchColumn();
    }

    private function hasApproved(int $flowId, int $userId): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*)
             FROM workflow_etapas
             WHERE workflow_id = :flow_id
             AND usuario_id = :user_id
             AND tipo_acao = :action_type'
        );
        $stmt->execute([
            ':flow_id' => $flowId,
            ':user_id' => $userId,
            ':action_type' => 'APROVACAO'
        ]);

        return ((int) $stmt->fetchColumn()) > 0;
    }
}
