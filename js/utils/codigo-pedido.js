/* ============================================================
   GFCCE - Geração de identificadores do pedido
   ============================================================ */

/**
 * Gera um número de pedido sequencial-amigável baseado na data/hora,
 * ex: "GF-0801-1432" (dia 08/01 às 14h32) — legível para o funcionário
 * chamar em voz alta, se precisar.
 */
export function gerarNumeroPedido() {
  const agora = new Date();
  const dd = String(agora.getDate()).padStart(2, "0");
  const mm = String(agora.getMonth() + 1).padStart(2, "0");
  const hh = String(agora.getHours()).padStart(2, "0");
  const mi = String(agora.getMinutes()).padStart(2, "0");
  const aleatorio = Math.floor(Math.random() * 90 + 10); // 2 dígitos p/ evitar colisão no mesmo minuto
  return `GF-${dd}${mm}-${hh}${mi}${aleatorio}`;
}

/**
 * Gera um código único alfanumérico (usado no QR Code e na validação
 * manual da retirada). Curto o bastante para digitar, longo o bastante
 * para não colidir.
 */
export function gerarCodigoUnico() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem O/0/I/1 para evitar confusão visual
  let codigo = "";
  for (let i = 0; i < 8; i++) {
    codigo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return codigo;
}
