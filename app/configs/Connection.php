<?php
class Connection
{
    private string $host;
    private string $port;
    private string $username;
    private string $password;
    private string $dbname;
    private ?PDO $conn;

    public function __construct()
    {
        $this->host = getenv('DB_HOST') ?: 'db';
        $this->port = getenv('DB_PORT') ?: '3306';
        $this->username = getenv('DB_USERNAME') ?: 'lumina';
        $this->password = getenv('DB_PASSWORD') ?: 'lumina123';
        $this->dbname = getenv('DB_DATABASE') ?: 'lumina';
        $this->conn = null;
    }

    public function getConnection()
    {
        $this->conn = null;

        try {
            $this->conn = $this->createPdo($this->username, $this->password);
        } catch (PDOException $exception) {
            try {
                $this->conn = $this->createPdo('root', 'root123');
            } catch (PDOException $fallbackException) {
                die("Erro de conexao: " . $fallbackException->getMessage());
            }
        }

        return $this->conn;
    }

    private function createPdo(string $username, string $password): PDO
    {
        $pdo = new PDO(
            "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->dbname . ";charset=utf8mb4",
            $username,
            $password
        );
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        return $pdo;
    }
}
