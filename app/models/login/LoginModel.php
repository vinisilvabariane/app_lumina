<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/user/UserModel.php';

class LoginModel
{
    private UserModel $userModel;

    public function __construct(?PDO $connection = null)
    {
        $this->userModel = new UserModel($connection);
    }

    public function authenticate(string $username, string $password): array
    {
        try {
            $user = $this->userModel->findActiveByUsername($username);

            if ($user && $this->verifyPassword($password, $user['password_hash'])) {
                return [
                    'success' => true,
                    'user' => [
                        'id' => $user['ID'],
                        'name' => $user['name'],
                        'email' => $user['email'],
                        'username' => $user['username']
                    ]
                ];
            }

            return [
                'success' => false,
                'message' => 'Usuario ou senha incorretos.'
            ];
        } catch (PDOException $exception) {
            return [
                'success' => false,
                'message' => 'Erro no servidor: ' . $exception->getMessage()
            ];
        }
    }

    public function updateSessionIdInDatabase(int $userId, ?string $sessionId = null): int
    {
        return $this->userModel->updateSessionId($userId, $sessionId ?: session_id());
    }

    private function verifyPassword(string $inputPassword, string $storedPassword): bool
    {
        $md5Hash = md5($inputPassword);

        if (hash_equals($storedPassword, $md5Hash)) {
            return true;
        }

        if (password_get_info($storedPassword)['algo'] !== null) {
            return password_verify($inputPassword, $storedPassword);
        }

        return hash_equals($storedPassword, $inputPassword);
    }
}
