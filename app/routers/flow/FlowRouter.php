<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/configs/Authenticator.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/controllers/flow/FlowController.php';

$controller = new FlowController();
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'getCurrentUserId':
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'id' => (int) ($_SESSION['id'] ?? 0)]);
        break;
    case 'getSteps':
        $controller->getSteps((int) ($_GET['flowId'] ?? 0));
        break;
    case 'getFlows':
        $controller->getFlows($_GET['filter'] ?? 'all');
        break;
    case 'loadFlowById':
        $controller->loadFlowById((int) ($_GET['id'] ?? 0));
        break;
    case 'validateFlowOwner':
        $controller->validateFlowOwner((int) ($_GET['id'] ?? 0));
        break;
    case 'refreshFlowStatus':
        $controller->refreshFlowStatus();
        break;
    case 'loadUsers':
        $controller->loadUsers();
        break;
    case 'getFlowStatistics':
        $controller->getFlowStatistics();
        break;
    case 'checkApprovedFlow':
        $controller->checkApprovedFlow();
        break;
    case 'createFlow':
        $controller->createFlow();
        break;
    case 'updateFlow':
        $controller->updateFlow();
        break;
    case 'approveFlowByUser':
        $controller->approveFlowByUser();
        break;
    case 'rejectFlowByUser':
        $controller->rejectFlowByUser();
        break;
    case 'rejectFlow':
        $controller->rejectFlow();
        break;
    case 'validateAssignee':
        $controller->validateAssignee();
        break;
    case 'checkUserRejection':
        $controller->checkUserRejection();
        break;
    case 'checkUserApproval':
        $controller->checkUserApproval();
        break;
    case 'checkFlowReview':
        $controller->checkFlowReview();
        break;
    case 'returnOwnerReview':
        $controller->returnOwnerReview();
        break;
    case 'returnUserReview':
        $controller->returnUserReview();
        break;
    case 'getRejectionChat':
        $controller->getRejectionChat();
        break;
    case 'addAssignee':
        $controller->addAssignee();
        break;
    case 'removeAssignee':
        $controller->removeAssignee();
        break;
    default:
        header('Content-Type: application/json');
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Endpoint not found']);
        break;
}
