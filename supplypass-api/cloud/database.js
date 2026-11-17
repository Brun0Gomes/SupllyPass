const { Pool } = require('pg');

function createPool({ connectionString, caCertificate, max = 1 }) {
  if (!connectionString) throw new Error('SUPABASE_DATABASE_URL is required.');
  const parsed = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('Invalid database URL.');
  // node-postgres interpreta parâmetros SSL da URL e eles podem sobrescrever
  // as opções TLS. A CA é configurada separadamente para manter a verificação.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
    if (parsed.searchParams.has(key)) throw new Error('Remove SSL parameters from the database URL.');
  }
  const ssl = { rejectUnauthorized: true };
  if (caCertificate) ssl.ca = caCertificate.replace(/\\n/g, '\n');
  return new Pool({ connectionString, ssl, max, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 });
}

module.exports = { createPool };
