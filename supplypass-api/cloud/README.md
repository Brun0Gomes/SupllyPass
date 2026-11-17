# API PostgreSQL e Supabase Storage

A API de nuvem fica separada da API SQLite, para que a apresentação local continue disponível.
As rotas de login, permissões, fornecedores, documentos, revisão e QR foram adaptadas para
PostgreSQL e para um bucket privado. Essa versão ainda requer validação de ponta a ponta com o
bucket real e um deploy de teste antes de ser considerada pronta.

## O que já foi preparado

- `schema.sql`: tabelas no esquema privado `supplypass_private`.
- `rate-limit.sql`: tabela adicional para limites compartilhados entre instâncias.
- `app.js`: entrada de nuvem; o `app.js` na raiz da API exporta o Express para a Vercel.
- `private-storage.js`: envia somente bytes cifrados e rejeita bucket público na leitura e escrita.
- `bootstrap-admin.js`: cria o primeiro administrador apenas quando não existe usuário algum.

Os arquivos locais e o banco SQLite não são removidos. Em uma migração de registros existentes,
as tabelas e os arquivos devem ser copiados de forma coordenada e a chave de criptografia original
deve ser preservada. Não reutilize ou importe automaticamente dados fictícios para produção.

## Antes de iniciar

1. Provisionar `schema.sql` e `rate-limit.sql` no banco de destino e verificar as permissões.
   `apply-schema.js` e `apply-rate-limit.js` criam somente estruturas ausentes e recusam recriação.
2. Criar um bucket privado para documentos no Supabase.
3. Configurar as variáveis abaixo no servidor. Não coloque segredos no aplicativo móvel, no Git,
   em imagens, mensagens ou logs. O schema `supplypass_private` não deve ser exposto pela Data API.

| Variável | Uso |
|---|---|
| `SUPPLYPASS_CLOUD` | Deve ser `true` para a API de nuvem. |
| `SUPABASE_DATABASE_URL` | Conexão PostgreSQL, preferencialmente pooler em modo transação na Vercel. |
| `SUPABASE_DB_CA_CERT` | Conteúdo PEM da CA obtida do painel do projeto; a API valida certificado e hostname. |
| `SUPABASE_URL` | Origem HTTPS do projeto Supabase, terminando em `.supabase.co`. |
| `SUPABASE_SECRET_KEY` | Chave secreta usada pela API para o bucket privado. Nunca vai para o celular. |
| `SUPABASE_BUCKET` | Nome do bucket privado. |
| `JWT_SECRET` | Segredo aleatório exclusivo para assinar sessões, com pelo menos 32 caracteres. |
| `FILE_KEY` | Chave AES de 32 bytes em 64 caracteres hexadecimais; preserve-a para recuperar documentos. |
| `QR_SIGNING_SECRET` | Segredo aleatório independente para assinatura dos QR Codes. |
| `CORS_ORIGINS` | Origens web autorizadas, separadas por vírgula, se houver cliente web. |

Para execução local de nuvem, é possível informar a CA por `SUPABASE_CA_CERT_PATH` no `.env`
ignorado pelo Git. Na Vercel, use o conteúdo da CA em `SUPABASE_DB_CA_CERT`, pois o caminho do
seu computador não existe lá. Não use parâmetros SSL na URL: eles podem sobrescrever as opções
TLS do driver. A verificação do certificado não deve ser desligada.

A Vercel limita corpo de requisição e resposta; este fluxo aceita arquivos de até **3 MiB** para
deixar espaço ao formulário multipart. A verificação do cabeçalho do arquivo não substitui um
antivírus, que continua pendente. Os contadores de acesso são compartilhados no PostgreSQL;
é necessário planejar limpeza periódica e retenção para a tabela de limites.

## Conta inicial

Em um terminal privado, configure temporariamente `BOOTSTRAP_ADMIN_NAME`,
`BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` (mínimo de 10 caracteres), além das
variáveis de conexão, e execute `node cloud/bootstrap-admin.js`. O comando recusa execução em um
banco que já contenha usuários. Remova as variáveis da senha quando terminar. O Administrador
configura MFA no primeiro login; o Gestor, por decisão temporária para a apresentação, não.

## Verificação

`node --test cloud/test/cloud-workflow.test.js` testa o fluxo na conexão configurada, dentro de
uma transação revertida ao final, usando armazenamento simulado. Exige acesso de rede e o
certificado de CA. Com `CLOUD_TEST_REAL_STORAGE=true`, usa o bucket configurado para um arquivo
fictício cifrado e remove apenas o objeto criado pelo teste ao finalizar. Isso não substitui um
deploy de prévia nem os testes no celular.

`npm run cloud:preflight` compara contagens do SQLite e do PostgreSQL sem modificar dados. Tabelas
ausentes aparecem como `null`. Não compartilhe sua URL de conexão no chat.
