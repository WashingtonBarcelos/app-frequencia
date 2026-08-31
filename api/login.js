import bcrypt from 'bcryptjs';
import { sql } from '../lib/db.js';
import { assinarToken } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Lista os responsáveis para a tela de PIN montar o seletor de nome.
    const responsaveis = await sql`
      SELECT id, nome, lider FROM responsaveis WHERE ativo = TRUE ORDER BY nome
    `;
    return res.status(200).json({ responsaveis });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { pin, responsavel_id } = req.body || {};

  if (!pin || !responsavel_id) {
    return res.status(400).json({ erro: 'Informe o PIN e quem você é.' });
  }

  const [config] = await sql`
    SELECT valor FROM configuracoes WHERE chave = 'pin_hash'
  `;

  if (!config) {
    return res.status(500).json({ erro: 'PIN não configurado no banco.' });
  }

  const confere = await bcrypt.compare(String(pin), config.valor);

  if (!confere) {
    return res.status(401).json({ erro: 'PIN incorreto.' });
  }

  const [responsavel] = await sql`
    SELECT id, nome, lider FROM responsaveis
    WHERE id = ${responsavel_id} AND ativo = TRUE
  `;

  if (!responsavel) {
    return res.status(404).json({ erro: 'Responsável não encontrado.' });
  }

  const token = assinarToken({
    id: responsavel.id,
    nome: responsavel.nome,
    lider: responsavel.lider
  });

  return res.status(200).json({ token, responsavel });
}
