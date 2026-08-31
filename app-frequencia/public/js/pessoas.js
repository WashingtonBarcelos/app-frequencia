import { api, exigirSessao } from './api.js';

exigirSessao();

const lista       = document.getElementById('lista');
const nome        = document.getElementById('nome');
const tipo        = document.getElementById('tipo');
const convidadoEl = document.getElementById('convidado_por');
const linhaConvite = document.getElementById('linha-convite');
const botao       = document.getElementById('adicionar');
const aviso       = document.getElementById('aviso');

let membros = [];

function mostrarAviso(texto, ok = false) {
  aviso.textContent = texto;
  aviso.className = ok ? 'aviso ok' : 'aviso';
  aviso.hidden = !texto;
}

function alternarConvite() {
  linhaConvite.hidden = tipo.value !== 'visitante';
}

async function carregar() {
  const dados = await api('/api/membros');
  membros = dados.membros;

  convidadoEl.innerHTML = '<option value="">Ninguém em especial</option>' +
    membros
      .filter((m) => m.tipo === 'membro')
      .map((m) => `<option value="${m.id}">${m.nome}</option>`)
      .join('');

  lista.innerHTML = membros.map((m) => `
    <li class="linha" style="cursor:default">
      <span class="barra"></span>
      <span class="nome">
        ${m.nome}
        ${m.tipo === 'visitante'
          ? `<span class="convidou">visitante${m.convidado_por_nome ? ' &middot; convidado por ' + m.convidado_por_nome : ''}</span>`
          : ''}
      </span>
      <button class="acao secundaria" data-remover="${m.id}" type="button">Remover</button>
    </li>
  `).join('');
}

lista.addEventListener('click', async (evento) => {
  const id = evento.target.dataset?.remover;
  if (!id) return;

  const pessoa = membros.find((m) => String(m.id) === String(id));
  if (!confirm(`Remover ${pessoa.nome} da lista? O histórico de presenças é mantido.`)) return;

  try {
    await api(`/api/membros?id=${id}`, { metodo: 'DELETE' });
    mostrarAviso(`${pessoa.nome} saiu da lista.`, true);
    carregar();
  } catch (e) {
    mostrarAviso(e.message);
  }
});

botao.addEventListener('click', async () => {
  if (!nome.value.trim()) {
    mostrarAviso('Escreva o nome.');
    return;
  }

  try {
    await api('/api/membros', {
      metodo: 'POST',
      corpo: {
        nome: nome.value.trim(),
        tipo: tipo.value,
        convidado_por_id: convidadoEl.value || null
      }
    });

    mostrarAviso(`${nome.value.trim()} entrou na lista.`, true);
    nome.value = '';
    carregar();
  } catch (e) {
    mostrarAviso(e.message);
  }
});

tipo.addEventListener('change', alternarConvite);

alternarConvite();
carregar();
