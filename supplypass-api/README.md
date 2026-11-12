# SupplyPass API

Backend do SupplyPass em **Node.js + Express + SQLite**.

Guarda fornecedores, documentos e a trilha de auditoria; calcula o Supplier Score; recebe upload
de arquivos com **hash SHA-256 real** e **criptografia AES-256-GCM em repouso**; e responde à
verificação por QR Code devolvendo apenas o status, nunca os arquivos.

---

## Como rodar

Precisa do **Node.js LTS** (https://nodejs.org).

Antes de iniciar, copie `.env.example` para `.env` e defina uma `JWT_SECRET`
única. O arquivo `.env` é ignorado pelo Git e não deve ser publicado.

```bash
cp .env.example .env
```

No Windows (PowerShell), gere um valor seguro com:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Cole o resultado em `JWT_SECRET=` dentro do `.env`. Defina também um valor local
em `DEMO_PASSWORD=`; ele é usado apenas para criar as contas de demonstração.

```bash
cd supplypass-api
npm install
npm start
```

Na primeira execução o banco é criado e populado sozinho (8 fornecedores, 3 usuários).
O terminal mostra dois endereços:

```
  SupplyPass API no ar
  local:  http://localhost:3333/api/health
  rede:   http://192.168.0.15:3333/api  <- use este no app
```

Use o endereço de **rede** no aplicativo: o celular não enxerga o `localhost` do computador.
Computador e celular precisam estar na mesma rede Wi-Fi.

| Comando | O que faz |
|---|---|
| `npm start` | sobe o servidor |
| `npm run dev` | sobe com recarga automática ao salvar |
| `npm run seed` | popula o banco se ele estiver vazio |
| `npm run reset` | apaga banco e arquivos e recria a base de demonstração |

---

## Contas de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Contratante | `compras@meridiano.com.br` | value defined in `DEMO_PASSWORD` |
| Fornecedor (NovaTech, FOR-1042) | `contato@novatech.com.br` | value defined in `DEMO_PASSWORD` |
| Administrador | `admin@supplypass.app` | value defined in `DEMO_PASSWORD` |

---

## Endpoints

Todas as rotas ficam sob `/api`. Exceto `/health` e `/doc-types`, todas exigem
`Authorization: Bearer <token>`.

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| GET | `/health` | qualquer um | teste de conexão |
| GET | `/doc-types` | qualquer um | catálogo de documentos e pesos |
| POST | `/auth/login` | qualquer um | devolve o token JWT |
| GET | `/auth/me` | logado | dados do usuário do token |
| GET | `/suppliers` | contratante, admin | lista com score e status |
| GET | `/suppliers?full=1` | contratante, admin | lista já com o passaporte de cada um |
| GET | `/suppliers/:id` | contratante, admin | passaporte completo (registra consulta) |
| GET | `/suppliers/:id/history/:type` | contratante, admin | versões de um documento |
| POST | `/verify` | logado | verifica um código de QR, devolve **só status** |
| GET | `/verify/:code` | logado | mesma coisa, pela URL |
| GET | `/me/passport` | fornecedor | passaporte do próprio fornecedor |
| POST | `/me/documents` | fornecedor | upload (multipart: `file`, `type`, `expiresAt`) |
| GET | `/me/documents/:id/download` | fornecedor | decifra, confere o hash e devolve o arquivo |
| GET | `/logs` | contratante, admin | trilha de auditoria |

### Exemplo rápido

```bash
# login
TOKEN=$(curl -s -X POST http://localhost:3333/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"compras@meridiano.com.br","password":"YOUR_LOCAL_DEMO_PASSWORD"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# verificação por QR Code
curl -s -X POST http://localhost:3333/api/verify \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"code":"SUPPLYPASS:FOR-1058"}'
```

---

## Segurança implementada

| Controle | Como está no código |
|---|---|
| Senhas | `scrypt` com sal aleatório por usuário; comparação em tempo constante (`timingSafeEqual`) |
| Autenticação | JWT assinado, expiração de 8 h, validado em `middleware/auth.js` |
| Controle de acesso | `requireRole('contratante','admin')` por grupo de rotas; fornecedor só acessa `/me` |
| Criptografia em repouso | AES-256-GCM; o arquivo é cifrado **em memória**, antes de tocar o disco |
| Integridade | SHA-256 do arquivo original gravado no banco e reconferido em todo download |
| Antiadulteração | o `authTag` do GCM faz a decifragem falhar se o arquivo cifrado for alterado |
| Auditoria | tabela `audit_logs` só recebe INSERT — não há rota de update nem de delete |
| Versionamento | o documento antigo recebe `superseded_at`; nada é apagado |
| Vazamento na verificação | `/verify` devolve status, score e alertas — nunca nome de arquivo, hash ou download |

## Banco de dados

```
users      (id, name, email, password_hash, password_salt, role, company, supplier_id)
suppliers  (id, name, cnpj, category, city, email, since, active)
documents  (id, supplier_id, type, file_name, stored_name, sha256, iv, auth_tag,
            issued_at, expires_at, uploaded_by, uploaded_at, superseded_at)
audit_logs (id, kind, actor, action, target, ip, at)
```

O arquivo do banco fica em `data/supplypass.db` e os arquivos cifrados em `storage/*.enc`.
As duas pastas são criadas na primeira execução e estão no `.gitignore`.

## Estrutura

```
supplypass-api/
├── server.js                 # sobe o servidor e mostra o IP da rede
└── src/
    ├── app.js                # Express: CORS, JSON, rotas, tratador de erros
    ├── config.js             # portas, segredos, chave AES, pastas
    ├── db/
    │   ├── index.js          # conexão SQLite + schema
    │   ├── seed.js           # carga inicial de demonstração
    │   └── reset.js          # apaga tudo e recria
    ├── services/
    │   ├── crypto.js         # SHA-256, AES-256-GCM, scrypt
    │   ├── score.js          # regra do Supplier Score (espelho do app)
    │   ├── suppliers.js      # consultas de fornecedores e documentos
    │   └── logs.js           # trilha de auditoria
    ├── middleware/auth.js    # JWT e controle de acesso por papel
    └── routes/               # auth, suppliers, me, verify, logs
```
