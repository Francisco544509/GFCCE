/* ============================================================
   GFCCE - Admin: Produtos, Categorias e Cupons
   ============================================================ */

import { exigirAdmin } from "../auth-guard.js";
import { montarSidebarAdmin, abrirSidebarMobile } from "../../components/admin-sidebar.js";
import {
  listarProdutos, criarProduto, atualizarProduto, excluirProduto,
  listarCategorias, criarCategoria, excluirCategoria,
  listarCupons, criarCupom, excluirCupom
} from "../firebase/firestore.js";
import { formatarMoeda, toast, debounce } from "../utils/helpers.js";

let TODOS_PRODUTOS = [];
let TODAS_CATEGORIAS = [];
let produtoEditandoId = null;
let termoBusca = "";
let categoriaFiltro = "todas";

exigirAdmin(async (user, perfil) => {
  montarSidebarAdmin("produtos", perfil);
  document.getElementById("btn-abrir-menu")?.addEventListener("click", abrirSidebarMobile);

  await carregarCategorias();
  await carregarProdutos();
  await carregarCupons();

  ligarTabs();
  ligarModais();
});

/* ---------------- Tabs ---------------- */
function ligarTabs() {
  document.querySelectorAll("[data-painel]").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelector(".chip.ativo")?.classList.remove("ativo");
      chip.classList.add("ativo");
      ["produtos", "categorias", "cupons"].forEach(nome =>
        document.getElementById(`painel-${nome}`).classList.toggle("hidden", nome !== chip.dataset.painel));
    });
  });
}

/* ---------------- Produtos ---------------- */
async function carregarProdutos() {
  TODOS_PRODUTOS = await listarProdutos();
  renderProdutos();
}

function renderProdutos() {
  const filtrados = TODOS_PRODUTOS.filter(p => {
    const passaBusca = !termoBusca || p.nome.toLowerCase().includes(termoBusca);
    const passaCategoria = categoriaFiltro === "todas" || p.categoria === categoriaFiltro;
    return passaBusca && passaCategoria;
  });

  const tbody = document.getElementById("tbody-produtos");
  if (!filtrados.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="vazio"><i class="fa-solid fa-box-open"></i><h3>Nenhum produto cadastrado</h3><p>Clique em "Novo produto" para começar.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtrados.map(p => `
    <tr>
      <td>${p.imagemUrl ? `<img src="${p.imagemUrl}" class="miniatura-tabela" alt="${p.nome}" />` : `<div class="miniatura-tabela"></div>`}</td>
      <td><strong>${p.nome}</strong><br><span style="color:var(--cinza-600); font-size:0.78rem;">${(p.descricao || "").slice(0, 40)}</span></td>
      <td>${p.categoria || "-"}</td>
      <td>${p.precoPromocional ? `<span style="text-decoration:line-through; color:var(--cinza-600); font-size:0.78rem;">${formatarMoeda(p.preco)}</span> <strong style="color:var(--laranja-600);">${formatarMoeda(p.precoPromocional)}</strong>` : formatarMoeda(p.preco)}</td>
      <td>
        <input type="number" min="0" value="${p.estoque ?? 0}" data-estoque="${p.id}" style="width:70px; padding:6px; border-radius:6px; border:1px solid var(--cinza-300);" />
      </td>
      <td class="acoes-tabela">
        <button data-editar="${p.id}" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="perigo" data-excluir="${p.id}" aria-label="Excluir"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-editar]").forEach(b => b.onclick = () => abrirModalProduto(b.dataset.editar));
  tbody.querySelectorAll("[data-excluir]").forEach(b => b.onclick = () => confirmarExclusaoProduto(b.dataset.excluir));
  tbody.querySelectorAll("[data-estoque]").forEach(input => {
    input.addEventListener("change", async () => {
      await atualizarProduto(input.dataset.estoque, { estoque: Number(input.value) });
      toast("Estoque atualizado.", "sucesso", 1600);
      const prod = TODOS_PRODUTOS.find(p => p.id === input.dataset.estoque);
      if (prod) prod.estoque = Number(input.value);
    });
  });
}

document.getElementById("busca-produto").addEventListener("input", debounce((e) => {
  termoBusca = e.target.value.trim().toLowerCase();
  renderProdutos();
}, 200));

document.getElementById("filtro-categoria-produto").addEventListener("change", (e) => {
  categoriaFiltro = e.target.value;
  renderProdutos();
});

function abrirModalProduto(id = null) {
  if (!TODAS_CATEGORIAS.length) {
    toast("Cadastre pelo menos uma categoria antes de criar um produto (aba \"Categorias\").", "alerta", 4500);
    return;
  }

  produtoEditandoId = id;
  const modal = document.getElementById("modal-produto");
  const selectCategoria = document.getElementById("p-categoria");
  selectCategoria.innerHTML = TODAS_CATEGORIAS.map(c => `<option value="${c.nome}">${c.nome}</option>`).join("");

  if (id) {
    const p = TODOS_PRODUTOS.find(x => x.id === id);
    document.getElementById("titulo-modal-produto").textContent = "Editar produto";
    document.getElementById("p-imagem").value = p.imagemUrl || "";
    document.getElementById("p-nome").value = p.nome || "";
    document.getElementById("p-descricao").value = p.descricao || "";
    document.getElementById("p-categoria").value = p.categoria || "";
    document.getElementById("p-estoque").value = p.estoque ?? 0;
    document.getElementById("p-preco").value = p.preco ?? 0;
    document.getElementById("p-preco-promo").value = p.precoPromocional ?? "";
  } else {
    document.getElementById("titulo-modal-produto").textContent = "Novo produto";
    document.getElementById("form-produto").reset();
  }
  modal.classList.add("aberto");
}

function confirmarExclusaoProduto(id) {
  if (!confirm("Tem certeza que deseja excluir este produto? Essa ação não pode ser desfeita.")) return;
  excluirProduto(id).then(() => {
    toast("Produto excluído.", "sucesso");
    carregarProdutos();
  });
}

document.getElementById("btn-novo-produto").addEventListener("click", () => abrirModalProduto());

document.getElementById("form-produto").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btn-salvar-produto");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner-azul"></span> Salvando...';

  const dados = {
    nome: document.getElementById("p-nome").value.trim(),
    descricao: document.getElementById("p-descricao").value.trim(),
    categoria: document.getElementById("p-categoria").value,
    estoque: Number(document.getElementById("p-estoque").value),
    preco: Number(document.getElementById("p-preco").value),
    precoPromocional: document.getElementById("p-preco-promo").value ? Number(document.getElementById("p-preco-promo").value) : null,
    imagemUrl: document.getElementById("p-imagem").value.trim()
  };

  try {
    if (produtoEditandoId) await atualizarProduto(produtoEditandoId, dados);
    else await criarProduto(dados);
    toast("Produto salvo com sucesso!", "sucesso");
    document.getElementById("modal-produto").classList.remove("aberto");
    await carregarProdutos();
  } catch (err) {
    console.error(err);
    toast("Não foi possível salvar o produto.", "erro");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Salvar produto";
  }
});

/* ---------------- Categorias ---------------- */
async function carregarCategorias() {
  TODAS_CATEGORIAS = await listarCategorias();
  renderCategorias();
  document.getElementById("filtro-categoria-produto").innerHTML =
    `<option value="todas">Todas categorias</option>` + TODAS_CATEGORIAS.map(c => `<option value="${c.nome}">${c.nome}</option>`).join("");
}

function renderCategorias() {
  const tbody = document.getElementById("tbody-categorias");
  if (!TODAS_CATEGORIAS.length) {
    tbody.innerHTML = `<tr><td colspan="2"><div class="vazio"><i class="fa-solid fa-tags"></i><h3>Nenhuma categoria cadastrada</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = TODAS_CATEGORIAS.map(c => `
    <tr><td>${c.nome}</td><td class="acoes-tabela"><button class="perigo" data-del-cat="${c.id}"><i class="fa-solid fa-trash"></i></button></td></tr>
  `).join("");
  tbody.querySelectorAll("[data-del-cat]").forEach(b => b.onclick = async () => {
    if (!confirm("Excluir esta categoria?")) return;
    await excluirCategoria(b.dataset.delCat);
    toast("Categoria excluída.", "sucesso");
    await carregarCategorias();
  });
}

document.getElementById("btn-add-categoria").addEventListener("click", async () => {
  const input = document.getElementById("input-nova-categoria");
  const nome = input.value.trim();
  if (!nome) return;
  await criarCategoria({ nome });
  input.value = "";
  toast("Categoria adicionada!", "sucesso");
  await carregarCategorias();
});

/* ---------------- Cupons ---------------- */
async function carregarCupons() {
  const cupons = await listarCupons();
  const tbody = document.getElementById("tbody-cupons");
  if (!cupons.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="vazio"><i class="fa-solid fa-tag"></i><h3>Nenhum cupom cadastrado</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = cupons.map(c => `
    <tr>
      <td><strong>${c.codigo}</strong></td>
      <td>${c.tipo === "percentual" ? "Percentual" : "Valor fixo"}</td>
      <td>${c.tipo === "percentual" ? c.valor + "%" : formatarMoeda(c.valor)}</td>
      <td><span class="badge badge-${c.ativo !== false ? "entregue" : "cancelado"}">${c.ativo !== false ? "Ativo" : "Inativo"}</span></td>
      <td class="acoes-tabela"><button class="perigo" data-del-cupom="${c.id}"><i class="fa-solid fa-trash"></i></button></td>
    </tr>
  `).join("");
  tbody.querySelectorAll("[data-del-cupom]").forEach(b => b.onclick = async () => {
    if (!confirm("Excluir este cupom?")) return;
    await excluirCupom(b.dataset.delCupom);
    toast("Cupom excluído.", "sucesso");
    await carregarCupons();
  });
}

document.getElementById("btn-novo-cupom").addEventListener("click", () => document.getElementById("modal-cupom").classList.add("aberto"));

document.getElementById("form-cupom").addEventListener("submit", async (e) => {
  e.preventDefault();
  await criarCupom({
    codigo: document.getElementById("c-codigo").value.trim(),
    tipo: document.getElementById("c-tipo").value,
    valor: Number(document.getElementById("c-valor").value),
    ativo: true
  });
  toast("Cupom criado!", "sucesso");
  document.getElementById("modal-cupom").classList.remove("aberto");
  document.getElementById("form-cupom").reset();
  await carregarCupons();
});

/* ---------------- Modais (fechar) ---------------- */
function ligarModais() {
  document.querySelectorAll("[data-fechar-modal]").forEach(btn => {
    btn.addEventListener("click", () => document.getElementById(btn.dataset.fecharModal).classList.remove("aberto"));
  });
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("aberto"); });
  });
}
