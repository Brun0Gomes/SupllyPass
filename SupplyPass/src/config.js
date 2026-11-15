// A URL pode vir do .env do Expo; por exemplo:
// EXPO_PUBLIC_API_URL=https://api.exemplo.com/api
//
// Sem variável, o usuário informa a URL na tela de login. Não deixe um IP
// particular gravado no código, pois ele só funciona na rede de quem o criou.
export const DEFAULT_API_URL = String(process.env.EXPO_PUBLIC_API_URL || '')
  .trim()
  .replace(/\/+$/, '');

// Tempo máximo de espera por resposta da API (ms).
export const REQUEST_TIMEOUT = 12000;
