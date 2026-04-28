<?php
session_start();

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/controllers/login/LoginController.php';

$loginController = new LoginController();
$action = $_GET['action'] ?? '';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');

switch ($action) {
    case 'login':
        $loginController->processLogin();
        break;
    case 'logout':
        $loginController->logout();
        break;
    case 'check':
        header('Content-Type: application/json');
        if (!empty($_SESSION['user']['logged_in'])) {
            echo json_encode([
                'success' => true,
                'user' => $_SESSION['user'],
                'message' => 'Usuario ja esta logado'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Nao autenticado'
            ]);
        }
        break;
    default:
        header('Content-Type: application/json');
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Endpoint nao encontrado'
        ]);
        break;
}
