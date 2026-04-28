<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/configs/Connection.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/configs/Authenticator.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/controllers/BaseController.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/user/UserModel.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/flow/FlowModel.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/flow/FlowResponsibleModel.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/flow/FlowStepModel.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/flow/FlowAttachmentModel.php';

class FlowController extends BaseController
{
    private PDO $pdo;
    private UserModel $userModel;
    private FlowModel $flowModel;
    private FlowResponsibleModel $responsibleModel;
    private FlowStepModel $stepModel;
    private FlowAttachmentModel $attachmentModel;

    public function __construct()
    {
        $this->ensureSessionStarted();
        $this->pdo = (new Connection())->getConnection();
        $this->userModel = new UserModel($this->pdo);
        $this->flowModel = new FlowModel($this->pdo);
        $this->responsibleModel = new FlowResponsibleModel($this->pdo);
        $this->stepModel = new FlowStepModel($this->pdo);
        $this->attachmentModel = new FlowAttachmentModel($this->pdo);
    }

    public function loadUsers(): void
    {
        try {
            $this->respondSuccess($this->userModel->loadActiveUsers());
        } catch (Throwable $exception) {
            $this->respondError('Failed to load users: ' . $exception->getMessage(), 500);
        }
    }

    public function getFlows(string $filter): void
    {
        try {
            $filterMap = ['todos' => 'all', 'meus' => 'mine', 'participando' => 'assigned', 'all' => 'all', 'mine' => 'mine', 'assigned' => 'assigned'];
            $normalizedFilter = $filterMap[$filter] ?? 'all';
            $this->respondSuccess($this->flowModel->listByFilter($normalizedFilter, $this->getSessionUserId()));
        } catch (Throwable $exception) {
            $this->respondError('Failed to load flows: ' . $exception->getMessage(), 500);
        }
    }

    public function getSteps(int $flowId): void
    {
        try {
            $steps = $this->stepModel->listByFlowId($flowId);
            $this->respondJson(['success' => true, 'data' => $steps]);
        } catch (Throwable $exception) {
            $this->respondJson(['success' => false, 'message' => $exception->getMessage()], 500);
        }
    }

    public function validateFlowOwner(int $flowId): void
    {
        try {
            $owner = $this->flowModel->findOwner($flowId);
            if (!$owner) {
                $this->respondError('Flow not found.', 404);
            }

            $this->respondSuccess([
                'is_owner' => (int) $owner['owner_user_id'] === $this->getSessionUserId()
            ]);
        } catch (Throwable $exception) {
            $this->respondError('Failed to validate flow owner: ' . $exception->getMessage(), 500);
        }
    }

    public function checkFlowReview(): void
    {
        try {
            $payload = $this->getJsonInput();
            $flowId = (int) ($payload['flowId'] ?? 0);
            if ($flowId <= 0) {
                throw new Exception('Flow ID is required.');
            }

            $reviewStatus = $this->stepModel->getReviewStatus($flowId);
            $this->respondSuccess($reviewStatus);
        } catch (Throwable $exception) {
            $this->respondError('Failed to load review status: ' . $exception->getMessage(), 400);
        }
    }

    public function checkUserRejection(): void
    {
        try {
            $payload = $this->getJsonInput();
            $flowId = (int) ($payload['flowId'] ?? 0);
            $this->respondSuccess([
                'has_rejection' => (int) $this->stepModel->hasUserRejection($flowId, $this->getSessionUserId())
            ]);
        } catch (Throwable $exception) {
            $this->respondError('Failed to check user rejection: ' . $exception->getMessage(), 400);
        }
    }

    public function checkUserApproval(): void
    {
        try {
            $payload = $this->getJsonInput();
            $flowId = (int) ($payload['flowId'] ?? 0);
            $this->respondSuccess([
                'has_approval' => (int) $this->stepModel->hasUserApproval($flowId, $this->getSessionUserId())
            ]);
        } catch (Throwable $exception) {
            $this->respondError('Failed to check user approval: ' . $exception->getMessage(), 400);
        }
    }

    public function validateAssignee(): void
    {
        try {
            $payload = $this->getJsonInput();
            $flowId = (int) ($payload['flowId'] ?? 0);
            $userId = $this->getSessionUserId();

            $isAssigned = false;
            foreach ($this->responsibleModel->listByFlowId($flowId) as $responsible) {
                if ((int) $responsible['user_id'] === $userId) {
                    $isAssigned = true;
                    break;
                }
            }

            $this->respondSuccess(['is_assignee' => $isAssigned]);
        } catch (Throwable $exception) {
            $this->respondError('Failed to validate assignee: ' . $exception->getMessage(), 500);
        }
    }

    public function loadFlowById(int $flowId): void
    {
        try {
            $flow = $this->flowModel->findById($flowId);
            if (!$flow) {
                $this->respondError('Flow not found.', 404);
            }

            $this->respondSuccess([
                ...$flow,
                'assignees' => $this->responsibleModel->listByFlowId($flowId),
                'attachments' => $this->attachmentModel->listByFlowId($flowId)
            ]);
        } catch (Throwable $exception) {
            $this->respondError('Failed to load flow: ' . $exception->getMessage(), 500);
        }
    }

    public function getFlowStatistics(): void
    {
        try {
            $this->respondSuccess($this->flowModel->getStatistics());
        } catch (Throwable $exception) {
            $this->respondError('Failed to load statistics: ' . $exception->getMessage(), 500);
        }
    }

    public function createFlow(): void
    {
        try {
            $assignees = !empty($_POST['assignees']) ? array_map('intval', explode(',', $_POST['assignees'])) : [];
            $creatorId = $this->getSessionUserId();
            if (!in_array($creatorId, $assignees, true)) {
                $assignees[] = $creatorId;
            }

            $flowData = [
                'title' => trim($_POST['title'] ?? ''),
                'description' => trim($_POST['description'] ?? ''),
                'priority' => $this->normalizePriority($_POST['priority'] ?? ''),
                'category' => $_POST['category'] ?? null,
                'created_by' => $creatorId,
                'deadline' => $_POST['deadline'] ?? null
            ];

            if ($flowData['title'] === '' || $flowData['priority'] === '') {
                throw new Exception('Required fields are missing.');
            }

            $attachments = !empty($_FILES['attachments']) ? $this->processAttachments($_FILES['attachments']) : [];

            $this->pdo->beginTransaction();
            $flowId = $this->flowModel->create($flowData);
            $this->attachAssignees($flowId, $assignees);
            $this->attachmentModel->insertBatch($flowId, $attachments);
            $this->stepModel->addAction($flowId, $creatorId, 'CRIACAO', 'Flow created by user', 'Flow created');
            $this->registerCreatorAutoApproval($flowId, $assignees, $creatorId);
            $this->pdo->commit();

            $this->respondSuccess(['flow_id' => $flowId, 'message' => 'Flow created successfully.']);
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            $this->respondError($exception->getMessage(), 400);
        }
    }

    public function checkApprovedFlow(): void
    {
        try {
            $payload = $this->getJsonInput();
            $flowId = (int) ($payload['flowId'] ?? 0);
            $this->respondSuccess(['is_approved' => $this->flowModel->isApproved($flowId)]);
        } catch (Throwable $exception) {
            $this->respondError('Failed to check approval: ' . $exception->getMessage(), 400);
        }
    }

    public function updateFlow(): void
    {
        try {
            $payload = $this->getJsonInput();
            $payload['title'] = trim((string) ($payload['title'] ?? ''));
            $payload['description'] = trim((string) ($payload['description'] ?? ''));
            $payload['priority'] = $this->normalizePriority((string) ($payload['priority'] ?? ''));

            if (empty($payload['id']) || $payload['title'] === '') {
                throw new Exception('Invalid data for flow update.');
            }

            $this->flowModel->update($payload);
            $this->stepModel->addAction(
                (int) $payload['id'],
                $this->getSessionUserId(),
                'EDICAO',
                'Flow updated',
                'Flow updated by owner'
            );

            $this->respondSuccess(['message' => 'Flow updated successfully.']);
        } catch (Throwable $exception) {
            $this->respondError($exception->getMessage(), 400);
        }
    }

    public function refreshFlowStatus(): void
    {
        try {
            $payload = $this->getJsonInput();
            $flowId = (int) ($payload['flowId'] ?? 0);
            $status = $this->flowModel->getStatus($flowId);

            if ($status === 'REJEITADO') {
                $this->respondJson(['success' => true, 'status' => 'REJECTED', 'flowId' => $flowId]);
            }

            $approved = $this->stepModel->hasCompleteApproval($flowId, $this->responsibleModel->countByFlowId($flowId));
            if ($approved) {
                $this->flowModel->approve($flowId);
                $this->respondJson(['success' => true, 'status' => 'APPROVED', 'flowId' => $flowId]);
            }

            $this->flowModel->setInProgress($flowId);
            $this->respondJson(['success' => true, 'status' => 'IN_PROGRESS', 'flowId' => $flowId]);
        } catch (Throwable $exception) {
            $this->respondError($exception->getMessage(), 400);
        }
    }

    public function rejectFlow(): void
    {
        try {
            $payload = $this->getJsonInput();
            $flowId = (int) ($payload['flowId'] ?? 0);
            $justification = trim((string) ($payload['justification'] ?? ''));

            $this->stepModel->clearReviewsByFlowId($flowId);
            $this->flowModel->reject($flowId);
            $this->stepModel->addAction($flowId, $this->getSessionUserId(), 'APROVACAO_FINAL', 'Flow rejected by owner', $justification);

            $this->respondSuccess(['message' => 'Flow rejected successfully.']);
        } catch (Throwable $exception) {
            $this->respondError('Failed to reject flow: ' . $exception->getMessage(), 500);
        }
    }

    public function returnOwnerReview(): void
    {
        try {
            $payload = $this->getJsonInput();
            $this->stepModel->returnOwnerReview(
                (int) ($payload['flowId'] ?? 0),
                (int) ($payload['stepId'] ?? 0),
                (string) ($payload['justification'] ?? ''),
                $this->getSessionUserId()
            );

            $this->respondSuccess(['message' => 'Review returned successfully.']);
        } catch (Throwable $exception) {
            $this->respondError('Failed to return owner review: ' . $exception->getMessage(), 500);
        }
    }

    public function returnUserReview(): void
    {
        try {
            $payload = $this->getJsonInput();
            $this->stepModel->returnUserReview(
                (int) ($payload['flowId'] ?? 0),
                (int) ($payload['stepId'] ?? 0),
                (string) ($payload['justification'] ?? ''),
                $this->getSessionUserId()
            );

            $this->respondSuccess(['message' => 'Review returned successfully.']);
        } catch (Throwable $exception) {
            $this->respondError('Failed to return user review: ' . $exception->getMessage(), 500);
        }
    }

    public function approveFlowByUser(): void
    {
        try {
            $payload = $this->getJsonInput();
            $flowId = (int) ($payload['flowId'] ?? 0);
            $justification = (string) ($payload['justification'] ?? '');
            $userId = $this->getSessionUserId();

            $lastRejectedStepId = $this->stepModel->findLastStepIdByType($flowId, $userId);
            if ($lastRejectedStepId) {
                $this->stepModel->clearReviewByStepId($lastRejectedStepId);
            }

            $this->stepModel->addAction($flowId, $userId, 'APROVACAO', 'Flow approved by user', $justification);

            if ($this->stepModel->hasCompleteApproval($flowId, $this->responsibleModel->countByFlowId($flowId))) {
                $this->flowModel->approve($flowId);
                $this->stepModel->addAction(
                    $flowId,
                    $userId,
                    'APROVACAO_FINAL',
                    'Flow approved by all assignees',
                    'Final approval completed',
                    $this->getFutureTimestamp()
                );
            }

            $this->respondSuccess(['message' => 'Approval registered successfully.']);
        } catch (Throwable $exception) {
            $this->respondError('Failed to approve flow: ' . $exception->getMessage(), 400);
        }
    }

    public function rejectFlowByUser(): void
    {
        try {
            $payload = $this->getJsonInput();
            $flowId = (int) ($payload['flowId'] ?? 0);
            $justification = trim((string) ($payload['justification'] ?? ''));

            if ($flowId <= 0 || $justification === '') {
                throw new Exception('Flow ID and justification are required.');
            }

            $this->stepModel->addAction(
                $flowId,
                $this->getSessionUserId(),
                'REPROVACAO',
                'Flow rejected by user',
                $justification,
                null,
                1,
                0
            );

            $this->respondSuccess(['message' => 'Rejection registered successfully.']);
        } catch (Throwable $exception) {
            $this->respondError($exception->getMessage(), 400);
        }
    }

    public function getRejectionChat(): void
    {
        try {
            $stepId = (int) ($_GET['stepId'] ?? 0);
            $this->respondSuccess($this->stepModel->listRejectionChatMessages($stepId));
        } catch (Throwable $exception) {
            $this->respondError('Failed to load rejection chat: ' . $exception->getMessage(), 400);
        }
    }

    public function addAssignee(): void
    {
        try {
            $payload = $this->getJsonInput();
            $result = $this->responsibleModel->add((int) ($payload['flowId'] ?? 0), (int) ($payload['userId'] ?? 0));
            $this->respondSuccess($result);
        } catch (Throwable $exception) {
            $this->respondError($exception->getMessage(), 400);
        }
    }

    public function removeAssignee(): void
    {
        try {
            $payload = $this->getJsonInput();
            $flowId = (int) ($payload['flowId'] ?? 0);
            $userId = (int) ($payload['userId'] ?? 0);
            $replacementUserId = (int) ($payload['replacementUserId'] ?? 0);

            $this->responsibleModel->remove($flowId, $userId, $replacementUserId);

            if ($this->stepModel->hasCompleteApproval($flowId, $this->responsibleModel->countByFlowId($flowId))) {
                $this->flowModel->approve($flowId);
                $this->stepModel->addAction(
                    $flowId,
                    $this->getSessionUserId(),
                    'APROVACAO_FINAL',
                    'Flow approved after assignee replacement',
                    'Automatic final approval after assignee replacement',
                    $this->getFutureTimestamp()
                );
            }

            $this->respondSuccess(['message' => 'Assignee replaced successfully.']);
        } catch (Throwable $exception) {
            $this->respondError($exception->getMessage(), 400);
        }
    }

    private function attachAssignees(int $flowId, array $assignees): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO workflow_responsaveis (workflow_id, usuario_id, data_atribuicao)
             VALUES (:flow_id, :user_id, NOW())'
        );

        foreach ($assignees as $userId) {
            $statement->execute([':flow_id' => $flowId, ':user_id' => $userId]);
        }
    }

    private function registerCreatorAutoApproval(int $flowId, array $assignees, int $creatorId): void
    {
        if (!in_array($creatorId, $assignees, true)) {
            return;
        }

        $this->stepModel->addAction(
            $flowId,
            $creatorId,
            'APROVACAO',
            'Automatic creator approval',
            'Approved automatically on flow creation',
            $this->getFutureTimestamp()
        );
    }

    private function processAttachments(array $files): array
    {
        $processedAttachments = [];
        $uploadDirectory = $_SERVER['DOCUMENT_ROOT'] . '/uploads/';

        if (!file_exists($uploadDirectory)) {
            mkdir($uploadDirectory, 0777, true);
        }

        foreach ($files['name'] as $index => $name) {
            if ($files['error'][$index] !== UPLOAD_ERR_OK || $files['size'][$index] > (10 * 1024 * 1024)) {
                continue;
            }

            $extension = pathinfo($name, PATHINFO_EXTENSION);
            $storedName = uniqid() . '.' . $extension;
            $fullPath = $uploadDirectory . $storedName;

            if (move_uploaded_file($files['tmp_name'][$index], $fullPath)) {
                $processedAttachments[] = [
                    'original_name' => $name,
                    'stored_name' => $storedName,
                    'file_path' => '/uploads/' . $storedName,
                    'mime_type' => $files['type'][$index],
                    'size_bytes' => $files['size'][$index]
                ];
            }
        }

        return $processedAttachments;
    }

    private function normalizePriority(string $priority): string
    {
        $priority = strtoupper(trim($priority));
        return $priority === 'MÉDIA' ? 'MEDIA' : $priority;
    }

    private function getFutureTimestamp(): string
    {
        $date = new DateTime('now', new DateTimeZone('America/Sao_Paulo'));
        $date->modify('+1 second');

        return $date->format('Y-m-d H:i:s');
    }
}
