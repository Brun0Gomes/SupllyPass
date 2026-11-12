# SupplyPass — Documentação do código da API

Explicação linha a linha do backend (`supplypass-api`), escrito em **Node.js + Express + SQLite**.

A ordem dos arquivos segue o caminho que uma requisição percorre: configuração → banco →
serviços → middleware → rotas → servidor.

**Sumário**

1. [`package.json`](#1-packagejson)
2. [`src/config.js`](#2-srcconfigjs)
3. [`src/db/index.js`](#3-srcdbindexjs)
4. [`src/services/crypto.js`](#4-srcservicescryptojs)
5. [`src/services/score.js`](#5-srcservicesscorejs)
6. [`src/services/suppliers.js`](#6-srcservicessuppliersjs)
7. [`src/services/logs.js`](#7-srcserviceslogsjs)
8. [`src/middleware/auth.js`](#8-srcmiddlewareauthjs)
9. [`src/routes/auth.routes.js`](#9-srcroutesauthroutesjs)
10. [`src/routes/suppliers.routes.js`](#10-srcroutessuppliersroutesjs)
11. [`src/routes/me.routes.js`](#11-srcroutesmeroutesjs)
12. [`src/routes/verify.routes.js`](#12-srcroutesverifyroutesjs)
13. [`src/routes/logs.routes.js`](#13-srcrouteslogsroutesjs)
14. [`src/app.js`](#14-srcappjs)
15. [`server.js`](#15-serverjs)
16. [`src/db/seed.js` e `src/db/reset.js`](#16-srcdbseedjs-e-srcdbresetjs)

---

## 1. `package.json`

```json
"scripts": {
  "start": "node server.js",
  "dev": "node --watch server.js",
  "seed": "node src/db/seed.js",
  "reset": "node src/db/reset.js"
}
```

- `start` — sobe o servidor uma vez.
- `dev` — `--watch` é um recurso nativo do Node: ele reinicia o processo sempre que um arquivo
  muda. Não precisa de nodemon.
- `seed` — roda a carga inicial isoladamente.
- `reset` — apaga tudo e recria a base de demonstração.

```json
"dependencies": {
  "better-sqlite3": "^11.10.0",
  "cors": "^2.8.5",
  "dotenv": "^16.5.0",
  "express": "^4.21.2",
  "jsonwebtoken": "^9.0.2",
  "multer": "^1.4.5-lts.1"
}
```

| Pacote | Para quê |
|---|---|
| `better-sqlite3` | driver SQLite **síncrono**. Como não usa callbacks nem promessas, o código de banco fica direto: `db.prepare(...).get(...)` já devolve a linha |
| `express` | roteamento HTTP |
| `cors` | libera o navegador/app de outro endereço a chamar a API |
| `jsonwebtoken` | assina e valida o token de sessão |
| `multer` | interpreta `multipart/form-data`, que é como o arquivo chega no upload |
| `dotenv` | lê o arquivo `.env` para dentro de `process.env` |

Repare que **não há biblioteca de criptografia**: tudo usa o módulo `node:crypto`, que já vem no
Node.

---

## 2. `src/config.js`

Centraliza tudo que é configurável em um lugar só. Nenhum outro arquivo lê `process.env`
diretamente.

```js
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
```

O prefixo `node:` deixa explícito que são módulos internos do Node, não pacotes do npm.

```js
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const storageDir = path.join(rootDir, 'storage');
```

- `__dirname` é a pasta deste arquivo (`src/`); subir um nível dá a raiz do projeto.
- `path.join` monta o caminho usando a barra certa em cada sistema (`/` no Linux/Mac, `\` no
  Windows). Nunca concatene caminho com `+`.

```js
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(storageDir, { recursive: true });
```

Cria as duas pastas na primeira execução. `recursive: true` faz duas coisas: cria as pastas
intermediárias se faltarem e **não dá erro** se a pasta já existir.

```js
function loadFileKey() {
  if (process.env.FILE_KEY && process.env.FILE_KEY.length === 64) {
    return Buffer.from(process.env.FILE_KEY, 'hex');
  }
```

A chave do AES-256 tem 32 bytes. Escrita em hexadecimal, cada byte vira 2 caracteres — por isso a
verificação de 64 caracteres. `Buffer.from(texto, 'hex')` converte o texto de volta em bytes.

```js
  const keyPath = path.join(dataDir, 'file.key');
  if (!fs.existsSync(keyPath)) {
    fs.writeFileSync(keyPath, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  }
  return Buffer.from(fs.readFileSync(keyPath, 'utf8').trim(), 'hex');
}
```

- Se não houver chave na variável de ambiente, geramos uma com `randomBytes(32)` — gerador
  criptograficamente seguro, diferente de `Math.random()`.
- `mode: 0o600` dá permissão de leitura e escrita **só para o dono** do arquivo.
- A chave é gravada uma vez e reutilizada: se ela mudar, nenhum arquivo já cifrado pode mais ser
  aberto.

```js
module.exports = {
  port: Number(process.env.PORT || 3333),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  dbFile: process.env.DB_FILE || path.join(dataDir, 'supplypass.db'),
  dataDir,
  storageDir,
  fileKey: loadFileKey(),
  alertWindowDays: Number(process.env.ALERT_WINDOW_DAYS || 30),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024),
};
```

O padrão `process.env.X || valorPadrao` faz o projeto rodar sem nenhuma configuração, mas permite
mudar tudo por variável de ambiente. `Number(...)` é necessário porque variáveis de ambiente
sempre chegam como texto — sem isso, `porta + 1` viraria `"33331"`.

`10 * 1024 * 1024` é 10 MB escrito de forma legível.

---

## 3. `src/db/index.js`

```js
const Database = require('better-sqlite3');
const config = require('../config');
const db = new Database(config.dbFile);
```

Abre (ou cria) o arquivo do banco. Uma única conexão para todo o processo — é o recomendado com
SQLite.

```js
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
```

- **WAL** (*Write-Ahead Logging*): as escritas vão para um arquivo separado antes de entrar no
  banco. Permite ler e escrever ao mesmo tempo sem travar.
- **foreign_keys**: o SQLite vem com chave estrangeira *desligada* por compatibilidade histórica.
  Sem essa linha, `REFERENCES` seria só documentação.

```sql
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('contratante', 'fornecedor', 'admin')),
  company       TEXT,
  supplier_id   TEXT REFERENCES suppliers(id),
  created_at    TEXT NOT NULL
);
```

- `IF NOT EXISTS` deixa o arquivo ser executado toda vez que o servidor sobe, sem quebrar.
- `email ... UNIQUE` impede dois cadastros com o mesmo e-mail — a regra fica **no banco**, não só
  no código.
- `password_hash` e `password_salt` guardados separados: a senha em si nunca é armazenada.
- `CHECK (role IN (...))` é a lista fechada de papéis. Um `INSERT` com `role = 'chefe'` é
  rejeitado pelo próprio SQLite.
- `supplier_id` só é preenchido para usuários do tipo fornecedor; para contratante e admin fica
  nulo.

```sql
CREATE TABLE IF NOT EXISTS documents (
  id            TEXT PRIMARY KEY,
  supplier_id   TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  stored_name   TEXT,
  mime_type     TEXT,
  size_bytes    INTEGER,
  sha256        TEXT NOT NULL,
  iv            TEXT,
  auth_tag      TEXT,
  issued_at     TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  uploaded_by   TEXT,
  uploaded_at   TEXT NOT NULL,
  superseded_at TEXT
);
```

Colunas que merecem atenção:

| Coluna | Papel |
|---|---|
| `file_name` | o nome original, como o usuário enviou (`alvara.pdf`) |
| `stored_name` | o nome no disco, cifrado (`doc_a1b2....enc`). Os dois são diferentes de propósito: quem olhar a pasta não descobre o que é cada arquivo |
| `sha256` | impressão digital do arquivo **original** |
| `iv` | vetor de inicialização do AES. Aleatório por arquivo: cifrar o mesmo PDF duas vezes gera resultados diferentes |
| `auth_tag` | selo do modo GCM; sem ele a decifragem não é validada |
| `expires_at` | a data que alimenta todo o cálculo de status |
| `superseded_at` | `NULL` = versão vigente. Preenchido = versão antiga, mantida no histórico |

`ON DELETE CASCADE`: apagar um fornecedor apaga seus documentos, sem deixar registro órfão.

```sql
CREATE INDEX IF NOT EXISTS idx_documents_current
  ON documents (supplier_id, type, superseded_at);
```

A consulta mais frequente do sistema é "documentos vigentes deste fornecedor", que filtra
exatamente por essas três colunas. O índice existe para ela.

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id     TEXT PRIMARY KEY,
  kind   TEXT NOT NULL,
  actor  TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  ip     TEXT,
  at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_logs_at ON audit_logs (at DESC);
```

A trilha responde às quatro perguntas de auditoria: **quem** (`actor`), **o quê** (`action`),
**sobre o quê** (`target`) e **quando** (`at`). O índice em `at DESC` deixa a listagem "mais
recentes primeiro" instantânea.

---

## 4. `src/services/crypto.js`

O arquivo mais importante do ponto de vista de segurança.

### Hash de integridade

```js
function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
```

- `createHash('sha256')` cria a "máquina de picar" bytes.
- `update(buffer)` alimenta ela com o conteúdo do arquivo.
- `digest('hex')` fecha e devolve os 32 bytes de resultado em texto (64 caracteres).

Mudar **um único bit** do arquivo muda o hash inteiro. É isso que permite provar depois que o
documento é o mesmo que foi enviado.

### Criptografia em repouso

```js
function encryptBuffer(plainBuffer, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
}
```

Linha a linha:

- `randomBytes(12)` — o IV do modo GCM tem 12 bytes por recomendação. Ele **não é secreto** (fica
  no banco), mas precisa ser diferente a cada uso. Repetir IV com a mesma chave quebra o GCM.
- `createCipheriv('aes-256-gcm', key, iv)` — AES com chave de 256 bits, modo GCM. GCM é
  *autenticado*: além de esconder o conteúdo, detecta alteração.
- `cipher.update(...)` processa os dados e `cipher.final()` fecha o bloco; `Buffer.concat` junta
  as duas partes.
- `getAuthTag()` só existe **depois** do `final()` — é o selo calculado sobre tudo que passou.

```js
function decryptBuffer(encryptedBuffer, key, ivHex, authTagHex) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}
```

`setAuthTag` precisa vir **antes** de `final()`. Se o arquivo cifrado tiver sido alterado no
disco, `final()` lança exceção — é assim que a adulteração é detectada.

### Senhas

```js
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}
```

- **scrypt** é uma função de derivação *lenta e cara em memória*, feita para senhas. Usar SHA-256
  puro em senha seria um erro: é rápido demais, o que ajuda quem tenta força bruta.
- O **sal** aleatório por usuário faz com que duas pessoas com a mesma senha tenham hashes
  diferentes. Isso derruba o ataque por tabela pronta (*rainbow table*).
- O sal é um parâmetro com valor padrão: na criação ele é gerado; na verificação passamos o sal
  que está no banco.

```js
function verifyPassword(password, expectedHash, salt) {
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}
```

`timingSafeEqual` compara sempre gastando o mesmo tempo, mesmo quando os primeiros bytes já
diferem. Um `===` normal retorna mais rápido quando erra logo no começo, e essa diferença de
tempo, medida muitas vezes, vaza informação (*timing attack*).

A checagem de tamanho antes é obrigatória: `timingSafeEqual` lança erro com buffers de tamanhos
diferentes.

```js
function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}
```

Gera identificadores como `doc_9f2a1c...`. O prefixo deixa óbvio, olhando o banco, de que tabela
é cada id.

---

## 5. `src/services/score.js`

A regra de negócio. Este arquivo é o espelho de `src/utils/score.js` do aplicativo.

```js
const DOC_TYPES = [
  { key: 'contrato', label: 'Contrato de prestação', required: true, weight: 20 },
  { key: 'cnpj', label: 'Cartão CNPJ', required: true, weight: 15 },
  { key: 'cnd', label: 'Certidão negativa de débitos', required: true, weight: 15 },
  { key: 'lgpd', label: 'Política de LGPD', required: true, weight: 15 },
  { key: 'seguro', label: 'Apólice de seguro', required: false, weight: 12 },
  { key: 'treinamento', label: 'Certificado de treinamento', required: false, weight: 12 },
  { key: 'alvara', label: 'Alvará de funcionamento', required: false, weight: 11 },
];
```

Cada item tem quatro informações: a chave técnica (`key`, usada no banco e na URL), o texto de
tela (`label`), se é obrigatório e o peso. **20+15+15+15+12+12+11 = 100** — a soma fechar em 100 é
o que faz o score ser lido como porcentagem.

```js
const DOC_TYPE_MAP = Object.fromEntries(DOC_TYPES.map((t) => [t.key, t]));
```

Transforma a lista em um objeto indexado pela chave. Isso permite `DOC_TYPE_MAP['alvara']` em vez
de varrer o array toda vez — e serve também para validar se um tipo enviado pelo cliente existe.

```js
function daysUntil(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}
```

- `'2027-03-15'.split('-')` vira `['2027','03','15']`; `.map(Number)` converte para números.
- `m - 1` porque em JavaScript **janeiro é 0**. É a fonte clássica de bug de um mês.
- `Date.UTC(...)` devolve milissegundos, ignorando fuso. Comparar duas datas em UTC evita que o
  horário de verão ou o fuso do servidor cause diferença de um dia.
- `86400000` é a quantidade de milissegundos em um dia (24 × 60 × 60 × 1000).
- O resultado é positivo (falta tanto), zero (vence hoje) ou negativo (venceu).

```js
function statusOf(document) {
  if (!document || !document.expires_at) return 'pendente';
  const days = daysUntil(document.expires_at);
  if (days < 0) return 'vencido';
  if (days <= config.alertWindowDays) return 'vencendo';
  return 'valido';
}
```

Quatro estados, testados em ordem: **não existe** → pendente; **data passou** → vencido; **está
dentro da janela de 30 dias** → vencendo; senão → válido. A ordem importa: um documento vencido
também satisfaz `days <= 30`, e é por isso que `days < 0` é checado antes.

```js
function buildPassport(documents) {
  return DOC_TYPES.map((type) => {
    const document = documents.find((d) => d.type === type.key) || null;
    ...
  });
}
```

O detalhe central: percorremos o **catálogo**, não a lista do fornecedor. Assim o passaporte tem
sempre 7 itens, e o que falta aparece como pendente em vez de simplesmente não aparecer. Um
documento ausente é uma informação, não um silêncio.

```js
function calcScore(passport) {
  const total = passport.reduce((sum, item) => {
    if (item.status === 'valido') return sum + item.weight;
    if (item.status === 'vencendo') return sum + item.weight * 0.5;
    return sum;
  }, 0);
  return Math.round(total);
}
```

`reduce` acumula um valor percorrendo a lista; o `0` no final é o valor inicial. Vencido e
pendente caem no `return sum` — somam zero. `Math.round` evita mostrar `82.5`.

```js
function overallStatus(passport) {
  const blocking = passport.some(
    (item) => item.required && (item.status === 'vencido' || item.status === 'pendente')
  );
  if (blocking) return 'irregular';
  const anyProblem = passport.some((item) => item.status !== 'valido');
  return anyProblem ? 'atencao' : 'regular';
}
```

O status geral **não** depende da nota. Um fornecedor pode ter 85 pontos e ainda assim estar
irregular, se o problema for em documento obrigatório. É a diferença entre "quão bem está" e
"pode contratar".

`some` para na primeira ocorrência verdadeira — não precisa varrer o resto.

---

## 6. `src/services/suppliers.js`

Concentra as consultas. As rotas não escrevem SQL.

```js
const selectCurrentDocs = db.prepare(`
  SELECT * FROM documents
  WHERE supplier_id = ? AND superseded_at IS NULL
`);
```

`db.prepare` compila a consulta **uma vez**, quando o arquivo é carregado, e reaproveita. Os `?`
são parâmetros: o valor é enviado separado do texto do SQL, o que torna injeção de SQL impossível.
Nunca monte SQL com template string.

`superseded_at IS NULL` é a definição de "versão vigente". Em SQL, comparar com `NULL` exige
`IS NULL` — `= NULL` nunca é verdadeiro.

```js
function listWithSummary({ full = false } = {}) {
  return selectSuppliers.all().map((supplier) => {
    const summary = summarize(supplier, currentDocuments(supplier.id));
    if (full) return summary;
    const { passport, ...rest } = summary;
    return rest;
  });
}
```

- `{ full = false } = {}` — desestruturação com padrão duplo: funciona chamando
  `listWithSummary()` sem argumento nenhum.
- `const { passport, ...rest } = summary` separa o campo `passport` e junta o resto em `rest`. É a
  forma curta de "devolva tudo menos essa chave".
- A listagem resumida existe para não trafegar 56 documentos quando a tela só mostra nome e nota.

```js
function documentHistory(supplierId, type) {
  return selectHistory.all(supplierId, type).map((row) => ({
    ...
    current: row.superseded_at === null,
  }));
}
```

Converte `snake_case` do banco para `camelCase` do JavaScript e traduz `superseded_at` em um
booleano `current`, mais fácil de usar na interface.

---

## 7. `src/services/logs.js`

```js
const insert = db.prepare(`
  INSERT INTO audit_logs (id, kind, actor, action, target, ip, at)
  VALUES (@id, @kind, @actor, @action, @target, @ip, @at)
`);
```

Aqui os parâmetros são **nomeados** (`@id`) em vez de posicionais (`?`). Com sete campos, nomear
evita trocar dois valores de lugar sem perceber.

```js
function record({ kind, actor, action, target = null, ip = null }) {
  const entry = {
    id: newId('log'),
    kind, actor, action, target, ip,
    at: new Date().toISOString(),
  };
  insert.run(entry);
  return entry;
}
```

- A função recebe **um objeto**, não seis argumentos soltos: na hora de chamar fica claro o que é
  cada coisa.
- `toISOString()` grava sempre em UTC no formato `2026-09-09T04:15:22.123Z`. Datas em texto ISO
  ordenam corretamente por ordem alfabética, o que simplifica o `ORDER BY`.

**Só existe `INSERT` neste arquivo.** Não há função de update nem de delete, e nenhuma rota expõe
uma. É assim que a trilha é imutável do ponto de vista da aplicação.

---

## 8. `src/middleware/auth.js`

Um *middleware* no Express é uma função que roda **entre** a chegada da requisição e o
processamento da rota. Ela recebe `(req, res, next)` e decide: responde na hora ou chama `next()`
para deixar passar.

```js
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token ausente. Faça login para continuar.' });
  }
```

O cabeçalho vem no formato `Bearer eyJhbGciOi...`. O `split(' ')` separa o esquema do token, e a
desestruturação nomeia as duas partes. O `|| ''` evita erro quando o cabeçalho não existe.

**401** significa "não autenticado" (não sei quem você é).

```js
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, name: payload.name, ... };
    return next();
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    return res.status(401).json({
      error: expired ? 'Sessão expirada. Faça login novamente.' : 'Token inválido.',
    });
  }
}
```

- `jwt.verify` confere a **assinatura** e a **validade**. Se alguém editar o payload para virar
  admin, a assinatura não bate e cai no `catch`.
- `req.user = ...` é o ponto-chave: a partir daqui, qualquer rota sabe quem está falando sem
  consultar o banco de novo.
- `sub` (*subject*) é o nome padronizado do campo de identificação em JWT.
- Distinguir token expirado de token inválido melhora a mensagem sem entregar informação útil a
  um atacante.

```js
function requireRole(...roles) {
  return function check(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Seu perfil não tem acesso a este recurso.' });
    }
    return next();
  };
}
```

Esta é uma **função que devolve uma função**. `requireRole('contratante','admin')` não valida
nada: devolve o middleware já configurado com essa lista. É o que permite escrever
`router.use(authenticate, requireRole('contratante', 'admin'))`.

A diferença entre os códigos importa: **401** = não sei quem você é; **403** = sei quem você é, e
você não pode.

---

## 9. `src/routes/auth.routes.js`

```js
const user = findUser.get(String(email).trim().toLowerCase());

if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
  logs.record({ kind: 'acesso', actor: String(email), action: 'Tentativa de login rejeitada', ... });
  return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
}
```

Três decisões de segurança em poucas linhas:

1. `trim().toLowerCase()` normaliza o e-mail: `" Compras@X.com "` e `"compras@x.com"` são a mesma
   conta.
2. **A mesma mensagem** para usuário inexistente e senha errada. Se respondêssemos "usuário não
   encontrado", um atacante descobriria quais e-mails existem na base (*enumeração de usuários*).
3. A tentativa falha também vai para a trilha — é o que permite perceber ataque de força bruta.

```js
const token = jwt.sign(
  { sub: user.id, name: user.name, email: user.email, role: user.role,
    company: user.company, supplierId: user.supplier_id },
  config.jwtSecret,
  { expiresIn: config.jwtExpiresIn }
);
```

O que entra no token é o que estará disponível em `req.user` em toda requisição seguinte. Repare
no que **não** entra: nada de senha, hash ou sal.

> **Importante para a defesa do trabalho:** o payload de um JWT é apenas *codificado* em base64,
> não criptografado — qualquer um consegue ler. O que a assinatura garante é que ninguém
> **alterou** o conteúdo. Por isso ele carrega identificação e papel, nunca segredo.

```js
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});
```

Rota curta e útil: o app pergunta "esse token ainda vale?" sem precisar refazer login.

---

## 10. `src/routes/suppliers.routes.js`

```js
router.use(authenticate, requireRole('contratante', 'admin'));
```

Uma linha protege **todas** as rotas do arquivo. É melhor do que repetir o middleware em cada
rota, porque uma rota nova criada depois já nasce protegida — é seguro por padrão.

```js
router.get('/', (req, res) => {
  const full = req.query.full === '1';
  res.json({ suppliers: suppliers.listWithSummary({ full }) });
});
```

`req.query` são os parâmetros depois do `?` na URL. Comparar com a string `'1'` é proposital:
tudo em query string chega como texto.

```js
router.get('/:id', (req, res) => {
  const passport = suppliers.getPassport(req.params.id);
  if (!passport) return res.status(404).json({ error: 'Fornecedor não encontrado.' });

  logs.record({ kind: 'verificacao', actor: actorOf(req),
    action: 'Consulta de passaporte completo', target: passport.name, ip: req.ip });

  return res.json({ supplier: passport });
});
```

- `:id` na rota vira `req.params.id`.
- A verificação de existência vem **antes** do log: não registramos consulta a fornecedor que não
  existe como se fosse uma consulta válida.
- Abrir o passaporte completo **é** um evento de auditoria. Quem olhou o dossiê de um fornecedor
  fica registrado.

---

## 11. `src/routes/me.routes.js`

O arquivo mais denso. É onde o upload acontece.

```js
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes },
  fileFilter(req, file, cb) {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Formato não aceito. Envie PDF, PNG ou JPG.'));
    }
    return cb(null, true);
  },
});
```

- `memoryStorage()` mantém o arquivo em memória (`req.file.buffer`) em vez de gravar em disco.
  **Esse é o ponto**: o arquivo é criptografado antes de existir qualquer cópia legível no
  servidor. Com `diskStorage` haveria um instante — e um arquivo temporário — em texto claro.
- `limits.fileSize` protege contra alguém tentar derrubar o servidor enviando um arquivo enorme.
- `fileFilter` recusa tipos fora da lista. `cb(erro)` rejeita; `cb(null, true)` aceita.

```js
const replaceDocument = db.transaction((document) => {
  supersede.run(document.uploaded_at, document.supplier_id, document.type);
  insertDocument.run(document);
});
```

`db.transaction` do better-sqlite3 envolve as duas operações em uma transação: **ou as duas
acontecem, ou nenhuma**. Sem isso, uma falha no meio poderia marcar o documento antigo como
substituído sem inserir o novo — e o fornecedor ficaria sem documento nenhum daquele tipo.

```js
function normalizeDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : text;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return iso;
}
```

Aceita as duas formas que o cliente pode mandar e sempre devolve ISO:

- A expressão regular `^(\d{2})\/(\d{2})\/(\d{4})$` casa `31/12/2027`; os grupos entre parênteses
  são recuperados como `br[1]`, `br[2]`, `br[3]` e reordenados.
- O segundo teste garante o formato final.
- `new Date(...)` + `Number.isNaN(getTime())` pega datas com formato certo mas inexistentes, como
  `2027-02-31`.

Retornar `null` em vez de lançar exceção deixa a rota decidir a mensagem de erro.

### O caminho do upload

```js
// 1. Hash do arquivo ORIGINAL
const digest = sha256(req.file.buffer);

// 2. Criptografia
const { encrypted, iv, authTag } = encryptBuffer(req.file.buffer, config.fileKey);

// 3. Grava só o cifrado
const id = newId('doc');
const storedName = `${id}.enc`;
fs.writeFileSync(path.join(config.storageDir, storedName), encrypted);
```

A ordem é obrigatória. O hash tem que ser do conteúdo original, porque é ele que será conferido
depois da decifragem. Um hash do arquivo cifrado não provaria nada sobre o documento.

O nome no disco é o id, não o nome do arquivo: dois fornecedores podem enviar `contrato.pdf` sem
colisão, e a pasta não revela nada.

```js
res.status(201).json({
  document: { id, type, fileName, sha256: digest, ... },
  supplier: suppliersService.getPassport(supplierId),
});
```

**201** é "criado", não **200**. E a resposta já devolve o passaporte recalculado: o app atualiza a
tela sem precisar de uma segunda requisição.

### O download que prova a integridade

```js
if (!document || document.supplier_id !== req.user.supplierId) {
  return res.status(404).json({ error: 'Documento não encontrado.' });
}
```

A comparação com `req.user.supplierId` é a autorização por dono. Repare que a resposta é **404**,
não 403: dizer "existe, mas não é seu" já entrega a informação de que o id existe.

```js
let plain;
try {
  plain = decryptBuffer(fs.readFileSync(filePath), config.fileKey, document.iv, document.auth_tag);
} catch (error) {
  return res.status(409).json({ error: 'Falha na decifragem: arquivo possivelmente adulterado.' });
}

if (sha256(plain) !== document.sha256) {
  logs.record({ kind: 'acesso', action: 'ALERTA: divergência de hash na leitura de documento', ... });
  return res.status(409).json({ error: 'Integridade comprometida: o hash não confere.' });
}
```

Duas barreiras independentes:

1. O `authTag` do GCM detecta alteração no **arquivo cifrado**.
2. O SHA-256 confere o **conteúdo decifrado** contra o que foi registrado no upload.

Se a segunda falhar, além de recusar, o sistema **registra o alerta** na trilha. Esse é o
comportamento que se espera de um sistema de gestão documental.

---

## 12. `src/routes/verify.routes.js`

```js
function parseCode(raw) {
  if (!raw) return null;
  const text = String(raw).trim().toUpperCase();
  if (text.startsWith('SUPPLYPASS:')) return text.replace('SUPPLYPASS:', '');
  if (/^FOR-\d{3,}$/.test(text)) return text;
  return null;
}
```

Aceita o conteúdo do QR (`SUPPLYPASS:FOR-1042`) ou o código digitado (`FOR-1042`), e **rejeita
qualquer outra coisa**. Um QR de outro sistema, ou uma URL maliciosa, devolve `null` e nunca chega
a virar consulta ao banco.

```js
router.post('/', verifyHandler);
router.get('/:code', verifyHandler);
```

O mesmo tratador é registrado nos dois verbos. `POST` é o que o app usa; `GET` existe para testar
pelo navegador. Extrair a função com nome (`verifyHandler`) é o que torna isso possível sem
duplicar código.

```js
return res.json({
  verifiedAt: new Date().toISOString(),
  supplier: {
    id, name, cnpj, category, score, status, counts,
    alerts: passport
      .filter((item) => item.status !== 'valido')
      .map((item) => ({ label: item.label, required: item.required, status: item.status, daysLeft: item.daysLeft })),
  },
});
```

**A resposta é montada campo a campo, de propósito.** Não fazemos `res.json(passport)`. Se
fizéssemos, iriam junto os nomes dos arquivos, os hashes e os ids dos documentos — informação que
quem escaneia não precisa e não deve ter.

O `.map(...)` sobre os alertas também recorta: manda o rótulo e o status, não o objeto do
documento.

Esse é o slide "Verificar não é dar acesso" transformado em código.

---

## 13. `src/routes/logs.routes.js`

```js
const limit = Math.min(Number(req.query.limit) || 100, 500);
```

Uma linha com três proteções: converte para número; usa 100 se vier vazio ou inválido (`NaN` é
"falsy", então o `||` entra); e limita o teto em 500 com `Math.min`, para ninguém pedir um milhão
de registros de uma vez.

---

## 14. `src/app.js`

```js
app.use(cors());
app.use(express.json({ limit: '1mb' }));
```

- `cors()` adiciona os cabeçalhos que autorizam um cliente de outra origem. Sem isso, o app no
  celular seria bloqueado.
- `express.json()` interpreta o corpo JSON e coloca em `req.body`. O limite de 1 MB evita corpo
  gigante — o upload não passa por aqui, ele usa multipart.

A ordem dos `app.use` **é** a ordem de execução.

```js
app.use('/api/auth', authRoutes);
app.use('/api/suppliers', suppliersRoutes);
...
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});
```

O middleware sem rota, registrado **depois** de todas as rotas, é o "pega o resto": só chega aqui
o que nenhuma rota atendeu. Se estivesse no topo, responderia 404 para tudo.

```js
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) { ... }
  if (error) { console.error('[erro]', error.message); return res.status(400).json({ ... }); }
  return next();
});
```

O tratador de erros do Express é reconhecido pela **quantidade de parâmetros**: quatro. Se
declarasse três, o Express o trataria como middleware comum e os erros passariam direto.

Erros do multer são identificados com `instanceof` para dar uma mensagem específica — em especial
o `LIMIT_FILE_SIZE`, que vira "arquivo maior que o limite de 10 MB" em vez de um erro técnico.

---

## 15. `server.js`

```js
require('dotenv').config();
```

Precisa ser a **primeira linha executada**. Ela carrega o `.env` para `process.env`; se viesse
depois do `require('./src/config')`, a configuração já teria sido lida com os valores padrão.

```js
const { ensureSeed } = require('./src/db/seed');
ensureSeed();
```

Popula o banco se ele estiver vazio. Rodar isso no start é o que faz o projeto funcionar com
`npm install && npm start`, sem passo manual.

```js
app.listen(config.port, '0.0.0.0', () => { ... });
```

O `'0.0.0.0'` é essencial: sem ele o Node escuta só em `localhost`, e **o celular não conseguiria
conectar**. Escutar em `0.0.0.0` significa aceitar conexões de qualquer interface de rede.

```js
const interfaces = os.networkInterfaces();
Object.values(interfaces).forEach((list) => {
  (list || []).forEach((net) => {
    if (net.family === 'IPv4' && !net.internal) {
      console.log(`  rede:   http://${net.address}:${config.port}/api  <- use este no app`);
    }
  });
});
```

Descobre e imprime o IP da máquina na rede. Filtra `IPv4` (mais simples de digitar que IPv6) e
`!net.internal` (descarta o 127.0.0.1, que o celular não alcança). É uma comodidade pequena que
elimina a dúvida mais comum de quem vai rodar o projeto.

---

## 16. `src/db/seed.js` e `src/db/reset.js`

```js
function isoFromToday(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
```

`setDate` com um valor fora do intervalo do mês **funciona**: `setDate(35)` em março vira 4 de
abril. É a forma mais simples de somar dias sem se preocupar com fim de mês ou ano bissexto.

`.slice(0, 10)` corta `2026-09-09T04:15:22.123Z` em `2026-09-09`.

```js
docs: { contrato: 185, cnpj: 295, cnd: 155, lgpd: 270, seguro: 105, treinamento: 12 },
```

Cada número é **quantos dias faltam para vencer**, contados a partir do dia da carga. Por isso a
demonstração nunca envelhece: rodando o seed hoje ou daqui a seis meses, o treinamento sempre
vence em 12 dias e continua aparecendo em amarelo. Números negativos (`cnd: -14`) representam
documento já vencido.

Note que a NovaTech não tem `alvara` na lista — é a pendência que a demonstração usa para mostrar
o score subindo de 83 para 94 quando o documento é enviado ao vivo.

```js
const runSeed = db.transaction(() => { ... });
```

Toda a carga em uma transação: se algo falhar no meio, o banco não fica pela metade.

```js
function ensureSeed() {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM suppliers').get();
  if (total > 0) return false;
  runSeed();
  return true;
}
```

Idempotente: rodar dez vezes tem o mesmo efeito de rodar uma. É o que permite chamar no start do
servidor sem risco de duplicar dados.

```js
if (require.main === module) {
  const created = ensureSeed();
  console.log(created ? 'Carga concluída.' : 'O banco já contém dados...');
}
```

`require.main === module` é verdadeiro só quando o arquivo foi executado direto
(`node src/db/seed.js`), e falso quando foi importado por outro arquivo. É como um arquivo serve
tanto de módulo quanto de script de linha de comando.

### `reset.js`

```js
[config.dbFile, `${config.dbFile}-wal`, `${config.dbFile}-shm`].forEach((file) => {
  if (fs.existsSync(file)) fs.unlinkSync(file);
});
```

Apagar só o `.db` não basta: o modo WAL cria os arquivos auxiliares `-wal` e `-shm`, e deixá-los
para trás pode ressuscitar dados antigos.

```js
const { ensureSeed } = require('./seed');
ensureSeed();
```

O `require` está **no fim do arquivo**, de propósito. Em CommonJS o `require` executa na linha em
que aparece, e importar `seed.js` abre a conexão com o banco. Se estivesse no topo, o banco seria
aberto antes de ser apagado.

---

## Resumo do que o código demonstra

| Conceito de faculdade | Onde está no projeto |
|---|---|
| Modelagem relacional | `db/index.js` — chaves, índices, `CHECK`, `ON DELETE CASCADE` |
| Transações (ACID) | `me.routes.js` e `seed.js` — `db.transaction` |
| Criptografia simétrica | `crypto.js` — AES-256-GCM |
| Função de hash | `crypto.js` — SHA-256 para integridade |
| Derivação de senha | `crypto.js` — scrypt com sal |
| Autenticação sem estado | `auth.js` + `auth.routes.js` — JWT |
| Autorização | `requireRole` e a checagem de dono no download |
| Middleware / pipeline HTTP | `app.js` e a ordem dos `app.use` |
| Prevenção de injeção de SQL | consultas preparadas com parâmetros |
| Auditoria e não repúdio | `logs.js` — tabela somente de inserção |
| Versionamento de dados | coluna `superseded_at` |
| Minimização de dados (LGPD) | `verify.routes.js` — resposta montada campo a campo |
