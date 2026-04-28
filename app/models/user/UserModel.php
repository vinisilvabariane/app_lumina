<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/BaseModel.php';

class UserModel extends BaseModel
{
    public function loadActiveUsers(): array
    {
        return $this->fetchAll(
            'SELECT ID, USUARIO AS username, NOME AS name
             FROM users
             ORDER BY NOME ASC'
        );
    }

    public function findById(int $userId): ?array
    {
        return $this->fetchOne(
            'SELECT ID,
                    NOME AS name,
                    EMAIL AS email,
                    USUARIO AS username,
                    STATUS AS status,
                    SESSION_ID AS session_id
             FROM users
             WHERE ID = :id
             LIMIT 1',
            [':id' => $userId]
        );
    }

    public function findLoginById(int $userId): ?array
    {
        return $this->fetchOne(
            'SELECT ID, NOME AS name, USUARIO AS username, EMAIL AS email
             FROM users
             WHERE ID = :id
             LIMIT 1',
            [':id' => $userId]
        );
    }

    public function findActiveByUsername(string $username): ?array
    {
        return $this->fetchOne(
            'SELECT ID,
                    NOME AS name,
                    EMAIL AS email,
                    USUARIO AS username,
                    SENHA AS password_hash
             FROM users
             WHERE USUARIO = :username
             AND STATUS = 1
             LIMIT 1',
            [':username' => $username]
        );
    }

    public function updateSessionId(int $userId, string $sessionId): int
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users
             SET SESSION_ID = :session_id
             WHERE ID = :user_id'
        );
        $stmt->bindValue(':session_id', $sessionId);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount();
    }

    public function findActiveSessionId(int $userId): ?string
    {
        $stmt = $this->pdo->prepare(
            'SELECT SESSION_ID
             FROM users
             WHERE STATUS = 1 AND ID = :user_id'
        );
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->execute();

        $sessionId = $stmt->fetchColumn();

        return $sessionId === false ? null : (string) $sessionId;
    }
}
