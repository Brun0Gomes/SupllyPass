-- Criação explícita para a API distribuída; nenhum cadastro existente é apagado.
CREATE TABLE IF NOT EXISTS supplypass_private.rate_limits (
  bucket TEXT NOT NULL,
  subject_hash TEXT NOT NULL,
  window_start BIGINT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (bucket, subject_hash, window_start)
);
REVOKE ALL ON supplypass_private.rate_limits FROM PUBLIC;
