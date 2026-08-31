import { api, exigirSessao, encontroSugerido, dataBonita } from './api.js';

const usuario = exigirSessao();

const campoData   = document.getElementById('data');
const campoTipo   = document.getElementById('tipo');
const abaMembros  = document.getElementById('aba-membros');
const abaVisitas  = document.getElementById('aba-visitantes');
const lista       = document.getElementById('lista');
const contador    = document.getElementById('contador');
const botaoSalvar = document.getElementById('salvar');
const botaoLimpar = document.getElementById('limpar');
const aviso       = document.getElementById('aviso');
const nomeUsuario = document.getElementById('usuario');
const recentesEl  = document.getElementById('recentes');

let pessoas = [];
let abaAtiva = 'membro';
let encontroId = null;

nomeUsuario.textContent = usuario.nome;
const sugestao = encontroSugerido();
campoData.value = sugestao.data;
campoTipo.value = sugestao.tipo;

function mostrarAviso(texto, tom = 'erro') {
  aviso.textContent = texto;
  aviso.className = `aviso ${tom}`;
  aviso.hidden = !texto;
}

// Carrega o encontro da data escolhida. Não cria nada:
// o encontro só nasce quando a chamada é salva.
async function carregar() {
  mostrarAviso('');
  lista.innerHTML = '<li class="vazio bloco">Carregando…</li>';
  encontroId = null;

  try {
    const busca = new URLSearchParams({ data: campoData.value, tipo: campoTipo.value });
    const { encontro } = await api(`/api/encontros?${busca}`);

    if (encontro) {
      encontroId = encontro.id;
      const { presencas } = await api(`/api/presencas?encontro_id=${encontroId}`);
      pessoas = presencas.map((p) => ({ ...p, presente: !!p.presente }));

      if (presencas.some((p) => p.marcado)) {
        mostrarAviso(
          `Chamada já registrada por ${encontro.preenchido_por_nome || 'alguém'}. ` +
          `Você pode corrigir e salvar de novo.`, 'info'
        );
      }
    } else {
      // Encontro novo: todo mundo ausente.
      const { membros } = await api('/api/membros');
      pessoas = membros.map((m) => ({
        membro_id: m.id, nome: m.nome, tipo: m.tipo, presente: false
      }));
    }

    desenhar();
  } catch (e) {
    lista.innerHTML = '';
    mostrarAviso(e.message);
  }
}

function desenhar() {
  const visiveis = pessoas.filter((p) => p.tipo === abaAtiva);

  abaMembros.textContent = `Membros (${pessoas.filter((p) => p.tipo === 'membro').length})`;
  abaVisitas.textContent = `Visitantes (${pessoas.filter((p) => p.tipo === 'visitante').length})`;

  lista.innerHTML = visiveis.length
    ? visiveis.map((p) => `
        <li>
          <button class="linha" type="button" data-id="${p.membro_id}" aria-pressed="${p.presente}">
            <span class="barra"></span>
            <span class="nome">${p.nome}</span>
            <span class="marca" aria-hidden="true">&#10003;</span>
          </button>
        </li>
      `).join('')
    : '<li class="vazio bloco">Ninguém nesta aba ainda.</li>';

  atualizarContador();
}

function atualizarContador() {
  const presentes = pessoas.filter((p) => p.presente).length;
  contador.innerHTML = `<b>${presentes}</b> de ${pessoas.length} presentes`;
}

lista.addEventListener('click', (evento) => {
  const botao = evento.target.closest('.linha');
  if (!botao) return;

  const pessoa = pessoas.find((p) => String(p.membro_id) === String(botao.dataset.id));
  if (!pessoa) return;

  pessoa.presente = !pessoa.presente;
  botao.setAttribute('aria-pressed', String(pessoa.presente));
  atualizarContador();
});

function trocarAba(tipo) {
  abaAtiva = tipo;
  abaMembros.classList.toggle('ativa', tipo === 'membro');
  abaVisitas.classList.toggle('ativa', tipo === 'visitante');
  desenhar();
}

abaMembros.addEventListener('click', () => trocarAba('membro'));
abaVisitas.addEventListener('click', () => trocarAba('visitante'));

campoData.addEventListener('change', carregar);
campoTipo.addEventListener('change', carregar);

botaoLimpar.addEventListener('click', () => {
  pessoas.forEach((p) => { p.presente = false; });
  desenhar();
  mostrarAviso('Marcações apagadas na tela. Salve para gravar.', 'info');
});

botaoSalvar.addEventListener('click', async () => {
  botaoSalvar.disabled = true;
  botaoSalvar.textContent = 'Salvando';

  try {
    // Cria o encontro agora, no momento de salvar.
    const { encontro } = await api('/api/encontros', {
      metodo: 'POST',
      corpo: { data: campoData.value, tipo: campoTipo.value }
    });

    encontroId = encontro.id;

    await api('/api/presencas', {
      metodo: 'POST',
      corpo: {
        encontro_id: encontroId,
        presencas: pessoas.map((p) => ({ membro_id: p.membro_id, presente: p.presente }))
      }
    });

    const presentes = pessoas.filter((p) => p.presente).length;
    mostrarAviso(
      `Chamada de ${dataBonita(campoData.value)} salva. ${presentes} presentes.`, 'ok'
    );
    carregarRecentes();
  } catch (e) {
    mostrarAviso(e.message);
  } finally {
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = 'Salvar chamada';
  }
});

// Lista de encontros já registrados, para abrir e corrigir.
async function carregarRecentes() {
  try {
    const { encontros } = await api('/api/encontros');

    recentesEl.innerHTML = encontros.length
      ? encontros.slice(0, 8).map((e) => `
          <li class="recente">
            <button type="button" class="abrir" data-data="${String(e.data).split('T')[0]}" data-tipo="${e.tipo}">
              <span>${dataBonita(e.data)}</span>
              <span class="detalhe">${e.tipo} &middot; ${e.total_presentes} presentes &middot; ${e.preenchido_por_nome || 'sem responsável'}</span>
            </button>
            <button type="button" class="excluir" data-excluir="${e.id}" aria-label="Excluir chamada">&times;</button>
          </li>
        `).join('')
      : '<li class="vazio">Nenhuma chamada registrada ainda.</li>';
  } catch {
    recentesEl.innerHTML = '';
  }
}

recentesEl.addEventListener('click', async (evento) => {
  const abrir = evento.target.closest('.abrir');
  if (abrir) {
    campoData.value = abrir.dataset.data;
    campoTipo.value = abrir.dataset.tipo;
    carregar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const excluir = evento.target.closest('[data-excluir]');
  if (!excluir) return;

  if (!confirm('Excluir esta chamada inteira? As presenças registradas nela serão perdidas.')) return;

  try {
    await api(`/api/encontros?id=${excluir.dataset.excluir}`, { metodo: 'DELETE' });
    mostrarAviso('Chamada excluída.', 'ok');
    carregarRecentes();
    carregar();
  } catch (e) {
    mostrarAviso(e.message);
  }
});

carregar();
carregarRecentes();
