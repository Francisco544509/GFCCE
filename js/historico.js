/* ============================================================
   GFCCE - Histórico de compras e favoritos
   ============================================================ */

import { exigirAluno } from "./auth-guard.js";
import { montarNavbar } from "../components/navbar.js";
import { listarPedidosDoAluno, listarProdutos } from "./firebase/firestore.js";
import { formatarMoeda, formatarDataHora } from "./utils/helpers.js";

exigirAluno(async (user, perfil) => {
  montarNavbar("historico", perfil);

  const painelPedidos = document.getElementById("painel-pedidos");
  const painelFavoritos = document.getElementById("painel-favoritos");

  document.querySelectorAll("[data-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelector(".chip.ativo")?.classList.remove("ativo");
      tab.classList.add("ativo");
      painelPedidos.classList.toggle("hidden", tab.dataset.tab !== "pedidos");
      painelFavoritos.classList.toggle("hidden", tab.dataset.tab !== "favoritos");
    });
  });

  // ---------- Histórico ----------
  const pedidos = await listarPedidosDoAluno(user.uid);
  if (!pedidos.length) {
    painelPedidos.innerHTML = `<div class="vazio"><i class="fa-solid fa-receipt"></i><h3>Você ainda não fez pedidos</h3><p>Seus pedidos aparecerão aqui.</p></div>`;
  } else {
    painelPedidos.innerHTML = pedidos.map(p => `
      <a href="ticket.html?pedido=${p.id}" class="pedido-item">
        <div class="esq">
          <span class="num">${p.numeroPedido}</span>
          <span class="meta">${formatarDataHora(p.criadoEm)} · ${p.itens.length} ${p.itens.length === 1 ? "item" : "itens"}</span>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700; color:var(--laranja-600);">${formatarMoeda(p.total)}</div>
          <span class="badge badge-${p.status}">${p.status}</span>
        </div>
      </a>
    `).join("");
  }

  // ---------- Favoritos ----------
  const favoritosIds = perfil.favoritos || [];
  if (!favoritosIds.length) {
    painelFavoritos.innerHTML = `<div class="vazio"><i class="fa-solid fa-heart"></i><h3>Nenhum favorito ainda</h3><p>Toque no coração de um produto na loja para salvá-lo aqui.</p></div>`;
  } else {
    const todosProdutos = await listarProdutos();
    const favoritos = todosProdutos.filter(p => favoritosIds.includes(p.id));
    painelFavoritos.innerHTML = favoritos.map(p => `
      <div class="pedido-item">
        <div class="esq">
          <span class="num">${p.nome}</span>
          <span class="meta">${p.descricao || ""}</span>
        </div>
        <div style="font-weight:700; color:var(--laranja-600);">${formatarMoeda(p.precoPromocional || p.preco)}</div>
      </div>
    `).join("");
  }
});
