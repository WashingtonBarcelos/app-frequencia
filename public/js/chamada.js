import { api, exigirSessao, hoje, tipoSugerido, dataBonita } from './api.js';

const usuario = exigirSessao();

const campoData   = document.getElementById('data');
const campoTipo   = document.getElementById('tipo');
const abaMembros  = document.getElementById('aba-membros');
const abaVisitas  = document.getElementById('aba-visitantes');
const lista       = document.getElementById('lista');
const contador    = document.getElementById('contador');
const botaoSalvar = document.getElementById('salvar');
const aviso       = document.getElementById('aviso');
const nomeUsuario = document.getElementById('usuario');

let pessoas = [];              // todas, com o estado de presença
let abaAtiva = 'membro';
let encontroId = null;

nomeUsuario.textContent = usuario.nome;
campoData.value = hoje();
campoTipo.value = tipoSugerido();

function mostrarAviso(texto, ok = false) {
  aviso.textContent = texto;
  aviso.className = ok ? 'aviso ok' : 'aviso';
  aviso.hidden = !texto;
}

// Abre (ou cria) o encontro da data e carrega o estado atual da chamada.
async function carregar() {
  mostrarAviso('');
  lista.innerHTML = '<li class="vazio bloco">Carregando…</li>';

  try {
    const { encontro } = await api('/api/encontros', {
      metodo: 'POST',
      corpo: { data: campoData.value, tipo: campoTipo.value }
    });

    encontroId = encontro.id;

    const { presencas } = await api(`/api/presencas?encontro_id=${encontroId}`);

    // Padrão da chamada: todo mundo ausente. Marca-se quem veio.
    pessoas = presencas.map((p) => ({ ...p, presente: !!p.presente }));

    const jaMarcado = presencas.some((p) => p.marcado);
    if (jaMarcado) {
      mostrarAviso(`Esta chamada já foi salva. Alterações substituem o registro anterior.`);
    }

    desenhar();
  } catch (e) {
    lista.innerHTML = '';
    mostrarAviso(e.message);
  }
}

function desenhar() {
  const visiveis = pessoas.filter((p) => p.tipo === abaAtiva);

  lista.innerHTML = visiveis.map((p) => `
    <li>
      <button class="linha" type="button" data-id="${p.membro_id}" aria-pressed="${p.presente}">
        <span class="barra"></span>
        <span class="nome">${p.nome}</span>
        <span class="marca" aria-hidden="true">&#10003;</span>
      </button>
    </li>
  `).join('');

  atualizarContador();
}

function atualizarContador() {
  const presentes = pessoas.filter((p) => p.presente).length;
  const total = pessoas.length;
  contador.innerHTML = `<b>${presentes}</b> presentes de ${total}`;
}

lista.addEventListener('click', (evento) => {
  const botao = evento.target.closest('.linha');
  if (!botao) return;

  const id = botao.dataset.id;
  const pessoa = pessoas.find((p) => String(p.membro_id) === String(id));
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

botaoSalvar.addEventListener('click', async () => {
  if (!encontroId) return;

  botaoSalvar.disabled = true;
  botaoSalvar.textContent = 'Salvando';

  try {
    await api('/api/presencas', {
      metodo: 'POST',
      corpo: {
        encontro_id: encontroId,
        presencas: pessoas.map((p) => ({ membro_id: p.membro_id, presente: p.presente }))
      }
    });

    const presentes = pessoas.filter((p) => p.presente).length;
    mostrarAviso(
      `Chamada de ${dataBonita(campoData.value)} salva por ${usuario.nome}. ${presentes} presentes.`,
      true
    );
  } catch (e) {
    mostrarAviso(e.message);
  } finally {
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = 'Salvar chamada';
  }
});

carregar();
