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

    public function processarLogin(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->respondJson([
                'sucesso' => false,
                'mensagem' => 'Metodo nao permitido.'
            ], 405);
        }

        $usuario = trim($_POST['usuario'] ?? '');
        $senha = $_POST['password'] ?? '';

        if ($usuario === '' || $senha === '') {
            $this->respondJson([
                'sucesso' => false,
                'mensagem' => 'Por favor, preencha todos os campos.'
            ]);
        }

        if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $usuario)) {
            $this->respondJson([
                'sucesso' => false,
                'mensagem' => 'Usuario invalido. Use apenas letras, numeros e underscore (_).'
            ]);
        }

        $resultado = $this->model->autenticar($usuario, $senha);

        if (!$resultado['sucesso']) {
            $this->respondJson([
                'sucesso' => false,
                'mensagem' => $resultado['mensagem']
            ]);
        }

        $this->iniciarSessaoUsuario($resultado['usuario']);
        $this->respondJson([
            'sucesso' => true,
            'mensagem' => 'Login realizado com sucesso!',
            'redirect' => '/app/views/workflow/geral/index.php'
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

    private function iniciarSessaoUsuario(array $usuarioData): void
    {
        $this->ensureSessionStarted();
        session_regenerate_id(true);

        $_SESSION['usuario'] = [
            'id' => $usuarioData['id'],
            'nome' => $usuarioData['nome'],
            'email' => $usuarioData['email'],
            'usuario' => $usuarioData['usuario'],
            'logado' => true,
            'data_login' => date('Y-m-d H:i:s')
        ];
        $_SESSION['id'] = $usuarioData['id'];

        $this->model->atualizarSessionIdNoBanco((int) $usuarioData['id'], session_id());
        session_write_close();
    }
}
