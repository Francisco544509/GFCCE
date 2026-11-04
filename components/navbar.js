/* ============================================================
   GFCCE - Componente: Navbar (header + bottom nav do aluno)
   Reutilizado em loja.html, carrinho.html, historico.html, perfil.html
   ============================================================ */

import { iniciais } from "../js/utils/helpers.js";
import { obterQuantidadeCarrinho } from "../js/carrinho.js";

const ITENS_NAV = [
  { href: "loja.html", icone: "fa-store", label: "Loja", chave: "loja" },
  { href: "carrinho.html", icone: "fa-cart-shopping", label: "Carrinho", chave: "carrinho", contadorCarrinho: true },
  { href: "historico.html", icone: "fa-receipt", label: "Pedidos", chave: "historico" },
  { href: "perfil.html", icone: "fa-user", label: "Perfil", chave: "perfil" },
];

/**
 * Renderiza o header fixo + bottom nav mobile.
 * @param {string} paginaAtiva - chave da página atual ('loja' | 'carrinho' | 'historico' | 'perfil')
 * @param {object} perfil - perfil do aluno (nome, fotoBase64)
 * @param {object} opcoes - { mostrarBusca:boolean, aoBuscar:function }
 */
export function montarNavbar(paginaAtiva, perfil, opcoes = {}) {
  const qtdCarrinho = obterQuantidadeCarrinho();

  const header = document.createElement("header");
  header.className = "header";
  header.innerHTML = `
    <div class="container">
      <a href="loja.html" class="marca">
        <span class="marca-icone"><i class="fa-solid fa-utensils"></i></span>
        GFCCE <small>Cantina da Escola</small>
      </a>
      ${opcoes.mostrarBusca ? `
      <div class="busca-wrap">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="search" id="input-busca-global" placeholder="Buscar salgados, doces, bebidas..." />
      </div>` : `<span></span>`}
      <div class="header-acoes">
        <a href="carrinho.html" class="icone-btn" aria-label="Carrinho">
          <i class="fa-solid fa-cart-shopping"></i>
          ${qtdCarrinho > 0 ? `<span class="contador">${qtdCarrinho}</span>` : ""}
        </a>
        <a href="perfil.html" aria-label="Meu perfil">
          ${perfil?.fotoBase64
            ? `<img src="${perfil.fotoBase64}" class="avatar" alt="Foto de ${perfil.nome}" />`
            : `<span class="avatar-fallback">${iniciais(perfil?.nome)}</span>`}
        </a>
      </div>
    </div>`;

  const bottomNav = document.createElement("nav");
  bottomNav.className = "bottom-nav";
  bottomNav.innerHTML = ITENS_NAV.map(item => `
    <a href="${item.href}" class="${item.chave === paginaAtiva ? "ativo" : ""}">
      <i class="fa-solid ${item.icone}"></i>
      ${item.label}
      ${item.contadorCarrinho && qtdCarrinho > 0 ? `<span class="contador">${qtdCarrinho}</span>` : ""}
    </a>`).join("");

  document.body.prepend(header);
  document.body.appendChild(bottomNav);

  if (opcoes.mostrarBusca && opcoes.aoBuscar) {
    document.getElementById("input-busca-global").addEventListener("input", (e) => opcoes.aoBuscar(e.target.value));
  }
}
