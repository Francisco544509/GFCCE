/* ============================================================
   GFCCE - Funções auxiliares reutilizáveis
   ============================================================ */

/** Formata número para Real brasileiro. Ex: 7.5 -> "R$ 7,50" */
export function formatarMoeda(valor) {
  return (Number(valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Formata timestamp do Firestore (ou Date) para "dd/mm/aaaa às HH:MM" */
export function formatarDataHora(timestamp) {
  const data = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return data.toLocaleDateString("pt-BR") + " às " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatarData(timestamp) {
  const data = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return data.toLocaleDateString("pt-BR");
}

export function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Exibe um toast (notificação flutuante) no canto da tela. */
export function toast(mensagem, tipo = "info", duracaoMs = 3800) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const icones = { sucesso: "fa-circle-check", erro: "fa-circle-exclamation", alerta: "fa-triangle-exclamation", info: "fa-circle-info" };
  const el = document.createElement("div");
  el.className = `toast ${tipo}`;
  el.innerHTML = `<i class="fa-solid ${icones[tipo] || icones.info}"></i><span>${mensagem}</span><button class="fechar-toast" aria-label="Fechar">&times;</button>`;
  el.querySelector(".fechar-toast").onclick = () => el.remove();
  container.appendChild(el);
  setTimeout(() => el.remove(), duracaoMs);
}

/** Traduz mensagens de erro comuns do Firebase Auth para português amigável. */
export function traduzirErroFirebase(err) {
  const codigo = err?.code || "";
  const mapa = {
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "Não encontramos uma conta com este e-mail.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um instante e tente novamente."
  };
  return mapa[codigo] || "Ocorreu um erro. Tente novamente.";
}

/**
 * Comprime e converte uma imagem (File) em base64, redimensionando para
 * caber em um quadrado de até `maxLado` px — evita documentos grandes no
 * Firestore (limite de 1MB por documento) já que não usamos o Storage.
 */
export function imagemParaBase64(file, maxLado = 240, qualidade = 0.72) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = reject;
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * escala;
        canvas.height = img.height * escala;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      img.onerror = reject;
      img.src = leitor.result;
    };
    leitor.readAsDataURL(file);
  });
}

/** Debounce simples — usado na busca da loja. */
export function debounce(fn, atrasoMs = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), atrasoMs);
  };
}

/** Insere/remove item de um array de forma imutável (favoritos). */
export function alternarNoArray(arr, valor) {
  return arr.includes(valor) ? arr.filter(v => v !== valor) : [...arr, valor];
}

/** Iniciais do nome para avatar-fallback. Ex: "Maria Silva" -> "MS" */
export function iniciais(nome = "") {
  const partes = nome.trim().split(" ").filter(Boolean);
  if (!partes.length) return "?";
  return (partes[0][0] + (partes[1]?.[0] || "")).toUpperCase();
}
