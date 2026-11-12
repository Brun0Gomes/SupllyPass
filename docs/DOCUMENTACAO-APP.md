# SupplyPass — Documentação do código do aplicativo

Explicação linha a linha do app mobile (`SupplyPass`), escrito em **React Native + Expo**,
JavaScript puro.

A ordem segue de baixo para cima: primeiro a configuração e as regras, depois o estado, depois os
componentes e por fim as telas.

**Sumário**

- [Antes de começar: os conceitos de React usados](#antes-de-começar-os-conceitos-de-react-usados)
- [1. Configuração do projeto](#1-configuração-do-projeto)
- [2. `src/theme.js`](#2-srcthemejs)
- [3. `src/utils/dates.js`](#3-srcutilsdatesjs)
- [4. `src/utils/score.js`](#4-srcutilsscorejs)
- [5. `src/utils/hash.js`](#5-srcutilshashjs)
- [6. `src/data/suppliers.js`](#6-srcdatasuppliersjs)
- [7. `src/config.js` e `src/api/client.js`](#7-srcconfigjs-e-srcapiclientjs)
- [8. `src/api/adapters.js`](#8-srcapiadaptersjs)
- [9. `src/context/AppContext.js`](#9-srccontextappcontextjs)
- [10. `App.js` e `src/navigation/RootNavigator.js`](#10-appjs-e-srcnavigationrootnavigatorjs)
- [11. Componentes](#11-componentes)
- [12. Telas](#12-telas)

---

## Antes de começar: os conceitos de React usados

Se você precisar explicar o código para a banca, estes são os sete conceitos que aparecem o tempo
todo.

**Componente** — uma função que devolve elementos de tela. O nome começa com maiúscula. Cada
arquivo em `components/` e `screens/` é um componente.

**Props** — os argumentos que um componente recebe. `<Card style={...}>` passa a prop `style`.

**Estado (`useState`)** — memória do componente entre renderizações.

```js
const [scanned, setScanned] = useState(false);
```

Devolve um par: o valor atual e a função que o troca. Chamar `setScanned(true)` faz o React
**redesenhar** o componente com o novo valor. Alterar a variável direto não funcionaria — o React
não ficaria sabendo.

**`useMemo`** — guarda o resultado de um cálculo e só refaz quando algo da lista de dependências
muda. Usado no painel, que recalcula estatísticas de 8 fornecedores.

**`useCallback`** — a mesma ideia, mas para funções. Garante que a função não seja recriada a cada
render, o que evitaria que componentes filhos redesenhassem à toa.

**`useEffect`** — roda um efeito colateral (buscar dados, ligar a câmera) depois da renderização,
sempre que as dependências mudarem.

**Contexto (`createContext` / `useContext`)** — um "canal" que atravessa a árvore de componentes.
Sem ele, o token de login teria que ser passado de prop em prop até a última tela — o chamado
*prop drilling*.

---

## 1. Configuração do projeto

### `package.json`

```json
"dependencies": {
  "@expo/vector-icons": "^14.1.0",
  "@react-navigation/bottom-tabs": "^7.3.10",
  "@react-navigation/native": "^7.1.6",
  "@react-navigation/native-stack": "^7.3.10",
  "expo": "~53.0.9",
  "expo-camera": "~16.1.6",
  "expo-document-picker": "~13.1.5",
  "react-native-qrcode-svg": "^6.3.2",
  "react-native-svg": "15.11.2",
  ...
}
```

| Pacote | Para quê |
|---|---|
| `expo` | plataforma que empacota o app e dá acesso a câmera, arquivos etc. |
| `@react-navigation/*` | navegação: pilha de telas e abas inferiores |
| `expo-camera` | câmera e leitura de código de barras/QR |
| `expo-document-picker` | seletor de arquivos do celular |
| `react-native-svg` | desenho vetorial — usado no medidor de score |
| `react-native-qrcode-svg` | gera o QR Code (depende do `react-native-svg`) |
| `@expo/vector-icons` | conjunto de ícones (usamos o Ionicons) |

O `~` aceita correções de versão (`~53.0.9` aceita `53.0.12`); o `^` aceita também versões menores
novas (`^7.1.6` aceita `7.4.0`). Bibliotecas do Expo usam `~` porque precisam casar com a versão
do SDK.

### `app.json`

```json
"plugins": [
  ["expo-camera", { "cameraPermission": "O SupplyPass usa a câmera para ler o QR Code..." }]
]
```

Esse texto é o que **aparece para o usuário** quando o sistema pede permissão de câmera. Android e
iOS exigem justificativa; um app sem ela é rejeitado nas lojas.

### `index.js`

```js
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
```

O ponto de entrada. `registerRootComponent` diz ao sistema operacional qual componente é a raiz do
aplicativo.

---

## 2. `src/theme.js`

```js
export const colors = {
  primary: '#0B4F9E',
  ...
  green: '#15803D',  greenSoft: '#E6F5EC',
  amber: '#B45309',  amberSoft: '#FDF2E3',
  red: '#B91C1C',    redSoft: '#FCEBEB',
};
```

Todas as cores em um lugar só. Cada cor de status tem um par: a **forte** (texto e ícone) e a
**suave** (fundo). Essa dupla é o que permite um selo colorido com contraste suficiente para
leitura.

```js
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };
```

Escala de espaçamento fixa. Usar `spacing.lg` em vez de `16` faz o app inteiro respirar igual — e
se um dia o espaçamento mudar, muda em um lugar só.

`pill: 999` é um truque comum: um raio maior que a metade da altura sempre produz as pontas
totalmente arredondadas de uma "pílula".

```js
export const shadow = {
  shadowColor: '#0F1B2D', shadowOpacity: 0.06, shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};
```

`shadow*` funciona no iOS; `elevation` é o equivalente no Android. Os dois juntos cobrem as duas
plataformas.

---

## 3. `src/utils/dates.js`

```js
export function isoFromToday(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toIso(d);
}
```

Devolve uma data relativa a hoje. `setDate` lida sozinho com virada de mês e ano.

```js
export function toIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

- `getMonth() + 1` — em JavaScript janeiro é 0.
- `padStart(2, '0')` transforma `9` em `"09"`. Sem isso, a data sairia `2026-9-9` e a comparação
  alfabética entre datas deixaria de funcionar.

Repare que **não** usamos `date.toISOString()` aqui: aquele método converte para UTC e pode
"voltar um dia" dependendo do fuso.

```js
export function daysUntil(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}
```

Idêntica à da API — de propósito, para os dois lados chegarem ao mesmo número. Trabalhar em
`Date.UTC` neutraliza fuso e horário de verão; `86400000` são os milissegundos de um dia.

```js
export function parseBrDate(text) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((text || '').trim());
  if (!match) return null;
  const [, d, m, y] = match;
  const day = Number(d);
  const month = Number(m);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${m}-${d}`;
}
```

- A vírgula sozinha em `const [, d, m, y]` **pula a posição 0** do resultado da regex (que contém o
  texto inteiro casado) e pega só os grupos.
- Retornar `null` em vez de lançar erro permite à tela escrever a mensagem que quiser.

---

## 4. `src/utils/score.js`

O coração da regra de negócio no lado do app.

```js
export const ALERT_WINDOW_DAYS = 30;
```

Uma constante nomeada em vez do número 30 espalhado pelo código. Ela aparece até no texto da tela
("Vencem em 30 dias"), então mudar a política é mudar uma linha.

```js
export const DOC_TYPES = [
  { key: 'contrato', label: 'Contrato de prestação', required: true, weight: 20, icon: 'document-text-outline' },
  ...
];
```

Além dos campos que a API também tem, aqui existe `icon`: o nome do ícone do Ionicons. Isso mantém
"o que é o documento" e "como ele aparece" na mesma definição, em vez de espalhar um `switch` de
ícones pelas telas.

```js
export const DOC_STATUS = {
  valido:   { key: 'valido',   label: 'Válido',   mark: '✅', color: colors.green, soft: colors.greenSoft, icon: 'checkmark-circle' },
  vencendo: { ... },
  vencido:  { ... },
  pendente: { ... },
};
```

Cada status carrega **tudo** que a interface precisa: rótulo, cor forte, cor de fundo e ícone. Por
isso os componentes conseguem escrever simplesmente:

```jsx
<Ionicons name={item.status.icon} color={item.status.color} />
```

sem nenhum `if` de cor. Esse padrão — dados que descrevem a apresentação — é o que mantém as telas
curtas.

```js
export const OVERALL_STATUS = {
  regular:   { ..., message: 'Fornecedor apto para contratação.' },
  atencao:   { ..., message: 'Apto, mas há documento vencendo ou complementar pendente.' },
  irregular: { ..., message: 'Contratação bloqueada até a regularização.' },
};
```

O `message` é a frase que aparece no passaporte. Guardá-la junto do status garante que a mesma
situação sempre produza a mesma frase, em qualquer tela.

```js
export function getDocStatus(doc) {
  if (!doc || !doc.expiresAt) return DOC_STATUS.pendente;
  const days = daysUntil(doc.expiresAt);
  if (days < 0) return DOC_STATUS.vencido;
  if (days <= ALERT_WINDOW_DAYS) return DOC_STATUS.vencendo;
  return DOC_STATUS.valido;
}
```

A mesma cascata da API, mas devolvendo o **objeto** de status em vez de uma string — já pronto
para a interface usar.

```js
export function getPassport(supplier) {
  return DOC_TYPES.map((type) => {
    const doc = (supplier.documents || []).find((d) => d.type === type.key) || null;
    const status = getDocStatus(doc);
    return { ...type, doc, status, daysLeft: doc && doc.expiresAt ? daysUntil(doc.expiresAt) : null };
  });
}
```

- Percorre o **catálogo**, não os documentos do fornecedor: por isso o que falta aparece como
  pendente.
- `(supplier.documents || [])` protege contra fornecedor sem a lista.
- `{ ...type, doc, status, daysLeft }` — o *spread* copia todos os campos do tipo e acrescenta os
  três calculados. O resultado é um objeto que os componentes consomem inteiro.

```js
export function calcScore(supplier) { ... }        // igual à API
export function getOverallStatus(supplier) { ... } // igual à API
```

```js
export function summarize(supplier) {
  const passport = getPassport(supplier);
  return {
    passport,
    score: calcScore(supplier),
    overall: getOverallStatus(supplier),
    validos: passport.filter((i) => i.status.key === 'valido').length,
    vencendo: passport.filter((i) => i.status.key === 'vencendo').length,
    problemas: passport.filter((i) => i.status.key === 'vencido' || i.status.key === 'pendente').length,
  };
}
```

Função de conveniência: uma chamada devolve tudo que uma tela costuma precisar. É usada no cartão
do fornecedor, no passaporte, no painel e no resultado da verificação.

```js
export function passportCode(supplier) {
  return `SUPPLYPASS:${supplier.id}`;
}

export function parsePassportCode(raw) {
  if (!raw) return null;
  const text = String(raw).trim().toUpperCase();
  if (text.startsWith('SUPPLYPASS:')) return text.replace('SUPPLYPASS:', '');
  if (/^FOR-\d{3,}$/.test(text)) return text;
  return null;
}
```

O prefixo `SUPPLYPASS:` serve para o app reconhecer **o próprio** QR e ignorar qualquer outro que
entre no campo da câmera.

---

## 5. `src/utils/hash.js`

```js
export function fakeHash(seed) { ... }
```

Este arquivo só é usado no **modo de demonstração**, quando não há servidor. Ele produz uma string
de 64 caracteres que *parece* um SHA-256, apenas para a tela ter o que mostrar.

O comentário no topo do arquivo diz isso explicitamente, e vale repetir na apresentação: no modo
conectado o hash é real, calculado pelo servidor com `node:crypto`. Um hash de verdade não pode
ser calculado no celular a partir de um nome de arquivo — precisa do conteúdo.

```js
h1 = (h1 ^ text.charCodeAt(i)) >>> 0;
h1 = (h1 * 16777619) >>> 0;
```

`>>> 0` força o resultado a caber em 32 bits sem sinal — em JavaScript, operações com bits
trabalham em 32 bits, e sem isso o número viraria negativo.

---

## 6. `src/data/suppliers.js`

```js
export const CONTRATANTE = { name: 'Grupo Meridiano', unit: 'Diretoria de Suprimentos', user: 'Camila Ribeiro' };
export const MY_SUPPLIER_ID = 'FOR-1042';
```

Constantes exportadas do modo de demonstração. `MY_SUPPLIER_ID` é o fornecedor "logado" quando se
entra sem servidor.

```js
{
  type: 'treinamento', file: 'certificado_lgpd_equipe.pdf',
  issuedAt: isoFromToday(-353), expiresAt: isoFromToday(12)
}
```

As datas são geradas em relação a hoje. Esse documento vence sempre em 12 dias, o que garante que
a demonstração mostre o estado "vencendo" independentemente de quando o app for aberto.

Os oito fornecedores foram montados para cobrir os três cenários: dois totalmente regulares, quatro
em atenção e dois irregulares.

---

## 7. `src/config.js` e `src/api/client.js`

### `src/config.js`

```js
export const DEFAULT_API_URL = 'http://192.168.0.15:3333/api';
export const REQUEST_TIMEOUT = 12000;
```

O endereço padrão da API. O comentário no arquivo explica o ponto que mais confunde quem roda o
projeto pela primeira vez: **o celular não enxerga o `localhost` do computador**. `localhost` no
celular é o próprio celular.

### `src/api/client.js`

```js
let baseUrl = DEFAULT_API_URL;

export function setBaseUrl(url) {
  baseUrl = String(url || '').trim().replace(/\/+$/, '');
}
```

`baseUrl` é uma variável de módulo: existe uma só para o app inteiro. A expressão `/\/+$/` remove
barras no fim, para não gerar `.../api//health`.

```js
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
```

Erro próprio, carregando o código HTTP. Permite à tela diferenciar "senha errada" (401) de
"servidor fora do ar" (0).

```js
async function request(path, { method = 'GET', body, token, form } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
```

`AbortController` é o mecanismo padrão de cancelamento do `fetch`. Sem ele, digitar um IP errado
deixaria o app "carregando" para sempre. O `setTimeout` dispara o cancelamento depois de 12
segundos.

```js
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !form) headers['Content-Type'] = 'application/json';
```

O `Content-Type` é definido **só quando não é formulário**. No upload, quem precisa montar esse
cabeçalho é o próprio `FormData`, porque ele inclui um separador (*boundary*) gerado na hora.
Defini-lo à mão quebraria o upload — é um erro clássico.

```js
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (parseError) {
      throw new ApiError('Resposta inesperada do servidor.', response.status);
    }
```

Lemos como texto e convertemos manualmente, em vez de usar `response.json()` direto. Motivo: se o
endereço apontar para algo que não é a API (um roteador, por exemplo), a resposta vem em HTML — e
`response.json()` explodiria com um erro incompreensível. Assim, a mensagem é clara.

```js
    if (!response.ok) {
      throw new ApiError((data && data.error) || `Erro ${response.status}.`, response.status);
    }
```

`response.ok` é verdadeiro para status 200–299. Preferimos a mensagem que a API mandou; se não
houver, usamos o código.

```js
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') {
      throw new ApiError('O servidor não respondeu. Confira o endereço e a rede.', 0);
    }
    throw new ApiError(`Não foi possível falar com a API em ${baseUrl}.`, 0);
  } finally {
    clearTimeout(timer);
  }
```

- Erros nossos passam direto; os outros viram mensagem legível.
- Incluir o `baseUrl` na mensagem de falha de rede é proposital: mostra na tela o endereço que o
  app tentou, que é justamente o que costuma estar errado.
- `finally` limpa o temporizador **sempre**, inclusive quando deu certo — senão ficaria um
  `setTimeout` pendurado a cada requisição.

```js
  uploadDocument: (token, { file, type, expiresAt }) => {
    const data = new FormData();
    data.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/pdf' });
    data.append('type', type);
    data.append('expiresAt', expiresAt);
    return request('/me/documents', { method: 'POST', token, body: data, form: true });
  },
```

Este trecho é específico do React Native. Em um navegador, `FormData.append` receberia um objeto
`File`; aqui recebe um objeto com `uri`, `name` e `type`, e o React Native se encarrega de ler o
arquivo do disco do celular e montar o corpo `multipart`.

---

## 8. `src/api/adapters.js`

O arquivo que faz app e API conversarem sem que as telas precisem saber de onde vieram os dados.

```js
export function supplierFromApi(apiSupplier) {
  const passport = apiSupplier.passport || [];
  return {
    id: apiSupplier.id,
    name: apiSupplier.name,
    ...
    documents: passport
      .filter((item) => item.document)
      .map((item) => ({
        id: item.document.id,
        type: item.key,
        file: item.document.fileName,
        issuedAt: item.document.issuedAt,
        expiresAt: item.document.expiresAt,
        hash: item.document.sha256,
      })),
  };
}
```

O ponto de projeto mais importante do app está aqui.

A API devolve o passaporte **já montado**, com os 7 itens e seus status. O app, no modo de
demonstração, tem apenas uma lista de documentos e calcula o passaporte sozinho. São dois formatos
diferentes para a mesma informação.

Em vez de encher as telas de `if (modo === 'api')`, este adaptador converte o formato da API no
formato interno. O resultado: **todas as telas funcionam igual nos dois modos**, e a regra de
score é aplicada uma vez só, em `utils/score.js`.

O `.filter((item) => item.document)` descarta os itens pendentes — eles não têm documento nenhum, e
a função `getPassport` vai recriá-los como pendentes de qualquer forma.

```js
export function logFromApi(apiLog) {
  return { ..., at: new Date(apiLog.at).getTime() };
}
```

A API grava a data em texto ISO; a tela de auditoria formata a partir de milissegundos.
`new Date(texto).getTime()` faz a ponte.

---

## 9. `src/context/AppContext.js`

O cérebro do app: guarda o estado global e expõe as ações.

```js
const AppContext = createContext(null);
```

Cria o canal. O `null` é o valor quando alguém usa o contexto fora do provedor — e é o que a
verificação no final do arquivo detecta.

```js
export function AppProvider({ children }) {
  const [mode, setMode] = useState(null);   // null | 'api' | 'demo'
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [mySupplier, setMySupplier] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
```

Oito estados, cada um com uma responsabilidade. `mode` é o que decide se as ações vão para o
servidor ou para a memória local. `mode === null` significa "ninguém entrou ainda" — é o que faz a
tela de login aparecer.

```js
  const role = user ? user.role : null;
```

Valor **derivado**: não é um estado separado. Guardar o papel em um `useState` próprio criaria a
chance de ele ficar dessincronizado do usuário. A regra geral: se dá para calcular a partir de
outro estado, calcule.

### Entrada

```js
  const loginWithApi = useCallback(async (email, password, apiUrl) => {
    if (apiUrl) setBaseUrl(apiUrl);
    setLoading(true);
    setError(null);
    try {
      const data = await api.login(email, password);
      setToken(data.token);
      setUser(data.user);
      setMode('api');
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);
```

- Não há `catch`: o erro **sobe** para a tela de login, que é quem sabe como mostrá-lo. O `finally`
  garante que o indicador de carregamento desligue mesmo assim.
- A lista de dependências vazia `[]` no `useCallback` significa "esta função nunca precisa ser
  recriada" — ela só usa funções que não mudam.

```js
  const startDemo = useCallback((demoRole) => {
    setToken(null);
    setUser(DEMO_USERS[demoRole]);
    setMode('demo');
    setSuppliers(initialSuppliers);
    setMySupplier(initialSuppliers.find((s) => s.id === MY_SUPPLIER_ID) || initialSuppliers[0]);
    setLogs(demoLogs);
    setError(null);
  }, []);
```

Carrega os dados fictícios direto na memória. Note o `|| initialSuppliers[0]`: se alguém mudar o
`MY_SUPPLIER_ID` e errar, o app não quebra.

```js
  const logout = useCallback(() => {
    setMode(null); setToken(null); setUser(null);
    setSuppliers([]); setMySupplier(null); setLogs([]); setError(null);
  }, []);
```

Sair **limpa tudo**. Não basta esquecer o token: os dados do fornecedor anterior não podem
sobreviver na memória para a próxima sessão.

### Carregamento

```js
  const refresh = useCallback(async () => {
    if (mode !== 'api' || !user) return;
    setLoading(true);
    setError(null);
    try {
      if (user.role === 'fornecedor') {
        const data = await api.myPassport(token);
        setMySupplier(supplierFromApi(data.supplier));
      } else {
        const [suppliersData, logsData] = await Promise.all([api.suppliers(token), api.logs(token)]);
        setSuppliers(suppliersFromApi(suppliersData.suppliers));
        setLogs(logsFromApi(logsData.logs));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mode, token, user]);
```

- A primeira linha é uma **guarda**: no modo de demonstração não há o que buscar.
- Cada papel busca só o que pode ver. Um fornecedor pedindo `/suppliers` levaria 403 do servidor —
  então nem pedimos.
- `Promise.all` dispara as duas requisições **em paralelo**. Em sequência levaria a soma dos
  tempos; em paralelo, o tempo da mais lenta.
- Aqui existe `catch`, porque uma atualização de fundo não deve derrubar a tela: o erro vira uma
  faixa vermelha no painel.

```js
  useEffect(() => {
    if (mode === 'api' && user) refresh();
  }, [mode, user]);
```

Assim que o login termina (`mode` e `user` mudam), os dados são buscados. É o efeito que liga
"entrou" a "tem dados na tela".

### Ações

```js
  const verifyCode = useCallback(async (rawCode) => {
    const code = String(rawCode || '').trim().toUpperCase();
    const id = code.startsWith('SUPPLYPASS:') ? code.replace('SUPPLYPASS:', '') : code;

    if (mode === 'api') {
      const data = await api.verify(token, code);
      await refresh();
      return data.supplier.id;
    }

    const supplier = suppliers.find((s) => s.id === id);
    if (!supplier) throw new Error('Este QR Code não pertence a um passaporte válido.');
    addLog({ ... });
    return supplier.id;
  }, [mode, token, suppliers, user, addLog, refresh]);
```

A função tem os dois caminhos, e **a tela não precisa saber qual foi usado**: ela recebe um id de
fornecedor ou uma exceção, nos dois casos.

No modo API, quem valida o código é o servidor — inclusive registrando a consulta na trilha. O
`await refresh()` logo em seguida traz a trilha atualizada, para a aba de auditoria já mostrar o
registro novo.

```js
  const uploadDocument = useCallback(async ({ type, file, expiresAt }) => {
    if (mode === 'api') {
      const data = await api.uploadDocument(token, { file, type, expiresAt });
      setMySupplier(supplierFromApi(data.supplier));
      return { hash: data.document.sha256, fileName: data.document.fileName, real: true };
    }
    ...
    return { hash, fileName, real: false };
  }, [mode, token, user, addLog]);
```

Os dois caminhos devolvem **o mesmo formato**, com um campo `real` dizendo se o hash veio do
servidor. A tela usa esse campo apenas para escrever "(simulado)" ao lado do hash — honestidade na
interface.

No modo API, a resposta do upload já traz o passaporte recalculado, e `setMySupplier` atualiza a
tela na hora: é isso que faz o score subir de 83 para 94 na frente da turma.

```js
  const getSupplier = useCallback((id) => {
    if (mySupplier && mySupplier.id === id) return mySupplier;
    return suppliers.find((s) => s.id === id) || null;
  }, [suppliers, mySupplier]);
```

Procura primeiro no fornecedor logado, depois na lista. Assim a mesma função serve aos dois
perfis.

```js
  const value = useMemo(() => ({ mode, role, user, ... }), [ ...tudo... ]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
```

O `useMemo` aqui não é enfeite: sem ele, o objeto `value` seria **novo a cada render**, e todo
componente que usa o contexto redesenharia sempre, mesmo sem nada ter mudado.

```js
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp precisa estar dentro de <AppProvider>');
  return ctx;
}
```

*Hook* próprio. Além de encurtar a chamada nas telas, dá uma mensagem clara se alguém esquecer o
provedor — bem melhor que um `undefined` estourando duas telas adiante.

---

## 10. `App.js` e `src/navigation/RootNavigator.js`

### `App.js`

```jsx
export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
```

Três camadas, e **a ordem importa**:

1. `SafeAreaProvider` mede as áreas ocupadas por *notch*, barra de status e barra de gestos.
2. `AppProvider` fornece o estado — precisa envolver a navegação, porque o navegador decide as
   telas com base no papel do usuário.
3. `NavigationContainer` é a raiz da navegação.

```js
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, ... } };
```

Alinha as cores da navegação às do app. Sem isso, aparece um flash branco padrão nas transições.

### `RootNavigator.js`

```js
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
```

- **Stack** (pilha) — telas empilhadas, com voltar. Usada para o passaporte, o resultado da
  verificação e o envio de documento.
- **Tab** (abas) — navegação lado a lado, na barra inferior.

```js
function tabIcon(outline, filled) {
  return function renderIcon({ color, size, focused }) {
    return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
  };
}
```

Função que devolve função, de novo. Ela permite escrever
`tabBarIcon: tabIcon('grid-outline', 'grid')` e ganhar de brinde o comportamento de ícone
preenchido quando a aba está ativa — um detalhe pequeno que faz o app parecer nativo.

```js
const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  ...
};
```

`headerShown: false` desliga o cabeçalho da biblioteca, porque o app usa o componente `Screen`
próprio. Ter um só cabeçalho, nosso, é o que dá consistência visual entre telas de aba e telas de
pilha.

```jsx
export default function RootNavigator() {
  const { role } = useApp();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!role ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : role === 'contratante' ? (
        <Stack.Group>
          <Stack.Screen name="ContratanteTabs" component={ContratanteTabs} />
          <Stack.Screen name="SupplierPassport" component={SupplierPassportScreen} />
          <Stack.Screen name="VerifyResult" component={VerifyResultScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="FornecedorTabs" component={FornecedorTabs} />
          <Stack.Screen name="AddDocument" component={AddDocumentScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
```

Este é o **controle de acesso do lado do app**, e ele é estrutural: as telas da contratante
simplesmente **não existem** na navegação quando o usuário é fornecedor. Não é um `if` que esconde
um botão — a rota não está registrada, então nem por engano é possível chegar lá.

Trocar de perfil não é "navegar": é o `role` mudar, e a árvore inteira ser remontada.

---

## 11. Componentes

### `Screen.js` — o esqueleto de toda tela

```jsx
export default function Screen({ title, subtitle, onBack, right = null, children,
  scroll = true, variant = 'primary', contentStyle, onRefresh = null, refreshing = false }) {
```

Dez props com valores padrão. Uma tela simples usa `<Screen title="...">`; as demais ligam o que
precisam.

```jsx
  const isPrimary = variant === 'primary';
  const headerBg = isPrimary ? colors.primary : colors.card;
  const fg = isPrimary ? colors.white : colors.text;
  const subFg = isPrimary ? 'rgba(255,255,255,0.78)' : colors.textMuted;
```

Duas variações de cabeçalho — azul ou branco — resolvidas em quatro variáveis, sem duplicar o
JSX.

```jsx
    <SafeAreaView edges={['top']} style={{ backgroundColor: headerBg }}>
```

`edges={['top']}` aplica o respiro **só em cima**. A parte de baixo é responsabilidade da barra de
abas, que já cuida disso. Pintar o `SafeAreaView` com a cor do cabeçalho é o que faz a área do
relógio ficar azul em vez de branca.

```jsx
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={fg} />
        </Pressable>
      ) : null}
```

- O botão só aparece se houver função de voltar.
- `hitSlop={12}` amplia a área tocável em 12 pontos além do desenho, sem mudar o visual. É
  acessibilidade: o alvo real fica confortável para o dedo.

```jsx
      {scroll ? (
        <ScrollView ... refreshControl={onRefresh ? <RefreshControl ... /> : undefined}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, contentStyle]}>{children}</View>
      )}
```

Telas normais rolam sozinhas. Telas com `FlatList` passam `scroll={false}` — **duas áreas de
rolagem aninhadas quebram a rolagem** e o React Native até avisa no console.

O `refreshControl` só é criado quando há `onRefresh`, o que desliga o "puxar para atualizar" no
modo de demonstração, onde não há o que atualizar.

### `Card.js`, `SectionTitle.js`, `PrimaryButton.js`

```jsx
export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
```

O array `[styles.card, style]` é a forma de compor estilos no React Native: o que vem depois
sobrescreve. Assim uma tela pode fazer `<Card style={{ paddingVertical: 0 }}>` sem reescrever o
componente.

```jsx
export default function PrimaryButton({ label, onPress, icon, variant = 'solid', disabled, style }) {
  const outline = variant === 'outline';
  const ghost = variant === 'ghost';
  const fg = outline || ghost ? colors.primary : colors.white;
```

Três variações no mesmo componente. A cor do texto e do ícone (`fg`) é calculada uma vez e usada
nos dois.

```jsx
      style={({ pressed }) => [ styles.button, outline && styles.outline, disabled && styles.disabled,
        pressed && !disabled && styles.pressed, style ]}
```

O `Pressable` aceita uma **função** de estilo e informa se está pressionado. `pressed && !disabled`
evita o efeito de toque em botão desabilitado.

`condicao && estilo` devolve `false` quando a condição é falsa, e o React Native ignora valores
falsos no array — é o idioma padrão para estilo condicional.

### `StatusBadge.js` — o selo

```jsx
export default function StatusBadge({ status, size = 'md', text }) {
  const small = size === 'sm';
  return (
    <View style={[styles.badge, { backgroundColor: status.soft }, small && { paddingVertical: 3, ... }]}>
      <Ionicons name={status.icon} size={small ? 12 : 14} color={status.color} />
      <Text style={[styles.text, { color: status.color, fontSize: small ? 11 : 12 }]}>
        {text || status.short || status.label}
      </Text>
    </View>
  );
}
```

O componente **não decide cor nenhuma**: tudo vem do objeto `status` definido em `utils/score.js`.
Por isso ele serve tanto para status de documento quanto para status geral do fornecedor.

`{text || status.short || status.label}` é uma cadeia de alternativas: usa o texto explícito, senão
a versão curta, senão o rótulo completo.

### `ScoreGauge.js` — o medidor circular

O componente mais interessante graficamente. Ele desenha um anel de progresso com SVG.

```jsx
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
```

- `Math.max(0, Math.min(100, ...))` prende o valor entre 0 e 100, aconteça o que acontecer.
- O raio desconta a espessura do traço, senão o anel vazaria da área.
- A circunferência (2πr) é o comprimento total da linha do círculo — e é a chave do truque a
  seguir.

```jsx
    <Circle
      cx={size / 2} cy={size / 2} r={radius}
      stroke={color} strokeWidth={stroke} strokeLinecap="round"
      strokeDasharray={`${circumference} ${circumference}`}
      strokeDashoffset={circumference * (1 - value / 100)}
      fill="none"
    />
```

**Como funciona:** `strokeDasharray` transforma a linha em tracejado, com traço e espaço do
tamanho da circunferência inteira — ou seja, um traço só, que cobre todo o círculo.
`strokeDashoffset` empurra esse traço para trás. Com score 100 o deslocamento é 0 (círculo cheio);
com score 0 o deslocamento é a circunferência inteira (nada aparece); com 83, some 17% do anel.

```jsx
    <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
```

Sem essa rotação o anel começaria às 3 horas. Girando −90° em torno do centro, ele começa no topo,
como todo medidor.

```jsx
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
```

`absoluteFill` posiciona o SVG cobrindo todo o `View` pai, o que deixa o número desenhado **por
cima** do anel, centralizado, sem cálculo de posição.

### `DocumentRow.js` — a linha de documento

```js
function describe(item) {
  const { status, daysLeft, doc } = item;
  if (status.key === 'pendente') return 'Documento não enviado';
  if (status.key === 'vencido') {
    const days = Math.abs(daysLeft);
    return `Vencido há ${days} ${days === 1 ? 'dia' : 'dias'} · ${formatDate(doc.expiresAt)}`;
  }
  if (status.key === 'vencendo') {
    if (daysLeft === 0) return `Vence hoje · ${formatDate(doc.expiresAt)}`;
    return `Vence em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} · ${formatDate(doc.expiresAt)}`;
  }
  return `Válido até ${formatDate(doc.expiresAt)}`;
}
```

Uma função só para transformar status em frase em português correto: singular/plural, "vence hoje"
em vez de "vence em 0 dias", "vencido há" em vez de "vence em −14 dias". São detalhes que separam
um protótipo de um app que parece pronto.

```jsx
  const content = ( <> ... </> );
  const baseStyle = [styles.row, last ? styles.lastRow : null];

  if (!onPress) return <View style={baseStyle}>{content}</View>;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [...baseStyle, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
```

A mesma linha serve para dois casos: clicável (do fornecedor, que envia documento) e apenas
informativa (da contratante). O conteúdo é montado uma vez em `content` e reaproveitado.

O `<>...</>` é um *fragmento*: agrupa elementos sem criar um `View` extra na árvore.

A prop `last` remove a borda inferior do último item — sem ela, a última linha teria um risco solto
antes da borda do cartão.

### `SupplierCard.js`, `KpiCard.js`, `PassportBody.js`

```jsx
const { score, overall, problemas, vencendo } = summarize(supplier);
```

O cartão do fornecedor faz uma chamada e já tem tudo. Toda a lógica está em `utils/score.js`; o
componente só desenha.

```jsx
  card: { flexGrow: 1, flexBasis: '46%', ... }
```

No `KpiCard`, `flexBasis: '46%'` com `flexWrap: 'wrap'` no container produz uma grade 2×2 que se
adapta à largura da tela — dois cartões por linha em qualquer celular.

`PassportBody` é o componente compartilhado entre a tela da contratante e a do fornecedor: os dois
veem exatamente o mesmo passaporte. Ele separa obrigatórios de complementares:

```jsx
  const obrigatorios = passport.filter((i) => i.required);
  const complementares = passport.filter((i) => !i.required);
```

Isso comunica visualmente o que a regra do score diz: nem todo documento pesa igual.

---

## 12. Telas

### `LoginScreen.js`

```jsx
const CONTAS = [
  { label: 'Contratante', email: 'compras@meridiano.com.br' },
  { label: 'Fornecedor', email: 'contato@novatech.com.br' },
];
```

Contas de demonstração em botões de preenchimento rápido. Em um app real isso não existiria — aqui
existe porque digitar e-mail e senha em um celular, na frente da turma, é o jeito mais fácil de
errar.

```jsx
  const entrar = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await loginWithApi(email.trim(), password, apiUrl);
    } catch (error) {
      setStatus({ type: 'erro', text: error.message });
      setShowServer(true);
    } finally {
      setBusy(false);
    }
  };
```

Repare no `setShowServer(true)` dentro do `catch`: quando o login falha, a seção de configuração do
servidor **abre sozinha**. A causa mais provável de falha é o endereço errado, então a tela já
oferece o que consertar.

```jsx
  const testarConexao = async () => {
    setBaseUrl(apiUrl);
    try {
      const data = await api.health();
      setStatus({ type: 'ok', text: `Servidor respondeu: ${data.service} (${data.status}).` });
    } catch (error) {
      setStatus({ type: 'erro', text: error.message });
    }
    ...
  };
```

Um botão só para testar o endereço, antes de tentar entrar. Separa dois problemas que se
confundem: "não achei o servidor" e "a senha está errada".

```jsx
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
```

No iOS o teclado cobre os campos e é preciso empurrar o conteúdo; no Android o sistema já faz isso.
`Platform.OS` é como o React Native permite esses ajustes pontuais.

```jsx
        <ScrollView keyboardShouldPersistTaps="handled">
```

Sem essa prop, o primeiro toque com o teclado aberto só fecharia o teclado, e o usuário teria que
tocar duas vezes em cada botão.

### `DashboardScreen.js`

```jsx
  const data = useMemo(() => {
    const rows = suppliers.map((supplier) => ({ supplier, ...summarize(supplier) }));
    const regulares = rows.filter((r) => r.overall.key === 'regular').length;
    ...
    const vencendo = [];
    rows.forEach(({ supplier, passport }) => {
      passport.filter((item) => item.status.key === 'vencendo')
              .forEach((item) => vencendo.push({ supplier, item }));
    });
    vencendo.sort((a, b) => a.item.daysLeft - b.item.daysLeft);
    ...
  }, [suppliers]);
```

Todas as estatísticas do painel em um `useMemo` só, recalculado apenas quando `suppliers` muda.

O trecho do `vencendo` **achata** duas listas em uma: para cada fornecedor, para cada documento
vencendo, um item com os dois. Depois ordena por dias restantes — o mais urgente aparece primeiro.
`a - b` é o comparador padrão para ordem crescente.

```jsx
      conformidade: rows.length ? Math.round((regulares / rows.length) * 100) : 0,
```

A guarda `rows.length ?` evita divisão por zero enquanto a lista ainda está carregando. Sem ela, a
tela mostraria `NaN%` por um instante.

```jsx
      onRefresh={mode === 'api' ? refresh : undefined}
      refreshing={loading}
```

"Puxar para atualizar" só no modo conectado.

```jsx
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
```

O erro aparece **junto com** os dados que já existem, não no lugar deles. Perder a conexão não
apaga a tela.

### `SuppliersScreen.js`

```jsx
  const list = useMemo(() => {
    const term = query.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesTerm = !term
        || supplier.name.toLowerCase().includes(term)
        || supplier.cnpj.includes(term)
        || supplier.category.toLowerCase().includes(term);
      const matchesFilter = filter === 'todos' || getOverallStatus(supplier).key === filter;
      return matchesTerm && matchesFilter;
    });
  }, [suppliers, query, filter]);
```

- `!term ||` — busca vazia casa com todo mundo.
- `toLowerCase()` nos dois lados torna a busca indiferente a maiúsculas. O CNPJ não precisa, porque
  só tem números e pontuação.
- Os dois critérios (texto e filtro) são independentes e combinam com `&&`.

```jsx
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SupplierCard ... />}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum fornecedor encontrado...</Text>}
      />
```

`FlatList` só renderiza o que está visível — com 8 fornecedores tanto faz, mas é o componente certo
para uma lista que pode crescer.

`keyExtractor` dá a cada item uma identidade estável, para o React saber o que mudou.
`ListEmptyComponent` cobre o caso de filtro sem resultado, que é fácil de esquecer.

### `SupplierPassportScreen.js`

```jsx
  const supplier = getSupplier(route.params.id);

  if (!supplier) {
    return (
      <Screen title="Passaporte" onBack={() => navigation.goBack()}>
        <Text style={styles.note}>Fornecedor não encontrado.</Text>
      </Screen>
    );
  }
```

`route.params` são os dados passados na navegação (`navigate('SupplierPassport', { id })`). A saída
antecipada evita que todo o resto do componente precise checar se o fornecedor existe.

```jsx
  const registrarVerificacao = async () => {
    setBusy(true);
    try {
      await registerCheck(supplier);
      Alert.alert('Verificação registrada', 'A consulta foi gravada na trilha de auditoria...');
    } catch (error) {
      Alert.alert('Não foi possível registrar', error.message);
    } finally {
      setBusy(false);
    }
  };
```

O padrão que se repete em toda ação: liga o ocupado, tenta, avisa o resultado, desliga o ocupado no
`finally`. O botão usa esse estado (`label={busy ? 'Registrando...' : ...}` e `disabled={busy}`)
para não deixar tocar duas vezes.

### `ScanScreen.js`

```jsx
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) setScanned(false);
  }, [isFocused]);
```

- `useCameraPermissions` devolve o estado da permissão e a função para pedi-la.
- `useIsFocused` diz se a tela está visível. Duas coisas dependem disso: a câmera só é montada
  quando a aba está em foco (economiza bateria e evita a câmera ligada em segundo plano), e o
  travamento de leitura é liberado ao voltar para a aba.

```jsx
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleBarcode}
            />
```

`onBarcodeScanned={scanned ? undefined : handleBarcode}` é o detalhe importante: a câmera dispara o
evento **muitas vezes por segundo** enquanto o código estiver visível. Passar `undefined` desliga o
tratador depois da primeira leitura, senão a mesma verificação seria feita dezenas de vezes.

```jsx
  const handleBarcode = ({ data }) => {
    if (scanned || busy) return;
    setScanned(true);
    verify(data);
  };
```

Segunda trava, agora dentro da função, porque a atualização de estado do React não é instantânea.

```jsx
      Alert.alert('Código não reconhecido', error.message, [
        { text: 'Tentar de novo', onPress: () => setScanned(false) },
      ]);
```

Só ao tocar em "Tentar de novo" a câmera volta a ler. Sem isso, um QR inválido dispararia alertas
em sequência sem parar.

```jsx
          {suppliers.slice(0, 4).map((supplier) => (
            <Pressable key={supplier.id} onPress={() => verify(supplier.id)} style={styles.demoChip}>
```

Os códigos de demonstração. Existem para o caso de haver um único celular na apresentação — sem
eles, não haveria como demonstrar a verificação.

### `VerifyResultScreen.js`

```jsx
  const verifiedAt = useMemo(() => Date.now(), []);
```

`useMemo` com dependências vazias congela o horário no momento em que a tela abriu. Sem ele, o
horário mudaria a cada redesenho.

```jsx
      <View style={[styles.seal, { backgroundColor: overall.soft, borderColor: overall.color }]}>
        <Ionicons name={overall.icon} size={44} color={overall.color} />
        <Text style={[styles.sealTitle, { color: overall.color }]}>{overall.label}</Text>
        <Text style={styles.sealMessage}>{overall.message}</Text>
      </View>
```

O "selo" — ícone grande, cor e frase, todos vindos do objeto de status. É a tela que a contratante
olha por dois segundos e decide.

```jsx
      {alertas.length > 0 ? ( <> ... </> ) : null}
```

A seção de problemas só aparece se houver problemas. Um fornecedor regular vê um selo verde e nada
de vermelho.

### `AddDocumentScreen.js`

```jsx
  const escolherArquivo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/pdf', size: asset.size });
    } catch (error) {
      Alert.alert('Não foi possível abrir os arquivos', error.message);
    }
  };
```

- `type` limita o que o seletor mostra — os mesmos formatos que a API aceita.
- `copyToCacheDirectory: true` copia o arquivo para uma pasta acessível ao app. Sem isso, a URI
  devolvida pode apontar para um local que o upload não consegue ler.
- `result.canceled` cobre o usuário que abriu e desistiu — sair sem fazer nada é o comportamento
  certo.

```jsx
    if (mode === 'api' && !file) {
      Alert.alert('Selecione o arquivo', 'No modo conectado o arquivo é enviado de verdade ao servidor.');
      return;
    }
```

A validação depende do modo: com servidor o arquivo é obrigatório; sem servidor o envio é simulado
e o arquivo é opcional.

```jsx
      Alert.alert('Documento enviado',
        `${result.fileName}\n\nCriptografado com AES-256-GCM e assinado digitalmente.\n\n` +
        `Hash SHA-256${result.real ? '' : ' (simulado)'}:\n${result.hash.slice(0, 32)}…\n\n` +
        `Validade até ${formatDate(expiresAt)}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]);
```

A confirmação mostra o hash — é o momento em que a segurança fica visível para o usuário. O
`(simulado)` aparece só no modo de demonstração: a interface não mente sobre o que fez.

O `onPress` do botão OK volta para a tela anterior, que já vai mostrar a lista atualizada.

### `MyQrScreen.js`

```jsx
        <QRCode value={code} size={196} color={colors.text} backgroundColor={colors.white} />
```

Uma linha gera o QR Code. O `value` é `SUPPLYPASS:FOR-1042`, montado por `passportCode()`.

O fundo branco é obrigatório para a leitura funcionar: leitores precisam do contraste entre módulo
escuro e fundo claro.

```jsx
        <Text style={styles.noteText}>
          O resultado é sempre calculado na hora. Se um documento vencer hoje, o QR passa a mostrar
          o novo status imediatamente, sem precisar gerar outro código.
        </Text>
```

Explica no app a decisão de projeto: o QR carrega **o identificador**, não o status. Se carregasse
o status, um print antigo continuaria "provando" uma situação que já mudou.

### `AuditScreen.js`

```jsx
const KIND = {
  verificacao: { icon: 'qr-code-outline', color: colors.primary, soft: colors.primarySoft },
  upload: { icon: 'cloud-upload-outline', color: colors.green, soft: colors.greenSoft },
  acesso: { icon: 'finger-print-outline', color: colors.amber, soft: colors.amberSoft },
};
```

Mapa de tipo de evento para aparência. No `renderItem`:

```jsx
          const kind = KIND[item.kind] || KIND.acesso;
```

O `|| KIND.acesso` é a proteção: se a API criar um tipo novo de log amanhã, a tela não quebra —
mostra com o ícone padrão.

### `SecurityScreen.js`

Tela sem lógica: duas listas de dados (`CONTROLS` e `ODS`) renderizadas com `.map`. Existe porque
segurança que ninguém enxerga não convence ninguém — e porque é a tela que sustenta a parte da
apresentação sobre criptografia, integridade e LGPD.

---

## Mapa rápido para a apresentação

| Se perguntarem... | A resposta está em |
|---|---|
| "Onde fica a regra do score?" | `src/utils/score.js` (app) e `src/services/score.js` (API) |
| "Como o app sabe que um documento venceu?" | `daysUntil` em `src/utils/dates.js` |
| "O QR guarda os dados do fornecedor?" | Não — `passportCode()` guarda só o id; o status é calculado na consulta |
| "Como funciona o desenho do medidor?" | `ScoreGauge.js`, com `strokeDasharray` e `strokeDashoffset` |
| "O app funciona sem internet?" | Sim, no modo de demonstração — `startDemo` em `AppContext.js` |
| "Um fornecedor consegue ver outro fornecedor?" | Não: as rotas não existem para ele em `RootNavigator.js`, e a API responde 403 |
| "Onde está o controle de estado?" | `src/context/AppContext.js` |
| "Por que existe uma pasta `api/adapters.js`?" | Para as telas funcionarem igual com ou sem servidor |
