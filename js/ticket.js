/* ============================================================
   GFCCE - Ticket Digital
   ============================================================ */

import { exigirAluno } from "./auth-guard.js";
import { buscarPedido } from "./firebase/firestore.js";
import { observarStatusPedido, pedirPermissaoNotificacao } from "./utils/notificacoes.js";
import { formatarMoeda, formatarDataHora, toast } from "./utils/helpers.js";

const ETAPAS = ["recebido", "preparando", "pronto", "entregue"];
const params = new URLSearchParams(window.location.search);
const pedidoId = params.get("pedido");

exigirAluno(async (user) => {
  if (!pedidoId) { window.location.href = "historico.html"; return; }

  pedirPermissaoNotificacao();

  const pedido = await buscarPedido(pedidoId);
  if (!pedido || pedido.alunoUid !== user.uid) {
    toast("Pedido não encontrado.", "erro");
    window.location.href = "historico.html";
    return;
  }

  renderTicket(pedido);
  gerarQRCode(pedido.codigoUnico);

  observarStatusPedido(pedidoId, (pedidoAtualizado) => {
    renderStatus(pedidoAtualizado.status);
  });
});

function renderTicket(p) {
  document.getElementById("t-numero").textContent = p.numeroPedido;
  document.getElementById("t-codigo").textContent = p.codigoUnico;
  document.getElementById("t-aluno").textContent = p.alunoNome;
  document.getElementById("t-turma").textContent = p.alunoTurma;
  document.getElementById("t-data").textContent = formatarDataHora(p.criadoEm || new Date());
  document.getElementById("t-horario").textContent = p.horarioRetirada;
  document.getElementById("t-pagamento").textContent = { pix: "PIX", dinheiro: "Dinheiro", cartao: "Cartão" }[p.formaPagamento] || p.formaPagamento;
  document.getElementById("t-total").textContent = formatarMoeda(p.total);

  document.getElementById("t-itens").innerHTML = p.itens.map(i => `
    <div class="ticket-linha"><span>${i.quantidade}x ${i.nome}</span><span>${formatarMoeda(i.preco * i.quantidade)}</span></div>
  `).join("");

  renderStatus(p.status);
}

function renderStatus(status) {
  const trilha = document.getElementById("status-trilha");
  if (status === "cancelado") {
    trilha.innerHTML = `<div class="vazio" style="padding:16px;"><i class="fa-solid fa-circle-xmark" style="color:var(--erro);"></i><h3>Pedido cancelado</h3><p>Fale com a cantina se isso não era esperado.</p></div>`;
    document.getElementById("t-badge-status").innerHTML = `<span class="badge badge-cancelado" style="background:rgba(255,255,255,0.18); color:#fff;">Cancelado</span>`;
    return;
  }
  const idx = ETAPAS.indexOf(status);
  document.querySelectorAll(".status-etapa").forEach((el, i) => {
    el.classList.remove("concluido", "atual");
    if (i < idx) el.classList.add("concluido");
    else if (i === idx) el.classList.add("atual", status !== "entregue" ? "pulso" : "");
  });
  document.getElementById("barra-progresso").style.width = `${Math.max(0, (idx / (ETAPAS.length - 1)) * 100)}%`;

  const labels = { recebido: "Pedido recebido", preparando: "Preparando seu lanche", pronto: "Pronto para retirar!", entregue: "Retirado" };
  document.getElementById("t-badge-status").innerHTML = `<span class="badge badge-${status}" style="background:rgba(255,255,255,0.18); color:#fff;">${labels[status] || status}</span>`;
}

function gerarQRCode(codigo) {
  const container = document.getElementById("qr-code");
  container.innerHTML = "";
  // eslint-disable-next-line no-undef
  new QRCode(container, {
    text: codigo,
    width: 180,
    height: 180,
    colorDark: "#0F2A47",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}

document.getElementById("btn-pdf").addEventListener("click", async () => {
  const btn = document.getElementById("btn-pdf");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner-azul"></span> Gerando PDF...';
  try {
    // eslint-disable-next-line no-undef
    const canvas = await html2canvas(document.getElementById("ticket-conteudo"), { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    // eslint-disable-next-line no-undef
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "px", format: [canvas.width / 2, canvas.height / 2] });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`ticket-${document.getElementById("t-numero").textContent}.pdf`);
  } catch (err) {
    console.error(err);
    toast("Não foi possível gerar o PDF.", "erro");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-download"></i> Baixar PDF';
  }
});
