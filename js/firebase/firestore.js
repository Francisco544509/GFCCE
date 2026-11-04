/* ============================================================
   GFCCE - Acesso ao Firestore
   Funções reutilizáveis de CRUD para produtos, categorias,
   pedidos e cupons. Usadas tanto pela área do aluno quanto
   pelo painel administrativo.
   ============================================================ */

import { db } from "./firebase-config.js";
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------------- PRODUTOS ---------------- */

export async function listarProdutos() {
  const snap = await getDocs(query(collection(db, "produtos"), orderBy("nome")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Escuta produtos em tempo real (usado na loja para refletir estoque ao vivo). */
export function escutarProdutos(callback) {
  return onSnapshot(query(collection(db, "produtos"), orderBy("nome")), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function criarProduto(produto) {
  return addDoc(collection(db, "produtos"), { ...produto, criadoEm: serverTimestamp() });
}

export async function atualizarProduto(id, campos) {
  return updateDoc(doc(db, "produtos", id), campos);
}

export async function excluirProduto(id) {
  return deleteDoc(doc(db, "produtos", id));
}

/** Decrementa estoque ao confirmar um pedido (chamado por item do carrinho). */
export async function ajustarEstoque(produtoId, quantidadeDelta) {
  return updateDoc(doc(db, "produtos", produtoId), { estoque: increment(quantidadeDelta) });
}

/* ---------------- CATEGORIAS ---------------- */

export async function listarCategorias() {
  const snap = await getDocs(collection(db, "categorias"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function criarCategoria(categoria) {
  return addDoc(collection(db, "categorias"), categoria);
}

export async function excluirCategoria(id) {
  return deleteDoc(doc(db, "categorias", id));
}

/* ---------------- CUPONS ---------------- */

export async function buscarCupomPorCodigo(codigo) {
  const snap = await getDocs(query(collection(db, "cupons"), where("codigo", "==", codigo.toUpperCase())));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function listarCupons() {
  const snap = await getDocs(collection(db, "cupons"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function criarCupom(cupom) {
  return addDoc(collection(db, "cupons"), { ...cupom, codigo: cupom.codigo.toUpperCase() });
}

export async function atualizarCupom(id, campos) {
  return updateDoc(doc(db, "cupons", id), campos);
}

export async function excluirCupom(id) {
  return deleteDoc(doc(db, "cupons", id));
}

/* ---------------- PEDIDOS ---------------- */

export async function criarPedido(pedido) {
  const ref = await addDoc(collection(db, "pedidos"), {
    ...pedido,
    status: "recebido",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });
  return ref.id;
}

export async function buscarPedido(id) {
  const snap = await getDoc(doc(db, "pedidos", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Busca pedido pelo código único (usado na retirada / leitura de QR Code). */
export async function buscarPedidoPorCodigo(codigoUnico) {
  const snap = await getDocs(query(collection(db, "pedidos"), where("codigoUnico", "==", codigoUnico)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function listarPedidosDoAluno(alunoUid) {
  const snap = await getDocs(query(collection(db, "pedidos"), where("alunoUid", "==", alunoUid), orderBy("criadoEm", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listarTodosPedidos() {
  const snap = await getDocs(query(collection(db, "pedidos"), orderBy("criadoEm", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Escuta em tempo real o status de UM pedido (tela de ticket do aluno). */
export function escutarPedido(id, callback) {
  return onSnapshot(doc(db, "pedidos", id), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

/** Escuta em tempo real TODOS os pedidos (painel admin / kanban). */
export function escutarTodosPedidos(callback) {
  return onSnapshot(query(collection(db, "pedidos"), orderBy("criadoEm", "desc")), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function atualizarStatusPedido(id, novoStatus) {
  return updateDoc(doc(db, "pedidos", id), { status: novoStatus, atualizadoEm: serverTimestamp() });
}

/** Marca o pedido como ENTREGUE de forma atômica ao validar QR/código (impede reuso). */
export async function validarRetirada(pedidoId) {
  const ref = doc(db, "pedidos", pedidoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, motivo: "Pedido não encontrado." };
  const pedido = snap.data();
  if (pedido.status === "entregue") return { ok: false, motivo: "Este ticket já foi utilizado.", pedido };
  await updateDoc(ref, { status: "entregue", atualizadoEm: serverTimestamp(), retiradoEm: serverTimestamp() });
  return { ok: true, pedido: { ...pedido, status: "entregue" } };
}
