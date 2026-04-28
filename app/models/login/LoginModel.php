<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/user/UserModel.php';

class LoginModel
{
    private UserModel $userModel;

    public function __construct(?PDO $connection = null)
    {
        $this->userModel = new UserModel($connection);
    }

    public function autenticar(string $usuario, string $senha): array
    {
        try {
            $usuarioData = $this->userModel->buscarAtivoPorUsuario($usuario);

            if ($usuarioData && $this->verificarSenha($senha, $usuarioData['SENHA'])) {
                unset($usuarioData['SENHA']);

                return [
                    'sucesso' => true,
                    'usuario' => [
                        'id' => $usuarioData['ID'],
                        'nome' => $usuarioData['NOME'],
                        'email' => $usuarioData['EMAIL'],
                        'usuario' => $usuarioData['USUARIO']
                    ]
                ];
            }

            return [
                'sucesso' => false,
                'mensagem' => 'Usuario ou senha incorretos.'
            ];
        } catch (PDOException $exception) {
            return [
                'sucesso' => false,
                'mensagem' => 'Erro no servidor: ' . $exception->getMessage()
            ];
        }
    }

    public function atualizarSessionIdNoBanco(int $userId, ?string $sessionId = null): int
    {
        $sessionId = $sessionId ?: session_id();

        return $this->userModel->atualizarSessionId($userId, $sessionId);
    }

    private function verificarSenha(string $senhaInformada, string $senhaSalva): bool
    {
        $hashMd5 = md5($senhaInformada);

        if (hash_equals($senhaSalva, $hashMd5)) {
            return true;
        }

        if (password_get_info($senhaSalva)['algo'] !== null) {
            return password_verify($senhaInformada, $senhaSalva);
        }

        return hash_equals($senhaSalva, $senhaInformada);
    }
}
