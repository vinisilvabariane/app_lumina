<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/login/LoginModel.php';

class LoginController
{
    private $model;

    public function __construct()
    {
        $this->model = new LoginModel();
    }

    public function processarLogin()
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->responderJson([
                'sucesso' => false,
                'mensagem' => 'Método não permitido.'
            ], 405);
            return;
        }

        $usuario = trim($_POST['usuario'] ?? '');
        $senha = $_POST['password'] ?? '';

        if (empty($usuario) || empty($senha)) {
            $this->responderJson([
                'sucesso' => false,
                'mensagem' => 'Por favor, preencha todos os campos.'
            ]);
            return;
        }

        if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $usuario)) {
            $this->responderJson([
                'sucesso' => false,
                'mensagem' => 'Usuário inválido. Use apenas letras, números e underscore (_).'
            ]);
            return;
        }

        $resultado = $this->model->autenticar($usuario, $senha);

        if ($resultado['sucesso']) {
            $this->iniciarSessaoUsuario($resultado['usuario']);
            $this->responderJson([
                'sucesso' => true,
                'mensagem' => 'Login realizado com sucesso!',
                'redirect' => '/app/views/workflow/geral/index.php'
            ]);
        } else {
            $this->responderJson([
                'sucesso' => false,
                'mensagem' => $resultado['mensagem']
            ]);
        }
    }

    private function iniciarSessaoUsuario($usuarioData)
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        session_regenerate_id(true);
        $currentSessionId = session_id();

        $_SESSION['usuario'] = [
            'id' => $usuarioData['id'],
            'nome' => $usuarioData['nome'],
            'email' => $usuarioData['email'],
            'usuario' => $usuarioData['usuario'],
            'logado' => true,
            'data_login' => date('Y-m-d H:i:s')
        ];
        $_SESSION['id'] = $usuarioData['id'];

        $this->model->atualizarSessionIdNoBanco($usuarioData['id'], $currentSessionId);
        session_write_close();
    }

    public function logout()
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params["path"],
                $params["domain"],
                $params["secure"],
                $params["httponly"]
            );
        }

        session_destroy();
        header('Location: /app/views/login/index.php');
        exit;
    }

    private function responderJson($dados, $codigo = 200)
    {
        http_response_code($codigo);
        header('Content-Type: application/json');
        echo json_encode($dados);
        exit;
    }
}
