const PERMISOS = {
  'Administrador': ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'],
  'Supervisor de Pedidos': ['m2', 'm4', 'm5', 'm6'],
  'Responsable de Caja': ['m4', 'm5', 'm6'],
  'Mensajeros / Patinadores': ['m5'],
}

export function puedeVer(rol, modulo) {
  const permisos = PERMISOS[rol] || []
  return permisos.includes(modulo)
}

export default PERMISOS
