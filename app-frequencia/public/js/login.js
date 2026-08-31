import { api, salvarSessao } from './api.js';

const seletor = document.getElementById('responsavel');
const campoPin = document.getElementById('pin');
const botao = document.getElementById('entrar');
const erro = document.getElementById('erro');

async function carregarResponsaveis() {
  try {
    const { responsaveis } = await api('/api/login');
    seletor.innerHTML = responsaveis
      .map((r) => `<option value="${r.id}">${r.nome}</option>`)
      .join('');

    // Se já entrou antes neste aparelho, deixa o nome pré-selecionado.
    const ultimo = localStorage.getItem('freq_ultimo_responsavel');
    if (ultimo) seletor.value = ultimo;
  } catch {
    erro.textContent = 'Não foi possível carregar a lista. Verifique a conexão.';
  }
}

async function entrar() {
  erro.textContent = '';
  const pin = campoPin.value.trim();

  if (!/^\d{4}$/.test(pin)) {
    erro.textContent = 'O PIN tem 4 dígitos.';
    return;
  }

  botao.disabled = true;
  botao.textContent = 'Entrando';

  try {
    const dados = await api('/api/login', {
      metodo: 'POST',
      corpo: { pin, responsavel_id: seletor.value }
    });

    salvarSessao(dados.token, dados.responsavel);
    localStorage.setItem('freq_ultimo_responsavel', seletor.value);
    window.location.href = '/chamada';
  } catch (e) {
    erro.textContent = e.message;
    campoPin.value = '';
    campoPin.focus();
  } finally {
    botao.disabled = false;
    botao.textContent = 'Entrar';
  }
}

botao.addEventListener('click', entrar);
campoPin.addEventListener('keydown', (e) => { if (e.key === 'Enter') entrar(); });

carregarResponsaveis();
