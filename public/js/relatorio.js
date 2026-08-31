import { api, exigirSessao, dataBonita } from './api.js';

const usuario = exigirSessao();

const inicio      = document.getElementById('inicio');
const fim         = document.getElementById('fim');
const btnFiltrar  = document.getElementById('filtrar');
const btnPdf      = document.getElementById('pdf');
const resumoEl    = document.getElementById('resumo');
const ultimoEl    = document.getElementById('ultimo');
const statusEl    = document.getElementById('status');
const freqEl      = document.getElementById('frequencia');
const falhasEl    = document.getElementById('sem-chamada');
const geradoEl    = document.getElementById('gerado');

function selo(status) {
  return `<span class="selo ${status}">${status}</span>`;
}

async function carregar() {
  const parametros = new URLSearchParams();
  if (inicio.value) parametros.set('inicio', inicio.value);
  if (fim.value) parametros.set('fim', fim.value);

  freqEl.innerHTML = '<p class="vazio">Carregando…</p>';

  try {
    const dados = await api(`/api/relatorio?${parametros.toString()}`);
    desenhar(dados);
  } catch (e) {
    freqEl.innerHTML = `<p class="vazio">${e.message}</p>`;
  }
}

function desenhar(dados) {
  const { resumo, ultimo_encontro, frequencia, status, encontros_sem_chamada } = dados;

  resumoEl.innerHTML = `
    <div><div class="n">${resumo.total_membros}</div><div class="r">membros</div></div>
    <div><div class="n">${resumo.total_visitantes}</div><div class="r">visitantes</div></div>
    <div><div class="n">${resumo.total_encontros}</div><div class="r">encontros</div></div>
    <div><div class="n">${resumo.encontros_sem_chamada}</div><div class="r">sem chamada</div></div>
  `;

  ultimoEl.innerHTML = ultimo_encontro
    ? `${dataBonita(ultimo_encontro.data)} (${ultimo_encontro.tipo}) &middot;
       ${ultimo_encontro.presentes} presentes, ${ultimo_encontro.ausentes} ausentes &middot;
       chamada de ${ultimo_encontro.preenchido_por_nome || 'ninguém registrado'}`
    : 'Nenhuma chamada registrada ainda.';

  const emAlerta = status.filter((p) => p.status !== 'normal');

  statusEl.innerHTML = emAlerta.length
    ? `<table>
        <tr><th>Nome</th><th class="num">Faltas seguidas</th><th class="num">Situação</th></tr>
        ${emAlerta.map((p) => `
          <tr>
            <td>${p.nome}</td>
            <td class="num">${p.faltas_seguidas}</td>
            <td class="num">${selo(p.status)}</td>
          </tr>`).join('')}
       </table>`
    : '<p class="vazio">Ninguém em alerta. Todo mundo dentro do esperado.</p>';

  freqEl.innerHTML = frequencia.length
    ? `<table>
        <tr><th>Nome</th><th class="num">Presenças</th><th class="num">Frequência</th></tr>
        ${frequencia.map((p) => `
          <tr>
            <td>${p.nome}</td>
            <td class="num">${p.total_presencas} / ${p.total_encontros}</td>
            <td class="num">${p.percentual === null ? '—' : p.percentual + '%'}</td>
          </tr>`).join('')}
       </table>`
    : '<p class="vazio">Sem dados no período escolhido.</p>';

  falhasEl.innerHTML = encontros_sem_chamada.length
    ? `<table>
        <tr><th>Data</th><th class="num">Tipo</th></tr>
        ${encontros_sem_chamada.map((e) => `
          <tr><td>${dataBonita(e.data)}</td><td class="num">${e.tipo}</td></tr>
        `).join('')}
       </table>`
    : '<p class="vazio">Todos os encontros tiveram chamada preenchida.</p>';

  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  geradoEl.textContent = `Gerado em ${agora} por ${usuario.nome}.`;
}

btnFiltrar.addEventListener('click', carregar);
btnPdf.addEventListener('click', () => window.print());

carregar();
