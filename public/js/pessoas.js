import { api, exigirSessao } from './api.js';

exigirSessao();

const lista        = document.getElementById('lista');
const nome         = document.getElementById('nome');
const tipo         = document.getElementById('tipo');
const convidadoEl  = document.getElementById('convidado_por');
const linhaConvite = document.getElementById('linha-convite');
const botao        = document.getElementById('adicionar');
const aviso        = document.getElementById('aviso');
const busca        = document.getElementById('busca');

let membros = [];
let editandoId = null;

function mostrarAviso(texto, tom = 'erro') {
  aviso.textContent = texto;
  aviso.className = `aviso ${tom}`;
  aviso.hidden = !texto;
}

function alternarConvite() {
  linhaConvite.hidden = tipo.value !== 'visitante';
}

function opcoesDeConvite(selecionado) {
  return '<option value="">Ninguém em especial</option>' +
    membros
      .filter((m) => m.tipo === 'membro' && String(m.id) !== String(editandoId))
      .map((m) => `<option value="${m.id}"${String(m.id) === String(selecionado) ? ' selected' : ''}>${m.nome}</option>`)
      .join('');
}

async function carregar() {
  const dados = await api('/api/membros');
  membros = dados.membros;
  convidadoEl.innerHTML = opcoesDeConvite(null);
  desenhar();
}

function desenhar() {
  const termo = (busca.value || '').trim().toLowerCase();
  const visiveis = termo
    ? membros.filter((m) => m.nome.toLowerCase().includes(termo))
    : membros;

  if (!visiveis.length) {
    lista.innerHTML = '<li class="vazio bloco">Ninguém encontrado.</li>';
    return;
  }

  lista.innerHTML = visiveis.map((m) => {
    if (String(m.id) === String(editandoId)) {
      return `
        <li class="pessoa-edicao">
          <div class="campo">
            <label for="edita-nome">Nome</label>
            <input id="edita-nome" type="text" value="${m.nome}">
          </div>
          <div class="campo">
            <label for="edita-tipo">Tipo</label>
            <select id="edita-tipo">
              <option value="membro"${m.tipo === 'membro' ? ' selected' : ''}>Membro</option>
              <option value="visitante"${m.tipo === 'visitante' ? ' selected' : ''}>Visitante</option>
            </select>
          </div>
          <div class="campo" id="edita-linha-convite"${m.tipo === 'visitante' ? '' : ' hidden'}>
            <label for="edita-convidado">Convidado por</label>
            <select id="edita-convidado">${opcoesDeConvite(m.convidado_por_id)}</select>
          </div>
          <div class="acoes-edicao">
            <button class="acao secundaria" type="button" data-cancelar>Cancelar</button>
            <button class="acao" type="button" data-salvar="${m.id}">Salvar</button>
          </div>
        </li>`;
    }

    return `
      <li class="pessoa">
        <span class="pessoa-nome">
          ${m.nome}
          ${m.tipo === 'visitante'
            ? `<span class="detalhe">visitante${m.convidado_por_nome ? ' · por ' + m.convidado_por_nome : ''}</span>`
            : ''}
        </span>
        <button class="mini" type="button" data-editar="${m.id}">Editar</button>
        <button class="mini perigo" type="button" data-remover="${m.id}" aria-label="Remover ${m.nome}">&times;</button>
      </li>`;
  }).join('');
}

lista.addEventListener('change', (evento) => {
  if (evento.target.id === 'edita-tipo') {
    document.getElementById('edita-linha-convite').hidden = evento.target.value !== 'visitante';
  }
});

lista.addEventListener('click', async (evento) => {
  const editar = evento.target.closest('[data-editar]');
  if (editar) {
    editandoId = editar.dataset.editar;
    desenhar();
    return;
  }

  if (evento.target.closest('[data-cancelar]')) {
    editandoId = null;
    desenhar();
    return;
  }

  const salvar = evento.target.closest('[data-salvar]');
  if (salvar) {
    const novoNome = document.getElementById('edita-nome').value.trim();
    const novoTipo = document.getElementById('edita-tipo').value;
    const convite  = document.getElementById('edita-convidado').value;

    if (!novoNome) {
      mostrarAviso('O nome não pode ficar vazio.');
      return;
    }

    try {
      await api('/api/membros', {
        metodo: 'PUT',
        corpo: {
          id: salvar.dataset.salvar,
          nome: novoNome,
          tipo: novoTipo,
          convidado_por_id: novoTipo === 'visitante' ? (convite || null) : null
        }
      });

      mostrarAviso(`${novoNome} atualizado.`, 'ok');
      editandoId = null;
      carregar();
    } catch (e) {
      mostrarAviso(e.message);
    }
    return;
  }

  const remover = evento.target.closest('[data-remover]');
  if (!remover) return;

  const pessoa = membros.find((m) => String(m.id) === String(remover.dataset.remover));
  if (!confirm(`Remover ${pessoa.nome} da lista? O histórico de presenças é mantido.`)) return;

  try {
    await api(`/api/membros?id=${pessoa.id}`, { metodo: 'DELETE' });
    mostrarAviso(`${pessoa.nome} saiu da lista.`, 'ok');
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
        convidado_por_id: tipo.value === 'visitante' ? (convidadoEl.value || null) : null
      }
    });

    mostrarAviso(`${nome.value.trim()} entrou na lista.`, 'ok');
    nome.value = '';
    carregar();
  } catch (e) {
    mostrarAviso(e.message);
  }
});

tipo.addEventListener('change', alternarConvite);
busca.addEventListener('input', desenhar);

alternarConvite();
carregar();
