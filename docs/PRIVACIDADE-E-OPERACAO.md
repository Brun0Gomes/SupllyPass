# Privacidade e operação do SupplyPass

Este documento é um ponto de partida operacional, não uma declaração de conformidade.
O responsável pelo projeto deve definir a finalidade, base legal, prazos e atendimento aos
titulares conforme o uso real, antes de tratar dados reais.

## Inventário inicial

| Conjunto | Exemplos | Onde está |
|---|---|---|
| Usuários | nome, e-mail, perfil, hash de senha e segredo MFA | tabela `users` |
| Fornecedores | nome, CNPJ, contato e localização | tabela `suppliers` |
| Documentos | nomes, datas, hash, histórico e arquivos cifrados | tabela `documents` e pasta `storage` |
| Sessões | identificador, usuário e horários | tabela `sessions` |
| Auditoria | autor, ação, alvo, IP e data | tabela `audit_logs` |

Os arquivos são cifrados, mas o banco SQLite e os segredos MFA nele armazenados não são
criptografados pela aplicação. Proteja também o disco, backups, acesso ao servidor e chaves.
Não use dados reais nas bases de desenvolvimento e demonstração.

## Retenção e direitos dos titulares

O sistema ainda não aplica prazos nem apaga ou anonimiza dados automaticamente. Antes de
implementar descarte, definir com os responsáveis prazos por categoria, obrigações aplicáveis,
exceções, tratamento de backups e fluxo para solicitações de acesso, correção e exclusão.
`npm run retention:report` lista contagens e datas extremas de logs, sem expor registros nem
alterar o banco. Esses números apoiam a definição da política, mas não a substituem.

## Backup e restauração

Com a API parada, execute `npm run backup -- CAMINHO_NOVO` em `supplypass-api`. A pasta pai
deve existir e o destino ainda não pode existir. O comando usa o backup do SQLite e copia os
arquivos cifrados. A cópia contém banco e dados sensíveis em formato legível para quem tem
acesso ao banco; armazene-a em destino criptografado e restrito. Uma falha pode deixar uma pasta
parcial: confira a saída e não a considere utilizável.

Guarde a chave `FILE_KEY` ou `data/file.key` separadamente, em cofre seguro, com controle de
acesso e cópia recuperável. Também preserve os segredos de configuração necessários à operação.
O script não copia chaves, não criptografa o banco e não agenda nem transfere backups.

Para testar restauração, use ambiente isolado e descartável: restaure a cópia do banco e a pasta
`storage`, configure a mesma chave de arquivos, inicie a API sem expor a rede e teste login e
download com verificação de integridade. Registre a data, o resultado e o tempo. Não restaure
sobre a base existente sem um procedimento aprovado e uma cópia de segurança atual.

## Implantação pendente

- Definir provedor, ambientes separados e rede privada para dados e arquivos.
- Configurar HTTPS/TLS, certificado, proxy confiável, firewall e monitoramento.
- Provisionar cofre de segredos, criptografia de disco e backup externo com retenção definida.
- Centralizar e proteger logs, definir retenção e testar recuperação.
- Configurar antivírus para uploads, testes automatizados e verificações de segurança.
- Usar `npm run bootstrap:admin` para criar o primeiro administrador em um banco vazio, passando
  credenciais pelo ambiente e removendo-as após o uso. A carga de demonstração fica desativada
  em produção; após o primeiro login, configurar MFA.

O limite de requisições atual fica na memória de cada processo e não é compartilhado entre
instâncias. É necessário um mecanismo compartilhado antes de escalar a API.
