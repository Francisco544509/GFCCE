/* ============================================================
   GFCCE - Notificações
   Observa o status de um pedido em tempo real e avisa o aluno
   (notificação do navegador + toast + som) quando o lanche fica
   PRONTO para retirada.
   ============================================================ */

import { escutarPedido } from "../firebase/firestore.js";
import { toast } from "./helpers.js";

/** Pede permissão de notificação do navegador (chamar em uma interação do usuário). */
export async function pedirPermissaoNotificacao() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "default") {
    return Notification.requestPermission();
  }
  return Notification.permission;
}

function tocarSomAviso() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch (e) { /* ambiente sem suporte a áudio: ignora silenciosamente */ }
}

const MENSAGENS_STATUS = {
  recebido: "Seu pedido foi recebido pela cantina! 🎉",
  preparando: "A cantina já está preparando seu pedido 👩‍🍳",
  pronto: "Seu lanche está PRONTO! Pode vir retirar 🥪✅",
  entregue: "Pedido retirado. Bom apetite!",
  cancelado: "Seu pedido foi cancelado pela cantina."
};

/**
 * Observa um pedido específico e dispara notificação quando o status muda.
 * Retorna a função de "unsubscribe" do listener.
 */
export function observarStatusPedido(pedidoId, aoAtualizar) {
  let statusAnterior = null;
  return escutarPedido(pedidoId, (pedido) => {
    if (statusAnterior && statusAnterior !== pedido.status) {
      const msg = MENSAGENS_STATUS[pedido.status] || "Status do pedido atualizado.";
      const tipo = pedido.status === "pronto" ? "sucesso" : pedido.status === "cancelado" ? "erro" : "info";
      toast(msg, tipo);
      if (pedido.status === "pronto") {
        tocarSomAviso();
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("GFCCE - Cantina da Escola", { body: msg, icon: new URL("../../icons/favicon.svg", import.meta.url).href });
        }
      }
    }
    statusAnterior = pedido.status;
    aoAtualizar(pedido);
  });
}
