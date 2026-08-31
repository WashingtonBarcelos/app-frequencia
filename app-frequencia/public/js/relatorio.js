import { api, exigirSessao, dataBonita } from './api.js';

const usuario = exigirSessao();

const inicio     = document.getElementById('inicio');
const fim        = document.getElementById('fim');
const btnFiltrar = document.getElementById('filtrar');
const btnLimpar  = document.getElementById('limpar-periodo');
const btnPdf     = document.getElementById('pdf');
const resumoEl   = document.getElementById('resumo');
const ultimoEl   = document.getElementById('ultimo');
const statusEl   = document.getElementById('status');
const freqEl     = document.getElementById('frequencia');
const falhasEl   = document.getElementById('sem-chamada');
const geradoEl   = document.getElementById('gerado');
const periodoEl  = document.getElementById('periodo-impresso');

function faixa(percentual) {
  if (percentual === null) return 'sem';
  if (percentual >= 75) return 'alta';
  if (percentual >= 40) return 'media';
  return 'baixa';
}

function formatarPercentual(valor) {
  if (valor === null || valor === undefined) return '—';
  return `${Math.round(Number(valor))}%`;
}

function tabelaFrequencia(pessoas) {
  if (!pessoas.length) return '<p class="vazio">Ninguém nesta categoria.</p>';

  return `<ul class="freq">${pessoas.map((p) => {
    const pct = p.percentual === null ? 0 : Number(p.percentual);
    return `
      <li class="freq-linha">
        <span class="freq-nome">${p.nome}</span>
        <span class="freq-barra" aria-hidden="true">
          <span class="freq-preenchida ${faixa(p.percentual)}" style="width:${pct}%"></span>
        </span>
        <span class="freq-conta">${p.total_presencas}/${p.total_encontros}</span>
        <span class="freq-pct ${faixa(p.percentual)}">${formatarPercentual(p.percentual)}</span>
      </li>`;
  }).join('')}</ul>`;
}

async function carregar() {
  const parametros = new URLSearchParams();
  if (inicio.value) parametros.set('inicio', inicio.value);
  if (fim.value) parametros.set('fim', fim.value);

  freqEl.innerHTML = '<p class="vazio">Carregando…</p>';

  try {
    desenhar(await api(`/api/relatorio?${parametros.toString()}`));
  } catch (e) {
    freqEl.innerHTML = `<p class="vazio">${e.message}</p>`;
  }
}

function desenhar(dados) {
  const { resumo, ultimo_encontro, frequencia, status, encontros_sem_chamada } = dados;

  resumoEl.innerHTML = `
    <div><span class="n">${resumo.total_membros}</span><span class="r">membros</span></div>
    <div><span class="n">${resumo.total_visitantes}</span><span class="r">visitantes</span></div>
    <div><span class="n">${resumo.total_encontros}</span><span class="r">encontros</span></div>
    <div><span class="n ${Number(resumo.encontros_sem_chamada) > 0 ? 'alerta' : ''}">${resumo.encontros_sem_chamada}</span><span class="r">sem chamada</span></div>
  `;

  ultimoEl.textContent = ultimo_encontro
    ? `Último: ${dataBonita(ultimo_encontro.data)} · ${ultimo_encontro.presentes} presentes, ${ultimo_encontro.ausentes} ausentes · por ${ultimo_encontro.preenchido_por_nome || 'ninguém registrado'}`
    : 'Nenhuma chamada registrada ainda.';

  const emAlerta = status.filter((p) => p.status !== 'normal');

  statusEl.innerHTML = emAlerta.length
    ? `<ul class="contato">${emAlerta.map((p) => `
        <li>
          <span class="freq-nome">${p.nome}</span>
          <span class="faltas">${p.faltas_seguidas} ${p.faltas_seguidas === 1 ? 'falta' : 'faltas'} seguidas</span>
          <span class="selo ${p.status}">${p.status}</span>
        </li>`).join('')}</ul>`
    : '<p class="vazio">Ninguém em alerta.</p>';

  const membros    = frequencia.filter((p) => p.tipo === 'membro');
  const visitantes = frequencia.filter((p) => p.tipo === 'visitante');

  freqEl.innerHTML = `
    <h3 class="subtitulo">Membros</h3>
    ${tabelaFrequencia(membros)}
    <h3 class="subtitulo">Visitantes</h3>
    ${tabelaFrequencia(visitantes)}
  `;

  falhasEl.innerHTML = encontros_sem_chamada.length
    ? `<ul class="simples">${encontros_sem_chamada.map((e) =>
        `<li>${dataBonita(e.data)} <span class="detalhe">${e.tipo}</span></li>`).join('')}</ul>`
    : '<p class="vazio">Todos os encontros tiveram chamada preenchida.</p>';

  periodoEl.textContent = inicio.value || fim.value
    ? `Período: ${inicio.value ? dataBonita(inicio.value) : 'início'} até ${fim.value ? dataBonita(fim.value) : 'hoje'}`
    : 'Período: todo o histórico';

  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  geradoEl.textContent = `Gerado em ${agora} por ${usuario.nome}.`;
}

btnFiltrar.addEventListener('click', carregar);
btnPdf.addEventListener('click', () => window.print());
btnLimpar.addEventListener('click', () => {
  inicio.value = '';
  fim.value = '';
  carregar();
});

carregar();
