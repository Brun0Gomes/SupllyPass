const ROLES = ['administrador', 'gestor', 'analista', 'fornecedor', 'verificador'];

function isRole(role) {
  return ROLES.includes(role);
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company || '',
    supplierId: user.supplier_id || null,
    active: Boolean(user.active),
    createdAt: user.created_at,
  };
}

module.exports = { ROLES, isRole, publicUser };
