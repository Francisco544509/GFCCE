/* ============================================================
   GFCCE - Checkout
   Seleção de pagamento e horário de retirada -> leva para a
   tela de Pagamento (pagamento.html), onde o pedido é
   efetivamente criado após a confirmação do pagamento.
   ============================================================ */

import { exigirAluno } from "./auth-guard.js";
import { obterCarrinho, calcularSubtotal, obterCupomAplicado, calcularDesconto } from "./carrinho.js";
import { formatarMoeda } from "./utils/helpers.js";

exigirAluno((user, perfil) => {
  const itens = obterCarrinho();
  if (!itens.length) { window.location.href = "loja.html"; return; }

  renderResumo(itens);
  gerarHorariosDisponiveis();
});

function renderResumo(itens) {
  document.getElementById("mini-lista-itens").innerHTML = itens.map(i => `
    <div class="resumo-linha"><span>${i.quantidade}x ${i.nome}</span><span>${formatarMoeda(i.preco * i.quantidade)}</span></div>
  `).join("");

  const subtotal = calcularSubtotal(itens);
  const cupom = obterCupomAplicado();
  const desconto = calcularDesconto(subtotal, cupom);
  document.getElementById("valor-subtotal").textContent = formatarMoeda(subtotal);
  document.getElementById("valor-total").textContent = formatarMoeda(Math.max(0, subtotal - desconto));
  if (desconto > 0) {
    document.getElementById("linha-desconto").style.display = "flex";
    document.getElementById("valor-desconto").textContent = "- " + formatarMoeda(desconto);
  }
}

let horarioSelecionado = null;

/** Gera horários de retirada disponíveis a cada 10 minutos, a partir de agora (+15min), até o fim do intervalo. */
function gerarHorariosDisponiveis() {
  const container = document.getElementById("opcoes-horario");
  const agora = new Date();
  const horarios = [];
  let base = new Date(agora.getTime() + 15 * 60000);
  base.setMinutes(Math.ceil(base.getMinutes() / 10) * 10, 0, 0);

  for (let i = 0; i < 8; i++) {
    const h = new Date(base.getTime() + i * 10 * 60000);
    horarios.push(h);
  }

  container.innerHTML = horarios.map((h, i) => {
    const label = h.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `<button type="button" class="chip horario-chip ${i === 0 ? "ativo" : ""}" data-horario="${label}">${label}</button>`;
  }).join("");

  horarioSelecionado = horarios[0].toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  container.querySelectorAll("[data-horario]").forEach(chip => {
    chip.addEventListener("click", () => {
      container.querySelector(".ativo")?.classList.remove("ativo");
      chip.classList.add("ativo");
      horarioSelecionado = chip.dataset.horario;
    });
  });
}

document.querySelectorAll(".opcao-radio").forEach(op => {
  op.addEventListener("click", () => {
    document.querySelectorAll(".opcao-radio").forEach(o => o.classList.remove("selecionada"));
    op.classList.add("selecionada");
  });
});
document.querySelector(".opcao-radio")?.classList.add("selecionada");

document.getElementById("btn-confirmar").addEventListener("click", () => {
  const itens = obterCarrinho();
  if (!itens.length) return;

  const formaPagamento = document.querySelector('input[name="pagamento"]:checked').value;

  // Salva a seleção para a tela de pagamento ler (o carrinho em si continua no localStorage).
  sessionStorage.setItem("gfcce_pagamento_selecao", JSON.stringify({ formaPagamento, horarioRetirada: horarioSelecionado }));
  window.location.href = "pagamento.html";
});
