// Traduz o formato da API para o modelo interno do app.
//
// O app calcula status e score localmente (src/utils/score.js) a partir de um
// fornecedor com a lista de documentos. A API devolve o passaporte já montado.
// Estes adaptadores convertem um no outro, então todas as telas continuam
// funcionando igual, com API ou com os dados de demonstração.

export function supplierFromApi(apiSupplier) {
  const passport = apiSupplier.passport || [];
  return {
    id: apiSupplier.id,
    name: apiSupplier.name,
    cnpj: apiSupplier.cnpj,
    category: apiSupplier.category,
    city: apiSupplier.city || '',
    email: apiSupplier.email || '',
    since: apiSupplier.since || '',
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

export function suppliersFromApi(list) {
  return (list || []).map(supplierFromApi);
}

// A API grava a data em ISO; a tela de auditoria trabalha com milissegundos.
export function logFromApi(apiLog) {
  return {
    id: apiLog.id,
    kind: apiLog.kind,
    actor: apiLog.actor,
    action: apiLog.action,
    target: apiLog.target || '',
    at: new Date(apiLog.at).getTime(),
  };
}

export function logsFromApi(list) {
  return (list || []).map(logFromApi);
}
