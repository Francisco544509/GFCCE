/* ============================================================
   GFCCE - Configuração do Firebase
   ------------------------------------------------------------
   ATENÇÃO: Não vamos usar o Cloud Storage do Firebase (a partir
   de 03/02/2026 o Google passou a exigir o plano pago Blaze
   até para o bucket padrão). Por isso o GFCCE guarda:
     - foto de perfil do aluno -> base64 comprimido no Firestore
     - imagem dos produtos     -> URL externa (ex: ImgBB) salva
                                   como texto no Firestore
   Isso mantém o projeto 100% dentro do plano gratuito (Spark).

   >>> SUBSTITUA o objeto abaixo pelas credenciais do SEU projeto.
   Console Firebase > Configurações do projeto > Seus apps > Web.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ✅ Credenciais do projeto real do usuário (gfcce-1d985)
const firebaseConfig = {
  apiKey: "AIzaSyCU0_wW_BoUR30jkyl75tfzCcFdMEJ7T5s",
  authDomain: "gfcce-1d985.firebaseapp.com",
  projectId: "gfcce-1d985",
  storageBucket: "gfcce-1d985.firebasestorage.app",
  messagingSenderId: "79089386659",
  appId: "1:79089386659:web:cdf0f81f594d985d8ceb16"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
