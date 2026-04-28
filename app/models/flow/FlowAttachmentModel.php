<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/BaseModel.php';

class FlowAttachmentModel extends BaseModel
{
    public function listByFlowId(int $flowId): array
    {
        return $this->fetchAll(
            'SELECT id,
                    nome_original AS file_name,
                    nome_arquivo AS stored_name,
                    caminho AS file_path,
                    tipo AS mime_type,
                    tamanho AS size_bytes,
                    data_upload AS uploaded_at
             FROM workflow_anexos
             WHERE workflow_id = :flow_id
             ORDER BY data_upload DESC',
            [':flow_id' => $flowId]
        );
    }

    public function insertBatch(int $flowId, array $attachments): void
    {
        if ($attachments === []) {
            return;
        }

        $statement = $this->pdo->prepare(
            'INSERT INTO workflow_anexos
            (workflow_id, nome_original, nome_arquivo, caminho, tipo, tamanho)
            VALUES
            (:flow_id, :original_name, :stored_name, :file_path, :mime_type, :size_bytes)'
        );

        foreach ($attachments as $attachment) {
            $statement->execute([
                ':flow_id' => $flowId,
                ':original_name' => $attachment['original_name'],
                ':stored_name' => $attachment['stored_name'],
                ':file_path' => $attachment['file_path'],
                ':mime_type' => $attachment['mime_type'],
                ':size_bytes' => $attachment['size_bytes']
            ]);
        }
    }
}
