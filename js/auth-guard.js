/* ============================================================
   GFCCE - Auth Guard
   Protege páginas conforme autenticação e papel do usuário.
   Uso: no topo do <script type="module"> de cada página, chamar
   exigirAluno() ou exigirAdmin(). Redireciona automaticamente
   quando não autorizado.
   ============================================================ */

import { observarAuth } from "./firebase/auth.js";

// URLs resolvidas a partir deste arquivo: funcionam tanto em localhost
// quanto em GitHub Pages (https://usuario.github.io/nome-do-repositorio/).
const CAMINHO_LOGIN = new URL("../pages/login.html", import.meta.url).href;
const CAMINHO_LOGIN_ADMIN = new URL("../pages/admin/login-admin.html", import.meta.url).href;
const CAMINHO_LOJA = new URL("../pages/loja.html", import.meta.url).href;
const CAMINHO_DASHBOARD_ADMIN = new URL("../pages/admin/dashboard.html", import.meta.url).href;

/** Garante que existe um usuário logado com role "aluno". Retorna {user, perfil} via callback. */
export function exigirAluno(callback) {
  return observarAuth((user, perfil) => {
    if (!user || !perfil) { window.location.href = CAMINHO_LOGIN; return; }
    if (perfil.role !== "aluno") { window.location.href = CAMINHO_DASHBOARD_ADMIN; return; }
    callback(user, perfil);
  });
}

/** Garante que existe um usuário logado com role "admin". */
export function exigirAdmin(callback) {
  return observarAuth((user, perfil) => {
    if (!user || !perfil) { window.location.href = CAMINHO_LOGIN_ADMIN; return; }
    if (perfil.role !== "admin") { window.location.href = CAMINHO_LOJA; return; }
    callback(user, perfil);
  });
}

/** Usado nas páginas de login/cadastro: se já estiver logado, redireciona direto. */
export function redirecionarSeLogado() {
  return observarAuth((user, perfil) => {
    if (user && perfil) {
      window.location.href = perfil.role === "admin" ? CAMINHO_DASHBOARD_ADMIN : CAMINHO_LOJA;
    }
  });
}
