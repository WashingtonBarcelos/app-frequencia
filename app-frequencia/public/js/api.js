// Camada de acesso à API. Guarda o token e o nome de quem entrou.

const CHAVE_TOKEN = 'freq_token';
const CHAVE_USER  = 'freq_usuario';

export function salvarSessao(token, responsavel) {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_USER, JSON.stringify(responsavel));
}

export function usuarioAtual() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_USER));
  } catch {
    return null;
  }
}

export function sair() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_USER);
  window.location.href = '/';
}

// Redireciona para o PIN se não houver sessão.
export function exigirSessao() {
  const usuario = usuarioAtual();
  if (!localStorage.getItem(CHAVE_TOKEN) || !usuario) {
    window.location.href = '/';
    return null;
  }
  return usuario;
}

export async function api(rota, opcoes = {}) {
  const token = localStorage.getItem(CHAVE_TOKEN);

  const resposta = await fetch(rota, {
    method: opcoes.metodo || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined
  });

  if (resposta.status === 401) {
    sair();
    throw new Error('Sessão expirada');
  }

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(dados.erro || 'Não foi possível completar a ação.');
  }

  return dados;
}

// Brasil é UTC-3. toISOString() joga o domingo para sábado.
export function hoje() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function dataBonita(valor) {
  if (!valor) return '';
  const [ano, mes, dia] = String(valor).split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
}

// Sugere domingo ou quarta conforme o dia de hoje.
export function tipoSugerido() {
  const dia = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Sao_Paulo', weekday: 'short'
  });
  if (dia === 'Wed') return 'quarta';
  if (dia === 'Sun') return 'domingo';
  return 'outro';
}
