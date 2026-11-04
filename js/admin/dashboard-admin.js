/* ============================================================
   GFCCE - Dashboard Administrativo
   Calcula KPIs e renderiza gráficos Chart.js a partir de todos
   os pedidos do Firestore.
   ============================================================ */

import { exigirAdmin } from "../auth-guard.js";
import { montarSidebarAdmin, abrirSidebarMobile } from "../../components/admin-sidebar.js";
import { listarTodosPedidos } from "../firebase/firestore.js";
import { formatarMoeda } from "../utils/helpers.js";

const CORES = { azul: "#1E5F9E", laranja: "#FF7A1A", verde: "#2FB380", vermelho: "#E24C4C", cinza: "#5B6B7C" };

exigirAdmin(async (user, perfil) => {
  montarSidebarAdmin("dashboard", perfil);
  document.getElementById("btn-abrir-menu")?.addEventListener("click", abrirSidebarMobile);

  const pedidos = await listarTodosPedidos();
  renderKpis(pedidos);
  renderGraficoPedidosPorDia(pedidos);
  renderGraficoMaisVendidos(pedidos);
  renderGraficoHorariosPico(pedidos);
});

function paraData(ts) {
  return ts?.toDate ? ts.toDate() : new Date(ts);
}

function renderKpis(pedidos) {
  const entregues = pedidos.filter(p => p.status === "entregue");
  const cancelados = pedidos.filter(p => p.status === "cancelado");
  const faturamento = entregues.reduce((soma, p) => soma + (p.total || 0), 0);

  // Tempo médio de espera: do "criadoEm" até ficar "pronto" (aproximado via atualizadoEm quando status atual é pronto/entregue)
  // Tempo médio de atendimento: do "criadoEm" até "retiradoEm" (quando existe)
  const temposEspera = [];
  const temposAtendimento = [];
  pedidos.forEach(p => {
    if (p.criadoEm && p.retiradoEm) {
      const min = (paraData(p.retiradoEm) - paraData(p.criadoEm)) / 60000;
      if (min >= 0 && min < 240) temposAtendimento.push(min);
    }
  });

  const mediaAtendimento = temposAtendimento.length
    ? Math.round(temposAtendimento.reduce((a, b) => a + b, 0) / temposAtendimento.length)
    : null;

  const kpis = [
    { label: "Faturamento", valor: formatarMoeda(faturamento), icone: "fa-sack-dollar", cor: CORES.laranja },
    { label: "Total de pedidos", valor: pedidos.length, icone: "fa-receipt", cor: CORES.azul },
    { label: "Pedidos entregues", valor: entregues.length, icone: "fa-circle-check", cor: CORES.verde },
    { label: "Pedidos cancelados", valor: cancelados.length, icone: "fa-circle-xmark", cor: CORES.vermelho },
    { label: "Tempo médio de atendimento", valor: mediaAtendimento !== null ? `${mediaAtendimento} min` : "—", icone: "fa-stopwatch", cor: CORES.cinza },
    { label: "Ticket médio", valor: formatarMoeda(entregues.length ? faturamento / entregues.length : 0), icone: "fa-tag", cor: CORES.azul },
  ];

  document.getElementById("kpi-grid").innerHTML = kpis.map(k => `
    <div class="kpi-card fade-up">
      <div class="kpi-topo">
        <div>
          <div class="kpi-valor">${k.valor}</div>
          <div class="kpi-label">${k.label}</div>
        </div>
        <div class="kpi-icone" style="background:${k.cor}22; color:${k.cor};"><i class="fa-solid ${k.icone}"></i></div>
      </div>
    </div>
  `).join("");
}

function renderGraficoPedidosPorDia(pedidos) {
  const dias = [];
  const contagem = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const chave = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
    dias.push(chave);
    contagem[chave] = 0;
  }
  pedidos.forEach(p => {
    if (!p.criadoEm) return;
    const chave = paraData(p.criadoEm).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
    if (chave in contagem) contagem[chave]++;
  });

  // eslint-disable-next-line no-undef
  new Chart(document.getElementById("grafico-pedidos-dia"), {
    type: "line",
    data: {
      labels: dias,
      datasets: [{
        label: "Pedidos",
        data: dias.map(d => contagem[d]),
        borderColor: CORES.laranja,
        backgroundColor: "rgba(255,122,26,0.12)",
        fill: true, tension: 0.35, pointBackgroundColor: CORES.laranja
      }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}

function renderGraficoMaisVendidos(pedidos) {
  const contagem = {};
  pedidos.forEach(p => (p.itens || []).forEach(i => { contagem[i.nome] = (contagem[i.nome] || 0) + i.quantidade; }));
  const ordenado = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // eslint-disable-next-line no-undef
  new Chart(document.getElementById("grafico-mais-vendidos"), {
    type: "bar",
    data: {
      labels: ordenado.map(o => o[0]),
      datasets: [{ label: "Unidades vendidas", data: ordenado.map(o => o[1]), backgroundColor: CORES.azul, borderRadius: 6 }]
    },
    options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}

function renderGraficoHorariosPico(pedidos) {
  const faixas = ["07-08h", "08-09h", "09-10h", "10-11h", "11-12h", "12-13h", "13-14h", "14-15h", "15-16h"];
  const contagem = Object.fromEntries(faixas.map(f => [f, 0]));
  pedidos.forEach(p => {
    if (!p.horarioRetirada) return;
    const hora = parseInt(p.horarioRetirada.split(":")[0], 10);
    const faixa = `${String(hora).padStart(2, "0")}-${String(hora + 1).padStart(2, "0")}h`;
    if (faixa in contagem) contagem[faixa]++;
  });

  // eslint-disable-next-line no-undef
  new Chart(document.getElementById("grafico-horarios-pico"), {
    type: "bar",
    data: { labels: faixas, datasets: [{ label: "Pedidos", data: faixas.map(f => contagem[f]), backgroundColor: CORES.verde, borderRadius: 6 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}
