<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/user/UserModel.php';

class SessionValidator
{
    private UserModel $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
    }

    public function startSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    public function sessionValidate(): void
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

    public function sessionIdValidate(): void
    {
        $this->startSession();

        try {
            $sessionId = $this->userModel->buscarSessionIdAtivo((int) $_SESSION['id']);
        } catch (PDOException $exception) {
            return;
        }

        if ($sessionId === null) {
            $this->logout();
        }

        if ($sessionId === '') {
            $this->userModel->atualizarSessionId((int) $_SESSION['id'], session_id());
        }
    }

    public function logout(): void
    {
        $this->startSession();

        session_unset();
        session_destroy();
        session_write_close();
        setcookie(session_name(), '', 0, '/');

        if (session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
        }

        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        header('location:/app/views/login/index.php');
        exit;
    }
}
