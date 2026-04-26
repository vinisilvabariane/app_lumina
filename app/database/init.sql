CREATE TABLE IF NOT EXISTS users (
  ID INT NOT NULL AUTO_INCREMENT,
  NOME VARCHAR(200) NOT NULL,
  EMAIL VARCHAR(200) NOT NULL,
  USUARIO VARCHAR(200) NOT NULL,
  SENHA VARCHAR(200) NOT NULL,
  STATUS TINYINT(1) NOT NULL DEFAULT 1,
  SESSION_ID VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (ID),
  UNIQUE KEY uq_users_usuario (USUARIO)
);

CREATE TABLE IF NOT EXISTS workflows (
  id INT NOT NULL AUTO_INCREMENT,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT DEFAULT NULL,
  prioridade ENUM('BAIXA', 'MEDIA', 'ALTA') DEFAULT 'MEDIA',
  categoria VARCHAR(100) DEFAULT NULL,
  criado_por INT NOT NULL,
  data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  data_conclusao DATETIME DEFAULT NULL,
  prazo_final DATETIME DEFAULT NULL,
  status ENUM('EM_ANDAMENTO', 'APROVADO', 'REJEITADO') DEFAULT 'EM_ANDAMENTO',
  PRIMARY KEY (id),
  KEY idx_workflows_criado_por (criado_por),
  CONSTRAINT fk_workflows_criado_por FOREIGN KEY (criado_por) REFERENCES users (ID) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_etapas (
  id INT NOT NULL AUTO_INCREMENT,
  workflow_id INT NOT NULL,
  usuario_id INT NOT NULL,
  tipo_acao VARCHAR(50) NOT NULL,
  descricao TEXT DEFAULT NULL,
  justificativa TEXT DEFAULT NULL,
  data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
  revisao_dono TINYINT(1) DEFAULT 0,
  revisao_usuario TINYINT(1) DEFAULT 0,
  novo_resp INT DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_workflow_etapas_workflow (workflow_id),
  KEY idx_workflow_etapas_usuario (usuario_id),
  KEY idx_workflow_etapas_novo_resp (novo_resp),
  CONSTRAINT fk_workflow_etapas_workflow FOREIGN KEY (workflow_id) REFERENCES workflows (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_workflow_etapas_usuario FOREIGN KEY (usuario_id) REFERENCES users (ID) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_workflow_etapas_novo_resp FOREIGN KEY (novo_resp) REFERENCES users (ID) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_anexos (
  id INT NOT NULL AUTO_INCREMENT,
  workflow_id INT NOT NULL,
  nome_original VARCHAR(255) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  caminho VARCHAR(255) NOT NULL,
  tipo VARCHAR(100) DEFAULT NULL,
  tamanho BIGINT DEFAULT NULL,
  data_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_workflow_anexos_workflow (workflow_id),
  CONSTRAINT fk_workflow_anexos_workflow FOREIGN KEY (workflow_id) REFERENCES workflows (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_responsaveis (
  id INT NOT NULL AUTO_INCREMENT,
  workflow_id INT NOT NULL,
  usuario_id INT NOT NULL,
  data_atribuicao DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_workflow_responsaveis_workflow (workflow_id),
  KEY idx_workflow_responsaveis_usuario (usuario_id),
  CONSTRAINT fk_workflow_responsaveis_workflow FOREIGN KEY (workflow_id) REFERENCES workflows (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_workflow_responsaveis_usuario FOREIGN KEY (usuario_id) REFERENCES users (ID) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_chat (
  id INT NOT NULL AUTO_INCREMENT,
  workflow_id INT NOT NULL,
  workflow_etapa INT NOT NULL,
  user INT NOT NULL,
  justificativa TEXT NOT NULL,
  data_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_workflow_chat_workflow (workflow_id),
  KEY idx_workflow_chat_etapa (workflow_etapa),
  KEY idx_workflow_chat_user (user),
  CONSTRAINT fk_workflow_chat_workflow FOREIGN KEY (workflow_id) REFERENCES workflows (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_workflow_chat_etapa FOREIGN KEY (workflow_etapa) REFERENCES workflow_etapas (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_workflow_chat_user FOREIGN KEY (user) REFERENCES users (ID) ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO users (NOME, EMAIL, USUARIO, SENHA, STATUS)
SELECT 'Administrador', 'admin@lumina.local', 'admin', 'e10adc3949ba59abbe56e057f20f883e', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE USUARIO = 'admin');

INSERT INTO users (NOME, EMAIL, USUARIO, SENHA, STATUS)
SELECT 'Aprovador', 'aprovador@lumina.local', 'aprovador', 'e10adc3949ba59abbe56e057f20f883e', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE USUARIO = 'aprovador');
