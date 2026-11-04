/* ============================================================
   GFCCE - Loja
   Lista produtos em tempo real, permite busca, filtro por
   categoria, favoritar e adicionar ao carrinho.
   ============================================================ */

import { exigirAluno } from "./auth-guard.js";
import { escutarProdutos, listarCategorias } from "./firebase/firestore.js";
import { atualizarPerfil } from "./firebase/auth.js";
import { adicionarAoCarrinho, obterQuantidadeCarrinho } from "./carrinho.js";
import { formatarMoeda, toast, debounce, alternarNoArray } from "./utils/helpers.js";
import { montarNavbar } from "../components/navbar.js";

let TODOS_PRODUTOS = [];
let categoriaAtiva = "todas";
let termoBusca = "";
let perfilAtual = null;
let userUid = null;

const grid = document.getElementById("grid-produtos");
const listaCategorias = document.getElementById("lista-categorias");
const barraFlutuante = document.getElementById("barra-carrinho-flutuante");

exigirAluno((user, perfil) => {
  userUid = user.uid;
  perfilAtual = perfil;
  montarNavbar("loja", perfil, { mostrarBusca: true, aoBuscar: debounce(onBuscar, 250) });
  document.getElementById("saudacao-nome").textContent = perfil.nome.split(" ")[0];

  carregarCategorias();
  escutarProdutos((produtos) => {
    TODOS_PRODUTOS = produtos;
    renderizarProdutos();
  });

  atualizarBarraFlutuante();
});

async function carregarCategorias() {
  const categorias = await listarCategorias();
  const nomes = categorias.length
    ? categorias.map(c => c.nome)
    : ["Salgados", "Doces", "Bebidas", "Combos", "Lanches"]; // fallback enquanto o admin não cadastra

  listaCategorias.innerHTML = `<button class="chip ativo" data-cat="todas">Todas</button>` +
    nomes.map(n => `<button class="chip" data-cat="${n}">${n}</button>`).join("");

  listaCategorias.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      listaCategorias.querySelector(".ativo")?.classList.remove("ativo");
      chip.classList.add("ativo");
      categoriaAtiva = chip.dataset.cat;
      renderizarProdutos();
    });
  });
}

function onBuscar(valor) {
  termoBusca = valor.trim().toLowerCase();
  renderizarProdutos();
}

function renderizarProdutos() {
  const filtrados = TODOS_PRODUTOS.filter(p => {
    const passaCategoria = categoriaAtiva === "todas" || p.categoria === categoriaAtiva;
    const passaBusca = !termoBusca || p.nome.toLowerCase().includes(termoBusca) || (p.descricao || "").toLowerCase().includes(termoBusca);
    return passaCategoria && passaBusca;
  });

  if (!filtrados.length) {
    grid.innerHTML = `<div class="vazio" style="grid-column:1/-1;">
      <i class="fa-solid fa-magnifying-glass"></i>
      <h3>Nenhum produto encontrado</h3>
      <p>Tente buscar por outro termo ou categoria.</p>
    </div>`;
    return;
  }

  grid.innerHTML = filtrados.map(produtoCardHtml).join("");

  grid.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const produto = TODOS_PRODUTOS.find(p => p.id === btn.dataset.add);
      adicionarAoCarrinho(produto, 1);
      toast(`${produto.nome} adicionado ao carrinho!`, "sucesso", 1800);
      atualizarBarraFlutuante();
      atualizarContadorHeader();
    });
  });

  grid.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.fav;
      const favoritos = alternarNoArray(perfilAtual.favoritos || [], id);
      perfilAtual.favoritos = favoritos;
      btn.classList.toggle("ativo");
      await atualizarPerfil(userUid, { favoritos });
    });
  });
}

function produtoCardHtml(p) {
  const semEstoque = (p.estoque ?? 0) <= 0;
  const favoritado = (perfilAtual?.favoritos || []).includes(p.id);
  const temPromo = p.precoPromocional && p.precoPromocional < p.preco;
  return `
  <div class="produto-card hover-elevar fade-up">
    <div class="produto-img">
      ${p.imagemUrl ? `<img src="${p.imagemUrl}" alt="${p.nome}" loading="lazy" />` : `<div class="skeleton" style="width:100%;height:100%;"></div>`}
      ${temPromo ? `<span class="badge-promo">PROMOÇÃO</span>` : ""}
      <button class="fav-btn ${favoritado ? "ativo" : ""}" data-fav="${p.id}" aria-label="Favoritar"><i class="fa-solid fa-heart"></i></button>
      ${semEstoque ? `<div class="badge-esgotado">Esgotado</div>` : ""}
    </div>
    <div class="produto-info">
      <h3>${p.nome}</h3>
      <p class="desc">${p.descricao || ""}</p>
      <div class="produto-preco-linha">
        <span class="produto-preco">
          ${temPromo ? `<span class="de">${formatarMoeda(p.preco)}</span>` : ""}
          ${formatarMoeda(temPromo ? p.precoPromocional : p.preco)}
        </span>
        <button class="btn-add-mini" data-add="${p.id}" ${semEstoque ? "disabled" : ""} aria-label="Adicionar ao carrinho">
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
    </div>
  </div>`;
}

function atualizarBarraFlutuante() {
  const qtd = obterQuantidadeCarrinho();
  if (qtd > 0) {
    barraFlutuante.classList.remove("hidden");
    barraFlutuante.querySelector(".texto-qtd").textContent = `${qtd} ${qtd === 1 ? "item" : "itens"} no carrinho`;
  } else {
    barraFlutuante.classList.add("hidden");
  }
}

function atualizarContadorHeader() {
  const qtd = obterQuantidadeCarrinho();
  document.querySelectorAll(".header .contador, .bottom-nav .contador").forEach(el => el.remove());
  const iconeCarrinhoHeader = document.querySelector('.header-acoes a[href="carrinho.html"]');
  const linkCarrinhoNav = document.querySelector('.bottom-nav a[href="carrinho.html"]');
  if (qtd > 0) {
    if (iconeCarrinhoHeader) iconeCarrinhoHeader.insertAdjacentHTML("beforeend", `<span class="contador">${qtd}</span>`);
    if (linkCarrinhoNav) linkCarrinhoNav.insertAdjacentHTML("beforeend", `<span class="contador">${qtd}</span>`);
  }
}

barraFlutuante?.addEventListener("click", () => window.location.href = "carrinho.html");
