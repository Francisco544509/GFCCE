/* ============================================================
   GFCCE - Admin: Relatórios
   ============================================================ */

import { exigirAdmin } from "../auth-guard.js";
import { montarSidebarAdmin, abrirSidebarMobile } from "../../components/admin-sidebar.js";
import { listarTodosPedidos } from "../firebase/firestore.js";
import { formatarMoeda, formatarData, toast, debounce } from "../utils/helpers.js";

let TODOS_PEDIDOS = [];
let filtrados = [];
let termoBusca = "";
let statusFiltro = "todos";
let dataInicio = "";
let dataFim = "";

exigirAdmin(async (user, perfil) => {
  montarSidebarAdmin("relatorios", perfil);
  document.getElementById("btn-abrir-menu")?.addEventListener("click", abrirSidebarMobile);

  TODOS_PEDIDOS = await listarTodosPedidos();
  aplicarFiltros();

  document.getElementById("busca-relatorio").addEventListener("input", debounce((e) => { termoBusca = e.target.value.trim().toLowerCase(); aplicarFiltros(); }, 200));
  document.getElementById("filtro-status-relatorio").addEventListener("change", (e) => { statusFiltro = e.target.value; aplicarFiltros(); });
  document.getElementById("data-inicio").addEventListener("change", (e) => { dataInicio = e.target.value; aplicarFiltros(); });
  document.getElementById("data-fim").addEventListener("change", (e) => { dataFim = e.target.value; aplicarFiltros(); });
});

function paraData(ts) { return ts?.toDate ? ts.toDate() : new Date(ts); }

function aplicarFiltros() {
  filtrados = TODOS_PEDIDOS.filter(p => {
    const buscaAlvo = `${p.alunoNome} ${p.alunoTurma} ${p.numeroPedido} ${p.codigoUnico}`.toLowerCase();
    const passaBusca = !termoBusca || buscaAlvo.includes(termoBusca);
    const passaStatus = statusFiltro === "todos" || p.status === statusFiltro;
    const dataPedido = p.criadoEm ? paraData(p.criadoEm).toISOString().slice(0, 10) : null;
    const passaInicio = !dataInicio || (dataPedido && dataPedido >= dataInicio);
    const passaFim = !dataFim || (dataPedido && dataPedido <= dataFim);
    return passaBusca && passaStatus && passaInicio && passaFim;
  });
  renderTabela();
}

function renderTabela() {
  const tbody = document.getElementById("tbody-relatorio");
  if (!filtrados.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="vazio"><i class="fa-solid fa-file-circle-question"></i><h3>Nenhum pedido encontrado</h3><p>Ajuste os filtros para ver resultados.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = filtrados.map(p => `
    <tr>
      <td><strong>${p.numeroPedido}</strong></td>
      <td>${p.alunoNome}</td>
      <td>${p.alunoTurma}</td>
      <td>${formatarData(p.criadoEm)}</td>
      <td>${p.horarioRetirada || "-"}</td>
      <td><span class="badge badge-${p.status}">${p.status}</span></td>
      <td>${formatarMoeda(p.total)}</td>
    </tr>
  `).join("");
}

document.getElementById("btn-exportar-pdf").addEventListener("click", () => {
  if (!filtrados.length) { toast("Nenhum pedido para exportar.", "alerta"); return; }
  // eslint-disable-next-line no-undef
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  pdf.setFontSize(16);
  pdf.text("GFCCE - Relatório de Pedidos", 14, 16);
  pdf.setFontSize(10);
  pdf.setTextColor(120);
  pdf.text(`Gerado em ${new Date().toLocaleString("pt-BR")} · ${filtrados.length} pedido(s)`, 14, 22);

  // eslint-disable-next-line no-undef
  pdf.autoTable({
    startY: 28,
    head: [["Nº Pedido", "Aluno", "Turma", "Data", "Horário", "Status", "Total"]],
    body: filtrados.map(p => [p.numeroPedido, p.alunoNome, p.alunoTurma, formatarData(p.criadoEm), p.horarioRetirada || "-", p.status, formatarMoeda(p.total)]),
    headStyles: { fillColor: [15, 42, 71] },
    styles: { fontSize: 9 }
  });

  const total = filtrados.reduce((s, p) => s + (p.total || 0), 0);
  const yFinal = pdf.lastAutoTable.finalY + 10;
  pdf.setFontSize(11);
  pdf.setTextColor(0);
  pdf.text(`Total do período: ${formatarMoeda(total)}`, 14, yFinal);

  pdf.save(`relatorio-gfcce-${new Date().toISOString().slice(0, 10)}.pdf`);
});

document.getElementById("btn-exportar-excel").addEventListener("click", () => {
  if (!filtrados.length) { toast("Nenhum pedido para exportar.", "alerta"); return; }
  const linhas = filtrados.map(p => ({
    "Nº Pedido": p.numeroPedido,
    "Código": p.codigoUnico,
    "Aluno": p.alunoNome,
    "Turma": p.alunoTurma,
    "Data": formatarData(p.criadoEm),
    "Horário": p.horarioRetirada || "-",
    "Pagamento": p.formaPagamento,
    "Status": p.status,
    "Subtotal": p.subtotal,
    "Desconto": p.desconto || 0,
    "Total": p.total
  }));
  // eslint-disable-next-line no-undef
  const planilha = XLSX.utils.json_to_sheet(linhas);
  // eslint-disable-next-line no-undef
  const livro = XLSX.utils.book_new();
  // eslint-disable-next-line no-undef
  XLSX.utils.book_append_sheet(livro, planilha, "Pedidos");
  // eslint-disable-next-line no-undef
  XLSX.writeFile(livro, `relatorio-gfcce-${new Date().toISOString().slice(0, 10)}.xlsx`);
});
