import { sql } from '../lib/db.js';
import { protegido } from '../lib/auth.js';
import { normalizarData, hojeLocal } from '../lib/datas.js';

async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, tipo } = req.query;

    // Busca de um encontro específico, sem criar nada.
    if (data && tipo) {
      const [encontro] = await sql`
        SELECT e.*, r.nome AS preenchido_por_nome
        FROM encontros e
        LEFT JOIN responsaveis r ON r.id = e.preenchido_por_id
        WHERE e.data = ${normalizarData(data)} AND e.tipo = ${tipo}
      `;
      return res.status(200).json({ encontro: encontro || null });
    }

    const encontros = await sql`
      SELECT
        e.id,
        e.data,
        e.tipo,
        e.observacao,
        e.preenchido_por_id,
        r.nome AS preenchido_por_nome,
        COUNT(p.id)                        AS total_marcados,
        COUNT(*) FILTER (WHERE p.presente) AS total_presentes,
        (COUNT(p.id) = 0)                  AS sem_chamada
      FROM encontros e
      LEFT JOIN responsaveis r ON r.id = e.preenchido_por_id
      LEFT JOIN presencas p    ON p.encontro_id = e.id
      GROUP BY e.id, r.nome
      ORDER BY e.data DESC, e.id DESC
      LIMIT 20
    `;
    return res.status(200).json({ encontros });
  }

  if (req.method === 'POST') {
    const { data, tipo, observacao } = req.body || {};
    const dataFinal = normalizarData(data) || hojeLocal();
    const tipoFinal = ['domingo', 'quarta', 'outro'].includes(tipo) ? tipo : 'domingo';

    const [encontro] = await sql`
      INSERT INTO encontros (data, tipo, observacao)
      VALUES (${dataFinal}, ${tipoFinal}, ${observacao || null})
      ON CONFLICT (data, tipo) DO UPDATE SET observacao = EXCLUDED.observacao
      RETURNING *
    `;
    return res.status(201).json({ encontro });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id || (req.body || {}).id;
    if (!id) return res.status(400).json({ erro: 'ID é obrigatório.' });

    // As presenças somem junto por ON DELETE CASCADE.
    await sql`DELETE FROM encontros WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ erro: 'Método não permitido' });
}

export default protegido(handler);
