<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/BaseModel.php';

class UserModel extends BaseModel
{
    public function carregarUsuariosAtivos(): array
    {
        return $this->fetchAll(
            'SELECT ID, USUARIO, NOME FROM users ORDER BY NOME ASC'
        );
    }

    public function buscarPorId(int $userId): ?array
    {
        return $this->fetchOne(
            'SELECT ID, NOME, EMAIL, USUARIO, STATUS, SESSION_ID FROM users WHERE ID = :id LIMIT 1',
            [':id' => $userId]
        );
    }

    public function buscarLoginPorId(int $userId): ?array
    {
        return $this->fetchOne(
            'SELECT ID, NOME, USUARIO, EMAIL FROM users WHERE ID = :id LIMIT 1',
            [':id' => $userId]
        );
    }

    public function buscarAtivoPorUsuario(string $usuario): ?array
    {
        return $this->fetchOne(
            'SELECT ID, NOME, EMAIL, USUARIO, SENHA
             FROM users
             WHERE USUARIO = :usuario
             AND STATUS = 1
             LIMIT 1',
            [':usuario' => $usuario]
        );
    }

    public function atualizarSessionId(int $userId, string $sessionId): int
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users SET SESSION_ID = :session_id WHERE ID = :user_id'
        );
        $stmt->bindValue(':session_id', $sessionId);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount();
    }

    public function buscarSessionIdAtivo(int $userId): ?string
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
