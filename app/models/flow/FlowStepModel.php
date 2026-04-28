<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/BaseModel.php';

class FlowStepModel extends BaseModel
{
    public function listByFlowId(int $flowId): array
    {
        return $this->fetchAll(
            'SELECT we.id,
                    we.workflow_id AS flow_id,
                    we.descricao AS description,
                    we.tipo_acao AS action_type,
                    we.usuario_id AS user_id,
                    we.data_hora AS created_at,
                    we.justificativa AS justification,
                    we.revisao_dono AS owner_review,
                    we.revisao_usuario AS user_review,
                    u.NOME AS user_name
             FROM workflow_etapas we
             LEFT JOIN users u ON we.usuario_id = u.ID
             WHERE we.workflow_id = :flow_id
             ORDER BY we.data_hora DESC',
            [':flow_id' => $flowId]
        );
    }

    public function addAction(
        int $flowId,
        int $userId,
        string $actionType,
        ?string $description = null,
        ?string $justification = null,
        ?string $createdAt = null,
        int $ownerReview = 0,
        int $userReview = 0,
        ?int $replacementUserId = null
    ): int {
        $query = '
            INSERT INTO workflow_etapas
            (workflow_id, usuario_id, tipo_acao, descricao, justificativa, data_hora, revisao_dono, revisao_usuario, novo_resp)
            VALUES (:flow_id, :user_id, :action_type, :description, :justification, ' . ($createdAt ? ':created_at' : 'NOW()') . ', :owner_review, :user_review, :replacement_user_id)
        ';

        $statement = $this->pdo->prepare($query);
        $params = [
            ':flow_id' => $flowId,
            ':user_id' => $userId,
            ':action_type' => $actionType,
            ':description' => $description,
            ':justification' => $justification,
            ':owner_review' => $ownerReview,
            ':user_review' => $userReview,
            ':replacement_user_id' => $replacementUserId
        ];

        if ($createdAt) {
            $params[':created_at'] = $createdAt;
        }

        $statement->execute($params);

        return (int) $this->pdo->lastInsertId();
    }

    public function hasCompleteApproval(int $flowId, int $totalAssignees): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(DISTINCT usuario_id)
             FROM workflow_etapas
             WHERE workflow_id = :flow_id
             AND tipo_acao = :action_type'
        );
        $stmt->execute([
            ':flow_id' => $flowId,
            ':action_type' => 'APROVACAO'
        ]);

        return ((int) $stmt->fetchColumn()) >= $totalAssignees;
    }

    public function hasUserRejection(int $flowId, int $userId): bool
    {
        $result = $this->fetchOne(
            'SELECT CASE
                        WHEN UPPER(tipo_acao) = \'REPROVACAO\' AND (revisao_dono = 1 OR revisao_usuario = 1) THEN 1
                        ELSE 0
                    END AS has_rejection
             FROM workflow_etapas
             WHERE workflow_id = :flow_id
             AND usuario_id = :user_id
             ORDER BY id DESC
             LIMIT 1',
            [':flow_id' => $flowId, ':user_id' => $userId]
        );

        return isset($result['has_rejection']) && (bool) $result['has_rejection'];
    }

    public function hasUserApproval(int $flowId, int $userId): bool
    {
        $result = $this->fetchOne(
            'SELECT CASE
                        WHEN UPPER(tipo_acao) = \'APROVACAO\' THEN 1
                        ELSE 0
                    END AS has_approval
             FROM workflow_etapas
             WHERE workflow_id = :flow_id
             AND usuario_id = :user_id
             ORDER BY id DESC
             LIMIT 1',
            [':flow_id' => $flowId, ':user_id' => $userId]
        );

        return isset($result['has_approval']) && (bool) $result['has_approval'];
    }

    public function getReviewStatus(int $flowId): array
    {
        $steps = $this->fetchAll(
            'SELECT id,
                    revisao_dono AS owner_review,
                    revisao_usuario AS user_review
             FROM workflow_etapas
             WHERE workflow_id = :flow_id
             AND tipo_acao = :action_type
             AND (revisao_dono = 1 OR revisao_usuario = 1)',
            [':flow_id' => $flowId, ':action_type' => 'REPROVACAO']
        );

        $reviewSteps = array_map(static function (array $step): array {
            return [
                'step_id' => $step['id'],
                'owner_review' => (bool) $step['owner_review'],
                'user_review' => (bool) $step['user_review']
            ];
        }, $steps);

        return [
            'review_steps' => $reviewSteps,
            'total_review_steps' => count($reviewSteps)
        ];
    }

    public function clearReviewsByFlowId(int $flowId): bool
    {
        return $this->executeStatement(
            'UPDATE workflow_etapas
             SET revisao_dono = 0, revisao_usuario = 0
             WHERE workflow_id = :flow_id
             AND (revisao_dono = 1 OR revisao_usuario = 1)',
            [':flow_id' => $flowId]
        );
    }

    public function clearReviewByStepId(int $stepId): bool
    {
        return $this->executeStatement(
            'UPDATE workflow_etapas
             SET revisao_dono = 0, revisao_usuario = 0
             WHERE id = :step_id',
            [':step_id' => $stepId]
        );
    }

    public function findLastStepIdByType(int $flowId, int $userId, string $actionType = 'REPROVACAO'): ?int
    {
        $result = $this->fetchOne(
            'SELECT id
             FROM workflow_etapas
             WHERE workflow_id = :flow_id
             AND usuario_id = :user_id
             AND tipo_acao = :action_type
             ORDER BY id DESC
             LIMIT 1',
            [
                ':flow_id' => $flowId,
                ':user_id' => $userId,
                ':action_type' => $actionType
            ]
        );

        return isset($result['id']) ? (int) $result['id'] : null;
    }

    public function returnOwnerReview(int $flowId, int $stepId, string $justification, int $userId): void
    {
        $this->saveReviewMessage($flowId, $stepId, $userId, $justification);
        $this->updateDirectedReview($flowId, $stepId, $justification, 0, 1);
    }

    public function returnUserReview(int $flowId, int $stepId, string $justification, int $userId): void
    {
        $this->saveReviewMessage($flowId, $stepId, $userId, $justification);
        $this->updateDirectedReview($flowId, $stepId, $justification, 1, 0);
    }

    public function listRejectionChatMessages(int $stepId): array
    {
        return $this->fetchAll(
            'SELECT wc.user AS user_id,
                    wc.justificativa AS justification,
                    wc.data_hora AS created_at,
                    u.USUARIO AS username
             FROM workflow_chat wc
             INNER JOIN users u ON wc.user = u.ID
             WHERE wc.workflow_etapa = :step_id
             ORDER BY wc.id ASC',
            [':step_id' => $stepId]
        );
    }

    private function saveReviewMessage(int $flowId, int $stepId, int $userId, string $justification): void
    {
        $this->pdo->beginTransaction();

        try {
            $this->executeStatement(
                'INSERT INTO workflow_chat (workflow_id, workflow_etapa, user, justificativa)
                 VALUES (:flow_id, :step_id, :user_id, :justification)',
                [
                    ':flow_id' => $flowId,
                    ':step_id' => $stepId,
                    ':user_id' => $userId,
                    ':justification' => $justification
                ]
            );
        } catch (Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    private function updateDirectedReview(
        int $flowId,
        int $stepId,
        string $justification,
        int $ownerReview,
        int $userReview
    ): void {
        try {
            $statement = $this->pdo->prepare(
                'UPDATE workflow_etapas
                 SET revisao_dono = :owner_review,
                     revisao_usuario = :user_review,
                     justificativa = :justification
                 WHERE id = :step_id AND workflow_id = :flow_id'
            );
            $statement->execute([
                ':owner_review' => $ownerReview,
                ':user_review' => $userReview,
                ':justification' => $justification,
                ':step_id' => $stepId,
                ':flow_id' => $flowId
            ]);

            if ($statement->rowCount() === 0) {
                throw new Exception('Step not found or could not be updated.');
            }

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }
    }
}
