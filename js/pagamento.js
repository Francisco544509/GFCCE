/* ============================================================
   GFCCE - Pagamento
   Tela dedicada de pagamento (PIX / Cartão / Dinheiro). Como o
   projeto não possui gateway real (exigiria CNPJ/conta
   empresarial), o pagamento é SIMULADO de forma transparente —
   isso fica avisado na tela. O pedido só é criado no Firestore
   depois que o aluno "confirma" o pagamento aqui.
   ============================================================ */

import { exigirAluno } from "./auth-guard.js";
import {
  obterCarrinho, calcularSubtotal, obterCupomAplicado, calcularDesconto,
  obterObservacoes, limparCarrinho
} from "./carrinho.js";
import { criarPedido, ajustarEstoque } from "./firebase/firestore.js";
import { gerarNumeroPedido, gerarCodigoUnico } from "./utils/codigo-pedido.js";
import { formatarMoeda, toast } from "./utils/helpers.js";
import { gerarPayloadPix } from "./utils/pix.js";
import { PIX_CONFIG } from "./utils/pix-config.js";

let userUid = null;
let perfilAluno = null;
let selecao = null; // { formaPagamento, horarioRetirada }
let total = 0;
let numeroPedidoGerado = null;
let codigoUnicoGerado = null;

exigirAluno((user, perfil) => {
  userUid = user.uid;
  perfilAluno = perfil;

  const itens = obterCarrinho();
  const dadosSalvos = sessionStorage.getItem("gfcce_pagamento_selecao");

  if (!itens.length || !dadosSalvos) {
    window.location.href = "checkout.html";
    return;
  }

  selecao = JSON.parse(dadosSalvos);
  const subtotal = calcularSubtotal(itens);
  const cupom = obterCupomAplicado();
  const desconto = calcularDesconto(subtotal, cupom);
  total = Math.max(0, subtotal - desconto);

  // Gera o número/código do pedido AGORA, para que o mesmo código apareça no
  // txid do PIX e, depois, seja o código único gravado no pedido/ticket.
  numeroPedidoGerado = gerarNumeroPedido();
  codigoUnicoGerado = gerarCodigoUnico();

  exibirMetodo(selecao.formaPagamento);
});

function exibirMetodo(metodo) {
  document.querySelectorAll(".pagamento-box > .card").forEach(el => el.classList.add("hidden"));

  if (metodo === "pix") {
    document.getElementById("metodo-pix").classList.remove("hidden");
    document.getElementById("pix-valor").textContent = formatarMoeda(total);
    gerarQRCodePix();
  } else if (metodo === "cartao") {
    document.getElementById("metodo-cartao").classList.remove("hidden");
    document.getElementById("cartao-valor").textContent = formatarMoeda(total);
    ligarFormularioCartao();
  } else {
    document.getElementById("metodo-dinheiro").classList.remove("hidden");
    document.getElementById("dinheiro-valor").textContent = formatarMoeda(total);
  }
}

/* ---------------- PIX (real, com sua chave configurada) ---------------- */
function gerarQRCodePix() {
  const payloadPix = gerarPayloadPix({
    chave: PIX_CONFIG.chave,
    nomeRecebedor: PIX_CONFIG.nomeRecebedor,
    cidade: PIX_CONFIG.cidade,
    valor: total,
    txid: codigoUnicoGerado
  });

  document.getElementById("pix-codigo-texto").textContent = payloadPix;
  document.getElementById("pix-qrcode").innerHTML = "";
  // eslint-disable-next-line no-undef
  new QRCode(document.getElementById("pix-qrcode"), {
    text: payloadPix,
    width: 190,
    height: 190,
    colorDark: "#0F2A47",
    colorLight: "#ffffff"
  });

  document.getElementById("btn-copiar-pix").onclick = async () => {
    try {
      await navigator.clipboard.writeText(payloadPix);
      toast("Código PIX copiado!", "sucesso", 1800);
    } catch {
      toast("Não foi possível copiar automaticamente. Selecione o texto manualmente.", "alerta");
    }
  };

  document.getElementById("btn-confirmar-pix").onclick = async (e) => {
    await finalizarComLoading(e.currentTarget, "Confirmando pagamento...");
  };
}

/* ---------------- Cartão (simulado, com validação básica) ---------------- */
function ligarFormularioCartao() {
  const numero = document.getElementById("c-numero");
  const nome = document.getElementById("c-nome");
  const validade = document.getElementById("c-validade");
  const cvv = document.getElementById("c-cvv");

  numero.addEventListener("input", () => {
    numero.value = numero.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);
    document.getElementById("cartao-preview-numero").textContent = numero.value || "•••• •••• •••• ••••";
  });
  nome.addEventListener("input", () => {
    document.getElementById("cartao-preview-nome").textContent = nome.value.toUpperCase() || "NOME NO CARTÃO";
  });
  validade.addEventListener("input", () => {
    validade.value = validade.value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2").slice(0, 5);
    document.getElementById("cartao-preview-validade").textContent = validade.value || "••/••";
  });
  cvv.addEventListener("input", () => { cvv.value = cvv.value.replace(/\D/g, "").slice(0, 4); });

  document.getElementById("form-cartao").addEventListener("submit", async (e) => {
    e.preventDefault();
    const numeroLimpo = numero.value.replace(/\s/g, "");
    if (numeroLimpo.length < 13) { toast("Número de cartão inválido.", "erro"); return; }
    if (!nome.value.trim()) { toast("Informe o nome impresso no cartão.", "erro"); return; }
    if (!/^\d{2}\/\d{2}$/.test(validade.value)) { toast("Validade inválida. Use MM/AA.", "erro"); return; }
    if (cvv.value.length < 3) { toast("CVV inválido.", "erro"); return; }

    await finalizarComLoading(document.getElementById("btn-pagar-cartao"), "Processando pagamento...");
  });
}

/* ---------------- Dinheiro ---------------- */
document.getElementById("btn-confirmar-dinheiro").addEventListener("click", async (e) => {
  await finalizarComLoading(e.currentTarget, "Confirmando pedido...");
});

/* ---------------- Finalização comum ---------------- */
async function finalizarComLoading(botao, textoCarregando) {
  const htmlOriginal = botao.innerHTML;
  botao.disabled = true;
  botao.innerHTML = `<span class="spinner"></span> ${textoCarregando}`;

  // Pequeno atraso proposital para simular o processamento de pagamento (UX realista).
  await new Promise(resolve => setTimeout(resolve, 1100));

  try {
    const itens = obterCarrinho();
    const subtotal = calcularSubtotal(itens);
    const cupom = obterCupomAplicado();
    const desconto = calcularDesconto(subtotal, cupom);

    const pedidoId = await criarPedido({
      numeroPedido: numeroPedidoGerado,
      codigoUnico: codigoUnicoGerado,
      alunoUid: userUid,
      alunoNome: perfilAluno.nome,
      alunoTurma: perfilAluno.turma,
      itens,
      subtotal,
      desconto,
      cupomCodigo: cupom?.codigo || null,
      total: Math.max(0, subtotal - desconto),
      formaPagamento: selecao.formaPagamento,
      pagamentoConfirmado: selecao.formaPagamento !== "dinheiro", // dinheiro só é confirmado na retirada
      horarioRetirada: selecao.horarioRetirada,
      observacoes: obterObservacoes()
    });

    await Promise.all(itens.map(i => ajustarEstoque(i.produtoId, -i.quantidade).catch(() => {})));

    limparCarrinho();
    sessionStorage.removeItem("gfcce_pagamento_selecao");
    toast("Pagamento confirmado! Pedido realizado 🎉", "sucesso");
    window.location.href = `ticket.html?pedido=${pedidoId}`;
  } catch (err) {
    console.error(err);
    toast("Não foi possível concluir o pedido. Tente novamente.", "erro");
    botao.disabled = false;
    botao.innerHTML = htmlOriginal;
  }
}
