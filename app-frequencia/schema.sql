-- ============================================
-- App de Frequência — schema v2
-- PostgreSQL (Neon)
-- Revisado após definição de requisitos
-- ============================================

DROP VIEW  IF EXISTS vw_encontros_sem_chamada;
DROP VIEW  IF EXISTS vw_faltas_consecutivas;
DROP VIEW  IF EXISTS vw_frequencia_geral;
DROP TABLE IF EXISTS contatos;
DROP TABLE IF EXISTS presencas;
DROP TABLE IF EXISTS encontros;
DROP TABLE IF EXISTS membros;
DROP TABLE IF EXISTS responsaveis;
DROP TABLE IF EXISTS configuracoes;

-- --------------------------------------------
-- Configurações editáveis sem mexer no código
-- --------------------------------------------
CREATE TABLE configuracoes (
  chave   VARCHAR(60) PRIMARY KEY,
  valor   TEXT NOT NULL
);

INSERT INTO configuracoes (chave, valor) VALUES
  ('pin_hash',        'TROCAR_PELO_HASH_BCRYPT'),
  ('faltas_alerta',   '2'),
  ('faltas_afastado', '4');

-- --------------------------------------------
-- Os quatro que têm acesso
-- --------------------------------------------
CREATE TABLE responsaveis (
  id     SERIAL PRIMARY KEY,
  nome   VARCHAR(80) NOT NULL UNIQUE,
  lider  BOOLEAN NOT NULL DEFAULT FALSE,
  ativo  BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO responsaveis (nome, lider) VALUES
  ('Paulo',      TRUE),
  ('Italo',      FALSE),
  ('Marlon',     FALSE),
  ('Washington', FALSE);

-- --------------------------------------------
-- Pessoas da lista
-- --------------------------------------------
CREATE TABLE membros (
  id               SERIAL PRIMARY KEY,
  nome             VARCHAR(120) NOT NULL,
  tipo             VARCHAR(20) NOT NULL DEFAULT 'membro',
  convidado_por_id INTEGER REFERENCES membros(id) ON DELETE SET NULL,
  telefone         VARCHAR(20),
  ativo            BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_tipo CHECK (tipo IN ('membro', 'visitante'))
);

CREATE INDEX idx_membros_ativo ON membros (ativo);
CREATE INDEX idx_membros_tipo  ON membros (tipo);

-- --------------------------------------------
-- Encontros
-- --------------------------------------------
CREATE TABLE encontros (
  id                SERIAL PRIMARY KEY,
  data              DATE NOT NULL,
  tipo              VARCHAR(30) NOT NULL DEFAULT 'domingo',
  preenchido_por_id INTEGER REFERENCES responsaveis(id) ON DELETE SET NULL,
  observacao        TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_encontro UNIQUE (data, tipo),
  CONSTRAINT chk_tipo_encontro CHECK (tipo IN ('domingo', 'quarta', 'outro'))
);

CREATE INDEX idx_encontros_data ON encontros (data DESC);

-- --------------------------------------------
-- A chamada
-- --------------------------------------------
CREATE TABLE presencas (
  id            SERIAL PRIMARY KEY,
  encontro_id   INTEGER NOT NULL REFERENCES encontros(id) ON DELETE CASCADE,
  membro_id     INTEGER NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
  presente      BOOLEAN NOT NULL DEFAULT FALSE,
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_presenca UNIQUE (encontro_id, membro_id)
);

CREATE INDEX idx_presencas_encontro ON presencas (encontro_id);
CREATE INDEX idx_presencas_membro   ON presencas (membro_id);

-- --------------------------------------------
-- Contato feito com quem faltou
-- --------------------------------------------
CREATE TABLE contatos (
  id               SERIAL PRIMARY KEY,
  membro_id        INTEGER NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
  encontro_id      INTEGER REFERENCES encontros(id) ON DELETE SET NULL,
  contatado_por_id INTEGER REFERENCES responsaveis(id) ON DELETE SET NULL,
  resposta         TEXT,
  data             DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contatos_membro ON contatos (membro_id, data DESC);

-- ============================================
-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW vw_frequencia_geral AS
SELECT
  m.id,
  m.nome,
  m.tipo,
  COUNT(p.id)                        AS total_encontros,
  COUNT(*) FILTER (WHERE p.presente) AS total_presencas,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE p.presente)
    / NULLIF(COUNT(p.id), 0)
  , 1)                               AS percentual
FROM membros m
LEFT JOIN presencas p ON p.membro_id = m.id
WHERE m.ativo = TRUE
GROUP BY m.id, m.nome, m.tipo;

CREATE OR REPLACE VIEW vw_faltas_consecutivas AS
WITH ordenado AS (
  SELECT
    p.membro_id,
    p.presente,
    ROW_NUMBER() OVER (
      PARTITION BY p.membro_id
      ORDER BY e.data DESC, e.id DESC
    ) AS pos
  FROM presencas p
  JOIN encontros e ON e.id = p.encontro_id
),
primeira_presenca AS (
  SELECT membro_id, MIN(pos) AS pos_presenca
  FROM ordenado
  WHERE presente
  GROUP BY membro_id
),
totais AS (
  SELECT membro_id, COUNT(*) AS total
  FROM ordenado
  GROUP BY membro_id
),
calculo AS (
  SELECT
    m.id,
    m.nome,
    m.tipo,
    COALESCE(pp.pos_presenca - 1, t.total, 0) AS faltas_seguidas
  FROM membros m
  LEFT JOIN primeira_presenca pp ON pp.membro_id = m.id
  LEFT JOIN totais t             ON t.membro_id  = m.id
  WHERE m.ativo = TRUE
)
SELECT
  c.id,
  c.nome,
  c.tipo,
  c.faltas_seguidas,
  CASE
    WHEN c.faltas_seguidas >= (
      SELECT valor::INT FROM configuracoes WHERE chave = 'faltas_afastado'
    ) THEN 'afastado'
    WHEN c.faltas_seguidas >= (
      SELECT valor::INT FROM configuracoes WHERE chave = 'faltas_alerta'
    ) THEN 'alerta'
    ELSE 'normal'
  END AS status
FROM calculo c;

CREATE OR REPLACE VIEW vw_encontros_sem_chamada AS
SELECT
  e.id,
  e.data,
  e.tipo,
  e.preenchido_por_id
FROM encontros e
LEFT JOIN presencas p ON p.encontro_id = e.id
GROUP BY e.id, e.data, e.tipo, e.preenchido_por_id
HAVING COUNT(p.id) = 0;

-- ============================================
-- SEED — nomes da lista atual
-- Revise a grafia antes de rodar
-- ============================================

INSERT INTO membros (nome, tipo) VALUES
  ('Marlon',          'membro'),
  ('Cintia',          'membro'),
  ('Washington',      'membro'),
  ('Thamires',        'membro'),
  ('Bia',             'membro'),
  ('Italo',           'membro'),
  ('Matheus',         'membro'),
  ('Clara',           'membro'),
  ('Samela',          'membro'),
  ('Melissa',         'membro'),
  ('Mayara',          'membro'),
  ('Rodrigo',         'membro'),
  ('Carol',           'membro'),
  ('Marcele',         'membro'),
  ('Marcio',          'membro'),
  ('Leandro',         'membro'),
  ('Tielen',          'membro'),
  ('Beatriz Fonseca', 'membro'),
  ('Bluma',           'membro'),
  ('Arthur',          'membro'),
  ('Paulo',           'membro'),
  ('Yasmin',          'membro'),
  ('Vitorugo',        'membro'),
  ('Alan',            'membro'),
  ('A. Carolina',     'membro');

INSERT INTO membros (nome, tipo, convidado_por_id) VALUES
  ('Jonathan',  'visitante', (SELECT id FROM membros WHERE nome = 'Bluma')),
  ('Geovana',   'visitante', (SELECT id FROM membros WHERE nome = 'A. Carolina')),
  ('Marcela',   'visitante', (SELECT id FROM membros WHERE nome = 'Clara')),
  ('Vinicius',  'visitante', (SELECT id FROM membros WHERE nome = 'Clara')),
  ('Maria',     'visitante', NULL),
  ('Ingrid',    'visitante', (SELECT id FROM membros WHERE nome = 'Marcele')),
  ('Julio',     'visitante', NULL),
  ('Lucas',     'visitante', (SELECT id FROM membros WHERE nome = 'Marcele')),
  ('Felipe',    'visitante', (SELECT id FROM membros WHERE nome = 'Paulo')),
  ('Paula',     'visitante', (SELECT id FROM membros WHERE nome = 'Paulo')),
  ('Felipe L',  'visitante', (SELECT id FROM membros WHERE nome = 'Leandro')),
  ('Erick',     'visitante', NULL);
