// Camada de armazenamento para arquivos já criptografados pela API.
// O bucket precisa ser privado; a chave de serviço permanece apenas no servidor.
function createPrivateStorage({ url, serviceKey, bucket, request = fetch }) {
  if (!url || !serviceKey || !bucket) throw new Error('Configuração do armazenamento privado incompleta.');
  const origin = new URL(url);
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password || !/^[a-z0-9-]+\.supabase\.co$/.test(origin.hostname)) {
    throw new Error('A URL do Supabase Storage precisa ser uma origem HTTPS.');
  }
  if (!/^[a-z0-9][a-z0-9._-]{0,99}$/.test(bucket)) throw new Error('Nome de bucket inválido.');
  const base = `${origin.origin}/storage/v1/object/${encodeURIComponent(bucket)}`;
  function objectUrl(name) {
    if (!/^doc_[a-f0-9]{16}\.enc$/.test(name)) throw new Error('Nome do arquivo inválido.');
    return `${base}/${encodeURIComponent(name)}`;
  }
  // As novas chaves sb_secret_* não são JWTs e não podem ser enviadas como Bearer.
  const headers = serviceKey.startsWith('sb_secret_')
    ? { apikey: serviceKey }
    : { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  return {
    async assertPrivate() {
      const response = await request(`${origin.origin}/storage/v1/bucket/${encodeURIComponent(bucket)}`, { headers });
      if (!response.ok) throw new Error(`Bucket indisponível (HTTP ${response.status}).`);
      const details = await response.json();
      if (details.public !== false) throw new Error('O bucket de documentos não é privado.');
    },
    async put(name, ciphertext) {
      if (!Buffer.isBuffer(ciphertext)) throw new Error('Conteúdo cifrado inválido.');
      const response = await request(objectUrl(name), {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/octet-stream', 'x-upsert': 'false' }, body: ciphertext,
      });
      if (!response.ok) throw new Error(`Falha no armazenamento privado (HTTP ${response.status}).`);
    },
    async get(name) {
      objectUrl(name); // valida o nome antes de construir o caminho autenticado
      const response = await request(`${origin.origin}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${encodeURIComponent(name)}`, { headers });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Falha no armazenamento privado (HTTP ${response.status}).`);
      return Buffer.from(await response.arrayBuffer());
    },
    async remove(name) {
      // A API de Storage remove objetos pelo nome dentro do bucket.
      objectUrl(name); // valida antes de fazer a requisição
      const response = await request(base, {
        method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: [name] }),
      });
      if (!response.ok) throw new Error(`Falha ao limpar arquivo temporário (HTTP ${response.status}).`);
    },
  };
}

module.exports = { createPrivateStorage };
