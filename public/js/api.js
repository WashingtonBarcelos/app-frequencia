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

// Descobre o encontro mais recente: hoje, se for domingo ou quarta;
// senão, o último que passou. Na segunda-feira você quase sempre está
// lançando a chamada do domingo.
export function encontroSugerido() {
  const agora = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  );

  // 0 = domingo, 3 = quarta
  for (let recuo = 0; recuo < 7; recuo++) {
    const alvo = new Date(agora);
    alvo.setDate(agora.getDate() - recuo);
    const diaSemana = alvo.getDay();

    if (diaSemana === 0 || diaSemana === 3) {
      return {
        data: alvo.toLocaleDateString('en-CA'),
        tipo: diaSemana === 0 ? 'domingo' : 'quarta'
      };
    }
  }

  return { data: hoje(), tipo: 'outro' };
}

/* ---------------------------------------------
   Geração de CSV para Excel e Google Sheets.
   Ponto e vírgula porque o Excel em português usa
   vírgula como separador decimal; o BOM no início
   é o que faz os acentos aparecerem certos.
--------------------------------------------- */

function escaparCelula(valor) {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function baixarCSV(nomeArquivo, linhas) {
  const conteudo = linhas.map((linha) => linha.map(escaparCelula).join(';')).join('\r\n');
  const blob = new Blob(['\uFEFF' + conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
