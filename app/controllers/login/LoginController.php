<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/controllers/BaseController.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/login/LoginModel.php';

class LoginController extends BaseController
{
    private LoginModel $model;

    public function __construct()
    {
        $this->model = new LoginModel();
    }

    public function processLogin(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->respondJson([
                'success' => false,
                'message' => 'Metodo nao permitido.'
            ], 405);
        }

        $username = trim($_POST['usuario'] ?? '');
        $password = $_POST['password'] ?? '';

        if ($username === '' || $password === '') {
            $this->respondJson([
                'success' => false,
                'message' => 'Por favor, preencha todos os campos.'
            ]);
        }

        if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username)) {
            $this->respondJson([
                'success' => false,
                'message' => 'Usuario invalido. Use apenas letras, numeros e underscore (_).'
            ]);
        }

        $result = $this->model->authenticate($username, $password);
        if (!$result['success']) {
            $this->respondJson($result);
        }

        $this->startUserSession($result['user']);

        $this->respondJson([
            'success' => true,
            'message' => 'Login realizado com sucesso!',
            'redirect' => '/app/views/flow/overview/index.php'
        ]);
    }

    public function logout(): void
    {
        $this->ensureSessionStarted();

        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }

        session_destroy();
        header('Location: /app/views/login/index.php');
        exit;
    }

    private function startUserSession(array $user): void
    {
        $this->ensureSessionStarted();
        session_regenerate_id(true);

        $_SESSION['user'] = [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'username' => $user['username'],
            'logged_in' => true,
            'login_at' => date('Y-m-d H:i:s')
        ];
        $_SESSION['id'] = $user['id'];

        $this->model->updateSessionIdInDatabase((int) $user['id'], session_id());
        session_write_close();
    }
}
