<?php
require_once($_SERVER["DOCUMENT_ROOT"] . "/app/configs/Connection.php");

class SessionValidator
{
    private Connection $connection;
    private PDO $pdo;

    public function __construct()
    {
        $this->connection = new Connection;
        $this->pdo = $this->connection->getConnection();
    }

    public function startSession()
    {
        if (session_status() === PHP_SESSION_NONE) session_start();
    }

    public function sessionValidate()
    {
        $this->startSession();

        if (
            empty($_SESSION['id']) ||
            empty($_SESSION['usuario']) ||
            empty($_SESSION['usuario']['logado'])
        ) {
            $this->logout();
        }

        $this->sessionIdValidate();
    }

    public function sessionIdValidate()
    {
        $this->startSession();

        try {
            $stmt = $this->pdo->prepare("SELECT
            U.SESSION_ID 'session_id'
            FROM users U
            WHERE U.STATUS = 1 AND U.ID = :idUsuario");
            $stmt->bindParam(':idUsuario', $_SESSION['id'], PDO::PARAM_INT);
            $stmt->execute();
            $sessionID = $stmt->fetchColumn();
        } catch (PDOException $e) {
            return;
        }

        if ($sessionID === false) {
            $this->logout();
        }

        if (empty($sessionID)) {
            $this->atualizarSessionId((int) $_SESSION['id'], session_id());
        }
    }

    private function atualizarSessionId(int $userId, string $sessionId): void
    {
        try {
            $stmt = $this->pdo->prepare("UPDATE users SET SESSION_ID = :sessionId WHERE ID = :userId");
            $stmt->bindParam(':sessionId', $sessionId);
            $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
            $stmt->execute();
        } catch (PDOException $e) {
            return;
        }
    }

    public function logout()
    {
        $this->startSession();

        session_unset();
        session_destroy();
        session_write_close();
        setcookie(session_name(), '', 0, '/');

        if (session_status() === PHP_SESSION_ACTIVE) session_regenerate_id(true);

        header("Cache-Control: no-cache, no-store, must-revalidate");
        header("Pragma: no-cache");
        header("Expires: 0");
        header("location:" . "/app/views/login/index.php");
        exit();
    }
}
