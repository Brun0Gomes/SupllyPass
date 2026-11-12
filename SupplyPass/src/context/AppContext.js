import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import initialSuppliers, { CONTRATANTE, MY_SUPPLIER_ID } from '../data/suppliers';
import { api, setBaseUrl, getBaseUrl } from '../api/client';
import { suppliersFromApi, supplierFromApi, logsFromApi } from '../api/adapters';
import { fakeHash } from '../utils/hash';
import { DOC_TYPE_MAP } from '../utils/score';

const AppContext = createContext(null);

// Registros iniciais usados apenas no modo de demonstração.
const demoLogs = [
  {
    id: 'log-seed-3',
    kind: 'verificacao',
    actor: 'Camila Ribeiro · Grupo Meridiano',
    action: 'Consulta de passaporte via QR Code',
    target: 'Alfa Serviços de Limpeza Ltda',
    at: Date.now() - 1000 * 60 * 42,
  },
  {
    id: 'log-seed-2',
    kind: 'upload',
    actor: 'NovaTech Soluções em TI',
    action: 'Envio de documento (Certidão negativa de débitos)',
    target: 'cnd_federal.pdf',
    at: Date.now() - 1000 * 60 * 60 * 26,
  },
  {
    id: 'log-seed-1',
    kind: 'acesso',
    actor: 'Camila Ribeiro · Grupo Meridiano',
    action: 'Autenticação em dois fatores aprovada',
    target: 'Sessão web',
    at: Date.now() - 1000 * 60 * 60 * 30,
  },
];

const DEMO_USERS = {
  contratante: {
    name: CONTRATANTE.user,
    company: CONTRATANTE.name,
    role: 'contratante',
    supplierId: null,
  },
  fornecedor: {
    name: 'Rafael Souza',
    company: 'NovaTech Soluções em TI',
    role: 'fornecedor',
    supplierId: MY_SUPPLIER_ID,
  },
};

export function AppProvider({ children }) {
  // mode: null (deslogado) | 'api' (conectado ao servidor) | 'demo' (dados locais)
  const [mode, setMode] = useState(null);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const [suppliers, setSuppliers] = useState([]);
  const [mySupplier, setMySupplier] = useState(null);
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const role = user ? user.role : null;

  // -------------------------------------------------------------------------
  // Entrada
  // -------------------------------------------------------------------------
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

  const startDemo = useCallback((demoRole) => {
    setToken(null);
    setUser(DEMO_USERS[demoRole]);
    setMode('demo');
    setSuppliers(initialSuppliers);
    setMySupplier(initialSuppliers.find((s) => s.id === MY_SUPPLIER_ID) || initialSuppliers[0]);
    setLogs(demoLogs);
    setError(null);
  }, []);

  const logout = useCallback(() => {
    setMode(null);
    setToken(null);
    setUser(null);
    setSuppliers([]);
    setMySupplier(null);
    setLogs([]);
    setError(null);
  }, []);

  // -------------------------------------------------------------------------
  // Carregamento de dados (só faz sentido no modo API)
  // -------------------------------------------------------------------------
  const refresh = useCallback(async () => {
    if (mode !== 'api' || !user) return;
    setLoading(true);
    setError(null);
    try {
      if (user.role === 'fornecedor') {
        const data = await api.myPassport(token);
        setMySupplier(supplierFromApi(data.supplier));
      } else {
        const [suppliersData, logsData] = await Promise.all([
          api.suppliers(token),
          api.logs(token),
        ]);
        setSuppliers(suppliersFromApi(suppliersData.suppliers));
        setLogs(logsFromApi(logsData.logs));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mode, token, user]);

  // Assim que o login termina, busca os dados do perfil.
  useEffect(() => {
    if (mode === 'api' && user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user]);

  // -------------------------------------------------------------------------
  // Ações
  // -------------------------------------------------------------------------
  const addLog = useCallback((entry) => {
    setLogs((prev) => [
      { id: `log-${Date.now()}-${Math.round(Math.random() * 1000)}`, at: Date.now(), ...entry },
      ...prev,
    ]);
  }, []);

  // Verificação por QR Code. No modo API quem valida (e registra) é o servidor.
  const verifyCode = useCallback(
    async (rawCode) => {
      const code = String(rawCode || '').trim().toUpperCase();
      const id = code.startsWith('SUPPLYPASS:') ? code.replace('SUPPLYPASS:', '') : code;

      if (mode === 'api') {
        const data = await api.verify(token, code);
        await refresh();
        return data.supplier.id;
      }

      const supplier = suppliers.find((s) => s.id === id);
      if (!supplier) throw new Error('Este QR Code não pertence a um passaporte válido.');
      addLog({
        kind: 'verificacao',
        actor: `${user.name} · ${user.company}`,
        action: 'Consulta de passaporte via QR Code',
        target: supplier.name,
      });
      return supplier.id;
    },
    [mode, token, suppliers, user, addLog, refresh]
  );

  // Verificação manual, a partir da tela do passaporte.
  const registerCheck = useCallback(
    async (supplier) => {
      if (mode === 'api') {
        await api.verify(token, supplier.id);
        await refresh();
        return;
      }
      addLog({
        kind: 'verificacao',
        actor: `${user.name} · ${user.company}`,
        action: 'Consulta manual de passaporte',
        target: supplier.name,
      });
    },
    [mode, token, user, addLog, refresh]
  );

  // Envio de documento. No modo API o arquivo sobe de verdade e o servidor
  // devolve o hash SHA-256 real; no modo demonstração o hash é simulado.
  const uploadDocument = useCallback(
    async ({ type, file, expiresAt }) => {
      if (mode === 'api') {
        const data = await api.uploadDocument(token, { file, type, expiresAt });
        setMySupplier(supplierFromApi(data.supplier));
        return { hash: data.document.sha256, fileName: data.document.fileName, real: true };
      }

      const fileName = (file && file.name) || `${type}_${new Date().getFullYear()}.pdf`;
      const hash = fakeHash(`${MY_SUPPLIER_ID}|${type}|${fileName}|${expiresAt}`);
      const document = { type, file: fileName, issuedAt: new Date().toISOString().slice(0, 10), expiresAt, hash };

      setMySupplier((prev) => {
        const rest = (prev.documents || []).filter((d) => d.type !== type);
        return { ...prev, documents: [...rest, document] };
      });
      setSuppliers((prev) =>
        prev.map((s) => {
          if (s.id !== MY_SUPPLIER_ID) return s;
          const rest = (s.documents || []).filter((d) => d.type !== type);
          return { ...s, documents: [...rest, document] };
        })
      );
      addLog({
        kind: 'upload',
        actor: user.company,
        action: `Envio de documento (${DOC_TYPE_MAP[type].label})`,
        target: fileName,
      });
      return { hash, fileName, real: false };
    },
    [mode, token, user, addLog]
  );

  const getSupplier = useCallback(
    (id) => {
      if (mySupplier && mySupplier.id === id) return mySupplier;
      return suppliers.find((s) => s.id === id) || null;
    },
    [suppliers, mySupplier]
  );

  const contratante = useMemo(
    () => ({
      name: (user && user.company) || CONTRATANTE.name,
      unit: CONTRATANTE.unit,
      user: (user && user.name) || CONTRATANTE.user,
    }),
    [user]
  );

  const value = useMemo(
    () => ({
      mode,
      role,
      user,
      token,
      apiUrl: getBaseUrl(),
      contratante,
      suppliers,
      mySupplier,
      logs,
      loading,
      error,
      loginWithApi,
      startDemo,
      logout,
      refresh,
      verifyCode,
      registerCheck,
      uploadDocument,
      getSupplier,
      addLog,
    }),
    [
      mode, role, user, token, contratante, suppliers, mySupplier, logs, loading, error,
      loginWithApi, startDemo, logout, refresh, verifyCode, registerCheck, uploadDocument,
      getSupplier, addLog,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp precisa estar dentro de <AppProvider>');
  return ctx;
}
