const db = require('./index');
const { hashPassword, sha256, newId } = require('../services/crypto');

const demoPassword = process.env.DEMO_PASSWORD;

if (!demoPassword) {
  throw new Error('DEMO_PASSWORD must be defined in .env before seeding the database.');
}

function isoFromToday(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

// Os vencimentos sao gravados em relacao ao dia da carga, entao a base
// sempre nasce com os tres cenarios: valido, vencendo e irregular.
// O numero e quantos dias faltam para o documento vencer.
const SEED_SUPPLIERS = [
  {
    id: 'FOR-1017',
    name: 'Alfa Serviços de Limpeza Ltda',
    cnpj: '12.345.678/0001-90',
    category: 'Facilities',
    city: 'São Paulo - SP',
    email: 'contato@alfaservicos.com.br',
    since: '2021',
    docs: { contrato: 400, cnpj: 280, cnd: 140, lgpd: 240, seguro: 300, treinamento: 330, alvara: 210 },
  },
  {
    id: 'FOR-1042',
    name: 'NovaTech Soluções em TI',
    cnpj: '23.456.789/0001-01',
    category: 'Tecnologia da Informação',
    city: 'São Paulo - SP',
    email: 'comercial@novatech.com.br',
    since: '2023',
    docs: { contrato: 185, cnpj: 295, cnd: 155, lgpd: 270, seguro: 105, treinamento: 12 },
  },
  {
    id: 'FOR-1058',
    name: 'ConstruBase Engenharia',
    cnpj: '34.567.890/0001-12',
    category: 'Obras e manutenção',
    city: 'Guarulhos - SP',
    email: 'obras@construbase.com.br',
    since: '2019',
    docs: { contrato: 90, cnpj: 245, cnd: -14, seguro: 265, alvara: 65 },
  },
  {
    id: 'FOR-1063',
    name: 'Sabor & Cia Alimentação',
    cnpj: '45.678.901/0001-23',
    category: 'Alimentação',
    city: 'São Bernardo do Campo - SP',
    email: 'nutricao@saborecia.com.br',
    since: '2022',
    docs: { contrato: 215, cnpj: 285, cnd: 130, lgpd: 205, seguro: 25, alvara: 255 },
  },
  {
    id: 'FOR-1071',
    name: 'RotaCerta Transportes',
    cnpj: '56.789.012/0001-34',
    category: 'Logística',
    city: 'Osasco - SP',
    email: 'frota@rotacerta.com.br',
    since: '2020',
    docs: { contrato: 145, cnpj: 300, cnd: 145, lgpd: 235, seguro: 290, alvara: 225 },
  },
  {
    id: 'FOR-1084',
    name: 'SegPrime Vigilância Patrimonial',
    cnpj: '67.890.123/0001-45',
    category: 'Segurança patrimonial',
    city: 'São Paulo - SP',
    email: 'operacoes@segprime.com.br',
    since: '2018',
    docs: { contrato: -31, cnpj: 310, cnd: 135, lgpd: 195, treinamento: 345 },
  },
  {
    id: 'FOR-1096',
    name: 'VerdeVale Manutenção Predial',
    cnpj: '78.901.234/0001-56',
    category: 'Facilities',
    city: 'Santo André - SP',
    email: 'atendimento@verdevale.com.br',
    since: '2024',
    docs: { contrato: 265, cnpj: 317, cnd: 152, lgpd: 277, seguro: 297, treinamento: 327, alvara: 267 },
  },
  {
    id: 'FOR-1105',
    name: 'PapelExpress Suprimentos',
    cnpj: '89.012.345/0001-67',
    category: 'Suprimentos de escritório',
    city: 'Barueri - SP',
    email: 'vendas@papelexpress.com.br',
    since: '2023',
    docs: { contrato: 175, cnpj: 307, cnd: 150, lgpd: 5, seguro: 280, alvara: 240 },
  },
];

const SEED_USERS = [
  {
    name: 'Camila Ribeiro',
    email: 'compras@meridiano.com.br',
    password: demoPassword,
    role: 'contratante',
    company: 'Grupo Meridiano',
    supplierId: null,
  },
  {
    name: 'Rafael Souza',
    email: 'contato@novatech.com.br',
    password: demoPassword,
    role: 'fornecedor',
    company: 'NovaTech Soluções em TI',
    supplierId: 'FOR-1042',
  },
  {
    name: 'Administrador',
    email: 'admin@supplypass.app',
    password: demoPassword,
    role: 'admin',
    company: 'SupplyPass',
    supplierId: null,
  },
];

const insertSupplier = db.prepare(`
  INSERT INTO suppliers (id, name, cnpj, category, city, email, since, active, created_at)
  VALUES (@id, @name, @cnpj, @category, @city, @email, @since, 1, @created_at)
`);

const insertDocument = db.prepare(`
  INSERT INTO documents (
    id, supplier_id, type, file_name, stored_name, mime_type, size_bytes,
    sha256, iv, auth_tag, issued_at, expires_at, uploaded_by, uploaded_at, superseded_at
  ) VALUES (
    @id, @supplier_id, @type, @file_name, NULL, 'application/pdf', @size_bytes,
    @sha256, NULL, NULL, @issued_at, @expires_at, 'seed', @uploaded_at, NULL
  )
`);

const insertUser = db.prepare(`
  INSERT INTO users (id, name, email, password_hash, password_salt, role, company, supplier_id, created_at)
  VALUES (@id, @name, @email, @password_hash, @password_salt, @role, @company, @supplier_id, @created_at)
`);

const runSeed = db.transaction(() => {
  const now = new Date().toISOString();

  SEED_SUPPLIERS.forEach((supplier) => {
    insertSupplier.run({
      id: supplier.id,
      name: supplier.name,
      cnpj: supplier.cnpj,
      category: supplier.category,
      city: supplier.city,
      email: supplier.email,
      since: supplier.since,
      created_at: now,
    });

    Object.entries(supplier.docs).forEach(([type, offset]) => {
      const fileName = `${type}_${supplier.id.toLowerCase()}.pdf`;
      insertDocument.run({
        id: newId('doc'),
        supplier_id: supplier.id,
        type,
        file_name: fileName,
        size_bytes: 120000 + Math.round(Math.random() * 400000),
        // Documento historico: sem arquivo fisico, mas com hash registrado.
        sha256: sha256(Buffer.from(`${supplier.id}|${type}|${fileName}`)),
        issued_at: isoFromToday(offset - 365),
        expires_at: isoFromToday(offset),
        uploaded_at: now,
      });
    });
  });

  SEED_USERS.forEach((user) => {
    const { hash, salt } = hashPassword(user.password);
    insertUser.run({
      id: newId('usr'),
      name: user.name,
      email: user.email,
      password_hash: hash,
      password_salt: salt,
      role: user.role,
      company: user.company,
      supplier_id: user.supplierId,
      created_at: now,
    });
  });
});

// Executa a carga apenas se o banco estiver vazio.
function ensureSeed() {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM suppliers').get();
  if (total > 0) return false;
  runSeed();
  console.log(`  banco populado: ${SEED_SUPPLIERS.length} fornecedores, ${SEED_USERS.length} usuários`);
  return true;
}

module.exports = { ensureSeed, SEED_SUPPLIERS, SEED_USERS };

// Permite rodar "npm run seed" direto pelo terminal.
if (require.main === module) {
  const created = ensureSeed();
  console.log(created ? 'Carga concluída.' : 'O banco já contém dados. Use "npm run reset" para recriar.');
}
