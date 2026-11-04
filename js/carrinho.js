/* ============================================================
   GFCCE - Carrinho de compras
   Estado mantido em localStorage (por dispositivo) até a
   finalização do pedido, quando é gravado no Firestore e limpo.
   ============================================================ */

import { buscarCupomPorCodigo } from "./firebase/firestore.js";

const CHAVE_CARRINHO = "gfcce_carrinho";
const CHAVE_CUPOM = "gfcce_cupom";

function lerCarrinho() {
  try { return JSON.parse(localStorage.getItem(CHAVE_CARRINHO)) || []; }
  catch { return []; }
}

function salvarCarrinho(itens) {
  localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens));
}

export function obterCarrinho() {
  return lerCarrinho();
}

export function obterQuantidadeCarrinho() {
  return lerCarrinho().reduce((soma, i) => soma + i.quantidade, 0);
}

/** Adiciona um produto ao carrinho (ou incrementa se já existir). */
export function adicionarAoCarrinho(produto, quantidade = 1) {
  const itens = lerCarrinho();
  const existente = itens.find(i => i.produtoId === produto.id);
  if (existente) {
    existente.quantidade += quantidade;
  } else {
    itens.push({
      produtoId: produto.id,
      nome: produto.nome,
      preco: produto.precoPromocional || produto.preco,
      imagem: produto.imagemUrl || "",
      quantidade
    });
  }
  salvarCarrinho(itens);
  return itens;
}

export function alterarQuantidade(produtoId, delta) {
  let itens = lerCarrinho();
  itens = itens.map(i => i.produtoId === produtoId ? { ...i, quantidade: i.quantidade + delta } : i)
               .filter(i => i.quantidade > 0);
  salvarCarrinho(itens);
  return itens;
}

export function removerDoCarrinho(produtoId) {
  const itens = lerCarrinho().filter(i => i.produtoId !== produtoId);
  salvarCarrinho(itens);
  return itens;
}

export function limparCarrinho() {
  localStorage.removeItem(CHAVE_CARRINHO);
  localStorage.removeItem(CHAVE_CUPOM);
}

export function calcularSubtotal(itens = lerCarrinho()) {
  return itens.reduce((soma, i) => soma + i.preco * i.quantidade, 0);
}

/* ---------------- Cupom de desconto ---------------- */

export function obterCupomAplicado() {
  try { return JSON.parse(localStorage.getItem(CHAVE_CUPOM)) || null; }
  catch { return null; }
}

export function removerCupom() {
  localStorage.removeItem(CHAVE_CUPOM);
}

/**
 * Valida o cupom no Firestore e o salva localmente se válido.
 * Formatos suportados: desconto percentual ({tipo:'percentual', valor:10})
 * ou fixo ({tipo:'fixo', valor:3}).
 */
export async function aplicarCupom(codigo) {
  const cupom = await buscarCupomPorCodigo(codigo.trim());
  if (!cupom || cupom.ativo === false) {
    return { ok: false, motivo: "Cupom inválido ou expirado." };
  }
  localStorage.setItem(CHAVE_CUPOM, JSON.stringify(cupom));
  return { ok: true, cupom };
}

export function calcularDesconto(subtotal, cupom) {
  if (!cupom) return 0;
  if (cupom.tipo === "percentual") return subtotal * (cupom.valor / 100);
  return Math.min(cupom.valor, subtotal);
}

/* ---------------- Observações do pedido ---------------- */

export function salvarObservacoes(texto) {
  sessionStorage.setItem("gfcce_observacoes", texto);
}
export function obterObservacoes() {
  return sessionStorage.getItem("gfcce_observacoes") || "";
}
