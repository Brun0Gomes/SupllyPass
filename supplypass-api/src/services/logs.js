const db = require('../db');
const { newId } = require('./crypto');

const insert = db.prepare(`
  INSERT INTO audit_logs (id, kind, actor, action, target, ip, at)
  VALUES (@id, @kind, @actor, @action, @target, @ip, @at)
`);

// Trilha de auditoria da aplicação: esta camada só grava novos eventos.
// Proteção externa, retenção e centralização serão adicionadas na operação.
function record({ kind, actor, action, target = null, ip = null }) {
  const entry = {
    id: newId('log'),
    kind,
    actor,
    action,
    target,
    ip,
    at: new Date().toISOString(),
  };
  insert.run(entry);
  return entry;
}

const selectAll = db.prepare('SELECT * FROM audit_logs ORDER BY at DESC LIMIT ?');

function list(limit = 100) {
  return selectAll.all(limit).map((row) => ({
    id: row.id,
    kind: row.kind,
    actor: row.actor,
    action: row.action,
    target: row.target,
    at: row.at,
  }));
}

module.exports = { record, list };
