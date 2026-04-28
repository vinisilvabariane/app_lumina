<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/configs/Connection.php';

abstract class BaseModel
{
    protected PDO $pdo;

    public function __construct(?PDO $connection = null)
    {
        $this->pdo = $connection ?: (new Connection())->getConnection();
    }

    protected function fetchAll(string $sql, array $params = []): array
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    protected function fetchOne(string $sql, array $params = []): ?array
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    protected function executeStatement(string $sql, array $params = []): bool
    {
        $stmt = $this->pdo->prepare($sql);

        return $stmt->execute($params);
    }
}
