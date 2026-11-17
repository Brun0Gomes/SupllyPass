import { DEFAULT_API_URL, REQUEST_TIMEOUT } from '../config';
import { Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';

// Endereço em uso. Fica em memória porque a tela de login pode trocá-lo.
let baseUrl = DEFAULT_API_URL;

export function setBaseUrl(url) {
  baseUrl = String(url || '').trim().replace(/\/+$/, '');
}

export function getBaseUrl() {
  return baseUrl;
}

// Erro com informação suficiente para a interface decidir o que mostrar.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Requisição genérica: monta cabeçalhos, aplica timeout e traduz o erro.
async function request(path, { method = 'GET', body, token, form } = {}) {
  if (!baseUrl) {
    throw new ApiError('Configure o endereço da API antes de continuar.', 0);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !form) headers['Content-Type'] = 'application/json';

  try {
    const response = await (form && Platform.OS !== 'web' ? expoFetch : fetch)(`${baseUrl}${path}`, {
      method,
      headers,
      body: form ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (parseError) {
      throw new ApiError('Resposta inesperada do servidor.', response.status);
    }

    if (!response.ok) {
      throw new ApiError((data && data.error) || `Erro ${response.status}.`, response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') {
      throw new ApiError('O servidor não respondeu. Confira o endereço e a rede.', 0);
    }
    throw new ApiError(`Não foi possível falar com a API em ${baseUrl}.`, 0);
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  health: () => request('/health'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: (token) => request('/auth/logout', { method: 'POST', token }),
  me: (token) => request('/auth/me', { token }),
  mfaSetup: (mfaToken) => request('/auth/mfa/setup', { method: 'POST', token: mfaToken }),
  confirmMfa: (mfaToken, code) => request('/auth/mfa/confirm', { method: 'POST', token: mfaToken, body: { code } }),
  verifyMfa: (mfaToken, code) => request('/auth/mfa/verify', { method: 'POST', token: mfaToken, body: { code } }),
  docTypes: (token) => request('/doc-types', { token }),
  suppliers: (token) => request('/suppliers?full=1', { token }),
  supplier: (token, id) => request(`/suppliers/${id}`, { token }),
  createSupplier: (token, input) => request('/suppliers', { method: 'POST', token, body: input }),
  registerSupplierCheck: (token, id) => request(`/suppliers/${id}/check`, { method: 'POST', token }),
  myPassport: (token) => request('/me/passport', { token }),
  verify: (token, code) => request('/verify', { method: 'POST', token, body: { code } }),
  rotateQr: (token) => request('/me/qr/rotate', { method: 'POST', token }),
  logs: (token) => request('/logs', { token }),
  users: (token) => request('/users', { token }),
  createUser: (token, user) => request('/users', { method: 'POST', token, body: user }),
  updateUser: (token, id, changes) =>
    request(`/users/${id}`, { method: 'PATCH', token, body: changes }),
  reviews: (token, status = 'pending') => request(`/reviews?status=${encodeURIComponent(status)}`, { token }),
  reviewDocument: (token, id, decision) =>
    request(`/reviews/${id}/decision`, { method: 'POST', token, body: decision }),

  // Upload real: multipart/form-data com o arquivo escolhido no celular.
  uploadDocument: (token, { file, type, expiresAt }) => {
    const data = new FormData();
    if (Platform.OS === 'web') {
      if (!file.browserFile) throw new ApiError('Não foi possível acessar o arquivo. Selecione-o novamente.', 0);
      data.append('file', file.browserFile);
    } else {
      const selectedFile = new File(file.uri);
      if (!selectedFile.exists) {
        throw new ApiError('Não foi possível acessar o arquivo. Selecione-o novamente.', 0);
      }
      // O fetch do Expo aceita arquivos com bytes(), mas não objetos { uri }.
      data.append('file', {
        name: file.name,
        type: file.mimeType || 'application/pdf',
        bytes: () => selectedFile.bytes(),
      });
    }
    data.append('type', type);
    data.append('expiresAt', expiresAt);
    return request('/me/documents', { method: 'POST', token, body: data, form: true });
  },
};
