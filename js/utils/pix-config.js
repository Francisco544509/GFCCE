/* ============================================================
   GFCCE - Configuração do PIX (recebedor real)
   ------------------------------------------------------------
   Dados usados para gerar o QR Code / código "Copia e Cola" do
   PIX na tela de pagamento. Como é uma chave ALEATÓRIA, ela não
   é secreta (serve justamente para receber pagamentos) — mas
   ainda assim é o dinheiro caindo na conta bancária pessoal
   configurada aqui.

   Para trocar de recebedor no futuro, basta editar os 3 campos
   abaixo. Nada mais no projeto precisa mudar.
   ============================================================ */

export const PIX_CONFIG = {
  chave: "b4807dd8-4258-4a67-8298-7abfba79c18a", // chave aleatória (UUID) cadastrada no banco
  nomeRecebedor: "FRANCISCO DE O R NETO",         // como está registrado na conta bancária (máx. 25 caracteres)
  cidade: "LINHARES"                              // cidade da conta bancária (máx. 15 caracteres)
};
