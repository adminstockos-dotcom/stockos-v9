export function formatearFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatearNumero(n) {
  return new Intl.NumberFormat('es-CL').format(Number(n) || 0)
}
