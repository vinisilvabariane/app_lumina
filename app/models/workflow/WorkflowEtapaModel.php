<?php

require_once $_SERVER['DOCUMENT_ROOT'] . '/app/models/BaseModel.php';

class WorkflowEtapaModel extends BaseModel
{
    public function listarPorWorkflowId(int $workflowId): array
    {
        return $this->fetchAll(
            'SELECT we.id,
                    we.workflow_id,
                    we.descricao,
                    we.tipo_acao,
                    we.usuario_id,
                    we.data_hora,
                    we.justificativa,
                    u.NOME AS usuario_nome
             FROM workflow_etapas we
             LEFT JOIN users u ON we.usuario_id = u.ID
             WHERE we.workflow_id = :workflow_id
             ORDER BY we.data_hora DESC',
            [':workflow_id' => $workflowId]
        );
    }

    public function inserirAcao(
        int $workflowId,
        int $usuarioId,
        string $tipoAcao,
        ?string $descricao = null,
        ?string $justificativa = null,
        ?string $dataHora = null,
        int $revisaoDono = 0,
        int $revisaoUsuario = 0,
        ?int $novoResp = null
    ): int {
        $query = '
            INSERT INTO workflow_etapas
            (workflow_id, usuario_id, tipo_acao, descricao, justificativa, data_hora, revisao_dono, revisao_usuario, novo_resp)
            VALUES (:workflow_id, :usuario_id, :tipo_acao, :descricao, :justificativa, ' . ($dataHora ? ':data_hora' : 'NOW()') . ', :revisao_dono, :revisao_usuario, :novo_resp)
        ';

        $stmt = $this->pdo->prepare($query);
        $params = [
            ':workflow_id' => $workflowId,
            ':usuario_id' => $usuarioId,
            ':tipo_acao' => $tipoAcao,
            ':descricao' => $descricao,
            ':justificativa' => $justificativa,
            ':revisao_dono' => $revisaoDono,
            ':revisao_usuario' => $revisaoUsuario,
            ':novo_resp' => $novoResp
        ];

        if ($dataHora) {
            $params[':data_hora'] = $dataHora;
        }

        $stmt->execute($params);

        return (int) $this->pdo->lastInsertId();
    }

    public function verificarAprovacaoCompleta(int $workflowId, int $totalResponsaveis): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(DISTINCT usuario_id)
             FROM workflow_etapas
             WHERE workflow_id = :workflow_id
             AND tipo_acao = :tipo_acao'
        );
        $stmt->execute([
            ':workflow_id' => $workflowId,
            ':tipo_acao' => 'APROVACAO'
        ]);

        return ((int) $stmt->fetchColumn()) >= $totalResponsaveis;
    }

    public function verificarReprovacaoUsuario(int $workflowId, int $userId): bool
    {
        $result = $this->fetchOne(
            'SELECT CASE
                        WHEN UPPER(tipo_acao) = \'REPROVACAO\' AND (revisao_dono = 1 OR revisao_usuario = 1) THEN 1
                        ELSE 0
                    END AS tem_reprovacao
             FROM workflow_etapas
             WHERE workflow_id = :workflow_id
             AND usuario_id = :usuario_id
             ORDER BY id DESC
             LIMIT 1',
            [':workflow_id' => $workflowId, ':usuario_id' => $userId]
        );

        return isset($result['tem_reprovacao']) && (bool) $result['tem_reprovacao'];
    }

    public function verificarAprovacaoUsuario(int $workflowId, int $userId): bool
    {
        $result = $this->fetchOne(
            'SELECT CASE
                        WHEN UPPER(tipo_acao) = \'APROVACAO\' THEN 1
                        ELSE 0
                    END AS tem_aprovacao
             FROM workflow_etapas
             WHERE workflow_id = :workflow_id
             AND usuario_id = :usuario_id
             ORDER BY id DESC
             LIMIT 1',
            [':workflow_id' => $workflowId, ':usuario_id' => $userId]
        );

        return isset($result['tem_aprovacao']) && (bool) $result['tem_aprovacao'];
    }

    public function verificarRevisao(int $workflowId): array
    {
        $etapas = $this->fetchAll(
            'SELECT id, revisao_dono, revisao_usuario
             FROM workflow_etapas
             WHERE workflow_id = :workflow_id
             AND tipo_acao = :tipo_acao
             AND (revisao_dono = 1 OR revisao_usuario = 1)',
            [':workflow_id' => $workflowId, ':tipo_acao' => 'REPROVACAO']
        );

        $etapasEmRevisao = array_map(static function (array $etapa): array {
            return [
                'etapa_id' => $etapa['id'],
                'revisao_dono' => (bool) $etapa['revisao_dono'],
                'revisao_usuario' => (bool) $etapa['revisao_usuario']
            ];
        }, $etapas);

        return [
            'etapas_em_revisao' => $etapasEmRevisao,
            'total_etapas_revisao' => count($etapasEmRevisao)
        ];
    }

    public function desativarRevisoes(int $workflowId): bool
    {
        return $this->executeStatement(
            'UPDATE workflow_etapas
             SET revisao_dono = 0, revisao_usuario = 0
             WHERE workflow_id = :workflow_id
             AND (revisao_dono = 1 OR revisao_usuario = 1)',
            [':workflow_id' => $workflowId]
        );
    }

    public function atualizarRevisao(int $etapaId): bool
    {
        return $this->executeStatement(
            'UPDATE workflow_etapas
             SET revisao_dono = 0, revisao_usuario = 0
             WHERE id = :id',
            [':id' => $etapaId]
        );
    }

    public function buscarUltimaEtapaPorTipo(int $workflowId, int $usuarioId, string $tipoAcao = 'REPROVACAO'): ?int
    {
        $result = $this->fetchOne(
            'SELECT id
             FROM workflow_etapas
             WHERE workflow_id = :workflow_id
             AND usuario_id = :usuario_id
             AND tipo_acao = :tipo_acao
             ORDER BY id DESC
             LIMIT 1',
            [
                ':workflow_id' => $workflowId,
                ':usuario_id' => $usuarioId,
                ':tipo_acao' => $tipoAcao
            ]
        );

        return isset($result['id']) ? (int) $result['id'] : null;
    }

    public function devolverRevisaoDono(int $workflowId, int $etapaId, string $justificativa, int $usuarioId): void
    {
        $this->registrarMensagemRevisao($workflowId, $etapaId, $usuarioId, $justificativa);
        $this->atualizarRevisaoDirecionada($workflowId, $etapaId, $justificativa, 0, 1);
    }

    public function devolverRevisaoUsuario(int $workflowId, int $etapaId, string $justificativa, int $usuarioId): void
    {
        $this->registrarMensagemRevisao($workflowId, $etapaId, $usuarioId, $justificativa);
        $this->atualizarRevisaoDirecionada($workflowId, $etapaId, $justificativa, 1, 0);
    }

    public function listarMensagensChat(int $etapaId): array
    {
        return $this->fetchAll(
            'SELECT wc.*, u.USUARIO AS usuario
             FROM workflow_chat wc
             INNER JOIN users u ON wc.user = u.ID
             WHERE wc.workflow_etapa = :etapa_id
             ORDER BY wc.id ASC',
            [':etapa_id' => $etapaId]
        );
    }

    private function registrarMensagemRevisao(int $workflowId, int $etapaId, int $usuarioId, string $justificativa): void
    {
        $this->pdo->beginTransaction();

        try {
            $this->executeStatement(
                'INSERT INTO workflow_chat (workflow_id, workflow_etapa, user, justificativa)
                 VALUES (:workflow_id, :workflow_etapa, :user_id, :justificativa)',
                [
                    ':workflow_id' => $workflowId,
                    ':workflow_etapa' => $etapaId,
                    ':user_id' => $usuarioId,
                    ':justificativa' => $justificativa
                ]
            );
        } catch (Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    private function atualizarRevisaoDirecionada(
        int $workflowId,
        int $etapaId,
        string $justificativa,
        int $revisaoDono,
        int $revisaoUsuario
    ): void {
        try {
            $stmt = $this->pdo->prepare(
                'UPDATE workflow_etapas
                 SET revisao_dono = :revisao_dono,
                     revisao_usuario = :revisao_usuario,
                     justificativa = :justificativa
                 WHERE id = :etapa_id AND workflow_id = :workflow_id'
            );
            $stmt->execute([
                ':revisao_dono' => $revisaoDono,
                ':revisao_usuario' => $revisaoUsuario,
                ':justificativa' => $justificativa,
                ':etapa_id' => $etapaId,
                ':workflow_id' => $workflowId
            ]);

            if ($stmt->rowCount() === 0) {
                throw new Exception('Etapa nao encontrada ou nao foi possivel atualizar');
            }

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }
    }
}
