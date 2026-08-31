import { sql } from '../lib/db.js';
import { protegido } from '../lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { inicio, fim } = req.query;

  const frequencia = await sql`
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
    LEFT JOIN encontros e ON e.id = p.encontro_id
      AND (${inicio || null}::date IS NULL OR e.data >= ${inicio || null}::date)
      AND (${fim || null}::date    IS NULL OR e.data <= ${fim || null}::date)
    WHERE m.ativo = TRUE
    GROUP BY m.id, m.nome, m.tipo
    ORDER BY percentual DESC NULLS LAST, m.nome
  `;

  const status = await sql`SELECT * FROM vw_faltas_consecutivas ORDER BY faltas_seguidas DESC, nome`;
  const semChamada = await sql`SELECT * FROM vw_encontros_sem_chamada ORDER BY data DESC`;

  const [resumo] = await sql`
    SELECT
      (SELECT COUNT(*) FROM membros WHERE ativo AND tipo = 'membro')    AS total_membros,
      (SELECT COUNT(*) FROM membros WHERE ativo AND tipo = 'visitante') AS total_visitantes,
      (SELECT COUNT(*) FROM encontros)                                  AS total_encontros,
      (SELECT COUNT(*) FROM vw_encontros_sem_chamada)                   AS encontros_sem_chamada
  `;

  const [ultimo] = await sql`
    SELECT
      e.id, e.data, e.tipo, r.nome AS preenchido_por_nome,
      COUNT(*) FILTER (WHERE p.presente) AS presentes,
      COUNT(*) FILTER (WHERE NOT p.presente) AS ausentes
    FROM encontros e
    LEFT JOIN presencas p    ON p.encontro_id = e.id
    LEFT JOIN responsaveis r ON r.id = e.preenchido_por_id
    GROUP BY e.id, r.nome
    ORDER BY e.data DESC, e.id DESC
    LIMIT 1
  `;

  return res.status(200).json({
    resumo,
    ultimo_encontro: ultimo || null,
    frequencia,
    status,
    encontros_sem_chamada: semChamada
  });
}

export default protegido(handler);
