<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/configs/Connection.php';

class LoginModel
{
    private $conn;
    private $table = 'users';

    public function __construct()
    {
        $database = new Connection();
        $this->conn = $database->getConnection();
    }

    public function autenticar($usuario, $senha)
    {
        try {
            $query = "SELECT ID, NOME, EMAIL, USUARIO, SENHA 
                      FROM " . $this->table . " 
                      WHERE USUARIO = :usuario
                      AND STATUS = 1
                      LIMIT 1";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':usuario', $usuario);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                $usuarioData = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($this->verificarSenha($senha, $usuarioData['SENHA'])) {
                    unset($usuarioData['SENHA']);
                    return [
                        'sucesso' => true,
                        'usuario' => [
                            'id' => $usuarioData['ID'],
                            'nome' => $usuarioData['NOME'],
                            'email' => $usuarioData['EMAIL'],
                            'usuario' => $usuarioData['USUARIO'],
                        ]
                    ];
                }
            }
            return [
                'sucesso' => false,
                'mensagem' => 'Usuário ou senha incorretos.'
            ];
        } catch (PDOException $e) {
            return [
                'sucesso' => false,
                'mensagem' => 'Erro no servidor: ' . $e->getMessage()
            ];
        }
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

    public function atualizarSessionIdNoBanco($userId, $sessionId = null)
    {
        try {
            $database = new Connection();
            $conn = $database->getConnection();
            $query = "UPDATE users SET SESSION_ID = :sessionId WHERE ID = :userId";
            $stmt = $conn->prepare($query);
            if ($sessionId === null) {
                $sessionId = session_id();
            }
            $stmt->bindParam(':sessionId', $sessionId);
            $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
            $stmt->execute();
            error_log("DEBUG: User $userId -> Session ID: $sessionId");
            return $stmt->rowCount();
        } catch (PDOException $e) {
            error_log("Erro ao atualizar session_id: " . $e->getMessage());
            throw $e;
        }
    }
}
