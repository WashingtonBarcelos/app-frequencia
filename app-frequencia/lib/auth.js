import jwt from 'jsonwebtoken';

const SEGREDO = process.env.JWT_SECRET;
const VALIDADE = '30d';

export function assinarToken(payload) {
  return jwt.sign(payload, SEGREDO, { expiresIn: VALIDADE });
}

// Retorna o payload do token ou null.
export function lerToken(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, SEGREDO);
  } catch {
    return null;
  }
}

// Envolve um handler exigindo token válido.
export function protegido(handler) {
  return async (req, res) => {
    const usuario = lerToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Não autorizado' });
    }
    req.usuario = usuario;
    return handler(req, res);
  };
}
