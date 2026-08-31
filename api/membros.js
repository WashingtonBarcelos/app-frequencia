import { sql } from '../lib/db.js';
import { protegido } from '../lib/auth.js';

async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    const membros = await sql`
      SELECT
        m.id,
        m.nome,
        m.tipo,
        m.telefone,
        m.ativo,
        m.convidado_por_id,
        c.nome AS convidado_por_nome
      FROM membros m
      LEFT JOIN membros c ON c.id = m.convidado_por_id
      WHERE m.ativo = TRUE
      ORDER BY m.tipo, m.nome
    `;
    return res.status(200).json({ membros });
  }

  if (method === 'POST') {
    const { nome, tipo, convidado_por_id, telefone } = req.body || {};

    if (!nome || !String(nome).trim()) {
      return res.status(400).json({ erro: 'Nome é obrigatório.' });
    }

    const [membro] = await sql`
      INSERT INTO membros (nome, tipo, convidado_por_id, telefone)
      VALUES (
        ${String(nome).trim()},
        ${tipo === 'visitante' ? 'visitante' : 'membro'},
        ${convidado_por_id || null},
        ${telefone || null}
      )
      RETURNING *
    `;
    return res.status(201).json({ membro });
  }

  if (method === 'PUT') {
    const { id, nome, tipo, convidado_por_id, telefone } = req.body || {};

    if (!id) return res.status(400).json({ erro: 'ID é obrigatório.' });

    const [membro] = await sql`
      UPDATE membros SET
        nome             = COALESCE(${nome || null}, nome),
        tipo             = COALESCE(${tipo || null}, tipo),
        convidado_por_id = ${convidado_por_id ?? null},
        telefone         = ${telefone ?? null}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!membro) return res.status(404).json({ erro: 'Membro não encontrado.' });
    return res.status(200).json({ membro });
  }

  if (method === 'DELETE') {
    const id = req.query.id || (req.body || {}).id;
    if (!id) return res.status(400).json({ erro: 'ID é obrigatório.' });

    // Desativa em vez de apagar: o histórico de presenças continua válido.
    await sql`UPDATE membros SET ativo = FALSE WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ erro: 'Método não permitido' });
}

export default protegido(handler);
