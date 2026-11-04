/* ============================================================
   GFCCE - Gerador de PIX (BR Code / "Copia e Cola")
   Implementa o padrão EMV do Banco Central para PIX estático
   com valor fixo, sem depender de nenhum gateway ou backend.
   Qualquer app de banco consegue ler o QR Code / colar o código
   gerado aqui e pagar direto na chave PIX configurada.
   Referência: Manual de Padrões para Iniciação do Pix (BACEN).
   ============================================================ */

/** Remove acentos e caracteres fora do padrão ASCII exigido pelo PIX. */
function normalizarTexto(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^\x20-\x7E]/g, "")     // remove qualquer caractere não-ASCII restante
    .toUpperCase();
}

/** Monta um campo no formato TLV (ID + Tamanho com 2 dígitos + Valor), exigido pelo padrão EMV. */
function tlv(id, valor) {
  const tamanho = String(valor.length).padStart(2, "0");
  return `${id}${tamanho}${valor}`;
}

/** Calcula o checksum CRC16-CCITT (polinômio 0x1021, inicial 0xFFFF) exigido no final do payload PIX. */
function crc16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Gera o payload completo do PIX (string usada tanto no QR Code quanto no "Copia e Cola").
 * @param {{chave:string, nomeRecebedor:string, cidade:string, valor:number, txid:string}} dados
 */
export function gerarPayloadPix({ chave, nomeRecebedor, cidade, valor, txid }) {
  const nome = normalizarTexto(nomeRecebedor).slice(0, 25);
  const cidadeNormalizada = normalizarTexto(cidade).slice(0, 15);
  // txid só pode ter caracteres alfanuméricos, até 25 caracteres.
  const txidLimpo = (txid || "***").replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "***";

  const infoConta = tlv("00", "br.gov.bcb.pix") + tlv("01", chave);
  const dadosAdicionais = tlv("05", txidLimpo);

  let payload =
    tlv("00", "01") +                       // Payload Format Indicator
    tlv("01", "11") +                       // Método de Iniciação (11 = estático)
    tlv("26", infoConta) +                  // Merchant Account Information (dados do PIX)
    tlv("52", "0000") +                     // Merchant Category Code
    tlv("53", "986") +                      // Moeda (986 = Real brasileiro)
    tlv("54", Number(valor).toFixed(2)) +   // Valor da cobrança
    tlv("58", "BR") +                       // País
    tlv("59", nome) +                       // Nome do recebedor
    tlv("60", cidadeNormalizada) +          // Cidade do recebedor
    tlv("62", dadosAdicionais) +            // Identificador da transação (txid)
    "6304";                                 // Início do campo de checksum (ID + tamanho fixos)

  return payload + crc16(payload);
}
