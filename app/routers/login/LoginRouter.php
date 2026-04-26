<?php
session_start();

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once($_SERVER["DOCUMENT_ROOT"] . "/app/controllers/login/LoginController.php");

$login = new LoginController();
$action = isset($_GET['action']) ? $_GET['action'] : '';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');

switch ($action) {
    case 'login':
        $login->processarLogin();
        break;
    case 'logout':
        $login->logout();
        break;
    case 'check':
        header('Content-Type: application/json');
        if (isset($_SESSION['usuario']) && isset($_SESSION['usuario']['logado']) && $_SESSION['usuario']['logado'] === true) {
            echo json_encode([
                'sucesso' => true,
                'usuario' => $_SESSION['usuario'],
                'mensagem' => 'Usuário já está logado'
            ]);
        } else {
            echo json_encode([
                'sucesso' => false,
                'mensagem' => 'Não autenticado'
            ]);
        }
        break;
    default:
        header('Content-Type: application/json');
        http_response_code(404);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Endpoint não encontrado'
        ]);
        break;
}
