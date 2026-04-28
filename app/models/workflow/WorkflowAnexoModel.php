<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/BaseModel.php';

class WorkflowAnexoModel extends BaseModel
{
    public function listarPorWorkflowId(int $workflowId): array
    {
        return $this->fetchAll(
            'SELECT id,
                    nome_original AS nome_arquivo,
                    nome_arquivo AS nome_sistema,
                    caminho AS caminho_arquivo,
                    tipo,
                    tamanho,
                    data_upload
             FROM workflow_anexos
             WHERE workflow_id = :workflow_id
             ORDER BY data_upload DESC',
            [':workflow_id' => $workflowId]
        );
    }

    public function inserirLote(int $workflowId, array $anexos): void
    {
        if ($anexos === []) {
            return;
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO workflow_anexos
            (workflow_id, nome_original, nome_arquivo, caminho, tipo, tamanho)
            VALUES
            (:workflow_id, :nome_original, :nome_arquivo, :caminho, :tipo, :tamanho)'
        );

        foreach ($anexos as $anexo) {
            $stmt->execute([
                ':workflow_id' => $workflowId,
                ':nome_original' => $anexo['nome_original'],
                ':nome_arquivo' => $anexo['nome_arquivo'],
                ':caminho' => $anexo['caminho'],
                ':tipo' => $anexo['tipo'],
                ':tamanho' => $anexo['tamanho']
            ]);
        }
    }
}
