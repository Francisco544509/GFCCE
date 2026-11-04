/* ============================================================
   GFCCE - Admin: Retirada de pedidos
   Lê o QR Code (ou código digitado), busca o pedido pelo código
   único e marca como ENTREGUE de forma atômica — impedindo reuso.
   ============================================================ */

import { exigirAdmin } from "../auth-guard.js";
import { montarSidebarAdmin, abrirSidebarMobile } from "../../components/admin-sidebar.js";
import { buscarPedidoPorCodigo, validarRetirada } from "../firebase/firestore.js";
import { formatarMoeda, toast } from "../utils/helpers.js";

let leitor = null;
let cameraLigada = false;
let processando = false;

exigirAdmin((user, perfil) => {
  montarSidebarAdmin("retirada", perfil);
  document.getElementById("btn-abrir-menu")?.addEventListener("click", abrirSidebarMobile);
});

document.getElementById("btn-toggle-camera").addEventListener("click", async () => {
  const btn = document.getElementById("btn-toggle-camera");
  if (!cameraLigada) {
    try {
      // eslint-disable-next-line no-undef
      leitor = new Html5Qrcode("leitor-qr");
      await leitor.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (textoDecodificado) => {
          if (processando) return;
          await processarCodigo(textoDecodificado.trim());
        },
        () => {} // erro de leitura de frame — ignorado silenciosamente
      );
      cameraLigada = true;
      btn.innerHTML = '<i class="fa-solid fa-stop"></i> Desligar câmera';
    } catch (err) {
      console.error(err);
      toast("Não foi possível acessar a câmera. Verifique as permissões do navegador.", "erro");
    }
  } else {
    await pararCamera();
    btn.innerHTML = '<i class="fa-solid fa-camera"></i> Ligar câmera e escanear';
  }
});

async function pararCamera() {
  if (leitor) {
    try { await leitor.stop(); await leitor.clear(); } catch (e) { /* já parado */ }
  }
  cameraLigada = false;
}

document.getElementById("form-codigo-manual").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("input-codigo-manual");
  const codigo = input.value.trim().toUpperCase();
  if (!codigo) return;
  await processarCodigo(codigo);
  input.value = "";
});

async function processarCodigo(codigo) {
  processando = true;
  try {
    const pedido = await buscarPedidoPorCodigo(codigo);
    if (!pedido) {
      renderResultado(false, "Código não encontrado. Verifique e tente novamente.");
      return;
    }
    const resultado = await validarRetirada(pedido.id);
    if (!resultado.ok) {
      renderResultado(false, resultado.motivo, pedido);
    } else {
      renderResultado(true, "Retirada confirmada com sucesso!", { ...pedido, ...resultado.pedido });
      if (cameraLigada) await pararCamera(); // evita re-leitura contínua do mesmo código
      document.getElementById("btn-toggle-camera").innerHTML = '<i class="fa-solid fa-camera"></i> Ligar câmera e escanear';
    }
  } catch (err) {
    console.error(err);
    renderResultado(false, "Erro ao validar o pedido. Tente novamente.");
  } finally {
    processando = false;
  }
}

function renderResultado(sucesso, mensagem, pedido = null) {
  const area = document.getElementById("area-resultado");
  area.innerHTML = `
    <div class="resultado-retirada ${sucesso ? "sucesso" : "erro"} pop-in">
      <i class="fa-solid ${sucesso ? "fa-circle-check" : "fa-triangle-exclamation"}"></i>
      <h3>${mensagem}</h3>
      ${pedido ? `
        <div style="text-align:left; margin-top:16px; background:var(--branco); border-radius:var(--raio-md); padding:14px 18px;">
          <div class="resumo-linha"><span>Pedido</span><span>${pedido.numeroPedido}</span></div>
          <div class="resumo-linha"><span>Aluno</span><span>${pedido.alunoNome}</span></div>
          <div class="resumo-linha"><span>Turma</span><span>${pedido.alunoTurma}</span></div>
          <div class="resumo-linha"><span>Total</span><span>${formatarMoeda(pedido.total)}</span></div>
        </div>` : ""}
    </div>`;
  if (sucesso) toast("Pedido entregue com sucesso!", "sucesso");
}
