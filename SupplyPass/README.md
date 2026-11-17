# SupplyPass — Passaporte digital de fornecedores

App mobile em **React Native + Expo (JavaScript)**.

Centraliza os documentos de cada fornecedor em um passaporte único, mostra o que está válido,
vencendo ou pendente, calcula um **Supplier Score** de conformidade e permite que a empresa
gestor ou verificador consulte tudo em segundos lendo um **QR Code** — antes de liberar o acesso.

O app funciona de dois jeitos:

- **Conectado** — falando com a API em `supplypass-api` (banco SQLite, upload real, hash SHA-256
  de verdade, trilha de auditoria no servidor).
- **Demonstração** — tudo no próprio celular, sem rede e sem servidor. Serve para apresentar em
  sala mesmo que o Wi-Fi não colabore.

A escolha é feita na tela de login.

---

## Como rodar no celular

Você precisa do **Node.js 22 LTS** instalado no computador (https://nodejs.org) e do app
**Expo Go** no celular (Play Store / App Store). Computador e celular na mesma rede Wi-Fi.

```bash
cd SupplyPass
npm install
npx expo install --fix
npx expo start
```

Vai aparecer um QR Code no terminal. Abra o **Expo Go** no celular e escaneie.

> Se o celular não conectar pelo Wi-Fi, rode `npx expo start --tunnel`.

### Para usar o modo conectado

Em **outro terminal**, suba a API:

```bash
cd supplypass-api
npm install
npm start
```

O servidor imprime o endereço de rede:

```
  rede:   http://192.168.0.15:3333/api  <- use este no app
```

Na tela de login do app, toque em **Configurar servidor**, cole esse endereço, toque em
**Testar conexão** e depois em **Entrar**. Os botões *Gestor*, *Analista* e *Fornecedor* preenchem
apenas o e-mail; a senha é a que você definiu como `DEMO_PASSWORD` na API.

Para definir a URL em cada ambiente sem alterar o código, copie `.env.example` para `.env` e
preencha `EXPO_PUBLIC_API_URL`. Se ela estiver vazia, a tela de login pede o endereço da API.

---

## Roteiro de demonstração (5 minutos)

1. **O problema** — abra o app na tela de login e conte a dor: contrato, certidão, LGPD, seguro e
   treinamento espalhados em e-mail, pasta, Excel e WhatsApp.
2. **Entre como _gestor_** — o Painel mostra quantos fornecedores estão regulares, quantos
   documentos vencem em 30 dias e quantas contratações estão bloqueadas. O Gestor entra com
   e-mail e senha; o MFA continua obrigatório para o Administrador.
3. **Abra um fornecedor irregular** (ConstruBase ou SegPrime) — passaporte com documentos em
   vermelho e score baixo.
4. **Verificar por QR Code** — aba *Verificar*. Com dois celulares, abra o outro no perfil
   *fornecedor* → aba *QR Code* e escaneie. Com um celular só, toque em um dos códigos de
   demonstração (ex.: `FOR-1042`). O selo 🟢 / ⚠️ / ❌ aparece em segundos.
5. **Volte ao login e entre como _fornecedor_** — em *Documentos*, envie o "Alvará de
   funcionamento". No modo conectado o arquivo sobe de verdade, o servidor devolve o **hash
   SHA-256** e ele fica **em análise**, sem pontuar antes da decisão.
6. **Entre como _analista_** — na aba *Análises*, aprove ou reprove o documento; uma reprovação
   exige justificativa e aparece para o fornecedor, que pode reenviar a versão corrigida.
7. **Feche pela segurança** — a decisão e o envio aparecem na aba *Auditoria* do gestor com
   autor, alvo, data e hora.

Frase de fechamento: *"SupplyPass é um passaporte digital que centraliza, valida e monitora a
documentação dos fornecedores."*

---

## Regra do Supplier Score

Cada documento tem um peso e a soma dos pesos é 100:

| Documento | Obrigatório | Peso |
|---|---|---|
| Contrato de prestação | sim | 20 |
| Cartão CNPJ | sim | 15 |
| Certidão negativa de débitos | sim | 15 |
| Política de LGPD | sim | 15 |
| Apólice de seguro | não | 12 |
| Certificado de treinamento | não | 12 |
| Alvará de funcionamento | não | 11 |

- documento **válido** → soma o peso inteiro
- documento **vencendo** (faltam 30 dias ou menos) → soma metade do peso
- documento **vencido**, **não enviado**, **em análise** ou **reprovado** → soma zero

O status geral é independente da nota: **qualquer documento obrigatório vencido, ausente, em
análise ou reprovado bloqueia a contratação** (❌ irregular). Só documentos complementares com problema, ou qualquer
documento vencendo, deixam o fornecedor em ⚠️ atenção. Tudo válido = 🟢 regular.

A mesma regra existe nos dois lados — `src/utils/score.js` no app e `src/services/score.js` na
API — e as duas implementações devolvem exatamente o mesmo resultado para a mesma base.

---

## Estrutura do projeto

```
SupplyPass/
├── App.js                        # provider + navegação
├── app.json                      # config do Expo (permissão de câmera)
└── src/
    ├── config.js                 # endereço da API
    ├── theme.js                  # paleta, espaçamentos, sombras
    ├── api/
    │   ├── client.js             # cliente HTTP (token, timeout, upload)
    │   └── adapters.js           # converte o formato da API no modelo do app
    ├── data/suppliers.js         # 8 fornecedores fictícios (modo demonstração)
    ├── utils/
    │   ├── dates.js              # validade, dias restantes, formato brasileiro
    │   ├── score.js              # catálogo de documentos, status e Supplier Score
    │   └── hash.js               # hash simulado (só no modo demonstração)
    ├── context/AppContext.js     # estado do app, login e ações
    ├── components/               # Screen, Card, ScoreGauge, DocumentRow, SupplierCard...
    ├── navigation/RootNavigator.js
    └── screens/
        ├── LoginScreen.js              # login real + modo demonstração
        ├── DashboardScreen.js          # gestor: painel de conformidade
        ├── SuppliersScreen.js          # gestor/analista: busca e filtros
        ├── SupplierPassportScreen.js   # gestor/analista: passaporte completo
        ├── ScanScreen.js               # gestor/analista/verificador: leitor de QR Code
        ├── VerifyResultScreen.js       # resultado limitado da verificação
        ├── AuditScreen.js              # gestor/administrador: trilha de auditoria
        ├── UsersScreen.js              # administrador: usuários e acessos
        ├── ReviewQueueScreen.js        # analista: documentos aguardando decisão
        ├── ReviewDocumentScreen.js     # analista: aprovar/reprovar com justificativa
        ├── MyPassportScreen.js         # fornecedor: meu passaporte
        ├── MyDocumentsScreen.js        # fornecedor: enviar/atualizar documentos
        ├── AddDocumentScreen.js        # fornecedor: formulário de envio
        ├── MyQrScreen.js               # fornecedor: meu QR Code
        └── SecurityScreen.js           # segurança + ODS 8, 9 e 12
```

---

## O que é real e o que é simulado

**Real nos dois modos:** navegação, cálculo de status e score a partir das datas, filtros e busca,
geração do QR Code e leitura pela câmera.

**Real só no modo conectado:** login com senha e token JWT, banco SQLite, upload de arquivo,
hash SHA-256 do arquivo, criptografia AES-256-GCM em repouso, versionamento, aprovação/reprovação
documental e trilha de auditoria gravada no servidor.

O Administrador configura MFA TOTP no primeiro login conectado; para o Gestor, a exigência está
temporariamente desativada. A API encerra sessões que
ficam 30 minutos sem atividade e bloqueia uma conta por 15 minutos após cinco senhas inválidas.
No modo conectado, o QR Code também é assinado pelo servidor; códigos adulterados são recusados.

**Simulado no modo demonstração:** não há servidor — os dados vivem na memória do app e voltam ao
estado inicial ao recarregar; o hash é gerado localmente só para ilustrar o conceito.

## Próximos passos (se o projeto continuar)

- Notificação push 30, 15 e 7 dias antes de cada vencimento
- Assinatura digital com certificado ICP-Brasil
- Verificação pública por link, para quem não tem o app
- Publicação da API em nuvem e build do app com EAS
