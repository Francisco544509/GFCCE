/* ============================================================
   GFCCE - UI do Carrinho
   ============================================================ */

import { exigirAluno } from "./auth-guard.js";
import { montarNavbar } from "../components/navbar.js";
import {
  obterCarrinho, alterarQuantidade, removerDoCarrinho, calcularSubtotal,
  aplicarCupom, removerCupom, obterCupomAplicado, calcularDesconto,
  salvarObservacoes, obterObservacoes
} from "./carrinho.js";
import { formatarMoeda, toast } from "./utils/helpers.js";

exigirAluno((user, perfil) => {
  montarNavbar("carrinho", perfil);
  document.getElementById("observacoes").value = obterObservacoes();
  render();
});

function render() {
  const itens = obterCarrinho();
  const lista = document.getElementById("lista-itens-carrinho");
  const vazio = document.getElementById("vazio-carrinho");

  if (!itens.length) {
    lista.innerHTML = "";
    vazio.classList.remove("hidden");
    document.getElementById("btn-continuar").disabled = true;
  } else {
    vazio.classList.add("hidden");
    document.getElementById("btn-continuar").disabled = false;
    lista.innerHTML = itens.map(itemHtml).join("");
    ligarEventosItens();
  }

  atualizarTotais();
  renderCupom();
}

function itemHtml(item) {
  return `
  <div class="item-carrinho" data-id="${item.produtoId}">
    ${item.imagem ? `<img src="${item.imagem}" alt="${item.nome}" />` : `<div class="skeleton" style="width:68px;height:68px;"></div>`}
    <div class="info">
      <div class="linha-topo">
        <strong>${item.nome}</strong>
        <button class="remover-item" data-remover="${item.produtoId}" aria-label="Remover"><i class="fa-solid fa-trash"></i></button>
      </div>
      <span class="preco-unit">${formatarMoeda(item.preco)} / unid.</span>
      <div class="qtd-control">
        <button data-menos="${item.produtoId}" aria-label="Diminuir"><i class="fa-solid fa-minus"></i></button>
        <span>${item.quantidade}</span>
        <button data-mais="${item.produtoId}" aria-label="Aumentar"><i class="fa-solid fa-plus"></i></button>
      </div>
    </div>
  </div>`;
}

function ligarEventosItens() {
  document.querySelectorAll("[data-mais]").forEach(b => b.onclick = () => { alterarQuantidade(b.dataset.mais, 1); render(); });
  document.querySelectorAll("[data-menos]").forEach(b => b.onclick = () => { alterarQuantidade(b.dataset.menos, -1); render(); });
  document.querySelectorAll("[data-remover]").forEach(b => b.onclick = () => { removerDoCarrinho(b.dataset.remover); render(); toast("Item removido.", "info", 1600); });
}

function atualizarTotais() {
  const subtotal = calcularSubtotal();
  const cupom = obterCupomAplicado();
  const desconto = calcularDesconto(subtotal, cupom);
  document.getElementById("valor-subtotal").textContent = formatarMoeda(subtotal);
  document.getElementById("valor-total").textContent = formatarMoeda(Math.max(0, subtotal - desconto));
  const linhaDesconto = document.getElementById("linha-desconto");
  if (desconto > 0) {
    linhaDesconto.style.display = "flex";
    document.getElementById("valor-desconto").textContent = "- " + formatarMoeda(desconto);
  } else {
    linhaDesconto.style.display = "none";
  }
}

function renderCupom() {
  const cupom = obterCupomAplicado();
  const info = document.getElementById("cupom-aplicado-info");
  if (cupom) {
    info.classList.remove("hidden");
    const desc = cupom.tipo === "percentual" ? `${cupom.valor}% OFF` : formatarMoeda(cupom.valor) + " OFF";
    document.getElementById("texto-cupom").innerHTML = `<i class="fa-solid fa-tag"></i> Cupom ${cupom.codigo} aplicado (${desc})`;
  } else {
    info.classList.add("hidden");
  }
}

document.getElementById("btn-aplicar-cupom").addEventListener("click", async () => {
  const input = document.getElementById("input-cupom");
  if (!input.value.trim()) return;
  const resultado = await aplicarCupom(input.value);
  if (resultado.ok) {
    toast("Cupom aplicado com sucesso!", "sucesso");
    input.value = "";
    render();
  } else {
    toast(resultado.motivo, "erro");
  }
});

document.getElementById("btn-remover-cupom").addEventListener("click", () => { removerCupom(); render(); });

document.getElementById("observacoes").addEventListener("input", (e) => salvarObservacoes(e.target.value));

document.getElementById("btn-continuar").addEventListener("click", () => {
  if (!obterCarrinho().length) return;
  window.location.href = "checkout.html";
});
