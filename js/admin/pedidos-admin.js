/* ============================================================
   GFCCE - Admin: Pedidos (Kanban)
   ============================================================ */

import { exigirAdmin } from "../auth-guard.js";
import { montarSidebarAdmin, abrirSidebarMobile } from "../../components/admin-sidebar.js";
import { escutarTodosPedidos, atualizarStatusPedido } from "../firebase/firestore.js";
import { formatarMoeda, formatarDataHora, toast, debounce } from "../utils/helpers.js";

const COLUNAS = [
  { chave: "recebido", label: "Recebido", icone: "fa-receipt", proximo: "preparando" },
  { chave: "preparando", label: "Preparando", icone: "fa-kitchen-set", proximo: "pronto" },
  { chave: "pronto", label: "Pronto", icone: "fa-bell", proximo: "entregue" },
  { chave: "entregue", label: "Entregue", icone: "fa-circle-check", proximo: null },
];

let TODOS_PEDIDOS = [];
let termoBusca = "";
let statusFiltro = "todos";
let dataFiltro = "";

exigirAdmin((user, perfil) => {
  montarSidebarAdmin("pedidos", perfil);
  document.getElementById("btn-abrir-menu")?.addEventListener("click", abrirSidebarMobile);

  escutarTodosPedidos((pedidos) => {
    TODOS_PEDIDOS = pedidos;
    render();
  });

  document.getElementById("busca-pedido").addEventListener("input", debounce((e) => {
    termoBusca = e.target.value.trim().toLowerCase();
    render();
  }, 200));
  document.getElementById("filtro-status").addEventListener("change", (e) => { statusFiltro = e.target.value; render(); });
  document.getElementById("filtro-data").addEventListener("change", (e) => { dataFiltro = e.target.value; render(); });
});

function paraData(ts) { return ts?.toDate ? ts.toDate() : new Date(ts); }

function render() {
  const filtrados = TODOS_PEDIDOS.filter(p => {
    const buscaAlvo = `${p.alunoNome} ${p.alunoTurma} ${p.numeroPedido} ${p.codigoUnico}`.toLowerCase();
    const passaBusca = !termoBusca || buscaAlvo.includes(termoBusca);
    const passaStatus = statusFiltro === "todos" || p.status === statusFiltro;
    const passaData = !dataFiltro || (p.criadoEm && paraData(p.criadoEm).toISOString().slice(0, 10) === dataFiltro);
    return passaBusca && passaStatus && passaData;
  });

  const kanban = document.getElementById("kanban-pedidos");
  kanban.innerHTML = COLUNAS.map(col => {
    const pedidosColuna = filtrados.filter(p => p.status === col.chave);
    return `
    <div class="kanban-coluna">
      <h4><span><i class="fa-solid ${col.icone}"></i> ${col.label}</span><span class="contagem">${pedidosColuna.length}</span></h4>
      ${pedidosColuna.length ? pedidosColuna.map(p => cardHtml(p, col)).join("") : `<p style="text-align:center; color:var(--cinza-600); font-size:0.8rem; padding:20px 0;">Nenhum pedido</p>`}
    </div>`;
  }).join("");

  kanban.querySelectorAll("[data-avancar]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await atualizarStatusPedido(btn.dataset.avancar, btn.dataset.novoStatus);
      toast(`Pedido ${btn.dataset.numero} atualizado para "${btn.dataset.novoStatus}".`, "sucesso", 2000);
    });
  });
  kanban.querySelectorAll("[data-cancelar]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Cancelar este pedido?")) return;
      await atualizarStatusPedido(btn.dataset.cancelar, "cancelado");
      toast("Pedido cancelado.", "info");
    });
  });
}

function cardHtml(p, col) {
  return `
  <div class="kanban-card ${p.status} fade-up">
    <div class="num">${p.numeroPedido}</div>
    <div class="meta">${p.alunoNome} · ${p.alunoTurma}</div>
    <div class="meta">Retirada: ${p.horarioRetirada} · ${formatarDataHora(p.criadoEm)}</div>
    <div class="valor">${formatarMoeda(p.total)}</div>
    <div class="botoes-status">
      ${col.proximo ? `<button data-avancar="${p.id}" data-novo-status="${col.proximo}" data-numero="${p.numeroPedido}"><i class="fa-solid fa-arrow-right"></i> ${labelBotao(col.proximo)}</button>` : ""}
      ${col.chave !== "entregue" ? `<button data-cancelar="${p.id}" style="color:var(--erro);"><i class="fa-solid fa-xmark"></i></button>` : ""}
    </div>
  </div>`;
}

function labelBotao(status) {
  return { preparando: "Preparar", pronto: "Marcar pronto", entregue: "Entregar" }[status] || status;
}
