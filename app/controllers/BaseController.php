<?php

class BaseController
{
    protected function ensureSessionStarted(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    protected function getJsonInput(): array
    {
        $rawInput = file_get_contents('php://input');
        if ($rawInput === false || $rawInput === '') {
            return [];
        }

        $decoded = json_decode($rawInput, true);

        return is_array($decoded) ? $decoded : [];
    }

    protected function respondJson(array $payload, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($payload);
        exit;
    }

    protected function respondSuccess($data = null, int $statusCode = 200): void
    {
        $payload = ['status' => 'success'];

        if ($data !== null) {
            $payload['data'] = $data;
        }

        $this->respondJson($payload, $statusCode);
    }

    protected function respondError(string $message, int $statusCode = 400): void
    {
        $this->respondJson([
            'status' => 'error',
            'message' => $message
        ], $statusCode);
    }

    protected function getSessionUserId(): int
    {
        $this->ensureSessionStarted();

        if (empty($_SESSION['id'])) {
            throw new RuntimeException('Usuario nao autenticado');
        }

        return (int) $_SESSION['id'];
    }
}
