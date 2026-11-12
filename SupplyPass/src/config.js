// ---------------------------------------------------------------------------
// Endereço da API.
//
// IMPORTANTE: o celular NÃO enxerga "localhost" do computador. Coloque aqui o
// IP da sua máquina na rede Wi-Fi. O próprio servidor imprime esse endereço no
// terminal quando você roda "npm start" na pasta supplypass-api:
//
//   rede:   http://192.168.0.15:3333/api  <- use este no app
//
// Você também pode trocar o endereço direto na tela de login do app, no botão
// "Configurar servidor", sem mexer neste arquivo.
// ---------------------------------------------------------------------------
export const DEFAULT_API_URL = 'http://192.168.0.15:3333/api';

// Tempo máximo de espera por resposta da API (ms).
export const REQUEST_TIMEOUT = 12000;
