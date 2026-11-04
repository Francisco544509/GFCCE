/* ============================================================
   GFCCE - Edição de perfil
   ============================================================ */

import { exigirAluno } from "./auth-guard.js";
import { montarNavbar } from "../components/navbar.js";
import { atualizarPerfil, logout } from "./firebase/auth.js";
import { toast, imagemParaBase64 } from "./utils/helpers.js";

let userUid = null;
let fotoBase64Atual = null;

exigirAluno((user, perfil) => {
  userUid = user.uid;
  montarNavbar("perfil", perfil);

  document.getElementById("nome").value = perfil.nome || "";
  document.getElementById("turma").value = perfil.turma || "";
  document.getElementById("matricula").value = perfil.matricula || "";
  document.getElementById("email").value = perfil.email || "";
  fotoBase64Atual = perfil.fotoBase64 || null;
  if (fotoBase64Atual) {
    document.getElementById("preview-foto").innerHTML = `<img src="${fotoBase64Atual}" alt="Sua foto" />`;
  }
});

document.getElementById("btn-escolher-foto").addEventListener("click", () => document.getElementById("input-foto").click());
document.getElementById("input-foto").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  fotoBase64Atual = await imagemParaBase64(file);
  document.getElementById("preview-foto").innerHTML = `<img src="${fotoBase64Atual}" alt="Sua foto" />`;
});

document.getElementById("form-perfil").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btn-salvar");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Salvando...';
  try {
    await atualizarPerfil(userUid, {
      nome: document.getElementById("nome").value.trim(),
      turma: document.getElementById("turma").value.trim(),
      matricula: document.getElementById("matricula").value.trim(),
      fotoBase64: fotoBase64Atual
    });
    toast("Perfil atualizado com sucesso!", "sucesso");
  } catch (err) {
    toast("Não foi possível salvar. Tente novamente.", "erro");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Salvar alterações";
  }
});

document.getElementById("btn-sair").addEventListener("click", async () => {
  await logout();
  window.location.href = "login.html";
});
