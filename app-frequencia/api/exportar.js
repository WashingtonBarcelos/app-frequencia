import { sql } from '../lib/db.js';
import { protegido } from '../lib/auth.js';

// Devolve a grade completa: uma linha por pessoa, uma coluna por encontro.
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { inicio, fim } = req.query;

  const encontros = await sql`
    SELECT e.id, e.data, e.tipo, r.nome AS preenchido_por_nome
    FROM encontros e
    LEFT JOIN responsaveis r ON r.id = e.preenchido_por_id
    WHERE (${inicio || null}::date IS NULL OR e.data >= ${inicio || null}::date)
      AND (${fim || null}::date    IS NULL OR e.data <= ${fim || null}::date)
    ORDER BY e.data, e.id
  `;

  const pessoas = await sql`
    SELECT id, nome, tipo FROM membros WHERE ativo = TRUE ORDER BY tipo, nome
  `;

  const marcacoes = await sql`
    SELECT p.membro_id, p.encontro_id, p.presente
    FROM presencas p
    JOIN encontros e ON e.id = p.encontro_id
    WHERE (${inicio || null}::date IS NULL OR e.data >= ${inicio || null}::date)
      AND (${fim || null}::date    IS NULL OR e.data <= ${fim || null}::date)
  `;

  const mapa = new Map();
  for (const m of marcacoes) {
    mapa.set(`${m.membro_id}-${m.encontro_id}`, m.presente);
  }

  const linhas = pessoas.map((pessoa) => {
    const celulas = encontros.map((encontro) => {
      const valor = mapa.get(`${pessoa.id}-${encontro.id}`);
      if (valor === undefined) return '';
      return valor ? 'P' : 'F';
    });

    const contados  = celulas.filter((c) => c !== '').length;
    const presencas = celulas.filter((c) => c === 'P').length;

    return {
      nome: pessoa.nome,
      tipo: pessoa.tipo,
      celulas,
      presencas,
      contados,
      percentual: contados ? Math.round((presencas / contados) * 100) : null
    };
  });

  return res.status(200).json({ encontros, linhas });
}

export default protegido(handler);
