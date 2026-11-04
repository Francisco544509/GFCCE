/* ============================================================
   GFCCE - Autenticação
   Cadastro, login, logout, recuperação de senha e leitura do
   perfil do usuário (role: 'aluno' | 'admin').
   ============================================================ */

import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Cadastra um novo aluno (Authentication + documento em /usuarios).
 * @param {{nome:string, email:string, senha:string, turma:string, matricula:string, fotoBase64?:string}} dados
 */
export async function cadastrarAluno(dados) {
  const cred = await createUserWithEmailAndPassword(auth, dados.email, dados.senha);
  await updateProfile(cred.user, { displayName: dados.nome });

  await setDoc(doc(db, "usuarios", cred.user.uid), {
    nome: dados.nome,
    email: dados.email,
    turma: dados.turma,
    matricula: dados.matricula,
    fotoBase64: dados.fotoBase64 || null,
    role: "aluno",
    favoritos: [],
    criadoEm: serverTimestamp()
  });

  return cred.user;
}

/** Login por e-mail e senha (usado tanto por aluno quanto admin). */
export async function login(email, senha) {
  const cred = await signInWithEmailAndPassword(auth, email, senha);
  return cred.user;
}

/** Encerra a sessão do usuário atual. */
export async function logout() {
  await signOut(auth);
}

/** Envia e-mail de recuperação de senha. */
export async function recuperarSenha(email) {
  await sendPasswordResetEmail(auth, email);
}

/** Retorna o documento de perfil (Firestore) do usuário autenticado. */
export async function buscarPerfil(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Atualiza campos do perfil do usuário no Firestore. */
export async function atualizarPerfil(uid, campos) {
  await updateDoc(doc(db, "usuarios", uid), campos);
}

/**
 * Observa o estado de autenticação. Chama callback(user, perfil) sempre
 * que o usuário loga/desloga. perfil vem do Firestore (com o "role").
 */
export function observarAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return callback(null, null);
    const perfil = await buscarPerfil(user.uid);
    callback(user, perfil);
  });
}
