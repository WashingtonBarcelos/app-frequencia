import { sql } from '../lib/db.js';
import { protegido } from '../lib/auth.js';
import { normalizarData, hojeLocal } from '../lib/datas.js';

async function handler(req, res) {
  if (req.method === 'GET') {
    const { membro_id } = req.query;

    const contatos = membro_id
      ? await sql`
          SELECT c.*, m.nome AS membro_nome, r.nome AS contatado_por_nome
          FROM contatos c
          JOIN membros m       ON m.id = c.membro_id
          LEFT JOIN responsaveis r ON r.id = c.contatado_por_id
          WHERE c.membro_id = ${membro_id}
          ORDER BY c.data DESC, c.id DESC
        `
      : await sql`
          SELECT c.*, m.nome AS membro_nome, r.nome AS contatado_por_nome
          FROM contatos c
          JOIN membros m       ON m.id = c.membro_id
          LEFT JOIN responsaveis r ON r.id = c.contatado_por_id
          ORDER BY c.data DESC, c.id DESC
          LIMIT 100
        `;

    return res.status(200).json({ contatos });
  }

  if (req.method === 'POST') {
    const { membro_id, encontro_id, resposta, data } = req.body || {};

    if (!membro_id) {
      return res.status(400).json({ erro: 'membro_id é obrigatório.' });
    }

    const [contato] = await sql`
      INSERT INTO contatos (membro_id, encontro_id, contatado_por_id, resposta, data)
      VALUES (
        ${membro_id},
        ${encontro_id || null},
        ${req.usuario.id},
        ${resposta || null},
        ${normalizarData(data) || hojeLocal()}
      )
      RETURNING *
    `;

    return res.status(201).json({ contato });
  }

  return res.status(405).json({ erro: 'Método não permitido' });
}

export default protegido(handler);
