/* ============================================================
   GFCCE - Componente: Sidebar do Admin
   Reutilizado em dashboard, produtos, pedidos, retirada e relatórios.
   ============================================================ */

import { iniciais } from "../js/utils/helpers.js";
import { logout } from "../js/firebase/auth.js";

const ITENS_MENU = [
  { href: "dashboard.html", icone: "fa-chart-line", label: "Dashboard", chave: "dashboard" },
  { href: "pedidos.html", icone: "fa-receipt", label: "Pedidos", chave: "pedidos" },
  { href: "retirada.html", icone: "fa-qrcode", label: "Retirada", chave: "retirada" },
  { href: "produtos.html", icone: "fa-box", label: "Produtos e Promoções", chave: "produtos" },
  { href: "relatorios.html", icone: "fa-file-export", label: "Relatórios", chave: "relatorios" },
];

/** Monta a sidebar do admin + topbar mobile com botão de abrir/fechar. */
export function montarSidebarAdmin(paginaAtiva, perfil) {
  const overlay = document.createElement("div");
  overlay.id = "overlay-sidebar";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,42,71,0.4);z-index:150;display:none;";

  const sidebar = document.createElement("aside");
  sidebar.className = "admin-sidebar";
  sidebar.id = "admin-sidebar";
  sidebar.innerHTML = `
    <div class="marca" style="color:#fff; margin-bottom: var(--sp-5);">
      <span class="marca-icone"><i class="fa-solid fa-utensils"></i></span>
      GFCCE <small style="color:rgba(255,255,255,0.6);">Painel Admin</small>
    </div>
    ${ITENS_MENU.map(item => `
      <a href="${item.href}" class="${item.chave === paginaAtiva ? "ativo" : ""}">
        <i class="fa-solid ${item.icone}"></i> ${item.label}
      </a>`).join("")}
    <div style="margin-top:auto; padding-top: var(--sp-5); border-top:1px solid rgba(255,255,255,0.1);">
      <div style="display:flex; align-items:center; gap:10px; color:#fff; margin-bottom:12px; font-size:0.85rem;">
        <span class="avatar-fallback" style="width:34px;height:34px;font-size:0.75rem;">${iniciais(perfil?.nome)}</span>
        ${perfil?.nome || "Administrador"}
      </div>
      <a href="#" id="btn-sair-admin"><i class="fa-solid fa-right-from-bracket"></i> Sair</a>
    </div>`;

  // IMPORTANTE: a sidebar precisa ficar DENTRO do mesmo container flex (.admin-shell)
  // que o conteúdo da página (<main class="admin-content">), senão o layout quebra.
  // Por isso movemos todo o conteúdo que já existia no <body> para dentro do shell,
  // junto com a sidebar.
  const shell = document.createElement("div");
  shell.className = "admin-shell";
  while (document.body.firstChild) {
    shell.appendChild(document.body.firstChild);
  }
  shell.prepend(sidebar);
  document.body.appendChild(shell);
  document.body.appendChild(overlay);

  document.getElementById("btn-sair-admin").addEventListener("click", async (e) => {
    e.preventDefault();
    await logout();
    window.location.href = "login-admin.html";
  });

  overlay.addEventListener("click", () => fecharSidebarMobile());

  return { abrirSidebarMobile, fecharSidebarMobile };
}

export function abrirSidebarMobile() {
  document.getElementById("admin-sidebar")?.classList.add("aberta");
  const overlay = document.getElementById("overlay-sidebar");
  if (overlay) overlay.style.display = "block";
}
export function fecharSidebarMobile() {
  document.getElementById("admin-sidebar")?.classList.remove("aberta");
  const overlay = document.getElementById("overlay-sidebar");
  if (overlay) overlay.style.display = "none";
}
