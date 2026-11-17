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
    action: 'Sessão de demonstração iniciada',
    target: 'Sessão web',
    at: Date.now() - 1000 * 60 * 60 * 30,
  },
];

const DEMO_USERS = {
  gestor: {
    name: CONTRATANTE.user,
    company: CONTRATANTE.name,
    role: 'gestor',
    supplierId: null,
  },
  fornecedor: {
    name: 'Rafael Souza',
    company: 'NovaTech Soluções em TI',
    role: 'fornecedor',
    supplierId: MY_SUPPLIER_ID,
  },
  analista: {
    name: 'Marina Costa',
    company: CONTRATANTE.name,
    role: 'analista',
    supplierId: null,
  },
};

function reviewQueueFromSuppliers(source) {
  return source.flatMap((supplier) =>
    (supplier.documents || [])
      .filter((document) => document.reviewStatus === 'pending')
      .map((document) => ({
        id: document.id || `demo-review:${supplier.id}:${document.type}`,
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierCnpj: supplier.cnpj,
        type: document.type,
        label: DOC_TYPE_MAP[document.type]?.label || document.type,
        fileName: document.file,
        issuedAt: document.issuedAt,
        expiresAt: document.expiresAt,
        uploadedAt: document.uploadedAt || new Date().toISOString(),
        reviewStatus: 'pending',
        reviewNote: null,
        current: true,
      }))
  );
}

export function AppProvider({ children }) {
  // mode: null (deslogado) | 'api' (conectado ao servidor) | 'demo' (dados locais)
  const [mode, setMode] = useState(null);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [authChallenge, setAuthChallenge] = useState(null);

  const [suppliers, setSuppliers] = useState([]);
  const [mySupplier, setMySupplier] = useState(null);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const role = user ? user.role : null;

  // -------------------------------------------------------------------------
  // Entrada
  // -------------------------------------------------------------------------
  const completeApiLogin = useCallback((data) => {
    setToken(data.token);
    setUser(data.user);
    setMode('api');
    setAuthChallenge(null);
    return data.user;
  }, []);

  const loginWithApi = useCallback(async (email, password, apiUrl) => {
    if (apiUrl) setBaseUrl(apiUrl);
    setLoading(true);
    setError(null);
    try {
      const data = await api.login(email, password);
      if (data.mfaRequired || data.mfaSetupRequired) {
        setAuthChallenge({
          kind: data.mfaSetupRequired ? 'setup' : 'verify',
          token: data.mfaToken,
          email: data.email,
        });
        return null;
      }
      return completeApiLogin(data);
    } finally {
      setLoading(false);
    }
  }, [completeApiLogin]);

  const loadMfaSetup = useCallback(async () => {
    if (!authChallenge || authChallenge.kind !== 'setup') {
      throw new Error('A etapa de MFA não está disponível. Entre novamente.');
    }
    const data = await api.mfaSetup(authChallenge.token);
    setAuthChallenge((previous) => ({ ...previous, ...data }));
    return data;
  }, [authChallenge]);

  const confirmMfaSetup = useCallback(async (code) => {
    if (!authChallenge || authChallenge.kind !== 'setup') throw new Error('A etapa MFA expirou.');
    const data = await api.confirmMfa(authChallenge.token, code);
    return completeApiLogin(data);
  }, [authChallenge, completeApiLogin]);

  const verifyMfaLogin = useCallback(async (code) => {
    if (!authChallenge || authChallenge.kind !== 'verify') throw new Error('A etapa MFA expirou.');
    const data = await api.verifyMfa(authChallenge.token, code);
    return completeApiLogin(data);
  }, [authChallenge, completeApiLogin]);

  const cancelAuthChallenge = useCallback(() => setAuthChallenge(null), []);

  const startDemo = useCallback((demoRole) => {
    setToken(null);
    setUser(DEMO_USERS[demoRole]);
    setMode('demo');
    setAuthChallenge(null);
    setSuppliers(initialSuppliers);
    setMySupplier(initialSuppliers.find((s) => s.id === MY_SUPPLIER_ID) || initialSuppliers[0]);
    setLogs(demoLogs);
    setUsers([]);
    setReviews(reviewQueueFromSuppliers(initialSuppliers));
    setError(null);
  }, []);

  const logout = useCallback(() => {
    const activeToken = token;
    const isApi = mode === 'api';
    setMode(null);
    setToken(null);
    setUser(null);
    setAuthChallenge(null);
    setSuppliers([]);
    setMySupplier(null);
    setLogs([]);
    setUsers([]);
    setReviews([]);
    setError(null);
    if (isApi && activeToken) api.logout(activeToken).catch(() => {});
  }, [mode, token]);

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
      } else if (['gestor', 'analista', 'administrador'].includes(user.role)) {
        const [suppliersData, reviewsData, logsData, usersData] = await Promise.all([
          api.suppliers(token),
          user.role === 'analista' ? api.reviews(token) : Promise.resolve(null),
          ['gestor', 'administrador'].includes(user.role) ? api.logs(token) : Promise.resolve(null),
          user.role === 'administrador' ? api.users(token) : Promise.resolve(null),
        ]);
        setSuppliers(suppliersFromApi(suppliersData.suppliers));
        setReviews(reviewsData ? reviewsData.reviews || [] : []);
        setLogs(logsData ? logsFromApi(logsData.logs) : []);
        setUsers(usersData ? usersData.users : []);
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
        return { supplier: data.supplier, verifiedAt: data.verifiedAt, summary: true };
      }

      const supplier = suppliers.find((s) => s.id === id);
      if (!supplier) throw new Error('Este QR Code não pertence a um passaporte válido.');
      addLog({
        kind: 'verificacao',
        actor: `${user.name} · ${user.company}`,
        action: 'Consulta de passaporte via QR Code',
        target: supplier.name,
      });
      return { supplier, verifiedAt: new Date().toISOString(), summary: false };
    },
    [mode, token, suppliers, user, addLog, refresh]
  );

  // Verificação manual, a partir da tela do passaporte.
  const registerCheck = useCallback(
    async (supplier) => {
      if (mode === 'api') {
        await api.registerSupplierCheck(token, supplier.id);
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
        return {
          hash: data.document.sha256,
          fileName: data.document.fileName,
          real: true,
          reviewStatus: data.document.reviewStatus,
        };
      }

      const fileName = (file && file.name) || `${type}_${new Date().getFullYear()}.pdf`;
      const hash = fakeHash(`${MY_SUPPLIER_ID}|${type}|${fileName}|${expiresAt}`);
      const document = {
        id: `demo-doc-${Date.now()}`,
        type,
        file: fileName,
        issuedAt: new Date().toISOString().slice(0, 10),
        expiresAt,
        hash,
        reviewStatus: 'pending',
      };

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
      setReviews((previous) => [
        {
          id: document.id,
          supplierId: MY_SUPPLIER_ID,
          supplierName: user.company,
          supplierCnpj: mySupplier?.cnpj || '',
          type,
          label: DOC_TYPE_MAP[type].label,
          fileName,
          issuedAt: document.issuedAt,
          expiresAt,
          uploadedAt: new Date().toISOString(),
          reviewStatus: 'pending',
          reviewNote: null,
          current: true,
        },
        ...previous.filter((entry) => !(entry.supplierId === MY_SUPPLIER_ID && entry.type === type)),
      ]);
      addLog({
        kind: 'upload',
        actor: user.company,
        action: `Envio de documento para análise (${DOC_TYPE_MAP[type].label})`,
        target: fileName,
      });
      return { hash, fileName, real: false, reviewStatus: 'pending' };
    },
    [mode, token, user, mySupplier, addLog]
  );

  const reviewDocument = useCallback(
    async (id, { decision, note }) => {
      if (mode === 'api') {
        const data = await api.reviewDocument(token, id, { decision, note });
        await refresh();
        return data.review;
      }

      const review = reviews.find((entry) => entry.id === id);
      if (!review) throw new Error('Este documento não está mais na fila de análise.');
      const reviewedAt = new Date().toISOString();
      const reviewedDocument = (document) => ({
        ...document,
        reviewStatus: decision,
        reviewNote: decision === 'rejected' ? note : null,
        reviewedBy: user.name,
        reviewedAt,
      });

      setSuppliers((previous) =>
        previous.map((supplier) =>
          supplier.id !== review.supplierId
            ? supplier
            : {
                ...supplier,
                documents: (supplier.documents || []).map((document) =>
                  document.type === review.type ? reviewedDocument(document) : document
                ),
              }
        )
      );
      setMySupplier((previous) =>
        !previous || previous.id !== review.supplierId
          ? previous
          : {
              ...previous,
              documents: (previous.documents || []).map((document) =>
                document.type === review.type ? reviewedDocument(document) : document
              ),
            }
      );
      setReviews((previous) => previous.filter((entry) => entry.id !== id));
      addLog({
        kind: 'analise',
        actor: `${user.name} · ${user.company}`,
        action: decision === 'approved' ? 'Documento aprovado na análise' : 'Documento reprovado na análise',
        target: `${review.supplierName} · ${review.label}${note ? ` · ${note}` : ''}`,
      });
      return { ...review, reviewStatus: decision, reviewNote: note || null, reviewedAt };
    },
    [mode, token, refresh, reviews, user, addLog]
  );

  const getSupplier = useCallback(
    (id) => {
      if (mySupplier && mySupplier.id === id) return mySupplier;
      return suppliers.find((s) => s.id === id) || null;
    },
    [suppliers, mySupplier]
  );

  const createUser = useCallback(
    async (input) => {
      const data = await api.createUser(token, input);
      setUsers((previous) => [...previous, data.user].sort((a, b) => a.name.localeCompare(b.name)));
      return data.user;
    },
    [token]
  );

  const updateUser = useCallback(
    async (id, changes) => {
      const data = await api.updateUser(token, id, changes);
      setUsers((previous) => previous.map((entry) => (entry.id === id ? data.user : entry)));
      return data.user;
    },
    [token]
  );

  const rotateMyQr = useCallback(async () => {
    if (mode !== 'api') return null;
    const data = await api.rotateQr(token);
    setMySupplier((previous) => (previous ? { ...previous, qrToken: data.qrToken } : previous));
    return data.qrToken;
  }, [mode, token]);

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
      authChallenge,
      apiUrl: getBaseUrl(),
      contratante,
      suppliers,
      mySupplier,
      logs,
      users,
      reviews,
      loading,
      error,
      loginWithApi,
      loadMfaSetup,
      confirmMfaSetup,
      verifyMfaLogin,
      cancelAuthChallenge,
      startDemo,
      logout,
      refresh,
      verifyCode,
      registerCheck,
      uploadDocument,
      getSupplier,
      createUser,
      updateUser,
      rotateMyQr,
      reviewDocument,
      addLog,
    }),
    [
      mode, role, user, token, authChallenge, contratante, suppliers, mySupplier, logs, users, reviews, loading, error,
      loginWithApi, loadMfaSetup, confirmMfaSetup, verifyMfaLogin, cancelAuthChallenge, startDemo, logout, refresh, verifyCode, registerCheck, uploadDocument,
      getSupplier, createUser, updateUser, rotateMyQr, reviewDocument, addLog,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp precisa estar dentro de <AppProvider>');
  return ctx;
}
