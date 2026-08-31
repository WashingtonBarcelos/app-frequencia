import { sql } from '../lib/db.js';
import { protegido } from '../lib/auth.js';

async function handler(req, res) {
  if (req.method === 'GET') {
    const { encontro_id } = req.query;
    if (!encontro_id) {
      return res.status(400).json({ erro: 'encontro_id é obrigatório.' });
    }

    const presencas = await sql`
      SELECT
        m.id   AS membro_id,
        m.nome,
        m.tipo,
        COALESCE(p.presente, FALSE) AS presente,
        (p.id IS NOT NULL)          AS marcado
      FROM membros m
      LEFT JOIN presencas p
        ON p.membro_id = m.id AND p.encontro_id = ${encontro_id}
      WHERE m.ativo = TRUE
      ORDER BY m.tipo, m.nome
    `;
    return res.status(200).json({ presencas });
  }

  if (req.method === 'POST') {
    const { encontro_id, presencas } = req.body || {};

    if (!encontro_id || !Array.isArray(presencas)) {
      return res.status(400).json({ erro: 'Envie encontro_id e a lista de presencas.' });
    }

    for (const item of presencas) {
      await sql`
        INSERT INTO presencas (encontro_id, membro_id, presente)
        VALUES (${encontro_id}, ${item.membro_id}, ${!!item.presente})
        ON CONFLICT (encontro_id, membro_id)
        DO UPDATE SET presente = EXCLUDED.presente, registrado_em = NOW()
      `;
    }

    // Quem salvou a chamada fica registrado no encontro.
    await sql`
      UPDATE encontros SET preenchido_por_id = ${req.usuario.id}
      WHERE id = ${encontro_id}
    `;

    return res.status(200).json({ ok: true, salvos: presencas.length });
  }

  return res.status(405).json({ erro: 'Método não permitido' });
}

export default protegido(handler);
