# SupplyPass — Passaporte digital de fornecedores

Projeto completo: aplicativo mobile, API e documentação.

```
SupplyPass-completo/
├── SupplyPass/                    aplicativo mobile (React Native + Expo)
│   └── README.md                  como rodar no celular + roteiro de demonstração
├── supplypass-api/                backend (Node.js + Express + SQLite)
│   └── README.md                  como rodar, contas de teste e lista de endpoints
├── docs/
│   ├── DOCUMENTACAO-APP.md        explicação linha a linha do aplicativo
│   └── DOCUMENTACAO-API.md        explicação linha a linha da API
└── LEIA-ME.md                     este arquivo
```

## Começando do zero

Você precisa do **Node.js LTS** (https://nodejs.org) e do app **Expo Go** no celular.
Computador e celular na mesma rede Wi-Fi.

**Terminal 1 — a API:**

```bash
cd supplypass-api
copy .env.example .env
# defina JWT_SECRET e DEMO_PASSWORD no arquivo .env
npm install
npm start
```

Anote o endereço de rede que aparece, algo como `http://192.168.0.15:3333/api`.

**Terminal 2 — o aplicativo:**

```bash
cd SupplyPass
npm install
npx expo install --fix
npx expo start
```

Escaneie o QR Code do terminal com o Expo Go. Na tela de login do app, toque em
**Configurar servidor**, cole o endereço anotado, toque em **Testar conexão** e depois em
**Entrar**.

> Sem tempo ou sem rede? Toque em **Contratante** ou **Fornecedor** na seção "Entrar sem
> servidor". O app roda inteiro no celular com dados de demonstração.

## Contas

| Perfil | E-mail | Senha |
|---|---|---|
| Contratante | `compras@meridiano.com.br` | value defined in `DEMO_PASSWORD` |
| Fornecedor | `contato@novatech.com.br` | value defined in `DEMO_PASSWORD` |
| Administrador | `admin@supplypass.app` | value defined in `DEMO_PASSWORD` |

## O roteiro de 5 minutos

1. Tela de login: contar o problema — documentos espalhados em e-mail, pasta, planilha e WhatsApp.
2. Entrar como **contratante**: o painel mostra regulares, vencimentos e bloqueios.
3. Abrir **ConstruBase** ou **SegPrime**: passaporte irregular, score baixo, documento em vermelho.
4. Aba **Verificar**: escanear o QR do outro celular, ou tocar em um código de demonstração.
5. Sair, entrar como **fornecedor**, aba **Documentos**: enviar o "Alvará de funcionamento".
   O hash SHA-256 aparece na confirmação e o score sobe de **83 para 94**.
6. Aba **Segurança** e, no perfil contratante, aba **Auditoria**: tudo que você fez está
   registrado com autor, alvo, data e hora.

Frase de fechamento: *"SupplyPass é um passaporte digital que centraliza, valida e monitora a
documentação dos fornecedores."*

## Se algo der errado

| Sintoma | O que fazer |
|---|---|
| O app não acha o servidor | Confira o IP na tela "Configurar servidor". `localhost` não funciona no celular |
| O Expo não conecta pelo Wi-Fi | Rode `npx expo start --tunnel` |
| Erro de versão de biblioteca | Rode `npx expo install --fix` dentro da pasta `SupplyPass` |
| Quer recomeçar a base do zero | Rode `npm run reset` dentro de `supplypass-api` |
| Nada funciona e a apresentação é agora | Use o modo de demonstração: não precisa de rede nem de servidor |
