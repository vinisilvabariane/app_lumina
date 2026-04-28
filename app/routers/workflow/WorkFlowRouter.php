<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/configs/Authenticator.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/controllers/workflow/WorkFlowController.php';

$controller = new WorkFlowController();
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'obterUsuarioIdAtual':
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'id' => (int) ($_SESSION['id'] ?? 0)
        ]);
        break;
    case 'getEtapas':
        $workflowId = $_GET['workflowId'] ?? null;
        if ($workflowId) {
            $controller->getEtapas($workflowId);
            break;
        }

        header('Content-Type: application/json');
        echo json_encode(['error' => 'Workflow ID nao fornecido']);
        break;
    case 'getWorkFlow':
        $controller->getWorkFlow($_GET['filter'] ?? 'todos');
        break;
    case 'carregarWorkflowPorId':
        $controller->carregarWorkflowPorId($_GET['id'] ?? 0);
        break;
    case 'getValidateOwner':
        $controller->getValidateOwner($_GET['id'] ?? 0);
        break;
    case 'atualizarStatusWorkflow':
        $controller->atualizarStatusWorkflow();
        break;
    case 'carregarUsuarios':
        $controller->carregarUsuarios();
        break;
    case 'getEstatisticsWorkFlow':
        $controller->getEstatisticsWorkFlow();
        break;
    case 'verificaAprovado':
        $controller->verificaAprovado();
        break;
    case 'createWorkflow':
        $controller->createWorkflow();
        break;
    case 'atualizarWorkflow':
        $controller->atualizarWorkflow();
        break;
    case 'aprovarPorUsuarioWorkflow':
        $controller->aprovarWorkflow();
        break;
    case 'rejeitarPorUsuarioWorkflow':
        $controller->rejeitarUsuarioWorkflow();
        break;
    case 'rejeitarWorkflow':
        $controller->reprovarWorkflow();
        break;
    case 'validarResponsavel':
        $controller->validarResponsavel();
        break;
    case 'verificaReprovacaoUsuario':
        $controller->verificaReprovacaoUsuario();
        break;
    case 'verificaAprovacaoUsuario':
        $controller->verificaAprovacaoUsuario();
        break;
    case 'verificaRevisaoWorkflow':
        $controller->verificaRevisaoWorkflow();
        break;
    case 'devolverRevisaoDono':
        $controller->devolverRevisaoDono();
        break;
    case 'devolverRevisaoUsuario':
        $controller->devolverRevisaoUsuario();
        break;
    case 'getChatReprovacao':
        $controller->getChatReprovacao();
        break;
    case 'adicionarResponsavel':
        $controller->adicionarResponsavel();
        break;
    case 'removerResponsavel':
        $controller->removerResponsavel();
        break;
    default:
        header('Content-Type: application/json');
        http_response_code(404);
        echo json_encode([
            'status' => 'error',
            'message' => 'Endpoint nao encontrado'
        ]);
        break;
}
