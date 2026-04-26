<?php
require_once($_SERVER["DOCUMENT_ROOT"] . "/app/configs/Authenticator.php");
require_once($_SERVER["DOCUMENT_ROOT"] . "/app/controllers/workflow/WorkFlowController.php");

$controller = new WorkFlowController;
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'obterUsuarioIdAtual':
        echo json_encode([
            'success' => true,
            'id' => (int)$_SESSION['id']
        ]);
        break;
    case 'getEtapas':
        $workflowId = $_GET['workflowId'] ?? null;
        if ($workflowId) {
            $controller->getEtapas($workflowId);
        } else {
            echo json_encode(['error' => 'Workflow ID não fornecido']);
        }
        break;
    case 'getWorkFlow':
        $filter = isset($_GET['filter']) ? $_GET['filter'] : 'todos';
        $controller->getWorkFlow($filter);
        break;
    case 'carregarWorkflowPorId':
        $id = $_GET['id'] ?? 0;
        $controller->carregarWorkflowPorId($id);
        break;
    case 'getValidateOwner':
        $id = $_GET['id'] ?? 0;
        $controller->getValidateOwner($id);
        break;
    case 'atualizarStatusWorkflow':
        $controller->atualizarStatusWorkflow($workflowId);
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
    case 'devolverRevisaoDono';
        $controller->devolverRevisaoDono();
        break;
    case 'devolverRevisaoUsuario';
        $controller->devolverRevisaoUsuario();
        break;
    case 'getChatReprovacao';
        $controller->getChatReprovacao();
        break;
    case 'adicionarResponsavel';
        $controller->adicionarResponsavel();
        break;
    case 'removerResponsavel';
        $controller->removerResponsavel();
        break;
    default:
        break;
}
