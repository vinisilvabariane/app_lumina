<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/BaseModel.php';

class FlowModel extends BaseModel
{
    public function listByFilter(string $filter, int $userId): array
    {
        $allowedFilters = ['all', 'mine', 'assigned'];
        if (!in_array($filter, $allowedFilters, true)) {
            $filter = 'all';
        }

        $sql = 'SELECT w.id,
                       w.titulo AS title,
                       w.descricao AS description,
                       w.prioridade AS priority,
                       w.categoria AS category,
                       w.status AS status,
                       w.criado_por AS created_by,
                       w.data_criacao AS created_at,
                       w.data_conclusao AS completed_at,
                       w.prazo_final AS deadline
                FROM workflows w';
        $params = [];

        if ($filter === 'mine') {
            $sql .= ' WHERE w.criado_por = :user_id';
            $params[':user_id'] = $userId;
        }

        if ($filter === 'assigned') {
            $sql .= ' JOIN workflow_responsaveis wr ON w.id = wr.workflow_id WHERE wr.usuario_id = :user_id';
            $params[':user_id'] = $userId;
        }

        $sql .= ' ORDER BY w.data_criacao DESC';

        return $this->fetchAll($sql, $params);
    }

    public function findById(int $flowId): ?array
    {
        return $this->fetchOne(
            'SELECT w.id,
                    w.titulo AS title,
                    w.descricao AS description,
                    w.prioridade AS priority,
                    w.categoria AS category,
                    w.status AS status,
                    w.criado_por AS created_by,
                    w.data_criacao AS created_at,
                    w.data_conclusao AS completed_at,
                    w.prazo_final AS deadline,
                    u.NOME AS creator_name,
                    u.EMAIL AS creator_email
             FROM workflows w
             LEFT JOIN users u ON w.criado_por = u.ID
             WHERE w.id = :flow_id',
            [':flow_id' => $flowId]
        );
    }

    public function create(array $data): int
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO workflows
            (titulo, descricao, prioridade, categoria, criado_por, data_criacao, status, prazo_final)
            VALUES
            (:title, :description, :priority, :category, :created_by, NOW(), :status, :deadline)'
        );
        $statement->execute([
            ':title' => $data['title'],
            ':description' => $data['description'],
            ':priority' => $data['priority'],
            ':category' => $data['category'],
            ':created_by' => $data['created_by'],
            ':status' => 'EM_ANDAMENTO',
            ':deadline' => $data['deadline'] ?: null
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function update(array $data): bool
    {
        return $this->executeStatement(
            'UPDATE workflows
             SET titulo = :title,
                 descricao = :description,
                 prioridade = :priority,
                 categoria = :category
             WHERE id = :flow_id',
            [
                ':title' => $data['title'],
                ':description' => $data['description'],
                ':priority' => $data['priority'],
                ':category' => $data['category'],
                ':flow_id' => $data['id']
            ]
        );
    }

    public function getStatus(int $flowId): ?string
    {
        $flow = $this->fetchOne(
            'SELECT status FROM workflows WHERE id = :flow_id LIMIT 1',
            [':flow_id' => $flowId]
        );

        return $flow['status'] ?? null;
    }

    public function isApproved(int $flowId): bool
    {
        return strtoupper((string) $this->getStatus($flowId)) === 'APROVADO';
    }

    public function approve(int $flowId): bool
    {
        return $this->executeStatement(
            'UPDATE workflows
             SET status = :status, data_conclusao = NOW()
             WHERE id = :flow_id',
            [':status' => 'APROVADO', ':flow_id' => $flowId]
        );
    }

    public function reject(int $flowId): bool
    {
        return $this->executeStatement(
            'UPDATE workflows
             SET status = :status, data_conclusao = NOW()
             WHERE id = :flow_id',
            [':status' => 'REJEITADO', ':flow_id' => $flowId]
        );
    }

    public function setInProgress(int $flowId): bool
    {
        return $this->executeStatement(
            'UPDATE workflows
             SET status = :status, data_conclusao = NULL
             WHERE id = :flow_id',
            [':status' => 'EM_ANDAMENTO', ':flow_id' => $flowId]
        );
    }

    public function findOwner(int $flowId): ?array
    {
        return $this->fetchOne(
            'SELECT criado_por AS owner_user_id
             FROM workflows
             WHERE id = :flow_id',
            [':flow_id' => $flowId]
        );
    }

    public function assertAssignmentChangesAllowed(int $flowId): void
    {
        $flow = $this->fetchOne(
            'SELECT status FROM workflows WHERE id = :flow_id',
            [':flow_id' => $flowId]
        );

        if (!$flow) {
            throw new Exception('Flow not found.');
        }

        if (in_array($flow['status'], ['APROVADO', 'REJEITADO'], true)) {
            throw new Exception('Assignments cannot be modified on a finished flow.');
        }
    }

    public function getStatistics(): array
    {
        return [
            'total' => $this->count('SELECT COUNT(*) FROM workflows'),
            'in_progress' => $this->count("SELECT COUNT(*) FROM workflows WHERE status = 'EM_ANDAMENTO'"),
            'approved' => $this->count("SELECT COUNT(*) FROM workflows WHERE status = 'APROVADO'"),
            'rejected' => $this->count("SELECT COUNT(*) FROM workflows WHERE status = 'REJEITADO'")
        ];
    }

    private function count(string $sql): int
    {
        $statement = $this->pdo->query($sql);

        return (int) $statement->fetchColumn();
    }
}
