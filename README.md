# GFCCE — Gerenciamento da Fila de Compras da Cantina da Escola

Sistema web para reduzir filas na cantina escolar. O aluno consulta produtos, monta o carrinho, realiza o pedido e recebe um ticket digital para retirada. A equipe da cantina acompanha pedidos e administra produtos pelo painel.

## Recursos

- Cadastro, login e recuperação de senha por e-mail.
- Perfil do aluno e foto.
- Loja com categorias, busca, favoritos e estoque.
- Carrinho, cupons e observações do pedido.
- Checkout, seleção de pagamento e horário de retirada.
- Pagamento via PIX com QR Code e código copia e cola.
- Ticket digital com QR Code e acompanhamento de status.
- Histórico de pedidos.
- Painel administrativo: dashboard, produtos, pedidos, retirada por QR Code e relatórios.
- Interface responsiva para computador e celular.

## Tecnologias

HTML5, CSS3, JavaScript ES Modules e Firebase Authentication + Cloud Firestore. Bibliotecas de interface e relatórios são carregadas por CDN.

## Publicar no GitHub Pages

O GitHub Pages hospeda a interface estática. O Firebase continua responsável por autenticação e banco de dados; não é necessário criar servidor PHP/Node para este projeto.

1. Crie um repositório no GitHub (por exemplo, `GFCCE`).
2. Envie **todo o conteúdo desta pasta** para a raiz do repositório: `index.html`, `pages/`, `css/`, `js/`, `components/`, `firebase/`, `icons/` e `img/`.
3. No GitHub, abra **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/ (root)`. Salve.
6. Aguarde a publicação. O endereço será semelhante a `https://SEU-USUARIO.github.io/GFCCE/`.

O projeto foi preparado para funcionar também em repositórios com subcaminho (como `/GFCCE/`); não publique somente o conteúdo de uma subpasta.

## Configurar o Firebase para o endereço publicado

1. Acesse o [Firebase Console](https://console.firebase.google.com/) e abra o projeto configurado em `js/firebase/firebase-config.js`.
2. Em **Authentication → Settings → Authorized domains**, adicione o domínio do GitHub Pages: `SEU-USUARIO.github.io` (somente o domínio, sem `https://`, caminho ou barra final).
3. Confirme que o provedor **E-mail/senha** está habilitado em Authentication.
4. Confirme que o Firestore Database está criado.
5. Em **Firestore Database → Rules**, publique as regras do arquivo `firebase/firestore.rules`.
6. Cadastre o primeiro usuário pela tela normal de cadastro. Para promovê-lo a administrador, altere manualmente o campo `role` para `admin` no documento `usuarios/UID` pelo Console do Firestore. Os cadastros seguintes recebem `role: aluno`.

### Configuração do Firebase no código

O arquivo `js/firebase/firebase-config.js` contém a configuração do aplicativo web Firebase. A `apiKey` de um app web Firebase não funciona como senha de administrador; a segurança depende das regras do Firestore, dos domínios autorizados e das configurações do Authentication. Não coloque senhas de serviço ou chaves privadas no repositório.

Se for usar outro projeto Firebase, substitua o objeto `firebaseConfig` pelos dados de **Configurações do projeto → Seus apps → Aplicativo da Web**.

## Configuração do PIX

Edite `js/utils/pix-config.js` para conferir/substituir a chave PIX, o nome do recebedor e a cidade. Esses dados aparecem no fluxo de pagamento. Antes de publicar um repositório público, confira se deseja realmente expor essa chave de recebimento; uma chave PIX é destinada a ser compartilhada, mas identifica o recebedor.

**Importante:** o QR Code e o código copia e cola gerados pelo sistema não comprovam, por si só, que o pagamento foi recebido. A confirmação financeira deve ser conferida pela equipe da cantina no banco ou por uma integração de pagamentos apropriada.

## Executar localmente

Não abra os arquivos HTML com duplo clique. Use o VS Code com a extensão **Live Server** e abra `index.html`, ou execute um servidor HTTP local na raiz do projeto. Os módulos JavaScript e o Firebase precisam de origem HTTP/HTTPS.

## Dados e segurança

- Carrinho e seleção temporária de checkout ficam no armazenamento local do navegador.
- Contas, perfis, produtos, categorias, cupons e pedidos ficam no Firebase/Firestore.
- As regras impedem que um aluno crie uma conta já como administrador ou altere seu próprio campo `role`.
- Nunca publique credenciais privadas, senhas ou arquivos de conta de serviço.
- Revise as regras do Firestore antes de colocar o sistema em uso real. A confirmação de pagamento e a baixa de estoque precisam de validação operacional; não trate o frontend como autoridade financeira.

## Estrutura

```text
GFCCE/
├── index.html
├── pages/                 # telas do aluno e painel administrativo
│   └── admin/
├── css/                   # estilos globais e por página
├── js/                    # lógica da aplicação
│   ├── admin/
│   ├── firebase/
│   └── utils/
├── components/            # navbar e sidebar reutilizáveis
├── firebase/              # regras do Firestore
├── icons/                 # favicon
└── img/                   # identidade visual
```

## Licença e uso

Projeto educacional para gerenciamento de pedidos da cantina escolar. Antes de utilizar em produção, configure o Firebase, revise as regras e valide o processo de pagamento com a instituição responsável.
